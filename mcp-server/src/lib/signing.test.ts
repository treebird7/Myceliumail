/**
 * Message Signing Tests
 * 
 * Tests for the Phase 1 message signing integration.
 * Verifies that messages can be signed and verified correctly.
 */

import { describe, it, expect } from 'vitest';
import {
    generateSigningKeyPair,
    signMessage,
    verifySignature,
    getSigningPublicKeyBase64,
} from './crypto.js';

describe('Message Signing (Phase 1)', () => {
    describe('Signing Key Generation', () => {
        it('should generate valid signing keypair', () => {
            const keyPair = generateSigningKeyPair();

            expect(keyPair.publicKey).toBeDefined();
            expect(keyPair.secretKey).toBeDefined();
            expect(keyPair.publicKey.length).toBe(32);
            expect(keyPair.secretKey.length).toBe(64); // Ed25519 secret key is 64 bytes
        });

        it('should generate unique keypairs', () => {
            const keyPair1 = generateSigningKeyPair();
            const keyPair2 = generateSigningKeyPair();

            expect(getSigningPublicKeyBase64(keyPair1)).not.toBe(getSigningPublicKeyBase64(keyPair2));
        });
    });

    describe('Message Signing Flow', () => {
        it('should sign and verify a message correctly', () => {
            const keyPair = generateSigningKeyPair();
            const message = JSON.stringify({
                sender: 'srlk',
                recipient: 'wsan',
                subject: 'Test',
                body: 'Hello World',
                timestamp: new Date().toISOString(),
            });

            const signature = signMessage(message, keyPair);
            const publicKey = getSigningPublicKeyBase64(keyPair);

            expect(signature).toBeDefined();
            expect(typeof signature).toBe('string');

            const isValid = verifySignature(message, signature, publicKey);
            expect(isValid).toBe(true);
        });

        it('should reject tampered messages', () => {
            const keyPair = generateSigningKeyPair();
            const originalMessage = JSON.stringify({
                sender: 'srlk',
                recipient: 'wsan',
                subject: 'Test',
                body: 'Hello World',
                timestamp: new Date().toISOString(),
            });

            const signature = signMessage(originalMessage, keyPair);
            const publicKey = getSigningPublicKeyBase64(keyPair);

            // Tamper with the message
            const tamperedMessage = JSON.stringify({
                sender: 'attacker', // Changed!
                recipient: 'wsan',
                subject: 'Test',
                body: 'Hello World',
                timestamp: new Date().toISOString(),
            });

            const isValid = verifySignature(tamperedMessage, signature, publicKey);
            expect(isValid).toBe(false);
        });

        it('should reject signature from wrong key', () => {
            const aliceKeyPair = generateSigningKeyPair();
            const eveKeyPair = generateSigningKeyPair();
            
            const message = 'Secret message';

            // Alice signs
            const signature = signMessage(message, aliceKeyPair);

            // Try to verify with Eve's public key (impersonation attack)
            const evePublicKey = getSigningPublicKeyBase64(eveKeyPair);
            const isValid = verifySignature(message, signature, evePublicKey);

            expect(isValid).toBe(false);
        });

        it('should handle invalid signature gracefully', () => {
            const keyPair = generateSigningKeyPair();
            const message = 'Test message';
            const publicKey = getSigningPublicKeyBase64(keyPair);

            // Invalid base64 signature
            const isValid = verifySignature(message, 'not-a-valid-signature!!!', publicKey);
            expect(isValid).toBe(false);
        });
    });

    describe('Timestamp Replay Prevention', () => {
        it('should include timestamp in signed payload', () => {
            const keyPair = generateSigningKeyPair();
            const timestamp1 = '2026-01-08T10:00:00Z';
            const timestamp2 = '2026-01-08T10:01:00Z';

            const message1 = JSON.stringify({ content: 'Hello', timestamp: timestamp1 });
            const message2 = JSON.stringify({ content: 'Hello', timestamp: timestamp2 });

            const sig1 = signMessage(message1, keyPair);
            const sig2 = signMessage(message2, keyPair);

            // Same content, different timestamps = different signatures
            expect(sig1).not.toBe(sig2);
        });
    });
});
