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


// v3.49.188: backend-owned governance vocabulary must use protected presentation helpers,
// while arbitrary tenant/business text remains outside blind ui()/formatLabel() translation.
const protectedSystemFieldsV349188 = ['activation_owner', 'check_label', 'compliance_owner', 'governance_owner', 'manual_rollback_task', 'manual_runbook_task', 'next_rollback_focus', 'next_runbook_focus', 'operations_owner', 'recommended_rollback_mode', 'recommended_runbook_mode', 'rollback_evidence', 'rollback_note', 'rollback_owner', 'runbook_evidence', 'runbook_note', 'step_label'];
const protectedHelpersV349188 = ['learningOwnedSystemText', 'learningOwnerLabel', 'learningCheckLabel', 'learningDomainLabel', 'learningEvidenceTypeLabel'];
for (const helper of protectedHelpersV349188) {
  if (!pageSource.includes(`${helper}(`)) fail(`v3.49.188 Learning Feedback protected helper missing: ${helper}`);
}
for (const field of protectedSystemFieldsV349188) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:learningOwnedSystemText|learningOwnerLabel|learningCheckLabel|learningDomainLabel|learningEvidenceTypeLabel|learningActionRationale)\\([^\\n]*${escaped}`);
  if (!pattern.test(pageSource)) fail(`Backend-owned Learning Feedback field is not protected by the v3.49.188 presentation boundary: ${field}`);
}
for (const forbidden of [
  'ui(formatLabel(check.check_label',
  'ui(formatLabel(blocker))',
  'ui(formatLabel(item.learning_domain))'
]) if (pageSource.includes(forbidden)) fail(`Learning Feedback must not blindly translate backend identifiers: ${forbidden}`);
if (!process.exitCode) pass('Backend-owned Learning Feedback governance text uses protected localized helpers while arbitrary business text remains outside blind translation.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Activation Runbook & Rollback Plan multilingual gate passed.');
