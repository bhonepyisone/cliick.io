import React, { useState, useMemo, useEffect } from 'react';
import { Shop, Item, FormSubmission, OrderStatus, Form, FormFieldType } from '../types';
import { generateOrderId } from '../services/shopService';
import FormPreview from './FormPreview';
import SearchIcon from './icons/SearchIcon';
import TrashIcon from './icons/TrashIcon';
import XIcon from './icons/XIcon';
import PlusIcon from './icons/PlusIcon';
import ReceiptModal from './ReceiptModal';
import PosIcon from './icons/PosIcon';
import { useLocalization } from '../hooks/useLocalization';
import { usePermissions } from '../hooks/usePermissions';


interface OfflineSalePanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    permissions: ReturnType<typeof usePermissions>;
}

interface CartItem {
    productId: string;
    quantity: number;
    name: string;
    unitPrice: number;
    stock: number;
    imageUrl?: string;
}

const OfflineSalePanel: React.FC<OfflineSalePanelProps> = ({ shop, onUpdateShop, permissions }) => {
    const { t } = useLocalization();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [discount, setDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number }>({ type: 'percentage', value: 0 });
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<FormSubmission | null>(null);

    
    const categories = useMemo(() => ['all', ...Array.from(new Set(shop.items.map(p => p.category).filter(Boolean))) as string[]], [shop.items]);

    const filteredProducts = useMemo(() => {
        return shop.items.filter(p => {
            const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [shop.items, searchTerm, categoryFilter]);

    const subtotal = useMemo(() => {
        return cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    }, [cart]);

    const discountAmount = useMemo(() => {
        if (!discount || discount.value <= 0) return 0;
        if (discount.type === 'percentage') {
            return subtotal * (discount.value / 100);
        }
        return Math.min(subtotal, discount.value); // Fixed amount cannot be more than subtotal
    }, [subtotal, discount]);

    const finalTotal = subtotal - discountAmount;

    const addToCart = (product: Item) => {
        const existingItem = cart.find(item => item.productId === product.id);
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                updateQuantity(product.id, existingItem.quantity + 1);
            }
        } else {
             if (product.stock > 0) {
                setCart(prev => [...prev, {
                    productId: product.id,
                    name: product.name,
                    quantity: 1,
                    unitPrice: product.promoPrice || product.retailPrice,
                    stock: product.stock,
                    imageUrl: product.imageUrl,
                }]);
            }
        }
    };

    const updateQuantity = (productId: string, quantity: number) => {
        const item = cart.find(i => i.productId === productId);
        if (!item) return;
        const newQuantity = Math.max(0, Math.min(item.stock, quantity));
        if (newQuantity === 0) {
            removeFromCart(productId);
        } else {
            setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: newQuantity } : i));
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setDiscount({ type: 'percentage', value: 0 });
    };
    
    const handleFinalizeOrder = (submission: FormSubmission) => {
        const newOrderId = generateOrderId(shop.name, shop.formSubmissions);
        const finalSubmission: FormSubmission = {
            ...submission,
            orderId: newOrderId,
            formName: `${submission.formName} (Offline Sale)`
        };

        onUpdateShop(s => ({
            ...s,
            formSubmissions: [...s.formSubmissions, finalSubmission],
            // Also update stock
            items: s.items.map(p => {
                const orderedProduct = finalSubmission.orderedProducts.find(op => op.productId === p.id);
                if (orderedProduct) {
                    return { ...p, stock: p.stock - orderedProduct.quantity };
                }
                return p;
            })
        }));

        setIsCheckoutModalOpen(false);
        clearCart();
        
        if (finalSubmission.status === OrderStatus.Completed) {
            setIsReceiptModalOpen(finalSubmission);
        }
    };
    
    if (!permissions.can('offlineSale')) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex items-center justify-center text-center">
                <div>
                    <PosIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">{t('unlockOfflinePOS')}</h2>
                    <p className="text-gray-400 mb-6">{t('unlockOfflinePOSDesc')}</p>
                    <button onClick={() => {}} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg">
                        {t('upgradeToPro')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product Catalog */}
            <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg flex flex-col h-full overflow-hidden">
                <h3 className="text-lg font-bold text-white mb-4">{t('products')}</h3>
                <div className="flex gap-4 mb-4">
                     <div className="relative flex-grow">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder={t('searchProducts')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-full py-2 pl-9 pr-4 text-sm text-white"/>
                    </div>
                     <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-full py-2 px-4 text-sm text-white">
                        {categories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? t('allCategories') : cat}</option>)}
                    </select>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredProducts.map(product => (
                            <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock === 0} className="bg-gray-700 rounded-lg text-left relative group disabled:opacity-50 transition-transform hover:scale-105">
                                <div className="aspect-square bg-gray-600 rounded-t-lg">
                                    <img src={product.imageUrl || 'https://placehold.co/400x400/27272a/71717a?text=?'} alt={product.name} className="w-full h-full object-cover rounded-t-lg"/>
                                </div>
                                <div className="p-2">
                                    <p className="text-xs font-semibold text-white truncate leading-tight">{product.name}</p>
                                    <p className="text-xs text-blue-400">{(product.promoPrice || product.retailPrice).toLocaleString()} {t('mmk')}</p>
                                </div>
                                {product.stock <= 10 && (
                                    <div className={`absolute top-1 right-1 text-white text-[10px] px-1.5 py-0.5 rounded-full ${product.stock === 0 ? 'bg-red-600' : 'bg-yellow-600'}`}>Stock: {product.stock}</div>
                                )}
                                <div className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                    <PlusIcon className="w-6 h-6 text-white"/>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Cart */}
            <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">{t('currentOrder')}</h3>
                    <button onClick={clearCart} disabled={cart.length === 0} className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50">{t('clearAll')}</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                     {cart.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">{t('clickProductToStart')}</div>
                     ) : (
                        cart.map(item => (
                             <div key={item.productId} className="flex items-center gap-3">
                                <img src={item.imageUrl || 'https://placehold.co/40x40/27272a/71717a?text=?'} alt={item.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                <div className="flex-grow min-w-0">
                                    <p className="text-sm text-white truncate">{item.name}</p>
                                    <p className="text-xs text-gray-400">{item.unitPrice.toLocaleString()} {t('mmk')}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <input type="number" value={item.quantity} onChange={e => updateQuantity(item.productId, parseInt(e.target.value, 10) || 0)} className="w-12 bg-gray-700 border border-gray-600 rounded p-1 text-center text-sm" />
                                    <button onClick={() => removeFromCart(item.productId)} className="p-1 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))
                     )}
                </div>
                <div className="flex-shrink-0 pt-4 border-t border-gray-700 space-y-3">
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>{t('subtotal')}</span><span>{subtotal.toLocaleString()} {t('mmk')}</span></div>
                        <div className="flex justify-between items-center gap-2">
                           <div className="flex items-center gap-2">
                                <select value={discount.type} onChange={e => setDiscount(d => ({...d, type: e.target.value as any}))} className="bg-gray-700 border-gray-600 rounded p-1 text-xs">
                                    <option value="percentage">%</option>
                                    <option value="fixed">{t('mmk')}</option>
                                </select>
                                <input type="number" placeholder={t('discount')} value={discount.value || ''} onChange={e => setDiscount(d => ({...d, value: parseFloat(e.target.value) || 0}))} className="w-20 bg-gray-700 border-gray-600 rounded p-1 text-sm"/>
                           </div>
                           <span className="text-red-400">- {discountAmount.toLocaleString(undefined, {maximumFractionDigits: 0})} {t('mmk')}</span>
                        </div>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-gray-600">
                        <span className="text-lg text-gray-300">{t('total')}</span>
                        <span className="text-lg text-white">{finalTotal.toLocaleString(undefined, {maximumFractionDigits: 0})} {t('mmk')}</span>
                    </div>
                    <button onClick={() => setIsCheckoutModalOpen(true)} disabled={cart.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed">{t('createOrder')}</button>
                </div>
            </div>

            {isCheckoutModalOpen && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                    <div className="bg-[#1D3B59] w-full max-w-lg h-[90vh] rounded-lg shadow-2xl flex flex-col">
                         <header className="p-4 border-b border-[#2c4f73] flex justify-between items-center flex-shrink-0">
                             <h2 className="text-lg font-bold text-white">{t('finalizeOfflineOrder')}</h2>
                             <button onClick={() => setIsCheckoutModalOpen(false)} className="p-1 rounded-full text-gray-400 hover:bg-[#2c4f73] hover:text-white"><XIcon className="w-5 h-5" /></button>
                         </header>
                         <CheckoutForm cart={cart} shop={shop} onFinalize={handleFinalizeOrder} discount={discount}/>
                    </div>
                 </div>
            )}
             {isReceiptModalOpen && (
                <ReceiptModal 
                    submission={isReceiptModalOpen} 
                    shop={shop} 
                    onClose={() => setIsReceiptModalOpen(null)} 
                />
            )}
             <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
        </>
    );
};

const CheckoutForm: React.FC<{
    cart: CartItem[];
    shop: Shop;
    onFinalize: (submission: FormSubmission) => void;
    discount: { type: 'percentage' | 'fixed'; value: number };
}> = ({ cart, shop, onFinalize, discount }) => {
     const { t } = useLocalization();
     const [selectedFormId, setSelectedFormId] = useState<string | null>(shop.offlineSaleConfig?.defaultFormId || (shop.forms.length > 0 ? shop.forms[0].id : null));
     
     const selectedForm = useMemo(() => shop.forms.find(f => f.id === selectedFormId), [selectedFormId, shop.forms]);

     const cartForPreview: { [productId: string]: number } = useMemo(() => cart.reduce((acc, item) => {
        acc[item.productId] = item.quantity;
        return acc;
    }, {} as { [productId: string]: number }), [cart]);

     if (shop.forms.length === 0) {
        return <div className="p-6 text-center text-gray-400">{t('noFormsForOffline')}</div>
     }
    
     return (
        <>
            <div className="p-4 flex-shrink-0 border-b border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('selectOrderForm')}</label>
                <select value={selectedFormId || ''} onChange={e => setSelectedFormId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white">
                    {shop.forms.map(form => <option key={form.id} value={form.id}>{form.name}</option>)}
                </select>
            </div>
             <div className="flex-grow overflow-hidden">
                {selectedForm && (
                     <FormPreview 
                        form={selectedForm}
                        items={shop.items}
                        paymentMethods={shop.paymentMethods}
                        onFormSubmit={onFinalize}
                        initialSelectedProducts={cartForPreview}
                        isProductSelectorDisabled={true}
                        discount={discount}
                        showStatusSelector={true}
                        initialStatus={OrderStatus.Completed}
                        currency={shop.currency}
                    />
                )}
            </div>
        </>
     );
}


export default OfflineSalePanel;