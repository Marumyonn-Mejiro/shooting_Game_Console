// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");
const fireButton = document.getElementById("fireButton");

// 定数（各種サイズ・速度）
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連の変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let gameOutcome = ""; // "You Win!" または "Game Over!"
let enemyDefeatedCount = 0; // ボス撃破回数
let fireIntervalId = null;  // 自機連射用タイマー

// ★ ゲーム初期化 ★
function initGame() {
  // キャンバスサイズの設定
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // 自機はキャンバス下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // ボスの初期設定（HPは (撃破回数+1)*3）
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (enemyDefeatedCount + 1) * 3,
    lastShotTime: 0,
    shotInterval: 500,  // 0.5秒毎に弾幕発射
    vx: (Math.random() - 0.5) * 4,  // 横方向速度
    vy: (Math.random() - 0.5) * 4   // 縦方向速度
  };
  
  // 弾用配列の初期化
  bossBullets = [];
  playerBullets = [];
  
  keys = {};
  gameRunning = true;
  gameOutcome = "";
  startTime = new Date();
  
  // 表示初期化
  scoreDisplay.textContent = `Score: 0.00秒 | 敵撃破数: ${enemyDefeatedCount}`;
  gameOverText.style.display = "none";
  restartButton.style.display = "none";
  
  // 自機連射タイマーはリセット
  stopFiring();
  
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// ★ キーボード操作（移動のみ） ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // ゲームオーバー後にRキーで再スタート
  if (e.key === "r" && !gameRunning) {
    initGame();
  }
});
document.addEventListener("keyup", (e) => { keys[e.key] = false; });

// ★ スマホ向け：スワイプ操作（スクロール防止） ★
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

// ★ 自機連射処理 ★
function startFiring() {
  if (!fireIntervalId) {
    fireIntervalId = setInterval(() => {
      // 自機の上方向に弾を発射
      playerBullets.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y,
        dx: 0,
        dy: -5
      });
    }, 100); // 0.1秒毎
  }
}
function stopFiring() {
  if (fireIntervalId) {
    clearInterval(fireIntervalId);
    fireIntervalId = null;
  }
}
fireButton.addEventListener("mousedown", startFiring);
fireButton.addEventListener("touchstart", startFiring);
fireButton.addEventListener("mouseup", stopFiring);
fireButton.addEventListener("touchend", stopFiring);

// ★ ゲームループ ★
function gameLoop() {
  if (!gameRunning) {
    gameOverText.textContent = gameOutcome;
    gameOverText.style.display = "block";
    restartButton.style.display = "block";
    stopFiring(); // 連射停止
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動（キー入力）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 自機移動制限：画面内に収める
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // ★ ボスのスムーズな移動 ★
  if (boss && boss.health > 0) {
    boss.x += boss.vx;
    boss.y += boss.vy;
    // 壁に衝突したら反転
    if (boss.x < 0 || boss.x + boss.width > canvas.width) boss.vx *= -1;
    if (boss.y < 0 || boss.y + boss.height > canvas.height) boss.vy *= -1;
  
    // ★ ボスの弾幕発射 ★
    if (Date.now() - boss.lastShotTime > boss.shotInterval) {
      const numBullets = 20;  // 大量の弾幕（タイトな配置）
      for (let i = 0; i < numBullets; i++) {
        let angle = (2 * Math.PI / numBullets) * i;
        let speed = 3;
        bossBullets.push({
          x: boss.x + boss.width / 2,
          y: boss.y + boss.height / 2,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed
        });
      }
      boss.lastShotTime = Date.now();
    }
  }
  
  // ★ ボス弾の更新＆描画 ★
  bossBullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    // 桜の花びら型の弾を描画
    drawSakuraBullet(bullet.x, bullet.y, 3);
    // 自機との当たり判定（描画形状に基づく円判定）
    if (circleRectCollision(bullet.x, bullet.y, 3, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE)) {
      gameOutcome = "Game Over!";
      gameRunning = false;
    }
    // 画面外なら削除
    if (
      bullet.x < -BULLET_SIZE || bullet.x > canvas.width + BULLET_SIZE ||
      bullet.y < -BULLET_SIZE || bullet.y > canvas.height + BULLET_SIZE
    ) {
      bossBullets.splice(index, 1);
    }
  });
  
  // ★ 自機弾の更新＆描画 ★
  playerBullets.forEach((bullet, index) => {
    bullet.y += bullet.dy;
    // 自機弾は白い円で描画
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 自機弾とボスの当たり判定（ボスは描画された四角形）
    if (rectCircleCollision(boss.x, boss.y, boss.width, boss.height, bullet.x, bullet.y, 3)) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      // ボスを倒したら、撃破回数増加＆ボス再設定（HPは (撃破回数+1)*3）
      if (boss.health <= 0) {
        enemyDefeatedCount++;
        // 再設定：位置は中央、速度はランダム、HPは増加
        boss.x = canvas.width / 2 - 20;
        boss.y = 20;
        boss.vx = (Math.random() - 0.5) * 4;
        boss.vy = (Math.random() - 0.5) * 4;
        boss.health = (enemyDefeatedCount + 1) * 3;
      }
    }
    // 画面外なら削除
    if (bullet.y < 0) {
      playerBullets.splice(index, 1);
    }
  });
  
  // ★ ボス描画 ★
  if (boss && boss.health > 0) {
    ctx.fillStyle = "red";
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    // ボスHP表示
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("HP: " + boss.health, boss.x, boss.y - 5);
  }
  
  // 敵撃破数表示
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(`敵撃破数: ${enemyDefeatedCount}`, 10, 20);
  
  // 生存時間（スコア）更新表示 + 敵撃破数も表示
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒 | 敵撃破数: ${enemyDefeatedCount}`;
  
  requestAnimationFrame(gameLoop);
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
  // 中心ハイライト
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

// ★ 円と矩形の衝突判定 ★
function rectCircleCollision(rx, ry, rw, rh, cx, cy, cr) {
  // 円の中心と矩形の最近接点との距離で判定
  let nearestX = Math.max(rx, Math.min(cx, rx + rw));
  let nearestY = Math.max(ry, Math.min(cy, ry + rh));
  let dx = cx - nearestX;
  let dy = cy - nearestY;
  return (dx * dx + dy * dy) < (cr * cr);
}

// ★ 円と矩形の衝突判定（簡易版）★
function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  return rectCircleCollision(rx, ry, rw, rh, cx, cy, cr);
}

// ★ 再プレイボタンの処理 ★
restartButton.addEventListener("click", initGame);

// ★ キー操作（スペースキーは自機弾発射、Rキーで再スタート）★
document.addEventListener("keydown", (e) => {
  if (e.key === "r" && !gameRunning) {
    initGame();
  }
  // ※ 発射はボタンによる連射のみ（スペースキーでの発射は無効）
});
