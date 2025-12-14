import express, { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import * as geminiService from '../services/geminiService';
import { getPlatformSettings } from '../services/platformSettingsService';
import crypto from 'crypto';

// Simple logger
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
};

const router: Router = express.Router();

// ============================================
// STRIPE WEBHOOK
// ============================================
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// ============================================
// PAYPAL WEBHOOK
// ============================================
router.post('/paypal', async (req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// ============================================
// FACEBOOK WEBHOOK - Verification
// ============================================
router.get('/facebook', async (req: Request, res: Response) => {
  try {
    const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'cliick_webhook_verify_token';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify the webhook
    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('Facebook webhook verified');
      res.status(200).send(challenge);
    } else {
      logger.error('Facebook webhook verification failed');
      res.sendStatus(403);
    }
  } catch (error) {
    logger.error('Facebook webhook verification error', error);
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// ============================================
// FACEBOOK WEBHOOK - Message Handler
// ============================================
router.post('/facebook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Verify webhook signature
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!verifyFacebookSignature(body, signature)) {
      logger.warn('Invalid Facebook webhook signature');
      return res.sendStatus(403);
    }

    // Only process page subscriptions
    if (body.object !== 'page') {
      logger.debug('Non-page webhook received, ignoring');
      return res.sendStatus(200);
    }

    // Process each entry
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.messaging && Array.isArray(entry.messaging)) {
          for (const event of entry.messaging) {
            await handleFacebookMessage(event);
          }
        }
      }
    }

    // Return 200 OK immediately (don't wait for processing)
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Facebook webhook handler error', error);
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function verifyFacebookSignature(body: any, signature: string): boolean {
  try {
    const appSecret = process.env.FACEBOOK_APP_SECRET || '';
    if (!appSecret) return false;

    const bodyString = JSON.stringify(body);
    const hash = crypto
      .createHmac('sha256', appSecret)
      .update(bodyString)
      .digest('hex');

    const expectedSignature = `sha256=${hash}`;
    return signature === expectedSignature;
  } catch (error) {
    logger.error('Facebook signature verification error', error);
    return false;
  }
}

async function handleFacebookMessage(event: any): Promise<void> {
  try {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const timestamp = event.timestamp;

    // Handle regular messages
    if (event.message) {
      const message = event.message;
      const messageText = message.text || '';

      if (!messageText.trim()) {
        logger.debug('Received empty message from Facebook');
        return;
      }

      logger.info(`Received Facebook message from ${senderId}: ${messageText}`);

      // Find the shop associated with this Facebook page
      const shop = await findShopByFacebookPageId(recipientId);
      if (!shop) {
        logger.warn(`No shop found for Facebook page ${recipientId}`);
        return;
      }

      // Get or create conversation
      const conversation = await getOrCreateFacebookConversation(shop.id, senderId);
      if (!conversation) {
        logger.error('Failed to create/get conversation');
        return;
      }

      // Generate AI response
      const response = await generateAIResponse(shop, messageText, senderId);
      if (!response) {
        logger.error('Failed to generate AI response');
        return;
      }

      // Send response back to Facebook
      await sendFacebookMessage(senderId, response);

      // Log the conversation
      await logFacebookMessage(shop.id, conversation.id, messageText, 'user', senderId);
      await logFacebookMessage(shop.id, conversation.id, response, 'ai', 'bot');
    }

    // Handle postbacks (quick replies)
    if (event.postback) {
      const payload = event.postback?.payload;
      logger.info(`Received Facebook postback from ${senderId}: ${payload}`);
      // Similar processing as message
      await handleFacebookMessage({ ...event, message: { text: payload } });
    }
  } catch (error) {
    logger.error('Error handling Facebook message', error);
  }
}

async function findShopByFacebookPageId(pageId: string): Promise<any> {
  try {
    // Query shops to find one connected to this Facebook page ID
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('facebook_page_id', pageId)
      .single();

    if (error || !data) {
      logger.warn(`Shop not found for Facebook page ${pageId}`);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error finding shop by Facebook page ID', error);
    return null;
  }
}

async function getOrCreateFacebookConversation(
  shopId: string,
  facebookSenderId: string
): Promise<any> {
  try {
    // Try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from('live_conversations')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', `fb_${facebookSenderId}`)
      .eq('channel', 'facebook')
      .single();

    if (existing && !findError) {
      return existing;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('live_conversations')
      .insert([
        {
          shop_id: shopId,
          customer_id: `fb_${facebookSenderId}`,
          channel: 'facebook',
          customer_name: `Facebook User ${facebookSenderId.substring(0, 8)}`,
          status: 'open',
          is_ai_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (createError) {
      logger.error('Error creating conversation', createError);
      return null;
    }

    return newConv;
  } catch (error) {
    logger.error('Error in getOrCreateFacebookConversation', error);
    return null;
  }
}

async function generateAIResponse(shop: any, message: string, senderId: string): Promise<string | null> {
  try {
    const settings = await getPlatformSettings();
    const { globalModelConfig, modelAssignments } = settings.aiConfig;
    const modelConfig = modelAssignments.generalChatStandard;

    if (!modelConfig || modelConfig.provider !== 'Google Gemini') {
      logger.error('Invalid model configuration');
      return null;
    }

    // Build chat history from shop's chat history
    const history = shop.chatHistory || [];

    // Generate response using Gemini
    const response = await geminiService.generateChatResponse(
      shop.id,
      `fb_conv_${senderId}`,
      modelConfig.modelName,
      globalModelConfig,
      history,
      message,
      shop.assistantConfig,
      shop.knowledgeBase || { systemPrompt: '', userDefined: [] },
      'en',
      shop.assistantConfig.tone || 'professional',
      shop.paymentMethods || []
    );

    return response.text;
  } catch (error) {
    logger.error('Error generating AI response', error);
    return null;
  }
}

async function sendFacebookMessage(recipientId: string, messageText: string): Promise<boolean> {
  try {
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageAccessToken) {
      logger.error('Facebook page access token not configured');
      return false;
    }

    const response = await fetch('https://graph.instagram.com/v18.0/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_type: 'RESPONSE',
        recipient: { id: recipientId },
        message: { text: messageText },
        access_token: pageAccessToken,
      }),
    });

    if (!response.ok) {
      logger.error(
        `Failed to send Facebook message: ${response.status} ${await response.text()}`
      );
      return false;
    }

    logger.info(`Facebook message sent to ${recipientId}`);
    return true;
  } catch (error) {
    logger.error('Error sending Facebook message', error);
    return false;
  }
}

async function logFacebookMessage(
  shopId: string,
  conversationId: string,
  text: string,
  sender: 'user' | 'ai',
  senderId: string
): Promise<void> {
  try {
    const { error } = await supabase.from('live_messages').insert([
      {
        conversation_id: conversationId,
        sender,
        sender_id: senderId,
        text,
        channel: 'facebook',
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      logger.error('Error logging Facebook message', error);
    }
  } catch (error) {
    logger.error('Error in logFacebookMessage', error);
  }
}

module.exports = router;
