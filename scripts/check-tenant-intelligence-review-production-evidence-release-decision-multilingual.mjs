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
  try { const row = JSON.parse(trimmed.slice(0, -1)); if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row); } catch { }
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);
const startMarker = '<div className="card__label">{ui("Production evidence matrix")}</div>';
const endMarker = '<div className="card__label">{ui("Production operational runbook")}</div>';
const start = pageSource.indexOf(startMarker);
const end = pageSource.indexOf(endMarker, start);
if (start < 0 || end < 0 || end <= start) { fail('Could not isolate Production Evidence Matrix / Release Decision Board multilingual slice.'); process.exit(1); }
const slice = pageSource.slice(start, end);
for (const label of ['Production evidence matrix', 'Production release decision board']) if (!slice.includes(`ui("${label}")`) && !slice.includes(`ui('${label}')`)) fail(`Localized section missing: ${label}`);
if (!process.exitCode) pass('Production Evidence Matrix and Production Release Decision Board are inside the bounded multilingual slice.');
const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) { if (literal.startsWith('"')) return JSON.parse(literal); const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); return JSON.parse(`"${body}"`); }
const literals=[]; for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing=[...new Set(literals.filter((key)=>!unique.has(key)))];
if (missing.length) fail(`Evidence/release ui() literals missing translations: ${missing.join(' | ')}`); else pass(`Evidence/release slice has ${new Set(literals).size} catalog-backed literal UI keys.`);
const dynamic=['Evidence gaps require hardening','Required evidence ready for final tests','Missing schema','Global unscoped review required','No tenant rows','Tenant evidence present','Table missing','Global table — no tenant_id','Tenant scoped','No-go — production blocked','Conditional go — governance acceptance required','Go — ready for final production tests','Critical/high feature blocker','Required evidence gap','Failed signoff item','Critical','High','Not reported'];
const missingDynamic=dynamic.filter((key)=>!unique.has(key)); if(missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`); else pass(`${dynamic.length} matrix, risk, scope, decision, blocker, severity, and fallback labels are catalog-backed.`);
const forbidden=['>Production evidence matrix<','>Matrix:','>Evidence rows:','>Existing tables:','>Required gaps:','>Required evidence gaps before production<','>Production release decision board<','>Decision:','>Watch:','>Critical/high hardening:','>Recommendation:','>Production without waiver:','>Release blockers<','>Resolution:','>Required final test evidence<'];
for(const value of forbidden) if(slice.includes(value)) fail(`English-only presentation remains: ${value}`); if(!process.exitCode) pass('Frontend-owned evidence/release presentation uses the shared translation contract.');
const numeric=['formatLocalizedNumber(numberValue(evidenceMatrix?.totals?.total_rows), locale)','formatLocalizedNumber(numberValue(evidenceMatrix?.totals?.existing_tables), locale)','formatLocalizedNumber(numberValue(evidenceMatrix?.totals?.tenant_scoped_tables), locale)','formatLocalizedNumber(numberValue(evidenceMatrix?.totals?.required_gaps), locale)','formatLocalizedNumber(numberValue(count), locale)','formatLocalizedNumber(numberValue(gap.row_count), locale)','formatLocalizedNumber(numberValue(releaseDecisionBoard?.release_decision_inputs?.blocker_count), locale)','formatLocalizedNumber(numberValue(releaseDecisionBoard?.release_decision_inputs?.watch_item_count), locale)','formatLocalizedNumber(numberValue(releaseDecisionBoard?.release_decision_inputs?.critical_high_hardening_item_count), locale)'];
for(const value of numeric) if(!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`); if(!process.exitCode) pass('Evidence, gap, blocker, watch, and hardening counts use the selected locale.');
const display=["readinessCoreLabel(evidenceMatrix?.matrix_status || 'not_reported', ui)",'readinessCoreLabel(risk, ui)','readinessCoreLabel(gap.evidence_risk, ui)','readinessCoreLabel(gap.production_priority, ui)','readinessCoreLabel(gap.evidence_scope, ui)',"readinessCoreLabel(releaseDecisionBoard?.board_status || 'not_reported', ui)","readinessCoreLabel(releaseDecisionBoard?.decision_summary?.recommendation || 'not_reported', ui)",'readinessCoreLabel(blocker.blocker_type, ui)','readinessCoreLabel(blocker.severity, ui)'];
for(const value of display) if(!slice.includes(value)) fail(`Localized display mapping missing: ${value}`); if(!process.exitCode) pass('Known matrix/risk/scope/decision/blocker/severity canonical values use localized display mapping.');
const serverData=['gap.feature_label','gap.table_name','blocker.feature_label','blocker.detail','blocker.required_resolution','releaseFinalEvidence.map((item)','evidenceMatrixQuery.error.message','releaseDecisionBoardQuery.error.message'];
for(const value of serverData) if(!slice.includes(value)) fail(`Expected backend/business data boundary missing: ${value}`);
for(const value of ['ui(gap.feature_label)','ui(gap.table_name)','ui(blocker.feature_label)','ui(blocker.detail)','ui(blocker.required_resolution)','ui(item)','ui(evidenceMatrixQuery.error.message)','ui(releaseDecisionBoardQuery.error.message)']) if(slice.includes(value)) fail(`Backend-returned business/error text must not be blindly translated: ${value}`);
if(!process.exitCode) pass('Feature/table names, blocker detail/resolution, final-test evidence, and API errors remain backend/business data.');
const canonical=['evidence_gaps_require_hardening','required_evidence_ready_for_final_tests','missing_schema','global_unscoped_review_required','no_tenant_rows','tenant_evidence_present','table_missing','global_table_no_tenant_id','tenant_scoped','no_go_production_blocked','conditional_go_requires_governance_acceptance','go_ready_for_final_production_tests','critical_high_feature_blocker','required_evidence_gap','failed_signoff_item'];
for(const value of canonical) if(!pageSource.includes(value)) fail(`Canonical display mapping identifier missing: ${value}`); for(const value of canonical) if(pageSource.includes(`ui('${value}')`)||pageSource.includes(`ui("${value}")`)) fail(`Canonical identifier must remain language-independent: ${value}`); if(!process.exitCode) pass('Evidence/release canonical identifiers remain language-independent.');
if(slice.includes('apiRequest<')||slice.includes('method:')) fail('Slice must remain presentation-only and must not introduce mutation calls.'); else pass('Evidence/release slice remains presentation-only and read-only.');
for(const value of ["path: 'intelligence-review'",'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ']) if(!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`); if(!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');
const laterStart=pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if(laterStart<0) fail('Could not locate terminal Governance and Safety multilingual boundary.'); else { const laterSlice=pageSource.slice(laterStart); if(!laterSlice.includes('ui("Governance and safety")')&&!laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.'); else pass('Terminal Governance and Safety multilingual boundary is present.'); }
if(!process.exitCode) pass('Tenant Intelligence Review Production Evidence & Release Decision multilingual gate passed.');
