/**
 * Myceliumail Crypto Module
 * 
 * E2E encryption for agent messaging using TweetNaCl.
 * Uses X25519 for key exchange and XSalsa20-Poly1305 for encryption.
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Key storage location
const KEYS_DIR = join(homedir(), '.myceliumail', 'keys');

export interface KeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}

export interface EncryptedMessage {
    ciphertext: string;      // base64
    nonce: string;           // base64
    senderPublicKey: string; // base64
}

/**
 * Ensure keys directory exists
 */
function ensureKeysDir(): void {
    if (!existsSync(KEYS_DIR)) {
        mkdirSync(KEYS_DIR, { recursive: true });
    }
}

/**
 * Generate a new keypair for an agent
 */
export function generateKeyPair(): KeyPair {
    return nacl.box.keyPair();
}

/**
 * Save keypair to local storage
 */
export function saveKeyPair(agentId: string, keyPair: KeyPair): void {
    ensureKeysDir();
    const serialized = {
        publicKey: util.encodeBase64(keyPair.publicKey),
        secretKey: util.encodeBase64(keyPair.secretKey),
    };
    const path = join(KEYS_DIR, `${agentId}.key.json`);
    writeFileSync(path, JSON.stringify(serialized, null, 2), { mode: 0o600 });
}

/**
 * Load keypair from local storage
 */
export function loadKeyPair(agentId: string): KeyPair | null {
    const path = join(KEYS_DIR, `${agentId}.key.json`);
    if (!existsSync(path)) return null;

    try {
        const data = JSON.parse(readFileSync(path, 'utf-8'));
        return {
            publicKey: util.decodeBase64(data.publicKey),
            secretKey: util.decodeBase64(data.secretKey),
        };
    } catch {
        return null;
    }
}

/**
 * Check if keypair exists for an agent
 */
export function hasKeyPair(agentId: string): boolean {
    const path = join(KEYS_DIR, `${agentId}.key.json`);
    return existsSync(path);
}

/**
 * Get public key as base64 string
 */
export function getPublicKeyBase64(keyPair: KeyPair): string {
    return util.encodeBase64(keyPair.publicKey);
}

/**
 * Encrypt a message for a recipient
 */
export function encryptMessage(
    message: string,
    recipientPublicKey: Uint8Array,
    senderKeyPair: KeyPair
): EncryptedMessage {
    const messageBytes = util.decodeUTF8(message);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    const ciphertext = nacl.box(
        messageBytes,
        nonce,
        recipientPublicKey,
        senderKeyPair.secretKey
    );

    return {
        ciphertext: util.encodeBase64(ciphertext),
        nonce: util.encodeBase64(nonce),
        senderPublicKey: util.encodeBase64(senderKeyPair.publicKey),
    };
}

/**
 * Decrypt a message from a sender
 */
export function decryptMessage(
    encrypted: EncryptedMessage,
    recipientKeyPair: KeyPair
): string | null {
    try {
        const ciphertext = util.decodeBase64(encrypted.ciphertext);
        const nonce = util.decodeBase64(encrypted.nonce);
        const senderPublicKey = util.decodeBase64(encrypted.senderPublicKey);

        const decrypted = nacl.box.open(
            ciphertext,
            nonce,
            senderPublicKey,
            recipientKeyPair.secretKey
        );

        if (!decrypted) return null;
        return util.encodeUTF8(decrypted);
    } catch {
        return null;
    }
}

/**
 * Known keys registry - maps agent IDs to their public keys
 */
export function loadKnownKeys(): Record<string, string> {
    const path = join(KEYS_DIR, 'known_keys.json');
    if (!existsSync(path)) return {};
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
        return {};
    }
}

/**
 * Save a known key for an agent
 */
export function saveKnownKey(agentId: string, publicKeyBase64: string): void {
    ensureKeysDir();
    const keys = loadKnownKeys();
    keys[agentId.toLowerCase()] = publicKeyBase64;
    writeFileSync(join(KEYS_DIR, 'known_keys.json'), JSON.stringify(keys, null, 2));
}

/**
 * Get known key for an agent
 */
export function getKnownKey(agentId: string): string | null {
    const keys = loadKnownKeys();
    return keys[agentId.toLowerCase()] || null;
}

/**
 * Get all known keys
 */
export function getKnownKeys(): Record<string, string> {
    return loadKnownKeys();
}

/**
 * Delete a known key
 */
export function deleteKnownKey(agentId: string): boolean {
    const keys = loadKnownKeys();
    const normalizedId = agentId.toLowerCase();
    if (!(normalizedId in keys)) return false;
    delete keys[normalizedId];
    writeFileSync(join(KEYS_DIR, 'known_keys.json'), JSON.stringify(keys, null, 2));
    return true;
}

/**
 * List all own keypairs (for agents we have keys for)
 */
export function listOwnKeys(): string[] {
    ensureKeysDir();
    try {
        const files = readdirSync(KEYS_DIR);
        return files
            .filter(f => f.endsWith('.key.json'))
            .map(f => f.replace('.key.json', ''));
    } catch {
        return [];
    }
}

/**
 * Decode a base64 public key to Uint8Array
 */
export function decodePublicKey(base64: string): Uint8Array {
    return util.decodeBase64(base64);
}

// ============================================================
// Signing Functions (Ed25519 for Identity Verification)
// ============================================================

export interface SigningKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}

/**
 * Generate a new Ed25519 signing keypair
 */
export function generateSigningKeyPair(): SigningKeyPair {
    return nacl.sign.keyPair();
}

/**
 * Save signing keypair to local storage
 */
export function saveSigningKeyPair(agentId: string, keyPair: SigningKeyPair): void {
    ensureKeysDir();
    const serialized = {
        publicKey: util.encodeBase64(keyPair.publicKey),
        secretKey: util.encodeBase64(keyPair.secretKey),
    };
    const path = join(KEYS_DIR, `${agentId}.sign.json`);
    writeFileSync(path, JSON.stringify(serialized, null, 2), { mode: 0o600 });
}

/**
 * Load signing keypair from local storage
 */
export function loadSigningKeyPair(agentId: string): SigningKeyPair | null {
    const path = join(KEYS_DIR, `${agentId}.sign.json`);
    if (!existsSync(path)) return null;

    try {
        const data = JSON.parse(readFileSync(path, 'utf-8'));
        return {
            publicKey: util.decodeBase64(data.publicKey),
            secretKey: util.decodeBase64(data.secretKey),
        };
    } catch {
        return null;
    }
}

/**
 * Check if signing keypair exists for an agent
 */
export function hasSigningKeyPair(agentId: string): boolean {
    const path = join(KEYS_DIR, `${agentId}.sign.json`);
    return existsSync(path);
}

/**
 * Get signing public key as base64 string
 */
export function getSigningPublicKeyBase64(keyPair: SigningKeyPair): string {
    return util.encodeBase64(keyPair.publicKey);
}

/**
 * Sign a message with the agent's signing key
 * Returns base64-encoded signature
 */
export function signMessage(message: string, secretKey: Uint8Array): string {
    const messageBytes = util.decodeUTF8(message);
    const signature = nacl.sign.detached(messageBytes, secretKey);
    return util.encodeBase64(signature);
}

/**
 * Verify a message signature
 * Returns true if the signature is valid
 */
export function verifySignature(
    message: string,
    signatureBase64: string,
    publicKeyBase64: string
): boolean {
    try {
        const messageBytes = util.decodeUTF8(message);
        const signature = util.decodeBase64(signatureBase64);
        const publicKey = util.decodeBase64(publicKeyBase64);
        return nacl.sign.detached.verify(messageBytes, signature, publicKey);
    } catch {
        return false;
    }
}

/**
 * Known signing keys registry - maps agent IDs to their signing public keys
 */
export function loadKnownSigningKeys(): Record<string, string> {
    const path = join(KEYS_DIR, 'known_signing_keys.json');
    if (!existsSync(path)) return {};
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
        return {};
    }
}

/**
 * Save a known signing key for an agent
 */
export function saveKnownSigningKey(agentId: string, publicKeyBase64: string): void {
    ensureKeysDir();
    const keys = loadKnownSigningKeys();
    keys[agentId.toLowerCase()] = publicKeyBase64;
    writeFileSync(join(KEYS_DIR, 'known_signing_keys.json'), JSON.stringify(keys, null, 2));
}

/**
 * Get known signing key for an agent
 */
export function getKnownSigningKey(agentId: string): string | null {
    const keys = loadKnownSigningKeys();
    return keys[agentId.toLowerCase()] || null;
}
