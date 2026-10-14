import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, Check, ChevronDown } from 'lucide-react';

export default function LanguageSelector() {
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
        title="Change Language"
      >
        <Globe className="w-4 h-4 text-agro-600" />
        <span className="font-semibold text-agro-800">{currentLang.native}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-44 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition ${
                  language === lang.code
                    ? 'bg-agro-50 font-semibold text-agro-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-medium">{lang.native}</div>
                  <div className="text-xs text-slate-400">{lang.label}</div>
                </div>
                {language === lang.code && <Check className="w-4 h-4 text-agro-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
