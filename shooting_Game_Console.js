// 定数（自機・弾・移動速度）
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let bossDefeatCount = 0;  // 全体のボス撃破数（「もう一度プレイ」でリセット）
let playerFireInterval = null;
let bossMoveInterval = null;
let bossBulletPatternToggle = false; // 弾幕パターン切替用

// DOM要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const restartButton = document.getElementById("restartButton");
const nextBossButton = document.getElementById("nextBossButton");
const bossDefeatCountDisplay = document.getElementById("bossDefeatCountDisplay");

// 初期化：ゲーム全体のリセット（再プレイ時は敵撃破数リセット）
function initGame() {
  // リセット：ボス撃破数をクリア
  bossDefeatCount = 0;
  cleanupIntervals();
  playerBullets = [];
  bossBullets = [];
  keys = {};
  gameRunning = true;
  startTime = new Date();

  // キャンバスサイズ設定（画面サイズに応じる）
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);

  // プレイヤー初期位置：下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };

  // 初回ボス設定
  initBoss();

  // ボタン非表示
  restartButton.style.display = "none";
  nextBossButton.style.display = "none";
  document.getElementById("gameOverText") && (document.getElementById("gameOverText").style.display = "none");
  updateBossDefeatDisplay();
  scoreDisplay.textContent = "Score: 0.00秒";

  // プレイヤー自動発射（0.1秒間隔）
  playerFireInterval = setInterval(() => {
    if (gameRunning) {
      playerBullets.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y,
        dx: 0,
        dy: -5
      });
    }
  }, 100);

  // ボス移動更新（0.5秒ごとにランダムな速度に変更）
  bossMoveInterval = setInterval(() => {
    if (boss && boss.health > 0) {
      boss.vx = (Math.random() - 0.5) * 4; // -2〜+2
      boss.vy = (Math.random() - 0.5) * 4; // -2〜+2
    }
  }, 500);

  requestAnimationFrame(gameLoop);
}

// ボス初期化：HP = (撃破数+1)*3、特殊ボスは5回に1回（七色）
function initBoss() {
  let hp = (bossDefeatCount + 1) * 3;
  let special = ((bossDefeatCount + 1) % 5 === 0);
  let colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
  let color = special ? "rainbow" : colors[bossDefeatCount % colors.length];
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: hp,
    lastShotTime: 0,
    shotInterval: 2000, // 2秒間隔で発射
    vx: 0,
    vy: 0,
    color: color,
    special: special
  };
}

// クリア時のインターバル解除
function cleanupIntervals() {
  if (playerFireInterval) clearInterval(playerFireInterval);
  if (bossMoveInterval) clearInterval(bossMoveInterval);
}

// ボス撃破数表示更新
function updateBossDefeatDisplay() {
  bossDefeatCountDisplay.textContent = bossDefeatCount;
}

// ゲームループ
function gameLoop() {
  if (!gameRunning) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 自機移動（キー入力）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 自機がキャンバス内に収まるように
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));

  // 自機描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

  // 自機弾の更新＆描画
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let bullet = playerBullets[i];
    bullet.y += bullet.dy;
    // 自機弾描画（白い円）
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 衝突判定：自機弾がボスに命中
    if (boss && boss.health > 0 &&
        bullet.x > boss.x && bullet.x < boss.x + boss.width &&
        bullet.y > boss.y && bullet.y < boss.y + boss.height) {
      boss.health -= 1;
      playerBullets.splice(i, 1);
      if (boss.health <= 0) {
        bossDefeated();
      }
      continue;
    }
    // キャンバス外なら削除
    if (bullet.y < -10) playerBullets.splice(i, 1);
  }

  // ボスの位置更新（移動）
  if (boss && boss.health > 0) {
    boss.x += boss.vx;
    boss.y += boss.vy;
    // 壁で反転
    if (boss.x < 0 || boss.x + boss.width > canvas.width) {
      boss.vx = -boss.vx;
      boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    }
    if (boss.y < 0 || boss.y + boss.height > canvas.height) {
      boss.vy = -boss.vy;
      boss.y = Math.max(0, Math.min(canvas.height - boss.height, boss.y));
    }
  }

  // ボスが発射する
  if (boss && boss.health > 0 && Date.now() - boss.lastShotTime > boss.shotInterval) {
    fireBossBulletPattern();
    boss.lastShotTime = Date.now();
  }

  // ボス弾の更新＆描画
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    let bullet = bossBullets[i];
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    // 敵弾描画（桜の花びらパターン）
    drawSakuraBullet(bullet.x, bullet.y, BULLET_SIZE * 4);
    // 衝突判定：敵弾が自機に命中
    if (bullet.x > player.x && bullet.x < player.x + PLAYER_SIZE &&
        bullet.y > player.y && bullet.y < player.y + PLAYER_SIZE) {
      gameOver();
    }
    // キャンバス外なら削除
    if (bullet.x < -10 || bullet.x > canvas.width + 10 ||
        bullet.y < -10 || bullet.y > canvas.height + 10) {
      bossBullets.splice(i, 1);
    }
  }

  // ボス描画
  if (boss && boss.health > 0) {
    if (boss.special) {
      // 特殊ボスは七色グラデーション
      let grad = ctx.createLinearGradient(boss.x, boss.y, boss.x + boss.width, boss.y + boss.height);
      const rainbow = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
      let step = 1 / (rainbow.length - 1);
      rainbow.forEach((col, idx) => grad.addColorStop(idx * step, col));
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

  // スコア表示（生存時間）
  let elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒`;

  requestAnimationFrame(gameLoop);
}

// ボス弾パターン発射
function fireBossBulletPattern() {
  let numBullets, speed;
  if (boss.special) {
    numBullets = 20;
    speed = 4;
  } else {
    if (bossBulletPatternToggle) {
      numBullets = 16;
      speed = 3;
    } else {
      numBullets = 12;
      speed = 3;
    }
    bossBulletPatternToggle = !bossBulletPatternToggle;
  }
  for (let i = 0; i < numBullets; i++) {
    let angle = (2 * Math.PI / numBullets) * i;
    bossBullets.push({
      x: boss.x + boss.width / 2,
      y: boss.y + boss.height / 2,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed
    });
  }
}

// 桜の花びら弾の描画（drawSakuraBullet）
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

// 花びらを描く（ベジェ曲線）
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

// ボス撃破時の処理
function bossDefeated() {
  bossDefeatCount++;
  updateBossDefeatDisplay();
  // ゲーム状態を一時停止し、次のボスへ誘導
  gameRunning = false;
  // 表示変更
  let gameOverElem = document.getElementById("gameOverText");
  if (!gameOverElem) {
    gameOverElem = document.createElement("h2");
    gameOverElem.id = "gameOverText";
    document.querySelector("header").appendChild(gameOverElem);
  }
  gameOverElem.textContent = "You Win!";
  gameOverElem.style.display = "block";
  nextBossButton.style.display = "inline-block";
}

// ゲームオーバー（自機被弾）の処理
function gameOver() {
  gameRunning = false;
  let gameOverElem = document.getElementById("gameOverText");
  if (!gameOverElem) {
    gameOverElem = document.createElement("h2");
    gameOverElem.id = "gameOverText";
    document.querySelector("header").appendChild(gameOverElem);
  }
  gameOverElem.textContent = "Game Over!";
  gameOverElem.style.display = "block";
  restartButton.style.display = "inline-block";
}

// 次のボスへ
function nextBoss() {
  // クリアして新たなボスを出現（弾はクリア）
  bossBullets = [];
  playerBullets = [];
  initBoss();
  nextBossButton.style.display = "none";
  document.getElementById("gameOverText").style.display = "none";
  gameRunning = true;
  requestAnimationFrame(gameLoop);
}

// キー操作：移動は常時反映。ゲーム停止時はスペースまたは Rキーで再スタート／次のボスへ
document.addEventListener("keydown", (e) => {
  // 通常操作用のキー状態更新（移動キーは常時）
  if (gameRunning) {
    keys[e.key] = true;
  } else {
    if (document.getElementById("gameOverText").textContent === "Game Over!") {
      if (e.key === " " || e.key.toLowerCase() === "r") {
        initGame();
      }
    } else if (document.getElementById("gameOverText").textContent === "You Win!") {
      if (e.key === " " || e.key.toLowerCase() === "r") {
        nextBoss();
      }
    }
  }
});
document.addEventListener("keyup", (e) => { keys[e.key] = false; });

// スマホ用スワイプ操作（スクロール防止）
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

// ボタンのクリックイベント
restartButton.addEventListener("click", initGame);
nextBossButton.addEventListener("click", nextBoss);
window.addEventListener("resize", initGame);
