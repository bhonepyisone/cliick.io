import React, { useState } from 'react';
import { Shop, ShopPaymentMethod } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import { useToast } from '../contexts/ToastContext';
import InfoIcon from './icons/InfoIcon';
import ToggleSwitch from './ToggleSwitch';


interface PaymentSettingsProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    showConfirmation: (config: { title: string, message: string, onConfirm: () => void, confirmText?: string, confirmButtonClass?: string }) => void;
}

const PaymentMethodEditor: React.FC<{
    method: Partial<ShopPaymentMethod>;
    onSave: (method: ShopPaymentMethod) => void;
    onCancel: () => void;
}> = ({ method: initialMethod, onSave, onCancel }) => {
    const [method, setMethod] = useState<Partial<ShopPaymentMethod>>({ enabled: true, ...initialMethod });
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMethod(prev => ({...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMethod(prev => ({...prev, requiresProof: e.target.checked }));
    };

    const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMethod(prev => ({...prev, qrCodeUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!method.name?.trim() || !method.instructions?.trim()) {
            showToast('Please provide a name and instructions.', 'error');
            return;
        }
        setIsSaving(true);
        setTimeout(() => { // Simulate save delay for UX
            const methodToSave: ShopPaymentMethod = {
                id: method.id || `pm_${Date.now()}`,
                name: method.name!,
                instructions: method.instructions!,
                requiresProof: method.requiresProof || false,
                qrCodeUrl: method.qrCodeUrl,
                enabled: method.enabled !== false, // Default to true
            };
            onSave(methodToSave);
            setIsSaving(false);
        }, 500);
    };

    return (
        <div className="bg-gray-700 p-4 rounded-lg border-2 border-blue-500 space-y-4 animate-fade-in mb-4">
            <h4 className="text-md font-bold text-white">{method.id ? 'Edit Payment Method' : 'Add New Payment Method'}</h4>
            <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">Method Name</label>
                <input type="text" name="name" value={method.name || ''} onChange={handleChange} placeholder="e.g., KBZ Pay, Cash on Delivery" className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">Instructions for Customer</label>
                <textarea name="instructions" value={method.instructions || ''} onChange={handleChange} placeholder="e.g., Account Name: U Ba, Account No: 12345" className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" rows={4}/>
            </div>
            <div className="flex items-center gap-4">
                {method.qrCodeUrl && <img src={method.qrCodeUrl} alt="QR Preview" className="w-16 h-16 rounded bg-white p-0.5" />}
                <div className="flex-grow">
                     <label className="text-sm font-medium text-gray-300 block mb-1">QR Code Image (Optional)</label>
                     <input type="file" accept="image/*" onChange={handleQrUpload} className="w-full text-sm text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-600 file:text-gray-200 hover:file:bg-gray-500"/>
                </div>
            </div>
            <div>
                <label className="flex items-center text-sm text-gray-200 cursor-pointer">
                    <input type="checkbox" checked={method.requiresProof || false} onChange={handleCheckboxChange} className="h-4 w-4 rounded bg-gray-600 border border-gray-500 text-blue-500 focus:ring-blue-500" />
                    <span className="ml-2">Requires payment proof (screenshot upload)</span>
                </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md" disabled={isSaving}>Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-wait" disabled={isSaving}>
                    {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    {isSaving ? 'Saving...' : 'Save Method'}
                </button>
            </div>
        </div>
    );
};


const PaymentSettings: React.FC<PaymentSettingsProps> = ({ shop, onUpdateShop, showConfirmation }) => {
    const { paymentMethods: methods, paymentIntroMessage, paymentButtonText } = shop;
    const [editingMethod, setEditingMethod] = useState<Partial<ShopPaymentMethod> | null>(null);
    const { showToast } = useToast();

    const handleMethodsChange = (newMethods: ShopPaymentMethod[]) => {
        onUpdateShop(s => ({ ...s, paymentMethods: newMethods }));
    };

    const handleIntroMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdateShop(s => ({ ...s, paymentIntroMessage: e.target.value }));
    };
    
    const handleButtonTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateShop(s => ({ ...s, paymentButtonText: e.target.value }));
    };

    const handleSave = (methodToSave: ShopPaymentMethod) => {
        const isNew = !methods.some(m => m.id === methodToSave.id);
        if (isNew) {
            handleMethodsChange([...methods, methodToSave]);
        } else {
            handleMethodsChange(methods.map(m => m.id === methodToSave.id ? methodToSave : m));
        }
        showToast('Payment method saved!', 'success');
        setEditingMethod(null);
    };
    
    const handleDelete = (id: string) => {
        const methodName = methods.find(m => m.id === id)?.name || 'this method';
        showConfirmation({
            title: 'Delete Payment Method',
            message: `Are you sure you want to delete the "${methodName}" payment method?`,
            confirmText: 'Delete',
            confirmButtonClass: 'bg-red-600 hover:bg-red-700',
            onConfirm: () => {
                handleMethodsChange(methods.filter(m => m.id !== id));
                showToast(`"${methodName}" deleted.`, 'success');
            }
        });
    };
    
    const handleToggle = (id: string, enabled: boolean) => {
        handleMethodsChange(methods.map(m => m.id === id ? { ...m, enabled } : m));
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <div className="mb-6">
                <label className="text-sm font-medium text-gray-300 block mb-2">Button Name</label>
                <input
                    type="text"
                    value={paymentButtonText || ''}
                    onChange={handleButtonTextChange}
                    maxLength={20}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                />
                 <p className="text-xs text-gray-400 mt-1 text-right">{(paymentButtonText || '').length} / 20</p>
            </div>
            <div className="mb-6">
                <label className="text-sm font-medium text-gray-300 block mb-2">Then reply with this message</label>
                <textarea
                    value={paymentIntroMessage || ''}
                    onChange={handleIntroMessageChange}
                    placeholder="e.g., We accept the following payment methods:"
                    rows={3}
                    maxLength={450}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                />
                 <p className="text-xs text-gray-400 mt-1 text-right">{(paymentIntroMessage || '').length} / 450</p>
                <p className="text-xs text-gray-400 mt-1">This message is sent when a customer clicks the "Payment Methods" button.</p>
            </div>
            {editingMethod && (
                <PaymentMethodEditor 
                    method={editingMethod}
                    onSave={handleSave}
                    onCancel={() => setEditingMethod(null)}
                />
            )}

            <div className="space-y-2">
                {methods.map(method => (
                    <div key={method.id} className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${method.enabled ? 'bg-gray-700' : 'bg-gray-800'}`}>
                        <div className="flex-grow">
                            <p className={`font-semibold ${method.enabled ? 'text-white' : 'text-gray-500'}`}>{method.name}</p>
                            <p className={`text-xs ${method.enabled ? 'text-gray-400' : 'text-gray-600'}`}>{method.requiresProof ? 'Proof required' : 'No proof needed'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <ToggleSwitch enabled={method.enabled} onChange={(isEnabled) => handleToggle(method.id, isEnabled)} />
                            <button onClick={() => setEditingMethod(method)} className="p-2 text-gray-400 hover:text-white"><PencilIcon className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete(method.id)} className="p-2 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>

            <button 
                onClick={() => setEditingMethod({})} 
                disabled={!!editingMethod}
                className="w-full flex items-center justify-center mt-3 p-2 border-2 border-dashed border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 rounded-md text-sm text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <PlusIcon className="w-4 h-4 mr-2" /> Add Payment Method
            </button>
        </div>
    );
};

export default PaymentSettings;