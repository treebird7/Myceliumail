/**
 * Action Dispatcher Tests
 * 
 * Tests for action parsing and execution.
 */

import { describe, it, expect } from 'vitest';
import {
    parseActionFromSubject,
    executeAction,
    listAvailableActions,
    WebhookMessage,
} from '../lib/action-dispatcher.js';

describe('Action Dispatcher', () => {
    const mockMessage: WebhookMessage = {
        id: 'test-123',
        recipient: 'mycm',
        sender: 'wsan',
        subject: 'Test message',
        created_at: new Date().toISOString(),
    };

    describe('parseActionFromSubject', () => {
        it('should parse standard action format', () => {
            const result = parseActionFromSubject('[action: echo] hello world');

            expect(result).not.toBeNull();
            expect(result?.action).toBe('echo');
            expect(result?.args).toBe('hello world');
        });

        it('should parse action without args', () => {
            const result = parseActionFromSubject('[action: status]');

            expect(result).not.toBeNull();
            expect(result?.action).toBe('status');
            expect(result?.args).toBe('');
        });

        it('should handle action with no spaces', () => {
            const result = parseActionFromSubject('[action:inbox] limit=10');

            expect(result).not.toBeNull();
            expect(result?.action).toBe('inbox');
            expect(result?.args).toBe('limit=10');
        });

        it('should be case insensitive for action keyword', () => {
            const result = parseActionFromSubject('[ACTION: broadcast] test');

            expect(result).not.toBeNull();
            expect(result?.action).toBe('broadcast');
        });

        it('should normalize action name to lowercase', () => {
            const result = parseActionFromSubject('[action: ECHO] test');

            expect(result?.action).toBe('echo');
        });

        it('should return null for non-action subjects', () => {
            expect(parseActionFromSubject('Regular subject')).toBeNull();
            expect(parseActionFromSubject('Hello [world]')).toBeNull();
            expect(parseActionFromSubject('')).toBeNull();
            expect(parseActionFromSubject(undefined)).toBeNull();
        });

        it('should handle action in middle of subject', () => {
            const result = parseActionFromSubject('Prefix [action: log] some args');

            expect(result).not.toBeNull();
            expect(result?.action).toBe('log');
            expect(result?.args).toBe('some args');
        });
    });

    describe('executeAction', () => {
        it('should execute echo action', async () => {
            const result = await executeAction('echo', 'test message', mockMessage);

            expect(result.success).toBe(true);
            expect(result.action).toBe('echo');
            expect(result.result).toBe('Echo: test message');
        });

        it('should execute status action', async () => {
            const result = await executeAction('status', '', mockMessage);

            expect(result.success).toBe(true);
            expect(result.action).toBe('status');
            expect(result.timestamp).toBeDefined();
        });

        it('should return error for unknown action', async () => {
            const result = await executeAction('unknown-action', '', mockMessage);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unknown action');
        });

        it('should execute inbox action with default limit', async () => {
            const result = await executeAction('inbox', '', mockMessage);

            expect(result.success).toBe(true);
            expect(result.result).toContain('limit: 5');
        });

        it('should execute inbox action with custom limit', async () => {
            const result = await executeAction('inbox', 'limit=10', mockMessage);

            expect(result.success).toBe(true);
            expect(result.result).toContain('limit: 10');
        });
    });

    describe('listAvailableActions', () => {
        it('should return array of action names', () => {
            const actions = listAvailableActions();

            expect(Array.isArray(actions)).toBe(true);
            expect(actions).toContain('echo');
            expect(actions).toContain('status');
            expect(actions).toContain('inbox');
            expect(actions).toContain('log');
        });
    });
});
