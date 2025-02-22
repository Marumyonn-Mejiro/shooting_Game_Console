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
const PLAYER_BULLET_SPEED = -5;
const BOSS_BASE_HP = 3;  // 初回HP = 3

// ゲーム関連変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let enemyDefeatedCount = 0; // ボス撃破回数
let gameOutcome = "";       // ゲームオーバー時の結果

// ボスの移動方向（単位ベクトル×速度）
let bossDirection = { dx: 0, dy: 0 };
let bossDirectionInterval;  // 移動方向更新用タイマー
let playerFireInterval;     // 自機自動発射用タイマー

// ★ ゲーム初期化 ★
function initGame() {
  // キャンバスサイズの設定
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // 自機はキャンバス下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // ボスの初期設定：撃破回数に応じたHP
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (enemyDefeatedCount + 1) * BOSS_BASE_HP,
    lastShotTime: 0,
    shotInterval: 500,  // 短い間隔で大量発射
    speed: 2            // 移動速度
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
  
  // 自機自動発射開始（0.1秒間隔）
  if (playerFireInterval) clearInterval(playerFireInterval);
  playerFireInterval = setInterval(() => {
    if (gameRunning) {
      // 自機から上方に弾を発射
      playerBullets.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y,
        dx: 0,
        dy: PLAYER_BULLET_SPEED
      });
    }
  }, 100);
  
  // ボス移動方向更新（0.5秒ごと）
  if (bossDirectionInterval) clearInterval(bossDirectionInterval);
  bossDirectionInterval = setInterval(() => {
    if (gameRunning && boss && boss.health > 0) {
      let angle = Math.random() * 2 * Math.PI;
      bossDirection.dx = Math.cos(angle) * boss.speed;
      bossDirection.dy = Math.sin(angle) * boss.speed;
    }
  }, 500);
  
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // スペースキーで自機弾発射（ここでは自動発射と重複しないように、手動発射は行わない）
  // ※ 弾発射は自機自動発射のみとする
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
    gameOverText.textContent = gameOutcome + `（敵撃破数: ${enemyDefeatedCount}）`;
    gameOverText.style.display = "block";
    restartButton.style.display = "block";
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動（WASD/矢印キー）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 自機の移動範囲を画面内に限定
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画（青い円に変更して描画形状に合わせた当たり判定用）
  ctx.beginPath();
  ctx.fillStyle = "blue";
  // 自機中心と半径
  let playerCenter = { x: player.x + PLAYER_SIZE/2, y: player.y + PLAYER_SIZE/2 };
  let playerRadius = PLAYER_SIZE/2;
  ctx.arc(playerCenter.x, playerCenter.y, playerRadius, 0, Math.PI*2);
  ctx.fill();
  
  // ★ ボスの移動 ★
  if (boss && boss.health > 0) {
    // ボスは自動的に、直前に決定された方向で移動
    boss.x += bossDirection.dx;
    boss.y += bossDirection.dy;
    // ボスの移動範囲は画面上半分内に制限
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height/2 - boss.height, boss.y));
  
    // ★ ボスの発射処理 ★
    if (Date.now() - boss.lastShotTime > boss.shotInterval) {
      // 放射状に、タイトな桜の花びら弾幕を大量に発射（例：20発）
      const numBullets = 20;
      for (let i = 0; i < numBullets; i++) {
        let angle = (2 * Math.PI / numBullets) * i;
        let speed = 3;
        bossBullets.push({
          x: boss.x + boss.width/2,
          y: boss.y + boss.height/2,
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
    // 桜の花びら型弾を描画
    drawSakuraBullet(bullet.x, bullet.y, 3);
    // 当たり判定：自機を円とみなし、ボス弾も円とみなす（半径3）
    let dx = bullet.x - playerCenter.x;
    let dy = bullet.y - playerCenter.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < (playerRadius + 3)) {
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
    // 当たり判定：自機弾 vs. ボス（矩形判定）
    if (
      boss && bullet.x > boss.x && bullet.x < boss.x + boss.width &&
      bullet.y > boss.y && bullet.y < boss.y + boss.height
    ) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      // ボスが倒された場合、更新処理：撃破回数増、ボスHPアップ、再出現
      if (boss.health <= 0) {
        enemyDefeatedCount++;
        // 新しいボスのHPは (撃破回数+1)*3
        boss.health = (enemyDefeatedCount + 1) * 3;
        // ボス出現位置をリセット（上部中央付近、ランダムにずらす）
        boss.x = canvas.width/2 - boss.width/2 + (Math.random()-0.5)*50;
        boss.y = 20 + (Math.random()-0.5)*20;
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
  // 中心のハイライト
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

// ★ キー操作：スペースキーで発射、Rキーで再スタート ★
document.addEventListener("keydown", (e) => {
  if (e.key === " " && gameRunning) {
    // ※自動発射により、ここでの手動発射は不要（仕様：自機は常に自動発射）
    // ここでは重複防止のため何もしません
    e.preventDefault();
  }
  if (e.key === "r" && !gameRunning) {
    initGame();
  }
});
