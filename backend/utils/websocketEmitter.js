"use strict";
/**
 * WebSocket event emitter utility
 * This allows routes to emit real-time events to connected clients
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitNotification = exports.emitOrderUpdate = exports.emitConversationUpdate = exports.emitNewMessage = exports.emitToShop = exports.initializeWebSocketEmitter = void 0;
let io = null;
/**
 * Initialize the WebSocket emitter with the Socket.io instance
 */
const initializeWebSocketEmitter = (socketIoInstance) => {
    io = socketIoInstance;
};
exports.initializeWebSocketEmitter = initializeWebSocketEmitter;
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
exports.emitToShop = emitToShop;
/**
 * Emit new message event
 */
const emitNewMessage = (shopId, message) => {
    (0, exports.emitToShop)(shopId, 'message:new', message);
};
exports.emitNewMessage = emitNewMessage;
/**
 * Emit conversation update event
 */
const emitConversationUpdate = (shopId, conversation) => {
    (0, exports.emitToShop)(shopId, 'conversation:update', conversation);
};
exports.emitConversationUpdate = emitConversationUpdate;
/**
 * Emit order update event
 */
const emitOrderUpdate = (shopId, order) => {
    (0, exports.emitToShop)(shopId, 'order:update', order);
};
exports.emitOrderUpdate = emitOrderUpdate;
/**
 * Emit notification event
 */
const emitNotification = (shopId, notification) => {
    (0, exports.emitToShop)(shopId, 'notification', notification);
};
exports.emitNotification = emitNotification;
exports.default = {
    initializeWebSocketEmitter: exports.initializeWebSocketEmitter,
    emitToShop: exports.emitToShop,
    emitNewMessage: exports.emitNewMessage,
    emitConversationUpdate: exports.emitConversationUpdate,
    emitOrderUpdate: exports.emitOrderUpdate,
    emitNotification: exports.emitNotification,
};
