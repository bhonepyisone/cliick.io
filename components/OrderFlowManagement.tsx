import React, { useState, useRef } from 'react';
import { OrderManagementFlowConfig, BookingFlowConfig, Language } from '../types';
import CalendarIcon from './icons/CalendarIcon';
import ShoppingCartIcon from './icons/ShoppingCartIcon';
import { useLocalization } from '../hooks/useLocalization';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ButtonIcon from './icons/ButtonIcon';
import ChatAltIcon from './icons/ChatAltIcon';
import TriageIcon from './icons/TriageIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import EditFlowsIcon from './icons/EditFlowsIcon';
import CancelIcon from './icons/CancelIcon';
import StatusIcon from './icons/StatusIcon';
import { useToast } from '../contexts/ToastContext';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import InfoIcon from './icons/InfoIcon';
import PencilIcon from './icons/PencilIcon';
import PlusIcon from './icons/PlusIcon';

interface OrderFlowManagementProps {
    orderConfig: OrderManagementFlowConfig;
    onOrderConfigChange: (config: OrderManagementFlowConfig) => void;
    bookingConfig: BookingFlowConfig;
    onBookingConfigChange: (config: BookingFlowConfig) => void;
    language: Language;
}

type ViewMode = 'flow' | 'list';

interface FlowNode {
    id: string;
    type: 'start' | 'action' | 'decision' | 'message' | 'end';
    label: string;
    fieldKeys: string[];
    icon?: React.ReactNode;
    next?: string[];
    color?: string;
}

const CollapsibleSubSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 text-left"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <h4 className="font-semibold text-gray-200 text-sm">{title}</h4>
                </div>
                <ChevronDownIcon className={`w-5 h-5 transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 border-t border-gray-700 space-y-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FlowField: React.FC<{ fieldKey: string; label: string; value: string; onChange: (key: string, value: string) => void }> = ({ fieldKey, label, value, onChange }) => {
    const { t } = useLocalization();
    const isButton = label.toLowerCase().startsWith(t('buttonPrefix').toLowerCase());
    const displayLabel = isButton ? label.substring(t('buttonPrefix').length) : label;

    return (
        <div key={fieldKey}>
            <label className="block text-xs font-medium text-gray-400 mb-1 flex items-center gap-1.5">
                {isButton ? <ButtonIcon className="w-4 h-4 text-blue-400"/> : <ChatAltIcon className="w-4 h-4 text-purple-400"/>}
                {displayLabel}
            </label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(fieldKey, e.target.value)}
                className={`w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white ${isButton ? 'font-semibold' : ''}`}
            />
        </div>
    );
};

const OrderFlowManagement: React.FC<OrderFlowManagementProps> = ({ orderConfig, onOrderConfigChange, bookingConfig, onBookingConfigChange, language }) => {
    const { t } = useLocalization();
    const { showToast } = useToast();
    const [viewMode, setViewMode] = useState<ViewMode>('flow');
    const [isOrderFlowOpen, setIsOrderFlowOpen] = useState(false);
    const [isBookingFlowOpen, setIsBookingFlowOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<number | null>(null);
    const idleTimeoutRef = useRef<number | null>(null);
    const [isInfoBoxOpen, setIsInfoBoxOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [activeFlow, setActiveFlow] = useState<'order' | 'booking'>('order');

    const triggerSave = (changeFn: () => void) => {
        setSaveStatus('saving');
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

        changeFn(); // Apply the state change immediately

        saveTimeoutRef.current = window.setTimeout(() => {
            setSaveStatus('saved');
            showToast(t('settingsSavedSuccess'), 'success');
            idleTimeoutRef.current = window.setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        }, 750);
    };

    const handleOrderStringChange = (key: string, value: string) => {
        triggerSave(() => {
            onOrderConfigChange({
                ...orderConfig,
                strings: {
                    ...orderConfig.strings,
                    [key]: value
                }
            });
        });
    };
    
    const handleOrderToggle = (enabled: boolean) => {
        triggerSave(() => onOrderConfigChange({ ...orderConfig, enabled }));
    };
    
    const handleBookingStringChange = (key: string, value: string) => {
        triggerSave(() => {
            onBookingConfigChange({
                ...bookingConfig,
                strings: {
                    ...bookingConfig.strings,
                    [key]: value
                }
            });
        });
    };
    
    const handleBookingToggle = (enabled: boolean) => {
        triggerSave(() => onBookingConfigChange({ ...bookingConfig, enabled }));
    };

    const orderFieldKeys = Object.keys(orderConfig.strings);
    const bookingFieldKeys = Object.keys(bookingConfig.strings);

    // Define Order Flow Structure
    const orderFlowNodes: FlowNode[] = [
        { id: 'start', type: 'start', label: 'Customer Clicks Button', fieldKeys: ['manageOrderButtonText'], icon: <ButtonIcon className="w-4 h-4" />, next: ['triage'], color: 'blue' },
        { id: 'triage', type: 'decision', label: 'Choose Action', fieldKeys: ['manageOrderTriagePrompt', 'createNewOrder', 'updateExistingOrder', 'cancelExistingOrder', 'checkOrderStatus'], icon: <TriageIcon className="w-4 h-4" />, next: ['identify', 'status'], color: 'purple' },
        { id: 'identify', type: 'action', label: 'Find Order', fieldKeys: ['askForOrderId', 'orderNotFound'], icon: <IdentificationIcon className="w-4 h-4" />, next: ['manage'], color: 'indigo' },
        { id: 'manage', type: 'decision', label: 'Manage Options', fieldKeys: ['askManagementChoice', 'changeItems', 'updateAddress', 'updatePhone', 'cancelOrder', 'nevermind'], icon: <EditFlowsIcon className="w-4 h-4" />, next: ['change-items', 'update-info', 'cancel'], color: 'blue' },
        { id: 'change-items', type: 'message', label: 'Change Items', fieldKeys: ['changeItemsOptions', 'talkToSupport', 'cancelAndReorder', 'supportContact', 'supportContactNotFound'], icon: <ShoppingCartIcon className="w-4 h-4" />, next: ['end'], color: 'cyan' },
        { id: 'update-info', type: 'action', label: 'Update Details', fieldKeys: ['askForNewAddress', 'askForNewPhone', 'updateConfirmationRecap'], icon: <PencilIcon className="w-4 h-4" />, next: ['end'], color: 'green' },
        { id: 'cancel', type: 'decision', label: 'Cancel Order', fieldKeys: ['confirmCancellation', 'yesCancel', 'noKeep', 'orderCancelledSuccess', 'orderKept', 'proceedToCancel'], icon: <CancelIcon className="w-4 h-4" />, next: ['end'], color: 'red' },
        { id: 'status', type: 'message', label: 'Check Status', fieldKeys: ['orderStatusSummary'], icon: <StatusIcon className="w-4 h-4" />, next: ['end'], color: 'yellow' },
        { id: 'end', type: 'end', label: 'Complete', fieldKeys: ['cancellationStopped', 'orderCompleted', 'orderAlreadyCancelled'], icon: <CheckCircleIcon className="w-4 h-4" />, color: 'gray' }
    ];

    // Define Booking Flow Structure
    const bookingFlowNodes: FlowNode[] = [
        { id: 'start', type: 'start', label: 'Customer Starts', fieldKeys: ['manageBookingButtonText', 'manageBookingTriagePrompt'], icon: <ButtonIcon className="w-4 h-4" />, next: ['triage'], color: 'purple' },
        { id: 'triage', type: 'decision', label: 'Choose Action', fieldKeys: ['createNewBookingButtonText', 'updateExistingBookingButtonText', 'cancelExistingBookingButtonText', 'checkBookingStatusButtonText'], icon: <TriageIcon className="w-4 h-4" />, next: ['new-booking', 'identify'], color: 'purple' },
        { id: 'new-booking', type: 'action', label: 'New Booking', fieldKeys: ['askForServiceName'], icon: <PlusIcon className="w-4 h-4" />, next: ['end'], color: 'green' },
        { id: 'identify', type: 'action', label: 'Find Booking', fieldKeys: ['askForBookingId', 'bookingNotFound'], icon: <IdentificationIcon className="w-4 h-4" />, next: ['manage'], color: 'indigo' },
        { id: 'manage', type: 'decision', label: 'Manage Options', fieldKeys: ['askBookingManagementChoice', 'changeDateTime', 'updatePhone', 'cancelBooking', 'nevermind'], icon: <EditFlowsIcon className="w-4 h-4" />, next: ['update', 'cancel', 'status'], color: 'blue' },
        { id: 'update', type: 'action', label: 'Update Booking', fieldKeys: ['askForNewDateTime', 'askForNewPhone', 'updateBookingConfirmationRecap'], icon: <PencilIcon className="w-4 h-4" />, next: ['end'], color: 'cyan' },
        { id: 'cancel', type: 'decision', label: 'Cancel Booking', fieldKeys: ['confirmCancellation', 'yesCancel', 'noKeep', 'bookingCancelledSuccess', 'bookingKept'], icon: <CancelIcon className="w-4 h-4" />, next: ['end'], color: 'red' },
        { id: 'status', type: 'message', label: 'Check Status', fieldKeys: ['bookingStatusSummary'], icon: <StatusIcon className="w-4 h-4" />, next: ['end'], color: 'yellow' },
        { id: 'end', type: 'end', label: 'Complete', fieldKeys: ['cancellationStopped', 'bookingCompleted', 'bookingAlreadyCancelled'], icon: <CheckCircleIcon className="w-4 h-4" />, color: 'gray' }
    ];

    const getNodeColor = (color: string) => {
        const colors: Record<string, { bg: string; border: string; text: string }> = {
            blue: { bg: 'bg-blue-900/40', border: 'border-blue-600', text: 'text-blue-300' },
            purple: { bg: 'bg-purple-900/40', border: 'border-purple-600', text: 'text-purple-300' },
            green: { bg: 'bg-green-900/40', border: 'border-green-600', text: 'text-green-300' },
            red: { bg: 'bg-red-900/40', border: 'border-red-600', text: 'text-red-300' },
            yellow: { bg: 'bg-yellow-900/40', border: 'border-yellow-600', text: 'text-yellow-300' },
            indigo: { bg: 'bg-indigo-900/40', border: 'border-indigo-600', text: 'text-indigo-300' },
            cyan: { bg: 'bg-cyan-900/40', border: 'border-cyan-600', text: 'text-cyan-300' },
            gray: { bg: 'bg-gray-700/40', border: 'border-gray-500', text: 'text-gray-300' }
        };
        return colors[color] || colors.blue;
    };

    const FlowNodeComponent: React.FC<{ node: FlowNode; isActive: boolean; isOrder: boolean }> = ({ node, isActive, isOrder }) => {
        const colors = getNodeColor(node.color || 'blue');
        const config = isOrder ? orderConfig : bookingConfig;
        const handleChange = isOrder ? handleOrderStringChange : handleBookingStringChange;
        
        const getNodeShape = () => {
            if (node.type === 'start') return 'rounded-full';
            if (node.type === 'decision') return 'rounded-lg transform rotate-45';
            if (node.type === 'end') return 'rounded-full';
            return 'rounded-lg';
        };

        return (
            <div className="flex flex-col items-center gap-3">
                <button
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    className={`relative ${getNodeShape()} ${colors.bg} ${colors.border} border-2 p-4 min-w-[140px] transition-all duration-200 hover:scale-105 ${
                        isActive ? 'ring-4 ring-white/30 shadow-lg' : ''
                    } ${node.type === 'decision' ? 'w-32 h-32' : 'w-auto'}`}
                >
                    <div className={node.type === 'decision' ? 'transform -rotate-45' : ''}>
                        <div className="flex items-center gap-2 justify-center mb-1">
                            {node.icon}
                            <span className={`text-xs font-semibold ${colors.text}`}>
                                {node.type === 'start' && '🚀'}
                                {node.type === 'decision' && '⚡'}
                                {node.type === 'action' && '⚙️'}
                                {node.type === 'message' && '💬'}
                                {node.type === 'end' && '✅'}
                            </span>
                        </div>
                        <div className="text-white text-sm font-medium text-center">{node.label}</div>
                        <div className="text-gray-400 text-xs mt-1 text-center">
                            {node.fieldKeys.length} {node.fieldKeys.length === 1 ? 'field' : 'fields'}
                        </div>
                    </div>
                </button>

                {/* Edit Panel */}
                {isActive && (
                    <div className="bg-gray-900/90 border border-gray-600 rounded-lg p-4 w-80 space-y-3 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                                {node.icon}
                                {node.label}
                            </h4>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        {node.fieldKeys.map(key => (
                            <FlowField
                                key={key}
                                fieldKey={key}
                                label={t(key + '_label')}
                                value={config.strings[key as keyof typeof config.strings] || ''}
                                onChange={handleChange}
                            />
                        ))}
                    </div>
                )}

                {/* Connection Arrow */}
                {node.next && node.next.length > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="text-2xl text-gray-500">↓</div>
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full overflow-y-auto">
             <style>{`
                .grid-rows-\\[0fr\\] { grid-template-rows: 0fr; }
                .grid-rows-\\[1fr\\] { grid-template-rows: 1fr; }
            `}</style>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">{t('automatedConversionFlowTitle')}</h2>
                    <p className="text-sm text-gray-400">{t('automatedConversionFlowDesc')}</p>
                </div>
                 <div className="flex items-center gap-2 text-sm transition-opacity duration-300">
                    {saveStatus === 'saving' && <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div><span className="text-gray-400">{t('saving')}</span></>}
                    {saveStatus === 'saved' && <><CheckCircleIcon className="w-5 h-5 text-green-400" /><span className="text-green-400">{t('saved')}</span></>}
                </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg mb-6 overflow-hidden">
                <button
                    onClick={() => setIsInfoBoxOpen(!isInfoBoxOpen)}
                    className="w-full flex items-center justify-between p-4 text-left"
                    aria-expanded={isInfoBoxOpen}
                >
                    <div className="flex items-start gap-4">
                        <InfoIcon className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                        <h3 className="font-bold text-white">{t('automatedFlowsInfoTitle')}</h3>
                    </div>
                    <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isInfoBoxOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`grid transition-all duration-300 ease-in-out ${isInfoBoxOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                        <div className="px-4 pb-4 pt-2 border-t border-blue-700/30">
                            <div className="text-sm text-gray-300 space-y-3">
                                <div>
                                    <strong className="text-gray-200">{t('automatedFlowsInfoOffTitle')}</strong>
                                    <p className="text-gray-400 text-xs mt-1">{t('automatedFlowsInfoOffPara1')}</p>
                                    <p className="text-gray-400 text-xs mt-1">{t('automatedFlowsInfoOffPara2')}</p>
                                </div>
                                <div>
                                    <strong className="text-gray-200">{t('automatedFlowsInfoOnTitle')}</strong>
                                    <p className="text-gray-400 text-xs mt-1">{t('automatedFlowsInfoOnPara1')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('flow')}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                            viewMode === 'flow' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        📊 Flow View
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                            viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        📝 List View
                    </button>
                </div>
                <div className="text-sm text-gray-400">
                    {viewMode === 'flow' ? 'Click any step to edit messages' : 'Expand sections to edit'}
                </div>
            </div>

            {viewMode === 'flow' ? (
                /* FLOW-BASED VIEW */
                <div className="space-y-8">
                    {/* Flow Selector Tabs */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveFlow('order')}
                            className={`flex items-center gap-3 px-6 py-4 rounded-lg border-2 transition-all ${
                                activeFlow === 'order'
                                    ? 'bg-blue-900/40 border-blue-600 ring-2 ring-blue-400/30'
                                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                            }`}
                        >
                            <ShoppingCartIcon className="w-6 h-6 text-blue-400" />
                            <div className="text-left">
                                <h3 className="font-semibold text-lg text-white">{t('productFlowTitle')}</h3>
                                <p className="text-xs text-gray-400">{t('productFlowDesc')}</p>
                            </div>
                            <label className="flex items-center cursor-pointer ml-4" onClick={e => e.stopPropagation()}>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={orderConfig.enabled} onChange={e => handleOrderToggle(e.target.checked)} />
                                    <div className="block bg-gray-600 w-11 h-6 rounded-full peer-checked:bg-blue-600"></div>
                                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                                </div>
                            </label>
                        </button>

                        <button
                            onClick={() => setActiveFlow('booking')}
                            className={`flex items-center gap-3 px-6 py-4 rounded-lg border-2 transition-all ${
                                activeFlow === 'booking'
                                    ? 'bg-purple-900/40 border-purple-600 ring-2 ring-purple-400/30'
                                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                            }`}
                        >
                            <CalendarIcon className="w-6 h-6 text-purple-400" />
                            <div className="text-left">
                                <h3 className="font-semibold text-lg text-white">{t('serviceFlowTitle')}</h3>
                                <p className="text-xs text-gray-400">{t('serviceFlowDesc')}</p>
                            </div>
                            <label className="flex items-center cursor-pointer ml-4" onClick={e => e.stopPropagation()}>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={bookingConfig.enabled} onChange={e => handleBookingToggle(e.target.checked)} />
                                    <div className="block bg-gray-600 w-11 h-6 rounded-full peer-checked:bg-blue-600"></div>
                                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                                </div>
                            </label>
                        </button>
                    </div>

                    {/* Flow Diagram */}
                    <div className={`bg-gray-900/50 rounded-lg border-2 p-8 min-h-[600px] ${
                        activeFlow === 'order' ? 'border-blue-600/50' : 'border-purple-600/50'
                    } ${!((activeFlow === 'order' && orderConfig.enabled) || (activeFlow === 'booking' && bookingConfig.enabled)) ? 'opacity-50' : ''}`}>
                        <div className="flex flex-wrap gap-8 justify-center items-start">
                            {(activeFlow === 'order' ? orderFlowNodes : bookingFlowNodes).map(node => (
                                <FlowNodeComponent
                                    key={node.id}
                                    node={node}
                                    isActive={selectedNode === node.id}
                                    isOrder={activeFlow === 'order'}
                                />
                            ))}
                        </div>
                        
                        {/* Flow Legend */}
                        <div className="mt-8 pt-6 border-t border-gray-700">
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Flow Legend:</h4>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-900/40 border-2 border-blue-600"></div>
                                    <span>🚀 Start</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-purple-900/40 border-2 border-purple-600 transform rotate-45"></div>
                                    <span>⚡ Decision Point</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-900/40 border-2 border-indigo-600"></div>
                                    <span>⚙️ Action/Process</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-cyan-900/40 border-2 border-cyan-600"></div>
                                    <span>💬 Message</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-700/40 border-2 border-gray-500"></div>
                                    <span>✅ End</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* LIST-BASED VIEW (Original) */
                <div className="space-y-6">
                {/* Product Order Flow */}
                <div className="bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center p-4">
                        <button onClick={() => setIsOrderFlowOpen(!isOrderFlowOpen)} className="flex items-center gap-3 flex-grow text-left" aria-expanded={isOrderFlowOpen}>
                            <ShoppingCartIcon className="w-6 h-6 text-blue-400" />
                            <div>
                                <h3 className="font-semibold text-lg text-white">{t('productFlowTitle')}</h3>
                                <p className="text-xs text-gray-400">{t('productFlowDesc')}</p>
                            </div>
                        </button>
                        <div className="flex items-center gap-2 pl-4">
                            <span className="text-xs text-gray-300">Enabled</span>
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={orderConfig.enabled} onChange={e => handleOrderToggle(e.target.checked)} />
                                    <div className="block bg-gray-600 w-11 h-6 rounded-full peer-checked:bg-blue-600"></div>
                                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className={`grid transition-all duration-300 ease-in-out ${isOrderFlowOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                            <div className={`p-4 pt-0 ${orderConfig.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                                <div className="border-t border-gray-600 pt-4 space-y-3">
                                     <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Main 'Manage Order' Button Text</label>
                                        <input
                                            type="text"
                                            value={orderConfig.strings.manageOrderButtonText || ''}
                                            onChange={e => handleOrderStringChange('manageOrderButtonText', e.target.value)}
                                            maxLength={20}
                                            className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm"
                                        />
                                        <p className="text-xs text-gray-400 mt-1 text-right">{(orderConfig.strings.manageOrderButtonText || '').length} / 20</p>
                                    </div>
                                    <CollapsibleSubSection title={t('triage')} icon={<TriageIcon />} defaultOpen>
                                        {['manageOrderTriagePrompt', 'createNewOrder', 'updateExistingOrder', 'cancelExistingOrder', 'checkOrderStatus'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={orderConfig.strings[key as keyof typeof orderConfig.strings]} onChange={handleOrderStringChange} />)}
                                    </CollapsibleSubSection>
                                    <CollapsibleSubSection title={t('orderIdentification')} icon={<IdentificationIcon />}>
                                         {['askForOrderId', 'orderNotFound'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={orderConfig.strings[key as keyof typeof orderConfig.strings]} onChange={handleOrderStringChange} />)}
                                    </CollapsibleSubSection>
                                     <CollapsibleSubSection title={t('managementChoices')} icon={<EditFlowsIcon />}>
                                         {['askManagementChoice', 'changeItems', 'updateAddress', 'updatePhone', 'cancelOrder', 'nevermind'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={orderConfig.strings[key as keyof typeof orderConfig.strings]} onChange={handleOrderStringChange} />)}
                                    </CollapsibleSubSection>
                                    <CollapsibleSubSection title={t('changeItemsFlow')} icon={<ShoppingCartIcon className="w-5 h-5"/>}>
                                        {['changeItemsOptions', 'talkToSupport', 'cancelAndReorder', 'supportContact', 'supportContactNotFound'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={orderConfig.strings[key as keyof typeof orderConfig.strings]} onChange={handleOrderStringChange} />)}
                                    </CollapsibleSubSection>
                                    <CollapsibleSubSection title={t('updateInfoFlow')} icon={<PencilIcon className="w-5 h-5"/>}>
                                        {['askForNewAddress', 'askForNewPhone', 'updateConfirmationRecap'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={orderConfig.strings[key as keyof typeof orderConfig.strings]} onChange={handleOrderStringChange} />)}
                                    </CollapsibleSubSection>
                                     <CollapsibleSubSection title={t('cancellationFlow')} icon={<CancelIcon />}>
                                        {['confirmCancellation', 'yesCancel', 'noKeep', 'orderCancelledSuccess', 'orderKept', 'proceedToCancel'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={orderConfig.strings[key as keyof typeof orderConfig.strings]} onChange={handleOrderStringChange} />)}
                                    </CollapsibleSubSection>
                                     <CollapsibleSubSection title={t('statusCheckFlow')} icon={<StatusIcon />}>
                                        {['orderStatusSummary'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={orderConfig.strings[key as keyof typeof orderConfig.strings]} onChange={handleOrderStringChange} />)}
                                    </CollapsibleSubSection>
                                      <CollapsibleSubSection title={t('generalReplies')} icon={<ChatAltIcon className="w-5 h-5"/>}>
                                        {['cancellationStopped', 'orderCompleted', 'orderAlreadyCancelled'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={orderConfig.strings[key as keyof typeof orderConfig.strings]} onChange={handleOrderStringChange} />)}
                                    </CollapsibleSubSection>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Booking Flow */}
                <div className="bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center p-4">
                        <button onClick={() => setIsBookingFlowOpen(!isBookingFlowOpen)} className="flex items-center gap-3 flex-grow text-left" aria-expanded={isBookingFlowOpen}>
                            <CalendarIcon className="w-6 h-6 text-purple-400" />
                            <div>
                                <h3 className="font-semibold text-lg text-white">{t('serviceFlowTitle')}</h3>
                                <p className="text-xs text-gray-400">{t('serviceFlowDesc')}</p>
                            </div>
                        </button>
                        <div className="flex items-center gap-2 pl-4">
                            <span className="text-xs text-gray-300">{t('enableServiceFlow')}</span>
                             <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={bookingConfig.enabled} onChange={e => handleBookingToggle(e.target.checked)} />
                                    <div className="block bg-gray-600 w-11 h-6 rounded-full peer-checked:bg-blue-600"></div>
                                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div className={`grid transition-all duration-300 ease-in-out ${isBookingFlowOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                            <div className={`p-4 pt-0 ${bookingConfig.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                                <div className="border-t border-gray-600 pt-4 space-y-3">
                                     <CollapsibleSubSection title={t('triage')} icon={<TriageIcon />} defaultOpen>
                                        {bookingFieldKeys.filter(k => k.endsWith('TriagePrompt') || k.endsWith('ButtonText')).map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={bookingConfig.strings[key as keyof typeof bookingConfig.strings]} onChange={handleBookingStringChange} />)}
                                    </CollapsibleSubSection>
                                    <CollapsibleSubSection title={t('newBookingFlow')} icon={<PlusIcon className="w-5 h-5"/>}>
                                        {['askForServiceName'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={bookingConfig.strings[key as keyof typeof bookingConfig.strings]} onChange={handleBookingStringChange} />)}
                                    </CollapsibleSubSection>
                                     <CollapsibleSubSection title={t('orderIdentification')} icon={<IdentificationIcon />}>
                                         {['askForBookingId', 'bookingNotFound'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={bookingConfig.strings[key as keyof typeof bookingConfig.strings]} onChange={handleBookingStringChange} />)}
                                    </CollapsibleSubSection>
                                     <CollapsibleSubSection title={t('managementChoices')} icon={<EditFlowsIcon />}>
                                         {['askBookingManagementChoice', 'changeDateTime', 'updatePhone', 'cancelBooking', 'nevermind'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={bookingConfig.strings[key as keyof typeof bookingConfig.strings]} onChange={handleBookingStringChange} />)}
                                    </CollapsibleSubSection>
                                     <CollapsibleSubSection title={t('updateInfoFlow')} icon={<PencilIcon className="w-5 h-5"/>}>
                                        {['askForNewDateTime', 'askForNewPhone', 'updateBookingConfirmationRecap'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={bookingConfig.strings[key as keyof typeof bookingConfig.strings]} onChange={handleBookingStringChange} />)}
                                    </CollapsibleSubSection>
                                    <CollapsibleSubSection title={t('cancellationFlow')} icon={<CancelIcon />}>
                                        {['confirmCancellation', 'yesCancel', 'noKeep', 'bookingCancelledSuccess', 'bookingKept'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={bookingConfig.strings[key as keyof typeof bookingConfig.strings]} onChange={handleBookingStringChange} />)}
                                    </CollapsibleSubSection>
                                    <CollapsibleSubSection title={t('statusCheckFlow')} icon={<StatusIcon />}>
                                        {['bookingStatusSummary'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={bookingConfig.strings[key as keyof typeof bookingConfig.strings]} onChange={handleBookingStringChange} />)}
                                    </CollapsibleSubSection>
                                     <CollapsibleSubSection title={t('generalReplies')} icon={<ChatAltIcon className="w-5 h-5"/>}>
                                        {['cancellationStopped', 'bookingCompleted', 'bookingAlreadyCancelled'].map(key => <FlowField key={key} fieldKey={key} label={t(key + '_label')} value={bookingConfig.strings[key as keyof typeof bookingConfig.strings]} onChange={handleBookingStringChange} />)}
                                    </CollapsibleSubSection>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default OrderFlowManagement;