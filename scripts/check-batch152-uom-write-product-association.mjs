import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH152_PAGE_SOURCE || path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS', label); }
check('TSX parses cleanly', () => assert.equal(ast.parseDiagnostics.length, 0));
check('TSX transpiles cleanly', () => assert.equal((ts.transpileModule(source, {fileName:'InventoryCapabilitiesPage.tsx', reportDiagnostics:true, compilerOptions:{jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022}}).diagnostics || []).filter(d=>d.category === ts.DiagnosticCategory.Error).length, 0));
check('new 152 regression registered', () => assert.equal(pkg.scripts['check:batch152-uom-write-product-association'], 'node scripts/check-batch152-uom-write-product-association.mjs'));
const uom = ast.statements.find(x => ts.isFunctionDeclaration(x) && x.name?.text === 'UomPanel');
check('UoM panel found', () => assert(uom));
const declarations = {};
let saveClick = null, deleteClick = null;
(function visit(n) {
  if (ts.isVariableDeclaration(n) && ['save', 'remove', 'changeProduct', 'activeUomProductRef'].includes(n.name.getText(ast))) declarations[n.name.getText(ast)] = n;
  if (ts.isJsxAttribute(n) && n.name.text === 'onClick' && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression) {
    const body = n.initializer.expression.getText(ast);
    if (body.includes('save.mutate(')) saveClick = body;
    if (body.includes('remove.mutate(')) deleteClick = body;
  }
  ts.forEachChild(n, visit);
})(uom);
for (const key of ['save','remove','changeProduct','activeUomProductRef']) check(`${key} declared`,()=>assert(declarations[key]));
check('save click captures exact current product ID',()=>assert.match(saveClick, /save\.mutate\(\{ targetProductId: productId, targetSelectionEpoch: uomSelectionEpochRef\.current, payload:/));
check('save captures UoM business values at submission',()=>assert.match(saveClick, /uom_code: code, uom_name: name \|\| null, factor_to_base: Number\(factor\), purchase_uom: purchase, issue_uom: issue/));
check('save retains version-based optimistic concurrency',()=>assert.match(saveClick, /expected_version: editingUom\?\.version \?\? 0/));
check('delete captures same record and selected product',()=>assert.match(deleteClick,/remove\.mutate\(\{ targetProductId: productId, targetSelectionEpoch: uomSelectionEpochRef\.current, row \}\)/));
check('synchronous product ref assigned before state setter',()=>assert.match(declarations.changeProduct.getText(ast), /activeUomProductRef\.current = id;[\s\S]*?setProductId\(id\)/));
check('save calls versioned backend with saved request product',()=>assert.match(declarations.save.getText(ast), /apiRequest\(`\/inventory-capabilities\/products\/\$\{targetProductId\}\/uom`, \{ method: 'POST', body: JSON\.stringify\(payload\), skipMutationFeedback: true \}\)/));
check('save success invalidates the originally submitted product',()=>assert.match(declarations.save.getText(ast), /onSuccess:[\s\S]*?invalidateQueries\(\{ queryKey: \['uom', targetProductId\] \}\)/));
check('save stale completion never resets another product form',()=>assert.match(declarations.save.getText(ast), /if \(activeUomProductRef\.current !== targetProductId\) return;[\s\S]*?clearUomForm\(\)/));
check('delete stale completion never resets another product form',()=>assert.match(declarations.remove.getText(ast), /if \(activeUomProductRef\.current !== targetProductId\) return;[\s\S]*?clearUomForm\(\)/));
check('save error is scoped to current product',()=>assert.match(declarations.save.getText(ast), /onError:[\s\S]*?if \(activeUomProductRef\.current === targetProductId\) \{[\s\S]*?setError\(message\)/));
check('delete error is scoped to current product',()=>assert.match(declarations.remove.getText(ast), /onError:[\s\S]*?if \(activeUomProductRef\.current === targetProductId && \(targetSelectionEpoch === undefined \|\| uomSelectionEpochRef\.current === targetSelectionEpoch\)\) setError/));
check('delete preserves versioned route',()=>assert.match(declarations.remove.getText(ast), /apiRequest\(`\/inventory-capabilities\/uom\/\$\{row\.id\}`, \{ method: 'DELETE', version: row\.version \}\)/));
const script = `const saveOptions = ${declarations.save.initializer.arguments[0].getText(ast)};\n` +
  `const removeOptions = ${declarations.remove.initializer.arguments[0].getText(ast)};\n` +
  `const changeProduct = ${declarations.changeProduct.initializer.getText(ast)};\n`;
const js = ts.transpileModule(script, {fileName:'batch152-run.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function scenario() {
  const activeUomProductRef = {current:'p-A'};
  const conversionRequestSeqRef = {current:0};
  const observed = { requests:[], invalidations:[], readbackCache:[], formClears:0, conversions:[], errors:[], selected:[], units:[] };
  const qc = { invalidateQueries: ({queryKey}) => observed.invalidations.push(queryKey), setQueryData: (queryKey,data) => observed.readbackCache.push({queryKey,data}) };
  const apiRequest = (url, opts) => { observed.requests.push({url,opts}); return Promise.resolve(opts ? {id:'ok'} : {base_uom:'pcs',conversions:[{id:'u-1',uom_code:'CASE',factor_to_base:24,purchase_uom:true,issue_uom:false}]}); };
  const clearUomForm = () => { observed.formClears++; };
  const setConverted = val => observed.conversions.push(val);
  const setError = val => observed.errors.push(val);
  const setProductId = val => observed.selected.push(val);
  const setFromUom = val => observed.units.push(['from', val]);
  const setToUom = val => observed.units.push(['to', val]);
  const ui = x => x;
  const messageFrom = e => e.message;
  const editingUom = {id:'u-1'};
  const build = new Function('apiRequest','qc','activeUomProductRef','uomSelectionEpochRef','conversionRequestSeqRef','clearUomForm','setConverted','setError','setProductId','setFromUom','setToUom','messageFrom','ui','editingUom','showTenantActionSuccess','showTenantActionError', js+'\nreturn {saveOptions,removeOptions,changeProduct};');
  return {...build(apiRequest,qc,activeUomProductRef,{current:0},conversionRequestSeqRef,clearUomForm,setConverted,setError,setProductId,setFromUom,setToUom,messageFrom,ui,editingUom,()=>{},()=>{}), observed,activeUomProductRef,conversionRequestSeqRef};
}
const payload = {uom_code:'CASE',uom_name:'Case',factor_to_base:24,purchase_uom:true,issue_uom:false,expected_version:0};
const vars = {targetProductId:'p-A',payload};
{
 const s=scenario(); await s.saveOptions.mutationFn(vars);
 check('save request path targets original product',()=>assert.equal(s.observed.requests[0].url,'/inventory-capabilities/products/p-A/uom'));
 check('save request POST method intact',()=>assert.equal(s.observed.requests[0].opts.method,'POST'));
 check('CASE=24 save request body preserved',()=>assert.deepEqual(JSON.parse(s.observed.requests[0].opts.body),payload));
 s.changeProduct('p-B');
 check('switch updates current product synchronously',()=>assert.equal(s.activeUomProductRef.current,'p-B'));
 const previousClears=s.observed.formClears;
 const previousSeq=s.conversionRequestSeqRef.current;
 await s.saveOptions.onSuccess({id:'ok'},vars);
 check('late verified save refreshes cached product A, not B',()=>assert.deepEqual(s.observed.readbackCache.map(x=>x.queryKey),[['uom','p-A'],['product-uom-options','p-A']]));
 check('late save does not clear product B form',()=>assert.equal(s.observed.formClears,previousClears));
 check('late save does not erase product B result',()=>assert.equal(s.observed.conversions.length,1));
 check('late save does not invalidate product B conversion generation',()=>assert.equal(s.conversionRequestSeqRef.current,previousSeq));
 s.saveOptions.onError(new Error('A write failed'),vars);
 check('late save error cannot appear on product B',()=>assert.deepEqual(s.observed.errors,[null]));
}
{
 const s=scenario(); await s.saveOptions.onSuccess({id:'ok'},vars);
 check('normal same-product save still clears form',()=>assert.equal(s.observed.formClears,1));
 check('normal same-product save resets conversion',()=>assert.deepEqual(s.observed.conversions,[null]));
 check('normal same-product save increments generation',()=>assert.equal(s.conversionRequestSeqRef.current,1));
 check('normal verified save refreshes correct product cache',()=>assert.deepEqual(s.observed.readbackCache.map(x=>x.queryKey),[['uom','p-A'],['product-uom-options','p-A']]));
 s.saveOptions.onError(new Error('Save failed'),vars);
 check('current-product save error remains visible',()=>assert.equal(s.observed.errors.at(-1),'Save failed'));
}
{
 const s=scenario(); const del={targetProductId:'p-A',row:{id:'u-1',version:3}};
 await s.removeOptions.mutationFn(del);
 check('delete request uses original conversion id',()=>assert.equal(s.observed.requests[0].url,'/inventory-capabilities/uom/u-1'));
 check('delete request uses original version',()=>assert.deepEqual({method:s.observed.requests[0].opts.method,version:s.observed.requests[0].opts.version},{method:'DELETE',version:3}));
 s.changeProduct('p-B'); const clears=s.observed.formClears; const seq=s.conversionRequestSeqRef.current;
 s.removeOptions.onSuccess({},del);
 check('late delete refreshes original product',()=>assert.deepEqual(s.observed.invalidations,[['uom','p-A'],['product-uom-options','p-A']]));
 check('late delete does not clear current product form',()=>assert.equal(s.observed.formClears,clears));
 check('late delete does not change current product conversion',()=>assert.equal(s.conversionRequestSeqRef.current,seq));
 s.removeOptions.onError(new Error('Old delete failed'),del);
 check('late delete error cannot appear on newer selection',()=>assert.deepEqual(s.observed.errors,[null]));
}
{
 const s=scenario(); const del={targetProductId:'p-A',row:{id:'u-1',version:3}};
 s.removeOptions.onSuccess({},del);
 check('current product delete still clears form in edit mode',()=>assert.equal(s.observed.formClears,1));
 check('current product delete invalidates matching list',()=>assert.deepEqual(s.observed.invalidations,[['uom','p-A'],['product-uom-options','p-A']]));
 check('current product delete invalidates old conversion',()=>assert.equal(s.conversionRequestSeqRef.current,1));
 s.removeOptions.onError(new Error('Delete failed'),del);
 check('current product delete error remains visible',()=>assert.equal(s.observed.errors.at(-1),'Delete failed'));
}
console.log(`Batch152 UoM write-product association: ${checks}/${checks} PASS`);
