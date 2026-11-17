import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const load=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const ids=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const sort=a=>[...a].sort();
const p=load('batch-239-r2-review.json'),b=load('batch-239-review.json'),m=load('original-suite-approved.json');
const c=ids('INVENTORY_PLAYWRIGHT_BATCH_239_R2_CONFIRMED_2675_PASS_IDS.csv');
const r=ids('INVENTORY_PLAYWRIGHT_BATCH_239_R2_REMAINING_263_IDS.csv');
const s=ids('INVENTORY_PLAYWRIGHT_BATCH_239_R2_SELECTED_5_IDS.csv');
const access=ids('INVENTORY_PLAYWRIGHT_BATCH_239_ACCESS_UNVERIFIED_8_IDS.csv');
const role=ids('INVENTORY_PLAYWRIGHT_TENANT_ROLE_GATE_214_IDS.csv');
assert.equal(p.batch,239);assert.equal(p.stage,'R2');assert.equal(p.group,'BULK_SAFE_17');
assert.equal(c.length,2675);assert.equal(r.length,263);assert.equal(s.length,5);assert.equal(role.length,214);assert.equal(access.length,8);
assert.equal(new Set([...c,...r]).size,2938);assert.deepEqual(sort(p.selected),sort(s));
assert(s.every(x=>r.includes(x)&&!c.includes(x)&&!access.includes(x)&&!role.includes(x)));
assert.deepEqual(sort(m.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids)),sort(b.selected),
  'B239 runtime preparation missing or wrong original group');
function cases(str,f){
 const tree=ts.createSourceFile(f,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,'Typescript syntax failed '+f);
 const entries=[];
 function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])){
  const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
  if(id)entries.push({id,body:n.getText(tree),start:n.getStart(tree),end:n.end});}
  ts.forEachChild(n,walk);
 }walk(tree);return entries;
}
const updated=[];
for(const [file,entry] of Object.entries(p.spec_files)){
 const path='tests/'+file;let str=fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');
 const before=cases(str,file);const selected=entry.selected;
 assert.deepEqual(sort(selected),sort(before.filter(x=>selected.includes(x.id)).map(x=>x.id)));
 const ops=[];
 for(const id of selected){
  const t=before.find(x=>x.id===id);
  const normalized=t.body.replaceAll(`await openB237Target(page,'/${file.split('/')[1]}')`,'await loginAsTenant(page)')
   .replaceAll('route.fallback()','route.continue()').replaceAll('r.fallback()','r.continue()');
  assert.equal(sha(normalized),p.original_test_sha256[id],'Unreviewed selected source drift '+id);
  assert(!/loginAsDisposableRole\(|test\.skip\(|test\.only\(/.test(t.body),'Unapproved test mutation '+id);
  let next=t.body;
  if(id.startsWith('TMOB-')){
    const needle="scope:'tenant',permissions:['execution_tasks.read'";
    assert.equal(next.split(needle).length,2,'Unexpected mobile permissions fixture '+id);
    next=next.replace(needle,"scope:'tenant',permissions:['operational_action_center.read','execution_tasks.read'");
  }else if(id==='TPO-033'){
    const needle="await mount(page,{detail:withStatus('submitted',{created_by_user_id:'pw-user',require_separate_purchase_order_approver:true})},detailUrl);";
    assert(next.includes(needle),'Unexpected PO fixture '+id);
    next=next.replace(needle,"const seen=await mount(page,{selfApproval:true},detailUrl);");
  }else throw Error('Unreviewed ID '+id);
  assert.equal((t.body.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,
   (next.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length,'Removed required assertions '+id);
  assert(!next.includes('test.skip('),'Skipped original forbidden '+id);
  ops.push({start:t.start,end:t.end,next});
 }
 // apply only exact original test bodies; all unrelated test bodies remain byte-identical.
 for(const op of ops.sort((a,b)=>b.start-a.start))str=str.slice(0,op.start)+op.next+str.slice(op.end);
 if(file.endsWith('purchase-orders-batch28.spec.ts')){
   const needle=" const effectiveDetail=setup.selfApproval?withStatus('submitted',{created_by_user_id:actingUserId,require_separate_purchase_order_approver:true}):setup.detail;";
   assert(str.includes(needle),'Expected session-user fixture guard anchor absent');
   str=str.replace(needle," if(setup.selfApproval&&!actingUserId)throw Error('Cannot verify authenticated user identity for self-approval test');\n"+needle);
 }
 const after=cases(str,file);
 assert.deepEqual(before.map(x=>x.id),after.map(x=>x.id),'Original ID lost '+file);
 for(const id of before.map(x=>x.id))if(!selected.includes(id)){
   assert.equal(before.find(x=>x.id===id).body,after.find(x=>x.id===id).body,'Unselected test body changed '+id);
 }
 assert.equal(ts.createSourceFile(file,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0);
 fs.writeFileSync(path,str);updated.push({file,ids:selected,sha256:sha(str)});
}
assert.deepEqual(sort(updated.flatMap(x=>x.ids)),sort(p.selected));
m.approved_groups.BULK_SAFE_17={secret:true,entries:updated};
fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');
console.log('PASS B239 R2: exactly 5 previously failed originals; 3 previous PASS + 8 access-unverified excluded; security assertions and unselected originals unchanged.');
