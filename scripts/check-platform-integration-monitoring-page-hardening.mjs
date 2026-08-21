import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformIntegrationMonitoringPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformIntegrationMonitoringPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Evidence and truth boundary', 'What this board does not prove', 'Read-only monitoring board',
  'PAGE_SIZE = 50', "searchParams.get('tenant_id')", "searchParams.get('source')", "searchParams.get('search')", "searchParams.get('include_revoked')", 'uuidPattern',
  'PLATFORM_DEPENDENCIES_READ', 'PLATFORM_WEBHOOKS_READ', 'PLATFORM_API_KEYS_READ', 'PLATFORM_NOTIFICATIONS_READ', 'PLATFORM_NOTIFICATIONS_WRITE', 'TENANTS_READ', 'PLATFORM_USERS_READ', 'PLATFORM_VENDORS_READ',
  'Showing the last successful integration monitoring snapshot.', 'Invalid or unauthorized URL filter',
  'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'pagination.has_more',
  'Partial source visibility', 'Tenant-created API client', 'Platform-created API key', 'Legacy hla_', 'inv_live public API',
  'Last authenticated request', 'Not supported by tenant client model', 'Revoked credential history',
  'No application evidence matched.', 'It does not prove that no external integration or external activity exists.',
  'Run notification reconciliation', 'canRunNotificationScan', 'API client governance',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Integration monitoring check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', 'Commercial readiness posture', 'backend returns the full monitoring surface']) {
  if (page.includes(stale)) throw new Error(`Platform Integration monitoring check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformIntegrationMonitoringPage.css';")) throw new Error('Platform Integration monitoring check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Integration monitoring check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Platform Integration monitoring check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'integration-monitoring'");
if (routeIndex < 0) throw new Error('Platform Integration monitoring check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 500);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ]}')) throw new Error('Platform Integration monitoring check failed: route must preserve PLATFORM_DEPENDENCIES_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/integration-monitoring"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 300);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)')) throw new Error('Platform Integration monitoring check failed: navigation must remain PLATFORM_DEPENDENCIES_READ guarded.');

if (!packageJson.includes('check:platform-integration-monitoring-page-hardening')) throw new Error('Platform Integration monitoring check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-integration-monitoring-page-hardening')) throw new Error('Platform Integration monitoring check failed: checker is not wired into check:ci.');

console.log('Platform Integration monitoring page hardening checks passed.');
