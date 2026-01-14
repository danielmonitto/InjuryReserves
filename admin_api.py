from __future__ import annotations

import sqlite3
from pathlib import Path
from flask import Flask, request, jsonify, render_template
import subprocess, sys

DB_PATH = Path("ir_stats.db")

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
    "injStripe2": "rgba(181,7,40,0.95)",     # red
    "oppStripe1": "rgba(255,255,255,0.85)",
    "oppStripe2": "rgba(255,255,255,0.25)",
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

# ---- build step ----

def rebuild_json():
    # keep your existing pipeline
    subprocess.check_call([sys.executable, "build_data_from_sqlite.py"])

# ---- live overlay api ----

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

    period = str(body.get("period", LIVE_STATE.get("period","1ST")) or "").strip()
    if period:
        LIVE_STATE["period"] = period

    # new: stripe colors (optional)
    for k in ["oppStripe1", "oppStripe2"]:
        v = str(body.get(k, "") or "").strip()
        if v:
            LIVE_STATE[k] = v

    return {"ok": True}


@app.get("/api/scoreboard")
def scoreboard_live():
    return jsonify(LIVE_STATE)

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

@app.get("/scoreboard")
def scoreboard_page():
    return render_template("scoreboard.html")

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
    app.run(debug=True, port=5001)
