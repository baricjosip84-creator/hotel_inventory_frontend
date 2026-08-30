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

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of pageSource.matchAll(literalPattern)) {
  try { literals.push(decode(match[1])); } catch {}
}
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Decision Learning Feedback ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Decision Learning Feedback has ${new Set(literals).size} catalog-backed literal UI keys.`);

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedNumber } from '../i18n/formatters';",
  "import { formatLocalizedCurrency, formatLocalizedDateTime } from '../i18n/formatters';",
  "path: 'decision-learning-feedback'",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ',
  '<DecisionLearningFeedbackPage />'
]) {
  const source = required.startsWith('path:') || required.includes('DecisionLearningFeedbackPage') || required.includes('DECISION_INTELLIGENCE_READ') ? routerSource : pageSource;
  if (!source.includes(required)) fail(`Decision Learning Feedback completion wiring missing: ${required}`);
}
if (!process.exitCode) pass('Decision Learning Feedback keeps the shared multilingual runtime and read permission route contract.');

const wholePageRawText = pageSource.split(/\r?\n/).flatMap((line) => {
  const matches = [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
});
if (wholePageRawText.length) fail(`Raw JSX presentation remains on DecisionLearningFeedbackPage: ${wholePageRawText.join(' | ')}`);
else pass('DecisionLearningFeedbackPage has zero remaining raw JSX presentation text.');

const boardStart = pageSource.indexOf('function FeedbackReviewBoard(');
const boardEnd = pageSource.indexOf('function ClosedLoopEnterpriseActivationSupportReadiness(', boardStart);
const evidenceStart = pageSource.indexOf('function EvidenceTable(');
const mainStart = pageSource.indexOf('export default function DecisionLearningFeedbackPage()', evidenceStart);
if (boardStart < 0 || boardEnd <= boardStart || evidenceStart < 0 || mainStart <= evidenceStart) {
  fail('Unable to isolate final Decision Learning Feedback completion slices.');
}
const boardSlice = boardStart >= 0 && boardEnd > boardStart ? pageSource.slice(boardStart, boardEnd) : '';
const evidenceSlice = evidenceStart >= 0 && mainStart > evidenceStart ? pageSource.slice(evidenceStart, mainStart) : '';
const mainSlice = mainStart >= 0 ? pageSource.slice(mainStart) : '';

for (const required of [
  "{ui('Feedback review board')}",
  '<LocalizedLearningStatCard label="Review posture"',
  "<th>{ui('Evidence types')}</th>",
  'formatLocalizedNumber(domain.review_item_count ?? 0, locale)',
  'ui(formatLabel(item.status))',
  "const reason = item.review_reason_code ? reviewReasonLabels[item.review_reason_code] : item.review_reason;",
  "{reason ? ui(reason) : '—'}",
  "onReview(item.evidence_type || '', item.evidence_key || '', target.status)"
]) if (!boardSlice.includes(required)) fail(`Feedback Review Board completion contract missing: ${required}`);
if (!process.exitCode) pass('Feedback Review Board presentation is localized while backend resolution/reason data stays raw.');

for (const required of [
  '{ui(title)}',
  "ui('Loading feedback evidence…')",
  "ui('Feedback evidence is unavailable.')",
  "ui('Showing')",
  "ui('Older')",
  "ui('No feedback evidence has been recorded in this category yet.')",
  "<th>{ui('Score / Error')}</th>",
  "`${ui('Recorded item')} ${formatLocalizedNumber(index + 1, locale)}`",
  'ui(formatLabel(row.outcome_status ?? row.calibration_status ?? row.effectiveness_status ?? row.result_status))',
  "formatLocalizedDateTime(String(row.observed_at), locale)"
]) if (!evidenceSlice.includes(required)) fail(`EvidenceTable completion contract missing: ${required}`);
if (!process.exitCode) pass('EvidenceTable titles, counts, status display, scores, fallbacks, and timestamps use the multilingual/locale contract.');

for (const required of [
  "const { locale, ui } = useAppTranslation();",
  "eyebrow={ui('Decision intelligence & learning')}",
  "title={ui('Learning Feedback')}",
  "label={ui('Feedback records')}",
  "label={ui('Readiness checks')}",
  "{ui('Record feedback evidence')}",
  '{ui(modeLabels[item])}',
  '{ui(formatLabel(status))}',
  "validateFeedbackForm(mode, form, sourceId, ui)",
  "ui('Feedback evidence recorded. The backend stores this as learning evidence only.')",
  "ui('You have read-only access. Decision Intelligence governance permission is required to record feedback.')",
  "ui('What this page can change')",
  "ui('Business areas represented in the current records:')",
  "ui('These technical checks support internal release, monitoring, audit, and rollout reviews. They do not prove that an AI model was used and they do not carry out operational work.')"
]) if (!mainSlice.includes(required)) fail(`Main feedback workspace completion contract missing: ${required}`);
if (!process.exitCode) pass('Main feedback workspace, form, validation, read-only state, safety card, and readiness intro use the multilingual contract.');

const dynamicDisplayKeys = new Set([
  'Learning outcome', 'Forecast accuracy', 'Policy effectiveness', 'Optimization result',
  'Review posture', 'Open review items', 'Domains', 'Posture', 'Outcomes', 'Forecast evidence', 'Policy evidence', 'Optimization evidence',
  'record shown.', 'records shown.',
]);
const modeBlock = pageSource.slice(pageSource.indexOf('const modeLabels'), pageSource.indexOf('const defaultForm'));
for (const match of modeBlock.matchAll(/'([a-z][a-z0-9_]+)'/g)) dynamicDisplayKeys.add(match[1].replace(/_/g, ' '));
for (const match of mainSlice.matchAll(/\['([^\]]+)'\]\.map/g)) {
  for (const value of match[1].matchAll(/'([a-z][a-z0-9_]+)'/g)) dynamicDisplayKeys.add(value[1].replace(/_/g, ' '));
}
for (const match of mainSlice.matchAll(/<EvidenceTable title="([^"]+)"/g)) dynamicDisplayKeys.add(match[1]);
for (const match of (boardSlice + mainSlice).matchAll(/<LocalizedLearningStatCard label="([^"]+)"/g)) dynamicDisplayKeys.add(match[1]);
const missingDynamic = [...dynamicDisplayKeys].filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Decision Learning Feedback dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicDisplayKeys.size} final-page dynamic display keys are catalog-backed.`);

for (const required of [
  "apiRequest<Record<string, unknown>>(`/decision-intelligence-feedback/${mode}`",
  'skipMutationFeedback: true',
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN',
  "placeholder='{'", // intentionally only used as a loose technical-example guard below
]) {
  if (required === "placeholder='{'" ) continue;
  if (!pageSource.includes(required)) fail(`Feedback write/governance contract changed unexpectedly: ${required}`);
}
for (const required of [
  'source_reference: reference',
  'recommendation_key: form.recommendationKey || undefined',
  'recommendation_outcome_learning_signal: form.learningSignal || undefined',
  'recommendation_outcome_learning_action_evidence: safeJsonObject(form.learningActionEvidence)',
  "placeholder='\u007b\"source\":\"recommendation-review\"\u007d'",
  "placeholder='\u007b\"execution_request_id\":\"...\"\u007d'"
]) if (!pageSource.includes(required)) fail(`Canonical payload/technical-example boundary changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Feedback POST/governance/payload contract and technical JSON examples remain canonical.');

if (pageSource.includes('formatTimestamp(')) fail('Legacy locale-agnostic feedback timestamp formatter still remains.');
else pass('Final feedback evidence timestamps use the locale-aware shared formatter.');

if (!process.exitCode) pass('DecisionLearningFeedbackPage staged multilingual conversion is complete.');
