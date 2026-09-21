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

check(page.includes('const [createStep, setCreateStep] = useState(1);'),
  'Cross-Domain creation has explicit wizard-step state');
for (const step of [1, 2, 3, 4]) {
  check(page.includes(`createStep === ${step}`), `Wizard renders step ${step} independently`);
}
check(page.includes("ui('Start with the problem')") && page.includes("ui('Tell the app what decision the company needs to make. Do not describe the solution yet.')"),
  'Step 1 explains that the user starts with the business problem, not a solution');
check(page.includes("ui('What must a good solution achieve?')") && page.includes("ui('These are the things management will use to judge the possible solutions. This page is most useful when two important things compete with each other.')"),
  'Step 2 explains why priorities exist');
check(page.includes("ui('What could the company actually do?')") && page.includes("ui('Add the realistic choices management is considering. You are not choosing one yet. You are only describing the alternatives so they can be compared.')"),
  'Step 3 explains that solutions are alternatives, not actions being executed');
check(page.includes("ui('Check what you are about to save')") && page.includes("ui('This screen is only a summary. Creating the comparison saves these choices for review; it does not carry out any solution.')"),
  'Step 4 provides a plain-language review before creation');
check(page.includes("ui('What happens next?')") && page.includes("ui('The comparison will be saved. You can then open it, compare the solutions, and choose one for review. Nothing is executed automatically.')"),
  'Creation result is explained before the final save action');
check(page.includes("ui('Who is responsible for getting this decision finished?')") && page.includes('data?.owner_candidates || []'),
  'Owner selection remains backed by authoritative eligible owner candidates');
check(page.includes("ui('How the app classifies this priority')") && page.includes("ui('How the app classifies this downside')") && page.includes("ui('Optional scoring')"),
  'Technical comparison controls remain available but are moved behind optional details');
check(page.includes('SHOW_V349215_LEGACY_CREATE_UI = false') && page.includes('SHOW_V349215_LEGACY_CREATE_UI && showCreate && canGovern'),
  'v3.49.215 all-at-once creation UI remains in source but is not rendered');
check(page.includes('hasEvidence ? <>') && page.includes('!hasEvidence && !showCreate'),
  'Run selection and filters are hidden until there is evidence and a first-use state is shown instead');
check(page.includes("disabled={!hasEvidence}") && page.includes("ui('Create a decision comparison first.')"),
  'Plan/review tabs are disabled before a comparison exists');

for (const required of [
  'optimization_domain: reviewDraft.optimization_domain',
  'owner_user_id: reviewDraft.owner_user_id || null',
  'due_at: reviewDraft.due_at || null',
  'next_action: reviewDraft.next_action.trim() || null',
  'objective_type: objective.objective_type',
  'objective_domain: objective.objective_domain',
  'weight: Number(objective.weight || 1)',
  'target_direction: objective.target_direction',
  "aggregate_score: option.aggregate_score === '' ? null : Number(option.aggregate_score)",
  'projected_outcome: option.projected_outcome.trim() ? { summary: option.projected_outcome.trim() } : {}',
  'impact_direction: tradeoff.impact_direction',
  "impact_score: tradeoff.impact_score === '' ? null : Number(tradeoff.impact_score)"
]) check(page.includes(required), `Existing create payload remains wired: ${required}`);

for (const key of [
  'Decision comparison', 'Start with the problem', 'What must a good solution achieve?',
  'What could the company actually do?', 'Check what you are about to save',
  'Save decision comparison', 'No decision comparisons yet', 'Create a decision comparison first.'
]) check(translations.includes(`[\"${key}\"`), `Wizard UI text is catalog-backed: ${key}`);

check(css.includes('.cross-domain-wizard-progress') && css.includes('.cross-domain-wizard-step') && css.includes('.cross-domain-review-box') && css.includes('.cross-domain-first-use'),
  'Wizard and first-use states have bounded responsive styling');

for (const prohibited of ['/purchase-orders', '/stock/movements', '/shipments/dispatch', '/reservations/']) {
  check(!page.includes(prohibited), `No direct operational execution path added: ${prohibited}`);
}

check(pkg.scripts['check:inventory-testing-hardening-v349216'] === 'node scripts/check-inventory-testing-hardening-v349216.mjs',
  'v3.49.216 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349215 && npm run check:inventory-testing-hardening-v349216'),
    `v3.49.216 frontend guard follows v3.49.215 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.216 Cross-Domain step-by-step decision wizard guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
