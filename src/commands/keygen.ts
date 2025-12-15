/**
 * keygen command - Generate encryption keypair
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import {
    generateKeyPair,
    saveKeyPair,
    hasKeyPair,
    getPublicKeyBase64,
    loadKeyPair
} from '../lib/crypto.js';

export function createKeygenCommand(): Command {
    return new Command('keygen')
        .description('Generate a new encryption keypair')
        .option('-f, --force', 'Overwrite existing keypair')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (hasKeyPair(agentId) && !options.force) {
                console.log(`⚠️  Keypair already exists for ${agentId}`);
                const existingPair = loadKeyPair(agentId);
                if (existingPair) {
                    console.log(`📧 Your public key: ${getPublicKeyBase64(existingPair)}`);
                }
                console.log('\nUse --force to regenerate (⚠️  this will invalidate existing encrypted messages)');
                return;
            }

            const keyPair = generateKeyPair();
            saveKeyPair(agentId, keyPair);

            const publicKey = getPublicKeyBase64(keyPair);

            console.log('🔐 Keypair generated successfully!\n');
            console.log(`Agent ID: ${agentId}`);
            console.log(`📧 Your public key (share with other agents):\n`);
            console.log(publicKey);
            console.log('\n✅ Keys stored in ~/.myceliumail/keys/');
        });
}
