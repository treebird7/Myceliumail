/**
 * Local JSON Storage Adapter
 * 
 * Stores messages in a local JSON file for offline/testing use.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import type { Message, InboxOptions } from '../types/index.js';

const DATA_DIR = join(homedir(), '.myceliumail', 'data');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

interface StoredMessage extends Omit<Message, 'createdAt'> {
    createdAt: string;
}

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }
}

/**
 * Load all messages from storage
 */
function loadMessages(): StoredMessage[] {
    if (!existsSync(MESSAGES_FILE)) return [];
    try {
        return JSON.parse(readFileSync(MESSAGES_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

/**
 * Save messages to storage
 */
function saveMessages(messages: StoredMessage[]): void {
    ensureDataDir();
    writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), { mode: 0o600 });
    try {
        chmodSync(MESSAGES_FILE, 0o600);
    } catch {
        // Best effort on platforms that don't support chmod
    }
}

/**
 * Convert stored message to Message type
 */
function toMessage(stored: StoredMessage): Message {
    return {
        ...stored,
        createdAt: new Date(stored.createdAt),
    };
}

/**
 * Send a message (store locally)
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
    const messages = loadMessages();

    // Handle multi-recipient
    const recipientList = Array.isArray(recipient) ? recipient : [recipient];
    const primaryRecipient = recipientList[0];

    const newMessage: StoredMessage = {
        id: randomUUID(),
        sender,
        recipient: primaryRecipient,
        recipients: recipientList.length > 1 ? recipientList : undefined,
        subject: options?.encrypted ? '' : subject,
        body: options?.encrypted ? '' : body,
        encrypted: options?.encrypted || false,
        ciphertext: options?.ciphertext,
        nonce: options?.nonce,
        senderPublicKey: options?.senderPublicKey,
        attachments: options?.attachments,
        read: false,
        archived: false,
        createdAt: new Date().toISOString(),
    };

    messages.push(newMessage);
    saveMessages(messages);

    return toMessage(newMessage);
}

/**
 * Get inbox messages for an agent (use 'all' for all messages)
 */
export async function getInbox(agentId: string, options?: InboxOptions): Promise<Message[]> {
    const messages = loadMessages();

    const normalizedAgentId = agentId.toLowerCase();
    let filtered = agentId === 'all'
        ? messages.filter(m => !m.archived)
        : messages.filter(m =>
            (m.recipient.toLowerCase() === normalizedAgentId ||
                m.recipients?.some(r => r.toLowerCase() === normalizedAgentId)) && !m.archived
        );

    if (options?.unreadOnly) {
        filtered = filtered.filter(m => !m.read);
    }

    // Sort by date descending (newest first)
    filtered.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
    }

    return filtered.map(toMessage);
}

/**
 * Get a specific message by ID
 */
export async function getMessage(id: string): Promise<Message | null> {
    const messages = loadMessages();
    const found = messages.find(m => m.id === id);
    return found ? toMessage(found) : null;
}

/**
 * Mark message as read by an agent
 */
export async function markAsRead(id: string, agentId?: string): Promise<boolean> {
    const messages = loadMessages();
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return false;

    // Initialize readBy if not present
    if (!messages[index].readBy) {
        messages[index].readBy = [];
    }

    // Add agent to readBy if provided and not already there
    if (agentId && !messages[index].readBy!.includes(agentId)) {
        messages[index].readBy!.push(agentId);
    }

    // Legacy compat
    messages[index].read = true;

    saveMessages(messages);
    return true;
}

/**
 * Delete a message
 */
export async function deleteMessage(id: string): Promise<boolean> {
    const messages = loadMessages();
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return false;

    messages.splice(index, 1);
    saveMessages(messages);
    return true;
}

/**
 * Archive a message
 */
export async function archiveMessage(id: string): Promise<boolean> {
    const messages = loadMessages();
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return false;

    messages[index].archived = true;
    saveMessages(messages);
    return true;
}

/**
 * Get sent messages
 */
export async function getSent(agentId: string, limit?: number): Promise<Message[]> {
    const messages = loadMessages();
    const normalizedAgentId = agentId.toLowerCase();

    let filtered = messages.filter(m => m.sender.toLowerCase() === normalizedAgentId);

    filtered.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (limit) {
        filtered = filtered.slice(0, limit);
    }

    return filtered.map(toMessage);
}
