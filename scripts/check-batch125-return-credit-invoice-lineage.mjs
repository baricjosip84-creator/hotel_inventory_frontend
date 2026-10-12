import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const page = readFileSync(process.env.BATCH125_RETURNS_SOURCE || path.join(root,'src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx'),'utf8');
const catalog = readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const pkg = JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let passed=0;
function check(name, fn) { fn(); passed++; console.log('PASS',name); }
const sf=ts.createSourceFile('SupplierReturnsTab.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('Supplier Returns TSX parses',()=>assert.equal(sf.parseDiagnostics.length,0));
check('Supplier Returns TSX transpiles',()=>assert.equal((ts.transpileModule(page,{fileName:'SupplierReturnsTab.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('Translation catalog parses',()=>assert.equal(ts.createSourceFile('catalog.ts',catalog,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0));
check('Focused test registered',()=>assert.equal(pkg.scripts['check:batch125-return-credit-invoice-lineage'],'node scripts/check-batch125-return-credit-invoice-lineage.mjs'));
const names=['findCreditInvoiceLine','candidateInvoices','eligibleCreditInvoices','selectedCreditInvoice'];
const decls={};
(function visit(node){if(ts.isVariableDeclaration(node)&&names.includes(node.name.getText(sf)))decls[node.name.getText(sf)]=node;ts.forEachChild(node,visit);})(sf);
for(const name of names)check(`Source contains ${name}`,()=>assert(decls[name]?.initializer,`${name} missing`));
check('Same-supplier/status candidates still subject to original permission context',()=>assert.match(decls.candidateInvoices.initializer.getText(sf),/invoice\.supplier_id === selectedCreditReturn\.supplier_id[\s\S]*?\['matched', 'paid'\]/));
check('Original matching helper requires direct shipment item or unique header lineage',()=>{
 const s=decls.findCreditInvoiceLine.initializer.getText(sf);
 assert.match(s,/line\.shipment_item_id === returnItem\.shipment_item_id/);
 assert.match(s,/invoice\.purchase_order_id === returnItem\.purchase_order_id/);
 assert.match(s,/invoice\.shipment_id === returnItem\.shipment_id/);
 assert.match(s,/productLines\.length === 1/);
});
check('Available invoice list requires uncredited item and exact original matching helper',()=>{
 const s=decls.eligibleCreditInvoices.initializer.getText(sf);
 assert.match(s,/candidateInvoices\.filter/);
 assert.match(s,/!activeCreditReturnItemIds\.has\(item\.id\)/);
 assert.match(s,/Boolean\(findCreditInvoiceLine\(item, invoice\)\)/);
});
check('Selected invoice cannot bypass eligible filter',()=>assert.match(decls.selectedCreditInvoice.initializer.getText(sf),/eligibleCreditInvoices\.find/));
check('Selection handler only accepts eligible invoices',()=>assert.match(page,/const handleCreditInvoiceChange[\s\S]*?eligibleCreditInvoices\.find\(\(item\) => item\.id === invoiceId\)/));
check('Invoice selector renders only eligible invoices',()=>assert.match(page,/options=\{eligibleCreditInvoices\.map\(\(invoice\)/));
check('Invalid/stale invoice selection renders no selected invoice',()=>assert.match(page,/value=\{selectedCreditInvoice\?\.id \?\? ''\}/));
check('No-eligible-candidate selection is disabled',()=>assert.match(page,/disabled=\{!canManageCredits \|\| !selectedCreditReturn \|\| !eligibleCreditInvoices\.length/));
check('Original credit creation protection retained',()=>assert.match(page,/const creditDraftValid = Boolean\([\s\S]*?canManageCredits[\s\S]*?selectedCreditInvoice[\s\S]*?creditReturnItemIds\.length/));
check('Existing credit lifecycle mutations remain',()=>{
 assert.match(page,/createCreditMutation\.mutate\(\)/);
 assert.match(page,/creditLifecycleMutation\.mutate/);
});
check('No backend-side or financial fallback introduced',()=>{assert.doesNotMatch(decls.eligibleCreditInvoices.initializer.getText(sf),/unit_cost|total_amount|price/);});
const messages=[
'Only original invoices linked to an unreconciled returned receipt are available for credit reconciliation.',
'No eligible original invoice is linked to this return. Match or pay an invoice from the same received shipment or purchase order first; unrelated supplier invoices cannot be credited.'
];
for(const message of messages){
 check('Visible guidance for '+message.slice(0,23),()=>assert(page.includes(`ui('${message}')`)));
 check('Exactly one five-language translation '+message.slice(0,23),()=>{
  const rows=catalog.split('\n').filter(row=>row.trim().startsWith('["'+message+'",'));
  assert.equal(rows.length,1);
  const row=JSON.parse(rows[0].trim().replace(/,$/,''));
  assert.equal(row.length,5);assert(row.every(v=>typeof v==='string'&&v.trim().length>25));
 });
}
check('Guidance only after invoice query loading completes',()=>assert.match(page,/selectedCreditReturn && !invoicesQuery\.isLoading/));
check('Original invoice price still drives expected credit',()=>assert.match(page,/Number\(item\.quantity \|\| 0\) \* Number\(invoiceLine\?\.unit_cost \|\| 0\)/));
check('Existing invoice status and supplier filters remain unchanged',()=>assert.match(page,/candidateInvoices = \(invoicesQuery\.data \?\? \[\]\)\.filter/));
// Exercise the ACTUAL extracted TypeScript candidate/match/eligible expressions against realistic invoice families.
const extracted=names.map(n=>`const ${n} = ${decls[n].initializer.getText(sf)};`).join('\n');
const executable=ts.transpileModule(extracted,{fileName:'invoice-eligibility.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function calculate({returnLines=[{id:'ret-1',product_id:'p',shipment_item_id:'sh-line',shipment_id:'sh',purchase_order_id:'po',quantity:2}], credits=[], invoices=[], supplier='supplier-A', chosen=''}={}){
 const selectedCreditReturn={supplier_id:supplier,items:returnLines};
 const activeCreditReturnItemIds=new Set(credits);
 const invoicesQuery={data:invoices};
 return new Function('selectedCreditReturn','activeCreditReturnItemIds','invoicesQuery','creditInvoiceId',executable+'\nreturn {candidateInvoices,eligibleCreditInvoices,selectedCreditInvoice};')(selectedCreditReturn,activeCreditReturnItemIds,invoicesQuery,chosen);
}
const invoice=(id,{supplier_id='supplier-A',status='matched',items=[{product_id:'p',shipment_item_id:'sh-line',unit_cost:8}],shipment_id=null,purchase_order_id=null}={})=>({id,supplier_id,status,items,shipment_id,purchase_order_id});
check('Exact received shipment-item match is eligible',()=>assert.deepEqual(calculate({invoices:[invoice('a')]}).eligibleCreditInvoices.map(x=>x.id),['a']));
check('Matched invoice with exact purchase-order lineage is eligible',()=>assert.deepEqual(calculate({invoices:[invoice('a',{items:[{product_id:'p',shipment_item_id:null,unit_cost:8}],purchase_order_id:'po'})]}).eligibleCreditInvoices.map(x=>x.id),['a']));
check('Paid invoice with exact shipment lineage is eligible',()=>assert.deepEqual(calculate({invoices:[invoice('a',{status:'paid',items:[{product_id:'p',shipment_item_id:null,unit_cost:8}],shipment_id:'sh'})]}).eligibleCreditInvoices.map(x=>x.id),['a']));
check('Standalone same-supplier same-product invoice is excluded',()=>assert.equal(calculate({invoices:[invoice('a',{items:[{product_id:'p',unit_cost:8}]})]}).eligibleCreditInvoices.length,0));
check('Different supplier excluded',()=>assert.equal(calculate({invoices:[invoice('a',{supplier_id:'other'})]}).eligibleCreditInvoices.length,0));
check('Draft invoice excluded despite direct match',()=>assert.equal(calculate({invoices:[invoice('a',{status:'draft'})]}).eligibleCreditInvoices.length,0));
check('Submitted invoice excluded despite direct match',()=>assert.equal(calculate({invoices:[invoice('a',{status:'submitted'})]}).eligibleCreditInvoices.length,0));
check('Wrong shipment / PO excluded',()=>assert.equal(calculate({invoices:[invoice('a',{items:[{product_id:'p'}],shipment_id:'other-sh',purchase_order_id:'other-po'})]}).eligibleCreditInvoices.length,0));
check('Wrong product excluded even with matching PO',()=>assert.equal(calculate({invoices:[invoice('a',{items:[{product_id:'other'}],purchase_order_id:'po'})]}).eligibleCreditInvoices.length,0));
check('Ambiguous two-line same-product header linkage excluded',()=>assert.equal(calculate({invoices:[invoice('a',{items:[{product_id:'p'},{product_id:'p'}],purchase_order_id:'po'})]}).eligibleCreditInvoices.length,0));
check('Already reconciled return item excluded',()=>assert.equal(calculate({credits:['ret-1'],invoices:[invoice('a')]}).eligibleCreditInvoices.length,0));
check('An invoice may be eligible for second unreconciled item',()=>{
 const lines=[{id:'ret-1',product_id:'p',shipment_item_id:'one'},{id:'ret-2',product_id:'p',shipment_item_id:'two'}];
 const result=calculate({returnLines:lines,credits:['ret-1'],invoices:[invoice('a',{items:[{product_id:'p',shipment_item_id:'two'}]})]});
 assert.equal(result.eligibleCreditInvoices.length,1);
});
check('Only genuinely matching invoices offered from mixed same-supplier list',()=>{
 const list=[invoice('unrelated',{items:[{product_id:'p'}]}),invoice('valid'),invoice('wrong_supplier',{supplier_id:'other'}),invoice('draft',{status:'draft'})];
 assert.deepEqual(calculate({invoices:list}).eligibleCreditInvoices.map(x=>x.id),['valid']);
});
check('Eligible chosen invoice accepted',()=>assert.equal(calculate({invoices:[invoice('valid')],chosen:'valid'}).selectedCreditInvoice?.id,'valid'));
check('Stale unlinked chosen invoice rejected',()=>assert.equal(calculate({invoices:[invoice('unrelated',{items:[{product_id:'p'}]})],chosen:'unrelated'}).selectedCreditInvoice,null));
check('Wrong supplier chosen invoice rejected',()=>assert.equal(calculate({invoices:[invoice('bad',{supplier_id:'other'})],chosen:'bad'}).selectedCreditInvoice,null));
console.log(`Batch125 original supplier invoice credit lineage eligibility: ${passed}/${passed} PASS`);
