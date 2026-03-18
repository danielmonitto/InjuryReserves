import sqlite3
import json
import re
from pathlib import Path

import pandas as pd

DB_PATH = Path("ir_stats.db")  # put your db in project root with this name
OUT_ROOT = Path(".")
DATA_DIR = OUT_ROOT / "data"

COLUMNS_AVG = [
    "MIN", "PM", "2PM", "2PA", "3PM", "3PA", "FGM", "FGA", "FTM", "FTA",
    "O REB", "D REB", "PTS", "REB", "AST", "BLK", "STL",
    "TOV", "FLS", "GSC",
]

COLUMNS_SUM = [
    "MIN", "PM", "2PM", "2PA", "3PM", "3PA", "FGM", "FGA", "FTM", "FTA",
    "O REB", "D REB", "PTS", "REB", "AST", "BLK", "STL",
    "TOV", "FLS", "GSC",
]

COLOR_MAP = {
    "Hayden Cromberge": "#e36868",
    "Joel Kingdom-Evans": "#99FF66",
    "Brooklyn Bulmer": "#5f99f5",
    "Adrian Monitto": "#be60f7",
    "Daniel Monitto": "#ebc026",
    "Jack Groves": "#FF99CC",
    "Zack Johnston": "#5364b0",
    "Lachlan Farley": "#59dea2",
    "James Norrish": "#fc9219",
    "Vince Tomasello": "#63b010",
    "Austin Thorneycroft": "#8858e8",
    "Aidan Zivkovic": "#d651b3",
    "Injury Reserves": "#DB2E2E",
}


DEFAULT_OPP_COLOR = "#6C757D"


def slugify(s: str) -> str:
    s = str(s).strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "team"


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2))


def safe_div(a, b):
    b2 = b.copy().replace(0, pd.NA)
    return a / b2


def add_percentages(d: pd.DataFrame) -> pd.DataFrame:
    d = d.copy()
    d["FG%"] = safe_div(d["FGM"], d["FGA"])
    d["TS%"] = safe_div(d["PTS"], (2 * (d["FGA"] + 0.44 * d["FTA"])))
    d["2P%"] = safe_div(d["2PM"], d["2PA"])
    d["3P%"] = safe_div(d["3PM"], d["3PA"])
    d["FT%"] = safe_div(d["FTM"], d["FTA"])
    for c in ["FG%", "TS%", "2P%", "3P%", "FT%"]:
        d[c] = d[c].fillna(0.0)
    return d

def format_fields(d: pd.DataFrame, kind: str) -> pd.DataFrame:
    d = d.copy()
    pct_cols = ["FG%", "TS%", "2P%", "3P%", "FT%"]

    for c in pct_cols:
        if c in d.columns:
            d[c + "_display"] = (d[c] * 100).round(2).map(lambda x: f"{x:.2f}%")

    for c in d.columns:
        if c in ["NAMES", "OPP", "SEASON", "GAME", "TYPE", "rowColor"]:
            continue
        if c.endswith("_display"):
            continue
        if c in pct_cols:
            continue

        # special formatting for minutes (stored as seconds)
        if c == "MIN":
            def fmt_min(x):
                try:
                    x = int(x)
                except ValueError:
                    return "0:00"
                m = x // 60
                s = x % 60
                return f"{m}:{s:02d}"

            d[c + "_display"] = d[c].fillna(0).map(fmt_min)
            continue

        if pd.api.types.is_numeric_dtype(d[c]):
            if c == "GP":
                d[c + "_display"] = d[c].fillna(0).astype(int).map(lambda x: f"{x}")
            elif c == "GSC":
                d[c + "_display"] = d[c].round(2).map(lambda x: f"{x:.2f}")
            elif c == "Lowest GSC":
                d[c + "_display"] = d[c].round(2).map(lambda x: f"{x:.2f}")
            else:
                if kind == "avg":
                    d[c + "_display"] = d[c].round(2).map(lambda x: f"{x:.2f}")
                elif kind == "game":
                    d[c + "_display"] = d[c].fillna(0).map(
                        lambda x: f"{int(x)}" if float(x).is_integer() else f"{x:.2f}"
                    )
                else:
                    d[c + "_display"] = d[c].fillna(0).map(lambda x: f"{int(round(x))}")

    return d

def calc_averages(player_data: pd.DataFrame) -> pd.DataFrame:
    cols = [c for c in COLUMNS_AVG if c in player_data.columns]

    # normal averages
    g = player_data.groupby("NAMES")[cols].mean().reset_index()

    # total games
    games = player_data.groupby("NAMES").size().reset_index(name="GP")

    out = g.merge(games, on="NAMES", how="left")

    # ---- special handling for MIN and PM ----
    for special in ["MIN", "PM"]:
        if special in player_data.columns:
            tracked = (
                player_data[player_data[special] != 0]
                .groupby("NAMES")[special]
                .mean()
                .reset_index(name=f"{special}_true_avg")
            )

            out = out.merge(tracked, on="NAMES", how="left")

            # overwrite the normal average with tracked-only average
            out[special] = out[f"{special}_true_avg"].fillna(0)
            out = out.drop(columns=[f"{special}_true_avg"])

    out = add_percentages(out)
    out["rowColor"] = out["NAMES"].map(lambda x: COLOR_MAP.get(x, "#A6C9EC"))

    return format_fields(out, "avg")


def calc_totals(player_data: pd.DataFrame) -> pd.DataFrame:
    cols = [c for c in COLUMNS_SUM if c in player_data.columns]
    totals = player_data.groupby("NAMES").agg({c: "sum" for c in cols}).reset_index()
    totals = add_percentages(totals)
    gsc_avg = player_data.groupby("NAMES")["GSC"].mean().reset_index(name="GSC_AVG")
    totals = totals.merge(gsc_avg, on="NAMES", how="left")
    totals["GSC"] = totals["GSC_AVG"]
    totals = totals.drop(columns=["GSC_AVG"])
    games = player_data.groupby("NAMES").size().reset_index(name="GP")
    out = totals.merge(games, on="NAMES", how="left")
    out["rowColor"] = out["NAMES"].map(lambda x: COLOR_MAP.get(x, "#A6C9EC"))
    return format_fields(out, "tot")


def calc_highs(player_data: pd.DataFrame) -> pd.DataFrame:
    # only use columns that exist
    base_cols = COLUMNS_SUM + ["GSC"]
    cols = [c for c in base_cols if c in player_data.columns]

    highs = player_data.groupby("NAMES")[cols].max().reset_index()

    if "GSC" in player_data.columns:
        lowest_gsc = player_data.groupby("NAMES")["GSC"].min().reset_index(name="Lowest GSC")
        highs = highs.merge(lowest_gsc, on="NAMES", how="left")

    games = player_data.groupby("NAMES").size().reset_index(name="GP")
    out = highs.merge(games, on="NAMES", how="left")

    out["rowColor"] = out["NAMES"].map(lambda x: COLOR_MAP.get(x, "#A6C9EC"))

    if "GP" in out.columns:
        gp = out.pop("GP")
        out.insert(1, "GP", gp)

    return format_fields(out, "highs")


def filter_min_games(df: pd.DataFrame, min_games: int = 3) -> pd.DataFrame:
    if "GP" not in df.columns:
        return df
    return df[df["GP"] >= min_games].copy()


def exclude_injury_opp(d: pd.DataFrame) -> pd.DataFrame:
    return d[~d["OPP"].astype(str).str.contains("Injury Reserves", case=False, na=False)].copy()

def load_from_sqlite():
    con = sqlite3.connect(DB_PATH)

    df = pd.read_sql_query("SELECT * FROM InjuryReserves", con)

    gps = pd.read_sql_query("""
        SELECT season, game, player, minutes, plus_minus
        FROM game_player_stats
    """, con)

    opp_meta = pd.read_sql_query("""
        SELECT opp, color
        FROM OpponentMeta
    """, con)

    player_bio = pd.read_sql_query("""
        SELECT name, height, position
        FROM player_bio
    """, con)

    try:
        game_events = pd.read_sql_query("""
            SELECT season, game, type, opp, period, clock,
                   event_kind, player, other_player, code, points, id
            FROM game_events
            ORDER BY id ASC
        """, con)
    except Exception:
        game_events = pd.DataFrame(columns=[
            "season", "game", "type", "opp", "period", "clock",
            "event_kind", "player", "other_player", "code", "points", "id"
        ])

    con.close()

    gps = gps.rename(columns={
        "season": "SEASON",
        "game": "GAME",
        "player": "NAMES",
        "minutes": "MIN",
        "plus_minus": "PM",
    })

    df = df.merge(gps, on=["SEASON", "GAME", "NAMES"], how="left")

    df["MIN"] = pd.to_numeric(df["MIN"], errors="coerce").fillna(0)
    df["PM"] = pd.to_numeric(df["PM"], errors="coerce").fillna(0)

    df = df.rename(columns={
        "OREB": "O REB",
        "DREB": "D REB",
    })

    numeric_cols = [
        "2PM", "2PA", "3PM", "3PA", "FGM", "FGA", "FTM", "FTA",
        "O REB", "D REB", "PTS", "REB", "AST", "BLK", "STL",
        "TOV", "FLS", "GSC", "MIN", "PM",
    ]

    for c in numeric_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    return df, opp_meta, player_bio, game_events


def build_assist_links(events: pd.DataFrame, seasons: list[int]) -> None:
    assists = events[events["event_kind"].astype(str) == "assist"].copy()
    if assists.empty:
        write_json(DATA_DIR / "assists" / "assists_all.json", [])
        for s in seasons:
          write_json(DATA_DIR / "assists" / f"assists_by_season_{s}.json", [])
        return

    assists["season"] = pd.to_numeric(assists["season"], errors="coerce").fillna(0).astype(int)

    def build_rows(d: pd.DataFrame):
        if d.empty:
            return []
        grouped = (
            d.groupby(["player", "other_player"])
            .size()
            .reset_index(name="AST")
            .sort_values(["AST", "player", "other_player"], ascending=[False, True, True])
        )
        grouped["ASSISTER"] = grouped["player"]
        grouped["SCORER"] = grouped["other_player"]
        grouped["rowColor"] = grouped["ASSISTER"].map(lambda x: COLOR_MAP.get(x, "#A6C9EC"))
        return grouped[["ASSISTER", "SCORER", "AST", "rowColor"]].to_dict(orient="records")

    write_json(DATA_DIR / "assists" / "assists_all.json", build_rows(assists))
    for s in seasons:
        write_json(DATA_DIR / "assists" / f"assists_by_season_{s}.json", build_rows(assists[assists["season"] == int(s)]))


def build_player_profiles(df: pd.DataFrame, bio: pd.DataFrame) -> None:
    players_df = df[df["GAME"] > 0].copy()
    players_df = players_df[
        ~(players_df["OPP"].astype(str).str.lower() == "injury reserves")
    ].copy()
    players_df = players_df[
        ~(players_df["NAMES"].astype(str).str.lower() == "injury reserves")
    ].copy()

    players_df["rowColor"] = players_df["NAMES"].map(lambda x: COLOR_MAP.get(x, "#A6C9EC"))
    players_df = add_percentages(players_df)
    players_fmt = format_fields(players_df, "game")

    bio_map = {
        str(r["name"]): {
            "height": r.get("height", ""),
            "position": r.get("position", ""),
        }
        for _, r in bio.iterrows()
    }

    players = sorted(players_df["NAMES"].dropna().unique().tolist())
    index = []
    for name in players:
        b = bio_map.get(name, {})
        index.append({
            "name": name,
            "slug": slugify(name),
            "height": b.get("height", ""),
            "position": b.get("position", ""),
            "rowColor": COLOR_MAP.get(name, "#A6C9EC"),
        })

    write_json(DATA_DIR / "players" / "index.json", {"players": index})

    best_cols = [
        "SEASON", "GAME", "OPP", "TYPE",
        "PTS", "REB", "AST", "GSC", "STL", "BLK", "TOV",
        "MIN", "PM", "FG%", "3P%", "FT%", "TS%",
    ]

    averages_all = calc_averages(players_df)
    totals_all = calc_totals(players_df)
    highs_all = calc_highs(players_df)

    for name in players:
        b = bio_map.get(name, {})
        player_rows = players_fmt[players_fmt["NAMES"] == name].copy()
        top_games = player_rows.sort_values("GSC", ascending=False).head(5)
        display_cols = [f"{c}_display" for c in best_cols if f"{c}_display" in top_games.columns]
        top_games = top_games[[c for c in best_cols if c in top_games.columns] + display_cols]

        avg_row = averages_all[averages_all["NAMES"] == name]
        tot_row = totals_all[totals_all["NAMES"] == name]
        high_row = highs_all[highs_all["NAMES"] == name]

        profile = {
            "name": name,
            "slug": slugify(name),
            "height": b.get("height", ""),
            "position": b.get("position", ""),
            "rowColor": COLOR_MAP.get(name, "#A6C9EC"),
            "averages": avg_row.to_dict(orient="records")[:1],
            "totals": tot_row.to_dict(orient="records")[:1],
            "highs": high_row.to_dict(orient="records")[:1],
            "bestGames": top_games.to_dict(orient="records"),
        }

        write_json(DATA_DIR / "players" / f"{slugify(name)}.json", profile)


def main():
    global opp_color_dict
    df, opp_meta, player_bio, game_events = load_from_sqlite()

    if df.empty:
        raise SystemExit("no rows in InjuryReserves")

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    seasons = sorted(df["SEASON"].dropna().unique().tolist(), reverse=True)
    season_games = {
        str(s): sorted(df[df["SEASON"] == s]["GAME"].dropna().unique().tolist(), reverse=True)
        for s in seasons
    }

    season_teams = {}
    for s in seasons:
        s_int = int(s)

        s_df = exclude_injury_opp(
            df[(df["SEASON"] == s_int) & (df["GAME"] > 0)].copy()
        )

        # Only season 4+ keeps MIN and PM
        if s_int < 4:
            s_df = s_df.drop(columns=["MIN", "PM"], errors="ignore")

        season_teams[str(s)] = sorted(s_df["OPP"].dropna().unique().tolist())

        opp_color_dict = {
            row["opp"]: row["color"]
            for _, row in opp_meta.iterrows()
        }

    index = {
        "seasons": [str(s) for s in seasons],
        "seasonGames": {str(k): [int(x) for x in v] for k, v in season_games.items()},
        "seasonTeams": season_teams,
        "oppColors": opp_color_dict,
        "defaultOppColor": DEFAULT_OPP_COLOR,
        "rowColors": COLOR_MAP,
    }
    write_json(DATA_DIR / "index.json", index)

    base = df[df["GAME"] > 0].copy()

    # remove mirror opponent rows
    base = base[
        ~(base["OPP"].astype(str).str.lower() == "injury reserves")
    ].copy()

    # remove existing fake Injury Reserves rows
    base = base[
        ~(base["NAMES"].astype(str).str.lower() == "injury reserves")
    ].copy()

    def build_team_rows(d):
        stat_cols = [
            "2PM", "2PA", "3PM", "3PA", "FGM", "FGA", "FTM", "FTA",
            "O REB", "D REB", "PTS", "REB", "AST", "BLK", "STL",
            "TOV", "FLS", "GSC", "MIN", "PM",
        ]

        team_rows = []

        for (season, game), g in d.groupby(["SEASON", "GAME"]):

            # only real player rows
            players = g[
                (~g["NAMES"].astype(str).str.contains("Injury Reserves", case=False, na=False))
            ].copy()

            if players.empty:
                continue

            opp_name = players["OPP"].mode()[0]

            row = {
                "SEASON": season,
                "GAME": game,
                "NAMES": "Injury Reserves",
                "OPP": opp_name,
            }

            for c in stat_cols:
                if c not in players.columns:
                    continue
                if c == "GSC":
                    row[c] = players[c].mean()
                else:
                    row[c] = players[c].sum()

            team_rows.append(row)

        if team_rows:
            return pd.concat([d, pd.DataFrame(team_rows)], ignore_index=True)

        return d

    base = build_team_rows(base)

    # Only keep real MIN / PM from season 4+
    if "MIN" in base.columns:
        base.loc[base["SEASON"] < 4, "MIN"] = 0

    if "PM" in base.columns:
        base.loc[base["SEASON"] < 4, "PM"] = 0

    # drop columns entirely if no valid values exist
    if base["MIN"].dropna().empty:
        base = base.drop(columns=["MIN"], errors="ignore")

    if base["PM"].dropna().empty:
        base = base.drop(columns=["PM"], errors="ignore")

    averages_all = filter_min_games(calc_averages(base), 3)
    totals_all = filter_min_games(calc_totals(base), 3)
    highs_all = filter_min_games(calc_highs(base), 3)

    write_json(DATA_DIR / "aggregates" / "averages_all.json", averages_all.to_dict(orient="records"))
    write_json(DATA_DIR / "aggregates" / "totals_all.json", totals_all.to_dict(orient="records"))
    write_json(DATA_DIR / "aggregates" / "highs_all.json", highs_all.to_dict(orient="records"))

    opp_names_all = set(df["OPP"].dropna().unique().tolist())

    for s in seasons:
        s_df = df[(df["SEASON"] == s) & (df["GAME"] > 0)].copy()

        # remove mirror rows
        s_df = s_df[
            ~(s_df["OPP"].astype(str).str.lower() == "injury reserves")
        ].copy()

        # remove stored fake team rows
        s_df = s_df[
            ~(s_df["NAMES"].astype(str).str.lower() == "injury reserves")
        ].copy()

        # rebuild real team rows
        s_df = build_team_rows(s_df)

        if int(s) < 4:
            s_df = s_df.drop(columns=["MIN", "PM"], errors="ignore")

        write_json(DATA_DIR / "aggregates" / f"averages_by_season_{s}.json", calc_averages(s_df).to_dict(orient="records"))
        write_json(DATA_DIR / "aggregates" / f"totals_by_season_{s}.json", calc_totals(s_df).to_dict(orient="records"))
        write_json(
            DATA_DIR / "aggregates" / f"highs_by_season_{s}.json",
            calc_highs(s_df).drop(columns=["GP"], errors="ignore").to_dict(orient="records"),
        )

        s_all = df[df["SEASON"] == s].copy()

        # remove mirror opponent rows
        s_all = s_all[
            ~(s_all["OPP"].astype(str).str.lower() == "injury reserves")
        ].copy()

        # remove stored fake team rows
        s_all = s_all[
            ~(s_all["NAMES"].astype(str).str.lower() == "injury reserves")
        ].copy()

        # rebuild real team rows
        s_all = build_team_rows(s_all)

        for opp in season_teams[str(s)]:
            t_df = s_all[(s_all["OPP"] == opp) & (s_all["GAME"] > 0)].copy()
            if t_df.empty:
                continue
            avg = calc_averages(t_df)
            write_json(DATA_DIR / "vs" / f"vs_{s}_{slugify(opp)}.json", {
                "season": int(s),
                "opponent": opp,
                "rows": avg.to_dict(orient="records")
            })

        for gnum in season_games[str(s)]:
            g_df = df[(df["SEASON"] == s) & (df["GAME"] == gnum)].copy()
            # ---- load minutes and plus-minus from game_player_stats ----
            con = sqlite3.connect(DB_PATH)
            gps = pd.read_sql_query(
                """
                SELECT player, minutes, plus_minus
                FROM game_player_stats
                WHERE season = ?
                  AND game = ?
                """,
                con,
                params=(s, gnum)
            )
            con.close()

            gps = gps.rename(columns={
                "player": "NAMES",
                "minutes": "MIN",
                "plus_minus": "PM",
            })

            if g_df.empty:
                continue

            # identify opponent safely
            opp = str(g_df["OPP"].iloc[0]).strip()

            # real player rows:
            players = g_df[
                (~g_df["NAMES"].astype(str).str.contains("Injury Reserves", case=False, na=False))
                & (g_df["NAMES"].astype(str).str.strip() != opp)
                ].copy()

            has_minutes = not gps.empty

            if not has_minutes:
                players = players.drop(columns=["MIN", "PM"], errors="ignore")

            # --- build a synthetic "injury reserves" totals row from players ---
            stat_cols = [
                "2PM", "2PA", "3PM", "3PA", "FGM", "FGA", "FTM", "FTA", "O REB", "D REB",
                "PTS", "REB", "AST", "BLK", "STL", "TOV", "FLS", "GSC",
            ]

            for c in stat_cols:
                if c in players.columns:
                    players[c] = pd.to_numeric(players[c], errors="coerce").fillna(0)

            tot = {}
            for c in stat_cols:
                if c not in players.columns:
                    continue
                if c == "GSC":
                    tot[c] = float(players[c].mean())
                else:
                    tot[c] = float(players[c].sum())

            tot["NAMES"] = "Injury Reserves"

            if "MIN" in players.columns:
                tot["MIN"] = float(players["MIN"].max())

            if "PM" in players.columns:
                team_score = players["PTS"].sum()

                opp_score = g_df[
                    (g_df["OPP"].astype(str).str.lower() == "injury reserves")
                ]["PTS"].sum()

                tot["PM"] = float(team_score - opp_score)

            totals_row = pd.DataFrame([tot])

            # combine: players + totals row
            players = pd.concat([players, totals_row], ignore_index=True)

            # drop non-display cols, then format
            players = players.drop(columns=["OPP", "SEASON", "GAME", "TYPE"], errors="ignore")
            players = add_percentages(players)
            players["rowColor"] = players["NAMES"].map(lambda x: COLOR_MAP.get(x, "#A6C9EC"))
            players = format_fields(players, "game")

            # team score row: NAMES contains 'Injury Reserves' and OPP == opp
            team_score = g_df[
                (g_df["OPP"].astype(str) == opp)
                & (g_df["NAMES"].astype(str).str.contains("Injury Reserves", case=False, na=False))
                ]["PTS"].sum()

            # opponent score row (your requirement): OPP == 'Injury Reserves' and NAMES == opp
            opp_score = g_df[
                (g_df["OPP"].astype(str).str.lower() == "injury reserves")
                & (g_df["NAMES"].astype(str) == opp)
                ]["PTS"].sum()

            players = players.drop(columns=["OPP", "SEASON", "GAME", "TYPE"], errors="ignore")
            players = add_percentages(players)
            players["rowColor"] = players["NAMES"].map(lambda x: COLOR_MAP.get(x, "#A6C9EC"))
            players = format_fields(players, "game")

            payload = {
                "season": int(s),
                "game": int(gnum),
                "opponent": opp,
                "opponentColor": opp_color_dict.get(opp, DEFAULT_OPP_COLOR),
                "teamScore": float(team_score),
                "opponentScore": float(opp_score),
                "players": players.to_dict(orient="records"),
                "playByPlay": [],
            }

            game_event_rows = game_events[
                (pd.to_numeric(game_events["season"], errors="coerce").fillna(-1).astype(int) == int(s))
                & (pd.to_numeric(game_events["game"], errors="coerce").fillna(-1).astype(int) == int(gnum))
            ].copy()

            if not game_event_rows.empty:
                def event_play_text(row):
                    kind = str(row.get("event_kind", "") or "")
                    player = str(row.get("player", "") or "")
                    other = str(row.get("other_player", "") or "")
                    code = str(row.get("code", "") or "")
                    points = int(row.get("points", 0) or 0)
                    if kind == "assist":
                        return {"PLAYER": player, "PLAY": f"assist to {other}", "rowColor": COLOR_MAP.get(player, "#A6C9EC")}
                    if kind == "opp":
                        label = "free throw" if points == 1 else "field goal" if points == 2 else "three ball"
                        return {"PLAYER": opp.lower(), "PLAY": label, "rowColor": opp_color_dict.get(opp, DEFAULT_OPP_COLOR)}
                    if kind == "sub":
                        if code == "IN FOR" and other:
                            return {"PLAYER": player, "PLAY": f"in for {other}", "rowColor": COLOR_MAP.get(player, "#A6C9EC")}
                        return {"PLAYER": player, "PLAY": str(code or "sub").lower(), "rowColor": COLOR_MAP.get(player, "#A6C9EC")}
                    event_labels = {
                        "2PM": "made 2",
                        "2PA": "missed 2",
                        "3PM": "made 3",
                        "3PA": "missed 3",
                        "FTM": "made ft",
                        "FTA": "missed ft",
                        "OREB": "offensive rebound",
                        "DREB": "defensive rebound",
                        "STL": "steal",
                        "BLK": "block",
                        "TOV": "turnover",
                        "FLS": "foul",
                    }
                    return {"PLAYER": player, "PLAY": event_labels.get(code, code.lower()), "rowColor": COLOR_MAP.get(player, "#A6C9EC")}

                play_rows = []
                for _, row in game_event_rows.iloc[::-1].iterrows():
                    event_row = event_play_text(row)
                    play_rows.append({
                        "PERIOD": str(row.get("period", "") or ""),
                        "CLOCK": str(row.get("clock", "") or ""),
                        **event_row,
                    })
                payload["playByPlay"] = play_rows

            write_json(DATA_DIR / "games" / f"{s}_{int(gnum)}.json", payload)

    for t in ["PRE", "REG", "FINAL"]:
        t_df = exclude_injury_opp(
            df[df["TYPE"].astype(str).str.strip().str.upper() == t].copy()
        )
        if t_df.empty:
            continue
        write_json(DATA_DIR / "aggregates" / f"by_type_{t}.json", calc_averages(t_df).to_dict(orient="records"))

    build_player_profiles(df, player_bio)
    build_assist_links(game_events, seasons)

    print("ok: rebuilt data/ from sqlite")

if __name__ == "__main__":
    main()
