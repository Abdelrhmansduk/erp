import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LANGUAGES, Language, TRANSLATIONS } from './languages';
import i18n from './config';
import { translateDomSubtree, lookupExactTranslation } from './liveDomTranslator';

export interface LanguageContextType {
  currentLanguage: Language;
  availableLanguages: Language[];
  isRtl: boolean;
  theme: 'light' | 'dark';
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  t: (key: string, defaultText?: string, vars?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, showSymbol?: boolean) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const SAUDI_RIYAL_SYMBOL = '\u20C1';

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: LANGUAGES[0],
  availableLanguages: LANGUAGES,
  isRtl: true,
  theme: 'light',
  setLanguage: () => {},
  toggleTheme: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
  formatNumber: (value: number) => String(value),
  formatCurrency: (amount: number, showSymbol = true) =>
    showSymbol ? `${amount.toLocaleString('en-US')} ${SAUDI_RIYAL_SYMBOL}` : amount.toLocaleString('en-US'),
  formatDate: (date: Date | string | number) => String(date),
});

const STORAGE_KEYS = {
  THEME: 'erp-preferred-theme',
  LANGUAGE: 'erp-preferred-language',
};

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const stored = loadFromStorage<string>(STORAGE_KEYS.LANGUAGE, 'ar');
    return LANGUAGES.find((l) => l.code === stored) || LANGUAGES[0];
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    loadFromStorage<'light' | 'dark'>(STORAGE_KEYS.THEME, 'light')
  );

  useEffect(() => {
    document.documentElement.setAttribute('lang', currentLanguage.code);
    document.documentElement.setAttribute('dir', currentLanguage.dir);
    i18n.changeLanguage(currentLanguage.code);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify(currentLanguage.code));

    // Immediately translate or restore the entire document tree
    translateDomSubtree(document.body, currentLanguage.code);

    if (currentLanguage.code === 'ar') {
      return;
    }

    let rafId: number | null = null;
    const pendingRoots = new Set<Node>();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target) {
          pendingRoots.add(m.target);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((n) => pendingRoots.add(n));
        }
      }
      if (pendingRoots.size > 0 && rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          const nodes = Array.from(pendingRoots);
          pendingRoots.clear();
          for (const n of nodes) {
            if (n.isConnected) {
              translateDomSubtree(n, currentLanguage.code);
            }
          }
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [currentLanguage]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSetLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  const t = useCallback(
    (key: string, defaultText?: string, vars?: Record<string, string | number>): string => {
      const langDict = TRANSLATIONS[currentLanguage.code];
      let resolved: string | undefined;

      if (langDict && langDict[key]) {
        resolved = langDict[key];
      } else if (defaultText && currentLanguage.code !== 'ar') {
        resolved =
          lookupExactTranslation(defaultText, currentLanguage.code) ||
          lookupExactTranslation(key, currentLanguage.code) ||
          TRANSLATIONS['en']?.[key] ||
          defaultText;
      } else if (defaultText && currentLanguage.code === 'ar') {
        resolved = defaultText;
      } else if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) {
        resolved = TRANSLATIONS['en'][key];
      } else if (TRANSLATIONS['ar'] && TRANSLATIONS['ar'][key]) {
        resolved = TRANSLATIONS['ar'][key];
      } else {
        resolved = defaultText || key;
      }

      if (vars && resolved) {
        Object.entries(vars).forEach(([k, v]) => {
          resolved = resolved!.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v));
        });
      }

      return resolved;
    },
    [currentLanguage]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(currentLanguage.code, options).format(value);
      } catch {
        return value.toLocaleString('en-US');
      }
    },
    [currentLanguage.code]
  );

  const formatCurrency = useCallback(
    (amount: number, showSymbol = true): string => {
      const formatted = formatNumber(amount, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return showSymbol ? `${formatted} ${SAUDI_RIYAL_SYMBOL}` : formatted;
    },
    [formatNumber]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const parsed = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(parsed.getTime())) return String(date);
        return new Intl.DateTimeFormat(
          currentLanguage.code === 'ar' ? 'ar-SA' : currentLanguage.code,
          options || { year: 'numeric', month: 'short', day: '2-digit' }
        ).format(parsed);
      } catch {
        return String(date);
      }
    },
    [currentLanguage.code]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        availableLanguages: LANGUAGES,
        isRtl: currentLanguage.dir === 'rtl',
        theme,
        setLanguage: handleSetLanguage,
        toggleTheme,
        t,
        formatNumber,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
