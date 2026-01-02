/**
 * Treebird Hub WebSocket Client
 *
 * Sprint 3 - Task WS-003
 * Connects to the Hub via Socket.io for real-time agent coordination.
 *
 * @version 1.0.0
 * @author mycm (Myceliumail)
 */

import { loadConfig } from './config.js';
import type {
    WakePayload,
    StatusPayload,
    HeartbeatPayload,
    ChatPayload,
    AgentStatus,
    HEARTBEAT_INTERVAL_MS,
    RECONNECTION_CONFIG,
} from '../types/websocket.js';

// Re-export constants for convenience
export { HEARTBEAT_INTERVAL_MS, RECONNECTION_CONFIG } from '../types/websocket.js';

// =============================================================================
// Types
// =============================================================================

export interface HubClientConfig {
    hubUrl: string;
    agentId: string;
    token?: string;
    autoReconnect?: boolean;
    heartbeatIntervalMs?: number;
}

export interface HubClientCallbacks {
    onWake?: (payload: WakePayload) => void;
    onChat?: (payload: ChatPayload) => void;
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onError?: (error: Error) => void;
}

type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// =============================================================================
// Hub Client Class
// =============================================================================

/**
 * WebSocket client for connecting to Treebird Hub
 */
export class HubClient {
    private config: HubClientConfig;
    private callbacks: HubClientCallbacks;
    private socket: any = null; // Socket.io socket
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private wakeTime: Date | null = null;
    private currentStatus: AgentStatus = 'sleeping';
    private currentTask: string | undefined;
    private _status: SocketStatus = 'disconnected';

    constructor(config: HubClientConfig, callbacks: HubClientCallbacks = {}) {
        this.config = {
            autoReconnect: true,
            heartbeatIntervalMs: 30000,
            ...config,
        };
        this.callbacks = callbacks;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Connect to the Hub WebSocket server
     */
    async connect(): Promise<boolean> {
        if (this._status === 'connected' || this._status === 'connecting') {
            return this._status === 'connected';
        }

        this._status = 'connecting';

        try {
            // Dynamic import of socket.io-client (optional dependency)
            // Using require-style import to handle missing module gracefully
            let io: any;
            try {
                const socketModule = await import('socket.io-client' as any);
                io = socketModule.io;
            } catch {
                console.warn('⚠️  socket.io-client not installed. Hub connection disabled.');
                console.warn('   Install with: npm install socket.io-client');
                this._status = 'disconnected';
                return false;
            }

            this.socket = io(this.config.hubUrl, {
                auth: {
                    token: this.config.token || process.env.AGENT_TOKEN,
                    agentId: this.config.agentId,
                },
                reconnection: false, // We handle reconnection ourselves
                timeout: 10000,
            });

            this.setupEventHandlers();

            // Wait for connection or timeout
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    this._status = 'disconnected';
                    resolve(false);
                }, 10000);

                this.socket.once('connect', () => {
                    clearTimeout(timeout);
                    this._status = 'connected';
                    this.wakeTime = new Date();
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.callbacks.onConnect?.();
                    resolve(true);
                });

                this.socket.once('connect_error', (err: Error) => {
                    clearTimeout(timeout);
                    this._status = 'disconnected';
                    this.callbacks.onError?.(err);
                    resolve(false);
                });
            });
        } catch (err) {
            this._status = 'disconnected';
            // socket.io-client not installed - fail gracefully
            if ((err as any)?.code === 'ERR_MODULE_NOT_FOUND') {
                console.warn('⚠️  socket.io-client not installed. Hub connection disabled.');
                return false;
            }
            throw err;
        }
    }

    /**
     * Disconnect from the Hub
     */
    disconnect(): void {
        this.stopHeartbeat();
        this.stopReconnect();

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this._status = 'disconnected';
        this.wakeTime = null;
    }

    /**
     * Send status update to Hub
     */
    sendStatus(status: AgentStatus, task?: string): void {
        if (!this.socket || this._status !== 'connected') return;

        const previousStatus = this.currentStatus;
        this.currentStatus = status;
        this.currentTask = task;

        const payload: StatusPayload = {
            agentId: this.config.agentId,
            status,
            previousStatus,
            currentTask: task,
            timestamp: new Date().toISOString(),
        };

        this.socket.emit('status', payload);
    }

    /**
     * Send chat message via Hub
     */
    sendChat(recipient: string, message: string, metadata?: { taskId?: string }): void {
        if (!this.socket || this._status !== 'connected') return;

        const payload: Partial<ChatPayload> = {
            sender: this.config.agentId,
            recipient,
            message,
            messageType: 'text',
            metadata,
            timestamp: new Date().toISOString(),
        };

        this.socket.emit('chat', payload);
    }

    /**
     * Get connection status
     */
    get status(): SocketStatus {
        return this._status;
    }

    /**
     * Get uptime in seconds
     */
    get uptime(): number {
        if (!this.wakeTime) return 0;
        return Math.floor((Date.now() - this.wakeTime.getTime()) / 1000);
    }

    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------

    private setupEventHandlers(): void {
        if (!this.socket) return;

        // Wake event from Hub
        this.socket.on('wake', (payload: WakePayload) => {
            this.callbacks.onWake?.(payload);
        });

        // Chat message
        this.socket.on('chat', (payload: ChatPayload) => {
            this.callbacks.onChat?.(payload);
        });

        // Disconnect
        this.socket.on('disconnect', (reason: string) => {
            this._status = 'disconnected';
            this.stopHeartbeat();
            this.callbacks.onDisconnect?.(reason);

            // Attempt reconnect if enabled
            if (this.config.autoReconnect && reason !== 'io client disconnect') {
                this.attemptReconnect();
            }
        });

        // Error
        this.socket.on('error', (error: Error) => {
            this.callbacks.onError?.(error);
        });
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatTimer = setInterval(() => {
            if (!this.socket || this._status !== 'connected') return;

            const payload: HeartbeatPayload = {
                agentId: this.config.agentId,
                status: this.currentStatus,
                uptime: this.uptime,
                currentTask: this.currentTask,
                timestamp: new Date().toISOString(),
            };

            this.socket.emit('heartbeat', payload);
        }, this.config.heartbeatIntervalMs);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private attemptReconnect(): void {
        const maxRetries = 5;
        const baseDelay = 1000;
        const maxDelay = 30000;

        if (this.reconnectAttempts >= maxRetries) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this._status = 'reconnecting';
        this.reconnectAttempts++;

        // Exponential backoff with jitter
        const delay = Math.min(
            baseDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
            maxDelay
        );

        console.log(`🔄 Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${maxRetries})`);

        this.reconnectTimer = setTimeout(async () => {
            const connected = await this.connect();
            if (!connected && this.config.autoReconnect) {
                this.attemptReconnect();
            }
        }, delay);
    }

    private stopReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = 0;
    }
}

// =============================================================================
// Convenience Functions
// =============================================================================

let defaultClient: HubClient | null = null;

/**
 * Get or create the default Hub client using config
 */
export function getHubClient(callbacks?: HubClientCallbacks): HubClient | null {
    if (defaultClient) return defaultClient;

    const config = loadConfig();

    // Check for Hub URL in config or env
    const hubUrl = config.hubUrl || process.env.HUB_URL;
    const agentId = config.agentId || process.env.AGENT_ID;

    if (!hubUrl || !agentId) {
        // Hub not configured - this is optional
        return null;
    }

    defaultClient = new HubClient(
        { hubUrl, agentId, token: process.env.AGENT_TOKEN },
        callbacks
    );

    return defaultClient;
}

/**
 * Connect to Hub on agent wake (if configured)
 */
export async function connectOnWake(
    agentId: string,
    callbacks?: HubClientCallbacks
): Promise<HubClient | null> {
    const config = loadConfig();
    const hubUrl = config.hubUrl || process.env.HUB_URL;

    if (!hubUrl) {
        // Hub not configured - silent skip
        return null;
    }

    const client = new HubClient({ hubUrl, agentId }, callbacks);
    const connected = await client.connect();

    if (connected) {
        client.sendStatus('awake');
        defaultClient = client;
        return client;
    }

    return null;
}

/**
 * Disconnect the default client
 */
export function disconnectHub(): void {
    if (defaultClient) {
        defaultClient.sendStatus('sleeping');
        defaultClient.disconnect();
        defaultClient = null;
    }
}
