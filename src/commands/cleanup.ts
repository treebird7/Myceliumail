/**
 * cleanup command - Archive old/stale messages in bulk
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import * as storage from '../storage/supabase.js';

export function createCleanupCommand(): Command {
    return new Command('cleanup')
        .description('Archive old messages in bulk')
        .option('-d, --days <n>', 'Archive messages older than N days', '7')
        .option('-a, --all', 'Archive all messages (keep nothing)')
        .option('--dry-run', 'Show what would be archived without doing it')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (agentId === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                process.exit(1);
            }

            try {
                // Get all messages
                const messages = await storage.getInbox(agentId, { limit: 200 });

                if (messages.length === 0) {
                    console.log('📭 No messages to clean up');
                    return;
                }

                const now = new Date();
                const cutoffDays = parseInt(options.days, 10);
                const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);

                // Filter messages to archive
                let toArchive = options.all
                    ? messages
                    : messages.filter(m => m.createdAt < cutoffDate);

                if (toArchive.length === 0) {
                    console.log(`✅ No messages older than ${cutoffDays} days`);
                    return;
                }

                if (options.json) {
                    console.log(JSON.stringify({
                        action: options.dryRun ? 'dry-run' : 'archive',
                        agentId,
                        cutoffDays: options.all ? 'all' : cutoffDays,
                        total: messages.length,
                        toArchive: toArchive.length,
                        messages: toArchive.map(m => ({
                            id: m.id,
                            from: m.sender,
                            subject: m.subject?.substring(0, 50),
                            createdAt: m.createdAt.toISOString(),
                        })),
                    }, null, 2));
                    if (options.dryRun) return;
                } else {
                    console.log(`\n🧹 Cleanup for ${agentId}\n`);
                    console.log(`Total messages: ${messages.length}`);
                    console.log(`To archive: ${toArchive.length} (older than ${options.all ? 'now' : cutoffDays + ' days'})\n`);

                    if (options.dryRun) {
                        console.log('📋 Messages that would be archived:\n');
                        for (const msg of toArchive) {
                            const age = Math.floor((now.getTime() - msg.createdAt.getTime()) / (24 * 60 * 60 * 1000));
                            const subject = msg.subject?.substring(0, 40) || '[No Subject]';
                            console.log(`  ${msg.id.slice(0, 8)} | ${msg.sender} | ${subject} (${age}d ago)`);
                        }
                        console.log('\n💡 Run without --dry-run to archive these messages');
                        return;
                    }
                }

                // Archive messages
                let archived = 0;
                let failed = 0;

                for (const msg of toArchive) {
                    try {
                        const success = await storage.archiveMessage(msg.id);
                        if (success) {
                            archived++;
                            if (!options.json) {
                                process.stdout.write(`\r🗑️  Archived ${archived}/${toArchive.length}...`);
                            }
                        } else {
                            failed++;
                        }
                    } catch {
                        failed++;
                    }
                }

                if (!options.json) {
                    console.log(`\n\n✅ Archived ${archived} messages`);
                    if (failed > 0) {
                        console.log(`⚠️  Failed: ${failed}`);
                    }
                }
            } catch (error) {
                console.error('❌ Cleanup failed:', error);
                process.exit(1);
            }
        });
}
