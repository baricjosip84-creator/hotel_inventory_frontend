import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

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
      <p style={styles.muted}>Manage HLA/platform staff accounts, roles, activation, and sessions.</p>

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
              {(q.data || []).map((user) => (
                <tr key={user.id}>
                  <td style={styles.td}>{user.name}</td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>
                    <select value={user.role} onChange={(event) => patch.mutate({ id: user.id, body: { role: event.target.value } })}>
                      {roles.map((role) => <option key={role}>{role}</option>)}
                    </select>
                  </td>
                  <td style={styles.td}>{user.is_active ? 'Active' : 'Disabled'}</td>
                  <td style={styles.td}>{user.mfa_enabled ? 'MFA on' : 'MFA off'}{user.locked_until ? ` / locked until ${user.locked_until}` : ''}</td>
                  <td style={styles.td}>
                    <button style={styles.button} onClick={() => patch.mutate({ id: user.id, body: { is_active: !user.is_active } })}>{user.is_active ? 'Disable' : 'Activate'}</button>{' '}
                    <button style={styles.button} onClick={() => revoke.mutate(user.id)}>Revoke sessions</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  muted: { color: '#6b7280' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)', overflowX: 'auto' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, alignItems: 'end' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700 },
  input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10, width: '100%', boxSizing: 'border-box' },
  button: { padding: '8px 10px', borderRadius: 10, border: '1px solid #d1d5db', cursor: 'pointer' },
  disabledButton: { cursor: 'not-allowed', opacity: 0.6 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' },
  td: { padding: 10, borderBottom: '1px solid #f3f4f6' },
  warning: { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 12, padding: 12, marginTop: 10 },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12, marginTop: 10 }
};
