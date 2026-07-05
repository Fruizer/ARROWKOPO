const SUPABASE_URL = "https://yuantqxzhishsvxzwmat.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AqgkWH9jPZpj3f2DDXI2wA_TILHFjX8";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function saveScoreRun(playerName, score, timeMs) {
    const safeName = playerName || "CYBER_RUNNER";
    
    try {
        const localLb = JSON.parse(localStorage.getItem('arrowkopoLeaderboard') || '[]');
        localLb.push({ player_name: safeName, score: Math.floor(score), time_ms: Math.floor(timeMs), savedAt: Date.now() });
        localLb.sort((a, b) => b.score - a.score || b.time_ms - a.time_ms);
        localStorage.setItem('arrowkopoLeaderboard', JSON.stringify(localLb.slice(0, 10)));
    } catch(e) {}

    if (supabase) {
        try {
            await supabase.from('global_leaderboard').insert([
                { player_name: safeName, score: Math.floor(score), time_ms: Math.floor(timeMs) }
            ]);
        } catch(e) {}
    }
}

async function fetchGlobalLeaderboard() {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('global_leaderboard').select('player_name, score, time_ms').order('score', { ascending: false }).order('time_ms', { ascending: false }).limit(10);
            if (!error && data && data.length > 0) return data;
        } catch(e) {}
    }
    try {
        const localLb = JSON.parse(localStorage.getItem('arrowkopoLeaderboard') || '[]');
        return localLb.length > 0 ? localLb : null;
    } catch(e) { return null; }
}
