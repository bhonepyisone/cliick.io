import React, { useState, useEffect } from 'react';
import { Form, PersistentMenuItem, PersistentMenuItemType, ShopPaymentMethod, KnowledgeSection, OrderManagementFlowConfig, BookingFlowConfig, MenuItemAction } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';

// Helper to determine the action type from a menu item object
export const getActionFromItem = (item: PersistentMenuItem): MenuItemAction => {
    if (item.type === PersistentMenuItemType.OPEN_FORM) return 'open_form';
    if (item.type === PersistentMenuItemType.WEB_URL) return 'open_a_web_url';
    if (item.payload === 'SHOW_ALL_PAYMENT_METHODS') return 'show_all_payment_methods';
    if (item.payload === 'MANAGE_ORDER_FLOW') return 'manage_order';
    if (item.payload === 'MANAGE_BOOKING_FLOW') return 'manage_booking';
    if (item.payload === 'SHOW_PRODUCT_CATEGORIES') return 'show_categories';
    if (item.payload?.startsWith('KB_SECTION_ID_')) return 'show_kb_section';
    if (item.payload === 'HANDOVER_TO_HUMAN') return 'handover_to_human';
    return 'postback';
};

interface MenuItemEditorProps {
    item: Partial<PersistentMenuItem> | null;
    onSave: (item: PersistentMenuItem) => void;
    onCancel: () => void;
    forms: Form[];
    paymentMethods: ShopPaymentMethod[];
    knowledgeSections: KnowledgeSection[];
    orderConfig: OrderManagementFlowConfig;
    bookingConfig: BookingFlowConfig;
    isModal?: boolean;
}

export const MenuItemEditor: React.FC<MenuItemEditorProps> = ({
    item: initialItem,
    onSave,
    onCancel,
    forms,
    paymentMethods,
    knowledgeSections,
    orderConfig,
    bookingConfig,
    isModal = false,
}) => {
    const { t } = useLocalization();
    const { showToast } = useToast();
    const [item, setItem] = useState<Partial<PersistentMenuItem> | null>(initialItem);
    const [action, setAction] = useState<MenuItemAction | null>(
        initialItem ? getActionFromItem(initialItem as PersistentMenuItem) : null
    );

    useEffect(() => {
        setItem(initialItem);
        setAction(initialItem ? getActionFromItem(initialItem as PersistentMenuItem) : null);
    }, [initialItem]);

     const handleActionChange = (newAction: MenuItemAction) => {
        setAction(newAction);
        if (!item) return;
        const updatedItem = { ...item };
        
        if (newAction === 'open_a_web_url') {
            updatedItem.type = PersistentMenuItemType.WEB_URL;
            updatedItem.url = 'https://';
            updatedItem.payload = undefined;
        } else if (newAction === 'open_form') {
            updatedItem.type = PersistentMenuItemType.OPEN_FORM;
            updatedItem.payload = forms[0]?.id || '';
            updatedItem.url = undefined;
        } else {
            updatedItem.type = PersistentMenuItemType.POSTBACK;
            updatedItem.url = undefined;
            switch (newAction) {
                case 'show_all_payment_methods': updatedItem.payload = 'SHOW_ALL_PAYMENT_METHODS'; break;
                case 'manage_order': updatedItem.payload = 'MANAGE_ORDER_FLOW'; break;
                case 'manage_booking': updatedItem.payload = 'MANAGE_BOOKING_FLOW'; break;
                case 'show_categories': updatedItem.payload = 'SHOW_PRODUCT_CATEGORIES'; break;
                case 'show_kb_section': updatedItem.payload = `KB_SECTION_ID_${knowledgeSections.filter(s => s.isCustom)[0]?.id || ''}`; break;
                case 'handover_to_human': updatedItem.payload = 'HANDOVER_TO_HUMAN'; break;
                case 'postback': updatedItem.payload = item.payload || ''; break; // Retain old payload if switching
            }
        }
        setItem(updatedItem);
    };

    const handleSave = () => {
        if (!item || !item.title?.trim()) {
            showToast("Button title cannot be empty.", "error");
            return;
        }
        if (item.title.length > 20) {
            showToast('Title cannot be longer than 20 characters.', 'error');
            return;
        }
        onSave(item as PersistentMenuItem);
    };

    const handlePayloadChange = (value: string) => {
        if (action === 'open_a_web_url') {
            setItem(prev => prev ? ({ ...prev, url: value }) : null);
        } else { // open_form and all postbacks use payload
            setItem(prev => prev ? ({ ...prev, payload: value }) : null);
        }
    };

    if (!item || action === null) {
        return null;
    }
    
    const containerClass = isModal 
        ? "space-y-4"
        : "bg-gray-600 p-3 rounded-lg space-y-2 border border-blue-500 animate-fade-in-fast";
    
    const labelClass = isModal ? "text-sm font-medium text-gray-300 block mb-1" : "text-xs font-medium text-gray-300 block mb-1";
    const inputClass = isModal ? "w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" : "w-full bg-gray-700 border border-gray-500 rounded p-1.5 text-sm text-white";

    const formContent = (
        <>
            <div>
                <label className={labelClass}>Title</label>
                <input type="text" value={item.title || ''} onChange={e => setItem(prev => prev ? ({...prev, title: e.target.value}) : null)} maxLength={20} className={inputClass} />
                <p className="text-xs text-right text-gray-400 mt-1">{(item.title || '').length} / 20</p>
            </div>
             <div>
                <label className={labelClass}>Action</label>
                <select value={action} onChange={e => handleActionChange(e.target.value as MenuItemAction)} className={inputClass}>
                    <option value="postback">Send a message</option>
                    <option value="open_form">Open an order form</option>
                    <option value="open_a_web_url">Open a Web URL</option>
                    <option value="show_categories">Show product categories</option>
                    <option value="show_kb_section">Show info from Train AI</option>
                    <option value="show_all_payment_methods">Show all payment methods</option>
                    {orderConfig.enabled && <option value="manage_order">Start 'Manage Order' flow</option>}
                    {bookingConfig.enabled && <option value="manage_booking">Start 'Manage Booking' flow</option>}
                    <option value="handover_to_human">{t('handoverToHuman')}</option>
                </select>
            </div>
            <div>
                {action === 'postback' && ( <> <label className={labelClass}>Message to Send</label> <input type="text" value={item.payload || ''} onChange={e => handlePayloadChange(e.target.value)} className={inputClass} /> </> )}
                {action === 'open_form' && ( <> <label className={labelClass}>Select Form</label> <select value={item.payload || ''} onChange={e => handlePayloadChange(e.target.value)} className={inputClass} disabled={forms.length === 0}> {forms.length > 0 ? forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>) : <option>No forms available</option>} </select> </> )}
                {action === 'open_a_web_url' && ( <> <label className={labelClass}>Web URL</label> <input type="url" value={item.url || ''} onChange={e => handlePayloadChange(e.target.value)} placeholder="https://example.com" className={inputClass} /> </> )}
                {action === 'show_kb_section' && ( <> <label className={labelClass}>Select Section</label> <select value={item.payload || ''} onChange={e => handlePayloadChange(e.target.value)} className={inputClass} disabled={knowledgeSections.filter(s => s.isCustom).length === 0}> {knowledgeSections.filter(s => s.isCustom).length > 0 ? knowledgeSections.filter(s => s.isCustom).map(s => <option key={s.id} value={`KB_SECTION_ID_${s.id}`}>{s.title}</option>) : <option>No custom 'Train AI' sections</option>} </select> </> )}
                {action === 'manage_order' && ( <p className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded-md">This action will start an automated process for a customer to manage their order (edit address, cancel, etc.).</p> )}
                {action === 'manage_booking' && ( <p className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded-md">This action will start an automated process for a customer to manage their service booking.</p> )}
                {action === 'show_categories' && ( <p className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded-md">This action will display a list of your product categories for the customer to choose from.</p> )}
                {action === 'show_all_payment_methods' && ( <p className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded-md">This action will show all your enabled payment methods and let the customer choose one.</p> )}
                {action === 'handover_to_human' && ( <p className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded-md">This will stop the AI from replying and alert your team that a human agent is needed.</p> )}
            </div>
        </>
    );

    return (
        <div className={containerClass}>
            {!isModal && <h5 className="text-sm font-semibold text-white">{item.id && !item.id.startsWith('new_') ? t('editButton') : t('addNewButton')}</h5>}
            {formContent}
            <div className={`flex justify-end gap-2 ${isModal ? 'pt-4 border-t border-gray-700' : ''}`}>
                <button onClick={onCancel} className={`px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md ${isModal ? '' : 'px-3 py-1.5 text-xs'}`}>{t('cancel')}</button>
                <button onClick={handleSave} className={`px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold ${isModal ? '' : 'px-3 py-1.5 text-xs'}`}>{t('save')}</button>
            </div>
        </div>
    );
};

export default MenuItemEditor;