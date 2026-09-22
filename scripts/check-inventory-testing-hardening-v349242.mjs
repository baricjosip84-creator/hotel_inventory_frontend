#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/ReplenishmentPlanningPage.tsx');
const providers = read('src/app/AppProviders.tsx');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => {
  const ok = Boolean(condition);
  checks.push([ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(page.includes("import { showTenantActionError, showTenantActionSuccess } from '../lib/actionFeedback';"), 'Replenishment Planning uses shared viewport action feedback');
check(page.includes("apiRequest<PlanningRunDetail>('/replenishment-planning', { method: 'POST', body: JSON.stringify(input), skipMutationFeedback: true })"), 'planning-run creation suppresses the old generic mutation toast');
check((page.match(/showTenantActionSuccess\(successMessage\);/g) || []).length === 3, 'run creation, decision save, and draft creation all publish viewport success feedback');
check((page.match(/showTenantActionError\(failureMessage\);/g) || []).length === 3, 'run creation, decision save, and draft creation all publish viewport error feedback');
check(page.includes("Planning run created. No stock moved and no supplier order was placed."), 'run-created feedback remains specific about no operational execution');
check(page.includes("Planning decisions saved. No draft transfer or Purchase Order was created."), 'decision-save feedback remains specific about no draft creation');
check(page.includes("Live evidence was checked again. Created {transfers} draft Stock Transfer(s) and {purchaseOrders} draft Purchase Order(s). Nothing was approved or executed."), 'draft-creation feedback remains specific about created drafts and execution boundary');
check(page.includes("{message ? <div style={styles.success}>{message}</div> : null}"), 'inline page success banner remains available as persistent page context');
check(providers.includes("position: 'fixed'") && providers.includes("bottom: '24px'") && providers.includes('ActionFeedbackToasts'), 'shared action-feedback toast remains fixed to the current viewport');
check(pkg.scripts['check:inventory-testing-hardening-v349242'] === 'node scripts/check-inventory-testing-hardening-v349242.mjs', 'v3.49.242 frontend guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check((pkg.scripts[key] || '').includes('check:inventory-testing-hardening-v349241 && npm run check:inventory-testing-hardening-v349242'), `v3.49.242 follows v3.49.241 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.242 Replenishment viewport feedback closure: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
