"use strict";
/**
 * API Client - Abstraction layer for backend API calls
 * This replaces localStorage with actual HTTP requests to backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = void 0;
const csrf_1 = require("../utils/csrf");
const authService_1 = require("./authService");
// API Configuration - determined at runtime
function getApiBaseUrl() {
    // Check if running in browser with env var
    if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
        return window.__API_BASE_URL__;
    }
    // Check Vite env var at build time
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }
    // Production fallback
    return 'https://cliick-backend-896324541174.us-central1.run.app/api';
}
const API_BASE_URL = getApiBaseUrl();
const API_TIMEOUT = 30000; // 30 seconds
class ApiClient {
    constructor(baseUrl = API_BASE_URL, timeout = API_TIMEOUT) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }
    /**
     * Generic HTTP request handler with timeout and CSRF protection
     */
    async request(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const method = options.method?.toUpperCase() || 'GET';
        const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
        let headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        // Add auth token if available
        const authToken = (0, authService_1.getAuthToken)();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        // Add CSRF token for state-changing operations
        if (isStateChanging) {
            headers = (0, csrf_1.addCsrfToHeaders)(headers);
        }
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                signal: controller.signal,
                headers,
                credentials: 'include', // Include cookies for authentication
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}: ${response.statusText}`,
                };
            }
            // Backend returns { success: true, data: {...} }
            // Extract the inner data object
            return {
                success: data.success !== false,
                data: data.data,
                error: data.error,
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timeout',
                };
            }
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }
    // ============================================
    // SHOP MANAGEMENT
    // ============================================
    async getShops() {
        return this.request('/shops');
    }
    async getShop(shopId) {
        return this.request(`/shops/${shopId}`);
    }
    async updateShop(shopId, updates) {
        return this.request(`/shops/${shopId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }
    async createShop(shop) {
        return this.request('/shops', {
            method: 'POST',
            body: JSON.stringify(shop),
        });
    }
    async upgradeSubscription(shopId, plan, status) {
        return this.request(`/shops/${shopId}/upgrade`, {
            method: 'POST',
            body: JSON.stringify({ subscription_plan: plan, subscription_status: status }),
        });
    }
    // ============================================
    // PRODUCTS
    // ============================================
    async getProducts(shopId) {
        return this.request(`/shops/${shopId}/products`);
    }
    async createProduct(shopId, product) {
        return this.request(`/shops/${shopId}/products`, {
            method: 'POST',
            body: JSON.stringify(product),
        });
    }
    async updateProduct(shopId, productId, updates) {
        return this.request(`/shops/${shopId}/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }
    async deleteProduct(shopId, productId) {
        return this.request(`/shops/${shopId}/products/${productId}`, {
            method: 'DELETE',
        });
    }
    // ============================================
    // LIVE CHAT & CONVERSATIONS
    // ============================================
    async getConversations(shopId) {
        return this.request(`/shops/${shopId}/conversations`);
    }
    async getConversation(shopId, conversationId) {
        return this.request(`/shops/${shopId}/conversations/${conversationId}`);
    }
    async updateConversation(shopId, conversationId, updates) {
        return this.request(`/shops/${shopId}/conversations/${conversationId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }
    async sendMessage(shopId, conversationId, message) {
        return this.request(`/shops/${shopId}/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify(message),
        });
    }
    // ============================================
    // ORDERS & FORM SUBMISSIONS
    // ============================================
    async getOrders(shopId) {
        return this.request(`/shops/${shopId}/orders`);
    }
    async getOrder(shopId, orderId) {
        return this.request(`/shops/${shopId}/orders/${orderId}`);
    }
    async updateOrderStatus(shopId, orderId, status) {
        return this.request(`/shops/${shopId}/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    }
    // ============================================
    // FORMS
    // ============================================
    async getForms(shopId) {
        return this.request(`/shops/${shopId}/forms`);
    }
    async createForm(shopId, form) {
        return this.request(`/shops/${shopId}/forms`, {
            method: 'POST',
            body: JSON.stringify(form),
        });
    }
    async updateForm(shopId, formId, updates) {
        return this.request(`/shops/${shopId}/forms/${formId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }
    // ============================================
    // AUTHENTICATION
    // ============================================
    async register(email, password, username) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, username }),
        });
    }
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }
    async logout() {
        return this.request('/auth/logout', {
            method: 'POST',
        });
    }
    async getCurrentUser() {
        return this.request('/auth/me');
    }
    // ============================================
    // SOCIAL MEDIA INTEGRATIONS
    // ============================================
    async connectSocialMedia(shopId, platform, code) {
        return this.request(`/shops/${shopId}/integrations/${platform}/connect`, {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }
    async disconnectSocialMedia(shopId, platform) {
        return this.request(`/shops/${shopId}/integrations/${platform}/disconnect`, {
            method: 'POST',
        });
    }
    // ============================================
    // PAYMENTS
    // ============================================
    async createPaymentIntent(shopId, orderId, amount) {
        return this.request(`/shops/${shopId}/payments/intent`, {
            method: 'POST',
            body: JSON.stringify({ orderId, amount }),
        });
    }
    async confirmPayment(shopId, paymentIntentId) {
        return this.request(`/shops/${shopId}/payments/confirm`, {
            method: 'POST',
            body: JSON.stringify({ paymentIntentId }),
        });
    }
}
// Export singleton instance
exports.apiClient = new ApiClient();
exports.default = exports.apiClient;
