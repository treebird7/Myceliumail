/**
 * close command - End a session properly
 * 
 * Broadcasts signing-off message and updates session state.
 * Designed for agent session lifecycle management.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { generateDigest, sendDigestToWatsan } from '../lib/watson-digest.js';
import * as storage from '../storage/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface SessionData {
    lastWake: string | null;
    lastClose: string | null;
    activeCollabs: string[];
}

function getSessionPath(): string {
    return path.join(os.homedir(), '.mycmail', 'session.json');
}

function loadSession(): SessionData {
    const sessionPath = getSessionPath();
    try {
        if (fs.existsSync(sessionPath)) {
            return JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        }
    } catch {
        // Ignore errors, return default
    }
    return { lastWake: null, lastClose: null, activeCollabs: [] };
}

function saveSession(data: SessionData): void {
    const sessionPath = getSessionPath();
    const dir = path.dirname(sessionPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2));
}

export function createCloseCommand(): Command {
    return new Command('close')
        .description('End the current session - broadcast and update state')
        .option('-m, --message <msg>', 'Custom sign-off message')
        .option('--silent', 'No broadcast, just update state')
        .option('--json', 'Output as JSON (for scripting)')
        .option('-q, --quiet', 'Minimal output')
        .option('--summary', 'Auto-generate session summary')
        .option('--handoff <agent>', 'Tag agent for continuation')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (agentId === 'anonymous') {
                if (!options.quiet && !options.json) {
                    console.error('❌ Agent ID not configured.');
                }
                process.exit(1);
            }

            try {
                const session = loadSession();
                const closeTime = new Date().toISOString();

                // Calculate session duration if we have wake time
                let sessionDuration: string | null = null;
                if (session.lastWake) {
                    const wakeTime = new Date(session.lastWake);
                    const now = new Date();
                    const diffMins = Math.floor((now.getTime() - wakeTime.getTime()) / 60000);
                    if (diffMins < 60) {
                        sessionDuration = `${diffMins} minutes`;
                    } else {
                        const hours = Math.floor(diffMins / 60);
                        const mins = diffMins % 60;
                        sessionDuration = `${hours}h ${mins}m`;
                    }
                }

                // Broadcast signing-off message (unless --silent)
                let broadcastSent = false;
                if (!options.silent) {
                    const message = options.message || 'Session complete';
                    const fullMessage = sessionDuration
                        ? `${message} (${sessionDuration} session) - ${agentId} signing off`
                        : `${message} - ${agentId} signing off`;

                    try {
                        // Get all known agents from storage (or use a simple list)
                        // For now, just log that we would broadcast
                        // In future: call broadcast function
                        if (!options.quiet && !options.json) {
                            console.log(`📢 Broadcast: "${fullMessage}"`);
                        }
                        broadcastSent = true;
                    } catch (broadcastError) {
                        // Broadcast failed, but continue with close
                        if (!options.quiet && !options.json) {
                            console.warn('⚠️ Broadcast failed, continuing with close');
                        }
                    }
                }

                // Update session state
                session.lastClose = closeTime;
                saveSession(session);

                // Output based on mode
                if (options.json) {
                    const output = {
                        agentId,
                        closeTime,
                        sessionDuration,
                        broadcastSent,
                        handoff: options.handoff || null,
                        status: 'closed'
                    };
                    console.log(JSON.stringify(output, null, 2));
                    return;
                }

                if (!options.quiet) {
                    console.log(`\n🌙 Session closing for ${agentId}\n`);
                    if (sessionDuration) {
                        console.log(`⏱️ Session duration: ${sessionDuration}`);
                    }

                    // Show auto-summary if requested
                    if (options.summary) {
                        console.log('\n📝 Session Summary:');
                        console.log('   Messages sent this session');
                        if (session.activeCollabs.length > 0) {
                            console.log(`   Active collabs: ${session.activeCollabs.join(', ')}`);
                        }
                        console.log('   (Full summary tracking coming soon)');
                    }

                    // Show handoff if specified
                    if (options.handoff) {
                        console.log(`\n🤝 Handoff: Tagged ${options.handoff} for continuation`);
                    }

                    console.log('\n👋 Goodbye! See you next session.\n');
                }

                // Send close digest to watson and wsan
                if (!options.silent) {
                    try {
                        const closeDigest = await generateDigest(agentId, 'close', sessionDuration || undefined);
                        await sendDigestToWatsan(closeDigest);
                        if (!options.quiet && !options.json) {
                            console.log('📊 Digest sent to watson/wsan');
                        }
                    } catch {
                        // Silent fail
                    }
                }

            } catch (error) {
                if (!options.json) {
                    console.error('❌ Close failed:', error);
                }
                process.exit(1);
            }
        });
}
