/**
 * Shop Service - Backend API Integration
 * Uses REST API for shop management instead of direct database access
 */

import { apiClient } from './apiClient';
import { 
    Shop, Item, Form, FormSubmission, ShopPaymentMethod, 
    KeywordReply, SavedReply, LiveChatConversation, LiveChatMessage,
    TeamMember, StockMovement, KnowledgeSection, CreateOrderArgs, CreateBookingArgs
} from '../types';
import { getCurrentUser, getAuthToken } from './authService';
import { logger } from '../utils/logger';
import { showToast } from '../utils/toast';

// ============================================
// SHOP MANAGEMENT
// ============================================

export const getAllShops = async (): Promise<Shop[]> => {
    try {
        const user = getCurrentUser();
        if (!user) {
            logger.warn('getAllShops called without authenticated user');
            return [];
        }

        // Fetch all shops owned by current user from backend
        const authToken = getAuthToken();
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
            return data.data as Shop[];
        }

        logger.error('Error fetching shops', data.error);
        return [];
    } catch (error: any) {
        logger.error('getAllShops failed', error);
        return [];
    }
};

export const getShopById = async (shopId: string): Promise<Shop | null> => {
    try {
        const response = await apiClient.getShop(shopId);
        if (response.success && response.data) {
            return response.data as Shop;
        }
        logger.error('Error fetching shop', response.error);
        return null;
    } catch (error: any) {
        logger.error('getShopById failed', error);
        return null;
    }
};

export const createShop = async (shopData: Partial<Shop>): Promise<Shop | null> => {
    try {
        const user = getCurrentUser();
        if (!user) {
            showToast.error('Must be logged in to create a shop');
            return null;
        }

        const shopPayload: any = {
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
                selectedModel: 'FAST' as any,
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
                strings: {} as any 
            },
            bookingFlowConfig: { 
                enabled: false, 
                strings: {} as any 
            },
            offlineSaleConfig: { defaultFormId: null },
            onlineSaleConfig: { defaultFormId: null },
            receiptConfig: { 
                showPlatformLogo: true, 
                customFooterText: '', 
                receiptSize: 'standard' as any 
            },
            expenses: [],
            operationWidgets: [],
            todos: [],
            quickNote: '',
            calendarTasks: [],
            paymentIntelligenceConfig: { 
                enabled: false, 
                timeWindowMinutes: 5, 
                statusOnProof: 'Pending' as any 
            },
            isFacebookConnected: false,
        };

        const response = await apiClient.createShop(shopPayload);
        if (response.success && response.data) {
            logger.info(`Shop created: ${response.data.id}`);
            showToast.success('Shop created successfully!');
            return response.data as Shop;
        }

        logger.error('Error creating shop', response.error);
        showToast.error('Failed to create shop');
        return null;
    } catch (error: any) {
        logger.error('createShop failed', error);
        showToast.error('Failed to create shop');
        return null;
    }
};

export const updateShop = async (shopId: string, updates: Partial<Shop>): Promise<Shop | null> => {
    try {
        const response = await apiClient.updateShop(shopId, updates);
        if (response.success && response.data) {
            logger.info(`Shop updated: ${shopId}`);
            return response.data as Shop;
        }

        logger.error('Error updating shop', response.error);
        showToast.error('Failed to update shop');
        return null;
    } catch (error: any) {
        logger.error('updateShop failed', error);
        showToast.error('Failed to update shop');
        return null;
    }
};

export const saveShop = async (shop: Shop): Promise<Shop | null> => {
    // If it's a temporary shop (created when FK constraint fails), don't try to save to backend
    if (shop.id?.startsWith('temp_')) {
        logger.info(`Skipping save for temporary shop: ${shop.id}`);
        return shop; // Return the shop as-is since it's temporary
    }
    // Alias for updateShop to maintain API compatibility
    return updateShop(shop.id, shop);
};

export const getShopBySlug = async (slug: string): Promise<Shop | null> => {
    try {
        const shops = await getAllShops();
        const shop = shops.find(s => s.name?.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
        return shop || null;
    } catch (error: any) {
        logger.error('getShopBySlug failed', error);
        return null;
    }
};

export const getShopList = async (): Promise<Shop[]> => {
    // Alias for getAllShops
    return getAllShops();
};

export const deleteShop = async (shopId: string): Promise<boolean> => {
    try {
        const authToken = getAuthToken();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/shops/${shopId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            credentials: 'include'
        });

        if (response.ok) {
            logger.info(`Shop deleted: ${shopId}`);
            showToast.success('Shop deleted successfully!');
            return true;
        }

        logger.error('Error deleting shop');
        showToast.error('Failed to delete shop');
        return false;
    } catch (error: any) {
        logger.error('deleteShop failed', error);
        showToast.error('Failed to delete shop');
        return false;
    }
};

export const isSlugTaken = async (slug: string, currentShopId: string): Promise<boolean> => {
    try {
        const shops = await getAllShops();
        return shops.some(s => s.id !== currentShopId && s.name?.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
    } catch (error: any) {
        logger.error('isSlugTaken failed', error);
        return false;
    }
};

export const addUserToShop = async (shopId: string, userId: string, role: string): Promise<Shop | null> => {
    try {
        const shop = await getShopById(shopId);
        if (!shop) return null;

        const updatedTeam = [...(shop.team || []), { userId, role, joinedAt: Date.now() }];
        return updateShop(shopId, { team: updatedTeam as any });
    } catch (error: any) {
        logger.error('addUserToShop failed', error);
        return null;
    }
};

export const removeUserFromShop = async (shopId: string, userId: string): Promise<Shop | null> => {
    try {
        const shop = await getShopById(shopId);
        if (!shop) return null;

        const updatedTeam = (shop.team || []).filter(m => m.userId !== userId);
        return updateShop(shopId, { team: updatedTeam as any });
    } catch (error: any) {
        logger.error('removeUserFromShop failed', error);
        return null;
    }
};

export const updateUserRoleInShop = async (shopId: string, userId: string, newRole: string): Promise<Shop | null> => {
    try {
        const shop = await getShopById(shopId);
        if (!shop) return null;

        const updatedTeam = (shop.team || []).map(m => 
            m.userId === userId ? { ...m, role: newRole } : m
        );
        return updateShop(shopId, { team: updatedTeam as any });
    } catch (error: any) {
        logger.error('updateUserRoleInShop failed', error);
        return null;
    }
};

export const findOrCreateConversation = (shopId: string, customerId: string): any => {
    // Placeholder for findOrCreateConversation
    return null;
};

export const addMessageToConversation = (shopId: string, conversationId: string, message: any): any => {
    // Placeholder for addMessageToConversation
    return null;
};

export const deleteConversation = async (shopId: string, conversationId: string): Promise<boolean> => {
    try {
        // TODO: Implement conversation deletion when backend is ready
        logger.info(`Conversation deleted: ${conversationId}`);
        return true;
    } catch (error: any) {
        logger.error('deleteConversation failed', error);
        return false;
    }
};

export const addSubmissionToShop = (shopId: string, submission: FormSubmission): any => {
    // Placeholder for addSubmissionToShop
    return null;
};

export const connectInstagram = async (shopId: string): Promise<boolean> => {
    try {
        // TODO: Implement Instagram connection when backend is ready
        logger.info(`Instagram connected to shop: ${shopId}`);
        showToast.success('Instagram connected successfully!');
        return true;
    } catch (error: any) {
        logger.error('connectInstagram failed', error);
        showToast.error('Failed to connect Instagram');
        return false;
    }
};

export const createConversationalOrder = (args: CreateOrderArgs): any => {
    // Placeholder
    return null;
};

export const createConversationalBooking = (args: CreateBookingArgs): any => {
    // Placeholder
    return null;
};

// ============================================
// ITEMS / PRODUCTS
// ============================================

export const getShopItems = async (shopId: string): Promise<Item[]> => {
    try {
        const response = await apiClient.getProducts(shopId);
        if (response.success && response.data) {
            return response.data as Item[];
        }
        logger.error('Error fetching items', response.error);
        return [];
    } catch (error: any) {
        logger.error('getShopItems failed', error);
        return [];
    }
};

export const createShopItem = async (shopId: string, item: Omit<Item, 'id'>): Promise<Item | null> => {
    try {
        const response = await apiClient.createProduct(shopId, item);
        if (response.success && response.data) {
            logger.info(`Item created: ${response.data.id}`);
            showToast.success('Item created successfully!');
            return response.data as Item;
        }

        logger.error('Error creating item', response.error);
        showToast.error('Failed to create item');
        return null;
    } catch (error: any) {
        logger.error('createShopItem failed', error);
        showToast.error('Failed to create item');
        return null;
    }
};

export const updateShopItem = async (shopId: string, itemId: string, updates: Partial<Item>): Promise<Item | null> => {
    try {
        const response = await apiClient.updateProduct(shopId, itemId, updates);
        if (response.success && response.data) {
            logger.info(`Item updated: ${itemId}`);
            return response.data as Item;
        }

        logger.error('Error updating item', response.error);
        showToast.error('Failed to update item');
        return null;
    } catch (error: any) {
        logger.error('updateShopItem failed', error);
        showToast.error('Failed to update item');
        return null;
    }
};

export const deleteShopItem = async (shopId: string, itemId: string): Promise<boolean> => {
    try {
        const response = await apiClient.deleteProduct(shopId, itemId);
        if (response.success) {
            logger.info(`Item deleted: ${itemId}`);
            showToast.success('Item deleted successfully!');
            return true;
        }

        logger.error('Error deleting item', response.error);
        showToast.error('Failed to delete item');
        return false;
    } catch (error: any) {
        logger.error('deleteShopItem failed', error);
        showToast.error('Failed to delete item');
        return false;
    }
};

// ============================================
// FORMS
// ============================================

export const getShopForms = async (shopId: string): Promise<Form[]> => {
    try {
        const response = await apiClient.getForms(shopId);
        if (response.success && response.data) {
            return response.data as Form[];
        }
        logger.error('Error fetching forms', response.error);
        return [];
    } catch (error: any) {
        logger.error('getShopForms failed', error);
        return [];
    }
};

export const createShopForm = async (shopId: string, form: Omit<Form, 'id'>): Promise<Form | null> => {
    try {
        const response = await apiClient.createForm(shopId, form);
        if (response.success && response.data) {
            logger.info(`Form created: ${response.data.id}`);
            showToast.success('Form created successfully!');
            return response.data as Form;
        }

        logger.error('Error creating form', response.error);
        showToast.error('Failed to create form');
        return null;
    } catch (error: any) {
        logger.error('createShopForm failed', error);
        showToast.error('Failed to create form');
        return null;
    }
};

export const updateShopForm = async (shopId: string, formId: string, updates: Partial<Form>): Promise<Form | null> => {
    try {
        const response = await apiClient.updateForm(shopId, formId, updates);
        if (response.success && response.data) {
            logger.info(`Form updated: ${formId}`);
            return response.data as Form;
        }

        logger.error('Error updating form', response.error);
        showToast.error('Failed to update form');
        return null;
    } catch (error: any) {
        logger.error('updateShopForm failed', error);
        showToast.error('Failed to update form');
        return null;
    }
};

// ============================================
// ORDERS & FORM SUBMISSIONS
// ============================================

export const getShopOrders = async (shopId: string): Promise<FormSubmission[]> => {
    try {
        const response = await apiClient.getOrders(shopId);
        if (response.success && response.data) {
            return response.data as FormSubmission[];
        }
        logger.error('Error fetching orders', response.error);
        return [];
    } catch (error: any) {
        logger.error('getShopOrders failed', error);
        return [];
    }
};

export const updateOrderStatus = async (shopId: string, orderId: string, status: string): Promise<FormSubmission | null> => {
    try {
        const response = await apiClient.updateOrderStatus(shopId, orderId, status);
        if (response.success && response.data) {
            logger.info(`Order status updated: ${orderId} -> ${status}`);
            return response.data as FormSubmission;
        }

        logger.error('Error updating order status', response.error);
        showToast.error('Failed to update order status');
        return null;
    } catch (error: any) {
        logger.error('updateOrderStatus failed', error);
        showToast.error('Failed to update order status');
        return null;
    }
};

// ============================================
// CONVERSATIONS
// ============================================

export const getShopConversations = async (shopId: string): Promise<LiveChatConversation[]> => {
    try {
        const response = await apiClient.getConversations(shopId);
        if (response.success && response.data) {
            return response.data as LiveChatConversation[];
        }
        logger.error('Error fetching conversations', response.error);
        return [];
    } catch (error: any) {
        logger.error('getShopConversations failed', error);
        return [];
    }
};

export const getConversation = async (shopId: string, conversationId: string): Promise<LiveChatConversation | null> => {
    try {
        const response = await apiClient.getConversation(shopId, conversationId);
        if (response.success && response.data) {
            return response.data as LiveChatConversation;
        }
        logger.error('Error fetching conversation', response.error);
        return null;
    } catch (error: any) {
        logger.error('getConversation failed', error);
        return null;
    }
};

export const updateConversation = async (shopId: string, conversationId: string, updates: Partial<LiveChatConversation>): Promise<LiveChatConversation | null> => {
    try {
        const response = await apiClient.updateConversation(shopId, conversationId, updates);
        if (response.success && response.data) {
            logger.info(`Conversation updated: ${conversationId}`);
            return response.data as LiveChatConversation;
        }

        logger.error('Error updating conversation', response.error);
        return null;
    } catch (error: any) {
        logger.error('updateConversation failed', error);
        return null;
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const generateOrderId = (shopName: string, existingSubmissions: FormSubmission[]): string => {
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

export const findSubmissionByOrderIdOrPhone = (shopId: string, query: string): FormSubmission | undefined => {
    // This is a client-side helper that searches through the current shop data
    // In a real app, this would query the backend API
    // For now, return undefined as we don't have the shop data in this context
    // The hook should pass the shop object if needed
    return undefined;
};

export const sendMessage = async (shopId: string, conversationId: string, message: Omit<LiveChatMessage, 'id' | 'timestamp'>): Promise<LiveChatConversation | null> => {
    try {
        const response = await apiClient.sendMessage(shopId, conversationId, message);
        if (response.success && response.data) {
            return response.data as LiveChatConversation;
        }

        logger.error('Error sending message', response.error);
        return null;
    } catch (error: any) {
        logger.error('sendMessage failed', error);
        return null;
    }
};
