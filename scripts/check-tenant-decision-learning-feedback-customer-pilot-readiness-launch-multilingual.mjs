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
  "ui('Manual customer pilot readiness remains advisory only.')",
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
  "ui('Manual customer pilot launch control remains advisory only.')",
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

for (const required of [
  "formatLabel(pilot?.recommended_pilot_owner || 'customer_success_owner')",
  "formatLabel(pilot?.next_pilot_focus || 'record_manual_customer_pilot_go_no_go_decision')",
  'pilot?.pilot_readiness_note || ui(',
  'blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)',
  '<td>{formatLabel(check.check_label || check.check_key)}</td>',
  '<td>{formatLabel(check.pilot_evidence)}</td>',
  '<td>{formatLabel(check.manual_pilot_task)}</td>',
  "formatLabel(launch?.recommended_launch_owner || 'customer_success_owner')",
  "formatLabel(launch?.next_launch_focus || 'record_manual_customer_pilot_launch_go_no_go_decision')",
  'launch?.launch_control_note || ui(',
  '<td>{formatLabel(check.launch_evidence)}</td>',
  '<td>{formatLabel(check.manual_launch_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  "ui(formatLabel(pilot?.recommended_pilot_owner",
  "ui(formatLabel(pilot?.next_pilot_focus",
  'ui(pilot?.pilot_readiness_note',
  'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.pilot_evidence))',
  'ui(formatLabel(check.manual_pilot_task))',
  "ui(formatLabel(launch?.recommended_launch_owner",
  "ui(formatLabel(launch?.next_launch_focus",
  'ui(launch?.launch_control_note',
  'ui(formatLabel(check.launch_evidence))',
  'ui(formatLabel(check.manual_launch_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend customer-pilot data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend check labels, owners, blockers, evidence references, tasks, focus values, and notes remain raw.');

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
