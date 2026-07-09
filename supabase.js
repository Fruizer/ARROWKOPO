const SUPABASE_URL = "https://yuantqxzhishsvxzwmat.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AqgkWH9jPZpj3f2DDXI2wA_TILHFjX8";
const dbClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function saveScoreRun(playerName, score, timeMs) {
    const safeName = playerName || "CYBER_RUNNER";
    let activeMode = "normal";
    try { activeMode = localStorage.getItem('arrowkopoActiveMode') || "normal"; } catch(e) {}
    
    // OFFLINE BACKUP SYNC: Keeps up to 50 runs globally so normal and hardcore scores don't crowd each other out locally
    try {
        const localLb = JSON.parse(localStorage.getItem('arrowkopoLeaderboard') || '[]');
        localLb.push({ player_name: safeName, score: Math.floor(score), time_ms: Math.floor(timeMs), game_mode: activeMode, savedAt: Date.now() });
        localLb.sort((a, b) => b.score - a.score || b.time_ms - a.time_ms);
        localStorage.setItem('arrowkopoLeaderboard', JSON.stringify(localLb.slice(0, 50))); 
    } catch(e) {}

    if (dbClient) {
        try {
            await dbClient.from('global_leaderboard').insert([
                { player_name: safeName, score: Math.floor(score), time_ms: Math.floor(timeMs), game_mode: activeMode }
            ]);
        } catch(e) { console.error("Cloud insert error:", e); }
    }
}

async function fetchGlobalLeaderboard(modeFilter = "normal") {
    if (dbClient) {
        try {
            const { data, error } = await dbClient
                .from('global_leaderboard')
                .select('player_name, score, time_ms, game_mode')
                .eq('game_mode', modeFilter) 
                .order('score', { ascending: false })
                .order('time_ms', { ascending: false })
                .limit(10);
            
            if (!error && data && data.length > 0) return data;
        } catch(e) {}
    }
    
    // OFFLINE ISO-FILTERS: Safely extracts the top 10 rows just for the requested mode tab selection
    try {
        const localLb = JSON.parse(localStorage.getItem('arrowkopoLeaderboard') || '[]');
        const filteredLocal = localLb.filter(item => (item.game_mode || "normal") === modeFilter);
        return filteredLocal.length > 0 ? filteredLocal.slice(0, 10) : null;
    } catch(e) { return null; }
}
