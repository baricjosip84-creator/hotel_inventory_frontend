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
const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_health_watchlist"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_incident_closure_board"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review post-enablement health/incident-response multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_health_watchlist', 'runtime_post_enablement_incident_response_queue']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Post-enablement health/incident contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Runtime Post-Enablement Health Watchlist and Incident Response Queue remain present and ordered before Incident Closure Board.');

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literalKeys = [];
for (const match of sliceSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TypeScript catches malformed literals */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Post-enablement health/incident ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Post-enablement health/incident slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Tier 1 — Executive escalation', 'Tier 2 — Product/operations escalation', 'Tier 3 — Owner follow-up',
  'Post-enablement health watch blocked until tenant enablement controls are closed',
  'Post-enablement health watch ready after manual tenant enablement',
  'Post-enablement health watch blocked until tenant enablement and waiver controls are closed',
  'Manual post-enablement health watch ready after tenant enablement controls',
  'No runtime AI post-enablement health watch rows required',
  'Executive sponsor, release manager, operations owner, support owner, customer success owner and monitoring owner',
  'Release manager, operations owner, support owner, customer success owner and monitoring owner',
  'Feature owner, support owner, customer success owner and monitoring owner',
  'Daily for first 7 days, then weekly until runtime health is stable',
  'Twice weekly for first 14 days, then weekly until runtime health is stable',
  'Weekly until runtime health is stable',
  'Incident response blocked until post-enablement health controls are closed',
  'Manual incident response queue ready after post-enablement health watch',
  'Incident response blocked until post-enablement health and runtime gap controls are closed',
  'No runtime AI post-enablement incident response rows required',
  'Executive sponsor, incident commander, support owner, customer success owner and rollback owner',
  'Product/operations incident commander, support owner, customer success owner and rollback owner',
  'Feature owner, support owner, customer success owner and rollback owner',
  'Same business day for critical post-enablement AI incidents until stable',
  'Next business day for high-priority post-enablement AI incidents until stable',
  'Weekly review for watchlisted post-enablement AI incident signals'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Post-enablement health/incident canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} health, incident, owner, cadence, priority, and tier labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence runtime post-enablement health watchlist<', '>Watch rows<', '>Blocked watch rows<', '>Executive watch rows<',
  '>Health watch status<', '>Post-enablement health watch rows<', '>No post-enablement health watch rows reported.<',
  '>Intelligence runtime post-enablement incident response queue<', '>Incident rows<', '>Blocked incident rows<', '>Executive incident rows<',
  '>Incident status<', '>Post-enablement incident response rows<', '>No post-enablement incident response rows reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Post-enablement health/incident slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Post-enablement health/incident frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementHealthWatchlist?.watch_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementHealthWatchlist?.blocked_watch_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementHealthWatchlist?.executive_watch_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentResponseQueue?.incident_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentResponseQueue?.blocked_incident_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentResponseQueue?.executive_incident_row_count), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Post-enablement health/incident locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Post-enablement health/incident summary counts use the selected application locale.');

const displayContracts = [
  "readinessCoreLabel(aiRuntimePostEnablementHealthWatchlist?.post_enablement_health_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.escalation_tier || 'unknown', ui)",
  "readinessCoreLabel(row.post_enablement_health_status || 'not_reported', ui)",
  "readinessCoreLabel(row.health_watch_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.health_watch_cadence || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementIncidentResponseQueue?.incident_response_status || 'not_reported', ui)",
  "readinessCoreLabel(row.incident_response_status || 'not_reported', ui)",
  "readinessCoreLabel(row.incident_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.incident_review_cadence || 'not_reported', ui)"
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known post-enablement health/incident canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known priorities, tiers, health/incident states, owner hints, and cadences use localized display mapping.');

const canonicalContracts = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_health_watchlist'", "'runtime_post_enablement_incident_response_queue'", "'runtime_post_enablement_incident_closure_board'",
  'post_enablement_health_watch_blocked_until_tenant_enablement_controls_are_closed',
  'manual_post_enablement_health_watch_ready_after_tenant_enablement_controls',
  'incident_response_blocked_until_post_enablement_health_controls_are_closed',
  'manual_incident_response_queue_ready_after_post_enablement_health_watch'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Post-enablement health/incident canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')",
  "ui('runtime_post_enablement_health_watchlist')", "ui('runtime_post_enablement_incident_response_queue')",
  "ui('post_enablement_health_watch_blocked_until_tenant_enablement_controls_are_closed')",
  "ui('incident_response_blocked_until_post_enablement_health_controls_are_closed')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical post-enablement health/incident identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, health/incident identifiers, and backend contracts remain language-independent.');

const serverDataContracts = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.health_watch_decision_rule || ui("Not reported")',
  'row.rollout_freeze_condition || ui("Not reported")',
  'row.rollback_reconfirmation_condition || ui("Not reported")',
  "row.required_post_enablement_health_evidence.join(', ')",
  'row.incident_decision_rule || ui("Not reported")',
  'row.rollout_pause_condition || ui("Not reported")',
  'row.rollback_decision_condition || ui("Not reported")',
  'row.customer_communication_condition || ui("Not reported")',
  "row.required_incident_response_evidence.join(', ')",
  'readinessQuery.error instanceof ApiError', '? readinessQuery.error.message'
];
for (const contract of serverDataContracts) if (!pageSource.includes(contract)) fail(`Backend post-enablement health/incident data boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(row.feature_label)', 'ui(row.health_watch_decision_rule)', 'ui(row.rollout_freeze_condition)',
  'ui(row.rollback_reconfirmation_condition)', 'ui(row.required_post_enablement_health_evidence',
  'ui(row.incident_decision_rule)', 'ui(row.rollout_pause_condition)', 'ui(row.rollback_decision_condition)',
  'ui(row.customer_communication_condition)', 'ui(row.required_incident_response_evidence', 'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned post-enablement health/incident content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend feature labels, decision/rollout/rollback/customer conditions, evidence codes, and API errors remain data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Post-enablement health/incident slice must remain presentation-only and must not introduce mutation calls.');
else pass('Post-enablement health/incident slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review post-enablement health/incident multilingual hardening: PASS');
