import React, { useState } from 'react';
import { Shop, SavedReply } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import ArrowUpIcon from './icons/ArrowUpIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import { useLocalization } from '../hooks/useLocalization';
import SavedReplyEditorModal from './SavedReplyEditorModal';

interface SavedRepliesPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    showConfirmation: (config: any) => void;
}

const SavedRepliesPanel: React.FC<SavedRepliesPanelProps> = ({ shop, onUpdateShop, showConfirmation }) => {
    const { t } = useLocalization();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReply, setEditingReply] = useState<SavedReply | null>(null);

    const handleOpenModal = (reply: SavedReply | null) => {
        setEditingReply(reply);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingReply(null);
    };

    const handleSaveReply = (replyToSave: SavedReply) => {
        onUpdateShop(s => {
            const exists = s.savedReplies.some(r => r.id === replyToSave.id);
            const savedReplies = exists
                ? s.savedReplies.map(r => r.id === replyToSave.id ? replyToSave : r)
                : [...s.savedReplies, replyToSave];
            return { ...s, savedReplies };
        });
        handleCloseModal();
    };

    const handleDeleteReply = (replyId: string) => {
        const reply = shop.savedReplies.find(r => r.id === replyId);
        if (!reply) return;

        showConfirmation({
            title: `Delete Saved Reply "/${reply.name}"`,
            message: `Are you sure you want to permanently delete this saved reply?`,
            confirmText: 'Delete',
            confirmButtonClass: 'bg-red-600 hover:bg-red-700',
            onConfirm: () => {
                onUpdateShop(s => ({
                    ...s,
                    savedReplies: s.savedReplies.filter(r => r.id !== replyId)
                }));
            }
        });
    };
    
    const handleMoveReply = (index: number, direction: 'up' | 'down') => {
        const newReplies = [...shop.savedReplies];
        const item = newReplies[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        if (swapIndex < 0 || swapIndex >= newReplies.length) return;

        newReplies[index] = newReplies[swapIndex];
        newReplies[swapIndex] = item;

        onUpdateShop(s => ({ ...s, savedReplies: newReplies }));
    };

    return (
        <>
            {isModalOpen && (
                <SavedReplyEditorModal
                    reply={editingReply}
                    onSave={handleSaveReply}
                    onClose={handleCloseModal}
                    shop={shop}
                />
            )}

            <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">{t('savedReplies')}</h2>
                        <p className="text-sm text-gray-400">Create and manage canned responses for your team.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-semibold"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add New Reply
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                    {shop.savedReplies.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No saved replies yet. Click "Add New Reply" to create one.</p>
                    ) : (
                        shop.savedReplies.map((reply, index) => (
                            <div key={reply.id} className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between gap-4">
                                <div className="flex-grow min-w-0">
                                    <p className="font-semibold text-blue-400">/{reply.name}</p>
                                    <p className="text-sm text-gray-300 truncate">{reply.text}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => handleMoveReply(index, 'up')} disabled={index === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"><ArrowUpIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleMoveReply(index, 'down')} disabled={index === shop.savedReplies.length - 1} className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"><ArrowDownIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleOpenModal(reply)} className="p-2 text-gray-400 hover:text-white"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteReply(reply.id)} className="p-2 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default SavedRepliesPanel;