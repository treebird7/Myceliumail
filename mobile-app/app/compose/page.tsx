'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendMessage, getAgentKeys } from '@/lib/supabase';
import Link from 'next/link';

const DEFAULT_AGENTS = ['treebird', 'wsan', 'ssan', 'mycm', 'antigravity'];

export default function ComposePage() {
    const router = useRouter();
    const [agents, setAgents] = useState<string[]>(DEFAULT_AGENTS);
    const [from, setFrom] = useState('treebird');
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load available agents
        getAgentKeys().then(keys => {
            if (keys.length > 0) {
                setAgents(keys);
                if (keys.includes('treebird')) {
                    setFrom('treebird');
                } else {
                    setFrom(keys[0]);
                }
            }
        });
    }, []);

    const handleSend = async () => {
        if (!to.trim()) {
            setError('Please enter a recipient');
            return;
        }
        if (!subject.trim()) {
            setError('Please enter a subject');
            return;
        }
        if (!body.trim()) {
            setError('Please enter a message');
            return;
        }

        setSending(true);
        setError(null);

        const result = await sendMessage(from, to.trim(), subject.trim(), body);

        if (result) {
            router.push('/');
        } else {
            setError('Failed to send message');
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-2xl">←</Link>
                        <h1 className="text-xl font-bold">Compose</h1>
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={sending}
                        className="px-5 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-500 transition-colors disabled:opacity-50"
                    >
                        {sending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </header>

            {/* Form */}
            <main className="px-4 py-4 space-y-4">
                {error && (
                    <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* From */}
                <div>
                    <label className="block text-gray-400 text-sm mb-2">From:</label>
                    <select
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    >
                        {agents.map(agent => (
                            <option key={agent} value={agent}>{agent}</option>
                        ))}
                    </select>
                </div>

                {/* To */}
                <div>
                    <label className="block text-gray-400 text-sm mb-2">To:</label>
                    <input
                        type="text"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder="recipient agent ID"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                </div>

                {/* Subject */}
                <div>
                    <label className="block text-gray-400 text-sm mb-2">Subject:</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Message subject"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                </div>

                {/* Body */}
                <div>
                    <label className="block text-gray-400 text-sm mb-2">Message:</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={10}
                        placeholder="Write your message..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    />
                </div>
            </main>
        </div>
    );
}
