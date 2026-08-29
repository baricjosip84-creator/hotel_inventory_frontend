import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_LOCALE,
  detectInitialLocale,
  LOCALE_STORAGE_KEY,
  normalizeAppLocale,
  type AppLocale
} from './config';
import { I18nContext, type I18nContextValue } from './I18nContext';
import { MESSAGE_CATALOGS } from './messages';
import { NAVIGATION_TRANSLATIONS } from './navigationTranslations';
import { translateTenantUi } from './tenantUiTranslations';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => detectInitialLocale());

  const setLocale = useCallback((nextLocale: AppLocale) => {
    const normalized = normalizeAppLocale(nextLocale) ?? DEFAULT_LOCALE;
    setLocaleState(normalized);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    } catch {
      // The selected locale remains active for this page even if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: string, fallback?: string) => {
    return MESSAGE_CATALOGS[locale][key]
      ?? MESSAGE_CATALOGS[DEFAULT_LOCALE][key]
      ?? fallback
      ?? key;
  }, [locale]);

  const nav = useCallback((englishLabel: string) => {
    return NAVIGATION_TRANSLATIONS[locale][englishLabel]
      ?? NAVIGATION_TRANSLATIONS[DEFAULT_LOCALE][englishLabel]
      ?? englishLabel;
  }, [locale]);

  const ui = useCallback((englishText: string) => translateTenantUi(locale, englishText), [locale]);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t, nav, ui }), [locale, nav, setLocale, t, ui]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
