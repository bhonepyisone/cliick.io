import { useMemo } from 'react';
import { Shop, PlanFeatures, FeatureEntitlement, SubscriptionPlan, Role } from '../types';
import { hasPermission, canAccessTab, canAccessSettingsTab, isOwner, isAdminOrHigher } from '../utils/rolePermissions';

// Default platform settings fallback for MVP
const DEFAULT_SETTINGS = {
    subscriptionPlans: [
        { id: 'plan_trial', name: 'Trial', family: 'Trial' },
        { id: 'plan_free', name: 'Free', family: 'Free' },
        { id: 'plan_starter', name: 'Starter', family: 'Starter' },
        { id: 'plan_growth', name: 'Growth', family: 'Growth' },
    ],
    planEntitlements: {
        'Trial': { basicDashboards: { enabled: true }, conversationalCommerce: { enabled: true, limit: 5 }, aiPhotoStudio: { enabled: false }, aiDescriptionGeneration: { enabled: true, limit: 5 }, shopDashboardSuggestion: { enabled: false } },
        'Free': { basicDashboards: { enabled: true }, conversationalCommerce: { enabled: false }, aiPhotoStudio: { enabled: false }, aiDescriptionGeneration: { enabled: false }, shopDashboardSuggestion: { enabled: false } },
        'Starter': { basicDashboards: { enabled: true }, conversationalCommerce: { enabled: true, limit: 1 }, aiPhotoStudio: { enabled: true, limit: 5 }, aiDescriptionGeneration: { enabled: true, limit: 10 }, shopDashboardSuggestion: { enabled: true, limit: 5 } },
        'Growth': { basicDashboards: { enabled: true }, conversationalCommerce: { enabled: true, limit: null }, aiPhotoStudio: { enabled: true, limit: null }, aiDescriptionGeneration: { enabled: true, limit: null }, shopDashboardSuggestion: { enabled: true, limit: null } },
    }
};

// The hook now accepts settingsVersion and currentUserRole to control role-based permissions.
export const usePermissions = (shop: Shop | null, settingsVersion: number, currentUserRole: Role | null = null) => {
    const permissions = useMemo(() => {
        // Use default settings to avoid blocking the app on failed API calls
        const platformSettings = DEFAULT_SETTINGS;
        
        const getEntitlementsForPlan = (planId: SubscriptionPlan | undefined) => {
            if (!planId) return {};

            const { subscriptionPlans, planEntitlements } = platformSettings;
            
            // Find plan details by its ID (e.g., 'plan_starter', 'plan_growth_500')
            const planDetails = subscriptionPlans.find(p => p.id === planId);

            if (planDetails) {
                // Get base entitlements from family ('Growth') or name ('Starter')
                const baseEntitlementKey = planDetails.family || planDetails.name;
                const baseEntitlements = planEntitlements[baseEntitlementKey] || {};

                // Get specific overrides for this tier's ID
                const specificTierEntitlements = planEntitlements[planId] || {};

                // Merge, with specific tier values overwriting base values
                return { ...baseEntitlements, ...specificTierEntitlements };
            }
            
            // Fallback for legacy data where a plan NAME ('Starter') was used instead of an ID.
            return planEntitlements[planId] || {};
        };
        
        const entitlements = getEntitlementsForPlan(shop?.subscription?.plan);

        const can = (feature: keyof PlanFeatures): boolean => {
            return entitlements[feature]?.enabled ?? false;
        };

        const getLimit = (feature: keyof PlanFeatures): number | null => {
            let targetPlanId = shop?.subscription?.plan;

            // Check for an instant upgrade commitment for conversational commerce
            if (feature === 'conversationalCommerce' && shop?.subscription?.isUpgradeCommitted && shop?.subscription?.pendingPlan) {
                targetPlanId = shop.subscription.pendingPlan;
            }
            
            const targetEntitlements = getEntitlementsForPlan(targetPlanId);
            const limit = targetEntitlements[feature]?.limit;
            return limit === null || limit === undefined ? null : limit;
        };

        const isFeatureAllowed = (feature: keyof PlanFeatures, currentCount: number): boolean => {
            if (!can(feature)) {
                return false;
            }
            const limit = getLimit(feature);
            if (limit === null) { // null means unlimited
                return true;
            }
            return currentCount < limit;
        };
        
        const getRemainingCredits = (feature: 'aiPhotoStudio' | 'aiDescriptionGeneration' | 'shopDashboardSuggestion'): { remaining: number | null, limit: number | null } => {
            if (!shop || !can(feature)) return { remaining: 0, limit: getLimit(feature) };
            
            const limit = getLimit(feature);
            if (limit === null) return { remaining: null, limit: null }; // unlimited

            const usage = shop.aiCreditUsage?.[feature];
            if (!usage) return { remaining: limit, limit: limit };

            const now = new Date();
            const lastReset = new Date(usage.lastReset);
            if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
                return { remaining: limit, limit: limit }; // Credits have reset
            }

            return { remaining: Math.max(0, limit - usage.used), limit: limit };
        };

        const consumeCredit = (feature: 'aiPhotoStudio' | 'aiDescriptionGeneration' | 'shopDashboardSuggestion') => (prevShop: Shop): Shop => {
            if (!can(feature)) return prevShop;

            const now = Date.now();
            const currentUsage = prevShop.aiCreditUsage?.[feature];
            let newUsed = 1;
            let lastReset = now;

            if (currentUsage) {
                const currentResetDate = new Date(currentUsage.lastReset);
                if (currentResetDate.getMonth() === new Date(now).getMonth() && currentResetDate.getFullYear() === new Date(now).getFullYear()) {
                    newUsed = currentUsage.used + 1;
                    lastReset = currentUsage.lastReset;
                }
            }

            return {
                ...prevShop,
                aiCreditUsage: {
                    ...prevShop.aiCreditUsage,
                    photoStudio: prevShop.aiCreditUsage?.photoStudio || { used: 0, lastReset: 0 },
                    descriptionGeneration: prevShop.aiCreditUsage?.descriptionGeneration || { used: 0, lastReset: 0 },
                    shopDashboardSuggestion: prevShop.aiCreditUsage?.shopDashboardSuggestion || { used: 0, lastReset: 0 },
                    [feature]: {
                        used: newUsed,
                        lastReset: lastReset,
                    }
                }
            };
        };

        // Role-based permission checks
        const checkPermission = (permission: string): boolean => {
            if (!currentUserRole) return false;
            return hasPermission(currentUserRole, permission);
        };

        const checkTabAccess = (tabId: string): boolean => {
            if (!currentUserRole) return false;
            return canAccessTab(currentUserRole, tabId);
        };

        const checkSettingsTabAccess = (settingsTabId: string): boolean => {
            if (!currentUserRole) return false;
            return canAccessSettingsTab(currentUserRole, settingsTabId);
        };

        const checkIsOwner = (): boolean => {
            return isOwner(currentUserRole);
        };

        const checkIsAdminOrHigher = (): boolean => {
            return isAdminOrHigher(currentUserRole);
        };

        return { can, getLimit, isFeatureAllowed, getRemainingCredits, consumeCredit, checkPermission, checkTabAccess, checkSettingsTabAccess, checkIsOwner, checkIsAdminOrHigher };
    }, [shop, settingsVersion, currentUserRole]);

    return permissions;
};