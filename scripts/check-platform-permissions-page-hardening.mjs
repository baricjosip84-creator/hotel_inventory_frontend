import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backendRoot = path.resolve(process.argv[2] || process.env.BACKEND_ROOT || path.join(root, '..', 'hotel-inventory-backend'));
const read = (relative, base = root) => fs.readFileSync(path.join(base, relative), 'utf8');
const page = read('src/pages/PlatformPermissionsPage.tsx');
const css = read('src/pages/PlatformPermissionsPage.css');
const editor = read('src/components/permissions/RolePermissionEditor.tsx');
const policies = read('src/lib/permissionPolicies.ts');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');
const route = read('src/routes/platform/permissions.js', backendRoot);
const service = read('src/services/permissionPolicyService.js', backendRoot);
const pkg = JSON.parse(read('package.json'));

const requireAll = (source, tokens, label) => {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`Platform Permissions hardening missing ${label}: ${token}`);
};

requireAll(page, [
  'operationalWorkspace', 'Platform access governance', 'PLATFORM_ROLE_POLICY_STALE',
  'Showing the last successful snapshot.', 'activeRole.revision', 'onRefresh={refresh}',
  'Authorization evidence boundary', 'Backend requests reload the current role policy',
  'removing Support Session start permission closes active or pending support access',
  '/platform/users', '/platform/permission-audit', '/platform/audit?source=role_permissions'
], 'page contract');
requireAll(editor, [
  'isPlatformScope', 'Editable roles', 'Fixed Platform role catalog',
  'Platform-wide permission changes', 'active requests immediately', 'warningMessage', 'footerAddon'
], 'shared Operational Workspace contract');
requireAll(policies, [
  'revision?: string', 'expected_revision: expectedRevision',
  'savePlatformRolePermissionPolicy', 'resetPlatformRolePermissionPolicy'
], 'API contract');
requireAll(route, [
  'PLATFORM_ROLE_PERMISSIONS_READ', 'PLATFORM_ROLE_PERMISSIONS_WRITE',
  'expected_revision: revisionSchema.required()', 'expectedRevision: req.body.expected_revision'
], 'backend route');
requireAll(service, [
  'platformRoleRevision', 'pg_advisory_xact_lock', 'assertActivePlatformPolicySuperadmin',
  'PLATFORM_ROLE_POLICY_STALE', 'closeSupportSessionsAfterPolicyRevocation',
  'support_sessions_ended', 'added_permissions', 'removed_permissions',
  'overrideCount = symmetricDifferenceCount', "target_id: null"
], 'backend service');
if (!css.includes('#d14343') || !css.includes('#b93636')) throw new Error('Platform Permissions red identity is missing.');
const routeStart = router.indexOf("path: 'permissions'", router.indexOf("path: 'platform'"));
const routeSlice = router.slice(Math.max(0, routeStart - 100), routeStart + 500);
if (routeStart < 0 || !routeSlice.includes('PLATFORM_ROLE_PERMISSIONS_READ')) throw new Error('Platform Permissions route must require PLATFORM_ROLE_PERMISSIONS_READ.');
const navStart = layout.indexOf('to="/platform/permissions"');
const navSlice = layout.slice(Math.max(0, navStart - 260), navStart + 280);
if (navStart < 0 || !navSlice.includes('PLATFORM_ROLE_PERMISSIONS_READ')) throw new Error('Platform Permissions sidebar must require PLATFORM_ROLE_PERMISSIONS_READ.');
if (!pkg.scripts?.['check:platform-permissions-page-hardening']) throw new Error('Platform Permissions checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-permissions-page-hardening')) throw new Error('Platform Permissions checker is not wired into check:ci.');
console.log('Platform Permissions page hardening check: PASS');
