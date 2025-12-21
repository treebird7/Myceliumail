/**
 * export command - Export messages for RAG/backup
 */

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { loadConfig } from '../lib/config.js';
import { loadKeyPair, decryptMessage } from '../lib/crypto.js';
import * as storage from '../storage/supabase.js';
import type { Message } from '../types/index.js';

interface ExportOptions {
    format: 'jsonl' | 'json' | 'md';
    output?: string;
    from?: string;
    since?: string;
    limit?: string;
    decrypt?: boolean;
}

interface ExportedMessage {
    id: string;
    from: string;
    to: string;
    subject: string;
    content: string;
    encrypted: boolean;
    created_at: string;
}

/**
 * Decrypt a message if possible
 */
function tryDecrypt(msg: Message, keyPair: { publicKey: Uint8Array; secretKey: Uint8Array } | null): { subject: string; content: string } {
    if (!msg.encrypted) {
        return { subject: msg.subject, content: msg.body };
    }

    if (!keyPair || !msg.ciphertext || !msg.nonce || !msg.senderPublicKey) {
        return { subject: msg.subject, content: '[Encrypted - No keys available]' };
    }

    try {
        const decrypted = decryptMessage({
            ciphertext: msg.ciphertext,
            nonce: msg.nonce,
            senderPublicKey: msg.senderPublicKey,
        }, keyPair);

        if (decrypted) {
            const parsed = JSON.parse(decrypted);
            return {
                subject: parsed.subject || msg.subject,
                content: parsed.body || parsed.message || decrypted,
            };
        }
    } catch {
        // Decryption failed
    }

    return { subject: msg.subject, content: '[Encrypted - Decryption failed]' };
}

/**
 * Format messages as JSONL (one JSON object per line)
 */
function formatJsonl(messages: ExportedMessage[]): string {
    return messages.map(m => JSON.stringify(m)).join('\n');
}

/**
 * Format messages as JSON array with metadata
 */
function formatJson(messages: ExportedMessage[], agentId: string): string {
    return JSON.stringify({
        exported_at: new Date().toISOString(),
        agent_id: agentId,
        message_count: messages.length,
        messages,
    }, null, 2);
}

/**
 * Format messages as Markdown
 */
function formatMarkdown(messages: ExportedMessage[], agentId: string): string {
    const lines: string[] = [
        `# Myceliumail Archive - ${agentId}`,
        `Exported: ${new Date().toLocaleString()}`,
        `Total messages: ${messages.length}`,
        '',
    ];

    for (const msg of messages) {
        const date = new Date(msg.created_at).toLocaleString();
        const encMarker = msg.encrypted ? ' 🔐' : '';
        lines.push('---');
        lines.push(`## 📬 From: ${msg.from}${encMarker} | ${date}`);
        lines.push(`**Subject:** ${msg.subject}`);
        lines.push('');
        lines.push(msg.content);
        lines.push('');
    }

    return lines.join('\n');
}

export function createExportCommand(): Command {
    return new Command('export')
        .description('Export messages for RAG/backup (JSONL, JSON, or Markdown)')
        .option('-f, --format <format>', 'Output format: jsonl, json, md', 'jsonl')
        .option('-o, --output <file>', 'Output file (default: stdout)')
        .option('--from <agent>', 'Filter by sender')
        .option('--since <date>', 'Filter messages after date (ISO 8601)')
        .option('-l, --limit <n>', 'Max messages to export', '100')
        .option('-d, --decrypt', 'Attempt to decrypt encrypted messages')
        .action(async (options: ExportOptions) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (agentId === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                console.error('Set MYCELIUMAIL_AGENT_ID or configure ~/.myceliumail/config.json');
                process.exit(1);
            }

            // Validate format
            const format = options.format.toLowerCase() as 'jsonl' | 'json' | 'md';
            if (!['jsonl', 'json', 'md'].includes(format)) {
                console.error('❌ Invalid format. Use: jsonl, json, or md');
                process.exit(1);
            }

            try {
                // Fetch messages
                const messages = await storage.getInbox(agentId, {
                    limit: parseInt(options.limit || '100', 10),
                });

                if (messages.length === 0) {
                    console.error('📭 No messages to export');
                    process.exit(0);
                }

                // Load keys for decryption if requested
                const keyPair = options.decrypt ? loadKeyPair(agentId) : null;

                // Filter by sender if specified
                let filtered = messages;
                if (options.from) {
                    const fromLower = options.from.toLowerCase();
                    filtered = filtered.filter(m => m.sender.toLowerCase() === fromLower);
                }

                // Filter by date if specified
                if (options.since) {
                    const sinceDate = new Date(options.since);
                    if (!isNaN(sinceDate.getTime())) {
                        filtered = filtered.filter(m => m.createdAt >= sinceDate);
                    }
                }

                if (filtered.length === 0) {
                    console.error('📭 No messages match filters');
                    process.exit(0);
                }

                // Transform to export format
                const exported: ExportedMessage[] = filtered.map(msg => {
                    const { subject, content } = options.decrypt
                        ? tryDecrypt(msg, keyPair)
                        : { subject: msg.subject, content: msg.encrypted ? '[Encrypted]' : msg.body };

                    return {
                        id: msg.id,
                        from: msg.sender,
                        to: msg.recipient as string,
                        subject,
                        content,
                        encrypted: msg.encrypted,
                        created_at: msg.createdAt.toISOString(),
                    };
                });

                // Format output
                let output: string;
                switch (format) {
                    case 'jsonl':
                        output = formatJsonl(exported);
                        break;
                    case 'json':
                        output = formatJson(exported, agentId);
                        break;
                    case 'md':
                        output = formatMarkdown(exported, agentId);
                        break;
                }

                // Write to file or stdout
                if (options.output) {
                    writeFileSync(options.output, output);
                    console.error(`✅ Exported ${filtered.length} messages to ${options.output}`);
                } else {
                    console.log(output);
                }

            } catch (error) {
                console.error('❌ Export failed:', error);
                process.exit(1);
            }
        });
}
