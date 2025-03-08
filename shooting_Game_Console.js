// DOM要素取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const infoDisplay = document.getElementById("info");
const overlay = document.getElementById("overlay");
const resultText = document.getElementById("resultText");
const resultInfo = document.getElementById("resultInfo");
const nextBossButton = document.getElementById("nextBossButton");
const restartButton = document.getElementById("restartButton");
const bossCountDisplay = document.getElementById("bossCountDisplay");

// 定数
const PLAYER_SIZE = 10;
const PLAYER_SPEED = 4;
const AUTO_FIRE_INTERVAL = 100; // 0.1秒毎
const BOSS_DIRECTION_CHANGE_INTERVAL = 500; // 0.5秒毎

// ゲーム変数
let player, boss;
let playerBullets = [];
let bossBullets = [];
let keys = {};
let gameRunning = true;
let startTime;
let lastBossDirChange = 0;
let autoFireInterval;
let bossDefeatedCount = 0; // 全体で倒したボスの数
let gameOutcome = ""; // "Game Over!" または "You Win!"
let restartFull = true; // Restart Gameならtrue、Next Bossならfalse

// ボス作成関数（HP=(撃破数+1)*3、色は通常はランダム、5回に1回は硬派）
function createBoss() {
  const baseHP = (bossDefeatedCount + 1) * 3;
  let color;
  let isHard = ((bossDefeatedCount + 1) % 5 === 0);
  if (isHard) {
    color = "rainbow"; // 硬派ボス：後でグラデーションで表現
  } else {
    color = `hsl(${Math.floor(Math.random()*360)},80%,60%)`;
  }
  return {
    x: canvas.width / 2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: baseHP,
    maxHealth: baseHP,
    color: color,
    dx: 0,
    dy: 0,
    lastShotTime: 0,
    shotInterval: 2000,
    isHard: isHard
  };
}

// 初期化
function initGame() {
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤーは下部中央
  player = { x: canvas.width/2 - PLAYER_SIZE/2, y: canvas.height - 30 };
  playerBullets = [];
  bossBullets = [];
  keys = {};
  gameRunning = true;
  startTime = new Date();
  lastBossDirChange = Date.now();
  gameOutcome = "";
  
  if (restartFull) {
    bossDefeatedCount = 0;
  }
  boss = createBoss();
  
  overlay.style.display = "none";
  nextBossButton.style.display = "none";
  updateBossCountDisplay();
  infoDisplay.textContent = "Score: 0.00秒";
  
  clearInterval(autoFireInterval);
  autoFireInterval = setInterval(() => {
    if (gameRunning) {
      // 自機自動発射（上方向）
      playerBullets.push({
        x: player.x + PLAYER_SIZE/2,
        y: player.y,
        dy: -5
      });
    }
  }, AUTO_FIRE_INTERVAL);
  
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// キー操作
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (!gameRunning && (e.key === " " || e.key.toLowerCase() === "r")) {
    restartFull = true;
    initGame();
  }
});
document.addEventListener("keyup", (e) => { keys[e.key] = false; });

// タッチ操作（スマホ用：スワイプで移動、スクロール防止）
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

// ボス撃破数表示更新
function updateBossCountDisplay() {
  bossCountDisplay.textContent = "Boss Defeated: " + bossDefeatedCount;
}

// ゲームループ
function gameLoop() {
  if (!gameRunning) {
    overlay.style.display = "flex";
    resultText.textContent = gameOutcome;
    resultInfo.textContent = `Boss Defeated Count: ${bossDefeatedCount}`;
    if (gameOutcome === "You Win!") {
      nextBossButton.style.display = "block";
    }
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動（キー入力）
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // 自機弾更新＆描画
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let b = playerBullets[i];
    b.y += b.dy;
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
    ctx.fill();
    // 当たり判定：自機弾 vs ボス
    if (boss && b.x > boss.x && b.x < boss.x + boss.width &&
        b.y > boss.y && b.y < boss.y + boss.height) {
      boss.health -= 1;
      playerBullets.splice(i, 1);
      if (boss.health <= 0) {
        bossDefeatedCount++;
        gameOutcome = "You Win!";
        gameRunning = false;
      }
    }
    if (b.y < -10) {
      playerBullets.splice(i, 1);
    }
  }
  
  // ボスランダム移動（0.5秒毎に方向変更）
  if (Date.now() - lastBossDirChange > BOSS_DIRECTION_CHANGE_INTERVAL) {
    boss.dx = (Math.random() - 0.5) * 4;
    boss.dy = (Math.random() - 0.5) * 4;
    lastBossDirChange = Date.now();
  }
  boss.x += boss.dx;
  boss.y += boss.dy;
  boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
  boss.y = Math.max(0, Math.min(canvas.height - boss.height, boss.y));
  
  // ボス描画
  if (boss) {
    if (boss.isHard) {
      let grad = ctx.createLinearGradient(boss.x, 0, boss.x + boss.width, 0);
      const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
      const step = 1/(colors.length - 1);
      colors.forEach((col, i) => {
        grad.addColorStop(i*step, col);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = boss.color;
    }
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("HP: " + boss.health, boss.x, boss.y - 5);
  }
  
  // ボス弾更新＆描画
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    let b = bossBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    ctx.beginPath();
    if (boss.isHard) {
      const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
      ctx.fillStyle = colors[Math.floor(Math.random()*colors.length)];
    } else {
      ctx.fillStyle = "red";
    }
    ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
    ctx.fill();
    // 当たり判定：ボス弾 vs 自機
    if (b.x > player.x && b.x < player.x + PLAYER_SIZE &&
        b.y > player.y && b.y < player.y + PLAYER_SIZE) {
      gameOutcome = "Game Over!";
      gameRunning = false;
    }
    if (b.x < -10 || b.x > canvas.width+10 || b.y < -10 || b.y > canvas.height+10) {
      bossBullets.splice(i, 1);
    }
  }
  
  // ボス発射処理：一定間隔ごとに放射状に大量発射
  if (Date.now() - boss.lastShotTime > boss.shotInterval) {
    let numBullets = boss.isHard ? 16 : 12;
    for (let i = 0; i < numBullets; i++) {
      let angle = (2*Math.PI/numBullets) * i;
      let speed = boss.isHard ? 4 : 3;
      bossBullets.push({
        x: boss.x + boss.width/2,
        y: boss.y + boss.height/2,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed
      });
    }
    boss.lastShotTime = Date.now();
  }
  
  // スコア更新（生存時間）
  const elapsedTime = (new Date() - startTime)/1000;
  infoDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒`;
  
  requestAnimationFrame(gameLoop);
}

// 「Next Boss」ボタン：次のボスへ（倒した数は保持）
nextBossButton.addEventListener("click", () => {
  restartFull = false;
  initGame();
});

// 「Restart Game」ボタン：全体リセット（倒した数もリセット）
restartButton.addEventListener("click", () => {
  restartFull = true;
  initGame();
});
