/**
 * Shared Types for Myceliumail Wake Extension
 */

export interface AgentMessage {
    id: string;
    sender: string;
    recipient: string;
    subject: string | null;
    body: string | null;
    encrypted: boolean;
    read: boolean;
    archived: boolean;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    message_type: 'direct' | 'channel' | 'broadcast' | 'system';
    created_at: string;
    updated_at: string;
}

export interface WakeConfig {
    agentId: string;
    supabaseUrl: string;
    supabaseKey: string;
    enableNotifications: boolean;
    enableChatParticipant: boolean;
    autoConnect: boolean;
}

export type ConnectionStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'error';

export interface ConnectionState {
    status: ConnectionStatus;
    lastConnected: Date | null;
    reconnectAttempts: number;
    error: string | null;
}
