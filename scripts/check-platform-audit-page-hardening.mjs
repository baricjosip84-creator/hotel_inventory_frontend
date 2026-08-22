import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireToken = (source, token, label) => { if (!source.includes(token)) throw new Error(`${label} missing: ${token}`); };

const page = read('src/pages/PlatformAuditPage.tsx');
const css = read('src/pages/PlatformAuditPage.css');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');
const systemHealth = read('src/pages/PlatformSystemHealthPage.tsx');
const pkg = JSON.parse(read('package.json'));

for (const token of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader',
  'AUDIT_READ base permission', 'Permission-scoped evidence', 'Read only',
  'useSearchParams', "searchParams.get('target_type') || searchParams.get('entity_type')",
  "searchParams.get('target_id') || searchParams.get('entity_id')",
  'SOURCE_OPTIONS', 'PlatformPermission[]', 'allowedSourceOptions',
  'TENANTS_READ required.', 'PLATFORM_USERS_READ required.',
  'placeholderData: (previous) => previous', 'Showing the last successful snapshot.',
  'PAGE_SIZE = 50', 'Previous', 'Next', 'pagination?.has_more',
  'restricted source families are omitted rather than counted as zero',
  'CSV export is capped', 'this export is partial', 'Exact evidence query',
  'event_presence_does_not_prove_external_business_or_infrastructure_outcome',
  'Evidence boundary'
]) requireToken(page, token, 'Platform Audit page hardening');

for (const stale of [
  'const styles: Record<string, CSSProperties>',
  'style={styles.',
  "platformApiRequest<PlatformAuditRow[]>('/platform/audit"
]) {
  if (page.includes(stale)) throw new Error(`Platform Audit legacy pattern remains: ${stale}`);
}

requireToken(page, "import './PlatformAuditPage.css';", 'Platform Audit CSS import');
requireToken(css, '--io-primary:#d14343', 'Platform Audit red identity');
requireToken(css, '--io-primary-dark:#b93636', 'Platform Audit red identity');
requireToken(css, '@media(max-width:760px)', 'Platform Audit mobile responsive rule');

const routeStart = router.indexOf("path: 'audit'");
const routeSlice = router.slice(routeStart, routeStart + 360);
if (routeStart < 0 || !routeSlice.includes('AUDIT_READ')) throw new Error('Platform Audit router must require AUDIT_READ.');
const navStart = layout.indexOf('to="/platform/audit"');
const navSlice = layout.slice(Math.max(0, navStart - 260), navStart + 220);
if (navStart < 0 || !navSlice.includes('AUDIT_READ')) throw new Error('Platform Audit sidebar visibility must require AUDIT_READ.');

requireToken(systemHealth, '/platform/audit?target_type=idempotency_key&target_id=', 'System Health canonical Audit deep link');
if (systemHealth.includes('/platform/audit?entity_type=idempotency_key&entity_id=')) throw new Error('System Health still uses the legacy Audit entity_* deep link.');

if (!pkg.scripts?.['check:platform-audit-page-hardening']) throw new Error('Platform Audit checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-audit-page-hardening')) throw new Error('Platform Audit checker is not wired into check:ci.');

console.log('Platform Audit page hardening check: PASS');
