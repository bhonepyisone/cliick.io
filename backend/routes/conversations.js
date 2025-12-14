"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const server_1 = require("../server");
const router = express_1.default.Router({ mergeParams: true });
// WebSocket event registry for active conversations
const activeConversations = new Map();
router.get('/', async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { data, error } = await supabase_1.supabase.from('conversations').select('*').eq('shop_id', shopId);
        if (error)
            throw error;
        res.status(200).json({ success: true, data: data || [] });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { customer_name, channel, status } = req.body;
        // Validate required fields
        if (!customer_name || !customer_name.trim()) {
            return res.status(400).json({ success: false, error: 'Customer name is required' });
        }
        if (!channel || !['email', 'chat', 'phone', 'social'].includes(channel)) {
            return res.status(400).json({ success: false, error: 'Channel must be one of: email, chat, phone, social' });
        }
        const { data, error } = await supabase_1.supabase.from('conversations')
            .insert([{ shop_id: shopId, customer_name: customer_name.trim(), channel, status: status || 'Open' }])
            .select()
            .single();
        if (error)
            throw error;
        // Emit WebSocket event
        if (server_1.io) {
            server_1.io.to(`shop:${shopId}`).emit('conversation:created', {
                conversation: data,
                timestamp: new Date().toISOString()
            });
        }
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:conversationId', async (req, res, next) => {
    try {
        const { shopId, conversationId } = req.params;
        // Get conversation with message count
        const { data: conversation, error } = await supabase_1.supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .eq('shop_id', shopId)
            .single();
        if (error || !conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        // Get message count
        const { count } = await supabase_1.supabase
            .from('conversation_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId);
        res.status(200).json({ success: true, data: { ...conversation, messageCount: count || 0 } });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:conversationId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId, conversationId } = req.params;
        const { status } = req.body;
        if (!status || !['Open', 'Closed', 'Waiting'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Status must be one of: Open, Closed, Waiting' });
        }
        const { data, error } = await supabase_1.supabase
            .from('conversations')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', conversationId)
            .eq('shop_id', shopId)
            .select()
            .single();
        if (error)
            throw error;
        // Emit WebSocket event
        if (server_1.io) {
            const roomId = `conversation:${shopId}:${conversationId}`;
            server_1.io.to(roomId).emit('conversation:statusChanged', {
                conversationId,
                status,
                timestamp: new Date().toISOString()
            });
            server_1.io.to(`shop:${shopId}`).emit('conversation:updated', { conversation: data });
        }
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:conversationId/messages', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId, conversationId } = req.params;
        const { text, sender, sender_id } = req.body;
        const userId = req.headers['x-user-id'];
        // Validate required fields
        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, error: 'Message text is required' });
        }
        if (!sender || !['customer', 'agent'].includes(sender)) {
            return res.status(400).json({ success: false, error: 'Sender must be "customer" or "agent"' });
        }
        if (text.length > 5000) {
            return res.status(400).json({ success: false, error: 'Message cannot exceed 5000 characters' });
        }
        // Insert message
        const { data, error } = await supabase_1.supabase
            .from('conversation_messages')
            .insert([{
                conversation_id: conversationId,
                text: text.trim(),
                sender,
                sender_id: sender_id || userId,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error)
            throw error;
        // Emit WebSocket event for real-time updates
        if (server_1.io) {
            const roomId = `conversation:${shopId}:${conversationId}`;
            server_1.io.to(roomId).emit('message:new', {
                conversationId,
                message: data,
                timestamp: new Date().toISOString()
            });
            // Also emit to shop notifications
            const shopRoom = `shop:${shopId}`;
            server_1.io.to(shopRoom).emit('conversation:message', {
                conversationId,
                message: data,
                timestamp: new Date().toISOString()
            });
        }
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
// GET /shops/:shopId/conversations/:conversationId/messages - Get all messages
router.get('/:conversationId/messages', async (req, res, next) => {
    try {
        const { shopId, conversationId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const { data, error, count } = await supabase_1.supabase
            .from('conversation_messages')
            .select('*', { count: 'exact' })
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error)
            throw error;
        res.status(200).json({
            success: true,
            data: data?.reverse() || [],
            pagination: { limit: Number(limit), offset: Number(offset), total: count }
        });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /shops/:shopId/conversations/:conversationId/messages/:messageId - Delete message
router.delete('/:conversationId/messages/:messageId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId, conversationId, messageId } = req.params;
        const { error } = await supabase_1.supabase
            .from('conversation_messages')
            .delete()
            .eq('id', messageId)
            .eq('conversation_id', conversationId);
        if (error)
            throw error;
        // Emit WebSocket event
        if (server_1.io) {
            const roomId = `conversation:${shopId}:${conversationId}`;
            server_1.io.to(roomId).emit('message:deleted', { messageId, timestamp: new Date().toISOString() });
        }
        res.status(200).json({ success: true, message: 'Message deleted' });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /shops/:shopId/conversations/:conversationId - Delete conversation
router.delete('/:conversationId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId, conversationId } = req.params;
        // Delete all messages first
        await supabase_1.supabase.from('conversation_messages').delete().eq('conversation_id', conversationId);
        // Delete conversation
        const { error } = await supabase_1.supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId)
            .eq('shop_id', shopId);
        if (error)
            throw error;
        // Emit WebSocket event
        if (server_1.io) {
            const roomId = `conversation:${shopId}:${conversationId}`;
            server_1.io.to(roomId).emit('conversation:deleted', { conversationId, timestamp: new Date().toISOString() });
        }
        res.status(200).json({ success: true, message: 'Conversation deleted' });
    }
    catch (error) {
        next(error);
    }
});
module.exports = router;
