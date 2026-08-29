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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_additional_growth_authorization_board"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_further_growth_exit_criteria_board"', start);
if (start < 0 || end < 0) { fail('Could not isolate additional-growth authorization/observation multilingual slice.'); process.exit(1); }
const slice = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_additional_growth_authorization_board','runtime_post_enablement_additional_growth_observation_board']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Additional Growth Authorization and Observation panels remain present and ordered before Further Growth Exit Criteria.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1,-1).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  return JSON.parse(`"${body}"`);
}
const literals=[];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing=[...new Set(literals.filter((key)=>!unique.has(key)) )];
if (missing.length) fail(`Additional-growth ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Additional-growth slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Critical','High','Medium','Low','Unknown','Not reported',
  'Tier 1 — Executive escalation','Tier 2 — Product/operations escalation','Tier 3 — Owner follow-up',
  'Additional growth authorization blocked until next-wave observation and runtime gap controls are closed',
  'Manual additional growth authorization ready after next-wave observation acceptance',
  'No runtime AI additional growth authorization rows required',
  'Executive sponsor, product owner, customer success owner, support owner, runtime health owner and rollback owner',
  'Product operations owner, product owner, customer success owner, support owner, runtime health owner and rollback owner',
  'Feature owner, customer success owner, support owner, runtime health owner and rollback owner',
  'Additional growth observation blocked until authorization and runtime gap controls are closed',
  'Manual additional growth observation ready after authorization acceptance',
  'No runtime AI additional growth observation rows required',
  'Executive sponsor, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Product operations owner, product owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Feature owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Daily until additional-growth runtime health is accepted',
  'Twice weekly until additional-growth runtime health is accepted',
  'Weekly until additional-growth runtime health is accepted'
];
const missingDynamic=dynamic.filter((key)=>!unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} status, owner, cadence, priority, and tier labels are catalog-backed.`);

const forbidden = [
  '>Intelligence runtime post-enablement additional growth authorization board<','>Authorization rows<','>Authorization status<','>Additional growth authorization rows<','>No additional growth authorization rows reported.<',
  '>Intelligence runtime post-enablement additional growth observation board<','>Observation rows<','>Observation status<','>Additional growth observation rows<','>No additional growth observation rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned additional-growth presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.additional_growth_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.blocked_additional_growth_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.executive_additional_growth_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.additional_growth_observation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.blocked_additional_growth_observation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.executive_additional_growth_observation_row_count), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Summary counts use selected locale.');

const display = [
  "readinessCoreLabel(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.additional_growth_authorization_status || 'not_reported', ui)",
  "readinessCoreLabel(row.additional_growth_authorization_status || 'not_reported', ui)",
  "readinessCoreLabel(row.additional_growth_authorization_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.additional_growth_observation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.additional_growth_observation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.additional_growth_observation_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.additional_growth_observation_cadence || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known states, owners, and additional-growth cadences use localized display mapping.');

const canonical = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_additional_growth_authorization_board'","'runtime_post_enablement_additional_growth_observation_board'","'runtime_post_enablement_further_growth_exit_criteria_board'",
  'additional_growth_authorization_blocked_until_next_wave_observation_and_runtime_gap_controls_are_closed',
  'manual_additional_growth_authorization_ready_after_next_wave_observation_acceptance',
  'additional_growth_observation_blocked_until_authorization_and_runtime_gap_controls_are_closed',
  'manual_additional_growth_observation_ready_after_authorization_acceptance'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')","ui('runtime_post_enablement_additional_growth_authorization_board')","ui('runtime_post_enablement_additional_growth_observation_board')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical statuses, and technical identifiers remain language-independent.');

const serverData = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.next_wave_observation_acceptance_condition || ui("Not reported")','row.additional_growth_business_condition || ui("Not reported")','row.additional_growth_scope_condition || ui("Not reported")','row.customer_success_additional_growth_condition || ui("Not reported")','row.support_additional_growth_condition || ui("Not reported")','row.runtime_monitoring_additional_growth_condition || ui("Not reported")','row.rollback_additional_growth_condition || ui("Not reported")',"row.required_additional_growth_authorization_evidence.join(', ')",
  'row.additional_growth_authorization_acceptance_condition || ui("Not reported")','row.additional_growth_tenant_scope_condition || ui("Not reported")','row.additional_growth_runtime_health_condition || ui("Not reported")','row.additional_growth_incident_condition || ui("Not reported")','row.customer_success_additional_growth_feedback_condition || ui("Not reported")','row.support_additional_growth_capacity_condition || ui("Not reported")','row.rollback_additional_growth_readiness_condition || ui("Not reported")','row.further_growth_condition || ui("Not reported")',"row.required_additional_growth_observation_evidence.join(', ')"
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend-returned data boundary missing: ${value}`);
for (const value of ['ui(row.feature_label)','ui(row.next_wave_observation_acceptance_condition)','ui(row.additional_growth_business_condition)','ui(row.required_additional_growth_authorization_evidence','ui(row.additional_growth_runtime_health_condition)','ui(row.required_additional_growth_observation_evidence','ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
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
if (!process.exitCode) console.log('Tenant Intelligence Review additional-growth authorization/observation multilingual hardening: PASS');
