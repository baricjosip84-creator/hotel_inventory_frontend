#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/DecisionLearningFeedbackPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(page.includes('const showTenantFeedbackTechnicalFields = false;'),
  'Tenant Learning Feedback technical-field gate is explicitly off');
check(page.includes('const showTenantLearningFeedbackReadinessChecks = false;'),
  'Tenant Learning Feedback readiness gate is explicitly off');
check(page.includes('showTenantLearningFeedbackReadinessChecks && canViewDiagnostics ? <OperationalWorkspaceTab'),
  'Readiness Checks tab implementation is retained but hidden from the tenant page');
check(page.includes('showTenantLearningFeedbackReadinessChecks && canViewDiagnostics ? (\n        <>'),
  'Readiness Checks content implementation is retained but hidden from the tenant page');

for (const marker of [
  "showTenantFeedbackTechnicalFields ? (\n          <label>\n            <span className=\"form-label\">{ui('Domain')}</span>",
  "showTenantFeedbackTechnicalFields ? (\n            <label>\n              <span className=\"form-label\">{ui('Result score (-1 to 1)')}</span>",
  "showTenantFeedbackTechnicalFields && activeSubtypeOptions.length > 0 ? (",
  "showTenantFeedbackTechnicalFields && mode === 'learning-outcomes' ? (\n          <details className=\"learning-feedback-advanced\">",
  "showTenantFeedbackTechnicalFields && canViewDiagnostics ? (\n            <label>\n              <span className=\"form-label\">{ui('Technical source reference')}</span>",
  "showTenantFeedbackTechnicalFields ? <label><span className=\"form-label\">{ui('Expected result')}</span>"
]) {
  check(page.includes(marker), `Technical/internal field remains in source behind tenant UI gate: ${marker.split('\n')[0]}`);
}

check(page.includes("{ui('Record what happened')}"), 'Feedback form heading uses plain language');
check(page.includes("ui('Choose what you checked, say whether it worked, and describe what actually happened.')"),
  'Feedback form instructions explain the task in plain language');
check(page.includes("{ui('Date checked')}"), 'Observed date is presented as Date checked');
check(page.includes("{ui('What happened?')}"), 'Actual result field is presented as What happened');
check(page.includes("ui('Describe what actually happened after this was checked or applied.')"),
  'Actual-result prompt is plain language');
check(page.includes("{ui('Did it help?')}"), 'Learning outcomes use a plain-language result choice instead of exposing the raw numeric score');
check(page.includes("function scoreDerivedFromStatus") && page.includes("status === 'effective'") && page.includes("status === 'ineffective'"),
  'Policy/optimization statuses preserve hidden score semantics automatically');
check(page.includes("form.recordKey ? ui('Save feedback changes') : ui('Save feedback')"),
  'New feedback action is presented as Save feedback');

for (const phrase of [
  'Record what happened',
  'Record what happened after you followed or checked a recommendation, forecast, policy, or optimization result.',
  'Choose what you checked, say whether it worked, and describe what actually happened.',
  'The selected recommendation is linked automatically to this feedback record.',
  'The selected policy is linked automatically to this feedback record.',
  'The selected planning run is linked automatically to this feedback record.',
  'What happened?',
  'Describe what actually happened after this was checked or applied.',
  'Date checked',
  'Did it help?',
  'Partly / unclear'
]) {
  check(translations.includes(`["${phrase}"`), `Tenant translation catalog contains: ${phrase}`);
}

check(page.includes('reference: JSON.stringify(sourceReference)'),
  'Hidden technical source reference is still populated for backend/audit compatibility');
check(page.includes("domain: source.domain || current.domain"),
  'Hidden domain remains source-derived for backend compatibility');
check(page.includes("subtype: defaultSubtypeForMode(nextMode)"),
  'Hidden evidence subtype still receives its canonical default');
check(page.includes("baseline_reference: expected") && page.includes("policy_reference: reference"),
  'Hidden policy baseline/reference still flow to the backend payload');

check(pkg.scripts['check:inventory-testing-hardening-v349211'] === 'node scripts/check-inventory-testing-hardening-v349211.mjs',
  'v3.49.211 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349210 && npm run check:inventory-testing-hardening-v349211'),
    `v3.49.211 frontend guard follows v3.49.210 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.211 Learning Feedback tenant simplification guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
