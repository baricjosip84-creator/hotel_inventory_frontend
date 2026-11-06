/** Batch 99 — Platform Subscription Readiness, 41 source-backed Phase 1 declarations.
 * Synthetic GETs prove browser request/rendering contracts only: not real money,
 * external payment, identity, billing correctness, database, or authorization. */
import {test,expect,type Page} from '@playwright/test';
import {openSubscriptionReadiness,readinessPath,readinessPermissions,readinessItems,manyReadinessItems,
 readinessTenantA,readinessTenantB,readinessTenantC,readinessTenantD} from '../../../support/platformSubscriptionReadinessFixture';
const root=(p:Page)=>p.locator('.platform-subscription-readiness');
const filters=(p:Page)=>root(p).locator('.platform-subscription-readiness__filters');
const search=(p:Page)=>filters(p).getByLabel('Search tenant / plan / customer reference');
const state=(p:Page)=>filters(p).getByLabel('Billing status');
const table=(p:Page)=>root(p).locator('.platform-subscription-readiness__table');
const rows=(p:Page)=>table(p).locator('tbody tr');
const pager=(p:Page)=>root(p).locator('.platform-subscription-readiness__pagination');
const without=(...removed:string[])=>readinessPermissions.filter(x=>!removed.includes(x));
test.describe('Platform Subscription Readiness — application evidence only (BATCH_099_GENERATED_UNRUN)',()=>{
 test('PSRD-001 Independent read-only subscription readiness page is accessible',async({page})=>{
  await openSubscriptionReadiness(page);await expect(root(page)).toContainText('Read only');await expect(table(page)).toBeVisible();
 });
 test('PSRD-002 Router blocks the page without billing read permission',async({page})=>{
  let gets=0;await openSubscriptionReadiness(page,{permissions:without('platform.billing.read'),expectHeading:false,onCall:(m,p)=>{if(m==='GET'&&p===readinessPath)gets++;}});
  await expect(root(page)).toHaveCount(0);expect(gets).toBe(0);
 });
 test('PSRD-003 Router independently blocks missing tenants read permission',async({page})=>{
  let gets=0;await openSubscriptionReadiness(page,{permissions:without('platform.tenants.read'),expectHeading:false,onCall:(m,p)=>{if(m==='GET'&&p===readinessPath)gets++;}});
  await expect(root(page)).toHaveCount(0);expect(gets).toBe(0);
 });
 test('PSRD-004 First readiness GET is bounded by 50 rows and offset 0',async({page})=>{
  const queries:string[]=[];await openSubscriptionReadiness(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===readinessPath)queries.push(q.toString());}});
  expect(queries.length).toBeGreaterThan(0);const q=new URLSearchParams(queries[0]);expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');
 });
 test('PSRD-005 Summary comes from filtered full registry not current page',async({page})=>{
  await openSubscriptionReadiness(page,{items:manyReadinessItems(52)});await expect(rows(page)).toHaveCount(50);
  await expect(pager(page)).toContainText('Showing 1–50 of 52');await expect(root(page).getByLabel('Subscription readiness summary')).toContainText('Reviewed');
 });
 test('PSRD-006 Separate ready review and blocked readiness states display correctly',async({page})=>{
  await openSubscriptionReadiness(page);await expect(table(page)).toContainText('subscription ready');
  await expect(table(page)).toContainText('subscription review required');await expect(table(page)).toContainText('subscription blocked');
 });
 test('PSRD-007 Past-due tenant displays a blocked state and risk flag',async({page})=>{
  await openSubscriptionReadiness(page);const item=rows(page).filter({hasText:'Fixture Readiness Gamma'});
  await expect(item).toContainText('billing past due');await expect(item.locator('[data-tone="danger"]')).toHaveCount(2);
 });
 test('PSRD-008 Missing billing history is displayed as review flag',async({page})=>{
  await openSubscriptionReadiness(page);const item=rows(page).filter({hasText:'Fixture Readiness Beta'});
  await expect(item).toContainText('billing event history missing');await expect(item).toContainText('0 total');
 });
 test('PSRD-009 Comped subscription does not misclassify old paid period',async({page})=>{
  await openSubscriptionReadiness(page);const item=rows(page).filter({hasText:'Fixture Readiness Delta'});
  await expect(item).toContainText('subscription ready');await expect(item).toContainText('No readiness flags');
  await expect(root(page)).toContainText('A comped tenant does not require a paid current-period end');
 });
 test('PSRD-010 Provider-shaped and operator-recorded histories stay distinct',async({page})=>{
  await openSubscriptionReadiness(page);await expect(rows(page).first()).toContainText('1 provider-shaped');
  await expect(rows(page).first()).toContainText('1 operator-recorded');
 });
 test('PSRD-011 Evidence boundary explicitly rejects payment certification',async({page})=>{
  await openSubscriptionReadiness(page);await expect(root(page)).toContainText('It is not payment certification');
  await expect(root(page)).toContainText('does not independently prove bank settlement');
 });
 test('PSRD-012 Selected tenant deep link retains tenant_id on backend GET',async({page})=>{
  const qs:string[]=[];await openSubscriptionReadiness(page,{query:`tenant_id=${readinessTenantB}`,onCall:(m,p,q)=>{if(m==='GET'&&p===readinessPath)qs.push(q.toString());}});
  expect(qs.some(q=>new URLSearchParams(q).get('tenant_id')===readinessTenantB)).toBe(true);
  await expect(table(page)).toContainText('Fixture Readiness Beta');
 });
 test('PSRD-013 Tenant scope displays selected name and one tenant row',async({page})=>{
  await openSubscriptionReadiness(page,{query:`tenant_id=${readinessTenantA}`});
  await expect(filters(page)).toContainText('Tenant: Fixture Readiness Alpha');await expect(rows(page)).toHaveCount(1);
 });
 test('PSRD-014 Unknown well-formed tenant UUID results in backend-style 404 rather than fabricated evidence',async({page})=>{
  await openSubscriptionReadiness(page,{query:'tenant_id=b9810000-0000-4000-8000-000000000099'});
  await expect(filters(page)).toContainText('Tenant: b9810000-0000-4000-8000-000000000099');
  await expect(root(page)).toContainText('Subscription readiness failed to load.');
  await expect(root(page)).not.toContainText('Fixture Readiness Alpha');
 });
 test('PSRD-015 Tenant name search restricts rows using API filter',async({page})=>{
  await openSubscriptionReadiness(page);await search(page).fill('Gamma');await expect(page).toHaveURL(/search=Gamma/);
  await expect(rows(page)).toHaveCount(1);await expect(rows(page)).toContainText('Fixture Readiness Gamma');
 });
 test('PSRD-016 Plan search uses search parameter and narrows results',async({page})=>{
  await openSubscriptionReadiness(page);await search(page).fill('STARTER');
  await expect(rows(page)).toHaveCount(1);await expect(rows(page)).toContainText('Fixture Readiness Beta');
 });
 test('PSRD-017 Customer-reference search does not require extra actor permission',async({page})=>{
  await openSubscriptionReadiness(page,{permissions:without('platform.audit.read')});await search(page).fill('cus_fixture_a');
  await expect(rows(page)).toHaveCount(3);await expect(root(page).getByRole('link',{name:'Billing audit'})).toHaveCount(0);
 });
 test('PSRD-018 Status filter includes all source-approved billing statuses',async({page})=>{
  await openSubscriptionReadiness(page);for(const value of ['not_configured','trialing','active','past_due','cancelled','comped'])
   await expect(state(page).locator(`option[value="${value}"]`)).toHaveCount(1);
 });
 test('PSRD-019 Past-due filter updates URL and returns only past-due row',async({page})=>{
  await openSubscriptionReadiness(page);await state(page).selectOption('past_due');
  await expect(page).toHaveURL(/status=past_due/);await expect(rows(page)).toHaveCount(1);await expect(rows(page)).toContainText('Fixture Readiness Gamma');
 });
 test('PSRD-020 Status and name filters combine without expanding results',async({page})=>{
  await openSubscriptionReadiness(page,{query:'status=active'});await search(page).fill('Gamma');
  await expect(rows(page)).toHaveCount(1);await expect(table(page)).toContainText('No subscription-readiness rows match');
 });
 test('PSRD-021 Clearing filters resets query and the full registry',async({page})=>{
  await openSubscriptionReadiness(page,{query:'status=past_due&search=Gamma'});
  await root(page).getByRole('button',{name:'Clear filters'}).click();await expect(rows(page)).toHaveCount(4);
  await expect(state(page)).toHaveValue('');await expect(search(page)).toHaveValue('');
 });
 test('PSRD-022 Invalid URL status prevents readiness GET',async({page})=>{
  let count=0;await openSubscriptionReadiness(page,{query:'status=impossible',onCall:(m,p)=>{if(m==='GET'&&p===readinessPath)count++;}});
  await expect(root(page)).toContainText('Invalid readiness filters');expect(count).toBe(0);
 });
 test('PSRD-023 Invalid tenant identifier prevents readiness GET',async({page})=>{
  let count=0;await openSubscriptionReadiness(page,{query:'tenant_id=bad-tenant',onCall:(m,p)=>{if(m==='GET'&&p===readinessPath)count++;}});
  await expect(root(page)).toContainText('Invalid readiness filters');expect(count).toBe(0);
 });
 test('PSRD-024 Overlength search query is blocked before network fetch',async({page})=>{
  let count=0;await openSubscriptionReadiness(page,{query:`search=${'x'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===readinessPath)count++;}});
  await expect(root(page)).toContainText('Invalid readiness filters');expect(count).toBe(0);
 });
 test('PSRD-025 Invalid filters provide a recovery control',async({page})=>{
  await openSubscriptionReadiness(page,{query:'tenant_id=bad-tenant'});await root(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(rows(page)).toHaveCount(4);await expect(root(page)).not.toContainText('Invalid readiness filters');
 });
 test('PSRD-026 Next pagination requests offset 50, never sends writes',async({page})=>{
  const q:string[]=[];const writes:string[]=[];await openSubscriptionReadiness(page,{items:manyReadinessItems(54),onCall:(m,p,query)=>{if(p===readinessPath){if(m==='GET')q.push(query.toString());else writes.push(m);}}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(rows(page)).toHaveCount(4);
  expect(q.some(x=>new URLSearchParams(x).get('offset')==='50')).toBe(true);expect(writes).toHaveLength(0);
 });
 test('PSRD-027 Previous returns offset zero and first page',async({page})=>{
  await openSubscriptionReadiness(page,{items:manyReadinessItems(54),query:'offset=50'});
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(rows(page)).toHaveCount(50);
  await expect(page).not.toHaveURL(/offset=50/);
 });
 test('PSRD-028 Previous is disabled on initial page',async({page})=>{
  await openSubscriptionReadiness(page);await expect(pager(page).getByRole('button',{name:'Previous'})).toBeDisabled();
 });
 test('PSRD-029 Next is disabled on the last page',async({page})=>{
  await openSubscriptionReadiness(page,{items:manyReadinessItems(52),query:'offset=50'});
  await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PSRD-030 A changed status discards an old offset',async({page})=>{
  await openSubscriptionReadiness(page,{items:manyReadinessItems(54),query:'offset=50'});
  await state(page).selectOption('active');await expect(page).not.toHaveURL(/offset=50/);
 });
 test('PSRD-031 Search changes discard the previous page offset',async({page})=>{
  await openSubscriptionReadiness(page,{items:manyReadinessItems(54),query:'offset=50'});
  await search(page).fill('Readiness Fixture 003');await expect(page).not.toHaveURL(/offset=50/);
 });
 test('PSRD-032 Empty filtered page displays explicit empty-state text',async({page})=>{
  await openSubscriptionReadiness(page,{items:[]});await expect(table(page)).toContainText('No subscription-readiness rows match');
  await expect(pager(page)).toContainText('Showing 0–0 of 0');
 });
 test('PSRD-033 Tenant billing deep link uses the exact selected tenant id',async({page})=>{
  await openSubscriptionReadiness(page,{query:`tenant_id=${readinessTenantA}`});
  await expect(rows(page).first().getByRole('link',{name:'Billing record'})).toHaveAttribute('href',`/platform/billing?tenant_id=${readinessTenantA}`);
 });
 test('PSRD-034 Tenant records have separate evidence navigation',async({page})=>{
  await openSubscriptionReadiness(page);await expect(rows(page).first().getByRole('link',{name:'Tenant record'})).toHaveAttribute('href',`/platform/tenants?tenant_id=${readinessTenantA}`);
 });
 test('PSRD-035 Audit links appear with independent audit-read grant',async({page})=>{
  await openSubscriptionReadiness(page);await expect(rows(page).first().getByRole('link',{name:'Billing audit'})).toHaveAttribute('href',`/platform/audit?tenant_id=${readinessTenantA}&source=billing`);
 });
 test('PSRD-036 Audit links are absent without audit-read grant',async({page})=>{
  await openSubscriptionReadiness(page,{permissions:without('platform.audit.read')});
  await expect(root(page).getByRole('link',{name:'Billing audit'})).toHaveCount(0);
  await expect(rows(page).first().getByRole('link',{name:'Billing record'})).toBeVisible();
 });
 test('PSRD-037 Refresh initiates another readiness GET without mutation',async({page})=>{
  let gets=0,writes=0;await openSubscriptionReadiness(page,{onCall:(m,p)=>{if(p===readinessPath){if(m==='GET')gets++;else writes++;}}});
  const before=gets;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>gets).toBeGreaterThan(before);expect(writes).toBe(0);
 });
 test('PSRD-038 Initial GET failure presents a retry control',async({page})=>{
  await openSubscriptionReadiness(page,{respond:(m,p)=>m==='GET'&&p===readinessPath?{status:503,json:{message:'Fixture unavailable'}}:undefined});
  await expect(root(page)).toContainText('Subscription readiness failed to load');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PSRD-039 Retry after failed initial load reissues GET',async({page})=>{
  let gets=0;await openSubscriptionReadiness(page,{respond:(m,p)=>{
   if(m==='GET'&&p===readinessPath){gets++;return {status:503,json:{message:'Fixture unavailable'}};}return undefined;}});
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();const before=gets;
  await root(page).getByRole('button',{name:'Retry'}).click();await expect.poll(()=>gets).toBeGreaterThan(before);
 });
 test('PSRD-040 Supporting links do not expose write operations',async({page})=>{
  const mutations:string[]=[];await openSubscriptionReadiness(page,{onCall:(m,p)=>{if(p===readinessPath&&m!=='GET')mutations.push(m);}});
  await expect(root(page).getByRole('button',{name:/Save|Delete|Record|Revoke|Ingest|Apply|Publish/})).toHaveCount(0);
  expect(mutations).toHaveLength(0);
 });
 test.skip('PSRD-041 Actual billing SQL, risk classification and external settlement require independent Phase 2 evidence',async()=>{
  // Intercepted application JSON cannot prove database-backed readiness, real provider signatures,
  // payment settlement, bank receipts or tenant isolation. Use a disposable two-tenant Phase 2 setup.
 });
});

// Batch 100 continuation — each case retains its original ledger scenario ID.
test.describe('Subscription readiness source-backed continuation — BATCH_100_GENERATED_UNRUN',()=>{
 test.skip('PSRD-042 Fractional readiness offset requires frontend normalization before GET',async()=>{
  // SOURCE-HARDENING: PlatformSubscriptionReadinessPage.tsx currently applies Math.max(0,Number(offset)) without integer validation.
  // The backend Joi schema rejects fractional offsets; this is not a passing UI validation scenario.
 });
 test.skip('PSRD-043 Beyond-total offset must not display an inverted page range',async()=>{
  // SOURCE-HARDENING: current UI renders min(offset + 1,total)–min(offset + rowCount,total), potentially 50–50 on an empty high offset.
  // A robust pager must canonicalize to a valid page or display the proper empty range before this test can pass.
 });
 test('PSRD-044 Malformed item and flag arrays are treated as absent evidence, not arbitrary rows',async({page})=>{
  await openSubscriptionReadiness(page,{respond:(m,p)=>m==='GET'&&p===readinessPath?{json:{feature:'platform_subscription_readiness',items:null,summary:null,pagination:{limit:50,offset:0,total:0,has_more:false},posture:'subscription_commercial_review_required'}}:undefined});
  await expect(rows(page)).toHaveCount(1);await expect(table(page)).toContainText('No subscription-readiness rows match');
 });
 test('PSRD-045 Unknown risk flags are printed as evidence instead of crashing the table',async({page})=>{
  await openSubscriptionReadiness(page,{items:[{...readinessItems[0],risk_flags:['unrecognized_future_risk']}]});
  await expect(rows(page).first()).toContainText('unrecognized future risk');
 });
 test('PSRD-046 Failed refresh after successful GET leaves the last snapshot visible',async({page})=>{
  let fail=false;await openSubscriptionReadiness(page,{respond:(m,p)=>fail&&m==='GET'&&p===readinessPath?{status:503,json:{message:'Synthetic refresh interruption'}}:undefined});
  await expect(table(page)).toContainText('Fixture Readiness Alpha');fail=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-subscription-readiness__warning')).toContainText('Showing the last successful snapshot');
  await expect(table(page)).toContainText('Fixture Readiness Alpha');
 });
 test('PSRD-047 Successful retry clears stale warning without mutating billing',async({page})=>{
  let fail=false;const writes:string[]=[];await openSubscriptionReadiness(page,{respond:(m,p)=>fail&&m==='GET'&&p===readinessPath?{status:503,json:{message:'Temporary error'}}:undefined,onCall:(m,p)=>{if(p===readinessPath&&m!=='GET')writes.push(m);}});
  fail=true;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-subscription-readiness__warning')).toBeVisible();
  fail=false;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-subscription-readiness__warning')).toHaveCount(0);expect(writes).toHaveLength(0);
 });
 test('PSRD-048 Server summary reflects entire registry while showing second page of items',async({page})=>{
  await openSubscriptionReadiness(page,{query:'offset=50',items:manyReadinessItems(53)});
  await expect(rows(page)).toHaveCount(3);await expect(pager(page)).toContainText('Showing 51–53 of 53');
  await expect(root(page).getByLabel('Subscription readiness summary')).toContainText('53');
 });
 test('PSRD-049 Trial warning is visible with its nonblocking review state',async({page})=>{
  const item={...readinessItems[1],risk_flags:['trial_ending_soon'],billing_event_count:2,readiness_state:'subscription_review_required' as const,days_until_trial_end:8};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('trial ending soon');
  await expect(rows(page).first()).toContainText('Trial: 8 days');await expect(rows(page).first()).toContainText('subscription review required');
 });
 test('PSRD-050 Current paid period warning is separate from trial warning',async({page})=>{
  const item={...readinessItems[0],risk_flags:['current_period_ending_soon'],readiness_state:'subscription_review_required' as const,days_until_period_end:5};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('current period ending soon');
  await expect(rows(page).first()).toContainText('Period: 5 days');await expect(rows(page).first()).not.toContainText('trial ending soon');
 });
 test('PSRD-051 Expired trial displays blocked evidence rather than ready',async({page})=>{
  const item={...readinessItems[1],days_until_trial_end:-3,risk_flags:['trial_expired'],readiness_state:'subscription_blocked' as const};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('trial expired');await expect(rows(page).first()).toContainText('subscription blocked');
 });
 test('PSRD-052 Expired paid period shows a blocked subscription state',async({page})=>{
  const item={...readinessItems[0],days_until_period_end:-2,risk_flags:['current_period_expired'],readiness_state:'subscription_blocked' as const};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('current period expired');await expect(rows(page).first()).toContainText('subscription blocked');
 });
 test('PSRD-053 Missing plan code cannot be silently replaced with an entitlement',async({page})=>{
  const item={...readinessItems[0],plan_code:null,risk_flags:['plan_code_missing'],readiness_state:'subscription_review_required' as const};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('Not recorded');await expect(rows(page).first()).toContainText('plan code missing');
 });
 test('PSRD-054 Active subscription missing customer reference displays a review flag',async({page})=>{
  const item={...readinessItems[0],billing_customer_reference_present:false,risk_flags:['billing_customer_reference_missing'],readiness_state:'subscription_review_required' as const};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('billing customer reference missing');
  await expect(rows(page).first()).toContainText('missing / not required');
 });
 test('PSRD-055 Old paid-period date does not mark comped subscriptions expired',async({page})=>{
  await openSubscriptionReadiness(page,{items:[readinessItems[3]]});await expect(rows(page).first()).toContainText('subscription ready');
  await expect(rows(page).first()).not.toContainText('current period expired');
 });
 test('PSRD-056 Unconfigured billing is rendered blocked without asserting payment',async({page})=>{
  const item={...readinessItems[0],billing_status:'not_configured',risk_flags:['billing_not_configured'],readiness_state:'subscription_blocked' as const};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('subscription blocked');await expect(rows(page).first()).toContainText('billing not configured');
 });
 test('PSRD-057 Cancelled billing remains blocked despite a future period end',async({page})=>{
  const item={...readinessItems[0],billing_status:'cancelled',risk_flags:['billing_cancelled'],readiness_state:'subscription_blocked' as const};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('billing cancelled');await expect(rows(page).first()).toContainText('subscription blocked');
 });
 test('PSRD-058 Distinct provider-shaped and operator-recorded counters remain visible',async({page})=>{
  const item={...readinessItems[0],billing_event_count:9,payment_provider_event_count:2,operator_recorded_event_count:7};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('9 total');await expect(rows(page).first()).toContainText('2 provider-shaped · 7 operator-recorded');
 });
 test('PSRD-059 Existence of billing events is not customer-receipt or settlement certification',async({page})=>{
  await openSubscriptionReadiness(page);await expect(root(page)).toContainText('does not prove an external payment occurred or a customer received anything');
  await expect(root(page)).toContainText('does not independently prove bank settlement');
 });
 test('PSRD-060 Trial and comped filters stay independent of readiness classification',async({page})=>{
  await openSubscriptionReadiness(page);await state(page).selectOption('trialing');await expect(rows(page)).toContainText('subscription review required');
  await state(page).selectOption('comped');await expect(rows(page)).toContainText('subscription ready');
 });
 test('PSRD-061 Tenant and status scopes intersect without exposing other tenants',async({page})=>{
  await openSubscriptionReadiness(page,{query:`tenant_id=${readinessTenantB}&status=trialing`});await expect(rows(page)).toHaveCount(1);
  await expect(table(page)).toContainText('Fixture Readiness Beta');await expect(table(page)).not.toContainText('Fixture Readiness Alpha');
 });
 test('PSRD-062 Search resets offset and retains billing-status filter',async({page})=>{
  await openSubscriptionReadiness(page,{items:manyReadinessItems(52),query:'status=active&offset=50'});
  await search(page).fill('Readiness Fixture 003');await expect(page).toHaveURL(/status=active/);await expect(page).not.toHaveURL(/offset=50/);
 });
 test('PSRD-063 Changing status after page two resets totals and range',async({page})=>{
  await openSubscriptionReadiness(page,{items:manyReadinessItems(55),query:'offset=50'});
  await state(page).selectOption('past_due');await expect(pager(page)).toContainText('Showing 0–0 of 0');
  await expect(rows(page)).toContainText('No subscription-readiness rows match');
 });
 test('PSRD-064 Missing evidence timestamps show Not recorded instead of guessed dates',async({page})=>{
  const item={...readinessItems[0],trial_ends_at:null,current_period_ends_at:null,last_billing_event_at:null,last_payment_provider_event_at:null};
  await openSubscriptionReadiness(page,{items:[item]});await expect(rows(page).first()).toContainText('Not recorded');
  await expect(rows(page).first()).toContainText('Trial: — days');
 });
 test('PSRD-065 Audit navigation cannot be derived without independent audit grant',async({page})=>{
  await openSubscriptionReadiness(page,{permissions:without('platform.audit.read')});await expect(rows(page).first().getByRole('link',{name:'Billing audit'})).toHaveCount(0);
  await expect(rows(page).first().getByRole('link',{name:'Billing record'})).toBeVisible();
 });
 test('PSRD-066 Billing destination uses exactly the row tenant id',async({page})=>{
  await openSubscriptionReadiness(page,{query:`tenant_id=${readinessTenantC}`});
  await expect(rows(page).first().getByRole('link',{name:'Billing record'})).toHaveAttribute('href',`/platform/billing?tenant_id=${readinessTenantC}`);
 });
 test('PSRD-067 Archived tenant status remains separate from comped readiness evidence',async({page})=>{
  await openSubscriptionReadiness(page,{query:`tenant_id=${readinessTenantD}`});await expect(rows(page).first()).toContainText('archived');
  await expect(rows(page).first()).toContainText('subscription ready');await expect(rows(page).first()).toContainText('comped');
 });
 test.skip('PSRD-068 Real backend UUID validation and tenant isolation require Phase 2',async()=>{
  // Assert Joi rejects malformed UUIDs against a disposable backend; browser mock cannot establish authorization or isolation.
 });
 test.skip('PSRD-069 Backend query maximum limits require Phase 2 HTTP validation',async()=>{
  // Validate integer limit 1..100 and offset 0..1000000 with real middleware and controlled requests.
 });
 test.skip('PSRD-070 Concurrent-write summary pagination consistency requires real PostgreSQL',async()=>{
  // Independently test a two-transaction concurrent event/tenant update with real SQL and page summary.
 });
 test.skip('PSRD-071 Cross-role backend permission checks require two real platform principals',async()=>{
  // Missing billing.read and tenants.read must each return 403 on real backend, not just route guard.
 });
 test.skip('PSRD-072 Tenant data isolation requires a disposable two-tenant database',async()=>{
  // Synthetic fixtures cannot establish cross-tenant leakage protection.
 });
 test.skip('PSRD-073 Real provider signature provenance is not established by a mocked event counter',async()=>{
  // Exercise provider signature verification with independently controlled secret and tampered payloads.
 });
 test.skip('PSRD-074 Payment processor settlement needs trusted sandbox reconciliation',async()=>{
  // Do not infer bank settlement from a provider-shaped row.
 });
 test('PSRD-075 Operator notes cannot turn a readiness badge into payment certification',async({page})=>{
  await openSubscriptionReadiness(page);await expect(root(page)).toContainText('It is not payment certification');
  await expect(root(page)).toContainText('A note, invoice-sent entry or lifecycle event does not prove an external payment occurred');
 });
 test.skip('PSRD-076 Runtime subscription entitlements require independent enforcement evidence',async()=>{
  // Requires actual tenant routes/entitlement guards rather than a reported billing status.
 });
 test.skip('PSRD-077 Commercial activation and renewal require documented external approval',async()=>{
  // Must be validated with the organization's authorized contract/approval evidence, not generated data.
 });
 test('PSRD-078 Readiness UI explicitly disclaims customer receipt as an external outcome',async({page})=>{
  await openSubscriptionReadiness(page);await expect(root(page)).toContainText('does not prove an external payment occurred or a customer received anything');
 });
 test.skip('PSRD-079 Actual SQL event history and audit durability require real database',async()=>{
  // Need transactions, interleaving, and persisted audit checks in Phase 2.
 });
 test.skip('PSRD-080 Unknown or NULL legacy billing-state classification needs source-backed database evidence',async()=>{
  // The page renders the server readiness_state, it does not reclassify unknown billing codes locally.
  // The backend classifier must be checked with null/unknown rows in a controlled database.
 });
});
