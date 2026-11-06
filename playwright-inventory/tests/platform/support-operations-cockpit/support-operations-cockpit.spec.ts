/** Batch 111 — Platform Support Operations Cockpit, source-traced browser UI only.
 * Synthetic GET fixtures cannot certify SQL aggregation, live SLA, communications,
 * support access authorization, customer readiness or commercial acceptance. */
import {test,expect,type Page} from '@playwright/test';
import {openSupportCockpit,SUPPORT_COCKPIT_PATH,SUPPORT_COCKPIT_PERMISSIONS,
 supportAlpha,supportBeta,supportGamma,makeSupportPackage,makeSupportTenant} from '../../../support/platformSupportOperationsCockpitFixture';
const root=(p:Page)=>p.locator('.platform-support-cockpit');
const cards=(p:Page)=>root(p).locator('.platform-support-cockpit__tenant-card');
const stats=(p:Page)=>root(p).getByLabel('Support operations key metrics');
const controlRows=(p:Page)=>cards(p).first().locator('.platform-support-cockpit__control-row');

test.describe('Platform Support Operations Cockpit — read-only support evidence',()=>{
 test('PSOC-001 Page hero identifies Support Operations Cockpit',async({page})=>{
  await openSupportCockpit(page);await expect(root(page)).toContainText('Read-only support readiness evidence');
 });
 test('PSOC-002 Hero states operator precheck is not an automatic action',async({page})=>{
  await openSupportCockpit(page);await expect(root(page)).toContainText('Operator precheck only');
  await expect(root(page)).toContainText('No automatic support actions');
 });
 test('PSOC-003 Program banner identifies source-defined Step 211',async({page})=>{
  await openSupportCockpit(page);await expect(root(page).locator('.platform-support-cockpit__program-panel')).toContainText('Step 211 — Support Operations Cockpit');
 });
 test('PSOC-004 Initially scope is all tenants with no tenant_id query',async({page})=>{
  const q:string[]=[];await openSupportCockpit(page,{onCall:(m,p,s)=>{if(m==='GET'&&p===SUPPORT_COCKPIT_PATH)q.push(s.toString());}});
  await expect(page.getByLabel('Tenant filter')).toHaveValue('');await expect(root(page)).toContainText('All tenants');
  expect(q[0]).not.toContain('tenant_id');
 });
 test('PSOC-005 Selector exposes three tenant names from separate GET tenants',async({page})=>{
  await openSupportCockpit(page);await expect(page.getByLabel('Tenant filter').locator('option')).toHaveCount(4);
  await expect(page.getByLabel('Tenant filter')).toContainText('Support Beta');
 });
 test('PSOC-006 Source-shaped snapshot renders ready blocked and review tenants independently',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).nth(0)).toContainText('Support operations ready');
  await expect(cards(page).nth(1)).toContainText('Support operations blocked');
  await expect(cards(page).nth(2)).toContainText('Support review required');
 });
 test('PSOC-007 Primary stats count three scoped tenants',async({page})=>{
  await openSupportCockpit(page);await expect(stats(page)).toContainText('Tenants reviewed');await expect(cards(page)).toHaveCount(3);
 });
 test('PSOC-008 Ready blocked and review counters remain separately labeled',async({page})=>{
  await openSupportCockpit(page);for(const name of ['Support ready','Support blocked','Review required'])await expect(stats(page)).toContainText(name);
 });
 test('PSOC-009 Overdue work and incident counters are independently visible',async({page})=>{
  await openSupportCockpit(page);await expect(stats(page)).toContainText('Overdue support work');
  await expect(stats(page)).toContainText('Open incidents');
 });
 test('PSOC-010 Detailed summary shows tenant count-independent support obligations',async({page})=>{
  await openSupportCockpit(page);const panel=root(page).locator('.platform-support-cockpit__summary-panel');
  await expect(panel).toContainText('Missing primary contact');await expect(panel).toContainText('Pending support approvals');
 });
 test('PSOC-011 Exactly thirteen detailed summary counters are rendered',async({page})=>{
  await openSupportCockpit(page);await expect(root(page).locator('.platform-support-cockpit__summary-item')).toHaveCount(13);
 });
 test('PSOC-012 Control catalogue renders ten source-backed control definitions',async({page})=>{
  await openSupportCockpit(page);await expect(root(page).locator('.platform-support-cockpit__control-card')).toHaveCount(10);
 });
 test('PSOC-013 Control catalogue names the primary and escalation contact requirements',async({page})=>{
  await openSupportCockpit(page);await expect(root(page).locator('.platform-support-cockpit__controls-section')).toContainText('Primary customer contact present');
  await expect(root(page).locator('.platform-support-cockpit__controls-section')).toContainText('Escalation contact present');
 });
 test('PSOC-014 Control catalogue links each control to a visible evidence key',async({page})=>{
  await openSupportCockpit(page);const c=root(page).locator('.platform-support-cockpit__control-card').first();
  await expect(c).toContainText('primary_contact_present');await expect(c).toContainText('primary_contacts');
 });
 test('PSOC-015 Native validation note expands and describes non-certification boundary',async({page})=>{
  await openSupportCockpit(page);const detail=root(page).locator('.platform-support-cockpit__validation-note');
  await detail.locator('summary').click();await expect(detail).toHaveAttribute('open','');
  await expect(detail).toContainText('without mutating support data or certifying launch');
 });
 test('PSOC-016 Operator notice keeps manual launch responsibility separate',async({page})=>{
  await openSupportCockpit(page);await expect(root(page).locator('.platform-support-cockpit__operator-notice')).toContainText('does not certify commercial launch');
 });
 test('PSOC-017 Ready tenant lists a source-defined next support step',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).first().locator('.platform-support-cockpit__next-step')).toContainText('ready to feed production monitoring');
 });
 test('PSOC-018 Blocked tenant highlights missing primary contact',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).nth(1)).toContainText('Primary customer contact present');
  await expect(cards(page).nth(1)).toContainText('Evidence missing');
 });
 test('PSOC-019 Review tenant shows pending approval as review not hard block',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).nth(2)).toContainText('Pending support approval review');
  await expect(cards(page).nth(2)).not.toContainText('Support operations blocked');
 });
 test('PSOC-020 Each tenant has Contacts link with its own tenant_id',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).first().getByRole('link',{name:'Contacts'}))
   .toHaveAttribute('href',`/platform/tenant-contacts?tenant_id=${supportAlpha}`);
 });
 test('PSOC-021 Each tenant has SLA link using its own tenant_id',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).nth(1).getByRole('link',{name:'SLA'}))
   .toHaveAttribute('href',`/platform/tenant-sla?tenant_id=${supportBeta}`);
 });
 test('PSOC-022 Tasks drill-down applies tenant and support category',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).last().getByRole('link',{name:'Tasks'}))
   .toHaveAttribute('href',`/platform/tenant-tasks?tenant_id=${supportGamma}&category=support`);
 });
 test('PSOC-023 Incident drill-down preserves tenant identity',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).nth(1).getByRole('link',{name:'Incidents'}))
   .toHaveAttribute('href',`/platform/incidents?tenant_id=${supportBeta}`);
 });
 test('PSOC-024 Sessions link is global and does not imply tenant-scoped session filter',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).first().getByRole('link',{name:'Sessions'}))
   .toHaveAttribute('href','/platform/support-sessions');
 });
 test('PSOC-025 Contact evidence distinguishes primary versus escalation count',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).first().locator('.platform-support-cockpit__evidence-grid')).toContainText('1 primary · 1 escalation');
 });
 test('PSOC-026 Tenant SLA shows active policy rather than missing policy',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).first()).toContainText('Active policy present');
 });
 test('PSOC-027 Tenant SLA displays both response and resolution targets',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).first()).toContainText('Response 30 min · Resolution 8 h');
 });
 test('PSOC-028 Blocked tenant displays open overdue and urgent support work',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).nth(1)).toContainText('3 open · 2 overdue');
  await expect(cards(page).nth(1)).toContainText('1 urgent');
 });
 test('PSOC-029 Customer context exposes last contact timestamp label',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).first()).toContainText('Last touch:');
  await expect(cards(page).first()).toContainText('Customer context');
 });
 test('PSOC-030 Customer context exposes unresolved follow-ups and handover notes',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).last()).toContainText('1 unresolved follow-ups · 1 handover notes');
 });
 test('PSOC-031 Incident count is tenant-specific inside each card',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).nth(1).locator('.platform-support-cockpit__evidence-grid')).toContainText('Incidents');
  await expect(cards(page).nth(1)).toContainText('1 open');
 });
 test('PSOC-032 Support session and approval counts are separate fields',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).last()).toContainText('0 active sessions');
  await expect(cards(page).last()).toContainText('1 pending approvals');
 });
 test('PSOC-033 Every tenant card renders ten control results',async({page})=>{
  await openSupportCockpit(page);await expect(controlRows(page)).toHaveCount(10);
  await expect(cards(page).last().locator('.platform-support-cockpit__control-row')).toHaveCount(10);
 });
 test('PSOC-034 Control ratio counts source-defined evidence not an external certificate',async({page})=>{
  await openSupportCockpit(page);await expect(cards(page).first().locator('.platform-support-cockpit__control-status-heading'))
   .toContainText('10/10 controls with evidence');
 });
 test('PSOC-035 Unknown control status is humanized rather than treated as ready',async({page})=>{
  await openSupportCockpit(page,{alter:p=>({...p,tenants:p.tenants.map(t=>({...t,controls:t.controls.map((c,i)=>i===0?{...c,status:'custom_review_state'}:c)}))})});
  await expect(cards(page).first()).toContainText('Custom review state');
 });
 test('PSOC-036 Tenant selection updates URL and requests only selected tenant evidence',async({page})=>{
  const requests:string[]=[];await openSupportCockpit(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===SUPPORT_COCKPIT_PATH)requests.push(q.toString());}});
  await page.getByLabel('Tenant filter').selectOption(supportBeta);
  await expect(page).toHaveURL(new RegExp(`tenant_id=${supportBeta}`));await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText('Support Beta');expect(requests.some(q=>q.includes(supportBeta))).toBeTruthy();
 });
 test('PSOC-037 Clearing scope returns to all tenants and removes tenant_id',async({page})=>{
  await openSupportCockpit(page,{urlQuery:`tenant_id=${supportAlpha}`});await expect(cards(page)).toHaveCount(1);
  await page.getByLabel('Tenant filter').selectOption('');await expect(cards(page)).toHaveCount(3);
  await expect(page).not.toHaveURL(/tenant_id=/);
 });
 test('PSOC-038 Existing tenant deep link uses exact selected tenant UUID',async({page})=>{
  await openSupportCockpit(page,{urlQuery:`tenant_id=${supportGamma}`});await expect(page.getByLabel('Tenant filter')).toHaveValue(supportGamma);
  await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('Support Gamma');
 });
 test('PSOC-039 Unknown UUID remains in scope option and shows request error',async({page})=>{
  const unknown='b1110000-0000-4000-8000-000000000099';await openSupportCockpit(page,{urlQuery:`tenant_id=${unknown}`});
  await expect(root(page).getByRole('alert')).toContainText('Unable to load support operations cockpit');
  await expect(page.getByLabel('Tenant filter')).toHaveValue(unknown);await expect(cards(page)).toHaveCount(0);
 });
 test('PSOC-040 Failed selector GET retains current cockpit snapshot',async({page})=>{
  await openSupportCockpit(page,{tenantListStatus:503});
  await expect(root(page).locator('.platform-support-cockpit__filter-warning')).toContainText('Tenant filter options could not be loaded');
  await expect(cards(page)).toHaveCount(3);
 });
 test('PSOC-041 Failed initial cockpit GET shows alert and Retry',async({page})=>{
  let unavailable=true;await openSupportCockpit(page,{respond:(m,p)=>m==='GET'&&p===SUPPORT_COCKPIT_PATH&&unavailable?
   {status:503,json:{message:'Temporary unavailable'}}:undefined});
  await expect(root(page).getByRole('alert')).toContainText('Unable to load support operations cockpit');
  unavailable=false;await root(page).getByRole('button',{name:'Retry'}).click();await expect(cards(page)).toHaveCount(3);
 });
 test('PSOC-042 Refresh failure preserves last successful snapshot and offers retry',async({page})=>{
  let unavailable=false;await openSupportCockpit(page,{respond:(m,p)=>m==='GET'&&p===SUPPORT_COCKPIT_PATH&&unavailable?
   {status:503,json:{message:'Refresh unavailable'}}:undefined});
  await expect(cards(page)).toHaveCount(3);unavailable=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).locator('.platform-support-cockpit__feedback[role="status"]')).toContainText('Showing the last successful support operations snapshot');
  await expect(cards(page)).toHaveCount(3);
 });
 test('PSOC-043 Empty tenant response shows explicit neutral state',async({page})=>{
  await openSupportCockpit(page,{rows:[]});await expect(cards(page)).toHaveCount(0);
  await expect(root(page)).toContainText('No tenants found for this support operations cockpit');
 });
 test('PSOC-044 No tenant scope is not presented as Support ready',async({page})=>{
  await openSupportCockpit(page,{rows:[]});await expect(root(page).locator('.platform-support-cockpit__program-panel')).toContainText('No tenants to review');
 });
 test('PSOC-045 Read-only selection and refresh never invoke POST PATCH PUT or DELETE',async({page})=>{
  const writes:string[]=[];await openSupportCockpit(page,{onCall:(m,p)=>{if(!['GET','OPTIONS'].includes(m))writes.push(`${m} ${p}`);}});
  await page.getByLabel('Tenant filter').selectOption(supportAlpha);
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(cards(page)).toHaveCount(1);
  expect(writes).toEqual([]);
 });
 test('PSOC-046 Router denies caller lacking tenants-read permission',async({page})=>{
  await openSupportCockpit(page,{permissions:SUPPORT_COCKPIT_PERMISSIONS.filter(p=>p!=='platform.tenants.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PSOC-047 Router denies caller lacking SLA-read permission',async({page})=>{
  await openSupportCockpit(page,{permissions:SUPPORT_COCKPIT_PERMISSIONS.filter(p=>p!=='platform.sla.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PSOC-048 Router denies caller lacking incidents-read permission',async({page})=>{
  await openSupportCockpit(page,{permissions:SUPPORT_COCKPIT_PERMISSIONS.filter(p=>p!=='platform.incidents.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PSOC-049 Router denies caller lacking support-sessions-read permission',async({page})=>{
  await openSupportCockpit(page,{permissions:SUPPORT_COCKPIT_PERMISSIONS.filter(p=>p!=='platform.support_sessions.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PSOC-050 Broken timestamp remains labelled Not available without inventing refresh time',async({page})=>{
  await openSupportCockpit(page,{alter:p=>({...p,generated_at:'invalid'})});
  await expect(root(page).locator('.platform-support-cockpit__refresh-block')).toContainText('Last refreshed: Not available');
 });
 test('PSOC-056 Failed directory preserves unknown scoped UUID and visible fallback name',async({page})=>{
  const id='b1110000-0000-4000-8000-000000000099';
  await openSupportCockpit(page,{urlQuery:`tenant_id=${id}`,tenantListStatus:503,
   respond:(m,p)=>m==='GET'&&p===SUPPORT_COCKPIT_PATH?{json:makeSupportPackage([makeSupportTenant(id,'Unknown scoped tenant')])}:undefined});
  await expect(page.getByLabel('Tenant filter')).toHaveValue(id);
  await expect(root(page).locator('.platform-support-cockpit__scope-panel')).toContainText(`Selected tenant (${id.slice(0,8)}`);
  await expect(root(page).locator('.platform-support-cockpit__filter-warning')).toContainText('current URL scope is preserved');
 });
 test('PSOC-063 Long tenant and control text retains readable content at tablet viewport',async({page})=>{
  const name='Extended customer support administration group '+ 'A'.repeat(100);
  await page.setViewportSize({width:820,height:840});
  await openSupportCockpit(page,{rows:[makeSupportTenant(supportAlpha,name)],
   alter:p=>({...p,tenants:p.tenants.map(t=>({...t,controls:t.controls.map((c,i)=>i===0?{...c,launch_reason:'Long support justification '+ 'B'.repeat(130)}:c)}))})});
  await expect(cards(page).first().getByRole('heading',{name})).toBeVisible();
  await expect(cards(page).first().locator('.platform-support-cockpit__control-row').first()).toBeVisible();
 });
 test('PSOC-064 Phone layout keeps scoped tenant controls and navigation accessible',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openSupportCockpit(page);
  await expect(page.getByLabel('Tenant filter')).toBeVisible();
  await expect(cards(page).first().getByRole('link',{name:'Contacts'})).toBeVisible();
  await expect(cards(page).first().locator('.platform-support-cockpit__control-row').last()).toBeVisible();
 });
 test('PSOC-065 Keyboard tab reaches tenant selector then its next focusable action',async({page})=>{
  await openSupportCockpit(page);await page.getByLabel('Tenant filter').focus();
  await expect(page.getByLabel('Tenant filter')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(root(page).locator('.platform-support-cockpit__validation-note > summary')).toBeFocused();
 });
 test('PSOC-066 Named support tools region and status labels remain exposed',async({page})=>{
  await openSupportCockpit(page);
  await expect(cards(page).first().getByLabel('Support tools for Support Alpha')).toBeVisible();
  await expect(cards(page).nth(1).locator('.platform-support-cockpit__status-badge').first()).toContainText('Support operations blocked');
 });
 test('PSOC-074 Successful retry clears stale snapshot warning and updates refresh timestamp',async({page})=>{
  let fail=false,version=0;
  await openSupportCockpit(page,{respond:(m,p)=>{
   if(m==='GET'&&p===SUPPORT_COCKPIT_PATH){
    if(fail)return {status:503,json:{message:'Synthetic temporary error'}};
    const data=makeSupportPackage();return {json:{...data,generated_at:version?'2026-11-05T14:00:00Z':'2026-11-05T12:00:00Z'}};
   }return undefined;
  }});
  const dateBefore=await root(page).locator('.platform-support-cockpit__refresh-block').innerText();
  fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).locator('.platform-support-cockpit__feedback[role="status"]')).toBeVisible();
  fail=false;version=1;await root(page).getByRole('button',{name:'Retry refresh'}).click();
  await expect(root(page).locator('.platform-support-cockpit__feedback[role="status"]')).toHaveCount(0);
  const dateAfter=await root(page).locator('.platform-support-cockpit__refresh-block').innerText();
  expect(dateAfter).not.toBe(dateBefore);
 });
 test('PSOC-075 Tenant selector preserves unrelated URL parameters without backend forwarding',async({page})=>{
  const requests:string[]=[];
  await openSupportCockpit(page,{urlQuery:'view=compact&sort=name',onCall:(method,path,query)=>{
   if(method==='GET'&&path===SUPPORT_COCKPIT_PATH)requests.push(query.toString());
  }});
  await page.getByLabel('Tenant filter').selectOption(supportAlpha);
  await expect(page).toHaveURL(/view=compact/);await expect(page).toHaveURL(/sort=name/);
  await expect(page).toHaveURL(new RegExp('tenant_id='+supportAlpha));
  await expect(cards(page)).toHaveCount(1);
  expect(requests.at(-1)).toBe('tenant_id='+supportAlpha);
 });
});
