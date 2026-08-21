import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformProvisioningPresetsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformProvisioningPresetsPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const required = [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  'PAGE_SIZE = 50', 'preset_versions', 'Registry-wide count for the active filters', 'Showing the last successful snapshot.',
  'PLATFORM_USERS_READ', 'actorLabel', 'Restricted', 'created_by_present', 'updated_by_present',
  'published_status_does_not_certify_customer_fit', 'starter_locations_are_template_definitions_only',
  'Create new version', 'Clone to draft', 'Publish', 'Retire', 'business v', 'row version',
  'Published and retired versions are immutable', 'physical locations exist', 'contractual entitlements'
];
for (const token of required) if (!page.includes(token)) throw new Error(`Provisioning Presets page hardening missing: ${token}`);
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Provisioning Presets Platform red workspace identity missing.');
if (!router.includes("path: 'provisioning-presets'") || !router.includes('PLATFORM_PROVISIONING_PRESETS_READ')) throw new Error('Provisioning Presets route permission guard missing.');
if (!layout.includes('to="/platform/provisioning-presets"') || !layout.includes('PLATFORM_PROVISIONING_PRESETS_READ')) throw new Error('Provisioning Presets sidebar permission visibility missing.');
if (!pkg.scripts?.['check:platform-provisioning-presets-page-hardening']) throw new Error('Provisioning Presets checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-provisioning-presets-page-hardening')) throw new Error('Provisioning Presets checker is not wired into check:ci.');
console.log('Platform Provisioning Presets page hardening check: PASS');
