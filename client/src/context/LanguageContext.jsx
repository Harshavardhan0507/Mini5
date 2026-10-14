import { createContext, useContext, useState } from 'react';
import { translations } from '../data/translations';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', htmlLang: 'en' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', htmlLang: 'te' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', htmlLang: 'kn' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', htmlLang: 'hi' }
];

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('kisan_lang') || 'en';
  });

  const setLanguage = (langCode) => {
    setLanguageState(langCode);
    localStorage.setItem('kisan_lang', langCode);
    // Update document lang attribute for proper font rendering of regional scripts
    const langEntry = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    document.documentElement.lang = langEntry?.htmlLang ?? 'en';
  };

  // Set initial lang on mount
  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
