import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const api = readFileSync(process.env.BATCH142_API_SOURCE || path.join(root,'src/lib/api.ts'),'utf8');
const page = readFileSync(path.join(root,'src/pages/OutboundPage.tsx'),'utf8');
const translations = readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const backend = readFileSync(path.join(root,'../hotel-inventory-backend/src/routes/outbound.js'),'utf8');
const pkg = JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let checks = 0;
function check(label, fn){fn();checks++; console.log('PASS',label);}
for (const [name,source,kind] of [['api',api,ts.ScriptKind.TS],['outbound',page,ts.ScriptKind.TSX],['translations',translations,ts.ScriptKind.TS]]) {
 check(name+' syntax',()=>assert.equal(ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,kind).parseDiagnostics.length,0));
 check(name+' transpile',()=>assert.equal((ts.transpileModule(source,{fileName:name+(kind===ts.ScriptKind.TSX?'.tsx':'.ts'),reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
}
check('test registered',()=>assert.equal(pkg.scripts['check:batch142-customer-return-lifecycle-feedback'],'node scripts/check-batch142-customer-return-lifecycle-feedback.mjs'));
const parsed=ts.createSourceFile('api.ts',api,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const required=['isProductPackageMutationPath','readMutationStringField','readMutationBooleanField','readMutationNumberField','readMutationAction','barcodeLabelCreatedMessage','tenantMutationActionLabel','tenantMutationSuccessMessage'];
const found={};
function walk(n){if(ts.isFunctionDeclaration(n)&&required.includes(n.name?.text))found[n.name.text]=n;ts.forEachChild(n,walk);}walk(parsed);
for(const name of required)check('resolver helper intact '+name,()=>assert(found[name]));
const compiled=ts.transpileModule(required.map(n=>found[n].getText(parsed)).join('\n'),{fileName:'resolver.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const resolve=new Function(compiled+'\nreturn tenantMutationSuccessMessage;')();
const actions=[
  ['/outbound/returns','Customer return created successfully.'],
  ['/outbound/returns/abc-123/receive','Customer return received successfully.'],
  ['/outbound/returns/abc-123/cancel','Customer return cancelled successfully.'],
];
for(const [url,msg] of actions){
  check('exact '+url,()=>assert.equal(resolve(url,'POST','{}'),msg));
  check('case-insensitive '+url,()=>assert.equal(resolve(url.toUpperCase(),'post','{}'),msg));
  check('querystring '+url,()=>assert.equal(resolve(url+'?flow=returns','POST','{}'),msg));
  check('GET unchanged '+url,()=>assert.notEqual(resolve(url,'GET','{}'),msg));
  check('PUT unchanged '+url,()=>assert.notEqual(resolve(url,'PUT','{}'),msg));
  check('POST nested URL not confused '+url,()=>assert.notEqual(resolve(url+'/documents','POST','{}'),msg));
}
check('create does not label document creation',()=>assert.notEqual(resolve('/outbound/returns/abc/documents','POST','{}'),actions[0][1]));
check('cancel no false matches',()=>assert.notEqual(resolve('/outbound/returns/abc/cancelled','POST','{}'),actions[2][1]));
check('receive no false matches',()=>assert.notEqual(resolve('/outbound/returns/abc/receive-more','POST','{}'),actions[1][1]));
check('only customer returns (not supplier returns)',()=>assert.notEqual(resolve('/enterprise-inventory/supplier-returns/abc/cancel','POST','{}'),actions[2][1]));
check('previous customer order cancellation still correct',()=>assert.equal(resolve('/outbound/orders/abc/cancel','POST','{}'),'Customer order cancelled successfully.'));
check('previous serial registration still correct',()=>assert.equal(resolve('/inventory-capabilities/serials','POST','{}'),'Serial registered successfully.'));
check('previous custom field creation still correct',()=>assert.equal(resolve('/inventory-capabilities/custom-fields','POST','{}'),'Custom field created successfully.'));
check('previous UOM still correct',()=>assert.equal(resolve('/inventory-capabilities/products/abc/uom','POST','{}'),'Unit conversion saved successfully.'));
check('previous landed cost still correct',()=>assert.equal(resolve('/inventory-capabilities/landed-costs/finalize','POST','{}'),'Landed cost finalized successfully.'));
check('client still submits return creation route',()=>assert.match(page,/path: '\/outbound\/returns',\s*body: \{/));
check('client still supplies return reason',()=>assert.match(page,/reason: returnForm\.reason\.trim\(\)/));
check('client still supplies return items',()=>assert.match(page,/items: returnForm\.items\.map\(\(line\) => \(/));
check('client still supplies optimistic receive version',()=>assert.match(page,/path: `\/outbound\/returns\/\$\{row\.id\}\/receive`, version: Number\(row\.version\)/));
check('client still supplies optimistic cancel version',()=>assert.match(page,/path: `\/outbound\/returns\/\$\{row\.id\}\/cancel`, version: Number\(row\.version\)/));
check('cancel still sends reason',()=>assert.match(page,/body: \{ reason: cancelReturnReason\.trim\(\) \}/));
check('reason validation unchanged',()=>assert.match(page,/cancelReturnReason\.trim\(\)\.length < 3/));
check('client still confirms actual return receipt',()=>assert.match(page,/Receive this customer return into inventory now\?/));
check('inline creation feedback preserved',()=>assert.match(page,/Customer return created and is waiting to be received\./));
check('inline receive feedback preserved',()=>assert.match(page,/received into inventory\./));
check('inline cancel feedback preserved',()=>assert.match(page,/\{return\} cancelled\./));
check('client still error-handles mutations',()=>assert.match(page,/onError: async \(mutationError\) => \{/));
check('client still invalidates stock queries',()=>assert.match(page,/queryKey: \['stock'\]/));
check('backend create permission retained',()=>assert.match(backend,/router\.post\('\/returns',\s*requirePermission\(TENANT_PERMISSIONS\.CUSTOMER_RETURNS_CREATE\)/));
check('backend receive permission retained',()=>assert.match(backend,/returnAction\('receive', TENANT_PERMISSIONS\.CUSTOMER_RETURNS_RECEIVE/));
check('backend cancel permission retained',()=>assert.match(backend,/returnAction\('cancel', TENANT_PERMISSIONS\.CUSTOMER_RETURNS_CANCEL/));
check('backend version guard retained',()=>assert.match(backend,/requireVersion\(\{ table: 'customer_returns', param: 'id' \}\)/));
check('backend cancellation reason required',()=>assert.match(backend,/Joi\.string\(\)\.trim\(\)\.min\(3\)\.max\(1000\)\.required\(\)/));
check('global toast only on successful response',()=>assert.match(api,/dispatchTenantMutationFeedback\(\{ type: 'success', message: tenantMutationSuccessMessage\(path, method, requestOptions\.body\), translateMessage: true \}\)/));
for(const [_,msg] of actions){
  const rows=translations.split('\n').filter(l=>l.trim().startsWith('["'+msg+'",'));
  check('exactly one translation row '+msg,()=>assert.equal(rows.length,1));
  const values=JSON.parse(rows[0].trim().replace(/,$/,''));
  check('five languages for '+msg,()=>assert.equal(values.length,5));
  for(const [i,l] of ['en','de','es','fr','hr'].entries()) check(l+' '+msg,()=>assert(values[i].trim().length>14));
}
console.log(`BATCH142 FOCUSED: ${checks}/${checks} PASS`);
