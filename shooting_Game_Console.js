// Firebase SDK のモジュール方式（Realtime Database版）の読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  query, 
  orderByChild, 
  limitToLast, 
  get 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ※ 以下の firebaseConfig はご自身の Firebase プロジェクトの情報に書き換えてください
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mejiroshootinggameconsole.firebaseapp.com",
  databaseURL: "https://mejiroshootinggameconsole-default-rtdb.firebaseio.com/",
  projectId: "mejiroshootinggameconsole",
  storageBucket: "mejiroshootinggameconsole.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM 要素の取得
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");
const leaderboardDiv = document.getElementById("leaderboard");

// 定数
const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

// ゲーム関連の変数
let player, bullets, keys, gameRunning, startTime;

// **ゲーム初期化**
function initGame() {
  canvas.width = Math.min(window.innerWidth * 0.9, 600);
  canvas.height = Math.min(window.innerHeight * 0.6, 400);
  player = { x: canvas.width / 2, y: canvas.height - 30 };
  bullets = [];
  keys = {};
  gameRunning = true;
  gameOverText.style.display = "none";
  restartButton.style.display = "none";
  leaderboardDiv.innerHTML = "";  // ランキング表示エリアをクリア
  startTime = new Date(); // ゲーム開始時刻を記録
  gameLoop();
}
window.addEventListener("resize", initGame);
initGame();

// **キーボード操作**
document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

// **スマホのスワイプ操作**
let touchStartX = 0, touchStartY = 0;
document.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});
document.addEventListener("touchmove", (e) => {
  let dx = e.touches[0].clientX - touchStartX;
  let dy = e.touches[0].clientY - touchStartY;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;

  player.x += dx * 0.2;
  player.y += dy * 0.2;
});

// **ゲームループ**
function gameLoop() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // **プレイヤー移動処理**
  if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
  if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
  if (keys["ArrowUp"] || keys["w"]) player.y -= PLAYER_SPEED;
  if (keys["ArrowDown"] || keys["s"]) player.y += PLAYER_SPEED;

  // **画面端に制限**
  player.x = Math.max(0, Math.min(canvas.width - PLAYER_SIZE, player.x));
  player.y = Math.max(0, Math.min(canvas.height - PLAYER_SIZE, player.y));

  // **プレイヤー描画**
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

  // **弾の更新処理**
  bullets.forEach((b) => {
    b.x += b.dx * BULLET_SPEED;
    b.y += b.dy * BULLET_SPEED;
  });

  // **画面外の弾を削除**
  bullets = bullets.filter((b) =>
    b.x >= -BULLET_SIZE &&
    b.x <= canvas.width + BULLET_SIZE &&
    b.y >= -BULLET_SIZE &&
    b.y <= canvas.height + BULLET_SIZE
  );

  // **弾の描画処理（タイトな桜の花びらの弾）**
  bullets.forEach((b) => {
    drawSakuraBullet(b.x, b.y, BULLET_SIZE * 4);
    // **衝突判定（当たったらゲームオーバー）**
    if (
      b.x < player.x + PLAYER_SIZE &&
      b.x + BULLET_SIZE > player.x &&
      b.y < player.y + PLAYER_SIZE &&
      b.y + BULLET_SIZE > player.y
    ) {
      gameOver();
    }
  });

  // **高頻度の弾幕発射**
  if (Math.random() < 0.1) {
    spawnBulletPattern();
  }

  requestAnimationFrame(gameLoop);
}

// **桜の花びらを描く弾幕発射**
function spawnBulletPattern() {
  let centerX = Math.random() * canvas.width;
  let centerY = 0;
  let numBullets = 12; // 弾の数を増やしてタイトな弾幕に
  let angleStep = Math.PI * 2 / numBullets;

  for (let i = 0; i < numBullets; i++) {
    let angle = i * angleStep;
    bullets.push({
      x: centerX,
      y: centerY,
      dx: Math.cos(angle),
      dy: Math.sin(angle)
    });
  }
}

// ======================================================
// 桜の花の弾（描画関数群）【タイトなバージョン】
// ======================================================
function drawSakuraBullet(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  // 5枚の花びらを放射状に描画
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / 5);
    drawPetal(size);
    ctx.restore();
  }
  // 中心部分（ハイライト）を描画
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

// ======================================================
// オンラインランキング用関数（Realtime Database版）
// ======================================================

/**
 * スコア（経過秒数）を Realtime Database に送信する
 * @param {number} score - 経過秒数
 */
function submitScore(score) {
  // "scores" ノードに新規エントリを追加
  const scoresRef = ref(db, "scores");
  const newScoreRef = push(scoresRef);
  set(newScoreRef, {
    score: score,
    timestamp: new Date().toISOString()
  }).then(() => {
    console.log("Score submitted:", score);
  }).catch((e) => {
    console.error("Error submitting score:", e);
  });
}

/**
 * Realtime Database から上位10件のスコアを取得し、ランキング表示する
 */
async function getLeaderboard() {
  const scoresRef = ref(db, "scores");
  // score の値が大きい＝長く生存（高得点）なので、orderByChild と limitToLast を利用
  const leaderboardQuery = query(scoresRef, orderByChild("score"), limitToLast(10));
  try {
    const snapshot = await get(leaderboardQuery);
    let scoresArray = [];
    snapshot.forEach((childSnapshot) => {
      scoresArray.push(childSnapshot.val());
    });
    // 取得結果は昇順なので、降順に並べ替える
    scoresArray.sort((a, b) => b.score - a.score);
    
    let leaderboardHTML = "<h3>Leaderboard</h3><ol>";
    scoresArray.forEach((data) => {
      leaderboardHTML += `<li>${parseFloat(data.score).toFixed(2)}秒</li>`;
    });
    leaderboardHTML += "</ol>";
    leaderboardDiv.innerHTML = leaderboardHTML;
  } catch (e) {
    console.error("Error fetching leaderboard:", e);
  }
}

// ======================================================
// ゲームオーバー処理（スコア送信＋ランキング表示）
// ======================================================
function gameOver() {
  gameRunning = false;
  gameOverText.style.display = "block";
  restartButton.style.display = "block";

  // 経過秒数をスコアとして算出（秒単位）
  const elapsedTime = (new Date() - startTime) / 1000;
  // スコアを Realtime Database に送信
  submitScore(elapsedTime);
  // 最新のランキングを取得して表示
  getLeaderboard();
}

// **再スタート**
restartButton.addEventListener("click", initGame);
