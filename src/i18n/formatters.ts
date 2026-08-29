import { DEFAULT_LOCALE, type AppLocale } from './config';

export function formatLocalizedDateTime(value: string | number | Date | null | undefined, locale: AppLocale, options?: Intl.DateTimeFormatOptions): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale || DEFAULT_LOCALE, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatLocalizedDate(value: string | number | Date | null | undefined, locale: AppLocale, options?: Intl.DateTimeFormatOptions): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale || DEFAULT_LOCALE, options ?? { dateStyle: 'medium' }).format(date);
}

export function formatLocalizedNumber(value: number | null | undefined, locale: AppLocale, options?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale || DEFAULT_LOCALE, options).format(value);
}

export function formatLocalizedCurrency(value: number | null | undefined, currency: string, locale: AppLocale, options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale || DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    ...options
  }).format(value);
}
