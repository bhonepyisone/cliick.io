"use strict";
/**
 * Token Usage Tracker
 * Tracks token consumption for all Gemini API calls with cost calculation
 * Supports both localStorage (client-side) and Supabase (persistent) storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenTracker = void 0;
const client_1 = require("../supabase/client");
// Gemini pricing (as of Dec 2024)
const DEFAULT_PRICING = {
    'gemini-2.5-flash': {
        modelName: 'gemini-2.5-flash',
        inputPricePerMillion: 0.03,
        outputPricePerMillion: 0.06,
    },
    'gemini-2.5-pro': {
        modelName: 'gemini-2.5-pro',
        inputPricePerMillion: 2.50,
        outputPricePerMillion: 10.00,
    },
    'gemini-flash-1.5': {
        modelName: 'gemini-flash-1.5',
        inputPricePerMillion: 0.075,
        outputPricePerMillion: 0.30,
    },
};
const STORAGE_KEY = 'ai_token_usage_logs';
const MAX_LOGS = 10000; // Keep last 10k logs in localStorage
const SUPABASE_ENABLED = true; // Enable Supabase persistence
class TokenTracker {
    constructor() {
        this.logs = [];
        this.pricing = DEFAULT_PRICING;
        this.loadLogs();
    }
    /**
     * Load logs from localStorage
     */
    loadLogs() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        }
        catch (error) {
            console.error('Failed to load token usage logs:', error);
            this.logs = [];
        }
    }
    /**
     * Save logs to localStorage (keep only last MAX_LOGS)
     */
    saveLogs() {
        try {
            // Keep only most recent logs
            if (this.logs.length > MAX_LOGS) {
                this.logs = this.logs.slice(-MAX_LOGS);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
        }
        catch (error) {
            console.error('Failed to save token usage logs:', error);
        }
    }
    /**
     * Calculate cost based on token count and model
     */
    calculateCost(inputTokens, outputTokens, modelName) {
        const pricing = this.pricing[modelName] || this.pricing['gemini-2.5-flash'];
        const inputCost = (inputTokens / 1000000) * pricing.inputPricePerMillion;
        const outputCost = (outputTokens / 1000000) * pricing.outputPricePerMillion;
        const totalCost = inputCost + outputCost;
        return {
            inputCost: Math.round(inputCost * 1000000) / 1000000, // Round to 6 decimals
            outputCost: Math.round(outputCost * 1000000) / 1000000,
            totalCost: Math.round(totalCost * 1000000) / 1000000,
        };
    }
    /**
     * Log a token usage event
     */
    async logUsage(params) {
        const { inputCost, outputCost, totalCost } = this.calculateCost(params.inputTokens, params.outputTokens, params.modelName);
        const log = {
            id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            shopId: params.shopId,
            userId: params.userId,
            conversationId: params.conversationId,
            operationType: params.operationType,
            modelName: params.modelName,
            inputTokens: params.inputTokens,
            outputTokens: params.outputTokens,
            totalTokens: params.inputTokens + params.outputTokens,
            inputCost,
            outputCost,
            totalCost,
            metadata: params.metadata,
        };
        // Save to localStorage
        this.logs.push(log);
        this.saveLogs();
        // Save to Supabase (async, don't block)
        if (SUPABASE_ENABLED) {
            this.saveToSupabase(log).catch(error => {
                console.error('[TOKEN TRACKER] Failed to save to Supabase:', error);
            });
        }
        // Console log for debugging
        console.log(`[TOKEN TRACKER] ${params.operationType}:`, {
            model: params.modelName,
            input: params.inputTokens,
            output: params.outputTokens,
            total: log.totalTokens,
            cost: `$${totalCost.toFixed(6)}`,
        });
        return log;
    }
    /**
     * Save log to Supabase
     */
    async saveToSupabase(log) {
        const { error } = await client_1.supabase
            .from('token_usage_logs')
            .insert({
            shop_id: log.shopId,
            user_id: log.userId || null,
            conversation_id: log.conversationId || null,
            operation_type: log.operationType,
            model_name: log.modelName,
            input_tokens: log.inputTokens,
            output_tokens: log.outputTokens,
            total_tokens: log.totalTokens,
            input_cost: log.inputCost,
            output_cost: log.outputCost,
            total_cost: log.totalCost,
            metadata: log.metadata || {},
        });
        if (error) {
            throw error;
        }
    }
    /**
     * Load logs from Supabase for a shop
     */
    async loadFromSupabase(shopId, options) {
        let query = client_1.supabase
            .from('token_usage_logs')
            .select('*')
            .eq('shop_id', shopId)
            .order('created_at', { ascending: false });
        if (options?.startDate) {
            query = query.gte('created_at', new Date(options.startDate).toISOString());
        }
        if (options?.endDate) {
            query = query.lte('created_at', new Date(options.endDate).toISOString());
        }
        if (options?.operationType) {
            query = query.eq('operation_type', options.operationType);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        const { data, error } = await query;
        if (error) {
            console.error('[TOKEN TRACKER] Failed to load from Supabase:', error);
            return [];
        }
        // Convert Supabase rows to TokenUsageLog format
        return (data || []).map(row => ({
            id: row.id,
            timestamp: new Date(row.created_at).getTime(),
            shopId: row.shop_id,
            userId: row.user_id || undefined,
            conversationId: row.conversation_id || undefined,
            operationType: row.operation_type,
            modelName: row.model_name,
            inputTokens: row.input_tokens,
            outputTokens: row.output_tokens,
            totalTokens: row.total_tokens,
            inputCost: parseFloat(row.input_cost),
            outputCost: parseFloat(row.output_cost),
            totalCost: parseFloat(row.total_cost),
            metadata: row.metadata || undefined,
        }));
    }
    /**
     * Get all logs
     */
    getAllLogs() {
        return [...this.logs];
    }
    /**
     * Get logs for a specific shop
     */
    getLogsByShop(shopId, limit) {
        const filtered = this.logs.filter(log => log.shopId === shopId);
        return limit ? filtered.slice(-limit) : filtered;
    }
    /**
     * Get logs by date range
     */
    getLogsByDateRange(startDate, endDate) {
        return this.logs.filter(log => log.timestamp >= startDate && log.timestamp <= endDate);
    }
    /**
     * Get logs by operation type
     */
    getLogsByOperation(operationType) {
        return this.logs.filter(log => log.operationType === operationType);
    }
    /**
     * Calculate total cost for a shop
     */
    getTotalCostForShop(shopId, dateRange) {
        let logs = this.getLogsByShop(shopId);
        if (dateRange) {
            logs = logs.filter(log => log.timestamp >= dateRange.start && log.timestamp <= dateRange.end);
        }
        return logs.reduce((sum, log) => sum + log.totalCost, 0);
    }
    /**
     * Calculate total tokens for a shop
     */
    getTotalTokensForShop(shopId, dateRange) {
        let logs = this.getLogsByShop(shopId);
        if (dateRange) {
            logs = logs.filter(log => log.timestamp >= dateRange.start && log.timestamp <= dateRange.end);
        }
        return logs.reduce((totals, log) => ({
            inputTokens: totals.inputTokens + log.inputTokens,
            outputTokens: totals.outputTokens + log.outputTokens,
            totalTokens: totals.totalTokens + log.totalTokens,
        }), { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    }
    /**
     * Get average tokens per operation type
     */
    getAverageTokensPerOperation(operationType) {
        const logs = this.getLogsByOperation(operationType);
        if (logs.length === 0) {
            return { avgInput: 0, avgOutput: 0, avgTotal: 0, avgCost: 0, count: 0 };
        }
        const totals = logs.reduce((acc, log) => ({
            input: acc.input + log.inputTokens,
            output: acc.output + log.outputTokens,
            total: acc.total + log.totalTokens,
            cost: acc.cost + log.totalCost,
        }), { input: 0, output: 0, total: 0, cost: 0 });
        return {
            avgInput: Math.round(totals.input / logs.length),
            avgOutput: Math.round(totals.output / logs.length),
            avgTotal: Math.round(totals.total / logs.length),
            avgCost: totals.cost / logs.length,
            count: logs.length,
        };
    }
    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        this.saveLogs();
    }
    /**
     * Clear logs for a specific shop
     */
    clearLogsForShop(shopId) {
        this.logs = this.logs.filter(log => log.shopId !== shopId);
        this.saveLogs();
    }
    /**
     * Export logs as CSV
     */
    exportToCSV() {
        const headers = [
            'Timestamp',
            'Shop ID',
            'User ID',
            'Conversation ID',
            'Operation Type',
            'Model Name',
            'Input Tokens',
            'Output Tokens',
            'Total Tokens',
            'Input Cost (USD)',
            'Output Cost (USD)',
            'Total Cost (USD)',
        ].join(',');
        const rows = this.logs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.shopId,
            log.userId || '',
            log.conversationId || '',
            log.operationType,
            log.modelName,
            log.inputTokens,
            log.outputTokens,
            log.totalTokens,
            log.inputCost.toFixed(6),
            log.outputCost.toFixed(6),
            log.totalCost.toFixed(6),
        ].join(','));
        return [headers, ...rows].join('\n');
    }
    /**
     * Update pricing for a model
     */
    updatePricing(modelName, pricing) {
        this.pricing[modelName] = {
            modelName,
            ...pricing,
        };
    }
    /**
     * Get current pricing
     */
    getPricing() {
        return { ...this.pricing };
    }
}
// Singleton instance
exports.tokenTracker = new TokenTracker();
