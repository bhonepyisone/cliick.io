import React, { useState, useEffect, useMemo } from 'react';
import { tokenTracker, TokenUsageLog } from '../utils/tokenTracker';
import { tokenLimiter } from '../utils/tokenLimiter';
import { Shop } from '../types';
import DatabaseIcon from './icons/DatabaseIcon';
import DollarSignIcon from './icons/DollarSignIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import DownloadIcon from './icons/DownloadIcon';
import RefreshCwIcon from './icons/RefreshCwIcon';

interface TokenAnalyticsPanelProps {
    shops: Shop[];
}

const TokenAnalyticsPanel: React.FC<TokenAnalyticsPanelProps> = ({ shops }) => {
    const [logs, setLogs] = useState<TokenUsageLog[]>([]);
    const [selectedShop, setSelectedShop] = useState<string>('all');
    const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
    const [selectedOperation, setSelectedOperation] = useState<string>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Load logs
    useEffect(() => {
        loadLogs();
        
        if (autoRefresh) {
            const interval = setInterval(loadLogs, 5000); // Refresh every 5 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const loadLogs = () => {
        setLogs(tokenTracker.getAllLogs());
    };

    // Filter logs based on selections
    const filteredLogs = useMemo(() => {
        let filtered = [...logs];

        // Filter by shop
        if (selectedShop !== 'all') {
            filtered = filtered.filter(log => log.shopId === selectedShop);
        }

        // Filter by period
        const now = Date.now();
        const periods = {
            today: now - 24 * 60 * 60 * 1000,
            week: now - 7 * 24 * 60 * 60 * 1000,
            month: now - 30 * 24 * 60 * 60 * 1000,
            all: 0,
        };
        filtered = filtered.filter(log => log.timestamp >= periods[selectedPeriod]);

        // Filter by operation
        if (selectedOperation !== 'all') {
            filtered = filtered.filter(log => log.operationType === selectedOperation);
        }

        return filtered.sort((a, b) => b.timestamp - a.timestamp);
    }, [logs, selectedShop, selectedPeriod, selectedOperation]);

    // Calculate statistics
    const stats = useMemo(() => {
        const totalInputTokens = filteredLogs.reduce((sum, log) => sum + log.inputTokens, 0);
        const totalOutputTokens = filteredLogs.reduce((sum, log) => sum + log.outputTokens, 0);
        const totalTokens = filteredLogs.reduce((sum, log) => sum + log.totalTokens, 0);
        const totalCost = filteredLogs.reduce((sum, log) => sum + log.totalCost, 0);
        const avgCostPerMessage = filteredLogs.length > 0 ? totalCost / filteredLogs.length : 0;

        // Group by operation type
        const byOperation = filteredLogs.reduce((acc, log) => {
            if (!acc[log.operationType]) {
                acc[log.operationType] = {
                    count: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                    cost: 0,
                };
            }
            acc[log.operationType].count++;
            acc[log.operationType].inputTokens += log.inputTokens;
            acc[log.operationType].outputTokens += log.outputTokens;
            acc[log.operationType].totalTokens += log.totalTokens;
            acc[log.operationType].cost += log.totalCost;
            return acc;
        }, {} as Record<string, any>);

        // Group by shop
        const byShop = filteredLogs.reduce((acc, log) => {
            if (!acc[log.shopId]) {
                acc[log.shopId] = {
                    count: 0,
                    cost: 0,
                    tokens: 0,
                };
            }
            acc[log.shopId].count++;
            acc[log.shopId].cost += log.totalCost;
            acc[log.shopId].tokens += log.totalTokens;
            return acc;
        }, {} as Record<string, any>);

        return {
            totalInputTokens,
            totalOutputTokens,
            totalTokens,
            totalCost,
            avgCostPerMessage,
            messageCount: filteredLogs.length,
            byOperation,
            byShop,
        };
    }, [filteredLogs]);

    // Export to CSV
    const handleExport = () => {
        const csv = tokenTracker.exportToCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `token-usage-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Clear logs
    const handleClearLogs = () => {
        if (confirm('Are you sure you want to clear all token usage logs? This cannot be undone.')) {
            tokenTracker.clearLogs();
            loadLogs();
        }
    };

    const operationLabels: Record<string, string> = {
        chat_message: 'Chat Messages',
        product_description: 'Product Descriptions',
        photo_studio: 'Photo Studio',
        suggestion: 'Suggestions',
    };

    const getShopName = (shopId: string) => {
        const shop = shops.find(s => s.id === shopId);
        return shop?.name || shopId;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Token Usage Analytics</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Real-time monitoring of Gemini API token consumption and costs
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={e => setAutoRefresh(e.target.checked)}
                            className="rounded bg-gray-700 border-gray-600"
                        />
                        Auto-refresh
                    </label>
                    <button
                        onClick={loadLogs}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm flex items-center gap-2"
                    >
                        <RefreshCwIcon className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm flex items-center gap-2"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Shop</label>
                    <select
                        value={selectedShop}
                        onChange={e => setSelectedShop(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm"
                    >
                        <option value="all">All Shops</option>
                        {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>{shop.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Period</label>
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(e.target.value as any)}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm"
                    >
                        <option value="today">Last 24 Hours</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Operation Type</label>
                    <select
                        value={selectedOperation}
                        onChange={e => setSelectedOperation(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm"
                    >
                        <option value="all">All Operations</option>
                        <option value="chat_message">Chat Messages</option>
                        <option value="product_description">Product Descriptions</option>
                        <option value="photo_studio">Photo Studio</option>
                        <option value="suggestion">Suggestions</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <ChatBubbleIcon className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm text-blue-300 font-medium">Total Messages</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.messageCount.toLocaleString()}</p>
                    <p className="text-xs text-blue-300 mt-1">Gemini API calls</p>
                </div>
                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <DatabaseIcon className="w-5 h-5 text-green-400" />
                        <h3 className="text-sm text-green-300 font-medium">Total Tokens</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{(stats.totalTokens / 1000000).toFixed(2)}M</p>
                    <p className="text-xs text-green-300 mt-1">{stats.totalInputTokens.toLocaleString()} in / {stats.totalOutputTokens.toLocaleString()} out</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-700 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSignIcon className="w-5 h-5 text-yellow-400" />
                        <h3 className="text-sm text-yellow-300 font-medium">API Cost</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">${stats.totalCost.toFixed(4)}</p>
                    <p className="text-xs text-yellow-300 mt-1">${stats.avgCostPerMessage.toFixed(6)}/message</p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSignIcon className="w-5 h-5 text-purple-400" />
                        <h3 className="text-sm text-purple-300 font-medium">Revenue (5x)</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">${(stats.totalCost * 5).toFixed(4)}</p>
                    <p className="text-xs text-purple-300 mt-1">${((stats.totalCost * 5 - stats.totalCost)).toFixed(4)} profit (80%)</p>
                </div>
            </div>

            {/* Pricing & Profit Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost Projections */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">💰 Cost Projections</h3>
                    <div className="space-y-4 text-sm">
                        <div>
                            <p className="text-gray-400 mb-2">Current average: <span className="text-white font-semibold">${stats.avgCostPerMessage.toFixed(6)}/msg</span></p>
                            <div className="space-y-1 text-gray-300">
                                <p className="flex justify-between"><span>• 1,000 msgs:</span><span className="font-semibold">${(stats.avgCostPerMessage * 1000).toFixed(2)}</span></p>
                                <p className="flex justify-between"><span>• 10,000 msgs:</span><span className="font-semibold">${(stats.avgCostPerMessage * 10000).toFixed(2)}</span></p>
                                <p className="flex justify-between"><span>• 100,000 msgs:</span><span className="font-semibold">${(stats.avgCostPerMessage * 100000).toFixed(2)}</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profit Margin Calculator */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">📈 Profit Margin Analysis</h3>
                    <div className="space-y-3 text-sm">
                        {[2, 3, 5].map(markup => {
                            const cost = stats.avgCostPerMessage;
                            const price = cost * markup;
                            const marginValue = (price - cost) / price * 100;
                            const marginStr = marginValue.toFixed(1);
                            return (
                                <div key={markup} className="bg-gray-700/50 p-3 rounded">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">{markup}x markup</span>
                                        <span className="text-white font-semibold">${price.toFixed(6)}/msg</span>
                                        <span className={`font-bold ${marginValue > 75 ? 'text-green-400' : marginValue > 60 ? 'text-yellow-400' : 'text-orange-400'}`}>{marginStr}%</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">10K msgs = ${(price * 10000).toFixed(2)} revenue | ${((price - cost) * 10000).toFixed(2)} profit</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* High-Cost Alerts */}
            {(() => {
                const highCostOps = Object.entries(stats.byOperation)
                    .filter(([, data]: [string, any]) => (data.cost / data.count) > (stats.avgCostPerMessage * 1.5))
                    .sort(([, a]: [string, any], [, b]: [string, any]) => (b.cost / b.count) - (a.cost / a.count));
                
                if (highCostOps.length > 0) {
                    return (
                        <div className="bg-red-900/30 border border-red-700 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-red-300 mb-4">⚠️ High-Cost Operations Detected</h3>
                            <div className="space-y-2 text-sm">
                                {highCostOps.map(([type, data]: [string, any]) => (
                                    <div key={type} className="flex justify-between items-center bg-gray-900/50 p-3 rounded">
                                        <span className="text-gray-300">{operationLabels[type] || type}</span>
                                        <span className="text-red-300 font-semibold">${(data.cost / data.count).toFixed(6)}/msg</span>
                                        <span className="text-xs text-gray-400">{Math.round(((data.cost / data.count) / stats.avgCostPerMessage - 1) * 100)}% above avg</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-red-200 mt-4">💡 Tip: Consider implementing caching or reducing knowledge base size for these operations</p>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Tier Recommendations */}
            {selectedShop !== 'all' && (() => {
                const shopStats = stats.byShop[selectedShop];
                if (!shopStats) return null;
                
                const avgMonthlyMessages = shopStats.count > 0 ? shopStats.count : 0;
                const recommendedTier = avgMonthlyMessages <= 1000 ? 'Starter' : avgMonthlyMessages <= 10000 ? 'Professional' : 'Enterprise';
                const tiers = {
                    Starter: { price: 5, included: 1000, overage: 0.00015 },
                    Professional: { price: 15, included: 10000, overage: 0.00010 },
                    Enterprise: { price: 0, included: Infinity, overage: 0 }
                };
                const tierConfig = tiers[recommendedTier as keyof typeof tiers];
                const monthlyCharge = tierConfig.price + Math.max(0, (avgMonthlyMessages - tierConfig.included) * tierConfig.overage);
                
                return (
                    <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-300 mb-4">🎯 Recommended Pricing Tier</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400 mb-2">Current Usage</p>
                                <p className="text-white font-semibold text-lg">{avgMonthlyMessages} messages</p>
                                <p className="text-xs text-gray-400 mt-1">API cost: ${shopStats.cost.toFixed(4)}</p>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded border border-blue-700/50">
                                <p className="text-gray-400 mb-2">Recommended</p>
                                <p className="text-blue-300 font-semibold text-lg">{recommendedTier}</p>
                                <p className="text-xs text-gray-400 mt-1">Monthly: ${tierConfig.price === 0 ? 'Custom' : tierConfig.price.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-2">Your Margin (5x markup)</p>
                                <p className="text-green-400 font-semibold text-lg">80%</p>
                                <p className="text-xs text-gray-400 mt-1">Per message: ${(shopStats.cost * 5).toFixed(6)}</p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* By Operation Type */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">📊 Usage by Operation Type</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left py-2 px-3 text-gray-400 font-medium">Operation</th>
                                <th className="text-right py-2 px-3 text-gray-400 font-medium">Count</th>
                                <th className="text-right py-2 px-3 text-gray-400 font-medium">Avg Input</th>
                                <th className="text-right py-2 px-3 text-gray-400 font-medium">Avg Output</th>
                                <th className="text-right py-2 px-3 text-gray-400 font-medium">Avg Total</th>
                                <th className="text-right py-2 px-3 text-gray-400 font-medium">Total Cost</th>
                                <th className="text-right py-2 px-3 text-gray-400 font-medium">Avg Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(stats.byOperation).map(([type, data]: [string, any]) => (
                                <tr key={type} className="border-b border-gray-700/50">
                                    <td className="py-2 px-3 text-white">{operationLabels[type] || type}</td>
                                    <td className="py-2 px-3 text-right text-gray-300">{data.count.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-gray-300">{Math.round(data.inputTokens / data.count).toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-gray-300">{Math.round(data.outputTokens / data.count).toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-gray-300">{Math.round(data.totalTokens / data.count).toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-gray-300">${data.cost.toFixed(4)}</td>
                                    <td className="py-2 px-3 text-right text-green-400 font-semibold">${(data.cost / data.count).toFixed(6)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* By Shop */}
            {selectedShop === 'all' && (
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">🏪 Usage by Shop</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Shop</th>
                                    <th className="text-right py-2 px-3 text-gray-400 font-medium">Messages</th>
                                    <th className="text-right py-2 px-3 text-gray-400 font-medium">Total Tokens</th>
                                    <th className="text-right py-2 px-3 text-gray-400 font-medium">Total Cost</th>
                                    <th className="text-right py-2 px-3 text-gray-400 font-medium">Avg Cost/Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(stats.byShop)
                                    .sort(([, a]: [string, any], [, b]: [string, any]) => b.cost - a.cost)
                                    .map(([shopId, data]: [string, any]) => (
                                        <tr key={shopId} className="border-b border-gray-700/50">
                                            <td className="py-2 px-3 text-white">{getShopName(shopId)}</td>
                                            <td className="py-2 px-3 text-right text-gray-300">{data.count.toLocaleString()}</td>
                                            <td className="py-2 px-3 text-right text-gray-300">{data.tokens.toLocaleString()}</td>
                                            <td className="py-2 px-3 text-right text-yellow-400">${data.cost.toFixed(4)}</td>
                                            <td className="py-2 px-3 text-right text-gray-300">${(data.cost / data.count).toFixed(6)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recent Logs */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">📝 Recent Activity</h3>
                    <button
                        onClick={handleClearLogs}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                        Clear All Logs
                    </button>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-800">
                            <tr className="border-b border-gray-700">
                                <th className="text-left py-2 px-2 text-gray-400 font-medium">Time</th>
                                <th className="text-left py-2 px-2 text-gray-400 font-medium">Shop</th>
                                <th className="text-left py-2 px-2 text-gray-400 font-medium">Operation</th>
                                <th className="text-left py-2 px-2 text-gray-400 font-medium">Model</th>
                                <th className="text-right py-2 px-2 text-gray-400 font-medium">Input</th>
                                <th className="text-right py-2 px-2 text-gray-400 font-medium">Output</th>
                                <th className="text-right py-2 px-2 text-gray-400 font-medium">Total</th>
                                <th className="text-right py-2 px-2 text-gray-400 font-medium">Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.slice(0, 50).map(log => (
                                <tr key={log.id} className="border-b border-gray-700/30 hover:bg-gray-700/30">
                                    <td className="py-2 px-2 text-gray-400">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </td>
                                    <td className="py-2 px-2 text-gray-300 truncate max-w-32">
                                        {getShopName(log.shopId)}
                                    </td>
                                    <td className="py-2 px-2 text-gray-300">{operationLabels[log.operationType] || log.operationType}</td>
                                    <td className="py-2 px-2 text-gray-400 text-xs">{log.modelName}</td>
                                    <td className="py-2 px-2 text-right text-gray-300">{log.inputTokens.toLocaleString()}</td>
                                    <td className="py-2 px-2 text-right text-gray-300">{log.outputTokens.toLocaleString()}</td>
                                    <td className="py-2 px-2 text-right text-white font-medium">{log.totalTokens.toLocaleString()}</td>
                                    <td className="py-2 px-2 text-right text-green-400">${log.totalCost.toFixed(6)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            No token usage data available for the selected filters.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TokenAnalyticsPanel;
