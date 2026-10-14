import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }
const root = process.argv[2] || process.cwd();
const page = fs.readFileSync(path.join(root,'src/pages/SuppliersPage.tsx'),'utf8');
const helper = fs.readFileSync(path.join(root,'src/lib/supplierDirectoryUrl.ts'),'utf8');
let tests = 0;
function check(condition, description){ assert.ok(condition,description); tests++; }
const code = ts.transpileModule(helper, { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const context = { exports:{}, URLSearchParams }; vm.createContext(context); vm.runInContext(code,context);
const {supplierDirectorySearchParams:search,supplierDirectoryShowAllParams:all}=context.exports;
for (const value of ['steel', '  Bravo  ', '', '   ', 'Österreich']) {
  const original = new URLSearchParams('supplier_id=s-22&search=old&tab=details&source=dashboard');
  const result = search(original,value);
  check(!result.has('supplier_id'), `Typing ${JSON.stringify(value)} must unlock deep link`);
  check(result.get('search') === (value.trim() || null), `New search ${JSON.stringify(value)} replaces old search`);
  check(result.get('tab') === 'details' && result.get('source') === 'dashboard', 'Unrelated query params preserved');
  check(original.get('supplier_id') === 's-22', 'Original query not mutated');
}
const clear=all(new URLSearchParams('supplier_id=s-22&search=hidden&tab=list'));
check(!clear.has('supplier_id'),'Show all clears focused supplier');
check(!clear.has('search'),'Show all clears stale search');
check(clear.get('tab')==='list','Show all preserves unrelated query parameters');
check(page.includes('onChange={(event) => changeSupplierSearch(event.target.value)}'), 'Search field uses unlock handler');
check(page.includes("onClick={() => changeSupplierSearch('')}"), 'Clear search unlocks focused supplier');
check(page.includes('supplierDirectorySearchParams(searchParams, nextValue)'), 'Search handler clears selection via tested helper');
check(page.includes('supplierDirectoryShowAllParams(searchParams)'), 'Show all calls tested reset helper');
check(page.includes('lastSyncedSearchParamsRef.current = nextParams.toString()'), 'Synchronizer aware of immediate URL change');
check(page.includes("requestedSupplierId\n                        ? ui('The linked supplier is not available in the current tenant view.')"), 'Missing focused supplier no longer labelled empty directory');
console.log(`PASS ${tests}/${tests} supplier deep-link navigation / search regression checks`);
