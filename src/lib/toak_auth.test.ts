/**
 * Toak API auth helpers (shared with Edge Function)
 */

import { describe, it, expect } from 'vitest';
import { webcrypto, createHmac } from 'node:crypto';
import {
    sha256Hex,
    hmacSha256Hex,
    timingSafeEqual,
    buildSigningString,
    isTimestampFresh
} from '../../supabase/functions/_shared/toak_auth.js';

// Ensure WebCrypto is available in Node test env
if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

describe('toak_auth helpers', () => {
    it('sha256Hex matches known digest', async () => {
        const data = new TextEncoder().encode('hello');
        const digest = await sha256Hex(data);
        expect(digest).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('hmacSha256Hex matches node crypto', async () => {
        const secret = 'secret-key';
        const message = 'payload';
        const expected = createHmac('sha256', secret).update(message).digest('hex');
        const actual = await hmacSha256Hex(secret, message);
        expect(actual).toBe(expected);
    });

    it('timingSafeEqual behaves correctly', () => {
        expect(timingSafeEqual('abc', 'abc')).toBe(true);
        expect(timingSafeEqual('abc', 'abd')).toBe(false);
        expect(timingSafeEqual('short', 'longer')).toBe(false);
    });

    it('buildSigningString matches spec', () => {
        const result = buildSigningString({
            method: 'post',
            path: '/v1/toaklink/send',
            timestamp: '2026-01-28T16:30:00Z',
            nonce: 'nonce-123',
            bodyHash: 'deadbeef',
            agentId: 'sherlocksan'
        });

        expect(result).toBe([
            'POST',
            '/v1/toaklink/send',
            '2026-01-28T16:30:00Z',
            'nonce-123',
            'deadbeef',
            'sherlocksan'
        ].join('\n'));
    });

    it('isTimestampFresh enforces window', () => {
        const now = new Date('2026-01-28T16:30:00Z');
        const within = '2026-01-28T16:26:30Z';
        const outside = '2026-01-28T16:00:00Z';

        expect(isTimestampFresh(within, 5 * 60 * 1000, now)).toBe(true);
        expect(isTimestampFresh(outside, 5 * 60 * 1000, now)).toBe(false);
        expect(isTimestampFresh('not-a-date', 5 * 60 * 1000, now)).toBe(false);
    });
});
