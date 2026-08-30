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
if (!process.exitCode) pass('Enterprise adoption/activation-plan slice uses the shared tenant translation and locale runtime.');

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
  'Closed-loop enterprise adoption readiness',
  'Adoption decision',
  'Adoption score',
  'Adoption owner:',
  'Recommended adoption mode:',
  'Validated pilot outcomes:',
  'Covered domains:',
  'Closed-loop enterprise activation plan',
  'Activation decision',
  'Activation score',
  'Activation owner:',
  'Recommended activation mode:',
  'Monitoring owner:',
  'ready for manual enterprise adoption review',
  'enterprise adoption readiness blocked',
  'ready for manual enterprise activation planning',
  'enterprise activation plan blocked',
  'ready',
  'blocked'
];
const missingRequired = requiredCatalogKeys.filter((key) => !unique.has(key));
if (missingRequired.length) fail(`Enterprise adoption/activation-plan display keys missing translations: ${missingRequired.join(' | ')}`);
else pass(`${requiredCatalogKeys.length} enterprise adoption/activation-plan presentation keys are catalog-backed.`);

for (const required of [
  "function ClosedLoopEnterpriseAdoptionReadiness(",
  "const { locale, ui } = useAppTranslation();",
  "{ui('Closed-loop enterprise adoption readiness')}",
  "{ui('Manual executive adoption-readiness layer for enterprise expansion. It checks tenant rollout controls, enterprise governance, commercial readiness, pilot outcomes, and learning coverage before adoption review. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Adoption decision"',
  '<LocalizedLearningStatCard label="Adoption score"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  '<LocalizedLearningStatCard label="Coverage gaps"',
  "{ui('Adoption owner:')}",
  "{ui('Recommended adoption mode:')}",
  "{ui('Validated pilot outcomes:')}",
  "{ui('Covered domains:')}",
  "readiness?.adoption_note || ui('Manual enterprise adoption readiness remains advisory only.')",
  "{ui('No enterprise adoption blockers are currently reported.')}",
  "{ui('Manual adoption options:')}",
  "{ui('No enterprise adoption readiness checks are available yet.')}",
  "function ClosedLoopEnterpriseActivationPlan(",
  "{ui('Closed-loop enterprise activation plan')}",
  "{ui('Manual activation planning layer for enterprise adoption. It checks adoption readiness, monitoring readiness, resolution status, learning signal stability, and domain coverage before customer activation planning. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Activation decision"',
  '<LocalizedLearningStatCard label="Activation score"',
  '<LocalizedLearningStatCard label="Learning signal"',
  '<LocalizedLearningStatCard label="Drift pressure"',
  '<LocalizedLearningStatCard label="Covered domains"',
  "{ui('Activation owner:')}",
  "{ui('Recommended activation mode:')}",
  "{ui('Monitoring owner:')}",
  "{ui('Rollback owner:')}",
  "plan?.activation_note || ui('Manual enterprise activation planning remains advisory only.')",
  "{ui('No enterprise activation blockers are currently reported.')}",
  "{ui('Manual activation options:')}",
  "{ui('No enterprise activation checks are available yet.')}",
  'ui(formatLabel(check.check_status))',
  'formatLocalizedNumber(value, locale)',
  'formatLocalizedNumber(readiness?.validated_pilot_outcome_count ?? 0, locale)',
  'formatLocalizedNumber(readiness?.covered_domain_count ?? 0, locale)'
]) if (!pageSource.includes(required)) fail(`Localized enterprise adoption/activation-plan presentation missing: ${required}`);
if (!process.exitCode) pass('Enterprise adoption readiness and enterprise activation plan use the multilingual presentation contract.');

const adoptionStart = pageSource.indexOf('function ClosedLoopEnterpriseAdoptionReadiness(');
const adoptionEnd = pageSource.indexOf('function ClosedLoopEnterpriseActivationPlan(');
const activationStart = adoptionEnd;
const activationEnd = pageSource.indexOf('function ClosedLoopEnterpriseActivationRunbook(');
for (const [name, start, end] of [
  ['enterprise adoption readiness', adoptionStart, adoptionEnd],
  ['enterprise activation plan', activationStart, activationEnd]
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
  "readiness?.recommended_adoption_owner || 'enterprise_adoption_owner'",
  "formatLabel(readiness?.next_adoption_focus || 'prepare_manual_enterprise_adoption_signoff')",
  "formatLabel(policy.recommended_adoption_mode || 'pause_enterprise_adoption_until_manual_remediation')",
  'readiness?.adoption_note || ui(',
  'blockers.map(formatLabel).join(',
  'options.map(formatLabel).join(',
  '<td>{check.check_label || formatLabel(check.check_key)}</td>',
  '<td>{formatLabel(check.adoption_evidence)}</td>',
  '<td>{formatLabel(check.manual_adoption_task)}</td>',
  "plan?.recommended_activation_owner || 'enterprise_activation_owner'",
  "formatLabel(plan?.next_activation_focus || 'prepare_manual_enterprise_activation_runbook')",
  "formatLabel(policy.recommended_activation_mode || 'pause_enterprise_activation_until_manual_remediation')",
  "formatLabel(policy.monitoring_owner || 'operations_owner')",
  "formatLabel(policy.rollback_owner || 'enterprise_rollout_owner')",
  'plan?.activation_note || ui(',
  '<td>{formatLabel(check.activation_evidence)}</td>',
  '<td>{formatLabel(check.manual_activation_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(readiness?.recommended_adoption_owner',
  'ui(formatLabel(readiness?.next_adoption_focus',
  'ui(formatLabel(policy.recommended_adoption_mode',
  'ui(readiness?.adoption_note',
  'ui(formatLabel(check.check_label || check.check_key))',
  'ui(formatLabel(check.adoption_evidence))',
  'ui(formatLabel(check.manual_adoption_task))',
  'ui(formatLabel(plan?.recommended_activation_owner',
  'ui(formatLabel(plan?.next_activation_focus',
  'ui(formatLabel(policy.recommended_activation_mode',
  'ui(formatLabel(policy.monitoring_owner',
  'ui(formatLabel(policy.rollback_owner',
  'ui(plan?.activation_note',
  'ui(formatLabel(check.activation_evidence))',
  'ui(formatLabel(check.manual_activation_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend adoption/activation-plan data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend check labels, owners, modes, blockers, decision options, evidence, tasks, focus values, notes, and composite business values remain raw.');

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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Adoption Readiness & Enterprise Activation Plan multilingual gate passed.');
