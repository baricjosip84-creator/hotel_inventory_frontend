/** Batch 81 Platform Releases PREL-001..041. Source-traced synthetic browser declarations only.
 * Neither recorded release status nor mocked transport can certify external deployment, rollback, SQL, or server ACL. */
import {test,expect,type Page} from '@playwright/test';
import {openReleases,releasePermissions,plannedRelease,inProgressRelease,deployedRelease,rolledRelease,
 releaseId,releaseOwnerId,changeId,windowId,manyReleases} from '../../../support/platformReleasesFixture';
const root=(p:Page)=>p.locator('.platform-releases');
const section=(p:Page,name:string)=>root(p).locator('.platform-releases__section').filter({has:p.getByRole('heading',{name,exact:true})});
const filters=(p:Page)=>section(p,'Filters');
const editor=(p:Page)=>p.locator('#platform-releases-form');
const registry=(p:Page)=>section(p,'Release registry');
const cards=(p:Page)=>registry(p).locator('.platform-releases__card');
const card=(p:Page,version:string)=>cards(p).filter({has:p.getByRole('heading',{name:new RegExp(`^${version.replaceAll('.','\\.')} · `)})});
const pager=(p:Page)=>registry(p).locator('.platform-releases__pagination');
const without=(...keys:string[])=>releasePermissions.filter(x=>!keys.includes(x));
const endpoint='/platform/releases';
const valid=async(p:Page)=>{await editor(p).getByLabel('Version').fill('v81.2.0');await editor(p).getByLabel('Title').fill('Synthetic release');};

test.describe('Releases — evidence, identity scopes and permissions (BATCH_081_GENERATED_UNRUN)',()=>{
 test('PREL-001 Platform release route shows registry and lifecycle metadata',async({page})=>{
  await openReleases(page);await expect(root(page)).toContainText('Registry-wide filtered summary');
  await expect(card(page,plannedRelease.version)).toBeVisible();await expect(root(page)).toContainText('50 releases');
 });
 test('PREL-002 Release lifecycle is explicitly application evidence, not provider proof',async({page})=>{
  await openReleases(page);await expect(section(page,'Evidence boundary')).toContainText('Application evidence only.');
  await expect(section(page,'Evidence boundary')).toContainText('does not independently prove');
 });
 test('PREL-003 Summary tracks registry-wide count, upcoming and rolled-back statuses',async({page})=>{
  await openReleases(page);await expect(root(page).getByLabel('Release registry summary')).toContainText('Filtered releases');
  await expect(root(page).getByLabel('Release registry summary')).toContainText('Upcoming');
  await expect(root(page).getByLabel('Release registry summary')).toContainText('Rolled back');
 });
 test('PREL-004 Read-only role sees evidence but cannot create or transition',async({page})=>{
  await openReleases(page,{permissions:without('platform.releases.write')});await expect(card(page,plannedRelease.version)).toBeVisible();
  await expect(editor(page)).toHaveCount(0);await expect(card(page,plannedRelease.version).getByRole('button',{name:'Start'})).toHaveCount(0);
 });
 test('PREL-005 Missing release read permission prevents registry fetch',async({page})=>{
  const calls:string[]=[];await openReleases(page,{permissions:without('platform.releases.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toHaveCount(0);expect(calls).toHaveLength(0);
 });
 test('PREL-006 Readonly role does not fetch protected selector directories',async({page})=>{
  const calls:string[]=[];await openReleases(page,{permissions:without('platform.releases.write'),onCall:(m,p)=>{
   if(m==='GET'&&['/platform/users','/platform/change-management','/platform/maintenance'].includes(p))calls.push(p);
  }});expect(calls).toHaveLength(0);
 });
 test('PREL-007 Missing users-read redacts owner identity but preserves linkage presence',async({page})=>{
  await openReleases(page,{permissions:without('platform.users.read')});
  await expect(card(page,plannedRelease.version)).toContainText('Linked · identity restricted');
  await expect(card(page,plannedRelease.version)).not.toContainText('release-owner@fixture.test');
 });
 test('PREL-008 Missing changes-read redacts change name and disables direct link',async({page})=>{
  await openReleases(page,{permissions:without('platform.changes.read')});
  await expect(card(page,plannedRelease.version)).toContainText('Linked · evidence restricted');
  await expect(card(page,plannedRelease.version)).not.toContainText('Fixture Approved Change');
  await expect(card(page,plannedRelease.version).getByRole('link',{name:'Change Management'})).toHaveCount(0);
 });
 test('PREL-009 Missing maintenance-read retains required evidence presence but hides identity',async({page})=>{
  await openReleases(page,{permissions:without('platform.maintenance.read')});
  await expect(card(page,plannedRelease.version)).toContainText('Linked · evidence restricted');
  await expect(card(page,plannedRelease.version)).not.toContainText('Fixture Scheduled Window');
 });
 test('PREL-010 Partial evidence label accurately reflects missing independent directory permissions',async({page})=>{
  await openReleases(page,{permissions:without('platform.users.read','platform.maintenance.read')});
  await expect(root(page)).toContainText('Partial linked evidence');await expect(editor(page)).toContainText('Owner linkage restricted');
  await expect(editor(page)).toContainText('Maintenance evidence restricted');
 });
 test('PREL-011 Supporting links follow destination permissions without arbitrary More menu',async({page})=>{
  await openReleases(page,{permissions:without('platform.changes.read','platform.maintenance.read','platform.users.read','platform.jobs.read','platform.audit.read')});
  const links=section(page,'Supporting operations');for(const name of ['Change Management','Maintenance','Platform users','Operational jobs','Platform audit'])
   await expect(links.getByRole('link',{name,exact:true})).toHaveCount(0);
 });
 test('PREL-012 Terminal release state is visibly immutable for details but deployed rollback remains possible',async({page})=>{
  await openReleases(page);await expect(card(page,deployedRelease.version)).toContainText('Terminal release history · details immutable');
  await expect(card(page,deployedRelease.version).getByRole('button',{name:'Edit details'})).toHaveCount(0);
  await expect(card(page,deployedRelease.version).getByRole('button',{name:'Record rollback'})).toBeVisible();
 });
});

test.describe('Releases — filters, query validation and paging (BATCH_081_GENERATED_UNRUN)',()=>{
 test('PREL-013 Default list GET uses fifty rows and zero offset',async({page})=>{
  const q:string[]=[];await openReleases(page,{onCall:(m,p,params)=>{if(m==='GET'&&p===endpoint)q.push(params.toString());}});
  expect(q.some(x=>new URLSearchParams(x).get('limit')==='50'&&new URLSearchParams(x).get('offset')==='0')).toBe(true);
 });
 test('PREL-014 Status filter selects planned releases with URL-backed value',async({page})=>{
  await openReleases(page);await filters(page).getByLabel('Status').selectOption('planned');
  await expect(card(page,plannedRelease.version)).toBeVisible();await expect(card(page,deployedRelease.version)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('status')).toBe('planned');
 });
 test('PREL-015 Environment filter forwards production enum',async({page})=>{
  const qs:string[]=[];await openReleases(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)qs.push(q.get('environment')||'');}});
  await filters(page).getByLabel('Environment').selectOption('staging');await expect.poll(()=>qs.at(-1)).toBe('staging');
 });
 test('PREL-016 Type filter narrows to hotfix and uses release_type query key',async({page})=>{
  await openReleases(page);await filters(page).getByLabel('Type').selectOption('hotfix');
  await expect(card(page,inProgressRelease.version)).toBeVisible();await expect(card(page,plannedRelease.version)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('release_type')).toBe('hotfix');
 });
 test('PREL-017 Free-text search matches version and persists query',async({page})=>{
  await openReleases(page);await filters(page).getByLabel('Search').fill(rolledRelease.version);
  await expect(card(page,rolledRelease.version)).toBeVisible();await expect(cards(page)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('search')).toBe(rolledRelease.version);
 });
 test('PREL-018 Upcoming-only excludes deployed and rolled-back records',async({page})=>{
  await openReleases(page);await filters(page).getByLabel('Upcoming only').check();
  await expect(card(page,plannedRelease.version)).toBeVisible();await expect(card(page,inProgressRelease.version)).toBeVisible();
  await expect(card(page,deployedRelease.version)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('upcoming_only')).toBe('true');
 });
 test('PREL-019 Clear filters removes all URL selections',async({page})=>{
  await openReleases(page,{query:'status=deployed&environment=production&upcoming_only=true'});
  await filters(page).getByRole('button',{name:'Clear filters'}).click();await expect(card(page,plannedRelease.version)).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
 });
 test('PREL-020 Invalid status URL blocks listing rather than forwarding unknown enum',async({page})=>{
  const calls:string[]=[];await openReleases(page,{query:'status=unknown',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PREL-021 Invalid environment URL blocks release GET',async({page})=>{
  const calls:string[]=[];await openReleases(page,{query:'environment=orbit',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Clear the filters to load release evidence safely.');expect(calls).toHaveLength(0);
 });
 test('PREL-022 Invalid release type URL blocks list query',async({page})=>{
  const calls:string[]=[];await openReleases(page,{query:'release_type=undeclared',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PREL-023 Invalid upcoming boolean URL cannot be coerced to successful filter',async({page})=>{
  const calls:string[]=[];await openReleases(page,{query:'upcoming_only=maybe',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PREL-024 Overlong search URL blocks backend GET',async({page})=>{
  const calls:string[]=[];await openReleases(page,{query:'search='+('X'.repeat(201)),onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toHaveLength(0);
 });
 test('PREL-025 Clearing invalid URL restores registry requests',async({page})=>{
  const calls:string[]=[];await openReleases(page,{query:'environment=bad',onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await root(page).getByRole('button',{name:'Clear filters'}).first().click();await expect(card(page,plannedRelease.version)).toBeVisible();
  expect(calls.length).toBeGreaterThan(0);
 });
 test('PREL-026 Missing match is not interpreted as absence of external deployments',async({page})=>{
  await openReleases(page,{query:'search=does-not-exist'});await expect(registry(page)).toContainText('No releases match these filters.');
  await expect(registry(page)).toContainText('does not establish that no external deployment activity exists');
 });
 test('PREL-027 Fifty-row list and registry-wide summary remain distinct',async({page})=>{
  await openReleases(page,{rows:manyReleases(51)});await expect(cards(page)).toHaveCount(50);
  await expect(pager(page)).toContainText('51 filtered total');await expect(root(page).getByLabel('Release registry summary')).toContainText('51');
 });
 test('PREL-028 Next page passes offset fifty and disables at final page',async({page})=>{
  const offsets:string[]=[];await openReleases(page,{rows:manyReleases(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'v81.051')).toBeVisible();
  expect(offsets).toContain('50');await expect(pager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PREL-029 Previous page returns offset zero',async({page})=>{
  const offsets:string[]=[];await openReleases(page,{rows:manyReleases(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'v81.051')).toBeVisible();
  await pager(page).getByRole('button',{name:'Previous'}).click();await expect(card(page,'v81.001')).toBeVisible();expect(offsets.at(-1)).toBe('0');
 });
 test('PREL-030 Changing filter resets offset to zero',async({page})=>{
  const offsets:string[]=[];await openReleases(page,{rows:manyReleases(51),onCall:(m,p,q)=>{if(m==='GET'&&p===endpoint)offsets.push(q.get('offset')||'');}});
  await pager(page).getByRole('button',{name:'Next'}).click();await expect(card(page,'v81.051')).toBeVisible();
  await filters(page).getByLabel('Status').selectOption('planned');await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PREL-031 Initial registry transport failure shows retry and recovers',async({page})=>{
  let ok=false;await openReleases(page,{respond:(m,p)=>{if(m==='GET'&&p===endpoint&&!ok)return {status:503,json:{message:'Synthetic release outage'}};}});
  await expect(registry(page)).toContainText('Release registry could not be loaded.');ok=true;
  await registry(page).getByRole('button',{name:'Retry'}).click();await expect(card(page,plannedRelease.version)).toBeVisible();
 });
 test('PREL-032 Refresh explicitly reloads recorded registry without claiming deployment',async({page})=>{
  const calls:string[]=[];await openReleases(page,{onCall:(m,p)=>{if(m==='GET'&&p===endpoint)calls.push(p);}});
  await root(page).getByRole('button',{name:'Refresh'}).click();await expect.poll(()=>calls.length).toBeGreaterThan(1);
  await expect(section(page,'Evidence boundary')).toContainText('application references');
 });
});

test.describe('Releases — planned registration and validation (BATCH_081_GENERATED_UNRUN)',()=>{
 test('PREL-033 Blank version and title disable registration',async({page})=>{
  await openReleases(page);await expect(editor(page).getByRole('button',{name:'Register release'})).toBeDisabled();
  await editor(page).getByLabel('Version').fill('v81.2.0');await expect(editor(page).getByRole('button',{name:'Register release'})).toBeDisabled();
 });
 test('PREL-034 Planned release defaults to minor, production and no impact',async({page})=>{
  await openReleases(page);await expect(editor(page).getByLabel('Release type')).toHaveValue('minor');
  await expect(editor(page).getByLabel('Environment')).toHaveValue('production');
  await expect(editor(page).getByLabel('Tenant impact')).toHaveValue('none');
 });
 test('PREL-035 POST trims version/title and never sets status directly',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});
  await editor(page).getByLabel('Version').fill('  v81.2.0  ');await editor(page).getByLabel('Title').fill('  Synthetic release  ');
  await editor(page).getByRole('button',{name:'Register release'}).click();await expect.poll(()=>sent.length).toBe(1);
  expect(sent.at(-1)).toMatchObject({version:'v81.2.0',title:'Synthetic release'});expect(sent.at(-1)).not.toHaveProperty('status');
 });
 test('PREL-036 Registration serializes planned datetime and optional text',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await editor(page).getByLabel('Planned time').fill('2026-12-10T10:30');await editor(page).getByLabel('Summary').fill('  Expected impact  ');
  await editor(page).getByRole('button',{name:'Register release'}).click();
  expect(sent.at(-1).planned_at).toMatch(/^2026-12-\d\dT\d\d:\d\d:00\.000Z$/);expect(sent.at(-1).summary).toBe('Expected impact');
 });
 test('PREL-037 High tenant impact and maintenance requirement transmitted independently',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await editor(page).getByLabel('Tenant impact').selectOption('high');await editor(page).getByLabel('Requires maintenance').check();
  await editor(page).getByRole('button',{name:'Register release'}).click();expect(sent.at(-1)).toMatchObject({tenant_impact:'high',requires_maintenance:true});
 });
 test('PREL-038 Hidden owner, change and maintenance linkage are omitted from POST',async({page})=>{
  const sent:any[]=[];await openReleases(page,{permissions:without('platform.users.read','platform.changes.read','platform.maintenance.read'),
   onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)sent.push(b);}});await valid(page);
  await editor(page).getByRole('button',{name:'Register release'}).click();
  for(const key of ['owner_platform_user_id','change_request_id','maintenance_window_id'])expect(sent.at(-1)).not.toHaveProperty(key);
 });
 test('PREL-039 Only linkable active owner/change/window options can be selected',async({page})=>{
  await openReleases(page);await expect(editor(page).getByLabel('Owner').locator('option')).toHaveCount(2);
  await expect(editor(page).getByLabel('Change request').locator('option')).toHaveCount(2);
  await expect(editor(page).getByLabel('Maintenance window').locator('option')).toHaveCount(2);
 });
 test('PREL-040 Version/title input length caps and all planned form fields are present',async({page})=>{
  await openReleases(page);await expect(editor(page).getByLabel('Version')).toHaveAttribute('maxlength','80');
  await expect(editor(page).getByLabel('Title')).toHaveAttribute('maxlength','255');
  await expect(editor(page).getByLabel('Release notes')).toHaveAttribute('maxlength','12000');
  await expect(editor(page).getByLabel('Rollback plan')).toHaveAttribute('maxlength','8000');
 });
 test('PREL-041 Successful create resets editor and adds new planned registry entry',async({page})=>{
  await openReleases(page);await valid(page);await editor(page).getByRole('button',{name:'Register release'}).click();
  await expect(root(page)).toContainText('Release registered as planned.');await expect(editor(page).getByLabel('Version')).toHaveValue('');
  await expect(card(page,'v81.2.0')).toContainText('Synthetic release');
 });
});


/** Batch 82: PREL-042..080; source-traced, synthetic transport, GENERATED_UNRUN. */
test.describe('Releases — mutations, confirmations and evidence boundaries (BATCH_082_GENERATED_UNRUN)',()=>{
 test('PREL-042 Editing planned record fills current version and title',async({page})=>{
  await openReleases(page);await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();
 await expect(editor(page).getByLabel('Version')).toHaveValue(plannedRelease.version);
 await expect(editor(page).getByLabel('Title')).toHaveValue(plannedRelease.title);
 await expect(editor(page).getByRole('button',{name:'Save details'})).toBeVisible();
 });
 test('PREL-043 Saving planned record PATCHes its id rather than POSTing a new release',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(['PATCH','POST'].includes(m)&&u.startsWith(endpoint))sent.push({m,u,b});}});
 await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Title').fill('Updated planned title');
 await editor(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>sent.length).toBe(1);
 expect(sent[0]).toMatchObject({m:'PATCH',u:`${endpoint}/${releaseId}`,b:{title:'Updated planned title'}});
 });
 test('PREL-044 Edit payload trims version and title',async({page})=>{
  const bodies:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='PATCH'&&u===`${endpoint}/${releaseId}`)bodies.push(b);}});
 await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Version').fill('  v81.1.1  ');
 await editor(page).getByLabel('Title').fill('  New label  ');await editor(page).getByRole('button',{name:'Save details'}).click();
 await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toMatchObject({version:'v81.1.1',title:'New label'});
 });
 test('PREL-045 Edit payload trims the notes and rollback plan independently',async({page})=>{
  const bodies:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='PATCH')bodies.push(b);}});
 await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();
 await editor(page).getByLabel('Release notes').fill('  Release guidance  ');
 await editor(page).getByLabel('Rollback plan').fill('  Restore known image  ');
 await editor(page).getByRole('button',{name:'Save details'}).click();
 await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toMatchObject({release_notes:'Release guidance',rollback_plan:'Restore known image'});
 });
 test('PREL-046 Edit updates authorized owner change and maintenance references',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='PATCH')sent.push(b);}});
 await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();
 await editor(page).getByLabel('Owner').selectOption(releaseOwnerId);await editor(page).getByLabel('Change request').selectOption(changeId);
 await editor(page).getByLabel('Maintenance window').selectOption(windowId);
 await editor(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>sent.length).toBe(1);
 expect(sent[0]).toMatchObject({owner_platform_user_id:releaseOwnerId,change_request_id:changeId,maintenance_window_id:windowId});
 });
 test('PREL-047 Details PATCH never sends lifecycle status field',async({page})=>{
  const bodies:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='PATCH')bodies.push(b);}});
 await card(page,inProgressRelease.version).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Title').fill('Edited');
 await editor(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).not.toHaveProperty('status');
 });
 test('PREL-048 Editing without directory grants omits protected linkage fields',async({page})=>{
  const bodies:any[]=[];await openReleases(page,{permissions:without('platform.users.read','platform.changes.read','platform.maintenance.read'),onCall:(m,u,q,b)=>{if(m==='PATCH')bodies.push(b);}});
 await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Title').fill('Restricted edit');
 await editor(page).getByRole('button',{name:'Save details'}).click();await expect.poll(()=>bodies.length).toBe(1);
 for(const k of ['owner_platform_user_id','change_request_id','maintenance_window_id'])expect(bodies[0]).not.toHaveProperty(k);
 });
 test('PREL-049 Successful edit clears editing state and restores new-release editor',async({page})=>{
  await openReleases(page);await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();
 await editor(page).getByLabel('Title').fill('New release title');await editor(page).getByRole('button',{name:'Save details'}).click();
 await expect(root(page)).toContainText('Release details saved.');await expect(editor(page).getByRole('button',{name:'Register release'})).toBeVisible();
 await expect(editor(page).getByLabel('Title')).toHaveValue('');
 });
 test('PREL-050 Failed PATCH shows error and preserves editable values',async({page})=>{
  await openReleases(page,{responses:{[`PATCH ${endpoint}/${releaseId}`]:{status:409,json:{message:'Edit conflict'}}}});
 await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Title').fill('Local unsaved title');
 await editor(page).getByRole('button',{name:'Save details'}).click();await expect(root(page)).toContainText('Action failed.');
 await expect(editor(page).getByLabel('Title')).toHaveValue('Local unsaved title');
 });
 test('PREL-051 Opening edit mode does not submit a mutation',async({page})=>{
  const changes:string[]=[];await openReleases(page,{onCall:(m,u)=>{if(m!=='GET'&&u.startsWith(endpoint))changes.push(`${m} ${u}`);}});
 await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();await expect(editor(page).getByLabel('Version')).toHaveValue(plannedRelease.version);
 expect(changes).toEqual([]);
 });
 test('PREL-052 Without write permission no edit or lifecycle buttons appear',async({page})=>{
  await openReleases(page,{permissions:without('platform.releases.write')});
 for(const name of ['Edit details','Start','Cancel','Record deployed','Record rollback'])await expect(root(page).getByRole('button',{name,exact:true})).toHaveCount(0);
 });
 test('PREL-053 Blank editing title blocks PATCH and leaves record untouched',async({page})=>{
  const edits:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='PATCH')edits.push(b);}});
 await card(page,plannedRelease.version).getByRole('button',{name:'Edit details'}).click();await editor(page).getByLabel('Title').fill(' ');
 await expect(editor(page).getByRole('button',{name:'Save details'})).toBeDisabled();expect(edits).toHaveLength(0);
 });
 test('PREL-054 Declining planned-to-in-progress confirmation prevents transition',async({page})=>{
  const calls:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))calls.push(b);}});
 page.once('dialog',d=>d.dismiss());await card(page,plannedRelease.version).getByRole('button',{name:'Start'}).click();expect(calls).toHaveLength(0);
 });
 test('PREL-055 Confirming start records in_progress through dedicated status endpoint',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push({u,b});}});
 page.once('dialog',d=>d.accept());await card(page,plannedRelease.version).getByRole('button',{name:'Start'}).click();await expect.poll(()=>sent.length).toBe(1);
 expect(sent[0]).toEqual({u:`${endpoint}/${releaseId}/status`,b:{status:'in_progress'}});
 });
 test('PREL-056 Declining planned cancellation sends no status change',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push(b);}});
 page.once('dialog',d=>d.dismiss());await card(page,plannedRelease.version).getByRole('button',{name:'Cancel',exact:true}).click();expect(sent).toEqual([]);
 });
 test('PREL-057 Confirming planned cancellation records cancelled status',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push(b);}});
 page.once('dialog',d=>d.accept());await card(page,plannedRelease.version).getByRole('button',{name:'Cancel',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({status:'cancelled'});
 });
 test('PREL-058 Declining deployed recording leaves in-progress state unchanged',async({page})=>{
  const calls:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))calls.push(b);}});
 page.once('dialog',d=>d.dismiss());await card(page,inProgressRelease.version).getByRole('button',{name:'Record deployed'}).click();
 expect(calls).toHaveLength(0);await expect(card(page,inProgressRelease.version)).toContainText('In progress');
 });
 test('PREL-059 Confirming deployed recording uses exact in-progress release id',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push({u,b});}});
 page.once('dialog',d=>d.accept());await card(page,inProgressRelease.version).getByRole('button',{name:'Record deployed'}).click();
 await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({u:`${endpoint}/${inProgressRelease.id}/status`,b:{status:'deployed'}});
 });
 test('PREL-060 Declining in-progress rollback submits no status mutation',async({page})=>{
  const calls:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))calls.push(b);}});
 page.once('dialog',d=>d.dismiss());await card(page,inProgressRelease.version).getByRole('button',{name:'Record rollback'}).click();expect(calls).toHaveLength(0);
 });
 test('PREL-061 Confirming in-progress rollback records rolled_back status',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push({u,b});}});
 page.once('dialog',d=>d.accept());await card(page,inProgressRelease.version).getByRole('button',{name:'Record rollback'}).click();
 await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({u:`${endpoint}/${inProgressRelease.id}/status`,b:{status:'rolled_back'}});
 });
 test('PREL-062 In-progress Cancel targets cancelled lifecycle state',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push({u,b});}});
 page.once('dialog',d=>d.accept());await card(page,inProgressRelease.version).getByRole('button',{name:'Cancel',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({u:`${endpoint}/${inProgressRelease.id}/status`,b:{status:'cancelled'}});
 });
 test('PREL-063 Confirmed rollback of recorded deployed status uses deployed id',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push({u,b});}});
 page.once('dialog',d=>d.accept());await card(page,deployedRelease.version).getByRole('button',{name:'Record rollback'}).click();
 await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({u:`${endpoint}/${deployedRelease.id}/status`,b:{status:'rolled_back'}});
 });
 test('PREL-064 Rejecting deployed rollback leaves no mutation',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push(b);}});
 page.once('dialog',d=>d.dismiss());await card(page,deployedRelease.version).getByRole('button',{name:'Record rollback'}).click();expect(sent).toEqual([]);
 });
 test('PREL-065 Recorded rollback is terminal and shows no further status actions',async({page})=>{
  await openReleases(page);for(const action of ['Start','Cancel','Record deployed','Record rollback','Edit details'])
 await expect(card(page,rolledRelease.version).getByRole('button',{name:action,exact:true})).toHaveCount(0);
 });
 test('PREL-066 Cancelled history is immutable and no lifecycle controls display',async({page})=>{
  await openReleases(page,{rows:[{...plannedRelease,status:'cancelled'}]});
 await expect(card(page,plannedRelease.version)).toContainText('Terminal release history · details immutable');
 await expect(card(page,plannedRelease.version).getByRole('button',{name:'Edit details'})).toHaveCount(0);
 });
 test('PREL-067 No nonexistent planned-to-deployed shortcut is offered',async({page})=>{
  await openReleases(page);await expect(card(page,plannedRelease.version).getByRole('button',{name:'Record deployed'})).toHaveCount(0);
 await expect(card(page,plannedRelease.version).getByRole('button',{name:'Record rollback'})).toHaveCount(0);
 });
 test('PREL-068 Transition body contains status only and no forged actor identity',async({page})=>{
  const sent:any[]=[];await openReleases(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.endsWith('/status'))sent.push(b);}});
 page.once('dialog',d=>d.accept());await card(page,plannedRelease.version).getByRole('button',{name:'Start'}).click();
 await expect.poll(()=>sent.length).toBe(1);expect(Object.keys(sent[0])).toEqual(['status']);
 });
 test('PREL-069 Transition server conflict shows actionable error without claiming success',async({page})=>{
  await openReleases(page,{responses:{[`POST ${endpoint}/${releaseId}/status`]:{status:409,json:{message:'Transition rejected'}}}});
 page.once('dialog',d=>d.accept());await card(page,plannedRelease.version).getByRole('button',{name:'Start'}).click();
 await expect(root(page)).toContainText('Action failed.');await expect(root(page)).not.toContainText('Release workflow moved to In progress.');
 });
 test('PREL-070 Dismissing failed transition clears error banner',async({page})=>{
  await openReleases(page,{responses:{[`POST ${endpoint}/${releaseId}/status`]:{status:409,json:{message:'Rejected'}}}});
 page.once('dialog',d=>d.accept());await card(page,plannedRelease.version).getByRole('button',{name:'Start'}).click();
 await expect(root(page)).toContainText('Action failed.');await root(page).getByRole('button',{name:'Dismiss'}).click();
 await expect(root(page)).not.toContainText('Action failed.');
 });
 test('PREL-071 Dismissed successful status change removes success text',async({page})=>{
  await openReleases(page);page.once('dialog',d=>d.accept());
 await card(page,plannedRelease.version).getByRole('button',{name:'Start'}).click();
 await expect(root(page)).toContainText('Release workflow moved to In progress.');
 await root(page).getByRole('button',{name:'Dismiss'}).click();await expect(root(page)).not.toContainText('Release workflow moved to In progress.');
 });
 test('PREL-072 Confirm text identifies application state and does not claim external deployment',async({page})=>{
  await openReleases(page);let dialogText='';
 page.once('dialog',async d=>{dialogText=d.message();await d.dismiss();});
 await card(page,inProgressRelease.version).getByRole('button',{name:'Record deployed'}).click();
 expect(dialogText).toContain('does not verify an external deployment provider');
 });
 test('PREL-073 Successful status change updates the affected registry badge',async({page})=>{
  await openReleases(page);page.once('dialog',d=>d.accept());
 await card(page,plannedRelease.version).getByRole('button',{name:'Start'}).click();
 await expect(card(page,plannedRelease.version).locator('.platform-releases__badges')).toContainText('In progress');
 });
 test('PREL-074 Audit link in release card is gated by audit read privilege',async({page})=>{
  await openReleases(page,{permissions:without('platform.audit.read')});
 await expect(card(page,plannedRelease.version).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
 });
 test('PREL-075 A release without linked change and maintenance never shows their card links',async({page})=>{
  await openReleases(page,{rows:[{...plannedRelease,change_request_id:null,change_request_present:false,
 maintenance_window_id:null,maintenance_window_present:false}]});
 await expect(card(page,plannedRelease.version).getByRole('link',{name:'Change Management'})).toHaveCount(0);
 await expect(card(page,plannedRelease.version).getByRole('link',{name:'Maintenance'})).toHaveCount(0);
 });
 test('PREL-076 Pagination summary is registry-wide while cards remain page-bound',async({page})=>{
  await openReleases(page,{rows:manyReleases(53)});await expect(cards(page)).toHaveCount(50);
 await expect(root(page).getByLabel('Release registry summary')).toContainText('53');
 });
 test('PREL-077 Switching release environment resets page offset to zero',async({page})=>{
  const seen:string[]=[];await openReleases(page,{rows:manyReleases(62),onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)seen.push(q.toString());}});
 await pager(page).getByRole('button',{name:'Next'}).click();await expect(pager(page)).toContainText('Page 2');
 await filters(page).getByLabel('Environment').selectOption('staging');
 await expect.poll(()=>new URLSearchParams(seen.at(-1)).get('offset')).toBe('0');
 });
 test('PREL-078 Empty release list explicitly disclaims absent external deployment activity',async({page})=>{
  await openReleases(page,{rows:[]});await expect(registry(page)).toContainText('No releases match these filters.');
 await expect(registry(page)).toContainText('does not establish that no external deployment activity exists.');
 });
 test('PREL-079 Initial registry error supplies Retry, not a fabricated empty registry',async({page})=>{
  await openReleases(page,{responses:{[`GET ${endpoint}`]:{status:503,json:{message:'Service temporarily unavailable'}}}});
 await expect(registry(page)).toContainText('Release registry could not be loaded.');await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PREL-080 Recorded deployment and rollback timestamps remain application-only evidence',async({page})=>{
  await openReleases(page);await expect(card(page,deployedRelease.version)).toContainText('Deployed state recorded');
 await expect(card(page,rolledRelease.version)).toContainText('Rollback state recorded');
 await expect(section(page,'Evidence boundary')).toContainText('does not independently prove');
 });
});
