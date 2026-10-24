import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
let ts;
try {ts=require('typescript')} catch {ts=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'))}
const source=fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx',import.meta.url),'utf8');
const translations=fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts',import.meta.url),'utf8');
let passed=0;
function check(test,description){if(!test)throw new Error('FAIL: '+description);passed++;console.log('PASS '+description)}
const first=source.indexOf('function feedbackEvidenceEmptyMessage(');
const last=source.indexOf('function EvidenceTable(',first);
check(first>=0 && last>first,'filtered-versus-true-empty helper exists');
const transpiled=ts.transpileModule(source.slice(first,last)+'\n globalThis.getMessage=feedbackEvidenceEmptyMessage;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},reportDiagnostics:true});
check(!transpiled.diagnostics?.length,'empty message helper transpiles');
const context={};vm.runInNewContext(transpiled.outputText,context,{timeout:1500});
const t=ts.transpileModule(translations,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
check(!t.diagnostics?.length,'five-language catalog transpiles');
const trctx={exports:{}};vm.runInNewContext(t.outputText,trctx,{timeout:1500});
const dict=trctx.exports.TENANT_UI_TRANSLATIONS;
for(const locale of ['en-GB','de-DE','es-ES','fr-FR','hr-HR']){
  const translate=(k)=>dict[locale][k]??k;
  const filtered=context.getMessage(true,translate),empty=context.getMessage(false,translate);
  check(filtered===translate('No matching records were returned.'),`${locale}: active search/date/review filter says no matches`);
  check(empty===translate('No feedback evidence has been recorded in this category yet.'),`${locale}: truly unfiltered empty state retained`);
  check(filtered!==empty,`${locale}: the two valid empty states remain distinct`);
}
check(/const hasActiveEvidenceFilters = Boolean\(evidenceSearch\.trim\(\) \|\| evidenceReviewStatus \|\| evidenceDateFrom \|\| evidenceDateTo\)/.test(source),'only narrowing filters, not sorting, affect empty state');
const tableStart=source.indexOf('function EvidenceTable(');
const tableEnd=source.indexOf('export default function',tableStart);
check(tableStart>0 && tableEnd>tableStart,'EvidenceTable source exists within full application');
const table=source.slice(tableStart,tableEnd);
check(table.includes('feedbackEvidenceEmptyMessage(hasActiveFilters, ui)'), 'EvidenceTable calls shared filtered-empty formatter');
check(table.indexOf('rows.length ?') < table.indexOf('feedbackEvidenceEmptyMessage(hasActiveFilters, ui)'),'nonempty result count continues to take precedence');
check(table.indexOf("ui('Loading feedback evidence…')") < table.indexOf('feedbackEvidenceEmptyMessage(hasActiveFilters, ui)'),'loading state takes precedence');
check(table.indexOf("ui('Feedback evidence is unavailable.')") < table.indexOf('feedbackEvidenceEmptyMessage(hasActiveFilters, ui)'),'request-error state takes precedence');
for(const section of ['Learning outcomes','Forecast accuracy','Policy effectiveness','Optimization results']){
 const pattern=new RegExp('<EvidenceTable title=\\{ui\\(\\x27'+section+'\\x27\\)\\}[^\\n]*hasActiveFilters=\\{hasActiveEvidenceFilters\\}');
 check(pattern.test(source),`${section}: actual table receives active search/filter status`);
}
check(source.includes('setEvidenceSearch(\'\')') && source.includes('setEvidenceReviewStatus(\'\')'),'clear filters still clears search and review status');
check(source.includes('evidence_search: evidenceSearch'),'original server-side full-history search contract intact');
check(source.includes('setEvidenceDateFrom(\'\')') && source.includes('setEvidenceDateTo(\'\')'), 'clear filters still resets both date bounds');
console.log(`FT128 Learning Feedback zero-match UX regression: ${passed}/${passed} PASS`);
