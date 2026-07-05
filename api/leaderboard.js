import { kv } from '@vercel/kv';

const LEADERBOARD_KEY = 'arrowkopo:global-leaderboard';
const MAX_ENTRIES = 10;

function normalizeEntry(entry) {
    return {
        name: String(entry?.name || 'UNKNOWN').trim().slice(0, 16) || 'UNKNOWN',
        score: Number(entry?.score) || 0,
        timeMs: Number(entry?.timeMs) || 0,
        savedAt: Number(entry?.savedAt) || Date.now()
    };
}

function sortEntries(entries) {
    return entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.timeMs !== a.timeMs) return b.timeMs - a.timeMs;
        return a.name.localeCompare(b.name);
    });
}

async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }

    return new Promise((resolve, reject) => {
        let rawBody = '';
        req.on('data', (chunk) => {
            rawBody += chunk;
        });
        req.on('end', () => {
            if (!rawBody) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(rawBody));
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const stored = await kv.get(LEADERBOARD_KEY);
            const entries = Array.isArray(stored) ? stored : [];
            res.status(200).json({ entries: sortEntries(entries.map(normalizeEntry)).slice(0, MAX_ENTRIES) });
            return;
        }

        if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const nextEntry = normalizeEntry(body);
            const stored = await kv.get(LEADERBOARD_KEY);
            const entries = Array.isArray(stored) ? stored.map(normalizeEntry) : [];
            entries.push(nextEntry);
            const nextEntries = sortEntries(entries).slice(0, MAX_ENTRIES);
            await kv.set(LEADERBOARD_KEY, nextEntries);
            res.status(200).json({ ok: true, entries: nextEntries });
            return;
        }

        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: 'Leaderboard storage is not configured.' });
    }
}
