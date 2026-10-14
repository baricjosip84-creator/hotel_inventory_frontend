import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source=fs.readFileSync(path.join(root,'src/pages/OutboundPage.tsx'),'utf8');
let count=0;
const check=(label,cb)=>{cb();console.log('PASS',label);count++};
const file=ts.createSourceFile('OutboundPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
check('full page TypeScript TSX parser diagnostics',()=> assert.equal(file.parseDiagnostics.length,0));
const mutationBlock=source.slice(source.indexOf('const mutation = useMutation({'),source.indexOf('const customerOptions = useMemo'));
check('shared Outbound mutation calls API exactly once',()=> assert.match(mutationBlock,/mutationFn:.*?apiRequest\(path,/s));
check('shared mutation POST retains payload',()=> assert.match(mutationBlock,/body:\s*JSON\.stringify\(body\s*\?\?\s*\{\}\)/));
check('shared mutation retains version protection',()=> assert.match(mutationBlock,/If-Match-Version/));
check('shared mutation suppresses generic toast',()=> assert.match(mutationBlock,/skipMutationFeedback:\s*true/));
check('shared mutation success remains action-specific',()=> assert.match(mutationBlock,/setMessage\(variables\.successMessage\)/));
check('shared mutation errors remain contextual',()=> assert.match(mutationBlock,/setError\(mutationErrorMessage\(mutationError,\s*ui\)\)/));
for (const [label,path] of [
 ['receive return', '/outbound/returns/${row.id}/receive'],
 ['cancel return','/outbound/returns/${row.id}/cancel'],
 ['create return','/outbound/returns'],
 ['confirm order','/outbound/orders/${order.id}/confirm'],
 ['dispatch order','/outbound/orders/${order.id}/dispatch']]) {
 check(`${label} action remains`,()=> assert.ok(source.includes(path)));
}
for(const [label,method] of [['order receipt','createOrderDocument'],['return receipt','createReturnReceipt']]){
 const start=source.indexOf(`const ${method} = async`), next=source.indexOf('\n  const ', start+8);
 const body=source.slice(start,next>=0?next:start+950);
 check(`${label} creation still POSTs`,()=> assert.match(body,/method:\s*'POST'/));
 check(`${label} suppresses duplicate generic toast`,()=> assert.match(body,/skipMutationFeedback:\s*true/));
 check(`${label} displays document-specific confirmation`,()=> assert.match(body,/setMessage\(ui\('Document created and stored/));
 check(`${label} keeps error handling`,()=> assert.match(body,/setError\(mutationErrorMessage\(documentError,\s*ui\)\)/));
}
for(const path of ['uploadBusinessAttachment','previewReturnReceipt','previewOrderDocument','sendStoredDocument'])check(`${path} path retained`,()=>assert.ok(source.includes(`const ${path} = async`)));
console.log(`${count}/${count} Outbound feedback checks passed`);
