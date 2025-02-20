// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");

// 定数（プレイヤー・弾・移動速度など）
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連の変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let gameOutcome = ""; // "You Win!" または "Game Over!"
let enemyDefeatedCount = 0; // 敵撃破数

// ★ ゲーム初期化 ★
function initGame() {
  // キャンバスサイズの設定（画面サイズに合わせる）
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤーはキャンバス下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // ボスは画面上部中央。初期サイズ、HP、発射間隔、最終発射時刻を設定。
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: 3,
    lastShotTime: 0,
    shotInterval: 1000,  // 弾幕の発射間隔を非常に短く設定
    speed: 2,            // ボスのランダム移動速度
  };
  
  // 弾用配列の初期化
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
  
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  // 移動キーの状態記録
  keys[e.key] = true;
  // スペースキーで自機弾発射（※重複発射防止）
  if (e.key === " " && gameRunning) {
    playerBullets.push({
      x: player.x + PLAYER_SIZE / 2,
      y: player.y,
      dx: 0,
      dy: -5
    });
    e.preventDefault();
  }
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

// ★ ゲームループ ★
function gameLoop() {
  if (!gameRunning) {
    gameOverText.textContent = gameOutcome;
    gameOverText.style.display = "block";
    restartButton.style.display = "block";
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 移動制限：自機は画面内に収める
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // ★ ボスのランダム移動 ★
  if (boss && boss.health > 0) {
    boss.x += (Math.random() - 0.5) * boss.speed;
    boss.y += (Math.random() - 0.5) * boss.speed;
    // 移動範囲の制限：ボスは画面内に収める
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height / 2 - boss.height, boss.y));
  
    // ★ ボスの発射処理 ★
    if (Date.now() - boss.lastShotTime > boss.shotInterval) {
      // 放射状（全方向）に弾を発射
      const numBullets = 15;  // 弾幕の量を増加
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
    // 桜の花弁のような弾を描画
    drawSakuraBullet(bullet.x, bullet.y, 3);
    // 自機との衝突判定
    if (
      bullet.x > player.x && bullet.x < player.x + PLAYER_SIZE &&
      bullet.y > player.y && bullet.y < player.y + PLAYER_SIZE
    ) {
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
    // 自機弾がボスに当たったら、ボスHPを減少
    if (
      boss && bullet.x > boss.x && bullet.x < boss.x + boss.width &&
      bullet.y > boss.y && bullet.y < boss.y + boss.height
    ) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      if (boss.health <= 0) {
        enemyDefeatedCount++;  // 敵撃破数を増加
        gameOutcome = "You Win!";
        gameRunning = false;
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
  // 中心部分（ハイライト）の描画
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
restartButton.addEventListener("click", initGame);

// ★ スペースキーで弾を発射、Rキーで再スタート ★
document.addEventListener("keydown", (e) => {
  if (e.key === " " && gameRunning) {
    playerBullets.push({
      x: player.x + PLAYER_SIZE / 2,
      y: player.y,
      dx: 0,
      dy: -5
    });
    e.preventDefault();
  }
  if (e.key === "r" && !gameRunning) {
    initGame();
  }
});
