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
if (!process.exitCode) pass('Commercial/governance slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual governance review',
  'blocked from closed loop escalation',
  'ready for manual commercial readiness review',
  'manual commercial readiness blocked',
  'ready for manual compliance attestation',
  'ready for manual audit retention',
  'ready for manual closed loop certification',
  'ready for manual release go no go',
  'ready for manual monitoring',
  'ready for manual production surveillance',
  'passed',
  'blocked',
  'ready',
  'not loaded'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Commercial/governance dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} commercial/governance canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop commercial readiness packet')}",
  "{ui('Final manual commercial-readiness packet tying together compliance attestation, audit ledger, certification, governance gate, and production surveillance. It stays advisory and non-autonomous.')}",
  '<LocalizedLearningStatCard label="Commercial decision"',
  '<LocalizedLearningStatCard label="Readiness score"',
  '<LocalizedLearningStatCard label="Ready checks"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Executive owner:')}",
  "<th>{ui('Status')}</th>",
  'ui(formatLabel(check.check_status))',
  'formatCommercialDecisionValue(check.current_value)',
  'formatCommercialDecisionValue(check.required_value)',
  "{ui('No commercial readiness checks are available yet.')}",
  "{ui('Closed-loop governance gate')}",
  "{ui('Backend-generated go/no-go gate for manual closed-loop escalation. It blocks escalation when evidence coverage, review pressure, drift pressure, high-priority actions, or roadmap readiness are not acceptable. It does not train models, update policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Gate decision"',
  '<LocalizedLearningStatCard label="Gate score"',
  '<LocalizedLearningStatCard label="Passed checks"',
  "label={ui('Next gate focus')}",
  "{ui('Manual resolution required:')}",
  "{ui('No manual gate blockers reported by the backend.')}",
  "<th>{ui('Threshold')}</th>",
  "<th>{ui('Manual remediation')}</th>",
  'ui(formatLabel(check.status))',
  'formatLocalizedNumber(check.current_value, locale)',
  'formatLocalizedNumber(check.threshold, locale)',
  "{ui('No governance gate checks available yet.')}"
]) if (!pageSource.includes(required)) fail(`Localized commercial/governance presentation missing: ${required}`);
if (!process.exitCode) pass('Commercial readiness packet and governance gate presentation use the multilingual contract.');

const commercialStart = pageSource.indexOf('function ClosedLoopCommercialReadinessPacket(');
const commercialEnd = pageSource.indexOf('function ClosedLoopGovernanceGate(');
const governanceStart = commercialEnd;
const governanceEnd = pageSource.indexOf('function ClosedLoopSignoffPacket(');
for (const [name, start, end] of [
  ['commercial readiness packet', commercialStart, commercialEnd],
  ['governance gate', governanceStart, governanceEnd]
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
const protectedSystemFieldsV349188 = ['check_label', 'commercial_readiness_note', 'manual_readiness_task', 'next_commercial_readiness_focus', 'next_gate_focus', 'packet_evidence', 'recommended_executive_owner', 'remediation'];
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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Commercial Readiness & Governance multilingual gate passed.');
