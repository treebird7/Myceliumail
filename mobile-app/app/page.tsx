'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, getInbox, getAgentKeys, Message } from '@/lib/supabase';
import { useHub, HubStatus } from '@/lib/hub';
import MessageCard from '@/components/MessageCard';
import Link from 'next/link';

// Default agents if we can't fetch from agent_keys
const DEFAULT_AGENTS = ['treebird', 'wsan', 'ssan', 'mycm', 'bsan', 'arti'];

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<string[]>(DEFAULT_AGENTS);
  const [error, setError] = useState<string | null>(null);

  // Connect to Hub for real-time messages
  const { status: hubStatus, lastMessage: hubMessage } = useHub(agents);

  const loadInbox = useCallback(async () => {
    try {
      // Try to get agents from agent_keys table
      const agentKeys = await getAgentKeys();
      const agentIds = agentKeys.length > 0 ? agentKeys : DEFAULT_AGENTS;
      setAgents(agentIds);

      const inbox = await getInbox(agentIds, 50);
      setMessages(inbox);
      setError(null);
    } catch (err) {
      console.error('Failed to load inbox:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Hub real-time messages
  useEffect(() => {
    if (hubMessage && agents.includes(hubMessage.recipient)) {
      // Add new message to top of list if it's for one of our agents
      const newMsg: Message = {
        id: 'hub-' + Date.now(),
        from_agent: hubMessage.sender,
        to_agent: hubMessage.recipient,
        subject: hubMessage.subject,
        message: hubMessage.body || '',
        encrypted: false,
        read: false,
        created_at: hubMessage.timestamp
      };
      setMessages(prev => [newMsg, ...prev.filter(m => m.id !== newMsg.id)]);
    }
  }, [hubMessage, agents]);

  useEffect(() => {
    loadInbox();

    // Set up Supabase real-time subscription
    const channel = supabase
      .channel('mobile-inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Check if this message is for one of our agents
          if (agents.includes(newMsg.to_agent)) {
            setMessages(prev => [newMsg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadInbox, agents]);

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍄</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Myceliumail
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); loadInbox(); }}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              🔄
            </button>
            <Link
              href="/compose"
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium hover:bg-purple-500 transition-colors"
            >
              ✉️ Compose
            </Link>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-gray-400">
          <div>
            {unreadCount > 0 ? (
              <span className="text-blue-400">{unreadCount} unread</span>
            ) : (
              <span>No unread messages</span>
            )} · {messages.length} total
          </div>
          <HubStatus status={hubStatus} />
        </div>
      </header>

      {/* Message List */}
      <main className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4 animate-pulse">🍄</div>
            <p>Loading messages...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">
            <div className="text-4xl mb-4">❌</div>
            <p>{error}</p>
            <button
              onClick={loadInbox}
              className="mt-4 px-4 py-2 bg-gray-800 rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📭</div>
            <p>No messages yet</p>
          </div>
        ) : (
          messages.map(message => (
            <MessageCard key={message.id} message={message} />
          ))
        )}
      </main>
    </div>
  );
}
