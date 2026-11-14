/** Original 240-body source audit. Run before and after the ephemeral CI-only fixture import swap. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const review=JSON.parse(fs.readFileSync(path.join(root,'batch-232-review.json'),'utf8'));
const prior=JSON.parse(fs.readFileSync(path.join(root,'batch-231-review.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'original-suite-approved.json'),'utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const selected=review.selected,group='BULK_SAFE_13',overlay=manifest.approved_groups[group];
assert(review.batch===232&&review.group===group&&selected.length===240&&Object.keys(review.source_files).length===8);
assert(manifest.expected_suite_ids===9900&&manifest.expected_spec_files===152,'Original suite changed unexpectedly');
assert(prior.batch===231&&prior.selected.length===180&&prior.group==='BULK_SAFE_12','Missing prior Batch 231 source-review record');
const oldRecheck=manifest.approved_groups.BULK_SAFE_11_RECHECK;
const nine=new Set(['TALERT-049','TPROD-064','TSH-029','TSTR-034','TSTR-037','TSTR-041','TSTR-043','TSUP-026','TSUP-043']);
if (!oldRecheck) assert(process.env.PW_B232_OFFLINE_BASELINE==='YES'&&!process.env.GITHUB_ACTIONS,
  'Final Batch 230 9-case recheck is absent. Never run on an older GitHub checkout.');
else {
  const ids=(oldRecheck.entries??[oldRecheck]).flatMap(e=>e.ids);
  assert(ids.length===9&&ids.every(id=>nine.has(id))&&new Set(ids).size===9,'B230 final recheck IDs drifted');
}
const attempted=new Set();
for (const [name,g] of Object.entries(manifest.approved_groups)) {
  if(name===group || name==='BULK_SAFE_12')continue;
  for(const e of (g.entries??[g]))for(const id of (e.ids??[]))attempted.add(id);
}
assert(attempted.size===1632,'Historical Batch 230 manifest attempted ID ledger drifted');
const passed231=new Set(prior.selected.map(s=>s.id));
assert(passed231.size===180&&![...passed231].some(id=>attempted.has(id)),'Batch 231 historical overlap');
const seen=new Set();let foundTotal=0;
for(const [file,info] of Object.entries(review.source_files)) {
  assert(/^tenant\/[a-z0-9-]+\/[a-z0-9-]+\.spec\.ts$/.test(file),'Disallowed selected spec path: '+file);
  const src=fs.readFileSync(path.join(root,'tests',file),'utf8');
  const guarded=src.includes("from '../../../support/liveOriginalSafeTest'");
  if(!guarded) assert(sha(src)===info.source_sha256,'Unexpected previously untested source drift: '+file);
  else assert(overlay,'Guarded import swap was installed without the reviewed runtime group');
  assert(!src.includes('loginAsDisposableRole')&&!src.includes('targetBaseURL('),'Unsafe role or environment setup: '+file);
  assert(src.includes('loginAsTenant('),'Expected real tenant login semantics missing: '+file);
  if(guarded)assert(/import\s*\{\s*test\s*,\s*expect\s*\}\s*from\s*'\.\.\/\.\.\/\.\.\/support\/liveOriginalSafeTest'/.test(src),
      'Expected import of network-guarded Playwright test fixture absent: '+file);
  else assert(/import\s*\{\s*test\s*,\s*expect\s*,\s*type Page/.test(src),'Unexpected unsafe test import structure: '+file);
  const tree=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert(tree.parseDiagnostics.length===0,'Source parse error: '+file);
  const wanted=new Map(selected.filter(x=>x.file===file).map(x=>[x.id,x]));
  assert(wanted.size===info.new_ids.length&&wanted.size>0,'Wrong source mapping count: '+file);
  const located=new Set();
  function visit(node){
    if(ts.isCallExpression(node)&&node.arguments.length>1&&ts.isStringLiteral(node.arguments[0])){
      const e=node.expression,normal=ts.isIdentifier(e)&&['test','it'].includes(e.text),skip=ts.isPropertyAccessExpression(e)&&e.expression.getText(tree)==='test'&&e.name.text==='skip';
      if(normal||skip){
        const id=node.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
        if(id && wanted.has(id)){
          assert(!skip,`Selected original was skipped: ${id}`);
          assert(!located.has(id),`Duplicate original selected ID: ${id}`);
          const body=node.arguments[1].getText(tree);
          assert(sha(body)===wanted.get(id).sha256,`Original scenario body changed: ${id}`);
          for(const bad of [/\bloginAsDisposableRole\s*\(/,/\broleLogin\s*\(/,/\bPW_[A-Z]+\b/,/\broute\.continue\s*\(/,/\b(?:page|request)\.request\.(?:post|put|patch|delete)\s*\(/,/\.waitForTimeout\s*\(/,/\btest\.skip\s*\(/])
            assert(!bad.test(body),`Risky operation in ${id}: ${bad}`);
          assert(/\bexpect\s*\(/.test(body),'Selected scenario has no assertion: '+id);
          assert(!attempted.has(id)&&!passed231.has(id),`Repeated passed, attempted or held ID: ${id}`);
          located.add(id);seen.add(id);foundTotal++;
        }
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(tree);
  assert(located.size===wanted.size,'Missing reviewed original IDs in '+file);
}
assert(seen.size===240,'Selected ID total differs from 240');
const csv=fs.readFileSync(path.join(root,'INVENTORY_PLAYWRIGHT_BATCH_232_SELECTED_240_IDS.csv'),'utf8').trim().split(/\r?\n/);
assert(csv.length===241,'240-ID selection CSV incomplete');
assert(csv.slice(1).every(line=>seen.has(line.split(',')[0])),'Unreviewed IDs present in selection CSV');
const safe=fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
const auth=fs.readFileSync(path.join(root,'support/environment.ts'),'utf8');
const config=fs.readFileSync(path.join(root,'playwright.live-original.config.ts'),'utf8');
for(const text of ["page.context().route('**/*'", "property === 'fulfill'", "property === 'continue'", "return route.abort('blockedbyclient')"])
  assert(safe.includes(text),'Safety network boundary has been weakened: '+text);
assert(safe.includes("process.env.PW_BASE_URL !== FRONTEND_ORIGIN")&&auth.includes('approvedLiveOrigin'),'Origin and auth isolation changed');
assert(config.includes('target.origin !== approvedOrigin')&&config.includes("trace: 'off', screenshot: 'off', video: 'off'"),'Origin or no-artifact config missing');
if(overlay) {
  assert(overlay.secret===true&&overlay.entries.length===8,'Runtime group not permission-gated or wrong number of specs');
  const runtimeIds=overlay.entries.flatMap(e=>e.ids);
  assert(runtimeIds.length===240&&new Set(runtimeIds).size===240&&runtimeIds.every(id=>seen.has(id)), 'Runtime selected IDs drifted');
  for(const e of overlay.entries)assert(sha(fs.readFileSync(path.join(root,'tests',e.file)))===e.sha256,'Live runtime spec hash does not match: '+e.file);
}
console.log(`PASS B232 ${overlay?'post-injection':'pre-injection'}: ${foundTotal} original pinned bodies in 8 source files; no B230/B231 overlap.`);
console.log('PASS B232: isolated tenant login, local mocking, write-abort network guard, protected production origin, no browser artifacts.');
console.log('Status: original UI browser assertions are NOT verified offline. GitHub must execute all 240.');
