import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const api = readFileSync(process.env.BATCH140_API_SOURCE || path.join(root,'src/lib/api.ts'),'utf8');
const outbound = readFileSync(path.join(root,'src/pages/OutboundPage.tsx'),'utf8');
const translations = readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const pkg = JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let checks=0;
function check(label,fn) {fn(); checks++; console.log('PASS', label);}
const sourceFile=ts.createSourceFile('api.ts',api,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
check('API source valid TypeScript',()=>assert.equal(sourceFile.parseDiagnostics.length,0));
check('Outbound page parses as TSX',()=>assert.equal(ts.createSourceFile('OutboundPage.tsx',outbound,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length,0));
check('Translations parse as TypeScript',()=>assert.equal(ts.createSourceFile('translations.ts',translations,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0));
check('API isolated TS transpile',()=>assert.equal((ts.transpileModule(api,{fileName:'api.ts',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('Outbound TSX isolated transpile',()=>assert.equal((ts.transpileModule(outbound,{fileName:'OutboundPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0));
check('registered test script',()=>assert.equal(pkg.scripts['check:batch140-outbound-cancel-feedback'],'node scripts/check-batch140-outbound-cancel-feedback.mjs'));
const needed=['isProductPackageMutationPath','readMutationStringField','readMutationBooleanField','readMutationNumberField','readMutationAction','barcodeLabelCreatedMessage','tenantMutationActionLabel','tenantMutationSuccessMessage'];
const found={};function visit(node) {if(ts.isFunctionDeclaration(node) && needed.includes(node.name?.text))found[node.name.text]=node;ts.forEachChild(node,visit);}visit(sourceFile);
for(const n of needed)check('resolver helper preserved '+n,()=>assert(found[n]));
const code=ts.transpileModule(needed.map(n=>found[n].getText(sourceFile)).join('\n'),{fileName:'resolver.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const resolve = new Function(code+'\nreturn tenantMutationSuccessMessage;')();
const msg='Customer order cancelled successfully.';
const route='/outbound/orders/out-99/cancel';
check('cancel POST returns exact contextual feedback',()=>assert.equal(resolve(route,'POST',JSON.stringify({reason:'Order no longer needed'})),msg));
check('cancel POST with uppercase path recognized',()=>assert.equal(resolve('/OUTBOUND/ORDERS/OUT-99/CANCEL','POST','{}'),msg));
check('cancel lowercase method recognized',()=>assert.equal(resolve(route,'post','{}'),msg));
check('querystring does not alter action identity',()=>assert.equal(resolve(route+'?tab=orders','POST','{}'),msg));
check('status-only cancellation does not fabricate other messages',()=>assert.equal(resolve('/outbound/orders/x/cancel','POST'),msg));
for(const [label,url,method] of [
 ['order creation','/outbound/orders','POST'],
 ['order edit','/outbound/orders/x','PUT'],
 ['order confirmation','/outbound/orders/x/confirm','POST'],
 ['start picking','/outbound/orders/x/start-picking','POST'],
 ['order packing','/outbound/orders/x/mark-packed','POST'],
 ['order dispatch','/outbound/orders/x/dispatch','POST'],
 ['customer deletion route','/outbound/customers/x/archive','POST'],
 ['return cancellation','/outbound/returns/x/cancel','POST'],
 ['return receive','/outbound/returns/x/receive','POST'],
 ['order GET cancel URL','/outbound/orders/x/cancel','GET'],
 ['order PUT cancel URL','/outbound/orders/x/cancel','PUT'],
 ['order DELETE cancel URL','/outbound/orders/x/cancel','DELETE'],
 ['cancel URL with extra segment','/outbound/orders/x/cancel/confirm','POST'],
 ['similarly named action','/outbound/orders/x/cancelled','POST'],
 ['similar other resource','/outbound/order/x/cancel','POST'],
 ['unrelated stock adjustment','/stock/adjust','POST'],
 ['purchase order cancellation','/purchase-orders/x/cancel','POST']
])check('scoped resolver excludes '+label,()=>assert.notEqual(resolve(url,method,'{}'),msg));
check('existing stock adjustment toast intact',()=>assert.equal(resolve('/stock/adjust','POST'),'Stock adjustment applied successfully.'));
check('existing purchase order cancel toast intact',()=>assert.equal(resolve('/purchase-orders/x/cancel','POST'),'Purchase order cancelled successfully.'));
check('existing serial registration intact',()=>assert.equal(resolve('/inventory-capabilities/serials','POST'),'Serial registered successfully.'));
check('customer order cancel action still carries reason',()=>assert.match(outbound,/path: `\/outbound\/orders\/\$\{order\.id\}\/cancel`, body: \{ reason: cancelOrderReason\.trim\(\) \}/));
check('order cancellation still sends optimistic version',()=>assert.match(outbound,/path: `\/outbound\/orders\/\$\{order\.id\}\/cancel`, body:[^\n]+version: Number\(order\.version\)/));
check('order cancel still requires minimum 3 characters reason',()=>assert.match(outbound,/cancelOrderReason\.trim\(\)\.length < 3/));
check('order cancel inline business status remains correct',()=>assert.match(outbound,/alreadyDispatched \? ui\('\{order\} cancelled for the remaining undelivered quantity\.'\)/));
check('order cancel clears only local form after success',()=>assert.match(outbound,/setCancelOrderId\(''\); setCancelOrderReason\(''\);/));
check('order cancel uses existing mutation feedback path',()=>assert.match(outbound,/const mutation = useMutation\(\{\s*mutationFn: \(\{ path, method = 'POST', body, version \}: MutationInput\) => apiRequest\(path/));
check('existing error reporting remains',()=>assert.match(outbound,/onError: async \(mutationError\) => \{\s*setMessage\(''\);\s*setError\(mutationErrorMessage\(mutationError, ui\)\)/));
check('cancel stays permission-gated',()=>assert.match(outbound,/canCancel/));
check('shared toast dispatched only on success',()=>assert.match(api,/dispatchTenantMutationFeedback\(\{ type: 'success', message: tenantMutationSuccessMessage\(path, method, requestOptions\.body\), translateMessage: true \}\)/));
const translationsRows=translations.split('\n').filter(l=>l.trim().startsWith('["'+msg+'",'));
check('translation row exactly once',()=>assert.equal(translationsRows.length,1));
const match=translationsRows[0].trim().replace(/,$/,'');
const values=JSON.parse(match);
check('translation has five locales',()=>assert.equal(values.length,5));
for(const [idx,locale] of ['English','German','Spanish','French','Croatian'].entries())check(locale+' translation nonempty',()=>assert(values[idx].trim().length>=24));
console.log(`BATCH140 FOCUSED: ${checks}/${checks} PASS`);
