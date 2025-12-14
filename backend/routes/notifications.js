"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router({ mergeParams: true });
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
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const userId = req.headers['x-user-id'];
        const { data: preferences, error } = await supabase_1.supabase
            .from('notification_preferences')
            .select('*')
            .eq('shop_id', shopId)
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        res.status(200).json({
            success: true,
            data: preferences || {
                email_enabled: true,
                sms_enabled: false,
                push_enabled: true,
                webhook_enabled: false
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /shops/:shopId/notifications/preferences - Set notification preferences
router.post('/preferences', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { email_enabled, sms_enabled, push_enabled, webhook_enabled, webhook_url } = req.body;
        const userId = req.headers['x-user-id'];
        // Validate webhook URL if webhook is enabled
        if (webhook_enabled && webhook_url) {
            try {
                new URL(webhook_url);
            }
            catch {
                return res.status(400).json({ success: false, error: 'Invalid webhook URL' });
            }
        }
        const { data, error } = await supabase_1.supabase
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
        if (error)
            throw error;
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
// POST /shops/:shopId/notifications/send - Send notification
router.post('/send', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { recipient, subject, message, channels, data } = req.body;
        const userId = req.headers['x-user-id'];
        // Validate required fields
        if (!recipient || !subject || !message) {
            return res.status(400).json({ success: false, error: 'Recipient, subject, and message required' });
        }
        const notificationChannels = channels || ['email'];
        const results = {};
        // Get user preferences
        const { data: preferences } = await supabase_1.supabase
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
                        }
                        else {
                            result = { success: false, reason: 'Email disabled in preferences' };
                        }
                        break;
                    case 'sms':
                        if (preferences?.sms_enabled) {
                            result = await sendSMSNotification(recipient, message);
                        }
                        else {
                            result = { success: false, reason: 'SMS disabled in preferences' };
                        }
                        break;
                    case 'push':
                        if (preferences?.push_enabled ?? true) {
                            result = await sendPushNotification(recipient, subject, message, data);
                        }
                        else {
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
                        }
                        else {
                            result = { success: false, reason: 'Webhook disabled or no URL configured' };
                        }
                        break;
                    default:
                        result = { success: false, reason: 'Unknown channel' };
                }
                results[channel] = result;
            }
            catch (error) {
                results[channel] = { success: false, error: error.message };
            }
        }
        // Store notification log
        await supabase_1.supabase.from('notification_logs').insert([{
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
            success: Object.values(results).some((r) => r.success),
            results
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /shops/:shopId/notifications/logs - Get notification logs
router.get('/logs', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const { data, count, error } = await supabase_1.supabase
            .from('notification_logs')
            .select('*', { count: 'exact' })
            .eq('shop_id', shopId)
            .order('sent_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error)
            throw error;
        res.status(200).json({
            success: true,
            data: data || [],
            pagination: { limit: Number(limit), offset: Number(offset), total: count }
        });
    }
    catch (error) {
        next(error);
    }
});
// Helper functions for sending notifications
async function sendEmailNotification(recipient, subject, message, data) {
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
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
async function sendSMSNotification(phoneNumber, message) {
    try {
        // Twilio API implementation
        const auth = Buffer.from(`${notificationConfig.sms.accountSid}:${notificationConfig.sms.authToken}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${notificationConfig.sms.accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `From=${notificationConfig.sms.fromNumber}&To=${phoneNumber}&Body=${encodeURIComponent(message)}`
        });
        if (response.ok) {
            return { success: true, provider: 'twilio' };
        }
        return { success: false, error: await response.text() };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
async function sendPushNotification(deviceToken, title, message, data) {
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
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
async function sendWebhookNotification(webhookUrl, payload) {
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
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
module.exports = router;
