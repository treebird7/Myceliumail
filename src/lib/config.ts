/**
 * Myceliumail Configuration
 * 
 * Handles loading agent configuration from environment or config file.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.myceliumail');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface Config {
    agentId: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    storageMode: 'auto' | 'supabase' | 'local';
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

/**
 * Load configuration from file or environment
 */
export function loadConfig(): Config {
    // Environment variables take precedence
    const envAgentId = process.env.MYCELIUMAIL_AGENT_ID || process.env.MYCELIUMAIL_AGENT;
    const envSupabaseUrl = process.env.SUPABASE_URL;
    const envSupabaseKey = process.env.SUPABASE_ANON_KEY;
    const envStorageMode = process.env.MYCELIUMAIL_STORAGE as 'auto' | 'supabase' | 'local' | undefined;

    // Try to load from config file
    let fileConfig: Partial<Config> = {};
    if (existsSync(CONFIG_FILE)) {
        try {
            const raw = readFileSync(CONFIG_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            fileConfig = {
                agentId: parsed.agent_id,
                supabaseUrl: parsed.supabase_url,
                supabaseKey: parsed.supabase_key,
                storageMode: parsed.storage_mode,
            };
        } catch {
            // Invalid config file, ignore
        }
    }

    // Merge with env taking precedence
    const config: Config = {
        agentId: envAgentId || fileConfig.agentId || 'anonymous',
        supabaseUrl: envSupabaseUrl || fileConfig.supabaseUrl,
        supabaseKey: envSupabaseKey || fileConfig.supabaseKey,
        storageMode: envStorageMode || fileConfig.storageMode || 'auto',
    };

    return config;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Partial<Config>): void {
    ensureConfigDir();

    // Load existing config
    let existing: Record<string, string> = {};
    if (existsSync(CONFIG_FILE)) {
        try {
            existing = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
        } catch {
            // Start fresh
        }
    }

    // Merge
    if (config.agentId) existing.agent_id = config.agentId;
    if (config.supabaseUrl) existing.supabase_url = config.supabaseUrl;
    if (config.supabaseKey) existing.supabase_key = config.supabaseKey;

    writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2));
}

/**
 * Get config directory path
 */
export function getConfigDir(): string {
    return CONFIG_DIR;
}

/**
 * Check if Supabase is configured
 */
export function hasSupabaseConfig(config: Config): boolean {
    return !!(config.supabaseUrl && config.supabaseKey);
}
