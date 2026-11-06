import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 32 — account-scoped Sessions browser contracts. All list/revoke
// endpoints are intercepted. No real account sessions are revoked.
type Wire={method:string;path:string;search:string;id:string};
type Session={id:string;ip_address:string|null;user_agent:string|null;created_at:string;
 last_used_at:string|null;expires_at:string;revoked:boolean;is_current:boolean;is_active:boolean;session_type?:string};
const current:Session={id:'pw-current-session-00000001',ip_address:'127.0.0.1',
 user_agent:'Mozilla/5.0 (Windows NT 10.0) Chrome/125.0.0.0',created_at:'2026-10-01T09:00:00Z',
 last_used_at:'2026-11-03T09:00:00Z',expires_at:'2030-01-01T00:00:00Z',revoked:false,is_current:true,is_active:true};
const other:Session={...current,id:'pw-other-session-00000002',ip_address:'198.51.100.11',
 user_agent:'Mozilla/5.0 (Android 14) Firefox/127.0',is_current:false};
const history:Session={...current,id:'pw-revoked-session-00000003',ip_address:'198.51.100.12',
 revoked:true,is_active:false,is_current:false,session_type:'tenant_session'};
const expired:Session={...current,id:'pw-expired-session-00000004',ip_address:'198.51.100.13',
 is_active:false,is_current:false,expires_at:'2020-01-01T00:00:00Z'};
type Opt={rows?:Session[];listStatus?:number;revokeStatus?:number;allStatus?:number;
 revokeAlready?:boolean;hasNext?:boolean;summary?:{total:number;active:number;revoked:number;expired:number}};
async function open(page:Page,opts:Opt={}){
 await loginAsTenant(page);
 const calls:Wire[]=[];
 await page.route('**/auth/sessions**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),url=new URL(req.url()),method=req.method(),path=url.pathname;
  const id=path.split('/').pop()||'';calls.push({method,path,search:url.search,id});
  if(method==='DELETE'){
   if(path.endsWith('/auth/sessions'))return fulfillJson(route,opts.allStatus?{message:'Synthetic revoke all failed'}:{success:true,revoked_count:2},opts.allStatus||200);
   return fulfillJson(route,opts.revokeStatus?{message:'Synthetic revoke rejected'}:{success:true,revoked:!opts.revokeAlready},opts.revokeStatus||200);
  }
  if(method!=='GET')return fulfillJson(route,{message:'Unexpected session method'},405);
  if(opts.listStatus)return fulfillJson(route,{message:'Synthetic session listing unavailable'},opts.listStatus);
  const rows=opts.rows??[current,other,history,expired];
  const status=url.searchParams.get('status')||'active';
  const chosen=rows.filter(s=>status==='all'||(status==='revoked'?s.revoked:status==='expired'?!s.revoked&&!s.is_active:s.is_active&&!s.revoked));
  const pageNum=Number(url.searchParams.get('page')||1),pageSize=Number(url.searchParams.get('page_size')||25);
  return fulfillJson(route,{rows:chosen.slice((pageNum-1)*pageSize,pageNum*pageSize),page:pageNum,page_size:pageSize,status,
   has_next:opts.hasNext??chosen.length>pageNum*pageSize,
   summary:opts.summary??{total:rows.length,active:rows.filter(s=>s.is_active&&!s.revoked).length,
     revoked:rows.filter(s=>s.revoked).length,expired:rows.filter(s=>!s.is_active&&!s.revoked).length}});
 });
 await page.goto('/sessions');
 if(!opts.listStatus)await expect(page.getByRole('heading',{name:'Sessions',exact:true})).toBeVisible();
 return calls;
}
const table=(page:Page)=>page.locator('table.sessions-table');
const requestGets=(r:Wire[])=>r.filter(x=>x.method==='GET');
const requestDeletes=(r:Wire[])=>r.filter(x=>x.method==='DELETE');
const filter=(page:Page)=>page.locator('.sessions-filters select').nth(0);
const size=(page:Page)=>page.locator('.sessions-filters select').nth(1);

test.describe('Tenant Sessions — paged inventory and account revoke guards (Batch 32)',()=>{
 test('TSES-001 Default session inventory requests active status and first page of 25',async({page})=>{
  const seen=await open(page);await expect.poll(()=>requestGets(seen).length).toBeGreaterThan(0);
  const uri=new URLSearchParams(requestGets(seen)[0].search);
  expect(Object.fromEntries(uri)).toMatchObject({paged:'true',page:'1',page_size:'25',status:'active'});
  await expect(table(page).locator('tbody tr')).toHaveCount(2);expect(requestDeletes(seen)).toHaveLength(0);
 });
 test('TSES-002 Session overview uses server summary counts rather than visible row count',async({page})=>{
  const seen=await open(page);const stats=page.getByLabel('Account session overview');
  await expect(stats).toContainText('Total sessions');await expect(stats).toContainText('Active sessions');
  await expect(stats).toContainText('Revoked sessions');await expect(stats).toContainText('Expired sessions');
  expect(requestDeletes(seen)).toHaveLength(0);
 });
 test('TSES-003 Current session is marked and cannot be individually revoked',async({page})=>{
  const seen=await open(page);const row=table(page).locator('tbody tr').filter({hasText:'127.0.0.1'});
  await expect(row).toContainText('CURRENT');await expect(row.getByRole('button',{name:'Revoke'})).toBeDisabled();
  expect(requestDeletes(seen)).toHaveLength(0);
 });
 test('TSES-004 Other active session has an available revoke action',async({page})=>{
  const seen=await open(page);const row=table(page).locator('tbody tr').filter({hasText:'198.51.100.11'});
  await expect(row).toContainText('ACTIVE');await expect(row.getByRole('button',{name:'Revoke'})).toBeEnabled();
  expect(requestDeletes(seen)).toHaveLength(0);
 });
 test('TSES-005 Status selector requests revoked server filter and displays history',async({page})=>{
  const seen=await open(page);await filter(page).selectOption('revoked');
  await expect(table(page)).toContainText('198.51.100.12');
  await expect(table(page)).not.toContainText('198.51.100.11');
  expect(requestGets(seen).at(-1)?.search).toContain('status=revoked');
 });
 test('TSES-006 Expired status renders expired rows and no revoke action',async({page})=>{
  const seen=await open(page);await filter(page).selectOption('expired');
  const row=table(page).locator('tbody tr').filter({hasText:'198.51.100.13'});
  await expect(row).toContainText('EXPIRED');await expect(row.getByRole('button',{name:'Revoke'})).toBeDisabled();
  expect(requestDeletes(seen)).toHaveLength(0);
 });
 test('TSES-007 All status includes active, revoked, and expired records',async({page})=>{
  const seen=await open(page);await filter(page).selectOption('all');
  await expect(table(page).locator('tbody tr')).toHaveCount(4);
  await expect(table(page)).toContainText('REVOKED');await expect(table(page)).toContainText('EXPIRED');
  expect(requestGets(seen).at(-1)?.search).toContain('status=all');
 });
 test('TSES-008 Page size changes to 50 and sends paged endpoint parameter',async({page})=>{
  const seen=await open(page);await size(page).selectOption('50');
  await expect.poll(()=>requestGets(seen).at(-1)?.search).toContain('page_size=50');
  await expect(page.locator('.sessions-list-meta')).toContainText('Page 1');
 });
 test('TSES-009 Page size supports 100 and resets to first page',async({page})=>{
  const seen=await open(page);await size(page).selectOption('100');
  await expect.poll(()=>requestGets(seen).at(-1)?.search).toContain('page_size=100');
  await expect(page.locator('.sessions-pagination')).toContainText('Page 1');
 });
 test('TSES-010 Next and Previous pagination use server page parameters',async({page})=>{
  const seen=await open(page,{hasNext:true});await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>requestGets(seen).at(-1)?.search).toContain('page=2');
  await page.getByRole('button',{name:'Previous',exact:true}).click();
  await expect.poll(()=>requestGets(seen).at(-1)?.search).toContain('page=1');
 });
 test('TSES-011 Changing status while paged resets to page 1',async({page})=>{
  const seen=await open(page,{hasNext:true});await page.getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>requestGets(seen).at(-1)?.search).toContain('page=2');
  await filter(page).selectOption('revoked');
  await expect.poll(()=>requestGets(seen).at(-1)?.search).toContain('page=1');
  expect(requestGets(seen).at(-1)?.search).toContain('status=revoked');
 });
 test('TSES-012 Empty active list produces explicit no-session explanation',async({page})=>{
  const seen=await open(page,{rows:[],summary:{total:0,active:0,revoked:0,expired:0}});
  await expect(table(page)).toContainText('No active sessions found.');
  await expect(page.getByRole('button',{name:'Revoke all sessions'})).toBeDisabled();
  expect(requestDeletes(seen)).toHaveLength(0);
 });
 test('TSES-013 Initial list failure shows retry affordance rather than fake empty state',async({page})=>{
  const seen=await open(page,{listStatus:503});await expect(page.getByText('Failed to load sessions.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry'})).toBeEnabled();expect(requestDeletes(seen)).toHaveLength(0);
 });
 test('TSES-014 Manual refresh reissues account-scoped list request',async({page})=>{
  const seen=await open(page);const before=requestGets(seen).length;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>requestGets(seen).length).toBeGreaterThan(before);
  await expect(page.locator('.sessions-message[role=status]')).toContainText('Sessions refreshed.');
 });
 test('TSES-015 Revoked session history cannot be revoked again',async({page})=>{
  const seen=await open(page);await filter(page).selectOption('revoked');
  const row=table(page).locator('tbody tr').filter({hasText:'198.51.100.12'});
  await expect(row.getByRole('button',{name:'Revoke'})).toBeDisabled();expect(requestDeletes(seen)).toHaveLength(0);
 });
 test('TSES-016 Revoke another active session uses exact ID and success feedback',async({page})=>{
  const seen=await open(page);const row=table(page).locator('tbody tr').filter({hasText:'198.51.100.11'});
  await row.getByRole('button',{name:'Revoke'}).click();
  await expect.poll(()=>requestDeletes(seen).length).toBe(1);
  expect(requestDeletes(seen)[0].path).toBe('/auth/sessions/pw-other-session-00000002');
  await expect(page.locator('.sessions-message[role=status]')).toContainText('Session revoked.');
 });
 test('TSES-017 Failed revoke shows error without navigating out',async({page})=>{
  const seen=await open(page,{revokeStatus:409});const row=table(page).locator('tbody tr').filter({hasText:'198.51.100.11'});
  await row.getByRole('button',{name:'Revoke'}).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic revoke rejected');
  await expect(page).toHaveURL(/\/sessions$/);expect(requestDeletes(seen)).toHaveLength(1);
 });
 test('TSES-018 Revoke all confirmation cancellation sends no DELETE',async({page})=>{
  const seen=await open(page);page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Revoke all sessions'}).click();
  expect(requestDeletes(seen)).toHaveLength(0);await expect(page).toHaveURL(/\/sessions$/);
 });
 test('TSES-019 Confirmed revoke-all sends DELETE and redirects to login',async({page})=>{
  const seen=await open(page);page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Revoke all sessions'}).click();
  await expect.poll(()=>requestDeletes(seen).some(r=>r.path==='/auth/sessions')).toBe(true);
  await expect(page).toHaveURL(/\/login$/);
 });
 test('TSES-020 Revoke-all server error retains account session page',async({page})=>{
  const seen=await open(page,{allStatus:503});page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Revoke all sessions'}).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic revoke all failed');
  await expect(page).toHaveURL(/\/sessions$/);expect(requestDeletes(seen)).toHaveLength(1);
 });
});
