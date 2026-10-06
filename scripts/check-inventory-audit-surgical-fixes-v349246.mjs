import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const crossDomain = read('src/pages/CrossDomainOptimizationPage.tsx');
const tenantAudit = read('src/pages/TenantAuditPage.tsx');

const checks = [
  [crossDomain.includes('const hasActiveEvidenceFilters ='), 'Cross-Domain active-filter state is explicitly tracked'],
  [crossDomain.includes("hasEvidence || hasActiveEvidenceFilters ? <section className=\"card cross-domain-filters\""), 'Cross-Domain filter controls remain available when active filters return zero evidence'],
  [crossDomain.includes("ui('No evidence matches the current filters')"), 'Cross-Domain zero-result copy distinguishes filtered empty state from true no-data state'],
  [crossDomain.includes("hasActiveEvidenceFilters ? <button className=\"button button--secondary\""), 'Cross-Domain zero-result state provides a direct Clear filters recovery action'],
  [tenantAudit.includes("placeholder={ui('Exact code, e.g. shipment.received')}"), 'Tenant Audit Action code example uses the real shipment.received action code'],
  [tenantAudit.includes("placeholder={ui('Exact type, e.g. shipments')}"), 'Tenant Audit Entity type field states that an exact internal type is required']
];

const failures = checks.filter(([passed]) => !passed);
for (const [passed, message] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${message}`);
}

if (failures.length) process.exit(1);
