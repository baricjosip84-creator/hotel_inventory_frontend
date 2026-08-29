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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_steady_state_monitoring_cadence_board"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_steady_state_exception_closure_board"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate steady-state monitoring cadence/exception review multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_steady_state_monitoring_cadence_board', 'runtime_post_enablement_steady_state_monitoring_exception_review_queue']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Steady-State Monitoring Cadence and Exception Review panels remain present and ordered before Exception Closure.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch { /* TypeScript catches malformed literals */ } }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Steady-state monitoring/exception-review ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Steady-state monitoring/exception-review slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Tier 1 — Executive escalation', 'Tier 2 — Product/operations escalation', 'Tier 3 — Owner follow-up',
  'Steady-state monitoring cadence blocked until certification and runtime gap controls are closed',
  'Manual steady-state monitoring cadence ready after certification acceptance',
  'No runtime AI steady-state monitoring cadence rows required',
  'Steady-state exception review blocked until cadence and runtime gap controls are closed',
  'Manual steady-state exception review ready after monitoring cadence acceptance',
  'No runtime AI steady-state exception review rows required',
  'Executive sponsor, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Product operations owner, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Feature owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Executive sponsor, runtime health owner, customer success owner, support owner and rollback owner',
  'Product operations owner, runtime health owner, customer success owner, support owner and rollback owner'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} status, owner, priority, and tier labels are catalog-backed.`);

const forbidden = [
  '>Intelligence runtime post-enablement steady-state monitoring cadence board<', '>Cadence rows<', '>Cadence status<', '>Steady-state monitoring cadence rows<', '>No steady-state monitoring cadence rows reported.<',
  '>Intelligence runtime steady-state exception review queue<', '>Exception rows<', '>Product/Ops rows<', '>No steady-state exception review rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned steady-state monitoring/exception-review presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.steady_state_monitoring_cadence_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.blocked_steady_state_monitoring_cadence_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.executive_steady_state_monitoring_cadence_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.steady_state_exception_review_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.blocked_steady_state_exception_review_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.executive_steady_state_exception_review_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.product_operations_steady_state_exception_review_row_count), locale)',
  'formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateMonitoringExceptionRows.length, locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Summary and warning counts use the selected locale.');

const display = [
  "readinessCoreLabel(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.steady_state_monitoring_cadence_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'priority', ui)",
  "readinessCoreLabel(row.escalation_tier || 'tier', ui)",
  "readinessCoreLabel(row.steady_state_monitoring_cadence_status || 'cadence_status', ui)",
  "readinessCoreLabel(row.steady_state_monitoring_cadence_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.steady_state_exception_review_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_exception_review_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_exception_review_owner_hint || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known states, owners, priorities, and tiers use localized display mapping.');

const canonical = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_steady_state_monitoring_cadence_board'", "'runtime_post_enablement_steady_state_monitoring_exception_review_queue'", "'runtime_post_enablement_steady_state_exception_closure_board'",
  'steady_state_monitoring_cadence_blocked_until_certification_and_runtime_gap_controls_are_closed',
  'manual_steady_state_monitoring_cadence_ready_after_certification_acceptance',
  'steady_state_exception_review_blocked_until_cadence_and_runtime_gap_controls_are_closed',
  'manual_steady_state_exception_review_ready_after_monitoring_cadence_acceptance'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')", "ui('runtime_post_enablement_steady_state_monitoring_cadence_board')", "ui('runtime_post_enablement_steady_state_monitoring_exception_review_queue')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical statuses, and technical identifiers remain language-independent.');

const serverData = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.steady_state_certification_acceptance_condition || ui("Not reported")',
  'row.recurring_runtime_health_review_condition || ui("Not reported")',
  'row.recurring_incident_review_condition || ui("Not reported")',
  'row.customer_success_feedback_cadence_condition || ui("Not reported")',
  'row.support_escalation_cadence_condition || ui("Not reported")',
  'row.rollback_reconfirmation_cadence_condition || ui("Not reported")',
  'row.steady_state_monitoring_cadence_condition || ui("Not reported")',
  "row.required_steady_state_monitoring_cadence_evidence.join(', ')",
  'row.steady_state_exception_review_condition || ui("Not reported")',
  "row.required_steady_state_exception_review_evidence.join(', ')"
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend-returned data boundary missing: ${value}`);
for (const value of ['ui(row.feature_label)', 'ui(row.steady_state_certification_acceptance_condition)', 'ui(row.recurring_runtime_health_review_condition)', 'ui(row.required_steady_state_monitoring_cadence_evidence', 'ui(row.steady_state_exception_review_condition)', 'ui(row.required_steady_state_exception_review_evidence', 'ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
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
if (!process.exitCode) pass('Tenant Intelligence Review Steady-State Monitoring Cadence & Exception Review multilingual gate passed.');
