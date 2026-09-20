#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const css = read('src/pages/CrossDomainOptimizationPage.css');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(page.includes("ui('Create decision comparison')") && page.includes("ui('What decision do you need to make?')"),
  'Cross-Domain creation starts with a plain-language decision step');
check(page.includes("ui('What matters when making this decision?')") && page.includes("ui('What solutions are you considering?')"),
  'Cross-Domain creation separates business priorities from possible solutions');
check(page.includes("ui('Who is responsible for finishing this review?')") && page.includes('data?.owner_candidates || []'),
  'Owner selection remains backed by authoritative owner candidates');
check(page.includes("ui('Advanced comparison settings')") && page.includes("ui('Importance weight')") && page.includes("ui('Impact score')"),
  'Technical comparison controls remain available behind advanced details');
check(page.includes('v3.49.214 LEGACY CREATE-FORM JSX') && page.includes("Planning review title -> reviewDraft.title") && page.includes("Tradeoffs for this option -> objective_type"),
  'Legacy technical creation form is retained in commented source');

for (const required of [
  'optimization_domain: reviewDraft.optimization_domain',
  'owner_user_id: reviewDraft.owner_user_id || null',
  'due_at: reviewDraft.due_at || null',
  'next_action: reviewDraft.next_action.trim() || null',
  'objective_type: objective.objective_type',
  'objective_domain: objective.objective_domain',
  'weight: Number(objective.weight || 1)',
  'target_direction: objective.target_direction',
  'aggregate_score: option.aggregate_score === \'\' ? null : Number(option.aggregate_score)',
  'projected_outcome: option.projected_outcome.trim() ? { summary: option.projected_outcome.trim() } : {}',
  'impact_direction: tradeoff.impact_direction',
  'impact_score: tradeoff.impact_score === \'\' ? null : Number(tradeoff.impact_score)'
]) check(page.includes(required), `Existing create payload remains wired: ${required}`);

check(page.includes("sla_risk: 'Service or availability risk'") && page.includes("working_capital: 'Cash tied up in stock'") && page.includes("positive: 'Better'") && page.includes("negative: 'Worse'"),
  'Technical enum values keep their stored codes but use human-readable labels');
check(css.includes('.cross-domain-create-guide') && css.includes('.cross-domain-create-step') && css.includes('.cross-domain-builder-card--guided') && css.includes('.cross-domain-create-footer'),
  'Guided creation layout has bounded responsive styling');
for (const key of [
  'Create decision comparison', 'What is the problem?', 'What matters when making this decision?',
  'What solutions are you considering?', 'Possible downsides or compromises', 'Advanced comparison settings'
]) check(translations.includes(`["${key}"`) || translations.includes(`['${key}'`), `Guided UI text is catalog-backed: ${key}`);

for (const prohibited of ['/purchase-orders', '/stock/movements', '/shipments/dispatch', '/reservations/']) {
  check(!page.includes(prohibited), `No direct operational execution path added: ${prohibited}`);
}

check(pkg.scripts['check:inventory-testing-hardening-v349215'] === 'node scripts/check-inventory-testing-hardening-v349215.mjs',
  'v3.49.215 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349213 && npm run check:inventory-testing-hardening-v349215'),
    `v3.49.215 frontend guard follows the current frontend baseline in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.215 Cross-Domain guided decision creation guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
