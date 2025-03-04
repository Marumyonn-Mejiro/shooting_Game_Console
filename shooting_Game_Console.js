// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");
const nextBossButton = document.getElementById("nextBossButton");

// 定数（各種サイズ・速度）
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連の変数
let player, boss, bossBullets, playerBullets, keys, gameRunning, startTime;
let gameOutcome = ""; // "You Win!" または "Game Over!"
let bossDefeatCount = 0;  // ボス撃破数（次ボスのHPに反映）
let playerAutoFireInterval;

// ★ ゲーム初期化（全体リセット：ボス撃破数もリセット） ★
function initGame() {
  bossDefeatCount = 0;
  resetGame();
}

// ★ ゲームリセット（次のボスへ進む場合は撃破数はリセットしない） ★
function resetGame() {
  // キャンバスサイズの設定
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // 自機：キャンバス下部中央
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  
  // ボス設定：HP = (撃破数+1)*3、色・パターンはランダムまたは特定条件で変更
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (bossDefeatCount + 1) * 3,
    lastShotTime: 0,
    shotInterval: 800, // タイトな弾幕
    vx: 0,
    vy: 0,
    nextDirectionTime: Date.now(),
    // bossColor: 通常はランダム、hard boss（5回毎）は七色（"rainbow"）とする
    color: ( (bossDefeatCount + 1) % 5 === 0 ) ? "rainbow" : getRandomColor()
  };
  
  // 弾配列初期化
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
  
  // 自機自動発射：0.1秒間隔で前方へ発射
  if (playerAutoFireInterval) clearInterval(playerAutoFireInterval);
  playerAutoFireInterval = setInterval(() => {
    if (gameRunning) {
      playerBullets.push({
        x: player.x + PLAYER_SIZE / 2,
        y: player.y,
        dx: 0,
        dy: -5
      });
    }
  }, 100);
  
  updateScoreDisplay();
  gameLoop();
}

// ランダムな色（16進数文字列）
function getRandomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
}

// ★ 次のボスへ進む（撃破数はリセットしない） ★
function nextBoss() {
  // ボス撃破数は維持
  resetGame();
}

// ★ キーボード操作 ★
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // スペースキーは自機弾発射（自動発射も行っているのでこちらは重複対策：一度のみ）
  if (e.key === " " && gameRunning) {
    // ※ここでは自動発射のため追加処理はなし
    e.preventDefault();
  }
  // ゲームオーバー後に R キーで全体再スタート
  if (e.key === "r" && !gameRunning) {
    initGame();
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

// ★ ゲームループ ★
function gameLoop() {
  if (!gameRunning) {
    clearInterval(playerAutoFireInterval);
    gameOverText.textContent = gameOutcome;
    gameOverText.style.display = "block";
    // ゲームオーバーの場合（プレイヤー被弾）なら「もう一度プレイ」ボタン表示
    if (gameOutcome === "Game Over!") {
      restartButton.style.display = "block";
    }
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動（入力により）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 自機は画面内に収める
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // ★ ボスの移動 ★
  if (boss && boss.health > 0) {
    // 0.5秒毎に新しい方向を決定
    if (Date.now() > boss.nextDirectionTime) {
      // 移動速度：ランダムに -2～+2 (x) と -1～+1 (y) ※スムーズな動き
      boss.vx = (Math.random() - 0.5) * 4;
      boss.vy = (Math.random() - 0.5) * 2;
      boss.nextDirectionTime = Date.now() + 500;
    }
    boss.x += boss.vx;
    boss.y += boss.vy;
    // 画面内に収める（跳ね返り）
    if (boss.x < 0 || boss.x + boss.width > canvas.width) boss.vx = -boss.vx;
    if (boss.y < 0 || boss.y + boss.height > canvas.height / 2) boss.vy = -boss.vy;
  }
  
  // ★ ボスの発射処理 ★
  if (boss && boss.health > 0 && Date.now() - boss.lastShotTime > boss.shotInterval) {
    // ボスは大量の桜の花びら弾幕を発射（タイトなパターン）
    let numBullets = (boss.color === "rainbow") ? 16 : 12;
    for (let i = 0; i < numBullets; i++) {
      let angle = (2 * Math.PI / numBullets) * i;
      let speed = (boss.color === "rainbow") ? 4 : 3;
      bossBullets.push({
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height / 2,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed
      });
    }
    boss.lastShotTime = Date.now();
  }
  
  // ★ ボス弾の更新＆描画 ★
  bossBullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    drawSakuraBullet(bullet.x, bullet.y, 3);
    // 当たり判定：自機との衝突（円と矩形の判定）
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
    // 当たり判定：自機弾とボスの衝突（描画に応じた矩形判定）
    if (
      boss && bullet.x > boss.x && bullet.x < boss.x + boss.width &&
      bullet.y > boss.y && bullet.y < boss.y + boss.height
    ) {
      boss.health -= 1;
      playerBullets.splice(index, 1);
      if (boss.health <= 0) {
        // ボス撃破：撃破数更新、次のボスへ進むためのボタン表示
        bossDefeatCount++;
        gameOutcome = "You Win!";
        gameRunning = false;
        nextBossButton.style.display = "block";
        // ボスの撃破回数に応じて、次回のHPは (撃破数+1)*3
      }
    }
    // 画面外なら削除
    if (bullet.y < 0) {
      playerBullets.splice(index, 1);
    }
  });
  
  // ★ ボスの描画 ★
  if (boss && boss.health > 0) {
    // ボスの描画：通常は boss.color（ランダム色）、hard bossは虹色（rainbow）エフェクト
    if (boss.color === "rainbow") {
      // 簡易的に虹色のグラデーションを作成
      let gradient = ctx.createLinearGradient(boss.x, boss.y, boss.x + boss.width, boss.y + boss.height);
      gradient.addColorStop(0, "red");
      gradient.addColorStop(0.16, "orange");
      gradient.addColorStop(0.33, "yellow");
      gradient.addColorStop(0.5, "green");
      gradient.addColorStop(0.66, "blue");
      gradient.addColorStop(0.83, "indigo");
      gradient.addColorStop(1, "violet");
      ctx.fillStyle = gradient;
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
  ctx.fillText(`ボス撃破数: ${bossDefeatCount}`, 10, 20);
  
  // 生存時間（スコア）の更新表示
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒 | ボス撃破数: ${bossDefeatCount}`;
  
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

// ★ ボタン処理 ★
restartButton.addEventListener("click", () => {
  // フルリセット：ボス撃破数リセット
  initGame();
});
nextBossButton.addEventListener("click", () => {
  // 次のボスへ：撃破数はそのまま維持して新たなボスを生成
  nextBoss();
});

// ★ 自機自動発射（0.1秒間隔で前方へ撃ち続ける）★
if (playerAutoFireInterval) clearInterval(playerAutoFireInterval);
playerAutoFireInterval = setInterval(() => {
  if (gameRunning) {
    playerBullets.push({
      x: player.x + PLAYER_SIZE / 2,
      y: player.y,
      dx: 0,
      dy: -5
    });
  }
}, 100);

// ★ 補助関数：次のボスを生成 ★
function nextBoss() {
  // 次のボスのHP = (撃破数+1)*3、色・パターン更新
  boss = {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: (bossDefeatCount + 1) * 3,
    lastShotTime: 0,
    shotInterval: (Math.random() < 0.5) ? 800 : 600, // 弾幕パターンに変化
    vx: 0,
    vy: 0,
    nextDirectionTime: Date.now()
  };
  // 5回に一回は難易度強めのボス（虹色エフェクト）
  if ((bossDefeatCount + 1) % 5 === 0) {
    boss.color = "rainbow";
  } else {
    boss.color = getRandomColor();
  }
  // 既存の弾はクリア
  bossBullets = [];
  playerBullets = [];
  gameRunning = true;
  gameOutcome = "";
  startTime = new Date();
  gameOverText.style.display = "none";
  nextBossButton.style.display = "none";
  // 自機自動発射は継続
  updateScoreDisplay();
  gameLoop();
}

// ★ 補助関数：更新したスコアと撃破数を表示 ★
function updateScoreDisplay() {
  const elapsedTime = (new Date() - startTime) / 1000;
  scoreDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒 | ボス撃破数: ${bossDefeatCount}`;
}

// ★ 補助関数：ランダムな色生成 ★
function getRandomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
}
