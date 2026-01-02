/**
 * WebSocket Event Types for Treebird Hub
 * 
 * Sprint 3 - Task WS-002
 * @version 1.0.0
 * @author mycm (Myceliumail)
 */

// =============================================================================
// Core Enums
// =============================================================================

/** Reasons an agent can be woken */
export type WakeReason =
    | 'direct_message'    // New message for this agent
    | 'channel_mention'   // Mentioned in a channel
    | 'task_assigned'     // Task from Task Torrenting
    | 'collab_request'    // Collaboration invitation
    | 'scheduled'         // Scheduled wake (cron)
    | 'manual';           // Manual wake by user

/** Message priority levels */
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

/** Agent status values */
export type AgentStatus =
    | 'awake'      // Active and ready
    | 'working'    // Actively processing a task
    | 'idle'       // Awake but waiting
    | 'sleeping'   // Session closed, not active
    | 'error';     // Something went wrong

/** Chat message types */
export type MessageType =
    | 'text'           // Plain text
    | 'task_update'    // Task progress update
    | 'collab_update'  // Collaboration document update
    | 'system';        // System notification

/** WebSocket event names */
export type WebSocketEventName = 'wake' | 'status' | 'heartbeat' | 'chat' | 'error';

// =============================================================================
// Event Payloads
// =============================================================================

/** Wake event payload - sent by Hub to activate an agent */
export interface WakePayload {
    agentId: string;           // Target agent ID (e.g., "mycm", "watsan")
    reason: WakeReason;        // Why the agent is being woken
    priority: Priority;        // Urgency level
    taskId?: string;           // Optional task to work on
    message?: string;          // Optional human-readable message
    sender?: string;           // Who/what triggered the wake
    timestamp: string;         // ISO 8601 timestamp
}

/** Status event payload - sent by agent to report status */
export interface StatusPayload {
    agentId: string;           // Reporting agent ID
    status: AgentStatus;       // Current status
    previousStatus?: AgentStatus;
    currentTask?: string;      // Task ID if working on something
    workspaceId?: string;      // Conversation/workspace ID
    timestamp: string;         // ISO 8601 timestamp
}

/** Heartbeat metrics for session stats */
export interface HeartbeatMetrics {
    messagesProcessed?: number;  // Messages handled this session
    tasksCompleted?: number;     // Tasks finished this session
    errors?: number;             // Errors encountered
}

/** Heartbeat event payload - sent by agent for keep-alive */
export interface HeartbeatPayload {
    agentId: string;           // Reporting agent ID
    status: AgentStatus;       // Current status snapshot
    uptime: number;            // Seconds since wake
    currentTask?: string;      // Task ID if working
    metrics?: HeartbeatMetrics;
    timestamp: string;         // ISO 8601 timestamp
}

/** Chat metadata for context */
export interface ChatMetadata {
    taskId?: string;      // Related task
    collabDoc?: string;   // Related collab document
    priority?: Priority;
}

/** Chat event payload - real-time messaging */
export interface ChatPayload {
    id: string;                // Unique message ID
    sender: string;            // Sender agent ID
    recipient: string;         // Target agent ID or channel
    recipients?: string[];     // Multi-recipient support
    message: string;           // Message content
    messageType: MessageType;  // Type of message
    replyTo?: string;          // Message ID if reply
    metadata?: ChatMetadata;
    timestamp: string;         // ISO 8601 timestamp
}

/** Error codes for WebSocket errors */
export const ErrorCodes = {
    AUTH_FAILED: 'E001',
    INVALID_PAYLOAD: 'E002',
    RATE_LIMITED: 'E003',
    AGENT_NOT_FOUND: 'E004',
    CONNECTION_TIMEOUT: 'E005'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/** Error event payload */
export interface ErrorPayload {
    code: ErrorCode;          // Error code
    message: string;          // Human-readable message
    details?: unknown;        // Additional context
    timestamp: string;
}

// =============================================================================
// Full Event Types
// =============================================================================

export interface WakeEvent {
    event: 'wake';
    payload: WakePayload;
}

export interface StatusEvent {
    event: 'status';
    payload: StatusPayload;
}

export interface HeartbeatEvent {
    event: 'heartbeat';
    payload: HeartbeatPayload;
}

export interface ChatEvent {
    event: 'chat';
    payload: ChatPayload;
}

export interface ErrorEvent {
    event: 'error';
    payload: ErrorPayload;
}

/** Union type for all WebSocket events */
export type WebSocketEvent =
    | WakeEvent
    | StatusEvent
    | HeartbeatEvent
    | ChatEvent
    | ErrorEvent;

// =============================================================================
// Utility Types
// =============================================================================

/** Extract payload type from event type */
export type PayloadOf<E extends WebSocketEvent> = E['payload'];

/** Auth payload for connection */
export interface ConnectionAuth {
    token: string;
    agentId: string;
}

/** Server acknowledgment on successful connect */
export interface ConnectAck {
    connected: true;
    agentId: string;
    serverTime: string;
}

/** Auth error response */
export interface AuthError {
    connected: false;
    code: ErrorCode;
    message: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Default heartbeat interval in milliseconds */
export const HEARTBEAT_INTERVAL_MS = 30000;

/** Reconnection config */
export const RECONNECTION_CONFIG = {
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000
} as const;
