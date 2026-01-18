/**
 * Terminal colors utility for Myceliumail
 * 
 * Uses ANSI escape codes for cross-platform terminal coloring.
 * Color meanings for memory notifications:
 * 
 * - 🟢 Green: Win, success, positive outcomes
 * - 🔴 Red: Pain, error, blocker
 * - 🟡 Yellow: Warning, lesson learned (from mistakes)
 * - 🔵 Blue: Insight, information
 * - 🟣 Magenta: Pattern, recurring theme
 * - ⚪ White/Cyan: Decision, neutral
 */

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Bright versions
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',

    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
};

// Check if colors should be disabled
const noColor = process.env.NO_COLOR || process.env.TERM === 'dumb';

function wrap(color: string, text: string): string {
    if (noColor) return text;
    return `${color}${text}${colors.reset}`;
}

// Color helper functions
export const c = {
    reset: colors.reset,

    // Text colors
    red: (text: string) => wrap(colors.red, text),
    green: (text: string) => wrap(colors.green, text),
    yellow: (text: string) => wrap(colors.yellow, text),
    blue: (text: string) => wrap(colors.blue, text),
    magenta: (text: string) => wrap(colors.magenta, text),
    cyan: (text: string) => wrap(colors.cyan, text),
    white: (text: string) => wrap(colors.white, text),

    // Bright colors
    brightRed: (text: string) => wrap(colors.brightRed, text),
    brightGreen: (text: string) => wrap(colors.brightGreen, text),
    brightYellow: (text: string) => wrap(colors.brightYellow, text),
    brightBlue: (text: string) => wrap(colors.brightBlue, text),
    brightMagenta: (text: string) => wrap(colors.brightMagenta, text),
    brightCyan: (text: string) => wrap(colors.brightCyan, text),

    // Modifiers
    bold: (text: string) => wrap(colors.bold, text),
    dim: (text: string) => wrap(colors.dim, text),

    // Semantic colors for memory types
    lesson: (text: string) => wrap(colors.yellow, text),      // Learned from mistakes
    win: (text: string) => wrap(colors.green, text),          // Success! 
    pain: (text: string) => wrap(colors.red, text),           // Something hurts
    insight: (text: string) => wrap(colors.brightBlue, text), // Aha moment
    pattern: (text: string) => wrap(colors.magenta, text),    // Recurring theme
    decision: (text: string) => wrap(colors.cyan, text),      // Choice made
    blocker: (text: string) => wrap(colors.brightRed, text),  // Blocked!

    // Notification modes
    immediate: (text: string) => wrap(colors.brightGreen, text),
    digest: (text: string) => wrap(colors.dim, text),

    // Status indicators  
    success: (text: string) => wrap(colors.green, text),
    error: (text: string) => wrap(colors.red, text),
    warning: (text: string) => wrap(colors.yellow, text),
    info: (text: string) => wrap(colors.blue, text),

    // Tags
    tag: (text: string) => wrap(colors.cyan, text),
};

/**
 * Get color function for memory type
 */
export function getMemoryTypeColor(type: string): (text: string) => string {
    switch (type.toLowerCase()) {
        case 'lesson': return c.lesson;
        case 'win': return c.win;
        case 'pain': return c.pain;
        case 'insight': return c.insight;
        case 'pattern': return c.pattern;
        case 'decision': return c.decision;
        case 'blocker': return c.blocker;
        default: return c.white;
    }
}

/**
 * Get emoji for memory type
 */
export function getMemoryTypeEmoji(type: string): string {
    switch (type.toLowerCase()) {
        case 'lesson': return '📚';
        case 'win': return '🎉';
        case 'pain': return '😖';
        case 'insight': return '💡';
        case 'pattern': return '🔄';
        case 'decision': return '⚖️';
        case 'blocker': return '🚫';
        default: return '🧠';
    }
}

/**
 * Format tags with color
 */
export function formatTags(tags: string[]): string {
    return tags.map(t => c.tag(`#${t}`)).join(' ');
}

/**
 * Format a colorful memory notification
 */
export function formatMemoryNotification(memory: {
    id: string;
    type: string;
    author: string;
    tags: string[];
    preview: string;
}): string {
    const typeColor = getMemoryTypeColor(memory.type);
    const emoji = getMemoryTypeEmoji(memory.type);

    return [
        `${emoji} ${typeColor(c.bold(`New ${memory.type}`))}`,
        `   ${c.dim('ID:')} ${memory.id}`,
        `   ${c.dim('By:')} ${memory.author}`,
        `   ${c.dim('Tags:')} ${formatTags(memory.tags)}`,
        `   ${typeColor(memory.preview.slice(0, 80))}${memory.preview.length > 80 ? '...' : ''}`
    ].join('\n');
}

/**
 * Format subscription list with colors
 */
export function formatSubscription(tag: string, mode: string): string {
    const modeIcon = mode === 'all' ? c.immediate('🔔') :
        mode === 'relevant' ? c.warning('🔕') :
            c.digest('📋');
    const modeColor = mode === 'all' ? c.immediate :
        mode === 'relevant' ? c.warning :
            c.digest;

    return `  ${modeIcon} ${c.tag(`#${tag}`)} ${c.dim(`(${modeColor(mode)})`)}`;
}
