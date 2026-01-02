/**
 * Watch Command
 * 
 * Listen for new messages in real-time and show desktop notifications.
 * Can also trigger wake sequence and log to collaborative files.
 * 
 * Sprint 3 Update (WS-003): Also connects to Hub WebSocket for
 * real-time flock events (wake, task:*, conflict:*, etc.)
 */

import { Command } from 'commander';
import notifier from 'node-notifier';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { loadConfig } from '../lib/config.js';
import { subscribeToMessages, closeConnection } from '../lib/realtime.js';
import { triggerWakeSequence } from '../lib/webhook-handler.js';
import { HubClient, disconnectHub } from '../lib/hub-client.js';
import type { WakePayload, ChatPayload, StatusPayload } from '../types/websocket.js';

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
        .description('Watch for new messages and Hub events in real-time')
        .option('-a, --agent <id>', 'Agent ID to watch (default: current agent)')
        .option('-q, --quiet', 'Suppress console output, only show notifications')
        .option('-s, --status-file', 'Write notification status to ~/.mycmail/inbox_status.json')
        .option('--wake', 'Trigger wake sequence and log to collaborative files on new message')
        .option('--hub', 'Also connect to Hub WebSocket for flock events (requires HUB_URL in config)')
        .option('--hub-only', 'Only connect to Hub WebSocket, skip Supabase Realtime')
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
                    // Trigger wake sequence if enabled
                    if (options.wake) {
                        const webhookMessage = {
                            id: message.id,
                            recipient: agentId,
                            sender: message.from_agent,
                            subject: message.subject,
                            created_at: message.created_at,
                        };
                        triggerWakeSequence(agentId, webhookMessage).catch(err => {
                            if (!options.quiet) {
                                console.error('⚠️ Wake trigger failed:', err.message);
                            }
                        });
                    }

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
                        if (options.wake) {
                            console.log(`   🌅 Wake sequence triggered`);
                        }
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

            if (!channel && !options.hubOnly) {
                console.error('❌ Failed to start watching. Check your Supabase configuration.');
                process.exit(1);
            }

            // ==== Hub WebSocket Connection (Sprint 3) ====
            let hubClient: HubClient | null = null;

            if ((options.hub || options.hubOnly) && config.hubUrl) {
                if (!options.quiet) {
                    console.log(`📡 Connecting to Hub at ${config.hubUrl}...`);
                }

                // Define callbacks for Hub events
                const hubCallbacks = {
                    onWake: (payload: WakePayload) => {
                        if (!options.quiet) {
                            console.log(`🌅 [Hub] Wake signal from ${payload.sender || 'system'}`);
                            console.log(`   Reason: ${payload.reason || 'unknown'}`);
                        }

                        notifier.notify({
                            title: '🌅 Wake Signal',
                            message: payload.message || `Wake triggered by ${payload.sender}`,
                            sound: true,
                        });

                        // Optionally trigger wake sequence
                        if (options.wake) {
                            triggerWakeSequence(agentId, {
                                id: `hub-wake-${Date.now()}`,
                                recipient: agentId,
                                sender: payload.sender || 'hub',
                                subject: 'Hub Wake Signal',
                                created_at: new Date().toISOString(),
                            }).catch(err => {
                                if (!options.quiet) {
                                    console.error('⚠️ Wake trigger failed:', err.message);
                                }
                            });
                        }
                    },
                    onChat: (payload: ChatPayload & { text?: string }) => {
                        // Hub sends 'text', our type uses 'message' - handle both
                        const messageText = payload.text || payload.message || '';
                        if (!options.quiet) {
                            console.log(`💬 [Hub Chat] ${payload.sender}: ${messageText}`);
                        }

                        notifier.notify({
                            title: `💬 ${payload.sender}`,
                            message: messageText.length > 100
                                ? messageText.substring(0, 100) + '...'
                                : messageText,
                            sound: false,
                        });
                    },
                    onConnect: () => {
                        if (!options.quiet) {
                            console.log('✅ Connected to Hub WebSocket\n');
                        }
                    },
                    onDisconnect: (reason: string) => {
                        if (!options.quiet) {
                            console.log(`🔌 [Hub] Disconnected: ${reason}`);
                        }
                    },
                    onError: (error: Error) => {
                        if (!options.quiet) {
                            console.error(`❌ [Hub] Error: ${error.message}`);
                        }
                    },
                };

                hubClient = new HubClient({
                    hubUrl: config.hubUrl,
                    agentId: agentId,
                    token: process.env.AGENT_TOKEN,
                    heartbeatIntervalMs: 30000,
                    autoReconnect: true,
                }, hubCallbacks);

                // Connect to Hub
                const connected = await hubClient.connect();
                if (!connected && !options.quiet) {
                    console.warn('⚠️  Failed to connect to Hub. Continuing with Supabase only.');
                }
            } else if ((options.hub || options.hubOnly) && !config.hubUrl) {
                console.warn('⚠️  --hub flag used but HUB_URL not configured in .env');
            }

            // Handle graceful shutdown
            const cleanup = async () => {
                if (!options.quiet) {
                    console.log('\n👋 Stopping watch...');
                }

                // Disconnect from Hub
                if (hubClient) {
                    await hubClient.disconnect();
                    if (!options.quiet) {
                        console.log('📡 Disconnected from Hub');
                    }
                }

                // Disconnect from Supabase
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
