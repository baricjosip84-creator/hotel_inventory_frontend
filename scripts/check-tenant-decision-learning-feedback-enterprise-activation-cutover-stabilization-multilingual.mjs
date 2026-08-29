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
if (!process.exitCode) pass('Enterprise activation cutover/stabilization slice uses the shared tenant translation and locale runtime.');

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

const requiredCatalogKeys = [
  'Closed-loop enterprise activation cutover readiness',
  'Cutover decision',
  'Cutover score',
  'Cutover owner:',
  'Recommended cutover mode:',
  'Manual cutover options:',
  'ready for manual enterprise activation cutover signoff',
  'enterprise activation cutover blocked',
  'Closed-loop enterprise activation stabilization plan',
  'Stabilization decision',
  'Stabilization score',
  'Stabilization owner:',
  'Recommended stabilization mode:',
  'Customer success owner:',
  'Manual stabilization options:',
  'ready for manual post cutover stabilization signoff',
  'enterprise activation stabilization blocked',
  'Ready checks',
  'Blocked checks',
  'ready',
  'blocked'
];
const missingRequired = requiredCatalogKeys.filter((key) => !unique.has(key));
if (missingRequired.length) fail(`Enterprise activation cutover/stabilization display keys missing translations: ${missingRequired.join(' | ')}`);
else pass(`${requiredCatalogKeys.length} enterprise activation cutover/stabilization presentation keys are catalog-backed.`);

for (const required of [
  'function ClosedLoopEnterpriseActivationCutoverReadiness(',
  'const { locale, ui } = useAppTranslation();',
  "{ui('Closed-loop enterprise activation cutover readiness')}",
  "{ui('Manual cutover readiness layer for enterprise activation. It ties activation plan, runbook, rollback path, monitoring readiness, audit traceability, and compliance attestation into one cutover signoff surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Cutover decision"',
  '<LocalizedLearningStatCard label="Cutover score"',
  '<LocalizedLearningStatCard label="Ready checks"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Cutover owner:')}",
  "{ui('Recommended cutover mode:')}",
  "readiness?.cutover_note || ui('Manual enterprise activation cutover readiness remains advisory only.')",
  "{ui('No enterprise activation cutover blockers are currently reported.')}",
  "{ui('Manual cutover options:')}",
  "{ui('No enterprise activation cutover checks are available yet.')}",
  'function ClosedLoopEnterpriseActivationStabilizationPlan(',
  "{ui('Closed-loop enterprise activation stabilization plan')}",
  "{ui('Manual post-cutover stabilization layer for enterprise activation. It ties cutover readiness, monitoring, surveillance, exception handling, and closure evidence into one stabilization signoff surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Stabilization decision"',
  '<LocalizedLearningStatCard label="Stabilization score"',
  "{ui('Stabilization owner:')}",
  "{ui('Recommended stabilization mode:')}",
  "{ui('Cadence:')}",
  "{ui('Customer success owner:')}",
  "plan?.stabilization_note || ui('Manual enterprise activation stabilization remains advisory only.')",
  "{ui('No enterprise activation stabilization blockers are currently reported.')}",
  "{ui('Manual stabilization options:')}",
  "{ui('No enterprise activation stabilization checks are available yet.')}",
  'ui(formatLabel(check.check_status))',
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized enterprise activation cutover/stabilization presentation missing: ${required}`);
if (!process.exitCode) pass('Enterprise activation cutover readiness and stabilization plan use the multilingual presentation contract.');

const cutoverStart = pageSource.indexOf('function ClosedLoopEnterpriseActivationCutoverReadiness(');
const cutoverEnd = pageSource.indexOf('function ClosedLoopEnterpriseActivationStabilizationPlan(');
const stabilizationStart = cutoverEnd;
const stabilizationEnd = pageSource.indexOf('function FeedbackReviewBoard(', stabilizationStart);
for (const [name, start, end] of [
  ['enterprise activation cutover readiness', cutoverStart, cutoverEnd],
  ['enterprise activation stabilization plan', stabilizationStart, stabilizationEnd]
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
  "readiness?.recommended_cutover_owner || 'enterprise_activation_owner'",
  "formatLabel(readiness?.next_cutover_focus || 'perform_manual_enterprise_activation_cutover_signoff')",
  "formatLabel(policy.recommended_cutover_mode || 'pause_cutover_until_manual_readiness_blockers_are_resolved')",
  "formatLabel(policy.activation_owner || 'enterprise_activation_owner')",
  "formatLabel(policy.operations_owner || 'operations_owner')",
  "formatLabel(policy.governance_owner || 'governance_owner')",
  'readiness?.cutover_note || ui(',
  'blockers.map(formatLabel).join(',
  'options.map(formatLabel).join(',
  '<td>{check.check_label || formatLabel(check.check_key)}</td>',
  '<td>{formatLabel(check.cutover_evidence)}</td>',
  '<td>{formatLabel(check.manual_cutover_task)}</td>',
  "plan?.recommended_stabilization_owner || 'enterprise_activation_owner'",
  "formatLabel(plan?.next_stabilization_focus || 'perform_manual_post_cutover_stabilization_signoff')",
  "formatLabel(policy.recommended_stabilization_mode || 'pause_stabilization_acceptance_until_manual_blockers_are_resolved')",
  "formatLabel(policy.recommended_review_cadence || 'daily_until_blockers_are_resolved')",
  "formatLabel(policy.customer_success_owner || 'customer_success_owner')",
  'plan?.stabilization_note || ui(',
  '<td>{formatLabel(check.stabilization_evidence)}</td>',
  '<td>{formatLabel(check.manual_stabilization_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(readiness?.recommended_cutover_owner',
  'ui(formatLabel(readiness?.next_cutover_focus',
  'ui(formatLabel(policy.recommended_cutover_mode',
  'ui(readiness?.cutover_note',
  'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.cutover_evidence))',
  'ui(formatLabel(check.manual_cutover_task))',
  'ui(formatLabel(plan?.recommended_stabilization_owner',
  'ui(formatLabel(plan?.next_stabilization_focus',
  'ui(formatLabel(policy.recommended_stabilization_mode',
  'ui(formatLabel(policy.recommended_review_cadence',
  'ui(formatLabel(policy.customer_success_owner',
  'ui(plan?.stabilization_note',
  'ui(formatLabel(check.stabilization_evidence))',
  'ui(formatLabel(check.manual_stabilization_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend activation cutover/stabilization data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend check labels, owners, modes, cadence, blockers, decision options, evidence, tasks, focus values, notes, and composite business values remain raw.');

if (!pageSource.includes("ui('The latest saved records in this category.')")) fail('Completed-page sentinel must confirm the EvidenceTable saved-records description is localized.');
else pass('Decision Learning Feedback staged boundary is complete through the final EvidenceTable presentation.');

for (const required of [
  "path: 'decision-learning-feedback'",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ',
  '<DecisionLearningFeedbackPage />'
]) if (!routerSource.includes(required)) fail(`Decision Learning Feedback router/permission contract changed: ${required}`);
if (!process.exitCode) pass('Decision Learning Feedback route and DECISION_INTELLIGENCE_READ permission contract remain unchanged.');

for (const required of [
  "apiRequest<ContinuousLearningSummary>('/decision-intelligence/continuous-learning-summary?limit=25')",
  "apiRequest<Record<string, unknown>>(`/decision-intelligence-feedback/${mode}`, {",
  "method: 'POST'"
]) if (!pageSource.includes(required)) fail(`Existing Decision Learning Feedback request contract missing: ${required}`);
if (!process.exitCode) pass('Existing summary read and governed feedback-evidence POST contracts remain unchanged.');

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Activation Cutover Readiness & Stabilization Plan multilingual gate passed.');
