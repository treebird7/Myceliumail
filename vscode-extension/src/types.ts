/**
 * Shared Types for Myceliumail Wake Extension
 */

export interface AgentMessage {
    id: string;
    from_agent: string;
    to_agent: string;
    subject: string | null;
    message: string | null;
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
    hubUrl: string;  // Hub API URL (preferred over Supabase)
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
