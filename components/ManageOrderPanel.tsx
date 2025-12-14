import React, { useState, useMemo, useEffect } from 'react';
import { Shop, ShopPaymentMethod, OfflineSaleConfig, ReceiptConfig, SubscriptionPlan, OnlineSaleConfig, PaymentIntelligenceConfig, OrderStatus, FormSubmission } from '../types';
import OrderDataViewer from './OrderDataViewer';
import FormManager from './FormManager';
import PaymentSettings from './PaymentSettings';
import SalesDashboard from './SalesDashboard';
import OfflineSalePanel from './OfflineSalePanel';
import { useLocalization } from '../hooks/useLocalization';
import { usePermissions } from '../hooks/usePermissions';
import DashboardIcon from './icons/DashboardIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import PosIcon from './icons/PosIcon';
import CreditCardIcon from './icons/CreditCardIcon';
import InfoIcon from './icons/InfoIcon';
import ToggleSwitch from './ToggleSwitch';
import { getShopOrders, updateOrderStatus, subscribeToOrderUpdates } from '../services/supabaseHelpers';
import { logger } from '../utils/logger';
import { showToast } from '../utils/toast';


interface ManageOrderPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    permissions: ReturnType<typeof usePermissions>;
    offlineSaleConfig?: OfflineSaleConfig;
    onOfflineSaleConfigChange: (config: OfflineSaleConfig) => void;
    onlineSaleConfig?: OnlineSaleConfig;
    onOnlineSaleConfigChange: (config: OnlineSaleConfig) => void;
    showConfirmation: (config: any) => void;
}

type SubTab = 'dashboard' | 'data' | 'forms' | 'payments' | 'offline_sale';


// --- New Receipt Settings Component ---
const ReceiptSettings: React.FC<{
    config?: ReceiptConfig;
    onConfigChange: (config: ReceiptConfig) => void;
}> = ({ config, onConfigChange }) => {
    const { t } = useLocalization();
    const currentConfig = config || { showPlatformLogo: true, customFooterText: '', receiptSize: 'standard' };

    const handleToggle = (show: boolean) => {
        onConfigChange({ ...currentConfig, showPlatformLogo: show });
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onConfigChange({ ...currentConfig, customFooterText: e.target.value });
    };
    
    const handleSizeChange = (size: 'standard' | '80mm' | '58mm') => {
        onConfigChange({ ...currentConfig, receiptSize: size });
    };

    return (
        <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-2 text-[#F6F9FC]">{t('receiptCustomization')}</h2>
            <p className="text-sm text-gray-400 mb-6">{t('receiptCustomizationDesc')}</p>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('receiptPrinterType')}</label>
                    <div className="space-y-2">
                        <label className="flex items-start p-3 rounded-lg border border-gray-700 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-900/20 cursor-pointer">
                            <input type="radio" name="receipt-size" value="standard" checked={currentConfig.receiptSize === 'standard'} onChange={() => handleSizeChange('standard')} className="h-4 w-4 mt-1 bg-gray-600 border-gray-500 text-blue-500"/>
                            <div className="ml-3">
                                <p className="font-semibold text-white">{t('standardPage')}</p>
                                <p className="text-xs text-gray-400">{t('standardPageDesc')}</p>
                            </div>
                        </label>
                         <label className="flex items-start p-3 rounded-lg border border-gray-700 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-900/20 cursor-pointer">
                            <input type="radio" name="receipt-size" value="80mm" checked={currentConfig.receiptSize === '80mm'} onChange={() => handleSizeChange('80mm')} className="h-4 w-4 mt-1 bg-gray-600 border-gray-500 text-blue-500"/>
                             <div className="ml-3">
                                <p className="font-semibold text-white">{t('thermalPrinter80')}</p>
                                <p className="text-xs text-gray-400">{t('thermalPrinter80Desc')}</p>
                            </div>
                        </label>
                         <label className="flex items-start p-3 rounded-lg border border-gray-700 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-900/20 cursor-pointer">
                            <input type="radio" name="receipt-size" value="58mm" checked={currentConfig.receiptSize === '58mm'} onChange={() => handleSizeChange('58mm')} className="h-4 w-4 mt-1 bg-gray-600 border-gray-500 text-blue-500"/>
                             <div className="ml-3">
                                <p className="font-semibold text-white">{t('thermalPrinter58')}</p>
                                <p className="text-xs text-gray-400">{t('thermalPrinter58Desc')}</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('platformBranding')}</label>
                    <div className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-gray-200">{t('showPoweredBy')}</span>
                        <label className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" className="sr-only peer" checked={currentConfig.showPlatformLogo} onChange={e => handleToggle(e.target.checked)} />
                                <div className="block bg-gray-600 w-11 h-6 rounded-full peer-checked:bg-blue-600"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                            </div>
                        </label>
                    </div>
                </div>
                <div>
                    <label htmlFor="footer-text" className="block text-sm font-medium text-gray-300 mb-2">{t('customFooterMessage')}</label>
                    <textarea
                        id="footer-text"
                        value={currentConfig.customFooterText}
                        onChange={handleTextChange}
                        placeholder={t('customFooterPlaceholder')}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        maxLength={150}
                    />
                     <p className="text-xs text-gray-400 text-right mt-1">{currentConfig.customFooterText.length} / 150</p>
                </div>
            </div>
        </div>
    );
};


const ManageOrderPanel: React.FC<ManageOrderPanelProps> = ({ shop, onUpdateShop, permissions, offlineSaleConfig, onOfflineSaleConfigChange, onlineSaleConfig, onOnlineSaleConfigChange, showConfirmation }) => {
    const { t } = useLocalization();
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');
    const [orders, setOrders] = useState<FormSubmission[]>(shop.formSubmissions || []);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const currentPlan = shop.subscription.plan;
    
    // Load orders from Supabase on mount
    useEffect(() => {
        const loadOrders = async () => {
            if (!shop.id) return;
            
            setIsLoadingOrders(true);
            try {
                const supabaseOrders = await getShopOrders(shop.id);
                if (supabaseOrders && supabaseOrders.length > 0) {
                    // Map database orders to FormSubmission type
                    const mappedOrders: FormSubmission[] = supabaseOrders.map((order: any) => ({
                        submissionId: order.submission_id,
                        orderId: order.submission_id,
                        formId: order.form_id,
                        formName: order.form_name,
                        status: order.status,
                        orderedProducts: order.ordered_products || [],
                        customFields: order.custom_fields || {},
                        paymentMethod: order.payment_method,
                        paymentScreenshotUrl: order.payment_screenshot_url,
                        discount: order.discount,
                        submittedAt: new Date(order.submitted_at).getTime(),
                    }));
                    setOrders(mappedOrders);
                    logger.info(`Loaded ${mappedOrders.length} orders from Supabase`);
                } else {
                    // Fallback to localStorage orders if no Supabase data
                    setOrders(shop.formSubmissions || []);
                }
            } catch (error: any) {
                logger.error('Failed to load orders from Supabase', error);
                showToast.error('Failed to load orders. Using local data.');
                // Fallback to localStorage
                setOrders(shop.formSubmissions || []);
            } finally {
                setIsLoadingOrders(false);
            }
        };

        loadOrders();
    }, [shop.id]);

    // Subscribe to real-time order updates
    useEffect(() => {
        if (!shop.id) return;

        logger.debug('Setting up real-time order subscription');
        const subscription = subscribeToOrderUpdates(shop.id, (payload) => {
            logger.debug('Order update received', payload);
            
            if (payload.eventType === 'INSERT') {
                // New order created
                const newOrder: FormSubmission = {
                    submissionId: payload.new.submission_id,
                    orderId: payload.new.submission_id,
                    formId: payload.new.form_id,
                    formName: payload.new.form_name,
                    status: payload.new.status,
                    orderedProducts: payload.new.ordered_products || [],
                    customFields: payload.new.custom_fields || {},
                    paymentMethod: payload.new.payment_method,
                    paymentScreenshotUrl: payload.new.payment_screenshot_url,
                    discount: payload.new.discount,
                    submittedAt: new Date(payload.new.submitted_at).getTime(),
                };
                setOrders(prev => [newOrder, ...prev]);
                showToast.success('New order received!');
            } else if (payload.eventType === 'UPDATE') {
                // Order updated
                setOrders(prev => prev.map(order =>
                    order.submissionId === payload.new.submission_id
                        ? {
                            ...order,
                            status: payload.new.status,
                            paymentScreenshotUrl: payload.new.payment_screenshot_url,
                            customFields: payload.new.custom_fields || {},
                        }
                        : order
                ));
            } else if (payload.eventType === 'DELETE') {
                // Order deleted
                setOrders(prev => prev.filter(order => order.submissionId !== payload.old.submission_id));
            }
        });

        return () => {
            logger.debug('Cleaning up order subscription');
            subscription.unsubscribe();
        };
    }, [shop.id]);

    // Handle order updates (sync to Supabase)
    const handleOrdersChange = async (updatedOrders: FormSubmission[]) => {
        setOrders(updatedOrders);
        
        // Also update the shop prop for backwards compatibility
        onUpdateShop(s => ({ ...s, formSubmissions: updatedOrders }));
        
        // Note: Individual order updates should use updateOrderStatus from supabaseHelpers
        // The real-time subscription will handle UI updates automatically
    };
    
    const availableTabs: {id: SubTab, name: string, icon: React.ReactNode}[] = useMemo(() => {
        const allTabs: {id: SubTab, name: string, icon: React.ReactNode}[] = [
            { id: 'dashboard', name: t('salesDashboard'), icon: <DashboardIcon className="w-5 h-5" /> },
            { id: 'data', name: t('orderData'), icon: <PosIcon className="w-5 h-5" /> },
            { id: 'forms', name: t('orderForms'), icon: <ClipboardListIcon className="w-5 h-5" /> },
            { id: 'offline_sale', name: t('offlineSale'), icon: <PosIcon className="w-5 h-5" /> },
            { id: 'payments', name: t('paymentsAndReceipts'), icon: <CreditCardIcon className="w-5 h-5" /> },
        ];
        
        let excluded: SubTab[] = [];
        // Example of plan-based feature exclusion
        // if (currentPlan === 'Brand') {
        //    excluded = ['forms'];
        // }

        return allTabs.filter(tab => !excluded.includes(tab.id));

    }, [currentPlan, t]);
    
    // Fallback if current tab is hidden
    useEffect(() => {
        if (!availableTabs.some(t => t.id === activeSubTab)) {
            setActiveSubTab(availableTabs[0]?.id || 'data');
        }
    }, [currentPlan, activeSubTab, availableTabs]);

    const handlePaymentIntelligenceChange = (config: PaymentIntelligenceConfig) => {
        onUpdateShop(s => ({ ...s, paymentIntelligenceConfig: config }));
    };

    const renderSubTabContent = () => {
        const paymentIntelligenceConfig = shop.paymentIntelligenceConfig!;
        const canUsePaymentIntelligence = permissions.can('paymentIntelligence');

        switch (activeSubTab) {
            case 'dashboard':
                return <SalesDashboard 
                    shop={{
                        ...shop,
                        formSubmissions: orders // Use Supabase orders for dashboard
                    }} 
                    permissions={permissions} 
                    onUpdateShop={onUpdateShop} 
                />;
            case 'data':
                return <OrderDataViewer
                    submissions={orders}
                    onSubmissionsChange={handleOrdersChange}
                    forms={shop.forms}
                    items={shop.items}
                    paymentMethods={shop.paymentMethods}
                    shop={shop}
                    showConfirmation={showConfirmation}
                />;
            case 'forms':
                return <FormManager
                    // FIX: Pass the 'shop' prop as required by the child component for currency info.
                    shop={shop}
                    forms={shop.forms}
                    onFormsChange={(formsOrUpdater) => {
                        if (typeof formsOrUpdater === 'function') {
                            onUpdateShop(s => ({...s!, forms: formsOrUpdater(s!.forms)}));
                        } else {
                            onUpdateShop(s => ({...s!, forms: formsOrUpdater}));
                        }
                    }}
                    items={shop.items}
                    permissions={permissions}
                    paymentMethods={shop.paymentMethods}
                    onFormSubmit={() => {}} // Not used in this context
                    offlineSaleConfig={offlineSaleConfig}
                    onOfflineSaleConfigChange={onOfflineSaleConfigChange}
                    onlineSaleConfig={onlineSaleConfig}
                    onOnlineSaleConfigChange={onOnlineSaleConfigChange}
                    showConfirmation={showConfirmation}
                />;
            case 'payments':
                return (
                    <div className="h-full overflow-y-auto pr-2 space-y-8">
                        <div className="relative group">
                            <div className={`bg-[#1D3B59] p-6 rounded-lg shadow-lg ${!canUsePaymentIntelligence ? 'opacity-50' : ''}`}>
                                <h2 className="text-xl font-bold mb-2 text-[#F6F9FC]">{t('paymentIntelligence')}</h2>
                                <p className="text-sm text-gray-400 mb-4">{t('paymentIntelligenceDesc')}</p>
                                
                                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6 text-sm text-blue-200 space-y-2">
                                    <p><strong>{t('howItWorks')}:</strong> {t('howItWorksDesc')}</p>
                                    <p><strong><span className="text-yellow-300">{t('importantNotice')}:</span></strong> {t('importantNoticeDesc')}</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-sm text-gray-200 font-medium">{t('enablePaymentIntelligence')}</span>
                                        <ToggleSwitch
                                            enabled={paymentIntelligenceConfig.enabled}
                                            onChange={isEnabled => handlePaymentIntelligenceChange({ ...paymentIntelligenceConfig, enabled: isEnabled })}
                                        />
                                    </div>
                                    
                                    <div className={`space-y-6 ${!paymentIntelligenceConfig.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div>
                                            <label htmlFor="timeWindow" className="block text-sm font-medium text-gray-300 mb-2">{t('timeWindow')}</label>
                                            <input
                                                id="timeWindow"
                                                type="number"
                                                value={paymentIntelligenceConfig.timeWindowMinutes}
                                                onChange={e => handlePaymentIntelligenceChange({ ...paymentIntelligenceConfig, timeWindowMinutes: parseInt(e.target.value, 10) || 15 })}
                                                min="1"
                                                max="60"
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-white"
                                            />
                                            <p className="text-xs text-gray-400 mt-2">{t('timeWindowDesc')}</p>
                                        </div>

                                        <div>
                                            <label htmlFor="statusOnProof" className="block text-sm font-medium text-gray-300 mb-2">{t('statusOnProof')}</label>
                                            <select
                                                id="statusOnProof"
                                                value={paymentIntelligenceConfig.statusOnProof}
                                                onChange={e => handlePaymentIntelligenceChange({ ...paymentIntelligenceConfig, statusOnProof: e.target.value as OrderStatus.Confirmed | OrderStatus.Pending })}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-white"
                                            >
                                                <option value={OrderStatus.Confirmed}>{t('confirmed')}</option>
                                                <option value={OrderStatus.Pending}>{t('pending')}</option>
                                            </select>
                                            <p className="text-xs text-gray-400 mt-2">{t('statusOnProofDesc')}</p>
                                        </div>
                                        <div>
                                            <label htmlFor="confirmationMessage" className="block text-sm font-medium text-gray-300 mb-2">{t('confirmationMessageLabel')}</label>
                                            <textarea
                                                id="confirmationMessage"
                                                value={paymentIntelligenceConfig.confirmationMessage || ''}
                                                onChange={e => handlePaymentIntelligenceChange({ ...paymentIntelligenceConfig, confirmationMessage: e.target.value })}
                                                rows={3}
                                                maxLength={450}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-white"
                                            />
                                            <div className="flex justify-between items-center mt-1">
                                                <p className="text-xs text-gray-400">{t('confirmationMessageDesc')}</p>
                                                <p className="text-xs text-gray-400">{(paymentIntelligenceConfig.confirmationMessage || '').length} / 450</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {!canUsePaymentIntelligence && (
                                <div className="absolute inset-0 bg-gray-900/70 rounded-lg flex items-center justify-center cursor-not-allowed z-10">
                                    <span className="text-center text-sm font-semibold text-white bg-black/50 px-4 py-3 rounded-md flex flex-col items-center gap-2">
                                        <span className="flex items-center gap-2">
                                            <span className="text-xs bg-yellow-500 text-yellow-900 font-bold px-2 py-0.5 rounded-full">{t('pro')}</span>
                                            {t('upgradeToUseFeature')}
                                        </span>
                                        <span className="text-xs font-normal">Upgrade your plan to use Payment Intelligence.</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg">
                            <h2 className="text-xl font-bold mb-2 text-[#F6F9FC]">{t('shopPaymentMethods')}</h2>
                            <p className="text-sm text-gray-400 mb-6">{t('configurePaymentMethods')}</p>
                            <PaymentSettings 
                                shop={shop}
                                onUpdateShop={onUpdateShop}
                                showConfirmation={showConfirmation}
                            />
                        </div>
                         <ReceiptSettings
                            config={shop.receiptConfig}
                            onConfigChange={(config) => onUpdateShop(s => ({ ...s, receiptConfig: config }))}
                        />
                    </div>
                );
            case 'offline_sale':
                return <OfflineSalePanel shop={shop} onUpdateShop={onUpdateShop} permissions={permissions} />;
            default:
                return null;
        }
    };

    const getTabClass = (tab: SubTab) => {
        return `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeSubTab === tab
                ? 'bg-[#635BFF] text-white'
                : 'text-gray-300 hover:bg-[#2c4f73]'
        }`;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 flex items-center gap-2 border-b border-[#2c4f73] pb-4 mb-6 overflow-x-auto">
                {availableTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={getTabClass(tab.id)}>
                        {tab.icon} {tab.name}
                    </button>
                ))}
            </div>
            <div className="flex-grow overflow-hidden">
                {renderSubTabContent()}
            </div>
        </div>
    );
};

export default ManageOrderPanel;
