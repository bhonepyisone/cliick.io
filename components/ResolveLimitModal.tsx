import React from 'react';
import { useLocalization } from '../hooks/useLocalization';
import XIcon from './icons/XIcon';
import SparklesIcon from './icons/SparklesIcon';
import UsersIcon from './icons/UsersIcon';

interface ResolveLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    currentPlanName: string;
    nextPlanName: string;
    limit: number;
}

const ResolveLimitModal: React.FC<ResolveLimitModalProps> = ({ 
    isOpen, 
    onClose, 
    onUpgrade,
    currentPlanName,
    nextPlanName,
    limit 
}) => {
    const { t } = useLocalization();
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-yellow-300 flex items-center gap-2">
                        {t('automatedConversionLimitReached')}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-6">
                    <p className="text-gray-300 text-center mb-6">{t('automatedConversionLimitReachedDesc', { limit: limit.toString(), plan: currentPlanName })}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={onUpgrade}
                            className="p-6 bg-blue-600/20 border-2 border-blue-500 rounded-lg text-left hover:bg-blue-600/40 transition-colors"
                        >
                            <SparklesIcon className="w-8 h-8 text-blue-400 mb-3" />
                            <h4 className="font-bold text-white text-lg">{t('upgradeAndContinue')}</h4>
                            <p className="text-sm text-gray-300 mt-1">{t('upgradeAndContinueDesc', { plan: nextPlanName })}</p>
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-6 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-left hover:bg-gray-700/80 transition-colors"
                        >
                            <UsersIcon className="w-8 h-8 text-gray-400 mb-3" />
                            <h4 className="font-bold text-white text-lg">{t('continueWithAssisted')}</h4>
                            <p className="text-sm text-gray-300 mt-1">{t('continueWithAssistedDesc')}</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResolveLimitModal;