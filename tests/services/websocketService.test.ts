/**
 * WebSocket Service Tests
 * Tests for the WebSocket real-time communication service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wsService } from '../../services/websocketService';

// Mock WebSocket
class MockWebSocket {
    onopen: ((event: any) => void) | null = null;
    onclose: ((event: any) => void) | null = null;
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    readyState: number = 0;
    
    constructor(public url: string) {
        // Simulate connection opening
        setTimeout(() => {
            this.readyState = 1; // OPEN
            this.onopen?.({});
        }, 10);
    }

    send(data: string) {
        // Mock send
    }

    close() {
        this.readyState = 3; // CLOSED
        this.onclose?.({});
    }
}

global.WebSocket = MockWebSocket as any;

describe('WebSocketService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        wsService.disconnect();
    });

    describe('Connection Management', () => {
        it('should connect successfully', async () => {
            await expect(wsService.connect()).resolves.toBeUndefined();
            expect(wsService.isConnected()).toBe(true);
            expect(wsService.getState()).toBe('OPEN');
        });

        it('should disconnect successfully', async () => {
            await wsService.connect();
            wsService.disconnect();
            
            expect(wsService.isConnected()).toBe(false);
            expect(wsService.getState()).toBe('CLOSED');
        });

        it('should connect with authentication token', async () => {
            await wsService.connect('test_jwt_token');
            expect(wsService.isConnected()).toBe(true);
        });
    });

    describe('Event Handling', () => {
        it('should subscribe to events', async () => {
            await wsService.connect();
            
            const handler = vi.fn();
            wsService.on('test:event', handler);

            // Simulate receiving message
            const ws = (wsService as any).ws;
            ws.onmessage?.({
                data: JSON.stringify({
                    event: 'test:event',
                    data: { message: 'Hello' },
                }),
            });

            expect(handler).toHaveBeenCalledWith({ message: 'Hello' });
        });

        it('should unsubscribe from events', async () => {
            await wsService.connect();
            
            const handler = vi.fn();
            wsService.on('test:event', handler);
            wsService.off('test:event', handler);

            // Simulate receiving message
            const ws = (wsService as any).ws;
            ws.onmessage?.({
                data: JSON.stringify({
                    event: 'test:event',
                    data: { message: 'Hello' },
                }),
            });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should handle multiple subscribers', async () => {
            await wsService.connect();
            
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            
            wsService.on('test:event', handler1);
            wsService.on('test:event', handler2);

            const ws = (wsService as any).ws;
            ws.onmessage?.({
                data: JSON.stringify({
                    event: 'test:event',
                    data: { message: 'Hello' },
                }),
            });

            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });
    });

    describe('Convenience Methods', () => {
        it('should handle new message events', async () => {
            await wsService.connect();
            
            const handler = vi.fn();
            wsService.onNewMessage(handler);

            const ws = (wsService as any).ws;
            ws.onmessage?.({
                data: JSON.stringify({
                    event: 'message:new',
                    data: { text: 'New message', sender: 'user' },
                }),
            });

            expect(handler).toHaveBeenCalledWith({
                text: 'New message',
                sender: 'user',
            });
        });

        it('should handle conversation update events', async () => {
            await wsService.connect();
            
            const handler = vi.fn();
            wsService.onConversationUpdate(handler);

            const ws = (wsService as any).ws;
            ws.onmessage?.({
                data: JSON.stringify({
                    event: 'conversation:update',
                    data: { id: 'conv_123', status: 'closed' },
                }),
            });

            expect(handler).toHaveBeenCalled();
        });

        it('should handle order update events', async () => {
            await wsService.connect();
            
            const handler = vi.fn();
            wsService.onOrderUpdate(handler);

            const ws = (wsService as any).ws;
            ws.onmessage?.({
                data: JSON.stringify({
                    event: 'order:update',
                    data: { id: 'order_123', status: 'completed' },
                }),
            });

            expect(handler).toHaveBeenCalled();
        });

        it('should handle notification events', async () => {
            await wsService.connect();
            
            const handler = vi.fn();
            wsService.onNotification(handler);

            const ws = (wsService as any).ws;
            ws.onmessage?.({
                data: JSON.stringify({
                    event: 'notification',
                    data: {
                        title: 'New Order',
                        message: 'Order #12345 received',
                    },
                }),
            });

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'New Order',
                })
            );
        });
    });

    describe('Message Sending', () => {
        it('should send messages when connected', async () => {
            await wsService.connect();
            
            const ws = (wsService as any).ws;
            const sendSpy = vi.spyOn(ws, 'send');

            wsService.send('test:event', { data: 'test' });

            expect(sendSpy).toHaveBeenCalled();
        });

        it('should not send messages when disconnected', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            wsService.send('test:event', { data: 'test' });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('WebSocket is not connected')
            );

            consoleSpy.mockRestore();
        });

        it('should join shop successfully', async () => {
            await wsService.connect();
            
            const ws = (wsService as any).ws;
            const sendSpy = vi.spyOn(ws, 'send');

            wsService.joinShop('shop_123');

            expect(sendSpy).toHaveBeenCalledWith(
                expect.stringContaining('shop:join')
            );
        });

        it('should leave shop successfully', async () => {
            await wsService.connect();
            
            const ws = (wsService as any).ws;
            const sendSpy = vi.spyOn(ws, 'send');

            wsService.leaveShop('shop_123');

            expect(sendSpy).toHaveBeenCalledWith(
                expect.stringContaining('shop:leave')
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle connection errors gracefully', async () => {
            const mockErrorWS = class extends MockWebSocket {
                constructor(url: string) {
                    super(url);
                    setTimeout(() => {
                        this.onerror?.(new Error('Connection failed'));
                    }, 5);
                }
            };

            global.WebSocket = mockErrorWS as any;

            await expect(wsService.connect()).rejects.toThrow();
        });

        it('should handle malformed messages', async () => {
            await wsService.connect();
            
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            const ws = (wsService as any).ws;
            ws.onmessage?.({
                data: 'invalid json',
            });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
