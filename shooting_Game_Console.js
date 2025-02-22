// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");

// 定数（プレイヤー、弾、移動速度など）
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;
const PLAYER_FIRE_INTERVAL = 100;  // 0.1秒間隔
const BOSS_MOVE_INTERVAL = 500;    // 0.5秒ごとに移動方向を変更

// ゲーム関連の変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let gameOutcome = ""; // "You Win!" または "Game Over!"
let enemyDefeatedCount = 0; // 敵撃破数（ボスを倒した回数）
let playerFireTimer = null;
let bossMoveTimer = null;

// ★ ゲーム初期化 ★
function initGame() {
  // キャンバスサイズ設定
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤーは下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // ボスの初期HPは (enemyDefeatedCount+1)*3
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (enemyDefeatedCount + 1) * 3,
    lastShotTime: 0,
    shotInterval: 1000,  // 発射間隔
    speed: 3,            // 移動速度
    vx: 0,
    vy: 0
  };
  
  // 弾配列の初期化
  bossBullets = [];
  playerBullets = [];
  
  keys = {};
  gameRunning = true;
  gameOutcome = "";
  startTime = new Date();
  
  // 表示初期化
  scoreDisplay.textContent = "Score: 0.00秒";
  gameOverText.style.display = "none";
  restartButton.style.display = "none";
  
  // プレイヤーの自動発射開始（0.1秒間隔）
  if (playerFireTimer) clearInterval(playerFireTimer);
  playerFireTimer = setInterval(() => {
    if (gameRunning) {
      // 自機の上方に自動で弾発射
      playerBullets.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y,
        dx: 0,
        dy: -5
      });
    }
  }, PLAYER_FIRE_INTERVAL);
  
  // ボス移動のため、0.5秒ごとに新たな移動方向を設定
  if (bossMoveTimer) clearInterval(bossMoveTimer);
  bossMoveTimer = setInterval(() => {
    if (boss && boss.health > 0) {
      // -1～+1の乱数にボス.speedを乗じて速度設定
      boss.vx = (Math.random() - 0.5) * boss.speed * 2;
      boss.vy = (Math.random() - 0.5) * boss.speed * 2;
    }
  }, BOSS_MOVE_INTERVAL);
  
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // ゲームオーバー後、Rキーで再スタート
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

// ★ ゲームループ ★
function gameLoop() {
  if (!gameRunning) {
    gameOverText.textContent = gameOutcome;
    gameOverText.style.display = "block";
    restartButton.style.display = "block";
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動（キー入力による）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 自機が画面外に出ないよう制限
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画（青い矩形）
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // ★ ボスの移動 ★
  if (boss && boss.health > 0) {
    boss.x += boss.vx;
    boss.y += boss.vy;
    // ボスが画面内に収まるよう制限（画面上半分）
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height / 2 - boss.height, boss.y));
  
    // ★ ボスの発射処理 ★
    if (Date.now() - boss.lastShotTime > boss.shotInterval) {
      // 放射状に20発の桜の花びら型弾幕を発射（タイトな弾幕）
      const numBullets = 20;
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
    // 桜の花びらのような弾を描画
    drawSakuraBullet(bullet.x, bullet.y, 3);
    // 当たり判定（自機との距離で判定）
    if (circleRectCollision(bullet.x, bullet.y, 3, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE)) {
      gameOutcome = "Game Over!";
      gameRunning = false;
    }
    // 画面外なら削除
    if (bullet.x < -BULLET_SIZE || bullet.x > canvas.width + BULLET_SIZE ||
        bullet.y < -BULLET_SIZE || bullet.y > canvas.height + BULLET_SIZE) {
      bossBullets.splice(index, 1);
    }
  });
  
  // ★ 自機弾の更新＆描画 ★
  playerBullets.forEach((bullet, index) => {
    bullet.y += bullet.dy;
    // 自機弾を白い円で描画
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 当たり判定：自機弾とボスの衝突（描画に合わせた矩形と円の判定）
    if (boss && rectCircleCollision(boss.x, boss.y, boss.width, boss.height,
                                      bullet.x, bullet.y, 3)) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      if (boss.health <= 0) {
        enemyDefeatedCount++;
        // ボスを再生成（HPは倒された回数に応じて増加）
        boss = {
          x: Math.random() * (canvas.width - 40),
          y: Math.random() * (canvas.height / 2 - 20),
          width: 40,
          height: 20,
          health: (enemyDefeatedCount + 1) * 3,
          lastShotTime: Date.now(),
          shotInterval: 1000,
          speed: 3,
          vx: 0,
          vy: 0
        };
      }
    }
    // 画面外なら削除
    if (bullet.y < 0) {
      playerBullets.splice(index, 1);
    }
  });
  
  // ★ ボスの描画 ★
  if (boss && boss.health > 0) {
    ctx.fillStyle = "red";
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    // ボスHP表示
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("HP: " + boss.health, boss.x, boss.y - 5);
  }
  
  // ★ 敵撃破数表示 ★
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(`敵撃破数: ${enemyDefeatedCount}`, 10, 20);
  
  // 生存時間（スコア）の更新表示
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒`;
  
  requestAnimationFrame(gameLoop);
}

// ★ 衝突判定（円と矩形の当たり判定）★
function rectCircleCollision(rx, ry, rw, rh, cx, cy, cr) {
  // 円の中心と矩形の最も近い点との距離を計算
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return (dx * dx + dy * dy) < (cr * cr);
}

// ★ 衝突判定（円と矩形：同様の処理）★
function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  return rectCircleCollision(rx, ry, rw, rh, cx, cy, cr);
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
  // 中心部分（ハイライト）
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

// ★ 再プレイボタンの処理 ★
restartButton.addEventListener("click", () => {
  // タイマーのクリア
  if (playerFireTimer) clearInterval(playerFireTimer);
  if (bossMoveTimer) clearInterval(bossMoveTimer);
  initGame();
});
