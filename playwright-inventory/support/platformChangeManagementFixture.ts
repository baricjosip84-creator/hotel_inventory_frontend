/** Batch 69 — synthetic-only Platform Change Management transport.
 * Intercepted HTTP responses, never proof of real authorization, DB transactions,
 * external change execution, audit evidence, or deployment outcomes. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const CHANGE_TENANT_A = '11111111-1111-4111-8111-111111111111';
export const CHANGE_TENANT_B = '22222222-2222-4222-8222-222222222222';
export const CHANGE_WINDOW_PLATFORM = '33333333-3333-4333-8333-333333333333';
export const CHANGE_WINDOW_TENANT = '44444444-4444-4444-8444-444444444444';
export const CHANGE_RUNBOOK = '55555555-5555-4555-8555-555555555555';
export const CHANGE_DRAFT = '66666666-6666-4666-8666-666666666666';
export const CHANGE_PENDING = '77777777-7777-4777-8777-777777777777';
export const CHANGE_APPROVED = '88888888-8888-4888-8888-888888888888';
export const CHANGE_EXECUTED = '99999999-9999-4999-8999-999999999998';
export const CHANGE_REJECTED = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
export const CHANGE_CANCELLED = 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
export const changePermissions = [
  'platform.dashboard.read', 'platform.changes.read', 'platform.changes.write',
  'platform.changes.approve', 'platform.changes.execute', 'platform.tenants.read',
  'platform.maintenance.read', 'platform.runbooks.read', 'platform.users.read',
  'platform.audit.read', 'platform.releases.read'
];
export const changeSeed = [
  { id: CHANGE_DRAFT, title: 'Fixture network update', description: 'Synthetic maintenance plan', category: 'maintenance', risk_level: 'low', status: 'draft', tenant_id: CHANGE_TENANT_A, tenant_name: 'Fixture Hotel', maintenance_window_id: CHANGE_WINDOW_TENANT, maintenance_window_title: 'Hotel window', runbook_id: CHANGE_RUNBOOK, runbook_title: 'Fixture recovery', requested_by_email: 'requester@fixture.test', planned_start_at: '2026-11-05T08:00:00Z', planned_end_at: '2026-11-05T09:00:00Z', created_at: '2026-11-04T08:00:00Z' },
  { id: CHANGE_PENDING, title: 'Fixture access review', description: null, category: 'security', risk_level: 'high', status: 'pending_approval', tenant_id: null, tenant_name: null, requested_by_email: 'requester@fixture.test', created_at: '2026-11-04T07:00:00Z' },
  { id: CHANGE_APPROVED, title: 'Fixture approved cutover', description: 'Synthetic approved window', category: 'migration', risk_level: 'critical', status: 'approved', tenant_id: CHANGE_TENANT_B, tenant_name: 'Fixture Warehouse', requested_by_email: 'requester@fixture.test', approval_reason: 'Fixture authorization', created_at: '2026-11-04T06:00:00Z' },
  { id: CHANGE_EXECUTED, title: 'Fixture historical release', description: null, category: 'operational', risk_level: 'medium', status: 'executed', execution_notes: 'Recorded only', tenant_id: null, created_at: '2026-11-03T06:00:00Z' },
  { id: CHANGE_REJECTED, title: 'Fixture rejected request', description: null, category: 'billing', risk_level: 'high', status: 'rejected', rejection_reason: 'Insufficient evidence', tenant_id: null, created_at: '2026-11-02T06:00:00Z' },
  { id: CHANGE_CANCELLED, title: 'Fixture cancelled request', description: null, category: 'support', risk_level: 'low', status: 'cancelled', cancellation_reason: 'Withdrawn', tenant_id: null, created_at: '2026-11-01T06:00:00Z' }
];
export type ChangeRow = typeof changeSeed[number] & Record<string, any>;
export function syntheticChangeRows(count: number): ChangeRow[] {
  return Array.from({length:count},(_,i)=>({ ...changeSeed[0], id:`${String(i+1).padStart(8,'0')}-1111-4111-8111-${String(i+1).padStart(12,'0')}`,title:`Fixture change ${String(i+1).padStart(3,'0')}`,tenant_id:null,tenant_name:null,maintenance_window_id:null,runbook_id:null }));
}
export type ChangeReply = { status?: number; json: any };
export type ChangeFixtureOptions = {
  query?: string; permissions?: string[]; rows?: ChangeRow[]; summary?: Record<string,unknown>;
  access?: {tenant:boolean;maintenance:boolean;runbook:boolean;platform_user_identity:boolean};
  responses?: Record<string,ChangeReply>;
  respond?: (method:string,path:string,query:URLSearchParams,body:any)=>ChangeReply|undefined;
  asyncRespond?: (method:string,path:string,query:URLSearchParams,body:any)=>Promise<ChangeReply|undefined>;
  onCall?: (method:string,path:string,query:URLSearchParams,body:any)=>void;
  expectHeading?: boolean;
};
export async function openPlatformChanges(page:Page,opts:ChangeFixtureOptions={}) {
  targetBaseURL();
  const permissions=opts.permissions??changePermissions;
  const rows:ChangeRow[]=(opts.rows??changeSeed).map(r=>({...r}));
  const evidence=opts.access??{
    tenant:permissions.includes('platform.tenants.read'),
    maintenance:permissions.includes('platform.maintenance.read'),
    runbook:permissions.includes('platform.runbooks.read'),
    platform_user_identity:permissions.includes('platform.users.read')
  };
  await page.addInitScript(token=>{
    localStorage.setItem('inventory_platform_access_token',token);
    localStorage.setItem('inventory_locale','en-GB');
  },syntheticJwt());
  await page.route('**/platform/**',async(route:Route)=>{
    const request=route.request(); if(request.isNavigationRequest())return route.continue();
    const url=new URL(request.url());
    const path=url.pathname.replace(/^\/api(?=\/)/,'');
    const method=request.method(), query=url.searchParams;
    let body:any=null;try{body=request.postDataJSON();}catch{body=request.postData()??null;}
    opts.onCall?.(method,path,query,body);
    if(path==='/platform/auth/refresh')return fulfillJson(route,{message:'Synthetic refresh denied'},401);
    if(path==='/platform/auth/me')return fulfillJson(route,{id:SYNTHETIC_PLATFORM_USER_ID,email:'change-fixture@example.test',role:'superadmin',is_active:true});
    if(path==='/platform/permissions/me')return fulfillJson(route,{platform_user_id:SYNTHETIC_PLATFORM_USER_ID,role:'superadmin',permissions});
    const replacement=(await opts.asyncRespond?.(method,path,query,body))??opts.respond?.(method,path,query,body)??opts.responses?.[`${method} ${path}`];
    if(replacement)return fulfillJson(route,replacement.json,replacement.status??200);
    if(method==='GET'&&path==='/platform/tenants')return fulfillJson(route,[{id:CHANGE_TENANT_A,name:'Fixture Hotel'},{id:CHANGE_TENANT_B,name:'Fixture Warehouse'}]);
    if(method==='GET'&&path==='/platform/maintenance')return fulfillJson(route,{windows:[
      {id:CHANGE_WINDOW_PLATFORM,title:'Global window',scope:'platform',status:'scheduled'},
      {id:CHANGE_WINDOW_TENANT,title:'Hotel window',scope:'tenant',tenant_id:CHANGE_TENANT_A,status:'active'},
      {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:'Past window',scope:'platform',status:'completed'}
    ]});
    if(method==='GET'&&path==='/platform/runbooks')return fulfillJson(route,{runbooks:[{id:CHANGE_RUNBOOK,title:'Fixture recovery',is_active:true}]});
    if(method==='GET'&&path==='/platform/change-management/summary')return fulfillJson(route,opts.summary??{
      pending_approval:1,open_high_risk:2,
      by_status:[{status:'draft',count:1},{status:'pending_approval',count:1},{status:'approved',count:1},{status:'executed',count:1},{status:'rejected',count:1},{status:'cancelled',count:1}],
      open_by_risk:[{risk_level:'low',count:1},{risk_level:'high',count:1},{risk_level:'critical',count:1}]
    });
    if(method==='GET'&&path==='/platform/change-management'){
      const matching=rows.filter(r=>
        (!query.get('status')||r.status===query.get('status'))&&
        (!query.get('category')||r.category===query.get('category'))&&
        (!query.get('risk_level')||r.risk_level===query.get('risk_level'))&&
        (!query.get('tenant_id')||r.tenant_id===query.get('tenant_id'))&&
        (!query.get('search')||`${r.title} ${r.description??''}`.toLowerCase().includes(query.get('search')!.toLowerCase()))
      );
      const limit=Number(query.get('limit')??50),offset=Number(query.get('offset')??0);
      return fulfillJson(route,{change_requests:matching.slice(offset,offset+limit),evidence_access:evidence,pagination:{limit,offset,has_more:offset+limit<matching.length}});
    }
    if(method==='POST'&&path==='/platform/change-management'){
      const state=body?.submit_for_approval||['high','critical'].includes(body?.risk_level)?'pending_approval':'draft';
      const row={...changeSeed[0],...body,id:'ccccccc1-cccc-4ccc-8ccc-ccccccccccc1',status:state,created_at:new Date('2026-11-04T08:00:00Z').toISOString()};
      rows.unshift(row);return fulfillJson(route,row,201);
    }
    if(method==='PATCH'&&/^\/platform\/change-management\/[^/]+$/.test(path)){
      const id=path.split('/').at(-1),row=rows.find(r=>r.id===id);
      if(!row)return fulfillJson(route,{message:'Fixture change missing'},404);
      Object.assign(row,{...body,status:body?.submit_for_approval?'pending_approval':row.status});
      return fulfillJson(route,row);
    }
    if(method==='POST'&&/^\/platform\/change-management\/[^/]+\/(approve|reject|cancel|execute)$/.test(path)){
      const [action,id]=[path.split('/').at(-1),path.split('/').at(-2)];
      const row=rows.find(r=>r.id===id);if(!row)return fulfillJson(route,{message:'Fixture change missing'},404);
      row.status=action==='approve'?'approved':action==='reject'?'rejected':action==='execute'?'executed':'cancelled';
      Object.assign(row,action==='execute'?{execution_notes:body?.notes}:{[action==='approve'?'approval_reason':action==='reject'?'rejection_reason':'cancellation_reason']:body?.reason});
      return fulfillJson(route,row);
    }
    return fulfillJson(route,[]);
  });
  await page.goto(`/platform/change-management${opts.query?'?'+opts.query:''}`);
  if(opts.expectHeading!==false)await expect(page.getByRole('heading',{name:'Change management',exact:true})).toBeVisible();
}
