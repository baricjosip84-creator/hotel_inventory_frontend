import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import qrCodeSvg from '../lib/qrCodeSvg';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformSecurityPage.css';

type Security = {
  email: string;
  name?: string | null;
  role: string;
  failed_login_count: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  password_changed_at?: string | null;
  mfa_enabled: boolean;
  mfa_confirmed_at?: string | null;
  active_sessions: number;
  truth_contract: {
    mfa_enabled_means_application_totp_is_enforced_at_platform_login: boolean;
    mfa_state_does_not_prove_device_identity_or_hardware_backing: boolean;
    active_sessions_are_application_session_records_not_proof_of_human_presence: boolean;
  };
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
  active_sessions: number | null;
  risk_flags: string[];
};

type SecurityAdminOverview = {
  generated_at: string;
  summary: {
    total_users: number | null;
    active_users: number | null;
    locked_users: number | null;
    users_without_mfa: number | null;
    users_with_failed_logins: number | null;
    active_sessions: number | null;
  };
  users: SecurityUser[];
  active_sessions: Array<{
    id: string;
    platform_user_id: string | null;
    email: string | null;
    name: string | null;
    role: string | null;
    platform_user_identity_restricted: boolean;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: string;
    last_used_at?: string | null;
    expires_at: string;
  }>;
  evidence_access: { platform_users: boolean; platform_sessions: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_complete: boolean;
  limits: { users: number; active_sessions: number };
  truncated: { users: boolean | null; active_sessions: boolean | null };
  risk_policy: {
    password_review_age_days: number;
    password_age_is_review_signal_not_enforced_expiry: boolean;
    mfa_flag_is_application_totp_state_not_external_identity_assurance: boolean;
    session_records_do_not_prove_device_or_human_identity: boolean;
  };
};

type MfaSetup = { secret: string; otpauth_url: string; algorithm?: string; digits?: number; period_seconds?: number };
type SessionMutationResult = { other_sessions_revoked: number };

type AdminMfaClearResult = { sessions_revoked: number };

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Invalid timestamp' : parsed.toLocaleString();
}

function prettyFlag(value: string) {
  return value.replaceAll('_', ' ');
}

function restrictedValue(value: number | null | undefined) {
  return value === null || value === undefined ? 'Restricted' : value;
}

export default function PlatformSecurityPage() {
  const qc = useQueryClient();
  const [pwd, setPwd] = useState({ current_password: '', new_password: '' });
  const [mfaCode, setMfaCode] = useState('');
  const [disableMfaForm, setDisableMfaForm] = useState({ current_password: '', code: '' });
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canReadAdminSecurity = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ);
  const canWriteAdminSecurity = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_WRITE);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadPlatformSessions = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ);
  const canRevokePlatformSessions = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_REVOKE);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadAccessReviews = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);
  const canReadRolePermissions = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ROLE_PERMISSIONS_READ);

  const q = useQuery({
    queryKey: ['platform', 'security', 'me'],
    queryFn: () => platformApiRequest<Security>('/platform/security/me')
  });

  const admin = useQuery({
    queryKey: ['platform', 'security', 'admin'],
    queryFn: () => platformApiRequest<SecurityAdminOverview>('/platform/security/admin'),
    enabled: canReadAdminSecurity
  });

  const invalidateSecurity = async () => {
    await qc.invalidateQueries({ queryKey: ['platform', 'security'] });
  };

  const change = useMutation({
    mutationFn: () => platformApiRequest<SessionMutationResult>('/platform/security/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: pwd.current_password, new_password: pwd.new_password })
    }),
    onSuccess: async (result) => {
      setPwd({ current_password: '', new_password: '' });
      setStatusMessage(`Password changed. ${result.other_sessions_revoked} other active session(s) were revoked; this browser session was preserved.`);
      await invalidateSecurity();
    }
  });

  const setupMfa = useMutation({
    mutationFn: () => platformApiRequest<MfaSetup>('/platform/security/me/mfa/setup', { method: 'POST', skipIdempotencyKey: true }),
    onSuccess: (result) => {
      setSetup(result);
      setMfaCode('');
      setStatusMessage('MFA setup started. MFA is not enabled until the current 6-digit authenticator code is confirmed.');
    }
  });

  const confirm = useMutation({
    mutationFn: () => platformApiRequest<SessionMutationResult & { mfa_enabled: boolean }>('/platform/security/me/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code: mfaCode.trim() })
    }),
    onSuccess: async (result) => {
      setMfaCode('');
      setSetup(null);
      setStatusMessage(`MFA enabled. ${result.other_sessions_revoked} other active session(s) were revoked so future sign-ins must use MFA.`);
      await invalidateSecurity();
    }
  });

  const disable = useMutation({
    mutationFn: () => platformApiRequest<SessionMutationResult & { mfa_enabled: boolean }>('/platform/security/me/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ current_password: disableMfaForm.current_password, code: disableMfaForm.code.trim() })
    }),
    onSuccess: async (result) => {
      setDisableMfaForm({ current_password: '', code: '' });
      setSetup(null);
      setStatusMessage(`MFA disabled after password and TOTP verification. ${result.other_sessions_revoked} other active session(s) were revoked.`);
      await invalidateSecurity();
    }
  });

  const unlock = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/security/admin/users/${id}/unlock`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Locked Platform user unlocked. Staff security evidence was refreshed.');
      await qc.invalidateQueries({ queryKey: ['platform', 'security', 'admin'] });
    }
  });

  const clearMfa = useMutation({
    mutationFn: (id: string) => platformApiRequest<AdminMfaClearResult>(`/platform/security/admin/users/${id}/clear-mfa`, { method: 'POST' }),
    onSuccess: async (result) => {
      setStatusMessage(`Platform user MFA was administratively cleared and ${result.sessions_revoked} active session(s) were revoked.`);
      await qc.invalidateQueries({ queryKey: ['platform', 'security', 'admin'] });
    }
  });

  const refreshAll = async () => {
    const requests: Promise<unknown>[] = [q.refetch()];
    if (canReadAdminSecurity) requests.push(admin.refetch());
    await Promise.all(requests);
  };

  const canChangePassword = pwd.current_password.length > 0 && pwd.new_password.length >= 10 && pwd.new_password.length <= 512;
  const canConfirmMfa = Boolean(setup) && /^\d{6}$/.test(mfaCode.trim());
  const canDisableMfa = Boolean(q.data?.mfa_enabled)
    && disableMfaForm.current_password.length > 0
    && /^\d{6}$/.test(disableMfaForm.code.trim());
  const canUnlockAdminUsers = canWriteAdminSecurity && canReadPlatformUsers;
  const canClearAdminMfa = canWriteAdminSecurity && canReadPlatformUsers && canRevokePlatformSessions;
  const mfaEnabled = Boolean(q.data?.mfa_enabled);
  const adminUsers = admin.data?.users || [];
  const adminSessions = admin.data?.active_sessions || [];
  const showingStaleSelf = q.isError && Boolean(q.data);
  const showingStaleAdmin = canReadAdminSecurity && admin.isError && Boolean(admin.data);

  return <div className="platform-security">
    <OperationalWorkspaceHero
      iconPath="/platform/security"
      eyebrow="Authenticated account security"
      title="My Security"
      description="Manage your own Platform password and TOTP MFA. Staff-wide security evidence is a separate permission-scoped view and does not turn this self-service page into an alternate Platform Users or Sessions registry."
      meta={<>
        <OperationalWorkspaceMetaPill>Self-service: authenticated Platform user</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Staff review: PLATFORM_SECURITY_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>User/session evidence scoped independently</OperationalWorkspaceMetaPill>
      </>}
      aside={<div className="platform-security__hero-aside">
        <OperationalWorkspaceStatus value={q.data?.mfa_enabled ? 'MFA enabled' : 'MFA disabled'} label="Application TOTP state" />
        <button type="button" className="app-button app-button--secondary" onClick={() => void refreshAll()} disabled={q.isFetching || (canReadAdminSecurity && admin.isFetching)}>{q.isFetching || (canReadAdminSecurity && admin.isFetching) ? 'Refreshing…' : 'Refresh'}</button>
      </div>}
    />

    {q.isError && !q.data ? <section className="platform-security__blocking-error"><strong>My Security failed to load.</strong><span>{readableError(q.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => q.refetch()}>Retry</button></section> : null}
    {showingStaleSelf ? <section className="platform-security__warning"><strong>Showing the last successful account-security snapshot.</strong><span>The latest self-security refresh failed. Existing data remains visible until refresh succeeds.</span></section> : null}
    {showingStaleAdmin ? <section className="platform-security__warning"><strong>Showing the last successful staff-security snapshot.</strong><span>The latest admin refresh failed. Existing permission-scoped evidence remains visible.</span></section> : null}
    {canReadAdminSecurity && admin.isError && !admin.data ? <section className="platform-security__warning"><strong>Staff security review is unavailable.</strong><span>{readableError(admin.error)} Self-service password and MFA controls remain independent.</span><button type="button" className="app-button app-button--secondary" onClick={() => admin.refetch()}>Retry staff review</button></section> : null}
    {statusMessage ? <section className="platform-security__success">{statusMessage}</section> : null}

    <OperationalWorkspaceStats ariaLabel="My account security summary">
      <OperationalWorkspaceStatCard label="MFA" value={q.data ? (q.data.mfa_enabled ? 'Enabled' : 'Disabled') : '—'} tone={q.data?.mfa_enabled ? 'good' : 'warn'} helper="Application TOTP login enforcement" loading={q.isLoading && !q.data} iconPath="/platform/security" />
      <OperationalWorkspaceStatCard label="Active sessions" value={q.data?.active_sessions ?? '—'} helper="Current application session records" loading={q.isLoading && !q.data} iconPath="/platform/sessions" />
      <OperationalWorkspaceStatCard label="Failed logins" value={q.data?.failed_login_count ?? '—'} tone={(q.data?.failed_login_count || 0) > 0 ? 'warn' : 'good'} helper="Current account counter" loading={q.isLoading && !q.data} />
      <OperationalWorkspaceStatCard label="Account lock" value={q.data?.locked_until && new Date(q.data.locked_until).getTime() > Date.now() ? 'Locked' : 'Clear'} tone={q.data?.locked_until && new Date(q.data.locked_until).getTime() > Date.now() ? 'danger' : 'good'} helper={q.data?.locked_until ? formatDate(q.data.locked_until) : 'No active lock'} loading={q.isLoading && !q.data} />
      <OperationalWorkspaceStatCard label="Password changed" value={q.data?.password_changed_at ? new Date(q.data.password_changed_at).toLocaleDateString() : 'Not recorded'} helper="Application account timestamp" loading={q.isLoading && !q.data} />
      <OperationalWorkspaceStatCard label="Last login" value={q.data?.last_login_at ? new Date(q.data.last_login_at).toLocaleDateString() : 'Not recorded'} helper="Application login record" loading={q.isLoading && !q.data} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-security__section">
      <OperationalSectionHeader iconPath="/platform/security" title="My account" description="These values belong to the currently authenticated Platform account only; no staff-wide permission is required to view your own security state." />
      {q.data ? <div className="platform-security__account-grid">
        <div><span>Name</span><strong>{q.data.name || 'Not recorded'}</strong></div>
        <div><span>Email</span><strong>{q.data.email}</strong></div>
        <div><span>Role</span><strong>{q.data.role}</strong></div>
        <div><span>MFA confirmed</span><strong>{formatDate(q.data.mfa_confirmed_at)}</strong></div>
      </div> : q.isLoading ? <div className="platform-security__empty">Loading current account security…</div> : null}
      <div className="platform-security__truth-note">MFA enabled means this application requires a valid TOTP code at Platform login. It does not prove device identity, hardware-backed authentication, or a person’s physical presence. Session records likewise show application sessions, not verified human presence.</div>
    </section>

    <section className="io-workspace-panel platform-security__section">
      <OperationalSectionHeader iconPath="/platform/security" title="Change password" description="Your current password is verified. The new password is stored exactly as entered; leading or trailing spaces are not silently removed. Other active Platform sessions are revoked while this browser session is preserved." />
      <div className="platform-security__form-grid">
        <label>Current password<input type="password" autoComplete="current-password" maxLength={512} value={pwd.current_password} onChange={(event) => setPwd((current) => ({ ...current, current_password: event.target.value }))} /></label>
        <label>New password<input type="password" autoComplete="new-password" minLength={10} maxLength={512} value={pwd.new_password} onChange={(event) => setPwd((current) => ({ ...current, new_password: event.target.value }))} /></label>
        <button type="button" className="app-button app-button--primary" disabled={!canChangePassword || change.isPending} onClick={() => window.confirm('Change your Platform password and revoke your other active sessions?') && change.mutate()}>{change.isPending ? 'Changing…' : 'Change password'}</button>
      </div>
      <small>Minimum 10 characters. The new password must differ from the current password.</small>
      {change.isError ? <div className="platform-security__inline-error">{readableError(change.error)}</div> : null}
    </section>

    <section className="io-workspace-panel platform-security__section">
      <OperationalSectionHeader iconPath="/platform/security" title="TOTP multi-factor authentication" description="Starting setup never disables an already-enabled MFA configuration. Confirming MFA revokes other sessions so future sign-ins use the new TOTP requirement." />
      <div className="platform-security__mfa-actions">
        <button type="button" className="app-button app-button--primary" onClick={() => setupMfa.mutate()} disabled={setupMfa.isPending || mfaEnabled}>{setupMfa.isPending ? 'Starting…' : mfaEnabled ? 'MFA already enabled' : 'Start MFA setup'}</button>
        <span>{mfaEnabled ? 'To replace the current authenticator, first use the verified disable flow below.' : 'MFA remains disabled until setup is confirmed.'}</span>
      </div>
      {setupMfa.isError ? <div className="platform-security__inline-error">{readableError(setupMfa.error)}</div> : null}

      {setup ? <div className="platform-security__mfa-setup">
        <div><strong>Scan authenticator QR code</strong><img src={qrCodeSvg.createQrSvgDataUri(setup.otpauth_url)} alt="Authenticator app setup QR code" /><small>Use a standards-compatible TOTP authenticator.</small></div>
        <div><strong>Manual setup key</strong><code>{setup.secret}</code><small>Algorithm {setup.algorithm || 'SHA1'} · {setup.digits || 6} digits · {setup.period_seconds || 30}-second period</small></div>
      </div> : null}

      <div className="platform-security__form-grid platform-security__confirm-grid">
        <label>Setup confirmation code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" disabled={!setup} /></label>
        <button type="button" className="app-button app-button--primary" disabled={!canConfirmMfa || confirm.isPending} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Confirming…' : 'Confirm MFA'}</button>
      </div>
      {confirm.isError ? <div className="platform-security__inline-error">{readableError(confirm.error)}</div> : null}

      {mfaEnabled ? <div className="platform-security__danger-zone">
        <strong>Disable MFA</strong>
        <p>Disabling MFA weakens login protection, so the backend requires both your current password and a current TOTP code. Other active sessions are revoked after the change.</p>
        <div className="platform-security__form-grid">
          <label>Current password<input type="password" autoComplete="current-password" maxLength={512} value={disableMfaForm.current_password} onChange={(event) => setDisableMfaForm((current) => ({ ...current, current_password: event.target.value }))} /></label>
          <label>Current TOTP code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={disableMfaForm.code} onChange={(event) => setDisableMfaForm((current) => ({ ...current, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))} /></label>
          <button type="button" className="app-button app-button--danger" disabled={!canDisableMfa || disable.isPending} onClick={() => window.confirm('Disable MFA for your Platform account after password and TOTP verification?') && disable.mutate()}>{disable.isPending ? 'Disabling…' : 'Disable MFA'}</button>
        </div>
        {disable.isError ? <div className="platform-security__inline-error">{readableError(disable.error)}</div> : null}
      </div> : null}
    </section>

    {canReadAdminSecurity ? <section className="io-workspace-panel platform-security__section">
      <OperationalSectionHeader iconPath="/platform/users" title="Staff security evidence" description="This is a bounded security snapshot, not a replacement for Platform Users or Platform Sessions. User and session evidence remain independently permission-scoped." />
      {admin.data && !admin.data.evidence_complete ? <div className="platform-security__warning-inline">Restricted sources: {admin.data.omitted_sources.map(prettyFlag).join(', ') || 'None'}. Restricted evidence is null/Restricted, never converted to zero.</div> : null}
      {admin.data ? <>
        <OperationalWorkspaceStats ariaLabel="Staff security summary">
          <OperationalWorkspaceStatCard label="Platform users" value={restrictedValue(admin.data.summary.total_users)} helper="Registry-wide count when PLATFORM_USERS_READ is available" />
          <OperationalWorkspaceStatCard label="Active users" value={restrictedValue(admin.data.summary.active_users)} helper="Registry-wide authorized evidence" />
          <OperationalWorkspaceStatCard label="Locked users" value={restrictedValue(admin.data.summary.locked_users)} tone={(admin.data.summary.locked_users || 0) > 0 ? 'danger' : 'good'} helper="Current application lock window" />
          <OperationalWorkspaceStatCard label="Active without MFA" value={restrictedValue(admin.data.summary.users_without_mfa)} tone={(admin.data.summary.users_without_mfa || 0) > 0 ? 'warn' : 'good'} helper="Application TOTP flag only" />
          <OperationalWorkspaceStatCard label="Failed-login users" value={restrictedValue(admin.data.summary.users_with_failed_logins)} tone={(admin.data.summary.users_with_failed_logins || 0) > 0 ? 'warn' : 'good'} helper="Current login counters" />
          <OperationalWorkspaceStatCard label="Active sessions" value={restrictedValue(admin.data.summary.active_sessions)} helper="Registry-wide count when PLATFORM_SESSIONS_READ is available" />
        </OperationalWorkspaceStats>
        <div className="platform-security__truth-note">The “stale password review” flag is a {admin.data.risk_policy.password_review_age_days}-day application review heuristic, not an enforced password-expiry policy or legal/security standard. The displayed user/session lists are bounded to {admin.data.limits.users} users and {admin.data.limits.active_sessions} sessions; summary counts remain registry-wide.</div>
      </> : admin.isLoading ? <div className="platform-security__empty">Loading authorized staff security evidence…</div> : null}
    </section> : null}

    {canReadAdminSecurity && canReadPlatformUsers && admin.data ? <section className="io-workspace-panel platform-security__section">
      <OperationalSectionHeader iconPath="/platform/users" title="Priority staff review" description={`Up to ${admin.data.limits.users} Platform users, ordered with active lock/MFA/login-risk signals first. Use Platform Users for full registry workflows.`} />
      {!canWriteAdminSecurity ? <div className="platform-security__warning-inline">Read-only security access: staff mutation controls are unavailable.</div> : null}
      {canWriteAdminSecurity && !canRevokePlatformSessions ? <div className="platform-security__warning-inline">Administrative MFA clearing is unavailable without PLATFORM_SESSIONS_REVOKE because clearing MFA revokes that user’s active sessions.</div> : null}
      <div className="platform-security__table-wrap"><table><thead><tr><th>User</th><th>Security state</th><th>Last login</th><th>Sessions</th><th>Evidence</th><th>Actions</th></tr></thead><tbody>
        {adminUsers.map((user) => {
          const locked = user.risk_flags.includes('locked');
          return <tr key={user.id}>
            <td><strong>{user.name}</strong><small>{user.email} · {user.role}</small></td>
            <td>{user.risk_flags.length ? <div className="platform-security__chips">{user.risk_flags.map((flag) => <span key={flag}>{prettyFlag(flag)}</span>)}</div> : 'No current application flags'}</td>
            <td>{formatDate(user.last_login_at)}</td>
            <td>{user.active_sessions === null ? 'Restricted' : user.active_sessions}</td>
            <td>{canReadAudit ? <Link to={`/platform/audit?source=security&target_type=platform_users&target_id=${encodeURIComponent(user.id)}`}>Audit history</Link> : 'Audit restricted'}</td>
            <td><div className="platform-security__row-actions">
              <button type="button" className="app-button app-button--secondary" disabled={!canUnlockAdminUsers || !locked || unlock.isPending} title={!locked ? 'User is not currently locked.' : undefined} onClick={() => window.confirm(`Unlock Platform user ${user.email}?`) && unlock.mutate(user.id)}>Unlock</button>
              <button type="button" className="app-button app-button--danger" disabled={!canClearAdminMfa || !user.mfa_enabled || clearMfa.isPending} onClick={() => window.confirm(`Administratively clear MFA for ${user.email} and revoke all of that user's active Platform sessions?`) && clearMfa.mutate(user.id)}>{user.mfa_enabled ? 'Clear MFA' : 'MFA clear'}</button>
            </div></td>
          </tr>;
        })}
        {!adminUsers.length ? <tr><td colSpan={6} className="platform-security__empty">No authorized Platform user evidence returned.</td></tr> : null}
      </tbody></table></div>
      {admin.data.truncated.users ? <small>Priority list truncated. Open Platform Users for the complete registry.</small> : null}
      {unlock.isError ? <div className="platform-security__inline-error">{readableError(unlock.error)}</div> : null}
      {clearMfa.isError ? <div className="platform-security__inline-error">{readableError(clearMfa.error)}</div> : null}
    </section> : null}

    {canReadAdminSecurity && canReadPlatformSessions && admin.data ? <section className="io-workspace-panel platform-security__section">
      <OperationalSectionHeader iconPath="/platform/sessions" title="Recent active staff sessions" description={`Up to ${admin.data.limits.active_sessions} active Platform session records. Platform-user identity remains hidden when PLATFORM_USERS_READ is unavailable.`} />
      <div className="platform-security__table-wrap"><table><thead><tr><th>User</th><th>IP</th><th>Last used</th><th>Expires</th><th>User agent</th></tr></thead><tbody>
        {adminSessions.map((session) => <tr key={session.id}>
          <td>{session.platform_user_identity_restricted ? <strong>Restricted Platform user</strong> : <><strong>{session.name || session.email || 'Platform user'}</strong><small>{session.email} · {session.role}</small></>}</td>
          <td>{session.ip_address || 'Not recorded'}</td>
          <td>{formatDate(session.last_used_at || session.created_at)}</td>
          <td>{formatDate(session.expires_at)}</td>
          <td className="platform-security__wrap">{session.user_agent || 'Not recorded'}</td>
        </tr>)}
        {!adminSessions.length ? <tr><td colSpan={5} className="platform-security__empty">No active session evidence returned.</td></tr> : null}
      </tbody></table></div>
      {admin.data.truncated.active_sessions ? <small>Session list truncated. Open Platform Sessions for the complete registry.</small> : null}
    </section> : null}

    <section className="io-workspace-panel platform-security__section">
      <OperationalSectionHeader iconPath="/platform/security" title="Supporting operations" description="Only destinations allowed by the current live Platform permission snapshot are shown. My Security itself remains available to every authenticated Platform user." />
      <div className="platform-security__links">
        {canReadPlatformUsers ? <Link to="/platform/users">Platform users</Link> : null}
        {canReadPlatformSessions ? <Link to="/platform/sessions">Platform sessions</Link> : null}
        {canReadAudit ? <Link to="/platform/audit?source=security">Platform audit</Link> : null}
        {canReadAccessReviews ? <Link to="/platform/access-reviews">Access reviews</Link> : null}
        {canReadAccessReviews ? <Link to="/platform/permission-audit">Permission audit</Link> : null}
        {canReadRolePermissions ? <Link to="/platform/permissions">Role permissions</Link> : null}
        {canReadAdminSecurity ? <Link to="/platform/enterprise-identity">Enterprise identity</Link> : null}
      </div>
    </section>
  </div>;
}
