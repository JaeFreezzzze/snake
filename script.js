const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const restartBtn = document.getElementById("restartBtn");
const startBtn = document.getElementById("startBtn");

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const tickMs = 120;

let snake;
let direction;
let nextDirection;
let food;
let score;
let gameOver;
let isPaused;
let hasStarted;

function refreshStartButton() {
  if (gameOver) {
    startBtn.textContent = "Start";
    startBtn.classList.remove("hidden");
    return;
  }

  if (isPaused) {
    startBtn.textContent = hasStarted ? "Continue" : "Start";
    startBtn.classList.remove("hidden");
  } else {
    startBtn.classList.add("hidden");
  }
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  food = createFood();
  score = 0;
  gameOver = false;
  isPaused = true;
  hasStarted = false;
  scoreEl.textContent = String(score);
  refreshStartButton();
  draw();
}

function createFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (snake && snake.some((part) => part.x === pos.x && part.y === pos.y));
  return pos;
}

function step() {
  if (gameOver || isPaused) return;

  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  const hitWall =
    head.x < 0 ||
    head.x >= tileCount ||
    head.y < 0 ||
    head.y >= tileCount;

  const hitBody = snake.some((part) => part.x === head.x && part.y === head.y);

  if (hitWall || hitBody) {
    gameOver = true;
    isPaused = true;
    refreshStartButton();
    draw();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    scoreEl.textContent = String(score);
    food = createFood();
  } else {
    snake.pop();
  }

  draw();
}

function drawBoard() {
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
  for (let i = 0; i <= tileCount; i += 1) {
    const p = i * gridSize;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }
}

function drawSnake() {
  ctx.fillStyle = "#10b981";
  for (const part of snake) {
    ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
  }
}

function drawFood() {
  ctx.fillStyle = "#f97316";
  ctx.fillRect(food.x * gridSize + 1, food.y * gridSize + 1, gridSize - 2, gridSize - 2);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.font = "bold 30px Segoe UI";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = "16px Segoe UI";
  ctx.fillText("Press Restart to play again", canvas.width / 2, canvas.height / 2 + 22);
}

function drawPauseOverlay() {
  if (gameOver || !isPaused) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  drawBoard();
  drawFood();
  drawSnake();
  drawPauseOverlay();
  if (gameOver) {
    drawGameOver();
  }
}

function setDirection(x, y) {
  if (direction.x === -x && direction.y === -y) return;
  nextDirection = { x, y };
}

function togglePause() {
  if (gameOver) return;

  if (!hasStarted) {
    hasStarted = true;
    isPaused = false;
  } else {
    isPaused = !isPaused;
  }

  refreshStartButton();
  draw();
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === " ") {
    e.preventDefault();
    togglePause();
    return;
  }

  switch (key) {
    case "arrowup":
    case "w":
      setDirection(0, -1);
      break;
    case "arrowdown":
    case "s":
      setDirection(0, 1);
      break;
    case "arrowleft":
    case "a":
      setDirection(-1, 0);
      break;
    case "arrowright":
    case "d":
      setDirection(1, 0);
      break;
    default:
      break;
  }
});

restartBtn.addEventListener("click", resetGame);
startBtn.addEventListener("click", togglePause);

resetGame();
setInterval(step, tickMs);
