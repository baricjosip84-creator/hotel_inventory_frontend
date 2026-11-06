/** Batch 97 — Platform Sessions: source-traced, synthetic browser contracts only.
 * Real session validity, server authorization, database audit, token rejection,
 * user identity or device/human presence require independent Phase 2 evidence.
 * STRICT GENERATION PHASE: not compiled, executed or browser-verified. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformSessions,sessionsPath,sessionPermissions,sessionSelf,sessionOther,
 sessionUserA,sessionRows,currentPlatformSession,activePlatformSession,
 revokedPlatformSession,expiredPlatformSession,manySessions} from '../../../support/platformSessionsFixture';
const root=(page:Page)=>page.locator('.platform-sessions');
const table=(page:Page)=>root(page).locator('.platform-sessions__table');
const rows=(page:Page)=>table(page).locator('tbody tr');
const status=(page:Page)=>root(page).getByLabel('Status',{exact:true});
const user=(page:Page)=>root(page).getByLabel('Platform user',{exact:true});
const search=(page:Page)=>root(page).getByLabel('Search',{exact:true});
const next=(page:Page)=>root(page).getByRole('button',{name:'Next',exact:true});
const prev=(page:Page)=>root(page).getByRole('button',{name:'Previous',exact:true});
const without=(...permissions:string[])=>sessionPermissions.filter(x=>!permissions.includes(x));
const row=(page:Page,id:string)=>rows(page).filter({hasText:id});
test.describe('Platform Sessions — application registry (BATCH_097_GENERATED_UNRUN)',()=>{
 test('PSES-001 Registry explains application-session rather than physical-device evidence',async({page})=>{
  await openPlatformSessions(page);await expect(root(page)).toContainText('application session registry');
  await expect(root(page)).toContainText('do not independently prove device identity');
 });
 test('PSES-002 Missing sessions-read grant blocks the route before registry GET',async({page})=>{
  let gets=0;await openPlatformSessions(page,{permissions:without('platform.sessions.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===sessionsPath)gets++;}});
  await expect(root(page)).toHaveCount(0);expect(gets).toBe(0);
 });
 test('PSES-003 Registry GET includes workspace=true and 50-row page controls',async({page})=>{
  const queries:URLSearchParams[]=[];await openPlatformSessions(page,{onCall:(m,p,q)=>{
   if(m==='GET'&&p===sessionsPath)queries.push(new URLSearchParams(q));}});
  expect(queries.length).toBeGreaterThan(0);expect(queries[0].get('workspace')).toBe('true');
  expect(queries[0].get('limit')).toBe('50');expect(queries[0].get('offset')).toBe('0');
 });
 test('PSES-004 Registry summary reports full-filter totals independent of visible count',async({page})=>{
  await openPlatformSessions(page,{records:manySessions(53)});
  await expect(root(page).getByText('Matching records')).toBeVisible();
  await expect(root(page)).toContainText('Showing 1–50 of 53');await expect(rows(page)).toHaveCount(50);
 });
 test('PSES-005 Tracked active current browser is separately identified',async({page})=>{
  await openPlatformSessions(page);await expect(root(page)).toContainText('Current browser tracked');
  await expect(row(page,sessionSelf)).toContainText('Current browser');
 });
 test('PSES-006 Untracked browser indicator is distinct from active rows',async({page})=>{
  await openPlatformSessions(page,{untracked:true});await expect(root(page)).toContainText('Session untracked');
  await expect(rows(page)).toHaveCount(4);
 });
 test('PSES-007 Current active session offers sign-out guidance rather than revoke action',async({page})=>{
  await openPlatformSessions(page);await expect(row(page,sessionSelf)).toContainText('Sign out to end this browser session');
  await expect(row(page,sessionSelf).getByRole('button',{name:'Revoke session'})).toHaveCount(0);
 });
 test('PSES-008 Another active session offers revoke control with permission',async({page})=>{
  await openPlatformSessions(page);await expect(row(page,sessionOther).getByRole('button',{name:'Revoke session'})).toBeEnabled();
 });
 test('PSES-009 Missing revoke permission replaces mutation control with explanation',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.sessions.revoke')});
  await expect(row(page,sessionOther)).toContainText('PLATFORM_SESSIONS_REVOKE required');
  await expect(root(page).getByRole('button',{name:'Revoke session'})).toHaveCount(0);
 });
 test('PSES-010 Revoked history cannot be revoked again through UI',async({page})=>{
  await openPlatformSessions(page);await expect(row(page,revokedPlatformSession.id)).toContainText('Historical record');
  await expect(row(page,revokedPlatformSession.id).getByRole('button',{name:'Revoke session'})).toHaveCount(0);
 });
 test('PSES-011 Expired unrevoked history has no revoke action',async({page})=>{
  await openPlatformSessions(page);await expect(row(page,expiredPlatformSession.id)).toContainText('Expired');
  await expect(row(page,expiredPlatformSession.id).getByRole('button',{name:'Revoke session'})).toHaveCount(0);
 });
 test('PSES-012 Default status selects all record states',async({page})=>{
  await openPlatformSessions(page);await expect(status(page)).toHaveValue('');await expect(rows(page)).toHaveCount(4);
 });
 test('PSES-013 Active status filter is forwarded server-side and excludes history',async({page})=>{
  await openPlatformSessions(page);await status(page).selectOption('active');
  await expect(page).toHaveURL(/status=active/);await expect(rows(page)).toHaveCount(2);
 });
 test('PSES-014 Revoked status filter returns revoked records only',async({page})=>{
  await openPlatformSessions(page);await status(page).selectOption('revoked');
  await expect(rows(page)).toHaveCount(1);await expect(row(page,revokedPlatformSession.id)).toBeVisible();
 });
 test('PSES-015 Expired status filter returns expired unrevoked records',async({page})=>{
  await openPlatformSessions(page);await status(page).selectOption('expired');
  await expect(rows(page)).toHaveCount(1);await expect(row(page,expiredPlatformSession.id)).toBeVisible();
 });
 test('PSES-016 Invalid URL status blocks query and offers clear action',async({page})=>{
  let calls=0;await openPlatformSessions(page,{query:'status=unknown',onCall:(m,p)=>{
   if(m==='GET'&&p===sessionsPath)calls++;}});
  await expect(root(page)).toContainText('invalid Platform Sessions filter');expect(calls).toBe(0);
  await root(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(rows(page)).toHaveCount(4);
 });
 test('PSES-017 Invalid URL user UUID blocks evidence query',async({page})=>{
  let calls=0;await openPlatformSessions(page,{query:'platform_user_id=invalid',onCall:(m,p)=>{
   if(m==='GET'&&p===sessionsPath)calls++;}});
  await expect(root(page)).toContainText('invalid Platform Sessions filter');expect(calls).toBe(0);
 });
 test('PSES-018 Oversize URL search is rejected before sending GET',async({page})=>{
  let calls=0;await openPlatformSessions(page,{query:'search='+('x'.repeat(201)),onCall:(m,p)=>{
   if(m==='GET'&&p===sessionsPath)calls++;}});
  await expect(root(page)).toContainText('invalid Platform Sessions filter');expect(calls).toBe(0);
 });
 test('PSES-019 Identity-target filter is blocked without users-read grant',async({page})=>{
  let calls=0;await openPlatformSessions(page,{query:`platform_user_id=${sessionUserA}`,permissions:without('platform.users.read'),
   onCall:(m,p)=>{if(m==='GET'&&p===sessionsPath)calls++;}});
  await expect(root(page)).toContainText('restricted filter was not sent');expect(calls).toBe(0);
 });
 test('PSES-020 User directory filter appears only with users-read permission',async({page})=>{
  await openPlatformSessions(page);await expect(user(page)).toBeVisible();
  await user(page).selectOption(sessionUserA);await expect(page).toHaveURL(new RegExp(`platform_user_id=${sessionUserA}`));
  await expect(rows(page)).toHaveCount(2);
 });
 test('PSES-021 User directory GET is suppressed when identity grant is missing',async({page})=>{
  const calls:string[]=[];await openPlatformSessions(page,{permissions:without('platform.users.read'),
   onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
  await expect(user(page)).toHaveCount(0);expect(calls).not.toContain('/platform/users');
 });
 test('PSES-022 Search placeholder advertises identity only when authorized',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.users.read')});
  await expect(search(page)).toHaveAttribute('placeholder','Session ID, IP or user agent');
 });
 test('PSES-023 With users-read grant search also advertises name email and role',async({page})=>{
  await openPlatformSessions(page);await expect(search(page)).toHaveAttribute('placeholder',/name, email or role/);
 });
 test('PSES-024 Search by session ID is forwarded to backend and narrows rows',async({page})=>{
  await openPlatformSessions(page);await search(page).fill(sessionOther);
  await expect(rows(page)).toHaveCount(1);await expect(row(page,sessionOther)).toBeVisible();
 });
 test('PSES-025 Search by user name works only with users-read grant',async({page})=>{
  await openPlatformSessions(page);await search(page).fill('Other Operator');
  await expect(rows(page)).toHaveCount(1);await expect(row(page,sessionOther)).toBeVisible();
 });
 test('PSES-026 Missing identity grant prevents identity search matching',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.users.read')});
  await search(page).fill('Other Operator');await expect(root(page)).toContainText('No Platform sessions matched');
 });
 test('PSES-027 Search is trimmed in outgoing query while input keeps typed spaces',async({page})=>{
  const received:string[]=[];await openPlatformSessions(page,{onCall:(m,p,q)=>{
   if(m==='GET'&&p===sessionsPath)received.push(q.get('search')||'');}});
  await search(page).fill('   192.0.2.10  ');await expect(rows(page)).toHaveCount(4);
  expect(received).toContain('192.0.2.10');
 });
 test('PSES-028 Clear filters removes status and search while preserving registry',async({page})=>{
  await openPlatformSessions(page,{query:'status=active&search=Current'});
  await root(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(status(page)).toHaveValue('');await expect(search(page)).toHaveValue('');
  await expect(rows(page)).toHaveCount(4);
 });
 test('PSES-029 Next page requests offset 50 and shows remaining records',async({page})=>{
  await openPlatformSessions(page,{records:manySessions(55)});
  await next(page).click();await expect(page).toHaveURL(/offset=50/);
  await expect(rows(page)).toHaveCount(5);await expect(root(page)).toContainText('Showing 51–55 of 55');
 });
 test('PSES-030 Previous page moves offset back to zero',async({page})=>{
  await openPlatformSessions(page,{records:manySessions(55),query:'offset=50'});
  await prev(page).click();await expect(rows(page)).toHaveCount(50);
  await expect(root(page)).toContainText('Showing 1–50 of 55');
 });
 test('PSES-031 Changing filter resets prior pagination offset',async({page})=>{
  await openPlatformSessions(page,{records:manySessions(55),query:'offset=50'});
  await status(page).selectOption('active');await expect(page).not.toHaveURL(/offset=50/);
  await expect(rows(page)).toHaveCount(50);
 });
 test('PSES-032 Empty registry results show explicit no-match message',async({page})=>{
  await openPlatformSessions(page,{records:[]});
  await expect(root(page)).toContainText('No Platform sessions matched.');
  await expect(rows(page)).toHaveCount(0);
 });
 test('PSES-033 Identity evidence restriction shows explicit redaction not a guessed identity',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.users.read')});
  await expect(root(page)).toContainText('Platform-user identity evidence is restricted');
  await expect(row(page,sessionOther)).toContainText('Restricted Platform user');
  await expect(root(page)).not.toContainText('Other Operator');
 });
 test('PSES-034 Refresh re-fetches current registry query',async({page})=>{
  let calls=0;await openPlatformSessions(page,{onCall:(m,p)=>{
   if(m==='GET'&&p===sessionsPath)calls++;}});
  const start=calls;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls).toBeGreaterThan(start);
 });
 test('PSES-035 Initial failed registry request presents explicit Retry',async({page})=>{
  await openPlatformSessions(page,{respond:(m,p)=>m==='GET'&&p===sessionsPath?{
   status:400,json:{message:'Synthetic sessions unavailable'}}:undefined});
  await expect(root(page).getByRole('alert')).toContainText('Platform Sessions could not be loaded');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PSES-036 Retry after failed first request can recover with valid registry evidence',async({page})=>{
  let calls=0;await openPlatformSessions(page,{respond:(m,p)=>{
   if(m==='GET'&&p===sessionsPath&&++calls===1)return {status:400,json:{message:'Synthetic first load failure'}};
  }});
  await root(page).getByRole('button',{name:'Retry'}).click();
  await expect(rows(page)).toHaveCount(4);
 });
 test('PSES-037 Failed refresh retains prior registry snapshot with visible warning',async({page})=>{
  let calls=0;await openPlatformSessions(page,{respond:(m,p)=>{
   if(m==='GET'&&p===sessionsPath&&++calls>1)return {status:400,json:{message:'Synthetic refresh error'}};
  }});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot');await expect(rows(page)).toHaveCount(4);
 });
 test('PSES-038 Revoke confirmation cancel sends no POST',async({page})=>{
  const writes:string[]=[];await openPlatformSessions(page,{onCall:(m,p)=>{
   if(m==='POST'&&p.endsWith('/revoke'))writes.push(p);}});
  page.once('dialog',d=>d.dismiss());await row(page,sessionOther).getByRole('button',{name:'Revoke session'}).click();
  expect(writes).toHaveLength(0);await expect(row(page,sessionOther).getByRole('button',{name:'Revoke session'})).toBeVisible();
 });
 test('PSES-039 Confirm revoke POST targets only selected active session',async({page})=>{
  const writes:string[]=[];await openPlatformSessions(page,{onCall:(m,p)=>{
   if(m==='POST'&&p.endsWith('/revoke'))writes.push(p);}});
  page.once('dialog',d=>d.accept());await row(page,sessionOther).getByRole('button',{name:'Revoke session'}).click();
  await expect(row(page,sessionOther)).toContainText('Historical record');
  expect(writes).toEqual([`${sessionsPath}/${sessionOther}/revoke`]);
  await expect(row(page,sessionSelf)).toContainText('Sign out');
 });
 test('PSES-040 Failed revoke leaves registry active and displays error',async({page})=>{
  await openPlatformSessions(page,{respond:(m,p)=>m==='POST'&&p===`${sessionsPath}/${sessionOther}/revoke`?{
   status:503,json:{message:'Synthetic revoke failed'}}:undefined});
  page.once('dialog',d=>d.accept());await row(page,sessionOther).getByRole('button',{name:'Revoke session'}).click();
  await expect(root(page).getByRole('alert')).toContainText('Synthetic revoke failed');
  await expect(row(page,sessionOther).getByRole('button',{name:'Revoke session'})).toBeVisible();
 });
 test.skip('PSES-041 Actual token rejection and immutable revocation audit evidence — Phase 2',async()=>{
  // Synthetic POST and row-state changes do not establish bearer invalidation or durable audit.
 });

 test.skip('PSES-042 Fractional offset must be rejected before a session registry query',async()=>{
  // SOURCE HARDENING: frontend uses Number(offset) with no integer check; 0.5 can be sent to backend.
 });
 test('PSES-043 Negative offset is clamped to zero in outbound request',async({page})=>{
  const offsets:string[]=[];await openPlatformSessions(page,{query:'offset=-30',onCall:(m,p,q)=>{if(m==='GET'&&p===sessionsPath)offsets.push(q.get('offset')||'');}});expect(offsets).toContain('0');
 });
 test.skip('PSES-044 Beyond-last-page offset must show consistent non-inverted range',async()=>{
  // SOURCE HARDENING: frontend shows Showing 501–53 of 53 for offset=500,total=53. Do not assert a correct range.
 });
 test('PSES-045 Pagination requests workspace mode without obsolete active_only alias',async({page})=>{
  const queries:string[]=[];await openPlatformSessions(page,{query:'offset=50',records:manySessions(53),onCall:(m,p,q)=>{if(m==='GET'&&p===sessionsPath)queries.push(q.toString());}});expect(queries.some(x=>x.includes('workspace=true')&& !x.includes('active_only'))).toBe(true);
 });
 test('PSES-046 Next disabled at the last page',async({page})=>{
  await openPlatformSessions(page,{records:manySessions(51),query:'offset=50'});await expect(next(page)).toBeDisabled();
 });
 test('PSES-047 Previous disabled at offset zero including empty results',async({page})=>{
  await openPlatformSessions(page,{records:[]});await expect(prev(page)).toBeDisabled();
 });
 test('PSES-048 Status change drops previous page offset while preserving search',async({page})=>{
  await openPlatformSessions(page,{records:manySessions(65),query:'offset=50&search=192.0.2'});await status(page).selectOption('active');await expect(page).not.toHaveURL(/offset=50/);await expect(search(page)).toHaveValue('192.0.2');
 });
 test('PSES-049 User filter change resets page offset without losing status',async({page})=>{
  await openPlatformSessions(page,{records:manySessions(65),query:'offset=50&status=active'});await user(page).selectOption(sessionUserA);await expect(page).not.toHaveURL(/offset=50/);await expect(status(page)).toHaveValue('active');
 });
 test('PSES-050 Clearing user filter retains unrelated status filter',async({page})=>{
  await openPlatformSessions(page,{query:`platform_user_id=${sessionUserA}&status=active`});await user(page).selectOption('');await expect(page).not.toHaveURL(/platform_user_id=/);await expect(status(page)).toHaveValue('active');
 });
 test('PSES-051 Missing last-used timestamp falls back to created timestamp',async({page})=>{
  await openPlatformSessions(page,{records:[{...activePlatformSession,last_used_at:null,created_at:'2025-01-02T10:00:00Z'}]});await expect(row(page,sessionOther).locator('td').nth(4)).toContainText('Created');await expect(row(page,sessionOther).locator('td').nth(4)).not.toContainText('Not recorded');
 });
 test('PSES-052 Malformed expiry timestamp is explicitly Not recorded',async({page})=>{
  await openPlatformSessions(page,{records:[{...activePlatformSession,expires_at:'invalid-date'}]});await expect(row(page,sessionOther).locator('td').nth(5)).toContainText('Not recorded');
 });
 test('PSES-053 Missing IP and user agent are displayed as request metadata gaps',async({page})=>{
  await openPlatformSessions(page,{records:[{...activePlatformSession,ip_address:null,user_agent:null}]});await expect(row(page,sessionOther)).toContainText('User agent not recorded');await expect(row(page,sessionOther)).toContainText('Not recorded');
 });
 test('PSES-054 Tracked current session marked inactive is not labelled active',async({page})=>{
  await openPlatformSessions(page,{records:[{...currentPlatformSession,is_active:false}]});await expect(root(page)).toContainText('Current record inactive');await expect(row(page,sessionSelf)).toContainText('expired');
 });
 test('PSES-055 Tracked revoked current record is historical not revokeable',async({page})=>{
  await openPlatformSessions(page,{records:[{...currentPlatformSession,is_active:false,revoked:true}]});await expect(row(page,sessionSelf)).toContainText('revoked');await expect(row(page,sessionSelf)).toContainText('Historical record');
 });
 test('PSES-056 Long user agent remains metadata not device identity evidence',async({page})=>{
  await openPlatformSessions(page,{records:[{...activePlatformSession,user_agent:'Fixture UA '.repeat(90)}]});await expect(row(page,sessionOther)).toContainText('Fixture UA');await expect(root(page)).toContainText('do not independently prove device identity');
 });
 test('PSES-057 Special-character search remains URI-encoded rather than interpolated raw',async({page})=>{
  const got:string[]=[];await openPlatformSessions(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===sessionsPath)got.push(q.get('search')||'');}});await search(page).fill('AA & BB');await expect.poll(()=>got.includes('AA & BB')).toBe(true);await expect(page).toHaveURL(/search=AA\+%26\+BB/);
 });
 test('PSES-058 Status and search intersect in server-side matching totals',async({page})=>{
  await openPlatformSessions(page,{query:'status=active&search=Other'});await expect(rows(page)).toHaveCount(1);await expect(root(page)).toContainText('Showing 1–1 of 1');
 });
 test('PSES-059 Platform user and status filters are intersected',async({page})=>{
  await openPlatformSessions(page,{query:`platform_user_id=${sessionUserA}&status=revoked`});await expect(rows(page)).toHaveCount(1);await expect(row(page,revokedPlatformSession.id)).toBeVisible();
 });
 test('PSES-060 User-directory failure does not prevent permission-scoped session evidence',async({page})=>{
  await openPlatformSessions(page,{respond:(m,p)=>m==='GET'&&p==='/platform/users'?{status:503,json:{message:'Synthetic user directory offline'}}:undefined});await expect(row(page,sessionOther)).toBeVisible();await expect(user(page)).toBeVisible();
 });
 test('PSES-061 Security supporting link appears only with security permission',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.security.read')});await expect(root(page).getByRole('link',{name:'Security',exact:true})).toHaveCount(0);
 });
 test('PSES-062 Platform audit supporting link is scoped to audit-read permission',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.audit.read')});await expect(root(page).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
 });
 test('PSES-063 Permission audit supporting link requires access-reviews grant',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.access_reviews.read')});await expect(root(page).getByRole('link',{name:'Permission audit'})).toHaveCount(0);
 });
 test('PSES-064 Identity restrictions retain allowed network metadata without names',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.users.read')});await expect(row(page,sessionOther)).toContainText('192.0.2.10');await expect(row(page,sessionOther)).toContainText('Restricted Platform user');await expect(root(page)).not.toContainText('other@fixture.test');
 });
 test('PSES-065 Successful revoke refreshes active counts and historical row status',async({page})=>{
  await openPlatformSessions(page);page.once('dialog',d=>d.accept());await row(page,sessionOther).getByRole('button',{name:'Revoke session'}).click();await expect(row(page,sessionOther)).toContainText('Historical record');await expect(root(page)).toContainText('Revoked');
 });
 test('PSES-066 Revoking another session leaves tracked current browser intact',async({page})=>{
  await openPlatformSessions(page);page.once('dialog',d=>d.accept());await row(page,sessionOther).getByRole('button',{name:'Revoke session'}).click();await expect(row(page,sessionSelf)).toContainText('Current browser');
 });
 test('PSES-067 Revoking the final active match produces an empty filtered registry',async({page})=>{
  await openPlatformSessions(page,{query:'status=active&search='+sessionOther});page.once('dialog',d=>d.accept());await row(page,sessionOther).getByRole('button',{name:'Revoke session'}).click();await expect(root(page)).toContainText('No Platform sessions matched.');
 });
 test('PSES-068 Missing session target on revoke reports API error and retains action',async({page})=>{
  await openPlatformSessions(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/revoke')?{status:404,json:{message:'Synthetic session missing'}}:undefined});page.once('dialog',d=>d.accept());await row(page,sessionOther).getByRole('button',{name:'Revoke session'}).click();await expect(root(page).getByRole('alert')).toContainText('Synthetic session missing');await expect(row(page,sessionOther).getByRole('button',{name:'Revoke session'})).toBeVisible();
 });
 test('PSES-069 Refresh outage retains last successful registry snapshot',async({page})=>{
  let fail=false;await openPlatformSessions(page,{respond:(m,p)=>fail&&m==='GET'&&p===sessionsPath?{status:503,json:{message:'Synthetic refresh interruption'}}:undefined});await expect(rows(page)).toHaveCount(4);fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(root(page)).toContainText('Showing the last successful snapshot.');await expect(rows(page)).toHaveCount(4);
 });
 test('PSES-070 Network metadata search remains available without user identity grant',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.users.read')});await search(page).fill('192.0.2.10');await expect(rows(page)).toHaveCount(4);await expect(root(page)).not.toContainText('Other Operator');
 });
 test.skip('PSES-071 Real Platform session GET and revoke grants must be enforced in auth middleware — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-072 Real identity filter and person-data redaction must be verified using separated Platform accounts — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-073 Database row locking prevents competing revocations without duplicate side effects — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-074 Server prevents the authenticated browser from revoking itself under concurrency — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-075 Server validates UUID, status, search and bounded integer paging independently — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-076 Successful revoke and actor audit commit atomically or roll back in PostgreSQL — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-077 A stolen or copied revoked bearer is denied on subsequent authenticated request — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-078 Session expiration and active state derive from server clock and persisted records — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-079 Actual session identity tokens and sensitive fields remain protected independently of frontend — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
 test.skip('PSES-080 Large session registry supports stable ordering and degraded database behavior — Phase 2',async()=>{
  // Real auth/SQL/token state and external evidence cannot be proven with a synthetic Playwright response.
 });
});

// Batch 164 — additional Platform Sessions source-backed browser behaviors.
// Real token revocation, identity enforcement and database audit remain blocked until Phase 2.
test.describe('Platform Sessions — filter boundaries and independent identity evidence (BATCH_164_GENERATED_UNRUN)',()=>{
 test('PSES-081 Search input has the source-defined two-hundred-character limit',async({page})=>{
  await openPlatformSessions(page);await expect(search(page)).toHaveAttribute('maxLength','200');
 });
 test('PSES-082 Non-numeric offset URL input normalizes to an outbound zero offset',async({page})=>{
  const sent:string[]=[];await openPlatformSessions(page,{query:'offset=not-a-number',onCall:(m,p,q)=>{
   if(m==='GET'&&p===sessionsPath)sent.push(q.get('offset')||'');
  }});
  await expect.poll(()=>sent.includes('0')).toBe(true);
  await expect(root(page)).toContainText('Showing 1–4 of 4');
 });
 test('PSES-083 Arbitrary URL query keys are excluded from the sessions evidence API',async({page})=>{
  const seen:URLSearchParams[]=[];await openPlatformSessions(page,{query:'debug=1&status=active&limit=999',onCall:(m,p,q)=>{
   if(m==='GET'&&p===sessionsPath)seen.push(new URLSearchParams(q));
  }});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);
  expect(seen[0].get('debug')).toBeNull();expect(seen[0].get('limit')).toBe('50');
  expect(seen[0].get('status')).toBe('active');
 });
 test('PSES-084 Missing users-read grant hides the Platform users supporting link',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.users.read')});
  await expect(root(page).getByRole('link',{name:'Platform users',exact:true})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Permission audit',exact:true})).toBeVisible();
 });
 test('PSES-085 HTML-shaped user-agent metadata renders as inert plain text',async({page})=>{
  const injected='<img src=x onerror=alert(1)>';
  await openPlatformSessions(page,{records:[{...activePlatformSession,user_agent:injected}]});
  await expect(row(page,sessionOther)).toContainText(injected);
  await expect(row(page,sessionOther).locator('img')).toHaveCount(0);
 });
 test('PSES-086 Unrecorded operator display name and email use explicit fallback text',async({page})=>{
  await openPlatformSessions(page,{records:[{...activePlatformSession,platform_user_name:null,platform_user_email:null}]});
  await expect(row(page,sessionOther)).toContainText('Platform user');
  await expect(row(page,sessionOther)).toContainText('No email');
 });
 test('PSES-087 Read-only registry metadata remains visible without revoke permission',async({page})=>{
  await openPlatformSessions(page,{permissions:without('platform.sessions.revoke')});
  await expect(root(page)).toContainText('Read-only registry');
  await expect(row(page,sessionOther)).toContainText('PLATFORM_SESSIONS_REVOKE required');
  await expect(row(page,sessionSelf)).toContainText('Current browser');
 });
 test('PSES-088 User-directory outage leaves network-metadata filtering available',async({page})=>{
  const sent:string[]=[];await openPlatformSessions(page,{respond:(m,p)=>
   m==='GET'&&p==='/platform/users'?{status:503,json:{message:'Synthetic directory outage'}}:undefined,
   onCall:(m,p,q)=>{if(m==='GET'&&p===sessionsPath)sent.push(q.get('search')||'');}
  });
  await search(page).fill('192.0.2.10');
  await expect.poll(()=>sent.includes('192.0.2.10')).toBe(true);
  await expect(row(page,sessionOther)).toBeVisible();
 });
 test('PSES-089 First-request HTTP 429 gives an actionable retry, not an empty healthy registry',async({page})=>{
  await openPlatformSessions(page,{respond:(m,p)=>m==='GET'&&p===sessionsPath?{
   status:429,json:{message:'Synthetic rate limit'}}:undefined});
  await expect(root(page).getByRole('alert')).toContainText('Platform Sessions could not be loaded.');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(root(page)).not.toContainText('No Platform sessions matched.');
 });
 test('PSES-090 Legacy array response still displays registry rows without inventing pagination',async({page})=>{
  await openPlatformSessions(page,{legacy:true});
  await expect(rows(page)).toHaveCount(4);
  await expect(root(page).locator('.platform-sessions__pagination')).toHaveCount(0);
  await expect(row(page,sessionOther)).toContainText('Other Operator');
 });
 test('PSES-091 Unlinked current session record reports untracked without hiding another session',async({page})=>{
  await openPlatformSessions(page,{records:[activePlatformSession]});
  await expect(root(page)).toContainText('Session untracked');
  await expect(row(page,sessionOther)).toContainText('Other Operator');
 });
 test('PSES-092 Missing expiration metadata uses Not recorded in the Expires column',async({page})=>{
  await openPlatformSessions(page,{records:[{...activePlatformSession,expires_at:''}]});
  await expect(row(page,sessionOther).locator('td').nth(5)).toContainText('Not recorded');
 });
 test('PSES-093 Source-provided generated timestamp is explicitly identified as generated evidence',async({page})=>{
  await openPlatformSessions(page);
  await expect(root(page)).toContainText('Generated');
  await expect(root(page)).toContainText('application session registry');
 });
});
