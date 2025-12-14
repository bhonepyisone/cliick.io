import React, { useState, useMemo } from 'react';
import { Shop, CustomQuickReply } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import ToggleSwitch from './ToggleSwitch';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface ButtonEditorPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    onNavigate: (tab: any, subTab?: any) => void;
}

const SystemButtonEditor: React.FC<{
    title: string;
    description: string;
    config: CustomQuickReply;
    onUpdate: (newConfig: CustomQuickReply) => void;
    children?: React.ReactNode;
}> = ({ title, description, config, onUpdate, children }) => {
    const { t } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700">
             <div className="flex justify-between items-center p-4">
                 <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 flex-grow text-left">
                    <div className="flex-grow">
                        <h4 className="font-semibold text-white">{title}</h4>
                        <p className="text-xs text-gray-400">{description}</p>
                    </div>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="text-xs text-gray-300">{t('enabled')}</span>
                    <ToggleSwitch
                        enabled={config.enabled}
                        onChange={(isEnabled) => onUpdate({ ...config, enabled: isEnabled })}
                    />
                    <button onClick={() => setIsOpen(!isOpen)} className="p-1">
                        <ChevronDownIcon className={`w-5 h-5 transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>
            
            {isOpen && (
                <div className={`border-t border-gray-700 p-4 space-y-3 animate-fade-in-fast ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <style>{`
                        @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
                    `}</style>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">{t('buttonText')}</label>
                        <input
                            type="text"
                            value={config.title}
                            onChange={(e) => onUpdate({ ...config, title: e.target.value })}
                            maxLength={20}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1 text-right">{config.title.length} / 20</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">{t('replyMessage')}</label>
                        <textarea
                            value={config.reply}
                            onChange={(e) => onUpdate({ ...config, reply: e.target.value })}
                            maxLength={450}
                            rows={3}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                        />
                         <p className="text-xs text-gray-500 mt-1 text-right">{config.reply.length} / 450</p>
                    </div>
                    {children}
                </div>
            )}
        </div>
    );
};


const ButtonEditorPanel: React.FC<ButtonEditorPanelProps> = ({ shop, onUpdateShop, onNavigate }) => {
    const { t } = useLocalization();

    const trainingButtons = shop.knowledgeBase.userDefined.filter(
        section => section.includeInQuickReplies && section.title !== 'Business Name' && section.title !== 'AI Persona & Name'
    );
    
    const customReplies = shop.assistantConfig.customQuickReplies || [];

    const getOrCreateConfig = (key: string, defaultTitle: string, defaultReply: string): CustomQuickReply => {
        const existing = customReplies.find(r => r.key === key);
        if (existing) return existing;
        return { key, title: defaultTitle, reply: defaultReply, enabled: true };
    };
    
    const handoverConfig = getOrCreateConfig('handoverToHuman', t('quickReplyTalkToHuman'), t('handoverToHuman'));
    const categoriesConfig = getOrCreateConfig('showCategories', t('quickReplyBrowseByCategory'), t('quickReplyWhichCategory'));
    
    const categories = useMemo(() => Array.from(new Set(shop.items.map(item => item.category).filter(Boolean))), [shop.items]) as string[];


    const handleUpdateConfig = (newConfig: CustomQuickReply) => {
        onUpdateShop(s => {
            const existingReplies = s.assistantConfig.customQuickReplies || [];
            const index = existingReplies.findIndex(r => r.key === newConfig.key);
            let updatedReplies;
            if (index > -1) {
                updatedReplies = [...existingReplies];
                updatedReplies[index] = newConfig;
            } else {
                updatedReplies = [...existingReplies, newConfig];
            }
            return {
                ...s,
                assistantConfig: {
                    ...s.assistantConfig,
                    customQuickReplies: updatedReplies,
                }
            };
        });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto pr-2 space-y-8">
                {/* Preset System Buttons Section */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">{t('presetSystemButtons')}</h3>
                    <p className="text-sm text-gray-400 mb-4" dangerouslySetInnerHTML={{ __html: t('presetSystemButtonsDescV2') }}></p>
                    <div className="space-y-4">
                        <SystemButtonEditor
                            title={t('talkToHuman')}
                            description={t('talkToHumanDesc')}
                            config={handoverConfig}
                            onUpdate={handleUpdateConfig}
                        />
                        <SystemButtonEditor
                            title={t('browseByCategory')}
                            description={t('browseByCategoryDesc')}
                            config={categoriesConfig}
                            onUpdate={handleUpdateConfig}
                        >
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-400 mb-1">{t('categoryButtonPreview')}</label>
                                <p className="text-xs text-gray-500 mb-2">{t('categoryButtonPreviewDesc')}</p>
                                <div className="p-3 bg-gray-800 rounded-md border border-gray-600 min-h-[50px] flex items-center">
                                    {categories.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(category => (
                                                <div key={category} className="px-3 py-1.5 text-sm font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded-full">
                                                    {category}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500">{t('noCategoriesFoundPreview')}</p>
                                    )}
                                </div>
                            </div>
                        </SystemButtonEditor>
                    </div>
                </section>
                
                {/* Generated from Train Assistant Section */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">{t('generatedFromTrainAssistant')}</h3>
                    <p className="text-sm text-gray-400 mb-4">{t('generatedFromTrainAssistantDesc')}</p>
                    
                    <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
                        <button
                          onClick={() => onNavigate('training')}
                          className="text-sm text-blue-400 hover:underline mb-3 float-right"
                        >
                          {t('editInTrainAssistant')} →
                        </button>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {trainingButtons.length > 0 ? (
                                trainingButtons.map(section => (
                                    <div key={section.id} className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded-full">
                                        {section.title}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">{t('noTrainingSections')}</p>
                            )}
                        </div>
                    </div>
                </section>
                
                 {/* Contextual Buttons Section */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-200 mb-3">{t('contextualButtons')}</h3>
                     <div className="space-y-3">
                        <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
                            <p className="font-semibold text-white">{t('manageOrderButtonContext')}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('manageOrderButtonContextDesc')}</p>
                        </div>
                         <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
                            <p className="font-semibold text-white">{t('paymentMethodsButtonContext')}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('paymentMethodsButtonContextDesc')}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ButtonEditorPanel;