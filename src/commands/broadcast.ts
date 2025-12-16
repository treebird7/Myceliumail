/**
 * broadcast command - Send a message to all known agents
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { getKnownKeys } from '../lib/crypto.js';
import * as storage from '../storage/supabase.js';

// Known agent aliases
const AGENT_ALIASES: Record<string, string> = {
    'mycs': 'mycsan',
    'treeb': 'treebird',
};

function resolveAlias(agent: string): string {
    return AGENT_ALIASES[agent] || agent;
}

export function createBroadcastCommand(): Command {
    return new Command('broadcast')
        .description('Send a message to all known agents')
        .argument('<subject>', 'Message subject/body')
        .option('-m, --message <body>', 'Message body (optional)')
        .action(async (subject: string, options) => {
            const config = loadConfig();
            const sender = config.agentId;

            if (sender === 'anonymous') {
                console.error('❌ Agent ID not configured.');
                console.error('Set MYCELIUMAIL_AGENT_ID or configure ~/.myceliumail/config.json');
                process.exit(1);
            }

            const body = options.message || subject;

            // Get all known agents from keys
            const knownKeys = getKnownKeys();
            const recipients = Object.keys(knownKeys).filter(agent => agent !== sender);

            if (recipients.length === 0) {
                console.error('❌ No known agents to broadcast to.');
                console.error('Import agent keys first:');
                console.error('  mycmail key-import <agent> <their-public-key>');
                process.exit(1);
            }

            console.log(`📢 Broadcasting to ${recipients.length} agents...`);
            console.log(`   Recipients: ${recipients.join(', ')}\n`);

            let sent = 0;
            let failed = 0;

            for (const recipient of recipients) {
                try {
                    await storage.sendMessage(sender, recipient, subject, body);
                    console.log(`   ✅ ${recipient}`);
                    sent++;
                } catch (error) {
                    console.log(`   ❌ ${recipient}: ${error}`);
                    failed++;
                }
            }

            console.log(`\n📬 Broadcast complete: ${sent} sent, ${failed} failed`);
        });
}

// Export alias resolver for use in send command
export { resolveAlias, AGENT_ALIASES };
