import React, { useState, useEffect } from 'react';
import { Form, FormField, Item, FormSubmission, ShopPaymentMethod } from '../types';
import FormBuilder from './FormBuilder';
import FormPreview from './FormPreview';
import TrashIcon from './icons/TrashIcon';
import { useToast } from '../contexts/ToastContext';
import { useLocalization } from '../hooks/useLocalization';

interface FormEditorProps {
    form: Form | null;
    onSave: (form: Form) => void;
    onCancel: () => void;
    onDelete: (formId: string) => void;
    items: Item[];
    paymentMethods: ShopPaymentMethod[];
    onFormSubmit: (submission: FormSubmission) => void; // for preview
    currency: string;
}

const FormEditor: React.FC<FormEditorProps> = ({ form, onSave, onCancel, onDelete, items, paymentMethods, onFormSubmit, currency }) => {
    const { showToast } = useToast();
    const { t } = useLocalization();
    const [editableForm, setEditableForm] = useState<Form | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (form) {
            setEditableForm(JSON.parse(JSON.stringify(form))); // Deep copy
        } else {
            setEditableForm(null);
        }
    }, [form]);

    const handleFieldsChange = (updater: (prevFields: FormField[]) => FormField[]) => {
        setEditableForm(prev => prev ? ({...prev, fields: updater(prev.fields)}) : null);
    };
    
    const handleNameChange = (name: string) => {
        setEditableForm(prev => prev ? ({...prev, name}) : null);
    };

    const handleSave = () => {
        if (!editableForm) return;
        setIsSaving(true);
        // Simulate save delay for UX
        setTimeout(() => {
            onSave(editableForm);
            setIsSaving(false);
        }, 500);
    };
    
    const handleDelete = () => {
        if (editableForm) {
            onDelete(editableForm.id);
        }
    };
    
    const handlePreviewSubmit = (submission: FormSubmission) => {
        showToast(t('previewSubmissionInfo'), 'info');
    }
    
    if (!editableForm) {
        return null;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                {/* Builder Column */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
                    <h2 className="text-xl font-bold text-white mb-4 flex-shrink-0">Form Builder</h2>
                    <FormBuilder 
                        form={editableForm}
                        onFieldsChange={handleFieldsChange}
                        onFormNameChange={handleNameChange}
                        items={items}
                        paymentMethods={paymentMethods}
                    />
                </div>

                {/* Preview Column */}
                <div className="bg-gray-800 p-0 rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
                    <div className="p-6 pb-4 flex-shrink-0 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Live Preview</h2>
                        <p className="text-sm text-gray-400">This is how the form will look to customers.</p>
                    </div>
                    <div className="flex-grow overflow-hidden">
                         <FormPreview 
                            form={editableForm}
                            items={items}
                            paymentMethods={paymentMethods}
                            onFormSubmit={handlePreviewSubmit}
                            currency={currency}
                        />
                    </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-6 border-t border-gray-700 pt-4 flex items-center justify-between flex-shrink-0">
                 <button onClick={handleDelete} className="text-red-400 hover:text-red-300 flex items-center gap-2">
                    <TrashIcon className="w-5 h-5"/> Delete Form
                </button>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold" disabled={isSaving}>Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-wait" disabled={isSaving}>
                        {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {isSaving ? 'Saving...' : 'Save Form'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormEditor;