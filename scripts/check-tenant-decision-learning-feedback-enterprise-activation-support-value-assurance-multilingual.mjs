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
if (!process.exitCode) pass('Enterprise activation support/value-assurance slice uses the shared tenant translation and locale runtime.');

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
  'Closed-loop enterprise activation support readiness',
  'Manual support-transition layer for enterprise activation. It ties stabilization, monitoring, surveillance, exception handling, resolution planning, and operational handoff into one support readiness surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.',
  'Support decision',
  'Support score',
  'Support owner:',
  'Recommended support mode:',
  'Review cadence:',
  'Manual enterprise activation support readiness remains advisory only.',
  'No enterprise activation support transition blockers are currently reported.',
  'Manual support transition options:',
  'No enterprise activation support readiness checks are available yet.',
  'ready for manual support transition signoff',
  'enterprise activation support transition blocked',
  'Closed-loop enterprise activation value assurance',
  'Manual value-assurance layer for enterprise activation. It checks support transition, evidence coverage, outcome quality, forecast calibration, policy effectiveness, and optimization value before any enterprise value claims are made. It does not publish claims, enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.',
  'Value decision',
  'Value score',
  'Positive outcomes',
  'Negative outcomes',
  'Value assurance owner:',
  'Recommended value claim mode:',
  'Manual enterprise activation value assurance remains advisory only.',
  'No enterprise activation value assurance blockers are currently reported.',
  'Manual value assurance options:',
  'No enterprise activation value assurance checks are available yet.',
  'ready for manual enterprise value assurance signoff',
  'conditional enterprise value assurance review required',
  'enterprise activation value assurance blocked',
  'Ready checks',
  'Blocked checks',
  'ready',
  'blocked'
];
const missingRequired = requiredCatalogKeys.filter((key) => !unique.has(key));
if (missingRequired.length) fail(`Enterprise activation support/value-assurance display keys missing translations: ${missingRequired.join(' | ')}`);
else pass(`${requiredCatalogKeys.length} enterprise activation support/value-assurance presentation keys are catalog-backed.`);

for (const required of [
  'function ClosedLoopEnterpriseActivationSupportReadiness(',
  'const { locale, ui } = useAppTranslation();',
  "{ui('Closed-loop enterprise activation support readiness')}",
  "{ui('Manual support-transition layer for enterprise activation. It ties stabilization, monitoring, surveillance, exception handling, resolution planning, and operational handoff into one support readiness surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Support decision"',
  '<LocalizedLearningStatCard label="Support score"',
  '<LocalizedLearningStatCard label="Ready checks"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Support owner:')}",
  "{ui('Recommended support mode:')}",
  "{ui('Review cadence:')}",
  "{ui('No enterprise activation support transition blockers are currently reported.')}",
  "{ui('Manual support transition options:')}",
  "{ui('No enterprise activation support readiness checks are available yet.')}",
  'function ClosedLoopEnterpriseActivationValueAssurance(',
  "{ui('Closed-loop enterprise activation value assurance')}",
  "{ui('Manual value-assurance layer for enterprise activation. It checks support transition, evidence coverage, outcome quality, forecast calibration, policy effectiveness, and optimization value before any enterprise value claims are made. It does not publish claims, enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Value decision"',
  '<LocalizedLearningStatCard label="Value score"',
  '<LocalizedLearningStatCard label="Positive outcomes"',
  '<LocalizedLearningStatCard label="Negative outcomes"',
  "{ui('Value assurance owner:')}",
  "{ui('Recommended value claim mode:')}",
  "{ui('No enterprise activation value assurance blockers are currently reported.')}",
  "{ui('Manual value assurance options:')}",
  "{ui('No enterprise activation value assurance checks are available yet.')}",
  'ui(formatLabel(check.check_status))',
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized enterprise activation support/value-assurance presentation missing: ${required}`);
if (!process.exitCode) pass('Enterprise activation support readiness and value assurance use the multilingual presentation contract.');

const supportStart = pageSource.indexOf('function ClosedLoopEnterpriseActivationSupportReadiness(');
const supportEnd = pageSource.indexOf('function ClosedLoopEnterpriseActivationValueAssurance(', supportStart);
const valueStart = supportEnd;
const valueEnd = pageSource.indexOf('function ClosedLoopEnterpriseActivationValueRealizationReview(', valueStart);
for (const [name, start, end] of [
  ['enterprise activation support readiness', supportStart, supportEnd],
  ['enterprise activation value assurance', valueStart, valueEnd]
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
const protectedSystemFieldsV349188 = ['check_label', 'manual_support_task', 'manual_value_assurance_task', 'next_support_focus', 'next_value_assurance_focus', 'recommended_support_cadence', 'recommended_support_mode', 'recommended_value_claim_mode', 'recommended_value_review_cadence', 'support_evidence', 'support_readiness_note', 'value_assurance_evidence', 'value_assurance_note'];
const protectedHelpersV349188 = ['learningOwnedSystemText', 'learningCheckLabel', 'learningDomainLabel', 'learningEvidenceTypeLabel'];
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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Activation Support Readiness & Value Assurance multilingual gate passed.');
