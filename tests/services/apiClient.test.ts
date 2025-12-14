/**
 * API Client Tests
 * Tests for the REST API client service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from '../../services/apiClient';

// Mock fetch globally
global.fetch = vi.fn();

describe('ApiClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Shop Management', () => {
        it('should fetch shop details successfully', async () => {
            const mockShop = {
                id: 'shop_123',
                name: 'Test Shop',
                ownerId: 'user_123',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockShop,
            });

            const result = await apiClient.getShop('shop_123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockShop);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/shops/shop_123'),
                expect.objectContaining({
                    credentials: 'include',
                })
            );
        });

        it('should handle shop fetch error', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({ error: 'Shop not found' }),
            });

            const result = await apiClient.getShop('invalid_shop');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Shop not found');
        });

        it('should update shop successfully', async () => {
            const updates = { name: 'Updated Shop Name' };
            const mockUpdatedShop = {
                id: 'shop_123',
                name: 'Updated Shop Name',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockUpdatedShop,
            });

            const result = await apiClient.updateShop('shop_123', updates);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUpdatedShop);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/shops/shop_123'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(updates),
                })
            );
        });
    });

    describe('Products', () => {
        it('should fetch products successfully', async () => {
            const mockProducts = [
                { id: 'prod_1', name: 'Product 1', price: 100 },
                { id: 'prod_2', name: 'Product 2', price: 200 },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockProducts,
            });

            const result = await apiClient.getProducts('shop_123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockProducts);
            expect(result.data).toHaveLength(2);
        });

        it('should create product successfully', async () => {
            const newProduct = {
                name: 'New Product',
                price: 150,
                stock: 10,
            };

            const mockCreatedProduct = {
                id: 'prod_3',
                ...newProduct,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockCreatedProduct,
            });

            const result = await apiClient.createProduct('shop_123', newProduct as any);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockCreatedProduct);
        });

        it('should delete product successfully', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            const result = await apiClient.deleteProduct('shop_123', 'prod_1');

            expect(result.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/products/prod_1'),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });
    });

    describe('Conversations', () => {
        it('should fetch conversations successfully', async () => {
            const mockConversations = [
                { id: 'conv_1', customerName: 'John Doe', status: 'open' },
                { id: 'conv_2', customerName: 'Jane Smith', status: 'closed' },
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockConversations,
            });

            const result = await apiClient.getConversations('shop_123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('should send message successfully', async () => {
            const message = {
                text: 'Hello, customer!',
                sender: 'seller',
            };

            const mockUpdatedConversation = {
                id: 'conv_1',
                messages: [message],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockUpdatedConversation,
            });

            const result = await apiClient.sendMessage('shop_123', 'conv_1', message);

            expect(result.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/conversations/conv_1/messages'),
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });
    });

    describe('Authentication', () => {
        it('should login successfully', async () => {
            const mockResponse = {
                user: { id: 'user_123', email: 'test@example.com' },
                token: 'jwt_token_here',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await apiClient.login('test@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.data?.user.email).toBe('test@example.com');
            expect(result.data?.token).toBe('jwt_token_here');
        });

        it('should handle login error', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Invalid credentials' }),
            });

            const result = await apiClient.login('wrong@example.com', 'wrongpass');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const result = await apiClient.getShop('shop_123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });

        it('should handle timeout errors', async () => {
            (global.fetch as any).mockRejectedValueOnce({ name: 'AbortError' });

            const result = await apiClient.getShop('shop_123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Request timeout');
        });
    });

    describe('Payments', () => {
        it('should create payment intent successfully', async () => {
            const mockIntent = {
                clientSecret: 'pi_secret_123',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockIntent,
            });

            const result = await apiClient.createPaymentIntent('shop_123', 'order_123', 2000);

            expect(result.success).toBe(true);
            expect(result.data?.clientSecret).toBe('pi_secret_123');
        });

        it('should confirm payment successfully', async () => {
            const mockConfirmation = {
                paymentIntentId: 'pi_123',
                status: 'succeeded',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockConfirmation,
            });

            const result = await apiClient.confirmPayment('shop_123', 'pi_123');

            expect(result.success).toBe(true);
        });
    });
});
