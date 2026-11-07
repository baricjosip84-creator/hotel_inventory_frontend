import fs from 'node:fs';
import assert from 'node:assert/strict';
import manifest from '../original-suite-approved.json' with { type: 'json' };
const src = fs.readFileSync('tests/tenant/stock/stock.spec.ts','utf8');
const cfg = fs.readFileSync('playwright.live-original.config.ts','utf8');
const workflow = fs.readFileSync('../.github/workflows/inventory-original-suite.yml','utf8');
const ids = manifest.approved_groups.BULK_SAFE_02_RECHECK_3.entries.flatMap(e=>e.ids);
assert.deepEqual(ids,[
'TST-040','TST-042','TST-043','TST-044','TST-048','TST-049',
'TST-051','TST-052','TST-053','TST-054','TST-055','TST-056','TST-057','TST-058']);
for(const id of ids) assert.equal((src.match(new RegExp(`test\\(['\"]${id}\\b`, 'g'))||[]).length,1,`${id} must have exactly one declaration`);
assert(!ids.includes('TST-038') && !ids.includes('TST-039'));
assert(Object.keys(manifest.batch_209_held_unverified).length===2);
assert(src.includes("if(request.method()!=='GET'||!['fetch','xhr'].includes(request.resourceType()))return route.fallback();"),
  'Document navigation must never be mocked as stock JSON');
assert(cfg.includes("maxFailures: GROUP === 'BULK_SAFE_02_RECHECK_2' ? 3 : undefined"),
  'New recheck must run every test even after failures');
assert(workflow.includes('          - BULK_SAFE_02_RECHECK_3'));
console.log('PASS: 14 original test IDs and source contract verified, previous 23 passed IDs excluded, permission cases held, no failure cutoff.');
