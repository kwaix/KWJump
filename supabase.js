
let supabase = null;
let isOffline = false;
let offlineReason = "";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const LOCAL_STORAGE_KEY = 'kwmejump_leaderboard';

/**
 * Initializes the Supabase client.
 * Tries to use the global window.supabase (from CDN) and the provided env vars.
 */
export async function initSupabase() {
    console.log("Initializing Supabase integration...");

    // 1. Check Env Vars
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        enableOfflineMode("Missing Environment Variables (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)");
        return;
    }

    // 2. Check for CDN load (window.supabase)
    // Retry a few times if the script is slow to load
    let retries = 3;
    while (retries > 0 && !window.supabase) {
        console.warn(`Supabase library not found. Retrying... (${retries})`);
        await new Promise(r => setTimeout(r, 500));
        retries--;
    }

    if (!window.supabase) {
        enableOfflineMode("Supabase CDN script failed to load or is blocked.");
        return;
    }

    // 3. Create Client
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Optional: Simple connectivity test (HEAD request)
        // If this fails, we might still be "online" but the keys are wrong,
        // or we have network issues.
        const { error } = await supabase.from('leaderboard').select('count', { count: 'exact', head: true });

        if (error) {
            console.error("Supabase Connection Test Failed:", error);
            // We don't force offline here immediately because it might be a temporary network blip,
            // but for a game, it's safer to assume we might need offline fallback logic later.
        } else {
            console.log("Supabase connected successfully.");
        }

        isOffline = false;
    } catch (err) {
        console.error("Supabase Client Creation Failed:", err);
        enableOfflineMode(`Initialization Error: ${err.message}`);
    }
}

function enableOfflineMode(reason) {
    isOffline = true;
    offlineReason = reason;
    window.supabaseOfflineReason = reason; // Exposed for UI/Debugging
    console.warn("Switching to Offline Mode:", reason);
}

export function isOnline() {
    return !isOffline && supabase !== null;
}

/**
 * Fetches the leaderboard.
 * Returns local data if offline, or remote data if online.
 */
export async function fetchLeaderboard() {
    if (isOffline || !supabase) {
        return getLocalLeaderboard();
    }

    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('username, score')
            .order('score', { ascending: false })
            .limit(10);

        if (error) {
            console.error("Error fetching remote leaderboard:", error);
            return getLocalLeaderboard(); // Fallback on error
        }

        return data || [];
    } catch (err) {
        console.error("Exception fetching leaderboard:", err);
        return getLocalLeaderboard();
    }
}

/**
 * Submits a score.
 * Saves to local storage if offline.
 */
export async function submitScore(username, score) {
    if (isOffline || !supabase) {
        return saveLocalScore(username, score);
    }

    try {
        const { error } = await supabase
            .from('leaderboard')
            .insert([{ username, score }]);

        if (error) {
            console.error("Error submitting score to Supabase:", error);
            // Fallback to local if remote fails
            const localResult = saveLocalScore(username, score);
            return {
                success: false, // It failed remotely
                message: `Remote upload failed (${error.message}). Saved locally.`
            };
        }

        return { success: true, message: "Score submitted successfully!" };
    } catch (err) {
        console.error("Exception submitting score:", err);
        saveLocalScore(username, score);
        return { success: false, message: "Network error. Saved locally." };
    }
}

// --- Local Storage Helpers ---

function getLocalLeaderboard() {
    try {
        const json = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!json) return [];
        let data = JSON.parse(json);
        // Ensure it's an array
        if (!Array.isArray(data)) return [];
        // Sort descending
        return data.sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (e) {
        console.error("Error reading local leaderboard:", e);
        return [];
    }
}

function saveLocalScore(username, score) {
    try {
        let data = getLocalLeaderboard();
        data.push({ username, score });
        // Sort and keep top 50
        data.sort((a, b) => b.score - a.score);
        data = data.slice(0, 50);

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        console.log(`Score saved locally: ${username} - ${score}`);
        return { success: true, message: "Score saved locally." };
    } catch (e) {
        console.error("Error saving local score:", e);
        return { success: false, message: "Failed to save score locally." };
    }
}
