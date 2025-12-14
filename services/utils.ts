import { SubscriptionPlan } from '../types';

export const getRetentionDays = (plan: SubscriptionPlan): number => {
    switch (plan) {
        case 'Starter': return 90;
        case 'Brand': return 180; // 6 months
        case 'Pro':
        case 'Trial': return 450; // 15 months
        default: return 90;
    }
};
