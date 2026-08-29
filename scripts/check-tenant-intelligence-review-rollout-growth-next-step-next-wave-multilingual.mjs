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
  } catch { /* ignore */ }
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_rollout_growth_next_step_gate"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_additional_growth_authorization_board"', start);
if (start < 0 || end < 0) { fail('Could not isolate rollout growth next-step/next-wave multilingual slice.'); process.exit(1); }
const slice = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_rollout_growth_next_step_gate','runtime_post_enablement_next_wave_observation_board']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Rollout Growth Next-Step Gate and Next-Wave Observation Board remain present and ordered before Additional Growth Authorization.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1,-1).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  return JSON.parse(`"${body}"`);
}
const literals=[];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing=[...new Set(literals.filter((key)=>!unique.has(key)))];
if (missing.length) fail(`Next-step/next-wave ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Next-step/next-wave slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Critical','High','Medium','Low','Unknown','Not reported',
  'Tier 1 — Executive escalation','Tier 2 — Product/operations escalation','Tier 3 — Owner follow-up',
  'Next growth step blocked until growth observation and runtime gap controls are closed',
  'Manual next growth step gate ready after growth observation acceptance',
  'No runtime AI next growth step gate rows required',
  'Executive sponsor, product owner, customer success owner, support owner, runtime health owner and rollback owner',
  'Product operations owner, customer success owner, support owner, runtime health owner and rollback owner',
  'Feature owner, customer success owner, support owner, runtime health owner and rollback owner',
  'Next-wave observation blocked until next growth step gate and runtime gap controls are closed',
  'Manual next-wave observation ready after next growth step gate acceptance',
  'No runtime AI next-wave observation rows required',
  'Executive sponsor, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Product operations owner, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Feature owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Daily until next-wave runtime health is accepted',
  'Twice weekly until next-wave runtime health is accepted',
  'Weekly until next-wave runtime health is accepted'
];
const missingDynamic=dynamic.filter((key)=>!unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} status, owner, cadence, priority, and tier labels are catalog-backed.`);

const forbidden = [
  '>Intelligence runtime post-enablement rollout growth next-step gate<','>Gate rows<','>Blocked gate rows<','>Executive gate rows<','>Next-step gate status<','>Rollout growth next-step gate rows<','>No rollout growth next-step gate rows reported.<',
  '>Intelligence runtime post-enablement next-wave observation board<','>Next-wave status<','>Next-wave observation rows<','>No next-wave observation rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned next-step/next-wave presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.next_growth_step_gate_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.blocked_next_growth_step_gate_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.executive_next_growth_step_gate_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.next_wave_observation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.blocked_next_wave_observation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.executive_next_wave_observation_row_count), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Summary counts use selected locale.');

const display = [
  "readinessCoreLabel(aiRuntimePostEnablementRolloutGrowthNextStepGate?.next_growth_step_gate_status || 'not_reported', ui)",
  "readinessCoreLabel(row.next_growth_step_gate_status || 'not_reported', ui)",
  "readinessCoreLabel(row.next_growth_step_gate_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementNextWaveObservationBoard?.next_wave_observation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.next_wave_observation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.next_wave_observation_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.next_wave_observation_cadence || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known states, owners, and next-wave cadences use localized display mapping.');

const canonical = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_rollout_growth_next_step_gate'","'runtime_post_enablement_next_wave_observation_board'","'runtime_post_enablement_additional_growth_authorization_board'",
  'next_growth_step_blocked_until_growth_observation_and_runtime_gap_controls_are_closed',
  'manual_next_growth_step_gate_ready_after_growth_observation_acceptance',
  'next_wave_observation_blocked_until_next_growth_step_gate_and_runtime_gap_controls_are_closed',
  'manual_next_wave_observation_ready_after_next_growth_step_gate_acceptance'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')","ui('runtime_post_enablement_rollout_growth_next_step_gate')","ui('runtime_post_enablement_next_wave_observation_board')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical statuses, and technical identifiers remain language-independent.');

const serverData = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.next_growth_step_gate_due_policy || ui("Not reported")',
  'row.growth_observation_acceptance_condition || ui("Not reported")','row.next_growth_business_condition || ui("Not reported")','row.customer_success_capacity_condition || ui("Not reported")','row.support_capacity_condition || ui("Not reported")','row.runtime_monitoring_condition || ui("Not reported")','row.rollback_owner_condition || ui("Not reported")','row.next_growth_step_release_condition || ui("Not reported")',"row.required_next_growth_step_gate_evidence.join(', ')",
  'row.next_growth_step_gate_acceptance_condition || ui("Not reported")','row.next_wave_tenant_scope_condition || ui("Not reported")','row.next_wave_runtime_health_condition || ui("Not reported")','row.next_wave_incident_condition || ui("Not reported")','row.customer_success_next_wave_feedback_condition || ui("Not reported")','row.support_next_wave_capacity_condition || ui("Not reported")','row.rollback_next_wave_readiness_condition || ui("Not reported")','row.additional_growth_condition || ui("Not reported")',"row.required_next_wave_observation_evidence.join(', ')"
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend-returned data boundary missing: ${value}`);
for (const value of ['ui(row.feature_label)','ui(row.next_growth_step_gate_due_policy)','ui(row.growth_observation_acceptance_condition)','ui(row.required_next_growth_step_gate_evidence','ui(row.next_wave_runtime_health_condition)','ui(row.required_next_wave_observation_evidence','ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Backend feature labels, due policies, conditions, evidence codes, and API errors remain data.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Slice must remain presentation-only and must not introduce mutation calls.');
else pass('Slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'",'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ','TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ','<HumanInLoopAIReviewPage />']) if (!routerSource.includes(value)) fail(`Route/permission contract changed: ${value}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review rollout growth next-step/next-wave multilingual hardening: PASS');
