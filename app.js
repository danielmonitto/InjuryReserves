const state = {
  page: "game",
  index: null,
  season: null,
  game: null,
  allTime: false,
  vsOpponentSlug: null,
  gameType: "REG",
};

async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`failed to load ${path}`);
  return await res.json();
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

  /* =======================
     SEASON 3 (games -1, 1–7)
     ======================= */

  "3_-1": { highlights: "https://youtu.be/PCja5P4AJUg?si=zom0lpNDUGq8M-Jt", full: "https://youtu.be/YOTnmWINbsw?si=yOjznEiGL51MLHQd" },

  "3_1": { highlights: "https://youtu.be/WL7CB8PBLN8?si=hdW5KSlNPeJfrGcr", full: "https://youtu.be/ZDnecme0aq8?si=CoYz3DzN0TUWdyHt" },
  "3_2": { highlights: "https://youtu.be/wm3PoGC_69Y?si=kn0kafjppOX1r9dX", full: "https://youtu.be/tsPV9CI8Hi8?si=GcgwcUs72I-hUH6T" },
  "3_3": { highlights: "https://youtu.be/Yiu2GjbAAwc?si=wtgsOaWHhi96yZZO", full: "https://youtu.be/NAEHUH1eHzs?si=DgdwJEFH-KYYp1Dk" },
  "3_4": { highlights: "https://youtu.be/QH4euaws45M?si=zzwsMGRaLdMDqVK_", full: "https://youtu.be/P2CEUvMANnw?si=pNjbPjaFZtKrF7Kz" },
  "3_5": { highlights: "https://youtu.be/Qb3DfykRf2w?si=IXukh-ImQDMOXQ9k", full: "https://youtu.be/8bJP4bjhsTc?si=cLEPUm2GNQgk1taq" },
  "3_6": { highlights: "", full: "https://youtu.be/PeRAu0btAOg?si=ERppFtRqPnrd8GCe" },
  "3_7": { highlights: "https://youtu.be/VlQ7-4MRbHM?si=l1OzbLoNg9xsoWRe", full: "https://youtu.be/zWJzhAlJvDs?si=lshix12IxWw9FjTF" }
};



function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k === "class") n.className = v;
    else if(k === "html") n.innerHTML = v;
    else if(k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  });
  children.forEach(c => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return n;
}

function setActiveTab(){
  document.querySelectorAll("#tabs button").forEach(b=>{
    b.classList.toggle("active", b.dataset.page === state.page);
  });
}

function renderControls(){
  const c = document.getElementById("controls");
  c.innerHTML = "";

  const seasons = state.index.seasons;
  if(!state.season) state.season = seasons[0];

  const games = state.index.seasonGames[state.season] || [];
  if(state.page === "game" && (state.game === null || !games.includes(Number(state.game)))) {
    state.game = games[0];
  }

  const addSelect = (label, value, options, onChange) => {
    const sel = el("select", { onChange: (e)=>onChange(e.target.value) }, options.map(o=>{
      const opt = el("option", { value: o }, [String(o)]);
      if(String(o) === String(value)) opt.selected = true;
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
    inp.addEventListener("change", ()=>onChange(inp.checked));
    c.appendChild(el("div", { class:"control" }, [
      el("label", {}, [label]),
      inp
    ]));
  };

  if(state.page === "game"){
    addSelect("season", state.season, seasons, (v)=>{ state.season=v; state.game = (state.index.seasonGames[v]||[])[0]; refresh(); });
    addSelect("game", state.game, games, (v)=>{ state.game = Number(v); refresh(); });
  }

  if(state.page === "avg" || state.page === "tot" || state.page === "highs"){
    addCheckbox("all-time", state.allTime, (v)=>{ state.allTime=v; refresh(); });
    if(!state.allTime){
      addSelect("season", state.season, seasons, (v)=>{ state.season=v; refresh(); });
    }
  }

  if(state.page === "type"){
    addSelect("game type", state.gameType, ["PRE","REG","FINAL"], (v)=>{ state.gameType=v; refresh(); });
  }

  if(state.page === "vs"){
    addSelect("season", state.season, seasons, (v)=>{ state.season=v; state.vsOpponentSlug=null; refresh(); });
    const teams = state.index.seasonTeams[state.season] || [];
    const opts = teams.map(t => ({ name:t, slug: slugify(t) }));
    if(!state.vsOpponentSlug && opts.length) state.vsOpponentSlug = opts[0].slug;
    addSelect("opponent", state.vsOpponentSlug, opts.map(o=>o.slug), (v)=>{ state.vsOpponentSlug=v; refresh(); });
  }
}

function slugify(s){
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'') || 'team';
}

function splitTeam(rows){
  const team = rows.filter(r => !String(r.NAMES).includes("Injury Reserves"));
  const pan = rows.filter(r => String(r.NAMES).includes("Injury Reserves"));
  return { team, pan };
}
const SUMMARY_COLS = ["NAMES","PTS","REB","AST","BLK","STL","TOV","FLS","FG%","3P%","FT%","TS%","GSC","GP"];

const SUMMARY_LABELS = {
  "NAMES":"name",
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
  "GSC":"gsc"
};

function selectCols(rows, cols){
  if(!rows || !rows.length) return [];
  const available = new Set(Object.keys(rows[0]));
  return cols.filter(c => available.has(c));
}

function appendTeamPanTables(content, rows){
  const { team, pan } = splitTeam(rows);

  /* ===== MAIN STATS ===== */

  // players – main stats
  if(team.length || pan.length){
    content.appendChild(el("h3", {}, ["Quick Stats"]));
  }

  if(team.length){
    const summaryCols = selectCols(team, SUMMARY_COLS);
    content.appendChild(buildTable(team, true, summaryCols, SUMMARY_LABELS));
  }

  // injury reserves – main stats
  if(pan.length){
    content.appendChild(el("div", { style:"height:10px" }, []));
    const summaryCols = selectCols(pan, SUMMARY_COLS);
    content.appendChild(buildTable(pan, true, summaryCols, SUMMARY_LABELS));
  }

  /* ===== ADVANCED STATS TITLE ===== */
  if(team.length || pan.length){
    content.appendChild(el("h3", {}, ["Advanced Stats"]));
  }

  /* ===== ADVANCED / FULL STATS ===== */

  // players – advanced stats
  if(team.length){
    content.appendChild(buildTable(team, true));
  }

  // injury reserves – advanced stats
  if(pan.length){
    content.appendChild(el("div", { style:"height:10px" }, []));
    content.appendChild(buildTable(pan, true));
  }
}


function buildTable(rows, preferDisplay=true, columnsOverride=null, labelMap=null){
  if(!rows || rows.length === 0) return el("div", { class:"note" }, ["no data"]);

  const autoKeys = Object.keys(rows[0]).filter(k => k !== "rowColor" && !k.endsWith("_display"));
  const columns = (Array.isArray(columnsOverride) && columnsOverride.length) ? columnsOverride : autoKeys;

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

    if (k.includes("%")) {
      const n = toNumber(r[k]);
      if (n === null) return r[k];
      if (n >= 0 && n <= 1) return `${(n * 100).toFixed(2)}%`;
      if (n > 1 && n <= 100) return `${Number(n).toFixed(2)}%`;
      return `${n}%`;
    }

    return r[k];
  };

  const headerText = (k) => (labelMap && labelMap[k]) ? labelMap[k] : k;

  const thead = el("thead", {}, [el("tr", {}, columns.map(k => el("th", {}, [headerText(k)])))]);
  const tbody = el("tbody", {}, rows.map(r=>{
    const bg = r.rowColor || "#A6C9EC";
    return el("tr", {}, columns.map(k=>{
      const v = formatCell(k, r);
      return el("td", { style:`background:${bg};` }, [String(v ?? "")]);
    }));
  }));

  return el("div", { class:"table-wrap" }, [el("table", {}, [thead, tbody])]);
}

async function renderGame(){
  const content = document.getElementById("content");
  content.innerHTML = "";

  const payload = await loadJSON(`data/games/${state.season}_${state.game}.json`);

  content.appendChild(el("h2", {}, [`Season ${payload.season} Game ${payload.game} Stats`]));

  const cards = el("div", { class:"cards" }, [
    el("div", { class:"card", style:`background:#db2e2e; color:white;` }, [
      el("div", { class:"title" }, ["injury reserves"]),
      el("div", { class:"score" }, [String(payload.teamScore)])
    ]),
    el("div", { class:"card", style:`background:${payload.opponentColor}; color:white;` }, [
      el("div", { class:"title" }, [String(payload.opponent).toLowerCase()]),
      el("div", { class:"score" }, [String(payload.opponentScore)])
    ])
  ]);
  content.appendChild(cards);

  appendTeamPanTables(content, payload.players);

  // ===== GAME VIDEOS =====
const videoKey = `${payload.season}_${payload.game}`;
const videos = GAME_VIDEOS[videoKey];

if (videos) {
  content.appendChild(el("div", { style: "margin-top:24px" }, [
    el("h3", {}, ["Game Footage"]),
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

  const titleMap = { averages:"Player Averages", totals:"Player Totals", highs:"Career Highs" };
  content.appendChild(el("h2", {}, [titleMap[kind] || kind]));

  let path;
  if(state.allTime){
    path = `data/aggregates/${kind}_all.json`;
  } else {
    path = `data/aggregates/${kind}_by_season_${state.season}.json`;
  }
  const rows = await loadJSON(path);

  appendTeamPanTables(content, rows);
}

async function renderType(){
  const content = document.getElementById("content");
  content.innerHTML = "";

  content.appendChild(el("h2", {}, [`Stats By Game Type (${state.gameType})`]));
  const rows = await loadJSON(`data/aggregates/by_type_${state.gameType}.json`);
  appendTeamPanTables(content, rows);
}

async function renderVs(){
  const content = document.getElementById("content");
  content.innerHTML = "";

  const teams = state.index.seasonTeams[state.season] || [];
  const name = teams.find(t => slugify(t) === state.vsOpponentSlug) || state.vsOpponentSlug;
  content.appendChild(el("h2", {}, [`Averages vs ${String(name).toLowerCase()} (season ${state.season})`]));

  const payload = await loadJSON(`data/vs/vs_${state.season}_${state.vsOpponentSlug}.json`);
  const rows = payload.rows || [];
  appendTeamPanTables(content, rows);
}

async function refresh(){
  setActiveTab();
  renderControls();
  if(state.page === "game") return renderGame();
  if(state.page === "avg") return renderAggregate("averages");
  if(state.page === "tot") return renderAggregate("totals");
  if(state.page === "highs") return renderAggregate("highs");
  if(state.page === "type") return renderType();
  if(state.page === "vs") return renderVs();
}

async function init(){
  state.index = await loadJSON("data/index.json");

  document.querySelectorAll("#tabs button").forEach(b=>{
    b.addEventListener("click", ()=>{
      state.page = b.dataset.page;
      refresh();
    });
  });

  state.season = state.index.seasons[0];
  state.game = (state.index.seasonGames[state.season] || [])[0];
  refresh();
}

init();
