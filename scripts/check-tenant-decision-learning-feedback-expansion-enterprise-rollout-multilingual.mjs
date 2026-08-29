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
if (!process.exitCode) pass('Expansion/enterprise-rollout slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual controlled customer expansion review',
  'manual controlled customer expansion blocked',
  'ready for manual enterprise rollout review',
  'manual enterprise rollout blocked',
  'ready',
  'blocked'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Expansion/enterprise-rollout dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} expansion/enterprise-rollout canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop customer pilot expansion readiness')}",
  "{ui('Manual controlled-expansion readiness layer. It checks pilot outcome review, commercial readiness, validated positive outcomes, and drift pressure without expanding customers, training models, updating policies, or mutating operational state.')}",
  '<LocalizedLearningStatCard label="Expansion decision"',
  '<LocalizedLearningStatCard label="Expansion score"',
  '<LocalizedLearningStatCard label="Positive validated"',
  '<LocalizedLearningStatCard label="Drift pressure"',
  "{ui('Expansion owner:')}",
  "{ui('Next focus:')}",
  "expansion?.expansion_readiness_note || ui('Manual customer pilot expansion readiness remains advisory only.')",
  "{ui('Manual expansion options:')}",
  'ui(formatLabel(check.check_status))',
  "{ui('No customer pilot expansion-readiness checks are available yet.')}",
  "{ui('Closed-loop enterprise rollout readiness')}",
  "{ui('Manual enterprise rollout layer. It checks pilot expansion readiness, multi-domain learning coverage, audit traceability, compliance attestation, and open review pressure without provisioning tenants, training models, updating policies, executing recommendations, or mutating operational state.')}",
  '<LocalizedLearningStatCard label="Rollout decision"',
  '<LocalizedLearningStatCard label="Rollout score"',
  '<LocalizedLearningStatCard label="Covered domains"',
  '<LocalizedLearningStatCard label="Open review pressure"',
  "{ui('Rollout owner:')}",
  "rollout?.rollout_readiness_note || ui('Manual enterprise rollout readiness remains advisory only.')",
  "{ui('Blockers:')}",
  "{ui('No enterprise rollout blockers are currently reported.')}",
  "{ui('Manual rollout options:')}",
  "{ui('No enterprise rollout checks are available yet.')}",
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized expansion/enterprise-rollout presentation missing: ${required}`);
if (!process.exitCode) pass('Customer pilot expansion and enterprise rollout presentation use the multilingual contract.');

const expansionStart = pageSource.indexOf('function ClosedLoopCustomerPilotExpansionReadiness(');
const expansionEnd = pageSource.indexOf('function ClosedLoopEnterpriseRolloutReadiness(');
const rolloutStart = expansionEnd;
const rolloutEnd = pageSource.indexOf('function ClosedLoopEnterpriseRolloutGovernance(');
for (const [name, start, end] of [
  ['customer pilot expansion readiness', expansionStart, expansionEnd],
  ['enterprise rollout readiness', rolloutStart, rolloutEnd]
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
  "formatLabel(expansion?.recommended_expansion_owner || 'customer_success_owner')",
  "formatLabel(expansion?.next_expansion_focus || 'prepare_manual_controlled_customer_expansion_review')",
  'expansion?.expansion_readiness_note || ui(',
  'blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)',
  'options.map(formatLabel).join(',
  '<td>{formatLabel(check.check_label || check.check_key)}</td>',
  '<td>{formatLabel(check.expansion_evidence)}</td>',
  '<td>{formatLabel(check.manual_expansion_task)}</td>',
  "formatLabel(rollout?.recommended_rollout_owner || 'enterprise_rollout_owner')",
  "formatLabel(rollout?.next_rollout_focus || 'prepare_manual_enterprise_rollout_review')",
  'rollout?.rollout_readiness_note || ui(',
  'blockers.map(formatLabel).join(',
  '<td>{check.check_label || formatLabel(check.check_key)}</td>',
  '<td>{formatLabel(check.rollout_evidence)}</td>',
  '<td>{formatLabel(check.manual_rollout_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(expansion?.recommended_expansion_owner',
  'ui(formatLabel(expansion?.next_expansion_focus',
  'ui(expansion?.expansion_readiness_note',
  'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.expansion_evidence))',
  'ui(formatLabel(check.manual_expansion_task))',
  'ui(formatLabel(rollout?.recommended_rollout_owner',
  'ui(formatLabel(rollout?.next_rollout_focus',
  'ui(rollout?.rollout_readiness_note',
  'ui(formatLabel(check.rollout_evidence))',
  'ui(formatLabel(check.manual_rollout_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend expansion/rollout data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend check labels, owners, blockers, decision options, evidence references, tasks, focus values, notes, and composite business values remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Expansion & Enterprise Rollout multilingual gate passed.');
