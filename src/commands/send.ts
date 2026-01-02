/**
 * send command - Send a message to another agent
 * 
 * Messages are encrypted by default. Use --plaintext to send unencrypted.
 * Message body can be provided via -m flag, stdin pipe, or defaults to subject.
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

/**
 * Read from stdin if data is being piped
 */
async function readStdin(): Promise<string | null> {
    // Check if stdin is a TTY (interactive terminal) - if so, no piped data
    if (process.stdin.isTTY) {
        return null;
    }

    return new Promise((resolve) => {
        let data = '';
        let resolved = false;

        const cleanup = () => {
            if (!resolved) {
                resolved = true;
                process.stdin.removeAllListeners('data');
                process.stdin.removeAllListeners('end');
                process.stdin.pause();
            }
        };

        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => { data += chunk; });
        process.stdin.on('end', () => {
            cleanup();
            resolve(data.trim() || null);
        });

        // Timeout after 100ms if no data - cleanup listeners to prevent hanging
        setTimeout(() => {
            cleanup();
            resolve(data.trim() || null);
        }, 100);
    });
}

export function createSendCommand(): Command {
    return new Command('send')
        .description('Send a message to another agent (encrypted by default)')
        .argument('<recipient>', 'Recipient agent ID')
        .argument('<subject>', 'Message subject')
        .option('-m, --message <body>', 'Message body (or pipe via stdin)')
        .option('-p, --plaintext', 'Send unencrypted (not recommended)')
        .option('--no-hub', 'Skip Hub API, use Supabase directly')
        .option('-w, --wake', 'Wake the recipient agent after sending')
        .option('-t, --task <id>', 'Link message to a Task Torrenting micro-task')
        .action(async (recipient: string, subject: string, options) => {
            const config = loadConfig();
            const sender = config.agentId;
            const normalizedRecipient = recipient.toLowerCase();

            if (sender === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                console.error('Set MYCELIUMAIL_AGENT_ID or configure ~/.myceliumail/config.json');
                process.exit(1);
            }

            // Try to get body from: 1) -m option, 2) stdin pipe, 3) subject
            let body = options.message;
            if (!body) {
                const stdinData = await readStdin();
                body = stdinData || subject;
            }

            let messageOptions;
            let encrypted = false;

            // Encrypt by default unless --plaintext is specified
            if (!options.plaintext) {
                const senderKeyPair = loadKeyPair(sender);
                const recipientPubKeyB64 = getKnownKey(normalizedRecipient);

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
                        console.warn(`⚠️  No public key for ${normalizedRecipient}. Run: mycmail key-import ${normalizedRecipient} <key>`);
                    }
                    console.warn('   Sending as plaintext (use -p to suppress this warning)\n');
                }
            }

            try {
                // 🍄 TRY HUB API FIRST (local messaging)
                const hubUrl = process.env.HUB_URL || 'http://localhost:3000';
                let sentViaHub = false;

                if (!options.noHub) {
                    try {
                        const hubPayload: Record<string, string> = { sender, subject, body };
                        if (options.task) {
                            hubPayload.taskId = options.task;
                        }
                        const hubResponse = await fetch(`${hubUrl}/api/send/${normalizedRecipient}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(hubPayload),
                            signal: AbortSignal.timeout(2000) // 2s timeout
                        });

                        if (hubResponse.ok) {
                            const result = await hubResponse.json() as { id: string };
                            console.log(`\n✅ Message sent to ${normalizedRecipient}`);
                            console.log(`   ID: ${result.id}`);
                            console.log(`   Subject: ${subject}`);
                            if (options.task) console.log(`   📋 Task: ${options.task}`);
                            console.log(`   🌐 Via Hub API`);
                            sentViaHub = true;
                        }
                    } catch {
                        // Hub not available, fall through to Supabase
                    }
                }

                // FALLBACK: Supabase (encrypted)
                if (!sentViaHub) {
                    const message = await storage.sendMessage(
                        sender,
                        normalizedRecipient,
                        subject,
                        body,
                        messageOptions
                    );

                    console.log(`\n✅ Message sent to ${normalizedRecipient}`);
                    console.log(`   ID: ${message.id}`);
                    console.log(`   Subject: ${subject}`);
                    console.log(`   ${encrypted ? '🔐 Encrypted' : '📨 Plaintext'}`);
                }

                // 🔔 WAKE: Ping recipient's wake endpoint if --wake flag is set
                if (options.wake) {
                    try {
                        const wakeResponse = await fetch(`${hubUrl}/api/wake/${normalizedRecipient}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sender,
                                reason: `New message: ${subject}`
                            }),
                            signal: AbortSignal.timeout(3000) // 3s timeout
                        });

                        if (wakeResponse.ok) {
                            console.log(`   🔔 Wake signal sent to ${normalizedRecipient}`);
                        } else {
                            console.log(`   ⚠️  Wake failed (agent may be offline)`);
                        }
                    } catch {
                        // Silent fail - wake is best-effort
                        console.log(`   ⚠️  Hub unavailable for wake`);
                    }
                }
            } catch (error) {
                console.error('❌ Failed to send message:', error);
                process.exit(1);
            }
        });
}

