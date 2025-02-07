const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");

const PLAYER_SIZE = 10;
const BULLET_SIZE = 5;
const BULLET_SPEED = 2;
const PLAYER_SPEED = 4;

let player, bullets, keys, gameRunning;

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

    // **弾の描画処理（桜の模様の弾）**
    bullets.forEach((b) => {
        drawSakuraBullet(b.x, b.y, BULLET_SIZE);
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
    if (Math.random() < 0.1) { // 発射確率を上げて高頻度に
        spawnBulletPattern();
    }

    requestAnimationFrame(gameLoop);
}

// **桜の模様を描く弾幕発射**
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

// **桜の模様の弾（桜の花びら風）の描画関数**
function drawSakuraBullet(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "pink";
    // 5枚の花びらを描画
    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(i * (Math.PI * 2 / 5));
        ctx.beginPath();
        // 花びらを楕円で表現（上方向に伸びる楕円）
        ctx.ellipse(0, -size, size * 0.4, size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    // 中心部分の丸（ハイライト）
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// **ゲームオーバー処理**
function gameOver() {
    gameRunning = false;
    gameOverText.style.display = "block";
    restartButton.style.display = "block";
}

// **再スタート**
restartButton.addEventListener("click", initGame);
