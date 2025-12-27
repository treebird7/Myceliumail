/**
 * sign command - Sign a message for identity verification
 * 
 * Uses Ed25519 digital signatures to prove identity.
 * This is separate from encryption keys (used for messaging).
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import {
    generateSigningKeyPair,
    saveSigningKeyPair,
    loadSigningKeyPair,
    hasSigningKeyPair,
    getSigningPublicKeyBase64,
    signMessage,
} from '../lib/crypto.js';

export function createSignCommand(): Command {
    return new Command('sign')
        .description('Sign a message for identity verification')
        .argument('<message>', 'Message to sign')
        .option('--init', "Initialize signing key if it doesn't exist")
        .option('--show-key', 'Also display the signing public key')
        .option('-q, --quiet', 'Only output the signature (for piping)')
        .action(async (message: string, options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            // Check if signing keypair exists
            let signingKeyPair = loadSigningKeyPair(agentId);

            if (!signingKeyPair) {
                if (options.init) {
                    // Generate new signing keypair
                    signingKeyPair = generateSigningKeyPair();
                    saveSigningKeyPair(agentId, signingKeyPair);
                    if (!options.quiet) {
                        console.log('🔑 Generated new signing keypair!\n');
                    }
                } else {
                    console.error('❌ No signing key found for this agent.');
                    console.error('   Run `mycmail sign --init <message>` to create one.');
                    console.error('   Or run `mycmail sign-keygen` to just generate the key.\n');
                    process.exit(1);
                }
            }

            // Sign the message
            const signature = signMessage(message, signingKeyPair.secretKey);

            if (options.quiet) {
                console.log(signature);
            } else {
                console.log('✍️  Message signed!\n');
                console.log(`Agent: ${agentId}`);
                console.log(`Message: "${message}"`);
                console.log(`\n📝 Signature:`);
                console.log(signature);

                if (options.showKey) {
                    console.log(`\n🔑 Signing Public Key:`);
                    console.log(getSigningPublicKeyBase64(signingKeyPair));
                }

                console.log('\n💡 Verify with: mycmail verify <message> <signature> [--agent <id>]');
            }
        });
}

export function createSignKeygenCommand(): Command {
    return new Command('sign-keygen')
        .description('Generate a signing keypair for identity verification')
        .option('-f, --force', 'Overwrite existing signing keypair')
        .action(async (options) => {
            const config = loadConfig();
            const agentId = config.agentId;

            if (hasSigningKeyPair(agentId) && !options.force) {
                console.log(`⚠️  Signing keypair already exists for ${agentId}`);
                const existingPair = loadSigningKeyPair(agentId);
                if (existingPair) {
                    console.log(`\n🔑 Your signing public key:`);
                    console.log(getSigningPublicKeyBase64(existingPair));
                }
                console.log('\nUse --force to regenerate (⚠️  this will invalidate existing signatures!)');
                return;
            }

            const keyPair = generateSigningKeyPair();
            saveSigningKeyPair(agentId, keyPair);

            const publicKey = getSigningPublicKeyBase64(keyPair);

            console.log('🔐 Signing keypair generated successfully!\n');
            console.log(`Agent ID: ${agentId}`);
            console.log(`\n🔑 Your signing public key (share with other agents for verification):\n`);
            console.log(publicKey);
            console.log('\n✅ Signing key stored in ~/.myceliumail/keys/');
            console.log('\n💡 Sign messages with: mycmail sign <message>');
        });
}
