/**
 * Myceliumail MCP - Config Module
 */

export function getAgentId(): string {
    return process.env.MYCELIUMAIL_AGENT_ID ||
        process.env.MYCELIUMAIL_AGENT ||
        'anonymous';
}

export function getSupabaseUrl(): string | undefined {
    return process.env.SUPABASE_URL;
}

export function getSupabaseKey(): string | undefined {
    return process.env.SUPABASE_ANON_KEY;
}

export function hasSupabase(): boolean {
    return !!(getSupabaseUrl() && getSupabaseKey());
}
