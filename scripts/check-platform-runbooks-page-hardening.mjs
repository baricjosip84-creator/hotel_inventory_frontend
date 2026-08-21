import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformRunbooksPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformRunbooksPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Application execution ≠ external outcome.', 'permission scoped', 'PAGE_SIZE = 50',
  "searchParams.get('category')", "searchParams.get('execution_status')", "searchParams.get('tenant_id')", 'uuidPattern',
  'PLATFORM_RUNBOOKS_WRITE', 'PLATFORM_RUNBOOKS_EXECUTE', 'TENANTS_READ', 'PLATFORM_INCIDENTS_READ', 'PLATFORM_USERS_READ',
  'Showing the last successful Runbooks snapshot.', 'Showing the last successful runbook detail snapshot.', 'Showing the last successful execution detail snapshot.',
  'Structural history lock is active.', 'Title, category, severity and steps cannot be changed after execution history exists',
  'limit: String(PAGE_SIZE)', 'offset: String(runbookOffset)', 'offset: String(executionOffset)', 'Previous', 'Next', 'pagination.has_more',
  'Tenant linking requires TENANTS_READ.', 'Incidents restricted', 'Operator identity', 'Redacted',
  'Start execution', 'Save definition', 'Save steps', 'Save note', 'Complete execution', 'Cancel execution',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Runbooks check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', "params.set('limit', '200')", "'/platform/runbooks/executions?limit=100'", '<a style=']) {
  if (page.includes(stale)) throw new Error(`Platform Runbooks check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformRunbooksPage.css';")) throw new Error('Platform Runbooks check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Runbooks check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:720px)')) throw new Error('Platform Runbooks check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'runbooks'");
if (routeIndex < 0) throw new Error('Platform Runbooks check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ]}')) throw new Error('Platform Runbooks check failed: route must preserve PLATFORM_RUNBOOKS_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/runbooks"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 250);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)')) throw new Error('Platform Runbooks check failed: navigation must remain PLATFORM_RUNBOOKS_READ guarded.');

if (!packageJson.includes('check:platform-runbooks-page-hardening')) throw new Error('Platform Runbooks check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-runbooks-page-hardening')) throw new Error('Platform Runbooks check failed: checker is not wired into check:ci.');

console.log('Platform Runbooks page hardening checks passed.');
