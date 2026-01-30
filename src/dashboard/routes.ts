import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../lib/config.js';
import * as storage from '../storage/supabase.js';
import { loadKeyPair, decryptMessage, listOwnKeys } from '../lib/crypto.js';
import { handleWebhook } from '../lib/webhook-handler.js';
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

    // GET /api/config/agents - List all agent IDs with keys
    fastify.get('/api/config/agents', async (request, reply) => {
        const agents = listOwnKeys();
        // Include config agent if not already in list
        if (agentId && !agents.includes(agentId)) {
            agents.unshift(agentId);
        }
        return { agents };
    });

    // GET /api/inbox - Now supports multi-agent queries
    fastify.get('/api/inbox', async (request, reply) => {
        const queryAgents = (request.query as { agents?: string }).agents;

        let messages;
        if (queryAgents) {
            // Use specific agents if provided
            const agentIds = queryAgents.split(',').map(s => s.trim());
            messages = await storage.getMultiAgentInbox(agentIds, { limit: 100 });
        } else {
            // Default: get messages for ALL agents with keys
            const allAgentIds = listOwnKeys();
            if (agentId && !allAgentIds.includes(agentId)) {
                allAgentIds.unshift(agentId);
            }
            if (allAgentIds.length > 0) {
                messages = await storage.getMultiAgentInbox(allAgentIds, { limit: 100 });
            } else {
                // Fallback to single agent query
                messages = await storage.getInbox(agentId, { limit: 100 });
            }
        }

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

    // GET /api/config - Provide config for frontend (NO SECRETS!)
    // SECURITY: Never expose supabaseKey to browser - use anon key only
    fastify.get('/api/config', async (request, reply) => {
        const response: { agentId: string; supabaseUrl?: string; supabaseAnonKey?: string } = {
            agentId: config.agentId,
        };

        if (config.supabaseUrl && config.supabaseAnonKey) {
            response.supabaseUrl = config.supabaseUrl;
            response.supabaseAnonKey = config.supabaseAnonKey;
        }
        return {
            ...response,
            // Frontend should use /api/* endpoints which proxy to Supabase server-side
        };
    });

    // POST /api/webhook/agent-message - Supabase webhook for new messages
    // Triggered when a new message arrives for the agent
    fastify.post('/api/webhook/agent-message', async (request, reply) => {
        const body = request.body as {
            type: string;
            record?: {
                id: string;
                recipient: string;
                sender: string;
                subject?: string;
                created_at: string;
            };
        };

        try {
            // Use the sophisticated webhook handler
            const result = await handleWebhook(agentId, body);
            return result;
        } catch (error) {
            console.error('Webhook error:', error);
            return {
                success: false,
                processed: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
        }
    });
}
