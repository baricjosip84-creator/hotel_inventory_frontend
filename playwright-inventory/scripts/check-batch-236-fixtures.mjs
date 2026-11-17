import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {createRequire,Module} from 'node:module';
import {ensureB236Target} from '../support/b236TargetRecovery.mjs';
import {startBroker} from './b235-session-broker.mjs';
const ts=createRequire(import.meta.url)('typescript'),plan=JSON.parse(fs.readFileSync('batch-236-review.json'));
// Use the real compiled client, real private socket, and actual prepared worker
// fixture together. Merely mocking the client missed the group-17 gate.
const require=createRequire(import.meta.url);
const compile=(filename,resolve)=>{
 const out=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert.equal(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 const m=new Module(filename);m.require=resolve;m._compile(out.outputText,filename);return m.exports;
};
const envKeys=['PW_ORIGINAL_SUITE_GROUP','PW_B235_SESSION_SOCKET','PW_LIVE_ORIGINAL_READONLY','PW_BASE_URL'];
const saved=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
// Local sandbox may prohibit Unix socket listeners. Explicit offline mode
// substitutes only the transport, never the real client/group validation.
// GitHub always exercises the actual private socket.
const offline=process.env.PW_B236_OFFLINE_BROKER==='YES'&&process.env.GITHUB_ACTIONS!=='true';
let stored=null;
const mockRequest=(options,callback)=>{
 assert.equal(options.socketPath,'synthetic-private-socket');assert.equal(options.path,'/session');
 const req=new EventEmitter();req.setTimeout=()=>req;req.destroy=()=>req.emit('error',Error('destroyed'));
 req.end=body=>queueMicrotask(()=>{
  const res=new EventEmitter();res.setEncoding=()=>{};res.statusCode=200;
  if(options.method==='PUT'){assert.equal(options.headers['Content-Length'],Buffer.byteLength(body));stored=JSON.parse(body);}
  else assert.equal(options.method,'GET');
  callback(res);res.emit('data',JSON.stringify(options.method==='GET'?stored:null));res.emit('end');
 });return req;
};
const exchange=compile('support/b235SessionBroker.ts',id=>offline&&id==='node:http'?{request:mockRequest}:require(id)).exchangeB235Session;
let broker;
try {
 process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_17';delete process.env.PW_B235_SESSION_SOCKET;
 await assert.rejects(exchange(),/Missing private B235 session broker/);
 if(offline)process.env.PW_B235_SESSION_SOCKET='synthetic-private-socket';
 else {broker=await startBroker();process.env.PW_B235_SESSION_SOCKET=broker.socketPath;assert.equal(fs.statSync(broker.socketPath).mode&0o777,0o600);}
 const origin='https://hotel-inventory-frontend-mauve.vercel.app';
 process.env.PW_BASE_URL=origin;process.env.PW_LIVE_ORIGINAL_READONLY='YES';
 const snapshot={cookies:[],origins:[{origin,localStorage:[{name:'inventory_access_token',value:'synthetic.'+Buffer.from(JSON.stringify({exp:Date.now()/1000+3600})).toString('base64url')+'.synthetic'}]}]};
 const state={snapshot,lastLoginAt:Date.now()};
 assert.equal(await exchange(),null);await exchange(state);assert.deepEqual(await exchange(),state);
 process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_16';assert.deepEqual(await exchange(),state);
 for(const group of ['BULK_SAFE_15','BULK_SAFE_18','DISCOVER_ALL','']){
  process.env.PW_ORIGINAL_SUITE_GROUP=group;await assert.rejects(exchange(),/Wrong session group/);
 }
 process.env.PW_ORIGINAL_SUITE_GROUP='BULK_SAFE_17';
 const fixture=compile('support/liveOriginalSafeTest.ts',id=>{
  if(id==='@playwright/test')return {test:{extend:f=>f},expect:()=>{}};
  if(id==='./environment')return {requireDisposableTenantCredentials:()=>({email:'fixture@example.invalid',password:'fake'})};
  if(id==='node:fs')return {existsSync:()=>false,readFileSync:()=>'',writeFileSync:()=>{}};
  if(id==='./b235SessionBroker')return {exchangeB235Session:exchange};
  return require(id);
 }).test.bulkSession[0];
 for(let worker=0;worker<2;worker++)await fixture({browser:{newContext:async()=>{throw Error('Unexpected login');}}},async session=>assert.deepEqual(session.snapshot,snapshot));
 assert.deepEqual(await exchange(),state);
 console.log('PASS B236 real private session client and replacement-worker reuse ('+(offline?'synthetic transport':'actual private socket')+'); group 16 preserved and unrelated groups rejected.');
}finally{
 try{if(broker){await broker.close();assert(!fs.existsSync(broker.socketPath));}}
 finally{for(const k of envKeys)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}
}
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
 ['inventory-capabilities/inventory-capabilities-advanced.spec.ts','load',{stockUnavailable:true},'/inventory-capabilities','/stock',null,null],
 ['execution-requests/execution-requests.spec.ts','openRequests',{replyByPath:{'/execution-requests/options':{products:[]}}},'/execution-requests','/execution-requests/options',null,null,{products:[]}],
 ['inventory-capabilities/inventory-capabilities-workflows.spec.ts','load',{failGet:'/webhook-events'},'/inventory-capabilities','/inventory-capabilities/webhook-events',null,null,{error:{code:'FIXTURE_UNAVAILABLE',message:'Fixture request unavailable'}},503],
 ['inventory-capabilities/inventory-capabilities-workflows.spec.ts','load',{failAction:'/test'},'/inventory-capabilities','/inventory-capabilities/overview','/inventory-capabilities/webhooks/fixture/test',409,null,200,{error:{code:'VERSION_CONFLICT',message:'Fixture request rejected'}}],
 ['inventory-capabilities/inventory-capabilities-workflows.spec.ts','load',{failGet:'webhooks-cursor-invalid'},'/inventory-capabilities','/inventory-capabilities/webhooks?cursor=expired',null,null,{error:{code:'WEBHOOK_CURSOR_INVALID',message:'Invalid cursor'}},400],
 ['inventory-capabilities/inventory-capabilities.spec.ts','openCapabilities',{failCreateClient:true},'/inventory-capabilities','/inventory-capabilities/overview','/inventory-capabilities/api-clients',409,null,200,{error:{code:'API_CLIENT_ALREADY_EXISTS',message:'Fixture duplicate key'}}]
];
for(const [file,helper,opts,target,get,post,postStatus,getBody,getStatus,postBody] of fixtures){
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
 const got=await request('GET',get);assert.equal(got?.status,getStatus??(opts.stockUnavailable?503:200),file+' fixture GET');
 if(getBody)assert.equal(JSON.stringify(got.data),JSON.stringify(getBody),file+' fixture GET payload');
 if(post){const sent=await request('POST',post);assert.equal(sent?.status,postStatus,file+' fixture POST');if(postBody)assert.equal(JSON.stringify(sent.data),JSON.stringify(postBody),file+' fixture POST error envelope');}
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
console.log('PASS B236 R2: 12 representative fixture contracts and 4 genuine-target recovery scenarios (offline simulation).');
