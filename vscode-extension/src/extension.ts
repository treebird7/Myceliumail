/**
 * Myceliumail Wake Agent Extension
 * 
 * Real-time agent wake-up via Myceliumail messages.
 * Listens to Supabase Realtime for incoming messages and
 * wakes the agent through notifications, sidebar, or chat.
 */

import * as vscode from 'vscode';
import { RealtimeConnection } from './realtime';
import { handleIncomingMessage, openInbox } from './handlers';
import { createChatParticipant } from './chatParticipant';
import { WakeConfig, ConnectionState, AgentMessage } from './types';

let connection: RealtimeConnection | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let outputChannel: vscode.OutputChannel;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('Myceliumail Wake');
    context.subscriptions.push(outputChannel);

    log('Myceliumail Wake Agent extension activated');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'myceliumail.showStatus';
    context.subscriptions.push(statusBarItem);

    // Register commands
    registerCommands(context);

    // Register chat participant if available
    try {
        if (typeof vscode.chat !== 'undefined' && typeof vscode.chat.createChatParticipant === 'function') {
            const participant = createChatParticipant(context);
            context.subscriptions.push(participant);
            log('Chat participant @mycelium registered');
        } else {
            log('Chat participant API not available (requires VS Code 1.85+)');
        }
    } catch (error) {
        log(`Could not register chat participant: ${error}`);
    }

    // Load configuration and connect
    const config = loadConfiguration();

    if (config.autoConnect && config.agentId && (config.hubUrl || (config.supabaseUrl && config.supabaseKey))) {
        await initializeConnection(context, config);
    } else if (!config.agentId) {
        updateStatusBar('disconnected', 'Not configured');
        log('Agent ID not configured. Set myceliumail.agentId in settings.');
    }

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('myceliumail')) {
                log('Configuration changed');
                const newConfig = loadConfiguration();

                if (connection) {
                    connection.updateConfig(newConfig);
                } else if (newConfig.autoConnect && newConfig.agentId) {
                    await initializeConnection(context, newConfig);
                }
            }
        })
    );
}

/**
 * Initialize the realtime connection
 */
async function initializeConnection(
    context: vscode.ExtensionContext,
    config: WakeConfig
): Promise<void> {
    // Clean up existing connection
    if (connection) {
        connection.dispose();
    }

    // Create new connection
    connection = new RealtimeConnection(config, outputChannel);
    context.subscriptions.push(connection);

    // Handle incoming messages
    connection.onMessage((message) => {
        handleIncomingMessage(message, config, context);
    });

    // Handle status changes
    connection.onStatus((state) => {
        updateStatusBar(state.status, state.error);
    });

    // Connect
    await connection.connect();
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
    // Test wake notification
    context.subscriptions.push(
        vscode.commands.registerCommand('myceliumail.testWake', async () => {
            const testMessage: AgentMessage = {
                id: 'test-' + Date.now(),
                from_agent: 'test-agent',
                to_agent: loadConfiguration().agentId || 'you',
                subject: 'Test Wake Notification',
                message: 'This is a test message to verify the wake notification system is working correctly.',
                encrypted: false,
                read: false,
                archived: false,
                priority: 'normal',
                message_type: 'direct',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await handleIncomingMessage(testMessage, loadConfiguration(), context);
        })
    );

    // Open inbox
    context.subscriptions.push(
        vscode.commands.registerCommand('myceliumail.openInbox', () => {
            openInbox(context);
        })
    );

    // Reconnect
    context.subscriptions.push(
        vscode.commands.registerCommand('myceliumail.reconnect', async () => {
            const config = loadConfiguration();
            if (!config.agentId) {
                vscode.window.showErrorMessage(
                    'Myceliumail not configured. Please set agentId in settings.'
                );
                return;
            }
            if (!config.hubUrl && (!config.supabaseUrl || !config.supabaseKey)) {
                vscode.window.showErrorMessage(
                    'No connection method configured. Set hubUrl or Supabase credentials.'
                );
                return;
            }

            log('Manual reconnect requested');
            await initializeConnection(context, config);
        })
    );

    // Disconnect
    context.subscriptions.push(
        vscode.commands.registerCommand('myceliumail.disconnect', async () => {
            if (connection) {
                await connection.disconnect();
                log('Manually disconnected');
            }
        })
    );

    // Show status
    context.subscriptions.push(
        vscode.commands.registerCommand('myceliumail.showStatus', () => {
            const config = loadConfiguration();
            const state = connection?.getState();

            let statusMessage = '📊 Myceliumail Wake Status\n\n';
            statusMessage += `Agent ID: ${config.agentId || '(not set)'}\n`;
            statusMessage += `Connection: ${state?.status || 'not initialized'}\n`;

            if (state?.lastConnected) {
                statusMessage += `Last connected: ${state.lastConnected.toLocaleString()}\n`;
            }
            if (state?.error) {
                statusMessage += `Error: ${state.error}\n`;
            }

            vscode.window.showInformationMessage(statusMessage, 'Open Output').then(action => {
                if (action === 'Open Output') {
                    outputChannel.show();
                }
            });
        })
    );
}

/**
 * Load configuration from VS Code settings
 */
function loadConfiguration(): WakeConfig {
    const config = vscode.workspace.getConfiguration('myceliumail');

    return {
        agentId: config.get<string>('agentId') || '',
        supabaseUrl: config.get<string>('supabaseUrl') || '',
        supabaseKey: config.get<string>('supabaseKey') || '',
        hubUrl: config.get<string>('hubUrl') || 'https://hub.treebird.uk',
        enableNotifications: config.get<boolean>('enableNotifications', true),
        enableChatParticipant: config.get<boolean>('enableChatParticipant', true),
        autoConnect: config.get<boolean>('autoConnect', true)
    };
}

/**
 * Update status bar item
 */
function updateStatusBar(status: string, error?: string | null): void {
    if (!statusBarItem) return;

    switch (status) {
        case 'connected':
            statusBarItem.text = '$(mail) Myceliumail';
            statusBarItem.tooltip = 'Myceliumail: Connected and listening';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'connecting':
        case 'reconnecting':
            statusBarItem.text = '$(sync~spin) Myceliumail';
            statusBarItem.tooltip = `Myceliumail: ${status}...`;
            statusBarItem.backgroundColor = undefined;
            break;
        case 'disconnected':
            statusBarItem.text = '$(mail) Myceliumail';
            statusBarItem.tooltip = 'Myceliumail: Disconnected';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'error':
            statusBarItem.text = '$(warning) Myceliumail';
            statusBarItem.tooltip = `Myceliumail Error: ${error || 'Unknown error'}`;
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
        default:
            statusBarItem.text = '$(mail) Myceliumail';
            statusBarItem.tooltip = 'Myceliumail Wake Agent';
    }

    statusBarItem.show();
}

/**
 * Log to output channel
 */
function log(message: string): void {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] ${message}`);
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    if (connection) {
        connection.dispose();
    }
}
