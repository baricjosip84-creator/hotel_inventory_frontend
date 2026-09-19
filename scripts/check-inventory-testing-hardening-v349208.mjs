#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/ExecutionTasksPage.tsx');
const css = read('src/pages/ExecutionTasksPage.css');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(page.includes('source_request_status?: string | null;') && page.includes('source_execution_status?: string | null;') && page.includes('source_completion_ready?: boolean;'),
  'Execution Task UI type carries current source readiness evidence');
check(page.includes("return task.source_type !== 'execution_request' || task.source_completion_ready !== false;"),
  'Execution Task source readiness fails closed for closure tasks');
check(page.includes("['ready', 'assigned', 'blocked'].includes(task.status) && sourceReady"),
  'Start is hidden while the linked Execution Request source is still open');
check(page.includes("['ready', 'assigned', 'in_progress'].includes(task.status) && sourceReady"),
  'Complete is hidden while the linked Execution Request source is still open');
check(page.includes('ui("Waiting for source execution")'),
  'Queue actions explain why worker actions are unavailable');
check(page.includes('Complete the linked Execution Request with real execution or no-op execution before closing this task.'),
  'Task detail explains the required source workflow');
check(css.includes('.execution-tasks-source-gate'),
  'Waiting-state presentation has scoped styling');
check(translations.includes('["Waiting for source execution"') &&
      translations.includes('["Complete the linked Execution Request with real execution or no-op execution before closing this task."'),
  'Closure source-gate guidance is present in the tenant translation catalog');
check(pkg.scripts['check:inventory-testing-hardening-v349208'] === 'node scripts/check-inventory-testing-hardening-v349208.mjs',
  'v3.49.208 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349207 && npm run check:inventory-testing-hardening-v349208'),
    `v3.49.208 frontend guard follows v3.49.207 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.208 Execution Request closure-task readiness frontend guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
