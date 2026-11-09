import {assertHistoricalSourceCompatible} from './batch-229-recheck-source-allowlist.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'original-suite-approved.json'),'utf8'));
const group = manifest.approved_groups.BULK_SAFE_04;
const previous = new Set();
for(const [name, definition] of Object.entries(manifest.approved_groups)) {
 if (['BULK_SAFE_04','BULK_SAFE_04_RECHECK','BULK_SAFE_04_RECHECK_2'].includes(name)) continue;
 for(const entry of definition.entries ?? [definition]) for(const id of entry.ids) previous.add(id);
}
assert.equal(group.secret,true);
assert.deepEqual(group.entries.map(x=>x.file),[
 'tenant/alerts/alerts.spec.ts','tenant/system-context/system-context.spec.ts','tenant/operations-feed/operations-feed.spec.ts'
]);
assert.deepEqual(group.entries.map(x=>x.ids.length),[40,50,30]);
const all=[];
for(const entry of group.entries){
 const source=fs.readFileSync(path.join(root,'tests',entry.file),'utf8');
 assertHistoricalSourceCompatible(entry.file,crypto.createHash('sha256').update(source).digest('hex'),entry.sha256,`Source changed: ${entry.file}`);
 assert(source.includes("support/liveOriginalSafeTest'"),`Missing production guard: ${entry.file}`);
 for(const id of entry.ids){
  assert(!previous.has(id),`Previously approved scenario repeated: ${id}`);
  const re=new RegExp(`\\btest\\s*\\(\\s*['"]${id}\\s`,'g');
  assert.equal([...source.matchAll(re)].length,1,`Missing/duplicate test: ${id}`);
  all.push(id);
 }
}
assert.equal(all.length,120);
assert.equal(new Set(all).size,120);
const alert=fs.readFileSync(path.join(root,'tests/tenant/alerts/alerts.spec.ts'),'utf8');
assert(alert.includes("['xhr', 'fetch'].includes(route.request().resourceType())"));
assert(alert.includes("isAlertApiGet(route) ? fulfillJson(route, [low]) : route.fallback()"));
assert(alert.includes("isAlertApiGet(route) ? fulfillJson(route, [resolved]) : route.fallback()"));
const context=fs.readFileSync(path.join(root,'tests/tenant/system-context/system-context.spec.ts'),'utf8');
assert(context.includes('if (route.request().isNavigationRequest()) return route.continue()'));
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_04'));
assert(workflow.includes('node scripts/check-batch-212-contract.mjs'));
const config=fs.readFileSync(path.join(root,'playwright.live-original.config.ts'),'utf8');
assert(config.includes("'BULK_SAFE_04'") && config.includes(".includes(GROUP) ? 1"));
const safety=fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
assert(safety.includes("return route.abort('blockedbyclient')") && safety.includes("{ scope: 'worker' }"));
console.log('PASS Batch 212: 120 new approved source-hashed original IDs; 40 Alerts, 50 System Context, 30 Operations Feed.');
console.log('PASS: No earlier approval reused; single worker; browser document bypasses API mocks; live-write blocking retained.');
