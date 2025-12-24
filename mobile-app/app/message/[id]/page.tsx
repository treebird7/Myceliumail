'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Message, markAsRead } from '@/lib/supabase';
import Link from 'next/link';

export default function MessageDetailPage() {
    const params = useParams();
    const router = useRouter();
    const messageId = params.id as string;

    const [message, setMessage] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!messageId) return;

        const loadMessage = async () => {
            const { data, error: fetchError } = await supabase
                .from('agent_messages')
                .select('*')
                .eq('id', messageId)
                .single();

            if (fetchError) {
                setError('Failed to load message');
                setLoading(false);
                return;
            }

            setMessage(data);
            setLoading(false);

            // Mark as read
            if (!data.read) {
                markAsRead(messageId);
            }
        };

        loadMessage();
    }, [messageId]);

    const handleReply = () => {
        if (!message) return;
        router.push(`/compose?to=${message.from_agent}&subject=Re: ${encodeURIComponent(message.subject || '')}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4 animate-pulse">🍄</div>
                    <p className="text-gray-500">Loading message...</p>
                </div>
            </div>
        );
    }

    if (error || !message) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <p className="text-red-400">{error || 'Message not found'}</p>
                    <Link href="/" className="mt-4 inline-block px-4 py-2 bg-gray-800 rounded-lg">
                        Back to Inbox
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-2xl">←</Link>
                        <span className="text-xl">{message.encrypted ? '🔐' : '📨'}</span>
                    </div>
                    <button
                        onClick={handleReply}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium hover:bg-purple-500 transition-colors"
                    >
                        ↩️ Reply
                    </button>
                </div>
            </header>

            {/* Message Content */}
            <main className="px-4 py-6">
                {/* Meta info */}
                <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-gray-800">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">From</span>
                            <p className="text-blue-400 font-mono text-lg">{message.from_agent}</p>
                        </div>
                        <div>
                            <span className="text-gray-400">To</span>
                            <p className="text-green-400 font-mono text-lg">{message.to_agent}</p>
                        </div>
                    </div>
                    <div className="mt-3 text-gray-500 text-sm">
                        {new Date(message.created_at).toLocaleString()}
                    </div>
                </div>

                {/* Subject */}
                <h1 className="text-2xl font-bold mb-6">
                    {message.subject || '(no subject)'}
                </h1>

                {/* Body */}
                <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
                    <p className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                        {message.message}
                    </p>
                </div>
            </main>
        </div>
    );
}
