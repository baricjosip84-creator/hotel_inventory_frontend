export const SUPPORTED_LOCALES = ['en-GB', 'de-DE', 'es-ES', 'fr-FR', 'hr-HR'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en-GB';
export const LOCALE_STORAGE_KEY = 'inventory_locale';

export const LOCALE_OPTIONS: ReadonlyArray<{ value: AppLocale; label: string }> = [
  { value: 'en-GB', label: 'English' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'hr-HR', label: 'Hrvatski' }
];

export function normalizeAppLocale(value: unknown): AppLocale | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  const language = raw.split(/[-_]/)[0]?.toLowerCase();
  return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase().startsWith(`${language}-`)) ?? null;
}

export function detectInitialLocale(): AppLocale {
  try {
    const stored = normalizeAppLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Storage can be blocked by browser privacy settings. Browser language still works.
  }

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAppLocale(candidate);
    if (normalized) return normalized;
  }

  return DEFAULT_LOCALE;
}
