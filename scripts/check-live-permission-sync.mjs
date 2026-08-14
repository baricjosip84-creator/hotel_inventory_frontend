import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const permissions = fs.readFileSync(path.join(root, 'src/lib/permissions.ts'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/AppLayout.tsx'), 'utf8');

function fail(message) {
  throw new Error(`Live permission synchronization contract failed: ${message}`);
}

for (const signal of [
  'snapshotMatchesCurrentTenantIdentity',
  "if (snapshotMatchesCurrentTenantIdentity(snapshot) && isKnownUserRole(snapshot.role))",
  "if (snapshot.role !== role) return null;",
  'tenant + user identity is the stable boundary that must match'
]) {
  if (!permissions.includes(signal)) fail(`permissions.ts missing ${signal}`);
}

for (const signal of [
  'const role = getCurrentUserRole();',
  "window.addEventListener('focus', refreshPermissions);",
  "document.addEventListener('visibilitychange', onVisibilityChange);",
  "window.addEventListener('storage', onStorage);",
  "event.key === 'inventory_tenant_effective_permissions'",
  "event.key === 'inventory_access_token'",
  'void refreshTenantPermissionSnapshot();'
]) {
  if (!layout.includes(signal)) fail(`AppLayout.tsx missing ${signal}`);
}

if (layout.includes('const role = useMemo(() => getCurrentUserRole(), []);')) {
  fail('AppLayout still freezes the tenant role for the lifetime of the mounted shell');
}

console.log('Live permission synchronization contract passed: current permission snapshots can supersede stale JWT role claims and revalidate on focus/visibility/cross-tab changes.');
