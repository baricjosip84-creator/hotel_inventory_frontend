import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire, Module } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = 'https://hotel-inventory-frontend-mauve.vercel.app';
const keys = ['PW_LIVE_ORIGINAL_READONLY','PW_ORIGINAL_SUITE_GROUP','PW_BASE_URL','PW_BULK_SHARED_AUTH_STATE'];
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const calls = { logins: 0, contexts: 0, closed: 0, browserClosed: 0, loginNavigations: 0, locale: 0, blocked: 0, fulfilled: 0 };
const jwt = (seconds = 3600) => `simulation.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+seconds})).toString('base64url')}.signature`;
const snapshot = () => ({cookies:[],origins:[{origin:FRONTEND,localStorage:[{name:'inventory_access_token',value:jwt()}]}]});
const mockExpect = (value) => ({toBeVisible: async () => {}, toEqual: wanted => assert.deepEqual(value,wanted)});
const playwright = { expect: mockExpect, test: {extend: fixtures => fixtures}, chromium: {launch: async () => browser} };
const environment = { requireDisposableTenantCredentials: () => ({email:'stub@example.invalid',password:'NOT_A_REAL_PASSWORD'}) };
const loaded = {};
function load(rel) {
  if (loaded[rel]) return loaded[rel];
  const file = path.join(root,rel);
  const res = ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},reportDiagnostics:true});
  assert.equal((res.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,`Cannot transpile ${rel}`);
  const m = new Module(file); m.filename=file; m.paths=Module._nodeModulePaths(path.dirname(file));
  m.require=(id)=> {
    if(id==='@playwright/test')return playwright;
    if(id==='./environment')return environment;
    if(id==='./liveOriginalSafeTest')return load('support/liveOriginalSafeTest.ts');
    if(id.startsWith('.')) throw Error(`Unexpected local import in ${rel}: ${id}`);
    return require(id);
  };
  m._compile(res.outputText,file);loaded[rel]=m.exports;return loaded[rel];
}
const browser = {
  newContext: async options => {
    calls.contexts++; assert.equal(options.baseURL,FRONTEND);assert.equal(options.serviceWorkers,'block');
    return {
      route: async (pattern,handler) => { assert.equal(pattern,'**/*'); assert.equal(typeof handler,'function'); },
      newPage: async () => ({
        addInitScript: async()=>{calls.locale++},goto:async url=>assert.equal(url,'/login'),
        locator:()=>({fill:async()=>{}, click:async()=>{calls.logins++}}), getByRole:()=>({})
      }),
      storageState: async()=>snapshot(), close:async()=>{calls.closed++}
    };
  },close:async()=>{calls.browserClosed++}
};
const fixture = load('support/liveOriginalSafeTest.ts');
const tenantSession=load('support/tenantSession.ts');
const globalSetup=load('support/bulkSharedAuthSetup.ts').default;
try {
  process.env.PW_LIVE_ORIGINAL_READONLY='YES';
  process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_02';
  process.env.PW_BASE_URL=FRONTEND;
  delete process.env.PW_BULK_SHARED_AUTH_STATE;
  await assert.rejects(fixture.test.bulkSession[0]({browser},async()=>{}),/Missing bulk auth setup/);
  assert.equal(calls.logins,0);
  await globalSetup();
  assert.equal(calls.logins,1,'Exactly ONE bootstrap login per entire GitHub job');
  assert.equal(calls.browserClosed,1);
  const captured=JSON.parse(process.env.PW_BULK_SHARED_AUTH_STATE);
  assert.equal(captured.origins[0].origin,FRONTEND);
  let restored=0;
  for(let worker=0;worker<11;worker++) {
    await fixture.test.bulkSession[0]({browser}, async session => {
      for(let i=0;i<25;i++) {
        await fixture.test.storageState({bulkSession:session},async state=>{
          assert.equal(state.origins[0].origin,FRONTEND);restored++;
        });
      }
      // Worker exits/fails: creating a replacement worker MUST NOT log in again.
    });
  }
  assert.equal(restored,275);
  assert.equal(calls.logins,1,'Worker restarts must not trigger new logins or rate limits');
  // Unlike a restart, a genuinely near-expired token must renew once safely.
  await fixture.test.bulkSession[0]({browser},async session=>{
    session.snapshot.origins[0].localStorage[0].value=jwt(10);
    await fixture.test.storageState({bulkSession:session},async state=>{
      assert.notEqual(state.origins[0].localStorage[0].value,session.snapshot.origins[0].localStorage[0].value+'-stale');
      const token=state.origins[0].localStorage[0].value;
      assert(token!==null && token.split('.').length===3);
    });
  });
  assert.equal(calls.logins,2,'A genuinely expiring token should renew once');
  let navigated = '';
  await tenantSession.loginAsTenant({addInitScript:async()=>{},goto:async url=>{navigated=url;calls.loginNavigations++;},getByRole:()=>({})});
  assert.equal(navigated,'/dashboard','Restored bulk login must still open the dashboard');
  const contextHandlers=[];const pageHandlers=[];
  const page={
    context:()=>({route:async (_pattern,cb)=>contextHandlers.push(cb)}),
    route:async (_pattern,cb)=>pageHandlers.push(cb)
  };
  await fixture.test.page({page}, async guardedPage=>{
    // User-defined mocked POST: Playwright runs page handlers before context handlers.
    await guardedPage.route('**/inventory-imports/preview', async route => route.fulfill({status:200,body:'{}'}));
    const syntheticWrite={request:()=>({method:()=> 'POST',url:()=> FRONTEND+'/api/inventory-imports/preview'}),fulfill:async()=>{calls.fulfilled++}};
    await pageHandlers[0](syntheticWrite);
    assert.equal(calls.fulfilled,1,'Synthetic write should be fulfilled locally');
    assert.equal(calls.blocked,0,'Mocks must not be mistaken for live writes');
    const unmocked = {request:()=>({method:()=> 'POST',url:()=> FRONTEND+'/api/inventory-imports/commit'}),abort:async()=>{calls.blocked++}};
    await contextHandlers[0](unmocked);
    assert.equal(calls.blocked,1,'Unmocked write must be blocked at network boundary');
  }).then(()=>{throw Error('Unmocked POST must make test fail closed')},error=>assert.match(error.message,/Expected values|Unmocked production write attempted/));
  // A page-level route that calls continue on a write must be blocked too.
  const ctx=[],handlers=[];
  const page2={context:()=>({route:async(_pattern,cb)=>ctx.push(cb)}),route:async(_pattern,cb)=>handlers.push(cb)};
  await fixture.test.page({page:page2},async guarded=>{
    await guarded.route('**/*',route=>route.continue());
    await assert.rejects(handlers[0]({request:()=>({method:()=> 'PATCH',url:()=> FRONTEND+'/api/stock'}),abort:async()=>{calls.blocked++}}),/unmocked write/);
  }).then(()=>{throw Error('page.route write continuation should fail test')},error=>assert.match(error.message,/Expected values|Unmocked production write attempted/));
  // Existing single-page groups retain original flow.
  process.env.PW_ORIGINAL_SUITE_GROUP='PRODUCTS';
  await fixture.test.bulkSession[0]({browser},async session=>{
    assert.deepEqual(session.snapshot,{cookies:[],origins:[]});
  });
  assert.equal(calls.logins,2);
  process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_02';
  process.env.PW_BASE_URL='https://invalid.example.invalid';
  await assert.rejects(fixture.test.bulkSession[0]({browser},async()=>{}),/exact reviewed production origin/);
  console.log('PASS: One job-wide in-memory login, 275 restored contexts over 11 simulated worker restarts, plus one expiring-token renewal.');
  console.log('PASS: Dashboard navigation semantics restored; an unmocked POST and page-route PATCH are blocked; mocked POST allowed.');
  console.log('PASS: Wrong origin and absent bootstrap session fail closed; previous nonbulk groups unaffected.');
} finally {
  for(const [key,value] of Object.entries(original)) if(value===undefined)delete process.env[key]; else process.env[key]=value;
}
