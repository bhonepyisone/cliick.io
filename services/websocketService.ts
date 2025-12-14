/**
 * WebSocket Service - Real-time bidirectional communication
 * Handles live updates for conversations, orders, and notifications
 */

type EventHandler = (data: any) => void;

interface WebSocketMessage {
    type: string;
    event: string;
    data: any;
    timestamp: number;
}

class WebSocketService {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second
    private eventHandlers: Map<string, Set<EventHandler>> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private isIntentionallyClosed = false;

    constructor(url?: string) {
        this.url = url || import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
    }

    /**
     * Connect to WebSocket server
     */
    connect(token?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.isIntentionallyClosed = false;
                const wsUrl = token ? `${this.url}?token=${token}` : this.url;
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    this.startHeartbeat();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.stopHeartbeat();
                    
                    if (!this.isIntentionallyClosed) {
                        this.attemptReconnect();
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.isIntentionallyClosed = true;
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('max_reconnect_attempts', { attempts: this.reconnectAttempts });
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect().catch((error) => {
                console.error('Reconnection failed:', error);
            });
        }, delay);
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send('ping', {});
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(rawData: string): void {
        try {
            const message: WebSocketMessage = JSON.parse(rawData);
            this.emit(message.event, message.data);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    /**
     * Send message to server
     */
    send(event: string, data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: 'client',
                event,
                data,
                timestamp: Date.now(),
            };
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected. Message not sent:', event);
        }
    }

    /**
     * Subscribe to an event
     */
    on(event: string, handler: EventHandler): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);
    }

    /**
     * Unsubscribe from an event
     */
    off(event: string, handler: EventHandler): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.eventHandlers.delete(event);
            }
        }
    }

    /**
     * Emit an event to all subscribers
     */
    private emit(event: string, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get current connection state
     */
    getState(): string {
        if (!this.ws) return 'CLOSED';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'CONNECTING';
            case WebSocket.OPEN:
                return 'OPEN';
            case WebSocket.CLOSING:
                return 'CLOSING';
            case WebSocket.CLOSED:
                return 'CLOSED';
            default:
                return 'UNKNOWN';
        }
    }

    // ============================================
    // CONVENIENCE METHODS FOR COMMON EVENTS
    // ============================================

    /**
     * Subscribe to new messages
     */
    onNewMessage(handler: (message: any) => void): void {
        this.on('message:new', handler);
    }

    /**
     * Subscribe to conversation updates
     */
    onConversationUpdate(handler: (conversation: any) => void): void {
        this.on('conversation:update', handler);
    }

    /**
     * Subscribe to order status updates
     */
    onOrderUpdate(handler: (order: any) => void): void {
        this.on('order:update', handler);
    }

    /**
     * Subscribe to notifications
     */
    onNotification(handler: (notification: any) => void): void {
        this.on('notification', handler);
    }

    /**
     * Join a shop channel (room)
     */
    joinShop(shopId: string): void {
        this.send('shop:join', { shopId });
    }

    /**
     * Leave a shop channel (room)
     */
    leaveShop(shopId: string): void {
        this.send('shop:leave', { shopId });
    }
}

// Export singleton instance
export const wsService = new WebSocketService();
export default wsService;
