import React, { useState } from 'react';
import { PlatformSettings } from '../types';
import { allLanguages, allCurrencies } from '../data/localizationData';
import ToggleSwitch from './ToggleSwitch';
import SearchIcon from './icons/SearchIcon';

interface LocalizationPanelProps {
    settings: PlatformSettings;
    onSettingsChange: (settings: PlatformSettings) => void;
}

const LocalizationPanel: React.FC<LocalizationPanelProps> = ({ settings, onSettingsChange }) => {
    const [languageSearch, setLanguageSearch] = useState('');
    const [currencySearch, setCurrencySearch] = useState('');

    const handleLanguageToggle = (langCode: string, isEnabled: boolean) => {
        const current = new Set(settings.localization.enabledLanguages);
        if (isEnabled) {
            current.add(langCode);
        } else {
            current.delete(langCode);
        }
        onSettingsChange({
            ...settings,
            localization: { ...settings.localization, enabledLanguages: Array.from(current) },
        });
    };

    const handleCurrencyToggle = (currencyCode: string, isEnabled: boolean) => {
        const current = new Set(settings.localization.enabledCurrencies);
        if (isEnabled) {
            current.add(currencyCode);
        } else {
            current.delete(currencyCode);
        }
        onSettingsChange({
            ...settings,
            localization: { ...settings.localization, enabledCurrencies: Array.from(current) },
        });
    };

    const filteredLanguages = allLanguages.filter(lang =>
        lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
        lang.code.toLowerCase().includes(languageSearch.toLowerCase())
    );

    const filteredCurrencies = allCurrencies.filter(currency =>
        currency.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
        currency.code.toLowerCase().includes(currencySearch.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <p className="text-sm text-gray-400">
                Control which languages and currencies are available for shops to use. Disabling an option here will hide it from all shop settings panels.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Languages Section */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Available Languages</h3>
                    <div className="relative mb-4">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={languageSearch}
                            onChange={e => setLanguageSearch(e.target.value)}
                            placeholder="Search languages..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-full py-2 pl-9 pr-4 text-sm"
                        />
                    </div>
                    <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                        {filteredLanguages.map(lang => (
                            <div key={lang.code} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-800/50">
                                <span className="text-sm">{lang.name} ({lang.code})</span>
                                <ToggleSwitch
                                    enabled={settings.localization.enabledLanguages.includes(lang.code)}
                                    onChange={isEnabled => handleLanguageToggle(lang.code, isEnabled)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Currencies Section */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Available Currencies</h3>
                    <div className="relative mb-4">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={currencySearch}
                            onChange={e => setCurrencySearch(e.target.value)}
                            placeholder="Search currencies..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-full py-2 pl-9 pr-4 text-sm"
                        />
                    </div>
                     <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                        {filteredCurrencies.map(currency => (
                            <div key={currency.code} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-800/50">
                                <span className="text-sm">{currency.name} ({currency.code})</span>
                                <ToggleSwitch
                                    enabled={settings.localization.enabledCurrencies.includes(currency.code)}
                                    onChange={isEnabled => handleCurrencyToggle(currency.code, isEnabled)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocalizationPanel;