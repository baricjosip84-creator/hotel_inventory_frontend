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


// v3.49.188: backend-owned governance vocabulary must use protected presentation helpers,
// while arbitrary tenant/business text remains outside blind ui()/formatLabel() translation.
const protectedSystemFieldsV349188 = ['activation_owner', 'check_label', 'customer_success_owner', 'cutover_evidence', 'cutover_note', 'governance_owner', 'manual_cutover_task', 'manual_stabilization_task', 'next_cutover_focus', 'next_stabilization_focus', 'operations_owner', 'recommended_cutover_mode', 'recommended_review_cadence', 'recommended_stabilization_mode', 'stabilization_evidence', 'stabilization_note'];
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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Activation Cutover Readiness & Stabilization Plan multilingual gate passed.');
