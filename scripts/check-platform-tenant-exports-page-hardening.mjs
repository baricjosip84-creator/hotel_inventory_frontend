import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantExportsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantExportsPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const required = [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  'Showing the last successful snapshot.', 'Tenant row-data export', 'Summary evidence only',
  'evidence_complete', 'failed_tables', 'platform_control_plane_tables_excluded', 'secret_and_credential_material_excluded',
  'truncated_tables', 'redacted_sensitive_columns_count', 'repeatable_read_snapshot',
  'Export generation fails closed until every in-scope source is readable.',
  'It does not prove secure external delivery', 'database backup coverage', 'restore capability',
  'PLATFORM_COMPLIANCE_READ', 'AUDIT_READ', 'PLATFORM_DATA_RETENTION_READ'
];
for (const token of required) if (!page.includes(token)) throw new Error(`Tenant Exports page hardening missing: ${token}`);
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Tenant Exports Platform red workspace identity missing.');
const routeStart = router.indexOf("path: 'tenant-exports'");
const routeSlice = router.slice(routeStart, routeStart + 500);
if (routeStart < 0 || !routeSlice.includes('TENANTS_READ') || !routeSlice.includes('TENANTS_EXPORT')) throw new Error('Tenant Exports router must require TENANTS_READ + TENANTS_EXPORT.');
const navStart = layout.indexOf('to="/platform/tenant-exports"');
const navSlice = layout.slice(Math.max(0, navStart - 250), navStart + 250);
if (navStart < 0 || !navSlice.includes('TENANTS_READ') || !navSlice.includes('TENANTS_EXPORT')) throw new Error('Tenant Exports sidebar visibility must require TENANTS_READ + TENANTS_EXPORT.');
if (!pkg.scripts?.['check:platform-tenant-exports-page-hardening']) throw new Error('Tenant Exports checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-tenant-exports-page-hardening')) throw new Error('Tenant Exports checker is not wired into check:ci.');
console.log('Platform Tenant Exports page hardening check: PASS');
