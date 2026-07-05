const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('scoreVal');
const energyVal = document.getElementById('energyVal');
const comboVal = document.getElementById('comboVal');
const highScoreVal = document.getElementById('highScoreVal');
const bestTimeVal = document.getElementById('bestTimeVal');
const timerVal = document.getElementById('timerVal');
const startMenuScreen = document.getElementById('startMenuScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const playerNameInput = document.getElementById('playerNameInput');
const saveNameButton = document.getElementById('saveNameButton');
const howToPlayScreen = document.getElementById('howToPlayScreen');
const optionsScreen = document.getElementById('optionsScreen');
const globalLeaderboardScreen = document.getElementById('globalLeaderboardScreen');
const optionsButton = document.getElementById('optionsButton');
const howToPlayButton = document.getElementById('howToPlayButton');
const leaderboardsButton = document.getElementById('leaderboardsButton');
const closeHowToPlayButton = document.getElementById('closeHowToPlayButton');
const closeOptionsButton = document.getElementById('closeOptionsButton');
const resetSavedNameButton = document.getElementById('resetSavedNameButton');
const clearLocalLeaderboardButton = document.getElementById('clearLocalLeaderboardButton');
const globalLeaderboardList = document.getElementById('globalLeaderboardList');
const globalLeaderboardStatus = document.getElementById('globalLeaderboardStatus');
const closeGlobalLeaderboardButton = document.getElementById('closeGlobalLeaderboardButton');
const nameError = document.getElementById('nameError');
const finalPlayerName = document.getElementById('finalPlayerName');

let highScore = 0;
let bestTimeMs = 0;
try { 
    highScore = parseInt(localStorage.getItem('neonHighScore')) || 0; 
    bestTimeMs = parseInt(localStorage.getItem('neonBestTime')) || 0;
} catch(e) {}
highScoreVal.innerText = highScore;
bestTimeVal.innerText = formatTime(bestTimeMs);

let playerName = '';
let leaderboard = [];
try {
    playerName = (localStorage.getItem('arrowkopoPlayerName') || '').trim();
    leaderboard = JSON.parse(localStorage.getItem('arrowkopoLeaderboard') || '[]');
    if (!Array.isArray(leaderboard)) leaderboard = [];
} catch(e) {
    playerName = '';
    leaderboard = [];
}

let isGameRunning = false;
let gameState = 'menu';

let particles = [];
let floatTexts = [];
let screenShake = 0;
let flashOpacity = 0;

let score = 0;
let energy = 0; 
let ballsEatenTotal = 0;
let isGameOver = false;

let startTime = 0;
let elapsedMilliseconds = 0;
let lastEnemySpawnTime = 0; 

let combo = 1;
let comboTimer = 0;
const COMBO_MAX_TIME = 210;

let dashCharges = 2;
const MAX_DASH_CHARGES = 2;
let dashCooldownTimer = 0;
const DASH_COOLDOWN_MAX = 300; 
let microDashTimer = 0;
const MICRO_DASH_DURATION = 8; 
const DASH_SPEED = 20; 

let empTimer = 0;
let hyperTimer = 0;
let thornTimer = 0; 
const DURATION_HYPER = 120; 
const DURATION_EMP = 180;   
const DURATION_THORN = 180; 

let cdHyperTimer = 0; const CD_HYPER_MAX = 240; 
let cdEmpTimer = 0;   const CD_EMP_MAX = 360;   
let cdThornTimer = 0; const CD_THORN_MAX = 360; 
let cdNukeTimer = 0;  const CD_NUKE_MAX = 480;  

const gridSize = 40;
let unsafeZones = [];
let zoneSpawnTimer = 0;
let trailTick = 0;

// NEW: Edge Spawn Warning Queue
let spawnWarnings = [];

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 16,
    vx: 0, vy: 0,
    accel: 0.55,       
    maxSpeed: 5.2,     
    friction: 0.95,    
    angle: 0,
    history: [] 
};

const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, a: false, s: false, d: false
};

let orbs = [];
const TOTAL_ORBS = 5;
let enemies = [];
let projectiles = [];

if (playerNameInput) playerNameInput.value = playerName;
syncMenuNameState();
renderLeaderboard();

window.addEventListener('keydown', (e) => { if (isGameRunning && e.key in keys) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (isGameRunning && e.key in keys) keys[e.key] = false; });

window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && gameState === 'menu') {
        if (document.activeElement === playerNameInput) {
            lockInPlayerName();
        }
        if (document.activeElement === playerNameInput) {
            lockInPlayerName();
        }
        startGame();
    }

    if (e.key === 'Escape') {
        closeAllMenuModals();
    }
});

playerNameInput.addEventListener('input', syncMenuNameState);
saveNameButton.addEventListener('click', lockInPlayerName);
optionsButton.addEventListener('click', openOptionsScreen);
howToPlayButton.addEventListener('click', openHowToPlayScreen);
leaderboardsButton.addEventListener('click', openGlobalLeaderboard);
closeHowToPlayButton.addEventListener('click', closeHowToPlayScreen);
closeOptionsButton.addEventListener('click', closeOptionsScreen);
resetSavedNameButton.addEventListener('click', resetSavedName);
clearLocalLeaderboardButton.addEventListener('click', clearLocalLeaderboard);
closeGlobalLeaderboardButton.addEventListener('click', closeGlobalLeaderboard);

window.addEventListener('keydown', (e) => {
    if (!isGameRunning || isGameOver) return;
    let key = e.key.toUpperCase();
    let isSpace = (e.key === ' ');

    if (key === 'C') {
        energy = 9999;
        cdHyperTimer = 0;
        cdEmpTimer = 0;
        cdThornTimer = 0;
        cdNukeTimer = 0;
        createImpactCircle(player.x, player.y, '#00ffaa', 150);
        createFloatText(player.x, player.y - 25, "CHEATS ENABLED", "#00ffaa");
        updateDisplays();
        return;
    }

    if (isSpace && dashCharges > 0 && microDashTimer === 0) {
        dashCharges--;
        microDashTimer = MICRO_DASH_DURATION;
        if (dashCooldownTimer === 0) dashCooldownTimer = DASH_COOLDOWN_MAX;
        createImpactCircle(player.x, player.y, '#ffffff', 40);
        updateDisplays();
    }
    // [Q] EMP FREEZE (Now costs 200)
    else if (key === 'Q' && energy >= 200 && cdEmpTimer === 0 && empTimer === 0) {
        energy -= 200;
        empTimer = DURATION_EMP; 
        createImpactCircle(player.x, player.y, '#0088ff', 120);
        createFloatText(player.x, player.y - 25, "EMP FREEZE ENGAGED", "#0088ff");
        updateDisplays();
    }
    // [E] HYPER DASH / SANDEVISTAN (Now costs 450 + Resets Dashes!)
    else if (key === 'E' && energy >= 450 && cdHyperTimer === 0 && hyperTimer === 0) {
        energy -= 450;
        hyperTimer = DURATION_HYPER; 
        // INSTANT DASH REFILL BUFF
        dashCharges = MAX_DASH_CHARGES;
        dashCooldownTimer = 0;
        createImpactCircle(player.x, player.y, '#bb00ff', 90);
        createFloatText(player.x, player.y - 25, "SANDEVISTAN: DASHES REFILLED!", "#bb00ff");
        updateDisplays();
    }
    else if (key === 'F' && energy >= 700 && cdThornTimer === 0 && thornTimer === 0) {
        energy -= 700;
        thornTimer = DURATION_THORN; 
        createImpactCircle(player.x, player.y, '#ffaa00');
        updateDisplays();
    }
    else if (key === 'R' && energy >= 2500 && cdNukeTimer === 0) {
        energy -= 2500;
        cdNukeTimer = CD_NUKE_MAX; 
        triggerNuke();
        updateDisplays();
    }
});

function formatTime(ms) {
    let totalSeconds = ms / 1000;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizePlayerName(value) {
    return value.trim().replace(/\s+/g, ' ').slice(0, 16);
}

function syncMenuNameState() {
    const value = playerNameInput.value;
    const hasName = normalizePlayerName(value).length > 0;
    saveNameButton.disabled = !hasName;
    const bootButton = document.getElementById('bootButton');
    if (bootButton) bootButton.disabled = !hasName;
    if (nameError) nameError.innerText = '';
}

function lockInPlayerName() {
    const nextName = normalizePlayerName(playerNameInput.value);
    if (!nextName) {
        playerName = '';
        try { localStorage.removeItem('arrowkopoPlayerName'); } catch(e) {}
        if (nameError) nameError.innerText = 'Enter a pilot name before starting.';
        syncMenuNameState();
        playerNameInput.focus();
        return false;
    }

    playerName = nextName;
    playerNameInput.value = playerName;
    try { localStorage.setItem('arrowkopoPlayerName', playerName); } catch(e) {}
    if (nameError) nameError.innerText = '';
    syncMenuNameState();
    return true;
}

function loadLeaderboard() {
    try {
        const stored = JSON.parse(localStorage.getItem('arrowkopoLeaderboard') || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch(e) {
        return [];
    }
}

function saveLeaderboard(entries) {
    leaderboard = entries;
    try { localStorage.setItem('arrowkopoLeaderboard', JSON.stringify(entries)); } catch(e) {}
}

function closeAllMenuModals() {
    closeHowToPlayScreen();
    closeOptionsScreen();
    closeGlobalLeaderboard();
}

function showMenuModal(screen) {
    closeAllMenuModals();
    if (!screen) return;
    screen.style.display = 'block';
    screen.setAttribute('aria-hidden', 'false');
}

function hideMenuModal(screen) {
    if (!screen) return;
    screen.style.display = 'none';
    screen.setAttribute('aria-hidden', 'true');
}

function openHowToPlayScreen() {
    showMenuModal(howToPlayScreen);
}

function closeHowToPlayScreen() {
    hideMenuModal(howToPlayScreen);
}

function openOptionsScreen() {
    showMenuModal(optionsScreen);
}

function closeOptionsScreen() {
    hideMenuModal(optionsScreen);
}

function openGlobalLeaderboard() {
    showMenuModal(globalLeaderboardScreen);
    loadGlobalLeaderboard();
}

function closeGlobalLeaderboard() {
    hideMenuModal(globalLeaderboardScreen);
}

function renderGlobalLeaderboard(entries = []) {
    if (!globalLeaderboardList || !globalLeaderboardStatus) return;

    if (!entries.length) {
        globalLeaderboardList.innerHTML = '<li class="leaderboard-empty">No global scores yet.</li>';
        globalLeaderboardStatus.innerText = 'Global leaderboard is waiting for a backend datastore.';
        return;
    }

    globalLeaderboardList.innerHTML = entries.slice(0, 10).map((entry, index) => {
        const safeName = escapeHtml(entry.name || 'UNKNOWN');
        const safeScore = Number(entry.score) || 0;
        const safeTime = formatTime(Number(entry.timeMs) || 0);
        return `<li><span class="lb-name">${index + 1}. ${safeName}</span><span class="lb-meta">${safeScore} pts · ${safeTime}</span></li>`;
    }).join('');

    globalLeaderboardStatus.innerText = 'Loaded from the published global datastore.';
}

async function loadGlobalLeaderboard() {
    if (!globalLeaderboardList || !globalLeaderboardStatus) return;
    globalLeaderboardStatus.innerText = 'Loading global leaderboard...';

    try {
        const response = await fetch('/api/leaderboard', { headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const entries = Array.isArray(data.entries) ? data.entries : [];
        renderGlobalLeaderboard(entries);
    } catch (error) {
        globalLeaderboardList.innerHTML = '<li class="leaderboard-empty">Global leaderboard unavailable on this deployment.</li>';
        globalLeaderboardStatus.innerText = 'Add a Vercel datastore or API endpoint at /api/leaderboard to make this global.';
    }
}

function renderLeaderboard(entries = loadLeaderboard()) {
    leaderboard = entries;
}

function recordLeaderboardRun() {
    if (!playerName) return;

    const updated = loadLeaderboard();
    updated.push({
        name: playerName,
        score,
        timeMs: elapsedMilliseconds,
        savedAt: Date.now()
    });

    updated.sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
        if ((b.timeMs || 0) !== (a.timeMs || 0)) return (b.timeMs || 0) - (a.timeMs || 0);
        return (a.name || '').localeCompare(b.name || '');
    });

    saveLeaderboard(updated.slice(0, 5));
    renderLeaderboard();

    fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: playerName,
            score,
            timeMs: elapsedMilliseconds
        })
    }).catch(() => {});
}

function resetSavedName() {
    playerName = '';
    playerNameInput.value = '';
    try { localStorage.removeItem('arrowkopoPlayerName'); } catch(e) {}
    syncMenuNameState();
    playerNameInput.focus();
}

function clearLocalLeaderboard() {
    saveLeaderboard([]);
    renderLeaderboard();
}

function createParticles(x, y, color, count = 10, speed = 4) {
    for(let i=0; i<count; i++) {
        let angle = Math.random() * Math.PI * 2;
        let s = Math.random() * speed + 1;
        particles.push({
            x, y, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s,
            radius: Math.random() * 3 + 1, color, alpha: 1, decay: Math.random() * 0.03 + 0.01
        });
    }
}

function createImpactCircle(x, y, color, maxR = 60) {
    particles.push({ x, y, radius: 5, maxRadius: maxR, color, type: 'ring', alpha: 1, speed: 4 });
}

function createFloatText(x, y, text, color) {
    floatTexts.push({ x, y, text, color, alpha: 1, vy: -1 });
}

function updateSkillBar() {
    let segSpace = document.getElementById('skill-SPACE');
    let txtSpace = document.getElementById('txt-SPACE');
    if (dashCharges === 0) segSpace.className = 'skill-segment on-cooldown';
    else segSpace.className = 'skill-segment ready s-dash';
    txtSpace.innerText = `[SPACE] DASH (${dashCharges}/${MAX_DASH_CHARGES})`;

    let segQ = document.getElementById('skill-Q'), txtQ = document.getElementById('txt-Q');
    if (cdEmpTimer > 0) { segQ.className = 'skill-segment on-cooldown'; txtQ.innerText = `[Q] CD: ${Math.ceil(cdEmpTimer/60)}s`; }
    else { segQ.className = energy >= 200 ? 'skill-segment ready s-emp' : 'skill-segment'; txtQ.innerText = '[Q] EMP (200)'; }

    let segE = document.getElementById('skill-E'), txtE = document.getElementById('txt-E');
    if (hyperTimer > 0) { segE.className = 'skill-segment ready s-hyper'; txtE.innerText = '[E] SANDEVISTAN'; txtE.style.color = '#ff00ff'; }
    else if (cdHyperTimer > 0) { segE.className = 'skill-segment on-cooldown'; txtE.innerText = `[E] CD: ${Math.ceil(cdHyperTimer/60)}s`; txtE.style.color = ''; }
    else { segE.className = energy >= 450 ? 'skill-segment ready s-hyper' : 'skill-segment'; txtE.innerText = '[E] HYPER DASH (450)'; txtE.style.color = ''; }

    let segF = document.getElementById('skill-F'), txtF = document.getElementById('txt-F');
    if (cdThornTimer > 0) { segF.className = 'skill-segment on-cooldown'; txtF.innerText = `[F] CD: ${Math.ceil(cdThornTimer/60)}s`; }
    else { segF.className = energy >= 700 ? 'skill-segment ready s-thorn' : 'skill-segment'; txtF.innerText = '[F] THORN (700)'; }

    let segR = document.getElementById('skill-R'), txtR = document.getElementById('txt-R');
    if (cdNukeTimer > 0) { segR.className = 'skill-segment on-cooldown'; txtR.innerText = `[R] CD: ${Math.ceil(cdNukeTimer/60)}s`; }
    else { segR.className = energy >= 2500 ? 'skill-segment ready s-nuke' : 'skill-segment'; txtR.innerText = '[R] NUKE (2500)'; }
}

function updateDisplays() {
    scoreVal.innerText = score;
    energyVal.innerText = energy;
    updateSkillBar();
}

// PURPLE & YELLOW ORBS ONLY (Red orb removed for visual clarity)
function spawnOrb() {
    const roll = Math.random();
    let type, color, points, glow;
    if (roll < 0.60) {
        type = 'purple'; color = '#dd00ff'; points = 5; glow = 12;
    } else {
        type = 'yellow'; color = '#ffff00'; points = 10; glow = 15;
    }
    return {
        x: Math.random() * (canvas.width - 80) + 40,
        y: Math.random() * (canvas.height - 80) + 40,
        radius: type === 'purple' ? 9 : 12,
        type, color, points, glow
    };
}

// CREATE EDGE WARNING INDICATOR BEFORE SPAWNING ENEMY
function createSpawnWarning(forcedType) {
    let x, y, edgeX, edgeY;
    if (Math.random() < 0.5) {
        let isLeft = Math.random() < 0.5;
        x = isLeft ? -30 : canvas.width + 30;
        y = Math.random() * canvas.height;
        edgeX = isLeft ? 25 : canvas.width - 25;
        edgeY = Math.max(25, Math.min(canvas.height - 25, y));
    } else {
        let isTop = Math.random() < 0.5;
        x = Math.random() * canvas.width;
        y = isTop ? -30 : canvas.height + 30;
        edgeX = Math.max(25, Math.min(canvas.width - 25, x));
        edgeY = isTop ? 25 : canvas.height - 25;
    }
    spawnWarnings.push({ x, y, edgeX, edgeY, type: forcedType, timer: 60 });
}

function spawnEnemy(type, x, y) {
    let secondsSurv = elapsedMilliseconds / 1000;
    let speedScaling = Math.min(1.5, secondsSurv * 0.012);
    let speed, radius, color;

    if (type === 'elite') {
        speed = 2.4 + speedScaling; radius = 10; color = '#ff0000';
    } else if (type === 'juggernaut') {
        speed = 1.0 + (speedScaling * 0.5); radius = 24; color = '#990022';
    } else if (type === 'turret') {
        speed = 0; radius = 15; color = '#ff00aa';
        x = Math.random() * (canvas.width - 200) + 100; y = Math.random() * (canvas.height - 200) + 100;
    } else {
        type = 'normal'; speed = 1.6 + speedScaling; radius = 13; color = '#ff5500';
    }

    enemies.push({ x, y, type, speed, radius, color, angle: 0, shootTimer: Math.floor(Math.random() * 60) + 60 });
}

function triggerRandomHazard(currentSecondsSurvived) {
    const roll = Math.random();
    let lifetime = 360; 
    let lethalThreshold = 240; 
    let speedMultiplier = Math.min(2.5, 1.0 + (currentSecondsSurvived / 60) * 0.5);
    
    if (roll < 0.6) {
        let laserRoll = Math.random();
        let subType = 'horizontal';
        if (currentSecondsSurvived >= 120 && laserRoll < 0.33) subType = 'diagonal';
        else if (laserRoll < 0.5) subType = 'vertical';

        let dir = Math.random() < 0.5 ? 1 : -1;
        let baseSpeed = 1.0 + Math.random() * 1.5; 
        let finalSpeed = dir * baseSpeed * speedMultiplier;

        if (subType === 'diagonal') {
            unsafeZones.push({
                type: 'line', subType: 'diagonal', isForwardSlash: Math.random() < 0.5,
                offset: 0, vx: finalSpeed, timer: lifetime, lethalThreshold: lethalThreshold, state: 'warning'
            });
        } else {
            let isVertical = (subType === 'vertical');
            unsafeZones.push({
                type: 'line', subType: isVertical ? 'vertical' : 'horizontal',
                pos: isVertical ? (Math.random() * canvas.width) : (Math.random() * canvas.height),
                v: finalSpeed, timer: lifetime, lethalThreshold: lethalThreshold, state: 'warning'
            });
        }
    } else {
        const maxCol = Math.floor(canvas.width / gridSize) - 3;
        const maxRow = Math.floor(canvas.height / gridSize) - 3;
        unsafeZones.push({
            type: 'box', x: Math.floor(Math.random() * maxCol) * gridSize, y: Math.floor(Math.random() * maxRow) * gridSize,
            size: gridSize * 3, timer: lifetime, lethalThreshold: lethalThreshold, state: 'warning'
        });
    }
}

function triggerNuke() {
    let baseReward = enemies.length * 30;
    score += baseReward; energy += baseReward;
    enemies.forEach(e => createParticles(e.x, e.y, e.color, 15, 6));
    projectiles.forEach(p => createParticles(p.x, p.y, p.color, 4, 3));
    enemies = []; projectiles = [];
    updateDisplays();
    flashOpacity = 0.8; screenShake = 30;
}

function startGame() {
    if (!lockInPlayerName()) return;
    closeAllMenuModals();
    startMenuScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    isGameRunning = true;
    gameState = 'playing';
    startTime = performance.now();
    lastEnemySpawnTime = 0;
}
document.getElementById('bootButton').addEventListener('click', startGame);

function showMenu() {
    init();
    isGameRunning = false;
    isGameOver = false;
    gameState = 'menu';
    startMenuScreen.style.display = 'block';
    gameOverScreen.style.display = 'none';
    closeGlobalLeaderboard();
    closeHowToPlayScreen();
    closeOptionsScreen();
    syncMenuNameState();
    setTimeout(() => playerNameInput.focus(), 0);
}

function returnToMenu() {
    showMenu();
}

function init() {
    score = 0; energy = 0; ballsEatenTotal = 0; isGameOver = false;
    combo = 1; comboTimer = 0; empTimer = 0; hyperTimer = 0; thornTimer = 0;
    dashCharges = MAX_DASH_CHARGES; dashCooldownTimer = 0; microDashTimer = 0;
    cdHyperTimer = 0; cdEmpTimer = 0; cdThornTimer = 0; cdNukeTimer = 0;
    unsafeZones = []; zoneSpawnTimer = 0; lastEnemySpawnTime = 0;
    particles = []; floatTexts = []; screenShake = 0; flashOpacity = 0;
    trailTick = 0;
    spawnWarnings = [];
    
    document.getElementById('fill-E').style.width = '0%'; document.getElementById('cd-E').style.height = '0%';
    document.getElementById('fill-Q').style.width = '0%'; document.getElementById('cd-Q').style.height = '0%';
    document.getElementById('fill-F').style.width = '0%'; document.getElementById('cd-F').style.height = '0%';
    document.getElementById('cd-R').style.height = '0%'; document.getElementById('cd-SPACE').style.height = '0%';

    updateDisplays();
    timerVal.innerText = "00:00"; bestTimeVal.innerText = formatTime(bestTimeMs);
    comboVal.innerText = ''; gameOverScreen.style.display = 'none';

    player.x = canvas.width / 2; player.y = canvas.height / 2;
    player.vx = 0; player.vy = 0; player.history = [];
    for (let k in keys) keys[k] = false;

    orbs = [];
    for (let i = 0; i < TOTAL_ORBS; i++) { orbs.push(spawnOrb()); }
    enemies = []; projectiles = [];
}

function triggerGameOver() {
    isGameOver = true;
    gameState = 'gameover';
    isGameRunning = false;
    recordLeaderboardRun();
    createParticles(player.x, player.y, '#00ffff', 40, 8);
    screenShake = 40;
    if (score > highScore) { highScore = score; try { localStorage.setItem('neonHighScore', highScore); } catch(e) {} }
    if (elapsedMilliseconds > bestTimeMs) { bestTimeMs = elapsedMilliseconds; try { localStorage.setItem('neonBestTime', bestTimeMs); } catch(e) {} }
    setTimeout(() => {
        finalPlayerName.innerText = playerName || 'UNKNOWN';
        document.getElementById('finalScore').innerText = score;
        document.getElementById('finalTime').innerText = formatTime(elapsedMilliseconds);
        document.getElementById('finalBestTime').innerText = formatTime(bestTimeMs);
        document.getElementById('finalHighScore').innerText = highScore;
        gameOverScreen.style.display = 'block';
    }, 800);
}

function distToLine(x, y, x1, y1, x2, y2) {
    let A = x - x1; let B = y - y1; let C = x2 - x1; let D = y2 - y1;
    let dot = A * C + B * D; let lenSq = C * C + D * D;
    let param = -1; if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; } else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    return Math.sqrt((x - xx) * (x - xx) + (y - yy) * (y - yy));
}

function update() {
    if (!isGameRunning) return;

    particles = particles.filter(p => {
        if (p.type === 'ring') { p.radius += p.speed; p.alpha -= 0.02; return p.alpha > 0; }
        else { p.x += p.vx; p.y += p.vy; p.alpha -= p.decay; return p.alpha > 0; }
    });
    floatTexts = floatTexts.filter(ft => { ft.y += ft.vy; ft.alpha -= 0.015; return ft.alpha > 0; });

    if (isGameOver) return;

    elapsedMilliseconds = performance.now() - startTime;
    let currentSecondsSurvived = elapsedMilliseconds / 1000;
    timerVal.innerText = formatTime(elapsedMilliseconds);

    if (elapsedMilliseconds > bestTimeMs) { bestTimeVal.innerText = formatTime(elapsedMilliseconds); }

    let minutePhase = Math.floor(currentSecondsSurvived / 60) + 1;
    let spawnInterval = Math.max(4, 12 - (minutePhase * 2)); 

    if (currentSecondsSurvived - lastEnemySpawnTime >= spawnInterval) {
        lastEnemySpawnTime += spawnInterval;
        if (minutePhase === 1) createSpawnWarning('normal');
        else if (minutePhase === 2) { createSpawnWarning('normal'); createSpawnWarning('elite'); }
        else if (minutePhase === 3) { createSpawnWarning('normal'); createSpawnWarning('elite'); createSpawnWarning('juggernaut'); }
        else { createSpawnWarning('normal'); createSpawnWarning('elite'); createSpawnWarning('juggernaut'); createSpawnWarning('turret'); }
    }

    // PROCESS EDGE SPAWN WARNINGS (Frozen during EMP)
    for (let i = spawnWarnings.length - 1; i >= 0; i--) {
        if (empTimer === 0) spawnWarnings[i].timer--;
        if (spawnWarnings[i].timer <= 0) {
            spawnEnemy(spawnWarnings[i].type, spawnWarnings[i].x, spawnWarnings[i].y);
            spawnWarnings.splice(i, 1);
        }
    }

    let cdChanged = false;

    if (dashCharges < MAX_DASH_CHARGES) {
        dashCooldownTimer--;
        document.getElementById('cd-SPACE').style.height = (dashCooldownTimer / DASH_COOLDOWN_MAX * 100) + '%';
        if (dashCooldownTimer <= 0) {
            dashCharges++;
            dashCooldownTimer = (dashCharges < MAX_DASH_CHARGES) ? DASH_COOLDOWN_MAX : 0;
            cdChanged = true;
        }
    }

    if (hyperTimer > 0) {
        hyperTimer--;
        document.getElementById('fill-E').style.width = (hyperTimer / DURATION_HYPER * 100) + '%';
        if (hyperTimer === 0) { cdHyperTimer = CD_HYPER_MAX; cdChanged = true; } 
    } else { document.getElementById('fill-E').style.width = '0%'; }

    if (empTimer > 0) {
        empTimer--;
        document.getElementById('fill-Q').style.width = (empTimer / DURATION_EMP * 100) + '%';
        if (empTimer === 0) { cdEmpTimer = CD_EMP_MAX; cdChanged = true; }
    } else { document.getElementById('fill-Q').style.width = '0%'; }

    if (thornTimer > 0) {
        thornTimer--;
        document.getElementById('fill-F').style.width = (thornTimer / DURATION_THORN * 100) + '%';
        if (thornTimer === 0) { cdThornTimer = CD_THORN_MAX; cdChanged = true; }
    } else { document.getElementById('fill-F').style.width = '0%'; }

    if (hyperTimer === 0 && cdHyperTimer > 0) { cdHyperTimer--; document.getElementById('cd-E').style.height = (cdHyperTimer / CD_HYPER_MAX * 100) + '%'; if(cdHyperTimer===0) cdChanged=true; }
    if (empTimer === 0 && cdEmpTimer > 0) { cdEmpTimer--; document.getElementById('cd-Q').style.height = (cdEmpTimer / CD_EMP_MAX * 100) + '%'; if(cdEmpTimer===0) cdChanged=true; }
    if (thornTimer === 0 && cdThornTimer > 0) { cdThornTimer--; document.getElementById('cd-F').style.height = (cdThornTimer / CD_THORN_MAX * 100) + '%'; if(cdThornTimer===0) cdChanged=true; }
    if (cdNukeTimer > 0) { cdNukeTimer--; document.getElementById('cd-R').style.height = (cdNukeTimer / CD_NUKE_MAX * 100) + '%'; if(cdNukeTimer===0) cdChanged=true; }
    
    if (cdChanged) updateSkillBar();

    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) { combo = 1; comboVal.innerText = ''; }
    }

    // MOVEMENT: PURE HYPER DASH VELOCITY (Zero world slowdown!)
    if (microDashTimer > 0) {
        microDashTimer--;
        player.vx = Math.cos(player.angle) * DASH_SPEED;
        player.vy = Math.sin(player.angle) * DASH_SPEED;
    } else {
        let ax = 0, ay = 0;
        let currentAccel = (hyperTimer > 0) ? player.accel * 2.2 : player.accel;
        let currentMaxSpeed = (hyperTimer > 0) ? player.maxSpeed * 1.8 : player.maxSpeed;

        if (keys.ArrowUp || keys.w) ay -= currentAccel;
        if (keys.ArrowDown || keys.s) ay += currentAccel;
        if (keys.ArrowLeft || keys.a) ax -= currentAccel;
        if (keys.ArrowRight || keys.d) ax += currentAccel;

        player.vx += ax; player.vy += ay;
        let speedMag = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        if (speedMag > currentMaxSpeed) { player.vx = (player.vx / speedMag) * currentMaxSpeed; player.vy = (player.vy / speedMag) * currentMaxSpeed; }
        player.vx *= player.friction; player.vy *= player.friction;
    }

    player.x += player.vx; player.y += player.vy;
    if (Math.abs(player.vx) > 0.2 || Math.abs(player.vy) > 0.2) { player.angle = Math.atan2(player.vy, player.vx); }

    if (hyperTimer > 0 || microDashTimer > 0) {
        if (Math.sqrt(player.vx * player.vx + player.vy * player.vy) > 0.5) {
            player.history.push({ x: player.x, y: player.y, angle: player.angle });
            let trailCap = (hyperTimer > 0) ? 24 : 6; 
            if (player.history.length > trailCap) player.history.shift();
        }
    } else {
        if (player.history.length > 0) player.history.shift();
    }

    if (player.x < player.radius) player.x = player.radius;
    if (player.x > canvas.width - player.radius) player.x = canvas.width - player.radius;
    if (player.y < player.radius) player.y = player.radius;
    if (player.y > canvas.height - player.radius) player.y = canvas.height - player.radius;

    orbs.forEach((orb, index) => {
        if (Math.sqrt((player.x - orb.x)**2 + (player.y - orb.y)**2) < player.radius + orb.radius) {
            if (comboTimer > 0 && combo < 5) combo++;
            comboTimer = COMBO_MAX_TIME;
            if (combo > 1) comboVal.innerText = `${combo}x COMBO!`;
            let pointsGained = orb.points * combo;
            score += pointsGained; energy += pointsGained;
            createParticles(orb.x, orb.y, orb.color, 12, 4);
            createFloatText(orb.x, orb.y - 10, `+${pointsGained}`, orb.color);
            screenShake = Math.max(screenShake, 4);
            updateDisplays();
            ballsEatenTotal++; orbs[index] = spawnOrb();
        }
    });

    // ENEMY TICK PROCESSORS (Only EMP freezes them now!)
    enemies.forEach((enemy, i) => {
        enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        if (empTimer === 0) {
            if (enemy.type === 'turret') {
                enemy.shootTimer--; 
                if (enemy.shootTimer <= 0) {
                    let dynamicProjSpeed = 3.5 + (Math.floor(currentSecondsSurvived / 5) * 0.15);
                    projectiles.push({
                        x: enemy.x, y: enemy.y, vx: Math.cos(enemy.angle) * dynamicProjSpeed, vy: Math.sin(enemy.angle) * dynamicProjSpeed,
                        radius: 6, color: '#ff00aa'
                    });
                    enemy.shootTimer = 120; 
                }
            } else {
                enemy.x += Math.cos(enemy.angle) * enemy.speed;
                enemy.y += Math.sin(enemy.angle) * enemy.speed;
            }
        }

        if (Math.sqrt((player.x - enemy.x)**2 + (player.y - enemy.y)**2) < player.radius + enemy.radius && microDashTimer === 0) {
            if (thornTimer > 0) { 
                createParticles(enemy.x, enemy.y, enemy.color, 15, 5);
                createFloatText(enemy.x, enemy.y, `+50`, '#ffaa00');
                enemies.splice(i, 1); score += 50; energy += 50;
                screenShake = Math.max(screenShake, 8); updateDisplays();
            } else { triggerGameOver(); }
        }
    });

    projectiles.forEach((p, i) => {
        if (empTimer === 0) { p.x += p.vx; p.y += p.vy; }
        if (Math.sqrt((player.x - p.x)**2 + (player.y - p.y)**2) < player.radius + p.radius && microDashTimer === 0) {
            if (thornTimer > 0) { createParticles(p.x, p.y, p.color, 6, 3); projectiles.splice(i, 1); }
            else { triggerGameOver(); }
        }
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { projectiles.splice(i, 1); }
    });

    if (empTimer === 0) zoneSpawnTimer++; 
    let countToSpawn = 1; let timeIntervalGate = 360; 
    if (currentSecondsSurvived >= 60 && currentSecondsSurvived < 180) countToSpawn = 2; 
    else if (currentSecondsSurvived >= 180) { countToSpawn = 3; timeIntervalGate = 300; }

    if (zoneSpawnTimer > timeIntervalGate) { 
        if (Math.random() < 0.7) { for(let k = 0; k < countToSpawn; k++) triggerRandomHazard(currentSecondsSurvived); }
        zoneSpawnTimer = 0; 
    }

    // HAZARDS WITH FADE-OUT DISSOLVE
    for (let i = unsafeZones.length - 1; i >= 0; i--) {
        let z = unsafeZones[i];
        if (empTimer === 0) z.timer--;

        if (z.state === 'fading') {
            if (empTimer === 0) z.fadeTimer--;
            if (z.fadeTimer <= 0) unsafeZones.splice(i, 1);
            continue;
        }

        if (z.timer <= z.lethalThreshold) z.state = 'lethal'; 
        if (z.timer <= 0) {
            z.state = 'fading';
            z.fadeTimer = 15;
            continue;
        }

        if (empTimer === 0) {
            if (z.type === 'line') {
                if (z.subType === 'vertical') { z.pos += z.v; if (z.pos <= 0 || z.pos >= canvas.width) z.v *= -1; }
                else if (z.subType === 'horizontal') { z.pos += z.v; if (z.pos <= 0 || z.pos >= canvas.height) z.v *= -1; }
                else if (z.subType === 'diagonal') { z.offset += z.vx; if (Math.abs(z.offset) > canvas.width * 1.5) z.vx *= -1; }
            }
        }

        if (z.state === 'lethal' && thornTimer === 0 && microDashTimer === 0) {
            if (z.type === 'box') {
                if (player.x > z.x && player.x < z.x + z.size && player.y > z.y && player.y < z.y + z.size) triggerGameOver();
            } else if (z.type === 'line') {
                if (z.subType === 'vertical' && Math.abs(player.x - z.pos) < player.radius + 6) triggerGameOver();
                else if (z.subType === 'horizontal' && Math.abs(player.y - z.pos) < player.radius + 6) triggerGameOver();
                else if (z.subType === 'diagonal') {
                    let d = z.isForwardSlash ? 
                        distToLine(player.x, player.y, z.offset - canvas.width, canvas.height * 2, z.offset + canvas.width * 2, -canvas.height) : 
                        distToLine(player.x, player.y, z.offset - canvas.width, -canvas.height, z.offset + canvas.width * 2, canvas.height * 2);
                    if (d < player.radius + 6) triggerGameOver();
                }
            }
        }
    }

    if(screenShake > 0) screenShake *= 0.9; if(flashOpacity > 0) flashOpacity -= 0.04;
}

function draw() {
    ctx.save();
    if (screenShake > 0.5) { ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake); }

    ctx.fillStyle = '#080814'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (hyperTimer > 0) {
        ctx.fillStyle = 'rgba(187, 0, 255, 0.03)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = '#16162d'; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    // RENDER EDGE SPAWN WARNING INDICATORS
    spawnWarnings.forEach(w => {
        ctx.save();
        ctx.translate(w.edgeX, w.edgeY);
        let pulse = Math.floor(w.timer / 8) % 2 === 0;
        ctx.fillStyle = pulse ? '#ff0000' : '#ffff00';
        ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle;
        ctx.font = 'bold 22px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 0);
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    });

    unsafeZones.forEach(z => {
        ctx.save();
        if (z.state === 'fading') {
            let alpha = (z.fadeTimer / 15) * 0.5;
            ctx.strokeStyle = `rgba(255, 180, 255, ${alpha})`;
            ctx.fillStyle = `rgba(255, 180, 255, ${alpha * 0.2})`;
            ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff'; ctx.lineWidth = 8 * (z.fadeTimer / 15);
        } else if (z.state === 'warning') {
            ctx.strokeStyle = Math.floor(z.timer / 10) % 2 === 0 ? '#ffff00' : '#ff0000';
            ctx.fillStyle = Math.floor(z.timer / 10) % 2 === 0 ? 'rgba(255, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.15)';
            ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
        } else {
            ctx.strokeStyle = '#ff0033'; ctx.fillStyle = 'rgba(255, 0, 50, 0.5)';
            ctx.shadowBlur = 25; ctx.shadowColor = '#ff0033'; ctx.lineWidth = 12; 
        }

        if (z.type === 'box') {
            ctx.fillRect(z.x, z.y, z.size, z.size); ctx.strokeRect(z.x, z.y, z.size, z.size);
        } else if (z.type === 'line') {
            ctx.beginPath();
            if (z.subType === 'vertical') { ctx.moveTo(z.pos, 0); ctx.lineTo(z.pos, canvas.height); }
            else if (z.subType === 'horizontal') { ctx.moveTo(0, z.pos); ctx.lineTo(canvas.width, z.pos); }
            else if (z.subType === 'diagonal') {
                if (z.isForwardSlash) { ctx.moveTo(z.offset - canvas.width, canvas.height * 2); ctx.lineTo(z.offset + canvas.width * 2, -canvas.height); }
                else { ctx.moveTo(z.offset - canvas.width, -canvas.height); ctx.lineTo(z.offset + canvas.width * 2, canvas.height * 2); }
            }
            ctx.stroke();
        }
        ctx.restore();
    });

    orbs.forEach(orb => {
        ctx.save(); ctx.shadowBlur = orb.glow; ctx.shadowColor = orb.color; ctx.fillStyle = orb.color;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    projectiles.forEach(p => {
        ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    enemies.forEach(enemy => {
        ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(enemy.angle);
        let enemyColor = empTimer > 0 ? '#0088ff' : enemy.color;
        ctx.shadowBlur = empTimer > 0 ? 5 : 12; ctx.shadowColor = enemyColor; ctx.fillStyle = enemyColor;
        
        if (enemy.type === 'turret') {
            ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(0, -4, enemy.radius + 8, 8);
        } else {
            ctx.beginPath(); ctx.moveTo(enemy.radius, 0); ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
            ctx.lineTo(-enemy.radius * 0.3, 0); ctx.lineTo(-enemy.radius, enemy.radius * 0.8); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    });

    // SOLID OPACITY SANDEVISTAN RAINBOW AFTERIMAGE ENGINE
    if ((hyperTimer > 0 || microDashTimer > 0) && player.history.length > 0) {
        player.history.forEach((h, i) => {
            ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.angle); 
            let trailColor = `rgba(255, 255, 255, ${0.12 * (i + 1)})`; 
            
            if (hyperTimer > 0) {
                let progress = i / player.history.length;
                let hue = progress * 240; 
                // Highly visible, solid opacity clones (from 75% to 100% alpha!)
                let alpha = 0.75 + (progress * 0.25); 
                trailColor = `hsla(${hue}, 100%, 55%, ${alpha})`;
            }
            
            ctx.fillStyle = trailColor;
            ctx.beginPath(); ctx.moveTo(player.radius, 0); ctx.lineTo(-player.radius, -player.radius * 0.75);
            ctx.lineTo(-player.radius * 0.35, 0); ctx.lineTo(-player.radius, player.radius * 0.75); ctx.closePath(); ctx.fill(); ctx.restore();
        });
    }

    ctx.save(); ctx.translate(player.x, player.y);
    if (thornTimer > 0) {
        ctx.save(); ctx.beginPath();
        let spikes = 10; let outerRadius = player.radius + 14; let innerRadius = player.radius + 6;
        for (let i = 0; i < spikes * 2; i++) {
            let radius = i % 2 === 0 ? outerRadius : innerRadius; let angle = (i * Math.PI) / spikes;
            if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath(); ctx.strokeStyle = '#ffaa00'; ctx.fillStyle = 'rgba(255, 170, 0, 0.15)'; ctx.lineWidth = 2;
        ctx.rotate(performance.now() / 120); ctx.shadowBlur = 20; ctx.shadowColor = '#ffaa00'; ctx.fill(); ctx.stroke(); ctx.restore();
    }

    ctx.rotate(player.angle);
    let playerColor = '#00ffff';
    if (hyperTimer > 0) playerColor = '#bb00ff';
    if (microDashTimer > 0) playerColor = '#ffffff'; 
    
    ctx.shadowBlur = (hyperTimer > 0 || microDashTimer > 0) ? 30 : 18; ctx.shadowColor = playerColor; ctx.fillStyle = playerColor;
    ctx.beginPath(); ctx.moveTo(player.radius, 0); ctx.lineTo(-player.radius, -player.radius * 0.75);
    ctx.lineTo(-player.radius * 0.35, 0); ctx.lineTo(-player.radius, player.radius * 0.75); ctx.closePath(); ctx.fill(); ctx.restore();

    particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
        if (p.type === 'ring') { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.stroke(); }
        else { ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2); }
        ctx.restore();
    });

    floatTexts.forEach(ft => {
        ctx.save(); ctx.globalAlpha = ft.alpha; ctx.fillStyle = ft.color; ctx.font = 'bold 16px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
    });

    if (flashOpacity > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.restore();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
function resetGame() {
    init();
    startMenuScreen.style.display = 'none';
    isGameRunning = true;
    gameState = 'playing';
    startTime = performance.now();
}

showMenu();
gameLoop();