import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 33 — isolated browser contracts. All session API requests are intercepted.
// Session-account authorization, token revocation, and DB persistence need separate Phase 2 checks.
type Session = { id:string; ip_address:string|null; user_agent:string|null; created_at:string;
  last_used_at:string|null; expires_at:string; revoked:boolean; is_current:boolean; is_active:boolean; session_type?:string };
const makeSession=(index:number, extra:Partial<Session>={}):Session=>({
 id:`pw-session-${String(index).padStart(24,'0')}`,ip_address:`198.51.100.${index+20}`,
 user_agent:'Mozilla/5.0 (Windows NT 10.0) Chrome/125.0.0.0', created_at:'2026-10-01T12:00:00Z',
 last_used_at:'2026-11-03T09:00:00Z',expires_at:'2030-01-01T00:00:00Z',revoked:false,
 is_current:index===0,is_active:true,...extra
});
const defaultRows=[makeSession(0),makeSession(1),makeSession(2)];
type Seen={method:string;path:string;query:string};
type State={rows:Session[];seen:Seen[];getCount:number;deleteCount:number;getErrorAt?:number;
 getErrorStatus?:number;getWait?:Promise<void>;deleteWait?:Promise<void>;deleteStatus?:number;
 deleteAlready?:boolean;page2Empty?:boolean;hasNext?:boolean;deleteError?:string};
async function openSessions(page:Page, overrides:Partial<State>={}){
 await loginAsTenant(page);
 const state:State={rows:defaultRows.map(x=>({...x})),seen:[],getCount:0,deleteCount:0,...overrides};
 await page.route('**/auth/sessions**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const url=new URL(route.request().url());const method=route.request().method();
  state.seen.push({method,path:url.pathname,query:url.search});
  if(method==='DELETE'){
   state.deleteCount++;
   if(state.deleteWait)await state.deleteWait;
   return fulfillJson(route,state.deleteStatus
    ?{message:state.deleteError??'Synthetic session revoke denied'}
    :url.pathname.endsWith('/auth/sessions')?{success:true,revoked_count:2}:{success:true,revoked:!state.deleteAlready},state.deleteStatus??200);
  }
  if(method!=='GET')return fulfillJson(route,{message:'Unexpected method'},405);
  state.getCount++;if(state.getWait)await state.getWait;
  if(state.getErrorAt===state.getCount)return fulfillJson(route,{message:'Synthetic session refresh failure'},state.getErrorStatus??503);
  const status=url.searchParams.get('status')??'active';
  const pageNumber=Number(url.searchParams.get('page')??1);
  const size=Number(url.searchParams.get('page_size')??25);
  const selected=state.rows.filter(s=>status==='all'||(status==='revoked'?s.revoked:status==='expired'?!s.revoked&&!s.is_active:s.is_active&&!s.revoked));
  const rows=state.page2Empty&&pageNumber>1?[]:selected.slice((pageNumber-1)*size,pageNumber*size);
  return fulfillJson(route,{rows,page:pageNumber,page_size:size,status,
   has_next:state.hasNext??selected.length>pageNumber*size,
   summary:{total:state.rows.length,active:state.rows.filter(s=>s.is_active&&!s.revoked).length,
    revoked:state.rows.filter(s=>s.revoked).length,expired:state.rows.filter(s=>!s.is_active&&!s.revoked).length}});
 });
 await page.goto('/sessions');
 await expect(page.getByRole('heading',{name:'Sessions',exact:true})).toBeVisible();
 return state;
}
const sessionsTable=(page:Page)=>page.locator('table.sessions-table');
const rowFor=(page:Page,s:Session)=>sessionsTable(page).locator('tbody tr').filter({has:page.locator(`[title="${s.id}"]`)});
const getCalls=(s:State)=>s.seen.filter(c=>c.method==='GET');
const deletes=(s:State)=>s.seen.filter(c=>c.method==='DELETE');
const statusSelector=(page:Page)=>page.locator('.sessions-filters select').first();
const sizeSelector=(page:Page)=>page.locator('.sessions-filters select').nth(1);
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve};};

test.describe('Tenant Sessions — detailed display, query and account guards (Batch 33)',()=>{
 test('TSES-021 Failed refresh exposes the source-defined error and retry view',async({page})=>{
  const state=await openSessions(page);state.getErrorAt=2;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('Synthetic session refresh failure')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
  expect(deletes(state)).toHaveLength(0);
 });
 test('TSES-022 Refresh is disabled during an outstanding list refetch',async({page})=>{
  const state=await openSessions(page);const gate=deferred();state.getWait=gate.promise;
  try{
   await page.getByRole('button',{name:'Refresh',exact:true}).click();
   await expect(page.getByRole('button',{name:/Refreshing/})).toBeDisabled();
   expect(state.getCount).toBe(2);
  }finally{gate.resolve();}
  await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
 });
 test('TSES-023 Empty non-first server page automatically returns to previous page',async({page})=>{
  const rows=Array.from({length:26},(_,i)=>makeSession(i));const state=await openSessions(page,{rows});
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.sessions-list-meta')).toContainText('Page 2');
  state.page2Empty=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.locator('.sessions-list-meta')).toContainText('Page 1');
  expect(getCalls(state).some(c=>c.query.includes('page=2'))).toBe(true);
 });
 test('TSES-024 Changing page size on page two sends first page and new size',async({page})=>{
  const state=await openSessions(page,{rows:Array.from({length:28},(_,i)=>makeSession(i))});
  await page.getByRole('button',{name:'Next'}).click();await expect(page.locator('.sessions-list-meta')).toContainText('Page 2');
  await sizeSelector(page).selectOption('50');
  await expect.poll(()=>getCalls(state).at(-1)?.query).toContain('page_size=50');
  expect(getCalls(state).at(-1)?.query).toContain('page=1');
 });
 test('TSES-025 Server has_next false disables Next but keeps rows visible',async({page})=>{
  const state=await openSessions(page,{hasNext:false});
  await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
  await expect(sessionsTable(page).locator('tbody tr')).toHaveCount(3);
  expect(deletes(state)).toHaveLength(0);
 });
 test('TSES-026 Missing IP address is labeled Unknown network',async({page})=>{
  const s=makeSession(1,{ip_address:null});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s)).toContainText('Unknown network');
 });
 test('TSES-027 IPv6 loopback is reported as proxy or local with original address',async({page})=>{
  const s=makeSession(1,{ip_address:'::1'});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s)).toContainText('Proxy / local');
  await expect(rowFor(page,s)).toContainText('Reported ::1');
 });
 test('TSES-028 Opera user-agent identifies browser version and Windows OS',async({page})=>{
  const s=makeSession(1,{user_agent:'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0.0.0 OPR/115.0'});
  await openSessions(page,{rows:[s]});await expect(rowFor(page,s)).toContainText('Opera 115.0');
  await expect(rowFor(page,s)).toContainText('Windows');
 });
 test('TSES-029 Hover device cell retains the raw user-agent signature in title',async({page})=>{
  const ua='Mozilla/5.0 (Android 14) Firefox/127.0';const s=makeSession(1,{user_agent:ua});
  await openSessions(page,{rows:[s]});await expect(rowFor(page,s).locator('.sessions-device-cell')).toHaveAttribute('title',ua);
 });
 test('TSES-030 Long session IDs display shortened identifier but retain exact title',async({page})=>{
  const s=makeSession(1,{id:'pw-very-long-disposable-session-id-for-display'});await openSessions(page,{rows:[s]});
  const el=rowFor(page,s).locator(`[title="${s.id}"]`);
  await expect(el).toContainText(`${s.id.slice(0,8)}…${s.id.slice(-8)}`);
 });
 test('TSES-031 Invalid creation timestamp remains raw text instead of crashing',async({page})=>{
  const s=makeSession(1,{created_at:'not-a-date'});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s)).toContainText('not-a-date');
 });
 test('TSES-032 Empty last-used timestamp displays em dash',async({page})=>{
  const s=makeSession(1,{last_used_at:null});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('td').nth(4)).toHaveText('—');
 });
 test('TSES-033 Explicit server inactive flag controls expired badge regardless of future expiry',async({page})=>{
  const s=makeSession(1,{is_active:false,expires_at:'2030-01-01T00:00:00Z'});await openSessions(page,{rows:[s]});
  await statusSelector(page).selectOption('expired');
  await expect(rowFor(page,s)).toContainText('EXPIRED');
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toBeDisabled();
 });
 test('TSES-034 Revoked badge wins over expired timestamp',async({page})=>{
  const s=makeSession(1,{revoked:true,is_active:false,expires_at:'2020-01-01T00:00:00Z'});
  await openSessions(page,{rows:[s]});await statusSelector(page).selectOption('all');
  await expect(rowFor(page,s).locator('.sessions-badge').first()).toHaveText('REVOKED');
 });
 test('TSES-035 Already inactive revoke response has distinct message',async({page})=>{
  const s=makeSession(1);const state=await openSessions(page,{rows:[s],deleteAlready:true});
  await rowFor(page,s).getByRole('button',{name:'Revoke'}).click();
  await expect(page.locator('.sessions-message[role=status]')).toContainText('already inactive or unavailable');
  expect(deletes(state)).toHaveLength(1);
 });
 test('TSES-036 Pending individual revoke disables all revoke actions until response',async({page})=>{
  const state=await openSessions(page);const gate=deferred();state.deleteWait=gate.promise;
  try{
   await rowFor(page,defaultRows[1]).getByRole('button',{name:'Revoke'}).click();
   await expect(rowFor(page,defaultRows[2]).getByRole('button',{name:'Revoke'})).toBeDisabled();
   await expect(rowFor(page,defaultRows[1]).getByRole('button',{name:/Revoking/})).toBeDisabled();
  }finally{gate.resolve();}
  await expect(page.locator('.sessions-message[role=status]')).toContainText('Session revoked.');
 });
 test('TSES-037 Pending revoke-all disables its button and individual row actions',async({page})=>{
  const state=await openSessions(page);const gate=deferred();state.deleteWait=gate.promise;
  try{
   page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Revoke all sessions'}).click();
   await expect(page.getByRole('button',{name:'Revoke all sessions'})).toBeDisabled();
   await expect(rowFor(page,defaultRows[1]).getByRole('button',{name:'Revoke'})).toBeDisabled();
  }finally{gate.resolve();}
  await expect(page).toHaveURL(/\/login$/);
 });
 test('TSES-038 Failed revoke retains session identifier for an operator retry',async({page})=>{
  const s=makeSession(1);const state=await openSessions(page,{rows:[s],deleteStatus:503});
  await rowFor(page,s).getByRole('button',{name:'Revoke'}).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic session revoke denied');
  state.deleteStatus=undefined;
  await rowFor(page,s).getByRole('button',{name:'Revoke'}).click();
  await expect.poll(()=>deletes(state).length).toBe(2);
  expect(deletes(state).every(call=>call.path.endsWith(s.id))).toBe(true);
 });
 test('TSES-039 Revoke-all native confirmation warns that current browser will sign out',async({page})=>{
  const state=await openSessions(page);let prompt='';
  page.once('dialog',async d=>{prompt=d.message();await d.dismiss();});
  await page.getByRole('button',{name:'Revoke all sessions'}).click();
  expect(prompt).toContain('including this browser');expect(prompt).toContain('return you to login');
  expect(deletes(state)).toHaveLength(0);
 });
 test('TSES-040 Cancel revoke-all keeps credentials and allows normal page navigation',async({page})=>{
  const state=await openSessions(page);const before=await page.evaluate(()=>localStorage.getItem('inventory_access_token'));
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Revoke all sessions'}).click();
  await expect(page).toHaveURL(/\/sessions$/);
  expect(await page.evaluate(()=>localStorage.getItem('inventory_access_token'))).toBe(before);
  await page.goto('/dashboard');await expect(page).toHaveURL(/\/dashboard$/);expect(deletes(state)).toHaveLength(0);
 });
 test('TSES-041 Successful revoke-all does not refetch sessions before going to login',async({page})=>{
  const state=await openSessions(page);const before=state.getCount;
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Revoke all sessions'}).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(state.getCount).toBe(before);expect(deletes(state)).toHaveLength(1);
 });
 test('TSES-042 Rate-limited revoke-all retains token and displays server error',async({page})=>{
  const state=await openSessions(page,{deleteStatus:429,deleteError:'Too many revoke requests'});
  const before=await page.evaluate(()=>localStorage.getItem('inventory_access_token'));
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Revoke all sessions'}).click();
  await expect(page.getByRole('alert')).toContainText('Too many revoke requests');
  expect(await page.evaluate(()=>localStorage.getItem('inventory_access_token'))).toBe(before);
  expect(deletes(state)).toHaveLength(1);
 });
 test('TSES-043 Pending status fetch temporarily disables filters and displays selected results',async({page})=>{
  const state=await openSessions(page,{rows:[makeSession(0),makeSession(1,{revoked:true,is_active:false})]});
  const gate=deferred();state.getWait=gate.promise;
  try{
   await statusSelector(page).selectOption('revoked');
   await expect(statusSelector(page)).toBeDisabled();
   await expect(sizeSelector(page)).toBeDisabled();
  }finally{gate.resolve();}
  await expect(sessionsTable(page)).toContainText('REVOKED');
  expect(getCalls(state).at(-1)?.query).toContain('status=revoked');
 });
 test('TSES-044 CURRENT badge comes solely from returned is_current value',async({page})=>{
  const first=makeSession(0,{is_current:false});const second=makeSession(1,{is_current:true});
  await openSessions(page,{rows:[first,second]});
  await expect(rowFor(page,second)).toContainText('CURRENT');
  await expect(rowFor(page,first)).not.toContainText('CURRENT');
 });
 test('TSES-045 Unfamiliar underscore-separated session type becomes readable badge',async({page})=>{
  const s=makeSession(1,{session_type:'external_device_session'});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s)).toContainText('External Device Session');
 });
 test('TSES-046 HTML-looking user agent renders inert text, not an HTML element',async({page})=>{
  const s=makeSession(1,{user_agent:'<img src=x onerror=alert(1)>'});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('img')).toHaveCount(0);
  await expect(rowFor(page,s).locator('.sessions-device-cell')).toHaveAttribute('title',s.user_agent!);
 });
 test('TSES-047 Client-recognized support session hides revoke actions and shows platform guidance',async({page})=>{
  const state=await openSessions(page);
  // Disposable browser-only claim; this does not create or authenticate an actual platform support session.
  const claim={typ:'support_session',exp:Math.floor(Date.now()/1000)+3600,tenant_id:'pw-disposable-tenant',role:'admin'};
  const payload=Buffer.from(JSON.stringify(claim)).toString('base64url');
  await page.evaluate((jwt)=>localStorage.setItem('inventory_access_token',jwt),`e30.${payload}.synthetic`);
  await page.reload();await expect(page.getByText('Platform support access is read-only here.')).toBeVisible();
  await expect(sessionsTable(page).getByRole('button',{name:'Revoke'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Revoke all sessions'})).toHaveCount(0);
  expect(deletes(state)).toHaveLength(0);
 });
 test('TSES-048 Zero active sessions shows attention state and disables revoke-all',async({page})=>{
  const state=await openSessions(page,{rows:[]});
  await expect(page.getByText('NO ACTIVE SESSIONS')).toBeVisible();
  await expect(page.getByRole('button',{name:'Revoke all sessions'})).toBeDisabled();
  await expect(page.getByText('Current browser is not yet tracked.')).toBeVisible();
  expect(deletes(state)).toHaveLength(0);
 });
 test('TSES-049 Unauthenticated direct navigation to sessions redirects to login',async({page})=>{
  await page.addInitScript(()=>{localStorage.removeItem('inventory_access_token');localStorage.removeItem('inventory_csrf_token');});
  let revokes=0;
  await page.route('**/auth/sessions**',async r=>{if(r.request().method()==='DELETE')revokes++;await fulfillJson(r,{rows:[]});});
  await page.goto('/sessions');await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  expect(revokes).toBe(0);
 });
 test('TSES-050 Server 403 for requested session ID surfaces denial without success claim',async({page})=>{
  const s=makeSession(1,{id:'pw-foreign-session-do-not-revoke'});
  const state=await openSessions(page,{rows:[s],deleteStatus:403,deleteError:'Session does not belong to your account'});
  await rowFor(page,s).getByRole('button',{name:'Revoke'}).click();
  await expect(page.getByRole('alert')).toContainText('Session does not belong to your account');
  await expect(page.locator('.sessions-message[role=status]')).toHaveCount(0);
  expect(deletes(state)[0].path).toContain(s.id);
 });
});


// Batch 173 — additional source-backed presentation, legacy-state and feedback
// boundaries from frontend/src/pages/SessionsPage.tsx. ALL requests intercepted.
// These browser-only contracts do not establish real token revocation or isolation.
test.describe('Tenant Sessions — device/network and legacy-state source boundaries (Batch 173)',()=>{
 test('TSES-051 Network labels trim surrounding whitespace from a reported address',async({page})=>{
  const s=makeSession(1,{ip_address:' 198.51.100.67 '});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('.sessions-col-network .sessions-row-title')).toHaveText('198.51.100.67');
 });
 test('TSES-052 IPv4-mapped loopback is identified as a proxy and preserves the reported address',async({page})=>{
  const s=makeSession(1,{ip_address:'::ffff:127.0.0.1'});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s)).toContainText('Proxy / local');
  await expect(rowFor(page,s)).toContainText('Reported ::ffff:127.0.0.1');
 });
 test('TSES-053 Whitespace-only network input falls back to Unknown network',async({page})=>{
  const s=makeSession(1,{ip_address:'  \t '});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('.sessions-col-network .sessions-row-title')).toHaveText('Unknown network');
 });
 test('TSES-054 Null browser signature produces Unknown device without a fake title',async({page})=>{
  const s=makeSession(1,{user_agent:null});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('Unknown device');
  await expect(rowFor(page,s).locator('.sessions-device-cell')).not.toHaveAttribute('title',/./);
 });
 test('TSES-055 HeadlessChrome is labelled distinctly from ordinary Chrome',async({page})=>{
  const s=makeSession(1,{user_agent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Chrome/130.0 HeadlessChrome/130.0.3'});
  await openSessions(page,{rows:[s]});await expect(rowFor(page,s)).toContainText('Headless Chrome 130.0.3');
  await expect(rowFor(page,s)).toContainText('macOS');
 });
 test('TSES-056 Edge browser signature takes priority over embedded Chrome token',async({page})=>{
  const s=makeSession(1,{user_agent:'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Edg/130.1'});
  await openSessions(page,{rows:[s]});await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('Edge 130.1');
 });
 test('TSES-057 Safari dotted version is recognized and iOS device label retained',async({page})=>{
  const s=makeSession(1,{user_agent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Safari/605.1'});
  await openSessions(page,{rows:[s]});await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('Safari 17.5');
  await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('iOS');
 });
 test('TSES-058 Playwright automation signature takes priority over Chrome markers',async({page})=>{
  const s=makeSession(1,{user_agent:'Mozilla/5.0 (Windows NT 10.0) Chrome/128.0 Playwright/1.50.2'});
  await openSessions(page,{rows:[s]});await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('Playwright 1.50.2');
  await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('automation on Windows');
 });
 test('TSES-059 Firefox on Linux keeps the browser version and OS in the summary',async({page})=>{
  const s=makeSession(1,{user_agent:'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/129.1'});
  await openSessions(page,{rows:[s]});await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('Firefox 129.1');
  await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('Linux');
 });
 test('TSES-060 Unrecognized browser signature falls back to Browser on Unknown OS',async({page})=>{
  const s=makeSession(1,{user_agent:'SyntheticDevice/3.0'});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('.sessions-device-cell')).toContainText('Browser on Unknown OS');
 });
 test('TSES-061 Omitted session type does not invent a third status badge',async({page})=>{
  const s=makeSession(1);await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('.sessions-badge')).toHaveCount(1);
 });
 test('TSES-062 Tenant session type is rendered as Tenant Session rather than a raw key',async({page})=>{
  const s=makeSession(1,{session_type:'tenant_session'});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s)).toContainText('Tenant Session');
 });
 test('TSES-063 Support session type label does not itself grant support-session privileges',async({page})=>{
  const s=makeSession(1,{session_type:'support_session'});const state=await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s)).toContainText('Support session');
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toBeEnabled();
  expect(deletes(state)).toHaveLength(0);
 });
 test('TSES-064 Empty creation timestamp is represented by an em dash',async({page})=>{
  const s=makeSession(1,{created_at:''});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('td').nth(3)).toHaveText('—');
 });
 test('TSES-065 Malformed expiry date remains literal text for operator inspection',async({page})=>{
  const s=makeSession(1,{expires_at:'synthetic-invalid-expiry'});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator('td').nth(5)).toHaveText('synthetic-invalid-expiry');
 });
 test('TSES-066 Legacy missing is_active uses past expiry timestamp to disable revoke',async({page})=>{
  const s=makeSession(1,{is_active:undefined,expires_at:'2000-01-01T00:00:00Z'});
  await openSessions(page,{rows:[s]});await statusSelector(page).selectOption('all');
  await expect(rowFor(page,s)).toContainText('EXPIRED');
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toBeDisabled();
 });
 test('TSES-067 Legacy missing is_active with future expiry remains revocable',async({page})=>{
  const s=makeSession(1,{is_active:undefined,expires_at:'2099-01-01T00:00:00Z'});
  await openSessions(page,{rows:[s]});await statusSelector(page).selectOption('all');
  await expect(rowFor(page,s)).toContainText('ACTIVE');
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toBeEnabled();
 });
 test('TSES-068 Session ID of exactly eighteen characters is not shortened',async({page})=>{
  const id='tenant-session-001';expect(id).toHaveLength(18);
  const s=makeSession(1,{id});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).locator(`[title="${id}"]`)).toContainText(`Session ${id}`);
 });
 test('TSES-069 Current browser revoke control explains why individual revocation is forbidden',async({page})=>{
  const s=makeSession(1,{is_current:true});await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toBeDisabled();
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toHaveAttribute('title',/Use Revoke all sessions/);
 });
 test('TSES-070 Expired row explains why revocation is unnecessary',async({page})=>{
  const s=makeSession(1,{is_active:false});await openSessions(page,{rows:[s]});
  await statusSelector(page).selectOption('expired');
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toHaveAttribute('title','Expired sessions no longer need revocation.');
 });
 test('TSES-071 Revoked row offers a distinct already-revoked explanation',async({page})=>{
  const s=makeSession(1,{revoked:true,is_active:false});await openSessions(page,{rows:[s]});
  await statusSelector(page).selectOption('revoked');
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toHaveAttribute('title','Session is already revoked.');
 });
 test('TSES-072 Other active session explains the available revoke action',async({page})=>{
  const s=makeSession(1);await openSessions(page,{rows:[s]});
  await expect(rowFor(page,s).getByRole('button',{name:'Revoke'})).toHaveAttribute('title','Revoke this active session.');
 });
 test('TSES-073 Empty revoked view provides history guidance, not the active-list message',async({page})=>{
  await openSessions(page,{rows:[]});await statusSelector(page).selectOption('revoked');
  await expect(sessionsTable(page)).toContainText('No revoked sessions found.');
  await expect(sessionsTable(page)).toContainText('Choose another status to review the retained session history.');
 });
 test('TSES-074 Revoked filter updates the inventory status badge independently of row count',async({page})=>{
  await openSessions(page,{rows:[makeSession(1,{revoked:true,is_active:false})]});
  await statusSelector(page).selectOption('revoked');
  await expect(page.locator('.sessions-panel .sessions-badge').first()).toHaveText('REVOKED SESSIONS');
 });
 test('TSES-075 Changing the status clears prior refresh success feedback',async({page})=>{
  await openSessions(page);await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.locator('.sessions-message[role=status]')).toContainText('Sessions refreshed.');
  await statusSelector(page).selectOption('revoked');
  await expect(page.locator('.sessions-message[role=status]')).toHaveCount(0);
 });
 test('TSES-076 Changing the page size clears stale success feedback',async({page})=>{
  await openSessions(page);await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.locator('.sessions-message[role=status]')).toContainText('Sessions refreshed.');
  await sizeSelector(page).selectOption('50');
  await expect(page.locator('.sessions-message[role=status]')).toHaveCount(0);
 });
 test('TSES-077 Last partially filled page reports correct visible row range',async({page})=>{
  const rows=Array.from({length:26},(_,i)=>makeSession(i));await openSessions(page,{rows});
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.sessions-list-meta')).toContainText('Showing 26–26');
  await expect(sessionsTable(page).locator('tbody tr')).toHaveCount(1);
 });
});
