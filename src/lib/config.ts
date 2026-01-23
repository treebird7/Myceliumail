/**
 * Myceliumail Configuration
 * 
 * Handles loading agent configuration from environment or config file.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { extractAgentId, isValidAgentId } from './validation.js';

const CONFIG_DIR = join(homedir(), '.myceliumail');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface Config {
    agentId: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    supabaseAnonKey?: string;
    storageMode: 'auto' | 'supabase' | 'local';
    hubUrl?: string;  // Treebird Hub WebSocket URL (Sprint 3)
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

function normalizeAgentId(input: string | undefined): string {
    const candidate = (input || '').toLowerCase();
    if (!candidate) {
        console.warn('⚠️ Invalid agent ID, using "anonymous"');
        return 'anonymous';
    }

    if (isValidAgentId(candidate)) {
        return candidate;
    }

    const extracted = extractAgentId(candidate);
    if (extracted) {
        console.warn(`⚠️ Invalid agent ID "${candidate.slice(0, 20)}...", using "${extracted}"`);
        return extracted;
    }

    console.warn('⚠️ Invalid agent ID, using "anonymous"');
    return 'anonymous';
}

function isSupabaseAnonKey(key?: string): boolean {
    if (!key) return false;
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    try {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
        const decoded = Buffer.from(padded, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded) as { role?: string };
        return parsed.role === 'anon';
    } catch {
        return false;
    }
}

/**
 * Load configuration from file or environment
 */
export function loadConfig(): Config {
    // Environment variables take precedence
    const envAgentId = process.env.MYCELIUMAIL_AGENT_ID || process.env.MYCELIUMAIL_AGENT;
    const envSupabaseUrl = process.env.SUPABASE_URL;
    const envSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const envSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const envStorageMode = process.env.MYCELIUMAIL_STORAGE as 'auto' | 'supabase' | 'local' | undefined;
    const envHubUrl = process.env.HUB_URL;

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
                supabaseAnonKey: parsed.supabase_anon_key,
                storageMode: parsed.storage_mode,
            };
        } catch {
            // Invalid config file, ignore
        }
    }

    const rawAgentId = envAgentId || fileConfig.agentId || 'anonymous';
    const validAgentId = normalizeAgentId(rawAgentId);
    const supabaseKey = envSupabaseServiceKey
        || envSupabaseAnonKey
        || fileConfig.supabaseKey
        || fileConfig.supabaseAnonKey;
    const fileAnonKey = fileConfig.supabaseAnonKey
        || (fileConfig.supabaseKey && isSupabaseAnonKey(fileConfig.supabaseKey)
            ? fileConfig.supabaseKey
            : undefined);

    // Merge with env taking precedence
    const config: Config = {
        agentId: validAgentId,
        supabaseUrl: envSupabaseUrl || fileConfig.supabaseUrl,
        supabaseKey,
        supabaseAnonKey: envSupabaseAnonKey || fileAnonKey,
        storageMode: envStorageMode || fileConfig.storageMode || 'auto',
        hubUrl: envHubUrl || fileConfig.hubUrl,
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
    if (config.supabaseAnonKey) existing.supabase_anon_key = config.supabaseAnonKey;

    writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2), { mode: 0o600 });
    try {
        chmodSync(CONFIG_FILE, 0o600);
    } catch {
        // Best effort on platforms that don't support chmod
    }
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
