import { useState, useCallback, useEffect } from 'react';
import {
    Shop, Message, MessageSender, Content, QuickReplyAction, CarouselItem, Form, FormSubmission, PersistentMenuItemType, Item, OrderStatus, ConversationState, PersistentMenuItem, CarouselItemButton,
    Attachment, Language
} from '../types';
import api from '../services/apiService';
import { useLocalization } from './useLocalization';

// --- Helper Functions for Intelligent Quick Replies ---

const KEYWORDS = {
    AWARENESS: ['hello', 'hi', 'what is this?', 'info', 'can you help', 'shop', 'မင်္ဂလာပါ', 'ဆိုင်', 'menu'],
    CONSIDERATION: ['delivery', 'shipping', 'payment', 'return policy', 'how much', 'price', 'ပို့ခ', 'ဘယ်လောက်လဲ', 'ငွေချေ', 'available?'],
    PURCHASE: ['i want to buy', 'order now', 'checkout', 'add to cart', 'how to pay?', 'ဝယ်မယ်', 'အော်ဒါတင်မယ်'],
    POST_PURCHASE: ['my order', 'order status', 'track', 'cancel', 'change address', 'အော်ဒါအခြေအနေ', 'booking', 'manage']
};

type Intent = 'AWARENESS' | 'CONSIDERATION' | 'PURCHASE' | 'POST_PURCHASE' | 'FALLBACK';

function detectIntent(text: string, shopItems: Item[]): Intent {
    const lowerText = text.toLowerCase().trim();
    if (!lowerText) return 'AWARENESS'; // Treat empty/initial state as awareness

    if (KEYWORDS.AWARENESS.some(kw => lowerText.includes(kw))) return 'AWARENESS';
    if (KEYWORDS.PURCHASE.some(kw => lowerText.includes(kw))) return 'PURCHASE';
    // Check for order ID patterns like TCCS-1001 or BK-TCCS-1002
    if (KEYWORDS.POST_PURCHASE.some(kw => lowerText.includes(kw)) || /([A-Z]{2,4}-\d{4,})/.test(text)) return 'POST_PURCHASE';
    if (KEYWORDS.CONSIDERATION.some(kw => lowerText.includes(kw)) || shopItems.some(item => lowerText.includes(item.name.toLowerCase()))) return 'CONSIDERATION';
    
    return 'FALLBACK';
}

// Simple language detection for turn-by-turn logic
const detectLanguage = (text: string): Language => {
    // Burmese characters Unicode range. A simple but effective check.
    const burmeseRegex = /[\u1000-\u109F]/;
    return burmeseRegex.test(text) ? 'my' : 'en';
};


export const generateQuickReplies = (shop: Shop, t: (key: string, options?: any, lng?: Language) => string, lastUserMessageText: string = '', lastBotMessage?: Message): QuickReplyAction[] => {
    if (!shop) return [];
    
    const MAX_QUICK_REPLIES = 5;
    const suggestions: QuickReplyAction[] = [];
    const addedPayloads = new Set<string>();

    const persistentButtonPayloads = new Set<string>(
        lastBotMessage?.persistentButtons?.map(btn => btn.payload).filter(Boolean) as string[]
    );

    const addSuggestion = (suggestion: QuickReplyAction) => {
        if (suggestions.length >= MAX_QUICK_REPLIES) return;

        const finalSuggestion: QuickReplyAction = {
            ...suggestion,
            title: suggestion.title.length > 20 ? suggestion.title.substring(0, 17) + '...' : suggestion.title,
            type: suggestion.type || 'postback'
        };
        
        if (!addedPayloads.has(finalSuggestion.payload) && !persistentButtonPayloads.has(finalSuggestion.payload)) {
            suggestions.push(finalSuggestion);
            addedPayloads.add(finalSuggestion.payload);
        }
    };
    
    const intent = detectIntent(lastUserMessageText, shop.items ?? []);

    const getCategoriesAction = (): QuickReplyAction | null => {
        const categories = Array.from(new Set((shop.items ?? []).map(item => item.category).filter(Boolean)));
        if (categories.length > 0) {
            const override = shop.assistantConfig.customQuickReplies?.find(o => o.key === 'showCategories');
            if (override && override.enabled === false) return null;
            const title = override?.title || t('quickReplyBrowseByCategory', {}, 'en');
            return { title, payload: 'SHOW_PRODUCT_CATEGORIES', type: 'postback' };
        }
        return null;
    };
    
    const getOrderOrBookAction = (): QuickReplyAction | null => {
        const isOrderFlowEnabled = shop.orderManagementFlowConfig?.enabled;
        const isBookingFlowEnabled = shop.bookingFlowConfig?.enabled;
        
        if (isOrderFlowEnabled) {
             const title = shop.orderManagementFlowConfig?.strings?.createNewOrder || t('quickReplyOrderNow', {}, 'en');
             return { title: title, payload: 'CREATE_NEW_ORDER_FLOW', type: 'postback' };
        }
        if (isBookingFlowEnabled) {
            const title = shop.bookingFlowConfig?.strings?.createNewBookingButtonText || t('quickReplyBookNow', {}, 'en');
            return { title: title, payload: 'CREATE_NEW_BOOKING_FLOW', type: 'postback' };
        }
        return null;
    };

    const getManageOrderOrBookingAction = (): QuickReplyAction | null => {
         const isOrderFlowEnabled = shop.orderManagementFlowConfig?.enabled;
         const isBookingFlowEnabled = shop.bookingFlowConfig?.enabled;
         
         if (isOrderFlowEnabled) {
            const title = shop.orderManagementFlowConfig?.strings?.manageOrderButtonText || t('quickReplyManageMyOrder', {}, 'en');
            return { title, payload: 'MANAGE_ORDER_FLOW', type: 'postback' };
         }
         if (isBookingFlowEnabled) {
            const bookingButtonText = shop.bookingFlowConfig?.strings?.manageBookingButtonText || t('quickReplyManageMyBooking', {}, 'en');
            return { title: bookingButtonText, payload: 'MANAGE_BOOKING_FLOW', type: 'postback' };
         }
         return null;
    };
    
    const getPaymentMethodsAction = (): QuickReplyAction | null => {
        if ((shop.paymentMethods ?? []).length > 0) {
            const title = shop.paymentButtonText || t('quickReplyPaymentMethods', {}, 'en');
            return { title, payload: 'SHOW_ALL_PAYMENT_METHODS', type: 'postback' };
        }
        return null;
    }

    const getTrainedInfoActions = (): QuickReplyAction[] => {
        return (shop.knowledgeBase?.userDefined ?? [])
            .filter(section => section.includeInQuickReplies && section.title !== 'Business Name' && section.title !== 'AI Persona & Name')
            .map(section => ({
                title: section.title,
                payload: `Tell me about ${section.title}`,
                type: 'postback'
            }));
    };
    
    const getTalkToHumanAction = (): QuickReplyAction | null => {
        const override = shop.assistantConfig?.customQuickReplies?.find(o => o.key === 'handoverToHuman');
        if (override && override.enabled === false) return null;
        const title = override?.title || t('quickReplyTalkToHuman', {}, 'en');
        return { title, payload: `HANDOVER_TO_HUMAN`, type: 'postback'};
    };

    const getContinueShoppingAction = (): QuickReplyAction => ({ title: t('quickReplyContinueShopping', {}, 'en'), payload: 'SHOW_PRODUCT_CATEGORIES', type: 'postback' });
    const getFinalQuestionAction = (): QuickReplyAction => ({ title: t('quickReplyFinalQuestion', {}, 'en'), payload: 'I have a question', type: 'postback' });
    const getBrowseNewArrivalsAction = (): QuickReplyAction | null => {
        // Simple logic: if there are products, offer to show them.
        if ((shop.items ?? []).length > 0) {
            return { title: t('quickReplyNewArrivals', {}, 'en'), payload: 'Show me new arrivals', type: 'postback' };
        }
        return null;
    };

    // --- Intent-based Logic ---
    switch (intent) {
        case 'AWARENESS':
            [getCategoriesAction(), getOrderOrBookAction(), ...getTrainedInfoActions()].forEach(action => action && addSuggestion(action));
            break;

        case 'CONSIDERATION':
            [getOrderOrBookAction(), getPaymentMethodsAction(), getTalkToHumanAction(), getContinueShoppingAction()].forEach(action => action && addSuggestion(action));
            break;
            
        case 'PURCHASE':
            [getOrderOrBookAction(), getPaymentMethodsAction(), getFinalQuestionAction()].forEach(action => action && addSuggestion(action));
            break;
        
        case 'POST_PURCHASE':
            [getManageOrderOrBookingAction(), getBrowseNewArrivalsAction(), getTalkToHumanAction()].forEach(action => action && addSuggestion(action));
            break;

        case 'FALLBACK':
        default:
             [getCategoriesAction(), getOrderOrBookAction(), getManageOrderOrBookingAction(), ...getTrainedInfoActions()].forEach(action => action && addSuggestion(action));
            break;
    }

    // Fill remaining slots if any, using a default priority
    if (suggestions.length < MAX_QUICK_REPLIES) {
        const fallbackActions = [
            getCategoriesAction(), 
            getOrderOrBookAction(), 
            getManageOrderOrBookingAction(), 
            getPaymentMethodsAction(),
            ...getTrainedInfoActions(),
            getTalkToHumanAction()
        ];
        fallbackActions.forEach(action => action && addSuggestion(action));
    }

    return suggestions;
};

export const generatePersistentMenuItems = (shop: Shop): PersistentMenuItem[] => {
    if (!shop) return [];
    const processedMenuItems = (shop.persistentMenu ?? [])
        .filter(item => {
            if (item.payload === 'MANAGE_ORDER_FLOW') {
                return shop.orderManagementFlowConfig?.enabled;
            }
            if (item.payload === 'MANAGE_BOOKING_FLOW') {
                return shop.bookingFlowConfig?.enabled;
            }
            return true;
        })
        .map(item => {
            if (item.payload === 'MANAGE_ORDER_FLOW') {
                return { ...item, title: shop.orderManagementFlowConfig?.strings?.manageOrderButtonText || 'Manage Order' };
            }
             if (item.payload === 'SHOW_ALL_PAYMENT_METHODS') {
                return { ...item, title: shop.paymentButtonText || 'Payment Methods' };
            }
            if (item.payload === 'MANAGE_BOOKING_FLOW') {
                return { ...item, title: shop.bookingFlowConfig?.strings?.manageBookingButtonText };
            }
            if (item.payload === 'CREATE_NEW_BOOKING_FLOW') {
                return { ...item, title: shop.bookingFlowConfig?.strings?.createNewBookingButtonText || 'Book Now' };
            }
            return item;
        });
    
    // De-duplicate by title
    const uniqueItems = new Map<string, PersistentMenuItem>();
    processedMenuItems.forEach(item => {
        if (!uniqueItems.has(item.title)) {
            uniqueItems.set(item.title, item);
        }
    });

    return Array.from(uniqueItems.values());
};


const generateRecapMessage = (submission: FormSubmission, recapTemplate: string): string => {
    const findKey = (obj: FormSubmission, ...possibleKeys: string[]) => {
        for (const key of possibleKeys) {
            const realKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
            if (realKey) return obj[realKey];
        }
        return 'N/A';
    };

    const isBooking = submission.formName.toLowerCase().includes('booking');

    if (isBooking) {
        const customerName = findKey(submission, 'Customer Name', 'Name');
        const phone = findKey(submission, 'Phone Number', 'Phone');
        const serviceName = submission.orderedProducts[0]?.productName || 'N/A';
        const date = findKey(submission, 'Appointment Date', 'Date');
        const time = findKey(submission, 'Appointment Time', 'Time');
        const bookingId = submission.orderId || 'N/A';
        
        return recapTemplate
            .replace(/\[BOOKING_ID\]/g, bookingId)
            .replace(/\[CUSTOMER_NAME\]/g, customerName)
            .replace(/\[PHONE_NUMBER\]/g, phone)
            .replace(/\[SERVICE_NAME\]/g, serviceName)
            .replace(/\[DATE\]/g, date)
            .replace(/\[TIME\]/g, time)
            .replace(/\[STATUS\]/g, submission.status);
    } else { // It's an order
        const customerName = findKey(submission, 'Full Name', 'Name', 'Customer Name');
        const phone = findKey(submission, 'Phone Number', 'Phone');
        const address = findKey(submission, 'Full Shipping Address', 'Address', 'Shipping Address');
        
        const productList = submission.orderedProducts.map(p => `- ${p.productName} (x${p.quantity})`).join('\n');
        const totalAmount = submission.orderedProducts.reduce((total, p) => total + (p.unitPrice * p.quantity), 0);

        return recapTemplate
            .replace(/\[ORDER_ID\]/g, submission.orderId || 'N/A')
            .replace(/\[CUSTOMER_NAME\]/g, customerName)
            .replace(/\[PHONE_NUMBER\]/g, phone)
            .replace(/\[SHIPPING_ADDRESS\]/g, address)
            .replace(/\[PRODUCT_LIST\]/g, productList || 'No items')
            .replace(/\[TOTAL_AMOUNT\]/g, totalAmount.toLocaleString())
            .replace(/\[STATUS\]/g, submission.status);
    }
};

// --- Custom Hook ---

interface UseChatLogicProps {
    shop: Shop | null;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    initialMessages?: Message[];
    onMessageLogged?: (sender: 'user' | 'ai', text: string, attachmentUrl?: string) => void;
    conversationId?: string | null;
    t: (key: string, options?: any, lng?: Language) => string; // Pass the t function
}

// A stable, fixed ID for the preview chat session
const PREVIEW_SESSION_ID = 'preview_chat_session';

export const useChatLogic = ({ shop, onUpdateShop, initialMessages, onMessageLogged, conversationId: propConversationId, t }: UseChatLogicProps) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages || []);
    const [chatHistory, setChatHistory] = useState<Content[]>(shop?.chatHistory || []);
    const [isLoading, setIsLoading] = useState(false);
    const [activeForm, setActiveForm] = useState<Form | null>(null);
    const [conversationState, setConversationState] = useState<ConversationState>('idle');
    const [managingOrder, setManagingOrder] = useState<FormSubmission | null>(null);
    const [managingBooking, setManagingBooking] = useState<FormSubmission | null>(null);
    const [lastConversationalOrderId, setLastConversationalOrderId] = useState<string | null>(null);
     // Use the conversationId from props, or fallback to the stable preview ID.
    // This ensures that the preview window always has a consistent conversation context.
    const [conversationId] = useState<string>(propConversationId || PREVIEW_SESSION_ID);

    // Ensure state is synced if the shop prop changes (e.g., from parent component refresh)
    useEffect(() => {
        if (shop) {
            setChatHistory(shop.chatHistory || []);
        }
    }, [shop]);
    
    useEffect(() => {
        if (messages.length > 0 && !initialMessages) {
            return;
        }

        if (initialMessages && initialMessages.length > 0) {
            setMessages(initialMessages);
        } 
        else if (shop) {
             const welcomeMessage: Message = {
                sender: MessageSender.BOT,
                text: 'This is a preview of your AI assistant. Send a message to test its responses.'
             };
             welcomeMessage.quickReplies = generateQuickReplies(shop, t, 'hello', welcomeMessage);
             setMessages([welcomeMessage]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMessages, shop, t]);


    const appendMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, message]);
        setIsLoading(false); // Make sure to stop loading indicator if it was on
        if(onMessageLogged) {
            onMessageLogged('ai', message.text || '[Message with components]', message.attachment?.url);
        }
    }, [onMessageLogged]);

    const sendBotResponseWithDelay = useCallback((
        messageOrText: Message | string, 
        options: Partial<Pick<Message, 'attachment' | 'quickReplies' | 'carousel' | 'persistentButtons'>> = {},
        lastUserMessageText: string = '',
        turnT?: (key: string, options?: any) => string
    ) => {
        if (!shop) return;
        let botMessage: Message;
        if (typeof messageOrText === 'string') {
            botMessage = {
                sender: MessageSender.BOT,
                text: messageOrText,
                ...options
            };
        } else {
            botMessage = { ...messageOrText, ...options };
        }
        
        const tFunc = turnT || t;
        botMessage.quickReplies = options.quickReplies ?? generateQuickReplies(shop, tFunc, lastUserMessageText, botMessage);

        const delay = (shop.assistantConfig.responseDelay || 0) * 1000;
        
        setTimeout(() => {
            appendMessage(botMessage);
        }, delay);
    }, [shop, appendMessage, t]);
    
    const handleConversationStep = useCallback(async (payload: string) => {
        if (!shop) return;
        
        const orderLoc = shop.orderManagementFlowConfig.strings;

        switch (conversationState) {
            case 'awaiting_order_id_for_status': {
                // Search through formSubmissions for matching order ID or phone
                const submission = shop.formSubmissions.find(s => 
                    s.orderId === payload || 
                    (s.data && typeof s.data === 'object' && 'Phone Number' in s.data && s.data['Phone Number'] === payload)
                );
                if (submission) {
                    const recapMessage = generateRecapMessage(submission, orderLoc.orderStatusSummary);
                    sendBotResponseWithDelay(recapMessage, {}, payload);
                } else {
                    sendBotResponseWithDelay(orderLoc.orderNotFound, {}, payload);
                }
                setConversationState('idle'); // End this flow
                break;
            }
            // ... other states like awaiting_address_update will be implemented here
            default:
                setConversationState('idle'); // Fallback to idle
                return false; // Indicate that the step was not handled
        }
        return true; // Indicate that the step was handled
    }, [shop, conversationState, sendBotResponseWithDelay]);

    const handleSendMessage = useCallback(async (payload: string, displayText?: string) => {
        if (!shop) return;
        
        const textForUi = displayText || payload;
        const userMessage: Message = { sender: MessageSender.USER, text: textForUi };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        if(onMessageLogged) {
            onMessageLogged('user', textForUi);
        }
        
        const currentConversation = shop.liveConversations.find(c => c.id === conversationId);
        
        const turnLang = shop.assistantConfig.language as Language;
        const turnT = (key: string, options?: any) => t(key, { ...options }, turnLang);

        // --- State Machine Logic ---
        if (conversationState !== 'idle') {
            const stepHandled = await handleConversationStep(payload);
            if (stepHandled) return;
        }
        
        const orderLoc = shop.orderManagementFlowConfig.strings;
        
        // --- Stateless Command Logic ---
        const handleCommand = (): boolean => {
            if (payload === 'HANDOVER_TO_HUMAN') {
                if (conversationId) {
                    onUpdateShop(s => ({
                        ...s,
                        liveConversations: s.liveConversations.map(c => 
                            c.id === conversationId ? { ...c, isAiActive: false } : c
                        )
                    }));
                }
                const override = shop.assistantConfig.customQuickReplies?.find(o => o.key === 'handoverToHuman');
                const handoverMessage = override?.reply || t('handoverToHuman', {}, 'en');
                sendBotResponseWithDelay(handoverMessage, {}, payload);
                return true;
            }
            if (payload.startsWith('PRODUCT_INFO_ID_')) {
                const itemId = payload.replace('PRODUCT_INFO_ID_', '');
                const item = shop.items.find(i => i.id === itemId);
                if (item) {
                    sendBotResponseWithDelay(item.description || "No detailed description.", { persistentButtons: item.buttons }, payload, turnT);
                } else {
                    sendBotResponseWithDelay("Sorry, I couldn't find details for that item.", {}, payload, turnT);
                }
                return true;
            }
             if (payload === 'SHOW_PRODUCT_CATEGORIES') {
                const categories = Array.from(new Set(shop.items.map(i => i.category).filter(Boolean)));
                const override = shop.assistantConfig.customQuickReplies?.find(o => o.key === 'showCategories');
                const introMessage = override?.reply || t('quickReplyWhichCategory', {}, 'en');
                const noCategoryMessage = t('quickReplyNoCategories', {}, 'en');
                
                if (categories.length > 0) {
                    const quickReplies: QuickReplyAction[] = categories.map(cat => ({ title: cat!, payload: `Show me ${cat}`, type: 'postback' }));
                    sendBotResponseWithDelay(introMessage, { quickReplies }, payload);
                } else {
                    sendBotResponseWithDelay(noCategoryMessage, {}, payload);
                }
                return true;
            }
            // FIX: Intercept "Show me [Category]" to deterministically show a product carousel.
            if (payload.toLowerCase().startsWith('show me ')) {
                const category = payload.substring('show me '.length);
                const itemsInCategory = shop.items.filter(i => i.category?.toLowerCase() === category.toLowerCase());
    
                if (itemsInCategory.length > 0) {
                    const carouselItems: CarouselItem[] = itemsInCategory.slice(0, 10).map(item => ({ // Limit to 10 for carousel
                        title: item.name,
                        subtitle: `${(item.promoPrice || item.retailPrice).toLocaleString()} ${shop.currency}`,
                        imageUrl: item.imageUrl,
                        // FIX: Use item's specific buttons if they exist, otherwise default to "More Info".
                        buttons: (item.buttons && item.buttons.length > 0) 
                            ? item.buttons.map(btn => ({ title: btn.title, payload: btn.payload || btn.url || btn.id, type: btn.type === 'web_url' ? 'web_url' : 'postback' }))
                            : [
                                { title: t('moreInfo'), payload: `PRODUCT_INFO_ID_${item.id}`, type: 'postback' }
                            ]
                    }));
                    sendBotResponseWithDelay({
                        sender: MessageSender.BOT,
                        text: `Here are the items in the ${category} category:`,
                        carousel: carouselItems
                    }, {}, payload);
                } else {
                    sendBotResponseWithDelay(`I couldn't find any items in the '${category}' category.`, {}, payload);
                }
                return true; // Command handled
            }
            if (payload === 'SHOW_ALL_PAYMENT_METHODS') {
                const enabledMethods = shop.paymentMethods.filter(p => p.enabled);
                const buttons: PersistentMenuItem[] = enabledMethods.map(m => ({ id: `pm_${m.id}`, type: PersistentMenuItemType.POSTBACK, title: m.name, payload: `PAYMENT_INFO_ID_${m.id}`}));
                const introMessage = shop.paymentIntroMessage || t('quickReplyAcceptThesePayments', {}, 'en');
                sendBotResponseWithDelay(introMessage, { persistentButtons: buttons }, payload);
                return true;
            }
             if (payload.startsWith('PAYMENT_INFO_ID_')) {
                const method = shop.paymentMethods.find(p => p.id === payload.replace('PAYMENT_INFO_ID_', ''));
                if (method) {
                    sendBotResponseWithDelay(`${method.name} details:\n${method.instructions}`, { attachment: method.qrCodeUrl ? {type: 'image', url: method.qrCodeUrl} : undefined }, payload, turnT);
                }
                return true;
            }
            if (payload === 'CREATE_NEW_ORDER_FLOW') {
                const form = shop.forms.find(f => f.id === shop.onlineSaleConfig?.defaultFormId);
                if (form) setActiveForm(form);
                else sendBotResponseWithDelay(t('quickReplyDefaultOrderFormNotSet', {}, 'en'), {}, payload);
                return true;
            }
            // --- Order & Booking Management Triage ---
            if (payload === 'MANAGE_ORDER_FLOW') {
                 sendBotResponseWithDelay(orderLoc.manageOrderTriagePrompt, { quickReplies: [ { title: orderLoc.checkOrderStatus, payload: 'CHECK_ORDER_STATUS_FLOW', type: 'postback' }, { title: orderLoc.updateExistingOrder, payload: 'UPDATE_EXISTING_ORDER_FLOW', type: 'postback' }, { title: orderLoc.cancelExistingOrder, payload: 'CANCEL_EXISTING_ORDER_FLOW', type: 'postback' } ] }, payload, turnT);
                return true;
            }
            if (payload === 'CHECK_ORDER_STATUS_FLOW') {
                setConversationState('awaiting_order_id_for_status');
                sendBotResponseWithDelay(orderLoc.askForOrderId, {}, payload, turnT);
                return true;
            }
            return false;
        }

        if (handleCommand()) {
            setIsLoading(false);
            return;
        }
        
        // Check if AI is active for this conversation
        if (currentConversation && !currentConversation.isAiActive) {
            setIsLoading(false);
            // Optionally send a message like "Waiting for an agent..." or just do nothing.
            return;
        }
        
        // --- Keyword Automation ---
        const keywordReply = api.findKeywordReply(payload, shop.keywordReplies, 'chat');
        if (keywordReply) {
            sendBotResponseWithDelay({ sender: MessageSender.BOT, text: keywordReply.reply, attachment: keywordReply.attachment, persistentButtons: keywordReply.buttons }, {}, payload, turnT);
            return;
        }
        
        // --- Gemini Fallback ---
        const historyForApi: Content[] = [...chatHistory, { role: 'user', parts: [{ text: payload }] }];

        const { text: geminiText, orderId } = await api.sendMessageToGemini(
            shop.id,
            conversationId,
            chatHistory,
            payload,
            shop.assistantConfig,
            shop.knowledgeBase,
            turnLang, // Pass the detected language for this turn
            shop.assistantConfig.tone,
            shop.paymentMethods,
        );
        
        const botResponse: Content = { role: 'model', parts: [{ text: geminiText }] };
        const newHistory = [...historyForApi, botResponse];
        
        if (orderId) {
            setLastConversationalOrderId(orderId);
            // The shop was updated by createConversationalOrder.
            // Fetch this latest version which has the `awaitingProof` flags.
            const updatedShopFromServer = await api.getShopById(shop.id);
            if (updatedShopFromServer) {
                // Now, apply the local chat history update to this fresh server state.
                onUpdateShop(() => ({
                    ...updatedShopFromServer,
                    chatHistory: newHistory
                }));
            } else {
                // Fallback if fetch fails, though unlikely. Just update history.
                onUpdateShop(prevShop => ({
                    ...prevShop,
                    chatHistory: newHistory,
                }));
            }
        } else {
            // No order was created, so no server state change. Just update history.
            onUpdateShop(prevShop => ({
                ...prevShop,
                chatHistory: newHistory,
            }));
        }

        sendBotResponseWithDelay(geminiText, {}, payload, turnT);

    }, [shop, onUpdateShop, chatHistory, conversationId, t, conversationState, handleConversationStep, onMessageLogged, sendBotResponseWithDelay, setActiveForm]);
    
    
    const handleQuickReplyClick = useCallback((reply: QuickReplyAction) => {
        if (reply.type === 'open_form' && reply.payload) {
            const form = shop?.forms.find(f => f.id === reply.payload);
            if (form) {
                setActiveForm(form);
            }
        } else {
            handleSendMessage(reply.payload, reply.title);
        }
    }, [shop, handleSendMessage, setActiveForm]);

    const handleCarouselButtonClick = useCallback((button: CarouselItemButton) => {
        if (button.type === 'web_url') {
            window.open(button.payload, '_blank', 'noopener,noreferrer');
        } else {
            handleSendMessage(button.payload, button.title);
        }
    }, [handleSendMessage]);

    const handleSendAttachment = useCallback(async (base64Url: string) => {
        if (!shop) return;
    
        // 1. Immediately display the user's attachment message.
        const attachment: Attachment = { type: 'image', url: base64Url };
        const userMessage: Message = { sender: MessageSender.USER, text: '', attachment: attachment };
        setMessages(prev => [...prev, userMessage]);
    
        // 2. Asynchronously process the image for payment intelligence.
        if (conversationId) {
            const freshShop = await api.getShopById(shop.id);
            if (!freshShop) {
                sendBotResponseWithDelay("An error occurred. Please try again.", {});
                if (onMessageLogged) onMessageLogged('user', '[User sent an image]', base64Url);
                return;
            }
    
            const config = freshShop.paymentIntelligenceConfig;
            const conversation = freshShop.liveConversations.find(c => c.id === conversationId);
    
            if (config && config.enabled && conversation && conversation.awaitingProofForOrderId && conversation.awaitingProofUntil && Date.now() < conversation.awaitingProofUntil) {
                const orderId = conversation.awaitingProofForOrderId;
                const submission = freshShop.formSubmissions.find(s => s.orderId === orderId);
    
                if (submission) {
                    if (submission.status === OrderStatus.Pending) {
                        submission.paymentScreenshotUrl = base64Url;
                        submission.status = config.statusOnProof;
    
                        conversation.tags = conversation.tags.filter(t => !t.startsWith('Order ID:'));
                        if (!conversation.tags.includes('Payment-Submitted')) {
                            conversation.tags.push('Payment-Submitted');
                        }
                        conversation.awaitingProofForOrderId = null;
                        conversation.awaitingProofUntil = null;
                        
                        onUpdateShop(() => freshShop); 

                        const confirmationTemplate = config.confirmationMessage || "Thank you! Your payment proof for Order #{{orderId}} has been received.";
                        const confirmationMessage = confirmationTemplate.replace(/{{orderId}}/g, orderId);
                
                        sendBotResponseWithDelay(confirmationMessage);
                        
                        if (onMessageLogged) {
                            onMessageLogged('user', `[User sent payment proof for #${orderId}]`, base64Url);
                        }
                        return; 
                    } else {
                        conversation.awaitingProofForOrderId = null;
                        conversation.awaitingProofUntil = null;
                        onUpdateShop(() => freshShop);
                        sendBotResponseWithDelay(`This order (${orderId}) has already been processed and does not require payment proof.`);
                        if (onMessageLogged) {
                            onMessageLogged('user', `[User sent an image for an already processed order #${orderId}]`, base64Url);
                        }
                        return;
                    }
                }
            }
        }
    
        // 3. If not handled by payment intelligence, send the fallback response.
        if (onMessageLogged) {
            onMessageLogged('user', '[User sent an image]', base64Url);
        }
        sendBotResponseWithDelay("Thanks for the image! I'm an AI and still learning to process images. How can I help you with text?", {}, '[user sent image]');
    
    }, [shop, conversationId, onUpdateShop, sendBotResponseWithDelay, onMessageLogged]);
    

    return {
        messages,
        isLoading,
        activeForm,
        setActiveForm,
        handleSendMessage,
        handleQuickReplyClick,
        handleCarouselButtonClick,
        handleSendAttachment,
        appendMessage,
    };
};