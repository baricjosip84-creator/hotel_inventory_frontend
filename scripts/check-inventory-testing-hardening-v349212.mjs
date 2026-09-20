#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/DecisionLearningFeedbackPage.tsx');
const css = read('src/pages/DecisionLearningFeedbackPage.css');
const providers = read('src/app/AppProviders.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(page.includes('const feedbackValidationError = canGovern ? validateFeedbackForm(mode, form, sourceId, ui) : null;'),
  'Save eligibility is derived from the real Learning Feedback form validation');
check(page.includes('disabled={mutation.isPending || Boolean(feedbackValidationError)}'),
  'Save feedback is disabled while incomplete instead of accepting a dead click');
check(page.includes("ui('Choose a source record before saving.')"),
  'Missing source has a plain-language validation message');
check(page.includes("ui('Describe what happened before saving.')"),
  'Missing observed result has a plain-language validation message');
check(page.includes('learning-feedback-save-hint'),
  'Disabled save state explains what is still required');

check(page.includes('learning-feedback-trend__wrap') && page.includes('learning-feedback-trend__table'),
  'Learning Trend uses the improved table presentation');
check(page.includes('learning-feedback-trend__value') && page.includes('learning-feedback-trend__month'),
  'Learning Trend values and months receive clear visual treatment');
check(css.includes('.learning-feedback-page .learning-feedback-trend__table') && css.includes('.learning-feedback-page .learning-feedback-trend__value--positive'),
  'Learning Trend styling is present');

check(providers.includes('// return \'Action started.\';') && providers.includes('return null;'),
  'Generic Action started fallback is retained as a comment and suppressed');
check(!providers.includes("\n  return 'Action started.';\n}"),
  'Generic Action started fallback is no longer active');

for (const phrase of [
  'Choose a source record before saving.',
  'Describe what happened before saving.'
]) {
  check(translations.includes(`[\"${phrase}\"`), `Tenant translation catalog contains: ${phrase}`);
}

check(pkg.scripts['check:inventory-testing-hardening-v349212'] === 'node scripts/check-inventory-testing-hardening-v349212.mjs',
  'v3.49.212 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349211 && npm run check:inventory-testing-hardening-v349212'),
    `v3.49.212 frontend guard follows v3.49.211 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.212 Learning Feedback UX polish guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
