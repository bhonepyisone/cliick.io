import React, { useState } from 'react';
import { PlatformSettings, PlanFeatures, FeatureEntitlement } from '../types';
import ToggleSwitch from './ToggleSwitch';
import InfoIcon from './icons/InfoIcon';
import ShoppingCartIcon from './icons/ShoppingCartIcon';

interface PlanManagementPanelProps {
    settings: PlatformSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<PlatformSettings | null>>;
}

const featureLabels: Record<keyof PlanFeatures, { name: string, description: string }> = {
    conversationalCommerce: { name: 'Conversational Commerce', description: 'Allows AI to create orders/bookings in chat.' },
    aiPhotoStudio: { name: 'AI Photo Studio', description: 'Enables AI image editing. Limit is monthly credits.' },
    aiDescriptionGeneration: { name: 'AI Description Generation', description: 'Enables AI content generation for products. Limit is monthly credits.' },
    shopDashboardSuggestion: { name: 'Shop Dashboard AI Suggestion', description: 'Monthly credits for the "Generate Suggestion" button in the Sale Assistant.' },
    basicDashboards: { name: 'Basic Dashboards', description: 'Access to the main dashboard with basic KPIs.' },
    advancedDashboards: { name: 'Advanced Sales Dashboards', description: 'Access to detailed sales analytics in "Sale Assistant".' },
    customUrlSlug: { name: 'Custom URL Slug', description: 'Allows shops to set a custom URL for their bot.' },
    itemCount: { name: 'Item Count Limit', description: 'The maximum number of items a shop can create. Leave blank for unlimited.' },
    keywordRuleCount: { name: 'Keyword Rule Limit', description: 'The maximum number of keyword automation rules. Leave blank for unlimited.' },
    trainingSectionCount: { name: 'Training Section Limit', description: 'The maximum number of custom "Train AI" sections. Leave blank for unlimited.' },
    deepThinking: { name: 'Deep Thinking Model', description: 'Allows access to the most advanced "Thinking" AI model.' },
    bulkActions: { name: 'Bulk Actions', description: 'Enables bulk import, export, and price adjustments for products.' },
    offlineSale: { name: 'Offline Sale (POS)', description: 'Enables the Point-of-Sale interface for manual order creation.' },
    paymentIntelligence: { name: 'Payment Intelligence', description: 'Automatically links customer payment screenshots to their conversational orders.' },
};

const PlanManagementPanel: React.FC<PlanManagementPanelProps> = ({ settings, onSettingsChange }) => {
    const { planEntitlements, growthPlanTierConfig, subscriptionPlans } = settings;
    const plans = ['Trial', 'Starter', 'Growth', 'Brand', 'Pro'].filter(p => p in planEntitlements || subscriptionPlans.some(sp => sp.name === p));
    const [activePlanTab, setActivePlanTab] = useState(plans[0] || 'Starter');

    const handleEntitlementChange = (plan: string, feature: keyof PlanFeatures, value: Partial<FeatureEntitlement>) => {
        onSettingsChange(prev => {
            if (!prev) return null;
            return {
                ...prev,
                planEntitlements: {
                    ...prev.planEntitlements,
                    [plan]: {
                        ...prev.planEntitlements[plan],
                        [feature]: {
                            ...prev.planEntitlements[plan]?.[feature],
                            ...value,
                        }
                    }
                }
            };
        });
    };
    
    const handleSubscriptionPlanChange = (planName: string, field: 'price' | 'features', value: string | number) => {
        const planId = subscriptionPlans.find(p => p.name === planName && (p.isTemplate || !p.family))?.id;
        onSettingsChange(prevSettings => {
            if (!prevSettings) return null;
            const updatedPlans = prevSettings.subscriptionPlans.map(plan => {
                if (plan.id === planId) {
                    if (field === 'price') {
                        return { ...plan, price: Number(value) };
                    } else { // features
                        return { ...plan, features: (value as string).split('\n') };
                    }
                }
                return plan;
            });
            return { ...prevSettings, subscriptionPlans: updatedPlans };
        });
    };

    const handleGrowthConfigChange = (field: keyof typeof growthPlanTierConfig, value: number) => {
        onSettingsChange(prev => {
            if (!prev) return null;
            return {
                ...prev,
                growthPlanTierConfig: {
                    ...prev.growthPlanTierConfig,
                    [field]: value,
                }
            };
        });
    };
    
    const handleCurrencyChange = (currency: 'MMK' | 'USD') => {
        onSettingsChange(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currency: currency,
            };
        });
    };

    const renderFeatureControl = (plan: string, featureKey: keyof PlanFeatures) => {
        const entitlement = planEntitlements[plan]?.[featureKey] as FeatureEntitlement | undefined;
        if (!entitlement) return null;

        const { name, description } = featureLabels[featureKey];
        const isCreditFeature = featureKey === 'aiPhotoStudio' || featureKey === 'aiDescriptionGeneration' || featureKey === 'shopDashboardSuggestion';
        const hasLimit = 'limit' in entitlement;

        return (
            <div key={featureKey} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-grow">
                    <h5 className="font-semibold text-white flex items-center gap-2">
                        {name}
                        <div className="relative group">
                            <InfoIcon className="w-4 h-4 text-gray-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10">
                                {description}
                            </div>
                        </div>
                    </h5>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    {hasLimit && (
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">{isCreditFeature ? 'Monthly Credits' : 'Limit'}</label>
                            <input
                                type="number"
                                value={entitlement.limit ?? ''}
                                onChange={(e) => handleEntitlementChange(plan, featureKey, { limit: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                                placeholder="Unlimited"
                                className="w-28 bg-gray-700 border border-gray-600 rounded p-2 text-sm"
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Enabled</label>
                        <ToggleSwitch
                            enabled={entitlement.enabled}
                            onChange={(isEnabled) => handleEntitlementChange(plan, featureKey, { enabled: isEnabled })}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-200">Subscription Currency</h3>
                <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg max-w-xs">
                    <button onClick={() => handleCurrencyChange('MMK')} className={`flex-1 text-center px-4 py-2 text-sm rounded-md transition-colors ${settings.currency === 'MMK' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                        MMK (Kyat)
                    </button>
                    <button onClick={() => handleCurrencyChange('USD')} className={`flex-1 text-center px-4 py-2 text-sm rounded-md transition-colors ${settings.currency === 'USD' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                        USD (Dollar)
                    </button>
                </div>
            </div>

             <div className="mb-8">
                 <h3 className="text-lg font-semibold mb-3 text-gray-200">Subscription Plans Texts</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['Starter', 'Growth', 'Brand', 'Pro'].map(planName => {
                         const planDetails = subscriptionPlans.find(p => p.name === planName && (p.isTemplate || !p.family));
                         if (!planDetails) return null;
                         const isGrowthTemplate = planDetails.isTemplate;

                         return (
                            <div key={planDetails.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                <h4 className="font-bold text-white mb-3">{planDetails.name} Plan</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Price ({settings.currency})</label>
                                        <input
                                            type="number"
                                            value={isGrowthTemplate ? '' : planDetails.price}
                                            onChange={e => handleSubscriptionPlanChange(planDetails.name, 'price', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white disabled:bg-gray-800 disabled:cursor-not-allowed"
                                            disabled={isGrowthTemplate}
                                            placeholder={isGrowthTemplate ? 'Set in Tier Configuration' : ''}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Features (one per line)</label>
                                        <textarea
                                            value={planDetails.features.join('\n')}
                                            onChange={e => handleSubscriptionPlanChange(planDetails.name, 'features', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"
                                            rows={8}
                                        />
                                        {isGrowthTemplate && (
                                            <p className="text-xs text-gray-400 mt-1">Use <code>{`{{transactions}}`}</code>, <code>{`{{price}}`}</code>, and <code>{`{{currency}}`}</code> placeholders.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                         );
                    })}
                 </div>
            </div>
            
            <div className="pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center gap-2"><ShoppingCartIcon className="w-5 h-5"/> Growth Plan Tier Configuration</h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Base Transaction Limit</label>
                        <input type="number" value={growthPlanTierConfig.baseTransactionLimit} onChange={e => handleGrowthConfigChange('baseTransactionLimit', Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Base Price ({settings.currency})</label>
                        <input type="number" value={growthPlanTierConfig.basePrice} onChange={e => handleGrowthConfigChange('basePrice', Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Transaction Increment</label>
                        <input type="number" value={growthPlanTierConfig.transactionIncrement} onChange={e => handleGrowthConfigChange('transactionIncrement', Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Price Increment ({settings.currency})</label>
                        <input type="number" value={growthPlanTierConfig.priceIncrement} onChange={e => handleGrowthConfigChange('priceIncrement', Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Number of Tiers</label>
                        <input type="number" value={growthPlanTierConfig.tierCount} onChange={e => handleGrowthConfigChange('tierCount', Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                </div>
            </div>

            <div className="flex border-b border-gray-700 my-6">
                {plans.map(plan => (
                    <button
                        key={plan}
                        onClick={() => setActivePlanTab(plan)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activePlanTab === plan ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        {plan}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {Object.keys(featureLabels).map(featureKey => renderFeatureControl(activePlanTab, featureKey as keyof PlanFeatures))}
            </div>
        </div>
    );
};

export default PlanManagementPanel;