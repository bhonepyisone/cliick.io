/**
 * API Client - Abstraction layer for backend API calls
 * This replaces localStorage with actual HTTP requests to backend
 */

import { Shop, User, Form, LiveChatConversation, FormSubmission, Item } from '../types';
import { addCsrfToHeaders } from '../utils/csrf';
import { getAuthToken } from './authService';

// API Configuration - determined at runtime
function getApiBaseUrl(): string {
    // Check if running in browser with env var
    if (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) {
        return (window as any).__API_BASE_URL__;
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

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

class ApiClient {
    private baseUrl: string;
    private timeout: number;

    constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }

    /**
     * Generic HTTP request handler with timeout and CSRF protection
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const method = options.method?.toUpperCase() || 'GET';
        const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
        
        let headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        
        // Add auth token if available
        const authToken = getAuthToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Add CSRF token for state-changing operations
        if (isStateChanging) {
            headers = addCsrfToHeaders(headers);
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
        } catch (error: any) {
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

    async getShops(): Promise<ApiResponse<Shop[]>> {
        return this.request<Shop[]>('/shops');
    }

    async getShop(shopId: string): Promise<ApiResponse<Shop>> {
        return this.request<Shop>(`/shops/${shopId}`);
    }

    async updateShop(shopId: string, updates: Partial<Shop>): Promise<ApiResponse<Shop>> {
        return this.request<Shop>(`/shops/${shopId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async createShop(shop: Omit<Shop, 'id'>): Promise<ApiResponse<Shop>> {
        return this.request<Shop>('/shops', {
            method: 'POST',
            body: JSON.stringify(shop),
        });
    }

    async upgradeSubscription(shopId: string, plan: string, status?: string): Promise<ApiResponse<Shop>> {
        return this.request<Shop>(`/shops/${shopId}/upgrade`, {
            method: 'POST',
            body: JSON.stringify({ subscription_plan: plan, subscription_status: status }),
        });
    }

    // ============================================
    // PRODUCTS
    // ============================================

    async getProducts(shopId: string): Promise<ApiResponse<Item[]>> {
        return this.request<Item[]>(`/shops/${shopId}/products`);
    }

    async createProduct(shopId: string, product: Omit<Item, 'id'>): Promise<ApiResponse<Item>> {
        return this.request<Item>(`/shops/${shopId}/products`, {
            method: 'POST',
            body: JSON.stringify(product),
        });
    }

    async updateProduct(shopId: string, productId: string, updates: Partial<Item>): Promise<ApiResponse<Item>> {
        return this.request<Item>(`/shops/${shopId}/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async deleteProduct(shopId: string, productId: string): Promise<ApiResponse<void>> {
        return this.request<void>(`/shops/${shopId}/products/${productId}`, {
            method: 'DELETE',
        });
    }

    // ============================================
    // LIVE CHAT & CONVERSATIONS
    // ============================================

    async getConversations(shopId: string): Promise<ApiResponse<LiveChatConversation[]>> {
        return this.request<LiveChatConversation[]>(`/shops/${shopId}/conversations`);
    }

    async getConversation(shopId: string, conversationId: string): Promise<ApiResponse<LiveChatConversation>> {
        return this.request<LiveChatConversation>(`/shops/${shopId}/conversations/${conversationId}`);
    }

    async updateConversation(
        shopId: string,
        conversationId: string,
        updates: Partial<LiveChatConversation>
    ): Promise<ApiResponse<LiveChatConversation>> {
        return this.request<LiveChatConversation>(`/shops/${shopId}/conversations/${conversationId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async sendMessage(shopId: string, conversationId: string, message: any): Promise<ApiResponse<LiveChatConversation>> {
        return this.request<LiveChatConversation>(`/shops/${shopId}/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify(message),
        });
    }

    // ============================================
    // ORDERS & FORM SUBMISSIONS
    // ============================================

    async getOrders(shopId: string): Promise<ApiResponse<FormSubmission[]>> {
        return this.request<FormSubmission[]>(`/shops/${shopId}/orders`);
    }

    async getOrder(shopId: string, orderId: string): Promise<ApiResponse<FormSubmission>> {
        return this.request<FormSubmission>(`/shops/${shopId}/orders/${orderId}`);
    }

    async updateOrderStatus(shopId: string, orderId: string, status: string): Promise<ApiResponse<FormSubmission>> {
        return this.request<FormSubmission>(`/shops/${shopId}/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    }

    // ============================================
    // FORMS
    // ============================================

    async getForms(shopId: string): Promise<ApiResponse<Form[]>> {
        return this.request<Form[]>(`/shops/${shopId}/forms`);
    }

    async createForm(shopId: string, form: Omit<Form, 'id'>): Promise<ApiResponse<Form>> {
        return this.request<Form>(`/shops/${shopId}/forms`, {
            method: 'POST',
            body: JSON.stringify(form),
        });
    }

    async updateForm(shopId: string, formId: string, updates: Partial<Form>): Promise<ApiResponse<Form>> {
        return this.request<Form>(`/shops/${shopId}/forms/${formId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    // ============================================
    // AUTHENTICATION
    // ============================================

    async register(email: string, password: string, username: string): Promise<ApiResponse<{ user: User; token: string }>> {
        return this.request<{ user: User; token: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, username }),
        });
    }

    async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
        return this.request<{ user: User; token: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async logout(): Promise<ApiResponse<void>> {
        return this.request<void>('/auth/logout', {
            method: 'POST',
        });
    }

    async getCurrentUser(): Promise<ApiResponse<User>> {
        return this.request<User>('/auth/me');
    }

    // ============================================
    // SOCIAL MEDIA INTEGRATIONS
    // ============================================

    async connectSocialMedia(shopId: string, platform: string, code: string): Promise<ApiResponse<any>> {
        return this.request<any>(`/shops/${shopId}/integrations/${platform}/connect`, {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    }

    async disconnectSocialMedia(shopId: string, platform: string): Promise<ApiResponse<void>> {
        return this.request<void>(`/shops/${shopId}/integrations/${platform}/disconnect`, {
            method: 'POST',
        });
    }

    // ============================================
    // PAYMENTS
    // ============================================

    async createPaymentIntent(shopId: string, orderId: string, amount: number): Promise<ApiResponse<{ clientSecret: string }>> {
        return this.request<{ clientSecret: string }>(`/shops/${shopId}/payments/intent`, {
            method: 'POST',
            body: JSON.stringify({ orderId, amount }),
        });
    }

    async confirmPayment(shopId: string, paymentIntentId: string): Promise<ApiResponse<any>> {
        return this.request<any>(`/shops/${shopId}/payments/confirm`, {
            method: 'POST',
            body: JSON.stringify({ paymentIntentId }),
        });
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
