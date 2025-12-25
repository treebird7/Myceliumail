/**
 * Webhook Handler for Agent Awakening
 * 
 * When messages arrive, this handler:
 * 1. Triggers the wake sequence
 * 2. Dispatches actions based on message content
 * 3. Adds timestamped comments to collaborative files
 * 4. Logs activity for debugging
 */

import * as fs from 'fs';
import * as path from 'path';
import { dispatchAction } from './action-dispatcher.js';

interface WebhookMessage {
    id: string;
    recipient: string;
    sender: string;
    subject?: string;
    created_at: string;
}

/**
 * Add a timestamped comment to the collaborative file
 * Uses append mode to prevent race conditions and data loss
 */
export async function addCollabComment(agentId: string, message: WebhookMessage, action: string = 'received'): Promise<void> {
    // Try to write to the collaborative file
    const collabFilePath = path.join(process.env.HOME || '/tmp', 'Dev/treebird-internal/Treebird/README.md.md');
    
    try {
        // Check if file exists first
        if (!fs.existsSync(collabFilePath)) {
            console.log(`⚠️  Collab file not found at ${collabFilePath}`);
            return;
        }

        // Create timestamp comment
        const timestamp = new Date().toISOString();
        const comment = `\n\n<!-- [${agentId}] ${timestamp} -->
<!-- 🔔 Webhook Event: message_${action} -->
<!-- From: ${message.sender} | Subject: ${message.subject || '(no subject)'} -->
<!-- Message ID: ${message.id} -->`;

        // Use append mode instead of read-modify-write
        // This is safer and prevents race conditions with multiple concurrent writes
        fs.appendFileSync(collabFilePath, comment, 'utf-8');
        
        console.log(`✅ Comment added to collab file for ${agentId}`);
    } catch (error) {
        console.error(`❌ Failed to add collab comment:`, error);
        // Don't throw - webhook should still succeed even if comment fails
    }
}

/**
 * Get a summary of the message for logging
 */
export function formatMessageSummary(message: WebhookMessage): string {
    const timestamp = new Date(message.created_at).toLocaleTimeString();
    const subject = message.subject?.substring(0, 50) || '(no subject)';
    return `${timestamp} | From: ${message.sender} | ${subject}`;
}

/**
 * Trigger wake sequence for an agent
 * This would call the wake command or trigger MCP notifications
 */
export async function triggerWakeSequence(agentId: string, message: WebhookMessage): Promise<void> {
    try {
        // Log the wake event
        console.log(`🌅 Wake sequence triggered for ${agentId}`);
        console.log(`   ${formatMessageSummary(message)}`);
        
        // Add comment to collaborative file
        await addCollabComment(agentId, message, 'received');

        // Dispatch action if specified in message
        const actionResult = await dispatchAction(message);
        if (actionResult) {
            // Log action result to collaborative file
            if (actionResult.success) {
                console.log(`✅ Action executed: ${actionResult.action}`);
            } else {
                console.error(`❌ Action failed: ${actionResult.error}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Wake sequence failed:`, error);
    }
}

/**
 * Process an incoming webhook from Supabase
 */
export async function handleWebhook(agentId: string, payload: {
    type: string;
    record?: WebhookMessage;
    old_record?: WebhookMessage;
}): Promise<{
    success: boolean;
    processed: boolean;
    action?: string;
    message?: string;
}> {
    const { type, record } = payload;

    // Only process INSERT events for messages to this agent
    if (type !== 'INSERT' || !record) {
        return { success: true, processed: false };
    }

    // Verify recipient is this agent
    if (record.recipient !== agentId) {
        console.log(`📭 Message not for ${agentId}, skipping webhook`);
        return { success: true, processed: false };
    }

    // Trigger wake sequence
    try {
        await triggerWakeSequence(agentId, record);
        return {
            success: true,
            processed: true,
            action: 'wake_triggered',
            message: `Message from ${record.sender} received`
        };
    } catch (error) {
        console.error(`❌ Webhook processing failed:`, error);
        return {
            success: false,
            processed: false,
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
