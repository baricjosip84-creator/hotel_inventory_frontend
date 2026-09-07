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
if (!process.exitCode) pass('Enterprise governance/rollout-controls slice uses the shared tenant translation and locale runtime.');

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
  'ready for manual enterprise rollout governance approval',
  'manual enterprise rollout governance blocked',
  'ready for manual controlled tenant wave approval',
  'manual multi tenant rollout controls blocked',
  'ready',
  'blocked'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Enterprise governance/rollout-control dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} enterprise governance/rollout-control canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop enterprise rollout governance')}",
  "{ui('Manual governance approval layer for enterprise rollout. It combines rollout readiness, the closed-loop governance gate, release readiness, production surveillance, and learning review pressure without provisioning tenants, training models, changing policies, executing recommendations, or mutating operational state.')}",
  '<LocalizedLearningStatCard label="Governance decision"',
  '<LocalizedLearningStatCard label="Governance score"',
  '<LocalizedLearningStatCard label="Blocked checks"',
  '<LocalizedLearningStatCard label="Open review pressure"',
  "{ui('Governance owner:')}",
  "{ui('No enterprise rollout governance blockers are currently reported.')}",
  "{ui('Manual governance options:')}",
  "{ui('No enterprise rollout governance checks are available yet.')}",
  "{ui('Closed-loop multi-tenant rollout controls')}",
  "{ui('Manual control layer for tenant rollout waves. It checks enterprise governance, rollout readiness, audit traceability, monitoring, compliance attestation, and learning review pressure before any controlled tenant wave is manually approved. It does not provision tenants, enable tenants, train models, change policies, execute recommendations, or mutate operational state.')}",
  '<LocalizedLearningStatCard label="Control decision"',
  '<LocalizedLearningStatCard label="Control score"',
  "{ui('Control owner:')}",
  "{ui('Recommended wave mode:')}",
  "{ui('Default wave size:')}",
  "{ui('No multi-tenant rollout control blockers are currently reported.')}",
  "{ui('Manual control options:')}",
  "{ui('No multi-tenant rollout control checks are available yet.')}",
  'ui(formatLabel(check.check_status))',
  'formatLocalizedNumber(value, locale)'
]) if (!pageSource.includes(required)) fail(`Localized enterprise governance/rollout-controls presentation missing: ${required}`);
if (!process.exitCode) pass('Enterprise rollout governance and multi-tenant rollout controls use the multilingual presentation contract.');

const governanceStart = pageSource.indexOf('function ClosedLoopEnterpriseRolloutGovernance(');
const governanceEnd = pageSource.indexOf('function ClosedLoopMultiTenantRolloutControls(');
const controlsStart = governanceEnd;
const controlsEnd = pageSource.indexOf('function ClosedLoopEnterpriseAdoptionReadiness(');
for (const [name, start, end] of [
  ['enterprise rollout governance', governanceStart, governanceEnd],
  ['multi-tenant rollout controls', controlsStart, controlsEnd]
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
const protectedSystemFieldsV349188 = ['check_label', 'control_evidence', 'default_wave_size', 'governance_evidence', 'governance_note', 'manual_control_task', 'manual_governance_task', 'next_governance_focus', 'next_rollout_control_focus', 'recommended_wave_mode', 'rollout_control_note'];
const protectedHelpersV349188 = ['learningOwnedSystemText', 'learningCheckLabel', 'learningDomainLabel', 'learningEvidenceTypeLabel'];
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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Enterprise Governance & Multi-Tenant Rollout Controls multilingual gate passed.');
