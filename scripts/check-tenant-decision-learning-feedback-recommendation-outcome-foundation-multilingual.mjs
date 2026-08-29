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
  "import { formatLocalizedNumber } from '../i18n/formatters';",
  "import { formatLocalizedCurrency, formatLocalizedDateTime } from '../i18n/formatters';"
]) if (!pageSource.includes(required)) fail(`Recommendation Outcome Foundation multilingual wiring missing: ${required}`);
if (!process.exitCode) pass('Recommendation Outcome Foundation uses the shared translation, number, currency, and date-time locale runtime.');

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

const foundationStart = pageSource.indexOf('function RecommendationOutcomeFoundation(');
const foundationEnd = pageSource.indexOf('function EvidenceTable(', foundationStart);
if (foundationStart < 0 || foundationEnd <= foundationStart) fail('Unable to isolate Recommendation Outcome Foundation slice.');
const foundationSlice = foundationStart >= 0 && foundationEnd > foundationStart ? pageSource.slice(foundationStart, foundationEnd) : '';

const statLabels = [...foundationSlice.matchAll(/<LocalizedLearningStatCard label="([^"]+)"/g)].map((match) => match[1]);
const missingStatLabels = [...new Set(statLabels.filter((key) => !unique.has(key)))];
if (missingStatLabels.length) fail(`Recommendation Outcome Foundation stat labels missing translations: ${missingStatLabels.join(' | ')}`);
else pass(`${new Set(statLabels).size} Recommendation Outcome Foundation stat-card labels are catalog-backed.`);

const requiredDynamicDisplayKeys = [
  'unknown', 'phase a closure blocked', 'phase a ready for closure',
  'no recommendation outcomes recorded', 'recommendation outcome traceability incomplete',
  'recommendation lifecycle trace incomplete', 'recommendation outcome classification incomplete',
  'recommendation business impact evidence incomplete', 'recommendation target attainment evidence incomplete',
  'recommendation measurement quality evidence incomplete', 'recommendation attribution evidence incomplete',
  'recommendation outcome evaluation schedule incomplete', 'recommendation outcome evaluation overdue',
  'recommendation outcome evaluation completion incomplete', 'recommendation outcome evaluation evidence incomplete',
  'recommendation outcome audit fingerprint incomplete', 'recommendation outcome fingerprint collision review required',
  'recommendation outcome learning signal incomplete', 'recommendation outcome corrective action incomplete',
  'recommendation outcome learning action escalation required', 'recommendation outcome commercial readiness gate blocked',
  'recommendation outcome portfolio evidence incomplete', 'recommendation outcome review resolution incomplete',
  'recommendation outcome review evidence incomplete', 'recommendation attribution confidence review required',
  'recommendation measurement quality review required', 'recommendation target attainment review required',
  'recommendation outcome review required', 'recommendation outcome foundation controlled',
  'no outcomes', 'corrective action open', 'failure rate review required', 'measurement quality review required',
  'attribution confidence review required', 'commercial value supported', 'portfolio review required',
  'no recommendation portfolio evidence', 'recommendation portfolio review required',
  'recommendation portfolio commercial value supported', 'learning action escalation required',
  'learning action escalation clear', 'assigned', 'completed', 'waived', 'blocked',
  'phase a functionally complete', 'phase a runtime data blocked', 'phase a capabilities complete',
  'runtime outcome data ready', 'runtime outcome data needs completion'
];
const missingDynamic = requiredDynamicDisplayKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Recommendation Outcome Foundation canonical display states missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${requiredDynamicDisplayKeys.length} Recommendation Outcome Foundation canonical display states are catalog-backed.`);

for (const required of [
  "{ui('Phase A · Step A18')}", "{ui('Recommendation Outcome Foundation')}",
  "foundation.completion_definition || ui('Trace recommendations to measured business outcomes.')",
  'const formatFoundationNumber =', 'const formatFoundationPercent =', 'const formatFoundationMoney =', 'const formatFoundationDateTime =',
  "{ui('Recommendation portfolio commercial value evidence')}", "{ui('Learning action escalation evidence')}",
  "{ui('Phase A closure evidence')}", "{ui('Phase A commercial-readiness blockers')}",
  'ui(formatLabel(item.portfolio_posture))', 'ui(formatLabel(item.learning_action_status))',
  'formatFoundationDateTime(item.learning_action_due_at)',
  'ui(formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.closure_status))',
  'ui(formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.implemented_capability_status))',
  'ui(formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.runtime_data_status))',
  "ui('Safety: evidence-only learning, tamper-evident outcome fingerprinting, no autonomous model update, no autonomous recommendation execution, no operational mutation.')"
]) if (!foundationSlice.includes(required)) fail(`Localized Recommendation Outcome Foundation presentation missing: ${required}`);
if (!process.exitCode) pass('Recommendation Outcome Foundation shell, metrics, nested evidence, closure evidence, and safety presentation use the multilingual contract.');

const rawText = foundationSlice.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
  return match ? [match[1].trim()] : [];
}).filter(Boolean);
if (rawText.length) fail(`Raw JSX presentation remains in Recommendation Outcome Foundation slice: ${rawText.join(' | ')}`);
else pass('Recommendation Outcome Foundation slice has no remaining raw JSX presentation text.');

for (const required of [
  'foundation.completion_definition || ui(',
  '<td>{formatLabel(item.recommendation_portfolio_key)}</td>', '<td>{formatLabel(item.learning_domain)}</td>',
  '<td>{formatLabel(item.learning_signal)}</td>', '<td>{formatLabel(item.learning_action_owner)}</td>', '<td>{formatLabel(item.escalation_reason)}</td>',
  "{ui('Next phase:')} {formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.next_phase)}",
  "{ui('Implemented capabilities:')} {(foundation.recommendation_outcome_phase_a_closure_evidence.implemented_capabilities || []).map(formatLabel).join(', ')}",
  "formatLabel(blocker.blocker_label || blocker.blocker_key || 'blocker')",
  "blocker.manual_resolution_task || ui('Resolve evidence gap before Phase A closure.')"
]) if (!foundationSlice.includes(required)) fail(`Expected Recommendation Outcome Foundation backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(foundation.completion_definition', 'ui(formatLabel(item.recommendation_portfolio_key))', 'ui(formatLabel(item.learning_domain))',
  'ui(formatLabel(item.learning_signal))', 'ui(formatLabel(item.learning_action_owner))', 'ui(formatLabel(item.escalation_reason))',
  'ui(formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.next_phase))',
  'ui(formatLabel(blocker.blocker_label', 'ui(blocker.manual_resolution_task)'
]) if (foundationSlice.includes(forbidden)) fail(`Backend Recommendation Outcome Foundation business text must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend completion definitions, portfolio/domain keys, learning signals, owners, reasons, next-phase text, capability identifiers, blocker text, and manual resolution tasks remain raw.');

if (!pageSource.includes("ui('The latest saved records in this category.')")) fail('Completed-page sentinel must confirm the EvidenceTable saved-records description is localized.');
else pass('Decision Learning Feedback staged boundary is complete through the final EvidenceTable presentation.');

for (const required of ["path: 'decision-learning-feedback'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<DecisionLearningFeedbackPage />'])
  if (!routerSource.includes(required)) fail(`Decision Learning Feedback router/permission contract changed: ${required}`);
if (!process.exitCode) pass('Decision Learning Feedback route and DECISION_INTELLIGENCE_READ permission contract remain unchanged.');
for (const required of [
  "apiRequest<ContinuousLearningSummary>('/decision-intelligence/continuous-learning-summary?limit=25')",
  "apiRequest<Record<string, unknown>>(`/decision-intelligence-feedback/${mode}`, {", "method: 'POST'"
]) if (!pageSource.includes(required)) fail(`Existing Decision Learning Feedback request contract missing: ${required}`);
if (!process.exitCode) pass('Existing summary read and governed feedback-evidence POST contracts remain unchanged.');

if (!process.exitCode) pass('Tenant Decision Learning Feedback Recommendation Outcome Foundation multilingual gate passed.');
