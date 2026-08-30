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
if (!process.exitCode) pass('Signoff/release slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual signoff',
  'signoff blocked',
  'ready for manual release go no go',
  'release readiness blocked',
  'ready',
  'not ready',
  'blocked',
  'not loaded',
  'yes',
  'no'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Signoff/release dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} signoff/release canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop signoff packet')}",
  "{ui('Backend-generated manual signoff packet for evidence-based release review. It packages coverage, review, drift, and gate readiness into a human go/no-go surface. It does not approve, train, execute, update policies, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Signoff decision"',
  '<LocalizedLearningStatCard label="Signoff score"',
  '<LocalizedLearningStatCard label="Required signoffs"',
  '<LocalizedLearningStatCard label="Unresolved sections"',
  "label={ui('Recommended owner')}",
  "{ui('Next signoff focus:')}",
  "packet?.release_note || ui('No signoff packet release note available yet.')",
  "<th>{ui('Manual signoff')}</th>",
  'ui(formatLabel(section.readiness_status))',
  "ui(section.manual_signoff_required ? 'yes' : 'no')",
  "{ui('No signoff sections available yet.')}",
  "{ui('Closed-loop release readiness')}",
  "{ui('Backend-generated release readiness snapshot for the manual go/no-go decision. It packages evidence, review, drift, governance, and action lanes without approving, training, executing, updating policies, or mutating operational state.')}",
  '<LocalizedLearningStatCard label="Release decision"',
  '<LocalizedLearningStatCard label="Readiness score"',
  '<LocalizedLearningStatCard label="Ready lanes"',
  '<LocalizedLearningStatCard label="Blocked lanes"',
  '<LocalizedLearningStatCard label="Evidence"',
  "label={ui('Owner')}",
  "{ui('Next release focus:')}",
  "snapshot?.release_note || ui('No release readiness note available yet.')",
  "{ui('Release blockers:')}",
  "{ui('No release blockers reported by the backend.')}",
  "<th>{ui('Lane')}</th>",
  "<th>{ui('Manual action')}</th>",
  'ui(formatLabel(lane.lane_status))',
  "{ui('No release readiness lanes available yet.')}"
]) if (!pageSource.includes(required)) fail(`Localized signoff/release presentation missing: ${required}`);
if (!process.exitCode) pass('Signoff packet and release readiness presentation use the multilingual contract.');

const signoffStart = pageSource.indexOf('function ClosedLoopSignoffPacket(');
const signoffEnd = pageSource.indexOf('function ClosedLoopReleaseReadinessSnapshot(');
const releaseStart = signoffEnd;
const releaseEnd = pageSource.indexOf('function ClosedLoopOperationalHandoff(');
for (const [name, start, end] of [
  ['signoff packet', signoffStart, signoffEnd],
  ['release readiness', releaseStart, releaseEnd]
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
  "value={formatLabel(packet?.recommended_signoff_owner || 'decision_governance_owner')}",
  "formatLabel(packet?.next_signoff_focus || 'complete_manual_governance_go_no_go_signoff')",
  '<td>{formatLabel(section.section_label || section.section_key)}</td>',
  '<td>{formatLabel(section.signoff_instruction)}</td>',
  "value={formatLabel(snapshot?.recommended_release_owner || 'decision_governance_owner')}",
  "formatLabel(snapshot?.next_release_focus || 'complete_manual_release_go_no_go_decision')",
  '(snapshot?.release_blockers || []).map(formatLabel).join(\', \')',
  '<td>{formatLabel(lane.lane_label || lane.lane_key)}</td>',
  '<td>{formatLabel(lane.blocking_reason)}</td>',
  '<td>{formatLabel(lane.manual_action)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(packet?.recommended_signoff_owner',
  'ui(formatLabel(packet?.next_signoff_focus',
  'ui(formatLabel(section.section_label || section.section_key))',
  'ui(formatLabel(section.signoff_instruction))',
  'ui(formatLabel(snapshot?.recommended_release_owner',
  'ui(formatLabel(snapshot?.next_release_focus',
  'ui(formatLabel(lane.lane_label || lane.lane_key))',
  'ui(formatLabel(lane.blocking_reason))',
  'ui(formatLabel(lane.manual_action))'
]) if (pageSource.includes(forbidden)) fail(`Backend signoff/release data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend signoff/release labels, owners, focus values, instructions, blockers, and manual actions remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Signoff & Release multilingual gate passed.');
