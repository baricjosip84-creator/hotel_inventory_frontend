import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { PermissionCatalogItem, RolePermissionPolicy } from '../../lib/permissionPolicies';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../ui/OperationalWorkspace';
import './RolePermissionEditor.css';

export type RolePermissionEditorProps<Role extends string, Permission extends string> = {
  title: string;
  description: string;
  roles: Array<RolePermissionPolicy<Role, Permission>>;
  catalog: Array<PermissionCatalogItem<Permission>>;
  permissionDependencies?: Partial<Record<Permission, Permission[]>>;
  selectedRole: Role;
  onSelectedRoleChange: (role: Role) => void;
  onDiscardDraft?: () => void;
  draftPermissions: Permission[];
  onDraftPermissionsChange: (permissions: Permission[]) => void;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
  saving: boolean;
  resetting: boolean;
  successMessage?: string | null;
  errorMessage?: string | null;
  scopeLabel: string;
  reservedLabel?: string;
  headerAddon?: ReactNode;
  operationalWorkspace?: boolean;
  workspaceIconPath?: string;
  workspaceEyebrow?: string;
};

type WorkspaceView = 'role-permissions' | 'custom-roles';

function roleLabel(role: string): string {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function groupLabel(group: string): string {
  return group
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function RolePermissionEditor<Role extends string, Permission extends string>({
  title,
  description,
  roles,
  catalog,
  permissionDependencies = {},
  selectedRole,
  onSelectedRoleChange,
  onDiscardDraft,
  draftPermissions,
  onDraftPermissionsChange,
  onSave,
  onReset,
  saving,
  resetting,
  successMessage,
  errorMessage,
  scopeLabel,
  reservedLabel = 'Admin only',
  headerAddon,
  operationalWorkspace = false,
  workspaceIconPath = '/permissions',
  workspaceEyebrow
}: RolePermissionEditorProps<Role, Permission>) {
  const [search, setSearch] = useState('');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('role-permissions');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [showTechnicalKeys, setShowTechnicalKeys] = useState(false);
  const activeRole = roles.find((role) => role.role === selectedRole) || roles[0];
  const builtInRoles = roles.filter((role) => role.role_kind !== 'custom');
  const customRoles = roles.filter((role) => role.role_kind === 'custom');
  const draftSet = useMemo(() => new Set(draftPermissions), [draftPermissions]);
  const defaultSet = useMemo(() => new Set(activeRole?.default_permissions || []), [activeRole]);
  const lockedSet = useMemo(() => new Set(activeRole?.locked_permissions || []), [activeRole]);
  const forbiddenSet = useMemo(() => new Set(activeRole?.forbidden_permissions || []), [activeRole]);
  const effectiveSet = useMemo(() => new Set(activeRole?.effective_permissions || []), [activeRole]);
  const dependencyMap = useMemo(
    () => new Map(
      Object.entries(permissionDependencies).map(([permission, dependencies]) => [
        permission as Permission,
        (dependencies || []) as Permission[]
      ])
    ),
    [permissionDependencies]
  );
  const reverseDependencyMap = useMemo(() => {
    const reverse = new Map<Permission, Permission[]>();
    for (const [permission, dependencies] of dependencyMap.entries()) {
      for (const dependency of dependencies) {
        const dependents = reverse.get(dependency) || [];
        dependents.push(permission);
        reverse.set(dependency, dependents);
      }
    }
    return reverse;
  }, [dependencyMap]);
  const dirty = activeRole
    ? draftSet.size !== effectiveSet.size || [...draftSet].some((permission) => !effectiveSet.has(permission))
    : false;
  const isCustomRole = activeRole?.role_kind === 'custom';
  const resetLabel = isCustomRole ? 'Reset to starting template' : 'Reset to defaults';
  const baselineStatus = isCustomRole ? 'Using starting template' : 'Using hardcoded defaults';
  const baselineHelp = isCustomRole
    ? 'The starting template remains available if you need to restore this role.'
    : 'Hardcoded defaults remain available if you need to restore this role.';

  useEffect(() => {
    if (!dirty) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!operationalWorkspace) return;
    setExpandedGroups(new Set());
  }, [operationalWorkspace, selectedRole]);

  const filteredCatalog = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return catalog;
    return catalog.filter((item) =>
      item.permission.toLowerCase().includes(normalized) ||
      item.label.toLowerCase().includes(normalized) ||
      item.group.toLowerCase().includes(normalized)
    );
  }, [catalog, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Array<PermissionCatalogItem<Permission>>>();
    for (const item of filteredCatalog) {
      const rows = map.get(item.group) || [];
      rows.push(item);
      map.set(item.group, rows);
    }
    return [...map.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [filteredCatalog]);

  const allGroupNames = useMemo(
    () => [...new Set(catalog.map((item) => item.group))].sort((left, right) => left.localeCompare(right)),
    [catalog]
  );

  const normalizeDraft = (values: Set<Permission>, explicitlyDisabled: Permission[] = []) => {
    const next = new Set(values);

    const disableQueue = [...explicitlyDisabled];
    const disabled = new Set(explicitlyDisabled);
    while (disableQueue.length) {
      const disabledPermission = disableQueue.shift() as Permission;
      for (const dependent of reverseDependencyMap.get(disabledPermission) || []) {
        if (disabled.has(dependent) || lockedSet.has(dependent)) continue;
        if (next.delete(dependent)) {
          disabled.add(dependent);
          disableQueue.push(dependent);
        }
      }
    }

    const dependencyQueue = [...next];
    while (dependencyQueue.length) {
      const permission = dependencyQueue.shift() as Permission;
      for (const dependency of dependencyMap.get(permission) || []) {
        if (forbiddenSet.has(dependency) || next.has(dependency)) continue;
        next.add(dependency);
        dependencyQueue.push(dependency);
      }
    }

    for (const lockedPermission of lockedSet) next.add(lockedPermission);
    for (const forbiddenPermission of forbiddenSet) next.delete(forbiddenPermission);
    return [...next].sort();
  };

  const togglePermission = (permission: Permission, enabled: boolean) => {
    if (!activeRole?.editable || lockedSet.has(permission) || forbiddenSet.has(permission)) return;
    const next = new Set(draftSet);
    if (enabled) next.add(permission);
    else next.delete(permission);
    onDraftPermissionsChange(normalizeDraft(next, enabled ? [] : [permission]));
  };

  const setGroup = (items: Array<PermissionCatalogItem<Permission>>, enabled: boolean) => {
    if (!activeRole?.editable) return;
    const next = new Set(draftSet);
    const disabledPermissions: Permission[] = [];
    for (const item of items) {
      if (lockedSet.has(item.permission) || forbiddenSet.has(item.permission)) continue;
      if (enabled) {
        next.add(item.permission);
      } else {
        next.delete(item.permission);
        disabledPermissions.push(item.permission);
      }
    }
    onDraftPermissionsChange(normalizeDraft(next, enabled ? [] : disabledPermissions));
  };

  const requestRoleChange = (role: Role) => {
    if (role === activeRole?.role) return;
    if (dirty) {
      if (!window.confirm('Discard unsaved permission changes and switch roles?')) return;
      onDiscardDraft?.();
    }
    setSearch('');
    setExpandedGroups(new Set());
    onSelectedRoleChange(role);
  };

  const requestWorkspaceView = (nextView: WorkspaceView) => {
    if (nextView === workspaceView) return;
    if (dirty) {
      if (!window.confirm('Discard unsaved permission changes and leave the role editor?')) return;
      onDiscardDraft?.();
    }
    setSearch('');
    setExpandedGroups(new Set());
    setWorkspaceView(nextView);
  };

  const filtering = search.trim().length > 0;
  const groupExpanded = (group: string) => !operationalWorkspace || filtering || expandedGroups.has(group);
  const toggleGroupExpanded = (group: string) => {
    if (!operationalWorkspace || filtering) return;
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const editorContent = (
    <>
      <div style={styles.roleCollections} className="role-permission-editor__role-collections">
        <div style={styles.roleCollection} className="role-permission-editor__role-collection">
          <div style={styles.roleCollectionHeader} className="role-permission-editor__role-collection-header">
            <strong>{scopeLabel} roles</strong><span>Protected role baselines</span>
          </div>
          <div style={styles.roleTabs} className="role-permission-editor__role-cards">
            {builtInRoles.map((role) => (
              <button
                key={role.role}
                type="button"
                onClick={() => requestRoleChange(role.role)}
                style={{ ...styles.roleTab, ...(role.role === activeRole?.role ? styles.roleTabActive : {}) }}
                className={`role-permission-editor__role-card${role.role === activeRole?.role ? ' is-active' : ''}`}
              >
                <strong>{role.display_name || roleLabel(role.role)}</strong>
                <span>{role.effective_permissions.length} enabled</span>
                <small>{role.editable ? (role.is_default ? 'Default baseline' : `${role.override_count} saved overrides`) : 'Protected'}</small>
              </button>
            ))}
          </div>
        </div>
        {customRoles.length ? (
          <div style={styles.roleCollection} className="role-permission-editor__role-collection">
            <div style={styles.roleCollectionHeader} className="role-permission-editor__role-collection-header">
              <strong>Custom roles</strong><span>Tenant-specific operational roles</span>
            </div>
            <div style={styles.roleTabs} className="role-permission-editor__role-cards">
              {customRoles.map((role) => (
                <button
                  key={role.role}
                  type="button"
                  onClick={() => requestRoleChange(role.role)}
                  style={{ ...styles.roleTab, ...(role.role === activeRole?.role ? styles.roleTabActive : {}), ...(role.is_active === false ? styles.roleTabInactive : {}) }}
                  className={`role-permission-editor__role-card${role.role === activeRole?.role ? ' is-active' : ''}${role.is_active === false ? ' is-inactive' : ''}`}
                >
                  <strong>{role.display_name || roleLabel(role.role)}</strong>
                  <span>{role.effective_permissions.length} enabled · {role.user_count || 0} users</span>
                  <small>{role.is_active === false ? 'Inactive' : role.is_default ? `Template: ${role.source_template_name || 'Blank'}` : `${role.override_count} changes from template`}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {activeRole ? (
        <>
          <div style={styles.toolbar} className="role-permission-editor__toolbar app-panel">
            <div style={styles.toolbarCopy} className="role-permission-editor__toolbar-copy">
              <h2 style={styles.roleTitle}>{activeRole.display_name || roleLabel(activeRole.role)}</h2>
              <p style={styles.roleHelp}>
                {activeRole.editable
                  ? activeRole.role_kind === 'custom'
                    ? `Changes apply to every user assigned to this tenant custom role${activeRole.description ? ` — ${activeRole.description}` : ''}.`
                    : 'Changes apply to every active user assigned to this role.'
                  : 'This role is protected and cannot be edited.'}
              </p>
            </div>
            <div style={styles.toolbarControls} className="role-permission-editor__toolbar-controls">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search permissions"
                aria-label="Search permissions"
                style={styles.search}
                className="role-permission-editor__search"
              />
              <div style={styles.actionButtons} className="role-permission-editor__toolbar-actions">
                {operationalWorkspace ? (
                  <>
                    <button type="button" className="app-button app-button--secondary role-permission-editor__utility-button" onClick={() => setShowTechnicalKeys((current) => !current)}>
                      {showTechnicalKeys ? 'Hide technical keys' : 'Show technical keys'}
                    </button>
                    <button type="button" className="app-button app-button--secondary role-permission-editor__utility-button" onClick={() => setExpandedGroups(new Set(allGroupNames))} disabled={filtering || expandedGroups.size === allGroupNames.length}>
                      Expand all
                    </button>
                    <button type="button" className="app-button app-button--secondary role-permission-editor__utility-button" onClick={() => setExpandedGroups(new Set())} disabled={filtering || expandedGroups.size === 0}>
                      Collapse all
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  style={operationalWorkspace ? undefined : {
                    ...styles.secondaryButton,
                    ...((!activeRole.editable || resetting || saving || activeRole.is_default) ? styles.buttonDisabled : {})
                  }}
                  className={operationalWorkspace ? 'app-button app-button--secondary' : undefined}
                  disabled={!activeRole.editable || resetting || saving || activeRole.is_default}
                  onClick={() => void onReset()}
                >
                  {resetting ? 'Resetting…' : resetLabel}
                </button>
                <button
                  type="button"
                  style={operationalWorkspace ? undefined : {
                    ...styles.primaryButton,
                    ...((!activeRole.editable || !dirty || saving || resetting) ? styles.buttonDisabled : {})
                  }}
                  className={operationalWorkspace ? 'app-button app-button--primary' : undefined}
                  disabled={!activeRole.editable || !dirty || saving || resetting}
                  onClick={() => void onSave()}
                >
                  {saving ? 'Saving…' : 'Save role permissions'}
                </button>
              </div>
            </div>
          </div>

          {!operationalWorkspace ? (
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}><strong>{draftSet.size}</strong><span>Enabled</span></div>
              <div style={styles.summaryCard}><strong>{catalog.length - draftSet.size}</strong><span>Disabled</span></div>
              <div style={styles.summaryCard}><strong>{lockedSet.size}</strong><span>Locked</span></div>
              <div style={styles.summaryCard}>
                <strong>{activeRole.override_count}</strong>
                <span>{isCustomRole ? 'Changes from template' : 'Saved overrides'}</span>
              </div>
            </div>
          ) : null}

          <div style={styles.groups} className="role-permission-editor__groups">
            {grouped.length === 0 ? (
              <div style={styles.emptySearch} className="app-empty-state role-permission-editor__empty-search">
                <strong>No permissions match “{search.trim()}”.</strong>
                <button type="button" className="app-button app-button--secondary" onClick={() => setSearch('')}>Clear search</button>
              </div>
            ) : null}
            {grouped.map(([group, items]) => {
              const editableItems = items.filter((item) => !lockedSet.has(item.permission) && !forbiddenSet.has(item.permission));
              const enabledCount = items.filter((item) => draftSet.has(item.permission)).length;
              const enabledEditableCount = editableItems.filter((item) => draftSet.has(item.permission)).length;
              const enableDisabled = saving || resetting || enabledEditableCount === editableItems.length;
              const disableDisabled = saving || resetting || enabledEditableCount === 0;
              const expanded = groupExpanded(group);
              return (
                <article key={group} style={styles.groupCard} className={`role-permission-editor__group-card app-panel${expanded ? ' is-expanded' : ''}`}>
                  <div style={styles.groupHeader} className="role-permission-editor__group-header">
                    {operationalWorkspace ? (
                      <button
                        type="button"
                        className="role-permission-editor__group-toggle"
                        onClick={() => toggleGroupExpanded(group)}
                        aria-expanded={expanded}
                        aria-controls={`permission-group-${group}`}
                      >
                        <span className="role-permission-editor__group-chevron" aria-hidden="true">{expanded ? '−' : '+'}</span>
                        <span>
                          <strong>{groupLabel(group)}</strong>
                          <small>{enabledCount} of {items.length} enabled</small>
                        </span>
                      </button>
                    ) : (
                      <div>
                        <h3 style={styles.groupTitle}>{groupLabel(group)}</h3>
                        <span style={styles.groupCount}>{enabledCount} of {items.length} enabled</span>
                      </div>
                    )}
                    {expanded && activeRole.editable && editableItems.length ? (
                      <div style={styles.groupActions} className="role-permission-editor__group-actions">
                        <button
                          type="button"
                          style={operationalWorkspace ? undefined : { ...styles.smallButton, ...(enableDisabled ? styles.buttonDisabled : {}) }}
                          className={operationalWorkspace ? 'app-button app-button--secondary role-permission-editor__group-action' : undefined}
                          disabled={enableDisabled}
                          onClick={() => setGroup(items, true)}
                        >
                          {filtering ? 'Enable shown' : 'Enable group'}
                        </button>
                        <button
                          type="button"
                          style={operationalWorkspace ? undefined : { ...styles.smallButton, ...(disableDisabled ? styles.buttonDisabled : {}) }}
                          className={operationalWorkspace ? 'app-button app-button--secondary role-permission-editor__group-action' : undefined}
                          disabled={disableDisabled}
                          onClick={() => setGroup(items, false)}
                        >
                          {filtering ? 'Disable shown' : 'Disable group'}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {expanded ? (
                    <div id={`permission-group-${group}`} style={styles.permissionList} className="role-permission-editor__permission-list">
                      {items.map((item) => {
                        const locked = lockedSet.has(item.permission);
                        const forbidden = forbiddenSet.has(item.permission);
                        const checked = draftSet.has(item.permission);
                        const differsFromDefault = checked !== defaultSet.has(item.permission);
                        return (
                          <label
                            key={item.permission}
                            style={{ ...styles.permissionRow, ...(forbidden ? styles.permissionForbidden : {}) }}
                            className={`role-permission-editor__permission-row${forbidden ? ' is-reserved' : ''}`}
                            title={(dependencyMap.get(item.permission) || []).length
                              ? `Requires: ${(dependencyMap.get(item.permission) || []).join(', ')}`
                              : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!activeRole.editable || locked || forbidden || saving || resetting}
                              onChange={(event) => togglePermission(item.permission, event.target.checked)}
                            />
                            <span style={styles.permissionText} className="role-permission-editor__permission-text">
                              <strong>{item.label}</strong>
                              {(!operationalWorkspace || showTechnicalKeys) ? <code style={styles.permissionCode}>{item.permission}</code> : null}
                            </span>
                            <span style={styles.badges} className="role-permission-editor__badges">
                              {locked ? <em style={styles.lockedBadge}>Locked</em> : null}
                              {forbidden ? <em style={styles.reservedBadge}>{reservedLabel}</em> : null}
                              {differsFromDefault ? <em style={styles.overrideBadge}>Override</em> : <em style={styles.defaultBadge}>Default</em>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <footer style={styles.actionBar} className="role-permission-editor__action-bar app-panel">
            <div>
              <strong>{dirty ? 'Unsaved permission changes' : activeRole.is_default ? baselineStatus : 'Saved custom policy active'}</strong>
              <span style={styles.actionHelp}>{baselineHelp}</span>
            </div>
            <div style={styles.actionButtons}>
              <button
                type="button"
                style={operationalWorkspace ? undefined : {
                  ...styles.secondaryButton,
                  ...((!activeRole.editable || resetting || saving || activeRole.is_default) ? styles.buttonDisabled : {})
                }}
                className={operationalWorkspace ? 'app-button app-button--secondary' : undefined}
                disabled={!activeRole.editable || resetting || saving || activeRole.is_default}
                onClick={() => void onReset()}
              >
                {resetting ? 'Resetting…' : resetLabel}
              </button>
              <button
                type="button"
                style={operationalWorkspace ? undefined : {
                  ...styles.primaryButton,
                  ...((!activeRole.editable || !dirty || saving || resetting) ? styles.buttonDisabled : {})
                }}
                className={operationalWorkspace ? 'app-button app-button--primary' : undefined}
                disabled={!activeRole.editable || !dirty || saving || resetting}
                onClick={() => void onSave()}
              >
                {saving ? 'Saving…' : 'Save role permissions'}
              </button>
            </div>
          </footer>
        </>
      ) : null}
    </>
  );

  return (
    <section
      style={operationalWorkspace ? undefined : styles.page}
      className={operationalWorkspace ? 'role-permission-editor role-permission-editor--operational io-operational-page io-workspace-page' : undefined}
      data-skip-global-action-feedback="true"
    >
      {operationalWorkspace ? (
        <>
          <OperationalWorkspaceHero
            iconPath={workspaceIconPath}
            eyebrow={workspaceEyebrow || `${scopeLabel} access governance`}
            title={title}
            description={description}
            meta={
              <>
                <OperationalWorkspaceMetaPill>{scopeLabel}-scoped</OperationalWorkspaceMetaPill>
                <OperationalWorkspaceMetaPill>Protected safety baseline</OperationalWorkspaceMetaPill>
                <OperationalWorkspaceMetaPill>Permission changes audited</OperationalWorkspaceMetaPill>
              </>
            }
            aside={<OperationalWorkspaceStatus value={roles.length} label="roles available in this access workspace" />}
          />

          <OperationalWorkspaceStats ariaLabel={`${scopeLabel} permission overview`}>
            <OperationalWorkspaceStatCard label="Permissions" value={catalog.length} helper={`${allGroupNames.length} permission groups`} tone="blue" iconPath="/permissions" />
            <OperationalWorkspaceStatCard label="Built-in roles" value={builtInRoles.length} helper="Protected Admin, Manager and Staff baselines" tone="neutral" iconPath="/users" />
            <OperationalWorkspaceStatCard label="Custom roles" value={customRoles.length} helper="Tenant-specific job access profiles" tone={customRoles.length ? 'blue' : 'neutral'} iconPath="/permissions" />
            <OperationalWorkspaceStatCard label="Selected enabled" value={draftSet.size} helper={activeRole ? `${activeRole.display_name || roleLabel(activeRole.role)}${dirty ? ' · unsaved draft' : ''}` : 'No role selected'} tone={dirty ? 'warn' : 'good'} iconPath="/permissions" />
            <OperationalWorkspaceStatCard label="Locked" value={lockedSet.size} helper="Safety permissions that cannot be removed" tone="warn" iconPath="/permissions" />
            <OperationalWorkspaceStatCard label={isCustomRole ? 'Template changes' : 'Saved overrides'} value={activeRole?.override_count || 0} helper={activeRole?.is_default ? 'Using baseline permissions' : 'Tenant-specific permission changes'} tone={(activeRole?.override_count || 0) > 0 ? 'warn' : 'neutral'} iconPath="/audit" />
          </OperationalWorkspaceStats>

          <OperationalWorkspaceTabs ariaLabel={`${scopeLabel} permission work areas`} hint="Edit role access or manage tenant custom roles.">
            <OperationalWorkspaceTab
              active={workspaceView === 'role-permissions'}
              iconPath="/permissions"
              label="Role permissions"
              count={roles.length}
              onClick={() => requestWorkspaceView('role-permissions')}
            />
            {headerAddon ? (
              <OperationalWorkspaceTab
                active={workspaceView === 'custom-roles'}
                iconPath="/users"
                label="Custom roles"
                count={customRoles.length}
                onClick={() => requestWorkspaceView('custom-roles')}
              />
            ) : null}
          </OperationalWorkspaceTabs>
        </>
      ) : (
        <header style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>{scopeLabel} access governance</div>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.description}>{description}</p>
          </div>
          <div style={styles.heroMetrics}>
            <span style={styles.metric}>{catalog.length} permissions</span>
            <span style={styles.metric}>{roles.length} roles</span>
          </div>
        </header>
      )}

      {successMessage ? (
        <div style={operationalWorkspace ? undefined : styles.success} className={operationalWorkspace ? 'app-success-state role-permission-editor__message' : undefined} role="status">
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div style={operationalWorkspace ? undefined : styles.error} className={operationalWorkspace ? 'app-error-state role-permission-editor__message' : undefined} role="alert">
          {errorMessage}
        </div>
      ) : null}

      {operationalWorkspace ? (
        workspaceView === 'custom-roles' ? headerAddon : editorContent
      ) : (
        <>
          {headerAddon}
          {editorContent}
        </>
      )}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, paddingBottom: 36 },
  hero: { display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', background: '#fff', border: '1px solid #dbe3ef', borderRadius: 18, padding: 24 },
  eyebrow: { color: '#1f5fe0', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' },
  title: { margin: '6px 0 8px', fontSize: 30, lineHeight: 1.1 },
  description: { margin: 0, color: '#536279', maxWidth: 760, lineHeight: 1.55 },
  heroMetrics: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  metric: { background: '#eef4ff', color: '#174ea6', borderRadius: 999, padding: '8px 12px', fontWeight: 700, whiteSpace: 'nowrap' },
  success: { background: '#ecfdf3', border: '1px solid #86efac', color: '#166534', borderRadius: 12, padding: '12px 14px', fontWeight: 700 },
  error: { background: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239', borderRadius: 12, padding: '12px 14px', fontWeight: 700 },
  roleCollections: { display: 'grid', gap: 14 },
  roleCollection: { display: 'grid', gap: 8 },
  roleCollectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 10, color: '#475569', padding: '0 2px', flexWrap: 'wrap' },
  roleTabs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 },
  roleTab: { display: 'grid', textAlign: 'left', gap: 4, padding: 14, borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' },
  roleTabInactive: { opacity: 0.66, background: '#f8fafc' },
  roleTabActive: { borderColor: '#2563eb', boxShadow: '0 0 0 2px rgba(37,99,235,0.12)', background: '#f8fbff' },
  toolbar: { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-end', background: '#fff', border: '1px solid #dbe3ef', borderRadius: 16, padding: 18, flexWrap: 'wrap' },
  toolbarCopy: { minWidth: 260, flex: '1 1 360px' },
  toolbarControls: { display: 'grid', gap: 10, justifyItems: 'end', flex: '1 1 420px' },
  roleTitle: { margin: 0, fontSize: 22 },
  roleHelp: { margin: '5px 0 0', color: '#64748b' },
  search: { width: 'min(360px, 100%)', minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 10, padding: '0 12px', fontSize: 15 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 },
  summaryCard: { display: 'grid', gap: 4, background: '#fff', border: '1px solid #dbe3ef', borderRadius: 14, padding: 16 },
  groups: { display: 'grid', gap: 14 },
  emptySearch: { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap', background: '#fff', border: '1px solid #dbe3ef', borderRadius: 14, padding: 16 },
  groupCard: { background: '#fff', border: '1px solid #dbe3ef', borderRadius: 16, overflow: 'hidden' },
  groupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  groupTitle: { margin: 0, fontSize: 17 },
  groupCount: { color: '#64748b', fontSize: 13 },
  groupActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  smallButton: { minHeight: 34, border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', padding: '0 10px', fontWeight: 700, cursor: 'pointer' },
  permissionList: { display: 'grid' },
  permissionRow: { display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) auto', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid #eef2f7' },
  permissionForbidden: { background: '#fffaf0' },
  permissionText: { display: 'grid', gap: 3, minWidth: 0 },
  permissionCode: { color: '#64748b', background: 'transparent', padding: 0, overflowWrap: 'anywhere' },
  badges: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  lockedBadge: { fontStyle: 'normal', background: '#dbeafe', color: '#1e40af', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  reservedBadge: { fontStyle: 'normal', background: '#ffedd5', color: '#9a3412', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  overrideBadge: { fontStyle: 'normal', background: '#ede9fe', color: '#6d28d9', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  defaultBadge: { fontStyle: 'normal', background: '#f1f5f9', color: '#475569', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  actionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 16, padding: 16, flexWrap: 'wrap' },
  actionHelp: { display: 'block', color: '#64748b', marginTop: 3 },
  actionButtons: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  primaryButton: { minHeight: 42, border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', padding: '0 16px', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#0f172a', padding: '0 16px', fontWeight: 800, cursor: 'pointer' },
  buttonDisabled: { opacity: 0.52, cursor: 'not-allowed' }
};
