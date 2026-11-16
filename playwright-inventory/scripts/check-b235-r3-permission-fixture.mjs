import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const test=()=>{};test.describe=()=>{};test.beforeEach=()=>{};
const expect=()=>({toBeVisible:async()=>{}});
for(const [file,setup] of [['tenant-permissions.spec.ts','openPermissions'],['tenant-permissions-lifecycle.spec.ts','setup']]){
 const source=fs.readFileSync('tests/tenant/tenant-permissions/'+file,'utf8');
 const js=ts.transpileModule(source+'\nexport { '+setup+' };',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};let handler;
 vm.runInNewContext(js,{exports,require(name){
  if(name.endsWith('liveOriginalSafeTest'))return {test,expect};
  if(name.endsWith('tenantSession'))return {loginAsTenant:async()=>{},fulfillJson:async(route,data,status=200)=>{route.response={data,status};}};
  throw Error('Unexpected import '+name);
 },URL});
 const page={route:async(_pattern,fn)=>{handler=fn;},goto:async()=>{},getByRole:()=>({})};
 const state=await exports[setup](page);
 async function call(method,path,data=null,type='fetch'){
  const route={request:()=>({url:()=>new URL(path,'https://example.invalid').href,method:()=>method,isNavigationRequest:()=>type==='document',resourceType:()=>type,postData:()=>data&&JSON.stringify(data),postDataJSON:()=>data}),fallback:async()=>{route.fellBack=true;}};
  await handler(route);return route;
 }
 const auth=await call('GET','/permissions/me');assert(auth.fellBack&&!auth.response);assert.equal(state.calls.length,0);
 const doc=await call('GET','/permissions',null,'document');assert(doc.fellBack&&!doc.response);
 const get=await call('GET','/permissions');assert.equal(get.response.status,200);assert.equal(get.response.data.roles.length,4);
 assert.equal(state.calls.length,1);
 const custom='/permissions/custom-roles/11111111-1111-4111-8111-111111111111';
 if(setup==='setup'){
  const patched=await call('PATCH',custom,{name:'Renamed Clerk',description:'Updated',is_active:false});
  assert.equal(patched.response.data.display_name,'Renamed Clerk');assert.equal(patched.response.data.description,'Updated');assert.equal(patched.response.data.is_active,false);assert.equal(patched.response.data.version,3);
  const updated=await call('PUT',custom+'/permissions',{permissions:['dashboard.read']});assert.equal(updated.response.data.override_count,1);
  const reset=await call('DELETE',custom+'/permissions');assert.equal(reset.response.data.override_count,0);
 }
 const invalid=await call('POST','/permissions/unreviewed');assert.equal(invalid.response.status,405);assert(!invalid.fellBack);
}
console.log('PASS R3 actual transpiled permission fixtures: genuine access GET, document fallback, matrix GET, revisioned metadata/save/reset and unexpected write rejection.');
