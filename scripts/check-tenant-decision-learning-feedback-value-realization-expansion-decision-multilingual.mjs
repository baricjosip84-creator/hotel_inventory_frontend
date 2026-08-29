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
if (!process.exitCode) pass('Value-realization/expansion-decision slice uses the shared tenant translation and locale runtime.');

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
  'Closed-loop enterprise activation value realization review',
  'Manual value-realization review for enterprise activation. It verifies value assurance, validated outcomes, closure status, cross-domain evidence, and coverage before any value realization signoff. It does not publish value claims, trigger billing, enable tenants, train models, change policies, execute recommendations, or mutate operational state.',
  'Realization decision', 'Realization score', 'Validated outcomes', 'Open/rejected outcomes',
  'Realization owner:', 'Recommended realization mode:', 'Positive score total:', 'Negative score total:',
  'Manual enterprise activation value realization review remains advisory only.',
  'No enterprise activation value realization blockers are currently reported.',
  'Manual realization options:', 'No enterprise activation value realization checks are available yet.',
  'ready for manual value realization signoff', 'conditional value realization review required', 'enterprise value realization review blocked',
  'Closed-loop enterprise value expansion decision',
  'Manual enterprise expansion decision control. It combines value realization, rollout governance, tenant-wave controls, adoption readiness, and cross-domain learning evidence before expanding to additional tenants or teams. It does not enable tenants, trigger billing, publish claims, train models, execute recommendations, or mutate operational state.',
  'Expansion decision', 'Expansion score', 'Ready checks', 'Blocked checks', 'Expansion owner:',
  'Recommended expansion mode:', 'Tenant-wave policy:', 'Validated outcomes:', 'Negative outcomes:',
  'Manual enterprise value expansion decision remains advisory only.',
  'No enterprise value expansion blockers are currently reported.', 'Manual expansion options:',
  'No enterprise value expansion checks are available yet.',
  'ready for manual enterprise value expansion approval', 'conditional enterprise value expansion review required', 'enterprise value expansion blocked',
  'Next focus:', 'Review cadence:', 'Check', 'Status', 'Current', 'Required', 'Evidence', 'Manual task', 'ready', 'blocked'
];
const missingRequired = requiredCatalogKeys.filter((key) => !unique.has(key));
if (missingRequired.length) fail(`Value-realization/expansion-decision display keys missing translations: ${missingRequired.join(' | ')}`);
else pass(`${requiredCatalogKeys.length} value-realization/expansion-decision presentation keys are catalog-backed.`);

for (const required of [
  'function ClosedLoopEnterpriseActivationValueRealizationReview(',
  'const { locale, ui } = useAppTranslation();',
  "{ui('Closed-loop enterprise activation value realization review')}",
  '<LocalizedLearningStatCard label="Realization decision"', '<LocalizedLearningStatCard label="Realization score"',
  '<LocalizedLearningStatCard label="Validated outcomes"', '<LocalizedLearningStatCard label="Open/rejected outcomes"',
  "{ui('Realization owner:')}", "{ui('Recommended realization mode:')}", "{ui('Positive score total:')}", "{ui('Negative score total:')}",
  "review?.value_realization_note || ui('Manual enterprise activation value realization review remains advisory only.')",
  "{ui('No enterprise activation value realization blockers are currently reported.')}", "{ui('Manual realization options:')}",
  "{ui('No enterprise activation value realization checks are available yet.')}",
  'function ClosedLoopEnterpriseValueExpansionDecision(', "{ui('Closed-loop enterprise value expansion decision')}",
  '<LocalizedLearningStatCard label="Expansion decision"', '<LocalizedLearningStatCard label="Expansion score"',
  '<LocalizedLearningStatCard label="Ready checks"', '<LocalizedLearningStatCard label="Blocked checks"',
  "{ui('Expansion owner:')}", "{ui('Recommended expansion mode:')}", "{ui('Tenant-wave policy:')}",
  "decision?.expansion_note || ui('Manual enterprise value expansion decision remains advisory only.')",
  "{ui('No enterprise value expansion blockers are currently reported.')}", "{ui('Manual expansion options:')}",
  "{ui('No enterprise value expansion checks are available yet.')}", 'ui(formatLabel(check.check_status))', 'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized value-realization/expansion-decision presentation missing: ${required}`);
if (!process.exitCode) pass('Value realization review and enterprise value expansion decision use the multilingual presentation contract.');

const realizationStart = pageSource.indexOf('function ClosedLoopEnterpriseActivationValueRealizationReview(');
const realizationEnd = pageSource.indexOf('function ClosedLoopEnterpriseValueExpansionDecision(', realizationStart);
const expansionStart = realizationEnd;
const expansionEnd = pageSource.indexOf('function ClosedLoopEnterpriseValueExpansionOperatingModel(', expansionStart);
for (const [name, start, end] of [
  ['enterprise activation value realization review', realizationStart, realizationEnd],
  ['enterprise value expansion decision', expansionStart, expansionEnd]
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
  "review?.recommended_value_realization_owner || 'enterprise_value_owner'",
  "formatLabel(review?.next_value_realization_focus || 'perform_manual_enterprise_value_realization_signoff')",
  "formatLabel(policy.recommended_value_realization_mode || 'pause_value_realization_claims_until_manual_blockers_are_resolved')",
  "formatLabel(policy.recommended_realization_review_cadence || 'daily_value_realization_blocker_review_until_ready')",
  'review?.value_realization_note || ui(', 'blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)',
  'options.map(formatLabel).join(', '<td>{check.check_label || formatLabel(check.check_key)}</td>',
  '<td>{formatLabel(check.realization_evidence)}</td>', '<td>{formatLabel(check.manual_realization_task)}</td>',
  "decision?.recommended_expansion_owner || 'enterprise_value_owner'",
  "formatLabel(decision?.next_expansion_focus || 'perform_manual_enterprise_value_expansion_approval')",
  "formatLabel(policy.recommended_expansion_mode || 'pause_enterprise_expansion_until_manual_blockers_are_resolved')",
  "formatLabel(policy.tenant_wave_policy || 'expand_only_by_named_manual_wave_after_rollout_control_review')",
  'decision?.expansion_note || ui(', '<td>{formatLabel(check.expansion_evidence)}</td>', '<td>{formatLabel(check.manual_expansion_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(review?.recommended_value_realization_owner', 'ui(formatLabel(review?.next_value_realization_focus',
  'ui(formatLabel(policy.recommended_value_realization_mode', 'ui(formatLabel(policy.recommended_realization_review_cadence',
  'ui(review?.value_realization_note', 'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.realization_evidence))', 'ui(formatLabel(check.manual_realization_task))',
  'ui(formatLabel(decision?.recommended_expansion_owner', 'ui(formatLabel(decision?.next_expansion_focus',
  'ui(formatLabel(policy.recommended_expansion_mode', 'ui(formatLabel(policy.tenant_wave_policy',
  'ui(decision?.expansion_note', 'ui(formatLabel(check.expansion_evidence))', 'ui(formatLabel(check.manual_expansion_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend value-realization/expansion data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend check labels, owners, modes, cadence/policy values, blockers, options, evidence, tasks, focus values, notes, and composite business values remain raw.');

if (!pageSource.includes("ui('The latest saved records in this category.')")) fail('Completed-page sentinel must confirm the EvidenceTable saved-records description is localized.');
else pass('Decision Learning Feedback staged boundary is complete through the final EvidenceTable presentation.');

for (const required of ["path: 'decision-learning-feedback'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<DecisionLearningFeedbackPage />'])
  if (!routerSource.includes(required)) fail(`Decision Learning Feedback router/permission contract changed: ${required}`);
if (!process.exitCode) pass('Decision Learning Feedback route and DECISION_INTELLIGENCE_READ permission contract remain unchanged.');
for (const required of [
  "apiRequest<ContinuousLearningSummary>('/decision-intelligence/continuous-learning-summary?limit=25')",
  "apiRequest<Record<string, unknown>>(`/decision-intelligence-feedback/${mode}`, {", "method: 'POST'"
]) if (!pageSource.includes(required)) fail(`Existing Decision Learning Feedback request contract missing: ${required}`);
if (!process.exitCode) pass('Existing summary read and governed feedback-evidence POST contracts remain unchanged.');

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Value Realization Review & Value Expansion Decision multilingual gate passed.');
