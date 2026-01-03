/**
 * complete command - Mark tasks as complete in collaboration documents
 * 
 * Counterpart to `claim` - marks tasks as done and adds completion notes.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import * as fs from 'fs';
import * as path from 'path';

interface CompleteResult {
    success: boolean;
    taskName: string;
    filepath: string;
}

function completeTaskInFile(filepath: string, taskPattern: string, agentId: string, agentName: string): CompleteResult {
    let content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    let completed = false;
    let taskName = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Case 1: Markdown checkbox - [/] Task or - [ ] Task
        if ((line.includes('[/]') || line.includes('[ ]')) && line.toLowerCase().includes(taskPattern.toLowerCase())) {
            lines[i] = line.replace('[/]', '[x]').replace('[ ]', '[x]');
            // Remove "(claimed by ...)" if present
            lines[i] = lines[i].replace(/\s*\*\(claimed by.*?\)\*/, '');
            taskName = line.replace(/^[\s\-\*]*\[[ x\/]\]\s*/, '').replace(/\s*\*\(claimed by.*?\)\*/, '').trim();
            completed = true;
            break;
        }

        // Case 2: Table row with ⏳ or ⬜ status
        if (line.includes('|') && line.toLowerCase().includes(taskPattern.toLowerCase())) {
            if (line.includes('⏳') || line.includes('⬜')) {
                lines[i] = line.replace('⏳', '✅').replace('⬜', '✅');
                // Update status text if present
                lines[i] = lines[i].replace(/In Progress/i, 'Done').replace(/Open/i, 'Done');
                taskName = extractTaskFromTableRow(line);
                completed = true;
                break;
            }
        }
    }

    if (completed) {
        fs.writeFileSync(filepath, lines.join('\n'));
    }

    return { success: completed, taskName, filepath };
}

function extractTaskFromTableRow(line: string): string {
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    for (const cell of cells) {
        if (cell && !cell.match(/^(⬜|⏳|✅|🔥|🟡|🟢|HIGH|MED|LOW|Open|Started|Done|In Progress)$/i)) {
            return cell.replace(/\*\*/g, '');
        }
    }
    return cells[0] || 'Unknown task';
}

function addCompletionComment(filepath: string, agentName: string, agentId: string, taskName: string, notes: string): void {
    let content = fs.readFileSync(filepath, 'utf-8');

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

    const completionComment = `
---

### ${agentName} (${agentId}) - ${date} ${timestamp}

**✅ Task Complete:** ${taskName}

${notes || 'Task completed successfully.'}
`;

    // Add before status section or at end
    const statusSection = content.indexOf('## Status');
    if (statusSection !== -1) {
        content = content.slice(0, statusSection) + completionComment + '\n' + content.slice(statusSection);
    } else {
        content += completionComment;
    }

    fs.writeFileSync(filepath, content);
}

export function createCompleteCommand(): Command {
    return new Command('complete')
        .description('Mark a task as complete in a collaboration document')
        .argument('<task>', 'Task name or keyword to search for')
        .option('-f, --file <filepath>', 'Path to collab document (default: searches common locations)')
        .option('-n, --notes <notes>', 'Completion notes or summary')
        .option('-c, --commit <hash>', 'Git commit hash for reference')
        .option('-q, --quiet', 'Minimal output, just success/fail')
        .option('--no-comment', 'Do not add a completion comment to the document')
        .action(async (task: string, options) => {
            const config = loadConfig();
            const agentId = config.agentId;
            const agentName = 'Myceliumail';

            // Common collab file locations
            const searchPaths = options.file ? [options.file] : [
                process.env.TREEBIRD_INTERNAL ? `${process.env.TREEBIRD_INTERNAL}/collab` : null,
                '/Users/freedbird/Dev/treebird-internal/collab',
                process.cwd(),
            ].filter(Boolean) as string[];

            if (!options.quiet) {
                console.log('\n✅ Completing Task\n');
                console.log('─'.repeat(40));
                console.log(`Agent: ${agentName} (${agentId})`);
                console.log(`Task: "${task}"`);
            }

            let result: CompleteResult | null = null;

            // If specific file provided
            if (options.file) {
                if (!fs.existsSync(options.file)) {
                    console.error(`\n❌ File not found: ${options.file}\n`);
                    process.exit(1);
                }
                result = completeTaskInFile(options.file, task, agentId, agentName);
            } else {
                // Search for collab files
                for (const searchPath of searchPaths) {
                    if (!fs.existsSync(searchPath)) continue;

                    const files = fs.readdirSync(searchPath)
                        .filter(f => f.endsWith('.md') && (f.includes('COLLAB') || f.includes('MAMMOTH')))
                        .sort()
                        .reverse();

                    for (const file of files) {
                        const filepath = path.join(searchPath, file);
                        const content = fs.readFileSync(filepath, 'utf-8');

                        if (content.toLowerCase().includes(task.toLowerCase())) {
                            if (!options.quiet) {
                                console.log(`Found in: ${file}`);
                            }
                            result = completeTaskInFile(filepath, task, agentId, agentName);
                            break;
                        }
                    }
                    if (result?.success) break;
                }
            }

            if (result?.success) {
                if (!options.quiet) {
                    console.log(`\n✅ Completed: "${result.taskName}"`);
                    console.log(`   File: ${path.basename(result.filepath)}`);
                }

                // Build completion notes
                let notes = options.notes || '';
                if (options.commit) {
                    notes += `\n\n**Commit:** \`${options.commit}\``;
                }

                // Add completion comment
                if (options.comment !== false) {
                    addCompletionComment(result.filepath, agentName, agentId, result.taskName, notes);
                    if (!options.quiet) {
                        console.log('   Added completion note to document');
                    }
                }

                // Notify birdsan
                try {
                    const { execFileSync } = await import('child_process');
                    execFileSync('mycmail', [
                        'send', 'bsan', 'Task complete',
                        '--message', `${agentName} completed: ${result.taskName}`,
                        '-p'
                    ], { stdio: 'ignore' });
                    if (!options.quiet) {
                        console.log('   Notified birdsan');
                    }
                } catch {
                    // Ignore notification errors
                }

                // Post to Hub
                try {
                    const hubUrl = process.env.HUB_URL || 'https://hub.treebird.uk';
                    await fetch(`${hubUrl}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sender: agentName,
                            text: `✅ Task complete: ${result.taskName}`,
                            glyph: '🍄'
                        })
                    });
                    if (!options.quiet) {
                        console.log('   Posted to Hub chat');
                    }
                } catch {
                    // Ignore Hub errors
                }

                if (!options.quiet) {
                    console.log('\n' + '─'.repeat(40) + '\n');
                }
            } else {
                console.error(`\n❌ Task not found: "${task}"\n`);
                console.error('Searched in:');
                searchPaths.forEach(p => console.error(`  - ${p}`));
                process.exit(1);
            }
        });
}
