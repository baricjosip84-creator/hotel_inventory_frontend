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
      if(id)ids.push({id,body:n.getText(tree),start:n.getStart(tree),end:n.end});
    }
    ts.forEachChild(n,walk);
  }
  walk(tree);return ids;
}
// The recovered reference predates nine installed B230 green repairs.
// Their manifest and prior contract checks run before this overlay. Permit
// differences *only inside* those exact, already-passing, unselected calls.
// Preserve the installed bodies and apply the same reviewed transport changes
// to them rather than restoring the stale reference.
const historicalEntries=manifest.approved_groups.BULK_SAFE_11_RECHECK?.entries??[];
const historicalIds=historicalEntries.flatMap(e=>e.ids);
assert.deepEqual(sort(p.historicalRecheckIds),sort(['TALERT-049','TPROD-064','TSH-029','TSTR-034','TSTR-037','TSTR-041','TSTR-043','TSUP-026','TSUP-043']));
assert(p.historicalRecheckIds.every(id=>passes.includes(id)&&!p.selected.includes(id)));
if(process.env.GITHUB_ACTIONS||historicalEntries.length)
  assert.deepEqual(sort(historicalIds),sort(p.historicalRecheckIds),'Installed nine historical rechecks must remain intact');
function adapt(source,area){
  let s=source.replace(/import\s*\{([^}]*\btest\b[^}]*)\}\s*from\s*'@playwright\/test';/g,
    "import {$1} from '../../../support/liveOriginalSafeTest';");
  s="import {openB237Target} from '../../../support/b237TargetSession';\n"+s;
  return s.replaceAll('await loginAsTenant(page)',"await openB237Target(page,'/"+area+"')")
    .replace(/\b(route|r)\.continue\(\)/g,'$1.fallback()');
}
function skeleton(s,items,allowed){
  for(const item of [...items].reverse())if(allowed.has(item.id))
    s=s.slice(0,item.start)+'/*protected-historical-'+item.id+'*/'+s.slice(item.end);
  return s;
}
const entries=[];
for(const [file,info] of Object.entries(p.sources)){
  assert(file.startsWith('tenant/')&&!file.includes('..')&&p.pages[file.split('/')[1]]);
  const f='tests/'+file,source=fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n');
  assert.equal(sha(info.original),info.source_sha256,'Reference fingerprint '+file);
  assert.equal(sha(info.patched),info.runtime_sha256);
  const area=file.split('/')[1];
  assert.equal(adapt(info.original,area),info.patched,'Reviewed transform differs '+file);
  const original=cases(info.original,file),before=cases(source,file);
  const historical=new Set(historicalEntries.filter(e=>e.file===file).flatMap(e=>e.ids));
  assert.deepEqual(original.map(x=>x.id),before.map(x=>x.id));
  if(sha(source)!==info.source_sha256){
    assert(historical.size>0,'Unreviewed runtime source drift: '+file);
    assert.equal(sha(skeleton(source,before,historical)),sha(skeleton(info.original,original,historical)),'Unreviewed helper or selected-body drift: '+file);
    const changed=before.filter((item,i)=>item.body!==original[i].body);
    assert(changed.length>0&&changed.every(item=>historical.has(item.id)&&passes.includes(item.id)&&!p.selected.includes(item.id)));
    console.log('B237 preserving installed green bodies: '+changed.map(x=>x.id).join(','));
  }
  const runtime=adapt(source,area),after=cases(runtime,file),reviewed=cases(info.patched,file);
  assert.deepEqual(before.map(x=>x.id),after.map(x=>x.id));
  const selected=after.filter(x=>info.ids.includes(x.id));
  assert.deepEqual(selected.map(x=>x.body),reviewed.filter(x=>info.ids.includes(x.id)).map(x=>x.body),'Selected originals changed: '+file);
  assert.equal(selected.length,info.ids.length);
  assert(selected.every(x=>!/(?:test\.skip\(|loginAsDisposableRole\(|\brole\s*:|\.skip\()/i.test(x.body)),file+' role or skip');
  assert(runtime.includes('support/liveOriginalSafeTest'));
  assert(!/\b(?:route|r)\.(?:continue|fetch)\(/.test(runtime));
  assert.equal((source.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,(runtime.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length);
  fs.writeFileSync(f,runtime);entries.push({file,ids:info.ids,sha256:sha(runtime)});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(p.selected));
manifest.approved_groups.BULK_SAFE_17={secret:true,entries};
fs.writeFileSync('original-suite-approved.json',JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B237: 95 exact unresolved originals, 24 reviewed specs, no previous PASS overlap, runtime-only safety overlay.');
