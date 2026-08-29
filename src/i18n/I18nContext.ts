import { createContext, useContext } from 'react';
import type { AppLocale } from './config';

export type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, fallback?: string) => string;
  nav: (englishLabel: string) => string;
  ui: (englishText: string) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useAppTranslation(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useAppTranslation must be used inside I18nProvider');
  return value;
}
