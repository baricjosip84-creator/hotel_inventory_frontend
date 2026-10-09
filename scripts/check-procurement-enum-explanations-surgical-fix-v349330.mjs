import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const page = fs.readFileSync(new URL('src/pages/ProcurementRecommendationsPage.tsx', root), 'utf8');
const locales = fs.readFileSync(new URL('src/i18n/tenantUiTranslations.ts', root), 'utf8');
const backend = fs.readFileSync(new URL('../hotel-inventory-backend/src/services/procurement/replenishmentRecommendationService.js', root), 'utf8');
let passed = 0;
const check = (name, condition) => { assert.ok(condition, name); passed++; };
check('backend constructs source signal enum explanation', backend.includes('`Source signal: ${row.source_signal}.`'));
check('backend constructs supplier reason enum explanation', backend.includes('`Supplier selection reason: ${row.supplier_selection_reason}.`'));
check('backend constructs supplier performance enum explanation', backend.includes('`Supplier performance status: ${row.supplier_performance_status}.`'));
check('source explanation now calls display formatter', page.includes('<li key={reason}>{displayRecommendationReason(reason)}</li>'));
check('no raw explanation JSX remains', !page.includes('<li key={reason}>{reason}</li>'));
check('blockers remain separate unmodified', page.includes('{blocker.message || blocker.code}'));
check('warnings remain separate unmodified', page.includes('{warning.message || warning.code}'));
check('approval readiness unchanged', page.includes('can_enter_approval_review ? ui("Ready for review") : ui("Blocked")'));
check('conversion logic unchanged', page.includes('can_generate_po_draft ? ui("Yes") : ui("No")'));
check('sourcing choice still comes from server detail', page.includes('selectedDetail.supplier_selection_reason'));
const keys=['Source signal: {value}.','Supplier selection reason: {value}.','Supplier performance status: {value}.'];
const translations = new Map();
for (const key of keys) {
  const row = locales.split('\n').find(line => line.includes(`  ["${key}"`));
  check(`catalog has unique key ${key}`, !!row && locales.split(`  ["${key}"`).length===2);
  const vals=[...row.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m=>m[1]);
  check(`${key} has five locale values`, vals.length===5);
  check(`${key} placeholders match all five`, vals.every(x=>(x.match(/\{value\}/g)||[]).length===1));
  translations.set(key,vals);
}
const before = page.split('  const canonicalDisplayLabel = ')[0];
check('source uses canonical translated enum mapping',page.includes('const canonicalDisplayLabel = '));
const block = 'const canonicalDisplayLabel = ' + page.split('  const canonicalDisplayLabel = ')[1].split('  const queryClient = ')[0];
const compiled = ts.transpileModule(block, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}, reportDiagnostics:true,fileName:'formatter.ts'});
check('formatter block transpiles',compiled.diagnostics?.length===0);
const makeFormatter=(lang=0)=>{
  const ui=(key)=>translations.has(key)?translations.get(key)[lang]:key;
  const titleCase=(v)=>v?v.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'-';
  return new Function('ui','titleCase', compiled.outputText+'\nreturn displayRecommendationReason;')(ui,titleCase);
};
for (let lang=0;lang<5;lang++) {
  const display=makeFormatter(lang);
  check(`locale ${lang} source enum humanized`, !display('Source signal: minimum_stock.').includes('minimum_stock') && display('Source signal: minimum_stock.').includes('Minimum stock'));
  check(`locale ${lang} supplier enum humanized`, !display('Supplier selection reason: product_default_with_purchase_history.').includes('product_default_with_purchase_history'));
  check(`locale ${lang} risk enum humanized`, !display('Supplier performance status: late_risk.').includes('late_risk'));
  check(`locale ${lang} label localized`, display('Source signal: minimum_stock.').startsWith(translations.get(keys[0])[lang].split('{value}')[0]));
}
const en=makeFormatter();
check('unknown enum has human-readable fallback',en('Source signal: future_reason_code.')==='Source signal: Future Reason Code.');
check('full ordinary business sentence retained',en('Estimated coverage is 42 day(s).')==='Estimated coverage is 42 day(s).');
check('supplier name and quantity evidence retained',en('Recommended supplier is ACME Partners.')==='Recommended supplier is ACME Partners.');
check('unknown sentence with embedded code preserved for fidelity',en('New evidence: supplier_code_a is under review.')==='New evidence: supplier_code_a is under review.');
check('unstructured supplier name cannot be misinterpreted',en('Supplier selection reason: Approved by Jane Doe.')==='Supplier selection reason: Approved by Jane Doe.');
check('missing punctuation retained without guessing',en('Supplier performance status: late_risk')==='Supplier performance status: late_risk');
console.log(`PASS ${passed}/${passed} Batch092 procurement source explanation enum checks`);
