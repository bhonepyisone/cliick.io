import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import Toast from '../components/Toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const toastContainer = document.getElementById('toast-container');

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
        }, 5000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toastContainer && ReactDOM.createPortal(
                <div className="fixed top-5 right-5 z-50 space-y-2">
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                        />
                    ))}
                </div>,
                toastContainer
            )}
        </ToastContext.Provider>
    );
};
