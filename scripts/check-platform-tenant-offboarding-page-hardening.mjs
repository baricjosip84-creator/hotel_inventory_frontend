import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/PlatformTenantOffboardingPage.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/pages/PlatformTenantOffboardingPage.css', import.meta.url), 'utf8');
const router = fs.readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../src/layouts/PlatformLayout.tsx', import.meta.url), 'utf8');

const checks = [
  ['Operational Workspace hero', page.includes('OperationalWorkspaceHero') && page.includes('OperationalWorkspaceStats')],
  ['Platform red identity', css.includes('--io-primary:#d14343') && css.includes('--io-primary-dark:#b93636')],
  ['URL-backed filters and pagination', page.includes('useSearchParams') && page.includes("q.set('offset'") && page.includes('PAGE_SIZE=50')],
  ['stale snapshot preservation', page.includes('Showing the last successful snapshot.') && page.includes('Boolean(list.error&&list.data)')],
  ['permission-aware owner identity', page.includes('PLATFORM_USERS_READ') && page.includes('Owner filter restricted') && page.includes('Owner linkage preserved')],
  ['completion blocker permission boundary', page.includes('PLATFORM_SESSIONS_READ') && page.includes('SUPPORT_SESSION_READ') && page.includes('PLATFORM_INCIDENTS_READ') && page.includes('PLATFORM_DATA_RETENTION_READ') && page.includes('Completion evidence is partial.')],
  ['archive lock permission boundary', page.includes('TENANTS_LOCK') && page.includes('Archive + write-lock tenant on completion')],
  ['explicit lifecycle actions', page.includes('/status') && page.includes('Record ready to archive') && page.includes('Complete offboarding') && page.includes('Cancel workflow')],
  ['terminal immutability', page.includes('Terminal history is immutable.')],
  ['truth boundary', page.includes('Checklist items are operator-recorded assertions') && page.includes('does not prove customer notification')],
  ['permission-aware supporting links', page.includes('canExport?<Link') && page.includes('canReadRetention?<Link') && page.includes('canReadAudit?<Link')],
  ['router protected by TENANTS_READ', router.includes("path: 'tenant-offboarding'") && router.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}')],
  ['sidebar protected by TENANTS_READ', layout.includes('to="/platform/tenant-offboarding"') && layout.includes('PLATFORM_PERMISSIONS.TENANTS_READ')]
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Platform Tenant Offboarding page hardening check failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Platform Tenant Offboarding page hardening: PASS (${checks.length}/${checks.length})`);
