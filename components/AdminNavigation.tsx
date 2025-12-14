import React from 'react';
import api from '../services/apiService';
import DashboardIcon from './icons/DashboardIcon';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import StoreIcon from './icons/StoreIcon';
import UsersIcon from './icons/UsersIcon';
import SettingsIcon from './icons/SettingsIcon';
import SparklesIcon from './icons/SparklesIcon';
import ApiIcon from './icons/ApiIcon';
import DollarSignIcon from './icons/DollarSignIcon';
import GlobeIcon from './icons/GlobeIcon';
import DatabaseIcon from './icons/DatabaseIcon';

export type AdminTab = 'overview' | 'approvals' | 'shops' | 'users' | 'settings' | 'ai_behavior' | 'api_models' | 'plan_management' | 'localization' | 'token_analytics';

interface AdminNavigationProps {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
    pendingApprovals: number;
}

const AdminNavigation: React.FC<AdminNavigationProps> = ({ activeTab, onTabChange, pendingApprovals }) => {

    const TABS: { id: AdminTab; name: string; icon: React.ReactNode; badge?: number }[] = [
        { id: 'overview', name: 'Overview', icon: <DashboardIcon className="w-5 h-5"/> },
        { id: 'approvals', name: 'Approvals', icon: <CheckCircleIcon className="w-5 h-5"/>, badge: pendingApprovals },
        { id: 'shops', name: 'Shops', icon: <StoreIcon className="w-5 h-5"/> },
        { id: 'users', name: 'Users', icon: <UsersIcon className="w-5 h-5"/> },
        { id: 'ai_behavior', name: 'AI Behavior & Rules', icon: <SparklesIcon className="w-5 h-5" /> },
        { id: 'api_models', name: 'API & Models', icon: <ApiIcon className="w-5 h-5" /> },
        { id: 'token_analytics', name: 'Token Analytics', icon: <DatabaseIcon className="w-5 h-5" /> },
        { id: 'plan_management', name: 'Plan Management', icon: <DollarSignIcon className="w-5 h-5"/> },
        { id: 'localization', name: 'Localization', icon: <GlobeIcon className="w-5 h-5" /> },
        { id: 'settings', name: 'Settings', icon: <SettingsIcon className="w-5 h-5"/> },
    ];

    return (
        <nav className="w-60 bg-gray-800 p-4 flex flex-col border-r border-gray-700">
            <div className="mb-8 px-2">
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <span className="text-sm text-gray-400">Cliick.io</span>
            </div>
            <ul className="space-y-2 flex-grow">
                {TABS.map(tab => (
                    <li key={tab.id}>
                        <button
                            onClick={() => onTabChange(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        >
                            {tab.icon}
                            {tab.name}
                            {tab.badge && tab.badge > 0 ? (
                                <span className="ml-auto bg-yellow-500 text-yellow-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{tab.badge}</span>
                            ) : null}
                        </button>
                    </li>
                ))}
            </ul>
            <div className="mt-auto">
                <button onClick={api.logout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">Logout</button>
            </div>
        </nav>
    );
};

export default AdminNavigation;