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
  'const { locale, ui } = useAppTranslation();'
]) {
  if (!pageSource.includes(required)) fail(`Decision Learning Feedback multilingual wiring missing: ${required}`);
}
if (!process.exitCode) pass('Decision Learning Feedback action/impact slice uses the shared tenant translation and locale runtime.');

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
  'Actions', 'High priority', 'Medium priority', 'Next review focus',
  'Impact posture', 'Learning signal', 'Drift pressure', 'Total evidence', 'Open review',
  'Avg outcome score', 'Avg forecast error', 'Avg policy score', 'Avg optimization value',
  'routine learning monitoring',
  'high priority learning evidence',
  'medium priority learning evidence',
  'review learning outcomes',
  'review forecast calibration',
  'review policy tuning',
  'review optimization tradeoffs',
  'maintain learning observation',
  'decision governance reviewer',
  'forecast reviewer',
  'policy governance reviewer',
  'optimization reviewer',
  'manual review only',
  'manual recalibration review only',
  'manual policy review only',
  'manual optimization review only',
  'monitor only',
  'high', 'medium', 'low',
  'no learning evidence yet',
  'learning drift pressure high',
  'learning review pressure present',
  'learning evidence controlled',
  'no evidence',
  'review pressure detected',
  'positive or neutral evidence'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Decision Learning Feedback dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} canonical action/impact display values are catalog-backed.`);

for (const required of [
  "{ui('Feedback action plan')}",
  "{ui('Suggested follow-up work based on the feedback records already captured. People still decide whether to take any action, who owns it, and when it is complete.')}",
  '<LocalizedLearningStatCard label="Actions"',
  '<LocalizedLearningStatCard label="Next review focus"',
  "<th>{ui('Rationale')}</th>",
  'ui(formatLabel(action.action_key))',
  'formatLocalizedNumber(action.evidence_count ?? 0, locale)',
  "{ui('Learning impact assessment')}",
  '<LocalizedLearningStatCard label="Impact posture"',
  '<LocalizedLearningStatCard label="Avg forecast error"',
  "<th>{ui('Review pressure')}</th>",
  'formatLocalizedNumber(domain.review_pressure ?? 0, locale)',
  'ui(formatLabel(domain.impact_posture))',
  "{ui('No domain impact evidence available yet.')}"
]) if (!pageSource.includes(required)) fail(`Localized action/impact presentation missing: ${required}`);
if (!process.exitCode) pass('Feedback action plan and Learning impact assessment presentation use the multilingual contract.');

const sliceStart = pageSource.indexOf("function FeedbackActionPlan(");
const sliceEnd = pageSource.indexOf("function LearningCoverageMatrix(");
if (sliceStart < 0 || sliceEnd <= sliceStart) fail('Unable to isolate the staged Decision Learning Feedback action/impact slice.');
else {
  const slice = pageSource.slice(sliceStart, sliceEnd);
  const rawText = slice.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
    return match ? [match[1].trim()] : [];
  }).filter(Boolean);
  if (rawText.length) fail(`Raw JSX presentation remains in action/impact slice: ${rawText.join(' | ')}`);
  else pass('Action/impact slice has no remaining raw JSX presentation text.');
}

for (const required of [
  "<td>{action.rationale || '—'}</td>",
  '<td>{formatLabel(domain.domain)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend/business-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(action.rationale)',
  'ui(formatLabel(domain.domain))'
]) if (pageSource.includes(forbidden)) fail(`Backend/business data must remain raw in this slice: ${forbidden}`);
if (!process.exitCode) pass('Backend rationale and learning-domain data remain raw while canonical display states are localized.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Action & Impact multilingual gate passed.');
