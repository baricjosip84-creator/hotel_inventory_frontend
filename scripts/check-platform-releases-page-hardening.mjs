import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformReleasesPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformReleasesPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const required = [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams', 'PAGE_SIZE = 50',
  'PLATFORM_USERS_READ', 'PLATFORM_CHANGES_READ', 'PLATFORM_MAINTENANCE_READ', 'enabled: canWrite && canReadUsers',
  'enabled: canWrite && canReadChanges', 'enabled: canWrite && canReadMaintenance', 'Showing the last successful snapshot',
  'Registry-wide filtered summary', 'deployed_status_does_not_prove_external_deployment', 'linked_change_is_application_reference_only',
  'Terminal release history', 'Record deployed', 'Record rollback', 'toLocalDateTimeInput', 'placeholderData: (previousData) => previousData'
];
for (const token of required) if (!page.includes(token)) throw new Error(`Releases page hardening missing: ${token}`);
if (page.includes('new Date(value).toISOString().slice(0, 16)')) throw new Error('Releases must not UTC-slice datetime-local values.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Releases Platform red workspace identity missing.');
if (!router.includes("path: 'releases'") || !router.includes('PLATFORM_RELEASES_READ')) throw new Error('Releases route permission guard missing.');
if (!layout.includes('to="/platform/releases"') || !layout.includes('PLATFORM_RELEASES_READ')) throw new Error('Releases sidebar permission visibility missing.');
if (!pkg.scripts?.['check:platform-releases-page-hardening']) throw new Error('Releases checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-releases-page-hardening')) throw new Error('Releases checker is not wired into check:ci.');
console.log('Platform Releases page hardening check: PASS');
