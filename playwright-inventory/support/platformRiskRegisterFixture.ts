/** Batch 78: synthetic platform Risk Register fixture. GENERATED_UNRUN.
 * Mocked client transport is not proof of backend authorization, risk elimination,
 * tenant isolation, audit records, PostgreSQL transactions, or external acceptance. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const riskIdA='81000000-0000-4000-8000-000000000001';
export const riskIdB='81000000-0000-4000-8000-000000000002';
export const riskIdClosed='81000000-0000-4000-8000-000000000003';
export const riskTenantId='82000000-0000-4000-8000-000000000001';
export const riskOwnerId='83000000-0000-4000-8000-000000000001';
export const riskPermissions=[
 'platform.dashboard.read','platform.risks.read','platform.risks.write','platform.tenants.read',
 'platform.users.read','platform.vendors.read','platform.dependencies.read','platform.incidents.read',
 'platform.releases.read','platform.audit.read'
];
export const riskCategories=['operational','security','billing','vendor','compliance','data','release','support','other'];
export const riskStatuses=['open','monitoring','mitigating','accepted','closed','cancelled'];
export const riskLevels=['low','medium','high','critical'];
export const urgentRisk={
 id:riskIdA,title:'Fixture Billing Exposure',description:'Internal risk observed in fixture',
 tenant_id:riskTenantId,tenant_name:'Fixture Tenant Alpha',tenant_present:true,
 category:'billing',status:'open',likelihood:'critical',impact:'critical',severity_score:16,
 owner_platform_user_id:riskOwnerId,owner_email:'risk-owner@fixture.test',owner_present:true,
 mitigation_plan:'Fixture mitigation procedure',contingency_plan:'Fixture contingency procedure',
 review_due_at:'2020-01-01T09:00:00Z',closed_at:null,
 updated_at:'2026-11-04T09:00:00Z',updated_by_email:'reviewer@fixture.test'
};
export const monitoredRisk={...urgentRisk,id:riskIdB,title:'Fixture Operations Monitoring',
 tenant_id:null,tenant_name:null,tenant_present:false,category:'operational',status:'monitoring',
 likelihood:'low',impact:'low',severity_score:1,owner_platform_user_id:null,owner_email:null,
 owner_present:false,mitigation_plan:null,contingency_plan:null,review_due_at:null};
export const closedRisk={...urgentRisk,id:riskIdClosed,title:'Fixture Closed Registry Risk',
 category:'security',status:'closed',likelihood:'medium',impact:'medium',severity_score:4,
 closed_at:'2026-10-01T10:00:00Z',review_due_at:null};
export type FixtureRisk=typeof urgentRisk&Record<string,any>;
export function manyRisks(n:number):FixtureRisk[]{return Array.from({length:n},(_,i)=>({
  ...urgentRisk,id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
  title:`Fixture Risk ${String(i+1).padStart(3,'0')}`
 }));}
export type RiskOptions={query?:string;permissions?:string[];rows?:FixtureRisk[];
 responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;
 expectHeading?:boolean};
export async function openRisks(page:Page,opts:RiskOptions={}){
 targetBaseURL();const permissions=opts.permissions??riskPermissions;
 let records=(opts.rows??[urgentRisk,monitoredRisk,closedRisk]).map(r=>({...r}));
 const tenants=[{id:riskTenantId,name:'Fixture Tenant Alpha'},
  {id:'82000000-0000-4000-8000-000000000002',name:'Fixture Tenant Beta'}];
 const users=[{id:riskOwnerId,email:'risk-owner@fixture.test',name:'Fixture Owner',is_active:true},
  {id:'83000000-0000-4000-8000-000000000002',email:'inactive-risk-owner@fixture.test',is_active:false}];
 await page.addInitScript(token=>{
  localStorage.setItem('inventory_platform_access_token',token);
  localStorage.setItem('inventory_locale','en-GB');
 },syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const url=new URL(req.url()),path=url.pathname.replace(/^\/api(?=\/)/,''),method=req.method(),q=url.searchParams;
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(method,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh unavailable'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'risk@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const response=(await opts.respond?.(method,path,q,body))??opts.responses?.[`${method} ${path}`];
  if(response)return fulfillJson(route,response.json,response.status??200);
  if(path==='/platform/tenants'&&method==='GET')return fulfillJson(route,tenants);
  if(path==='/platform/users'&&method==='GET')return fulfillJson(route,users);
  if(path==='/platform/risk-register'&&method==='GET'){
   const limit=Number(q.get('limit')??50),offset=Number(q.get('offset')??0),search=(q.get('search')??'').toLowerCase();
   const access={tenant_identity:permissions.includes('platform.tenants.read'),platform_user_identity:permissions.includes('platform.users.read')};
   const now=Date.parse('2026-11-05T08:00:00Z');
   const matched=records.filter(r=>(!q.get('status')||r.status===q.get('status'))
    &&(!q.get('category')||r.category===q.get('category'))
    &&(!q.get('tenant_id')||r.tenant_id===q.get('tenant_id'))
    &&(!q.get('owner_platform_user_id')||r.owner_platform_user_id===q.get('owner_platform_user_id'))
    &&(q.get('due_only')!=='true'||Boolean(r.review_due_at&&Date.parse(r.review_due_at)<=now&&r.status!=='closed'&&r.status!=='cancelled'))
    &&(!search||`${r.title} ${r.description||''} ${r.category} ${r.mitigation_plan||''} ${r.contingency_plan||''} ${access.tenant_identity?r.tenant_name||'':''} ${access.platform_user_identity?r.owner_email||'':''}`.toLowerCase().includes(search)));
   const active=matched.filter(r=>!['closed','cancelled'].includes(r.status));
   const high=active.filter(r=>Number(r.severity_score)>=12);
   const due=active.filter(r=>r.review_due_at&&Date.parse(r.review_due_at)<=now);
   const sanitized=matched.slice(offset,offset+limit).map(r=>({
    ...r,...(!access.tenant_identity?{tenant_id:null,tenant_name:null}:{}),
    ...(!access.platform_user_identity?{owner_platform_user_id:null,owner_email:null,updated_by_email:null}:{}),
    tenant_present:Boolean(r.tenant_id),owner_present:Boolean(r.owner_platform_user_id)
   }));
   return fulfillJson(route,{risks:sanitized,
    summary:{total:matched.length,open:active.length,high_attention:high.length,review_due:due.length,by_status:{},by_category:{}},
    pagination:{limit,offset,total:matched.length,has_more:offset+limit<matched.length},evidence_access:access,
    evidence_contract:{application_registry_only:true,likelihood_and_impact_are_operator_recorded:true,
     severity_score_is_derived_from_recorded_levels:true,status_is_application_workflow_state:true,
     accepted_status_does_not_prove_external_acceptance:true,closed_status_does_not_prove_external_risk_elimination:true,
     tenant_linkage_is_application_context_only:true},
    categories:riskCategories,statuses:riskStatuses,levels:riskLevels});
  }
  if(path==='/platform/risk-register'&&method==='POST'){
   const newRisk={...urgentRisk,...body,id:'81000000-0000-4000-8000-000000000099',
    tenant_name:body.tenant_id?'Fixture Tenant Alpha':null,owner_email:body.owner_platform_user_id?'risk-owner@fixture.test':null,
    severity_score:({low:1,medium:2,high:3,critical:4} as Record<string,number>)[body.likelihood??'medium']*
     ({low:1,medium:2,high:3,critical:4} as Record<string,number>)[body.impact??'medium'],
    closed_at:null,updated_at:'2026-11-05T08:00:00Z'};
   records=[newRisk,...records];return fulfillJson(route,{risk:newRisk},201);
  }
  const found=path.match(/^\/platform\/risk-register\/([^/]+)(?:\/(status))?$/);
  if(found){const at=records.findIndex(r=>r.id===found[1]);if(at<0)return fulfillJson(route,{message:'Risk not found'},404);
   if(method==='PATCH'&&!found[2]){
    records[at]={...records[at],...body};return fulfillJson(route,{risk:records[at]});
   }
   if(method==='POST'&&found[2]==='status'){
    records[at]={...records[at],status:body.status,closed_at:['closed','cancelled'].includes(body.status)?'2026-11-05T08:00:00Z':null};
    return fulfillJson(route,{risk:records[at]});
   }
   if(method==='GET')return fulfillJson(route,records[at]);
  }
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/risk-register${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Risk register',exact:true})).toBeVisible();
}
