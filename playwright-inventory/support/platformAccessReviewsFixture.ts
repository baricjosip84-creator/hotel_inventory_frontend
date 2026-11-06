/** Batch 82 — source-traced synthetic Platform Access Reviews fixture. GENERATED_UNRUN.
 * These mocked UI calls do not prove backend access removal, real authorization, SQL snapshot durability or audit delivery. */
import {expect,type Page,type Route} from '@playwright/test';
import {targetBaseURL} from './environment';
import {fulfillJson} from './tenantSession';
import {syntheticJwt,SYNTHETIC_PLATFORM_USER_ID} from './platformSession';

export const reviewId='a8200000-0000-4000-8000-000000000001';
export const completedId='a8200000-0000-4000-8000-000000000002';
export const cancelledId='a8200000-0000-4000-8000-000000000003';
export const userItemId='a8300000-0000-4000-8000-000000000001';
export const keyItemId='a8300000-0000-4000-8000-000000000002';
export const webhookItemId='a8300000-0000-4000-8000-000000000003';
export const supportItemId='a8300000-0000-4000-8000-000000000004';
export const reviewPermissions=['platform.dashboard.read','platform.access_reviews.read','platform.access_reviews.write',
 'platform.users.read','platform.tenants.read','platform.api_keys.read','platform.webhooks.read','platform.support_sessions.read','platform.audit.read'];
export const scopes=['platform_users','tenant_support','api_keys','webhooks','mixed'];
export const statuses=['open','completed','cancelled'];
export const decisions=['approved','needs_change','revoked','not_applicable'];
export const baseReview={id:reviewId,title:'Fixture Privileged Access Review',scope:'mixed',status:'open',
 due_at:'2035-01-10T00:00:00.000Z',notes:'Review fixture notes',metadata:{evidence_snapshot:{available_sources:scopes.slice(0,4),omitted_sources:[]}},
 created_at:'2026-11-01T12:00:00Z',created_by_email:'review-creator@fixture.test',completed_by_email:null,cancelled_by_email:null,
 item_count:4,pending_count:2,needs_change_count:1,revoked_count:0};
export const doneReview={...baseReview,id:completedId,title:'Fixture Completed Review',scope:'platform_users',status:'completed',pending_count:0};
export const stoppedReview={...baseReview,id:cancelledId,title:'Fixture Cancelled Review',scope:'webhooks',status:'cancelled',pending_count:0};
export const fixtureItems=[
 {id:userItemId,item_type:'platform_user',source:'platform_users',label:'review-user@fixture.test (security)',tenant_name:null,status:'pending',
  decision_note:null,decided_by_email:null,decided_at:null,metadata:{role:'security',mfa_enabled:true}},
 {id:keyItemId,item_type:'api_key',source:'api_keys',label:'Fixture tenant API key',tenant_name:'Fixture Alpha',status:'pending',
  decision_note:null,decided_by_email:null,decided_at:null,metadata:{scopes:['inventory:read'],risk:'normal'}},
 {id:webhookItemId,item_type:'webhook',source:'webhooks',label:'Fixture tenant webhook',tenant_name:'Fixture Beta',status:'needs_change',
  decision_note:'Review webhook endpoint',decided_by_email:'reviewer@fixture.test',decided_at:'2026-11-02T09:00:00Z',metadata:{event_types:['product.updated'],risk:'review'}},
 {id:supportItemId,item_type:'support_policy',source:'tenant_support',label:'Fixture support policy',tenant_name:'Fixture Alpha',status:'approved',
  decision_note:'Approved policy',decided_by_email:'reviewer@fixture.test',decided_at:'2026-11-02T09:10:00Z',metadata:{require_ticket_reference:true}}
];
export type FixtureReview=typeof baseReview&Record<string,any>;
export type FixtureItem=typeof fixtureItems[number]&Record<string,any>;
export const manyReviews=(n:number):FixtureReview[]=>Array.from({length:n},(_,i)=>({...baseReview,
 id:`${String(i+1).padStart(8,'0')}-0000-4000-8000-${String(i+1).padStart(12,'0')}`,
 title:`Fixture Review ${String(i+1).padStart(3,'0')}`}));
export type AccessReviewsOptions={query?:string;permissions?:string[];rows?:FixtureReview[];items?:FixtureItem[];
 responses?:Record<string,{status?:number;json:any}>;
 respond?:(method:string,path:string,q:URLSearchParams,body:any)=>{status?:number;json:any}|undefined|Promise<{status?:number;json:any}|undefined>;
 onCall?:(method:string,path:string,q:URLSearchParams,body:any)=>void;expectHeading?:boolean};

export async function openAccessReviews(page:Page,opts:AccessReviewsOptions={}){
 targetBaseURL();const permissions=opts.permissions??reviewPermissions;
 let records:FixtureReview[]=(opts.rows??[baseReview,doneReview,stoppedReview]).map(x=>({...x}));
 const items:FixtureItem[]=(opts.items??fixtureItems).map(x=>({...x}));
 const access={platform_users:permissions.includes('platform.users.read'),tenant_support:permissions.includes('platform.tenants.read'),
  api_keys:permissions.includes('platform.api_keys.read'),webhooks:permissions.includes('platform.webhooks.read'),
  platform_user_identity:permissions.includes('platform.users.read')};
 const redactReview=(r:FixtureReview)=>({...r,...(!access.platform_user_identity?{created_by_email:null,completed_by_email:null,cancelled_by_email:null}:{})});
 const sourceFor=(item:FixtureItem)=>item.source||({platform_user:'platform_users',support_policy:'tenant_support',api_key:'api_keys',webhook:'webhooks'} as Record<string,string>)[item.item_type];
 const redactItem=(item:FixtureItem)=>{const source=sourceFor(item);return {...item,source,source_available:Boolean((access as Record<string,boolean>)[source]),
  ...(!(access as Record<string,boolean>)[source]?{label:`Restricted ${source.replaceAll('_',' ')} evidence`,tenant_name:null,metadata:{},decision_note:null}:{}),
  ...(!access.platform_user_identity?{decided_by_email:null}:{})};};
 const detailFor=(r:FixtureReview)=>{
  const requested=r.scope==='mixed'?scopes.slice(0,4):[r.scope];
  return {review:redactReview(r),items:items.map(redactItem),available_sources:requested.filter(s=>(access as Record<string,boolean>)[s]),
   omitted_sources:requested.filter(s=>!(access as Record<string,boolean>)[s]),evidence_access:access};
 };
 await page.addInitScript(token=>{localStorage.setItem('inventory_platform_access_token',token);localStorage.setItem('inventory_locale','en-GB');},syntheticJwt());
 await page.route('**/platform/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname.replace(/^\/api(?=\/)/,''),q=u.searchParams,method=req.method();
  let body:any={};try{body=req.postDataJSON()??{};}catch{body={};}
  opts.onCall?.(method,path,q,body);
  if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh denied'},401);
  if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'review-operator@fixture.test',role:'superadmin',is_active:true});
  if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
  const override=(await opts.respond?.(method,path,q,body))??opts.responses?.[`${method} ${path}`];
  if(override)return fulfillJson(route,override.json,override.status??200);
  const root='/platform/access-reviews';
  if(method==='GET'&&path===root){const limit=Number(q.get('limit')||50),offset=Number(q.get('offset')||0),term=(q.get('search')||'').toLowerCase();
   const matched=records.filter(r=>(!q.get('status')||r.status===q.get('status'))&&(!q.get('scope')||r.scope===q.get('scope'))
    &&(!term||`${r.title} ${r.notes||''}`.toLowerCase().includes(term)));
   return fulfillJson(route,{reviews:matched.slice(offset,offset+limit).map(redactReview),scopes,statuses,item_statuses:['pending',...decisions],
    pagination:{limit,offset,total:matched.length,has_more:offset+limit<matched.length},
    summary:{total:matched.length,open:matched.filter(r=>r.status==='open').length,completed:matched.filter(r=>r.status==='completed').length,
     cancelled:matched.filter(r=>r.status==='cancelled').length,overdue:0},
    evidence_access:access,evidence_contract:{snapshot_is_application_evidence:true,source_records_are_captured_at_review_creation:true,
     decisions_are_internal_governance_records:true,approval_does_not_prove_external_access_removed_or_authorized:true}});
  }
  if(method==='POST'&&path===root){const r={...baseReview,...body,id:'a8200000-0000-4000-8000-000000000099',status:'open',
    item_count:items.length,pending_count:items.filter(i=>i.status==='pending').length};records=[r,...records];return fulfillJson(route,detailFor(r),201);}
  const detail=path.match(/^\/platform\/access-reviews\/([^/]+)$/);
  if(method==='GET'&&detail){const r=records.find(x=>x.id===detail[1]);return r?fulfillJson(route,detailFor(r)):fulfillJson(route,{message:'Not found'},404);}
  const decide=path.match(/^\/platform\/access-reviews\/([^/]+)\/items\/([^/]+)\/decision$/);
  if(method==='POST'&&decide){const i=items.findIndex(x=>x.id===decide[2]);if(i<0)return fulfillJson(route,{message:'Not found'},404);
   items[i]={...items[i],status:body.status,decision_note:body.decision_note,decided_by_email:'review-operator@fixture.test',decided_at:'2026-11-05T12:00:00Z'};
   const r=records.find(x=>x.id===decide[1]);if(r)r.pending_count=items.filter(x=>x.status==='pending').length;
   return fulfillJson(route,redactItem(items[i]));}
  const action=path.match(/^\/platform\/access-reviews\/([^/]+)\/(complete|cancel)$/);
  if(method==='POST'&&action){const r=records.find(x=>x.id===action[1]);if(!r)return fulfillJson(route,{message:'Not found'},404);
   r.status=action[2]==='complete'?'completed':'cancelled';return fulfillJson(route,redactReview(r));}
  return fulfillJson(route,[]);
 });
 await page.goto(`/platform/access-reviews${opts.query?'?'+opts.query:''}`);
 if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Access reviews',exact:true})).toBeVisible();
}
