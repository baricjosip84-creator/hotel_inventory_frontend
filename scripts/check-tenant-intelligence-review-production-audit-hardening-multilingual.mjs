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

const startMarker = '<div className="card__label">{ui("Production audit pack")}</div>';
const endMarker = '<div className="card__label">{ui("Production evidence matrix")}</div>';
const start = pageSource.indexOf(startMarker);
const end = pageSource.indexOf(endMarker, start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Production Audit Pack / Production Hardening Plan multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const label of ['Production audit pack', 'Production hardening plan']) {
  if (!slice.includes(`ui("${label}")`) && !slice.includes(`ui('${label}')`)) fail(`Localized section missing: ${label}`);
}
if (!process.exitCode) pass('Production Audit Pack and Production Hardening Plan are both inside the bounded multilingual slice.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch { /* TypeScript catches malformed literals */ } }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Production audit/hardening ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Production audit/hardening slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Production candidate — final tests pending', 'Not production ready',
  'Hardening required', 'No open hardening items',
  'Validation tests', 'Governance & safety', 'Operator experience', 'Data evidence', 'Workflow completion',
  'No tenant evidence rows found', 'Workflow or hardening incomplete',
  'Critical', 'High', 'Medium', 'Low', 'Not reported'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Production audit/hardening canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} audit/hardening states, priorities, workstreams, and blocker reasons are catalog-backed.`);

const forbidden = [
  '>Production audit pack<', '>Certification:', '>Evidence tables:', '>Tenant scoped:', '>Tenant rows:',
  '>Evidence-table coverage<', '>Tenant-scope coverage<', '>Tenant-data coverage<', '>Critical/high blockers<',
  '>Production hardening plan<', '>Required before production<', '>Acceptance:'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned Production Audit Pack / Hardening Plan presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(auditPack?.audit_totals?.existing_evidence_tables), locale)',
  'formatLocalizedNumber(numberValue(auditPack?.audit_totals?.expected_evidence_tables), locale)',
  'formatLocalizedNumber(numberValue(auditPack?.audit_totals?.tenant_scoped_evidence_tables), locale)',
  'formatLocalizedNumber(numberValue(auditPack?.audit_totals?.tenant_evidence_rows), locale)',
  'formatLocalizedNumber(numberValue(auditPack?.audit_totals?.critical_or_high_blockers), locale)',
  'formatLocalizedNumber(numberValue(auditPack?.coverage?.evidence_table_coverage_percent), locale)',
  'formatLocalizedNumber(numberValue(auditPack?.coverage?.tenant_scoped_table_coverage_percent), locale)',
  'formatLocalizedNumber(numberValue(auditPack?.coverage?.tenant_data_feature_coverage_percent), locale)',
  'formatLocalizedNumber(numberValue(blocker.readiness_score), locale)',
  'formatLocalizedNumber(numberValue(hardeningPlan?.total_backlog_items), locale)',
  'formatLocalizedNumber(numberValue(hardeningPlan?.scheduled_items), locale)',
  'formatLocalizedNumber(numberValue(phase.phase), locale)',
  'formatLocalizedNumber(numberValue(phase.item_count), locale)',
  'formatLocalizedNumber(numberValue(item.readiness_score), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Audit, coverage, blocker, backlog, phase, and readiness counts use the selected locale.');

const display = [
  "readinessCoreLabel(auditPack?.certification_status || 'not_reported', ui)",
  "readinessCoreLabel(blocker.blocker_reason || 'not_reported', ui)",
  "readinessCoreLabel(blocker.production_priority || 'not_reported', ui)",
  "readinessCoreLabel(blocker.production_status || 'not_reported', ui)",
  "readinessCoreLabel(hardeningPlan?.plan_status || 'not_reported', ui)",
  "readinessCoreLabel(hardeningPlan?.release_gate?.current_status || 'not_reported', ui)",
  "readinessCoreLabel(item.workstream || 'not_reported', ui)",
  "readinessCoreLabel(item.production_priority || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known certification, plan, blocker, priority, status, and workstream values use localized display mapping.');

const systemPresentation = [
  'hardeningPlan.release_gate.required_before_production.map((item)',
  'localizedReadinessSystemText(item, ui)',
  'localizedReadinessSystemText(phase.label, ui)',
  'localizedReadinessSystemText(phase.description, ui)',
  'localizedReadinessSystemText(item.feature_label, ui)',
  'localizedReadinessSystemText(item.gap, ui)',
  'localizedReadinessSystemText(item.acceptance_criteria[0].label, ui)'
];
for (const value of systemPresentation) if (!slice.includes(value)) fail(`System-owned audit/hardening localization missing: ${value}`);
const preservedData = ['blocker.feature_label', "auditPack.missing_evidence_tables.slice(0, 10).join(', ')", 'hardeningPlanQuery.error.message'];
for (const value of preservedData) if (!slice.includes(value)) fail(`Audit/hardening technical or error boundary missing: ${value}`);
for (const value of ['ui(hardeningPlanQuery.error.message)', 'localizedReadinessSystemText(hardeningPlanQuery.error.message']) if (slice.includes(value)) fail(`API errors must remain untranslated: ${value}`);
if (!process.exitCode) pass('System-owned hardening rules/phases/gaps are localized while table names and API errors remain data.');

const canonical = [
  "production-readiness-summary${forceRefresh ? '?refresh=true' : ''}",
  'production_candidate_pending_final_tests', 'not_production_ready', 'hardening_required', 'no_open_hardening_items',
  'validation_tests', 'governance_safety', 'operator_experience', 'data_evidence', 'workflow_completion',
  'no_tenant_evidence_rows_found', 'workflow_or_hardening_incomplete'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed or display mapping missing: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')", "ui('production_candidate_pending_final_tests')", "ui('validation_tests')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint and canonical status/workstream/reason identifiers remain language-independent.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Slice must remain presentation-only and must not introduce mutation calls.');
else pass('Production audit/hardening slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}

if (!process.exitCode) pass('Tenant Intelligence Review Production Audit & Hardening multilingual gate passed.');
