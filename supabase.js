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
        supabase = window.supabase.createClient(url, key);
        console.log("Supabase initialized");
        isOfflineMode = false;
    } else {
        console.warn("Supabase credentials missing. Switching to offline mode.");
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
        // 네트워크/서버 문제면 로컬 리더보드로 fallback
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
        const { error } = await supabase
            .from('leaderboard')
            .insert([{ username, score }]);
            
        if (error) throw error;

        return { success: true };
    } catch (e) {
        console.error("Error submitting score:", e);
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
