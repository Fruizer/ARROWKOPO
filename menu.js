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

// Locate inside renderLeaderboardView(mode) in menu.js and update the mapping block:
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
        
        // SLICE LAYER & STRING BUILDER: Caps display strict at 10 items maximum
        globalLeaderboardList.innerHTML = scores.slice(0, 10).map((entry, index) => {
            const rank = index + 1;
            const timeFormatted = `${Math.floor(entry.time_ms / 60000).toString().padStart(2, '0')}:${Math.floor((entry.time_ms % 60000) / 1000).toString().padStart(2, '0')}`;
            
            return `
                <li class="leaderboard-row-rank-${rank}">
                    <span class="lb-name"><span class="rank-num-badge">[#${rank}]</span> ${entry.player_name}</span>
                    <span class="lb-meta">${entry.score} pts · ${timeFormatted}</span>
                </li>
            `;
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

// INVENTORY INTERACTIVITY MATRIX
document.addEventListener('DOMContentLoaded', () => {
    const invGrid = document.getElementById('inventoryViewContent');
    const previewShip = document.querySelector('.placeholder-vector-ship');
    const previewTrail = document.querySelector('.placeholder-vector-trail');
    const previewLabel = document.getElementById('previewItemNameDisplay');

    if (invGrid) {
        invGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.item-card');
            if (!card || card.classList.contains('locked-item')) return;

            const allCards = invGrid.querySelectorAll('.item-card');
            allCards.forEach(c => {
                c.classList.remove('active-item-card');
                const statusText = c.querySelector('.item-card-status');
                if (statusText && statusText.innerText === '[EQUIPPED]') {
                    statusText.innerText = 'OWNED';
                }
            });

            card.classList.add('active-item-card');
            const newStatus = card.querySelector('.item-card-status');
            if (newStatus) newStatus.innerText = '[EQUIPPED]';

            const targetColor = card.getAttribute('data-color');
            const targetName = card.getAttribute('data-name');

            if (previewShip) {
                previewShip.style.color = targetColor;
                previewShip.style.textShadow = `0 0 20px ${targetColor}`;
            }
            if (previewTrail) {
                previewTrail.style.color = targetColor;
                previewTrail.style.opacity = '0.4';
            }
            if (previewLabel) {
                previewLabel.innerText = `${targetName} MATRIX`;
            }

            try {
                localStorage.setItem('arrowkopoPlayerColor', targetColor);
            } catch(err) {}
        });
    }

    const gachaBtn = document.getElementById('gachaPullButton');
    const gachaBox = document.querySelector('.gacha-terminal-box');
    const gachaText = document.querySelector('.gacha-terminal-text');

    if (gachaBtn && gachaBox) {
        gachaBtn.addEventListener('click', () => {
            if (gachaBtn.disabled) return;
            
            gachaBtn.disabled = true;
            gachaBtn.innerText = "DECRYPTING...";
            gachaBox.classList.add('gacha-hacking-active');
            
            let durationTicks = 0;
            const maxTicks = 25;
            const matrixStrings = [
                "HACKING CORE: ACCELERATING QUANTUM MATRICES...",
                "DESTRUCTURING CRYPTO_KEYS: 0x4F8A... 0x9D2E...",
                "EXTRACTING SILICON_HULL_ BLUEPRINTS...",
                "TRANSMUTING NANITE PARTICLES... RE-ALIGNING ACCENTS...",
                "DECRYPTION COMPLETED: UNWRAUGHT CORE DISCOVERED!"
            ];

            const animationInterval = setInterval(() => {
                durationTicks++;
                
                gachaText.innerText = matrixStrings[Math.floor(Math.random() * matrixStrings.length)] + 
                                    ` \n [ SYSTEM_OVERDRIVE_LOAD: ${Math.floor((durationTicks/maxTicks)*100)}% ]`;
                
                if (previewShip) {
                    previewShip.style.color = '#' + Math.floor(Math.random()*16777215).toString(16);
                }

                if (durationTicks >= maxTicks) {
                    clearInterval(animationInterval);
                    
                    gachaBox.classList.remove('gacha-hacking-active');
                    gachaBtn.disabled = false;
                    gachaBtn.innerText = "HACK CORE [250 CR]";
                    gachaText.innerText = "Deconstruct 250 operational credits to draw a randomized pilot hull color matrix blueprint row template.";
                    
                    const rewards = [
                        { name: "VAMP RED", color: "#ff0055" },
                        { name: "MATRIX GREEN", color: "#00ff66" },
                        { name: "NEON PINK", color: "#ff66cc" },
                        { name: "CYBER YELLOW", color: "#ffff00" },
                        { name: "SYNTH MAGENTA", color: "#ff00ff" },
                        { name: "SAPPHIRE BLUE", color: "#0055ff" }
                    ];
                    
                    const rolledReward = rewards[Math.floor(Math.random() * rewards.length)];
                    
                    if (previewShip) {
                        previewShip.style.color = rolledReward.color;
                        previewShip.style.textShadow = `0 0 30px ${rolledReward.color}`;
                    }
                    if (previewLabel) {
                        previewLabel.innerText = `${rolledReward.name} DISCOVERED!`;
                    }
                    
                    alert(`[ ACCESS GRANTED ] \nYou unlocked the custom [ ${rolledReward.name} ] accent core! Matrix loaded into live canvas preview module.`);
                }
            }, 100);
        });
    }
});

let userWalletCredits = 1000;
let userUniqueAccountToken = "";

function syncOrCreateUserSession() {
    try {
        let savedToken = localStorage.getItem('arrowkopoAccountToken');
        let currentPilotName = (playerNameInput ? playerNameInput.value : '').trim() || "CYBER_RUNNER";
        
        if (!savedToken) {
            const cryptographicEntropySeed = Math.random().toString(36).substring(2, 7).toUpperCase();
            savedToken = `AC_KEY_${currentPilotName.replace(/\s+/g, '_')}_${cryptographicEntropySeed}`;
            localStorage.setItem('arrowkopoAccountToken', savedToken);
            localStorage.setItem('arrowkopoCreditsBalance', userWalletCredits.toString());
        } else {
            const cachedCredits = localStorage.getItem('arrowkopoCreditsBalance');
            if (cachedCredits !== null) userWalletCredits = parseInt(cachedCredits);
        }
        
        userUniqueAccountToken = savedToken;
        const keyDisplay = document.getElementById('accountKeyDisplayInput');
        if (keyDisplay) keyDisplay.value = userUniqueAccountToken;
        
        updateMenuCreditsDisplay();
    } catch(err) { console.error("Identity core synchronization malfunction:", err); }
}

function updateMenuCreditsDisplay() {
    const armoryCreditsVal = document.getElementById('armoryCreditsVal');
    if (armoryCreditsVal) armoryCreditsVal.innerText = userWalletCredits;
    try { localStorage.setItem('arrowkopoCreditsBalance', userWalletCredits.toString()); } catch(e) {}
}

if (playerNameInput) {
    playerNameInput.addEventListener('input', () => {
        let token = localStorage.getItem('arrowkopoAccountToken');
        if (!token) syncOrCreateUserSession();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    syncOrCreateUserSession(); 
    
    const copyBtn = document.getElementById('copyAccountKeyBtn');
    const keyInputDisplay = document.getElementById('accountKeyDisplayInput');
    if (copyBtn && keyInputDisplay) {
        copyBtn.addEventListener('click', () => {
            keyInputDisplay.select();
            document.execCommand('copy');
            alert("[ SYSTEM MEMORY SYNC ] \nAccount access key successfully cloned to system clipboard matrix registry.");
        });
    }

    const loadRecoveryBtn = document.getElementById('syncRecoveryBtn');
    const recoveryInput = document.getElementById('accountRecoveryInput');
    if (loadRecoveryBtn && recoveryInput) {
        loadRecoveryBtn.addEventListener('click', () => {
            const typedKey = recoveryInput.value.trim();
            if (!typedKey.startsWith("AC_KEY_")) {
                alert("[ ACCESS DENIED ] \nInvalid authentication array configuration pattern syntax. Process terminated.");
                return;
            }
            
            const parts = typedKey.split('_');
            if (parts.length >= 3) {
                try {
                    localStorage.setItem('arrowkopoAccountToken', typedKey);
                    localStorage.setItem('arrowkopoPlayerName', parts[2]);
                    if (playerNameInput) playerNameInput.value = parts[2];
                    
                    syncOrCreateUserSession();
                    alert("[ RECOVERY SUCCESSFUL ] \nPilot profile nodes successfully re-established on this layout terminal container.");
                    recoveryInput.value = "";
                    closeAllModals();
                } catch(err) {}
            }
        });
    }

    const directPurchaseCards = document.querySelectorAll('.market-card');
    directPurchaseCards.forEach(card => {
        card.addEventListener('dblclick', () => {
            const cost = parseInt(card.getAttribute('data-cost'));
            const name = card.getAttribute('data-name');
            const color = card.getAttribute('data-color');
            
            if (userWalletCredits < cost) {
                alert("[ INSUFFICIENT FUNDS ] \nOperation rejected. Nanite transaction requires more credits. Complete more runs inside the laser arena.");
                return;
            }
            
            userWalletCredits -= cost;
            updateMenuCreditsDisplay();
            
            alert(`[ TRANSACTION SUCCESSFUL ] \nYou purchased the custom skin item [ ${name} ] for ${cost} CR! Check your inventory tab to equip it.`);
        });
    });
});


// ==========================================
// NEW: CUSTOM KEYBIND MANAGEMENT SYSTEM
// ==========================================
const defaultCustomKeys = { dash: ' ', emp: 'q', hyper: 'e', thorn: 'f', nuke: 'r', reboot: 'enter' };
let savedKeybinds = defaultCustomKeys;
try {
    let stored = JSON.parse(localStorage.getItem('arrowkopoKeybinds'));
    if (stored) savedKeybinds = { ...defaultCustomKeys, ...stored };
} catch(e) {}

const bindBtns = {
    dash: document.getElementById('btnBindDash'),
    emp: document.getElementById('btnBindEmp'),
    hyper: document.getElementById('btnBindHyper'),
    thorn: document.getElementById('btnBindThorn'),
    nuke: document.getElementById('btnBindNuke'),
    reboot: document.getElementById('btnBindReboot')
};

let activeBindAction = null;

function refreshKeybindUI() {
    if(bindBtns.dash) bindBtns.dash.innerText = `DASH: [${savedKeybinds.dash === ' ' ? 'SPACE' : savedKeybinds.dash.toUpperCase()}]`;
    if(bindBtns.emp) bindBtns.emp.innerText = `EMP: [${savedKeybinds.emp.toUpperCase()}]`;
    if(bindBtns.hyper) bindBtns.hyper.innerText = `HYPER: [${savedKeybinds.hyper.toUpperCase()}]`;
    if(bindBtns.thorn) bindBtns.thorn.innerText = `THORN: [${savedKeybinds.thorn.toUpperCase()}]`;
    if(bindBtns.nuke) bindBtns.nuke.innerText = `NUKE: [${savedKeybinds.nuke.toUpperCase()}]`;
    if(bindBtns.reboot) bindBtns.reboot.innerText = `REBOOT: [${savedKeybinds.reboot.toUpperCase()}]`;
}

document.addEventListener('DOMContentLoaded', refreshKeybindUI);

Object.keys(bindBtns).forEach(action => {
    if(bindBtns[action]) {
        bindBtns[action].addEventListener('click', () => {
            if(activeBindAction) refreshKeybindUI(); // Reset previous button if one was active
            activeBindAction = action;
            bindBtns[action].innerText = `PRESS NEW KEY...`;
            bindBtns[action].style.borderColor = '#ff0055';
            bindBtns[action].style.color = '#ff0055';
        });
    }
});

window.addEventListener('keydown', (e) => {
    if(activeBindAction) {
        e.preventDefault();
        let newKey = e.key.toLowerCase();
        
        // Prevent binding Escape since it's hardcoded for closing menus
        if(newKey === 'escape') {
            activeBindAction = null;
            refreshKeybindUI();
            return;
        }

        savedKeybinds[activeBindAction] = newKey;
        try { localStorage.setItem('arrowkopoKeybinds', JSON.stringify(savedKeybinds)); } catch(err) {}
        
        bindBtns[activeBindAction].style.borderColor = '';
        bindBtns[activeBindAction].style.color = '';
        activeBindAction = null;
        refreshKeybindUI();
    }
});
