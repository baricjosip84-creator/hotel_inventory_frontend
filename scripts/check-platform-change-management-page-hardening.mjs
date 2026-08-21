import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformChangeManagementPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformChangeManagementPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Application execution ≠ external outcome.', 'permission scoped', 'PAGE_SIZE = 50',
  "searchParams.get('status')", "searchParams.get('category')", "searchParams.get('risk_level')", "searchParams.get('tenant_id')", 'uuidPattern',
  'PLATFORM_CHANGES_WRITE', 'PLATFORM_CHANGES_APPROVE', 'PLATFORM_CHANGES_EXECUTE', 'TENANTS_READ', 'PLATFORM_MAINTENANCE_READ', 'PLATFORM_RUNBOOKS_READ', 'PLATFORM_USERS_READ',
  'Showing the last successful Change Management snapshot.', 'Invalid or unauthorized URL filter',
  'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'pagination.has_more',
  'Tenant evidence', 'Maintenance evidence', 'Runbook evidence', 'Operator identity', 'Redacted',
  'High and critical drafts automatically enter pending approval.', 'Save draft', 'Submit for approval', 'Approve', 'Reject', 'Mark executed', 'Cancel',
  'refetchOnWindowFocus: false', 'staleTime: 30_000', 'toIsoOrNull'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Change Management check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', "params.set('limit', '200')", '<a style=', 'setTimeout(() => updateChange']) {
  if (page.includes(stale)) throw new Error(`Platform Change Management check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformChangeManagementPage.css';")) throw new Error('Platform Change Management check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Change Management check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Platform Change Management check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'change-management'");
if (routeIndex < 0) throw new Error('Platform Change Management check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ]}')) throw new Error('Platform Change Management check failed: route must preserve PLATFORM_CHANGES_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/change-management"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 260);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ)')) throw new Error('Platform Change Management check failed: navigation must remain PLATFORM_CHANGES_READ guarded.');

if (!packageJson.includes('check:platform-change-management-page-hardening')) throw new Error('Platform Change Management check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-change-management-page-hardening')) throw new Error('Platform Change Management check failed: checker is not wired into check:ci.');

console.log('Platform Change Management page hardening checks passed.');
