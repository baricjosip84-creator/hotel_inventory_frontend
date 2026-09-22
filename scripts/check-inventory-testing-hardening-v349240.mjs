#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const commandFinal = read('scripts/check-command-pages-final-closure-v349177.mjs');
const crossGuard = read('scripts/check-cross-domain-optimization-operational-completion-v349170.mjs');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => {
  const ok = Boolean(condition);
  checks.push([ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(commandFinal.includes("crossDomainGuard.includes(\"page.includes('projectedSourceWorkflowPath')\")") && commandFinal.includes("ui('Open Execution Tasks')"), 'v3.49.177 historical guard now validates the current v3.49.170 source-workflow contract');
check(!commandFinal.includes("crossDomainGuard.includes(\"navigate('/execution-tasks')\")"), 'v3.49.177 no longer requires an obsolete literal navigation assertion inside the v3.49.170 guard');
check(crossGuard.includes("page.includes('projectedSourceWorkflowPath')") && crossGuard.includes("page.includes(\"ui('Open Execution Tasks')\")"), 'v3.49.170 continues to protect authoritative Execution Tasks handoff behavior');
check(!page.includes("navigate('/tenant-tasks')") && page.includes("navigate('/execution-tasks')"), 'current Cross-Domain page still uses tenant Execution Tasks rather than platform tenant-tasks');
check(page.includes("return '/execution-tasks';") && page.includes('projectedSourceWorkflowPath'), 'source-workflow resolver still resolves execution-domain work to /execution-tasks');
check(pkg.scripts['check:inventory-testing-hardening-v349240'] === 'node scripts/check-inventory-testing-hardening-v349240.mjs', 'v3.49.240 frontend guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check((pkg.scripts[key] || '').includes('check:inventory-testing-hardening-v349239 && npm run check:inventory-testing-hardening-v349240'), `v3.49.240 follows v3.49.239 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.240 Cross-Domain historical command-page guard modernization: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
