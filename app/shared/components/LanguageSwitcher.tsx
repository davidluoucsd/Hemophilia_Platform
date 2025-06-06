'use client';

import { useState, useEffect } from 'react';
import { useLanguageStore } from '../store/language';
import { locales, Locale } from '../../../i18n';

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export default function LanguageSwitcher({ 
  className = '', 
  showLabel = true 
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);

  const languageOptions = [
    { code: 'zh' as Locale, label: '中文', nativeLabel: '中文' },
    { code: 'en' as Locale, label: 'English', nativeLabel: 'English' }
  ];

  const currentLanguage = languageOptions.find(lang => lang.code === locale);

  const handleLanguageChange = (selectedLocale: Locale) => {
    setLocale(selectedLocale);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.language-switcher')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative language-switcher ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label={t('common.selectLanguage')}
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" 
          />
        </svg>
        <span>{currentLanguage?.nativeLabel}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="py-1">
            {showLabel && (
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                {t('common.language')}
              </div>
            )}
            {languageOptions.map((option) => (
              <button
                key={option.code}
                onClick={() => handleLanguageChange(option.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                  locale === option.code 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700'
                }`}
              >
                <span>{option.nativeLabel}</span>
                {locale === option.code && (
                  <svg 
                    className="w-4 h-4 text-blue-600" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 