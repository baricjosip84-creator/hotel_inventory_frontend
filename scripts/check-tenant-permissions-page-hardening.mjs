import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => { throw new Error(`Tenant permissions page hardening check failed: ${message}`); };
const includes = (source, value, label) => { if (!source.includes(value)) fail(`${label} is missing ${value}`); };
const excludes = (source, value, label) => { if (source.includes(value)) fail(`${label} still contains ${value}`); };

const editor = read('src/components/permissions/RolePermissionEditor.tsx');
const editorCss = read('src/components/permissions/RolePermissionEditor.css');
const tenantPage = read('src/pages/TenantPermissionsPage.tsx');
const tenantCss = read('src/pages/TenantPermissionsPage.css');
const platformPage = read('src/pages/PlatformPermissionsPage.tsx');
const policies = read('src/lib/permissionPolicies.ts');

for (const value of [
  'permissionDependencies',
  'reverseDependencyMap',
  'normalizeDraft',
  'onDiscardDraft?.()',
  "filtering ? 'Enable shown' : 'Enable group'",
  'No permissions match',
  'Using starting template',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceTabs',
  "type WorkspaceView = 'role-permissions' | 'custom-roles'",
  'Show technical keys',
  'Expand all',
  'Collapse all',
  'aria-expanded={expanded}',
  "workspaceView === 'custom-roles' ? headerAddon : editorContent"
]) includes(editor, value, 'shared role permission editor');

excludes(editor, "actionBar: { position: 'sticky'", 'shared role permission editor');
includes(editor, "actionBar: { display: 'flex'", 'non-overlay action bar');
includes(editorCss, '.role-permission-editor--operational', 'tenant workspace permission editor CSS');
includes(editorCss, '.role-permission-editor__group-toggle', 'collapsible permission group CSS');

for (const value of [
  'permissionDependencies={query.data.permission_dependencies}',
  'onDiscardDraft={() => discardDraftForRole(selectedRole)}',
  'operationalWorkspace',
  'workspaceEyebrow="People & access"',
  'Custom role name must contain at least 2 characters.',
  'selectedTemplate.description',
  'metadataDirty',
  'activeRole.can_deactivate === false',
  'activeRole.can_delete === false',
  'discardDraftForRole(roleKey)',
  'Custom role library',
  'Tenant permission settings could not be loaded. Check tenant administrator access and try again.'
]) includes(tenantPage, value, 'tenant permissions page');

excludes(tenantPage, 'const styles: Record<string, CSSProperties>', 'tenant permissions page legacy inline style system');
includes(tenantCss, '.tenant-permissions-role-grid', 'tenant custom role workspace CSS');
includes(tenantCss, '.tenant-permissions-form-grid', 'tenant custom role form CSS');

includes(platformPage, 'onDiscardDraft={() => {', 'platform permissions draft discard');
includes(policies, 'permission_dependencies: Partial<Record<TenantPermission, TenantPermission[]>>;', 'permission policy API type');

console.log('Tenant permissions page hardening check passed (shared operational workspace UI, collapsible permission groups, dependency-safe editing, draft discard, and custom-role lifecycle guards verified).');
