
import {
  fetchCurrentPlatformIdentity,
  logoutPlatformSession
} from '../lib/platformAuth';

import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AuthTokens } from '../types/auth';
import { platformApiRequest } from '../lib/platformApi';
import { savePlatformAuthTokens } from '../lib/platformAuth';

export default function PlatformLoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void logoutPlatformSession();
    let active = true;

    fetchCurrentPlatformIdentity()
      .then((identity) => {
        if (!active || !identity) {
          return;
        }

        navigate('/platform');
      })
      .catch(() => {
        // noop
      });

    return () => {
      active = false;
    };
  }, [navigate]);


  const location = useLocation();
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
      setErrorMessage(error instanceof Error ? error.message : 'Platform login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <div>
          <div style={styles.eyebrow}>Platform access</div>
          <h1 style={styles.title}>Superadmin login</h1>
          <p style={styles.subtitle}>Use a platform account, not a tenant user account.</p>
        </div>

        {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}

        <label style={styles.field}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={styles.input}
            autoComplete="email"
            required
          />
        </label>

        <label style={styles.field}>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={styles.input}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    background: '#f7f7f8',
    padding: '24px'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#fff',
    borderRadius: '18px',
    padding: '28px',
    boxShadow: '0 20px 60px rgba(15,23,42,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  eyebrow: {
    color: '#6b7280',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  title: {
    margin: '6px 0',
    fontSize: '28px'
  },
  subtitle: {
    margin: 0,
    color: '#6b7280'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontWeight: 700
  },
  input: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db'
  },
  button: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: 0,
    background: '#111827',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer'
  },
  error: {
    padding: '10px 12px',
    borderRadius: '10px',
    background: '#fee2e2',
    color: '#991b1b'
  }
};
