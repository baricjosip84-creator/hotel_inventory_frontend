import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import RolePermissionEditor from '../components/permissions/RolePermissionEditor';
import {
  createTenantCustomRole,
  deleteTenantCustomRole,
  duplicateTenantCustomRole,
  fetchTenantPermissionPolicyMatrix,
  resetTenantCustomRolePermissions,
  resetTenantRolePermissionPolicy,
  saveTenantCustomRolePermissions,
  saveTenantRolePermissionPolicy,
  updateTenantCustomRole,
  type BuiltInTenantRole,
  type TenantPermissionPolicyMatrix,
  type TenantRolePermissionPolicy,
  type TenantRolePolicyKey
} from '../lib/permissionPolicies';
import type { TenantPermission } from '../lib/permissions';

function roleName(role: TenantRolePermissionPolicy): string {
  return role.display_name || role.role;
}

function customRoleId(role: TenantRolePermissionPolicy | undefined): string | null {
  return role?.role_kind === 'custom' && role.role_id ? role.role_id : null;
}

export default function TenantPermissionsPage() {
  const query = useQuery<TenantPermissionPolicyMatrix>({
    queryKey: ['tenant-role-permissions'],
    queryFn: fetchTenantPermissionPolicyMatrix
  });
  const [selectedRole, setSelectedRole] = useState<TenantRolePolicyKey>('admin');
  const [draftByRole, setDraftByRole] = useState<Record<string, TenantPermission[]>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createTemplateKey, setCreateTemplateKey] = useState('');
  const [metadataName, setMetadataName] = useState('');
  const [metadataDescription, setMetadataDescription] = useState('');

  const activeRole = useMemo(
    () => query.data?.roles.find((role) => role.role === selectedRole),
    [query.data, selectedRole]
  );
  const draftPermissions = draftByRole[selectedRole] ?? activeRole?.effective_permissions ?? [];

  const updateDraft = (permissions: TenantPermission[]) => {
    setDraftByRole((current) => ({ ...current, [selectedRole]: permissions }));
  };

  const reloadAndSelect = async (roleKey?: TenantRolePolicyKey) => {
    const result = await query.refetch();
    const nextRole = roleKey ? result.data?.roles.find((role) => role.role === roleKey) : undefined;
    if (nextRole) {
      setSelectedRole(nextRole.role);
      setMetadataName(nextRole.role_kind === 'custom' ? nextRole.display_name || '' : '');
      setMetadataDescription(nextRole.role_kind === 'custom' ? nextRole.description || '' : '');
    }
  };

  const save = async () => {
    if (!activeRole?.editable || saving || resetting) return;
    const confirmed = window.confirm(
      `Save permissions for ${roleName(activeRole)}? Backend authorization changes immediately for every user assigned to this role.`
    );
    if (!confirmed) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      let updated: TenantRolePermissionPolicy;
      const id = customRoleId(activeRole);
      if (id) {
        updated = await saveTenantCustomRolePermissions({
          id,
          version: activeRole.version || 1,
          permissions: draftPermissions
        });
      } else {
        updated = await saveTenantRolePermissionPolicy(activeRole.role as BuiltInTenantRole, draftPermissions);
      }
      setDraftByRole((current) => ({ ...current, [selectedRole]: updated.effective_permissions }));
      await reloadAndSelect(updated.role);
      setSuccessMessage(`${roleName(updated)} permissions saved successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Tenant permissions could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!activeRole?.editable || activeRole.is_default || saving || resetting) return;
    const custom = activeRole.role_kind === 'custom';
    const confirmed = window.confirm(
      custom
        ? `Reset ${roleName(activeRole)} to the permission set captured when the role was created?`
        : `Reset ${roleName(activeRole)} to the hardcoded default permissions? All tenant-specific overrides for this role will be removed.`
    );
    if (!confirmed) return;

    setResetting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      let updated: TenantRolePermissionPolicy;
      const id = customRoleId(activeRole);
      if (id) {
        updated = await resetTenantCustomRolePermissions({ id, version: activeRole.version || 1 });
      } else {
        updated = await resetTenantRolePermissionPolicy(activeRole.role as BuiltInTenantRole);
      }
      setDraftByRole((current) => ({ ...current, [selectedRole]: updated.effective_permissions }));
      await reloadAndSelect(updated.role);
      setSuccessMessage(
        custom
          ? `${roleName(updated)} permissions reset to the starting template.`
          : `${roleName(updated)} permissions reset to defaults.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Tenant permissions could not be reset.');
    } finally {
      setResetting(false);
    }
  };

  const createCustomRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating || !createName.trim()) return;
    setCreating(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const created = await createTenantCustomRole({
        name: createName.trim(),
        description: createDescription.trim() || null,
        template_key: createTemplateKey || null
      });
      setCreateName('');
      setCreateDescription('');
      setCreateTemplateKey('');
      setDraftByRole((current) => ({ ...current, [created.role]: created.effective_permissions }));
      await reloadAndSelect(created.role);
      setSuccessMessage(`${roleName(created)} custom role created successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Custom role could not be created.');
    } finally {
      setCreating(false);
    }
  };

  const updateMetadata = async () => {
    const id = customRoleId(activeRole);
    if (!id || !activeRole || managing || !metadataName.trim()) return;
    setManaging(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await updateTenantCustomRole({
        id,
        version: activeRole.version || 1,
        name: metadataName.trim(),
        description: metadataDescription.trim() || null
      });
      await reloadAndSelect(updated.role);
      setSuccessMessage(`${roleName(updated)} details updated successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Custom role details could not be updated.');
    } finally {
      setManaging(false);
    }
  };

  const toggleCustomRoleActive = async () => {
    const id = customRoleId(activeRole);
    if (!id || !activeRole || managing) return;
    const nextActive = activeRole.is_active === false;
    const action = nextActive ? 'activate' : 'deactivate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${roleName(activeRole)}?`)) return;
    setManaging(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await updateTenantCustomRole({ id, version: activeRole.version || 1, is_active: nextActive });
      await reloadAndSelect(updated.role);
      setSuccessMessage(`${roleName(updated)} ${nextActive ? 'activated' : 'deactivated'} successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Custom role could not be ${action}d.`);
    } finally {
      setManaging(false);
    }
  };

  const duplicateCustomRole = async () => {
    const id = customRoleId(activeRole);
    if (!id || !activeRole || managing) return;
    const name = window.prompt('Name for the copied custom role:', `${roleName(activeRole)} Copy`);
    if (!name?.trim()) return;
    setManaging(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const duplicated = await duplicateTenantCustomRole({ id, name: name.trim() });
      setDraftByRole((current) => ({ ...current, [duplicated.role]: duplicated.effective_permissions }));
      await reloadAndSelect(duplicated.role);
      setSuccessMessage(`${roleName(duplicated)} created from ${roleName(activeRole)}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Custom role could not be duplicated.');
    } finally {
      setManaging(false);
    }
  };

  const removeCustomRole = async () => {
    const id = customRoleId(activeRole);
    if (!id || !activeRole || managing) return;
    if (!window.confirm(`Delete ${roleName(activeRole)}? This is allowed only after every assigned user is reassigned.`)) return;
    setManaging(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const deletedName = roleName(activeRole);
      await deleteTenantCustomRole({ id, version: activeRole.version || 1 });
      setDraftByRole((current) => {
        const next = { ...current };
        delete next[activeRole.role];
        return next;
      });
      setSelectedRole('admin');
      await reloadAndSelect('admin');
      setSuccessMessage(`${deletedName} deleted successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Custom role could not be deleted.');
    } finally {
      setManaging(false);
    }
  };

  if (query.isLoading) return <div className="app-loading-state">Loading tenant permission policies…</div>;
  if (query.isError || !query.data) {
    return (
      <div className="app-error-state">
        Tenant permission policies could not be loaded. Check tenant-admin access and backend migrations 486 and 487.
      </div>
    );
  }

  const customRolePanel = (
    <div style={styles.customRoleArea}>
      <form onSubmit={createCustomRole} data-skip-global-action-feedback="true" style={styles.createCard}>
        <div style={styles.cardHeading}>
          <div>
            <h2 style={styles.cardTitle}>Create custom role</h2>
            <p style={styles.cardDescription}>Start blank, copy the safe Manager or Staff baseline, or use a real-world operational template. The new role is isolated to this tenant.</p>
          </div>
          <span style={styles.templateCount}>{query.data.custom_role_templates.length} templates</span>
        </div>
        <div style={styles.createGrid}>
          <label style={styles.field}>
            <span>Role name</span>
            <input value={createName} onChange={(event) => setCreateName(event.target.value)} maxLength={80} required style={styles.input} placeholder="Example: Receiving Clerk" />
          </label>
          <label style={styles.field}>
            <span>Starting template</span>
            <select value={createTemplateKey} onChange={(event) => setCreateTemplateKey(event.target.value)} style={styles.input}>
              <option value="">Blank role — dashboard only</option>
              {query.data.custom_role_templates.map((template) => (
                <option key={template.key} value={template.key}>{template.name} · {template.permission_count} permissions</option>
              ))}
            </select>
          </label>
          <label style={{ ...styles.field, ...styles.descriptionField }}>
            <span>Description (optional)</span>
            <input value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} maxLength={500} style={styles.input} placeholder="What this role is responsible for" />
          </label>
          <button type="submit" style={{ ...styles.primaryButton, ...((creating || !createName.trim()) ? styles.disabled : {}) }} disabled={creating || !createName.trim()}>
            {creating ? 'Creating…' : 'Create custom role'}
          </button>
        </div>
        <p style={styles.safetyNote}>Custom roles cannot receive tenant deletion, user administration, or role-permission administration rights. Required Read permissions are added automatically when operational actions depend on them.</p>
      </form>

      {activeRole?.role_kind === 'custom' ? (
        <div data-skip-global-action-feedback="true" style={styles.manageCard}>
          <div style={styles.cardHeading}>
            <div>
              <h2 style={styles.cardTitle}>Manage selected custom role</h2>
              <p style={styles.cardDescription}>{activeRole.user_count || 0} assigned users · {activeRole.is_active === false ? 'Inactive' : 'Active'} · starting point: {activeRole.source_template_name || 'Blank role'}</p>
            </div>
          </div>
          <div style={styles.manageGrid}>
            <label style={styles.field}><span>Name</span><input value={metadataName} onChange={(event) => setMetadataName(event.target.value)} maxLength={80} style={styles.input} /></label>
            <label style={styles.field}><span>Description</span><input value={metadataDescription} onChange={(event) => setMetadataDescription(event.target.value)} maxLength={500} style={styles.input} /></label>
          </div>
          <div style={styles.actions}>
            <button type="button" style={styles.secondaryButton} disabled={managing || !metadataName.trim()} onClick={() => void updateMetadata()}>Save details</button>
            <button type="button" style={styles.secondaryButton} disabled={managing} onClick={() => void duplicateCustomRole()}>Duplicate</button>
            <button
              type="button"
              style={styles.secondaryButton}
              disabled={managing || (activeRole.is_active !== false && !activeRole.can_deactivate)}
              onClick={() => void toggleCustomRoleActive()}
              title={activeRole.user_count ? 'Reassign all users before deactivating this role.' : undefined}
            >
              {activeRole.is_active === false ? 'Activate' : 'Deactivate'}
            </button>
            <button
              type="button"
              style={styles.dangerButton}
              disabled={managing || !activeRole.can_delete}
              onClick={() => void removeCustomRole()}
              title={activeRole.user_count ? 'Reassign all users before deleting this role.' : undefined}
            >
              Delete role
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <RolePermissionEditor
      title="Tenant Permissions"
      description="Control protected built-in roles and tenant-specific custom roles. Backend enforcement, tenant isolation, audit logging, reserved administration rights, and reset baselines remain mandatory."
      scopeLabel="Tenant"
      reservedLabel="Tenant Admin only"
      roles={query.data.roles}
      catalog={query.data.permission_catalog}
      selectedRole={selectedRole}
      onSelectedRoleChange={(role) => {
        const nextRole = query.data.roles.find((item) => item.role === role);
        setSelectedRole(role);
        setMetadataName(nextRole?.role_kind === 'custom' ? nextRole.display_name || '' : '');
        setMetadataDescription(nextRole?.role_kind === 'custom' ? nextRole.description || '' : '');
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
      headerAddon={customRolePanel}
    />
  );
}

const styles: Record<string, CSSProperties> = {
  customRoleArea: { display: 'grid', gap: 14 },
  createCard: { display: 'grid', gap: 16, background: '#fff', border: '1px solid #dbe3ef', borderRadius: 16, padding: 18 },
  manageCard: { display: 'grid', gap: 14, background: '#f8fbff', border: '1px solid #bfdbfe', borderRadius: 16, padding: 18 },
  cardHeading: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  cardTitle: { margin: 0, fontSize: 20 },
  cardDescription: { margin: '6px 0 0', color: '#64748b', lineHeight: 1.45, maxWidth: 820 },
  templateCount: { background: '#eef4ff', color: '#174ea6', borderRadius: 999, padding: '7px 10px', fontWeight: 700 },
  createGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  manageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  descriptionField: { gridColumn: 'span 1' },
  field: { display: 'grid', gap: 6, fontWeight: 700, color: '#334155' },
  input: { width: '100%', minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 10, padding: '0 11px', fontSize: 14, boxSizing: 'border-box', background: '#fff' },
  safetyNote: { margin: 0, color: '#475569', lineHeight: 1.5, background: '#f8fafc', borderRadius: 10, padding: 11 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  primaryButton: { minHeight: 42, border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', padding: '0 15px', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { minHeight: 40, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#0f172a', padding: '0 13px', fontWeight: 750, cursor: 'pointer' },
  dangerButton: { minHeight: 40, border: '1px solid #fecaca', borderRadius: 10, background: '#fff1f2', color: '#be123c', padding: '0 13px', fontWeight: 800, cursor: 'pointer' },
  disabled: { opacity: 0.55, cursor: 'not-allowed' }
};
