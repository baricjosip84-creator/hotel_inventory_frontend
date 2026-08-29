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
if (!process.exitCode) pass('Exception/resolution slice uses the shared tenant translation and locale runtime.');

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
  'manual exception resolution required',
  'no open closed loop exceptions',
  'open',
  'high',
  'medium',
  'manual resolution required',
  'no manual resolution plan required',
  'manual resolution plan required'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Exception/resolution dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} exception/resolution canonical display values are catalog-backed.`);

for (const required of [
  "const { locale, ui } = useAppTranslation();",
  "{ui('Closed-loop exception register')}",
  "{ui('Backend-generated manual exception register for production surveillance and monitoring blockers. It does not train models, update policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Register decision"',
  '<LocalizedLearningStatCard label="Open exceptions"',
  '<LocalizedLearningStatCard label="High severity"',
  '<LocalizedLearningStatCard label="Medium severity"',
  "<th>{ui('Exception')}</th>",
  "<th>{ui('Manual resolution')}</th>",
  'ui(formatLabel(item.severity))',
  'ui(formatLabel(item.exception_status))',
  "{ui('No closed-loop exceptions are currently open.')}",
  "{ui('Closed-loop resolution plan')}",
  "{ui('Backend-generated manual sequencing plan for resolving closed-loop exceptions. It is planning-only and does not train models, update policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Resolution decision"',
  '<LocalizedLearningStatCard label="Plan score"',
  '<LocalizedLearningStatCard label="Steps"',
  "<th>{ui('Manual task')}</th>",
  "<th>{ui('Evidence to capture')}</th>",
  "<th>{ui('Expected result')}</th>",
  'formatLocalizedNumber(item.step_number ?? index + 1, locale)',
  'ui(formatLabel(item.resolution_status))',
  "{ui('No closed-loop resolution steps are currently required.')}"
]) if (!pageSource.includes(required)) fail(`Localized exception/resolution presentation missing: ${required}`);
if (!process.exitCode) pass('Closed-loop exception register and resolution plan presentation use the multilingual contract.');

const sliceStart = pageSource.indexOf('function ClosedLoopExceptionRegister(');
const sliceEnd = pageSource.indexOf('function ClosedLoopClosureReport(');
if (sliceStart < 0 || sliceEnd <= sliceStart) fail('Unable to isolate the staged exception/resolution slice.');
else {
  const slice = pageSource.slice(sliceStart, sliceEnd);
  const rawText = slice.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
    return match ? [match[1].trim()] : [];
  }).filter(Boolean);
  if (rawText.length) fail(`Raw JSX presentation remains in exception/resolution slice: ${rawText.join(' | ')}`);
  else pass('Exception/resolution slice has no remaining raw JSX presentation text.');
}

for (const required of [
  '<td>{formatLabel(item.exception_key)}</td>',
  '<td>{formatLabel(item.exception_source)}</td>',
  "typeof item.current_value === 'number' ? formatLocalizedNumber(item.current_value, locale) : formatLabel(item.current_value)",
  "typeof item.required_value === 'number' ? formatLocalizedNumber(item.required_value, locale) : formatLabel(item.required_value)",
  '<td>{formatLabel(item.manual_resolution || item.exception_reason)}</td>',
  "{register?.exception_note ? <p className=\"card__subtext\">{register.exception_note}</p> : null}",
  '<LocalizedLearningStatCard label="Owner" value={register?.recommended_exception_owner',
  "{plan?.resolution_note ? <p className=\"card__subtext\">{plan.resolution_note}</p> : null}",
  '<LocalizedLearningStatCard label="Owner" value={plan?.recommended_resolution_owner',
  '<td>{formatLabel(item.exception_key)}</td>',
  '<td>{formatLabel(item.manual_resolution_task)}</td>',
  '<td>{formatLabel(item.evidence_to_capture)}</td>',
  '<td>{formatLabel(item.expected_resolution_result)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(item.exception_key))',
  'ui(formatLabel(item.exception_source))',
  'ui(formatLabel(item.manual_resolution || item.exception_reason))',
  'ui(register.exception_note)',
  'ui(formatLabel(item.manual_resolution_task))',
  'ui(formatLabel(item.evidence_to_capture))',
  'ui(formatLabel(item.expected_resolution_result))',
  'ui(plan.resolution_note)'
]) if (pageSource.includes(forbidden)) fail(`Backend exception/resolution data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend exception identifiers, source/current/required values, notes, owners, manual tasks, evidence guidance and expected results remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Exception & Resolution multilingual gate passed.');
