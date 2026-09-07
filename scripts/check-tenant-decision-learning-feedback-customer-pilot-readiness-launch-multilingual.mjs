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
if (!process.exitCode) pass('Customer pilot readiness/launch slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual customer pilot review',
  'manual customer pilot blocked',
  'ready for manual customer pilot launch decision',
  'manual customer pilot launch blocked',
  'ready for manual commercial readiness review',
  'ready for manual operational handoff',
  'ready for manual operational acceptance',
  'ready for manual monitoring',
  'ready for manual production surveillance',
  'ready for manual closure review',
  'ready for manual audit retention',
  'ready',
  'blocked'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Customer pilot dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} customer pilot canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop customer pilot readiness')}",
  "{ui('Manual customer pilot readiness layer that connects commercial readiness, operational handoff, acceptance, monitoring, and exception control. It remains advisory and non-autonomous.')}",
  '<LocalizedLearningStatCard label="Pilot decision"',
  '<LocalizedLearningStatCard label="Pilot score"',
  '<LocalizedLearningStatCard label="Ready checks"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Pilot owner:')}",
  "{ui('Next focus:')}",
  "<th>{ui('Check')}</th>",
  "<th>{ui('Status')}</th>",
  "<th>{ui('Current')}</th>",
  "<th>{ui('Required')}</th>",
  "<th>{ui('Evidence')}</th>",
  "<th>{ui('Manual task')}</th>",
  "{ui('No customer pilot readiness checks are available yet.')}",
  "{ui('Closed-loop customer pilot launch control')}",
  "{ui('Manual launch-control layer for customer pilots. It joins pilot readiness, surveillance, resolution, closure, and audit traceability before a human go/no-go decision. It does not launch pilots or execute changes automatically.')}",
  '<LocalizedLearningStatCard label="Launch decision"',
  '<LocalizedLearningStatCard label="Launch score"',
  "{ui('Launch owner:')}",
  "{ui('No customer pilot launch-control checks are available yet.')}",
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized customer pilot presentation missing: ${required}`);
if (!process.exitCode) pass('Customer pilot readiness and launch-control presentation use the multilingual contract.');

const readinessStart = pageSource.indexOf('function ClosedLoopCustomerPilotReadiness(');
const readinessEnd = pageSource.indexOf('function ClosedLoopCustomerPilotLaunchControl(');
const launchStart = readinessEnd;
const launchEnd = pageSource.indexOf('function ClosedLoopCustomerPilotSuccessCriteria(');
for (const [name, start, end] of [
  ['customer pilot readiness', readinessStart, readinessEnd],
  ['customer pilot launch control', launchStart, launchEnd]
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
const protectedSystemFieldsV349188 = ['check_label', 'launch_control_note', 'launch_evidence', 'manual_launch_task', 'manual_pilot_task', 'next_launch_focus', 'next_pilot_focus', 'pilot_evidence', 'pilot_readiness_note', 'recommended_launch_owner', 'recommended_pilot_owner'];
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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Customer Pilot Readiness & Launch multilingual gate passed.');
