"use strict";
/**
 * Pricing Service
 * Manages pricing tiers, billing calculations, and real-time cost tracking
 * Integrates with token tracking for accurate billing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingService = void 0;
const client_1 = require("../supabase/client");
// Default pricing tiers
const DEFAULT_TIERS = [
    {
        id: 'tier_starter',
        name: 'Starter',
        monthlyFee: 5.00,
        includedMessages: 1000,
        overageRate: 0.00015,
        maxMonthlySpend: 50.00,
    },
    {
        id: 'tier_professional',
        name: 'Professional',
        monthlyFee: 15.00,
        includedMessages: 10000,
        overageRate: 0.00010,
        maxMonthlySpend: 200.00,
    },
    {
        id: 'tier_enterprise',
        name: 'Enterprise',
        monthlyFee: 0, // Custom
        includedMessages: Infinity,
        overageRate: 0.00005,
        maxMonthlySpend: null,
    },
];
class PricingService {
    constructor() {
        this.tiers = new Map();
        this.initializeTiers();
    }
    /**
     * Initialize default pricing tiers
     */
    initializeTiers() {
        DEFAULT_TIERS.forEach(tier => {
            this.tiers.set(tier.name.toLowerCase(), tier);
        });
    }
    /**
     * Calculate charges for a given tier and message count
     */
    calculateCharges(tierName, messagesUsed) {
        const tier = this.getTier(tierName);
        if (!tier) {
            throw new Error(`Unknown pricing tier: ${tierName}`);
        }
        let baseCharge = tier.monthlyFee;
        let overageCharge = 0;
        // Calculate overage
        if (messagesUsed > tier.includedMessages) {
            const overageMessages = messagesUsed - tier.includedMessages;
            overageCharge = overageMessages * tier.overageRate;
        }
        let totalCharge = baseCharge + overageCharge;
        // Apply cap if exists
        if (tier.maxMonthlySpend !== null && totalCharge > tier.maxMonthlySpend) {
            totalCharge = tier.maxMonthlySpend;
        }
        return {
            baseCharge,
            overageCharge,
            totalCharge: Math.round(totalCharge * 100) / 100, // Round to 2 decimals
        };
    }
    /**
     * Get real-time billing info for a shop
     */
    async getRealTimeBillingInfo(shopId) {
        // Get shop's current tier
        const { data: shop } = await client_1.supabase
            .from('shops')
            .select('subscription_plan')
            .eq('id', shopId)
            .single();
        const currentTier = shop?.subscription_plan || 'Starter';
        // Get month-to-date usage
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        // Get token usage logs for this month
        const { data: logs } = await client_1.supabase
            .from('token_usage_logs')
            .select('total_tokens, total_cost')
            .eq('shop_id', shopId)
            .gte('created_at', monthStart.toISOString())
            .lt('created_at', now.toISOString());
        const messagesThisMonth = logs?.length || 0;
        const tokensThisMonth = logs?.reduce((sum, log) => sum + log.total_tokens, 0) || 0;
        const apiCostThisMonth = logs?.reduce((sum, log) => sum + log.total_cost, 0) || 0;
        // Calculate charges
        const { baseCharge, overageCharge, totalCharge } = this.calculateCharges(currentTier, messagesThisMonth);
        // Calculate days remaining in month
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const daysRemainingInMonth = Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Get tier config for budget calculation
        const tier = this.getTier(currentTier);
        const budgetPercent = tier && tier.maxMonthlySpend
            ? (totalCharge / tier.maxMonthlySpend) * 100
            : (totalCharge / 200) * 100; // Use $200 as reference if no cap
        return {
            shopId,
            currentTier,
            messagesThisMonth,
            tokensThisMonth,
            apiCostThisMonth,
            baseCharge,
            estimatedOverageCharge: overageCharge,
            estimatedTotalCharge: totalCharge,
            percentOfBudget: Math.min(budgetPercent, 100),
            daysRemainingInMonth,
        };
    }
    /**
     * Generate billing record for a shop (monthly)
     */
    async generateMonthlyBillingRecord(shopId, billingPeriod) {
        // Get shop's tier
        const { data: shop, error: shopError } = await client_1.supabase
            .from('shops')
            .select('subscription_plan')
            .eq('id', shopId)
            .single();
        if (shopError)
            throw shopError;
        const tierName = shop?.subscription_plan || 'Starter';
        // Get usage for the period
        const monthStart = new Date(billingPeriod.getFullYear(), billingPeriod.getMonth(), 1);
        const monthEnd = new Date(billingPeriod.getFullYear(), billingPeriod.getMonth() + 1, 1);
        const { data: logs, error: logsError } = await client_1.supabase
            .from('token_usage_logs')
            .select('total_tokens, total_cost')
            .eq('shop_id', shopId)
            .gte('created_at', monthStart.toISOString())
            .lt('created_at', monthEnd.toISOString());
        if (logsError)
            throw logsError;
        const messagesUsed = logs?.length || 0;
        const tokensUsed = logs?.reduce((sum, log) => sum + log.total_tokens, 0) || 0;
        const apiCost = logs?.reduce((sum, log) => sum + log.total_cost, 0) || 0;
        // Calculate charges
        const { baseCharge, overageCharge, totalCharge } = this.calculateCharges(tierName, messagesUsed);
        // Store billing record
        const { data: record, error: insertError } = await client_1.supabase
            .from('billing_records')
            .insert({
            shop_id: shopId,
            billing_period: monthStart.toISOString().split('T')[0],
            tier_name: tierName,
            messages_used: messagesUsed,
            tokens_used: tokensUsed,
            api_cost: apiCost,
            base_charge: baseCharge,
            overage_charge: overageCharge,
            total_charge: totalCharge,
            paid: false,
        })
            .select()
            .single();
        if (insertError)
            throw insertError;
        if (!record)
            throw new Error('Failed to create billing record');
        const r = record;
        return {
            id: r.id,
            shopId: r.shop_id,
            billingPeriod: new Date(r.billing_period),
            tierName: r.tier_name,
            messagesUsed: r.messages_used,
            tokensUsed: r.tokens_used,
            apiCost: r.api_cost,
            baseCharge: r.base_charge,
            overageCharge: r.overage_charge,
            totalCharge: r.total_charge,
            paid: r.paid,
            createdAt: new Date(r.created_at),
        };
    }
    /**
     * Get billing history for a shop
     */
    async getBillingHistory(shopId, limit = 12) {
        const { data, error } = await client_1.supabase
            .from('billing_records')
            .select('*')
            .eq('shop_id', shopId)
            .order('billing_period', { ascending: false })
            .limit(limit);
        if (error) {
            console.error('[PRICING] Error fetching billing history:', error);
            return [];
        }
        return (data || []).map((record) => ({
            id: record.id,
            shopId: record.shop_id,
            billingPeriod: new Date(record.billing_period),
            tierName: record.tier_name,
            messagesUsed: record.messages_used,
            tokensUsed: record.tokens_used,
            apiCost: record.api_cost,
            baseCharge: record.base_charge,
            overageCharge: record.overage_charge,
            totalCharge: record.total_charge,
            paid: record.paid,
            createdAt: new Date(record.created_at),
        }));
    }
    /**
     * Get recommended tier based on usage
     */
    getRecommendedTier(messagesPerMonth) {
        if (messagesPerMonth <= 1000)
            return 'Starter';
        if (messagesPerMonth <= 10000)
            return 'Professional';
        return 'Enterprise';
    }
    /**
     * Calculate savings if upgraded
     */
    calculateUpgradeSavings(currentTier, messagesUsed) {
        const recommended = this.getRecommendedTier(messagesUsed);
        if (recommended === currentTier) {
            const { totalCharge: cost } = this.calculateCharges(currentTier, messagesUsed);
            return {
                recommendedTier: recommended,
                currentCost: cost,
                recommendedCost: cost,
                savings: 0,
            };
        }
        const { totalCharge: currentCost } = this.calculateCharges(currentTier, messagesUsed);
        const { totalCharge: recommendedCost } = this.calculateCharges(recommended, messagesUsed);
        const savings = Math.max(0, currentCost - recommendedCost);
        return {
            recommendedTier: recommended,
            currentCost,
            recommendedCost,
            savings: Math.round(savings * 100) / 100,
        };
    }
    /**
     * Get all available tiers
     */
    getAllTiers() {
        return Array.from(this.tiers.values());
    }
    /**
     * Get tier by name
     */
    getTier(name) {
        return this.tiers.get(name.toLowerCase());
    }
    /**
     * Mark billing record as paid
     */
    async markBillingRecordAsPaid(recordId) {
        try {
            const { error } = await client_1.supabase
                .from('billing_records')
                .update({ paid: true })
                .eq('id', recordId);
            if (error) {
                console.error('[PRICING] Error marking billing record as paid:', error);
                return false;
            }
            return true;
        }
        catch (err) {
            console.error('[PRICING] Exception in markBillingRecordAsPaid:', err);
            return false;
        }
    }
    /**
     * Project monthly spend for a shop based on current usage rate
     */
    async projectMonthlySpend(shopId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysSoFar = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        // Get usage so far this month
        const { data: logs } = await client_1.supabase
            .from('token_usage_logs')
            .select('total_cost')
            .eq('shop_id', shopId)
            .gte('created_at', monthStart.toISOString())
            .lt('created_at', now.toISOString());
        const costSoFar = logs?.reduce((sum, log) => sum + log.total_cost, 0) || 0;
        // Project to full month
        const projectedMonthlyApiCost = costSoFar * (daysInMonth / daysSoFar);
        // Get billing tier to calculate total
        const { data: shop } = await client_1.supabase
            .from('shops')
            .select('subscription_plan')
            .eq('id', shopId)
            .single();
        const tierName = shop?.subscription_plan || 'Starter';
        const tier = this.getTier(tierName);
        // Estimate messages based on API cost (avg $0.000074/message)
        const estimatedMessages = Math.round(projectedMonthlyApiCost / 0.000074);
        const { totalCharge } = this.calculateCharges(tierName, estimatedMessages);
        return totalCharge;
    }
}
// Singleton instance
exports.pricingService = new PricingService();
