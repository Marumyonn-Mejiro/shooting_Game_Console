// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");

// 定数（プレイヤー、弾、移動速度等）
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let gameOutcome = ""; // "You Win!" または "Game Over!"
let enemyDefeatedCount = 0; // 敵撃破回数（ボスを倒した回数）
let playerFireInterval; // 自動発射タイマー
let bossDirection = { dx: 0, dy: 0 }; // ボスの移動方向
let bossMoveTimer; // ボスの方向変更タイマー
let currentBossColor = "red"; // 通常ボスの初期色
let hardBoss = false; // 難易度強化ボスか否か

// ★ ゲーム初期化 ★
function initGame() {
  // キャンバスサイズ設定（画面サイズに合わせる）
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤーはキャンバス下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // ボス初期設定：HPは(倒した回数+1)*3、初回は3
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (enemyDefeatedCount + 1) * 3,
    lastShotTime: 0,
    shotInterval: 1000 // タイトな弾幕：短い間隔
  };
  
  // ボス色設定：通常は currentBossColor、hardBoss時は特殊な七色エフェクトを後で描画
  // 弾用配列初期化
  bossBullets = [];
  playerBullets = [];
  
  keys = {};
  gameRunning = true;
  gameOutcome = "";
  startTime = new Date();
  
  // 自動発射タイマー開始（0.1秒間隔）
  clearInterval(playerFireInterval);
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
  
  // ボスの移動方向更新（0.5秒ごとにランダム方向に変更）
  clearInterval(bossMoveTimer);
  bossMoveTimer = setInterval(() => {
    // ランダムな単位ベクトルを生成（スピードは2）
    const angle = Math.random() * 2 * Math.PI;
    bossDirection.dx = Math.cos(angle) * 2;
    bossDirection.dy = Math.sin(angle) * 2;
  }, 500);
  
  // 表示初期化
  scoreDisplay.textContent = `Score: 0.00秒 | 敵撃破数: ${enemyDefeatedCount}`;
  gameOverText.style.display = "none";
  restartButton.style.display = "none";
  
  // Reset boss color if restarting game
  if (enemyDefeatedCount === 0) {
    currentBossColor = "red";
    hardBoss = false;
  }
  
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // スペースキーは自動発射のため手動発射は行わない（ここでは無視）
  // ゲームオーバー後にRキーで再スタート
  if (e.key === "r" && !gameRunning) {
    // リセット：倒した敵数をリセット
    enemyDefeatedCount = 0;
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
    clearInterval(playerFireInterval);
    clearInterval(bossMoveTimer);
    gameOverText.textContent = gameOutcome;
    gameOverText.style.display = "block";
    restartButton.style.display = "block";
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動（キー操作）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 自機の移動制限：画面内に収める
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画（円形にして当たり判定を円形に）
  ctx.beginPath();
  ctx.fillStyle = "blue";
  ctx.arc(player.x + PLAYER_SIZE/2, player.y + PLAYER_SIZE/2, PLAYER_SIZE/2, 0, Math.PI*2);
  ctx.fill();
  
  // ★ ボスの移動 ★
  if (boss && boss.health > 0) {
    // ボスは bossDirection に従い移動（画面全体を使用）
    boss.x += bossDirection.dx;
    boss.y += bossDirection.dy;
    // 画面外に出ないように反転
    if (boss.x < 0 || boss.x + boss.width > canvas.width) bossDirection.dx = -bossDirection.dx;
    if (boss.y < 0 || boss.y + boss.height > canvas.height) bossDirection.dy = -bossDirection.dy;
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height - boss.height, boss.y));
  
    // ★ ボスの発射処理 ★
    if (Date.now() - boss.lastShotTime > boss.shotInterval) {
      // 放射状に大量（20発）に弾を発射（タイトな弾幕）
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
    // 描画：桜の花びら型弾（円形群で表現）
    drawSakuraBullet(bullet.x, bullet.y, 3);
    // 当たり判定：円同士の判定（自機の中心との距離）
    const bulletRadius = 3; // 描画時の半径
    const playerCenter = { x: player.x + PLAYER_SIZE/2, y: player.y + PLAYER_SIZE/2 };
    const dx = bullet.x - playerCenter.x;
    const dy = bullet.y - playerCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bulletRadius + PLAYER_SIZE/2) {
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
    // 描画：自機弾は白い円
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 当たり判定：自機弾とボスの円形判定
    if (boss && boss.health > 0) {
      const bossCenter = { x: boss.x + boss.width/2, y: boss.y + boss.height/2 };
      const bulletCenter = { x: bullet.x, y: bullet.y };
      const dxBoss = bossCenter.x - bulletCenter.x;
      const dyBoss = bossCenter.y - bulletCenter.y;
      const distance = Math.sqrt(dxBoss*dxBoss + dyBoss*dyBoss);
      // 当たり判定：ボスを円形と仮定、半径は boss.width/2
      if (distance < (boss.width/2) + 3) {
        boss.health -= 1;
        playerBullets.splice(index, 1);
        // ボスが倒れたとき
        if (boss.health <= 0) {
          enemyDefeatedCount++;
          gameOutcome = "You Win!";
          gameRunning = false;
        }
      }
    }
    // 画面外なら削除
    if (bullet.y < 0) {
      playerBullets.splice(index, 1);
    }
  });
  
  // ★ ボスの描画 ★
  if (boss && boss.health > 0) {
    // 描画：ボスの色は currentBossColor、hardBossなら七色グラデーションで描画
    if (hardBoss) {
      // 簡易的な七色グラデーションを作成
      let grad = ctx.createLinearGradient(boss.x, boss.y, boss.x + boss.width, boss.y + boss.height);
      grad.addColorStop(0, "red");
      grad.addColorStop(0.16, "orange");
      grad.addColorStop(0.33, "yellow");
      grad.addColorStop(0.5, "green");
      grad.addColorStop(0.66, "blue");
      grad.addColorStop(0.83, "indigo");
      grad.addColorStop(1, "violet");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = currentBossColor;
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
  
  // 生存時間（スコア）表示
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

// ★ ボスが倒された場合の処理 ★
function bossDefeated() {
  // 敵撃破数に応じてボスHP上昇：新たなHP = (撃破回数 + 1)*3
  enemyDefeatedCount++;
  // もし倒されたら、ボスを再出現させる
  // 色変更：通常はランダムな色、5回に一回は難易度強化（七色）
  if (enemyDefeatedCount % 5 === 0) {
    hardBoss = true;
  } else {
    hardBoss = false;
    // 適当な色の候補から選ぶ
    const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    currentBossColor = colors[Math.floor(Math.random() * colors.length)];
  }
  // 再出現時のボス設定
  boss.health = (enemyDefeatedCount + 1) * 3;
  boss.x = Math.random() * (canvas.width - boss.width);
  boss.y = Math.random() * (canvas.height/2 - boss.height);
  boss.lastShotTime = Date.now();
  // 既存の弾はクリア
  bossBullets = [];
  playerBullets = [];
}

// ★ 自機弾によってボスHPがゼロになった場合の処理 ★
function checkBossDefeat() {
  if (boss.health <= 0) {
    gameOutcome = "You Win!";
    gameRunning = false;
    bossDefeated();
  }
}

// ★ 再プレイボタンの処理 ★
restartButton.addEventListener("click", () => {
  // リセット時、敵撃破数をリセット
  enemyDefeatedCount = 0;
  initGame();
});

// ★ Rキーで再スタート ★
document.addEventListener("keydown", (e) => {
  if (e.key === "r" && !gameRunning) {
    enemyDefeatedCount = 0;
    initGame();
  }
});
