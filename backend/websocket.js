/**
 * WebSocket Server Implementation
 * Handles real-time bidirectional communication
 */

const jwt = require('jsonwebtoken');

// Store connected clients per shop
const shopRooms = new Map();

/**
 * Setup WebSocket handlers
 */
function setupWebSocket(io) {
    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.userRole = decoded.role;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        // logger.info(`✅ Client connected: ${socket.id} (User: ${socket.userId})`);

        // Handle shop join
        socket.on('shop:join', async ({ shopId }) => {
            // Verify user has access to this shop
            try {
                // Check if user is a member of the shop
                const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/team_members?shop_id=eq.${shopId}&user_id=eq.${socket.userId}&select=*`, {
                    headers: {
                        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                    }
                });
                
                const members = await response.json();
                
                if (!members || members.length === 0) {
                    socket.emit('error', { message: 'Unauthorized access to shop' });
                    return;
                }
                
                socket.join(`shop_${shopId}`);
                
                // Track connected clients
                if (!shopRooms.has(shopId)) {
                    shopRooms.set(shopId, new Set());
                }
                shopRooms.get(shopId).add(socket.id);

                // logger.info(`User ${socket.userId} joined shop ${shopId}`);
                
                // Notify others in the shop
                socket.to(`shop_${shopId}`).emit('user:joined', {
                    userId: socket.userId,
                    timestamp: Date.now(),
                });
            } catch (error) {
                // Log error for debugging (will use logger in production)
                socket.emit('error', { message: 'Error verifying shop access' });
            }
        });

        // Handle shop leave
        socket.on('shop:leave', ({ shopId }) => {
            socket.leave(`shop_${shopId}`);
            
            const room = shopRooms.get(shopId);
            if (room) {
                room.delete(socket.id);
                if (room.size === 0) {
                    shopRooms.delete(shopId);
                }
            }

            // logger.info(`User ${socket.userId} left shop ${shopId}`);
        });

        // Handle ping (heartbeat)
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });

        // Handle typing indicator
        socket.on('typing:start', ({ shopId, conversationId }) => {
            socket.to(`shop_${shopId}`).emit('typing:start', {
                conversationId,
                userId: socket.userId,
            });
        });

        socket.on('typing:stop', ({ shopId, conversationId }) => {
            socket.to(`shop_${shopId}`).emit('typing:stop', {
                conversationId,
                userId: socket.userId,
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            // logger.info(`❌ Client disconnected: ${socket.id}`);
            
            // Remove from all shop rooms
            shopRooms.forEach((clients, shopId) => {
                if (clients.has(socket.id)) {
                    clients.delete(socket.id);
                    if (clients.size === 0) {
                        shopRooms.delete(shopId);
                    }
                }
            });
        });

        // Handle errors
        socket.on('error', (error) => {
            // logger.error(`WebSocket error for ${socket.id}:`, error);
        });
    });

    // WebSocket server initialized successfully
}

/**
 * Emit event to all clients in a shop
 */
function emitToShop(io, shopId, event, data) {
    io.to(`shop_${shopId}`).emit(event, {
        ...data,
        timestamp: Date.now(),
    });
}

/**
 * Emit new message event
 */
function emitNewMessage(io, shopId, message) {
    emitToShop(io, shopId, 'message:new', message);
}

/**
 * Emit conversation update event
 */
function emitConversationUpdate(io, shopId, conversation) {
    emitToShop(io, shopId, 'conversation:update', conversation);
}

/**
 * Emit order update event
 */
function emitOrderUpdate(io, shopId, order) {
    emitToShop(io, shopId, 'order:update', order);
}

/**
 * Emit notification event
 */
function emitNotification(io, shopId, notification) {
    emitToShop(io, shopId, 'notification', notification);
}

/**
 * Get connected clients count for a shop
 */
function getShopClientsCount(shopId) {
    return shopRooms.get(shopId)?.size || 0;
}

module.exports = setupWebSocket;
module.exports.emitToShop = emitToShop;
module.exports.emitNewMessage = emitNewMessage;
module.exports.emitConversationUpdate = emitConversationUpdate;
module.exports.emitOrderUpdate = emitOrderUpdate;
module.exports.emitNotification = emitNotification;
module.exports.getShopClientsCount = getShopClientsCount;
