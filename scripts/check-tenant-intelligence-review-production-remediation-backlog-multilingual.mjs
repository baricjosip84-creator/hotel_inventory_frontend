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

const startMarker = '<div className="card__label">{ui("Production remediation workbench")}</div>';
const endMarker = '<span>{ui("Recommendation review controls")}</span>';
const start = pageSource.indexOf(startMarker);
const end = pageSource.indexOf(endMarker, start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Production Remediation Workbench / Production Backlog multilingual tail.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const label of [
  'Production remediation workbench',
  'Production backlog from existing intelligence and AI-assisted features'
]) {
  if (!slice.includes(`ui("${label}")`) && !slice.includes(`ui('${label}')`)) fail(`Localized section missing: ${label}`);
}
if (!process.exitCode) pass('Production Remediation Workbench and Production Backlog are inside the bounded multilingual tail.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Production remediation/backlog ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Production remediation/backlog tail has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Open remediation actions',
  'No open remediation actions',
  'Critical',
  'High',
  'Medium',
  'Low',
  'Validation tests',
  'Governance & safety',
  'Operator experience',
  'Data evidence',
  'Workflow completion',
  'Production candidate — tests and hardening required',
  'Implemented — tenant data and tests required',
  'Architecture present — workflow completion required',
  'Not production ready yet',
  'Table missing',
  'Global table — no tenant_id',
  'Tenant scoped'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical remediation/backlog display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} remediation/backlog status, priority, workstream, and evidence labels are catalog-backed.`);

const forbidden = [
  '>Production remediation workbench<',
  '>Loading intelligence and AI-assisted production remediation workbench…<',
  ": 'Unable to load intelligence and AI-assisted production remediation workbench.'",
  '>Workbench: ',
  '>Open: ',
  '>Critical: ',
  '>High: ',
  '>Evidence gaps: ',
  'Workstreams: {',
  '}% ready<',
  '>Endpoints: ',
  '>Evidence gaps: ',
  '>Acceptance: ',
  '>Validation: ',
  '>No remediation actions reported.<',
  '>This workbench is still read-only.',
  '>Production backlog from existing intelligence and AI-assisted features<',
  '>No production backlog reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only remediation/backlog presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned remediation/backlog presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(remediationWorkbench?.totals?.open_actions), locale)',
  'formatLocalizedNumber(numberValue(remediationWorkbench?.totals?.critical_actions), locale)',
  'formatLocalizedNumber(numberValue(remediationWorkbench?.totals?.high_actions), locale)',
  'formatLocalizedNumber(numberValue(remediationWorkbench?.totals?.actions_with_evidence_gaps), locale)',
  'formatLocalizedNumber(numberValue(value), locale)',
  'formatLocalizedNumber(numberValue(action.readiness_score), locale)',
  'formatLocalizedNumber(numberValue(item.readiness_score), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware remediation/backlog number formatting missing: ${value}`);
if (!process.exitCode) pass('Remediation/backlog counts and readiness scores use the selected locale.');

const display = [
  'readinessCoreLabel(remediationWorkbench?.workbench_status, ui)',
  'readinessCoreLabel(key, ui)',
  'readinessCoreLabel(action.production_priority, ui)',
  'readinessCoreLabel(action.workstream, ui)',
  'readinessCoreLabel(gap.evidence_risk, ui)',
  'readinessCoreLabel(item.production_priority, ui)',
  'readinessCoreLabel(item.production_status, ui)'
];
for (const value of display) if (!slice.includes(value)) fail(`Localized remediation/backlog display mapping missing: ${value}`);
if (!process.exitCode) pass('Known remediation statuses, priorities, workstreams, evidence risks, and backlog statuses use localized display mapping.');

const serverData = [
  'remediationWorkbenchQuery.error.message',
  '<strong>{action.feature_label}</strong>: {action.gap}',
  'action.target_endpoints.slice(0, 3).join',
  'gap.table_name',
  'action.acceptance_criteria[0].label',
  'action.suggested_validation.slice(0, 2).join',
  '<strong>{item.feature_label}</strong>: {item.gap}'
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend/business remediation data boundary missing: ${value}`);
for (const value of [
  'ui(remediationWorkbenchQuery.error.message)',
  'ui(action.feature_label)',
  'ui(action.gap)',
  'ui(endpoint)',
  'ui(gap.table_name)',
  'ui(action.acceptance_criteria[0].label)',
  'ui(action.suggested_validation',
  'ui(item.feature_label)',
  'ui(item.gap)'
]) if (slice.includes(value)) fail(`Backend-returned remediation/backlog data must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Feature labels, gaps, endpoints, evidence-table names, acceptance criteria, validation commands, and API errors remain backend/business data.');

const canonical = [
  'open_remediation_actions',
  'no_open_remediation_actions',
  'validation_tests',
  'governance_safety',
  'operator_experience',
  'data_evidence',
  'workflow_completion',
  'production_candidate_needs_tests_and_hardening',
  'implemented_needs_tenant_data_and_tests',
  'architecture_present_needs_workflow_completion',
  'not_production_ready_yet',
  'table_missing',
  'global_table_no_tenant_id',
  'tenant_scoped'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical remediation/backlog identifier missing: ${value}`);
for (const value of canonical) if (pageSource.includes(`ui('${value}')`) || pageSource.includes(`ui("${value}")`)) fail(`Canonical remediation/backlog identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Remediation/backlog canonical identifiers remain language-independent.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Production remediation/backlog presentation slice must not introduce mutation calls.');
else pass('Production remediation/backlog tail remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const rawText = slice.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
  return match ? [match[1].trim()] : [];
}).filter(Boolean);
if (rawText.length) fail(`Raw JSX presentation remains in the completed Readiness tail: ${rawText.join(' | ')}`);
else pass('Production Remediation / Backlog slice has no raw JSX presentation remaining.');

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}

if (!process.exitCode) pass('Tenant Intelligence Review Production Remediation & Backlog multilingual gate passed.');
