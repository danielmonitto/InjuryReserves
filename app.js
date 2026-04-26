const state = {
  page: "overview",
  index: null,
  season: null,
  game: null,
  allTime: false,
  vsOpponentSlug: null,
  gameType: "REG",
  search: "",
  highsLinkCache: {},
};

const PAGE_META = {
  overview: {
    title: "Overview",
    description: "The fastest read on the latest season, recent game context, and player leaders."
  },
  game: {
    title: "Game Center",
    description: "Single-game scoreboard, player box score, advanced stats, play-by-play, and footage."
  },
  avg: {
    title: "Player Averages",
    description: "Per-game production with quick and advanced tables."
  },
  tot: {
    title: "Player Totals",
    description: "Volume totals across the selected season or across the full archive."
  },
  highs: {
    title: "Career Highs",
    description: "Best marks for each player, with links back to the game where they happened."
  },
  vs: {
    title: "Matchups",
    description: "How the roster performs against a specific opponent in a chosen season."
  },
  type: {
    title: "Game Types",
    description: "Split team and player production by preseason, regular season, or finals."
  },
  assists: {
    title: "Assist Links",
    description: "Assister-to-scorer chemistry totals built from saved event-level data."
  }
};

async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`failed to load ${path}`);
  return res.json();
}

async function loadOptionalJSON(path, fallback){
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return fallback;
    return res.json();
  } catch (_) {
    return fallback;
  }
}

const GAME_VIDEOS = {
  /* =======================
     SEASON 1 (games -1, 1–8)
     ======================= */

  "1_-1": {
    highlights: "",
    full: ""
  },
  "1_1": { highlights: "https://youtu.be/TuhGsU7g8Cw?si=_ub67gn5fRS1DNmr", full: "https://youtu.be/HJ09aE7yl1k?si=zw2yF--pbbsWaDrF" },
  "1_2": { highlights: "https://youtu.be/Zi4JsPZL_XU?si=qoU5qhK4CYBcjxTe", full: "https://youtu.be/Lj9Ldb4mOHw?si=J0A8YhSFutEGYakT" },
  "1_3": { highlights: "https://youtu.be/5_Q0uLOkrIA?si=B0zfxgX1GS_PRo41", full: "https://youtu.be/hN33TNS1lKc?si=f2rEAt3Hngy1_oJ6" },
  "1_4": { highlights: "https://youtu.be/PqeMcCG0484?si=VhIjF9R2H2R71RMB", full: "https://youtu.be/3lJUMncv15w?si=C5c2O8GNOs7kGZGl" },
  "1_5": { highlights: "https://youtu.be/9GTpawXcBOc?si=AqmUSsMYLO0n6nLx", full: "https://youtu.be/i8DPU3Gszwk?si=jet5UNObe8sWhXGc" },
  "1_6": { highlights: "https://youtu.be/r_xKFs-bhdE?si=z7vuMyXVQ2e7i96v", full: "https://youtu.be/iqltjeugIe4?si=proYkYoot3WQHYDA" },
  "1_7": { highlights: "https://youtu.be/_jlVPWDIrBM?si=2rFV5FXfO9EI_q_A", full: "https://youtu.be/l-oPeeYAxA8?si=t1t1eRDXBbQq595C" },
  "1_8": { highlights: "https://youtu.be/2JqKKGoF1CI?si=a_BIJ0NlUCrSRldu", full: "https://youtu.be/bv1wPIaH6NY?si=jPKBVb3FMwgCkqh8" },

  /* =======================
     SEASON 2 (games -3 to -1, 1–15)
     ======================= */

  "2_-3": { highlights: "https://youtu.be/VUwmPmtK3qM?si=pfqM1QUWKctRaAqF", full: "https://youtu.be/MbA02XWEEjY?si=bBmFAthm3elkUbva" },
  "2_-2": { highlights: "https://youtu.be/-YKs3dteuX0?si=ENM8HR_LSTWHfyfu", full: "https://youtu.be/Hvk6CSezX8U?si=HfoNrX6sT0fZ-xS2" },
  "2_-1": { highlights: "https://youtu.be/nsiXyS4cBpM?si=UYF4PG6l4Vx_gw5f", full: "https://youtu.be/eBk0OkKX37Y?si=HcTcd6L8rudpKTvE" },

  "2_1":  { highlights: "https://youtu.be/-YDefr4-Cus?si=BjXSkszaWxKGzmUX", full: "https://youtu.be/36mHwCukXVQ?si=wi_4efknsgYDUdEI" },
  "2_2":  { highlights: "https://youtu.be/jtrjhIO-5Vk?si=eyaJK4mc-sg33eXF", full: "https://youtu.be/1dQoPdkiei0?si=60nQRVMJR_PCLjLt" },
  "2_3":  { highlights: "https://youtu.be/pVF2EH_q_t0?si=XKfuOfM5UMru5ane", full: "https://youtu.be/tZk1YLcqXxo?si=LdV8fpju_Bm8cNex" },
  "2_4":  { highlights: "https://youtu.be/gw3zq-WRm7Q?si=U1iuYBCwF0gMJ-UL", full: "https://youtu.be/8_nIAyQc0pY?si=0o_kYMDopLN1LFeF" },
  "2_5":  { highlights: "https://youtu.be/WfUPHlvSkYw?si=zl-gIsIpRMUmWHkr", full: "https://youtu.be/Q0NkLdwIZiU?si=NML0bZ-jJIVOHBBl" },
  "2_6":  { highlights: "https://youtu.be/yTS-DEy0PhQ?si=fG1EWZH31FKJDg5d", full: "https://youtu.be/MBK3GPOh5Yo?si=PYOfVS1OxxygVes5" },
  "2_7":  { highlights: "https://youtu.be/-sbhNnIzcdI?si=nqLDEz8rMRskjZ7F", full: "https://youtu.be/sxQWeUJG4QU?si=WhfVMC31-nH58GKx" },
  "2_8":  { highlights: "https://youtu.be/UA631kFqkI8?si=ptezngXrUg7gZiYw", full: "https://youtu.be/PVKLlxK6HgQ?si=v0-Rk3q2w2CjOSz7" },
  "2_9":  { highlights: "https://youtu.be/wISZIZCjmj8?si=3-BDVWzp422EJBim", full: "https://youtu.be/-msWsD2VP5c?si=mLCQtV6TxUk8Jp_j" },
  "2_10": { highlights: "https://youtu.be/H8zZHxd8d1A?si=WQZf5P1lGrKTIz7M", full: "https://youtu.be/f4_50jpZpaU?si=7iCeOAMqu85XDGMt" },
  "2_11": { highlights: "https://youtu.be/RvTXl5Y7udg?si=58OM76rzRH9UYyRD", full: "https://youtu.be/2uRKFUbU-HI?si=IGfgOTYzmeEztQxk" },
  "2_12": { highlights: "https://youtu.be/R_E53o280tc?si=VwGFrXG_Khl1A2FK", full: "https://youtu.be/ip_8rh9xS7c?si=5qVYkXaNaEGhMQ1t" },
  "2_13": { highlights: "https://youtu.be/C7U6Xml0C24?si=NCWQXeCYw-ApoEnI", full: "https://youtu.be/_-ElmkOVvXw?si=hrg4rQcdMUfM9bMM" },
  "2_14": { highlights: "https://youtu.be/YrvBCYhP9uQ?si=Rf9SYgGG57ZctvEM", full: "https://youtu.be/VFjRL1HS33o?si=y3WtCRV9rQlhW8Re" },
  "2_15": { highlights: "https://youtu.be/3uU1sPSJWUY?si=Zf1EOFJ1i91Tv_Hb", full: "https://youtu.be/PLCswvdE2NM?si=411snao5LHaUm7RO" },

  "3_-1": { highlights: "https://youtu.be/PCja5P4AJUg?si=zom0lpNDUGq8M-Jt", full: "https://youtu.be/YOTnmWINbsw?si=yOjznEiGL51MLHQd" },

  "3_1": { highlights: "https://youtu.be/WL7CB8PBLN8?si=hdW5KSlNPeJfrGcr", full: "https://youtu.be/ZDnecme0aq8?si=CoYz3DzN0TUWdyHt" },
  "3_2": { highlights: "https://youtu.be/wm3PoGC_69Y?si=kn0kafjppOX1r9dX", full: "https://youtu.be/tsPV9CI8Hi8?si=GcgwcUs72I-hUH6T" },
  "3_3": { highlights: "https://youtu.be/Yiu2GjbAAwc?si=wtgsOaWHhi96yZZO", full: "https://youtu.be/NAEHUH1eHzs?si=DgdwJEFH-KYYp1Dk" },
  "3_4": { highlights: "https://youtu.be/QH4euaws45M?si=zzwsMGRaLdMDqVK_", full: "https://youtu.be/P2CEUvMANnw?si=pNjbPjaFZtKrF7Kz" },
  "3_5": { highlights: "https://youtu.be/Qb3DfykRf2w?si=IXukh-ImQDMOXQ9k", full: "https://youtu.be/8bJP4bjhsTc?si=cLEPUm2GNQgk1taq" },
  "3_6": { highlights: "", full: "https://youtu.be/PeRAu0btAOg?si=ERppFtRqPnrd8GCe" },
  "3_7": { highlights: "https://youtu.be/VlQ7-4MRbHM?si=l1OzbLoNg9xsoWRe", full: "https://youtu.be/zWJzhAlJvDs?si=lshix12IxWw9FjTF" },

  "4_-5": { highlights: "https://youtu.be/no1VOff5m8o", full: "https://youtu.be/k3MNfUl-T0c" },
  "4_-4": { highlights: "", full: "https://youtu.be/vaq9EZ1zAOQ" },
  "4_-3": { highlights: "", full: "https://youtu.be/IFFpTk5v-Hs" },
  "4_-2": { highlights: "", full: "https://youtu.be/oYe-kSSI6ts" },
  "4_-1": { highlights: "", full: "" },

  "4_1": { highlights: "https://youtu.be/cRO2ytcNCXw", full: "https://youtu.be/92K7FyX_6uE" },
  "4_2": { highlights: "https://youtu.be/1BDELnS1ixo", full: "https://youtu.be/6ddir_F_s2A" },
  "4_3": { highlights: "", full: "" },
  "4_4": { highlights: "", full: "" },
  "4_5": { highlights: "", full: "" },
  "4_6": { highlights: "", full: "" },
  "4_7": { highlights: "https://youtu.be/BN0H8gIA9aQ", full: "https://youtu.be/7yngkGXZH5o" },
  "4_8": { highlights: "https://youtu.be/twLG1McLIQg", full: "https://youtu.be/kRq9yIn1_UY" },
  "4_9": { highlights: "", full: "https://youtu.be/qzpghVnK2NA" },
  "4_10": { highlights: "", full: "" },
  "4_11": { highlights: "", full: "" },
  "4_12": { highlights: "", full: "" },


};

function sortByGamesPlayed(rows) {
  if (!rows || !rows.length) return rows;
  if (!("GP" in rows[0])) return rows;
  return [...rows].sort((a, b) => (b.GP ?? 0) - (a.GP ?? 0));
}


function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if(k === "class") n.className = v;
    else if(k === "html") n.innerHTML = v;
    else if(k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  });
  const kids = Array.isArray(children) ? children : [children];
  kids
    .filter(c => c !== null && c !== undefined && c !== false)
    .forEach(c => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return n;
}

function setActiveTab(scroll = false) {
  document.querySelectorAll("#tabs button").forEach(b => {
    const isActive = b.dataset.page === state.page;
    b.classList.toggle("active", isActive);

    if (isActive && scroll) {
      b.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth"
      });
    }
  });
}

function syncURL() {
  const params = new URLSearchParams();
  if (state.page && state.page !== "overview") params.set("page", state.page);

  if (state.page === "game") {
    params.set("season", String(state.season));
    params.set("game", String(state.game));
  }

  if (state.page === "avg" || state.page === "tot" || state.page === "highs" || state.page === "assists") {
    if (state.allTime) {
      params.set("allTime", "true");
    } else if (state.season) {
      params.set("season", String(state.season));
    }
  }

  if (state.page === "type") {
    params.set("type", state.gameType);
  }

  if (state.page === "vs") {
    if (state.season) params.set("season", String(state.season));
    if (state.vsOpponentSlug) params.set("opponent", state.vsOpponentSlug);
  }

  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  history.replaceState({}, "", next);
}

function renderHeaderSummary() {
  const mount = document.getElementById("header-summary");
  if (!mount || !state.index) return;

  const totalGames = Object.values(state.index.seasonGames || {}).reduce((sum, games) => sum + games.length, 0);
  const totalTeams = Object.values(state.index.seasonTeams || {}).reduce((sum, teams) => sum + teams.length, 0);
  const trackedPlayers = Object.keys(state.index.rowColors || {}).filter(name => name !== "Injury Reserves").length;
  const latestSeason = state.index.seasons?.[0] || "-";

  mount.innerHTML = "";
  [
    { label: "Latest Season", value: latestSeason },
    { label: "Tracked Games", value: String(totalGames) },
    { label: "Tracked Players", value: String(trackedPlayers) },
    { label: "Opponents Logged", value: String(totalTeams) }
  ].forEach(item => {
    mount.appendChild(el("div", { class: "summary-chip" }, [
      el("div", { class: "summary-chip-label" }, [item.label]),
      el("div", { class: "summary-chip-value" }, [item.value])
    ]));
  });
}

function buildPageIntro(title, description, actions = []) {
  return el("section", { class: "page-intro" }, [
    el("div", { class: "page-intro-copy" }, [
      el("div", { class: "page-kicker" }, ["Injury Reserves Stats"]),
      el("h2", {}, [title]),
      description ? el("p", { class: "page-description" }, [description]) : null
    ]),
    actions.length
      ? el("div", { class: "page-intro-actions" }, actions)
      : null
  ]);
}

function buildSection(title, description, children = []) {
  const body = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  return el("section", { class: "content-section" }, [
    el("div", { class: "section-head" }, [
      el("h3", {}, [title]),
      description ? el("p", { class: "section-copy" }, [description]) : null
    ]),
    ...body
  ]);
}

function renderControls() {
  const c = document.getElementById("controls");
  c.innerHTML = "";

  const seasons = state.index.seasons;
  if (!state.season) state.season = seasons[0];

  const games = state.index.seasonGames[state.season] || [];
  if (state.page === "game" && (state.game === null || !games.includes(Number(state.game)))) {
    state.game = games[0];
  }

  const addSelect = (label, value, options, onChange) => {
    const sel = el("select", { onChange: (e) => onChange(e.target.value) }, options.map(o => {
      const optionValue = typeof o === "object" ? o.value : o;
      const optionLabel = typeof o === "object" ? o.label : o;
      const opt = el("option", { value: optionValue }, [String(optionLabel)]);
      if (String(optionValue) === String(value)) opt.selected = true;
      return opt;
    }));
    c.appendChild(el("div", { class:"control" }, [
      el("label", {}, [label]),
      sel
    ]));
  };

  const addCheckbox = (label, checked, onChange) => {
    const inp = el("input", { type:"checkbox" });
    inp.checked = checked;
    inp.addEventListener("change", () => onChange(inp.checked));
    c.appendChild(el("div", { class:"control" }, [
      el("label", {}, [label]),
      inp
    ]));
  };

  const addSearch = (label, value, onInput) => {
    const inp = el("input", { type:"text", placeholder:"name or team" });
    inp.value = value || "";
    inp.addEventListener("input", (e) => onInput(e.target.value));
    c.appendChild(el("div", { class:"control" }, [
      el("label", {}, [label]),
      inp
    ]));
  };

  if (state.page !== "overview") {
    addSearch("search", state.search, (v) => { state.search = v; refreshContent(); });
  }

  if (state.page === "overview") {
    addSelect("season", state.season, seasons, (v) => { state.season = v; refresh(); });
  }

  if (state.page === "game") {
    addSelect("season", state.season, seasons, (v) => { state.season = v; state.game = (state.index.seasonGames[v] || [])[0]; refresh(); });
    addSelect("game", state.game, games, (v) => { state.game = Number(v); refresh(); });
  }

  if (state.page === "avg" || state.page === "tot" || state.page === "highs" || state.page === "assists") {
    addCheckbox("all-time", state.allTime, (v) => { state.allTime = v; refresh(); });
    if (!state.allTime) {
      addSelect("season", state.season, seasons, (v) => { state.season = v; refresh(); });
    }
  }

  if (state.page === "type") {
    addSelect("game type", state.gameType, ["PRE", "REG", "FINAL"], (v) => { state.gameType = v; refresh(); });
  }

  if (state.page === "vs") {
    addSelect("season", state.season, seasons, (v) => { state.season = v; state.vsOpponentSlug = null; refresh(); });
    const teams = state.index.seasonTeams[state.season] || [];
    const opts = teams.map(t => ({ name:t, slug: slugify(t) }));
    if (!state.vsOpponentSlug && opts.length) state.vsOpponentSlug = opts[0].slug;
    addSelect("opponent", state.vsOpponentSlug, opts.map(o => ({ value: o.slug, label: o.name })), (v) => { state.vsOpponentSlug = v; refresh(); });
  }

}

function slugify(s){
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'') || 'team';
}

function splitTeam(rows) {
  const team = rows.filter(r => !String(r.NAMES).includes("Injury Reserves"));
  const pan = rows.filter(r => String(r.NAMES).includes("Injury Reserves"));
  return { team, pan };
}

function filterRowsBySearch(rows) {
  const q = String(state.search || "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(r => String(r.NAMES || "").toLowerCase().includes(q));
}

async function getHighsLinkMap(rows) {
  if (state.page !== "highs") return null;
  const key = state.allTime ? "all" : `season_${state.season}`;
  if (state.highsLinkCache[key]) return state.highsLinkCache[key];

  const seasons = state.allTime ? state.index.seasons : [state.season];
  const baseKeys = rows && rows.length ? Object.keys(rows[0]) : [];
  const statKeys = baseKeys.filter(k => !k.endsWith("_display") && k !== "NAMES" && k !== "rowColor" && k !== "GP");
  const statDefs = statKeys.map(k => {
    if (k === "Lowest GSC") return { key: k, source: "GSC", mode: "min" };
    return { key: k, source: k, mode: "max" };
  });

  const map = {};
  for (const season of seasons) {
    const games = state.index.seasonGames[season] || [];
    for (const game of games) {
      const payload = await loadJSON(`data/games/${season}_${game}.json`);
      const players = payload.players || [];
      for (const r of players) {
        const name = r.NAMES;
        if (!name || String(name).includes("Injury Reserves")) continue;
        if (!map[name]) map[name] = {};
        for (const def of statDefs) {
          if (!(def.source in r)) continue;
          const val = Number(r[def.source]);
          if (!Number.isFinite(val)) continue;
          const cur = map[name][def.key];
          const better = !cur || (def.mode === "max" ? val > cur.value : val < cur.value);
          if (better) {
            map[name][def.key] = { value: val, season, game };
          }
        }
      }
    }
  }

  state.highsLinkCache[key] = map;
  return map;
}

function goToGame(season, game) {
  state.page = "game";
  state.season = String(season);
  state.game = Number(game);
  refresh();
}
const SUMMARY_COLS = [
  "NAMES",
  "MIN",
  "PM",
  "PTS","REB","AST","BLK","STL","TOV","FLS",
  "FG%","3P%","FT%","TS%","GSC","GP"
];


const SUMMARY_LABELS = {
  "NAMES":"name",
  "MIN":"min",
  "PM":"+/-",
  "PTS":"pts",
  "REB":"reb",
  "AST":"ast",
  "BLK":"blk",
  "STL":"stl",
  "TOV":"tov",
  "FLS":"fls",
  "FG%":"fg",
  "3P%":"3p",
  "FT%":"ft",
  "TS%":"ts",
  "GSC":"gsc",
};

function selectCols(rows, cols) {
  if (!rows || !rows.length) return [];
  const available = new Set(Object.keys(rows[0]));
  return cols.filter(c => available.has(c));
}

function appendTeamPanTables(content, rows) {
  const isGamePage = state.page === "game";
  const sorted = isGamePage ? rows : sortByGamesPlayed(rows);
  const { team, pan } = splitTeam(sorted);
  const teamFiltered = filterRowsBySearch(team);
  const panFiltered = filterRowsBySearch(pan);

  if (!teamFiltered.length && !panFiltered.length) {
    content.appendChild(el("div", { class:"note" }, ["no matches"]));
    return;
  }

  const quickChildren = [];
  const advancedChildren = [];

  if (teamFiltered.length) {
    const summaryCols = selectCols(teamFiltered, SUMMARY_COLS);
    quickChildren.push(buildTable(teamFiltered, true, summaryCols, SUMMARY_LABELS, { highsLinkMap: state.highsLinkMap }));
    advancedChildren.push(buildTable(teamFiltered, true, null, null, { highsLinkMap: state.highsLinkMap }));
  }

  if (panFiltered.length) {
    const summaryCols = selectCols(panFiltered, SUMMARY_COLS);
    quickChildren.push(buildTable(panFiltered, true, summaryCols, SUMMARY_LABELS, { highsLinkMap: state.highsLinkMap }));
    advancedChildren.push(buildTable(panFiltered, true, null, null, { highsLinkMap: state.highsLinkMap }));
  }

  content.appendChild(buildSection(
    "Quick Stats",
    "The fastest-read table for points, rebounding, playmaking, efficiency, and game score.",
    quickChildren
  ));

  content.appendChild(buildSection(
    "Advanced Stats",
    "Full stat lines with the same player colors and sortable columns where it makes sense.",
    advancedChildren
  ));
}


function buildTable(rows, preferDisplay = true, columnsOverride = null, labelMap = null, options = null) {
  if (!rows || rows.length === 0) return el("div", { class:"note" }, ["no data"]);
  const opts = options || {};
  const allowSort = opts.allowSort !== undefined ? opts.allowSort : state.page !== "game";
  const highsLinkMap = opts.highsLinkMap || null;

  const autoKeys = Object.keys(rows[0])
    .filter(k => k !== "rowColor")
    .map(k => k.replace("_display", ""))
    .filter((v, i, a) => a.indexOf(v) === i);

  let columns = (Array.isArray(columnsOverride) && columnsOverride.length)
    ? columnsOverride
    : autoKeys;

  // hide MIN / PM in aggregate pages if entire column is zero
  if (state.page !== "game") {
    const allZero = (key) => {
      return rows.every(r => {
        const v = Number(r[key] ?? 0);
        return !v || v === 0;
      });
    };

    if (columns.includes("MIN") && allZero("MIN")) {
      columns = columns.filter(c => c !== "MIN");
    }

    if (columns.includes("PM") && allZero("PM")) {
      columns = columns.filter(c => c !== "PM");
    }
  }

  const toNumber = (x) => {
    if (x === null || x === undefined) return null;
    if (typeof x === "number") return x;
    if (typeof x === "string") {
      const t = x.trim();
      if (t === "") return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const formatCell = (k, r) => {
    const dispKey = `${k}_display`;
    if (preferDisplay && r[dispKey] !== undefined && r[dispKey] !== null && String(r[dispKey]).trim() !== "") {
      return r[dispKey];
    }
    // format minutes (stored as seconds)
    if (k === "MIN") {
      const sec = Number(r[k] || 0);

      // game page → show actual game minutes
      if (state.page === "game") {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2,"0")}`;
      }

      // aggregate pages → convert total seconds to per-game average
      const gp = Number(r.GP || 0);
      if (gp > 0) {
        const avgSec = Math.floor(sec / gp);
        const m = Math.floor(avgSec / 60);
        const s = avgSec % 60;
        return `${m}:${String(s).padStart(2,"0")}`;
      }

      return "0:00";
    }

    if (k.includes("%")) {
      const n = toNumber(r[k]);
      if (n === null) return r[k];
      if (n >= 0 && n <= 1) return `${(n * 100).toFixed(2)}%`;
      if (n > 1 && n <= 100) return `${Number(n).toFixed(2)}%`;
      return `${n}%`;
    }

    return r[k];
  };

  const headerText = (k) => {
    if (state.page === "game") {
      if (k === "PM") return "+/-";
      if (k === "MIN") return "MP";
    }
    return (labelMap && labelMap[k]) ? labelMap[k] : k;
  };

  const getSortValue = (r, k) => {
    if (k === "MIN") return Number(r[k] || 0);
    const n = toNumber(r[k]);
    if (n !== null) return n;
    return String(r[k] ?? "").toLowerCase();
  };

  const compareRows = (a, b, k, dir) => {
    const va = getSortValue(a, k);
    const vb = getSortValue(b, k);
    const aNil = va === null || va === undefined || va === "";
    const bNil = vb === null || vb === undefined || vb === "";
    if (aNil && bNil) return 0;
    if (aNil) return 1;
    if (bNil) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  };

  const tbody = el("tbody", {}, []);
  const renderRows = (list) => {
    tbody.innerHTML = "";
    list.forEach(r => {
      const bg = r.rowColor || "#A6C9EC";
      const tr = el("tr", {}, columns.map(k => {
        const v = formatCell(k, r);
        let cellContent = [String(v ?? "")];
        if (k === "NAMES") {
          const name = String(r.NAMES || "");
          const isTeamRow = name.includes("Injury Reserves");
          if (!isTeamRow) {
            const slug = slugify(name);
            cellContent = [el("a", { class:"player-link", href:`player.html?player=${slug}` }, [name])];
          }
        } else if (highsLinkMap && r.NAMES && highsLinkMap[r.NAMES] && highsLinkMap[r.NAMES][k]) {
          const info = highsLinkMap[r.NAMES][k];
          const btn = el("button", {
            class:"stat-link",
            title:`Go to season ${info.season} game ${info.game}`,
            onClick: () => goToGame(info.season, info.game)
          }, [String(v ?? "")]);
          cellContent = [btn];
        }
        const td = el("td", { style:`background:${bg};` }, cellContent);

        if (k === "PM") {
          const val = Number(r[k] || 0);

          td.style.color = "#000";
          td.style.fontWeight = "800";
          td.style.textAlign = "center";
          td.style.borderRadius = "6px";
          td.style.padding = "4px 8px";

          if (val > 0) {
            td.style.border = "2px solid #27ae60";
            td.innerText = `+${val}`;
          } else if (val < 0) {
            td.style.border = "2px solid #e74c3c";
          } else {
            td.style.border = "2px solid rgba(0,0,0,0.2)";
          }
        }

        return td;
      }));
      tbody.appendChild(tr);
    });
  };

  renderRows(rows);

  const sortState = { key: null, dir: -1 };
  const headerCells = columns.map(k => {
    const th = el("th", { "data-key": k }, [headerText(k)]);
    if (allowSort) {
      th.classList.add("sortable");
      th.addEventListener("click", () => {
        const isName = k === "NAMES";
        if (sortState.key === k) {
          sortState.dir = sortState.dir === 1 ? -1 : 1;
        } else {
          sortState.key = k;
          sortState.dir = isName ? 1 : -1;
        }
        const sorted = [...rows].sort((a, b) => compareRows(a, b, k, sortState.dir));
        renderRows(sorted);
        updateSortIndicators();
      });
    }
    return th;
  });

  const updateSortIndicators = () => {
    headerCells.forEach(th => {
      if (!allowSort) return;
      if (th.dataset.key === sortState.key) {
        th.dataset.sort = sortState.dir === 1 ? "asc" : "desc";
      } else {
        th.removeAttribute("data-sort");
      }
    });
  };

  const thead = el("thead", {}, [el("tr", {}, headerCells)]);

  return el("div", { class:"table-wrap" }, [el("table", {}, [thead, tbody])]);
}

function buildCompactPlayByPlay(rows) {
  const wrap = el("div", { class:"pbp-wrap" }, []);
  const list = el("div", { class:"pbp-list" }, []);
  const previewCount = 5;
  let expanded = false;

  const renderList = () => {
    list.innerHTML = "";
    const visible = expanded ? rows : rows.slice(0, previewCount);
    visible.forEach(r => {
      const item = el("div", { class:"pbp-item", style:`border-left:4px solid ${r.rowColor || "#A6C9EC"};` }, [
        el("div", { class:"pbp-meta" }, [`${String(r.PERIOD || "").toLowerCase()} • ${String(r.CLOCK || "")}`]),
        el("div", { class:"pbp-main" }, [
          el("span", { class:"pbp-player" }, [String(r.PLAYER || "").toLowerCase()]),
          el("span", { class:"pbp-play" }, [String(r.PLAY || "").toLowerCase()])
        ])
      ]);
      list.appendChild(item);
    });
  };

  renderList();
  wrap.appendChild(list);

  if (rows.length > previewCount) {
    const toggle = el("button", {
      class:"pbp-toggle",
      onClick: () => {
        expanded = !expanded;
        toggle.textContent = expanded ? "show less" : `show all ${rows.length} plays`;
        renderList();
      }
    }, [`show all ${rows.length} plays`]);
    wrap.appendChild(toggle);
  }

  return wrap;
}

function pickLeader(rows, key) {
  return [...rows]
    .filter(r => r.NAMES && !String(r.NAMES).includes("Injury Reserves"))
    .sort((a, b) => Number(b[key] || 0) - Number(a[key] || 0))[0] || null;
}

function statDisplay(row, key) {
  if (!row) return "-";
  return row[`${key}_display`] ?? row[key] ?? "-";
}

async function renderOverview() {
  const content = document.getElementById("content");
  content.innerHTML = "";
  state.highsLinkMap = null;

  const latestSeason = state.season || state.index.seasons[0];
  const latestGame = (state.index.seasonGames[latestSeason] || [])[0];
  const seasonGames = state.index.seasonGames[latestSeason] || [];
  const countedSeasonGames = seasonGames.filter(game => Number(game) > 0);
  const totalTeams = (state.index.seasonTeams[latestSeason] || []).length;

  const [gamePayload, averages, totals, assistRows, seasonPayloads, manualRecordData] = await Promise.all([
    latestGame !== undefined ? loadJSON(`data/games/${latestSeason}_${latestGame}.json`) : null,
    loadJSON(`data/aggregates/averages_by_season_${latestSeason}.json`),
    loadJSON("data/aggregates/totals_all.json"),
    loadJSON("data/assists/assists_all.json"),
    Promise.all(countedSeasonGames.map(game => loadJSON(`data/games/${latestSeason}_${game}.json`))),
    loadOptionalJSON("data/manual_records.json", {})
  ]);

  const teamAverages = averages.filter(r => !String(r.NAMES).includes("Injury Reserves"));
  const teamTotals = totals.filter(r => !String(r.NAMES).includes("Injury Reserves"));
  const scoringLeader = pickLeader(teamAverages, "PTS");
  const reboundLeader = pickLeader(teamAverages, "REB");
  const assistLeader = pickLeader(teamAverages, "AST");
  const gameScoreLeader = pickLeader(teamAverages, "GSC");
  const volumeLeader = pickLeader(teamTotals, "PTS");
  const topLink = [...assistRows].sort((a, b) => Number(b.AST || 0) - Number(a.AST || 0))[0] || null;
  const manualSeasonRecord = manualRecordData?.[String(latestSeason)] || {};
  const manualWins = Number(manualSeasonRecord.wins || 0);
  const manualLosses = Number(manualSeasonRecord.losses || 0);
  const manualDraws = Number(manualSeasonRecord.draws || 0);
  const seasonRecord = seasonPayloads.reduce((record, game) => {
    const diff = Number(game.teamScore || 0) - Number(game.opponentScore || 0);
    if (diff > 0) record.wins += 1;
    else if (diff < 0) record.losses += 1;
    else record.draws += 1;
    return record;
  }, { wins: manualWins, losses: manualLosses, draws: manualDraws });
  const recordText = seasonRecord.draws
    ? `${seasonRecord.wins}-${seasonRecord.losses}-${seasonRecord.draws}`
    : `${seasonRecord.wins}-${seasonRecord.losses}`;
  const manualGames = manualWins + manualLosses + manualDraws;
  const countedGames = seasonPayloads.length;
  const totalCountedGames = countedGames + manualGames;
  const recordDetail = !totalCountedGames
    ? "Only grading games logged so far"
    : manualGames
      ? `${totalCountedGames} counted games (${countedGames} tracked + ${manualGames} manual)`
      : seasonRecord.draws
        ? `${countedGames} counted games including ${seasonRecord.draws} draw${seasonRecord.draws === 1 ? "" : "s"}`
        : `${countedGames} counted games`;

  content.appendChild(buildPageIntro(
    PAGE_META.overview.title,
    PAGE_META.overview.description,
    [
      el("button", { class: "hero-link button-link", onClick: () => { state.page = "game"; refresh(); } }, ["Open Game Center"]),
      el("a", { class: "hero-link hero-link-ghost", href: "player.html" }, ["Browse Players"])
    ]
  ));

  content.appendChild(el("section", { class: "overview-grid" }, [
    el("div", { class: "overview-card overview-card-metric" }, [
      el("div", { class: "overview-label" }, ["Current season"]),
      el("div", { class: "overview-value" }, [String(latestSeason)]),
      el("div", { class: "overview-copy" }, [`${totalTeams} opponents logged`])
    ]),
    el("div", { class: "overview-card overview-card-metric" }, [
      el("div", { class: "overview-label" }, ["Season record"]),
      el("div", { class: "overview-value" }, [recordText]),
      el("div", { class: "overview-copy" }, [recordDetail])
    ]),
    el("div", { class: "overview-card overview-card-metric" }, [
      el("div", { class: "overview-label" }, ["Season scoring leader"]),
      el("div", { class: "overview-value overview-value-small" }, [scoringLeader ? scoringLeader.NAMES : "-"]),
      el("div", { class: "overview-copy" }, [`${statDisplay(scoringLeader, "PTS")} ppg`])
    ]),
    el("div", { class: "overview-card overview-card-metric" }, [
      el("div", { class: "overview-label" }, ["Top assist link"]),
      el("div", { class: "overview-value overview-value-small" }, [topLink ? `${topLink.ASSISTER} -> ${topLink.SCORER}` : "No links yet"]),
      el("div", { class: "overview-copy" }, [topLink ? `${topLink.AST} assists saved` : "Event data builds this view"])
    ])
  ]));

  if (gamePayload) {
    const diff = Number(gamePayload.teamScore || 0) - Number(gamePayload.opponentScore || 0);
    const resultText = diff > 0 ? "Win" : diff < 0 ? "Loss" : "Draw";
    content.appendChild(buildSection(
      "Latest Game Snapshot",
      "A quick read on the most recent game in the selected season.",
      el("div", { class: "feature-grid" }, [
        el("div", { class: "feature-card feature-card-score" }, [
          el("div", { class: "feature-eyebrow" }, [`Season ${gamePayload.season} • Game ${gamePayload.game}`]),
          el("div", { class: "feature-title" }, [String(gamePayload.opponent)]),
          el("div", { class: "feature-score-row" }, [
            el("div", { class: "feature-score-block is-team" }, [
              el("span", { class: "feature-score-label" }, ["Injury Reserves"]),
              el("strong", { class: "feature-score-value" }, [String(gamePayload.teamScore)])
            ]),
            el("div", { class: "feature-score-sep" }, ["-"]),
            el("div", { class: "feature-score-block" }, [
              el("span", { class: "feature-score-label" }, ["Opponent"]),
              el("strong", { class: "feature-score-value" }, [String(gamePayload.opponentScore)])
            ])
          ]),
          el("div", { class: "feature-copy" }, [`${resultText} by ${Math.abs(diff)} points`]),
          el("button", { class: "hero-link button-link", onClick: () => goToGame(gamePayload.season, gamePayload.game) }, ["Open full game"])
        ]),
        el("div", { class: "feature-card" }, [
          el("div", { class: "feature-eyebrow" }, ["What to check next"]),
          el("div", { class: "feature-list" }, [
            el("div", { class: "feature-list-item" }, [`${gamePayload.playByPlay?.length || 0} play-by-play events saved`]),
            el("div", { class: "feature-list-item" }, [gamePayload.players?.length ? `${gamePayload.players.length - 1} player rows tracked` : "Player rows available"]),
            el("div", { class: "feature-list-item" }, ["Jump into player profiles for best games and career snapshots"])
          ])
        ])
      ])
    ));
  }

  content.appendChild(buildSection(
    "Season Leaders",
    "Top current-season production at a glance.",
    el("div", { class: "leader-grid" }, [
      el("div", { class: "leader-card" }, [
        el("div", { class: "leader-label" }, ["Points"]),
        el("div", { class: "leader-name" }, [scoringLeader ? scoringLeader.NAMES : "-"]),
        el("div", { class: "leader-value" }, [`${statDisplay(scoringLeader, "PTS")} ppg`])
      ]),
      el("div", { class: "leader-card" }, [
        el("div", { class: "leader-label" }, ["Rebounds"]),
        el("div", { class: "leader-name" }, [reboundLeader ? reboundLeader.NAMES : "-"]),
        el("div", { class: "leader-value" }, [`${statDisplay(reboundLeader, "REB")} rpg`])
      ]),
      el("div", { class: "leader-card" }, [
        el("div", { class: "leader-label" }, ["Assists"]),
        el("div", { class: "leader-name" }, [assistLeader ? assistLeader.NAMES : "-"]),
        el("div", { class: "leader-value" }, [`${statDisplay(assistLeader, "AST")} apg`])
      ]),
      el("div", { class: "leader-card" }, [
        el("div", { class: "leader-label" }, ["Game Score"]),
        el("div", { class: "leader-name" }, [gameScoreLeader ? gameScoreLeader.NAMES : "-"]),
        el("div", { class: "leader-value" }, [String(statDisplay(gameScoreLeader, "GSC"))])
      ]),
      el("div", { class: "leader-card" }, [
        el("div", { class: "leader-label" }, ["All-time points"]),
        el("div", { class: "leader-name" }, [volumeLeader ? volumeLeader.NAMES : "-"]),
        el("div", { class: "leader-value" }, [`${statDisplay(volumeLeader, "PTS")} total`])
      ])
    ])
  ));

  content.appendChild(buildSection(
    "Shortcuts",
    "The main areas people actually need during normal use.",
    el("div", { class: "action-grid" }, [
      el("button", { class: "action-card", onClick: () => { state.page = "game"; refresh(); } }, [
        el("span", { class: "action-title" }, ["Game Center"]),
        el("span", { class: "action-copy" }, ["Open a single game, scoreboard, box score, and play-by-play."])
      ]),
      el("button", { class: "action-card", onClick: () => { state.page = "avg"; refresh(); } }, [
        el("span", { class: "action-title" }, ["Averages"]),
        el("span", { class: "action-copy" }, ["Per-game leaders and sortable team tables."])
      ]),
      el("button", { class: "action-card", onClick: () => { state.page = "highs"; refresh(); } }, [
        el("span", { class: "action-title" }, ["Career Highs"]),
        el("span", { class: "action-copy" }, ["Best single-game marks with links back to the source game."])
      ]),
      el("button", { class: "action-card", onClick: () => { state.page = "assists"; refresh(); } }, [
        el("span", { class: "action-title" }, ["Assist Links"]),
        el("span", { class: "action-copy" }, ["Review chemistry trends built from event-level data."])
      ])
    ])
  ));
}

async function renderGame(){
  const content = document.getElementById("content");
  content.innerHTML = "";
  state.highsLinkMap = null;

  const payload = await loadJSON(`data/games/${state.season}_${state.game}.json`);

  // opponent colour fallback (when game json doesn't include opponentColor)
  let oppColor = payload.opponentColor;
  if (!oppColor && payload.opponent) {
    try{
      const metaRes = await fetch(`/api/opponent_meta?opp=${encodeURIComponent(payload.opponent)}`, { cache:"no-store" });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta && meta.color) oppColor = meta.color;
      }
    } catch (e) {}
  }
  if (!oppColor) oppColor = "#4B5563";

  content.appendChild(buildPageIntro(
    PAGE_META.game.title,
    `Season ${payload.season} Game ${payload.game} vs ${payload.opponent}. ${PAGE_META.game.description}`
  ));

  const cards = el("div", { class:"cards" }, [
    el("div", { class:"card", style:`background:#db2e2e; color:white;` }, [
      el("div", { class:"title" }, ["injury reserves"]),
      el("div", { class:"score" }, [String(payload.teamScore)])
    ]),
    el("div", { class:"card", style:`background:${oppColor}; color:white;` }, [
      el("div", { class:"title" }, [String(payload.opponent).toLowerCase()]),
      el("div", { class:"score" }, [String(payload.opponentScore)])
    ])
  ]);
  content.appendChild(cards);

  // clone so we don't mutate original
  const rows = JSON.parse(JSON.stringify(payload.players));

  // find team totals row
  const teamRow = rows.find(r => String(r.NAMES).includes("Injury Reserves"));

  if (teamRow) {
    // TEAM +/- = teamScore - opponentScore
    teamRow.PM = Number(payload.teamScore || 0) - Number(payload.opponentScore || 0);

    // TEAM MIN = average minutes of real players
    const realPlayers = rows.filter(r => !String(r.NAMES).includes("Injury Reserves"));
    if (realPlayers.length) {
      const totalSeconds = realPlayers.reduce((sum, r) => sum + Number(r.MIN || 0), 0);
      teamRow.MIN = Math.floor(totalSeconds / realPlayers.length);
      delete teamRow.MIN_display;
    }
  }

  appendTeamPanTables(content, rows);

  if (payload.playByPlay && payload.playByPlay.length) {
    content.appendChild(buildSection(
      "Play-by-Play",
      "Compact preview first, with expansion when you want the full sequence.",
      buildCompactPlayByPlay(payload.playByPlay)
    ));
  }

  const videoKey = `${payload.season}_${payload.game}`;
  const videos = GAME_VIDEOS[videoKey];

  if (videos) {
    content.appendChild(buildSection("Game Footage", "Jump straight to highlights or the full game upload when available.", [
      el("div", { class: "video-links" }, [
        videos.highlights
          ? el("a", {
              href: videos.highlights,
              target: "_blank",
              class: "video-link"
            }, ["▶ Watch Highlights"])
          : null,

        videos.full
          ? el("a", {
              href: videos.full,
              target: "_blank",
              class: "video-link"
            }, ["▶ Watch Full Game"])
          : null
      ].filter(Boolean))
    ]));
  }

}

async function renderAggregate(kind){
  const content = document.getElementById("content");
  content.innerHTML = "";
  state.highsLinkMap = null;

  const titleMap = { averages:"Player Averages", totals:"Player Totals", highs:"Career Highs" };
  const metaKey = kind === "averages" ? "avg" : kind === "totals" ? "tot" : "highs";
  content.appendChild(buildPageIntro(
    titleMap[kind] || kind,
    PAGE_META[metaKey]?.description || ""
  ));

  let path;
  if(state.allTime){
    path = `data/aggregates/${kind}_all.json`;
  } else {
    path = `data/aggregates/${kind}_by_season_${state.season}.json`;
  }
  const rows = await loadJSON(path);
  if (kind === "highs") {
    state.highsLinkMap = await getHighsLinkMap(rows);
  }

  appendTeamPanTables(content, rows);
}

async function renderType(){
  const content = document.getElementById("content");
  content.innerHTML = "";
  state.highsLinkMap = null;

  content.appendChild(buildPageIntro(
    PAGE_META.type.title,
    `${PAGE_META.type.description} Current filter: ${state.gameType}.`
  ));
  const rows = await loadJSON(`data/aggregates/by_type_${state.gameType}.json`);
  appendTeamPanTables(content, rows);
}

async function renderVs(){
  const content = document.getElementById("content");
  content.innerHTML = "";
  state.highsLinkMap = null;

  const teams = state.index.seasonTeams[state.season] || [];
  const name = teams.find(t => slugify(t) === state.vsOpponentSlug) || state.vsOpponentSlug;
  content.appendChild(buildPageIntro(
    PAGE_META.vs.title,
    `Season ${state.season} matchup breakdown vs ${String(name)}.`
  ));

  const payload = await loadJSON(`data/vs/vs_${state.season}_${state.vsOpponentSlug}.json`);
  const rows = payload.rows || [];
  appendTeamPanTables(content, rows);
}

async function renderAssists(){
  const content = document.getElementById("content");
  content.innerHTML = "";
  state.highsLinkMap = null;

  const title = state.allTime ? "Assist Links (All-Time)" : `Assist Links (Season ${state.season})`;
  content.appendChild(buildPageIntro(title, PAGE_META.assists.description));

  const path = state.allTime
    ? "data/assists/assists_all.json"
    : `data/assists/assists_by_season_${state.season}.json`;
  const rows = await loadJSON(path);

  if (!rows || !rows.length) {
    content.appendChild(el("div", { class:"note" }, ["no assist links found"]));
    return;
  }

  content.appendChild(buildSection(
    "Assist Relationships",
    "Only event-level assists saved through the new workflow appear here.",
    buildTable(
      rows,
      false,
      ["ASSISTER", "SCORER", "AST"],
      { ASSISTER:"assister", SCORER:"scorer", AST:"ast" }
    )
  ));
}

async function refresh(){
  setActiveTab();
  syncURL();
  renderControls();
  return renderCurrentPage();
}

function renderCurrentPage(){
  if(state.page === "overview") return renderOverview();
  if(state.page === "game") return renderGame();
  if(state.page === "avg") return renderAggregate("averages");
  if(state.page === "tot") return renderAggregate("totals");
  if(state.page === "highs") return renderAggregate("highs");
  if(state.page === "type") return renderType();
  if(state.page === "vs") return renderVs();
  if(state.page === "assists") return renderAssists();
}

function refreshContent(){
  return renderCurrentPage();
}

async function init(){
  state.index = await loadJSON("data/index.json");
  const params = new URLSearchParams(window.location.search);
  renderHeaderSummary();

  document.querySelectorAll("#tabs button").forEach(b=>{
    b.addEventListener("click", ()=>{
      state.page = b.dataset.page;
      refresh();
    });
  });

  state.season = state.index.seasons[0];
  state.game = (state.index.seasonGames[state.season] || [])[0];

  const pageParam = params.get("page");
  if (pageParam) state.page = pageParam;
  const seasonParam = params.get("season");
  if (seasonParam && state.index.seasons.includes(String(seasonParam))) {
    state.season = String(seasonParam);
  }
  const gameParam = params.get("game");
  if (gameParam !== null) state.game = Number(gameParam);
  const allTimeParam = params.get("allTime");
  if (allTimeParam !== null) state.allTime = allTimeParam === "true";
  const typeParam = params.get("type");
  if (typeParam) state.gameType = typeParam;
  const opponentParam = params.get("opponent");
  if (opponentParam) state.vsOpponentSlug = opponentParam;
  refresh();
}

init();
