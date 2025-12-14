import React, { useState } from 'react';
import { Shop } from '../types';
import FacebookIcon from './icons/FacebookIcon';
import InstagramIcon from './icons/InstagramIcon';
import TikTokIcon from './icons/TikTokIcon';
import TelegramIcon from './icons/TelegramIcon';
import ViberIcon from './icons/ViberIcon';
import { useLocalization } from '../hooks/useLocalization';
import api from '../services/apiService';
import { useToast } from '../contexts/ToastContext';

interface IntegrationsPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
}

const IntegrationCard: React.FC<{
    icon: React.ReactNode;
    name: string;
    description: string;
    isConnected: boolean;
    onConnect?: () => void;
    isConnecting?: boolean;
}> = ({ icon, name, description, isConnected, onConnect, isConnecting }) => {
    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-grow">
                <h4 className="font-bold text-white text-lg">{name}</h4>
                <p className="text-sm text-gray-400 mt-1">{description}</p>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
                {isConnected ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-400 bg-green-900/50 px-4 py-2 rounded-md justify-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        Connected
                    </div>
                ) : (
                    <button 
                        onClick={onConnect}
                        disabled={!onConnect || isConnecting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-wait flex items-center justify-center gap-2"
                    >
                        {isConnecting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                )}
            </div>
        </div>
    );
};

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({ shop, onUpdateShop }) => {
    const { t } = useLocalization();
    const { showToast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnectInstagram = async () => {
        setIsConnecting(true);
        showToast("Redirecting to Instagram for authorization...", 'info');

        // Simulate API call and redirect
        setTimeout(async () => {
            const result = await api.connectInstagram(shop.id);
            if (result.success && result.shop) {
                onUpdateShop(() => result.shop!); // Update the shop state in App.tsx
                showToast("Instagram connected successfully!", 'success');
            } else {
                showToast("Failed to connect Instagram.", 'error');
            }
            setIsConnecting(false);
        }, 2000);
    };

    return (
        <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-[#F6F9FC]">{t('integrations')}</h2>
            <p className="text-sm text-gray-400 mb-8">Connect your shop to different platforms to manage all your customer conversations in one unified inbox.</p>
            
            <div className="space-y-6">
                <IntegrationCard
                    icon={<FacebookIcon className="w-10 h-10 text-blue-500" />}
                    name="Facebook Messenger"
                    description="Connect your Facebook Page to reply to messages and comments directly from your inbox."
                    isConnected={shop.isFacebookConnected || !!shop.integrations?.facebook?.isConnected}
                />
                 <IntegrationCard
                    icon={<InstagramIcon className="w-10 h-10 text-pink-500" />}
                    name="Instagram"
                    description="Manage your Instagram Direct Messages and comment replies."
                    isConnected={!!shop.integrations?.instagram?.isConnected}
                    onConnect={handleConnectInstagram}
                    isConnecting={isConnecting}
                />
                 <IntegrationCard
                    icon={<TikTokIcon className="w-10 h-10 text-white" />}
                    name="TikTok"
                    description="Respond to comments and direct messages from your TikTok account."
                    isConnected={!!shop.integrations?.tiktok?.isConnected}
                />
                 <IntegrationCard
                    icon={<TelegramIcon className="w-10 h-10 text-sky-400" />}
                    name="Telegram"
                    description="Connect your Telegram Bot to manage customer chats."
                    isConnected={!!shop.integrations?.telegram?.isConnected}
                />
                 <IntegrationCard
                    icon={<ViberIcon className="w-10 h-10 text-purple-500" />}
                    name="Viber"
                    description="Engage with customers through your Viber Business account."
                    isConnected={!!shop.integrations?.viber?.isConnected}
                />
            </div>
        </div>
    );
};

export default IntegrationsPanel;