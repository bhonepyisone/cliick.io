import React, { useState, useEffect } from 'react';
import { tokenBudgetService, ShopTokenBudget, BudgetStatus } from '../services/tokenBudgetService';
import DollarSignIcon from './icons/DollarSignIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import ToggleSwitch from './ToggleSwitch';

interface TokenBudgetPanelProps {
    shopId: string;
}

const TokenBudgetPanel: React.FC<TokenBudgetPanelProps> = ({ shopId }) => {
    const [budget, setBudget] = useState<ShopTokenBudget | null>(null);
    const [status, setStatus] = useState<BudgetStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        dailyBudget: 5.00,
        monthlyBudget: 100.00,
        alertThreshold: 80,
        autoOptimizationEnabled: true,
    });

    useEffect(() => {
        loadBudget();
        const interval = setInterval(loadBudget, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [shopId]);

    const loadBudget = async () => {
        try {
            const [budgetData, statusData] = await Promise.all([
                tokenBudgetService.getShopBudget(shopId),
                tokenBudgetService.getBudgetStatus(shopId),
            ]);
            
            setBudget(budgetData);
            setStatus(statusData);
            
            if (budgetData) {
                setEditValues({
                    dailyBudget: budgetData.dailyBudget,
                    monthlyBudget: budgetData.monthlyBudget,
                    alertThreshold: budgetData.alertThreshold,
                    autoOptimizationEnabled: budgetData.autoOptimizationEnabled,
                });
            }
        } catch (error) {
            console.error('Failed to load budget:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const updated = await tokenBudgetService.updateShopBudget(shopId, editValues);
            if (updated) {
                setBudget(updated);
                setEditing(false);
                alert('Budget settings updated successfully!');
            }
        } catch (error) {
            console.error('Failed to update budget:', error);
            alert('Failed to update budget. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
                    <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (!budget || !status) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg">
                <p className="text-gray-400">No budget data available. Contact support to enable budget tracking.</p>
            </div>
        );
    }

    const dailyProgressColor = status.dailyPercentUsed >= 90 ? 'bg-red-500' :
                                status.dailyPercentUsed >= 80 ? 'bg-yellow-500' :
                                'bg-green-500';
    
    const monthlyProgressColor = status.monthlyPercentUsed >= 90 ? 'bg-red-500' :
                                  status.monthlyPercentUsed >= 80 ? 'bg-yellow-500' :
                                  'bg-green-500';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white">Token Usage Budget</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Manage your AI token spending limits
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {editing ? (
                        <>
                            <button
                                onClick={() => setEditing(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-semibold"
                            >
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
                        >
                            Edit Budget
                        </button>
                    )}
                </div>
            </div>

            {/* Budget Status Alert */}
            {budget.isBudgetExceeded && (
                <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-red-400 font-semibold mb-1">Budget Exceeded</h4>
                        <p className="text-sm text-red-300">
                            Your token usage has exceeded the budget limits. AI features may be restricted until the budget resets or you increase your limits.
                        </p>
                    </div>
                </div>
            )}

            {status.shouldOptimize && !budget.isBudgetExceeded && (
                <div className="bg-yellow-900/30 border border-yellow-700 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-yellow-400 font-semibold mb-1">Cost Optimization Active</h4>
                        <p className="text-sm text-yellow-300">
                            You've used {Math.max(status.dailyPercentUsed, status.monthlyPercentUsed).toFixed(1)}% of your budget. 
                            {budget.autoOptimizationEnabled && ' Automatic optimizations are enabled to reduce costs.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Current Usage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Usage */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <DollarSignIcon className="w-5 h-5 text-blue-400" />
                            <h4 className="text-sm font-medium text-gray-300">Daily Usage</h4>
                        </div>
                        <span className="text-xs text-gray-500">
                            Resets: {new Date(budget.dailyResetDate).toLocaleDateString()}
                        </span>
                    </div>
                    
                    <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">
                                ${budget.dailySpent.toFixed(4)} / ${budget.dailyBudget.toFixed(2)}
                            </span>
                            <span className="text-white font-semibold">
                                {status.dailyPercentUsed.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                            <div 
                                className={`${dailyProgressColor} h-3 rounded-full transition-all duration-300`}
                                style={{ width: `${Math.min(100, status.dailyPercentUsed)}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-3">
                        Remaining: ${status.dailyRemaining.toFixed(4)}
                    </p>
                </div>

                {/* Monthly Usage */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <DollarSignIcon className="w-5 h-5 text-green-400" />
                            <h4 className="text-sm font-medium text-gray-300">Monthly Usage</h4>
                        </div>
                        <span className="text-xs text-gray-500">
                            Resets: {new Date(budget.monthlyResetDate).toLocaleDateString()}
                        </span>
                    </div>
                    
                    <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">
                                ${budget.monthlySpent.toFixed(4)} / ${budget.monthlyBudget.toFixed(2)}
                            </span>
                            <span className="text-white font-semibold">
                                {status.monthlyPercentUsed.toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                            <div 
                                className={`${monthlyProgressColor} h-3 rounded-full transition-all duration-300`}
                                style={{ width: `${Math.min(100, status.monthlyPercentUsed)}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-3">
                        Remaining: ${status.monthlyRemaining.toFixed(4)}
                    </p>
                </div>
            </div>

            {/* Budget Settings */}
            {editing ? (
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-4">Budget Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Daily Budget (USD)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editValues.dailyBudget}
                                onChange={e => setEditValues(prev => ({ ...prev, dailyBudget: parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Maximum amount to spend on tokens per day
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Monthly Budget (USD)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editValues.monthlyBudget}
                                onChange={e => setEditValues(prev => ({ ...prev, monthlyBudget: parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Maximum amount to spend on tokens per month
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Alert Threshold (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={editValues.alertThreshold}
                                onChange={e => setEditValues(prev => ({ ...prev, alertThreshold: parseInt(e.target.value) || 80 }))}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Percentage of budget to trigger alerts
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Automatic Cost Optimization
                            </label>
                            <ToggleSwitch
                                enabled={editValues.autoOptimizationEnabled}
                                onChange={enabled => setEditValues(prev => ({ ...prev, autoOptimizationEnabled: enabled }))}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Automatically reduce costs when nearing budget limits
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-4">Current Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Daily Budget:</span>
                            <span className="text-white ml-2 font-semibold">${budget.dailyBudget.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Monthly Budget:</span>
                            <span className="text-white ml-2 font-semibold">${budget.monthlyBudget.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Alert Threshold:</span>
                            <span className="text-white ml-2 font-semibold">{budget.alertThreshold}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">Auto Optimization:</span>
                            {budget.autoOptimizationEnabled ? (
                                <span className="flex items-center gap-1 text-green-400">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Enabled
                                </span>
                            ) : (
                                <span className="text-gray-500">Disabled</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Estimated Remaining Requests */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3">Estimated Remaining Capacity</h4>
                <div className="text-center">
                    <p className="text-4xl font-bold text-blue-400">
                        {status.estimatedRequestsRemaining.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                        AI requests remaining (approximate)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Based on average cost of $0.0001 per request
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TokenBudgetPanel;
