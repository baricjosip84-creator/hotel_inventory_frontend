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


// v3.49.188: backend-owned governance vocabulary must use protected presentation helpers,
// while arbitrary tenant/business text remains outside blind ui()/formatLabel() translation.
const protectedSystemFieldsV349188 = ['activation_evidence', 'activation_note', 'adoption_evidence', 'adoption_note', 'check_label', 'manual_activation_task', 'manual_adoption_task', 'monitoring_owner', 'next_activation_focus', 'next_adoption_focus', 'recommended_activation_mode', 'recommended_adoption_mode', 'rollback_owner'];
const protectedHelpersV349188 = ['learningOwnedSystemText', 'learningOwnerLabel', 'learningCheckLabel', 'learningDomainLabel', 'learningEvidenceTypeLabel'];
for (const helper of protectedHelpersV349188) {
  if (!pageSource.includes(`${helper}(`)) fail(`v3.49.188 Learning Feedback protected helper missing: ${helper}`);
}
for (const field of protectedSystemFieldsV349188) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:learningOwnedSystemText|learningOwnerLabel|learningCheckLabel|learningDomainLabel|learningEvidenceTypeLabel|learningActionRationale)\\([^\\n]*${escaped}`);
  if (!pattern.test(pageSource)) fail(`Backend-owned Learning Feedback field is not protected by the v3.49.188 presentation boundary: ${field}`);
}
for (const forbidden of [
  'ui(formatLabel(check.check_label',
  'ui(formatLabel(blocker))',
  'ui(formatLabel(item.learning_domain))'
]) if (pageSource.includes(forbidden)) fail(`Learning Feedback must not blindly translate backend identifiers: ${forbidden}`);
if (!process.exitCode) pass('Backend-owned Learning Feedback governance text uses protected localized helpers while arbitrary business text remains outside blind translation.');

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
