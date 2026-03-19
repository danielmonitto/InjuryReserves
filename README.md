# Injury Reserves

Basketball stats archive and game-day toolkit for Injury Reserves.

This repo now contains two related surfaces:

- A public stats website built from generated JSON files.
- A Flask admin and overlay app used to enter games, drive scoreboard graphics, and regenerate the public data.

## What is in here

### Public site

The public site is a static frontend powered by `index.html`, `player.html`, `styles.css`, and `app.js`.

It includes:

- season overview cards and leaders
- game center pages with box score and video links
- player averages, totals, and career highs
- matchup splits by opponent
- game-type splits
- assist-link data from saved events
- player profile pages
- mobile-friendly layouts for phone browsers

### Admin and overlays

The Flask app in [admin_api.py](/home/danielmonitto/PycharmProjects/InjuryReserves/admin_api.py) powers:

- `/admin-v2` for game entry and management
- `/scoreboard` for the live scoreboard overlay
- `/lineup` for the pre-tip lineup graphic
- `/endgame` for the endgame graphic
- JSON APIs for score state, player profile lookups, overlay events, opponent colors, and save-game actions

Saving a game through the admin app writes to SQLite and then rebuilds the JSON used by the public site.

## Data flow

The current workflow is:

1. Game data lives in `ir_stats.db`.
2. The admin UI saves games into SQLite through `/api/save_game`.
3. [build_data_from_sqlite.py](/home/danielmonitto/PycharmProjects/InjuryReserves/build_data_from_sqlite.py) regenerates the `data/` JSON files.
4. The public site reads those JSON files directly in the browser.

This means the public site is static, but the authoring workflow is backed by Flask + SQLite.

## Project structure

```text
.
├── admin_api.py
├── app.js
├── build_data_from_sqlite.py
├── data/
│   ├── aggregates/
│   ├── assists/
│   ├── games/
│   ├── players/
│   └── vs/
├── index.html
├── ir_stats.db
├── player.html
├── player.js
├── static/
│   ├── admin_v2.css
│   ├── admin_v2.js
│   └── photos/
├── styles.css
└── templates/
    ├── admin_v2.html
    ├── endgame.html
    ├── lineup.html
    └── scoreboard.html
```

## Requirements

- Python 3.11+ recommended
- SQLite database file: `ir_stats.db`

Install dependencies:

```bash
pip install -r requirements.txt
```

`requirements.txt` currently includes:

- `Flask`
- `numpy`
- `pandas`
- `openpyxl`

## Running locally

### Public stats site

Serve the repo root with a simple static server:

```bash
python -m http.server 8000
```

Then open:

- `http://localhost:8000/`
- `http://localhost:8000/player.html`

Do not open the HTML files with `file://`; the frontend fetches JSON files and expects an HTTP server.

### Admin and overlays

Run the Flask app:

```bash
python admin_api.py
```

Default local routes:

- `http://localhost:5001/admin-v2`
- `http://localhost:5001/scoreboard`
- `http://localhost:5001/lineup`
- `http://localhost:5001/endgame`

Note: the Flask root route `/` currently redirects to `/admin-v2`. The public site is still served separately as static files unless you add your own web server integration.

## Rebuilding public data

To regenerate all JSON from SQLite manually:

```bash
python build_data_from_sqlite.py
```

This rebuilds:

- `data/index.json`
- `data/games/*.json`
- `data/aggregates/*.json`
- `data/players/*.json`
- `data/vs/*.json`
- `data/assists/*.json`

The admin save flow already triggers this rebuild automatically after a successful `/api/save_game`.

## Main files

- [index.html](/home/danielmonitto/PycharmProjects/InjuryReserves/index.html): public stats homepage
- [player.html](/home/danielmonitto/PycharmProjects/InjuryReserves/player.html): player profile page
- [styles.css](/home/danielmonitto/PycharmProjects/InjuryReserves/styles.css): shared public-site styling, including mobile responsiveness
- [app.js](/home/danielmonitto/PycharmProjects/InjuryReserves/app.js): public homepage rendering, tables, filters, and routing state
- [player.js](/home/danielmonitto/PycharmProjects/InjuryReserves/player.js): player profile rendering
- [admin_api.py](/home/danielmonitto/PycharmProjects/InjuryReserves/admin_api.py): Flask app, APIs, and save-game pipeline
- [build_data_from_sqlite.py](/home/danielmonitto/PycharmProjects/InjuryReserves/build_data_from_sqlite.py): SQLite to JSON build script

## Public site features

- Overview page with latest season summary cards
- Game Center with team scorecards, box score data, and optional YouTube links
- Averages, totals, and career highs tables
- Matchup splits by opponent
- Game type splits for preseason, regular season, and finals
- Assist relationship totals from event data
- Player profile pages with career blocks and best games
- Responsive behavior tuned for desktop and phone browsers

## YouTube links

Game video links live in [app.js](/home/danielmonitto/PycharmProjects/InjuryReserves/app.js) inside `GAME_VIDEOS`.

Format:

```js
"SEASON_GAME": {
  highlights: "https://youtube.com/...",
  full: "https://youtube.com/..."
}
```

If a link is empty, it is not shown.

## Admin API highlights

Important routes in the Flask app include:

- `POST /api/save_game`
- `GET /api/admin_v2/bootstrap`
- `POST /api/live_score`
- `GET /api/scoreboard`
- `POST /api/overlay_event`
- `GET /api/overlay_event`
- `POST /api/lineup_state`
- `GET /api/lineup_state`
- `POST /api/endgame_state`
- `GET /api/endgame_state`
- `GET /api/player_profile`
- `GET /api/player_career_ft`
- `GET /api/opponent_meta`
- `GET /api/health`

## Notes

- There are existing generated assets under `data/` committed to the repo.
- `__pycache__/` is local runtime output and should not be treated as source.
- Some older files remain in `old/` as historical reference only.

## Author

Daniel Monitto
