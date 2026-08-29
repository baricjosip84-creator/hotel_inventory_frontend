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

const start = pageSource.indexOf('data-ai-contract-panel="route_exposure_audit"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_remediation_worklist"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review route/runtime multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);

for (const panel of ['route_exposure_audit', 'runtime_coverage_audit']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Route/runtime contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Route Exposure Audit and Runtime Coverage Audit remain present and ordered before runtime remediation.');

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
if (missingLiterals.length) fail(`Route/runtime ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Route/runtime slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Route contract missing', 'Route contract registered',
  'Frontend query contract drift detected', 'Frontend query contract aligned',
  'Frontend API path contract drift detected', 'Frontend API path contract aligned',
  'Decision Intelligence Read',
  'Runtime coverage gaps detected', 'Runtime coverage contracts present',
  'Runtime coverage gap detected', 'Runtime coverage contract present',
  'No backend endpoint registered for feature', 'No frontend consumer registered for feature',
  'No tenant runtime evidence rows', 'Registered evidence schema not fully present'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Route/runtime canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} route/runtime canonical status, permission, priority, and gap labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence route exposure audit<', '>Route contract status<', '>Expected routes<', '>Frontend query status<', '>Query keys<',
  '>Frontend API path status<', '>Required permission<', '>Unpermissioned routes allowed<', '>Registered route exposure rows<',
  '>Intelligence runtime coverage audit<', '>Backend endpoints<', '>Frontend consumers<', '>Runtime coverage score<',
  '>Features with runtime gaps<', '>High-priority runtime gaps<', '>Runtime coverage rows<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Route/runtime slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Route/runtime frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRouteExposureAudit?.expected_route_count), locale)',
  'formatLocalizedNumber(numberValue(aiRouteExposureAudit?.unique_frontend_query_key_count), locale)',
  'formatLocalizedNumber(numberValue(aiRouteExposureAudit?.expected_frontend_query_key_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeCoverageAudit?.registered_backend_endpoint_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeCoverageAudit?.registered_frontend_consumer_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeCoverageAudit?.average_runtime_coverage_score), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeCoverageAudit?.features_with_runtime_gaps_count), locale)',
  'formatLocalizedNumber(numberValue(row.runtime_coverage_score), locale)',
  'formatLocalizedNumber(numberValue(row.backend_endpoint_count), locale)',
  'formatLocalizedNumber(numberValue(row.frontend_consumer_count), locale)',
  'formatLocalizedNumber(numberValue(row.tenant_runtime_evidence_rows), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Route/runtime locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Route/runtime counts, percentages, and coverage metrics use the selected application locale.');

const displayContracts = [
  'readinessCoreLabel(aiRouteExposureAudit?.route_contract_status, ui)',
  'readinessCoreLabel(aiRouteExposureAudit?.frontend_query_contract_status, ui)',
  'readinessCoreLabel(aiRouteExposureAudit?.frontend_api_path_contract_status, ui)',
  'readinessCoreLabel(aiRouteExposureAudit?.protected_by_permission, ui)',
  'readinessCoreLabel(row.required_permission, ui)',
  "readinessCoreLabel(aiRuntimeCoverageAudit?.runtime_coverage_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.runtime_coverage_status || 'not_reported', ui)",
  'row.open_runtime_gaps?.map((gap) => readinessCoreLabel(gap, ui))',
  'row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui))'
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known route/runtime canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known route/runtime statuses, permission display, priorities, and runtime-gap codes use localized display mapping.');

const canonicalContracts = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'route_exposure_audit'", "'runtime_coverage_audit'", "'runtime_remediation_worklist'",
  'route_contract_registered', 'frontend_query_contract_aligned', 'frontend_api_path_contract_aligned',
  'DECISION_INTELLIGENCE_READ', 'runtime_coverage_gaps_detected', 'runtime_coverage_contract_present',
  'no_backend_endpoint_registered_for_feature', 'registered_evidence_schema_not_fully_present'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Route/runtime canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')", 'ui("/intelligence-readiness/production-readiness-summary")',
  "ui('route_exposure_audit')", "ui('runtime_coverage_audit')", "ui('runtime_remediation_worklist')",
  "ui('route_contract_registered')", "ui('frontend_query_contract_aligned')", "ui('DECISION_INTELLIGENCE_READ')",
  "ui('runtime_coverage_gaps_detected')", "ui('no_backend_endpoint_registered_for_feature')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical route/runtime identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, canonical route/runtime statuses, permission code, and gap codes remain language-independent.');

const technicalDataContracts = [
  '<strong>{row.route_path}</strong>', 'row.controller_export', 'row.frontend_query_key', "row.frontend_api_path || '—'",
  "aiRouteExposureAudit?.frontend_api_base_path || '/intelligence-readiness'",
  "aiRouteExposureAudit.misaligned_frontend_api_paths.join(', ')",
  '<strong>{row.feature_label}</strong>'
];
for (const contract of technicalDataContracts) if (!sliceSource.includes(contract)) fail(`Route/runtime technical/backend-data boundary changed: ${contract}`);
const forbiddenDataTranslation = [
  'ui(row.route_path)', 'ui(row.controller_export)', 'ui(row.frontend_query_key)', 'ui(row.frontend_api_path)',
  'ui(aiRouteExposureAudit?.frontend_api_base_path)', 'ui(row.feature_label)'
];
for (const pattern of forbiddenDataTranslation) if (sliceSource.includes(pattern)) fail(`Technical/backend route/runtime data must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Route paths, controller exports, frontend query/API paths, and backend feature labels remain canonical data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Route/runtime audit slice must remain read-only and must not introduce mutation calls.');
else pass('Route/runtime audit slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review route/runtime multilingual hardening: PASS');
