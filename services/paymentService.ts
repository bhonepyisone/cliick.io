/**
 * Payment Service - Payment Gateway Integration
 * Supports Stripe, PayPal, and other payment providers
 */

interface PaymentIntent {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
}

interface PaymentMethod {
    id: string;
    type: 'card' | 'bank_account' | 'paypal' | 'crypto';
    last4?: string;
    brand?: string;
}

interface PaymentResult {
    success: boolean;
    paymentIntent?: PaymentIntent;
    error?: string;
}

class PaymentService {
    private provider: 'stripe' | 'paypal' = 'stripe';
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.provider = (import.meta.env.VITE_PAYMENT_PROVIDER as 'stripe' | 'paypal') || 'stripe';
        this.apiKey = import.meta.env.VITE_PAYMENT_API_KEY || '';
        this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    }

    /**
     * Create a payment intent
     */
    async createPaymentIntent(
        orderId: string,
        amount: number,
        currency: string = 'USD',
        metadata?: Record<string, any>
    ): Promise<PaymentResult> {
        try {
            const response = await fetch(`${this.baseUrl}/payments/intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    orderId,
                    amount,
                    currency,
                    provider: this.provider,
                    metadata,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Failed to create payment intent',
                };
            }

            return {
                success: true,
                paymentIntent: data.paymentIntent,
            };
        } catch (error: any) {
            console.error('Payment intent creation error:', error);
            return {
                success: false,
                error: error.message || 'Payment service error',
            };
        }
    }

    /**
     * Confirm a payment
     */
    async confirmPayment(
        paymentIntentId: string,
        paymentMethodId: string
    ): Promise<PaymentResult> {
        try {
            const response = await fetch(`${this.baseUrl}/payments/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    paymentIntentId,
                    paymentMethodId,
                    provider: this.provider,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Payment confirmation failed',
                };
            }

            return {
                success: true,
                paymentIntent: data.paymentIntent,
            };
        } catch (error: any) {
            console.error('Payment confirmation error:', error);
            return {
                success: false,
                error: error.message || 'Payment confirmation failed',
            };
        }
    }

    /**
     * Cancel a payment intent
     */
    async cancelPayment(paymentIntentId: string): Promise<PaymentResult> {
        try {
            const response = await fetch(`${this.baseUrl}/payments/${paymentIntentId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Payment cancellation failed',
                };
            }

            return {
                success: true,
                paymentIntent: data.paymentIntent,
            };
        } catch (error: any) {
            console.error('Payment cancellation error:', error);
            return {
                success: false,
                error: error.message || 'Payment cancellation failed',
            };
        }
    }

    /**
     * Get payment intent status
     */
    async getPaymentStatus(paymentIntentId: string): Promise<PaymentResult> {
        try {
            const response = await fetch(`${this.baseUrl}/payments/${paymentIntentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Failed to retrieve payment status',
                };
            }

            return {
                success: true,
                paymentIntent: data.paymentIntent,
            };
        } catch (error: any) {
            console.error('Payment status retrieval error:', error);
            return {
                success: false,
                error: error.message || 'Failed to retrieve payment status',
            };
        }
    }

    /**
     * Process refund
     */
    async refundPayment(
        paymentIntentId: string,
        amount?: number,
        reason?: string
    ): Promise<PaymentResult> {
        try {
            const response = await fetch(`${this.baseUrl}/payments/${paymentIntentId}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    amount,
                    reason,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Refund failed',
                };
            }

            return {
                success: true,
                paymentIntent: data.paymentIntent,
            };
        } catch (error: any) {
            console.error('Refund error:', error);
            return {
                success: false,
                error: error.message || 'Refund failed',
            };
        }
    }

    /**
     * Load Stripe.js or PayPal SDK
     */
    async loadPaymentSDK(): Promise<any> {
        if (this.provider === 'stripe') {
            return this.loadStripe();
        } else if (this.provider === 'paypal') {
            return this.loadPayPal();
        }
        throw new Error('Unsupported payment provider');
    }

    /**
     * Load Stripe.js dynamically
     */
    private async loadStripe(): Promise<any> {
        if ((window as any).Stripe) {
            return (window as any).Stripe(this.apiKey);
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                resolve((window as any).Stripe(this.apiKey));
            };
            script.onerror = () => {
                reject(new Error('Failed to load Stripe.js'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Load PayPal SDK dynamically
     */
    private async loadPayPal(): Promise<any> {
        if ((window as any).paypal) {
            return (window as any).paypal;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${this.apiKey}&currency=USD`;
            script.onload = () => {
                resolve((window as any).paypal);
            };
            script.onerror = () => {
                reject(new Error('Failed to load PayPal SDK'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Get configured provider
     */
    getProvider(): string {
        return this.provider;
    }

    /**
     * Check if payment service is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;
