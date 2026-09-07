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
if (!process.exitCode) pass('Audit/compliance slice uses the shared tenant translation and locale runtime.');

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
  'manual audit evidence required',
  'ready for manual audit retention',
  'available',
  'missing',
  'gap recorded',
  'manual review required',
  'open exceptions recorded',
  'certification blocked',
  'ready for manual compliance attestation',
  'manual compliance attestation blocked',
  'attestable',
  'blocked'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Audit/compliance dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} audit/compliance canonical display values are catalog-backed.`);

for (const required of [
  "{ui('Closed-loop audit ledger')}",
  "{ui('Manual audit-retention ledger for feedback evidence, coverage, impact, exceptions, and certification traceability.')}",
  '<LocalizedLearningStatCard label="Audit decision"',
  '<LocalizedLearningStatCard label="Audit score"',
  '<LocalizedLearningStatCard label="Ready entries"',
  '<LocalizedLearningStatCard label="Blocked entries"',
  "{ui('Owner:')}",
  "{ui('Next focus:')}",
  "<th>{ui('Stage')}</th>",
  "<th>{ui('Retention')}</th>",
  "<th>{ui('Manual audit task')}</th>",
  'ui(formatLabel(entry.ledger_status))',
  'formatLocalizedNumber(entry.evidence_count ?? 0, locale)',
  "{ui('No audit ledger entries are available yet.')}",
  "{ui('Closed-loop compliance attestation')}",
  "{ui('Manual compliance attestation for audit retention, certification, release/monitoring controls, and the non-autonomous safety contract.')}",
  '<LocalizedLearningStatCard label="Attestation decision"',
  '<LocalizedLearningStatCard label="Attestation score"',
  '<LocalizedLearningStatCard label="Attestable checks"',
  'ui(formatLabel(check.check_status))',
  "{ui('No compliance attestation checks are available yet.')}"
]) if (!pageSource.includes(required)) fail(`Localized audit/compliance presentation missing: ${required}`);
if (!process.exitCode) pass('Closed-loop audit ledger and compliance attestation presentation use the multilingual contract.');

const auditStart = pageSource.indexOf('function ClosedLoopAuditLedger(');
const auditEnd = pageSource.indexOf('function ClosedLoopComplianceAttestation(');
const attestationStart = auditEnd;
const attestationEnd = pageSource.indexOf('function ClosedLoopCommercialReadinessPacket(');
for (const [name, start, end] of [
  ['audit ledger', auditStart, auditEnd],
  ['compliance attestation', attestationStart, attestationEnd]
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
const protectedSystemFieldsV349188 = ['attestation_evidence', 'attestation_note', 'audit_ledger_note', 'check_label', 'evidence_reference', 'ledger_key', 'ledger_stage', 'manual_attestation_task', 'manual_audit_task', 'next_attestation_focus', 'next_audit_focus', 'recommended_attestation_owner', 'recommended_audit_owner', 'retention_requirement'];
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

if (!process.exitCode) pass('Tenant Decision Learning Feedback Audit & Compliance multilingual gate passed.');
