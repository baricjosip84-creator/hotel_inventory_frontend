import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire, Module } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = 'https://hotel-inventory-frontend-mauve.vercel.app';
const originalEnv = Object.fromEntries(
  ['PW_LIVE_ORIGINAL_READONLY','PW_ORIGINAL_SUITE_GROUP','PW_BASE_URL'].map(k=>[k,process.env[k]])
);
let credentialsChecked = 0;
const environmentStub = { requireDisposableTenantCredentials: () => {
  credentialsChecked++;
  return { email: 'stub@example.invalid', password: 'stub-only-password' };
}};
const calls = { logins: 0, contexts: 0, closed: 0, locale: 0, intercepted: 0 };
function mockExpect(value) {
  return {
    toBeVisible: async () => {},
    toEqual: expected => assert.deepEqual(value, expected)
  };
}
const playwrightStub = { expect: mockExpect, test: { extend: fixtures => fixtures } };
function loadTs(relative) {
  const full = path.join(root,relative);
  const result = ts.transpileModule(fs.readFileSync(full,'utf8'), {
    fileName: full,
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true
  });
  const errors = (result.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `TypeScript transpilation failed for ${relative}`);
  const m = new Module(full);
  m.filename = full;
  m.paths = Module._nodeModulePaths(path.dirname(full));
  m.require = (name) => {
    if (name === '@playwright/test') return playwrightStub;
    if (name === './environment') return environmentStub;
    throw new Error(`Unexpected test bootstrap import: ${name}`);
  };
  m._compile(result.outputText,full);
  return m.exports;
}
const fixture = loadTs('support/liveOriginalSafeTest.ts');
const tenantSession = loadTs('support/tenantSession.ts');
const stubJwt = `stub.${Buffer.from(JSON.stringify({exp: Math.floor(Date.now()/1000)+3600})).toString('base64url')}.signature`;
const sessionState = { cookies: [{name:'simulated-only',value:'no-secret',domain:'hotel-inventory-frontend-mauve.vercel.app',path:'/',expires:-1,httpOnly:false,secure:true,sameSite:'Lax'}],
  origins:[{origin:FRONTEND,localStorage:[{name:'inventory_access_token',value:stubJwt}]}] };
function fakeBrowser() {
  return { newContext: async (options) => {
    calls.contexts++;
    assert.equal(options.baseURL, FRONTEND);
    assert.equal(options.serviceWorkers, 'block');
    return {
      route: async (_pattern, cb) => { assert.equal(typeof cb,'function'); calls.intercepted++; },
      newPage: async () => ({
        addInitScript: async () => calls.locale++,
        goto: async route => assert.equal(route,'/login'),
        locator: () => ({fill: async () => {},click: async () => {calls.logins++}}),
        getByRole: () => ({})
      }),
      storageState: async () => sessionState,
      close: async () => {calls.closed++}
    };
  }};
}
const authFixture = fixture.test.bulkSession[0];
const storageFixture = fixture.test.storageState;
try {
  process.env.PW_LIVE_ORIGINAL_READONLY='YES';
  process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_01';
  process.env.PW_BASE_URL=FRONTEND;
  let count=0;
  await authFixture({browser:fakeBrowser()},async state => {
    assert.deepEqual(state.snapshot,sessionState);
    // Simulate 155 independently created test contexts using ONE worker state.
    for(let i=0;i<155;i++) {
      await storageFixture({bulkSession:state},async restored=>{
        assert.deepEqual(restored,sessionState);
        count++;
      });
    }
    let calledLoginEndpoint=false;
    await tenantSession.loginAsTenant({
      addInitScript: async()=>{},
      goto: async()=>{calledLoginEndpoint=true}
    });
    assert.equal(calledLoginEndpoint,false,'Bulk tests must not perform per-test /auth/login');
    assert.equal(calls.logins,1,'Expected one login across 155 fresh contexts');
    // Force the token near expiry; only then must the worker renew once.
    state.snapshot = structuredClone(sessionState);
    state.snapshot.origins[0].localStorage[0].value = `stub.${Buffer.from(JSON.stringify({exp: Math.floor(Date.now()/1000)+10})).toString('base64url')}.signature`;
    await storageFixture({bulkSession:state},async restored=>{
      assert.deepEqual(restored,sessionState,'Renewed storageState must contain the fresh auth token');
    });
    assert.equal(calls.logins,2,'Expiring worker must renew exactly once');
  });
  assert.equal(count,155);
  assert.equal(calls.logins,2);
  assert.equal(calls.contexts,2);
  assert.equal(calls.closed,2);
  assert.equal(calls.intercepted,2,'Bootstrap and renewal must both include write guards');
  assert.equal(calls.locale,2);
  assert.equal(credentialsChecked,2); // once for bootstrap, once for tenantSession guard

  // Batch 205: the same in-memory authenticated worker fixture must also
  // reuse ONE login for the second bulk group, not run per-test credentials.
  process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_02';
  process.env.PW_BASE_URL=FRONTEND;
  let secondBatchRestored=0;
  await authFixture({browser:fakeBrowser()},async state=>{
    for(let i=0;i<250;i++) {
      await storageFixture({bulkSession:state},async restored=>{
        assert.deepEqual(restored,sessionState);
        secondBatchRestored++;
      });
    }
    let navigatedToLogin=false;
    await tenantSession.loginAsTenant({addInitScript:async()=>{}, goto:async()=>{navigatedToLogin=true}});
    assert.equal(navigatedToLogin,false,'BULK_SAFE_02 must not attempt per-test login');
  });
  assert.equal(secondBatchRestored,250);
  assert.equal(calls.logins,3,'One extra login only for the new bulk worker');
  assert.equal(calls.contexts,3);
  assert.equal(calls.closed,3);
  assert.equal(calls.intercepted,3);

  // Existing non-bulk groups must retain their original login behavior.
  process.env.PW_ORIGINAL_SUITE_GROUP='PRODUCTS';
  await authFixture({browser:fakeBrowser()},async state=>{
    assert.deepEqual(state.snapshot,{cookies:[],origins:[]});
    await storageFixture({bulkSession:state},async restored=>assert.equal(restored,undefined));
  });
  let oldLoginNavigations=0;
  await tenantSession.loginAsTenant({
    addInitScript: async()=>{},
    goto: async url=>{assert.equal(url,'/login');oldLoginNavigations++},
    locator:()=>({fill:async()=>{},click:async()=>{}}),
    getByRole:()=>({})
  });
  assert.equal(oldLoginNavigations,1,'Legacy groups should still login per test');
  assert.equal(calls.logins,3,'No extra bootstrap login for existing groups');

  // Fail closed if the exact origin is wrong before any browser is opened.
  process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_02';
  process.env.PW_BASE_URL='https://wrong.example.invalid';
  await assert.rejects(authFixture({browser:fakeBrowser()},async()=>{}),/exact reviewed production origin/);
  assert.equal(calls.contexts,3);
  console.log('PASS: mocked worker auth: BULK_SAFE_01 (155) and BULK_SAFE_02 (250) share one login per worker; token renewal tested.');
  console.log('PASS: legacy login maintained; bootstrap protected; wrong-origin execution denied; no real secrets used.');
} finally {
  for (const [key,value] of Object.entries(originalEnv)) {
    if(value===undefined) delete process.env[key];
    else process.env[key]=value;
  }
}
