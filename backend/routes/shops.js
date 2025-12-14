"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Helper function to enrich shop with related data
async function enrichShop(shopData) {
    try {
        // Safely handle missing or null shop data
        if (!shopData || !shopData.id) {
            console.error('Invalid shop data for enrichment:', shopData);
            return shopData;
        }
        // Fetch items (handle errors gracefully)
        let items = [];
        try {
            const { data: itemsData, error: itemsError } = await supabase_1.supabase
                .from('items')
                .select('*')
                .eq('shop_id', shopData.id);
            if (!itemsError && itemsData)
                items = itemsData;
        }
        catch (e) {
            console.warn('Failed to fetch items:', e);
        }
        // Fetch forms
        let forms = [];
        try {
            const { data: formsData, error: formsError } = await supabase_1.supabase
                .from('forms')
                .select('*')
                .eq('shop_id', shopData.id);
            if (!formsError && formsData)
                forms = formsData;
        }
        catch (e) {
            console.warn('Failed to fetch forms:', e);
        }
        // Fetch conversations
        let conversations = [];
        try {
            const { data: convsData, error: convsError } = await supabase_1.supabase
                .from('conversations')
                .select('*')
                .eq('shop_id', shopData.id);
            if (!convsError && convsData)
                conversations = convsData;
        }
        catch (e) {
            console.warn('Failed to fetch conversations:', e);
        }
        // Fetch team members
        let team = [];
        try {
            const { data: teamData, error: teamError } = await supabase_1.supabase
                .from('team_members')
                .select('*')
                .eq('shop_id', shopData.id);
            if (!teamError && teamData)
                team = teamData;
        }
        catch (e) {
            console.warn('Failed to fetch team members:', e);
        }
        // Safe JSON parsing helper
        const safeJsonParse = (value, fallback) => {
            if (!value)
                return fallback;
            try {
                if (typeof value === 'string') {
                    return JSON.parse(value);
                }
                return value;
            }
            catch (e) {
                console.warn('JSON parse failed:', e);
                return fallback;
            }
        };
        // Return enriched shop object with defaults for missing fields
        return {
            ...shopData,
            id: shopData.id,
            name: shopData.name || 'Unnamed Shop',
            currency: shopData.currency || 'USD',
            ownerId: shopData.owner_id,
            items: items || [],
            forms: forms || [],
            liveConversations: conversations || [],
            team: team || [],
            assistantConfig: safeJsonParse(shopData.assistant_config, { selectedModel: 'STANDARD', systemPrompt: '', language: 'en', tone: 'neutral', responseDelay: 0 }),
            knowledgeBase: safeJsonParse(shopData.knowledge_base, { userDefined: [], productData: '' }),
            subscription: safeJsonParse(shopData.subscription_data, { plan: 'Trial', status: 'trialing', trialEndsAt: null, periodEndsAt: null }),
            paymentMethods: safeJsonParse(shopData.payment_methods, []),
            orderManagementFlowConfig: safeJsonParse(shopData.order_management_flow_config, { enabled: false, strings: {} }),
            bookingFlowConfig: safeJsonParse(shopData.booking_flow_config, { enabled: false, strings: {} }),
            offlineSaleConfig: safeJsonParse(shopData.offline_sale_config, { defaultFormId: null }),
            onlineSaleConfig: safeJsonParse(shopData.online_sale_config, { defaultFormId: null }),
            persistentMenu: safeJsonParse(shopData.persistent_menu, []),
            customerEntryPoint: safeJsonParse(shopData.customer_entry_point, { type: 'chat', formId: null }),
            // Add missing fields that frontend expects
            keywordReplies: safeJsonParse(shopData.keyword_replies, []),
            savedReplies: safeJsonParse(shopData.saved_replies, []),
            formSubmissions: safeJsonParse(shopData.form_submissions, []),
            chatHistory: safeJsonParse(shopData.chat_history, []),
            onboarding: safeJsonParse(shopData.onboarding, { checklistDismissed: false }),
            receiptConfig: safeJsonParse(shopData.receipt_config, { showPlatformLogo: true, customFooterText: '', receiptSize: 'standard' }),
            conversationalCommerceUsage: safeJsonParse(shopData.conversational_commerce_usage, { count: 0 }),
        };
    }
    catch (enrichError) {
        console.error('Error enriching shop:', enrichError, shopData);
        // Return basic shop data if enrichment fails
        return {
            ...shopData,
            items: [],
            forms: [],
            liveConversations: [],
            team: [],
            assistantConfig: { selectedModel: 'STANDARD', systemPrompt: '', language: 'en', tone: 'neutral', responseDelay: 0 },
            knowledgeBase: { userDefined: [], productData: '' },
            subscription: { plan: 'Trial', status: 'trialing', trialEndsAt: null, periodEndsAt: null },
        };
    }
}
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        // Get shops where user is owner or team member
        const { data: shops, error } = await supabase_1.supabase
            .from('shops')
            .select('*')
            .eq('owner_id', userId)
            .limit(50);
        if (error)
            throw error;
        // Enrich all shops with related data
        const enrichedShops = await Promise.all((shops || []).map(shop => enrichShop(shop)));
        res.status(200).json({ success: true, data: enrichedShops || [] });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { name, description, currency, assistant_model } = req.body;
        const userId = req.headers['x-user-id'];
        if (!name || !currency) {
            return res.status(400).json({ success: false, error: 'Name and currency are required' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        // Ensure user profile exists before creating shop (prevents FK constraint violation)
        // Profile should be created during user registration
        try {
            const { data: profile, error: profileError } = await supabase_1.supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();
            if (profileError || !profile) {
                return res.status(400).json({
                    success: false,
                    error: 'User profile not initialized. Please complete registration or log out and log back in.'
                });
            }
        }
        catch (profileCheckError) {
            return res.status(400).json({
                success: false,
                error: 'Unable to verify user profile'
            });
        }
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial
        const { data, error } = await supabase_1.supabase
            .from('shops')
            .insert([{
                name,
                description,
                currency,
                assistant_model,
                owner_id: userId,
                subscription_plan: 'Trial',
                subscription_status: 'trialing',
                trial_ends_at: trialEndDate.toISOString(),
                period_ends_at: null
            }])
            .select()
            .single();
        if (error) {
            console.error('Shop insert error:', error);
            throw error;
        }
        // Enrich shop with related data
        const enrichedShop = await enrichShop(data);
        res.status(201).json({ success: true, data: enrichedShop });
    }
    catch (error) {
        console.error('POST /shops error:', error);
        next(error);
    }
});
router.get('/:shopId', async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { data, error } = await supabase_1.supabase.from('shops').select('*').eq('id', shopId).single();
        if (error || !data) {
            return res.status(404).json({ success: false, error: 'Shop not found' });
        }
        // Enrich shop with related data
        const enrichedShop = await enrichShop(data);
        res.status(200).json({ success: true, data: enrichedShop });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:shopId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { name, description, currency, assistant_model } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        const { data, error } = await supabase_1.supabase
            .from('shops')
            .update({
            name,
            description,
            currency,
            assistant_model,
            updated_at: new Date().toISOString()
        })
            .eq('id', shopId)
            .select()
            .single();
        if (error)
            throw error;
        // Enrich shop with related data
        const enrichedShop = await enrichShop(data);
        res.status(200).json({ success: true, data: enrichedShop });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:shopId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        // Verify user owns the shop before deleting
        const { data: shop, error: fetchError } = await supabase_1.supabase
            .from('shops')
            .select('owner_id')
            .eq('id', shopId)
            .single();
        if (fetchError || !shop || shop.owner_id !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to delete this shop' });
        }
        const { error: deleteError } = await supabase_1.supabase
            .from('shops')
            .delete()
            .eq('id', shopId);
        if (deleteError)
            throw deleteError;
        res.status(200).json({ success: true, message: 'Shop deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/shops/:shopId/upgrade - Update shop subscription plan
router.post('/:shopId/upgrade', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { subscription_plan, subscription_status } = req.body;
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        if (!subscription_plan) {
            return res.status(400).json({ success: false, error: 'subscription_plan is required' });
        }
        // Verify user owns the shop
        const { data: shop, error: fetchError } = await supabase_1.supabase
            .from('shops')
            .select('owner_id')
            .eq('id', shopId)
            .single();
        if (fetchError || !shop || shop.owner_id !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to update this shop' });
        }
        // Update subscription plan and status
        const updateData = { subscription_plan, updated_at: new Date().toISOString() };
        if (subscription_status) {
            updateData.subscription_status = subscription_status;
        }
        const { data: updatedShop, error: updateError } = await supabase_1.supabase
            .from('shops')
            .update(updateData)
            .eq('id', shopId)
            .select()
            .single();
        if (updateError)
            throw updateError;
        // Enrich shop with related data
        const enrichedShop = await enrichShop(updatedShop);
        res.status(200).json({ success: true, data: enrichedShop });
    }
    catch (error) {
        next(error);
    }
});
;
module.exports = router;
