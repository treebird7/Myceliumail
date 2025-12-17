/**
 * send command - Send a message to another agent
 * 
 * Messages are encrypted by default. Use --plaintext to send unencrypted.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import {
    loadKeyPair,
    getKnownKey,
    encryptMessage,
    decodePublicKey
} from '../lib/crypto.js';
import * as storage from '../storage/supabase.js';

export function createSendCommand(): Command {
    return new Command('send')
        .description('Send a message to another agent (encrypted by default)')
        .argument('<recipient>', 'Recipient agent ID')
        .argument('<subject>', 'Message subject')
        .option('-m, --message <body>', 'Message body (or provide via stdin)')
        .option('-p, --plaintext', 'Send unencrypted (not recommended)')
        .action(async (recipient: string, subject: string, options) => {
            const config = loadConfig();
            const sender = config.agentId;

            if (sender === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                console.error('Set MYCELIUMAIL_AGENT_ID or configure ~/.myceliumail/config.json');
                process.exit(1);
            }

            const body = options.message || subject;
            let messageOptions;
            let encrypted = false;

            // Encrypt by default unless --plaintext is specified
            if (!options.plaintext) {
                const senderKeyPair = loadKeyPair(sender);
                const recipientPubKeyB64 = getKnownKey(recipient);

                if (senderKeyPair && recipientPubKeyB64) {
                    try {
                        const recipientPubKey = decodePublicKey(recipientPubKeyB64);
                        const payload = JSON.stringify({ subject, body });
                        const encryptedData = encryptMessage(payload, recipientPubKey, senderKeyPair);

                        messageOptions = {
                            encrypted: true,
                            ciphertext: encryptedData.ciphertext,
                            nonce: encryptedData.nonce,
                            senderPublicKey: encryptedData.senderPublicKey,
                        };
                        encrypted = true;
                    } catch (err) {
                        console.warn('⚠️  Encryption failed, sending plaintext:', (err as Error).message);
                    }
                } else {
                    // Warn user but don't block
                    if (!senderKeyPair) {
                        console.warn('⚠️  No keypair found. Run: mycmail keygen');
                    }
                    if (!recipientPubKeyB64) {
                        console.warn(`⚠️  No public key for ${recipient}. Run: mycmail key-import ${recipient} <key>`);
                    }
                    console.warn('   Sending as plaintext (use -p to suppress this warning)\n');
                }
            }

            try {
                const message = await storage.sendMessage(
                    sender,
                    recipient,
                    subject,
                    body,
                    messageOptions
                );

                console.log(`\n✅ Message sent to ${recipient}`);
                console.log(`   ID: ${message.id}`);
                console.log(`   Subject: ${subject}`);
                console.log(`   ${encrypted ? '🔐 Encrypted' : '📨 Plaintext'}`);
            } catch (error) {
                console.error('❌ Failed to send message:', error);
                process.exit(1);
            }
        });
}
