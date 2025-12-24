/**
 * collab command - Join or manage collaborative documents
 * 
 * Allows mycmail to programmatically join birdsan-orchestrated collabs.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import * as fs from 'fs';
import * as path from 'path';

function addAgentSection(filepath: string, agentName: string, agentId: string, message: string): void {
    let content = fs.readFileSync(filepath, 'utf-8');

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

    // Find the placeholder section and add our response before it
    const placeholder = '### [Agent responses will appear here]';
    const agentSection = `### ${agentName} (${agentId}) - ${date} ${timestamp}
${message}

---

${placeholder}`;

    if (content.includes(placeholder)) {
        content = content.replace(placeholder, agentSection);
    } else {
        // Append at the end if no placeholder found
        content += `\n\n---\n\n### ${agentName} (${agentId}) - ${date} ${timestamp}\n${message}\n`;
    }

    // Update the participant checkbox if present
    const uncheckedPatterns = [
        new RegExp(`- \\[ \\] \\*\\*${agentName}\\*\\* - Awaiting response`),
        new RegExp(`- \\[ \\] \\*\\*${agentId}\\*\\* - Awaiting response`),
    ];

    for (const pattern of uncheckedPatterns) {
        content = content.replace(pattern, `- [x] **${agentName}** - Joined`);
    }

    fs.writeFileSync(filepath, content);
}

export function createCollabCommand(): Command {
    return new Command('collab')
        .description('Join or manage collaborative documents')
        .option('--join <filepath>', 'Join an existing collaboration document')
        .option('-m, --message <message>', 'Custom message to add when joining')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;
            const agentName = 'Myceliumail';

            if (options.join) {
                const filepath = options.join;

                if (!fs.existsSync(filepath)) {
                    console.error(`\n❌ Collab file not found: ${filepath}\n`);
                    process.exit(1);
                }

                console.log('\n🤝 Joining Collaboration\n');
                console.log('─'.repeat(40));
                console.log(`File: ${path.basename(filepath)}`);
                console.log(`Agent: ${agentName} (${agentId})`);

                const defaultMessage = `${agentName} joining the discussion!

As the communication backbone, here's my perspective:

**Key points:**
- Ready to facilitate message exchange between agents
- Can provide encryption/decryption support for sensitive discussions
- Monitoring network health for all participants

Looking forward to contributing!`;

                const message = options.message || defaultMessage;

                try {
                    addAgentSection(filepath, agentName, agentId, message);
                    console.log(`\n✓ ${agentName} joined the collab!`);
                    console.log(`  Added response to: ${filepath}`);

                    // Notify birdsan
                    try {
                        const { execSync } = await import('child_process');
                        execSync(`mycmail send bsan "Joined collab" --message "${agentName} has joined: ${path.basename(filepath)}" -p`, {
                            stdio: 'ignore'
                        });
                        console.log('✓ Notified birdsan');
                    } catch {
                        // Ignore notification errors
                    }

                } catch (error) {
                    console.error(`\n❌ Failed to join: ${(error as Error).message}\n`);
                    process.exit(1);
                }

                console.log('\n' + '─'.repeat(40) + '\n');
            } else {
                // Show help if no action specified
                console.log('\n🤝 Myceliumail Collab\n');
                console.log('─'.repeat(40));
                console.log(`
Usage:
  mycmail collab --join <filepath>  Join a collaboration
  
Options:
  --join <filepath>    Path to the collab document
  -m, --message <msg>  Custom message to add

Examples:
  mycmail collab --join ~/Dev/treebird-internal/collab/COLLAB_topic.md
  mycmail collab --join ./collab.md -m "My thoughts on this..."
`);
                console.log('─'.repeat(40) + '\n');
            }
        });
}
