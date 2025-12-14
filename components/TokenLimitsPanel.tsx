/**
 * Token Limits Configuration Panel
 * Allows shop owners to configure per-message, daily, and monthly token limits
 * Integrated with TokenAnalyticsPanel and token budget management
 */

import React, { useState, useEffect } from 'react';
import { Shop } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import InfoIcon from './icons/InfoIcon';

interface TokenLimitConfig {
    chatMessageLimit: number;
    productDescriptionLimit: number;
    photoStudioLimit: number;
    suggestionLimit: number;
    dailyBudget: number;
    monthlyBudget: number;
    autoOptimizationEnabled: boolean;
}

interface TokenLimitsPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
}

const TokenLimitsPanel: React.FC<TokenLimitsPanelProps> = ({ shop, onUpdateShop }) => {
    const { t } = useLocalization();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState<TokenLimitConfig>({
        chatMessageLimit: 5000,
        productDescriptionLimit: 2000,
        photoStudioLimit: 3000,
        suggestionLimit: 1500,
        dailyBudget: 5.00,
        monthlyBudget: 100.00,
        autoOptimizationEnabled: false,
    });

    // Load existing config from shop if available
    useEffect(() => {
        // In a real implementation, these would be loaded from shop.tokenLimitsConfig
        // For now, using defaults
        const existingConfig = (shop as any).tokenLimitsConfig || config;
        setConfig(existingConfig);
    }, [shop]);

    const handleConfigChange = (field: keyof TokenLimitConfig, value: number | boolean) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            onUpdateShop(prevShop => ({
                ...prevShop,
                tokenLimitsConfig: config,
            } as Shop));
            showToast('Token limits updated successfully', 'success');
        } catch (error) {
            console.error('Error saving token limits:', error);
            showToast('Failed to save token limits', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const estimatedMonthlyMessages = Math.round((config.monthlyBudget / 0.000074) * 0.85); // Conservative estimate

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Per-Message Token Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chat Message Limit */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Chat Message Limit
                            <span className="ml-2 text-xs text-gray-400">(tokens)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={config.chatMessageLimit}
                                onChange={(e) => handleConfigChange('chatMessageLimit', parseInt(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                                min="1000"
                                step="100"
                            />
                            <button className="p-2 hover:bg-gray-700 rounded-md transition-colors" title="Maximum tokens per chat message">
                                <InfoIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Typical range: 2000-8000 tokens</p>
                    </div>

                    {/* Product Description Limit */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Product Description Limit
                            <span className="ml-2 text-xs text-gray-400">(tokens)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={config.productDescriptionLimit}
                                onChange={(e) => handleConfigChange('productDescriptionLimit', parseInt(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                                min="500"
                                step="100"
                            />
                            <button className="p-2 hover:bg-gray-700 rounded-md transition-colors" title="Maximum tokens for AI-generated product descriptions">
                                <InfoIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Typical range: 1000-3000 tokens</p>
                    </div>

                    {/* Photo Studio Limit */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            AI Photo Studio Limit
                            <span className="ml-2 text-xs text-gray-400">(tokens)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={config.photoStudioLimit}
                                onChange={(e) => handleConfigChange('photoStudioLimit', parseInt(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                                min="1000"
                                step="100"
                            />
                            <button className="p-2 hover:bg-gray-700 rounded-md transition-colors" title="Maximum tokens for photo studio operations">
                                <InfoIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Typical range: 2000-5000 tokens</p>
                    </div>

                    {/* Suggestion Limit */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Suggestion Generation Limit
                            <span className="ml-2 text-xs text-gray-400">(tokens)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={config.suggestionLimit}
                                onChange={(e) => handleConfigChange('suggestionLimit', parseInt(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                                min="500"
                                step="100"
                            />
                            <button className="p-2 hover:bg-gray-700 rounded-md transition-colors" title="Maximum tokens for AI suggestions">
                                <InfoIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Typical range: 1000-2000 tokens</p>
                    </div>
                </div>
            </div>

            {/* Budget Configuration */}
            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Monthly Token Budget</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daily Budget */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Daily Budget
                            <span className="ml-2 text-xs text-gray-400">(USD)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={config.dailyBudget}
                                onChange={(e) => handleConfigChange('dailyBudget', parseFloat(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                                min="0.50"
                                step="0.50"
                            />
                            <button className="p-2 hover:bg-gray-700 rounded-md transition-colors" title="Maximum daily spending on tokens">
                                <InfoIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Resets daily at UTC midnight</p>
                    </div>

                    {/* Monthly Budget */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Monthly Budget
                            <span className="ml-2 text-xs text-gray-400">(USD)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={config.monthlyBudget}
                                onChange={(e) => handleConfigChange('monthlyBudget', parseFloat(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                                min="5.00"
                                step="10.00"
                            />
                            <button className="p-2 hover:bg-gray-700 rounded-md transition-colors" title="Maximum monthly spending on tokens">
                                <InfoIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">~{estimatedMonthlyMessages.toLocaleString()} estimated messages/month</p>
                    </div>
                </div>
            </div>

            {/* Auto-Optimization */}
            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Cost Optimization</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.autoOptimizationEnabled}
                        onChange={(e) => handleConfigChange('autoOptimizationEnabled', e.target.checked)}
                        className="w-4 h-4 rounded bg-gray-700 border border-gray-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300">Enable automatic cost optimization</span>
                    <button className="p-1 hover:bg-gray-700 rounded transition-colors" title="Automatically reduce token usage when approaching budget limits">
                        <InfoIcon className="w-4 h-4 text-gray-400" />
                    </button>
                </label>
                <p className="mt-2 text-xs text-gray-500">
                    When enabled, the system will automatically:
                    <br />• Switch to faster models when at 60% budget
                    <br />• Reduce conversation history when at 80% budget
                    <br />• Block new requests when at 90% budget
                </p>
            </div>

            {/* Cost Projection */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Pricing & Projections</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                        <p className="text-gray-500">Input Token Price</p>
                        <p className="text-white font-semibold">$0.03 per 1M tokens</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Output Token Price</p>
                        <p className="text-white font-semibold">$0.06 per 1M tokens</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Average Cost/Message</p>
                        <p className="text-white font-semibold">~$0.000074</p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-semibold rounded-md transition-colors"
                >
                    {isLoading ? 'Saving...' : 'Save Token Limits'}
                </button>
            </div>
        </div>
    );
};

export default TokenLimitsPanel;
