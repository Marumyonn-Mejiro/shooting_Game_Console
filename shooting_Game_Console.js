// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");
const nextBossButton = document.getElementById("nextBossButton");

// 定数（プレイヤー、弾、移動速度など）
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連の変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let gameOutcome = ""; // "You Win!" または "Game Over!"
let bossDefeatedCount = 0; // ボス撃破数（継続カウント）
let autoFireInterval = null;
let bossDirInterval = null;

// ボスの移動用速度
function setNewBossDirection() {
  // ランダムな速度（x: -max to +max, y: -max to +max）
  boss.vx = (Math.random() - 0.5) * 4;  // 例：-2～+2
  boss.vy = (Math.random() - 0.5) * 4;
}

// ボスの色設定（毎回変化、5回に一回は難易度強め→rainbow）
const bossColors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
function getBossColor() {
  // 難易度強めボス：bossDefeatedCount+1 が5の倍数の場合
  if ((bossDefeatedCount + 1) % 5 === 0) {
    return "rainbow"; // 描画時に特殊処理
  }
  return bossColors[bossDefeatedCount % bossColors.length];
}

// ★ ゲーム初期化 ★
function initGame(resetBossCount = true) {
  // キャンバスサイズの設定（画面サイズに合わせる）
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤーはキャンバス下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // ボス設定：HP = (bossDefeatedCount+1)*3
  if (resetBossCount) {
    bossDefeatedCount = 0;
  }
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (bossDefeatedCount + 1) * 3,
    lastShotTime: 0,
    shotInterval: 1000, // 弾幕発射間隔を短くして大量に発射
    color: getBossColor(),
    vx: 0,
    vy: 0
  };
  
  // 弾用配列の初期化
  bossBullets = [];
  playerBullets = [];
  
  keys = {};
  gameRunning = true;
  gameOutcome = "";
  startTime = new Date();
  
  // 表示初期化
  scoreDisplay.textContent = `Score: 0.00秒 | Boss Defeated: ${bossDefeatedCount}`;
  gameOverText.style.display = "none";
  restartButton.style.display = "none";
  nextBossButton.style.display = "none";
  
  // 自動発射：プレイヤーは0.1秒間隔で弾を発射（スペースキーによる発射も残す）
  if (autoFireInterval) clearInterval(autoFireInterval);
  autoFireInterval = setInterval(() => {
    if (gameRunning) {
      playerBullets.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y,
        dx: 0,
        dy: -5
      });
    }
  }, 100);
  
  // ボス移動：0.5秒ごとに移動方向を更新
  if (bossDirInterval) clearInterval(bossDirInterval);
  setNewBossDirection();
  bossDirInterval = setInterval(() => {
    setNewBossDirection();
  }, 500);
  
  gameLoop();
}
window.addEventListener("resize", () => { if (gameRunning) initGame(false); });
initGame();

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // スペースキーで自機弾発射（ゲーム中のみ）
  if (e.key === " " && gameRunning) {
    playerBullets.push({
      x: player.x + PLAYER_SIZE / 2,
      y: player.y,
      dx: 0,
      dy: -5
    });
    e.preventDefault();
  }
  // ゲームオーバー後にRキーで再スタート（完全リセット）
  if (e.key === "r" && !gameRunning) {
    initGame(true);
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
    // ゲーム終了時：ボス撃破なら「次のボスへ」ボタン、プレイヤー被弾なら「もう一度プレイ」
    gameOverText.textContent = gameOutcome;
    gameOverText.style.display = "block";
    if (gameOutcome === "You Win!") {
      nextBossButton.style.display = "inline-block";
    } else {
      restartButton.style.display = "inline-block";
    }
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
  
  // ★ ボスの移動 ★
  if (boss && boss.health > 0) {
    boss.x += boss.vx;
    boss.y += boss.vy;
    // 制限：ボスは画面全体を移動（ただし画面外に出ないように）
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height - boss.height, boss.y));
  
    // ★ ボスの発射処理 ★
    if (Date.now() - boss.lastShotTime > boss.shotInterval) {
      // ボスの弾幕パターン：難易度ボス（rainbow状態）なら弾数・速度変化
      let numBullets, speed;
      if (boss.color === "rainbow") {
        numBullets = 16;
        speed = 4;
      } else {
        numBullets = 12;
        speed = 3;
      }
      // 放射状に桜の花びら型の弾を大量に発射（タイトな配置）
      for (let i = 0; i < numBullets; i++) {
        let angle = (2 * Math.PI / numBullets) * i;
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
    // 描画：桜の花びら型弾
    drawSakuraBullet(bullet.x, bullet.y, 3);
    // 衝突判定（自機との当たり判定は円形の範囲でチェック）
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
    // 描画：白い円
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 衝突判定：自機弾とボス（描画に合わせた当たり判定：点と矩形の衝突）
    if (boss && rectCircleCollision(boss.x, boss.y, boss.width, boss.height, bullet.x, bullet.y, 3)) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      if (boss.health <= 0) {
        // ボス撃破
        bossDefeatedCount++;
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
    // 描画：ボスの色が"rainbow"の場合、七色に光るエフェクト（ここでは単純にグラデーションで表現）
    if (boss.color === "rainbow") {
      let grad = ctx.createLinearGradient(boss.x, boss.y, boss.x + boss.width, boss.y + boss.height);
      // 7色のグラデーション
      grad.addColorStop(0, "red");
      grad.addColorStop(0.17, "orange");
      grad.addColorStop(0.34, "yellow");
      grad.addColorStop(0.51, "green");
      grad.addColorStop(0.68, "blue");
      grad.addColorStop(0.85, "indigo");
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
  
  // ★ 敵撃破数（ボス撃破数）表示 ★
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(`Boss Defeated: ${bossDefeatedCount}`, 10, 20);
  
  // 生存時間（スコア）の更新表示
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒 | Boss Defeated: ${bossDefeatedCount}`;
  
  requestAnimationFrame(gameLoop);
}

// ★ 当たり判定：円と矩形の衝突判定 ★
function rectCircleCollision(rx, ry, rw, rh, cx, cy, cr) {
  let nearestX = Math.max(rx, Math.min(cx, rx + rw));
  let nearestY = Math.max(ry, Math.min(cy, ry + rh));
  let dx = cx - nearestX;
  let dy = cy - nearestY;
  return (dx * dx + dy * dy) < cr * cr;
}

// ★ 当たり判定：円と矩形（同上）★
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

// ★ ボタン処理 ★
restartButton.addEventListener("click", () => {
  // 再スタート時は敵撃破数（ボス撃破数）をリセット
  bossDefeatedCount = 0;
  initGame(true);
});

nextBossButton.addEventListener("click", () => {
  // 次のボスへ進む：ボス撃破数はそのまま、次のボスのHP・色を更新
  // 新たなボスHP = (bossDefeatedCount+1)*3
  initGame(false);
});

// ★ スペースキーで弾発射、Rキーで再スタート ★
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
    initGame(true);
  }
});

// ★ ボス復活時の色更新 ★
// この関数は、boss.color を更新するために呼び出されます。
function updateBossColor() {
  const col = getBossColor();
  boss.color = col;
}

// ★ getBossColor: ボスの色を返す ★
function getBossColor() {
  // 難易度強めボス： (bossDefeatedCount+1) が5の倍数の場合
  if ((bossDefeatedCount + 1) % 5 === 0) {
    return "rainbow";
  }
  return bossColors[bossDefeatedCount % bossColors.length];
}
