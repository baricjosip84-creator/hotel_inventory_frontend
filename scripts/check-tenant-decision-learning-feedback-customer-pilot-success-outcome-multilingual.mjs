import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/DecisionLearningFeedbackPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedNumber } from '../i18n/formatters';"
]) if (!pageSource.includes(required)) fail(`Decision Learning Feedback multilingual wiring missing: ${required}`);
if (!process.exitCode) pass('Customer pilot success/outcome slice uses the shared tenant translation and locale runtime.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of pageSource.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Decision Learning Feedback ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Decision Learning Feedback currently has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamicPresentationKeys = [
  'ready for manual customer pilot success tracking',
  'manual customer pilot success tracking blocked',
  'ready for manual customer pilot outcome review',
  'manual customer pilot outcome review blocked',
  'ready for manual customer pilot launch decision',
  'ready',
  'blocked'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Customer pilot success/outcome dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} customer pilot success/outcome canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop customer pilot success criteria')}",
  "{ui('Manual success-tracking layer for customer pilots. It defines pilot baselines, exit requirements, and owner focus without launching pilots, training models, or mutating operational state.')}",
  '<LocalizedLearningStatCard label="Tracking decision"',
  '<LocalizedLearningStatCard label="Criteria score"',
  '<LocalizedLearningStatCard label="Ready criteria"',
  '<LocalizedLearningStatCard label="Blocked criteria"',
  "{ui('Success owner:')}",
  "{ui('Exit requirements:')}",
  "ui('Manual customer pilot success criteria remain advisory only.')",
  "{ui('No customer pilot success criteria are available yet.')}",
  "{ui('Closed-loop customer pilot outcome review')}",
  "{ui('Manual pilot outcome-review layer. It compares captured pilot evidence against baselines and prepares an exit recommendation without expanding customers, training models, updating policies, or mutating operational state.')}",
  '<LocalizedLearningStatCard label="Review decision"',
  '<LocalizedLearningStatCard label="Outcome score"',
  '<LocalizedLearningStatCard label="Validated outcomes"',
  '<LocalizedLearningStatCard label="Open pressure"',
  "{ui('Outcome review owner:')}",
  "{ui('Manual exit options:')}",
  "ui('Manual customer pilot outcome review remains advisory only.')",
  "{ui('No customer pilot outcome-review checks are available yet.')}",
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized customer pilot success/outcome presentation missing: ${required}`);
if (!process.exitCode) pass('Customer pilot success criteria and outcome review presentation use the multilingual contract.');

const successStart = pageSource.indexOf('function ClosedLoopCustomerPilotSuccessCriteria(');
const successEnd = pageSource.indexOf('function ClosedLoopCustomerPilotOutcomeReview(');
const outcomeStart = successEnd;
const outcomeEnd = pageSource.indexOf('function ClosedLoopCustomerPilotExpansionReadiness(');
for (const [name, start, end] of [
  ['customer pilot success criteria', successStart, successEnd],
  ['customer pilot outcome review', outcomeStart, outcomeEnd]
]) {
  if (start < 0 || end <= start) {
    fail(`Unable to isolate the staged ${name} slice.`);
    continue;
  }
  const slice = pageSource.slice(start, end);
  const rawText = slice.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
    return match ? [match[1].trim()] : [];
  }).filter(Boolean);
  if (rawText.length) fail(`Raw JSX presentation remains in ${name} slice: ${rawText.join(' | ')}`);
  else pass(`${name} slice has no remaining raw JSX presentation text.`);
}

for (const required of [
  "formatLabel(success?.recommended_success_owner || 'customer_success_owner')",
  "formatLabel(success?.next_success_focus || 'track_customer_pilot_outcomes_against_manual_success_criteria')",
  'success?.success_criteria_note || ui(',
  'blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)',
  'exitRequirements.map(formatLabel).join(',
  '<td>{formatLabel(criterion.criterion_label || criterion.criterion_key)}</td>',
  '<td>{formatLabel(criterion.pilot_success_evidence)}</td>',
  '<td>{formatLabel(criterion.manual_success_task)}</td>',
  "formatLabel(review?.recommended_outcome_review_owner || 'customer_success_owner')",
  "formatLabel(review?.next_outcome_review_focus || 'conduct_manual_customer_pilot_outcome_review_and_exit_recommendation')",
  'review?.outcome_review_note || ui(',
  'exitOptions.map(formatLabel).join(',
  '<td>{formatLabel(check.check_label || check.check_key)}</td>',
  '<td>{formatLabel(check.review_evidence)}</td>',
  '<td>{formatLabel(check.manual_review_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  "ui(formatLabel(success?.recommended_success_owner",
  "ui(formatLabel(success?.next_success_focus",
  'ui(success?.success_criteria_note',
  'ui(formatLabel(criterion.criterion_label || criterion.criterion_key))',
  'ui(formatLabel(criterion.pilot_success_evidence))',
  'ui(formatLabel(criterion.manual_success_task))',
  "ui(formatLabel(review?.recommended_outcome_review_owner",
  "ui(formatLabel(review?.next_outcome_review_focus",
  'ui(review?.outcome_review_note',
  'ui(formatLabel(check.review_evidence))',
  'ui(formatLabel(check.manual_review_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend customer-pilot success/outcome data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend criterion/check labels, owners, blockers, evidence references, tasks, focus values, exit options/requirements, and notes remain raw.');

if (!pageSource.includes("ui('Loading feedback evidence…')")) fail('Completed-page sentinel must confirm the EvidenceTable saved-records description is localized.');
else pass('Decision Learning Feedback staged boundary is complete through the final EvidenceTable presentation.');

for (const required of [
  "path: 'decision-learning-feedback'",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ',
  '<DecisionLearningFeedbackPage />'
]) if (!routerSource.includes(required)) fail(`Decision Learning Feedback router/permission contract changed: ${required}`);
if (!process.exitCode) pass('Decision Learning Feedback route and DECISION_INTELLIGENCE_READ permission contract remain unchanged.');

for (const required of [
  "continuous-learning-summary?${params.toString()}",
  "apiRequest<Record<string, unknown>>(`/decision-intelligence-feedback/${mode}`, {",
  "method: 'POST'"
]) if (!pageSource.includes(required)) fail(`Existing Decision Learning Feedback request contract missing: ${required}`);
if (!process.exitCode) pass('Existing summary read and governed feedback-evidence POST contracts remain unchanged.');

if (!process.exitCode) pass('Tenant Decision Learning Feedback Customer Pilot Success & Outcome multilingual gate passed.');
