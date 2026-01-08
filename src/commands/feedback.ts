/**
 * feedback command - Submit feedback to Treebird
 * 
 * Collect user feedback, bug reports, feature requests, etc.
 * Stores in Supabase for review.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import * as storage from '../storage/supabase.js';

const FEEDBACK_TYPES = ['general', 'bug', 'feature', 'praise', 'question'] as const;
type FeedbackType = typeof FEEDBACK_TYPES[number];

interface FeedbackPayload {
    type: FeedbackType;
    message: string;
    agent_id?: string;
    tool: string;
    version?: string;
    platform?: string;
    email?: string;
}

export function createFeedbackCommand(): Command {
    return new Command('feedback')
        .description('Submit feedback to Treebird (bugs, features, praise, questions)')
        .argument('[message]', 'Feedback message (or use --message)')
        .option('-t, --type <type>', `Feedback type: ${FEEDBACK_TYPES.join(', ')}`, 'general')
        .option('-m, --message <text>', 'Feedback message')
        .option('-e, --email <email>', 'Optional contact email for follow-up')
        .option('--tool <name>', 'Tool name (default: myceliumail)', 'myceliumail')
        .option('--anonymous', 'Submit anonymously (don\'t include agent ID)')
        .action(async (messageArg: string | undefined, options) => {
            const config = loadConfig();
            const agentId = options.anonymous ? undefined : config.agentId;

            // Get message from argument or option
            const message = messageArg || options.message;
            if (!message) {
                console.error('❌ Please provide feedback message.');
                console.error('\nUsage:');
                console.error('  mycmail feedback "Your feedback here"');
                console.error('  mycmail feedback -t bug "Found an issue with..."');
                console.error('  mycmail feedback -t feature "Would love to see..."');
                console.error('\nTypes: general, bug, feature, praise, question');
                process.exit(1);
            }

            // Validate type
            const type = options.type.toLowerCase() as FeedbackType;
            if (!FEEDBACK_TYPES.includes(type)) {
                console.error(`❌ Invalid type: ${options.type}`);
                console.error(`   Valid types: ${FEEDBACK_TYPES.join(', ')}`);
                process.exit(1);
            }

            // Build payload
            const payload: FeedbackPayload = {
                type,
                message,
                tool: options.tool,
                platform: `${process.platform}/${process.arch}`,
            };

            if (agentId && agentId !== 'anonymous') {
                payload.agent_id = agentId;
            }

            if (options.email) {
                payload.email = options.email;
            }

            // Get version from package.json
            try {
                const { readFileSync } = await import('fs');
                const { join, dirname } = await import('path');
                const { fileURLToPath } = await import('url');
                const __dirname = dirname(fileURLToPath(import.meta.url));
                const pkgPath = join(__dirname, '../../package.json');
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                payload.version = pkg.version;
            } catch {
                // Version optional
            }

            try {
                await storage.submitFeedback(payload);

                console.log('\n✅ Feedback submitted! Thank you! 🙏');
                console.log(`   Type: ${type}`);
                console.log(`   Tool: ${payload.tool}`);
                if (payload.agent_id) console.log(`   From: ${payload.agent_id}`);
                if (payload.email) console.log(`   Email: ${payload.email}`);
                console.log('\nWe read every piece of feedback. 💜');
            } catch (error) {
                console.error('❌ Failed to submit feedback:', error);
                console.error('\nYou can also reach us at:');
                console.error('   Email: treebird@treebird.dev');
                console.error('   GitHub: https://github.com/treebird7/myceliumail/issues');
                process.exit(1);
            }
        });
}
