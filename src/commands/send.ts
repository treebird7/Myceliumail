/**
 * send command - Send a message to another agent
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
        .description('Send a message to another agent')
        .argument('<recipient>', 'Recipient agent ID')
        .argument('<subject>', 'Message subject')
        .option('-m, --message <body>', 'Message body (or provide via stdin)')
        .option('-e, --encrypt', 'Encrypt the message')
        .action(async (recipient: string, subject: string, options) => {
            const config = loadConfig();
            const sender = config.agentId;

            if (sender === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                console.error('Set MYCELIUMAIL_AGENT_ID or configure ~/.myceliumail/config.json');
                process.exit(1);
            }

            const body = options.message || subject; // Use subject as body if no -m provided

            let messageOptions;

            if (options.encrypt) {
                // Check for our keypair
                const senderKeyPair = loadKeyPair(sender);
                if (!senderKeyPair) {
                    console.error('❌ No keypair found. Generate one first:');
                    console.error('  mycmail keygen');
                    process.exit(1);
                }

                // Check for recipient's public key
                const recipientPubKeyB64 = getKnownKey(recipient);
                if (!recipientPubKeyB64) {
                    console.error(`❌ No public key found for ${recipient}`);
                    console.error('Import their key first:');
                    console.error(`  mycmail key-import ${recipient} <their-public-key>`);
                    process.exit(1);
                }

                const recipientPubKey = decodePublicKey(recipientPubKeyB64);

                // Encrypt the message
                const payload = JSON.stringify({ subject, body });
                const encrypted = encryptMessage(payload, recipientPubKey, senderKeyPair);

                messageOptions = {
                    encrypted: true,
                    ciphertext: encrypted.ciphertext,
                    nonce: encrypted.nonce,
                    senderPublicKey: encrypted.senderPublicKey,
                };

                console.log('🔐 Message encrypted');
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
                if (options.encrypt) {
                    console.log('   🔐 Encrypted: Yes');
                }
            } catch (error) {
                console.error('❌ Failed to send message:', error);
                process.exit(1);
            }
        });
}
