/**
 * Myceliumail MCP - Storage Module
 * 
 * Local JSON storage with optional Supabase sync.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { getSupabaseUrl, getSupabaseKey, hasSupabase } from './config.js';

const DATA_DIR = join(homedir(), '.myceliumail', 'data');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

export interface Message {
    id: string;
    sender: string;
    recipient: string;
    subject: string;
    body: string;
    encrypted: boolean;
    ciphertext?: string;
    nonce?: string;
    senderPublicKey?: string;
    read: boolean;
    archived: boolean;
    createdAt: Date;
}

interface StoredMessage extends Omit<Message, 'createdAt'> {
    createdAt: string;
}

function ensureDataDir(): void {
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadLocalMessages(): StoredMessage[] {
    if (!existsSync(MESSAGES_FILE)) return [];
    try {
        return JSON.parse(readFileSync(MESSAGES_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

function saveLocalMessages(messages: StoredMessage[]): void {
    ensureDataDir();
    writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

function toMessage(stored: StoredMessage): Message {
    return { ...stored, createdAt: new Date(stored.createdAt) };
}

// Supabase helpers
async function supabaseRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${getSupabaseUrl()}/rest/v1${path}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey()!,
            'Authorization': `Bearer ${getSupabaseKey()}`,
            'Prefer': options.method === 'POST' ? 'return=representation' : 'return=minimal',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Supabase request failed (${response.status}): ${text}`);
        throw new Error(text);
    }

    if (response.status === 204) return {} as T;
    return response.json() as Promise<T>;
}

// Agent ID validation (inline for MCP - no access to CLI lib)
const AGENT_ID_PATTERN = /^[a-z0-9_-]{2,20}$/;
function validateAgentId(id: string, fieldName: string = 'agent_id'): void {
    if (!id || !AGENT_ID_PATTERN.test(id) || id.includes('=') || id.includes('://')) {
        throw new Error(`Invalid ${fieldName}: "${id}" — must be 2-20 lowercase alphanumeric chars`);
    }
}

export async function sendMessage(
    sender: string,
    recipient: string,
    subject: string,
    body: string,
    options?: {
        encrypted?: boolean;
        ciphertext?: string;
        nonce?: string;
        senderPublicKey?: string;
    }
): Promise<Message> {
    // Validate sender and recipient before storing
    validateAgentId(sender, 'sender');
    validateAgentId(recipient, 'recipient');
    const newMessage: StoredMessage = {
        id: randomUUID(),
        sender,
        recipient,
        subject: options?.encrypted ? '' : subject,
        body: options?.encrypted ? '' : body,
        encrypted: options?.encrypted || false,
        ciphertext: options?.ciphertext,
        nonce: options?.nonce,
        senderPublicKey: options?.senderPublicKey,
        read: false,
        archived: false,
        createdAt: new Date().toISOString(),
    };

    if (hasSupabase()) {
        try {
            const [result] = await supabaseRequest<StoredMessage[]>('/agent_messages', {
                method: 'POST',
                body: JSON.stringify({
                    from_agent: newMessage.sender,
                    to_agent: newMessage.recipient,
                    subject: newMessage.subject || null,
                    message: newMessage.body || null,
                    encrypted: newMessage.encrypted,
                    ciphertext: newMessage.ciphertext,
                    nonce: newMessage.nonce,
                    sender_public_key: newMessage.senderPublicKey,
                }),
            });
            return toMessage({
                ...newMessage,
                id: (result as unknown as { id: string }).id
            });
        } catch (err) {
            console.error('sendMessage failed, falling back to local:', err);
            // Fall through to local
        }
    }

    // Local storage
    const messages = loadLocalMessages();
    messages.push(newMessage);
    saveLocalMessages(messages);
    return toMessage(newMessage);
}

export async function getInbox(
    agentId: string,
    options?: { unreadOnly?: boolean; limit?: number }
): Promise<Message[]> {
    if (hasSupabase()) {
        try {
            let query = `/agent_messages?to_agent=eq.${agentId}&order=created_at.desc`;
            if (options?.unreadOnly) query += '&read=eq.false';
            if (options?.limit) query += `&limit=${options.limit}`;

            const results = await supabaseRequest<Array<{
                id: string; from_agent: string; to_agent: string;
                subject: string; message: string; encrypted: boolean;
                ciphertext: string; nonce: string; sender_public_key: string;
                read: boolean; created_at: string;
            }>>(query);

            return results.map(r => ({
                id: r.id,
                sender: r.from_agent,
                recipient: r.to_agent,
                subject: r.subject || '',
                body: r.message || '',
                encrypted: r.encrypted,
                ciphertext: r.ciphertext,
                nonce: r.nonce,
                senderPublicKey: r.sender_public_key,
                read: r.read,
                archived: false,
                createdAt: new Date(r.created_at),
            }));
        } catch (err) {
            console.error('getInbox failed, falling back to local:', err);
            // Fall through to local
        }
    }

    // Local storage
    const messages = loadLocalMessages();
    let filtered = messages.filter(m => m.recipient === agentId && !m.archived);
    if (options?.unreadOnly) filtered = filtered.filter(m => !m.read);
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (options?.limit) filtered = filtered.slice(0, options.limit);
    return filtered.map(toMessage);
}

export async function getMessage(id: string): Promise<Message | null> {
    if (hasSupabase()) {
        try {
            // For partial IDs, fetch recent and filter client-side
            // (PostgreSQL UUID doesn't support LIKE operator)
            if (id.length < 36) {
                const results = await supabaseRequest<Array<{
                    id: string; from_agent: string; to_agent: string;
                    subject: string; message: string; encrypted: boolean;
                    ciphertext: string; nonce: string; sender_public_key: string;
                    read: boolean; created_at: string;
                }>>(`/agent_messages?order=created_at.desc&limit=100`);

                const r = results.find(row => row.id.startsWith(id));
                if (r) {
                    return {
                        id: r.id,
                        sender: r.from_agent,
                        recipient: r.to_agent,
                        subject: r.subject || '',
                        body: r.message || '',
                        encrypted: r.encrypted,
                        ciphertext: r.ciphertext,
                        nonce: r.nonce,
                        senderPublicKey: r.sender_public_key,
                        read: r.read,
                        archived: false,
                        createdAt: new Date(r.created_at),
                    };
                }
            } else {
                // Full UUID - exact match
                const results = await supabaseRequest<Array<{
                    id: string; from_agent: string; to_agent: string;
                    subject: string; message: string; encrypted: boolean;
                    ciphertext: string; nonce: string; sender_public_key: string;
                    read: boolean; created_at: string;
                }>>(`/agent_messages?id=eq.${id}`);

                if (results.length > 0) {
                    const r = results[0];
                    return {
                        id: r.id,
                        sender: r.from_agent,
                        recipient: r.to_agent,
                        subject: r.subject || '',
                        body: r.message || '',
                        encrypted: r.encrypted,
                        ciphertext: r.ciphertext,
                        nonce: r.nonce,
                        senderPublicKey: r.sender_public_key,
                        read: r.read,
                        archived: false,
                        createdAt: new Date(r.created_at),
                    };
                }
            }
        } catch (err) {
            console.error('getMessage failed, falling back to local:', err);
            // Fall through
        }
    }

    // Local storage - also supports partial ID
    const messages = loadLocalMessages();
    const found = messages.find(m => m.id === id || m.id.startsWith(id));
    return found ? toMessage(found) : null;
}

export async function markAsRead(id: string): Promise<boolean> {
    // For partial IDs, resolve full UUID first
    let fullId = id;
    if (id.length < 36) {
        const msg = await getMessage(id);
        if (!msg) return false;
        fullId = msg.id;
    }

    if (hasSupabase()) {
        try {
            await supabaseRequest(`/agent_messages?id=eq.${fullId}`, {
                method: 'PATCH',
                body: JSON.stringify({ read: true }),
            });
            return true;
        } catch {
            // Fall through
        }
    }

    const messages = loadLocalMessages();
    const idx = messages.findIndex(m => m.id === fullId);
    if (idx === -1) return false;
    messages[idx].read = true;
    saveLocalMessages(messages);
    return true;
}

export async function archiveMessage(id: string): Promise<boolean> {
    // For partial IDs, resolve full UUID first
    let fullId = id;
    if (id.length < 36) {
        const msg = await getMessage(id);
        if (!msg) return false;
        fullId = msg.id;
    }

    if (hasSupabase()) {
        try {
            await supabaseRequest(`/agent_messages?id=eq.${fullId}`, {
                method: 'PATCH',
                body: JSON.stringify({ archived: true }),
            });
            return true;
        } catch {
            // Fall through
        }
    }

    const messages = loadLocalMessages();
    const idx = messages.findIndex(m => m.id === fullId);
    if (idx === -1) return false;
    messages[idx].archived = true;
    saveLocalMessages(messages);
    return true;
}

// Get full public key for an agent from Supabase registry
export async function getAgentKey(agentId: string): Promise<{ agent_id: string; public_key: string; algorithm?: string } | null> {
    if (!hasSupabase()) {
        return null;
    }

    try {
        const results = await supabaseRequest<Array<{
            agent_id: string;
            public_key: string;
            algorithm?: string;
        }>>(`/agent_keys?agent_id=eq.${agentId}`);

        if (results.length === 0) return null;
        return results[0];
    } catch (err) {
        console.error('getAgentKey failed:', err);
        return null;
    }
}

// Get all agent keys from Supabase registry
export async function getAllAgentKeys(): Promise<Array<{ agent_id: string; public_key: string; algorithm?: string }>> {
    if (!hasSupabase()) {
        return [];
    }

    try {
        return await supabaseRequest<Array<{
            agent_id: string;
            public_key: string;
            algorithm?: string;
        }>>('/agent_keys');
    } catch (err) {
        console.error('getAllAgentKeys failed:', err);
        return [];
    }
}
