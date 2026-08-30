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
  "ledger?.audit_ledger_note || ui('Manual audit ledger remains advisory only.')",
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
  "attestation?.attestation_note || ui('Manual compliance attestation remains advisory only.')",
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

for (const required of [
  "formatLabel(ledger?.recommended_audit_owner || 'decision_governance_owner')",
  "formatLabel(ledger?.next_audit_focus || 'retain_closed_loop_certification_audit_record')",
  'blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)',
  '<td>{formatLabel(entry.ledger_stage || entry.ledger_key)}</td>',
  '<td>{formatLabel(entry.evidence_reference)}</td>',
  '<td>{formatLabel(entry.retention_requirement)}</td>',
  '<td>{formatLabel(entry.manual_audit_task)}</td>',
  "formatLabel(attestation?.recommended_attestation_owner || 'platform_governance_owner')",
  "formatLabel(attestation?.next_attestation_focus || 'record_manual_closed_loop_compliance_attestation')",
  '<td>{formatLabel(check.check_label || check.check_key)}</td>',
  '<td>{formatLabel(check.current_value)}</td>',
  '<td>{formatLabel(check.required_value)}</td>',
  '<td>{formatLabel(check.attestation_evidence)}</td>',
  '<td>{formatLabel(check.manual_attestation_task)}</td>'
]) if (!pageSource.includes(required)) fail(`Expected backend-data boundary missing: ${required}`);
for (const forbidden of [
  'ui(formatLabel(ledger?.recommended_audit_owner',
  'ui(formatLabel(ledger?.next_audit_focus',
  'ui(formatLabel(blocker))',
  'ui(formatLabel(entry.ledger_stage',
  'ui(formatLabel(entry.evidence_reference))',
  'ui(formatLabel(entry.retention_requirement))',
  'ui(formatLabel(entry.manual_audit_task))',
  'ui(formatLabel(attestation?.recommended_attestation_owner',
  'ui(formatLabel(attestation?.next_attestation_focus',
  'ui(formatLabel(check.check_label',
  'ui(formatLabel(check.current_value))',
  'ui(formatLabel(check.required_value))',
  'ui(formatLabel(check.attestation_evidence))',
  'ui(formatLabel(check.manual_attestation_task))'
]) if (pageSource.includes(forbidden)) fail(`Backend audit/compliance data must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend ledger stages/evidence/retention/tasks/blockers/owners and attestation checks/current-required/evidence/tasks remain raw.');

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
