/**
 * claim command - Claim tasks from collaboration documents
 * 
 * Allows agents to claim tasks from collab docs or MAMMOTH_HUNT_TASKS.md
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import * as fs from 'fs';
import * as path from 'path';

interface ClaimResult {
    success: boolean;
    taskName: string;
    filepath: string;
}

function findTaskLine(content: string, taskPattern: string): { line: string; lineNumber: number } | null {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match task lines: - [ ] Task, | Task | Status |, etc.
        if (line.toLowerCase().includes(taskPattern.toLowerCase())) {
            return { line, lineNumber: i };
        }
    }
    return null;
}

function claimTaskInFile(filepath: string, taskPattern: string, agentId: string, agentName: string): ClaimResult {
    let content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    let claimed = false;
    let taskName = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Case 1: Markdown checkbox - [ ] Task
        if (line.includes('[ ]') && line.toLowerCase().includes(taskPattern.toLowerCase())) {
            lines[i] = line.replace('[ ]', '[/]') + ` *(claimed by ${agentName})*`;
            taskName = line.replace(/^[\s\-\*]*\[[ x\/]\]\s*/, '').trim();
            claimed = true;
            break;
        }

        // Case 2: Table row | Task | ⬜ Open | or | Task | Status |
        if (line.includes('|') && line.toLowerCase().includes(taskPattern.toLowerCase())) {
            // Replace ⬜ Open with ⏳ In Progress
            if (line.includes('⬜')) {
                lines[i] = line.replace('⬜', '⏳').replace(/Open/i, `${agentId}`);
                taskName = extractTaskFromTableRow(line);
                claimed = true;
                break;
            }
        }
    }

    if (claimed) {
        fs.writeFileSync(filepath, lines.join('\n'));
    }

    return { success: claimed, taskName, filepath };
}

function extractTaskFromTableRow(line: string): string {
    // Extract task name from table row like: | 🔥 HIGH | Marksan CLI | Owner |
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    // Usually task name is in 2nd or 3rd column
    for (const cell of cells) {
        if (cell && !cell.match(/^(⬜|⏳|✅|🔥|🟡|🟢|HIGH|MED|LOW|Open|Started|Done)$/i)) {
            return cell.replace(/\*\*/g, '');
        }
    }
    return cells[0] || 'Unknown task';
}

function addClaimComment(filepath: string, agentName: string, agentId: string, taskName: string): void {
    let content = fs.readFileSync(filepath, 'utf-8');

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

    const claimComment = `
---

### ${agentName} (${agentId}) - ${date} ${timestamp}

**📋 Claimed task:** ${taskName}

Starting work on this now.
`;

    // Add before status section or at end
    const statusSection = content.indexOf('## Status');
    if (statusSection !== -1) {
        content = content.slice(0, statusSection) + claimComment + '\n' + content.slice(statusSection);
    } else {
        content += claimComment;
    }

    fs.writeFileSync(filepath, content);
}

export function createClaimCommand(): Command {
    return new Command('claim')
        .description('Claim a task from a collaboration document')
        .argument('<task>', 'Task name or keyword to search for')
        .option('-f, --file <filepath>', 'Path to collab document (default: searches common locations)')
        .option('-q, --quiet', 'Minimal output, just success/fail')
        .option('--no-comment', 'Do not add a claim comment to the document')
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
                console.log('\n📋 Claiming Task\n');
                console.log('─'.repeat(40));
                console.log(`Agent: ${agentName} (${agentId})`);
                console.log(`Task: "${task}"`);
            }

            let result: ClaimResult | null = null;

            // If specific file provided
            if (options.file) {
                if (!fs.existsSync(options.file)) {
                    console.error(`\n❌ File not found: ${options.file}\n`);
                    process.exit(1);
                }
                result = claimTaskInFile(options.file, task, agentId, agentName);
            } else {
                // Search for today's collab or mammoth hunt
                for (const searchPath of searchPaths) {
                    if (!fs.existsSync(searchPath)) continue;

                    const files = fs.readdirSync(searchPath)
                        .filter(f => f.endsWith('.md') && (f.includes('COLLAB') || f.includes('MAMMOTH')))
                        .sort()
                        .reverse(); // Most recent first

                    for (const file of files) {
                        const filepath = path.join(searchPath, file);
                        const content = fs.readFileSync(filepath, 'utf-8');

                        // Check if task exists in this file
                        const taskLine = findTaskLine(content, task);
                        if (taskLine) {
                            if (!options.quiet) {
                                console.log(`Found in: ${file}`);
                            }
                            result = claimTaskInFile(filepath, task, agentId, agentName);
                            break;
                        }
                    }
                    if (result?.success) break;
                }
            }

            if (result?.success) {
                if (!options.quiet) {
                    console.log(`\n✅ Claimed: "${result.taskName}"`);
                    console.log(`   File: ${path.basename(result.filepath)}`);
                }

                // Add claim comment
                if (options.comment !== false) {
                    addClaimComment(result.filepath, agentName, agentId, result.taskName);
                    if (!options.quiet) {
                        console.log('   Added claim comment to document');
                    }
                }

                // Notify birdsan
                try {
                    const { execFileSync } = await import('child_process');
                    execFileSync('mycmail', [
                        'send', 'bsan', 'Task claimed',
                        '--message', `${agentName} claimed: ${result.taskName}`,
                        '-p'
                    ], { stdio: 'ignore' });
                    if (!options.quiet) {
                        console.log('   Notified birdsan');
                    }
                } catch {
                    // Ignore notification errors
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
