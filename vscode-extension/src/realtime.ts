/**
 * Supabase Realtime Connection Manager
 * 
 * Handles WebSocket connection to Supabase for real-time message notifications.
 * Implements exponential backoff for reconnection.
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import * as vscode from 'vscode';
import { AgentMessage, WakeConfig, ConnectionState, ConnectionStatus } from './types';

export type MessageCallback = (message: AgentMessage) => void;
export type StatusCallback = (state: ConnectionState) => void;

export class RealtimeConnection implements vscode.Disposable {
    private client: SupabaseClient | null = null;
    private channel: RealtimeChannel | null = null;
    private config: WakeConfig;
    private state: ConnectionState = {
        status: 'disconnected',
        lastConnected: null,
        reconnectAttempts: 0,
        error: null
    };

    private messageCallbacks: MessageCallback[] = [];
    private statusCallbacks: StatusCallback[] = [];
    private reconnectTimer: NodeJS.Timeout | null = null;
    private outputChannel: vscode.OutputChannel;

    // Reconnection settings
    private readonly MAX_RECONNECT_ATTEMPTS = 10;
    private readonly BASE_RECONNECT_DELAY = 1000; // 1 second
    private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds

    constructor(config: WakeConfig, outputChannel: vscode.OutputChannel) {
        this.config = config;
        this.outputChannel = outputChannel;
    }

    /**
     * Register a callback for incoming messages
     */
    onMessage(callback: MessageCallback): void {
        this.messageCallbacks.push(callback);
    }

    /**
     * Register a callback for status changes
     */
    onStatus(callback: StatusCallback): void {
        this.statusCallbacks.push(callback);
    }

    /**
     * Get current connection state
     */
    getState(): ConnectionState {
        return { ...this.state };
    }

    /**
     * Update configuration (e.g., after settings change)
     */
    updateConfig(config: WakeConfig): void {
        const needsReconnect =
            this.config.agentId !== config.agentId ||
            this.config.supabaseUrl !== config.supabaseUrl ||
            this.config.supabaseKey !== config.supabaseKey;

        this.config = config;

        if (needsReconnect && this.state.status === 'connected') {
            this.log('Configuration changed, reconnecting...');
            this.reconnect();
        }
    }

    /**
     * Connect to Supabase Realtime
     */
    async connect(): Promise<boolean> {
        if (!this.validateConfig()) {
            return false;
        }

        this.updateState({ status: 'connecting', error: null });
        this.log(`Connecting to Supabase for agent: ${this.config.agentId}`);

        try {
            // Create Supabase client
            this.client = createClient(this.config.supabaseUrl, this.config.supabaseKey, {
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });

            // Subscribe to agent_messages table
            this.channel = this.client
                .channel('wake-agent')
                .on<AgentMessage>(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'agent_messages',
                        filter: `to_agent=eq.${this.config.agentId}`
                    },
                    (payload) => {
                        this.handleMessage(payload.new as AgentMessage);
                    }
                )
                .subscribe((status, err) => {
                    this.handleSubscriptionStatus(status, err);
                });

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.log(`Connection failed: ${errorMessage}`);
            this.updateState({
                status: 'error',
                error: errorMessage
            });
            this.scheduleReconnect();
            return false;
        }
    }

    /**
     * Disconnect from Supabase Realtime
     */
    async disconnect(): Promise<void> {
        this.cancelReconnect();

        if (this.channel && this.client) {
            await this.client.removeChannel(this.channel);
            this.channel = null;
        }

        if (this.client) {
            await this.client.removeAllChannels();
            this.client = null;
        }

        this.updateState({
            status: 'disconnected',
            reconnectAttempts: 0,
            error: null
        });
        this.log('Disconnected from Supabase Realtime');
    }

    /**
     * Force reconnect
     */
    async reconnect(): Promise<void> {
        await this.disconnect();
        this.state.reconnectAttempts = 0;
        await this.connect();
    }

    /**
     * Handle incoming message
     */
    private handleMessage(message: AgentMessage): void {
        this.log(`📬 New message from ${message.from_agent}: ${message.subject || '(no subject)'}`);

        for (const callback of this.messageCallbacks) {
            try {
                callback(message);
            } catch (error) {
                this.log(`Error in message callback: ${error}`);
            }
        }
    }

    /**
     * Handle subscription status changes
     */
    private handleSubscriptionStatus(status: string, error?: Error): void {
        this.log(`Subscription status: ${status}${error ? ` - ${error.message}` : ''}`);

        switch (status) {
            case 'SUBSCRIBED':
                this.updateState({
                    status: 'connected',
                    lastConnected: new Date(),
                    reconnectAttempts: 0,
                    error: null
                });
                this.log('✅ Connected and listening for messages');
                break;

            case 'CLOSED':
                this.updateState({ status: 'disconnected' });
                this.scheduleReconnect();
                break;

            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
                this.updateState({
                    status: 'error',
                    error: error?.message || status
                });
                this.scheduleReconnect();
                break;
        }
    }

    /**
     * Schedule a reconnection attempt with exponential backoff
     */
    private scheduleReconnect(): void {
        if (this.state.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            this.log('❌ Max reconnection attempts reached. Use "Myceliumail: Reconnect" to try again.');
            this.updateState({
                status: 'error',
                error: 'Max reconnection attempts reached'
            });
            return;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
        const delay = Math.min(
            this.BASE_RECONNECT_DELAY * Math.pow(2, this.state.reconnectAttempts),
            this.MAX_RECONNECT_DELAY
        );

        this.updateState({
            status: 'reconnecting',
            reconnectAttempts: this.state.reconnectAttempts + 1
        });

        this.log(`Reconnecting in ${delay / 1000}s (attempt ${this.state.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

        this.reconnectTimer = setTimeout(async () => {
            await this.connect();
        }, delay);
    }

    /**
     * Cancel scheduled reconnection
     */
    private cancelReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * Validate configuration
     */
    private validateConfig(): boolean {
        if (!this.config.agentId) {
            this.log('❌ Agent ID not configured. Set myceliumail.agentId in settings.');
            this.updateState({ status: 'error', error: 'Agent ID not configured' });
            return false;
        }

        if (!this.config.supabaseUrl || !this.config.supabaseKey) {
            this.log('❌ Supabase not configured. Set myceliumail.supabaseUrl and myceliumail.supabaseKey.');
            this.updateState({ status: 'error', error: 'Supabase not configured' });
            return false;
        }

        return true;
    }

    /**
     * Update internal state and notify listeners
     */
    private updateState(updates: Partial<ConnectionState>): void {
        this.state = { ...this.state, ...updates };

        for (const callback of this.statusCallbacks) {
            try {
                callback(this.state);
            } catch (error) {
                this.log(`Error in status callback: ${error}`);
            }
        }
    }

    /**
     * Log to output channel
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.disconnect();
    }
}
