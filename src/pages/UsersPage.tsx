import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

type UserRoleOption = 'admin' | 'manager' | 'staff';

type UserRow = {
  id: string;
  tenant_id: string;
  name: string;
  role: UserRoleOption;
  email: string;
  created_at: string;
};

type UserDraft = {
  name: string;
  email: string;
  role: UserRoleOption;
  password: string;
};

const emptyDraft: UserDraft = {
  name: '',
  email: '',
  role: 'staff',
  password: ''
};

async function fetchUsers(): Promise<UserRow[]> {
  return apiRequest<UserRow[]>('/users');
}

async function createUser(payload: UserDraft): Promise<UserRow> {
  return apiRequest<UserRow>('/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function updateUser(payload: UserDraft & { id: string }): Promise<UserRow> {
  return apiRequest<UserRow>(`/users/${payload.id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function deleteUser(userId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/${userId}`, {
    method: 'DELETE'
  });
}

function toReadableError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
}

function roleBadgeStyle(role: UserRoleOption): CSSProperties {
  if (role === 'admin') {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }

  if (role === 'manager') {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }

  return { ...styles.badge, background: '#dbeafe', color: '#1d4ed8' };
}

function StatCard(props: { title: string; value: string; subtitle: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={styles.statValue}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function UsersPage() {
  /*
    WHAT CHANGED
    ------------
    Added a frontend user-management surface on top of the existing /users
    backend routes already present in your API.

    WHY IT CHANGED
    --------------
    The backend already supports tenant-scoped user lifecycle management, but
    the frontend snapshot had no Users page at all.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This closes a major product gap by letting managers/admins review users,
    while admins can create, edit, and delete accounts from the UI.
  */
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();

  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      setFeedback('User created successfully.');
      setDraft(emptyDraft);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      setFeedback('User updated successfully.');
      setDraft(emptyDraft);
      setEditingUserId(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      setFeedback('User deleted successfully.');
      if (editingUserId) {
        setDraft(emptyDraft);
        setEditingUserId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const rows = usersQuery.data ?? [];

  const summary = useMemo(() => {
    const admins = rows.filter((row) => row.role === 'admin').length;
    const managers = rows.filter((row) => row.role === 'manager').length;
    const staff = rows.filter((row) => row.role === 'staff').length;

    return { admins, managers, staff };
  }, [rows]);

  const mutationError =
    createUserMutation.error || updateUserMutation.error || deleteUserMutation.error || null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback('');

    if (!capabilities.canManageUsers) {
      return;
    }

    if (editingUserId) {
      await updateUserMutation.mutateAsync({ id: editingUserId, ...draft });
      return;
    }

    await createUserMutation.mutateAsync(draft);
  };

  const handleEdit = (user: UserRow) => {
    setFeedback('');
    setEditingUserId(user.id);
    setDraft({
      name: user.name,
      email: user.email,
      role: user.role,
      password: ''
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setDraft(emptyDraft);
    setFeedback('');
  };

  return (
    <div style={styles.page}>
      <section style={styles.statsGrid}>
        <StatCard title="Total Users" value={String(rows.length)} subtitle="Tenant-scoped accounts visible through /users." />
        <StatCard title="Admins" value={String(summary.admins)} subtitle="Highest-privilege accounts." />
        <StatCard title="Managers" value={String(summary.managers)} subtitle="Supervisory and reporting access." />
        <StatCard title="Staff" value={String(summary.staff)} subtitle="Operational day-to-day users." />
      </section>

      <section style={styles.grid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}>Tenant Users</h3>
              <p style={styles.panelSubtitle}>
                Managers can review users. Admins can create, edit, and delete accounts.
              </p>
            </div>
          </div>

          {usersQuery.isLoading ? <div style={styles.infoState}>Loading users...</div> : null}
          {usersQuery.isError ? <div style={styles.errorState}>{toReadableError(usersQuery.error)}</div> : null}

          {!usersQuery.isLoading && !usersQuery.isError ? (
            rows.length > 0 ? (
              <div style={styles.list}>
                {rows.map((user) => (
                  <article key={user.id} style={styles.userCard}>
                    <div style={styles.userCardTop}>
                      <div>
                        <div style={styles.userName}>{user.name}</div>
                        <div style={styles.userEmail}>{user.email}</div>
                      </div>
                      <span style={roleBadgeStyle(user.role)}>{user.role.toUpperCase()}</span>
                    </div>

                    <div style={styles.metaGrid}>
                      <div>
                        <div style={styles.metaLabel}>Created</div>
                        <div style={styles.metaValue}>{formatDateTime(user.created_at)}</div>
                      </div>
                      <div>
                        <div style={styles.metaLabel}>User ID</div>
                        <div style={styles.metaValueMono}>{user.id}</div>
                      </div>
                    </div>

                    {capabilities.canManageUsers ? (
                      <div style={styles.actionRow}>
                        <button type="button" style={styles.secondaryButton} onClick={() => handleEdit(user)}>
                          Edit User
                        </button>
                        <button
                          type="button"
                          style={styles.dangerButton}
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          disabled={deleteUserMutation.isPending}
                        >
                          Delete User
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div style={styles.infoState}>No users were returned for this tenant.</div>
            )
          ) : null}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}>{editingUserId ? 'Edit User' : 'Create User'}</h3>
              <p style={styles.panelSubtitle}>
                {capabilities.canManageUsers
                  ? 'Admin-only write actions stay aligned with the backend role model.'
                  : 'Your current role can review users but cannot change them.'}
              </p>
            </div>
          </div>

          {!capabilities.canManageUsers ? (
            <div style={styles.warningState}>
              Create, update, and delete actions are admin-only. This page still shows the current tenant user list for review.
            </div>
          ) : null}

          {feedback ? <div style={styles.successState}>{feedback}</div> : null}
          {mutationError ? <div style={styles.errorState}>{toReadableError(mutationError)}</div> : null}

          <form style={styles.form} onSubmit={handleSubmit}>
            <label style={styles.label}>
              Full Name
              <input
                style={styles.input}
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                disabled={!capabilities.canManageUsers}
                required
              />
            </label>

            <label style={styles.label}>
              Email
              <input
                style={styles.input}
                type="email"
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                disabled={!capabilities.canManageUsers}
                required
              />
            </label>

            <label style={styles.label}>
              Role
              <select
                style={styles.input}
                value={draft.role}
                onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as UserRoleOption }))}
                disabled={!capabilities.canManageUsers}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </label>

            <label style={styles.label}>
              {editingUserId ? 'Password (leave blank to keep current password)' : 'Password'}
              <input
                style={styles.input}
                type="password"
                value={draft.password}
                onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                disabled={!capabilities.canManageUsers}
                required={!editingUserId}
              />
            </label>

            <div style={styles.actionRow}>
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={!capabilities.canManageUsers || createUserMutation.isPending || updateUserMutation.isPending}
              >
                {editingUserId ? 'Save User' : 'Create User'}
              </button>

              {editingUserId ? (
                <button type="button" style={styles.secondaryButton} onClick={handleCancelEdit}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  statCard: { background: '#fff', borderRadius: '16px', padding: '18px', border: '1px solid #e5e7eb' },
  statTitle: { color: '#64748b', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  statValue: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' },
  statSubtitle: { marginTop: '8px', color: '#475569', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.9fr)', gap: '20px' },
  panel: { background: '#fff', borderRadius: '18px', border: '1px solid #e5e7eb', padding: '20px', display: 'grid', gap: '16px' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  panelTitle: { margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' },
  panelSubtitle: { margin: '8px 0 0 0', color: '#475569', lineHeight: 1.5 },
  list: { display: 'grid', gap: '14px' },
  userCard: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', display: 'grid', gap: '14px' },
  userCardTop: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' },
  userName: { fontWeight: 800, color: '#0f172a', fontSize: '1rem' },
  userEmail: { marginTop: '4px', color: '#475569' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  metaLabel: { color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' },
  metaValue: { marginTop: '4px', color: '#0f172a' },
  metaValueMono: { marginTop: '4px', color: '#0f172a', fontFamily: 'monospace', wordBreak: 'break-all' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em' },
  form: { display: 'grid', gap: '14px' },
  label: { display: 'grid', gap: '8px', color: '#334155', fontWeight: 600 },
  input: { border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px', fontSize: '0.95rem' },
  actionRow: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  primaryButton: { border: 'none', background: '#0f172a', color: '#fff', borderRadius: '12px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: '12px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer' },
  dangerButton: { border: 'none', background: '#dc2626', color: '#fff', borderRadius: '12px', padding: '12px 16px', fontWeight: 700, cursor: 'pointer' },
  successState: { background: '#dcfce7', color: '#166534', borderRadius: '12px', padding: '12px 14px', fontWeight: 700 },
  warningState: { background: '#fef3c7', color: '#92400e', borderRadius: '12px', padding: '12px 14px', lineHeight: 1.5 },
  errorState: { background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px 14px', lineHeight: 1.5 },
  infoState: { background: '#f8fafc', color: '#475569', borderRadius: '12px', padding: '12px 14px' }
};
