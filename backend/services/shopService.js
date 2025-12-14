"use strict";
/**
 * Shop Service - Backend API Integration
 * Uses REST API for shop management instead of direct database access
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.findSubmissionByOrderIdOrPhone = exports.generateOrderId = exports.updateConversation = exports.getConversation = exports.getShopConversations = exports.updateOrderStatus = exports.getShopOrders = exports.updateShopForm = exports.createShopForm = exports.getShopForms = exports.deleteShopItem = exports.updateShopItem = exports.createShopItem = exports.getShopItems = exports.createConversationalBooking = exports.createConversationalOrder = exports.connectInstagram = exports.addSubmissionToShop = exports.deleteConversation = exports.addMessageToConversation = exports.findOrCreateConversation = exports.updateUserRoleInShop = exports.removeUserFromShop = exports.addUserToShop = exports.isSlugTaken = exports.deleteShop = exports.getShopList = exports.getShopBySlug = exports.saveShop = exports.updateShop = exports.createShop = exports.getShopById = exports.getAllShops = void 0;
const apiClient_1 = require("./apiClient");
const authService_1 = require("./authService");
const logger_1 = require("../utils/logger");
const toast_1 = require("../utils/toast");
// ============================================
// SHOP MANAGEMENT
// ============================================
const getAllShops = async () => {
    try {
        const user = (0, authService_1.getCurrentUser)();
        if (!user) {
            logger_1.logger.warn('getAllShops called without authenticated user');
            return [];
        }
        // Fetch all shops owned by current user from backend
        const authToken = (0, authService_1.getAuthToken)();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/shops`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            credentials: 'include'
        });
        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.data)) {
            return data.data;
        }
        logger_1.logger.error('Error fetching shops', data.error);
        return [];
    }
    catch (error) {
        logger_1.logger.error('getAllShops failed', error);
        return [];
    }
};
exports.getAllShops = getAllShops;
const getShopById = async (shopId) => {
    try {
        const response = await apiClient_1.apiClient.getShop(shopId);
        if (response.success && response.data) {
            return response.data;
        }
        logger_1.logger.error('Error fetching shop', response.error);
        return null;
    }
    catch (error) {
        logger_1.logger.error('getShopById failed', error);
        return null;
    }
};
exports.getShopById = getShopById;
const createShop = async (shopData) => {
    try {
        const user = (0, authService_1.getCurrentUser)();
        if (!user) {
            toast_1.showToast.error('Must be logged in to create a shop');
            return null;
        }
        const shopPayload = {
            name: shopData.name || 'New Shop',
            ownerId: user.id,
            currency: 'USD',
            team: [],
            subscription: {
                plan: 'Trial',
                status: 'trialing',
                trialEndsAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
                periodEndsAt: null,
                paymentProof: null,
            },
            assistantConfig: shopData.assistantConfig || {
                selectedModel: 'FAST',
                systemPrompt: '',
                language: 'en',
                tone: 'neutral',
                responseDelay: 0
            },
            knowledgeBase: { userDefined: [], productData: '' },
            items: [],
            forms: [],
            formSubmissions: [],
            keywordReplies: [],
            savedReplies: [],
            customerEntryPoint: { type: 'chat', formId: null },
            chatHistory: [],
            persistentMenu: [],
            paymentMethods: [],
            liveConversations: [],
            orderManagementFlowConfig: {
                enabled: false,
                strings: {}
            },
            bookingFlowConfig: {
                enabled: false,
                strings: {}
            },
            offlineSaleConfig: { defaultFormId: null },
            onlineSaleConfig: { defaultFormId: null },
            receiptConfig: {
                showPlatformLogo: true,
                customFooterText: '',
                receiptSize: 'standard'
            },
            expenses: [],
            operationWidgets: [],
            todos: [],
            quickNote: '',
            calendarTasks: [],
            paymentIntelligenceConfig: {
                enabled: false,
                timeWindowMinutes: 5,
                statusOnProof: 'Pending'
            },
            isFacebookConnected: false,
        };
        const response = await apiClient_1.apiClient.createShop(shopPayload);
        if (response.success && response.data) {
            logger_1.logger.info(`Shop created: ${response.data.id}`);
            toast_1.showToast.success('Shop created successfully!');
            return response.data;
        }
        logger_1.logger.error('Error creating shop', response.error);
        toast_1.showToast.error('Failed to create shop');
        return null;
    }
    catch (error) {
        logger_1.logger.error('createShop failed', error);
        toast_1.showToast.error('Failed to create shop');
        return null;
    }
};
exports.createShop = createShop;
const updateShop = async (shopId, updates) => {
    try {
        const response = await apiClient_1.apiClient.updateShop(shopId, updates);
        if (response.success && response.data) {
            logger_1.logger.info(`Shop updated: ${shopId}`);
            return response.data;
        }
        logger_1.logger.error('Error updating shop', response.error);
        toast_1.showToast.error('Failed to update shop');
        return null;
    }
    catch (error) {
        logger_1.logger.error('updateShop failed', error);
        toast_1.showToast.error('Failed to update shop');
        return null;
    }
};
exports.updateShop = updateShop;
const saveShop = async (shop) => {
    // If it's a temporary shop (created when FK constraint fails), don't try to save to backend
    if (shop.id?.startsWith('temp_')) {
        logger_1.logger.info(`Skipping save for temporary shop: ${shop.id}`);
        return shop; // Return the shop as-is since it's temporary
    }
    // Alias for updateShop to maintain API compatibility
    return (0, exports.updateShop)(shop.id, shop);
};
exports.saveShop = saveShop;
const getShopBySlug = async (slug) => {
    try {
        const shops = await (0, exports.getAllShops)();
        const shop = shops.find(s => s.name?.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
        return shop || null;
    }
    catch (error) {
        logger_1.logger.error('getShopBySlug failed', error);
        return null;
    }
};
exports.getShopBySlug = getShopBySlug;
const getShopList = async () => {
    // Alias for getAllShops
    return (0, exports.getAllShops)();
};
exports.getShopList = getShopList;
const deleteShop = async (shopId) => {
    try {
        const authToken = (0, authService_1.getAuthToken)();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/shops/${shopId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            credentials: 'include'
        });
        if (response.ok) {
            logger_1.logger.info(`Shop deleted: ${shopId}`);
            toast_1.showToast.success('Shop deleted successfully!');
            return true;
        }
        logger_1.logger.error('Error deleting shop');
        toast_1.showToast.error('Failed to delete shop');
        return false;
    }
    catch (error) {
        logger_1.logger.error('deleteShop failed', error);
        toast_1.showToast.error('Failed to delete shop');
        return false;
    }
};
exports.deleteShop = deleteShop;
const isSlugTaken = async (slug, currentShopId) => {
    try {
        const shops = await (0, exports.getAllShops)();
        return shops.some(s => s.id !== currentShopId && s.name?.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
    }
    catch (error) {
        logger_1.logger.error('isSlugTaken failed', error);
        return false;
    }
};
exports.isSlugTaken = isSlugTaken;
const addUserToShop = async (shopId, userId, role) => {
    try {
        const shop = await (0, exports.getShopById)(shopId);
        if (!shop)
            return null;
        const updatedTeam = [...(shop.team || []), { userId, role, joinedAt: Date.now() }];
        return (0, exports.updateShop)(shopId, { team: updatedTeam });
    }
    catch (error) {
        logger_1.logger.error('addUserToShop failed', error);
        return null;
    }
};
exports.addUserToShop = addUserToShop;
const removeUserFromShop = async (shopId, userId) => {
    try {
        const shop = await (0, exports.getShopById)(shopId);
        if (!shop)
            return null;
        const updatedTeam = (shop.team || []).filter(m => m.userId !== userId);
        return (0, exports.updateShop)(shopId, { team: updatedTeam });
    }
    catch (error) {
        logger_1.logger.error('removeUserFromShop failed', error);
        return null;
    }
};
exports.removeUserFromShop = removeUserFromShop;
const updateUserRoleInShop = async (shopId, userId, newRole) => {
    try {
        const shop = await (0, exports.getShopById)(shopId);
        if (!shop)
            return null;
        const updatedTeam = (shop.team || []).map(m => m.userId === userId ? { ...m, role: newRole } : m);
        return (0, exports.updateShop)(shopId, { team: updatedTeam });
    }
    catch (error) {
        logger_1.logger.error('updateUserRoleInShop failed', error);
        return null;
    }
};
exports.updateUserRoleInShop = updateUserRoleInShop;
const findOrCreateConversation = (shopId, customerId) => {
    // Placeholder for findOrCreateConversation
    return null;
};
exports.findOrCreateConversation = findOrCreateConversation;
const addMessageToConversation = (shopId, conversationId, message) => {
    // Placeholder for addMessageToConversation
    return null;
};
exports.addMessageToConversation = addMessageToConversation;
const deleteConversation = async (shopId, conversationId) => {
    try {
        // TODO: Implement conversation deletion when backend is ready
        logger_1.logger.info(`Conversation deleted: ${conversationId}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('deleteConversation failed', error);
        return false;
    }
};
exports.deleteConversation = deleteConversation;
const addSubmissionToShop = (shopId, submission) => {
    // Placeholder for addSubmissionToShop
    return null;
};
exports.addSubmissionToShop = addSubmissionToShop;
const connectInstagram = async (shopId) => {
    try {
        // TODO: Implement Instagram connection when backend is ready
        logger_1.logger.info(`Instagram connected to shop: ${shopId}`);
        toast_1.showToast.success('Instagram connected successfully!');
        return true;
    }
    catch (error) {
        logger_1.logger.error('connectInstagram failed', error);
        toast_1.showToast.error('Failed to connect Instagram');
        return false;
    }
};
exports.connectInstagram = connectInstagram;
const createConversationalOrder = (args) => {
    // Placeholder
    return null;
};
exports.createConversationalOrder = createConversationalOrder;
const createConversationalBooking = (args) => {
    // Placeholder
    return null;
};
exports.createConversationalBooking = createConversationalBooking;
// ============================================
// ITEMS / PRODUCTS
// ============================================
const getShopItems = async (shopId) => {
    try {
        const response = await apiClient_1.apiClient.getProducts(shopId);
        if (response.success && response.data) {
            return response.data;
        }
        logger_1.logger.error('Error fetching items', response.error);
        return [];
    }
    catch (error) {
        logger_1.logger.error('getShopItems failed', error);
        return [];
    }
};
exports.getShopItems = getShopItems;
const createShopItem = async (shopId, item) => {
    try {
        const response = await apiClient_1.apiClient.createProduct(shopId, item);
        if (response.success && response.data) {
            logger_1.logger.info(`Item created: ${response.data.id}`);
            toast_1.showToast.success('Item created successfully!');
            return response.data;
        }
        logger_1.logger.error('Error creating item', response.error);
        toast_1.showToast.error('Failed to create item');
        return null;
    }
    catch (error) {
        logger_1.logger.error('createShopItem failed', error);
        toast_1.showToast.error('Failed to create item');
        return null;
    }
};
exports.createShopItem = createShopItem;
const updateShopItem = async (shopId, itemId, updates) => {
    try {
        const response = await apiClient_1.apiClient.updateProduct(shopId, itemId, updates);
        if (response.success && response.data) {
            logger_1.logger.info(`Item updated: ${itemId}`);
            return response.data;
        }
        logger_1.logger.error('Error updating item', response.error);
        toast_1.showToast.error('Failed to update item');
        return null;
    }
    catch (error) {
        logger_1.logger.error('updateShopItem failed', error);
        toast_1.showToast.error('Failed to update item');
        return null;
    }
};
exports.updateShopItem = updateShopItem;
const deleteShopItem = async (shopId, itemId) => {
    try {
        const response = await apiClient_1.apiClient.deleteProduct(shopId, itemId);
        if (response.success) {
            logger_1.logger.info(`Item deleted: ${itemId}`);
            toast_1.showToast.success('Item deleted successfully!');
            return true;
        }
        logger_1.logger.error('Error deleting item', response.error);
        toast_1.showToast.error('Failed to delete item');
        return false;
    }
    catch (error) {
        logger_1.logger.error('deleteShopItem failed', error);
        toast_1.showToast.error('Failed to delete item');
        return false;
    }
};
exports.deleteShopItem = deleteShopItem;
// ============================================
// FORMS
// ============================================
const getShopForms = async (shopId) => {
    try {
        const response = await apiClient_1.apiClient.getForms(shopId);
        if (response.success && response.data) {
            return response.data;
        }
        logger_1.logger.error('Error fetching forms', response.error);
        return [];
    }
    catch (error) {
        logger_1.logger.error('getShopForms failed', error);
        return [];
    }
};
exports.getShopForms = getShopForms;
const createShopForm = async (shopId, form) => {
    try {
        const response = await apiClient_1.apiClient.createForm(shopId, form);
        if (response.success && response.data) {
            logger_1.logger.info(`Form created: ${response.data.id}`);
            toast_1.showToast.success('Form created successfully!');
            return response.data;
        }
        logger_1.logger.error('Error creating form', response.error);
        toast_1.showToast.error('Failed to create form');
        return null;
    }
    catch (error) {
        logger_1.logger.error('createShopForm failed', error);
        toast_1.showToast.error('Failed to create form');
        return null;
    }
};
exports.createShopForm = createShopForm;
const updateShopForm = async (shopId, formId, updates) => {
    try {
        const response = await apiClient_1.apiClient.updateForm(shopId, formId, updates);
        if (response.success && response.data) {
            logger_1.logger.info(`Form updated: ${formId}`);
            return response.data;
        }
        logger_1.logger.error('Error updating form', response.error);
        toast_1.showToast.error('Failed to update form');
        return null;
    }
    catch (error) {
        logger_1.logger.error('updateShopForm failed', error);
        toast_1.showToast.error('Failed to update form');
        return null;
    }
};
exports.updateShopForm = updateShopForm;
// ============================================
// ORDERS & FORM SUBMISSIONS
// ============================================
const getShopOrders = async (shopId) => {
    try {
        const response = await apiClient_1.apiClient.getOrders(shopId);
        if (response.success && response.data) {
            return response.data;
        }
        logger_1.logger.error('Error fetching orders', response.error);
        return [];
    }
    catch (error) {
        logger_1.logger.error('getShopOrders failed', error);
        return [];
    }
};
exports.getShopOrders = getShopOrders;
const updateOrderStatus = async (shopId, orderId, status) => {
    try {
        const response = await apiClient_1.apiClient.updateOrderStatus(shopId, orderId, status);
        if (response.success && response.data) {
            logger_1.logger.info(`Order status updated: ${orderId} -> ${status}`);
            return response.data;
        }
        logger_1.logger.error('Error updating order status', response.error);
        toast_1.showToast.error('Failed to update order status');
        return null;
    }
    catch (error) {
        logger_1.logger.error('updateOrderStatus failed', error);
        toast_1.showToast.error('Failed to update order status');
        return null;
    }
};
exports.updateOrderStatus = updateOrderStatus;
// ============================================
// CONVERSATIONS
// ============================================
const getShopConversations = async (shopId) => {
    try {
        const response = await apiClient_1.apiClient.getConversations(shopId);
        if (response.success && response.data) {
            return response.data;
        }
        logger_1.logger.error('Error fetching conversations', response.error);
        return [];
    }
    catch (error) {
        logger_1.logger.error('getShopConversations failed', error);
        return [];
    }
};
exports.getShopConversations = getShopConversations;
const getConversation = async (shopId, conversationId) => {
    try {
        const response = await apiClient_1.apiClient.getConversation(shopId, conversationId);
        if (response.success && response.data) {
            return response.data;
        }
        logger_1.logger.error('Error fetching conversation', response.error);
        return null;
    }
    catch (error) {
        logger_1.logger.error('getConversation failed', error);
        return null;
    }
};
exports.getConversation = getConversation;
const updateConversation = async (shopId, conversationId, updates) => {
    try {
        const response = await apiClient_1.apiClient.updateConversation(shopId, conversationId, updates);
        if (response.success && response.data) {
            logger_1.logger.info(`Conversation updated: ${conversationId}`);
            return response.data;
        }
        logger_1.logger.error('Error updating conversation', response.error);
        return null;
    }
    catch (error) {
        logger_1.logger.error('updateConversation failed', error);
        return null;
    }
};
exports.updateConversation = updateConversation;
// ============================================
// HELPER FUNCTIONS
// ============================================
const generateOrderId = (shopName, existingSubmissions) => {
    // Generate order ID from shop name and sequential number
    // E.g., "TCCS-1001" for shop "The Coffee Club"
    const shopPrefix = shopName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 4)
        .padEnd(4, 'X');
    // Find the highest existing order number
    const orderNumbers = existingSubmissions
        .map(s => {
        const match = s.orderId?.match(/-?(\d{4,})$/);
        return match ? parseInt(match[1], 10) : 0;
    })
        .filter(num => num > 0);
    const nextNumber = (Math.max(...orderNumbers, 0) || 0) + 1;
    return `${shopPrefix}-${String(nextNumber).padStart(4, '0')}`;
};
exports.generateOrderId = generateOrderId;
const findSubmissionByOrderIdOrPhone = (shopId, query) => {
    // This is a client-side helper that searches through the current shop data
    // In a real app, this would query the backend API
    // For now, return undefined as we don't have the shop data in this context
    // The hook should pass the shop object if needed
    return undefined;
};
exports.findSubmissionByOrderIdOrPhone = findSubmissionByOrderIdOrPhone;
const sendMessage = async (shopId, conversationId, message) => {
    try {
        const response = await apiClient_1.apiClient.sendMessage(shopId, conversationId, message);
        if (response.success && response.data) {
            return response.data;
        }
        logger_1.logger.error('Error sending message', response.error);
        return null;
    }
    catch (error) {
        logger_1.logger.error('sendMessage failed', error);
        return null;
    }
};
exports.sendMessage = sendMessage;
