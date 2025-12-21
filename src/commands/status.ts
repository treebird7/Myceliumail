/**
 * Status Command
 * 
 * Check the current inbox notification status from the status file.
 * This allows agents to quickly check if they have new mail without
 * running the watch command.
 */

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
 * Read current inbox status
 */
function readInboxStatus(): InboxStatus | null {
    try {
        if (existsSync(STATUS_FILE_PATH)) {
            const content = readFileSync(STATUS_FILE_PATH, 'utf-8');
            return JSON.parse(content);
        }
    } catch {
        // Return null if file doesn't exist or is invalid
    }
    return null;
}

/**
 * Clear inbox status (set to 0)
 */
function clearInboxStatus(): void {
    const dir = join(homedir(), '.mycmail');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    const status: InboxStatus = { status: 0, count: 0, updatedAt: new Date().toISOString() };
    writeFileSync(STATUS_FILE_PATH, JSON.stringify(status, null, 2));
}

export function createStatusCommand(): Command {
    const command = new Command('status')
        .description('Check inbox notification status (0=none, 1=new, 2=urgent)')
        .option('--clear', 'Clear the status (acknowledge messages)')
        .option('--json', 'Output as JSON')
        .option('--number-only', 'Output only the status number (0, 1, or 2)')
        .action(async (options) => {
            if (options.clear) {
                clearInboxStatus();
                if (!options.numberOnly) {
                    console.log('✅ Status cleared');
                } else {
                    console.log('0');
                }
                return;
            }

            const status = readInboxStatus();

            if (!status) {
                if (options.json) {
                    console.log(JSON.stringify({ status: 0, count: 0, message: 'No status file found' }));
                } else if (options.numberOnly) {
                    console.log('0');
                } else {
                    console.log('📭 No status file found. Run `mycmail watch --status-file` to enable.');
                }
                return;
            }

            if (options.numberOnly) {
                console.log(status.status.toString());
                return;
            }

            if (options.json) {
                console.log(JSON.stringify(status, null, 2));
                return;
            }

            // Human-readable output
            const statusEmoji = status.status === 0 ? '📭' : status.status === 1 ? '📬' : '🚨';
            const statusText = status.status === 0 ? 'No new messages' : status.status === 1 ? 'New message(s)' : 'URGENT message(s)';

            console.log(`\n${statusEmoji} ${statusText}`);
            console.log(`   Count: ${status.count}`);

            if (status.lastMessage) {
                console.log(`   Last: ${status.lastMessage.from} - "${status.lastMessage.subject}"`);
                if (status.lastMessage.encrypted) {
                    console.log(`   🔒 Message is encrypted`);
                }
            }

            console.log(`   Updated: ${new Date(status.updatedAt).toLocaleString()}`);
            console.log();
        });

    return command;
}
