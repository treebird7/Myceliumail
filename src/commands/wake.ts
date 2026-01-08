/**
 * wake command - Start a new session
 * 
 * Shows inbox count, active collabs, and last session time.
 * Designed for agent session lifecycle management.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { loadKeyPair, decryptMessage } from '../lib/crypto.js';
import { generateDigest, sendDigestToWatsan } from '../lib/watson-digest.js';
import { connectOnWake } from '../lib/hub-client.js';
import * as storage from '../storage/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface SessionData {
    lastWake: string | null;
    lastClose: string | null;
    activeCollabs: string[];
}

function getSessionPath(): string {
    return path.join(os.homedir(), '.mycmail', 'session.json');
}

function loadSession(): SessionData {
    const sessionPath = getSessionPath();
    try {
        if (fs.existsSync(sessionPath)) {
            return JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        }
    } catch {
        // Ignore errors, return default
    }
    return { lastWake: null, lastClose: null, activeCollabs: [] };
}

function saveSession(data: SessionData): void {
    const sessionPath = getSessionPath();
    const dir = path.dirname(sessionPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2));
}

function formatTimeSince(date: string | null): string {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
}

function extractTag(subject: string | null): string | null {
    if (!subject) return null;
    const match = subject.match(/^#([a-zA-Z0-9_-]+):/);
    return match ? match[1].toLowerCase() : null;
}

interface TagDigest {
    tag: string;
    count: number;
    unread: number;
}

async function getTagDigest(agentId: string, messages: any[]): Promise<TagDigest[]> {
    const keyPair = loadKeyPair(agentId);
    const tagCounts: Record<string, { count: number; unread: number }> = {};

    for (const msg of messages) {
        let subject = msg.subject;

        // Try to decrypt if encrypted
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
                }
            } catch {
                // Keep original subject
            }
        }

        const tag = extractTag(subject);
        if (tag) {
            if (!tagCounts[tag]) {
                tagCounts[tag] = { count: 0, unread: 0 };
            }
            tagCounts[tag].count++;
            if (!msg.read) {
                tagCounts[tag].unread++;
            }
        }
    }

    return Object.entries(tagCounts)
        .sort((a, b) => b[1].unread - a[1].unread)
        .slice(0, 5)
        .map(([tag, stats]) => ({ tag, ...stats }));
}

export function createWakeCommand(): Command {
    return new Command('wake')
        .description('Start a new session - check inbox, collabs, and announce presence')
        .option('--json', 'Output as JSON (for scripting)')
        .option('-q, --quiet', 'Minimal output')
        .option('--silent', 'No output (only exit code)')
        .option('--digest', 'Show hashtag digest and active threads')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (agentId === 'anonymous') {
                if (!options.silent) {
                    console.error('❌ Agent ID not configured.');
                }
                process.exit(1);
            }

            try {
                // Load session data
                const session = loadSession();

                // Check if this is a duplicate wake (idempotency)
                if (session.lastWake) {
                    const lastWakeTime = new Date(session.lastWake);
                    const now = new Date();
                    const diffMins = (now.getTime() - lastWakeTime.getTime()) / 60000;

                    // If woken up less than 5 minutes ago, skip re-registration
                    if (diffMins < 5 && !options.json) {
                        if (!options.silent && !options.quiet) {
                            console.log(`⏰ Already woke ${Math.floor(diffMins)} min ago. Use --force to re-wake.`);
                        }
                        // Still show status but don't re-register
                    }
                }

                // Get inbox count
                const messages = await storage.getInbox(agentId, { limit: 100 });
                const unreadCount = messages.filter(m => !m.read).length;
                const totalCount = messages.length;

                // Update session
                session.lastWake = new Date().toISOString();
                saveSession(session);

                // Output based on mode
                if (options.silent) {
                    process.exit(0);
                }

                if (options.json) {
                    const output = {
                        agentId,
                        inbox: {
                            total: totalCount,
                            unread: unreadCount
                        },
                        lastClose: session.lastClose,
                        activeCollabs: session.activeCollabs,
                        wakeTime: session.lastWake
                    };
                    console.log(JSON.stringify(output, null, 2));
                    return;
                }

                // Standard output
                console.log(`\n🌅 Good morning, ${agentId}!\n`);
                console.log(`📬 Inbox: ${unreadCount} unread / ${totalCount} total`);
                console.log(`📋 Active collabs: ${session.activeCollabs.length}`);
                console.log(`🕐 Last close: ${formatTimeSince(session.lastClose)}`);

                // Show digest if requested
                if (options.digest) {
                    const digest = await getTagDigest(agentId, messages);
                    if (digest.length > 0) {
                        console.log('\n🏷️  Active Threads:');
                        for (const { tag, count, unread } of digest) {
                            const unreadMarker = unread > 0 ? ` (${unread} new)` : '';
                            console.log(`   #${tag}: ${count}${unreadMarker}`);
                        }
                    }
                }

                if (!options.quiet) {
                    console.log('\n💡 Tip: Run \'mycmail inbox\' to read messages');
                }

                console.log('\n✅ Session started!\n');

                // Send digest to watson (unencrypted)
                if (!options.silent) {
                    try {
                        const wakeDigest = await generateDigest(agentId, 'wake');
                        await sendDigestToWatsan(wakeDigest);
                        if (!options.quiet) {
                            console.log('📊 Digest sent to watson');
                        }
                    } catch {
                        // Silent fail - digest is optional
                    }
                }

                // Send heartbeat to Hub (HTTP, not WebSocket)
                // WebSocket connections keep process alive - not suitable for wake command
                if (config.hubUrl && !options.silent) {
                    try {
                        const hubUrl = config.hubUrl;
                        const authToken = process.env.BRIDGE_AUTH_TOKEN || '';

                        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                        if (authToken) headers['X-Auth-Token'] = authToken;

                        const response = await fetch(`${hubUrl}/api/heartbeat/${agentId}`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                status: 'online',
                                task: 'Agent wake',
                                timestamp: new Date().toISOString()
                            }),
                            signal: AbortSignal.timeout(5000) // 5s timeout
                        });

                        if (response.ok && !options.quiet) {
                            console.log('📡 Heartbeat sent to Hub');
                        }
                    } catch {
                        // Silent fail - Hub is optional
                    }
                }

            } catch (error) {
                if (!options.silent) {
                    console.error('❌ Wake failed:', error);
                }
                process.exit(1);
            }
        });
}
