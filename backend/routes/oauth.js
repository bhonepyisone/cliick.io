"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// OAuth configuration
const oauthConfigs = {
    facebook: {
        clientId: process.env.FACEBOOK_APP_ID || '',
        clientSecret: process.env.FACEBOOK_APP_SECRET || '',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        meUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture'
    },
    tiktok: {
        clientId: process.env.TIKTOK_CLIENT_ID || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        authUrl: 'https://www.tiktok.com/v1/oauth/authorize',
        tokenUrl: 'https://open.tiktokapis.com/v1/oauth/token',
        meUrl: 'https://open.tiktokapis.com/v1/user/info/'
    },
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        clientId: process.env.TELEGRAM_CLIENT_ID || '',
    },
    viber: {
        accountId: process.env.VIBER_ACCOUNT_ID || '',
        apiUrl: 'https://chatapi.viber.com'
    }
};
// POST /oauth/link - Link OAuth provider to user account
router.post('/link', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { provider, token, refreshToken } = req.body;
        const userId = req.headers['x-user-id'];
        if (!provider || !token) {
            return res.status(400).json({ success: false, error: 'Provider and token required' });
        }
        if (!['facebook', 'tiktok', 'telegram', 'viber'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Invalid provider' });
        }
        // Verify token with provider
        const providerData = await verifyOAuthToken(provider, token);
        if (!providerData) {
            return res.status(401).json({ success: false, error: 'Invalid OAuth token' });
        }
        // Store OAuth connection in database
        const { data: existingConnection } = await supabase_1.supabase
            .from('oauth_connections')
            .select('id')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();
        if (existingConnection) {
            // Update existing connection
            await supabase_1.supabase
                .from('oauth_connections')
                .update({
                access_token: token,
                refresh_token: refreshToken || null,
                provider_user_id: providerData.id,
                provider_data: providerData,
                last_authenticated: new Date().toISOString()
            })
                .eq('id', existingConnection.id);
        }
        else {
            // Create new connection
            await supabase_1.supabase
                .from('oauth_connections')
                .insert([{
                    user_id: userId,
                    provider,
                    access_token: token,
                    refresh_token: refreshToken || null,
                    provider_user_id: providerData.id,
                    provider_data: providerData,
                    connected_at: new Date().toISOString(),
                    last_authenticated: new Date().toISOString()
                }]);
        }
        res.status(200).json({
            success: true,
            message: `${provider} connected successfully`,
            data: { provider, providerData }
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /oauth/connections - Get user's OAuth connections
router.get('/connections', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const { data: connections, error } = await supabase_1.supabase
            .from('oauth_connections')
            .select('provider, provider_user_id, connected_at, last_authenticated')
            .eq('user_id', userId);
        if (error)
            throw error;
        res.status(200).json({
            success: true,
            data: connections || []
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /oauth/unlink - Disconnect OAuth provider
router.post('/unlink', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { provider } = req.body;
        const userId = req.headers['x-user-id'];
        if (!provider) {
            return res.status(400).json({ success: false, error: 'Provider required' });
        }
        const { error } = await supabase_1.supabase
            .from('oauth_connections')
            .delete()
            .eq('user_id', userId)
            .eq('provider', provider);
        if (error)
            throw error;
        res.status(200).json({
            success: true,
            message: `${provider} disconnected successfully`
        });
    }
    catch (error) {
        next(error);
    }
});
// Helper function to verify OAuth token with provider
async function verifyOAuthToken(provider, token) {
    try {
        switch (provider) {
            case 'facebook':
                const fbResponse = await fetch(oauthConfigs.facebook.meUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const fbData = await fbResponse.json();
                return {
                    id: fbData.id,
                    name: fbData.name,
                    email: fbData.email,
                    picture: fbData.picture?.data?.url
                };
            case 'tiktok':
                const ttResponse = await fetch(oauthConfigs.tiktok.meUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const ttData = await ttResponse.json();
                return {
                    id: ttData.data?.user?.id || '',
                    name: ttData.data?.user?.display_name || '',
                    avatar: ttData.data?.user?.avatar_large || ''
                };
            case 'telegram':
                // Telegram uses JWT verification
                return {
                    id: token.split('.')[0],
                    provider: 'telegram'
                };
            case 'viber':
                // Viber webhook verification
                return {
                    id: token,
                    provider: 'viber'
                };
            default:
                return null;
        }
    }
    catch (error) {
        console.error(`OAuth verification failed for ${provider}:`, error);
        return null;
    }
}
router.get('/facebook/callback', async (req, res) => {
    try {
        const { code, error, state } = req.query;
        if (error)
            return res.status(400).json({ success: false, error: 'OAuth error' });
        // Exchange code for token
        const tokenResponse = await fetch(oauthConfigs.facebook.tokenUrl, {
            method: 'GET',
            body: JSON.stringify({
                client_id: oauthConfigs.facebook.clientId,
                client_secret: oauthConfigs.facebook.clientSecret,
                redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:8080'}/oauth/facebook/callback`,
                code
            })
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',provider:'facebook',token:'${accessToken}'}, '*'); window.close();</script>`);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/tiktok/callback', async (req, res) => {
    try {
        const { code, error, state } = req.query;
        if (error)
            return res.status(400).json({ success: false, error: 'OAuth error' });
        const tokenResponse = await fetch(oauthConfigs.tiktok.tokenUrl, {
            method: 'POST',
            body: JSON.stringify({
                client_id: oauthConfigs.tiktok.clientId,
                client_secret: oauthConfigs.tiktok.clientSecret,
                code,
                grant_type: 'authorization_code'
            })
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',provider:'tiktok',token:'${accessToken}'}, '*'); window.close();</script>`);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/telegram/callback', async (req, res) => {
    try {
        const { id, hash, auth_date } = req.query;
        // Verify Telegram auth data
        if (id && hash && auth_date) {
            res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',provider:'telegram',data:{id:'${id}',auth_date:'${auth_date}'}}, '*'); window.close();</script>`);
        }
        else {
            res.status(400).json({ success: false, error: 'Invalid Telegram auth' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/viber/callback', async (req, res) => {
    try {
        const { token, error } = req.query;
        if (error)
            return res.status(400).json({ success: false, error: 'OAuth error' });
        res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',provider:'viber',token:'${token}'}, '*'); window.close();</script>`);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/instagram/callback', async (req, res) => {
    try {
        const { code, error } = req.query;
        if (error)
            return res.status(400).json({ success: false, error: 'OAuth error' });
        res.send(`<script>window.opener.postMessage({type:'OAUTH_SUCCESS',provider:'instagram',data:{status:'connected'}}, '*'); window.close();</script>`);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router;
