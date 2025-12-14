import React, { useMemo } from 'react';
import { Shop, OrderStatus, SubscriptionPlan, Role } from '../types';
import OnboardingChecklist from './OnboardingChecklist';
import ClockIcon from './icons/ClockIcon';
import UsersIcon from './icons/UsersIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import TrendingUpIcon from './icons/TrendingUpIcon';
import InboxIcon from './icons/InboxIcon';
import AutomationIcon from './icons/AutomationIcon';
import { useLocalization } from '../hooks/useLocalization';
import { getCurrentUser } from '../services/authService';
import { usePermissions } from '../hooks/usePermissions';
import SparklesIcon from './icons/SparklesIcon';
import SimpleBarChart from './SimpleBarChart';
import SimpleLineChart from './SimpleLineChart';


interface MainDashboardProps {
  shop: Shop;
  onDismissChecklist: () => void;
  permissions: ReturnType<typeof usePermissions>;
  onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
  onOpenResolveLimitModal: () => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string }> = ({ title, value, icon, subtext }) => (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
        <div className="flex items-center gap-2 md:gap-3">
            <div className="flex-shrink-0">{icon}</div>
            <h3 className="text-xs md:text-sm text-gray-400 font-medium truncate">{title}</h3>
        </div>
        <p className="text-2xl md:text-4xl font-bold text-white mt-2 md:mt-4 truncate" title={String(value)}>
            {value}
        </p>
        {subtext && <p className="text-xs md:text-sm text-gray-400 mt-1">{subtext}</p>}
    </div>
);

const ConversationalCommerceWidget: React.FC<{
  shop: Shop;
  onResolve: () => void;
  permissions: ReturnType<typeof usePermissions>;
}> = ({ shop, onResolve, permissions }) => {
    const { t } = useLocalization();
    const commerceLimit = permissions.getLimit('conversationalCommerce');
    const usage = shop.conversationalCommerceUsage?.count ?? 0;

    if (commerceLimit === null) {
        return null; // Don't show for plans with unlimited usage (Pro/Trial)
    }

    const percentage = Math.min(100, (usage / commerceLimit) * 100);
    const isLimitReached = percentage >= 100;

    return (
        <div className="bg-[#1D3B59] border border-[#2c4f73] rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-blue-400" />
                        {t('monthlyAutomatedConversions')}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Your AI has completed {usage} of {commerceLimit} automated sales this cycle.
                    </p>
                </div>
                {isLimitReached && (
                    <button
                        onClick={onResolve}
                        className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold py-2 px-4 rounded-lg"
                    >
                        {t('resolveNow')}
                    </button>
                )}
            </div>
            <div className="mt-4">
                <div className="w-full bg-[#2c4f73] rounded-full h-2.5">
                    <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${isLimitReached ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};


const MainDashboard: React.FC<MainDashboardProps> = ({ shop, onDismissChecklist, permissions, onUpdateShop, onOpenResolveLimitModal }) => {
    const { t } = useLocalization();
    const currentUser = getCurrentUser();

    const currentUserRole = useMemo(() => {
        if (!currentUser || !shop) return null;
        const teamMember = shop.team?.find(m => m.userId === currentUser.id);
        return teamMember ? teamMember.role : null;
    }, [shop, currentUser]);

    const chatbotMetrics = useMemo(() => {
        const completedOrders = (shop.formSubmissions ?? []).filter(s => s.status === OrderStatus.Completed).length;
        const totalConversations = (shop.liveConversations ?? []).length;
        const unreadCount = (shop.liveConversations ?? []).filter(c => !c.isRead).length;
        const needsAttentionCount = (shop.liveConversations ?? []).filter(c => c.status === 'open').length;
        const activeAutomations = (shop.keywordReplies ?? []).filter(r => r.enabled).length;

        const conversionRate = totalConversations > 0 ? (completedOrders / totalConversations) * 100 : 0;
        
        // Calculate actual bot response time from conversations
        let totalBotResponseTime = 0;
        let botResponseCount = 0;
        
        (shop.liveConversations ?? []).forEach(convo => {
            let lastUserMessageTime = 0;
            (convo.messages ?? []).forEach(msg => {
                if (msg.sender === 'user') {
                    lastUserMessageTime = msg.timestamp;
                } else if ((msg.sender === 'ai') && lastUserMessageTime > 0) {
                    const responseTime = msg.timestamp - lastUserMessageTime;
                    totalBotResponseTime += responseTime;
                    botResponseCount++;
                    lastUserMessageTime = 0;
                }
            });
        });
        
        const avgBotResponseMs = botResponseCount > 0 ? totalBotResponseTime / botResponseCount : 0;
        const avgBotResponseTime = avgBotResponseMs > 0 
            ? avgBotResponseMs < 1000 
                ? `${(avgBotResponseMs).toFixed(0)}ms`
                : avgBotResponseMs < 60000
                    ? `${(avgBotResponseMs / 1000).toFixed(1)}s`
                    : `${Math.floor(avgBotResponseMs / 60000)}m ${Math.floor((avgBotResponseMs % 60000) / 1000)}s`
            : "N/A";
        
        // Calculate actual human response time from conversations
        let totalHumanResponseTime = 0;
        let humanResponseCount = 0;
        
        (shop.liveConversations ?? []).forEach(convo => {
            let lastUserMessageTime = 0;
            (convo.messages ?? []).forEach(msg => {
                if (msg.sender === 'user') {
                    lastUserMessageTime = msg.timestamp;
                } else if (msg.sender === 'seller' && lastUserMessageTime > 0) {
                    const responseTime = msg.timestamp - lastUserMessageTime;
                    totalHumanResponseTime += responseTime;
                    humanResponseCount++;
                    lastUserMessageTime = 0;
                }
            });
        });
        
        const avgHumanResponseMs = humanResponseCount > 0 ? totalHumanResponseTime / humanResponseCount : 0;
        const avgHumanResponseTime = avgHumanResponseMs > 0
            ? avgHumanResponseMs < 60000
                ? `${(avgHumanResponseMs / 1000).toFixed(1)}s`
                : `${Math.floor(avgHumanResponseMs / 60000)}m ${Math.floor((avgHumanResponseMs % 60000) / 1000)}s`
            : "N/A";

        return {
            totalConversations,
            unreadCount,
            needsAttentionCount,
            activeAutomations,
            conversionRate: conversionRate.toFixed(1) + '%',
            avgBotResponseTime,
            avgHumanResponseTime,
        };
    }, [shop]);
    
    // Analytics data for charts
    const conversationTrendData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date;
        });
        
        return last7Days.map(date => {
            const dayStart = new Date(date).setHours(0, 0, 0, 0);
            const dayEnd = new Date(date).setHours(23, 59, 59, 999);
            const count = (shop.liveConversations ?? []).filter(c => {
                const messageTime = c.messages?.[0]?.timestamp || 0;
                return messageTime >= dayStart && messageTime <= dayEnd;
            }).length;
            return {
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                value: count
            };
        });
    }, [shop.liveConversations]);
    
    const salesTrendData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date;
        });
        
        return last7Days.map(date => {
            const dayStart = new Date(date).setHours(0, 0, 0, 0);
            const dayEnd = new Date(date).setHours(23, 59, 59, 999);
            const count = (shop.formSubmissions ?? []).filter(s => {
                return s.submittedAt >= dayStart && s.submittedAt <= dayEnd && s.status === OrderStatus.Completed;
            }).length;
            return {
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                value: count
            };
        });
    }, [shop.formSubmissions]);
    
    const canViewBasicKPIs = permissions.can('basicDashboards');

    return (
        <div className="bg-gray-900 rounded-lg flex flex-col p-3 md:p-6 h-full overflow-y-auto">
            {shop.onboarding?.checklistDismissed === false && (
                <div className="mb-6 md:mb-8">
                    <OnboardingChecklist shop={shop} onDismiss={onDismissChecklist} />
                </div>
            )}
            
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-6 md:mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">{t('dashboard')}</h2>
                    <p className="text-sm md:text-md text-gray-400">{t('dashboardOverview')}</p>
                </div>
            </header>
            
            {!canViewBasicKPIs ? (
                <div className="flex-grow flex items-center justify-center text-center bg-gray-800 rounded-lg">
                    <div>
                        <h3 className="text-xl font-bold">{t('dashboardUnavailable')}</h3>
                        <p className="text-gray-400 mt-2">{t('dashboardUnavailableBrand')}</p>
                    </div>
                </div>
            ) : (
                <>
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                        <KpiCard title={t('totalConversations')} value={chatbotMetrics.totalConversations} icon={<UsersIcon className="w-5 h-5 md:w-6 md:h-6 text-indigo-400"/>} />
                        <KpiCard title={t('unread')} value={chatbotMetrics.unreadCount} icon={<InboxIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-400"/>} />
                        <KpiCard title={t('needsAttention')} value={chatbotMetrics.needsAttentionCount} icon={<AlertTriangleIcon className="w-5 h-5 md:w-6 md:h-6 text-yellow-400"/>} />
                        <KpiCard title={t('conversionRate')} value={chatbotMetrics.conversionRate} icon={<TrendingUpIcon className="w-5 h-5 md:w-6 md:h-6 text-green-400"/>} subtext={t('completedConversations')} />
                        <KpiCard title={t('activeAutomations')} value={chatbotMetrics.activeAutomations} icon={<AutomationIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-400"/>} />
                        <KpiCard title={t('avgBotResponse')} value={chatbotMetrics.avgBotResponseTime} icon={<ClockIcon className="w-5 h-5 md:w-6 md:h-6 text-cyan-400"/>} />
                        <KpiCard title={t('avgHumanResponse')} value={chatbotMetrics.avgHumanResponseTime} icon={<ClockIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-400"/>} />
                    </section>
                    
                    {/* Analytics Charts */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                        <SimpleLineChart 
                            data={conversationTrendData}
                            title="Conversations (Last 7 Days)"
                            color="#3B82F6"
                            height={220}
                        />
                        <SimpleBarChart 
                            data={salesTrendData}
                            title="Completed Sales (Last 7 Days)"
                            color="#10B981"
                            height={220}
                        />
                    </section>
                     <section className="mt-8">
                        <ConversationalCommerceWidget shop={shop} onResolve={onOpenResolveLimitModal} permissions={permissions} />
                    </section>
                </>
            )}
        </div>
    );
};

export default MainDashboard;
