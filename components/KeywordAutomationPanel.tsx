import React, { useState, useEffect, useRef, ReactNode, useMemo } from 'react';
import { KeywordReply, Form, PersistentMenuItem, PersistentMenuItemType, ShopPaymentMethod, KnowledgeBase, KnowledgeSection, Attachment, OrderManagementFlowConfig, BookingFlowConfig, Language, Shop } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import PaperclipIcon from './icons/PaperclipIcon';
import ChatAltIcon from './icons/ChatAltIcon';
import AnnotationIcon from './icons/AnnotationIcon';
import XIcon from './icons/XIcon';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import OrderFlowManagement from './OrderFlowManagement';
import AutomationIcon from './icons/AutomationIcon';
import BotIcon from './icons/BotIcon';
import { usePermissions } from '../hooks/usePermissions';
import MenuItemEditor, { getActionFromItem } from './MenuItemEditor';
import ButtonEditorIcon from './icons/ButtonEditorIcon';
import ButtonEditorPanel from './ButtonEditorPanel';
import ToggleSwitch from './ToggleSwitch';
import { SubTab as SettingsSubTab } from './SettingsPanel';


const REPLY_CHARACTER_LIMIT = 450;

interface AutomationsPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    onNavigate: (tab: 'settings' | 'training', subTab?: SettingsSubTab) => void;
    showConfirmation: (config: { title: string; message: ReactNode; onConfirm: () => void; confirmText?: string; confirmButtonClass?: string; }) => void;
}


const KeywordAutomationPanel: React.FC<AutomationsPanelProps> = ({ shop, onUpdateShop, onNavigate, showConfirmation }) => {
    const { 
        keywordReplies, forms, paymentMethods, knowledgeBase, 
        orderManagementFlowConfig: orderConfig, bookingFlowConfig: bookingConfig, 
        assistantConfig: { language } 
    } = shop;
    
    const onKeywordRepliesChange = (replies: KeywordReply[]) => onUpdateShop(s => ({...s, keywordReplies: replies}));
    const onOrderConfigChange = (config: OrderManagementFlowConfig) => onUpdateShop(s => ({...s, orderManagementFlowConfig: config}));
    const onBookingConfigChange = (config: BookingFlowConfig) => onUpdateShop(s => ({...s, bookingFlowConfig: config}));
    
  const { t } = useLocalization();
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'keywords' | 'flows' | 'buttons'>('keywords');
  const [selectedRuleId, setSelectedRuleId] = useState<string | 'new' | null>(keywordReplies[0]?.id || null);
  const [editableRule, setEditableRule] = useState<KeywordReply | null>(null);
  const [editingButton, setEditingButton] = useState<Partial<PersistentMenuItem> | 'new' | null>(null);
  const [idBeforeNew, setIdBeforeNew] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Permissions need to be initialized inside the component
  const permissions = usePermissions(shop, 0); 

  const ruleLimit = permissions.getLimit('keywordRuleCount') ?? Infinity;
  const isAddRuleDisabled = keywordReplies.length >= ruleLimit;

  const itemForEditor = useMemo(() => {
    if (editingButton === 'new') {
        // Create a transient ID for new items
        return { id: `new_${Date.now()}`, type: PersistentMenuItemType.POSTBACK, title: '' };
    }
    if (editingButton) {
        return editingButton as PersistentMenuItem;
    }
    return null;
  }, [editingButton]);

  useEffect(() => {
    if(selectedRuleId && selectedRuleId !== 'new' && !keywordReplies.some(r => r.id === selectedRuleId)) {
        setSelectedRuleId(keywordReplies[0]?.id || null);
    }
    if(!selectedRuleId && keywordReplies.length > 0) {
        setSelectedRuleId(keywordReplies[0].id);
    }
  }, [keywordReplies, selectedRuleId]);

  useEffect(() => {
    if (selectedRuleId === 'new') {
        setEditableRule({ id: `kw_${Date.now()}`, keywords: '', reply: '', applyTo: { chat: true, comments: true }, matchType: 'contains', attachment: null, buttons: [], enabled: true });
    } else if (selectedRuleId) {
        const rule = keywordReplies.find(r => r.id === selectedRuleId);
        setEditableRule(rule ? { ...rule } : null);
        setIdBeforeNew(selectedRuleId);
    } else {
        setEditableRule(null);
    }
    setEditingButton(null);
  }, [selectedRuleId, keywordReplies]);

  const handleToggleRule = (ruleId: string) => {
    const updatedReplies = keywordReplies.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
    onKeywordRepliesChange(updatedReplies);
  };

  const handleSave = () => {
    if (!editableRule) return;
    if (!editableRule.keywords.trim()) { showToast("Trigger phrases cannot be empty.", 'error'); return; }
    if (!editableRule.reply.trim() && !editableRule.attachment && (!editableRule.buttons || editableRule.buttons.length === 0)) { showToast("Please provide a reply message, an attachment, or at least one button.", 'error'); return; }
    
    setIsSaving(true);
    setTimeout(() => {
        const isNew = selectedRuleId === 'new';
        if (isNew) { onKeywordRepliesChange([...keywordReplies, editableRule]); } 
        else { onKeywordRepliesChange(keywordReplies.map(r => r.id === editableRule.id ? editableRule : r)); }
        setSelectedRuleId(editableRule.id);
        showToast(t('ruleSavedSuccess'), 'success');
        setIsSaving(false);
    }, 500);
  };
  
  const handleCancel = () => {
    setEditingButton(null);
    setSelectedRuleId(idBeforeNew);
  };

  const handleDelete = () => {
    if (editableRule && selectedRuleId && selectedRuleId !== 'new') {
        showConfirmation({
            title: t('deleteRule'),
            message: t('areYouSureDeleteRule'),
            confirmText: t('delete'),
            onConfirm: () => {
                const currentIndex = keywordReplies.findIndex(r => r.id === selectedRuleId);
                const newReplies = keywordReplies.filter(r => r.id !== selectedRuleId);
                onKeywordRepliesChange(newReplies);
    
                if (newReplies.length === 0) { setSelectedRuleId(null); } 
                else {
                    const newIndex = Math.min(currentIndex, newReplies.length - 1);
                    setSelectedRuleId(newReplies[newIndex].id);
                }
                showToast(t('ruleDeletedSuccess'), 'success');
            }
        });
    }
  };
  
  const handleAddNew = () => {
    if (isAddRuleDisabled) { showToast(t('upgradeForMoreRules'), 'error'); return; }
    setSelectedRuleId('new');
  };

  const handleSaveButton = (buttonToSave: PersistentMenuItem) => {
    if (!editableRule) return;
    const currentButtons = editableRule.buttons || [];
    const isNewButton = !buttonToSave.id || buttonToSave.id.startsWith('new_');
    let updatedButtons;
    if (isNewButton) { updatedButtons = [...currentButtons, { ...buttonToSave, id: `btn_${Date.now()}` }]; } 
    else { updatedButtons = currentButtons.map(btn => btn.id === buttonToSave.id ? buttonToSave : btn); }
    setEditableRule(prev => prev ? { ...prev, buttons: updatedButtons } : null);
    setEditingButton(null);
  };

  const handleDeleteButton = (id: string) => {
     if (!editableRule) return;
     setEditableRule(prev => prev ? ({ ...prev, buttons: (prev.buttons || []).filter(btn => btn.id !== id) }) : null);
  };
  
  const getButtonDescription = (item: PersistentMenuItem) => {
    const action = getActionFromItem(item);
    switch (action) {
        case 'open_form':
            return `Opens form: ${forms.find(f => f.id === item.payload)?.name || '...'}`;
        case 'open_a_web_url':
            return `Opens link: ${item.url}`;
        case 'postback':
            return `Sends: "${item.payload}"`;
        case 'manage_order':
            return "Starts 'Manage Order' flow";
        case 'manage_booking':
            return "Starts 'Manage Booking' flow";
        case 'show_all_payment_methods':
            return 'Shows all payment methods';
        default:
            return `Action: ${action.replace(/_/g, ' ')}`;
    }
  };

  const handleRemoveAttachment = () => {
      if (!editableRule) return;
      setEditableRule({ ...editableRule, attachment: null });
  };
  
   const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !editableRule) return;
        const file = event.target.files[0];
        
        let type: Attachment['type'] | null = null;
        const limits = { image: 2, gif: 5, video: 50 }; // in MB

        if (file.type.startsWith('image/')) {
            type = file.type === 'image/gif' ? 'gif' : 'image';
        } else if (file.type.startsWith('video/')) {
            type = 'video';
        }

        if (!type) {
            showToast('Invalid file type. Please upload an image, GIF, or video.', 'error');
            return;
        }
        
        if (file.size > limits[type] * 1024 * 1024) {
            showToast(`File too large. Max size for ${type} is ${limits[type]}MB.`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setEditableRule(prev => {
                if (!prev) return null;
                return { ...prev, attachment: { type: type!, url: reader.result as string } };
            });
            showToast('Attachment uploaded successfully.', 'success');
        };
        reader.onerror = () => showToast('Failed to read file.', 'error');
        reader.readAsDataURL(file);

        if (event.target) {
            event.target.value = '';
        }
    };
  
  const getTabClass = (tab: 'keywords' | 'flows' | 'buttons') => {
    return `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeSubTab === tab
            ? 'bg-[#635BFF] text-white'
            : 'text-gray-300 hover:bg-[#2c4f73]'
    }`;
  };

  return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-2 border-b border-[#2c4f73] pb-4 mb-6">
            <button onClick={() => setActiveSubTab('keywords')} className={getTabClass('keywords')}>
                <BotIcon className="w-5 h-5"/> {t('keywordAutomations')}
            </button>
            <button onClick={() => setActiveSubTab('flows')} className={getTabClass('flows')}>
                <AutomationIcon className="w-5 h-5"/> {t('automatedConversionFlowTitle')}
            </button>
            <button onClick={() => setActiveSubTab('buttons')} className={getTabClass('buttons')}>
                <ButtonEditorIcon className="w-5 h-5"/> {t('buttonsEditor')}
            </button>
        </div>
        <div className="flex-grow min-h-0">
            {activeSubTab === 'keywords' && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full grid grid-cols-1 md:grid-cols-5 gap-0">
                    <div className="md:col-span-2 bg-gray-900/50 rounded-l-lg p-4 flex flex-col border-r border-gray-700 overflow-hidden">
                        <div className="flex-shrink-0 mb-4">
                            <h3 className="text-lg font-bold text-white">{t('automationRules')}</h3>
                            <p className="text-xs text-gray-400 mt-1">{t('selectRuleToEdit')} {ruleLimit !== Infinity ? `(${keywordReplies.length}/${ruleLimit})` : ''}</p>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-2 pr-2 min-h-0">
                            {keywordReplies.map(rule => (
                                <div key={rule.id} className={`p-3 rounded-md transition-all flex items-center gap-3 ${!rule.enabled ? 'opacity-60' : ''} ${selectedRuleId === rule.id ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    <button onClick={() => setSelectedRuleId(rule.id)} className={`flex-grow min-w-0 text-left text-sm`}>
                                        <p className="font-semibold truncate">{t('triggers')}: {rule.keywords}</p>
                                        <p className={`truncate text-xs ${selectedRuleId === rule.id ? 'text-blue-200' : 'text-gray-400'}`}>{t('reply')}: {rule.reply || 'Attachment/Button reply'}</p>
                                    </button>
                                    <ToggleSwitch enabled={rule.enabled} onChange={() => handleToggleRule(rule.id)} />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 border-t border-gray-700 pt-4 flex-shrink-0 relative group">
                            <button onClick={handleAddNew} disabled={isAddRuleDisabled} className="w-full flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed">
                                <PlusIcon className="w-4 h-4 mr-2" /> {t('addNewRule')}
                            </button>
                            {isAddRuleDisabled && ( <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10"> {t('upgradeForMoreRules')} </div> )}
                        </div>
                    </div>

                    <div className="md:col-span-3 p-6 flex flex-col h-full overflow-hidden">
                        {!editableRule ? (
                            <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                                <div>
                                    <h3 className="text-lg font-semibold">{t('noRuleSelected')}</h3>
                                    <p>{t('selectOrAddRule')}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                                    <div>
                                        <p className="text-md font-semibold text-gray-200 mb-2">{t('ifCustomerMessage')}</p>
                                        <div className="flex gap-2 mb-2">
                                            <button onClick={() => setEditableRule({...editableRule, matchType: 'contains'})} className={`px-4 py-2 text-sm rounded-md transition-colors ${editableRule.matchType === 'contains' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{t('contains')}</button>
                                            <button onClick={() => setEditableRule({...editableRule, matchType: 'exact'})} className={`px-4 py-2 text-sm rounded-md transition-colors ${editableRule.matchType === 'exact' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{t('isExactly')}</button>
                                        </div>
                                        <input type="text" value={editableRule.keywords} onChange={e => setEditableRule({...editableRule, keywords: e.target.value})} placeholder="price, how much, order status" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm text-white placeholder-gray-400" />
                                    </div>

                                    <div>
                                        <label className="block text-md font-semibold text-gray-200 mb-2">{t('attachment')}</label>
                                        {!editableRule.attachment ? (
                                            <>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileChange}
                                                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full border-2 border-dashed border-gray-600 rounded-lg p-6 text-center text-gray-400 hover:border-gray-500 hover:bg-gray-800/50"
                                                >
                                                    <p>{t('clickToUploadAttachment')}</p>
                                                    <p className="text-xs mt-1">{t('attachmentSizeLimits')}</p>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                                                <div className="relative w-40 h-40 bg-gray-800 rounded-lg overflow-hidden">
                                                    {(editableRule.attachment.type === 'image' || editableRule.attachment.type === 'gif') && <img src={editableRule.attachment.url} alt="Preview" className="w-full h-full object-cover"/>}
                                                    {editableRule.attachment.type === 'video' && <video src={editableRule.attachment.url} controls className="w-full h-full"/>}
                                                    <button onClick={handleRemoveAttachment} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-red-600"><XIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-md font-semibold text-gray-200 mb-2">{t('thenReplyWithMessage')}</label>
                                        <textarea value={editableRule.reply} onChange={e => setEditableRule({...editableRule, reply: e.target.value})} placeholder="Our product costs $25..." className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-sm text-white" rows={5} maxLength={REPLY_CHARACTER_LIMIT}/>
                                        <p className="text-xs text-gray-400 mt-1 text-right">{editableRule.reply.length} / {REPLY_CHARACTER_LIMIT}</p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-md font-semibold text-gray-200 mb-2">{t('buttons')} ({t('max3')})</label>
                                        <div className="space-y-2">
                                            {(editableRule.buttons || []).map(btn => (
                                                <div key={btn.id} className="bg-gray-700 p-2 rounded-md flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold">{btn.title}</p>
                                                        <p className="text-xs text-blue-300">{getButtonDescription(btn)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => setEditingButton(btn)} className="p-1 text-gray-300 hover:text-white"><PencilIcon className="w-4 h-4"/></button>
                                                        <button onClick={() => handleDeleteButton(btn.id)} className="p-1 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div hidden={!itemForEditor}>
                                                <MenuItemEditor
                                                    item={itemForEditor}
                                                    onSave={handleSaveButton}
                                                    onCancel={() => setEditingButton(null)}
                                                    forms={forms}
                                                    paymentMethods={paymentMethods}
                                                    knowledgeSections={knowledgeBase.userDefined}
                                                    orderConfig={orderConfig}
                                                    bookingConfig={bookingConfig}
                                                />
                                            </div>
                                            {(editableRule.buttons || []).length < 3 && !itemForEditor && (
                                                <button onClick={() => setEditingButton('new')} className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-600 hover:border-gray-500 hover:bg-gray-700/50 rounded-md text-sm text-gray-400"> <PlusIcon className="w-4 h-4 mr-2" /> {t('addButton')} </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-md font-semibold text-gray-200 mb-2">{t('applyRuleTo')}</p>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2"><ToggleSwitch enabled={editableRule.applyTo.chat} onChange={e => setEditableRule({...editableRule, applyTo: {...editableRule.applyTo, chat: e}})} /><ChatAltIcon className="w-5 h-5"/><span>{t('chatMessages')}</span></label>
                                            <label className="flex items-center gap-2"><ToggleSwitch enabled={editableRule.applyTo.comments} onChange={e => setEditableRule({...editableRule, applyTo: {...editableRule.applyTo, comments: e}})} /><AnnotationIcon className="w-5 h-5"/><span>{t('postComments')}</span></label>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 border-t border-gray-700 pt-4 flex-shrink-0 flex items-center justify-between">
                                    <button onClick={handleDelete} disabled={selectedRuleId === 'new'} className="text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center gap-2"> <TrashIcon className="w-5 h-5"/> {t('deleteRule')} </button>
                                    <div className="flex gap-3">
                                        <button onClick={handleCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold" disabled={isSaving}>{t('cancel')}</button>
                                        <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-wait" disabled={isSaving}>
                                            {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                            {isSaving ? t('saving') : t('saveRule')}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {activeSubTab === 'flows' && (
                <OrderFlowManagement
                    orderConfig={orderConfig}
                    onOrderConfigChange={onOrderConfigChange}
                    bookingConfig={bookingConfig}
                    onBookingConfigChange={onBookingConfigChange}
                    language={language}
                />
            )}
             {activeSubTab === 'buttons' && (
                <ButtonEditorPanel
                    shop={shop}
                    onUpdateShop={onUpdateShop}
                    onNavigate={onNavigate}
                />
            )}
        </div>
      </div>
  );
};

export default KeywordAutomationPanel;
