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
import { useAppTranslation } from '../i18n/I18nContext';
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

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale);
}

function isUserActive(user: UserItem): boolean {
  return user.is_active !== false;
}

function formatLastLogin(value: string | null | undefined, locale: string, ui: (text: string) => string): string {
  return value ? formatDateTime(value, locale) : ui('Never');
}


function getMutationFieldErrors(error: unknown, ui: (text: string) => string): UserFormFieldErrors {
  if (!(error instanceof ApiError)) return {};

  const message = error.message.toLowerCase();
  if (error.code === 'UNIQUE_CONSTRAINT_VIOLATION' || message.includes('same unique value') || message.includes('email already')) {
    return { email: ui('This email is already used by another tenant user.') };
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

function validateUserForm(values: UserFormState, editing: boolean, ui: (text: string) => string): UserFormFieldErrors {
  const errors: UserFormFieldErrors = {};
  const email = values.email.trim();

  if (!values.name.trim()) errors.name = ui("Enter the user's name.");
  if (!email || !email.includes('@') || !email.includes('.')) errors.email = ui('Enter a valid email address.');
  if (!values.roleSelection) errors.roleSelection = ui('Select an access role.');
  if ((!editing || values.password) && values.password.length < 10) {
    errors.password = ui('Password must contain at least 10 characters.');
  }

  return errors;
}

export default function UsersPage() {
  const { locale, ui } = useAppTranslation();
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
      setPageMessage(ui("User created successfully."));
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
      setPageError(error instanceof ApiError ? error.message : ui("Failed to create user."));
      setFieldErrors(getMutationFieldErrors(error, ui));
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      setForm(emptyForm());
      setEditingUser(null);
      setPageError(null);
      setPageMessage(ui("User updated successfully."));
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
      setPageError(error instanceof ApiError ? error.message : ui("Failed to update user."));
      setFieldErrors(getMutationFieldErrors(error, ui));
    }
  });

  const statusMutation = useMutation({
    mutationFn: setUserActiveStatus,
    onSuccess: async (updatedUser) => {
      setPageError(null);
      setPageMessage(updatedUser.is_active !== false ? ui("User activated successfully.") : ui("User deactivated successfully."));
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : ui("Failed to update user status."));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage(ui("User deleted successfully."));
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
      setPageError(error instanceof ApiError ? error.message : ui("Failed to delete user."));
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
    ? `${ui('Last refreshed')} ${formatDateTime(new Date(usersQuery.dataUpdatedAt).toISOString(), locale)}`
    : ui('Not refreshed yet');

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
      setPageError(result.error instanceof Error ? result.error.message : ui("Failed to refresh users."));
      return;
    }

    setPageMessage(ui("Users refreshed."));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);
    setPageMessage(null);

    if (!canWrite) {
      setPageError(ui("Only admins can create or update users."));
      return;
    }

    const validationErrors = validateUserForm(form, Boolean(editingUser), ui);
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
      setPageError(ui("You cannot deactivate your own user account."));
      return;
    }

    const confirmed = window.confirm(
      currentlyActive
        ? `${ui("Deactivate user")} "${user.name}"? ${ui("Their active sessions will be revoked and they will no longer be able to sign in.")}`
        : `${ui("Activate user")} "${user.name}"? ${ui("They will be allowed to sign in again with their existing credentials.")}`
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
      setPageError(ui("You cannot delete your own user account."));
      return;
    }

    if (isUserActive(user)) {
      setPageMessage(null);
      setPageError(ui("Deactivate this user before permanently deleting the account."));
      return;
    }

    const confirmed = window.confirm(
      `${ui("Permanently delete inactive user")} "${user.name}"? ${ui("This cannot be undone and may still be blocked when business history references this account.")}`
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
    return <div className="app-empty-state">{ui("Loading tenant users…")}</div>;
  }

  if (usersQuery.isError) {
    return <div className="app-error-state">{ui("Failed to load users:")} {(usersQuery.error as Error).message || ui('Unknown error')}</div>;
  }

  return (
    <div className="users-page io-operational-page io-workspace-page" id="tenant-users-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/users"
        eyebrow={ui("People & access")}
        title={ui("Tenant user management")}
        description={ui("Create, review, and maintain tenant user accounts and access roles. Deactivation is the normal way to remove access while preserving business history.")}
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Role-based access")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Session revocation on deactivation")}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          canWrite ? (
            <button
              type="button"
              className="app-button app-button--primary"
              onClick={handleStartCreate}
            >
              {ui("Create user")}
            </button>
          ) : <OperationalWorkspaceStatus value={summary.active} label={ui("active tenant users")} />
        }
      />

      <OperationalWorkspaceStats ariaLabel={ui("Tenant user overview")}>
        <OperationalWorkspaceStatCard label={ui("Active users")} value={summary.active} helper={`${summary.total} ${ui("total")} · ${summary.inactive} ${ui("inactive")}`} tone="good" iconPath="/sessions" />
        <OperationalWorkspaceStatCard label={ui("Inactive users")} value={summary.inactive} helper={ui("Access removed; history retained")} tone={summary.inactive > 0 ? 'neutral' : 'good'} iconPath="/sessions" />
        <OperationalWorkspaceStatCard label={ui("Admins")} value={summary.admins} helper={`${summary.activeAdmins} ${ui(summary.activeAdmins === 1 ? "active tenant administrator" : "active tenant administrators")}`} tone="warn" iconPath="/permissions" />
        <OperationalWorkspaceStatCard label={ui("Managers")} value={summary.managers} helper={ui("Built-in operational supervisors")} tone="blue" iconPath="/users" />
        <OperationalWorkspaceStatCard label={ui("Staff")} value={summary.staff} helper={ui("Built-in daily execution users")} tone="good" iconPath="/users" />
        <OperationalWorkspaceStatCard label={ui("Custom-role users")} value={summary.custom} helper={ui("Users assigned job-specific tenant roles")} tone="neutral" iconPath="/permissions" />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui("User management work areas")} hint={ui("Switch between the user directory and account form.")}>
        <OperationalWorkspaceTab
          active={workspaceSection === 'directory'}
          iconPath="/users"
          label={ui("User directory")}
          count={filteredUsers.length}
          onClick={handleOpenDirectory}
        />
        <OperationalWorkspaceTab
          active={workspaceSection === 'form'}
          iconPath="/permissions"
          label={editingUser ? ui("Edit user") : ui("Create user")}
          disabled={!canWrite}
          onClick={handleOpenForm}
        />
      </OperationalWorkspaceTabs>

      {pageMessage ? <div className="app-success-state users-page-message" role="status">{pageMessage}</div> : null}
      {pageError ? <div className="app-error-state users-page-message" role="alert">{pageError}</div> : null}

      {workspaceSection === 'directory' ? (
      <section id="tenant-user-directory-panel" className="app-panel users-panel users-directory-panel">
        <OperationalSectionHeader
          iconPath="/users"
          title={ui("Tenant user directory")}
          description={ui("Find user accounts, review their access model and activity, and manage the account lifecycle.")}
          actions={
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={handleRefreshUsers}
              disabled={usersQuery.isFetching}
            >
              {usersQuery.isFetching ? ui("Refreshing…") : ui("Refresh")}
            </button>
          }
        />

        <div className="users-toolbar">
          <label className="users-field users-field--search">
            <span>{ui("Search users")}</span>
            <input
              aria-label={ui("Search tenant users")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={ui("Name, email, or role")}
            />
          </label>
          <label className="users-field users-field--status">
            <span>{ui("Account status")}</span>
            <select
              aria-label={ui("Filter users by status")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">{ui("All account statuses")}</option>
              <option value="active">{ui("Active accounts")}</option>
              <option value="inactive">{ui("Inactive accounts")}</option>
            </select>
          </label>
          <div className="users-refresh-meta">{lastRefreshedText}</div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="app-empty-state users-empty-state">
            {users.length === 0
              ? canWrite
                ? ui("No tenant users exist yet. Open Create user to add the first tenant user.")
                : ui("No tenant users exist yet. Ask a tenant admin to create user accounts.")
              : ui("No users matched the current search and status filters.")}
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
                      {self ? <span className="users-badge users-badge--self">{ui("YOU")}</span> : null}
                      <span className={`users-badge users-badge--${active ? 'active' : 'inactive'}`}>{active ? 'ACTIVE' : 'INACTIVE'}</span>
                    </div>
                  </div>

                  <div className="users-card__meta">
                    <div><span>{ui("Created")}</span><strong>{formatDateTime(user.created_at, locale)}</strong></div>
                    <div><span>{ui("Last login")}</span><strong>{formatLastLogin(user.last_login_at, locale, ui)}</strong></div>
                    <div><span>{ui("Access model")}</span><strong>{user.custom_role_id ? ui("Tenant custom role") : ui("Built-in role")}</strong></div>
                  </div>

                  <div className="users-card__actions">
                    <button type="button" className="app-button app-button--secondary users-action-button" onClick={() => handleEdit(user)} disabled={!canWrite}>{ui("Edit")}</button>
                    {!self ? (
                      active ? (
                        <button
                          type="button"
                          className="app-button app-button--secondary users-action-button users-action-button--warn"
                          onClick={() => handleStatusChange(user)}
                          disabled={!canWrite || statusMutation.isPending || onlyActiveAdmin}
                          title={onlyActiveAdmin ? ui("Assign another active admin before deactivating this account") : undefined}
                        >
                          {statusMutation.isPending && statusMutation.variables?.id === user.id ? ui("Updating…") : ui("Deactivate")}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="app-button app-button--secondary users-action-button users-action-button--activate"
                            onClick={() => handleStatusChange(user)}
                            disabled={!canWrite || statusMutation.isPending}
                          >
                            {statusMutation.isPending && statusMutation.variables?.id === user.id ? ui("Updating…") : ui("Reactivate")}
                          </button>
                          <button
                            type="button"
                            className="app-button app-button--danger users-action-button"
                            onClick={() => handleDelete(user)}
                            disabled={!canWrite || deleteMutation.isPending}
                            title={ui("Permanently delete this inactive account when retention constraints allow it")}
                          >
                            {deleteMutation.isPending && deleteMutation.variables === user.id ? ui("Deleting…") : ui("Delete")}
                          </button>
                        </>
                      )
                    ) : (
                      <span className="users-self-note">{ui("Current account · destructive actions are unavailable here")}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      ) : null}

      {workspaceSection === 'form' ? (
      <section id="tenant-user-form-panel" className="app-panel users-panel users-form-panel">
        <OperationalSectionHeader
          iconPath="/permissions"
          title={editingUser ? `${ui("Edit")} ${editingUser.name}` : ui("Create tenant user")}
          description={canWrite
            ? editingUser
              ? ui("Update profile details, access assignment, or credentials. Role and password changes are security-sensitive actions.")
              : ui("Create a tenant account and assign the access model the employee needs for their job.")
            : ui("You can review tenant users, but only tenant admins can change accounts or access.")}
          actions={editingUser ? <button type="button" className="app-button app-button--secondary" onClick={handleCancelEdit}>{ui("Cancel edit")}</button> : undefined}
        />

        {!canWrite ? <div className="app-warning-state users-form-banner">{ui("Only tenant admins can create or edit user accounts.")}</div> : null}

        <form className="users-form" onSubmit={handleSubmit} noValidate>
          <div className="users-form-group">
            <div className="users-form-group__heading">
              <h4>{ui("Profile")}</h4>
              <p>{ui("Basic identity used across operational history, approvals, and audit records.")}</p>
            </div>
            <div className="users-form-grid">
              <label className="users-field">
                <span>{ui("Name")}</span>
                <input
                  id="user-name"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }));
                    setFieldErrors((current) => ({ ...current, name: undefined }));
                  }}
                  placeholder={ui("Full user name")}
                  disabled={!canWrite}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name ? <small className="users-field-error">{fieldErrors.name}</small> : null}
              </label>

              <label className="users-field">
                <span>{ui("Email")}</span>
                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }));
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  placeholder={ui("user@example.com")}
                  disabled={!canWrite}
                  aria-invalid={Boolean(fieldErrors.email || (form.email && (!form.email.includes('@') || !form.email.includes('.'))))}
                />
                {fieldErrors.email ? <small className="users-field-error">{fieldErrors.email}</small> : form.email && (!form.email.includes('@') || !form.email.includes('.')) ? <small className="users-field-error">{ui("Enter a valid email address.")}</small> : null}
              </label>
            </div>
          </div>

          <div className="users-form-group">
            <div className="users-form-group__heading">
              <h4>{ui("Access & credentials")}</h4>
              <p>{ui("Choose access deliberately. Use a custom role when this employee needs narrower job-specific access than the built-in Staff role.")}</p>
            </div>
            <div className="users-form-grid">
              <label className="users-field">
                <span>{ui("Role")}</span>
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
                  {!editingUser ? <option value="">{ui("Select a role…")}</option> : null}
                  <optgroup label={ui("Built-in roles")}>
                    {(roleOptionsQuery.data?.built_in_roles || [
                      { key: 'staff', role: 'staff', label: ui("Staff"), kind: 'built_in' as const },
                      { key: 'manager', role: 'manager', label: ui("Manager"), kind: 'built_in' as const },
                      { key: 'admin', role: 'admin', label: ui("Admin"), kind: 'built_in' as const }
                    ]).map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </optgroup>
                  {roleOptionsQuery.data?.custom_roles.length ? (
                    <optgroup label={ui("Custom roles")}>
                      {roleOptionsQuery.data.custom_roles.map((option) => (
                        <option key={option.key} value={option.key}>{option.label} · {option.permission_count || 0} {ui("permissions")}</option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                {fieldErrors.roleSelection ? <small className="users-field-error">{fieldErrors.roleSelection}</small> : null}
                {editingOwnRole ? <small>{ui("Your own role assignment cannot be changed from this form.")}</small> : null}
                {!editingOwnRole && editingOnlyActiveAdmin ? <small>{ui("This is the tenant's only active admin. Assign another active admin before changing this role.")}</small> : null}
                {roleOptionsQuery.isError ? <small>{ui("Custom roles could not be loaded. Built-in roles remain available.")}</small> : null}
              </label>

              <label className="users-field">
                <span>{editingUser ? ui("New password (optional)") : ui("Password")}</span>
                <div className="users-password-input">
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, password: event.target.value }));
                      setFieldErrors((current) => ({ ...current, password: undefined }));
                    }}
                    placeholder={editingUser ? ui("Leave blank to keep current password") : ui("Create a password")}
                    minLength={10}
                    maxLength={256}
                    disabled={!canWrite}
                    aria-invalid={Boolean(fieldErrors.password || (form.password && form.password.length < 10))}
                  />
                  <button type="button" className="users-password-toggle" onClick={() => setShowPassword((current) => !current)} disabled={!canWrite} aria-label={showPassword ? ui("Hide password") : ui("Show password")}>
                    {showPassword ? ui("Hide") : ui("Show")}
                  </button>
                </div>
                {fieldErrors.password ? <small className="users-field-error">{fieldErrors.password}</small> : form.password && form.password.length < 10 ? <small className="users-field-error">{ui("Password must contain at least 10 characters.")}</small> : null}
                {!fieldErrors.password && !(form.password && form.password.length < 10) ? (
                  <small>
                    {editingUser
                      ? currentUserId && editingUser.id === currentUserId
                        ? ui("Leave blank to keep the current password. Changing it revokes your other active sessions.")
                        : ui("Leave blank to keep the current password. Changing it signs this user out of all active sessions.")
                      : ui("Minimum 10 characters.")}
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
                ? updateMutation.isPending ? ui("Saving…") : ui("Save user")
                : createMutation.isPending ? ui("Creating…") : ui("Create user")}
            </button>
            {editingUser ? <button type="button" className="app-button app-button--secondary" onClick={handleCancelEdit}>{ui("Cancel")}</button> : null}
          </div>
        </form>
      </section>
      ) : null}
    </div>
  );
}
