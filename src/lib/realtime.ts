/**
 * Supabase Realtime Module
 * 
 * Provides real-time subscription to new messages using Supabase Realtime.
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { loadConfig, hasSupabaseConfig } from './config.js';

interface RealtimeMessage {
    id: string;
    from_agent: string;
    to_agent: string;
    subject: string;
    message: string;
    encrypted: boolean;
    read: boolean;
    created_at: string;
}

export interface MessageCallback {
    (message: RealtimeMessage): void;
}

export interface StatusCallback {
    (status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT', error?: Error): void;
}

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase client for Realtime
 */
function getClient(): SupabaseClient | null {
    if (supabaseClient) return supabaseClient;

    const config = loadConfig();

    if (!hasSupabaseConfig(config)) {
        console.error('❌ Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
        return null;
    }

    supabaseClient = createClient(config.supabaseUrl!, config.supabaseKey!, {
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    });

    return supabaseClient;
}

/**
 * Subscribe to new messages for a specific agent
 */
export function subscribeToMessages(
    agentId: string,
    onMessage: MessageCallback,
    onStatus?: StatusCallback
): RealtimeChannel | null {
    const client = getClient();
    if (!client) return null;

    const channel = client
        .channel('inbox-watch')
        .on<RealtimeMessage>(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'agent_messages',
                filter: `to_agent=eq.${agentId}`,
            },
            (payload) => {
                onMessage(payload.new);
            }
        )
        .subscribe((status, err) => {
            if (onStatus) {
                onStatus(status as 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT', err);
            }
        });

    return channel;
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
    const client = getClient();
    if (client && channel) {
        await client.removeChannel(channel);
    }
}

/**
 * Close all realtime connections
 */
export async function closeConnection(): Promise<void> {
    if (supabaseClient) {
        await supabaseClient.removeAllChannels();
        supabaseClient = null;
    }
}
