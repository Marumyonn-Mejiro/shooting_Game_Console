// DOM 要素取得
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
const BULLET_SIZE = 5;
const PLAYER_SPEED = 4;
const AUTO_FIRE_INTERVAL = 100; // 0.1秒
const BOSS_DIRECTION_CHANGE_INTERVAL = 500; // 0.5秒

// ゲーム変数
let player, boss, playerBullets, bossBullets, keys;
let gameRunning = true;
let startTime;
let lastAutoFireTime = 0;
let lastBossDirectionChange = 0;
let bossDefeatedCount = 0; // 全ゲーム共通（「Restart Game」でリセット）
let gameOutcome = ""; // "Game Over!" or "You Win!"

// 初期ボス設定（HPは (bossDefeatedCount+1)*3 ）
function createBoss() {
  // 基本ボス設定
  let baseHP = (bossDefeatedCount + 1) * 3;
  // ボス色：通常は赤、またはランダム色、または硬派ボス（5回に1回は七色）
  let color;
  let isHard = ((bossDefeatedCount + 1) % 5 === 0);
  if(isHard) {
    color = "magenta"; // hardボスは後で七色効果（ここでは簡易的に七色に見せるためのグラデーション処理も可）
  } else {
    // ランダムな明るめの色
    color = `hsl(${Math.floor(Math.random()*360)},80%,60%)`;
  }
  return {
    x: canvas.width/2 - 20,
    y: 20,
    width: 40,
    height: 20,
    health: baseHP,
    maxHealth: baseHP,
    color: color,
    dx: 0,
    dy: 0,
    lastShotTime: 0,
    shotInterval: 2000, // 2秒間隔（パターン変化あり）
    isHard: isHard
  };
}

// ゲーム初期化
function initGame() {
  // キャンバスサイズ設定
  canvas.width = Math.min(window.innerWidth * 0.95, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  
  // プレイヤー：下部中央
  player = { x: canvas.width/2, y: canvas.height - 30 };
  // 自機弾：空配列
  playerBullets = [];
  // ボス弾：空配列
  bossBullets = [];
  // キー状態
  keys = {};
  gameRunning = true;
  startTime = new Date();
  lastAutoFireTime = 0;
  lastBossDirectionChange = 0;
  gameOutcome = "";
  
  // ボス：新規作成（ボス撃破数がリセットされない場合は保持）
  if (!restartFull) {
    // 次のボスの場合は bossDefeatedCountはそのまま
    boss = createBoss();
  } else {
    // Restart Game（全体リセット）：bossDefeatedCountもリセット
    bossDefeatedCount = 0;
    boss = createBoss();
  }
  
  overlay.style.display = "none";
  nextBossButton.style.display = "none";
  updateBossCountDisplay();
  infoDisplay.textContent = "Score: 0.00秒";
  // 自動発射タイマー（重複防止のため一旦クリア）
  clearInterval(autoFireInterval);
  autoFireInterval = setInterval(autoFire, AUTO_FIRE_INTERVAL);
  
  gameLoop();
}
let restartFull = true; // フルリセットか「Next Boss」かを区別
window.addEventListener("resize", initGame);
initGame();

// 自動発射：0.1秒毎に自機弾を追加
let autoFireInterval;
function autoFire() {
  if(gameRunning) {
    playerBullets.push({
      x: player.x + PLAYER_SIZE/2,
      y: player.y,
      dy: -5
    });
  }
}

// キーボード操作
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (!gameRunning) {
    if(e.key === " " || e.key.toLowerCase() === "r") {
      // ゲームオーバー後の再スタート（プレイヤーの死の場合）
      if(gameOutcome === "Game Over!") {
        restartFull = true;
        initGame();
      }
    }
  }
});
document.addEventListener("keyup", (e) => { keys[e.key] = false; });

// スマホ：スワイプ移動＋スクロール防止
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

// ゲームループ
function gameLoop() {
  if(!gameRunning) {
    overlay.style.display = "flex";
    resultText.textContent = gameOutcome;
    if(gameOutcome === "You Win!") {
      resultInfo.textContent = `Boss Defeated Count: ${bossDefeatedCount}`;
      nextBossButton.style.display = "block";
    }
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 自機移動（キー入力）
  if(keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if(keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if(keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if(keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;
  // 移動制限
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));
  
  // 自機描画
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  
  // 自機弾更新＆描画（上方向）
  for(let i = playerBullets.length-1; i >= 0; i--) {
    let b = playerBullets[i];
    b.y += b.dy;
    // 描画（白い円）
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
    ctx.fill();
    // 衝突判定：自機弾 vs ボス（矩形との当たり判定）
    if(b.x > boss.x && b.x < boss.x + boss.width &&
       b.y > boss.y && b.y < boss.y + boss.height) {
      boss.health -= 1;
      playerBullets.splice(i,1);
      if(boss.health <= 0) {
        // ボス撃破
        bossDefeatedCount++;
        gameOutcome = "You Win!";
        gameRunning = false;
      }
    }
    // 画面外なら削除
    if(b.y < -10) {
      playerBullets.splice(i,1);
    }
  }
  
  // ボス移動：毎0.5秒ごとにランダムな方向に移動（スムーズに）
  if(Date.now() - lastBossDirectionChange > BOSS_DIRECTION_CHANGE_INTERVAL) {
    boss.dx = (Math.random()-0.5) * 4; // -2〜+2
    boss.dy = (Math.random()-0.5) * 4; // -2〜+2
    lastBossDirectionChange = Date.now();
  }
  boss.x += boss.dx;
  boss.y += boss.dy;
  // 移動制限：ボスは画面内を自由に動く
  boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
  boss.y = Math.max(0, Math.min(canvas.height - boss.height, boss.y));
  
  // ボス描画：背景色はボス.color。硬派ボスの場合、簡易七色グラデーションで表現
  if(boss.isHard) {
    // 簡易的に七色のグラデーション（横方向）
    let grad = ctx.createLinearGradient(boss.x, 0, boss.x + boss.width, 0);
    const sevenColors = ["red","orange","yellow","green","blue","indigo","violet"];
    const step = 1/(sevenColors.length-1);
    for(let i=0; i<sevenColors.length; i++){
      grad.addColorStop(i*step, sevenColors[i]);
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = boss.color;
  }
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  // ボスHP表示
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.fillText("HP: "+boss.health, boss.x, boss.y - 5);
  
  // ボス弾更新＆描画
  for(let i = bossBullets.length-1; i >= 0; i--) {
    let b = bossBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    // 描画：通常は赤、硬派ボスならランダム色
    ctx.beginPath();
    if(boss.isHard) {
      // ランダムに七色から選ぶ
      const colors = ["red","orange","yellow","green","blue","indigo","violet"];
      ctx.fillStyle = colors[Math.floor(Math.random()*colors.length)];
    } else {
      ctx.fillStyle = "red";
    }
    ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
    ctx.fill();
    // 衝突判定：ボス弾 vs 自機
    if(b.x > player.x && b.x < player.x + PLAYER_SIZE &&
       b.y > player.y && b.y < player.y + PLAYER_SIZE) {
      gameOutcome = "Game Over!";
      gameRunning = false;
    }
    // 画面外なら削除
    if(b.x < -10 || b.x > canvas.width+10 || b.y < -10 || b.y > canvas.height+10) {
      bossBullets.splice(i,1);
    }
  }
  
  // ボス発射処理：一定間隔ごとに放射状に大量発射（タイトな桜の花びら弾幕）
  if(Date.now() - boss.lastShotTime > boss.shotInterval) {
    let numBullets;
    if(boss.isHard) {
      numBullets = 16; // hardボスはより多く
    } else {
      numBullets = 12;
    }
    for(let i=0; i<numBullets; i++){
      let angle = (2*Math.PI/numBullets)*i;
      // ボス弾の速度も少し変化
      let speed = boss.isHard ? 4 : 3;
      bossBullets.push({
        x: boss.x + boss.width/2,
        y: boss.y + boss.height/2,
        dx: Math.cos(angle)*speed,
        dy: Math.sin(angle)*speed
      });
    }
    boss.lastShotTime = Date.now();
  }
  
  // スコア更新（生存時間）
  const elapsedTime = (new Date() - startTime)/1000;
  infoDisplay.textContent = `Score: ${elapsedTime.toFixed(2)}秒`;
  
  requestAnimationFrame(gameLoop);
}

// キー操作で再スタート（ゲームオーバー時にスペースまたは R キー）
document.addEventListener("keydown", (e) => {
  if(!gameRunning && (e.key === " " || e.key.toLowerCase() === "r")) {
    restartFull = true;
    initGame();
  }
});

// 「Restart Game」ボタン（上部）：全体リセット（倒したボス数もリセット）
restartButton.addEventListener("click", () => {
  restartFull = true;
  initGame();
});

// 「Next Boss」ボタン：ボス撃破後に次のボスを出現（倒した数は維持）
nextBossButton.addEventListener("click", () => {
  restartFull = false;
  initGame();
});

// ボス撃破時（自機弾でHPが0になったとき）の処理
function bossDefeated() {
  gameOutcome = "You Win!";
  gameRunning = false;
}

// 監視：自機弾でボスHPが減少する処理は gameLoop 内で行って。
// 次のボス出現時、bossDefeatedCount は維持（Restart Gameでリセットされる）。
// ボスが倒された場合は、overlayに結果表示と「Next Boss」ボタンを出す。
function checkBossDefeat() {
  if(boss.health <= 0) {
    bossDefeatedCount++;
    // 更新：次のボスのHPは (bossDefeatedCount+1)*3 で決定
    // 色も変化（createBoss()に任せる）
    gameOutcome = "You Win!";
    gameRunning = false;
  }
}
  
// ※ 上記は gameLoop 内の自機弾とボスの衝突判定で処理済み

// ボス撃破数表示更新
function updateBossCountDisplay() {
  bossCountDisplay.textContent = "Boss Defeated: " + bossDefeatedCount;
}
