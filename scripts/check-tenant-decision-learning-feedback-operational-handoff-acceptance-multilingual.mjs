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
if (!process.exitCode) pass('Operational handoff/acceptance slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual operational handoff',
  'operational handoff blocked',
  'ready for manual acceptance',
  'ready for manual operational acceptance',
  'operational acceptance blocked',
  'manual resolution required',
  'blocked',
  'not loaded'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Operational handoff/acceptance dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} operational handoff/acceptance canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop operational handoff')}",
  "{ui('Backend-generated owner handoff for the manual operational acceptance step after release readiness. It assigns manual owners and next tasks without training, approving, executing, updating policies, or mutating operational state.')}",
  '<LocalizedLearningStatCard label="Handoff decision"',
  '<LocalizedLearningStatCard label="Handoff score"',
  '<LocalizedLearningStatCard label="Ready items"',
  '<LocalizedLearningStatCard label="Blocked items"',
  "label={ui('Owner')}",
  "{ui('Next handoff focus:')}",
  "handoff?.handoff_note || ui('No operational handoff note available yet.')",
  "<th>{ui('Source lane')}</th>",
  "<th>{ui('Manual task')}</th>",
  'ui(formatLabel(item.handoff_status))',
  "{ui('No operational handoff items available yet.')}",
  "{ui('Closed-loop operational acceptance')}",
  "{ui('Backend-generated manual acceptance criteria after operational handoff. This gives the business owner a clear accept/block decision surface without training models, updating policies, executing recommendations, or mutating operational state.')}",
  '<LocalizedLearningStatCard label="Acceptance decision"',
  '<LocalizedLearningStatCard label="Acceptance score"',
  '<LocalizedLearningStatCard label="Accepted criteria"',
  '<LocalizedLearningStatCard label="Blocked criteria"',
  "{ui('Next acceptance focus:')}",
  "acceptance?.acceptance_note || ui('No operational acceptance note available yet.')",
  "<th>{ui('Criterion')}</th>",
  "<th>{ui('Manual acceptance task')}</th>",
  'ui(formatLabel(criterion.criterion_status))',
  "{ui('No operational acceptance criteria available yet.')}"
]) if (!pageSource.includes(required)) fail(`Localized operational handoff/acceptance presentation missing: ${required}`);
if (!process.exitCode) pass('Operational handoff and operational acceptance presentation use the multilingual contract.');

const handoffStart = pageSource.indexOf('function ClosedLoopOperationalHandoff(');
const handoffEnd = pageSource.indexOf('function ClosedLoopOperationalAcceptance(');
const acceptanceStart = handoffEnd;
const acceptanceEnd = pageSource.indexOf('function ClosedLoopMonitoringReadiness(');
for (const [name, start, end] of [
  ['operational handoff', handoffStart, handoffEnd],
  ['operational acceptance', acceptanceStart, acceptanceEnd]
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
  "value={formatLabel(handoff?.recommended_handoff_owner || 'decision_governance_owner')}",
  "formatLabel(handoff?.next_handoff_focus || 'complete_manual_operational_acceptance')",
  '<td>{formatLabel(item.source_lane)}</td>',
  '<td>{formatLabel(item.owner_role)}</td>',
  '<td>{formatLabel(item.manual_task)}</td>',
  '<td>{formatLabel(item.blocking_reason)}</td>',
  "value={formatLabel(acceptance?.recommended_acceptance_owner || 'decision_governance_owner')}",
  "formatLabel(acceptance?.next_acceptance_focus || 'record_manual_operational_acceptance')",
  '<td>{formatLabel(criterion.criterion_label || criterion.criterion_key)}</td>',
  '<td>{formatLabel(criterion.manual_acceptance_task)}</td>',
  '<td>{formatLabel(criterion.blocking_reason)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(handoff?.recommended_handoff_owner',
  'ui(formatLabel(handoff?.next_handoff_focus',
  'ui(formatLabel(item.source_lane))',
  'ui(formatLabel(item.owner_role))',
  'ui(formatLabel(item.manual_task))',
  'ui(formatLabel(item.blocking_reason))',
  'ui(formatLabel(acceptance?.recommended_acceptance_owner',
  'ui(formatLabel(acceptance?.next_acceptance_focus',
  'ui(formatLabel(criterion.criterion_label || criterion.criterion_key))',
  'ui(formatLabel(criterion.manual_acceptance_task))',
  'ui(formatLabel(criterion.blocking_reason))'
]) if (pageSource.includes(forbidden)) fail(`Backend operational handoff/acceptance data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend handoff/acceptance labels, owners, focus values, tasks, blockers, and criterion labels remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Operational Handoff & Acceptance multilingual gate passed.');
