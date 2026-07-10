// =========================================================================
// SECTION 1: GLOBAL DOM CACHING & PERFORMANCE REGISTRY
// =========================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('scoreVal');
const energyVal = document.getElementById('energyVal');
const comboVal = document.getElementById('comboVal');
const highScoreVal = document.getElementById('highScoreVal');
const bestTimeVal = document.getElementById('bestTimeVal');
const timerVal = document.getElementById('timerVal');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalPlayerName = document.getElementById('finalPlayerName');

// CACHED UI SKILL ELEMENTS (Prevents layout thrashing/micro-stuttering)
const domSkillElements = {
    space: { seg: document.getElementById('skill-SPACE'), txt: document.getElementById('txt-SPACE'), cd: document.getElementById('cd-SPACE') },
    q:     { seg: document.getElementById('skill-Q'),     txt: document.getElementById('txt-Q'),     fill: document.getElementById('fill-Q'), cd: document.getElementById('cd-Q') },
    e:     { seg: document.getElementById('skill-E'),     txt: document.getElementById('txt-E'),     fill: document.getElementById('fill-E'), cd: document.getElementById('cd-E') },
    f:     { seg: document.getElementById('skill-F'),     txt: document.getElementById('txt-F'),     fill: document.getElementById('fill-F'), cd: document.getElementById('cd-F') },
    r:     { seg: document.getElementById('skill-R'),     txt: document.getElementById('txt-R'),     cd: document.getElementById('cd-R') }
};


// =========================================================================
// SECTION 2: TUNING CONFIGURATION & BALANCING VALUES (Change numbers here!)
// =========================================================================
// CORE METRICS
const TOTAL_ORBS = 5;               // Number of score items on screen at once
const gridSize = 40;                 // Grid backdrop segment sizing step

// CORE ORB BALANCING (OPTION A: Shared values keep scores comparable!)
const PURPLE_ORB_BASE = 5;           // Purple Orb baseline (25 points at 5x combo)
const YELLOW_ORB_BASE = 10;          // Yellow Orb baseline (50 points at 5x combo)

// HARDCORE MODE BONUS PAYOUTS
const HARDCORE_CREDIT_MULTIPLIER = 2; // Flat 2x bonus multiplier for credit conversion run payouts

// DROP MATRIX ADJUSTMENTS
const DASH_ORB_CHANCE = 0.10;        // 10% chance to drop a blue Dash-Refill orb in Hardcore

// MECHANICS TIMING GATES
const COMBO_MAX_TIME = 210;         // Frames before combo multiplier breaks
const DASH_COOLDOWN_MAX = 300;       // Cooldown duration for standard Dash
const MICRO_DASH_DURATION = 8;       // Total invincibility frames during a Dash
const DASH_SPEED = 20;               // Burst movement velocity during Dash

// ABILITY DURATIONS (In Frames)
const DURATION_HYPER = 120;          // Sandevistan active window
const DURATION_EMP = 180;            // EMP freeze active window
const DURATION_THORN = 180;          // Thorn Shield active window

// ABILITY COOLDOWNS (In Frames)
const CD_HYPER_MAX = 240;            // Sandevistan cooldown gate
const CD_EMP_MAX = 360;              // EMP blast cooldown gate
const CD_THORN_MAX = 360;            // Thorn Shield cooldown gate
const CD_NUKE_MAX = 480;             // Tactical Nuke cooldown gate

// ARCADE ECONOMY MULTIPLIERS
const SCORE_TO_CREDIT_RATIO = 100;   // 100 Points = 1 operational cash credit


// =========================================================================
// SECTION 3: CORE GAME ENGINE STATE MACHINES
// =========================================================================
let playerName = "CYBER_RUNNER";
let selectedGameMode = "normal";
let playerAccentColor = "#00ffff"; // Equipped aesthetic engine color tint

// STATE BUFFER HOOKS
let isGameRunning = false;
let isGameOver = false;
let isPaused = false;
let pauseStartTime = 0;
let totalPausedTimeAccumulated = 0;

// GAME ENTITIES REGISTRIES
let particles = [];
let floatTexts = [];
let spawnWarnings = [];
let orbs = [];
let enemies = [];
let projectiles = [];
let unsafeZones = [];

// PLAYER SYSTEM STATUS OBJECT
const player = { 
    x: canvas.width / 2, 
    y: canvas.height / 2, 
    radius: 16, 
    vx: 0, 
    vy: 0, 
    accel: 0.55, 
    maxSpeed: 5.2, 
    friction: 0.95, 
    angle: 0, 
    history: []                      // Keeps track of past vectors for neon trail drawing
};

// KEYBOARD KEY MAP STATUS BUFFERS
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

// LIVE RUN COUNTERS
let highScore = 0; 
let bestTimeMs = 0;
let score = 0; 
let energy = 0; 
let ballsEatenTotal = 0;
let startTime = 0; 
let elapsedMilliseconds = 0; 
let lastEnemySpawnTime = 0; 
let screenShake = 0; 
let flashOpacity = 0;
let combo = 1; 
let comboTimer = 0;

// ABILITY STATE COUNTERS
let dashCharges = 2; 
const MAX_DASH_CHARGES = 2; 
let dashCooldownTimer = 0; 
let microDashTimer = 0;
let empTimer = 0; 
let hyperTimer = 0; 
let thornTimer = 0;
let cdHyperTimer = 0; 
let cdEmpTimer = 0; 
let cdThornTimer = 0; 
let cdNukeTimer = 0;

// READ LOCAL DATA MEMORY STATE HANDSHAKES
try { 
    const storedName = localStorage.getItem('arrowkopoPlayerName'); 
    if (storedName) playerName = storedName;
    
    const storedMode = localStorage.getItem('arrowkopoActiveMode');
    if (storedMode) selectedGameMode = storedMode;

    const storedColor = localStorage.getItem('arrowkopoPlayerColor');
    if (storedColor) playerAccentColor = storedColor;
} catch(e) {}

// INTEGRATE REBINDABLE CONTROL MAPPINGS
const defaultKeys = { dash: ' ', emp: 'q', hyper: 'e', thorn: 'f', nuke: 'r', reboot: 'enter' };
let customKeys = defaultKeys;
try {
    let storedKeys = JSON.parse(localStorage.getItem('arrowkopoKeybinds'));
    if(storedKeys) customKeys = { ...defaultKeys, ...storedKeys };
} catch(e) {}

// SYNCHRONIZE METRIC DISPLAYS
try { highScore = parseInt(localStorage.getItem('neonHighScore')) || 0; bestTimeMs = parseInt(localStorage.getItem('neonBestTime')) || 0; } catch(e) {}
if (highScoreVal) highScoreVal.innerText = highScore; 
if (bestTimeVal) bestTimeVal.innerText = formatTime(bestTimeMs);


// =========================================================================
// SECTION 4: ANTI-EXPLOIT BLUR INTERCEPTORS (PAUSE SYSTEMS)
// =========================================================================
document.addEventListener('visibilitychange', handleWindowFocusLoss);
window.addEventListener('blur', () => { if (isGameRunning && !isGameOver) triggerPauseState(false); });

function handleWindowFocusLoss() {
    if (document.hidden && isGameRunning && !isGameOver) {
        triggerPauseState(false);
    }
}

function triggerPauseState(isManual = false) {
    if (isPaused) return;
    isPaused = true;
    pauseStartTime = performance.now();
    
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper && !document.getElementById('pauseOverlayScreen')) {
        const pDiv = document.createElement('div');
        pDiv.id = 'pauseOverlayScreen';
        
        const messageText = isManual 
            ? "Simulation context manually suspended by pilot sequence request." 
            : "Window defocus detected. Environment loop frozen to defend clock stability.";

        pDiv.innerHTML = `
            <div class="menu-badge" style="color: #ff0055; border-color: #ff0055; background: rgba(255,0,85,0.05);">CRITICAL SUSPEND</div>
            <h1 style="color: #fff; font-size: 36px; text-shadow: 0 0 15px #ff0055; margin: 10px 0; font-family: inherit;">SYSTEM PAUSED</h1>
            <p style="color: #8888aa; font-size: 14px; margin: 0 0 25px 0; font-family: inherit;">${messageText}</p>
            
            <div style="display: flex; flex-direction: column; gap: 12px; width: 280px; margin: 0 auto;">
                <button id="resumeMatchBtn" class="primary-button" style="width: 100%;">CLICK TO RESUME</button>
                <button id="pauseMainMenuBtn" class="secondary-button" style="width: 100%; font-size: 14px; padding: 10px 20px;">ABANDON TO MAIN MENU</button>
            </div>
        `;
        wrapper.appendChild(pDiv);
        
        document.getElementById('resumeMatchBtn').addEventListener('click', resumeGamePlayState);
        document.getElementById('pauseMainMenuBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

function resumeGamePlayState() {
    if (!isPaused) return;
    const pDiv = document.getElementById('pauseOverlayScreen');
    if (pDiv) pDiv.remove();
    
    totalPausedTimeAccumulated += (performance.now() - pauseStartTime);
    isPaused = false;
    
    for (let k in keys) keys[k] = false;
}


// =========================================================================
// SECTION 5: INPUT CONTROLLER EVENTS ENGINE (ABILITIES LOGIC)
// =========================================================================
window.addEventListener('keydown', (e) => { if (isGameRunning && !isPaused && e.key in keys) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (isGameRunning && e.key in keys) keys[e.key] = false; });

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        if (isGameRunning && !isGameOver) {
            if (isPaused) resumeGamePlayState();
            else triggerPauseState(true);
        }
        return;
    }

    let eKey = e.key.toLowerCase();

    // MATCH RESTARTS HANDSHAKE
    if (isGameOver && (eKey === customKeys.reboot || eKey === 'r')) {
        resetGame();
        return;
    }

    if (!isGameRunning || isGameOver || isPaused) return;

    // REMAPPED DEV SANDBOX MODE (Press [K] for max resources)
    if (eKey === 'k') {
        energy = 9999; cdHyperTimer = 0; cdEmpTimer = 0; cdThornTimer = 0; cdNukeTimer = 0;
        createImpactCircle(player.x, player.y, '#00ffaa', 150); createFloatText(player.x, player.y - 25, "DEV GOD MODE ENABLED", "#00ffaa"); updateDisplays(); return;
    }

    // MAP DYNAMIC KEYBIND TRIGGERS
    if (eKey === customKeys.dash && dashCharges > 0 && microDashTimer === 0) {
        dashCharges--; microDashTimer = MICRO_DASH_DURATION; if (dashCooldownTimer === 0) dashCooldownTimer = DASH_COOLDOWN_MAX;
        createImpactCircle(player.x, player.y, '#ffffff', 40); updateDisplays();
    }
    else if (eKey === customKeys.emp && energy >= 200 && cdEmpTimer === 0 && empTimer === 0) {
        energy -= 200; empTimer = DURATION_EMP; createImpactCircle(player.x, player.y, '#0088ff', 120); createFloatText(player.x, player.y - 25, "EMP FREEZE ENGAGED", "#0088ff"); updateDisplays();
    }
    else if (eKey === customKeys.hyper && energy >= 450 && cdHyperTimer === 0 && hyperTimer === 0) {
        energy -= 450; hyperTimer = DURATION_HYPER; dashCharges = MAX_DASH_CHARGES; dashCooldownTimer = 0;
        createImpactCircle(player.x, player.y, '#bb00ff', 90); createFloatText(player.x, player.y - 25, "SANDEVISTAN: DASHES REFILLED!", "#bb00ff"); updateDisplays();
    }
    else if (eKey === customKeys.thorn && energy >= 700 && cdThornTimer === 0 && thornTimer === 0) {
        energy -= 700; thornTimer = DURATION_THORN; createImpactCircle(player.x, player.y, '#ffaa00'); updateDisplays();
    }
    else if (eKey === customKeys.nuke && energy >= 2500 && cdNukeTimer === 0) {
        energy -= 2500; cdNukeTimer = CD_NUKE_MAX; triggerNuke(); updateDisplays();
    }
});


// =========================================================================
// SECTION 6: AUXILIARY RENDERING MECHANICS (PARTICLES / EFFECTS)
// =========================================================================
function formatTime(ms) { let totalSeconds = ms / 1000; let minutes = Math.floor(totalSeconds / 60); let seconds = Math.floor(totalSeconds % 60); return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; }
function createParticles(x, y, color, count = 10, speed = 4) { for(let i=0; i<count; i++) { let angle = Math.random() * Math.PI * 2; let s = Math.random() * speed + 1; particles.push({ x, y, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s, radius: Math.random() * 3 + 1, color, alpha: 1, decay: Math.random() * 0.03 + 0.01 }); } }
function createImpactCircle(x, y, color, maxR = 60) { particles.push({ x, y, radius: 5, maxRadius: maxR, color, type: 'ring', alpha: 1, speed: 4 }); }
function createFloatText(x, y, text, color) { floatTexts.push({ x, y, text, color, alpha: 1, vy: -1 }); }

// SKILL HUD TEXT ASSIGNMENTS
function updateSkillBar() {
    let dk = customKeys.dash === ' ' ? 'SPACE' : customKeys.dash.toUpperCase();
    let qk = customKeys.emp.toUpperCase();
    let ek = customKeys.hyper.toUpperCase();
    let fk = customKeys.thorn.toUpperCase();
    let rk = customKeys.nuke.toUpperCase();

    if (domSkillElements.space.seg) {
        domSkillElements.space.seg.className = (dashCharges === 0) ? 'skill-segment on-cooldown' : 'skill-segment ready s-dash';
        domSkillElements.space.txt.innerText = `[${dk}] DASH (${dashCharges}/${MAX_DASH_CHARGES})`;
    }

    if (domSkillElements.q.seg) {
        if (cdEmpTimer > 0) { domSkillElements.q.seg.className = 'skill-segment on-cooldown'; domSkillElements.q.txt.innerText = `[${qk}] CD: ${Math.ceil(cdEmpTimer/60)}s`; } 
        else { domSkillElements.q.seg.className = energy >= 200 ? 'skill-segment ready s-emp' : 'skill-segment'; domSkillElements.q.txt.innerText = `[${qk}] EMP (200)`; }
    }

    if (domSkillElements.e.seg) {
        if (hyperTimer > 0) { domSkillElements.e.seg.className = 'skill-segment ready s-hyper'; domSkillElements.e.txt.innerText = `[${ek}] SANDEVISTAN`; domSkillElements.e.txt.style.color = '#ff00ff'; }
        else if (cdHyperTimer > 0) { domSkillElements.e.seg.className = 'skill-segment on-cooldown'; domSkillElements.e.txt.innerText = `[${ek}] CD: ${Math.ceil(cdHyperTimer/60)}s`; domSkillElements.e.txt.style.color = ''; }
        else { domSkillElements.e.seg.className = energy >= 450 ? 'skill-segment ready s-hyper' : 'skill-segment'; domSkillElements.e.txt.innerText = `[${ek}] HYPER DASH (450)`; domSkillElements.e.txt.style.color = ''; }
    }

    if (domSkillElements.f.seg) {
        if (cdThornTimer > 0) { domSkillElements.f.seg.className = 'skill-segment on-cooldown'; domSkillElements.f.txt.innerText = `[${fk}] CD: ${Math.ceil(cdThornTimer/60)}s`; } 
        else { domSkillElements.f.seg.className = energy >= 700 ? 'skill-segment ready s-thorn' : 'skill-segment'; domSkillElements.f.txt.innerText = `[${fk}] THORN (700)`; }
    }

    if (domSkillElements.r.seg) {
        if (cdNukeTimer > 0) { domSkillElements.r.seg.className = 'skill-segment on-cooldown'; domSkillElements.r.txt.innerText = `[${rk}] CD: ${Math.ceil(cdNukeTimer/60)}s`; } 
        else { domSkillElements.r.seg.className = energy >= 2500 ? 'skill-segment ready s-nuke' : 'skill-segment'; domSkillElements.r.txt.innerText = `[${rk}] NUKE (2500)`; }
    }
}

function updateDisplays() { scoreVal.innerText = score; energyVal.innerText = energy; updateSkillBar(); }


// =========================================================================
// SECTION 7: SPONTANEOUS SPAWN AND DATA CALCULATORS
// =========================================================================
function spawnOrb() {
    const roll = Math.random(); let type, color, points, glow;
    
    // ADJUSTED BALL DROP RATE: Triggers the lifeline blue cluster strictly at 10%[cite: 4]
    if (selectedGameMode === "hard" && roll < DASH_ORB_CHANCE) { 
        type = 'blue'; color = '#00ffff'; points = 15; glow = 20; 
    } else if (roll < 0.60) { 
        type = 'purple'; color = '#dd00ff'; points = PURPLE_ORB_BASE; glow = 12; // Base 5
    } else { 
        type = 'yellow'; color = '#ffff00'; points = YELLOW_ORB_BASE; glow = 15; // Base 10
    }
    return { x: Math.random() * (canvas.width - 80) + 40, y: Math.random() * (canvas.height - 80) + 40, radius: type === 'yellow' ? 12 : 9, type, color, points, glow };
}

function createSpawnWarning(forcedType) {
    let x, y, edgeX, edgeY;
    if (Math.random() < 0.5) { let isLeft = Math.random() < 0.5; x = isLeft ? -30 : canvas.width + 30; y = Math.random() * canvas.height; edgeX = isLeft ? 25 : canvas.width - 25; edgeY = Math.max(25, Math.min(canvas.height - 25, y)); } 
    else { let isTop = Math.random() < 0.5; x = Math.random() * canvas.width; y = isTop ? -30 : canvas.height + 30; edgeX = Math.max(25, Math.min(canvas.width - 25, x)); edgeY = isTop ? 25 : canvas.height - 25; }
    spawnWarnings.push({ x, y, edgeX, edgeY, type: forcedType, timer: 60 });
}

function spawnEnemy(type, x, y) {
    let secondsSurv = elapsedMilliseconds / 1000; let speedScaling = Math.min(1.5, secondsSurv * 0.012); let speed, radius, color;
    let modeMultiplier = (selectedGameMode === "hard") ? 1.6 : 1.0;

    if (type === 'elite') { speed = (2.3 + speedScaling) * modeMultiplier; radius = 10; color = '#ff0000'; } 
    else if (type === 'juggernaut') { speed = (1.0 + (speedScaling * 0.5)) * modeMultiplier; radius = 24; color = '#990022'; }
    else if (type === 'turret') { speed = 0; radius = 15; color = '#ff00aa'; x = Math.random() * (canvas.width - 200) + 100; y = Math.random() * (canvas.height - 200) + 100; }
    else { type = 'normal'; speed = (1.6 + speedScaling) * modeMultiplier; radius = 13; color = '#ff5500'; }
    
    // --- 1 & 5. PROBABILISTIC PROGRESSION WAVE MATRIX ENGINE ---
    let isKamikaze = false;
    if (selectedGameMode === "hard") {
        if (secondsSurv < 60) {
            // WAVE 1 (0sec - 1min): 20% standalone roll probability to introduce a Seeker to shake up pathways
            if (type === 'normal' && Math.random() < 0.20) {
                isKamikaze = true; color = '#ffaa00'; speed = 4.2;
            }
        } else {
            // WAVE 2 (1min+): Floodgates unleash! Higher base acceleration vectors across the grid[cite: 1]
            if (type === 'normal' && Math.random() < 0.45) { // 45% chance for Kamikazes
                isKamikaze = true; color = '#ffaa00'; speed = 4.6;
            }
        }
    }

    enemies.push({ x, y, type, speed, radius, color, angle: 0, shootTimer: Math.floor(Math.random() * 60) + 60, isKamikaze, targetX: player.x, targetY: player.y });
}

function triggerRandomHazard(currentSecondsSurvived) {
    const roll = Math.random();
    let speedMultiplier = Math.min(2.5, 1.0 + (currentSecondsSurvived / 60) * 0.5);
    
    // --- 2. LASER THREAT MATRIX DURATION DECREMENTS ---
    let lifetime       = (selectedGameMode === "hard") ? 100 : 360; 
    let lethalThreshold = (selectedGameMode === "hard") ? 80  : 240; 

    if (roll < 0.6) {
        let laserRoll = Math.random(); 
        let subType = 'horizontal'; 
        if (currentSecondsSurvived >= 120 && laserRoll < 0.33) subType = 'diagonal'; 
        else if (laserRoll < 0.5) subType = 'vertical';
        
        let dir = Math.random() < 0.5 ? 1 : -1; 
        let finalSpeed = dir * (1.0 + Math.random() * 1.5) * speedMultiplier;

        if (subType === 'diagonal') {
            unsafeZones.push({ type: 'line', subType: 'diagonal', isForwardSlash: Math.random() < 0.5, offset: 0, vx: finalSpeed, timer: lifetime, lethalThreshold, state: 'warning', hasFaked: false });
        } else {
            unsafeZones.push({ type: 'line', subType: subType === 'vertical' ? 'vertical' : 'horizontal', pos: subType === 'vertical' ? (Math.random() * canvas.width) : (Math.random() * canvas.height), v: finalSpeed, timer: lifetime, lethalThreshold, state: 'warning', hasFaked: false });
        }
    } else {
        const maxCol = Math.floor(canvas.width / gridSize) - 3; 
        const maxRow = Math.floor(canvas.height / gridSize) - 3;
        
        unsafeZones.push({ type: 'box', x: Math.floor(Math.random() * maxCol) * gridSize, y: Math.floor(Math.random() * maxRow) * gridSize, size: gridSize * 3, timer: lifetime, lethalThreshold, state: 'warning' });
    }
}

function triggerNuke() {
    let baseReward = enemies.length * 30; score += baseReward; energy += baseReward;
    enemies.forEach(e => createParticles(e.x, e.y, e.color, 15, 6)); projectiles.forEach(p => createParticles(p.x, p.y, p.color, 4, 3));
    enemies = []; projectiles = []; updateDisplays(); flashOpacity = 0.8; screenShake = 30;
}

function distToLine(x, y, x1, y1, x2, y2) {
    let A = x - x1; let B = y - y1; let C = x2 - x1; let D = y2 - y1; let dot = A * C + B * D; let lenSq = C * C + D * D; let param = -1; if (lenSq !== 0) param = dot / lenSq;
    let xx, yy; if (param < 0) { xx = x1; yy = y1; } else if (param > 1) { xx = x2; yy = y2; } else { xx = x1 + param * C; yy = y1 + param * D; }
    return Math.sqrt((x - xx) * (x - xx) + (y - yy) * (y - yy));
}


// =========================================================================
// SECTION 8: SYSTEM INITIALIZATION BOOT MATRIX (RESET RUN)
// =========================================================================
function init() {
    score = 0; energy = 0; ballsEatenTotal = 0; isGameOver = false; combo = 1; comboTimer = 0; empTimer = 0; hyperTimer = 0; thornTimer = 0;
    dashCharges = MAX_DASH_CHARGES; dashCooldownTimer = 0; microDashTimer = 0; cdHyperTimer = 0; cdEmpTimer = 0; cdThornTimer = 0; cdNukeTimer = 0;
    unsafeZones = []; zoneSpawnTimer = 0; lastEnemySpawnTime = 0; particles = []; floatTexts = []; screenShake = 0; flashOpacity = 0; spawnWarnings = [];
    totalPausedTimeAccumulated = 0; isPaused = false;
    
    if (domSkillElements.e.fill) domSkillElements.e.fill.style.width = '0%'; if (domSkillElements.e.cd) domSkillElements.e.cd.style.height = '0%';
    if (domSkillElements.q.fill) domSkillElements.q.fill.style.width = '0%'; if (domSkillElements.q.cd) domSkillElements.q.cd.style.height = '0%';
    if (domSkillElements.f.fill) domSkillElements.f.fill.style.width = '0%'; if (domSkillElements.f.cd) domSkillElements.f.cd.style.height = '0%';
    if (domSkillElements.r.cd) domSkillElements.r.cd.style.height = '0%'; if (domSkillElements.space.cd) domSkillElements.space.cd.style.height = '0%';

    updateDisplays(); 
    if (timerVal) timerVal.innerText = "00:00"; 
    if (bestTimeVal) bestTimeVal.innerText = formatTime(bestTimeMs); 
    if (comboVal) comboVal.innerText = ''; 
    if (gameOverScreen) gameOverScreen.style.display = 'none';

    const skillBar = document.querySelector('#skill-bar-container') || document.getElementById('scoreVal').parentElement;
    const oldBadge = document.getElementById('hardcoreModeBadge');
    if (oldBadge) oldBadge.remove();

    if (selectedGameMode === "hard") {
        const badge = document.createElement('div');
        badge.id = 'hardcoreModeBadge';
        badge.innerText = "HARDCORE SIMULATION ACTIVE";
        badge.style.cssText = "color: #ff0055; font-weight: bold; font-size: 14px; text-align: center; letter-spacing: 2px; text-shadow: 0 0 10px #ff0055; margin-bottom: 10px; font-family: 'Courier New', monospace;";
        if (skillBar) skillBar.parentNode.insertBefore(badge, skillBar);
        if (timerVal) timerVal.style.color = "#ff0055";
    } else {
        if (timerVal) timerVal.style.color = "#00ffff";
    }

    player.x = canvas.width / 2; player.y = canvas.height / 2; player.vx = 0; player.vy = 0; player.history = []; for (let k in keys) keys[k] = false;
    orbs = []; for (let i = 0; i < TOTAL_ORBS; i++) { orbs.push(spawnOrb()); } enemies = []; projectiles = [];

    loadIngameLeaderboard();
}

function triggerGameOver() {
    isGameOver = true; isGameRunning = false;
    
    // --- OPTION A ECONOMY PAYOUT INTERCEPTOR ---
    let baseCredits = Math.floor(score / SCORE_TO_CREDIT_RATIO);
    let creditsEarned = baseCredits;
    
    if (selectedGameMode === "hard" && baseCredits > 0) {
        // Multiplies operational wallet rewards by 2x if run was finalized inside Hardcore[cite: 1]
        creditsEarned = baseCredits * HARDCORE_CREDIT_MULTIPLIER;
    }

    if (creditsEarned > 0) {
        try {
            let currentBalance = parseInt(localStorage.getItem('arrowkopoCreditsBalance')) || 0;
            let newBalance = currentBalance + creditsEarned;
            localStorage.setItem('arrowkopoCreditsBalance', newBalance.toString());
            
            let labelText = (selectedGameMode === "hard") ? `+${creditsEarned} CR (2X MODE BONUS)` : `+${creditsEarned} CR CONVERTED`;
            createFloatText(player.x, player.y - 45, labelText, "#ffff00");
        } catch(e) {}
    }

    if (typeof saveScoreRun === "function") { saveScoreRun(playerName, score, elapsedMilliseconds); }
    createParticles(player.x, player.y, '#00ffff', 40, 8); screenShake = 40;
    
    if (score > highScore) { 
        highScore = score; 
        try { localStorage.setItem('neonHighScore', highScore); } catch(e) {} 
        if (highScoreVal) highScoreVal.innerText = highScore;
    }
    
    if (elapsedMilliseconds > bestTimeMs) { bestTimeMs = elapsedMilliseconds; try { localStorage.setItem('neonBestTime', bestTimeMs); } catch(e) {} }
    
    setTimeout(() => {
        if (finalPlayerName) finalPlayerName.innerText = playerName; 
        if (document.getElementById('finalScore')) document.getElementById('finalScore').innerText = score;
        if (document.getElementById('finalTime')) document.getElementById('finalTime').innerText = formatTime(elapsedMilliseconds); 
        if (document.getElementById('finalBestTime')) document.getElementById('finalBestTime').innerText = formatTime(bestTimeMs);
        if (document.getElementById('finalHighScore')) document.getElementById('finalHighScore').innerText = highScore; 

        const rebootBtn = document.querySelector('#gameOverScreen .primary-button');
        if (rebootBtn) {
            let rbk = customKeys.reboot === ' ' ? 'SPACE' : customKeys.reboot.toUpperCase();
            rebootBtn.innerText = `REBOOT SYSTEM [${rbk}]`;
        }

        if (gameOverScreen) gameOverScreen.style.display = 'block';
    }, 800);
}


// =========================================================================
// SECTION 9: ACTIVE GAMEPLAY CLOCK LOOP INTERFACE (PER-FRAME TICK)
// =========================================================================
function update() {
    if (!isGameRunning || isPaused) return;
    particles = particles.filter(p => { if (p.type === 'ring') { p.radius += p.speed; p.alpha -= 0.02; return p.alpha > 0; } else { p.x += p.vx; p.y += p.vy; p.alpha -= p.decay; return p.alpha > 0; } });
    floatTexts = floatTexts.filter(ft => { ft.y += ft.vy; ft.alpha -= 0.015; return ft.alpha > 0; });
    if (isGameOver) return;

    elapsedMilliseconds = (performance.now() - startTime) - totalPausedTimeAccumulated;
    let currentSecondsSurvived = elapsedMilliseconds / 1000;
    if (timerVal) timerVal.innerText = formatTime(elapsedMilliseconds);
    if (elapsedMilliseconds > bestTimeMs && bestTimeVal) { bestTimeVal.innerText = formatTime(elapsedMilliseconds); }
    if (score > highScore && highScoreVal) { highScoreVal.innerText = score; }

    // --- 1 & 5. CONDENSED PHASE WAVE SPAWN SCALING TIMERS ---
    let minutePhase = Math.floor(currentSecondsSurvived / 60) + 1; 
    let spawnInterval;
    
    if (selectedGameMode === "hard") {
        // FIXED: Using currentSecondsSurvived instead of the undefined secondsSurv variable
        spawnInterval = (currentSecondsSurvived < 60) 
            ? Math.max(3.5, 7 - (currentSecondsSurvived * 0.05)) 
            : Math.max(1.8, 4 - ((currentSecondsSurvived - 60) * 0.03));
    } else {
        spawnInterval = Math.max(4, 12 - (minutePhase * 2));
    }

    if (currentSecondsSurvived - lastEnemySpawnTime >= spawnInterval) {
        lastEnemySpawnTime += currentSecondsSurvived;
        
        if (selectedGameMode === "hard") {
            if (currentSecondsSurvived < 60) {
                // Wave 1: Mostly normal runners and fast trackers[cite: 1]
                Math.random() < 0.65 ? createSpawnWarning('normal') : createSpawnWarning('elite');
            } else {
                // Wave 2 (1min+): Unlocks big units and floods the screen with side turrets![cite: 1]
                let roll = Math.random();
                if (roll < 0.35) createSpawnWarning('normal');
                else if (roll < 0.65) createSpawnWarning('elite');
                else if (roll < 0.82) createSpawnWarning('juggernaut');
                else createSpawnWarning('turret');
            }
        } else {
            if (minutePhase === 1) createSpawnWarning('normal'); 
            else if (minutePhase === 2) { createSpawnWarning('normal'); createSpawnWarning('elite'); }
            else if (minutePhase === 3) { createSpawnWarning('normal'); createSpawnWarning('elite'); createSpawnWarning('juggernaut'); }
            else { createSpawnWarning('normal'); createSpawnWarning('elite'); createSpawnWarning('juggernaut'); createSpawnWarning('turret'); }
        }
    }

    for (let i = spawnWarnings.length - 1; i >= 0; i--) {
        if (empTimer === 0) spawnWarnings[i].timer--;
        if (spawnWarnings[i].timer <= 0) { spawnEnemy(spawnWarnings[i].type, spawnWarnings[i].x, spawnWarnings[i].y); spawnWarnings.splice(i, 1); }
    }

    let cdChanged = false;
    if (dashCharges < MAX_DASH_CHARGES) {
        dashCooldownTimer--; 
        if (domSkillElements.space.cd) domSkillElements.space.cd.style.height = (dashCooldownTimer / DASH_COOLDOWN_MAX * 100) + '%';
        if (dashCooldownTimer <= 0) { dashCharges++; dashCooldownTimer = (dashCharges < MAX_DASH_CHARGES) ? DASH_COOLDOWN_MAX : 0; cdChanged = true; }
    }

    if (hyperTimer > 0) {
        hyperTimer--; if (domSkillElements.e.fill) domSkillElements.e.fill.style.width = (hyperTimer / DURATION_HYPER * 100) + '%';
        if (hyperTimer === 0) { cdHyperTimer = CD_HYPER_MAX; cdChanged = true; } 
    } else { if (domSkillElements.e.fill) domSkillElements.e.fill.style.width = '0%'; }

    if (empTimer > 0) {
        empTimer--; if (domSkillElements.q.fill) domSkillElements.q.fill.style.width = (empTimer / DURATION_EMP * 100) + '%';
        if (empTimer === 0) { cdEmpTimer = CD_EMP_MAX; cdChanged = true; }
    } else { if (domSkillElements.q.fill) domSkillElements.q.fill.style.width = '0%'; }

    if (thornTimer > 0) {
        thornTimer--; if (domSkillElements.f.fill) domSkillElements.f.fill.style.width = (thornTimer / DURATION_THORN * 100) + '%';
        if (thornTimer === 0) { cdThornTimer = CD_THORN_MAX; cdChanged = true; }
    } else { if (domSkillElements.f.fill) domSkillElements.f.fill.style.width = '0%'; }

    if (hyperTimer === 0 && cdHyperTimer > 0) { cdHyperTimer--; if (domSkillElements.e.cd) domSkillElements.e.cd.style.height = (cdHyperTimer / CD_HYPER_MAX * 100) + '%'; if(cdHyperTimer===0) cdChanged=true; }
    if (empTimer === 0 && cdEmpTimer > 0) { cdEmpTimer--; if (domSkillElements.q.cd) domSkillElements.q.cd.style.height = (cdEmpTimer / CD_EMP_MAX * 100) + '%'; if(cdEmpTimer===0) cdChanged=true; }
    if (thornTimer === 0 && cdThornTimer > 0) { cdThornTimer--; if (domSkillElements.f.cd) domSkillElements.f.cd.style.height = (cdThornTimer / CD_THORN_MAX * 100) + '%'; if(cdThornTimer===0) cdChanged=true; }
    if (cdNukeTimer > 0) { cdNukeTimer--; if (domSkillElements.r.cd) domSkillElements.r.cd.style.height = (cdNukeTimer / CD_NUKE_MAX * 100) + '%'; if(cdNukeTimer===0) cdChanged=true; }
    if (cdChanged) updateSkillBar();

    if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) { combo = 1; if (comboVal) comboVal.innerText = ''; } }

    if (microDashTimer > 0) {
        microDashTimer--; player.vx = Math.cos(player.angle) * DASH_SPEED; player.vy = Math.sin(player.angle) * DASH_SPEED;
    } else {
        let ax = 0, ay = 0; let currentAccel = (hyperTimer > 0) ? player.accel * 2.2 : player.accel; let currentMaxSpeed = (hyperTimer > 0) ? player.maxSpeed * 1.8 : player.maxSpeed;
        if (keys.ArrowUp || keys.w) ay -= currentAccel; if (keys.ArrowDown || keys.s) ay += currentAccel; if (keys.ArrowLeft || keys.a) ax -= currentAccel; if (keys.ArrowRight || keys.d) ax += currentAccel;
        player.vx += ax; player.vy += ay; let speedMag = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
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
        if (player.history.length > 0) player.history.splice(0, player.history.length); 
    }

    if (player.x < player.radius) player.x = player.radius; if (player.x > canvas.width - player.radius) player.x = canvas.width - player.radius;
    if (player.y < player.radius) player.y = player.radius; if (player.y > canvas.height - player.radius) player.y = canvas.height - player.radius;

    orbs.forEach((orb, index) => {
        if (Math.sqrt((player.x - orb.x)**2 + (player.y - orb.y)**2) < player.radius + orb.radius) {
            if (comboTimer > 0 && combo < 5) combo++; comboTimer = COMBO_MAX_TIME; if (combo > 1 && comboVal) comboVal.innerText = `${combo}x COMBO!`;
            
            let pointsGained = orb.points * combo; 
            score += pointsGained; energy += pointsGained;
            
            // DYNAMIC BLUE LIFELINE ACTION
            if (orb.type === 'blue') {
                if (dashCharges < MAX_DASH_CHARGES) dashCharges++;
                createFloatText(orb.x, orb.y - 25, "DASH CHARGE RESTOCKED", "#00ffff");
            }

            createParticles(orb.x, orb.y, orb.color, 12, 4); createFloatText(orb.x, orb.y - 10, `+${pointsGained}`, orb.color); screenShake = Math.max(screenShake, 4); updateDisplays();
            ballsEatenTotal++; orbs[index] = spawnOrb();
        }
    });

    enemies.forEach((enemy, i) => {
        if (empTimer === 0) {
            if (enemy.isKamikaze) {
                let distToTarget = Math.sqrt((enemy.x - enemy.targetX)**2 + (enemy.y - enemy.targetY)**2);
                if (distToTarget < 12) {
                    enemy.targetX = player.x; enemy.targetY = player.y; // Track fluidly if point is achieved
                }
                enemy.angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
                enemy.x += Math.cos(enemy.angle) * enemy.speed; enemy.y += Math.sin(enemy.angle) * enemy.speed;
            } else {
                enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                if (enemy.type === 'turret') {
                    enemy.shootTimer--; if (enemy.shootTimer <= 0) {
                        // 1min+ Bullet Hell condition: bullets sprint at speed 8.5[cite: 1]
                        let projectileVelocity = (selectedGameMode === "hard") ? 8.5 : 3.5 + (Math.floor(currentSecondsSurvived / 5) * 0.15);
                        projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(enemy.angle) * projectileVelocity, vy: Math.sin(enemy.angle) * projectileVelocity, radius: 6, color: '#ff00aa' }); enemy.shootTimer = 120; 
                    }
                } else { enemy.x += Math.cos(enemy.angle) * enemy.speed; enemy.y += Math.sin(enemy.angle) * enemy.speed; }
            }
        }
        if (Math.sqrt((player.x - enemy.x)**2 + (player.y - enemy.y)**2) < player.radius + enemy.radius && microDashTimer === 0) {
            if (thornTimer > 0) { 
                createParticles(enemy.x, enemy.y, enemy.color, 15, 5); createFloatText(enemy.x, enemy.y, `+${50}`, '#ffaa00');
                enemies.splice(i, 1); score += 50; energy += 50; screenShake = Math.max(screenShake, 8); updateDisplays();
            } else { triggerGameOver(); }
        }
    });

    projectiles.forEach((p, i) => {
        if (empTimer === 0) { p.x += p.vx; p.y += p.vy; }
        if (Math.sqrt((player.x - p.x)**2 + (player.y - p.y)**2) < player.radius + p.radius && microDashTimer === 0) { if (thornTimer > 0) { createParticles(p.x, p.y, p.color, 6, 3); projectiles.splice(i, 1); } else { triggerGameOver(); } }
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { projectiles.splice(i, 1); }
    });

    if (empTimer === 0) zoneSpawnTimer++; 
    
    // --- 2. THE HARDCORE LASER GATES CORRECTION ---
    // Drastically lower check intervals from 120/160 down to 65 frames to guarantee continuous grid sweeps[cite: 1]
    let timeIntervalGate;
    if (selectedGameMode === "hard") {
        timeIntervalGate = (currentSecondsSurvived < 60) ? 180 : 120;
    } else {
        timeIntervalGate = (currentSecondsSurvived < 180) ? 360 : 300;
    }

    if (zoneSpawnTimer > timeIntervalGate) { 
        // Guarantee hazard generation pass inside hardcore modes
        if (selectedGameMode === "hard" || Math.random() < 0.7) { 
            // 1 laser at a time for the first minute, 2 lasers at a time after that
            let maxCount = (selectedGameMode === "hard") ? (currentSecondsSurvived < 60 ? 1 : 2) : 1;
            for(let k = 0; k < maxCount; k++) triggerRandomHazard(currentSecondsSurvived); 
        } 
        zoneSpawnTimer = 0; 
    }

    for (let i = unsafeZones.length - 1; i >= 0; i--) {
        let z = unsafeZones[i]; if (empTimer === 0) z.timer--;
        
        if (z.state === 'fading') { 
            let fadeStep = (selectedGameMode === "hard") ? 3 : 1;
            if (empTimer === 0) z.fadeTimer -= fadeStep; 
            if (z.fadeTimer <= 0) unsafeZones.splice(i, 1); 
            continue; 
        }
        
        if (z.timer <= z.lethalThreshold) z.state = 'lethal'; 
        if (z.timer <= 0) { z.state = 'fading'; z.fadeTimer = 15; continue; }
        
        if (selectedGameMode === "hard" && z.type === 'line' && !z.hasFaked && z.timer === z.lethalThreshold + 4) {
            z.hasFaked = true;
            if (Math.random() < 0.25) {
                if (z.subType === 'vertical') z.pos = player.x;
                else if (z.subType === 'horizontal') z.pos = player.y;
            }
        }

        if (empTimer === 0) {
            if (z.type === 'line') {
                if (z.subType === 'vertical') { z.pos += z.v; if (z.pos <= 0 || z.pos >= canvas.width) z.v *= -1; }
                else if (z.subType === 'horizontal') { z.pos += z.v; if (z.pos <= 0 || z.pos >= canvas.height) z.v *= -1; }
                else if (z.subType === 'diagonal') { z.offset += z.vx; if (Math.abs(z.offset) > canvas.width * 1.5) z.vx *= -1; }
            }
        }
        
        if (z.state === 'lethal' && thornTimer === 0 && microDashTimer === 0) {
            if (z.type === 'box') { if (player.x > z.x && player.x < z.x + z.size && player.y > z.y && player.y < z.y + z.size) triggerGameOver(); }
            else if (z.type === 'line') {
                if (z.subType === 'vertical' && Math.abs(player.x - z.pos) < player.radius + 6) triggerGameOver();
                else if (z.subType === 'horizontal' && Math.abs(player.y - z.pos) < player.radius + 6) triggerGameOver(); 
                else if (z.subType === 'diagonal') {
                    let d = z.isForwardSlash ? distToLine(player.x, player.y, z.offset - canvas.width, canvas.height * 2, z.offset + canvas.width * 2, -canvas.height) : distToLine(player.x, player.y, z.offset - canvas.width, -canvas.height, z.offset + canvas.width * 2, canvas.height * 2);
                    if (d < player.radius + 6) triggerGameOver();
                }
            }
        }
    }
    if(screenShake > 0) screenShake *= 0.9; if(flashOpacity > 0) flashOpacity -= 0.04;
}


// =========================================================================
// SECTION 10: MATRIX GRAPHICS ENGINE LAYER (CANVAS RENDER DRAW)
// =========================================================================
function draw() {
    ctx.save(); if (screenShake > 0.5) { ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake); }
    ctx.fillStyle = '#080814'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (hyperTimer > 0) { ctx.fillStyle = 'rgba(187, 0, 255, 0.03)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

    ctx.strokeStyle = '#16162d'; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    spawnWarnings.forEach(w => {
        ctx.save(); ctx.translate(w.edgeX, w.edgeY); let pulse = Math.floor(w.timer / 8) % 2 === 0;
        ctx.fillStyle = pulse ? '#ff0000' : '#ffff00'; ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle;
        ctx.font = 'bold 22px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 0);
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    });

    unsafeZones.forEach(z => {
        ctx.save();
        if (z.state === 'fading') {
            let alpha = (z.fadeTimer / 15) * 0.5; ctx.strokeStyle = `rgba(255, 180, 255, ${alpha})`; ctx.fillStyle = `rgba(255, 180, 255, ${alpha * 0.2})`; ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff'; ctx.lineWidth = 8 * (z.fadeTimer / 15);
        } else if (z.state === 'warning') {
            let timeRemaining = z.timer - z.lethalThreshold;
            let pulseSpeedGate = timeRemaining > 40 ? 12 : timeRemaining > 15 ? 6 : 3;
            let activePulse = Math.floor(z.timer / pulseSpeedGate) % 2 === 0;
            
            ctx.strokeStyle = activePulse ? '#ffff00' : '#ff0000'; 
            ctx.fillStyle = activePulse ? 'rgba(255, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.15)'; 
            ctx.lineWidth = timeRemaining < 20 ? 4 : 2; 
            ctx.setLineDash([8, 8]);
        } else { ctx.strokeStyle = '#ff0033'; ctx.fillStyle = 'rgba(255, 0, 50, 0.5)'; ctx.shadowBlur = 25; ctx.shadowColor = '#ff0033'; ctx.lineWidth = 12; }
        
        if (z.type === 'box') { ctx.fillRect(z.x, z.y, z.size, z.size); ctx.strokeRect(z.x, z.y, z.size, z.size); }
        else if (z.type === 'line') {
            ctx.beginPath();
            if (z.subType === 'vertical') { ctx.moveTo(z.pos, 0); ctx.lineTo(z.pos, canvas.height); } else if (z.subType === 'horizontal') { ctx.moveTo(0, z.pos); ctx.lineTo(canvas.width, z.pos); }
            else if (z.subType === 'diagonal') {
                if (z.isForwardSlash) { ctx.moveTo(z.offset - canvas.width, canvas.height * 2); ctx.lineTo(z.offset + canvas.width * 2, -canvas.height); } else { ctx.moveTo(z.offset - canvas.width, -canvas.height); ctx.lineTo(z.offset + canvas.width * 2, canvas.height * 2); }
            }
            ctx.stroke();
        }
        ctx.restore();
    });

    orbs.forEach(orb => { ctx.save(); ctx.shadowBlur = orb.glow; ctx.shadowColor = orb.color; ctx.fillStyle = orb.color; ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    projectiles.forEach(p => { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    enemies.forEach(enemy => {
        ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(enemy.angle); let enemyColor = empTimer > 0 ? '#0088ff' : enemy.color; ctx.shadowBlur = empTimer > 0 ? 5 : 12; ctx.shadowColor = enemyColor; ctx.fillStyle = enemyColor;
        if (enemy.type === 'turret') { ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(0, -4, enemy.radius + 8, 8); } else { ctx.beginPath(); ctx.moveTo(enemy.radius, 0); ctx.lineTo(-enemy.radius, -enemy.radius * 0.8); ctx.lineTo(-enemy.radius * 0.3, 0); ctx.lineTo(-enemy.radius, enemy.radius * 0.8); ctx.closePath(); ctx.fill(); }
        ctx.restore();
    });

    if ((hyperTimer > 0 || microDashTimer > 0) && player.history.length > 0) {
        player.history.forEach((h, i) => {
            ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.angle); 
            let trailColor = `rgba(${hexToRgbString(playerAccentColor)}, ${0.12 * (i + 1)})`; 
            if (hyperTimer > 0) { 
                let progress = i / player.history.length; 
                let hue = progress * 240; 
                let alpha = 0.75 + (progress * 0.25); 
                trailColor = `hsla(${hue}, 100%, 55%, ${alpha})`; 
            }
            ctx.fillStyle = trailColor; ctx.beginPath(); ctx.moveTo(player.radius, 0); ctx.lineTo(-player.radius, -player.radius * 0.75); ctx.lineTo(-player.radius * 0.35, 0); ctx.lineTo(-player.radius, player.radius * 0.75); ctx.closePath(); ctx.fill(); ctx.restore();
        });
    }

    ctx.save(); ctx.translate(player.x, player.y);
    if (thornTimer > 0) {
        ctx.save(); ctx.beginPath(); let spikes = 10; let outerRadius = player.radius + 14; let innerRadius = player.radius + 6;
        for (let i = 0; i < spikes * 2; i++) { let radius = i % 2 === 0 ? outerRadius : innerRadius; let angle = (i * Math.PI) / spikes; if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius); else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); }
        ctx.closePath(); ctx.strokeStyle = '#ffaa00'; ctx.fillStyle = 'rgba(255, 170, 0, 0.15)'; ctx.lineWidth = 2; ctx.rotate(performance.now() / 120); ctx.shadowBlur = 20; ctx.shadowColor = '#ffaa00'; ctx.fill(); ctx.stroke(); ctx.restore();
    }

    ctx.rotate(player.angle);
    
    let playerColor = playerAccentColor; 
    if (hyperTimer > 0) playerColor = '#bb00ff'; 
    if (microDashTimer > 0) playerColor = '#ffffff'; 
    
    ctx.shadowBlur = (hyperTimer > 0 || microDashTimer > 0) ? 30 : 18; ctx.shadowColor = playerColor; ctx.fillStyle = playerColor;
    ctx.beginPath(); ctx.moveTo(player.radius, 0); ctx.lineTo(-player.radius, -player.radius * 0.75); ctx.lineTo(-player.radius * 0.35, 0); ctx.lineTo(-player.radius, player.radius * 0.75); ctx.closePath(); ctx.fill(); ctx.restore();

    particles.forEach(p => { ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.strokeStyle = p.color; if (p.type === 'ring') { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.stroke(); } else { ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2); } ctx.restore(); });
    floatTexts.forEach(ft => { ctx.save(); ctx.globalAlpha = ft.alpha; ctx.fillStyle = ft.color; ctx.font = 'bold 16px Courier New'; ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y); ctx.restore(); });
    if (flashOpacity > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.restore();
}

function hexToRgbString(hex) {
    let c = hex.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}


// =========================================================================
// SECTION 11: SIDEBAR HIGH-SCORE COMPILER PROTOCOL (SUPABASE FILTER RUN)
// =========================================================================
async function loadIngameLeaderboard() {
    const list = document.getElementById('ingameLeaderboardList');
    if (!list) return;

    if (typeof fetchGlobalLeaderboard === 'function') {
        const scores = await fetchGlobalLeaderboard(selectedGameMode); 
        
        if (!scores || !scores.length) {
            list.innerHTML = '<li><span style="color:#8888aa; text-align:center; width:100%;">NO CLOUD DATA</span></li>';
            return;
        }
        
        list.innerHTML = scores.slice(0, 15).map((entry, index) => {
            const rank = index + 1;
            const safeName = entry.player_name.length > 10 ? entry.player_name.substring(0, 9) + '…' : entry.player_name;
            
            return `
                <li>
                    <span><strong style="opacity: 0.6; margin-right: 5px;">#${rank}</strong> ${safeName}</span>
                    <span>${entry.score}</span>
                </li>
            `;
        }).join('');
    }
}


// =========================================================================
// SECTION 12: EXECUTION PROCESS LOOPS INITIALIZER
// =========================================================================
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
function resetGame() { init(); isGameRunning = true; isGameOver = false; startTime = performance.now(); }

// LIFTOFF ENGINE HANDSHAKE
init();
isGameRunning = true;
startTime = performance.now();
gameLoop();
