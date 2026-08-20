import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantsPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero','OperationalWorkspaceStats','OperationalSectionHeader',
  'Platform tenant administration','Tenant isolation preserved',
  'Billing lifecycle changes remain on the dedicated Billing page.',
  "searchParams.get('tenant_id')",'uuidPattern','setSearchParams',
  'initialListError','refreshListError','initialDetailError','refreshDetailError',
  'Showing the last successful tenant registry snapshot.','Showing the last successful tenant detail snapshot.',
  'refetchOnWindowFocus: false','staleTime: 30_000','Retry refresh',
  'PLATFORM_PROVISIONING_PRESETS_READ','PLATFORM_BILLING_READ',
  '/platform/provisioning-presets','/platform/billing?tenant_id=',
  'Password reset. All existing sessions for that tenant user were revoked.',
  'Tenant user disabled and active sessions revoked.',
  'Create or reset tenant user','Save entitlements','Save support policy',
  'No tenants found.','apply emergency write locks','Tenant export generated.'
];
for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) throw new Error(`Platform Tenants check failed: missing page anchor: ${anchor}`);
}

for (const staleAnchor of [
  'style={styles.','const styles:','<pre style=',
  "body: { billing_status:",
  'setSelected(',
  'useState<string | null>(null)'
]) {
  if (page.includes(staleAnchor)) throw new Error(`Platform Tenants check failed: stale page pattern remains: ${staleAnchor}`);
}

if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) {
  throw new Error('Platform Tenants check failed: Platform red theme variables missing.');
}
if (!css.includes('@media (max-width: 640px)')) throw new Error('Platform Tenants check failed: responsive mobile rules missing.');

const routeIndex = router.indexOf("path: 'tenants'");
if (routeIndex < 0) throw new Error('Platform Tenants check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 600);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}')) {
  throw new Error('Platform Tenants check failed: route must require TENANTS_READ.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/tenants"');
if (navIndex < 0) throw new Error('Platform Tenants check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
if (navGuardStart < 0) throw new Error('Platform Tenants check failed: navigation permission guard missing.');
const navWindow = layout.slice(navGuardStart, navIndex + 300);
if (!navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)')) {
  throw new Error('Platform Tenants check failed: navigation must require TENANTS_READ.');
}

if (!packageJson.includes('check:platform-tenants-page-hardening')) throw new Error('Platform Tenants check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-tenants-page-hardening')) throw new Error('Platform Tenants check failed: checker is not wired into check:ci.');

console.log('Platform Tenants page hardening checks passed.');
