// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");

// 定数
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連の変数
let player, bullets, keys, gameRunning, startTime;

// ★ ゲーム初期化 ★
function initGame() {
  // キャンバスの実際の描画領域は画面サイズに合わせて設定
  canvas.width = Math.min(window.innerWidth * 0.9, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  bullets = [];
  keys = {};
  gameRunning = true;
  gameOverText.style.display = "none";
  restartButton.style.display = "none";
  startTime = new Date();
  scoreDisplay.textContent = "Score: 0.00秒";
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// ★ スマホのスワイプ操作 ★
// ページスクロールを防ぐため、touchmove イベント内で preventDefault() を実施
let touchStartX = 0, touchStartY = 0;
document.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});
document.addEventListener("touchmove", (e) => {
  e.preventDefault();
  let dx = e.touches[0].clientX - touchStartX;
  let dy = e.touches[0].clientY - touchStartY;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  player.x += dx * 0.2;
  player.y += dy * 0.2;
}, { passive: false });

// ★ ゲームループ ★
function gameLoop() {
  if (!gameRunning) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // プレイヤー移動処理
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  
  // 画面外への移動を防止
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // プレイヤー描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // 弾の更新と描画
  bullets.forEach((b) => {
    b.x += b.dx * BULLET_SPEED;
    b.y += b.dy * BULLET_SPEED;
    drawSakuraBullet(b.x, b.y, BULLET_SIZE * 4);
    
    // 衝突判定：プレイヤーと弾の重なりを検出
    if (
      b.x < player.x + PLAYER_SIZE &&
      b.x + BULLET_SIZE > player.x &&
      b.y < player.y + PLAYER_SIZE &&
      b.y + BULLET_SIZE > player.y
    ) {
      gameOver();
    }
  });
  // 画面外に出た弾は削除
  bullets = bullets.filter((b) =>
    b.x >= -BULLET_SIZE &&
    b.x <= canvas.width + BULLET_SIZE &&
    b.y >= -BULLET_SIZE &&
    b.y <= canvas.height + BULLET_SIZE
  );
  
  // 高頻度の弾幕発射
  if (Math.random() < 0.1) {
    spawnBulletPattern();
  }
  
  // 生存時間（スコア）の更新表示
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒`;
  
  requestAnimationFrame(gameLoop);
}

// ★ 弾幕発射（桜の花びらパターン） ★
function spawnBulletPattern() {
  let centerX = Math.random() * canvas.width;
  let centerY = 0;
  let numBullets = 12;
  let angleStep = Math.PI * 2 / numBullets;
  for (let i = 0; i < numBullets; i++) {
    let angle = i * angleStep;
    bullets.push({
      x: centerX,
      y: centerY,
      dx: Math.cos(angle),
      dy: Math.sin(angle)
    });
  }
}

// ★ 桜の花びら描画関数 ★
function drawSakuraBullet(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / 5);
    drawPetal(size);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPetal(size) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(
    -size * 0.12, -size * 0.3,
    -size * 0.20, -size * 0.5,
    0, -size * 0.65
  );
  ctx.bezierCurveTo(
    size * 0.20, -size * 0.5,
    size * 0.12, -size * 0.3,
    0, 0
  );
  ctx.fillStyle = "pink";
  ctx.fill();
}

// ★ ゲームオーバー処理 ★
function gameOver() {
  gameRunning = false;
  gameOverText.style.display = "block";
  restartButton.style.display = "block";
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒`;
}

// ★ 再スタート ★
restartButton.addEventListener("click", initGame);
