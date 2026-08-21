import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCapacityPlanningPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCapacityPlanningPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const required = [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  'PLATFORM_DEPENDENCIES_READ', 'PLATFORM_USERS_READ', 'enabled: canReadDependencies', 'enabled: canReadUsers',
  'PAGE_SIZE = 50', 'attention_only', 'include_archived', 'Showing the last successful snapshot',
  '/usage', 'Record usage', 'current_usage_is_operator_recorded', 'no_external_infrastructure_telemetry_verified',
  'dependency_present', 'owner_present', 'Registry-wide filtered summary', 'toLocalDateTimeInput'
];
for (const token of required) if (!page.includes(token)) throw new Error(`Capacity Planning page hardening missing: ${token}`);
if (page.includes('toISOString().slice(0, 16)')) throw new Error('Capacity Planning must not convert datetime-local values through UTC slicing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Capacity Planning Platform red workspace identity missing.');
if (!router.includes("path: 'capacity-planning'") || !router.includes('PLATFORM_CAPACITY_READ')) throw new Error('Capacity Planning route permission guard missing.');
if (!layout.includes('to="/platform/capacity-planning"') || !layout.includes('PLATFORM_CAPACITY_READ')) throw new Error('Capacity Planning sidebar permission visibility missing.');
if (!pkg.scripts?.['check:platform-capacity-planning-page-hardening']) throw new Error('Capacity Planning checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-capacity-planning-page-hardening')) throw new Error('Capacity Planning checker is not wired into check:ci.');
console.log('Platform Capacity Planning page hardening check: PASS');
