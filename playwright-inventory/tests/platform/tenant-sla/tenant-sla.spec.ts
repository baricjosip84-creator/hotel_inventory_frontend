import {syntheticSlaRows,slaPolicies} from '../../../support/tenantSlaFixture';
import {test,expect,type Page} from '@playwright/test';
import {openTenantSla,slaRows,TASK_TENANT_A,TASK_TENANT_B} from '../../../support/tenantSlaFixture';
/** Batch 65 — GENERATED_UNRUN. Synthetic platform responses; not a backend or contractual acceptance test. */
const filterGrid=(page:Page)=>page.locator('.platform-tenant-sla__filter-grid');
const slaCard=(page:Page,name:string)=>page.locator('.platform-tenant-sla__card').filter({has:page.getByRole('heading',{name,exact:true})});
const overviewEndpoint='/platform/tenant-sla/overview';
test.describe('Platform Tenant SLA — Batch 65, GENERATED_UNRUN',()=>{
 test('PSLA-001 SLA page explains application evidence is not contractual proof',async({page})=>{
  await openTenantSla(page);await expect(page.locator('.platform-tenant-sla__truth-note')).toContainText('Application evidence ≠ contractual proof.');
  await expect(page.locator('.platform-tenant-sla__truth-note')).toContainText('not prove an external contractual SLA');
 });
 test('PSLA-002 Overview is requested with limit 100 offset 0',async({page})=>{
  const queries:URLSearchParams[]=[];await openTenantSla(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint)queries.push(new URLSearchParams(q));}});
  await expect.poll(()=>queries.length).toBeGreaterThan(0);expect(queries[0].get('limit')).toBe('100');expect(queries[0].get('offset')).toBe('0');
 });
 test('PSLA-003 Policy picker is requested with limit 250',async({page})=>{
  const queries:URLSearchParams[]=[];await openTenantSla(page,{onCall:(m,p,q)=>{if(m==='GET'&&p==='/platform/tenant-sla')queries.push(new URLSearchParams(q));}});
  await expect.poll(()=>queries.length).toBeGreaterThan(0);expect(queries[0].get('limit')).toBe('250');expect(queries[0].get('offset')).toBe('0');
 });
 test('PSLA-004 Tenant UUID in URL scopes overview request',async({page})=>{
  const queries:URLSearchParams[]=[];await openTenantSla(page,{query:`tenant_id=${TASK_TENANT_A}`,onCall:(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint)queries.push(new URLSearchParams(q));}});
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();await expect(slaCard(page,'Fixture Warehouse')).toHaveCount(0);
  expect(queries[0].get('tenant_id')).toBe(TASK_TENANT_A);
 });
 test('PSLA-005 Invalid tenant UUID blocks overview GET',async({page})=>{
  const calls:string[]=[];await openTenantSla(page,{query:'tenant_id=bad',onCall:(m,p)=>{if(m==='GET'&&p===overviewEndpoint)calls.push(p);}});
  await expect(page.getByText('Invalid Tenant SLA URL filter')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PSLA-006 Unsupported view rejects URL before overview fetch',async({page})=>{
  const calls:string[]=[];await openTenantSla(page,{query:'view=other',onCall:(m,p)=>{if(m==='GET'&&p===overviewEndpoint)calls.push(p);}});
  await expect(page.getByText('Invalid Tenant SLA URL filter')).toBeVisible();expect(calls).toHaveLength(0);
 });
 test('PSLA-007 Repair removes invalid filters without clearing unrelated query state',async({page})=>{
  await openTenantSla(page,{query:`tenant_id=${TASK_TENANT_A}&view=bad`});
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(new RegExp(`tenant_id=${TASK_TENANT_A}`));await expect(page).not.toHaveURL(/view=bad/);
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();
 });
 test('PSLA-008 Breached-only view filters loaded rows locally',async({page})=>{
  const queries:URLSearchParams[]=[];await openTenantSla(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint)queries.push(new URLSearchParams(q));}});
  await filterGrid(page).getByLabel('Loaded-page view').selectOption('breached');
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();await expect(slaCard(page,'Fixture Warehouse')).toHaveCount(0);
  await expect(page).toHaveURL(/view=breached/);expect(queries.every(q=>!q.has('view'))).toBe(true);
 });
 test('PSLA-009 Persisted breached policy has danger posture',async({page})=>{
  await openTenantSla(page);const card=slaCard(page,'Fixture Hotel');
  await expect(card.locator('[data-tone="danger"]')).toContainText('Breached');
  await expect(card).toContainText('Persisted SLA policy');
 });
 test('PSLA-010 Template defaults are not misrepresented as saved policy',async({page})=>{
  await openTenantSla(page);const card=slaCard(page,'Fixture Warehouse');
  await expect(card).toContainText('Template defaults — policy not configured');
  await expect(card.locator('[data-tone="warn"]')).toContainText('Not configured');
 });
 test('PSLA-011 Restricted evidence counters display Restricted instead of zero',async({page})=>{
  await openTenantSla(page);const metrics=slaCard(page,'Fixture Warehouse').locator('.platform-tenant-sla__metrics-grid');
  await expect(metrics).toContainText('Restricted');await expect(metrics).not.toContainText('undefined');
 });
 test('PSLA-012 Missing SLA write permission hides policy editor and save',async({page})=>{
  await openTenantSla(page,{permissions:['platform.dashboard.read','platform.sla.read','platform.tenants.read']});
  await expect(page.getByRole('button',{name:'Save policy'})).toHaveCount(0);
  await expect(slaCard(page,'Fixture Hotel').getByRole('button',{name:'Edit policy'})).toHaveCount(0);
 });
 test('PSLA-013 Full evidence plus write and notifications permission is required for scan button',async({page})=>{
  await openTenantSla(page,{permissions:['platform.dashboard.read','platform.sla.read','platform.sla.write','platform.tenants.read','platform.incidents.read','platform.support_sessions.read']});
  await expect(page.getByRole('button',{name:'Synchronize SLA notifications'})).toHaveCount(0);
  await expect(page.locator('.platform-tenant-sla__scan-row')).toContainText('PLATFORM_NOTIFICATIONS_WRITE');
 });
 test('PSLA-014 Policy save is disabled until tenant is selected',async({page})=>{
  await openTenantSla(page);await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();
  await page.locator('.platform-tenant-sla__policy-grid').getByLabel('Tenant',{exact:true}).selectOption(TASK_TENANT_A);
  await expect(page.getByRole('button',{name:'Save policy'})).toBeEnabled();
 });
 test('PSLA-015 Policy input limits reject zero response target',async({page})=>{
  const writes:string[]=[];await openTenantSla(page,{onCall:(m,p)=>{if(m==='PUT'&&p.startsWith('/platform/tenant-sla/'))writes.push(p);}});
  const form=page.locator('.platform-tenant-sla__policy-grid');await form.getByLabel('Tenant',{exact:true}).selectOption(TASK_TENANT_A);
  await form.getByLabel('Response target (minutes)').fill('0');
  await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();expect(writes).toHaveLength(0);
 });
});

/** Batch 66 — source-traced, synthetic browser declarations only. No tests executed. */
const policyForm=(page:Page)=>page.locator('.platform-tenant-sla__policy-grid');
const evidenceCells=(page:Page)=>page.locator('.platform-tenant-sla__evidence-grid');
const slaCards=(page:Page)=>page.locator('.platform-tenant-sla__card');
const allSlaPermissions=['platform.dashboard.read','platform.sla.read','platform.sla.write','platform.tenants.read','platform.incidents.read','platform.support_sessions.read','platform.notifications.read','platform.notifications.write'];
const policyPut=(path:string,method:string)=>method==='PUT'&&path===`/platform/tenant-sla/${TASK_TENANT_A}`;
async function pickSlaTenant(page:Page,id=TASK_TENANT_A){await policyForm(page).getByLabel('Tenant',{exact:true}).selectOption(id);}

test.describe('Platform Tenant SLA — Batch 66, GENERATED_UNRUN',()=>{
 test('PSLA-016 Valid view=all URL displays all loaded SLA rows',async({page})=>{
  await openTenantSla(page,{query:'view=all'});await expect(slaCards(page)).toHaveCount(2);
  await expect(filterGrid(page).getByLabel('Loaded-page view')).toHaveValue('all');
 });
 test('PSLA-017 Clearing breached filter preserves valid tenant scope',async({page})=>{
  await openTenantSla(page,{query:`tenant_id=${TASK_TENANT_A}&view=breached`});
  await filterGrid(page).getByLabel('Loaded-page view').selectOption('all');
  await expect(page).toHaveURL(new RegExp(`tenant_id=${TASK_TENANT_A}`));
  await expect(page).not.toHaveURL(/view=breached/);await expect(slaCards(page)).toHaveCount(1);
 });
 test('PSLA-018 Tenant selection updates URL and scoped overview request',async({page})=>{
  const seen:URLSearchParams[]=[];await openTenantSla(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint)seen.push(new URLSearchParams(q));}});
  await filterGrid(page).getByLabel('Tenant',{exact:true}).selectOption(TASK_TENANT_B);
  await expect(page).toHaveURL(new RegExp(`tenant_id=${TASK_TENANT_B}`));
  await expect(slaCard(page,'Fixture Warehouse')).toBeVisible();await expect(slaCard(page,'Fixture Hotel')).toHaveCount(0);
  expect(seen.some(q=>q.get('tenant_id')===TASK_TENANT_B)).toBe(true);
 });
 test('PSLA-019 Selected tenant display uses scoped overview row label',async({page})=>{
  await openTenantSla(page,{query:`tenant_id=${TASK_TENANT_A}`});
  await expect(page.getByText('Tenant scope: Fixture Hotel')).toBeVisible();
 });
 test('PSLA-020 Missing overview row falls back to policy-picker label',async({page})=>{
  await openTenantSla(page,{query:`tenant_id=${TASK_TENANT_A}`,rows:[slaRows[1]]});
  await expect(page.getByText('Tenant scope: Fixture Hotel')).toBeVisible();await expect(slaCards(page)).toHaveCount(0);
 });
 test('PSLA-021 Unknown but syntactically valid tenant retains scoped fallback',async({page})=>{
  const unknown='88888888-8888-4888-8888-999999999999';await openTenantSla(page,{query:`tenant_id=${unknown}`});
  await expect(page.getByText('Tenant scope: Selected tenant')).toBeVisible();
  await expect(page.locator('.platform-tenant-sla__blocking-error')).toHaveCount(0);
 });
 test('PSLA-022 Clear invalid filters repairs both tenant and view',async({page})=>{
  await openTenantSla(page,{query:'tenant_id=bad&view=invalid&keep=1'});
  await expect(page.locator('.platform-tenant-sla__blocking-error')).toContainText('tenant_id must be a UUID');
  await expect(page.locator('.platform-tenant-sla__blocking-error')).toContainText('view must be all or breached');
  await page.getByRole('button',{name:'Clear invalid filters'}).click();
  await expect(page).toHaveURL(/keep=1/);await expect(page).not.toHaveURL(/tenant_id=bad|view=invalid/);
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();
 });
 test('PSLA-023 Malformed tenant filter does not request unfiltered SLA evidence',async({page})=>{
  const queries:string[]=[];await openTenantSla(page,{query:'tenant_id=bad',onCall:(m,p)=>{if(m==='GET'&&p===overviewEndpoint)queries.push(p);}});
  await expect(page.locator('.platform-tenant-sla__blocking-error')).toBeVisible();
  await expect(slaCards(page)).toHaveCount(0);expect(queries).toHaveLength(0);
 });
 test('PSLA-024 Changing tenant scope resets server pagination to offset zero',async({page})=>{
  const queries:URLSearchParams[]=[];await openTenantSla(page,{rows:syntheticSlaRows(103),onCall:(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint)queries.push(new URLSearchParams(q));}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Page 2 · 3 loaded')).toBeVisible();
  await filterGrid(page).getByLabel('Tenant',{exact:true}).selectOption(TASK_TENANT_A);
  await expect(page.getByText('Page 1 · 0 loaded')).toBeVisible();
  expect(queries.some(q=>q.get('tenant_id')===TASK_TENANT_A&&q.get('offset')==='0')).toBe(true);
 });
 test('PSLA-025 Loaded-page view change resets offset, not just local card visibility',async({page})=>{
  const seen:string[]=[];await openTenantSla(page,{rows:syntheticSlaRows(105),onCall:(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint)seen.push(q.get('offset')||'');}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Page 2 · 5 loaded')).toBeVisible();
  await filterGrid(page).getByLabel('Loaded-page view').selectOption('breached');
  await expect(page.getByText(/Page 1 · 100 loaded/)).toBeVisible();
  expect(seen.slice(-1)).toEqual(['0']);
 });
 test('PSLA-026 Fully available evidence shows all three evidence families',async({page})=>{
  await openTenantSla(page);const grid=evidenceCells(page);
  for(const label of ['Incident evidence','Tenant task evidence','Support-session evidence']){
   await expect(grid.locator('[data-state="available"]').filter({hasText:label})).toContainText('Available');
  }
 });
 test('PSLA-027 Partial evidence explicitly identifies protected missing families',async({page})=>{
  await openTenantSla(page,{evidence:{available:['incidents'],omitted:['tenant_tasks','support_sessions'],complete:false}});
  await expect(evidenceCells(page).locator('[data-state="restricted"]')).toHaveCount(2);
  await expect(page.getByText('Evidence: Partial')).toBeVisible();
  await expect(page.getByText('Final within-SLA status is withheld because protected evidence is unavailable.')).toBeVisible();
 });
 test('PSLA-028 Partial-evidence row does not claim verified compliance',async({page})=>{
  const row={...slaRows[0],status:'partial_evidence',known_breach_count:0,breach_count:0};
  await openTenantSla(page,{rows:[row],evidence:{available:['tenant_tasks'],omitted:['incidents','support_sessions'],complete:false}});
  await expect(slaCard(page,'Fixture Hotel').locator('.platform-tenant-sla__posture')).toHaveText('Partial evidence');
  await expect(slaCard(page,'Fixture Hotel').locator('[data-tone="good"]')).toHaveCount(0);
 });
 test('PSLA-029 Known breach remains visible when other evidence is restricted',async({page})=>{
  await openTenantSla(page,{evidence:{available:['incidents'],omitted:['tenant_tasks','support_sessions'],complete:false}});
  await expect(slaCard(page,'Fixture Hotel').locator('.platform-tenant-sla__posture')).toHaveText('Breached');
  await expect(page.getByText('Evidence: Partial')).toBeVisible();
 });
 test('PSLA-030 Unconfigured defaults remain explicitly not configured',async({page})=>{
  await openTenantSla(page);const row=slaCard(page,'Fixture Warehouse');
  await expect(row).toContainText('Template defaults — policy not configured');
  await expect(row.locator('.platform-tenant-sla__posture')).toHaveText('Not configured');
 });
 test('PSLA-031 Inactive persisted policy shows neutral inactive state',async({page})=>{
  const row={...slaRows[0],status:'inactive',is_active:false};await openTenantSla(page,{rows:[row]});
  await expect(slaCard(page,'Fixture Hotel')).toContainText('Inactive');
  await expect(slaCard(page,'Fixture Hotel').locator('[data-tone="neutral"]')).toHaveText('Inactive');
 });
 test('PSLA-032 Zero breaches with partial evidence is not verified within SLA',async({page})=>{
  const row={...slaRows[0],status:'partial_evidence',breach_count:0,known_breach_count:0};
  await openTenantSla(page,{rows:[row],evidence:{available:['incidents'],omitted:['tenant_tasks','support_sessions'],complete:false}});
  await expect(slaCard(page,'Fixture Hotel')).toContainText('Known breach areas');
  await expect(slaCard(page,'Fixture Hotel').locator('.platform-tenant-sla__posture')).toHaveText('Partial evidence');
 });
 test('PSLA-033 Summary counts are scoped to the loaded 100-row server page',async({page})=>{
  await openTenantSla(page,{rows:syntheticSlaRows(102)});
  await expect(page.getByText('Page 1 · 100 loaded')).toBeVisible();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByText('Page 2 · 2 loaded')).toBeVisible();await expect(slaCards(page)).toHaveCount(2);
 });
 test('PSLA-034 Empty scoped overview shows bounded no-matches state',async({page})=>{
  const unknown='88888888-8888-4888-8888-999999999999';await openTenantSla(page,{query:`tenant_id=${unknown}`});
  await expect(page.getByText('No SLA rows match this loaded-page view.')).toBeVisible();
  await expect(page.locator('.platform-tenant-sla__empty')).toContainText('does not prove');
 });
 test('PSLA-035 Null protected counters render Restricted rather than zero',async({page})=>{
  await openTenantSla(page);const card=slaCard(page,'Fixture Warehouse');
  await expect(card.locator('.platform-tenant-sla__metrics-grid')).toContainText('Restricted');
  await expect(card.locator('.platform-tenant-sla__metrics-grid')).not.toContainText('undefined');
 });
 test('PSLA-036 Selecting a persisted policy loads its saved form values',async({page})=>{
  await openTenantSla(page);await pickSlaTenant(page);
  await expect(policyForm(page).getByLabel('Response target (minutes)')).toHaveValue('30');
  await expect(policyForm(page).getByLabel('Incident resolution (hours)')).toHaveValue('12');
  await expect(policyForm(page).getByLabel('Review cadence')).toHaveValue('daily');
 });
 test('PSLA-037 Edit policy action hydrates form from selected SLA row',async({page})=>{
  await openTenantSla(page);await slaCard(page,'Fixture Hotel').getByRole('button',{name:'Edit policy'}).click();
  await expect(policyForm(page).getByLabel('Tenant',{exact:true})).toHaveValue(TASK_TENANT_A);
  await expect(policyForm(page).getByLabel('Task overdue grace (hours)')).toHaveValue('3');
  await expect(policyForm(page).getByLabel('Escalation notes')).toHaveValue('Synthetic escalation');
 });
 test('PSLA-038 Reset form restores unselected defaults without PUT',async({page})=>{
  let writes=0;await openTenantSla(page,{onCall:(m,p)=>{if(m==='PUT'&&p.startsWith('/platform/tenant-sla/'))writes++;}});
  await pickSlaTenant(page);await policyForm(page).getByLabel('Response target (minutes)').fill('45');
  await page.getByRole('button',{name:'Reset form'}).click();
  await expect(policyForm(page).getByLabel('Tenant',{exact:true})).toHaveValue('');
  await expect(policyForm(page).getByLabel('Response target (minutes)')).toHaveValue('60');
  await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();expect(writes).toBe(0);
 });
 test('PSLA-039 Choosing template defaults warns that Save creates policy',async({page})=>{
  await openTenantSla(page);await pickSlaTenant(page,TASK_TENANT_B);
  await expect(page.locator('.platform-tenant-sla__policy-actions')).toContainText('Saving will turn the displayed template defaults into a persisted SLA policy.');
  await expect(policyForm(page).getByLabel('Active policy')).toBeChecked();
 });
 test('PSLA-040 Save policy targets only the selected tenant UUID',async({page})=>{
  const writes:string[]=[];await openTenantSla(page,{onCall:(m,p)=>{if(m==='PUT')writes.push(p);}});
  await pickSlaTenant(page);await page.getByRole('button',{name:'Save policy'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes).toEqual([`/platform/tenant-sla/${TASK_TENANT_A}`]);
 });
 test('PSLA-041 Save trims whitespace surrounding escalation notes',async({page})=>{
  const bodies:Record<string,unknown>[]=[];await openTenantSla(page,{onCall:(m,p,q,body)=>{if(policyPut(p,m))bodies.push(body as Record<string,unknown>);}});
  await pickSlaTenant(page);await policyForm(page).getByLabel('Escalation notes').fill('  Review team on call  ');
  await page.getByRole('button',{name:'Save policy'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0].escalation_notes).toBe('Review team on call');
 });
 test('PSLA-042 Save sends numeric targets and selected cadence',async({page})=>{
  const bodies:Record<string,unknown>[]=[];await openTenantSla(page,{onCall:(m,p,q,body)=>{if(policyPut(p,m))bodies.push(body as Record<string,unknown>);}});
  await pickSlaTenant(page);
  await policyForm(page).getByLabel('Response target (minutes)').fill('80');
  await policyForm(page).getByLabel('Incident resolution (hours)').fill('48');
  await policyForm(page).getByLabel('Task overdue grace (hours)').fill('0');
  await policyForm(page).getByLabel('Review cadence').selectOption('monthly');
  await page.getByRole('button',{name:'Save policy'}).click();await expect.poll(()=>bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({response_target_minutes:80,incident_resolution_target_hours:48,task_overdue_grace_hours:0,review_frequency:'monthly'});
 });
 test('PSLA-043 Unchecking active sends explicit is_active false',async({page})=>{
  const bodies:Record<string,unknown>[]=[];await openTenantSla(page,{onCall:(m,p,q,body)=>{if(policyPut(p,m))bodies.push(body as Record<string,unknown>);}});
  await pickSlaTenant(page);await policyForm(page).getByLabel('Active policy').uncheck();
  await page.getByRole('button',{name:'Save policy'}).click();await expect.poll(()=>bodies.length).toBe(1);
  expect(bodies[0].is_active).toBe(false);
 });
 test('PSLA-044 Response target below one prevents policy PUT',async({page})=>{
  let writes=0;await openTenantSla(page,{onCall:(m,p)=>{if(m==='PUT'&&p.startsWith('/platform/tenant-sla/'))writes++;}});
  await pickSlaTenant(page);await policyForm(page).getByLabel('Response target (minutes)').fill('0');
  await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();expect(writes).toBe(0);
 });
 test('PSLA-045 Response target above 10080 prevents policy PUT',async({page})=>{
  let writes=0;await openTenantSla(page,{onCall:(m,p)=>{if(m==='PUT'&&p.startsWith('/platform/tenant-sla/'))writes++;}});
  await pickSlaTenant(page);await policyForm(page).getByLabel('Response target (minutes)').fill('10081');
  await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();expect(writes).toBe(0);
 });
 test('PSLA-046 Fractional response target cannot be saved',async({page})=>{
  await openTenantSla(page);await pickSlaTenant(page);
  await policyForm(page).getByLabel('Response target (minutes)').fill('1.5');
  await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();
 });
 test('PSLA-047 Incident-resolution minimum and maximum are validated',async({page})=>{
  await openTenantSla(page);await pickSlaTenant(page);const field=policyForm(page).getByLabel('Incident resolution (hours)');
  await field.fill('0');await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();
  await field.fill('8761');await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();
 });
 test('PSLA-048 Incident resolution upper bound 8760 is allowed',async({page})=>{
  await openTenantSla(page);await pickSlaTenant(page);
  await policyForm(page).getByLabel('Incident resolution (hours)').fill('8760');
  await expect(page.getByRole('button',{name:'Save policy'})).toBeEnabled();
 });
 test('PSLA-049 Zero task grace is a valid policy value',async({page})=>{
  await openTenantSla(page);await pickSlaTenant(page);
  await policyForm(page).getByLabel('Task overdue grace (hours)').fill('0');
  await expect(page.getByRole('button',{name:'Save policy'})).toBeEnabled();
 });
 test('PSLA-050 Task grace outside zero to 8760 is rejected',async({page})=>{
  await openTenantSla(page);await pickSlaTenant(page);const input=policyForm(page).getByLabel('Task overdue grace (hours)');
  await input.fill('-1');await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();
  await input.fill('8761');await expect(page.getByRole('button',{name:'Save policy'})).toBeDisabled();
 });
 test('PSLA-051 Review cadence offers only daily weekly monthly',async({page})=>{
  await openTenantSla(page);const cadence=policyForm(page).getByLabel('Review cadence');
  await expect(cadence.locator('option')).toHaveCount(3);
  for(const value of ['daily','weekly','monthly'])await expect(cadence.locator(`option[value="${value}"]`)).toHaveCount(1);
 });
 test('PSLA-052 Escalation notes are restricted to 5000 characters',async({page})=>{
  await openTenantSla(page);
  await expect(policyForm(page).getByLabel('Escalation notes')).toHaveAttribute('maxlength','5000');
 });
 test('PSLA-053 Successful policy save shows selected tenant confirmation',async({page})=>{
  await openTenantSla(page);await pickSlaTenant(page);await page.getByRole('button',{name:'Save policy'}).click();
  await expect(page.locator('.platform-tenant-sla__policy-actions')).toContainText('Policy saved for Fixture Hotel.');
 });
 test('PSLA-054 Policy save invalidates and re-fetches both SLA GET queries',async({page})=>{
  const counts={policies:0,overview:0};await openTenantSla(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-sla')counts.policies++;if(m==='GET'&&p===overviewEndpoint)counts.overview++;}});
  await pickSlaTenant(page);await page.getByRole('button',{name:'Save policy'}).click();
  await expect.poll(()=>counts.policies).toBeGreaterThan(1);await expect.poll(()=>counts.overview).toBeGreaterThan(1);
 });
 test('PSLA-055 Failed policy PUT retains form and displays error',async({page})=>{
  await openTenantSla(page,{responses:{[`PUT /platform/tenant-sla/${TASK_TENANT_A}`]:{status:503,json:{error:'Synthetic save unavailable'}}}});
  await pickSlaTenant(page);await policyForm(page).getByLabel('Response target (minutes)').fill('44');
  await page.getByRole('button',{name:'Save policy'}).click();
  await expect(page.locator('.platform-tenant-sla__policy-actions')).toContainText('Save failed:');
  await expect(policyForm(page).getByLabel('Response target (minutes)')).toHaveValue('44');
 });
 test('PSLA-056 Save pending state blocks repeated policy submissions',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let count=0;
  await openTenantSla(page,{asyncRespond:async(m,p)=>{if(policyPut(p,m)){count++;await gate;return {status:200,json:slaPolicies[0]};}return undefined;}});
  await pickSlaTenant(page);await page.getByRole('button',{name:'Save policy'}).click();
  await expect(page.getByRole('button',{name:'Saving…'})).toBeDisabled();expect(count).toBe(1);
  release();await expect(page.locator('.platform-tenant-sla__policy-actions')).toContainText('Policy saved');
 });
 test('PSLA-057 Read-only operator retains SLA status but cannot edit policy',async({page})=>{
  await openTenantSla(page,{permissions:['platform.dashboard.read','platform.sla.read','platform.tenants.read']});
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();
  await expect(page.getByRole('heading',{name:'SLA policy',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Save policy'})).toHaveCount(0);
 });
 test('PSLA-058 Supporting evidence links require their corresponding permissions',async({page})=>{
  await openTenantSla(page,{permissions:['platform.dashboard.read','platform.sla.read']});
  const links=page.locator('.platform-tenant-sla__supporting-grid');
  for(const name of ['Tenant Health','Incidents','Tenant Tasks','Support Sessions','Notifications']){
   await expect(links.getByRole('link',{name,exact:true})).toHaveCount(0);
  }
  await expect(links).toContainText('TENANTS_READ required');
  await expect(links).toContainText('PLATFORM_NOTIFICATIONS_READ required');
 });
 test('PSLA-059 Card supporting links preserve the source tenant UUID',async({page})=>{
  await openTenantSla(page);const card=slaCard(page,'Fixture Hotel');
  await expect(card.getByRole('link',{name:'Health'})).toHaveAttribute('href',`/platform/tenant-health?tenant_id=${TASK_TENANT_A}`);
  await expect(card.getByRole('link',{name:'Tasks'})).toHaveAttribute('href',`/platform/tenant-tasks?tenant_id=${TASK_TENANT_A}`);
  await expect(card.getByRole('link',{name:'Timeline'})).toHaveAttribute('href',`/platform/tenant-timeline?tenant_id=${TASK_TENANT_A}`);
 });
 test('PSLA-060 Scan action is hidden when required notification permission is absent',async({page})=>{
  await openTenantSla(page,{permissions:allSlaPermissions.filter(p=>p!=='platform.notifications.write')});
  await expect(page.getByRole('button',{name:'Synchronize SLA notifications'})).toHaveCount(0);
  await expect(page.locator('.platform-tenant-sla__scan-row')).toContainText('PLATFORM_NOTIFICATIONS_WRITE');
 });
 test('PSLA-061 Exact full scan permission set displays synchronization action',async({page})=>{
  await openTenantSla(page,{permissions:allSlaPermissions});
  await expect(page.getByRole('button',{name:'Synchronize SLA notifications'})).toBeEnabled();
 });
 test('PSLA-062 Synchronization makes one synthetic POST to scan endpoint',async({page})=>{
  const calls:{method:string;path:string;body:unknown}[]=[];
  await openTenantSla(page,{onCall:(method,path,q,body)=>{if(method==='POST')calls.push({method,path,body});}});
  await page.getByRole('button',{name:'Synchronize SLA notifications'}).click();
  await expect.poll(()=>calls.length).toBe(1);expect(calls[0].path).toBe('/platform/tenant-sla/scan');
 });
 test('PSLA-063 Pending notification scan disables repeated submissions',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let calls=0;
  await openTenantSla(page,{asyncRespond:async(m,p)=>{if(m==='POST'&&p==='/platform/tenant-sla/scan'){calls++;await gate;return {status:200,json:{created:1,refreshed:0,resolved_duplicates:0,resolved_recovered:0}};}return undefined;}});
  await page.getByRole('button',{name:'Synchronize SLA notifications'}).click();
  await expect(page.getByRole('button',{name:'Synchronizing…'})).toBeDisabled();expect(calls).toBe(1);
  release();await expect(page.locator('.platform-tenant-sla__scan-row')).toContainText('Sync complete');
 });
 test('PSLA-064 Scan reports created refreshed duplicates and recovered totals',async({page})=>{
  await openTenantSla(page,{responses:{'POST /platform/tenant-sla/scan':{status:200,json:{scanned_at:'2026-11-04T15:01:00Z',created:2,refreshed:3,resolved_duplicates:4,resolved_recovered:5}}}});
  await page.getByRole('button',{name:'Synchronize SLA notifications'}).click();
  await expect(page.locator('.platform-tenant-sla__scan-row')).toContainText('2 created · 3 refreshed · 4 duplicate resolved · 5 recovered resolved');
 });
 test('PSLA-065 Scan HTTP failure shows error without false sync success',async({page})=>{
  await openTenantSla(page,{responses:{'POST /platform/tenant-sla/scan':{status:503,json:{error:'Synthetic notification outage'}}}});
  await page.getByRole('button',{name:'Synchronize SLA notifications'}).click();
  await expect(page.locator('.platform-tenant-sla__scan-row')).toContainText('Sync failed:');
  await expect(page.locator('.platform-tenant-sla__scan-row')).not.toContainText('Sync complete:');
 });
 test('PSLA-066 Scan re-fetches SLA datasets; notifications invalidation remains source-only',async({page})=>{
  let policyGets=0,overviewGets=0;await openTenantSla(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-sla')policyGets++;if(m==='GET'&&p===overviewEndpoint)overviewGets++;}});
  await page.getByRole('button',{name:'Synchronize SLA notifications'}).click();
  await expect.poll(()=>policyGets).toBeGreaterThan(1);await expect.poll(()=>overviewGets).toBeGreaterThan(1);
  // Query invalidation for platform notifications is in frontend source, not proven by this page's requests.
 });
 test('PSLA-067 Initial policy-list failure disables tenant selector, not existing evidence',async({page})=>{
  await openTenantSla(page,{responses:{'GET /platform/tenant-sla':{status:503,json:{message:'Synthetic policy outage'}}}});
  await expect(filterGrid(page).getByLabel('Tenant',{exact:true})).toBeDisabled();
  await expect(page.locator('.platform-tenant-sla__warning')).toContainText('Policy selector unavailable:');
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();
 });
 test('PSLA-068 Initial overview HTTP 503 shows explicit retry and no status cards',async({page})=>{
  await openTenantSla(page,{responses:{[`GET ${overviewEndpoint}`]:{status:503,json:{message:'Synthetic overview outage'}}}});
  await expect(page.locator('.platform-tenant-sla__blocking-error')).toContainText('Tenant SLA status could not be loaded');
  await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  await expect(slaCards(page)).toHaveCount(0);
 });
 test('PSLA-069 Overview HTTP 429 remains an unavailable evidence snapshot',async({page})=>{
  await openTenantSla(page,{responses:{[`GET ${overviewEndpoint}`]:{status:429,json:{message:'Synthetic rate limit'}}}});
  await expect(page.locator('.platform-tenant-sla__blocking-error')).toBeVisible();
  await expect(page.getByText('No SLA status snapshot is available.')).toBeVisible();
  await expect(slaCards(page)).toHaveCount(0);
 });
 test('PSLA-070 Retry recovers after a previously visible overview failure',async({page})=>{
  let recover=false;await openTenantSla(page,{respond:(m,p)=>m==='GET'&&p===overviewEndpoint&&!recover?{status:503,json:{message:'Synthetic overview outage'}}:undefined});
  await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();recover=true;
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();
  await expect(page.locator('.platform-tenant-sla__blocking-error')).toHaveCount(0);
 });
 test('PSLA-071 Failed refresh preserves stale overview and shows warning',async({page})=>{
  let fail=false;await openTenantSla(page,{respond:(m,p)=>m==='GET'&&p===overviewEndpoint&&fail?{status:503,json:{message:'Synthetic refresh failure'}}:undefined});
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.locator('.platform-tenant-sla__warning')).toContainText('Showing the last successful SLA snapshot. Refresh failed:');
  await expect(slaCard(page,'Fixture Hotel')).toBeVisible();
 });
 test('PSLA-072 Policy-list refresh error retains previously loaded tenant picker',async({page})=>{
  let fail=false;await openTenantSla(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-sla'&&fail?{status:503,json:{message:'Synthetic policy refresh failure'}}:undefined});
  await expect(filterGrid(page).getByLabel('Tenant',{exact:true}).locator('option')).toHaveCount(3);fail=true;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.locator('.platform-tenant-sla__warning')).toContainText('Showing the last successful SLA policy snapshot. Refresh failed:');
  await expect(filterGrid(page).getByLabel('Tenant',{exact:true})).toBeEnabled();
 });
 test('PSLA-073 Refresh refetches both SLA policies and overview',async({page})=>{
  let policies=0,overview=0;await openTenantSla(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-sla')policies++;if(m==='GET'&&p===overviewEndpoint)overview++;}});
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>policies).toBeGreaterThan(1);await expect.poll(()=>overview).toBeGreaterThan(1);
 });
 test('PSLA-074 Invalid URL refresh refetches policies but never overview',async({page})=>{
  let policies=0,overview=0;await openTenantSla(page,{query:'view=invalid',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-sla')policies++;if(m==='GET'&&p===overviewEndpoint)overview++;}});
  await expect(page.locator('.platform-tenant-sla__blocking-error')).toBeVisible();
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>policies).toBeGreaterThan(1);expect(overview).toBe(0);
 });
 test('PSLA-075 Next page requests offset 100 with page size 100',async({page})=>{
  const queries:URLSearchParams[]=[];await openTenantSla(page,{rows:syntheticSlaRows(103),onCall:(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint)queries.push(new URLSearchParams(q));}});
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByText('Page 2 · 3 loaded')).toBeVisible();
  expect(queries.some(q=>q.get('limit')==='100'&&q.get('offset')==='100')).toBe(true);
 });
 test('PSLA-076 Previous page returns to offset zero',async({page})=>{
  const queries:string[]=[];await openTenantSla(page,{rows:syntheticSlaRows(103),onCall:(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint)queries.push(q.get('offset')||'');}});
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Page 2 · 3 loaded')).toBeVisible();
  await page.getByRole('button',{name:'Previous',exact:true}).click();await expect(page.getByText('Page 1 · 100 loaded')).toBeVisible();
  expect(queries.slice(-1)).toEqual(['0']);
 });
 test('PSLA-077 Next disabled when loaded overview has no further server page',async({page})=>{
  await openTenantSla(page);await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
 });
 test('PSLA-078 Both pagination actions disabled while next overview is in flight',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await openTenantSla(page,{rows:syntheticSlaRows(103),asyncRespond:async(m,p,q)=>{if(m==='GET'&&p===overviewEndpoint&&q.get('offset')==='100'){await gate;}return undefined;}});
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
  release();await expect(page.getByText('Page 2 · 3 loaded')).toBeVisible();
 });
 test('PSLA-079 Default policies and partial evidence do not claim external contractual SLA',async({page})=>{
  await openTenantSla(page,{evidence:{available:['incidents'],omitted:['tenant_tasks','support_sessions'],complete:false}});
  await expect(page.locator('.platform-tenant-sla__truth-note')).toContainText('does not prove an external contractual SLA');
  await expect(slaCard(page,'Fixture Warehouse')).toContainText('Template defaults — policy not configured');
  await expect(page.getByText('Evidence: Partial')).toBeVisible();
 });
 test('PSLA-080 Synthetic browser test observes notices, not backend ACL or delivery guarantees',async({page})=>{
  const requests:string[]=[];await openTenantSla(page,{onCall:(m,p)=>requests.push(`${m} ${p}`)});
  await expect(page.locator('.platform-tenant-sla__truth-note')).toContainText('Application evidence ≠ contractual proof.');
  expect(requests.some(s=>s.startsWith('GET /platform/tenant-sla/overview'))).toBe(true);
  // Real DB persistence, cross-tenant security, legal agreements and external notification delivery
  // must be verified in separately authorized backend/integration Phase 2; none are asserted here.
 });
});
