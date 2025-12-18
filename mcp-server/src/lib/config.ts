/**
 * Myceliumail MCP - Config Module
 * 
 * Reads configuration from:
 * 1. Environment variables (highest priority)
 * 2. ~/.myceliumail/config.json (fallback)
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_FILE = join(homedir(), '.myceliumail', 'config.json');

interface FileConfig {
    agent_id?: string;
    supabase_url?: string;
    supabase_key?: string;
}

let cachedFileConfig: FileConfig | null = null;

function loadFileConfig(): FileConfig {
    if (cachedFileConfig) return cachedFileConfig;

    if (existsSync(CONFIG_FILE)) {
        try {
            const raw = readFileSync(CONFIG_FILE, 'utf-8');
            cachedFileConfig = JSON.parse(raw);
            return cachedFileConfig!;
        } catch {
            // Invalid config file - ignore
        }
    }
    return {};
}

export function getAgentId(): string {
    return process.env.MYCELIUMAIL_AGENT_ID ||
        process.env.MYCELIUMAIL_AGENT ||
        loadFileConfig().agent_id ||
        'anonymous';
}

export function getSupabaseUrl(): string | undefined {
    return process.env.SUPABASE_URL || loadFileConfig().supabase_url;
}

export function getSupabaseKey(): string | undefined {
    return process.env.SUPABASE_ANON_KEY || loadFileConfig().supabase_key;
}

export function hasSupabase(): boolean {
    return !!(getSupabaseUrl() && getSupabaseKey());
}
