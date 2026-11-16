import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {ensureB236Target} from '../support/b236TargetRecovery.mjs';
const ts=createRequire(import.meta.url)('typescript'),plan=JSON.parse(fs.readFileSync('batch-236-review.json'));
// Execute each actual transpiled setup against a synthetic page/route harness:
// confirms target before mocks, document fallback, representative fixture GET
// and write contracts with NO network, browser credentials, or test-pass credit.
const fixtures=[
 ['execution-tasks/execution-tasks.spec.ts','openTasks',{},'/execution-tasks','/execution-tasks/options','/execution-tasks',201],
 ['execution-requests/execution-requests.spec.ts','openRequests',{},'/execution-requests','/execution-requests/options','/execution-requests',201],
 ['inventory-requisitions/inventory-requisitions.spec.ts','openRequisitions',{},'/inventory-requisitions','/inventory-requisitions/options',null,null],
 ['inventory-requisitions/inventory-requisitions.spec.ts','setupReq',{},'/inventory-requisitions','/inventory-requisitions/options',null,null],
 ['inventory-capabilities/inventory-capabilities.spec.ts','openCapabilities',{},'/inventory-capabilities','/inventory-capabilities/overview',null,null],
 ['inventory-capabilities/inventory-capabilities-workflows.spec.ts','load',{},'/inventory-capabilities','/inventory-capabilities/overview',null,null],
 ['inventory-capabilities/inventory-capabilities-advanced.spec.ts','load',{stockUnavailable:true},'/inventory-capabilities','/stock',null,null]
];
for(const [file,helper,opts,target,get,post,postStatus] of fixtures){
 const src=fs.readFileSync('tests/tenant/'+file,'utf8'),exports={},routes=[];
 let opened=false;
 const test=()=>{};test.describe=()=>{};test.beforeEach=()=>{};
 vm.runInNewContext(ts.transpileModule(src+'\nexport {'+helper+'};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,URL,URLSearchParams,require(n){
   if(n.endsWith('liveOriginalSafeTest')||n==='@playwright/test')return {test,expect:()=>({toBeVisible:async()=>{}})};
   if(n.endsWith('tenantSession'))return {loginAsTenant:async()=>{throw Error('unrelated dashboard');},fulfillJson:async(r,data,status=200)=>r.response={data,status}};
   if(n.endsWith('b236TargetSession'))return {openB236Target:async(_p,r)=>{assert.equal(r,target);opened=true;}};
   if(n.endsWith('roleSession'))return {loginAsDisposableRole:async()=>{throw Error('unexpected role');}};
   throw Error(n);
  }
 });
 const loc={first:()=>loc,waitFor:async()=>{},locator:()=>loc};
 const page={evaluate:async()=> 'synthetic-offline-user',route:async(p,fn)=>{assert(opened);routes.unshift([p,fn]);},goto:async p=>assert(p.startsWith(target)),getByRole:()=>loc,getByText:()=>loc,locator:()=>loc};
 await exports[helper](page,opts);assert(opened&&routes.length);
 const request=async(method,path,nav=false)=>{
  const url='https://api.example.invalid'+path;
  const route={request:()=>({method:()=>method,url:()=>url,isNavigationRequest:()=>nav,postDataJSON:()=>({title:'fixture'}),headers:()=>({})}),fallback:async()=>{route.fell=true;},fulfill:async o=>{route.response={status:o.status,data:o.body};}};
  for(const [pattern,fn] of routes){
   const regex=new RegExp('^'+pattern.replace(/[.+?^$()${}|\[\]\\]/g,'\\$&').replaceAll('**','§').replaceAll('*','[^/]*').replaceAll('§','.*')+'$');
   if(!regex.test(url))continue;
   route.fell=false;await fn(route);if(!route.fell)return route.response;
  }
  return undefined;
 };
 assert.equal(await request('GET',target,true),undefined,'document must never be mocked');
 assert.equal((await request('GET',get))?.status,opts.stockUnavailable?503:200,file+' fixture GET');
 if(post)assert.equal((await request('POST',post))?.status,postStatus,file+' fixture POST');
 console.log('PASS B236 actual fixture '+file+' '+helper);
}
// Target authentication recovery: real page marker required; 429 stops and
// login redirect alone permits exactly one renewal.
for(const [route,mode,expected] of [['/execution-tasks','ok',true],['/execution-requests','login',true],['/inventory-requisitions','missing',false],['/inventory-capabilities','429',false]]){
 let url='about:blank',attempt=0,renewed=0,stopped=0;
 const page={url:()=>url,on(){},off(){},goto:async()=>{attempt++;url='https://hotel-inventory-frontend-mauve.vercel.app'+(mode==='login'&&attempt===1?'/login':route);return {status:()=>mode==='429'?429:200};},getByRole:()=>marker,getByText:()=>marker};
 const marker={first:()=>marker,waitFor:async()=>{if(mode==='missing'||(mode==='login'&&attempt===1))throw Error('missing marker');}};
 if(expected)await ensureB236Target(page,route,async()=>{renewed++;},()=>{stopped++;});
 else await assert.rejects(ensureB236Target(page,route,async()=>{renewed++;},()=>{stopped++;}));
 assert.equal(renewed,mode==='login'?1:0);assert.equal(stopped,mode==='429'?1:0);
}
assert.equal(plan.count,150);
console.log('PASS B236: 7 representative fixture helpers and 4 genuine-target recovery scenarios (offline simulation).');
