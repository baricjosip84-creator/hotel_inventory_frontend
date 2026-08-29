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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_rollout_growth_authorization_board"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_rollout_growth_next_step_gate"', start);
if (start < 0 || end < 0) { fail('Could not isolate rollout growth authorization/observation multilingual slice.'); process.exit(1); }
const slice = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_rollout_growth_authorization_board','runtime_post_enablement_rollout_growth_observation_board']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Rollout Growth Authorization Board and Growth Observation Board remain present and ordered before Next-Step Gate.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1,-1).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  return JSON.parse(`"${body}"`);
}
const literals=[];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing=[...new Set(literals.filter((key)=>!unique.has(key)))];
if (missing.length) fail(`Growth authorization/observation ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Growth authorization/observation slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Critical','High','Medium','Low','Unknown','Not reported',
  'Tier 1 — Executive escalation','Tier 2 — Product/operations escalation','Tier 3 — Owner follow-up',
  'Rollout growth authorization blocked until expanded-scope health and runtime gap controls are closed',
  'Manual rollout growth authorization ready after expanded-scope health acceptance',
  'No runtime AI rollout growth authorization rows required',
  'Executive sponsor, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Product operations owner, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Feature owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Same business day until executive rollout growth authorization is recorded',
  'Next business day until product operations rollout growth authorization is recorded',
  'Weekly until owner rollout growth authorization is recorded',
  'Rollout growth observation blocked until growth authorization and runtime gap controls are closed',
  'Manual rollout growth observation ready after growth authorization',
  'No runtime AI rollout growth observation rows required',
  'Daily until growth-scope runtime health is accepted',
  'Twice weekly until growth-scope runtime health is accepted',
  'Weekly until growth-scope runtime health is accepted'
];
const missingDynamic=dynamic.filter((key)=>!unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} status, owner, cadence, priority, and tier labels are catalog-backed.`);

const forbidden = [
  '>Intelligence runtime post-enablement rollout growth authorization board<','>Growth rows<','>Blocked growth rows<','>Executive growth rows<','>Growth authorization status<','>Rollout growth authorization rows<','>No rollout growth authorization rows reported.<',
  '>Intelligence runtime post-enablement rollout growth observation board<','>Growth observation status<','>Rollout growth observation rows<','>No rollout growth observation rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned rollout-growth authorization/observation presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.rollout_growth_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.blocked_rollout_growth_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.executive_rollout_growth_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.rollout_growth_observation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.blocked_rollout_growth_observation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.executive_rollout_growth_observation_row_count), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Summary counts use selected locale.');

const display = [
  "readinessCoreLabel(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.rollout_growth_authorization_status || 'not_reported', ui)",
  "readinessCoreLabel(row.rollout_growth_authorization_status || 'not_reported', ui)",
  "readinessCoreLabel(row.rollout_growth_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.rollout_growth_review_cadence || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementRolloutGrowthObservationBoard?.rollout_growth_observation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.rollout_growth_observation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.rollout_growth_observation_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.rollout_growth_observation_cadence || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known states, owners, and cadences use localized display mapping.');

const canonical = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_rollout_growth_authorization_board'","'runtime_post_enablement_rollout_growth_observation_board'","'runtime_post_enablement_rollout_growth_next_step_gate'",
  'rollout_growth_authorization_blocked_until_expanded_scope_health_and_runtime_gap_controls_are_closed',
  'manual_rollout_growth_authorization_ready_after_expanded_scope_health_acceptance',
  'rollout_growth_observation_blocked_until_growth_authorization_and_runtime_gap_controls_are_closed',
  'manual_rollout_growth_observation_ready_after_growth_authorization'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')","ui('runtime_post_enablement_rollout_growth_authorization_board')","ui('runtime_post_enablement_rollout_growth_observation_board')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical statuses, and technical identifiers remain language-independent.');

const serverData = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.expanded_scope_health_acceptance_condition || ui("Not reported")','row.rollout_growth_business_justification_condition || ui("Not reported")','row.customer_success_growth_condition || ui("Not reported")','row.support_capacity_growth_condition || ui("Not reported")','row.rollback_growth_scope_condition || ui("Not reported")','row.growth_scope_monitoring_condition || ui("Not reported")',"row.required_rollout_growth_authorization_evidence.join(', ')",
  'row.growth_authorization_acceptance_condition || ui("Not reported")','row.growth_scope_tenant_sample_condition || ui("Not reported")','row.growth_scope_runtime_health_condition || ui("Not reported")','row.growth_scope_incident_condition || ui("Not reported")','row.customer_success_growth_feedback_condition || ui("Not reported")','row.support_growth_capacity_condition || ui("Not reported")','row.rollback_growth_readiness_condition || ui("Not reported")','row.next_growth_step_condition || ui("Not reported")',"row.required_rollout_growth_observation_evidence.join(', ')",
  'readinessQuery.error instanceof ApiError','? readinessQuery.error.message'
];
for (const value of serverData) if (!pageSource.includes(value)) fail(`Backend data boundary changed: ${value}`);
for (const value of ['ui(row.feature_label)','ui(row.expanded_scope_health_acceptance_condition)','ui(row.rollout_growth_business_justification_condition)','ui(row.required_rollout_growth_authorization_evidence','ui(row.growth_scope_runtime_health_condition)','ui(row.required_rollout_growth_observation_evidence','ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Backend feature labels, conditions, evidence codes, and API errors remain data.');

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
if (!process.exitCode) console.log('Tenant Intelligence Review rollout growth authorization/observation multilingual hardening: PASS');
