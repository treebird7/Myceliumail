/**
 * hub-status command - Check Hub connectivity and fleet status
 * 
 * Shows connection status, agent fleet, and MCP health.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';

interface AgentStatus {
    name: string;
    glyph: string;
    status: 'online' | 'offline';
    lastSeen: string | null;
    task: string | null;
}

interface HubStatus {
    connected: boolean;
    hubUrl: string;
    agents: Record<string, AgentStatus>;
    chatRecent: number;
    error?: string;
}

async function getHubStatus(hubUrl: string): Promise<HubStatus> {
    const result: HubStatus = {
        connected: false,
        hubUrl,
        agents: {},
        chatRecent: 0
    };

    try {
        // Test connection with agents endpoint
        const agentsResponse = await fetch(`${hubUrl}/api/agents`, {
            signal: AbortSignal.timeout(5000)
        });

        if (agentsResponse.ok) {
            result.connected = true;
            result.agents = await agentsResponse.json() as Record<string, AgentStatus>;
        }

        // Try to get recent chat count
        try {
            const chatResponse = await fetch(`${hubUrl}/api/chat?limit=100`, {
                signal: AbortSignal.timeout(3000)
            });
            if (chatResponse.ok) {
                const messages = await chatResponse.json() as unknown[];
                result.chatRecent = messages.length;
            }
        } catch {
            // Chat endpoint might not exist
        }

    } catch (err) {
        result.error = (err as Error).message;
    }

    return result;
}

function formatStatus(status: HubStatus, verbose: boolean): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('🌐 Hub Status');
    lines.push('─'.repeat(40));
    lines.push(`URL: ${status.hubUrl}`);
    lines.push(`Connection: ${status.connected ? '✅ Connected' : '❌ Disconnected'}`);

    if (status.error) {
        lines.push(`Error: ${status.error}`);
    }

    if (status.connected) {
        const agents = Object.entries(status.agents);
        const online = agents.filter(([, a]) => a.status === 'online');
        const offline = agents.filter(([, a]) => a.status === 'offline');

        lines.push('');
        lines.push(`📡 Fleet: ${online.length} online / ${agents.length} total`);
        
        if (verbose || online.length > 0) {
            lines.push('');
            lines.push('Online Agents:');
            if (online.length === 0) {
                lines.push('  (none)');
            } else {
                for (const [id, agent] of online) {
                    const lastSeen = agent.lastSeen 
                        ? new Date(agent.lastSeen).toLocaleTimeString() 
                        : 'now';
                    lines.push(`  ${agent.glyph} ${agent.name} (${id}) - last seen ${lastSeen}`);
                    if (agent.task) {
                        lines.push(`     └─ Task: ${agent.task}`);
                    }
                }
            }
        }

        if (verbose && offline.length > 0) {
            lines.push('');
            lines.push('Offline Agents:');
            for (const [id, agent] of offline) {
                lines.push(`  ${agent.glyph} ${agent.name} (${id})`);
            }
        }

        if (status.chatRecent > 0) {
            lines.push('');
            lines.push(`💬 Recent chat messages: ${status.chatRecent}`);
        }
    }

    lines.push('');
    lines.push('─'.repeat(40));
    lines.push('');

    return lines.join('\n');
}

export function createHubStatusCommand(): Command {
    return new Command('hub-status')
        .description('Check Hub connectivity and fleet status')
        .option('-v, --verbose', 'Show offline agents and extra details')
        .option('--json', 'Output as JSON')
        .option('-u, --url <url>', 'Hub URL to check')
        .action(async (options) => {
            const config = loadConfig();
            
            // Priority: --url flag > HUB_URL env > config > default
            const hubUrl = options.url 
                || process.env.HUB_URL 
                || config.hubUrl 
                || 'https://hub.treebird.uk';

            const status = await getHubStatus(hubUrl);

            if (options.json) {
                console.log(JSON.stringify(status, null, 2));
            } else {
                console.log(formatStatus(status, options.verbose));
            }

            // Exit with error code if disconnected
            if (!status.connected) {
                process.exit(1);
            }
        });
}
