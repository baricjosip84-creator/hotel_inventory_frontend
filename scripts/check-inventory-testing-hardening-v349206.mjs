import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const page = read('src/pages/DecisionLearningFeedbackPage.tsx');
const crossRepo = read('scripts/check-unified-ai-cross-repo-contract.mjs');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (condition, message) => checks.push({ condition: Boolean(condition), message });

check(page.includes('function optionalJsonObject(value: string): Record<string, unknown> | undefined {'), 'optionalJsonObject no longer declares an unused editing parameter');
check(!page.includes('function optionalJsonObject(value: string, _editing: boolean)'), 'the lint-failing _editing parameter is absent');
check(page.includes('execution_reference: optionalJsonObject(form.executionReference),'), 'Learning Feedback payload calls optionalJsonObject with its actual single input');
check(!page.includes('optionalJsonObject(form.executionReference, editing)'), 'the stale second call-site argument is absent');
check(crossRepo.includes("const prebuildCommands = String(scripts.prebuild || '').split(' && ').filter(Boolean);"), 'cross-repo contract validates prebuild semantically instead of requiring an obsolete exact string');
check(crossRepo.includes("const prelintCommands = String(scripts.prelint || '').split(' && ').filter(Boolean);"), 'cross-repo contract validates prelint semantically instead of requiring an obsolete exact string');
check(!crossRepo.includes("scripts.prebuild !== 'npm run check:unified-ai-contract-suite"), 'cross-repo contract no longer freezes the full prebuild command chain');
check(!crossRepo.includes("scripts.prelint !== 'npm run check:unified-ai-contract-suite"), 'cross-repo contract no longer freezes the full prelint command chain');
check(pkg.scripts['check:inventory-testing-hardening-v349206'] === 'node scripts/check-inventory-testing-hardening-v349206.mjs', 'v3.49.206 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  const chain = pkg.scripts[key] || '';
  const p204 = chain.indexOf('npm run check:inventory-testing-hardening-v349204');
  const p206 = chain.indexOf('npm run check:inventory-testing-hardening-v349206');
  check(p204 >= 0 && p206 > p204, `v3.49.206 frontend guard follows v3.49.204 in ${key}`);
}

const failures = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.message}`);
if (failures.length) {
  console.error(`v3.49.206 Inventory testing CI closure frontend guard: FAIL (${checks.length - failures.length}/${checks.length})`);
  process.exit(1);
}
console.log(`v3.49.206 Inventory testing CI closure frontend guard: PASS (${checks.length}/${checks.length})`);
