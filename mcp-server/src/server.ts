#!/usr/bin/env node

/**
 * Myceliumail MCP Server
 * 
 * Exposes Myceliumail messaging as MCP tools for Claude Desktop
 * and other MCP-compatible clients.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import * as crypto from './lib/crypto.js';
import * as storage from './lib/storage.js';
import { getAgentId } from './lib/config.js';
import { requireProLicense } from './lib/license.js';

// Track last check time for new message notifications
let lastCheckTime: Date = new Date();

// Create the MCP server
const server = new McpServer({
    name: 'myceliumail',
    version: '1.0.0',
});

// Tool: check_inbox
server.tool(
    'check_inbox',
    'Check your Myceliumail inbox for messages',
    {
        unread_only: z.boolean().optional().describe('Only show unread messages'),
        limit: z.number().optional().describe('Maximum number of messages to return'),
    },
    async ({ unread_only, limit }) => {
        const agentId = getAgentId();
        const messages = await storage.getInbox(agentId, {
            unreadOnly: unread_only,
            limit: limit || 10,
        });

        if (messages.length === 0) {
            return {
                content: [{ type: 'text', text: '📭 No messages in inbox' }],
            };
        }

        const formatted = messages.map(msg => {
            const status = msg.read ? '  ' : '● ';
            const encrypted = msg.encrypted ? '🔐 ' : '';
            return `${status}${encrypted}[${msg.id.slice(0, 8)}] From: ${msg.sender} | ${msg.subject || '(no subject)'} | ${msg.createdAt.toLocaleString()}`;
        }).join('\n');

        return {
            content: [{
                type: 'text',
                text: `📬 Inbox (${messages.length} messages):\n\n${formatted}`
            }],
        };
    }
);

// Tool: check_new_messages - Notification-style check for new messages since last check
server.tool(
    'check_new_messages',
    'Check for new messages since your last check (like notifications). Call this periodically to see if you have new mail.',
    {},
    async () => {
        const agentId = getAgentId();
        const messages = await storage.getInbox(agentId, { limit: 50 });

        // Filter for messages newer than last check
        const newMessages = messages.filter(msg => msg.createdAt > lastCheckTime);

        // Update last check time
        lastCheckTime = new Date();

        if (newMessages.length === 0) {
            return {
                content: [{ type: 'text', text: '✅ No new messages since last check.' }],
            };
        }

        const formatted = newMessages.map(msg => {
            const encrypted = msg.encrypted ? '🔐 ' : '';
            const preview = msg.body ? msg.body.substring(0, 50) + (msg.body.length > 50 ? '...' : '') : '';
            return `📬 NEW: ${encrypted}From ${msg.sender}\n   Subject: ${msg.subject || '(no subject)'}\n   Preview: ${preview}\n   ID: ${msg.id.slice(0, 8)}`;
        }).join('\n\n');

        return {
            content: [{
                type: 'text',
                text: `🔔 ${newMessages.length} new message(s)!\n\n${formatted}\n\n💡 Use read_message to view full content.`
            }],
        };
    }
);

// Tool: read_message
server.tool(
    'read_message',
    'Read a specific message by ID',
    {
        message_id: z.string().describe('Message ID (can be partial)'),
    },
    async ({ message_id }) => {
        const agentId = getAgentId();
        let message = await storage.getMessage(message_id);

        // Try partial ID match
        if (!message) {
            const inbox = await storage.getInbox(agentId, { limit: 100 });
            message = inbox.find(m => m.id.startsWith(message_id)) || null;
        }

        if (!message) {
            return {
                content: [{ type: 'text', text: `❌ Message not found: ${message_id}` }],
            };
        }

        // Mark as read
        await storage.markAsRead(message.id);

        // Decrypt if needed
        let subject = message.subject;
        let body = message.body;

        if (message.encrypted && message.ciphertext && message.nonce && message.senderPublicKey) {
            const keyPair = crypto.loadKeyPair(agentId);
            if (keyPair) {
                try {
                    const decrypted = crypto.decryptMessage({
                        ciphertext: message.ciphertext,
                        nonce: message.nonce,
                        senderPublicKey: message.senderPublicKey,
                    }, keyPair);
                    if (decrypted) {
                        const parsed = JSON.parse(decrypted);
                        subject = parsed.subject || subject;
                        body = parsed.body || body;
                    }
                } catch {
                    body = '[Failed to decrypt]';
                }
            } else {
                body = '[Cannot decrypt - no keypair]';
            }
        }

        const encrypted = message.encrypted ? '\n🔐 Encrypted: Yes' : '';
        const text = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From:    ${message.sender}
To:      ${message.recipient}
Date:    ${message.createdAt.toLocaleString()}
Subject: ${subject}${encrypted}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${body}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: ${message.id}`;

        return {
            content: [{ type: 'text', text }],
        };
    }
);

// Tool: send_message
server.tool(
    'send_message',
    'Send a message to another agent',
    {
        recipient: z.string().describe('Recipient agent ID'),
        subject: z.string().describe('Message subject'),
        body: z.string().describe('Message body'),
        encrypt: z.boolean().optional().describe('Encrypt the message (requires key exchange)'),
    },
    async ({ recipient, subject, body, encrypt }) => {
        const sender = getAgentId();

        if (sender === 'anonymous') {
            return {
                content: [{ type: 'text', text: '❌ Agent ID not configured. Set MYCELIUMAIL_AGENT_ID environment variable.' }],
            };
        }

        let messageOptions;

        if (encrypt) {
            const senderKeyPair = crypto.loadKeyPair(sender);
            if (!senderKeyPair) {
                return {
                    content: [{ type: 'text', text: '❌ No keypair found. Use generate_keys first.' }],
                };
            }

            const recipientPubKeyB64 = crypto.getKnownKey(recipient);
            if (!recipientPubKeyB64) {
                return {
                    content: [{ type: 'text', text: `❌ No public key found for ${recipient}. Use import_key first.` }],
                };
            }

            const recipientPubKey = crypto.decodePublicKey(recipientPubKeyB64);
            const payload = JSON.stringify({ subject, body });
            const encrypted = crypto.encryptMessage(payload, recipientPubKey, senderKeyPair);

            messageOptions = {
                encrypted: true,
                ciphertext: encrypted.ciphertext,
                nonce: encrypted.nonce,
                senderPublicKey: encrypted.senderPublicKey,
            };
        }

        try {
            const message = await storage.sendMessage(sender, recipient, subject, body, messageOptions);
            const encInfo = encrypt ? ' (🔐 encrypted)' : '';
            return {
                content: [{
                    type: 'text',
                    text: `✅ Message sent to ${recipient}${encInfo}\nID: ${message.id}`
                }],
            };
        } catch (error) {
            return {
                content: [{ type: 'text', text: `❌ Failed to send: ${error}` }],
            };
        }
    }
);

// Tool: reply_message
server.tool(
    'reply_message',
    'Reply to a message',
    {
        message_id: z.string().describe('ID of message to reply to'),
        body: z.string().describe('Reply message body'),
        encrypt: z.boolean().optional().describe('Encrypt the reply'),
    },
    async ({ message_id, body, encrypt }) => {
        const agentId = getAgentId();

        // Find original message
        let original = await storage.getMessage(message_id);
        if (!original) {
            const inbox = await storage.getInbox(agentId, { limit: 100 });
            original = inbox.find(m => m.id.startsWith(message_id)) || null;
        }

        if (!original) {
            return {
                content: [{ type: 'text', text: `❌ Message not found: ${message_id}` }],
            };
        }

        // Send reply to original sender
        const subject = original.subject.startsWith('Re: ')
            ? original.subject
            : `Re: ${original.subject}`;

        let messageOptions;
        if (encrypt) {
            const senderKeyPair = crypto.loadKeyPair(agentId);
            const recipientPubKeyB64 = crypto.getKnownKey(original.sender);

            if (senderKeyPair && recipientPubKeyB64) {
                const recipientPubKey = crypto.decodePublicKey(recipientPubKeyB64);
                const payload = JSON.stringify({ subject, body });
                const encrypted = crypto.encryptMessage(payload, recipientPubKey, senderKeyPair);
                messageOptions = {
                    encrypted: true,
                    ciphertext: encrypted.ciphertext,
                    nonce: encrypted.nonce,
                    senderPublicKey: encrypted.senderPublicKey,
                };
            }
        }

        const message = await storage.sendMessage(agentId, original.sender, subject, body, messageOptions);
        const encInfo = encrypt && messageOptions ? ' (🔐 encrypted)' : '';

        return {
            content: [{
                type: 'text',
                text: `✅ Reply sent to ${original.sender}${encInfo}\nID: ${message.id}`
            }],
        };
    }
);

// Tool: generate_keys
server.tool(
    'generate_keys',
    'Generate encryption keypair for this agent',
    {
        force: z.boolean().optional().describe('Overwrite existing keypair'),
    },
    async ({ force }) => {
        const agentId = getAgentId();

        if (crypto.hasKeyPair(agentId) && !force) {
            const existing = crypto.loadKeyPair(agentId);
            if (existing) {
                const pubKey = crypto.getPublicKeyBase64(existing);
                return {
                    content: [{
                        type: 'text',
                        text: `⚠️ Keypair already exists for ${agentId}\n\n📧 Your public key:\n${pubKey}\n\nUse force=true to regenerate.`
                    }],
                };
            }
        }

        const keyPair = crypto.generateKeyPair();
        crypto.saveKeyPair(agentId, keyPair);
        const publicKey = crypto.getPublicKeyBase64(keyPair);

        return {
            content: [{
                type: 'text',
                text: `🔐 Keypair generated for ${agentId}\n\n📧 Your public key (share with other agents):\n${publicKey}`
            }],
        };
    }
);

// Tool: list_keys
server.tool(
    'list_keys',
    'List all known encryption keys',
    {},
    async () => {
        const agentId = getAgentId();
        const ownKeys = crypto.listOwnKeys();
        const knownKeys = crypto.loadKnownKeys();

        let output = '🔐 Encryption Keys\n\n── Your Keys ──\n';

        if (ownKeys.length === 0) {
            output += 'No keypairs. Use generate_keys to create one.\n';
        } else {
            for (const id of ownKeys) {
                const kp = crypto.loadKeyPair(id);
                if (kp) {
                    const marker = id === agentId ? ' (active)' : '';
                    output += `${id}${marker}: ${crypto.getPublicKeyBase64(kp).slice(0, 20)}...\n`;
                }
            }
        }

        output += '\n── Peer Keys ──\n';
        const peers = Object.entries(knownKeys);
        if (peers.length === 0) {
            output += 'No peer keys. Use import_key to add one.\n';
        } else {
            for (const [id, key] of peers) {
                output += `${id}: ${key.slice(0, 20)}...\n`;
            }
        }

        return {
            content: [{ type: 'text', text: output }],
        };
    }
);

// Tool: import_key
server.tool(
    'import_key',
    "Import another agent's public key for encrypted messaging",
    {
        agent_id: z.string().describe('Agent ID to import key for'),
        public_key: z.string().describe('Base64 encoded public key'),
    },
    async ({ agent_id, public_key }) => {
        if (public_key.length < 40) {
            return {
                content: [{ type: 'text', text: '❌ Invalid key format. Expected base64 NaCl public key.' }],
            };
        }

        crypto.saveKnownKey(agent_id, public_key);

        return {
            content: [{
                type: 'text',
                text: `✅ Imported public key for ${agent_id}\n\n🔐 You can now send encrypted messages to this agent.`
            }],
        };
    }
);

// Tool: get_full_key
server.tool(
    'get_full_key',
    'Get the full (untruncated) public key for an agent from the registry',
    {
        agent_id: z.string().describe('Agent ID to get key for'),
    },
    async ({ agent_id }) => {
        // Query Supabase for full key
        const key = await storage.getAgentKey(agent_id);

        if (!key) {
            // Try local keys as fallback
            const localKey = crypto.getKnownKey(agent_id);
            if (localKey) {
                return {
                    content: [{
                        type: 'text',
                        text: `🔑 Full public key for ${agent_id} (from local):

${localKey}

Algorithm: x25519

💡 Key found in local storage.`
                    }],
                };
            }

            return {
                content: [{
                    type: 'text',
                    text: `❌ No public key found for ${agent_id} in registry or local storage`
                }],
            };
        }

        return {
            content: [{
                type: 'text',
                text: `🔑 Full public key for ${agent_id}:

${key.public_key}

Algorithm: ${key.algorithm || 'x25519'}

💡 To import: Use import_key with this full key.`
            }],
        };
    }
);

// Tool: archive_message
server.tool(
    'archive_message',
    'Archive a message (remove from inbox)',
    {
        message_id: z.string().describe('Message ID to archive'),
    },
    async ({ message_id }) => {
        const success = await storage.archiveMessage(message_id);

        if (success) {
            return {
                content: [{ type: 'text', text: `✅ Message archived: ${message_id}` }],
            };
        } else {
            return {
                content: [{ type: 'text', text: `❌ Message not found: ${message_id}` }],
            };
        }
    }
);

// Tool: sign_message
server.tool(
    'sign_message',
    'Sign a message with your Ed25519 signing key (for identity verification)',
    {
        message: z.string().describe('Message to sign'),
    },
    async ({ message }) => {
        const agentId = getAgentId();

        if (agentId === 'anonymous') {
            return {
                content: [{ type: 'text', text: '❌ Agent ID not configured. Set MYCELIUMAIL_AGENT_ID environment variable.' }],
            };
        }

        const signingKeyPair = crypto.loadSigningKeyPair(agentId);
        if (!signingKeyPair) {
            return {
                content: [{ type: 'text', text: '❌ No signing keypair found. Use generate_signing_keys first.' }],
            };
        }

        const signature = crypto.signMessage(message, signingKeyPair);

        return {
            content: [{
                type: 'text',
                text: `✍️ Message signed by ${agentId}

📝 Message: ${message.length > 100 ? message.substring(0, 100) + '...' : message}

🔏 Signature:
${signature}

💡 Share both the message and signature for verification.`
            }],
        };
    }
);

// Tool: verify_signature
server.tool(
    'verify_signature',
    'Verify a signed message from another agent',
    {
        message: z.string().describe('The original message'),
        signature: z.string().describe('Base64 signature to verify'),
        agent_id: z.string().describe('Agent ID who signed the message'),
    },
    async ({ message, signature, agent_id }) => {
        // First try known signing keys
        let publicKey = crypto.getKnownSigningKey(agent_id);

        // Fall back to encryption public key if no signing key
        if (!publicKey) {
            publicKey = crypto.getKnownKey(agent_id);
        }

        if (!publicKey) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ No public key found for ${agent_id}. Use import_key first or ask them to announce_key.`
                }],
            };
        }

        const isValid = crypto.verifySignature(message, signature, publicKey);

        if (isValid) {
            return {
                content: [{
                    type: 'text',
                    text: `✅ VERIFIED: This message was signed by ${agent_id}

📝 Message: ${message.length > 100 ? message.substring(0, 100) + '...' : message}

🔏 Signature is VALID.`
                }],
            };
        } else {
            return {
                content: [{
                    type: 'text',
                    text: `❌ INVALID SIGNATURE

⚠️ This message was NOT signed by ${agent_id} (or was tampered with).

Do not trust unverified messages claiming to be from this agent.`
                }],
            };
        }
    }
);

// Tool: generate_signing_keys
server.tool(
    'generate_signing_keys',
    'Generate Ed25519 signing keypair for identity verification (separate from encryption keys)',
    {
        force: z.boolean().optional().describe('Overwrite existing keypair'),
    },
    async ({ force }) => {
        const agentId = getAgentId();

        if (crypto.hasSigningKeyPair(agentId) && !force) {
            const existing = crypto.loadSigningKeyPair(agentId);
            if (existing) {
                const pubKey = crypto.getSigningPublicKeyBase64(existing);
                return {
                    content: [{
                        type: 'text',
                        text: `⚠️ Signing keypair already exists for ${agentId}

📧 Your signing public key:
${pubKey}

Use force=true to regenerate (will invalidate existing signatures!).`
                    }],
                };
            }
        }

        const keyPair = crypto.generateSigningKeyPair();
        crypto.saveSigningKeyPair(agentId, keyPair);
        const publicKey = crypto.getSigningPublicKeyBase64(keyPair);

        return {
            content: [{
                type: 'text',
                text: `🔐 Signing keypair generated for ${agentId}

📧 Your signing public key (share with other agents):
${publicKey}

Use sign_message to sign messages. Others can use verify_signature to verify.`
            }],
        };
    }
);

// Tool: broadcast_message
server.tool(
    'broadcast_message',
    'Send a message to all known agents (fleet-wide announcement)',
    {
        subject: z.string().describe('Message subject'),
        body: z.string().describe('Message body'),
    },
    async ({ subject, body }) => {
        const sender = getAgentId();

        if (sender === 'anonymous') {
            return {
                content: [{ type: 'text', text: '❌ Agent ID not configured. Set MYCELIUMAIL_AGENT_ID environment variable.' }],
            };
        }

        // Get all known agents from peer keys
        const knownKeys = crypto.loadKnownKeys();
        const recipients = Object.keys(knownKeys).filter(id => id !== sender);

        if (recipients.length === 0) {
            return {
                content: [{ type: 'text', text: '❌ No known agents to broadcast to. Import some keys first.' }],
            };
        }

        const results: string[] = [];
        let successCount = 0;

        for (const recipient of recipients) {
            try {
                await storage.sendMessage(sender, recipient, `[BROADCAST] ${subject}`, body);
                results.push(`✅ ${recipient}`);
                successCount++;
            } catch (error) {
                results.push(`❌ ${recipient}: ${error}`);
            }
        }

        return {
            content: [{
                type: 'text',
                text: `📢 Broadcast sent to ${successCount}/${recipients.length} agents

${results.join('\n')}`
            }],
        };
    }
);

// Tool: announce_key
server.tool(
    'announce_key',
    'Announce your public key to all known agents (for key exchange)',
    {},
    async () => {
        const agentId = getAgentId();

        if (agentId === 'anonymous') {
            return {
                content: [{ type: 'text', text: '❌ Agent ID not configured. Set MYCELIUMAIL_AGENT_ID environment variable.' }],
            };
        }

        // Get encryption key
        const encKeyPair = crypto.loadKeyPair(agentId);
        if (!encKeyPair) {
            return {
                content: [{ type: 'text', text: '❌ No encryption keypair found. Use generate_keys first.' }],
            };
        }

        const encPubKey = crypto.getPublicKeyBase64(encKeyPair);

        // Get signing key if available
        const signKeyPair = crypto.loadSigningKeyPair(agentId);
        const signPubKey = signKeyPair ? crypto.getSigningPublicKeyBase64(signKeyPair) : null;

        // Build announcement
        let keyInfo = `🔑 ENCRYPTION KEY:\n${encPubKey}`;
        if (signPubKey) {
            keyInfo += `\n\n✍️ SIGNING KEY:\n${signPubKey}`;
        }

        const body = `${agentId} is announcing their public keys.

${keyInfo}

To import: Use import_key with agent_id="${agentId}" and the key above.`;

        // Get all known agents
        const knownKeys = crypto.loadKnownKeys();
        const recipients = Object.keys(knownKeys).filter(id => id !== agentId);

        if (recipients.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `📧 No known agents to announce to. Here's your public key to share manually:

${keyInfo}`
                }],
            };
        }

        let successCount = 0;
        for (const recipient of recipients) {
            try {
                await storage.sendMessage(agentId, recipient, `🔑 KEY ANNOUNCEMENT from ${agentId}`, body);
                successCount++;
            } catch {
                // Continue on failure
            }
        }

        return {
            content: [{
                type: 'text',
                text: `📢 Key announced to ${successCount}/${recipients.length} agents

${keyInfo}`
            }],
        };
    }
);

// Tool: canary_init
server.tool(
    'canary_init',
    'Initialize a canary token (secret phrase) for lightweight identity verification',
    {
        phrase: z.string().optional().describe('Custom phrase (auto-generated if not provided)'),
        force: z.boolean().optional().describe('Overwrite existing canary token'),
    },
    async ({ phrase, force }) => {
        const { existsSync, mkdirSync, writeFileSync } = await import('fs');
        const { join } = await import('path');
        const { homedir } = await import('os');
        const nodeCrypto = await import('crypto');

        const MYCELIUM_DIR = join(homedir(), '.myceliumail');
        const CANARY_FILE = join(MYCELIUM_DIR, 'canary.txt');

        // Ensure directory exists
        if (!existsSync(MYCELIUM_DIR)) {
            mkdirSync(MYCELIUM_DIR, { recursive: true });
        }

        // Check for existing canary
        if (existsSync(CANARY_FILE) && !force) {
            return {
                content: [{
                    type: 'text',
                    text: '⚠️ Canary token already exists!\n\nUse force=true to regenerate.\n\n💡 To view your canary, run: cat ~/.myceliumail/canary.txt'
                }],
            };
        }

        // Generate or use provided phrase
        let canaryPhrase = phrase;
        if (!canaryPhrase) {
            const animals = ['fox', 'owl', 'wolf', 'bear', 'hawk', 'deer', 'crow', 'hare', 'lynx', 'seal'];
            const colors = ['red', 'blue', 'gold', 'jade', 'opal', 'rust', 'sage', 'rose', 'gray', 'onyx'];
            const actions = ['runs', 'leaps', 'soars', 'hunts', 'waits', 'hides', 'sings', 'rests', 'roams', 'flies'];
            const pick = (arr: string[]) => arr[nodeCrypto.randomInt(arr.length)];
            const num = nodeCrypto.randomInt(10, 100);
            canaryPhrase = `${pick(colors)}-${pick(animals)}-${pick(actions)}-${num}`;
        }

        // Save canary file
        writeFileSync(CANARY_FILE, canaryPhrase + '\n', { mode: 0o600 });

        return {
            content: [{
                type: 'text',
                text: `🐤 Canary token initialized!

Your secret canary phrase is:

  🔐 ${canaryPhrase}

This phrase proves you are the real owner of this environment.
Keep it secret! Only share when an agent asks for verification.

💡 If an agent asks "what's your canary phrase?", answer with this phrase.`
            }],
        };
    }
);

// Tool: canary_check
server.tool(
    'canary_check',
    'Verify if a canary phrase matches (for identity verification)',
    {
        phrase: z.string().describe('The phrase to check'),
    },
    async ({ phrase }) => {
        const { existsSync, readFileSync } = await import('fs');
        const { join } = await import('path');
        const { homedir } = await import('os');

        const CANARY_FILE = join(homedir(), '.myceliumail', 'canary.txt');

        if (!existsSync(CANARY_FILE)) {
            return {
                content: [{
                    type: 'text',
                    text: '❌ No canary token found.\n\nThe user should run canary_init first.'
                }],
            };
        }

        const storedPhrase = readFileSync(CANARY_FILE, 'utf-8').trim();
        const matches = phrase.trim() === storedPhrase;

        if (matches) {
            return {
                content: [{
                    type: 'text',
                    text: '✅ Canary phrase MATCHES!\n\nIdentity verified - this is the real owner.'
                }],
            };
        } else {
            return {
                content: [{
                    type: 'text',
                    text: '❌ Canary phrase does NOT match.\n\n⚠️ This may not be the real owner. Proceed with caution.'
                }],
            };
        }
    }
);

// Tool: connection_status
server.tool(
    'connection_status',
    'Check Myceliumail connection and configuration status',
    {},
    async () => {
        const agentId = getAgentId();
        const hasEncKeys = crypto.hasKeyPair(agentId);
        const hasSignKeys = crypto.hasSigningKeyPair(agentId);
        const knownPeers = Object.keys(crypto.loadKnownKeys()).length;

        // Try to fetch from storage to check connection
        let storageStatus = '❓ Unknown';
        try {
            await storage.getInbox(agentId, { limit: 1 });
            storageStatus = '✅ Connected';
        } catch (e) {
            storageStatus = `❌ Error: ${e}`;
        }

        return {
            content: [{
                type: 'text',
                text: `📊 Myceliumail Status

🆔 Agent ID: ${agentId}
💾 Storage: ${storageStatus}
🔑 Encryption Keys: ${hasEncKeys ? '✅ Yes' : '❌ No'}
✍️ Signing Keys: ${hasSignKeys ? '✅ Yes' : '❌ No'}
👥 Known Peers: ${knownPeers}

${agentId === 'anonymous' ? '⚠️ Set MYCELIUMAIL_AGENT_ID to configure your identity.' : ''}`
            }],
        };
    }
);

// Tool: unread_count
server.tool(
    'unread_count',
    'Get the count of unread messages in inbox',
    {},
    async () => {
        const agentId = getAgentId();
        const messages = await storage.getInbox(agentId, { unreadOnly: true, limit: 100 });

        return {
            content: [{
                type: 'text',
                text: messages.length === 0
                    ? '📭 0 unread messages'
                    : `📬 ${messages.length} unread message(s)`
            }],
        };
    }
);

// Tool: search_messages
server.tool(
    'search_messages',
    'Search messages by sender, subject, or content',
    {
        query: z.string().describe('Search term to find in sender, subject, or body'),
        limit: z.number().optional().describe('Maximum results (default 10)'),
    },
    async ({ query, limit }) => {
        const agentId = getAgentId();
        const allMessages = await storage.getInbox(agentId, { limit: 100 });

        const searchLower = query.toLowerCase();
        const matches = allMessages.filter(msg =>
            msg.sender.toLowerCase().includes(searchLower) ||
            (msg.subject && msg.subject.toLowerCase().includes(searchLower)) ||
            (msg.body && msg.body.toLowerCase().includes(searchLower))
        ).slice(0, limit || 10);

        if (matches.length === 0) {
            return {
                content: [{ type: 'text', text: `🔍 No messages found matching "${query}"` }],
            };
        }

        const formatted = matches.map(msg => {
            const status = msg.read ? '  ' : '● ';
            const encrypted = msg.encrypted ? '🔐 ' : '';
            return `${status}${encrypted}[${msg.id.slice(0, 8)}] From: ${msg.sender} | ${msg.subject || '(no subject)'}`;
        }).join('\n');

        return {
            content: [{
                type: 'text',
                text: `🔍 Found ${matches.length} message(s) matching "${query}":\n\n${formatted}`
            }],
        };
    }
);

// ============================================
// MCP Resources - Expose inbox as context
// ============================================

server.resource(
    'inbox',
    'myceliumail://inbox',
    async () => {
        const agentId = getAgentId();
        const messages = await storage.getInbox(agentId, { limit: 20 });

        const formatted = messages.map(msg => {
            const status = msg.read ? '[READ]' : '[UNREAD]';
            const encrypted = msg.encrypted ? '[ENCRYPTED]' : '';
            return `${status}${encrypted} ID:${msg.id.slice(0, 8)} | From:${msg.sender} | Subject:${msg.subject || '(no subject)'} | Date:${msg.createdAt.toISOString()}`;
        }).join('\n');

        return {
            contents: [{
                uri: 'myceliumail://inbox',
                text: `Myceliumail Inbox for ${agentId}\n${'='.repeat(40)}\n\n${formatted || 'No messages'}\n\nTotal: ${messages.length} messages`,
                mimeType: 'text/plain',
            }],
        };
    }
);

server.resource(
    'unread',
    'myceliumail://unread',
    async () => {
        const agentId = getAgentId();
        const messages = await storage.getInbox(agentId, { unreadOnly: true, limit: 50 });

        const formatted = messages.map(msg => {
            const encrypted = msg.encrypted ? '[ENCRYPTED]' : '';
            const preview = msg.body ? msg.body.substring(0, 100) + (msg.body.length > 100 ? '...' : '') : '';
            return `● ${encrypted} ID:${msg.id.slice(0, 8)}
  From: ${msg.sender}
  Subject: ${msg.subject || '(no subject)'}
  Preview: ${preview}
  Date: ${msg.createdAt.toISOString()}`;
        }).join('\n\n');

        return {
            contents: [{
                uri: 'myceliumail://unread',
                text: `Unread Messages for ${agentId}\n${'='.repeat(40)}\n\n${formatted || 'No unread messages'}\n\nTotal unread: ${messages.length}`,
                mimeType: 'text/plain',
            }],
        };
    }
);

server.resource(
    'keys',
    'myceliumail://keys',
    async () => {
        const agentId = getAgentId();
        const ownKeys = crypto.listOwnKeys();
        const knownKeys = crypto.loadKnownKeys();

        let output = `Encryption Keys for ${agentId}\n${'='.repeat(40)}\n\n`;
        output += '── Your Keys ──\n';

        if (ownKeys.length === 0) {
            output += 'No keypairs. Use generate_keys to create one.\n';
        } else {
            for (const id of ownKeys) {
                const kp = crypto.loadKeyPair(id);
                if (kp) {
                    const marker = id === agentId ? ' (active)' : '';
                    output += `${id}${marker}: ${crypto.getPublicKeyBase64(kp).slice(0, 30)}...\n`;
                }
            }
        }

        output += '\n── Known Peer Keys ──\n';
        const peers = Object.entries(knownKeys);
        if (peers.length === 0) {
            output += 'No peer keys. Use import_key to add one.\n';
        } else {
            for (const [id, key] of peers) {
                output += `${id}: ${key.slice(0, 30)}...\n`;
            }
        }

        return {
            contents: [{
                uri: 'myceliumail://keys',
                text: output,
                mimeType: 'text/plain',
            }],
        };
    }
);

// ============================================
// Collaboration Tools
// ============================================

// Tool: collab_join
server.tool(
    'collab_join',
    'Join a collaboration document by adding your agent section',
    {
        filepath: z.string().describe('Path to the collaboration markdown file'),
        message: z.string().optional().describe('Custom message to add (uses default if not provided)'),
    },
    async ({ filepath, message }) => {
        const { existsSync, readFileSync, writeFileSync } = await import('fs');
        const { basename } = await import('path');

        const agentId = getAgentId();
        const agentName = 'Myceliumail';

        if (!existsSync(filepath)) {
            return {
                content: [{ type: 'text', text: `❌ Collab file not found: ${filepath}` }],
            };
        }

        let content = readFileSync(filepath, 'utf-8');

        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

        const defaultMessage = `${agentName} joining the discussion!

As the communication backbone, here's my perspective:

**Key points:**
- Ready to facilitate message exchange between agents
- Can provide encryption/decryption support for sensitive discussions
- Monitoring network health for all participants

Looking forward to contributing!`;

        const msgToAdd = message || defaultMessage;

        // Find the placeholder section and add our response before it
        const placeholder = '### [Agent responses will appear here]';
        const agentSection = `### ${agentName} (${agentId}) - ${date} ${timestamp}
${msgToAdd}

---

${placeholder}`;

        if (content.includes(placeholder)) {
            content = content.replace(placeholder, agentSection);
        } else {
            // Append at the end if no placeholder found
            content += `\n\n---\n\n### ${agentName} (${agentId}) - ${date} ${timestamp}\n${msgToAdd}\n`;
        }

        // Update the participant checkbox if present
        const patterns = [
            new RegExp(`- \\[ \\] \\*\\*${agentName}\\*\\* - Awaiting response`),
            new RegExp(`- \\[ \\] \\*\\*${agentId}\\*\\* - Awaiting response`),
            new RegExp(`- \\[ \\] \\*\\*mycm\\*\\* - Awaiting response`),
        ];

        for (const pattern of patterns) {
            content = content.replace(pattern, `- [x] **${agentName}** - Joined`);
        }

        writeFileSync(filepath, content);

        // Notify birdsan
        try {
            await storage.sendMessage(agentId, 'bsan', 'Joined collab', `${agentName} has joined: ${basename(filepath)}`);
        } catch {
            // Ignore notification errors
        }

        return {
            content: [{
                type: 'text',
                text: `🤝 Joined Collaboration!

📄 File: ${basename(filepath)}
👤 Agent: ${agentName} (${agentId})
📝 Added response to document
✉️ Notified birdsan`
            }],
        };
    }
);

// Tool: collab_read
server.tool(
    'collab_read',
    'Read a collaboration document',
    {
        filepath: z.string().describe('Path to the collab markdown file'),
    },
    async ({ filepath }) => {
        const { existsSync, readFileSync } = await import('fs');
        const { basename } = await import('path');

        if (!existsSync(filepath)) {
            return {
                content: [{ type: 'text', text: `❌ Collab file not found: ${filepath}` }],
            };
        }

        const content = readFileSync(filepath, 'utf-8');

        // Truncate if too long
        const maxLength = 8000;
        const truncated = content.length > maxLength
            ? content.substring(0, maxLength) + '\n\n... [truncated, file is ' + content.length + ' characters]'
            : content;

        return {
            content: [{
                type: 'text',
                text: `📄 Collab: ${basename(filepath)}\n${'='.repeat(40)}\n\n${truncated}`
            }],
        };
    }
);

// Tool: collab_add_comment
server.tool(
    'collab_add_comment',
    'Add a timestamped comment to a collaboration document',
    {
        filepath: z.string().describe('Path to the collab markdown file'),
        comment: z.string().describe('Comment to add'),
    },
    async ({ filepath, comment }) => {
        const { existsSync, readFileSync, writeFileSync } = await import('fs');
        const { basename } = await import('path');

        const agentId = getAgentId();

        if (!existsSync(filepath)) {
            return {
                content: [{ type: 'text', text: `❌ Collab file not found: ${filepath}` }],
            };
        }

        let content = readFileSync(filepath, 'utf-8');

        const now = new Date();
        const timestamp = now.toISOString();

        // Add as HTML comment for non-intrusive logging
        const htmlComment = `<!-- [${agentId}] ${timestamp} -->\n<!-- ${comment.replace(/--/g, '—')} -->\n`;

        // Append at the end
        content += `\n${htmlComment}`;

        writeFileSync(filepath, content);

        return {
            content: [{
                type: 'text',
                text: `💬 Comment added to ${basename(filepath)}\n\n📝 "${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}"`
            }],
        };
    }
);

// ============================================
// Utility Tools
// ============================================

// Tool: list_agents
server.tool(
    'list_agents',
    'List all known agents from the key registry',
    {},
    async () => {
        const agentId = getAgentId();
        const knownKeys = crypto.loadKnownKeys();
        const knownSigningKeys = crypto.loadKnownSigningKeys();

        const allAgents = new Set([
            ...Object.keys(knownKeys),
            ...Object.keys(knownSigningKeys),
        ]);

        if (allAgents.size === 0) {
            return {
                content: [{
                    type: 'text',
                    text: '👥 No known agents yet.\n\nUse import_key to add agent public keys.'
                }],
            };
        }

        const agentList = Array.from(allAgents).map(id => {
            const hasEncKey = !!knownKeys[id];
            const hasSignKey = !!knownSigningKeys[id];
            const markers = [];
            if (hasEncKey) markers.push('🔐 enc');
            if (hasSignKey) markers.push('✍️ sign');
            return `• ${id} [${markers.join(', ')}]`;
        }).join('\n');

        return {
            content: [{
                type: 'text',
                text: `👥 Known Agents (${allAgents.size})\n${'─'.repeat(30)}\n\n${agentList}\n\n💡 Your ID: ${agentId}`
            }],
        };
    }
);

// Tool: thread_view
server.tool(
    'thread_view',
    'View conversation thread with a specific agent',
    {
        agent_id: z.string().describe('Agent ID to view thread with'),
        limit: z.number().optional().describe('Maximum messages to show (default 20)'),
    },
    async ({ agent_id, limit }) => {
        const myId = getAgentId();
        const allMessages = await storage.getInbox(myId, { limit: 100 });

        // Filter for messages to/from this agent
        const thread = allMessages.filter(msg =>
            msg.sender === agent_id || msg.recipient === agent_id
        ).slice(0, limit || 20);

        if (thread.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `📭 No messages found with ${agent_id}`
                }],
            };
        }

        const formatted = thread.map(msg => {
            const direction = msg.sender === myId ? '→ TO' : '← FROM';
            const encrypted = msg.encrypted ? '🔐' : '';
            const preview = msg.body ? msg.body.substring(0, 80) + (msg.body.length > 80 ? '...' : '') : '';
            return `${direction} ${msg.sender === myId ? msg.recipient : msg.sender} ${encrypted}
   📅 ${msg.createdAt.toLocaleString()}
   📌 ${msg.subject || '(no subject)'}
   ${preview}`;
        }).join('\n\n');

        return {
            content: [{
                type: 'text',
                text: `💬 Thread with ${agent_id} (${thread.length} messages)\n${'═'.repeat(40)}\n\n${formatted}`
            }],
        };
    }
);

// Tool: mark_all_read
server.tool(
    'mark_all_read',
    'Mark all unread messages as read',
    {},
    async () => {
        const agentId = getAgentId();
        const unread = await storage.getInbox(agentId, { unreadOnly: true, limit: 100 });

        if (unread.length === 0) {
            return {
                content: [{ type: 'text', text: '✅ No unread messages to mark.' }],
            };
        }

        let markedCount = 0;
        for (const msg of unread) {
            try {
                await storage.markAsRead(msg.id);
                markedCount++;
            } catch {
                // Continue on error
            }
        }

        return {
            content: [{
                type: 'text',
                text: `✅ Marked ${markedCount} message(s) as read.`
            }],
        };
    }
);

// ============================================
// MCP Prompts - Common Workflows
// ============================================

server.prompt(
    'compose-secure-message',
    'Guide for composing an encrypted message',
    async () => {
        const agentId = getAgentId();
        const knownKeys = crypto.loadKnownKeys();
        const peers = Object.keys(knownKeys);

        let peerList = peers.length > 0
            ? `Available recipients with encryption keys:\n${peers.map(p => `• ${p}`).join('\n')}`
            : 'No peers with imported keys yet. Use import_key first.';

        return {
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: `I want to send a secure, encrypted message.

My agent ID: ${agentId}
${peerList}

Please help me compose an encrypted message. Ask me:
1. Who is the recipient?
2. What is the subject?
3. What is the message content?

Then use the send_message tool with encrypt=true.`
                }
            }],
        };
    }
);

server.prompt(
    'check-urgent',
    'Check for urgent or unread messages that need attention',
    async () => {
        const agentId = getAgentId();
        const unread = await storage.getInbox(agentId, { unreadOnly: true, limit: 10 });

        let summary = '';
        if (unread.length === 0) {
            summary = 'No unread messages. Inbox is clear! ✅';
        } else {
            const list = unread.map(m =>
                `• From ${m.sender}: "${m.subject || '(no subject)'}" - ${m.createdAt.toLocaleString()}`
            ).join('\n');
            summary = `You have ${unread.length} unread message(s):\n\n${list}\n\nWould you like me to read any of these messages?`;
        }

        return {
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: `Check my Myceliumail inbox for urgent or unread messages.\n\n${summary}`
                }
            }],
        };
    }
);

server.prompt(
    'identity-check',
    'Verify your identity setup and key status',
    async () => {
        const agentId = getAgentId();
        const hasEncKeys = crypto.hasKeyPair(agentId);
        const hasSignKeys = crypto.hasSigningKeyPair(agentId);
        const knownPeers = Object.keys(crypto.loadKnownKeys()).length;

        const { existsSync } = await import('fs');
        const { join } = await import('path');
        const { homedir } = await import('os');
        const hasCanary = existsSync(join(homedir(), '.myceliumail', 'canary.txt'));

        const status = `Identity Status for ${agentId}:

🔐 Encryption keypair: ${hasEncKeys ? '✅ Yes' : '❌ No - run generate_keys'}
✍️ Signing keypair: ${hasSignKeys ? '✅ Yes' : '❌ No - run generate_signing_keys'}
🐤 Canary token: ${hasCanary ? '✅ Yes' : '❌ No - run canary_init'}
👥 Known peers: ${knownPeers}

${!hasEncKeys || !hasSignKeys || !hasCanary ? 'Some identity features are not set up. Would you like me to help configure them?' : 'All identity features are configured! ✅'}`;

        return {
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: status
                }
            }],
        };
    }
);

server.prompt(
    'fleet-status',
    'Check the status of the agent fleet',
    async () => {
        const agentId = getAgentId();
        const knownKeys = crypto.loadKnownKeys();
        const peers = Object.keys(knownKeys);

        const fleetInfo = peers.length > 0
            ? `Known fleet members (${peers.length}):\n${peers.map(p => `• ${p}`).join('\n')}`
            : 'No known fleet members yet. Import some keys!';

        return {
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: `Fleet Status Report

My agent ID: ${agentId}

${fleetInfo}

To communicate with the fleet:
1. Use broadcast_message to send to all agents
2. Use send_message for individual agents
3. Use announce_key to share your public key

What would you like to do?`
                }
            }],
        };
    }
);

// Tool: send_hub_chat
server.tool(
    'send_hub_chat',
    'Send a message to the Treebird Hub chat room (visible to all connected users)',
    {
        text: z.string().describe('Message to send to Hub chat'),
        glyph: z.string().optional().describe('Emoji glyph for the message (defaults to agent glyph)'),
    },
    async ({ text, glyph }) => {
        const agentId = getAgentId();

        if (agentId === 'anonymous') {
            return {
                content: [{ type: 'text', text: '❌ Agent ID not configured. Set MYCELIUMAIL_AGENT_ID environment variable.' }],
            };
        }

        // Agent name and glyph mapping
        const AGENT_META: Record<string, { name: string; glyph: string }> = {
            mycm: { name: 'Myceliumail', glyph: '🍄' },
            ssan: { name: 'Spidersan', glyph: '🕷️' },
            arti: { name: 'Artisan', glyph: '🎨' },
            wsan: { name: 'Watsan', glyph: '📚' },
            msan: { name: 'Mappersan', glyph: '🗺️' },
            srlk: { name: 'Sherlocksan', glyph: '🔍' },
            bsan: { name: 'Birdsan', glyph: '🐦' },
            mark: { name: 'Marksan', glyph: '📣' },
            yosef: { name: 'Yosef', glyph: '🧪' },
        };

        const meta = AGENT_META[agentId] || { name: agentId, glyph: '🤖' };
        const messageGlyph = glyph || meta.glyph;

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: meta.name,
                    senderType: 'agent',
                    text: text,
                    glyph: messageGlyph,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                return {
                    content: [{ type: 'text', text: `❌ Failed to send to Hub: ${error}` }],
                };
            }

            const result = await response.json() as { success: boolean; id: string };
            return {
                content: [{
                    type: 'text',
                    text: `✅ Message sent to Hub chat!\n\nID: ${result.id}\nText: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`
                }],
            };
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Hub not reachable. Is the server running on localhost:3000?\n\nError: ${error}`
                }],
            };
        }
    }
);

// Start the server
async function main() {
    // Verify Pro license before starting
    requireProLicense();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Myceliumail MCP server running');
}

main().catch(console.error);
