/** Batch 98 — Platform Billing, source-backed synthetic browser contracts only.
 * No live commercial payment, invoice, provider signature, PostgreSQL commit,
 * authorization, webhook delivery or bank settlement is validated.
 * Phase 1: not compiled, executed, or browser-verified. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformBilling,billingPath,billingPermissions,billingTenantA,billingTenantB,
 billingTenantC,billingTenantD,billingTenants,manyBillingTenants} from '../../../support/platformBillingFixture';
const root=(page:Page)=>page.locator('.platform-billing');
const table=(page:Page)=>root(page).locator('.platform-billing__table');
const rows=(page:Page)=>table(page).locator('tbody tr');
const status=(page:Page)=>root(page).locator('.platform-billing__filters').getByLabel('Status',{exact:true});
const search=(page:Page)=>root(page).locator('.platform-billing__filters').getByLabel('Search',{exact:true});
const next=(page:Page)=>root(page).getByRole('button',{name:'Next',exact:true});
const prev=(page:Page)=>root(page).getByRole('button',{name:'Previous',exact:true});
const without=(...perms:string[])=>billingPermissions.filter(x=>!perms.includes(x));
const workbench=(page:Page)=>root(page).locator('.platform-billing__workbench-grid');
const card=(page:Page,name:string)=>workbench(page).locator('.platform-billing__card').filter({has:page.getByRole('heading',{name,exact:true})});
const selected=`tenant_id=${billingTenantA}`;
test.describe('Platform Billing — application evidence only (BATCH_098_GENERATED_UNRUN)',()=>{
 test('PBL-001 Registry distinguishes billing posture from external payment proof',async({page})=>{
  await openPlatformBilling(page);await expect(root(page)).toContainText('without confusing internal records with external settlement');
  await expect(root(page)).toContainText('does not independently prove an invoice was sent');
 });
 test('PBL-002 Missing billing-read grant blocks the page before billing GET',async({page})=>{
  let calls=0;await openPlatformBilling(page,{permissions:without('platform.billing.read'),expectHeading:false,onCall:(m,p)=>{if(m==='GET'&&p===billingPath)calls++;}});
  await expect(root(page)).toHaveCount(0);expect(calls).toBe(0);
 });
 test('PBL-003 Missing tenants-read grant blocks the route before registry GET',async({page})=>{
  let calls=0;await openPlatformBilling(page,{permissions:without('platform.tenants.read'),expectHeading:false,onCall:(m,p)=>{if(m==='GET'&&p===billingPath)calls++;}});
  await expect(root(page)).toHaveCount(0);expect(calls).toBe(0);
 });
 test('PBL-004 Registry request uses workspace mode, limit 50 and offset zero',async({page})=>{
  const q:string[]=[];await openPlatformBilling(page,{onCall:(m,p,params)=>{if(m==='GET'&&p===billingPath)q.push(params.toString());}});
  expect(q.some(x=>x.includes('workspace=true')&&x.includes('limit=50')&&x.includes('offset=0'))).toBe(true);
 });
 test('PBL-005 Summary reports server-wide filter totals not visible row count',async({page})=>{
  await openPlatformBilling(page,{records:manyBillingTenants(54)});await expect(rows(page)).toHaveCount(50);
  await expect(root(page)).toContainText('Showing 1–50 of 54');await expect(root(page).getByText('Matching tenants')).toBeVisible();
 });
 test('PBL-006 State badges preserve active trialing past due and cancelled',async({page})=>{
  await openPlatformBilling(page);await expect(rows(page)).toHaveCount(4);
  for(const value of ['active','trialing','past due','cancelled'])await expect(table(page)).toContainText(value);
 });
 test('PBL-007 Past due and cancelled application states are attention indicators',async({page})=>{
  await openPlatformBilling(page);await expect(rows(page).filter({hasText:'Fixture Billing Gamma'}).locator('[data-tone="danger"]')).toBeVisible();
  await expect(rows(page).filter({hasText:'Fixture Billing Delta'}).locator('[data-tone="danger"]')).toBeVisible();
 });
 test('PBL-008 Provider readiness displays health as application evidence only',async({page})=>{
  await openPlatformBilling(page);await expect(root(page)).toContainText('payment-provider webhook application evidence');
  await expect(root(page)).toContainText('healthy');
 });
 test('PBL-009 Readiness distinguishes enabled providers and missing secrets',async({page})=>{
  await openPlatformBilling(page);await expect(root(page)).toContainText('Enabled providers: stripe');
  await expect(root(page)).toContainText('Missing secret: none');
 });
 test('PBL-010 Accepted provider events are not represented as bank settlements',async({page})=>{
  await openPlatformBilling(page);await expect(root(page)).toContainText('does not prove bank settlement');
 });
 test('PBL-011 Status selection exposes the backend billing lifecycle values',async({page})=>{
  await openPlatformBilling(page);for(const value of ['not_configured','trialing','active','past_due','cancelled','comped'])
   await expect(status(page).locator(`option[value="${value}"]`)).toHaveCount(1);
 });
 test('PBL-012 Status filter becomes URL parameter and reduces rows',async({page})=>{
  await openPlatformBilling(page);await status(page).selectOption('past_due');await expect(page).toHaveURL(/status=past_due/);
  await expect(rows(page)).toHaveCount(1);await expect(table(page)).toContainText('Fixture Billing Gamma');
 });
 test('PBL-013 Plan search is applied by the registry backend',async({page})=>{
  await openPlatformBilling(page);await search(page).fill('STARTER');await expect(rows(page)).toHaveCount(1);
  await expect(table(page)).toContainText('Fixture Billing Beta');
 });
 test('PBL-014 Location search resolves the matching synthetic tenant only',async({page})=>{
  await openPlatformBilling(page);await search(page).fill('Split');await expect(rows(page)).toHaveCount(1);
  await expect(table(page)).toContainText('Fixture Billing Gamma');
 });
 test('PBL-015 Invalid URL status suppresses registry GET and shows validation',async({page})=>{
  let gets=0;await openPlatformBilling(page,{query:'status=unsupported',onCall:(m,p)=>{if(m==='GET'&&p===billingPath)gets++;}});
  expect(gets).toBe(0);await expect(root(page)).toContainText('invalid Billing filter');
 });
 test('PBL-016 Malformed tenant UUID suppresses billing registry and detail requests',async({page})=>{
  const paths:string[]=[];await openPlatformBilling(page,{query:'tenant_id=bad-id',onCall:(m,p)=>{if(m==='GET'&&p.startsWith(billingPath))paths.push(p);}});
  await expect(root(page)).toContainText('invalid Billing filter');expect(paths).not.toContain(billingPath);
  expect(paths).not.toContain(`${billingPath}/bad-id`);
 });
 test('PBL-017 Oversize URL search cannot be forwarded as billing evidence query',async({page})=>{
  let gets=0;await openPlatformBilling(page,{query:'search='+('x'.repeat(201)),onCall:(m,p)=>{if(m==='GET'&&p===billingPath)gets++;}});
  await expect(root(page)).toContainText('invalid Billing filter');expect(gets).toBe(0);
 });
 test('PBL-018 Clear filters removes current search and status',async({page})=>{
  await openPlatformBilling(page,{query:'status=active&search=Alpha'});
  await root(page).getByRole('button',{name:'Clear filters'}).click();await expect(status(page)).toHaveValue('');
  await expect(search(page)).toHaveValue('');await expect(rows(page)).toHaveCount(4);
 });
 test('PBL-019 Next requests offset 50 for multi-page billing registry',async({page})=>{
  await openPlatformBilling(page,{records:manyBillingTenants(53)});await next(page).click();
  await expect(page).toHaveURL(/offset=50/);await expect(rows(page)).toHaveCount(3);
 });
 test('PBL-020 Previous returns to beginning of billing registry',async({page})=>{
  await openPlatformBilling(page,{records:manyBillingTenants(53),query:'offset=50'});await prev(page).click();
  await expect(rows(page)).toHaveCount(50);await expect(root(page)).toContainText('Showing 1–50 of 53');
 });
 test('PBL-021 Changing state filter resets previous offset',async({page})=>{
  await openPlatformBilling(page,{records:manyBillingTenants(53),query:'offset=50'});
  await status(page).selectOption('active');await expect(page).not.toHaveURL(/offset=50/);
 });
 test('PBL-022 Empty results show explicit no-match explanation',async({page})=>{
  await openPlatformBilling(page,{records:[]});await expect(root(page)).toContainText('No tenants matched.');
  await expect(rows(page)).toHaveCount(0);
 });
 test('PBL-023 Read-only billing permits evidence but disables profile mutations',async({page})=>{
  await openPlatformBilling(page,{query:selected,permissions:without('platform.billing.write')});
  await expect(root(page)).toContainText('Read-only');await expect(card(page,'Billing profile').getByRole('button',{name:'Save profile'})).toBeDisabled();
  await expect(root(page).getByRole('button',{name:'Preview reconciliation'})).toHaveCount(0);
 });
 test('PBL-024 Write permission enables preview and reconciliation controls',async({page})=>{
  await openPlatformBilling(page);await expect(root(page).getByRole('button',{name:'Preview reconciliation'})).toBeVisible();
  await expect(root(page).getByRole('button',{name:'Apply reconciliation'})).toBeVisible();
 });
 test('PBL-025 Reconciliation preview sends dry_run true without asserting external settlement',async({page})=>{
  const writes:any[]=[];await openPlatformBilling(page,{onCall:(m,p,_q,b)=>{if(m==='POST'&&p===billingPath+'/reconcile')writes.push(b);}});
  await root(page).getByRole('button',{name:'Preview reconciliation'}).click();await expect(root(page)).toContainText('Reconciliation preview');
  expect(writes).toContainEqual({tenant_id:null,dry_run:true});
 });
 test('PBL-026 Cancelling apply confirmation does not send reconciliation mutation',async({page})=>{
  let writes=0;await openPlatformBilling(page,{onCall:(m,p)=>{if(m==='POST'&&p===billingPath+'/reconcile')writes++;}});
  page.once('dialog',d=>d.dismiss());await root(page).getByRole('button',{name:'Apply reconciliation'}).click();expect(writes).toBe(0);
 });
 test('PBL-027 Confirmed apply sends dry_run false with explicit scope',async({page})=>{
  const bodies:any[]=[];await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='POST'&&p===billingPath+'/reconcile')bodies.push(b);}});
  page.once('dialog',d=>d.accept());await root(page).getByRole('button',{name:'Apply reconciliation'}).click();
  await expect(root(page)).toContainText('Reconciliation applied');expect(bodies).toContainEqual({tenant_id:billingTenantA,dry_run:false});
 });
 test('PBL-028 Opening tenant row creates deep-linked selected workbench',async({page})=>{
  await openPlatformBilling(page);await rows(page).filter({hasText:'Fixture Billing Alpha'}).getByRole('button',{name:'Open'}).click();
  await expect(page).toHaveURL(new RegExp(`tenant_id=${billingTenantA}`));await expect(root(page)).toContainText('Selected tenant billing workbench');
 });
 test('PBL-029 Selected tenant detail failure displays dedicated Retry',async({page})=>{
  await openPlatformBilling(page,{query:selected,respond:(m,p)=>m==='GET'&&p===`${billingPath}/${billingTenantA}`?{status:503,json:{message:'Fixture tenant detail offline'}}:undefined});
  await expect(root(page)).toContainText('Selected tenant billing could not be loaded.');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PBL-030 Missing tenant profile in detail response shows incomplete-evidence warning',async({page})=>{
  await openPlatformBilling(page,{query:selected,noDetailsTenant:true});
  await expect(root(page)).toContainText('Selected tenant evidence is temporarily incomplete.');
 });
 test('PBL-031 Selected catalog plan explains its limits and feature flags',async({page})=>{
  await openPlatformBilling(page,{query:selected});await expect(card(page,'Billing profile')).toContainText('GROWTH · growth');
  await expect(card(page,'Billing profile')).toContainText('users: 50');
 });
 test('PBL-032 Unknown saved plan requires a valid catalog choice before saving',async({page})=>{
  await openPlatformBilling(page,{query:selected,records:[{...billingTenants[0],plan_code:'UNKNOWN_LEGACY'}]});
  await expect(card(page,'Billing profile')).toContainText('Choose a catalog plan');
  await expect(card(page,'Billing profile').getByRole('button',{name:'Save profile'})).toBeDisabled();
 });
 test('PBL-033 Changed billing notes make a valid profile eligible to save',async({page})=>{
  await openPlatformBilling(page,{query:selected});const profile=card(page,'Billing profile');
  await expect(profile.getByRole('button',{name:'Save profile'})).toBeDisabled();
  await profile.getByLabel('Billing notes').fill('New synthetic note');
  await expect(profile.getByRole('button',{name:'Save profile'})).toBeEnabled();
 });
 test('PBL-034 Profile edit keeps status separate from ordinary saved fields',async({page})=>{
  let patch:any;await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===`${billingPath}/${billingTenantA}`)patch=b;}});
  const profile=card(page,'Billing profile');await profile.getByLabel('Billing notes').fill('Safe note');await profile.getByRole('button',{name:'Save profile'}).click();
  await expect(root(page)).toContainText('Billing profile saved.');expect(patch.billing_notes).toBe('Safe note');expect(patch).not.toHaveProperty('billing_status');
 });
 test('PBL-035 Trial end later than current period end blocks profile edit',async({page})=>{
  await openPlatformBilling(page,{query:selected});const profile=card(page,'Billing profile');
  await profile.getByLabel('Trial ends').fill('2099-12-10');
  await expect(profile.getByRole('button',{name:'Save profile'})).toBeDisabled();
  await expect(profile).toContainText('keep current-period end on/after trial end');
 });
 test('PBL-036 Profile payload trims notes and provider customer reference',async({page})=>{
  let received:any;await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='PATCH'&&p===`${billingPath}/${billingTenantA}`)received=b;}});
  const profile=card(page,'Billing profile');await profile.getByLabel('Billing notes').fill('  Fixture edit  ');
  await profile.getByLabel('Billing customer reference').fill('  cus_trimmed  ');await profile.getByRole('button',{name:'Save profile'}).click();
  await expect(root(page)).toContainText('Billing profile saved.');expect(received.billing_notes).toBe('Fixture edit');
  expect(received.billing_customer_reference).toBe('cus_trimmed');
 });
 test('PBL-037 Lifecycle status requires a reason of three characters or more',async({page})=>{
  await openPlatformBilling(page,{query:selected});const state=card(page,'Record billing status');
  await state.getByLabel('Status').selectOption('past_due');await state.getByLabel('Reason').fill('x');
  await expect(state.getByRole('button',{name:'Record status'})).toBeDisabled();
 });
 test('PBL-038 Cancelling lifecycle status confirmation leaves POST unsent',async({page})=>{
  let posts=0;await openPlatformBilling(page,{query:selected,onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/status'))posts++;}});
  const state=card(page,'Record billing status');await state.getByLabel('Status').selectOption('past_due');
  await state.getByLabel('Reason').fill('Synthetic customer support case');page.once('dialog',d=>d.dismiss());
  await state.getByRole('button',{name:'Record status'}).click();expect(posts).toBe(0);
 });
 test('PBL-039 Confirmed lifecycle change sends reason trim and separate status endpoint',async({page})=>{
  let payload:any;await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='POST'&&p===`${billingPath}/${billingTenantA}/status`)payload=b;}});
  const state=card(page,'Record billing status');await state.getByLabel('Status').selectOption('past_due');
  await state.getByLabel('Reason').fill('  Synthetic overdue  ');page.once('dialog',d=>d.accept());
  await state.getByRole('button',{name:'Record status'}).click();
  await expect(root(page)).toContainText('Billing lifecycle status recorded.');
  expect(payload).toEqual({billing_status:'past_due',reason:'Synthetic overdue'});
 });
 test('PBL-040 Manual event types exclude fabricated provider payment success',async({page})=>{
  await openPlatformBilling(page,{query:selected});const evt=card(page,'Add operator billing event');
  await expect(evt.getByLabel('Event type').locator('option')).toHaveCount(2);
  await expect(evt.getByLabel('Event type').locator('option[value="invoice.payment_succeeded"]')).toHaveCount(0);
  await expect(evt.getByLabel('Event type').locator('option[value="invoice_sent"]')).toHaveCount(1);
 });
 test.skip('PBL-041 Provider signature, bank settlement and commercial event truth require Phase 2',async()=>{
  // Browser-intercepted provider-shaped JSON is neither a valid signature nor independent payment evidence.
 });

 test('PBL-042 Manual note is an operator assertion only',async({page})=>{
  await openPlatformBilling(page,{query:selected});const panel=card(page,'Add operator billing event');
  await panel.getByLabel('Note').fill('Fixture operator note');await panel.getByRole('button',{name:'Add operator event'}).click();
  await expect(root(page)).toContainText('Operator-recorded billing event added.');await expect(root(page).locator('.platform-billing__history')).toContainText('Fixture operator note');
  await expect(panel).toContainText('application/operator assertions');
 });
 test('PBL-043 Manual event accepts whole-number cents and normalizes currency',async({page})=>{
  let body:any;await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/events'))body=b;}});
  const panel=card(page,'Add operator billing event');await panel.getByLabel('Amount cents').fill('2300');
  await panel.getByLabel('Currency').fill('eur');await panel.getByRole('button',{name:'Add operator event'}).click();
  await expect(root(page)).toContainText('Operator-recorded billing event added.');expect(body.amount_cents).toBe(2300);expect(body.currency).toBe('EUR');
 });
 test('PBL-044 Fractional and negative manual cents block POST',async({page})=>{
  let count=0;await openPlatformBilling(page,{query:selected,onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/events'))count++;}});
  const panel=card(page,'Add operator billing event');for(const invalid of ['1.5','-1']){
   await panel.getByLabel('Amount cents').fill(invalid);await expect(panel.getByRole('button',{name:'Add operator event'})).toBeDisabled();
   await expect(panel).toContainText('non-negative whole number');}expect(count).toBe(0);
 });
 test('PBL-045 Invalid manual currency blocks POST',async({page})=>{
  await openPlatformBilling(page,{query:selected});const panel=card(page,'Add operator billing event');
  for(const invalid of ['EU','EURO','E1R']){await panel.getByLabel('Currency').fill(invalid);
   await expect(panel.getByRole('button',{name:'Add operator event'})).toBeDisabled();await expect(panel).toContainText('3-letter code');}
 });
 test('PBL-046 Manual event trims reference and note in outgoing body',async({page})=>{
  let sent:any;await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/events'))sent=b;}});
  const panel=card(page,'Add operator billing event');await panel.getByLabel('External reference').fill('  EXT-99  ');
  await panel.getByLabel('Note').fill('  Synthetic record  ');await panel.getByRole('button',{name:'Add operator event'}).click();
  await expect(root(page)).toContainText('Operator-recorded billing event added.');expect(sent.external_reference).toBe('EXT-99');expect(sent.note).toBe('Synthetic record');
 });
 test('PBL-047 Added event refreshes history and resets form fields',async({page})=>{
  await openPlatformBilling(page,{query:selected});const panel=card(page,'Add operator billing event');
  await panel.getByLabel('Note').fill('History after write');await panel.getByLabel('Amount cents').fill('42');
  await panel.getByRole('button',{name:'Add operator event'}).click();await expect(root(page).locator('.platform-billing__history')).toContainText('History after write');
  await expect(panel.getByLabel('Note')).toHaveValue('');await expect(panel.getByLabel('Amount cents')).toHaveValue('');
 });
 test('PBL-048 Failed manual event preserves note and exposes API error',async({page})=>{
  await openPlatformBilling(page,{query:selected,respond:(m,p)=>m==='POST'&&p.endsWith('/events')?{status:503,json:{message:'Synthetic event unavailable'}}:undefined});
  const panel=card(page,'Add operator billing event');await panel.getByLabel('Note').fill('Preserve this draft');
  await panel.getByRole('button',{name:'Add operator event'}).click();await expect(root(page).getByRole('alert')).toBeVisible();
  await expect(panel.getByLabel('Note')).toHaveValue('Preserve this draft');
 });
 test('PBL-049 Renewal requires a future period end',async({page})=>{
  await openPlatformBilling(page,{query:selected});const panel=card(page,'Record subscription renewal');
  await expect(panel.getByRole('button',{name:'Record renewal'})).toBeDisabled();await expect(panel).toContainText('Enter a future subscription period end.');
  await panel.getByLabel('New period end').fill('2020-01-01');await expect(panel).toContainText('must be in the future');
 });
 test('PBL-050 Valid renewal with amount records a subscription-period assertion',async({page})=>{
  let body:any;await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/renew'))body=b;}});
  const panel=card(page,'Record subscription renewal');await panel.getByLabel('New period end').fill('2099-12-31');
  await panel.getByLabel('Amount cents (optional)').fill('2100');page.once('dialog',d=>d.accept());
  await panel.getByRole('button',{name:'Record renewal'}).click();await expect(root(page)).toContainText('Subscription period renewal recorded.');
  expect(body.current_period_ends_at).toBe('2099-12-31');expect(body.amount_cents).toBe(2100);await expect(panel).toContainText('not create payment-received evidence');
 });
 test('PBL-051 Renewal amount rejects negative and fractional cents',async({page})=>{
  await openPlatformBilling(page,{query:selected});const panel=card(page,'Record subscription renewal');
  await panel.getByLabel('New period end').fill('2099-12-31');for(const invalid of ['-3','1.5']){
   await panel.getByLabel('Amount cents (optional)').fill(invalid);await expect(panel.getByRole('button',{name:'Record renewal'})).toBeDisabled();
   await expect(panel).toContainText('non-negative whole number');}
 });
 test('PBL-052 Renewal currency requires exactly three letters',async({page})=>{
  await openPlatformBilling(page,{query:selected});const panel=card(page,'Record subscription renewal');await panel.getByLabel('New period end').fill('2099-12-31');
  for(const invalid of ['X','EURX','E1R']){await panel.getByLabel('Currency').fill(invalid);
   await expect(panel.getByRole('button',{name:'Record renewal'})).toBeDisabled();await expect(panel).toContainText('3-letter code');}
 });
 test('PBL-053 Cancelled-state override is a distinct boolean in renewal request',async({page})=>{
  let sent:any;await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/renew'))sent=b;}});
  const panel=card(page,'Record subscription renewal');await panel.getByLabel('New period end').fill('2099-12-31');
  await panel.getByLabel('Allow renewal from cancelled state').check();page.once('dialog',d=>d.accept());
  await panel.getByRole('button',{name:'Record renewal'}).click();await expect(root(page)).toContainText('Subscription period renewal recorded.');
  expect(sent.allow_cancelled_renewal).toBe(true);
 });
 test('PBL-054 Dismissed renewal confirmation sends no mutation',async({page})=>{
  let posts=0;await openPlatformBilling(page,{query:selected,onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/renew'))posts++;}});
  const panel=card(page,'Record subscription renewal');await panel.getByLabel('New period end').fill('2099-12-31');
  page.once('dialog',d=>d.dismiss());await panel.getByRole('button',{name:'Record renewal'}).click();expect(posts).toBe(0);
 });
 test('PBL-055 Confirmed renewal trims optional metadata and sends false override',async({page})=>{
  let sent:any;await openPlatformBilling(page,{query:selected,onCall:(m,p,_q,b)=>{if(m==='POST'&&p.endsWith('/renew'))sent=b;}});
  const panel=card(page,'Record subscription renewal');await panel.getByLabel('New period end').fill('2099-12-31');
  await panel.getByLabel('External reference').fill('  REN-99  ');await panel.getByLabel('Note').fill('  Operator note  ');
  page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'Record renewal'}).click();
  await expect(root(page)).toContainText('Subscription period renewal recorded.');
  expect(sent).toMatchObject({current_period_ends_at:'2099-12-31',amount_cents:null,external_reference:'REN-99',note:'Operator note',allow_cancelled_renewal:false});
 });
 test('PBL-056 Successful renewal resets form and refreshes tenant evidence',async({page})=>{
  await openPlatformBilling(page,{query:selected});const panel=card(page,'Record subscription renewal');
  await panel.getByLabel('New period end').fill('2099-12-31');page.once('dialog',d=>d.accept());
  await panel.getByRole('button',{name:'Record renewal'}).click();await expect(panel.getByLabel('New period end')).toHaveValue('');
  await expect(root(page)).toContainText('Subscription period renewal recorded.');
 });
 test('PBL-057 Failed renewal retains draft and shows failure',async({page})=>{
  await openPlatformBilling(page,{query:selected,respond:(m,p)=>m==='POST'&&p.endsWith('/renew')?{status:503,json:{message:'Fixture renewal rejected'}}:undefined});
  const panel=card(page,'Record subscription renewal');await panel.getByLabel('New period end').fill('2099-12-31');
  page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'Record renewal'}).click();
  await expect(root(page).getByRole('alert')).toBeVisible();await expect(panel.getByLabel('New period end')).toHaveValue('2099-12-31');
 });
 test('PBL-058 Provider event identifier is required without raw JSON',async({page})=>{
  await openPlatformBilling(page,{query:selected});const panel=card(page,'Payment-provider ingestion');
  await expect(panel.getByRole('button',{name:'Ingest provider event'})).toBeDisabled();await expect(panel).toContainText('Enter a provider event ID');
 });
 test.skip('PBL-059 Empty provider event type validation is unreachable through the existing select',async()=>{
  // SOURCE HARDENING: all select options are nonempty; no blank choice can be made via supported browser UI.
  // Validate malicious missing type via independent API tests in Phase 2.
 });
 test('PBL-060 Payment-success provider event requires current period end',async({page})=>{
  await openPlatformBilling(page);const panel=card(page,'Payment-provider ingestion');
  await panel.getByLabel('Provider event ID').fill('evt_synthetic_99');await panel.getByLabel('Billing customer reference').fill('cus_fixture_a');
  await expect(panel).toContainText('requires a current period end');await expect(panel.getByRole('button',{name:'Ingest provider event'})).toBeDisabled();
 });
 test('PBL-061 Trial-extension event requires trial end',async({page})=>{
  await openPlatformBilling(page);const panel=card(page,'Payment-provider ingestion');
  await panel.getByLabel('Event type').selectOption('customer.subscription.trial_extended');
  await panel.getByLabel('Provider event ID').fill('evt_trial_99');await panel.getByLabel('Billing customer reference').fill('cus_fixture_a');
  await expect(panel).toContainText('requires a trial end');await expect(panel.getByRole('button',{name:'Ingest provider event'})).toBeDisabled();
 });
 test('PBL-062 No selected tenant requires provider customer reference or raw payload',async({page})=>{
  await openPlatformBilling(page);const panel=card(page,'Payment-provider ingestion');
  await panel.getByLabel('Provider event ID').fill('evt_99');await panel.getByLabel('Current period ends').fill('2099-12-31');
  await expect(panel).toContainText('Select a tenant or enter a billing customer reference');
 });
 test.skip('PBL-063 Real provider signatures and forged-source rejection require independent backend evidence',async()=>{
  // Phase 2 only: trusted webhook signatures, timestamp replay, real provider event dedupe and isolated database.
 });
 test('PBL-064 Manual is not an accepted payment provider in ingestion form',async({page})=>{
  await openPlatformBilling(page);const panel=card(page,'Payment-provider ingestion');await panel.getByLabel('Provider').fill('manual');
  await expect(panel).toContainText('real external provider');await expect(panel.getByRole('button',{name:'Ingest provider event'})).toBeDisabled();
 });
 test('PBL-065 Malformed raw JSON blocks provider POST',async({page})=>{
  let posts=0;await openPlatformBilling(page,{onCall:(m,p)=>{if(m==='POST'&&p.includes('provider-events'))posts++;}});
  const panel=card(page,'Payment-provider ingestion');await panel.getByLabel('Raw provider payload JSON').fill('{not valid');
  await expect(panel).toContainText('must be a JSON object');await expect(panel.getByRole('button',{name:'Ingest provider event'})).toBeDisabled();expect(posts).toBe(0);
 });
 test('PBL-066 Arrays and JSON primitives are not accepted as raw provider evidence',async({page})=>{
  await openPlatformBilling(page);const panel=card(page,'Payment-provider ingestion');for(const raw of ['[]','"hello"','17','null']){
   await panel.getByLabel('Raw provider payload JSON').fill(raw);await expect(panel.getByRole('button',{name:'Ingest provider event'})).toBeDisabled();
   await expect(panel).toContainText('must be a JSON object');}
 });
 test('PBL-067 Provider currency input uppercases its value',async({page})=>{
  await openPlatformBilling(page);const panel=card(page,'Payment-provider ingestion');await panel.getByLabel('Currency').fill('usd');
  await expect(panel.getByLabel('Currency')).toHaveValue('USD');
 });
 test('PBL-068 Invalid provider cents prevent ingestion request',async({page})=>{
  await openPlatformBilling(page);const panel=card(page,'Payment-provider ingestion');
  await panel.getByLabel('Provider event ID').fill('evt_fixture');await panel.getByLabel('Current period ends').fill('2099-12-31');
  await panel.getByLabel('Billing customer reference').fill('cus_fixture_a');for(const amount of ['-1','12.2']){
   await panel.getByLabel('Amount cents').fill(amount);await expect(panel).toContainText('non-negative whole number');
   await expect(panel.getByRole('button',{name:'Ingest provider event'})).toBeDisabled();}
 });
 test('PBL-069 Customer-reference ingestion uses global endpoint',async({page})=>{
  const calls:string[]=[];await openPlatformBilling(page,{onCall:(m,p)=>{if(m==='POST'&&p.includes('provider-events'))calls.push(p);}});
  const panel=card(page,'Payment-provider ingestion');await panel.getByLabel('Billing customer reference').fill('cus_fixture_a');
  await panel.getByLabel('Current period ends').fill('2099-12-31');await panel.getByLabel('Provider event ID').fill('evt_fixture_69');
  await panel.getByRole('button',{name:'Ingest provider event'}).click();await expect(root(page)).toContainText('Payment-provider event ingested.');
  expect(calls).toContain('/platform/billing/provider-events');
 });
 test('PBL-070 Tenant-selected provider ingestion without customer reference uses tenant endpoint',async({page})=>{
  const calls:string[]=[];await openPlatformBilling(page,{query:selected,records:[{...billingTenants[0],billing_customer_reference:null}],onCall:(m,p)=>{if(m==='POST'&&p.includes('provider-events'))calls.push(p);}});
  const panel=card(page,'Payment-provider ingestion');await panel.getByLabel('Provider event ID').fill('evt_fixture_70');
  await panel.getByLabel('Current period ends').fill('2099-12-31');await panel.getByRole('button',{name:'Ingest provider event'}).click();
  await expect(root(page)).toContainText('Payment-provider event ingested.');expect(calls).toContain(`${billingPath}/${billingTenantA}/provider-events`);
 });
 test('PBL-071 Duplicate provider reply reports ignored without claiming payment',async({page})=>{
  await openPlatformBilling(page,{respond:(m,p)=>m==='POST'&&p.includes('provider-events')?{json:{duplicate:true,mapped_event_type:'invoice.payment_succeeded',event:null}}:undefined});
  const panel=card(page,'Payment-provider ingestion');await panel.getByLabel('Provider event ID').fill('evt_duplicate_71');
  await panel.getByLabel('Billing customer reference').fill('cus_fixture_a');await panel.getByLabel('Current period ends').fill('2099-12-31');
  await panel.getByRole('button',{name:'Ingest provider event'}).click();await expect(panel).toContainText('Duplicate ignored');
  await expect(root(page)).toContainText('Duplicate provider event ignored.');
 });
 test('PBL-072 Accepted provider ingestion resets transient fields only',async({page})=>{
  await openPlatformBilling(page);const panel=card(page,'Payment-provider ingestion');await panel.getByLabel('Provider event ID').fill('evt_72');
  await panel.getByLabel('Billing customer reference').fill('cus_fixture_a');await panel.getByLabel('Current period ends').fill('2099-12-31');
  await panel.getByLabel('Provider note').fill('One-off note');await panel.getByRole('button',{name:'Ingest provider event'}).click();
  await expect(panel).toContainText('Provider event accepted');await expect(panel.getByLabel('Provider event ID')).toHaveValue('');
  await expect(panel.getByLabel('Provider note')).toHaveValue('');await expect(panel.getByLabel('Billing customer reference')).toHaveValue('cus_fixture_a');
 });
 test('PBL-073 Provider ingestion error is not displayed as accepted',async({page})=>{
  await openPlatformBilling(page,{respond:(m,p)=>m==='POST'&&p.includes('provider-events')?{status:409,json:{message:'Fixture duplicate conflict'}}:undefined});
  const panel=card(page,'Payment-provider ingestion');await panel.getByLabel('Provider event ID').fill('evt_73');
  await panel.getByLabel('Billing customer reference').fill('cus_fixture_a');await panel.getByLabel('Current period ends').fill('2099-12-31');
  await panel.getByRole('button',{name:'Ingest provider event'}).click();await expect(root(page).getByRole('alert')).toBeVisible();
  await expect(panel).not.toContainText('Provider event accepted');
 });
 test('PBL-074 Operator identity redacted without separate users-read permission',async({page})=>{
  await openPlatformBilling(page,{query:selected,permissions:without('platform.users.read')});
  await expect(root(page).locator('.platform-billing__history')).toContainText('Restricted operator');
  await expect(root(page).locator('.platform-billing__history')).not.toContainText('operator@fixture.test');
 });
 test('PBL-075 Billing-event audit links require independently granted audit read',async({page})=>{
  await openPlatformBilling(page,{query:selected,permissions:without('platform.audit.read')});
  await expect(root(page).locator('.platform-billing__history').getByRole('link',{name:'Audit evidence'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Billing audit'})).toHaveCount(0);
 });
 test('PBL-076 Tenant export support link requires separate tenants-export grant',async({page})=>{
  await openPlatformBilling(page,{permissions:without('platform.tenants.export')});
  await expect(root(page).getByRole('link',{name:'Tenant exports'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Billing activation'})).toBeVisible();
 });
 test('PBL-077 Provider-readiness service failure cannot be misreported as healthy',async({page})=>{
  await openPlatformBilling(page,{respond:(m,p)=>m==='GET'&&p===billingPath+'/provider-webhook-readiness'?{status:503,json:{message:'Fixture provider unavailable'}}:undefined});
  await expect(root(page)).not.toContainText('payment-provider webhook application evidence healthy');
  await expect(root(page)).toContainText('Missing secret: none');
 });
 test.skip('PBL-078 Trusted HMAC replay prevention and dedupe require live provider and PostgreSQL',async()=>{
  // Phase 2: signed sandbox webhook, replayed event id, two tenants, durable SQL and audit evidence.
 });
 test.skip('PBL-079 Entitlement and renewal concurrency require real database validation',async()=>{
  // Phase 2: locked tenant, entitlements and rollback consistent under concurrent payment events.
 });
 test('PBL-080 Internal billing rows do not certify receipt or settlement',async({page})=>{
  await openPlatformBilling(page);await expect(root(page)).toContainText('does not prove bank settlement or customer receipt');
  await expect(root(page)).toContainText('does not independently prove the external event occurred');
  await expect(root(page)).toContainText('does not independently prove ownership of an external provider account');
 });
});
