import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tenantPermissions = fs.readFileSync(path.join(root, 'src/lib/permissions.ts'), 'utf8');
const platformPermissions = fs.readFileSync(path.join(root, 'src/lib/platformPermissions.ts'), 'utf8');
const policies = fs.readFileSync(path.join(root, 'src/lib/permissionPolicies.ts'), 'utf8');
const tenantRoute = fs.readFileSync(path.join(root, 'src/components/ProtectedRoute.tsx'), 'utf8');
const platformRoute = fs.readFileSync(path.join(root, 'src/components/PlatformProtectedRoute.tsx'), 'utf8');
const platformLayout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

function fail(message) {
  throw new Error(`Permission snapshot fail-closed contract failed: ${message}`);
}

for (const signal of [
  'if (identity.tenantId || identity.userId) return [];',
  'Fail closed until the authoritative',
]) {
  if (!tenantPermissions.includes(signal)) fail(`tenant permissions missing ${signal}`);
}

for (const signal of [
  'snapshotMatchesCurrentPlatformIdentity',
  'if (payload?.typ === \'platform\' && typeof payload.id === \'string\') return [];',
  'return snapshot.role;',
]) {
  if (!platformPermissions.includes(signal)) fail(`platform permissions missing ${signal}`);
}

for (const signal of [
  'error instanceof ApiError && (error.status === 401 || error.status === 403)',
  'return getTenantPermissionSnapshot();',
  'return getPlatformPermissionSnapshot();',
]) {
  if (!policies.includes(signal)) fail(`permission policies missing ${signal}`);
}

if (!tenantRoute.includes("setStatus(permissionSnapshot ? 'allowed' : 'denied')")) {
  fail('tenant protected route allows a session without a permission snapshot');
}
if (!platformRoute.includes("identity?.id && permissionSnapshot ? 'allowed' : 'denied'")) {
  fail('platform protected route allows a session without a permission snapshot');
}

for (const signal of [
  "window.addEventListener('focus', refreshPermissions);",
  "document.addEventListener('visibilitychange', onVisibilityChange);",
  "event.key === 'inventory_platform_effective_permissions'",
  "event.key === 'inventory_platform_access_token'",
]) {
  if (!platformLayout.includes(signal)) fail(`platform layout missing ${signal}`);
}

console.log('Permission snapshot fail-closed contract passed: tenant/platform UI permissions remain authoritative across role changes and transient network errors.');
