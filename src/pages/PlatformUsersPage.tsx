import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { getPlatformPermissionSnapshot } from '../lib/platformPermissions';

type PlatformUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  mfa_enabled?: boolean;
  last_login_at?: string | null;
  locked_until?: string | null;
};

const roles = [
  'superadmin',
  'support',
  'platform_viewer',
  'support_l1',
  'support_l2',
  'security',
  'billing',
  'ops',
  'tenant_success',
  'readonly_audit'
];

export default function PlatformUsersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', name: '', role: 'platform_viewer', password: '' });
  const q = useQuery({ queryKey: ['platform', 'users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users') });
  const currentPlatformUserId = getPlatformPermissionSnapshot()?.platform_user_id || null;

  const create = useMutation({
    mutationFn: () => platformApiRequest('/platform/users', {
      method: 'POST',
      body: JSON.stringify({
        email: form.email.trim(),
        name: form.name.trim(),
        role: form.role,
        password: form.password
      })
    }),
    onSuccess: async () => {
      setForm({ email: '', name: '', role: 'platform_viewer', password: '' });
      await qc.invalidateQueries({ queryKey: ['platform', 'users'] });
    }
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => platformApiRequest(`/platform/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['platform', 'users'] })
  });

  const revoke = useMutation({ mutationFn: (id: string) => platformApiRequest(`/platform/users/${id}/revoke-sessions`, { method: 'POST' }) });

  const updateForm = (patch: Partial<typeof form>) => {
    if (create.error) {
      create.reset();
    }
    setForm((current) => ({ ...current, ...patch }));
  };

  const createValidation = getCreateValidation(form);
  const canCreate = !createValidation && !create.isPending;

  return (
    <div style={styles.page}>
      <h1>Platform users</h1>
      <p style={styles.muted}>Manage platform staff accounts, roles, activation, and sessions.</p>

      <section style={styles.panel}>
        <h2>Create platform user</h2>
        <div style={styles.form}>
          <label style={styles.field}>
            Email
            <input
              style={styles.input}
              placeholder="platform.user@example.com"
              value={form.email}
              onChange={(event) => updateForm({ email: event.target.value })}
            />
          </label>
          <label style={styles.field}>
            Name
            <input
              style={styles.input}
              placeholder="Platform user name"
              value={form.name}
              onChange={(event) => updateForm({ name: event.target.value })}
            />
          </label>
          <label style={styles.field}>
            Platform role
            <select
              style={styles.input}
              value={form.role}
              onChange={(event) => updateForm({ role: event.target.value })}
            >
              {roles.map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
          <label style={styles.field}>
            Temporary password
            <input
              style={styles.input}
              placeholder="Temporary password"
              type="password"
              value={form.password}
              onChange={(event) => updateForm({ password: event.target.value })}
            />
          </label>
          <button
            style={{ ...styles.button, ...(canCreate ? null : styles.disabledButton) }}
            onClick={() => {
              if (!canCreate) {
                return;
              }
              create.mutate();
            }}
            disabled={!canCreate}
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
        {createValidation ? <div style={styles.warning}>{createValidation}</div> : null}
        {create.error ? <div style={styles.error}>{create.error instanceof Error ? create.error.message : 'Create failed'}</div> : null}
      </section>

      <section style={styles.panel}>
        <h2>Users</h2>
        {q.isLoading ? 'Loading…' : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Security</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(q.data || []).map((user) => {
                const isCurrentUser = currentPlatformUserId === user.id;
                const selfDeactivateBlocked = isCurrentUser && user.is_active;

                return (
                  <tr key={user.id}>
                    <td style={styles.td}>{user.name}{isCurrentUser ? ' (you)' : ''}</td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      <select
                        value={user.role}
                        disabled={patch.isPending}
                        onChange={(event) => patch.mutate({ id: user.id, body: { role: event.target.value } })}
                      >
                        {roles.map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </td>
                    <td style={styles.td}>{user.is_active ? 'Active' : 'Disabled'}</td>
                    <td style={styles.td}>{user.mfa_enabled ? 'MFA on' : 'MFA off'}{user.locked_until ? ` / locked until ${user.locked_until}` : ''}</td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.button, ...(selfDeactivateBlocked || patch.isPending ? styles.disabledButton : null) }}
                        disabled={selfDeactivateBlocked || patch.isPending}
                        title={selfDeactivateBlocked ? 'You cannot deactivate your own platform account.' : undefined}
                        onClick={() => patch.mutate({ id: user.id, body: { is_active: !user.is_active } })}
                      >
                        {user.is_active ? 'Disable' : 'Activate'}
                      </button>{' '}
                      <button style={styles.button} disabled={revoke.isPending} onClick={() => revoke.mutate(user.id)}>Revoke sessions</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {patch.error ? <div style={styles.error}>{patch.error instanceof Error ? patch.error.message : 'Platform user update failed'}</div> : null}
        {revoke.error ? <div style={styles.error}>{revoke.error instanceof Error ? revoke.error.message : 'Session revocation failed'}</div> : null}
      </section>
    </div>
  );
}

function getCreateValidation(form: { email: string; name: string; password: string }) {
  if (!form.email.trim()) {
    return 'Enter an email before creating a platform user.';
  }
  if (!form.name.trim()) {
    return 'Enter a name before creating a platform user.';
  }
  if (!form.password) {
    return 'Enter a temporary password before creating a platform user.';
  }
  return '';
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  muted: { color: '#64748b', margin: '4px 0', lineHeight: 1.5 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', overflowX: 'auto', minWidth: 0 },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, color: '#334155', fontSize: 13 },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, width: '100%', boxSizing: 'border-box', background: '#fff', color: '#0f172a' },
  button: { padding: '9px 13px', borderRadius: 9, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 1px 2px rgba(15,23,42,.05)' },
  disabledButton: { cursor: 'not-allowed', opacity: 0.55, background: '#e2e8f0', borderColor: '#cbd5e1', color: '#64748b', boxShadow: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', color: '#334155' },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' },
  td: { padding: '12px 8px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  warning: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginTop: 10 },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: 12, marginTop: 10 }
};
