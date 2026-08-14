import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { scrollToFormSection } from '../lib/scrollToForm';
import { getCurrentTenantUserId } from '../lib/auth';
import { getRoleCapabilities } from '../lib/permissions';

type UserRole = 'admin' | 'manager' | 'staff';
type RoleSelection = '' | UserRole | `custom:${string}`;

type UserItem = {
  id: string;
  tenant_id: string;
  name: string;
  role: UserRole;
  custom_role_id?: string | null;
  custom_role_name?: string | null;
  access_role?: string;
  access_role_label?: string;
  email: string;
  created_at: string;
  last_login_at?: string | null;
  is_active: boolean;
};

type AssignableRole = {
  key: string;
  role: UserRole;
  custom_role_id?: string;
  label: string;
  description?: string | null;
  kind: 'built_in' | 'custom';
  permission_count?: number;
  user_count?: number;
};

type RoleOptionsResponse = {
  built_in_roles: AssignableRole[];
  custom_roles: AssignableRole[];
};

type UserFormState = {
  name: string;
  email: string;
  roleSelection: RoleSelection;
  password: string;
};

function emptyForm(): UserFormState {
  return {
    name: '',
    email: '',
    roleSelection: '',
    password: ''
  };
}

function rolePayload(selection: RoleSelection): { role: UserRole; custom_role_id: string | null } {
  if (!selection) {
    throw new Error('Role selection is required');
  }
  if (selection.startsWith('custom:')) {
    return { role: 'staff', custom_role_id: selection.slice('custom:'.length) };
  }
  return { role: selection as UserRole, custom_role_id: null };
}

async function fetchUsers(): Promise<UserItem[]> {
  return apiRequest<UserItem[]>('/users');
}

async function fetchRoleOptions(): Promise<RoleOptionsResponse> {
  return apiRequest<RoleOptionsResponse>('/users/role-options');
}

async function createUser(input: UserFormState): Promise<UserItem> {
  return apiRequest<UserItem>('/users', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      ...rolePayload(input.roleSelection),
      password: input.password
    })
  });
}

async function updateUser(input: { id: string; values: UserFormState; preserveRole?: boolean }): Promise<UserItem> {
  return apiRequest<UserItem>(`/users/${input.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: input.values.name.trim(),
      email: input.values.email.trim().toLowerCase(),
      ...(input.preserveRole ? {} : rolePayload(input.values.roleSelection)),
      password: input.values.password.trim() ? input.values.password : undefined
    })
  });
}

async function setUserActiveStatus(input: { id: string; isActive: boolean }): Promise<UserItem> {
  return apiRequest<UserItem>(`/users/${input.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: input.isActive })
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

function isUserActive(user: UserItem): boolean {
  return user.is_active !== false;
}

function formatLastLogin(value?: string | null): string {
  return value ? formatDateTime(value) : 'Never';
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
  /*
    Users administration is tenant-scoped and permission-gated.
    This page supports the existing built-in/custom-role assignment model plus
    the tenant user active-status lifecycle already enforced by authentication.
    Deactivation is the normal access-removal path; permanent deletion remains
    available but can be rejected when historical records retain the user.
  */
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { canManageUsers } = getRoleCapabilities();
  const canWrite = canManageUsers;
  const currentUserId = getCurrentTenantUserId();

  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  const roleOptionsQuery = useQuery({
    queryKey: ['tenant-user-role-options'],
    queryFn: fetchRoleOptions,
    enabled: canWrite
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-user-role-options'] })
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-user-role-options'] })
      ]);
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to update user.');
    }
  });

  const statusMutation = useMutation({
    mutationFn: setUserActiveStatus,
    onSuccess: async (updatedUser) => {
      setPageError(null);
      setPageMessage(updatedUser.is_active !== false ? 'User activated successfully.' : 'User deactivated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to update user status.');
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-user-role-options'] })
      ]);
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to delete user.');
    }
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? isUserActive(user) : !isUserActive(user));
      const matchesSearch = !needle ||
        [user.name, user.email, user.access_role_label || user.custom_role_name || user.role]
          .some((value) => value.toLowerCase().includes(needle));

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, users]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(isUserActive).length,
      inactive: users.filter((user) => !isUserActive(user)).length,
      admins: users.filter((user) => user.role === 'admin').length,
      managers: users.filter((user) => user.role === 'manager').length,
      staff: users.filter((user) => user.role === 'staff' && !user.custom_role_id).length,
      custom: users.filter((user) => Boolean(user.custom_role_id)).length
    };
  }, [users]);

  const lastRefreshedText = usersQuery.dataUpdatedAt
    ? `Last refreshed ${formatDateTime(new Date(usersQuery.dataUpdatedAt).toISOString())}`
    : 'Not refreshed yet';

  const normalizedEmail = form.email.trim();
  const passwordReady = editingUser ? !form.password || form.password.length >= 10 : form.password.length >= 10;
  const formReady = Boolean(
    canWrite &&
    form.name.trim() &&
    normalizedEmail.includes('@') &&
    normalizedEmail.includes('.') &&
    passwordReady &&
    form.roleSelection &&
    !roleOptionsQuery.isLoading
  );

  const handleRefreshUsers = async () => {
    setPageError(null);
    setPageMessage(null);

    const result = await usersQuery.refetch();

    if (result.error) {
      setPageError(result.error instanceof Error ? result.error.message : 'Failed to refresh users.');
      return;
    }

    setPageMessage('Users refreshed.');
  };

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
        values: form,
        preserveRole: Boolean(currentUserId && editingUser.id === currentUserId)
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
      roleSelection: (user.custom_role_id ? `custom:${user.custom_role_id}` : user.role) as RoleSelection,
      password: ''
    });
    scrollToFormSection('tenant-user-form-panel');
  };

  const handleStatusChange = (user: UserItem) => {
    if (!canWrite) {
      return;
    }

    const currentlyActive = isUserActive(user);
    if (currentUserId && user.id === currentUserId && currentlyActive) {
      setPageMessage(null);
      setPageError('You cannot deactivate your own user account.');
      return;
    }

    const confirmed = window.confirm(
      currentlyActive
        ? `Deactivate user "${user.name}"? Their active sessions will be revoked and they will no longer be able to sign in.`
        : `Activate user "${user.name}"? They will be allowed to sign in again with their existing credentials.`
    );

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setPageMessage(null);
    statusMutation.mutate({ id: user.id, isActive: !currentlyActive });
  };

  const handleDelete = (user: UserItem) => {
    if (!canWrite) {
      return;
    }

    if (currentUserId && user.id === currentUserId) {
      setPageMessage(null);
      setPageError('You cannot delete your own user account. Backend rejects self-delete to prevent account lockout.');
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete user "${user.name}"? This is not the normal way to remove access. Deactivate the account instead when history must be preserved.`
    );

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
    return <div className="app-empty-state">Loading tenant users…</div>;
  }

  if (usersQuery.isError) {
    return <div className="app-error-state">Failed to load users: {(usersQuery.error as Error).message || 'Unknown error'}</div>;
  }

  return (
    <div style={styles.page}>
      <div className="app-grid-stats" style={styles.summaryGrid}>
        <StatCard title="Users" value={summary.total} subtitle={`${summary.active} active · ${summary.inactive} inactive`} />
        <StatCard title="Admins" value={summary.admins} subtitle="Full tenant control" tone="warn" />
        <StatCard title="Managers" value={summary.managers} subtitle="Operational supervisors" />
        <StatCard title="Staff" value={summary.staff} subtitle="Built-in daily execution users" tone="good" />
        <StatCard title="Custom roles" value={summary.custom} subtitle="Specialized tenant assignments" />
      </div>

      <div
        style={{
          ...styles.contentGrid,
          ...(isMobile ? styles.contentGridMobile : styles.contentGridDesktop)
        }}
      >
        <section id="tenant-user-form-panel" className="app-panel app-panel--padded" style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionHeaderText}>
              <h2 style={styles.sectionTitle}>{editingUser ? 'Edit User' : 'Create User'}</h2>
              <p style={styles.sectionDescription}>
                {canWrite
                  ? 'Create and maintain tenant users with controlled roles.'
                  : 'You can review tenant users, but only tenant admins can change accounts or access.'}
              </p>
            </div>
          </div>

          {!canWrite ? (
            <div className="app-warning-state" style={styles.infoBanner}>
              You can review tenant users here, but only admins can create, edit, or delete accounts.
            </div>
          ) : null}

          {pageMessage ? (
            <div className="app-success-state" style={styles.successBanner}>
              {pageMessage}
            </div>
          ) : null}

          {pageError ? (
            <div className="app-error-state" style={styles.errorBanner}>
              {pageError}
            </div>
          ) : null}

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
                value={form.roleSelection}
                onChange={(event) =>
                  setForm((current) => ({ ...current, roleSelection: event.target.value as RoleSelection }))
                }
                disabled={!canWrite || roleOptionsQuery.isLoading || Boolean(editingUser && currentUserId && editingUser.id === currentUserId)}
              >
                {!editingUser ? <option value="">Select a role…</option> : null}
                <optgroup label="Built-in roles">
                  {(roleOptionsQuery.data?.built_in_roles || [
                    { key: 'staff', role: 'staff', label: 'Staff', kind: 'built_in' as const },
                    { key: 'manager', role: 'manager', label: 'Manager', kind: 'built_in' as const },
                    { key: 'admin', role: 'admin', label: 'Admin', kind: 'built_in' as const }
                  ]).map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </optgroup>
                {roleOptionsQuery.data?.custom_roles.length ? (
                  <optgroup label="Custom roles">
                    {roleOptionsQuery.data.custom_roles.map((option) => (
                      <option key={option.key} value={option.key}>{option.label} · {option.permission_count || 0} permissions</option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              {editingUser && currentUserId && editingUser.id === currentUserId ? <small style={styles.fieldHelp}>Your own role assignment cannot be changed from this form.</small> : null}
              {!editingUser ? <small style={styles.fieldHelp}>Choose access deliberately. Use a custom role when this employee needs narrower job-specific access than the built-in Staff role.</small> : null}
              {roleOptionsQuery.isError ? <small style={styles.fieldHelp}>Custom roles could not be loaded. Built-in roles remain available.</small> : null}
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
                minLength={10}
                maxLength={256}
                disabled={!canWrite}
              />
              <small style={styles.fieldHelp}>
                {editingUser ? 'Leave blank to keep the current password. New passwords must be at least 10 characters.' : 'Minimum 10 characters.'}
              </small>
            </div>

            <div className="app-actions" style={styles.formActions}>
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={!formReady || createMutation.isPending || updateMutation.isPending}
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

        <section className="app-panel app-panel--padded" style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionHeaderText}>
              <h2 style={styles.sectionTitle}>Tenant Users</h2>
              <p style={styles.sectionDescription}>
                Review all user accounts for the current tenant and filter by name, email, or role.
              </p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={handleRefreshUsers}
              disabled={usersQuery.isFetching}
              title="Reload tenant users from the server"
            >
              {usersQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className="app-grid-toolbar" style={styles.toolbarGrid}>
            <input
              aria-label="Search tenant users"
              style={{ ...styles.input, ...styles.searchInput }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or role"
            />
            <select
              aria-label="Filter users by status"
              style={styles.select}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All account statuses</option>
              <option value="active">Active accounts</option>
              <option value="inactive">Inactive accounts</option>
            </select>
            <span style={styles.refreshMeta}>{lastRefreshedText}</span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="app-empty-state" style={styles.emptyState}>
              {users.length === 0
                ? canWrite
                  ? 'No tenant users exist yet. Create the first tenant user from the form.'
                  : 'No tenant users exist yet. Ask a tenant admin to create user accounts.'
                : 'No users matched the current search and status filters. Clear or change the filters to see loaded users.'}
            </div>
          ) : (
            <div style={styles.userList}>
              {filteredUsers.map((user) => (
                <article key={user.id} style={styles.userCard}>
                  <div style={styles.userCardTop}>
                    <div style={styles.userCardIdentity}>
                      <div style={styles.userName}>{user.name}</div>
                      <div style={styles.userEmail}>{user.email}</div>
                    </div>

                    <div style={styles.badgeGroup}>
                      <span
                        style={{
                          ...styles.roleBadge,
                          ...(user.custom_role_id
                            ? styles.roleBadgeCustom
                            : user.role === 'admin'
                              ? styles.roleBadgeAdmin
                              : user.role === 'manager'
                                ? styles.roleBadgeManager
                                : styles.roleBadgeStaff)
                        }}
                      >
                        {(user.access_role_label || user.custom_role_name || user.role).toUpperCase()}
                      </span>
                      {currentUserId && user.id === currentUserId ? <span style={styles.selfBadge}>YOU</span> : null}
                      <span style={{ ...styles.statusBadge, ...(isUserActive(user) ? styles.statusBadgeActive : styles.statusBadgeInactive) }}>
                        {isUserActive(user) ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>

                  <div style={styles.userMetaGrid}>
                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Created</div>
                      <div style={styles.metaValue}>{formatDateTime(user.created_at)}</div>
                    </div>

                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Last login</div>
                      <div style={styles.metaValue}>{formatLastLogin(user.last_login_at)}</div>
                    </div>

                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Access model</div>
                      <div style={styles.metaValue}>{user.custom_role_id ? 'Tenant custom role' : 'Built-in role'}</div>
                    </div>
                  </div>

                  <div className="app-actions" style={styles.userCardActions}>
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
                      style={isUserActive(user) ? styles.deactivateButton : styles.activateButton}
                      onClick={() => handleStatusChange(user)}
                      disabled={
                        !canWrite ||
                        statusMutation.isPending ||
                        Boolean(currentUserId && user.id === currentUserId && isUserActive(user))
                      }
                      title={currentUserId && user.id === currentUserId && isUserActive(user) ? 'You cannot deactivate your own account' : undefined}
                    >
                      {statusMutation.isPending && statusMutation.variables?.id === user.id
                        ? 'Updating…'
                        : isUserActive(user)
                          ? 'Deactivate'
                          : 'Activate'}
                    </button>

                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => handleDelete(user)}
                      disabled={!canWrite || deleteMutation.isPending || Boolean(currentUserId && user.id === currentUserId)}
                      title={currentUserId && user.id === currentUserId ? 'You cannot delete your own account' : 'Permanently delete this account when retention constraints allow it'}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === user.id ? 'Deleting…' : 'Delete'}
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
    marginBottom: '20px',
    minWidth: 0
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
    minWidth: 0,
    overflow: 'hidden'
  },
  sectionHeader: {
    display: 'flex',
    gap: '14px',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: '16px',
    minWidth: 0
  },
  sectionHeaderText: {
    minWidth: 0
  },
  sectionTitle: {
    margin: 0,
    fontSize: '22px',
    lineHeight: 1.1
  },
  sectionDescription: {
    margin: '8px 0 0 0',
    color: '#475569',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  infoBanner: {
    marginBottom: '14px'
  },
  successBanner: {
    marginBottom: '14px'
  },
  errorBanner: {
    marginBottom: '14px'
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
  fieldHelp: { color: '#64748b', fontWeight: 500, lineHeight: 1.4 },
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
    marginTop: '4px',
    minWidth: 0
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
  activateButton: {
    border: '1px solid #86efac',
    borderRadius: '12px',
    padding: '12px 16px',
    background: '#f0fdf4',
    color: '#047857',
    fontWeight: 700,
    cursor: 'pointer'
  },
  deactivateButton: {
    border: '1px solid #fbbf24',
    borderRadius: '12px',
    padding: '12px 16px',
    background: '#fffbeb',
    color: '#92400e',
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
  toolbarGrid: {
    /*
      What changed:
      - Added a dedicated toolbar row for the search control.

      Why:
      - The search field was previously packed directly into the section header,
        which made this page feel less consistent than Products / Suppliers / Storage.

      What problem this solves:
      - Gives the list area the same visual rhythm as the other master-data pages
        without changing any filtering behavior.
    */
    marginBottom: '16px',
    minWidth: 0
  },
  searchInput: {
    /*
      What changed:
      - Removed the hard max-width cap from the search field.

      Why:
      - The page already sits inside the shared centered content container.

      What problem this solves:
      - Prevents the search control from looking artificially narrow and improves consistency with the other pages.
    */
    maxWidth: '100%'
  },
  refreshMeta: {
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.4,
    alignSelf: 'center'
  },
  emptyState: {
    margin: 0
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
    /*
      What changed:
      - Allowed the identity block and role badge to wrap more safely.

      Why:
      - On narrower widths, the badge could crowd the name/email block.

      What problem this solves:
      - Improves mobile and tablet resilience without changing the card structure.
    */
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: '14px'
  },
  userCardIdentity: {
    minWidth: 0,
    flex: '1 1 220px'
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
  badgeGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    maxWidth: '100%'
  },
  roleBadge: {
    padding: '8px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    flexShrink: 0,
    maxWidth: '100%',
    overflowWrap: 'anywhere',
    textAlign: 'center'
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
  roleBadgeCustom: {
    background: '#dbeafe',
    color: '#1d4ed8'
  },
  selfBadge: {
    padding: '8px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    background: '#ede9fe',
    color: '#6d28d9',
    flexShrink: 0
  },
  statusBadge: {
    padding: '8px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    flexShrink: 0
  },
  statusBadgeActive: {
    background: '#dcfce7',
    color: '#047857'
  },
  statusBadgeInactive: {
    background: '#e2e8f0',
    color: '#475569'
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
    minWidth: 0
  }
};