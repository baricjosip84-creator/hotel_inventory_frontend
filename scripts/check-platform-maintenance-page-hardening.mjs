import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireToken = (source, token, label) => { if (!source.includes(token)) throw new Error(`${label} missing: ${token}`); };
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformMaintenancePage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformMaintenancePage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

for (const token of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  'Showing the last successful maintenance snapshot.', 'evidence_complete', 'omitted_sources',
  'TENANTS_READ', 'PLATFORM_USERS_READ', 'PLATFORM_MAINTENANCE_WRITE',
  'Lock application writes while active', 'active write-lock window',
  'Status is the effective phase, not a stale stored label.',
  'Active-window start history is immutable.', 'Cancellation reason', 'Complete now',
  'Maintenance window details updated.', 'Tenant-visible message',
  'do not prove external maintenance work or customer receipt',
  'It does not prove infrastructure work occurred',
  'PAGE_SIZE = 50', 'limit', 'offset', 'Previous', 'Next',
  'refetchOnWindowFocus: false', 'placeholderData: (previous) => previous',
  "enabled: canReadTenants", 'uuidPattern', 'Invalid or unauthorized URL filter'
]) {
  if (!page.includes(token)) throw new Error(`Maintenance page hardening missing: ${token}`);
}
for (const stale of ['style={styles.', 'const styles: Record<string, CSSProperties>', 'queryFn: () => platformApiRequest<MaintenanceWindow[]>']) {
  if (page.includes(stale)) throw new Error(`Maintenance legacy page pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformMaintenancePage.css';")) throw new Error('Maintenance page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Maintenance Platform red Operational Workspace identity missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Maintenance mobile responsive rule missing.');

const routeStart = router.indexOf("path: 'maintenance'");
const routeSlice = router.slice(routeStart, routeStart + 340);
if (routeStart < 0 || !routeSlice.includes('PLATFORM_MAINTENANCE_READ')) throw new Error('Maintenance router must require PLATFORM_MAINTENANCE_READ.');
const navStart = layout.indexOf('to="/platform/maintenance"');
const navSlice = layout.slice(Math.max(0, navStart - 200), navStart + 230);
if (navStart < 0 || !navSlice.includes('PLATFORM_MAINTENANCE_READ')) throw new Error('Maintenance sidebar visibility must require PLATFORM_MAINTENANCE_READ.');
if (!pkg.scripts?.['check:platform-maintenance-page-hardening']) throw new Error('Maintenance checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-maintenance-page-hardening')) throw new Error('Maintenance checker is not wired into check:ci.');

for (const [relativePath, source] of [
  ['src/pages/PlatformReleasesPage.tsx', read('src/pages/PlatformReleasesPage.tsx')],
  ['src/pages/PlatformChangeManagementPage.tsx', read('src/pages/PlatformChangeManagementPage.tsx')]
]) {
  requireToken(source, 'MaintenanceRegistryResponse', relativePath);
  requireToken(source, 'maintenance.data?.windows', relativePath);
  requireToken(source, "window.status === 'scheduled' || window.status === 'active'", relativePath);
}

console.log('Platform Maintenance page hardening check: PASS');
