import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialReadinessVerificationProgramPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
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
  "key.endsWith(suffix)",
  "refetchOnWindowFocus: false",
  'staleTime: 5 * 60 * 1000',
  "overflowX: 'hidden'",
  "overflowWrap: 'anywhere'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Readiness Verification hardening check failed: missing ${anchor}`);
  }
}

if (page.includes('data.deployment_verification_gate ? renderGate')) {
  throw new Error('Platform Readiness Verification hardening check failed: explicit gate render chain still present.');
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
