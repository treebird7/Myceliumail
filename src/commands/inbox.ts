/**
 * inbox command - List incoming messages
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { loadKeyPair, decryptMessage } from '../lib/crypto.js';
import * as storage from '../storage/supabase.js';

/**
 * Extract hashtag from subject (e.g., "#wake-feature: Message" -> "wake-feature")
 */
function extractTag(subject: string | null): string | null {
    if (!subject) return null;
    const match = subject.match(/^#([a-zA-Z0-9_-]+):/);
    return match ? match[1].toLowerCase() : null;
}

interface DecryptedMessage {
    original: any;
    subject: string | null;
    body: string | null;
    tag: string | null;
}

/**
 * Decrypt message subjects for filtering
 */
function decryptSubject(msg: any, keyPair: any): DecryptedMessage {
    let subject = msg.subject;
    let body = msg.body;

    if (msg.encrypted && keyPair && msg.ciphertext && msg.nonce && msg.senderPublicKey) {
        try {
            const decrypted = decryptMessage({
                ciphertext: msg.ciphertext,
                nonce: msg.nonce,
                senderPublicKey: msg.senderPublicKey,
            }, keyPair);

            if (decrypted) {
                const parsed = JSON.parse(decrypted);
                subject = parsed.subject || subject;
                body = parsed.body || body;
            }
        } catch {
            // Keep original
        }
    }

    return {
        original: msg,
        subject,
        body,
        tag: extractTag(subject)
    };
}

export function createInboxCommand(): Command {
    return new Command('inbox')
        .description('List incoming messages')
        .option('-u, --unread', 'Show only unread messages')
        .option('-l, --limit <n>', 'Limit number of messages', '10')
        .option('-c, --count', 'Show only message count (for scripting)')
        .option('-t, --tag <tag>', 'Filter by hashtag (e.g., --tag wake-feature)')
        .option('--json', 'Output as JSON (for scripting)')
        .option('--no-hub', 'Skip Hub API, use Supabase directly')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (agentId === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                console.error('Set MYCELIUMAIL_AGENT_ID or configure ~/.myceliumail/config.json');
                process.exit(1);
            }

            try {
                // 🍄 TRY HUB API FIRST (local messaging)
                const hubUrl = process.env.HUB_URL || 'http://localhost:3000';
                let rawMessages: any[] = [];
                let viaHub = false;

                if (options.hub !== false) {
                    try {
                        const url = new URL(`${hubUrl}/api/inbox/${agentId}`);
                        if (options.unread) url.searchParams.set('unread', 'true');

                        const hubResponse = await fetch(url.toString(), {
                            signal: AbortSignal.timeout(2000) // 2s timeout
                        });

                        if (hubResponse.ok) {
                            const data = await hubResponse.json() as { messages?: any[] };
                            rawMessages = (data.messages || []).map((m: any) => ({
                                id: m.id,
                                sender: m.sender,
                                subject: m.subject || '',
                                body: m.body || '',
                                encrypted: false,
                                read: m.read || false,
                                createdAt: new Date(m.timestamp),
                            }));
                            viaHub = true;
                        }
                    } catch {
                        // Hub not available, fall through to Supabase
                    }
                }

                // FALLBACK: Supabase
                if (!viaHub) {
                    rawMessages = await storage.getInbox(agentId, {
                        unreadOnly: options.unread,
                        limit: parseInt(options.limit, 10) * (options.tag ? 10 : 1),
                    });
                }

                const keyPair = loadKeyPair(agentId);

                // Decrypt all subjects first for proper filtering
                let messages = rawMessages.map(m => decryptSubject(m, keyPair));

                // Filter by tag if specified
                if (options.tag) {
                    const targetTag = options.tag.toLowerCase().replace(/^#/, '');
                    messages = messages.filter(m => m.tag === targetTag);
                    messages = messages.slice(0, parseInt(options.limit, 10));
                }

                // Count-only mode
                if (options.count) {
                    const unreadCount = messages.filter(m => !m.original.read).length;
                    if (options.json) {
                        console.log(JSON.stringify({
                            total: messages.length,
                            unread: unreadCount,
                            agentId,
                            tag: options.tag || null
                        }));
                    } else {
                        console.log(`${unreadCount} unread`);
                    }
                    return;
                }

                // JSON mode
                if (options.json) {
                    const output = {
                        agentId,
                        total: messages.length,
                        unread: messages.filter(m => !m.original.read).length,
                        tag: options.tag || null,
                        messages: messages.map(m => ({
                            id: m.original.id,
                            from: m.original.sender,
                            subject: m.subject,
                            tag: m.tag,
                            read: m.original.read,
                            encrypted: m.original.encrypted,
                            createdAt: m.original.createdAt.toISOString()
                        }))
                    };
                    console.log(JSON.stringify(output, null, 2));
                    return;
                }

                if (messages.length === 0) {
                    if (options.tag) {
                        console.log(`📭 No messages with tag #${options.tag}`);
                    } else {
                        console.log('📭 No messages');
                    }
                    return;
                }

                const tagInfo = options.tag ? ` [#${options.tag}]` : '';
                console.log(`📬 Inbox for ${agentId}${tagInfo} (${messages.length} messages)\n`);

                for (const msg of messages) {
                    const readMarker = msg.original.read ? '  ' : '● ';
                    const encryptedMarker = msg.original.encrypted ? '🔐 ' : '';
                    const date = msg.original.createdAt.toLocaleString();

                    let displaySubject = msg.subject || '[No Subject]';

                    // Highlight tag in subject if present
                    if (msg.tag) {
                        displaySubject = displaySubject.replace(`#${msg.tag}:`, `[#${msg.tag}]`);
                    }

                    console.log(`${readMarker}${encryptedMarker}${msg.original.id.slice(0, 8)} | From: ${msg.original.sender} | ${displaySubject}`);
                    console.log(`   ${date}`);
                }

                console.log('\n💡 Use: mycmail read <id> to read a message');
            } catch (error) {
                console.error('❌ Failed to fetch inbox:', error);
                process.exit(1);
            }
        });
}
