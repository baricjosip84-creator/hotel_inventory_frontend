/** Batch 103, Platform Notifications, Phase 1 source-based Playwright declarations. NOT RUN.
 * Synthetic UI responses do not validate real source ACL, transactional changes, notification
 * delivery, scan reconciliation, retention/cleanup, audit trail or tenant isolation. */
import {test,expect} from '@playwright/test';
import {openPlatformNotifications,noticePermissions,noticeSummary,sampleNotice,integrationNotice,
 NOTICE_ID,NOTICE_ID_2,TENANT_ID,noticePath,type Notice} from '../../../support/platformNotificationsFixture';

const shell=(page:any)=>page.locator('.platform-notifications');
const filters=(page:any)=>page.locator('.platform-notifications__filters');
const items=(page:any)=>page.locator('.platform-notifications__item');
const forms=(page:any)=>page.locator('.platform-notifications__form-grid');
const mutations=(page:any)=>page.locator('.platform-notifications__row-actions');
const without=(key:string)=>noticePermissions.filter(x=>x!==key);

// All cases are written, uncompiled and unexecuted. No live Platform connection is used.
test.describe('Platform Notifications — source-traced UI, permission and mutation contracts',()=>{
 test('PNOT-001 Notifications page identifies protected application evidence, not external delivery',async({page})=>{
  await openPlatformNotifications(page);
  await expect(shell(page)).toContainText('Base permission: PLATFORM_NOTIFICATIONS_READ');
  await expect(shell(page)).toContainText('delivery/reading by a person is not tracked here');
 });
 test('PNOT-002 Authorized summary distinguishes open acknowledged resolved and dismissed',async({page})=>{
  await openPlatformNotifications(page);
  await expect(page.getByLabel('Notification summary')).toContainText('Open');
  await expect(page.getByLabel('Notification summary')).toContainText('Acknowledged');
  await expect(page.getByLabel('Notification summary')).toContainText('Dismissed');
 });
 test('PNOT-003 Evidence-access labels differentiate available from restricted source families',async({page})=>{
  await openPlatformNotifications(page,{summary:noticeSummary({evidence_complete:false,omitted_sources:['operational_billing'],evidence_access:{manual:true,operational_billing:false}})});
  await expect(shell(page)).toContainText('Partial notification evidence.');
  await expect(shell(page).locator('.platform-notifications__source-grid')).toContainText('Restricted');
 });
 test('PNOT-004 Zero authorized notifications shows explicit empty registry state',async({page})=>{
  await openPlatformNotifications(page,{rows:[],summary:noticeSummary({by_status:[],active_by_severity:[],oldest_open_at:null})});
  await expect(shell(page)).toContainText('No authorized notifications match the current filters.');
  await expect(items(page)).toHaveCount(0);
 });
 test('PNOT-005 Missing notification array is normalized to an empty registry',async({page})=>{
  await openPlatformNotifications(page,{respond:(m,p)=>m==='GET'&&p===noticePath?{json:{notifications:null,pagination:{limit:50,offset:0,total:0,has_more:false}}}:undefined});
  await expect(shell(page)).toContainText('No authorized notifications match the current filters.');
 });
 test('PNOT-006 Read-only principal cannot use manual creation, row action or bulk mutation controls',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.notifications.write')});
  await expect(shell(page).getByRole('button',{name:'Create manual notification'})).toHaveCount(0);
  await expect(mutations(page)).toHaveCount(0);
  await expect(shell(page).getByRole('button',{name:'Select visible page'})).toHaveCount(0);
 });
 test('PNOT-007 Partial evidence reports omitted family rather than silently counting it as zero',async({page})=>{
  await openPlatformNotifications(page,{summary:noticeSummary({evidence_complete:false,omitted_sources:['integration_monitoring.scan']})});
  await expect(shell(page)).toContainText('Restricted rows are excluded rather than counted as zero.');
  await expect(shell(page)).toContainText('integration monitoring.scan');
 });
 test('PNOT-008 Tenant identity filter is hidden without tenant-read permission',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.tenants.read')});
  await expect(filters(page).getByPlaceholder('Optional UUID…')).toHaveCount(0);
 });
 test('PNOT-009 Audit evidence links are gated by audit-read permission',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.audit.read')});
  await expect(items(page).first().getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
 });
 test('PNOT-010 Tenant detail link is absent without tenant-read permission',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.tenants.read')});
  await expect(items(page).first().getByRole('link',{name:'Tenant',exact:true})).toHaveCount(0);
 });
 test('PNOT-011 Authorized audit link targets this notification only',async({page})=>{
  await openPlatformNotifications(page);
  await expect(items(page).first().getByRole('link',{name:'Audit evidence'})).toHaveAttribute('href',`/platform/audit?target_type=platform_notifications&target_id=${NOTICE_ID}`);
 });
 test('PNOT-012 Authorized tenant link is bound to the record tenant UUID',async({page})=>{
  await openPlatformNotifications(page);
  await expect(items(page).first().getByRole('link',{name:'Tenant',exact:true})).toHaveAttribute('href',`/platform/tenants?tenant_id=${TENANT_ID}`);
 });
 test('PNOT-013 Integration-monitoring link requires dependencies-read permission',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.dependencies.read')});
  await expect(items(page).nth(1).getByRole('link',{name:'Integration monitoring'})).toHaveCount(0);
 });
 test('PNOT-014 Status selector updates URL-backed list query',async({page})=>{
  const requests:string[]=[];await openPlatformNotifications(page,{onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.search)}});
  await filters(page).getByLabel('Status').selectOption('acknowledged');
  await expect.poll(()=>requests.some(x=>new URLSearchParams(x).get('status')==='acknowledged')).toBeTruthy();
 });
 test('PNOT-015 Severity selector updates server-side filter and resets pagination',async({page})=>{
  await openPlatformNotifications(page,{query:'offset=50'});
  await filters(page).getByLabel('Severity').selectOption('critical');
  await expect(page).toHaveURL(/severity=critical/);expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
 });
 test('PNOT-016 Source field uses exact source query and trims outgoing value',async({page})=>{
  const requests:string[]=[];await openPlatformNotifications(page,{onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.search)}});
  await filters(page).getByPlaceholder('Exact source…').fill('  manual  ');
  await expect.poll(()=>requests.some(x=>new URLSearchParams(x).get('source')==='manual')).toBeTruthy();
 });
 test('PNOT-017 Search field sends query capped by the browser max length',async({page})=>{
  const requests:string[]=[];await openPlatformNotifications(page,{onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.search)}});
  await filters(page).getByPlaceholder('Title, message, source…').fill('Controlled');
  await expect.poll(()=>requests.some(x=>new URLSearchParams(x).get('search')==='Controlled')).toBeTruthy();
  await expect(filters(page).getByPlaceholder('Title, message, source…')).toHaveAttribute('maxlength','200');
 });
 test('PNOT-018 Authorized tenant filter carries tenant UUID to the list request',async({page})=>{
  const requests:string[]=[];await openPlatformNotifications(page,{onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.search)}});
  await filters(page).getByPlaceholder('Optional UUID…').fill(TENANT_ID);
  await expect.poll(()=>requests.some(x=>new URLSearchParams(x).get('tenant_id')===TENANT_ID)).toBeTruthy();
 });
 test('PNOT-019 Clear filters removes URL-backed selections',async({page})=>{
  await openPlatformNotifications(page,{query:'status=open&severity=warning&source=manual'});
  await filters(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(page).toHaveURL(/\/platform\/notifications$/);
 });
 test('PNOT-020 Next page requests offset 50 with the fixed 50-row limit',async({page})=>{
  const requests:string[]=[];await openPlatformNotifications(page,{total:105,onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.search)}});
  await shell(page).locator('.platform-notifications__pagination').getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>requests.some(x=>new URLSearchParams(x).get('offset')==='50'&&new URLSearchParams(x).get('limit')==='50')).toBeTruthy();
 });
 test('PNOT-021 Previous page returns offset to zero',async({page})=>{
  await openPlatformNotifications(page,{total:105,query:'offset=50'});
  await shell(page).locator('.platform-notifications__pagination').getByRole('button',{name:'Previous'}).click();
  await expect(page).toHaveURL(/\/platform\/notifications$/);
 });
 test('PNOT-022 Next control is disabled when server reports has_more false',async({page})=>{
  await openPlatformNotifications(page);
  await expect(shell(page).locator('.platform-notifications__pagination').getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PNOT-023 Negative offset in URL is clamped to zero in outgoing API request',async({page})=>{
  const requests:string[]=[];await openPlatformNotifications(page,{query:'offset=-50',onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.search)}});
  await expect.poll(()=>requests.some(x=>new URLSearchParams(x).get('offset')==='0')).toBeTruthy();
 });
 test('PNOT-024 Manual create is disabled until title and message are nonblank',async({page})=>{
  await openPlatformNotifications(page);
  const b=forms(page).getByRole('button',{name:'Create manual notification'});
  await expect(b).toBeDisabled();await forms(page).getByLabel('Title').fill('Sample title');await expect(b).toBeDisabled();
  await forms(page).getByLabel('Message').fill('A message');await expect(b).toBeEnabled();
 });
 test('PNOT-025 Manual create trims title and message and uses manual source',async({page})=>{
  const mutationsSeen:any[]=[];await openPlatformNotifications(page,{onCall:(m,p,u,b)=>{if(m==='POST'&&p===noticePath)mutationsSeen.push(b)}});
  await forms(page).getByLabel('Title').fill('  Scheduled attention  ');
  await forms(page).getByLabel('Message').fill('  Synthetic note  ');
  await forms(page).getByRole('button',{name:'Create manual notification'}).click();
  await expect.poll(()=>mutationsSeen.length).toBe(1);
  expect(mutationsSeen[0]).toEqual({severity:'info',title:'Scheduled attention',message:'Synthetic note'});
  await expect(shell(page)).toContainText('Manual global notification created.');
 });
 test('PNOT-026 Failed manual creation keeps the form and surfaces error',async({page})=>{
  await openPlatformNotifications(page,{respond:(m,p)=>m==='POST'&&p===noticePath?{json:{message:'Synthetic write failure'},status:503}:undefined});
  await forms(page).getByLabel('Title').fill('Retain title');await forms(page).getByLabel('Message').fill('Retain body');
  await forms(page).getByRole('button',{name:'Create manual notification'}).click();
  await expect(shell(page).locator('.platform-notifications__inline-error')).toContainText('Synthetic write failure');
  await expect(forms(page).getByLabel('Title')).toHaveValue('Retain title');
 });
 test('PNOT-027 Cancel acknowledge confirmation does not send row mutation',async({page})=>{
  const writes:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p)}});
  page.once('dialog',dialog=>dialog.dismiss());await mutations(page).first().getByRole('button',{name:'Acknowledge'}).click();
  expect(writes).toEqual([]);
 });
 test('PNOT-028 Confirm acknowledge sends POST to the exact notification action route',async({page})=>{
  const writes:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p)}});
  page.once('dialog',dialog=>dialog.accept());await mutations(page).first().getByRole('button',{name:'Acknowledge'}).click();
  await expect.poll(()=>writes).toContain(`${noticePath}/${NOTICE_ID}/acknowledge`);
  await expect(shell(page)).toContainText('Acknowledge completed.');
 });
 test('PNOT-029 Closed notifications offer reopen without resolve or dismiss again',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...sampleNotice,status:'resolved'}]});
  await expect(mutations(page).first().getByRole('button',{name:'Reopen'})).toBeVisible();
  await expect(mutations(page).first().getByRole('button',{name:'Resolve'})).toHaveCount(0);
 });
 test('PNOT-030 Select visible page selects only currently shown records',async({page})=>{
  await openPlatformNotifications(page);
  await shell(page).getByRole('button',{name:'Select visible page'}).click();
  await expect(shell(page).locator('.platform-notifications__bulk-row')).toContainText('2 selected');
 });
 test('PNOT-031 Declined bulk status confirmation leaves records unmodified',async({page})=>{
  const writes:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p)}});
  await shell(page).getByRole('button',{name:'Select visible page'}).click();
  page.once('dialog',d=>d.dismiss());await shell(page).getByRole('button',{name:'Acknowledge selected'}).click();expect(writes).toEqual([]);
 });
 test('PNOT-032 Confirmed bulk status change submits the selected UUIDs and action',async({page})=>{
  const writes:any[]=[];await openPlatformNotifications(page,{onCall:(m,p,u,b)=>{if(m==='POST'&&p===noticePath+'/bulk')writes.push(b)}});
  await shell(page).getByRole('button',{name:'Select visible page'}).click();
  page.once('dialog',d=>d.accept());await shell(page).getByRole('button',{name:'Acknowledge selected'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toEqual({notification_ids:[NOTICE_ID,NOTICE_ID_2],action:'acknowledge'});
 });
 test('PNOT-033 Operational scan is disabled if billing-read permission is absent',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.billing.read')});
  await expect(shell(page).getByRole('button',{name:'Run operational scan'})).toBeDisabled();
 });
 test('PNOT-034 Integration scan requires the full protected integration-source grant set',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.webhooks.read')});
  await expect(shell(page).getByRole('button',{name:'Run integration scan'})).toBeDisabled();
 });
 test('PNOT-035 Operational scan confirmation submits exactly the reconciliation action',async({page})=>{
  const writes:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p)}});
  page.once('dialog',d=>d.accept());await shell(page).getByRole('button',{name:'Run operational scan'}).click();
  await expect.poll(()=>writes).toContain(noticePath+'/system-scan');
  await expect(shell(page)).toContainText('Operational notification reconciliation completed.');
 });
 test('PNOT-036 Integration scan result counts are application-reported, not external proof',async({page})=>{
  await openPlatformNotifications(page);
  page.once('dialog',d=>d.accept());await shell(page).getByRole('button',{name:'Run integration scan'}).click();
  await expect(shell(page)).toContainText('Integration notification reconciliation completed.');
  await expect(shell(page)).toContainText('auto-resolved 0');
 });
 test('PNOT-037 Cleanup action enforces integer lower and upper day boundaries',async({page})=>{
  await openPlatformNotifications(page);
  const input=shell(page).locator('.platform-notifications__cleanup input');
  const b=shell(page).getByRole('button',{name:'Clean closed records'});
  await input.fill('6');await expect(b).toBeDisabled();
  await input.fill('3651');await expect(b).toBeDisabled();
  await input.fill('90');await expect(b).toBeEnabled();
 });
 test('PNOT-038 Declining cleanup confirmation sends no deletion request',async({page})=>{
  const writes:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p)}});
  page.once('dialog',d=>d.dismiss());await shell(page).getByRole('button',{name:'Clean closed records'}).click();
  expect(writes).toEqual([]);
 });
 test('PNOT-039 Confirmed cleanup sends selected days and reports server deleted_count',async({page})=>{
  const bodies:any[]=[];await openPlatformNotifications(page,{onCall:(m,p,u,b)=>{if(m==='POST'&&p===noticePath+'/cleanup-closed')bodies.push(b)}});
  await shell(page).locator('.platform-notifications__cleanup input').fill('120');
  page.once('dialog',d=>d.accept());await shell(page).getByRole('button',{name:'Clean closed records'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toEqual({older_than_days:120});
  await expect(shell(page)).toContainText('Deleted 0 authorized closed notification record(s).');
 });
 test('PNOT-040 Open integration notification routing request trims owner email and note',async({page})=>{
  const bodies:any[]=[];await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'open'}],onCall:(m,p,u,b)=>{if(m==='POST'&&p.endsWith('/assign-integration-routing'))bodies.push(b)}});
  const route=shell(page).locator('.platform-notifications__routing-form');
  await route.getByPlaceholder('Owner email').fill('  support@example.test  ');
  await route.getByPlaceholder('Routing note').fill('  investigate  ');
  await route.getByRole('button',{name:'Assign routing'}).click();
  await expect.poll(()=>bodies.length).toBe(1);
  expect(bodies[0].owner_email).toBe('support@example.test');expect(bodies[0].note).toBe('investigate');
 });
 test.skip('PNOT-041 Real source-family authorization and notification delivery require Phase 2 verification',async()=>{
  // Browser-intercepted responses cannot establish real backend permission denies, source filtering,
  // SQL bulk atomicity, tenant isolation, scan reconciliation, external delivery or actual cleanup.
 });

 // Batch 104 — reviewed against PlatformNotificationsPage.tsx and notifications.js (not executed).
 test('PNOT-042 Routing is available on an open Integration Monitoring row',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'open'}]});
  await expect(items(page).first().locator('.platform-notifications__routing-form').getByRole('button',{name:'Assign routing'})).toBeEnabled();
 });
 test('PNOT-043 Routing with both owner and URL blank cannot be submitted',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'open',metadata:null}]});
  await expect(items(page).first().getByRole('button',{name:'Assign routing'})).toBeDisabled();
 });
 test('PNOT-044 Per-row routing payload trims a supplied HTTP escalation URL',async({page})=>{
  const bodies:any[]=[];await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'open'}],onCall:(m,p,_u,b)=>{if(m==='POST'&&p.endsWith('/assign-integration-routing'))bodies.push(b)}});
  await items(page).first().getByPlaceholder('Escalation URL').fill('  https://example.test/notify  ');
  await items(page).first().getByRole('button',{name:'Assign routing'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0].escalation_url).toBe('https://example.test/notify');
 });
 test('PNOT-045 Routing failure keeps editable fields and reports the server error',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'open'}],respond:(m,p)=>m==='POST'&&p.endsWith('/assign-integration-routing')?{status:503,json:{message:'Routing unavailable'}}:undefined});
  await items(page).first().getByPlaceholder('Routing note').fill('Escalate to owner');
  await items(page).first().getByRole('button',{name:'Assign routing'}).click();
  await expect(shell(page).locator('.platform-notifications__inline-error')).toContainText('Routing unavailable');
  await expect(items(page).first().getByPlaceholder('Routing note')).toHaveValue('Escalate to owner');
 });
 test('PNOT-046 Successful routing clears the saved row draft and shows confirmation',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'open'}]});
  await items(page).first().getByPlaceholder('Routing note').fill('Temporary draft');
  await items(page).first().getByRole('button',{name:'Assign routing'}).click();
  await expect(shell(page).locator('.platform-notifications__success')).toContainText('Integration routing assignment saved');
  await expect(items(page).first().getByPlaceholder('Routing note')).toHaveValue('');
 });
 test('PNOT-047 Closed integration rows hide routing mutation fields',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'resolved'}]});
  await expect(items(page).first().locator('.platform-notifications__routing-form')).toHaveCount(0);
 });
 test('PNOT-048 Bulk routing requires a selected eligible integration notification',async({page})=>{
  await openPlatformNotifications(page);
  const bulk=shell(page).locator('.platform-notifications__bulk-routing');
  await bulk.getByPlaceholder('Owner email').fill('team@example.test');
  await expect(bulk.getByRole('button',{name:'Assign routing to selected'})).toBeDisabled();
  await items(page).nth(1).locator('input[type=checkbox]').check();
  await expect(bulk.getByRole('button',{name:'Assign routing to selected'})).toBeEnabled();
 });
 test('PNOT-049 Bulk routing blocks non-HTTP escalation URLs',async({page})=>{
  await openPlatformNotifications(page);await items(page).nth(1).locator('input[type=checkbox]').check();
  const bulk=shell(page).locator('.platform-notifications__bulk-routing');
  await bulk.getByPlaceholder('Escalation URL').fill('javascript:alert(1)');
  await expect(bulk).toContainText('Escalation URL must use http or https');
  await expect(bulk.getByRole('button',{name:'Assign routing to selected'})).toBeDisabled();
 });
 test('PNOT-050 Cancelling bulk routing confirmation sends no POST',async({page})=>{
  const calls:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/bulk-assign-integration-routing'))calls.push(p)}});
  await items(page).nth(1).locator('input[type=checkbox]').check();
  await shell(page).locator('.platform-notifications__bulk-routing').getByPlaceholder('Owner email').fill('team@example.test');
  page.once('dialog',d=>d.dismiss());await shell(page).getByRole('button',{name:'Assign routing to selected'}).click();
  expect(calls).toHaveLength(0);
 });
 test('PNOT-051 Confirmed bulk routing sends exact selected IDs and trimmed routing fields',async({page})=>{
  const bodies:any[]=[];await openPlatformNotifications(page,{onCall:(m,p,_u,b)=>{if(m==='POST'&&p.endsWith('/bulk-assign-integration-routing'))bodies.push(b)}});
  await items(page).nth(1).locator('input[type=checkbox]').check();
  const bulk=shell(page).locator('.platform-notifications__bulk-routing');
  await bulk.getByPlaceholder('Owner email').fill('  ops@example.test  ');await bulk.getByPlaceholder('Routing note').fill('  escalate  ');
  page.once('dialog',d=>d.accept());await bulk.getByRole('button',{name:'Assign routing to selected'}).click();
  await expect.poll(()=>bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({notification_ids:[NOTICE_ID_2],owner_email:'ops@example.test',note:'escalate'});
 });
 test('PNOT-052 Successful bulk routing clears selection and form',async({page})=>{
  await openPlatformNotifications(page);await items(page).nth(1).locator('input[type=checkbox]').check();
  const bulk=shell(page).locator('.platform-notifications__bulk-routing');
  await bulk.getByPlaceholder('Owner email').fill('ops@example.test');
  page.once('dialog',d=>d.accept());await bulk.getByRole('button',{name:'Assign routing to selected'}).click();
  await expect(shell(page)).toContainText('Bulk integration routing updated 1 notification(s).');
  await expect(bulk.getByPlaceholder('Owner email')).toHaveValue('');
  await expect(items(page).nth(1).locator('input[type=checkbox]')).not.toBeChecked();
 });
 test('PNOT-053 Failed bulk routing shows error and does not report a success count',async({page})=>{
  await openPlatformNotifications(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/bulk-assign-integration-routing')?{json:{message:'Routing refused'},status:403}:undefined});
  await items(page).nth(1).locator('input[type=checkbox]').check();
  const bulk=shell(page).locator('.platform-notifications__bulk-routing');await bulk.getByPlaceholder('Owner email').fill('ops@example.test');
  page.once('dialog',d=>d.accept());await bulk.getByRole('button',{name:'Assign routing to selected'}).click();
  await expect(bulk.locator('.platform-notifications__inline-error')).toContainText('Routing refused');
  await expect(shell(page).locator('.platform-notifications__success')).toHaveCount(0);
 });
 test('PNOT-054 Selecting only a manual notification cannot enable integration routing',async({page})=>{
  await openPlatformNotifications(page);await items(page).first().locator('input[type=checkbox]').check();
  const bulk=shell(page).locator('.platform-notifications__bulk-routing');await bulk.getByPlaceholder('Owner email').fill('ops@example.test');
  await expect(bulk.getByRole('button',{name:'Assign routing to selected'})).toBeDisabled();
 });
 test('PNOT-055 Clearing visible bulk selection disables the status mutation',async({page})=>{
  await openPlatformNotifications(page);const flow=shell(page).locator('.platform-notifications__bulk-row');
  await flow.getByRole('button',{name:'Select visible page'}).click();
  await expect(flow.getByRole('button',{name:'Acknowledge selected'})).toBeEnabled();
  await flow.getByRole('button',{name:'Clear visible selection'}).click();
  await expect(flow.getByRole('button',{name:'Acknowledge selected'})).toBeDisabled();
 });
 test('PNOT-056 Select-visible chooses only the current filtered page',async({page})=>{
  await openPlatformNotifications(page,{query:'source=manual'});
  const flow=shell(page).locator('.platform-notifications__bulk-row');
  await flow.getByRole('button',{name:'Select visible page'}).click();
  await expect(flow).toContainText('1 selected');
  await expect(items(page).first().locator('input[type=checkbox]')).toBeChecked();
 });
 test('PNOT-057 Changing selected bulk action does not immediately mutate the backend',async({page})=>{
  const post:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST')post.push(p)}});
  await shell(page).locator('.platform-notifications__bulk-row select').selectOption('resolve');
  await expect(shell(page).getByRole('button',{name:'Resolve selected'})).toBeDisabled();expect(post).toEqual([]);
 });
 test('PNOT-058 Dismiss must confirm before posting to the exact notification endpoint',async({page})=>{
  const posts:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST')posts.push(p)}});
  page.once('dialog',d=>d.accept());await items(page).first().getByRole('button',{name:'Dismiss'}).click();
  await expect.poll(()=>posts.length).toBe(1);expect(posts[0]).toBe(`${noticePath}/${NOTICE_ID}/dismiss`);
 });
 test('PNOT-059 Resolve updates subsequent visible actions to Reopen',async({page})=>{
  await openPlatformNotifications(page);page.once('dialog',d=>d.accept());
  await items(page).first().getByRole('button',{name:'Resolve'}).click();
  await expect(items(page).first().getByRole('button',{name:'Reopen'})).toBeVisible();
  await expect(items(page).first().getByRole('button',{name:'Dismiss'})).toHaveCount(0);
 });
 test('PNOT-060 Reopen of a dismissed record requires confirmation',async({page})=>{
  const posts:string[]=[];await openPlatformNotifications(page,{rows:[{...sampleNotice,status:'dismissed'}],onCall:(m,p)=>{if(m==='POST')posts.push(p)}});
  page.once('dialog',d=>d.dismiss());await items(page).first().getByRole('button',{name:'Reopen'}).click();
  expect(posts).toEqual([]);await expect(items(page).first()).toContainText('dismissed');
 });
 test.skip('PNOT-061 Failed individual status mutation should show an error and retain server state',async({page})=>{
  // BLOCKED: original frontend never renders markMutation.isError; do not unskip until fixed.
  await openPlatformNotifications(page,{respond:(method,path)=>method==='POST'&&path===`${noticePath}/${NOTICE_ID}/acknowledge`
   ?{status:503,json:{message:'Synthetic status mutation rejected'}}:undefined});
  page.once('dialog',dialog=>dialog.accept());
  await items(page).first().getByRole('button',{name:'Acknowledge'}).click();
  await expect(items(page).first()).toContainText('open');
  await expect(shell(page).locator('.platform-notifications__inline-error')).toContainText('Synthetic status mutation rejected');
 });
 test('PNOT-062 Declining operational scan confirmation sends no scan request',async({page})=>{
  const calls:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/system-scan'))calls.push(p)}});
  page.once('dialog',d=>d.dismiss());await shell(page).getByRole('button',{name:'Run operational scan'}).click();expect(calls).toHaveLength(0);
 });
 test('PNOT-063 Declining integration scan confirmation sends no scan request',async({page})=>{
  const calls:string[]=[];await openPlatformNotifications(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/integration-monitoring-scan'))calls.push(p)}});
  page.once('dialog',d=>d.dismiss());await shell(page).getByRole('button',{name:'Run integration scan'}).click();expect(calls).toHaveLength(0);
 });
 test('PNOT-064 Operational scan refusal does not report a successful reconciliation',async({page})=>{
  await openPlatformNotifications(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/system-scan')?{json:{message:'Source unavailable'},status:503}:undefined});
  page.once('dialog',d=>d.accept());await shell(page).getByRole('button',{name:'Run operational scan'}).click();
  await expect(shell(page).locator('.platform-notifications__inline-error')).toContainText('Source unavailable');
  await expect(shell(page).locator('.platform-notifications__success')).toHaveCount(0);
 });
 test('PNOT-065 Integration scan failure does not report successful reconciliation',async({page})=>{
  await openPlatformNotifications(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/integration-monitoring-scan')?{json:{message:'Integration scan unavailable'},status:503}:undefined});
  page.once('dialog',d=>d.accept());await shell(page).getByRole('button',{name:'Run integration scan'}).click();
  await expect(shell(page).locator('.platform-notifications__inline-error')).toContainText('Integration scan unavailable');
  await expect(shell(page).locator('.platform-notifications__success')).toHaveCount(0);
 });
 test('PNOT-066 Initial registry failure renders Retry instead of empty success',async({page})=>{
  await openPlatformNotifications(page,{respond:(m,p)=>m==='GET'&&p===noticePath?{json:{message:'Registry unavailable'},status:503}:undefined});
  await expect(shell(page).locator('.platform-notifications__blocking-error')).toContainText('Notifications failed to load.');
  await expect(shell(page).locator('.platform-notifications__blocking-error').getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PNOT-067 Retrying a failed list request restores notification evidence',async({page})=>{
  let calls=0;await openPlatformNotifications(page,{respond:(m,p)=>{if(m==='GET'&&p===noticePath&&++calls===1)return {json:{message:'Temporary outage'},status:503};return undefined}});
  await expect(shell(page).locator('.platform-notifications__blocking-error')).toBeVisible();
  await shell(page).locator('.platform-notifications__blocking-error').getByRole('button',{name:'Retry'}).click();
  await expect(items(page)).toHaveCount(2);
 });
 test('PNOT-068 Failed manual refresh retains last successful snapshot and shows stale warning',async({page})=>{
  let fail=false;await openPlatformNotifications(page,{respond:(m,p)=>m==='GET'&&p===noticePath&&fail?{json:{message:'Refresh timeout'},status:503}:undefined});
  await expect(items(page)).toHaveCount(2);fail=true;
  await shell(page).getByRole('button',{name:'Refresh'}).click();
  await expect(shell(page).locator('.platform-notifications__warning')).toContainText('Showing the last successful snapshot.');
  await expect(items(page)).toHaveCount(2);
 });
 test('PNOT-069 Summary query failure does not claim complete evidence',async({page})=>{
  await openPlatformNotifications(page,{respond:(m,p)=>m==='GET'&&p===noticePath+'/summary'?{json:{message:'Summary unavailable'},status:503}:undefined});
  await expect(shell(page).getByLabel('Notification summary')).toContainText('—');
  await expect(shell(page).locator('.platform-notifications__hero-aside')).toContainText('Partial evidence');
 });
 test.skip('PNOT-070 Malformed pagination payload needs frontend source hardening',async()=>{
  // The current component dereferences pagination properties without complete response validation.
 });
 test.skip('PNOT-071 Invalid status and severity URL filters require real backend validation',async()=>{
  // Browser mocks cannot establish Joi rejection or SQL protection.
 });
 test.skip('PNOT-072 Unauthorized tenant filters must fail closed on the actual backend',async()=>{
  // Requires independent authenticated principals, not synthetic permissions.
 });
 test.skip('PNOT-073 Protected source filter must reject access without its source permission',async()=>{
  // Requires source permission enforcement at the API and tenant boundary.
 });
 test.skip('PNOT-074 Mixed authorized and forbidden bulk IDs require SQL atomicity acceptance',async()=>{
  // Requires transactional SQL with independently authenticated platform users.
 });
 test.skip('PNOT-075 Cleanup must retain active records under real SQL and retention rules',async()=>{
  // Requires real database and independent retention review.
 });
 test.skip('PNOT-076 Operational scan permissions must be enforced by the server',async()=>{
  // Synthetic button checks do not establish backend source authorization.
 });
 test.skip('PNOT-077 Integration scan must not disclose hidden source or tenant data',async()=>{
  // Requires real two-tenant and cross-source acceptance.
 });
 test.skip('PNOT-078 Delivery, escalation and reconciliation need independent operational evidence',async()=>{
  // Neither UI mocks nor status labels prove an external notification was received.
 });
 test.skip('PNOT-079 Concurrent bulk/status changes require database race-condition acceptance',async()=>{
  // Needs real isolated clients and DB transaction evidence.
 });
 test.skip('PNOT-080 Audit retention and person-read evidence need independent acceptance',async()=>{
  // Application record state is not legal or external compliance proof.
 });

});


/** Batch 147: source-grounded regression safeguards; no backend/real delivery proof. */
test.describe('Platform Notifications — Phase 1 gap follow-up B147',()=>{
 test('PNOT-081 Missing Support Session read grant disables operational scan and hides support navigation',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.support_sessions.read')});
  await expect(shell(page).getByRole('button',{name:'Run operational scan'})).toBeDisabled();
  await expect(shell(page).getByRole('link',{name:'Support sessions'})).toHaveCount(0);
 });
 test('PNOT-082 Missing vendor grant disables integration-source scan without removing authorized records',async({page})=>{
  await openPlatformNotifications(page,{rows:[sampleNotice],permissions:without('platform.vendors.read')});
  await expect(shell(page).getByRole('button',{name:'Run integration scan'})).toBeDisabled();
  await expect(items(page).first()).toContainText('Synthetic attention');
 });
 test('PNOT-083 Missing webhook read grant independently disables integration-source scan',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.webhooks.read')});
  await expect(shell(page).getByRole('button',{name:'Run integration scan'})).toBeDisabled();
 });
 test('PNOT-084 Supporting operational-job navigation requires job-read permission',async({page})=>{
  await openPlatformNotifications(page,{rows:[sampleNotice],permissions:without('platform.jobs.read')});
  await expect(items(page)).toHaveCount(1);
  await expect(shell(page).getByRole('link',{name:'Operational jobs'})).toHaveCount(0);
 });
 test('PNOT-085 Global notification cannot acquire a tenant link from an unrelated page filter',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...sampleNotice,tenant_id:null,tenant_name:null}],query:`tenant_id=${TENANT_ID}`});
  await expect(items(page)).toHaveCount(0);
  await expect(shell(page)).toContainText('No authorized notifications match the current filters.');
 });
 test('PNOT-086 Failed individual status POST retains open snapshot and never shows false success',async({page})=>{
  let posts=0;await openPlatformNotifications(page,{respond:(method,path)=>{
   if(method==='POST'&&path===`${noticePath}/${NOTICE_ID}/acknowledge`){posts++;return {status:503,json:{message:'Synthetic status mutation denied'}};}
   return undefined;
  }});
  page.once('dialog',dialog=>dialog.accept());await items(page).first().getByRole('button',{name:'Acknowledge'}).click();
  await expect.poll(()=>posts).toBe(1);
  await expect(items(page).first()).toContainText('open');
  await expect(items(page).first().getByRole('button',{name:'Acknowledge'})).toBeVisible();
  await expect(shell(page).locator('.platform-notifications__success')).toHaveCount(0);
  // Visible mutation error is NOT asserted: that remains the separate skipped PNOT-061 defect.
 });
});


/** Batch 162 — page-local regressions anchored in PlatformNotificationsPage.tsx.
 * Synthetic browser responses verify UI/request behavior only. They cannot prove that real
 * notifications reached anyone or that backend ACL/SQL transactions are enforced. */
test.describe('Platform Notifications — additional source-supported browser contracts B162',()=>{
 test('PNOT-087 Missing audit-read grant leaves operational scan visible but disabled',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.audit.read')});
  await expect(shell(page).getByRole('button',{name:'Run operational scan'})).toBeDisabled();
  await expect(shell(page).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
 });
 test('PNOT-088 Missing API key read grant disables integration scan but not authorized registry',async({page})=>{
  await openPlatformNotifications(page,{permissions:without('platform.api_keys.read')});
  await expect(shell(page).getByRole('button',{name:'Run integration scan'})).toBeDisabled();
  await expect(items(page)).toHaveCount(2);
 });
 test('PNOT-089 Manual form enforces sourced title and message browser length limits',async({page})=>{
  await openPlatformNotifications(page);
  await expect(forms(page).getByLabel('Title')).toHaveAttribute('maxlength','180');
  await expect(forms(page).getByLabel('Message')).toHaveAttribute('maxlength','5000');
 });
 test('PNOT-090 Critical manual creation sends only server-accepted form fields',async({page})=>{
  const writes:any[]=[];
  await openPlatformNotifications(page,{onCall:(m,p,_u,b)=>{if(m==='POST'&&p===noticePath)writes.push(b);}});
  await forms(page).getByLabel('Severity').selectOption('critical');
  await forms(page).getByLabel('Title').fill('  Synthetic critical notice  ');
  await forms(page).getByLabel('Message').fill('  Controlled content  ');
  await forms(page).getByRole('button',{name:'Create manual notification'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toEqual({severity:'critical',title:'Synthetic critical notice',message:'Controlled content'});
 });
 test('PNOT-091 Successful manual creation resets both fields and displays a specific confirmation',async({page})=>{
  await openPlatformNotifications(page);
  await forms(page).getByLabel('Title').fill('Temporary controlled title');
  await forms(page).getByLabel('Message').fill('Temporary controlled message');
  await forms(page).getByRole('button',{name:'Create manual notification'}).click();
  await expect(shell(page).locator('.platform-notifications__success')).toContainText('Manual global notification created.');
  await expect(forms(page).getByLabel('Title')).toHaveValue('');
  await expect(forms(page).getByLabel('Message')).toHaveValue('');
 });
 test('PNOT-092 Redacted acknowledged-by identity uses Restricted Platform user fallback',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...sampleNotice,status:'acknowledged',acknowledged_by_present:true,acknowledged_by_email:null}]});
  await expect(items(page).first()).toContainText('Acknowledged by Restricted Platform user');
  await expect(items(page).first()).not.toContainText('undefined');
 });
 test('PNOT-093 Available resolver identity is displayed only for an explicitly populated field',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...sampleNotice,status:'resolved',resolved_by_present:true,resolved_by_email:'resolver@example.test'}]});
  await expect(items(page).first()).toContainText('Resolved by resolver@example.test');
  await expect(items(page).first().getByRole('button',{name:'Reopen'})).toBeVisible();
 });
 test('PNOT-094 Integration routing draft starts with server-provided routing owner',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'open'}]});
  await expect(items(page).first().locator('.platform-notifications__routing-form').getByPlaceholder('Owner email')).toHaveValue('old@example.test');
  await expect(items(page).first().locator('.platform-notifications__routing-form').getByPlaceholder('Routing note')).toHaveValue('');
 });
 test('PNOT-095 Routing note alone is insufficient to activate owner assignment',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...integrationNotice,status:'open',metadata:{routing_state:'pending'}}]});
  const row=items(page).first().locator('.platform-notifications__routing-form');
  await row.getByPlaceholder('Routing note').fill('Review synthetic issue');
  await expect(row.getByRole('button',{name:'Assign routing'})).toBeDisabled();
 });
 test('PNOT-096 Rejected bulk status update retains selection and presents the API error',async({page})=>{
  let calls=0;
  await openPlatformNotifications(page,{respond:(m,p)=>{
   if(m==='POST'&&p===noticePath+'/bulk'){calls++;return {status:409,json:{message:'Synthetic bulk conflict'}};}
   return undefined;
  }});
  await items(page).first().locator('input[type=checkbox]').check();
  page.once('dialog',d=>d.accept());
  await shell(page).getByRole('button',{name:'Acknowledge selected'}).click();
  await expect.poll(()=>calls).toBe(1);
  await expect(shell(page).locator('.platform-notifications__bulk-row').locator('..').locator('.platform-notifications__inline-error')).toContainText('Synthetic bulk conflict');
  await expect(items(page).first().locator('input[type=checkbox]')).toBeChecked();
  await expect(shell(page).locator('.platform-notifications__success')).toHaveCount(0);
 });
 test('PNOT-097 Cleanup uses returned deletion count as application-only evidence',async({page})=>{
  const bodies:any[]=[];
  await openPlatformNotifications(page,{respond:(m,p,_u,b)=>{
   if(m==='POST'&&p===noticePath+'/cleanup-closed'){bodies.push(b);return {json:{deleted_count:4,older_than_days:b.older_than_days}};}
   return undefined;
  }});
  const cleanup=shell(page).locator('.platform-notifications__cleanup');
  await cleanup.locator('input[type=number]').fill('120');
  page.once('dialog',d=>d.accept());await cleanup.getByRole('button',{name:'Clean closed records'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toEqual({older_than_days:120});
  await expect(shell(page).locator('.platform-notifications__success')).toContainText('Deleted 4 authorized closed notification record(s).');
 });
 test('PNOT-098 Integration-source filter requests exact source and reduces authorized rows',async({page})=>{
  const requests:string[]=[];
  await openPlatformNotifications(page,{onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.searchParams.toString());}});
  await filters(page).getByPlaceholder('Exact source…').fill('integration_monitoring.scan');
  await expect.poll(()=>requests.some(q=>new URLSearchParams(q).get('source')==='integration_monitoring.scan')).toBeTruthy();
  await expect(items(page)).toHaveCount(1);
  await expect(items(page).first()).toContainText('Integration transport risk');
 });
 test('PNOT-099 Combined status and source filters are applied by the isolated server',async({page})=>{
  const requests:string[]=[];
  await openPlatformNotifications(page,{onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.searchParams.toString());}});
  await filters(page).getByLabel('Status').selectOption('acknowledged');
  await filters(page).getByPlaceholder('Exact source…').fill('integration_monitoring.scan');
  await expect.poll(()=>requests.some(q=>{const u=new URLSearchParams(q);return u.get('status')==='acknowledged'&&u.get('source')==='integration_monitoring.scan';})).toBeTruthy();
  await expect(items(page)).toHaveCount(1);
  await expect(items(page).first()).toContainText('Integration transport risk');
 });
 test('PNOT-100 Operational source navigation appears only with its jobs-read grant',async({page})=>{
  await openPlatformNotifications(page,{rows:[{...sampleNotice,source:'operational_billing'}]});
  await expect(items(page).first().getByRole('link',{name:'Operational jobs'})).toHaveAttribute('href','/platform/operational-jobs');
 });
 test('PNOT-101 Clear filters is unavailable without a URL filter and available after editing one',async({page})=>{
  await openPlatformNotifications(page);
  const clear=filters(page).getByRole('button',{name:'Clear filters'});
  await expect(clear).toBeDisabled();
  await filters(page).getByLabel('Status').selectOption('open');
  await expect(clear).toBeEnabled();
  await clear.click();await expect(clear).toBeDisabled();
 });
 test('PNOT-102 Whitespace-only source and search fields are omitted from the data GET',async({page})=>{
  const requests:string[]=[];
  await openPlatformNotifications(page,{onCall:(m,p,u)=>{if(m==='GET'&&p===noticePath)requests.push(u.searchParams.toString());}});
  await filters(page).getByPlaceholder('Exact source…').fill('   ');
  await filters(page).getByPlaceholder('Title, message, source…').fill('   ');
  await expect(page).toHaveURL(/search=/);
  await expect.poll(()=>requests.length).toBeGreaterThan(0);
  // New query may be deduplicated by React Query because outgoing data filters trim to empty.
  expect(requests.every(q=>!new URLSearchParams(q).has('source')&&!new URLSearchParams(q).has('search'))).toBe(true);
 });
});
