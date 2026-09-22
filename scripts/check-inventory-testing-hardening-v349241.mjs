#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const commandFinal = read('scripts/check-command-pages-final-closure-v349177.mjs');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => {
  const ok = Boolean(condition);
  checks.push([ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(!page.includes('const canOpenExecutionRequests ='), 'obsolete unused canOpenExecutionRequests declaration removed');
check(!page.includes('TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW'), 'Cross-Domain no longer carries the superseded Execution Requests permission dependency');
check(commandFinal.includes("crossDomain.includes('canOpenReplenishmentPlanning')") && commandFinal.includes("crossDomain.includes('TENANT_PERMISSIONS.INSIGHTS_READ')") && !commandFinal.includes("crossDomain.includes('canOpenExecutionRequests')"), 'v3.49.177 historical permission assertion follows current source-workflow destinations');
check(page.includes("return '/execution-tasks';") && page.includes("ui('Open Execution Tasks')"), 'authoritative Execution Tasks handoff remains intact');
check(page.includes("return '/replenishment-planning';") && page.includes("ui('Open Replenishment Planning')"), 'authoritative Replenishment Planning handoff remains intact');
check(pkg.scripts['check:inventory-testing-hardening-v349241'] === 'node scripts/check-inventory-testing-hardening-v349241.mjs', 'v3.49.241 frontend guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check((pkg.scripts[key] || '').includes('check:inventory-testing-hardening-v349240 && npm run check:inventory-testing-hardening-v349241'), `v3.49.241 follows v3.49.240 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.241 Cross-Domain lint closure: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
