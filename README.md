here is a clean, updated **README.md** with clearer structure, tighter wording, and small technical clarifications. you can copy-paste this directly.

---

# injury reserves basketball statistics

a static basketball statistics website generated from an excel workbook and deployed with github pages.
the site is fast, public, and requires no backend server.

---

## overview

this project converts `melton basketball.xlsm` into structured json using python, then renders the data with a static frontend (html, css, javascript).

workflow:

update excel → rebuild data → commit → site updates automatically.

---

## features

* game statistics with team scorecards
* player averages and player totals
* career highs (includes lowest gsc, rounded to 2 decimals)
* averages vs teams
* stats by game type
* summary stats table + advanced stats table
* games played (gp) included where relevant
* all-time stats automatically exclude players with gp < 3
* youtube links for highlights and full games per match

---

## project structure

```
.
├── index.html
├── styles.css
├── app.js
├── build_data.py
├── requirements.txt
├── melton basketball.xlsm
└── data/
    ├── games/
    └── aggregates/
```

---

## requirements

* python 3.9+

install dependencies:

```bash
pip install -r requirements.txt
```

---

## building / updating data

whenever the excel file changes, rebuild the site data:

```bash
python build_data.py
```

this regenerates all json files inside `/data`.

commit and push the changes:

```bash
git add data
git commit -m "update stats data"
git push
```

---

## running locally

from the project root:

```bash
python -m http.server 8000
```

open in a browser:

```
http://localhost:8000
```

note: do not open `index.html` using `file://` — some features rely on a local server.

---

## github pages deployment

1. push the repository to github
2. go to repository **settings → pages**
3. configure:

   * source: deploy from a branch
   * branch: `main`
   * folder: `/ (root)`

the site will be available at:

```
https://<username>.github.io/<repository-name>/
```

---

## youtube game links

youtube videos are configured in `app.js` using the `GAME_VIDEOS` object.

format:

```js
"SEASON_GAME": {
  highlights: "https://youtube.com/...",
  full: "https://youtube.com/..."
}
```

example:

```js
"2_7": {
  highlights: "https://www.youtube.com/watch?v=abc123",
  full: "https://www.youtube.com/watch?v=xyz789"
}
```

if a link is empty or missing, it will not be displayed.

---

## customisation

* site title and text: `index.html`
* colours, layout, fonts: `styles.css`
* frontend behaviour and tables: `app.js`
* stat rules, calculations, filters: `build_data.py`
* logo: replace `logo.png`

---

## author

daniel monitto

---

if you want, i can also:

* add screenshots section
* add badges (python / github pages)
* make it more “portfolio-ready” for recruiters
