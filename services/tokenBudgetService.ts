/**
 * Token Budget Service
 * Manages per-shop token usage budgets and automated cost optimization
 */

import { supabase } from '../supabase/client';

export interface ShopTokenBudget {
    id: string;
    shopId: string;
    dailyBudget: number;      // USD
    monthlyBudget: number;    // USD
    dailySpent: number;       // USD
    monthlySpent: number;     // USD
    dailyResetDate: string;
    monthlyResetDate: string;
    alertThreshold: number;   // Percentage (0-100)
    dailyAlertSent: boolean;
    monthlyAlertSent: boolean;
    autoOptimizationEnabled: boolean;
    fallbackModel: string;
    isBudgetExceeded: boolean;
    lastExceededAt?: string;
}

export interface BudgetStatus {
    dailyPercentUsed: number;
    monthlyPercentUsed: number;
    dailyRemaining: number;
    monthlyRemaining: number;
    canMakeRequest: boolean;
    estimatedRequestsRemaining: number;
    shouldOptimize: boolean;
}

export interface CostOptimizationRule {
    triggerThreshold: number;  // Percentage of budget
    action: 'switch_model' | 'reduce_context' | 'block_requests';
    targetModel?: string;
    maxHistoryMessages?: number;
}

class TokenBudgetService {
    private readonly DEFAULT_DAILY_BUDGET = 5.00;    // $5 USD
    private readonly DEFAULT_MONTHLY_BUDGET = 100.00; // $100 USD
    private readonly AVERAGE_COST_PER_REQUEST = 0.0001; // Estimated

    /**
     * Get or create budget for a shop
     */
    async getShopBudget(shopId: string): Promise<ShopTokenBudget | null> {
        const { data, error } = await supabase
            .from('shop_token_budgets')
            .select('*')
            .eq('shop_id', shopId)
            .single();

        if (error && error.code !== 'PGRST116') { // Not a "not found" error
            console.error('[BUDGET] Error fetching budget:', error);
            return null;
        }

        if (!data) {
            // Create default budget
            return this.createShopBudget(shopId);
        }

        return this.mapToBudget(data);
    }

    /**
     * Create default budget for a shop
     */
    async createShopBudget(shopId: string, customBudget?: Partial<ShopTokenBudget>): Promise<ShopTokenBudget> {
        const { data, error } = await supabase
            .from('shop_token_budgets')
            .insert({
                shop_id: shopId,
                daily_budget: customBudget?.dailyBudget || this.DEFAULT_DAILY_BUDGET,
                monthly_budget: customBudget?.monthlyBudget || this.DEFAULT_MONTHLY_BUDGET,
                alert_threshold: customBudget?.alertThreshold || 80,
                auto_optimization_enabled: customBudget?.autoOptimizationEnabled ?? true,
                fallback_model: customBudget?.fallbackModel || 'gemini-2.5-flash',
            })
            .select()
            .single();

        if (error) {
            console.error('[BUDGET] Error creating budget:', error);
            throw error;
        }

        return this.mapToBudget(data);
    }

    /**
     * Update shop budget
     */
    async updateShopBudget(shopId: string, updates: Partial<ShopTokenBudget>): Promise<ShopTokenBudget | null> {
        const updateData: any = {};
        
        if (updates.dailyBudget !== undefined) updateData.daily_budget = updates.dailyBudget;
        if (updates.monthlyBudget !== undefined) updateData.monthly_budget = updates.monthlyBudget;
        if (updates.alertThreshold !== undefined) updateData.alert_threshold = updates.alertThreshold;
        if (updates.autoOptimizationEnabled !== undefined) updateData.auto_optimization_enabled = updates.autoOptimizationEnabled;
        if (updates.fallbackModel !== undefined) updateData.fallback_model = updates.fallbackModel;

        const { data, error } = await supabase
            .from('shop_token_budgets')
            .update(updateData)
            .eq('shop_id', shopId)
            .select()
            .single();

        if (error) {
            console.error('[BUDGET] Error updating budget:', error);
            return null;
        }

        return this.mapToBudget(data);
    }

    /**
     * Check if shop can make a request
     */
    async canMakeRequest(shopId: string, estimatedCost: number = this.AVERAGE_COST_PER_REQUEST): Promise<{
        allowed: boolean;
        reason?: string;
        budget?: ShopTokenBudget;
    }> {
        const budget = await this.getShopBudget(shopId);
        
        if (!budget) {
            return { allowed: true }; // No budget = unlimited
        }

        if (budget.isBudgetExceeded) {
            return {
                allowed: false,
                reason: 'Budget exceeded. Please increase your daily or monthly budget.',
                budget,
            };
        }

        // Check if adding this request would exceed budget
        if (budget.dailySpent + estimatedCost > budget.dailyBudget) {
            return {
                allowed: false,
                reason: `Daily budget of $${budget.dailyBudget} would be exceeded.`,
                budget,
            };
        }

        if (budget.monthlySpent + estimatedCost > budget.monthlyBudget) {
            return {
                allowed: false,
                reason: `Monthly budget of $${budget.monthlyBudget} would be exceeded.`,
                budget,
            };
        }

        return { allowed: true, budget };
    }

    /**
     * Get budget status
     */
    async getBudgetStatus(shopId: string): Promise<BudgetStatus | null> {
        const budget = await this.getShopBudget(shopId);
        
        if (!budget) {
            return null;
        }

        const dailyPercentUsed = (budget.dailySpent / budget.dailyBudget) * 100;
        const monthlyPercentUsed = (budget.monthlySpent / budget.monthlyBudget) * 100;
        const dailyRemaining = Math.max(0, budget.dailyBudget - budget.dailySpent);
        const monthlyRemaining = Math.max(0, budget.monthlyBudget - budget.monthlySpent);
        
        const minRemaining = Math.min(dailyRemaining, monthlyRemaining);
        const estimatedRequestsRemaining = Math.floor(minRemaining / this.AVERAGE_COST_PER_REQUEST);
        
        const canMakeRequest = !budget.isBudgetExceeded && 
                              budget.dailySpent < budget.dailyBudget && 
                              budget.monthlySpent < budget.monthlyBudget;

        const shouldOptimize = budget.autoOptimizationEnabled && 
                              (dailyPercentUsed >= budget.alertThreshold || 
                               monthlyPercentUsed >= budget.alertThreshold);

        return {
            dailyPercentUsed,
            monthlyPercentUsed,
            dailyRemaining,
            monthlyRemaining,
            canMakeRequest,
            estimatedRequestsRemaining,
            shouldOptimize,
        };
    }

    /**
     * Get optimization recommendations
     */
    async getOptimizationRecommendations(shopId: string): Promise<CostOptimizationRule[]> {
        const status = await this.getBudgetStatus(shopId);
        
        if (!status) {
            return [];
        }

        const rules: CostOptimizationRule[] = [];
        const percentUsed = Math.max(status.dailyPercentUsed, status.monthlyPercentUsed);

        if (percentUsed >= 90) {
            rules.push({
                triggerThreshold: 90,
                action: 'block_requests',
            });
        } else if (percentUsed >= 80) {
            rules.push({
                triggerThreshold: 80,
                action: 'switch_model',
                targetModel: 'gemini-2.5-flash',
            });
            rules.push({
                triggerThreshold: 80,
                action: 'reduce_context',
                maxHistoryMessages: 5,
            });
        } else if (percentUsed >= 60) {
            rules.push({
                triggerThreshold: 60,
                action: 'reduce_context',
                maxHistoryMessages: 10,
            });
        }

        return rules;
    }

    /**
     * Apply cost optimization
     */
    async applyOptimization(
        shopId: string,
        operationType: string,
        currentConfig: {
            modelName: string;
            historyLength: number;
        }
    ): Promise<{
        optimized: boolean;
        modelName: string;
        maxHistoryMessages?: number;
        message?: string;
    }> {
        const budget = await this.getShopBudget(shopId);
        const status = await this.getBudgetStatus(shopId);
        
        if (!budget || !status || !budget.autoOptimizationEnabled) {
            return {
                optimized: false,
                modelName: currentConfig.modelName,
            };
        }

        const recommendations = await this.getOptimizationRecommendations(shopId);
        
        for (const rule of recommendations) {
            if (rule.action === 'switch_model' && rule.targetModel) {
                return {
                    optimized: true,
                    modelName: rule.targetModel,
                    message: `Switched to ${rule.targetModel} to reduce costs (budget at ${status.dailyPercentUsed.toFixed(1)}%)`,
                };
            }
            
            if (rule.action === 'reduce_context' && rule.maxHistoryMessages) {
                return {
                    optimized: true,
                    modelName: currentConfig.modelName,
                    maxHistoryMessages: rule.maxHistoryMessages,
                    message: `Reduced context to ${rule.maxHistoryMessages} messages to reduce costs`,
                };
            }
        }

        return {
            optimized: false,
            modelName: currentConfig.modelName,
        };
    }

    /**
     * Get all shop budgets (admin only)
     */
    async getAllShopBudgets(): Promise<ShopTokenBudget[]> {
        const { data, error } = await supabase
            .from('shop_token_budgets')
            .select('*')
            .order('monthly_spent', { ascending: false });

        if (error) {
            console.error('[BUDGET] Error fetching all budgets:', error);
            return [];
        }

        return (data || []).map(row => this.mapToBudget(row));
    }

    /**
     * Reset budgets (called by cron job)
     */
    async resetDailyBudgets(): Promise<void> {
        const { error } = await supabase.rpc('reset_daily_token_budgets');
        
        if (error) {
            console.error('[BUDGET] Error resetting daily budgets:', error);
        }
    }

    async resetMonthlyBudgets(): Promise<void> {
        const { error } = await supabase.rpc('reset_monthly_token_budgets');
        
        if (error) {
            console.error('[BUDGET] Error resetting monthly budgets:', error);
        }
    }

    /**
     * Map database row to ShopTokenBudget
     */
    private mapToBudget(data: any): ShopTokenBudget {
        return {
            id: data.id,
            shopId: data.shop_id,
            dailyBudget: parseFloat(data.daily_budget),
            monthlyBudget: parseFloat(data.monthly_budget),
            dailySpent: parseFloat(data.daily_spent),
            monthlySpent: parseFloat(data.monthly_spent),
            dailyResetDate: data.daily_reset_date,
            monthlyResetDate: data.monthly_reset_date,
            alertThreshold: data.alert_threshold,
            dailyAlertSent: data.daily_alert_sent,
            monthlyAlertSent: data.monthly_alert_sent,
            autoOptimizationEnabled: data.auto_optimization_enabled,
            fallbackModel: data.fallback_model,
            isBudgetExceeded: data.is_budget_exceeded,
            lastExceededAt: data.last_exceeded_at,
        };
    }
}

// Singleton instance
export const tokenBudgetService = new TokenBudgetService();
