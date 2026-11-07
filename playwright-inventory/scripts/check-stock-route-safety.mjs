import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
const source = fs.readFileSync(path.join(root, 'tests/tenant/stock/stock.spec.ts'), 'utf8');
const start = source.indexOf("const stockEndpoint='**/stock';");
const end = source.indexOf('const stockRows=', start);
assert(start >= 0 && end > start, 'Stock API-only route guard missing');
const fragment = source.slice(start, end);
const js = ts.transpileModule(fragment, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const build = new Function('page', 'handler', `${js}\nreturn mockStockApi(page,handler);`);
let matcher;
let handler;
const page = {route:async (pattern, fn) => { matcher=pattern;handler=fn; }};
let stubbed = 0;
await build(page, async route => { stubbed++;await route.fulfill({status:200,body:'[]'}); });
assert.equal(matcher,'**/stock');
assert.equal(typeof handler,'function');
const counters={fallback:0,fulfill:0};
async function check(method,type,expectedStub) {
 const calls={fallback:0,fulfill:0};
 await handler({
   request:()=>({method:()=>method,resourceType:()=>type}),
   fallback:async()=>{calls.fallback++;counters.fallback++;},
   fulfill:async()=>{calls.fulfill++;counters.fulfill++;}
 });
 assert.equal(calls.fulfill,expectedStub,`${method}/${type} route unexpectedly stubbed`);
 assert.equal(calls.fallback,1-expectedStub,`${method}/${type} fallback missing`);
}
await check('GET','document',0);
await check('GET','fetch',1);
await check('GET','xhr',1);
await check('POST','fetch',0);
await check('PATCH','xhr',0);
assert.equal(stubbed,2);
assert.equal(counters.fallback,3);
assert.equal(counters.fulfill,2);
assert(!source.includes("page.route('**/stock'"), 'Unsafe direct Stock mock remains');
console.log('PASS: Stock /stock document navigation cannot be replaced by API JSON; GET XHR/fetch only; writes fall through to production-blocking guard.');
