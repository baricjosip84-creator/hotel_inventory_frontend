import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const front=process.cwd();
const api=readFileSync(process.env.BATCH144_API_SOURCE || path.join(front,'src/lib/api.ts'),'utf8');
const page=readFileSync(path.join(front,'src/pages/OutboundPage.tsx'),'utf8');
const locales=readFileSync(path.join(front,'src/i18n/tenantUiTranslations.ts'),'utf8');
const backend=readFileSync(path.join(front,'../hotel-inventory-backend/src/routes/outbound.js'),'utf8');
const pkg=JSON.parse(readFileSync(path.join(front,'package.json'),'utf8'));
let n=0;
function check(label,fn){fn();n++;console.log('PASS',label);}
for(const [name,source,kind] of [['api',api,ts.ScriptKind.TS],['OutboundPage',page,ts.ScriptKind.TSX],['translations',locales,ts.ScriptKind.TS]]){
 check(name+' parses',()=>assert.equal(ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,kind).parseDiagnostics.length,0));
 check(name+' transpiles',()=>assert.equal((ts.transpileModule(source,{fileName:name+(kind===ts.ScriptKind.TSX?'.tsx':'.ts'),reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0));
}
check('test script registered',()=>assert.equal(pkg.scripts['check:batch144-outbound-pdf-feedback'],'node scripts/check-batch144-outbound-pdf-feedback.mjs'));
const parsed=ts.createSourceFile('api.ts',api,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const required=['isProductPackageMutationPath','readMutationStringField','readMutationBooleanField','readMutationNumberField','readMutationAction','barcodeLabelCreatedMessage','tenantMutationActionLabel','tenantMutationSuccessMessage'];
const found={};
function walk(x){if(ts.isFunctionDeclaration(x)&&required.includes(x.name?.text))found[x.name.text]=x;ts.forEachChild(x,walk);}walk(parsed);
for(const name of required)check('resolver helper '+name,()=>assert(found[name]));
const compiled=ts.transpileModule(required.map(name=>found[name].getText(parsed)).join('\n'),{fileName:'resolver.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const resolve=new Function(compiled+'\nreturn tenantMutationSuccessMessage;')();
const actions=[
  ['/outbound/orders/order-id/documents','Customer order PDF created successfully.'],
  ['/outbound/returns/return-id/documents','Customer return receipt created successfully.']
];
for(const [url,label] of actions){
 check(url+' POST accurate',()=>assert.equal(resolve(url,'POST','{}'),label));
 check(url+' uppercase path lowercase method',()=>assert.equal(resolve(url.toUpperCase(),'post','{}'),label));
 check(url+' querystring',()=>assert.equal(resolve(url+'?v=3','POST','{}'),label));
 check(url+' GET not matched',()=>assert.notEqual(resolve(url,'GET','{}'),label));
 check(url+' PUT not matched',()=>assert.notEqual(resolve(url,'PUT','{}'),label));
 check(url+' DELETE not matched',()=>assert.notEqual(resolve(url,'DELETE','{}'),label));
 check(url+' preview excluded',()=>assert.notEqual(resolve(url+'/preview','POST','{}'),label));
 check(url+' similar suffix excluded',()=>assert.notEqual(resolve(url+'-archive','POST','{}'),label));
 check(url+' nested extra excluded',()=>assert.notEqual(resolve(url+'/other','POST','{}'),label));
 check(url+' parent excluded',()=>assert.notEqual(resolve(url.slice(0,url.lastIndexOf('/')),'POST','{}'),label));
 const trs=locales.split('\n').filter(x=>x.trim().startsWith('["'+label+'",'));
 check(url+' unique translation key',()=>assert.equal(trs.length,1));
 const values=JSON.parse(trs[0].trim().replace(/,$/,''));
 check(url+' full five translations',()=>assert.equal(values.length,5));
 for(const [i,lang] of ['en','de','es','fr','hr'].entries())check(url+' translated '+lang,()=>assert(values[i].trim().length>15));
}
check('order/return document messages unique',()=>assert.notEqual(actions[0][1],actions[1][1]));
check('order cancel still intact',()=>assert.equal(resolve('/outbound/orders/id/cancel','POST','{}'),'Customer order cancelled successfully.'));
check('return creation still intact',()=>assert.equal(resolve('/outbound/returns','POST','{}'),'Customer return created successfully.'));
check('return receipt action not order PDF',()=>assert.notEqual(resolve(actions[1][0],'POST','{}'),actions[0][1]));
check('email preview no PDF success',()=>assert.notEqual(resolve('/outbound/documents/id/email-preview','POST','{}'),actions[0][1]));
check('email send no PDF success',()=>assert.notEqual(resolve('/outbound/documents/id/send-email','POST','{}'),actions[0][1]));
check('return preview no creation success',()=>assert.notEqual(resolve('/outbound/returns/id/documents/preview','POST','{}'),actions[1][1]));
check('order pdf caller preserved',()=>assert(page.includes('apiRequest(`/outbound/orders/${order.id}/documents`, { method: \'POST\', body: JSON.stringify({ type }), skipMutationFeedback: true })')));
check('return receipt caller preserved',()=>assert(page.includes('apiRequest<OutboundDocument>(`/outbound/returns/${row.id}/documents`, { method: \'POST\', body: JSON.stringify({}), skipMutationFeedback: true })')));
check('order preview never advertises creation',()=>assert(page.includes('apiRequest<DocumentPreview>(`/outbound/orders/${order.id}/documents/preview`, { method: \'POST\', body: JSON.stringify({ type }), skipMutationFeedback: true })')));
check('return preview never advertises creation',()=>assert(page.includes('apiRequest<DocumentPreview>(`/outbound/returns/${row.id}/documents/preview`, { method: \'POST\', body: JSON.stringify({}), skipMutationFeedback: true })')));
check('email preview stays non-mutating',()=>assert(page.includes('apiRequest<{ recipient_email: string; subject: string; message?: string; document:')&&page.includes('/email-preview`, { method: \'POST\', body: JSON.stringify({}), skipMutationFeedback: true }')));
check('order inline stored confirmation retained',()=>assert(page.includes("setMessage(ui('Document created and stored with this order.'))")));
check('return receipt inline confirmation retained',()=>assert(page.includes("setMessage(ui('Document created and stored.'))")));
check('order document list refreshed',()=>assert(page.includes('orderDocuments.refetch(), orderActivity.refetch()')));
check('return receipt list refreshed',()=>assert(page.includes('await returnDocuments.refetch()')));
check('return receipt still downloaded',()=>assert(page.includes('await apiDownloadFile(`/outbound/documents/${created.id}/download`, created.filename)')));
check('order stored PDF permission remains',()=>assert(backend.includes("router.post('/orders/:id/documents', requirePermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_UPDATE)")));
check('return receipt create permission remains',()=>assert(backend.includes("router.post('/returns/:id/documents', requirePermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_RECEIVE)")));
check('order preview permission remains',()=>assert(backend.includes("router.post('/orders/:id/documents/preview', requirePermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_READ)")));
check('return preview permission remains',()=>assert(backend.includes("router.post('/returns/:id/documents/preview', requirePermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_READ)")));
check('email sending still requires explicit confirmation',()=>assert(backend.includes('confirmed: Joi.boolean().valid(true).required()')));
check('mutation success only after HTTP success',()=>assert.match(api,/dispatchTenantMutationFeedback\(\{ type: 'success', message: tenantMutationSuccessMessage\(path, method, requestOptions\.body\), translateMessage: true \}\)/));
console.log(`BATCH144 FOCUSED: ${n}/${n} PASS`);
