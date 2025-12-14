import React from 'react';
import { Subscription } from '../types';
import InfoIcon from './icons/InfoIcon';
import { useLocalization } from '../hooks/useLocalization';

interface TrialBannerProps {
    subscription: Subscription;
    onUpgrade: () => void; // Function to switch to the subscription view
}

const TrialBanner: React.FC<TrialBannerProps> = ({ subscription, onUpgrade }) => {
    const { t } = useLocalization();
    
    if (subscription.status !== 'trialing' && subscription.status !== 'expired') {
        return null;
    }

    const now = Date.now();
    let daysLeft = 0;
    if (subscription.trialEndsAt) {
        daysLeft = Math.ceil((subscription.trialEndsAt - now) / (1000 * 60 * 60 * 24));
    }

    const isExpired = subscription.status === 'expired' || daysLeft <= 0;

    if (isExpired) {
        return (
            <div className="bg-red-800 text-white text-center p-3 text-sm flex items-center justify-center gap-4">
                <InfoIcon className="w-5 h-5 flex-shrink-0" />
                <span>{t('trialEnded')}</span>
                <button
                    onClick={onUpgrade}
                    className="bg-white text-red-800 font-bold py-1 px-3 rounded-md hover:bg-gray-200 transition-colors"
                >
                    {t('upgradeNow')}
                </button>
            </div>
        );
    }
    
    return (
        <div className="bg-[#635BFF] text-white text-center p-3 text-sm flex items-center justify-center gap-4">
            <InfoIcon className="w-5 h-5 flex-shrink-0" />
            <span>
                {t('trialDaysLeft', { daysLeft: daysLeft.toString() })}
            </span>
            <button
                onClick={onUpgrade}
                className="bg-white text-[#635BFF] font-bold py-1 px-3 rounded-md hover:bg-gray-200 transition-colors"
            >
                {t('chooseYourPlan')}
            </button>
        </div>
    );
};

export default TrialBanner;