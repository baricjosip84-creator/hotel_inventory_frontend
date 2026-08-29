
import { fetchCurrentPlatformIdentity } from '../lib/platformAuth';
import { InventoryMark } from '../components/brand/InventoryBrand';
import { LanguageSelector } from '../components/i18n/LanguageSelector';
import { useAppTranslation } from '../i18n/I18nContext';
import '../layouts/PlatformTheme.css';

import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { AuthTokens } from '../types/auth';
import { platformApiRequest, restorePlatformSession } from '../lib/platformApi';
import { savePlatformAuthTokens } from '../lib/platformAuth';

export default function PlatformLoginPage() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const skipSessionRecovery = Boolean(
    (location.state as { from?: string; skipSessionRecovery?: boolean } | null)?.skipSessionRecovery
  );

  useEffect(() => {
    if (skipSessionRecovery) {
      return undefined;
    }

    let active = true;

    const recoverExistingSession = async () => {
      const accessToken = await restorePlatformSession();
      if (!accessToken || !active) return;

      const identity = await fetchCurrentPlatformIdentity();
      if (active && identity) {
        navigate('/platform', { replace: true });
      }
    };

    void recoverExistingSession().catch(() => {
      // Stay on the login page when no recoverable platform session exists.
    });

    return () => {
      active = false;
    };
  }, [navigate, skipSessionRecovery]);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const tokens = await platformApiRequest<AuthTokens>('/platform/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      savePlatformAuthTokens(tokens);
      const from = (location.state as { from?: string } | null)?.from || '/platform/tenants';
      navigate(from, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('platformLogin.errorFallback', 'Platform login failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="platform-theme" style={styles.page}>
      <div style={styles.shell}>
        <section style={styles.brandPanel} aria-label={t('platformLogin.aria')}>
          <div style={styles.brandRow}>
            <InventoryMark size={42} tone="dark" accent="red" />
            <div>
              <div style={styles.brandName}>Inventory Operations</div>
              <div style={styles.brandCaption}>{t('platformLogin.brandCaption')}</div>
            </div>
          </div>
          <div>
            <div style={styles.kicker}>{t('platformLogin.kicker')}</div>
            <h1 style={styles.hero}>{t('platformLogin.hero')}</h1>
            <p style={styles.heroText}>{t('platformLogin.heroText')}</p>
          </div>
          <div style={styles.features}>
            <div style={styles.feature}><span style={styles.featureIcon}>□</span><div><strong>{t('platformLogin.featureTenantTitle')}</strong><span style={styles.featureText}>{t('platformLogin.featureTenantText')}</span></div></div>
            <div style={styles.feature}><span style={styles.featureIcon}>↔</span><div><strong>{t('platformLogin.featureReliabilityTitle')}</strong><span style={styles.featureText}>{t('platformLogin.featureReliabilityText')}</span></div></div>
            <div style={styles.feature}><span style={styles.featureIcon}>✓</span><div><strong>{t('platformLogin.featureLaunchTitle')}</strong><span style={styles.featureText}>{t('platformLogin.featureLaunchText')}</span></div></div>
          </div>
          <div style={styles.brandFooter}>{t('platformLogin.footer')}</div>
        </section>

        <section style={styles.loginPanel}>
          <form onSubmit={handleSubmit} style={styles.card} data-auth-form="true">
            <div style={styles.languageRow}><LanguageSelector scope="local" compact /></div>
            <div>
              <div style={styles.eyebrow}>{t('platformLogin.eyebrow')}</div>
              <h2 style={styles.title}>{t('platformLogin.title')}</h2>
              <p style={styles.subtitle}>{t('platformLogin.subtitle')}</p>
            </div>

            {errorMessage ? <div role="alert" style={styles.error}><strong>{t('platformLogin.errorTitle')}</strong><span>{errorMessage}</span></div> : null}

            <label style={styles.field}>
              <span style={styles.label}>{t('platformLogin.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={styles.input}
                placeholder={t('platformLogin.emailPlaceholder')}
                autoComplete="email"
                required
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>{t('platformLogin.password')}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={styles.input}
                placeholder={t('platformLogin.passwordPlaceholder')}
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting} style={{ ...styles.button, ...(isSubmitting ? styles.buttonDisabled : {}) }}>
              {isSubmitting ? t('platformLogin.signingIn') : t('platformLogin.signIn')}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: 'linear-gradient(145deg,#fff1f1 0%,#f8fafc 46%,#fff 100%)',
    color: '#0f172a'
  },
  shell: {
    width: '100%',
    maxWidth: 1120,
    minHeight: 650,
    display: 'grid',
    gridTemplateColumns: 'minmax(0,.95fr) minmax(400px,.78fr)',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    overflow: 'hidden',
    background: '#fff',
    boxShadow: '0 28px 70px rgba(15,23,42,.12)'
  },
  brandPanel: {
    padding: '42px 46px',
    color: '#fff',
    background: 'radial-gradient(circle at 12% 18%,rgba(var(--io-primary-rgb),.28),transparent 30%),linear-gradient(155deg,#081220 0%,#0f2749 52%,#0b1b32 100%)',
    display: 'flex',
    flexDirection: 'column',
    gap: 42
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 12 },
  brandName: { fontWeight: 800, fontSize: 20, lineHeight: 1.05, letterSpacing: '-.02em' },
  brandCaption: { color: 'rgba(var(--io-primary-border-rgb),.66)', fontSize: 10, marginTop: 4, fontWeight: 800, letterSpacing: '.08em' },
  kicker: { color: 'var(--io-primary-light)', fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 },
  hero: { margin: 0, fontSize: 36, lineHeight: 1.1, letterSpacing: '-.035em', fontWeight: 800, maxWidth: 500 },
  heroText: { margin: '16px 0 0', color: 'rgba(255,255,255,.72)', fontSize: 15, lineHeight: 1.7, maxWidth: 520 },
  features: { display: 'grid', gap: 16 },
  feature: { display: 'grid', gridTemplateColumns: '42px 1fr', gap: 13, alignItems: 'start', fontSize: 14 },
  featureIcon: { width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', color: 'var(--io-primary-border)', border: '1px solid rgba(var(--io-primary-light-rgb),.25)', background: 'rgba(var(--io-primary-rgb),.14)', fontSize: 19, fontWeight: 800 },
  featureText: { display: 'block', marginTop: 4, color: 'rgba(255,255,255,.60)', fontSize: 13, lineHeight: 1.55 },
  brandFooter: { marginTop: 'auto', color: 'rgba(255,255,255,.42)', fontSize: 12, fontWeight: 650 },
  loginPanel: { display: 'grid', placeItems: 'center', padding: 48, background: '#fff' },
  card: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 17 },
  languageRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: 2 },
  eyebrow: { color: 'var(--io-primary)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em' },
  subtitle: { margin: '10px 0 8px', color: '#64748b', fontSize: 14, lineHeight: 1.55 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { color: '#334155', fontSize: 13, fontWeight: 700 },
  input: { width: '100%', height: 44, padding: '0 13px', borderRadius: 9, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', outline: 'none' },
  button: { width: '100%', height: 44, marginTop: 2, padding: '0 14px', borderRadius: 9, border: '1px solid var(--io-primary)', background: 'var(--io-primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 18px rgba(var(--io-primary-rgb),.18)' },
  buttonDisabled: { opacity: .58, cursor: 'not-allowed' },
  error: { padding: '12px 13px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: 13, display: 'grid', gap: 3 }
};
