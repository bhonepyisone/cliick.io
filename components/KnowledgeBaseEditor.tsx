import React, { useState, useRef, useMemo } from 'react';
import { KnowledgeBase, KnowledgeSection, PhysicalLocation } from '../types';
import BotIcon from './icons/BotIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { useLocalization } from '../hooks/useLocalization';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import StoreIcon from './icons/StoreIcon';
import PencilIcon from './icons/PencilIcon';
import UploadIcon from './icons/UploadIcon';
import XIcon from './icons/XIcon';
import { sanitizeText, sanitizeHtml, validatePhone, validateLength } from '../utils/sanitize';
import { rateLimiter, RATE_LIMITS } from '../utils/rateLimiter';

const CHARACTER_LIMIT = 450;
const LOCATION_DESCRIPTION_LIMIT = 250;

// --- Location Editor Modal ---
const LocationEditorModal: React.FC<{
    location: Partial<PhysicalLocation> | null;
    onSave: (location: PhysicalLocation) => void;
    onClose: () => void;
}> = ({ location, onSave, onClose }) => {
    const { t } = useLocalization();
    const [name, setName] = useState(location?.name || '');
    const [addressLine1, setAddressLine1] = useState(location?.addressLine1 || '');
    const [city, setCity] = useState(location?.city || '');
    const [stateRegion, setStateRegion] = useState(location?.stateRegion || '');
    const [postalCode, setPostalCode] = useState(location?.postalCode || '');
    const [phone, setPhone] = useState(location?.phone || '');
    const [operatingHours, setOperatingHours] = useState(location?.operatingHours || '');
    const [notes, setNotes] = useState(location?.notes || '');


    const handleSave = () => {
        if (!name.trim() || !addressLine1.trim() || !city.trim() || !stateRegion.trim()) {
            alert('Name, Address, City, and Region are required.');
            return;
        }
        
        // Validate phone if provided
        if (phone.trim()) {
            const phoneValidation = validatePhone(phone);
            if (!phoneValidation.valid) {
                alert(phoneValidation.error || 'Invalid phone number');
                return;
            }
        }
        
        // Sanitize all inputs
        onSave({
            id: location?.id || `loc_${Date.now()}`,
            name: sanitizeText(name),
            addressLine1: sanitizeText(addressLine1),
            city: sanitizeText(city),
            stateRegion: sanitizeText(stateRegion),
            postalCode: sanitizeText(postalCode),
            phone: sanitizeText(phone),
            operatingHours: sanitizeText(operatingHours),
            notes: sanitizeText(notes),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{location?.id ? t('editLocation') : t('addLocation')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('locationName')}*</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('addressLine1')}*</label>
                        <textarea value={addressLine1} onChange={e => setAddressLine1(e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">{t('city')}*</label>
                            <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                        </div>
                         <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">{t('stateRegion')}*</label>
                            <input type="text" value={stateRegion} onChange={e => setStateRegion(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">{t('postalCode')}</label>
                            <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-1">{t('phoneOptional')}</label>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('operatingHoursOptional')}</label>
                        <input type="text" value={operatingHours} onChange={e => setOperatingHours(e.target.value)} placeholder="e.g., 9 AM - 5 PM, Mon-Sat" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300 block mb-1">{t('notesOptional')}</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white" />
                    </div>
                </div>
                <footer className="p-4 bg-gray-900/50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold">{t('save')}</button>
                </footer>
            </div>
        </div>
    );
};

interface LocationUploadModalProps {
    onClose: () => void;
    onImport: (locations: PhysicalLocation[]) => void;
}

const LocationUploadModal: React.FC<LocationUploadModalProps> = ({ onClose, onImport }) => {
    const { t } = useLocalization();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<{ valid: PhysicalLocation[], errors: { row: number, message: string }[] } | null>(null);
    
    const requiredHeaders = useMemo(() => ['name', 'addressLine1', 'city', 'stateRegion'], []);
    const optionalHeaders = useMemo(() => ['postalCode', 'phone', 'operatingHours', 'notes'], []);
    const allHeaders = useMemo(() => [...requiredHeaders, ...optionalHeaders], [requiredHeaders, optionalHeaders]);

    const handleDownloadTemplate = () => {
        const headerString = allHeaders.join(',');
        const exampleRow = "Example Branch,No. 123, Main Street,Yangon,Yangon Region,11011,09123456789,9 AM - 9 PM,Near City Hall";
        const csvContent = "data:text/csv;charset=utf-8," + headerString + "\n" + exampleRow;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "location_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);
            processFile(uploadedFile);
        }
    };

    const processFile = (fileToProcess: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 1) {
                // Handle empty file
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const validRows: PhysicalLocation[] = [];
            const errorRows: { row: number, message: string }[] = [];
            
            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(',');
                const rowNumber = i + 1;
                const rowData: any = {};
                let hasError = false;

                headers.forEach((header, index) => {
                    rowData[header] = data[index] ? data[index].trim() : '';
                });

                for (const req of requiredHeaders) {
                    if (!rowData[req]) {
                        errorRows.push({ row: rowNumber, message: t('errorMissingRequired', { field: req }) });
                        hasError = true;
                        break; 
                    }
                }

                if (!hasError) {
                    validRows.push({
                        id: `loc_import_${Date.now()}_${i}`,
                        name: rowData.name,
                        addressLine1: rowData.addressLine1,
                        city: rowData.city,
                        stateRegion: rowData.stateRegion,
                        postalCode: rowData.postalCode,
                        phone: rowData.phone,
                        operatingHours: rowData.operatingHours,
                        notes: rowData.notes,
                    });
                }
            }
            setPreview({ valid: validRows, errors: errorRows });
        };
        reader.readAsText(fileToProcess);
    };

    const handleImportClick = () => {
        if (preview && preview.valid.length > 0) {
            onImport(preview.valid);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{t('importModalTitle')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="p-6 space-y-4 overflow-y-auto">
                    {!preview ? (
                        <>
                            <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                                <p className="text-sm text-blue-200">{t('batchProductImportDesc')}</p>
                                <button onClick={handleDownloadTemplate} className="mt-2 text-sm font-semibold text-blue-300 hover:underline">{t('downloadCSVTemplate')}</button>
                            </div>
                            <div>
                                <label className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700/50">
                                    <UploadIcon className="w-8 h-8 text-gray-400 mb-2"/>
                                    <span className="text-sm text-gray-300">{t('dragAndDropCSV')}</span>
                                    <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                                </label>
                            </div>
                        </>
                    ) : (
                        <div>
                            <h4 className="font-semibold text-gray-200 mb-3">{t('csvValidationPreview')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                    <h5 className="text-md font-bold text-green-400 mb-2">{t('validRowsFound', { count: preview.valid.length.toString() })}</h5>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {preview.valid.map(loc => (
                                            <div key={loc.id} className="text-xs p-2 bg-gray-700 rounded">
                                                <p className="font-semibold">{loc.name}</p>
                                                <p className="text-gray-400">{loc.addressLine1}, {loc.city}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                    <h5 className="text-md font-bold text-red-400 mb-2">{t('errorRowsFound', { count: preview.errors.length.toString() })}</h5>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {preview.errors.map((err, i) => (
                                            <div key={i} className="text-xs p-2 bg-red-900/20 border border-red-700/50 rounded">
                                                <p className="font-semibold">{t('rowN', { row: err.row.toString() })}: <span className="font-normal">{err.message}</span></p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 <footer className="p-4 bg-gray-900/50 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">{t('cancel')}</button>
                    {preview && <button onClick={handleImportClick} disabled={preview.valid.length === 0} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed">{t('importNLocations', { count: preview.valid.length.toString() })}</button>}
                </footer>
            </div>
        </div>
    );
};


interface KnowledgeBaseEditorProps {
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseChange: (userDefinedKb: KnowledgeSection[]) => void;
  permissions: ReturnType<typeof usePermissions>;
  showConfirmation: (config: { title: string, message: string, onConfirm: () => void, confirmText?: string }) => void;
}

export const KnowledgeBaseEditor: React.FC<KnowledgeBaseEditorProps> = ({ knowledgeBase, onKnowledgeBaseChange, permissions, showConfirmation }) => {
  const { t } = useLocalization();
  const { showToast } = useToast();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editingLocation, setEditingLocation] = useState<{ sectionId: string; location: Partial<PhysicalLocation> | null } | null>(null);
  const [uploadingForSectionId, setUploadingForSectionId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
    
  const userDefinedSections = knowledgeBase.userDefined.filter(section => section.title !== 'Business Name' && section.title !== 'AI Persona & Name');

  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(
    new Set(userDefinedSections.length > 0 ? [userDefinedSections[0].id] : [])
  );

  const sectionLimit = permissions.getLimit('trainingSectionCount');
  const sectionsUsed = userDefinedSections.length;
  const isLimitReached = sectionLimit !== null && sectionsUsed >= sectionLimit;

  const presets = {
    'Business Profile': 'We are a [type of business, e.g., small online shop] based in [Your City, e.g., Yangon], specializing in [your products, e.g., high-quality, handcrafted home goods]. Our mission is to [your mission, e.g., bring warmth and comfort into every home].',
    'FAQs': 'Q: What are your shipping options?\nA: We ship nationwide via [Courier Service].\n\nQ: What is your return policy?\nA: We accept returns within [Number] days for defective items.',
    'Shop Policies': 'Return Policy: We offer a [Number]-day exchange for any items that arrive damaged or defective. Please contact us with a photo of the issue. We do not offer refunds for change of mind.\n\nPrivacy Policy: [Your Privacy Policy Details]',
    'Delivery Info': 'We deliver nationwide via [Your Courier Service, e.g., Royal Express].\n- Inside [Your City]: [Number] working days (Fee: [Amount] MMK)\n- Outside [Your City]: [Number] working days (Fee: [Amount] MMK)\n- Free shipping is available for orders over [Amount] MMK.',
    'Contact Info': 'Support Phone: [Your Phone Number]\nEmail: [Your Email Address]\nOperating Hours: [e.g., 9 AM - 7 PM, Monday to Saturday]',
    'Physical Stores': 'Add a list of your physical store locations, like showrooms or service centers.',
    'Order Cancellation Process': 'You can cancel your order if it has not yet been shipped. Please use the "Manage Order" option in the chat menu or contact our support team at [Your Phone Number] with your Order ID. Please note our cancellation policy: [Your Cancellation Policy Details].',
    'Custom Section': 'Add content for any other topic.'
  };
  
  const existingTitles = new Set(userDefinedSections.map(sec => sec.title));
  
  const triggerSaveStatus = () => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      setSaveStatus('saved');
      idleTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 750);
  };
  
  const handleKbChange = (updatedSections: KnowledgeSection[]) => {
    triggerSaveStatus();
    onKnowledgeBaseChange(updatedSections);
  };

  const handleToggleSection = (id: string) => {
    setOpenSectionIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };

  const handleSectionChange = (id: string, field: 'title' | 'content' | 'includeInQuickReplies' | 'locations', value: any) => {
    // Rate limiting for KB updates
    const rateLimitKey = `kb:update:${id}`;
    const rateLimit = rateLimiter.check(rateLimitKey, RATE_LIMITS.KB_UPDATE);
    
    if (!rateLimit.allowed) {
      // Silently ignore if rate limited (auto-save scenario)
      return;
    }
    
    // Sanitize text inputs
    let sanitizedValue = value;
    
    if (field === 'title' && typeof value === 'string') {
      sanitizedValue = sanitizeText(value);
    } else if (field === 'content' && typeof value === 'string') {
      // Allow basic HTML formatting for content
      sanitizedValue = sanitizeHtml(value);
    }
    
    const updatedSections = knowledgeBase.userDefined.map(sec => 
      (sec.id === id ? { ...sec, [field]: sanitizedValue } : sec)
    );
    handleKbChange(updatedSections);
  };
  
  const handleAddSection = (title: string, contentPlaceholder: string) => {
    if (isLimitReached) {
        showToast(t('sectionLimitReached', { sectionLimit: sectionLimit.toString() }) + `\n` + t('upgradeForMoreSections'), 'error');
        return;
    }
    const isLocationList = title === 'Physical Stores';

    const newSection: KnowledgeSection = {
        id: `kb_custom_${Date.now()}`,
        title: isLocationList ? t('physicalStores') : (title === 'Custom Section' ? 'New Custom Section' : title),
        content: isLocationList ? 'These are our official store locations.' : (title === 'Custom Section' ? '' : contentPlaceholder),
        isCustom: true,
        includeInQuickReplies: true,
        type: isLocationList ? 'location_list' : 'text',
        locations: isLocationList ? [] : undefined,
    };
    
    const updatedSections = [...knowledgeBase.userDefined, newSection];
        
    handleKbChange(updatedSections);
    setOpenSectionIds(prev => new Set(prev).add(newSection.id));
  };


  const handleDeleteSection = (id: string) => {
    const sectionTitle = knowledgeBase.userDefined.find(sec => sec.id === id)?.title || 'this section';
    showConfirmation({
        title: t('deleteSection'),
        message: t('areYouSureDeleteSection', { sectionTitle }),
        confirmText: t('delete'),
        onConfirm: () => {
            const updatedSections = knowledgeBase.userDefined.filter(sec => sec.id !== id);
            handleKbChange(updatedSections);
        }
    });
  };
  
   const handleSaveLocation = (sectionId: string, location: PhysicalLocation) => {
        const section = knowledgeBase.userDefined.find(sec => sec.id === sectionId);
        if (!section) return;

        const isNew = !section.locations?.some(l => l.id === location.id);
        const updatedLocations = isNew
            ? [...(section.locations || []), location]
            : (section.locations || []).map(l => l.id === location.id ? location : l);

        handleSectionChange(sectionId, 'locations', updatedLocations);
        setEditingLocation(null);
    };

    const handleDeleteLocation = (sectionId: string, locationId: string) => {
        const section = knowledgeBase.userDefined.find(sec => sec.id === sectionId);
        if (!section) return;
        const updatedLocations = (section.locations || []).filter(l => l.id !== locationId);
        handleSectionChange(sectionId, 'locations', updatedLocations);
    };

    const handleImportLocations = (sectionId: string, newLocations: PhysicalLocation[]) => {
        const section = knowledgeBase.userDefined.find(sec => sec.id === sectionId);
        if (!section) return;

        const updatedLocations = [...(section.locations || []), ...newLocations];
        handleSectionChange(sectionId, 'locations', updatedLocations);
        setUploadingForSectionId(null);
    }

  return (
    <>
     {editingLocation && (
            <LocationEditorModal
                location={editingLocation.location}
                onClose={() => setEditingLocation(null)}
                onSave={(loc) => handleSaveLocation(editingLocation.sectionId, loc)}
            />
        )}
    {uploadingForSectionId && (
        <LocationUploadModal
            onClose={() => setUploadingForSectionId(null)}
            onImport={(locs) => handleImportLocations(uploadingForSectionId, locs)}
        />
    )}
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col">
       <div className="flex items-center justify-between border-b border-gray-600 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{t('trainAi')}</h2>
          <p className="text-sm text-gray-400">{t('trainAiDescription')}</p>
          <p className="text-sm text-gray-400 mt-2">
            {t('knowledgeSections')}: <span className="font-semibold text-white">{sectionsUsed} / {sectionLimit === null ? 'Unlimited' : sectionLimit}</span>
          </p>
        </div>
         <div className="flex items-center gap-2 text-sm transition-opacity duration-300">
            {saveStatus === 'saving' && <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div><span className="text-gray-400">{t('saving')}</span></>}
            {saveStatus === 'saved' && <><CheckCircleIcon className="w-5 h-5 text-green-400" /><span className="text-green-400">{t('saved')}</span></>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow min-h-0">
        {/* User-Editable Section */}
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto pr-2 space-y-3 min-h-0">
              {userDefinedSections.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                    <p>{t('noTrainingSections')}</p>
                    <p>{t('clickAddNewSection')}</p>
                </div>
              )}
              {userDefinedSections.map(section => {
                const isTitleEditable = section.isTitleEditable !== false;
                const isDeletable = section.isDeletable !== false;
                const sectionType = section.type || 'text';

                return (
                <div key={section.id} className="bg-gray-700 rounded-lg border border-gray-600">
                  <div className="w-full flex items-center justify-between p-3 text-left">
                    <div className="flex-grow flex items-center gap-2 mr-2">
                        {sectionType === 'location_list' && <StoreIcon className="w-5 h-5 text-blue-300 flex-shrink-0" />}
                      <input 
                        type="text"
                        value={section.title}
                        readOnly={!isTitleEditable}
                        onChange={e => handleSectionChange(section.id, 'title', e.target.value)}
                        className={`w-full bg-transparent font-semibold text-white focus:outline-none rounded px-1 -mx-1 ${isTitleEditable ? 'focus:ring-1 focus:ring-blue-500' : 'cursor-default'}`}
                        placeholder={t('sectionTitle')}
                        maxLength={20}
                      />
                      <span className="text-xs text-gray-400 pl-2 flex-shrink-0">{section.title.length}/20</span>
                    </div>
                    <div className="flex items-center pl-2">
                        {isDeletable && (
                            <button 
                                onClick={() => handleDeleteSection(section.id)} 
                                className="p-1 text-gray-400 hover:text-red-500 mr-2"
                                title={t('deleteSection')}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={() => handleToggleSection(section.id)} className="p-1">
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSectionIds.has(section.id) ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                  </div>
                  {openSectionIds.has(section.id) && (
                    <div className="p-4 border-t border-gray-600">
                      {sectionType === 'text' ? (
                         <>
                            <textarea
                                value={section.content}
                                onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
                                placeholder={`Add details for "${section.title}"...`}
                                className="w-full bg-gray-600 border border-gray-500 rounded-lg p-3 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                                rows={8}
                                maxLength={CHARACTER_LIMIT}
                            />
                            <div className="flex justify-between items-center mt-2">
                                <label className="flex items-center text-xs text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={section.includeInQuickReplies !== false}
                                        onChange={(e) => handleSectionChange(section.id, 'includeInQuickReplies', e.target.checked)}
                                        className="h-4 w-4 rounded bg-gray-600 border border-gray-500 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="ml-2">Show as Quick Reply</span>
                                </label>
                                <p className="text-right text-xs text-gray-400">
                                    {section.content.length} / {CHARACTER_LIMIT}
                                </p>
                            </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-200 mb-1">{t('contextDescription')}</label>
                                <textarea
                                    value={section.content}
                                    onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
                                    placeholder={t('contextDescriptionHint')}
                                    className="w-full bg-gray-600 border border-gray-500 rounded-lg p-3 text-sm text-white placeholder-gray-400"
                                    rows={3}
                                    maxLength={LOCATION_DESCRIPTION_LIMIT}
                                />
                                <p className="text-right text-xs text-gray-400 mt-1">{section.content.length} / {LOCATION_DESCRIPTION_LIMIT}</p>
                            </div>
                            <div className="border-t border-gray-600 pt-3">
                                <label className="flex items-center text-xs text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={section.includeInQuickReplies !== false}
                                        onChange={(e) => handleSectionChange(section.id, 'includeInQuickReplies', e.target.checked)}
                                        className="h-4 w-4 rounded bg-gray-600 border border-gray-500 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="ml-2">Show as Quick Reply button</span>
                                </label>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-200 mb-2">{t('manageLocations')}</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {(section.locations || []).map(loc => (
                                        <div key={loc.id} className="bg-gray-600/50 p-2 rounded-md flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-sm text-white">{loc.name}</p>
                                                <p className="text-xs text-gray-400">{loc.addressLine1}, {loc.city}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setEditingLocation({ sectionId: section.id, location: loc })} className="p-1 text-gray-300 hover:text-white"><PencilIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteLocation(section.id, loc.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!section.locations || section.locations.length === 0) && <p className="text-xs text-gray-500 text-center py-2">{t('noLocationsAdded')}</p>}
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => setEditingLocation({ sectionId: section.id, location: null })} className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-xs rounded-md">
                                        <PlusIcon className="w-4 h-4"/> {t('addLocationManually')}
                                    </button>
                                    <button onClick={() => setUploadingForSectionId(section.id)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-600 hover:bg-gray-500 text-xs rounded-md">
                                        <UploadIcon className="w-4 h-4"/> {t('uploadFromCSV')}
                                    </button>
                                </div>
                            </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
            <div className="mt-6 border-t border-gray-600 pt-4 flex-shrink-0 relative group">
                <h3 className="text-md font-semibold mb-3">Add a New Section</h3>
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(presets)
                        .filter(([title]) => title === 'Custom Section' || title === 'Physical Stores' || !existingTitles.has(title))
                        .map(([title, placeholder]) => (
                        <button 
                            key={title} 
                            onClick={() => handleAddSection(title, placeholder)} 
                            className="flex items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                            title={title === 'Custom Section' ? 'Add a blank section with your own title' : `Add a pre-defined section for ${title}`}
                            disabled={isLimitReached}
                        >
                            {title === 'Physical Stores' ? <StoreIcon className="w-4 h-4 mr-2"/> : <PlusIcon className="w-4 h-4 mr-2"/>}
                            {title}
                        </button>
                    ))}
                </div>
                 {isLimitReached && (
                    <div className="absolute inset-0 bg-gray-800/60 flex items-center justify-center rounded-lg cursor-not-allowed -bottom-4 -left-4 -right-4 -top-4">
                        <span className="text-sm font-semibold text-white bg-black/50 px-4 py-2 rounded-md text-center">
                            Section limit reached for your plan.
                            {!permissions.can('deepThinking') && <span className="block text-xs font-normal mt-1">Upgrade to a Pro plan to add more.</span>}
                        </span>
                    </div>
                )}
            </div>
        </div>

        {/* Auto-Generated Section */}
        <div className="flex flex-col h-full overflow-hidden">
             <div className="bg-gray-900/50 p-4 rounded-lg mb-4 flex items-start gap-3 border border-gray-700 flex-shrink-0">
                <BotIcon className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-gray-200">{t('autoGeneratedItemData')}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                       {t('autoGeneratedItemDescription')}
                    </p>
                </div>
            </div>
            <div className="flex-grow w-full bg-gray-700/50 border border-gray-600 rounded-lg p-4 text-sm text-gray-300 overflow-y-auto min-h-0">
                <pre className="whitespace-pre-wrap font-sans text-xs">{knowledgeBase.productData || t('noProductData')}</pre>
            </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default KnowledgeBaseEditor;