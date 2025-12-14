import { getPlatformSettings } from './platformSettingsService';
import * as geminiAdapter from './geminiService';
import { ModelType, AssistantConfig, Content, Language, AssistantTone, ShopPaymentMethod, KnowledgeBase, Item, AIModelFunction, AIGlobalConfig } from '../types';
import { withRetry } from './retryService';
import { supabase } from '../supabase/client';
import { logger } from '../utils/logger';

// Feature flag: Use Edge Function for Gemini API (secure)
const USE_EDGE_FUNCTION = import.meta.env.VITE_USE_GEMINI_EDGE_FUNCTION === 'true';

export const generateChatMessage = async (
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
): Promise<{ text: string; orderId?: string; }> => {
    const settings = getPlatformSettings();
    const { globalModelConfig, modelAssignments } = settings.aiConfig;
    
    let modelFunction: AIModelFunction = 'generalChatStandard';
    if (assistantConfig.selectedModel === ModelType.FAST) modelFunction = 'generalChatFast';
    if (assistantConfig.selectedModel === ModelType.THINKING) modelFunction = 'generalChatThinking';

    const modelConfig = modelAssignments[modelFunction];
    
    if (modelConfig.provider === 'Google Gemini') {
        // Option 1: Use secure Edge Function (API key on backend)
        if (USE_EDGE_FUNCTION) {
            try {
                logger.debug('Using Gemini Edge Function for chat');
                const { data, error } = await supabase.functions.invoke('generate-chat-response', {
                    body: {
                        history,
                        newMessage,
                        assistantConfig,
                        knowledgeBase,
                        shopId,
                    },
                });

                if (error) {
                    logger.error('Edge Function error', error);
                    throw error;
                }

                return data as { text: string; orderId?: string };
            } catch (error: any) {
                logger.error('Failed to use Edge Function, falling back to direct API', error);
                // Fallback to direct API if Edge Function fails
            }
        }

        // Option 2: Direct API call (API key in frontend - less secure)
        return withRetry(
            () => geminiAdapter.generateChatResponse(
                shopId,
                conversationId,
                modelConfig.modelName,
                globalModelConfig,
                history,
                newMessage,
                assistantConfig,
                knowledgeBase,
                language,
                tone,
                paymentMethods,
                userName
            ),
            { maxRetries: 2, initialDelay: 1500 }
        );
    }
    
    throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
};

export const generateShopSuggestion = async (prompt: string): Promise<string> => {
    const settings = getPlatformSettings();
    const { globalModelConfig, modelAssignments } = settings.aiConfig;
    const modelConfig = modelAssignments.shopDashboardSuggestion;

    if (modelConfig.provider === 'Google Gemini') {
        const systemInstruction = "You are a helpful business analyst AI. Your task is to analyze sales and inventory data for an online shop and provide a concise list of 3-5 actionable suggestions for the shop owner. Use markdown for formatting (e.g., lists, bolding). Frame your response as helpful, direct advice.";
        return geminiAdapter.generateSuggestionFromModel(modelConfig.modelName, globalModelConfig, prompt, systemInstruction);
    }
    throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
};

export const generateAdminDashboardSuggestion = async (prompt: string): Promise<string> => {
    const settings = getPlatformSettings();
    const { globalModelConfig, modelAssignments } = settings.aiConfig;
    const modelConfig = modelAssignments.adminDashboardSuggestion;
    
    if (modelConfig.provider === 'Google Gemini') {
        const systemInstruction = "You are a business analyst for an AI platform owner. Your task is to analyze platform-level metrics and provide 3-5 concise, actionable suggestions. Focus on strategies to increase revenue, improve feature adoption, and reduce user churn. Use markdown for formatting (e.g., lists, bolding).";
        return geminiAdapter.generateSuggestionFromModel(modelConfig.modelName, globalModelConfig, prompt, systemInstruction);
    }
    throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
}

export const generateProductDescriptions = async (
    productName: string,
    keywords: string
): Promise<{ description: string; facebookSubtitle: string }> => {
    const settings = getPlatformSettings();
    const { globalModelConfig, modelAssignments, descriptionGeneratorConfig } = settings.aiConfig;
    const modelConfig = modelAssignments.descriptionGenerator;

    const languageInstruction = "Generate the response in the language used in the user's keywords and prompt, unless a different language is explicitly requested within the prompt itself.";

    const prompt = `
        ${descriptionGeneratorConfig.basePrompt}

        Product Name: "${productName}"
        Key features/keywords to include: "${keywords}"

        CRITICAL Instructions:
        ${descriptionGeneratorConfig.formatInstruction.replace('{{characterLimit}}', descriptionGeneratorConfig.characterLimit.toString())}
        
        3.  **Language**: ${languageInstruction}
    `;

    if (modelConfig.provider === 'Google Gemini') {
        return withRetry(
            () => geminiAdapter.generateProductDescriptionsFromModel(
                modelConfig.modelName,
                globalModelConfig,
                prompt,
                descriptionGeneratorConfig.characterLimit
            ),
            { maxRetries: 2, initialDelay: 1000 }
        );
    }
    throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
};

export const editProductImage = async (
    base64Data: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    const settings = getPlatformSettings();
    const { modelAssignments } = settings.aiConfig;
    const modelConfig = modelAssignments.photoStudio;

    if (modelConfig.provider === 'Google Gemini') {
        return withRetry(
            () => geminiAdapter.editProductImageWithModel(
                modelConfig.modelName,
                base64Data,
                mimeType,
                prompt
            ),
            { maxRetries: 2, initialDelay: 1500 }
        );
    }
    throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
};