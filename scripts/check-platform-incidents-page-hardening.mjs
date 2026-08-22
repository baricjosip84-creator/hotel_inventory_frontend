import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformIncidentsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformIncidentsPage.css'), 'utf8');
const tenantLayout = fs.readFileSync(path.join(root, 'src/layouts/AppLayout.tsx'), 'utf8');
const customerSuccess = fs.readFileSync(path.join(root, 'src/pages/PlatformCustomerSuccessAdminPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const required = [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  'Showing the last successful snapshot.', 'evidence_complete', 'omitted_sources',
  'TENANTS_READ', 'PLATFORM_USERS_READ', 'PLATFORM_INCIDENTS_WRITE',
  'New incidents always begin in Investigating.', 'Internal summary', 'Platform operators only.',
  'Make the initial timeline update visible to affected tenant users',
  'Lifecycle status, scope, tenant linkage and start/resolution history cannot be changed here.',
  'Resolved/cancelled incident details are immutable historical evidence.',
  'Cancellation reason', 'Tenant-visible public message',
  'Recorded incident state does not prove the external service state.',
  'updates explicitly marked public', 'internal summaries, notes, metadata and Platform-user identities are excluded.'
];
for (const token of required) if (!page.includes(token)) throw new Error(`Incidents page hardening missing: ${token}`);

if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) {
  throw new Error('Incidents Platform red Operational Workspace identity missing.');
}
if (tenantLayout.includes('incidentContext.incidents[0].summary')) throw new Error('Tenant shell must not render internal incident summary.');
if (!tenantLayout.includes('incidentContext.incidents[0].public_message')) throw new Error('Tenant shell public incident message contract missing.');
if (!customerSuccess.includes("open_incidents: number | null") || !customerSuccess.includes("item.open_incidents ?? 'Restricted'") || !customerSuccess.includes('canReadIncidents')) {
  throw new Error('Customer Success downstream restricted incident evidence UX missing.');
}

const routeStart = router.indexOf("path: 'incidents'");
const routeSlice = router.slice(routeStart, routeStart + 320);
if (routeStart < 0 || !routeSlice.includes('PLATFORM_INCIDENTS_READ')) throw new Error('Incidents router must require PLATFORM_INCIDENTS_READ.');
const navStart = layout.indexOf('to="/platform/incidents"');
const navSlice = layout.slice(Math.max(0, navStart - 180), navStart + 220);
if (navStart < 0 || !navSlice.includes('PLATFORM_INCIDENTS_READ')) throw new Error('Incidents sidebar visibility must require PLATFORM_INCIDENTS_READ.');
if (!pkg.scripts?.['check:platform-incidents-page-hardening']) throw new Error('Incidents checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-incidents-page-hardening')) throw new Error('Incidents checker is not wired into check:ci.');
console.log('Platform Incidents page hardening check: PASS');
