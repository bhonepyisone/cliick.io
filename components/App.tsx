import React, { useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import api from '../services/apiService';
import { Shop, Form, FormSubmission, KeywordReply, Item, KnowledgeSection, PersistentMenuItem, CarouselItem, QuickReplyAction, PersistentMenuItemType, Content, ShopPaymentMethod, OrderStatus, LiveChatConversation, Attachment, OfflineSaleConfig, OnlineSaleConfig, SubscriptionPlan, Role, User, AssistantConfig, CustomerEntryPoint, Message, MessageSender, Language } from '../types';
import ConfigurationPanel from './ConfigurationPanel';
import ChatWindow from './ChatWindow';
import ProductCatalog from './ProductCatalog';
import KnowledgeBaseEditor from './KnowledgeBaseEditor';
import PublishPanel from './PublishPanel';
import KeywordAutomationPanel from './KeywordAutomationPanel';

import BotIcon from './icons/BotIcon';
import BoxIcon from './icons/BoxIcon';
import BookIcon from './icons/BookIcon';
import LinkIcon from './icons/LinkIcon';
import AutomationIcon from './icons/AutomationIcon';
import TrialBanner from './TrialBanner';
import DashboardIcon from './icons/DashboardIcon';
import MainDashboard from './MainDashboard';
import PlatformAnnouncementBanner from './PlatformAnnouncementBanner';
import FormPreview from './FormPreview';
import XIcon from './icons/XIcon';
import SwitchHorizontalIcon from './icons/SwitchHorizontalIcon';
import CliickLogo from './icons/CliickLogo';
import InboxIcon from './icons/InboxIcon';
import LiveChatPanel from './LiveChatPanel';
import ManageOrderPanel from './ManageOrderPanel';
import ShoppingCartIcon from './icons/ShoppingCartIcon';
import SettingsIcon from './icons/SettingsIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import DataRetentionBanner from './DataRetentionBanner';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import SettingsPanel, { SubTab as SettingsSubTab } from './SettingsPanel';
import CogIcon from './icons/CogIcon';
import LogoutIcon from './icons/LogoutIcon';
import StoreIcon from './icons/StoreIcon';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import DollarSignIcon from './icons/DollarSignIcon';
import AccountantPanel from './AccountantPanel';
import { useChatLogic } from '../hooks/useChatLogic';
import UsersIcon from './icons/UsersIcon';
import { getRetentionDays } from '../services/utils';
import UserIcon from './icons/UserIcon';
import { usePermissions } from '../hooks/usePermissions';
import { checkAndApplyDataRetention } from '../services/dataRetentionService';


interface AppProps {
  shopId: string;
  onSelectShop: (shopId: string | null) => void;
}

type Tab = 'dashboard' | 'inbox' | 'assistant' | 'products' | 'manage_order' | 'training' | 'automations' | 'publish' | 'settings' | 'accountant';

const UsageLimitBanner: React.FC<{ onUpgrade: () => void, limit: number, plan: string }> = ({ onUpgrade, limit, plan }) => {
    const { t } = useLocalization();
    const upgradePlan = plan.toLowerCase().includes('starter') ? 'Growth' : 'Pro';
    return (
        <div className="bg-yellow-800 text-white text-center p-3 text-sm flex items-center justify-center gap-4">
            <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 text-yellow-300" />
            <span>Congratulations! Your AI has made {limit} automated sales this month. To continue making sales automatically, please upgrade your plan.</span>
            <button
                onClick={onUpgrade}
                className="bg-white text-yellow-800 font-bold py-1 px-3 rounded-md hover:bg-gray-200 transition-colors"
            >
                Upgrade to {upgradePlan}
            </button>
        </div>
    );
};

const ConfirmDeletionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    retentionDays: number;
}> = ({ isOpen, onClose, onConfirm, retentionDays }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-yellow-300 flex items-center gap-2">
                        <AlertTriangleIcon className="w-5 h-5" />
                        Confirm Opt-Out of Data Extension
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-6 space-y-4">
                    <p className="text-gray-300">This will schedule the permanent deletion of historical data from this shop instead of extending its retention period.</p>
                    <p className="bg-gray-900/50 p-3 rounded-md border border-gray-600">
                        Once confirmed, all <strong>Order Records</strong> and <strong>Inbox Conversations</strong> older than <strong>{retentionDays} days</strong> will be hidden and scheduled for permanent deletion in <strong>30 days</strong>.
                    </p>
                    <p className="font-semibold text-gray-200">This action can be undone during the 30-day grace period. Do you want to proceed?</p>
                </div>
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-yellow-900 rounded-md font-semibold">Confirm & Schedule Deletion</button>
                </footer>
            </div>
        </div>
    );
};


const WebviewPreview: React.FC<{
  form: Form;
  items: Item[];
  paymentMethods: ShopPaymentMethod[];
  onFormSubmit: (submission: FormSubmission) => void;
  onClose: () => void;
  currency: string;
}> = ({ form, items, paymentMethods, onFormSubmit, onClose, currency }) => {
    return (
        <div 
            className="absolute inset-0 bg-black/50 flex flex-col items-center justify-end z-30"
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-[#1D3B59] w-full max-w-lg h-[90%] max-h-[700px] rounded-t-lg shadow-2xl flex flex-col animate-slide-up"
            >
                {/* Header */}
                <header className="flex-shrink-0 p-4 border-b border-[#2c4f73] flex justify-between items-center">
                    <h2 className="text-lg font-bold text-[#F6F9FC] truncate">{form.name}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-400 hover:bg-[#2c4f73] hover:text-[#F6F9FC]"
                        aria-label="Close form preview"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                
                {/* Body with FormPreview */}
                <div className="flex-grow overflow-hidden">
                    <FormPreview 
                        form={form} 
                        onFormSubmit={onFormSubmit}
                        items={items}
                        paymentMethods={paymentMethods}
                        currency={currency}
                    />
                </div>
            </div>
        </div>
    );
};

const App: React.FC<AppProps> = ({ shopId, onSelectShop }) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsSubTab>('my_account');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [scrollToDataExtension, setScrollToDataExtension] = useState(false);
  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [autoCleanupNotification, setAutoCleanupNotification] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(api.getCurrentUser());
  const [confirmationModalConfig, setConfirmationModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmText?: string;
    confirmButtonClass?: string;
  } | null>(null);

  // This dummy state is used to force a re-render when platform settings change
  const [settingsVersion, setSettingsVersion] = useState(0);

  const { language, setLanguage, t } = useLocalization();
  const { showToast } = useToast();
  
  // --- Permissions Hook ---
  const permissions = usePermissions(shop, settingsVersion);

  // --- Chat Logic moved to Hook ---
  const chatHook = useChatLogic({
      shop: shop,
      onUpdateShop: (updater) => updateShop(updater),
      t, // Pass the translation function
  });

  const { messages, isLoading, activeForm, setActiveForm, handleSendMessage, handleQuickReplyClick, handleCarouselButtonClick, handleSendAttachment } = chatHook || {};

  const isChatAssistantTab = useMemo(() => {
    const chatAssistantTabs = ['assistant', 'training', 'automations', 'publish'];
    return chatAssistantTabs.includes(activeTab);
  }, [activeTab]);

  useEffect(() => {
    // Open preview by default when navigating TO a chat tab.
    // It will be removed from the DOM when navigating away.
    if (isChatAssistantTab) {
      setIsPreviewVisible(true);
    }
  }, [isChatAssistantTab]);

   useEffect(() => {
        if (activeTab !== 'settings') {
            setInitialSettingsTab('my_account');
        }
    }, [activeTab]);
    
    // This effect ensures that the app reacts to changes in platform-wide settings (e.g., from the admin dashboard)
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'ai_shop_platform_settings') {
                // The storage event in platformSettingsService will invalidate the cache.
                // We just need to trigger a re-render here so usePermissions hook re-evaluates.
                setSettingsVersion(v => v + 1);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);


  const showConfirmation = (config: Omit<NonNullable<typeof confirmationModalConfig>, 'isOpen'>) => {
    setConfirmationModalConfig({ ...config, isOpen: true });
  };

  const closeConfirmation = () => {
    setConfirmationModalConfig(null);
  };

  const currentUserRole = useMemo(() => {
    if (!currentUser || !shop) return null;
    // Shop owner is always OWNER role, even if not in team array
    if (shop.ownerId === currentUser.id) {
      return Role.OWNER;
    }
    // Check team members for other roles
    const teamMember = shop.team?.find(m => m.userId === currentUser.id);
    return teamMember ? teamMember.role : null;
  }, [shop, currentUser]);

  const updateShop = useCallback((updater: (prevShop: Shop) => Shop) => {
      setShop(prevShop => {
          if (!prevShop) return null;
          const updatedShop = updater(prevShop);
          api.saveShop(updatedShop);
          return updatedShop;
      });
  }, []);

  useEffect(() => {
    const fetchShop = async () => {
        console.log('🔄 Fetching shop with ID:', shopId);
        const loadedShop = await api.getShopById(shopId);
        console.log('✅ Shop loaded:', loadedShop);
        if (!loadedShop) {
          console.error('❌ Shop is null after fetching');
        }
        setShop(loadedShop);
    };
    fetchShop();
  }, [shopId]);

  // Memoize the product data string to avoid re-calculation on every render.
  const productDataString = useMemo(() => {
    if (!shop) return '';
    return (shop.items?.length ?? 0) > 0
        ? "## Item Catalog\n" + (shop.items || []).map(p => 
            `### ${p.name}\n` +
            `- Item Type: ${p.itemType}\n` +
            `- Description: ${p.description}\n` +
            (p.facebookSubtitle ? `- Short Summary: ${p.facebookSubtitle}\n` : '') +
            `- Price: ${p.retailPrice} ${shop.currency}\n` +
            `- Stock/Capacity: ${p.stock}\n` +
            (p.category ? `- Category: ${p.category}\n` : '') +
            (p.itemType === 'product' && p.warranty ? `- Warranty: ${p.warranty}\n` : '') +
            (p.itemType === 'service' && p.duration ? `- Duration: ${p.duration} minutes\n` : '') +
            (p.itemType === 'service' && p.location ? `- Location: ${p.location}\n` : '')
        ).join('\n\n')
        : "No product information available.";
  }, [shop?.items, shop?.currency]);

  // This effect synchronizes the memoized product data string with the shop state.
  useEffect(() => {
      if (shop && shop.knowledgeBase?.productData !== productDataString) {
          updateShop(prevShop => ({
              ...prevShop,
              knowledgeBase: {
                  ...prevShop.knowledgeBase,
                  productData: productDataString
              }
          }));
      }
  }, [shop, productDataString, updateShop]);

  
  // This effect handles the data retention lifecycle by calling the dedicated service.
  useEffect(() => {
    if (!shop) return;
    checkAndApplyDataRetention(shop, updateShop, setAutoCleanupNotification);
  }, [shop, updateShop]);


  const handleTabChange = (tab: Tab, subTab?: SettingsSubTab) => {
    if (tab === 'settings' && subTab) {
        setInitialSettingsTab(subTab);
    }
    const chatAssistantTabs = ['assistant', 'training', 'automations', 'publish'];
    if (!chatAssistantTabs.includes(tab)) {
        setActiveForm?.(null); // Reset form preview when leaving assistant tabs
    }
    setActiveTab(tab);
  };
  
  const handlePreviewFormSubmit = (submission: FormSubmission) => {
    if (!shop) return;
    const newOrderId = `PREVIEW-${Date.now()}`;
    
    showToast(`(PREVIEW) Form submitted successfully! Your Order ID would be: ${newOrderId}`, 'success');
    setActiveForm?.(null);
    
    const botMessage: Message = {
        sender: MessageSender.BOT,
        text: `(Preview) Thank you for your order! Your Order ID is **${newOrderId}**. Please save this for any future inquiries about your order.`,
    };
    
    // Create a dummy sendBotResponse to keep the flow
    const sendBotResponseWithDelay = (botMessage: Message) => {
        if (!shop) return;
        const delay = (shop.assistantConfig.responseDelay || 0) * 1000;
        setTimeout(() => {
            // Cannot setMessages directly, this logic is now in the hook.
            // The user will just not get an automatic reply here, which is acceptable for a preview.
        }, delay);
    };
    sendBotResponseWithDelay(botMessage);
  };
  
    const handleScheduleDataDeletion = () => {
      if (!shop) return;
      updateShop(s => ({
          ...s,
          subscription: {
              ...s.subscription,
              dataHistoryExtension: {
                  ...(s.subscription.dataHistoryExtension || {}),
                  status: 'pending_deletion',
                  deletionScheduledAt: Date.now(),
              },
              dataRetentionWarningDismissed: true, // Hide banner after they've taken action
          },
      }));
      setIsDeletionModalOpen(false);
  };

  const handleScheduleDataExtension = () => {
    if (!shop) return;
    updateShop(s => ({
        ...s,
        subscription: {
            ...s.subscription,
            dataHistoryExtension: {
                ...(s.subscription.dataHistoryExtension || {}),
                status: 'pending_activation',
                isCommitted: false,
            },
            dataRetentionWarningDismissed: true, // Hide banner after they've taken action
        }
    }));
  };

  const handleCancelScheduledExtension = () => {
    if (!shop) return;
    updateShop(s => ({
        ...s,
        subscription: {
            ...s.subscription,
            dataHistoryExtension: {
                ...(s.subscription.dataHistoryExtension || {}),
                status: 'inactive',
                isCommitted: undefined, // Reset the committed flag
            },
            dataRetentionWarningDismissed: false
        }
    }));
  };

  const handleCommitToDataExtensionFromGracePeriod = () => {
    if (!shop) return;
    updateShop(s => ({
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
    if (!shop) return;
    updateShop(s => ({
        ...s,
        subscription: {
            ...s.subscription,
            dataHistoryExtension: {
                status: 'pending_activation',
                ...(s.subscription.dataHistoryExtension || {}),
                deletionScheduledAt: undefined, // Clear any old deletion timestamp
                isCommitted: true, // This is a binding action
            },
            dataRetentionWarningDismissed: true
        }
    }));
  };

  const handleCancelRenewal = () => {
    if (!shop) return;
    showConfirmation({
      title: 'Cancel Renewal',
      message: 'Are you sure you want to cancel your Data History Extension renewal? It will remain active until the end of your current billing period.',
      confirmText: 'Confirm',
      onConfirm: () => {
        updateShop(s => ({
            ...s,
            subscription: {
                ...s.subscription,
                dataHistoryExtension: {
                    ...(s.subscription.dataHistoryExtension || {}),
                    status: 'pending_cancellation',
                },
            }
        }));
      }
    });
  };

  const handleUndoCancellation = () => {
    if (!shop) return;
    updateShop(s => ({
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

  const handleUpgradeForRetention = () => {
      handleScheduleDataExtension();
      handleTabChange('settings');
      setScrollToDataExtension(true);
  };
  
    const handleSchedulePlanChange = (newPlan: SubscriptionPlan) => {
        updateShop(s => ({
            ...s,
            subscription: {
                ...s.subscription,
                pendingPlan: newPlan,
            },
        }));
    };

    const handleCancelScheduledChange = () => {
        showConfirmation({
            title: 'Cancel Scheduled Change',
            message: 'Are you sure you want to cancel this scheduled plan change?',
            confirmText: 'Confirm',
            onConfirm: () => {
                updateShop(s => ({
                    ...s,
                    subscription: {
                        ...s.subscription,
                        pendingPlan: null,
                    },
                }));
            }
        });
    };


  if (!shop || !chatHook || !permissions) {
    console.warn('⚠️ Waiting for shop/chatHook/permissions:', { shop: !!shop, chatHook: !!chatHook, permissions: !!permissions });
    return <div className="flex items-center justify-center h-screen bg-[#0A2540] text-[#F6F9FC]">Loading shop...</div>;
  }
  
  const TABS: { id: Tab | string; name: string; icon: React.ReactNode; badge?: () => number; children?: { id: Tab; name: string; icon: React.ReactNode }[]; roles: Role[] }[] = [
    { id: 'dashboard', name: t('dashboard'), icon: <DashboardIcon className="w-5 h-5" />, roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] },
    { id: 'inbox', name: t('inbox'), icon: <InboxIcon className="w-5 h-5" />, badge: () => (shop.liveConversations || []).filter(c => !c.isRead).length, roles: [Role.OWNER, Role.ADMIN, Role.SUPPORT_AGENT, Role.ORDER_MANAGER] },
    {
      id: 'chat_assistant_group',
      name: t('chatAssistant'),
      icon: <BotIcon className="w-5 h-5" />,
      roles: [Role.OWNER, Role.ADMIN],
      children: [
        { id: 'assistant', name: t('setupAssistant'), icon: <CogIcon className="w-5 h-5" /> },
        { id: 'training', name: t('trainAssistant'), icon: <BookIcon className="w-5 h-5" /> },
        { id: 'automations', name: t('automations'), icon: <AutomationIcon className="w-5 h-5" /> },
        { id: 'publish', name: t('publishAndShare'), icon: <LinkIcon className="w-5 h-5" /> }
      ]
    },
    { id: 'products', name: t('products'), icon: <BoxIcon className="w-5 h-5" />, roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER] },
    { id: 'manage_order', name: t('saleAssistant'), icon: <ShoppingCartIcon className="w-5 h-5" />, roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] },
    { id: 'accountant', name: t('accountant'), icon: <DollarSignIcon className="w-5 h-5"/>, roles: [Role.OWNER, Role.ADMIN] },
  ];

  const settingsTab = { id: 'settings', name: t('settings'), icon: <SettingsIcon className="w-5 h-5" />, roles: [Role.OWNER, Role.ADMIN, Role.ORDER_MANAGER, Role.SUPPORT_AGENT] };

  const getTabClass = (tabId: Tab | string, isActive: boolean) => {
    let classes = 'flex items-center gap-3 w-full text-left px-3 py-2 rounded-md transition-colors text-sm';
    if (isActive) {
      classes += ' bg-[#635BFF] text-white font-semibold';
    } else {
      classes += ' text-gray-300 hover:bg-gray-700 hover:text-white';
    }
    return classes;
  };
   
  const handleLogout = async () => {
    await api.logout();
    onSelectShop(null);
  };

  const handleUserUpdate = (user: User) => {
    setCurrentUser(user);
    // Optionally update user data globally if needed
  };
  
  const getSubTabClass = (tab: Tab, activeTab: Tab) => {
      let classes = 'flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs';
      if(tab === activeTab) {
          classes += ' bg-gray-600 text-white font-medium';
      } else {
          classes += ' text-gray-400 hover:bg-gray-700 hover:text-white';
      }
      return classes;
  }
  
  const visibleTabs = TABS.filter(tab => {
    // If no role found, show all tabs anyway to help with debugging
    if (!currentUserRole) {
      console.warn('⚠️ currentUserRole is null, showing all tabs as fallback');
      return true;
    }
    return tab.roles.includes(currentUserRole);
  });
  const activeTabGroup = visibleTabs.find(tab => tab.id === activeTab || tab.children?.some(child => child.id === activeTab));
  
  const commerceLimit = permissions.getLimit('conversationalCommerce');
  const commerceUsage = shop.conversationalCommerceUsage?.count ?? 0;
  const isCommerceLimitReached = commerceLimit !== null && commerceUsage >= commerceLimit;


  return (
    <>
      <PlatformAnnouncementBanner />
      {autoCleanupNotification && (
          <div className="bg-yellow-800 text-white text-center p-3 text-sm flex items-center justify-center gap-4">
              <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{autoCleanupNotification}</span>
              <button
                  onClick={() => setAutoCleanupNotification(null)}
                  className="p-1 hover:bg-yellow-700 rounded-full"
              >
                  <XIcon className="w-4 h-4" />
              </button>
          </div>
      )}
      {shop?.subscription?.status === 'trialing' && <TrialBanner subscription={shop.subscription} onUpgrade={() => handleTabChange('settings')} />}
      {isCommerceLimitReached && shop?.subscription?.plan && <UsageLimitBanner onUpgrade={() => handleTabChange('settings', 'subscription')} limit={commerceLimit} plan={shop.subscription.plan} />}
      {shop?.subscription && <DataRetentionBanner shop={shop} onConfirmClear={handleScheduleDataDeletion} onScheduleExtension={handleUpgradeForRetention}/>}
      {isDeletionModalOpen && shop?.subscription?.plan && <ConfirmDeletionModal isOpen={isDeletionModalOpen} onClose={() => setIsDeletionModalOpen(false)} onConfirm={handleScheduleDataDeletion} retentionDays={getRetentionDays(shop.subscription.plan)} />}
      <div className="flex h-screen bg-[#0A2540] text-[#F6F9FC] overflow-x-hidden">
        {/* Main Navigation */}
        <aside className="w-64 bg-[#1D3B59] p-4 flex flex-col border-r border-[#2c4f73]">
          <div className="flex-shrink-0 mb-8 flex items-center justify-between">
            <CliickLogo className="h-8" />
             <button
                onClick={() => onSelectShop(null)}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white"
                title="Switch Shop"
            >
                <SwitchHorizontalIcon className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="flex-grow space-y-2">
            {visibleTabs.map(tab => {
                if(tab.children) {
                    const isGroupActive = activeTabGroup?.id === tab.id;
                    return (
                        <div key={tab.id}>
                            <button className={getTabClass(tab.id, isGroupActive)} onClick={() => handleTabChange(tab.children![0].id)}>
                                {tab.icon}
                                <span>{tab.name}</span>
                                <ChevronDownIcon className={`w-4 h-4 ml-auto transition-transform ${isGroupActive ? 'rotate-180' : ''}`} />
                            </button>
                            {isGroupActive && (
                                <div className="pl-6 pt-1 space-y-1">
                                    {tab.children.map(child => (
                                        <button key={child.id} onClick={() => handleTabChange(child.id as Tab)} className={getSubTabClass(child.id, activeTab)}>
                                            {child.icon}
                                            <span>{child.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }
                return (
                    <button key={tab.id} onClick={() => handleTabChange(tab.id as Tab)} className={getTabClass(tab.id, activeTab === tab.id)}>
                        {tab.icon}
                        <span>{tab.name}</span>
                         {tab.badge && tab.badge() > 0 && (
                            <span className="ml-auto bg-yellow-500 text-yellow-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{tab.badge()}</span>
                        )}
                    </button>
                )
            })}
          </nav>

          <div className="flex-shrink-0 border-t border-[#2c4f73] pt-4">
            <div className="px-3 mb-4">
                <div className="flex items-center gap-2 text-sm border border-gray-600 rounded-full p-1">
                    {/* FIX: Cast 'my' to Language to satisfy TypeScript. This is needed because of a subtle type inference issue. */}
                    <button onClick={() => setLanguage('my' as Language)} className={`w-full px-2 py-0.5 rounded-full ${language === 'my' ? 'bg-[#635BFF] text-white' : 'text-gray-300 hover:bg-gray-700'}`}>{t('burmeseShort')}</button>
                    <button onClick={() => setLanguage('en')} className={`w-full px-2 py-0.5 rounded-full ${language === 'en' ? 'bg-[#635BFF] text-white' : 'text-gray-300 hover:bg-gray-700'}`}>{t('englishShort')}</button>
                </div>
            </div>
             <div className="flex items-center gap-3 p-2 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
                    {currentUser?.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt="User avatar" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-full h-full p-1.5 text-gray-400" />
                    )}
                </div>
                <div>
                    <p className="text-sm font-semibold">{currentUser?.username}</p>
                    <p className="text-xs text-gray-400">{currentUserRole}</p>
                </div>
            </div>
            { currentUserRole && settingsTab.roles.includes(currentUserRole) && (
                <button onClick={() => handleTabChange('settings')} className={`${getTabClass('settings', activeTab === 'settings')} mt-2`}>
                    {settingsTab.icon}
                    <span>{settingsTab.name}</span>
                </button>
            )}
             <button onClick={handleLogout} className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700">
                <LogoutIcon className="w-5 h-5" /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto relative">
            {activeTab === 'dashboard' && <MainDashboard shop={shop} onDismissChecklist={() => updateShop(s => ({...s, onboarding: { ...s.onboarding, checklistDismissed: true }}))} permissions={permissions} onUpdateShop={updateShop} onOpenResolveLimitModal={() => { /* Handle resolve limit */ }} />}
            {activeTab === 'inbox' && <LiveChatPanel shop={shop} updateShop={updateShop} showConfirmation={showConfirmation} />}
            {activeTab === 'products' && <ProductCatalog items={shop.items} onItemsChange={(newItems: Item[]) => updateShop(s => ({...s, items: newItems}))} permissions={permissions} forms={shop.forms} showConfirmation={showConfirmation} onlineSaleConfig={shop.onlineSaleConfig} paymentMethods={shop.paymentMethods} knowledgeBase={shop.knowledgeBase} orderConfig={shop.orderManagementFlowConfig} bookingConfig={shop.bookingFlowConfig} onUpdateShop={updateShop} shop={shop} />}
            {activeTab === 'manage_order' && <ManageOrderPanel shop={shop} onUpdateShop={updateShop} permissions={permissions} offlineSaleConfig={shop.offlineSaleConfig} onOfflineSaleConfigChange={(config) => updateShop(s => ({...s, offlineSaleConfig: config}))} onlineSaleConfig={shop.onlineSaleConfig} onOnlineSaleConfigChange={(config) => updateShop(s => ({...s, onlineSaleConfig: config}))} showConfirmation={showConfirmation} />}
            {activeTab === 'assistant' && <ConfigurationPanel shopName={shop.name} assistantConfig={shop.assistantConfig} onAssistantConfigChange={(config: AssistantConfig) => updateShop(s => ({...s, assistantConfig: config}))} businessName={shop.knowledgeBase.userDefined.find(s => s.title === 'Business Name')?.content || ''} onBusinessNameChange={(name: string) => updateShop(s => ({...s, knowledgeBase: {...s.knowledgeBase, userDefined: s.knowledgeBase.userDefined.map(ud => ud.title === 'Business Name' ? {...ud, content: name} : ud)}}))} aiNickname={shop.knowledgeBase.userDefined.find(s => s.title === 'AI Persona & Name')?.content || ''} onAiNicknameChange={(name: string) => updateShop(s => ({...s, knowledgeBase: {...s.knowledgeBase, userDefined: s.knowledgeBase.userDefined.map(ud => ud.title === 'AI Persona & Name' ? {...ud, content: name} : ud)}}))} permissions={permissions} />}
            {activeTab === 'training' && <KnowledgeBaseEditor knowledgeBase={shop.knowledgeBase} onKnowledgeBaseChange={(userDefined: KnowledgeSection[]) => updateShop(s => ({...s, knowledgeBase: {...s.knowledgeBase, userDefined}}))} permissions={permissions} showConfirmation={showConfirmation}/>}
            {activeTab === 'automations' && <KeywordAutomationPanel shop={shop} onUpdateShop={updateShop} onNavigate={handleTabChange} showConfirmation={showConfirmation} />}
            {activeTab === 'publish' && <PublishPanel shop={shop} shopId={shop.id} customUrlSlug={shop.customUrlSlug} onCustomUrlSlugChange={(slug: string) => updateShop(s => ({...s, customUrlSlug: slug}))} entryPoint={shop.customerEntryPoint} onEntryPointChange={(entryPoint) => updateShop(s => ({...s, customerEntryPoint: entryPoint}))} forms={shop.forms} persistentMenu={shop.persistentMenu} onPersistentMenuChange={(menu: PersistentMenuItem[]) => updateShop(s => ({...s, persistentMenu: menu}))} permissions={permissions} paymentMethods={shop.paymentMethods} knowledgeBase={shop.knowledgeBase} showConfirmation={showConfirmation} orderConfig={shop.orderManagementFlowConfig} bookingConfig={shop.bookingFlowConfig} onNavigate={(tab) => handleTabChange(tab)} />}
            {activeTab === 'accountant' && <AccountantPanel shop={shop} onUpdateShop={updateShop} currentUserRole={currentUserRole} />}
            {activeTab === 'settings' && <SettingsPanel shop={shop} onUpdateShop={updateShop} onSelectShop={onSelectShop} currentUserRole={currentUserRole} onUserUpdate={handleUserUpdate} showConfirmation={showConfirmation} initialSubTab={initialSettingsTab} />}
        
            {isChatAssistantTab && !isPreviewVisible && (
                <div className="absolute top-6 right-6 z-20 animate-fade-in-fast">
                    <button 
                        onClick={() => setIsPreviewVisible(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110"
                        title="Show Assistant Preview"
                        aria-label="Show Assistant Preview"
                    >
                        <BotIcon className="w-6 h-6" />
                    </button>
                </div>
            )}
        </main>
        
        {/* Chat Assistant Preview - ONLY RENDERED ON CHAT TABS */}
        {isChatAssistantTab && (
            <aside className={`transition-all duration-300 ease-in-out bg-[#0A2540] border-[#2c4f73] shrink-0 ${isPreviewVisible ? 'w-[420px] border-l' : 'w-0 border-l-0'}`}>
                <div className={`h-full w-[420px] overflow-hidden transition-opacity duration-300 ${isPreviewVisible ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full flex flex-col">
                        {chatHook && (
                            <div className="h-full flex flex-col p-4">
                                <div className="flex-shrink-0 flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold">Assistant Preview</h3>
                                    <button onClick={() => setIsPreviewVisible(false)} className="p-1 text-gray-400 hover:text-white"><XIcon className="w-5 h-5"/></button>
                                </div>
                                <div className="flex-grow flex items-center justify-center min-h-0">
                                    {/* Phone Frame */}
                                    <div className="relative mx-auto border-black bg-black border-[8px] rounded-[2.5rem] h-full max-h-[700px] w-full max-w-[340px] shadow-xl">
                                        {/* Notch */}
                                        <div className="w-[100px] h-[15px] bg-black top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-10"></div>
                                    
                                        {/* Screen Content */}
                                        <div className="rounded-[2rem] overflow-hidden w-full h-full">
                                        <ChatWindow 
                                                shop={shop}
                                                messages={messages!} 
                                                isLoading={isLoading!} 
                                                onSendMessage={handleSendMessage!}
                                                onQuickReplyClick={handleQuickReplyClick!}
                                                onCarouselButtonClick={handleCarouselButtonClick!}
                                                onSendAttachment={handleSendAttachment!}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        )}
        
        {activeForm && (
            <WebviewPreview 
                form={activeForm}
                items={shop.items}
                paymentMethods={shop.paymentMethods}
                onFormSubmit={handlePreviewFormSubmit}
                onClose={() => setActiveForm?.(null)}
                currency={shop.currency}
            />
        )}
      </div>

       {confirmationModalConfig?.isOpen && (
            <ConfirmationModal
                isOpen={true}
                onClose={closeConfirmation}
                onConfirm={() => {
                    confirmationModalConfig.onConfirm();
                    closeConfirmation();
                }}
                title={confirmationModalConfig.title}
                message={confirmationModalConfig.message}
                confirmText={confirmationModalConfig.confirmText}
                confirmButtonClass={confirmationModalConfig.confirmButtonClass}
            />
        )}
    </>
  );
};

export default App;