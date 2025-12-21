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
