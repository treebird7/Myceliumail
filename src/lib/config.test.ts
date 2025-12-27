/**
 * Config Module Tests
 * 
 * Tests for configuration loading and validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasSupabaseConfig, Config } from '../lib/config.js';

describe('Config Module', () => {
    describe('hasSupabaseConfig', () => {
        it('should return true when both url and key are present', () => {
            const config: Config = {
                agentId: 'test',
                supabaseUrl: 'https://example.supabase.co',
                supabaseKey: 'test-key',
                storageMode: 'auto',
            };

            expect(hasSupabaseConfig(config)).toBe(true);
        });

        it('should return false when url is missing', () => {
            const config: Config = {
                agentId: 'test',
                supabaseKey: 'test-key',
                storageMode: 'auto',
            };

            expect(hasSupabaseConfig(config)).toBe(false);
        });

        it('should return false when key is missing', () => {
            const config: Config = {
                agentId: 'test',
                supabaseUrl: 'https://example.supabase.co',
                storageMode: 'auto',
            };

            expect(hasSupabaseConfig(config)).toBe(false);
        });

        it('should return false when both are missing', () => {
            const config: Config = {
                agentId: 'test',
                storageMode: 'auto',
            };

            expect(hasSupabaseConfig(config)).toBe(false);
        });

        it('should return false for empty strings', () => {
            const config: Config = {
                agentId: 'test',
                supabaseUrl: '',
                supabaseKey: '',
                storageMode: 'auto',
            };

            expect(hasSupabaseConfig(config)).toBe(false);
        });
    });
});
