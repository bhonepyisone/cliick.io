import React from 'react';
import { Shop } from '../types';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import { useLocalization } from '../hooks/useLocalization';

interface OnboardingChecklistProps {
  shop: Shop;
  onDismiss: () => void;
}

const ChecklistItem: React.FC<{ isCompleted: boolean; text: string; subtext: string }> = ({ isCompleted, text, subtext }) => (
    <div className="flex items-start gap-4">
        <div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500' : 'bg-[#2c4f73] border-2 border-[#4a6b8c]'}`}>
                {isCompleted && <CheckCircleIcon className="w-6 h-6 text-white" />}
            </div>
        </div>
        <div>
            <p className={`font-semibold ${isCompleted ? 'text-gray-400 line-through' : 'text-[#F6F9FC]'}`}>{text}</p>
            <p className={`text-sm ${isCompleted ? 'text-gray-500' : 'text-gray-400'}`}>{subtext}</p>
        </div>
    </div>
);

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ shop, onDismiss }) => {
    const { t } = useLocalization();
    
    const hasItems = (shop.items || []).length > 0;
    const hasConfiguredAI = shop.assistantConfig.systemPrompt !== `You are a helpful assistant for ${shop.name}.`;
    const hasConnectedFacebook = shop.isFacebookConnected;
    const hasCreatedForm = shop.forms.length > 0;

    const completedSteps = [hasItems, hasConfiguredAI, hasConnectedFacebook, hasCreatedForm].filter(Boolean).length;
    const progress = (completedSteps / 4) * 100;

    return (
        <div className="bg-[#1D3B59] border border-[#2c4f73] rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-bold text-[#F6F9FC]">{t('gettingStartedChecklist')}</h3>
                    <p className="text-sm text-gray-400">{t('gettingStartedDescription')}</p>
                </div>
                <button onClick={onDismiss} className="text-sm text-gray-400 hover:text-white hover:underline self-start md:self-center">
                    {t('dismiss')}
                </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-6">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-300">{t('stepsCompleted', { completedSteps: completedSteps.toString() })}</span>
                </div>
                <div className="w-full bg-[#2c4f73] rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <ChecklistItem 
                    isCompleted={hasItems}
                    text={t('addFirstProduct')}
                    subtext={t('addFirstProductSubtext')}
                />
                 <ChecklistItem 
                    isCompleted={hasConfiguredAI}
                    text={t('configureAIPersonality')}
                    subtext={t('configureAIPersonalitySubtext')}
                />
                 <ChecklistItem 
                    isCompleted={hasCreatedForm}
                    text={t('createOrderForm')}
                    subtext={t('createOrderFormSubtext')}
                />
                 <ChecklistItem 
                    isCompleted={hasConnectedFacebook}
                    text={t('connectFacebookPage')}
                    subtext={t('connectFacebookPageSubtext')}
                />
            </div>
        </div>
    );
};

export default OnboardingChecklist;