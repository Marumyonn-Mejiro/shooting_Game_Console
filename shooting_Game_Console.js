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

// ボスの移動方向更新タイマー、及び自機自動発射タイマー
let bossDirectionInterval;
let playerFireInterval;

// ボスの移動方向（単位ベクトル×速度）
let bossDirection = { dx: 0, dy: 0 };

// ★ ボスの外観更新 ★
// 倒された回数に応じて、HP, 発射間隔, 移動速度、色を変更
function updateBossAppearance() {
  if (enemyDefeatedCount % 5 === 0 && enemyDefeatedCount > 0) {
    // 5回に1回の強化ボス：七色に光る（rainbow効果）、発射間隔短縮、速度アップ
    boss.rainbow = true;
    boss.shotInterval = 500;
    boss.speed = 3;
  } else {
    boss.rainbow = false;
    boss.shotInterval = 1000;
    boss.speed = 2;
    const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    boss.color = colors[Math.floor(Math.random() * colors.length)];
  }
}

// ★ ゲーム初期化 ★
function initGame() {
  // ゲーム開始時、倒した敵の数をリセット（今回の仕様では再スタートでリセットする）
  enemyDefeatedCount = 0;
  
  // キャンバスサイズの設定
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // 自機はキャンバス下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // ボス初期設定
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (enemyDefeatedCount + 1) * BOSS_BASE_HP,
    lastShotTime: 0,
    shotInterval: 1000, // 仮設定（updateBossAppearanceで上書き）
    speed: 2
  };
  updateBossAppearance();
  
  // 弾配列初期化
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
  // スペースキーで自機弾発射は自機自動発射仕様のため無視
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
  // 自機移動範囲
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画（円形）
  ctx.beginPath();
  ctx.fillStyle = "blue";
  let playerCenter = { x: player.x + PLAYER_SIZE/2, y: player.y + PLAYER_SIZE/2 };
  let playerRadius = PLAYER_SIZE/2;
  ctx.arc(playerCenter.x, playerCenter.y, playerRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // ★ ボスの移動 ★
  if (boss && boss.health > 0) {
    boss.x += bossDirection.dx;
    boss.y += bossDirection.dy;
    // 移動範囲：画面上半分内
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height/2 - boss.height, boss.y));
    
    // ★ ボスの発射処理 ★
    if (Date.now() - boss.lastShotTime > boss.shotInterval) {
      const numBullets = 20;  // タイトな桜の花びら弾幕
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
    drawSakuraBullet(bullet.x, bullet.y, 3);
    // 円同士の当たり判定
    let dx = bullet.x - playerCenter.x;
    let dy = bullet.y - playerCenter.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < (playerRadius + 3)) {
      gameOutcome = "Game Over!";
      gameRunning = false;
    }
    if (
      bullet.x < -BULLET_SIZE ||
      bullet.x > canvas.width + BULLET_SIZE ||
      bullet.y < -BULLET_SIZE ||
      bullet.y > canvas.height + BULLET_SIZE
    ) {
      bossBullets.splice(index, 1);
    }
  });
  
  // ★ 自機弾の更新＆描画 ★
  playerBullets.forEach((bullet, index) => {
    bullet.y += bullet.dy;
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 当たり判定：自機弾とボス（矩形判定＋補完）
    if (
      boss &&
      bullet.x > boss.x && bullet.x < boss.x + boss.width &&
      bullet.y > boss.y && bullet.y < boss.y + boss.height
    ) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      if (boss.health <= 0) {
        enemyDefeatedCount++;
        // 次回ボスのHPは (撃破回数+1)*BOSS_BASE_HP
        boss.health = (enemyDefeatedCount + 1) * BOSS_BASE_HP;
        // 更新：難易度強化する場合、5回に1回はrainbowモード
        updateBossAppearance();
        // ボスの出現位置リセット
        boss.x = canvas.width/2 - boss.width/2 + (Math.random()-0.5)*50;
        boss.y = 20 + (Math.random()-0.5)*20;
      }
    }
    if (bullet.y < 0) {
      playerBullets.splice(index, 1);
    }
  });
  
  // ★ ボスの描画 ★
  if (boss && boss.health > 0) {
    if (boss.rainbow) {
      // 七色に光るrainbowボス：線形グラデーションを利用
      let grad = ctx.createLinearGradient(boss.x, boss.y, boss.x + boss.width, boss.y + boss.height);
      grad.addColorStop(0, "red");
      grad.addColorStop(0.16, "orange");
      grad.addColorStop(0.33, "yellow");
      grad.addColorStop(0.50, "green");
      grad.addColorStop(0.66, "blue");
      grad.addColorStop(0.83, "indigo");
      grad.addColorStop(1, "violet");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = boss.color;
    }
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

// ★ ボス外観更新 ★
function updateBossAppearance() {
  if (enemyDefeatedCount % 5 === 0 && enemyDefeatedCount > 0) {
    // 5回に1回：rainbowモード（難易度強化）
    boss.rainbow = true;
    boss.shotInterval = 500;
    boss.speed = 3;
  } else {
    boss.rainbow = false;
    boss.shotInterval = 1000;
    boss.speed = 2;
    const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    boss.color = colors[Math.floor(Math.random() * colors.length)];
  }
}

// ★ 再プレイボタンの処理 ★
restartButton.addEventListener("click", initGame);

// ★ キー操作：スペースキーで発射、Rキーで再スタート ★
document.addEventListener("keydown", (e) => {
  if (e.key === " " && gameRunning) {
    // 自機自動発射仕様のため、手動発射はしない
    e.preventDefault();
  }
  if (e.key === "r" && !gameRunning) {
    initGame();
  }
});
