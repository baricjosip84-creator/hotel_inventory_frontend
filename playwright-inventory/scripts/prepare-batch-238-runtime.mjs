import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sort=x=>[...x].sort();
const ledger=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const p=read('batch-238-review.json'),previous=read('batch-237-review.json'),r4=read('batch-237-r4-review.json'),manifest=read('original-suite-approved.json');
const confirmed=ledger('INVENTORY_PLAYWRIGHT_BATCH_237_FINAL_CONFIRMED_2652_PASS_IDS.csv'),remaining=ledger('INVENTORY_PLAYWRIGHT_BATCH_238_REMAINING_286_IDS.csv');
assert.equal(confirmed.length,2652);assert.equal(remaining.length,286);assert.equal(new Set([...confirmed,...remaining]).size,2938);
assert.equal(p.group,'BULK_SAFE_17');assert.equal(p.count,20);assert.equal(new Set(p.selected).size,p.count);
assert.deepEqual(sort(r4.selected),sort(p.r4_user_confirmed_pass));assert(r4.selected.every(id=>confirmed.includes(id)));
assert.deepEqual(sort(p.selected),sort(ledger('INVENTORY_PLAYWRIGHT_BATCH_238_SELECTED_20_IDS.csv')));
assert(p.selected.every(id=>remaining.includes(id)&&!confirmed.includes(id)));
const old=manifest.approved_groups.BULK_SAFE_17.entries;assert.deepEqual(sort(old.flatMap(e=>e.ids)),sort(previous.selected));
function cases(s,f){
 const tree=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(tree.parseDiagnostics.length,0,f+' syntax');const result=[];
 function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])){const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id)result.push({id,start:n.getStart(tree),end:n.end,body:n.getText(tree)});}ts.forEachChild(n,walk);}walk(tree);return result;
}
function exact(s,from,to,context){assert(from&&from!==to,context);const at=s.indexOf(from);assert(at>=0&&s.indexOf(from,at+from.length)<0,'Missing or ambiguous anchor: '+context);return s.slice(0,at)+to+s.slice(at+from.length);}
const entries=[];
for(const [file,patch] of Object.entries(p.patches)){
 assert(file.startsWith('tenant/')&&!file.includes('..')&&p.pages[file.split('/')[1]]);
 const f='tests/'+file;let text=fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n');
 assert.equal(sha(text),patch.sha256,'Validated runtime fingerprint: '+file);
 const before=cases(text,file),ids=Object.keys(patch.cases);
 for(const id of ids){
  assert(p.selected.includes(id));const original=cases(text,file).find(x=>x.id===id);assert(original,id);let body=original.body;
  for(const [from,to] of patch.cases[id])body=exact(body,from,to,id);
  assert((body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length>=(original.body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,'assertion removal '+id);
  assert(!/(?:test\.skip\(|\.skip\(|test\.only\(|loginAsDisposableRole\(|\brole\s*:|\b(?:route|r)\.(?:continue|fetch)\()/i.test(body),'unsafe selected body '+id);
  text=text.slice(0,original.start)+body+text.slice(original.end);
 }
 for(const [from,to] of patch.helpers??[])text=exact(text,from,to,file+' fixture');
 const after=cases(text,file);assert.deepEqual(before.map(x=>x.id),after.map(x=>x.id));
 for(const item of before)if(!ids.includes(item.id))assert.equal(after.find(x=>x.id===item.id).body,item.body,'Unselected body changed '+item.id);
 assert(text.includes('support/liveOriginalSafeTest'));
 // Login has historical unselected blocks with route.continue. Its only
 // selected route handlers are local synthetic fulfillments; other files
 // must have no route.continue/fetch anywhere, including helper code.
 if(file!=='tenant/login/login.spec.ts')assert(!/\b(?:route|r)\.(?:continue|fetch)\(/.test(text),'Unsafe routing '+file);
 fs.writeFileSync(f,text);entries.push({file,ids,sha256:sha(text)});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(p.selected));
manifest.approved_groups.BULK_SAFE_17={secret:true,entries};fs.writeFileSync('original-suite-approved.json',JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B238: '+p.count+' exact outstanding originals; '+entries.length+' files; no prior PASS overlap or unselected body edits.');
