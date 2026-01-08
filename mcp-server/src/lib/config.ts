/**
 * Myceliumail MCP - Config Module
 * 
 * Reads configuration from:
 * 1. Environment variables (highest priority)
 * 2. ~/.myceliumail/config.json (fallback)
 */

// Load .env from the mcp-server directory (fix for Claude Desktop CWD issue)
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');  // mcp-server/.env
config({ path: envPath });

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

export function getStorageMode(): 'auto' | 'local' | 'supabase' {
    return (process.env.MYCELIUMAIL_STORAGE as 'auto' | 'local' | 'supabase') || 'auto';
}

export function hasSupabase(): boolean {
    if (getStorageMode() === 'local') return false;
    return !!(getSupabaseUrl() && getSupabaseKey());
}
