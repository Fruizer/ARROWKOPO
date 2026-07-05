// Live Supabase Cloud Database Credentials
const SUPABASE_URL = "https://yuantqxzhishsvxzwmat.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AqgkWH9jPZpj3f2DDXI2wA_TILHFjX8";

// FIX: Renamed the variable to dbClient to prevent the global crash!
const dbClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// HYBRID SAVE: Saves locally for instant feedback + pushes to cloud for global ranks
async function saveScoreRun(playerName, score, timeMs) {
    const safeName = playerName || "CYBER_RUNNER";
    
    // 1. Save to browser LocalStorage instantly
    try {
        const localLb = JSON.parse(localStorage.getItem('arrowkopoLeaderboard') || '[]');
        localLb.push({ 
            player_name: safeName, 
            score: Math.floor(score), 
            time_ms: Math.floor(timeMs), 
            savedAt: Date.now() 
        });
        localLb.sort((a, b) => b.score - a.score || b.time_ms - a.time_ms);
        localStorage.setItem('arrowkopoLeaderboard', JSON.stringify(localLb.slice(0, 10)));
    } catch(e) { console.error("Local save error:", e); }

    // 2. Push asynchronously to Supabase cloud database
    if (dbClient) {
        try {
            await dbClient.from('global_leaderboard').insert([
                { player_name: safeName, score: Math.floor(score), time_ms: Math.floor(timeMs) }
            ]);
        } catch(e) { console.error("Supabase sync error:", e); }
    }
}

// HYBRID FETCH: Queries Supabase first, automatically falls back to offline LocalStorage!
async function fetchGlobalLeaderboard() {
    // 1. Attempt Cloud Fetch
    if (dbClient) {
        try {
            const { data, error } = await dbClient
                .from('global_leaderboard')
                .select('player_name, score, time_ms')
                .order('score', { ascending: false })
                .order('time_ms', { ascending: false })
                .limit(10);
            
            if (!error && data && data.length > 0) {
                return data;
            }
        } catch(e) { console.error("Cloud fetch failed, falling back to local:", e); }
    }

    // 2. Fallback: Return offline browser scores immediately if cloud is empty or offline!
    try {
        const localLb = JSON.parse(localStorage.getItem('arrowkopoLeaderboard') || '[]');
        return localLb.length > 0 ? localLb : null;
    } catch(e) {
        return null;
    }
}
