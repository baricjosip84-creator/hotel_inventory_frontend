import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const p=read('batch-246-review.json'),m=read('original-suite-approved.json'),source=read('batch-245-source-review.json');
const sort=a=>[...a].sort(),ids=f=>fs.readFileSync('INVENTORY_PLAYWRIGHT_BATCH_246_'+f+'_IDS.csv','utf8').trim().split(/\r?\n/).slice(1).map(l=>l.split(',')[0]);
const c=ids('CONFIRMED_2692_PASS'),r=ids('REMAINING_246'),s=ids('SELECTED_12'),b=ids('BLOCKED_234');
assert.equal(c.length,2692);assert.equal(r.length,246);assert.equal(s.length,12);assert.equal(b.length,234);assert.equal(new Set([...c,...r]).size,2938);assert.deepEqual(sort([...s,...b]),sort(r));assert.deepEqual(sort(s),sort(p.selected));assert(c.includes('TIR-020'));
assert.deepEqual(sort(source.approved),sort(p.previous_selected));assert.equal(source.sourceUnverified.length,0);
assert.deepEqual(sort(m.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids)),sort(p.previous_selected),'Previous B245 source preparation must precede B246');
const recovery='support/b237TargetRecovery.mjs';
let target=fs.readFileSync(recovery,'utf8');
const anchor='export async function ensureB237Target(';
assert.equal(target.split(anchor).length,2);
assert(!target.includes("'/intelligence-review'")&&!target.includes('"/intelligence-review"'),'Unexpected existing route entry; review required');
assert(!target.includes("'/products'")&&!target.includes('"/products"'),'Unexpected existing route entry; review required');
target=target.replace(anchor,"Object.assign(TARGETS,{'/intelligence-review':['heading','Intelligence Review'],'/products':['heading','Product workspace']});\n"+anchor);
fs.writeFileSync(recovery,target);
function cases(str,f){
 const tree=ts.createSourceFile(f,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),result=new Map();assert.equal(tree.parseDiagnostics.length,0);
 function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id){assert(!result.has(id));result.set(id,n.getText(tree));}}ts.forEachChild(n,walk);}walk(tree);return result;
}
const clicks={
 'TICAP-035':["await page.getByRole('row').filter({ hasText: 'Fixture Receiver' }).getByRole('button', { name: 'Disable' }).click();"],
 'TICAP-143':["await page.getByRole('row').filter({ hasText: 'Fixture Receiver' }).getByRole('button', { name: 'Disable' }).click();"],
 'TICAP-051':["await row(page, 'Fixture ERP').getByRole('button', { name: 'Disable' }).click();","await row(page, 'Fixture WMS').getByRole('button', { name: 'Enable' }).click();"]
};
const entries=[];
for(const [file,e] of Object.entries(p.spec_files)){
 const disk='tests/'+file;let str=fs.readFileSync(disk,'utf8');const before=cases(str,file),changes=new Map();
 for(const id of e.selected){
  let body=before.get(id);assert(body&&source.approved.includes(id));
  if(clicks[id]){
   for(const click of clicks[id]){
    assert.equal(body.split(click).length,2,'Exact click changed '+id);
    const label=click.includes("'Enable'")?'Enable':'Disable';
    // This accepts only the reviewed generic confirmation for the intended synthetic fixture action.
    const handler=`const b246Dialog = (d: import('@playwright/test').Dialog) => d.type()==='confirm' && d.message()==='Confirm action: ${label}?' ? d.accept() : d.dismiss();`;
    body=body.replace(click,`{ ${handler} page.on('dialog',b246Dialog); try { ${click} } finally { page.off('dialog',b246Dialog); } }`);
   }
   if(id==='TICAP-143'){
    const q="const patch = calls.find(c => c.method === 'PATCH' && c.path.endsWith(`/${hookId}`));";
    assert.equal(body.split(q).length,2);
    body=body.replace(q,"await expect.poll(()=>calls.some(c=>c.method==='PATCH' && c.path.endsWith(`/${hookId}`))).toBe(true);\n    "+q);
   }
   assert.equal(str.split(before.get(id)).length,2);str=str.replace(before.get(id),body);changes.set(id,body);
  }
 }
 const after=cases(str,file);assert.deepEqual([...after.keys()],[...before.keys()]);
 for(const [id,body] of before)assert.equal(after.get(id),changes.get(id)??body,'Unapproved test body changed '+id);
 fs.writeFileSync(disk,str);entries.push({file,ids:e.selected,sha256:sha(str)});
}
assert.deepEqual(sort(entries.flatMap(e=>e.ids)),sort(s));m.approved_groups.BULK_SAFE_17={secret:true,entries};
fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');
fs.writeFileSync('batch-246-source-review.json',JSON.stringify({approved:s,sourceUnverified:[]},null,2)+'\n');
console.log('B246 source verified: 12 originals; 2 exact protected route registrations, 3 fixture confirmation corrections, 1 async request wait; no other test bodies changed.');
