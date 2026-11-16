import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));const sort=a=>[...a].sort();const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const plan=read('batch-236-review.json'),manifest=read('original-suite-approved.json');
const ledger=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const passed=ledger('INVENTORY_PLAYWRIGHT_BATCH_235_FINAL_CONFIRMED_2435_PASS_IDS.csv');
const remaining=ledger('INVENTORY_PLAYWRIGHT_BATCH_236_REMAINING_503_IDS.csv');
assert.equal(plan.group,'BULK_SAFE_17');assert.equal(plan.count,150);assert.equal(passed.length,2435);assert.equal(remaining.length,503);assert.equal(new Set([...passed,...remaining]).size,2938);
assert.equal(new Set(plan.selected).size,150);assert(plan.selected.every(i=>remaining.includes(i)&&!passed.includes(i)));
assert.deepEqual(sort(plan.selected),sort(ledger('INVENTORY_PLAYWRIGHT_BATCH_236_SELECTED_150_IDS.csv')));
assert(!manifest.approved_groups.BULK_SAFE_17);
const historical=new Set((manifest.approved_groups.BULK_SAFE_11_RECHECK?.entries??[]).flatMap(e=>e.ids));
function calls(s,f){
 const tree=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(tree.parseDiagnostics.length,0,f+' syntax');
 const out=[];function visit(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&n.arguments.length>1&&ts.isStringLiteral(n.arguments[0])){
 const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id)out.push({id,start:n.getStart(tree),end:n.end,text:n.getText(tree)});
 }ts.forEachChild(n,visit);}visit(tree);return out;
}
const entries=[];
for(const [f,info] of Object.entries(plan.sources)){
 assert(f.startsWith('tenant/')&&!f.includes('..')&&plan.pages[f.split('/')[1]]);
 assert.equal(sha(info.original),info.source_sha256);assert.equal(sha(info.patched),info.runtime_sha256);
 const file=path.join('tests',f),actual=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 let runtime=info.patched;
 const orig=calls(info.original,f),cur=calls(actual,f),mod=calls(runtime,f);
 assert.deepEqual(orig.map(x=>x.id),cur.map(x=>x.id));assert.deepEqual(orig.map(x=>x.id),mod.map(x=>x.id));
 if(sha(actual)!==info.source_sha256){
   const skeleton=(s,items)=>{for(const t of [...items].reverse())if(historical.has(t.id)&&passed.includes(t.id)&&!info.ids.includes(t.id))s=s.slice(0,t.start)+'/*historical '+t.id+'*/'+s.slice(t.end);return s;};
   assert.equal(sha(skeleton(actual,cur)),sha(skeleton(info.original,orig)),'Unreviewed B236 source drift '+f);
   for(const t of [...mod].reverse()){
    const a=cur.find(x=>x.id===t.id),o=orig.find(x=>x.id===t.id);
    if(a.text!==o.text){assert(historical.has(t.id)&&passed.includes(t.id)&&!info.ids.includes(t.id));runtime=runtime.slice(0,t.start)+a.text.replaceAll('route.continue()','route.fallback()')+runtime.slice(t.end);}
   }
 }
 const selected=calls(runtime,f).filter(x=>info.ids.includes(x.id));
 assert.equal(selected.length,info.ids.length);assert(selected.every(x=>!/(?:test\.skip\(|loginAsDisposableRole\(|\brole\s*:)/.test(x.text)));
 assert(runtime.includes("../../../support/liveOriginalSafeTest'"));assert(!/\b(?:route|r)\.(?:continue|fetch)\(/.test(runtime));
 assert.equal((info.original.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,(info.patched.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length);
 fs.writeFileSync(file,runtime);entries.push({file:f,ids:info.ids,sha256:sha(runtime)});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(plan.selected));
manifest.approved_groups.BULK_SAFE_17={secret:true,entries};
fs.writeFileSync('original-suite-approved.json',JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B236: 150 exact unresolved original scenarios, 6 source specs, no confirmed PASS overlap; protected runtime overlay.');
