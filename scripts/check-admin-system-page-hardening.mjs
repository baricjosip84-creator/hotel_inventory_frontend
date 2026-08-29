import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/AdminSystemPage.tsx'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'src/app/navigationRegistry.ts'), 'utf8');
const pageCss = fs.readFileSync(path.join(root, 'src/pages/AdminSystemPage.css'), 'utf8');

const requiredPageAnchors = [
  'admin-system-page io-operational-page io-workspace-page',
  '<OperationalWorkspaceHero',
  '<OperationalWorkspaceStats',
  '<OperationalWorkspaceStatCard',
  '<OperationalSectionHeader',
  'tenant_write_locked',
  'unresolved_blocking_alerts',
  "refetchOnWindowFocus: false",
  "queryClient.invalidateQueries({ queryKey: ['admin-system'] })",
  'resolution_note: input.resolutionNote',
  'At least 3 characters are required before Resolve is enabled.',
  'alertActionsBlockedByWriteLock',
  'Alert actions are disabled while the effective write status is locked.',
  'Override and close',
  'Each diagnostic list loads up to 100 current rows',
  "'Healthy'",
  'No blocking, stock, or shipment integrity issues detected',
  'DIAGNOSTICS AVAILABLE',
  "loadedStockIssueCount === 1 ? ui('{count} issue') : ui('{count} issues')",
  "loadedBrokenShipmentCount === 1 ? ui('{count} issue') : ui('{count} issues')",
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

if (page.includes('ACTIONS AVAILABLE')) {
  throw new Error('Admin System hardening check failed: diagnostic header must not imply alert actions when no alert rows exist.');
}

if (page.includes('`${loadedStockIssueCount} loaded`') || page.includes('`${loadedBrokenShipmentCount} loaded`')) {
  throw new Error('Admin System hardening check failed: integrity counters must describe issues, not technical loaded-row wording.');
}

for (const cssAnchor of ['.admin-system-status-grid', '.admin-system-diagnostic-group', '.admin-system-empty-good']) {
  if (!pageCss.includes(cssAnchor)) {
    throw new Error(`Admin System hardening check failed: missing CSS contract ${cssAnchor}`);
  }
}

if (!navigation.includes('Review tenant operational status, integrity diagnostics, and administrative health signals.')) {
  throw new Error('Admin System hardening check failed: navigation description is stale.');
}

console.log('Admin System page hardening check passed.');
