/**
 * Myceliumail Type Definitions
 */

// WebSocket event types (Sprint 3 - WS-002)
export * from './websocket.js';

export interface Attachment {
    name: string;      // filename
    type: string;      // MIME type
    data: string;      // base64 encoded
    size: number;      // original size in bytes
}

export interface Message {
    id: string;
    sender: string;
    recipient: string;            // Primary recipient (for backwards compat)
    recipients?: string[];        // Multi-recipient support
    subject: string;
    body: string;
    encrypted: boolean;
    ciphertext?: string;
    nonce?: string;
    senderPublicKey?: string;
    read?: boolean;               // Legacy - kept for backwards compat
    readBy?: string[];            // Array of agents who read this
    archived: boolean;
    attachments?: Attachment[];
    createdAt: Date;
}

export interface Channel {
    name: string;
    description?: string;
    isPublic: boolean;
    createdBy: string;
    createdAt: Date;
}

export interface Agent {
    id: string;
    publicKey?: string;
    status?: string;
    lastSeen?: Date;
}

export interface SendOptions {
    encrypt?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface InboxOptions {
    unreadOnly?: boolean;
    limit?: number;
}
