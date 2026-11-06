/** Batch 110 — platform billing subscription activation source-grounded synthetic UI. Authored, never run.
 * No signed provider webhook, invoice settlement, bank receipt, SQL isolation, or manual owner acceptance certified. */
import {test,expect,type Page} from '@playwright/test';
import {openBillingActivation,activationAlpha,activationBeta,activationGamma,
 BILLING_ACTIVATION_PATH,webhookReview,webhookReady,makeActivationTenant,BILLING_ACTIVATION_PERMISSIONS} from '../../../support/platformBillingSubscriptionActivationFixture';
const LAUNCH_ACCEPTANCE_PERMISSIONS=['platform.dashboard.read','platform.tenants.read','platform.billing.read','platform.sla.read',
 'platform.incidents.read','platform.support_sessions.read','platform.system_health.read','platform.dependencies.read',
 'platform.tenants.export','platform.runbooks.read','platform.security.read'];
const root=(p:Page)=>p.locator('.platform-billing-activation');
const cards=(p:Page)=>root(p).locator('.platform-billing-activation__tenant-card');
const stats=(p:Page)=>root(p).getByLabel('Billing subscription activation key metrics');

test.describe('Platform Billing Subscription Activation — technical evidence, not a payment operation',()=>{
 test('PBSA-001 Hero describes readiness checks rather than billing activation',async({page})=>{
  await openBillingActivation(page);await expect(root(page)).toContainText('Review paid-launch evidence');
 });
 test('PBSA-002 Platform-scoped and read-only badges are visible',async({page})=>{
  await openBillingActivation(page);await expect(root(page)).toContainText('Platform-scoped');await expect(root(page)).toContainText('Read-only evidence');
 });
 test('PBSA-003 Manual commercial acceptance remains a separate visible gate',async({page})=>{
  await openBillingActivation(page);await expect(root(page)).toContainText('Manual commercial acceptance required');
 });
 test('PBSA-004 Initial tenant scope is All billing tenants',async({page})=>{
  await openBillingActivation(page);await expect(page.getByLabel('Tenant filter')).toHaveValue('');
  await expect(root(page)).toContainText('All billing tenants');
 });
 test('PBSA-005 Three source-shaped synthetic tenants are counted in primary metric',async({page})=>{
  await openBillingActivation(page);await expect(stats(page)).toContainText('Tenants reviewed');await expect(cards(page)).toHaveCount(3);
 });
 test('PBSA-006 Hard blocked tenant is counted independently of review',async({page})=>{
  await openBillingActivation(page);await expect(stats(page)).toContainText('Paid launch blocked');
  await expect(cards(page).nth(1)).toContainText('Paid launch blocked');
 });
 test('PBSA-007 Manual review tenant is not reported as ready',async({page})=>{
  await openBillingActivation(page);await expect(stats(page)).toContainText('Manual review required');
  await expect(cards(page).last()).toContainText('Manual review required');
 });
 test('PBSA-008 Control metric is a numerical ratio not a certificate',async({page})=>{
  await openBillingActivation(page);await expect(stats(page)).toContainText('Control evidence');
  await expect(stats(page)).toContainText('/30');
 });
 test('PBSA-009 Provider webhook posture warns independently of tenant block',async({page})=>{
  await openBillingActivation(page);await expect(stats(page)).toContainText('Provider webhook posture');
  await expect(root(page)).toContainText('Provider webhook review required');
 });
 test('PBSA-010 Program gate displays step 210',async({page})=>{
  await openBillingActivation(page);await expect(root(page).locator('.platform-billing-activation__program-panel')).toContainText('Step 210');
 });
 test('PBSA-011 Overdue billing policy reference is informational',async({page})=>{
  await openBillingActivation(page);await expect(root(page).locator('.platform-billing-activation__program-panel')).toContainText('docs/BILLING_SUBSCRIPTION_GUIDE.md');
 });
 test('PBSA-012 Expandable validation boundary disclaims payment settlement',async({page})=>{
  await openBillingActivation(page);await root(page).locator('.platform-billing-activation__validation-note summary').click();
  await expect(root(page).locator('.platform-billing-activation__validation-note')).toContainText('not payment settlement');
 });
 test('PBSA-013 Manual acceptance warning disclaims customer charges',async({page})=>{
  await openBillingActivation(page);await expect(root(page).locator('.platform-billing-activation__acceptance-notice')).toContainText('does not store owner approval, charge a customer');
 });
 test('PBSA-014 Missing broader launch-acceptance grants show permissions explanation',async({page})=>{
  await openBillingActivation(page);await expect(root(page).locator('.platform-billing-activation__permission-note')).toContainText('additional platform permissions');
  await expect(root(page).getByRole('link',{name:'Open launch acceptance'})).toHaveCount(0);
 });
 test('PBSA-015 Three source-shaped synthetic activation cards render',async({page})=>{
  await openBillingActivation(page);await expect(cards(page)).toHaveCount(3);
 });
 test('PBSA-016 Each card displays all fifteen named evidence fields',async({page})=>{
  await openBillingActivation(page);await expect(cards(page).first().locator('.platform-billing-activation__evidence-card')).toHaveCount(15);
 });
 test('PBSA-017 Each card exposes ten independent launch controls',async({page})=>{
  await openBillingActivation(page);await expect(cards(page).first().locator('.platform-billing-activation__control-row')).toHaveCount(10);
 });
 test('PBSA-018 A technical-ready card retains separate manual acceptance requirement',async({page})=>{
  await openBillingActivation(page);await expect(cards(page).first()).toContainText('Technical precheck ready');
  await expect(cards(page).first()).toContainText('manual commercial-owner acceptance');
 });
 test('PBSA-019 Past due and suspended evidence remain visibly blocked',async({page})=>{
  await openBillingActivation(page);await expect(cards(page).nth(1)).toContainText('Paid launch blocked');
  await expect(cards(page).nth(1)).toContainText('past_due');
 });
 test('PBSA-020 Comped plan control is not treated as missing customer reference',async({page})=>{
  await openBillingActivation(page);await expect(cards(page).last()).toContainText('Not required for comped plan');
 });
 test('PBSA-021 Next best step is shown on a blocked tenant',async({page})=>{
  await openBillingActivation(page);await expect(cards(page).nth(1).locator('.platform-billing-activation__next-step')).toContainText('Review the tenant lifecycle status');
 });
 test('PBSA-022 Tenant cards link to billing and subscription readiness',async({page})=>{
  await openBillingActivation(page);await expect(cards(page).first().getByRole('link',{name:'Open billing'})).toHaveAttribute('href','/platform/billing');
  await expect(cards(page).first().getByRole('link',{name:'Open subscription readiness'})).toHaveAttribute('href','/platform/subscription-readiness');
 });
 test('PBSA-023 Billing provider evidence has separate billing review link',async({page})=>{
  await openBillingActivation(page);await expect(root(page).getByRole('link',{name:'Review provider readiness in Billing'})).toHaveAttribute('href','/platform/billing');
 });
 test('PBSA-024 Tenant selector is populated from separate billing endpoint',async({page})=>{
  const calls:string[]=[];await openBillingActivation(page,{onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
  await expect(page.getByLabel('Tenant filter').locator('option')).toHaveCount(4);
  expect(calls).toContain('/platform/billing');
 });
 test('PBSA-025 Tenant selection persists UUID and requests filtered evidence',async({page})=>{
  const q:string[]=[];await openBillingActivation(page,{onCall:(m,p,u)=>{if(m==='GET'&&p===BILLING_ACTIVATION_PATH)q.push(u.toString());}});
  await page.getByLabel('Tenant filter').selectOption(activationBeta);
  await expect(page).toHaveURL(new RegExp(`tenant_id=${activationBeta}`));await expect(cards(page)).toHaveCount(1);
  expect(q.some(s=>s.includes(activationBeta))).toBeTruthy();
 });
 test('PBSA-026 Clearing selected tenant restores unfiltered card list',async({page})=>{
  await openBillingActivation(page,{urlQuery:`tenant_id=${activationAlpha}`});await expect(cards(page)).toHaveCount(1);
  await page.getByLabel('Tenant filter').selectOption('');await expect(cards(page)).toHaveCount(3);
  await expect(page).not.toHaveURL(/tenant_id=/);
 });
 test('PBSA-027 Unknown tenant deep link shows error and does not leak other card details',async({page})=>{
  const missing='b1100000-0000-4000-8000-000000000099';await openBillingActivation(page,{urlQuery:`tenant_id=${missing}`});
  await expect(root(page).getByRole('alert')).toContainText('Unable to load billing subscription activation gate');
  await expect(cards(page)).toHaveCount(0);await expect(page.getByLabel('Tenant filter')).toHaveValue(missing);
 });
 test('PBSA-028 Selector API failure keeps existing board evidence visible',async({page})=>{
  await openBillingActivation(page,{billingTenantsStatus:503});
  await expect(root(page).locator('.platform-billing-activation__filter-warning')).toContainText('Billing tenant filter options could not be loaded');
  await expect(cards(page)).toHaveCount(3);
 });
 test('PBSA-029 Empty activation result shows neutral no-tenants state',async({page})=>{
  await openBillingActivation(page,{rows:[]});await expect(cards(page)).toHaveCount(0);
  await expect(root(page)).toContainText('No tenants found for this activation gate');
 });
 test('PBSA-030 Initial evidence load error offers retry and recovers',async({page})=>{
  let fail=true;await openBillingActivation(page,{respond:(m,p)=>m==='GET'&&p===BILLING_ACTIVATION_PATH&&fail?{status:503,json:{message:'Temporary outage'}}:undefined});
  await expect(root(page).getByRole('alert')).toContainText('Unable to load billing subscription activation gate');
  fail=false;await root(page).getByRole('button',{name:'Retry'}).click();await expect(cards(page)).toHaveCount(3);
 });
 test('PBSA-031 Refresh error retains dated successful snapshot',async({page})=>{
  let fail=false;await openBillingActivation(page,{respond:(m,p)=>m==='GET'&&p===BILLING_ACTIVATION_PATH&&fail?{status:503,json:{message:'Stale evidence'}}:undefined});
  await expect(cards(page)).toHaveCount(3);fail=true;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-billing-activation__feedback[role="status"]')).toContainText('Refresh failed. Showing the last successful billing activation snapshot');
  await expect(cards(page)).toHaveCount(3);
 });
 test('PBSA-032 Healthy webhook posture can show Ready without signing a real event',async({page})=>{
  await openBillingActivation(page,{webhook:webhookReady});await expect(root(page)).toContainText('Provider webhook ready');
  await expect(root(page)).toContainText('Healthy');
 });
 test('PBSA-033 Operational-attention flag independently makes provider posture Review',async({page})=>{
  await openBillingActivation(page,{webhook:{...webhookReady,operational_attention_required:true}});
  await expect(root(page)).toContainText('Provider webhook review required');
 });
 test('PBSA-034 Missing webhook secrets appear in upstream evidence',async({page})=>{
  await openBillingActivation(page);await expect(root(page).locator('.platform-billing-activation__upstream-section')).toContainText('Missing secrets');
  await expect(root(page).locator('.platform-billing-activation__upstream-section')).toContainText('stripe');
 });
 test('PBSA-035 Weak secret warnings are rendered independently of missing secrets',async({page})=>{
  await openBillingActivation(page,{webhook:{...webhookReview,weak_secret_providers:['stripe-weak']}});
  await expect(root(page).locator('.platform-billing-activation__upstream-section')).toContainText('stripe-weak');
 });
 test('PBSA-036 Recent webhook metrics distinguish accepted duplicate and rejected counts',async({page})=>{
  await openBillingActivation(page);await expect(root(page)).toContainText('3 accepted');
  await expect(root(page)).toContainText('1 duplicate');await expect(root(page)).toContainText('2 rejected');
 });
 test('PBSA-037 Unselected scope does not send tenant_id to GET gate',async({page})=>{
  const q:string[]=[];await openBillingActivation(page,{onCall:(m,p,s)=>{if(m==='GET'&&p===BILLING_ACTIVATION_PATH)q.push(s.toString());}});
  expect(q.length).toBeGreaterThan(0);expect(q[0]).not.toContain('tenant_id');
 });
 test('PBSA-038 Tenant selection and Refresh never issue write requests',async({page})=>{
  const writes:string[]=[];await openBillingActivation(page,{onCall:(m,p)=>{if(!['GET','OPTIONS'].includes(m))writes.push(`${m} ${p}`);}});
  await page.getByLabel('Tenant filter').selectOption(activationGamma);
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(cards(page)).toHaveCount(1);expect(writes).toEqual([]);
 });
 test('PBSA-039 Router denies caller missing platform billing-read grant',async({page})=>{
  await openBillingActivation(page,{permissions:['platform.tenants.read'],expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PBSA-040 Router denies caller missing tenant-read grant',async({page})=>{
  await openBillingActivation(page,{permissions:['platform.billing.read'],expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PBSA-041 Invalid generated timestamp falls back to Not available',async({page})=>{
  await openBillingActivation(page,{alter:p=>({...p,generated_at:'broken-date'})});
  await expect(root(page).locator('.platform-billing-activation__refresh-block')).toContainText('Last refreshed: Not available');
 });

 test('PBSA-052 Readiness validation text does not certify signed webhook delivery',async({page})=>{
  await openBillingActivation(page,{webhook:webhookReady});await root(page).locator('.platform-billing-activation__validation-note summary').click();
  await expect(root(page).locator('.platform-billing-activation__validation-note')).toContainText('provider delivery');
 });
 test('PBSA-053 Technical-ready status still disclaims payment settlement',async({page})=>{
  await openBillingActivation(page,{rows:[makeActivationTenant(activationAlpha,'Synthetic Ready')]});
  await root(page).locator('.platform-billing-activation__validation-note summary').click();
  await expect(root(page).locator('.platform-billing-activation__validation-note')).toContainText('not payment settlement');
  await expect(cards(page).first()).toContainText('Technical precheck ready');
 });
 test('PBSA-054 Technical-ready control does not record commercial-owner sign-off',async({page})=>{
  await openBillingActivation(page,{webhook:webhookReady,rows:[makeActivationTenant(activationAlpha,'Synthetic Ready')]});
  await expect(root(page).locator('.platform-billing-activation__acceptance-notice')).toContainText('Manual commercial-owner acceptance is still required');
  await expect(root(page).locator('.platform-billing-activation__acceptance-notice')).toContainText('does not store owner approval');
 });
 test('PBSA-055 Global webhook warning leaves technically ready tenant status unchanged',async({page})=>{
  await openBillingActivation(page,{rows:[makeActivationTenant(activationAlpha,'Synthetic Ready')],webhook:webhookReview});
  await expect(root(page)).toContainText('Provider webhook review required');
  await expect(cards(page).first()).toContainText('Technical precheck ready');
  await expect(cards(page).first()).not.toContainText('Paid launch blocked');
 });
 test('PBSA-058 Mobile viewport preserves scope and warning sections as browser-observable DOM',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openBillingActivation(page);
  await expect(page.getByLabel('Tenant filter')).toBeVisible();
  await expect(root(page).locator('.platform-billing-activation__acceptance-notice')).toBeVisible();
  await expect(root(page).locator('.platform-billing-activation__tenant-section')).toBeVisible();
 });
 test('PBSA-059 Native keyboard can focus tenant selector and refresh control',async({page})=>{
  await openBillingActivation(page);
  const selector=page.getByLabel('Tenant filter');await selector.focus();await expect(selector).toBeFocused();
  await selector.press('ArrowDown');await expect(selector).toBeFocused();
  await root(page).getByRole('button',{name:'Refresh'}).focus();
  await expect(root(page).getByRole('button',{name:'Refresh'})).toBeFocused();
 });
 test('PBSA-060 Native validation details expand and expose evidence boundary to assistive markup',async({page})=>{
  await openBillingActivation(page);const details=root(page).locator('.platform-billing-activation__validation-note');
  await expect(details).not.toHaveAttribute('open','');await details.locator('summary').click();
  await expect(details).toHaveAttribute('open','');await expect(details.locator('p')).toBeVisible();
 });
 test('PBSA-061 All eleven independent platform grants are needed for launch acceptance link',async({page})=>{
  await openBillingActivation(page,{permissions:[...BILLING_ACTIVATION_PERMISSIONS,...LAUNCH_ACCEPTANCE_PERMISSIONS]});
  await expect(root(page).locator('.platform-billing-activation__acceptance-notice').getByRole('link',{name:'Open launch acceptance'}))
   .toHaveAttribute('href','/platform/commercial-launch-acceptance-packet');
 });
 test('PBSA-063 Invalid tenant evidence timestamp is displayed verbatim, not converted to a date',async({page})=>{
  await openBillingActivation(page,{alter:p=>({...p,tenants:p.tenants.map(t=>({...t,evidence:{...t.evidence,last_billing_event_at:'invalidTdate'}}))})});
  await expect(cards(page).first()).toContainText('invalidTdate');
 });
 test('PBSA-064 Unknown upstream status is humanized rather than silently marked ready',async({page})=>{
  await openBillingActivation(page,{alter:p=>({...p,upstream_evidence:{...p.upstream_evidence,
   subscription_readiness:{...p.upstream_evidence.subscription_readiness,posture:'custom_review_state'}}})});
  await expect(root(page).locator('.platform-billing-activation__upstream-card').first()).toContainText('Custom review state');
 });
 test('PBSA-065 Absent optional recent webhook activity removes activity row without losing provider status',async({page})=>{
  await openBillingActivation(page,{webhook:{...webhookReview,recent_webhook_activity:undefined}});
  await expect(root(page).locator('.platform-billing-activation__activity-fact')).toHaveCount(0);
  await expect(root(page)).toContainText('Missing secrets');
 });
});
