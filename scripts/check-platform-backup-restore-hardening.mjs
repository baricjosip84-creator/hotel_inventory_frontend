import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformBackupRestoreValidationPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformBackupRestoreValidationPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "const tenantId = searchParams.get('tenant_id') || ''",
  "platformApiRequest<Tenant[]>('/platform/tenants')",
  "platformApiRequest<BackupRestorePackage>(`/platform/backup-restore-validation${queryString ? `?${queryString}` : ''}`)",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  "import './PlatformBackupRestoreValidationPage.css'",
  'htmlFor="backup-restore-tenant-filter"',
  'Tenant filter options could not be loaded:',
  'The current URL scope is preserved.',
  'Selected tenant (',
  'setSearchParams(nextParams, { replace: true })',
  'Unable to load backup restore validation:',
  'Refresh failed — showing the last successful backup / restore snapshot.',
  'const refreshError = validation.isError && Boolean(data)',
  'const initialLoadError = validation.isError && !data',
  'disabled={tenantsQuery.isFetching || validation.isFetching}',
  'Operator precheck only.',
  'does not execute production database backups',
  'No backup or restore mutations',
  'Platform recovery controls',
  'Tenant recovery evidence',
  'Tenant export evidence is useful recovery evidence, but it is not a database restore.',
  'tenant.controls.map((control)',
  'tenant.missing_control_codes.length',
  'Tenant export',
  'Runbooks',
  'Documentation'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Backup Restore check failed: missing page anchor: ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.platform-backup-restore__status-badge[data-tone=',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)',
  'overflow-wrap: anywhere',
  'flex-wrap: wrap',
  '@media (max-width: 860px)',
  '@media (max-width: 620px)'
];
for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Backup Restore check failed: stylesheet missing ${anchor}`);
  }
}

if (page.includes('useState(')) {
  throw new Error('Platform Backup Restore check failed: tenant filter must derive from URL search params instead of parallel local state.');
}
if (page.includes('const styles: Record<string, CSSProperties>')) {
  throw new Error('Platform Backup Restore check failed: legacy inline-style shell is still present.');
}

const canonicalRouteIndex = router.indexOf("path: 'backup-restore-validation'");
if (canonicalRouteIndex < 0) throw new Error('Platform Backup Restore check failed: canonical route missing.');
const canonicalRouteWindow = router.slice(canonicalRouteIndex, canonicalRouteIndex + 850);
for (const permission of [
  'PLATFORM_PERMISSIONS.TENANTS_READ',
  'PLATFORM_PERMISSIONS.TENANTS_EXPORT',
  'PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ'
]) {
  if (!canonicalRouteWindow.includes(permission)) {
    throw new Error(`Platform Backup Restore check failed: canonical route permission missing ${permission}.`);
  }
}

if (!router.includes("path: 'backup-restore'")) {
  throw new Error('Platform Backup Restore check failed: backup-restore compatibility route missing.');
}
if (!router.includes('LegacyPlatformBackupRestoreRedirect')) {
  throw new Error('Platform Backup Restore check failed: compatibility redirect helper missing.');
}
if (!router.includes('/platform/backup-restore-validation${location.search}${location.hash}')) {
  throw new Error('Platform Backup Restore check failed: compatibility redirect must preserve query/hash context.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/backup-restore-validation"');
if (navIndex < 0) throw new Error('Platform Backup Restore check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 650), navIndex + 250);
for (const permission of [
  'PLATFORM_PERMISSIONS.TENANTS_READ',
  'PLATFORM_PERMISSIONS.TENANTS_EXPORT',
  'PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ'
]) {
  if (!navWindow.includes(`hasPlatformPermission(${permission})`)) {
    throw new Error(`Platform Backup Restore check failed: navigation permission missing ${permission}.`);
  }
}

console.log('Platform Backup Restore hardening checks passed.');
