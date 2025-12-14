import React, { useState, useEffect } from 'react';
import { FormField, FormFieldType, Form, Item, ShopPaymentMethod, OfflineSaleConfig, OnlineSaleConfig, Shop } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import DragHandleIcon from './icons/DragHandleIcon';
import PencilIcon from './icons/PencilIcon';
import XIcon from './icons/XIcon';
import PaymentSelectorConfigModal from './PaymentSelectorConfigModal';
import { useToast } from '../contexts/ToastContext';
// FIX: Add missing imports
import { useLocalization } from '../hooks/useLocalization';
import { usePermissions } from '../hooks/usePermissions';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DuplicateIcon from './icons/DuplicateIcon';
import FormEditor from './FormEditor';
import { addForm, updateForm, deleteForm } from '../services/supabaseHelpers';
import { logger } from '../utils/logger';

interface ItemSelectorModalProps {
    onClose: () => void;
    onSave: (selectedIds: string[]) => void;
    allItems: Item[];
    field: FormField | undefined | null;
}

const ItemSelectorModal: React.FC<ItemSelectorModalProps> = ({ onClose, onSave, allItems, field }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (field) {
            setSelectedIds(new Set(field.itemIds || []));
        }
    }, [field]);

    if (!field) {
        return null;
    }

    const filteredItems = allItems.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggle = (itemId: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        setSelectedIds(newSet);
    };
    
    const handleSave = () => {
        onSave(Array.from(selectedIds));
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Configure Items for Selector</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                <div className="p-4">
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white placeholder-gray-400"
                    />
                </div>
                <div className="flex-grow overflow-y-auto px-4 space-y-2">
                    {filteredItems.map(item => (
                        <label key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.has(item.id)}
                                onChange={() => handleToggle(item.id)}
                                className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"
                            />
                            <img src={item.imageUrl || 'https://placehold.co/40x40/27272a/71717a?text=?'} alt={item.name} className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-600" />
                            <div className="flex-grow">
                                <p className="font-semibold text-sm text-white">{item.name}</p>
                                <div className="flex items-center gap-2">
                                     <span className="text-xs text-blue-300">{item.retailPrice.toLocaleString()} MMK</span>
                                     <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.itemType === 'service' ? 'bg-purple-800 text-purple-200' : 'bg-green-800 text-green-200'}`}>{item.itemType}</span>
                                </div>
                            </div>
                        </label>
                    ))}
                    {filteredItems.length === 0 && (
                        <p className="text-center text-gray-400 py-4">No items found matching your search.</p>
                    )}
                </div>
                <footer className="p-4 bg-gray-900/50 flex justify-between items-center rounded-b-lg border-t border-gray-700">
                    <span className="text-sm text-gray-400">{selectedIds.size} of {allItems.length} items selected</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">Save Selection</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

interface FormManagerProps {
    shop: Shop;
    // FIX: Add 'forms' to the props interface to match its usage in the component and parent.
    forms: Form[];
    onFormsChange: (formsOrUpdater: Form[] | ((prevForms: Form[]) => Form[])) => void;
    onFormSubmit: (submission: any) => void;
    items: Item[];
    permissions: ReturnType<typeof usePermissions>;
    paymentMethods: ShopPaymentMethod[];
    offlineSaleConfig?: OfflineSaleConfig;
    onOfflineSaleConfigChange: (config: OfflineSaleConfig) => void;
    onlineSaleConfig?: OnlineSaleConfig;
    onOnlineSaleConfigChange: (config: OnlineSaleConfig) => void;
    showConfirmation: (config: { title: string, message: string, onConfirm: () => void, confirmText?: string }) => void;
}

const FormManager: React.FC<FormManagerProps> = (props) => {
    const { shop } = props;
    const { t } = useLocalization();
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
    const { showToast } = useToast();
    
    // Remove form limit as Starter and Pro now have unlimited forms
    const isLimitReached = false; 

    const handleSaveForm = async (formToSave: Form) => {
        try {
            let result: Form | null = null;
            const exists = props.forms.some(f => f.id === formToSave.id);
            
            if (exists) {
                result = await updateForm(props.shop.id, formToSave.id, formToSave);
            } else {
                result = await addForm(props.shop.id, formToSave);
            }
            
            if (result) {
                props.onFormsChange(prevForms => {
                    const exists = prevForms.some(f => f.id === result!.id);
                    if (exists) {
                        return prevForms.map(f => f.id === result!.id ? result! : f);
                    }
                    return [...prevForms, result!];
                });
                showToast(t('formSavedSuccess'), 'success');
                setSelectedFormId(null);
            } else {
                showToast('Failed to save form', 'error');
            }
        } catch (error) {
            logger.error('Failed to save form', error);
            showToast('Failed to save form', 'error');
        }
    };

    const handleCreateForm = async () => {
        if (isLimitReached) {
            showToast(t('formLimitReached'), 'error');
            return;
        }
        
        try {
            const newForm: Form = {
                id: `form_${Date.now()}`,
                name: 'New Order Form',
                fields: []
            };
            
            const result = await addForm(props.shop.id, newForm);
            
            if (result) {
                props.onFormsChange(prev => [...prev, result]);
                setSelectedFormId(result.id);
                showToast(t('newFormCreated'), 'success');
            } else {
                showToast('Failed to create form', 'error');
            }
        } catch (error) {
            logger.error('Failed to create form', error);
            showToast('Failed to create form', 'error');
        }
    };
    
    const handleDeleteForm = async (formId: string) => {
        const formName = props.forms.find(f => f.id === formId)?.name || 'this form';
        props.showConfirmation({
            title: t('deleteForm'),
            message: t('areYouSureDeleteForm', { formName }),
            confirmText: t('delete'),
            onConfirm: async () => {
                try {
                    const result = await deleteForm(props.shop.id, formId);
                    
                    if (result) {
                        props.onFormsChange(prev => prev.filter(f => f.id !== formId));
                        if (selectedFormId === formId) {
                            setSelectedFormId(null);
                        }
                        showToast(t('formDeletedSuccess', { formName }), 'success');
                    } else {
                        showToast('Failed to delete form', 'error');
                    }
                } catch (error) {
                    logger.error('Failed to delete form', error);
                    showToast('Failed to delete form', 'error');
                }
            }
        });
    };
    
    const handleDuplicateForm = async (formId: string) => {
        if (isLimitReached) {
            showToast(t('formLimitReached'), 'error');
            return;
        }
        const formToDuplicate = props.forms.find(f => f.id === formId);
        if (!formToDuplicate) return;

        // Deep copy the form and give it a new ID and name
        const newForm: Form = {
            ...JSON.parse(JSON.stringify(formToDuplicate)),
            id: `form_${Date.now()}`,
            name: `${formToDuplicate.name} (Copy)`
        };

        try {
            const result = await addForm(props.shop.id, newForm);
            
            if (result) {
                props.onFormsChange(prev => [...prev, result]);
                showToast(t('formDuplicated', { formName: formToDuplicate.name }), 'success');
                // Open the newly created form in the editor
                setSelectedFormId(result.id);
            } else {
                showToast('Failed to duplicate form', 'error');
            }
        } catch (error) {
            logger.error('Failed to duplicate form', error);
            showToast('Failed to duplicate form', 'error');
        }
    };

    const selectedForm = props.forms.find(f => f.id === selectedFormId);

    return (
        <>
            <div hidden={!!selectedFormId} className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col">
                <div className="flex justify-between items-center border-b border-gray-600 pb-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">{t('orderForms')}</h2>
                        <p className="text-sm text-gray-400">
                            {t('orderFormsDescription')}
                        </p>
                    </div>
                    <div className="relative group">
                        <button onClick={handleCreateForm} disabled={isLimitReached} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-semibold text-white disabled:bg-gray-600 disabled:cursor-not-allowed">
                            <PlusIcon className="w-4 h-4 mr-2" />
                            {t('addNewForm')}
                        </button>
                        {isLimitReached && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10">
                                {t('upgradeForMoreForms')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Online Sale Settings */}
                <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">{t('onlineSaleSettings')}</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <label htmlFor="online-form-select" className="block text-sm font-medium text-gray-300 mb-2">{t('defaultOnlineForm')}</label>
                        <select
                            id="online-form-select"
                            value={props.onlineSaleConfig?.defaultFormId || ''}
                            onChange={e => props.onOnlineSaleConfigChange({ defaultFormId: e.target.value || null })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white"
                            disabled={props.forms.length === 0}
                        >
                            <option value="">-- {t('noDefaultForm')} --</option>
                            {props.forms.map(form => (
                                <option key={form.id} value={form.id}>{form.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-2">{t('defaultOnlineFormHint')}</p>
                    </div>
                </section>
                
                 {/* Offline Sale Settings */}
                <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">{t('offlineSaleSettings')}</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <label htmlFor="offline-form-select" className="block text-sm font-medium text-gray-300 mb-2">{t('defaultOfflineForm')}</label>
                        <select
                            id="offline-form-select"
                            value={props.offlineSaleConfig?.defaultFormId || ''}
                            onChange={e => props.onOfflineSaleConfigChange({ defaultFormId: e.target.value || null })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white"
                            disabled={props.forms.length === 0}
                        >
                            <option value="">{t('sellerChooses')}</option>
                            {props.forms.map(form => (
                                <option key={form.id} value={form.id}>{form.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-2">{t('defaultOfflineFormHint')}</p>
                    </div>
                </section>

                <div className="flex-grow overflow-y-auto space-y-3 border-t border-gray-600 pt-6">
                     {props.forms.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            <p>{t('noFormsCreated')}</p>
                            <p>{t('noFormsHint')}</p>
                        </div>
                     ) : (
                        props.forms.map(form => (
                            <div key={form.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between hover:bg-gray-600/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <ClipboardListIcon className="w-6 h-6 text-blue-400" />
                                    <div>
                                        <p className="font-semibold text-white">{form.name}</p>
                                        <p className="text-xs text-gray-400">{form.fields.length} {t('fields')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSelectedFormId(form.id)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                                        <PencilIcon className="w-3 h-3"/>
                                        {t('edit')}
                                    </button>
                                    <button onClick={() => handleDuplicateForm(form.id)} disabled={isLimitReached} className="p-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed" title={t('duplicateForm')}>
                                        <DuplicateIcon className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => handleDeleteForm(form.id)} className="p-2 bg-red-600 hover:bg-red-700 rounded-md text-white" title={t('deleteForm')}>
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))
                     )}
                </div>
            </div>
            
            <div hidden={!selectedForm}>
                 <FormEditor 
                    form={selectedForm || null} 
                    onSave={handleSaveForm}
                    onCancel={() => setSelectedFormId(null)}
                    onDelete={handleDeleteForm}
                    items={props.items}
                    paymentMethods={props.paymentMethods}
                    onFormSubmit={props.onFormSubmit}
                    currency={shop.currency}
                />
            </div>
        </>
    );
};

export default FormManager;