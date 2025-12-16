/**
 * keys command - List known public keys
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import {
    loadKnownKeys,
    listOwnKeys,
    loadKeyPair,
    getPublicKeyBase64
} from '../lib/crypto.js';

export function createKeysCommand(): Command {
    return new Command('keys')
        .description('List known public keys')
        .option('-a, --all', 'Show full keys (not truncated)')
        .action(async (options) => {
            const config = loadConfig();
            const ownKeys = listOwnKeys();
            const knownKeys = loadKnownKeys();

            console.log('🔐 Encryption Keys\n');

            // Own keys
            console.log('── Your Keys ──');
            if (ownKeys.length === 0) {
                console.log('  No keypairs generated. Run: mycmail keygen');
            } else {
                for (const agentId of ownKeys) {
                    const keyPair = loadKeyPair(agentId);
                    if (keyPair) {
                        const pubKey = getPublicKeyBase64(keyPair);
                        const display = options.all ? pubKey : `${pubKey.slice(0, 20)}...`;
                        const marker = agentId === config.agentId ? ' (active)' : '';
                        console.log(`  ${agentId}${marker}: ${display}`);
                    }
                }
            }

            // Known peer keys
            console.log('\n── Peer Keys ──');
            const peerEntries = Object.entries(knownKeys);
            if (peerEntries.length === 0) {
                console.log('  No peer keys imported. Use: mycmail key-import <agent> <key>');
            } else {
                for (const [agentId, pubKey] of peerEntries) {
                    const display = options.all ? pubKey : `${pubKey.slice(0, 20)}...`;
                    console.log(`  ${agentId}: ${display}`);
                }
            }

            console.log('\n💡 Tip: Use --all to show full keys');
        });
}
