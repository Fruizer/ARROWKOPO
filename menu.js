const playerNameInput = document.getElementById('playerNameInput');
const bootButton = document.getElementById('bootButton');
const howToPlayScreen = document.getElementById('howToPlayScreen');
const globalLeaderboardScreen = document.getElementById('globalLeaderboardScreen');
const optionsScreen = document.getElementById('optionsScreen');
const modeSelectScreen = document.getElementById('modeSelectScreen');
const masterArmoryScreen = document.getElementById('masterArmoryScreen');
const globalLeaderboardList = document.getElementById('globalLeaderboardList');

const tabInventoryBtn = document.getElementById('tabInventoryBtn');
const tabShopBtn = document.getElementById('tabShopBtn');

let currentViewMode = "normal";

// Auto-load previously saved pilot name from device memory
try {
    const savedName = localStorage.getItem('arrowkopoPlayerName');
    if (savedName && playerNameInput) playerNameInput.value = savedName;
} catch(e) {}

// Open deployment simulation modal parameters
function triggerModeSelect() {
    closeAllModals();
    if (document.getElementById('startMenuScreen')) {
        document.getElementById('startMenuScreen').style.display = 'none';
    }
    if (modeSelectScreen) modeSelectScreen.style.display = 'block';
}

function launchGameInstance(mode) {
    let name = (playerNameInput ? playerNameInput.value : '').trim();
    if (!name) name = "CYBER_RUNNER";
    try { 
        localStorage.setItem('arrowkopoPlayerName', name.slice(0, 16));
        localStorage.setItem('arrowkopoActiveMode', mode);
    } catch(e) {}
    window.location.href = 'game.html';
}

if (bootButton) bootButton.addEventListener('click', triggerModeSelect);
if (playerNameInput) playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') triggerModeSelect(); });

if (document.getElementById('playNormalButton')) {
    document.getElementById('playNormalButton').addEventListener('click', () => launchGameInstance('normal'));
}
if (document.getElementById('playHardButton')) {
    document.getElementById('playHardButton').addEventListener('click', () => launchGameInstance('hard'));
}
if (document.getElementById('closeModeSelectButton')) {
    document.getElementById('closeModeSelectButton').addEventListener('click', closeAllModals);
}

// MASTER CONTROLLER CLOSING LAYER: Clears windows and pops the clean main card menu back up
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

// DETAILED DIRECT ENTRIES: Hides primary card container to isolate window layouts
if (document.getElementById('inventoryMenuButton')) {
    document.getElementById('inventoryMenuButton').addEventListener('click', () => {
        closeAllModals();
        if (document.getElementById('startMenuScreen')) {
            document.getElementById('startMenuScreen').style.display = 'none';
        }
        if (masterArmoryScreen) masterArmoryScreen.style.display = 'block';
        switchArmoryTab('inventory');
    });
}

if (document.getElementById('shopMenuButton')) {
    document.getElementById('shopMenuButton').addEventListener('click', () => {
        closeAllModals();
        if (document.getElementById('startMenuScreen')) {
            document.getElementById('startMenuScreen').style.display = 'none';
        }
        if (masterArmoryScreen) masterArmoryScreen.style.display = 'block';
        switchArmoryTab('shop');
    });
}

if (document.getElementById('closeArmoryButton')) {
    document.getElementById('closeArmoryButton').addEventListener('click', closeAllModals);
}

function switchArmoryTab(tabName) {
    const invContent = document.getElementById('inventoryViewContent');
    const shopContent = document.getElementById('shopViewContent');

    if (tabName === 'inventory') {
        if (tabInventoryBtn) tabInventoryBtn.classList.add('active-tab');
        if (tabShopBtn) tabShopBtn.classList.remove('active-tab');
        
        // Display inventory layout pane grid, hide shop terminal elements
        if (invContent) invContent.style.display = 'grid';
        if (shopContent) shopContent.style.display = 'none';
    } else {
        if (tabShopBtn) tabShopBtn.classList.add('active-tab');
        if (tabInventoryBtn) tabInventoryBtn.classList.remove('active-tab');
        
        // Display shop terminal components, hide inventory blocks
        if (shopContent) shopContent.style.display = 'grid';
        if (invContent) invContent.style.display = 'none';
    }
}

if (tabInventoryBtn) tabInventoryBtn.addEventListener('click', () => switchArmoryTab('inventory'));
if (tabShopBtn) tabShopBtn.addEventListener('click', () => switchArmoryTab('shop'));

async function renderLeaderboardView(mode) {
    currentViewMode = mode;
    if (!globalLeaderboardList) return;
    globalLeaderboardList.innerHTML = '<li class="leaderboard-empty">Fetching cloud rankings...</li>';
    
    if (typeof fetchGlobalLeaderboard === 'function') {
        const scores = await fetchGlobalLeaderboard(mode);
        if (currentViewMode !== mode) return;
        
        if (!scores || !scores.length) {
            globalLeaderboardList.innerHTML = '<li class="leaderboard-empty">No records discovered inside this simulation node.</li>';
            return;
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

if (document.getElementById('lbToggleNormal')) {
    document.getElementById('lbToggleNormal').addEventListener('click', () => {
        document.getElementById('lbToggleNormal').classList.add('lb-active-mode');
        if (document.getElementById('lbToggleHard')) document.getElementById('lbToggleHard').classList.remove('lb-active-mode');
        renderLeaderboardView('normal');
    });
}
if (document.getElementById('lbToggleHard')) {
    document.getElementById('lbToggleHard').addEventListener('click', () => {
        document.getElementById('lbToggleHard').classList.add('lb-active-mode');
        if (document.getElementById('lbToggleNormal')) document.getElementById('lbToggleNormal').classList.remove('lb-active-mode');
        renderLeaderboardView('hard');
    });
}

if (document.getElementById('closeGlobalLeaderboardButton')) {
    document.getElementById('closeGlobalLeaderboardButton').addEventListener('click', closeAllModals);
}
if (document.getElementById('howToPlayButton')) {
    document.getElementById('howToPlayButton').addEventListener('click', () => {
        closeAllModals();
        if (document.getElementById('startMenuScreen')) {
            document.getElementById('startMenuScreen').style.display = 'none';
        }
        if (howToPlayScreen) howToPlayScreen.style.display = 'block';
    });
}
if (document.getElementById('closeHowToPlayButton')) {
    document.getElementById('closeHowToPlayButton').addEventListener('click', closeAllModals);
}
if (document.getElementById('optionsButton')) {
    document.getElementById('optionsButton').addEventListener('click', () => {
        closeAllModals();
        if (document.getElementById('startMenuScreen')) {
            document.getElementById('startMenuScreen').style.display = 'none';
        }
        if (optionsScreen) optionsScreen.style.display = 'block';
    });
}
if (document.getElementById('closeOptionsButton')) {
    document.getElementById('closeOptionsButton').addEventListener('click', closeAllModals);
}

if (document.getElementById('resetSavedNameButton')) {
    document.getElementById('resetSavedNameButton').addEventListener('click', () => {
        if (playerNameInput) playerNameInput.value = '';
        try { localStorage.removeItem('arrowkopoPlayerName'); } catch(e) {}
        alert("Saved pilot name cleared.");
    });
}
if (document.getElementById('clearLocalLeaderboardButton')) {
    document.getElementById('clearLocalLeaderboardButton').addEventListener('click', () => {
        try {
            localStorage.removeItem('arrowkopoLeaderboard');
            localStorage.removeItem('neonHighScore');
            localStorage.removeItem('neonBestTime');
        } catch(e) {}
        alert("Offline storage completely wiped.");
    });
}
