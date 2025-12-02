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

export function initSupabase(url, key) {
    if (url && key && window.supabase) {
        supabase = window.supabase.createClient(url, key);
        console.log("Supabase initialized");
    } else {
        console.warn("Supabase credentials missing or script not loaded.");
    }
}

export async function fetchLeaderboard() {
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
        return [];
    }
}

export async function submitScore(username, score) {
    if (!supabase) return false;

    try {
        const { error } = await supabase
            .from('leaderboard')
            .insert([{ username, score }]);
            
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Error submitting score:", e);
        return false;
    }
}
