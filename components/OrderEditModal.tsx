import React, { useState, useMemo } from 'react';
import { FormSubmission, Item, OrderStatus, OrderedItem, ShopPaymentMethod } from '../types';
import XIcon from './icons/XIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { useLocalization } from '../hooks/useLocalization';

interface OrderEditModalProps {
    submission: FormSubmission;
    onClose: () => void;
    onSave: (updatedSubmission: FormSubmission) => void;
    products: Item[];
    paymentMethods: ShopPaymentMethod[];
}

const OrderEditModal: React.FC<OrderEditModalProps> = ({ submission, onClose, onSave, products, paymentMethods }) => {
    const { t } = useLocalization();
    const [editableSubmission, setEditableSubmission] = useState<FormSubmission>(JSON.parse(JSON.stringify(submission)));

    const customFieldKeys = useMemo(() => 
        Object.keys(submission).filter(key => 
            !['submissionId', 'orderId', 'submittedAt', 'formId', 'formName', 'status', 'orderedProducts', 'paymentMethod', 'paymentScreenshotUrl'].includes(key)
        ), 
    [submission]);

    const handleCustomFieldChange = (key: string, value: string) => {
        setEditableSubmission(prev => ({ ...prev, [key]: value }));
    };

    const handleProductQuantityChange = (productId: string, quantity: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const stock = product.stock;
        const newQuantity = Math.max(0, Math.min(stock, quantity));
        
        setEditableSubmission(prev => ({
            ...prev,
            orderedProducts: prev.orderedProducts.map(p => 
                p.productId === productId ? { ...p, quantity: newQuantity } : p
            )
        }));
    };
    
    const handleRemoveProduct = (productId: string) => {
        setEditableSubmission(prev => ({
            ...prev,
            orderedProducts: prev.orderedProducts.filter(p => p.productId !== productId)
        }));
    };

    const handleAddProduct = (productId: string) => {
        if (!productId || editableSubmission.orderedProducts.some(p => p.productId === productId)) {
            return; // Don't add if empty or already exists
        }
        const productToAdd = products.find(p => p.id === productId);
        if (!productToAdd) return;

        const newOrderedProduct: OrderedItem = {
            productId: productToAdd.id,
            productName: productToAdd.name,
            quantity: 1,
            unitPrice: productToAdd.promoPrice || productToAdd.retailPrice,
        };
        setEditableSubmission(prev => ({
            ...prev,
            orderedProducts: [...prev.orderedProducts, newOrderedProduct]
        }));
    };
    
    const availableProductsToAdd = useMemo(() => {
        const orderedIds = new Set(editableSubmission.orderedProducts.map(p => p.productId));
        return products.filter(p => !orderedIds.has(p.id));
    }, [products, editableSubmission.orderedProducts]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-white">{t('editOrder')}: {submission.orderId || 'N/A'}</h3>
                        <p className="text-xs text-gray-400">{t('internalId')}: {submission.submissionId}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Customer Info */}
                    <section>
                        <h4 className="font-semibold text-gray-200 mb-3">{t('customerInformation')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customFieldKeys.map(key => (
                                <div key={key}>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">{key}</label>
                                    <input
                                        type="text"
                                        value={editableSubmission[key] || ''}
                                        onChange={e => handleCustomFieldChange(key, e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Products */}
                    <section>
                         <h4 className="font-semibold text-gray-200 mb-3">{t('orderedProducts')}</h4>
                         <div className="space-y-2">
                             {editableSubmission.orderedProducts.map(item => (
                                 <div key={item.productId} className="flex items-center gap-3 p-2 bg-gray-700/50 rounded-md">
                                     <div className="flex-grow">
                                         <p className="text-sm font-medium text-white">{item.productName}</p>
                                         <p className="text-xs text-gray-400">{item.unitPrice.toLocaleString()} {t('mmk')}</p>
                                     </div>
                                     <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={e => handleProductQuantityChange(item.productId, parseInt(e.target.value, 10) || 0)}
                                        className="w-20 bg-gray-600 border border-gray-500 rounded p-1 text-center text-sm text-white"
                                     />
                                     <button onClick={() => handleRemoveProduct(item.productId)} className="p-1 text-gray-400 hover:text-red-400">
                                         <TrashIcon className="w-4 h-4"/>
                                     </button>
                                 </div>
                             ))}
                             <div className="flex gap-2 pt-2">
                                <select onChange={e => handleAddProduct(e.target.value)} value="" className="flex-grow bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white disabled:opacity-50" disabled={availableProductsToAdd.length === 0}>
                                    <option value="" disabled>{availableProductsToAdd.length > 0 ? t('addProduct') : t('allProductsAdded')}</option>
                                    {availableProductsToAdd.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                             </div>
                         </div>
                    </section>
                    
                     {/* Status & Payment */}
                    <section>
                        <h4 className="font-semibold text-gray-200 mb-3">{t('orderDetails')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">{t('orderStatus')}</label>
                                <select 
                                    value={editableSubmission.status} 
                                    onChange={e => setEditableSubmission(prev => ({...prev, status: e.target.value as OrderStatus}))}
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"
                                >
                                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">{t('paymentMethod')}</label>
                                <select 
                                    value={editableSubmission.paymentMethod || ''} 
                                    onChange={e => setEditableSubmission(prev => ({...prev, paymentMethod: e.target.value}))}
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"
                                >
                                     <option value="">N/A</option>
                                    {paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
                                </select>
                             </div>
                        </div>
                    </section>
                </div>
                
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3 flex-shrink-0 border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                    <button onClick={() => onSave(editableSubmission)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">{t('saveChanges')}</button>
                </footer>
            </div>
            <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default OrderEditModal;