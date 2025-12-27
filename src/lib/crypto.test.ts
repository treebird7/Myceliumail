/**
 * Crypto Module Tests
 * 
 * Tests for encryption, decryption, and signing functionality.
 */

import { describe, it, expect } from 'vitest';
import {
    generateKeyPair,
    encryptMessage,
    decryptMessage,
    getPublicKeyBase64,
    generateSigningKeyPair,
    signMessage,
    verifySignature,
    getSigningPublicKeyBase64,
} from '../lib/crypto.js';

describe('Crypto Module', () => {
    describe('Key Generation', () => {
        it('should generate valid keypair', () => {
            const keyPair = generateKeyPair();

            expect(keyPair.publicKey).toBeDefined();
            expect(keyPair.secretKey).toBeDefined();
            expect(keyPair.publicKey.length).toBe(32);
            expect(keyPair.secretKey.length).toBe(32);
        });

        it('should generate unique keypairs', () => {
            const keyPair1 = generateKeyPair();
            const keyPair2 = generateKeyPair();

            expect(getPublicKeyBase64(keyPair1)).not.toBe(getPublicKeyBase64(keyPair2));
        });
    });

    describe('Encryption/Decryption', () => {
        it('should encrypt and decrypt message correctly', () => {
            const alice = generateKeyPair();
            const bob = generateKeyPair();
            const message = 'Hello, Bob! This is a secret message.';

            // Alice encrypts for Bob
            const encrypted = encryptMessage(message, bob.publicKey, alice);

            expect(encrypted.ciphertext).toBeDefined();
            expect(encrypted.nonce).toBeDefined();
            expect(encrypted.senderPublicKey).toBeDefined();

            // Bob decrypts
            const decrypted = decryptMessage(encrypted, bob);

            expect(decrypted).toBe(message);
        });

        it('should fail decryption with wrong key', () => {
            const alice = generateKeyPair();
            const bob = generateKeyPair();
            const eve = generateKeyPair();
            const message = 'Secret message';

            const encrypted = encryptMessage(message, bob.publicKey, alice);

            // Eve tries to decrypt
            const decrypted = decryptMessage(encrypted, eve);

            expect(decrypted).toBeNull();
        });

        it('should handle empty messages', () => {
            const alice = generateKeyPair();
            const bob = generateKeyPair();

            const encrypted = encryptMessage('', bob.publicKey, alice);
            const decrypted = decryptMessage(encrypted, bob);

            expect(decrypted).toBe('');
        });

        it('should handle unicode messages', () => {
            const alice = generateKeyPair();
            const bob = generateKeyPair();
            const message = '🍄 Hello from Myceliumail! こんにちは 你好';

            const encrypted = encryptMessage(message, bob.publicKey, alice);
            const decrypted = decryptMessage(encrypted, bob);

            expect(decrypted).toBe(message);
        });
    });

    describe('Digital Signatures', () => {
        it('should generate valid signing keypair', () => {
            const keyPair = generateSigningKeyPair();

            expect(keyPair.publicKey).toBeDefined();
            expect(keyPair.secretKey).toBeDefined();
            expect(keyPair.publicKey.length).toBe(32);
            expect(keyPair.secretKey.length).toBe(64);
        });

        it('should sign and verify message correctly', () => {
            const keyPair = generateSigningKeyPair();
            const message = 'This message is signed by me.';

            const signature = signMessage(message, keyPair.secretKey);
            const publicKeyBase64 = getSigningPublicKeyBase64(keyPair);

            const isValid = verifySignature(message, signature, publicKeyBase64);

            expect(isValid).toBe(true);
        });

        it('should fail verification with wrong public key', () => {
            const alice = generateSigningKeyPair();
            const bob = generateSigningKeyPair();
            const message = 'Signed by Alice';

            const signature = signMessage(message, alice.secretKey);
            const bobPublicKey = getSigningPublicKeyBase64(bob);

            // Verify with Bob's key should fail
            const isValid = verifySignature(message, signature, bobPublicKey);

            expect(isValid).toBe(false);
        });

        it('should fail verification with tampered message', () => {
            const keyPair = generateSigningKeyPair();
            const message = 'Original message';

            const signature = signMessage(message, keyPair.secretKey);
            const publicKey = getSigningPublicKeyBase64(keyPair);

            // Verify tampered message
            const isValid = verifySignature('Tampered message', signature, publicKey);

            expect(isValid).toBe(false);
        });
    });
});
