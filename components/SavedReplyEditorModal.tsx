import React, { useState, useRef, useEffect } from 'react';
import { SavedReply, Shop, KnowledgeSection, Item } from '../types';
import XIcon from './icons/XIcon';
import { useToast } from '../contexts/ToastContext';

interface SavedReplyEditorModalProps {
    reply: SavedReply | null;
    onSave: (reply: SavedReply) => void;
    onClose: () => void;
    shop: Shop;
}

const SavedReplyEditorModal: React.FC<SavedReplyEditorModalProps> = ({ reply, onSave, onClose, shop }) => {
    const [name, setName] = useState(reply?.name || '');
    const [text, setText] = useState(reply?.text || '');
    const { showToast } = useToast();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importTab, setImportTab] = useState<'training' | 'products'>('training');
    const importButtonRef = useRef<HTMLButtonElement>(null);
    const importPopoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                importPopoverRef.current &&
                !importPopoverRef.current.contains(event.target as Node) &&
                importButtonRef.current &&
                !importButtonRef.current.contains(event.target as Node)
            ) {
                setIsImportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = () => {
        const trimmedName = name.trim().replace(/\s+/g, '-');
        if (!trimmedName || !text.trim()) {
            showToast('Shortcut name and reply content cannot be empty.', 'error');
            return;
        }
        onSave({
            id: reply?.id || `sr_${Date.now()}`,
            name: trimmedName,
            text: text.trim(),
        });
    };

    const handleImportFromTraining = (section: KnowledgeSection) => {
        setText(prev => prev ? `${prev}\n${section.content}` : section.content);
        setIsImportOpen(false);
    };

    const handleImportFromProduct = (product: Item) => {
        const productInfo = `Product: ${product.name}\nPrice: ${product.retailPrice} MMK\nDescription: ${product.description}`;
        setText(prev => prev ? `${prev}\n${productInfo}` : productInfo);
        setIsImportOpen(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{reply ? 'Edit Saved Reply' : 'Add New Saved Reply'}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">Shortcut Name</label>
                        <div className="flex items-center gap-2">
                            <span className="bg-gray-700 p-2 rounded-l-md text-gray-400">/</span>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value.replace(/\s+/g, '-'))}
                                placeholder="e.g., shipping-policy"
                                className="w-full bg-gray-700 border border-gray-600 rounded-r-md p-2 text-sm text-white"
                            />
                        </div>
                    </div>
                    <div className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-medium text-gray-300">Reply Content</label>
                            <button
                                ref={importButtonRef}
                                onClick={() => setIsImportOpen(prev => !prev)}
                                className="text-xs text-blue-400 hover:underline"
                            >
                                Import Content...
                            </button>
                        </div>

                        {isImportOpen && (
                            <div ref={importPopoverRef} className="absolute right-0 top-8 mt-1 w-72 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-20 p-2">
                                <div className="flex mb-2">
                                    <button onClick={() => setImportTab('training')} className={`flex-1 py-1 text-xs rounded-l-md ${importTab === 'training' ? 'bg-blue-600' : 'bg-gray-600'}`}>From Training</button>
                                    <button onClick={() => setImportTab('products')} className={`flex-1 py-1 text-xs rounded-r-md ${importTab === 'products' ? 'bg-blue-600' : 'bg-gray-600'}`}>From Products</button>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {importTab === 'training' && shop.knowledgeBase.userDefined.filter(s => s.isCustom).map(section => (
                                        <button key={section.id} onClick={() => handleImportFromTraining(section)} className="w-full text-left p-1.5 text-xs hover:bg-gray-600 rounded">{section.title}</button>
                                    ))}
                                    {importTab === 'products' && shop.items.map(item => (
                                        <button key={item.id} onClick={() => handleImportFromProduct(item)} className="w-full text-left p-1.5 text-xs hover:bg-gray-600 rounded">{item.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Type your full reply message here..."
                            rows={6}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white"
                        />
                    </div>
                </div>

                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">Save Reply</button>
                </footer>
            </div>
        </div>
    );
};

export default SavedReplyEditorModal;