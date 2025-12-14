import React, { useEffect } from 'react';
import XIcon from './icons/XIcon';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import InfoIcon from './icons/InfoIcon';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [onClose]);
    
    const typeClasses = {
        success: 'bg-green-600 border-green-500',
        error: 'bg-red-600 border-red-500',
        info: 'bg-blue-600 border-blue-500',
    };
    
    const Icon = {
        success: <CheckCircleIcon className="w-5 h-5" />,
        error: <AlertTriangleIcon className="w-5 h-5" />,
        info: <InfoIcon className="w-5 h-5" />,
    }[type];

    return (
        <div
            className={`flex items-center gap-4 p-4 rounded-lg border text-white shadow-lg animate-slide-in-right max-w-sm ${typeClasses[type]}`}
            role="alert"
        >
            <div className="flex-shrink-0">{Icon}</div>
            <p className="text-sm font-medium flex-grow">{message}</p>
            <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-black/20 flex-shrink-0">
                <XIcon className="w-4 h-4" />
            </button>
             <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default Toast;