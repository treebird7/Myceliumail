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

/**
 * Load configuration from file or environment
 */
export function loadConfig(): Config {
    // Environment variables take precedence
    const envAgentId = process.env.MYCELIUMAIL_AGENT_ID || process.env.MYCELIUMAIL_AGENT;
    const envSupabaseUrl = process.env.SUPABASE_URL;
    const envSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
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
                storageMode: parsed.storage_mode,
            };
        } catch {
            // Invalid config file, ignore
        }
    }

    // SECURITY: Validate agentId to prevent path traversal and command injection
    const rawAgentId = (envAgentId || fileConfig.agentId || 'anonymous').toLowerCase();
    const validAgentId = validateAgentId(rawAgentId);

    // Merge with env taking precedence
    const config: Config = {
        agentId: validAgentId,
        supabaseUrl: envSupabaseUrl || fileConfig.supabaseUrl,
        supabaseKey: envSupabaseKey || fileConfig.supabaseKey,
        storageMode: envStorageMode || fileConfig.storageMode || 'auto',
        hubUrl: envHubUrl || fileConfig.hubUrl,
    };

    return config;
}

/**
 * Validate agent ID - prevent path traversal and injection
 * @throws Error if invalid
 */
function validateAgentId(agentId: string): string {
    // Only allow alphanumeric, hyphen, underscore (max 50 chars)
    const VALID_AGENT_ID = /^[a-z0-9][a-z0-9_-]{0,49}$/;

    if (!agentId || typeof agentId !== 'string') {
        console.warn('⚠️ Invalid agent ID, using "anonymous"');
        return 'anonymous';
    }

    if (!VALID_AGENT_ID.test(agentId)) {
        console.warn(`⚠️ Invalid agent ID "${agentId.slice(0, 20)}...", using sanitized version`);
        // Sanitize: remove invalid chars, keep only safe ones
        const sanitized = agentId.replace(/[^a-z0-9_-]/g, '').slice(0, 50) || 'anonymous';
        return sanitized;
    }

    return agentId;
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
