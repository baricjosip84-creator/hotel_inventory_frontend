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
if (!process.exitCode) pass('Monitoring/surveillance slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual monitoring',
  'monitoring readiness blocked',
  'monitoring readiness not loaded',
  'ready for monitoring',
  'ready for manual production surveillance',
  'production surveillance blocked',
  'surveillance ready',
  'blocked'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Monitoring/surveillance dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} monitoring/surveillance canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop monitoring readiness')}",
  "{ui('Manual post-acceptance monitoring controls generated from acceptance, review-board, drift, and coverage evidence. This is visibility only; it does not train models, update policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Monitoring decision"',
  '<LocalizedLearningStatCard label="Readiness score"',
  '<LocalizedLearningStatCard label="Ready checks"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  "label={ui('Cadence')}",
  "{ui('Owner:')}",
  "{ui('Next monitoring focus:')}",
  "{ui('Blockers:')}",
  "{ui('No monitoring blockers reported by the backend.')}",
  "<th>{ui('Manual control')}</th>",
  "<th>{ui('Blocking reason')}</th>",
  'ui(formatLabel(check.check_status))',
  "{ui('No monitoring checks available yet.')}",
  "{ui('Closed-loop production surveillance')}",
  "{ui('Backend-generated manual production watch layer after monitoring readiness. It does not train models, update policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Surveillance decision"',
  '<LocalizedLearningStatCard label="Surveillance score"',
  "<th>{ui('Control')}</th>",
  "<th>{ui('Blocker')}</th>",
  "{ui('No production surveillance checks are available yet.')}",
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized monitoring/surveillance presentation missing: ${required}`);
if (!process.exitCode) pass('Monitoring readiness and production surveillance presentation use the multilingual contract.');

const monitoringStart = pageSource.indexOf('function ClosedLoopMonitoringReadiness(');
const monitoringEnd = pageSource.indexOf('function ClosedLoopProductionSurveillance(');
const surveillanceStart = monitoringEnd;
const surveillanceEnd = pageSource.indexOf('function ClosedLoopCertificationDossier(');
for (const [name, start, end] of [
  ['monitoring readiness', monitoringStart, monitoringEnd],
  ['production surveillance', surveillanceStart, surveillanceEnd]
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
  "value={formatLabel(readiness?.suggested_monitoring_cadence || 'manual_review_required')}",
  "formatLabel(readiness?.recommended_monitoring_owner || 'decision_governance_owner')",
  "formatLabel(readiness?.next_monitoring_focus || 'complete_manual_monitoring_readiness_review')",
  '(readiness?.monitoring_blockers || []).map(formatLabel)',
  '<td>{formatLabel(check.check_label || check.check_key)}</td>',
  '<td>{formatLabel(check.recommended_monitoring_control)}</td>',
  '<td>{formatLabel(check.blocking_reason)}</td>',
  "value={formatLabel(surveillance?.suggested_surveillance_cadence || 'daily_manual_blocker_resolution_until_surveillance_ready')}",
  '<td>{formatLabel(check.recommended_surveillance_control)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  "ui(formatLabel(readiness?.suggested_monitoring_cadence",
  "ui(formatLabel(readiness?.recommended_monitoring_owner",
  "ui(formatLabel(readiness?.next_monitoring_focus",
  'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.recommended_monitoring_control))',
  'ui(formatLabel(check.blocking_reason))',
  "ui(formatLabel(surveillance?.suggested_surveillance_cadence",
  'ui(formatLabel(check.recommended_surveillance_control))'
]) if (pageSource.includes(forbidden)) fail(`Backend monitoring/surveillance data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend check labels, controls, blockers, owners, cadence/focus values, and notes remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Monitoring Readiness & Production Surveillance multilingual gate passed.');
