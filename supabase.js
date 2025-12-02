/**
 * Supabase Leaderboard Integration
 * 
 * Database Schema Requirement:
 * Table Name: 'leaderboard'
 * Columns:
 * - id: uuid (primary key)
 * - username: text
 * - score: int8
 * - created_at: timestamptz
 * 
 * RLS Policies:
 * - Enable Read for Anon
 * - Enable Insert for Anon
 */

let supabase;
let isOfflineMode = false;

export function initSupabase(url, key) {
    if (url && key && window.supabase) {
        try {
            supabase = window.supabase.createClient(url, key);
            console.log("Supabase initialized");
            isOfflineMode = false;
        } catch (e) {
            console.error("Supabase initialization failed:", e);
            console.warn("Switching to offline mode due to error.");
            isOfflineMode = true;
        }
    } else {
        console.warn("Supabase credentials missing or script not loaded. Switching to offline mode.");
        isOfflineMode = true;
    }
}

export async function fetchLeaderboard() {
    if (isOfflineMode) {
        return fetchLocalLeaderboard();
    }
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('username, score')
            .order('score', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        return data;
    } catch (e) {
        console.error("Error fetching leaderboard:", e);
        // Fallback to local if network fails? For now, just return empty or local.
        return fetchLocalLeaderboard();
    }
}

export async function submitScore(username, score) {
    if (isOfflineMode) {
        return submitLocalScore(username, score);
    }
    if (!supabase) return { success: false, message: "Supabase not initialized" };

    try {
        const { error } = await supabase
            .from('leaderboard')
            .insert([{ username, score }]);
            
        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error("Error submitting score:", e);
        // Optional: Try saving locally if network fails
        return { success: false, message: e.message || "Unknown error" };
    }
}

// --- Local Storage Fallback ---
const LOCAL_STORAGE_KEY = 'kwmejump_leaderboard';

function fetchLocalLeaderboard() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored).sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (e) {
        console.error("Local leaderboard error:", e);
        return [];
    }
}

function submitLocalScore(username, score) {
    try {
        let list = fetchLocalLeaderboard();
        list.push({ username, score });
        // Keep only top 50 locally to save space
        list.sort((a, b) => b.score - a.score);
        list = list.slice(0, 50);

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        return { success: true, message: "Score saved (Offline Mode)" };
    } catch (e) {
        return { success: false, message: "Failed to save locally" };
    }
}
