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
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let gameOutcome = ""; // "You Win!" または "Game Over!"
let enemyDefeatedCount = 0; // 敵撃破数
let playerFireInterval = null; // 自機自動発射用タイマー

// 色設定用（通常ボス用の候補）
const normalBossColors = ["red", "green", "blue", "purple", "orange", "cyan", "magenta"];

// ランダムな色を返す
function getRandomColor() {
  return normalBossColors[Math.floor(Math.random() * normalBossColors.length)];
}

// ★ ボス描画時の色設定 ★
function drawBoss(boss) {
  // 難易度強めボスの場合（5回ごと）
  if (boss.color === "rainbow") {
    const rainbowColors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    const index = Math.floor((Date.now() / 200) % rainbowColors.length);
    ctx.fillStyle = rainbowColors[index];
  } else {
    ctx.fillStyle = boss.color;
  }
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  // HP表示
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.fillText("HP: " + boss.health, boss.x, boss.y - 5);
}

// ★ ゲーム初期化 ★
function initGame() {
  // キャンバスサイズ設定
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤーは下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // 初回は敵撃破数リセット
  enemyDefeatedCount = 0;
  
  // ボス設定：HPは (撃破数+1)*3、色はランダム（通常ボス）
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (enemyDefeatedCount + 1) * 3,
    lastShotTime: 0,
    shotInterval: 1000, // 発射間隔を短く（タイトな弾幕）
    vx: 0,
    vy: 0,
    lastDirectionChange: Date.now(),
    color: getRandomColor()
  };
  
  // ボス自動発射の弾幕は大量に（16発）
  bossBullets = [];
  // 自機弾用配列
  playerBullets = [];
  
  keys = {};
  gameRunning = true;
  gameOutcome = "";
  startTime = new Date();
  
  // タイマーは初期化時にクリア
  if (playerFireInterval !== null) clearInterval(playerFireInterval);
  // 自機は0.1秒間隔で常に前方へ自動発射
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
  
  // 表示初期化
  scoreDisplay.textContent = `Score: 0.00秒 | 敵撃破数: ${enemyDefeatedCount}`;
  gameOverText.style.display = "none";
  restartButton.style.display = "none";
  
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // スペースキーは自動発射専用（ここでは何もしない）
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
  
  // 自機移動（ユーザー入力）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 自機位置の制限
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画（矩形）
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // ★ ボスの移動 ★
  if (boss && boss.health > 0) {
    // 0.5秒間隔で新しい移動方向を設定
    if (Date.now() - boss.lastDirectionChange >= 500) {
      // 移動速度はランダム（例えば -2〜+2 ピクセル/フレーム）
      boss.vx = (Math.random() * 4 - 2);
      boss.vy = (Math.random() * 4 - 2);
      boss.lastDirectionChange = Date.now();
    }
    // 位置更新
    boss.x += boss.vx;
    boss.y += boss.vy;
    // 移動範囲の制限：ボスは画面上半分に留める
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height/2 - boss.height, boss.y));
  
    // ★ ボスの発射処理 ★
    if (Date.now() - boss.lastShotTime >= boss.shotInterval) {
      const numBullets = 16;  // タイトな弾幕：16発
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
    // 自機との当たり判定（描画に応じた単純な矩形内判定）
    if (
      bullet.x > player.x && bullet.x < player.x + PLAYER_SIZE &&
      bullet.y > player.y && bullet.y < player.y + PLAYER_SIZE
    ) {
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
    // 白い円で描画
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 当たり判定：自機弾がボスの描画領域に入れば命中
    if (
      boss && bullet.x > boss.x && bullet.x < boss.x + boss.width &&
      bullet.y > boss.y && bullet.y < boss.y + boss.height
    ) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      // ボスが倒れたとき
      if (boss.health <= 0) {
        enemyDefeatedCount++;
        // 新たなボスHPは (撃破数+1)*3
        boss.health = (enemyDefeatedCount + 1) * 3;
        // ボス色を変更：5回ごとに難易度強め（rainbow:七色）
        if ((enemyDefeatedCount + 1) % 5 === 0) {
          boss.color = "rainbow";
        } else {
          boss.color = getRandomColor();
        }
        // 敵撃破時、ボスをランダムな位置に再配置
        boss.x = Math.random() * (canvas.width - boss.width);
        boss.y = Math.random() * (canvas.height/2 - boss.height);
        // 方向変更タイミングリセット
        boss.lastDirectionChange = Date.now();
      }
    }
    // 画面外なら削除
    if (bullet.y < 0) {
      playerBullets.splice(index, 1);
    }
  });
  
  // ★ ボス描画 ★
  if (boss && boss.health > 0) {
    drawBoss(boss);
  }
  
  // ★ 敵撃破数表示 ★
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(`敵撃破数: ${enemyDefeatedCount}`, 10, 20);
  
  // 生存時間（スコア）の更新表示
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

// ★ ランダムな色を返す関数 ★
function getRandomColor() {
  const colors = ["red", "green", "blue", "purple", "orange", "cyan", "magenta"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ★ 再プレイボタンの処理 ★
restartButton.addEventListener("click", () => {
  // 再スタート時は撃破数リセット
  enemyDefeatedCount = 0;
  initGame();
});

// ★ スペースキーで弾発射、Rキーで再スタート ★
// ※ 自機の弾は自動発射されるため、ここでは再スタートのみ対応
document.addEventListener("keydown", (e) => {
  if (e.key === "r" && !gameRunning) {
    initGame();
  }
});
