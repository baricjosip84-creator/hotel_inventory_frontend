import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import RolePermissionEditor from '../components/permissions/RolePermissionEditor';
import { OperationalSectionHeader } from '../components/ui/OperationalWorkspace';
import {
  createTenantCustomRole,
  deleteTenantCustomRole,
  duplicateTenantCustomRole,
  fetchTenantPermissionPolicyMatrix,
  isReservedTenantCustomRoleName,
  RESERVED_TENANT_CUSTOM_ROLE_NAME_MESSAGE,
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
import './TenantPermissionsPage.css';

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
  const customRoles = useMemo(
    () => query.data?.roles.filter((role) => role.role_kind === 'custom') ?? [],
    [query.data]
  );
  const draftPermissions = draftByRole[selectedRole] ?? activeRole?.effective_permissions ?? [];
  const createNameValid = createName.trim().length >= 2;
  const metadataNameValid = metadataName.trim().length >= 2;
  const metadataDescriptionValue = metadataDescription.trim() || null;
  const metadataDirty = activeRole?.role_kind === 'custom' && (
    metadataName.trim() !== (activeRole.display_name || '') ||
    metadataDescriptionValue !== (activeRole.description || null)
  );
  const selectedTemplate = query.data?.custom_role_templates.find((template) => template.key === createTemplateKey);

  const updateDraft = (permissions: TenantPermission[]) => {
    setDraftByRole((current) => ({ ...current, [selectedRole]: permissions }));
  };

  const discardDraftForRole = (roleKey: TenantRolePolicyKey) => {
    setDraftByRole((current) => {
      if (!(roleKey in current)) return current;
      const next = { ...current };
      delete next[roleKey];
      return next;
    });
  };

  const selectRole = (role: TenantRolePermissionPolicy) => {
    setSelectedRole(role.role);
    setMetadataName(role.role_kind === 'custom' ? role.display_name || '' : '');
    setMetadataDescription(role.role_kind === 'custom' ? role.description || '' : '');
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const reloadAndSelect = async (roleKey?: TenantRolePolicyKey) => {
    const result = await query.refetch();
    const nextRole = roleKey ? result.data?.roles.find((role) => role.role === roleKey) : undefined;
    if (nextRole) selectRole(nextRole);
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
    if (isReservedTenantCustomRoleName(createName)) {
      setSuccessMessage(null);
      setErrorMessage(RESERVED_TENANT_CUSTOM_ROLE_NAME_MESSAGE);
      return;
    }
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
    if (isReservedTenantCustomRoleName(metadataName)) {
      setSuccessMessage(null);
      setErrorMessage(RESERVED_TENANT_CUSTOM_ROLE_NAME_MESSAGE);
      return;
    }
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

    if (!nextActive && activeRole.can_deactivate === false) {
      setSuccessMessage(null);
      setErrorMessage('Reassign all users before deactivating this custom role.');
      return;
    }
    if (nextActive && activeRole.can_activate === false) return;

    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${roleName(activeRole)}?`)) return;
    setManaging(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const roleKey = activeRole.role;
      const updated = await updateTenantCustomRole({ id, version: activeRole.version || 1, is_active: nextActive });
      discardDraftForRole(roleKey);
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
    if (name.trim().length < 2) {
      setSuccessMessage(null);
      setErrorMessage('Custom role name must contain at least 2 characters.');
      return;
    }
    if (isReservedTenantCustomRoleName(name)) {
      setSuccessMessage(null);
      setErrorMessage(RESERVED_TENANT_CUSTOM_ROLE_NAME_MESSAGE);
      return;
    }
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

    if (activeRole.can_delete === false) {
      setSuccessMessage(null);
      setErrorMessage('Reassign all users before deleting this custom role.');
      return;
    }

    if (!window.confirm(`Delete ${roleName(activeRole)}? This permanently removes the role definition after all users have been reassigned.`)) return;
    setManaging(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const roleKey = activeRole.role;
      const deletedName = roleName(activeRole);
      await deleteTenantCustomRole({ id, version: activeRole.version || 1 });
      discardDraftForRole(roleKey);
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
        Tenant permission settings could not be loaded. Check tenant administrator access and try again.
      </div>
    );
  }

  const customRolePanel = (
    <div className="tenant-permissions-custom-role-area">
      <section className="app-panel tenant-permissions-panel">
        <OperationalSectionHeader
          iconPath="/users"
          title="Custom role library"
          description="Select a tenant-specific role to review its lifecycle, assignment status, and starting template."
        />
        {customRoles.length ? (
          <div className="tenant-permissions-role-grid" aria-label="Tenant custom roles">
            {customRoles.map((role) => (
              <button
                key={role.role}
                type="button"
                className={`tenant-permissions-role-card${role.role === selectedRole ? ' is-active' : ''}${role.is_active === false ? ' is-inactive' : ''}`}
                aria-pressed={role.role === selectedRole}
                onClick={() => selectRole(role)}
              >
                <span className="tenant-permissions-role-card__topline">
                  <strong>{roleName(role)}</strong>
                  <em>{role.is_active === false ? 'Inactive' : 'Active'}</em>
                </span>
                <span>{role.effective_permissions.length} permissions · {role.user_count || 0} assigned users</span>
                <span className="tenant-permissions-role-card__footer">
                  <small>Starting point: {role.source_template_name || 'Blank role'}</small>
                  <span className="tenant-permissions-role-card__manage">
                    {role.role === selectedRole ? 'Selected' : 'Manage →'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="app-empty-state tenant-permissions-empty-role-state">
            No tenant custom roles have been created yet.
          </div>
        )}
      </section>

      <form onSubmit={createCustomRole} data-skip-global-action-feedback="true" className="app-panel tenant-permissions-panel tenant-permissions-create-panel">
        <OperationalSectionHeader
          iconPath="/permissions"
          title="Create custom role"
          description="Start blank, copy a protected baseline, or use an operational template. The new role belongs only to this tenant."
          actions={<span className="tenant-permissions-template-count">{query.data.custom_role_templates.length} templates</span>}
        />
        <div className="tenant-permissions-form-grid">
          <label className="tenant-permissions-field">
            <span>Role name</span>
            <input value={createName} onChange={(event) => setCreateName(event.target.value)} maxLength={80} required placeholder="Example: Receiving Clerk" />
          </label>
          <label className="tenant-permissions-field">
            <span>Starting template</span>
            <select value={createTemplateKey} onChange={(event) => setCreateTemplateKey(event.target.value)}>
              <option value="">Blank role — dashboard only</option>
              {query.data.custom_role_templates.map((template) => (
                <option key={template.key} value={template.key}>{template.name} · {template.permission_count} permissions</option>
              ))}
            </select>
          </label>
          <label className="tenant-permissions-field tenant-permissions-field--wide">
            <span>Description (optional)</span>
            <input value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} maxLength={500} placeholder="What this role is responsible for" />
          </label>
        </div>
        {selectedTemplate ? (
          <div className="tenant-permissions-template-preview">
            <strong>{selectedTemplate.name}</strong>
            <span>{selectedTemplate.description}</span>
          </div>
        ) : null}
        <div className="tenant-permissions-safety-note">
          Custom roles cannot use the protected Admin, Manager, or Staff names and cannot receive tenant deletion, user administration, or role-permission administration rights. Required Read permissions are added automatically when an operational action depends on them.
        </div>
        <div className="tenant-permissions-panel-actions">
          <button type="submit" className="app-button app-button--primary" disabled={creating || !createNameValid}>
            {creating ? 'Creating…' : 'Create custom role'}
          </button>
        </div>
      </form>

      {activeRole?.role_kind === 'custom' ? (
        <section data-skip-global-action-feedback="true" className="app-panel tenant-permissions-panel tenant-permissions-manage-panel">
          <OperationalSectionHeader
            iconPath="/permissions"
            title={`Manage ${roleName(activeRole)}`}
            description={`${activeRole.user_count || 0} assigned users · ${activeRole.is_active === false ? 'Inactive' : 'Active'} · starting point: ${activeRole.source_template_name || 'Blank role'}`}
          />
          <div className="tenant-permissions-form-grid tenant-permissions-form-grid--manage">
            <label className="tenant-permissions-field">
              <span>Name</span>
              <input value={metadataName} onChange={(event) => setMetadataName(event.target.value)} maxLength={80} />
            </label>
            <label className="tenant-permissions-field">
              <span>Description</span>
              <input value={metadataDescription} onChange={(event) => setMetadataDescription(event.target.value)} maxLength={500} />
            </label>
          </div>
          <div className="tenant-permissions-lifecycle-note">
            {activeRole.user_count
              ? `${activeRole.user_count} user${activeRole.user_count === 1 ? '' : 's'} must be reassigned before this role can be deactivated or deleted.`
              : activeRole.is_active === false
                ? 'Inactive roles retain their definition but cannot be assigned or edited until reactivated.'
                : 'No users are assigned. This role can be safely deactivated if it is no longer needed.'}
          </div>
          <div className="tenant-permissions-panel-actions tenant-permissions-panel-actions--manage">
            <button
              type="button"
              className="app-button app-button--secondary"
              disabled={managing || !metadataNameValid || !metadataDirty}
              onClick={() => void updateMetadata()}
            >
              Save details
            </button>
            <button type="button" className="app-button app-button--secondary" disabled={managing} onClick={() => void duplicateCustomRole()}>
              Duplicate
            </button>
            <button
              type="button"
              className="app-button app-button--secondary"
              disabled={managing || (activeRole.is_active === false ? activeRole.can_activate === false : activeRole.can_deactivate === false)}
              onClick={() => void toggleCustomRoleActive()}
              title={activeRole.is_active !== false && activeRole.can_deactivate === false ? 'Reassign all users before deactivating this role.' : undefined}
            >
              {activeRole.is_active === false ? 'Activate' : 'Deactivate'}
            </button>
            <button
              type="button"
              className="app-button app-button--danger"
              disabled={managing || activeRole.can_delete === false}
              onClick={() => void removeCustomRole()}
              title={activeRole.can_delete === false ? 'Reassign all users before deleting this role.' : undefined}
            >
              Delete role
            </button>
          </div>
        </section>
      ) : (
        customRoles.length ? (
          <div className="app-empty-state tenant-permissions-custom-role-prompt">
            Select a custom role above to manage its name, lifecycle, and assignment safety.
          </div>
        ) : null
      )}
    </div>
  );

  return (
    <RolePermissionEditor
      title="Tenant permission management"
      description="Control built-in role access and tenant-specific custom roles without exposing users to unnecessary technical detail. Protected administration rights and tenant isolation remain enforced by the backend."
      scopeLabel="Tenant"
      reservedLabel="Tenant Admin only"
      operationalWorkspace
      workspaceIconPath="/permissions"
      workspaceEyebrow="People & access"
      roles={query.data.roles}
      catalog={query.data.permission_catalog}
      permissionDependencies={query.data.permission_dependencies}
      selectedRole={selectedRole}
      onDiscardDraft={() => discardDraftForRole(selectedRole)}
      onSelectedRoleChange={(role) => {
        const nextRole = query.data.roles.find((item) => item.role === role);
        if (nextRole) selectRole(nextRole);
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
