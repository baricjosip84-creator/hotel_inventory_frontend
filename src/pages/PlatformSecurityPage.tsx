import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import qrCodeSvg from '../lib/qrCodeSvg';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

type Security = {
  email: string;
  role: string;
  failed_login_count: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  password_changed_at?: string | null;
  mfa_enabled: boolean;
  active_sessions: number;
};

type SecurityUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  failed_login_count: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  password_changed_at?: string | null;
  mfa_enabled: boolean;
  active_sessions: number;
  risk_flags: string[];
};

type SecurityAdminOverview = {
  summary: {
    total_users: number;
    active_users: number;
    locked_users: number;
    users_without_mfa: number;
    users_with_failed_logins: number;
    active_sessions: number;
  };
  users: SecurityUser[];
  active_sessions: Array<{
    id: string;
    platform_user_id: string;
    email: string;
    name: string;
    role: string;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: string;
    last_used_at?: string | null;
    expires_at: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function PlatformSecurityPage() {
  const qc = useQueryClient();
  const [pwd, setPwd] = useState({ current_password: '', new_password: '' });
  const [mfaCode, setMfaCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; otpauth_url: string; algorithm?: string; digits?: number; period_seconds?: number } | null>(null);
  const canReadAdminSecurity = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ);
  const canWriteAdminSecurity = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_WRITE);

  const q = useQuery({
    queryKey: ['platform', 'security', 'me'],
    queryFn: () => platformApiRequest<Security>('/platform/security/me')
  });

  const admin = useQuery({
    queryKey: ['platform', 'security', 'admin'],
    queryFn: () => platformApiRequest<SecurityAdminOverview>('/platform/security/admin'),
    enabled: canReadAdminSecurity
  });

  const change = useMutation({
    mutationFn: () => platformApiRequest('/platform/security/me/change-password', { method: 'POST', body: JSON.stringify(pwd) })
  });

  const setupMfa = useMutation({
    mutationFn: () => platformApiRequest<{ secret: string; otpauth_url: string; algorithm?: string; digits?: number; period_seconds?: number }>('/platform/security/me/mfa/setup', { method: 'POST' }),
    onSuccess: setSetup
  });

  const confirm = useMutation({
    mutationFn: () => platformApiRequest('/platform/security/me/mfa/confirm', { method: 'POST', body: JSON.stringify({ code: mfaCode }) }),
    onSuccess: async () => {
      setMfaCode('');
      setSetup(null);
      await qc.invalidateQueries({ queryKey: ['platform', 'security'] });
    }
  });

  const disable = useMutation({
    mutationFn: () => platformApiRequest('/platform/security/me/mfa/disable', { method: 'POST' }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['platform', 'security'] })
  });

  const unlock = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/security/admin/users/${id}/unlock`, { method: 'POST' }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['platform', 'security', 'admin'] })
  });

  const clearMfa = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/security/admin/users/${id}/clear-mfa`, { method: 'POST' }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['platform', 'security', 'admin'] })
  });

  return (
    <div style={styles.page}>
      <h1>Platform security</h1>
      <p style={styles.muted}>Your own platform account hardening plus platform staff security review for authorized security/admin roles.</p>

      <section style={styles.panel}>
        <h2>My account</h2>
        {q.data ? (
          <div style={styles.cards}>
            <div style={styles.card}>Email<br /><b>{q.data.email}</b></div>
            <div style={styles.card}>Role<br /><b>{q.data.role}</b></div>
            <div style={styles.card}>MFA<br /><b>{q.data.mfa_enabled ? 'Enabled' : 'Disabled'}</b></div>
            <div style={styles.card}>Active sessions<br /><b>{q.data.active_sessions}</b></div>
            <div style={styles.card}>Failed logins<br /><b>{q.data.failed_login_count}</b></div>
            <div style={styles.card}>Last login<br /><b>{formatDate(q.data.last_login_at)}</b></div>
          </div>
        ) : q.isLoading ? 'Loading…' : null}
      </section>

      <section style={styles.panel}>
        <h2>Change password</h2>
        <div style={styles.form}>
          <input style={styles.input} type="password" placeholder="Current password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} />
          <input style={styles.input} type="password" placeholder="New password" value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} />
          <button style={styles.button} onClick={() => change.mutate()} disabled={change.isPending}>Change password</button>
        </div>
        {change.isSuccess ? <p style={styles.success}>Password changed. Existing sessions were revoked.</p> : null}
        {change.error ? <p style={styles.error}>{change.error instanceof Error ? change.error.message : 'Password change failed'}</p> : null}
      </section>

      <section style={styles.panel}>
        <h2>MFA</h2>
        <button style={styles.button} onClick={() => setupMfa.mutate()} disabled={setupMfa.isPending}>Start MFA setup</button>{' '}
        <button style={styles.button} onClick={() => disable.mutate()} disabled={disable.isPending}>Disable MFA</button>
        {setup ? (
          <div style={styles.mfaSetup}>
            <div>
              <h3 style={styles.mfaTitle}>Scan this QR code</h3>
              <p style={styles.muted}>Use Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app.</p>
              <img
                src={qrCodeSvg.createQrSvgDataUri(setup.otpauth_url)}
                alt="Authenticator app setup QR code"
                style={styles.qrCode}
              />
            </div>
            <div style={styles.secretBox}>
              <b>Manual setup key</b>
              <code style={styles.secretCode}>{setup.secret}</code>
              <p style={styles.muted}>Use this only if your authenticator app cannot scan the QR code.</p>
              <p style={styles.muted}>Algorithm: {setup.algorithm || 'SHA1'} · Digits: {setup.digits || 6} · Period: {setup.period_seconds || 30}s</p>
            </div>
          </div>
        ) : null}
        <div style={styles.form}>
          <input style={styles.input} placeholder="6-digit authenticator code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />
          <button style={styles.button} onClick={() => confirm.mutate()} disabled={confirm.isPending || mfaCode.trim().length !== 6}>Confirm MFA</button>
        </div>
        {confirm.error ? <p style={styles.error}>{confirm.error instanceof Error ? confirm.error.message : 'MFA confirmation failed'}</p> : null}
      </section>

      {canReadAdminSecurity ? (
        <section style={styles.panel}>
          <h2>Platform staff security review</h2>
          {admin.data ? (
            <>
              <div style={styles.cards}>
                <div style={styles.card}>Total users<br /><b>{admin.data.summary.total_users}</b></div>
                <div style={styles.card}>Active users<br /><b>{admin.data.summary.active_users}</b></div>
                <div style={styles.card}>Locked users<br /><b>{admin.data.summary.locked_users}</b></div>
                <div style={styles.card}>Without MFA<br /><b>{admin.data.summary.users_without_mfa}</b></div>
                <div style={styles.card}>Failed-login users<br /><b>{admin.data.summary.users_with_failed_logins}</b></div>
                <div style={styles.card}>Active sessions<br /><b>{admin.data.summary.active_sessions}</b></div>
              </div>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>User</th><th style={styles.th}>Security state</th><th style={styles.th}>Last login</th><th style={styles.th}>Sessions</th><th style={styles.th}>Actions</th></tr></thead>
                <tbody>
                  {admin.data.users.map((user) => (
                    <tr key={user.id}>
                      <td style={styles.td}><b>{user.name}</b><br /><span style={styles.muted}>{user.email} · {user.role}</span></td>
                      <td style={styles.td}>{user.risk_flags.length ? user.risk_flags.join(', ') : 'ok'}</td>
                      <td style={styles.td}>{formatDate(user.last_login_at)}</td>
                      <td style={styles.td}>{user.active_sessions}</td>
                      <td style={styles.td}>
                        <button style={styles.button} disabled={!canWriteAdminSecurity || unlock.isPending} onClick={() => unlock.mutate(user.id)}>Unlock</button>{' '}
                        <button style={styles.button} disabled={!canWriteAdminSecurity || clearMfa.isPending} onClick={() => clearMfa.mutate(user.id)}>Clear MFA</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : admin.isLoading ? 'Loading security review…' : null}
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  muted: { color: '#6b7280' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)', overflowX: 'auto' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 },
  card: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fafafa' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginTop: 10 },
  input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10 },
  button: { padding: '8px 10px', borderRadius: 10, border: '1px solid #d1d5db', cursor: 'pointer' },
  notice: { background: '#eef2ff', padding: 12, borderRadius: 12, marginTop: 10 },
  mfaSetup: { background: '#eef2ff', padding: 16, borderRadius: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr', gap: 16, alignItems: 'start' },
  mfaTitle: { margin: '0 0 6px' },
  qrCode: { width: 220, height: 220, border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', padding: 8 },
  secretBox: { display: 'flex', flexDirection: 'column', gap: 8 },
  secretCode: { display: 'block', padding: 10, borderRadius: 10, background: '#fff', border: '1px solid #d1d5db', wordBreak: 'break-all' },
  success: { background: '#dcfce7', color: '#166534', borderRadius: 12, padding: 12 },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' },
  td: { padding: 10, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }
};
