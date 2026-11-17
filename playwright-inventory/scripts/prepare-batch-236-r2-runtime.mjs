import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sort=x=>[...x].sort();
const p=read('batch-236-r2-review.json'),base=read('batch-236-review.json'),m=read('original-suite-approved.json');
const group=m.approved_groups.BULK_SAFE_17;
assert.equal(p.selected.length,64);assert.equal(p.passed.length,72);assert.equal(p.held.length,14);
assert.equal(new Set([...p.selected,...p.passed,...p.held]).size,150);
assert.deepEqual(sort([...p.selected,...p.passed,...p.held]),sort(base.selected));
assert.deepEqual(sort(group.entries.flatMap(e=>e.ids)),sort(base.selected));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const replace=(s,a,b)=>{assert(s.includes(a),'R2 missing reviewed anchor '+a);assert.equal(s.split(a).length,2,'R2 repeated anchor '+a);return s.replace(a,b);};
const all=(s,a,b)=>{assert(s.includes(a),'R2 missing reviewed anchor '+a);return s.replaceAll(a,b);};
for(const e of group.entries){
 const f='tests/'+e.file;let s=fs.readFileSync(f,'utf8');assert.equal(sha(s),e.sha256);
 const name=e.file.split('/').at(-1);
 if(name==='execution-requests.spec.ts'){
  s=replace(s,"if (path === '/execution-requests/options') return fulfillJson(route, options);","if (path === '/execution-requests/options') return fulfillJson(route, opts.replyByPath?.[path] ?? options);");
  s=replace(s,"await expect(page.getByText('Synthetic readiness evidence only')).toBeVisible();","await page.locator('#execution-request-controls > summary').click();\n    await expect(page.getByText('Synthetic readiness evidence only')).toBeVisible();");
  s=replace(s,"await expect(page.getByText('No active products available')).toBeVisible();","await expect(page.locator('select option').filter({ hasText: /^No active products available$/ })).toHaveCount(1);");
 }
 if(name==='inventory-capabilities-workflows.spec.ts'){
  s=replace(s,"{ code: s.failCode || 'FIXTURE_UNAVAILABLE', message: 'Fixture request unavailable' }","{ error: { code: s.failCode || 'FIXTURE_UNAVAILABLE', message: 'Fixture request unavailable' } }");
  s=replace(s,"{ code: s.failCode || 'VERSION_CONFLICT', message: 'Fixture request rejected' }","{ error: { code: s.failCode || 'VERSION_CONFLICT', message: 'Fixture request rejected' } }");
  s=replace(s,"{ code: 'WEBHOOK_CURSOR_INVALID', message: 'Invalid cursor' }","{ error: { code: 'WEBHOOK_CURSOR_INVALID', message: 'Invalid cursor' } }");
  s=replace(s,"expect(page.getByRole('group', { name: 'Events' })).toBeDisabled()","expect(page.getByRole('group', { name: 'Events' })).toHaveAttribute('disabled', '')");
  s=all(s,"getByPlaceholder('Serial number')","getByPlaceholder('Serial number', { exact: true })");
  s=all(s,"page.getByText('This configuration changed after you opened it.')","page.getByRole('main').getByText('This configuration changed after you opened it.')");
  for(const msg of ['The save was acknowledged, but the conversion could not be checked.','The save was acknowledged, but the conversion was not found on reload.'])s=replace(s,`page.getByText('${msg}')`,`page.getByRole('main').getByText('${msg}')`);
 }
 if(name==='inventory-capabilities-advanced.spec.ts'){
  s=replace(s,"{ code: 'FIXTURE_UNAVAILABLE', message: 'Fixture data unavailable' }","{ error: { code: 'FIXTURE_UNAVAILABLE', message: 'Fixture data unavailable' } }");
  s=replace(s,"{ code: opts.failCode || 'FIXTURE_REJECTED', message: 'Fixture action rejected' }","{ error: { code: opts.failCode || 'FIXTURE_REJECTED', message: 'Fixture action rejected' } }");
  s=replace(s,"expect(sent(calls, '/preview').at(-1)?.body.allocation_method).toBe('quantity');","await expect.poll(() => sent(calls, '/preview').at(-1)?.body.allocation_method).toBe('quantity');");
  s=replace(s,"const patch = sent(calls, `/location-hierarchy/${LOCATION}`)[0];","await expect.poll(() => sent(calls, `/location-hierarchy/${LOCATION}`).length).toBe(1);\n    const patch = sent(calls, `/location-hierarchy/${LOCATION}`)[0];");
  s=replace(s,"form.getByRole('button', { name: 'Remove' }).last().click()","form.locator('.capability-component-row').filter({ has: page.getByLabel('Component 2', { exact: true }) }).getByRole('button', { name: 'Remove', exact: true }).click()");
 }
 if(name==='inventory-capabilities.spec.ts'){
  for(const [a,b] of [['API_CLIENT_ALREADY_EXISTS','Fixture duplicate key'],['WEBHOOK_URL_INVALID','Fixture webhook endpoint rejected'],['WEBHOOK_VERSION_CONFLICT','Fixture version conflict'],['VERSION_CONFLICT','Fixture definition changed']])s=replace(s,`{ code: '${a}', message: '${b}' }`,`{ error: { code: '${a}', message: '${b}' } }`);
  s=all(s,"getByPlaceholder('Serial number')","getByPlaceholder('Serial number', { exact: true })");
 }
 const tree=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(tree.parseDiagnostics.length,0,f);
 assert(!/\b(?:route|r)\.(?:continue|fetch)\(/.test(s));
 e.ids=e.ids.filter(i=>p.selected.includes(i));e.sha256=sha(s);fs.writeFileSync(f,s);
}
group.entries=group.entries.filter(e=>e.ids.length);
assert.deepEqual(sort(group.entries.flatMap(e=>e.ids)),sort(p.selected));
fs.writeFileSync('original-suite-approved.json',JSON.stringify(m,null,2)+'\n');
console.log('PASS B236 R2: 64 unresolved originals; 72 actual passes excluded; 14 held with reasons.');
