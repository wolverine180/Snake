const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const speedLabelEl = document.getElementById("speedLabel");

const btnPause = document.getElementById("btnPause");
const btnRestart = document.getElementById("btnRestart");

// Ustawienia gry
const GRID = 24;              // siatka 24x24
const CELL = canvas.width / GRID; // rozmiar pola
const BASE_TICK_MS = 120;     // im mniej, tym szybciej
const SPEED_UP_EVERY = 5;     // co ile punktów przyspiesza

const BEST_KEY = "snake_best_v1";

let best = Number(localStorage.getItem(BEST_KEY) || 0);
bestEl.textContent = String(best);

let state;

// Pomocnicze
function rndInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

function clampDir(dir) {
  // zabezpieczenie: tylko 4 kierunki
  const ok = ["up","down","left","right"];
  return ok.includes(dir) ? dir : "right";
}

function resetGame() {
  state = {
    snake: [
      { x: 10, y: 12 },
      { x: 9,  y: 12 },
      { x: 8,  y: 12 },
    ],
    dir: "right",
    nextDir: "right",
    food: { x: 16, y: 12 },
    score: 0,
    paused: false,
    gameOver: false,
    tickMs: BASE_TICK_MS,
  };

  placeFood();
  updateUI();
  draw();
}

function updateUI() {
  scoreEl.textContent = String(state.score);
  bestEl.textContent = String(best);

  const speedMult = Math.round((BASE_TICK_MS / state.tickMs) * 10) / 10; // np 1.2x
  speedLabelEl.textContent = `${speedMult}x`;
}

function placeFood() {
  // losuj jedzenie w miejscu, gdzie nie ma węża
  let candidate;
  do {
    candidate = { x: rndInt(0, GRID - 1), y: rndInt(0, GRID - 1) };
  } while (state.snake.some(seg => samePos(seg, candidate)));
  state.food = candidate;
}

function setDirection(newDir) {
  newDir = clampDir(newDir);

  // blokada zawracania o 180 stopni
  const opposite = {
    up: "down", down: "up",
    left: "right", right: "left",
  };
  if (opposite[state.dir] === newDir) return;

  state.nextDir = newDir;
}

function togglePause() {
  if (state.gameOver) return;
  state.paused = !state.paused;
}

function gameOver() {
  state.gameOver = true;

  // zapis rekordu
  if (state.score > best) {
    best = state.score;
    localStorage.setItem(BEST_KEY, String(best));
  }
  updateUI();
  draw();
}

function step() {
  if (!state || state.paused || state.gameOver) return;

  // zatwierdź kierunek
  state.dir = state.nextDir;

  const head = state.snake[0];
  const newHead = { x: head.x, y: head.y };

  if (state.dir === "up") newHead.y -= 1;
  if (state.dir === "down") newHead.y += 1;
  if (state.dir === "left") newHead.x -= 1;
  if (state.dir === "right") newHead.x += 1;

  // przechodzenie przez ściany (klasyczny tryb "wrap")
  if (newHead.x < 0) newHead.x = GRID - 1;
  if (newHead.x >= GRID) newHead.x = 0;
  if (newHead.y < 0) newHead.y = GRID - 1;
  if (newHead.y >= GRID) newHead.y = 0;

  // kolizja z samym sobą
  if (state.snake.some(seg => samePos(seg, newHead))) {
    gameOver();
    return;
  }

  // ruch: dodaj głowę
  state.snake.unshift(newHead);

  // zjedzenie jedzenia?
  if (samePos(newHead, state.food)) {
    state.score += 1;

    // przyspieszanie co X punktów
    if (state.score % SPEED_UP_EVERY === 0 && state.tickMs > 55) {
      state.tickMs -= 10;
      restartLoop(); // zmieniamy tempo
    }

    placeFood();
  } else {
    // normalny ruch: usuń ogon
    state.snake.pop();
  }

  updateUI();
  draw();
}

function drawCell(x, y, fill, stroke = null) {
  const px = x * CELL;
  const py = y * CELL;

  ctx.fillStyle = fill;
  ctx.fillRect(px, py, CELL, CELL);

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
  }
}

function draw() {
  // tło
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // delikatna siatka
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      drawCell(i, j, "rgba(255,255,255,0.02)", "rgba(255,255,255,0.06)");
    }
  }
  ctx.globalAlpha = 1;

  // jedzenie
  drawCell(state.food.x, state.food.y, "rgba(236,72,153,0.95)");

  // wąż
  state.snake.forEach((seg, idx) => {
    if (idx === 0) {
      drawCell(seg.x, seg.y, "rgba(139,92,246,0.95)");
    } else {
      drawCell(seg.x, seg.y, "rgba(139,92,246,0.65)");
    }
  });

  // overlay pauza / game over
  if (state.paused || state.gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 28px system-ui, Arial";
    ctx.fillText(state.gameOver ? "KONIEC GRY" : "PAUZA", canvas.width / 2, canvas.height / 2 - 8);

    ctx.font = "16px system-ui, Arial";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const sub = state.gameOver ? "Naciśnij R, aby zagrać ponownie" : "Spacja, aby wznowić";
    ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 20);
  }
}

let loopHandle = null;

function restartLoop() {
  if (loopHandle) clearInterval(loopHandle);
  loopHandle = setInterval(step, state.tickMs);
}

// Sterowanie
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (k === "arrowup" || k === "w") setDirection("up");
  if (k === "arrowdown" || k === "s") setDirection("down");
  if (k === "arrowleft" || k === "a") setDirection("left");
  if (k === "arrowright" || k === "d") setDirection("right");

  if (k === " ") togglePause();
  if (k === "r") {
    resetGame();
    restartLoop();
  }
});

btnPause.addEventListener("click", () => togglePause());
btnRestart.addEventListener("click", () => {
  resetGame();
  restartLoop();
});

// Start
resetGame();
restartLoop();
// PWA offline
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
// --- Sterowanie dotykiem (mobile) ---
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 30) setDirection("right");
    else if (dx < -30) setDirection("left");
  } else {
    if (dy > 30) setDirection("down");
    else if (dy < -30) setDirection("up");
  }
});

