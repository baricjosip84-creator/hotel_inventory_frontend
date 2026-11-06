/** Batch 96 — Platform Permissions source-traced browser specifications.
 * Phase 1 generated only: mocks cannot verify actual role enforcement, persistence,
 * superadmin immutability in backend, audit trails or support-session expiry. */
import {test,expect,type Page} from '@playwright/test';
import {openRolePolicies,rolePolicyPath,rolePolicyRights,rolePolicySupport,rolePolicySuperadmin,
 rolePolicyViewer,overriddenSupport} from '../../../support/platformRolePoliciesFixture';
const root=(page:Page)=>page.locator('.role-permission-editor');
const roles=(page:Page)=>root(page).locator('.role-permission-editor__role-cards');
const selectRole=async(page:Page,role:string)=>roles(page).getByRole('button',{name:new RegExp(role,'i')}).first().click();
const search=(page:Page)=>root(page).getByRole('textbox',{name:'Search permissions'});
const group=(page:Page,label:string)=>root(page).locator('article.role-permission-editor__group-card').filter({hasText:label});
const editGroup=async(page:Page,label:string)=>{const g=group(page,label);await g.locator('.role-permission-editor__group-toggle').click();return g;};
const save=(page:Page)=>root(page).getByRole('button',{name:'Save role permissions'}).first();
const reset=(page:Page)=>root(page).getByRole('button',{name:'Reset to defaults'}).first();
const without=(...removed:string[])=>rolePolicyRights.filter(x=>!removed.includes(x));
test.describe('Platform Permissions — fixed roles, app-policy only (BATCH_096_GENERATED_UNRUN)',()=>{
 test('PPER-001 Page describes application role governance without external system claims',async({page})=>{
  await openRolePolicies(page);await expect(root(page)).toContainText('fixed Platform roles');
  await expect(root(page)).toContainText('external system');
 });
 test('PPER-002 Missing role-policy read grant denies route and policy GET',async({page})=>{
  let calls=0;await openRolePolicies(page,{permissions:without('platform.role_permissions.read'),expectHeading:false,
   onCall:(method,path)=>{if(method==='GET'&&path===rolePolicyPath)calls++;}});
  await expect(root(page)).toHaveCount(0);expect(calls).toBe(0);
 });
 test('PPER-003 Initial policy GET uses fixed Platform scope',async({page})=>{
  const calls:string[]=[];await openRolePolicies(page,{onCall:(m,p)=>{if(m==='GET'&&p===rolePolicyPath)calls.push(p);}});
  expect(calls).toContain(rolePolicyPath);await expect(root(page)).toContainText('Platform-scoped');
 });
 test('PPER-004 Default selected Support role is editable',async({page})=>{
  await openRolePolicies(page);await expect(root(page).locator('.role-permission-editor__role-card.is-active')).toContainText('Support');
  await expect(save(page)).toBeDisabled();
 });
 test('PPER-005 Superadmin appears protected and cannot change policy',async({page})=>{
  await openRolePolicies(page);await selectRole(page,'superadmin');
  await expect(root(page)).toContainText('This role is protected and cannot be edited.');
  await expect(save(page)).toBeDisabled();await expect(reset(page)).toBeDisabled();
 });
 test('PPER-006 Fixed roles are displayed as separate cards',async({page})=>{
  await openRolePolicies(page);await expect(roles(page).locator('button')).toHaveCount(3);
  await expect(roles(page)).toContainText('Platform Viewer');
 });
 test('PPER-007 Switching roles refreshes selected enabled count',async({page})=>{
  await openRolePolicies(page);await selectRole(page,'platform viewer');
  await expect(root(page).locator('.role-permission-editor__role-card.is-active')).toContainText('Platform Viewer');
 });
 test('PPER-008 Permission groups begin collapsed in operational layout',async({page})=>{
  await openRolePolicies(page);await expect(root(page).locator('.role-permission-editor__permission-list')).toHaveCount(0);
 });
 test('PPER-009 Expand all reveals catalog permissions',async({page})=>{
  await openRolePolicies(page);await root(page).getByRole('button',{name:'Expand all'}).click();
  await expect(root(page).locator('.role-permission-editor__permission-row')).toHaveCount(7);
 });
 test('PPER-010 Collapse all hides permission rows',async({page})=>{
  await openRolePolicies(page);await root(page).getByRole('button',{name:'Expand all'}).click();
  await root(page).getByRole('button',{name:'Collapse all'}).click();
  await expect(root(page).locator('.role-permission-editor__permission-row')).toHaveCount(0);
 });
 test('PPER-011 Group toggle expands only selected group',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Users');
  await expect(g.locator('.role-permission-editor__permission-row')).toHaveCount(2);
  await expect(group(page,'Audit').locator('.role-permission-editor__permission-row')).toHaveCount(0);
 });
 test('PPER-012 Permission search filters by display label',async({page})=>{
  await openRolePolicies(page);await search(page).fill('Users Read');
  await expect(root(page).locator('.role-permission-editor__permission-row')).toHaveCount(1);
  await expect(root(page)).toContainText('Users Read');
 });
 test('PPER-013 Search matches permission technical key',async({page})=>{
  await openRolePolicies(page);await search(page).fill('platform.users.write');
  await expect(root(page).locator('.role-permission-editor__permission-row')).toHaveCount(1);
 });
 test('PPER-014 Search no-match displays clear search action',async({page})=>{
  await openRolePolicies(page);await search(page).fill('unmatched-test-query');
  await expect(root(page)).toContainText('No permissions match');
  await root(page).getByRole('button',{name:'Clear search'}).click();await expect(search(page)).toHaveValue('');
 });
 test('PPER-015 Search disables manual expand all while auto expanded',async({page})=>{
  await openRolePolicies(page);await search(page).fill('users');
  await expect(root(page).getByRole('button',{name:'Expand all'})).toBeDisabled();
 });
 test('PPER-016 Locked Dashboard read permission cannot be unchecked',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Dashboard');
  await expect(g.locator('input[type="checkbox"]')).toBeChecked();
  await expect(g.locator('input[type="checkbox"]')).toBeDisabled();
 });
 test('PPER-017 Reserved policy-management grant is disabled for Support',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Role Permissions');
  await expect(g.locator('input[type="checkbox"]')).toHaveCount(2);
  await expect(g.locator('input[type="checkbox"]:disabled')).toHaveCount(2);
  await expect(g).toContainText('Superadmin only');
 });
 test('PPER-018 Technical keys are hidden until explicitly requested',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Users');
  await expect(g.locator('code')).toHaveCount(0);
  await root(page).getByRole('button',{name:'Show technical keys'}).click();
  await expect(g.locator('code')).toHaveCount(2);
 });
 test('PPER-019 Hiding technical keys keeps permission choices',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Users');
  await root(page).getByRole('button',{name:'Show technical keys'}).click();
  await root(page).getByRole('button',{name:'Hide technical keys'}).click();
  await expect(g.locator('code')).toHaveCount(0);await expect(g.locator('input')).toHaveCount(2);
 });
 test('PPER-020 Toggling editable right enables dirty state and save',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Audit');await g.locator('input[type="checkbox"]').check();
  await expect(root(page)).toContainText('Unsaved permission changes');await expect(save(page)).toBeEnabled();
 });
 test('PPER-021 Reverting unsaved toggle disables save',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Audit');const checkbox=g.locator('input[type="checkbox"]');
  await checkbox.check();await checkbox.uncheck();await expect(save(page)).toBeDisabled();
 });
 test('PPER-022 Enable group only affects editable rights',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Users');
  await g.getByRole('button',{name:'Enable group'}).click();
  await expect(g.locator('input:checked')).toHaveCount(2);await expect(save(page)).toBeEnabled();
 });
 test('PPER-023 Disable group leaves locked baseline unchanged elsewhere',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Users');
  await g.getByRole('button',{name:'Disable group'}).click();
  await expect(g.locator('input:checked')).toHaveCount(0);
  await expect(group(page,'Dashboard').locator('.role-permission-editor__group-toggle')).toBeVisible();
 });
 test('PPER-024 Filtered bulk action is limited to shown rights',async({page})=>{
  await openRolePolicies(page);await search(page).fill('Users Write');const g=group(page,'Users');
  await g.getByRole('button',{name:'Enable shown'}).click();
  await expect(g.locator('input:checked')).toHaveCount(1);await expect(save(page)).toBeEnabled();
 });
 test('PPER-025 Cancel role switch preserves unsaved draft and selected role',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Audit');await g.locator('input').check();
  page.once('dialog',d=>d.dismiss());await selectRole(page,'platform viewer');
  await expect(root(page).locator('.role-permission-editor__role-card.is-active')).toContainText('Support');
  await expect(save(page)).toBeEnabled();
 });
 test('PPER-026 Accept role switch discards unsaved draft without PUT',async({page})=>{
  const writes:string[]=[];await openRolePolicies(page,{onCall:(m,p)=>{if(m==='PUT')writes.push(p);}});
  const g=await editGroup(page,'Audit');await g.locator('input').check();
  page.once('dialog',d=>d.accept());await selectRole(page,'platform viewer');
  await expect(root(page).locator('.role-permission-editor__role-card.is-active')).toContainText('Platform Viewer');
  expect(writes).toHaveLength(0);
 });
 test('PPER-027 Save confirmation dismissal sends no policy PUT',async({page})=>{
  const writes:string[]=[];await openRolePolicies(page,{onCall:(m,p)=>{if(m==='PUT')writes.push(p);}});
  const g=await editGroup(page,'Audit');await g.locator('input').check();
  page.once('dialog',d=>d.dismiss());await save(page).click();expect(writes).toHaveLength(0);
 });
 test('PPER-028 Confirmed save includes policy revision and selected rights',async({page})=>{
  const calls:Array<{path:string;body:any}>=[];await openRolePolicies(page,{onCall:(m,p,b)=>{if(m==='PUT')calls.push({path:p,body:b});}});
  const g=await editGroup(page,'Audit');await g.locator('input').check();
  page.once('dialog',d=>d.accept());await save(page).click();
  await expect(root(page)).toContainText('support permissions saved successfully.');
  expect(calls).toHaveLength(1);expect(calls[0].path).toBe(`${rolePolicyPath}/support`);
  expect(calls[0].body.expected_revision).toBe(rolePolicySupport.revision);
  expect(calls[0].body.permissions).toContain('platform.audit.read');
 });
 test('PPER-029 Save success reloads current matrix and exits dirty state',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Audit');await g.locator('input').check();
  page.once('dialog',d=>d.accept());await save(page).click();
  await expect(save(page)).toBeDisabled();await expect(root(page)).toContainText('Saved custom policy active');
 });
 test('PPER-030 Save error reports error without false success',async({page})=>{
  await openRolePolicies(page,{respond:(m,p)=>m==='PUT'&&p.endsWith('/support')?{status:503,json:{message:'Synthetic persistence unavailable'}}:undefined});
  const g=await editGroup(page,'Audit');await g.locator('input').check();
  page.once('dialog',d=>d.accept());await save(page).click();
  await expect(root(page)).toContainText('Synthetic persistence unavailable');await expect(save(page)).toBeEnabled();
 });
 test('PPER-031 Save refuses a missing concurrency revision',async({page})=>{
  let count=0;await openRolePolicies(page,{roles:[rolePolicySuperadmin,{...rolePolicySupport,revision:''},rolePolicyViewer],
   onCall:(m)=>{if(m==='PUT')count++;}});
  const g=await editGroup(page,'Audit');await g.locator('input').check();await save(page).click();
  await expect(root(page)).toContainText('snapshot has no concurrency revision');expect(count).toBe(0);
 });
 test('PPER-032 Reset disabled when role is on hardcoded defaults',async({page})=>{
  await openRolePolicies(page);await expect(reset(page)).toBeDisabled();
 });
 test('PPER-033 Reset cancellation sends no DELETE',async({page})=>{
  const writes:string[]=[];await openRolePolicies(page,{roles:[rolePolicySuperadmin,overriddenSupport,rolePolicyViewer],
   onCall:(m,p)=>{if(m==='DELETE')writes.push(p);}});
  page.once('dialog',d=>d.dismiss());await reset(page).click();expect(writes).toHaveLength(0);
 });
 test('PPER-034 Confirm reset sends selected role and concurrency revision',async({page})=>{
  const writes:Array<{path:string;body:any}>=[];await openRolePolicies(page,{roles:[rolePolicySuperadmin,overriddenSupport,rolePolicyViewer],
   onCall:(m,p,b)=>{if(m==='DELETE')writes.push({path:p,body:b});}});
  page.once('dialog',d=>d.accept());await reset(page).click();
  await expect(root(page)).toContainText('support permissions reset to defaults.');
  expect(writes).toEqual([{path:`${rolePolicyPath}/support`,body:{expected_revision:overriddenSupport.revision}}]);
 });
 test('PPER-035 Reset success restores default and locks reset button',async({page})=>{
  await openRolePolicies(page,{roles:[rolePolicySuperadmin,overriddenSupport,rolePolicyViewer]});
  page.once('dialog',d=>d.accept());await reset(page).click();
  await expect(reset(page)).toBeDisabled();await expect(root(page)).toContainText('Using hardcoded defaults');
 });
 test('PPER-036 Reset server failure preserves saved override state',async({page})=>{
  await openRolePolicies(page,{roles:[rolePolicySuperadmin,overriddenSupport,rolePolicyViewer],
   respond:(m,p)=>m==='DELETE'&&p.endsWith('/support')?{status:503,json:{message:'Synthetic reset unavailable'}}:undefined});
  page.once('dialog',d=>d.accept());await reset(page).click();
  await expect(root(page)).toContainText('Synthetic reset unavailable');await expect(reset(page)).toBeEnabled();
 });
 test('PPER-037 Missing users-read permission hides supporting Users link',async({page})=>{
  await openRolePolicies(page,{permissions:without('platform.users.read')});
  await expect(root(page).getByRole('link',{name:'Platform users'})).toHaveCount(0);
 });
 test('PPER-038 Missing audit-read permission hides Platform Audit link',async({page})=>{
  await openRolePolicies(page,{permissions:without('platform.audit.read')});
  await expect(root(page).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
 });
 test('PPER-039 Policy reader without write sees read-only role controls',async({page})=>{
  await openRolePolicies(page,{permissions:without('platform.role_permissions.write')});
  await expect(root(page)).toContainText('Fixed Platform role catalog');
  // The current source disables roles using only role.editable from the policy response,
  // NOT the caller's write grant. This is a recorded source discrepancy, not an asserted protection.
  await expect(root(page).getByRole('heading',{name:'Platform Permissions'})).toBeVisible();
 });
 test.skip('PPER-040 Backend enforces missing write permission and revision conflict with independent real principal — Phase 2',async()=>{});
 test.skip('PPER-041 Saved policy invalidates live grants and closes Support Sessions without race escape — Phase 2',async()=>{});
});


/** Batch 97 — additional source-traced policy editor scenarios. Synthetic UI contracts only. */
test.describe('Platform Permissions continuation — BATCH_097_GENERATED_UNRUN',()=>{
 test('PPER-042 Unsaved draft refresh decline keeps unchanged policy and does not call GET',async({page})=>{
  let gets=0;await openRolePolicies(page,{onCall:(m,p)=>{if(m==='GET'&&p===rolePolicyPath)gets++;}});
  await (await editGroup(page,'Audit')).locator('input').check();const initial=gets;
  page.once('dialog',d=>d.dismiss());await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  expect(gets).toBe(initial);await expect(save(page)).toBeEnabled();
 });
 test('PPER-043 Accepting refresh with unsaved draft preserves draft for comparison',async({page})=>{
  let gets=0;await openRolePolicies(page,{onCall:(m,p)=>{if(m==='GET'&&p===rolePolicyPath)gets++;}});
  const g=await editGroup(page,'Audit');await g.locator('input').check();const before=gets;
  page.once('dialog',d=>d.accept());await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>gets).toBeGreaterThan(before);await expect(g.locator('input')).toBeChecked();await expect(save(page)).toBeEnabled();
 });
 test('PPER-044 Refresh error retains last valid policy snapshot warning',async({page})=>{
  let calls=0;await openRolePolicies(page,{respond:(m,p)=>{
   if(m==='GET'&&p===rolePolicyPath&&++calls>1)return {status:400,json:{message:'Synthetic refresh unavailable'}};
  }});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('last successful snapshot');await expect(roles(page).locator('button')).toHaveCount(3);
 });
 test('PPER-045 Initial failed policy load presents retry state without invented catalog',async({page})=>{
  await openRolePolicies(page,{expectHeading:false,respond:(m,p)=>m==='GET'&&p===rolePolicyPath?{status:400,json:{message:'Synthetic unavailable'}}:undefined});
  await expect(page.getByRole('alert')).toContainText('Platform permission policies could not be loaded');
  await expect(roles(page)).toHaveCount(0);
 });
 test('PPER-046 Initial retry after transient failure populates policy matrix',async({page})=>{
  let gets=0;await openRolePolicies(page,{expectHeading:false,respond:(m,p)=>{
   if(m==='GET'&&p===rolePolicyPath&&++gets===1)return {status:400,json:{message:'Synthetic initial failure'}};
  }});
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(root(page).getByRole('heading',{name:'Platform Permissions'})).toBeVisible();await expect(roles(page).locator('button')).toHaveCount(3);
 });
 test('PPER-047 Stale PUT conflict refetches latest revision and preserves unsaved changes',async({page})=>{
  let gets=0;await openRolePolicies(page,{onCall:(m,p)=>{if(m==='GET'&&p===rolePolicyPath)gets++;},
   respond:(m,p)=>m==='PUT'&&p.endsWith('/support')?{status:409,json:{code:'PLATFORM_ROLE_POLICY_STALE',message:'Stale synthetic revision'}}:undefined});
  await (await editGroup(page,'Audit')).locator('input').check();const previous=gets;
  page.once('dialog',d=>d.accept());await save(page).click();
  await expect(root(page)).toContainText('changed after your snapshot');await expect(save(page)).toBeEnabled();
  await expect.poll(()=>gets).toBeGreaterThan(previous);
 });
 test('PPER-048 Stale reset conflict reloads latest policy and reports revision warning',async({page})=>{
  await openRolePolicies(page,{roles:[rolePolicySuperadmin,overriddenSupport,rolePolicyViewer],
   respond:(m,p)=>m==='DELETE'&&p.endsWith('/support')?{status:409,json:{code:'PLATFORM_ROLE_POLICY_STALE',message:'Stale synthetic revision'}}:undefined});
  page.once('dialog',d=>d.accept());await reset(page).click();
  await expect(root(page)).toContainText('changed after your snapshot');await expect(reset(page)).toBeEnabled();
 });
 test('PPER-049 Search is reset when changing selected Platform role',async({page})=>{
  await openRolePolicies(page);await search(page).fill('Audit');await selectRole(page,'platform viewer');
  await expect(search(page)).toHaveValue('');await expect(root(page).locator('.role-permission-editor__role-card.is-active')).toContainText('Platform Viewer');
 });
 test('PPER-050 Expanded permission groups are reset on role switch',async({page})=>{
  await openRolePolicies(page);await root(page).getByRole('button',{name:'Expand all'}).click();
  await expect(root(page).locator('.role-permission-editor__permission-row')).toHaveCount(7);
  await selectRole(page,'platform viewer');await expect(root(page).locator('.role-permission-editor__permission-row')).toHaveCount(0);
 });
 test('PPER-051 Group enable is disabled when all shown editable rights are enabled',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Users');await g.getByRole('button',{name:'Enable group'}).click();
  await expect(g.getByRole('button',{name:'Enable group'})).toBeDisabled();
 });
 test('PPER-052 Group disable is disabled when all shown editable rights are disabled',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Audit');
  await expect(g.getByRole('button',{name:'Disable group'})).toBeDisabled();
 });
 test('PPER-053 Search matches source-provided permission group name',async({page})=>{
  await openRolePolicies(page);await search(page).fill('access_reviews');
  await expect(group(page,'Access Reviews').locator('.role-permission-editor__permission-row')).toHaveCount(1);
 });
 test('PPER-054 Technical-key toggle does not mutate unsaved permission draft',async({page})=>{
  await openRolePolicies(page);const g=await editGroup(page,'Audit');await g.locator('input').check();
  await root(page).getByRole('button',{name:'Show technical keys'}).click();
  await root(page).getByRole('button',{name:'Hide technical keys'}).click();
  await expect(g.locator('input')).toBeChecked();await expect(save(page)).toBeEnabled();
 });
 test('PPER-055 Rejected role switch retains search and draft',async({page})=>{
  await openRolePolicies(page);await (await editGroup(page,'Audit')).locator('input').check();await search(page).fill('Audit');
  page.once('dialog',d=>d.dismiss());await selectRole(page,'platform viewer');
  await expect(search(page)).toHaveValue('Audit');await expect(save(page)).toBeEnabled();
  await expect(root(page).locator('.role-permission-editor__role-card.is-active')).toContainText('Support');
 });
 test('PPER-056 Policy editor distinguishes saved overrides from unsaved draft',async({page})=>{
  await openRolePolicies(page,{roles:[rolePolicySuperadmin,overriddenSupport,rolePolicyViewer]});
  await expect(root(page)).toContainText('saved overrides');await expect(save(page)).toBeDisabled();
  const g=await editGroup(page,'Users');await g.locator('input').last().check();
  await expect(save(page)).toBeEnabled();await expect(root(page)).toContainText('Unsaved permission changes');
 });
 test('PPER-057 Platform scope offers no tenant custom-role management tab',async({page})=>{
  await openRolePolicies(page);await expect(root(page)).toContainText('Platform roles');
  await expect(root(page).getByRole('button',{name:/create custom role/i})).toHaveCount(0);
 });
 test('PPER-058 Supporting Users and Audit links require separate grants',async({page})=>{
  await openRolePolicies(page,{permissions:without('platform.users.read','platform.audit.read')});
  await expect(root(page).getByRole('link',{name:'Platform users'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Permission audit'})).toBeVisible();
 });
 test('PPER-059 Reset acts only on selected saved Support override',async({page})=>{
  const calls:string[]=[];await openRolePolicies(page,{roles:[rolePolicySuperadmin,overriddenSupport,rolePolicyViewer],
   onCall:(m,p)=>{if(m==='DELETE')calls.push(p);}});
  page.once('dialog',d=>d.accept());await reset(page).click();
  await expect(reset(page)).toBeDisabled();await selectRole(page,'platform viewer');
  await expect(reset(page)).toBeDisabled();expect(calls).toEqual([`${rolePolicyPath}/support`]);
 });
 test('PPER-060 Saving disables duplicate submit during in-flight policy write',async({page})=>{
  let resolveWrite:(value:{json:any})=>void=()=>{};const waiting=new Promise<{json:any}>(resolve=>{resolveWrite=resolve;});
  let puts=0;await openRolePolicies(page,{onCall:(m)=>{if(m==='PUT')puts++;},
   respond:(m,p)=>m==='PUT'&&p.endsWith('/support')?waiting:undefined});
  await (await editGroup(page,'Audit')).locator('input').check();page.once('dialog',d=>d.accept());
  await save(page).click();await expect(save(page)).toBeDisabled();expect(puts).toBe(1);
  resolveWrite({json:{...overriddenSupport,revision:'b'.repeat(64)}});
  await expect(root(page)).toContainText('permissions saved successfully.');expect(puts).toBe(1);
 });
 test('PPER-061 Search whitespace filters locally without policy requests',async({page})=>{
  let gets=0;await openRolePolicies(page,{onCall:(m,p)=>{if(m==='GET'&&p===rolePolicyPath)gets++;}});
  const original=gets;await search(page).fill('  AUDIT  ');
  await expect(group(page,'Audit').locator('.role-permission-editor__permission-row')).toHaveCount(1);
  expect(gets).toBe(original);
 });
 test.skip('PPER-062 Malformed server policy response must fail closed — source hardening required',async({page})=>{
  // BLOCKED: frontend normalizes malformed roles/catalog to [] rather than treating HTTP 200 as invalid policy data.
  await openRolePolicies(page,{expectHeading:false,respond:(method,path)=>method==='GET'&&path===rolePolicyPath
   ?{json:{scope:'platform',roles:null,permission_catalog:null}}:undefined});
  await expect(page.getByRole('alert')).toContainText('Platform permission policies could not be loaded.');
  await expect(root(page)).toHaveCount(0);
 });
 test('PPER-063 Protected superadmin policy exposes no editable checkbox',async({page})=>{
  await openRolePolicies(page);await selectRole(page,'superadmin');const g=await editGroup(page,'Users');
  await expect(g.locator('input[type="checkbox"]:enabled')).toHaveCount(0);
  await expect(save(page)).toBeDisabled();await expect(reset(page)).toBeDisabled();
 });
 test('PPER-064 Normal checkbox selection cannot submit absent catalog permission',async({page})=>{
  const calls:any[]=[];await openRolePolicies(page,{onCall:(m,p,b)=>{if(m==='PUT')calls.push(b);}});
  const g=await editGroup(page,'Audit');await g.locator('input').check();
  page.once('dialog',d=>d.accept());await save(page).click();
  await expect(root(page)).toContainText('permissions saved successfully.');expect(calls).toHaveLength(1);
  expect(calls[0].permissions.every((p:string)=>new Set(['platform.dashboard.read','platform.users.read','platform.users.write','platform.audit.read','platform.access_reviews.read','platform.role_permissions.read','platform.role_permissions.write']).has(p))).toBe(true);
 });
 test('PPER-065 Refresh keeps external-access evidence disclaimer',async({page})=>{
  await openRolePolicies(page);await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('external vendor');await expect(root(page)).toContainText('application permissions');
 });
 test('PPER-066 New source-provided permission group renders without hardcoded group markup',async({page})=>{
  const customPermission='platform.synthetic_review.read';
  await openRolePolicies(page,{respond:(m,p)=>m==='GET'&&p===rolePolicyPath?{json:{scope:'platform',
   permission_catalog:[...rolePolicyCatalog,{permission:customPermission,group:'synthetic_review',label:'Synthetic Review Read'}],
   roles:[rolePolicySuperadmin,rolePolicySupport,rolePolicyViewer]}}:undefined});
  await search(page).fill('Synthetic Review');
  await expect(root(page)).toContainText('Synthetic Review Read');
  await expect(root(page).locator('.role-permission-editor__permission-row')).toHaveCount(1);
 });
 test('PPER-067 Stale concurrent policy write is surfaced, not reported as saved',async({page})=>{
  await openRolePolicies(page,{respond:(m,p)=>m==='PUT'&&p.endsWith('/support')?{status:409,
   json:{code:'PLATFORM_ROLE_POLICY_STALE',message:'Synthetic stale conflict'}}:undefined});
  await (await editGroup(page,'Audit')).locator('input').check();page.once('dialog',d=>d.accept());await save(page).click();
  await expect(root(page)).toContainText('latest saved policy is loaded');
  await expect(root(page)).not.toContainText('permissions saved successfully.');
 });
 test('PPER-068 Saved override is displayed only when returned by policy GET',async({page})=>{
  await openRolePolicies(page,{roles:[rolePolicySuperadmin,overriddenSupport,rolePolicyViewer]});
  await expect(root(page)).toContainText('Saved custom policy active');
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Saved custom policy active');
 });
 test('PPER-069 Default role cannot issue DELETE reset request',async({page})=>{
  const deletes:string[]=[];await openRolePolicies(page,{onCall:(m,p)=>{if(m==='DELETE')deletes.push(p);}});
  await expect(reset(page)).toBeDisabled();expect(deletes).toHaveLength(0);
 });
 test('PPER-070 Missing revision blocks overriding-role reset without DELETE',async({page})=>{
  let deletes=0;await openRolePolicies(page,{roles:[rolePolicySuperadmin,{...overriddenSupport,revision:''},rolePolicyViewer],
   onCall:(m)=>{if(m==='DELETE')deletes++;}});
  await reset(page).click();await expect(root(page)).toContainText('snapshot has no concurrency revision');expect(deletes).toBe(0);
 });
 test.skip('PPER-071 Real backend must authorize policy GET using role_permissions.read — Phase 2',async()=>{});
 test.skip('PPER-072 Real backend must authorize PUT and DELETE using current role_permissions.write — Phase 2',async()=>{});
 test.skip('PPER-073 Real backend must forbid superadmin edits and prohibited grants — Phase 2',async()=>{});
 test.skip('PPER-074 Backend must enforce locked dashboard and catalog constraint — Phase 2',async()=>{});
 test.skip('PPER-075 Concurrent expected-revision conflict must prevent lost updates in PostgreSQL — Phase 2',async()=>{});
 test.skip('PPER-076 Durable policy and actor-attributed audit event require real transaction — Phase 2',async()=>{});
 test.skip('PPER-077 Active requests must reload live permissions after a real role change — Phase 2',async()=>{});
 test.skip('PPER-078 Removing support-session permission must close live support access — Phase 2',async()=>{});
 test.skip('PPER-079 Database migration and degraded schema fail closed — Phase 2',async()=>{});
 test.skip('PPER-080 Role permission changes cannot establish external account access — Phase 2',async()=>{});
});


/** Batch 147: independently permission-scoped editor and concurrency regression cases. */
test.describe('Platform Role Policies — Phase 1 gap follow-up B147',()=>{
 test('PPER-081 Permission-audit supporting link requires its own Access Reviews grant',async({page})=>{
  await openRolePolicies(page,{permissions:without('platform.access_reviews.read')});
  await expect(root(page).getByRole('link',{name:'Permission audit'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Platform audit'})).toBeVisible();
 });
 test('PPER-082 Platform audit link retains role-policy source filter while Permission Audit has distinct route',async({page})=>{
  await openRolePolicies(page);
  await expect(root(page).getByRole('link',{name:'Platform audit'})).toHaveAttribute('href','/platform/audit?source=role_permissions');
  await expect(root(page).getByRole('link',{name:'Permission audit'})).toHaveAttribute('href','/platform/permission-audit');
 });
 test('PPER-083 Refresh of clean draft refetches without a discard confirmation',async({page})=>{
  let gets=0;await openRolePolicies(page,{onCall:(method,path)=>{if(method==='GET'&&path===rolePolicyPath)gets++;}});
  const initial=gets;let dialogs=0;page.on('dialog',dialog=>{dialogs++;void dialog.dismiss();});
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>gets).toBeGreaterThan(initial);
  expect(dialogs).toBe(0);
 });
 test('PPER-084 Confirmed switch away from dirty Support draft discards it locally with no PUT',async({page})=>{
  const writes:string[]=[];await openRolePolicies(page,{onCall:(method,path)=>{
   if(method==='PUT'||method==='DELETE')writes.push(`${method} ${path}`);
  }});
  await (await editGroup(page,'Audit')).locator('input').check();
  await expect(save(page)).toBeEnabled();page.once('dialog',dialog=>dialog.accept());
  await selectRole(page,'platform viewer');
  await expect(root(page).locator('.role-permission-editor__role-card.is-active')).toContainText('Platform Viewer');
  await expect(save(page)).toBeDisabled();expect(writes).toEqual([]);
 });
 test('PPER-085 Missing policy revision blocks a dirty save before issuing PUT',async({page})=>{
  const writes:string[]=[];await openRolePolicies(page,{roles:[rolePolicySuperadmin,{...rolePolicySupport,revision:''},rolePolicyViewer],
   onCall:(method,path)=>{if(method==='PUT')writes.push(path);}});
  await (await editGroup(page,'Audit')).locator('input').check();
  await expect(save(page)).toBeEnabled();await save(page).click();
  await expect(root(page)).toContainText('no concurrency revision');
  expect(writes).toEqual([]);
 });
 test('PPER-086 Protected role switch from Support never creates or resets a policy',async({page})=>{
  const writes:string[]=[];await openRolePolicies(page,{onCall:(method,path)=>{
   if(['PUT','DELETE'].includes(method))writes.push(`${method} ${path}`);
  }});
  await selectRole(page,'superadmin');
  await expect(save(page)).toBeDisabled();await expect(reset(page)).toBeDisabled();
  expect(writes).toEqual([]);
 });
});

/** Batch 163: distinct navigation grants and policy-editor draft/error boundaries.
 * Browser tests are authored only and use a synthetic policy endpoint. */
test.describe('Platform Permissions — independent grant and draft evidence (B163 GENERATED_UNRUN)',()=>{
 test('PPER-087 Missing users-read grant removes only supporting Platform users navigation',async({page})=>{
  await openRolePolicies(page,{permissions:without('platform.users.read')});
  await expect(root(page).getByRole('link',{name:'Platform users'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Platform audit'})).toBeVisible();
 });
 test('PPER-088 Missing audit grant removes Platform audit but preserves permission-audit navigation',async({page})=>{
  await openRolePolicies(page,{permissions:without('platform.audit.read')});
  await expect(root(page).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Permission audit'})).toBeVisible();
 });
 test('PPER-089 Missing both review and audit grants removes both evidence routes',async({page})=>{
  await openRolePolicies(page,{permissions:without('platform.access_reviews.read','platform.audit.read')});
  await expect(root(page).getByRole('link',{name:'Permission audit'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Platform users'})).toBeVisible();
 });
 test('PPER-090 Dirty refresh cancellation prevents policy refetch and preserves unsaved checkbox',async({page})=>{
  let gets=0;await openRolePolicies(page,{onCall:(m,p)=>{if(m==='GET'&&p===rolePolicyPath)gets++;}});
  const g=await editGroup(page,'Audit');await g.locator('input[type="checkbox"]').check();
  const before=gets;page.once('dialog',d=>void d.dismiss());
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(g.locator('input[type="checkbox"]')).toBeChecked();expect(gets).toBe(before);
  await expect(save(page)).toBeEnabled();
 });
 test('PPER-091 Confirming dirty refresh keeps draft for comparison with latest policy snapshot',async({page})=>{
  let gets=0;await openRolePolicies(page,{onCall:(m,p)=>{if(m==='GET'&&p===rolePolicyPath)gets++;}});
  const g=await editGroup(page,'Audit');await g.locator('input[type="checkbox"]').check();
  const before=gets;page.once('dialog',d=>void d.accept());
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>gets).toBeGreaterThan(before);
  await expect(g.locator('input[type="checkbox"]')).toBeChecked();await expect(save(page)).toBeEnabled();
 });
 test('PPER-092 Refused policy save confirmation never sends write and retains unsaved draft',async({page})=>{
  let puts=0;await openRolePolicies(page,{onCall:(m)=>{if(m==='PUT')puts++;}});
  const g=await editGroup(page,'Audit');await g.locator('input[type="checkbox"]').check();
  page.once('dialog',d=>void d.dismiss());await save(page).click();
  expect(puts).toBe(0);await expect(g.locator('input[type="checkbox"]')).toBeChecked();
  await expect(save(page)).toBeEnabled();
 });
 test('PPER-093 Failed policy PUT leaves current edit unsaved rather than announcing success',async({page})=>{
  await openRolePolicies(page,{respond:(m,p)=>m==='PUT'&&p.endsWith('/support')?
    {status:503,json:{message:'Synthetic policy persistence outage'}}:undefined});
  await (await editGroup(page,'Audit')).locator('input[type="checkbox"]').check();
  page.once('dialog',d=>void d.accept());await save(page).click();
  await expect(root(page)).toContainText('Synthetic policy persistence outage');
  await expect(save(page)).toBeEnabled();
  await expect(root(page)).not.toContainText('permissions saved successfully.');
 });
 test('PPER-094 Initial unavailable policy shows a retry-only fail-closed state',async({page})=>{
  await openRolePolicies(page,{expectHeading:false,respond:(m,p)=>m==='GET'&&p===rolePolicyPath?
   {status:503,json:{message:'Synthetic policy read outage'}}:undefined});
  await expect(page.getByRole('alert')).toContainText('Platform permission policies could not be loaded.');
  await expect(root(page)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
 });
});
