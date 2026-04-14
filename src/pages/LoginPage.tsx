import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { saveAuthTokens } from '../lib/auth';
import type { AuthTokens } from '../types/auth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

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
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>Login</h2>

        {errorMessage && <div style={styles.error}>{errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  },
  card: {
    padding: '32px',
    border: '1px solid #ddd',
    borderRadius: '12px',
    width: '320px'
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px'
  },
  button: {
    width: '100%',
    padding: '10px'
  },
  error: {
    color: 'red',
    marginBottom: '10px'
  }
};