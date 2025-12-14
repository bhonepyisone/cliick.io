// supabase/functions/generate-chat-response/index.ts
// NOTE: This code runs on Supabase's servers, not in the browser.

import { GoogleGenAI, FunctionDeclaration, Type, Content } from "npm:@google/genai";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CreateOrderArgs, CreateBookingArgs } from '../../../types.ts';

// These definitions must be kept in sync with the frontend versions
const createConversationalOrderTool: FunctionDeclaration = {
  name: 'createConversationalOrder',
  description: 'Creates a customer order for physical products when all necessary information has been collected AND the user has explicitly confirmed the order details. Only use this for items with an itemType of "product".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: 'The full name of the customer placing the order.' },
      phoneNumber: { type: Type.STRING, description: 'The contact phone number for the customer.' },
      shippingAddress: { type: Type.STRING, description: 'The full shipping address, including street, city, and any other relevant details.' },
      products: {
        type: Type.ARRAY,
        description: 'An array of products the customer wants to order.',
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'The name of the product. Must match a product name from the provided item catalog.' },
            quantity: { type: Type.INTEGER, description: 'The quantity of this product to order.' },
          },
          required: ['productName', 'quantity'],
        },
      },
      paymentMethod: { type: Type.STRING, description: "The payment method chosen by the customer. This must match one of the payment methods from the 'Payment Methods' knowledge base section." }
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: Cast `Deno` to `any` to resolve type errors in local environments that may not have Deno types configured.
// The `Deno` global object is available in the Supabase Edge Function runtime.
(Deno as any).serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      history, 
      newMessage, 
      assistantConfig, 
      knowledgeBase, 
      shopId
    } = await req.json();

    // FIX: Cast `Deno` to `any` to resolve type errors.
    const geminiApiKey = (Deno as any).env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response("Missing Gemini API key", { status: 500, headers: corsHeaders });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // --- Placeholder for full prompt engineering ---
    // A real implementation would fetch platform/shop settings from the DB
    // to build the complex, layered prompt like in geminiService.ts.
    let systemInstruction = assistantConfig.systemPrompt || 'You are a helpful AI assistant.';
    if (knowledgeBase.productData) {
      systemInstruction += `\n\n--- Knowledge Base ---\n${knowledgeBase.productData}`;
    }

    const tools = [{ functionDeclarations: [createConversationalOrderTool, createBookingTool] }];
    const userMessageContent: Content = { role: 'user', parts: [{ text: newMessage }] };
    const contents: Content[] = [...history, userMessageContent];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // This could be dynamic based on assistantConfig
      contents,
      config: {
        systemInstruction,
        tools,
      },
    });

    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      // In a real application, you would initialize the Supabase admin client here
      // and call a database function (RPC) to execute the order and update inventory atomically.
      // const supabaseAdmin = createClient((Deno as any).env.get("SUPABASE_URL")!, (Deno as any).env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      // const { data, error } = await supabaseAdmin.rpc('create_order_and_update_stock', { args });

      // For this preparation step, we'll mock the tool response.
      const toolResponseContent: Content = {
        role: 'tool',
        parts: [{
          functionResponse: {
            name: functionCalls[0].name,
            response: { success: true, orderId: `MOCK-${Date.now().toString().slice(-4)}` }
          }
        }]
      };

      const modelResponseContent = response.candidates?.[0]?.content;
      if (!modelResponseContent) {
          throw new Error("No content from model to continue function call");
      }

      const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [...contents, modelResponseContent, toolResponseContent],
        config: { systemInstruction, tools }
      });

      return new Response(JSON.stringify({ text: finalResponse.text ?? '', orderId: `MOCK-${Date.now().toString().slice(-4)}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text: response.text ?? '', orderId: undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(error.message, { status: 500, headers: corsHeaders });
  }
});
