from __future__ import annotations

import time
import sqlite3
import subprocess
import sys
from pathlib import Path

from flask import Flask, jsonify, render_template, request

DB_PATH = Path("ir_stats.db")

PLAYER_COLOR_MAP = {
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

app = Flask(__name__)

LIVE_STATE = {
    "home": 0,
    "away": 0,
    "opp": "OPP",
    "injColor": "#DB2E2E",
    "oppColor": "#4B5563",
    "period": "1ST",

    # new: stripe colors
    "injStripe1": "rgba(255,255,255,0.95)",  # white
    "injStripe2": "rgba(181,7,40,0.95)",  # red
    "oppStripe1": "rgba(255,255,255,0.85)",
    "oppStripe2": "rgba(255,255,255,0.25)",

    # optional styling knobs
    "stripeGap": 5,
    "stripeShadowAlpha": 0.28,
    "strokeAlpha": 0.18,

    # transient overlay event for scoreboard popups
    "eventSeq": 0,
    "event": None,
}

LINEUP_STATE = {
    "seq": 0,
    "state": None,
}


# endgame screen state (in-memory)
ENDGAME_STATE = {
    "seq": 0,
    "state": None,
}


def con():
    return sqlite3.connect(DB_PATH)


def ensure_meta_tables():
    c = con()
    cur = c.cursor()
    cur.execute(
        """
        create table if not exists OpponentMeta (
            opp text primary key,
            color text
        )
        """
    )
    c.commit()
    c.close()


def ensure_event_tables():
    c = con()
    cur = c.cursor()
    cur.execute(
        """
        create table if not exists game_events (
            id integer primary key autoincrement,
            season integer not null,
            game integer not null,
            type text,
            opp text,
            period text,
            clock text,
            event_kind text not null,
            player text,
            other_player text,
            code text,
            points integer default 0
        )
        """
    )
    c.commit()
    c.close()


def set_opp_color(opp: str, color: str) -> None:
    if not opp:
        return
    ensure_meta_tables()
    c = con()
    cur = c.cursor()
    cur.execute(
        """
        insert into OpponentMeta (opp, color)
        values (?, ?)
        on conflict(opp) do update set color=excluded.color
        """,
        (opp, color),
    )
    c.commit()
    c.close()


def get_opp_color(opp: str) -> str | None:
    if not opp:
        return None
    ensure_meta_tables()
    c = con()
    cur = c.cursor()
    cur.execute("select color from OpponentMeta where opp=?", (opp,))
    row = cur.fetchone()
    c.close()
    return row[0] if row and row[0] else None


def career_ft_pct(name: str) -> int | None:
    """
    returns whole-number career FT% for a player name (0-100), or None if not enough attempts.
    based on InjuryReserves table in ir_stats.db.
    """
    name = (name or "").strip()
    if not name or name.lower() == "injury reserves":
        return None

    c = con()
    cur = c.cursor()
    try:
        cur.execute(
            'select coalesce(sum("FTM"),0), coalesce(sum("FTA"),0) from InjuryReserves where NAMES=?',
            (name,),
        )
        ftm, fta = cur.fetchone() or (0, 0)
    finally:
        c.close()

    ftm = int(ftm or 0)
    fta = int(fta or 0)
    if fta <= 0:
        return None
    return int(round((ftm / fta) * 100))

# ---- build step ----

def rebuild_json():
    # keep your existing pipeline
    subprocess.check_call([sys.executable, "build_data_from_sqlite.py"])

@app.post("/api/live_score")
def live_score():
    body = request.get_json(force=True) or {}

    LIVE_STATE["home"] = int(body.get("home", LIVE_STATE["home"]) or 0)
    LIVE_STATE["away"] = int(body.get("away", LIVE_STATE["away"]) or 0)

    opp = str(body.get("opp", LIVE_STATE["opp"]) or "").strip()
    if opp:
        LIVE_STATE["opp"] = opp

    opp_color = str(body.get("oppColor", LIVE_STATE["oppColor"]) or "").strip()
    if opp_color:
        LIVE_STATE["oppColor"] = opp_color

    period = str(body.get("period", LIVE_STATE.get("period", "1ST")) or "").strip()
    if period:
        LIVE_STATE["period"] = period

    # new: stripe colors (optional)
    for k in ["oppStripe1", "oppStripe2"]:
        v = str(body.get(k, "") or "").strip()
        if v:
            LIVE_STATE[k] = v

    # new: optional styling knobs
    try:
        if "stripeGap" in body:
            LIVE_STATE["stripeGap"] = int(body.get("stripeGap") or 0)
        if "stripeShadowAlpha" in body:
            LIVE_STATE["stripeShadowAlpha"] = float(body.get("stripeShadowAlpha") or 0)
        if "strokeAlpha" in body:
            LIVE_STATE["strokeAlpha"] = float(body.get("strokeAlpha") or 0)
    except Exception:
        pass

    return {"ok": True}


@app.post("/api/lineup_state")
def set_lineup_state():
    body = request.get_json(force=True) or {}
    LINEUP_STATE["seq"] += 1
    LINEUP_STATE["state"] = body.get("state")
    return jsonify({"ok": True, "seq": LINEUP_STATE["seq"]})


@app.get("/api/lineup_state")
def get_lineup_state():
    return jsonify({
        "ok": True,
        "seq": LINEUP_STATE["seq"],
        "state": LINEUP_STATE["state"]
    })


@app.get("/lineup")
def lineup_page():
    return render_template("lineup.html")


@app.get("/api/scoreboard")
def scoreboard_live():
    return jsonify(LIVE_STATE)


@app.get("/api/player_career_ft")
def player_career_ft():
    name = str(request.args.get("name", "") or "").strip()
    pct = career_ft_pct(name)
    return jsonify({"ok": True, "name": name, "pct": pct})


@app.post("/api/overlay_event")
def overlay_event():
    """
    set a transient scoreboard popup event.
    expected json: {title, line, kind, color, ttlMs}
    """
    body = request.get_json(force=True) or {}
    title = str(body.get("title", "") or "").strip()
    line = str(body.get("line", "") or "").strip()
    kind = str(body.get("kind", "") or "info").strip()
    color = str(body.get("color", "") or "").strip()  # use team color
    ttl_ms = int(body.get("ttlMs", 2500) or 2500)

    if not title and not line:
        return jsonify({"ok": False, "error": "empty event"}), 400

    LIVE_STATE["eventSeq"] = int(LIVE_STATE.get("eventSeq", 0) or 0) + 1
    LIVE_STATE["event"] = {
        "seq": LIVE_STATE["eventSeq"],
        "title": title,
        "line": line,
        "kind": kind,
        "color": color,
        "ttlMs": ttl_ms,
        "ts": int(time.time() * 1000),
    }
    return jsonify({"ok": True, "seq": LIVE_STATE["eventSeq"]})


@app.get("/api/player_profile")
def player_profile():
    name = request.args.get("name", "").strip()
    if not name:
        return {"ok": False}

    c = con()
    cur = c.cursor()

    # career totals excluding team row
    cur.execute("""
        SELECT
            COUNT(*) as gp,
            SUM(PTS),
            SUM(REB),
            SUM(AST),
            SUM(STL),
            SUM(BLK),
            SUM(FGM),
            SUM(FGA)
        FROM InjuryReserves
        WHERE NAMES=?
          AND NAMES != 'Injury Reserves'
    """, (name,))

    r = cur.fetchone()
    gp = r[0] or 0

    stats = {
        "gp": gp,
        "ppg": 0,
        "rpg": 0,
        "apg": 0,
        "spg": 0,
        "bpg": 0,
        "fg_pct": 0
    }

    if gp > 0:
        pts = r[1] or 0
        reb = r[2] or 0
        ast = r[3] or 0
        stl = r[4] or 0
        blk = r[5] or 0
        fgm = r[6] or 0
        fga = r[7] or 0

        stats = {
            "gp": gp,
            "ppg": round(pts / gp, 1),
            "rpg": round(reb / gp, 1),
            "apg": round(ast / gp, 1),
            "spg": round(stl / gp, 1),
            "bpg": round(blk / gp, 1),
            "fg_pct": round((fgm / fga) * 100, 1) if fga else 0
        }

    # height + position
    cur.execute("""
        SELECT height, position
        FROM player_bio
        WHERE name=?
    """, (name,))
    bio = cur.fetchone()

    c.close()

    return {
        "ok": True,
        "name": name,
        "height": bio[0] if bio else None,
        "position": bio[1] if bio else None,
        "stats": stats
    }


@app.get("/api/overlay_event")
def overlay_event_get():
    return jsonify({"ok": True, "seq": int(LIVE_STATE.get("eventSeq", 0) or 0), "event": LIVE_STATE.get("event")})


@app.get("/api/opponent_meta")
def opponent_meta():
    # used by the stats site as a fallback to color the opponent card
    opp = str(request.args.get("opp", "")).strip()
    return jsonify({
        "ok": True,
        "opp": opp,
        "color": get_opp_color(opp) or LIVE_STATE.get("oppColor"),
    })

# ---- ui routes ----

@app.get("/")
def ui():
    return render_template("admin.html")


@app.get("/admin-v2")
def ui_v2():
    return render_template("admin_v2.html")


@app.get("/scoreboard")
def scoreboard_page():
    return render_template("scoreboard.html")


@app.get("/endgame")
def endgame_page():
    return render_template("endgame.html")


@app.post("/api/endgame_state")
def set_endgame_state():
    body = request.get_json(force=True) or {}
    state = body.get("state")
    ENDGAME_STATE["seq"] = int(ENDGAME_STATE.get("seq", 0) or 0) + 1
    ENDGAME_STATE["state"] = state
    return jsonify({"ok": True, "seq": ENDGAME_STATE["seq"]})


@app.get("/api/endgame_state")
def get_endgame_state():
    return jsonify({
        "ok": True,
        "seq": int(ENDGAME_STATE.get("seq", 0) or 0),
        "state": ENDGAME_STATE.get("state"),
    })


# ---- optional: db-based scoreboard (not used by obs overlay) ----

@app.get("/api/scoreboard_db")
def scoreboard_db():
    c = con()
    cur = c.cursor()

    cur.execute(
        """
        select NAMES, PTS
        from InjuryReserves
        where SEASON = (select max(SEASON) from InjuryReserves)
          and GAME = (select max(GAME) from InjuryReserves)
        """
    )

    rows = cur.fetchall()
    c.close()

    score = {"home": 0, "away": 0}

    for name, pts in rows:
        if name == "Injury Reserves":
            score["home"] = pts
        else:
            score["away"] = pts

    return jsonify(score)


@app.get("/api/health")
def health():
    return {"ok": True, "db_exists": DB_PATH.exists()}


@app.get("/api/admin_v2/bootstrap")
def admin_v2_bootstrap():
    c = con()
    cur = c.cursor()

    cur.execute(
        """
        SELECT name, height, position
        FROM player_bio
        ORDER BY name COLLATE NOCASE
        """
    )
    bios = [
        {
            "name": row[0],
            "height": row[1],
            "position": row[2],
            "color": PLAYER_COLOR_MAP.get(row[0], "#A6C9EC"),
        }
        for row in cur.fetchall()
        if row and row[0]
    ]

    cur.execute(
        """
        SELECT DISTINCT NAMES
        FROM InjuryReserves
        WHERE NAMES IS NOT NULL
          AND TRIM(NAMES) <> ''
          AND NAMES <> 'Injury Reserves'
          AND OPP <> 'Injury Reserves'
        ORDER BY NAMES COLLATE NOCASE
        """
    )
    player_names = [row[0] for row in cur.fetchall() if row and row[0]]

    cur.execute(
        """
        SELECT opp, color
        FROM OpponentMeta
        ORDER BY opp COLLATE NOCASE
        """
    )
    opponents = [
        {"opp": row[0], "color": row[1]}
        for row in cur.fetchall()
        if row and row[0]
    ]

    cur.execute(
        """
        SELECT season, game, opp, type
        FROM InjuryReserves
        WHERE NAMES = 'Injury Reserves'
          AND OPP <> 'Injury Reserves'
        ORDER BY season DESC, game DESC
        LIMIT 1
        """
    )
    latest = cur.fetchone()
    c.close()

    unique_players = []
    seen = set()
    for name in player_names + [b["name"] for b in bios]:
        key = (name or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique_players.append(name)

    return jsonify({
        "ok": True,
        "players": unique_players,
        "bios": bios,
        "opponents": opponents,
        "latestGame": {
            "season": latest[0],
            "game": latest[1],
            "opp": latest[2],
            "type": latest[3],
        } if latest else None,
    })

# ---- save game ----

# the columns your db already has
DB_COLS = [
    "OPP","SEASON","GAME","NAMES",
    "2PM","2PA","3PM","3PA","FGM","FGA","FTM","FTA",
    "OREB","DREB","PTS","REB","AST","BLK","STL","TOV","FLS",
    "FG%","TS%","FT%","2P%","3P%","GSC","TYPE"
]

@app.post("/api/save_game")
def save_game():
    body = request.get_json(force=True)
    meta = body["meta"]
    players = body["players"]
    events = body.get("events", [])

    season = int(meta["season"])
    game = int(meta["game"])
    opp = str(meta["opp"]).strip()
    gtype = str(meta.get("type", "REG")).strip()
    opp_score = int(meta.get("oppScore", 0) or 0)
    opp_color = str(meta.get("oppColor", "") or "").strip()

    if not opp:
        return jsonify({"ok": False, "error": "opp required"}), 400
    if not players:
        return jsonify({"ok": False, "error": "no players"}), 400

    # persist opponent color (doesn't affect existing stats functionality)
    if opp_color:
        set_opp_color(opp, opp_color)

    def blank_row():
        r = {c: None for c in DB_COLS}
        for k in ["2PM","2PA","3PM","3PA","FGM","FGA","FTM","FTA","OREB","DREB",
                  "PTS","REB","AST","BLK","STL","TOV","FLS"]:
            r[k] = 0
        for k in ["FG%","TS%","FT%","2P%","3P%","GSC"]:
            r[k] = 0.0
        return r

    rows = []
    team_score = 0

    for p in players:
        name = str(p.get("NAMES", "")).strip()
        if not name:
            continue

        r = blank_row()
        r["OPP"] = opp
        r["SEASON"] = season
        r["GAME"] = game
        r["TYPE"] = gtype
        r["NAMES"] = name

        for k in ["2PM","2PA","3PM","3PA","FGM","FGA","FTM","FTA","OREB","DREB",
                  "PTS","REB","AST","BLK","STL","TOV","FLS"]:
            r[k] = int(p.get(k, 0) or 0)

        for k in ["FG%","TS%","FT%","2P%","3P%","GSC"]:
            r[k] = float(p.get(k, 0.0) or 0.0)

        team_score += r["PTS"]
        rows.append(r)

    if not rows:
        return jsonify({"ok": False, "error": "no valid players"}), 400

    team_row = blank_row()
    team_row["OPP"] = opp
    team_row["SEASON"] = season
    team_row["GAME"] = game
    team_row["TYPE"] = gtype
    team_row["NAMES"] = "Injury Reserves"
    team_row["PTS"] = int(team_score)

    opp_row = blank_row()
    opp_row["OPP"] = "Injury Reserves"
    opp_row["SEASON"] = season
    opp_row["GAME"] = game
    opp_row["TYPE"] = gtype
    opp_row["NAMES"] = opp
    opp_row["PTS"] = int(opp_score)

    c = con()
    cur = c.cursor()
    ensure_event_tables()

    cur.execute(
        """
        delete from InjuryReserves
        where SEASON=? and GAME=? and (
          (NAMES='Injury Reserves' and OPP=?)
          or
          (NAMES=? and OPP='Injury Reserves')
        )
        """,
        (season, game, opp, opp),
    )

    all_rows = rows + [team_row, opp_row]

    sql_cols = ",".join(f'"{c}"' for c in DB_COLS)
    q = ",".join("?" for _ in DB_COLS)
    sql = f'insert into InjuryReserves ({sql_cols}) values ({q})'
    cur.executemany(sql, [[r[col] for col in DB_COLS] for r in all_rows])

    # ---- NEW: insert minutes + plus_minus per player ----

    # remove existing rows for this game first (so re-save overwrites)
    cur.execute(
        "DELETE FROM game_player_stats WHERE season=? AND game=?",
        (season, game),
    )

    for p in players:
        name = str(p.get("NAMES", "")).strip()
        if not name:
            continue

        cur.execute(
            """
            INSERT INTO game_player_stats (season, game, type, opp,
                                           player,
                                           minutes, plus_minus)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                season,
                game,
                gtype,
                opp,
                name,
                int(p.get("minutes", 0) or 0),
                int(p.get("plusMinus", 0) or 0),
            ),
        )

    cur.execute(
        "DELETE FROM game_events WHERE season=? AND game=?",
        (season, game),
    )

    for ev in events:
        kind = str(ev.get("kind", "") or "").strip()
        if not kind:
            continue
        cur.execute(
            """
            INSERT INTO game_events (
                season, game, type, opp, period, clock,
                event_kind, player, other_player, code, points
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                season,
                game,
                gtype,
                opp,
                str(ev.get("period", "") or "").strip(),
                str(ev.get("clock", "") or "").strip(),
                kind,
                str(ev.get("player", "") or "").strip() or None,
                str(ev.get("toPlayer", ev.get("otherPlayer", "")) or "").strip() or None,
                str(ev.get("code", ev.get("action", "")) or "").strip() or None,
                int(ev.get("points", 0) or 0),
            ),
        )

    c.commit()
    c.close()

    rebuild_json()
    return jsonify({
        "ok": True,
        "inserted": len(all_rows),
        "teamScore": team_score,
        "oppScore": opp_score,
        "oppColor": opp_color or (get_opp_color(opp) or None),
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True, use_reloader=False)
