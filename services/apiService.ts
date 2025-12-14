import * as authService from './authService';
import * as shopService from './shopService';
import * as aiApiService from './aiApiService';
import * as platformSettingsService from './platformSettingsService';
import * as automationService from './automationService';
import { 
    Shop, User, Content, AssistantConfig, KnowledgeBase, AssistantTone, 
    ShopPaymentMethod, FormSubmission, Item, KeywordReply, PersistentMenuItem, 
    CustomerEntryPoint, OrderManagementFlowConfig, BookingFlowConfig, Role,
    PlatformSettings,
    Language
} from '../types';

const api = {
    // --- Auth Service ---
    getAuthStatus: () => authService.getAuthStatus(),
    onAuthChange: (callback: (isAuthenticated: boolean) => void) => authService.onAuthChange(callback),
    getCurrentUser: () => authService.getCurrentUser(),
    getAllUsers: () => authService.getAllUsers(),
    login: async (email: string, password: string) => authService.login(email, password),
    signup: async (email: string, password: string, username?: string) => authService.signup(email, password, username),
    logout: async () => authService.logout(),
    loginWithFacebook: async () => authService.loginWithFacebook(),
    loginWithGoogle: async () => authService.loginWithGoogle(),
    updateUser: async (userId: string, updates: { username?: string, passwordHash?: string, avatarUrl?: string }) => authService.updateUser(userId, updates),
    getUserByUsername: (username: string) => authService.getUserByUsername(username),
    isUsernameTaken: (username: string) => authService.isUsernameTaken(username),

    // --- Shop Service ---
    getShopById: async (shopId: string) => shopService.getShopById(shopId),
    getShopBySlug: async (slug: string) => shopService.getShopBySlug(slug),
    saveShop: async (shop: Shop) => shopService.saveShop(shop),
    getShopList: async () => shopService.getShopList(),
    createShop: async (shopName: string) => shopService.createShop(shopName),
    isSlugTaken: (slug: string, currentShopId: string) => shopService.isSlugTaken(slug, currentShopId),
    getAllShops: async () => shopService.getAllShops(),
    deleteShop: async (shopId: string) => shopService.deleteShop(shopId),
    addUserToShop: async (shopId: string, userId: string, role: Role) => shopService.addUserToShop(shopId, userId, role),
    removeUserFromShop: async (shopId: string, userId: string) => shopService.removeUserFromShop(shopId, userId),
    updateUserRoleInShop: async (shopId: string, userId: string, newRole: Role) => shopService.updateUserRoleInShop(shopId, userId, newRole),
    findOrCreateConversation: (shopId: string, customerId: string) => shopService.findOrCreateConversation(shopId, customerId),
    addMessageToConversation: (shopId: string, conversationId: string, message: any) => shopService.addMessageToConversation(shopId, conversationId, message),
    getConversation: (shopId: string, conversationId: string) => shopService.getConversation(shopId, conversationId),
    updateConversation: (shopId: string, conversationId: string, updates: any) => shopService.updateConversation(shopId, conversationId, updates),
    deleteConversation: (shopId: string, conversationId: string) => shopService.deleteConversation(shopId, conversationId),
    addSubmissionToShop: (shopId: string, submission: FormSubmission) => shopService.addSubmissionToShop(shopId, submission),
    connectInstagram: async (shopId: string) => shopService.connectInstagram(shopId),
    createConversationalOrder: shopService.createConversationalOrder,
    createConversationalBooking: shopService.createConversationalBooking,

    // --- AI Service (Now points to the dispatcher) ---
    sendMessageToGemini: async (
        shopId: string,
        conversationId: string | null,
        history: Content[],
        newMessage: string,
        assistantConfig: AssistantConfig,
        knowledgeBase: KnowledgeBase,
        language: Language,
        tone: AssistantTone,
        paymentMethods: ShopPaymentMethod[],
        userName?: string,
    ) => aiApiService.generateChatMessage(shopId, conversationId, history, newMessage, assistantConfig, knowledgeBase, language, tone, paymentMethods, userName),
    generateProductDescriptions: async (productName: string, keywords: string) => aiApiService.generateProductDescriptions(productName, keywords),
    editProductImage: async (base64Data: string, mimeType: string, prompt: string) => aiApiService.editProductImage(base64Data, mimeType, prompt),
    generateShopSuggestion: async (prompt: string) => aiApiService.generateShopSuggestion(prompt),
    generateAdminSuggestion: async (prompt: string) => aiApiService.generateAdminDashboardSuggestion(prompt),

    // --- Platform Settings Service ---
    getPlatformSettings: () => platformSettingsService.getPlatformSettings(),
    savePlatformSettings: async (settings: PlatformSettings) => platformSettingsService.savePlatformSettings(settings),

    // --- Automation Service ---
    findKeywordReply: (message: string, keywordReplies: KeywordReply[], context: 'chat' | 'comments') => automationService.findKeywordReply(message, keywordReplies, context),
};

export default api;