import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const page = fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx', import.meta.url), 'utf8');
const catalog = fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const expectedKeys = {
  basis: 'Planning basis',
  consumption_only_demand: 'Consumption-only demand considered',
  reliable_inbound_counted: 'Reliable inbound counted',
  at_risk_inbound_separated: 'At-risk inbound separated',
  location_par_and_minimum_rules: 'Location par and minimum rules considered',
  active_reservations_reduce_available_stock: 'Active reservations reduce available stock',
  approved_po_unshipped_counted_without_double_counting_shipments: 'Approved but unshipped purchase orders counted without double-counting shipments'
};
const recognizedBasis = 'shared_procurement_replenishment_position_and_location_policy';
const recognizedBasisLabel = 'Shared procurement, replenishment position and location policy';
const translationModule = ts.transpileModule(catalog, { fileName:'tenantUiTranslations.ts', compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}, reportDiagnostics:true });
check('Translation catalog TypeScript parses',!translationModule.diagnostics?.length);
const translationSandbox = {exports:{}};
vm.runInNewContext(translationModule.outputText, translationSandbox, {timeout:2000});
const dictionaries = translationSandbox.exports.TENANT_UI_TRANSLATIONS;
const locales = ['en-GB','de-DE','es-ES','fr-FR','hr-HR'];
check('Five translation dictionaries are available',locales.every(l=>dictionaries[l]));
for (const [key, label] of Object.entries({...expectedKeys,__basis_value:recognizedBasisLabel})) {
  const row = dictionaries['en-GB'][label];
  check(`English dictionary contains '${label}'`, row===label);
  check(`Five complete translations for '${key}'`, locales.every(l=>typeof dictionaries[l][label]==='string' && dictionaries[l][label].trim().length>0));
}
check('Expected panel calls read-only evidence presenter',page.includes("<div><strong>{ui('Expected')}</strong>{renderBusinessEvidence(expected)}</div>"));
check('Editing snapshots preserve original structured evidence',page.includes('return { original: value, display: businessEvidenceText(value, locale, ui) };') && page.includes('return snapshot.original as Record<string, unknown>;'));
check('No backend evidence fields are renamed',Object.entries(expectedKeys).every(([key,label])=>page.includes(`${key}: '${label}'`)));
const start=page.indexOf('function businessEvidenceScalar(');
const end=page.indexOf('function businessEvidenceSnapshot(', start);
check('Exact formatter helpers located in page',start>=0 && end>start);
const snippet = `${page.slice(start,end)}\n globalThis.__testFormatter={businessEvidenceEntries,businessEvidenceText};`;
const transpiled=ts.transpileModule(snippet,{fileName:'test.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},reportDiagnostics:true});
check('Evidence formatter TypeScript parses',!transpiled.diagnostics?.length);
for (const locale of locales) {
  const sandbox={formatLocalizedNumber:(v)=>String(v)};
  vm.runInNewContext(transpiled.outputText,sandbox,{timeout:2000});
  const ui=(key)=>dictionaries[locale][key] ?? key;
  const value={basis:recognizedBasis,consumption_only_demand:true,reliable_inbound_counted:true,at_risk_inbound_separated:true,location_par_and_minimum_rules:true,active_reservations_reduce_available_stock:true,approved_po_unshipped_counted_without_double_counting_shipments:true};
  const original=JSON.stringify(value);
  const rows=sandbox.__testFormatter.businessEvidenceEntries(value,locale,ui);
  check(`${locale}: seven expected policy facts shown`,rows.length===7);
  check(`${locale}: known planning basis translated`,rows[0]?.label===ui(expectedKeys.basis) && rows[0]?.value===ui(recognizedBasisLabel));
  check(`${locale}: flags use translated labels`,rows.slice(1).every((r,i)=>r.label===ui(Object.values(expectedKeys)[i+1]) && r.value===ui('Yes')));
  check(`${locale}: no machine keys in visible policy labels`,rows.every(r=>!r.label.includes('_') && !r.value.includes('_')));
  check(`${locale}: original policy object is unchanged`,JSON.stringify(value)===original);
  const unknown=sandbox.__testFormatter.businessEvidenceEntries({basis:'client_authored_custom_basis',custom_field:'user_authored_message'},locale,ui);
  check(`${locale}: unknown/user-authored values preserved`,unknown[0]?.value==='client_authored_custom_basis' && unknown[1]?.label==='custom_field' && unknown[1]?.value==='user_authored_message');
  const nested=sandbox.__testFormatter.businessEvidenceEntries({policy:{consumption_only_demand:false}},locale,ui);
  check(`${locale}: nested names are localized without losing hierarchy`,nested[0]?.label===`policy · ${ui(expectedKeys.consumption_only_demand)}` && nested[0]?.value===ui('No'));
}
const failed=checks.filter(c=>!c.ok);
for(const c of checks) console.log(`${c.ok?'PASS':'FAIL'} - ${c.name}`);
console.log(`Batch 111 Expected evidence labels: ${checks.length-failed.length}/${checks.length} PASS`);
if(failed.length)process.exit(1);
