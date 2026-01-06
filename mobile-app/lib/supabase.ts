import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using the same credentials as mycmail
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ruvwundetxnzesrbkdzr.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.treebird.uk';

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

// Sender ID validation (synced with CLI validation.ts)
const AGENT_ID_PATTERN = /^[a-z0-9_-]{2,20}$/;

export function isValidAgentId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    if (!AGENT_ID_PATTERN.test(id)) return false;
    if (id.includes('=') || id.includes('://') || id.includes('http')) return false;
    return true;
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
    // Validate sender and recipient IDs
    if (!isValidAgentId(from)) {
        console.error(`Invalid sender ID: "${from}"`);
        return null;
    }
    if (!isValidAgentId(to)) {
        console.error(`Invalid recipient ID: "${to}"`);
        return null;
    }

    // Try Hub API first (for real-time delivery)
    try {
        const hubResponse = await fetch(`${HUB_URL}/api/send/${to}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: from, subject, body }),
            signal: AbortSignal.timeout(3000)
        });

        if (hubResponse.ok) {
            const result = await hubResponse.json() as { id: string };
            return {
                id: result.id,
                from_agent: from,
                to_agent: to,
                subject,
                message: body,
                encrypted: false,
                read: false,
                created_at: new Date().toISOString()
            };
        }
    } catch (err) {
        console.warn('Hub unavailable, falling back to Supabase:', err);
    }

    // Fallback to Supabase direct insert
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

