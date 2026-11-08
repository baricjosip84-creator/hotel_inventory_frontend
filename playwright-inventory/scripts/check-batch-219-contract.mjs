import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f=>fs.readFileSync(path.join(root,f),'utf8');
const manifest = JSON.parse(read('original-suite-approved.json'));
const b218 = JSON.parse(read('batch-218-baseline.json'));
const b219 = JSON.parse(read('batch-219-baseline.json'));
const prev = manifest.batch_218_last_execution;
const selected = b218.selected_ids;
assert.equal(selected.length,120);
assert.deepEqual(new Set([...prev.passed_ids,...prev.failed_ids]),new Set(selected));
assert.equal(prev.passed_original,57);
assert.equal(prev.failed_original,63);
assert.equal(prev.selected_original,120);
assert.equal(new Set(prev.passed_ids).size,57);
assert.equal(new Set(prev.failed_ids).size,63);
assert.equal(b219.confirmed_green_ids.length,859);
assert.equal(new Set(b219.confirmed_green_ids).size,859);
assert.equal(b219.held_unverified_ids.length,21);
assert.deepEqual(b219.confirmed_green_ids,[...b218.confirmed_green_ids,...prev.passed_ids]);
assert.deepEqual(b219.selected_ids,prev.failed_ids);
assert.equal(new Set([...b219.confirmed_green_ids,...b219.selected_ids,...b219.held_unverified_ids]).size,943);
assert.equal(Object.keys(b219.confirmed_57_pass_test_body_sha256).length,57);
const group=manifest.approved_groups.BULK_SAFE_06_RECHECK;
assert(group && group.secret===true);
assert.deepEqual(group.entries.map(e=>[e.file,e.ids.length]), [
 ['tenant/insights/insights.spec.ts',49],
 ['tenant/digital-twin/digital-twin.spec.ts',7],
 ['tenant/tenant-settings/tenant-settings.spec.ts',7]
]);
assert.deepEqual(new Set(group.entries.flatMap(e=>e.ids)),new Set(prev.failed_ids));
const sourceRe=/\btest\s*\(\s*['"]([A-Z0-9]+-\d{3})/g;
function bodies(s){
 const m=[...s.matchAll(sourceRe)];
 return new Map(m.map((match,i)=>[match[1],s.slice(match.index,m[i+1]?.index??s.length)]));
}
for (const entry of group.entries){
 const source=read('tests/'+entry.file);
 const sha=crypto.createHash('sha256').update(source).digest('hex');
 assert.equal(sha,entry.sha256,'Failed recheck source SHA: '+entry.file);
 assert.equal(manifest.approved_groups.BULK_SAFE_06.entries.find(e=>e.file===entry.file).sha256,sha);
 const ast=ts.createSourceFile(entry.file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,'TypeScript syntax error in '+entry.file);
 assert(source.includes('support/liveOriginalSafeTest'), 'Missing live write protection');
 assert(!source.includes('test.only('));
 const blocks=bodies(source);
 for(const id of entry.ids) assert(blocks.has(id),'Missing '+id);
}
for (const [id, oldHash] of Object.entries(b219.confirmed_57_pass_test_body_sha256)){
 const spec=b218.selected_ids.includes(id)?b218.selected_ids.indexOf(id):-1;
 assert(spec>=0,'Successful ID not approved earlier: '+id);
 const file = Object.values(manifest.approved_groups.BULK_SAFE_06.entries).find(e=>e.ids.includes(id)).file;
 const body=bodies(read('tests/'+file)).get(id);
 assert(body,'Missing confirmed passed ID '+id);
 assert.equal(crypto.createHash('sha256').update(body).digest('hex'),oldHash,'Previously passed test body changed: '+id);
}
const insights=read('tests/tenant/insights/insights.spec.ts');
const settings=read('tests/tenant/tenant-settings/tenant-settings.spec.ts');
const twin=read('tests/tenant/digital-twin/digital-twin.spec.ts');
assert(insights.includes('if (!json) return route.fallback();'));
assert(settings.includes('return route.fallback();') && !settings.includes('test(path)) return route.continue();'));
assert(twin.includes("getByText('Read-only operational context',{exact:true})"));
assert(twin.includes("new URL(requestUrl || 'https://invalid.example').searchParams"));
const guard=read('support/liveOriginalSafeTest.ts');
assert(guard.includes("page.context().route('**/*'"));
assert(guard.includes("property === 'continue'"));
assert(guard.includes("property === 'fulfill'"));
assert(guard.includes('unexpectedlyCompletedWrites'));
assert(guard.includes("return route.abort('blockedbyclient')"));
assert(guard.includes('approvedLogin(method, route.request().url())'));
const work=fs.readFileSync(path.resolve(root,'../.github/workflows/inventory-original-suite.yml'),'utf8');
assert(work.includes('          - BULK_SAFE_06_RECHECK'));
assert(work.includes('node scripts/check-batch-219-contract.mjs'));
assert(!work.includes('continue-on-error: true'));
const config=read('playwright.live-original.config.ts');
assert(config.includes("'BULK_SAFE_06_RECHECK'") && config.includes('.includes(GROUP) ? 1'));
assert.equal(manifest.batch_219_preflight.status,'offline_preflight_only_pending_github');
console.log('PASS B219: exact GitHub log 57 PASS/63 FAIL; 859 unique previous GREEN and 21 held never selected.');
console.log('PASS B219: SHA-pinned 63 original recheck IDs across three specs; all 57 winning test bodies unchanged.');
console.log('PASS B219: safe fallback for unhandled routes, exact UI locator, safe async URL poll; production write boundary preserved.');
console.log('PENDING: live GitHub browser execution of the 63 failures; offline checks are NOT browser passes.');
