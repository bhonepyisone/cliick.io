// supabase/ai.ts
// NOTE: This is frontend code that calls the secure Supabase Edge Function.

import { supabase } from './client';
import { Content, AssistantConfig, KnowledgeBase, AssistantTone, ShopPaymentMethod, Language } from '../types';

// This function acts as a client to our secure backend proxy (Supabase Edge Function).
export const generateChatResponse = async (
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
    
    // The 'generate-chat-response' string here MUST match the folder name of your Edge Function.
    const { data, error } = await supabase.functions.invoke('generate-chat-response', {
        body: { 
            shopId, 
            conversationId,
            history, 
            newMessage, 
            assistantConfig, 
            knowledgeBase, 
            language, 
            tone,
            paymentMethods,
            userName 
        },
    });

    if (error) {
        console.error("Error invoking Supabase Edge Function:", error);
        // Provide a user-friendly error message
        return { text: `Sorry, an error occurred while connecting to the AI assistant. (Details: ${error.message})`, orderId: undefined };
    }

    return data;
};

// You would create similar client functions for other AI tasks.
// Each would call its own dedicated Supabase Edge Function.

export const generateProductDescriptions = async (productName: string, keywords: string): Promise<{ description: string; facebookSubtitle: string }> => {
    // const { data, error } = await supabase.functions.invoke('generate-product-description', {
    //     body: { productName, keywords },
    // });
    // if (error) { throw new Error(error.message); }
    // return data;
    
    // For now, we'll return a placeholder to show the structure.
    // The actual edge function 'generate-product-description' would need to be created.
    console.warn("`generateProductDescriptions` is not fully implemented with a real backend function yet.");
    return {
        description: "This is a placeholder description from the mock `supabase/ai.ts`. The real edge function needs to be built.",
        facebookSubtitle: "[Price] Placeholder subtitle."
    };
};

export const editProductImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    // const { data, error } = await supabase.functions.invoke('edit-product-image', {
    //     body: { base64Data, mimeType, prompt },
    // });
    // if (error) { throw new Error(error.message); }
    // return data;
    
    console.warn("`editProductImage` is not fully implemented with a real backend function yet.");
    // Return the original image data URL as a fallback for now.
    return `data:${mimeType};base64,${base64Data}`;
};
