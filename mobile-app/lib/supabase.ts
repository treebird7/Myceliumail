import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using the same credentials as mycmail
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ruvwundetxnzesrbkdzr.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
        params: { eventsPerSecond: 10 }
    }
});

export interface Message {
    id: string;
    from_agent: string;
    to_agent: string;
    subject: string;
    message: string;
    encrypted: boolean;
    read: boolean;
    created_at: string;
}

export async function getInbox(agentIds: string[], limit = 50): Promise<Message[]> {
    const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .in('to_agent', agentIds)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Failed to fetch inbox:', error);
        return [];
    }

    return data || [];
}

export async function sendMessage(
    from: string,
    to: string,
    subject: string,
    body: string
): Promise<Message | null> {
    const { data, error } = await supabase
        .from('agent_messages')
        .insert({
            from_agent: from,
            to_agent: to,
            subject,
            message: body,
            encrypted: false,
            read: false,
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to send message:', error);
        return null;
    }

    return data;
}

export async function markAsRead(messageId: string): Promise<boolean> {
    const { error } = await supabase
        .from('agent_messages')
        .update({ read: true })
        .eq('id', messageId);

    return !error;
}

export async function getAgentKeys(): Promise<string[]> {
    const { data, error } = await supabase
        .from('agent_keys')
        .select('agent_id');

    if (error || !data) {
        console.error('Failed to fetch agent keys:', error);
        return [];
    }

    return data.map(row => row.agent_id);
}
