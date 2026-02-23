/**
 * pool command - Interact with Hub Task Pool
 * 
 * Claim, complete, and manage tasks from the Hub's Task Pool API.
 * This is the Task Torrenting interface for agents.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';

interface PoolTask {
    id: string;
    parent: string;
    title: string;
    skills: string[];
    complexity: number;
    estimatedMinutes: number;
    blockedBy: string[];
    status: 'available' | 'claimed' | 'in_progress' | 'stuck' | 'completed';
    assignedAgent: string | null;
    createdBy: string;
    createdAt: string;
    claimedAt?: string;
    completedAt?: string;
}

/**
 * Get Hub URL (read at call time so dotenv has loaded)
 */
function getHubUrl(): string {
    return process.env.HUB_URL || 'https://hub.treebird.uk';
}

async function hubFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const hubUrl = getHubUrl();
    const authToken = process.env.BRIDGE_AUTH_TOKEN || '';

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (authToken) {
        headers['X-Auth-Token'] = authToken;
    }

    return fetch(`${hubUrl}${endpoint}`, {
        ...options,
        headers,
    });
}

/**
 * List available tasks from the pool
 */
async function listTasks(options: { skills?: string; available?: boolean }): Promise<void> {
    console.log('\n🎯 Hub Task Pool\n');
    console.log('─'.repeat(50));

    try {
        const params = new URLSearchParams();
        if (options.skills) params.set('skills', options.skills);
        if (options.available) params.set('status', 'available');

        const response = await hubFetch(`/api/tasks?${params}`);

        if (!response.ok) {
            throw new Error(`Hub API error: ${response.status}`);
        }

        const data = await response.json() as { tasks: PoolTask[] };
        const tasks = data.tasks || [];

        if (tasks.length === 0) {
            console.log('📭 No tasks in the pool');
            console.log('\nUse `mappersan chop "task" --publish` to add tasks');
        } else {
            console.log(`Found ${tasks.length} task(s):\n`);

            for (const task of tasks) {
                const statusIcon = {
                    available: '⬜',
                    claimed: '⏳',
                    in_progress: '🔄',
                    stuck: '🚫',
                    completed: '✅'
                }[task.status] || '❓';

                const agent = task.assignedAgent ? ` → ${task.assignedAgent}` : '';
                console.log(`  ${statusIcon} ${task.id} | C${task.complexity} | ${task.estimatedMinutes}m | ${task.skills.join(' ')}${agent}`);
                console.log(`     ${task.title}`);
            }
        }
    } catch (error) {
        console.error(`\n❌ Failed to fetch tasks: ${error instanceof Error ? error.message : error}`);
        console.error(`   Hub URL: ${getHubUrl()}`);
    }

    console.log('\n' + '─'.repeat(50) + '\n');
}

/**
 * Claim a task from the pool
 */
async function claimTask(taskId: string, options: { quiet?: boolean }): Promise<void> {
    const config = loadConfig();
    const agentId = config.agentId;

    if (!options.quiet) {
        console.log('\n📋 Claiming Task\n');
        console.log('─'.repeat(40));
        console.log(`Agent: ${agentId}`);
        console.log(`Task: ${taskId}`);
    }

    try {
        const response = await hubFetch(`/api/tasks/${taskId}/claim`, {
            method: 'POST',
            body: JSON.stringify({ agent: agentId }),
        });

        if (response.status === 409) {
            const data = await response.json() as { claimedBy?: string };
            console.log(`\n⏳ Task already claimed by ${data.claimedBy || 'another agent'}`);
            return;
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Hub API error: ${response.status} - ${text}`);
        }

        const data = await response.json() as { task: PoolTask };

        if (!options.quiet) {
            console.log(`\n✅ Claimed: "${data.task.title}"`);
            console.log(`   Skills: ${data.task.skills.join(', ')}`);
            console.log(`   Estimated: ${data.task.estimatedMinutes} min`);
            console.log(`   Complexity: ${data.task.complexity}`);

            if (data.task.blockedBy.length > 0) {
                console.log(`   ⚠️  Blocked by: ${data.task.blockedBy.join(', ')}`);
            }
        }

        // Notify via mycmail
        try {
            const { execFileSync } = await import('child_process');
            execFileSync('mycmail', [
                'send', 'bsan', `Task claimed: ${taskId}`,
                '--message', JSON.stringify({ taskId, agent: agentId, title: data.task.title }),
                '-p'
            ], { stdio: 'ignore' });
            if (!options.quiet) {
                console.log('   📢 Notified birdsan');
            }
        } catch {
            // Ignore notification errors
        }

    } catch (error) {
        console.error(`\n❌ Failed to claim: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }

    if (!options.quiet) {
        console.log('\n' + '─'.repeat(40) + '\n');
    }
}

/**
 * Mark a task as complete
 */
async function completeTask(taskId: string, options: { output?: string; quiet?: boolean }): Promise<void> {
    const config = loadConfig();
    const agentId = config.agentId;

    if (!options.quiet) {
        console.log('\n✅ Completing Task\n');
        console.log('─'.repeat(40));
        console.log(`Agent: ${agentId}`);
        console.log(`Task: ${taskId}`);
    }

    try {
        const response = await hubFetch(`/api/tasks/${taskId}/complete`, {
            method: 'POST',
            body: JSON.stringify({
                agent: agentId,
                output: options.output || null
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Hub API error: ${response.status} - ${text}`);
        }

        const data = await response.json() as { task: PoolTask };

        if (!options.quiet) {
            console.log(`\n✅ Completed: "${data.task.title}"`);
            if (options.output) {
                console.log(`   Output: ${options.output.slice(0, 50)}...`);
            }
        }

        // Notify via mycmail
        try {
            const { execFileSync } = await import('child_process');
            execFileSync('mycmail', [
                'send', 'bsan', `Task complete: ${taskId}`,
                '--message', JSON.stringify({ taskId, agent: agentId, title: data.task.title }),
                '-p'
            ], { stdio: 'ignore' });
            if (!options.quiet) {
                console.log('   📢 Notified birdsan');
            }
        } catch {
            // Ignore notification errors
        }

    } catch (error) {
        console.error(`\n❌ Failed to complete: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }

    if (!options.quiet) {
        console.log('\n' + '─'.repeat(40) + '\n');
    }
}

/**
 * Mark a task as stuck/blocked
 */
async function stuckTask(taskId: string, reason: string, options: { quiet?: boolean }): Promise<void> {
    const config = loadConfig();
    const agentId = config.agentId;

    if (!options.quiet) {
        console.log('\n🚫 Marking Task as Stuck\n');
        console.log('─'.repeat(40));
        console.log(`Agent: ${agentId}`);
        console.log(`Task: ${taskId}`);
        console.log(`Reason: ${reason}`);
    }

    try {
        const response = await hubFetch(`/api/tasks/${taskId}/stuck`, {
            method: 'POST',
            body: JSON.stringify({
                agent: agentId,
                reason
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Hub API error: ${response.status} - ${text}`);
        }

        if (!options.quiet) {
            console.log(`\n🚫 Marked as stuck`);
            console.log('   Other agents or Yosef may help unblock');
        }

        // Notify via mycmail to get help
        try {
            const { execFileSync } = await import('child_process');
            execFileSync('mycmail', [
                'send', 'ysan', `Help needed: ${taskId}`,
                '--message', JSON.stringify({ taskId, agent: agentId, reason }),
                '-p'
            ], { stdio: 'ignore' });
            if (!options.quiet) {
                console.log('   📢 Requested help from Yosef');
            }
        } catch {
            // Ignore notification errors
        }

    } catch (error) {
        console.error(`\n❌ Failed to mark stuck: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }

    if (!options.quiet) {
        console.log('\n' + '─'.repeat(40) + '\n');
    }
}

/**
 * Release a claimed task back to the pool
 */
async function releaseTask(taskId: string, options: { quiet?: boolean }): Promise<void> {
    const config = loadConfig();
    const agentId = config.agentId;

    if (!options.quiet) {
        console.log('\n🔄 Releasing Task\n');
        console.log('─'.repeat(40));
        console.log(`Agent: ${agentId}`);
        console.log(`Task: ${taskId}`);
    }

    try {
        const response = await hubFetch(`/api/tasks/${taskId}/release`, {
            method: 'POST',
            body: JSON.stringify({
                agent: agentId,
                reason: 'Manually released'
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Hub API error: ${response.status} - ${text}`);
        }

        if (!options.quiet) {
            console.log(`\n✅ Task released back to pool`);
            console.log('   Other agents can now claim it');
        }

    } catch (error) {
        console.error(`\n❌ Failed to release: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    }

    if (!options.quiet) {
        console.log('\n' + '─'.repeat(40) + '\n');
    }
}

/**
 * Create the pool command group
 */
export function createPoolCommand(): Command {
    const pool = new Command('pool')
        .description('Interact with Hub Task Pool (Task Torrenting)');

    // List tasks
    pool
        .command('list')
        .alias('ls')
        .description('List tasks in the pool')
        .option('-s, --skills <skills>', 'Filter by skills (comma-separated)')
        .option('-a, --available', 'Show only available tasks')
        .action(async (options) => {
            await listTasks(options);
        });

    // Claim a task
    pool
        .command('claim')
        .description('Claim a task from the pool')
        .argument('<task-id>', 'Task ID to claim (e.g., DASH-001)')
        .option('-q, --quiet', 'Minimal output')
        .action(async (taskId, options) => {
            await claimTask(taskId, options);
        });

    // Complete a task
    pool
        .command('done')
        .alias('complete')
        .description('Mark a task as complete')
        .argument('<task-id>', 'Task ID to complete')
        .option('-o, --output <text>', 'Output or result summary')
        .option('-q, --quiet', 'Minimal output')
        .action(async (taskId, options) => {
            await completeTask(taskId, options);
        });

    // Mark as stuck
    pool
        .command('stuck')
        .description('Mark a task as blocked/stuck')
        .argument('<task-id>', 'Task ID that is stuck')
        .argument('<reason>', 'Reason for being stuck')
        .option('-q, --quiet', 'Minimal output')
        .action(async (taskId, reason, options) => {
            await stuckTask(taskId, reason, options);
        });

    // Release a task
    pool
        .command('release')
        .description('Release a claimed task back to the pool')
        .argument('<task-id>', 'Task ID to release')
        .option('-q, --quiet', 'Minimal output')
        .action(async (taskId, options) => {
            await releaseTask(taskId, options);
        });

    return pool;
}
