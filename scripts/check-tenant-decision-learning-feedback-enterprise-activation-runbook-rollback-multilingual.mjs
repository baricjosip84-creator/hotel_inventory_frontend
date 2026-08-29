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
if (!process.exitCode) pass('Enterprise activation runbook/rollback slice uses the shared tenant translation and locale runtime.');

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
  'Closed-loop enterprise activation runbook',
  'Runbook decision',
  'Runbook score',
  'Ready steps',
  'Blocked steps',
  'Runbook owner:',
  'Recommended runbook mode:',
  'Operations owner:',
  'Compliance owner:',
  'Manual runbook options:',
  'Step',
  'ready for manual enterprise activation runbook signoff',
  'enterprise activation runbook blocked',
  'Closed-loop enterprise activation rollback plan',
  'Rollback decision',
  'Rollback score',
  'Recommended rollback mode:',
  'Manual rollback options:',
  'ready for manual activation rollback signoff',
  'enterprise activation rollback plan blocked',
  'ready',
  'blocked'
];
const missingRequired = requiredCatalogKeys.filter((key) => !unique.has(key));
if (missingRequired.length) fail(`Enterprise activation runbook/rollback display keys missing translations: ${missingRequired.join(' | ')}`);
else pass(`${requiredCatalogKeys.length} enterprise activation runbook/rollback presentation keys are catalog-backed.`);

for (const required of [
  'function ClosedLoopEnterpriseActivationRunbook(',
  'const { locale, ui } = useAppTranslation();',
  "{ui('Closed-loop enterprise activation runbook')}",
  "{ui('Manual activation runbook layer for final enterprise activation readiness. It ties activation planning, tenant wave controls, surveillance, audit traceability, and compliance attestation into one human signoff surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Runbook decision"',
  '<LocalizedLearningStatCard label="Runbook score"',
  '<LocalizedLearningStatCard label="Ready steps"',
  '<LocalizedLearningStatCard label="Blocked steps"',
  "{ui('Runbook owner:')}",
  "{ui('Recommended runbook mode:')}",
  "{ui('Operations owner:')}",
  "{ui('Compliance owner:')}",
  "runbook?.runbook_note || ui('Manual enterprise activation runbook remains advisory only.')",
  "{ui('No enterprise activation runbook blockers are currently reported.')}",
  "{ui('Manual runbook options:')}",
  "{ui('No enterprise activation runbook steps are available yet.')}",
  'function ClosedLoopEnterpriseActivationRollbackPlan(',
  "{ui('Closed-loop enterprise activation rollback plan')}",
  "{ui('Manual rollback readiness layer for enterprise activation. It confirms activation runbook clearance, tenant wave rollback ownership, exception closure, resolution readiness, and surveillance triggers before any activation signoff. It does not disable customers, roll back tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Rollback decision"',
  '<LocalizedLearningStatCard label="Rollback score"',
  '<LocalizedLearningStatCard label="Ready checks"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Rollback owner:')}",
  "{ui('Recommended rollback mode:')}",
  "plan?.rollback_note || ui('Manual activation rollback plan remains advisory only.')",
  "{ui('No enterprise activation rollback blockers are currently reported.')}",
  "{ui('Manual rollback options:')}",
  "{ui('No enterprise activation rollback checks are available yet.')}",
  'ui(formatLabel(step.step_status))',
  'ui(formatLabel(check.check_status))',
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized enterprise activation runbook/rollback presentation missing: ${required}`);
if (!process.exitCode) pass('Enterprise activation runbook and rollback plan use the multilingual presentation contract.');

const runbookStart = pageSource.indexOf('function ClosedLoopEnterpriseActivationRunbook(');
const runbookEnd = pageSource.indexOf('function ClosedLoopEnterpriseActivationRollbackPlan(');
const rollbackStart = runbookEnd;
const rollbackEnd = pageSource.indexOf('function ClosedLoopEnterpriseActivationCutoverReadiness(');
for (const [name, start, end] of [
  ['enterprise activation runbook', runbookStart, runbookEnd],
  ['enterprise activation rollback plan', rollbackStart, rollbackEnd]
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
  "runbook?.recommended_runbook_owner || 'enterprise_activation_owner'",
  "formatLabel(runbook?.next_runbook_focus || 'perform_manual_activation_runbook_signoff')",
  "formatLabel(policy.recommended_runbook_mode || 'pause_activation_runbook_until_manual_remediation')",
  "formatLabel(policy.operations_owner || 'operations_owner')",
  "formatLabel(policy.compliance_owner || 'compliance_owner')",
  "formatLabel(policy.rollback_owner || 'enterprise_rollout_owner')",
  'runbook?.runbook_note || ui(',
  'blockers.map(formatLabel).join(',
  'options.map(formatLabel).join(',
  '<td>{step.step_label || formatLabel(step.step_key)}</td>',
  '<td>{formatLabel(step.runbook_evidence)}</td>',
  '<td>{formatLabel(step.manual_runbook_task)}</td>',
  "plan?.recommended_rollback_owner || 'enterprise_rollout_owner'",
  "formatLabel(plan?.next_rollback_focus || 'perform_manual_activation_rollback_signoff')",
  "formatLabel(policy.recommended_rollback_mode || 'pause_activation_until_manual_rollback_path_is_ready')",
  "formatLabel(policy.activation_owner || 'enterprise_activation_owner')",
  "formatLabel(policy.governance_owner || 'governance_owner')",
  'plan?.rollback_note || ui(',
  '<td>{check.check_label || formatLabel(check.check_key)}</td>',
  '<td>{formatLabel(check.rollback_evidence)}</td>',
  '<td>{formatLabel(check.manual_rollback_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(runbook?.recommended_runbook_owner',
  'ui(formatLabel(runbook?.next_runbook_focus',
  'ui(formatLabel(policy.recommended_runbook_mode',
  'ui(formatLabel(policy.operations_owner',
  'ui(formatLabel(policy.compliance_owner',
  'ui(formatLabel(policy.rollback_owner',
  'ui(runbook?.runbook_note',
  'ui(formatLabel(step.step_label || step.step_key))',
  'ui(formatLabel(step.runbook_evidence))',
  'ui(formatLabel(step.manual_runbook_task))',
  'ui(formatLabel(plan?.recommended_rollback_owner',
  'ui(formatLabel(plan?.next_rollback_focus',
  'ui(formatLabel(policy.recommended_rollback_mode',
  'ui(formatLabel(policy.activation_owner',
  'ui(formatLabel(policy.governance_owner',
  'ui(plan?.rollback_note',
  'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.rollback_evidence))',
  'ui(formatLabel(check.manual_rollback_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend activation runbook/rollback data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend step/check labels, owners, modes, blockers, decision options, evidence, tasks, focus values, notes, and composite business values remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Activation Runbook & Rollback Plan multilingual gate passed.');
