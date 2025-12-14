import React, { useState, useEffect } from 'react';
import { Shop, Form, PersistentMenuItem, PersistentMenuItemType, CustomerEntryPoint, ShopPaymentMethod, KnowledgeBase, KnowledgeSection, OrderManagementFlowConfig, BookingFlowConfig } from '../types';
import { isSlugTaken } from '../services/supabaseShopService';
import LinkIcon from './icons/LinkIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import MenuIcon from './icons/MenuIcon';
import PencilIcon from './icons/PencilIcon';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import XIcon from './icons/XIcon';
import { MenuItemEditorModal } from './MenuItemEditorModal';
import { getActionFromItem } from './MenuItemEditor';
import { SubTab as SettingsSubTab } from './SettingsPanel';
import ChannelIcon from './ChannelIcon';
import { usePermissions } from '../hooks/usePermissions';

const WELCOME_MESSAGE_CHARACTER_LIMIT = 450;

interface PublishPanelProps {
    shopId: string;
    customUrlSlug?: string;
    onCustomUrlSlugChange: (slug: string) => void;
    entryPoint: CustomerEntryPoint;
    onEntryPointChange: (entryPoint: CustomerEntryPoint) => void;
    forms: Form[];
    persistentMenu: PersistentMenuItem[];
    onPersistentMenuChange: (menu: PersistentMenuItem[]) => void;
    permissions: ReturnType<typeof usePermissions>;
    paymentMethods: ShopPaymentMethod[];
    knowledgeBase: KnowledgeBase;
    showConfirmation: (config: { title: string, message: string, onConfirm: () => void, confirmText?: string, confirmButtonClass?: string }) => void;
    orderConfig: OrderManagementFlowConfig;
    bookingConfig: BookingFlowConfig;
    onNavigate: (tab: 'settings' | 'training', subTab?: SettingsSubTab) => void;
    shop: Shop;
}

const PublishPanel: React.FC<PublishPanelProps> = ({ shopId, customUrlSlug, onCustomUrlSlugChange, entryPoint, onEntryPointChange, forms, persistentMenu, onPersistentMenuChange, permissions, paymentMethods, knowledgeBase, showConfirmation, orderConfig, bookingConfig, onNavigate, shop }) => {
    const { t } = useLocalization();
    const { showToast } = useToast();
    const [slugInput, setSlugInput] = useState(customUrlSlug || '');
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [isSavingSlug, setIsSavingSlug] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [editingMenuItem, setEditingMenuItem] = useState<PersistentMenuItem | null>(null);

    const [isWelcomeActionModalOpen, setIsWelcomeActionModalOpen] = useState(false);
    const [editingWelcomeAction, setEditingWelcomeAction] = useState<PersistentMenuItem | null>(null);
    
    const baseUrl = `${window.location.origin}/bot/`;

    useEffect(() => {
        if (!permissions.can('customUrlSlug')) return;
        if (slugInput === customUrlSlug) { setSlugStatus('idle'); return; }
        const handler = setTimeout(async () => {
            if (slugInput.trim() === '') { setSlugStatus('idle'); return; }
            setSlugStatus('checking');
            const slugIsTaken = await isSlugTaken(slugInput, shopId);
            setSlugStatus(slugIsTaken ? 'taken' : 'available');
        }, 500);
        return () => clearTimeout(handler);
    }, [slugInput, customUrlSlug, shopId, permissions]);

    const handleSlugSave = () => {
        if (slugStatus === 'available') {
            setIsSavingSlug(true);
            setTimeout(() => { // Simulate API delay
                onCustomUrlSlugChange(slugInput);
                setSlugStatus('idle');
                showToast(t('customUrlSaved'), 'success');
                setIsSavingSlug(false);
            }, 500);
        }
    };
    
    const handleCopyToClipboard = () => {
        const urlToCopy = customUrlSlug ? `${baseUrl}${customUrlSlug}` : `${window.location.origin}?live=true&shopId=${shopId}`;
        navigator.clipboard.writeText(urlToCopy).then(() => {
            setCopied(true);
            showToast(t('urlCopied'), 'info');
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const handleOpenMenuModal = (item?: PersistentMenuItem) => {
        if (item) {
            setEditingMenuItem(item);
        } else {
            setEditingMenuItem({ id: `new_${Date.now()}`, type: PersistentMenuItemType.POSTBACK, title: 'New Item', payload: '' });
        }
        setIsMenuModalOpen(true);
    };

    const handleSaveMenuItem = (itemToSave: PersistentMenuItem) => {
        const isNew = itemToSave.id.startsWith('new_');
        if (isNew) {
            onPersistentMenuChange([...persistentMenu, { ...itemToSave, id: `menu_${Date.now()}` }]);
        } else {
            onPersistentMenuChange(persistentMenu.map(item => item.id === itemToSave.id ? itemToSave : item));
        }
        showToast(t('menuItemDeletedSuccess'), 'success');
        setIsMenuModalOpen(false);
        setEditingMenuItem(null);
    };

    const deleteMenuItem = (id: string) => {
        const itemTitle = persistentMenu.find(item => item.id === id)?.title || 'this item';
        showConfirmation({
            title: t('deleteMenuItem'),
            message: t('areYouSureDeleteMenuItem', { itemTitle }),
            confirmText: t('delete'),
            onConfirm: () => {
                onPersistentMenuChange(persistentMenu.filter(item => item.id !== id));
                showToast(t('menuItemDeletedSuccess'), 'success');
            }
        });
    };
    
    const handleOpenWelcomeActionModal = (item?: PersistentMenuItem) => {
         if (item) {
            setEditingWelcomeAction(item);
        } else {
            if ((entryPoint.welcomeMessageActions || []).length >= 3) {
                showToast("You can have a maximum of 3 welcome buttons.", 'error');
                return;
            }
            setEditingWelcomeAction({ id: `new_wm_${Date.now()}`, type: PersistentMenuItemType.POSTBACK, title: 'New Button', payload: '' });
        }
        setIsWelcomeActionModalOpen(true);
    };

    const handleSaveWelcomeAction = (itemToSave: PersistentMenuItem) => {
        const currentActions = entryPoint.welcomeMessageActions || [];
        const isNew = itemToSave.id.startsWith('new_');
        let updatedActions;
        if (isNew) {
            updatedActions = [...currentActions, { ...itemToSave, id: `wm_action_${Date.now()}` }];
        } else {
            updatedActions = currentActions.map(item => item.id === itemToSave.id ? itemToSave : item);
        }
        onEntryPointChange({ ...entryPoint, welcomeMessageActions: updatedActions });
        showToast(t('buttonDeletedSuccess'), 'success');
        setIsWelcomeActionModalOpen(false);
        setEditingWelcomeAction(null);
    };
    
    const deleteWelcomeAction = (id: string) => {
        const buttonTitle = entryPoint.welcomeMessageActions?.find(item => item.id === id)?.title || 'this button';
        showConfirmation({
            title: t('deleteButton'),
            message: t('areYouSureDeleteButton', { buttonTitle }),
            confirmText: t('delete'),
            onConfirm: () => {
                const updatedActions = (entryPoint.welcomeMessageActions || []).filter(item => item.id !== id);
                onEntryPointChange({ ...entryPoint, welcomeMessageActions: updatedActions });
                showToast(t('buttonDeletedSuccess'), 'success');
            }
        });
    };


    const getMenuItemDescription = (item: PersistentMenuItem): string => {
        const action = getActionFromItem(item);
        switch (action) {
            case 'open_form':
                const formName = forms.find(f => f.id === item.payload)?.name || 'a form';
                return `Opens form: "${formName}"`;
            case 'open_a_web_url':
                return `Opens link: ${item.url}`;
            case 'show_all_payment_methods':
                return `Shows all payment methods`;
            case 'manage_order':
                return `Starts 'Manage Order' flow`;
            case 'manage_booking':
                return `Starts 'Manage Booking' flow`;
            case 'show_categories':
                return `Shows product categories`;
            case 'show_kb_section': {
                const sectionId = item.payload?.replace('KB_SECTION_ID_', '');
                const sectionName = knowledgeBase.userDefined.find(s => s.id === sectionId)?.title || 'a section';
                return `Shows info: "${sectionName}"`;
            }
            case 'postback':
                return `Sends message: "${item.payload}"`;
            default:
                return 'Configured action';
        }
    };

    return (
        <>
        {isMenuModalOpen && editingMenuItem && (
            <MenuItemEditorModal
                item={editingMenuItem}
                onSave={handleSaveMenuItem}
                onCancel={() => setIsMenuModalOpen(false)}
                forms={forms}
                paymentMethods={paymentMethods}
                knowledgeSections={knowledgeBase.userDefined}
                orderConfig={orderConfig}
                bookingConfig={bookingConfig}
            />
        )}
        {isWelcomeActionModalOpen && editingWelcomeAction && (
             <MenuItemEditorModal
                item={editingWelcomeAction}
                onSave={handleSaveWelcomeAction}
                onCancel={() => setIsWelcomeActionModalOpen(false)}
                forms={forms}
                paymentMethods={paymentMethods}
                knowledgeSections={knowledgeBase.userDefined}
                orderConfig={orderConfig}
                bookingConfig={bookingConfig}
            />
        )}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-white border-b border-gray-600 pb-4">{t('publishAndShare')}</h2>
            
            <div className="space-y-10">

                <section>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">Connected Channels</h3>
                    <p className="text-sm text-gray-400 mb-4">Manage where your assistant is active. Add new channels to create a unified inbox.</p>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {shop.integrations?.facebook?.isConnected && <ChannelIcon channel="facebook" className="w-8 h-8" />}
                            {shop.integrations?.instagram?.isConnected && <ChannelIcon channel="instagram" className="w-8 h-8" />}
                        </div>
                        <button onClick={() => onNavigate('settings', 'integrations')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
                            Manage Integrations
                        </button>
                    </div>
                </section>

                <section>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2"><LinkIcon className="w-5 h-5" /> {t('yourBotsPublicURL')}</h3>
                    <p className="text-sm text-gray-400 mb-4">{t('shareThisLink')}</p>
                    <div className="flex items-center gap-2 p-3 bg-gray-900/50 rounded-md border border-gray-700">
                        <input type="text" readOnly value={customUrlSlug ? `${baseUrl}${customUrlSlug}` : `${window.location.origin}?live=true&shopId=${shopId}`} className="w-full bg-transparent text-sm text-gray-300 focus:outline-none" />
                        <button onClick={handleCopyToClipboard} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600">
                            {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4 text-gray-300" />}
                        </button>
                    </div>
                </section>

                <section className="relative group">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">{t('customURLSlug')}</h3>
                    <p className="text-sm text-gray-400 mb-4">{t('customURLDescription')}</p>
                    <div className="flex items-center gap-2">
                        <div className="p-3 bg-gray-700 rounded-l-md border border-r-0 border-gray-600"><span className="text-sm text-gray-400">{baseUrl}</span></div>
                        <input type="text" value={slugInput} onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="your-shop-name" className="flex-grow bg-gray-900/50 border-y border-gray-600 p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 z-10" disabled={!permissions.can('customUrlSlug') || isSavingSlug} />
                        <button onClick={handleSlugSave} disabled={slugStatus !== 'available' || isSavingSlug} className="p-3 bg-blue-600 text-white rounded-r-md text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed z-10 flex items-center justify-center w-24">
                            {isSavingSlug ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : t('save')}
                        </button>
                    </div>
                    <div className="h-6 mt-1 px-3 text-xs">
                        {slugStatus === 'checking' && <p className="text-yellow-400">{t('checkingAvailability')}</p>}
                        {slugStatus === 'taken' && <p className="text-red-400">{t('slugTaken')}</p>}
                        {slugStatus === 'available' && <p className="text-green-400">{t('slugAvailable')}</p>}
                    </div>
                     {!permissions.can('customUrlSlug') && (<div className="absolute inset-0 bg-gray-800/70 flex items-center justify-center rounded-lg cursor-not-allowed"><span className="text-sm font-semibold text-white bg-black/50 px-4 py-2 rounded-md">{t('upgradeForCustomURL')}</span></div>)}
                </section>

                 <section>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">{t('customerEntryPoint')}</h3>
                    <p className="text-sm text-gray-400 mb-4">{t('customerEntryPointDescription')}</p>
                    <div className="space-y-3 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div>
                            <label className="flex items-center p-3 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                <input type="radio" name="entry-point" checked={entryPoint.type === 'chat'} onChange={() => onEntryPointChange({ ...entryPoint, type: 'chat', formId: null })} className="h-4 w-4 text-blue-500 bg-gray-600 border-gray-500" />
                                <span className="ml-3 text-sm font-medium text-white">{t('startWithChat')}</span>
                            </label>
                             {entryPoint.type === 'chat' && (
                                <div className="mt-2 ml-10 pl-4 border-l-2 border-gray-700 space-y-4">
                                    <div>
                                        <label htmlFor="welcome-message" className="block text-sm font-medium text-gray-300 mb-1">{t('welcomeMessage')}</label>
                                        <textarea
                                            id="welcome-message"
                                            value={entryPoint.welcomeMessage || ''}
                                            onChange={e => onEntryPointChange({ ...entryPoint, welcomeMessage: e.target.value })}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            rows={3}
                                            placeholder="e.g., Welcome to our shop! How can I help you?"
                                            maxLength={WELCOME_MESSAGE_CHARACTER_LIMIT}
                                        />
                                        <p className="text-right text-xs text-gray-400 mt-1">
                                            {(entryPoint.welcomeMessage || '').length} / {WELCOME_MESSAGE_CHARACTER_LIMIT}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('welcomeButtons')}</label>
                                        <div className="space-y-2">
                                            {(entryPoint.welcomeMessageActions || []).map(item => (
                                                <div key={item.id} className="bg-gray-700 p-3 rounded-md border border-gray-600 flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-white text-sm">{item.title}</p>
                                                        <p className="text-xs text-blue-300">{getMenuItemDescription(item)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => handleOpenWelcomeActionModal(item)} className="p-1 text-gray-300 hover:text-white"><PencilIcon className="w-4 h-4"/></button>
                                                        <button onClick={() => deleteWelcomeAction(item.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={() => handleOpenWelcomeActionModal()} disabled={(entryPoint.welcomeMessageActions || []).length >= 3} className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 rounded-md text-sm text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                <PlusIcon className="w-4 h-4 mr-2" /> {t('addButton')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="flex items-center p-3 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                <input type="radio" name="entry-point" checked={entryPoint.type === 'form'} onChange={() => onEntryPointChange({ ...entryPoint, type: 'form', formId: forms[0]?.id || null })} className="h-4 w-4 text-blue-500 bg-gray-600 border-gray-500" />
                                <span className="ml-3 text-sm font-medium text-white">{t('startWithForm')}</span>
                            </label>
                            {entryPoint.type === 'form' && (
                                <div className="mt-2 ml-10">
                                    <select value={entryPoint.formId || ''} onChange={e => onEntryPointChange({ ...entryPoint, type: 'form', formId: e.target.value })} className="bg-gray-600 border border-gray-500 rounded p-2 text-sm w-full md:w-auto" disabled={forms.length === 0}>
                                        {forms.length > 0 ? (forms.map(form => <option key={form.id} value={form.id}>{form.name}</option>)) : (<option value="">{t('noFormsAvailable')}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2"><MenuIcon className="w-5 h-5"/> {t('persistentMenu')}</h3>
                    <p className="text-sm text-gray-400 mb-4">{t('persistentMenuDescription')}</p>
                    <div className="space-y-3 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        {persistentMenu.map((item) => (
                             <div key={item.id} className="bg-gray-700 p-3 rounded-md border border-gray-600 flex items-center justify-between">
                                 <div>
                                    <p className="font-semibold text-white">{item.title}</p>
                                    <p className="text-xs text-blue-300">{getMenuItemDescription(item)}</p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <button onClick={() => handleOpenMenuModal(item)} className="p-1 text-gray-300 hover:text-white"><PencilIcon className="w-4 h-4"/></button>
                                     <button onClick={() => deleteMenuItem(item.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                 </div>
                             </div>
                        ))}
                         <button onClick={() => handleOpenMenuModal()} className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 rounded-md text-sm text-gray-400 transition-colors">
                            <PlusIcon className="w-4 h-4 mr-2" /> {t('addMenuItem')}
                        </button>
                    </div>
                </section>
            </div>
        </div>
        </>
    );
};

export default PublishPanel;