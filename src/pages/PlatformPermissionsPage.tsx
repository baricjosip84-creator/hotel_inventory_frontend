import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import RolePermissionEditor from '../components/permissions/RolePermissionEditor';
import { ApiError } from '../lib/api';
import {
  fetchPlatformPermissionPolicyMatrix,
  resetPlatformRolePermissionPolicy,
  savePlatformRolePermissionPolicy,
  type PlatformPermissionPolicyMatrix
} from '../lib/permissionPolicies';
import type { PlatformRole } from '../lib/platformAuth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission, type PlatformPermission } from '../lib/platformPermissions';
import './PlatformPermissionsPage.css';

export default function PlatformPermissionsPage() {
  const query = useQuery<PlatformPermissionPolicyMatrix>({
    queryKey: ['platform-role-permissions'],
    queryFn: fetchPlatformPermissionPolicyMatrix,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true
  });
  const [selectedRole, setSelectedRole] = useState<PlatformRole>('support');
  const [draftByRole, setDraftByRole] = useState<Partial<Record<PlatformRole, PlatformPermission[]>>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRole = useMemo(
    () => query.data?.roles.find((role) => role.role === selectedRole),
    [query.data, selectedRole]
  );
  const draftPermissions = draftByRole[selectedRole] ?? activeRole?.effective_permissions ?? [];
  const dirty = Boolean(activeRole) && (
    draftPermissions.length !== activeRole!.effective_permissions.length ||
    draftPermissions.some((permission) => !activeRole!.effective_permissions.includes(permission))
  );

  const updateDraft = (permissions: PlatformPermission[]) => {
    setDraftByRole((current) => ({ ...current, [selectedRole]: permissions }));
  };

  const refresh = async () => {
    if (dirty && !window.confirm('Refresh the saved Platform role policy while keeping your unsaved draft for comparison?')) return;
    setSuccessMessage(null);
    setErrorMessage(null);
    const result = await query.refetch();
    if (result.error) setErrorMessage('Platform permission policies could not be refreshed. Showing the last successful snapshot.');
  };

  const handleStalePolicy = async () => {
    await query.refetch();
    setErrorMessage('This role policy changed after your snapshot. The latest saved policy is loaded; review your unsaved draft before saving again.');
  };

  const save = async () => {
    if (!activeRole?.editable || saving || resetting) return;
    if (!activeRole.revision) {
      setErrorMessage('This role policy snapshot has no concurrency revision. Refresh before saving.');
      return;
    }
    const confirmed = window.confirm(
      `Save ${selectedRole} Platform permissions? Authorization changes immediately for every active Platform user assigned to this role.`
    );
    if (!confirmed) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await savePlatformRolePermissionPolicy(selectedRole, draftPermissions, activeRole.revision);
      setDraftByRole((current) => ({ ...current, [selectedRole]: updated.effective_permissions }));
      await query.refetch();
      setSuccessMessage(`${selectedRole.replace(/_/g, ' ')} permissions saved successfully.`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLATFORM_ROLE_POLICY_STALE') {
        await handleStalePolicy();
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Platform permissions could not be saved.');
      }
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!activeRole?.editable || activeRole.is_default || saving || resetting) return;
    if (!activeRole.revision) {
      setErrorMessage('This role policy snapshot has no concurrency revision. Refresh before resetting.');
      return;
    }
    const confirmed = window.confirm(
      `Reset ${selectedRole} to the hardcoded Platform defaults? All saved overrides for this role will be removed.`
    );
    if (!confirmed) return;

    setResetting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await resetPlatformRolePermissionPolicy(selectedRole, activeRole.revision);
      setDraftByRole((current) => ({ ...current, [selectedRole]: updated.effective_permissions }));
      await query.refetch();
      setSuccessMessage(`${selectedRole.replace(/_/g, ' ')} permissions reset to defaults.`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PLATFORM_ROLE_POLICY_STALE') {
        await handleStalePolicy();
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Platform permissions could not be reset.');
      }
    } finally {
      setResetting(false);
    }
  };

  if (!query.data) {
    return (
      <section className="platform-permissions-load-error app-error-state" role="alert">
        <strong>Platform permission policies could not be loaded.</strong>
        <span>No valid policy snapshot is available.</span>
        <button type="button" className="app-button app-button--secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>
          {query.isFetching ? 'Retrying…' : 'Retry'}
        </button>
      </section>
    );
  }

  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadPermissionAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const staleWarning = query.isRefetchError ? 'Platform permission refresh failed. Showing the last successful snapshot.' : null;

  return (
    <RolePermissionEditor
      title="Platform Permissions"
      description="Govern the application authorization policy for fixed Platform roles. Superadmin remains immutable. Changes are concurrency-protected, audited, and enforced against current policy on active requests; they do not prove access to any external system."
      scopeLabel="Platform"
      reservedLabel="Superadmin only"
      roles={query.data.roles}
      catalog={query.data.permission_catalog}
      selectedRole={selectedRole}
      onDiscardDraft={() => {
        setDraftByRole((current) => {
          const next = { ...current };
          delete next[selectedRole];
          return next;
        });
      }}
      onSelectedRoleChange={(role) => {
        setSelectedRole(role);
        setSuccessMessage(null);
        setErrorMessage(null);
      }}
      draftPermissions={draftPermissions}
      onDraftPermissionsChange={updateDraft}
      onSave={save}
      onReset={reset}
      onRefresh={refresh}
      refreshing={query.isFetching}
      saving={saving}
      resetting={resetting}
      successMessage={successMessage}
      warningMessage={staleWarning}
      errorMessage={errorMessage}
      operationalWorkspace
      workspaceIconPath="/permissions"
      workspaceEyebrow="Platform access governance"
      footerAddon={(
        <section className="platform-permissions__evidence app-panel">
          <div>
            <strong>Authorization evidence boundary</strong>
            <p>
              This workspace controls application permissions for Platform roles. Backend requests reload the current role policy, and removing Support Session start permission closes active or pending support access for that role. A permission assignment does not prove that an external vendor, infrastructure account, or customer system granted equivalent access.
            </p>
          </div>
          <nav aria-label="Platform permission supporting operations">
            {canReadUsers ? <Link to="/platform/users">Platform users</Link> : null}
            {canReadPermissionAudit ? <Link to="/platform/permission-audit">Permission audit</Link> : null}
            {canReadAudit ? <Link to="/platform/audit?source=role_permissions">Platform audit</Link> : null}
          </nav>
        </section>
      )}
    />
  );
}
