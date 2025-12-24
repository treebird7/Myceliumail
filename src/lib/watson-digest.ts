/**
 * Watson Digest - Generate and send summary reports to watsan
 * 
 * Creates summarized digests of unread messages and collaboration docs
 * to keep the orchestrator informed.
 */

import { loadConfig, Config } from './config.js';
import { loadKeyPair, decryptMessage } from './crypto.js';
import * as storage from '../storage/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface DigestMessage {
    from: string;
    subject: string;
    preview: string;
    tag?: string;
    timestamp: string;
}

interface DigestReport {
    type: 'wake' | 'close';
    agentId: string;
    timestamp: string;
    inbox: {
        total: number;
        unread: number;
    };
    urgentMessages: DigestMessage[];
    taggedMessages: DigestMessage[];
    activeCollabs: string[];
    sessionDuration?: string;
}

/**
 * Extract hashtag from subject line
 */
function extractTag(subject: string | null): string | null {
    if (!subject) return null;
    const match = subject.match(/^#([a-zA-Z0-9_-]+):/);
    return match ? match[1].toLowerCase() : null;
}

/**
 * Get preview of message body (first 100 chars)
 */
function getPreview(body: string | null): string {
    if (!body) return '(no body)';
    const clean = body.replace(/\n/g, ' ').trim();
    return clean.length > 100 ? clean.slice(0, 97) + '...' : clean;
}

/**
 * Generate a digest of unread messages
 */
export async function generateDigest(
    agentId: string,
    type: 'wake' | 'close',
    sessionDuration?: string
): Promise<DigestReport> {
    const keyPair = loadKeyPair(agentId);
    const messages = await storage.getInbox(agentId, { limit: 100 });
    const unreadMessages = messages.filter(m => !m.read);

    const urgentMessages: DigestMessage[] = [];
    const taggedMessages: DigestMessage[] = [];

    for (const msg of unreadMessages.slice(0, 20)) { // Cap at 20 for digest
        let subject = msg.subject || '(no subject)';
        let body = msg.body || '';

        // Decrypt if needed
        if (msg.encrypted && keyPair && msg.ciphertext && msg.nonce && msg.senderPublicKey) {
            try {
                const decrypted = decryptMessage({
                    ciphertext: msg.ciphertext,
                    nonce: msg.nonce,
                    senderPublicKey: msg.senderPublicKey,
                }, keyPair);

                if (decrypted) {
                    const parsed = JSON.parse(decrypted);
                    subject = parsed.subject || subject;
                    body = parsed.body || body;
                }
            } catch {
                // Keep original
            }
        }

        const tag = extractTag(subject);
        const digestMsg: DigestMessage = {
            from: msg.sender || 'unknown',
            subject,
            preview: getPreview(body),
            tag: tag || undefined,
            timestamp: msg.createdAt?.toISOString() || new Date().toISOString()
        };

        // Categorize: urgent keywords or tagged
        const isUrgent = /urgent|important|asap|critical|blocked/i.test(subject + body);
        if (isUrgent) {
            urgentMessages.push(digestMsg);
        } else if (tag) {
            taggedMessages.push(digestMsg);
        }
    }

    // Load session for active collabs
    const sessionPath = path.join(os.homedir(), '.mycmail', 'session.json');
    let activeCollabs: string[] = [];
    try {
        if (fs.existsSync(sessionPath)) {
            const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
            activeCollabs = session.activeCollabs || [];
        }
    } catch {
        // Ignore
    }

    return {
        type,
        agentId,
        timestamp: new Date().toISOString(),
        inbox: {
            total: messages.length,
            unread: unreadMessages.length
        },
        urgentMessages,
        taggedMessages,
        activeCollabs,
        sessionDuration
    };
}

/**
 * Format digest as readable text for watsan
 */
export function formatDigestText(digest: DigestReport): string {
    const lines: string[] = [];

    lines.push(`📊 MYCM ${digest.type.toUpperCase()} DIGEST`);
    lines.push(`Time: ${new Date(digest.timestamp).toLocaleString()}`);
    lines.push(`Inbox: ${digest.inbox.unread} unread / ${digest.inbox.total} total`);

    if (digest.sessionDuration) {
        lines.push(`Session: ${digest.sessionDuration}`);
    }

    if (digest.urgentMessages.length > 0) {
        lines.push('');
        lines.push('🚨 URGENT:');
        for (const msg of digest.urgentMessages.slice(0, 5)) {
            lines.push(`  • ${msg.from}: ${msg.subject}`);
        }
    }

    if (digest.taggedMessages.length > 0) {
        lines.push('');
        lines.push('🏷️ TAGGED:');
        for (const msg of digest.taggedMessages.slice(0, 5)) {
            lines.push(`  • ${msg.from}: ${msg.subject}`);
        }
    }

    if (digest.activeCollabs.length > 0) {
        lines.push('');
        lines.push('📋 ACTIVE COLLABS:');
        for (const collab of digest.activeCollabs) {
            lines.push(`  • ${collab}`);
        }
    }

    if (digest.urgentMessages.length === 0 && digest.taggedMessages.length === 0) {
        lines.push('');
        lines.push('✅ No urgent or tagged messages');
    }

    return lines.join('\n');
}

/**
 * Send digest to watson (unencrypted) and wsan (encrypted)
 */
export async function sendDigestToWatsan(digest: DigestReport): Promise<void> {
    const config = loadConfig();
    const content = formatDigestText(digest);
    const subject = `[DIGEST] ${digest.agentId} ${digest.type} @ ${new Date().toLocaleTimeString()}`;

    // Send to watson (unencrypted)
    try {
        await storage.sendMessage(
            digest.agentId,
            'watson',
            subject,
            content,
            { encrypted: false }
        );
    } catch {
        // Silent fail
    }

    // Send to wsan (encrypted - archiver)
    try {
        await storage.sendMessage(
            digest.agentId,
            'wsan',
            subject,
            content,
            { encrypted: true }
        );
    } catch {
        // Silent fail
    }
}
