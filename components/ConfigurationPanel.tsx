// FIX: import useMemo from react
import React, { useState, useRef, useEffect } from 'react';
import { ModelType, AssistantTone, AssistantConfig, Language, CustomQuickReply } from '../types';
import InfoIcon from './icons/InfoIcon';
import { useLocalization } from '../hooks/useLocalization';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import ToggleSwitch from './ToggleSwitch';
import { usePermissions } from '../hooks/usePermissions';
import ChevronDownIcon from './icons/ChevronDownIcon';
import { getPlatformSettings } from '../services/platformSettingsService';
import { allLanguages } from '../data/localizationData';

interface ConfigurationPanelProps {
  shopName: string;
  assistantConfig: AssistantConfig;
  onAssistantConfigChange: (config: AssistantConfig) => void;
  businessName: string;
  onBusinessNameChange: (name: string) => void;
  aiNickname: string;
  onAiNicknameChange: (name: string) => void;
  permissions: ReturnType<typeof usePermissions>;
}

const ASSISTANT_PERSONALITY_CHARACTER_LIMIT = 450;

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  shopName,
  assistantConfig,
  onAssistantConfigChange,
  businessName,
  onBusinessNameChange,
  aiNickname,
  onAiNicknameChange,
  permissions,
}) => {
  const { t } = useLocalization();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState(allLanguages);

  const { 
    selectedModel,
    systemPrompt, 
    language, 
    tone, 
    responseDelay, 
  } = assistantConfig;

  useEffect(() => {
    const loadSupportedLanguages = async () => {
      const platformSettings = await getPlatformSettings();
      const enabledCodes = new Set(platformSettings.localization.enabledLanguages);
      setSupportedLanguages(allLanguages.filter(lang => enabledCodes.has(lang.code)));
    };
    loadSupportedLanguages();
  }, []);
  
  // State for the autocomplete language input
  const [langInput, setLangInput] = useState('');
  const [showLangSuggestions, setShowLangSuggestions] = useState(false);
  const langSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set initial display name for the language input
    const langName = supportedLanguages.find(l => l.code === language)?.name || language;
    setLangInput(langName);
  }, [language, supportedLanguages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (langSuggestionsRef.current && !langSuggestionsRef.current.contains(event.target as Node)) {
            setShowLangSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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
  
  const handleGenericChange = (changeFn: (value: any) => void, value: any) => {
    triggerSaveStatus();
    changeFn(value);
  };

  const handleConfigChange = (newConfig: Partial<AssistantConfig>) => {
    triggerSaveStatus();
    onAssistantConfigChange({ ...assistantConfig, ...newConfig });
  };

  const handleLanguageSelect = (lang: { code: Language, name: string }) => {
    setLangInput(lang.name);
    handleConfigChange({ language: lang.code });
    setShowLangSuggestions(false);
  };
  
  const filteredLangSuggestions = supportedLanguages.filter(lang =>
    lang.name.toLowerCase().includes(langInput.toLowerCase())
  );

  const getModelButtonClass = (model: ModelType, disabled = false) => {
    let classes = `w-full text-left px-4 py-2 text-sm rounded-md transition-colors duration-200 relative`;
    if (disabled) {
        classes += ' bg-[#1D3B59] text-gray-500 cursor-not-allowed';
    } else if (selectedModel === model) {
        classes += ' bg-[#635BFF] text-white';
    } else {
        classes += ' bg-[#2c4f73] hover:bg-[#4a6b8c]';
    }
    return classes;
  };

  const getToneButtonClass = (selectedTone: AssistantTone) => {
    return `flex-1 text-center px-4 py-2 text-sm rounded-md transition-colors duration-200 ${
      tone === selectedTone
        ? 'bg-[#635BFF] text-white'
        : 'bg-[#2c4f73] hover:bg-[#4a6b8c]'
    }`;
  };

  const presets = {
    'From Training Data': `You are a helpful AI assistant for ${businessName || shopName}. Your primary role is to answer customer questions based *only* on the information provided in the training data. Do not invent answers. If the information is not in the training data, you must state that you do not have the information.`,
    'Formal': `You are a professional and formal customer service representative for ${businessName || shopName}. Address customers with respect and provide clear, concise information. Avoid using slang or overly casual language.`,
    'Friendly': `You are a friendly and approachable assistant for ${businessName || shopName}. Your tone should be warm and welcoming. Use emojis where appropriate to create a positive interaction.`,
    'Helpful': `You are a straightforward and helpful assistant for ${businessName || shopName}. Your primary goal is to provide accurate information and solve customer problems efficiently.`,
    'Fun': `You are a fun and witty assistant for ${businessName || shopName}. Your responses should be playful and engaging, using humor and clever wordplay to entertain the customer while still being helpful.`,
    'Customer Assistant': `You are a dedicated customer assistant for ${businessName || shopName}. You are patient, empathetic, and focused on resolving customer issues and ensuring a positive experience. Your tone should be supportive and professional.`,
    'Mimic User': `Analyze the user's writing style, tone, and level of formality in their message. Your response must mirror this style closely. For example, if the user is very casual, your response should be similar. If they are formal, you must respond formally. While mimicking their tone, you must still act as a helpful assistant for ${businessName || shopName}.`
  };

  return (
    <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full flex flex-col overflow-y-auto">
       <div className="flex-shrink-0 flex items-center justify-between border-b border-[#2c4f73] pb-4 mb-6">
            <h2 className="text-xl font-bold text-[#F6F9FC]">
                {t('aiAssistantSetup')}
            </h2>
            <div className="flex items-center gap-2 text-sm transition-opacity duration-300">
                {saveStatus === 'saving' && <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div><span className="text-gray-400">{t('saving')}</span></>}
                {saveStatus === 'saved' && <><CheckCircleIcon className="w-5 h-5 text-green-400" /><span className="text-green-400">{t('saved')}</span></>}
            </div>
        </div>

      {/* Business Name & AI Nickname */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                <label htmlFor="business-name" className="text-base font-semibold mb-2 text-gray-200 block">{t('businessName')}</label>
                <input
                    id="business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => handleGenericChange(onBusinessNameChange, e.target.value)}
                    maxLength={20}
                    className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-3 text-sm text-[#F6F9FC] placeholder-gray-400 focus:ring-2 focus:ring-[#635BFF] focus:outline-none"
                />
                <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-400">{t('businessNameDescription')}</p>
                    <p className="text-xs text-gray-400">{businessName.length} / 20</p>
                </div>
            </div>
            <div>
                <label htmlFor="ai-nickname" className="text-base font-semibold mb-2 text-gray-200 block">{t('assistantNickname')}</label>
                <input
                    id="ai-nickname"
                    type="text"
                    value={aiNickname}
                    onChange={(e) => handleGenericChange(onAiNicknameChange, e.target.value)}
                    maxLength={20}
                    className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-3 text-sm text-[#F6F9FC] placeholder-gray-400 focus:ring-2 focus:ring-[#635BFF] focus:outline-none"
                />
                 <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-400">{t('assistantNicknameDescription')}</p>
                    <p className="text-xs text-gray-400">{aiNickname.length} / 20</p>
                </div>
            </div>
        </div>

      {/* Language Preference */}
       <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
             <h3 className="text-base font-semibold text-gray-200">{t('languagePreference')}</h3>
        </div>
        <div className="relative" ref={langSuggestionsRef}>
            <input
                type="text"
                value={langInput}
                onChange={e => setLangInput(e.target.value)}
                onFocus={() => setShowLangSuggestions(true)}
                placeholder="e.g., English, Burmese"
                className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-3 text-sm text-[#F6F9FC] placeholder-gray-400 focus:ring-2 focus:ring-[#635BFF] focus:outline-none"
            />
            {showLangSuggestions && filteredLangSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {filteredLangSuggestions.map(lang => (
                        <button
                            key={lang.code}
                            onMouseDown={() => handleLanguageSelect(lang)} // onMouseDown to fire before onBlur
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-600"
                        >
                            {lang.name} <span className="text-gray-400">({lang.code})</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
        <p className="text-xs text-gray-400 mt-2">The primary language for your assistant. It will also respond in English if the customer uses English.</p>
      </div>
      
      {/* Tone Selection */}
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-3 text-gray-200">{t('responseTone')}</h3>
        <div className="flex space-x-2 bg-[#0A2540]/50 p-1 rounded-lg">
          <button onClick={() => handleConfigChange({ tone: 'male'})} className={getToneButtonClass('male')}>{t('male')}</button>
          <button onClick={() => handleConfigChange({ tone: 'female'})} className={getToneButtonClass('female')}>{t('female')}</button>
          <button onClick={() => handleConfigChange({ tone: 'neutral'})} className={getToneButtonClass('neutral')}>{t('neutral')}</button>
        </div>
      </div>

      {/* Model Selection */}
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-3 text-gray-200">{t('responseMode')}</h3>
        <div className="space-y-2">
            <div>
                <button onClick={() => handleConfigChange({ selectedModel: ModelType.FAST})} className={getModelButtonClass(ModelType.FAST)}>
                    <strong className="block">{t('fast')}</strong>
                    <span className="text-xs text-gray-300">{t('fastDescription')}</span>
                </button>
            </div>
            <div>
                <button onClick={() => handleConfigChange({ selectedModel: ModelType.STANDARD})} className={getModelButtonClass(ModelType.STANDARD)}>
                    <strong className="block">{t('standard')}</strong>
                    <span className="text-xs text-gray-300">{t('standardDescription')}</span>
                </button>
            </div>
            <div className="relative group">
                <button 
                    onClick={() => permissions.can('deepThinking') && handleConfigChange({ selectedModel: ModelType.THINKING})} 
                    className={getModelButtonClass(ModelType.THINKING, !permissions.can('deepThinking'))}
                    disabled={!permissions.can('deepThinking')}
                >
                    <strong className="block">{t('deepThinking')}</strong>
                    <span className="text-xs text-gray-400">{t('deepThinkingDescription')}</span>
                     {!permissions.can('deepThinking') && (
                        <span className="absolute top-1 right-1 text-xs bg-yellow-500 text-yellow-900 font-bold px-2 py-0.5 rounded-full">{t('pro')}</span>
                    )}
                </button>
                 {!permissions.can('deepThinking') && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10">
                        {t('upgradeToPro')}
                    </div>
                )}
            </div>
        </div>
      </div>

       {/* Response Delay */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-semibold text-gray-200">{t('responseDelay')}</h3>
            <span className="text-sm font-mono text-gray-300 bg-[#0A2540]/50 px-2 py-1 rounded">{responseDelay.toFixed(1)}s</span>
        </div>
        <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={responseDelay}
            onChange={(e) => handleConfigChange({ responseDelay: parseFloat(e.target.value)})}
            className="w-full h-2 bg-[#2c4f73] rounded-lg appearance-none cursor-pointer accent-[#635BFF]"
        />
         <p className="text-xs text-gray-400 mt-2">{t('responseDelayDescription')}</p>
      </div>

      {/* System Prompt */}
      <div className="flex-grow flex flex-col">
        <div className="flex items-center gap-2 mb-3">
            <label htmlFor="system-prompt-textarea" className="text-base font-semibold text-gray-200">{t('assistantPersonality')}</label>
            <div className="relative group flex items-center">
                <InfoIcon className="w-4 h-4 text-gray-400 cursor-help" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs text-center text-white bg-gray-900 border border-gray-600 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    {t('assistantPersonalityInfo')}
                </span>
            </div>
        </div>
        <div className="mb-3">
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(presets).map(([name, prompt]) => (
                    <button
                        key={name}
                        onClick={() => handleConfigChange({ systemPrompt: prompt})}
                        className="px-3 py-1.5 text-xs bg-[#2c4f73] hover:bg-[#4a6b8c] rounded-md transition-colors"
                    >
                        {name}
                    </button>
                ))}
            </div>
        </div>
        <textarea
          id="system-prompt-textarea"
          value={systemPrompt}
          onChange={(e) => handleConfigChange({ systemPrompt: e.target.value})}
          placeholder={t('assistantPersonalityPlaceholder')}
          className="flex-grow w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-3 text-sm text-[#F6F9FC] placeholder-gray-400 focus:ring-2 focus:ring-[#635BFF] focus:outline-none transition-shadow"
          rows={6}
          maxLength={ASSISTANT_PERSONALITY_CHARACTER_LIMIT}
        />
        <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-400">{t('assistantPersonalityBehavior')}</p>
            <p className="text-xs text-gray-400">{systemPrompt.length} / {ASSISTANT_PERSONALITY_CHARACTER_LIMIT}</p>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;