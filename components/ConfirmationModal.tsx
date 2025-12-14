import React from 'react';
import XIcon from './icons/XIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import { useLocalization } from '../hooks/useLocalization';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    confirmButtonClass = 'bg-red-600 hover:bg-red-700',
}) => {
    const { t } = useLocalization();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-yellow-300 flex items-center gap-2">
                        <AlertTriangleIcon className="w-5 h-5" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                <div className="p-6 text-gray-300">
                    {message}
                </div>
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                        {t('cancel')}
                    </button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-sm text-white rounded-md font-semibold ${confirmButtonClass}`}>
                        {confirmText || t('confirm')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ConfirmationModal;