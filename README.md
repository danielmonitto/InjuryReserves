# injury reserves basketball statistics

a static basketball statistics website built from an excel workbook and deployed using github pages.  
the site is fast, public, and requires no backend server.

---

## overview

this project converts `melton basketball.xlsm` into json files using python, then displays the data through a static frontend (html, css, javascript).

update the excel → rebuild the data → commit → the site updates.

---

## features

- game statistics with team score cards
- player averages and player totals
- career highs (includes lowest gsc, 2 decimals)
- averages vs teams
- stats by game type
- summary stats table + advanced stats table
- games played (gp) included where relevant
- all-time stats automatically exclude players with gp < 3
- youtube links for highlights and full games per match

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

python 3.9+

install dependencies:

```bash
pip install -r requirements.txt
```

---

## building / updating data

whenever the excel file changes, rebuild the data:

```bash
python build_data.py
```

this regenerates all json files in `/data`.

commit the updated data:

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

(do not open index.html using file://)

---

## github pages deployment

1. push the repository to github  
2. repository settings → pages  
3. set:
   - source: deploy from a branch  
   - branch: main  
   - folder: / (root)

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

if a link is empty, it will not be shown.

---

## customisation

- site title and text: `index.html`
- logo: replace `logo.png`
- colours, layout, fonts: `styles.css`
- stat rules and filters: `build_data.py`

---

## author

daniel monitto
