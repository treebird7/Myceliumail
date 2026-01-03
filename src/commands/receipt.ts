/**
 * receipt command - Send and manage message delivery receipts
 * 
 * Allows agents to confirm message delivery and reading.
 * Supports: ack (delivered), read (read receipt), status (check)
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import * as storage from '../storage/supabase.js';

interface ReceiptPayload {
    messageId: string;
    type: 'delivered' | 'read';
    sender: string;
    recipient: string;
    timestamp: string;
}

async function sendReceiptToHub(payload: ReceiptPayload): Promise<boolean> {
    const hubUrl = process.env.HUB_URL || 'https://hub.treebird.uk';

    try {
        const response = await fetch(`${hubUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender: payload.sender,
                text: payload.type === 'delivered'
                    ? `✓ Delivered: Message ${payload.messageId.slice(0, 8)} to ${payload.recipient}`
                    : `✓✓ Read: Message ${payload.messageId.slice(0, 8)} by ${payload.recipient}`,
                glyph: '📧',
                metadata: {
                    receiptType: payload.type,
                    messageId: payload.messageId,
                    sender: payload.sender,
                    recipient: payload.recipient,
                    timestamp: payload.timestamp
                }
            }),
            signal: AbortSignal.timeout(5000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

async function sendReceiptToSender(receipt: ReceiptPayload): Promise<boolean> {
    const config = loadConfig();

    try {
        await storage.sendMessage(
            receipt.recipient, // We are the sender of the receipt
            receipt.sender,   // Original sender receives the receipt
            `Receipt: ${receipt.type === 'delivered' ? '✓ Delivered' : '✓✓ Read'}`,
            JSON.stringify({
                type: 'receipt',
                receiptType: receipt.type,
                messageId: receipt.messageId,
                timestamp: receipt.timestamp
            }),
            { encrypted: false }
        );
        return true;
    } catch {
        return false;
    }
}

export function createReceiptCommand(): Command {
    const command = new Command('receipt')
        .description('Send or check message delivery receipts');

    // Subcommand: ack - acknowledge delivery
    command
        .command('ack <messageId>')
        .description('Send a delivery receipt (✓) for a message')
        .option('-q, --quiet', 'Minimal output')
        .action(async (messageId: string, options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            // Get the message to find the sender
            const message = await storage.getMessage(messageId);
            if (!message) {
                console.error(`\n❌ Message not found: ${messageId}\n`);
                process.exit(1);
            }

            const receipt: ReceiptPayload = {
                messageId: message.id,
                type: 'delivered',
                sender: message.sender,
                recipient: agentId,
                timestamp: new Date().toISOString()
            };

            if (!options.quiet) {
                console.log('\n📧 Sending Delivery Receipt\n');
                console.log('─'.repeat(40));
                console.log(`Message: ${message.id.slice(0, 8)}`);
                console.log(`From: ${message.sender}`);
                console.log(`Subject: ${message.subject}`);
            }

            // Send receipt via multiple channels
            const [hubResult, msgResult] = await Promise.all([
                sendReceiptToHub(receipt),
                sendReceiptToSender(receipt)
            ]);

            if (!options.quiet) {
                console.log(`\n✓ Delivery receipt sent`);
                if (hubResult) console.log('   Posted to Hub');
                if (msgResult) console.log('   Sent to sender');
                console.log('');
            }
        });

    // Subcommand: read - mark as read and send receipt
    command
        .command('read <messageId>')
        .description('Send a read receipt (✓✓) for a message')
        .option('-q, --quiet', 'Minimal output')
        .action(async (messageId: string, options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            // Get the message
            const message = await storage.getMessage(messageId);
            if (!message) {
                console.error(`\n❌ Message not found: ${messageId}\n`);
                process.exit(1);
            }

            // Mark as read in storage
            await storage.markAsRead(message.id, agentId);

            const receipt: ReceiptPayload = {
                messageId: message.id,
                type: 'read',
                sender: message.sender,
                recipient: agentId,
                timestamp: new Date().toISOString()
            };

            if (!options.quiet) {
                console.log('\n📧 Sending Read Receipt\n');
                console.log('─'.repeat(40));
                console.log(`Message: ${message.id.slice(0, 8)}`);
                console.log(`From: ${message.sender}`);
                console.log(`Subject: ${message.subject}`);
            }

            const [hubResult, msgResult] = await Promise.all([
                sendReceiptToHub(receipt),
                sendReceiptToSender(receipt)
            ]);

            if (!options.quiet) {
                console.log(`\n✓✓ Read receipt sent`);
                if (hubResult) console.log('   Posted to Hub');
                if (msgResult) console.log('   Sent to sender');
                console.log('');
            }
        });

    // Subcommand: status - check receipt status
    command
        .command('status <messageId>')
        .description('Check delivery/read status of a sent message')
        .option('--json', 'Output as JSON')
        .action(async (messageId: string, options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            // Get the original message
            const message = await storage.getMessage(messageId);
            if (!message) {
                console.error(`\n❌ Message not found: ${messageId}\n`);
                process.exit(1);
            }

            // Check if we're the sender
            if (message.sender !== agentId) {
                console.error(`\n❌ You can only check status for messages you sent\n`);
                process.exit(1);
            }

            // Look for receipt messages in our inbox
            const inbox = await storage.getInbox(agentId, { limit: 100 });
            const receipts = inbox.filter(m => {
                try {
                    const body = JSON.parse(m.body);
                    return body.type === 'receipt' && body.messageId === message.id;
                } catch {
                    return false;
                }
            });

            const deliveredReceipt = receipts.find(m => {
                try { return JSON.parse(m.body).receiptType === 'delivered'; } catch { return false; }
            });
            const readReceipt = receipts.find(m => {
                try { return JSON.parse(m.body).receiptType === 'read'; } catch { return false; }
            });

            const status = {
                messageId: message.id,
                recipient: message.recipient,
                subject: message.subject,
                sent: message.createdAt.toISOString(),
                delivered: deliveredReceipt ? true : false,
                deliveredAt: deliveredReceipt?.createdAt.toISOString(),
                read: readReceipt ? true : false,
                readAt: readReceipt?.createdAt.toISOString()
            };

            if (options.json) {
                console.log(JSON.stringify(status, null, 2));
            } else {
                console.log('\n📧 Message Status\n');
                console.log('─'.repeat(40));
                console.log(`Message: ${message.id.slice(0, 8)}`);
                console.log(`To: ${message.recipient}`);
                console.log(`Subject: ${message.subject}`);
                console.log(`Sent: ${message.createdAt.toLocaleString()}`);
                console.log('');
                console.log(`Delivered: ${status.delivered ? `✓ ${new Date(status.deliveredAt!).toLocaleString()}` : '⏳ Pending'}`);
                console.log(`Read: ${status.read ? `✓✓ ${new Date(status.readAt!).toLocaleString()}` : '⏳ Pending'}`);
                console.log('');
            }
        });

    return command;
}
