import React, { useState, useEffect } from 'react';
import { ShopPaymentMethod, FormField } from '../types';
import XIcon from './icons/XIcon';
import { useLocalization } from '../hooks/useLocalization';

interface PaymentSelectorConfigModalProps {
    onClose: () => void;
    onSave: (selectedIds: string[]) => void;
    allMethods: ShopPaymentMethod[];
    field: FormField | undefined | null;
}

const PaymentSelectorConfigModal: React.FC<PaymentSelectorConfigModalProps> = ({ onClose, onSave, allMethods, field }) => {
    const { t } = useLocalization();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (field) {
            setSelectedIds(new Set(field.paymentMethodIds || []));
        }
    }, [field]);

    if (!field) {
        return null;
    }

    const handleToggle = (methodId: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(methodId)) {
            newSet.delete(methodId);
        } else {
            newSet.add(methodId);
        }
        setSelectedIds(newSet);
    };
    
    const handleSave = () => {
        onSave(Array.from(selectedIds));
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700 flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{t('configurePaymentMethodsTitle')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                    {allMethods.length === 0 && (
                         <p className="text-center text-gray-400 py-4">{t('noPaymentMethodsConfigured')}</p>
                    )}
                    {allMethods.map(method => (
                        <label key={method.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.has(method.id)}
                                onChange={() => handleToggle(method.id)}
                                className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500 mt-1 flex-shrink-0"
                            />
                           <div className="flex-grow">
                                <p className="font-semibold text-white">{method.name}</p>
                                <p className="text-xs text-gray-400 whitespace-pre-wrap">{method.instructions}</p>
                           </div>
                        </label>
                    ))}
                </div>
                <footer className="p-4 bg-gray-900/50 flex justify-between items-center rounded-b-lg border-t border-gray-700">
                    <span className="text-sm text-gray-400">{t('methodsSelected', { count: selectedIds.size.toString(), total: allMethods.length.toString() })}</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">{t('saveSelection')}</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default PaymentSelectorConfigModal;