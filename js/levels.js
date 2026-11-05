/* ==========================================================
   levels.js — ACÁ SE EDITAN LOS NIVELES Y LAS CARTAS
   ==========================================================

   Cada nivel tiene:
     name       nombre que aparece al pasar el mouse por el botón del nivel
     cols       cantidad de columnas del tablero
     rows       cantidad de filas del tablero
                (cols × rows tiene que ser PAR, porque las cartas van de a pares)
     timeLimit  tiempo máximo en segundos (null = sin límite)
     flipBackMs cuánto tiempo (en milisegundos) quedan a la vista dos cartas
                distintas antes de volver a taparse

   Para agregar un nivel, copiá una línea y cambiá los números.
   Máximo de pares por nivel = cantidad de SYMBOLS (acá, 24).
*/

const LEVELS = [
  { name: "Calentamiento", cols: 4, rows: 3, timeLimit: null, flipBackMs: 900 }, // 6 pares
  { name: "Clásico",       cols: 4, rows: 4, timeLimit: null, flipBackMs: 800 }, // 8 pares
  { name: "Más cartas",    cols: 5, rows: 4, timeLimit: 120,  flipBackMs: 700 }, // 10 pares
  { name: "Cosecha",       cols: 6, rows: 5, timeLimit: 180,  flipBackMs: 650 }, // 15 pares
  { name: "Mercado",       cols: 6, rows: 6, timeLimit: 240,  flipBackMs: 600 }, // 18 pares
  { name: "Maestro",       cols: 8, rows: 6, timeLimit: 300,  flipBackMs: 500 }  // 24 pares
];

/* Las "imágenes" de las cartas. Podés cambiarlas por cualquier emoji o texto. */
const SYMBOLS = [
  "🍎", "🍌", "🍒", "🍉", "🥑", "🥕", "🍋", "🍇",
  "🍓", "🍑", "🍍", "🥦", "🌽", "🍅", "🥝", "🍐",
  "🍊", "🫐", "🥬", "🍆", "🥥", "🍄", "🌶️", "🥔"
];

/* Estrellas al ganar un nivel, según los movimientos usados.
   Ejemplo: con 8 pares y three = 1.5 → 3 estrellas si ganás en 12 movimientos o menos. */
const STAR_RULES = {
  three: 1.5, // movimientos ≤ pares × 1.5  → ★★★
  two: 2.2    // movimientos ≤ pares × 2.2  → ★★☆ (si no, ★☆☆)
};
