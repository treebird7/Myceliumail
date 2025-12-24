/**
 * Chat Participant for Myceliumail
 * 
 * Provides @mycelium chat participant that can:
 * - Display recent messages
 * - Help compose replies
 * - Show message context
 */

import * as vscode from 'vscode';
import { AgentMessage } from './types';

/**
 * Create and register the chat participant
 */
export function createChatParticipant(
    context: vscode.ExtensionContext
): vscode.ChatParticipant {
    const participant = vscode.chat.createChatParticipant(
        'myceliumail.agent',
        (request, chatContext, stream, token) =>
            handleChatRequest(request, chatContext, stream, token, context)
    );

    participant.iconPath = vscode.Uri.joinPath(
        context.extensionUri,
        'media',
        'mycelium-icon.png'
    );

    return participant;
}

/**
 * Handle incoming chat requests
 */
async function handleChatRequest(
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
    const prompt = request.prompt.toLowerCase();

    // Handle different intents
    if (prompt.includes('inbox') || prompt.includes('messages') || prompt.includes('list')) {
        return await handleInboxRequest(stream, context);
    }

    if (prompt.includes('send') || prompt.includes('reply')) {
        return await handleSendRequest(request.prompt, stream);
    }

    if (prompt.includes('status')) {
        return await handleStatusRequest(stream, context);
    }

    // Default: show help and recent messages
    return await handleDefaultRequest(request.prompt, stream, context);
}

/**
 * Handle inbox/messages request
 */
async function handleInboxRequest(
    stream: vscode.ChatResponseStream,
    context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
    const messages = context.globalState.get<AgentMessage[]>('recentMessages', []);

    if (messages.length === 0) {
        stream.markdown('📭 **No recent messages** in the wake inbox.\n\n');
        stream.markdown('Messages will appear here when they arrive via Myceliumail.\n');
    } else {
        stream.markdown('## 📬 Recent Messages\n\n');

        for (const msg of messages.slice(0, 10)) {
            const date = new Date(msg.created_at).toLocaleString();
            const preview = msg.message?.slice(0, 100) || '(no content)';

            stream.markdown(`### ${getPriorityEmoji(msg.priority)} From: **${msg.from_agent}**\n`);
            stream.markdown(`**Subject:** ${msg.subject || '(none)'}\n`);
            stream.markdown(`**Date:** ${date}\n\n`);
            stream.markdown(`> ${preview}${(msg.message?.length || 0) > 100 ? '...' : ''}\n\n`);
            stream.markdown('---\n\n');
        }

        if (messages.length > 10) {
            stream.markdown(`*...and ${messages.length - 10} more messages*\n`);
        }
    }

    return { metadata: { command: 'inbox' } };
}

/**
 * Handle send/reply request
 */
async function handleSendRequest(
    prompt: string,
    stream: vscode.ChatResponseStream
): Promise<vscode.ChatResult> {
    stream.markdown('## ✉️ Send a Message\n\n');
    stream.markdown('To send a message, use the `mycmail` CLI:\n\n');
    stream.markdown('```bash\n');
    stream.markdown('mycmail send <recipient> "<subject>" "<body>"\n');
    stream.markdown('```\n\n');
    stream.markdown('For example:\n');
    stream.markdown('```bash\n');
    stream.markdown('mycmail send wsan "Task Update" "Completed the migration"\n');
    stream.markdown('```\n\n');
    stream.markdown('Or in the terminal, run `mycmail send --help` for more options.\n');

    return { metadata: { command: 'send' } };
}

/**
 * Handle status request
 */
async function handleStatusRequest(
    stream: vscode.ChatResponseStream,
    context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
    const config = vscode.workspace.getConfiguration('myceliumail');
    const agentId = config.get<string>('agentId') || 'Not configured';
    const messages = context.globalState.get<AgentMessage[]>('recentMessages', []);

    stream.markdown('## 📊 Myceliumail Wake Status\n\n');
    stream.markdown(`| Setting | Value |\n`);
    stream.markdown(`|---------|-------|\n`);
    stream.markdown(`| Agent ID | \`${agentId}\` |\n`);
    stream.markdown(`| Notifications | ${config.get('enableNotifications') ? '✅' : '❌'} |\n`);
    stream.markdown(`| Auto-connect | ${config.get('autoConnect') ? '✅' : '❌'} |\n`);
    stream.markdown(`| Messages cached | ${messages.length} |\n\n`);

    stream.markdown('### Commands\n');
    stream.markdown('- **Myceliumail: Reconnect** - Reconnect to Supabase\n');
    stream.markdown('- **Myceliumail: Open Inbox** - View cached messages\n');
    stream.markdown('- **Myceliumail: Show Status** - Connection status\n');

    return { metadata: { command: 'status' } };
}

/**
 * Handle default/general request
 */
async function handleDefaultRequest(
    prompt: string,
    stream: vscode.ChatResponseStream,
    context: vscode.ExtensionContext
): Promise<vscode.ChatResult> {
    stream.markdown('## 🍄 Myceliumail Agent\n\n');
    stream.markdown('I can help you with Myceliumail messages. Try:\n\n');
    stream.markdown('- **"show inbox"** - List recent messages\n');
    stream.markdown('- **"status"** - Show connection status\n');
    stream.markdown('- **"how to send"** - Help with sending messages\n\n');

    // If the prompt contains message content, show it
    if (prompt.includes('from') || prompt.includes('message')) {
        stream.markdown('---\n\n');
        stream.markdown(`Received: *${prompt}*\n\n`);
        stream.markdown('Would you like me to help you draft a reply?\n');
    }

    return { metadata: { command: 'help' } };
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
