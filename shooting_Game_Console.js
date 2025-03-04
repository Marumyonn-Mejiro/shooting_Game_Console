// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");
const nextBossButton = document.getElementById("nextBossButton");

// 定数（サイズ、速度など）
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連の変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let gameOutcome = ""; // "You Win!" または "Game Over!"
let enemyDefeatedCount = 0; // 累計ボス撃破数

// インターバル用ID
let playerFireInterval, bossMoveInterval;

// ボスの色リスト（通常ボス用）
const bossColors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
let bossColorIndex = 0;

// ★ ゲーム初期化 ★
// resetCount: true の場合、敵撃破数もリセット（＝完全リスタート）
function initGame(resetCount = true) {
  // リセットの場合は撃破数を0に
  if(resetCount) enemyDefeatedCount = 0;
  
  // キャンバスサイズ設定
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤー初期位置（下中央）
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // 新規ボスを生成
  spawnBoss();
  
  // 弾用配列初期化
  bossBullets = [];
  playerBullets = [];
  
  keys = {};
  gameRunning = true;
  gameOutcome = "";
  startTime = new Date();
  
  // ボタン非表示
  gameOverText.style.display = "none";
  restartButton.style.display = "none";
  nextBossButton.style.display = "none";
  
  // 自動プレイヤー発射（0.1秒毎）
  if(playerFireInterval) clearInterval(playerFireInterval);
  playerFireInterval = setInterval(() => {
    if(gameRunning) {
      playerBullets.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y,
        dx: 0,
        dy: -5
      });
    }
  }, 100);
  
  // ボス移動用：0.5秒毎に新たな方向を設定
  if(bossMoveInterval) clearInterval(bossMoveInterval);
  bossMoveInterval = setInterval(() => {
    if(boss && gameRunning) {
      let angle = Math.random() * 2 * Math.PI;
      let speed = 2;
      boss.dx = Math.cos(angle) * speed;
      boss.dy = Math.sin(angle) * speed;
    }
  }, 500);
  
  gameLoop();
}
window.addEventListener("resize", () => { if(gameRunning) initGame(false); });
initGame();

// ★ ボス生成 ★
function spawnBoss() {
  // 新規ボスのHP = (撃破数 + 1) * 3
  const newHP = (enemyDefeatedCount + 1) * 3;
  // 特殊ボス（難易度強め）：5回に一回
  const special = ((enemyDefeatedCount + 1) % 5 === 0);
  // ボス色：特殊なら七色エフェクト用（ここでは "rainbow" として扱い、描画で変化させる）、通常なら循環
  let color;
  if(special) {
    color = "rainbow";
  } else {
    color = bossColors[bossColorIndex % bossColors.length];
    bossColorIndex++;
  }
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: newHP,
    lastShotTime: 0,
    shotInterval: 1500, // タイトな弾幕のため発射間隔を短く
    dx: 0,
    dy: 0,
    color: color,
    special: special  // trueなら特殊ボス
  };
}

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // スペースキーで即時発射（補助として）
  if (e.key === " " && gameRunning) {
    playerBullets.push({
      x: player.x + PLAYER_SIZE / 2,
      y: player.y,
      dx: 0,
      dy: -5
    });
    e.preventDefault();
  }
  // ゲームオーバー後にRキーで再スタート（リセット）
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

// ★ 「次のボスへ」ボタン処理 ★
nextBossButton.addEventListener("click", () => {
  // 新しいボスを生成（撃破数はそのまま）
  spawnBoss();
  nextBossButton.style.display = "none";
  // 再開するため、再度ボス移動インターバルを設定
  if(bossMoveInterval) clearInterval(bossMoveInterval);
  bossMoveInterval = setInterval(() => {
    if(boss && gameRunning) {
      let angle = Math.random() * 2 * Math.PI;
      let speed = 2;
      boss.dx = Math.cos(angle) * speed;
      boss.dy = Math.sin(angle) * speed;
    }
  }, 500);
  gameRunning = true;
  // reset boss lastShotTime so that boss can shoot immediately
  boss.lastShotTime = Date.now();
  gameLoop();
});

// ★ ゲームループ ★
function gameLoop() {
  if (!gameRunning) {
    // ゲーム終了状態：すでに次のボスまたは再スタートのボタンは表示済み
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 自機を画面内に制限
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // ★ ボス移動 ★
  if (boss && boss.health > 0) {
    boss.x += boss.dx;
    boss.y += boss.dy;
    // 制限：ボスは画面全体内に収める
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height - boss.height, boss.y));
    
    // ボス描画（色は boss.color、特殊ボスの場合は七色効果を模擬）
    if(boss.special) {
      // 簡易的な七色エフェクト：色を時間とともに変化させる
      const rainbowColors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
      let colorIndex = Math.floor(Date.now() / 100) % rainbowColors.length;
      ctx.fillStyle = rainbowColors[colorIndex];
    } else {
      ctx.fillStyle = boss.color;
    }
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    // ボスHP表示
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("HP: " + boss.health, boss.x, boss.y - 5);
  }
  
  // ★ ボス弾発射 ★
  if (boss && boss.health > 0 && Date.now() - boss.lastShotTime > boss.shotInterval) {
    // タイトな桜の花びら弾幕：例として20発
    const numBullets = 20;
    for (let i = 0; i < numBullets; i++) {
      let angle = (2 * Math.PI / numBullets) * i;
      let speed = 3;
      // ボス弾の色：特殊ボスなら七色効果、通常は同色
      let bulletColor = "";
      if(boss.special) {
        const rainbowColors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
        bulletColor = rainbowColors[Math.floor(Math.random()*rainbowColors.length)];
      } else {
        bulletColor = boss.color;
      }
      bossBullets.push({
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height / 2,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color: bulletColor
      });
    }
    boss.lastShotTime = Date.now();
  }
  
  // ★ ボス弾の更新＆描画 ★
  bossBullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    drawSakuraBullet(bullet.x, bullet.y, 3, bullet.color);
    // 自機との当たり判定（円と矩形の簡易判定）
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
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 当たり判定：自機弾とボス（矩形と点の判定）
    if (
      boss && bullet.x > boss.x && bullet.x < boss.x + boss.width &&
      bullet.y > boss.y && bullet.y < boss.y + boss.height
    ) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      // ボスが倒れた場合
      if (boss.health <= 0) {
        enemyDefeatedCount++;
        // ボス撃破時は自動射撃・移動停止
        clearInterval(bossMoveInterval);
        clearInterval(playerFireInterval);
        // 状態は「ボス撃破」→次のボスへボタンを表示
        gameOutcome = "You Win!";
        gameRunning = false;
        nextBossButton.style.display = "inline-block";
      }
    }
    // 画面外なら削除
    if (bullet.y < 0) {
      playerBullets.splice(index, 1);
    }
  });
  
  // ★ 敵撃破数表示 ★
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(`敵撃破数: ${enemyDefeatedCount}`, 10, 20);
  
  // 生存時間（スコア）の更新表示（連続時間）
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒　｜　敵撃破数: ${enemyDefeatedCount}`;
  
  requestAnimationFrame(gameLoop);
}

// ★ 桜の花びら描画関数 ★
// colorParam: 指定があればその色で描画、未指定の場合は既定のピンク
function drawSakuraBullet(x, y, size, colorParam) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / 5);
    drawPetal(size, colorParam);
    ctx.restore();
  }
  // 中心部分（ハイライト）
  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawPetal(size, colorParam) {
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
  ctx.fillStyle = colorParam ? colorParam : "pink";
  ctx.fill();
}

// ★ 再プレイボタンの処理 ★
// 「もう一度プレイ」＝完全リセット（敵撃破数リセット）
restartButton.addEventListener("click", () => {
  // クリアして全インターバルも停止
  clearInterval(playerFireInterval);
  clearInterval(bossMoveInterval);
  initGame(true);
});

// ★ スペースキーで弾を即時発射、Rキーで再スタート ★
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
