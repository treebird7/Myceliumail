/**
 * keygen command - Generate encryption keypair
 * 
 * SECURITY FIX (2026-01-08): Added finally block for guaranteed cleanup
 * of plaintext key file when using --vault option.
 * Auditor: Sherlocksan (srlk)
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
        .option('--vault', 'Backup key to current repo using envoak (requires ENVAULT_KEY)')
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

            // Envault Integration (with secure cleanup)
            if (options.vault) {
                const { execFileSync } = await import('child_process');
                const { join } = await import('path');
                const { copyFileSync, rmSync, existsSync } = await import('fs');
                const { homedir } = await import('os');

                // 1. Locate Source Key
                const keysDir = join(homedir(), '.myceliumail', 'keys');
                const sourceKeyPath = join(keysDir, `${agentId}.key.json`);

                if (!existsSync(sourceKeyPath)) {
                    console.log('\n❌ Could not find generated key file for vault backup.');
                    return;
                }

                // 2. Prepare Destination (Current Directory)
                const destFileName = `${agentId}.key.json`;
                const destEncName = `${destFileName}.enc`;

                // Track temp file for guaranteed cleanup
                let tempFileCreated = false;

                try {
                    // 3. Copy to CWD temporarily
                    copyFileSync(sourceKeyPath, destFileName);
                    tempFileCreated = true;

                    // 4. Encrypt using Envault
                    console.log('\n🔒 Encrypting to Envault...');
                    execFileSync('envault', ['file', 'push', destFileName, destEncName], { stdio: 'inherit' });
                    console.log('✅ Key securely backed up to ' + destEncName);

                } catch (err: any) {
                    console.error('❌ Envault backup failed:');
                    console.error('   Make sure `envault` is installed and ENVAULT_KEY is set.');
                    console.error(`   Error: ${err.message || err}`);
                } finally {
                    // SECURITY: Always remove plaintext copy, even on error
                    // Source key is safe in ~/.myceliumail/keys/
                    if (tempFileCreated && existsSync(destFileName)) {
                        try {
                            rmSync(destFileName);
                        } catch (cleanupErr) {
                            console.error('⚠️  Warning: Could not remove temporary key file:', destFileName);
                            console.error('   Please delete it manually to avoid key exposure.');
                        }
                    }
                }
            }
        });
}
