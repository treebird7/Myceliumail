/**
 * tags command - List all unique hashtags from messages
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

export function createTagsCommand(): Command {
    return new Command('tags')
        .description('List all unique hashtags from your messages')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (agentId === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                process.exit(1);
            }

            try {
                // Fetch all messages (up to 500)
                const messages = await storage.getInbox(agentId, { limit: 500 });
                const keyPair = loadKeyPair(agentId);

                // Count tags
                const tagCounts: Record<string, { count: number, unread: number }> = {};

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

                const tagList = Object.entries(tagCounts)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([tag, stats]) => ({ tag, ...stats }));

                if (options.json) {
                    console.log(JSON.stringify({ tags: tagList }, null, 2));
                    return;
                }

                if (tagList.length === 0) {
                    console.log('📭 No tagged messages found');
                    console.log('\n💡 Tag messages by prefixing subject with #tag:');
                    console.log('   mycmail send wsan "#wake-feature: Need help"');
                    return;
                }

                console.log('🏷️  Message Tags\n');
                for (const { tag, count, unread } of tagList) {
                    const unreadMarker = unread > 0 ? ` (${unread} unread)` : '';
                    console.log(`  #${tag}: ${count} message${count > 1 ? 's' : ''}${unreadMarker}`);
                }

                console.log('\n💡 Filter by tag: mycmail inbox --tag <tag>');

            } catch (error) {
                console.error('❌ Failed to fetch tags:', error);
                process.exit(1);
            }
        });
}
