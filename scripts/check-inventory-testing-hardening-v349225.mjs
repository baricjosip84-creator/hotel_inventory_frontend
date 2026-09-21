#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (ok, label) => {
  checks.push([!!ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(
  page.includes('setCreateStep(1); setShowCreate(true);') && !page.includes('if (showCreate) { setShowCreate(false); }'),
  'Cross-Domain create entry points preserve the v3.49.218 open-only wizard contract'
);
check(
  page.includes('setCreateStep(1); setShowCreate(true); setSourceBuildReport(null);'),
  'Opening a comparison also clears the previous source-build report without breaking the historical create-action signature'
);
check(
  page.includes('canGovern && hasEvidence && !showCreate ? <button'),
  'Header Create action remains hidden while the wizard is open'
);
check(
  pkg.scripts['check:inventory-testing-hardening-v349225'] === 'node scripts/check-inventory-testing-hardening-v349225.mjs',
  'v3.49.225 guard registered'
);
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(
    pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349224') && pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349225'),
    `v3.49.225 follows v3.49.224 in ${key}`
  );
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.225 Cross-Domain CI compatibility guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
