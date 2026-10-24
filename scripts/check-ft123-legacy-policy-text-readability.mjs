import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript')); }
const page = fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx', import.meta.url), 'utf8');
const translation = fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts',import.meta.url), 'utf8');
const check = (cond,msg) => { if (!cond) throw new Error('FAIL: '+msg); console.log('PASS '+msg); };
const start=page.indexOf('function businessEvidenceScalar(');
const end=page.indexOf('function businessEvidenceSnapshot(',start);
check(start>0 && end>start, 'Formatter is still in full application');
const snippet=page.slice(start,end)+'\n globalThis.testing={businessEvidenceEntries,businessEvidenceText};';
const compiled=ts.transpileModule(snippet,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},reportDiagnostics:true});
check(!compiled.diagnostics?.length,'Existing formatter and new branch parse as TypeScript');
const translations=ts.transpileModule(translation,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
check(!translations.diagnostics?.length,'Multilingual catalog parses');
const catalogContext={exports:{}};
vm.runInNewContext(translations.outputText,catalogContext,{timeout:2000});
const dict=catalogContext.exports.TENANT_UI_TRANSLATIONS;
const originalKeys=['basis','consumption_only_demand','reliable_inbound_counted','at_risk_inbound_separated','location_par_and_minimum_rules','active_reservations_reduce_available_stock','approved_po_unshipped_counted_without_double_counting_shipments'];
const encoded=[
'basis: shared_procurement_replenishment_position_and_location_policy',
'consumption_only_demand: Yes',
'reliable_inbound_counted: Yes',
'at_risk_inbound_separated: Yes',
'location_par_and_minimum_rules: Yes',
'active_reservations_reduce_available_stock: Yes',
'approved_po_unshipped_counted_without_double_counting_shipments: Yes'
].join(' · ');
const niceLabels=['Planning basis','Consumption-only demand considered','Reliable inbound counted','At-risk inbound separated','Location par and minimum rules considered','Active reservations reduce available stock','Approved but unshipped purchase orders counted without double-counting shipments'];
for (const locale of ['en-GB','de-DE','es-ES','fr-FR','hr-HR']) {
  const ui=(key)=>dict[locale][key] ?? key;
  const sandbox={formatLocalizedNumber:(n)=>String(n)};
  vm.runInNewContext(compiled.outputText,sandbox,{timeout:2000});
  const parse=(value)=>sandbox.testing.businessEvidenceEntries(value,locale,ui);
  const display=parse(encoded);
  check(display.length===7,locale+' renders all 7 legacy fields');
  check(display.every((r,i)=>r.label===ui(niceLabels[i]) && r.value===(i===0?ui('Shared procurement, replenishment position and location policy'):ui('Yes'))),locale+' uses localized business terms and yes/no');
  check(display.every(r=>!r.label.includes('_')&&!r.value.includes('_')),locale+' no machine keys in business panel');
  const structured=Object.fromEntries(originalKeys.map((k,i)=>[k,i===0?'shared_procurement_replenishment_position_and_location_policy':true]));
  check(parse(structured).length===7,locale+' structured object behavior preserved');
  check(JSON.stringify(structured)===JSON.stringify(Object.fromEntries(originalKeys.map((k,i)=>[k,i===0?'shared_procurement_replenishment_position_and_location_policy':true]))),locale+' structured original unchanged');
  const user='basis: custom_policy · freeform: user written description';
  check(parse(user).length===1 && parse(user)[0].value===user,locale+' unknown free text is preserved');
  const partial='basis: shared_procurement_replenishment_position_and_location_policy · consumption_only_demand: Yes';
  check(parse(partial).length===1 && parse(partial)[0].value===partial,locale+' incomplete snapshots not guessed');
  const other='Action basis: shared_procurement_replenishment_position_and_location_policy';
  check(parse(other).length===1 && parse(other)[0].value===other,locale+' arbitrary actual result preserved');
}
check(page.includes("<div><strong>{ui('Expected')}</strong>{renderBusinessEvidence(expected)}</div>"),'Read-only detail panel still calls business renderer');
check(page.includes("<summary>{ui('Technical structured evidence')}</summary>") && page.includes('{canViewDiagnostics ? ('),'Raw diagnostics permission gate preserved');
check(page.includes('return { original: value, display: businessEvidenceText(value, locale, ui) };'),'Original evidence snapshot preservation intact');
console.log('FT123 legacy evidence readability: PASS ALL');
