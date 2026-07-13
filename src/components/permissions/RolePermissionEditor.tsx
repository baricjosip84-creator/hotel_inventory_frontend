import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PermissionCatalogItem, RolePermissionPolicy } from '../../lib/permissionPolicies';

export type RolePermissionEditorProps<Role extends string, Permission extends string> = {
  title: string;
  description: string;
  roles: Array<RolePermissionPolicy<Role, Permission>>;
  catalog: Array<PermissionCatalogItem<Permission>>;
  selectedRole: Role;
  onSelectedRoleChange: (role: Role) => void;
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
};

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
  selectedRole,
  onSelectedRoleChange,
  draftPermissions,
  onDraftPermissionsChange,
  onSave,
  onReset,
  saving,
  resetting,
  successMessage,
  errorMessage,
  scopeLabel,
  reservedLabel = 'Admin only'
}: RolePermissionEditorProps<Role, Permission>) {
  const [search, setSearch] = useState('');
  const activeRole = roles.find((role) => role.role === selectedRole) || roles[0];
  const draftSet = useMemo(() => new Set(draftPermissions), [draftPermissions]);
  const defaultSet = useMemo(() => new Set(activeRole?.default_permissions || []), [activeRole]);
  const lockedSet = useMemo(() => new Set(activeRole?.locked_permissions || []), [activeRole]);
  const forbiddenSet = useMemo(() => new Set(activeRole?.forbidden_permissions || []), [activeRole]);
  const effectiveSet = useMemo(() => new Set(activeRole?.effective_permissions || []), [activeRole]);
  const dirty = activeRole
    ? draftSet.size !== effectiveSet.size || [...draftSet].some((permission) => !effectiveSet.has(permission))
    : false;

  useEffect(() => {
    if (!dirty) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

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

  const togglePermission = (permission: Permission, enabled: boolean) => {
    if (!activeRole?.editable || lockedSet.has(permission) || forbiddenSet.has(permission)) return;
    const next = new Set(draftSet);
    if (enabled) next.add(permission);
    else next.delete(permission);
    for (const lockedPermission of lockedSet) next.add(lockedPermission);
    for (const forbiddenPermission of forbiddenSet) next.delete(forbiddenPermission);
    onDraftPermissionsChange([...next].sort());
  };

  const setGroup = (items: Array<PermissionCatalogItem<Permission>>, enabled: boolean) => {
    if (!activeRole?.editable) return;
    const next = new Set(draftSet);
    for (const item of items) {
      if (lockedSet.has(item.permission) || forbiddenSet.has(item.permission)) continue;
      if (enabled) next.add(item.permission);
      else next.delete(item.permission);
    }
    for (const lockedPermission of lockedSet) next.add(lockedPermission);
    for (const forbiddenPermission of forbiddenSet) next.delete(forbiddenPermission);
    onDraftPermissionsChange([...next].sort());
  };

  const requestRoleChange = (role: Role) => {
    if (role === activeRole?.role) return;
    if (dirty && !window.confirm('Discard unsaved permission changes and switch roles?')) return;
    onSelectedRoleChange(role);
  };

  return (
    <section style={styles.page} data-skip-global-action-feedback="true">
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

      {successMessage ? <div style={styles.success}>{successMessage}</div> : null}
      {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}

      <div style={styles.roleTabs}>
        {roles.map((role) => (
          <button
            key={role.role}
            type="button"
            onClick={() => requestRoleChange(role.role)}
            style={{ ...styles.roleTab, ...(role.role === activeRole?.role ? styles.roleTabActive : {}) }}
          >
            <strong>{roleLabel(role.role)}</strong>
            <span>{role.effective_permissions.length} enabled</span>
            <small>{role.editable ? (role.is_default ? 'Default' : `${role.override_count} overrides`) : 'Protected'}</small>
          </button>
        ))}
      </div>

      {activeRole ? (
        <>
          <div style={styles.toolbar}>
            <div>
              <h2 style={styles.roleTitle}>{roleLabel(activeRole.role)}</h2>
              <p style={styles.roleHelp}>
                {activeRole.editable
                  ? 'Changes apply to every active user assigned to this role.'
                  : 'This role is protected and cannot be edited.'}
              </p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search permissions"
              aria-label="Search permissions"
              style={styles.search}
            />
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}><strong>{draftSet.size}</strong><span>Enabled</span></div>
            <div style={styles.summaryCard}><strong>{catalog.length - draftSet.size}</strong><span>Disabled</span></div>
            <div style={styles.summaryCard}><strong>{lockedSet.size}</strong><span>Locked</span></div>
            <div style={styles.summaryCard}><strong>{activeRole.override_count}</strong><span>Saved overrides</span></div>
          </div>

          <div style={styles.groups}>
            {grouped.map(([group, items]) => {
              const editableItems = items.filter((item) => !lockedSet.has(item.permission) && !forbiddenSet.has(item.permission));
              const enabledCount = items.filter((item) => draftSet.has(item.permission)).length;
              return (
                <article key={group} style={styles.groupCard}>
                  <div style={styles.groupHeader}>
                    <div>
                      <h3 style={styles.groupTitle}>{groupLabel(group)}</h3>
                      <span style={styles.groupCount}>{enabledCount} of {items.length} enabled</span>
                    </div>
                    {activeRole.editable && editableItems.length ? (
                      <div style={styles.groupActions}>
                        <button
                          type="button"
                          style={{ ...styles.smallButton, ...((saving || resetting) ? styles.buttonDisabled : {}) }}
                          disabled={saving || resetting}
                          onClick={() => setGroup(items, true)}
                        >
                          Enable group
                        </button>
                        <button
                          type="button"
                          style={{ ...styles.smallButton, ...((saving || resetting) ? styles.buttonDisabled : {}) }}
                          disabled={saving || resetting}
                          onClick={() => setGroup(items, false)}
                        >
                          Disable group
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div style={styles.permissionList}>
                    {items.map((item) => {
                      const locked = lockedSet.has(item.permission);
                      const forbidden = forbiddenSet.has(item.permission);
                      const checked = draftSet.has(item.permission);
                      const differsFromDefault = checked !== defaultSet.has(item.permission);
                      return (
                        <label key={item.permission} style={{ ...styles.permissionRow, ...(forbidden ? styles.permissionForbidden : {}) }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!activeRole.editable || locked || forbidden || saving || resetting}
                            onChange={(event) => togglePermission(item.permission, event.target.checked)}
                          />
                          <span style={styles.permissionText}>
                            <strong>{item.label}</strong>
                            <code style={styles.permissionCode}>{item.permission}</code>
                          </span>
                          <span style={styles.badges}>
                            {locked ? <em style={styles.lockedBadge}>Locked</em> : null}
                            {forbidden ? <em style={styles.reservedBadge}>{reservedLabel}</em> : null}
                            {differsFromDefault ? <em style={styles.overrideBadge}>Override</em> : <em style={styles.defaultBadge}>Default</em>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>

          <footer style={styles.actionBar}>
            <div>
              <strong>{dirty ? 'Unsaved permission changes' : activeRole.is_default ? 'Using hardcoded defaults' : 'Saved custom policy active'}</strong>
              <span style={styles.actionHelp}>Hardcoded defaults remain available through Reset to defaults.</span>
            </div>
            <div style={styles.actionButtons}>
              <button
                type="button"
                style={{
                  ...styles.secondaryButton,
                  ...((!activeRole.editable || resetting || saving || activeRole.is_default) ? styles.buttonDisabled : {})
                }}
                disabled={!activeRole.editable || resetting || saving || activeRole.is_default}
                onClick={() => void onReset()}
              >
                {resetting ? 'Resetting…' : 'Reset to defaults'}
              </button>
              <button
                type="button"
                style={{
                  ...styles.primaryButton,
                  ...((!activeRole.editable || !dirty || saving || resetting) ? styles.buttonDisabled : {})
                }}
                disabled={!activeRole.editable || !dirty || saving || resetting}
                onClick={() => void onSave()}
              >
                {saving ? 'Saving…' : 'Save role permissions'}
              </button>
            </div>
          </footer>
        </>
      ) : null}
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
  roleTabs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 },
  roleTab: { display: 'grid', textAlign: 'left', gap: 4, padding: 14, borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' },
  roleTabActive: { borderColor: '#2563eb', boxShadow: '0 0 0 2px rgba(37,99,235,0.12)', background: '#f8fbff' },
  toolbar: { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'end', background: '#fff', border: '1px solid #dbe3ef', borderRadius: 16, padding: 18 },
  roleTitle: { margin: 0, fontSize: 22 },
  roleHelp: { margin: '5px 0 0', color: '#64748b' },
  search: { width: 'min(360px, 100%)', minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 10, padding: '0 12px', fontSize: 15 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 },
  summaryCard: { display: 'grid', gap: 4, background: '#fff', border: '1px solid #dbe3ef', borderRadius: 14, padding: 16 },
  groups: { display: 'grid', gap: 14 },
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
  actionBar: { position: 'sticky', bottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.97)', border: '1px solid #cbd5e1', boxShadow: '0 12px 30px rgba(15,23,42,0.12)', borderRadius: 16, padding: 16, zIndex: 5 },
  actionHelp: { display: 'block', color: '#64748b', marginTop: 3 },
  actionButtons: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  primaryButton: { minHeight: 42, border: 0, borderRadius: 10, background: '#2563eb', color: '#fff', padding: '0 16px', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#0f172a', padding: '0 16px', fontWeight: 800, cursor: 'pointer' },
  buttonDisabled: { opacity: 0.52, cursor: 'not-allowed' }
};
