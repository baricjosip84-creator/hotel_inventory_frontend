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
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const startMarker = '<div className="card__label">{ui("Selected intelligence and AI-assisted feature drilldown")}</div>';
const endMarker = '<div className="card__label">{ui("Production remediation workbench")}</div>';
const start = pageSource.indexOf(startMarker);
const end = pageSource.indexOf(endMarker, start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Selected Feature Drilldown / Full Feature Breakdown multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const label of [
  'Selected intelligence and AI-assisted feature drilldown',
  'Full intelligence and AI-assisted feature breakdown'
]) {
  if (!slice.includes(`ui("${label}")`) && !slice.includes(`ui('${label}')`)) fail(`Localized section missing: ${label}`);
}
if (!process.exitCode) pass('Selected Feature Drilldown and Full Feature Breakdown are inside the bounded multilingual slice.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Feature drilldown/breakdown ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Feature drilldown/breakdown slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Tenant data present',
  'Schema/source present but no tenant rows found',
  'Forecasting',
  'Inventory risk',
  'Procurement',
  'Operations',
  'Supplier risk',
  'Financial',
  'Optimization',
  'Enterprise operations',
  'Governance',
  'Safety',
  'Validation tests',
  'Governance & safety',
  'Operator experience',
  'Data evidence',
  'Workflow completion',
  'Table missing',
  'Global table — no tenant_id',
  'Tenant scoped',
  'Critical',
  'High',
  'Medium',
  'Low'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical feature/category/evidence display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} feature/category/evidence display labels are catalog-backed.`);

const forbidden = [
  '>Selected intelligence and AI-assisted feature drilldown<',
  "? 'Refreshing…' : 'Refresh feature detail'",
  '>Loading selected intelligence and AI-assisted feature detail…<',
  ": 'Unable to load selected intelligence and AI-assisted feature detail.'",
  "|| 'Selected feature'",
  '>Priority: ',
  '>Status: ',
  '>Score: ',
  '>Evidence: ',
  '>Production meaning<',
  '>Evidence meaning<',
  '>Next required completion<',
  '>Implemented capabilities in current code<',
  '>Open hardening items with acceptance criteria<',
  '% ready<',
  '>Evidence tables checked<',
  '<th>Table</th>',
  '<th>Exists</th>',
  '<th>Tenant scoped</th>',
  '<th>Rows</th>',
  '<th>Scope</th>',
  '>Full intelligence and AI-assisted feature breakdown<',
  '<th>Feature</th>',
  '<th>Priority</th>',
  '<th>Status</th>',
  '<th>Score</th>',
  '<th>Evidence</th>',
  '<th>Main gap</th>',
  "|| 'No gap reported'"
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only feature drilldown/breakdown presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned feature drilldown/breakdown presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(selectedFeature?.readiness_score), locale)',
  'formatLocalizedNumber(numberValue(item.readiness_score), locale)',
  'formatLocalizedNumber(numberValue(table.row_count), locale)',
  'formatLocalizedNumber(numberValue(feature.readiness_score), locale)',
  'formatLocalizedNumber(numberValue(feature.evidence?.tenant_data_rows), locale)',
  'formatLocalizedNumber(numberValue(feature.evidence?.existing_table_count), locale)',
  'formatLocalizedNumber(numberValue(feature.evidence?.expected_table_count), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware feature drilldown/breakdown number formatting missing: ${value}`);
if (!process.exitCode) pass('Feature drilldown/breakdown counts and readiness scores use the selected locale.');

const display = [
  'readinessCoreLabel(selectedFeature?.production_priority, ui)',
  'readinessCoreLabel(selectedFeature?.production_status, ui)',
  'readinessCoreLabel(featureDetail?.evidence_summary?.evidence_state, ui)',
  'readinessCoreLabel(featureDetail?.operator_summary?.production_meaning, ui)',
  'readinessCoreLabel(item.workstream, ui)',
  'readinessCoreLabel(item.production_priority, ui)',
  'readinessCoreLabel(table.evidence_scope, ui)',
  'readinessCoreLabel(feature.category, ui)',
  'readinessCoreLabel(feature.production_priority, ui)',
  'readinessCoreLabel(feature.production_status, ui)'
];
for (const value of display) if (!slice.includes(value)) fail(`Localized feature drilldown/breakdown display mapping missing: ${value}`);
if (!process.exitCode) pass('Known feature categories, statuses, priorities, workstreams, and evidence states use localized display mapping.');

const systemPresentation = [
  '<option key={feature.key} value={feature.key}>{localizedReadinessSystemText(feature.label, ui)}</option>',
  'localizedReadinessSystemText(selectedFeature.label, ui)',
  "ui('{feature}: {status}; {count} tenant evidence rows.')",
  'localizedReadinessSystemText(featureDetail?.operator_summary?.next_required_completion, ui)',
  'localizedReadinessSystemText(capability, ui)',
  'localizedReadinessSystemText(item.gap, ui)',
  'localizedReadinessSystemText(criterion.label, ui)',
  'localizedReadinessSystemText(criterion.verification, ui)',
  'localizedReadinessSystemText(featureDetail?.operator_summary?.safety_position, ui)',
  'localizedReadinessSystemText(feature.label, ui)'
];
for (const value of systemPresentation) if (!slice.includes(value)) fail(`System-owned feature drilldown localization missing: ${value}`);
const preservedData = ['featureDetailQuery.error.message', '<td>{table.table_name}</td>'];
for (const value of preservedData) if (!slice.includes(value)) fail(`Feature drilldown technical/error boundary missing: ${value}`);
for (const value of ['ui(featureDetailQuery.error.message)', 'localizedReadinessSystemText(table.table_name']) if (slice.includes(value)) fail(`Table names and API errors must remain untranslated: ${value}`);
if (!process.exitCode) pass('System-owned feature labels/capabilities/gaps/criteria are localized while evidence table names and API errors remain data.');

const canonical = [
  'tenant_data_present',
  'schema_or_source_present_but_no_tenant_rows_found',
  'forecasting',
  'inventory_risk',
  'procurement',
  'operations',
  'supplier_risk',
  'financial',
  'optimization',
  'enterprise_operations',
  'governance',
  'safety',
  'table_missing',
  'global_table_no_tenant_id',
  'tenant_scoped'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical feature/evidence identifier missing: ${value}`);
for (const value of canonical) if (pageSource.includes(`ui('${value}')`) || pageSource.includes(`ui("${value}")`)) fail(`Canonical feature/evidence identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Feature/category/evidence canonical identifiers remain language-independent.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Feature drilldown/breakdown slice must remain presentation-only and must not introduce mutation calls.');
else pass('Feature drilldown/breakdown slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}

if (!process.exitCode) pass('Tenant Intelligence Review Feature Drilldown & Breakdown multilingual gate passed.');
