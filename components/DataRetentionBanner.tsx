import React, { useMemo } from 'react';
import { Shop, SubscriptionPlan } from '../types';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import { useLocalization } from '../hooks/useLocalization';
import { getRetentionDays } from '../services/utils';

interface DataRetentionBannerProps {
  shop: Shop;
  onConfirmClear: () => void;
  onScheduleExtension: () => void;
}

const DataRetentionBanner: React.FC<DataRetentionBannerProps> = ({ shop, onConfirmClear, onScheduleExtension }) => {
  const { t } = useLocalization();
  const { subscription, formSubmissions, liveConversations } = shop;
  const { plan, dataHistoryExtension, dataRetentionWarningDismissed } = subscription;

  const retentionDays = useMemo(() => getRetentionDays(plan), [plan]);
  
  const oldestDataTimestamp = useMemo(() => {
    const submissionTimestamps = formSubmissions.map(s => s.submittedAt);
    const conversationTimestamps = liveConversations.map(c => c.lastMessageAt);
    const allTimestamps = [...submissionTimestamps, ...conversationTimestamps];
    return allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
  }, [formSubmissions, liveConversations]);

  const showBanner = useMemo(() => {
    const status = dataHistoryExtension?.status;
    if (status === 'active' || status === 'pending_activation' || status === 'pending_approval' || dataRetentionWarningDismissed) {
      return false;
    }
    
    // Proactive trigger: 14 days before expiry
    const warningThreshold = Date.now() - ((retentionDays - 14) * 24 * 60 * 60 * 1000);
    const isApproachingLimit = oldestDataTimestamp < warningThreshold;
    
    // Reactive trigger: if data is already over the limit (for recurring monthly choice)
    const retentionCutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const isOverLimit = oldestDataTimestamp < retentionCutoff;

    return isApproachingLimit || isOverLimit;
  }, [oldestDataTimestamp, retentionDays, dataHistoryExtension, dataRetentionWarningDismissed]);

  if (!showBanner) {
    return null;
  }
  
  const retentionCutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  const isOverLimit = oldestDataTimestamp < retentionCutoff;

  const message = isOverLimit
    ? t('dataRetentionWarning', { retentionDays: retentionDays.toString() })
    : t('dataRetentionEndingSoon', { retentionDays: retentionDays.toString() });

  return (
    <div className="bg-yellow-900/60 border-b-2 border-yellow-700/80 text-yellow-100 p-3 text-sm flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
      <AlertTriangleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
      <div className="flex-grow">
        <p>{message}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
         <button
            onClick={onConfirmClear}
            className="bg-gray-700/50 hover:bg-gray-600/50 text-white font-semibold py-1.5 px-4 rounded-md transition-colors text-xs"
        >
            {t('keepRecentData')}
        </button>
        <button
            onClick={onScheduleExtension}
            className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold py-1.5 px-4 rounded-md transition-colors text-xs"
        >
            {t('extendAndKeepAll')}
        </button>
      </div>
    </div>
  );
};

export default DataRetentionBanner;
