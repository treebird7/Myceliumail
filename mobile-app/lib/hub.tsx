'use client';

/**
 * Hub WebSocket client for Myceliumail mobile app
 * 
 * Connects to Treebird Hub for real-time message notifications
 */

import { useEffect, useState, useCallback, useRef } from 'react';

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.treebird.uk';

interface HubMessage {
    type: string;
    sender: string;
    recipient: string;
    subject: string;
    body?: string;
    taskId?: string;
    timestamp: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseHubReturn {
    status: ConnectionStatus;
    lastMessage: HubMessage | null;
    sendMessage: (recipient: string, subject: string, body: string) => Promise<boolean>;
}

/**
 * Custom hook for Hub WebSocket connection
 */
export function useHub(agentIds: string[]): UseHubReturn {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<HubMessage | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setStatus('connecting');

        try {
            const ws = new WebSocket(`${HUB_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`);

            ws.onopen = () => {
                setStatus('connected');
                // Subscribe to messages for our agents
                agentIds.forEach(agentId => {
                    ws.send(JSON.stringify({
                        type: 'subscribe',
                        channel: `agent:${agentId}`
                    }));
                });
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'agent:message' || data.type === 'message') {
                        setLastMessage({
                            type: data.type,
                            sender: data.sender || data.from,
                            recipient: data.recipient || data.to,
                            subject: data.subject,
                            body: data.body || data.message,
                            taskId: data.taskId,
                            timestamp: data.timestamp || new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.error('Failed to parse Hub message:', err);
                }
            };

            ws.onerror = () => {
                setStatus('error');
            };

            ws.onclose = () => {
                setStatus('disconnected');
                wsRef.current = null;
                // Reconnect after 5 seconds
                reconnectTimeoutRef.current = setTimeout(connect, 5000);
            };

            wsRef.current = ws;
        } catch (err) {
            console.error('Failed to connect to Hub:', err);
            setStatus('error');
        }
    }, [agentIds]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback(async (
        recipient: string,
        subject: string,
        body: string
    ): Promise<boolean> => {
        try {
            const response = await fetch(`${HUB_URL}/api/send/${recipient}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: agentIds[0] || 'mobile',
                    subject,
                    body
                })
            });
            return response.ok;
        } catch (err) {
            console.error('Failed to send via Hub:', err);
            return false;
        }
    }, [agentIds]);

    return { status, lastMessage, sendMessage };
}

/**
 * Connection status indicator component
 */
export function HubStatus({ status }: { status: ConnectionStatus }) {
    const colors = {
        connecting: 'bg-yellow-500',
        connected: 'bg-green-500',
        disconnected: 'bg-gray-500',
        error: 'bg-red-500'
    };

    const labels = {
        connecting: 'Connecting...',
        connected: 'Hub Connected',
        disconnected: 'Offline',
        error: 'Connection Error'
    };

    return (
        <div className= "flex items-center gap-2 text-xs text-gray-400" >
        <div className={ `w-2 h-2 rounded-full ${colors[status]} ${status === 'connecting' ? 'animate-pulse' : ''}` } />
            < span > { labels[status]} </span>
            </div>
    );
}
