import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/AdminSystemPage.tsx'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'src/app/navigationRegistry.ts'), 'utf8');

const requiredPageAnchors = [
  'tenant_write_locked',
  'unresolved_blocking_alerts',
  "refetchOnWindowFocus: false",
  'resolution_note: input.resolutionNote',
  'At least 3 characters are required before Resolve is enabled.',
  'Override and close',
  'Documented receiving shortages are allowed by the current finalization workflow.',
  "'/admin/diagnostics/blocking-alerts?limit=100'",
  "'/admin/diagnostics/stock-integrity?limit=100'",
  "'/admin/diagnostics/broken-shipments?limit=100'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Admin System hardening check failed: missing ${anchor}`);
  }
}

if (page.includes('blocking_alerts?: BlockingAlertRow[]')) {
  throw new Error('Admin System hardening check failed: system-status must not expose detailed blocking-alert rows.');
}

if (!navigation.includes('Review tenant operational status, integrity diagnostics, and administrative health signals.')) {
  throw new Error('Admin System hardening check failed: navigation description is stale.');
}

console.log('Admin System page hardening check passed.');
