/**
 * Myceliumail MCP - Crypto Module
 * 
 * NaCl encryption for agent messaging.
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const KEYS_DIR = join(homedir(), '.myceliumail', 'keys');

export interface KeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}

export interface EncryptedMessage {
    ciphertext: string;
    nonce: string;
    senderPublicKey: string;
}

function ensureKeysDir(): void {
    if (!existsSync(KEYS_DIR)) {
        mkdirSync(KEYS_DIR, { recursive: true });
    }
}

export function generateKeyPair(): KeyPair {
    return nacl.box.keyPair();
}

export function saveKeyPair(agentId: string, keyPair: KeyPair): void {
    ensureKeysDir();
    const serialized = {
        publicKey: util.encodeBase64(keyPair.publicKey),
        secretKey: util.encodeBase64(keyPair.secretKey),
    };
    const path = join(KEYS_DIR, `${agentId}.key.json`);
    writeFileSync(path, JSON.stringify(serialized, null, 2), { mode: 0o600 });
}

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

export function hasKeyPair(agentId: string): boolean {
    return existsSync(join(KEYS_DIR, `${agentId}.key.json`));
}

export function getPublicKeyBase64(keyPair: KeyPair): string {
    return util.encodeBase64(keyPair.publicKey);
}

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

export function loadKnownKeys(): Record<string, string> {
    const path = join(KEYS_DIR, 'known_keys.json');
    if (!existsSync(path)) return {};
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
        return {};
    }
}

// ============================================
// Session Key Management (Phase 2 Fix)
// ============================================

// In-memory key store for session (loaded from local filesystem on init)
let sessionKeyStore: Record<string, string> = {};
let keysInitialized = false;

/**
 * Initialize session keys from local filesystem.
 * Called on first key access or can be called explicitly on startup.
 * Per srlk security requirements: read-only, with audit logging.
 */
export function initializeSessionKeys(): void {
    if (keysInitialized) return;

    // Load from local filesystem (read-only, per srlk security requirements)
    const localKeys = loadKnownKeys();
    const keyCount = Object.keys(localKeys).length;

    sessionKeyStore = { ...localKeys };
    keysInitialized = true;

    // Audit logging (per srlk requirements)
    if (keyCount > 0) {
        console.error(`[AUDIT] MCP Init: Loaded ${keyCount} keys from ${KEYS_DIR}/known_keys.json`);
        console.error(`[AUDIT] Keys loaded: ${Object.keys(localKeys).join(', ')}`);
    } else {
        console.error(`[AUDIT] MCP Init: No keys found in ${KEYS_DIR}/known_keys.json`);
    }
}

/**
 * Reset session keys (for testing or reinitialization)
 */
export function resetSessionKeys(): void {
    sessionKeyStore = {};
    keysInitialized = false;
}

export function saveKnownKey(agentId: string, publicKeyBase64: string): void {
    ensureKeysDir();
    const keys = loadKnownKeys();
    keys[agentId] = publicKeyBase64;
    writeFileSync(join(KEYS_DIR, 'known_keys.json'), JSON.stringify(keys, null, 2));

    // Also update session store
    sessionKeyStore[agentId] = publicKeyBase64;

    // Audit log
    console.error(`[AUDIT] Key imported: ${agentId}`);
}

export function getKnownKey(agentId: string): string | null {
    // Ensure session keys are initialized
    initializeSessionKeys();
    return sessionKeyStore[agentId] || null;
}

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

export function decodePublicKey(base64: string): Uint8Array {
    return util.decodeBase64(base64);
}

// ============================================
// Ed25519 Signing (separate from encryption)
// ============================================

export interface SigningKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}

export function generateSigningKeyPair(): SigningKeyPair {
    return nacl.sign.keyPair();
}

export function saveSigningKeyPair(agentId: string, keyPair: SigningKeyPair): void {
    ensureKeysDir();
    const serialized = {
        publicKey: util.encodeBase64(keyPair.publicKey),
        secretKey: util.encodeBase64(keyPair.secretKey),
    };
    const path = join(KEYS_DIR, `${agentId}.sign.json`);
    writeFileSync(path, JSON.stringify(serialized, null, 2), { mode: 0o600 });
}

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

export function hasSigningKeyPair(agentId: string): boolean {
    return existsSync(join(KEYS_DIR, `${agentId}.sign.json`));
}

export function getSigningPublicKeyBase64(keyPair: SigningKeyPair): string {
    return util.encodeBase64(keyPair.publicKey);
}

export function signMessage(message: string, keyPair: SigningKeyPair): string {
    const messageBytes = util.decodeUTF8(message);
    const signature = nacl.sign.detached(messageBytes, keyPair.secretKey);
    return util.encodeBase64(signature);
}

export function verifySignature(message: string, signatureBase64: string, publicKeyBase64: string): boolean {
    try {
        const messageBytes = util.decodeUTF8(message);
        const signature = util.decodeBase64(signatureBase64);
        const publicKey = util.decodeBase64(publicKeyBase64);
        return nacl.sign.detached.verify(messageBytes, signature, publicKey);
    } catch {
        return false;
    }
}

export function loadKnownSigningKeys(): Record<string, string> {
    const path = join(KEYS_DIR, 'known_signing_keys.json');
    if (!existsSync(path)) return {};
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
        return {};
    }
}

export function saveKnownSigningKey(agentId: string, publicKeyBase64: string): void {
    ensureKeysDir();
    const keys = loadKnownSigningKeys();
    keys[agentId] = publicKeyBase64;
    writeFileSync(join(KEYS_DIR, 'known_signing_keys.json'), JSON.stringify(keys, null, 2));
}

export function getKnownSigningKey(agentId: string): string | null {
    const keys = loadKnownSigningKeys();
    return keys[agentId] || null;
}
