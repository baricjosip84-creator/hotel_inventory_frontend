import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts=require('typescript');
const root=process.cwd();
const api=readFileSync(process.env.BATCH143_API_SOURCE || path.join(root,'src/lib/api.ts'),'utf8');
const page=readFileSync(path.join(root,'src/pages/OutboundPage.tsx'),'utf8');
const translations=readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const backend=readFileSync(path.join(root,'../hotel-inventory-backend/src/routes/outbound.js'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let n=0;
function check(label,run){run();n++;console.log('PASS',label);}
for(const [name,source,kind] of [['api',api,ts.ScriptKind.TS],['outbound',page,ts.ScriptKind.TSX],['translations',translations,ts.ScriptKind.TS]]){
  check(name+' parses',()=>assert.equal(ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,kind).parseDiagnostics.length,0));
  check(name+' transpiles',()=>assert.equal((ts.transpileModule(source,{fileName:name+(kind===ts.ScriptKind.TSX?'.tsx':'.ts'),reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
}
check('test registered',()=>assert.equal(pkg.scripts['check:batch143-customer-order-workflow-feedback'],'node scripts/check-batch143-customer-order-workflow-feedback.mjs'));
const parsed=ts.createSourceFile('api.ts',api,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const required=['isProductPackageMutationPath','readMutationStringField','readMutationBooleanField','readMutationNumberField','readMutationAction','barcodeLabelCreatedMessage','tenantMutationActionLabel','tenantMutationSuccessMessage'];
const found={};function walk(x){if(ts.isFunctionDeclaration(x)&&required.includes(x.name?.text))found[x.name.text]=x;ts.forEachChild(x,walk);}walk(parsed);
for(const name of required)check('existing helper '+name,()=>assert(found[name]));
const compiled=ts.transpileModule(required.map(name=>found[name].getText(parsed)).join('\n'),{fileName:'resolver.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const resolve=new Function(compiled+'\nreturn tenantMutationSuccessMessage;')();
const workflows=[
['confirm','Customer order confirmed and stock reserved.'],
['start-picking','Customer order is ready for picking.'],
['pick','Customer order pick recorded successfully.'],
['mark-packed','Customer order marked packed successfully.'],
['reset-picks','Customer order picks cleared successfully.'],
['dispatch','Customer order packed stock dispatched successfully.'],
];
for(const [action,message] of workflows){
 const url='/outbound/orders/order-id/'+action;
 check(action+' exact',()=>assert.equal(resolve(url,'POST','{}'),message));
 check(action+' mixed case',()=>assert.equal(resolve(url.toUpperCase(),'post','{}'),message));
 check(action+' query',()=>assert.equal(resolve(url+'?context=orders','POST','{}'),message));
 check(action+' no GET',()=>assert.notEqual(resolve(url,'GET','{}'),message));
 check(action+' no PUT',()=>assert.notEqual(resolve(url,'PUT','{}'),message));
 check(action+' no nested action',()=>assert.notEqual(resolve(url+'/notes','POST','{}'),message));
 check(action+' no similar trailing action',()=>assert.notEqual(resolve(url+'-again','POST','{}'),message));
 const tr=translations.split('\n').filter(l=>l.trim().startsWith('["'+message+'",'));
 check(action+' one translation row',()=>assert.equal(tr.length,1));
 const values=JSON.parse(tr[0].trim().replace(/,$/,''));
 check(action+' five translated entries',()=>assert.equal(values.length,5));
 for(const [i,lang] of ['en','de','es','fr','hr'].entries())check(action+' '+lang+' translated',()=>assert(values[i].trim().length>16));
 check(action+' unique action returns',()=>assert(!workflows.some(([other,otherMessage])=>other!==action&&resolve(url,'POST','{}')===otherMessage)));
}
check('order cancel prior behavior',()=>assert.equal(resolve('/outbound/orders/id/cancel','POST','{}'),'Customer order cancelled successfully.'));
check('customer return created prior behavior',()=>assert.equal(resolve('/outbound/returns','POST','{}'),'Customer return created successfully.'));
check('customer return received prior behavior',()=>assert.equal(resolve('/outbound/returns/id/receive','POST','{}'),'Customer return received successfully.'));
check('supplier return not mistakenly matched',()=>assert.notEqual(resolve('/enterprise-inventory/supplier-returns/id/dispatch','POST','{}'),workflows[5][1]));
check('order document not wrongly matched',()=>assert.notEqual(resolve('/outbound/orders/id/documents','POST','{}'),workflows[0][1]));
check('order creation not wrongly matched',()=>assert.notEqual(resolve('/outbound/orders','POST','{}'),workflows[0][1]));
for(const action of ['confirm','start-picking','pick','mark-packed','reset-picks','dispatch']){
 check('client still calls '+action,()=>assert(page.includes('/outbound/orders/${order.id}/'+action)||page.includes('/outbound/orders/${pickOptions.data.order.id}/'+action)));
}
check('client retains version concurrency',()=>assert.match(page,/version: Number\(order\.version\)/));
check('client retains picked lot payload',()=>assert.match(page,/inventory_lot_id: item\.serial_tracking_enabled \? null : draft\.inventory_lot_id \|\| null/));
check('client retains serial numbers',()=>assert.match(page,/serial_numbers: draft\.serial_numbers/));
check('client retains selected stock invalid-state guard',()=>assert.match(page,/!Number\.isFinite\(quantity\) \|\| quantity <= 0/));
check('client retains dispatch confirmation',()=>assert.match(page,/Dispatch all currently packed stock\?/));
check('client retains local outcome feedback',()=>assert.match(page,/setMessage\(variables\.successMessage\)/));
check('client retains error behavior',()=>assert.match(page,/setError\(mutationErrorMessage\(mutationError, ui\)\)/));
check('client retains stock invalidation',()=>assert.match(page,/queryKey: \['stock'\]/));
check('backend versioned lifecycle',()=>assert.match(backend,/requireVersion\(\{ table: 'outbound_orders', param: 'id' \}\)/));
for(const [action] of workflows){
 if(action==='pick')check('backend pick permission',()=>assert.match(backend,/router\.post\(\s*'\/orders\/:id\/pick',[\s\S]{0,120}requirePermission\(TENANT_PERMISSIONS\.OUTBOUND_ORDERS_UPDATE\)/));
 else check('backend '+action+' permission',()=>assert(backend.includes("orderAction('"+action+"', TENANT_PERMISSIONS.OUTBOUND_ORDERS_"+(action==='dispatch'?'DISPATCH':'UPDATE'))));
}
check('toast emitted only on successful api response',()=>assert.match(api,/dispatchTenantMutationFeedback\(\{ type: 'success', message: tenantMutationSuccessMessage\(path, method, requestOptions\.body\), translateMessage: true \}\)/));
console.log(`BATCH143 FOCUSED: ${n}/${n} PASS`);
