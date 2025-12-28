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

// Start the server
async function main() {
    // Verify Pro license before starting
    requireProLicense();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Myceliumail MCP server running');
}

main().catch(console.error);
