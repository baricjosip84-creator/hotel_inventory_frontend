/** BATCH_086_GENERATED_UNRUN: 41 source-traced Platform Privacy Requests UI scenarios.
 * All writes are simulated; these tests cannot establish real legal compliance, personal-data isolation,
 * external identity verification, subject-right fulfillment or actual Postgres changes. */
import {test,expect,type Page} from '@playwright/test';
import {openPrivacyRequests,privacyRoot,privacyPermissions,privacyTenant,privacyOperator,privacyId,
 intakeRequest,waitingRequest,closedRequest,manyPrivacyRequests} from '../../../support/platformPrivacyRequestsFixture';
const root=(p:Page)=>p.locator('.platform-privacy-requests');
const section=(p:Page,name:string)=>root(p).locator('.platform-privacy-requests__section').filter({has:p.getByRole('heading',{name,exact:true})});
const filters=(p:Page)=>section(p,'Filter registry');
const create=(p:Page)=>section(p,'Create privacy request');
const edit=(p:Page)=>section(p,'Edit request details');
const evidence=(p:Page)=>section(p,'Privacy request evidence');
const support=(p:Page)=>section(p,'Supporting operations');
const cards=(p:Page)=>evidence(p).locator('.platform-privacy-requests__card');
const card=(p:Page,email:string)=>cards(p).filter({has:p.getByRole('heading',{name:email,exact:true})});
const pagination=(p:Page)=>evidence(p).locator('.platform-privacy-requests__pagination');
const omit=(...perms:string[])=>privacyPermissions.filter(x=>!perms.includes(x));
const fillMinimal=async(p:Page,email='new-request@fixture.test')=>{await create(p).getByLabel('Requester email').fill(email);
 await create(p).getByLabel('Request summary').fill('Synthetic recorded privacy request');};

test.describe('Platform Privacy Requests — permissions, registry, workflows (BATCH_086_GENERATED_UNRUN)',()=>{
 test('PPRIV-001 Route displays privacy request registry and recorded-evidence boundary',async({page})=>{
  await openPrivacyRequests(page);await expect(root(page)).toContainText('Evidence boundary');
  await expect(root(page)).toContainText('do not prove external identity verification');
 });
 test('PPRIV-002 Initial listing uses fifty rows and zero offset',async({page})=>{
  const calls:string[]=[];await openPrivacyRequests(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===privacyRoot)calls.push(q.toString());}});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  const q=new URLSearchParams(calls.at(-1));expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');
 });
 test('PPRIV-003 Platform privacy read permission protects the route',async({page})=>{
  const hits:string[]=[];await openPrivacyRequests(page,{permissions:omit('platform.privacy.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===privacyRoot)hits.push(p);}});
  await expect(root(page)).toHaveCount(0);expect(hits).toHaveLength(0);
 });
 test('PPRIV-004 Read-only operator does not receive form or per-record mutations',async({page})=>{
  await openPrivacyRequests(page,{permissions:omit('platform.privacy.write')});await expect(create(page)).toHaveCount(0);
  await expect(card(page,intakeRequest.requester_email).getByRole('button')).toHaveCount(0);
 });
 test('PPRIV-005 Writable operator receives intake form and open-item actions',async({page})=>{
  await openPrivacyRequests(page);await expect(create(page).getByRole('button',{name:'Create Intake request'})).toBeVisible();
  await expect(card(page,intakeRequest.requester_email).getByRole('button',{name:'Edit details'})).toBeVisible();
 });
 test('PPRIV-006 Filtered summary counts differ from current fifty-row page size',async({page})=>{
  await openPrivacyRequests(page,{records:manyPrivacyRequests(55)});await expect(cards(page)).toHaveCount(50);
  await expect(root(page).getByLabel('Privacy request registry summary')).toContainText('55');
 });
 test('PPRIV-007 Open, overdue, waiting and verification counts reflect registry snapshot',async({page})=>{
  await openPrivacyRequests(page);const stats=root(page).getByLabel('Privacy request registry summary');
  await expect(stats).toContainText('Verification attention');await expect(stats).toContainText('Waiting tenant');
  await expect(stats).toContainText('Recorded due date exceeded');
 });
 test('PPRIV-008 Tenant filter hidden if tenant source grant is unavailable',async({page})=>{
  await openPrivacyRequests(page,{permissions:omit('platform.tenants.read')});await expect(filters(page)).toContainText('Tenant filter restricted');
  await expect(filters(page).getByLabel('Tenant')).toHaveCount(0);
 });
 test('PPRIV-009 Assignee filter hidden if platform users read is unavailable',async({page})=>{
  await openPrivacyRequests(page,{permissions:omit('platform.users.read')});await expect(filters(page)).toContainText('Assignee filter restricted');
  await expect(filters(page).getByLabel('Assignee')).toHaveCount(0);
 });
 test('PPRIV-010 Tenant and assignee identity redacted but linkage presence is retained',async({page})=>{
  await openPrivacyRequests(page,{permissions:omit('platform.tenants.read','platform.users.read')});
  await expect(card(page,intakeRequest.requester_email)).toContainText('Restricted tenant linkage');
  await expect(card(page,intakeRequest.requester_email)).toContainText('Restricted Platform-user linkage');
  await expect(evidence(page)).not.toContainText('Fixture Tenant Alpha');
 });
 test('PPRIV-011 Identity-granted card contains tenant and assigned operator labels',async({page})=>{
  await openPrivacyRequests(page);await expect(card(page,intakeRequest.requester_email)).toContainText('Fixture Tenant Alpha');
  await expect(card(page,intakeRequest.requester_email)).toContainText('operator@fixture.test');
 });
 test('PPRIV-012 Backend-recorded overdue flag has distinct visible badge',async({page})=>{
  await openPrivacyRequests(page);await expect(card(page,waitingRequest.requester_email)).toContainText('Recorded deadline overdue');
 });
 test('PPRIV-013 Closed request is shown immutable with no workflow buttons',async({page})=>{
  await openPrivacyRequests(page);await expect(card(page,closedRequest.requester_email)).toContainText('Closed history is immutable.');
  await expect(card(page,closedRequest.requester_email).getByRole('button',{name:'Edit details'})).toHaveCount(0);
 });
 test('PPRIV-014 Verified and completed timestamps remain recorded application evidence',async({page})=>{
  await openPrivacyRequests(page);await expect(card(page,closedRequest.requester_email)).toContainText('Synthetic closure note');
  await expect(root(page).locator('.platform-privacy-requests__truth-note')).toContainText('delivery/receipt');
 });
 test('PPRIV-015 Search term is URL-backed and sent to privacy registry GET',async({page})=>{
  const calls:string[]=[];await openPrivacyRequests(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===privacyRoot)calls.push(q.toString());}});
  await filters(page).getByLabel('Search').fill('waiting@fixture.test');
  await expect(card(page,waitingRequest.requester_email)).toBeVisible();await expect(cards(page)).toHaveCount(1);
  expect(new URLSearchParams(calls.at(-1)).get('search')).toBe('waiting@fixture.test');
 });
 test('PPRIV-016 Status dropdown scopes matching records and URL status',async({page})=>{
  await openPrivacyRequests(page);await filters(page).getByLabel('Status').selectOption('fulfilled');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,closedRequest.requester_email)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('status')).toBe('fulfilled');
 });
 test('PPRIV-017 Type dropdown scopes request_type independently of workflow status',async({page})=>{
  await openPrivacyRequests(page);await filters(page).getByLabel('Request type').selectOption('export');
  await expect(card(page,waitingRequest.requester_email)).toBeVisible();await expect(cards(page)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('request_type')).toBe('export');
 });
 test('PPRIV-018 Overdue checkbox sends true and filters to deadline-expired open requests',async({page})=>{
  await openPrivacyRequests(page);await filters(page).getByLabel('Recorded due date overdue').check();
  await expect(cards(page)).toHaveCount(1);await expect(card(page,waitingRequest.requester_email)).toBeVisible();
  expect(new URL(page.url()).searchParams.get('overdue')).toBe('true');
 });
 test('PPRIV-019 Authorized tenant selector applies tenant UUID query',async({page})=>{
  const calls:string[]=[];await openPrivacyRequests(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===privacyRoot)calls.push(q.toString());}});
  await filters(page).getByLabel('Tenant').selectOption(privacyTenant);
  await expect.poll(()=>new URLSearchParams(calls.at(-1)).get('tenant_id')).toBe(privacyTenant);
 });
 test('PPRIV-020 Authorized assignee selector applies platform user UUID query',async({page})=>{
  const calls:string[]=[];await openPrivacyRequests(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===privacyRoot)calls.push(q.toString());}});
  await filters(page).getByLabel('Assignee').selectOption(privacyOperator);
  await expect.poll(()=>new URLSearchParams(calls.at(-1)).get('assigned_platform_user_id')).toBe(privacyOperator);
 });
 test('PPRIV-021 Invalid URL status blocks privacy registry GET',async({page})=>{
  const hits:string[]=[];await openPrivacyRequests(page,{query:'status=invalid',onCall:(m,p)=>{if(m==='GET'&&p===privacyRoot)hits.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(hits).toHaveLength(0);
 });
 test('PPRIV-022 Unauthorized tenant URL filter is blocked rather than silently applied',async({page})=>{
  const hits:string[]=[];await openPrivacyRequests(page,{permissions:omit('platform.tenants.read'),query:`tenant_id=${privacyTenant}`,
   onCall:(m,p)=>{if(m==='GET'&&p===privacyRoot)hits.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(hits).toHaveLength(0);
 });
 test('PPRIV-023 Unauthorized assignee URL filter is blocked rather than silently applied',async({page})=>{
  const hits:string[]=[];await openPrivacyRequests(page,{permissions:omit('platform.users.read'),query:`assigned_platform_user_id=${privacyOperator}`,
   onCall:(m,p)=>{if(m==='GET'&&p===privacyRoot)hits.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(hits).toHaveLength(0);
 });
 test('PPRIV-024 Oversized search URL is rejected instead of sending an API query',async({page})=>{
  const hits:string[]=[];await openPrivacyRequests(page,{query:`search=${'a'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===privacyRoot)hits.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(hits).toHaveLength(0);
 });
 test('PPRIV-025 Invalid overdue URL value blocks the data query',async({page})=>{
  const hits:string[]=[];await openPrivacyRequests(page,{query:'overdue=yes',onCall:(m,p)=>{if(m==='GET'&&p===privacyRoot)hits.push(p);}});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');expect(hits).toHaveLength(0);
 });
 test('PPRIV-026 Create button disabled without a valid email and request summary',async({page})=>{
  await openPrivacyRequests(page);await expect(create(page).getByRole('button',{name:'Create Intake request'})).toBeDisabled();
  await create(page).getByLabel('Requester email').fill('not-valid');await create(page).getByLabel('Request summary').fill('Synthetic description');
  await expect(create(page).getByRole('button',{name:'Create Intake request'})).toBeDisabled();
 });
 test('PPRIV-027 Valid creation posts ordinary fields without privileged lifecycle keys',async({page})=>{
  let payload:any;await openPrivacyRequests(page,{onCall:(m,p,q,body)=>{if(m==='POST'&&p===privacyRoot)payload=body;}});
  await fillMinimal(page);await create(page).getByRole('button',{name:'Create Intake request'}).click();
  await expect(root(page)).toContainText('Privacy request created in Intake.');await expect.poll(()=>Boolean(payload)).toBe(true);
  expect(payload.requester_email).toBe('new-request@fixture.test');expect(payload).not.toHaveProperty('status');
  expect(payload).not.toHaveProperty('resolution_notes');expect(payload).not.toHaveProperty('verified_at');
 });
 test('PPRIV-028 Create normalizes optional name and identifier to null',async({page})=>{
  let payload:any;await openPrivacyRequests(page,{onCall:(m,p,q,body)=>{if(m==='POST'&&p===privacyRoot)payload=body;}});
  await fillMinimal(page);await create(page).getByLabel('Requester name').fill('    ');
  await create(page).getByLabel('Subject identifier').fill('    ');await create(page).getByRole('button',{name:'Create Intake request'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);expect(payload.requester_name).toBeNull();expect(payload.subject_identifier).toBeNull();
 });
 test('PPRIV-029 Creation fields enforce source-defined length limits',async({page})=>{
  await openPrivacyRequests(page);await expect(create(page).getByLabel('Requester name')).toHaveAttribute('maxlength','200');
  await expect(create(page).getByLabel('Subject identifier')).toHaveAttribute('maxlength','255');
  await expect(create(page).getByLabel('Request summary')).toHaveAttribute('maxlength','4000');
 });
 test('PPRIV-030 Without tenant-read permission create omits tenant linkage key',async({page})=>{
  let payload:any;await openPrivacyRequests(page,{permissions:omit('platform.tenants.read'),onCall:(m,p,q,b)=>{if(m==='POST'&&p===privacyRoot)payload=b;}});
  await fillMinimal(page);await create(page).getByRole('button',{name:'Create Intake request'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);expect(payload).not.toHaveProperty('tenant_id');
 });
 test('PPRIV-031 Without user-read permission create omits assignee linkage key',async({page})=>{
  let payload:any;await openPrivacyRequests(page,{permissions:omit('platform.users.read'),onCall:(m,p,q,b)=>{if(m==='POST'&&p===privacyRoot)payload=b;}});
  await fillMinimal(page);await create(page).getByRole('button',{name:'Create Intake request'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);expect(payload).not.toHaveProperty('assigned_platform_user_id');
 });
 test('PPRIV-032 Inactive operator excluded from new assignment options',async({page})=>{
  await openPrivacyRequests(page);await expect(create(page).getByLabel('Assignee').locator('option')).toHaveCount(2);
  await expect(create(page).getByLabel('Assignee')).not.toContainText('inactive@fixture.test');
 });
 test('PPRIV-033 Editing an open item exposes current ordinary fields',async({page})=>{
  await openPrivacyRequests(page);await card(page,intakeRequest.requester_email).getByRole('button',{name:'Edit details'}).click();
  await expect(edit(page).getByLabel('Requester email')).toHaveValue(intakeRequest.requester_email);
  await expect(edit(page).getByLabel('Request summary')).toHaveValue(intakeRequest.summary);
 });
 test('PPRIV-034 Unchanged edit cannot be saved',async({page})=>{
  await openPrivacyRequests(page);await card(page,intakeRequest.requester_email).getByRole('button',{name:'Edit details'}).click();
  await expect(edit(page).getByRole('button',{name:'Save details'})).toBeDisabled();
 });
 test('PPRIV-035 Changed request summary PATCH excludes workflow status and closure fields',async({page})=>{
  let payload:any;let url='';await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'){url=p;payload=b;}}});
  await card(page,intakeRequest.requester_email).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByLabel('Request summary').fill('Updated synthetic subject summary');
  await edit(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>Boolean(payload)).toBe(true);
  expect(url).toBe(`${privacyRoot}/${privacyId}`);expect(payload).not.toHaveProperty('status');expect(payload).not.toHaveProperty('resolution_notes');
 });
 test('PPRIV-036 Cancel edit resets draft and restores create form',async({page})=>{
  await openPrivacyRequests(page);await card(page,intakeRequest.requester_email).getByRole('button',{name:'Edit details'}).click();
  await edit(page).getByRole('button',{name:'Cancel edit'}).click();await expect(create(page)).toBeVisible();
  await expect(create(page).getByLabel('Requester email')).toHaveValue('');
 });
 test('PPRIV-037 Starting verification posts an open workflow status rather than a normal edit',async({page})=>{
  let url='';let payload:any;await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/status')){url=p;payload=b;}}});
  await card(page,intakeRequest.requester_email).getByRole('button',{name:'Start verification'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);expect(url).toBe(`${privacyRoot}/${privacyId}/status`);expect(payload.status).toBe('verifying');
 });
 test('PPRIV-038 Record verification is guarded by an explicit confirmation',async({page})=>{
  const posts:string[]=[];await openPrivacyRequests(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/verify'))posts.push(p);}});
  page.once('dialog',dialog=>dialog.dismiss());await card(page,intakeRequest.requester_email).getByRole('button',{name:'Record verification'}).click();
  expect(posts).toHaveLength(0);
 });
 test('PPRIV-039 Fulfillment requires entered closure note before submission',async({page})=>{
  await openPrivacyRequests(page);const c=card(page,intakeRequest.requester_email);
  await expect(c.getByRole('button',{name:'Record fulfilled'})).toBeDisabled();
  await c.getByLabel('Action / closure note').fill('Synthetic fulfillment record');
  await expect(c.getByRole('button',{name:'Record fulfilled'})).toBeEnabled();
 });
 test('PPRIV-040 Reject requires explicit reason and confirmation before mutation',async({page})=>{
  const hits:string[]=[];await openPrivacyRequests(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/close'))hits.push(p);}});
  const c=card(page,intakeRequest.requester_email);await expect(c.getByRole('button',{name:'Reject'})).toBeDisabled();
  await c.getByLabel('Rejection reason').fill('Synthetic recorded rejection');
  page.once('dialog',dialog=>dialog.dismiss());await c.getByRole('button',{name:'Reject'}).click();expect(hits).toHaveLength(0);
 });
 test('PPRIV-041 Empty registry explicitly rejects inference about outside privacy requests',async({page})=>{
  await openPrivacyRequests(page,{records:[]});await expect(evidence(page)).toContainText('No matching application records.');
  await expect(evidence(page)).toContainText('does not prove that no external privacy/data-subject request exists');
 });
});

// Batch 87 continuation: source-traced synthetic UI declarations, deliberately NOT executed.
test.describe('Platform Privacy Requests — lifecycle continuation (BATCH_087_GENERATED_UNRUN)',()=>{
 test('PPRIV-042 Verification accepted posts trimmed optional notes to dedicated verify endpoint',async({page})=>{
  let body:any;let endpoint='';await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/verify')){endpoint=p;body=b;}}});
  const c=card(page,intakeRequest.requester_email);await c.getByLabel('Action / closure note').fill('  Reviewed fixture identity  ');
  page.once('dialog',d=>d.accept());await c.getByRole('button',{name:'Record verification'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(endpoint).toBe(`${privacyRoot}/${privacyId}/verify`);expect(body.notes).toBe('Reviewed fixture identity');
  await expect(root(page)).toContainText('Verification action recorded.');
 });
 test('PPRIV-043 Failed verification leaves open card and a repeatable verification control',async({page})=>{
  await openPrivacyRequests(page,{overrides:{[`POST ${privacyRoot}/${privacyId}/verify`]:{status:409,json:{message:'Fixture verification conflict'}}}});
  page.once('dialog',d=>d.accept());await card(page,intakeRequest.requester_email).getByRole('button',{name:'Record verification'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(card(page,intakeRequest.requester_email).getByRole('button',{name:'Record verification'})).toBeEnabled();
 });
 test('PPRIV-044 Wait for tenant posts status with recorded note',async({page})=>{
  let payload:any;await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${privacyRoot}/${privacyId}/status`)payload=b;}});
  const c=card(page,intakeRequest.requester_email);await c.getByLabel('Action / closure note').fill('  Tenant contacted  ');
  await c.getByRole('button',{name:'Wait for tenant'}).click();await expect.poll(()=>Boolean(payload)).toBe(true);
  expect(payload).toEqual({status:'waiting_tenant',note:'Tenant contacted'});
 });
 test('PPRIV-045 Resume in progress uses status mutation, not editable details',async({page})=>{
  let path='';let body:any;await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/status')){path=p;body=b;}}});
  await card(page,waitingRequest.requester_email).getByRole('button',{name:'Resume in progress'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(path).toBe(`${privacyRoot}/${waitingId}/status`);expect(body.status).toBe('in_progress');
 });
 test('PPRIV-046 Whitespace-only workflow note becomes null',async({page})=>{
  let payload:any;await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${privacyRoot}/${privacyId}/status`)payload=b;}});
  await card(page,intakeRequest.requester_email).getByLabel('Action / closure note').fill('   ');
  await card(page,intakeRequest.requester_email).getByRole('button',{name:'Wait for tenant'}).click();
  await expect.poll(()=>Boolean(payload)).toBe(true);expect(payload.note).toBeNull();
 });
 test('PPRIV-047 Fulfilled close requires confirmation and posts closure note, then becomes immutable',async({page})=>{
  let body:any;await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${privacyRoot}/${privacyId}/close`)body=b;}});
  const c=card(page,intakeRequest.requester_email);await c.getByLabel('Action / closure note').fill('  Fixture fulfilled  ');
  page.once('dialog',d=>d.accept());await c.getByRole('button',{name:'Record fulfilled'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body).toEqual({status:'fulfilled',resolution_notes:'Fixture fulfilled',rejection_reason:null});
  await expect(c).toContainText('Closed history is immutable.');
 });
 test('PPRIV-048 Rejection posts required reason independently of optional action note',async({page})=>{
  let body:any;await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${privacyRoot}/${privacyId}/close`)body=b;}});
  const c=card(page,intakeRequest.requester_email);await c.getByLabel('Rejection reason').fill('  Fixture cannot validate  ');
  page.once('dialog',d=>d.accept());await c.getByRole('button',{name:'Reject'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.status).toBe('rejected');expect(body.rejection_reason).toBe('Fixture cannot validate');
  await expect(c).toContainText('Fixture cannot validate');
 });
 test('PPRIV-049 Cancel close explicitly confirms terminal cancellation',async({page})=>{
  let body:any;await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===`${privacyRoot}/${privacyId}/close`)body=b;}});
  page.once('dialog',d=>d.accept());await card(page,intakeRequest.requester_email).getByRole('button',{name:'Cancel request'}).click();
  await expect.poll(()=>Boolean(body)).toBe(true);expect(body.status).toBe('cancelled');
  await expect(card(page,intakeRequest.requester_email)).toContainText('Closed history is immutable.');
 });
 test('PPRIV-050 Failed close does not display terminal record as successfully closed',async({page})=>{
  await openPrivacyRequests(page,{overrides:{[`POST ${privacyRoot}/${privacyId}/close`]:{status:409,json:{message:'Fixture closure rejected'}}}});
  const c=card(page,intakeRequest.requester_email);await c.getByLabel('Action / closure note').fill('Attempt closure');
  page.once('dialog',d=>d.accept());await c.getByRole('button',{name:'Record fulfilled'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(c).not.toContainText('Closed history is immutable.');
 });
 test('PPRIV-051 Closed record stays immutable across status filter refresh',async({page})=>{
  await openPrivacyRequests(page);await filters(page).getByLabel('Status').selectOption('fulfilled');
  await expect(card(page,closedRequest.requester_email)).toContainText('Closed history is immutable.');
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(card(page,closedRequest.requester_email).getByRole('button',{name:'Edit details'})).toHaveCount(0);
 });
 test('PPRIV-052 Dismiss clears a successful application-only feedback banner',async({page})=>{
  await openPrivacyRequests(page);await card(page,intakeRequest.requester_email).getByRole('button',{name:'Wait for tenant'}).click();
  const feedback=root(page).locator('.platform-privacy-requests__success');await expect(feedback).toBeVisible();
  await feedback.getByRole('button',{name:'Dismiss'}).click();await expect(feedback).toHaveCount(0);
 });
 test('PPRIV-053 In-flight workflow request disables competing workflow controls',async({page})=>{
  let release!:()=>void;const pending=new Promise<void>(r=>{release=r;});
  await openPrivacyRequests(page,{respond:async(m,p)=>{if(m==='POST'&&p===`${privacyRoot}/${privacyId}/status`){await pending;return {json:{...intakeRequest,status:'waiting_tenant'}};}return undefined;}});
  const c=card(page,intakeRequest.requester_email);await c.getByRole('button',{name:'Wait for tenant'}).click();
  try{await expect(c.getByRole('button',{name:'Start verification'})).toBeDisabled();}finally{release();}
 });
 test('PPRIV-054 Verifying status omits redundant Start verification action',async({page})=>{
  await openPrivacyRequests(page,{records:[{...intakeRequest,status:'verifying'}]});
  await expect(card(page,intakeRequest.requester_email).getByRole('button',{name:'Start verification'})).toHaveCount(0);
 });
 test('PPRIV-055 Recorded verification hides the duplicate verify action',async({page})=>{
  await openPrivacyRequests(page);await expect(card(page,waitingRequest.requester_email).getByRole('button',{name:'Record verification'})).toHaveCount(0);
 });
 test('PPRIV-056 Closure note is recorded application evidence, not proof of satisfaction',async({page})=>{
  await openPrivacyRequests(page);await expect(card(page,closedRequest.requester_email)).toContainText('Synthetic closure note');
  await expect(root(page).locator('.platform-privacy-requests__truth-note')).toContainText('do not prove external identity verification');
 });
 test('PPRIV-057 Rejection reason appears on rejected closed history',async({page})=>{
  await openPrivacyRequests(page,{records:[{...closedRequest,status:'rejected',rejection_reason:'Fixture recorded justification'}]});
  await expect(card(page,closedRequest.requester_email)).toContainText('Fixture recorded justification');
 });
 test('PPRIV-058 Restricted operator identities stay hidden while evidence presence survives',async({page})=>{
  await openPrivacyRequests(page,{permissions:omit('platform.users.read')});
  await expect(card(page,closedRequest.requester_email)).toContainText('Restricted verifier identity');
  await expect(card(page,closedRequest.requester_email)).toContainText('Restricted closer identity');
  await expect(root(page)).not.toContainText('operator@fixture.test');
 });
 test('PPRIV-059 Recorded overdue date does not imply statutory deadline violation',async({page})=>{
  await openPrivacyRequests(page);await expect(card(page,waitingRequest.requester_email)).toContainText('Recorded deadline overdue');
  await expect(root(page).locator('.platform-privacy-requests__truth-note')).toContainText('real-world statutory deadline');
 });
 test('PPRIV-060 Pagination Next requests offset fifty while filtered total remains 55',async({page})=>{
  const queries:string[]=[];await openPrivacyRequests(page,{records:manyPrivacyRequests(55),onCall:(m,p,q)=>{if(m==='GET'&&p===privacyRoot)queries.push(q.toString());}});
  await pagination(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(5);
  expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('50');await expect(pagination(page)).toContainText('55 filtered total');
 });
 test('PPRIV-061 Previous page returns to offset zero and first fifty rows',async({page})=>{
  await openPrivacyRequests(page,{records:manyPrivacyRequests(53)});await pagination(page).getByRole('button',{name:'Next'}).click();
  await expect(cards(page)).toHaveCount(3);await pagination(page).getByRole('button',{name:'Previous'}).click();
  await expect(cards(page)).toHaveCount(50);await expect(pagination(page)).toContainText('Page 1');
 });
 test('PPRIV-062 Changing search after Next resets offset to zero',async({page})=>{
  const queries:string[]=[];await openPrivacyRequests(page,{records:manyPrivacyRequests(60),onCall:(m,p,q)=>{if(m==='GET'&&p===privacyRoot)queries.push(q.toString());}});
  await pagination(page).getByRole('button',{name:'Next'}).click();await expect(cards(page)).toHaveCount(10);
  await filters(page).getByLabel('Search').fill('request-001');await expect(cards(page)).toHaveCount(1);
  expect(new URLSearchParams(queries.at(-1)).get('offset')).toBe('0');
 });
 test('PPRIV-063 Initial registry GET failure renders actionable retry, not fabricated records',async({page})=>{
  await openPrivacyRequests(page,{overrides:{[`GET ${privacyRoot}`]:{status:503,json:{message:'Synthetic privacy outage'}}}});
  await expect(evidence(page)).toContainText('Privacy requests could not be loaded.');
  await expect(evidence(page).getByRole('button',{name:'Retry'})).toBeVisible();await expect(cards(page)).toHaveCount(0);
 });
 test('PPRIV-064 Failed subsequent refetch retains last successful page and stale warning',async({page})=>{
  let calls=0;await openPrivacyRequests(page,{respond:(m,p)=>{if(m==='GET'&&p===privacyRoot&&++calls>1)return {status:503,json:{message:'Synthetic retry outage'}};return undefined;}});
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');await expect(card(page,intakeRequest.requester_email)).toBeVisible();
 });
 test('PPRIV-065 Refresh disables itself while registry refetch remains pending',async({page})=>{
  let calls=0;let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await openPrivacyRequests(page,{respond:async(m,p)=>{if(m==='GET'&&p===privacyRoot&&++calls>1){await gate;}return undefined;}});
  const refresh=root(page).locator('.platform-privacy-requests__hero-aside button');await refresh.click();
  try{await expect(refresh).toBeDisabled();}finally{release();}
 });
 test('PPRIV-066 Read-only Platform operator cannot submit any privacy mutation',async({page})=>{
  const writes:string[]=[];await openPrivacyRequests(page,{permissions:omit('platform.privacy.write'),onCall:(m,p)=>{if(p.startsWith(privacyRoot)&&m!=='GET')writes.push(`${m} ${p}`);}});
  await expect(create(page)).toHaveCount(0);await expect(card(page,intakeRequest.requester_email).locator('.platform-privacy-requests__workflow')).toHaveCount(0);
  expect(writes).toHaveLength(0);
 });
 test('PPRIV-067 Supporting operations links honor permission grants independently',async({page})=>{
  await openPrivacyRequests(page,{permissions:omit('platform.compliance.read','platform.access_reviews.read','platform.audit.read')});
  await expect(support(page).getByRole('link',{name:'Compliance documents'})).toHaveCount(0);
  await expect(support(page).getByRole('link',{name:'Access reviews'})).toHaveCount(0);
  await expect(support(page).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  await expect(support(page).getByRole('link',{name:'Tenants'})).toBeVisible();
 });
 test('PPRIV-068 Authorized card Tenant link retains scoped tenant UUID',async({page})=>{
  await openPrivacyRequests(page);await expect(card(page,intakeRequest.requester_email).getByRole('link',{name:'Tenant'})).toHaveAttribute('href',`/platform/tenants?tenant_id=${privacyTenant}`);
 });
 test('PPRIV-069 Without tenant/audit grants, both source links are absent',async({page})=>{
  await openPrivacyRequests(page,{permissions:omit('platform.tenants.read','platform.audit.read')});
  await expect(card(page,intakeRequest.requester_email).locator('.platform-privacy-requests__source-links a')).toHaveCount(0);
 });
 test('PPRIV-070 All statuses resets status filter and restores complete registry',async({page})=>{
  await openPrivacyRequests(page,{query:'status=fulfilled'});await expect(cards(page)).toHaveCount(1);
  await filters(page).getByLabel('Status').selectOption('');await expect(cards(page)).toHaveCount(3);
  expect(new URL(page.url()).searchParams.has('status')).toBe(false);
 });
 test('PPRIV-071 Local due-at input is serialized as ISO date-time on create',async({page})=>{
  let body:any;await openPrivacyRequests(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===privacyRoot)body=b;}});
  await fillMinimal(page);await create(page).getByLabel('Recorded due at').fill('2030-08-12T14:30');
  await create(page).getByRole('button',{name:'Create Intake request'}).click();await expect.poll(()=>Boolean(body)).toBe(true);
  expect(body.due_at).toBe(new Date('2030-08-12T14:30').toISOString());
 });
 test.skip('PPRIV-072 Source mismatch: date input has no independently testable invalid-date message',async({page})=>{
  // BLOCKED: date validation is combined with email/summary and native datetime-local sanitizes invalid input.
  // This test is intentionally not executable until a distinct due-date error path is implemented.
  await openPrivacyRequests(page);
  await create(page).getByLabel('Requester email').fill('valid@fixture.test');
  await create(page).getByLabel('Request summary').fill('Controlled fixture request');
  const due=create(page).getByLabel('Recorded due at');
  await due.fill('2030-02-03T10:30');
  await due.fill(''); // Must not invent an invalid date through a valid empty optional field.
  // Future frontend hardening must expose a uniquely labelled date-error state before this can be unskipped.
  await expect(create(page).locator('[data-testid="privacy-due-date-error"]')).toContainText('Invalid recorded due date');
 });
 test.skip('PPRIV-073 Backend Joi rejects invalid types and workflow fields — requires live disposable API',async()=>{});
 test.skip('PPRIV-074 PostgreSQL transactional lifecycle races/closed-record immutability — Phase 2',async()=>{});
 test.skip('PPRIV-075 Two-tenant permission and linkage isolation — independent live principals required',async()=>{});
 test.skip('PPRIV-076 Backend RBAC enforcement of privacy/read/write/reference grants — Phase 2',async()=>{});
 test.skip('PPRIV-077 Audit transaction rollback and durability — disposable PostgreSQL Phase 2',async()=>{});
 test.skip('PPRIV-078 External requester identity verification requires independent proof',async()=>{});
 test.skip('PPRIV-079 Legal-right fulfillment and statutory timeliness require external evidence',async()=>{});
 test.skip('PPRIV-080 Recipient delivery, receipt and legal compliance require independent external evidence',async()=>{});
});


/** Batch 147: privacy registry authorization and request-validation follow-up; no legal proof. */
test.describe('Platform Privacy Requests — Phase 1 gap follow-up B147',()=>{
 test('PPRIV-081 Unsupported request_type URL value prevents privacy registry GET',async({page})=>{
  const gets:string[]=[];await openPrivacyRequests(page,{query:'request_type=unknown',onCall:(method,path)=>{
   if(method==='GET'&&path===privacyRoot)gets.push(path);
  }});
  await expect(evidence(page)).toContainText('Invalid or unauthorized filter.');
  expect(gets).toEqual([]);
 });
 test('PPRIV-082 Without tenant-source grant the UI never fetches tenant selector records',async({page})=>{
  const gets:string[]=[];await openPrivacyRequests(page,{permissions:omit('platform.tenants.read'),onCall:(method,path)=>{
   if(method==='GET'&&path==='/platform/tenants')gets.push(path);
  }});
  await expect(filters(page)).toContainText('Tenant filter restricted');
  expect(gets).toEqual([]);
 });
 test('PPRIV-083 Without user-source grant the UI never fetches assignment identities',async({page})=>{
  const gets:string[]=[];await openPrivacyRequests(page,{permissions:omit('platform.users.read'),onCall:(method,path)=>{
   if(method==='GET'&&path==='/platform/users')gets.push(path);
  }});
  await expect(filters(page)).toContainText('Assignee filter restricted');
  expect(gets).toEqual([]);
 });
 test('PPRIV-084 Explicit false overdue URL is valid but does not add overdue=true to backend GET',async({page})=>{
  const calls:string[]=[];await openPrivacyRequests(page,{query:'overdue=false',onCall:(method,path,q)=>{
   if(method==='GET'&&path===privacyRoot)calls.push(q.toString());
  }});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  expect(new URLSearchParams(calls[0]).has('overdue')).toBe(false);
  await expect(cards(page)).toHaveCount(3);
 });
 test('PPRIV-085 Creation without an optional due date posts explicit null, not a synthetic deadline',async({page})=>{
  let body:any=null;await openPrivacyRequests(page,{onCall:(method,path,_q,payload)=>{
   if(method==='POST'&&path===privacyRoot)body=payload;
  }});
  await create(page).getByLabel('Requester email').fill('new@fixture.test');
  await create(page).getByLabel('Request summary').fill('Controlled access request');
  await create(page).getByRole('button',{name:'Create Intake request'}).click();
  await expect.poll(()=>body!==null).toBeTruthy();expect(body.due_at).toBeNull();
 });
 test('PPRIV-086 Failed intake creation retains the draft and shows an actionable error',async({page})=>{
  let attempts=0;await openPrivacyRequests(page,{respond:(method,path)=>{
   if(method==='POST'&&path===privacyRoot){attempts++;return {status:503,json:{message:'Synthetic create unavailable'}};}
   return undefined;
  }});
  await create(page).getByLabel('Requester email').fill('failed@fixture.test');
  await create(page).getByLabel('Request summary').fill('Do not lose this controlled draft');
  await create(page).getByRole('button',{name:'Create Intake request'}).click();
  await expect.poll(()=>attempts).toBe(1);
  await expect(root(page)).toContainText('Action failed.');
  await expect(create(page).getByLabel('Request summary')).toHaveValue('Do not lose this controlled draft');
  await expect(card(page,'failed@fixture.test')).toHaveCount(0);
 });
});
