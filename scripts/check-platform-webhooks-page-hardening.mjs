import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformWebhooksPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformWebhooksPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Webhook truth boundary', 'HTTP 2xx response is application-recorded delivery evidence only',
  'No observed delivery does not prove', 'PAGE_SIZE = 50', 'DELIVERY_PAGE_SIZE = 50',
  "searchParams.get('tenant_id')", "searchParams.get('search')", "searchParams.get('include_disabled')", "searchParams.get('delivery_status')", 'uuidPattern',
  'TENANTS_READ', 'PLATFORM_USERS_READ', 'AUDIT_READ', 'PLATFORM_DEPENDENCIES_READ', 'PLATFORM_API_KEYS_READ', 'PLATFORM_NOTIFICATIONS_READ', 'PLATFORM_JOBS_READ',
  'Showing the last successful snapshot.', 'Invalid or unauthorized URL filter',
  'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'limit: String(DELIVERY_PAGE_SIZE)', 'offset: String(deliveryOffset)', 'pagination.has_more',
  'signing_secret_ready', 'secret_rotation_required', 'Observed success', 'Never observed',
  'HTTPS destination', 'validHttpsUrl', 'automatic_audit_outbox_delivery', 'private_network_destinations_blocked',
  'Edit settings', 'Save settings', 'Send test', 'Rotate secret', 'Disable', 'Enable',
  'Delivery evidence', 'attempt_count', 'next_retry_at', 'error_message',
  'Integration monitoring', 'API keys', 'API client governance', 'Notifications', 'Operational jobs', 'Platform audit',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Webhooks check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', 'Manage tenant outbound integration endpoints, signing secrets, and delivery health.', "params.set('limit', '200')", "platformApiRequest<Tenant[]>('/platform/tenants') });"] ) {
  if (page.includes(stale)) throw new Error(`Platform Webhooks check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes('enabled: canReadTenants')) throw new Error('Platform Webhooks check failed: tenant directory query must be permission-gated.');
if (!page.includes("import './PlatformWebhooksPage.css';")) throw new Error('Platform Webhooks check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Webhooks check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Platform Webhooks check failed: mobile responsive rule missing.');
const mutationErrorIndex = page.indexOf('const mutating =');
const testMutationIndex = page.indexOf('const testDelivery = useMutation');
if (mutationErrorIndex < testMutationIndex) throw new Error('Platform Webhooks check failed: derived mutation state must be declared after mutation hooks to avoid temporal-dead-zone regressions.');
const routeIndex = router.indexOf("path: 'webhooks'");
if (routeIndex < 0) throw new Error('Platform Webhooks check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ]}')) throw new Error('Platform Webhooks check failed: route must preserve PLATFORM_WEBHOOKS_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/webhooks"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 260);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ)')) throw new Error('Platform Webhooks check failed: navigation must remain PLATFORM_WEBHOOKS_READ guarded.');
if (!packageJson.includes('check:platform-webhooks-page-hardening')) throw new Error('Platform Webhooks check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-webhooks-page-hardening')) throw new Error('Platform Webhooks check failed: checker is not wired into check:ci.');
console.log('Platform Webhooks page hardening checks passed.');
