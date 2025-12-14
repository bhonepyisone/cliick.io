import React, { useState, useRef, useMemo, useEffect, ReactNode } from 'react';
import { Item, Form, OnlineSaleConfig, ShopPaymentMethod, KnowledgeBase, OrderManagementFlowConfig, BookingFlowConfig, PersistentMenuItem, PersistentMenuItemType, StockMovement, Shop, Language } from '../types';
import api from '../services/apiService';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import SparklesIcon from './icons/SparklesIcon';
import AIPhotoStudioModal from './AIPhotoStudioModal';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import XIcon from './icons/XIcon';
import { getPlatformSettings } from '../services/platformSettingsService';
import { MenuItemEditorModal, getActionFromItem } from './MenuItemEditorModal';
import { usePermissions } from '../hooks/usePermissions';
import { sanitizeText, sanitizeHtml, validatePrice, validateLength } from '../utils/sanitize';
import { rateLimiter, RATE_LIMITS } from '../utils/rateLimiter';
import { addItem, updateItem, deleteItem, updateItemStock } from '../services/supabaseHelpers';
import { logger } from '../utils/logger';


interface CatalogPanelProps {
  items: Item[];
  onItemsChange: (items: Item[]) => void;
  permissions: ReturnType<typeof usePermissions>;
  forms: Form[];
  showConfirmation: (config: { title: string, message: React.ReactNode, onConfirm: () => void, confirmText?: string, confirmButtonClass?: string }) => void;
  onlineSaleConfig?: OnlineSaleConfig;
  paymentMethods: ShopPaymentMethod[];
  knowledgeBase: KnowledgeBase;
  orderConfig: OrderManagementFlowConfig;
  bookingConfig: BookingFlowConfig;
  onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
  shop: Shop;
}

const AdjustmentModal: React.FC<{
    item: Item | null;
    initialChange: number;
    onClose: () => void;
    onConfirm: (adjustment: number, reason: string) => void;
}> = ({ item, initialChange, onClose, onConfirm }) => {
    const { t } = useLocalization();
    const [adjustment, setAdjustment] = useState<number | string>(initialChange);
    const [reason, setReason] = useState('');
    const [otherReason, setOtherReason] = useState('');
    
    useEffect(() => {
        if (item) {
            const isService = item.itemType === 'service';
            const getDefaultReason = () => {
                if (isService) {
                    return initialChange > 0 ? 'New Availability Opened' : 'Holiday / Event Closure';
                }
                return initialChange > 0 ? 'New Shipment' : 'Damaged Goods';
            };
            setAdjustment(initialChange);
            setReason(getDefaultReason());
            setOtherReason('');
        }
    }, [item, initialChange]);
    
    if (!item) {
        return null;
    }
    
    const isService = item.itemType === 'service';
    
    const handleConfirm = () => {
        const finalReason = reason === 'Other' ? otherReason.trim() : reason;
        const numAdjustment = typeof adjustment === 'string' ? parseInt(adjustment, 10) : adjustment;

        if (!finalReason) {
            alert(isService ? 'Please provide a reason for the capacity change.' : t('pleaseProvideReason'));
            return;
        }
        if (isNaN(numAdjustment)) {
             alert('Please enter a valid adjustment quantity.');
            return;
        }
        onConfirm(numAdjustment, finalReason);
    };

    const numAdjustment = typeof adjustment === 'string' ? parseInt(adjustment, 10) || 0 : adjustment;
    const newTotal = item.stock + numAdjustment;
    
    const productReasons = [
        { value: "New Shipment", label: t('newShipment') },
        { value: "Stocktake Correction", label: t('stocktakeCorrection') },
        { value: "Damaged Goods", label: t('damagedGoods') },
        { value: "Return", label: t('return') },
        { value: "Other", label: t('other') }
    ];

    const serviceReasons = [
        { value: "New Availability Opened", label: "New Availability Opened" },
        { value: "Schedule Change", label: "Schedule Change" },
        { value: "Holiday / Event Closure", label: "Holiday / Event Closure" },
        { value: "Manual Correction", label: "Manual Correction" },
        { value: "Other", label: t('other') }
    ];

    const reasons = isService ? serviceReasons : productReasons;
    
    const title = isService ? "Adjust Service Capacity" : t('stockAdjustment');
    const currentLabel = isService ? "Current Capacity" : "Current";
    const adjustmentLabel = isService ? "Change" : "Adjustment";
    const newTotalLabel = isService ? "New Capacity" : "New Total";

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm border border-gray-700">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5"/></button>
                </header>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-300"><strong>{t('item')}:</strong> {item.name}</p>
                    <div className="grid grid-cols-3 gap-4 items-center text-center">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">{currentLabel}</label>
                            <p className="font-bold text-lg">{item.stock}</p>
                        </div>
                         <div className="flex flex-col items-center">
                            <label htmlFor="adjustment-input" className="block text-xs text-gray-400 mb-1">{adjustmentLabel}</label>
                            <input
                                id="adjustment-input"
                                type="number"
                                value={adjustment}
                                onChange={e => setAdjustment(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-center font-bold text-lg"
                            />
                        </div>
                         <div>
                            <label className="block text-xs text-gray-400 mb-1">{newTotalLabel}</label>
                            <p className={`font-bold text-lg ${newTotal < item.stock ? 'text-red-400' : 'text-green-400'}`}>{newTotal}</p>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="reason-select-bulk" className="block text-sm font-medium text-gray-300 mb-1">{t('reason')}</label>
                        <select id="reason-select-bulk" value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm">
                            {reasons.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    {reason === 'Other' && (
                        <input type="text" value={otherReason} onChange={e => setOtherReason(e.target.value)} placeholder="Please specify..." className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm" />
                    )}
                </div>
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                    <button onClick={handleConfirm} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">{t('confirm')}</button>
                </footer>
            </div>
        </div>
    );
};

const ManageCategoryModal: React.FC<{
    categoryName: string | null;
    onClose: () => void;
    onRename: (newName: string) => void;
    onDelete: () => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ categoryName, onClose, onRename, onDelete, showToast }) => {
    const { t } = useLocalization();
    const [name, setName] = useState(categoryName || '');

    useEffect(() => {
        setName(categoryName || '');
    }, [categoryName]);

    if (!categoryName) {
        return null;
    }

    const handleRename = () => {
        if (!name.trim()) {
            showToast(t('categoryNameEmpty'), 'error');
            return;
        }
        if (name.trim() !== categoryName) {
            onRename(name.trim());
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{t('manageCategory')}: {categoryName}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="category-name-input" className="block text-sm font-medium text-gray-300 mb-1">{t('categoryName')}</label>
                        <input
                            id="category-name-input"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"
                        />
                    </div>
                </div>
                <footer className="p-4 bg-gray-900/50 flex justify-between items-center rounded-b-lg">
                    <button onClick={onDelete} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold flex items-center gap-2">
                        <TrashIcon className="w-4 h-4"/> {t('delete')}
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                        <button onClick={handleRename} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">{t('saveChanges')}</button>
                    </div>
                </footer>
            </div>
            <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
    );
};


const PriceAdjustModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onApply: (type: 'percentage' | 'fixed', value: number, rounding: number) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ isOpen, onClose, onApply, showToast }) => {
    const { t } = useLocalization();
    const [adjType, setAdjType] = useState<'percentage' | 'fixed'>('percentage');
    const [adjValue, setAdjValue] = useState(0);
    const [rounding, setRounding] = useState(0);

    if (!isOpen) {
        return null;
    }

    const handleApply = () => {
        if (!adjValue) {
            showToast(t('enterAdjustmentValue'), 'error');
            return;
        }
        onApply(adjType, adjValue, rounding);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
                <div className="p-6 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">{t('bulkPriceAdjustTitle')}</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-2">{t('adjustmentType')}</label>
                        <div className="flex space-x-2 bg-gray-900/50 p-1 rounded-lg">
                             <button onClick={() => setAdjType('percentage')} className={`flex-1 text-center px-4 py-2 text-sm rounded-md transition-colors ${adjType === 'percentage' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{t('percentage')}</button>
                            <button onClick={() => setAdjType('fixed')} className={`flex-1 text-center px-4 py-2 text-sm rounded-md transition-colors ${adjType === 'fixed' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{t('fixedAmount')}</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">
                           {adjType === 'percentage' ? t('percentageAdjustment') : t('fixedAmountAdjustment')}
                        </label>
                        <input type="number" value={adjValue} onChange={e => setAdjValue(parseFloat(e.target.value))} placeholder={adjType === 'percentage' ? t('percentagePlaceholder') : t('fixedAmountPlaceholder')} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('roundToNearest')}</label>
                        <select value={rounding} onChange={e => setRounding(parseInt(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white">
                            <option value="0">{t('dontRound')}</option>
                            <option value="50">50 {t('mmk')}</option>
                            <option value="100">100 {t('mmk')}</option>
                            <option value="500">500 {t('mmk')}</option>
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end gap-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                    <button onClick={handleApply} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">{t('applyChanges')}</button>
                </div>
            </div>
        </div>
    );
};


const ImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onImport: (newItems: Item[]) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ isOpen, onClose, onImport, showToast }) => {
    const { t } = useLocalization();
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        // Reset state when modal is opened/closed
        setFile(null);
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = "name,itemType,description,retailPrice,stock,imageUrl,promoPrice,promoStartDate,promoEndDate,warranty,originalPrice,category,duration,location";
        const csvContent = "data:text/csv;charset=utf-8," + headers;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "item_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = () => {
        if (!file) {
            showToast(t('selectFileToImport'), 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text || text.trim() === '') {
                    showToast(t('csvEmpty'), 'error');
                    return;
                }
                
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    showToast(t('csvEmpty'), 'error');
                    return;
                }
                
                const headers = lines[0].split(',').map(h => h.trim());
                
                // Validate required headers
                const requiredHeaders = ['name', 'retailPrice', 'stock'];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    showToast(`Missing required columns: ${missingHeaders.join(', ')}. Please check your CSV file.`, 'error');
                    return;
                }
                
                const newItems: Item[] = [];
                const errors: string[] = [];
                const warnings: string[] = [];
                const numericFields = ['retailPrice', 'stock', 'promoPrice', 'originalPrice', 'duration'];

                for (let i = 1; i < lines.length; i++) {
                    const data = lines[i].split(',');
                    const itemData: any = {};
                    const rowNumber = i + 1;

                    headers.forEach((header, index) => {
                        itemData[header] = data[index] ? data[index].trim() : '';
                    });

                    let hasRowError = false;

                    // Validate numeric fields
                    for (const field of numericFields) {
                        if (itemData[field] && itemData[field] !== '') {
                            const numValue = parseFloat(itemData[field]);
                            if (isNaN(numValue)) {
                                errors.push(`Row ${rowNumber}: Invalid number for '${field}' (value: '${itemData[field]}')`);
                                hasRowError = true;
                            } else if (numValue < 0) {
                                errors.push(`Row ${rowNumber}: '${field}' cannot be negative (value: ${numValue})`);
                                hasRowError = true;
                            }
                        }
                    }
                    
                    // Validate required fields
                    if (!itemData.name || itemData.name.trim() === '') {
                         errors.push(`Row ${rowNumber}: 'name' is required`);
                         hasRowError = true;
                    }
                    if (!itemData.retailPrice || itemData.retailPrice.trim() === '') {
                         errors.push(`Row ${rowNumber}: 'retailPrice' is required`);
                         hasRowError = true;
                    }
                    if (!itemData.stock || itemData.stock.trim() === '') {
                         errors.push(`Row ${rowNumber}: 'stock' is required`);
                         hasRowError = true;
                    }
                    
                    // Validate promo dates
                    if (itemData.promoPrice && (!itemData.promoStartDate || !itemData.promoEndDate)) {
                        warnings.push(`Row ${rowNumber}: Promo price set but dates are missing`);
                    }
                    
                    // Validate itemType
                    if (itemData.itemType && !['product', 'service'].includes(itemData.itemType)) {
                        warnings.push(`Row ${rowNumber}: Invalid itemType '${itemData.itemType}', defaulting to 'product'`);
                    }

                    if (hasRowError) continue;

                    newItems.push({
                        id: `item_${Date.now()}_${i}`,
                        itemType: (itemData.itemType === 'service' ? 'service' : 'product'),
                        name: itemData.name.trim(),
                        description: itemData.description || '',
                        retailPrice: parseFloat(itemData.retailPrice),
                        stock: parseInt(itemData.stock, 10),
                        imageUrl: itemData.imageUrl || '',
                        promoPrice: itemData.promoPrice ? parseFloat(itemData.promoPrice) : undefined,
                        promoStartDate: itemData.promoStartDate || undefined,
                        promoEndDate: itemData.promoEndDate || undefined,
                        warranty: itemData.warranty || undefined,
                        originalPrice: itemData.originalPrice ? parseFloat(itemData.originalPrice) : undefined,
                        category: itemData.category || undefined,
                        duration: itemData.duration ? parseInt(itemData.duration, 10) : undefined,
                        location: itemData.location || undefined,
                    });
                }

                // Display results
                if (errors.length > 0) {
                    const errorDisplay = errors.slice(0, 10).join('\n');
                    const moreErrors = errors.length > 10 ? `\n...and ${errors.length - 10} more errors.` : '';
                    showToast(`Import failed with ${errors.length} error(s):\n\n${errorDisplay}${moreErrors}`, 'error');
                } else if (newItems.length === 0) {
                    showToast('No valid items found to import.', 'error');
                } else {
                    if (warnings.length > 0) {
                        const warningDisplay = warnings.slice(0, 5).join('\n');
                        console.warn('CSV Import Warnings:', warnings);
                        showToast(`Imported ${newItems.length} items with ${warnings.length} warning(s). Check console for details.`, 'info');
                    } else {
                        showToast(`Successfully imported ${newItems.length} items!`, 'success');
                    }
                    onImport(newItems);
                }
            } catch (error) {
                console.error('CSV import error:', error);
                showToast('Failed to process CSV file. Please ensure it is properly formatted.', 'error');
            }
        };
        reader.onerror = () => {
            showToast('Failed to read file. Please try again.', 'error');
        };
        reader.readAsText(file);
    };

    return (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
                <div className="p-6 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">{t('batchProductImport')}</h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-400">{t('batchProductImportDesc')}</p>
                    <button onClick={handleDownloadTemplate} className="text-sm text-blue-400 hover:underline">{t('downloadTemplate')}</button>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('csvFile')}</label>
                        <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"/>
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end gap-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                    <button onClick={handleImport} disabled={!file} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">{t('importProducts')}</button>
                </div>
            </div>
        </div>
    );
};

interface ItemEditorFormProps {
    item: Partial<Item>;
    setItem: React.Dispatch<React.SetStateAction<Partial<Item>>>;
    forms: Form[];
    allCategories: string[];
    onlineSaleConfig?: OnlineSaleConfig;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    paymentMethods: ShopPaymentMethod[];
    knowledgeBase: KnowledgeBase;
    orderConfig: OrderManagementFlowConfig;
    bookingConfig: BookingFlowConfig;
    showConfirmation: (config: any) => void;
    permissions: ReturnType<typeof usePermissions>;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    shop: Shop;
}

const ItemEditorForm: React.FC<ItemEditorFormProps> = ({
    item, setItem, forms, allCategories, onlineSaleConfig, showToast,
    paymentMethods, knowledgeBase, orderConfig, bookingConfig, showConfirmation,
    permissions, onUpdateShop, shop
}) => {
    const { t, language } = useLocalization();
    const [isAIEnhancerOpen, setIsAIEnhancerOpen] = useState(false);
    const [descriptionKeywords, setDescriptionKeywords] = useState('');
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isButtonEditorOpen, setIsButtonEditorOpen] = useState(false);
    const [editingButton, setEditingButton] = useState<PersistentMenuItem | null>(null);
    
    const platformSettings = getPlatformSettings();
    const descriptionCharLimit = platformSettings.aiConfig.descriptionGeneratorConfig.characterLimit;

    const { remaining: descCredits, limit: descLimit } = permissions.getRemainingCredits('aiDescriptionGeneration');
    const { remaining: photoCredits, limit: photoLimit } = permissions.getRemainingCredits('aiPhotoStudio');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        // Sanitize text inputs
        let sanitizedValue: string | number | undefined = value;
        
        if (type === 'number') {
            const numValue = value === '' ? undefined : parseFloat(value);
            // Validate prices
            if ((name === 'retailPrice' || name === 'originalPrice' || name === 'promoPrice') && numValue !== undefined) {
                const validation = validatePrice(numValue);
                if (!validation.valid) {
                    showToast(validation.error || 'Invalid price', 'error');
                    return;
                }
            }
            sanitizedValue = numValue;
        } else if (type === 'text' || type === 'textarea') {
            // Sanitize text fields to prevent XSS
            if (name === 'name' || name === 'category' || name === 'warranty' || name === 'location') {
                sanitizedValue = sanitizeText(value);
            } else if (name === 'description' || name === 'facebookSubtitle') {
                // Allow some basic formatting for descriptions
                sanitizedValue = sanitizeHtml(value);
            }
        }
        
        setItem(prev => ({ ...prev, [name]: sanitizedValue }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Rate limiting for image uploads
            const rateLimitKey = `image:upload:${shop.id}`;
            const rateLimit = rateLimiter.check(rateLimitKey, RATE_LIMITS.IMAGE_UPLOAD);
            
            if (!rateLimit.allowed) {
                showToast(rateLimit.message || 'Too many image uploads', 'error');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                showToast(t('pleaseUploadImage'), 'error');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                showToast(t('imageSizeLimit'), 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setItem(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateDescription = async () => {
        if (!item.name || !descriptionKeywords.trim()) {
            showToast(t('provideProductNameAndKeywords'), 'error');
            return;
        }
        if (descCredits !== null && descCredits <= 0) {
            showToast("No more description credits remaining this month.", 'error');
            return;
        }
        
        // Rate limiting for AI description generation
        const rateLimitKey = `ai:description:${shop.id}`;
        const rateLimit = rateLimiter.check(rateLimitKey, RATE_LIMITS.AI_DESCRIPTION);
        
        if (!rateLimit.allowed) {
            showToast(rateLimit.message || 'Too many AI requests', 'error');
            return;
        }

        setIsGeneratingDescription(true);
        try {
            const { description, facebookSubtitle } = await api.generateProductDescriptions(
                item.name,
                descriptionKeywords
            );
            setItem(prev => ({ ...prev, description, facebookSubtitle }));
            onUpdateShop(permissions.consumeCredit('aiDescriptionGeneration'));
        } catch (error) {
            console.error("Failed to generate description:", error);
            showToast(t('failedToGenerateDescription'), 'error');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleOpenButtonModal = (button?: PersistentMenuItem) => {
        if (button) {
            setEditingButton(button);
        } else {
            if ((item.buttons || []).length >= 2) {
                showToast("You can add a maximum of 2 action buttons.", 'error');
                return;
            }
            setEditingButton({ id: `new_${Date.now()}`, type: PersistentMenuItemType.POSTBACK, title: 'New Button', payload: '' });
        }
        setIsButtonEditorOpen(true);
    };

    const handleSaveButton = (buttonToSave: PersistentMenuItem) => {
        const currentButtons = item.buttons || [];
        const isNew = buttonToSave.id.startsWith('new_');
        let updatedButtons;
        if (isNew) {
            updatedButtons = [...currentButtons, { ...buttonToSave, id: `item_btn_${Date.now()}` }];
        } else {
            updatedButtons = currentButtons.map(btn => btn.id === buttonToSave.id ? buttonToSave : btn);
        }
        setItem(prev => ({ ...prev, buttons: updatedButtons }));
        setIsButtonEditorOpen(false);
        setEditingButton(null);
    };

    const handleDeleteButton = (id: string) => {
        const buttonTitle = item.buttons?.find(b => b.id === id)?.title || 'this button';
        showConfirmation({
            title: t('deleteButton'),
            message: t('areYouSureDeleteButton', { buttonTitle }),
            onConfirm: () => {
                setItem(prev => ({ ...prev, buttons: (prev.buttons || []).filter(b => b.id !== id) }));
            }
        });
    };
    
    const getButtonDescription = (button: PersistentMenuItem): string => {
        const action = getActionFromItem(button);
        switch (action) {
            case 'open_form':
                const formName = forms.find(f => f.id === button.payload)?.name || 'a form';
                return `Opens: "${formName}"`;
            case 'open_a_web_url':
                return `Opens link: ${button.url}`;
            case 'postback':
                return `Sends message: "${button.payload}"`;
            default: return 'Configured action';
        }
    };


    return (
        <>
        {isButtonEditorOpen && editingButton && (
            <MenuItemEditorModal
                item={editingButton}
                onSave={handleSaveButton}
                onCancel={() => setIsButtonEditorOpen(false)}
                forms={forms}
                paymentMethods={paymentMethods}
                knowledgeSections={knowledgeBase.userDefined}
                orderConfig={orderConfig}
                bookingConfig={bookingConfig}
            />
        )}
        {isAIEnhancerOpen && item.imageUrl && (
            <AIPhotoStudioModal
                imageUrl={item.imageUrl}
                onClose={() => setIsAIEnhancerOpen(false)}
                onSave={(newUrl) => {
                    setItem(p => ({...p, imageUrl: newUrl}));
                    setIsAIEnhancerOpen(false);
                }}
                permissions={permissions}
                onUpdateShop={onUpdateShop}
                shop={shop}
            />
        )}
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Visuals & Identity */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('itemType')}</label>
                        <select name="itemType" value={item.itemType || 'product'} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white">
                            <option value="product">{t('product')}</option>
                            <option value="service">{t('service')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('itemName')}</label>
                        <input type="text" name="name" value={item.name || ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('itemImage')}</label>
                        <div className="flex items-center gap-4 mt-1">
                            <div className="w-32 h-32 bg-gray-600 rounded-md flex-shrink-0 overflow-hidden border border-gray-500">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt="Item Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-center text-xs text-gray-400 p-2">{t('noImage')}</div>
                                )}
                            </div>
                            <div className="flex-grow space-y-2">
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"/>
                                <div className="relative group">
                                    <button type="button" onClick={() => setIsAIEnhancerOpen(true)} disabled={!permissions.can('aiPhotoStudio') || !item.imageUrl || (photoCredits !== null && photoCredits <= 0)} className="flex items-center gap-2 text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded disabled:bg-gray-500 disabled:cursor-not-allowed">
                                        <SparklesIcon className="w-4 h-4"/> {t('editWithAI')}
                                    </button>
                                     <span className="ml-2 text-xs text-gray-400">
                                        {photoLimit !== null ? `(${photoCredits}/${photoLimit} credits left)` : '(Unlimited credits)'}
                                    </span>
                                    {!permissions.can('aiPhotoStudio') && <div className="absolute bottom-full left-0 mb-2 w-max p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10">{t('aiPhotoStudioPro')}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative group flex-shrink-0">
                        <div className={`p-3 bg-gray-800/50 rounded-lg border border-gray-600 space-y-3 ${!permissions.can('aiDescriptionGeneration') ? 'opacity-50' : ''}`}>
                            <h5 className="text-sm font-semibold text-gray-200 flex items-center gap-2"> <SparklesIcon className="w-4 h-4 text-purple-400" /> {t('aiDescriptionGenerator')}
                                {descLimit !== null && <span className="text-xs font-normal text-gray-400">({descCredits}/{descLimit} credits left)</span>}
                            </h5>
                            <label htmlFor="ai-keywords" className="block text-xs font-medium text-gray-400">{t('keywordsForAi')}</label>
                            <textarea id="ai-keywords" value={descriptionKeywords} onChange={(e) => setDescriptionKeywords(e.target.value)} placeholder={t('keywordsPlaceholder')} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-xs text-white placeholder-gray-400 resize-none" disabled={isGeneratingDescription || !permissions.can('aiDescriptionGeneration')} rows={2}/>
                            <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDescription || !descriptionKeywords.trim() || !permissions.can('aiDescriptionGeneration') || (descCredits !== null && descCredits <= 0)} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-wait">
                                {isGeneratingDescription ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> {t('generating')}...</> : t('generateWithAI')}
                            </button>
                        </div>
                        {!permissions.can('aiDescriptionGeneration') && <div className="absolute inset-0 bg-gray-800/70 flex items-center justify-center rounded-lg cursor-not-allowed z-10"><span className="text-sm font-semibold text-white bg-black/50 px-4 py-2 rounded-md">{t('upgradeToUseFeature')}</span></div>}
                    </div>
                </div>

                {/* Right Column: Descriptions & Copywriting */}
                <div className="flex flex-col h-full">
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-600 space-y-3 flex-grow flex flex-col">
                        <h5 className="text-sm font-semibold text-gray-200 flex items-center gap-2 flex-shrink-0"> {t('descriptionAndFacebook')} </h5>
                        <div className="space-y-3 flex-grow flex flex-col">
                            <div className="flex-grow flex flex-col">
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor="item-description" className="block text-xs font-medium text-gray-400">{t('longDescription')}</label>
                                    <p className="text-xs text-gray-400">{(item.description || '').length} / {descriptionCharLimit}</p>
                                </div>
                                <textarea id="item-description" name="description" value={item.description || ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white flex-grow resize-none" placeholder={t('descriptionPlaceholder')} rows={8} maxLength={descriptionCharLimit} disabled={isGeneratingDescription}/>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor="facebook-subtitle" className="block text-xs font-medium text-gray-400">{t('facebookSubtitle')}</label>
                                    <p className="text-xs text-gray-400">{(item.facebookSubtitle || '').length} / 80</p>
                                </div>
                                <textarea id="facebook-subtitle" name="facebookSubtitle" value={item.facebookSubtitle || ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-xs text-white resize-none" placeholder={t('facebookSubtitlePlaceholder')} maxLength={80} disabled={isGeneratingDescription} rows={2} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="pt-6 border-t border-gray-600 space-y-4">
                <h4 className="text-md font-semibold text-gray-200">{t('pricingAndInventory')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('price')}</label>
                        <input type="number" name="retailPrice" value={item.retailPrice ?? ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('buyingPrice')}</label>
                        <input type="number" name="originalPrice" value={item.originalPrice ?? ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{item.itemType === 'service' ? t('capacitySlots') : t('stockOrCapacity')}</label>
                        <input type="number" name="stock" value={item.stock ?? ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('category')}</label>
                        <input type="text" name="category" value={item.category || ''} placeholder={t('categoryPlaceholder')} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" list="category-suggestions"/>
                        <datalist id="category-suggestions">
                            {allCategories.map(cat => <option key={cat} value={cat} />)}
                        </datalist>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-600 mt-4">
                 <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-semibold text-gray-200">{t('actionButtons')}</h4>
                    <span className="text-xs text-gray-400">{t('max2')}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{t('itemButtonsHint')}</p>
                <div className="space-y-2">
                    {(item.buttons || []).map(button => (
                        <div key={button.id} className="bg-gray-700 p-2 rounded-md flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">{button.title}</p>
                                <p className="text-xs text-blue-300">{getButtonDescription(button)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => handleOpenButtonModal(button)} className="p-1.5 text-gray-300 hover:text-white"><PencilIcon className="w-4 h-4"/></button>
                                <button type="button" onClick={() => handleDeleteButton(button.id)} className="p-1.5 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => handleOpenButtonModal()}
                        disabled={(item.buttons || []).length >= 2}
                        className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 rounded-md text-sm text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PlusIcon className="w-4 h-4 mr-2" /> {t('addButton')}
                    </button>
                </div>
            </div>
            
            {item.itemType === 'product' ? (
                 <div className="pt-4 border-t border-gray-600 mt-4">
                    <h4 className="text-md font-semibold text-gray-200">{t('productDetails')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">{t('warranty')}</label>
                            <input type="text" name="warranty" value={item.warranty || ''} placeholder={t('warrantyPlaceholder')} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                        </div>
                    </div>
                </div>
            ) : ( 
                 <div className="pt-4 border-t border-gray-600 mt-4">
                    <h4 className="text-md font-semibold text-gray-200">{t('serviceDetails')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">{t('durationMinutes')}</label>
                            <input type="number" name="duration" value={item.duration ?? ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">{t('location')}</label>
                            <input type="text" name="location" value={item.location || ''} placeholder={t('locationPlaceholder')} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                        </div>
                    </div>
                 </div>
            )}

             <div className="pt-4 border-t border-gray-600 mt-4">
                <h4 className="text-md font-semibold text-gray-200">{t('promotionOptional')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('promoPrice')}</label>
                        <input type="number" name="promoPrice" value={item.promoPrice ?? ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('promoStartDate')}</label>
                        <input type="date" name="promoStartDate" value={item.promoStartDate || ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('promoEndDate')}</label>
                        <input type="date" name="promoEndDate" value={item.promoEndDate || ''} onChange={handleChange} className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-sm text-white" />
                    </div>
                </div>
             </div>
        </div>
        </>
    );
};

interface ItemEditorModalProps {
    item: Partial<Item> | null;
    onSave: (item: Item) => void | Promise<void>;
    onCancel: () => void;
    forms: Form[];
    allCategories: string[];
    onlineSaleConfig?: OnlineSaleConfig;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    paymentMethods: ShopPaymentMethod[];
    knowledgeBase: KnowledgeBase;
    orderConfig: OrderManagementFlowConfig;
    bookingConfig: BookingFlowConfig;
    showConfirmation: (config: any) => void;
    permissions: ReturnType<typeof usePermissions>;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    shop: Shop;
}

const ItemEditorModal: React.FC<ItemEditorModalProps> = ({ 
    item: initialItem, onSave, onCancel, forms, allCategories, onlineSaleConfig, showToast,
    paymentMethods, knowledgeBase, orderConfig, bookingConfig, showConfirmation, permissions, onUpdateShop, shop
}) => {
    const { t } = useLocalization();
    const [item, setItem] = useState<Partial<Item> | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

    useEffect(() => {
        if (initialItem) {
            setItem(JSON.parse(JSON.stringify(initialItem)));
            setActiveTab('details'); // Reset tab when a new item is opened
        } else {
            setItem(null);
        }
    }, [initialItem]);

    const handleSave = async () => {
        if (!item || !item.name || item.retailPrice == null || item.stock == null) {
            showToast(t('fillRequiredFields'), 'error');
            return;
        }

        const itemToSave: Item = {
            id: item.id || `item_${Date.now()}`,
            itemType: item.itemType || 'product',
            name: item.name,
            description: item.description || '',
            facebookSubtitle: item.facebookSubtitle || undefined,
            retailPrice: item.retailPrice,
            stock: item.stock,
            imageUrl: item.imageUrl || '',
            promoPrice: item.promoPrice || undefined,
            promoStartDate: item.promoStartDate || undefined,
            promoEndDate: item.promoEndDate || undefined,
            warranty: item.warranty || undefined,
            originalPrice: item.originalPrice || undefined,
            category: item.category || undefined,
            duration: item.duration || undefined,
            location: item.location || undefined,
            buttons: item.buttons || [],
            stockHistory: item.stockHistory || [],
            formId: item.formId || undefined,
        };
        await onSave(itemToSave);
    };

    if (!item) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4 animate-fade-in-fast">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl border border-gray-700 flex flex-col max-h-[95vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">{item.id ? t('editItem') : t('addNewItemTitle')}</h3>
                    <button onClick={onCancel} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="flex-grow overflow-hidden flex flex-col">
                    <div className="flex-shrink-0 px-6 pt-4 border-b border-gray-700">
                        <div className="flex gap-4">
                            <button onClick={() => setActiveTab('details')} className={`py-2 px-1 text-sm font-semibold ${activeTab === 'details' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>Details</button>
                            <button onClick={() => setActiveTab('history')} className={`py-2 px-1 text-sm font-semibold ${activeTab === 'history' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>{t('stockHistory')}</button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {activeTab === 'details' && (
                            <ItemEditorForm
                                item={item}
                                setItem={setItem}
                                forms={forms}
                                allCategories={allCategories}
                                onlineSaleConfig={onlineSaleConfig}
                                showToast={showToast}
                                paymentMethods={paymentMethods}
                                knowledgeBase={knowledgeBase}
                                orderConfig={orderConfig}
                                bookingConfig={bookingConfig}
                                showConfirmation={showConfirmation}
                                permissions={permissions}
                                onUpdateShop={onUpdateShop}
                                shop={shop}
                            />
                        )}
                        {activeTab === 'history' && (
                            <div className="p-6">
                                <h4 className="text-md font-semibold text-gray-200 mb-4">{t('stockHistory')} for {item.name}</h4>
                                {(!item.stockHistory || item.stockHistory.length === 0) ? (
                                    <p className="text-sm text-gray-500 text-center py-8">{t('noStockHistory')}</p>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-5 gap-4 items-center p-2 text-xs text-gray-400 font-semibold border-b border-gray-600">
                                            <div>{t('date')}</div>
                                            <div className="col-span-2">{t('reason')}</div>
                                            <div className="text-right">{t('change')}</div>
                                            <div className="text-right">{t('newTotal')}</div>
                                        </div>
                                        {[...item.stockHistory].reverse().map((movement, index) => (
                                            <div key={index} className="grid grid-cols-5 gap-4 items-center p-2 bg-gray-700/50 rounded-md text-sm">
                                                <div className="text-gray-400 text-xs">{new Date(movement.timestamp).toLocaleString()}</div>
                                                <div className="col-span-2 text-gray-200">{movement.reason}</div>
                                                <div className={`text-right font-bold ${movement.change > 0 ? 'text-green-400' : 'text-red-400'}`}>{movement.change > 0 ? '+' : ''}{movement.change}</div>
                                                <div className="text-right font-semibold">{movement.newStock}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3 flex-shrink-0 border-t border-gray-700">
                    <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">{t('saveItem')}</button>
                </footer>
            </div>
            <style>{`.animate-fade-in-fast { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
    );
};


const getActivePrice = (item: Item): { price: number; onSale: boolean } => {
    const now = new Date();
    const startDate = item.promoStartDate ? new Date(item.promoStartDate) : null;
    const endDate = item.promoEndDate ? new Date(item.promoEndDate) : null;
    // Make sure date comparison works correctly even if user inputs date without time
    if (endDate) endDate.setHours(23, 59, 59, 999); 
    
    const isPromoActive = item.promoPrice != null && startDate && endDate && now >= startDate && now <= endDate;

    if (isPromoActive) {
        return { price: item.promoPrice!, onSale: true };
    }
    return { price: item.retailPrice, onSale: false };
};


const ItemCard: React.FC<{
    item: Item;
    onEdit: (item: Item) => void;
    onDelete: (itemId: string) => void;
    isDisabled: boolean;
    onOpenAdjustmentModal: (item: Item, initialChange: number) => void;
}> = ({ item, onEdit, onDelete, isDisabled, onOpenAdjustmentModal }) => {
    const { t } = useLocalization();
    const { price, onSale } = getActivePrice(item);

    const getStockStatusColor = (stock: number) => {
        if (stock > 10) return 'bg-green-500';
        if (stock > 0) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="bg-gray-700 rounded-lg border border-gray-600 flex flex-col overflow-hidden relative group transition-shadow hover:shadow-xl">
            {onSale && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md z-10">{t('sale')}</div>
            )}

            <div className="relative">
                <div className="aspect-square w-full bg-gray-600">
                    <img src={item.imageUrl || 'https://placehold.co/400x400/27272a/71717a?text=?'} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => onEdit(item)} disabled={isDisabled} className="p-3 bg-gray-800/80 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors" title={t('editItem')}><PencilIcon className="w-5 h-5"/></button>
                    <button onClick={() => onDelete(item.id)} disabled={isDisabled} className="p-3 bg-gray-800/80 text-white rounded-full hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors" title={t('deleteItem')}><TrashIcon className="w-5 h-5"/></button>
                </div>
            </div>

            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-lg text-white truncate" title={item.name}>{item.name}</h3>
                <p className="text-sm text-gray-300 mt-1 mb-3 flex-grow h-10 overflow-hidden">{item.description}</p>
                
                <div className="flex items-baseline gap-2 mt-auto">
                    <p className="text-xl text-blue-400 font-semibold">{price.toLocaleString()} {t('mmk')}</p>
                    {onSale && <p className="text-sm text-gray-400 line-through">{item.retailPrice.toLocaleString()} {t('mmk')}</p>}
                </div>
                 
                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-600 pt-3 mt-3">
                    <div className="flex items-center gap-2 p-1 -m-1 rounded">
                        <span className={`w-2.5 h-2.5 rounded-full ${getStockStatusColor(item.stock)}`}></span>
                        <span>{item.itemType === 'service' ? t('capacity') : t('stock')}: <span className="font-semibold text-gray-200">{item.stock}</span></span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onOpenAdjustmentModal(item, -1)} disabled={item.stock <= 0} className="p-1 rounded-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">
                             <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <button onClick={() => onOpenAdjustmentModal(item, 1)} className="p-1 rounded-full bg-gray-600 hover:bg-gray-500">
                            <PlusIcon className="w-3 h-3"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductCatalog: React.FC<CatalogPanelProps> = ({ items, onItemsChange, permissions, forms, showConfirmation, onlineSaleConfig, paymentMethods, knowledgeBase, orderConfig, bookingConfig, onUpdateShop, shop }) => {
    const { t } = useLocalization();
    const { showToast } = useToast();
    const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [managingCategory, setManagingCategory] = useState<string | null>(null);
    const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
    const bulkActionsRef = useRef<HTMLDivElement>(null);
    
    const [adjustModalState, setAdjustModalState] = useState<{ item: Item, initialChange: number } | null>(null);
    
    const isAddItemDisabled = !permissions.isFeatureAllowed('itemCount', items.length);

    const allCategories = useMemo(() => Array.from(new Set(items.map(p => p.category).filter(Boolean))), [items]) as string[];
    
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (stockFilter === 'all') return true;
            if (stockFilter === 'inStock') return item.stock > 10;
            if (stockFilter === 'lowStock') return item.stock > 0 && item.stock <= 10;
            if (stockFilter === 'outOfStock') return item.stock <= 0;
            return true;
        });
    }, [items, stockFilter]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
                setIsBulkActionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddItem = () => {
        if(isAddItemDisabled) {
            const limit = permissions.getLimit('itemCount');
            showToast(`Item limit of ${limit} reached. Please upgrade your plan.`, 'error');
            return;
        }
        setEditingItem({});
    };

    const handleDeleteItem = async (itemId: string) => {
        // Rate limiting for delete operations
        const rateLimitKey = `product:delete:${shop.id}`;
        const rateLimit = rateLimiter.check(rateLimitKey, RATE_LIMITS.PRODUCT_DELETE);
        
        if (!rateLimit.allowed) {
            showToast(rateLimit.message || 'Too many delete operations', 'error');
            return;
        }
        
        const itemName = items.find(p => p.id === itemId)?.name || 'this item';
        showConfirmation({
            title: t('deleteItem'),
            message: t('areYouSureDeleteProduct', { productName: itemName }),
            confirmText: t('delete'),
            confirmButtonClass: 'bg-red-600 hover:bg-red-700',
            onConfirm: async () => {
                try {
                    const result = await deleteItem(shop.id, itemId);
                    if (result) {
                        onItemsChange(items.filter(p => p.id !== itemId));
                        showToast(t('productDeletedSuccess', { productName: itemName }), 'success');
                    } else {
                        showToast('Failed to delete item', 'error');
                    }
                } catch (error) {
                    logger.error('Failed to delete item', error);
                    showToast('Failed to delete item', 'error');
                }
            },
        });
    };

    const handleSaveItem = async (itemToSave: Item) => {
        const isNew = !items.some(p => p.id === itemToSave.id);
        
        // Rate limiting based on operation type
        const rateLimitKey = isNew ? `product:create:${shop.id}` : `product:update:${itemToSave.id}`;
        const rateLimitConfig = isNew ? RATE_LIMITS.PRODUCT_CREATE : RATE_LIMITS.PRODUCT_UPDATE;
        const rateLimit = rateLimiter.check(rateLimitKey, rateLimitConfig);
        
        if (!rateLimit.allowed) {
            showToast(rateLimit.message || 'Too many operations', 'error');
            return;
        }
        
        const originalItem = items.find(i => i.id === itemToSave.id);
        const stockChanged = originalItem ? itemToSave.stock !== originalItem.stock : false;

        let finalItemToSave = { ...itemToSave };

        if (stockChanged && originalItem) {
            const change = itemToSave.stock - originalItem.stock;
            if (change !== 0) {
                const stockMovement: StockMovement = {
                    timestamp: Date.now(),
                    change: change,
                    newStock: itemToSave.stock,
                    reason: "Manual Edit in Item Catalog",
                };
                finalItemToSave.stockHistory = [...(finalItemToSave.stockHistory || []), stockMovement];
            }
        }
        
        try {
            let result: Item | null = null;
            if (isNew) {
                result = await addItem(shop.id, finalItemToSave);
            } else {
                result = await updateItem(shop.id, finalItemToSave.id, finalItemToSave);
            }
            
            if (result) {
                if (isNew) {
                    onItemsChange([...items, result]);
                } else {
                    onItemsChange(items.map(p => (p.id === result!.id ? result! : p)));
                }
                
                setEditingItem(null);
                showToast(t('productSavedSuccess'), 'success');
            } else {
                showToast('Failed to save item', 'error');
            }
        } catch (error) {
            logger.error('Failed to save item', error);
            showToast('Failed to save item', 'error');
        }
    };
    
    const handleOpenAdjustmentModal = (item: Item, initialChange: number) => {
        setAdjustModalState({ item, initialChange });
    };

    const handleConfirmAdjustment = async (adjustment: number, reason: string) => {
        if (!adjustModalState) return;
        const { item } = adjustModalState;
        const newStock = item.stock + adjustment;

        try {
            // Update stock in database
            const result = await updateItemStock(item.id, adjustment, reason);
            
            if (result.success) {
                const stockMovement: StockMovement = {
                    timestamp: Date.now(),
                    change: adjustment,
                    newStock: newStock,
                    reason: reason,
                };
                const updatedItem: Item = {
                    ...item,
                    stock: newStock,
                    stockHistory: [...(item.stockHistory || []), stockMovement]
                };
                onItemsChange(items.map(p => p.id === item.id ? updatedItem : p));
                setAdjustModalState(null);
                showToast('Stock updated successfully', 'success');
            } else {
                showToast(result.error || 'Failed to update stock', 'error');
            }
        } catch (error) {
            logger.error('Failed to update stock', error);
            showToast('Failed to update stock', 'error');
        }
    };

    const handleBulkPriceAdjust = (type: 'percentage' | 'fixed', value: number, rounding: number) => {
        const updatedItems = items.map(p => {
            let newPrice = p.retailPrice;
            if (type === 'percentage') {
                newPrice = newPrice * (1 + value / 100);
            } else {
                newPrice = newPrice + value;
            }
            if (rounding > 0) {
                newPrice = Math.round(newPrice / rounding) * rounding;
            }
            return { ...p, retailPrice: Math.max(0, newPrice) };
        });
        onItemsChange(updatedItems);
        setIsPriceModalOpen(false);
        showToast(t('pricesUpdatedSuccess'), 'success');
    };

    const handleBulkImport = (newItems: Item[]) => {
        const limit = permissions.getLimit('itemCount');
        if (limit !== null && (items.length + newItems.length) > limit) {
             showToast(`Import failed: This would exceed your plan's limit of ${limit} items.`, 'error');
             setIsImportModalOpen(false);
             return;
        }
        onItemsChange([...items, ...newItems]);
        setIsImportModalOpen(false);
        showToast(t('itemsImportedSuccess', { count: newItems.length.toString() }), 'success');
    };

    const handleExportToCsv = () => {
        if (items.length === 0) {
            showToast(t('noItemsToExport'), 'info');
            return;
        }
        const headers = ["name", "itemType", "description", "retailPrice", "stock", "imageUrl", "promoPrice", "promoStartDate", "promoEndDate", "warranty", "originalPrice", "category", "duration", "location"];
        const formatCsvField = (value: any): string => {
            if (value === null || value === undefined) return '';
            let str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = str.replace(/"/g, '""');
                return `"${str}"`;
            }
            return str;
        };
        const csvRows = items.map(p => headers.map(header => formatCsvField(p[header as keyof Item])).join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `items_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsBulkActionsOpen(false);
    };

    const handleRenameCategory = (newName: string) => {
        if (!managingCategory) return;
        const oldName = managingCategory;
        const updatedItems = items.map(p => p.category === oldName ? { ...p, category: newName } : p);
        onItemsChange(updatedItems);
        showToast(t('categoryRenamedSuccess', { oldName, newName }), 'success');
        setManagingCategory(null);
    };
    
    const handleDeleteCategory = () => {
        if (!managingCategory) return;
        const categoryName = managingCategory;
        showConfirmation({
            title: t('deleteCategory'),
            message: <>{t('areYouSureDeleteCategory', { categoryName })}<br/><br/>{t('thisWillRemoveIt')}</>,
            confirmText: t('delete'),
            confirmButtonClass: 'bg-red-600 hover:bg-red-700',
            onConfirm: () => {
                const updatedItems = items.map(p => {
                    if (p.category === categoryName) {
                        const { category, ...rest } = p;
                        return rest;
                    }
                    return p;
                });
                onItemsChange(updatedItems);
                showToast(t('categoryDeletedSuccess', { categoryName }), 'success');
                setManagingCategory(null);
            }
        });
    };

    const getFilterButtonClass = (filter: typeof stockFilter) => {
        return `px-3 py-1.5 text-xs rounded-md transition-colors ${
            stockFilter === filter ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-700 hover:bg-gray-600'
        }`;
    };

    return (
        <>
            <AdjustmentModal 
                item={adjustModalState?.item ?? null}
                initialChange={adjustModalState?.initialChange || 0}
                onClose={() => setAdjustModalState(null)}
                onConfirm={handleConfirmAdjustment}
            />
            <PriceAdjustModal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} onApply={handleBulkPriceAdjust} showToast={showToast} />
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleBulkImport} showToast={showToast} />
            <ManageCategoryModal
                categoryName={managingCategory}
                onClose={() => setManagingCategory(null)}
                onRename={handleRenameCategory}
                onDelete={handleDeleteCategory}
                showToast={showToast}
            />
            <ItemEditorModal
                item={editingItem} 
                onSave={handleSaveItem} 
                onCancel={() => setEditingItem(null)} 
                forms={forms} 
                allCategories={allCategories} 
                onlineSaleConfig={onlineSaleConfig}
                showToast={showToast}
                paymentMethods={paymentMethods}
                knowledgeBase={knowledgeBase}
                orderConfig={orderConfig}
                bookingConfig={bookingConfig}
                showConfirmation={showConfirmation}
                permissions={permissions}
                onUpdateShop={onUpdateShop}
                shop={shop}
            />

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full overflow-y-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-600 pb-4 mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">{t('manageCatalog')}</h2>
                        <p className="text-sm text-gray-400">{t('manageInventory')} {permissions.getLimit('itemCount') !== null ? `(${items.length}/${permissions.getLimit('itemCount')} ${t('itemsUsed')})` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="relative" ref={bulkActionsRef}>
                            <button onClick={() => setIsBulkActionsOpen(prev => !prev)} disabled={!permissions.can('bulkActions')} className="flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-semibold text-white disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed" title={!permissions.can('bulkActions') ? t('bulkActionsPro') : ""}> {t('bulkActions')} <ChevronDownIcon className="w-4 h-4 ml-2" /> </button>
                            {isBulkActionsOpen && permissions.can('bulkActions') && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                                    <button onClick={() => { setIsImportModalOpen(true); setIsBulkActionsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">{t('batchProductImport')}</button>
                                    <button onClick={handleExportToCsv} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Export to CSV</button>
                                    <button onClick={() => { setIsPriceModalOpen(true); setIsBulkActionsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">{t('bulkPriceAdjustTitle')}</button>
                                </div>
                            )}
                        </div>
                        <div className="relative group">
                            <button onClick={handleAddItem} disabled={!!editingItem || isAddItemDisabled} className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-semibold text-white disabled:bg-gray-600 disabled:cursor-not-allowed"> <PlusIcon className="w-4 h-4 mr-2" /> {t('addNewItem')} </button>
                            {isAddItemDisabled && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10">{t('upgradeForMoreProducts')}</div>}
                        </div>
                    </div>
                </div>
                
                <div className="pr-2">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-md font-semibold text-gray-200 mb-3">{t('stockStatus')}</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setStockFilter('all')} className={getFilterButtonClass('all')}>{t('allitems')}</button>
                                    <button onClick={() => setStockFilter('inStock')} className={getFilterButtonClass('inStock')}>{t('inStock')} (&gt;10)</button>
                                    <button onClick={() => setStockFilter('lowStock')} className={getFilterButtonClass('lowStock')}>{t('lowStock')} (1-10)</button>
                                    <button onClick={() => setStockFilter('outOfStock')} className={getFilterButtonClass('outOfStock')}>{t('outOfStock')} (0)</button>
                                </div>
                            </div>
                             {allCategories.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-gray-200 mb-3">{t('categoryManager')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {allCategories.map(cat => (
                                            <div key={cat} className="flex items-center bg-gray-700 rounded-full text-sm">
                                                <span className="pl-3 pr-2 text-white">{cat}</span>
                                                <button onClick={() => setManagingCategory(cat)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors"><PencilIcon className="w-3 h-3"/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {filteredItems.length === 0 && !editingItem ? (
                        <div className="text-center text-gray-500 py-10">
                            <p>{items.length === 0 ? t('catalogEmpty') : t('noMatchingOrders')}</p>
                            {items.length === 0 && <p>{t('catalogEmptyHint')}</p>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {filteredItems.map(item => (<ItemCard key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDeleteItem} isDisabled={!!editingItem} onOpenAdjustmentModal={handleOpenAdjustmentModal}/>))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ProductCatalog;