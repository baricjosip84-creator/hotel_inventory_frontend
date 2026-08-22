import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformDataRetentionPage.tsx'), 'utf8');
const auditRetention = fs.readFileSync(path.join(root, 'src/pages/PlatformAuditRetentionPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformDataRetentionPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const required = [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  'Showing the last successful snapshot.', 'evidence_complete', 'omitted_sources', 'tenant_registry_complete',
  'TENANTS_READ', 'PLATFORM_USERS_READ', 'TENANTS_EXPORT', 'PLATFORM_COMPLIANCE_READ', 'AUDIT_READ',
  'enabled:canReadTenants', 'Set hold', 'Clear hold', 'dedicated lifecycle actions',
  'Retention policy is application configuration, not deletion evidence.', 'this surface has no purge executor',
  'Absence of application rows does not prove backups, exports, replicas, or other external copies are absent or deleted.',
  'Restricted values are not converted to zero or “healthy”.'
];
for (const token of required) if (!page.includes(token)) throw new Error(`Data Retention page hardening missing: ${token}`);
if (!auditRetention.includes('evidence_complete') || !auditRetention.includes('Summary evidence restricted') || !auditRetention.includes('Restricted values remain Restricted/null and are not treated as zero')) {
  throw new Error('Audit Retention downstream restricted-evidence UX is missing.');
}
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Data Retention Platform red workspace identity missing.');
const routeStart = router.indexOf("path: 'data-retention'");
const routeSlice = router.slice(routeStart, routeStart + 420);
if (routeStart < 0 || !routeSlice.includes('PLATFORM_DATA_RETENTION_READ')) throw new Error('Data Retention router must require PLATFORM_DATA_RETENTION_READ.');
const navStart = layout.indexOf('to="/platform/data-retention"');
const navSlice = layout.slice(Math.max(0, navStart - 220), navStart + 220);
if (navStart < 0 || !navSlice.includes('PLATFORM_DATA_RETENTION_READ')) throw new Error('Data Retention sidebar visibility must require PLATFORM_DATA_RETENTION_READ.');
if (!pkg.scripts?.['check:platform-data-retention-page-hardening']) throw new Error('Data Retention checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-data-retention-page-hardening')) throw new Error('Data Retention checker is not wired into check:ci.');
console.log('Platform Data Retention page hardening check: PASS');
