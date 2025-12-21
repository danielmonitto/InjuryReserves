import json, re
from pathlib import Path
import pandas as pd

FILE_PATH = "Melton Basketball.xlsm"
OUT_ROOT = Path(".")
DATA_DIR = OUT_ROOT / "data"

COLUMNS_AVG = ['2PM','2PA','3PM','3PA','FGM','FGA','FTM','FTA','O REB','D REB',
               'PTS','REB','AST','BLK','STL','TOV','FLS','GSC']
COLUMNS_SUM = ['2PM','2PA','3PM','3PA','FGM','FGA','FTM','FTA',
               'O REB','D REB','PTS','REB','AST','BLK','STL','TOV','FLS']

COLOR_MAP = {
    'Hayden Cromberge': '#FF99CC',
    'Joel Kingdom-Evans': '#99FF66',
    'Brooklyn Bulmer': '#5f99f5',
    'Adrian Monitto': '#be60f7',
    'Daniel Monitto': '#fcd04c',
    'Jack Groves': '#FF99CC',
    'Zack Johnston': '#59dea2',
    'Lachlan Farley': '#59dea2',
    'James Norrish': '#fc9219',
    'Injury Reserves': '#b50728',
}

OPP_COLOR_MAP = {
    'PRIME TIME': '#000000',
    'slow motion': '#5c99fa',
    'Goon Squad': '#f5e342',
    'Dirty Magic': '#3a66e8',
    'Killer Barbies': '#ff73e1',
    'Sister In-Laws': '#ff73e1',
    'Ripperz': '#3a66e8',
    'Park City': '#000000',
    'Smoove Movers': '#3498eb',
    'The Warriors': '#000000',
    'Wolves': '#9638c2',
    'Disciples': '#000000',
    'Konoha': '#fc9803',
    'Mickeylads': '#000000',
    'Jim Ballers 2': '#6203fc',
    'Kawhi About It': '#b642f5',
    'Uncle Brickers': '#1f2a8c',
    'Monstars': '#c23830',
    'Non Compliant': '#c23830',
    'Low Expectations': '#b642f5',
    'too drunk to dunk': '#ff4fdf',
    'Jim Ballers': '#6203fc',
}
DEFAULT_OPP_COLOR = "#6C757D"

def slugify(s: str) -> str:
    s = str(s).strip().lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    s = re.sub(r'_+', '_', s).strip('_')
    return s or "team"

def exclude_injury_opp(d: pd.DataFrame) -> pd.DataFrame:
    return d[~d['OPP'].astype(str).str.contains('Injury Reserves', case=False, na=False)].copy()

def safe_div(a, b):
    b2 = b.copy().replace(0, pd.NA)
    return a / b2

def add_percentages(d: pd.DataFrame) -> pd.DataFrame:
    d = d.copy()
    d['FG%'] = safe_div(d['FGM'], d['FGA'])
    d['TS%'] = safe_div(d['PTS'], (2 * (d['FGA'] + 0.44 * d['FTA'])))
    d['2P%'] = safe_div(d['2PM'], d['2PA'])
    d['3P%'] = safe_div(d['3PM'], d['3PA'])
    d['FT%'] = safe_div(d['FTM'], d['FTA'])
    for c in ['FG%','TS%','2P%','3P%','FT%']:
        d[c] = d[c].fillna(0.0)
    return d

def format_fields(d: pd.DataFrame, kind: str) -> pd.DataFrame:
    d = d.copy()
    pct_cols = ['FG%','TS%','2P%','3P%','FT%']
    for c in pct_cols:
        if c in d.columns:
            d[c+"_display"] = (d[c] * 100).round(2).map(lambda x: f"{x:.2f}%")
    for c in d.columns:
        if c in ['NAMES','OPP','SEASON','GAME','TYPE','rowColor']:
            continue
        if c.endswith("_display"):
            continue
        if pd.api.types.is_numeric_dtype(d[c]):
            if c == "GSC":
                d[c+"_display"] = d[c].round(2).map(lambda x: f"{x:.2f}")
            else:
                if kind == "avg":
                    d[c+"_display"] = d[c].round(2).map(lambda x: f"{x:.2f}")
                elif kind == "game":
                    d[c+"_display"] = d[c].fillna(0).map(lambda x: f"{int(x)}" if float(x).is_integer() else f"{x:.2f}")
                else:
                    d[c+"_display"] = d[c].fillna(0).map(lambda x: f"{int(round(x))}")
    return d

def calc_averages(player_data: pd.DataFrame) -> pd.DataFrame:
    g = player_data.groupby('NAMES')[COLUMNS_AVG].mean().reset_index()
    g = add_percentages(g)
    games = player_data.groupby('NAMES').size().reset_index(name='Games Played')
    out = g.merge(games, on='NAMES', how='left')
    out['rowColor'] = out['NAMES'].map(lambda x: COLOR_MAP.get(x, '#A6C9EC'))
    return format_fields(out, "avg")

def calc_totals(player_data: pd.DataFrame) -> pd.DataFrame:
    totals = player_data.groupby('NAMES').agg({c:'sum' for c in COLUMNS_SUM}).reset_index()
    totals = add_percentages(totals)
    gsc_avg = player_data.groupby('NAMES')['GSC'].mean().reset_index(name='GSC')
    totals = totals.merge(gsc_avg, on='NAMES', how='left')
    games = player_data.groupby('NAMES').size().reset_index(name='Games Played')
    out = totals.merge(games, on='NAMES', how='left')
    out['rowColor'] = out['NAMES'].map(lambda x: COLOR_MAP.get(x, '#A6C9EC'))
    return format_fields(out, "tot")

def calc_highs(player_data: pd.DataFrame) -> pd.DataFrame:
    cols = COLUMNS_SUM + ['GSC']
    hi = player_data.groupby('NAMES')[cols].max().reset_index()
    lo_gsc = player_data.groupby('NAMES')['GSC'].min().reset_index(name='Lowest GSC')
    out = hi.merge(lo_gsc, on='NAMES', how='left')
    out = add_percentages(out)
    games = player_data.groupby('NAMES').size().reset_index(name='Games Played')
    out = out.merge(games, on='NAMES', how='left')
    out['rowColor'] = out['NAMES'].map(lambda x: COLOR_MAP.get(x, '#A6C9EC'))
    return format_fields(out, "highs")

def write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2))

def main():
    df = pd.read_excel(FILE_PATH)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    seasons = sorted(df['SEASON'].dropna().unique().tolist(), reverse=True)
    season_games = {str(s): sorted(df[df['SEASON']==s]['GAME'].dropna().unique().tolist(), reverse=True) for s in seasons}

    season_teams = {}
    for s in seasons:
        s_df = exclude_injury_opp(df[df['SEASON']==s])
        season_teams[str(s)] = sorted(s_df['OPP'].dropna().unique().tolist())

    index = {
        "seasons": [str(s) for s in seasons],
        "seasonGames": {str(k): [int(x) for x in v] for k,v in season_games.items()},
        "seasonTeams": season_teams,
        "oppColors": OPP_COLOR_MAP,
        "defaultOppColor": DEFAULT_OPP_COLOR,
        "rowColors": COLOR_MAP,
    }
    write_json(DATA_DIR / "index.json", index)

    base_all = exclude_injury_opp(df[df['GAME'] > 0].copy())
    write_json(DATA_DIR / "aggregates" / "averages_all.json", calc_averages(base_all).to_dict(orient="records"))
    write_json(DATA_DIR / "aggregates" / "totals_all.json", calc_totals(base_all).to_dict(orient="records"))
    write_json(DATA_DIR / "aggregates" / "highs_all.json", calc_highs(base_all).drop(columns=['Games Played'], errors='ignore').to_dict(orient="records"))

    opp_names_all = set(df['OPP'].dropna().unique().tolist())

    for s in seasons:
        s_df = exclude_injury_opp(df[(df['SEASON']==s) & (df['GAME'] > 0)].copy())
        write_json(DATA_DIR / "aggregates" / f"averages_by_season_{s}.json", calc_averages(s_df).to_dict(orient="records"))
        write_json(DATA_DIR / "aggregates" / f"totals_by_season_{s}.json", calc_totals(s_df).to_dict(orient="records"))
        write_json(DATA_DIR / "aggregates" / f"highs_by_season_{s}.json", calc_highs(s_df).drop(columns=['Games Played'], errors='ignore').to_dict(orient="records"))

        s_all = exclude_injury_opp(df[df['SEASON']==s].copy())
        for opp in season_teams[str(s)]:
            t_df = s_all[(s_all['OPP']==opp) & (s_all['GAME'] > 0)].copy()
            if t_df.empty:
                continue
            avg = calc_averages(t_df)
            write_json(DATA_DIR / "vs" / f"vs_{s}_{slugify(opp)}.json", {
                "season": int(s),
                "opponent": opp,
                "rows": avg.to_dict(orient="records")
            })

        for gnum in season_games[str(s)]:
            g_df = df[(df['SEASON']==s) & (df['GAME']==gnum)].copy()
            if g_df.empty:
                continue
            opp = str(g_df['OPP'].iloc[0])
            players = g_df[~g_df['NAMES'].isin(opp_names_all)].copy()
            team_score = g_df[g_df['NAMES'].astype(str).str.contains("Injury Reserves", na=False)]['PTS'].sum()
            opp_score = g_df[g_df['NAMES'].isin(opp_names_all)]['PTS'].sum()

            players = players.drop(columns=['OPP','SEASON','GAME','TYPE'], errors='ignore')
            players = add_percentages(players)
            players['rowColor'] = players['NAMES'].map(lambda x: COLOR_MAP.get(x, '#A6C9EC'))
            players = format_fields(players, "game")

            payload = {
                "season": int(s),
                "game": int(gnum),
                "opponent": opp,
                "opponentColor": OPP_COLOR_MAP.get(opp, DEFAULT_OPP_COLOR),
                "teamScore": float(team_score),
                "opponentScore": float(opp_score),
                "players": players.to_dict(orient="records"),
            }
            write_json(DATA_DIR / "games" / f"{s}_{int(gnum)}.json", payload)

    for t in ["PRE","REG","FINAL"]:
        t_df = exclude_injury_opp(df[(df["TYPE"] == t) & (df["GAME"] > 0)].copy())
        if t_df.empty:
            continue
        write_json(DATA_DIR / "aggregates" / f"by_type_{t}.json", calc_averages(t_df).to_dict(orient="records"))

if __name__ == "__main__":
    main()
