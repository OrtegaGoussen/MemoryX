/* ==========================================================
   game.js — lógica del juego
   Lo más común es editar levels.js; este archivo solo si querés
   cambiar las reglas.
   ========================================================== */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const boardEl = $("board");
  const startBtn = $("startBtn");
  const movesEl = $("moves");
  const timeEl = $("time");
  const levelLabel = $("levelLabel");
  const levelTotal = $("levelTotal");
  const levelNav = $("levelNav");
  const hintEl = $("hint");
  const overlay = $("overlay");
  const overlayTitle = $("overlayTitle");
  const overlayText = $("overlayText");
  const overlayBtn = $("overlayBtn");
  const statAttempts = $("statAttempts");
  const statHits = $("statHits");
  const statRate = $("statRate");
  const statsBtn = $("statsBtn");
  const recordWrap = $("recordWrap");
  const recordEl = $("record");
  const clearBtn = $("clearBtn");

  const SAVE_KEY = "memorama.nivelDesbloqueado";

  let levelIndex = 0;
  let unlocked = 1; // cantidad de niveles disponibles
  let pairs = 0;
  let matched = 0;
  let moves = 0;
  let seconds = 0;
  let first = null; // primera carta dada vuelta del intento actual
  let locked = true; // true = no se puede tocar ninguna carta
  let started = false;
  let timerId = null;
  let flipTimeout = null;
  let overlayAction = null;
  const DEFAULT_HINT = hintEl.textContent;
  let hintTimer = null;
  let clearTimer = null;

  /* ---------- progreso guardado ---------- */

  function loadProgress() {
    try {
      const n = parseInt(localStorage.getItem(SAVE_KEY), 10);
      if (n >= 1 && n <= LEVELS.length) unlocked = n;
    } catch (e) { /* sin almacenamiento */ }
  }

  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, String(unlocked)); } catch (e) { /* sin almacenamiento */ }
  }

  /* ---------- utilidades ---------- */

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function stars(usedMoves, totalPairs) {
    if (usedMoves <= totalPairs * STAR_RULES.three) return 3;
    if (usedMoves <= totalPairs * STAR_RULES.two) return 2;
    return 1;
  }

  /* ---------- botones de nivel ---------- */

  function buildLevelNav() {
    levelNav.innerHTML = "";
    LEVELS.forEach(function (level, i) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = String(i + 1);
      b.title = level.name;
      b.setAttribute("aria-label", "Nivel " + (i + 1) + ": " + level.name + (i >= unlocked ? " (bloqueado)" : ""));
      b.disabled = i >= unlocked;
      if (i === levelIndex) b.setAttribute("aria-current", "true");
      b.addEventListener("click", function () { setupLevel(i); });
      levelNav.appendChild(b);
    });
  }

  /* ---------- tiempo ---------- */

  function renderTime() {
    const limit = LEVELS[levelIndex].timeLimit;
    timeEl.textContent = Stats.formatTime(seconds) + (limit ? " / " + Stats.formatTime(limit) : "");
  }

  /* récord de tiempo del nivel actual (se queda guardado) */
  function renderRecord() {
    const best = Stats.getRecord(levelIndex + 1);
    recordWrap.hidden = best === null;
    if (best !== null) recordEl.textContent = Stats.formatTime(best);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(function () {
      seconds++;
      renderTime();
      const limit = LEVELS[levelIndex].timeLimit;
      if (limit && seconds >= limit) lose();
    }, 1000);
  }

  /* ---------- datos del experimento ---------- */

  function renderStats() {
    const s = Stats.summary();
    statAttempts.textContent = s.attempts;
    statHits.textContent = s.hits;
    statRate.textContent = Math.round(s.rate * 100) + " %";
  }

  /* ---------- armar un nivel ---------- */

  function setupLevel(i) {
    stopTimer();
    clearTimeout(flipTimeout);

    levelIndex = i;
    const level = LEVELS[i];
    const total = level.cols * level.rows;
    pairs = Math.floor(total / 2);

    if (total % 2 !== 0) console.warn("Nivel " + (i + 1) + ": cols × rows debe ser par.");
    if (pairs > SYMBOLS.length) {
      console.warn("Nivel " + (i + 1) + ": hay más pares que símbolos. Agregá símbolos en levels.js.");
      pairs = SYMBOLS.length;
    }

    const chosen = shuffle(SYMBOLS.slice()).slice(0, pairs);
    const deck = shuffle(chosen.concat(chosen));

    boardEl.style.setProperty("--cols", level.cols);
    boardEl.innerHTML = "";
    deck.forEach(function (symbol) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.dataset.symbol = symbol;
      card.setAttribute("aria-label", "Carta boca abajo");
      card.innerHTML =
        '<span class="card-inner">' +
        '<span class="face back"></span>' +
        '<span class="face front" aria-hidden="true">' + symbol + "</span>" +
        "</span>";
      card.addEventListener("click", function () { flip(card); });
      boardEl.appendChild(card);
    });

    first = null;
    matched = 0;
    moves = 0;
    seconds = 0;
    started = false;
    locked = true;

    movesEl.textContent = "0";
    levelLabel.textContent = String(i + 1);
    levelTotal.textContent = String(LEVELS.length);
    startBtn.textContent = "Empezar";
    boardEl.classList.add("idle");
    hintEl.hidden = false;
    renderTime();
    renderRecord();
    buildLevelNav();
    hideOverlay();
  }

  /* ---------- jugar ---------- */

  function startGame() {
    setupLevel(levelIndex); // vuelve a mezclar las cartas
    started = true;
    locked = false;
    startBtn.textContent = "Reiniciar";
    boardEl.classList.remove("idle");
    hintEl.hidden = true;
    startTimer();
  }

  function flip(card) {
    if (!started || locked) return;
    if (card.classList.contains("flipped") || card.classList.contains("matched")) return;

    card.classList.add("flipped");
    card.setAttribute("aria-label", "Carta " + card.dataset.symbol);

    if (!first) {
      first = card;
      return;
    }

    const second = card;
    const isMatch = first.dataset.symbol === second.dataset.symbol;

    moves++;
    movesEl.textContent = String(moves);

    Stats.record({
      nivel: levelIndex + 1,
      carta1: first.dataset.symbol,
      carta2: second.dataset.symbol,
      acierto: isMatch,
      segundos: seconds
    });
    renderStats();

    if (isMatch) {
      first.classList.add("matched");
      second.classList.add("matched");
      first = null;
      matched++;
      if (matched === pairs) win();
      return;
    }

    locked = true;
    const a = first;
    first = null;
    flipTimeout = setTimeout(function () {
      a.classList.remove("flipped");
      second.classList.remove("flipped");
      a.setAttribute("aria-label", "Carta boca abajo");
      second.setAttribute("aria-label", "Carta boca abajo");
      locked = false;
    }, LEVELS[levelIndex].flipBackMs);
  }

  /* ---------- fin del nivel ---------- */

  function win() {
    stopTimer();
    started = false;
    locked = true;

    const earned = stars(moves, pairs);
    const isLast = levelIndex === LEVELS.length - 1;

    if (!isLast && unlocked < levelIndex + 2) {
      unlocked = levelIndex + 2;
      saveProgress();
      buildLevelNav();
    }

    const res = Stats.recordWin({ nivel: levelIndex + 1, segundos: seconds, intentos: moves });
    renderRecord();

    let recordLine;
    if (res.previous === null) recordLine = "Récord del nivel: " + Stats.formatTime(seconds);
    else if (res.isRecord) recordLine = "¡Nuevo récord! Antes: " + Stats.formatTime(res.previous);
    else recordLine = "Tu récord: " + Stats.formatTime(res.previous);

    const result = "★".repeat(earned) + "☆".repeat(3 - earned) +
      "  " + moves + " movimientos en " + Stats.formatTime(seconds) + "\n" + recordLine;

    if (isLast) {
      showOverlay("¡Completaste todos los niveles!", result, "Volver al nivel 1", function () { setupLevel(0); });
    } else {
      showOverlay("¡Nivel " + (levelIndex + 1) + " completo!", result, "Siguiente nivel", function () { setupLevel(levelIndex + 1); });
    }
  }

  function lose() {
    stopTimer();
    started = false;
    locked = true;
    showOverlay(
      "Se acabó el tiempo",
      "Encontraste " + matched + " de " + pairs + " pares.",
      "Reintentar",
      startGame
    );
  }

  /* ---------- cartel final ---------- */

  function showOverlay(title, text, buttonLabel, action) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayBtn.textContent = buttonLabel;
    overlayAction = action;
    overlay.hidden = false;
    overlayBtn.focus();
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  /* ---------- eventos ---------- */

  startBtn.addEventListener("click", startGame);

  overlayBtn.addEventListener("click", function () {
    const action = overlayAction;
    overlayAction = null;
    hideOverlay();
    if (action) action();
  });

  /* mensaje corto en el lugar del aviso de arriba */
  function flash(message) {
    hintEl.textContent = message;
    hintEl.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      hintEl.textContent = DEFAULT_HINT;
      hintEl.hidden = started;
    }, 3500);
  }

  statsBtn.addEventListener("click", function () {
    if (!Stats.hasWins()) {
      flash("Pasá al menos un nivel para descargar las estadísticas.");
      return;
    }
    Stats.downloadExcel();
  });

  function resetClearButton() {
    clearTimeout(clearTimer);
    clearTimer = null;
    clearBtn.textContent = "Borrar datos";
  }

  /* hay que tocar dos veces para borrar (los récords no se borran) */
  clearBtn.addEventListener("click", function () {
    if (!clearTimer) {
      clearBtn.textContent = "¿Seguro? Tocá otra vez";
      clearTimer = setTimeout(resetClearButton, 3500);
      return;
    }
    resetClearButton();
    Stats.clear();
    renderStats();
  });

  /* ---------- inicio ---------- */

  loadProgress();
  renderStats();
  setupLevel(0);
})();
