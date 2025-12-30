/**
 * Hub Storage Adapter
 * 
 * Uses Treebird Hub REST API for messaging.
 * Falls back to Supabase if Hub is unavailable.
 */

import type { Message, InboxOptions } from '../types/index.js';

// Hub URL: localhost for dev, hub.treebird.uk for production
const HUB_URL = process.env.MYCELIUMAIL_HUB_URL || 'http://127.0.0.1:3000';

/**
 * Check if Hub is available
 */
export async function isHubAvailable(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${HUB_URL}/api/agents`, { signal: controller.signal });
        clearTimeout(timeout);
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Send a message via Hub API
 */
export async function sendMessage(
    sender: string,
    recipient: string | string[],
    subject: string,
    body: string,
    _options?: {
        encrypted?: boolean;
        ciphertext?: string;
        nonce?: string;
        senderPublicKey?: string;
    }
): Promise<Message | null> {
    const recipientList = Array.isArray(recipient) ? recipient : [recipient];
    const primaryRecipient = recipientList[0];

    try {
        const res = await fetch(`${HUB_URL}/api/send/${primaryRecipient}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender, subject, body }),
        });

        if (!res.ok) return null;
        const data = await res.json() as { id: string };

        return {
            id: data.id,
            sender,
            recipient: primaryRecipient,
            recipients: recipientList.length > 1 ? recipientList : undefined,
            subject,
            body,
            encrypted: false,
            read: false,
            archived: false,
            createdAt: new Date(),
        };
    } catch {
        return null;
    }
}

/**
 * Get inbox messages from Hub API
 */
export async function getInbox(agentId: string, options?: InboxOptions): Promise<Message[]> {
    try {
        const url = new URL(`${HUB_URL}/api/inbox/${agentId}`);
        if (options?.unreadOnly) url.searchParams.set('unread', 'true');

        const res = await fetch(url.toString());
        if (!res.ok) return [];

        const data = await res.json() as { messages?: any[] };
        return (data.messages || []).map((m: any) => ({
            id: m.id,
            sender: m.sender,
            recipient: agentId,
            subject: m.subject || '',
            body: m.body || '',
            encrypted: false,
            read: m.read || false,
            archived: false,
            createdAt: new Date(m.timestamp),
        }));
    } catch {
        return [];
    }
}

/**
 * Mark message as read via Hub API
 */
export async function markAsRead(id: string, agentId: string): Promise<boolean> {
    try {
        const res = await fetch(`${HUB_URL}/api/inbox/${agentId}/${id}/read`, {
            method: 'PATCH',
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Get unread count from Hub API
 */
export async function getUnreadCount(agentId: string): Promise<number> {
    try {
        const res = await fetch(`${HUB_URL}/api/inbox/${agentId}/count`);
        if (!res.ok) return 0;
        const data = await res.json() as { unread?: number };
        return data.unread || 0;
    } catch {
        return 0;
    }
}
