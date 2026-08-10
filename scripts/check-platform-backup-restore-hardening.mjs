import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformBackupRestoreValidationPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "searchParams.get('tenant_id')",
  "platformApiRequest<Tenant[]>('/platform/tenants')",
  "platformApiRequest<BackupRestorePackage>(`/platform/backup-restore-validation${queryString ? `?${queryString}` : ''}`)",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'htmlFor="backup-restore-tenant-filter"',
  'Tenant filter options could not be loaded:',
  'Unable to load backup restore validation:',
  'readableError(validation.error)',
  'Operator precheck only.',
  'does not execute production database backups',
  'platform_controls',
  'Platform recovery controls',
  'Tenant export',
  'setSearchParams(nextParams, { replace: true })'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Backup Restore check failed: missing page anchor: ${anchor}`);
  }
}

if (!router.includes("path: 'backup-restore-validation'")) {
  throw new Error('Platform Backup Restore check failed: canonical route missing.');
}
for (const permission of [
  'PLATFORM_PERMISSIONS.TENANTS_READ',
  'PLATFORM_PERMISSIONS.TENANTS_EXPORT',
  'PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ'
]) {
  const routeIndex = router.indexOf("path: 'backup-restore-validation'");
  const routeWindow = router.slice(routeIndex, routeIndex + 700);
  if (!routeWindow.includes(permission)) {
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

if (page.includes("badgeStyle(data?.posture || 'loading')") && !page.includes("value === 'loading'")) {
  throw new Error('Platform Backup Restore check failed: loading posture must render neutrally.');
}

console.log('Platform Backup Restore hardening checks passed.');
