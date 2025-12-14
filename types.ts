// This file was incorrectly implemented as a service. It has been replaced with proper type definitions.

import { Content, FunctionDeclaration } from "@google/genai";

// Re-exporting Content for consistency as it's used alongside custom types.
export type { Content };

// Language
export type Language = string;

export interface CustomQuickReply {
    key: string;      // The unique, machine-readable key (e.g., 'flowTriageOrder', 'kb_section_123')
    title: string;    // The SELLER-OVERRIDDEN button text.
    reply: string;    // The SELLER-OVERRIDDEN bot response.
    enabled: boolean; // Seller can hide this button.
}


// AI Config
export enum ModelType {
    FAST = 'FAST',
    STANDARD = 'STANDARD',
    THINKING = 'THINKING',
}

export type AssistantTone = 'male' | 'female' | 'neutral';

export interface AssistantConfig {
    selectedModel: ModelType;
    systemPrompt: string;
    language: Language;
    tone: AssistantTone;
    responseDelay: number;
    customQuickReplies?: CustomQuickReply[];
    // FIX: Added optional mimicLanguage property to fix type error in useChatLogic.ts
    mimicLanguage?: boolean;
}

export interface AIGlobalConfig {
    temperature: number;
    topP: number;
    topK: number;
}

// Shop & Data
export interface PhysicalLocation {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    stateRegion: string;
    postalCode?: string;
    phone?: string;
    operatingHours?: string;
    notes?: string;
}

export interface KnowledgeSection {
    id: string;
    title: string;
    content: string;
    isCustom: boolean;
    isDeletable?: boolean;
    isTitleEditable?: boolean;
    includeInQuickReplies: boolean;
    type?: 'text' | 'location_list';
    locations?: PhysicalLocation[];
}

export interface KnowledgeBase {
    userDefined: KnowledgeSection[];
    productData: string;
}

export interface ShopPaymentMethod {
    id: string;
    name: string;
    instructions: string;
    qrCodeUrl?: string;
    requiresProof: boolean;
    enabled: boolean;
}

export interface StockMovement {
    timestamp: number;
    change: number;
    newStock: number;
    reason: string;
}

export interface Item {
    id: string;
    itemType: 'product' | 'service';
    name: string;
    description: string;
    facebookSubtitle?: string;
    retailPrice: number;
    originalPrice?: number;
    stock: number;
    imageUrl?: string;
    promoPrice?: number;
    promoStartDate?: string;
    promoEndDate?: string;
    warranty?: string;
    category?: string;
    duration?: number;
    location?: string;
    buttons?: PersistentMenuItem[];
    stockHistory?: StockMovement[];
    formId?: string;
}

export enum FormFieldType {
    SHORT_TEXT = 'Short Text',
    TEXT_AREA = 'Text Area',
    NUMBER = 'Number',
    EMAIL = 'Email',
    PHONE = 'Phone',
    DATE = 'Date',
    DROPDOWN = 'Dropdown',
    MULTIPLE_CHOICE = 'Multiple Choice',
    CHECKBOX = 'Checkbox',
    ITEM_SELECTOR = 'Item Selector',
    PAYMENT_SELECTOR = 'Payment Selector',
}

export interface FormField {
    id: string;
    type: FormFieldType;
    label: string;
    required: boolean;
    placeholder?: string;
    options?: string[];
    itemIds?: string[];
    paymentMethodIds?: string[];
}

export interface Form {
    id: string;
    name: string;
    fields: FormField[];
}

export interface OrderedItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export enum OrderStatus {
    Pending = 'Pending',
    Confirmed = 'Confirmed',
    Completed = 'Completed',
    Cancelled = 'Cancelled',
    Return = 'Return',
}

export interface FormSubmission {
    [key: string]: any; // for custom fields
    submissionId: string;
    orderId?: string;
    formId: string;
    formName: string;
    submittedAt: number;
    status: OrderStatus;
    orderedProducts: OrderedItem[];
    paymentMethod?: string;
    paymentScreenshotUrl?: string;
    discount?: {
        type: 'percentage' | 'fixed';
        value: number;
        amount: number;
    };
}

// Chat & Messaging
export enum MessageSender {
    USER = 'user',
    BOT = 'bot',
}

export interface QuickReplyAction {
    title: string;
    payload: string;
    type: 'postback' | 'open_form';
}

export interface CarouselItemButton {
    title: string;
    payload: string;
    type: 'postback' | 'web_url';
}

export interface CarouselItem {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    buttons: CarouselItemButton[];
}

export enum PersistentMenuItemType {
    POSTBACK = 'postback',
    WEB_URL = 'web_url',
    OPEN_FORM = 'open_form',
}

export interface PersistentMenuItem {
    id: string;
    type: PersistentMenuItemType;
    title: string;
    payload?: string;
    url?: string;
}

export interface Attachment {
    type: 'image' | 'video' | 'gif';
    url: string;
    name?: string;
}

export interface Message {
    sender: MessageSender;
    text?: string;
    attachment?: Attachment;
    quickReplies?: QuickReplyAction[];
    carousel?: CarouselItem[];
    persistentButtons?: PersistentMenuItem[];
}

// Automations
export interface KeywordReply {
    id: string;
    keywords: string;
    reply: string;
    matchType: 'contains' | 'exact';
    applyTo: {
        chat: boolean;
        comments: boolean;
    };
    attachment: Attachment | null;
    buttons: PersistentMenuItem[];
    enabled: boolean;
}

// User & Shop
export interface User {
    id: string;
    username: string;
    passwordHash: string;
    facebookId?: string;
    googleId?: string;
    avatarUrl?: string;
    createdAt?: number;
    isAdmin?: boolean;  // Platform admin role
}

export enum Role {
    OWNER = 'Owner',
    ADMIN = 'Admin',
    ORDER_MANAGER = 'Order Manager',
    SUPPORT_AGENT = 'Support Agent',
}

export interface TeamMember {
    userId: string;
    role: Role;
}

export type SubscriptionPlan = string;

export interface DataHistoryExtension {
    status?: 'inactive' | 'pending_activation' | 'active' | 'pending_deletion' | 'deletion_applied' | 'pending_cancellation' | 'pending_approval';
    subscribedAt?: number;
    deletionScheduledAt?: number;
    isCommitted?: boolean;
}

export interface Subscription {
    plan: SubscriptionPlan;
    status: 'trialing' | 'active' | 'expired' | 'pending_approval';
    trialEndsAt: number | null;
    periodEndsAt: number | null;
    paymentProof: string | null;
    pendingPlan?: SubscriptionPlan | null;
    isUpgradeCommitted?: boolean;
    dataHistoryExtension?: DataHistoryExtension;
    dataRetentionWarningDismissed?: boolean;
}

export interface CustomerEntryPoint {
    type: 'chat' | 'form';
    formId: string | null;
    welcomeMessage?: string;
    welcomeMessageActions?: PersistentMenuItem[];
}

export type LiveChatChannel = 'web' | 'facebook' | 'instagram' | 'tiktok' | 'telegram' | 'viber';

export interface LiveChatMessage {
    id: string;
    sender: 'user' | 'ai' | 'seller';
    senderId?: string; // for 'seller'
    text: string;
    timestamp: number;
    attachment?: Attachment | null;
    isNote?: boolean;
}

export type LiveChatStatus = 'open' | 'pending' | 'closed';

export interface LiveChatConversation {
    id: string;
    channel: LiveChatChannel;
    customerName: string;
    lastMessageAt: number;
    status: LiveChatStatus;
    assigneeId: string | null;
    tags: string[];
    notes: string;
    messages: LiveChatMessage[];
    isRead: boolean;
    isAiActive: boolean;
    awaitingProofForOrderId?: string | null;
    awaitingProofUntil?: number | null;
}

export interface OrderFlowStrings {
    manageOrderButtonText: string;
    manageOrderTriagePrompt: string;
    createNewOrder: string;
    updateExistingOrder: string;
    cancelExistingOrder: string;
    checkOrderStatus: string;
    askForOrderId: string;
    orderNotFound: string;
    orderStatusSummary: string;
    askManagementChoice: string;
    changeItems: string;
    updateAddress: string;
    updatePhone: string;
    cancelOrder: string;
    nevermind: string;
    changeItemsOptions: string;
    talkToSupport: string;
    cancelAndReorder: string;
    supportContact: string;
    supportContactNotFound: string;
    proceedToCancel: string;
    askForNewAddress: string;
    askForNewPhone: string;
    updateConfirmationRecap: string;
    cancellationStopped: string;
    orderCompleted: string;
    orderAlreadyCancelled: string;
    confirmCancellation: string;
    yesCancel: string;
    noKeep: string;
    orderCancelledSuccess: string;
    orderKept: string;
}

export interface BookingFlowStrings {
    manageBookingButtonText: string;
    manageBookingTriagePrompt: string;
    createNewBookingButtonText: string;
    updateExistingBookingButtonText: string;
    cancelExistingBookingButtonText: string;
    checkBookingStatusButtonText: string;
    askForBookingId: string;
    bookingNotFound: string;
    bookingStatusSummary: string;
    askBookingManagementChoice: string;
    changeDateTime: string;
    updatePhone: string;
    cancelBooking: string;
    nevermind: string;
    askForNewDateTime: string;
    askForNewPhone: string;
    updateBookingConfirmationRecap: string;
    cancellationStopped: string;
    bookingCompleted: string;
    bookingAlreadyCancelled: string;
    confirmCancellation: string;
    yesCancel: string;
    noKeep: string;
    bookingCancelledSuccess: string;
    bookingKept: string;
    askForServiceName: string;
}

export interface BookingFlowConfig {
    enabled: boolean;
    strings: BookingFlowStrings;
}

export interface OrderManagementFlowConfig {
    enabled: boolean;
    strings: OrderFlowStrings;
}

export interface OfflineSaleConfig {
    defaultFormId: string | null;
}
export interface OnlineSaleConfig {
    defaultFormId: string | null;
}
export interface ReceiptConfig {
    showPlatformLogo: boolean;
    customFooterText: string;
    receiptSize: 'standard' | '80mm' | '58mm';
}

export interface AICreditUsage {
    photoStudio: { used: number, lastReset: number };
    descriptionGeneration: { used: number, lastReset: number };
    shopDashboardSuggestion: { used: number, lastReset: number };
}

export interface Expense {
    id: string;
    date: string; // YYYY-MM-DD
    amount: number;
    category: 'Rent' | 'Marketing' | 'Supplies' | 'Salaries' | 'Utilities' | 'Other';
    description: string;
}

export interface OperationWidgetsConfig {
    id: string;
    enabled: boolean;
    order: number;
    width: number;
}
export interface TodoItem {
    id: string;
    text: string;
    isCompleted: boolean;
    createdAt: number;
    completedAt?: number;
}
export interface CalendarTask {
    id: string;
    date: string; // YYYY-MM-DD
    title: string;
    description: string;
}

export interface SavedReply {
    id: string;
    name: string;
    text: string;
}

export interface PaymentIntelligenceConfig {
    enabled: boolean;
    timeWindowMinutes: number;
    statusOnProof: OrderStatus.Confirmed | OrderStatus.Pending;
    confirmationMessage?: string;
}

export interface Shop {
    id: string;
    name: string;
    logoUrl?: string;
    ownerId: string;
    team: TeamMember[];
    subscription: Subscription;
    currency: string;
    isFacebookConnected: boolean;
    integrations?: {
        facebook?: { isConnected: boolean };
        instagram?: { isConnected: boolean; businessAccountId?: string; };
        tiktok?: { isConnected: boolean };
        telegram?: { isConnected: boolean };
        viber?: { isConnected: boolean };
    };
    customUrlSlug?: string;
    assistantConfig: AssistantConfig;
    knowledgeBase: KnowledgeBase;
    items: Item[];
    forms: Form[];
    formSubmissions: FormSubmission[];
    keywordReplies: KeywordReply[];
    savedReplies: SavedReply[];
    customerEntryPoint: CustomerEntryPoint;
    chatHistory: Content[];
    persistentMenu: PersistentMenuItem[];
    paymentMethods: ShopPaymentMethod[];
    paymentIntroMessage?: string;
    paymentButtonText?: string;
    onboarding: {
        checklistDismissed: boolean;
    };
    liveConversations: LiveChatConversation[];
    orderManagementFlowConfig: OrderManagementFlowConfig;
    bookingFlowConfig: BookingFlowConfig;
    offlineSaleConfig: OfflineSaleConfig;
    onlineSaleConfig: OnlineSaleConfig;
    receiptConfig: ReceiptConfig;
    aiCreditUsage?: AICreditUsage;
    conversationalCommerceUsage?: { count: number; cycleResetDate: string; };
    expenses: Expense[];
    operationWidgets: OperationWidgetsConfig[];
    todos: TodoItem[];
    quickNote: string;
    calendarTasks: CalendarTask[];
    paymentIntelligenceConfig: PaymentIntelligenceConfig;
}

// Platform settings
export interface PaymentMethod {
    id: string;
    name: string;
    details: string;
    qrCodeUrl: string;
    enabled: boolean;
}

export interface AIToneConfig {
    id: string;
    tone: AssistantTone;
    rules: {
        toneDescription: string;
        mustInclude?: string;
        mustAvoid?: string;
    };
}

export interface SubscriptionPlanDetails {
    id: string;
    name: string;
    price: number;
    features: string[];
    isProTier: boolean;
    isTemplate?: boolean;
    family?: 'Growth';
    tierName?: string;
    automatedTransactions?: number;
}

export interface DataHistoryTier {
    id: string;
    name: string;
    recordLimit: number;
    price: number;
}

export interface DataHistoryTierConfig {
    baseRecordLimit: number;
    basePrice: number;
    recordIncrement: number;
    priceIncrement: number;
    tierCount: number;
}

export interface GrowthPlanTierConfig {
    baseTransactionLimit: number;
    basePrice: number;
    transactionIncrement: number;
    priceIncrement: number;
    tierCount: number;
}

export interface AIDescriptionGeneratorConfig {
    basePrompt: string;
    formatInstruction: string;
    characterLimit: number;
}

export interface AIPhotoStudioPreset {
    id: string;
    name: string;
    prompt: string;
}

export interface AIPhotoStudioConfig {
    presets: AIPhotoStudioPreset[];
}

export interface AIConversationalCommerceConfig {
    proPlanInstructions: string;
    starterPlanInstructions: string;
}

export type AIProvider = 'Google Gemini' | 'OpenAI';
export type AIModelFunction = 
    | 'generalChatFast'
    | 'generalChatStandard'
    | 'generalChatThinking'
    | 'descriptionGenerator'
    | 'photoStudio'
    | 'shopDashboardSuggestion'
    | 'adminDashboardSuggestion';

export interface AIModelAssignments {
    generalChatFast: {
        provider: AIProvider;
        modelName: string;
    };
    generalChatStandard: {
        provider: AIProvider;
        modelName: string;
    };
    generalChatThinking: {
        provider: AIProvider;
        modelName: string;
    };
    descriptionGenerator: {
        provider: AIProvider;
        modelName: string;
    };
    photoStudio: {
        provider: AIProvider;
        modelName: string;
    };
    shopDashboardSuggestion: {
        provider: AIProvider;
        modelName: string;
    };
    adminDashboardSuggestion: {
        provider: AIProvider;
        modelName: string;
    };
}

export interface FeatureEntitlement {
    enabled: boolean;
    limit?: number | null;
}

export type PlanFeatures = {
    conversationalCommerce: FeatureEntitlement;
    aiPhotoStudio: FeatureEntitlement;
    aiDescriptionGeneration: FeatureEntitlement;
    shopDashboardSuggestion: FeatureEntitlement;
    basicDashboards: FeatureEntitlement;
    advancedDashboards: FeatureEntitlement;
    customUrlSlug: FeatureEntitlement;
    itemCount: FeatureEntitlement;
    keywordRuleCount: FeatureEntitlement;
    trainingSectionCount: FeatureEntitlement;
    deepThinking: FeatureEntitlement;
    bulkActions: FeatureEntitlement;
    offlineSale: FeatureEntitlement;
    paymentIntelligence: FeatureEntitlement;
};

export interface PlanEntitlements {
    [key: string]: Partial<PlanFeatures>;
    'Trial': Partial<PlanFeatures>;
    'Starter': Partial<PlanFeatures>;
    'Growth': Partial<PlanFeatures>;
    'Brand': Partial<PlanFeatures>;
    'Pro': Partial<PlanFeatures>;
}

export interface LocalizationSettings {
    enabledLanguages: string[];
    enabledCurrencies: string[];
}

export interface PlatformSettings {
    announcement: { id: string, message: string; enabled: boolean };
    maintenanceMode: boolean;
    currency: string;
    paymentMethods: PaymentMethod[];
    aiConfig: {
        globalSystemInstruction: string;
        forbiddenTopics: string;
        mandatorySafetyResponse: string;
        toneConfigs: AIToneConfig[];
        aiPermissions: {
            allowProductCatalog: boolean;
            allowTrainingData: boolean;
            allowConversationalOrdering: boolean;
        };
        descriptionGeneratorConfig: AIDescriptionGeneratorConfig;
        photoStudioConfig: AIPhotoStudioConfig;
        conversationalCommerceConfig: AIConversationalCommerceConfig;
        modelAssignments: AIModelAssignments;
        globalModelConfig: AIGlobalConfig;
    };
    subscriptionPlans: SubscriptionPlanDetails[];
    dataHistoryTiers: DataHistoryTier[];
    dataHistoryTierConfig: DataHistoryTierConfig;
    growthPlanTierConfig: GrowthPlanTierConfig;
    planEntitlements: PlanEntitlements;
    localization: LocalizationSettings;
}

export type ConversationState = 'idle' | 'awaiting_order_id_for_status' | 'awaiting_order_id_for_update' | 'awaiting_order_id_for_cancellation' | 'awaiting_update_choice' | 'awaiting_address_update' | 'awaiting_phone_update' | 'awaiting_cancellation_confirmation';

export type MenuItemAction = 'postback' | 'open_form' | 'open_a_web_url' | 'show_all_payment_methods' | 'manage_order' | 'manage_booking' | 'show_categories' | 'show_kb_section' | 'handover_to_human';

export interface CreateOrderArgs {
  customerName: string;
  phoneNumber: string;
  shippingAddress: string;
  products: { productName: string; quantity: number }[];
  paymentMethod: string;
}

export interface CreateBookingArgs {
  customerName: string;
  phoneNumber: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
}