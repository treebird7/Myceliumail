/**
 * inbox command - List incoming messages
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { loadKeyPair, decryptMessage } from '../lib/crypto.js';
import * as storage from '../storage/supabase.js';

export function createInboxCommand(): Command {
    return new Command('inbox')
        .description('List incoming messages')
        .option('-u, --unread', 'Show only unread messages')
        .option('-l, --limit <n>', 'Limit number of messages', '10')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (agentId === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                console.error('Set MYCELIUMAIL_AGENT_ID or configure ~/.myceliumail/config.json');
                process.exit(1);
            }

            try {
                const messages = await storage.getInbox(agentId, {
                    unreadOnly: options.unread,
                    limit: parseInt(options.limit, 10),
                });

                if (messages.length === 0) {
                    console.log('📭 No messages');
                    return;
                }

                console.log(`📬 Inbox for ${agentId} (${messages.length} messages)\n`);

                const keyPair = loadKeyPair(agentId);

                for (const msg of messages) {
                    const readMarker = msg.read ? '  ' : '● ';
                    const encryptedMarker = msg.encrypted ? '🔐 ' : '';
                    const date = msg.createdAt.toLocaleString();

                    let displaySubject = msg.subject;

                    // Try to decrypt if encrypted and we have keys
                    if (msg.encrypted && keyPair && msg.ciphertext && msg.nonce && msg.senderPublicKey) {
                        try {
                            const decrypted = decryptMessage({
                                ciphertext: msg.ciphertext,
                                nonce: msg.nonce,
                                senderPublicKey: msg.senderPublicKey,
                            }, keyPair);

                            if (decrypted) {
                                const parsed = JSON.parse(decrypted);
                                displaySubject = parsed.subject || '[Decrypted]';
                            }
                        } catch {
                            displaySubject = '[Encrypted]';
                        }
                    }

                    console.log(`${readMarker}${encryptedMarker}${msg.id.slice(0, 8)} | From: ${msg.sender} | ${displaySubject}`);
                    console.log(`   ${date}`);
                }

                console.log('\n💡 Use: mycmail read <id> to read a message');
            } catch (error) {
                console.error('❌ Failed to fetch inbox:', error);
                process.exit(1);
            }
        });
}
