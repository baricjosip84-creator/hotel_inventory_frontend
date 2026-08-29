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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_steady_state_exception_recurrence_resolution_board"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_steady_state_certification_renewal_board"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate steady-state recurrence resolution/resolution verification multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_steady_state_exception_recurrence_resolution_board', 'runtime_post_enablement_steady_state_exception_resolution_verification_board']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Steady-State Recurrence Resolution and Resolution Verification panels remain present and ordered before Certification Renewal.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch { /* TypeScript catches malformed literals */ } }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Steady-state recurrence resolution/verification ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Steady-state recurrence resolution/verification slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Not reported',
  'Steady-state exception recurrence resolution blocked until recurrence audit and runtime gap controls are closed',
  'Manual steady-state exception recurrence resolution ready after recurrence audit acceptance',
  'No runtime AI steady-state exception recurrence resolution rows required',
  'Steady-state exception resolution verification blocked until recurrence resolution and runtime gap controls are closed',
  'Manual steady-state exception resolution verification ready after resolution acceptance',
  'No runtime AI steady-state exception resolution verification rows required',
  'Executive sponsor, product operations owner, runtime health owner, customer success owner and support owner',
  'Product operations owner, runtime health owner, customer success owner and support owner',
  'Feature owner, runtime health owner, customer success owner and support owner'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} status and owner labels are catalog-backed.`);

const forbidden = [
  '>Intelligence runtime steady-state exception recurrence resolution board<', '>Resolution rows<', '>No steady-state exception recurrence resolution rows reported.<',
  '>Intelligence runtime steady-state exception resolution verification board<', '>Verification rows<', '>No steady-state exception resolution verification rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned recurrence resolution/verification presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.steady_state_exception_recurrence_resolution_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.blocked_steady_state_exception_recurrence_resolution_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.executive_steady_state_exception_recurrence_resolution_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.product_operations_steady_state_exception_recurrence_resolution_row_count), locale)',
  'formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.length, locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.steady_state_exception_resolution_verification_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.blocked_steady_state_exception_resolution_verification_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.executive_steady_state_exception_resolution_verification_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.product_operations_steady_state_exception_resolution_verification_row_count), locale)',
  'formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.length, locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Summary and warning counts use the selected locale.');

const display = [
  "readinessCoreLabel(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.steady_state_exception_recurrence_resolution_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_exception_recurrence_resolution_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_exception_recurrence_resolution_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.steady_state_exception_resolution_verification_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_exception_resolution_verification_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_exception_resolution_verification_owner_hint || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known recurrence-resolution/verification states and owners use localized display mapping.');

const canonical = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_steady_state_exception_recurrence_resolution_board'", "'runtime_post_enablement_steady_state_exception_resolution_verification_board'", "'runtime_post_enablement_steady_state_certification_renewal_board'",
  'steady_state_exception_recurrence_resolution_blocked_until_recurrence_audit_and_runtime_gap_controls_are_closed',
  'manual_steady_state_exception_recurrence_resolution_ready_after_recurrence_audit_acceptance',
  'steady_state_exception_resolution_verification_blocked_until_recurrence_resolution_and_runtime_gap_controls_are_closed',
  'manual_steady_state_exception_resolution_verification_ready_after_resolution_acceptance'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')", "ui('runtime_post_enablement_steady_state_exception_recurrence_resolution_board')", "ui('runtime_post_enablement_steady_state_exception_resolution_verification_board')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical statuses, and technical identifiers remain language-independent.');

const serverData = [
  'row.feature_label || row.feature_key || ui("AI feature")',
  'row.steady_state_exception_recurrence_resolution_condition || ui("Not reported")',
  'row.recurrence_root_cause_condition || ui("Not reported")',
  'row.recurrence_prevention_condition || ui("Not reported")',
  'row.monitoring_reentry_condition || ui("Not reported")',
  "row.required_steady_state_exception_recurrence_resolution_evidence.join(', ')",
  'row.resolution_effectiveness_condition || ui("Not reported")',
  'row.resolution_monitoring_sample_condition || ui("Not reported")',
  'row.recertification_decision_condition || ui("Not reported")',
  "row.required_steady_state_exception_resolution_verification_evidence.join(', ')"
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend-returned data boundary missing: ${value}`);
for (const value of ['ui(row.feature_label)', 'ui(row.steady_state_exception_recurrence_resolution_condition)', 'ui(row.recurrence_root_cause_condition)', 'ui(row.recurrence_prevention_condition)', 'ui(row.required_steady_state_exception_recurrence_resolution_evidence', 'ui(row.resolution_effectiveness_condition)', 'ui(row.resolution_monitoring_sample_condition)', 'ui(row.recertification_decision_condition)', 'ui(row.required_steady_state_exception_resolution_verification_evidence', 'ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Backend feature labels, conditions, evidence codes, and API errors remain data.');

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
if (!process.exitCode) pass('Tenant Intelligence Review Steady-State Recurrence Resolution & Resolution Verification multilingual gate passed.');
