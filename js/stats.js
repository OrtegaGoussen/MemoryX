/* ==========================================================
   stats.js — datos del experimento, partidas y récords
   Todo se guarda en el navegador (localStorage).
     · intentos: cada vez que se voltean dos cartas
     · partidas: cada nivel que el jugador pasa (nivel, tiempo, intentos)
     · récords:  mejor tiempo de cada nivel (permanente: "Borrar datos" no lo toca)
   ========================================================== */

const Stats = (function () {
  "use strict";

  const KEY_ATTEMPTS = "memorama.datos";
  const KEY_WINS = "memorama.partidas";
  const KEY_RECORDS = "memorama.records";

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const v = JSON.parse(raw);
        if (v && typeof v === "object") return v;
      }
    } catch (e) { /* sin almacenamiento */ }
    return fallback;
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* sin almacenamiento */ }
  }

  let log = read(KEY_ATTEMPTS, []);
  let wins = read(KEY_WINS, []);
  let records = read(KEY_RECORDS, {});
  if (!Array.isArray(log)) log = [];
  if (!Array.isArray(wins)) wins = [];
  if (Array.isArray(records)) records = {};

  /* 65 → "1:05" */
  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    return m + ":" + String(s % 60).padStart(2, "0");
  }

  /* Guarda el archivo: con el permiso de descargas si la página está publicada,
     o con una descarga normal si abrís index.html desde tu computadora. */
  async function saveFile(filename, blob) {
    try {
      if (window.claude && typeof window.claude.use === "function") {
        const downloads = await window.claude.use("downloads");
        if (downloads) {
          await downloads.save({ filename: filename, data: blob });
          return;
        }
      }
    } catch (e) {
      if (e && e.code === "declined") return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    formatTime: formatTime,

    /* entrada: { nivel, carta1, carta2, acierto (true/false), segundos } */
    record(entry) {
      log.push(entry);
      write(KEY_ATTEMPTS, log);
    },

    /* entrada: { nivel, segundos, intentos }
       Devuelve { isRecord, previous } y actualiza el récord si mejoró el tiempo. */
    recordWin(entry) {
      wins.push(entry);
      write(KEY_WINS, wins);

      const prev = typeof records[entry.nivel] === "number" ? records[entry.nivel] : null;
      const isRecord = prev === null || entry.segundos < prev;
      if (isRecord) {
        records[entry.nivel] = entry.segundos;
        write(KEY_RECORDS, records);
      }
      return { isRecord: isRecord, previous: prev };
    },

    getRecord(nivel) {
      return typeof records[nivel] === "number" ? records[nivel] : null;
    },

    hasWins() {
      return wins.length > 0;
    },

    /* Borra intentos y partidas. Los récords se quedan. */
    clear() {
      log = [];
      wins = [];
      write(KEY_ATTEMPTS, log);
      write(KEY_WINS, wins);
    },

    summary() {
      const attempts = log.length;
      const hits = log.filter(function (x) { return x.acierto; }).length;
      return { attempts: attempts, hits: hits, rate: attempts ? hits / attempts : 0 };
    },

    /* Excel con una fila por nivel pasado: nivel, tiempo e intentos */
    downloadExcel() {
      const rows = [[
        { v: "Nivel", s: 1 },
        { v: "Tiempo (min:seg)", s: 1 },
        { v: "Intentos", s: 1 }
      ]];
      wins.forEach(function (w) {
        rows.push([w.nivel, { v: w.segundos / 86400, s: 2 }, w.intentos]);
      });
      const blob = Xlsx.create("Estadísticas", rows, [10, 18, 12]);
      return saveFile("estadisticas-memorama.xlsx", blob);
    }
  };
})();
