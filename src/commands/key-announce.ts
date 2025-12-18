/**
 * key-announce command - Publish your public key to Supabase
 */

import { Command } from 'commander';
import { loadConfig, hasSupabaseConfig } from '../lib/config.js';
import { hasKeyPair, loadKeyPair, getPublicKeyBase64 } from '../lib/crypto.js';

export function createKeyAnnounceCommand(): Command {
    return new Command('key-announce')
        .description('Publish your public key to the network')
        .action(async () => {
            const config = loadConfig();
            const agentId = config.agentId;

            // Check for keypair
            if (!hasKeyPair(agentId)) {
                console.error(`❌ No keypair found for ${agentId}`);
                console.log('   Run: mycmail keygen');
                process.exit(1);
            }

            // Check for Supabase
            if (!hasSupabaseConfig(config)) {
                console.error('❌ Supabase not configured');
                console.log('   Set supabase_url and supabase_key in ~/.myceliumail/config.json');
                process.exit(1);
            }

            const keyPair = loadKeyPair(agentId);
            if (!keyPair) {
                console.error('❌ Failed to load keypair');
                process.exit(1);
            }

            const publicKey = getPublicKeyBase64(keyPair);

            try {
                // Make direct Supabase request
                const url = `${config.supabaseUrl}/rest/v1/agent_keys`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': config.supabaseKey!,
                        'Authorization': `Bearer ${config.supabaseKey}`,
                        'Prefer': 'resolution=merge-duplicates',
                    },
                    body: JSON.stringify({
                        agent_id: agentId,
                        public_key: publicKey,
                        updated_at: new Date().toISOString(),
                    }),
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error);
                }

                console.log('📢 Public key announced successfully!\n');
                console.log(`Agent ID: ${agentId}`);
                console.log(`Public Key: ${publicKey}`);
                console.log('\n✅ Other agents can now send you encrypted messages');
            } catch (error) {
                console.error('❌ Failed to announce key:', error);
                process.exit(1);
            }
        });
}
