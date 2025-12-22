/**
 * key-import command - Import a peer's public key
 */

import { Command } from 'commander';
import { saveKnownKey, getKnownKey } from '../lib/crypto.js';
import { checkKeyLimit } from '../lib/license.js';

export function createKeyImportCommand(): Command {
    return new Command('key-import')
        .description('Import a peer agent\'s public key')
        .argument('<agent>', 'Agent ID to import key for')
        .argument('<key>', 'Base64 encoded public key')
        .option('-f, --force', 'Overwrite existing key')
        .action(async (agentId: string, publicKey: string, options) => {
            // Validate key format (basic check)
            if (publicKey.length < 40) {
                console.error('❌ Invalid key format. Expected base64 encoded NaCl public key.');
                process.exit(1);
            }

            const existing = getKnownKey(agentId);
            if (existing && !options.force) {
                console.log(`⚠️  Key already exists for ${agentId}`);
                console.log(`Existing key: ${existing.slice(0, 20)}...`);
                console.log('\nUse --force to overwrite');
                return;
            }

            // Check key limit for free tier (only for new keys)
            if (!existing) {
                checkKeyLimit();
            }

            saveKnownKey(agentId, publicKey);

            console.log(`✅ Imported public key for ${agentId}`);
            console.log(`Key: ${publicKey.slice(0, 20)}...`);
            console.log('\n🔐 You can now send encrypted messages to this agent');
        });
}

