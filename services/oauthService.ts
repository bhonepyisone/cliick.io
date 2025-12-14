/**
 * OAuth Service - Social Media Integration
 * Handles OAuth flows for Facebook, Instagram, TikTok, Telegram, Viber
 */

interface OAuthConfig {
    clientId: string;
    redirectUri: string;
    scope: string[];
}

interface OAuthProvider {
    name: string;
    authUrl: string;
    tokenUrl: string;
    config: OAuthConfig;
}

class OAuthService {
    private providers: Map<string, OAuthProvider> = new Map();
    private popupWindow: Window | null = null;
    private readonly POPUP_WIDTH = 600;
    private readonly POPUP_HEIGHT = 700;

    constructor() {
        this.initializeProviders();
    }

    /**
     * Initialize OAuth providers with configuration
     */
    private initializeProviders(): void {
        // Facebook OAuth
        this.providers.set('facebook', {
            name: 'Facebook',
            authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
            tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
            config: {
                clientId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
                redirectUri: `${window.location.origin}/oauth/facebook/callback`,
                scope: ['pages_manage_metadata', 'pages_messaging', 'pages_read_engagement'],
            },
        });

        // Instagram OAuth (via Facebook)
        this.providers.set('instagram', {
            name: 'Instagram',
            authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
            tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
            config: {
                clientId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
                redirectUri: `${window.location.origin}/oauth/instagram/callback`,
                scope: ['instagram_basic', 'instagram_manage_messages', 'pages_show_list'],
            },
        });

        // TikTok OAuth
        this.providers.set('tiktok', {
            name: 'TikTok',
            authUrl: 'https://www.tiktok.com/v2/auth/authorize',
            tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token',
            config: {
                clientId: import.meta.env.VITE_TIKTOK_CLIENT_KEY || '',
                redirectUri: `${window.location.origin}/oauth/tiktok/callback`,
                scope: ['user.info.basic', 'video.list'],
            },
        });

        // Telegram OAuth
        this.providers.set('telegram', {
            name: 'Telegram',
            authUrl: 'https://oauth.telegram.org/auth',
            tokenUrl: 'https://oauth.telegram.org/auth/token',
            config: {
                clientId: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
                redirectUri: `${window.location.origin}/oauth/telegram/callback`,
                scope: ['bot'],
            },
        });

        // Viber OAuth
        this.providers.set('viber', {
            name: 'Viber',
            authUrl: 'https://partners.viber.com/oauth2/authorize',
            tokenUrl: 'https://partners.viber.com/oauth2/token',
            config: {
                clientId: import.meta.env.VITE_VIBER_BOT_ID || '',
                redirectUri: `${window.location.origin}/oauth/viber/callback`,
                scope: ['bot_messages'],
            },
        });
    }

    /**
     * Start OAuth flow for a provider
     */
    async connect(platform: string, shopId: string): Promise<{ success: boolean; error?: string }> {
        const provider = this.providers.get(platform);
        
        if (!provider) {
            return { success: false, error: `Unknown provider: ${platform}` };
        }

        if (!provider.config.clientId) {
            return { success: false, error: `${provider.name} client ID not configured` };
        }

        try {
            const authUrl = this.buildAuthUrl(platform, provider, shopId);
            const authCode = await this.openOAuthPopup(authUrl, provider.name);

            if (!authCode) {
                return { success: false, error: 'Authorization cancelled' };
            }

            // Exchange code for token via backend
            const response = await fetch(`/api/shops/${shopId}/integrations/${platform}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: authCode }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error || 'Connection failed' };
            }

            return { success: true };
        } catch (error: any) {
            console.error(`OAuth error for ${platform}:`, error);
            return { success: false, error: error.message || 'OAuth flow failed' };
        }
    }

    /**
     * Build OAuth authorization URL
     */
    private buildAuthUrl(platform: string, provider: OAuthProvider, shopId: string): string {
        const params = new URLSearchParams({
            client_id: provider.config.clientId,
            redirect_uri: provider.config.redirectUri,
            response_type: 'code',
            scope: provider.config.scope.join(','),
            state: this.generateState(shopId, platform),
        });

        return `${provider.authUrl}?${params.toString()}`;
    }

    /**
     * Generate CSRF protection state parameter
     */
    private generateState(shopId: string, platform: string): string {
        const state = {
            shopId,
            platform,
            timestamp: Date.now(),
            nonce: Math.random().toString(36).substring(7),
        };
        return btoa(JSON.stringify(state));
    }

    /**
     * Open OAuth popup window
     */
    private openOAuthPopup(url: string, providerName: string): Promise<string | null> {
        return new Promise((resolve) => {
            const left = window.screenX + (window.outerWidth - this.POPUP_WIDTH) / 2;
            const top = window.screenY + (window.outerHeight - this.POPUP_HEIGHT) / 2;

            this.popupWindow = window.open(
                url,
                `${providerName} OAuth`,
                `width=${this.POPUP_WIDTH},height=${this.POPUP_HEIGHT},left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0`
            );

            if (!this.popupWindow) {
                resolve(null);
                return;
            }

            // Listen for OAuth callback message
            const messageHandler = (event: MessageEvent) => {
                // Verify origin
                if (event.origin !== window.location.origin) {
                    return;
                }

                if (event.data.type === 'oauth_callback') {
                    window.removeEventListener('message', messageHandler);
                    this.popupWindow?.close();
                    resolve(event.data.code || null);
                }
            };

            window.addEventListener('message', messageHandler);

            // Check if popup was closed manually
            const checkClosed = setInterval(() => {
                if (this.popupWindow?.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    resolve(null);
                }
            }, 500);
        });
    }

    /**
     * Disconnect from a social media platform
     */
    async disconnect(platform: string, shopId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`/api/shops/${shopId}/integrations/${platform}/disconnect`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                const data = await response.json();
                return { success: false, error: data.error || 'Disconnection failed' };
            }

            return { success: true };
        } catch (error: any) {
            console.error(`Disconnect error for ${platform}:`, error);
            return { success: false, error: error.message || 'Disconnection failed' };
        }
    }

    /**
     * Get OAuth provider info
     */
    getProvider(platform: string): OAuthProvider | undefined {
        return this.providers.get(platform);
    }

    /**
     * Check if a provider is configured
     */
    isConfigured(platform: string): boolean {
        const provider = this.providers.get(platform);
        return provider ? !!provider.config.clientId : false;
    }
}

// Export singleton instance
export const oauthService = new OAuthService();
export default oauthService;
