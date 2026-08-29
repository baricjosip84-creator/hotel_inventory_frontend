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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_further_growth_exit_criteria_board"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_steady_state_monitoring_cadence_board"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate further-growth exit/steady-state certification multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_further_growth_exit_criteria_board', 'runtime_post_enablement_steady_state_certification_board']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Further Growth Exit Criteria and Steady-State Certification panels remain present and ordered before Steady-State Monitoring Cadence.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch { /* TypeScript catches malformed literals */ } }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Further-growth exit/steady-state certification ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Further-growth exit/steady-state certification slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Tier 1 — Executive escalation', 'Tier 2 — Product/operations escalation', 'Tier 3 — Owner follow-up',
  'Further growth exit blocked until additional growth observation and runtime gap controls are closed',
  'Manual further growth exit ready after additional growth observation acceptance',
  'No runtime AI further growth exit rows required',
  'Steady-state certification blocked until further growth exit and runtime gap controls are closed',
  'Manual steady-state certification ready after further growth exit acceptance',
  'No runtime AI steady-state certification rows required',
  'Executive sponsor, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Product operations owner, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Feature owner, runtime health owner, customer success owner, support owner and rollback owner'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} status, owner, priority, and tier labels are catalog-backed.`);

const forbidden = [
  '>Intelligence runtime post-enablement further growth exit criteria board<', '>Exit rows<', '>Exit status<', '>Further growth exit rows<', '>No further growth exit rows reported.<',
  '>Intelligence runtime post-enablement steady-state certification board<', '>Certification rows<', '>Certification status<', '>Steady-state certification rows<', '>No steady-state certification rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned further-growth exit/steady-state certification presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.further_growth_exit_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.blocked_further_growth_exit_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.executive_further_growth_exit_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.steady_state_certification_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.blocked_steady_state_certification_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.executive_steady_state_certification_row_count), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Summary counts use the selected locale.');

const display = [
  "readinessCoreLabel(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.further_growth_exit_status || 'not_reported', ui)",
  "readinessCoreLabel(row.further_growth_exit_status || 'not_reported', ui)",
  "readinessCoreLabel(row.further_growth_exit_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementSteadyStateCertificationBoard?.steady_state_certification_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_certification_status || 'not_reported', ui)",
  "readinessCoreLabel(row.steady_state_certification_owner_hint || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known states and owners use localized display mapping.');

const canonical = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_further_growth_exit_criteria_board'", "'runtime_post_enablement_steady_state_certification_board'", "'runtime_post_enablement_steady_state_monitoring_cadence_board'",
  'further_growth_exit_blocked_until_additional_growth_observation_and_runtime_gap_controls_are_closed',
  'manual_further_growth_exit_ready_after_additional_growth_observation_acceptance',
  'steady_state_certification_blocked_until_further_growth_exit_and_runtime_gap_controls_are_closed',
  'manual_steady_state_certification_ready_after_further_growth_exit_acceptance'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')", "ui('runtime_post_enablement_further_growth_exit_criteria_board')", "ui('runtime_post_enablement_steady_state_certification_board')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical statuses, and technical identifiers remain language-independent.');

const serverData = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.additional_growth_observation_acceptance_condition || ui("Not reported")',
  'row.runtime_health_stability_condition || ui("Not reported")',
  'row.incident_free_window_condition || ui("Not reported")',
  'row.customer_success_exit_condition || ui("Not reported")',
  'row.support_exit_condition || ui("Not reported")',
  'row.rollback_exit_condition || ui("Not reported")',
  'row.further_growth_exit_condition || ui("Not reported")',
  "row.required_further_growth_exit_evidence.join(', ')",
  'row.further_growth_exit_acceptance_condition || ui("Not reported")',
  'row.runtime_health_baseline_condition || ui("Not reported")',
  'row.incident_review_condition || ui("Not reported")',
  'row.customer_success_certification_condition || ui("Not reported")',
  'row.support_certification_condition || ui("Not reported")',
  'row.rollback_certification_condition || ui("Not reported")',
  'row.steady_state_certification_condition || ui("Not reported")',
  "row.required_steady_state_certification_evidence.join(', ')"
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend-returned data boundary missing: ${value}`);
for (const value of ['ui(row.feature_label)', 'ui(row.additional_growth_observation_acceptance_condition)', 'ui(row.runtime_health_stability_condition)', 'ui(row.required_further_growth_exit_evidence', 'ui(row.further_growth_exit_acceptance_condition)', 'ui(row.runtime_health_baseline_condition)', 'ui(row.required_steady_state_certification_evidence', 'ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Backend feature labels, conditions, evidence codes, and API errors remain data.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Slice must remain presentation-only and must not introduce mutation calls.');
else pass('Slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />']) if (!routerSource.includes(value)) fail(`Route/permission contract changed: ${value}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review further-growth exit/steady-state certification multilingual hardening: PASS');
