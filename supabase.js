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

// Debug helper to check CDN load status immediately
if (typeof window !== 'undefined') {
    if (window.supabase) {
        console.log("Supabase Library Status: Loaded via CDN.");
    } else {
        console.warn("Supabase Library Status: NOT FOUND on module load. It might load later or failed.");
        // Attempt to check again after a short delay in init
    }
}

function cleanConfig(value) {
    if (!value) return null;
    // Remove quotes if the user accidentally included them in the secret value
    return value.trim().replace(/^["'](.*)["']$/, '$1');
}

export async function initSupabase(rawUrl, rawKey) {
    const url = cleanConfig(rawUrl);
    const key = cleanConfig(rawKey);

    // Debugging Config Injection
    if (rawUrl) console.log(`Supabase URL provided (Length: ${rawUrl.length})`);
    else console.warn("Supabase URL is missing/empty");

    if (rawKey) console.log(`Supabase Key provided (Length: ${rawKey.length})`);
    else console.warn("Supabase Key is missing/empty");

    // Retry finding window.supabase in case of async loading race condition
    if (!window.supabase) {
        console.warn("window.supabase not found immediately. Waiting 500ms...");
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (url && key && window.supabase) {
        try {
            supabase = window.supabase.createClient(url, key);

            // Basic connectivity check (optional, but good for verification)
            // Just creating the client doesn't mean we are connected.
            // We can assume online for now, errors will be caught in operations.
            console.log("Supabase initialized successfully (Client created).");
            isOfflineMode = false;
            window.supabaseOfflineReason = null; // Clear any previous reason
        } catch (e) {
            console.error("Supabase init failed:", e);
            setOfflineMode(`Init Exception: ${e.message}`);
        }
    } else {
        const reasons = [];
        if (!url) reasons.push("Missing VITE_SUPABASE_URL");
        if (!key) reasons.push("Missing VITE_SUPABASE_ANON_KEY");
        if (!window.supabase) reasons.push("Supabase JS library not loaded (window.supabase is undefined)");

        setOfflineMode(`Missing Config/Lib: ${reasons.join(", ")}`);
    }
}

function setOfflineMode(reason) {
    console.warn(`Supabase integration disabled. Running in Offline Mode. Reason: ${reason}`);
    console.warn("To enable Supabase, ensure environment variables are set in .env (local) or GitHub Secrets (production).");
    isOfflineMode = true;
    window.supabaseOfflineReason = reason; // Expose for debugging
}

export function isOnline() {
    return !isOfflineMode && !!supabase;
}

export async function fetchLeaderboard() {
    if (isOfflineMode) {
        console.log("Fetching local leaderboard (Offline Mode)");
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
        // Fallback to local if network fails despite being "online"
        return fetchLocalLeaderboard();
    }
}

export async function submitScore(username, score) {
    // offline 모드면 로컬 저장
    if (isOfflineMode) {
        return submitLocalScore(username, score);
    }
    // supabase가 초기화가 안 됐을 경우 (환경변수/스크립트 로드 문제)
    if (!supabase) {
        return { success: false, message: "Supabase not initialized (check env vars)" };
    }

    try {
        console.log(`Submitting score: ${score} for user: ${username}`);

        // Check for potential integer overflow (postgres int2=32767, int4=2147483647)
        // If the user's DB has 'score' as int2, >32767 will fail.
        if (score > 32767) {
            console.warn("Score is > 32,767. If submission fails, check if your Supabase 'score' column is INT2 (SmallInt). It should be INT8 (BigInt) or INT4.");
        }

        const { error } = await supabase
            .from('leaderboard')
            .insert([{ username, score }]);
            
        if (error) {
            console.error("Supabase Submit Error:", error);
            if (error.code === '22003') { // Numeric value out of range
                return { success: false, message: "Score too high for database (Check DB column type)" };
            }
            // Return actual error message to help debugging
            return { success: false, message: `DB Error: ${error.message} (Code: ${error.code})` };
        }

        return { success: true };
    } catch (e) {
        console.error("Error submitting score:", e);
        // Fallback to local if server error occurs (e.g. 500)
        return submitLocalScore(username, score);
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
