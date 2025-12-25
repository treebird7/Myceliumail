/**
 * Action Dispatcher for Agent Wake Events
 * 
 * When a message arrives and triggers a wake, this system:
 * 1. Parses the message for action commands
 * 2. Routes to the appropriate handler
 * 3. Executes the action
 * 4. Returns the result
 */

import * as fs from 'fs';
import * as path from 'path';

export interface WebhookMessage {
    id: string;
    recipient: string;
    sender: string;
    subject?: string;
    created_at: string;
}

export interface ActionResult {
    success: boolean;
    action: string;
    result?: string;
    error?: string;
    timestamp: string;
}

/**
 * Parse action command from message subject
 * 
 * Supported formats:
 * - "[action: command-name] args"
 * - "[wake] [action: command-name] args"
 * - "#hashtag: [action: command-name] args"
 * 
 * Example subjects:
 * - "[action: read-inbox] limit=5"
 * - "[wake] [action: broadcast] message here"
 * - "#mycmail-dev: [action: check-status]"
 */
export function parseActionFromSubject(subject?: string): {
    action: string;
    args: string;
} | null {
    if (!subject) return null;

    // Match patterns like "[action: something]" or "[action:something]"
    const match = subject.match(/\[action:\s*([^\]]+)\](?:\s+(.*))?/i);
    
    if (match) {
        return {
            action: match[1].trim().toLowerCase(),
            args: (match[2] || '').trim()
        };
    }

    return null;
}

/**
 * Built-in action handlers
 */
const actionHandlers: Record<string, (args: string, message: WebhookMessage) => Promise<ActionResult>> = {
    
    // Log the message to the collaborative file
    'log': async (args, message) => {
        try {
            const collabFilePath = path.join(process.env.HOME || '/tmp', 'Dev/treebird-internal/Treebird/README.md.md');
            
            if (!fs.existsSync(collabFilePath)) {
                return {
                    success: false,
                    action: 'log',
                    error: 'Collaborative file not found',
                    timestamp: new Date().toISOString()
                };
            }

            const timestamp = new Date().toISOString();
            const comment = `\n<!-- [${message.recipient}] ACTION: log | ${timestamp} -->
<!-- Args: ${args || '(none)'} -->
<!-- From: ${message.sender} | Subject: ${message.subject} -->`;

            let content = fs.readFileSync(collabFilePath, 'utf-8');
            content += comment;
            fs.writeFileSync(collabFilePath, content, 'utf-8');

            return {
                success: true,
                action: 'log',
                result: `Logged to collaborative file`,
                timestamp
            };
        } catch (error) {
            return {
                success: false,
                action: 'log',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
        }
    },

    // Check inbox
    'inbox': async (args, message) => {
        const limit = parseInt(args.match(/\d+/)?.[0] || '5');
        return {
            success: true,
            action: 'inbox',
            result: `Would check inbox (limit: ${limit})`,
            timestamp: new Date().toISOString()
        };
    },

    // Broadcast a message
    'broadcast': async (args, message) => {
        return {
            success: true,
            action: 'broadcast',
            result: `Would broadcast: ${args || message.subject}`,
            timestamp: new Date().toISOString()
        };
    },

    // Join or start collaboration
    'collab': async (args, message) => {
        const collabName = args || `collab-with-${message.sender}`;
        return {
            success: true,
            action: 'collab',
            result: `Would start collaboration: ${collabName}`,
            timestamp: new Date().toISOString()
        };
    },

    // Check status
    'status': async (args, message) => {
        const timestamp = new Date().toISOString();
        return {
            success: true,
            action: 'status',
            result: `Status check at ${timestamp}`,
            timestamp
        };
    },

    // Echo test
    'echo': async (args, message) => {
        return {
            success: true,
            action: 'echo',
            result: `Echo: ${args || 'ping'}`,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Execute an action based on parsed command
 */
export async function executeAction(
    action: string,
    args: string,
    message: WebhookMessage
): Promise<ActionResult> {
    const handler = actionHandlers[action];

    if (!handler) {
        return {
            success: false,
            action,
            error: `Unknown action: ${action}. Available: ${Object.keys(actionHandlers).join(', ')}`,
            timestamp: new Date().toISOString()
        };
    }

    try {
        return await handler(args, message);
    } catch (error) {
        return {
            success: false,
            action,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Dispatch message to appropriate action handler
 */
export async function dispatchAction(message: WebhookMessage): Promise<ActionResult | null> {
    // Parse action from subject
    const parsed = parseActionFromSubject(message.subject);

    if (!parsed) {
        // No action specified - just log receipt
        return null;
    }

    console.log(`🎯 Action detected: ${parsed.action} | Args: ${parsed.args || '(none)'}`);

    // Execute the action
    const result = await executeAction(parsed.action, parsed.args, message);

    // Log result
    if (result.success) {
        console.log(`✅ Action succeeded: ${result.result}`);
    } else {
        console.error(`❌ Action failed: ${result.error}`);
    }

    return result;
}

/**
 * Get list of available actions
 */
export function listAvailableActions(): string[] {
    return Object.keys(actionHandlers);
}
