/**
 * WebSocket event emitter utility
 * This allows routes to emit real-time events to connected clients
 */

let io = null;

/**
 * Initialize the WebSocket emitter with the Socket.io instance
 */
const initializeWebSocketEmitter = (socketIoInstance) => {
  io = socketIoInstance;
};

/**
 * Emit an event to all clients in a shop
 */
const emitToShop = (shopId, event, data) => {
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
const emitNewMessage = (shopId, message) => {
  emitToShop(shopId, 'message:new', message);
};

/**
 * Emit conversation update event
 */
const emitConversationUpdate = (shopId, conversation) => {
  emitToShop(shopId, 'conversation:update', conversation);
};

/**
 * Emit order update event
 */
const emitOrderUpdate = (shopId, order) => {
  emitToShop(shopId, 'order:update', order);
};

/**
 * Emit notification event
 */
const emitNotification = (shopId, notification) => {
  emitToShop(shopId, 'notification', notification);
};

module.exports = {
  initializeWebSocketEmitter,
  emitToShop,
  emitNewMessage,
  emitConversationUpdate,
  emitOrderUpdate,
  emitNotification,
};
