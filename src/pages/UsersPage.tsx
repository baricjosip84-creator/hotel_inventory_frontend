
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getAccessToken } from '../lib/auth';

type UserRole = 'admin' | 'manager' | 'staff';

type UserItem = {
  id: string;
  tenant_id: string;
  name: string;
  role: UserRole;
  email: string;
  created_at: string;
};

type UserFormState = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getCurrentUserRole(): UserRole | null {
  const payload = decodeJwtPayload(getAccessToken());
  const role = payload?.role;

  if (role === 'admin' || role === 'manager' || role === 'staff') {
    return role;
  }

  return null;
}

function emptyForm(): UserFormState {
  return {
    name: '',
    email: '',
    role: 'staff',
    password: ''
  };
}

async function fetchUsers(): Promise<UserItem[]> {
  return apiRequest<UserItem[]>('/users');
}

async function createUser(input: UserFormState): Promise<UserItem> {
  return apiRequest<UserItem>('/users', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      password: input.password
    })
  });
}

async function updateUser(input: { id: string; values: UserFormState }): Promise<UserItem> {
  return apiRequest<UserItem>(`/users/${input.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: input.values.name.trim(),
      email: input.values.email.trim().toLowerCase(),
      role: input.values.role,
      password: input.values.password.trim() ? input.values.password : undefined
    })
  });
}

async function deleteUser(id: string): Promise<void> {
  await apiRequest(`/users/${id}`, {
    method: 'DELETE'
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function useIsMobile(breakpoint = 960): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const valueStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const currentRole = useMemo(() => getCurrentUserRole(), []);
  const canWrite = currentRole === 'admin';

  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      /*
        What changed:
        - Reset the form cleanly after creation.
        - Keep the page width stable by avoiding any post-submit layout branching.

        Why:
        - The user reported that the create form felt unstable and visually messy on mobile.

        What problem this solves:
        - Keeps the page predictable after user creation.
      */
      setForm(emptyForm());
      setEditingUser(null);
      setPageError(null);
      setPageMessage('User created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to create user.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      setForm(emptyForm());
      setEditingUser(null);
      setPageError(null);
      setPageMessage('User updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to update user.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('User deleted successfully.');
      if (editingUser) {
        setEditingUser(null);
        setForm(emptyForm());
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to delete user.');
    }
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.role].some((value) => value.toLowerCase().includes(needle))
    );
  }, [search, users]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === 'admin').length,
      managers: users.filter((user) => user.role === 'manager').length,
      staff: users.filter((user) => user.role === 'staff').length
    };
  }, [users]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);
    setPageMessage(null);

    if (!canWrite) {
      setPageError('Only admins can create or update users.');
      return;
    }

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        values: form
      });
      return;
    }

    createMutation.mutate(form);
  };

  const handleEdit = (user: UserItem) => {
    if (!canWrite) {
      return;
    }

    setEditingUser(user);
    setPageError(null);
    setPageMessage(null);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: ''
    });
  };

  const handleDelete = (user: UserItem) => {
    if (!canWrite) {
      return;
    }

    const confirmed = window.confirm(`Delete user "${user.name}"?`);

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setPageMessage(null);
    deleteMutation.mutate(user.id);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setPageError(null);
    setPageMessage(null);
  };

  if (usersQuery.isLoading) {
    return <p>Loading users...</p>;
  }

  if (usersQuery.isError) {
    return <p>Failed to load users: {(usersQuery.error as Error).message || 'Unknown error'}</p>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.summaryGrid}>
        <StatCard title="Users" value={summary.total} subtitle="Tenant user accounts" />
        <StatCard title="Admins" value={summary.admins} subtitle="Full platform control" tone="warn" />
        <StatCard title="Managers" value={summary.managers} subtitle="Operational supervisors" />
        <StatCard title="Staff" value={summary.staff} subtitle="Daily execution users" tone="good" />
      </div>

      <div
        style={{
          ...styles.contentGrid,
          ...(isMobile ? styles.contentGridMobile : styles.contentGridDesktop)
        }}
      >
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>{editingUser ? 'Edit User' : 'Create User'}</h2>
              <p style={styles.sectionDescription}>
                {canWrite
                  ? 'Create and maintain tenant users with controlled roles.'
                  : 'Managers can review users, but only admins can change access.'}
              </p>
            </div>
          </div>

          {!canWrite ? (
            <div style={styles.infoBanner}>
              You can review tenant users here, but only admins can create, edit, or delete accounts.
            </div>
          ) : null}

          {pageMessage ? <div style={styles.successBanner}>{pageMessage}</div> : null}
          {pageError ? <div style={styles.errorBanner}>{pageError}</div> : null}

          <form style={styles.form} onSubmit={handleSubmit}>
            <div style={styles.formField}>
              <label htmlFor="user-name" style={styles.label}>
                Name
              </label>
              <input
                id="user-name"
                style={styles.input}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Full user name"
                required
                disabled={!canWrite}
              />
            </div>

            <div style={styles.formField}>
              <label htmlFor="user-email" style={styles.label}>
                Email
              </label>
              <input
                id="user-email"
                type="email"
                style={styles.input}
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="user@example.com"
                required
                disabled={!canWrite}
              />
            </div>

            <div style={styles.formField}>
              <label htmlFor="user-role" style={styles.label}>
                Role
              </label>
              <select
                id="user-role"
                style={styles.select}
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({ ...current, role: event.target.value as UserRole }))
                }
                disabled={!canWrite}
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={styles.formField}>
              <label htmlFor="user-password" style={styles.label}>
                {editingUser ? 'New Password (optional)' : 'Password'}
              </label>
              <input
                id="user-password"
                type="password"
                style={styles.input}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingUser ? 'Leave blank to keep current password' : 'Create a password'}
                required={!editingUser}
                disabled={!canWrite}
              />
            </div>

            <div style={styles.formActions}>
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={!canWrite || createMutation.isPending || updateMutation.isPending}
              >
                {editingUser
                  ? updateMutation.isPending
                    ? 'Saving…'
                    : 'Save User'
                  : createMutation.isPending
                    ? 'Creating…'
                    : 'Create User'}
              </button>

              {editingUser ? (
                <button type="button" style={styles.secondaryButton} onClick={handleCancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section style={styles.panel}>
          <div
            style={{
              ...styles.sectionHeader,
              ...(isMobile ? styles.sectionHeaderMobile : styles.sectionHeaderDesktop)
            }}
          >
            <div>
              <h2 style={styles.sectionTitle}>Tenant Users</h2>
              <p style={styles.sectionDescription}>
                Review all user accounts for the current tenant and filter by name, email, or role.
              </p>
            </div>

            <input
              style={{ ...styles.input, ...styles.searchInput }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>No users matched the current search.</div>
          ) : (
            <div style={styles.userList}>
              {filteredUsers.map((user) => (
                <article key={user.id} style={styles.userCard}>
                  <div style={styles.userCardTop}>
                    <div>
                      <div style={styles.userName}>{user.name}</div>
                      <div style={styles.userEmail}>{user.email}</div>
                    </div>

                    <span
                      style={{
                        ...styles.roleBadge,
                        ...(user.role === 'admin'
                          ? styles.roleBadgeAdmin
                          : user.role === 'manager'
                            ? styles.roleBadgeManager
                            : styles.roleBadgeStaff)
                      }}
                    >
                      {user.role.toUpperCase()}
                    </span>
                  </div>

                  <div style={styles.userMetaGrid}>
                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Created</div>
                      <div style={styles.metaValue}>{formatDateTime(user.created_at)}</div>
                    </div>

                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Tenant</div>
                      <div style={styles.metaValue}>{user.tenant_id}</div>
                    </div>
                  </div>

                  <div style={styles.userCardActions}>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => handleEdit(user)}
                      disabled={!canWrite}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => handleDelete(user)}
                      disabled={!canWrite || deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Working…' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '16px'
  },
  statTitle: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700,
    color: '#64748b',
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '30px',
    fontWeight: 800,
    color: '#0f172a'
  },
  statValueGood: {
    fontSize: '30px',
    fontWeight: 800,
    color: '#047857'
  },
  statValueWarn: {
    fontSize: '30px',
    fontWeight: 800,
    color: '#b45309'
  },
  statSubtitle: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.4
  },
  contentGrid: {
    display: 'grid',
    gap: '20px',
    width: '100%',
    minWidth: 0,
    alignItems: 'start'
  },
  contentGridDesktop: {
    gridTemplateColumns: 'minmax(0, 380px) minmax(0, 1fr)'
  },
  contentGridMobile: {
    gridTemplateColumns: '1fr'
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '18px',
    padding: '16px',
    minWidth: 0,
    overflow: 'hidden'
  },
  sectionHeader: {
    display: 'flex',
    gap: '14px',
    justifyContent: 'space-between',
    marginBottom: '16px'
  },
  sectionHeaderDesktop: {
    alignItems: 'center'
  },
  sectionHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '22px',
    lineHeight: 1.1
  },
  sectionDescription: {
    margin: '8px 0 0 0',
    color: '#475569',
    lineHeight: 1.5
  },
  infoBanner: {
    background: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '14px',
    lineHeight: 1.5
  },
  successBanner: {
    background: '#ecfdf5',
    color: '#047857',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '14px',
    lineHeight: 1.5
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '14px',
    lineHeight: 1.5
  },
  form: {
    display: 'grid',
    gap: '14px',
    width: '100%',
    minWidth: 0
  },
  formField: {
    display: 'grid',
    gap: '8px',
    minWidth: 0
  },
  label: {
    fontWeight: 700,
    color: '#334155'
  },
  input: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    fontSize: '15px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    fontSize: '15px',
    boxSizing: 'border-box'
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '4px'
  },
  primaryButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px 16px',
    background: '#ffffff',
    color: '#0f172a',
    fontWeight: 700,
    cursor: 'pointer'
  },
  deleteButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    background: '#ef4444',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  searchInput: {
    maxWidth: '320px'
  },
  emptyState: {
    border: '1px dashed #cbd5e1',
    borderRadius: '14px',
    padding: '18px',
    color: '#64748b',
    background: '#f8fafc'
  },
  userList: {
    display: 'grid',
    gap: '14px'
  },
  userCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '16px',
    background: '#f8fafc',
    minWidth: 0
  },
  userCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '14px'
  },
  userName: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  userEmail: {
    marginTop: '6px',
    color: '#475569',
    wordBreak: 'break-word'
  },
  roleBadge: {
    padding: '8px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    flexShrink: 0
  },
  roleBadgeAdmin: {
    background: '#fee2e2',
    color: '#b91c1c'
  },
  roleBadgeManager: {
    background: '#fef3c7',
    color: '#b45309'
  },
  roleBadgeStaff: {
    background: '#dcfce7',
    color: '#047857'
  },
  userMetaGrid: {
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    marginBottom: '14px',
    minWidth: 0
  },
  metaItem: {
    minWidth: 0
  },
  metaLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
    marginBottom: '6px',
    fontWeight: 700
  },
  metaValue: {
    color: '#0f172a',
    lineHeight: 1.45,
    wordBreak: 'break-word'
  },
  userCardActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  }
};
