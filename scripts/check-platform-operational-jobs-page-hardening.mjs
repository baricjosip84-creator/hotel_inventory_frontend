import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformOperationalJobsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformOperationalJobsPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const required = [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  'PLATFORM_USERS_READ', 'PLATFORM_RUNBOOKS_READ', 'enabled: canWrite && canReadUsers', 'enabled: canWrite && canReadRunbooks',
  'PAGE_SIZE = 50', 'attention_only', 'include_archived', 'Showing the last successful registry snapshot',
  'evidence_contract', 'successful_run_does_not_prove_external_business_outcome', 'scheduler_heartbeat_does_not_prove_external_dependency_health',
  'owner_present', 'runbook_present', 'Record application run evidence', 'Execution history', 'Release expired claims', 'Recover stale claims',
  'Run worker once', 'Run heartbeat check', 'Default worker coverage', 'Identity changes', 'Status changes', 'toLocalDateTimeInput',
  'Archived — immutable', 'registered handler'
];
for (const token of required) if (!page.includes(token)) throw new Error(`Operational Jobs page hardening missing: ${token}`);
if (page.includes('toISOString().slice(0, 16)')) throw new Error('Operational Jobs must not convert datetime-local values through UTC slicing.');
if (page.includes('const styles:') || page.includes('style={styles.')) throw new Error('Operational Jobs must use the shared workspace/CSS rather than the legacy inline-style shell.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Operational Jobs Platform red workspace identity missing.');
if (!router.includes("path: 'operational-jobs'") || !router.includes('PLATFORM_JOBS_READ')) throw new Error('Operational Jobs route permission guard missing.');
if (!layout.includes('to="/platform/operational-jobs"') || !layout.includes('PLATFORM_JOBS_READ')) throw new Error('Operational Jobs sidebar permission visibility missing.');
if (!pkg.scripts?.['check:platform-operational-jobs-page-hardening']) throw new Error('Operational Jobs checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-operational-jobs-page-hardening')) throw new Error('Operational Jobs checker is not wired into check:ci.');
console.log('Platform Operational Jobs page hardening check: PASS');
