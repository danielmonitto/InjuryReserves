(function () {
  const API = "http://127.0.0.1:5001";
  const CORE_SEVEN = [
    "Daniel Monitto",
    "Lachlan Farley",
    "James Norrish",
    "Vince Tomasello",
    "Austin Thorneycroft",
    "Brooklyn Bulmer",
    "Aidan Zivkovic",
  ];
  const DEFAULT_OPP_COLOR = "#4B5563";
  const DEFAULT_OPP_STRIPE_1 = "#ffffff";
  const DEFAULT_OPP_STRIPE_2 = "#9CA3AF";
  const PERIOD_SECONDS = 40 * 60;
  const PLAYER_COLORS = {
    "Brooklyn Bulmer": "#5f99f5",
    "Daniel Monitto": "#ebc026",
    "Lachlan Farley": "#59dea2",
    "James Norrish": "#fc9219",
    "Vince Tomasello": "#63b010",
    "Austin Thorneycroft": "#8858e8",
    "Aidan Zivkovic": "#d651b3",
    "Hayden Cromberge": "#e36868",
    "Joel Kingdom-Evans": "#99FF66",
    "Adrian Monitto": "#be60f7",
    "Jack Groves": "#FF99CC",
    "Zack Johnston": "#5364b0",
  };

  const state = {
    bootstrap: null,
    roster: [],
    selectedPlayer: null,
    prompt: null,
    events: [],
    tracker: {
      clockSec: PERIOD_SECONDS,
      running: false,
      intervalId: null,
      lineup: new Set(),
      lineupOrder: [],
      byPlayer: {},
    },
    meta: {
      season: 1,
      game: 1,
      opp: "",
      type: "REG",
      period: "1ST",
      oppColor: DEFAULT_OPP_COLOR,
      oppStripe1: DEFAULT_OPP_STRIPE_1,
      oppStripe2: DEFAULT_OPP_STRIPE_2,
      oppScore: 0,
    },
    undo: [],
    popupState: {
      seen: {},
      cooldowns: {},
      prevTeamScore: null,
      prevOppScore: null,
      teamRunPts: 0,
      oppRunPts: 0,
      lastTeamRunShown: 0,
      lastOppRunShown: 0,
    },
  };

  const els = {};

  const SCORING_ACTIONS = [
    { code: "2PM", title: "Made 2", subtitle: "asks for assist" },
    { code: "3PM", title: "Made 3", subtitle: "asks for assist" },
    { code: "FTM", title: "Made FT", subtitle: "free throw make" },
    { code: "2PA", title: "Missed 2", subtitle: "field goal miss" },
    { code: "3PA", title: "Missed 3", subtitle: "three miss" },
    { code: "FTA", title: "Missed FT", subtitle: "free throw miss" },
  ];

  const OTHER_ACTIONS = [
    { code: "OREB", title: "Off Reb", subtitle: "offensive board" },
    { code: "DREB", title: "Def Reb", subtitle: "defensive board" },
    { code: "STL", title: "Steal", subtitle: "takeaway" },
    { code: "BLK", title: "Block", subtitle: "shot block" },
    { code: "TOV", title: "Turnover", subtitle: "lost ball" },
    { code: "FLS", title: "Foul", subtitle: "personal foul" },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  function initials(name) {
    return String(name || "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function clampInt(value) {
    return Math.max(0, parseInt(value || 0, 10) || 0);
  }

  function playerPopupColor(name) {
    return getBio(name)?.color || PLAYER_COLORS[name] || "#DB2E2E";
  }

  function hexToRgb(hex) {
    const clean = String(hex || "").replace("#", "").trim();
    if (clean.length !== 6) return { r: 166, g: 201, b: 236 };
    const value = parseInt(clean, 16);
    if (Number.isNaN(value)) return { r: 166, g: 201, b: 236 };
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  }

  function pct(makes, attempts) {
    return attempts ? makes / attempts : 0;
  }

  function formatPct(value) {
    return `${((Number(value) || 0) * 100).toFixed(1)}%`;
  }

  function formatTime(totalSeconds) {
    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function parseClock(value) {
    const match = String(value || "").trim().match(/^(\d+):([0-5]\d)$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function getBio(name) {
    return (state.bootstrap?.bios || []).find((bio) => bio.name === name) || null;
  }

  function ensureTrackerPlayer(name) {
    if (!state.tracker.byPlayer[name]) {
      state.tracker.byPlayer[name] = {
        seconds: 0,
        plusMinus: 0,
        lastIn: null,
      };
    }
    return state.tracker.byPlayer[name];
  }

  function getTrackedSeconds(name) {
    const tracked = ensureTrackerPlayer(name);
    if (state.tracker.lineup.has(name) && tracked.lastIn !== null) {
      return tracked.seconds + (tracked.lastIn - state.tracker.clockSec);
    }
    return tracked.seconds;
  }

  function snapshot() {
    return {
      roster: [...state.roster],
      selectedPlayer: state.selectedPlayer,
      prompt: state.prompt ? JSON.parse(JSON.stringify(state.prompt)) : null,
      events: JSON.parse(JSON.stringify(state.events)),
      tracker: {
        clockSec: state.tracker.clockSec,
        lineup: Array.from(state.tracker.lineup),
        lineupOrder: [...state.tracker.lineupOrder],
        byPlayer: JSON.parse(JSON.stringify(state.tracker.byPlayer)),
      },
      meta: JSON.parse(JSON.stringify(state.meta)),
      popupState: JSON.parse(JSON.stringify(state.popupState)),
    };
  }

  function restoreSnapshot(snap) {
    if (!snap) return;
    stopClock();
    state.roster = snap.roster;
    state.selectedPlayer = snap.selectedPlayer;
    state.prompt = snap.prompt;
    state.events = snap.events;
    state.tracker.clockSec = snap.tracker.clockSec;
    state.tracker.lineup = new Set(snap.tracker.lineup);
    state.tracker.lineupOrder = snap.tracker.lineupOrder || Array.from(snap.tracker.lineup);
    state.tracker.byPlayer = snap.tracker.byPlayer;
    state.meta = snap.meta;
    state.popupState = snap.popupState || { seen: {}, cooldowns: {} };
    syncMetaInputs();
    render();
    pushLiveState();
  }

  function pushUndo(label) {
    state.undo.push({ label, snap: snapshot() });
    if (state.undo.length > 200) state.undo.shift();
    els.undoBtn.disabled = state.undo.length === 0;
  }

  function setStatus(text, isError) {
    els.saveStatus.textContent = text;
    els.saveStatus.style.color = isError ? "#8b1e22" : "";
  }

  function syncMetaInputs() {
    els.seasonInput.value = state.meta.season;
    els.gameInput.value = state.meta.game;
    els.oppInput.value = state.meta.opp;
    els.typeInput.value = state.meta.type;
    els.periodInput.value = state.meta.period;
    els.oppColorInput.value = state.meta.oppColor;
    els.oppStripe1Input.value = state.meta.oppStripe1;
    els.oppStripe2Input.value = state.meta.oppStripe2;
    els.clockInput.value = formatTime(state.tracker.clockSec);
  }

  function aggregateStats() {
    const stats = Object.fromEntries(state.roster.map((name) => [name, {
      NAMES: name,
      "2PM": 0, "2PA": 0, "3PM": 0, "3PA": 0,
      FTM: 0, FTA: 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TOV: 0, FLS: 0,
      FGM: 0, FGA: 0, REB: 0, PTS: 0, "2P%": 0, "3P%": 0, "FT%": 0, "FG%": 0, "TS%": 0, GSC: 0,
    }]));

    state.events.forEach((event) => {
      if (event.kind === "player" && stats[event.player]) {
        if (event.code in stats[event.player]) stats[event.player][event.code] += 1;
        if (event.code === "2PM") stats[event.player]["2PA"] += 1;
        if (event.code === "3PM") stats[event.player]["3PA"] += 1;
        if (event.code === "FTM") stats[event.player].FTA += 1;
      }
      if (event.kind === "assist" && stats[event.player]) {
        stats[event.player].AST += 1;
      }
    });

    Object.values(stats).forEach((player) => {
      player.FGM = player["2PM"] + player["3PM"];
      player.FGA = player["2PA"] + player["3PA"];
      player.REB = player.OREB + player.DREB;
      player.PTS = 2 * player["2PM"] + 3 * player["3PM"] + player.FTM;
      player["2P%"] = pct(player["2PM"], player["2PA"]);
      player["3P%"] = pct(player["3PM"], player["3PA"]);
      player["FT%"] = pct(player.FTM, player.FTA);
      player["FG%"] = pct(player.FGM, player.FGA);
      const denominator = 2 * (player.FGA + 0.44 * player.FTA);
      player["TS%"] = denominator ? player.PTS / denominator : 0;
      player.GSC = player.PTS
        + 0.4 * player.FGM
        - 0.7 * player.FGA
        - 0.4 * (player.FTA - player.FTM)
        + 0.7 * player.OREB
        + 0.3 * player.DREB
        + player.STL
        + 0.7 * player.AST
        + 0.7 * player.BLK
        - 0.4 * player.FLS
        - player.TOV;
    });

    return stats;
  }

  function teamScore(statsMap) {
    return Object.values(statsMap || aggregateStats()).reduce((sum, player) => sum + (player.PTS || 0), 0);
  }

  function addRosterPlayer(name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    if (state.roster.some((row) => row.toLowerCase() === clean.toLowerCase())) {
      setStatus("player already added", true);
      return;
    }
    pushUndo(`add ${clean}`);
    state.roster.push(clean);
    ensureTrackerPlayer(clean);
    if (!state.selectedPlayer) state.selectedPlayer = clean;
    render();
    pushLiveState();
  }

  function removeRosterPlayer(name) {
    pushUndo(`remove ${name}`);
    state.roster = state.roster.filter((row) => row !== name);
    state.events = state.events.filter((event) => event.player !== name && event.toPlayer !== name);
    state.tracker.lineup.delete(name);
    delete state.tracker.byPlayer[name];
    if (state.selectedPlayer === name) state.selectedPlayer = state.roster[0] || null;
    state.prompt = null;
    render();
    pushLiveState();
  }

  function subIn(name) {
    ensureTrackerPlayer(name);
    if (state.tracker.lineup.has(name)) return;
    if (state.tracker.lineup.size >= 5) {
      setStatus("lineup max is 5", true);
      return;
    }
    pushUndo(`sub in ${name}`);
    performSubIn(name, { log: true, popup: true });
    render();
    pushLiveState();
  }

  function subOut(name) {
    if (!state.tracker.lineup.has(name)) return;
    if (state.tracker.lineup.size >= 5) {
      state.prompt = {
        type: "sub",
        outgoing: name,
      };
      renderPrompt();
      return;
    }
    pushUndo(`sub out ${name}`);
    performSubOut(name, { log: true, popup: true });
    render();
    pushLiveState();
  }

  function applyTeamPlusMinus(points) {
    state.tracker.lineup.forEach((name) => {
      ensureTrackerPlayer(name).plusMinus += points;
    });
  }

  function applyOppPlusMinus(points) {
    state.tracker.lineup.forEach((name) => {
      ensureTrackerPlayer(name).plusMinus -= points;
    });
  }

  function actionByCode(code) {
    return [...SCORING_ACTIONS, ...OTHER_ACTIONS].find((action) => action.code === code) || null;
  }

  function eventLabel(event) {
    if (event.kind === "opp") return `Opponent +${event.points}`;
    if (event.kind === "assist") return `${event.player} AST on ${event.toPlayer}'s ${event.shot}`;
    if (event.kind === "sub" && event.action === "IN FOR") return `${event.player} IN FOR ${event.otherPlayer}`;
    if (event.kind === "sub") return `${event.player} ${event.action}`;
    const action = actionByCode(event.code);
    return `${event.player} ${action ? action.title : event.code}`;
  }

  function logSubEvent(player, action, otherPlayer) {
    state.events.unshift({
      kind: "sub",
      player,
      action,
      otherPlayer: otherPlayer || null,
      period: state.meta.period,
      clock: formatTime(state.tracker.clockSec),
    });
  }

  function performSubIn(name, options = {}) {
    const tracked = ensureTrackerPlayer(name);
    if (state.tracker.lineup.has(name)) return;
    state.tracker.lineup.add(name);
    if (options.replaceOutgoing) {
      const idx = state.tracker.lineupOrder.indexOf(options.replaceOutgoing);
      if (idx >= 0) state.tracker.lineupOrder[idx] = name;
      else state.tracker.lineupOrder.push(name);
    } else {
      state.tracker.lineupOrder.push(name);
    }
    tracked.lastIn = state.tracker.clockSec;
    if (options.log) logSubEvent(name, options.action || "SUBBED IN", options.otherPlayer);
    if (options.popup) {
      const line = options.otherPlayer ? `IN FOR ${options.otherPlayer}` : "SUBBED IN";
      postOverlayEvent(name, line, playerPopupColor(name));
    }
  }

  function performSubOut(name, options = {}) {
    if (!state.tracker.lineup.has(name)) return;
    const tracked = ensureTrackerPlayer(name);
    if (tracked.lastIn !== null) tracked.seconds += tracked.lastIn - state.tracker.clockSec;
    tracked.lastIn = null;
    state.tracker.lineup.delete(name);
    if (!options.keepSlot) {
      state.tracker.lineupOrder = state.tracker.lineupOrder.filter((player) => player !== name);
    }
    if (options.log) logSubEvent(name, options.action || "SUBBED OUT", options.otherPlayer);
    if (options.popup) postOverlayEvent(name, "SUBBED OUT", playerPopupColor(name));
  }

  function commitPlayerEvent(player, code, extras = {}) {
    const action = actionByCode(code);
    if (!action) return;
    state.events.unshift({
      kind: "player",
      player,
      code,
      period: state.meta.period,
      clock: formatTime(state.tracker.clockSec),
      ...extras,
    });
    if (code === "2PM") applyTeamPlusMinus(2);
    if (code === "3PM") applyTeamPlusMinus(3);
    if (code === "FTM") applyTeamPlusMinus(1);
  }

  function postOverlayEvent(title, line, color) {
    fetch(`${API}/api/overlay_event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        line,
        color,
        ttlMs: 2200,
      }),
    }).catch(() => {});
  }

  function popupKey(name, key) {
    return `${name}::${key}`;
  }

  function canFirePopup(name, key, cooldownMs) {
    const fullKey = popupKey(name, key);
    const now = Date.now();
    const last = Number(state.popupState.cooldowns[fullKey] || 0);
    if (cooldownMs && now - last < cooldownMs) return false;
    state.popupState.cooldowns[fullKey] = now;
    return true;
  }

  function fireThresholdPopupOnce(name, key, line, color, cooldownMs = 0) {
    const fullKey = popupKey(name, key);
    if (state.popupState.seen[fullKey]) return;
    if (!canFirePopup(name, key, cooldownMs)) return;
    state.popupState.seen[fullKey] = true;
    postOverlayEvent(name, line, color);
  }

  function checkRunPopups(teamNow, oppNow) {
    const pop = state.popupState;

    if (pop.prevTeamScore === null || pop.prevOppScore === null) {
      pop.prevTeamScore = teamNow;
      pop.prevOppScore = oppNow;
      pop.teamRunPts = 0;
      pop.oppRunPts = 0;
      return;
    }

    if (oppNow !== pop.prevOppScore) {
      pop.teamRunPts = 0;
    }
    const teamInc = teamNow - pop.prevTeamScore;
    if (oppNow === pop.prevOppScore && teamInc > 0) {
      pop.teamRunPts += teamInc;
    }

    if (teamNow !== pop.prevTeamScore) {
      pop.oppRunPts = 0;
    }
    const oppInc = oppNow - pop.prevOppScore;
    if (teamNow === pop.prevTeamScore && oppInc > 0) {
      pop.oppRunPts += oppInc;
    }

    pop.prevTeamScore = teamNow;
    pop.prevOppScore = oppNow;

    if (pop.teamRunPts >= 6 && pop.teamRunPts !== pop.lastTeamRunShown) {
      pop.lastTeamRunShown = pop.teamRunPts;
      postOverlayEvent("INJ", `${pop.teamRunPts}-0 RUN`, "#DB2E2E");
    }

    if (pop.oppRunPts >= 6 && pop.oppRunPts !== pop.lastOppRunShown) {
      pop.lastOppRunShown = pop.oppRunPts;
      postOverlayEvent(state.meta.opp || "OPP", `${pop.oppRunPts}-0 RUN`, state.meta.oppColor || DEFAULT_OPP_COLOR);
    }
  }

  function maybeFirePlayerMilestones(name) {
    const stats = aggregateStats()[name];
    if (!stats) return;
    const color = playerPopupColor(name);

    [5, 10, 15, 20, 25, 30, 35, 40].forEach((pts) => {
      if ((stats.PTS || 0) >= pts) {
        fireThresholdPopupOnce(name, `PTS_${pts}`, `UP TO ${pts} PTS`, color, 1000);
      }
    });

    [5, 10, 15].forEach((reb) => {
      if ((stats.REB || 0) >= reb) {
        fireThresholdPopupOnce(name, `REB_${reb}`, `UP TO ${reb} REB`, color, 1000);
      }
    });

    [5, 10, 15].forEach((ast) => {
      if ((stats.AST || 0) >= ast) {
        fireThresholdPopupOnce(name, `AST_${ast}`, `UP TO ${ast} AST`, color, 1000);
      }
    });

    [2, 4, 6].forEach((stl) => {
      if ((stats.STL || 0) >= stl) {
        fireThresholdPopupOnce(name, `STL_${stl}`, `UP TO ${stl} STL`, color, 1000);
      }
    });

    [2, 4, 6].forEach((blk) => {
      if ((stats.BLK || 0) >= blk) {
        fireThresholdPopupOnce(name, `BLK_${blk}`, `UP TO ${blk} BLK`, color, 1000);
      }
    });

    [3, 4, 5].forEach((fls) => {
      if ((stats.FLS || 0) >= fls) {
        const line = fls === 5 ? "5 FOULS FOULED OUT" : `${fls} FOULS`;
        fireThresholdPopupOnce(name, `FLS_${fls}`, line, color, 1000);
      }
    });

    const doubleStats = [
      ["PTS", stats.PTS || 0],
      ["REB", stats.REB || 0],
      ["AST", stats.AST || 0],
      ["STL", stats.STL || 0],
      ["BLK", stats.BLK || 0],
    ].filter(([, value]) => value >= 10);

    const count = doubleStats.length;
    const line = doubleStats.map(([k, v]) => `${v} ${k}`).join(" ");
    if (count >= 2) fireThresholdPopupOnce(name, "DD", `DOUBLE-DOUBLE: ${line}`, color, 1000);
    if (count >= 3) fireThresholdPopupOnce(name, "TD", `TRIPLE-DOUBLE: ${line}`, color, 1000);
    if (count >= 4) fireThresholdPopupOnce(name, "QD", `QUADRUPLE-DOUBLE: ${line}`, color, 1000);
  }

  function commitAssistEvent(assistedBy, scorer, shot) {
    state.events.unshift({
      kind: "assist",
      player: assistedBy,
      toPlayer: scorer,
      shot,
      period: state.meta.period,
      clock: formatTime(state.tracker.clockSec),
    });
  }

  function handlePlayerAction(code) {
    if (!state.selectedPlayer) {
      setStatus("select a player first", true);
      return;
    }

    if (code === "2PM" || code === "3PM") {
      const shotLabel = code === "2PM" ? "2PM" : "3PM";
      state.prompt = {
        type: "assist",
        scorer: state.selectedPlayer,
        shot: shotLabel,
      };
      renderPrompt();
      return;
    }

    pushUndo(`${state.selectedPlayer} ${code}`);
    commitPlayerEvent(state.selectedPlayer, code);
    if (code === "FTM") {
      postOverlayEvent(state.selectedPlayer, "FREE THROW", playerPopupColor(state.selectedPlayer));
    }
    maybeFirePlayerMilestones(state.selectedPlayer);
    render();
    pushLiveState();
  }

  function commitMadeBasketWithAssist(assistedBy) {
    if (!state.prompt || state.prompt.type !== "assist") return;
    pushUndo(`${state.prompt.scorer} ${state.prompt.shot}`);
    commitPlayerEvent(state.prompt.scorer, state.prompt.shot);
    if (assistedBy) commitAssistEvent(assistedBy, state.prompt.scorer, state.prompt.shot);
    postOverlayEvent(
      state.prompt.scorer,
      `${state.prompt.shot === "2PM" ? "2 PTS" : "3 PTS"}${assistedBy ? ` AST ${assistedBy}` : ""}`,
      playerPopupColor(state.prompt.scorer)
    );
    maybeFirePlayerMilestones(state.prompt.scorer);
    if (assistedBy) maybeFirePlayerMilestones(assistedBy);
    state.prompt = null;
    render();
    pushLiveState();
  }

  function commitSubstitution(incoming) {
    if (!state.prompt || state.prompt.type !== "sub") return;
    const outgoing = state.prompt.outgoing;
    pushUndo(incoming ? `${incoming} for ${outgoing}` : `${outgoing} out`);
    performSubOut(outgoing, { log: false, popup: false, keepSlot: Boolean(incoming) });
    if (incoming) {
      performSubIn(incoming, {
        log: true,
        popup: true,
        action: "IN FOR",
        otherPlayer: outgoing,
        replaceOutgoing: outgoing,
      });
    } else {
      logSubEvent(outgoing, "SUBBED OUT");
      postOverlayEvent(outgoing, "SUBBED OUT", playerPopupColor(outgoing));
    }
    state.prompt = null;
    render();
    pushLiveState();
  }

  function addOpponentScore(points) {
    pushUndo(`opp +${points}`);
    state.meta.oppScore = clampInt(state.meta.oppScore) + points;
    state.events.unshift({
      kind: "opp",
      points,
      period: state.meta.period,
      clock: formatTime(state.tracker.clockSec),
    });
    applyOppPlusMinus(points);
    const line = points === 1 ? "FREE THROW" : points === 2 ? "FIELD GOAL" : "THREE BALL";
    postOverlayEvent(state.meta.opp || "Opponent", line, state.meta.oppColor || DEFAULT_OPP_COLOR);
    render();
    pushLiveState();
  }

  function renderPlayerStrip() {
    const statsMap = aggregateStats();
    els.playerStrip.innerHTML = "";
    const displayNames = state.tracker.lineup.size >= 5
      ? state.tracker.lineupOrder.filter((name) => state.tracker.lineup.has(name))
      : state.roster;

    displayNames.forEach((name) => {
      const chipColor = playerPopupColor(name);
      const rgb = hexToRgb(chipColor);
      const chip = document.createElement("article");
      chip.className = `player-chip${state.selectedPlayer === name ? " selected" : ""}${state.tracker.lineup.has(name) ? " on-court" : ""}`;
      chip.style.background = state.tracker.lineup.has(name)
        ? `linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03)), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.34)`
        : `linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`;
      chip.addEventListener("click", () => {
        state.selectedPlayer = name;
        render();
      });

      chip.innerHTML = `
        <div class="chip-main">
          <strong>${name}</strong>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "chip-actions";

      const rmBtn = document.createElement("button");
      rmBtn.type = "button";
      rmBtn.className = "tiny-btn del-btn";
      rmBtn.textContent = "DEL";
      rmBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        removeRosterPlayer(name);
      });

      const inBtn = document.createElement("button");
      inBtn.type = "button";
      inBtn.className = `tiny-btn in-btn${state.tracker.lineup.has(name) ? " active" : ""}`;
      inBtn.textContent = "IN";
      inBtn.disabled = state.tracker.lineup.has(name) || state.tracker.lineup.size >= 5;
      inBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        subIn(name);
      });

      const outBtn = document.createElement("button");
      outBtn.type = "button";
      outBtn.className = "tiny-btn out-btn";
      outBtn.textContent = "OUT";
      outBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        subOut(name);
      });

      actions.appendChild(rmBtn);
      actions.appendChild(inBtn);
      actions.appendChild(outBtn);
      chip.appendChild(actions);
      els.playerStrip.appendChild(chip);
    });
  }

  function renderActionButtons() {
    els.scoringActions.innerHTML = "";
    els.otherActions.innerHTML = "";

    SCORING_ACTIONS.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn event-btn";
      button.innerHTML = `<strong>${action.title}</strong><span>${action.subtitle}</span>`;
      button.addEventListener("click", () => handlePlayerAction(action.code));
      els.scoringActions.appendChild(button);
    });

    OTHER_ACTIONS.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn event-btn";
      button.innerHTML = `<strong>${action.title}</strong><span>${action.subtitle}</span>`;
      button.addEventListener("click", () => handlePlayerAction(action.code));
      els.otherActions.appendChild(button);
    });
  }

  function renderPrompt() {
    if (!state.prompt) {
      els.promptOverlay.hidden = true;
      els.promptChoices.innerHTML = "";
      return;
    }

    els.promptOverlay.hidden = false;
    els.promptChoices.innerHTML = "";

    if (state.prompt.type === "assist") {
      els.promptTitle.textContent = "Who assisted?";
      els.promptBody.textContent = `${state.prompt.scorer} made the ${state.prompt.shot === "2PM" ? "two" : "three"}. Select the assister or choose no assist.`;

      const noAssist = document.createElement("button");
      noAssist.type = "button";
      noAssist.className = "btn btn-primary";
      noAssist.textContent = "No Assist";
      noAssist.addEventListener("click", () => commitMadeBasketWithAssist(null));
      els.promptChoices.appendChild(noAssist);

      Array.from(state.tracker.lineup)
        .filter((name) => name !== state.prompt.scorer)
        .forEach((name) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "btn btn-ghost";
          button.textContent = name;
          button.addEventListener("click", () => commitMadeBasketWithAssist(name));
          els.promptChoices.appendChild(button);
        });
    }

    if (state.prompt.type === "sub") {
      els.promptTitle.textContent = "Who comes in?";
      els.promptBody.textContent = `${state.prompt.outgoing} is coming out. Choose the replacement, or no player if you're playing short.`;

      const noPlayer = document.createElement("button");
      noPlayer.type = "button";
      noPlayer.className = "btn btn-primary";
      noPlayer.textContent = "No Player";
      noPlayer.addEventListener("click", () => commitSubstitution(null));
      els.promptChoices.appendChild(noPlayer);

      state.roster
        .filter((name) => name !== state.prompt.outgoing && !state.tracker.lineup.has(name))
        .forEach((name) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "btn btn-ghost";
          button.textContent = name;
          button.addEventListener("click", () => commitSubstitution(name));
          els.promptChoices.appendChild(button);
        });
    }
  }

  function renderSelectedPlayerSummary() {
    const statsMap = aggregateStats();
    const selected = state.selectedPlayer ? statsMap[state.selectedPlayer] : null;
    const bio = state.selectedPlayer ? getBio(state.selectedPlayer) : null;
    if (!selected) {
      els.selectedPlayerName.textContent = "No player selected";
      els.selectedPlayerMeta.textContent = "Select a player above";
      return;
    }
    const tracked = ensureTrackerPlayer(state.selectedPlayer);
    els.selectedPlayerName.textContent = state.selectedPlayer;
    els.selectedPlayerMeta.textContent = `${bio?.position || "-"}${bio?.height ? ` • ${bio.height}` : ""} • ${selected.PTS} pts • ${selected.REB} reb • ${selected.AST} ast • ${formatPct(selected["TS%"])} TS • ${formatTime(getTrackedSeconds(state.selectedPlayer))} • ${tracked.plusMinus >= 0 ? "+" : ""}${tracked.plusMinus}`;
  }

  function renderLiveBox() {
    const statsMap = aggregateStats();
    els.liveBox.innerHTML = "";
    state.roster.forEach((name) => {
      const stats = statsMap[name];
      const tracked = ensureTrackerPlayer(name);
      const row = document.createElement("article");
      row.className = "live-row";
      row.innerHTML = `
        <div class="live-row-head">
          <strong>${name}</strong>
          <span>${state.tracker.lineup.has(name) ? "ON" : "OFF"} • ${formatTime(getTrackedSeconds(name))} • ${tracked.plusMinus >= 0 ? "+" : ""}${tracked.plusMinus}</span>
        </div>
        <div class="live-metrics">
          <div class="metric"><span>PTS</span><strong>${stats.PTS}</strong></div>
          <div class="metric"><span>REB</span><strong>${stats.REB}</strong></div>
          <div class="metric"><span>AST</span><strong>${stats.AST}</strong></div>
          <div class="metric"><span>FG</span><strong>${stats.FGM}/${stats.FGA}</strong></div>
          <div class="metric"><span>TS%</span><strong>${formatPct(stats["TS%"])}</strong></div>
        </div>
      `;
      els.liveBox.appendChild(row);
    });
  }

  function renderEventLog() {
    els.eventLog.innerHTML = "";
    if (!state.events.length) {
      const row = document.createElement("article");
      row.className = "event-row";
      row.innerHTML = "<strong>No events yet</strong><span>Record actions from the console.</span>";
      els.eventLog.appendChild(row);
      return;
    }

    state.events.slice(0, 5).forEach((event) => {
      const row = document.createElement("article");
      row.className = "event-row";
      row.innerHTML = `<strong>${eventLabel(event)}</strong><span>${event.period} • ${event.clock}</span>`;
      els.eventLog.appendChild(row);
    });
  }

  function renderSummaries() {
    const statsMap = aggregateStats();
    els.teamScoreSummary.textContent = String(teamScore(statsMap));
    els.oppScoreSummary.textContent = String(state.meta.oppScore);
    els.clockSummary.textContent = formatTime(state.tracker.clockSec);
    els.lineupCount.textContent = String(state.tracker.lineup.size);
    els.playerCountSummary.textContent = `${state.roster.length} players`;
  }

  function render() {
    renderSummaries();
    renderPlayerStrip();
    renderSelectedPlayerSummary();
    renderActionButtons();
    renderPrompt();
    renderLiveBox();
    renderEventLog();
  }

  function buildPayloadPlayers() {
    const statsMap = aggregateStats();
    return state.roster.map((name) => {
      const stats = { ...statsMap[name] };
      const tracked = ensureTrackerPlayer(name);
      return {
        ...stats,
        minutes: getTrackedSeconds(name),
        plusMinus: tracked.plusMinus || 0,
      };
    });
  }

  function buildTeamTotals(players) {
    const totals = {
      "2PM": 0, "2PA": 0, "3PM": 0, "3PA": 0,
      FTM: 0, FTA: 0, OREB: 0, DREB: 0, AST: 0, STL: 0, BLK: 0, TOV: 0, FLS: 0,
      FGM: 0, FGA: 0, REB: 0, PTS: 0, "FG%": 0, "3P%": 0, "FT%": 0, "TS%": 0, GSC: 0,
    };
    players.forEach((player) => {
      Object.keys(totals).forEach((key) => {
        if (key in player) totals[key] += Number(player[key]) || 0;
      });
    });
    totals["FG%"] = pct(totals.FGM, totals.FGA);
    totals["3P%"] = pct(totals["3PM"], totals["3PA"]);
    totals["FT%"] = pct(totals.FTM, totals.FTA);
    const denominator = 2 * (totals.FGA + 0.44 * totals.FTA);
    totals["TS%"] = denominator ? totals.PTS / denominator : 0;
    return totals;
  }

  async function postJson(path, body) {
    const response = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let message = `request failed (${response.status})`;
      try {
        const payload = await response.json();
        if (payload.error) message = payload.error;
      } catch (_) {}
      throw new Error(message);
    }
    return response.json();
  }

  function pushLiveState() {
    const players = buildPayloadPlayers();
    const currentTeamScore = teamScore(aggregateStats());
    const currentOppScore = state.meta.oppScore;
    checkRunPopups(currentTeamScore, currentOppScore);
    const endgameState = {
      injColor: "#DB2E2E",
      oppColor: state.meta.oppColor || DEFAULT_OPP_COLOR,
      final: { inj: currentTeamScore, opp: currentOppScore },
      meta: { season: state.meta.season, game: state.meta.game, opp: state.meta.opp, type: state.meta.type },
      teamTotals: buildTeamTotals(players),
      players,
      playerColors: {},
    };

    fetch(`${API}/api/live_score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        home: currentTeamScore,
        away: currentOppScore,
        opp: state.meta.opp || "OPP",
        oppColor: state.meta.oppColor || DEFAULT_OPP_COLOR,
        oppStripe1: state.meta.oppStripe1 || DEFAULT_OPP_STRIPE_1,
        oppStripe2: state.meta.oppStripe2 || DEFAULT_OPP_STRIPE_2,
        period: state.meta.period || "1ST",
      }),
    }).catch(() => {});

    fetch(`${API}/api/endgame_state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: endgameState }),
    }).catch(() => {});
  }

  function startClock() {
    if (state.tracker.running) return;
    state.tracker.running = true;
    state.tracker.intervalId = window.setInterval(() => {
      if (state.tracker.clockSec <= 0) {
        stopClock();
        return;
      }
      state.tracker.clockSec -= 1;
      els.clockInput.value = formatTime(state.tracker.clockSec);
      renderSummaries();
      renderPlayerStrip();
      renderSelectedPlayerSummary();
      renderLiveBox();
      pushLiveState();
    }, 1000);
      setStatus("clock running");
  }

  function stopClock() {
    state.tracker.running = false;
    if (state.tracker.intervalId) {
      clearInterval(state.tracker.intervalId);
      state.tracker.intervalId = null;
    }
  }

  async function pushLineupState() {
    const starters = [];
    const bench = [];
    state.roster.forEach((name) => {
      const bio = getBio(name);
      const player = { name, height: bio?.height || "", photo: `/static/photos/${slugify(name)}.jpg` };
      if (state.tracker.lineup.has(name)) starters.push(player);
      else bench.push(player);
    });
    await postJson("/api/lineup_state", { state: { starters, bench } });
    setStatus("lineup pushed");
  }

  async function saveGame() {
    if (!state.meta.season || !state.meta.game || !state.meta.opp) {
      setStatus("season, game, and opponent required", true);
      return;
    }
    if (!state.roster.length) {
      setStatus("add at least one player", true);
      return;
    }
    const payload = {
      meta: {
        season: Number(state.meta.season),
        game: Number(state.meta.game),
        opp: state.meta.opp,
        type: state.meta.type,
        oppScore: Number(state.meta.oppScore),
        oppColor: state.meta.oppColor || DEFAULT_OPP_COLOR,
      },
      players: buildPayloadPlayers(),
      events: [...state.events].reverse(),
    };
    try {
      setStatus("saving...");
      const response = await postJson("/api/save_game", payload);
      setStatus(`saved ${response.inserted} rows`);
    } catch (error) {
      setStatus(String(error.message || error), true);
    }
  }

  function resetGame() {
    pushUndo("reset");
    stopClock();
    state.events = [];
    state.prompt = null;
    state.meta.oppScore = 0;
    state.meta.period = "1ST";
    state.meta.oppColor = DEFAULT_OPP_COLOR;
    state.meta.oppStripe1 = DEFAULT_OPP_STRIPE_1;
    state.meta.oppStripe2 = DEFAULT_OPP_STRIPE_2;
    state.tracker.clockSec = PERIOD_SECONDS;
    state.tracker.lineup = new Set();
    state.tracker.lineupOrder = [];
    state.tracker.byPlayer = Object.fromEntries(state.roster.map((name) => [name, { seconds: 0, plusMinus: 0, lastIn: null }]));
    state.popupState = {
      seen: {},
      cooldowns: {},
      prevTeamScore: null,
      prevOppScore: null,
      teamRunPts: 0,
      oppRunPts: 0,
      lastTeamRunShown: 0,
      lastOppRunShown: 0,
    };
    syncMetaInputs();
    render();
    pushLiveState();
    setStatus("reset");
  }

  function bindInputs() {
    els.seasonInput.addEventListener("input", () => { state.meta.season = clampInt(els.seasonInput.value); });
    els.gameInput.addEventListener("input", () => { state.meta.game = clampInt(els.gameInput.value); });
    els.oppInput.addEventListener("input", () => {
      state.meta.opp = els.oppInput.value.trim();
      const match = (state.bootstrap?.opponents || []).find((item) => item.opp.toLowerCase() === state.meta.opp.toLowerCase());
      if (match?.color) state.meta.oppColor = match.color;
      els.oppColorInput.value = state.meta.oppColor;
      pushLiveState();
    });
    els.typeInput.addEventListener("change", () => { state.meta.type = els.typeInput.value; });
    els.periodInput.addEventListener("change", () => {
      state.meta.period = els.periodInput.value;
      pushLiveState();
    });
    els.oppColorInput.addEventListener("input", () => {
      state.meta.oppColor = els.oppColorInput.value;
      pushLiveState();
    });
    els.oppStripe1Input.addEventListener("input", () => {
      state.meta.oppStripe1 = els.oppStripe1Input.value;
      pushLiveState();
    });
    els.oppStripe2Input.addEventListener("input", () => {
      state.meta.oppStripe2 = els.oppStripe2Input.value;
      pushLiveState();
    });
    els.clockInput.addEventListener("change", () => {
      const parsed = parseClock(els.clockInput.value);
      if (parsed === null) {
        els.clockInput.value = formatTime(state.tracker.clockSec);
        return;
      }
      pushUndo("set clock");
      state.tracker.clockSec = parsed;
      render();
      pushLiveState();
    });

    document.querySelectorAll("[data-opp-delta]").forEach((button) => {
      button.addEventListener("click", () => addOpponentScore(Number(button.dataset.oppDelta || 0)));
    });

    els.addPlayerBtn.addEventListener("click", () => {
      addRosterPlayer(els.customPlayerInput.value || els.playerSelect.value);
      els.customPlayerInput.value = "";
      els.playerSelect.value = "";
    });
    els.addCoreBtn.addEventListener("click", () => {
      CORE_SEVEN.forEach((name) => {
        if (!state.roster.includes(name)) addRosterPlayer(name);
      });
    });
    els.clockStartBtn.addEventListener("click", startClock);
    els.clockStopBtn.addEventListener("click", () => {
      stopClock();
      setStatus("clock stopped");
    });
    els.undoBtn.addEventListener("click", () => {
      const item = state.undo.pop();
      els.undoBtn.disabled = state.undo.length === 0;
      if (!item) return;
      restoreSnapshot(item.snap);
      setStatus(`undid ${item.label}`);
    });
    els.showLineupBtn.addEventListener("click", () => {
      pushLineupState().catch((error) => setStatus(String(error.message || error), true));
    });
    els.saveGameBtn.addEventListener("click", saveGame);
    els.resetGameBtn.addEventListener("click", resetGame);
    els.promptCancelBtn.addEventListener("click", () => {
      state.prompt = null;
      renderPrompt();
    });
    els.promptOverlay.addEventListener("click", (event) => {
      if (event.target !== els.promptOverlay) return;
      state.prompt = null;
      renderPrompt();
    });

    window.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "z") {
        event.preventDefault();
        const item = state.undo.pop();
        els.undoBtn.disabled = state.undo.length === 0;
        if (!item) return;
        restoreSnapshot(item.snap);
        setStatus(`undid ${item.label}`);
      }
    });
  }

  function populateBootstrap(data) {
    state.bootstrap = data;
    els.playerSelect.innerHTML = '<option value="">Select player...</option>';
    (data.players || []).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      els.playerSelect.appendChild(option);
    });
    els.opponentsList.innerHTML = "";
    (data.opponents || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.opp;
      els.opponentsList.appendChild(option);
    });
    if (data.latestGame) {
      state.meta.season = Number(data.latestGame.season || 1);
      state.meta.game = Number(data.latestGame.game || 0) + 1;
      state.meta.type = data.latestGame.type || "REG";
    }
    syncMetaInputs();
  }

  async function loadBootstrap() {
    const response = await fetch(`${API}/api/admin_v2/bootstrap`, { cache: "no-store" });
    if (!response.ok) throw new Error("failed to load bootstrap");
    return response.json();
  }

  function initElements() {
    [
      "seasonInput", "gameInput", "oppInput", "typeInput", "periodInput", "clockInput", "oppColorInput",
      "oppStripe1Input", "oppStripe2Input",
      "teamScoreSummary", "oppScoreSummary", "clockSummary", "lineupCount", "saveStatus",
      "playerSelect", "customPlayerInput", "addPlayerBtn", "addCoreBtn", "playerStrip", "opponentsList",
      "selectedPlayerName", "selectedPlayerMeta", "scoringActions", "otherActions",
      "promptOverlay", "promptPanel", "promptTitle", "promptBody", "promptChoices", "promptCancelBtn",
      "liveBox", "eventLog", "playerCountSummary", "clockStartBtn", "clockStopBtn",
      "undoBtn", "showLineupBtn", "saveGameBtn", "resetGameBtn",
    ].forEach((id) => { els[id] = $(id); });
  }

  async function init() {
    initElements();
    bindInputs();
    syncMetaInputs();
    render();
    els.undoBtn.disabled = true;
    try {
      const bootstrap = await loadBootstrap();
      populateBootstrap(bootstrap);
      setStatus("ready");
      pushLiveState();
      render();
    } catch (error) {
      setStatus(String(error.message || error), true);
    }
  }

  init();
})();
