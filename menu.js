const playerNameInput = document.getElementById('playerNameInput');
const bootButton = document.getElementById('bootButton');
const howToPlayScreen = document.getElementById('howToPlayScreen');
const globalLeaderboardScreen = document.getElementById('globalLeaderboardScreen');
const optionsScreen = document.getElementById('optionsScreen');
const modeSelectScreen = document.getElementById('modeSelectScreen');
const masterArmoryScreen = document.getElementById('masterArmoryScreen');
const globalLeaderboardList = document.getElementById('globalLeaderboardList');

try {
    const savedName = localStorage.getItem('arrowkopoPlayerName');
    if (savedName && playerNameInput) playerNameInput.value = savedName;
} catch(e) {}

function launchGame() {
    let name = (playerNameInput ? playerNameInput.value : '').trim();
    if (!name) name = "CYBER_RUNNER";
    try { localStorage.setItem('arrowkopoPlayerName', name.slice(0, 16)); } catch(e) {}
    window.location.href = 'game.html';
}

if (bootButton) bootButton.addEventListener('click', launchGame);
if (playerNameInput) playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') launchGame(); });

function closeAllModals() {
    if (howToPlayScreen) howToPlayScreen.style.display = 'none';
    if (globalLeaderboardScreen) globalLeaderboardScreen.style.display = 'none';
    if (optionsScreen) optionsScreen.style.display = 'none';
    if (modeSelectScreen) modeSelectScreen.style.display = 'none';
    if (masterArmoryScreen) masterArmoryScreen.style.display = 'none';
    
    // Safely restore the primary vertical layout card interface view clean
    if (document.getElementById('startMenuScreen')) {
        document.getElementById('startMenuScreen').style.display = 'block';
    }
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });

const htBtn = document.getElementById('howToPlayButton');
if (htBtn) htBtn.addEventListener('click', () => { closeAllModals(); if (howToPlayScreen) howToPlayScreen.style.display = 'block'; });
const cHtBtn = document.getElementById('closeHowToPlayButton');
if (cHtBtn) cHtBtn.addEventListener('click', closeAllModals);

const optBtn = document.getElementById('optionsButton');
if (optBtn) optBtn.addEventListener('click', () => { closeAllModals(); if (optionsScreen) optionsScreen.style.display = 'block'; });
const cOptBtn = document.getElementById('closeOptionsButton');
if (cOptBtn) cOptBtn.addEventListener('click', closeAllModals);

const lbBtn = document.getElementById('leaderboardsButton');
if (lbBtn) {
    lbBtn.addEventListener('click', async () => {
        closeAllModals();
        if (globalLeaderboardScreen) globalLeaderboardScreen.style.display = 'block';
        if (globalLeaderboardList) globalLeaderboardList.innerHTML = '<li class="leaderboard-empty">Fetching cloud rankings...</li>';
        if (typeof fetchGlobalLeaderboard === 'function') {
            const scores = await fetchGlobalLeaderboard();
            if (!globalLeaderboardList) return;
            if (!scores || !scores.length) {
                globalLeaderboardList.innerHTML = '<li class="leaderboard-empty">No global records found yet. Be the first!</li>';
                return;
            }
            globalLeaderboardList.innerHTML = scores.map((entry) => {
                const timeFormatted = `${Math.floor(entry.time_ms / 60000).toString().padStart(2, '0')}:${Math.floor((entry.time_ms % 60000) / 1000).toString().padStart(2, '0')}`;
                return `<li><span class="lb-name">${entry.player_name}</span><span class="lb-meta">${entry.score} pts · ${timeFormatted}</span></li>`;
            }).join('');
        }
        
        globalLeaderboardList.innerHTML = scores.map((entry) => {
            const timeFormatted = `${Math.floor(entry.time_ms / 60000).toString().padStart(2, '0')}:${Math.floor((entry.time_ms % 60000) / 1000).toString().padStart(2, '0')}`;
            return `<li><span class="lb-name">${entry.player_name}</span><span class="lb-meta">${entry.score} pts · ${timeFormatted}</span></li>`;
        }).join('');
    }
}

if (document.getElementById('leaderboardsButton')) {
    document.getElementById('leaderboardsButton').addEventListener('click', () => {
        closeAllModals();
        if (document.getElementById('startMenuScreen')) {
            document.getElementById('startMenuScreen').style.display = 'none';
        }
        if (globalLeaderboardScreen) globalLeaderboardScreen.style.display = 'block';
        if (document.getElementById('lbToggleNormal')) document.getElementById('lbToggleNormal').classList.add('lb-active-mode');
        if (document.getElementById('lbToggleHard')) document.getElementById('lbToggleHard').classList.remove('lb-active-mode');
        renderLeaderboardView('normal');
    });
}
const cLbBtn = document.getElementById('closeGlobalLeaderboardButton');
if (cLbBtn) cLbBtn.addEventListener('click', closeAllModals);

const resetNameBtn = document.getElementById('resetSavedNameButton');
if (resetNameBtn) {
    resetNameBtn.addEventListener('click', () => {
        if (playerNameInput) playerNameInput.value = '';
        try { localStorage.removeItem('arrowkopoPlayerName'); } catch(e) {}
        alert("Saved pilot name cleared.");
    });
}
const clearLbBtn = document.getElementById('clearLocalLeaderboardButton');
if (clearLbBtn) {
    clearLbBtn.addEventListener('click', () => {
        try {
            localStorage.removeItem('arrowkopoLeaderboard');
            localStorage.removeItem('neonHighScore');
            localStorage.removeItem('neonBestTime');
        } catch(e) {}
        alert("Offline local storage metrics (High Scores & Personal Best Times) have been reset.");
    });
}
