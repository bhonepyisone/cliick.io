import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Shop, LiveChatConversation, LiveChatMessage, LiveChatStatus, User, Role, OrderStatus, LiveChatChannel, SavedReply, Attachment } from '../types';
import SendIcon from './icons/SendIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import TagIcon from './icons/TagIcon';
import PencilIcon from './icons/PencilIcon';
import SearchIcon from './icons/SearchIcon';
import XIcon from './icons/XIcon';
import PlusIcon from './icons/PlusIcon';
import { useLocalization } from '../hooks/useLocalization';
import ChannelIcon from './ChannelIcon';
import { getAllUsers, getCurrentUser } from '../services/authService';
import * as supabaseShopService from '../services/supabaseShopService';
import UserAvatar from './UserAvatar';
import ChevronDownIcon from './icons/ChevronDownIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import ShoppingCartIcon from './icons/ShoppingCartIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import ClockIcon from './icons/ClockIcon';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import ToggleSwitch from './ToggleSwitch';
import PaperclipIcon from './icons/PaperclipIcon';
import SavedRepliesPanel from './SavedRepliesPanel';
import { useDebounce } from '../hooks/useDebounce';
import { LazyImage } from '../hooks/useLazyImage.tsx';
import { dbToast, showToast } from '../utils/toast';
import { sanitizeText, sanitizeHtml } from '../utils/sanitize';
import { rateLimiter, RATE_LIMITS } from '../utils/rateLimiter';

type InboxFilter = 'my_inbox' | 'unassigned' | 'all_open' | 'closed';

const CONVERSATIONS_PER_PAGE = 50;

interface LiveChatPanelProps {
  shop: Shop;
  updateShop: (updater: (prevShop: Shop) => Shop) => void;
  showConfirmation: (config: { title: string, message: string, onConfirm: () => void, confirmText?: string, confirmButtonClass?: string }) => void;
}

const LiveChatPanel: React.FC<LiveChatPanelProps> = ({ shop, updateShop, showConfirmation }) => {
    const { t } = useLocalization();
    const [activeFilter, setActiveFilter] = useState<InboxFilter>('all_open');
    const [channelFilter, setChannelFilter] = useState<LiveChatChannel | 'all'>('all');
    const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 400); // Debounce search by 400ms
    const [noteInput, setNoteInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [stagedAttachment, setStagedAttachment] = useState<Attachment | null>(null);
    const [showSavedReplies, setShowSavedReplies] = useState(false);
    const [savedReplySearch, setSavedReplySearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isSavedRepliesManagerOpen, setIsSavedRepliesManagerOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const savedRepliesRef = useRef<HTMLDivElement>(null);
    
    // Real-time subscription cleanup refs
    const subscriptionsRef = useRef<Map<string, () => void>>(new Map());
    
    const currentUser = useMemo(() => getCurrentUser(), []);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);
    
    // Load all users on mount
    useEffect(() => {
        const loadUsers = async () => {
            const users = await getAllUsers();
            setAllUsers(users);
        };
        loadUsers();
    }, []);
    
    const assignableUsers = useMemo(() => {
        const teamUserIds = new Set(shop.team.map(m => m.userId));
        return allUsers.filter(u => teamUserIds.has(u.id));
    }, [shop.team, allUsers]);

    const channelOptions = useMemo(() => {
        const options: (LiveChatChannel | 'all')[] = ['all', 'web'];
        if (shop.integrations?.facebook?.isConnected) options.push('facebook');
        if (shop.integrations?.instagram?.isConnected) options.push('instagram');
        if (shop.integrations?.tiktok?.isConnected) options.push('tiktok');
        if (shop.integrations?.telegram?.isConnected) options.push('telegram');
        if (shop.integrations?.viber?.isConnected) options.push('viber');
        // Remove duplicates just in case
        return [...new Set(options)];
    }, [shop.integrations]);

    const filteredConversations = useMemo(() => {
        let convos = [...shop.liveConversations];
        switch (activeFilter) {
            case 'my_inbox':
                convos = convos.filter(c => c.assigneeId === currentUser?.id && c.status !== 'closed');
                break;
            case 'unassigned':
                convos = convos.filter(c => c.assigneeId === null && c.status !== 'closed');
                break;
            case 'all_open':
                convos = convos.filter(c => c.status === 'open' || c.status === 'pending');
                break;
            case 'closed':
                convos = convos.filter(c => c.status === 'closed');
                break;
        }
        if (channelFilter !== 'all') {
            convos = convos.filter(c => c.channel === channelFilter);
        }
        if (debouncedSearchQuery.trim()) {
            const lowerQuery = debouncedSearchQuery.toLowerCase();
            convos = convos.filter(c => c.customerName.toLowerCase().includes(lowerQuery) || c.tags.some(t => t.toLowerCase().includes(lowerQuery)));
        }
        return convos.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    }, [shop.liveConversations, activeFilter, channelFilter, debouncedSearchQuery, currentUser]);

    const totalPages = Math.ceil(filteredConversations.length / CONVERSATIONS_PER_PAGE);
    
    const paginatedConversations = useMemo(() => {
        const startIndex = (currentPage - 1) * CONVERSATIONS_PER_PAGE;
        const endIndex = startIndex + CONVERSATIONS_PER_PAGE;
        return filteredConversations.slice(startIndex, endIndex);
    }, [filteredConversations, currentPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter, channelFilter, debouncedSearchQuery]);

    const selectedConvo = useMemo(() => {
        return shop.liveConversations.find(c => c.id === selectedConvoId);
    }, [selectedConvoId, shop.liveConversations]);

    const customerOrders = useMemo(() => {
        if (!selectedConvo) return [];
        return shop.formSubmissions.filter(sub => {
            const nameKey = Object.keys(sub).find(k => k.toLowerCase().includes('name'));
            return nameKey && String(sub[nameKey]).toLowerCase() === selectedConvo.customerName.toLowerCase();
        }).sort((a, b) => b.submittedAt - a.submittedAt);
    }, [selectedConvo, shop.formSubmissions]);

    const filteredSavedReplies = useMemo(() => {
        const lowerCaseSearch = savedReplySearch.toLowerCase();
        if (!lowerCaseSearch) return shop.savedReplies;
        return shop.savedReplies.filter(reply => 
            reply.name.toLowerCase().includes(lowerCaseSearch) || 
            reply.text.toLowerCase().includes(lowerCaseSearch)
        );
    }, [savedReplySearch, shop.savedReplies]);

    useEffect(() => {
        if (!selectedConvoId && filteredConversations.length > 0) {
            setSelectedConvoId(filteredConversations[0].id);
        } else if (selectedConvoId && !filteredConversations.some(c => c.id === selectedConvoId)) {
            setSelectedConvoId(filteredConversations[0]?.id || null);
        }
    }, [filteredConversations, selectedConvoId]);

    useEffect(() => {
        if (selectedConvo) {
            setNoteInput(selectedConvo.notes);
            if(selectedConvo.isRead === false) {
                 updateShop(s => ({
                    ...s,
                    liveConversations: s.liveConversations.map(c => c.id === selectedConvo.id ? { ...c, isRead: true } : c)
                }));
            }
        }
    }, [selectedConvo, updateShop]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedConvo?.messages]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (savedRepliesRef.current && !savedRepliesRef.current.contains(event.target as Node)) {
                setShowSavedReplies(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Real-time subscription for selected conversation
    useEffect(() => {
        if (!selectedConvoId) return;
        
        console.log('📡 Setting up real-time subscription for conversation:', selectedConvoId);
        
        const cleanup = supabaseShopService.subscribeToConversation(
            selectedConvoId,
            (newMessage) => {
                console.log('📨 New message received via real-time:', newMessage);
                // Update shop state with new message
                updateShop(s => ({
                    ...s,
                    liveConversations: s.liveConversations.map(c => 
                        c.id === selectedConvoId
                            ? { ...c, messages: [...c.messages, newMessage], lastMessageAt: newMessage.timestamp }
                            : c
                    )
                }));
            },
            (conversationUpdate) => {
                console.log('💬 Conversation updated via real-time:', conversationUpdate);
                // Update conversation metadata
                updateShop(s => ({
                    ...s,
                    liveConversations: s.liveConversations.map(c => 
                        c.id === selectedConvoId ? { ...c, ...conversationUpdate } : c
                    )
                }));
            }
        );
        
        // Store cleanup function
        subscriptionsRef.current.set(selectedConvoId, cleanup);
        
        return () => {
            console.log('🔌 Cleaning up real-time subscription for:', selectedConvoId);
            cleanup();
            subscriptionsRef.current.delete(selectedConvoId);
        };
    }, [selectedConvoId, updateShop]);
    
    // Cleanup all subscriptions on unmount
    useEffect(() => {
        return () => {
            console.log('🧹 Cleaning up all real-time subscriptions');
            subscriptionsRef.current.forEach(cleanup => cleanup());
            subscriptionsRef.current.clear();
            supabaseShopService.cleanupAllSubscriptions();
        };
    }, []);
    
    const handleUpdateConversation = async (convoId: string, updates: Partial<LiveChatConversation>) => {
        // Optimistic update for instant UI feedback
        updateShop(s => ({
            ...s,
            liveConversations: s.liveConversations.map(c => c.id === convoId ? { ...c, ...updates } : c)
        }));
        
        // Persist specific fields to Supabase in the background
        try {
            const dbUpdates: any = {};
            if (updates.assigneeId !== undefined) dbUpdates.assigneeId = updates.assigneeId;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.isAiActive !== undefined) dbUpdates.isLive = updates.isAiActive; // Maps to is_live in DB
            
            if (Object.keys(dbUpdates).length > 0) {
                await supabaseShopService.updateConversation(convoId, dbUpdates);
            }
            
            // For fields not in DB (tags, notes, messages), we rely on enrichShopWithFullData
            // These are stored in local state and will sync when shop is reloaded
        } catch (error) {
            dbToast.updateError('Conversation', error);
            // Consider implementing rollback or retry logic
        }
    };

    const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setStagedAttachment({
                    type: 'image',
                    url: reader.result as string,
                    name: file.name
                });
            };
            reader.readAsDataURL(file);
        }
        e.target.value = ''; // Reset file input
    };

    const handleSendMessage = async () => {
        if ((!messageInput.trim() && !stagedAttachment) || !selectedConvoId || !currentUser) return;
        
        // Rate limiting for message sending
        const rateLimitKey = `message:${currentUser.id}:${selectedConvoId}`;
        const rateLimit = rateLimiter.check(rateLimitKey, RATE_LIMITS.MESSAGE_SEND);
        
        if (!rateLimit.allowed) {
            showToast.warning(rateLimit.message || 'Sending messages too quickly');
            return;
        }
        
        const timestamp = Date.now();
        const newMessages: LiveChatMessage[] = [];

        // First, send the attachment if it exists
        if (stagedAttachment) {
            const attachmentMessage: LiveChatMessage = {
                id: `msg_${timestamp}`,
                sender: 'seller',
                senderId: currentUser.id,
                text: '', // Important: empty text for the attachment message
                timestamp: timestamp,
                isNote: false,
                attachment: stagedAttachment,
            };
            newMessages.push(attachmentMessage);
        }

        // Then, send the text if it exists (sanitize for XSS)
        if (messageInput.trim()) {
            const sanitizedText = sanitizeText(messageInput.trim());
            
            const textMessage: LiveChatMessage = {
                id: `msg_${timestamp + 1}`, // Ensure unique ID and order
                sender: 'seller',
                senderId: currentUser.id,
                text: sanitizedText,
                timestamp: timestamp + 1,
                isNote: false,
                attachment: null, // Important: no attachment here
            };
            newMessages.push(textMessage);
        }
        
        if (newMessages.length > 0) {
            // Optimistic update - add messages to UI immediately
            handleUpdateConversation(selectedConvoId, {
                messages: [...(selectedConvo?.messages || []), ...newMessages],
                lastMessageAt: timestamp + 1, // Use the latest timestamp
                status: 'open'
            });
            
            // Persist to Supabase in background
            try {
                for (const message of newMessages) {
                    await supabaseShopService.addMessage(selectedConvoId, message);
                }
            } catch (error) {
                dbToast.saveError('Message', error);
                // Messages are already in UI via optimistic update
                // Real-time subscription will sync them when DB is updated
            }
        }

        setMessageInput('');
        setStagedAttachment(null);
    };

    const handleMessageInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setMessageInput(value);
        if (value.startsWith('/')) {
            setShowSavedReplies(true);
            setSavedReplySearch(value.substring(1));
        } else {
            setShowSavedReplies(false);
        }
    };
    
    const handleAddTag = () => {
        if (tagInput.trim() && selectedConvoId) {
            const currentTags = selectedConvo?.tags || [];
            if (!currentTags.includes(tagInput.trim())) {
                handleUpdateConversation(selectedConvoId, { tags: [...currentTags, tagInput.trim()] });
            }
            setTagInput('');
        }
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        if (selectedConvoId) {
            const currentTags = selectedConvo?.tags || [];
            handleUpdateConversation(selectedConvoId, { tags: currentTags.filter(t => t !== tagToRemove) });
        }
    };

    const getStatusColor = (status: OrderStatus) => {
        switch(status) {
          case OrderStatus.Pending: return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
          case OrderStatus.Confirmed: return 'bg-blue-900/50 text-blue-300 border-blue-700';
          case OrderStatus.Completed: return 'bg-green-900/50 text-green-300 border-green-700';
          case OrderStatus.Cancelled: return 'bg-red-900/50 text-red-300 border-red-700';
          case OrderStatus.Return: return 'bg-orange-900/50 text-orange-300 border-orange-700';
          default: return 'bg-gray-700 text-gray-300 border-gray-600';
        }
    };
    
    const FilterButton: React.FC<{ filter: InboxFilter; label: string; count: number; }> = ({ filter, label, count }) => (
        <button
            onClick={() => setActiveFilter(filter)}
            className={`w-full flex justify-between items-center text-left p-2 rounded-md text-sm transition-colors ${activeFilter === filter ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-gray-700/50'}`}
        >
            <span>{label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${activeFilter === filter ? 'bg-blue-200 text-blue-800' : 'bg-gray-700 text-gray-300'}`}>{count}</span>
        </button>
    );

    const filterCounts = useMemo(() => {
        return {
            my_inbox: shop.liveConversations.filter(c => c.assigneeId === currentUser?.id && c.status !== 'closed').length,
            unassigned: shop.liveConversations.filter(c => c.assigneeId === null && c.status !== 'closed').length,
            all_open: shop.liveConversations.filter(c => c.status === 'open' || c.status === 'pending').length,
            closed: shop.liveConversations.filter(c => c.status === 'closed').length,
        };
    }, [shop.liveConversations, currentUser]);
    
    return (
        <div className="h-full grid grid-cols-1 md:grid-cols-4 gap-0 bg-gray-800 rounded-lg shadow-lg overflow-hidden relative">
            {isSavedRepliesManagerOpen && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
                    <div className="bg-[#1D3B59] rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 flex flex-col h-[70vh]">
                        <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold text-white">{t('manageSavedReplies')}</h3>
                            <button onClick={() => setIsSavedRepliesManagerOpen(false)} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </header>
                        <div className="flex-grow overflow-hidden p-0">
                            <SavedRepliesPanel
                                shop={shop}
                                onUpdateShop={updateShop}
                                showConfirmation={showConfirmation}
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* Conversation List */}
            <div className="md:col-span-1 bg-gray-900/50 flex flex-col border-r border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">{t('inboxTitle')}</h3>
                    <div className="relative mt-2">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                        <input type="text" placeholder={t('search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-full py-2 pl-9 pr-4 text-sm text-white"/>
                    </div>
                    <div className="mt-4">
                        <label className="text-xs text-gray-400">{t('filterByChannel')}</label>
                        <select
                            value={channelFilter}
                            onChange={e => setChannelFilter(e.target.value as any)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm mt-1"
                        >
                            {channelOptions.map(channel => (
                                <option key={channel} value={channel} className="capitalize">
                                    {channel === 'all' ? 'All Channels' : channel}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="p-2 flex-shrink-0 border-b border-gray-700">
                    <FilterButton filter="my_inbox" label={t('myInbox')} count={filterCounts.my_inbox} />
                    <FilterButton filter="unassigned" label={t('unassigned')} count={filterCounts.unassigned} />
                    <FilterButton filter="all_open" label={t('allOpen')} count={filterCounts.all_open} />
                    <FilterButton filter="closed" label={t('closed')} count={filterCounts.closed} />
                </div>
                <div className="flex-grow overflow-y-auto pr-1">
                    <div className="p-2 space-y-1">
                        {filteredConversations.map(convo => (
                            <button key={convo.id} onClick={() => setSelectedConvoId(convo.id)} className={`w-full text-left p-3 rounded-lg relative ${selectedConvoId === convo.id ? 'bg-blue-600/80' : 'hover:bg-gray-700/50'}`}>
                                <div className="flex justify-between items-start">
                                    <p className={`font-semibold truncate pr-16 ${!convo.isRead && selectedConvoId !== convo.id ? 'text-white' : 'text-gray-200'}`}>{convo.customerName}</p>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <ChannelIcon channel={convo.channel} className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs text-gray-400">{new Date(convo.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <p className={`text-xs truncate ${selectedConvoId === convo.id ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {convo.messages[convo.messages.length - 1]?.text || '[Attachment]'}
                                </p>
                                {!convo.isRead && selectedConvoId !== convo.id && (
                                    <div className="absolute top-1/2 -translate-y-1/2 right-3 w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
                                )}
                            </button>
                        ))}
                         {filteredConversations.length === 0 && ( <div className="text-center p-8 text-sm text-gray-500">{t('noConversationsFound')}</div> )}
                    </div>
                </div>
            </div>
            
            {selectedConvo ? (
                <>
                    <div className="md:col-span-2 flex flex-col h-full bg-[#1D3B59] overflow-hidden">
                        <header className="flex-shrink-0 p-3 border-b border-[#2c4f73] flex items-center gap-4">
                            <div className="flex-grow">
                                <h2 className="text-md font-bold text-white flex items-center gap-2">
                                    <ChannelIcon channel={selectedConvo.channel} className="w-5 h-5" /> {selectedConvo.customerName}
                                </h2>
                            </div>
                             <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-300">{t('aiActive')}</span>
                                <ToggleSwitch
                                    enabled={selectedConvo.isAiActive}
                                    onChange={(enabled) => handleUpdateConversation(selectedConvo.id, { isAiActive: enabled })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <select value={selectedConvo.assigneeId || 'unassigned'} onChange={e => handleUpdateConversation(selectedConvo.id, { assigneeId: e.target.value === 'unassigned' ? null : e.target.value })} className="bg-gray-700 border border-gray-600 rounded-md p-1 text-xs text-white">
                                    <option value="unassigned">Unassigned</option>
                                    {assignableUsers.map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
                                </select>
                                <select value={selectedConvo.status} onChange={e => handleUpdateConversation(selectedConvo.id, { status: e.target.value as LiveChatStatus })} className="bg-gray-700 border border-gray-600 rounded-md p-1 text-xs text-white">
                                    <option value="open">Open</option>
                                    <option value="pending">Pending</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </header>
                        
                        <main className="flex-grow min-h-0 overflow-y-auto p-4 space-y-4">
                            {selectedConvo.messages.map(msg => {
                                const customerInitials = selectedConvo.customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                return (
                                    <div key={msg.id} className={`flex w-full items-start gap-3 ${msg.isNote ? 'justify-center' : (msg.sender === 'user' ? 'justify-start' : 'justify-end')}`}>

                                        {msg.sender === 'user' && !msg.isNote && (
                                            <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                                {customerInitials}
                                            </div>
                                        )}
                                        
                                        <div className={`max-w-md rounded-lg shadow-md text-sm ${
                                            msg.isNote ? 'bg-yellow-200 text-yellow-900 w-full md:w-4/5 p-3' :
                                            (msg.attachment && !msg.text) ? 'p-1 bg-transparent' : 'p-3'} ${
                                            msg.sender === 'user' ? 'bg-[#2c4f73] text-gray-200' : 'bg-blue-600 text-white'
                                        }`}>
                                            {msg.isNote && <p className="text-xs font-bold mb-1 flex items-center gap-1.5"><LockClosedIcon className="w-4 h-4"/> Private Note by {userMap.get(msg.senderId!)?.username || 'Unknown'}</p>}
                                            
                                            {msg.attachment?.type === 'image' && (
                                                <LazyImage 
                                                    src={msg.attachment.url} 
                                                    alt={msg.attachment.name || 'attachment'} 
                                                    className="rounded-lg mb-1 max-w-xs cursor-pointer" 
                                                    onClick={() => window.open(msg.attachment.url, '_blank')} 
                                                />
                                            )}

                                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                                            
                                            {!msg.isNote && <p className="text-xs mt-1 opacity-70 text-right">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>}
                                        </div>

                                        {msg.sender !== 'user' && !msg.isNote && (
                                            <UserAvatar user={msg.sender === 'seller' ? (userMap.get(msg.senderId!) || null) : null} className="w-8 h-8"/>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </main>

                         <footer className="flex-shrink-0 p-4 border-t border-[#2c4f73] bg-gray-800 relative">
                            {showSavedReplies && (
                                <div ref={savedRepliesRef} className="absolute bottom-full left-4 right-4 mb-2 bg-[#2c4f73] border border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                    <div className="flex justify-between items-center px-2 pt-2 pb-1 border-b border-gray-600">
                                        <h5 className="text-xs font-bold text-gray-400">{t('savedReplies')}</h5>
                                        <button onClick={() => { setIsSavedRepliesManagerOpen(true); setShowSavedReplies(false); }} className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                                            <PencilIcon className="w-3 h-3"/> Manage
                                        </button>
                                    </div>
                                    <div className="p-1">
                                    {filteredSavedReplies.length > 0 ? filteredSavedReplies.map(reply => (
                                        <button
                                            key={reply.id}
                                            onClick={() => {
                                                setMessageInput(reply.text);
                                                setShowSavedReplies(false);
                                            }}
                                            className="w-full text-left p-2 rounded hover:bg-gray-600 text-sm"
                                        >
                                            <span className="font-semibold text-white">/{reply.name}</span>
                                            <span className="text-gray-400 ml-2 truncate">{reply.text}</span>
                                        </button>
                                    )) : <p className="text-center text-sm text-gray-500 p-2">No replies found.</p>}
                                    </div>
                                </div>
                            )}
                            {stagedAttachment && (
                                <div className="relative inline-block mb-2">
                                    <LazyImage 
                                        src={stagedAttachment.url} 
                                        alt="Staged attachment" 
                                        className="h-24 w-auto rounded-lg" 
                                    />
                                    <button
                                        onClick={() => setStagedAttachment(null)}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5"
                                        aria-label={t('removeAttachment')}
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="relative">
                                <div className="absolute top-3 left-3 flex items-center gap-2">
                                    <input type="file" ref={fileInputRef} onChange={handleAttachmentSelect} accept="image/*" className="hidden" />
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700" title="Send attachment">
                                        <PaperclipIcon className="w-4 h-4" />
                                    </button>
                                    <div className="relative group">
                                        <button onClick={() => { setShowSavedReplies(prev => !prev); setSavedReplySearch(''); }} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700" title={t('savedReplies')}>
                                            <TagIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <textarea value={messageInput} onChange={handleMessageInputChange} onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={t('typeYourReplyPlaceholder')} className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-3 pl-24 pr-12 text-sm text-white resize-none" rows={3} />
                                <div className="absolute right-3 bottom-3 flex items-center">
                                    <button onClick={handleSendMessage} disabled={!messageInput.trim() && !stagedAttachment} className="p-2 rounded-full text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600">
                                        <SendIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </div>
                    
                    <aside className="md:col-span-1 bg-gray-900/50 flex flex-col border-l border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">{t('customerDetails')}</h3>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-300 text-sm mb-2 flex items-center gap-1.5"><TagIcon className="w-4 h-4"/> {t('tags')}</h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedConvo.tags.map(tag => ( <div key={tag} className="flex items-center bg-gray-700 text-xs text-gray-200 pl-2 pr-1 py-0.5 rounded-full"><span>{tag}</span><button onClick={() => handleRemoveTag(tag)} className="ml-1 p-0.5 rounded-full hover:bg-red-500/50"><XIcon className="w-3 h-3"/></button></div>))}
                                </div>
                                <div className="flex gap-2"><input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} placeholder={t('addTag')} className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-1.5 text-xs"/><button onClick={handleAddTag} className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-md"><PlusIcon className="w-4 h-4"/></button></div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-300 text-sm mb-2 flex items-center gap-1.5"><PencilIcon className="w-4 h-4"/> {t('notes')}</h4>
                                <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} onBlur={() => handleUpdateConversation(selectedConvoId!, { notes: noteInput })} placeholder={t('addNotes')} rows={5} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"/>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-300 text-sm mb-2 flex items-center gap-1.5"><ShoppingCartIcon className="w-4 h-4"/> Order History</h4>
                                <div className="space-y-2">
                                    {customerOrders.length > 0 ? customerOrders.map(order => (
                                        <div key={order.submissionId} className="bg-gray-800 p-2 rounded-md text-xs">
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-blue-400">{order.orderId}</p>
                                                <span className={`px-2 py-0.5 text-[10px] rounded-full border ${getStatusColor(order.status)}`}>{order.status}</span>
                                            </div>
                                            <p className="text-gray-400">{new Date(order.submittedAt).toLocaleDateString()}</p>
                                            <p className="text-gray-300 mt-1">{order.orderedProducts.map(p=>p.productName).join(', ')}</p>
                                        </div>
                                    )) : <p className="text-xs text-gray-500">No past orders found for this customer.</p>}
                                </div>
                            </div>
                        </div>
                    </aside>
                </>
            ) : (
                <div className="md:col-span-3 flex items-center justify-center text-gray-500">
                    <p>{t('selectConversation')}</p>
                </div>
            )}
        </div>
    );
};

export default LiveChatPanel;