// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const infoDisplay = document.getElementById("infoDisplay");
const restartButton = document.getElementById("restartButton");
const nextBossContainer = document.getElementById("nextBossContainer");
const nextBossButton = document.getElementById("nextBossButton");
const gameOverMessage = document.getElementById("gameOverMessage");

// 定数
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const PLAYER_SPEED = 4;
const PLAYER_BULLET_SPEED = 5;
const BOSS_BASE_HP = 3; // ボスHP = (bossDefeatCount+1)*3
const BOSS_FIRE_INTERVAL = 1000; // ボスの弾幕発射間隔（ミリ秒）
const BOSS_DIRECTION_INTERVAL = 500; // ボスの移動方向変更間隔
const PLAYER_AUTO_FIRE_INTERVAL = 100; // プレイヤー自動発射間隔（ミリ秒）

// ゲーム関連変数
let player, boss;
let bossBullets = [];
let playerBullets = [];
let keys = {};
let gameRunning = false;
let gameOverFlag = false;
let startTime = 0;
let bossDefeatCount = 0; // ボスを倒した回数（リセットは「もう一度プレイ」で）
let playerAutoFireTimer, bossFireTimer, bossDirectionTimer;
let gameLoopId;

// ボス用のパラメータ（動的に更新）
function createBoss() {
  // ボスHPは (bossDefeatCount+1)*3
  let hp = (bossDefeatCount + 1) * 3;
  // ボスの色：通常は赤；特殊ボス（5回に1回）は七色（multiColor=true）
  let multiColor = ((bossDefeatCount + 1) % 5 === 0);
  // 初期位置：上半分ランダム
  let width = 40, height = 20;
  let x = Math.random() * (canvas.width - width);
  let y = Math.random() * (canvas.height / 2 - height);
  return {
    x, y, width, height, hp,
    multiColor,
    // 初期速度（後で更新）
    dx: 0, dy: 0,
    lastShotTime: 0,
    shotInterval: BOSS_FIRE_INTERVAL
  };
}

// 初期化（resetGame=trueならボス倒数もリセット）
function initGame(resetGame = true) {
  // キャンバスサイズを更新（各端末に最適化）
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤーは画面下部中央
  player = { x: canvas.width / 2 - PLAYER_SIZE/2, y: canvas.height - PLAYER_SIZE - 10 };
  
  // ボスを新規作成（resetGameなら倒数リセット）
  if (resetGame) {
    bossDefeatCount = 0;
  }
  boss = createBoss();
  
  // 弾配列の初期化
  bossBullets = [];
  playerBullets = [];
  
  // キー状態初期化
  keys = {};
  gameRunning = true;
  gameOverFlag = false;
  startTime = new Date();
  
  // 表示初期化
  infoDisplay.textContent = `Score: 0.00秒 | Boss倒した数: ${bossDefeatCount}`;
  gameOverMessage.style.display = "none";
  nextBossContainer.style.display = "none";
  restartButton.style.display = "none";
  
  // 既存のタイマークリア
  clearInterval(playerAutoFireTimer);
  clearInterval(bossFireTimer);
  clearInterval(bossDirectionTimer);
  
  // プレイヤー自動発射開始（0.1秒間隔で上方向へ）
  playerAutoFireTimer = setInterval(() => {
    // 発射位置：プレイヤーの上中央
    playerBullets.push({
      x: player.x + PLAYER_SIZE/2,
      y: player.y,
      dx: 0,
      dy: -PLAYER_BULLET_SPEED
    });
  }, PLAYER_AUTO_FIRE_INTERVAL);
  
  // ボス移動：0.5秒ごとにランダムな方向を設定（スムーズ移動）
  bossDirectionTimer = setInterval(() => {
    // 移動速度の上限（ピクセル/frame）
    const speed = 2 + bossDefeatCount * 0.2; // 徐々に速くなる
    boss.dx = (Math.random() * 2 - 1) * speed;
    boss.dy = (Math.random() * 2 - 1) * speed;
  }, BOSS_DIRECTION_INTERVAL);
  
  // ボスの弾幕発射（放射状の桜弾幕）
  bossFireTimer = setInterval(() => {
    if (boss && boss.hp > 0) {
      // 弾数は、通常は16＋倒した回数*2、特殊ボスなら24＋倒した回数*3
      let numBullets = boss.multiColor ? 24 + bossDefeatCount * 3 : 16 + bossDefeatCount * 2;
      let speed = 3;
      for (let i = 0; i < numBullets; i++) {
        let angle = (2 * Math.PI / numBullets) * i;
        bossBullets.push({
          x: boss.x + boss.width / 2,
          y: boss.y + boss.height / 2,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          // 色はボスの種類に合わせて（特殊ボスはランダムに変化）
          color: boss.multiColor ? getRandomColor() : "pink"
        });
      }
    }
  }, boss.shotInterval);
  
  // ゲームループ開始
  gameLoopId = requestAnimationFrame(gameLoop);
}

// メインのゲームループ
function gameLoop() {
  if (!gameRunning) {
    cancelAnimationFrame(gameLoopId);
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // プレイヤー移動（キー操作）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 画面端に収める
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // プレイヤー描画（青い四角）
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // プレイヤー弾の更新＆描画
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let b = playerBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    drawSakuraBullet(b.x, b.y, BULLET_SIZE * 4, "pink");
    // 当たり判定：プレイヤー弾とボス（描画に合わせた矩形）
    if (boss && b.x > boss.x && b.x < boss.x + boss.width &&
        b.y > boss.y && b.y < boss.y + boss.height) {
      boss.hp -= 1;
      playerBullets.splice(i, 1);
      if (boss.hp <= 0) {
        // ボス撃破：ボス倒した数カウントを増やす
        bossDefeatCount++;
        // 停止して「次のボスへ」ボタンを表示
        gameRunning = false;
        nextBossContainer.style.display = "block";
        gameOverMessage.textContent = "You Win!";
        gameOverMessage.style.display = "block";
      }
    }
    // 画面外なら削除
    else if (b.y < -BULLET_SIZE) {
      playerBullets.splice(i, 1);
    }
  }
  
  // ボスの自動移動更新
  if (boss && boss.hp > 0) {
    boss.x += boss.dx;
    boss.y += boss.dy;
    // 移動制限：ボスは画面内に収める（上半分全域）
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    boss.y = Math.max(0, Math.min(canvas.height - boss.height, boss.y));
  }
  
  // ボス描画
  if (boss && boss.hp > 0) {
    // ボスの色は、特殊ボスの場合は七色に光る（下記getBossColor()で算出）
    ctx.fillStyle = getBossColor();
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    // HP表示
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("HP: " + boss.hp, boss.x, boss.y - 5);
  }
  
  // ボス弾の更新＆描画
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    let b = bossBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    // 各弾の描画：円形、色はボタンのcolorプロパティ（通常はpink、特殊はランダム）
    ctx.beginPath();
    ctx.fillStyle = b.color;
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // 当たり判定：ボス弾とプレイヤー
    if (b.x > player.x && b.x < player.x + PLAYER_SIZE &&
        b.y > player.y && b.y < player.y + PLAYER_SIZE) {
      gameOver("Game Over!");
    }
    // 画面外なら削除
    if (b.x < -BULLET_SIZE || b.x > canvas.width + BULLET_SIZE ||
        b.y < -BULLET_SIZE || b.y > canvas.height + BULLET_SIZE) {
      bossBullets.splice(i, 1);
    }
  }
  
  // 情報表示更新
  let elapsedTime = ((new Date()) - startTime) / 1000;
  infoDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒 | Boss倒した数: ${bossDefeatCount}`;
  
  gameLoopId = requestAnimationFrame(gameLoop);
}

// 衝突判定は上記で行っている（矩形で判定）

// 桜の花びら風の弾描画関数
// sizeは基準サイズ、colorはデフォルト色（プレイヤー弾は"pink"）
function drawSakuraBullet(x, y, size, color = "pink") {
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

// 1枚の花びらを描く（ベジェ曲線）
function drawPetal(size) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-size * 0.12, -size * 0.3, -size * 0.20, -size * 0.5, 0, -size * 0.65);
  ctx.bezierCurveTo(size * 0.20, -size * 0.5, size * 0.12, -size * 0.3, 0, 0);
  ctx.fillStyle = "pink";
  ctx.fill();
}

// ボスの色を返す（特殊ボスは七色に光るエフェクト）
function getBossColor() {
  if (!boss) return "red";
  if (boss.multiColor) {
    // 七色に光る：時間とともに色をサイクル
    const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    let index = Math.floor(Date.now() / 100) % colors.length;
    return colors[index];
  } else {
    return "red";
  }
}

// ゲームオーバー処理（プレイヤー被弾の場合）
function gameOver(message) {
  gameRunning = false;
  gameOverFlag = true;
  clearInterval(playerAutoFireTimer);
  clearInterval(bossFireTimer);
  clearInterval(bossDirectionTimer);
  gameOverMessage.textContent = message;
  gameOverMessage.style.display = "block";
  restartButton.style.display = "inline-block";
}

// キー操作による再スタート処理（ゲームオーバー時：スペースキーまたは R キーで再スタート）
document.addEventListener("keydown", (e) => {
  if (!gameRunning && gameOverFlag && (e.key === " " || e.key.toLowerCase() === "r")) {
    initGame(true);
  }
});

// 「もう一度プレイ」ボタン（ヘッダー上部）クリックで完全リセット
restartButton.addEventListener("click", () => {
  initGame(true);
});

// 「次のボスへ」ボタン（ボス撃破後）クリックで次のボスを出現（ボス倒数はリセットしない）
nextBossButton.addEventListener("click", () => {
  // 次のボス出現：ボスは再生成するが、bossDefeatCountは維持
  boss = createBoss();
  gameRunning = true;
  nextBossContainer.style.display = "none";
  // 再びボスの弾幕・移動タイマーを開始
  bossFireTimer = setInterval(() => {
    if (boss && boss.hp > 0) {
      let numBullets = boss.multiColor ? 24 + bossDefeatCount * 3 : 16 + bossDefeatCount * 2;
      let speed = 3;
      for (let i = 0; i < numBullets; i++) {
        let angle = (2 * Math.PI / numBullets) * i;
        bossBullets.push({
          x: boss.x + boss.width / 2,
          y: boss.y + boss.height / 2,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          color: boss.multiColor ? getRandomColor() : "pink"
        });
      }
    }
  }, boss.shotInterval);
  bossDirectionTimer = setInterval(() => {
    const speed = 2 + bossDefeatCount * 0.2;
    boss.dx = (Math.random() * 2 - 1) * speed;
    boss.dy = (Math.random() * 2 - 1) * speed;
  }, BOSS_DIRECTION_INTERVAL);
  // 再開自動発射は継続（playerAutoFireTimerはすでに動作中）
  gameLoopId = requestAnimationFrame(gameLoop);
});

// ランダムな色を返す（ボス弾用）
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random()*16)];
  }
  return color;
}

// 毎フレーム自動再描画開始
initGame(true);
