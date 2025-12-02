import { initSupabase, fetchLeaderboard, submitScore, isOnline } from './supabase.js';

// Import assets to ensure Vite handles paths correctly
import characterImgUrl from './src/assets/character.png';
import cloudImgUrl from './src/assets/cloud.svg';
import platformImgUrl from './src/assets/platform.svg';
import balloonBlueImgUrl from './src/assets/balloon_blue.svg';
import balloonRedImgUrl from './src/assets/balloon_red.svg';

// Global error handler for mobile debugging
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
    // Uncomment for aggressive debugging on mobile
    // alert('Error: ' + msg);
    return false;
};

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

assets.character.src = characterImgUrl;
assets.cloud.src = cloudImgUrl;
assets.platform.src = platformImgUrl;
assets.balloonBlue.src = balloonBlueImgUrl;
assets.balloonRed.src = balloonRedImgUrl;

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
    currentJumpMultiplier: 1.0,
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
function init() {
    try {
        console.log("Initializing Game...");
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }
        ctx = canvas.getContext('2d');

        // Resize canvas
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Inputs
        setupInputs();

        // Generate initial clouds
        generateClouds();

        // Load config from Vite environment variables
        // Use try-catch for env access just in case
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            initSupabase(supabaseUrl, supabaseAnonKey);

            // Debugging helper for UI
            if (window.supabaseOfflineReason) {
                console.log("Supabase Offline Reason:", window.supabaseOfflineReason);
            }
        } catch (e) {
            console.warn("Env vars missing or failed, running offline.", e);
            initSupabase(null, null);
        }

        // Initial Render
        updateLeaderboardDisplay();
        requestAnimationFrame(gameLoop);
        console.log("Game Initialized.");
    } catch (e) {
        console.error("Critical Init Error:", e);
        alert("Game Init Error: " + e.message);
    }
}

// Module-compatible Initialization
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    window.addEventListener('DOMContentLoaded', init);
    // Fallback: if DOMContentLoaded already fired (unlikely with module but safe)
    window.addEventListener('load', init);
}

function resizeCanvas() {
    if (!canvas) return;
    let scale = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
}

function setupInputs() {
    // Touch Events
    // Note: We removed handleTouchStart from canvas for movement to prevent conflict with Tap-to-Jump.
    // Movement is now controlled by onscreen buttons or keyboard.
    
    const handleRight = (e) => {
        if(e.cancelable) e.preventDefault();
        if (gameState === 'PLAYING') player.vx = MOVE_SPEED;
    };

    const stopMove = (e) => {
        if(e.cancelable) e.preventDefault();
        if (gameState === 'PLAYING') player.vx = 0;
    };

    const handleLeft = (e) => {
        if(e.cancelable) e.preventDefault();
        if (gameState === 'PLAYING') player.vx = -MOVE_SPEED;
    };

    // Grab zone elements
    const leftZone = document.getElementById('zone-left');
    const rightZone = document.getElementById('zone-right');

    // Left Zone
    if (leftZone) {
        leftZone.addEventListener('touchstart', handleLeft);
        leftZone.addEventListener('mousedown', handleLeft);
        leftZone.addEventListener('touchend', stopMove);
        leftZone.addEventListener('mouseup', stopMove);
        leftZone.addEventListener('mouseleave', stopMove);
    }

    // Right Zone
    if (rightZone) {
        rightZone.addEventListener('touchstart', handleRight);
        rightZone.addEventListener('mousedown', handleRight);
        rightZone.addEventListener('touchend', stopMove);
        rightZone.addEventListener('mouseup', stopMove);
        rightZone.addEventListener('mouseleave', stopMove);
    }

    // Canvas Tap (Top Half - since bottom is covered by zones) for Jump
    // Note: Since the control zones are overlaying the canvas at the bottom,
    // clicking the canvas naturally means clicking the top half (or the start/gameover screens).
    canvas.addEventListener('touchstart', (e) => {
         // Only jump if we are not interacting with UI buttons
         if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('control-zone')) {
             attemptJump();
         }
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
}

// --- Game Logic ---
function startGame() {
    if (gameState === 'PLAYING') return;
    
    gameState = 'PLAYING';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('score-hud').style.display = 'flex';
    document.getElementById('controls-layer').style.display = 'flex';
    
    resetPlayer();
    generateInitialPlatforms();
    lastTime = performance.now();
}

function resetGame() {
    gameState = 'START';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('score-hud').style.display = 'none';
    document.getElementById('controls-layer').style.display = 'none';
    score = 0;
}

function resetPlayer() {
    player.x = CANVAS_WIDTH / 2 - player.width / 2;
    player.y = CANVAS_HEIGHT - 150;
    player.vx = 0;
    player.vy = INITIAL_JUMP_FORCE;
    player.jumpForce = INITIAL_JUMP_FORCE;
    player.currentJumpMultiplier = 1.0;
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
        // console.log(`Spawned ${type} balloon at ${x}, ${y}`);
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
                player.y + player.height < p.y + p.height + (player.vy * dt) + 10 // Increased tolerance
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
            } else if (item.type === 'red') {
                // Increase multiplier by 1%, max 10%
                player.currentJumpMultiplier = Math.min(player.currentJumpMultiplier + 0.01, 1.10);
                player.jumpForce = INITIAL_JUMP_FORCE * player.currentJumpMultiplier;
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
    document.getElementById('controls-layer').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'block';
    
    updateLeaderboardDisplay();
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

    // Safety check for large dt (e.g. tab background)
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // Cap at 100ms

    lastTime = timestamp;

    try {
        update(dt);
        draw();
    } catch (e) {
        console.error("Game Loop Error:", e);
    }

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
