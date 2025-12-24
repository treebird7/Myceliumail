'use client';

import { Message } from '@/lib/supabase';
import Link from 'next/link';

interface MessageCardProps {
    message: Message;
}

export default function MessageCard({ message }: MessageCardProps) {
    const isUnread = !message.read;
    const timeAgo = formatTimeAgo(new Date(message.created_at));

    return (
        <Link href={`/message/${message.id}`}>
            <div className={`
        p-4 rounded-xl border transition-all active:scale-[0.98]
        ${isUnread
                    ? 'bg-gray-800/50 border-gray-700'
                    : 'bg-gray-900 border-gray-800'
                }
      `}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">
                            {message.encrypted ? '🔐' : '📨'}
                        </span>
                        <span className={`font-medium ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                            {message.from_agent}
                        </span>
                        <span className="text-gray-500 text-sm">→ {message.to_agent}</span>
                    </div>
                    {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                </div>
                <div className={`text-base truncate mb-1 ${isUnread ? 'text-gray-100 font-medium' : 'text-gray-400'}`}>
                    {message.subject || '(no subject)'}
                </div>
                <div className="text-sm text-gray-500">
                    {timeAgo}
                </div>
            </div>
        </Link>
    );
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
