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
if (!process.exitCode) pass('Closure/certification slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual closed loop closure watch',
  'manual closure evidence required',
  'manual closure watch ready',
  'ready for manual closed loop certification',
  'manual certification blocked',
  'ready for manual signoff',
  'ready for manual release review',
  'ready for manual monitoring start',
  'ready',
  'blocked',
  'high',
  'medium',
  'none'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Closure/certification dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} closure/certification canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop closure report')}",
  "{ui('Backend-generated manual closure report for confirming exception resolution evidence. It is reporting-only and does not train models, update policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Closure decision"',
  '<LocalizedLearningStatCard label="Closure score"',
  '<LocalizedLearningStatCard label="Closure items"',
  '<LocalizedLearningStatCard label="Unresolved"',
  "label={ui('Owner')}",
  "<th>{ui('Closure item')}</th>",
  "<th>{ui('Evidence required')}</th>",
  "<th>{ui('Validation task')}</th>",
  'ui(formatLabel(item.severity))',
  'ui(formatLabel(item.closure_status))',
  "{ui('No closure items are currently reported.')}",
  "{ui('Closed-loop certification dossier')}",
  "{ui('Manual certification packet for closure, signoff, release, monitoring, coverage, and exception evidence.')}",
  '<LocalizedLearningStatCard label="Certification decision"',
  '<LocalizedLearningStatCard label="Certification score"',
  '<LocalizedLearningStatCard label="Ready checks"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Next focus:')}",
  "dossier?.certification_note || ui('Manual certification dossier remains advisory only.')",
  "<th>{ui('Check')}</th>",
  "<th>{ui('Current')}</th>",
  "<th>{ui('Required')}</th>",
  'ui(formatLabel(check.check_status || \'blocked\'))',
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized closure/certification presentation missing: ${required}`);
if (!process.exitCode) pass('Closed-loop closure report and certification dossier presentation use the multilingual contract.');

const closureStart = pageSource.indexOf('function ClosedLoopClosureReport(');
const closureEnd = pageSource.indexOf('function ClosedLoopAuditLedger(');
const certificationStart = pageSource.indexOf('function ClosedLoopCertificationDossier(');
const certificationEnd = pageSource.indexOf('function ClosedLoopCustomerPilotReadiness(');
for (const [name, start, end] of [
  ['closure report', closureStart, closureEnd],
  ['certification dossier', certificationStart, certificationEnd]
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
  "{report?.closure_note ? <p className=\"card__subtext\">{report.closure_note}</p> : null}",
  "value={formatLabel(report?.recommended_closure_owner || 'platform_admin_or_authorized_business_owner')}",
  '<td>{formatLabel(item.closure_key)}</td>',
  '<td>{formatLabel(item.exception_key)}</td>',
  '<td>{formatLabel(item.closure_evidence_required)}</td>',
  '<td>{formatLabel(item.closure_validation_task)}</td>',
  "formatLabel(dossier?.recommended_certification_owner || 'decision_governance_owner')",
  "formatLabel(dossier?.next_certification_focus || 'prepare_manual_closed_loop_certification_record')",
  'blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)',
  "<td>{formatLabel(check.check_label || check.check_key || 'check')}</td>",
  "<td>{formatLabel(check.manual_certification_task || 'manual_certification_review_required')}</td>"
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(report.closure_note)',
  'ui(formatLabel(report?.recommended_closure_owner',
  'ui(formatLabel(item.closure_key))',
  'ui(formatLabel(item.exception_key))',
  'ui(formatLabel(item.closure_evidence_required))',
  'ui(formatLabel(item.closure_validation_task))',
  'ui(formatLabel(dossier?.recommended_certification_owner',
  'ui(formatLabel(dossier?.next_certification_focus',
  'ui(formatLabel(blocker))',
  'ui(formatLabel(check.check_label',
  'ui(formatLabel(check.manual_certification_task'
]) if (pageSource.includes(forbidden)) fail(`Backend closure/certification data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend closure notes, identifiers, owners, evidence requirements, validation tasks, certification blockers/check labels/manual tasks and next focus remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Closure & Certification multilingual gate passed.');
