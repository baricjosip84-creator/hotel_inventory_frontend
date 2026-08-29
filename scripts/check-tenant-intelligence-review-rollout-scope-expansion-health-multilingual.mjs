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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_rollout_scope_expansion_authorization_board"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_rollout_growth_authorization_board"', start);
if (start < 0 || end < 0) { fail('Could not isolate rollout scope-expansion/expanded-scope-health multilingual slice.'); process.exit(1); }
const slice = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_rollout_scope_expansion_authorization_board','runtime_post_enablement_expanded_scope_health_board']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Scope Expansion Authorization Board and Expanded-Scope Health Board remain present and ordered before Rollout Growth Authorization Board.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1,-1).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  return JSON.parse(`"${body}"`);
}
const literals=[];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing=[...new Set(literals.filter((key)=>!unique.has(key)))];
if (missing.length) fail(`Scope-expansion/expanded-scope-health ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Scope-expansion/expanded-scope-health slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Critical','High','Medium','Low','Unknown','Not reported',
  'Tier 1 — Executive escalation','Tier 2 — Product/operations escalation','Tier 3 — Owner follow-up',
  'Scope expansion authorization blocked until post-resume observation and runtime gap controls are closed',
  'Manual scope expansion authorization ready after post-resume observation acceptance',
  'No runtime AI rollout scope expansion authorization rows required',
  'Executive sponsor, product owner, runtime health owner, customer success owner and support owner',
  'Product operations owner, product owner, runtime health owner, customer success owner and support owner',
  'Feature owner, runtime health owner, customer success owner and support owner',
  'Same business day until executive scope expansion authorization is recorded',
  'Next business day until product operations scope expansion authorization is recorded',
  'Weekly until owner scope expansion authorization is recorded',
  'Expanded-scope health validation blocked until scope expansion authorization and runtime gap controls are closed',
  'Manual expanded-scope health validation ready after scope expansion authorization',
  'No runtime AI expanded-scope health rows required',
  'Executive sponsor, runtime health owner, customer success owner, support owner and rollback owner',
  'Product operations owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Feature owner, runtime health owner, customer success owner, support owner and rollback owner',
  'Same business day until executive expanded-scope health acceptance is recorded',
  'Next business day until product operations expanded-scope health acceptance is recorded',
  'Weekly until owner expanded-scope health acceptance is recorded'
];
const missingDynamic=dynamic.filter((key)=>!unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} status, owner, cadence, priority, and tier labels are catalog-backed.`);

const forbidden = [
  '>Intelligence runtime post-enablement rollout scope expansion authorization board<','>Expansion rows<','>Blocked expansion rows<','>Executive expansion rows<','>Expansion status<','>Rollout scope-expansion authorization rows<','>No rollout scope-expansion authorization rows reported.<',
  '>Intelligence runtime post-enablement expanded scope health board<','>Health rows<','>Blocked health rows<','>Executive health rows<','>Expanded-scope health status<','>Expanded-scope health rows<','>No expanded-scope health rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned scope-expansion/expanded-scope-health presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.expansion_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.blocked_expansion_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.executive_expansion_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.expanded_scope_health_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.blocked_expanded_scope_health_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.executive_expanded_scope_health_row_count), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Summary counts use selected locale.');

const display = [
  "readinessCoreLabel(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.rollout_scope_expansion_authorization_status || 'not_reported', ui)",
  "readinessCoreLabel(row.rollout_scope_expansion_authorization_status || 'not_reported', ui)",
  "readinessCoreLabel(row.expansion_authorization_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.expansion_authorization_cadence || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementExpandedScopeHealthBoard?.expanded_scope_health_status || 'not_reported', ui)",
  "readinessCoreLabel(row.expanded_scope_health_status || 'not_reported', ui)",
  "readinessCoreLabel(row.expanded_scope_health_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.expanded_scope_health_cadence || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known states, owners, and cadences use localized display mapping.');

const canonical = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_rollout_scope_expansion_authorization_board'","'runtime_post_enablement_expanded_scope_health_board'","'runtime_post_enablement_rollout_growth_authorization_board'",
  'scope_expansion_authorization_blocked_until_post_resume_observation_and_runtime_gap_controls_are_closed',
  'manual_scope_expansion_authorization_ready_after_post_resume_observation_acceptance',
  'expanded_scope_health_validation_blocked_until_scope_expansion_authorization_and_runtime_gap_controls_are_closed',
  'manual_expanded_scope_health_validation_ready_after_scope_expansion_authorization'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')","ui('runtime_post_enablement_rollout_scope_expansion_authorization_board')","ui('runtime_post_enablement_expanded_scope_health_board')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical statuses, and technical identifiers remain language-independent.');

const serverData = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.limited_scope_health_condition || ui("Not reported")','row.tenant_scope_expansion_condition || ui("Not reported")','row.customer_success_expansion_condition || ui("Not reported")','row.rollback_expanded_scope_condition || ui("Not reported")','row.expanded_scope_monitoring_condition || ui("Not reported")',"row.required_rollout_scope_expansion_authorization_evidence.join(', ')",
  'row.expanded_scope_tenant_sample_condition || ui("Not reported")','row.expanded_scope_runtime_health_condition || ui("Not reported")','row.expanded_scope_customer_success_condition || ui("Not reported")','row.expanded_scope_incident_condition || ui("Not reported")','row.expanded_scope_rollback_condition || ui("Not reported")','row.further_rollout_growth_condition || ui("Not reported")',"row.required_expanded_scope_health_evidence.join(', ')",
  'readinessQuery.error instanceof ApiError','? readinessQuery.error.message'
];
for (const value of serverData) if (!pageSource.includes(value)) fail(`Backend data boundary changed: ${value}`);
for (const value of ['ui(row.feature_label)','ui(row.limited_scope_health_condition)','ui(row.tenant_scope_expansion_condition)','ui(row.required_rollout_scope_expansion_authorization_evidence','ui(row.expanded_scope_runtime_health_condition)','ui(row.required_expanded_scope_health_evidence','ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
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
if (!process.exitCode) console.log('Tenant Intelligence Review rollout scope-expansion/expanded-scope-health multilingual hardening: PASS');
