/**
 * Validation utilities for Myceliumail
 * 
 * Input validation for agent IDs, message content, etc.
 */

// Agent ID pattern: 2-20 lowercase alphanumeric chars, plus _ and -
const AGENT_ID_PATTERN = /^[a-z0-9_-]{2,20}$/;

/**
 * Check if an agent ID is valid
 */
export function isValidAgentId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;

    // Must match pattern
    if (!AGENT_ID_PATTERN.test(id)) return false;

    // Must not contain URL-like patterns (catches concatenation bugs)
    if (id.includes('=')) return false;
    if (id.includes('://')) return false;
    if (id.includes('http')) return false;

    return true;
}

/**
 * Validate an agent ID, throwing if invalid
 */
export function validateAgentId(id: string, fieldName: string = 'agent_id'): void {
    if (!isValidAgentId(id)) {
        throw new Error(
            `Invalid ${fieldName}: "${id}" — must be 2-20 lowercase alphanumeric chars (a-z, 0-9, _, -)`
        );
    }
}

/**
 * Sanitize a potential agent ID (best-effort extraction)
 * Returns null if unrecoverable
 */
export function extractAgentId(input: string): string | null {
    if (!input || typeof input !== 'string') return null;

    // Try to extract just the first valid-looking portion
    const match = input.match(/^([a-z0-9_-]{2,20})/);
    if (match && isValidAgentId(match[1])) {
        return match[1];
    }

    return null;
}
