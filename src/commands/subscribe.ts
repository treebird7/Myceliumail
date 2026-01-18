/**
 * subscribe command - Manage memory tag subscriptions
 * 
 * Part of the Memoak integration for Myceliumail.
 * Agents can subscribe to memory tags to receive notifications
 * when new memories matching their interests are captured.
 */

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { loadConfig } from '../lib/config.js';

const SUBSCRIPTIONS_FILE = join(homedir(), '.myceliumail', 'subscriptions.json');

export interface Subscription {
    tag: string;
    addedAt: string;
    notifyOn: 'all' | 'relevant' | 'digest';
}

export interface SubscriptionsData {
    agentId: string;
    subscriptions: Subscription[];
    digestSchedule?: 'daily' | 'weekly';
    lastDigest?: string;
}

/**
 * Load subscriptions from file
 */
export function loadSubscriptions(): SubscriptionsData {
    const config = loadConfig();

    if (existsSync(SUBSCRIPTIONS_FILE)) {
        try {
            const raw = readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
            return JSON.parse(raw);
        } catch {
            // Invalid file, return defaults
        }
    }

    return {
        agentId: config.agentId,
        subscriptions: [],
        digestSchedule: 'daily',
    };
}

/**
 * Save subscriptions to file
 */
function saveSubscriptions(data: SubscriptionsData): void {
    const dir = join(homedir(), '.myceliumail');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Check if agent is subscribed to a tag
 */
export function isSubscribedTo(tag: string): boolean {
    const data = loadSubscriptions();
    const normalizedTag = tag.toLowerCase().replace(/^#/, '');
    return data.subscriptions.some(s => s.tag === normalizedTag);
}

/**
 * Get all tags an agent should be notified about for a memory
 */
export function getMatchingSubscriptions(memoryTags: string[]): Subscription[] {
    const data = loadSubscriptions();
    const normalizedTags = memoryTags.map(t => t.toLowerCase().replace(/^#/, ''));
    return data.subscriptions.filter(s => normalizedTags.includes(s.tag));
}

export function createSubscribeCommand(): Command {
    const cmd = new Command('subscribe')
        .description('🧠 Subscribe to memory tags for Memoak notifications')
        .argument('[tags...]', 'Tags to subscribe to (without #)')
        .option('--list', 'List current subscriptions')
        .option('--remove <tag>', 'Remove a subscription')
        .option('--clear', 'Clear all subscriptions')
        .option('--notify <mode>', 'Notification mode: all, relevant, or digest', 'all')
        .option('--digest <schedule>', 'Digest schedule: daily or weekly')
        .option('--json', 'Output as JSON')
        .action(async (tags: string[], options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (agentId === 'anonymous') {
                console.error('❌ Agent ID not configured. Run: mycmail keygen <agent-id>');
                process.exit(1);
            }

            let data = loadSubscriptions();
            data.agentId = agentId;

            // List subscriptions
            if (options.list || (tags.length === 0 && !options.remove && !options.clear && !options.digest)) {
                if (options.json) {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }

                if (data.subscriptions.length === 0) {
                    console.log('📭 No subscriptions yet\n');
                    console.log('💡 Subscribe to memory tags:');
                    console.log('   mycmail subscribe ollama workers security');
                    console.log('   mycmail subscribe --notify digest lessons');
                    return;
                }

                console.log('🔔 Memory Tag Subscriptions\n');
                console.log(`Agent: ${data.agentId}`);
                console.log(`Digest: ${data.digestSchedule || 'daily'}\n`);

                for (const sub of data.subscriptions) {
                    const mode = sub.notifyOn === 'all' ? '🔔' : sub.notifyOn === 'relevant' ? '🔕' : '📋';
                    console.log(`  ${mode} #${sub.tag} (${sub.notifyOn})`);
                }

                console.log('\n💡 When Memoak captures a memory with these tags,');
                console.log('   you\'ll be notified via mycmail.');
                return;
            }

            // Clear all subscriptions
            if (options.clear) {
                data.subscriptions = [];
                saveSubscriptions(data);
                console.log('🗑️  Cleared all subscriptions');
                return;
            }

            // Remove a subscription
            if (options.remove) {
                const tag = options.remove.toLowerCase().replace(/^#/, '');
                const before = data.subscriptions.length;
                data.subscriptions = data.subscriptions.filter(s => s.tag !== tag);
                saveSubscriptions(data);

                if (data.subscriptions.length < before) {
                    console.log(`✅ Unsubscribed from #${tag}`);
                } else {
                    console.log(`❓ Not subscribed to #${tag}`);
                }
                return;
            }

            // Update digest schedule
            if (options.digest) {
                if (!['daily', 'weekly'].includes(options.digest)) {
                    console.error('❌ Digest must be "daily" or "weekly"');
                    process.exit(1);
                }
                data.digestSchedule = options.digest;
                saveSubscriptions(data);
                console.log(`📋 Digest schedule set to: ${options.digest}`);
                if (tags.length === 0) return;
            }

            // Add new subscriptions
            if (tags.length > 0) {
                const notifyOn = ['all', 'relevant', 'digest'].includes(options.notify)
                    ? options.notify as 'all' | 'relevant' | 'digest'
                    : 'all';

                const added: string[] = [];
                const existing: string[] = [];

                for (const rawTag of tags) {
                    const tag = rawTag.toLowerCase().replace(/^#/, '');

                    if (data.subscriptions.some(s => s.tag === tag)) {
                        existing.push(tag);
                    } else {
                        data.subscriptions.push({
                            tag,
                            addedAt: new Date().toISOString(),
                            notifyOn,
                        });
                        added.push(tag);
                    }
                }

                saveSubscriptions(data);

                if (added.length > 0) {
                    console.log(`✅ Subscribed to: ${added.map(t => `#${t}`).join(', ')}`);
                    console.log(`   Mode: ${notifyOn}`);
                }
                if (existing.length > 0) {
                    console.log(`ℹ️  Already subscribed: ${existing.map(t => `#${t}`).join(', ')}`);
                }

                console.log(`\n📊 Total subscriptions: ${data.subscriptions.length}`);
            }
        });

    return cmd;
}

/**
 * Helper: Get all agents subscribed to any of the given tags
 * Note: This would need a central registry or Supabase table in production.
 * For now, it only checks the local agent's subscriptions.
 */
export function shouldNotifyForTags(memoryTags: string[]): {
    immediate: boolean;
    digest: boolean;
    matchedTags: string[];
} {
    const matches = getMatchingSubscriptions(memoryTags);

    if (matches.length === 0) {
        return { immediate: false, digest: false, matchedTags: [] };
    }

    const immediate = matches.some(m => m.notifyOn === 'all' || m.notifyOn === 'relevant');
    const digest = matches.some(m => m.notifyOn === 'digest');

    return {
        immediate,
        digest,
        matchedTags: matches.map(m => m.tag),
    };
}
