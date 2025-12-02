import { initSupabase, fetchLeaderboard, submitScore } from './supabase.js';

// --- Configuration ---
const CANVAS_WIDTH = 480;  // Mobile-friendly width
const CANVAS_HEIGHT = 800;
const GRAVITY = 0.4;
const JUMP_FORCE = -10;
const MOVE_SPEED = 5;
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 20;

// --- Assets ---
const assets = {
    character: new Image(),
    cloud: new Image(),
    platform: new Image()
};

assets.character.src = 'assets/character.png';
assets.cloud.src = 'assets/cloud.svg';
assets.platform.src = 'assets/platform.svg';

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
    facingRight: true
};
let platforms = [];
let clouds = []; // Background clouds
let score = 0;
let highestY = 0; // Highest point reached (inverse Y)
let cameraY = 0;

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
    gameLoop();
};

function resizeCanvas() {
    let scale = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
}

function setupInputs() {
    // Touch
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Mouse (for testing)
    canvas.addEventListener('mousedown', handleTouchStart);
    
    // Keyboard
    window.addEventListener('keydown', (e) => {
        if (gameState === 'START' && e.code === 'Space') startGame();
        if (gameState === 'PLAYING') {
            if (e.code === 'ArrowLeft') player.vx = -MOVE_SPEED;
            if (e.code === 'ArrowRight') player.vx = MOVE_SPEED;
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
}

// --- Game Logic ---
function startGame() {
    if (gameState === 'PLAYING') return;
    
    gameState = 'PLAYING';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('score-hud').style.display = 'block';
    
    resetPlayer();
    generateInitialPlatforms();
}

function resetGame() {
    gameState = 'START';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('score-hud').style.display = 'none';
    score = 0;
}

function resetPlayer() {
    player.x = CANVAS_WIDTH / 2 - player.width / 2;
    player.y = CANVAS_HEIGHT - 150;
    player.vx = 0;
    player.vy = JUMP_FORCE;
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
    // Base platform
    platforms.push({ x: 0, y: CANVAS_HEIGHT - 50, width: CANVAS_WIDTH, height: 20 });
    
    // Random platforms
    let y = CANVAS_HEIGHT - 150;
    while (y > -1000) { // Gen ahead
        y -= 80 + Math.random() * 40;
        let x = Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH);
        platforms.push({ x, y, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT });
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Physics
    player.x += player.vx;
    player.y += player.vy;
    player.vy += GRAVITY;

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
            if (
                player.x + player.width > p.x &&
                player.x < p.x + p.width &&
                player.y + player.height > p.y &&
                player.y + player.height < p.y + p.height + player.vy + 2 // Tolerance
            ) {
                player.vy = JUMP_FORCE;
            }
        });
    }

    // Game Over
    if (player.y > CANVAS_HEIGHT) {
        gameOver();
    }
}

function generateNewPlatforms() {
    // Remove platforms below screen
    platforms = platforms.filter(p => p.y < CANVAS_HEIGHT + 50);
    
    // Add new ones at the top
    let highestPlatformY = Math.min(...platforms.map(p => p.y));
    if (highestPlatformY > 50) {
        let y = highestPlatformY - (80 + Math.random() * 40);
        let x = Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH);
        platforms.push({ x, y, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT });
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('final-score').innerText = score;
    document.getElementById('score-hud').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'block';
    
    updateLeaderboardDisplay();
}

// --- Input Handling Details ---
function handleTouchStart(e) {
    if (gameState === 'START' || gameState === 'GAMEOVER') {
        // If game over, clicks might be handled by HTML buttons, but if we tap canvas, maybe restart?
        // Actually, let HTML buttons handle UI clicks.
        // If we are in START screen, any click starts.
        if (gameState === 'START') startGame();
        return;
    }
    
    // Check if it's a mouse event or touch event
    let clientX;
    if (e.type === 'mousedown') {
        clientX = e.clientX;
    } else {
        e.preventDefault(); // Only prevent default for touches to stop scrolling
        clientX = e.touches[0].clientX;
    }

    let canvasRect = canvas.getBoundingClientRect();
    let scale = CANVAS_WIDTH / canvasRect.width;
    let gameX = (clientX - canvasRect.left) * scale;
    
    if (gameX < CANVAS_WIDTH / 2) player.vx = -MOVE_SPEED;
    else player.vx = MOVE_SPEED;
}

function handleTouchMove(e) {
    e.preventDefault(); // Prevent scrolling
}

function handleTouchEnd(e) {
    // If user lifts finger, stop moving? Or should it be tilt-like (continuous)?
    // Usually infinite jumpers are tilt-based. 
    // If using tap sides, stopping on release feels safer for control.
    player.vx = 0;
}

// Ensure mouseup also stops movement
window.addEventListener('mouseup', () => {
    if (gameState === 'PLAYING') player.vx = 0;
});

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
            // Fallback drawing if image not loaded
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw Platforms
    platforms.forEach(p => {
        if (assets.platform.complete && assets.platform.naturalHeight !== 0) {
            ctx.drawImage(assets.platform, p.x, p.y, p.width, p.height);
        } else {
            // Fallback drawing
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
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Leaderboard UI ---
async function updateLeaderboardDisplay() {
    const list = await fetchLeaderboard();
    const container = document.getElementById('leaderboard-list');
    const preview = document.getElementById('leaderboard-preview');
    
    let html = '';
    list.forEach((entry, index) => {
        html += `<div class="leaderboard-item"><span>${index + 1}. ${entry.username}</span><span>${entry.score}</span></div>`;
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
    
    const success = await submitScore(username, score);
    if (success) {
        alert("Score submitted!");
        await updateLeaderboardDisplay();
        btn.style.display = 'none';
    } else {
        alert("Failed to submit score. Check console or config.");
        btn.disabled = false;
        btn.innerText = "Submit Score";
    }
}
