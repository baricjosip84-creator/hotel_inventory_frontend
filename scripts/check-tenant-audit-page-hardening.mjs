import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagePath = path.join(root, 'src/pages/TenantAuditPage.tsx');
const cssPath = path.join(root, 'src/pages/TenantAuditPage.css');
const page = fs.readFileSync(pagePath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const failures = [];

const requiredPageTokens = [
  'tenant-audit-page io-operational-page io-workspace-page',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  '/audit/summary?',
  '/audit/export.csv?',
  'Search audit history',
  'Support-session actions only',
  'Show technical details',
  'Raw metadata',
  'apiDownloadFile'
];

for (const token of requiredPageTokens) {
  if (!page.includes(token)) failures.push(`TenantAuditPage.tsx is missing ${token}`);
}

for (const forbidden of ['style={styles.', 'const styles: Record<string, CSSProperties>']) {
  if (page.includes(forbidden)) failures.push(`TenantAuditPage.tsx still uses legacy inline styling: ${forbidden}`);
}

const requiredCssTokens = [
  '.tenant-audit-filter-grid',
  '.tenant-audit-table-wrap',
  '.tenant-audit-evidence-grid',
  '.tenant-audit-metadata-pre',
  '@media (max-width: 720px)'
];
for (const token of requiredCssTokens) {
  if (!css.includes(token)) failures.push(`TenantAuditPage.css is missing ${token}`);
}

if (failures.length) {
  console.error('Tenant Audit page hardening check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Tenant Audit page hardening check passed.');
