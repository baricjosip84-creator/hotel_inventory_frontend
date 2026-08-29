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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_broad_release_readiness_board"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_health_watchlist"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review broad-release/tenant-enablement multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);
for (const panel of ['runtime_broad_release_readiness_board', 'runtime_tenant_enablement_control_queue']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Broad-release/tenant-enablement contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Runtime Broad Release Readiness Board and Runtime Tenant Enablement Control Queue remain present and ordered before post-enablement health monitoring.');

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
if (missingLiterals.length) fail(`Broad-release/tenant-enablement ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Broad-release/tenant-enablement slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Tier 1 — Executive escalation', 'Tier 2 — Product/operations escalation', 'Tier 3 — Owner follow-up',
  'Broad release blocked until post-closure evidence is accepted or waiver is time-boxed',
  'Manual broad release review ready after evidence acceptance',
  'Broad release blocked until post-closure acceptance or time-boxed waiver evidence exists',
  'Manual broad release review ready after post-closure evidence acceptance',
  'No runtime AI broad release readiness rows required',
  'Executive sponsor, product owner, operations owner, security owner, support owner and release manager',
  'Product owner, operations owner, support owner, feature owner and release manager',
  'Feature owner, operations owner, support owner and release manager',
  'Tenant enablement blocked until broad release evidence and waiver controls are closed',
  'Tenant enablement control ready for manual feature flag rollout review',
  'Tenant enablement blocked until broad release and waiver controls are closed',
  'Manual tenant enablement review ready after broad release controls',
  'No runtime AI tenant enablement control rows required',
  'Executive sponsor, release manager, product owner, operations owner, support owner and customer success owner',
  'Release manager, product owner, operations owner, support owner and customer success owner',
  'Release manager, feature owner, support owner and customer success owner'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Broad-release/tenant-enablement canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} release, enablement, owner, priority, and tier labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence runtime broad release readiness board<', '>Readiness rows<', '>Blocked release rows<', '>Executive release rows<',
  '>Broad release status<', '>Broad-release readiness rows<', '>No broad-release readiness rows reported.<',
  '>Intelligence runtime tenant enablement control queue<', '>Control rows<', '>Blocked enablement rows<', '>Executive enablement rows<',
  '>Tenant enablement status<', '>Tenant enablement control rows<', '>No tenant enablement control rows reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Broad-release/tenant-enablement slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Broad-release/tenant-enablement frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRuntimeBroadReleaseReadinessBoard?.readiness_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeBroadReleaseReadinessBoard?.blocked_readiness_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeBroadReleaseReadinessBoard?.executive_readiness_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeTenantEnablementControlQueue?.control_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeTenantEnablementControlQueue?.blocked_control_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeTenantEnablementControlQueue?.executive_control_row_count), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Broad-release/tenant-enablement locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Broad-release/tenant-enablement summary counts use the selected application locale.');

const displayContracts = [
  "readinessCoreLabel(aiRuntimeBroadReleaseReadinessBoard?.broad_release_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.escalation_tier || 'unknown', ui)",
  "readinessCoreLabel(row.broad_release_readiness_status || 'not_reported', ui)",
  "readinessCoreLabel(row.release_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimeTenantEnablementControlQueue?.tenant_enablement_status || 'not_reported', ui)",
  "readinessCoreLabel(row.tenant_enablement_control_status || 'not_reported', ui)",
  "readinessCoreLabel(row.enablement_owner_hint || 'not_reported', ui)"
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known broad-release/tenant-enablement canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known priorities, tiers, release/enablement states, and owner hints use localized display mapping.');

const canonicalContracts = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_broad_release_readiness_board'", "'runtime_tenant_enablement_control_queue'", "'runtime_post_enablement_health_watchlist'",
  'broad_release_blocked_until_post_closure_evidence_is_accepted_or_waiver_is_time_boxed',
  'manual_broad_release_review_ready_after_evidence_acceptance',
  'tenant_enablement_blocked_until_broad_release_evidence_and_waiver_controls_are_closed',
  'tenant_enablement_control_ready_for_manual_feature_flag_rollout_review'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Broad-release/tenant-enablement canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')",
  "ui('runtime_broad_release_readiness_board')", "ui('runtime_tenant_enablement_control_queue')",
  "ui('broad_release_blocked_until_post_closure_evidence_is_accepted_or_waiver_is_time_boxed')",
  "ui('tenant_enablement_control_ready_for_manual_feature_flag_rollout_review')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical broad-release/tenant-enablement identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, release/enablement identifiers, and backend contracts remain language-independent.');

const serverDataContracts = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.release_due_policy || ui("Not reported")',
  'row.release_decision_rule || ui("Not reported")',
  'row.rollback_condition || ui("Not reported")',
  "row.required_broad_release_evidence.join(', ')",
  'row.enablement_due_policy || ui("Not reported")',
  'row.enablement_decision_rule || ui("Not reported")',
  'row.feature_flag_condition || ui("Not reported")',
  'row.customer_success_condition || ui("Not reported")',
  "row.required_tenant_enablement_evidence.join(', ')",
  'readinessQuery.error instanceof ApiError', '? readinessQuery.error.message'
];
for (const contract of serverDataContracts) if (!pageSource.includes(contract)) fail(`Backend broad-release/tenant-enablement data boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(row.feature_label)', 'ui(row.release_due_policy)', 'ui(row.release_decision_rule)', 'ui(row.rollback_condition)',
  'ui(row.required_broad_release_evidence', 'ui(row.enablement_due_policy)', 'ui(row.enablement_decision_rule)',
  'ui(row.feature_flag_condition)', 'ui(row.customer_success_condition)', 'ui(row.required_tenant_enablement_evidence',
  'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned broad-release/tenant-enablement content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend feature labels, due/decision/rollback conditions, evidence codes, and API errors remain data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Broad-release/tenant-enablement slice must remain presentation-only and must not introduce mutation calls.');
else pass('Broad-release/tenant-enablement slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review broad-release/tenant-enablement multilingual hardening: PASS');
