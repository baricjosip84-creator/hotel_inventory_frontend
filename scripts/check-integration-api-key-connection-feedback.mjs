#!/usr/bin/env node
// Run the actual TypeScript mutation handlers against a deterministic API stub.
// Prevents generic-toast regressions without calling a live tenant or exposing real keys.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const page = readFileSync(new URL('../src/pages/InventoryCapabilitiesPage.tsx', import.meta.url), 'utf8');
const loc = readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');
const source = ts.createSourceFile('InventoryCapabilitiesPage.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let n=0;
const ck=(condition, message)=>{assert.ok(condition,message);n++;};
ck(source.parseDiagnostics.length===0, 'Integration panel syntax parses');
const mutants=new Map();
const walk=(node)=>{if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer && ts.isCallExpression(node.initializer)&&node.initializer.expression.getText(source)==='useMutation')mutants.set(node.name.text,node.initializer.getText(source));ts.forEachChild(node,walk)};
walk(source);
const texts=[
'API key created. Copy it now; it cannot be shown again.',
'API key settings saved.',
'API key rotated. Copy the replacement now; the previous key is no longer valid.',
'API key revoked. Systems using that key can no longer authenticate.',
'Connection registered.', 'Connection changes saved.', 'Connection disabled.', 'Connection enabled.',
'Webhook disabled.', 'Webhook enabled.'
];
for(const key of texts){ck(loc.includes(JSON.stringify(key)),`all-locales source row exists: ${key}`);const line=loc.split('\n').find(x=>x.includes(JSON.stringify(key)));ck(Boolean(line)&&line.split('"').length>=10,`localized in 5 languages: ${key}`);}
ck(page.includes('{apiClientMessage ? <div className="form-success">{apiClientMessage}</div> : null}'),'API results displayed in API card');
ck(page.includes('{connectionMessage ? <div className="form-success">{connectionMessage}</div> : null}'),'Connection results displayed in connection card');
ck(page.includes('{connectionError ? <div className="form-error">{connectionError}</div> : null}'),'Connection errors displayed within connection card');
ck(page.includes('{webhookActionError ? <div className="form-error">{webhookActionError}</div> : null}'),'Webhook errors displayed within webhook card');
ck(page.includes('saveConnection.mutate(Boolean(editingConnection))'),'Connection edit mode captured at submission');
ck(page.includes('{apiScopes.length === 0 ? <p'),'Zero-scope explanation shown in creation and editing');
const requests=[];const state={};
const context={
  useMutation:(x)=>x,
  apiRequest:async (...args)=>{requests.push(args);return {api_key:'FAKE_TEST_ONLY',id:'key-001'};},
  ui:(s)=>s,
  messageFrom:(err,fallback)=>err?.message || fallback,
  name:'Review API', description:'test',apiScopes:['products:read'],apiExpiresAt:'',apiAllowedIps:'',
  editingApiClient:{id:'key-001',version:7}, editingConnection:{id:'connection-001',version:9},
  systemName:'Review ERP',systemType:'custom',baseUrl:'',direction:'bidirectional',credentialReference:'',
  toApiExpiry:()=>null, toLocalDateTimeInput:()=>'',
  clearApiClientForm:()=>{state.clearedApi=true;},clearConnectionForm:()=>{state.clearedConnection=true;},
  setApiClientMessage:(v)=>{state.apiMessage=v;},setConnectionMessage:(v)=>{state.connectionMessage=v;},setWebhookMessage:(v)=>{state.webhookMessage=v;},
  setConnectionError:(v)=>{state.connectionError=v;},setWebhookActionError:(v)=>{state.webhookError=v;},
  setRevealedKey:(v)=>{state.revealedKey=v;}, setName:(v)=>{state.name=v;},setDescription:()=>{},setApiScopes:()=>{},setApiExpiresAt:()=>{},setApiAllowedIps:()=>{},
  setError:(v)=>{state.error=v;},revealedKey:{clientId:'key-001',value:'FAKE_OLD'},
  qc:{invalidateQueries:()=>Promise.resolve()},
  setWebhookRows:()=>{},setWebhookNextCursor:()=>{}
};
const evaluate=(name)=>{
 ck(mutants.has(name),`${name} mutation found`);
 const expr=mutants.get(name);
 const transpiled=ts.transpileModule(`const subject = ${expr};\nsubject;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 return vm.runInNewContext(transpiled.outputText,{...context});
};
const cases=[
 ['createClient',undefined,'/inventory-capabilities/api-clients','POST',texts[0],{api_key:'FAKE_TEST_ONLY',id:'key-001'}],
 ['updateClient',undefined,'/inventory-capabilities/api-clients/key-001','PATCH',texts[1],{}],
 ['rotateClient',{id:'key-001',version:7},'/inventory-capabilities/api-clients/key-001/rotate','POST',texts[2],{api_key:'FAKE_TEST_ONLY',id:'key-001'}],
 ['revokeClient',{id:'key-001',version:7},'/inventory-capabilities/api-clients/key-001/revoke','POST',texts[3],{}],
 ['saveConnection',false,'/inventory-capabilities/connections','POST',texts[4],{}],
 ['saveConnection',true,'/inventory-capabilities/connections','POST',texts[5],{}],
 ['changeConnectionStatus',{row:{id:'connection-001',version:9,system_name:'Review ERP',system_type:'custom',direction:'bidirectional',status:'configured'},status:'disabled'},'/inventory-capabilities/connections','POST',texts[6],{}],
 ['changeConnectionStatus',{row:{id:'connection-001',version:9,system_name:'Review ERP',system_type:'custom',direction:'bidirectional',status:'disabled'},status:'configured'},'/inventory-capabilities/connections','POST',texts[7],{}],
 ['changeWebhookStatus',{row:{id:'hook-001',version:11},status:'disabled'},'/inventory-capabilities/webhooks/hook-001','PATCH',texts[8],{}],
 ['changeWebhookStatus',{row:{id:'hook-001',version:11},status:'configured'},'/inventory-capabilities/webhooks/hook-001','PATCH',texts[9],{}]
];
for(const [name,input,endpoint,method,message,response] of cases){
 const mutation=evaluate(name);requests.length=0;state.apiMessage='stale';state.connectionMessage='stale';state.webhookMessage='stale';
 if(mutation.onMutate)mutation.onMutate(input);
 await mutation.mutationFn(input);
 ck(requests.length===1,`${name} performs one network request`);
 ck(requests[0][0]===endpoint,`${name} target endpoint intact`);
 ck(requests[0][1]?.method===method,`${name} HTTP method intact`);
 ck(requests[0][1]?.skipMutationFeedback===true,`${name} suppresses misleading generic toast`);
 mutation.onSuccess(response,input);
 const observed = name==='changeWebhookStatus'?'webhookMessage':name.includes('Connection')?'connectionMessage':'apiMessage';
 ck(state[observed]===message,`${name} action-specific feedback`);
 if(name==='saveConnection') ck(JSON.parse(requests[0][1].body).expected_version===(input?9:0),'save connection optimistic lock preserved');
 if(name==='rotateClient'||name==='createClient') ck(state.revealedKey?.value==='FAKE_TEST_ONLY','one-time replacement key remains shown');
 if(name==='revokeClient') ck(state.revealedKey===null,'revoke does not leave a displayed revoked key');
 if(mutation.onError && (name==='saveConnection'||name==='changeConnectionStatus'||name==='changeWebhookStatus')) {
   mutation.onError(new Error('Mock offline rejection'),input);
   ck((name==='changeWebhookStatus'?state.webhookError:state.connectionError)?.includes('Mock offline rejection'), `${name} error is shown beside the attempted action`);
 }
}
console.log(`API key, connection and webhook-status action feedback: ${n}/${n} passed`);
