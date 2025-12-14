import React, { useState } from 'react';
import api from '../services/apiService';
import { Shop } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import { rateLimiter, RATE_LIMITS } from '../utils/rateLimiter';
import { sanitizeText, validateLength } from '../utils/sanitize';

interface CreateShopProps {
    onShopCreated: (shop: Shop) => void;
    onCancel?: () => void;
}

const CreateShop: React.FC<CreateShopProps> = ({ onShopCreated, onCancel }) => {
    const [shopName, setShopName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { t } = useLocalization();
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (shopName.trim() && !isCreating) {
            // Sanitize and validate shop name
            const sanitized = sanitizeText(shopName.trim());
            const validation = validateLength(sanitized, 1, 100, 'Shop name');
            
            if (!validation.valid) {
                showToast(validation.error || 'Invalid shop name', 'error');
                return;
            }
            
            // Rate limiting for shop creation (per user)
            const rateLimitKey = `shop:create:user`; // Could use user ID when available
            const rateLimit = rateLimiter.check(rateLimitKey, RATE_LIMITS.SHOP_CREATE);
            
            if (!rateLimit.allowed) {
                showToast(rateLimit.message || 'Shop creation limit reached', 'error');
                return;
            }
            
            setIsCreating(true);
            try {
                const newShop = await api.createShop(sanitized);
                showToast(t('shopCreatedSuccess', { shopName: newShop.name }), 'success');
                onShopCreated(newShop);
            } catch (error) {
                console.error("Failed to create shop", error);
                showToast("Failed to create shop.", "error");
            } finally {
                setIsCreating(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0A2540] text-[#F6F9FC] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1D3B59] p-8 rounded-lg shadow-xl relative">
                {onCancel && (
                    <button onClick={onCancel} className="absolute top-4 left-4 text-sm text-gray-400 hover:underline">
                        {t('backToShopSelection')}
                    </button>
                )}
                <h1 className="text-2xl font-bold text-center mb-1 pt-8">{t('createYourFirstShop')}</h1>
                <p className="text-center text-gray-400 mb-6">{t('shopNameHint')}</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label htmlFor="shopName" className="block text-gray-300 text-sm font-bold mb-2">
                            {t('shopName')}
                        </label>
                        <input
                            type="text"
                            id="shopName"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-3 text-sm text-[#F6F9FC] placeholder-gray-400 focus:ring-2 focus:ring-[#635BFF] focus:outline-none transition-shadow"
                            placeholder={t('shopNamePlaceholder')}
                            required
                            disabled={isCreating}
                        />
                    </div>
                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            className="bg-[#635BFF] hover:bg-[#524cc9] text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-wait flex items-center justify-center gap-2"
                            disabled={!shopName.trim() || isCreating}
                        >
                           {isCreating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                           {isCreating ? t('creating') : t('createShop')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateShop;
