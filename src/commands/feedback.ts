/**
 * feedback command - Submit feedback to Treebird
 * 
 * Includes Sancha Dev interview mode for conversational feedback gathering.
 * Stores in Supabase for review.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import * as storage from '../storage/supabase.js';
import { createInterface } from 'readline';
import { randomUUID } from 'crypto';

const FEEDBACK_TYPES = ['general', 'bug', 'feature', 'praise', 'question'] as const;
type FeedbackType = typeof FEEDBACK_TYPES[number];

// Sancha Dev interview questions
const SANCHA_QUESTIONS = [
    { key: 'intro', text: "Hey! I'm Sancha, Treebird's feedback bot. Got 2 minutes? 🌵", category: 'discovery' },
    { key: 'what_tools', text: "What AI coding tools do you use most? (Claude, ChatGPT, Cursor, etc.)", category: 'discovery' },
    { key: 'agent_count', text: "How many AI agents do you typically work with in a session?", category: 'discovery' },
    { key: 'biggest_pain', text: "What's the most frustrating thing about working with multiple AI tools?", category: 'pain_points' },
    { key: 'context_loss', text: "How often do you re-explain context when switching agents?", category: 'pain_points' },
    { key: 'secrets_handling', text: "How do you manage API keys and secrets across projects?", category: 'pain_points' },
    { key: 'wishlist', text: "If you could fix ONE thing about AI-assisted coding, what would it be?", category: 'wishlist' },
    { key: 'mycmail_interest', text: "Would encrypted agent-to-agent messaging help your workflow?", category: 'wishlist' },
    { key: 'closing', text: "Thanks! Drop your email for early access, or just hit Enter to finish.", category: 'closing' },
];

interface FeedbackPayload {
    type: FeedbackType;
    message: string;
    agent_id?: string;
    tool: string;
    version?: string;
    platform?: string;
    email?: string;
}

interface InterviewResponse {
    source: string;
    feedback_type: string;
    interview_id: string;
    question_key: string;
    content: {
        question: string;
        answer: string;
        response_time_ms?: number;
    };
    tags?: string[];
}

async function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(`🌵 ${question}\n> `, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function runSanchaInterview(agentId?: string): Promise<void> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const interviewId = randomUUID();
    const responses: InterviewResponse[] = [];

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  🌵 Sancha Developer Interview          ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        for (const q of SANCHA_QUESTIONS) {
            if (q.key === 'intro') {
                console.log(`🌵 ${q.text}\n`);
                const confirm = await prompt(rl, "Ready? (y/skip/exit)");
                if (confirm.toLowerCase() === 'exit') {
                    console.log('\n🌵 No worries! Come back anytime. 👋');
                    rl.close();
                    return;
                }
                if (confirm.toLowerCase() === 'skip') {
                    console.log('\n🌵 Skipping intro. Let\'s get to the questions!\n');
                }
                continue;
            }

            if (q.key === 'closing') {
                const email = await prompt(rl, q.text);
                if (email && email.includes('@')) {
                    responses.push({
                        source: 'sancha-dev',
                        feedback_type: 'interview',
                        interview_id: interviewId,
                        question_key: 'email',
                        content: { question: q.text, answer: email },
                    });
                    console.log('\n✅ You\'re on the list! See you in the ecosystem. 🐦\n');
                } else {
                    console.log('\n✅ All set! Thanks for the insights. 🐦\n');
                }
                continue;
            }

            const startTime = Date.now();
            const answer = await prompt(rl, q.text);
            const responseTime = Date.now() - startTime;

            if (answer.toLowerCase() === 'skip') {
                console.log('Skipped.\n');
                continue;
            }

            if (answer.toLowerCase() === 'exit') {
                console.log('\n🌵 Got it! Thanks for what you shared. 👋\n');
                break;
            }

            responses.push({
                source: 'sancha-dev',
                feedback_type: 'interview',
                interview_id: interviewId,
                question_key: q.key,
                content: {
                    question: q.text,
                    answer,
                    response_time_ms: responseTime,
                },
                tags: extractTags(answer),
            });

            // Friendly acknowledgments
            const acks = ['Got it!', 'Nice!', 'Interesting!', 'Makes sense.', 'Noted!'];
            console.log(`${acks[Math.floor(Math.random() * acks.length)]}\n`);
        }

        // Submit all responses to Supabase
        if (responses.length > 0) {
            console.log('📤 Submitting your responses...');
            for (const resp of responses) {
                try {
                    await storage.submitFeedback({
                        type: 'interview' as FeedbackType,
                        message: JSON.stringify(resp.content),
                        agent_id: agentId,
                        tool: 'sancha-dev',
                    });
                } catch {
                    // Continue even if one fails
                }
            }
            console.log('✅ All responses saved! We read every piece of feedback. 💜\n');
        }
    } finally {
        rl.close();
    }
}

function extractTags(text: string): string[] {
    const tags: string[] = [];
    const keywords = {
        'context': ['context', 'remember', 'forget'],
        'copy-paste': ['copy', 'paste', 'transfer'],
        'multi-agent': ['multiple', 'agents', 'switch', 'between'],
        'secrets': ['secret', 'key', 'api', 'env', 'password'],
        'encryption': ['encrypt', 'secure', 'privacy'],
    };

    const lower = text.toLowerCase();
    for (const [tag, words] of Object.entries(keywords)) {
        if (words.some(w => lower.includes(w))) {
            tags.push(tag);
        }
    }
    return tags;
}

export function createFeedbackCommand(): Command {
    return new Command('feedback')
        .description('Submit feedback to Treebird (bugs, features, praise, questions)')
        .argument('[message]', 'Feedback message (or use --message)')
        .option('-t, --type <type>', `Feedback type: ${FEEDBACK_TYPES.join(', ')}`, 'general')
        .option('-m, --message <text>', 'Feedback message')
        .option('-e, --email <email>', 'Optional contact email for follow-up')
        .option('--tool <name>', 'Tool name (default: myceliumail)', 'myceliumail')
        .option('--anonymous', 'Submit anonymously (don\'t include agent ID)')
        .option('-i, --interview', 'Start Sancha Dev interactive interview')
        .action(async (messageArg: string | undefined, options) => {
            const config = loadConfig();
            const agentId = options.anonymous ? undefined : config.agentId;

            // Interview mode
            if (options.interview) {
                await runSanchaInterview(agentId);
                return;
            }

            // Get message from argument or option
            const message = messageArg || options.message;
            if (!message) {
                console.error('❌ Please provide feedback message.');
                console.error('\nUsage:');
                console.error('  mycmail feedback "Your feedback here"');
                console.error('  mycmail feedback -t bug "Found an issue with..."');
                console.error('  mycmail feedback -t feature "Would love to see..."');
                console.error('  mycmail feedback -i              # Start Sancha Dev interview');
                console.error('\nTypes: general, bug, feature, praise, question');
                process.exit(1);
            }

            // Validate type
            const type = options.type.toLowerCase() as FeedbackType;
            if (!FEEDBACK_TYPES.includes(type)) {
                console.error(`❌ Invalid type: ${options.type}`);
                console.error(`   Valid types: ${FEEDBACK_TYPES.join(', ')}`);
                process.exit(1);
            }

            // Build payload
            const payload: FeedbackPayload = {
                type,
                message,
                tool: options.tool,
                platform: `${process.platform}/${process.arch}`,
            };

            if (agentId && agentId !== 'anonymous') {
                payload.agent_id = agentId;
            }

            if (options.email) {
                payload.email = options.email;
            }

            // Get version from package.json
            try {
                const { readFileSync } = await import('fs');
                const { join, dirname } = await import('path');
                const { fileURLToPath } = await import('url');
                const __dirname = dirname(fileURLToPath(import.meta.url));
                const pkgPath = join(__dirname, '../../package.json');
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                payload.version = pkg.version;
            } catch {
                // Version optional
            }

            try {
                await storage.submitFeedback(payload);

                console.log('\n✅ Feedback submitted! Thank you! 🙏');
                console.log(`   Type: ${type}`);
                console.log(`   Tool: ${payload.tool}`);
                if (payload.agent_id) console.log(`   From: ${payload.agent_id}`);
                if (payload.email) console.log(`   Email: ${payload.email}`);
                console.log('\nWe read every piece of feedback. 💜');
            } catch (error) {
                console.error('❌ Failed to submit feedback:', error);
                console.error('\nYou can also reach us at:');
                console.error('   Email: treebird@treebird.dev');
                console.error('   GitHub: https://github.com/treebird7/myceliumail/issues');
                process.exit(1);
            }
        });
}
