/**
 * Supabase Shop Service - Sub-Phase 2.1: Core Shop & Items
 * Replaces localStorage-based shop management with real Supabase database
 * 
 * NOTE: This service runs ALONGSIDE the old shopService.ts during migration
 * Once all components are migrated, the old service can be deleted
 */

import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';
import { 
    Shop, Item, TeamMember, StockMovement, Role, 
    AssistantConfig, KnowledgeBase, Subscription,
    Form, FormSubmission, ShopPaymentMethod, OrderStatus, OrderedItem,
    LiveChatConversation, LiveChatMessage, LiveChatStatus, LiveChatChannel
} from '../types';
import { getCurrentUser } from './authService';
import { logger } from '../utils/logger';
import { apiClient } from './apiClient';

// Type aliases from database
type ShopRow = Database['public']['Tables']['shops']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];
type TeamMemberRow = Database['public']['Tables']['team_members']['Row'];
type FormRow = Database['public']['Tables']['forms']['Row'];
type FormSubmissionRow = Database['public']['Tables']['form_submissions']['Row'];
type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];
type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];

// Real-time subscription cleanup
type RealtimeChannel = ReturnType<typeof supabase.channel>;
const activeChannels: Map<string, RealtimeChannel> = new Map();

// ============================================
// SHOP OPERATIONS
// ============================================

/**
 * Get shop by ID with all related data
 */
export const getShopById = async (shopId: string): Promise<Shop | null> => {
    try {
        const { data, error } = await supabase
            .from('shops')
            .select(`
                *,
                team_members (
                    *,
                    profiles (username, avatar_url)
                ),
                items (*)
            `)
            .eq('id', shopId)
            .single();

        if (error || !data) {
            logger.dbError('fetch', 'shop', error);
            return null;
        }

        return await enrichShopWithFullData(data);
    } catch (error) {
        logger.dbError('fetch', 'shop', error);
        return null;
    }
};

/**
 * Get all shops for current user
 */
export const getAllShops = async (): Promise<Shop[]> => {
    try {
        const user = getCurrentUser();
        if (!user) {
            console.warn('No authenticated user');
            return [];
        }

        const { data, error } = await supabase
            .from('team_members')
            .select('shop_id')
            .eq('user_id', user.id);

        if (error || !data) {
            console.error('Error fetching user shops:', error);
            return [];
        }

        // Fetch full details for each shop
        const shopIds = data.map((tm: any) => tm.shop_id);
        const shops = await Promise.all(
            shopIds.map(id => getShopById(id))
        );

        return shops.filter((shop): shop is Shop => shop !== null);
    } catch (error) {
        console.error('Error fetching user shops:', error);
        return [];
    }
};

/**
 * Create new shop
 * Uses backend API instead of direct Supabase to ensure proper subscription initialization
 */
export const createShop = async (name: string, description?: string): Promise<Shop | null> => {
    try {
        const user = getCurrentUser();
        if (!user) {
            console.error('No authenticated user');
            return null;
        }

        // Use backend API to create shop
        const response = await apiClient.createShop({
            name,
            description: description || undefined,
            currency: 'USD',
            assistant_model: 'default'
        });

        if (!response.success || !response.data) {
            console.error('Error creating shop via API:', response.error);
            return null;
        }

        // Fetch and return complete shop
        return await getShopById(response.data.id);
    } catch (error) {
        console.error('Error creating shop:', error);
        return null;
    }
};

/**
 * Update shop - handles partial updates
 */
export const saveShop = async (shop: Shop): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('shops')
            .update({
                name: shop.name,
                logo_url: shop.logoUrl,
                assistant_name: (shop.assistantConfig as any).assistantName || shop.assistantConfig.language,
                assistant_tone: shop.assistantConfig.tone,
                primary_language: shop.assistantConfig.language,
                subscription_plan: shop.subscription.plan,
                subscription_status: shop.subscription.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', shop.id);

        if (error) {
            console.error('Error updating shop:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating shop:', error);
        return false;
    }
};

/**
 * Delete shop
 */
export const deleteShop = async (shopId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('shops')
            .delete()
            .eq('id', shopId);

        if (error) {
            console.error('Error deleting shop:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting shop:', error);
        return false;
    }
};

/**
 * Check if custom URL slug is already taken
 */
export const isSlugTaken = async (slug: string, currentShopId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('shops')
            .select('id')
            .ilike('custom_url_slug', slug)
            .neq('id', currentShopId)
            .limit(1);

        if (error) {
            console.error('Error checking slug:', error);
            return true; // Assume taken on error to be safe
        }

        return (data && data.length > 0);
    } catch (error) {
        console.error('Error checking slug:', error);
        return true; // Assume taken on error
    }
};

// ============================================
// ITEM (PRODUCT/SERVICE) OPERATIONS
// ============================================

/**
 * Add item to shop
 */
export const addItemToShop = async (shopId: string, item: Partial<Item>): Promise<Item | null> => {
    try {
        const { data, error } = await supabase
            .from('items')
            .insert({
                shop_id: shopId,
                item_type: item.itemType || 'product',
                name: item.name || 'Untitled Item',
                description: item.description || null,
                facebook_subtitle: item.facebookSubtitle || null,
                retail_price: item.retailPrice || 0,
                original_price: item.originalPrice || null,
                promo_price: item.promoPrice || null,
                promo_start_date: item.promoStartDate || null,
                promo_end_date: item.promoEndDate || null,
                stock: item.stock || 0,
                category: item.category || null,
                image_url: item.imageUrl || null,
                warranty: item.warranty || null,
                duration: item.duration || null,
                location: item.location || null,
                form_id: item.formId || null,
            })
            .select()
            .single();

        if (error || !data) {
            console.error('Error adding item:', error);
            return null;
        }

        return mapItemRowToItem(data as ItemRow);
    } catch (error) {
        console.error('Error adding item:', error);
        return null;
    }
};

/**
 * Update item
 */
export const updateItemInShop = async (shopId: string, itemId: string, updates: Partial<Item>): Promise<Item | null> => {
    try {
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        // Only update fields that are provided
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.facebookSubtitle !== undefined) updateData.facebook_subtitle = updates.facebookSubtitle;
        if (updates.retailPrice !== undefined) updateData.retail_price = updates.retailPrice;
        if (updates.originalPrice !== undefined) updateData.original_price = updates.originalPrice;
        if (updates.promoPrice !== undefined) updateData.promo_price = updates.promoPrice;
        if (updates.promoStartDate !== undefined) updateData.promo_start_date = updates.promoStartDate;
        if (updates.promoEndDate !== undefined) updateData.promo_end_date = updates.promoEndDate;
        if (updates.stock !== undefined) updateData.stock = updates.stock;
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
        if (updates.warranty !== undefined) updateData.warranty = updates.warranty;
        if (updates.duration !== undefined) updateData.duration = updates.duration;
        if (updates.location !== undefined) updateData.location = updates.location;

        const { data, error } = await supabase
            .from('items')
            .update(updateData)
            .eq('id', itemId)
            .eq('shop_id', shopId) // Security: ensure item belongs to shop
            .select()
            .single();

        if (error || !data) {
            console.error('Error updating item:', error);
            return null;
        }

        return mapItemRowToItem(data as ItemRow);
    } catch (error) {
        console.error('Error updating item:', error);
        return null;
    }
};

/**
 * Delete item
 */
export const deleteItemFromShop = async (shopId: string, itemId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', itemId)
            .eq('shop_id', shopId); // Security: ensure item belongs to shop

        if (error) {
            console.error('Error deleting item:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        return false;
    }
};

/**
 * Update item stock using database function
 */
export const updateItemStock = async (
    itemId: string,
    change: number,
    reason: string
): Promise<{ success: boolean; newStock?: number; error?: string }> => {
    try {
        const user = getCurrentUser();

        const { data, error } = await supabase.rpc('update_stock', {
            p_item_id: itemId,
            p_change: change,
            p_reason: reason,
            p_changed_by: user?.id || null,
        });

        if (error) {
            console.error('Error updating stock:', error);
            return { success: false, error: error.message };
        }

        const result = data as any;

        if (result.success) {
            return { success: true, newStock: result.new_stock };
        } else {
            return { success: false, error: result.error };
        }
    } catch (error: any) {
        console.error('Error updating stock:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get stock history for an item
 */
export const getStockHistory = async (itemId: string): Promise<StockMovement[]> => {
    try {
        const { data, error } = await supabase
            .from('stock_history')
            .select(`
                *,
                profiles (username, avatar_url)
            `)
            .eq('item_id', itemId)
            .order('timestamp', { ascending: false })
            .limit(100); // Limit to last 100 movements

        if (error || !data) {
            console.error('Error fetching stock history:', error);
            return [];
        }

        return data.map((row: any) => ({
            timestamp: new Date(row.timestamp).getTime(),
            change: row.change,
            newStock: row.new_stock,
            reason: row.reason,
        }));
    } catch (error) {
        console.error('Error fetching stock history:', error);
        return [];
    }
};

// ============================================
// TEAM MEMBER OPERATIONS
// ============================================

/**
 * Add team member to shop
 * @param shopId - Shop ID
 * @param userId - User ID to add
 * @param role - Role to assign
 * @returns Success status
 */
export const addTeamMember = async (
    shopId: string,
    userId: string,
    role: Role,
    currentUserRole?: Role | null
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Validate role assignment permissions
        if (currentUserRole === Role.ADMIN && role === Role.ADMIN) {
            return { 
                success: false, 
                error: 'Admin users cannot assign the Admin role to other users.' 
            };
        }

        const { error } = await supabase
            .from('team_members')
            .insert({
                shop_id: shopId,
                user_id: userId,
                role: role.toLowerCase() as 'owner' | 'admin' | 'order_manager' | 'support_agent',
            });

        if (error) {
            console.error('Error adding team member:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error adding team member:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update team member role
 * @param shopId - Shop ID
 * @param userId - User ID to update
 * @param newRole - New role to assign
 * @param currentUserRole - Role of the user making the change
 * @returns Success status
 */
export const updateTeamMemberRole = async (
    shopId: string,
    userId: string,
    newRole: Role,
    currentUserRole?: Role | null
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Validate role assignment permissions
        if (currentUserRole === Role.ADMIN && newRole === Role.ADMIN) {
            return { 
                success: false, 
                error: 'Admin users cannot assign the Admin role to other users.' 
            };
        }

        const { error } = await supabase
            .from('team_members')
            .update({
                role: newRole.toLowerCase() as 'owner' | 'admin' | 'order_manager' | 'support_agent',
            })
            .eq('shop_id', shopId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating team member role:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error updating team member role:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Remove team member from shop
 */
export const removeTeamMember = async (
    shopId: string,
    userId: string
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('shop_id', shopId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error removing team member:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error removing team member:', error);
        return false;
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Enrich shop data with all related data and defaults
 * This bridges the gap between database schema and Shop type
 */
async function enrichShopWithFullData(data: any): Promise<Shop> {
    // Map team members
    const team: TeamMember[] = (data.team_members || []).map((tm: any) => ({
        userId: tm.user_id,
        role: capitalizeRole(tm.role),
    }));

    // Map items
    const items: Item[] = (data.items || []).map(mapItemRowToItem);

    // Fetch forms, submissions, and payment methods for this shop
    const forms = await getFormsByShop(data.id);
    const formSubmissions = await getSubmissionsByShop(data.id);
    const paymentMethods = await getPaymentMethodsByShop(data.id);
    const liveConversations = await getConversationsByShop(data.id);

    // Build subscription
    const subscription: Subscription = {
        plan: data.subscription_plan || 'Trial',
        status: data.subscription_status || 'trialing',
        trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at).getTime() : null,
        periodEndsAt: data.period_ends_at ? new Date(data.period_ends_at).getTime() : null,
        paymentProof: data.payment_proof,
        dataHistoryExtension: {
            status: data.data_extension_status || 'inactive',
            subscribedAt: data.data_extension_subscribed_at ? new Date(data.data_extension_subscribed_at).getTime() : undefined,
            deletionScheduledAt: data.data_extension_deletion_scheduled_at ? new Date(data.data_extension_deletion_scheduled_at).getTime() : undefined,
            isCommitted: data.data_extension_is_committed || false,
        },
    };

    // Build assistant config
    const assistantConfig: AssistantConfig = {
        selectedModel: data.assistant_model || 'STANDARD',
        systemPrompt: data.system_prompt || '',
        language: data.primary_language || 'en',
        tone: data.assistant_tone || 'neutral',
        responseDelay: data.response_delay || 0,
        assistantName: data.assistant_name || 'Assistant',
    } as AssistantConfig;

    // Build knowledge base (simplified for now)
    const knowledgeBase: KnowledgeBase = {
        productData: '',
        userDefined: [],
    };

    // Build shop object with all required fields
    const shop: Shop = {
        id: data.id,
        name: data.name,
        ownerId: data.owner_id,
        logoUrl: data.logo_url || undefined,
        team,
        subscription,
        currency: data.currency || 'MMK',
        isFacebookConnected: data.is_facebook_connected || false,
        integrations: {
            facebook: { isConnected: false },
            instagram: { isConnected: false },
        },
        assistantConfig,
        knowledgeBase,
        items,
        
        // Initialize arrays for Sub-phase 2.2 & 2.3 data (loaded from database)
        forms,
        formSubmissions,
        keywordReplies: [],
        savedReplies: [],
        liveConversations,
        paymentMethods,
        persistentMenu: [],
        chatHistory: [],
        expenses: [],
        todos: [],
        calendarTasks: [],
        operationWidgets: [],
        
        // Default configurations
        customerEntryPoint: {
            type: 'chat',
            formId: null,
        },
        onboarding: {
            checklistDismissed: false,
        },
        orderManagementFlowConfig: {
            enabled: false,
            strings: {} as any,
        },
        bookingFlowConfig: {
            enabled: false,
            strings: {} as any,
        },
        offlineSaleConfig: {
            defaultFormId: null,
        },
        onlineSaleConfig: {
            defaultFormId: null,
        },
        receiptConfig: {
            showPlatformLogo: true,
            customFooterText: '',
            receiptSize: 'standard',
        },
        paymentIntelligenceConfig: {
            enabled: false,
            timeWindowMinutes: 15,
            statusOnProof: 'Confirmed' as any,
        },
        quickNote: '',
    };

    return shop;
}

/**
 * Map database ItemRow to Item type
 */
function mapItemRowToItem(row: ItemRow): Item {
    return {
        id: row.id,
        itemType: row.item_type as 'product' | 'service',
        name: row.name,
        description: row.description || '',
        facebookSubtitle: row.facebook_subtitle || undefined,
        retailPrice: row.retail_price,
        originalPrice: row.original_price || undefined,
        promoPrice: row.promo_price || undefined,
        promoStartDate: row.promo_start_date || undefined,
        promoEndDate: row.promo_end_date || undefined,
        stock: row.stock,
        category: row.category || undefined,
        imageUrl: row.image_url || undefined,
        warranty: row.warranty || undefined,
        duration: row.duration || undefined,
        location: row.location || undefined,
        formId: row.form_id || undefined,
    };
}

/**
 * Convert database role to Role enum
 */
function capitalizeRole(role: string): Role {
    const roleMap: { [key: string]: Role } = {
        'owner': Role.OWNER,
        'admin': Role.ADMIN,
        'order_manager': Role.ORDER_MANAGER,
        'support_agent': Role.SUPPORT_AGENT,
    };
    return roleMap[role] || Role.SUPPORT_AGENT;
}

// ============================================
// SUB-PHASE 2.2: FORMS & ORDERS
// ============================================

/**
 * Add form to shop
 */
export const addFormToShop = async (shopId: string, form: Partial<Form>): Promise<Form | null> => {
    try {
        const { data, error } = await supabase
            .from('forms')
            .insert({
                shop_id: shopId,
                name: form.name || 'Untitled Form',
                fields: form.fields || [],
            } as any)
            .select()
            .single();

        if (error || !data) {
            console.error('Error adding form:', error);
            return null;
        }

        return mapFormRowToForm(data as FormRow);
    } catch (error) {
        console.error('Error adding form:', error);
        return null;
    }
};

/**
 * Update form
 */
export const updateFormInShop = async (
    shopId: string,
    formId: string,
    updates: Partial<Form>
): Promise<Form | null> => {
    try {
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.fields !== undefined) updateData.fields = updates.fields;

        const { data, error } = await supabase
            .from('forms')
            .update(updateData)
            .eq('id', formId)
            .eq('shop_id', shopId)
            .select()
            .single();

        if (error || !data) {
            console.error('Error updating form:', error);
            return null;
        }

        return mapFormRowToForm(data as FormRow);
    } catch (error) {
        console.error('Error updating form:', error);
        return null;
    }
};

/**
 * Delete form
 */
export const deleteFormFromShop = async (shopId: string, formId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('forms')
            .delete()
            .eq('id', formId)
            .eq('shop_id', shopId);

        if (error) {
            console.error('Error deleting form:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting form:', error);
        return false;
    }
};

/**
 * Get all forms for a shop
 */
export const getFormsByShop = async (shopId: string): Promise<Form[]> => {
    try {
        const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('shop_id', shopId)
            .order('created_at', { ascending: false });

        if (error || !data) {
            console.error('Error fetching forms:', error);
            return [];
        }

        return data.map((row: any) => mapFormRowToForm(row as FormRow));
    } catch (error) {
        console.error('Error fetching forms:', error);
        return [];
    }
};

// ============================================
// FORM SUBMISSIONS (ORDERS)
// ============================================

/**
 * Create form submission (order)
 */
export const createFormSubmission = async (
    shopId: string,
    submission: FormSubmission
): Promise<FormSubmission | null> => {
    try {
        const { data, error } = await supabase
            .from('form_submissions')
            .insert({
                shop_id: shopId,
                submission_id: submission.submissionId,
                form_id: submission.formId,
                form_name: submission.formName,
                status: submission.status.toLowerCase() as any,
                ordered_products: submission.orderedProducts,
                payment_method: submission.paymentMethod,
                payment_screenshot_url: submission.paymentScreenshotUrl,
                discount: submission.discount,
                custom_fields: submission,
                submitted_at: new Date(submission.submittedAt).toISOString(),
            } as any)
            .select()
            .single();

        if (error || !data) {
            console.error('Error creating submission:', error);
            return null;
        }

        return mapSubmissionRowToSubmission(data as FormSubmissionRow);
    } catch (error) {
        console.error('Error creating submission:', error);
        return null;
    }
};

/**
 * Update submission status
 */
export const updateSubmissionStatus = async (
    submissionId: string,
    status: OrderStatus
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('form_submissions')
            .update({
                status: status.toLowerCase() as any,
                updated_at: new Date().toISOString(),
            } as any)
            .eq('submission_id', submissionId);

        if (error) {
            console.error('Error updating submission status:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating submission status:', error);
        return false;
    }
};

/**
 * Get all submissions for a shop
 */
export const getSubmissionsByShop = async (shopId: string): Promise<FormSubmission[]> => {
    try {
        const { data, error } = await supabase
            .from('form_submissions')
            .select('*')
            .eq('shop_id', shopId)
            .order('submitted_at', { ascending: false });

        if (error || !data) {
            console.error('Error fetching submissions:', error);
            return [];
        }

        return data.map((row: any) => mapSubmissionRowToSubmission(row as FormSubmissionRow));
    } catch (error) {
        console.error('Error fetching submissions:', error);
        return [];
    }
};

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Add payment method
 */
export const addPaymentMethod = async (
    shopId: string,
    method: ShopPaymentMethod
): Promise<ShopPaymentMethod | null> => {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .insert({
                shop_id: shopId,
                name: method.name,
                instructions: method.instructions,
                qr_code_url: method.qrCodeUrl,
                requires_proof: method.requiresProof,
                enabled: method.enabled,
            } as any)
            .select()
            .single();

        if (error || !data) {
            console.error('Error adding payment method:', error);
            return null;
        }

        return mapPaymentMethodRowToPaymentMethod(data as PaymentMethodRow);
    } catch (error) {
        console.error('Error adding payment method:', error);
        return null;
    }
};

/**
 * Update payment method
 */
export const updatePaymentMethod = async (
    methodId: string,
    updates: Partial<ShopPaymentMethod>
): Promise<ShopPaymentMethod | null> => {
    try {
        const updateData: any = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
        if (updates.qrCodeUrl !== undefined) updateData.qr_code_url = updates.qrCodeUrl;
        if (updates.requiresProof !== undefined) updateData.requires_proof = updates.requiresProof;
        if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

        const { data, error } = await supabase
            .from('payment_methods')
            .update(updateData)
            .eq('id', methodId)
            .select()
            .single();

        if (error || !data) {
            console.error('Error updating payment method:', error);
            return null;
        }

        return mapPaymentMethodRowToPaymentMethod(data as PaymentMethodRow);
    } catch (error) {
        console.error('Error updating payment method:', error);
        return null;
    }
};

/**
 * Delete payment method
 */
export const deletePaymentMethod = async (methodId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('payment_methods')
            .delete()
            .eq('id', methodId);

        if (error) {
            console.error('Error deleting payment method:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting payment method:', error);
        return false;
    }
};

/**
 * Get all payment methods for a shop
 */
export const getPaymentMethodsByShop = async (shopId: string): Promise<ShopPaymentMethod[]> => {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('shop_id', shopId)
            .order('created_at', { ascending: false });

        if (error || !data) {
            console.error('Error fetching payment methods:', error);
            return [];
        }

        return data.map((row: any) => mapPaymentMethodRowToPaymentMethod(row as PaymentMethodRow));
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        return [];
    }
};

// ============================================
// SUB-PHASE 2.2: MAPPING FUNCTIONS
// ============================================

/**
 * Map database FormRow to Form type
 */
function mapFormRowToForm(row: FormRow): Form {
    return {
        id: row.id,
        name: row.name,
        fields: (row.fields as any) || [],
    };
}

/**
 * Map database FormSubmissionRow to FormSubmission type
 */
function mapSubmissionRowToSubmission(row: FormSubmissionRow): FormSubmission {
    const customFields = (row.custom_fields as any) || {};
    
    return {
        ...customFields,
        submissionId: row.submission_id,
        orderId: customFields.orderId,
        formId: row.form_id,
        formName: row.form_name,
        submittedAt: new Date(row.submitted_at).getTime(),
        status: capitalizeOrderStatus(row.status),
        orderedProducts: (row.ordered_products as any) || [],
        paymentMethod: row.payment_method || undefined,
        paymentScreenshotUrl: row.payment_screenshot_url || undefined,
        discount: (row.discount as any) || undefined,
    };
}

/**
 * Map database PaymentMethodRow to ShopPaymentMethod type
 */
function mapPaymentMethodRowToPaymentMethod(row: PaymentMethodRow): ShopPaymentMethod {
    return {
        id: row.id,
        name: row.name,
        instructions: row.instructions,
        qrCodeUrl: row.qr_code_url || undefined,
        requiresProof: row.requires_proof,
        enabled: row.enabled,
    };
}

/**
 * Convert database order_status to OrderStatus enum
 */
function capitalizeOrderStatus(status: string): OrderStatus {
    const statusMap: { [key: string]: OrderStatus } = {
        'pending': OrderStatus.Pending,
        'confirmed': OrderStatus.Confirmed,
        'completed': OrderStatus.Completed,
        'cancelled': OrderStatus.Cancelled,
        'return': OrderStatus.Return,
    };
    return statusMap[status] || OrderStatus.Pending;
}

// ============================================
// SUB-PHASE 2.3: CONVERSATIONS & REAL-TIME
// ============================================

/**
 * Get all conversations for a shop
 */
export const getConversationsByShop = async (shopId: string): Promise<LiveChatConversation[]> => {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                messages (*)
            `)
            .eq('shop_id', shopId)
            .eq('is_archived', false)
            .order('last_message_at', { ascending: false });

        if (error || !data) {
            console.error('Error fetching conversations:', error);
            return [];
        }

        return data.map((row: any) => mapConversationRowToConversation(row));
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }
};

/**
 * Get single conversation with all messages
 */
export const getConversationById = async (conversationId: string): Promise<LiveChatConversation | null> => {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                messages (*)
            `)
            .eq('id', conversationId)
            .single();

        if (error || !data) {
            console.error('Error fetching conversation:', error);
            return null;
        }

        return mapConversationRowToConversation(data);
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return null;
    }
};

/**
 * Create new conversation
 */
export const createConversation = async (
    shopId: string,
    customerId: string,
    customerName: string,
    platform: LiveChatChannel
): Promise<LiveChatConversation | null> => {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                shop_id: shopId,
                customer_id: customerId,
                customer_name: customerName,
                platform,
                is_live: false,
                is_archived: false,
                last_message_at: new Date().toISOString(),
            } as any)
            .select(`
                *,
                messages (*)
            `)
            .single();

        if (error || !data) {
            console.error('Error creating conversation:', error);
            return null;
        }

        return mapConversationRowToConversation(data);
    } catch (error) {
        console.error('Error creating conversation:', error);
        return null;
    }
};

/**
 * Update conversation (status, assignee, etc.)
 */
export const updateConversation = async (
    conversationId: string,
    updates: {
        isLive?: boolean;
        isArchived?: boolean;
        assigneeId?: string | null;
        status?: LiveChatStatus;
    }
): Promise<boolean> => {
    try {
        const updateData: any = {};

        if (updates.isLive !== undefined) updateData.is_live = updates.isLive;
        if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
        if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId;

        const { error } = await supabase
            .from('conversations')
            .update(updateData)
            .eq('id', conversationId);

        if (error) {
            console.error('Error updating conversation:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating conversation:', error);
        return false;
    }
};

/**
 * Add message to conversation
 */
export const addMessage = async (
    conversationId: string,
    message: Partial<LiveChatMessage>
): Promise<LiveChatMessage | null> => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender: message.sender === 'ai' || message.sender === 'seller' ? 'bot' : 'user',
                text: message.text || null,
                attachment: message.attachment || null,
                timestamp: new Date(message.timestamp || Date.now()).toISOString(),
            } as any)
            .select()
            .single();

        if (error || !data) {
            console.error('Error adding message:', error);
            return null;
        }

        // Update conversation's last_message_at
        await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId);

        return mapMessageRowToMessage(data as MessageRow);
    } catch (error) {
        console.error('Error adding message:', error);
        return null;
    }
};

/**
 * Get messages for a conversation
 */
export const getMessagesByConversation = async (conversationId: string): Promise<LiveChatMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });

        if (error || !data) {
            console.error('Error fetching messages:', error);
            return [];
        }

        return data.map((row: any) => mapMessageRowToMessage(row as MessageRow));
    } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to new messages in a conversation
 */
export const subscribeToConversation = (
    conversationId: string,
    onNewMessage: (message: LiveChatMessage) => void,
    onConversationUpdate?: (conversation: Partial<ConversationRow>) => void
): (() => void) => {
    const channelName = `conversation:${conversationId}`;
    
    // Clean up existing channel if any
    if (activeChannels.has(channelName)) {
        const oldChannel = activeChannels.get(channelName)!;
        supabase.removeChannel(oldChannel);
        activeChannels.delete(channelName);
    }

    // Create new channel
    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
                const message = mapMessageRowToMessage(payload.new as MessageRow);
                onNewMessage(message);
            }
        );

    // Also subscribe to conversation updates if callback provided
    if (onConversationUpdate) {
        channel.on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${conversationId}`,
            },
            (payload) => {
                onConversationUpdate(payload.new as ConversationRow);
            }
        );
    }

    channel.subscribe();
    activeChannels.set(channelName, channel);

    // Return cleanup function
    return () => {
        if (activeChannels.has(channelName)) {
            const ch = activeChannels.get(channelName)!;
            supabase.removeChannel(ch);
            activeChannels.delete(channelName);
        }
    };
};

/**
 * Subscribe to all conversations in a shop (for inbox view)
 */
export const subscribeToShopConversations = (
    shopId: string,
    onNewConversation: (conversation: LiveChatConversation) => void,
    onConversationUpdate: (conversationId: string, updates: Partial<ConversationRow>) => void
): (() => void) => {
    const channelName = `shop:${shopId}:conversations`;
    
    // Clean up existing channel if any
    if (activeChannels.has(channelName)) {
        const oldChannel = activeChannels.get(channelName)!;
        supabase.removeChannel(oldChannel);
        activeChannels.delete(channelName);
    }

    // Create new channel
    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'conversations',
                filter: `shop_id=eq.${shopId}`,
            },
            async (payload) => {
                // Fetch full conversation with messages
                const conversation = await getConversationById(payload.new.id);
                if (conversation) {
                    onNewConversation(conversation);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `shop_id=eq.${shopId}`,
            },
            (payload) => {
                onConversationUpdate(payload.new.id, payload.new as ConversationRow);
            }
        )
        .subscribe();

    activeChannels.set(channelName, channel);

    // Return cleanup function
    return () => {
        if (activeChannels.has(channelName)) {
            const ch = activeChannels.get(channelName)!;
            supabase.removeChannel(ch);
            activeChannels.delete(channelName);
        }
    };
};

/**
 * Cleanup all active subscriptions
 */
export const cleanupAllSubscriptions = () => {
    activeChannels.forEach((channel) => {
        supabase.removeChannel(channel);
    });
    activeChannels.clear();
};

// ============================================
// SUB-PHASE 2.3: MAPPING FUNCTIONS
// ============================================

/**
 * Map database ConversationRow to LiveChatConversation type
 */
function mapConversationRowToConversation(row: any): LiveChatConversation {
    const messages = (row.messages || []).map((msg: any) => mapMessageRowToMessage(msg));
    
    return {
        id: row.id,
        channel: row.platform as LiveChatChannel,
        customerName: row.customer_name || 'Unknown Customer',
        lastMessageAt: new Date(row.last_message_at).getTime(),
        status: row.is_live ? 'open' : 'pending',
        assigneeId: row.assignee_id || null,
        tags: [],
        notes: '',
        messages,
        isRead: !row.is_live,
        isAiActive: !row.is_live,
        awaitingProofForOrderId: null,
        awaitingProofUntil: null,
    };
}

/**
 * Map database MessageRow to LiveChatMessage type
 */
function mapMessageRowToMessage(row: MessageRow): LiveChatMessage {
    return {
        id: row.id,
        sender: row.sender === 'bot' ? 'ai' : 'user',
        senderId: undefined,
        text: row.text || '',
        timestamp: new Date(row.timestamp).getTime(),
        attachment: (row.attachment as any) || undefined,
        isNote: false,
    };
}
