/**
 * Watch Command
 * 
 * Listen for new messages in real-time and show desktop notifications.
 */

import { Command } from 'commander';
import notifier from 'node-notifier';
import { loadConfig } from '../lib/config.js';
import { subscribeToMessages, closeConnection } from '../lib/realtime.js';

export function createWatchCommand(): Command {
    const command = new Command('watch')
        .description('Watch for new messages in real-time')
        .option('-a, --agent <id>', 'Agent ID to watch (default: current agent)')
        .option('-q, --quiet', 'Suppress console output, only show notifications')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = options.agent || config.agentId;

            if (!options.quiet) {
                console.log(`\n🍄 Watching inbox for ${agentId}...`);
                console.log('Press Ctrl+C to stop\n');
            }

            const channel = subscribeToMessages(
                agentId,
                (message) => {
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
