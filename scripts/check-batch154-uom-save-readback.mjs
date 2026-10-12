import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=process.cwd();
const source=readFileSync(process.env.BATCH154_PAGE_SOURCE||path.join(root,'src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const translations=readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const backendRoutes=readFileSync(path.join(root,'../hotel-inventory-backend/src/routes/inventoryCapabilities.js'),'utf8');
const backendService=readFileSync(path.join(root,'../hotel-inventory-backend/src/services/inventory/inventoryCapabilitiesService.js'),'utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS',label)}
const ast=ts.createSourceFile('InventoryCapabilitiesPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('TSX source parses',()=>assert.equal(ast.parseDiagnostics.length,0));
check('TSX source transpiles',()=>assert.equal((ts.transpileModule(source,{fileName:'InventoryCapabilitiesPage.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
check('new regression registered',()=>assert.equal(pkg.scripts['check:batch154-uom-save-readback'],'node scripts/check-batch154-uom-save-readback.mjs'));
const panel=ast.statements.find(x=>ts.isFunctionDeclaration(x)&&x.name?.text==='UomPanel');
check('original UoM panel found',()=>assert(panel));
let save,remove;
(function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='save')save=n;if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='remove')remove=n;ts.forEachChild(n,walk)})(panel);
check('save mutation located',()=>assert(save));
check('delete mutation retained',()=>assert(remove));
const handler=save.initializer.arguments[0].getText(ast);
check('save reads back original product',()=>assert.match(handler,/apiRequest<UomResponse>\(`\/inventory-capabilities\/products\/\$\{targetProductId\}\/uom`\)/));
check('readback inspects actual saved rows',()=>assert.match(handler,/verified\.conversions\.find/));
check('normalizes code for matching',()=>assert.match(handler,/payload\.uom_code\.trim\(\)\.toUpperCase\(\)/));
check('checks numeric factor from persisted row',()=>assert.match(handler,/Number\(savedRow\?\.factor_to_base\)/));
check('checks purchase flag',()=>assert.match(handler,/Boolean\(savedRow\.purchase_uom\) !== payload\.purchase_uom/));
check('checks issue flag',()=>assert.match(handler,/Boolean\(savedRow\.issue_uom\) !== payload\.issue_uom/));
check('success updates submitted product cache',()=>assert.match(handler,/qc\.setQueryData\(\['uom', targetProductId\], verified\)/));
check('successful clear protected by selected-product ref',()=>assert.match(handler,/if \(activeUomProductRef\.current !== targetProductId\) return;\s*clearUomForm\(\)/));
check('missing-row error is scoped to submitted product',()=>assert.match(handler,/activeUomProductRef\.current === targetProductId\) \{[\s\S]*?const warning = ui\("The save was acknowledged, but the conversion was not found on reload/));
check('unavailable-readback error is scoped to submitted product',()=>assert.match(handler,/activeUomProductRef\.current === targetProductId\) \{[\s\S]*?const warning = ui\("The save was acknowledged, but the conversion could not be checked/));
check('POST suppresses premature global success toast',()=>assert.match(handler,/apiRequest\(`\/inventory-capabilities\/products\/\$\{targetProductId\}\/uom`, \{ method: 'POST', body: JSON\.stringify\(payload\), skipMutationFeedback: true \}\)/));
check('verified success shows final success feedback',()=>assert.match(handler,/showTenantActionSuccess\(ui\(payload\.expected_version > 0/));
check('missing-row warning raises error feedback',()=>assert.match(handler,/showTenantActionError\(warning\)/));
check('delete stays in place',()=>assert.match(remove.getText(ast),/method: 'DELETE', version: row\.version/));
check('backend read route retains permission gate',()=>assert.match(backendRoutes,/router\.get\('\/products\/:productId\/uom', requirePermission\(TENANT_PERMISSIONS\.PRODUCTS_READ\)/));
check('backend write route retains permission gate',()=>assert.match(backendRoutes,/router\.post\('\/products\/:productId\/uom', requirePermission\(TENANT_PERMISSIONS\.PRODUCTS_WRITE\)/));
check('backend GET reads persisted table',()=>assert.match(backendService,/SELECT \* FROM product_uom_conversions WHERE tenant_id=\$1 AND product_id=\$2 ORDER BY uom_code/));
check('backend write still returns inserted row',()=>assert.match(backendService,/ON CONFLICT \(tenant_id, product_id, uom_code\) DO NOTHING\s*RETURNING \*/));
for(const en of ['The save was acknowledged, but the conversion was not found on reload. Check the saved list before trying again.','The save was acknowledged, but the conversion could not be checked. Refresh the saved list before trying again.']){
 const rows=translations.split('\n').filter(x=>x.trim().startsWith('["'+en+'",'));
 check('new translation exists once',()=>assert.equal(rows.length,1));
 const fields=JSON.parse(rows[0].trim().replace(/,$/,''));
 check('all five languages have text',()=>{assert.equal(fields.length,5);assert(fields.every(x=>x.trim().length>35))});
 check('non-English text not English duplicates',()=>assert(fields.slice(1).every(x=>x!==en)));
}
const js=ts.transpileModule(`const saveOptions = ${handler};`,{fileName:'uom-readback-check.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function scenario(behavior='ok'){
 const observed={calls:[],invalidations:[],cache:[],clears:0,conversion:[],errors:[],feedback:[]};
 const activeUomProductRef={current:'A'};
 const conversionRequestSeqRef={current:0};
 const payload={uom_code:'CASE',uom_name:'Case',factor_to_base:24,purchase_uom:false,issue_uom:false,expected_version:0};
 const vars={targetProductId:'A',payload};
 const standard={base_uom:'pcs',conversions:[{id:'unit-1',uom_code:'case',factor_to_base:'24',purchase_uom:false,issue_uom:false}]};
 const behaviors={ok:standard,missing:{base_uom:'pcs',conversions:[]},wrongFactor:{base_uom:'pcs',conversions:[{...standard.conversions[0],factor_to_base:12}]},wrongPurchase:{base_uom:'pcs',conversions:[{...standard.conversions[0],purchase_uom:true}]},wrongIssue:{base_uom:'pcs',conversions:[{...standard.conversions[0],issue_uom:true}]},throwError:new Error('GET unavailable'),rounding:{base_uom:'pcs',conversions:[{...standard.conversions[0],factor_to_base:24.00000000001}]}};
 const apiRequest=(url,opts)=>{observed.calls.push({url,opts});return behaviors[behavior] instanceof Error? Promise.reject(behaviors[behavior]):Promise.resolve(behaviors[behavior]);};
 const qc={invalidateQueries:({queryKey})=>observed.invalidations.push(queryKey),setQueryData:(key,data)=>observed.cache.push({key,data})};
 const clearUomForm=()=>observed.clears++;
 const setConverted=x=>observed.conversion.push(x);
 const setError=x=>observed.errors.push(x);
 const ui=x=>x;
 const messageFrom=e=>e.message;
 const showTenantActionSuccess=x=>observed.feedback.push(['success',x]);
 const showTenantActionError=x=>observed.feedback.push(['error',x]);
 const build=new Function('apiRequest','qc','activeUomProductRef','conversionRequestSeqRef','clearUomForm','setConverted','setError','ui','messageFrom','showTenantActionSuccess','showTenantActionError',js+'\nreturn saveOptions;');
 return {handler:build(apiRequest,qc,activeUomProductRef,conversionRequestSeqRef,clearUomForm,setConverted,setError,ui,messageFrom,showTenantActionSuccess,showTenantActionError),observed,activeUomProductRef,conversionRequestSeqRef,vars,standard};
}
{
 const s=scenario(); await s.handler.mutationFn(s.vars);
 check('POST uses original submitted product',()=>assert.equal(s.observed.calls[0].url,'/inventory-capabilities/products/A/uom'));
 check('POST transmits expected payload',()=>assert.deepEqual(JSON.parse(s.observed.calls[0].opts.body),s.vars.payload));
 check('POST success toast deliberately suppressed until verified',()=>assert.equal(s.observed.calls[0].opts.skipMutationFeedback,true));
 await s.handler.onSuccess({},s.vars);
 check('GET readback uses original product',()=>assert.equal(s.observed.calls[1].url,'/inventory-capabilities/products/A/uom'));
 check('verified result placed into correct cache',()=>assert.deepEqual(s.observed.cache[0].key,['uom','A']));
 check('normal save clears form only after verified readback',()=>assert.equal(s.observed.clears,1));
 check('normal save resets stale conversion result',()=>assert.deepEqual(s.observed.conversion,[null]));
 check('normal save increments generation',()=>assert.equal(s.conversionRequestSeqRef.current,1));
 check('normal verified save clears errors',()=>assert.deepEqual(s.observed.errors,[null]));
 check('verified creation announces specific success',()=>assert.deepEqual(s.observed.feedback,[['success','Unit conversion saved successfully.']]));
 check('no invalidation on verified response',()=>assert.deepEqual(s.observed.invalidations,[]));
}
for(const state of ['missing','wrongFactor','wrongPurchase','wrongIssue','throwError']){
 const s=scenario(state); await s.handler.onSuccess({},s.vars);
 check(`${state} does not falsely clear the save form`,()=>assert.equal(s.observed.clears,0));
 check(`${state} does not update cache with an unverified conversion`,()=>assert.equal(s.observed.cache.length,0));
 check(`${state} retries correct product cache`,()=>assert.deepEqual(s.observed.invalidations,[['uom','A']]));
 check(`${state} shows verification warning`,()=>assert.match(s.observed.errors.at(-1),/The save was acknowledged, but the conversion/));
 check(`${state} has warning toast, never premature green success`,()=>assert.deepEqual(s.observed.feedback,[['error',s.observed.errors.at(-1)]]));
}
{
 const s=scenario('rounding'); await s.handler.onSuccess({},s.vars);
 check('minor storage precision difference accepted',()=>assert.equal(s.observed.clears,1));
}
{
 const s=scenario(); s.activeUomProductRef.current='B'; await s.handler.onSuccess({},s.vars);
 check('late save verifies original product',()=>assert.equal(s.observed.calls[0].url,'/inventory-capabilities/products/A/uom'));
 check('late verified response updates original product cache',()=>assert.deepEqual(s.observed.cache[0].key,['uom','A']));
 check('late success cannot clear new product form',()=>assert.equal(s.observed.clears,0));
 check('late success cannot change new product conversion',()=>assert.equal(s.observed.conversion.length,0));
 check('late success cannot change new product errors',()=>assert.equal(s.observed.errors.length,0));
 check('late success cannot announce on new product',()=>assert.deepEqual(s.observed.feedback,[]));
}
{
 const s=scenario('missing'); s.activeUomProductRef.current='B'; await s.handler.onSuccess({},s.vars);
 check('missing old product conversion invalidates old cache only',()=>assert.deepEqual(s.observed.invalidations,[['uom','A']]));
 check('missing old product conversion does not show error on B',()=>assert.equal(s.observed.errors.length,0));
}
{
 const s=scenario('throwError'); s.activeUomProductRef.current='B'; await s.handler.onSuccess({},s.vars);
 check('GET failure on old product invalidates only old cache',()=>assert.deepEqual(s.observed.invalidations,[['uom','A']]));
 check('GET failure on old product cannot show error on B',()=>assert.equal(s.observed.errors.length,0));
}
{
 const s=scenario();s.handler.onError(new Error('POST failed'),s.vars);
 check('POST error still uses original error',()=>assert.equal(s.observed.errors.at(-1),'POST failed'));
 check('POST error still displays error toast',()=>assert.deepEqual(s.observed.feedback,[['error','POST failed']]));
 check('POST failure never triggers readback',()=>assert.equal(s.observed.calls.length,0));
}
console.log(`Batch154 UoM write/readback confirmation: ${checks}/${checks} PASS`);
