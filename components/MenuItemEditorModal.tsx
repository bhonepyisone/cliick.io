import React from 'react';
import { Form, PersistentMenuItem, ShopPaymentMethod, KnowledgeSection, OrderManagementFlowConfig, BookingFlowConfig } from '../types';
import XIcon from './icons/XIcon';
import { useLocalization } from '../hooks/useLocalization';
import MenuItemEditor from './MenuItemEditor';

// Re-export for any other files that might need it
export { getActionFromItem } from './MenuItemEditor';

export const MenuItemEditorModal: React.FC<{
    item: PersistentMenuItem;
    onSave: (item: PersistentMenuItem) => void;
    onCancel: () => void;
    forms: Form[];
    paymentMethods: ShopPaymentMethod[];
    knowledgeSections: KnowledgeSection[];
    orderConfig: OrderManagementFlowConfig;
    bookingConfig: BookingFlowConfig;
}> = (props) => {
    const { t } = useLocalization();
    const { item, onCancel } = props;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{item.id.startsWith('new') ? t('addButton') : t('editButton')}</h3>
                    <button onClick={onCancel} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-6">
                    <MenuItemEditor {...props} isModal={true} />
                </div>
            </div>
        </div>
    );
};