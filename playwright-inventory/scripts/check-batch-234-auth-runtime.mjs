// Deterministic, offline execution of the actual transformed worker fixture.
// Credentials, JWTs and browser contexts below are synthetic, never live.
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const origin = 'https://hotel-inventory-frontend-mauve.vercel.app';
const state = (seconds = 3600) => ({ cookies: [], origins: [{ origin, localStorage: [{ name: 'inventory_access_token', value: `fake.${Buffer.from(JSON.stringify({exp: Date.now()/1000+seconds})).toString('base64url')}.fake` }] }] });
const empty = { cookies: [], origins: [] };

export async function checkAuthRuntime(source, filename) {
  const { outputText, diagnostics } = ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.equal(diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const keys = ['PW_LIVE_ORIGINAL_READONLY', 'PW_ORIGINAL_SUITE_GROUP', 'PW_BASE_URL'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const realTimeout = globalThis.setTimeout;
  let contexts, logins, closed, reads, dashboards, failures, plans;
  const expect = () => ({ toBeVisible: async () => { if(failures > 0) { failures--; throw new Error('Synthetic stalled dashboard'); } } });
  expect.poll = (callback, options) => ({ toBe: async wanted => {
    assert.equal(options.timeout, 45_000);
    for (let i=0; i<6; i++) if (await callback() === wanted) return;
    throw new Error('Synthetic poll timeout');
  }});
  const playwright = { expect, test: { extend: f => f } };
  const environment = { requireDisposableTenantCredentials: () => ({ email:'synthetic@example.invalid', password:'NOT_REAL' }) };
  const module = new Module(filename); module.filename = filename;
  module.require = id => id === '@playwright/test' ? playwright : id === './environment' ? environment : require(id);
  module._compile(outputText, filename);
  const fixtures = module.exports.test;
  async function run(scenarios, stalled = 0) {
    contexts = logins = closed = reads = dashboards = 0; failures = stalled; plans = scenarios;
    const browser = { newContext: async options => {
      assert.equal(options.baseURL, origin); assert.equal(options.serviceWorkers, 'block');
      const plan = plans[contexts++]; assert(plan, 'Unexpected additional login context');
      let handler, location = origin + '/login', contextReads = 0;
      return {
        route: async (pattern, guard) => {
          assert.equal(pattern, '**/*');
          for (const [method, url, allowed] of [['GET',origin+'/dashboard',true],['POST',origin+'/api/auth/login',true],['POST','https://backend.onrender.com/api/auth/refresh',true],['POST',origin+'/api/stock',false],['PATCH',origin+'/api/stock',false],['POST','https://untrusted.example.invalid/api/auth/login',false]]) {
            let result;
            await guard({request:()=>({method:()=>method,url:()=>url}), continue:()=>{result=true}, abort:()=>{result=false}});
            assert.equal(result, allowed);
          }
        },
        newPage: async () => ({
          addInitScript: async()=>{},
          on: (event, fn) => { assert.equal(event,'response'); handler=fn; },
          url: () => location,
          goto: async p => { assert(['/login','/dashboard'].includes(p)); location=origin+p; if(p==='/dashboard') dashboards++; },
          locator: () => ({ fill: async()=>{}, click: async()=>{
            logins++;
            if(plan.status !== undefined) handler({request:()=>({method:()=> 'POST'}),url:()=>origin+'/api/auth/login',status:()=>plan.status});
          }}),
          getByRole: () => ({})
        }),
        storageState: async()=>{
          contextReads++; reads++;
          if (!plan.token || contextReads <= (plan.delay ?? 0)) return empty;
          if (!plan.wrongPage) location=origin+'/dashboard';
          return state(plan.expiry);
        },
        close: async()=>{closed++}
      };
    }};
    await fixtures.bulkSession[0]({browser}, async session=>assert(session.snapshot.origins.length));
  }
  try {
    process.env.PW_LIVE_ORIGINAL_READONLY='YES';process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_15';process.env.PW_BASE_URL=origin;
    // No actual backoff delays during synthetic testing; verify requested delay.
    globalThis.setTimeout=(fn, ms, ...args)=>{assert.equal(ms, 5000);return realTimeout(fn,0,...args)};
    await run([{token:true,status:200,delay:4}]); assert.equal(logins,1); assert(reads>=7); assert.equal(closed,1);
    await run([{token:true,status:200}],1); assert.equal(logins,1);assert.equal(dashboards,1);
    await run([{status:503},{token:true,status:200}]); assert.equal(logins,2); assert.equal(closed,2);
    for(const status of [400,401,403,429]) { await assert.rejects(run([{status}]), new RegExp('HTTP '+status));assert.equal(logins,1);assert.equal(closed,1); }
    for (const plan of [{status:200},{status:200,token:true,expiry:5},{token:true,status:200,wrongPage:true}]) {
      await assert.rejects(run([plan,plan]), /both isolated attempts/);assert.equal(logins,2);assert.equal(closed,2);
    }
    console.log('PASS B234 auth fixture: 10 synthetic recovery/rejection cases; actual guard blocks unapproved mutations in every context.');
  } finally {
    globalThis.setTimeout=realTimeout;
    for(const k of keys) if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];
  }
}
