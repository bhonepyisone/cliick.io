import React, { useState, useMemo } from 'react';
import { Shop, Role, SubscriptionPlan, User, Subscription } from '../types';
import SubscriptionPanel from './SubscriptionPanel';
import ShopSettingsPanel from './ShopSettingsPanel';
import TeamManagementPanel from './TeamManagementPanel';
import { deleteShop } from '../services/supabaseShopService';
import CreditCardIcon from './icons/CreditCardIcon';
import StoreIcon from './icons/StoreIcon';
import UsersIcon from './icons/UsersIcon';
import MyAccountPanel from './MyAccountPanel';
import BillingHistoryPanel from './BillingHistoryPanel';
import UserCircleIcon from './icons/UserCircleIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import ChannelsIcon from './icons/ChannelsIcon';
import IntegrationsPanel from './IntegrationsPanel';
import TagIcon from './icons/TagIcon';

interface SettingsPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    onSelectShop: (shopId: string | null) => void;
    currentUserRole: Role | null;
    onUserUpdate: (user: User) => void;
    showConfirmation: (config: any) => void;
    initialSubTab?: SubTab;
}

export type SubTab = 'my_account' | 'subscription' | 'billing_history' | 'shop_settings' | 'team_management' | 'integrations';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ shop, onUpdateShop, onSelectShop, currentUserRole, onUserUpdate, showConfirmation, initialSubTab }) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab || 'my_account');
    const { t } = useLocalization();
    const { showToast } = useToast();
    
    const handleDeleteShop = async () => {
        // The confirmation logic is now inside ShopSettingsPanel
        const success = await deleteShop(shop.id);
        if (success) {
            onSelectShop(null); // Go back to shop selector
            console.log('✅ Shop deleted from database');
        } else {
            showToast('Failed to delete shop. Please try again.', 'error');
        }
    };
    
    const TABS = useMemo(() => [
        { id: 'my_account' as SubTab, name: t('myAccount'), icon: <UserCircleIcon className="w-5 h-5"/>, roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] },
        { id: 'subscription' as SubTab, name: t('subscription'), icon: <CreditCardIcon className="w-5 h-5"/>, roles: [Role.OWNER] },
        { id: 'billing_history' as SubTab, name: t('billingHistory'), icon: <DocumentTextIcon className="w-5 h-5"/>, roles: [Role.OWNER] },
        { id: 'shop_settings' as SubTab, name: t('shopSettings'), icon: <StoreIcon className="w-5 h-5"/>, roles: [Role.OWNER, Role.ADMIN] },
        { id: 'integrations' as SubTab, name: t('integrations'), icon: <ChannelsIcon className="w-5 h-5"/>, roles: [Role.OWNER, Role.ADMIN] },
        { id: 'team_management' as SubTab, name: t('teamManagement'), icon: <UsersIcon className="w-5 h-5"/>, roles: [Role.OWNER, Role.ADMIN] },
    ], [t]);

    const visibleTabs = useMemo(() => 
        TABS.filter(tab => currentUserRole && tab.roles.includes(currentUserRole))
    , [TABS, currentUserRole]);
    
    React.useEffect(() => {
        // This effect synchronizes the active tab when external props (`initialSubTab` or `visibleTabs`) change.
        
        // 1. A new `initialSubTab` from the parent component takes highest priority.
        // This is used for navigating to a specific settings tab from another part of the app.
        if (initialSubTab && visibleTabs.some(t => t.id === initialSubTab)) {
            setActiveSubTab(initialSubTab);
            return;
        }
    
        // 2. If `initialSubTab` isn't being applied, we check if the current active tab
        // has become invalid due to a role change (which alters `visibleTabs`).
        // We use a functional update to get the latest `activeSubTab` state
        // without causing a re-render loop by adding it to the dependency array.
        setActiveSubTab(currentActiveTab => {
            if (!visibleTabs.some(t => t.id === currentActiveTab)) {
                // The current tab is no longer visible, so reset to the first available one.
                return visibleTabs[0]?.id || 'my_account';
            }
            // The current tab is still valid, so no change is needed.
            return currentActiveTab;
        });
    }, [visibleTabs, initialSubTab]);


    const getTabClass = (tabId: SubTab) => {
        return `flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeSubTab === tabId
                ? 'bg-[#635BFF] text-white'
                : 'text-gray-300 hover:bg-[#2c4f73]'
        }`;
    };

    const handleSchedulePlanChange = (newPlan: SubscriptionPlan) => {
        onUpdateShop(s => ({
            ...s,
            subscription: {
                ...s.subscription,
                pendingPlan: newPlan,
                isUpgradeCommitted: false, // Explicitly set to false for standard changes
            },
        }));
        showToast(t('planChangeScheduled', { plan: newPlan }), 'success');
    };

    const handleCancelScheduledChange = () => {
        showConfirmation({
            title: t('cancelPlanChange'),
            message: t('areYouSureCancelPlanChange'),
            confirmText: t('confirm'),
            confirmButtonClass: 'bg-blue-600 hover:bg-blue-700',
            onConfirm: () => {
                onUpdateShop(s => ({
                    ...s,
                    subscription: {
                        ...s.subscription,
                        pendingPlan: null,
                        isUpgradeCommitted: false,
                    },
                }));
                showToast(t('planChangeCancelled'), 'success');
            }
        });
    };

    // --- Handlers for SubscriptionPanel ---
    const handleSubscriptionChange = (subscription: Subscription) => {
        onUpdateShop(s => ({ ...s, subscription }));
    };

    const handleScheduleDataDeletion = () => {
        showConfirmation({
            title: t('confirmOptOut'),
            message: t('confirmOptOutMessage'),
            confirmText: t('confirmAndSchedule'),
            onConfirm: () => {
                onUpdateShop(s => ({
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
                }));
                showToast(t('dataDeletionScheduled'), 'info');
            }
        });
    };

    const handleScheduleDataExtension = () => {
        onUpdateShop(s => ({
            ...s,
            subscription: {
                ...s.subscription,
                dataHistoryExtension: {
                    ...(s.subscription.dataHistoryExtension || {}),
                    status: 'pending_activation',
                    isCommitted: false,
                },
                dataRetentionWarningDismissed: true,
            }
        }));
        showToast(t('dataExtensionScheduled'), 'success');
    };

    const handleCancelScheduledExtension = () => {
        onUpdateShop(s => ({
            ...s,
            subscription: {
                ...s.subscription,
                dataHistoryExtension: {
                    ...(s.subscription.dataHistoryExtension || {}),
                    status: 'inactive',
                    isCommitted: undefined,
                },
                dataRetentionWarningDismissed: false
            }
        }));
        showToast(t('dataExtensionScheduleCancelled'), 'info');
    };

    const handleCommitToDataExtensionFromGracePeriod = () => {
        onUpdateShop(s => ({
            ...s,
            subscription: {
                ...s.subscription,
                dataHistoryExtension: {
                    ...(s.subscription.dataHistoryExtension || {}),
                    status: 'pending_activation',
                    deletionScheduledAt: undefined,
                    isCommitted: true,
                },
                dataRetentionWarningDismissed: true
            }
        }));
    };

    const handleCommitToDataExtensionFromPostGrace = () => {
        onUpdateShop(s => ({
            ...s,
            subscription: {
                ...s.subscription,
                dataHistoryExtension: {
                    ...(s.subscription.dataHistoryExtension || {}),
                    status: 'pending_activation',
                    deletionScheduledAt: undefined,
                    isCommitted: true,
                },
                dataRetentionWarningDismissed: true
            }
        }));
    };

    const handleCancelRenewal = () => {
        showConfirmation({
            title: t('cancelRenewal'),
            message: t('cancelRenewalMessage'),
            onConfirm: () => onUpdateShop(s => ({
                ...s,
                subscription: {
                    ...s.subscription,
                    dataHistoryExtension: {
                        ...(s.subscription.dataHistoryExtension || {}),
                        status: 'pending_cancellation',
                    },
                }
            }))
        });
    };

    const handleUndoCancellation = () => {
        onUpdateShop(s => ({
            ...s,
            subscription: {
                ...s.subscription,
                dataHistoryExtension: {
                    ...(s.subscription.dataHistoryExtension || {}),
                    status: 'active',
                },
            }
        }));
    };

    const renderSubTabContent = () => {
        switch (activeSubTab) {
            case 'my_account':
                return <MyAccountPanel onUserUpdate={onUserUpdate} />;
            case 'subscription':
                return <SubscriptionPanel
                    shop={shop}
                    onSubscriptionChange={handleSubscriptionChange}
                    onSchedulePlanChange={handleSchedulePlanChange}
                    onCancelScheduledChange={handleCancelScheduledChange}
                    scrollToDataExtension={initialSubTab === 'subscription'} // A bit of a simplification
                    onScrollComplete={() => {}}
                    onCancelScheduledExtension={handleCancelScheduledExtension}
                    onCommitToDataExtensionFromGracePeriod={handleCommitToDataExtensionFromGracePeriod}
                    onCommitToDataExtensionFromPostGrace={handleCommitToDataExtensionFromPostGrace}
                    onScheduleDataDeletion={handleScheduleDataDeletion}
                    onScheduleDataExtension={handleScheduleDataExtension}
                    onCancelRenewal={handleCancelRenewal}
                    onUndoCancellation={handleUndoCancellation}
                />;
            case 'billing_history':
                return <BillingHistoryPanel />;
            case 'shop_settings':
                return <ShopSettingsPanel shop={shop} onUpdateShop={onUpdateShop} onDeleteShop={handleDeleteShop} currentUserRole={currentUserRole} showConfirmation={showConfirmation} />;
            case 'integrations':
                return <IntegrationsPanel shop={shop} onUpdateShop={onUpdateShop} />;
            case 'team_management':
                return <TeamManagementPanel shop={shop} onUpdateShop={onUpdateShop} currentUserRole={currentUserRole} showConfirmation={showConfirmation} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="h-full grid grid-cols-1 md:grid-cols-5 gap-6">
            <nav className="md:col-span-1 bg-[#1D3B59] p-4 rounded-lg flex flex-col">
                <h2 className="text-xl font-bold mb-6 text-white">{t('settings')}</h2>
                <ul className="space-y-2">
                    {visibleTabs.map(tab => (
                        <li key={tab.id}>
                            <button onClick={() => setActiveSubTab(tab.id)} className={getTabClass(tab.id)}>
                                {tab.icon}
                                <span>{tab.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <main className="md:col-span-4 h-full overflow-hidden">
                {renderSubTabContent()}
            </main>
        </div>
    );
};

export default SettingsPanel;