import { test, expect, type Page } from '@playwright/test';
import { openTenantCommunications, commRows, commTenants, commChannels, commDirections, commPermissions,
  COM_TENANT_A, COM_TENANT_B, COM_ID_A, type Communication } from '../../../support/tenantCommunicationsFixture';

/** Batch 59: isolated, browser-observable Platform Tenant Communications generation.
 * Not executed/compiled; mocked HTTP/role claims do NOT prove real delivery, ACL, DB or audit. */
const filters=(page:Page)=>page.locator('.platform-tenant-communications__form-grid--filters');
const editor=(page:Page)=>page.locator('#platform-tenant-communications-form');
const card=(page:Page,title:string)=>page.locator('.platform-tenant-communications__card').filter({hasText:title});
const summary=(page:Page)=>page.getByLabel('Tenant communications current-page summary');
const stats=(page:Page,label:string)=>summary(page).locator('.io-workspace-stat').filter({has:page.locator('.io-workspace-stat__label',{hasText:label})}).locator('.io-workspace-stat__value');
const errorResponse={error:{message:'Synthetic service unavailable'}};
const makeComm=(i:number,patch:Partial<Communication>={}):Communication=>({...commRows[0],id:`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`,subject:`Synthetic communication ${String(i).padStart(3,'0')}`,follow_up_required:false,follow_up_due_at:null,resolved_at:null,archived_at:null,...patch});
const manyRows=Array.from({length:101},(_,i)=>makeComm(i+1));

// Each ID below remains permanent. No live tenant, real messaging, or external contact is used.
test.describe('Platform Tenant Communications — Batch 59, GENERATED_UNRUN',()=>{
  test('PTCOMM-001 Page identifies communication evidence not verified delivery',async ({page})=>{
    await openTenantCommunications(page);
    await expect(page.getByText('Source · GET /platform/tenant-communications')).toBeVisible();
    await expect(page.getByText('Read · TENANTS_READ')).toBeVisible();
    await expect(page.getByText('Write · TENANTS_UPDATE')).toBeVisible();
    await expect(page.getByText(/does not by itself prove message delivery, receipt, acknowledgement/)).toBeVisible();
  });
  test('PTCOMM-002 Base list request sends bounded 100 row page and offset zero',async ({page})=>{
    const queries:URLSearchParams[]=[];
    await openTenantCommunications(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-communications')queries.push(new URLSearchParams(q));}});
    await expect.poll(()=>queries.length).toBeGreaterThan(0);
    expect(queries[0].get('limit')).toBe('100');expect(queries[0].get('offset')).toBe('0');
    expect(queries[0].has('tenant_id')).toBe(false);
  });
  test('PTCOMM-003 Deep linked tenant UUID scopes request and visible records',async ({page})=>{
    const values:string[]=[];
    await openTenantCommunications(page,{query:`tenant_id=${COM_TENANT_A}`,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-communications')values.push(q.get('tenant_id')||'');}});
    await expect.poll(()=>values).toContain(COM_TENANT_A);
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
    await expect(card(page,'Fixture resolved call')).toHaveCount(0);
  });
  test('PTCOMM-004 Tenant selector replaces URL scope and matching list',async ({page})=>{
    await openTenantCommunications(page);
    await filters(page).getByLabel('Tenant').selectOption(COM_TENANT_B);
    await expect(page).toHaveURL(new RegExp('tenant_id='+COM_TENANT_B));
    await expect(card(page,'Fixture resolved call')).toBeVisible();
    await expect(card(page,'Fixture onboarding email')).toHaveCount(0);
  });
  test('PTCOMM-005 Channel selector filters records and serializes known value',async ({page})=>{
    await openTenantCommunications(page);
    await filters(page).getByLabel('Channel').selectOption('phone');
    await expect(page).toHaveURL(/channel=phone/);
    await expect(card(page,'Fixture resolved call')).toBeVisible();
    await expect(card(page,'Fixture onboarding email')).toHaveCount(0);
  });
  test('PTCOMM-006 Direction selector filters inbound calls',async ({page})=>{
    await openTenantCommunications(page);
    await filters(page).getByLabel('Direction').selectOption('inbound');
    await expect(page).toHaveURL(/direction=inbound/);
    await expect(card(page,'Fixture resolved call')).toBeVisible();
    await expect(card(page,'Fixture onboarding email')).toHaveCount(0);
  });
  test('PTCOMM-007 Follow-up required filter transmits true',async ({page})=>{
    const followups:string[]=[];
    await openTenantCommunications(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-communications')followups.push(q.get('follow_up')||'');}});
    await filters(page).getByLabel('Follow-up flag').selectOption('true');
    await expect.poll(()=>followups).toContain('true');
    await expect(page.locator('.platform-tenant-communications__card')).toHaveCount(2);
  });
  test('PTCOMM-008 Follow-up false filter excludes flagged records',async ({page})=>{
    await openTenantCommunications(page,{query:'follow_up=false&include_archived=true'});
    await expect(card(page,'Fixture archived chat')).toBeVisible();
    await expect(card(page,'Fixture onboarding email')).toHaveCount(0);
  });
  test('PTCOMM-009 Include archived exposes previously hidden internal communication',async ({page})=>{
    await openTenantCommunications(page);
    await expect(card(page,'Fixture archived chat')).toHaveCount(0);
    await filters(page).getByLabel('Include archived').check();
    await expect(page).toHaveURL(/include_archived=true/);
    await expect(card(page,'Fixture archived chat')).toBeVisible();
  });
  test('PTCOMM-010 Uncheck archive filter drops URL flag and archived row',async ({page})=>{
    await openTenantCommunications(page,{query:'include_archived=true'});
    await filters(page).getByLabel('Include archived').uncheck();
    await expect(page).not.toHaveURL(/include_archived=/);
    await expect(card(page,'Fixture archived chat')).toHaveCount(0);
  });
  test('PTCOMM-011 Search trims request and matches stored subject',async ({page})=>{
    const values:string[]=[];
    await openTenantCommunications(page,{onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-communications')values.push(q.get('search')||'');}});
    await filters(page).getByLabel('Search').fill(' onboarding ');
    await expect.poll(()=>values).toContain('onboarding');
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
  });
  test('PTCOMM-012 Search input maximum matches backend 200 character contract',async ({page})=>{
    await openTenantCommunications(page);
    await expect(filters(page).getByLabel('Search')).toHaveAttribute('maxlength','200');
  });
  test('PTCOMM-013 Filter dropdowns expose fixed channel direction follow-up options',async ({page})=>{
    await openTenantCommunications(page);
    const channel=await filters(page).getByLabel('Channel').locator('option').evaluateAll(n=>n.map(x=>(x as HTMLOptionElement).value));
    const direction=await filters(page).getByLabel('Direction').locator('option').evaluateAll(n=>n.map(x=>(x as HTMLOptionElement).value));
    const flag=await filters(page).getByLabel('Follow-up flag').locator('option').evaluateAll(n=>n.map(x=>(x as HTMLOptionElement).value));
    expect(channel).toEqual(['',...commChannels]);expect(direction).toEqual(['',...commDirections]);expect(flag).toEqual(['','true','false']);
  });
  test('PTCOMM-014 Invalid tenant identifier blocks registry API call',async ({page})=>{
    const calls:string[]=[];
    await openTenantCommunications(page,{query:'tenant_id=invalid',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-communications')calls.push(p);}});
    await expect(page.getByText('One or more URL filters are invalid.')).toBeVisible();
    expect(calls).toHaveLength(0);
  });
  test('PTCOMM-015 Unsupported channel URL shows repair control',async ({page})=>{
    await openTenantCommunications(page,{query:'channel=fax'});
    await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
    await page.getByRole('button',{name:'Clear invalid filters'}).click();
    await expect(page).not.toHaveURL(/channel=/);
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
  });
  test('PTCOMM-016 Unsupported direction URL is rejected by client validation',async ({page})=>{
    await openTenantCommunications(page,{query:'direction=sideways'});
    await expect(page.getByText('One or more URL filters are invalid.')).toBeVisible();
    await page.getByRole('button',{name:'Clear invalid filters'}).click();
    await expect(page).not.toHaveURL(/direction=/);
  });
  test('PTCOMM-017 Invalid follow_up URL value blocks listing',async ({page})=>{
    const calls:string[]=[];
    await openTenantCommunications(page,{query:'follow_up=pending',onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenant-communications')calls.push(p);}});
    await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
    expect(calls).toHaveLength(0);
  });
  test('PTCOMM-018 Oversized search URL blocks listing until repaired',async ({page})=>{
    await openTenantCommunications(page,{query:'search='+('x'.repeat(201))});
    await expect(page.getByText('The registry is not loaded until the invalid filter is cleared.')).toBeVisible();
    await page.getByRole('button',{name:'Clear invalid filters'}).click();
    await expect(page).not.toHaveURL(/search=/);
  });
  test('PTCOMM-019 Nonboolean include_archived URL is rejected',async ({page})=>{
    await openTenantCommunications(page,{query:'include_archived=yes'});
    await expect(page.getByRole('button',{name:'Clear invalid filters'})).toBeVisible();
    await page.getByRole('button',{name:'Clear invalid filters'}).click();
    await expect(page).not.toHaveURL(/include_archived=/);
  });
  test('PTCOMM-020 Clearing invalid filters retains valid tenant and channel scope',async ({page})=>{
    await openTenantCommunications(page,{query:`tenant_id=${COM_TENANT_A}&channel=email&follow_up=maybe`});
    await page.getByRole('button',{name:'Clear invalid filters'}).click();
    await expect(page).toHaveURL(new RegExp('tenant_id='+COM_TENANT_A));
    await expect(page).toHaveURL(/channel=email/);
    await expect(page).not.toHaveURL(/follow_up=/);
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
  });
  test('PTCOMM-021 Invalid filters permit tenant refresh but suppress communications request',async ({page})=>{
    const calls:string[]=[];
    await openTenantCommunications(page,{query:'channel=unknown',onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
    expect(calls).not.toContain('/platform/tenant-communications');
    const before=calls.filter(p=>p==='/platform/tenants').length;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>calls.filter(p=>p==='/platform/tenants').length).toBeGreaterThan(before);
    expect(calls).not.toContain('/platform/tenant-communications');
  });
  test('PTCOMM-022 Tenant picker initial failure shows retry without inventing tenants',async ({page})=>{
    await openTenantCommunications(page,{responses:{'GET /platform/tenants':{status:503,json:errorResponse}}});
    await expect(page.getByText('Tenant selector could not be loaded.')).toBeVisible();
    await expect(page.getByRole('button',{name:'Retry tenants'})).toBeVisible();
    await expect(filters(page).getByLabel('Tenant')).toBeDisabled();
  });
  test('PTCOMM-023 Communications initial HTTP failure shows separate registry retry',async ({page})=>{
    await openTenantCommunications(page,{responses:{'GET /platform/tenant-communications':{status:503,json:errorResponse}}});
    await expect(page.getByText('Tenant communications could not be loaded.')).toBeVisible();
    await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
  });
  test('PTCOMM-024 Communications retry recovers after transient failure',async ({page})=>{
    let unavailable=true;
    await openTenantCommunications(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-communications'&&unavailable?{status:503,json:errorResponse}:undefined});
    await expect(page.getByText('Tenant communications could not be loaded.')).toBeVisible();
    unavailable=false;await page.getByRole('button',{name:'Retry',exact:true}).click();
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
  });
  test('PTCOMM-025 Refresh failure retains last successful communications snapshot',async ({page})=>{
    let failing=false;
    await openTenantCommunications(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenant-communications'&&failing?{status:503,json:errorResponse}:undefined});
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
    failing=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Communication refresh failed. Showing the last successful communications snapshot.')).toBeVisible();
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
  });
  test('PTCOMM-026 Failed tenant selector refresh preserves prior selector snapshot',async ({page})=>{
    let failing=false;
    await openTenantCommunications(page,{respond:(m,p)=>m==='GET'&&p==='/platform/tenants'&&failing?{status:503,json:errorResponse}:undefined});
    await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(commTenants.length+1);
    failing=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Tenant selector refresh failed. Showing the last successful tenant selector snapshot.')).toBeVisible();
    await expect(filters(page).getByLabel('Tenant').locator('option')).toHaveCount(commTenants.length+1);
  });
  test('PTCOMM-027 Refresh requests both the tenant selector and communication list',async ({page})=>{
    const calls:string[]=[];
    await openTenantCommunications(page,{onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
    const before=calls.length;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>calls.length).toBeGreaterThanOrEqual(before+2);
    expect(calls.slice(before)).toContain('/platform/tenants');
    expect(calls.slice(before)).toContain('/platform/tenant-communications');
  });
  test('PTCOMM-028 Summary cards count only currently loaded records',async ({page})=>{
    await openTenantCommunications(page);
    await expect(stats(page,'Loaded records')).toHaveText('2');
    await expect(stats(page,'Open follow-ups')).toHaveText('1');
    await expect(stats(page,'Customer-facing')).toHaveText('2');
    await expect(stats(page,'Archived loaded')).toHaveText('0');
    await expect(summary(page)).toContainText('not an all-registry total');
  });
  test('PTCOMM-029 Including archived updates loaded and archived page counts',async ({page})=>{
    await openTenantCommunications(page,{query:'include_archived=true'});
    await expect(stats(page,'Loaded records')).toHaveText('3');
    await expect(stats(page,'Archived loaded')).toHaveText('1');
    await expect(card(page,'Fixture archived chat')).toHaveAttribute('data-archived','true');
  });
  test('PTCOMM-030 Empty registry explicitly disclaims external communication absence',async ({page})=>{
    await openTenantCommunications(page,{rows:[]});
    await expect(page.getByText('No tenant communication records match this view.')).toBeVisible();
    await expect(page.getByText(/does not prove no external communication/)).toBeVisible();
  });
  test('PTCOMM-031 API has_more moves forward by 100 rows',async ({page})=>{
    const offsets:number[]=[];
    await openTenantCommunications(page,{rows:manyRows,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-communications')offsets.push(Number(q.get('offset')));}});
    await expect(page.locator('.platform-tenant-communications__card')).toHaveCount(100);
    await page.getByRole('button',{name:'Next'}).click();
    await expect.poll(()=>offsets).toContain(100);
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
    await expect(page.locator('.platform-tenant-communications__card')).toHaveCount(1);
  });
  test('PTCOMM-032 Previous pagination returns from offset 100 to offset zero',async ({page})=>{
    const offsets:number[]=[];
    await openTenantCommunications(page,{rows:manyRows,onCall:(m,p,_b,q)=>{if(m==='GET'&&p==='/platform/tenant-communications')offsets.push(Number(q.get('offset')));}});
    await page.getByRole('button',{name:'Next'}).click();
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Previous'}).click();
    await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
    await expect.poll(()=>offsets.slice(-1)[0]).toBe(0);
  });
  test('PTCOMM-033 Changing a filter resets pagination to first page',async ({page})=>{
    await openTenantCommunications(page,{rows:manyRows});
    await page.getByRole('button',{name:'Next'}).click();
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
    await filters(page).getByLabel('Direction').selectOption('outbound');
    await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
  });
  test('PTCOMM-034 Read-only platform role hides mutation editor and record actions',async ({page})=>{
    await openTenantCommunications(page,{query:'include_archived=true',permissions:commPermissions.filter(p=>p!=='platform.tenants.update')});
    await expect(editor(page)).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Edit',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Archive',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Restore',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Resolve follow-up'})).toHaveCount(0);
  });
  test('PTCOMM-035 Billing and Support Operations links follow separate permission gates',async ({page})=>{
    await openTenantCommunications(page,{query:`tenant_id=${COM_TENANT_A}`,permissions:['platform.tenants.read']});
    const links=page.locator('.platform-tenant-communications__link-row');
    await expect(links.getByRole('link',{name:'Tenant contacts'})).toBeVisible();
    await expect(links.getByRole('link',{name:'Billing'})).toHaveCount(0);
    await expect(links.getByRole('link',{name:'Support Operations'})).toHaveCount(0);
    await expect(links.getByRole('link',{name:'Tenant notes'})).toHaveAttribute('href',`/platform/tenant-notes?tenant_id=${COM_TENANT_A}`);
  });
  test('PTCOMM-036 Card separates stored channel direction follow-up and evidence data',async ({page})=>{
    await openTenantCommunications(page);
    const item=card(page,'Fixture onboarding email');
    await expect(item.getByText('Open follow-up',{exact:true})).toBeVisible();
    await expect(item).toContainText('Email');await expect(item).toContainText('Outbound');
    await expect(item).toContainText('TICKET-C59');await expect(item).toContainText('Fixture Contact');
    await expect(item).toContainText('does not independently prove delivery, receipt, acknowledgement');
  });
  test('PTCOMM-037 Contact email is an explicit mailto link not a sent email',async ({page})=>{
    await openTenantCommunications(page);
    await expect(card(page,'Fixture onboarding email').getByRole('link',{name:'Email · contact@example.test'})).toHaveAttribute('href','mailto:contact@example.test');
    await expect(card(page,'Fixture resolved call').locator('a[href^="mailto:"]')).toHaveCount(0);
  });
  test('PTCOMM-038 Missing dates and operator identity use bounded fallback display',async ({page})=>{
    await openTenantCommunications(page);
    const item=card(page,'Fixture resolved call');
    await expect(item).toContainText('Not recorded');
    await expect(item).toContainText('unknown platform operator');
    await expect(item).toContainText('resolver@example.test');
  });
  test('PTCOMM-039 Log communication remains disabled without tenant and subject/summary',async ({page})=>{
    await openTenantCommunications(page);
    await expect(editor(page).getByRole('button',{name:'Log communication'})).toBeDisabled();
    await editor(page).getByLabel('Tenant').selectOption(COM_TENANT_A);
    await editor(page).getByLabel('Subject').fill('Only a subject');
    await expect(editor(page).getByRole('button',{name:'Log communication'})).toBeDisabled();
    await editor(page).getByLabel('Summary').fill('Synthetic summary');
    await expect(editor(page).getByRole('button',{name:'Log communication'})).toBeEnabled();
  });
  test('PTCOMM-040 Entry fields expose actual source length limits and conditional followup due input',async ({page})=>{
    await openTenantCommunications(page);
    await expect(editor(page).getByLabel('Subject')).toHaveAttribute('maxlength','220');
    await expect(editor(page).getByLabel('Summary')).toHaveAttribute('maxlength','10000');
    await expect(editor(page).getByLabel('Contact name')).toHaveAttribute('maxlength','180');
    await expect(editor(page).getByLabel('Contact email')).toHaveAttribute('maxlength','254');
    await expect(editor(page).getByLabel('Ticket / reference')).toHaveAttribute('maxlength','240');
    await expect(editor(page).getByLabel('Follow-up due')).toBeDisabled();
    await editor(page).getByLabel('Follow-up required').check();
    await expect(editor(page).getByLabel('Follow-up due')).toBeEnabled();
  });
});

/** Batch 60 — PTCOMM-041…080. Synthetic client behaviour only; GENERATED_UNRUN. */
const logRecord=async(page:Page,tenant=COM_TENANT_A,subject='New synthetic communication',notes='Recorded by an isolated test')=>{
  await editor(page).getByLabel('Tenant').selectOption(tenant);
  await editor(page).getByLabel('Subject').fill(subject);
  await editor(page).getByLabel('Summary').fill(notes);
};
const callsFor=(seen:Array<{method:string;path:string;body:unknown}>,method:string,path:string)=>seen.filter(x=>x.method===method&&x.path===path);
const capture=(seen:Array<{method:string;path:string;body:unknown}>)=>(method:string,path:string,body:unknown)=>{seen.push({method,path,body});};
const clickConfirm=async(page:Page,name:string,accept:boolean,within?:string)=>{
  page.once('dialog',async d=>accept?d.accept():d.dismiss());
  const target=within?card(page,within):page;
  await target.getByRole('button',{name,exact:true}).click();
};

test.describe('Platform Tenant Communications — Batch 60, GENERATED_UNRUN',()=>{
  test('PTCOMM-041 Create communication posts to selected tenant with exact trimmed payload',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});
    await logRecord(page,COM_TENANT_A,'  Trim this subject  ','  Trim this summary  ');
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect.poll(()=>callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`).length).toBe(1);
    const payload=callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`)[0].body as Record<string,unknown>;
    expect(payload).toMatchObject({subject:'Trim this subject',summary:'Trim this summary',channel:'email',direction:'outbound',follow_up_required:false,follow_up_due_at:null});
    expect(payload).not.toHaveProperty('tenant_id');
  });
  test('PTCOMM-042 Create success feedback and synthetic registry readback show stored row',async({page})=>{
    await openTenantCommunications(page);await logRecord(page);
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect(page.locator('.platform-tenant-communications__feedback')).toHaveText('Tenant communication logged.');
    await expect(card(page,'New synthetic communication')).toContainText('Recorded by an isolated test');
  });
  test('PTCOMM-043 Create API failure retains entered fields and shows explicit warning',async({page})=>{
    await openTenantCommunications(page,{responses:{[`POST /platform/tenant-communications/tenants/${COM_TENANT_A}`]:{status:503,json:{message:'Synthetic create rejected'}}}});
    await logRecord(page,COM_TENANT_A,'Unsent draft','Must not disappear');
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect(page.locator('.platform-tenant-communications__warning')).toContainText('Action failed:');
    await expect(editor(page).getByLabel('Subject')).toHaveValue('Unsent draft');
    await expect(card(page,'Unsent draft')).toHaveCount(0);
  });
  test('PTCOMM-044 Request serializes selected channel and direction without inventing delivery',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});await logRecord(page);
    await editor(page).getByLabel('Channel').selectOption('chat');await editor(page).getByLabel('Direction').selectOption('internal');
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect.poll(()=>callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`).length).toBe(1);
    expect(callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`)[0].body).toMatchObject({channel:'chat',direction:'internal'});
    await expect(card(page,'New synthetic communication')).toContainText('do not independently prove delivery');
  });
  test('PTCOMM-045 Optional contact and reference fields trim and preserve intended payload',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});await logRecord(page);
    await editor(page).getByLabel('Contact name').fill('  Agent Fixture ');
    await editor(page).getByLabel('Contact email').fill('  agent@example.test  ');
    await editor(page).getByLabel('Ticket / reference').fill('  TEST-57  ');
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect.poll(()=>callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`).length).toBe(1);
    expect(callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`)[0].body).toMatchObject({contact_name:'Agent Fixture',contact_email:'agent@example.test',external_reference:'TEST-57'});
  });
  test('PTCOMM-046 Follow-up due date requires checked follow-up before input becomes enabled',async({page})=>{
    await openTenantCommunications(page);await logRecord(page);
    await expect(editor(page).getByLabel('Follow-up due')).toBeDisabled();
    await editor(page).getByLabel('Follow-up required').check();
    await expect(editor(page).getByLabel('Follow-up due')).toBeEnabled();
    await editor(page).getByLabel('Follow-up required').uncheck();
    await expect(editor(page).getByLabel('Follow-up due')).toBeDisabled();
  });
  test('PTCOMM-047 Datetime-local occurred and due fields serialize as valid ISO timestamps',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});await logRecord(page);
    await editor(page).getByLabel('Occurred at').fill('2026-11-04T09:30');
    await editor(page).getByLabel('Follow-up required').check();
    await editor(page).getByLabel('Follow-up due').fill('2026-11-10T10:45');
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect.poll(()=>callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`).length).toBe(1);
    const data=callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`)[0].body as Record<string,unknown>;
    expect(data.follow_up_required).toBe(true);
    expect(String(data.occurred_at)).toMatch(/^2026-11-04T.*Z$/);
    expect(String(data.follow_up_due_at)).toMatch(/^2026-11-10T.*Z$/);
    expect(Number.isNaN(Date.parse(String(data.occurred_at)))).toBe(false);
  });
  test('PTCOMM-048 Unchecked follow-up clears due date and submits null',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});await logRecord(page);
    await editor(page).getByLabel('Follow-up required').check();
    await editor(page).getByLabel('Follow-up due').fill('2026-11-10T10:45');
    await editor(page).getByLabel('Follow-up required').uncheck();
    await expect(editor(page).getByLabel('Follow-up due')).toHaveValue('');
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect.poll(()=>callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`).length).toBe(1);
    expect(callsFor(seen,'POST',`/platform/tenant-communications/tenants/${COM_TENANT_A}`)[0].body).toMatchObject({follow_up_required:false,follow_up_due_at:null});
  });
  test('PTCOMM-049 Successful create resets fields while preserving URL-selected tenant',async({page})=>{
    await openTenantCommunications(page,{query:`tenant_id=${COM_TENANT_A}`});
    await logRecord(page,COM_TENANT_A,'Clear after submit');
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect(card(page,'Clear after submit')).toBeVisible();
    await expect(editor(page).getByLabel('Tenant')).toHaveValue(COM_TENANT_A);
    await expect(editor(page).getByLabel('Subject')).toHaveValue('');
    await expect(editor(page).getByLabel('Summary')).toHaveValue('');
  });
  test('PTCOMM-050 Create request rejects server validation error without false success',async({page})=>{
    await openTenantCommunications(page,{responses:{[`POST /platform/tenant-communications/tenants/${COM_TENANT_A}`]:{status:422,json:{message:'Synthetic invalid email'}}}});
    await logRecord(page);await editor(page).getByLabel('Contact email').fill('fixture@example.test');
    await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect(page.locator('.platform-tenant-communications__warning')).toContainText('Action failed:');
    await expect(page.locator('.platform-tenant-communications__feedback[data-tone="good"]')).toHaveCount(0);
    await expect(editor(page).getByLabel('Contact email')).toHaveValue('fixture@example.test');
  });
  test('PTCOMM-051 Edit sets existing record values and locks tenant selector',async({page})=>{
    await openTenantCommunications(page);await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await expect(editor(page).getByLabel('Tenant')).toHaveValue(COM_TENANT_A);
    await expect(editor(page).getByLabel('Tenant')).toBeDisabled();
    await expect(editor(page).getByLabel('Subject')).toHaveValue('Fixture onboarding email');
    await expect(editor(page).getByLabel('Summary')).toHaveValue('Synthetic customer email recorded only');
    await expect(editor(page).getByRole('button',{name:'Save communication'})).toBeEnabled();
  });
  test('PTCOMM-052 Save edit PATCHes selected communication identifier with updated data',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});
    await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Subject').fill('Revised contact entry');
    await editor(page).getByRole('button',{name:'Save communication'}).click();
    await expect.poll(()=>callsFor(seen,'PATCH',`/platform/tenant-communications/${COM_ID_A}`).length).toBe(1);
    expect(callsFor(seen,'PATCH',`/platform/tenant-communications/${COM_ID_A}`)[0].body).toMatchObject({subject:'Revised contact entry'});
  });
  test('PTCOMM-053 Edit success refreshes registry and resets editor',async({page})=>{
    await openTenantCommunications(page);await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Subject').fill('Updated by test');
    await editor(page).getByRole('button',{name:'Save communication'}).click();
    await expect(card(page,'Updated by test')).toBeVisible();
    await expect(page.locator('.platform-tenant-communications__feedback')).toHaveText('Tenant communication updated.');
    await expect(editor(page).getByRole('button',{name:'Log communication'})).toBeVisible();
    await expect(editor(page).getByLabel('Subject')).toHaveValue('');
  });
  test('PTCOMM-054 Edit error keeps unsaved editing state with retry feedback',async({page})=>{
    await openTenantCommunications(page,{responses:{[`PATCH /platform/tenant-communications/${COM_ID_A}`]:{status:409,json:{message:'Synthetic edit conflict'}}}});
    await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Subject').fill('Draft after conflict');
    await editor(page).getByRole('button',{name:'Save communication'}).click();
    await expect(page.locator('.platform-tenant-communications__warning')).toContainText('Action failed:');
    await expect(editor(page).getByLabel('Subject')).toHaveValue('Draft after conflict');
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
  });
  test('PTCOMM-055 Cancel edit does not PATCH and returns blank logging form',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});
    await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Subject').fill('Discard this');
    await editor(page).getByRole('button',{name:'Cancel edit'}).click();
    await expect(editor(page).getByLabel('Subject')).toHaveValue('');
    await expect(editor(page).getByRole('button',{name:'Log communication'})).toBeVisible();
    expect(callsFor(seen,'PATCH',`/platform/tenant-communications/${COM_ID_A}`)).toHaveLength(0);
  });
  test('PTCOMM-056 Changing tenant filter while editing other tenant resets editor',async({page})=>{
    await openTenantCommunications(page);await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await filters(page).getByLabel('Tenant').selectOption(COM_TENANT_B);
    await expect(editor(page).getByRole('button',{name:'Log communication'})).toBeVisible();
    await expect(editor(page).getByLabel('Subject')).toHaveValue('');
    await expect(editor(page).getByLabel('Tenant')).toHaveValue(COM_TENANT_B);
  });
  test('PTCOMM-057 Pending create or update disables editor fields and save/cancel actions',async({page})=>{
    await openTenantCommunications(page,{delayMs:{[`POST /platform/tenant-communications/tenants/${COM_TENANT_A}`]:1200}});
    await logRecord(page);await editor(page).getByRole('button',{name:'Log communication'}).click();
    await expect(editor(page).getByRole('button',{name:'Saving…'})).toBeDisabled();
    await expect(editor(page).getByLabel('Subject')).toBeDisabled();
    await expect(editor(page).getByLabel('Tenant')).toBeDisabled();
    await expect(card(page,'New synthetic communication')).toBeVisible();
  });
  test('PTCOMM-058 Open follow-up flag cannot be silently removed while editing',async({page})=>{
    await openTenantCommunications(page);await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await expect(editor(page).getByLabel('Follow-up required')).toBeChecked();
    await expect(editor(page).getByLabel('Follow-up required')).toBeDisabled();
    await expect(editor(page)).toContainText('Use “Resolve follow-up”');
  });
  test('PTCOMM-059 Dismiss resolve follow-up confirmation without POST',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});
    await clickConfirm(page,'Resolve follow-up',false,'Fixture onboarding email');
    expect(callsFor(seen,'POST',`/platform/tenant-communications/${COM_ID_A}/resolve-follow-up`)).toHaveLength(0);
    await expect(card(page,'Fixture onboarding email').getByRole('button',{name:'Resolve follow-up'})).toBeVisible();
  });
  test('PTCOMM-060 Confirm follow-up resolution POST and verify resolved badge readback',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});
    await clickConfirm(page,'Resolve follow-up',true,'Fixture onboarding email');
    await expect.poll(()=>callsFor(seen,'POST',`/platform/tenant-communications/${COM_ID_A}/resolve-follow-up`).length).toBe(1);
    await expect(card(page,'Fixture onboarding email').getByText('Follow-up resolved',{exact:true})).toBeVisible();
    await expect(page.locator('.platform-tenant-communications__feedback')).toHaveText('Communication follow-up resolved.');
  });
  test('PTCOMM-061 Follow-up resolve API failure retains open action and warning',async({page})=>{
    await openTenantCommunications(page,{responses:{[`POST /platform/tenant-communications/${COM_ID_A}/resolve-follow-up`]:{status:503,json:{message:'Synthetic resolve failure'}}}});
    await clickConfirm(page,'Resolve follow-up',true,'Fixture onboarding email');
    await expect(page.locator('.platform-tenant-communications__warning')).toContainText('Action failed:');
    await expect(card(page,'Fixture onboarding email').getByRole('button',{name:'Resolve follow-up'})).toBeVisible();
  });
  test('PTCOMM-062 Resolving record being edited resets editor on success',async({page})=>{
    await openTenantCommunications(page);await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await clickConfirm(page,'Resolve follow-up',true,'Fixture onboarding email');
    await expect(editor(page).getByRole('button',{name:'Log communication'})).toBeVisible();
    await expect(editor(page).getByLabel('Subject')).toHaveValue('');
  });
  test('PTCOMM-063 Open follow-up blocks archive action and explains why',async({page})=>{
    await openTenantCommunications(page);
    const item=card(page,'Fixture onboarding email');
    await expect(item.getByRole('button',{name:'Archive',exact:true})).toHaveCount(0);
    await expect(item.getByText(/Resolve the follow-up before archiving/)).toBeVisible();
    await expect(item.getByRole('button',{name:'Resolve follow-up'})).toBeVisible();
  });
  test('PTCOMM-064 Dismiss archive confirmation without network POST',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});
    await clickConfirm(page,'Archive',false,'Fixture resolved call');
    expect(callsFor(seen,'POST',`/platform/tenant-communications/${COM_ID_B}/archive`)).toHaveLength(0);
    await expect(card(page,'Fixture resolved call')).toHaveAttribute('data-archived','false');
  });
  test('PTCOMM-065 Confirm archive POST and remove record from ordinary timeline filter',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{onCall:capture(seen)});
    await clickConfirm(page,'Archive',true,'Fixture resolved call');
    await expect.poll(()=>callsFor(seen,'POST',`/platform/tenant-communications/${COM_ID_B}/archive`).length).toBe(1);
    await expect(card(page,'Fixture resolved call')).toHaveCount(0);
    await expect(page.locator('.platform-tenant-communications__feedback')).toHaveText('Tenant communication archived.');
  });
  test('PTCOMM-066 Archive server error preserves active record and retryable controls',async({page})=>{
    await openTenantCommunications(page,{responses:{[`POST /platform/tenant-communications/${COM_ID_B}/archive`]:{status:500,json:{message:'Synthetic archive failure'}}}});
    await clickConfirm(page,'Archive',true,'Fixture resolved call');
    await expect(page.locator('.platform-tenant-communications__warning')).toContainText('Action failed:');
    await expect(card(page,'Fixture resolved call')).toHaveAttribute('data-archived','false');
    await expect(card(page,'Fixture resolved call').getByRole('button',{name:'Archive'})).toBeVisible();
  });
  test('PTCOMM-067 Restore archived record with synthetic list readback',async({page})=>{
    const seen:Array<{method:string;path:string;body:unknown}>=[];
    await openTenantCommunications(page,{query:'include_archived=true',onCall:capture(seen)});
    await card(page,'Fixture archived chat').getByRole('button',{name:'Restore'}).click();
    await expect.poll(()=>callsFor(seen,'POST',`/platform/tenant-communications/${COM_ID_C}/restore`).length).toBe(1);
    await expect(card(page,'Fixture archived chat')).toHaveAttribute('data-archived','false');
    await expect(page.locator('.platform-tenant-communications__feedback')).toHaveText('Tenant communication restored.');
  });
  test('PTCOMM-068 Restore error preserves archived controls and warning',async({page})=>{
    await openTenantCommunications(page,{query:'include_archived=true',responses:{[`POST /platform/tenant-communications/${COM_ID_C}/restore`]:{status:403,json:{message:'Synthetic restore forbidden'}}}});
    await card(page,'Fixture archived chat').getByRole('button',{name:'Restore'}).click();
    await expect(page.locator('.platform-tenant-communications__warning')).toContainText('Action failed:');
    await expect(card(page,'Fixture archived chat')).toHaveAttribute('data-archived','true');
    await expect(card(page,'Fixture archived chat').getByRole('button',{name:'Restore'})).toBeVisible();
  });
  test('PTCOMM-069 Archived records have no Edit or Archive actions until restore',async({page})=>{
    await openTenantCommunications(page,{query:'include_archived=true'});
    const item=card(page,'Fixture archived chat');
    await expect(item.getByRole('button',{name:'Edit'})).toHaveCount(0);
    await expect(item.getByRole('button',{name:'Archive'})).toHaveCount(0);
    await expect(item.getByRole('button',{name:'Restore'})).toBeVisible();
  });
  test('PTCOMM-070 Restored communication becomes editable without bypassing permission',async({page})=>{
    await openTenantCommunications(page,{query:'include_archived=true'});
    const item=card(page,'Fixture archived chat');
    await item.getByRole('button',{name:'Restore'}).click();
    await expect(item.getByRole('button',{name:'Edit'})).toBeVisible();
    await expect(item.getByRole('button',{name:'Restore'})).toHaveCount(0);
    // The same restored-state fixture must not expose mutations to a read-only role.
    const reader=await page.context().newPage();
    await openTenantCommunications(reader,{query:'include_archived=true',permissions:commPermissions.filter(p=>p!=='platform.tenants.update'),rows:[{...commRows[2],archived_at:null}]});
    await expect(card(reader,'Fixture archived chat').getByRole('button',{name:'Edit'})).toHaveCount(0);
    await expect(card(reader,'Fixture archived chat').getByRole('button',{name:'Restore'})).toHaveCount(0);
    await reader.close();
  });
  test('PTCOMM-071 Resolved follow-up exposes archive rather than resolve action',async({page})=>{
    await openTenantCommunications(page);
    const item=card(page,'Fixture resolved call');
    await expect(item.getByText('Follow-up resolved',{exact:true})).toBeVisible();
    await expect(item.getByRole('button',{name:'Archive'})).toBeVisible();
    await expect(item.getByRole('button',{name:'Resolve follow-up'})).toHaveCount(0);
  });
  test('PTCOMM-072 Record links preserve tenant id for Tenant Contacts and Timeline',async({page})=>{
    await openTenantCommunications(page);const item=card(page,'Fixture resolved call');
    await expect(item.getByRole('link',{name:'Tenant record'})).toHaveAttribute('href',`/platform/tenants?tenant_id=${COM_TENANT_B}`);
    await expect(item.getByRole('link',{name:'Tenant contacts'})).toHaveAttribute('href',`/platform/tenant-contacts?tenant_id=${COM_TENANT_B}`);
    await expect(item.getByRole('link',{name:'Tenant timeline'})).toHaveAttribute('href',`/platform/tenant-timeline?tenant_id=${COM_TENANT_B}`);
  });
  test('PTCOMM-073 Supporting tenant operations links preserve current URL tenant scope',async({page})=>{
    await openTenantCommunications(page,{query:`tenant_id=${COM_TENANT_A}`});
    const links=page.locator('.platform-tenant-communications__link-row');
    for(const [name,route] of [['Tenants','tenants'],['Tenant contacts','tenant-contacts'],['Tenant notes','tenant-notes'],['Tenant timeline','tenant-timeline'],['Customer Success','customer-success-admin']] as const){
      await expect(links.getByRole('link',{name,exact:true})).toHaveAttribute('href',`/platform/${route}?tenant_id=${COM_TENANT_A}`);
    }
  });
  test('PTCOMM-074 Billing and Support links honor their distinct platform permissions',async({page})=>{
    await openTenantCommunications(page,{query:`tenant_id=${COM_TENANT_A}`,permissions:['platform.tenants.read','platform.billing.read']});
    const links=page.locator('.platform-tenant-communications__link-row');
    await expect(links.getByRole('link',{name:'Billing'})).toHaveAttribute('href',`/platform/billing?tenant_id=${COM_TENANT_A}`);
    await expect(links.getByRole('link',{name:'Support Operations'})).toHaveCount(0);
  });
  test('PTCOMM-075 Refresh and pagination controls disable during list fetching',async({page})=>{
    await openTenantCommunications(page,{rows:manyRows,delayMs:{'GET /platform/tenant-communications':1100}});
    await expect(page.locator('.platform-tenant-communications__card')).toHaveCount(100);
    await expect(page.getByRole('button',{name:'Next'})).toBeEnabled();
    await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'Next'}).click();
    await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeDisabled();
    await expect(page.getByText('Page 2',{exact:true})).toBeVisible();
  });
  test('PTCOMM-076 Recovery after stale snapshot returns to current data',async({page})=>{
    let rejectRefresh=false;
    await openTenantCommunications(page,{respond:(method,path)=>{
      if(rejectRefresh&&method==='GET'&&path==='/platform/tenant-communications')return {status:503,json:errorResponse};
      return undefined;
    }});
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
    rejectRefresh=true;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Communication refresh failed. Showing the last successful communications snapshot.')).toBeVisible();
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
    rejectRefresh=false;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByText('Communication refresh failed. Showing the last successful communications snapshot.')).toHaveCount(0);
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
  });
  test('PTCOMM-077 Search matches stored contact email and external reference fields',async({page})=>{
    await openTenantCommunications(page,{query:'search=contact%40example.test'});
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
    await expect(card(page,'Fixture resolved call')).toHaveCount(0);
    await filters(page).getByLabel('Search').fill('TICKET-C59');
    await expect(card(page,'Fixture onboarding email')).toBeVisible();
  });
  test('PTCOMM-078 Unknown metadata values render safe readable fallback without external proof',async({page})=>{
    await openTenantCommunications(page,{rows:[makeComm(501,{channel:'unknown_channel',direction:'unknown_direction',contact_name:null,created_by_email:null})]});
    const item=card(page,'Synthetic communication 501');
    await expect(item).toContainText('Unknown channel');
    await expect(item).toContainText('Unknown direction');
    await expect(item).toContainText('Not recorded');
    await expect(item).toContainText('unknown platform operator');
    await expect(item).toContainText('do not independently prove delivery');
  });
  test('PTCOMM-079 Mutation unauthorized response displays failure without claiming success',async({page})=>{
    await openTenantCommunications(page,{responses:{[`PATCH /platform/tenant-communications/${COM_ID_A}`]:{status:403,json:{message:'Synthetic forbidden'}}}});
    await card(page,'Fixture onboarding email').getByRole('button',{name:'Edit'}).click();
    await editor(page).getByLabel('Summary').fill('Disallowed update');
    await editor(page).getByRole('button',{name:'Save communication'}).click();
    await expect(page.locator('.platform-tenant-communications__warning')).toContainText('Action failed:');
    await expect(page.locator('.platform-tenant-communications__feedback[data-tone="good"]')).toHaveCount(0);
    await expect(card(page,'Fixture onboarding email')).toContainText('Synthetic customer email recorded only');
  });
  test('PTCOMM-080 Next page availability follows API pagination has_more not 100-row heuristic',async({page})=>{
    await openTenantCommunications(page,{rows:manyRows,respond:(m,p)=>m==='GET'&&p==='/platform/tenant-communications'?{status:200,json:{communications:manyRows.slice(0,100),summary:{total:101,open_followups:0,archived:0,by_channel:{}},channels:commChannels,directions:commDirections,pagination:{limit:100,offset:0,has_more:false}}}:undefined});
    await expect(page.locator('.platform-tenant-communications__card')).toHaveCount(100);
    await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
    await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
  });
});
