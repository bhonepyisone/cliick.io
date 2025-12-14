import React, { ReactNode } from 'react';
import XIcon from './icons/XIcon';

interface LegalModalProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

const LegalModal: React.FC<LegalModalProps> = ({ title, onClose, children }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()} // Prevent clicks inside from closing the modal
            >
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h3 id="legal-modal-title" className="text-lg font-bold text-white">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
                        aria-label="Close"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="prose prose-sm prose-invert max-w-none text-gray-300 prose-headings:text-white prose-strong:text-white prose-a:text-blue-400 prose-ul:pl-4 prose-ol:pl-4">
                        {children}
                    </div>
                </div>
            </div>
            <style>{`
                .prose { line-height: 1.6; }
                .prose h2 { margin-top: 1.5em; margin-bottom: 0.8em; font-size: 1.25em; }
                .prose h3 { margin-top: 1.2em; margin-bottom: 0.5em; font-size: 1.1em; }
                .prose p, .prose ul, .prose ol { margin-bottom: 1em; }
                .prose li { margin-bottom: 0.5em; }
            `}</style>
        </div>
    );
};

export default LegalModal;