/** Batch 82 — Platform Access Reviews PARV-001..041 source-traced browser declarations.
 * Intercepted transport is not server-side RBAC, durable audit, actual privilege revocation or customer consent evidence. */
import {test,expect,type Page} from '@playwright/test';
import {openAccessReviews,reviewPermissions,baseReview,doneReview,reviewId,userItemId,keyItemId,stoppedReview,fixtureItems,manyReviews} from '../../../support/platformAccessReviewsFixture';
const endpoint='/platform/access-reviews';
const root=(p:Page)=>p.locator('.platform-access-reviews');
const section=(p:Page,title:string)=>root(p).locator('.platform-access-reviews__section').filter({has:p.getByRole('heading',{name:title,exact:true})});
const registry=(p:Page)=>section(p,'Review registry');
const form=(p:Page)=>section(p,'Start access review');
const filters=(p:Page)=>registry(p).locator('.platform-access-reviews__filters');
const cards=(p:Page)=>registry(p).locator('.platform-access-reviews__card');
const card=(p:Page,title:string)=>cards(p).filter({has:p.getByRole('heading',{name:title,exact:true})});
const pager=(p:Page)=>registry(p).locator('.platform-access-reviews__pagination');
const evidenceShell=(p:Page)=>root(p).locator('.platform-access-reviews__section').filter({has:p.getByRole('heading',{name:/Review evidence/})});
const detail=(p:Page)=>root(p).locator('.platform-access-reviews__section').filter({has:p.locator('.platform-access-reviews__items')});
const items=(p:Page)=>detail(p).locator('.platform-access-reviews__item');
const item=(p:Page,label:string)=>items(p).filter({has:p.getByRole('heading',{name:label,exact:true})});
const without=(...perms:string[])=>reviewPermissions.filter(x=>!perms.includes(x));
const openEvidenceAfterError=async(p:Page)=>{await card(p,baseReview.title).getByRole('button',{name:'Open evidence'}).click();await expect(evidenceShell(p).getByRole('button',{name:'Retry detail'})).toBeVisible();};
const openEvidence=async(p:Page)=>{await card(p,baseReview.title).getByRole('button',{name:'Open evidence'}).click();await expect(detail(p)).toBeVisible();};

test.describe('Access Reviews — source-specific governance UI (BATCH_082_GENERATED_UNRUN)',()=>{
 test('PARV-001 Access Reviews loads the source-scoped registry workspace',async({page})=>{
  await openAccessReviews(page);await expect(root(page)).toContainText('Security governance');
 await expect(registry(page)).toContainText(baseReview.title);await expect(root(page)).toContainText('Source-scoped evidence');
 });
 test('PARV-002 Evidence notice disclaims external access removal and authorization',async({page})=>{
  await openAccessReviews(page);
 await expect(section(page,'Evidence boundaries')).toContainText('does not independently prove that external access was removed');
 });
 test('PARV-003 Default filter lists open access reviews and uses fifty rows',async({page})=>{
  const qs:string[]=[];await openAccessReviews(page,{onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)qs.push(q.toString());}});
 await expect.poll(()=>qs.length).toBeGreaterThan(0);const last=new URLSearchParams(qs.at(-1));
 expect(last.get('status')).toBe('open');expect(last.get('limit')).toBe('50');expect(last.get('offset')).toBe('0');
 });
 test('PARV-004 Registry summary is filtered-total evidence not page count',async({page})=>{
  await openAccessReviews(page,{rows:manyReviews(57)});await expect(cards(page)).toHaveCount(50);
 await expect(root(page).getByLabel('Access review summary')).toContainText('57');
 });
 test('PARV-005 Without access review read permission route is guarded before list GET',async({page})=>{
  const calls:string[]=[];await openAccessReviews(page,{permissions:without('platform.access_reviews.read'),expectHeading:false,
 onCall:(m,u)=>{if(m==='GET'&&u===endpoint)calls.push(u);}});await expect(root(page)).toHaveCount(0);expect(calls).toHaveLength(0);
 });
 test('PARV-006 Read-only access review operator cannot start or decide reviews',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.access_reviews.write')});
 await expect(section(page,'Start access review')).toHaveCount(0);await openEvidence(page);
 await expect(items(page).getByRole('button',{name:'Approved'})).toHaveCount(0);
 await expect(root(page).getByRole('button',{name:'Complete',exact:true})).toHaveCount(0);
 });
 test('PARV-007 Missing platform users source grant shows restricted access',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.users.read')});
 await expect(section(page,'Evidence boundaries')).toContainText('PLATFORM_USERS_READ required');
 await expect(card(page,baseReview.title)).toContainText('Creator identity restricted');
 });
 test('PARV-008 Missing tenant source grant displays tenant support restriction',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.tenants.read')});
 await expect(section(page,'Evidence boundaries')).toContainText('TENANTS_READ required');
 await expect(form(page).getByLabel('Scope').locator('option[value="tenant_support"]')).toBeDisabled();
 });
 test('PARV-009 Missing API key grant blocks single-source API-key review selection',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.api_keys.read')});
 await expect(form(page).getByLabel('Scope').locator('option[value="api_keys"]')).toBeDisabled();
 });
 test('PARV-010 Missing webhook grant blocks single-source webhook review selection',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.webhooks.read')});
 await expect(form(page).getByLabel('Scope').locator('option[value="webhooks"]')).toBeDisabled();
 });
 test('PARV-011 Mixed source selection stays available with at least one source grant',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.users.read','platform.tenants.read','platform.api_keys.read')});
 await expect(form(page).getByLabel('Scope').locator('option[value="mixed"]')).toBeEnabled();
 });
 test('PARV-012 Mixed review cannot be created with no readable source',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.users.read','platform.tenants.read','platform.api_keys.read','platform.webhooks.read')});
 await expect(form(page).getByLabel('Scope').locator('option[value="mixed"]')).toBeDisabled();
 await form(page).getByLabel('Title').fill('No source');await expect(form(page).getByRole('button',{name:'Create review'})).toBeDisabled();
 });
 test('PARV-013 Audit supporting link is hidden without audit read',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.audit.read')});
 await expect(section(page,'Supporting operations').getByRole('link',{name:'Platform audit'})).toHaveCount(0);
 });
 test('PARV-014 Supporting source links respect each independent read grant',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.users.read','platform.api_keys.read','platform.webhooks.read','platform.support_sessions.read')});
 const links=section(page,'Supporting operations');for(const label of ['Platform users','API keys','Webhooks','Support sessions'])
  await expect(links.getByRole('link',{name:label,exact:true})).toHaveCount(0);
 });
 test('PARV-015 Status filter switches from open to completed and persists in URL',async({page})=>{
  await openAccessReviews(page);await filters(page).getByLabel('Status').selectOption('completed');
 await expect(card(page,doneReview.title)).toBeVisible();await expect(card(page,baseReview.title)).toHaveCount(0);
 expect(new URL(page.url()).searchParams.get('status')).toBe('completed';
 });
 test('PARV-016 Scope filter transmits platform_users value to list endpoint',async({page})=>{
  const seen:string[]=[];await openAccessReviews(page,{onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)seen.push(q.get('scope')||'');}});
 await filters(page).getByLabel('Scope').selectOption('platform_users');await expect.poll(()=>seen.at(-1)).toBe('platform_users');
 });
 test('PARV-017 Free text search matches review title and stores URL value',async({page})=>{
  await openAccessReviews(page);await filters(page).getByLabel('Search').fill('Privileged');
 await expect(card(page,baseReview.title)).toBeVisible();expect(new URL(page.url()).searchParams.get('search')).toBe('Privileged';
 });
 test('PARV-018 Unknown status URL blocks backend evidence listing',async({page})=>{
  const calls:string[]=[];await openAccessReviews(page,{query:'status=invalid',onCall:(m,u)=>{if(m==='GET'&&u===endpoint)calls.push(u);}});
 await expect(root(page)).toContainText('One or more URL filters are invalid');expect(calls).toHaveLength(0);
 });
 test('PARV-019 Unknown scope URL blocks backend evidence listing',async({page})=>{
  const calls:string[]=[];await openAccessReviews(page,{query:'scope=unknown',onCall:(m,u)=>{if(m==='GET'&&u===endpoint)calls.push(u);}});
 await expect(root(page)).toContainText('One or more URL filters are invalid');expect(calls).toHaveLength(0);
 });
 test('PARV-020 Search longer than 200 characters blocks backend listing',async({page})=>{
  const calls:string[]=[];await openAccessReviews(page,{query:'search='+encodeURIComponent('x'.repeat(201)),
 onCall:(m,u)=>{if(m==='GET'&&u===endpoint)calls.push(u);}});
 await expect(root(page)).toContainText('One or more URL filters are invalid');expect(calls).toHaveLength(0);
 });
 test('PARV-021 Selecting a valid status after invalid URL resumes fetching',async({page})=>{
  const calls:string[]=[];await openAccessReviews(page,{query:'status=bad',onCall:(m,u)=>{if(m==='GET'&&u===endpoint)calls.push(u);}});
 await filters(page).getByLabel('Status').selectOption('completed');await expect.poll(()=>calls.length).toBeGreaterThan(0);
 await expect(card(page,doneReview.title)).toBeVisible();
 });
 test('PARV-022 Next page advances offset fifty and exposes page number',async({page})=>{
  const offsets:string[]=[];await openAccessReviews(page,{rows:manyReviews(62),onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)offsets.push(q.get('offset')||'');}});
 await pager(page).getByRole('button',{name:'Next'}).click();await expect(pager(page)).toContainText('Page 2');
 await expect.poll(()=>offsets.at(-1)).toBe('50');
 });
 test('PARV-023 Previous returns offset zero on server-side pagination',async({page})=>{
  const offsets:string[]=[];await openAccessReviews(page,{rows:manyReviews(65),onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)offsets.push(q.get('offset')||'');}});
 await pager(page).getByRole('button',{name:'Next'}).click();await expect(pager(page)).toContainText('Page 2');
 await pager(page).getByRole('button',{name:'Previous'}).click();await expect.poll(()=>offsets.at(-1)).toBe('0');
 });
 test('PARV-024 Changing scope after paging resets offset to zero',async({page})=>{
  const queries:string[]=[];await openAccessReviews(page,{rows:manyReviews(60),onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)queries.push(q.toString());}});
 await pager(page).getByRole('button',{name:'Next'}).click();await expect(pager(page)).toContainText('Page 2');
 await filters(page).getByLabel('Scope').selectOption('api_keys');await expect.poll(()=>new URLSearchParams(queries.at(-1)).get('offset')).toBe('0');
 });
 test('PARV-025 No matching review does not imply there is no real-world access',async({page})=>{
  await openAccessReviews(page,{rows:[]});await expect(registry(page)).toContainText('No access reviews match these filters.');
 await expect(registry(page)).toContainText('says nothing about external access activity');
 });
 test('PARV-026 Initial registry failure shows Retry rather than treating empty result as success',async({page})=>{
  await openAccessReviews(page,{responses:{[`GET ${endpoint}`]:{status:503,json:{message:'Synthetic registry unavailable'}}}});
 await expect(registry(page)).toContainText('Access reviews could not be loaded.');
 await expect(registry(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PARV-027 Read permission alone cannot create reviews even if a title is supplied',async({page})=>{
  const actions:string[]=[];await openAccessReviews(page,{permissions:without('platform.access_reviews.write'),
 onCall:(m,u)=>{if(m==='POST'&&u===endpoint)actions.push(u);}});
 await expect(form(page)).toHaveCount(0);expect(actions).toHaveLength(0);
 });
 test('PARV-028 Blank title disables create action and shows explicit validation',async({page})=>{
  await openAccessReviews(page);await expect(form(page).getByRole('button',{name:'Create review'})).toBeDisabled();
 await expect(form(page)).toContainText('Enter a title, choose an available scope');
 });
 test('PARV-029 Whitespaces-only title is rejected before mutation',async({page})=>{
  const actions:any[]=[];await openAccessReviews(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u===endpoint)actions.push(b);}});
 await form(page).getByLabel('Title').fill('   ');await expect(form(page).getByRole('button',{name:'Create review'})).toBeDisabled();
 expect(actions).toHaveLength(0);
 });
 test('PARV-030 Title input is bounded to 200 characters',async({page})=>{
  await openAccessReviews(page);await expect(form(page).getByLabel('Title')).toHaveAttribute('maxlength','200');
 });
 test('PARV-031 Notes input is bounded to 5000 characters',async({page})=>{
  await openAccessReviews(page);await expect(form(page).getByLabel('Notes')).toHaveAttribute('maxlength','5000');
 });
 test('PARV-032 Create body trims title and sends selected scope',async({page})=>{
  const bodies:any[]=[];await openAccessReviews(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u===endpoint)bodies.push(b);}});
 await form(page).getByLabel('Title').fill('  Review synthetic operator access  ');
 await form(page).getByLabel('Scope').selectOption('platform_users');await form(page).getByRole('button',{name:'Create review'}).click();
 await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toMatchObject({title:'Review synthetic operator access',scope:'platform_users'});
 });
 test('PARV-033 Due datetime is serialized to ISO with explicit body field',async({page})=>{
  const bodies:any[]=[];await openAccessReviews(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u===endpoint)bodies.push(b);}});
 await form(page).getByLabel('Title').fill('Synthetic time review');await form(page).getByLabel('Due time').fill('2026-12-01T09:30');
 await form(page).getByRole('button',{name:'Create review'}).click();await expect.poll(()=>bodies.length).toBe(1);
 expect(bodies[0].due_at).toMatch(/^2026-12-01T\d\d:\d\d:00\.000Z$/);
 });
 test('PARV-034 Blank notes and missing due datetime are transmitted as null',async({page})=>{
  const bodies:any[]=[];await openAccessReviews(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u===endpoint)bodies.push(b);}});
 await form(page).getByLabel('Title').fill('No optional fields');await form(page).getByRole('button',{name:'Create review'}).click();
 await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toMatchObject({due_at:null,notes:null});
 });
 test('PARV-035 Successful create resets form and automatically opens new review evidence',async({page})=>{
  await openAccessReviews(page);await form(page).getByLabel('Title').fill('New synthetic review');await form(page).getByRole('button',{name:'Create review'}).click();
 await expect(root(page)).toContainText('Access review created.');await expect(form(page).getByLabel('Title')).toHaveValue('');
 await expect(root(page)).toContainText('Review evidence · New synthetic review');
 });
 test('PARV-036 Opening review fetches exact id and shows source availability metadata',async({page})=>{
  const paths:string[]=[];await openAccessReviews(page,{onCall:(m,u)=>{if(m==='GET'&&u.startsWith(`${endpoint}/`))paths.push(u);}});
 await openEvidence(page);await expect.poll(()=>paths).toContain(`${endpoint}/${reviewId}`);
 await expect(detail(page)).toContainText('Available sources:');await expect(detail(page)).toContainText('Omitted/restricted sources:');
 });
 test('PARV-037 Review evidence displays status and decision metadata without interpreting external effect',async({page})=>{
  await openAccessReviews(page);await openEvidence(page);
 await expect(item(page,'Fixture tenant webhook')).toContainText('Needs change');
 await expect(item(page,'Fixture tenant webhook')).toContainText('Review webhook endpoint');
 await expect(section(page,'Evidence boundaries')).toContainText('application governance evidence only');
 });
 test('PARV-038 Restricted item is displayed as placeholder without decision buttons or metadata',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.api_keys.read')});await openEvidence(page);
 const restricted=detail(page).locator('.platform-access-reviews__item[data-restricted="true"]');
 await expect(restricted).toContainText('Restricted api keys evidence');
 await expect(restricted.getByRole('button',{name:'Approved'})).toHaveCount(0);
 await expect(restricted).not.toContainText('inventory:read');
 });
 test('PARV-039 Source permissions and operator identity redactions are independent',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.users.read')});await openEvidence(page);
 await expect(item(page,'Fixture tenant webhook')).not.toContainText('reviewer@fixture.test');
 await expect(item(page,'Fixture tenant webhook')).toContainText('Review webhook endpoint');
 });
 test('PARV-040 Item decision sends status and trimmed note to a scoped endpoint',async({page})=>{
  const sent:any[]=[];await openAccessReviews(page,{onCall:(m,u,q,b)=>{if(m==='POST'&&u.includes('/decision'))sent.push({u,b});}});
 await openEvidence(page);await item(page,'review-user@fixture.test (security)').getByPlaceholder('Decision note').fill('  Checked owner grants  ');
 await item(page,'review-user@fixture.test (security)').getByRole('button',{name:'Approved'}).click();
 await expect.poll(()=>sent.length).toBe(1);
 expect(sent[0]).toEqual({u:`${endpoint}/${reviewId}/items/${userItemId}/decision`,b:{status:'approved',decision_note:'Checked owner grants'}});
 });
 test('PARV-041 Pending captured items prevent completion while cancellation remains selectable',async({page})=>{
  await openAccessReviews(page);await openEvidence(page);
 await expect(detail(page).getByRole('button',{name:'Complete'})).toBeDisabled();
 await expect(detail(page).getByRole('button',{name:'Cancel'})).toBeEnabled();
 });
});

test.describe('Access Reviews — decisions, failures, immutability and evidence boundaries (BATCH_083_GENERATED_UNRUN)',()=>{
 test('PARV-042 Selected detail initial error shows Retry detail and no fabricated items',async({page})=>{
  await openAccessReviews(page,{responses:{[`GET ${endpoint}/${reviewId}`]:{status:503,json:{message:'Synthetic detail unavailable'}}}});
  await card(page,baseReview.title).getByRole('button',{name:'Open evidence'}).click();
  await expect(evidenceShell(page)).toContainText('Selected review could not be loaded.');await expect(evidenceShell(page).getByRole('button',{name:'Retry detail'})).toBeVisible();await expect(items(page)).toHaveCount(0);
 });
 test('PARV-043 Selected detail retry loads authorized source evidence',async({page})=>{
  let fail=true;await openAccessReviews(page,{respond:(m,p)=>m==='GET'&&p===`${endpoint}/${reviewId}`&&fail?{status:503,json:{message:'Transient detail failure'}}:undefined});
  await openEvidenceAfterError(page);fail=false;await evidenceShell(page).getByRole('button',{name:'Retry detail'}).click();
  await expect(item(page,'Fixture tenant webhook')).toBeVisible();await expect(detail(page)).toContainText('Available sources:');
 });
 test('PARV-044 Failed detail refresh preserves last displayed evidence without claiming success',async({page})=>{
  let fail=false;await openAccessReviews(page,{respond:(m,p)=>m==='GET'&&p===`${endpoint}/${reviewId}`&&fail?{status:503,json:{message:'Synthetic detail refresh failed'}}:undefined});
  await openEvidence(page);await expect(item(page,'Fixture tenant webhook')).toBeVisible();fail=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();await expect(item(page,'Fixture tenant webhook')).toBeVisible();
  await expect(root(page)).not.toContainText('Access review completed.');
 });
 test('PARV-045 Mixed scope distinguishes available and omitted source families',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.api_keys.read')});await openEvidence(page);
  await expect(detail(page)).toContainText('Omitted/restricted sources: Api keys');await expect(detail(page)).toContainText('Available sources:');
 });
 test('PARV-046 Single source review keeps evidence scope bounded to source',async({page})=>{
  await openAccessReviews(page,{query:'status=completed'});await card(page,doneReview.title).getByRole('button',{name:'Open evidence'}).click();
  await expect(detail(page)).toContainText('Available sources: Platform users');await expect(detail(page)).toContainText('Omitted/restricted sources: None');
 });
 test('PARV-047 Synthetic UI redaction is explicitly not proof of backend source authorization',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.api_keys.read')});await openEvidence(page);
  await expect(detail(page).locator('[data-restricted="true"]')).toContainText('Source evidence is restricted');
  await expect(section(page,'Evidence boundaries')).toContainText('application governance evidence only');
 });
 test('PARV-048 No users-read permission restricts registry creator identity',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.users.read')});
  await expect(card(page,baseReview.title)).toContainText('Creator identity restricted');await expect(card(page,baseReview.title)).not.toContainText('review-creator@fixture.test');
 });
 test('PARV-049 Selecting another review changes detail target without reusing prior selection',async({page})=>{
  const ids:string[]=[];await openAccessReviews(page,{onCall:(m,p)=>{if(m==='GET'&&p.startsWith(`${endpoint}/`))ids.push(p);}});
  await openEvidence(page);await filters(page).getByLabel('Status').selectOption('completed');await card(page,doneReview.title).getByRole('button',{name:'Open evidence'}).click();
  await expect(root(page)).toContainText(`Review evidence · ${doneReview.title}`);await expect.poll(()=>ids.at(-1)).toBe(`${endpoint}/${doneReview.id}`);
 });
 test('PARV-050 Create error retains draft and displays backend message',async({page})=>{
  await openAccessReviews(page,{responses:{[`POST ${endpoint}`]:{status:409,json:{message:'Synthetic review conflict'}}}});
  await form(page).getByLabel('Title').fill('Keep this review draft');await form(page).getByRole('button',{name:'Create review'}).click();
  await expect(root(page)).toContainText('Synthetic review conflict');await expect(form(page).getByLabel('Title')).toHaveValue('Keep this review draft');
 });
 test('PARV-051 Successful retry after create conflict clears error',async({page})=>{
  let n=0;await openAccessReviews(page,{respond:(m,p)=>m==='POST'&&p===endpoint&&++n===1?{status:409,json:{message:'Synthetic temporary conflict'}}:undefined});
  await form(page).getByLabel('Title').fill('Retry creation');await form(page).getByRole('button',{name:'Create review'}).click();
  await expect(root(page)).toContainText('Synthetic temporary conflict');await form(page).getByRole('button',{name:'Create review'}).click();
  await expect(root(page)).toContainText('Access review created.');await expect(root(page)).not.toContainText('Synthetic temporary conflict');
 });
 test('PARV-052 Create payload cannot inject actor or snapshot metadata from form',async({page})=>{
  let body:any;await openAccessReviews(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)body=b;}});
  await form(page).getByLabel('Title').fill('No actor override');await form(page).getByRole('button',{name:'Create review'}).click();
  await expect.poll(()=>body).toBeTruthy();expect(Object.keys(body).sort()).toEqual(['due_at','notes','scope','title']);
 });
 test('PARV-053 Notes are trimmed and transmitted as notes, not metadata',async({page})=>{
  let body:any;await openAccessReviews(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p===endpoint)body=b;}});
  await form(page).getByLabel('Title').fill('Safe notes');await form(page).getByLabel('Notes').fill('  Source reviewed  ');
  await form(page).getByRole('button',{name:'Create review'}).click();await expect.poll(()=>body?.notes).toBe('Source reviewed');expect(body.metadata).toBeUndefined();
 });
 test('PARV-054 One accepted item decision leaves other pending item open',async({page})=>{
  await openAccessReviews(page);await openEvidence(page);await item(page,'review-user@fixture.test (security)').getByRole('button',{name:'Approved'}).click();
  await expect(item(page,'review-user@fixture.test (security)')).toContainText('Approved');await expect(item(page,'Fixture tenant API key')).toContainText('Pending');
  await expect(detail(page).getByRole('button',{name:'Complete'})).toBeDisabled();
 });
 test('PARV-055 Approved mutation sends only decision and null note when blank',async({page})=>{
  const sent:any[]=[];await openAccessReviews(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.includes('/decision'))sent.push(b);}});
  await openEvidence(page);await item(page,'review-user@fixture.test (security)').getByRole('button',{name:'Approved'}).click();
  await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toEqual({status:'approved',decision_note:null});
 });
 test('PARV-056 Needs change modifies the selected item only',async({page})=>{
  await openAccessReviews(page);await openEvidence(page);await item(page,'review-user@fixture.test (security)').getByRole('button',{name:'Needs change'}).click();
  await expect(item(page,'review-user@fixture.test (security)')).toContainText('Needs change');await expect(item(page,'Fixture tenant API key')).toContainText('Pending');
 });
 test('PARV-057 Revoked is application decision evidence, not an actual external key revocation',async({page})=>{
  const paths:string[]=[];await openAccessReviews(page,{onCall:(m,p)=>{if(m==='POST')paths.push(p);}});await openEvidence(page);
  await item(page,'Fixture tenant API key').getByRole('button',{name:'Revoked'}).click();await expect(item(page,'Fixture tenant API key')).toContainText('Revoked');
  expect(paths).toEqual([`${endpoint}/${reviewId}/items/${keyItemId}/decision`]);await expect(section(page,'Evidence boundaries')).toContainText('does not independently prove');
 });
 test('PARV-058 Not applicable records one item while review remains open',async({page})=>{
  await openAccessReviews(page);await openEvidence(page);await item(page,'Fixture tenant API key').getByRole('button',{name:'Not applicable'}).click();
  await expect(item(page,'Fixture tenant API key')).toContainText('Not applicable');await expect(detail(page).getByRole('button',{name:'Cancel'})).toBeVisible();
 });
 test('PARV-059 Whitespace-only decision note becomes null',async({page})=>{
  const bodies:any[]=[];await openAccessReviews(page,{onCall:(m,p,q,b)=>{if(p.includes('/decision')&&m==='POST')bodies.push(b);}});await openEvidence(page);
  await item(page,'Fixture tenant API key').getByPlaceholder('Decision note').fill('   ');
  await item(page,'Fixture tenant API key').getByRole('button',{name:'Approved'}).click();await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0].decision_note).toBeNull();
 });
 test('PARV-060 Decision conflict displays feedback and keeps entered note',async({page})=>{
  await openAccessReviews(page,{responses:{[`POST ${endpoint}/${reviewId}/items/${userItemId}/decision`]:{status:409,json:{message:'Synthetic decision stale'}}}});await openEvidence(page);
  const target=item(page,'review-user@fixture.test (security)');await target.getByPlaceholder('Decision note').fill('Reconsider grant');await target.getByRole('button',{name:'Approved'}).click();
  await expect(root(page)).toContainText('Synthetic decision stale');await expect(target.getByPlaceholder('Decision note')).toHaveValue('Reconsider grant');
 });
 test('PARV-061 Retry failed decision sends same scoped item id',async({page})=>{
  let attempts=0;const posted:string[]=[];await openAccessReviews(page,{respond:(m,p)=>{if(m==='POST'&&p.includes('/decision')){posted.push(p);if(++attempts===1)return {status:409,json:{message:'Synthetic conflict'}};}return undefined;}});await openEvidence(page);
  const target=item(page,'review-user@fixture.test (security)');await target.getByRole('button',{name:'Approved'}).click();await expect(root(page)).toContainText('Synthetic conflict');
  await target.getByRole('button',{name:'Approved'}).click();await expect.poll(()=>posted.length).toBe(2);expect(posted[0]).toBe(posted[1]);
 });
 test('PARV-062 Read-only role does not expose or send decision POST',async({page})=>{
  const posted:string[]=[];await openAccessReviews(page,{permissions:without('platform.access_reviews.write'),onCall:(m,p)=>{if(m==='POST')posted.push(p);}});await openEvidence(page);
  await expect(detail(page).locator('.platform-access-reviews__decision-controls')).toHaveCount(0);expect(posted).toHaveLength(0);
 });
 test('PARV-063 Restricted source item has no mutation controls even with review write',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.api_keys.read')});await openEvidence(page);
  await expect(detail(page).locator('[data-restricted="true"] .platform-access-reviews__decision-controls')).toHaveCount(0);
 });
 test('PARV-064 Dismissing Complete confirmation keeps review open and posts nothing',async({page})=>{
  const posts:string[]=[];await openAccessReviews(page,{items:fixtureItems.map(i=>({...i,status:'approved'})),onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/complete'))posts.push(p);}});
  await openEvidence(page);page.once('dialog',dialog=>dialog.dismiss());await detail(page).getByRole('button',{name:'Complete'}).click();expect(posts).toHaveLength(0);
  await expect(detail(page).getByRole('button',{name:'Cancel'})).toBeVisible();
 });
 test('PARV-065 Complete posts empty body after all captured items are decided',async({page})=>{
  const bodies:any[]=[];await openAccessReviews(page,{items:fixtureItems.map(i=>({...i,status:'approved'})),onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/complete'))bodies.push({p,b});}});
  await openEvidence(page);page.once('dialog',dialog=>dialog.accept());await detail(page).getByRole('button',{name:'Complete'}).click();
  await expect.poll(()=>bodies.length).toBe(1);expect(bodies[0]).toEqual({p:`${endpoint}/${reviewId}/complete`,b:{}});
 });
 test('PARV-066 Successful Complete updates review status and removes decision controls',async({page})=>{
  await openAccessReviews(page,{items:fixtureItems.map(i=>({...i,status:'approved'}))});await openEvidence(page);page.once('dialog',dialog=>dialog.accept());
  await detail(page).getByRole('button',{name:'Complete'}).click();await expect(root(page)).toContainText('Access review completed.');
  await expect(detail(page).locator('.platform-access-reviews__decision-controls')).toHaveCount(0);
 });
 test('PARV-067 Complete conflict does not falsely mark review completed',async({page})=>{
  await openAccessReviews(page,{items:fixtureItems.map(i=>({...i,status:'approved'})),responses:{[`POST ${endpoint}/${reviewId}/complete`]:{status:409,json:{message:'Open items changed'}}}});
  await openEvidence(page);page.once('dialog',dialog=>dialog.accept());await detail(page).getByRole('button',{name:'Complete'}).click();
  await expect(root(page)).toContainText('Open items changed');await expect(detail(page).getByRole('button',{name:'Cancel'})).toBeVisible();
 });
 test('PARV-068 Dismissing Cancel confirmation does not issue POST',async({page})=>{
  const calls:string[]=[];await openAccessReviews(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/cancel'))calls.push(p);}});await openEvidence(page);
  page.once('dialog',dialog=>dialog.dismiss());await detail(page).getByRole('button',{name:'Cancel'}).click();expect(calls).toHaveLength(0);
 });
 test('PARV-069 Confirming Cancel posts the source-defined fixed reason',async({page})=>{
  const sent:any[]=[];await openAccessReviews(page,{onCall:(m,p,q,b)=>{if(m==='POST'&&p.endsWith('/cancel'))sent.push({p,b});}});await openEvidence(page);
  page.once('dialog',dialog=>dialog.accept());await detail(page).getByRole('button',{name:'Cancel'}).click();await expect.poll(()=>sent.length).toBe(1);
  expect(sent[0]).toEqual({p:`${endpoint}/${reviewId}/cancel`,b:{reason:'Cancelled from Platform Access Reviews workspace'}});
 });
 test('PARV-070 Cancel failure leaves review controls for operator',async({page})=>{
  await openAccessReviews(page,{responses:{[`POST ${endpoint}/${reviewId}/cancel`]:{status:503,json:{message:'Synthetic cancel failed'}}}});await openEvidence(page);
  page.once('dialog',dialog=>dialog.accept());await detail(page).getByRole('button',{name:'Cancel'}).click();
  await expect(root(page)).toContainText('Synthetic cancel failed');await expect(detail(page).getByRole('button',{name:'Cancel'})).toBeVisible();
 });
 test('PARV-071 Completed review is immutable in the frontend even with write grant',async({page})=>{
  await openAccessReviews(page,{query:'status=completed'});await card(page,doneReview.title).getByRole('button',{name:'Open evidence'}).click();
  await expect(detail(page).locator('.platform-access-reviews__decision-controls')).toHaveCount(0);
  await expect(detail(page).getByRole('button',{name:'Complete'})).toHaveCount(0);
 });
 test('PARV-072 Cancelled review offers no item mutations with write permission',async({page})=>{
  await openAccessReviews(page,{query:'status=cancelled'});await card(page,stoppedReview.title).getByRole('button',{name:'Open evidence'}).click();
  await expect(detail(page).locator('.platform-access-reviews__decision-controls')).toHaveCount(0);await expect(detail(page).getByRole('button',{name:'Cancel'})).toHaveCount(0);
 });
 test('PARV-073 Review notice identifies snapshot as historical application evidence',async({page})=>{
  await openAccessReviews(page);await openEvidence(page);await expect(section(page,'Evidence boundaries')).toContainText('application governance evidence only');
  await expect(detail(page)).toContainText('Available sources:');
 });
 test('PARV-074 Filtering review registry does not mutate selected detail',async({page})=>{
  const posts:string[]=[];await openAccessReviews(page,{onCall:(m,p)=>{if(m==='POST')posts.push(p);}});await openEvidence(page);
  await filters(page).getByLabel('Status').selectOption('completed');await expect(detail(page)).toContainText(baseReview.title);expect(posts).toHaveLength(0);
 });
 test('PARV-075 Refresh fetches both filtered registry and selected detail independently',async({page})=>{
  const calls:string[]=[];await openAccessReviews(page,{onCall:(m,p)=>{if(m==='GET')calls.push(p);}});await openEvidence(page);
  const before=calls.length;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.length).toBeGreaterThan(before);
  expect(calls.slice(before)).toContain(endpoint);expect(calls.slice(before)).toContain(`${endpoint}/${reviewId}`);
 });
 test('PARV-076 Item metadata displays at most eight nonempty entries',async({page})=>{
  const entry={...fixtureItems[0],metadata:Object.fromEntries(Array.from({length:12},(_,i)=>[`source_key_${i}`,i+1]))};
  await openAccessReviews(page,{items:[entry,...fixtureItems.slice(1)]});await openEvidence(page);
  await expect(item(page,entry.label).locator('.platform-access-reviews__metadata > div')).toHaveCount(8);
 });
 test('PARV-077 Nested metadata is shown as text, never parsed into live controls',async({page})=>{
  const entry={...fixtureItems[0],metadata:{nested:{signal:'synthetic source',scope:'unknown'}}};
  await openAccessReviews(page,{items:[entry,...fixtureItems.slice(1)]});await openEvidence(page);
  await expect(item(page,entry.label).locator('.platform-access-reviews__metadata')).toContainText('[object Object]');
  await expect(item(page,entry.label).locator('.platform-access-reviews__metadata button')).toHaveCount(0);
 });
 test('PARV-078 Withheld API source hides tenant identity inside restricted placeholder',async({page})=>{
  await openAccessReviews(page,{permissions:without('platform.api_keys.read')});await openEvidence(page);
  const restricted=detail(page).locator('[data-restricted="true"]');await expect(restricted).toContainText('Tenant identity restricted');
  await expect(restricted).not.toContainText('Fixture Alpha');
 });
 test('PARV-079 Unknown detail id is surfaced as load failure, not fabricated review',async({page})=>{
  await openAccessReviews(page,{rows:[{...baseReview,id:'a8200000-0000-4000-8000-999999999999',title:'Unknown evidence target'}],respond:(m,p)=>m==='GET'&&p===`${endpoint}/a8200000-0000-4000-8000-999999999999`?{status:404,json:{message:'Synthetic unknown id'}}:undefined});
  await card(page,'Unknown evidence target').getByRole('button',{name:'Open evidence'}).click();
  await expect(evidenceShell(page)).toContainText('Selected review could not be loaded.');await expect(items(page)).toHaveCount(0);
 });
 test('PARV-080 Phase 1 client fixture cannot assert durable ACL, tenant isolation, or external revocation',async({page})=>{
  await openAccessReviews(page);await expect(section(page,'Evidence boundaries')).toContainText('does not independently prove');
  await expect(section(page,'Evidence boundaries')).toContainText('external access was removed');
 });
 // Batch 165: source-backed registry, redaction and presentation boundaries; all scenarios unrun.
 test('PARV-081 Missing creator with users-read displays unavailable rather than restricted',async({page})=>{
  await openAccessReviews(page,{rows:[{...baseReview,created_by_email:null}]});
  await expect(card(page,baseReview.title)).toContainText('Creator unavailable');
  await expect(card(page,baseReview.title)).not.toContainText('Creator identity restricted');
 });
 test('PARV-082 Malformed registry creation timestamp uses Not recorded fallback',async({page})=>{
  await openAccessReviews(page,{rows:[{...baseReview,created_at:'not-an-iso-timestamp'}]});
  await expect(card(page,baseReview.title)).toContainText('created Not recorded');
 });
 test('PARV-083 Missing registry counters display zero pending and total rather than fabricated counts',async({page})=>{
  await openAccessReviews(page,{rows:[{...baseReview,pending_count:null,item_count:null} as any]});
  await expect(card(page,baseReview.title).locator('.platform-access-reviews__badges')).toContainText('0 pending / 0 total');
 });
 test('PARV-084 Review without a due date has no due-date badge',async({page})=>{
  await openAccessReviews(page,{rows:[{...baseReview,due_at:null}]});
  await expect(card(page,baseReview.title).locator('.platform-access-reviews__badges').getByText(/^Due /)).toHaveCount(0);
 });
 test('PARV-085 Registry request trims search while retaining operator URL search text',async({page})=>{
  const sent:string[]=[];await openAccessReviews(page,{query:'search=%20%20Privileged%20%20',onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)sent.push(q.get('search')||'');}});
  await expect.poll(()=>sent.at(-1)).toBe('Privileged');
  expect(new URL(page.url()).searchParams.get('search')).toBe('  Privileged  ');
 });
 test('PARV-086 Unknown page URL keys never reach access review backend query',async({page})=>{
  const seen:string[]=[];await openAccessReviews(page,{query:'status=open&debug_owner=private&limit=9999',onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)seen.push(q.toString());}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);
  const params=new URLSearchParams(seen.at(-1));
  expect(params.has('debug_owner')).toBe(false);expect(params.get('limit')).toBe('50');
 });
 test('PARV-087 Changing status preserves separate scope and search URL filters',async({page})=>{
  await openAccessReviews(page,{query:'scope=mixed&search=Fixture'});
  await filters(page).getByLabel('Status').selectOption('completed');
  const url=new URL(page.url());expect(url.searchParams.get('status')).toBe('completed');
  expect(url.searchParams.get('scope')).toBe('mixed');expect(url.searchParams.get('search')).toBe('Fixture');
 });
 test('PARV-088 Whitespace-only search is omitted from outbound evidence request',async({page})=>{
  const seen:string[]=[];await openAccessReviews(page,{query:'search=%20%20%20',onCall:(m,u,q)=>{if(m==='GET'&&u===endpoint)seen.push(q.toString());}});
  await expect.poll(()=>seen.length).toBeGreaterThan(0);
  expect(new URLSearchParams(seen.at(-1)).has('search')).toBe(false);
 });
 test('PARV-089 Item without tenant identity uses Platform-wide rather than an invented tenant',async({page})=>{
  await openAccessReviews(page);await openEvidence(page);
  await expect(item(page,fixtureItems[0].label)).toContainText('Platform-wide');
 });
 test('PARV-090 Metadata filters null and blank entries but retains numeric zero and boolean false',async({page})=>{
  const entry={...fixtureItems[0],metadata:{empty:'  ',nothing:null,zero_count:0,flagged:false,usable:'yes'}};
  await openAccessReviews(page,{items:[entry,...fixtureItems.slice(1)]});await openEvidence(page);
  const meta=item(page,entry.label).locator('.platform-access-reviews__metadata');
  await expect(meta.locator(':scope > div')).toHaveCount(3);
  await expect(meta).toContainText('Zero count');await expect(meta).toContainText('0');
  await expect(meta).toContainText('Flagged');await expect(meta).toContainText('false');
 });
 test('PARV-091 Timestamped decision without a name is labelled identity restricted',async({page})=>{
  const entry={...fixtureItems[0],status:'approved',decided_at:'2026-11-02T10:00:00Z',decided_by_email:null,decision_note:null};
  await openAccessReviews(page,{items:[entry,...fixtureItems.slice(1)]});await openEvidence(page);
  await expect(item(page,entry.label).locator('.platform-access-reviews__decision')).toContainText('Decision recorded · identity restricted');
 });
 test('PARV-092 Untrusted decision note is inert text rather than injected markup',async({page})=>{
  const text='<img src=x onerror=alert(1)> evidence';const entry={...fixtureItems[0],decision_note:text};
  await openAccessReviews(page,{items:[entry,...fixtureItems.slice(1)]});await openEvidence(page);
  const decision=item(page,entry.label).locator('.platform-access-reviews__decision');
  await expect(decision).toContainText(text);await expect(decision.locator('img')).toHaveCount(0);
 });
 test('PARV-093 Invalid registry due timestamp is labelled Not recorded instead of displayed as a date',async({page})=>{
  await openAccessReviews(page,{rows:[{...baseReview,due_at:'bad-date'}]});
  await expect(card(page,baseReview.title).locator('.platform-access-reviews__badges')).toContainText('Due Not recorded');
 });

});
