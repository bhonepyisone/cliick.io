import express, { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router: Router = express.Router({ mergeParams: true });

// Notification types
type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook';

// Configuration for notification services
const notificationConfig = {
  email: {
    service: process.env.EMAIL_SERVICE || 'sendgrid',
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@cliick.io'
  },
  sms: {
    service: process.env.SMS_SERVICE || 'twilio',
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || ''
  },
  push: {
    service: process.env.PUSH_SERVICE || 'firebase',
    apiKey: process.env.FIREBASE_API_KEY || ''
  }
};

// GET /shops/:shopId/notifications - Get notification preferences
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const userId = (req as any).headers['x-user-id'];

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('shop_id', shopId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.status(200).json({
      success: true,
      data: preferences || {
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        webhook_enabled: false
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /shops/:shopId/notifications/preferences - Set notification preferences
router.post('/preferences', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { email_enabled, sms_enabled, push_enabled, webhook_enabled, webhook_url } = req.body;
    const userId = (req as any).headers['x-user-id'];

    // Validate webhook URL if webhook is enabled
    if (webhook_enabled && webhook_url) {
      try {
        new URL(webhook_url);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid webhook URL' });
      }
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert([
        {
          shop_id: shopId,
          user_id: userId,
          email_enabled: email_enabled ?? true,
          sms_enabled: sms_enabled ?? false,
          push_enabled: push_enabled ?? true,
          webhook_enabled: webhook_enabled ?? false,
          webhook_url: webhook_url || null,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// POST /shops/:shopId/notifications/send - Send notification
router.post('/send', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { recipient, subject, message, channels, data } = req.body;
    const userId = (req as any).headers['x-user-id'];

    // Validate required fields
    if (!recipient || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Recipient, subject, and message required' });
    }

    const notificationChannels: NotificationChannel[] = channels || ['email'];
    const results: any = {};

    // Get user preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('shop_id', shopId)
      .eq('user_id', userId)
      .single();

    // Send through each enabled channel
    for (const channel of notificationChannels) {
      try {
        let result;
        switch (channel) {
          case 'email':
            if (preferences?.email_enabled ?? true) {
              result = await sendEmailNotification(recipient, subject, message, data);
            } else {
              result = { success: false, reason: 'Email disabled in preferences' };
            }
            break;

          case 'sms':
            if (preferences?.sms_enabled) {
              result = await sendSMSNotification(recipient, message);
            } else {
              result = { success: false, reason: 'SMS disabled in preferences' };
            }
            break;

          case 'push':
            if (preferences?.push_enabled ?? true) {
              result = await sendPushNotification(recipient, subject, message, data);
            } else {
              result = { success: false, reason: 'Push disabled in preferences' };
            }
            break;

          case 'webhook':
            if (preferences?.webhook_enabled && preferences?.webhook_url) {
              result = await sendWebhookNotification(preferences.webhook_url, {
                subject,
                message,
                data,
                timestamp: new Date().toISOString()
              });
            } else {
              result = { success: false, reason: 'Webhook disabled or no URL configured' };
            }
            break;

          default:
            result = { success: false, reason: 'Unknown channel' };
        }
        results[channel] = result;
      } catch (error) {
        results[channel] = { success: false, error: (error as any).message };
      }
    }

    // Store notification log
    await supabase.from('notification_logs').insert([{
      shop_id: shopId,
      user_id: userId,
      recipient,
      subject,
      message,
      channels: notificationChannels,
      results,
      sent_at: new Date().toISOString()
    }]);

    res.status(200).json({
      success: Object.values(results).some((r: any) => r.success),
      results
    });
  } catch (error) {
    next(error);
  }
});

// GET /shops/:shopId/notifications/logs - Get notification logs
router.get('/logs', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopId } = req.params as any;
    const { limit = 50, offset = 0 } = req.query as any;

    const { data, count, error } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data || [],
      pagination: { limit: Number(limit), offset: Number(offset), total: count }
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions for sending notifications

async function sendEmailNotification(recipient: string, subject: string, message: string, data?: any): Promise<any> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notificationConfig.email.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: recipient }],
          subject
        }],
        from: { email: notificationConfig.email.fromEmail },
        content: [{ type: 'text/html', value: message }]
      })
    });

    if (response.ok) {
      return { success: true, provider: 'sendgrid' };
    }
    return { success: false, error: await response.text() };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
}

async function sendSMSNotification(phoneNumber: string, message: string): Promise<any> {
  try {
    // Twilio API implementation
    const auth = Buffer.from(`${notificationConfig.sms.accountSid}:${notificationConfig.sms.authToken}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${notificationConfig.sms.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `From=${notificationConfig.sms.fromNumber}&To=${phoneNumber}&Body=${encodeURIComponent(message)}`
      }
    );

    if (response.ok) {
      return { success: true, provider: 'twilio' };
    }
    return { success: false, error: await response.text() };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
}

async function sendPushNotification(deviceToken: string, title: string, message: string, data?: any): Promise<any> {
  try {
    // Firebase Cloud Messaging implementation
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${notificationConfig.push.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: deviceToken,
        notification: { title, body: message },
        data: data || {}
      })
    });

    if (response.ok) {
      return { success: true, provider: 'firebase' };
    }
    return { success: false, error: await response.text() };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
}

async function sendWebhookNotification(webhookUrl: string, payload: any): Promise<any> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return { success: true, webhookUrl };
    }
    return { success: false, error: await response.text() };
  } catch (error) {
    return { success: false, error: (error as any).message };
  }
}

module.exports = router;
