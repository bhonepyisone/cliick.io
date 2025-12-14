import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type, Modality } from "@google/genai";
import { AssistantTone, KnowledgeBase, AssistantConfig, ShopPaymentMethod, Item, Language, Content, AIGlobalConfig, CreateOrderArgs, CreateBookingArgs } from '../types';
import { getPlatformSettings } from './platformSettingsService';
import * as shopService from './shopService';
import { allLanguages } from '../data/localizationData';
import { tokenTracker } from '../utils/tokenTracker';
import { tokenLimiter } from '../utils/tokenLimiter';
import { tokenBudgetService } from './tokenBudgetService';
import { pricingService } from './pricingService';

let ai: GoogleGenAI | null = null;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const createConversationalOrderTool: FunctionDeclaration = {
  name: 'createConversationalOrder',
  description: 'Creates a customer order for physical products when all necessary information has been collected AND the user has explicitly confirmed the order details. Only use this for items with an itemType of "product".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: {
        type: Type.STRING,
        description: 'The full name of the customer placing the order.',
      },
      phoneNumber: {
        type: Type.STRING,
        description: 'The contact phone number for the customer.',
      },
      shippingAddress: {
        type: Type.STRING,
        description: 'The full shipping address, including street, city, and any other relevant details.',
      },
      products: {
        type: Type.ARRAY,
        description: 'An array of products the customer wants to order.',
        items: {
          type: Type.OBJECT,
          properties: {
            productName: {
              type: Type.STRING,
              description: 'The name of the product. Must match a product name from the provided item catalog.',
            },
            quantity: {
              type: Type.INTEGER,
              description: 'The quantity of this product to order.',
            },
          },
          required: ['productName', 'quantity'],
        },
      },
      paymentMethod: {
        type: Type.STRING,
        description: "The payment method chosen by the customer. This must match one of the payment methods from the 'Payment Methods' knowledge base section."
      }
    },
    required: ['customerName', 'phoneNumber', 'shippingAddress', 'products', 'paymentMethod'],
  },
};

const createBookingTool: FunctionDeclaration = {
    name: 'createBookingTool',
    description: 'Books a service for a customer when all necessary information has been collected and the user has confirmed the details. Only use this for items with an itemType of "service".',
    parameters: {
        type: Type.OBJECT,
        properties: {
            customerName: { type: Type.STRING, description: 'The full name of the customer.' },
            phoneNumber: { type: Type.STRING, description: 'The contact phone number for the customer.' },
            serviceName: { type: Type.STRING, description: 'The name of the service to book. Must match a service from the item catalog.' },
            appointmentDate: { type: Type.STRING, description: 'The requested date for the appointment (e.g., "Tomorrow", "July 25th", "2024-08-15").' },
            appointmentTime: { type: Type.STRING, description: 'The requested time for the appointment (e.g., "around noon", "14:30").' },
        },
        required: ['customerName', 'phoneNumber', 'serviceName', 'appointmentDate', 'appointmentTime'],
    },
};

export const generateChatResponse = async (
    shopId: string,
    conversationId: string | null,
    modelName: string,
    globalConfig: AIGlobalConfig,
    history: Content[],
    newMessage: string,
    assistantConfig: AssistantConfig,
    knowledgeBase: KnowledgeBase,
    language: Language,
    tone: AssistantTone,
    paymentMethods: ShopPaymentMethod[],
    userName?: string,
): Promise<{ text: string; orderId?: string; }> => {
    if (!ai) {
        throw new Error("API key not configured.");
    }

    try {
        // Check budget before making request
        const budgetCheck = await tokenBudgetService.canMakeRequest(shopId);
        if (!budgetCheck.allowed) {
            // Log billing event for rejected request
            await pricingService.getRealTimeBillingInfo(shopId).catch(err => 
                console.warn('[GEMINI] Failed to get billing info for rejected request:', err)
            );
            return {
                text: budgetCheck.reason || 'Your token budget has been exceeded. Please contact support or upgrade your plan.',
                orderId: undefined,
            };
        }

        // Apply cost optimization if enabled
        const optimization = await tokenBudgetService.applyOptimization(shopId, 'chat_message', {
            modelName,
            historyLength: history.length,
        });

        if (optimization.optimized) {
            console.log(`[GEMINI] Cost optimization applied:`, optimization.message);
            modelName = optimization.modelName;
            
            // Trim history if optimization suggests it
            if (optimization.maxHistoryMessages && history.length > optimization.maxHistoryMessages) {
                history = history.slice(-optimization.maxHistoryMessages);
                console.log(`[GEMINI] Reduced history from ${history.length} to ${optimization.maxHistoryMessages} messages`);
            }
        }

        const platformSettings = getPlatformSettings();
        const shop = shopService.getShopById(shopId);
        if (!shop) {
             throw new Error("Shop not found.");
        }
        
        const langNameMap = allLanguages.reduce((acc, lang) => {
            acc[lang.code] = lang.name;
            return acc;
        }, {} as Record<string, string>);

        const primaryLangName = langNameMap[assistantConfig.language] || 'the shop\'s primary language';

        const bilingualInstruction = `
--- CRITICAL BILINGUAL RESPONSE DIRECTIVE ---
You are a bilingual assistant whose primary language is ${primaryLangName}, but you are also fluent in English. Follow these rules STRICTLY for every response to create a natural conversation:

1.  **Default to Primary Language:** Your default response language is ALWAYS ${primaryLangName}. Start conversations in ${primaryLangName} and continue using it unless the user clearly switches.

2.  **Adaptive Switching to English:** Analyze the history. IF the user has sent their last TWO consecutive messages primarily in English, you MUST switch and respond entirely in English. A single English word (like a name or city, e.g., "Austin") in an otherwise ${primaryLangName} context does NOT count as a switch. The user must show a clear pattern of using English.

3.  **Switching Back to Primary:** IF you are currently responding in English (because of rule #2) and the user's LATEST message switches back to ${primaryLangName}, you MUST also switch back and respond entirely in ${primaryLangName}.

4.  **Consistency is Key:** Do NOT mix languages in a single response. Your entire reply, including any button text, must be in ONE language determined by these rules.
`;
        
        // --- NEW STRATEGY LOGIC ---
        const hasPhysicalLocations = (knowledgeBase.userDefined || []).some(
            section => section.type === 'location_list' && section.locations && section.locations.length > 0
        );
        const isOrderFlowEnabled = shop.orderManagementFlowConfig.enabled;
        const isBookingFlowEnabled = shop.bookingFlowConfig.enabled;
        const hasOnlineFlows = isOrderFlowEnabled || isBookingFlowEnabled;

        let salesStrategy: 'Omnichannel' | 'Online-Only' | 'Physical-Only' | 'Informational-Only' = 'Informational-Only';

        if (hasOnlineFlows && hasPhysicalLocations) {
            salesStrategy = 'Omnichannel';
        } else if (hasOnlineFlows && !hasPhysicalLocations) {
            salesStrategy = 'Online-Only';
        } else if (!hasOnlineFlows && hasPhysicalLocations) {
            salesStrategy = 'Physical-Only';
        }

        let strategyInstruction = '';
        switch (salesStrategy) {
            case 'Omnichannel':
                strategyInstruction = `
--- CRITICAL SELLING STRATEGY: OMNICHANNEL ---
This business sells both online AND in physical locations. When a customer expresses interest in buying or booking, you MUST first ask for their preference.
Example phrasing: "Great! Would you like to order online for delivery, or would you prefer to find a nearby store to see it in person?"
Based on their answer, either guide them to an online order/booking, or direct them to one of the physical locations listed in the Knowledge Base.
`;
                break;
            case 'Online-Only':
                // The commerce mode instructions below will cover this. No specific strategy override needed.
                break;
            case 'Physical-Only':
                strategyInstruction = `
--- CRITICAL SELLING STRATEGY: PHYSICAL ONLY ---
This business sells products or services exclusively through its physical locations. Your primary goal is to help customers find a store from the lists provided in the Knowledge Base.
You MUST direct them to one of these locations to make a purchase or booking.
You MUST NOT attempt to take an online order or booking, not even to collect details for a human. If a user asks to buy online, you must politely inform them that purchases can only be made at physical stores and then provide store information.
`;
                break;
            case 'Informational-Only':
                 strategyInstruction = `
--- CRITICAL SELLING STRATEGY: INFORMATIONAL ONLY ---
This business does not sell products or services through you. Your sole purpose is to provide information based on the knowledge base. Do not attempt to take orders, book services, or ask for customer details like name or phone number.
`;
                break;
        }

        // --- Location Query Directive (can co-exist with any strategy) ---
        let locationQueryDirective = '';
        if (hasPhysicalLocations) {
            locationQueryDirective = `
--- CRITICAL LOCATION QUERY DIRECTIVE ---
When a user asks for a physical store location, first check if their query contains a specific city or region (e.g., "in Yangon", "near Mandalay"). If it does, you MUST filter the location lists provided in your knowledge base and ONLY return the locations where the 'City' or 'Region' field matches the user's request. If the user does not specify a location, you may either list all locations or ask them "Which city are you in?" to provide more relevant results.
`;
        }

        // --- Determine Commerce Mode ---
        let commerceInstruction = '';
        let useTools = false;
        
        const planEntitlement = platformSettings.planEntitlements[shop.subscription.plan];
        let canUseConversationalCommerce = planEntitlement?.conversationalCommerce?.enabled ?? false;
        const commerceLimit = planEntitlement?.conversationalCommerce?.limit;

        if (canUseConversationalCommerce && commerceLimit !== null) {
            const usage = shop.conversationalCommerceUsage;
            const now = new Date();
            let currentCount = 0;

            if (usage) {
                const resetDate = new Date(usage.cycleResetDate);
                if (resetDate.getMonth() === now.getMonth() && resetDate.getFullYear() === now.getFullYear()) {
                    currentCount = usage.count;
                }
            }

            if (currentCount >= commerceLimit) {
                // Limit reached, switch to assisted mode
                canUseConversationalCommerce = false;
                
                const currentPlanDetails = platformSettings.subscriptionPlans.find(p => p.id === shop.subscription.plan);
                let nextPlanText = 'a higher tier';
                if (currentPlanDetails) {
                    if (currentPlanDetails.name === 'Starter') {
                        nextPlanText = 'our Growth';
                    } else if (currentPlanDetails.family === 'Growth') {
                        nextPlanText = 'a higher Growth tier or the Pro';
                    }
                }

                const upgradeMessage = `Congratulations, your AI has made ${commerceLimit} sales for you this month! To continue making automated sales, please upgrade to ${nextPlanText} Plan.`;
                return { text: upgradeMessage, orderId: undefined };
            }
        }

        // 'Brand' plan also disables commerce
        if(shop.subscription.plan === 'Brand'){
            canUseConversationalCommerce = false;
        }

        if (salesStrategy === 'Omnichannel' || salesStrategy === 'Online-Only') {
             if (canUseConversationalCommerce) {
                let { proPlanInstructions } = platformSettings.aiConfig.conversationalCommerceConfig;
                proPlanInstructions += "\n5. After the createConversationalOrder tool is called successfully and returns an Order ID, your next response must inform the user to send their payment screenshot now if the payment method requires proof (you can see this in the 'Payment Methods' knowledge base section). Example: 'Your order #TCCS-1008 is confirmed. To finalize, please send a screenshot of your payment now.'";
                commerceInstruction = proPlanInstructions;
                useTools = true;
            } else {
                const { starterPlanInstructions } = platformSettings.aiConfig.conversationalCommerceConfig;
                commerceInstruction = starterPlanInstructions;
            }
        }
        
        // --- Layered Prompt Construction ---
        let finalSystemInstruction = platformSettings.aiConfig.globalSystemInstruction || 'You are a helpful AI assistant.';

        if (locationQueryDirective) {
            finalSystemInstruction = locationQueryDirective + '\n' + finalSystemInstruction;
        }

        if (strategyInstruction) {
            finalSystemInstruction = strategyInstruction + '\n' + finalSystemInstruction;
        }
        
        if (commerceInstruction) {
            finalSystemInstruction += commerceInstruction;
        }

        finalSystemInstruction += bilingualInstruction;

        finalSystemInstruction += `\n\n--- Your Persona for This Shop ---\n${assistantConfig.systemPrompt}`;

        const { aiPermissions } = platformSettings.aiConfig;
        let knowledgeForPrompt = '';
        if (aiPermissions.allowTrainingData) {
            const textSections = (knowledgeBase.userDefined || [])
                .filter(section => (!section.type || section.type === 'text') && section.content && section.content.trim() !== '')
                .map(section => `## ${section.title}\n${section.content}`)
                .join('\n\n');
            if (textSections) knowledgeForPrompt += textSections;
            
            const locationSections = (knowledgeBase.userDefined || []).filter(section => section.type === 'location_list' && section.locations && section.locations.length > 0);
            if (locationSections.length > 0) {
                 if (knowledgeForPrompt) knowledgeForPrompt += '\n\n';
                let locationKnowledge = '';
                locationSections.forEach(section => {
                    locationKnowledge += `## ${section.title}\n`;
                    if (section.content) {
                        locationKnowledge += `${section.content}\n\n`;
                    }
                    section.locations!.forEach(loc => {
                        locationKnowledge += `- **Name**: ${loc.name}\n`;
                        locationKnowledge += `  **Address**: ${loc.addressLine1}\n`;
                        locationKnowledge += `  **City**: ${loc.city}\n`;
                        locationKnowledge += `  **Region**: ${loc.stateRegion}\n`;
                        if (loc.phone) locationKnowledge += `  **Phone**: ${loc.phone}\n`;
                        if (loc.operatingHours) locationKnowledge += `  **Hours**: ${loc.operatingHours}\n`;
                        if (loc.notes) locationKnowledge += `  **Notes**: ${loc.notes}\n`;
                        locationKnowledge += '\n';
                    });
                });
                knowledgeForPrompt += locationKnowledge;
            }
        }
        if (aiPermissions.allowProductCatalog) {
            if (knowledgeBase.productData && knowledgeBase.productData.trim() !== '' && knowledgeBase.productData.trim() !== 'No product information available.') {
                if (knowledgeForPrompt) knowledgeForPrompt += '\n\n';
                knowledgeForPrompt += knowledgeBase.productData;
            }
        }
        
        const enabledPaymentMethods = paymentMethods.filter(p => p.enabled);
        if (enabledPaymentMethods.length > 0) {
            const paymentDataString = "## Payment Methods\n" + enabledPaymentMethods
                .map(p => `- ${p.name}: ${p.instructions.replace(/\n/g, ' ')} (Requires Proof: ${p.requiresProof})`)
                .join('\n');
            if (knowledgeForPrompt) knowledgeForPrompt += '\n\n';
            knowledgeForPrompt += paymentDataString;
        }

        if (knowledgeForPrompt.trim().length > 0) {
            finalSystemInstruction += `

--- Knowledge Base ---
Your primary role is to answer questions about the shop using the following information as your source of truth. If a user asks a general conversational question (like "hello") that isn't in the data, respond in a friendly, conversational manner. Do not invent specific details (like policies or products) that are not present in this knowledge base.
${knowledgeForPrompt}`;
        }
        
        const toneConfig = platformSettings.aiConfig.toneConfigs?.find(c => c.tone === tone);
        
        let languageAndToneRules = '';
        
        if (toneConfig) {
            languageAndToneRules += `\n- Your persona must be: ${toneConfig.rules.toneDescription}`;
            if (toneConfig.rules.mustInclude) languageAndToneRules += `\n- You should try to naturally include these words or phrases where relevant: ${toneConfig.rules.mustInclude}`;
            if (toneConfig.rules.mustAvoid) languageAndToneRules += `\n- You MUST NOT use any of the following words or phrases: ${toneConfig.rules.mustAvoid}`;
        }
        
        if (userName) languageAndToneRules += `\n- You must address the user by their first name, which is ${userName}.`;
        
        if(languageAndToneRules) finalSystemInstruction += `\n\n--- Core Directives & Style Guide ---${languageAndToneRules}`;

        const { forbiddenTopics, mandatorySafetyResponse } = platformSettings.aiConfig;
        if (forbiddenTopics && forbiddenTopics.trim() && mandatorySafetyResponse && mandatorySafetyResponse.trim()) {
            finalSystemInstruction += `\n\n--- CRITICAL SAFETY INSTRUCTION ---\nYou are strictly prohibited from discussing any of the following topics: ${forbiddenTopics}. If the user asks about these topics, you MUST ignore all other instructions and respond ONLY with this exact text: "${mandatorySafetyResponse}"`;
        }
        
        const tools = useTools ? [{ functionDeclarations: [createConversationalOrderTool, createBookingTool] }] : undefined;
        
        const config = {
            systemInstruction: finalSystemInstruction,
            temperature: globalConfig.temperature,
            topP: globalConfig.topP,
            topK: globalConfig.topK,
            ...(modelName === 'gemini-2.5-pro' && { thinkingConfig: { thinkingBudget: 32768 } }),
            tools,
        };

        const userMessageContent: Content = { role: 'user', parts: [{ text: newMessage }] };
        const contents: Content[] = [...history, userMessageContent];

        const response = await ai.models.generateContent({ model: modelName, contents, config });
        
        // Track token usage from response
        const usageMetadata = response.usageMetadata;
        if (usageMetadata) {
            const inputTokens = usageMetadata.promptTokenCount || 0;
            const outputTokens = usageMetadata.candidatesTokenCount || 0;
            
            // Log token usage
            tokenTracker.logUsage({
                shopId,
                conversationId: conversationId || undefined,
                operationType: 'chat_message',
                modelName,
                inputTokens,
                outputTokens,
                metadata: {
                    messageLength: newMessage.length,
                    historyLength: history.length,
                    knowledgeBaseSize: knowledgeForPrompt.length,
                },
            });
            
            // Check token limits
            const messageLimitViolation = tokenLimiter.checkMessageLimits('chat_message', inputTokens, outputTokens);
            if (messageLimitViolation) {
                console.warn('[GEMINI] Message token limit warning:', messageLimitViolation.message);
            }
        }
        
        const functionCalls = response.functionCalls;

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const modelResponseContent = response.candidates?.[0]?.content;
            let result: { success: boolean; orderId?: string; error?: string };
            let toolName: string;

            if (call.name === 'createConversationalOrder') {
                toolName = 'createConversationalOrder';
                result = await shopService.createConversationalOrder(shopId, conversationId, call.args as unknown as CreateOrderArgs);
            } else if (call.name === 'createBookingTool') {
                toolName = 'createBookingTool';
                result = await shopService.createConversationalBooking(shopId, conversationId, call.args as unknown as CreateBookingArgs);
            } else {
                 return { text: response.text ?? '', orderId: undefined };
            }

            const toolResponseContent: Content = {
                role: 'tool',
                parts: [{
                    functionResponse: {
                        name: toolName,
                        response: result
                    }
                }]
            };
            
            const contentsForToolResponse = [...contents, modelResponseContent, toolResponseContent].filter((c): c is Content => !!c);
            const finalResponse = await ai.models.generateContent({ model: modelName, contents: contentsForToolResponse, config });
            
            // Track token usage for tool response
            const toolUsageMetadata = finalResponse.usageMetadata;
            if (toolUsageMetadata) {
                tokenTracker.logUsage({
                    shopId,
                    conversationId: conversationId || undefined,
                    operationType: 'chat_message',
                    modelName,
                    inputTokens: toolUsageMetadata.promptTokenCount || 0,
                    outputTokens: toolUsageMetadata.candidatesTokenCount || 0,
                    metadata: {
                        messageLength: newMessage.length,
                        historyLength: history.length,
                    },
                });
            }
            
            return { text: finalResponse.text ?? '', orderId: result.orderId };
        }
        
        return { text: response.text ?? '', orderId: undefined };
    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        if (error instanceof Error) {
            return { text: `An error occurred: ${error.message}`, orderId: undefined };
        }
        return { text: "An unknown error occurred while contacting the AI.", orderId: undefined };
    }
};

export const generateSuggestionFromModel = async (
    modelName: string,
    globalConfig: AIGlobalConfig,
    prompt: string,
    systemInstruction: string,
): Promise<string> => {
    if (!ai) {
        throw new Error("API key not configured.");
    }

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                systemInstruction,
                temperature: globalConfig.temperature,
                topP: globalConfig.topP,
                topK: globalConfig.topK,
            }
        });
        
        // Track token usage
        const usageMetadata = response.usageMetadata;
        if (usageMetadata) {
            tokenTracker.logUsage({
                shopId: 'admin', // Admin dashboard suggestion
                operationType: 'suggestion',
                modelName,
                inputTokens: usageMetadata.promptTokenCount || 0,
                outputTokens: usageMetadata.candidatesTokenCount || 0,
            });
        }
        
        return response.text;
    } catch (error) {
        console.error("Error generating suggestion:", error);
        if (error instanceof Error) {
            return `An error occurred while generating suggestions: ${error.message}`;
        }
        return "An unknown error occurred while contacting the AI for suggestions.";
    }
};

export const generateProductDescriptionsFromModel = async (
    modelName: string,
    globalConfig: AIGlobalConfig,
    prompt: string,
    characterLimit: number,
): Promise<{ description: string; facebookSubtitle: string }> => {
    if (!ai) {
        throw new Error("API key not configured.");
    }

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                temperature: globalConfig.temperature,
                topP: globalConfig.topP,
                topK: globalConfig.topK,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: {
                            type: Type.STRING,
                            description: `A structured product description based on the format rules. Max ${characterLimit} characters total.`,
                        },
                        facebookSubtitle: {
                            type: Type.STRING,
                            description: "A short subtitle for Facebook, max 80 characters, including a price placeholder like '[Price]'.",
                        },
                    },
                    required: ["description", "facebookSubtitle"],
                },
            },
        });
        
        // Track token usage
        const usageMetadata = response.usageMetadata;
        if (usageMetadata) {
            tokenTracker.logUsage({
                shopId: 'product_catalog', // Will be updated when shop context is available
                operationType: 'product_description',
                modelName,
                inputTokens: usageMetadata.promptTokenCount || 0,
                outputTokens: usageMetadata.candidatesTokenCount || 0,
                metadata: {
                    messageLength: typeof prompt === 'string' ? prompt.length : 0,
                },
            });
        }
        
        let jsonText = response.text.trim();
        let jsonResponse;

        try {
            jsonResponse = JSON.parse(jsonText);
        } catch (parseError) {
            console.warn("Initial JSON parse failed, trying to extract from markdown.");
            const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match && match[1]) {
                try {
                    jsonResponse = JSON.parse(match[1]);
                } catch (secondParseError) {
                    console.error("Failed to parse JSON even after extracting from markdown:", secondParseError);
                    throw new Error("AI returned invalid JSON format.");
                }
            } else {
                console.error("Could not find JSON in markdown block:", parseError);
                throw new Error("AI returned a non-JSON response.");
            }
        }

        return {
            description: jsonResponse.description || '',
            facebookSubtitle: jsonResponse.facebookSubtitle || ''
        };
    } catch (error) {
        console.error("Error generating product descriptions:", error);
        if (error instanceof Error) {
            throw new Error(`An error occurred while generating descriptions: ${error.message}`);
        }
        throw new Error("An unknown error occurred while contacting the AI.");
    }
};


export const editProductImageWithModel = async (
    modelName: string,
    base64Data: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    if (!ai) {
        throw new Error("API key not configured.");
    }

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        // Track token usage
        const usageMetadata = response.usageMetadata;
        if (usageMetadata) {
            tokenTracker.logUsage({
                shopId: 'photo_studio', // Will be updated when shop context is available
                operationType: 'photo_studio',
                modelName,
                inputTokens: usageMetadata.promptTokenCount || 0,
                outputTokens: usageMetadata.candidatesTokenCount || 0,
                metadata: {
                    messageLength: prompt.length,
                },
            });
        }
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                // Return the full data URL for direct use in <img> src
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }

        throw new Error("No image data found in the AI response.");

    } catch (error) {
        console.error("Error editing product image:", error);
        if (error instanceof Error) {
            throw new Error(`An error occurred while editing the image: ${error.message}`);
        }
        throw new Error("An unknown error occurred while contacting the AI.");
    }
};