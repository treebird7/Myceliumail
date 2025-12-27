/**
 * canary command - Initialize and manage canary tokens for identity verification
 * 
 * Canary tokens are secret phrases that can be used as lightweight identity checks.
 * Only the real owner would know the phrase in their canary file.
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as crypto from 'crypto';

const MYCELIUM_DIR = join(homedir(), '.myceliumail');
const CANARY_FILE = join(MYCELIUM_DIR, 'canary.txt');

/**
 * Generate a random word-based phrase
 */
function generateCanaryPhrase(): string {
    // Use a simple animal + color + number pattern for memorable phrases
    const animals = ['fox', 'owl', 'wolf', 'bear', 'hawk', 'deer', 'crow', 'hare', 'lynx', 'seal'];
    const colors = ['red', 'blue', 'gold', 'jade', 'opal', 'rust', 'sage', 'rose', 'gray', 'onyx'];
    const actions = ['runs', 'leaps', 'soars', 'hunts', 'waits', 'hides', 'sings', 'rests', 'roams', 'flies'];

    const pick = (arr: string[]) => arr[crypto.randomInt(arr.length)];
    const num = crypto.randomInt(10, 100);

    return `${pick(colors)}-${pick(animals)}-${pick(actions)}-${num}`;
}

export function createCanaryInitCommand(): Command {
    return new Command('canary-init')
        .description('Initialize a canary token for lightweight identity verification')
        .option('-f, --force', 'Overwrite existing canary token')
        .option('--phrase <phrase>', 'Use a custom phrase instead of generating one')
        .action(async (options) => {
            // Ensure directory exists
            if (!existsSync(MYCELIUM_DIR)) {
                mkdirSync(MYCELIUM_DIR, { recursive: true });
            }

            // Check for existing canary
            if (existsSync(CANARY_FILE) && !options.force) {
                console.log('⚠️  Canary token already exists!\n');
                console.log('Use --force to regenerate (you will need to remember the new phrase)\n');
                console.log('💡 To view your current canary: cat ~/.myceliumail/canary.txt');
                return;
            }

            // Generate or use provided phrase
            const phrase = options.phrase || generateCanaryPhrase();

            // Save canary file with restrictive permissions
            writeFileSync(CANARY_FILE, phrase + '\n', { mode: 0o600 });

            console.log('🐤 Canary token initialized!\n');
            console.log('Your secret canary phrase is:\n');
            console.log(`  🔐 ${phrase}\n`);
            console.log('This phrase proves you are the real owner of this environment.');
            console.log('Keep it secret! Only share when an agent asks for verification.\n');
            console.log(`Stored at: ${CANARY_FILE}`);
            console.log('\n💡 If an agent asks "what\'s your canary phrase?", answer with this phrase.');
        });
}

export function createCanaryCheckCommand(): Command {
    return new Command('canary-check')
        .description('Check if a canary phrase matches (for agents)')
        .argument('<phrase>', 'The phrase to check')
        .option('-q, --quiet', 'Exit code only (0=match, 1=no match)')
        .action(async (phrase: string, options) => {
            if (!existsSync(CANARY_FILE)) {
                if (!options.quiet) {
                    console.error('❌ No canary token found.');
                    console.error('   The user should run: mycmail canary-init');
                }
                process.exit(1);
            }

            const storedPhrase = readFileSync(CANARY_FILE, 'utf-8').trim();
            const matches = phrase.trim() === storedPhrase;

            if (options.quiet) {
                process.exit(matches ? 0 : 1);
            }

            if (matches) {
                console.log('✅ Canary phrase MATCHES!');
                console.log('   Identity verified - this is the real owner.');
            } else {
                console.log('❌ Canary phrase does NOT match.');
                console.log('   This may not be the real owner.');
                process.exit(1);
            }
        });
}
