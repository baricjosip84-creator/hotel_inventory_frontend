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
if (!process.exitCode) pass('Enterprise expansion operating-model/governance-cadence slice uses the shared tenant translation and locale runtime.');

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

const requiredCatalogKeys = [
  'Closed-loop enterprise value expansion operating model',
  'Manual operating-model handoff control for enterprise expansion. It combines expansion approval, tenant-wave controls, support readiness, production surveillance, cross-domain coverage, and unresolved review pressure before scaling the operating model. It does not enable tenants, trigger billing, publish claims, train models, execute recommendations, or mutate operational state.',
  'Operating model decision', 'Operating model score', 'Operating-model owner:', 'Recommended mode:', 'Ownership policy:',
  'Covered domains:', 'Unresolved review pressure:', 'Manual enterprise operating-model handoff remains advisory only.',
  'No enterprise operating-model blockers are currently reported.', 'Manual operating-model options:',
  'No enterprise operating-model checks are available yet.',
  'ready for manual enterprise operating model handoff', 'conditional enterprise operating model review required', 'enterprise operating model handoff blocked',
  'Closed-loop enterprise expansion governance cadence',
  'Manual recurring governance cadence for enterprise expansion. It combines operating-model readiness, rollout governance, audit traceability, compliance attestation, and unresolved review pressure. It does not enable tenants, trigger billing, publish value claims, train models, execute recommendations, or mutate operational state.',
  'Cadence decision', 'Cadence score', 'Cadence owner:', 'Recommended cadence mode:', 'Minimum review cadence:',
  'Manual enterprise expansion governance cadence remains advisory only.',
  'No enterprise expansion governance cadence blockers are currently reported.', 'Manual cadence options:',
  'No enterprise expansion governance cadence checks are available yet.',
  'ready for manual enterprise expansion governance cadence', 'conditional enterprise expansion governance cadence review required', 'enterprise expansion governance cadence blocked',
  'Ready checks', 'Blocked checks', 'Next focus:', 'Check', 'Status', 'Current', 'Required', 'Evidence', 'Manual task', 'ready', 'blocked'
];
const missingRequired = requiredCatalogKeys.filter((key) => !unique.has(key));
if (missingRequired.length) fail(`Enterprise expansion operating-model/governance-cadence display keys missing translations: ${missingRequired.join(' | ')}`);
else pass(`${requiredCatalogKeys.length} enterprise expansion operating-model/governance-cadence presentation keys are catalog-backed.`);

for (const required of [
  'function ClosedLoopEnterpriseValueExpansionOperatingModel(',
  'const { locale, ui } = useAppTranslation();',
  "{ui('Closed-loop enterprise value expansion operating model')}",
  '<LocalizedLearningStatCard label="Operating model decision"', '<LocalizedLearningStatCard label="Operating model score"',
  '<LocalizedLearningStatCard label="Ready checks"', '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Operating-model owner:')}", "{ui('Recommended mode:')}", "{ui('Ownership policy:')}",
  "{ui('Covered domains:')}", "{ui('Unresolved review pressure:')}",
  "model?.operating_model_note || ui('Manual enterprise operating-model handoff remains advisory only.')",
  "{ui('No enterprise operating-model blockers are currently reported.')}", "{ui('Manual operating-model options:')}",
  "{ui('No enterprise operating-model checks are available yet.')}",
  'function ClosedLoopEnterpriseExpansionGovernanceCadence(',
  "{ui('Closed-loop enterprise expansion governance cadence')}",
  '<LocalizedLearningStatCard label="Cadence decision"', '<LocalizedLearningStatCard label="Cadence score"',
  "{ui('Cadence owner:')}", "{ui('Recommended cadence mode:')}", "{ui('Minimum review cadence:')}",
  "cadence?.cadence_note || ui('Manual enterprise expansion governance cadence remains advisory only.')",
  "{ui('No enterprise expansion governance cadence blockers are currently reported.')}", "{ui('Manual cadence options:')}",
  "{ui('No enterprise expansion governance cadence checks are available yet.')}",
  'ui(formatLabel(check.check_status))', 'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized enterprise expansion operating-model/governance-cadence presentation missing: ${required}`);
if (!process.exitCode) pass('Enterprise value expansion operating model and expansion governance cadence use the multilingual presentation contract.');

const modelStart = pageSource.indexOf('function ClosedLoopEnterpriseValueExpansionOperatingModel(');
const modelEnd = pageSource.indexOf('function ClosedLoopEnterpriseExpansionGovernanceCadence(', modelStart);
const cadenceStart = modelEnd;
const cadenceEnd = pageSource.indexOf('function RecommendationOutcomeFoundation(', cadenceStart);
for (const [name, start, end] of [
  ['enterprise value expansion operating model', modelStart, modelEnd],
  ['enterprise expansion governance cadence', cadenceStart, cadenceEnd]
]) {
  if (start < 0 || end <= start) { fail(`Unable to isolate the staged ${name} slice.`); continue; }
  const slice = pageSource.slice(start, end);
  const rawText = slice.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
    return match ? [match[1].trim()] : [];
  }).filter(Boolean);
  if (rawText.length) fail(`Raw JSX presentation remains in ${name} slice: ${rawText.join(' | ')}`);
  else pass(`${name} slice has no remaining raw JSX presentation text.`);
}

for (const required of [
  "model?.recommended_operating_model_owner || 'enterprise_value_owner'",
  "formatLabel(model?.next_operating_model_focus || 'perform_manual_enterprise_operating_model_handoff')",
  "formatLabel(policy.recommended_operating_model_mode || 'pause_operating_model_handoff_until_manual_blockers_are_resolved')",
  "formatLabel(policy.ownership_policy || 'assign_named_rollout_support_operations_and_value_owners_before_scaled_enterprise_expansion')",
  'model?.operating_model_note || ui(', 'blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)',
  'options.map(formatLabel).join(', '<td>{check.check_label || formatLabel(check.check_key)}</td>',
  '<td>{formatLabel(check.operating_model_evidence)}</td>', '<td>{formatLabel(check.manual_operating_model_task)}</td>',
  "cadence?.recommended_cadence_owner || 'enterprise_governance_owner'",
  "formatLabel(cadence?.next_cadence_focus || 'start_manual_enterprise_expansion_governance_cadence')",
  "formatLabel(policy.recommended_cadence_mode || 'pause_expansion_governance_cadence_until_manual_blockers_are_resolved')",
  "formatLabel(policy.minimum_review_cadence || 'daily_until_ready')",
  'cadence?.cadence_note || ui(', '<td>{formatLabel(check.cadence_evidence)}</td>', '<td>{formatLabel(check.manual_cadence_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(model?.recommended_operating_model_owner', 'ui(formatLabel(model?.next_operating_model_focus',
  'ui(formatLabel(policy.recommended_operating_model_mode', 'ui(formatLabel(policy.ownership_policy',
  'ui(model?.operating_model_note', 'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.operating_model_evidence))', 'ui(formatLabel(check.manual_operating_model_task))',
  'ui(formatLabel(cadence?.recommended_cadence_owner', 'ui(formatLabel(cadence?.next_cadence_focus',
  'ui(formatLabel(policy.recommended_cadence_mode', 'ui(formatLabel(policy.minimum_review_cadence',
  'ui(cadence?.cadence_note', 'ui(formatLabel(check.cadence_evidence))', 'ui(formatLabel(check.manual_cadence_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend enterprise expansion operating-model/governance-cadence data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend check labels, owners, modes, cadence/policies, blockers, options, evidence, tasks, focus values, notes, and composite business values remain raw.');

if (!pageSource.includes("ui('Loading feedback evidence…')")) fail('Completed-page sentinel must confirm the EvidenceTable saved-records description is localized.');
else pass('Decision Learning Feedback staged boundary is complete through the final EvidenceTable presentation.');

for (const required of ["path: 'decision-learning-feedback'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<DecisionLearningFeedbackPage />'])
  if (!routerSource.includes(required)) fail(`Decision Learning Feedback router/permission contract changed: ${required}`);
if (!process.exitCode) pass('Decision Learning Feedback route and DECISION_INTELLIGENCE_READ permission contract remain unchanged.');
for (const required of [
  "continuous-learning-summary?${params.toString()}",
  "apiRequest<Record<string, unknown>>(`/decision-intelligence-feedback/${mode}`, {", "method: 'POST'"
]) if (!pageSource.includes(required)) fail(`Existing Decision Learning Feedback request contract missing: ${required}`);
if (!process.exitCode) pass('Existing summary read and governed feedback-evidence POST contracts remain unchanged.');

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Value Expansion Operating Model & Governance Cadence multilingual gate passed.');
