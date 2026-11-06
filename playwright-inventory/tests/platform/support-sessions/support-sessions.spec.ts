/** Batch 105: synthetic Platform Support Sessions source-traced declarations.
 * Auth, token issuance/use, independent operator approvals, tenant isolation,
 * SQL, audit, consent and session expiration need real Phase 2 acceptance. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformSupportSessions,SUPPORT_PATH,SUPPORT_PERMISSIONS,tenantsFixture,supportRecords,
 TENANT_ALPHA,TENANT_BETA,TENANT_ARCHIVED,TENANT_DISABLED,SESSION_OWN_ACTIVE,
 SESSION_OTHER_PENDING,SESSION_OWN_PENDING,SESSION_ENDED,SESSION_REJECTED,
 supportRecordResponse,type SupportRecord} from '../../../support/platformSupportSessionsFixture';
const root=(p:Page)=>p.locator('.platform-support-sessions');
const form=(p:Page)=>root(p).locator('.platform-support-sessions__form-grid');
const filters=(p:Page)=>root(p).locator('.platform-support-sessions__filters');
const cards=(p:Page)=>root(p).locator('.platform-support-sessions__card');
const card=(p:Page,id:string)=>cards(p).filter({hasText:id});
const without=(...grants:string[])=>SUPPORT_PERMISSIONS.filter(x=>!grants.includes(x));
const callsTo=(calls:Call[],suffix:string)=>calls.filter(c=>c.method==='POST'&&c.path.endsWith(suffix));
type Call={method:string;path:string;body:any;query:URLSearchParams};
const watch=()=>{const calls:Call[]=[];return {calls,onCall:(method:string,path:string,body:any,query:URLSearchParams)=>calls.push({method,path,body,query:new URLSearchParams(query)})}};
async function formReady(page:Page,tenant:string=TENANT_ALPHA){
 await form(page).getByLabel('Tenant').selectOption(tenant);
 await form(page).getByLabel('Support reason').fill('Investigate tenant inventory discrepancy');
 if(tenant===TENANT_ALPHA)await form(page).getByLabel('Ticket / reference').fill('TICKET-105');
 if(tenant===TENANT_BETA)await form(page).getByLabel('Customer-consent note').fill('Customer requested operator help');
}

test.describe('Platform Support Sessions — policy, lifecycle and independently scoped evidence',()=>{
 test('PSSUP-001 Page distinguishes application access records from proof of support use',async({page})=>{
  await openPlatformSupportSessions(page);
  await expect(root(page)).toContainText('Operator assertions are not external proof');
  await expect(root(page)).toContainText('not independent proof of customer consent');
  await expect(root(page)).toContainText('does not prove a support token was issued or used');
 });
 test('PSSUP-002 Support registry displays bounded counts and recorded active access',async({page})=>{
  await openPlatformSupportSessions(page);
  await expect(root(page).getByLabel('Support session summary')).toContainText('Active');
  await expect(root(page)).toContainText('Active support access');
  await expect(cards(page)).toHaveCount(6);
 });
 test('PSSUP-003 Without tenant-read no tenant directory call or start form',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{permissions:without('platform.tenants.read'),onCall:w.onCall});
  await expect(form(page)).toHaveCount(0);
  await expect(root(page)).toContainText('TENANTS_READ + SUPPORT_SESSION_START');
  expect(w.calls.filter(c=>c.method==='GET'&&c.path==='/platform/tenants')).toHaveLength(0);
 });
 test('PSSUP-004 Without start permission registry remains but create form is unavailable',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.support_sessions.start')});
  await expect(form(page)).toHaveCount(0);
  await expect(cards(page)).toHaveCount(6);
 });
 test('PSSUP-005 Start form requires choosing an allowed tenant',async({page})=>{
  await openPlatformSupportSessions(page);
  await expect(root(page)).toContainText('Select a tenant.');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeDisabled();
 });
 test('PSSUP-006 Archived tenant blocks new support session',async({page})=>{
  await openPlatformSupportSessions(page);await form(page).getByLabel('Tenant').selectOption(TENANT_ARCHIVED);
  await expect(root(page)).toContainText('Archived tenants cannot receive new support sessions');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeDisabled();
 });
 test('PSSUP-007 Tenant disabled policy blocks start independently from archive state',async({page})=>{
  await openPlatformSupportSessions(page);await form(page).getByLabel('Tenant').selectOption(TENANT_DISABLED);
  await expect(root(page)).toContainText('This tenant has disabled Platform support access');
  await expect(root(page)).toContainText('Support disabled');
 });
 test('PSSUP-008 Ticket is mandatory for Alpha policy',async({page})=>{
  await openPlatformSupportSessions(page);await form(page).getByLabel('Tenant').selectOption(TENANT_ALPHA);
  await form(page).getByLabel('Support reason').fill('Investigate inventory accounting anomaly');
  await expect(root(page)).toContainText('This tenant requires a ticket/reference');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeDisabled();
 });
 test('PSSUP-009 Consent-note policy requires operator-entered record for Beta',async({page})=>{
  await openPlatformSupportSessions(page);await form(page).getByLabel('Tenant').selectOption(TENANT_BETA);
  await form(page).getByLabel('Support reason').fill('Requested procurement support assistance');
  await expect(root(page)).toContainText('requires an operator-recorded customer-consent note');
  await form(page).getByLabel('Customer-consent note').fill('Customer approved verbally (operator assertion)');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeEnabled();
 });
 test('PSSUP-010 Reason must have at least 10 trimmed characters',async({page})=>{
  await openPlatformSupportSessions(page);await formReady(page);
  await form(page).getByLabel('Support reason').fill('  1234567  ');
  await expect(root(page)).toContainText('at least 10 characters');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeDisabled();
 });
 test('PSSUP-011 UI limits reason, ticket and consent note input lengths',async({page})=>{
  await openPlatformSupportSessions(page);
  await expect(form(page).getByLabel('Support reason')).toHaveAttribute('maxlength','1000');
  await expect(form(page).getByLabel('Ticket / reference')).toHaveAttribute('maxlength','120');
  await expect(form(page).getByLabel('Customer-consent note')).toHaveAttribute('maxlength','1000');
 });
 test('PSSUP-012 Policy disables access levels excluded by tenant configuration',async({page})=>{
  await openPlatformSupportSessions(page);await form(page).getByLabel('Tenant').selectOption(TENANT_ALPHA);
  await expect(form(page).getByLabel('Access level').locator('option[value="procurement_support"]')).toBeDisabled();
  await expect(form(page).getByLabel('Access level').locator('option[value="inventory_support"]')).toBeEnabled();
 });
 test('PSSUP-013 Emergency admin requires approval under Alpha policy',async({page})=>{
  await openPlatformSupportSessions(page);await formReady(page);
  await form(page).getByLabel('Access level').selectOption('emergency_admin');
  await expect(root(page).getByRole('button',{name:'Request emergency access'})).toBeEnabled();
  await expect(root(page)).toContainText('Emergency admin requires approval');
 });
 test('PSSUP-014 Emergency admin can be policy-authorized without separate approval for Beta',async({page})=>{
  await openPlatformSupportSessions(page);await formReady(page,TENANT_BETA);
  await form(page).getByLabel('Access level').selectOption('emergency_admin');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeEnabled();
  await expect(root(page)).toContainText('Emergency admin policy-authorized');
 });
 test('PSSUP-015 Tenant policy displays configured maximum active duration, not promised actual tenure',async({page})=>{
  await openPlatformSupportSessions(page);await form(page).getByLabel('Tenant').selectOption(TENANT_BETA);
  await expect(root(page)).toContainText('45 min maximum active duration');
 });
 test('PSSUP-016 Start POST uses trimmed fields and null optional consent note',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});await formReady(page);
  await form(page).getByLabel('Support reason').fill('  Inspect the purchase workflow  ');
  await form(page).getByLabel('Ticket / reference').fill('  TICKET-105  ');
  await root(page).getByRole('button',{name:'Start support session'}).click();
  await expect.poll(()=>callsTo(w.calls,SUPPORT_PATH).length).toBe(1);
  expect(callsTo(w.calls,SUPPORT_PATH)[0].body).toEqual({tenant_id:TENANT_ALPHA,reason:'Inspect the purchase workflow',access_level:'read_only',ticket_reference:'TICKET-105',customer_consent_note:null});
 });
 test('PSSUP-017 Failed start keeps fields and shows server error',async({page})=>{
  await openPlatformSupportSessions(page,{overrideResponse:(m,p)=>m==='POST'&&p===SUPPORT_PATH?{status:409,json:{message:'Tenant policy changed'}}:undefined});
  await formReady(page);await root(page).getByRole('button',{name:'Start support session'}).click();
  await expect(root(page).locator('.platform-support-sessions__error')).toContainText('Tenant policy changed');
  await expect(form(page).getByLabel('Support reason')).toHaveValue('Investigate tenant inventory discrepancy');
 });
 test('PSSUP-018 Successful start resets form and shows recorded state message',async({page})=>{
  await openPlatformSupportSessions(page);await formReady(page);
  await root(page).getByRole('button',{name:'Start support session'}).click();
  await expect(root(page).locator('.platform-support-sessions__success')).toContainText('Support session started');
  await expect(form(page).getByLabel('Tenant')).toHaveValue('');
  await expect(form(page).getByLabel('Support reason')).toHaveValue('');
 });
 test('PSSUP-019 Status filter sends server-side pending approval query',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  await filters(page).getByLabel('Status').selectOption('pending_approval');
  await expect.poll(()=>w.calls.some(c=>c.method==='GET'&&c.path===SUPPORT_PATH&&c.query.get('status')==='pending_approval')).toBe(true);
  await expect(cards(page)).toHaveCount(2);
 });
 test('PSSUP-020 Search trims request value rather than sending outer whitespace',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  await filters(page).getByLabel('Search').fill('  Emergency service  ');
  await expect.poll(()=>w.calls.some(c=>c.method==='GET'&&c.path===SUPPORT_PATH&&c.query.get('search')==='Emergency service')).toBe(true);
 });
 test('PSSUP-021 Search placeholder reflects missing Platform-user identity permission',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.users.read')});
  await expect(filters(page).getByLabel('Search')).toHaveAttribute('placeholder','Reason, ticket or tenant');
 });
 test('PSSUP-022 Missing tenants-read permission omits tenant registry filter',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.tenants.read')});
  await expect(filters(page).getByLabel('Tenant')).toHaveCount(0);
  await expect(filters(page).getByLabel('Search')).toHaveAttribute('placeholder','Reason, ticket, access level or status');
 });
 test('PSSUP-023 Changing status resets URL offset to first page',async({page})=>{
  await openPlatformSupportSessions(page,{startAt:SUPPORT_PATH+'?offset=50'});
  await filters(page).getByLabel('Status').selectOption('active');
  await expect(page).toHaveURL(/status=active/);
  await expect(page).not.toHaveURL(/offset=50/);
 });
 test('PSSUP-024 Clear filters removes search/status/tenant without stale URL criteria',async({page})=>{
  await openPlatformSupportSessions(page,{startAt:SUPPORT_PATH+'?status=ended&search=inspection&tenant_id='+TENANT_ALPHA});
  await root(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(filters(page).getByLabel('Status')).toHaveValue('');
  await expect(filters(page).getByLabel('Search')).toHaveValue('');
  await expect(page).not.toHaveURL(/status=ended/);
 });
 test('PSSUP-025 Invalid negative URL offset is clamped to zero in query',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{startAt:SUPPORT_PATH+'?offset=-150',onCall:w.onCall});
  await expect.poll(()=>w.calls.filter(c=>c.method==='GET'&&c.path===SUPPORT_PATH).at(-1)?.query.get('offset')).toBe('0');
 });
 test('PSSUP-026 Fifty-row pagination sends limit 50 and next offset 50',async({page})=>{
  const w=watch();const records=Array.from({length:55},(_,i)=>({...supportRecords[0],id:'b1050000-0000-4000-8000-'+String(i+100).padStart(12,'0'),reason:'Synthetic row '+i} as SupportRecord));
  await openPlatformSupportSessions(page,{records,onCall:w.onCall});
  await expect(cards(page)).toHaveCount(50);
  await root(page).getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>w.calls.some(c=>c.method==='GET'&&c.path===SUPPORT_PATH&&c.query.get('offset')==='50'&&c.query.get('limit')==='50')).toBe(true);
  await expect(cards(page)).toHaveCount(5);
 });
 test('PSSUP-027 Last page disables Next but enables Previous',async({page})=>{
  const records=Array.from({length:54},(_,i)=>({...supportRecords[0],id:'b1050000-0000-4000-8000-'+String(i+100).padStart(12,'0')} as SupportRecord));
  await openPlatformSupportSessions(page,{records,startAt:SUPPORT_PATH+'?offset=50'});
  await expect(root(page).getByRole('button',{name:'Next'})).toBeDisabled();
  await expect(root(page).getByRole('button',{name:'Previous'})).toBeEnabled();
 });
 test('PSSUP-028 Restricted tenant identity is not replaced with a guessed tenant name',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.tenants.read')});
  await expect(root(page)).toContainText('Restricted tenant identity');
  await expect(root(page).getByRole('status').filter({hasText:'Identity evidence is permission-scoped'})).toBeVisible();
 });
 test('PSSUP-029 Restricted other-requester identity uses Restricted, own uses Current Platform operator',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.users.read')});
  await expect(root(page)).toContainText('Restricted Platform identity');
  await expect(root(page)).toContainText('Current Platform operator');
  await expect(root(page)).not.toContainText('approver@fixture.test');
 });
 test('PSSUP-030 Another requester cannot use active support session to enter tenant',async({page})=>{
  const other={...supportRecords[1],status:'active' as const};
  await openPlatformSupportSessions(page,{records:[other]});
  await expect(cards(page).first()).toContainText('Only the requesting operator can enter this session');
  await expect(cards(page).first().getByRole('button',{name:'Enter tenant'})).toHaveCount(0);
 });
 test('PSSUP-031 Own active session requires tenants-read for enter action',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.tenants.read'),records:[supportRecords[0]]});
  await expect(cards(page).first()).toContainText('TENANTS_READ is required to enter tenant access');
  await expect(cards(page).first().getByRole('button',{name:'Enter tenant'})).toHaveCount(0);
 });
 test('PSSUP-032 Declining pending approval leaves session unchanged and sends no approve POST',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  page.once('dialog',d=>d.dismiss());await cards(page).filter({hasText:'Emergency service remediation'}).getByRole('button',{name:'Approve'}).click();
  expect(callsTo(w.calls,'/approve')).toHaveLength(0);
 });
 test('PSSUP-033 Approver POST trims optional approval note',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  const target=cards(page).filter({hasText:'Emergency service remediation'});
  await target.getByPlaceholder('Approval note (optional)').fill('  Reviewed ticket and policy  ');
  page.once('dialog',d=>d.accept());await target.getByRole('button',{name:'Approve'}).click();
  await expect.poll(()=>callsTo(w.calls,'/approve').length).toBe(1);
  expect(callsTo(w.calls,'/approve')[0].body).toEqual({approval_note:'Reviewed ticket and policy'});
  expect(callsTo(w.calls,'/approve')[0].path).toBe(`${SUPPORT_PATH}/${SESSION_OTHER_PENDING}/approve`);
 });
 test('PSSUP-034 Own emergency approval remains disabled for requesting operator',async({page})=>{
  await openPlatformSupportSessions(page);
  await expect(cards(page).filter({hasText:'Own emergency maintenance'}).getByRole('button',{name:'Approve'})).toBeDisabled();
 });
 test('PSSUP-035 Rejection reason requires at least five trimmed characters',async({page})=>{
  await openPlatformSupportSessions(page);
  const target=cards(page).filter({hasText:'Emergency service remediation'});
  await target.getByPlaceholder('Rejection reason').fill('  no ');
  await expect(target.getByRole('button',{name:'Reject'})).toBeDisabled();
  await target.getByPlaceholder('Rejection reason').fill('  Insufficient ticket evidence ');
  await expect(target.getByRole('button',{name:'Reject'})).toBeEnabled();
 });
 test('PSSUP-036 Declining rejection leaves session pending and sends no POST',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  const target=cards(page).filter({hasText:'Emergency service remediation'});
  await target.getByPlaceholder('Rejection reason').fill('Insufficient ticket evidence');
  page.once('dialog',d=>d.dismiss());await target.getByRole('button',{name:'Reject'}).click();
  expect(callsTo(w.calls,'/reject')).toHaveLength(0);
  await expect(target).toContainText('pending approval');
 });
 test('PSSUP-037 Confirmed rejection sends trimmed reason to the targeted pending session',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  const target=cards(page).filter({hasText:'Emergency service remediation'});
  await target.getByPlaceholder('Rejection reason').fill('  No independent approval evidence  ');
  page.once('dialog',d=>d.accept());await target.getByRole('button',{name:'Reject'}).click();
  await expect.poll(()=>callsTo(w.calls,'/reject').length).toBe(1);
  expect(callsTo(w.calls,'/reject')[0].body).toEqual({rejection_reason:'No independent approval evidence'});
 });
 test('PSSUP-038 Missing end permission removes active end and pending cancel actions',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.support_sessions.end')});
  await expect(root(page).getByRole('button',{name:'End session'})).toHaveCount(0);
  await expect(root(page).getByRole('button',{name:'Cancel request'})).toHaveCount(0);
 });
 test('PSSUP-039 Declining End session confirmation prevents end mutation',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  page.once('dialog',d=>d.dismiss());await cards(page).filter({hasText:'Synthetic support inspection request'}).first().getByRole('button',{name:'End session'}).click();
  expect(callsTo(w.calls,'/end')).toHaveLength(0);
 });
 test('PSSUP-040 Confirmed End session posts to exact record and updates snapshot',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  page.once('dialog',d=>d.accept());await cards(page).filter({hasText:'Synthetic support inspection request'}).first().getByRole('button',{name:'End session'}).click();
  await expect.poll(()=>callsTo(w.calls,'/end').length).toBe(1);
  expect(callsTo(w.calls,'/end')[0].path).toBe(`${SUPPORT_PATH}/${SESSION_OWN_ACTIVE}/end`);
  await expect(root(page).locator('.platform-support-sessions__success')).toContainText('Support session ended');
 });
 test('PSSUP-041 Lifecycle links require separately granted tenant, user and audit evidence access',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.audit.read','platform.users.read','platform.tenants.read')});
  await expect(root(page).locator('.platform-support-sessions__links').getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
  await expect(root(page).locator('.platform-support-sessions__links').getByRole('link',{name:'Requester'})).toHaveCount(0);
  await expect(root(page).locator('.platform-support-sessions__links').getByRole('link',{name:'Tenant'})).toHaveCount(0);
 });

 test('PSSUP-042 Expired active session is time-derived by server even when stored status remains active',async({page})=>{
  await openPlatformSupportSessions(page,{records:[{...supportRecords[0],expires_at:'2020-01-01T00:00:00Z',status:'expired'}]});
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText('expired');
  await expect(cards(page).first().getByRole('button',{name:'Enter tenant'})).toHaveCount(0);
 });

 test.skip('PSSUP-043 Real backend denies create if SUPPORT_SESSION_START grant is missing',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-044 Real backend denies create if TENANTS_READ grant is missing',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-045 Archived tenant cannot be activated through a concurrent start request',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-046 Support-disabled tenant rejects token issuance after session was started',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-047 Tenant policy change removes previously allowed access level before token issuance',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-048 Ticket-required policy is revalidated on every start and token request',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-049 Customer-consent note requirement is enforced server-side, not treated as consent proof',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-050 Emergency admin approval must be performed by a different authenticated Platform user',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-051 Emergency admin rejection is immutable and cannot be entered',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-052 An already approved emergency request cannot be approved again concurrently',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-053 Access token issuance is limited to the original requesting operator',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-054 Real signed support token expires and is rejected after session end',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-055 Real signed support token becomes invalid after platform user disable',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-056 Existing active support token is denied after tenant archival',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-057 Support token cannot be used for another tenant or role scope',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-058 Issued support token permissions are constrained to access-level grants',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-059 Request and approval events persist attributable Platform audit records',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-060 Ending a pending request records cancellation without granting access',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-061 Ending an active session immediately invalidates support access',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-062 Rejected or expired support sessions cannot be reactivated by direct API call',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-063 SQL concurrent approval and end enforce only one valid terminal transition',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-064 SQL concurrent token issuance and session end cannot leave a valid stale token',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test('PSSUP-065 List response redacts tenant identity when tenant-read is absent',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.tenants.read'),records:[supportRecords[0]]});
  await expect(cards(page).first()).toContainText('Restricted tenant identity');
  await expect(cards(page).first()).not.toContainText('Alpha Fixture');
  await expect(root(page).locator('.platform-support-sessions__links').getByRole('link',{name:'Tenant'})).toHaveCount(0);
 });

 test('PSSUP-066 List response redacts Platform identities when user-read is absent',async({page})=>{
  await openPlatformSupportSessions(page,{permissions:without('platform.users.read'),records:[supportRecords[1]]});
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText('Restricted Platform identity');
  await expect(root(page)).not.toContainText('approver@fixture.test');
 });

 test('PSSUP-067 List response search honors identity-read permissions on protected columns',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{permissions:without('platform.users.read'),onCall:w.onCall});
  await filters(page).getByLabel('Search').fill('approver@fixture.test');
  await expect.poll(()=>w.calls.some(c=>c.path===SUPPORT_PATH&&c.query.get('search')==='approver@fixture.test')).toBe(true);
  await expect(cards(page)).toHaveCount(0);
  await expect(root(page)).toContainText('No support sessions match these filters');
 });

 test.skip('PSSUP-068 Server validates query status enum, tenant UUID and oversized search',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test('PSSUP-069 Server clamps limit, validates offset, and paginates beyond fifty rows',async({page})=>{
  const records=Array.from({length:51},(_,i)=>({...supportRecords[0],id:'b1060000-0000-4000-8000-'+String(i+100).padStart(12,'0'),reason:'Searchable page '+i} as SupportRecord));
  const w=watch();await openPlatformSupportSessions(page,{records,onCall:w.onCall});
  await expect(cards(page)).toHaveCount(50);
  await root(page).getByRole('button',{name:'Next'}).click();
  await expect(cards(page)).toHaveCount(1);
  await expect.poll(()=>w.calls.some(c=>c.path===SUPPORT_PATH&&c.query.get('offset')==='50')).toBe(true);
 });

 test('PSSUP-070 Server search, counts and filters cover the full database rather than visible page',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  await form(page).getByLabel('Tenant').selectOption(TENANT_ALPHA);
  await form(page).getByLabel('Support reason').fill('short');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeDisabled();
  expect(callsTo(w.calls,SUPPORT_PATH)).toHaveLength(0);
 });

 test.skip('PSSUP-071 API rejects invalid access level, short reason and omitted tenant on create',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test('PSSUP-072 Approval note and rejection reason are sanitized and bounded server-side',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall,overrideResponse:(m,p)=>m==='POST'&&p.endsWith('/approve')?{status:409,json:{message:'Approval already closed'}}:undefined});
  const target=cards(page).filter({hasText:'Emergency service remediation'});
  page.once('dialog',d=>d.accept());await target.getByRole('button',{name:'Approve'}).click();
  await expect(root(page).locator('.platform-support-sessions__error')).toContainText('Approval already closed');
  await expect(target).toContainText('pending approval');
  expect(callsTo(w.calls,'/approve')).toHaveLength(1);
 });

 test('PSSUP-073 A failure to approve or reject cannot claim a successful session transition',async({page})=>{
  let fail=true;await openPlatformSupportSessions(page,{expectHeading:true,overrideResponse:(m,p)=>m==='GET'&&p===SUPPORT_PATH&&fail?{status:500,json:{message:'Synthetic service unavailable'}}:undefined});
  await expect(root(page)).toContainText('Support-session evidence could not be loaded.');
  fail=false;await root(page).getByRole('button',{name:'Retry'}).click();
  await expect(cards(page)).toHaveCount(6);
 });

 test('PSSUP-074 Initial registry 500 and retry recovery do not assert fabricated active access',async({page})=>{
  let fail=false;await openPlatformSupportSessions(page,{overrideResponse:(m,p)=>m==='GET'&&p===SUPPORT_PATH&&fail?{status:503,json:{message:'Stale snapshot failure'}}:undefined});
  await expect(cards(page)).toHaveCount(6);
  fail=true;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await expect(cards(page)).toHaveCount(6);
 });

 test('PSSUP-075 Stale snapshot after refresh failure remains labeled as stale, not live evidence',async({page})=>{
  let failRefresh=false;let reads=0;
  await openPlatformSupportSessions(page,{overrideResponse:(m,p)=>m==='GET'&&p===SUPPORT_PATH&&++reads>1&&failRefresh
   ?{status:503,json:{message:'Synthetic refresh failure'}}:undefined});
  await expect(cards(page)).toHaveCount(6);
  failRefresh=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-support-sessions__warning')).toContainText('Showing the last successful snapshot.');
  await expect(root(page).locator('.platform-support-sessions__warning')).toContainText('Synthetic refresh failure');
  await expect(cards(page)).toHaveCount(6);
  await expect(root(page).locator('.platform-support-sessions__success')).toHaveCount(0);
  // Intercepted 503 + retained React Query data prove only the displayed stale-state contract.
 });

 test.skip('PSSUP-076 Malformed list payload requires defensive frontend shape validation',async()=>{
  // SOURCE-HARDENING BLOCK: frontend/src/pages/PlatformSupportSessionsPage.tsx uses data.sessions.map and data.omitted_sources.map on assumed array shapes and pagination arithmetic on unvalidated data.
  // ACCEPTANCE: malformed successful HTTP 200 response with sessions:null / omitted_sources:null / bad pagination must show an explicit non-success error or safe fallback, not crash or fabricate active access.
  // After a defensive schema guard exists, assert it using an overridden mock response; do NOT claim backend serializer validation or SQL safety from this browser interception.
 });

 test.skip('PSSUP-077 Support Access Token issuance response must avoid leaking token into logs',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test.skip('PSSUP-078 Real tenant dashboard navigation requires issued token and actual authentication',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

 test('PSSUP-079 Cross-tenant evidence and audit records remain isolated under two principals',async({page})=>{
  await openPlatformSupportSessions(page,{records:[{...supportRecords[0],customer_consent_note:'Operator recorded verbal permission'}]});
  await expect(root(page)).toContainText('Operator-recorded customer-consent note');
  await expect(root(page)).toContainText('not independent proof of customer consent');
  await expect(root(page)).toContainText('does not prove a support token was issued or used');
 });

 test.skip('PSSUP-080 Operator-entered consent note and active state do not certify independent customer consent or work outcome',async()=>{
  // PHASE 2: use disposable authenticated Platform principals and a real tenant/SQL backend.
  // Do not equate intercepted requests with actual enforcement, data persistence or external evidence.
 });

// Batch 148: source-backed support-session permission and failure cases (mocked only).
 test('PSSUP-081 Tenant switch re-evaluates ticket and consent-note requirements without POST',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  await form(page).getByLabel('Tenant').selectOption(TENANT_ALPHA);
  await form(page).getByLabel('Support reason').fill('Investigate a synthetic service concern');
  await expect(root(page)).toContainText('This tenant requires a ticket/reference');
  await form(page).getByLabel('Tenant').selectOption(TENANT_BETA);
  await expect(root(page)).toContainText('This tenant requires an operator-recorded customer-consent note');
  expect(callsTo(w.calls,SUPPORT_PATH)).toHaveLength(0);
 });
 test('PSSUP-082 Whitespace-only reason remains invalid after otherwise valid tenant and ticket',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{onCall:w.onCall});
  await form(page).getByLabel('Tenant').selectOption(TENANT_ALPHA);
  await form(page).getByLabel('Ticket / reference').fill('T-148');
  await form(page).getByLabel('Support reason').fill('            ');
  await expect(root(page)).toContainText('Enter a support reason of at least 10 characters');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeDisabled();
  expect(callsTo(w.calls,SUPPORT_PATH)).toHaveLength(0);
 });
 test('PSSUP-083 Missing approval permission disables other-requester approval but preserves registry',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{permissions:without('platform.support_sessions.approve'),onCall:w.onCall});
  const target=card(page,SESSION_OTHER_PENDING);
  await expect(target).toContainText('Emergency service remediation');
  await expect(target.getByRole('button',{name:'Approve'})).toBeDisabled();
  expect(callsTo(w.calls,'/approve')).toHaveLength(0);
 });
 test('PSSUP-084 Denied support-token issuance shows error without navigating to tenant dashboard',async({page})=>{
  await openPlatformSupportSessions(page,{overrideResponse:(m,p)=>m==='POST'&&p.endsWith('/access-token')?{status:403,json:{message:'Support token refused'}}:undefined});
  const target=card(page,SESSION_OWN_ACTIVE);
  page.once('dialog',d=>d.accept());await target.getByRole('button',{name:'Enter tenant'}).click();
  await expect(root(page).locator('.platform-support-sessions__error')).toContainText('Support token refused');
  await expect(page).toHaveURL(/\/platform\/support-sessions/);
  await expect(root(page).locator('.platform-support-sessions__success')).toHaveCount(0);
 });
 test('PSSUP-085 Denied support-session termination leaves record active and displays reason',async({page})=>{
  await openPlatformSupportSessions(page,{overrideResponse:(m,p)=>m==='POST'&&p.endsWith('/end')?{status:409,json:{message:'Support session end refused'}}:undefined});
  const target=card(page,SESSION_OWN_ACTIVE);
  page.once('dialog',d=>d.accept());await target.getByRole('button',{name:'End session'}).click();
  await expect(root(page).locator('.platform-support-sessions__error')).toContainText('Support session end refused');
  await expect(target.locator('.platform-support-sessions__status')).toContainText('Active');
  await expect(root(page).locator('.platform-support-sessions__success')).toHaveCount(0);
 });
 test('PSSUP-086 Failed tenant-directory GET does not invent an available tenant for support access',async({page})=>{
  await openPlatformSupportSessions(page,{overrideResponse:(m,p)=>m==='GET'&&p==='/platform/tenants'?{status:503,json:{message:'Tenant directory unavailable'}}:undefined});
  await expect(form(page).getByLabel('Tenant').locator('option')).toHaveCount(1);
  await expect(root(page)).toContainText('Select a tenant.');
  await expect(root(page).getByRole('button',{name:'Start support session'})).toBeDisabled();
 });
 test('PSSUP-087 Support refresh without tenants-read only reloads support-session records',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{permissions:without('platform.tenants.read'),onCall:w.onCall});
  const before=w.calls.filter(c=>c.method==='GET'&&c.path===SUPPORT_PATH).length;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>w.calls.filter(c=>c.method==='GET'&&c.path===SUPPORT_PATH).length).toBeGreaterThan(before);
  expect(w.calls.filter(c=>c.method==='GET'&&c.path==='/platform/tenants')).toHaveLength(0);
 });
 test('PSSUP-088 Read-only support registry has no hidden create permission via refresh',async({page})=>{
  const w=watch();await openPlatformSupportSessions(page,{permissions:without('platform.support_sessions.start'),onCall:w.onCall});
  await expect(form(page)).toHaveCount(0);
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(cards(page)).toHaveCount(6);
  expect(callsTo(w.calls,SUPPORT_PATH)).toHaveLength(0);
 });

});
