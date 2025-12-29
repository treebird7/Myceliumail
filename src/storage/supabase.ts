/**
 * Supabase Storage Adapter
 * 
 * Stores messages in Supabase PostgreSQL for cloud sync.
 * Falls back to local storage if Supabase is not configured.
 */

import { loadConfig, hasSupabaseConfig } from '../lib/config.js';
import type { Message, InboxOptions } from '../types/index.js';
import * as local from './local.js';

// Simple fetch-based Supabase client (no dependencies)
interface SupabaseClient {
    url: string;
    key: string;
}

function createClient(): SupabaseClient | null {
    const config = loadConfig();

    // Force local storage if mode is 'local'
    if (config.storageMode === 'local') {
        return null;
    }

    // Check if Supabase is configured
    if (!hasSupabaseConfig(config)) {
        // Error if mode is 'supabase' but not configured
        if (config.storageMode === 'supabase') {
            console.error('❌ MYCELIUMAIL_STORAGE=supabase but Supabase not configured!');
            console.error('   Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
        }
        return null;
    }

    return {
        url: config.supabaseUrl!,
        key: config.supabaseKey!,
    };
}

async function supabaseRequest<T>(
    client: SupabaseClient,
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${client.url}/rest/v1${path}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'apikey': client.key,
                'Authorization': `Bearer ${client.key}`,
                'Prefer': options.method === 'POST' ? 'return=representation' : 'return=minimal',
                ...options.headers,
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase error: ${error}`);
        }

        if (response.status === 204) return {} as T;
        return response.json() as Promise<T>;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Supabase request timed out after 10 seconds');
        }
        throw error;
    }
}

/**
 * Send a message via Supabase
 */
export async function sendMessage(
    sender: string,
    recipient: string | string[],
    subject: string,
    body: string,
    options?: {
        encrypted?: boolean;
        ciphertext?: string;
        nonce?: string;
        senderPublicKey?: string;
        attachments?: { name: string; type: string; data: string; size: number }[];
    }
): Promise<Message> {
    const client = createClient();

    // Fall back to local if no Supabase
    if (!client) {
        return local.sendMessage(sender, recipient, subject, body, options);
    }

    const payload = {
        from_agent: sender,
        to_agent: recipient,
        subject: options?.encrypted ? '🔒 [Encrypted Message]' : subject,
        message: options?.encrypted ? JSON.stringify({
            ciphertext: options?.ciphertext,
            nonce: options?.nonce,
            sender_public_key: options?.senderPublicKey,
        }) : body,
        encrypted: options?.encrypted || false,
    };

    const [result] = await supabaseRequest<Array<{
        id: string;
        from_agent: string;
        to_agent: string;
        subject: string;
        message: string;
        encrypted: boolean;
        read: boolean;
        created_at: string;
    }>>(client, '/agent_messages', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    // Parse encrypted message if needed
    let parsedMessage = result.message;
    let ciphertext, nonce, senderPublicKey;
    if (result.encrypted && result.message) {
        try {
            const encrypted = JSON.parse(result.message);
            ciphertext = encrypted.ciphertext;
            nonce = encrypted.nonce;
            senderPublicKey = encrypted.sender_public_key;
        } catch {
            // Not JSON, treat as plaintext
        }
    }

    return {
        id: result.id,
        sender: result.from_agent,
        recipient: result.to_agent,
        subject: result.subject || '',
        body: result.encrypted ? '' : result.message,
        encrypted: result.encrypted,
        ciphertext,
        nonce,
        senderPublicKey,
        read: result.read,
        archived: false, // Not in response
        createdAt: new Date(result.created_at),
    };
}

/**
 * Get inbox messages from Supabase
 */
export async function getInbox(agentId: string, options?: InboxOptions): Promise<Message[]> {
    const client = createClient();

    if (!client) {
        return local.getInbox(agentId, options);
    }

    let query = `/agent_messages?to_agent=eq.${agentId}&order=created_at.desc`;

    if (options?.unreadOnly) {
        query += '&read=eq.false';
    }

    // Default limit to prevent fetching entire message history
    const limit = options?.limit ?? 50;
    query += `&limit=${limit}`;

    const results = await supabaseRequest<Array<{
        id: string;
        from_agent: string;
        to_agent: string;
        subject: string;
        message: string;
        encrypted: boolean;
        read: boolean;
        created_at: string;
    }>>(client, query);

    return results.map(r => {
        // Parse encrypted message
        let ciphertext, nonce, senderPublicKey, body = r.message;
        if (r.encrypted && r.message) {
            try {
                const enc = JSON.parse(r.message);
                ciphertext = enc.ciphertext;
                nonce = enc.nonce;
                senderPublicKey = enc.sender_public_key;
                body = '';
            } catch { }
        }
        return {
            id: r.id,
            sender: r.from_agent,
            recipient: r.to_agent,
            subject: r.subject || '',
            body,
            encrypted: r.encrypted,
            ciphertext,
            nonce,
            senderPublicKey,
            read: r.read,
            archived: false,
            createdAt: new Date(r.created_at),
        };
    });
}

/**
 * Get inbox messages for multiple agents from Supabase
 */
export async function getMultiAgentInbox(agentIds: string[], options?: InboxOptions): Promise<Message[]> {
    const client = createClient();

    if (!client || agentIds.length === 0) {
        // For local storage, aggregate from all agents
        if (agentIds.length === 0) return [];
        const allMessages: Message[] = [];
        for (const agentId of agentIds) {
            const msgs = await local.getInbox(agentId, options);
            allMessages.push(...msgs);
        }
        // Sort by date descending and apply limit
        allMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return options?.limit ? allMessages.slice(0, options.limit) : allMessages;
    }

    // Build query with IN clause for multiple agents
    const agentList = agentIds.map(id => `"${id}"`).join(',');
    let query = `/agent_messages?to_agent=in.(${agentList})&order=created_at.desc`;

    if (options?.unreadOnly) {
        query += '&read=eq.false';
    }

    // Default limit to prevent fetching entire message history
    const limit = options?.limit ?? 50;
    query += `&limit=${limit}`;

    const results = await supabaseRequest<Array<{
        id: string;
        from_agent: string;
        to_agent: string;
        subject: string;
        message: string;
        encrypted: boolean;
        read: boolean;
        created_at: string;
    }>>(client, query);

    return results.map(r => {
        // Parse encrypted message
        let ciphertext, nonce, senderPublicKey, body = r.message;
        if (r.encrypted && r.message) {
            try {
                const enc = JSON.parse(r.message);
                ciphertext = enc.ciphertext;
                nonce = enc.nonce;
                senderPublicKey = enc.sender_public_key;
                body = '';
            } catch { }
        }
        return {
            id: r.id,
            sender: r.from_agent,
            recipient: r.to_agent,
            subject: r.subject || '',
            body,
            encrypted: r.encrypted,
            ciphertext,
            nonce,
            senderPublicKey,
            read: r.read,
            archived: false,
            createdAt: new Date(r.created_at),
        };
    });
}

/**
 * Get a specific message (supports partial ID lookup)
 */
export async function getMessage(id: string): Promise<Message | null> {
    const client = createClient();

    if (!client) {
        return local.getMessage(id);
    }

    // For partial IDs, fetch recent messages and filter client-side
    // (PostgreSQL UUID type doesn't support LIKE operator)
    if (id.length < 36) {
        const results = await supabaseRequest<Array<{
            id: string;
            from_agent: string;
            to_agent: string;
            subject: string;
            message: string;
            encrypted: boolean;
            read: boolean;
            created_at: string;
        }>>(client, `/agent_messages?order=created_at.desc&limit=100`);

        const r = results.find(row => row.id.startsWith(id));
        if (!r) return null;

        // Parse encrypted message
        let ciphertext, nonce, senderPublicKey, body = r.message;
        if (r.encrypted && r.message) {
            try {
                const enc = JSON.parse(r.message);
                ciphertext = enc.ciphertext;
                nonce = enc.nonce;
                senderPublicKey = enc.sender_public_key;
                body = '';
            } catch { }
        }

        return {
            id: r.id,
            sender: r.from_agent,
            recipient: r.to_agent,
            subject: r.subject || '',
            body,
            encrypted: r.encrypted,
            ciphertext,
            nonce,
            senderPublicKey,
            read: r.read,
            archived: false,
            createdAt: new Date(r.created_at),
        };
    }

    // Full UUID - exact match
    const results = await supabaseRequest<Array<{
        id: string;
        from_agent: string;
        to_agent: string;
        subject: string;
        message: string;
        encrypted: boolean;
        read: boolean;
        created_at: string;
    }>>(client, `/agent_messages?id=eq.${id}`);

    if (results.length === 0) return null;

    const r = results[0];

    // Parse encrypted message
    let ciphertext, nonce, senderPublicKey, body = r.message;
    if (r.encrypted && r.message) {
        try {
            const enc = JSON.parse(r.message);
            ciphertext = enc.ciphertext;
            nonce = enc.nonce;
            senderPublicKey = enc.sender_public_key;
            body = '';
        } catch { }
    }

    return {
        id: r.id,
        sender: r.from_agent,
        recipient: r.to_agent,
        subject: r.subject || '',
        body,
        encrypted: r.encrypted,
        ciphertext,
        nonce,
        senderPublicKey,
        read: r.read,
        archived: false,
        createdAt: new Date(r.created_at),
    };
}

/**
 * Mark message as read (supports partial ID)
 */
export async function markAsRead(id: string, agentId?: string): Promise<boolean> {
    const client = createClient();

    if (!client) {
        return local.markAsRead(id, agentId);
    }

    // For partial IDs, resolve full UUID first
    let fullId = id;
    if (id.length < 36) {
        const msg = await getMessage(id);
        if (!msg) return false;
        fullId = msg.id;
    }

    try {
        await supabaseRequest(client, `/agent_messages?id=eq.${fullId}`, {
            method: 'PATCH',
            body: JSON.stringify({ read: true }),
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Archive a message (supports partial ID)
 */
export async function archiveMessage(id: string): Promise<boolean> {
    const client = createClient();

    if (!client) {
        return local.archiveMessage(id);
    }

    // For partial IDs, resolve full UUID first
    let fullId = id;
    if (id.length < 36) {
        const msg = await getMessage(id);
        if (!msg) return false;
        fullId = msg.id;
    }

    try {
        await supabaseRequest(client, `/agent_messages?id=eq.${fullId}`, {
            method: 'PATCH',
            body: JSON.stringify({ archived: true }),
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Delete a message
 */
export async function deleteMessage(id: string): Promise<boolean> {
    const client = createClient();

    if (!client) {
        return local.deleteMessage(id);
    }

    try {
        await supabaseRequest(client, `/agent_messages?id=eq.${id}`, {
            method: 'DELETE',
        });
        return true;
    } catch {
        return false;
    }
}
