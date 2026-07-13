import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import RolePermissionEditor from '../components/permissions/RolePermissionEditor';
import {
  fetchPlatformPermissionPolicyMatrix,
  resetPlatformRolePermissionPolicy,
  savePlatformRolePermissionPolicy,
  type PlatformPermissionPolicyMatrix
} from '../lib/permissionPolicies';
import type { PlatformRole } from '../lib/platformAuth';
import type { PlatformPermission } from '../lib/platformPermissions';

export default function PlatformPermissionsPage() {
  const query = useQuery<PlatformPermissionPolicyMatrix>({
    queryKey: ['platform-role-permissions'],
    queryFn: fetchPlatformPermissionPolicyMatrix
  });
  const [selectedRole, setSelectedRole] = useState<PlatformRole>('superadmin');
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

  const updateDraft = (permissions: PlatformPermission[]) => {
    setDraftByRole((current) => ({ ...current, [selectedRole]: permissions }));
  };

  const save = async () => {
    if (!activeRole?.editable || saving || resetting) return;
    const confirmed = window.confirm(
      `Save ${selectedRole} platform permissions? Backend authorization changes immediately for every active platform user assigned to this role.`
    );
    if (!confirmed) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await savePlatformRolePermissionPolicy(selectedRole, draftPermissions);
      setDraftByRole((current) => ({ ...current, [selectedRole]: updated.effective_permissions }));
      await query.refetch();
      setSuccessMessage(`${selectedRole.replace(/_/g, ' ')} permissions saved successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Platform permissions could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!activeRole?.editable || activeRole.is_default || saving || resetting) return;
    const confirmed = window.confirm(
      `Reset ${selectedRole} to the hardcoded platform defaults? All saved overrides for this role will be removed.`
    );
    if (!confirmed) return;

    setResetting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await resetPlatformRolePermissionPolicy(selectedRole);
      setDraftByRole((current) => ({ ...current, [selectedRole]: updated.effective_permissions }));
      await query.refetch();
      setSuccessMessage(`${selectedRole.replace(/_/g, ' ')} permissions reset to defaults.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Platform permissions could not be reset.');
    } finally {
      setResetting(false);
    }
  };

  if (query.isLoading) return <div className="app-loading-state">Loading platform permission policies…</div>;
  if (query.isError || !query.data) {
    return (
      <div style={{ padding: 24, background: '#fff1f2', border: '1px solid #fda4af', borderRadius: 12 }}>
        Platform permission policies could not be loaded. Superadmin access and backend migration 486 are required.
      </div>
    );
  }

  return (
    <RolePermissionEditor
      title="Platform Permissions"
      description="Control platform-role permissions for support, security, billing, operations, tenant success, audit, and viewer users. Superadmin remains immutable and always retains the complete platform permission catalog."
      scopeLabel="Platform"
      reservedLabel="Superadmin only"
      roles={query.data.roles}
      catalog={query.data.permission_catalog}
      selectedRole={selectedRole}
      onSelectedRoleChange={(role) => {
        setSelectedRole(role);
        setSuccessMessage(null);
        setErrorMessage(null);
      }}
      draftPermissions={draftPermissions}
      onDraftPermissionsChange={updateDraft}
      onSave={save}
      onReset={reset}
      saving={saving}
      resetting={resetting}
      successMessage={successMessage}
      errorMessage={errorMessage}
    />
  );
}
