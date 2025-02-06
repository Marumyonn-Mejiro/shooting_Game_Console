const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameOverText = document.getElementById("gameOverText");

const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

let player = { x: 200, y: 250 };
let bullets = [];
let keys = {};
let gameRunning = true;

// **画面サイズを調整する関数**
function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth * 0.9, 600);
    canvas.height = Math.min(window.innerHeight * 0.6, 400);
    player.x = canvas.width / 2;
    player.y = canvas.height - 30;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// **キーボード入力**
document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

// **スマホ向けスワイプ操作**
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

    // **画面外に出ないよう制限**
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
    bullets = bullets.filter((b) => b.y < canvas.height);

    // **弾の描画処理**
    ctx.fillStyle = "red";
    bullets.forEach((b) => {
        ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE);

        // **衝突判定（当たったらゲームオーバー）**
        if (
            b.x < player.x + PLAYER_SIZE &&
            b.x + BULLET_SIZE > player.x &&
            b.y < player.y + PLAYER_SIZE &&
            b.y + BULLET_SIZE > player.y
        ) {
            gameRunning = false;
            gameOverText.style.display = "block";
        }
    });

    // **弾幕の発射処理（ランダムな頻度）**
    if (Math.random() < 0.02) {
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 1.5 + 1;
        bullets.push({
            x: Math.random() * canvas.width,
            y: 0,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed + 1,
        });
    }

    requestAnimationFrame(gameLoop);
}

// **ゲーム開始**
gameLoop();
