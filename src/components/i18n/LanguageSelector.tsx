import { useState } from 'react';
import type { CSSProperties } from 'react';
import { apiRequest } from '../../lib/api';
import { isAuthenticated, isSupportSessionAccess } from '../../lib/auth';
import { platformApiRequest } from '../../lib/platformApi';
import { isPlatformAuthenticated } from '../../lib/platformAuth';
import { LOCALE_OPTIONS, type AppLocale } from '../../i18n/config';
import { useAppTranslation } from '../../i18n/I18nContext';

type LanguageSelectorProps = {
  scope?: 'local' | 'tenant' | 'platform';
  compact?: boolean;
  className?: string;
};

type LocalePreferenceResponse = {
  locale?: string | null;
  user_locale?: string | null;
  effective_locale?: string | null;
};

export function LanguageSelector({ scope = 'local', compact = false, className }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useAppTranslation();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const persist = async (nextLocale: AppLocale) => {
    if (scope === 'tenant' && isAuthenticated() && !isSupportSessionAccess()) {
      await apiRequest<LocalePreferenceResponse>('/auth/preferences/locale', {
        method: 'PATCH',
        body: JSON.stringify({ locale: nextLocale }),
        skipMutationFeedback: true
      });
      return;
    }

    if (scope === 'platform' && isPlatformAuthenticated()) {
      await platformApiRequest<LocalePreferenceResponse>('/platform/auth/preferences/locale', {
        method: 'PATCH',
        body: JSON.stringify({ locale: nextLocale }),
        skipMutationFeedback: true
      });
    }
  };

  const handleChange = async (nextLocale: AppLocale) => {
    setLocale(nextLocale);
    setSaveError(false);

    if (scope === 'local') return;

    setSaving(true);
    try {
      await persist(nextLocale);
    } catch {
      // Keep the selected language active locally. The user can retry later and
      // the backend preference remains unchanged rather than blocking the UI.
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className={className} style={{ ...styles.wrapper, ...(compact ? styles.compactWrapper : {}) }}>
      {!compact ? <span style={styles.label}>{t('common.language', 'Language')}</span> : null}
      <select
        aria-label={t('common.language', 'Language')}
        title={saveError ? t('common.languageSavingFailed', 'Language changed locally, but the account preference could not be saved.') : undefined}
        value={locale}
        disabled={saving}
        onChange={(event) => void handleChange(event.target.value as AppLocale)}
        style={{ ...styles.select, ...(compact ? styles.compactSelect : {}), ...(saveError ? styles.errorSelect : {}) }}
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: { display: 'grid', gap: 6, minWidth: 150 },
  compactWrapper: { display: 'block', minWidth: 0 },
  label: { fontSize: 12, fontWeight: 700, color: 'inherit', opacity: 0.72 },
  select: {
    width: '100%', minHeight: 38, border: '1px solid #cbd5e1', borderRadius: 8,
    background: '#fff', color: '#0f172a', padding: '0 10px', fontWeight: 700, fontSize: 13
  },
  compactSelect: { minHeight: 34, minWidth: 125, fontSize: 12, padding: '0 8px' },
  errorSelect: { borderColor: '#dc2626' }
};
