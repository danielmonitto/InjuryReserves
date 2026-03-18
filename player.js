const state = {
  index: null,
  player: null,
};

async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`failed to load ${path}`);
  return res.json();
}

function slugify(s){
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'') || 'player';
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
  kids.filter(c => c !== null && c !== undefined).forEach(c => {
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return n;
}

function getPlayerFromQuery() {
  const q = new URLSearchParams(window.location.search);
  return q.get("player") || q.get("name");
}

function setPlayerInQuery(slug) {
  const q = new URLSearchParams(window.location.search);
  q.set("player", slug);
  history.replaceState({}, "", `${window.location.pathname}?${q.toString()}`);
}

function renderProfile(profile) {
  const wrap = document.getElementById("profile");
  wrap.innerHTML = "";

  if (!profile) {
    wrap.appendChild(el("div", { class:"note" }, ["no player selected or data missing"]));
    return;
  }

  const initials = profile.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const initialsEl = el("span", { class:"profile-initials" }, [initials]);
  const avatar = el("div", { class:"profile-avatar", style:`background:${profile.rowColor || "#A6C9EC"};` }, [initialsEl]);
  const photoSlug = slugify(profile.name);
  const photo = el("img", {
    class:"profile-photo",
    src:`static/photos/${photoSlug}.jpg`,
    alt:`${profile.name} photo`,
    onload: () => { initialsEl.style.display = "none"; },
    onerror: () => { photo.remove(); }
  });
  avatar.insertBefore(photo, initialsEl);

  const header = el("div", { class:"profile-header" }, [
    avatar,
    el("div", { class:"profile-meta" }, [
      el("h2", {}, [profile.name]),
      el("div", { class:"profile-sub" }, [
        profile.position ? `${profile.position}` : "position n/a",
        profile.height ? ` • ${profile.height}` : ""
      ].join(""))
    ])
  ]);

  wrap.appendChild(header);

  const statBlocks = el("div", { class:"profile-stats" }, []);
  const addBlock = (title, rows) => {
    if (!rows || !rows.length) return;
    const r = rows[0];
    const keys = ["PTS","REB","AST","GSC","STL","BLK","TOV","FG%","3P%","FT%","TS%","GP"];
    const items = keys.filter(k => k in r).map(k => {
      const dispKey = `${k}_display`;
      const val = r[dispKey] !== undefined ? r[dispKey] : r[k];
      return el("div", { class:"stat-pill" }, [
        el("div", { class:"stat-key" }, [k.toLowerCase()]),
        el("div", { class:"stat-val" }, [String(val ?? "")])
      ]);
    });

    statBlocks.appendChild(el("div", { class:"profile-block" }, [
      el("h3", {}, [title]),
      el("div", { class:"stat-grid" }, items)
    ]));
  };

  addBlock("Career Averages", profile.averages);
  addBlock("Career Totals", profile.totals);
  addBlock("Career Highs", profile.highs);

  wrap.appendChild(statBlocks);

  const best = profile.bestGames || [];
  const bestTable = el("div", { class:"table-wrap" }, [
    el("table", {}, [
      el("thead", {}, [el("tr", {}, [
        el("th", {}, ["season"]),
        el("th", {}, ["game"]),
        el("th", {}, ["opponent"]),
        el("th", {}, ["type"]),
        el("th", {}, ["gsc"]),
        el("th", {}, ["pts"]),
        el("th", {}, ["reb"]),
        el("th", {}, ["ast"]),
        el("th", {}, ["stl"]),
        el("th", {}, ["blk"]),
        el("th", {}, ["ts%"]),
      ])]),
      el("tbody", {}, best.map(r => {
        const gsc = r.GSC_display ?? r.GSC;
        const link = `index.html?page=game&season=${r.SEASON}&game=${r.GAME}`;
        return el("tr", {}, [
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r.SEASON ?? "")]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [
            el("a", { class:"player-link", href: link }, [String(r.GAME ?? "")])
          ]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r.OPP ?? "").toLowerCase()]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r.TYPE ?? "")]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(gsc ?? "")]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r.PTS_display ?? r.PTS ?? "")]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r.REB_display ?? r.REB ?? "")]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r.AST_display ?? r.AST ?? "")]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r.STL_display ?? r.STL ?? "")]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r.BLK_display ?? r.BLK ?? "")]),
          el("td", { style:`background:${profile.rowColor || "#A6C9EC"};` }, [String(r["TS%_display"] ?? r["TS%"] ?? "")]),
        ]);
      }))
    ])
  ]);

  wrap.appendChild(el("h3", {}, ["Best Games"]));
  if (best.length) {
    wrap.appendChild(bestTable);
  } else {
    wrap.appendChild(el("div", { class:"note" }, ["no games found"]));
  }
}

async function init(){
  state.index = await loadJSON("data/players/index.json");
  const sel = document.getElementById("player-select");

  const players = state.index.players || [];
  players.forEach(p => {
    const opt = el("option", { value: p.slug }, [p.name]);
    sel.appendChild(opt);
  });

  const initial = getPlayerFromQuery();
  const match = players.find(p => p.slug === initial) || players[0];
  if (!match) {
    renderProfile(null);
    return;
  }

  sel.value = match.slug;
  setPlayerInQuery(match.slug);
  state.player = match.slug;
  sel.addEventListener("change", async (e) => {
    state.player = e.target.value;
    setPlayerInQuery(state.player);
    const profile = await loadJSON(`data/players/${state.player}.json`);
    renderProfile(profile);
  });

  const profile = await loadJSON(`data/players/${state.player}.json`);
  renderProfile(profile);
}

init();
