import React, { useState, useEffect } from 'react';
import { FormField, FormFieldType, Form, Item, ShopPaymentMethod } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import DragHandleIcon from './icons/DragHandleIcon';
import PencilIcon from './icons/PencilIcon';
import XIcon from './icons/XIcon';
import PaymentSelectorConfigModal from './PaymentSelectorConfigModal';
import { useToast } from '../contexts/ToastContext';
import { sanitizeText } from '../utils/sanitize';

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

interface FormBuilderProps {
  form: Form;
  onFieldsChange: (fieldsUpdater: (prevFields: FormField[]) => FormField[]) => void;
  onFormNameChange: (name: string) => void;
  items: Item[];
  paymentMethods: ShopPaymentMethod[];
}

const FormBuilder: React.FC<FormBuilderProps> = ({ form, onFieldsChange, onFormNameChange, items, paymentMethods }) => {
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [itemSelectorFieldId, setItemSelectorFieldId] = useState<string | null>(null);
  const [paymentSelectorFieldId, setPaymentSelectorFieldId] = useState<string | null>(null);
  const { showToast } = useToast();

  const addField = (type: FormFieldType) => {
    if (type === FormFieldType.ITEM_SELECTOR && form.fields.some(f => f.type === FormFieldType.ITEM_SELECTOR)) {
        showToast("You can only add one Item Selector field to a form.", "error");
        return;
    }
    if (type === FormFieldType.PAYMENT_SELECTOR && form.fields.some(f => f.type === FormFieldType.PAYMENT_SELECTOR)) {
        showToast("You can only add one Payment Selector field to a form.", "error");
        return;
    }
      
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: type === FormFieldType.ITEM_SELECTOR ? 'Select Items' : (type === FormFieldType.PAYMENT_SELECTOR ? 'Choose Payment Method' : `New ${type} Field`),
      required: true,
      ...(type === FormFieldType.DROPDOWN && { options: ['Option 1', 'Option 2'] }),
      ...(type === FormFieldType.MULTIPLE_CHOICE && { options: ['Choice A', 'Choice B'] }),
      ...(type === FormFieldType.CHECKBOX && { options: ['I agree to the terms'] }),
      ...(type === FormFieldType.SHORT_TEXT && { placeholder: 'Enter text...' }),
      ...(type === FormFieldType.NUMBER && { placeholder: '123' }),
      ...(type === FormFieldType.TEXT_AREA && { placeholder: 'Enter a longer message...' }),
      ...(type === FormFieldType.EMAIL && { placeholder: 'name@example.com' }),
      ...(type === FormFieldType.PHONE && { placeholder: '09xxxxxxxxx' }),
      ...(type === FormFieldType.ITEM_SELECTOR && { itemIds: [] }),
      ...(type === FormFieldType.PAYMENT_SELECTOR && { paymentMethodIds: [] }),
    };
    onFieldsChange(prevFields => [...prevFields, newField]);
  };

  const updateField = (id: string, updatedProp: Partial<FormField>) => {
    // Sanitize text fields
    const sanitizedProp = { ...updatedProp };
    
    if (sanitizedProp.label && typeof sanitizedProp.label === 'string') {
      sanitizedProp.label = sanitizeText(sanitizedProp.label);
    }
    if (sanitizedProp.placeholder && typeof sanitizedProp.placeholder === 'string') {
      sanitizedProp.placeholder = sanitizeText(sanitizedProp.placeholder);
    }
    if (sanitizedProp.options && Array.isArray(sanitizedProp.options)) {
      sanitizedProp.options = sanitizedProp.options.map(opt => sanitizeText(opt));
    }
    
    onFieldsChange(prevFields =>
      prevFields.map((field) => (field.id === id ? { ...field, ...sanitizedProp } : field))
    );
  };

  const deleteField = (id: string) => {
    onFieldsChange(prevFields => prevFields.filter((field) => field.id !== id));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggingFieldId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetId: string) => {
    e.preventDefault();
    if (!draggingFieldId || draggingFieldId === dropTargetId) {
      setDraggingFieldId(null);
      return;
    };

    const draggedIndex = form.fields.findIndex(f => f.id === draggingFieldId);
    const targetIndex = form.fields.findIndex(f => f.id === dropTargetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reorder = (list: FormField[]) => {
        const result = Array.from(list);
        const [removed] = result.splice(draggedIndex, 1);
        result.splice(targetIndex, 0, removed);
        return result;
    }
    
    onFieldsChange(reorder);
    setDraggingFieldId(null);
  };

  const handleDragEnd = () => {
    setDraggingFieldId(null);
  };

  const handleSaveItemSelection = (selectedIds: string[]) => {
    if (itemSelectorFieldId) {
        updateField(itemSelectorFieldId, { itemIds: selectedIds });
    }
    setItemSelectorFieldId(null);
  };
  
  const handleSavePaymentSelection = (selectedIds: string[]) => {
    if (paymentSelectorFieldId) {
        updateField(paymentSelectorFieldId, { paymentMethodIds: selectedIds });
    }
    setPaymentSelectorFieldId(null);
  };
  
  const currentItemFieldForModal = form.fields.find(f => f.id === itemSelectorFieldId);
  const currentPaymentFieldForModal = form.fields.find(f => f.id === paymentSelectorFieldId);

  return (
    <>
      <div className="border-b border-gray-600 pb-4 mb-6 flex-shrink-0">
        <label htmlFor="form-name" className="text-sm text-gray-400">Order Form Name</label>
        <input 
            id="form-name"
            type="text"
            value={form.name}
            onChange={(e) => onFormNameChange(sanitizeText(e.target.value))}
            className="w-full bg-transparent text-xl font-bold text-white focus:outline-none"
            placeholder="Enter Order Form Name"
        />
      </div>

      <div className="space-y-4 flex-grow overflow-y-auto pr-2 min-h-0">
        {form.fields.length === 0 && (
            <div className="text-center text-gray-500 py-10">
                <p>This form has no fields yet.</p>
                <p>Click "Add a New Field" below to start.</p>
            </div>
        )}
        {form.fields.map((field) => (
          <div
            key={field.id}
            draggable
            onDragStart={(e) => handleDragStart(e, field.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, field.id)}
            onDragEnd={handleDragEnd}
            className={`bg-gray-700 p-4 rounded-lg border border-gray-600 cursor-grab transition-opacity ${draggingFieldId === field.id ? 'opacity-40' : 'opacity-100'}`}
          >
            <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-2">
                    <DragHandleIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-xs font-semibold text-blue-300 bg-blue-900/50 px-2 py-1 rounded">{field.type}</span>
                 </div>
                 <button onClick={() => deleteField(field.id)} className="text-gray-400 hover:text-red-500">
                     <TrashIcon className="w-4 h-4"/>
                 </button>
            </div>

            {field.type === FormFieldType.ITEM_SELECTOR || field.type === FormFieldType.PAYMENT_SELECTOR ? (
                 <div className="p-4 bg-gray-600/50 rounded-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-white">{field.label}</p>
                            <p className="text-sm text-gray-300">
                                {field.type === FormFieldType.ITEM_SELECTOR
                                    ? `${field.itemIds?.length ?? 0} of ${items.length} items selected.`
                                    : `${field.paymentMethodIds?.length ?? 0} of ${paymentMethods.length} payment methods selected.`
                                }
                            </p>
                        </div>
                        <button
                            onClick={() => field.type === FormFieldType.ITEM_SELECTOR ? setItemSelectorFieldId(field.id) : setPaymentSelectorFieldId(field.id)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                        >
                            <PencilIcon className="w-3 h-3" />
                            Configure
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="w-full bg-transparent text-white font-semibold focus:outline-none mb-2"
                    />
                    {(field.type === FormFieldType.DROPDOWN || field.type === FormFieldType.MULTIPLE_CHOICE || field.type === FormFieldType.CHECKBOX) && (
                        <textarea
                            value={field.options?.join('\n')}
                            onChange={e => updateField(field.id, {options: e.target.value.split('\n')})}
                            placeholder="Enter options, one per line"
                            className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-xs"
                            rows={3}
                        />
                    )}
                     {(field.type === FormFieldType.TEXT_AREA || field.type === FormFieldType.SHORT_TEXT || field.type === FormFieldType.NUMBER || field.type === FormFieldType.EMAIL || field.type === FormFieldType.PHONE) && (
                        <input
                            type="text"
                            value={field.placeholder}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="Set a placeholder..."
                            className="w-full bg-gray-600 border border-gray-500 rounded p-2 text-xs"
                        />
                    )}
                    <div className="mt-2">
                         <label className="flex items-center text-xs text-gray-300 cursor-pointer">
                             <input
                                 type="checkbox"
                                 checked={field.required}
                                 onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                 className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"
                             />
                             <span className="ml-2">Required</span>
                         </label>
                     </div>
                </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-gray-600 pt-4 flex-shrink-0">
        <h3 className="text-md font-semibold mb-3">Add a New Field</h3>
        <div className="grid grid-cols-3 gap-2">
            {Object.values(FormFieldType).map(type => (
                 <button key={type} onClick={() => addField(type as FormFieldType)} className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-xs text-center">
                    <PlusIcon className="w-4 h-4 mr-1 flex-shrink-0"/> <span className="truncate">{type}</span>
                 </button>
            ))}
        </div>
      </div>
      <ItemSelectorModal
            field={currentItemFieldForModal}
            onClose={() => setItemSelectorFieldId(null)}
            onSave={handleSaveItemSelection}
            allItems={items}
        />
       <PaymentSelectorConfigModal
            field={currentPaymentFieldForModal}
            onClose={() => setPaymentSelectorFieldId(null)}
            onSave={handleSavePaymentSelection}
            allMethods={paymentMethods}
        />
    </>
  );
};

export default FormBuilder;