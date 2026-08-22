import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { getPlatformPermissionSnapshot, hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformUsersPage.css';

type PlatformUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  failed_login_count?: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  password_changed_at?: string | null;
  mfa_enabled?: boolean;
  mfa_confirmed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  active_session_count?: number;
  open_support_session_count?: number;
};
type PlatformUsersResponse = {
  users: PlatformUser[];
  summary: { total: number; active: number; disabled: number; locked: number; active_without_mfa: number; active_superadmins: number };
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  roles: string[];
  evidence_contract: {
    application_identity_registry_only: boolean;
    active_session_count_is_application_session_state: boolean;
    support_session_count_is_application_access_state: boolean;
    mfa_flag_does_not_prove_device_control: boolean;
  };
};

type CreateForm = { email: string; name: string; role: string; password: string };
type EditForm = { name: string; role: string };

const PAGE_SIZE = 50;
const DEFAULT_ROLES = ['superadmin', 'support', 'platform_viewer', 'support_l1', 'support_l2', 'security', 'billing', 'ops', 'tenant_success', 'readonly_audit'];
const emptyCreate = (): CreateForm => ({ email: '', name: '', role: 'platform_viewer', password: '' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function prettyRole(role: string) { return role.replaceAll('_', ' '); }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function isLocked(user: PlatformUser) { if (!user.locked_until) return false; const parsed = new Date(user.locked_until).getTime(); return Number.isFinite(parsed) && parsed > Date.now(); }
function userStatus(user: PlatformUser) { if (!user.is_active) return 'Disabled'; if (isLocked(user)) return 'Locked'; return 'Active'; }
function statusTone(user: PlatformUser) { if (!user.is_active) return 'neutral'; if (isLocked(user)) return 'danger'; return 'good'; }

export default function PlatformUsersPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_WRITE);
  const canReadSessions = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ);
  const canReadSecurity = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ);
  const canReadPermissionAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);
  const canReadRolePermissions = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ROLE_PERMISSIONS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const currentPlatformUserId = getPlatformPermissionSnapshot()?.platform_user_id || null;

  const requestedUserId = searchParams.get('platform_user_id') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedRole = searchParams.get('role') || '';
  const roleFilter = DEFAULT_ROLES.includes(requestedRole) ? requestedRole : '';
  const requestedStatus = searchParams.get('status') || '';
  const requestedMfa = searchParams.get('mfa') || '';
  const status = ['active', 'disabled', 'locked'].includes(requestedStatus) ? requestedStatus : '';
  const mfa = ['enabled', 'disabled'].includes(requestedMfa) ? requestedMfa : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const invalidFilters = Boolean((requestedRole && !roleFilter) || (requestedStatus && !status) || (requestedMfa && !mfa) || (requestedSearch && !search));

  const [offset, setOffset] = useState(0);
  const [createForm, setCreateForm] = useState<CreateForm>(() => emptyCreate());
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState<EditForm>({ name: '', role: 'platform_viewer' });
  const [passwordTarget, setPasswordTarget] = useState<PlatformUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');

  useEffect(() => { setOffset(0); }, [requestedUserId, search, roleFilter, status, mfa, invalidFilters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (requestedUserId) params.set('platform_user_id', requestedUserId);
    if (search.trim()) params.set('search', search.trim());
    if (roleFilter) params.set('role', roleFilter);
    if (status) params.set('status', status);
    if (mfa) params.set('mfa', mfa);
    return params.toString();
  }, [requestedUserId, search, roleFilter, status, mfa, offset]);

  const usersQuery = useQuery({
    queryKey: ['platform', 'users', 'workspace', requestedUserId, search, roleFilter, status, mfa, offset],
    queryFn: () => platformApiRequest<PlatformUsersResponse>(`/platform/users?${queryString}`),
    enabled: !invalidFilters,
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const invalidate = async () => qc.invalidateQueries({ queryKey: ['platform', 'users'] });
  const create = useMutation({
    mutationFn: () => platformApiRequest('/platform/users', { method: 'POST', body: JSON.stringify({ ...createForm, email: createForm.email.trim(), name: createForm.name.trim() }) }),
    onMutate: () => { setMutationError(''); setMessage(''); },
    onSuccess: async () => { setCreateForm(emptyCreate()); setMessage('Platform user created.'); await invalidate(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: EditForm }) => platformApiRequest(`/platform/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onMutate: () => { setMutationError(''); setMessage(''); },
    onSuccess: async () => { setEditingId(''); setMessage('Platform user details updated.'); await invalidate(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const lifecycle = useMutation({
    mutationFn: ({ user, action }: { user: PlatformUser; action: 'activate' | 'deactivate' }) => platformApiRequest(`/platform/users/${user.id}/${action}`, { method: 'POST' }),
    onMutate: () => { setMutationError(''); setMessage(''); },
    onSuccess: async (_, variables) => { setMessage(variables.action === 'activate' ? 'Platform user activated.' : 'Platform user deactivated and active access revoked.'); await invalidate(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => platformApiRequest(`/platform/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
    onMutate: () => { setMutationError(''); setMessage(''); },
    onSuccess: async () => { setPasswordTarget(null); setNewPassword(''); setMessage('Password reset. Existing Platform and Support Session access was revoked.'); await invalidate(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const revoke = useMutation({
    mutationFn: (user: PlatformUser) => platformApiRequest(`/platform/users/${user.id}/revoke-sessions`, { method: 'POST' }),
    onMutate: () => { setMutationError(''); setMessage(''); },
    onSuccess: async () => { setMessage('Active Platform and Support Session access revoked.'); await invalidate(); },
    onError: (error) => setMutationError(readableError(error))
  });

  const data = usersQuery.data;
  const roles = data?.roles?.length ? data.roles : DEFAULT_ROLES;
  const summary = data?.summary;
  const pagination = data?.pagination;
  const mutating = create.isPending || update.isPending || lifecycle.isPending || resetPassword.isPending || revoke.isPending;
  const createValidation = !createForm.email.trim() ? 'Enter an email.' : !createForm.name.trim() ? 'Enter a name.' : createForm.password.length < 10 ? 'Temporary password must be at least 10 characters.' : '';
  const pageNumber = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;

  function updateFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) value ? params.set(key, value) : params.delete(key);
    setSearchParams(params, { replace: true });
  }
  function startEdit(user: PlatformUser) { setEditingId(user.id); setEditForm({ name: user.name, role: user.role }); setMutationError(''); setMessage(''); }

  return <div className="platform-users">
    <OperationalWorkspaceHero
      iconPath="/platform/users"
      eyebrow="Platform · Identity governance"
      title="Platform Users"
      description="Manage Platform staff identities, roles and account lifecycle. Role changes are enforced against current database state; deactivation and security resets revoke active application access."
      meta={<><OperationalWorkspaceMetaPill>{canWrite ? 'Governance write access' : 'Read-only registry'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{summary ? `${summary.active_superadmins} active superadmin${summary.active_superadmins === 1 ? '' : 's'}` : 'Loading governance state'}</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-users__hero-aside"><OperationalWorkspaceStatus value={summary?.locked ?? '—'} label="Locked accounts" /><div className="platform-users__refresh-block"><button type="button" className="app-button app-button--secondary" onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching}>{usersQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button><span>Last successful snapshot stays visible if refresh fails.</span></div></div>}
    />

    <OperationalWorkspaceStats ariaLabel="Platform user governance summary">
      <OperationalWorkspaceStatCard label="Filtered users" value={summary?.total ?? '—'} helper="Registry-wide for current filters" iconPath="/platform/users" />
      <OperationalWorkspaceStatCard label="Active" value={summary?.active ?? '—'} helper="Application account enabled" tone="good" iconPath="/platform/users" />
      <OperationalWorkspaceStatCard label="Disabled" value={summary?.disabled ?? '—'} helper="Cannot authenticate" tone="neutral" iconPath="/platform/users" />
      <OperationalWorkspaceStatCard label="Locked" value={summary?.locked ?? '—'} helper="Current login lockout window" tone={summary?.locked ? 'danger' : 'good'} iconPath="/platform/security" />
      <OperationalWorkspaceStatCard label="Active without MFA" value={summary?.active_without_mfa ?? '—'} helper="Application MFA flag only" tone={summary?.active_without_mfa ? 'warn' : 'good'} iconPath="/platform/security" />
    </OperationalWorkspaceStats>

    {invalidFilters ? <div className="platform-users__warning"><strong>Invalid URL filter.</strong> Clear the unsupported filter value before loading this registry.</div> : null}
    {usersQuery.error && usersQuery.data ? <div className="platform-users__warning"><strong>Showing the last successful snapshot.</strong> Refresh failed: {readableError(usersQuery.error)}</div> : null}
    {message ? <div className="platform-users__success"><span>{message}</span><button type="button" className="app-button app-button--secondary" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-users__warning"><strong>Action failed.</strong> {mutationError}</div> : null}

    <section className="io-workspace-panel platform-users__section">
      <OperationalSectionHeader iconPath="/platform/users" title="Registry filters" description="Search by visible Platform identity or narrow by account role, lifecycle and MFA flag. URL filters are preserved for deep links." />
      <div className="platform-users__filter-grid">
        <label className="platform-users__search">Search<input value={search} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Name or email" /></label>
        <label>Role<select value={roleFilter} onChange={(event) => updateFilters({ role: event.target.value })}><option value="">All roles</option>{roles.map((role) => <option key={role} value={role}>{prettyRole(role)}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => updateFilters({ status: event.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option><option value="locked">Locked</option></select></label>
        <label>MFA<select value={mfa} onChange={(event) => updateFilters({ mfa: event.target.value })}><option value="">Any MFA state</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></label>
        {requestedUserId ? <div className="platform-users__scoped"><strong>Deep-linked user ID</strong><span>{requestedUserId}</span><button type="button" className="app-button app-button--secondary" onClick={() => updateFilters({ platform_user_id: '' })}>Clear user scope</button></div> : null}
      </div>
    </section>

    {canWrite ? <section className="io-workspace-panel platform-users__section">
      <OperationalSectionHeader iconPath="/platform/users" title="Create Platform user" description="Creates an application identity. The temporary password is not retained in readable form after submission." />
      <div className="platform-users__form-grid">
        <label>Email<input type="email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} placeholder="platform.user@example.com" /></label>
        <label>Name<input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Operator name" /></label>
        <label>Role<select value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}>{roles.map((role) => <option key={role} value={role}>{prettyRole(role)}</option>)}</select></label>
        <label>Temporary password<input type="password" value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} placeholder="At least 10 characters" /></label>
      </div>
      {createValidation ? <div className="platform-users__validation">{createValidation}</div> : null}
      <div className="platform-users__actions"><button type="button" className="app-button" disabled={Boolean(createValidation) || mutating} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create Platform user'}</button></div>
    </section> : null}

    <section className="io-workspace-panel platform-users__section">
      <OperationalSectionHeader iconPath="/platform/users" title="Platform identity registry" description="Account state is current application evidence. MFA/session flags do not independently prove device possession, employee status or organizational authorization outside this application." />
      {!usersQuery.data && usersQuery.isLoading ? <div className="platform-users__loading">Loading Platform users…</div> : null}
      {!usersQuery.data && usersQuery.error ? <div className="platform-users__blocking-error"><strong>Platform users could not be loaded.</strong><span>{readableError(usersQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => usersQuery.refetch()}>Retry</button></div> : null}
      {data?.users.length ? <div className="platform-users__list">{data.users.map((user) => {
        const current = user.id === currentPlatformUserId;
        const editing = editingId === user.id;
        const tone = statusTone(user);
        return <article key={user.id} className="platform-users__card">
          <div className="platform-users__card-header"><div><h4>{user.name}{current ? ' · You' : ''}</h4><p>{user.email}</p></div><div className="platform-users__badges"><span data-tone={tone}>{userStatus(user)}</span><span>{prettyRole(user.role)}</span><span data-tone={user.mfa_enabled ? 'good' : 'warn'}>{user.mfa_enabled ? 'MFA on' : 'MFA off'}</span></div></div>
          {editing ? <div className="platform-users__edit-grid"><label>Name<input value={editForm.name} onChange={(event) => setEditForm((value) => ({ ...value, name: event.target.value }))} /></label><label>Role<select value={editForm.role} onChange={(event) => setEditForm((value) => ({ ...value, role: event.target.value }))}>{roles.map((role) => <option key={role} value={role}>{prettyRole(role)}</option>)}</select></label><div className="platform-users__actions"><button type="button" className="app-button" disabled={!editForm.name.trim() || mutating} onClick={() => update.mutate({ id: user.id, body: { name: editForm.name.trim(), role: editForm.role } })}>Save</button><button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={() => setEditingId('')}>Cancel</button></div></div> : null}
          <div className="platform-users__metrics-grid"><div><span>Active Platform sessions</span><strong>{user.active_session_count ?? 0}</strong></div><div><span>Open Support Sessions</span><strong>{user.open_support_session_count ?? 0}</strong></div><div><span>Failed logins</span><strong>{user.failed_login_count ?? 0}</strong></div><div><span>Last login</span><strong>{dateTime(user.last_login_at)}</strong></div><div><span>Password changed</span><strong>{dateTime(user.password_changed_at)}</strong></div><div><span>Updated</span><strong>{dateTime(user.updated_at)}</strong></div></div>
          {passwordTarget?.id === user.id ? <div className="platform-users__password-reset"><label>New temporary password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 10 characters" /></label><div className="platform-users__actions"><button type="button" className="app-button app-button--danger" disabled={newPassword.length < 10 || mutating} onClick={() => resetPassword.mutate({ id: user.id, password: newPassword })}>Reset password & revoke access</button><button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={() => { setPasswordTarget(null); setNewPassword(''); }}>Cancel</button></div></div> : null}
          <div className="platform-users__card-footer"><div className="platform-users__source-links">{canReadSessions ? <Link to="/platform/sessions">Platform sessions</Link> : null}{canReadSecurity ? <Link to="/platform/security">Security</Link> : null}{canReadAudit ? <Link to={`/platform/audit?target_type=platform_users&target_id=${encodeURIComponent(user.id)}`}>Audit history</Link> : null}</div>{canWrite ? <div className="platform-users__actions"><button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={() => startEdit(user)}>Edit details</button><button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={() => { setPasswordTarget(user); setNewPassword(''); }}>Reset password</button><button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={() => window.confirm(`Revoke all current application access for ${user.email}? This also ends active Support Sessions.`) && revoke.mutate(user)}>Revoke access</button>{user.is_active ? <button type="button" className="app-button app-button--danger" disabled={mutating || current} title={current ? 'You cannot deactivate your own Platform account.' : undefined} onClick={() => window.confirm(`Deactivate ${user.email}? Active Platform and Support Session access will be revoked.`) && lifecycle.mutate({ user, action: 'deactivate' })}>Deactivate</button> : <button type="button" className="app-button" disabled={mutating} onClick={() => window.confirm(`Reactivate ${user.email}? Previous sessions will not be restored.`) && lifecycle.mutate({ user, action: 'activate' })}>Activate</button>}</div> : null}</div>
        </article>;
      })}</div> : data ? <div className="platform-users__empty"><strong>No Platform users matched.</strong><span>No application identity record matched the current filters.</span></div> : null}
      {pagination ? <div className="platform-users__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || usersQuery.isFetching}>Previous</button><span>Page {pageNumber} · {pagination.total} matching user{pagination.total === 1 ? '' : 's'}</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!pagination.has_more || usersQuery.isFetching}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-users__section">
      <OperationalSectionHeader iconPath="/platform/users" title="Governance boundaries" description="The Users registry governs application identities. External employment status, HR approval, device custody and organizational authority must be verified outside this registry." />
      <div className="platform-users__truth-note"><strong>Lifecycle guarantee</strong> Role downgrades are enforced on each Platform request. Losing Support Session start permission also invalidates active tenant support access; deactivation, password reset and revoke-access actions terminate current application sessions instead of merely changing a row label.</div>
    </section>

    <section className="io-workspace-panel platform-users__section"><OperationalSectionHeader iconPath="/platform/users" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-users__supporting-links">{canReadSessions ? <Link to="/platform/sessions">Platform sessions</Link> : null}{canReadSecurity ? <Link to="/platform/security">Security</Link> : null}{canReadPermissionAudit ? <Link to="/platform/permission-audit">Permission audit</Link> : null}{canReadRolePermissions ? <Link to="/platform/permissions">Role permissions</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div></section>
  </div>;
}
