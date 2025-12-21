/**
 * Watch Command
 * 
 * Listen for new messages in real-time and show desktop notifications.
 */

import { Command } from 'commander';
import notifier from 'node-notifier';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { loadConfig } from '../lib/config.js';
import { subscribeToMessages, closeConnection } from '../lib/realtime.js';

interface InboxStatus {
    status: 0 | 1 | 2;  // 0=none, 1=new message, 2=urgent
    count: number;
    lastMessage?: {
        from: string;
        subject: string;
        time: string;
        encrypted: boolean;
    };
    updatedAt: string;
}

const STATUS_FILE_PATH = join(homedir(), '.mycmail', 'inbox_status.json');

/**
 * Read current inbox status, or return default
 */
function readInboxStatus(): InboxStatus {
    try {
        if (existsSync(STATUS_FILE_PATH)) {
            const content = readFileSync(STATUS_FILE_PATH, 'utf-8');
            return JSON.parse(content);
        }
    } catch {
        // Return default if file doesn't exist or is invalid
    }
    return { status: 0, count: 0, updatedAt: new Date().toISOString() };
}

/**
 * Write inbox status to file
 */
function writeInboxStatus(status: InboxStatus): void {
    const dir = join(homedir(), '.mycmail');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STATUS_FILE_PATH, JSON.stringify(status, null, 2));
}

/**
 * Clear inbox status (set to 0)
 */
export function clearInboxStatus(): void {
    writeInboxStatus({ status: 0, count: 0, updatedAt: new Date().toISOString() });
}

export function createWatchCommand(): Command {
    const command = new Command('watch')
        .description('Watch for new messages in real-time')
        .option('-a, --agent <id>', 'Agent ID to watch (default: current agent)')
        .option('-q, --quiet', 'Suppress console output, only show notifications')
        .option('-s, --status-file', 'Write notification status to ~/.mycmail/inbox_status.json')
        .option('--clear-status', 'Clear the status file and exit')
        .action(async (options) => {
            // Handle --clear-status flag
            if (options.clearStatus) {
                clearInboxStatus();
                console.log('✅ Inbox status cleared (set to 0)');
                return;
            }

            const config = loadConfig();
            const agentId = options.agent || config.agentId;

            if (!options.quiet) {
                console.log(`\n🍄 Watching inbox for ${agentId}...`);
                if (options.statusFile) {
                    console.log(`📝 Status file: ${STATUS_FILE_PATH}`);
                    // Initialize status file to 0 at start
                    clearInboxStatus();
                }
                console.log('Press Ctrl+C to stop\n');
            }

            const channel = subscribeToMessages(
                agentId,
                (message) => {
                    // Update status file if enabled
                    if (options.statusFile) {
                        const currentStatus = readInboxStatus();
                        // Detect urgency: check for "urgent" in subject (case-insensitive)
                        const isUrgent = message.subject?.toLowerCase().includes('urgent');
                        const newStatus: InboxStatus = {
                            status: isUrgent ? 2 : 1,
                            count: currentStatus.count + 1,
                            lastMessage: {
                                from: message.from_agent,
                                subject: message.subject,
                                time: message.created_at,
                                encrypted: message.encrypted,
                            },
                            updatedAt: new Date().toISOString(),
                        };
                        writeInboxStatus(newStatus);
                        if (!options.quiet) {
                            console.log(`📝 Status file updated (status: ${newStatus.status}, count: ${newStatus.count})`);
                        }
                    }

                    // Show console output
                    if (!options.quiet) {
                        const time = new Date(message.created_at).toLocaleTimeString();
                        console.log(`📬 [${time}] New message from ${message.from_agent}`);
                        console.log(`   Subject: ${message.subject}`);
                        if (!message.encrypted) {
                            const preview = message.message.length > 80
                                ? message.message.substring(0, 80) + '...'
                                : message.message;
                            console.log(`   Preview: ${preview}`);
                        } else {
                            console.log(`   🔒 [Encrypted]`);
                        }
                        console.log();
                    }

                    // Show desktop notification
                    const preview = message.encrypted
                        ? '🔒 Encrypted message'
                        : message.message.length > 100
                            ? message.message.substring(0, 100) + '...'
                            : message.message;

                    notifier.notify({
                        title: `📬 ${message.from_agent}: ${message.subject}`,
                        message: preview,
                        sound: true,
                        wait: false,
                    });
                },
                (status, error) => {
                    if (!options.quiet) {
                        switch (status) {
                            case 'SUBSCRIBED':
                                console.log('✅ Connected to Supabase Realtime\n');
                                break;
                            case 'CLOSED':
                                console.log('🔌 Connection closed');
                                break;
                            case 'CHANNEL_ERROR':
                                console.error('❌ Channel error:', error?.message);
                                break;
                            case 'TIMED_OUT':
                                console.error('⏱️ Connection timed out');
                                break;
                        }
                    }
                }
            );

            if (!channel) {
                console.error('❌ Failed to start watching. Check your Supabase configuration.');
                process.exit(1);
            }

            // Handle graceful shutdown
            const cleanup = async () => {
                if (!options.quiet) {
                    console.log('\n👋 Stopping watch...');
                }
                await closeConnection();
                process.exit(0);
            };

            process.on('SIGINT', cleanup);
            process.on('SIGTERM', cleanup);

            // Keep the process running
            await new Promise(() => { });
        });

    return command;
}
