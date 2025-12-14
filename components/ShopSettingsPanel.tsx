import React, { useState, useMemo } from 'react';
import { Shop, Role } from '../types';
import TrashIcon from './icons/TrashIcon';
import StoreIcon from './icons/StoreIcon';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import XIcon from './icons/XIcon';
import DollarSignIcon from './icons/DollarSignIcon';
import { getPlatformSettings } from '../services/platformSettingsService';
import { allCurrencies } from '../data/localizationData';
import { sanitizeText, validateLength } from '../utils/sanitize';

interface ShopSettingsPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    onDeleteShop: () => void;
    currentUserRole: Role | null;
    showConfirmation: (config: { title: string, message: React.ReactNode, confirmText?: string, confirmButtonClass?:string, onConfirm: () => void }) => void;
}

const ShopSettingsPanel: React.FC<ShopSettingsPanelProps> = ({ shop, onUpdateShop, onDeleteShop, currentUserRole, showConfirmation }) => {
    const { t } = useLocalization();
    const { showToast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

    const currencies = useMemo(() => {
        const platformSettings = getPlatformSettings();
        const enabledCodes = new Set(platformSettings.localization.enabledCurrencies);
        return allCurrencies.filter(currency => enabledCodes.has(currency.code));
    }, []);

    const handleNameChange = (newName: string) => {
        // Sanitize and validate shop name
        const sanitized = sanitizeText(newName);
        const validation = validateLength(sanitized, 1, 100, 'Shop name');
        
        if (!validation.valid && sanitized.length > 0) {
            showToast(validation.error || 'Invalid shop name', 'error');
            return;
        }
        
        onUpdateShop(s => ({ ...s, name: sanitized }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please upload a valid image file.', 'error');
                return;
            }
            if (file.size > 512 * 1024) { // 512KB limit
                showToast('Image file size must be under 512KB.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                onUpdateShop(s => ({ ...s, logoUrl: reader.result as string }));
                showToast(t('logoUpdated'), 'success');
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemoveLogo = () => {
        onUpdateShop(s => ({ ...s, logoUrl: undefined }));
        showToast(t('logoRemoved'), 'success');
    };

    const handleDeleteRequest = () => {
        setDeleteConfirmationInput(''); // Reset on modal open
        showConfirmation({
            title: t('deleteShop'),
            message: (
                <div className="space-y-4">
                    <p>{t('areYouSureDeleteShop', { shopName: shop.name })}</p>
                     <div 
                        className="bg-yellow-900/30 border border-yellow-700/60 p-3 rounded-lg text-sm text-yellow-200" 
                        dangerouslySetInnerHTML={{ __html: t('deleteDataExportHint') }} 
                    />
                    <input
                        type="text"
                        className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-white"
                        placeholder={t('deleteShopConfirmationPlaceholder', { shopName: shop.name })}
                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    />
                </div>
            ),
            confirmText: t('deleteThisShop'),
            confirmButtonClass: `bg-red-600 hover:bg-red-700 ${deleteConfirmationInput !== `delete ${shop.name}` ? 'opacity-50 cursor-not-allowed' : ''}`,
            onConfirm: () => {
                if (deleteConfirmationInput !== `delete ${shop.name}`) {
                    showToast(t('deleteConfirmationMismatch'), 'error');
                    setDeleteConfirmationInput('');
                    return;
                }
                setIsDeleting(true);
                setTimeout(() => {
                    onDeleteShop();
                    showToast(t('shopDeletedSuccess', { shopName: shop.name }), 'success');
                }, 1000);
            },
        });
    };

    return (
        <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-[#F6F9FC]">{t('shopSettings')}</h2>
            <div className="space-y-8 max-w-2xl">
                
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Shop Details</h3>
                    <div className="space-y-6">
                        {/* Shop Name */}
                        <div>
                            <label htmlFor="shop-name" className="block text-sm font-medium text-gray-300 mb-1">{t('shopName')}</label>
                            <input
                                id="shop-name"
                                type="text"
                                value={shop.name}
                                onChange={e => handleNameChange(e.target.value)}
                                onBlur={() => showToast(t('shopNameUpdated'), 'success')}
                                className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-3 text-sm text-[#F6F9FC]"
                            />
                        </div>

                        {/* Shop Logo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('shopLogo')}</label>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-600 flex-shrink-0">
                                    {shop.logoUrl ? (
                                        <img src={shop.logoUrl} alt="Shop Logo Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <StoreIcon className="w-12 h-12 text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-grow space-y-2">
                                    <label htmlFor="logo-upload" className="w-full text-center cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-sm">
                                        {t('uploadNewLogo')}
                                    </label>
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    {shop.logoUrl && <button onClick={handleRemoveLogo} className="w-full text-center bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-md text-sm">{t('removeLogo')}</button>}
                                    <p className="text-xs text-gray-400 mt-1">{t('shopLogoHint')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Regional Settings */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('regionalSettings')}</h3>
                     <div className="space-y-6">
                        <div>
                            <label htmlFor="shop-currency" className="block text-sm font-medium text-gray-300 mb-1">{t('shopCurrency')}</label>
                            <select
                                id="shop-currency"
                                value={shop.currency}
                                onChange={e => onUpdateShop(s => ({ ...s, currency: e.target.value }))}
                                onBlur={() => showToast(t('shopCurrencyUpdated'), 'success')}
                                className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-3 text-sm text-[#F6F9FC]"
                            >
                                {currencies.map(c => (
                                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                             <p className="text-xs text-gray-400 mt-2">{t('shopCurrencyDesc')}</p>
                        </div>
                     </div>
                </div>

                {/* Delete Shop */}
                {currentUserRole === Role.OWNER && (
                    <div className="border-2 border-red-500/30 rounded-lg p-6 bg-red-900/10">
                        <h3 className="text-lg font-semibold text-red-400">{t('dangerZone')}</h3>
                        <p className="text-sm text-gray-400 mt-1 mb-4">{t('deleteShopWarning')}</p>
                        
                        <div 
                            className="bg-yellow-900/30 border border-yellow-700/60 p-3 rounded-lg mb-4 text-sm text-yellow-200" 
                            dangerouslySetInnerHTML={{ __html: t('deleteDataExportHint') }} 
                        />

                        <button
                            onClick={handleDeleteRequest}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 disabled:bg-red-800 disabled:cursor-wait"
                        >
                            {isDeleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                            {isDeleting ? t('deleting') : <><TrashIcon className="w-4 h-4"/> {t('deleteThisShop')}</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopSettingsPanel;