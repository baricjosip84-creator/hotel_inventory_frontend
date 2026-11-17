import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const sort=x=>[...x].sort();
const ledger=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const p=read('batch-238-r2-review.json'),old=read('batch-238-review.json'),manifest=read('original-suite-approved.json');
const oldConfirmed=ledger('INVENTORY_PLAYWRIGHT_BATCH_237_FINAL_CONFIRMED_2652_PASS_IDS.csv');
const oldRemaining=ledger('INVENTORY_PLAYWRIGHT_BATCH_238_REMAINING_286_IDS.csv');
const confirmed=ledger('INVENTORY_PLAYWRIGHT_BATCH_238_CONFIRMED_2670_PASS_IDS.csv');
const remaining=ledger('INVENTORY_PLAYWRIGHT_BATCH_238_R2_REMAINING_268_IDS.csv');
const selection=ledger('INVENTORY_PLAYWRIGHT_BATCH_238_R2_SELECTED_2_IDS.csv');
assert.equal(p.group,'BULK_SAFE_17');assert.equal(p.count,2);assert.equal(p.prior_confirmed,2670);assert.equal(p.prior_remaining,268);
assert.deepEqual(sort(p.selected),sort(selection));assert.deepEqual(sort(old.selected),sort([...p.selected,...p.new_pass_from_batch_238]));
assert.equal(oldConfirmed.length,2652);assert.equal(oldRemaining.length,286);
assert.equal(confirmed.length,2670);assert.equal(remaining.length,268);
assert.equal(new Set(confirmed).size,2670);assert.equal(new Set(remaining).size,268);
assert.equal(new Set([...confirmed,...remaining]).size,2938);
assert.deepEqual(sort(confirmed.filter(id=>!oldConfirmed.includes(id))),sort(p.new_pass_from_batch_238));
assert.deepEqual(sort(oldRemaining.filter(id=>!remaining.includes(id))),sort(p.new_pass_from_batch_238));
assert(p.selected.every(id=>remaining.includes(id)&&!confirmed.includes(id)));
assert.deepEqual(sort(manifest.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids)),sort(old.selected), 'Batch 238 preparation must run before R2 patch');
function cases(s,f){
 const tree=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(tree.parseDiagnostics.length,0,f+' parse');const result=[];
 function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])){const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id)result.push({id,start:n.getStart(tree),end:n.end,body:n.getText(tree)});}ts.forEachChild(n,walk);}walk(tree);return result;
}
function exact(s,from,to,id){assert(from&&from!==to);const at=s.indexOf(from);assert(at>=0&&s.indexOf(from,at+from.length)<0,'R2 exact anchor missing/ambiguous '+id);return s.slice(0,at)+to+s.slice(at+from.length);}
const entries=[];
for(const [file,patch] of Object.entries(p.patches)){
 assert(file.startsWith('tenant/')&&!file.includes('..')&&p.pages[file.split('/')[1]]);
 const f='tests/'+file;let s=fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n');const before=cases(s,f),ids=Object.keys(patch.cases);
 assert.deepEqual(sort(ids),sort(p.selected));
 for(const id of ids){const original=cases(s,f).find(x=>x.id===id);assert(original,'Original ID missing '+id);let body=original.body;
  for(const [from,to] of patch.cases[id])body=exact(body,from,to,id);
  assert((body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length>=(original.body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,'Original assertion removed: '+id);
  assert(!/(?:test\.skip\(|\.skip\(|test\.only\(|loginAsDisposableRole\(|\brole\s*:|\b(?:route|r)\.(?:continue|fetch)\()/i.test(body),'Unsafe selected test '+id);
  s=s.slice(0,original.start)+body+s.slice(original.end);
 }
 const after=cases(s,f);assert.deepEqual(before.map(x=>x.id),after.map(x=>x.id));
 for(const oldCase of before)if(!ids.includes(oldCase.id))assert.equal(after.find(x=>x.id===oldCase.id).body,oldCase.body,'Unselected original modified: '+oldCase.id);
 assert(s.includes('support/liveOriginalSafeTest'),'Expected protected fixture missing');
 const syntax=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(syntax.parseDiagnostics.length,0,'R2 changed spec syntax');
 fs.writeFileSync(f,s);entries.push({file,ids,sha256:sha(s)});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(p.selected));
manifest.approved_groups.BULK_SAFE_17={secret:true,entries};fs.writeFileSync('original-suite-approved.json',JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B238 R2: two failed original IDs only; 18 newly confirmed PASS excluded; unselected original test bodies preserved.');
