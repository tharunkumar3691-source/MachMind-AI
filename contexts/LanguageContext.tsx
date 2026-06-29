
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { translations, Language } from '../i18n/translations';

type TranslationsType = typeof translations.en;

// Helper to access nested properties safely
function getNestedTranslation(obj: any, path: string): string {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : null;
  }, obj) || path;
}

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const LANGUAGE_KEY = 'machmind-ai_app_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage or default to 'en'
  const [language, setLanguageState] = useState<Language>(() => {
    try {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        // Simple check if it matches allowed languages
        if (saved === 'en' || saved === 'es' || saved === 'fr') {
            return saved as Language;
        }
    } catch (e) {
        console.warn("Could not read language from local storage", e);
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
        localStorage.setItem(LANGUAGE_KEY, lang);
    } catch (e) {
        console.warn("Could not save language to local storage", e);
    }
  };

  const t = (key: string) => {
    const translation = getNestedTranslation(translations[language], key);
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
