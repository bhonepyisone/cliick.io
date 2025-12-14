import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Language } from '../types';

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string, options?: { [key: string]: string | number }, lng?: Language) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('app_language') as Language) || 'en';
    });
    const [translations, setTranslations] = useState<Record<Language, any>>({
        en: {},
        my: {},
        km: {},
        th: {},
        id: {},
        hi: {},
        fil: {},
        'pt-BR': {},
    });

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                // Use import.meta.url to get correct path in production
                const basePath = import.meta.env.BASE_URL || '/';
                const [enResponse, myResponse] = await Promise.all([
                    fetch(new URL('../locales/en.json', import.meta.url).href),
                    fetch(new URL('../locales/my.json', import.meta.url).href)
                ]);
                
                if (!enResponse.ok || !myResponse.ok) {
                    throw new Error(`Failed to load translations: en=${enResponse.status}, my=${myResponse.status}`);
                }
                
                const en = await enResponse.json();
                const my = await myResponse.json();
                
                setTranslations(prev => ({ ...prev, en, my }));
            } catch (error) {
                console.error("Failed to load translation files, will fallback to keys:", error);
                // The initial state already provides a fallback, so no need to set state here.
            }
        };

        fetchTranslations();
    }, []);

    const setLanguage = (lang: Language) => {
        localStorage.setItem('app_language', lang);
        setLanguageState(lang);
    };

    const t = useCallback((key: string, options?: { [key: string]: string | number }, lng?: Language) => {
        const targetLang = lng || language;
        let translation = translations[targetLang]?.[key] || translations['en']?.[key] || key;
        if (options) {
            Object.keys(options).forEach(optionKey => {
                translation = translation.replace(`{{${optionKey}}}`, String(options[optionKey]));
            });
        }
        return translation;
    }, [language, translations]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};