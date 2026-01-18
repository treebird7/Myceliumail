/**
 * memory-notify command - Notify agents about new memories via Toaklink
 * 
 * Integrates Myceliumail subscriptions with Toak's Toaklink for real-time
 * memory notifications. When a memory is captured, this broadcasts to
 * all agents subscribed to matching tags.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { loadSubscriptions, shouldNotifyForTags, Subscription } from './subscribe.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Toaklink API types
interface ToaklinkSendResponse {
    channel_id: string;
    message_id: string;
}

/**
 * Send message via Toaklink (Hub direct messaging)
 */
async function sendToaklink(
    from: string,
    to: string,
    message: string,
    hubUrl: string
): Promise<ToaklinkSendResponse | null> {
    try {
        const url = `${hubUrl}/api/toaklink/send`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        if (process.env.HUB_AUTH_TOKEN) {
            headers['X-Auth-Token'] = process.env.HUB_AUTH_TOKEN;
        }
        headers['X-Agent-Id'] = from;

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ from, to, message })
        });

        if (!response.ok) {
            console.error(`Toaklink error for ${to}: ${response.status}`);
            return null;
        }

        return await response.json() as ToaklinkSendResponse;
    } catch (error) {
        console.error(`Failed to send to ${to}:`, error);
        return null;
    }
}

/**
 * Send push notification via Toak (for high-priority memories)
 */
async function sendToakPush(
    agentId: string,
    memory: MemoryNotification,
    hubUrl: string
): Promise<boolean> {
    try {
        // Submit as approval-style task for push notification
        const url = `${hubUrl}/api/tasks`;
        const task = {
            id: `memory-${memory.id}`,
            title: `🧠 Memory: ${memory.type} - ${memory.preview.slice(0, 30)}...`,
            description: `Tags: ${memory.tags.join(', ')}\n\n${memory.preview}`,
            type: 'notification',
            status: 'done', // Auto-done - just informational
            priority: 'P1',
            owner: agentId,
            created_by: memory.author,
            metadata: { memory_id: memory.id, tags: memory.tags }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: [task], creator: 'myceliumail' })
        });

        return response.ok;
    } catch {
        return false;
    }
}

interface MemoryNotification {
    id: string;
    type: string;
    author: string;
    tags: string[];
    preview: string;
    source?: string;
}

interface AgentSubscription {
    agentId: string;
    subscriptions: Subscription[];
}

/**
 * Get known agents from ecosystem (simplified - checks for subscription files)
 */
function getKnownAgents(): string[] {
    // Known flock agents - could be expanded to read from a registry
    return ['birdsan', 'watsan', 'sherlocksan', 'sancho', 'spidersan',
        'mappersan', 'artisan', 'marksan', 'yosef', 'mycm', 'srlk'];
}

/**
 * Load global subscription registry (for all agents)
 * In a real deployment, this would query a shared database
 */
function loadGlobalSubscriptions(): Map<string, string[]> {
    const registry = new Map<string, string[]>();

    // For now, read from local subscriptions
    // In production, this would be a Supabase table or Hub API
    const localSubs = loadSubscriptions();
    for (const sub of localSubs.subscriptions) {
        if (!registry.has(sub.tag)) {
            registry.set(sub.tag, []);
        }
        registry.get(sub.tag)!.push(localSubs.agentId);
    }

    return registry;
}

export function createMemoryNotifyCommand(): Command {
    return new Command('memory-notify')
        .description('🧠 Notify agents about new memories via Toaklink')
        .argument('<memory-id>', 'Memory ID (e.g., mem-2026-01-18-001)')
        .option('--tags <tags...>', 'Memory tags (required)')
        .option('--type <type>', 'Memory type (lesson, win, pain, etc.)', 'lesson')
        .option('--author <author>', 'Who captured the memory')
        .option('--preview <text>', 'Preview text of the memory')
        .option('--push', 'Also send push notification via Toak')
        .option('--dry-run', 'Show what would be sent without sending')
        .option('--json', 'Output as JSON')
        .action(async (memoryId: string, options) => {
            const config = loadConfig();
            const agentId = config.agentId || 'mycm';
            const hubUrl = config.hubUrl || process.env.HUB_URL || 'https://hub.treebird.uk';

            if (!options.tags || options.tags.length === 0) {
                console.error('❌ --tags required. Example: --tags memoak lessons ollama');
                process.exit(1);
            }

            const memory: MemoryNotification = {
                id: memoryId,
                type: options.type,
                author: options.author || agentId,
                tags: options.tags,
                preview: options.preview || `Memory ${memoryId}`,
            };

            // Check who should be notified based on this agent's subscriptions
            const { immediate, digest, matchedTags } = shouldNotifyForTags(memory.tags);

            // Build notification message
            const emoji = memory.type === 'lesson' ? '📚' :
                memory.type === 'win' ? '🎉' :
                    memory.type === 'pain' ? '😖' :
                        memory.type === 'insight' ? '💡' :
                            memory.type === 'pattern' ? '🔄' : '🧠';

            const notifyMessage = `${emoji} New ${memory.type}: ${memory.preview.slice(0, 100)}...
Tags: ${memory.tags.map(t => `#${t}`).join(' ')}
Memory: ${memory.id}
Author: ${memory.author}

💡 You're subscribed to: ${matchedTags.map(t => `#${t}`).join(', ')}`;

            if (options.json) {
                console.log(JSON.stringify({
                    memory,
                    matchedTags,
                    immediate,
                    digest,
                    message: notifyMessage,
                    dryRun: options.dryRun
                }, null, 2));
                return;
            }

            if (options.dryRun) {
                console.log('🔍 Dry run - would send:\n');
                console.log('Memory:', memory);
                console.log('Matched tags:', matchedTags);
                console.log('Would notify immediately:', immediate);
                console.log('Would add to digest:', digest);
                console.log('\nMessage preview:');
                console.log('---');
                console.log(notifyMessage);
                console.log('---');
                return;
            }

            // For now, broadcast to collab channel if immediate notification is on
            if (immediate && matchedTags.length > 0) {
                console.log(`🔔 Sending via Toaklink...`);

                // Send to broadcast channel (special "flock" agent for group messages)
                const result = await sendToaklink(agentId, 'flock', notifyMessage, hubUrl);

                if (result) {
                    console.log(`✅ Broadcast sent to #flock`);
                    console.log(`   Channel: ${result.channel_id}`);
                    console.log(`   Message: ${result.message_id}`);
                } else {
                    console.log(`⚠️  Toaklink send failed - Hub may be offline`);
                }

                // If push requested, also send via Toak
                if (options.push) {
                    console.log(`📱 Sending push notification...`);
                    const pushed = await sendToakPush(agentId, memory, hubUrl);
                    if (pushed) {
                        console.log(`✅ Push notification sent`);
                    } else {
                        console.log(`⚠️  Push failed`);
                    }
                }
            } else {
                console.log(`📋 Memory ${memoryId} - no immediate notifications triggered`);
                if (digest) {
                    console.log(`   Will be included in next digest`);
                }
            }

            console.log(`\n📊 Notification complete`);
            console.log(`   Memory: ${memory.id}`);
            console.log(`   Tags: ${memory.tags.join(', ')}`);
            console.log(`   Matched: ${matchedTags.length > 0 ? matchedTags.join(', ') : 'none'}`);
        });
}

/**
 * Programmatic API for Memoak to call after enrichment
 */
export async function notifyMemoryCapture(memory: MemoryNotification): Promise<{
    notified: string[];
    failed: string[];
    digestQueued: string[];
}> {
    const config = loadConfig();
    const agentId = config.agentId || 'mycm';
    const hubUrl = config.hubUrl || process.env.HUB_URL || 'https://hub.treebird.uk';

    const { immediate, digest, matchedTags } = shouldNotifyForTags(memory.tags);

    const result = {
        notified: [] as string[],
        failed: [] as string[],
        digestQueued: [] as string[]
    };

    if (!immediate && !digest) {
        return result;
    }

    const emoji = memory.type === 'lesson' ? '📚' :
        memory.type === 'win' ? '🎉' :
            memory.type === 'pain' ? '😖' :
                memory.type === 'insight' ? '💡' : '🧠';

    const message = `${emoji} New ${memory.type}: ${memory.preview.slice(0, 80)}...
#${matchedTags.join(' #')}
ID: ${memory.id}`;

    if (immediate) {
        const sent = await sendToaklink(agentId, 'flock', message, hubUrl);
        if (sent) {
            result.notified.push('flock');
        } else {
            result.failed.push('flock');
        }
    }

    if (digest) {
        result.digestQueued.push(agentId);
    }

    return result;
}
