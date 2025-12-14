"use strict";
/**
 * Supabase Platform Service - Phase 3: Platform Settings Migration
 * Replaces localStorage-based platform settings with Supabase Edge Function
 *
 * NOTE: Platform settings are stored as a single JSON document accessible only to admin users
 * This ensures centralized, real-time configuration updates across all shops
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultPlatformSettings = exports.invalidatePlatformSettingsCache = exports.savePlatformSettings = exports.getPlatformSettings = void 0;
const client_1 = require("../supabase/client");
// Caching layer to reduce database calls
let settingsCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 minute cache
//===========================================
// SUPABASE EDGE FUNCTION APPROACH
//===========================================
// Platform settings are fetched/updated via Edge Function
// This allows admin-only access control and validation
/**
 * Get platform settings from Supabase Edge Function
 */
const getPlatformSettings = async () => {
    try {
        // Check cache first
        const now = Date.now();
        if (settingsCache && (now - lastFetchTime) < CACHE_TTL) {
            return settingsCache;
        }
        // Get the current session
        const { data: { session }, error: sessionError } = await client_1.supabase.auth.getSession();
        if (sessionError || !session) {
            console.warn('No active session, returning default platform settings');
            return (0, exports.getDefaultPlatformSettings)();
        }
        // Call Edge Function to get settings with auth token
        const { data, error } = await client_1.supabase.functions.invoke('admin-platform-settings', {
            body: { action: 'get' },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });
        if (error) {
            console.error('Error fetching platform settings:', error);
            // Fall back to defaults if Edge Function fails
            return (0, exports.getDefaultPlatformSettings)();
        }
        const settings = data.settings;
        // Update cache
        settingsCache = settings;
        lastFetchTime = now;
        return settings;
    }
    catch (error) {
        console.error('Error fetching platform settings:', error);
        return (0, exports.getDefaultPlatformSettings)();
    }
};
exports.getPlatformSettings = getPlatformSettings;
/**
 * Save platform settings via Supabase Edge Function
 * Only admins can call this
 */
const savePlatformSettings = async (settings) => {
    try {
        // Get the current session
        const { data: { session }, error: sessionError } = await client_1.supabase.auth.getSession();
        if (sessionError || !session) {
            console.error('No active session, cannot save platform settings');
            return false;
        }
        // Regenerate derived data
        const settingsToSave = {
            ...settings,
            dataHistoryTiers: generateDataHistoryTiers(settings.dataHistoryTierConfig),
        };
        // Regenerate growth plan tiers
        const baseGrowthEntitlements = settings.planEntitlements['Growth'] || {};
        const { plans: growthPlans, entitlements: growthEntitlements } = generateGrowthPlanTiers(settings.growthPlanTierConfig, baseGrowthEntitlements);
        settingsToSave.subscriptionPlans = [
            ...settingsToSave.subscriptionPlans.filter(p => p.family !== 'Growth' || p.isTemplate),
            ...growthPlans
        ];
        // Clean up old growth plan entitlements
        for (const key in settingsToSave.planEntitlements) {
            if (key.startsWith('plan_growth_')) {
                delete settingsToSave.planEntitlements[key];
            }
        }
        settingsToSave.planEntitlements = { ...settingsToSave.planEntitlements, ...growthEntitlements };
        // Call Edge Function to update settings with auth token
        const { error } = await client_1.supabase.functions.invoke('admin-platform-settings', {
            body: { action: 'update', settings: settingsToSave },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });
        if (error) {
            console.error('Error saving platform settings:', error);
            return false;
        }
        // Invalidate cache
        settingsCache = null;
        lastFetchTime = 0;
        return true;
    }
    catch (error) {
        console.error('Error saving platform settings:', error);
        return false;
    }
};
exports.savePlatformSettings = savePlatformSettings;
/**
 * Invalidate cache - useful after external updates
 */
const invalidatePlatformSettingsCache = () => {
    settingsCache = null;
    lastFetchTime = 0;
};
exports.invalidatePlatformSettingsCache = invalidatePlatformSettingsCache;
//===========================================
// HELPER FUNCTIONS
//===========================================
/**
 * Generate data history tiers dynamically based on config
 */
const generateDataHistoryTiers = (config) => {
    const tiers = [];
    for (let i = 0; i < config.tierCount; i++) {
        tiers.push({
            id: `dh_tier_${i + 1}`,
            name: `Tier ${i + 1}`,
            recordLimit: config.baseRecordLimit + (i * config.recordIncrement),
            price: config.basePrice + (i * config.priceIncrement),
        });
    }
    return tiers;
};
/**
 * Generate Growth plan tiers with entitlements
 */
const generateGrowthPlanTiers = (config, baseGrowthEntitlements) => {
    const plans = [];
    const entitlements = {};
    for (let i = 0; i < config.tierCount; i++) {
        const transactionLimit = config.baseTransactionLimit + (i * config.transactionIncrement);
        const price = config.basePrice + (i * config.priceIncrement);
        const tierName = `Tier ${i + 1}`;
        const planId = `plan_growth_${transactionLimit}`;
        const planDetails = {
            id: planId,
            name: 'Growth',
            price,
            features: [],
            isProTier: false,
            family: 'Growth',
            tierName,
            automatedTransactions: transactionLimit,
        };
        plans.push(planDetails);
        entitlements[planId] = {
            ...baseGrowthEntitlements,
            conversationalCommerce: { enabled: true, limit: transactionLimit }
        };
    }
    return { plans, entitlements };
};
const getDefaultPlatformSettings = () => {
    const MOCK_QR_CODE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const defaultToneConfigs = [
        {
            id: 'male',
            tone: 'male',
            rules: {
                toneDescription: 'Adopt a polite, respectful, and professional male persona. Sound knowledgeable and helpful.',
                mustInclude: 'Hello, How can I help you?',
                mustAvoid: 'dude, bro, guys',
            }
        },
        {
            id: 'female',
            tone: 'female',
            rules: {
                toneDescription: 'Adopt a professional and welcoming female persona. Be helpful, clear, and empathetic.',
                mustInclude: 'Hello, Welcome',
                mustAvoid: 'girl, sis, hey guys',
            }
        },
        {
            id: 'neutral',
            tone: 'neutral',
            rules: {
                toneDescription: 'Adopt a helpful, neutral, and professional persona. Prioritize clarity and accuracy in your responses.',
                mustInclude: 'Greetings, How may I assist you?',
                mustAvoid: 'bro, sis, guys, ရှင်, ဗျာ',
            }
        }
    ];
    const defaultSubscriptionPlans = [
        {
            id: 'plan_starter',
            name: 'Starter',
            price: 25000,
            features: [
                '200 Automated Conversions/mo',
                'Live Chat Inbox',
                'Up to 10 Keyword Automations',
                'Up to 15 Products',
                'Unlimited Order Forms',
                '90-Day Order & Analytics History',
                'Basic Sales KPIs',
                '1 Team Member',
            ],
            isProTier: false,
        },
        {
            id: 'plan_growth_template',
            name: 'Growth',
            price: 0,
            features: [
                'Up to {{transactions}} automated conversions/mo',
                'Live Chat Inbox',
                'Up to 25 Keyword Automations',
                'Up to 100 Products',
                'Bulk Actions (Import/Export/Price)',
                '6-Month Order & Analytics History',
                'Custom URL Slug',
                '2 Team Members',
            ],
            isProTier: false,
            isTemplate: true,
            family: 'Growth',
        },
        {
            id: 'plan_brand',
            name: 'Brand',
            price: 50000,
            features: [
                'No Automated Conversions',
                'Up to 30 AI Training Sections',
                'Live Chat Inbox',
                'Up to 25 Keyword Automations',
                'Up to 100 Products',
                '6-Month History',
                'Custom URL Slug',
                '2 Team Members',
            ],
            isProTier: false,
        },
        {
            id: 'plan_pro',
            name: 'Pro',
            price: 75000,
            features: [
                'Unlimited Automated Conversions',
                'Live Chat Inbox',
                'Unlimited Keyword Automations',
                'Unlimited Products',
                '15-Month Order & Analytics History',
                'Advanced Sales Dashboard & Analysis',
                'AI Photo Studio & Marketing Tools',
                '5 Team Members',
            ],
            isProTier: true,
        }
    ];
    const defaultDataHistoryTierConfig = {
        baseRecordLimit: 10000,
        basePrice: 15000,
        recordIncrement: 5000,
        priceIncrement: 10000,
        tierCount: 10,
    };
    const defaultGrowthPlanTierConfig = {
        baseTransactionLimit: 500,
        basePrice: 50000,
        transactionIncrement: 500,
        priceIncrement: 15000,
        tierCount: 3,
    };
    const defaultDescriptionGeneratorConfig = {
        basePrompt: 'You are an expert e-commerce copywriter. Your task is to generate a product description and a short Facebook subtitle for the following product based on its name and keywords.',
        formatInstruction: `Your response must be in JSON format. The JSON object must contain two keys: "description" and "facebookSubtitle".
1.  **description**: This should be an engaging and informative product description. Structure it with clear headings (using markdown like **Headline:**) or bullet points for readability. The total character count for the description must not exceed {{characterLimit}} characters.
2.  **facebookSubtitle**: This must be a very short, catchy one-liner suitable for a Facebook post subtitle, with a maximum of 80 characters. It should entice users to learn more and must include a price placeholder like '[Price]'.`,
        characterLimit: 500,
    };
    const defaultPhotoStudioConfig = {
        presets: [
            { id: 'preset_minimalist', name: 'Minimalist Studio', prompt: 'A professional product photograph of the item on a clean, solid white background with soft studio lighting. The image should be hyper-realistic, high-detail, and minimalist in style.' },
            { id: 'preset_lifestyle', name: 'Lifestyle Scene', prompt: 'A lifestyle photograph of the item in a natural, relevant setting (e.g., a coffee mug on a cozy kitchen table, a blanket on a sofa). The lighting should be soft and natural, with a slightly blurred background to emphasize the product.' },
            { id: 'preset_vibrant', name: 'Vibrant & Bold', prompt: 'A vibrant, eye-catching studio shot of the item placed on a solid color pedestal that contrasts with the product. The style should be modern and pop-art inspired, with bold lighting.' },
            { id: 'preset_moody', name: 'Dark & Moody', prompt: 'A dark and moody photograph of the item on a dark, textured surface like slate or dark wood. Use dramatic, cinematic side-lighting to create strong highlights and shadows.' },
            { id: 'preset_nature', name: 'Outdoor / Nature', prompt: 'A photograph of the item in an outdoor setting, surrounded by natural elements like leaves, moss, or wood. The lighting should feel like soft, diffused sunlight filtering through trees.' },
            { id: 'preset_flatlay', name: 'Flat Lay', prompt: 'A top-down flat lay photograph of the item, neatly arranged with 2-3 thematically related props on a clean, neutral surface. The composition should be balanced and aesthetically pleasing.' }
        ]
    };
    const defaultConversationalCommerceConfig = {
        proPlanInstructions: `
--- CRITICAL FUNCTION: CONVERSATIONAL COMMERCE ---
You can sell items and book services. Check the 'itemType' property for each item in your knowledge base.
- If 'itemType' is 'product', use the 'createConversationalOrder' tool.
- If 'itemType' is 'service', use the 'createBookingTool' tool.

**ORDERING PRODUCTS PROCESS:**
1.  Collect customer's full name, phone number, full shipping address, a list of products and quantities, and their payment method.
2.  You MUST refer to the 'Item Catalog' and 'Payment Methods' sections of your knowledge base.
3.  Present a complete summary for confirmation, including a calculated total price.
4.  After user confirmation, you MUST call the 'createConversationalOrder' tool.
5.  After calling the tool, if successful, confirm the order with the Order ID. If the payment method requires proof, ask the user to send a screenshot.

**BOOKING SERVICES PROCESS:**
1. Collect the customer's full name, phone number, the desired service name, and a preferred date and time for the appointment.
2. Present a complete booking summary to the user for confirmation.
3. After user confirmation, you MUST call the 'createBookingTool' tool.
4. After calling the tool, if successful, confirm the booking with the user and state their Booking ID.
`,
        starterPlanInstructions: `
--- CONVERSATIONAL ORDERING (ASSISTED MODE) ---
Your ability to finalize orders is disabled for this shop. If a user wants to order a product or book a service, your role is to assist them by collecting information and then handing off to a human team member.

**FOR PRODUCT ORDERS:**
1.  You MAY collect the customer's full name, phone number, shipping address, and desired items/quantities.
2.  Once you have the information, you MUST NOT confirm the order or mention a total price.
3.  Your final response MUST be a polite hand-off message. Example: "Thank you for providing your details! Our team has received your request and will call you soon to confirm the order and arrange payment."
4.  You MUST NOT call the 'createConversationalOrder' tool.

**FOR SERVICE BOOKINGS:**
1.  You MAY collect the customer's name, phone number, the service they want, and a preferred date/time.
2.  Once you have the information, you MUST NOT confirm the booking.
3.  Your final response MUST be a polite hand-off message. Example: "Great! I've noted down your booking request. A member of our team will contact you shortly to confirm your appointment details."
4.  You MUST NOT call the 'createBookingTool' tool.
`
    };
    const defaultModelAssignments = {
        generalChatFast: { provider: 'Google Gemini', modelName: 'gemini-flash-lite-latest' },
        generalChatStandard: { provider: 'Google Gemini', modelName: 'gemini-2.5-flash' },
        generalChatThinking: { provider: 'Google Gemini', modelName: 'gemini-2.5-pro' },
        descriptionGenerator: { provider: 'Google Gemini', modelName: 'gemini-2.5-flash' },
        photoStudio: { provider: 'Google Gemini', modelName: 'gemini-2.5-flash-image' },
        shopDashboardSuggestion: { provider: 'Google Gemini', modelName: 'gemini-2.5-flash' },
        adminDashboardSuggestion: { provider: 'Google Gemini', modelName: 'gemini-2.5-flash' },
    };
    const defaultGlobalModelConfig = {
        temperature: 0.9,
        topP: 1,
        topK: 1,
    };
    const defaultPlanEntitlements = {
        'Starter': {
            conversationalCommerce: { enabled: true, limit: 200 },
            aiPhotoStudio: { enabled: true, limit: 10 },
            aiDescriptionGeneration: { enabled: true, limit: 50 },
            shopDashboardSuggestion: { enabled: true, limit: 5 },
            basicDashboards: { enabled: true },
            advancedDashboards: { enabled: false },
            customUrlSlug: { enabled: false },
            itemCount: { enabled: true, limit: 15 },
            keywordRuleCount: { enabled: true, limit: 10 },
            trainingSectionCount: { enabled: true, limit: 10 },
            deepThinking: { enabled: false },
            bulkActions: { enabled: true },
            offlineSale: { enabled: false },
            paymentIntelligence: { enabled: false },
        },
        'Growth': {
            conversationalCommerce: { enabled: true, limit: 0 },
            aiPhotoStudio: { enabled: true, limit: 25 },
            aiDescriptionGeneration: { enabled: true, limit: 250 },
            shopDashboardSuggestion: { enabled: true, limit: 15 },
            basicDashboards: { enabled: true },
            advancedDashboards: { enabled: false },
            customUrlSlug: { enabled: true },
            itemCount: { enabled: true, limit: 100 },
            keywordRuleCount: { enabled: true, limit: 25 },
            trainingSectionCount: { enabled: true, limit: 30 },
            deepThinking: { enabled: false },
            bulkActions: { enabled: true },
            offlineSale: { enabled: false },
            paymentIntelligence: { enabled: false },
        },
        'Brand': {
            conversationalCommerce: { enabled: false, limit: 0 },
            aiPhotoStudio: { enabled: true, limit: 25 },
            aiDescriptionGeneration: { enabled: true, limit: 250 },
            shopDashboardSuggestion: { enabled: true, limit: 15 },
            basicDashboards: { enabled: false },
            advancedDashboards: { enabled: false },
            customUrlSlug: { enabled: true },
            itemCount: { enabled: true, limit: 100 },
            keywordRuleCount: { enabled: true, limit: 25 },
            trainingSectionCount: { enabled: true, limit: 30 },
            deepThinking: { enabled: false },
            bulkActions: { enabled: false },
            offlineSale: { enabled: false },
            paymentIntelligence: { enabled: false },
        },
        'Pro': {
            conversationalCommerce: { enabled: true, limit: null },
            aiPhotoStudio: { enabled: true, limit: 100 },
            aiDescriptionGeneration: { enabled: true, limit: null },
            shopDashboardSuggestion: { enabled: true, limit: 50 },
            basicDashboards: { enabled: true },
            advancedDashboards: { enabled: true },
            customUrlSlug: { enabled: true },
            itemCount: { enabled: true, limit: null },
            keywordRuleCount: { enabled: true, limit: null },
            trainingSectionCount: { enabled: true, limit: 30 },
            deepThinking: { enabled: true },
            bulkActions: { enabled: true },
            offlineSale: { enabled: true },
            paymentIntelligence: { enabled: true },
        },
        'Trial': {
            conversationalCommerce: { enabled: true, limit: null },
            aiPhotoStudio: { enabled: true, limit: 50 },
            aiDescriptionGeneration: { enabled: true, limit: 500 },
            shopDashboardSuggestion: { enabled: true, limit: 25 },
            basicDashboards: { enabled: true },
            advancedDashboards: { enabled: true },
            customUrlSlug: { enabled: true },
            itemCount: { enabled: true, limit: null },
            keywordRuleCount: { enabled: true, limit: null },
            trainingSectionCount: { enabled: true, limit: null },
            deepThinking: { enabled: true },
            bulkActions: { enabled: true },
            offlineSale: { enabled: true },
            paymentIntelligence: { enabled: true },
        },
    };
    const dataHistoryTiers = generateDataHistoryTiers(defaultDataHistoryTierConfig);
    const baseGrowthEntitlements = defaultPlanEntitlements['Growth'] || {};
    const { plans: growthPlans, entitlements: growthEntitlements } = generateGrowthPlanTiers(defaultGrowthPlanTierConfig, baseGrowthEntitlements);
    return {
        announcement: { id: `announcement_${Date.now()}`, message: 'Welcome to the new Cliick.io platform!', enabled: false },
        maintenanceMode: false,
        currency: 'MMK',
        paymentMethods: [
            { id: 'kbz', name: 'KBZ Pay', details: 'Account Name: Cliick.io\nAccount Number: 09987654321', qrCodeUrl: MOCK_QR_CODE, enabled: true },
            { id: 'aya', name: 'AYA Pay', details: 'Account Name: Cliick.io\nAccount Number: 09123456789', qrCodeUrl: MOCK_QR_CODE, enabled: true },
            { id: 'crypto', name: 'USDT (Crypto)', details: 'Network: TRC20 (Tron)\nAddress: TXYZ...', qrCodeUrl: '', enabled: false },
        ],
        aiConfig: {
            globalSystemInstruction: 'You are a helpful AI assistant for an online shop. Be friendly, polite, and professional.',
            forbiddenTopics: 'politics, religion, hate speech, illegal activities',
            mandatorySafetyResponse: "I'm sorry, I cannot discuss that topic.",
            toneConfigs: defaultToneConfigs,
            aiPermissions: {
                allowProductCatalog: true,
                allowTrainingData: true,
                allowConversationalOrdering: true,
            },
            descriptionGeneratorConfig: defaultDescriptionGeneratorConfig,
            photoStudioConfig: defaultPhotoStudioConfig,
            conversationalCommerceConfig: defaultConversationalCommerceConfig,
            modelAssignments: defaultModelAssignments,
            globalModelConfig: defaultGlobalModelConfig,
        },
        subscriptionPlans: [...defaultSubscriptionPlans, ...growthPlans],
        dataHistoryTiers,
        dataHistoryTierConfig: defaultDataHistoryTierConfig,
        growthPlanTierConfig: defaultGrowthPlanTierConfig,
        planEntitlements: { ...defaultPlanEntitlements, ...growthEntitlements },
        localization: {
            enabledLanguages: ['en', 'my', 'es', 'fr', 'de', 'it', 'pt-BR', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'th', 'km', 'id', 'fil'],
            enabledCurrencies: ['MMK', 'USD', 'EUR', 'GBP', 'JPY', 'THB', 'SGD'],
        },
    };
};
exports.getDefaultPlatformSettings = getDefaultPlatformSettings;
