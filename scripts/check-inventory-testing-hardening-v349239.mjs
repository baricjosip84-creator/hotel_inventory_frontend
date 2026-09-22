#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const historical = read('scripts/check-cross-domain-optimization-operational-completion-v349170.mjs');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const multilingual = read('scripts/check-tenant-cross-domain-optimization-multilingual.mjs');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => {
  const ok = Boolean(condition);
  checks.push([ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(historical.includes("page.includes('Advanced governance settings')") && historical.includes("page.includes('Save governance settings')") && historical.includes("page.includes(\"method: 'PUT'\")"), 'v3.49.170 historical guard recognizes the current collapsed governance editor');
check(!historical.includes("page.includes('Optimization governance settings')"), 'v3.49.170 historical guard no longer requires the obsolete governance heading');
check(historical.includes("page.includes('projectedSourceWorkflowPath')") && historical.includes("page.includes(\"ui('Open Replenishment Planning')\")") && historical.includes("page.includes(\"ui('Open Execution Tasks')\")"), 'v3.49.170 historical guard protects the authoritative source-workflow handoffs');
check(!historical.includes("page.includes(\"navigate('/execution-requests')\")"), 'v3.49.170 historical guard no longer requires the superseded generic Execution Requests handoff');
check(multilingual.includes('\"Advanced governance settings\"') && !multilingual.includes('\"Optimization governance settings\"'), 'Cross-Domain multilingual guard recognizes the current governance heading');
check(page.includes("<summary>{ui('Advanced governance settings')}</summary>") && page.includes("method: 'PUT'"), 'current Cross-Domain page still exposes governed tenant settings');
check(page.includes("ui('Open Replenishment Planning')") && page.includes("ui('Open Execution Tasks')") && page.includes('projectedSourceWorkflowPath(selectedProjected)'), 'current Cross-Domain page still routes approved work to authoritative operational workflows');
check(pkg.scripts['check:inventory-testing-hardening-v349239'] === 'node scripts/check-inventory-testing-hardening-v349239.mjs', 'v3.49.239 frontend guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check((pkg.scripts[key] || '').includes('check:inventory-testing-hardening-v349238 && npm run check:inventory-testing-hardening-v349239'), `v3.49.239 follows v3.49.238 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.239 Cross-Domain historical guard modernization: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
