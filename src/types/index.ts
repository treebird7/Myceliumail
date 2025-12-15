/**
 * Myceliumail Type Definitions
 */

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
