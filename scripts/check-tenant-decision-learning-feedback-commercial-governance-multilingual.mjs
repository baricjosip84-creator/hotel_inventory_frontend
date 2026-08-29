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
if (!process.exitCode) pass('Commercial/governance slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual governance review',
  'blocked from closed loop escalation',
  'ready for manual commercial readiness review',
  'manual commercial readiness blocked',
  'ready for manual compliance attestation',
  'ready for manual audit retention',
  'ready for manual closed loop certification',
  'ready for manual release go no go',
  'ready for manual monitoring',
  'ready for manual production surveillance',
  'passed',
  'blocked',
  'ready',
  'not loaded'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Commercial/governance dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} commercial/governance canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop commercial readiness packet')}",
  "{ui('Final manual commercial-readiness packet tying together compliance attestation, audit ledger, certification, governance gate, and production surveillance. It stays advisory and non-autonomous.')}",
  '<LocalizedLearningStatCard label="Commercial decision"',
  '<LocalizedLearningStatCard label="Readiness score"',
  '<LocalizedLearningStatCard label="Ready checks"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Executive owner:')}",
  "packet?.commercial_readiness_note || ui('Manual commercial readiness remains advisory only.')",
  "<th>{ui('Status')}</th>",
  'ui(formatLabel(check.check_status))',
  'formatCommercialDecisionValue(check.current_value)',
  'formatCommercialDecisionValue(check.required_value)',
  "{ui('No commercial readiness checks are available yet.')}",
  "{ui('Closed-loop governance gate')}",
  "{ui('Backend-generated go/no-go gate for manual closed-loop escalation. It blocks escalation when evidence coverage, review pressure, drift pressure, high-priority actions, or roadmap readiness are not acceptable. It does not train models, update policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Gate decision"',
  '<LocalizedLearningStatCard label="Gate score"',
  '<LocalizedLearningStatCard label="Passed checks"',
  "label={ui('Next gate focus')}",
  "{ui('Manual resolution required:')}",
  "{ui('No manual gate blockers reported by the backend.')}",
  "<th>{ui('Threshold')}</th>",
  "<th>{ui('Manual remediation')}</th>",
  'ui(formatLabel(check.status))',
  'formatLocalizedNumber(check.current_value, locale)',
  'formatLocalizedNumber(check.threshold, locale)',
  "{ui('No governance gate checks available yet.')}"
]) if (!pageSource.includes(required)) fail(`Localized commercial/governance presentation missing: ${required}`);
if (!process.exitCode) pass('Commercial readiness packet and governance gate presentation use the multilingual contract.');

const commercialStart = pageSource.indexOf('function ClosedLoopCommercialReadinessPacket(');
const commercialEnd = pageSource.indexOf('function ClosedLoopGovernanceGate(');
const governanceStart = commercialEnd;
const governanceEnd = pageSource.indexOf('function ClosedLoopSignoffPacket(');
for (const [name, start, end] of [
  ['commercial readiness packet', commercialStart, commercialEnd],
  ['governance gate', governanceStart, governanceEnd]
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
  "formatLabel(packet?.recommended_executive_owner || 'platform_governance_owner')",
  "formatLabel(packet?.next_commercial_readiness_focus || 'record_manual_commercial_readiness_decision')",
  'blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)',
  '<td>{formatLabel(check.check_label || check.check_key)}</td>',
  '<td>{formatLabel(check.packet_evidence)}</td>',
  '<td>{formatLabel(check.manual_readiness_task)}</td>',
  "value={formatLabel(gate?.next_gate_focus || 'prepare_manual_governance_signoff')}",
  '(gate?.required_manual_resolution || []).map(formatLabel).join(\', \')',
  '<td>{formatLabel(check.check_label || check.check_key)}</td>',
  '<td>{formatLabel(check.remediation)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(packet?.recommended_executive_owner',
  'ui(formatLabel(packet?.next_commercial_readiness_focus',
  'ui(formatLabel(blocker))',
  'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.packet_evidence))',
  'ui(formatLabel(check.manual_readiness_task))',
  'ui(formatLabel(gate?.next_gate_focus',
  'ui(formatLabel(check.remediation))'
]) if (pageSource.includes(forbidden)) fail(`Backend commercial/governance data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend commercial/governance labels, owners, blockers, evidence, tasks, focus values, and remediations remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Commercial Readiness & Governance multilingual gate passed.');
