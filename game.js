import { initSupabase, fetchLeaderboard, submitScore } from './supabase.js';

// --- Configuration ---
const CANVAS_WIDTH = 480;  // Mobile-friendly width
const CANVAS_HEIGHT = 800;

// Physics Config (tuned for time-based updates)
// Pixels per second
const GRAVITY = 1000; 
const INITIAL_JUMP_FORCE = -550;
const MOVE_SPEED = 300; 

const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 20;
const ITEM_SIZE = 30;

// --- Assets ---
const assets = {
    character: new Image(),
    cloud: new Image(),
    platform: new Image(),
    balloonBlue: new Image(),
    balloonRed: new Image()
};

assets.character.src = 'assets/character.png';
assets.cloud.src = 'assets/cloud.svg';
assets.platform.src = 'assets/platform.svg';
assets.balloonBlue.src = 'assets/balloon_blue.svg';
assets.balloonRed.src = 'assets/balloon_red.svg';

// --- Game State ---
let canvas, ctx;
let gameState = 'START'; // START, PLAYING, GAMEOVER
let player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    width: 50,
    height: 50,
    vx: 0,
    vy: 0,
    facingRight: true,
    jumpForce: INITIAL_JUMP_FORCE,
    hasDoubleJump: false
};
let platforms = [];
let items = []; // Floating items
let clouds = []; // Background clouds
let score = 0;
let highestY = 0; 
let cameraY = 0;
let lastTime = 0;

// --- Initialization ---
window.onload = async () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Resize canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Inputs
    setupInputs();
    
    // Generate initial clouds
    generateClouds();

    // Load config from Vite environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    initSupabase(supabaseUrl, supabaseAnonKey);
    
    // Initial Render
    updateLeaderboardDisplay();
    requestAnimationFrame(gameLoop);
};

function resizeCanvas() {
    let scale = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
}

function setupInputs() {
    // Touch (for canvas tapping fallback)
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Tap to jump (double jump) anywhere on canvas if not touching buttons
    canvas.addEventListener('touchstart', (e) => {
         if (e.target.tagName !== 'BUTTON') {
             attemptJump();
         }
    });
    
    // Mouse (for testing)
    canvas.addEventListener('mousedown', handleTouchStart);
    window.addEventListener('mouseup', () => {
        if (gameState === 'PLAYING') player.vx = 0;
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
        if (gameState === 'START' && e.code === 'Space') startGame();
        if (gameState === 'PLAYING') {
            if (e.code === 'ArrowLeft') player.vx = -MOVE_SPEED;
            if (e.code === 'ArrowRight') player.vx = MOVE_SPEED;
            if (e.code === 'Space' || e.code === 'ArrowUp') attemptJump();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (gameState === 'PLAYING') {
            if ((e.code === 'ArrowLeft' && player.vx < 0) || 
                (e.code === 'ArrowRight' && player.vx > 0)) {
                player.vx = 0;
            }
        }
    });

    // UI Buttons
    document.getElementById('start-screen').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    document.getElementById('submit-score-btn').addEventListener('click', handleScoreSubmit);

    // Mobile Control Buttons
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    const startLeft = (e) => { e.preventDefault(); if (gameState === 'PLAYING') player.vx = -MOVE_SPEED; };
    const startRight = (e) => { e.preventDefault(); if (gameState === 'PLAYING') player.vx = MOVE_SPEED; };
    const stopMove = (e) => { e.preventDefault(); if (gameState === 'PLAYING') player.vx = 0; };

    btnLeft.addEventListener('touchstart', startLeft);
    btnLeft.addEventListener('mousedown', startLeft);
    btnLeft.addEventListener('touchend', stopMove);
    btnLeft.addEventListener('mouseup', stopMove);
    btnLeft.addEventListener('mouseleave', stopMove);

    btnRight.addEventListener('touchstart', startRight);
    btnRight.addEventListener('mousedown', startRight);
    btnRight.addEventListener('touchend', stopMove);
    btnRight.addEventListener('mouseup', stopMove);
    btnRight.addEventListener('mouseleave', stopMove);
}

// --- Game Logic ---
function startGame() {
    if (gameState === 'PLAYING') return;
    
    gameState = 'PLAYING';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('score-hud').style.display = 'block';
    document.getElementById('controls').style.display = 'flex';
    
    resetPlayer();
    generateInitialPlatforms();
    lastTime = performance.now();
}

function resetGame() {
    gameState = 'START';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('score-hud').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    score = 0;
}

function resetPlayer() {
    player.x = CANVAS_WIDTH / 2 - player.width / 2;
    player.y = CANVAS_HEIGHT - 150;
    player.vx = 0;
    player.vy = INITIAL_JUMP_FORCE;
    player.jumpForce = INITIAL_JUMP_FORCE;
    player.hasDoubleJump = false;
    score = 0;
    highestY = player.y;
    cameraY = 0;
}

function generateClouds() {
    clouds = [];
    for (let i = 0; i < 10; i++) {
        clouds.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 20 + Math.random() * 30,
            speed: 0.2 + Math.random() * 0.5
        });
    }
}

function generateInitialPlatforms() {
    platforms = [];
    items = [];
    // Base platform
    platforms.push({ x: 0, y: CANVAS_HEIGHT - 50, width: CANVAS_WIDTH, height: 20 });
    
    // Procedural platforms
    let currentY = CANVAS_HEIGHT - 50;
    let currentX = CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2;

    // Generate first few platforms easier
    for (let i = 0; i < 5; i++) {
        const next = generateNextPlatformCoordinates(currentX, currentY, true); // True for "easy mode"
        currentX = next.x;
        currentY = next.y;
        platforms.push({ x: currentX, y: currentY, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT });
        spawnItem(currentX, currentY);
    }

    while (currentY > -1000) { 
        const next = generateNextPlatformCoordinates(currentX, currentY);
        currentX = next.x;
        currentY = next.y;
        platforms.push({ x: currentX, y: currentY, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT });
        
        // Chance to spawn item
        spawnItem(currentX, currentY);
    }
}

function spawnItem(platformX, platformY) {
    if (Math.random() < 0.4) { // Increased to 40% chance for better visibility
        const type = Math.random() < 0.5 ? 'blue' : 'red';
        const x = platformX + (PLATFORM_WIDTH - ITEM_SIZE) / 2;
        const y = platformY - ITEM_SIZE - 10; // Floating slightly above
        items.push({ x, y, width: ITEM_SIZE, height: ITEM_SIZE * 1.33, type }); 
        console.log(`Spawned ${type} balloon at ${x}, ${y}`);
    }
}

function generateNextPlatformCoordinates(prevX, prevY, easy = false) {
    const minGap = 60;
    const maxGap = easy ? 80 : 100; // Lower max gap for easy mode
    const yGap = minGap + Math.random() * (maxGap - minGap);
    const newY = prevY - yGap;

    const maxXDist = easy ? 80 : 120; // Reduced max horizontal distance (was 180)
    let xDist = (Math.random() - 0.5) * 2 * maxXDist;
    
    let newX = prevX + xDist;
    
    if (newX < 0) newX += CANVAS_WIDTH;
    if (newX > CANVAS_WIDTH) newX -= CANVAS_WIDTH;

    if (newX < 0) newX = 0;
    if (newX > CANVAS_WIDTH - PLATFORM_WIDTH) newX = CANVAS_WIDTH - PLATFORM_WIDTH;

    return { x: newX, y: newY };
}

function update(dt) {
    if (gameState !== 'PLAYING') return;

    // Physics
    // x += vx * dt
    player.x += player.vx * dt;
    
    // y += vy * dt
    player.y += player.vy * dt;
    
    // vy += gravity * dt
    player.vy += GRAVITY * dt;

    // Wrap around screen
    if (player.x + player.width < 0) player.x = CANVAS_WIDTH;
    if (player.x > CANVAS_WIDTH) player.x = -player.width;

    // Camera follow (only up)
    if (player.y < CANVAS_HEIGHT / 2) {
        let diff = CANVAS_HEIGHT / 2 - player.y;
        player.y += diff;
        cameraY += diff;
        score += Math.floor(diff);
        document.getElementById('current-score').innerText = score;
        
        // Move platforms down
        platforms.forEach(p => p.y += diff);
        
        // Move items down
        items.forEach(i => i.y += diff);

        // Move clouds down (parallax effect, slower)
        clouds.forEach(c => {
            c.y += diff * 0.5;
            if (c.y > CANVAS_HEIGHT) {
                c.y = -50;
                c.x = Math.random() * CANVAS_WIDTH;
            }
        });

        // Generate new platforms
        generateNewPlatforms();
    }

    // Platform Collision (only when falling)
    if (player.vy > 0) {
        platforms.forEach(p => {
            // Simple AABB Collision
            // We check if player's bottom edge passed through the platform top edge this frame?
            // Or just simple overlap + vy > 0 condition
            if (
                player.x + player.width > p.x &&
                player.x < p.x + p.width &&
                player.y + player.height > p.y &&
                player.y + player.height < p.y + p.height + (player.vy * dt) + 5 // Tolerance adjusted for dt
            ) {
                // Correct position to be on top of platform
                player.y = p.y - player.height;
                player.vy = player.jumpForce;
            }
        });
    }

    // Item Collision
    items.forEach((item, index) => {
        if (
            player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < item.y + item.height &&
            player.y + player.height > item.y
        ) {
            // Collected!
            if (item.type === 'blue') {
                player.hasDoubleJump = true;
                // Visual feedback could be added here
            } else if (item.type === 'red') {
                player.jumpForce *= 1.1; // Increase jump force by 10%
            }
            items.splice(index, 1);
        }
    });

    // Game Over
    if (player.y > CANVAS_HEIGHT) {
        gameOver();
    }
}

function generateNewPlatforms() {
    platforms = platforms.filter(p => p.y < CANVAS_HEIGHT + 50);
    items = items.filter(i => i.y < CANVAS_HEIGHT + 50);
    
    let highestPlatform = platforms.reduce((prev, curr) => prev.y < curr.y ? prev : curr, platforms[0]);
    
    if (highestPlatform.y > -50) { 
        const next = generateNextPlatformCoordinates(highestPlatform.x, highestPlatform.y);
        platforms.push({ x: next.x, y: next.y, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT });
        spawnItem(next.x, next.y);
    }
}

function attemptJump() {
    if (player.hasDoubleJump) {
        player.vy = player.jumpForce;
        player.hasDoubleJump = false;
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('final-score').innerText = score;
    document.getElementById('score-hud').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'block';
    
    updateLeaderboardDisplay();
}

// --- Input Handling Details ---
function handleTouchStart(e) {
    if (gameState === 'START' || gameState === 'GAMEOVER') {
        if (gameState === 'START') startGame();
        return;
    }
    
    // Canvas tapping acts as fallback if not using buttons
    // But buttons are overlaid, so this might be redundant or for testing on desktop without buttons
    // Let's keep it but prevent conflict if buttons are used (buttons stop propagation usually)
    
    let clientX;
    if (e.type === 'mousedown') {
        clientX = e.clientX;
    } else {
        // Only process touches not on buttons
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault(); 
        clientX = e.touches[0].clientX;
    }

    let canvasRect = canvas.getBoundingClientRect();
    let scale = CANVAS_WIDTH / canvasRect.width;
    let gameX = (clientX - canvasRect.left) * scale;
    
    if (gameX < CANVAS_WIDTH / 2) player.vx = -MOVE_SPEED;
    else player.vx = MOVE_SPEED;
}

function handleTouchMove(e) {
    if (e.target.tagName !== 'BUTTON') e.preventDefault(); 
}

function handleTouchEnd(e) {
    // Canvas touch end
     if (e.target.tagName !== 'BUTTON') player.vx = 0;
}

// --- Rendering ---
function draw() {
    // Clear
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw Clouds
    clouds.forEach(c => {
        if (assets.cloud.complete && assets.cloud.naturalHeight !== 0) {
            ctx.drawImage(assets.cloud, c.x, c.y, c.size * 2, c.size * 1.2);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw Items
    items.forEach(item => {
        let img = item.type === 'blue' ? assets.balloonBlue : assets.balloonRed;
        if (img.complete && img.naturalHeight !== 0) {
            ctx.drawImage(img, item.x, item.y, item.width, item.height);
        } else {
            ctx.fillStyle = item.type === 'blue' ? 'blue' : 'red';
            ctx.beginPath();
            ctx.arc(item.x + item.width/2, item.y + item.height/2, item.width/2, 0, Math.PI*2);
            ctx.fill();
        }
    });

    // Draw Platforms
    platforms.forEach(p => {
        if (assets.platform.complete && assets.platform.naturalHeight !== 0) {
            ctx.drawImage(assets.platform, p.x, p.y, p.width, p.height);
        } else {
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }
    });

    // Draw Player
    if (assets.character.complete && assets.character.naturalHeight !== 0) {
        ctx.drawImage(assets.character, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = 'purple';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // Draw Double Jump Indicator
    if (player.hasDoubleJump) {
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(player.x + player.width, player.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function gameLoop(timestamp) {
    // Delta time calculation
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Leaderboard UI ---
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function updateLeaderboardDisplay() {
    const list = await fetchLeaderboard();
    const container = document.getElementById('leaderboard-list');
    const preview = document.getElementById('leaderboard-preview');
    
    let html = '';
    list.forEach((entry, index) => {
        html += `<div class="leaderboard-item"><span>${index + 1}. ${escapeHtml(entry.username)}</span><span>${entry.score}</span></div>`;
    });
    
    if (container) container.innerHTML = html;
    if (preview) preview.innerHTML = html || 'No scores yet.';
}

async function handleScoreSubmit() {
    const username = document.getElementById('username-input').value;
    if (!username) return alert("Please enter a name");
    
    const btn = document.getElementById('submit-score-btn');
    btn.disabled = true;
    btn.innerText = "Submitting...";
    
    const result = await submitScore(username, score);
    if (result.success) {
        alert(result.message || "Score submitted!");
        await updateLeaderboardDisplay();
        btn.style.display = 'none';
    } else {
        alert(`Failed to submit score: ${result.message}`);
        btn.disabled = false;
        btn.innerText = "Submit Score";
    }
}
