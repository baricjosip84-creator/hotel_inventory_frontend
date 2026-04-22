import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { saveAuthTokens } from '../lib/auth';
import type { AuthTokens } from '../types/auth';

function useIsCompactLayout(breakpoint = 920): boolean {
  const [isCompact, setIsCompact] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isCompact;
}

export function LoginPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in your actual current LoginPage.

    The real login behavior is intentionally unchanged:
    - same POST /auth/login request
    - same token save flow
    - same navigate('/dashboard')
    - same submit guard
    - same ApiError handling
    - same preventDefault / stopPropagation protection

    This pass is still UI-only, but specifically fixes the upright-phone issue:
    - switches to a single-column stacked layout on narrower screens
    - removes the too-tall desktop shell behavior on mobile
    - reduces spacing/font pressure on compact screens
    - keeps the page visually aligned with the rest of the app

    WHAT PROBLEM IT SOLVES
    ----------------------
    Fixes the portrait mobile layout where only part of the page felt visible,
    while preserving the stronger desktop/landscape presentation.
  */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const isCompact = useIsCompactLayout();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // 🔴 THIS IS THE CRITICAL FIX
    event.preventDefault();
    event.stopPropagation();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiRequest<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      saveAuthTokens(response);
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        ...styles.page,
        ...(isCompact ? styles.pageCompact : {})
      }}
    >
      <div
        style={{
          ...styles.shell,
          ...(isCompact ? styles.shellCompact : {})
        }}
      >
        <section
          style={{
            ...styles.brandPanel,
            ...(isCompact ? styles.brandPanelCompact : {})
          }}
        >
          <div style={styles.brandBadge}>HOTEL INVENTORY PLATFORM</div>

          <div style={styles.brandBlock}>
            <h1
              style={{
                ...styles.brandTitle,
                ...(isCompact ? styles.brandTitleCompact : {})
              }}
            >
              Operations with clarity.
            </h1>
            <p
              style={{
                ...styles.brandText,
                ...(isCompact ? styles.brandTextCompact : {})
              }}
            >
              Manage products, suppliers, storage, stock, shipments, alerts, reporting,
              and operational insights from one consistent platform.
            </p>
          </div>

          <div
            style={{
              ...styles.featureGrid,
              ...(isCompact ? styles.featureGridCompact : {})
            }}
          >
            <div style={styles.featureCard}>
              <div style={styles.featureTitle}>Inventory control</div>
              <div style={styles.featureText}>
                Stock workbench, movement history, low-stock visibility, and location-aware operations.
              </div>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureTitle}>Receiving workflows</div>
              <div style={styles.featureText}>
                Shipment receiving, barcode scanning, discrepancy handling, and operational traceability.
              </div>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureTitle}>Management visibility</div>
              <div style={styles.featureText}>
                Reports, insights, supplier trust, health signals, alerts, and system diagnostics.
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            ...styles.loginPanel,
            ...(isCompact ? styles.loginPanelCompact : {})
          }}
        >
          <div
            style={{
              ...styles.loginCard,
              ...(isCompact ? styles.loginCardCompact : {})
            }}
          >
            <div style={styles.loginHeader}>
              <div style={styles.loginEyebrow}>Secure access</div>
              <h2
                style={{
                  ...styles.loginTitle,
                  ...(isCompact ? styles.loginTitleCompact : {})
                }}
              >
                Sign in
              </h2>
              <p style={styles.loginSubtitle}>
                Use your tenant account to access the inventory platform.
              </p>
            </div>

            {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label htmlFor="login-email" style={styles.label}>
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@hotel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  autoComplete="email"
                  required
                />
              </div>

              <div style={styles.field}>
                <label htmlFor="login-password" style={styles.label}>
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button type="submit" disabled={isSubmitting} style={styles.button}>
                {isSubmitting ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    /*
      What changed:
      - Uses flexible full-screen sizing and keeps content centered for desktop.

      Why:
      - The previous version was tuned mainly for large screens.

      What problem this solves:
      - Gives us a stable base for both desktop and compact/mobile layouts.
    */
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    background:
      'linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #eef2ff 100%)',
    padding: '24px',
    boxSizing: 'border-box'
  },
  pageCompact: {
    padding: '12px'
  },
  shell: {
    /*
      What changed:
      - Preserves the stronger desktop two-column presentation.

      Why:
      - Desktop and landscape tablet layouts already looked good.

      What problem this solves:
      - Keeps the upgraded login page feeling integrated with the rest of the app on larger screens.
    */
    width: '100%',
    maxWidth: '1200px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.10)',
    minHeight: '680px'
  },
  shellCompact: {
    /*
      What changed:
      - Stacks the two sections vertically on smaller screens.
      - Removes the tall desktop-style minimum height.

      Why:
      - Portrait phones do not have enough comfortable height for the wide desktop layout.

      What problem this solves:
      - Prevents the “half screens visible” feeling when the phone is upright.
    */
    gridTemplateColumns: '1fr',
    minHeight: 'auto',
    borderRadius: '20px'
  },
  brandPanel: {
    background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)',
    color: '#ffffff',
    padding: '40px',
    display: 'grid',
    alignContent: 'start',
    gap: '28px'
  },
  brandPanelCompact: {
    padding: '22px',
    gap: '18px'
  },
  brandBadge: {
    display: 'inline-flex',
    alignSelf: 'start',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.14)',
    color: '#dbeafe',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.08em'
  },
  brandBlock: {
    display: 'grid',
    gap: '14px'
  },
  brandTitle: {
    margin: 0,
    fontSize: '42px',
    lineHeight: 1.05,
    fontWeight: 800
  },
  brandTitleCompact: {
    fontSize: '30px'
  },
  brandText: {
    margin: 0,
    color: 'rgba(255,255,255,0.86)',
    fontSize: '16px',
    lineHeight: 1.7,
    maxWidth: '560px'
  },
  brandTextCompact: {
    fontSize: '14px',
    lineHeight: 1.6,
    maxWidth: '100%'
  },
  featureGrid: {
    display: 'grid',
    gap: '14px'
  },
  featureGridCompact: {
    gap: '10px'
  },
  featureCard: {
    background: 'rgba(255,255,255,0.10)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '18px',
    padding: '16px'
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: 800,
    marginBottom: '8px'
  },
  featureText: {
    color: 'rgba(255,255,255,0.84)',
    lineHeight: 1.6,
    fontSize: '14px'
  },
  loginPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: '#f8fafc'
  },
  loginPanelCompact: {
    padding: '18px'
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '22px',
    padding: '28px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
    boxSizing: 'border-box'
  },
  loginCardCompact: {
    maxWidth: '100%',
    padding: '22px',
    borderRadius: '18px'
  },
  loginHeader: {
    marginBottom: '22px'
  },
  loginEyebrow: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#2563eb',
    marginBottom: '10px'
  },
  loginTitle: {
    margin: 0,
    fontSize: '30px',
    lineHeight: 1.1,
    color: '#0f172a'
  },
  loginTitleCompact: {
    fontSize: '26px'
  },
  loginSubtitle: {
    margin: '10px 0 0 0',
    color: '#64748b',
    lineHeight: 1.6
  },
  form: {
    display: 'grid',
    gap: '16px'
  },
  field: {
    display: 'grid',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#334155'
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none'
  },
  button: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '14px',
    border: 'none',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: '4px'
  },
  error: {
    color: '#b91c1c',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '14px',
    padding: '12px 14px',
    marginBottom: '16px',
    lineHeight: 1.5
  }
};