import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../lib/config.js';
import * as storage from '../storage/supabase.js';
import { loadKeyPair, decryptMessage } from '../lib/crypto.js';

export async function registerRoutes(fastify: FastifyInstance) {
    const config = loadConfig();
    const agentId = config.agentId;

    // GET /api/inbox
    fastify.get('/api/inbox', async (request, reply) => {
        // We'll trust the storage layer to handle potential errors gracefully or fastify to catch
        const messages = await storage.getInbox(agentId, { limit: 100 });

        // Decrypt encrypted messages
        const keyPair = loadKeyPair(agentId);
        const decrypted = messages.map(msg => {
            if (msg.encrypted && keyPair && msg.ciphertext && msg.nonce && msg.senderPublicKey) {
                try {
                    const decryptedText = decryptMessage({
                        ciphertext: msg.ciphertext,
                        nonce: msg.nonce,
                        senderPublicKey: msg.senderPublicKey
                    }, keyPair);

                    if (decryptedText) {
                        const parsed = JSON.parse(decryptedText);
                        return { ...msg, subject: parsed.subject, body: parsed.body, decrypted: true };
                    }
                } catch (e) {
                    // console.error('Failed to decrypt message', msg.id, e);
                }
            }
            return msg;
        });

        // Use decrypted length for total if we filtered, but here we just mapped
        return { messages: decrypted, total: decrypted.length };
    });

    // GET /api/message/:id
    fastify.get('/api/message/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const message = await storage.getMessage(id);

        if (!message) {
            return reply.code(404).send({ error: 'Message not found' });
        }

        // Decrypt if needed
        const keyPair = loadKeyPair(agentId);
        if (message.encrypted && keyPair && message.ciphertext && message.nonce && message.senderPublicKey) {
            try {
                const decryptedText = decryptMessage({
                    ciphertext: message.ciphertext,
                    nonce: message.nonce,
                    senderPublicKey: message.senderPublicKey
                }, keyPair);

                if (decryptedText) {
                    const parsed = JSON.parse(decryptedText);
                    return { ...message, subject: parsed.subject, body: parsed.body, decrypted: true };
                }
            } catch (e) {
                // console.error('Failed to decrypt message', message.id, e);
            }
        }

        return message;
    });

    // POST /api/message/:id/read
    fastify.post('/api/message/:id/read', async (request, reply) => {
        const { id } = request.params as { id: string };
        await storage.markAsRead(id);
        return { success: true };
    });

    // POST /api/message/:id/archive
    fastify.post('/api/message/:id/archive', async (request, reply) => {
        const { id } = request.params as { id: string };
        await storage.archiveMessage(id);
        return { success: true };
    });

    // GET /api/stats
    fastify.get('/api/stats', async (request, reply) => {
        const messages = await storage.getInbox(agentId);
        const unread = messages.filter(m => !m.read).length;
        return {
            total: messages.length,
            unread,
            encrypted: messages.filter(m => m.encrypted).length
        };
    });
}
