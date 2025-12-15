/**
 * read command - Read a specific message
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { loadKeyPair, decryptMessage } from '../lib/crypto.js';
import * as storage from '../storage/supabase.js';

export function createReadCommand(): Command {
    return new Command('read')
        .description('Read a specific message')
        .argument('<id>', 'Message ID (can be partial)')
        .action(async (messageId: string) => {
            const config = loadConfig();
            const agentId = config.agentId;

            try {
                // Get message - handle partial ID
                const message = await storage.getMessage(messageId);

                if (!message) {
                    // Try to find by partial ID
                    const inbox = await storage.getInbox(agentId, { limit: 100 });
                    const found = inbox.find(m => m.id.startsWith(messageId));

                    if (!found) {
                        console.error(`❌ Message not found: ${messageId}`);
                        process.exit(1);
                    }

                    return readAndDisplay(found, agentId);
                }

                await readAndDisplay(message, agentId);
            } catch (error) {
                console.error('❌ Failed to read message:', error);
                process.exit(1);
            }
        });
}

async function readAndDisplay(message: Awaited<ReturnType<typeof storage.getMessage>>, agentId: string): Promise<void> {
    if (!message) return;

    // Mark as read
    await storage.markAsRead(message.id);

    let subject = message.subject;
    let body = message.body;

    // Decrypt if encrypted
    if (message.encrypted && message.ciphertext && message.nonce && message.senderPublicKey) {
        const keyPair = loadKeyPair(agentId);

        if (!keyPair) {
            console.log('⚠️  Cannot decrypt: no keypair found');
            console.log('   Generate keypair with: mycmail keygen');
        } else {
            try {
                const decrypted = decryptMessage({
                    ciphertext: message.ciphertext,
                    nonce: message.nonce,
                    senderPublicKey: message.senderPublicKey,
                }, keyPair);

                if (decrypted) {
                    const parsed = JSON.parse(decrypted);
                    subject = parsed.subject || subject;
                    body = parsed.body || body;
                    console.log('🔓 Message decrypted\n');
                } else {
                    console.log('⚠️  Decryption failed\n');
                }
            } catch (e) {
                console.log('⚠️  Failed to parse decrypted message\n');
            }
        }
    }

    // Display message
    console.log('━'.repeat(60));
    console.log(`From:    ${message.sender}`);
    console.log(`To:      ${message.recipient}`);
    console.log(`Date:    ${message.createdAt.toLocaleString()}`);
    console.log(`Subject: ${subject}`);
    if (message.encrypted) {
        console.log(`🔐       Encrypted message`);
    }
    console.log('━'.repeat(60));
    console.log('');
    console.log(body);
    console.log('');
    console.log('━'.repeat(60));
    console.log(`ID: ${message.id}`);
    console.log('\n💡 Reply with: mycmail reply <id> "<message>"');
}
