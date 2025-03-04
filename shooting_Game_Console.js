// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const bossDefeatDisplay = document.getElementById("bossDefeatDisplay");
const gameOverText = document.getElementById("gameOverText");
const bossClearText = document.getElementById("bossClearText");
const nextBossButton = document.getElementById("nextBossButton");
const restartButtonGlobal = document.getElementById("restartButtonGlobal");

// 定数
const PLAYER_SIZE = 10;
const PLAYER_SPEED = 4;
const BULLET_SIZE = 5;
const PLAYER_BULLET_SPEED = 7;  // 自機弾の速度
const BOSS_BULLET_SPEED = 3;    // ボス弾の基本速度
const AUTO_FIRE_INTERVAL = 100; // 0.1秒間隔

// ゲーム状態用変数
let player;
let boss;
let bossBullets = [];
let playerBullets = [];
let keys = {};
let gameRunning = false; // ゲームプレイ中ならtrue
let gameOver = false;    // プレイヤー死亡時true
let bossClear = false;   // ボス撃破時true
let startTime;
let autoFireTimer;       // 自動発射用タイマー
let bossMoveTimer;       // ボスの移動方向変更タイマー
let bossDefeatCount = 0; // ボス撃破数（全体リセット時はリセットされる）
let bossNextColorIndex = 0; // 次ボスの色インデックス（変化用）
const bossColors = ["red", "orange", "yellow", "lime", "cyan", "blue", "magenta"];
// 特定条件での難易度強化用（5回ごとに七色ボス）
  
// ★ ゲーム初期化 ★
function initGame(fullReset = true) {
  // キャンバスサイズ設定（画面サイズに応じる）
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤー初期化（下部中央）
  player = { x: canvas.width / 2 - PLAYER_SIZE/2, y: canvas.height - 30 };
  
  // ボス初期化
  // ボスHP = (bossDefeatCount + 1) * 3
  const hp = (bossDefeatCount + 1) * 3;
  // 初期ボス位置：上半分の中央付近（ランダム微調整可）
  boss = {
    x: canvas.width / 2 - 20 + Math.random() * 20 - 10,
    y: 20 + Math.random() * 20,
    width: 40,
    height: 20,
    health: hp,
    shotInterval: 2000,   // 2秒間隔で弾幕発射
    lastShotTime: 0,
    color: ( (bossDefeatCount + 1) % 5 === 0 ) ? "rainbow" : bossColors[bossNextColorIndex],
    moveDirection: { dx: 0, dy: 0 }
  };
  // 更新：次のボスの色を順次変更
  bossNextColorIndex = (bossNextColorIndex + 1) % bossColors.length;
  
  // 弾配列クリア
  bossBullets = [];
  playerBullets = [];
  
  keys = {};
  gameRunning = true;
  gameOver = false;
  bossClear = false;
  startTime = new Date();
  
  // 自動発射開始（プレイヤーは0.1秒間隔で常に上方向へ弾を発射）
  if (autoFireTimer) clearInterval(autoFireTimer);
  autoFireTimer = setInterval(() => {
    if (gameRunning && !gameOver && !bossClear) {
      playerBullets.push({
        x: player.x + PLAYER_SIZE/2,
        y: player.y,
        dx: 0,
        dy: -PLAYER_BULLET_SPEED
      });
    }
  }, AUTO_FIRE_INTERVAL);
  
  // ボス移動：0.5秒ごとに移動方向をランダムに変更
  if (bossMoveTimer) clearInterval(bossMoveTimer);
  bossMoveTimer = setInterval(() => {
    if (gameRunning && boss) {
      // 移動速度：ボスは画面全体を移動するよう、dx/dy はランダムに -3〜3（例）
      boss.moveDirection.dx = (Math.random() - 0.5) * 6;
      boss.moveDirection.dy = (Math.random() - 0.5) * 6;
    }
  }, 500);
  
  // UIリセット
  scoreDisplay.textContent = "Score: 0.00秒";
  bossDefeatDisplay.textContent = "Boss撃破数: " + bossDefeatCount;
  gameOverText.style.display = "none";
  bossClearText.style.display = "none";
  nextBossButton.style.display = "none";
  restartButtonGlobal.style.display = fullReset ? "block" : "none";
  
  // ゲームループ開始
  gameLoop();
}
window.addEventListener("resize", () => { if (gameRunning) initGame(false); });
initGame(true); // 初回は全体リセット

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // ゲームオーバーまたはボスクリア時：スペースキーまたはRキーで再スタート／次ボスへ
  if (!gameRunning && (e.key === " " || e.key.toLowerCase() === "r")) {
    // ゲームオーバーなら全体リセット（敵撃破数リセット）
    if (gameOver) {
      bossDefeatCount = 0;
      initGame(true);
    } else if (bossClear) {
      // ボスクリアなら次のボスへ（撃破数は継続）
      initGame(false);
    }
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
    // ゲーム終了時のUI表示（オーバーレイ）
    if (gameOver) {
      gameOverText.textContent = "Game Over!";
      gameOverText.style.display = "block";
    }
    if (bossClear) {
      bossClearText.textContent = "Boss撃破！";
      bossClearText.style.display = "block";
      nextBossButton.style.display = "block";
    }
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // プレイヤー移動
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 移動制限：自機はキャンバス内に収める
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // 自機弾の更新＆描画
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let bullet = playerBullets[i];
    bullet.y += bullet.dy;
    // 描画：白色の丸
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 画面外なら削除
    if (bullet.y < -BULLET_SIZE) {
      playerBullets.splice(i, 1);
      continue;
    }
    // 当たり判定：自機弾とボス
    if (boss && bullet.x > boss.x && bullet.x < boss.x + boss.width &&
        bullet.y > boss.y && bullet.y < boss.y + boss.height) {
      boss.health -= 1;
      playerBullets.splice(i, 1);
      if (boss.health <= 0) {
        // ボス撃破：次のボスへ進むための状態に
        bossDefeatCount++;
        gameRunning = false;
        bossClear = true;
      }
    }
  }
  
  // ボスのランダム移動（縦横無尽に動く）
  if (boss && boss.health > 0) {
    boss.x += boss.moveDirection.dx;
    boss.y += boss.moveDirection.dy;
    // 移動制限：ボスは画面内全体に
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height - boss.height, boss.y));
  }
  
  // ボス弾の発射：一定間隔ごとに、ボス中心から「タイトな」放射状弾幕を大量に発射
  if (boss && boss.health > 0 && Date.now() - boss.lastShotTime > boss.shotInterval) {
    const numBullets = 16; // タイトな角度で多数発射
    for (let i = 0; i < numBullets; i++) {
      let angle = (2 * Math.PI / numBullets) * i;
      // ボス弾は桜の花びらの形状で描画（下記関数利用）
      bossBullets.push({
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height / 2,
        dx: Math.cos(angle) * BOSS_BULLET_SPEED,
        dy: Math.sin(angle) * BOSS_BULLET_SPEED
      });
    }
    boss.lastShotTime = Date.now();
  }
  
  // ボス弾の更新＆描画
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    let bullet = bossBullets[i];
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    // 描画：桜の花びら状の弾（タイトなサイズ）
    drawSakuraBullet(bullet.x, bullet.y, BULLET_SIZE * 4);
    // 当たり判定：ボス弾と自機（描画に基づいた簡易な円判定）
    let dx = bullet.x - (player.x + PLAYER_SIZE/2);
    let dy = bullet.y - (player.y + PLAYER_SIZE/2);
    if (Math.sqrt(dx*dx + dy*dy) < 7) {
      gameRunning = false;
      gameOver = true;
    }
    // 画面外なら削除
    if (bullet.x < -BULLET_SIZE || bullet.x > canvas.width + BULLET_SIZE ||
        bullet.y < -BULLET_SIZE || bullet.y > canvas.height + BULLET_SIZE) {
      bossBullets.splice(i, 1);
    }
  }
  
  // ボス描画（色は boss.color。難易度強化ボスは "rainbow" 表示）
  if (boss && boss.health > 0) {
    if (boss.color === "rainbow") {
      // 七色に光る効果：各フレームでグラデーションのように変化
      let r = Math.floor(128 + 127 * Math.sin(Date.now()/200));
      let g = Math.floor(128 + 127 * Math.sin(Date.now()/250 + 2));
      let b = Math.floor(128 + 127 * Math.sin(Date.now()/300 + 4));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
    } else {
      ctx.fillStyle = boss.color;
    }
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    // ボスHP表示
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("HP: " + boss.health, boss.x, boss.y - 5);
  }
  
  // スコア更新：生存秒数
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒`;
  bossDefeatDisplay.textContent = "Boss撃破数: " + bossDefeatCount;
  
  requestAnimationFrame(gameLoop);
}

// ★ 桜の花びら状弾の描画 ★
function drawSakuraBullet(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  // 描画は5枚の花びら＋中心円で表現
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / 5);
    drawPetal(size);
    ctx.restore();
  }
  // 中心部分
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

// ★ 次のボスへボタンの処理 ★
nextBossButton.addEventListener("click", () => {
  // 次ボスへ進むときは、ゲーム状態をリセット（プレイヤー位置、弾クリア）し、ボス撃破数は継続
  initGame(false);
});

// ★ 全体リセット用グローバル再プレイボタン ★
restartButtonGlobal.addEventListener("click", () => {
  bossDefeatCount = 0;
  initGame(true);
});

// ※ ゲームオーバー後は、キーボード（スペースキーまたはRキー）でも再スタート／次のボスへ進める（上記keydownハンドラで対応済み）
