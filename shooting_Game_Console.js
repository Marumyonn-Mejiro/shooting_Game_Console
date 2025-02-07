// API Gateway のエンドポイント（※この URL を利用します）
const API_BASE_URL = "https://ktwez6k3fi.execute-api.ap-northeast-1.amazonaws.com";

// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");
const leaderboardList = document.getElementById("leaderboard");

// 定数
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連の変数
let player, bullets, keys, gameRunning, startTime;

// ★ ゲーム初期化 ★
function initGame() {
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
document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

// ★ スマホのスワイプ操作（画面スクロールを防止するため preventDefault） ★
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

  // 画面端での制限
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));

  // プレイヤー描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

  // 弾の更新＆描画
  bullets.forEach((b) => {
    b.x += b.dx * BULLET_SPEED;
    b.y += b.dy * BULLET_SPEED;
    drawSakuraBullet(b.x, b.y, BULLET_SIZE * 4);
    // 衝突判定：プレイヤーと弾の当たり判定
    if (
      b.x < player.x + PLAYER_SIZE &&
      b.x + BULLET_SIZE > player.x &&
      b.y < player.y + PLAYER_SIZE &&
      b.y + BULLET_SIZE > player.y
    ) {
      gameOver();
    }
  });
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

  // 自身のスコア（経過秒数）を更新して表示
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

// ★ AWS API 呼び出し部 ★

// スコア送信（POST /submitScore）  
async function submitScoreAWS(score) {
  try {
    const response = await fetch(`${API_BASE_URL}/submitScore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score })
    });
    if (!response.ok) {
      console.error("Score submission failed");
    }
  } catch (error) {
    console.error("submitScoreAWS error:", error);
  }
}

// ランキング取得（GET /leaderboard）
async function getLeaderboardAWS() {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard`);
    if (response.ok) {
      const data = await response.json();
      updateLeaderboardUI(data);
    } else {
      console.error("Leaderboard retrieval failed");
    }
  } catch (error) {
    console.error("getLeaderboardAWS error:", error);
  }
}

// ランキングリストの更新
function updateLeaderboardUI(scores) {
  // ※取得した配列はスコア降順でソート済みと仮定
  let html = "";
  scores.forEach((item) => {
    html += `<li>${parseFloat(item.score).toFixed(2)}秒</li>`;
  });
  leaderboardList.innerHTML = html;
}

// ★ ゲームオーバー処理 ★
async function gameOver() {
  gameRunning = false;
  gameOverText.style.display = "block";
  restartButton.style.display = "block";
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒`;
  // AWS にスコア送信後、最新のランキングを取得
  await submitScoreAWS(elapsedTime);
  await getLeaderboardAWS();
}

// ★ 再スタート ★
restartButton.addEventListener("click", initGame);
