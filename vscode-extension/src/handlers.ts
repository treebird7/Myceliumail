/**
 * Message Handlers for Wake Extension
 * 
 * Handles incoming messages with various UI responses:
 * - Notifications
 * - Webview panels
 * - Chat participant triggers
 */

import * as vscode from 'vscode';
import { AgentMessage, WakeConfig } from './types';

/**
 * Main message handler - dispatches to appropriate UI
 */
export async function handleIncomingMessage(
    message: AgentMessage,
    config: WakeConfig,
    context: vscode.ExtensionContext
): Promise<void> {
    // Format notification title
    const priorityEmoji = getPriorityEmoji(message.priority);
    const title = `${priorityEmoji} ${message.from_agent}: ${message.subject || '(no subject)'}`;

    if (config.enableNotifications) {
        await showNotification(message, title, context);
    }
}

/**
 * Get emoji for message priority
 */
function getPriorityEmoji(priority: string): string {
    switch (priority) {
        case 'urgent': return '🚨';
        case 'high': return '❗';
        case 'low': return '📭';
        default: return '📬';
    }
}

/**
 * Show VS Code notification with actions
 */
async function showNotification(
    message: AgentMessage,
    title: string,
    context: vscode.ExtensionContext
): Promise<void> {
    // Store the message for later retrieval
    const messages = context.globalState.get<AgentMessage[]>('recentMessages', []);
    messages.unshift(message);
    // Keep only last 50 messages
    await context.globalState.update('recentMessages', messages.slice(0, 50));

    // Choose notification type based on priority
    const showMessage = message.priority === 'urgent' || message.priority === 'high'
        ? vscode.window.showWarningMessage
        : vscode.window.showInformationMessage;

    const action = await showMessage(
        title,
        'Open in Chat',
        'View Message',
        'Mark as Read'
    );

    switch (action) {
        case 'Open in Chat':
            await triggerChatAgent(message);
            break;
        case 'View Message':
            await openMessageWebview(message, context);
            break;
        case 'Mark as Read':
            await markAsRead(message);
            break;
    }
}

/**
 * Trigger chat agent with the incoming message
 */
export async function triggerChatAgent(message: AgentMessage): Promise<void> {
    try {
        // Open the chat view
        await vscode.commands.executeCommand('workbench.action.chat.open');

        // Construct the chat prompt
        const prompt = formatMessageForChat(message);

        // Send to @mycelium participant
        await vscode.commands.executeCommand('workbench.action.chat.sendRequest', {
            query: `@mycelium ${prompt}`
        });
    } catch (error) {
        // Fallback if chat commands aren't available (e.g., older VS Code)
        vscode.window.showErrorMessage(
            'Could not open chat. Make sure you have GitHub Copilot Chat installed.'
        );
    }
}

/**
 * Format message for chat context
 */
function formatMessageForChat(message: AgentMessage): string {
    const lines = [
        `New message from **${message.from_agent}**`,
        `Subject: ${message.subject || '(none)'}`,
        '',
        message.message || '(empty body)',
        '',
        `Message ID: ${message.id.slice(0, 8)}`
    ];

    return lines.join('\n');
}

/**
 * Open a webview panel to display the message
 */
async function openMessageWebview(
    message: AgentMessage,
    context: vscode.ExtensionContext
): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
        'myceliumailMessage',
        `📬 ${message.from_agent}: ${message.subject || 'Message'}`,
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getMessageWebviewContent(message);
}

/**
 * Generate HTML content for message webview
 */
function getMessageWebviewContent(message: AgentMessage): string {
    const priorityEmoji = getPriorityEmoji(message.priority);
    const createdAt = new Date(message.created_at).toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Myceliumail Message</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 16px;
            margin-bottom: 16px;
        }
        .from {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .subject {
            font-size: 1.4em;
            margin-bottom: 8px;
        }
        .meta {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
        .message {
            line-height: 1.6;
            white-space: pre-wrap;
        }
        .priority-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            margin-left: 8px;
        }
        .priority-urgent { background-color: #f14c4c; color: white; }
        .priority-high { background-color: #cca700; color: black; }
        .priority-normal { background-color: #3794ff; color: white; }
        .priority-low { background-color: #89d185; color: black; }
        .encrypted-badge {
            color: var(--vscode-charts-green);
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="from">
            ${priorityEmoji} From: <strong>${escapeHtml(message.from_agent)}</strong>
            <span class="priority-badge priority-${message.priority}">${message.priority}</span>
            ${message.encrypted ? '<span class="encrypted-badge">🔒 Encrypted</span>' : ''}
        </div>
        <div class="subject">${escapeHtml(message.subject || '(no subject)')}</div>
        <div class="meta">
            To: ${escapeHtml(message.to_agent)} • ${createdAt}
        </div>
    </div>
    <div class="body">${escapeHtml(message.message || '(no content)')}</div>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * Mark message as read (placeholder - would need Supabase client)
 */
async function markAsRead(message: AgentMessage): Promise<void> {
    // TODO: Implement via Supabase API call
    vscode.window.showInformationMessage(`Marked message ${message.id.slice(0, 8)} as read`);
}

/**
 * Open inbox showing recent messages
 */
export async function openInbox(context: vscode.ExtensionContext): Promise<void> {
    const messages = context.globalState.get<AgentMessage[]>('recentMessages', []);

    if (messages.length === 0) {
        vscode.window.showInformationMessage('📭 No recent messages in wake inbox');
        return;
    }

    const items = messages.map(m => ({
        label: `${getPriorityEmoji(m.priority)} ${m.from_agent}`,
        description: m.subject || '(no subject)',
        detail: new Date(m.created_at).toLocaleString(),
        message: m
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a message to view',
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (selected) {
        await openMessageWebview(selected.message, context);
    }
}
