import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/HumanInLoopAIReviewPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch { /* ignore non-row TypeScript */ }
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_steady_state_certification_renewal_board"');
const end = pageSource.indexOf('data-ai-contract-panel="final_completion_freeze_manifest"', start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Certification Renewal / Final Governance multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_steady_state_certification_renewal_board', 'runtime_final_governance_audit_pack']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Certification Renewal and Final Governance Audit panels remain present and ordered before Final Completion Freeze.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch { /* TypeScript catches malformed literals */ } }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Certification renewal/final governance ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Certification renewal/final governance slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Not reported',
  'Steady-state certification renewal blocked until resolution verification and runtime gap controls are closed',
  'Manual steady-state certification renewal ready after evidence refresh',
  'No runtime AI steady-state certification renewal rows required',
  'Executive sponsor, AI governance owner, product operations owner, customer success owner and support owner',
  'AI governance owner, product operations owner, customer success owner and support owner',
  'AI governance owner, feature owner, customer success owner and support owner',
  'Quarterly manual renewal or immediate renewal after recurrence-resolution verification',
  'Final governance audit blocked until certification renewal and runtime gaps are closed',
  'Manual final governance audit ready for freeze review',
  'No runtime AI final governance audit rows required'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} certification-renewal/final-governance states, owners, and cadence labels are catalog-backed.`);

const forbidden = [
  '>Intelligence runtime steady-state certification renewal board<', '>Renewal rows<', '>No steady-state certification renewal rows reported.<',
  '>Intelligence runtime final governance audit pack<', '>Audit rows<', '>No final governance audit rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned certification-renewal/final-governance presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.steady_state_certification_renewal_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.blocked_steady_state_certification_renewal_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.executive_steady_state_certification_renewal_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.product_operations_steady_state_certification_renewal_row_count), locale)',
  'formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateCertificationRenewalRows.length, locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeFinalGovernanceAuditPack?.final_governance_audit_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeFinalGovernanceAuditPack?.blocked_final_governance_audit_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeFinalGovernanceAuditPack?.ready_final_governance_audit_row_count), locale)',
  'formatLocalizedNumber(aiBlockedRuntimeFinalGovernanceAuditRows.length, locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Certification renewal and final audit counts use the selected locale.');

const display = [
  "readinessCoreLabel(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.steady_state_certification_renewal_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_certification_renewal_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_certification_renewal_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.certification_renewal_cadence || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimeFinalGovernanceAuditPack?.final_governance_audit_status || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimeFinalGovernanceAuditPack?.steady_state_certification_renewal_status || 'not_reported', ui)",
  "readinessCoreLabel(row.final_governance_audit_status || 'not_reported', ui)",
  "readinessCoreLabel(row.final_governance_audit_owner_hint || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known renewal/audit states, owners, and renewal cadence use localized display mapping.');

const canonical = [
  "production-readiness-summary${forceRefresh ? '?refresh=true' : ''}",
  "'runtime_post_enablement_steady_state_certification_renewal_board'", "'runtime_final_governance_audit_pack'", "'final_completion_freeze_manifest'",
  'steady_state_certification_renewal_blocked_until_resolution_verification_and_runtime_gap_controls_are_closed',
  'manual_steady_state_certification_renewal_ready_after_evidence_refresh',
  'final_governance_audit_blocked_until_certification_renewal_and_runtime_gaps_are_closed',
  'manual_final_governance_audit_ready_for_freeze_review'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')", "ui('runtime_post_enablement_steady_state_certification_renewal_board')", "ui('runtime_final_governance_audit_pack')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical statuses, and technical identifiers remain language-independent.');

const serverData = [
  'row.feature_label || row.feature_key || ui("AI feature")',
  'row.certification_expiration_condition || ui("Not reported")',
  'row.monitoring_history_review_condition || ui("Not reported")',
  'row.recertification_output_condition || ui("Not reported")',
  "row.required_steady_state_certification_renewal_evidence.join(', ')",
  'row.final_governance_audit_release_rule || ui("Not reported")',
  'row.contract_freeze_review_condition || ui("Not reported")',
  'row.runtime_evidence_review_condition || ui("Not reported")',
  'row.completion_output_condition || ui("Not reported")',
  "row.required_final_governance_audit_evidence.join(', ')"
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend-returned data boundary missing: ${value}`);
for (const value of ['ui(row.feature_label)', 'ui(row.certification_expiration_condition)', 'ui(row.monitoring_history_review_condition)', 'ui(row.recertification_output_condition)', 'ui(row.required_steady_state_certification_renewal_evidence', 'ui(row.final_governance_audit_release_rule)', 'ui(row.contract_freeze_review_condition)', 'ui(row.runtime_evidence_review_condition)', 'ui(row.completion_output_condition)', 'ui(row.required_final_governance_audit_evidence', 'ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Backend feature labels, rules, conditions, evidence codes, and API errors remain data.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Slice must remain presentation-only and must not introduce mutation calls.');
else pass('Slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) pass('Tenant Intelligence Review Certification Renewal & Final Governance multilingual gate passed.');
