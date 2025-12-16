import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../lib/config.js';
import * as storage from '../storage/supabase.js';
import { loadKeyPair, decryptMessage, listOwnKeys } from '../lib/crypto.js';
import type { Message } from '../types/index.js';

// Try to decrypt a message using any available key
function tryDecryptWithAllKeys(msg: Message): Message {
    if (!msg.encrypted || !msg.ciphertext || !msg.nonce || !msg.senderPublicKey) {
        return msg;
    }

    // Get all available keypairs
    const ownKeys = listOwnKeys();

    for (const agentId of ownKeys) {
        const keyPair = loadKeyPair(agentId);
        if (!keyPair) continue;

        try {
            const decryptedText = decryptMessage({
                ciphertext: msg.ciphertext,
                nonce: msg.nonce,
                senderPublicKey: msg.senderPublicKey
            }, keyPair);

            if (decryptedText) {
                const parsed = JSON.parse(decryptedText);
                return {
                    ...msg,
                    subject: parsed.subject,
                    body: parsed.body,
                    decrypted: true,
                    decryptedBy: agentId
                } as Message & { decrypted: boolean; decryptedBy: string };
            }
        } catch (e) {
            // Try next key
        }
    }

    return msg;
}

export async function registerRoutes(fastify: FastifyInstance) {
    const config = loadConfig();
    const agentId = config.agentId;

    // GET /api/inbox
    fastify.get('/api/inbox', async (request, reply) => {
        const messages = await storage.getInbox(agentId, { limit: 100 });

        // Decrypt encrypted messages using all available keys
        const decrypted = messages.map(tryDecryptWithAllKeys);

        return { messages: decrypted, total: decrypted.length };
    });

    // GET /api/message/:id
    fastify.get('/api/message/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const message = await storage.getMessage(id);

        if (!message) {
            return reply.code(404).send({ error: 'Message not found' });
        }

        // Try all keys for decryption
        return tryDecryptWithAllKeys(message);
    });

    // POST /api/message/:id/read
    fastify.post('/api/message/:id/read', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { readerId } = request.body as { readerId?: string };
        await storage.markAsRead(id, readerId || agentId);
        return { success: true };
    });

    // POST /api/message/:id/archive
    fastify.post('/api/message/:id/archive', async (request, reply) => {
        const { id } = request.params as { id: string };
        await storage.archiveMessage(id);
        return { success: true };
    });

    // DELETE /api/message/:id
    fastify.delete('/api/message/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const deleted = await storage.deleteMessage(id);
        return { success: deleted };
    });

    // POST /api/send - Send a new message (supports multi-recipient)
    fastify.post('/api/send', async (request, reply) => {
        const { to, subject, body, from, attachments } = request.body as {
            to: string | string[];
            subject: string;
            body: string;
            from?: string;
            attachments?: { name: string; type: string; data: string; size: number }[];
        };

        const sender = from || agentId;
        const message = await storage.sendMessage(sender, to, subject, body, { attachments });
        return { success: true, message };
    });

    // GET /api/stats
    fastify.get('/api/stats', async (request, reply) => {
        const messages = await storage.getInbox(agentId);
        const unread = messages.filter(m => !m.readBy?.includes(agentId) && !m.read).length;
        return {
            total: messages.length,
            unread,
            encrypted: messages.filter(m => m.encrypted).length
        };
    });
}
