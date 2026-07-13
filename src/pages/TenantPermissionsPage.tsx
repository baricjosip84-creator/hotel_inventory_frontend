import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import RolePermissionEditor from '../components/permissions/RolePermissionEditor';
import {
  fetchTenantPermissionPolicyMatrix,
  resetTenantRolePermissionPolicy,
  saveTenantRolePermissionPolicy,
  type TenantPermissionPolicyMatrix
} from '../lib/permissionPolicies';
import type { TenantPermission, UserRole } from '../lib/permissions';

type EditableTenantRole = Extract<UserRole, 'admin' | 'manager' | 'staff'>;
const TENANT_ROLES: EditableTenantRole[] = ['admin', 'manager', 'staff'];

export default function TenantPermissionsPage() {
  const query = useQuery<TenantPermissionPolicyMatrix>({
    queryKey: ['tenant-role-permissions'],
    queryFn: fetchTenantPermissionPolicyMatrix
  });
  const [selectedRole, setSelectedRole] = useState<EditableTenantRole>('admin');
  const [draftByRole, setDraftByRole] = useState<Partial<Record<EditableTenantRole, TenantPermission[]>>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRole = useMemo(
    () => query.data?.roles.find((role) => role.role === selectedRole),
    [query.data, selectedRole]
  );
  const draftPermissions = draftByRole[selectedRole] ?? activeRole?.effective_permissions ?? [];

  const updateDraft = (permissions: TenantPermission[]) => {
    setDraftByRole((current) => ({ ...current, [selectedRole]: permissions }));
  };

  const save = async () => {
    if (!activeRole?.editable || saving || resetting) return;
    const confirmed = window.confirm(
      `Save ${selectedRole} permissions for this tenant? Backend authorization changes immediately for every active ${selectedRole} user.`
    );
    if (!confirmed) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await saveTenantRolePermissionPolicy(selectedRole, draftPermissions);
      setDraftByRole((current) => ({ ...current, [selectedRole]: updated.effective_permissions }));
      await query.refetch();
      setSuccessMessage(`${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} permissions saved successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Tenant permissions could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!activeRole?.editable || activeRole.is_default || saving || resetting) return;
    const confirmed = window.confirm(
      `Reset ${selectedRole} to the hardcoded default permissions? All tenant-specific overrides for this role will be removed.`
    );
    if (!confirmed) return;

    setResetting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await resetTenantRolePermissionPolicy(selectedRole);
      setDraftByRole((current) => ({ ...current, [selectedRole]: updated.effective_permissions }));
      await query.refetch();
      setSuccessMessage(`${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} permissions reset to defaults.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Tenant permissions could not be reset.');
    } finally {
      setResetting(false);
    }
  };

  if (query.isLoading) return <div className="app-loading-state">Loading tenant permission policies…</div>;
  if (query.isError || !query.data) {
    return (
      <div className="app-error-state">
        Tenant permission policies could not be loaded. Check tenant-admin access and backend migration 486.
      </div>
    );
  }

  return (
    <RolePermissionEditor
      title="Tenant Permissions"
      description="Control the effective permissions for Admin, Manager, and Staff inside this tenant. Safe hardcoded defaults remain the reset baseline; tenant-specific overrides are audited and isolated to this tenant."
      scopeLabel="Tenant"
      reservedLabel="Tenant Admin only"
      roles={query.data.roles}
      catalog={query.data.permission_catalog}
      selectedRole={selectedRole}
      onSelectedRoleChange={(role) => {
        if (!TENANT_ROLES.includes(role)) return;
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
