import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assertHistoricalSourceCompatible } from './batch-229-recheck-source-allowlist.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const j=p=>JSON.parse(read(p));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const manifest=j('original-suite-approved.json');
const base=j('batch-230-baseline.json');
const before=j('batch-230-before-9900-body-sha256.json');
const pins=j('batch-230-recheck-source-sha256.json');
const reviewed=j('batch-230-recheck-body-sha256.json');
const ledger=j('batch-230-recheck-ledger.json');
const groupName='BULK_SAFE_11_RECHECK';
const group=manifest.approved_groups[groupName];
const selected=group.entries.flatMap(e=>e.ids);
const intended=['TALERT-049','TPROD-064','TSH-029','TSTR-034','TSTR-037','TSTR-041','TSTR-043','TSUP-026','TSUP-043'];
assert.deepEqual(selected,intended);
assert(group.secret===true && group.entries.length===5);
assert.deepEqual(Object.keys(manifest.approved_groups),[...base.preexisting_group_names,'BULK_SAFE_11',groupName]);
assert.deepEqual(manifest.approved_groups.BULK_SAFE_11.entries,base.approved_entries);
assert.deepEqual(manifest.batch_230_execution.passed_ids,ledger.new_green_ids);
assert.deepEqual(manifest.batch_230_execution.failed_ids,ledger.failed_ids);
assert.equal(manifest.batch_230_execution.passed,65);
assert.equal(manifest.batch_230_execution.failed,65);
assert.deepEqual(manifest.batch_230_recheck.selected_ids,intended);
assert.equal(ledger.previous_green_ids.length,1381);
assert.equal(ledger.new_green_ids.length,65);
assert.equal(ledger.confirmed_green_ids.length,1446);
assert.equal(new Set(ledger.confirmed_green_ids).size,1446);
assert.equal(ledger.preexisting_held_deferred_ids.length,121);
assert.equal(ledger.new_deferred_ids.length,56);
assert.equal(new Set([...ledger.preexisting_held_deferred_ids,...ledger.new_deferred_ids]).size,177);
assert.equal(manifest.batch_230_recheck.environment_blocked_ids.length,48);
assert.deepEqual(new Set([...ledger.new_green_ids,...ledger.failed_ids]),new Set(base.selected_ids));
assert.deepEqual(new Set([...intended,...ledger.new_deferred_ids]),new Set(ledger.failed_ids));
assert.equal(new Set([...ledger.confirmed_green_ids,...ledger.preexisting_held_deferred_ids,...ledger.new_deferred_ids,...intended]).size,1446+177+9);
assert.deepEqual(Object.keys(reviewed).sort(),[...intended].sort());
assert.equal(Object.keys(pins).length,5);
const testsDir=path.join(root,'tests');
let skipCount=0;const found=new Map();let files=0;
function list(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>{let f=path.join(p,e.name);return e.isDirectory()?list(f):e.name.endsWith('.spec.ts')?[f]:[];});}
for(const file of list(testsDir)){
  files++;const source=fs.readFileSync(file,'utf8');
  const rel=path.relative(testsDir,file).replaceAll('\\','/');
  assertHistoricalSourceCompatible(rel,sha(source),base.spec_sha256_152[rel],`Unexpected modified original spec ${rel}`);
  const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(tree.parseDiagnostics.length,0,`Invalid syntax ${rel}`);
  function visit(n){
    if(ts.isCallExpression(n)&&n.arguments.length>1&&ts.isStringLiteral(n.arguments[0])){
      let e=n.expression;
      let normal=ts.isIdentifier(e)&&['test','it'].includes(e.text);
      let skip=ts.isPropertyAccessExpression(e)&&e.expression.getText(tree)==='test'&&e.name.text==='skip';
      if(normal||skip){let id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
        if(id){assert(!found.has(id),'Duplicate '+id);
          let body=n.arguments[1].getText(tree);
          let digest=sha(body);
          let previous=before[id];assert(previous,'Unexpected '+id);
          if(reviewed[id]){assert.equal(reviewed[id].before_sha256,previous);assert.equal(reviewed[id].after_sha256,digest);assert.equal(reviewed[id].file,rel);}
          else assert.equal(digest,previous,`Unreviewed original test changed ${id}`);
          found.set(id,{rel,body,skip});if(skip)skipCount++;
        }
      }
    }ts.forEachChild(n,visit);
  }visit(tree);
}
assert.equal(files,152);assert.equal(found.size,9900);assert.equal(skipCount,357);
for(const id of ledger.confirmed_green_ids)assert(!reviewed[id] && found.has(id),`Confirmed pass modified/reused ${id}`);
for(const id of [...ledger.preexisting_held_deferred_ids,...ledger.new_deferred_ids])assert(!reviewed[id] && found.has(id),`Held case modified ${id}`);
for(const entry of group.entries){
  const src=read('tests/'+entry.file),pin=pins[entry.file];
  assert(pin && sha(src)===entry.sha256 && pin.after_sha256===entry.sha256);
  assert.equal(pin.before_sha256,base.spec_sha256_152[entry.file]);
  assert.deepEqual(entry.ids,pin.selected_ids);
  assert(src.includes("from '../../../support/liveOriginalSafeTest'"));
  for(const id of entry.ids){const t=found.get(id);assert(t&&!t.skip&&t.rel===entry.file&&/\bexpect(?:\.|\s*\()/.test(t.body));
   for(const f of [/\bloginAsDisposableRole\s*\(/,/\bpage\.request\.(?:post|put|patch|delete)\s*\(/,/\broute\.continue\s*\(/,/\.waitForTimeout\s*\(/,/\btest\.skip\s*\(/])
    assert(!f.test(t.body),`Unsafe action in reviewed test ${id}`);
  }
}
const bodies=new Map([...found].map(([id,v])=>[id,v.body]));
for(const [id,evidence] of Object.entries({
'TALERT-049':['Confirm action: Override and close blocking alert?','Reconciled stock ledger'],
'TPROD-064':['/^Beverages(?:\\s|$)/','View Category','category=Beverages'],
'TSH-029':['Confirm action: Remove shipment line?','await dialog.dismiss()'],
'TSTR-034':["getByRole('alert').filter({hasText:'Draft creation rejected'})",'toHaveValue'],
'TSTR-037':["getByRole('alert').filter({hasText:'Version conflict'})",'Keep me'],
'TSTR-041':['Confirm action: Execute transfer?','await dialog.dismiss()'],
'TSTR-043':["getByRole('alert').filter({hasText:'Execution rejected'})",'toHaveLength(1)'],
'TSUP-026':["row.locator('span').filter({hasText:/^2$/})",'View performance'],
'TSUP-043':["page.locator('.app-empty-state').filter({hasText:'Shipment performance unavailable for your current permissions'})",'toHaveCount(0)']
}))for(const token of evidence)assert(bodies.get(id).includes(token),`Expected source-grounded correction missing ${id}: ${token}`);
assert.equal(sha(read('support/liveOriginalSafeTest.ts')),base.auth_guard_sha256);
assert.equal(sha(read('support/environment.ts')),base.environment_guard_sha256);
const guard=read('support/liveOriginalSafeTest.ts');
for(const token of ["page.context().route('**/*'","return route.abort('blockedbyclient')","property === 'continue'","property === 'fulfill'"])assert(guard.includes(token));
const cfg=read('playwright.live-original.config.ts');
assert(cfg.includes(`'${groupName}'`)&&cfg.includes('.includes(GROUP) ? 1')&&cfg.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const wf=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(wf.includes(`          - ${groupName}`) && wf.includes('node scripts/check-batch-230-recheck-contract.mjs'));
assert(wf.includes('secrets.E2E_EMAIL')&&wf.includes('secrets.E2E_PASSWORD')&&!wf.includes('continue-on-error: true'));
const match=wf.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(match);
const choice=[...match[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(m=>m[1]);
assert.deepEqual(choice,['DISCOVER_ALL',...Object.keys(manifest.approved_groups)]);
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_230_RECHECK_9_SELECTED_IDS.csv').trim().split(/\r?\n/);
assert.deepEqual(csv.slice(1).map(r=>r.split(',')[0]),intended);
const tracker=read('APPLICATION_ISSUES_TRACKER.csv');
assert.equal(tracker.split(/\r?\n/).filter(Boolean).length,201);
for(const id of ledger.failed_ids)assert(tracker.includes('PW-'+id));
for(const id of ledger.new_deferred_ids)assert(!intended.includes(id));
console.log('PASS B230 RECHECK: 9,900 original tests / 152 specs / 357 skips; exactly nine GitHub-failed original bodies corrected.');
console.log('PASS B230 RECHECK: 1,446 confirmed GREEN, 177 held/deferred, one nine-test recheck; no overlap.');
console.log('PASS B230 RECHECK: 200 cumulative application-issue records, original history retained; 48 disposable-role tests held.');
console.log('PASS B230 RECHECK: origin, credentials, safe network write guard, one-worker and fixed test source SHA retained.');
console.log('PENDING: nine browser execution results; offline checks are not browser passes.');
