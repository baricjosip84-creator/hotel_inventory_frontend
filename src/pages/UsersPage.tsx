import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { scrollToFormSection } from '../lib/scrollToForm';
import { getCurrentTenantUserId } from '../lib/auth';
import { getRoleCapabilities } from '../lib/permissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './UsersPage.css';

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

type UserFormFieldErrors = Partial<Record<'name' | 'email' | 'roleSelection' | 'password', string>>;

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


function getMutationFieldErrors(error: unknown): UserFormFieldErrors {
  if (!(error instanceof ApiError)) return {};

  const message = error.message.toLowerCase();
  if (error.code === 'UNIQUE_CONSTRAINT_VIOLATION' || message.includes('same unique value') || message.includes('email already')) {
    return { email: 'This email is already used by another tenant user.' };
  }
  if (error.code === 'INVALID_USER_ROLE' || error.code?.includes('CUSTOM_ROLE') || message.includes('role')) {
    return { roleSelection: error.message };
  }
  if (message.includes('password')) {
    return { password: error.message };
  }
  if (message.includes('email')) {
    return { email: error.message };
  }
  return {};
}

function validateUserForm(values: UserFormState, editing: boolean): UserFormFieldErrors {
  const errors: UserFormFieldErrors = {};
  const email = values.email.trim();

  if (!values.name.trim()) errors.name = "Enter the user's name.";
  if (!email || !email.includes('@') || !email.includes('.')) errors.email = 'Enter a valid email address.';
  if (!values.roleSelection) errors.roleSelection = 'Select an access role.';
  if ((!editing || values.password) && values.password.length < 10) {
    errors.password = 'Password must contain at least 10 characters.';
  }

  return errors;
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
  const { canManageUsers } = getRoleCapabilities();
  const canWrite = canManageUsers;
  const currentUserId = getCurrentTenantUserId();

  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<UserFormFieldErrors>({});
  const [workspaceSection, setWorkspaceSection] = useState<'directory' | 'form'>('directory');

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
      setFieldErrors({});
      setShowPassword(false);
      setWorkspaceSection('directory');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-user-role-options'] })
      ]);
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to create user.');
      setFieldErrors(getMutationFieldErrors(error));
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      setForm(emptyForm());
      setEditingUser(null);
      setPageError(null);
      setPageMessage('User updated successfully.');
      setFieldErrors({});
      setShowPassword(false);
      setWorkspaceSection('directory');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-user-role-options'] })
      ]);
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to update user.');
      setFieldErrors(getMutationFieldErrors(error));
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
      activeAdmins: users.filter((user) => user.role === 'admin' && isUserActive(user)).length,
      managers: users.filter((user) => user.role === 'manager').length,
      staff: users.filter((user) => user.role === 'staff' && !user.custom_role_id).length,
      custom: users.filter((user) => Boolean(user.custom_role_id)).length
    };
  }, [users]);

  const editingOwnRole = Boolean(editingUser && currentUserId && editingUser.id === currentUserId);
  const editingOnlyActiveAdmin = Boolean(
    editingUser &&
    editingUser.role === 'admin' &&
    isUserActive(editingUser) &&
    summary.activeAdmins === 1
  );
  const roleAssignmentLocked = editingOwnRole || editingOnlyActiveAdmin;

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

    const validationErrors = validateUserForm(form, Boolean(editingUser));
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

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
    setFieldErrors({});
    setShowPassword(false);
    setWorkspaceSection('form');
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
      setPageError('You cannot delete your own user account.');
      return;
    }

    if (isUserActive(user)) {
      setPageMessage(null);
      setPageError('Deactivate this user before permanently deleting the account.');
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete inactive user "${user.name}"? This cannot be undone and may still be blocked when business history references this account.`
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
    setFieldErrors({});
    setShowPassword(false);
    setWorkspaceSection('directory');
  };

  const handleStartCreate = () => {
    if (!canWrite) return;
    setEditingUser(null);
    setForm(emptyForm());
    setFieldErrors({});
    setPageError(null);
    setPageMessage(null);
    setShowPassword(false);
    setWorkspaceSection('form');
    scrollToFormSection('tenant-user-form-panel');
  };

  const handleOpenDirectory = () => {
    setWorkspaceSection('directory');
    scrollToFormSection('tenant-user-directory-panel');
  };

  const handleOpenForm = () => {
    if (!canWrite) return;
    setWorkspaceSection('form');
    scrollToFormSection('tenant-user-form-panel');
  };

  if (usersQuery.isLoading) {
    return <div className="app-empty-state">Loading tenant users…</div>;
  }

  if (usersQuery.isError) {
    return <div className="app-error-state">Failed to load users: {(usersQuery.error as Error).message || 'Unknown error'}</div>;
  }

  return (
    <div className="users-page io-operational-page io-workspace-page" id="tenant-users-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/users"
        eyebrow="People & access"
        title="Tenant user management"
        description="Create, review, and maintain tenant user accounts and access roles. Deactivation is the normal way to remove access while preserving business history."
        meta={
          <>
            <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Role-based access</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Session revocation on deactivation</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          canWrite ? (
            <button
              type="button"
              className="app-button app-button--primary"
              onClick={handleStartCreate}
            >
              Create user
            </button>
          ) : <OperationalWorkspaceStatus value={summary.active} label="active tenant users" />
        }
      />

      <OperationalWorkspaceStats ariaLabel="Tenant user overview">
        <OperationalWorkspaceStatCard label="Total users" value={summary.total} helper={`${summary.active} active · ${summary.inactive} inactive`} tone="slate" iconPath="/users" />
        <OperationalWorkspaceStatCard label="Active users" value={summary.active} helper="Accounts currently allowed to sign in" tone="good" iconPath="/sessions" />
        <OperationalWorkspaceStatCard label="Inactive users" value={summary.inactive} helper="Access removed; history retained" tone={summary.inactive > 0 ? 'neutral' : 'good'} iconPath="/sessions" />
        <OperationalWorkspaceStatCard label="Admins" value={summary.admins} helper={`${summary.activeAdmins} active tenant administrators`} tone="warn" iconPath="/permissions" />
        <OperationalWorkspaceStatCard label="Managers" value={summary.managers} helper="Built-in operational supervisors" tone="blue" iconPath="/users" />
        <OperationalWorkspaceStatCard label="Custom-role users" value={summary.custom} helper="Users assigned job-specific tenant roles" tone="neutral" iconPath="/permissions" />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel="User management work areas" hint="Review accounts or jump directly to the user form.">
        <OperationalWorkspaceTab
          active={workspaceSection === 'directory'}
          iconPath="/users"
          label="User directory"
          count={filteredUsers.length}
          onClick={handleOpenDirectory}
        />
        <OperationalWorkspaceTab
          active={workspaceSection === 'form'}
          iconPath="/permissions"
          label={editingUser ? 'Edit user' : 'Create user'}
          disabled={!canWrite}
          onClick={handleOpenForm}
        />
      </OperationalWorkspaceTabs>

      {pageMessage ? <div className="app-success-state users-page-message" role="status">{pageMessage}</div> : null}
      {pageError ? <div className="app-error-state users-page-message" role="alert">{pageError}</div> : null}

      <section id="tenant-user-directory-panel" className="app-panel users-panel users-directory-panel">
        <OperationalSectionHeader
          iconPath="/users"
          title="Tenant user directory"
          description="Find user accounts, review their access model and activity, and manage the account lifecycle."
          actions={
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={handleRefreshUsers}
              disabled={usersQuery.isFetching}
            >
              {usersQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        <div className="users-toolbar">
          <label className="users-field users-field--search">
            <span>Search users</span>
            <input
              aria-label="Search tenant users"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, or role"
            />
          </label>
          <label className="users-field users-field--status">
            <span>Account status</span>
            <select
              aria-label="Filter users by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All account statuses</option>
              <option value="active">Active accounts</option>
              <option value="inactive">Inactive accounts</option>
            </select>
          </label>
          <div className="users-refresh-meta">{lastRefreshedText}</div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="app-empty-state users-empty-state">
            {users.length === 0
              ? canWrite
                ? 'No tenant users exist yet. Create the first tenant user below.'
                : 'No tenant users exist yet. Ask a tenant admin to create user accounts.'
              : 'No users matched the current search and status filters.'}
          </div>
        ) : (
          <div className="users-card-grid">
            {filteredUsers.map((user) => {
              const self = Boolean(currentUserId && user.id === currentUserId);
              const active = isUserActive(user);
              const onlyActiveAdmin = user.role === 'admin' && active && summary.activeAdmins === 1;

              return (
                <article key={user.id} className={`users-card${active ? '' : ' users-card--inactive'}`}>
                  <div className="users-card__top">
                    <div className="users-card__identity">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="users-card__badges">
                      <span className={`users-badge users-badge--role users-badge--${user.custom_role_id ? 'custom' : user.role}`}>
                        {(user.access_role_label || user.custom_role_name || user.role).toUpperCase()}
                      </span>
                      {self ? <span className="users-badge users-badge--self">YOU</span> : null}
                      <span className={`users-badge users-badge--${active ? 'active' : 'inactive'}`}>{active ? 'ACTIVE' : 'INACTIVE'}</span>
                    </div>
                  </div>

                  <div className="users-card__meta">
                    <div><span>Created</span><strong>{formatDateTime(user.created_at)}</strong></div>
                    <div><span>Last login</span><strong>{formatLastLogin(user.last_login_at)}</strong></div>
                    <div><span>Access model</span><strong>{user.custom_role_id ? 'Tenant custom role' : 'Built-in role'}</strong></div>
                  </div>

                  <div className="users-card__actions">
                    <button type="button" className="app-button app-button--secondary users-action-button" onClick={() => handleEdit(user)} disabled={!canWrite}>Edit</button>
                    {!self ? (
                      active ? (
                        <button
                          type="button"
                          className="app-button app-button--secondary users-action-button users-action-button--warn"
                          onClick={() => handleStatusChange(user)}
                          disabled={!canWrite || statusMutation.isPending || onlyActiveAdmin}
                          title={onlyActiveAdmin ? 'Assign another active admin before deactivating this account' : undefined}
                        >
                          {statusMutation.isPending && statusMutation.variables?.id === user.id ? 'Updating…' : 'Deactivate'}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="app-button app-button--secondary users-action-button users-action-button--activate"
                            onClick={() => handleStatusChange(user)}
                            disabled={!canWrite || statusMutation.isPending}
                          >
                            {statusMutation.isPending && statusMutation.variables?.id === user.id ? 'Updating…' : 'Reactivate'}
                          </button>
                          <button
                            type="button"
                            className="app-button app-button--danger users-action-button"
                            onClick={() => handleDelete(user)}
                            disabled={!canWrite || deleteMutation.isPending}
                            title="Permanently delete this inactive account when retention constraints allow it"
                          >
                            {deleteMutation.isPending && deleteMutation.variables === user.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      )
                    ) : (
                      <span className="users-self-note">Current account · destructive actions are unavailable here</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="tenant-user-form-panel" className="app-panel users-panel users-form-panel">
        <OperationalSectionHeader
          iconPath="/permissions"
          title={editingUser ? `Edit ${editingUser.name}` : 'Create tenant user'}
          description={canWrite
            ? editingUser
              ? 'Update profile details, access assignment, or credentials. Role and password changes are security-sensitive actions.'
              : 'Create a tenant account and assign the access model the employee needs for their job.'
            : 'You can review tenant users, but only tenant admins can change accounts or access.'}
          actions={editingUser ? <button type="button" className="app-button app-button--secondary" onClick={handleCancelEdit}>Cancel edit</button> : undefined}
        />

        {!canWrite ? <div className="app-warning-state users-form-banner">Only tenant admins can create or edit user accounts.</div> : null}

        <form className="users-form" onSubmit={handleSubmit} noValidate>
          <div className="users-form-group">
            <div className="users-form-group__heading">
              <h4>Profile</h4>
              <p>Basic identity used across operational history, approvals, and audit records.</p>
            </div>
            <div className="users-form-grid">
              <label className="users-field">
                <span>Name</span>
                <input
                  id="user-name"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }));
                    setFieldErrors((current) => ({ ...current, name: undefined }));
                  }}
                  placeholder="Full user name"
                  disabled={!canWrite}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name ? <small className="users-field-error">{fieldErrors.name}</small> : null}
              </label>

              <label className="users-field">
                <span>Email</span>
                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }));
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  placeholder="user@example.com"
                  disabled={!canWrite}
                  aria-invalid={Boolean(fieldErrors.email || (form.email && (!form.email.includes('@') || !form.email.includes('.'))))}
                />
                {fieldErrors.email ? <small className="users-field-error">{fieldErrors.email}</small> : form.email && (!form.email.includes('@') || !form.email.includes('.')) ? <small className="users-field-error">Enter a valid email address.</small> : null}
              </label>
            </div>
          </div>

          <div className="users-form-group">
            <div className="users-form-group__heading">
              <h4>Access & credentials</h4>
              <p>Choose access deliberately. Use a custom role when this employee needs narrower job-specific access than the built-in Staff role.</p>
            </div>
            <div className="users-form-grid">
              <label className="users-field">
                <span>Role</span>
                <select
                  id="user-role"
                  value={form.roleSelection}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, roleSelection: event.target.value as RoleSelection }));
                    setFieldErrors((current) => ({ ...current, roleSelection: undefined }));
                  }}
                  disabled={!canWrite || roleOptionsQuery.isLoading || roleAssignmentLocked}
                  aria-invalid={Boolean(fieldErrors.roleSelection)}
                >
                  {!editingUser ? <option value="">Select a role…</option> : null}
                  <optgroup label="Built-in roles">
                    {(roleOptionsQuery.data?.built_in_roles || [
                      { key: 'staff', role: 'staff', label: 'Staff', kind: 'built_in' as const },
                      { key: 'manager', role: 'manager', label: 'Manager', kind: 'built_in' as const },
                      { key: 'admin', role: 'admin', label: 'Admin', kind: 'built_in' as const }
                    ]).map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </optgroup>
                  {roleOptionsQuery.data?.custom_roles.length ? (
                    <optgroup label="Custom roles">
                      {roleOptionsQuery.data.custom_roles.map((option) => (
                        <option key={option.key} value={option.key}>{option.label} · {option.permission_count || 0} permissions</option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                {fieldErrors.roleSelection ? <small className="users-field-error">{fieldErrors.roleSelection}</small> : null}
                {editingOwnRole ? <small>Your own role assignment cannot be changed from this form.</small> : null}
                {!editingOwnRole && editingOnlyActiveAdmin ? <small>This is the tenant&apos;s only active admin. Assign another active admin before changing this role.</small> : null}
                {roleOptionsQuery.isError ? <small>Custom roles could not be loaded. Built-in roles remain available.</small> : null}
              </label>

              <label className="users-field">
                <span>{editingUser ? 'New password (optional)' : 'Password'}</span>
                <div className="users-password-input">
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, password: event.target.value }));
                      setFieldErrors((current) => ({ ...current, password: undefined }));
                    }}
                    placeholder={editingUser ? 'Leave blank to keep current password' : 'Create a password'}
                    minLength={10}
                    maxLength={256}
                    disabled={!canWrite}
                    aria-invalid={Boolean(fieldErrors.password || (form.password && form.password.length < 10))}
                  />
                  <button type="button" className="users-password-toggle" onClick={() => setShowPassword((current) => !current)} disabled={!canWrite} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {fieldErrors.password ? <small className="users-field-error">{fieldErrors.password}</small> : form.password && form.password.length < 10 ? <small className="users-field-error">Password must contain at least 10 characters.</small> : null}
                {!fieldErrors.password && !(form.password && form.password.length < 10) ? (
                  <small>
                    {editingUser
                      ? currentUserId && editingUser.id === currentUserId
                        ? 'Leave blank to keep the current password. Changing it revokes your other active sessions.'
                        : 'Leave blank to keep the current password. Changing it signs this user out of all active sessions.'
                      : 'Minimum 10 characters.'}
                  </small>
                ) : null}
              </label>
            </div>
          </div>

          <div className="users-form-footer">
            <button
              type="submit"
              className="app-button app-button--primary"
              disabled={!formReady || createMutation.isPending || updateMutation.isPending}
            >
              {editingUser
                ? updateMutation.isPending ? 'Saving…' : 'Save user'
                : createMutation.isPending ? 'Creating…' : 'Create user'}
            </button>
            {editingUser ? <button type="button" className="app-button app-button--secondary" onClick={handleCancelEdit}>Cancel</button> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
