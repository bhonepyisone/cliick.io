import React, { useState, useMemo } from 'react';
import { Form, FormField, FormSubmission, Item, FormFieldType, OrderedItem, ShopPaymentMethod, OrderStatus } from '../types';
import { useToast } from '../contexts/ToastContext';

interface FormPreviewProps {
    form: Form;
    items: Item[];
    paymentMethods: ShopPaymentMethod[];
    onFormSubmit: (submission: FormSubmission) => void;
    initialSelectedProducts?: { [productId: string]: number };
    isProductSelectorDisabled?: boolean;
    discount?: { type: 'percentage' | 'fixed'; value: number };
    showStatusSelector?: boolean;
    initialStatus?: OrderStatus;
    currency: string;
}

const InputField: React.FC<{ field: FormField; value: any; onChange: (value: any) => void; }> = ({ field, value, onChange }) => {
    switch (field.type) {
        case FormFieldType.SHORT_TEXT:
        case FormFieldType.NUMBER:
        case FormFieldType.EMAIL:
        case FormFieldType.PHONE:
        case FormFieldType.DATE:
            const inputType = {
                [FormFieldType.SHORT_TEXT]: 'text',
                [FormFieldType.NUMBER]: 'number',
                [FormFieldType.EMAIL]: 'email',
                [FormFieldType.PHONE]: 'tel',
                [FormFieldType.DATE]: 'date',
            }[field.type] || 'text';
            return <input type={inputType} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white placeholder-gray-400" />;
        case FormFieldType.TEXT_AREA:
            return <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} rows={4} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white placeholder-gray-400" />;
        case FormFieldType.DROPDOWN:
            return (
                <select value={value || ''} onChange={(e) => onChange(e.target.value)} required={field.required} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white">
                    <option value="" disabled>Select an option</option>
                    {field.options?.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
            );
        case FormFieldType.MULTIPLE_CHOICE:
            return (
                <div className="space-y-2">
                    {field.options?.map(option => (
                        <label key={option} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50">
                            <input type="radio" name={field.id} value={option} checked={value === option} onChange={(e) => onChange(e.target.value)} required={field.required} className="h-4 w-4 bg-gray-600 border-gray-500 text-blue-500" />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
            );
        case FormFieldType.CHECKBOX:
             return (
                <div className="space-y-2">
                    {field.options?.map(option => (
                        <label key={option} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50">
                            <input type="checkbox" value={option} checked={Array.isArray(value) && value.includes(option)} onChange={(e) => {
                                const currentValues = Array.isArray(value) ? [...value] : [];
                                if (e.target.checked) {
                                    onChange([...currentValues, option]);
                                } else {
                                    onChange(currentValues.filter(v => v !== option));
                                }
                            }} className="h-4 w-4 bg-gray-600 border-gray-500 text-blue-500" />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
            );
        default:
            return null;
    }
};


const FormPreview: React.FC<FormPreviewProps> = ({ form, items, paymentMethods, onFormSubmit, initialSelectedProducts, isProductSelectorDisabled, discount, showStatusSelector = false, initialStatus = OrderStatus.Pending, currency }) => {
    const [formData, setFormData] = useState<{ [key: string]: any }>({});
    const [selectedItems, setSelectedItems] = useState<{ [itemId: string]: number }>(initialSelectedProducts || {});
    const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(initialStatus);
    const { showToast } = useToast();

    const itemSelectorField = form.fields.find(f => f.type === FormFieldType.ITEM_SELECTOR);
    const paymentSelectorField = form.fields.find(f => f.type === FormFieldType.PAYMENT_SELECTOR);

    const itemsToShow = useMemo(() => {
        if (!itemSelectorField?.itemIds) return [];
        return items.filter(p => itemSelectorField.itemIds!.includes(p.id));
    }, [itemSelectorField, items]);

    const paymentMethodsToShow = useMemo(() => {
        if (!paymentSelectorField?.paymentMethodIds) return [];
        return paymentMethods.filter(p => p.enabled && paymentSelectorField.paymentMethodIds!.includes(p.id));
    }, [paymentSelectorField, paymentMethods]);

    const selectedPaymentMethodDetails = paymentMethodsToShow.find(pm => pm.id === formData[paymentSelectorField?.id || '']);
    
    const subtotal = useMemo(() => {
        return Object.entries(selectedItems).reduce((total, [itemId, quantity]: [string, number]) => {
            const item = items.find(p => p.id === itemId);
            if (item) {
                return total + (item.promoPrice || item.retailPrice) * quantity;
            }
            return total;
        }, 0);
    }, [selectedItems, items]);

    const discountAmount = useMemo(() => {
        if (!discount || discount.value <= 0) return 0;
        if (discount.type === 'percentage') {
            return subtotal * (discount.value / 100);
        }
        return Math.min(subtotal, discount.value); // Fixed amount cannot be more than subtotal
    }, [subtotal, discount]);

    const finalTotal = subtotal - discountAmount;

    const handleItemQuantityChange = (itemId: string, quantity: number) => {
        if (isProductSelectorDisabled) return;
        const item = items.find(p => p.id === itemId);
        if (!item) return;
        const stock = item.stock;
        const newQuantity = Math.max(0, Math.min(stock, quantity));
        setSelectedItems(prev => ({ ...prev, [itemId]: newQuantity }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentScreenshot(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Enhanced validation with specific error messages
        const validationErrors: string[] = [];
        
        for (const field of form.fields) {
            if (field.required) {
                if (field.type === FormFieldType.ITEM_SELECTOR) {
                    if (Object.values(selectedItems).every((q: number) => q === 0 || isNaN(q))) {
                        validationErrors.push('Please select at least one item with quantity greater than 0.');
                    }
                } else if (field.type === FormFieldType.PAYMENT_SELECTOR) {
                    if (!formData[field.id]) {
                        validationErrors.push('Please select a payment method.');
                    }
                } else {
                    const value = formData[field.id];
                    if (!value || (typeof value === 'string' && value.trim() === '')) {
                        validationErrors.push(`"${field.label}" is required.`);
                    } else {
                        // Additional field-specific validation
                        if (field.type === FormFieldType.EMAIL && typeof value === 'string') {
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(value)) {
                                validationErrors.push(`"${field.label}" must be a valid email address.`);
                            }
                        } else if (field.type === FormFieldType.PHONE && typeof value === 'string') {
                            const phoneRegex = /^[0-9+\-\s()]+$/;
                            if (!phoneRegex.test(value) || value.replace(/[^0-9]/g, '').length < 7) {
                                validationErrors.push(`"${field.label}" must be a valid phone number.`);
                            }
                        } else if (field.type === FormFieldType.NUMBER && typeof value === 'string') {
                            const numValue = parseFloat(value);
                            if (isNaN(numValue)) {
                                validationErrors.push(`"${field.label}" must be a valid number.`);
                            }
                        }
                    }
                }
            }
        }
        
        // Payment proof validation
        if (selectedPaymentMethodDetails?.requiresProof && !paymentScreenshot) {
            validationErrors.push(`Payment proof screenshot is required for ${selectedPaymentMethodDetails.name}.`);
        }
        
        // Stock validation
        for (const [itemId, quantity] of Object.entries(selectedItems)) {
            const qty = typeof quantity === 'number' ? quantity : parseInt(String(quantity), 10);
            if (qty > 0) {
                const item = items.find(p => p.id === itemId);
                if (item && qty > item.stock) {
                    validationErrors.push(`${item.name}: Requested quantity (${qty}) exceeds available stock (${item.stock}).`);
                }
            }
        }
        
        // Display validation errors
        if (validationErrors.length > 0) {
            const errorMessage = validationErrors.length === 1 
                ? validationErrors[0]
                : `Please fix the following issues:\n\n${validationErrors.map((err, i) => `${i + 1}. ${err}`).join('\n')}`;
            showToast(errorMessage, 'error');
            return;
        }

        const orderedItems: OrderedItem[] = Object.entries(selectedItems)
            .filter(([, quantity]: [string, number]) => quantity > 0)
            .map(([itemId, quantity]: [string, number]) => {
                const item = items.find(p => p.id === itemId)!;
                return {
                    productId: itemId,
                    productName: item.name,
                    quantity,
                    unitPrice: item.promoPrice || item.retailPrice,
                };
            });

        const submissionData: FormSubmission = {
            submissionId: `sub_${Date.now()}`,
            formId: form.id,
            formName: form.name,
            submittedAt: Date.now(),
            status: selectedStatus,
            orderedProducts: orderedItems,
            paymentMethod: selectedPaymentMethodDetails?.name,
            paymentScreenshotUrl: paymentScreenshot,
        };
        
        if (discount && discount.value > 0) {
            submissionData.discount = {
                ...discount,
                amount: discountAmount,
            };
        }

        form.fields.forEach(field => {
            if (field.type !== FormFieldType.ITEM_SELECTOR && field.type !== FormFieldType.PAYMENT_SELECTOR) {
                submissionData[field.label] = formData[field.id];
            }
        });
        
        onFormSubmit(submissionData);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-6 text-white h-full overflow-y-auto bg-gray-900">
            {form.fields.map(field => (
                <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === FormFieldType.ITEM_SELECTOR ? (
                        <div className="space-y-3">
                            {itemsToShow.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-800 rounded-md">
                                    <img src={item.imageUrl || 'https://placehold.co/40x40/27272a/71717a?text=?'} alt={item.name} className="w-12 h-12 rounded object-cover" />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm">{item.name}</p>
                                        <p className="text-xs text-blue-400">{(item.promoPrice || item.retailPrice).toLocaleString()} {currency}</p>
                                    </div>
                                    <input type="number" min="0" max={item.stock} value={selectedItems[item.id] || 0} onChange={e => handleItemQuantityChange(item.id, parseInt(e.target.value, 10))} className="w-16 bg-gray-700 border border-gray-600 rounded p-1 text-center" readOnly={isProductSelectorDisabled}/>
                                </div>
                            ))}
                        </div>
                    ) : field.type === FormFieldType.PAYMENT_SELECTOR ? (
                        <div className="space-y-2">
                            {paymentMethodsToShow.map(method => (
                                <label key={method.id} className="flex items-start gap-3 p-3 rounded-md border border-gray-700 hover:bg-gray-800/50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-900/20">
                                    <input type="radio" name={field.id} value={method.id} checked={formData[field.id] === method.id} onChange={e => handleInputChange(field.id, e.target.value)} required={field.required} className="h-5 w-5 mt-1 bg-gray-600 border-gray-500 text-blue-500" />
                                    <div className="flex-grow">
                                        <p className="font-semibold">{method.name}</p>
                                        <p className="text-xs text-gray-400 whitespace-pre-wrap">{method.instructions}</p>
                                    </div>
                                </label>
                            ))}
                             {selectedPaymentMethodDetails?.requiresProof && (
                                <div className="mt-4 pl-8">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Upload Payment Screenshot*</label>
                                    <input type="file" accept="image/*" onChange={handleFileChange} required className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-gray-700 file:text-white" />
                                    {paymentScreenshot && <img src={paymentScreenshot} alt="preview" className="mt-2 w-24 h-24 object-cover rounded"/>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <InputField field={field} value={formData[field.id]} onChange={(value) => handleInputChange(field.id, value)} />
                    )}
                </div>
            ))}
            
            <div className="sticky bottom-0 bg-gray-900 py-4 border-t border-gray-700">
                <div className="space-y-1 mb-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Subtotal:</span>
                        <span>{subtotal.toLocaleString()} {currency}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-sm text-red-400">
                            <span>Discount ({discount?.type === 'percentage' ? `${discount.value}%` : `${discount?.value.toLocaleString()} ${currency}`}):</span>
                            <span>- {discountAmount.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center font-semibold text-lg pt-1 border-t border-gray-700/50 mt-1">
                        <span className="">Total:</span>
                        <span className="text-blue-400">{finalTotal.toLocaleString(undefined, {maximumFractionDigits: 0})} {currency}</span>
                    </div>
                </div>

                {showStatusSelector && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Finalize Status As:
                        </label>
                        <select 
                            value={selectedStatus} 
                            onChange={e => setSelectedStatus(e.target.value as OrderStatus)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"
                        >
                            <option value={OrderStatus.Completed}>Completed (In-person sale)</option>
                            <option value={OrderStatus.Confirmed}>Confirmed (Tele-sale)</option>
                            <option value={OrderStatus.Pending}>Pending (Tele-sale)</option>
                        </select>
                    </div>
                )}

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Submit Order</button>
            </div>
        </form>
    );
};

export default FormPreview;