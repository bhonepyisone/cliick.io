/**
 * WebSocket event emitter utility
 * This allows routes to emit real-time events to connected clients
 */

let io: any = null;

/**
 * Initialize the WebSocket emitter with the Socket.io instance
 */
export const initializeWebSocketEmitter = (socketIoInstance: any) => {
  io = socketIoInstance;
};

/**
 * Emit an event to all clients in a shop
 */
export const emitToShop = (shopId: string, event: string, data: any) => {
  if (!io) {
    console.warn('WebSocket not initialized');
    return;
  }
  io.to(`shop_${shopId}`).emit(event, {
    ...data,
    timestamp: Date.now(),
  });
};

/**
 * Emit new message event
 */
export const emitNewMessage = (shopId: string, message: any) => {
  emitToShop(shopId, 'message:new', message);
};

/**
 * Emit conversation update event
 */
export const emitConversationUpdate = (shopId: string, conversation: any) => {
  emitToShop(shopId, 'conversation:update', conversation);
};

/**
 * Emit order update event
 */
export const emitOrderUpdate = (shopId: string, order: any) => {
  emitToShop(shopId, 'order:update', order);
};

/**
 * Emit notification event
 */
export const emitNotification = (shopId: string, notification: any) => {
  emitToShop(shopId, 'notification', notification);
};

export default {
  initializeWebSocketEmitter,
  emitToShop,
  emitNewMessage,
  emitConversationUpdate,
  emitOrderUpdate,
  emitNotification,
};
