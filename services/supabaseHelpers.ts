/**
 * Supabase Helper Functions
 * Provides type-safe wrappers for common database operations
 * Used for critical features: orders, chat, inventory, items
 */

import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';
import { logger } from '../utils/logger';
import { showToast } from '../utils/toast';
import { Item, StockMovement, Form } from '../types';
import { addItemToShop, updateItemInShop, deleteItemFromShop, updateItemStock as updateItemStockInDB, getStockHistory } from './supabaseShopService';
import { addFormToShop, updateFormInShop, deleteFormFromShop } from './supabaseShopService';

// Type aliases for better type safety
type FormSubmissionRow = Database['public']['Tables']['form_submissions']['Row'];
type FormSubmissionInsert = Database['public']['Tables']['form_submissions']['Insert'];
type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];
// ============================================
// ITEMS / PRODUCTS
// ============================================

/**
 * Add item to shop
 */
export const addItem = async (shopId: string, item: Partial<Item>): Promise<Item | null> => {
    try {
        const result = await addItemToShop(shopId, item);
        if (result) {
            logger.info(`Item added: ${result.name}`);
            return result;
        }
        return null;
    } catch (error: any) {
        logger.error('addItem failed', error);
        return null;
    }
};

/**
 * Update item in shop
 */
export const updateItem = async (shopId: string, itemId: string, updates: Partial<Item>): Promise<Item | null> => {
    try {
        const result = await updateItemInShop(shopId, itemId, updates);
        if (result) {
            logger.info(`Item updated: ${itemId}`);
            return result;
        }
        return null;
    } catch (error: any) {
        logger.error('updateItem failed', error);
        return null;
    }
};

/**
 * Delete item from shop
 */
export const deleteItem = async (shopId: string, itemId: string): Promise<boolean> => {
    try {
        const result = await deleteItemFromShop(shopId, itemId);
        if (result) {
            logger.info(`Item deleted: ${itemId}`);
            return true;
        }
        return false;
    } catch (error: any) {
        logger.error('deleteItem failed', error);
        return false;
    }
};

/**
 * Update item stock with history tracking
 */
export const updateItemStock = async (
    itemId: string,
    change: number,
    reason: string
): Promise<{ success: boolean; newStock?: number; error?: string }> => {
    try {
        const result = await updateItemStockInDB(itemId, change, reason);
        return result;
    } catch (error: any) {
        logger.error('updateItemStock failed', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get stock history for an item
 */
export const getItemStockHistory = async (itemId: string): Promise<StockMovement[]> => {
    try {
        const result = await getStockHistory(itemId);
        return result;
    } catch (error: any) {
        logger.error('getItemStockHistory failed', error);
        return [];
    }
};

// ============================================
// FORMS
// ============================================

/**
 * Add form to shop
 */
export const addForm = async (shopId: string, form: Partial<Form>): Promise<Form | null> => {
    try {
        const result = await addFormToShop(shopId, form);
        if (result) {
            logger.info(`Form added: ${result.name}`);
            return result;
        }
        return null;
    } catch (error: any) {
        logger.error('addForm failed', error);
        return null;
    }
};

/**
 * Update form in shop
 */
export const updateForm = async (shopId: string, formId: string, updates: Partial<Form>): Promise<Form | null> => {
    try {
        const result = await updateFormInShop(shopId, formId, updates);
        if (result) {
            logger.info(`Form updated: ${formId}`);
            return result;
        }
        return null;
    } catch (error: any) {
        logger.error('updateForm failed', error);
        return null;
    }
};

/**
 * Delete form from shop
 */
export const deleteForm = async (shopId: string, formId: string): Promise<boolean> => {
    try {
        const result = await deleteFormFromShop(shopId, formId);
        if (result) {
            logger.info(`Form deleted: ${formId}`);
            return true;
        }
        return false;
    } catch (error: any) {
        logger.error('deleteForm failed', error);
        return false;
    }
};

// ============================================
// ORDERS / FORM SUBMISSIONS
// ============================================

export interface OrderData {
    submission_id: string;
    shop_id: string;
    form_id: string;
    form_name: string;
    status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Return';
    ordered_products: any;
    custom_fields: any;
    payment_method?: string;
    payment_screenshot_url?: string;
}

/**
 * Get all orders for a shop
 */
export const getShopOrders = async (shopId: string) => {
    try {
        const { data, error } = await supabase
            .from('form_submissions')
            .select('*')
            .eq('shop_id', shopId)
            .order('submitted_at', { ascending: false });

        if (error) {
            logger.error('Error fetching orders', error);
            return [];
        }

        return data || [];
    } catch (error: any) {
        logger.error('getShopOrders failed', error);
        return [];
    }
};

/**
 * Create a new form submission (order)
 */
export const createFormSubmission = async (shopId: string, submission: any) => {
    try {
        const { data, error } = await supabase
            .from('form_submissions')
            .insert({
                shop_id: shopId,
                submission_id: submission.submissionId || `SUB-${Date.now()}`,
                form_id: submission.formId || 'default',
                form_name: submission.formName || 'Form Submission',
                status: submission.status || 'Pending',
                ordered_products: submission.orderedProducts || [],
                custom_fields: submission.customFields || {},
                payment_method: submission.paymentMethod,
                payment_screenshot_url: submission.paymentScreenshotUrl,
                discount: submission.discount,
                submitted_at: new Date(submission.submittedAt || Date.now()).toISOString(),
            } as any)
            .select()
            .single();

        if (error) {
            logger.error('Error creating form submission', error);
            showToast.error('Failed to submit form');
            return null;
        }

        if (data) {
            logger.info(`Form submission created: ${(data as any).submission_id}`);
        }
        return data;
    } catch (error: any) {
        logger.error('createFormSubmission failed', error);
        showToast.error('Failed to submit form');
        return null;
    }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (
    submissionId: string,
    status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Return'
) => {
    try {
        const { data, error } = await (supabase as any)
            .from('form_submissions')
            .update({ 
                status, 
                updated_at: new Date().toISOString() 
            })
            .eq('submission_id', submissionId)
            .select()
            .single();

        if (error) {
            logger.error('Error updating order status', error);
            showToast.error('Failed to update order');
            return null;
        }

        logger.info(`Order ${submissionId} updated to ${status}`);
        return data;
    } catch (error: any) {
        logger.error('updateOrderStatus failed', error);
        return null;
    }
};

// ============================================// CONVERSATIONS & MESSAGES
// ============================================

/**
 * Get conversations for a shop
 */
export const getShopConversations = async (shopId: string) => {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                id,
                customer_id,
                customer_name,
                platform,
                is_live,
                is_archived,
                last_message_at,
                created_at,
                messages (
                    id,
                    sender,
                    text,
                    attachment,
                    timestamp
                )
            `)
            .eq('shop_id', shopId)
            .order('last_message_at', { ascending: false });

        if (error) {
            logger.error('Error fetching conversations', error);
            return [];
        }

        return data || [];
    } catch (error: any) {
        logger.error('getShopConversations failed', error);
        return [];
    }
};

/**
 * Add message to conversation
 */
export const addMessageToConversation = async (
    conversationId: string,
    sender: 'user' | 'bot',
    text: string,
    attachment?: any
) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender,
                text,
                attachment: attachment || null,
            } as any)
            .select()
            .single();

        if (error) {
            logger.error('Error adding message', error);
            return null;
        }

        // Update conversation's last_message_at
        await (supabase as any)
            .from('conversations')
            .update({ 
                last_message_at: new Date().toISOString() 
            })
            .eq('id', conversationId);

        return data;
    } catch (error: any) {
        logger.error('addMessageToConversation failed', error);
        return null;
    }
};

/**
 * Create or get conversation
 */
export const upsertConversation = async (
    shopId: string,
    customerId: string,
    platform: string,
    customerName?: string
) => {
    try {
        // Try to find existing conversation
        const { data: existing } = await supabase
            .from('conversations')
            .select('*')
            .eq('shop_id', shopId)
            .eq('customer_id', customerId)
            .eq('platform', platform)
            .single();

        if (existing) {
            return existing;
        }

        // Create new conversation
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                shop_id: shopId,
                customer_id: customerId,
                customer_name: customerName || null,
                platform,
                is_live: false,
                is_archived: false,
                last_message_at: new Date().toISOString(),
            } as any)
            .select()
            .single();

        if (error) {
            logger.error('Error creating conversation', error);
            return null;
        }

        return data;
    } catch (error: any) {
        logger.error('upsertConversation failed', error);
        return null;
    }
};

// ============================================
// INVENTORY / STOCK MANAGEMENT
// ============================================

/**
 * Get low stock items
 */
export const getLowStockItems = async (shopId: string, threshold: number = 10) => {
    try {
        const { data, error } = await (supabase as any)
            .rpc('get_low_stock_items', {
                p_shop_id: shopId,
                p_threshold: threshold,
            });

        if (error) {
            logger.error('Error fetching low stock items', error);
            return [];
        }

        return data || [];
    } catch (error: any) {
        logger.error('getLowStockItems failed', error);
        return [];
    }
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to order updates for a shop
 */
export const subscribeToOrderUpdates = (
    shopId: string,
    callback: (payload: any) => void
) => {
    return supabase
        .channel(`orders:${shopId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'form_submissions',
                filter: `shop_id=eq.${shopId}`,
            },
            callback
        )
        .subscribe();
};

/**
 * Subscribe to conversation updates for a shop
 */
export const subscribeToConversationUpdates = (
    shopId: string,
    callback: (payload: any) => void
) => {
    return supabase
        .channel(`conversations:${shopId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `shop_id=eq.${shopId}`,
            },
            callback
        )
        .subscribe();
};

/**
 * Subscribe to message updates for a conversation
 */
export const subscribeToMessages = (
    conversationId: string,
    callback: (payload: any) => void
) => {
    return supabase
        .channel(`messages:${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            },
            callback
        )
        .subscribe();
};

/**
 * Subscribe to stock changes for a shop
 */
export const subscribeToStockUpdates = (
    shopId: string,
    callback: (payload: any) => void
) => {
    return supabase
        .channel(`stock:${shopId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'items',
                filter: `shop_id=eq.${shopId}`,
            },
            callback
        )
        .subscribe();
};
