import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = path.resolve(process.argv[2] || process.env.BACKEND_ROOT || path.join(frontendRoot, '..', 'hotel-inventory-backend'));

function fail(message) {
  throw new Error(`Role permission management contract failed: ${message}`);
}

function read(relativePath, root = frontendRoot) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) fail(`missing ${absolute}`);
  return fs.readFileSync(absolute, 'utf8');
}

function assertIncludes(source, value, label) {
  if (!source.includes(value)) fail(`${label} is missing ${value}`);
}

function parsePermissionConstants(source, constantName) {
  const expression = new RegExp(`export const ${constantName} = Object\\.freeze\\(\\{([\\s\\S]*?)\\} as const\\);`);
  const match = source.match(expression);
  if (!match) fail(`could not parse ${constantName}`);
  return Object.fromEntries([...match[1].matchAll(/([A-Z0-9_]+):\s*'([^']+)'/g)].map((entry) => [entry[1], entry[2]]));
}

function parseRolePermissionMap(source, mapName, roles, permissionConstantName, constants) {
  const start = source.indexOf(`export const ${mapName}`);
  if (start < 0) fail(`could not find ${mapName}`);
  const mapSource = source.slice(start);
  const result = {};

  for (const role of roles) {
    const matcher = new RegExp(`\\b${role}\\s*:\\s*Object\\.freeze\\(\\[`);
    const match = matcher.exec(mapSource);
    if (!match) fail(`could not parse ${mapName}.${role}`);
    let cursor = match.index + match[0].length;
    let depth = 1;
    while (cursor < mapSource.length && depth > 0) {
      if (mapSource[cursor] === '[') depth += 1;
      if (mapSource[cursor] === ']') depth -= 1;
      cursor += 1;
    }
    const roleSource = mapSource.slice(match.index + match[0].length, cursor - 1);
    const names = [...roleSource.matchAll(new RegExp(`${permissionConstantName}\\.([A-Z0-9_]+)`, 'g'))].map((entry) => entry[1]);
    result[role] = names.map((name) => {
      if (!constants[name]) fail(`${mapName}.${role} references unknown constant ${name}`);
      return constants[name];
    });
  }

  return result;
}

function assertSameSet(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value));
  const extra = [...actualSet].filter((value) => !expectedSet.has(value));
  if (missing.length || extra.length) {
    fail(`${label} drift; missing=${missing.join(',') || '-'} extra=${extra.join(',') || '-'}`);
  }
}

const requireFromBackend = createRequire(path.join(backendRoot, 'package.json'));
const tenantBackend = requireFromBackend(path.join(backendRoot, 'src/permissions/tenantPermissions.js'));
const platformBackend = requireFromBackend(path.join(backendRoot, 'src/permissions/platformPermissions.js'));

const tenantPermissionsSource = read('src/lib/permissions.ts');
const platformPermissionsSource = read('src/lib/platformPermissions.ts');
const tenantConstants = parsePermissionConstants(tenantPermissionsSource, 'TENANT_PERMISSIONS');
const platformConstants = parsePermissionConstants(platformPermissionsSource, 'PLATFORM_PERMISSIONS');

assertSameSet(Object.values(tenantConstants), tenantBackend.ALL_TENANT_PERMISSIONS, 'tenant permission catalog');
assertSameSet(Object.values(platformConstants), platformBackend.ALL_PLATFORM_PERMISSIONS, 'platform permission catalog');

const tenantRoles = Object.keys(tenantBackend.ROLE_PERMISSIONS);
const platformRoles = Object.keys(platformBackend.PLATFORM_ROLE_PERMISSIONS);
const frontendTenantRoles = parseRolePermissionMap(
  tenantPermissionsSource,
  'ROLE_PERMISSIONS',
  tenantRoles,
  'TENANT_PERMISSIONS',
  tenantConstants
);
const frontendPlatformRoles = parseRolePermissionMap(
  platformPermissionsSource,
  'PLATFORM_ROLE_PERMISSIONS',
  platformRoles,
  'PLATFORM_PERMISSIONS',
  platformConstants
);

for (const role of tenantRoles) {
  assertSameSet(frontendTenantRoles[role], tenantBackend.ROLE_PERMISSIONS[role], `tenant default role ${role}`);
}
for (const role of platformRoles) {
  assertSameSet(frontendPlatformRoles[role], platformBackend.PLATFORM_ROLE_PERMISSIONS[role], `platform default role ${role}`);
}

const routerSource = read('src/app/router.tsx');
const navigationSource = read('src/app/navigationRegistry.ts');
const platformLayoutSource = read('src/layouts/PlatformLayout.tsx');
const policiesSource = read('src/lib/permissionPolicies.ts');
const tenantPageSource = read('src/pages/TenantPermissionsPage.tsx');
const platformPageSource = read('src/pages/PlatformPermissionsPage.tsx');
const editorSource = read('src/components/permissions/RolePermissionEditor.tsx');

for (const [source, values, label] of [
  [routerSource, ["path: 'permissions'", 'TenantPermissionsPage', 'PlatformPermissionsPage', 'ROLE_PERMISSIONS_READ', 'PLATFORM_ROLE_PERMISSIONS_READ'], 'router'],
  [navigationSource, ["to: '/permissions'", "label: 'Permissions'", 'ROLE_PERMISSIONS_READ'], 'tenant navigation'],
  [platformLayoutSource, ['to="/platform/permissions"', 'Platform Permissions', 'PLATFORM_ROLE_PERMISSIONS_READ'], 'platform navigation'],
  [policiesSource, ['/permissions/me', '/platform/permissions/me', 'saveTenantRolePermissionPolicy', 'savePlatformRolePermissionPolicy'], 'permission API client'],
  [tenantPageSource, ['Tenant Permissions', 'hardcoded default permissions'], 'tenant permission page'],
  [platformPageSource, ['Platform Permissions', 'Superadmin remains immutable'], 'platform permission page'],
  [editorSource, ['Enable group', 'Disable group', 'Save role permissions', 'Reset to defaults', 'Locked', 'reservedLabel', 'beforeunload'], 'shared role permission editor']
]) {
  for (const value of values) assertIncludes(source, value, label);
}

const backendIndex = read('src/routes/index.js', backendRoot);
const platformIndex = read('src/routes/platform/index.js', backendRoot);
const tenantRoute = read('src/routes/permissions.js', backendRoot);
const platformRoute = read('src/routes/platform/permissions.js', backendRoot);
const policyService = read('src/services/permissionPolicyService.js', backendRoot);
const migration = read('db/migrations/486_role_permission_overrides.sql', backendRoot);
const tenantAuth = read('src/middleware/auth.js', backendRoot);
const platformAuth = read('src/middleware/platformAuth.js', backendRoot);
const permissionGuard = read('src/utils/permissionGuard.js', backendRoot);
const tenantController = read('src/controllers/enterpriseInventoryController.js', backendRoot);

for (const [source, values, label] of [
  [backendIndex, ["router.use('/permissions', require('./permissions'))"], 'tenant route mount'],
  [platformIndex, ["router.use('/permissions', require('./permissions'))"], 'platform route mount'],
  [tenantRoute, ["router.get(\n  '/me'", 'ROLE_PERMISSIONS_READ', 'ROLE_PERMISSIONS_WRITE', 'replaceTenantRolePolicy', 'resetTenantRolePolicy'], 'tenant permission routes'],
  [platformRoute, ["router.get('/me'", 'PLATFORM_ROLE_PERMISSIONS_READ', 'PLATFORM_ROLE_PERMISSIONS_WRITE', 'replacePlatformRolePolicy', 'resetPlatformRolePolicy'], 'platform permission routes'],
  [policyService, ['TENANT_LOCKED_PERMISSIONS', 'TENANT_RESERVED_FOR_ADMIN', 'PLATFORM_ROLE_POLICY_SUPERADMIN_IMMUTABLE', 'platform_role_permissions.update', 'role_permissions.update', 'allowedPermissions'], 'permission policy service'],
  [migration, ['tenant_role_permission_overrides', 'platform_role_permission_overrides', 'PRIMARY KEY (tenant_id, role, permission)', 'PRIMARY KEY (role, permission)'], 'permission migration'],
  [tenantAuth, ['PermissionPolicyService', 'req.user.permissions = await PermissionPolicyService.tenantEffectivePermissions'], 'tenant auth effective-permission loading'],
  [platformAuth, ['PermissionPolicyService', 'req.platformUser.permissions = await PermissionPolicyService.platformEffectivePermissions'], 'platform auth effective-permission loading'],
  [permissionGuard, ['permissionsProvided', 'context.permissionsProvided', 'SERVICE_PERMISSION_DENIED'], 'service-layer dynamic permission enforcement'],
  [tenantController, ['permissions: req.user?.permissions'], 'controller permission-context propagation']
]) {
  for (const value of values) assertIncludes(source, value, label);
}

console.log(`Role permission management contract passed (${tenantBackend.ALL_TENANT_PERMISSIONS.length} tenant permissions, ${platformBackend.ALL_PLATFORM_PERMISSIONS.length} platform permissions, ${tenantRoles.length + platformRoles.length} role defaults aligned).`);
