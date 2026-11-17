import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const sort=x=>[...x].sort();
const ledger=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const plan=read('batch-237-r4-review.json'),previous=read('batch-237-review.json'),manifest=read('original-suite-approved.json');
const confirmed=ledger('INVENTORY_PLAYWRIGHT_BATCH_237_R3_CONFIRMED_2634_PASS_IDS.csv');
const outstanding=ledger('INVENTORY_PLAYWRIGHT_BATCH_237_R4_REMAINING_304_IDS.csv');
const failed=ledger('INVENTORY_PLAYWRIGHT_BATCH_237_R4_29_UNRESOLVED.csv');
assert.equal(confirmed.length,2634);assert.equal(outstanding.length,304);
assert.equal(new Set([...confirmed,...outstanding]).size,2938);
assert.equal(failed.length,29);assert.equal(plan.group,'BULK_SAFE_17');
assert.equal(new Set(plan.selected).size,plan.count);
assert.deepEqual(sort(plan.selected),sort(ledger('INVENTORY_PLAYWRIGHT_BATCH_237_R4_SELECTED_IDS.csv')));
assert(plan.selected.every(id=>failed.includes(id)&&outstanding.includes(id)&&!confirmed.includes(id)));
const old=manifest.approved_groups.BULK_SAFE_17.entries;
assert.deepEqual(sort(old.flatMap(e=>e.ids)),sort(previous.selected));
function cases(s,f){
 const tree=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,f+' syntax');const result=[];
 function walk(n){
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])){
   const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
   if(id)result.push({id,start:n.getStart(tree),end:n.end,body:n.getText(tree)});
  }ts.forEachChild(n,walk);
 }walk(tree);return result;
}
function exact(s,from,to,context){
 assert(from&&from!==to,context);const at=s.indexOf(from);
 assert(at>=0&&s.indexOf(from,at+from.length)<0,'Missing or ambiguous anchor: '+context);
 return s.slice(0,at)+to+s.slice(at+from.length);
}
const entries=[];
for(const [file,patch] of Object.entries(plan.patches)){
 const prior=old.find(e=>e.file===file);assert(prior,file);
 const f='tests/'+file;let text=fs.readFileSync(f,'utf8');
 assert.equal(sha(text),prior.sha256,'B237 validated runtime fingerprint: '+file);
 const before=cases(text,file);const ids=Object.keys(patch.cases);
 assert(ids.every(id=>prior.ids.includes(id)&&plan.selected.includes(id)));
 for(const id of ids){
  const original=cases(text,file).find(x=>x.id===id);assert(original,id);
  let body=original.body;
  for(const [from,to] of patch.cases[id])body=exact(body,from,to,id);
  assert((body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length>=(original.body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,'assertion removal '+id);
  assert(!/test\.skip\(|\.skip\(|test\.only\(/.test(body),'skip or only '+id);
  text=text.slice(0,original.start)+body+text.slice(original.end);
 }
 for(const [from,to] of patch.helpers??[])text=exact(text,from,to,file+' fixture option');
 const after=cases(text,file);
 assert.deepEqual(before.map(x=>x.id),after.map(x=>x.id));
 for(const item of before)if(!ids.includes(item.id))assert.equal(after.find(x=>x.id===item.id).body,item.body,'Unselected body changed '+item.id);
 assert(!/\b(?:route|r)\.(?:continue|fetch)\(/.test(text),'Unsafe routing '+file);
 fs.writeFileSync(f,text);entries.push({file,ids,sha256:sha(text)});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(plan.selected));
manifest.approved_groups.BULK_SAFE_17={secret:true,entries};
fs.writeFileSync('original-suite-approved.json',JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B237 R4: '+plan.count+' exact previously failed originals; '+entries.length+' files; no prior PASS overlap or unselected test-body edits.');
