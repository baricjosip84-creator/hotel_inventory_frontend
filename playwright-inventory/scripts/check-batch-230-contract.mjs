import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.dirname(root);
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const json = name => JSON.parse(read(name));
const sha = input => crypto.createHash('sha256').update(input).digest('hex');
const expected = json('batch-230-baseline.json');
const manifest = json('original-suite-approved.json');
const groupName = 'BULK_SAFE_11';
const group = manifest.approved_groups[groupName];
assert.equal(group.secret, true, 'Group must run behind confirmed workflow input');
assert.equal(expected.original_ids, 9900);
assert.equal(expected.original_spec_files, 152);
assert.equal(expected.source_skip_count, 357);
assert.deepEqual(Object.keys(manifest.approved_groups), [...expected.preexisting_group_names, groupName], 'Previous approved groups were removed or reordered');
assert.deepEqual(group.entries, expected.approved_entries, 'Batch 230 source/ID allowlist changed');
assert.equal(group.entries.length, 18);
const selected = group.entries.flatMap(e => e.ids);
assert.equal(selected.length, 130);
assert.equal(new Set(selected).size, selected.length);
assert.deepEqual(selected, expected.selected_ids);
const passed = new Set(expected.confirmed_green_ids);
const held = new Set(expected.held_or_deferred_ids);
assert.equal(passed.size, 1381);
assert.equal(held.size, 121);
assert.equal(new Set([...passed, ...held, ...selected]).size, 1381+121+130, 'Selection overlaps confirmed passes or unresolved cases');
const approvedBefore = new Set(expected.preexisting_group_names.flatMap(g => {
  const t = manifest.approved_groups[g];
  return (t.entries ?? [t]).flatMap(e => e.ids);
}));
assert(selected.every(id => !approvedBefore.has(id)), 'A previously attempted test was selected again');
const originals = json('batch-230-before-9900-body-sha256.json');
assert.equal(Object.keys(originals).length, 9900);
const testsDir=path.join(root, 'tests');
const list = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(x =>
  x.isDirectory() ? list(path.join(dir,x.name)) : x.name.endsWith('.spec.ts') ? [path.join(dir,x.name)] : []);
const allFiles = list(testsDir);
assert.equal(allFiles.length, 152);
let skips=0;
const found = new Map();
for (const f of allFiles) {
  const rel=path.relative(testsDir,f).replaceAll('\\','/');
  const content=fs.readFileSync(f);
  assert.equal(sha(content), expected.spec_sha256_152[rel], 'Original source modified: '+rel);
  const tree=ts.createSourceFile(f,content.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(tree.parseDiagnostics.length,0, 'TS syntax parse failed: '+rel);
  const visit=node=>{
    if (ts.isCallExpression(node) && node.arguments.length>1 && ts.isStringLiteral(node.arguments[0])) {
      const c=node.expression;
      const normal=ts.isIdentifier(c) && ['test','it'].includes(c.text);
      const skip=ts.isPropertyAccessExpression(c) && c.expression.getText(tree)==='test' && c.name.text==='skip';
      if (normal || skip) {
        const id=node.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
        if(id){
          assert(!found.has(id),'Duplicate '+id);
          const body=node.arguments[1].getText(tree);
          assert.equal(sha(body), originals[id], `Original body changed: ${id}`);
          found.set(id,{file:rel,body,skip});
          if(skip)skips++;
        }
      }
    }
    ts.forEachChild(node,visit);
  };
  visit(tree);
}
assert.equal(found.size,9900);
assert.equal(skips,357);
for (const entry of group.entries) {
  const source=read('tests/'+entry.file);
  assert.equal(sha(source),entry.sha256);
  assert(source.includes("from '../../../support/liveOriginalSafeTest'"),'Missing guarded Playwright fixture: '+entry.file);
  assert(entry.file.startsWith('tenant/'),'Unexpected platform/admin live selection');
  for(const id of entry.ids){
    const f=found.get(id); assert(f && !f.skip && f.file===entry.file, 'Missing/misplaced/skipped '+id);
    assert(/\bexpect(?:\.|\s*\()/.test(f.body),'Selected scenario has no assertion: '+id);
    for(const unsafe of [/\bloginAsDisposableRole\s*\(/,/\bpage\.request\.(?:post|patch|put|delete)\s*\(/,/\broute\.continue\s*\(/,/\.waitForTimeout\s*\(/,/\btest\.skip\s*\(/])
      assert(!unsafe.test(f.body),'Source-review exclusion matched '+id+' '+unsafe);
  }
}
assert.equal(sha(read('support/liveOriginalSafeTest.ts')),expected.auth_guard_sha256);
assert.equal(sha(read('support/environment.ts')),expected.environment_guard_sha256);
const guard=read('support/liveOriginalSafeTest.ts');
for(const marker of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"])
  assert(guard.includes(marker),'Write guard unexpectedly absent: '+marker);
const cfg=read('playwright.live-original.config.ts');
assert(cfg.includes("'BULK_SAFE_11'") && cfg.includes('.includes(GROUP) ? 1'),'Single worker not locked');
assert(cfg.includes('target.origin !== approvedOrigin') && cfg.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
const options=workflow.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(options);
const names=[...options[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(m=>m[1]);
assert.deepEqual(names,['DISCOVER_ALL',...Object.keys(manifest.approved_groups)]);
assert(workflow.includes('node scripts/check-batch-230-contract.mjs'));
assert(workflow.includes("inputs.confirmation == 'ORIGINALTESTS'") && workflow.includes('secrets.E2E_EMAIL') && workflow.includes('secrets.E2E_PASSWORD'));
assert(!workflow.includes('continue-on-error: true'));
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_230_SELECTED_130_IDS.csv').trim().split(/\r?\n/);
assert.equal(csv.length,131);
assert.deepEqual(csv.slice(1).map(r=>r.split(',')[0]),selected);
const tracker=read('APPLICATION_ISSUES_TRACKER.csv');
assert.equal((tracker.match(/\bPW-[A-Z0-9]+-\d{3},/g) || []).length,121,'Held ID issue ledger no longer complete');
assert(tracker.includes('PW-TPROD-076') && tracker.includes('CLOSED-FT147') && tracker.includes('CLOSED-FT143'));
const audit=read('APPLICATION_AUDIT_44_PAGE_LEDGER.csv');
assert(audit.includes('Dashboard') && audit.split(/\r?\n/).filter(Boolean).length===45);
const fixes=read('APPLICATION_HISTORICAL_FIX_001_092.csv');
assert(fixes.includes('FIX001') && fixes.includes('FIX092') && fixes.split(/\r?\n/).filter(Boolean).length===93);
console.log('PASS B230: 9,900 original test bodies unchanged, 152 source specs and 357 original skips.');
console.log('PASS B230: 1,381 GREEN + 121 held/deferred excluded; exactly 130 NEW original IDs in 18 tenant specs.');
console.log('PASS B230: production network write guard, auth, single-worker and workflow confirmation maintained.');
console.log('PASS B230: cumulative app issue tracker, 44 historic audit pages and FIX001-092 registry retained.');
console.log('NOT VERIFIED: B230 browser behavior; only GitHub run may confirm additional passing IDs.');
