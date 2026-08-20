import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialReadinessVerificationProgramPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialReadinessVerificationProgramPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  'Read-only operator checklist',
  'Program ready to run',
  'Runtime/manual checks required',
  'certification is reported separately for each gate.',
  'Read full validation note',
  'Verification gate index',
  'Verification gates',
  'Program execution sequence',
  'Domain coverage',
  'Program-level controls',
  'gateEntries.map((entry) => renderGate(entry.title, entry.gate))',
  "replace(/_gate$/, '')",
  'key.endsWith(suffix)',
  'refetchOnWindowFocus: false',
  'staleTime: 5 * 60 * 1000',
  'const initialLoadError = query.isError && !data;',
  'const refreshError = query.isError && Boolean(data);',
  'Latest verification refresh failed.',
  'Showing the last successful verification program from',
  'disabled={query.isFetching}',
  "import './PlatformCommercialReadinessVerificationProgramPage.css';",
  'io-operational-page io-workspace-page platform-readiness-verification'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Readiness Verification hardening check failed: missing ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.platform-readiness-verification {',
  'overflow-x: hidden;',
  '.platform-readiness-verification__hero-aside',
  '.platform-readiness-verification__gate-card',
  '.platform-readiness-verification__control-grid',
  '.platform-readiness-verification__link-card:hover',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  '@media (max-width: 760px)'
];

for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Readiness Verification hardening check failed: stylesheet missing ${anchor}`);
  }
}

if (page.includes('data.deployment_verification_gate ? renderGate')) {
  throw new Error('Platform Readiness Verification hardening check failed: explicit gate render chain still present.');
}
if (page.includes('style={styles.') || page.includes('const styles:')) {
  throw new Error('Platform Readiness Verification hardening check failed: legacy inline page shell still present.');
}
if (!router.includes("path: 'commercial-readiness-verification-program'")) {
  throw new Error('Platform Readiness Verification hardening check failed: route missing.');
}
if (!router.includes('PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ')) {
  throw new Error('Platform Readiness Verification hardening check failed: route permission missing.');
}
if (!layout.includes('<NavLink to="/platform/commercial-readiness-verification-program"')) {
  throw new Error('Platform Readiness Verification hardening check failed: navigation entry missing.');
}

console.log('Platform Readiness Verification page hardening check passed.');
