import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript')); }
const page=fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx',import.meta.url),'utf8');
const catalog=fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts',import.meta.url),'utf8');
const check=(v,msg)=>{if(!v)throw Error('FAIL '+msg);console.log('PASS '+msg);};
const start=page.indexOf('function businessEvidenceScalar(');
const end=page.indexOf('function businessEvidenceSnapshot(',start);
check(start>0 && end>start,'full-source business evidence formatter located');
const compiled=ts.transpileModule(page.slice(start,end)+'\n globalThis.testHelper=businessEvidenceEntries;',
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},reportDiagnostics:true});
check(!(compiled.diagnostics||[]).length,'updated formatter is syntactically valid TypeScript');
const trans=ts.transpileModule(catalog,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
check(!(trans.diagnostics||[]).length,'original multilingual catalog compiles');
const c={exports:{}};
vm.runInNewContext(trans.outputText,c,{timeout:2000});
const dictionary=c.exports.TENANT_UI_TRANSLATIONS;
const raw=[
  'basis: shared_procurement_replenishment_position_and_location_policy',
  'consumption_only_demand: Yes',
  'reliable_inbound_counted: Yes',
  'at_risk_inbound_separated: Yes',
  'location_par_and_minimum_rules: Yes',
  'active_reservations_reduce_available_stock: Yes',
  'approved_po_unshipped_counted_without_double_counting_shipments: Yes'
].join(' · ');
const expectedLabels=['Planning basis','Consumption-only demand considered','Reliable inbound counted',
  'At-risk inbound separated','Location par and minimum rules considered',
  'Active reservations reduce available stock',
  'Approved but unshipped purchase orders counted without double-counting shipments'];
for (const locale of ['en-GB','de-DE','es-ES','fr-FR','hr-HR']) {
  const ui=(key)=>dictionary[locale][key]??key;
  const sandbox={formatLocalizedNumber:(n)=>String(n)};
  vm.runInNewContext(compiled.outputText,sandbox,{timeout:2000});
  const parse=(v)=>sandbox.testHelper(v,locale,ui);
  for (const field of ['note','summary','description','reason','evidence','statement','result','value']) {
    const wrapper={[field]:raw};
    const original=JSON.stringify(wrapper);
    const rows=parse(wrapper);
    check(rows.length===7 && rows.every((r,i)=>r.label===ui(expectedLabels[i]) && r.value===(i===0?ui('Shared procurement, replenishment position and location policy'):ui('Yes'))),
      `${locale} ${field}: wrapped known snapshot displays seven localized policy facts`);
    check(rows.every(r=>!r.label.includes('_')&&!r.value.includes('_')),
      `${locale} ${field}: no machine identifiers leak into ordinary evidence`);
    check(JSON.stringify(wrapper)===original,`${locale} ${field}: original saved evidence untouched`);
  }
  const unknown={note:'basis: custom_policy · custom field: human description'};
  check(parse(unknown).length===1 && parse(unknown)[0].value===unknown.note,`${locale}: unknown user text unchanged`);
  const incomplete={note:raw.split(' · ').slice(0,6).join(' · ')};
  check(parse(incomplete).length===1 && parse(incomplete)[0].value===incomplete.note,`${locale}: incomplete system snapshot unchanged`);
  const ordinary={summary:'Purchase order was received with no issues'};
  check(parse(ordinary).length===1 && parse(ordinary)[0].value===ordinary.summary,`${locale}: other semantic evidence unchanged`);
  const structured={basis:'shared_procurement_replenishment_position_and_location_policy',
   consumption_only_demand:true,reliable_inbound_counted:true,at_risk_inbound_separated:true,
   location_par_and_minimum_rules:true,active_reservations_reduce_available_stock:true,
   approved_po_unshipped_counted_without_double_counting_shipments:true};
  check(parse(structured).length===7,`${locale}: existing structured policy evidence unchanged`);
  check(parse(raw).length===7,`${locale}: prior FE259 plain-string behavior retained`);
}
check(page.includes("<div><strong>{ui('Expected')}</strong>{renderBusinessEvidence(expected)}</div>"),'Expected still uses common read-only evidence renderer');
check(page.includes("<div><strong>{ui('Actual')}</strong>{renderBusinessEvidence(observed)}</div>"),'Actual preserves existing evidence renderer');
check(page.includes("<summary>{ui('Technical structured evidence')}</summary>") && page.includes('{canViewDiagnostics ? ('),'original audit-only technical evidence kept permission-gated');
check(page.includes('return { original: value, display: businessEvidenceText(value, locale, ui) };'),'saved original evidence snapshot intact');
console.log('FT124 wrapped JSONB snapshot formatter: ALL CHECKS PASS');
