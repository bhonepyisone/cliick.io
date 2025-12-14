"use strict";
/**
 * Token Limiter
 * Prevents runaway costs by enforcing token limits per message and per shop
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenLimiter = void 0;
// Default limits by operation type
const DEFAULT_LIMITS = {
    chat_message: {
        maxInputTokensPerMessage: 10000, // ~10k context tokens
        maxOutputTokensPerMessage: 2000, // ~2k response tokens
        maxTotalTokensPerMessage: 12000,
        maxDailyCost: 5.00, // $5 per shop per day
        maxMonthlyCost: 100.00, // $100 per shop per month
        alertThreshold: 80, // Alert at 80%
    },
    product_description: {
        maxInputTokensPerMessage: 5000,
        maxOutputTokensPerMessage: 1000,
        maxTotalTokensPerMessage: 6000,
        maxDailyCost: 1.00,
        maxMonthlyCost: 20.00,
        alertThreshold: 80,
    },
    photo_studio: {
        maxInputTokensPerMessage: 8000, // Image data + prompt
        maxOutputTokensPerMessage: 8000, // Generated image
        maxTotalTokensPerMessage: 16000,
        maxDailyCost: 2.00,
        maxMonthlyCost: 40.00,
        alertThreshold: 80,
    },
    suggestion: {
        maxInputTokensPerMessage: 3000,
        maxOutputTokensPerMessage: 500,
        maxTotalTokensPerMessage: 3500,
        maxDailyCost: 0.50,
        maxMonthlyCost: 10.00,
        alertThreshold: 80,
    },
};
class TokenLimiter {
    constructor() {
        this.limits = DEFAULT_LIMITS;
        this.alertCallbacks = [];
    }
    /**
     * Check if a message would exceed token limits
     */
    checkMessageLimits(operationType, inputTokens, outputTokens) {
        const limit = this.limits[operationType] || this.limits.chat_message;
        const totalTokens = inputTokens + outputTokens;
        // Check input tokens
        if (inputTokens > limit.maxInputTokensPerMessage) {
            return {
                type: 'input',
                limit: limit.maxInputTokensPerMessage,
                actual: inputTokens,
                message: `Input tokens (${inputTokens}) exceed limit of ${limit.maxInputTokensPerMessage}`,
            };
        }
        // Check output tokens
        if (outputTokens > limit.maxOutputTokensPerMessage) {
            return {
                type: 'output',
                limit: limit.maxOutputTokensPerMessage,
                actual: outputTokens,
                message: `Output tokens (${outputTokens}) exceed limit of ${limit.maxOutputTokensPerMessage}`,
            };
        }
        // Check total tokens
        if (totalTokens > limit.maxTotalTokensPerMessage) {
            return {
                type: 'total',
                limit: limit.maxTotalTokensPerMessage,
                actual: totalTokens,
                message: `Total tokens (${totalTokens}) exceed limit of ${limit.maxTotalTokensPerMessage}`,
            };
        }
        return null;
    }
    /**
     * Check if shop has exceeded daily cost limits
     */
    checkDailyCostLimit(shopId, operationType, currentDailyCost, additionalCost) {
        const limit = this.limits[operationType] || this.limits.chat_message;
        const newDailyCost = currentDailyCost + additionalCost;
        if (newDailyCost > limit.maxDailyCost) {
            return {
                type: 'daily_cost',
                limit: limit.maxDailyCost,
                actual: newDailyCost,
                message: `Daily cost ($${newDailyCost.toFixed(4)}) would exceed limit of $${limit.maxDailyCost}`,
            };
        }
        // Check alert threshold
        const percentUsed = (newDailyCost / limit.maxDailyCost) * 100;
        if (percentUsed >= limit.alertThreshold && percentUsed < 100) {
            this.triggerAlert({
                type: 'daily_cost',
                limit: limit.maxDailyCost,
                actual: newDailyCost,
                message: `Daily cost at ${percentUsed.toFixed(1)}% of limit ($${newDailyCost.toFixed(4)}/$${limit.maxDailyCost})`,
            }, shopId);
        }
        return null;
    }
    /**
     * Check if shop has exceeded monthly cost limits
     */
    checkMonthlyCostLimit(shopId, operationType, currentMonthlyCost, additionalCost) {
        const limit = this.limits[operationType] || this.limits.chat_message;
        const newMonthlyCost = currentMonthlyCost + additionalCost;
        if (newMonthlyCost > limit.maxMonthlyCost) {
            return {
                type: 'monthly_cost',
                limit: limit.maxMonthlyCost,
                actual: newMonthlyCost,
                message: `Monthly cost ($${newMonthlyCost.toFixed(2)}) would exceed limit of $${limit.maxMonthlyCost}`,
            };
        }
        // Check alert threshold
        const percentUsed = (newMonthlyCost / limit.maxMonthlyCost) * 100;
        if (percentUsed >= limit.alertThreshold && percentUsed < 100) {
            this.triggerAlert({
                type: 'monthly_cost',
                limit: limit.maxMonthlyCost,
                actual: newMonthlyCost,
                message: `Monthly cost at ${percentUsed.toFixed(1)}% of limit ($${newMonthlyCost.toFixed(2)}/$${limit.maxMonthlyCost})`,
            }, shopId);
        }
        return null;
    }
    /**
     * Update limits for a specific operation type
     */
    updateLimits(operationType, limits) {
        this.limits[operationType] = {
            ...this.limits[operationType],
            ...limits,
        };
    }
    /**
     * Get current limits
     */
    getLimits(operationType) {
        if (operationType) {
            return this.limits[operationType] || this.limits.chat_message;
        }
        return { ...this.limits };
    }
    /**
     * Register alert callback
     */
    onAlert(callback) {
        this.alertCallbacks.push(callback);
    }
    /**
     * Trigger alert
     */
    triggerAlert(violation, shopId) {
        console.warn(`[TOKEN LIMITER] Alert for shop ${shopId}:`, violation.message);
        this.alertCallbacks.forEach(callback => callback(violation, shopId));
    }
    /**
     * Calculate recommended max tokens based on cost limits
     */
    recommendMaxTokens(operationType, inputPricePerMillion, outputPricePerMillion, targetCostPerMessage) {
        // Assume 70% input, 30% output token distribution
        const inputBudget = targetCostPerMessage * 0.7;
        const outputBudget = targetCostPerMessage * 0.3;
        const maxInput = Math.floor((inputBudget / inputPricePerMillion) * 1000000);
        const maxOutput = Math.floor((outputBudget / outputPricePerMillion) * 1000000);
        return { maxInput, maxOutput };
    }
}
// Singleton instance
exports.tokenLimiter = new TokenLimiter();
