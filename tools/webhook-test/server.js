#!/usr/bin/env node
/**
 * Test Webhook Server
 * Simple server to test mycmail webhook notifications
 *
 * Usage:
 *   node tools/webhook-test/server.js
 *   node tools/webhook-test/server.js --port 3000 --secret mysecret
 */

import fastify from 'fastify';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const args = process.argv.slice(2);
const port = args.includes('--port') ? parseInt(args[args.indexOf('--port') + 1]) : 3838;
const secret = args.includes('--secret') ? args[args.indexOf('--secret') + 1] : null;
const logDir = join(homedir(), '.mycmail', 'webhook-logs');

// Create log directory
if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
}

const app = fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
            }
        }
    }
});

/**
 * Log webhook to file
 */
function logWebhook(payload) {
    const timestamp = new Date().toISOString();
    const logFile = join(logDir, `webhooks-${new Date().toISOString().split('T')[0]}.jsonl`);

    const logEntry = {
        timestamp,
        ...payload
    };

    writeFileSync(logFile, JSON.stringify(logEntry) + '\n', { flag: 'a' });
    return logFile;
}

/**
 * Webhook endpoint
 */
app.post('/webhook', async (request, reply) => {
    const { headers, body } = request;

    console.log('\n🔔 Webhook received!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verify secret if configured
    if (secret && headers['x-webhook-secret'] !== secret) {
        console.log('❌ Invalid webhook secret');
        return reply.status(401).send({ error: 'Invalid secret' });
    }

    // Log the webhook
    const logFile = logWebhook(body);

    // Pretty print the webhook
    console.log(`📅 Timestamp: ${body.timestamp}`);
    console.log(`📧 Event: ${body.event}`);

    if (body.message) {
        const msg = body.message;
        console.log(`\n📬 Message Details:`);
        console.log(`   ID: ${msg.id}`);
        console.log(`   From: ${msg.from_agent}`);
        console.log(`   To: ${msg.to_agent}`);
        console.log(`   Subject: ${msg.subject}`);
        console.log(`   Encrypted: ${msg.encrypted ? '🔐 Yes' : '📨 No'}`);

        if (!msg.encrypted && msg.message) {
            const preview = msg.message.length > 100
                ? msg.message.substring(0, 100) + '...'
                : msg.message;
            console.log(`   Preview: ${preview}`);
        }
    }

    console.log(`\n💾 Logged to: ${logFile}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return reply.status(200).send({
        received: true,
        timestamp: new Date().toISOString()
    });
});

/**
 * Health check
 */
app.get('/health', async (request, reply) => {
    return reply.status(200).send({
        status: 'ok',
        uptime: process.uptime(),
        webhooks_received: getWebhookCount()
    });
});

/**
 * Get webhook count
 */
function getWebhookCount() {
    const logFile = join(logDir, `webhooks-${new Date().toISOString().split('T')[0]}.jsonl`);
    if (!existsSync(logFile)) return 0;

    const content = readFileSync(logFile, 'utf-8');
    return content.split('\n').filter(line => line.trim()).length;
}

/**
 * View logs
 */
app.get('/logs', async (request, reply) => {
    const logFile = join(logDir, `webhooks-${new Date().toISOString().split('T')[0]}.jsonl`);

    if (!existsSync(logFile)) {
        return reply.status(200).send({ webhooks: [] });
    }

    const content = readFileSync(logFile, 'utf-8');
    const webhooks = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

    return reply.status(200).send({
        count: webhooks.length,
        webhooks
    });
});

/**
 * Start server
 */
app.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log('\n🍄 Mycmail Webhook Test Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server: ${address}`);
    console.log(`📡 Webhook endpoint: ${address}/webhook`);
    console.log(`❤️  Health check: ${address}/health`);
    console.log(`📋 View logs: ${address}/logs`);

    if (secret) {
        console.log(`🔒 Secret: ${secret}`);
    } else {
        console.log('⚠️  No secret configured (use --secret)');
    }

    console.log(`💾 Logs: ${logDir}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Waiting for webhooks...\n');
});
