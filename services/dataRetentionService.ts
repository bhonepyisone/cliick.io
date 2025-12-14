import { Shop } from '../types';
import { getRetentionDays } from './utils';

// This function encapsulates the logic for checking and applying data retention policies.
export const checkAndApplyDataRetention = (
    shop: Shop,
    updateShop: (updater: (prevShop: Shop) => Shop) => void,
    setAutoCleanupNotification: (message: string | null) => void
) => {
    // Guard: subscription might not exist on temporary shops
    if (!shop.subscription) return;
    
    const dataExt = shop.subscription.dataHistoryExtension;
    const retentionDays = getRetentionDays(shop.subscription.plan);

    // 1. Check for permanent deletion if scheduled
    if (dataExt?.status === 'pending_deletion' && dataExt.deletionScheduledAt) {
        const gracePeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
        if (Date.now() > dataExt.deletionScheduledAt + gracePeriod) {
            // Perform "hard delete" and update status
            const retentionCutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

            updateShop(s => {
                const updatedSubmissions = (s.formSubmissions ?? []).filter(sub => sub.submittedAt >= retentionCutoff);
                const updatedConversations = (s.liveConversations ?? []).filter(convo => convo.lastMessageAt >= retentionCutoff);
                const updatedItems = (s.items ?? []).map(item => ({
                    ...item,
                    stockHistory: (item.stockHistory || []).filter(h => h.timestamp >= retentionCutoff)
                }));
                const updatedExpenses = (s.expenses || []).filter(e => new Date(e.date).getTime() >= retentionCutoff);
                
                const updatedTodos = (s.todos || []).filter(t => 
                    (!t.isCompleted && t.createdAt >= retentionCutoff) || // Keep active tasks within main retention
                    (t.isCompleted && t.completedAt && t.completedAt >= sevenDaysAgo) // Keep completed tasks within 7 days
                );

                const updatedCalendarTasks = (s.calendarTasks || []).filter(t => new Date(t.date).getTime() >= retentionCutoff);

                setAutoCleanupNotification('Permanent deletion of old data has been completed as per your plan.');
                return {
                    ...s,
                    formSubmissions: updatedSubmissions,
                    liveConversations: updatedConversations,
                    items: updatedItems,
                    expenses: updatedExpenses,
                    todos: updatedTodos,
                    calendarTasks: updatedCalendarTasks,
                    subscription: {
                        ...s.subscription,
                        dataHistoryExtension: {
                            ...(s.subscription.dataHistoryExtension || {}),
                            status: 'deletion_applied',
                        },
                    },
                };
            });
            return; // Exit after processing hard delete
        }
    }
    
    // 2. Conditions for auto-opt-out (soft delete)
    const shouldCheckForOptOut = 
        (dataExt?.status === 'inactive' || !dataExt) &&
        !shop.subscription.dataRetentionWarningDismissed;
        
    if (!shouldCheckForOptOut) return;
    
    const retentionCutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    
    const hasExpiredData = 
        (shop.formSubmissions ?? []).some(sub => sub.submittedAt < retentionCutoff) ||
        (shop.liveConversations ?? []).some(convo => convo.lastMessageAt < retentionCutoff);
        
    if (hasExpiredData) {
        // Data is older than retention period, perform a "soft delete" and schedule permanent deletion
        updateShop(s => {
            setAutoCleanupNotification(`Your shop's data is older than your plan's ${retentionDays}-day limit. Older data has been hidden and is scheduled for permanent deletion.`);
            return {
                ...s,
                subscription: {
                    ...s.subscription,
                    dataHistoryExtension: {
                        ...(s.subscription.dataHistoryExtension || {}),
                        status: 'pending_deletion',
                        deletionScheduledAt: Date.now(),
                    },
                    dataRetentionWarningDismissed: true,
                },
            };
        });
    }
};