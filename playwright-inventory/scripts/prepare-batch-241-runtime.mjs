import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));const ids=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);const sort=x=>[...x].sort();
const p=json('batch-241-review.json'),prior=json('batch-240-review.json'),m=json('original-suite-approved.json');
const c=ids('INVENTORY_PLAYWRIGHT_BATCH_241_CONFIRMED_2683_PASS_IDS.csv'),r=ids('INVENTORY_PLAYWRIGHT_BATCH_241_REMAINING_255_IDS.csv'),s=ids('INVENTORY_PLAYWRIGHT_BATCH_241_SELECTED_2_IDS.csv'),roles=ids('INVENTORY_PLAYWRIGHT_TENANT_ROLE_GATE_214_IDS.csv'),blocked=ids('INVENTORY_PLAYWRIGHT_BATCH_239_ACCESS_UNVERIFIED_8_IDS.csv');
assert.equal(p.batch,241);assert.equal(p.group,'BULK_SAFE_17');assert.equal(c.length,2683);assert.equal(r.length,255);assert.equal(s.length,2);assert.equal(roles.length,214);assert.equal(blocked.length,8);assert.equal(new Set([...c,...r]).size,2938);assert.deepEqual(sort(s),['TSN-045','TSN-046']);assert.deepEqual(sort(s),sort(p.selected));
assert(s.every(x=>r.includes(x)&&!c.includes(x)&&!roles.includes(x)&&!blocked.includes(x)));assert(prior.selected.every(x=>c.includes(x)&&!r.includes(x)));assert.deepEqual(sort(m.approved_groups.BULK_SAFE_17.entries.flatMap(e=>e.ids)),sort(prior.selected),'B240 runtime must precede B241');
function cases(str,file){const tree=ts.createSourceFile(file,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(tree.parseDiagnostics.length,0,'TS parse '+file);const a=[];function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const title=n.arguments[0].text,id=title.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id)a.push({id,title,body:n.getText(tree),start:n.getStart(tree),end:n.end});}ts.forEachChild(n,walk);}walk(tree);return a;}
const file='tenant/scanner/scanner-batch32.spec.ts',path='tests/'+file;let str=fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');
assert(str.includes('support/liveOriginalSafeTest')&&str.includes('openB237Target'),'Original live scanner safety adapter missing');assert(!/\b(?:route|r)\.(?:continue|fetch)\(/.test(str),'Unsafe forwarding');
const before=cases(str,file),ops=[];
for(const id of s){const t=before.find(t=>t.id===id);assert(t);assert.equal(sha(t.body),p.tests[id].sha256_original_body,'Original placeholder drift '+id);assert(t.body.includes('test.skip(true,')&&!t.body.includes('expect('));
 const start="const start=page.getByRole('button',{name:'Start Camera Scanner',exact:true});const stop=page.getByRole('button',{name:'Stop Camera Scanner',exact:true});const state=()=>page.evaluate(()=>((window as any).__b241CameraState)());";
 const noWrites="expect(seen.filter(x=>x.method!=='GET')).toHaveLength(0);expect(seen.filter(x=>x.path.includes('/shipments/qr/'))).toHaveLength(0);expect(receives(seen)).toHaveLength(0);expect(tasks(seen)).toHaveLength(0);";
 const denial=`async({page})=>{
  await page.addInitScript(b241CameraInit,'denied');const seen=await open(page,'shipment');${start}
  await expect(start).toBeEnabled();await expect(stop).toBeDisabled();expect((await state()).attempted).toBe(0);
  await start.click();await expect.poll(async()=> (await state()).denied).toBeGreaterThan(0);
  await expect(errors(page)).toBeVisible();await expect(errors(page)).toContainText(/camera|permission|NotAllowedError/i);
  await expect(start).toBeEnabled();await expect(stop).toBeDisabled();await expect(page.locator('#manual-code-input')).toBeEnabled();
  expect((await state()).active).toBe(0);expect((await state()).unexpected).toBe(0);${noWrites}
 }`;
 const lifecycle=`async({page})=>{
  await page.addInitScript(b241CameraInit,'fake');const seen=await open(page,'shipment');${start}
  await expect(start).toBeEnabled();await expect(stop).toBeDisabled();expect((await state()).active).toBe(0);
  await start.click();await expect.poll(async()=> (await state()).active).toBe(1);await expect(start).toBeDisabled();await expect(stop).toBeEnabled();
  expect((await state()).unexpected).toBe(0);expect((await state()).peak).toBe(1);
  await stop.click();await expect.poll(async()=> (await state()).active).toBe(0);await expect(start).toBeEnabled();await expect(stop).toBeDisabled();
  expect((await state()).ended).toBeGreaterThan(0);await expect(page.locator('#manual-code-input')).toBeEnabled();
  await start.click();await expect.poll(async()=> (await state()).active).toBe(1);await expect(start).toBeDisabled();await expect(stop).toBeEnabled();
  await stop.click();await expect.poll(async()=> (await state()).active).toBe(0);await expect(start).toBeEnabled();await expect(stop).toBeDisabled();
  expect((await state()).peak).toBe(1);expect((await state()).unexpected).toBe(0);${noWrites}
 }`;
 const next=`test(${JSON.stringify(t.title)},${id==='TSN-045'?denial:lifecycle})`;assert(!/test\.skip\(|loginAsDisposableRole\(|\.only\(/.test(next));ops.push({start:t.start,end:t.end,next});}
for(const op of ops.sort((a,b)=>b.start-a.start))str=str.slice(0,op.start)+op.next+str.slice(op.end);
str="import {b241CameraInit} from '../../../support/b241-camera-fixture.mjs';\n"+str;
const after=cases(str,file);assert.deepEqual(before.map(t=>t.id),after.map(t=>t.id));assert.deepEqual(before.map(t=>t.title),after.map(t=>t.title));for(const t of before)if(!s.includes(t.id))assert.equal(after.find(a=>a.id===t.id).body,t.body,'Unselected original modified '+t.id);
assert.equal(ts.createSourceFile(file,str,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0);fs.writeFileSync(path,str);m.approved_groups.BULK_SAFE_17={secret:true,entries:[{file,ids:s,sha256:sha(str)}]};fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');console.log('PASS B241: two exact authored camera placeholders activated with controlled media; original titles/IDs and every unselected call preserved.');
