import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire, Module } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = 'https://hotel-inventory-frontend-mauve.vercel.app';
const keys = ['PW_LIVE_ORIGINAL_READONLY','PW_ORIGINAL_SUITE_GROUP','PW_BASE_URL'];
const original = Object.fromEntries(keys.map(key => [key,process.env[key]]));
const calls = {logins:0, contexts:0, blocked:0, continued:0, mockFulfilled:0, recovered:0};
const jwt = (sec = 3600) => `pw.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+sec })).toString('base64url')}.signature`;
const snapshot = id => ({cookies:[{name:'refresh',value:`cookie-${id}`,domain:'hotel-inventory-frontend-mauve.vercel.app',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax'}],origins:[{origin:FRONTEND,localStorage:[{name:'inventory_access_token',value:jwt()}]}]});
let transientDashboardFailures = 0;
const expectMock = value => ({toBeVisible:async()=>{
  if (transientDashboardFailures > 0) {
    transientDashboardFailures--;
    throw new Error('Synthetic first-context dashboard load failed');
  }
},toEqual:wanted=>assert.deepEqual(value,wanted)});
const playwright = {expect:expectMock,test:{extend:fixtures=>fixtures}};
const environment = {requireDisposableTenantCredentials:()=>({email:'stub@example.invalid',password:'NOT_A_REAL_PASSWORD'})};
function load(rel) {
  const file=path.join(root,rel);
  const res=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},reportDiagnostics:true});
  assert.equal((res.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`Cannot transpile ${rel}`);
  const m=new Module(file);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));
  m.require=(id)=>id==='@playwright/test'?playwright:id==='./environment'?environment:id==='./liveOriginalSafeTest'?fixture:require(id);
  m._compile(res.outputText,file);return m.exports;
}
const fixture=load('support/liveOriginalSafeTest.ts');
const testHelpers=load('support/tenantSession.ts');
const browser={newContext:async options=>{
  calls.contexts++;assert.equal(options.baseURL,FRONTEND);assert.equal(options.serviceWorkers,'block');
  const id=calls.contexts;
  return {
    route:async (pattern,cb)=>{ assert.equal(pattern,'**/*'); assert.equal(typeof cb,'function'); },
    newPage:async ()=>({
      addInitScript:async()=>{},goto:async url=>assert.equal(url,'/login'),
      locator:()=>({fill:async()=>{},click:async()=>{calls.logins++}}),getByRole:()=>({})
    }),
    storageState:async()=>snapshot(id),close:async()=>{}
  };
}};
async function runWorker() {
  let stored;
  await fixture.test.bulkSession[0]({browser},async session=>{
    for(let i=0;i<25;i++) await fixture.test.storageState({bulkSession:session},async state=>{
      assert.equal(state.cookies[0].value,`cookie-${stored?.id ?? calls.contexts}`);
    });
    stored={id:calls.contexts,session};
  });
  return stored;
}
const makeRequest=(method, path)=>({method:()=>method,url:()=>FRONTEND+path});
async function runGuard(callback, workerOverride) {
  const contextHandlers=[];const pageHandlers=[];const finished=[];
  let absorbed = false;
  const rotated = snapshot('mock-page-rotation');
  const browserState={cleared:0,cookies:[],token:null,paths:[]};
  const context={
    route:async(pattern,cb)=>{assert.equal(pattern,'**/*');contextHandlers.push(cb)},
    storageState:async()=>rotated,
    clearCookies:async()=>{browserState.cleared++},
    addCookies:async cookies=>{browserState.cookies=cookies}
  };
  const page={
    context:()=>context, url:()=>FRONTEND+'/dashboard',
    evaluate:async (_fn,token)=>{browserState.token=token},
    goto:async path=>{browserState.paths.push(path)},
    on:(event,handler)=>{if(event==='requestfinished')finished.push(handler)},
    route:async(_pattern,cb)=>pageHandlers.push(cb)
  };
  const worker=workerOverride??{absorb:state=>{
    assert.equal(state.cookies[0].value,'cookie-mock-page-rotation');
    absorbed = true;
  }};
  if (workerOverride) {
    const originalAbsorb = worker.absorb;
    worker.absorb = state => { absorbed = true; originalAbsorb(state); };
  }
  await fixture.test.page({page,bulkSession:worker},async guarded=>callback({guarded,contextHandlers,pageHandlers,finished,browserState}));
  assert(absorbed,'Page teardown must feed refreshed auth state back to the worker');
}
try {
  process.env.PW_LIVE_ORIGINAL_READONLY='YES';process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_02_RECHECK';process.env.PW_BASE_URL=FRONTEND;
  const workers=[];
  for(let i=0;i<3;i++)workers.push(await runWorker());
  assert.equal(calls.logins,3,'One login for each of 3 workers');
  assert.equal(new Set(workers.map(x=>`cookie-${x.id}`)).size,3,'Unique worker identities');
  // Refresh-cookie rotation from a finished test must persist to the next
  // isolated context without leaking temporary role or permission mutations.
  const rotatedSnapshot=snapshot('rotated-101');
  rotatedSnapshot.origins[0].localStorage.push({name:'inventory_tenant_effective_permissions',value:'UNTRUSTED_TEST_OVERRIDE'});
  workers[0].session.absorb(rotatedSnapshot);
  assert.equal(workers[0].session.snapshot.cookies[0].value,'cookie-rotated-101');
  assert.equal(workers[0].session.snapshot.origins[0].localStorage.some(x=>x.value==='UNTRUSTED_TEST_OVERRIDE'),false,
    'Temporary permission override must not propagate to next test');
  const alreadyStale=snapshot('stale-101');
  alreadyStale.origins[0].localStorage[0].value=jwt(5);
  workers[0].session.absorb(alreadyStale);
  assert.equal(workers[0].session.snapshot.cookies[0].value,'cookie-rotated-101',
    'Stale observed auth must never overwrite the last healthy worker session');
  // A genuinely near-expired worker renews only its own cookie/session.
  workers[0].session.snapshot.origins[0].localStorage[0].value=jwt(10);
  await fixture.test.storageState({bulkSession:workers[0].session},async state=>{
    assert(state.origins[0].localStorage[0].value!==jwt(10));
  });
  assert.equal(calls.logins,4,'Only expiring worker renews');
  // Proactive renewal must also cover a valid JWT backed by an aging refresh-cookie pair.
  workers[1].session.lastLoginAt = Date.now() - 9*60*1000;
  await fixture.test.storageState({bulkSession:workers[1].session},async state=>{
    assert.equal(state.cookies[0].value,`cookie-${calls.contexts}`);
  });
  assert.equal(calls.logins,5,'Aged refresh identity renews before the user-facing dashboard fails');
  // Recover a single failed dashboard with a fresh worker identity, never a
  // shared on-disk authentication snapshot and never an unmocked write.
  const repair={snapshot:snapshot('stale-identity'),lastLoginAt:Date.now(),renew:async()=>{
    calls.recovered++;repair.snapshot=snapshot('recovered-identity');repair.lastLoginAt=Date.now();
  },absorb:()=>{}};
  await runGuard(async({guarded,browserState})=>{
    await fixture.restoreBulkTenantSession(guarded);
    assert.equal(browserState.cleared,1);
    assert.equal(browserState.cookies[0].value,'cookie-recovered-identity');
    assert.equal(browserState.token,repair.snapshot.origins[0].localStorage[0].value);
    assert.deepEqual(browserState.paths,['/dashboard']);
  },repair);
  assert.equal(calls.recovered,1,'Dashboard recovery is worker-scoped and explicit');
  // Simulate an application-startup POST. It MUST be blocked before live network;
  // an aborted request is not a completed mutation or a test failure.
  await runGuard(async({contextHandlers})=>{
    const req=makeRequest('POST','/api/runtime/heartbeat');
    const r={request:()=>req,abort:async()=>{calls.blocked++},continue:async()=>{calls.continued++}};
    await contextHandlers[0](r);
    assert.equal(calls.blocked,1);
    assert.equal(calls.continued,0);
  });
  // Fulfilled synthetic POST is allowed and a requestfinished event is NOT
  // treated as a real live mutation.
  await runGuard(async({guarded,pageHandlers,finished})=>{
    await guarded.route('**/preview',route=>route.fulfill({status:200,body:'{}'}));
    const req=makeRequest('POST','/api/inventory-imports/preview');
    await pageHandlers[0]({request:()=>req,fulfill:async()=>{calls.mockFulfilled++}});
    finished[0](req);
  });
  assert.equal(calls.mockFulfilled,1);
  // A registered page route cannot send a mutation to the live network.
  await runGuard(async({guarded,pageHandlers})=>{
    await guarded.route('**/*',route=>route.continue());
    await assert.rejects(pageHandlers[0]({request:()=>makeRequest('PATCH','/api/stock'),abort:async()=>{calls.blocked++}}),/unmocked write/);
  });
  // Any completed unmocked non-auth write must still fail the test.
  await assert.rejects(runGuard(async({finished})=>{
    finished[0](makeRequest('POST','/api/stock/adjust'));
  }),/Expected values|unauthorized live write/);
  let navigated='';
  await testHelpers.loginAsTenant({addInitScript:async()=>{},goto:async url=>{navigated=url},getByRole:()=>({})});
  assert.equal(navigated,'/dashboard');
  process.env.PW_ORIGINAL_SUITE_GROUP='PRODUCTS';
  await fixture.test.bulkSession[0]({browser},async session=>assert.deepEqual(session.snapshot,{cookies:[],origins:[]}));
  assert.equal(calls.logins,5,'Nonbulk group does not use worker authentication');
  process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_02_RECHECK';
  process.env.PW_BASE_URL='https://wrong.example.invalid';
  await assert.rejects(fixture.test.bulkSession[0]({browser},async()=>{}),/exact reviewed production origin/);
  // Batch 214 regression: a transient failed dashboard MUST retry exactly once
  // in a fresh browser context without sharing cookies or changing write guards.
  process.env.PW_BASE_URL = FRONTEND;
  transientDashboardFailures = 1;
  const beforeRetry = { contexts: calls.contexts, logins: calls.logins };
  await runWorker();
  assert.equal(calls.contexts - beforeRetry.contexts, 2, 'Transient failure must use exactly one isolated retry');
  assert.equal(calls.logins - beforeRetry.logins, 2, 'Both isolated login attempts exercised');
  // Two consecutive failures must remain RED, never silently mark authentication GREEN.
  transientDashboardFailures = 2;
  await assert.rejects(fixture.test.bulkSession[0]({browser},async()=>{}),/both isolated attempts/);
  assert.equal(transientDashboardFailures, 0);
  console.log('PASS: 1 bounded recovery for transient dashboard failure; persistent login failure remains fatal.');
  console.log('PASS: Three independent worker logins; rotated cookies carried between contexts, expired auth and permission overrides rejected.');
  console.log('PASS: Production startup POST aborted but not misreported as a completed write.');
  console.log('PASS: Synthetic POST fulfillment tracked; page-route write continuation aborted; unmocked completed write fails.');
  console.log('PASS: Proactive stale-session renewal and worker-scoped dashboard recovery; wrong-origin / legacy nonbulk behavior.');
} finally {
  for(const [key,value] of Object.entries(original)) if(value===undefined)delete process.env[key];else process.env[key]=value;
}
