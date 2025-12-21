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

function buildTable(rows, preferDisplay=true){
  if(!rows || rows.length === 0) return el("div", { class:"note" }, ["no data"]);

  const keys = Object.keys(rows[0]).filter(k => k !== "rowColor" && !k.endsWith("_display"));
  const columns = keys;

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
    // prefer *_display when present
    const dispKey = `${k}_display`;
    if (preferDisplay && r[dispKey] !== undefined && r[dispKey] !== null && String(r[dispKey]).trim() !== "") {
      return r[dispKey];
    }

    // percent columns like FG%, TS%, 2P%, 3P%, FT%
    if (k.includes("%")) {
      const n = toNumber(r[k]);
      if (n === null) return r[k];

      // if stored as 0..1 -> show 0..100%
      if (n >= 0 && n <= 1) return `${Math.round(n * 100)}%`;

      // if stored as 0..100 -> show as %
      if (n > 1 && n <= 100) return `${Math.round(n)}%`;

      return `${n}%`;
    }

    return r[k];
  };

  const thead = el("thead", {}, [el("tr", {}, columns.map(k => el("th", {}, [k])))]);
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

  content.appendChild(el("h2", {}, [`game ${payload.game} stats (season ${payload.season})`]));

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
  content.appendChild(el("h3", {}, ["player stats"]));

  const { team, pan } = splitTeam(payload.players);
  content.appendChild(buildTable(team, true));
  if(pan.length){
    content.appendChild(el("div", { style:"height:10px" }, []));
    content.appendChild(buildTable(pan, true));
  }
}

async function renderAggregate(kind){
  const content = document.getElementById("content");
  content.innerHTML = "";

  const titleMap = { averages:"player averages", totals:"player totals", highs:"career highs" };
  content.appendChild(el("h2", {}, [titleMap[kind] || kind]));

  let path;
  if(state.allTime){
    path = `data/aggregates/${kind}_all.json`;
  } else {
    path = `data/aggregates/${kind}_by_season_${state.season}.json`;
  }
  const rows = await loadJSON(path);

  const { team, pan } = splitTeam(rows);
  content.appendChild(buildTable(team, true));
  if(pan.length){
    content.appendChild(el("div", { style:"height:10px" }, []));
    content.appendChild(buildTable(pan, true));
  }
}

async function renderType(){
  const content = document.getElementById("content");
  content.innerHTML = "";

  content.appendChild(el("h2", {}, [`stats by game type (${state.gameType})`]));
  const rows = await loadJSON(`data/aggregates/by_type_${state.gameType}.json`);
  const { team, pan } = splitTeam(rows);
  content.appendChild(buildTable(team, true));
  if(pan.length){
    content.appendChild(el("div", { style:"height:10px" }, []));
    content.appendChild(buildTable(pan, true));
  }
}

async function renderVs(){
  const content = document.getElementById("content");
  content.innerHTML = "";

  const teams = state.index.seasonTeams[state.season] || [];
  const name = teams.find(t => slugify(t) === state.vsOpponentSlug) || state.vsOpponentSlug;
  content.appendChild(el("h2", {}, [`averages vs ${String(name).toLowerCase()} (season ${state.season})`]));

  const payload = await loadJSON(`data/vs/vs_${state.season}_${state.vsOpponentSlug}.json`);
  const rows = payload.rows || [];
  const { team, pan } = splitTeam(rows);
  content.appendChild(buildTable(team, true));
  if(pan.length){
    content.appendChild(el("div", { style:"height:10px" }, []));
    content.appendChild(buildTable(pan, true));
  }
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
