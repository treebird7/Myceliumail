/**
 * verify command - Verify a signed message for identity verification
 * 
 * Uses Ed25519 digital signatures to verify identity.
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import {
    loadSigningKeyPair,
    getSigningPublicKeyBase64,
    verifySignature,
    getKnownSigningKey,
    saveKnownSigningKey,
} from '../lib/crypto.js';

export function createVerifyCommand(): Command {
    return new Command('verify')
        .description('Verify a signed message for identity verification')
        .argument('<message>', 'Original message that was signed')
        .argument('<signature>', 'Base64 signature to verify (or - to read from stdin)')
        .option('-a, --agent <id>', 'Agent ID to verify against (uses their known signing key)')
        .option('-k, --key <pubkey>', 'Explicit public key to verify against (base64)')
        .option('--trust', 'If verification succeeds, save the signing key as trusted')
        .option('-q, --quiet', 'Exit code only (0=valid, 1=invalid)')
        .action(async (message: string, signatureArg: string, options) => {
            const config = loadConfig();

            // Handle reading signature from stdin
            let signature = signatureArg;
            if (signatureArg === '-') {
                signature = await readStdin();
            }

            // Determine the public key to verify against
            let publicKey: string;
            let verifyAgentId: string | null = null;

            if (options.key) {
                // Explicit key provided
                publicKey = options.key;
            } else if (options.agent) {
                // Look up agent's known signing key
                const agentIdToCheck = options.agent.toLowerCase() as string;
                verifyAgentId = agentIdToCheck;
                const foundKey = getKnownSigningKey(agentIdToCheck);
                if (!foundKey) {
                    if (!options.quiet) {
                        console.error(`❌ No known signing key for agent: ${agentIdToCheck}`);
                        console.error('   Use --key <pubkey> to provide a key explicitly.');
                        console.error(`   Or trust a key with: mycmail verify <msg> <sig> --key <pubkey> --agent ${agentIdToCheck} --trust`);
                    }
                    process.exit(1);
                    return; // TypeScript needs this for type narrowing
                }
                publicKey = foundKey;
            } else {
                // Default: verify against own key (self-verification)
                const ownKeyPair = loadSigningKeyPair(config.agentId);
                if (!ownKeyPair) {
                    if (!options.quiet) {
                        console.error('❌ No signing key found. Use --agent <id> or --key <pubkey> to specify.');
                    }
                    process.exit(1);
                    return; // TypeScript needs this for type narrowing
                }
                publicKey = getSigningPublicKeyBase64(ownKeyPair);
                verifyAgentId = config.agentId;
            }

            // Verify the signature
            const isValid = verifySignature(message, signature, publicKey);

            if (options.quiet) {
                process.exit(isValid ? 0 : 1);
            }

            if (isValid) {
                console.log('✅ Signature is VALID!\n');
                console.log(`Message: "${message}"`);
                if (verifyAgentId) {
                    console.log(`Signed by: ${verifyAgentId}`);
                }
                console.log(`Public Key: ${publicKey!.substring(0, 20)}...`);

                // Trust the key if requested
                if (options.trust && options.agent && options.key) {
                    saveKnownSigningKey(options.agent.toLowerCase(), options.key);
                    console.log(`\n🔐 Trusted ${options.agent}'s signing key for future verifications.`);
                }
            } else {
                console.log('❌ Signature is INVALID!\n');
                console.log('Possible reasons:');
                console.log('  • Message was modified');
                console.log('  • Wrong public key provided');
                console.log('  • Signature is corrupted');
                console.log('  • Signature was created with a different key');
                process.exit(1);
            }
        });
}

/**
 * Read input from stdin (for piping signature)
 */
async function readStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => {
            let chunk;
            while ((chunk = process.stdin.read()) !== null) {
                data += chunk;
            }
        });
        process.stdin.on('end', () => {
            resolve(data.trim());
        });
        process.stdin.on('error', reject);
    });
}
