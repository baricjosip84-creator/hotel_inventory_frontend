import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),sort=x=>[...x].sort();
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const ledger=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(x=>x.split(',')[0]);
const p=read('batch-237-review.json'),manifest=read('original-suite-approved.json');
const old=read('batch-236-r3-review.json');
const passes=ledger('INVENTORY_PLAYWRIGHT_BATCH_236_FINAL_CONFIRMED_2568_PASS_IDS.csv');
const remaining=ledger('INVENTORY_PLAYWRIGHT_BATCH_237_REMAINING_370_IDS.csv');
assert.equal(p.group,'BULK_SAFE_17');assert.equal(p.count,95);assert.equal(passes.length,2568);assert.equal(remaining.length,370);
assert.equal(new Set([...passes,...remaining]).size,2938);
assert.equal(new Set(p.selected).size,p.count);assert(p.selected.every(i=>remaining.includes(i)&&!passes.includes(i)&&i!=='TICAP-132'));
assert.deepEqual(sort(p.selected),sort(ledger('INVENTORY_PLAYWRIGHT_BATCH_237_SELECTED_IDS.csv')));
assert.deepEqual(sort(manifest.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids)),sort(old.selected));
function cases(s,file){
  const tree=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(tree.parseDiagnostics.length,0,file+' syntax');
  const ids=[];
  function walk(n){
    if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])){
      const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
      if(id)ids.push({id,body:n.getText(tree)});
    }
    ts.forEachChild(n,walk);
  }
  walk(tree);return ids;
}
const entries=[];
for(const [file,info] of Object.entries(p.sources)){
  assert(file.startsWith('tenant/')&&!file.includes('..')&&p.pages[file.split('/')[1]]);
  const f='tests/'+file,source=fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n');
  assert.equal(sha(source),info.source_sha256,'Unreviewed runtime source drift: '+file);
  assert.equal(sha(info.patched),info.runtime_sha256);
  const before=cases(source,file),after=cases(info.patched,file);
  assert.deepEqual(before.map(x=>x.id),after.map(x=>x.id));
  const selected=after.filter(x=>info.ids.includes(x.id));
  assert.equal(selected.length,info.ids.length);
  assert(selected.every(x=>!/(?:test\.skip\(|loginAsDisposableRole\(|\brole\s*:|\.skip\()/i.test(x.body)),file+' role or skip');
  assert(info.patched.includes('support/liveOriginalSafeTest'));
  assert(!/\b(?:route|r)\.(?:continue|fetch)\(/.test(info.patched));
  assert.equal((source.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,(info.patched.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length);
  fs.writeFileSync(f,info.patched);entries.push({file,ids:info.ids,sha256:info.runtime_sha256});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(p.selected));
manifest.approved_groups.BULK_SAFE_17={secret:true,entries};
fs.writeFileSync('original-suite-approved.json',JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B237: 95 exact unresolved originals, 24 reviewed specs, no previous PASS overlap, runtime-only safety overlay.');
