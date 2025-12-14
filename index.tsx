import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import Auth from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { Shop } from './types';
import { LanguageProvider, LanguageContext } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { useLocalization } from './hooks/useLocalization';
import api from './services/apiService';
import apiClient from './services/apiClient';
import { Toaster } from 'react-hot-toast';

// ... existing code ...

const ShopCreationScreen: React.FC<{ onShopCreated: (shopId: string) => void }> = ({ onShopCreated }) => {
    const [shopName, setShopName] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateShop = async () => {
        if (!shopName.trim()) return;
        
        setIsCreating(true);
        try {
            const response = await apiClient.createShop({
                name: shopName,
                ownerId: api.getCurrentUser()?.id || '',
                items: [],
                forms: [],
                formSubmissions: [],
                liveConversations: [],
                paymentMethods: [],
                currency: 'USD',
                offlineSaleConfig: { defaultFormId: '' },
                onlineSaleConfig: { defaultFormId: '' },
            } as any);
            
            if (response.success && response.data?.id) {
                onShopCreated(response.data.id);
            }
        } catch (error) {
            console.error('Error creating shop:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#0A2540] p-4">
            <div className="bg-[#1D3B59] rounded-lg p-8 max-w-md w-full shadow-xl">
                <h1 className="text-3xl font-bold text-white mb-2">Welcome!</h1>
                <p className="text-gray-300 mb-6">Let's create your first shop to get started.</p>
                
                <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Enter shop name..."
                    className="w-full bg-gray-700 border border-gray-600 rounded p-3 text-white placeholder-gray-400 mb-4"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateShop()}
                />
                
                <button
                    onClick={handleCreateShop}
                    disabled={!shopName.trim() || isCreating}
                    className="w-full bg-gradient-to-r from-[#635BFF] via-[#B34EAF] to-[#E64A83] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-opacity"
                >
                    {isCreating ? 'Creating...' : 'Create Shop'}
                </button>
            </div>
        </div>
    );
};

const RootContent = () => {
    const { t } = useLocalization();
    const [isAuthenticated, setIsAuthenticated] = useState(api.getAuthStatus());
    const [currentUser, setCurrentUser] = useState(api.getCurrentUser());
    const [shopId, setShopId] = useState<string | null>(null);
    const [userShops, setUserShops] = useState<Shop[]>([]);
    const [isLoadingShops, setIsLoadingShops] = useState(false);

    useEffect(() => {
        const unsubscribe = api.onAuthChange((authenticated) => {
            setIsAuthenticated(authenticated);
            setCurrentUser(api.getCurrentUser());
            if (!authenticated) {
                setShopId(null);
                setUserShops([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch user's shops when authenticated
    useEffect(() => {
        if (isAuthenticated && !shopId) {
            setIsLoadingShops(true);
            console.log('🔄 Fetching user shops...');
            apiClient.getShops()
                .then(response => {
                    console.log('✅ Shops response:', response);
                    if (response.success && response.data) {
                        setUserShops(response.data);
                        // Auto-select first shop if available
                        if (response.data.length > 0) {
                            console.log('🄚 Setting first shop ID:', response.data[0].id);
                            setShopId(response.data[0].id);
                        }
                    } else {
                        console.error('❌ Error in response:', response.error);
                    }
                    setIsLoadingShops(false);
                })
                .catch((err) => {
                    console.error('❌ Error fetching shops:', err);
                    setIsLoadingShops(false);
                });
        }
    }, [isAuthenticated, shopId]);

    if (isAuthenticated) {
        // Check if user is admin - show admin panel
        if (currentUser?.isAdmin) {
            console.log('🔐 Admin user detected, showing admin dashboard');
            return <AdminDashboard />;
        }
        
        if (isLoadingShops) {
            return <div className="flex items-center justify-center h-screen bg-[#0A2540] text-white">Loading...</div>;
        }
        if (shopId) {
            return <App shopId={shopId} onSelectShop={setShopId} />;
        } else {
            // No shops - show shop creation screen
            return <ShopCreationScreen onShopCreated={setShopId} />;
        }
    } else {
        return <Auth />;
    }
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <LanguageProvider>
          <ToastProvider>
            <RootContent />
            <Toaster />
          </ToastProvider>
        </LanguageProvider>
    </React.StrictMode>
);