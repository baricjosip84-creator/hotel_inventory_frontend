import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const steps = String(pkg.scripts['check:ci'] ?? '').split(' && ');
const required = [
  'npm run check:tenant-multilingual-closure-audit',
  'npm run check:command-pages-lint-closure-v349189',
  'npm run check:command-pages-final-producer-renderer-closure-v349188',
  'npm run check:backend-system-text-remaining-enum-localization-v349187',
  'npm run check:command-pages-final-business-presentation-closure-v349186',
  'npm run check:adaptive-policy-source-workflow-presentation-closure-v349185',
  'npm run check:learning-feedback-business-presentation-closure-v349184',
  'npm run check:adaptive-policy-business-presentation-closure-v349183',
  'npm run check:ft152-ci-entry-order',
  'npm run check:ft150-dashboard-stock-deep-link',
  'npm run check:stock-zero-usable-status-ft149'
];

assert.deepEqual(steps.slice(0, required.length), required,
  'retain the required historical guard order before adding FT152, FT150 and FT149');

for (const command of required) {
  assert.equal(steps.filter(s => s === command).length, 1, `${command} must appear exactly once`);
}
assert.equal(pkg.scripts['check:ft152-ci-entry-order'], 'node scripts/check-ft152-ci-entry-order.mjs', 'regression script must be wired to npm');
assert(steps.length > 150, 'do not truncate the existing guarded suite');
console.log(`FT152 CI entry ordering: PASS (${steps.length} guarded steps; historical guard prefix preserved, FT150/FT149 retained)`);
