/** Batch 95 — Platform Users source-traced synthetic browser tests (41 declarations).
 * No real users, MFA, credentials, database, audit, sessions, authorization or revocation verified.
 * STRICT PHASE 1 — GENERATED_UNRUN. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformUsers,usersPath,usersPermissions,usersAdmin,usersAlpha,usersBeta,usersGamma,
 currentUser,activeUser,inactiveUser,lockedUser,manyPlatformUsers} from '../../../support/platformUsersFixture';
const root=(p:Page)=>p.locator('.platform-users');
const grid=(p:Page)=>root(p).locator('.platform-users__filter-grid');
const card=(p:Page,label:string)=>root(p).locator('article.platform-users__card').filter({hasText:label});
const stats=(p:Page)=>root(p).getByLabel('Platform user governance summary');
const without=(...rights:string[])=>usersPermissions.filter(p=>!rights.includes(p));
test.describe('Platform Users — application identity governance only (BATCH_095_GENERATED_UNRUN)',()=>{
 test('PUSR-001 Page identifies scope and application identity limits',async({page})=>{
  await openPlatformUsers(page);await expect(root(page)).toContainText('Platform identity registry');
  await expect(root(page)).toContainText('external');await expect(root(page)).toContainText('application identities');
 });
 test('PUSR-002 Missing PLATFORM_USERS_READ denies route and user GET',async({page})=>{
  let calls=0;await openPlatformUsers(page,{permissions:without('platform.users.read'),expectHeading:false,
   onCall:(m,p)=>{if(m==='GET'&&p===usersPath)calls++;}});
  await expect(root(page)).toHaveCount(0);expect(calls).toBe(0);
 });
 test('PUSR-003 Without write permission create and lifecycle actions are hidden',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.users.write')});
  await expect(root(page).getByRole('button',{name:'Create Platform user'})).toHaveCount(0);
  await expect(card(page,'Alex Operator').getByRole('button',{name:'Deactivate'})).toHaveCount(0);
 });
 test('PUSR-004 Read-only registry indicator shown for reader',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.users.write')});await expect(root(page)).toContainText('Read-only registry');
 });
 test('PUSR-005 Default listing passes limit 50 and offset zero',async({page})=>{
  const queries:string[]=[];await openPlatformUsers(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===usersPath)queries.push(q.toString());}});
  await expect.poll(()=>queries.length).toBeGreaterThan(0);let q=new URLSearchParams(queries.at(-1));
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');
 });
 test('PUSR-006 Registry distinguishes active, disabled and locked',async({page})=>{
  await openPlatformUsers(page);for(const [name,status] of [['Alex Operator','Active'],['Beth Disabled','Disabled'],['Casey Locked','Locked']])
   await expect(card(page,name).locator('.platform-users__badges')).toContainText(status);
 });
 test('PUSR-007 Current principal is visibly marked You',async({page})=>{
  await openPlatformUsers(page);await expect(card(page,'Current Superadmin').locator('h4')).toContainText('You');
 });
 test('PUSR-008 Cannot deactivate own Platform identity via UI',async({page})=>{
  await openPlatformUsers(page);await expect(card(page,'Current Superadmin').getByRole('button',{name:'Deactivate'})).toBeDisabled();
 });
 test('PUSR-009 Missing sessions-read grant shows Restricted not zero',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.sessions.read')});
  await expect(card(page,'Alex Operator').locator('.platform-users__metrics-grid')).toContainText('Restricted');
  await expect(card(page,'Alex Operator').getByRole('link',{name:'Platform sessions'})).toHaveCount(0);
 });
 test('PUSR-010 Missing support-session-read grant redacts support count',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.support_sessions.read')});
  await expect(card(page,'Alex Operator').locator('.platform-users__metrics-grid')).toContainText('Restricted');
 });
 test('PUSR-011 MFA state is an application flag, not device possession',async({page})=>{
  await openPlatformUsers(page);await expect(card(page,'Alex Operator')).toContainText('MFA off');
  await expect(root(page)).toContainText('MFA/session flags do not independently prove device possession');
 });
 test('PUSR-012 Missing login timestamps display Not recorded',async({page})=>{
  await openPlatformUsers(page);await expect(card(page,'Beth Disabled').locator('.platform-users__metrics-grid')).toContainText('Not recorded');
 });
 test('PUSR-013 Summary counts are distinct from a single page of results',async({page})=>{
  await openPlatformUsers(page,{records:manyPlatformUsers(57)});await expect(stats(page)).toContainText('57');
  await expect(root(page).locator('article.platform-users__card')).toHaveCount(50);
 });
 test('PUSR-014 Next uses offset 50 with unchanged limit',async({page})=>{
  const calls:string[]=[];await openPlatformUsers(page,{records:manyPlatformUsers(55),onCall:(m,p,q)=>{if(m==='GET'&&p===usersPath)calls.push(q.toString());}});
  await root(page).locator('.platform-users__pagination').getByRole('button',{name:'Next'}).click();
  await expect(root(page).locator('.platform-users__pagination')).toContainText('Page 2');
  const q=new URLSearchParams(calls.at(-1));expect(q.get('offset')).toBe('50');expect(q.get('limit')).toBe('50');
 });
 test('PUSR-015 Previous returns to first page',async({page})=>{
  await openPlatformUsers(page,{records:manyPlatformUsers(55)});
  const pagination=root(page).locator('.platform-users__pagination');
  await pagination.getByRole('button',{name:'Next'}).click();await expect(pagination).toContainText('Page 2');
  await pagination.getByRole('button',{name:'Previous'}).click();await expect(pagination).toContainText('Page 1');
 });
 test('PUSR-016 Final page disables Next',async({page})=>{
  await openPlatformUsers(page,{records:manyPlatformUsers(52)});
  const pagination=root(page).locator('.platform-users__pagination');await pagination.getByRole('button',{name:'Next'}).click();
  await expect(pagination.getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PUSR-017 Search trims outbound query and filters by name or email',async({page})=>{
  const calls:string[]=[];await openPlatformUsers(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===usersPath)calls.push(q.toString());}});
  await grid(page).getByLabel('Search').fill('  alex  ');
  await expect(card(page,'Alex Operator')).toBeVisible();await expect(card(page,'Beth Disabled')).toHaveCount(0);
  expect(new URLSearchParams(calls.at(-1)).get('search')).toBe('alex');
 });
 test('PUSR-018 Role filter narrows to support and retains URL',async({page})=>{
  await openPlatformUsers(page);await grid(page).getByLabel('Role').selectOption('support');
  await expect(card(page,'Alex Operator')).toBeVisible();await expect(card(page,'Current Superadmin')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('role')).toBe('support');
 });
 test('PUSR-019 Disabled status filter shows only disabled account',async({page})=>{
  await openPlatformUsers(page);await grid(page).getByLabel('Status').selectOption('disabled');
  await expect(card(page,'Beth Disabled')).toBeVisible();await expect(card(page,'Alex Operator')).toHaveCount(0);
 });
 test('PUSR-020 Locked status filter uses actual current lock window',async({page})=>{
  await openPlatformUsers(page);await grid(page).getByLabel('Status').selectOption('locked');
  await expect(card(page,'Casey Locked')).toBeVisible();await expect(card(page,'Alex Operator')).toHaveCount(0);
 });
 test('PUSR-021 MFA-disabled filter matches application flag',async({page})=>{
  await openPlatformUsers(page);await grid(page).getByLabel('MFA').selectOption('disabled');
  await expect(card(page,'Alex Operator')).toBeVisible();await expect(card(page,'Current Superadmin')).toHaveCount(0);
 });
 test('PUSR-022 Unsupported role URL refuses registry GET',async({page})=>{
  let n=0;await openPlatformUsers(page,{query:'role=not-a-role',onCall:(m,p)=>{if(m==='GET'&&p===usersPath)n++;}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(n).toBe(0);
 });
 test('PUSR-023 Oversized URL search refuses registry GET',async({page})=>{
  let n=0;await openPlatformUsers(page,{query:`search=${'x'.repeat(201)}`,onCall:(m,p)=>{if(m==='GET'&&p===usersPath)n++;}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(n).toBe(0);
 });
 test('PUSR-024 Deep-linked platform_user_id survives filter changes',async({page})=>{
  await openPlatformUsers(page,{query:`platform_user_id=${usersAlpha}`});
  await expect(root(page)).toContainText('Deep-linked user ID');
  await grid(page).getByLabel('MFA').selectOption('disabled');
  expect(new URL(page.url()).searchParams.get('platform_user_id')).toBe(usersAlpha);
  await expect(card(page,'Alex Operator')).toBeVisible();
 });
 test('PUSR-025 Clear user scope removes only targeted deep-link parameter',async({page})=>{
  await openPlatformUsers(page,{query:`platform_user_id=${usersAlpha}&role=support`});
  await root(page).getByRole('button',{name:'Clear user scope'}).click();
  expect(new URL(page.url()).searchParams.has('platform_user_id')).toBe(false);
  expect(new URL(page.url()).searchParams.get('role')).toBe('support');
 });
 test('PUSR-026 Empty filter result is not a server failure',async({page})=>{
  await openPlatformUsers(page,{query:'search=nonexistent'});
  await expect(root(page)).toContainText('No Platform users matched.');
  await expect(root(page).locator('.platform-users__blocking-error')).toHaveCount(0);
 });
 test('PUSR-027 Initial server error shows Retry without fabricated identities',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='GET'&&p===usersPath?{status:503,json:{message:'User service temporarily unavailable'}}:undefined});
  await expect(root(page)).toContainText('Platform users could not be loaded.');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
  await expect(root(page).locator('article.platform-users__card')).toHaveCount(0);
 });
 test('PUSR-028 Retry after service recovery reloads real fixture records',async({page})=>{
  let failed=true;await openPlatformUsers(page,{respond:(m,p)=>m==='GET'&&p===usersPath&&failed?{status:503,json:{message:'Temporary unavailable'}}:undefined});
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();failed=false;
  await root(page).getByRole('button',{name:'Retry'}).click();await expect(card(page,'Alex Operator')).toBeVisible();
 });
 test('PUSR-029 Refresh failure preserves previous snapshot and reports error',async({page})=>{
  let failed=false;await openPlatformUsers(page,{respond:(m,p)=>m==='GET'&&p===usersPath&&failed?{status:503,json:{message:'Refresh failed'}}:undefined});
  await expect(card(page,'Alex Operator')).toBeVisible();failed=true;
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');
  await expect(card(page,'Alex Operator')).toBeVisible();
 });
 test('PUSR-030 Missing create email disables submit',async({page})=>{
  await openPlatformUsers(page);await expect(root(page).getByRole('button',{name:'Create Platform user'})).toBeDisabled();
  await expect(root(page)).toContainText('Enter an email.');
 });
 test('PUSR-031 Missing create name yields validation after email entered',async({page})=>{
  await openPlatformUsers(page);const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('new@fixture.test');await expect(section).toContainText('Enter a name.');
 });
 test('PUSR-032 Short temporary password blocks create',async({page})=>{
  await openPlatformUsers(page);const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('new@fixture.test');await section.getByLabel('Name').fill('New Platform User');
  await section.getByLabel('Temporary password').fill('short');
  await expect(section).toContainText('Temporary password must be at least 10 characters.');
  await expect(section.getByRole('button',{name:'Create Platform user'})).toBeDisabled();
 });
 test('PUSR-033 Successful create trims name and email and sends role',async({page})=>{
  const writes:any[]=[];await openPlatformUsers(page,{onCall:(m,p,q,body)=>{if(m==='POST'&&p===usersPath)writes.push(body);}});
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('  new@fixture.test  ');await section.getByLabel('Name').fill('  New User  ');
  await section.getByLabel('Role').selectOption('support');await section.getByLabel('Temporary password').fill('syntheticpass123');
  await section.getByRole('button',{name:'Create Platform user'}).click();
  await expect(root(page)).toContainText('Platform user created.');
  expect(writes).toHaveLength(1);expect(writes[0]).toMatchObject({email:'new@fixture.test',name:'New User',role:'support'});
 });
 test('PUSR-034 Create server failure reports Action failed, retains typed details',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='POST'&&p===usersPath?{status:409,json:{message:'Duplicate platform email'}}:undefined});
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('duplicate@fixture.test');await section.getByLabel('Name').fill('Duplicate');
  await section.getByLabel('Temporary password').fill('syntheticpass123');
  await section.getByRole('button',{name:'Create Platform user'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(section.getByLabel('Email')).toHaveValue('duplicate@fixture.test');
 });
 test('PUSR-035 Edit details preloads existing name and role',async({page})=>{
  await openPlatformUsers(page);const entry=card(page,'Alex Operator');
  await entry.getByRole('button',{name:'Edit details'}).click();
  await expect(entry.getByLabel('Name')).toHaveValue('Alex Operator');await expect(entry.getByLabel('Role')).toHaveValue('support');
 });
 test('PUSR-036 Save edit sends trimmed name and selected role',async({page})=>{
  const writes:any[]=[];await openPlatformUsers(page,{onCall:(m,p,q,b)=>{if(m==='PATCH'&&p===`${usersPath}/${usersAlpha}`)writes.push(b);}});
  const entry=card(page,'Alex Operator');await entry.getByRole('button',{name:'Edit details'}).click();
  await entry.getByLabel('Name').fill('  Alexandra Operator  ');await entry.getByLabel('Role').selectOption('ops');
  await entry.getByRole('button',{name:'Save'}).click();
  await expect(root(page)).toContainText('Platform user details updated.');
  expect(writes).toEqual([{name:'Alexandra Operator',role:'ops'}]);
 });
 test('PUSR-037 Cancel edit does not send PATCH mutation',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='PATCH'&&p.startsWith(`${usersPath}/`))writes.push(p);}});
  const entry=card(page,'Alex Operator');await entry.getByRole('button',{name:'Edit details'}).click();
  await entry.getByLabel('Name').fill('Discard');await entry.getByRole('button',{name:'Cancel'}).click();
  expect(writes).toHaveLength(0);await expect(card(page,'Alex Operator')).toBeVisible();
 });
 test('PUSR-038 Deactivation rejected confirmation performs no server write',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/deactivate'))writes.push(p);}});
  page.once('dialog',dialog=>dialog.dismiss());await card(page,'Alex Operator').getByRole('button',{name:'Deactivate'}).click();
  expect(writes).toHaveLength(0);await expect(card(page,'Alex Operator')).toContainText('Active');
 });
 test('PUSR-039 Confirmed deactivation targets only selected user ID',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/deactivate'))writes.push(p);}});
  page.once('dialog',dialog=>dialog.accept());await card(page,'Alex Operator').getByRole('button',{name:'Deactivate'}).click();
  await expect(root(page)).toContainText('Platform user deactivated and active access revoked.');
  expect(writes).toEqual([`${usersPath}/${usersAlpha}/deactivate`]);
 });
 test('PUSR-040 Password reset requires ten characters and can be cancelled',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/reset-password'))writes.push(p);}});
  const entry=card(page,'Alex Operator');await entry.getByRole('button',{name:'Reset password',exact:true}).click();
  await entry.getByLabel('New temporary password').fill('short');
  await expect(entry.getByRole('button',{name:'Reset password & revoke access'})).toBeDisabled();
  await entry.getByRole('button',{name:'Cancel'}).click();expect(writes).toHaveLength(0);
 });
 test('PUSR-041 Revoke-access action requires both revoke permissions',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.support_sessions.end')});
  await expect(card(page,'Alex Operator').getByRole('button',{name:'Revoke access'})).toHaveCount(0);
  await expect(card(page,'Alex Operator').getByRole('button',{name:'Reset password',exact:true})).toBeVisible();
 });
 test('PUSR-042 Reset password posts only selected ID and synthetic password',async({page})=>{
  const writes:Array<{path:string;body:any}>=[];
  await openPlatformUsers(page,{onCall:(method,path,_query,body)=>{if(method==='POST'&&path.endsWith('/reset-password'))writes.push({path,body});}});
  const entry=card(page,'Alex Operator');await entry.getByRole('button',{name:'Reset password',exact:true}).click();
  await entry.getByLabel('New temporary password').fill('new-synthetic-pass-42');
  await entry.getByRole('button',{name:'Reset password & revoke access'}).click();
  await expect(root(page)).toContainText('Password reset. Existing Platform and Support Session access was revoked.');
  expect(writes).toEqual([{path:`${usersPath}/${usersAlpha}/reset-password`,body:{password:'new-synthetic-pass-42'}}]);
 });
 test('PUSR-043 Reset success closes panel and clears secret input',async({page})=>{
  await openPlatformUsers(page);const entry=card(page,'Alex Operator');
  await entry.getByRole('button',{name:'Reset password',exact:true}).click();
  await entry.getByLabel('New temporary password').fill('test-only-password');
  await entry.getByRole('button',{name:'Reset password & revoke access'}).click();
  await expect(entry.getByLabel('New temporary password')).toHaveCount(0);
  await expect(root(page)).toContainText('Password reset. Existing Platform and Support Session access was revoked.');
  await entry.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(entry.getByLabel('New temporary password')).toHaveValue('');
 });
 test('PUSR-044 Reset failure retains typed form and shows error',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/reset-password')?{status:403,json:{message:'Denied in synthetic API'}}:undefined});
  const entry=card(page,'Alex Operator');await entry.getByRole('button',{name:'Reset password',exact:true}).click();
  await entry.getByLabel('New temporary password').fill('test-only-password');
  await entry.getByRole('button',{name:'Reset password & revoke access'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(entry.getByLabel('New temporary password')).toHaveValue('test-only-password');
  await expect(root(page)).not.toContainText('Password reset. Existing Platform');
 });
 test('PUSR-045 Submitted password is not echoed in the user registry',async({page})=>{
  await openPlatformUsers(page);const entry=card(page,'Alex Operator');
  await entry.getByRole('button',{name:'Reset password',exact:true}).click();
  await entry.getByLabel('New temporary password').fill('secret-not-for-ui-045');
  await entry.getByRole('button',{name:'Reset password & revoke access'}).click();
  await expect(root(page)).not.toContainText('secret-not-for-ui-045');
  await expect(root(page)).toContainText('Password reset. Existing Platform');
 });
 test('PUSR-046 Missing session revoke hides revoke access button',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.sessions.revoke')});
  await expect(card(page,'Alex Operator').getByRole('button',{name:'Revoke access'})).toHaveCount(0);
 });
 test('PUSR-047 Missing support-session end hides revoke access button',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.support_sessions.end')});
  await expect(card(page,'Alex Operator').getByRole('button',{name:'Revoke access'})).toHaveCount(0);
 });
 test('PUSR-048 Dismiss revoke confirmation results in no mutation',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/revoke-sessions'))writes.push(p);}});
  page.once('dialog',dialog=>dialog.dismiss());await card(page,'Alex Operator').getByRole('button',{name:'Revoke access'}).click();
  expect(writes).toHaveLength(0);await expect(card(page,'Alex Operator')).toContainText('Active');
 });
 test('PUSR-049 Confirm revoke posts only selected identity endpoint',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/revoke-sessions'))writes.push(p);}});
  page.once('dialog',dialog=>dialog.accept());await card(page,'Alex Operator').getByRole('button',{name:'Revoke access'}).click();
  await expect(root(page)).toContainText('Active Platform and Support Session access revoked.');
  expect(writes).toEqual([`${usersPath}/${usersAlpha}/revoke-sessions`]);
 });
 test('PUSR-050 Revoke error retains row and shows action failure',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/revoke-sessions')?{status:503,json:{message:'Synthetic revoke unavailable'}}:undefined});
  page.once('dialog',dialog=>dialog.accept());await card(page,'Alex Operator').getByRole('button',{name:'Revoke access'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(card(page,'Alex Operator')).toContainText('Active');
 });
 test('PUSR-051 Deactivation failure retains active status',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/deactivate')?{status:409,json:{message:'Synthetic deactivation blocked'}}:undefined});
  page.once('dialog',dialog=>dialog.accept());await card(page,'Alex Operator').getByRole('button',{name:'Deactivate'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(card(page,'Alex Operator').locator('.platform-users__badges')).toContainText('Active');
 });
 test('PUSR-052 Activate previously disabled account by ID',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/activate'))writes.push(p);}});
  page.once('dialog',dialog=>dialog.accept());await card(page,'Beth Disabled').getByRole('button',{name:'Activate'}).click();
  await expect(root(page)).toContainText('Platform user activated.');
  await expect(card(page,'Beth Disabled').locator('.platform-users__badges')).toContainText('Active');
  expect(writes).toEqual([`${usersPath}/${usersBeta}/activate`]);
 });
 test('PUSR-053 Dismiss activation confirmation performs zero writes',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/activate'))writes.push(p);}});
  page.once('dialog',dialog=>dialog.dismiss());await card(page,'Beth Disabled').getByRole('button',{name:'Activate'}).click();
  expect(writes).toHaveLength(0);await expect(card(page,'Beth Disabled').locator('.platform-users__badges')).toContainText('Disabled');
 });
 test('PUSR-054 Activation failure keeps disabled status and reports failure',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/activate')?{status:403,json:{message:'Synthetic activation denied'}}:undefined});
  page.once('dialog',dialog=>dialog.accept());await card(page,'Beth Disabled').getByRole('button',{name:'Activate'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(card(page,'Beth Disabled').locator('.platform-users__badges')).toContainText('Disabled');
 });
 test('PUSR-055 Registry reader has no create/edit/reset/lifecycle forms',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.users.write')});
  await expect(root(page).getByRole('button',{name:'Create Platform user'})).toHaveCount(0);
  for(const label of ['Edit details','Reset password','Activate','Deactivate','Revoke access'])
   await expect(root(page).getByRole('button',{name:label,exact:true})).toHaveCount(0);
 });
 test('PUSR-056 Save edit closes form and leaves unrelated account intact',async({page})=>{
  await openPlatformUsers(page);const entry=card(page,'Alex Operator');
  await entry.getByRole('button',{name:'Edit details'}).click();await entry.getByLabel('Name').fill('Alex Changed');
  await entry.getByRole('button',{name:'Save'}).click();await expect(card(page,'Alex Changed')).toBeVisible();
  await expect(card(page,'Alex Changed').getByRole('button',{name:'Save'})).toHaveCount(0);
  await expect(card(page,'Beth Disabled')).toBeVisible();
 });
 test('PUSR-057 Edit failure retains in-progress values',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='PATCH'&&p===`${usersPath}/${usersAlpha}`?{status:409,json:{message:'Synthetic conflict'}}:undefined});
  const entry=card(page,'Alex Operator');await entry.getByRole('button',{name:'Edit details'}).click();
  await entry.getByLabel('Name').fill('Unsaved Alex');await entry.getByRole('button',{name:'Save'}).click();
  await expect(root(page)).toContainText('Action failed.');await expect(entry.getByLabel('Name')).toHaveValue('Unsaved Alex');
 });
 test('PUSR-058 Empty edited name disables save',async({page})=>{
  await openPlatformUsers(page);const entry=card(page,'Alex Operator');await entry.getByRole('button',{name:'Edit details'}).click();
  await entry.getByLabel('Name').fill('   ');await expect(entry.getByRole('button',{name:'Save'})).toBeDisabled();
 });
 test('PUSR-059 Edit role selector reflects API allowed role values',async({page})=>{
  await openPlatformUsers(page);const entry=card(page,'Alex Operator');await entry.getByRole('button',{name:'Edit details'}).click();
  await expect(entry.getByLabel('Role').locator('option[value="tenant_success"]')).toHaveCount(1);
  await expect(entry.getByLabel('Role').locator('option[value="superadmin"]')).toHaveCount(1);
 });
 test('PUSR-060 Create form clears after successful response',async({page})=>{
  await openPlatformUsers(page);const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('pusr60@fixture.test');await section.getByLabel('Name').fill('Test Person');
  await section.getByLabel('Temporary password').fill('temporary-test-password');
  await section.getByRole('button',{name:'Create Platform user'}).click();
  await expect(root(page)).toContainText('Platform user created.');
  for(const field of ['Email','Name','Temporary password'])await expect(section.getByLabel(field)).toHaveValue('');
 });
 test('PUSR-061 Pending create disables a duplicate submit',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let writes=0;
  await openPlatformUsers(page,{respond:async(m,p)=>{if(m==='POST'&&p===usersPath){writes++;await gate;return {status:201,json:{...activeUser,id:'a9500000-0000-4000-8000-000000000099',email:'pending@fixture.test',name:'Pending'}};}return undefined;}});
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('pending@fixture.test');await section.getByLabel('Name').fill('Pending');
  await section.getByLabel('Temporary password').fill('temporary-test-password');
  try{await section.getByRole('button',{name:'Create Platform user'}).click();
   await expect(section.getByRole('button',{name:'Creating…'})).toBeDisabled();expect(writes).toBe(1);
  }finally{release();}
 });
 test('PUSR-062 Successful create does not drop deep-linked user scope',async({page})=>{
  await openPlatformUsers(page,{query:`platform_user_id=${usersAlpha}&role=support`});
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('pusr62@fixture.test');await section.getByLabel('Name').fill('Test Person');
  await section.getByLabel('Temporary password').fill('temporary-test-password');
  await section.getByRole('button',{name:'Create Platform user'}).click();
  await expect(root(page)).toContainText('Platform user created.');
  expect(new URL(page.url()).searchParams.get('platform_user_id')).toBe(usersAlpha);
  expect(new URL(page.url()).searchParams.get('role')).toBe('support');
 });
 test('PUSR-063 Valid empty registry response is an empty state, not failure',async({page})=>{
  await openPlatformUsers(page,{records:[]});await expect(root(page)).toContainText('No Platform users matched.');
  await expect(root(page).locator('.platform-users__blocking-error')).toHaveCount(0);
  await expect(root(page).locator('.platform-users__pagination')).toContainText('0 matching users');
 });
 test('PUSR-064 Status change resets paging to first offset',async({page})=>{
  const q:Array<{offset:string|null;status:string|null}>=[];
  await openPlatformUsers(page,{records:manyPlatformUsers(60),onCall:(m,p,s)=>{if(m==='GET'&&p===usersPath)q.push({offset:s.get('offset'),status:s.get('status')});}});
  await root(page).getByRole('button',{name:'Next'}).click();await expect(root(page).locator('.platform-users__pagination')).toContainText('Page 2');
  await grid(page).getByLabel('Status').selectOption('active');
  await expect.poll(()=>q.some(x=>x.offset==='0'&&x.status==='active')).toBe(true);
 });
 test('PUSR-065 Search change resets page offset to zero',async({page})=>{
  const q:Array<{offset:string|null;search:string|null}>=[];
  await openPlatformUsers(page,{records:manyPlatformUsers(60),onCall:(m,p,s)=>{if(m==='GET'&&p===usersPath)q.push({offset:s.get('offset'),search:s.get('search')});}});
  await root(page).getByRole('button',{name:'Next'}).click();await expect(root(page).locator('.platform-users__pagination')).toContainText('Page 2');
  await grid(page).getByLabel('Search').fill('Paging Operator 001');
  await expect.poll(()=>q.some(x=>x.offset==='0'&&x.search==='Paging Operator 001')).toBe(true);
 });
 test('PUSR-066 Role change resets offset and retains existing status',async({page})=>{
  const q:Array<{offset:string|null;role:string|null;status:string|null}>=[];
  await openPlatformUsers(page,{records:manyPlatformUsers(60),query:'status=active',onCall:(m,p,s)=>{if(m==='GET'&&p===usersPath)q.push({offset:s.get('offset'),role:s.get('role'),status:s.get('status')});}});
  await root(page).getByRole('button',{name:'Next'}).click();await expect(root(page).locator('.platform-users__pagination')).toContainText('Page 2');
  await grid(page).getByLabel('Role').selectOption('support');
  await expect.poll(()=>q.some(x=>x.offset==='0'&&x.role==='support'&&x.status==='active')).toBe(true);
 });
 test('PUSR-067 MFA change resets offset and keeps role selection',async({page})=>{
  const q:Array<{offset:string|null;role:string|null;mfa:string|null}>=[];
  await openPlatformUsers(page,{records:manyPlatformUsers(60),query:'role=support',onCall:(m,p,s)=>{if(m==='GET'&&p===usersPath)q.push({offset:s.get('offset'),role:s.get('role'),mfa:s.get('mfa')});}});
  await root(page).getByRole('button',{name:'Next'}).click();await expect(root(page).locator('.platform-users__pagination')).toContainText('Page 2');
  await grid(page).getByLabel('MFA').selectOption('disabled');
  await expect.poll(()=>q.some(x=>x.offset==='0'&&x.role==='support'&&x.mfa==='disabled')).toBe(true);
 });
 test('PUSR-068 Unsupported MFA query blocks GET and flags URL',async({page})=>{
  let calls=0;await openPlatformUsers(page,{query:'mfa=unknown',onCall:(m,p)=>{if(m==='GET'&&p===usersPath)calls++;}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toBe(0);
 });
 test('PUSR-069 Unsupported status query blocks GET and flags URL',async({page})=>{
  let calls=0;await openPlatformUsers(page,{query:'status=deleted',onCall:(m,p)=>{if(m==='GET'&&p===usersPath)calls++;}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toBe(0);
 });
 test.skip('PUSR-070 Backend rejects malformed platform_user_id and query bounds — real service Phase 2',async()=>{});
 test.skip('PUSR-071 Backend enforces authenticated reader authorization/principal scope — separate principals Phase 2',async()=>{});
 test.skip('PUSR-072 Self-deactivation and last active superadmin prevented by DB — Phase 2',async()=>{});
 test.skip('PUSR-073 Role downgrade revokes previous privileges on next real request — Phase 2',async()=>{});
 test.skip('PUSR-074 Password hashing, policy and durable audit evidence — Phase 2',async()=>{});
 test.skip('PUSR-075 Deactivation terminates real Platform and Support Sessions — Phase 2',async()=>{});
 test.skip('PUSR-076 Concurrent revoke removes all sessions without race escape — Phase 2',async()=>{});
 test.skip('PUSR-077 Backend rejects unauthorized create/update/activate/reset mutations — Phase 2',async()=>{});
 test.skip('PUSR-078 MFA and login lockout verified against genuine security records — Phase 2',async()=>{});
 test.skip('PUSR-079 Real cursor/paging totals and concurrent edits stay consistent — Phase 2',async()=>{});
 test.skip('PUSR-080 Employment authority, device control and external approval evidenced independently — Phase 2',async()=>{});

 // Batch 149 — identity-scope navigation, inert content and policy gates.
 test('PUSR-081 Clearing scoped user ID preserves independently selected role and status',async({page})=>{
  await openPlatformUsers(page,{query:`platform_user_id=${usersAlpha}&role=support&status=active`});
  await expect(card(page,'Alex Operator')).toBeVisible();
  await grid(page).getByRole('button',{name:'Clear user scope'}).click();
  const q=new URL(page.url()).searchParams;expect(q.has('platform_user_id')).toBe(false);
  expect(q.get('role')).toBe('support');expect(q.get('status')).toBe('active');
  await expect(card(page,'Alex Operator')).toBeVisible();
 });
 test('PUSR-082 Platform user names with HTML syntax stay text within registry cards',async({page})=>{
  const hostile='<img src=x onerror=alert(1)>';
  await openPlatformUsers(page,{records:[{...activeUser,name:hostile}]});
  await expect(root(page).locator('article.platform-users__card').first()).toContainText(hostile);
  await expect(root(page).locator('article.platform-users__card').first().locator('img,script,iframe')).toHaveCount(0);
 });
 test('PUSR-083 Platform user emails with HTML syntax cannot insert executable nodes',async({page})=>{
  const hostile='<svg onload=alert(1)>';
  await openPlatformUsers(page,{records:[{...activeUser,email:hostile}]});
  await expect(root(page).locator('article.platform-users__card').first()).toContainText(hostile);
  await expect(root(page).locator('article.platform-users__card').first().locator('svg,script,iframe')).toHaveCount(0);
 });
 test('PUSR-084 Changing role preserves harmless URL context but sends only approved query fields',async({page})=>{
  const calls:string[]=[];await openPlatformUsers(page,{query:'trace=keep-me',onCall:(m,p,q)=>{if(m==='GET'&&p===usersPath)calls.push(q.toString());}});
  await grid(page).getByLabel('Role').selectOption('support');await expect(card(page,'Alex Operator')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('trace')).toBe('keep-me');
  const query=new URLSearchParams(calls.at(-1));expect(query.get('role')).toBe('support');expect(query.has('trace')).toBe(false);
 });
 test('PUSR-085 Invalid role prevents listing even with a separately valid MFA filter',async({page})=>{
  let calls=0;await openPlatformUsers(page,{query:'role=not-a-role&mfa=disabled',onCall:(m,p)=>{if(m==='GET'&&p===usersPath)calls++;}});
  await expect(root(page)).toContainText('Invalid URL filter.');expect(calls).toBe(0);
 });
 test('PUSR-086 Scoped user and search criteria remain independently present in outbound request',async({page})=>{
  const calls:string[]=[];await openPlatformUsers(page,{query:`platform_user_id=${usersAlpha}&search=alex`,onCall:(m,p,q)=>{if(m==='GET'&&p===usersPath)calls.push(q.toString());}});
  await expect(card(page,'Alex Operator')).toBeVisible();
  const q=new URLSearchParams(calls.at(-1));expect(q.get('platform_user_id')).toBe(usersAlpha);expect(q.get('search')).toBe('alex');
  expect(q.get('limit')).toBe('50');expect(q.get('offset')).toBe('0');
 });
 test('PUSR-087 Platform Audit deep links remain available without session/security read grants',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.sessions.read','platform.support_sessions.read','platform.security.read')});
  await expect(card(page,'Alex Operator').getByRole('link',{name:'Audit history'})).toHaveAttribute('href',`/platform/audit?target_type=platform_users&target_id=${usersAlpha}`);
  await expect(card(page,'Alex Operator').getByRole('link',{name:'Platform sessions'})).toHaveCount(0);
  await expect(card(page,'Alex Operator').getByRole('link',{name:'Security'})).toHaveCount(0);
 });


 // Batch 152: source-backed user-guard boundaries; mocked UI only, never server enforcement evidence.
 test('PUSR-088 Current identity deactivation is disabled with an explanatory title and no lifecycle POST',async({page})=>{
  const writes:string[]=[];
  await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.includes('/platform/users/'))writes.push(p);}});
  const action=card(page,'Current Superadmin').getByRole('button',{name:'Deactivate'});
  await expect(action).toBeDisabled();
  await expect(action).toHaveAttribute('title','You cannot deactivate your own Platform account.');
  expect(writes).toEqual([]);
 });
 test('PUSR-089 Revoke access asks about this user and Support Sessions before any POST',async({page})=>{
  const writes:string[]=[];
  await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.includes('/platform/users/'))writes.push(p);}});
  page.once('dialog',async dialog=>{
   expect(dialog.message()).toContain('alex@fixture.test');
   expect(dialog.message()).toContain('ends active Support Sessions');
   await dialog.dismiss();
  });
  await card(page,'Alex Operator').getByRole('button',{name:'Revoke access'}).click();
  expect(writes).toEqual([]);
 });
 test('PUSR-090 Reactivation explicitly warns that old sessions will not return',async({page})=>{
  const writes:string[]=[];
  await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.includes('/platform/users/'))writes.push(p);}});
  page.once('dialog',async dialog=>{
   expect(dialog.message()).toContain('beth@fixture.test');
   expect(dialog.message()).toContain('Previous sessions will not be restored.');
   await dialog.dismiss();
  });
  await card(page,'Beth Disabled').getByRole('button',{name:'Activate'}).click();
  await expect(card(page,'Beth Disabled').locator('.platform-users__badges')).toContainText('Disabled');
  expect(writes).toEqual([]);
 });
 test('PUSR-091 Revoke controls use independent write grants even when session counts are restricted',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.sessions.read','platform.support_sessions.read')});
  const target=card(page,'Alex Operator');
  await expect(target.locator('.platform-users__metrics-grid')).toContainText('Restricted');
  await expect(target.getByRole('button',{name:'Revoke access'})).toBeVisible();
  await expect(target.getByRole('link',{name:'Platform sessions'})).toHaveCount(0);
 });
 test('PUSR-092 Switching the edited user discards an unsaved local draft without PATCH',async({page})=>{
  const writes:string[]=[];
  await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='PATCH'&&p.startsWith('/platform/users/'))writes.push(p);}});
  await card(page,'Alex Operator').getByRole('button',{name:'Edit details'}).click();
  await card(page,'Alex Operator').getByLabel('Name').fill('Temporary unsaved rename');
  await card(page,'Beth Disabled').getByRole('button',{name:'Edit details'}).click();
  await expect(card(page,'Alex Operator').getByLabel('Name')).toHaveCount(0);
  await expect(card(page,'Beth Disabled').getByLabel('Name')).toHaveValue('Beth Disabled');
  expect(writes).toEqual([]);
 });
 test('PUSR-093 Reset password uses a masked input and cancel clears the local secret',async({page})=>{
  const writes:string[]=[];
  await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/reset-password'))writes.push(p);}});
  const target=card(page,'Alex Operator');
  await target.getByRole('button',{name:'Reset password',exact:true}).click();
  const secret=target.getByLabel('New temporary password');
  await expect(secret).toHaveAttribute('type','password');
  await secret.fill('long-secret-for-test');
  await target.getByRole('button',{name:'Cancel'}).click();
  await target.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(target.getByLabel('New temporary password')).toHaveValue('');
  expect(writes).toEqual([]);
 });
 test('PUSR-094 Expired lockout timestamp is not displayed as a current lock',async({page})=>{
  await openPlatformUsers(page,{records:[{...activeUser,locked_until:'2020-01-01T00:00:00Z'},lockedUser]});
  await expect(card(page,'Alex Operator').locator('.platform-users__badges')).toContainText('Active');
  await expect(card(page,'Alex Operator').locator('.platform-users__badges')).not.toContainText('Locked');
  await expect(card(page,'Casey Locked').locator('.platform-users__badges')).toContainText('Locked');
 });
 test('PUSR-095 Failed-login counter alone is not presented as active account lockout',async({page})=>{
  await openPlatformUsers(page,{records:[{...activeUser,failed_login_count:99,locked_until:null}]});
  const target=card(page,'Alex Operator');
  await expect(target.locator('.platform-users__badges')).toContainText('Active');
  await expect(target.locator('.platform-users__badges')).not.toContainText('Locked');
  await expect(target.locator('.platform-users__metrics-grid')).toContainText('99');
 });

 // Batch 166 — platform identity rendering, independently gated links and mutation boundaries.
 // Source-backed synthetic browser assertions; backend authentication and durable changes remain unverified.
 test('PUSR-096 Invalid login and update timestamps show safe Not recorded labels',async({page})=>{
  await openPlatformUsers(page,{records:[{...activeUser,last_login_at:'not-a-date',updated_at:'not-a-date',password_changed_at:'not-a-date'}]});
  const metrics=card(page,'Alex Operator').locator('.platform-users__metrics-grid');
  await expect(metrics).toContainText('Last login');
  await expect(metrics).toContainText('Password changed');
  await expect(metrics).toContainText('Updated');
  await expect(metrics.getByText('Not recorded')).toHaveCount(3);
 });
 test('PUSR-097 Absent login counter and session counts fall back to zero for authorized reader',async({page})=>{
  await openPlatformUsers(page,{records:[{...activeUser,failed_login_count:undefined as unknown as number,active_session_count:null,open_support_session_count:null}]});
  const target=card(page,'Alex Operator').locator('.platform-users__metrics-grid');
  await expect(target.locator('strong').filter({hasText:/^0$/})).toHaveCount(3);
 });
 test('PUSR-098 Disabled account overrides a still-future lockout timestamp',async({page})=>{
  await openPlatformUsers(page,{records:[{...inactiveUser,locked_until:'2099-04-01T00:00:00Z'}]});
  const badges=card(page,'Beth Disabled').locator('.platform-users__badges');
  await expect(badges).toContainText('Disabled');await expect(badges).not.toContainText('Locked');
 });
 test('PUSR-099 Underscore-delimited roles are displayed as readable text',async({page})=>{
  await openPlatformUsers(page,{records:[{...activeUser,role:'tenant_success'}]});
  await expect(card(page,'Alex Operator').locator('.platform-users__badges')).toContainText('tenant success');
  await expect(card(page,'Alex Operator').locator('.platform-users__badges')).not.toContainText('tenant_success');
 });
 test('PUSR-100 Legacy array response renders users without inventing pagination or summary',async({page})=>{
  await openPlatformUsers(page,{legacyResponse:true});
  await expect(card(page,'Alex Operator')).toBeVisible();
  await expect(root(page).locator('.platform-users__pagination')).toHaveCount(0);
  await expect(root(page).locator('.platform-users__blocking-error')).toHaveCount(0);
  await expect(stats(page)).toContainText('—');
 });
 test('PUSR-101 Missing structured summary uses placeholder statistics rather than guessed values',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='GET'&&p===usersPath?{json:{users:[activeUser],roles:['support']}}:undefined});
  await expect(card(page,'Alex Operator')).toBeVisible();
  await expect(root(page).locator('.platform-users__pagination')).toHaveCount(0);
  await expect(stats(page)).toContainText('—');
 });
 test('PUSR-102 API-provided nonempty roles list controls create and edit selectors',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='GET'&&p===usersPath?{json:{users:[activeUser],roles:['support','ops'],summary:{total:1,active:1,disabled:0,locked:0,active_without_mfa:1,active_superadmins:1}}}:undefined});
  const create=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await expect(create.getByLabel('Role').locator('option')).toHaveCount(2);
  await expect(create.getByLabel('Role').locator('option[value="ops"]')).toHaveCount(1);
  await card(page,'Alex Operator').getByRole('button',{name:'Edit details'}).click();
  await expect(card(page,'Alex Operator').getByLabel('Role').locator('option')).toHaveCount(2);
 });
 test('PUSR-103 Supporting operations show only independently granted sessions link',async({page})=>{
  await openPlatformUsers(page,{permissions:['platform.users.read','platform.sessions.read']});
  const links=root(page).locator('.platform-users__supporting-links');
  await expect(links.getByRole('link',{name:'Platform sessions'})).toHaveAttribute('href','/platform/sessions');
  await expect(links.getByRole('link')).toHaveCount(1);
 });
 test('PUSR-104 Permission-audit support link is independent of Platform Audit grant',async({page})=>{
  await openPlatformUsers(page,{permissions:['platform.users.read','platform.access_reviews.read']});
  const links=root(page).locator('.platform-users__supporting-links');
  await expect(links.getByRole('link',{name:'Permission audit'})).toHaveAttribute('href','/platform/permission-audit');
  await expect(links.getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  await expect(links.getByRole('link')).toHaveCount(1);
 });
 test('PUSR-105 Role permissions support navigation requires only its distinct grant',async({page})=>{
  await openPlatformUsers(page,{permissions:['platform.users.read','platform.role_permissions.read']});
  const links=root(page).locator('.platform-users__supporting-links');
  await expect(links.getByRole('link',{name:'Role permissions'})).toHaveAttribute('href','/platform/permissions');
  await expect(links.getByRole('link',{name:'Permission audit'})).toHaveCount(0);
  await expect(links.getByRole('link')).toHaveCount(1);
 });
 test('PUSR-106 Per-user Security link survives removal of audit and sessions grants',async({page})=>{
  await openPlatformUsers(page,{permissions:['platform.users.read','platform.security.read']});
  const links=card(page,'Alex Operator').locator('.platform-users__source-links');
  await expect(links.getByRole('link',{name:'Security'})).toHaveAttribute('href','/platform/security');
  await expect(links.getByRole('link')).toHaveCount(1);
 });
 test('PUSR-107 User-scoped audit and sessions links URL-encode the selected record ID',async({page})=>{
  const scopedId='a9500000-0000-4000-8000-000000000001?x=#';
  await openPlatformUsers(page,{records:[{...activeUser,id:scopedId}]});
  const links=card(page,'Alex Operator').locator('.platform-users__source-links');
  await expect(links.getByRole('link',{name:'Platform sessions'})).toHaveAttribute('href',`/platform/sessions?platform_user_id=${encodeURIComponent(scopedId)}`);
  await expect(links.getByRole('link',{name:'Audit history'})).toHaveAttribute('href',`/platform/audit?target_type=platform_users&target_id=${encodeURIComponent(scopedId)}`);
 });
 test('PUSR-108 Search-only URL edits retain unrelated filters and exclude unknown API keys',async({page})=>{
  const calls:string[]=[];
  await openPlatformUsers(page,{query:'status=active&mfa=disabled&trace=private',onCall:(m,p,q)=>{if(m==='GET'&&p===usersPath)calls.push(q.toString());}});
  await grid(page).getByLabel('Search').fill(' beth ');
  await expect.poll(()=>calls.some(q=>new URLSearchParams(q).get('search')==='beth')).toBe(true);
  const url=new URL(page.url()).searchParams;
  expect(url.get('trace')).toBe('private');expect(url.get('mfa')).toBe('disabled');expect(url.get('status')).toBe('active');
  const outgoing=new URLSearchParams(calls.at(-1));expect(outgoing.has('trace')).toBe(false);
  expect(outgoing.get('mfa')).toBe('disabled');expect(outgoing.get('status')).toBe('active');
 });
 test('PUSR-109 Whitespace-only Search URL is retained but omitted from the backend query',async({page})=>{
  const queries:string[]=[];
  await openPlatformUsers(page,{query:'search=%20%20%20',onCall:(m,p,q)=>{if(m==='GET'&&p===usersPath)queries.push(q.toString());}});
  await expect(card(page,'Alex Operator')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('search')).toBe('   ');
  await expect.poll(()=>queries.length).toBeGreaterThan(0);
  expect(new URLSearchParams(queries.at(-1)).has('search')).toBe(false);
 });
 test('PUSR-110 Create defaults to platform_viewer and masks temporary password input',async({page})=>{
  await openPlatformUsers(page);
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await expect(section.getByLabel('Role')).toHaveValue('platform_viewer');
  await expect(section.getByLabel('Temporary password')).toHaveAttribute('type','password');
  await expect(section.getByLabel('Email')).toHaveAttribute('type','email');
 });
 test('PUSR-111 A temporary password of exactly ten characters meets the frontend minimum',async({page})=>{
  await openPlatformUsers(page);
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('ten-char@fixture.test');await section.getByLabel('Name').fill('Minimum Password');
  await section.getByLabel('Temporary password').fill('1234567890');
  await expect(section.getByRole('button',{name:'Create Platform user'})).toBeEnabled();
 });
 test('PUSR-112 Create failure preserves masked secret and chosen role for correction',async({page})=>{
  await openPlatformUsers(page,{respond:(m,p)=>m==='POST'&&p===usersPath?{status:409,json:{message:'Duplicate email'}}:undefined});
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('duplicate@fixture.test');await section.getByLabel('Name').fill('Retry Person');
  await section.getByLabel('Role').selectOption('ops');await section.getByLabel('Temporary password').fill('retry-password-12');
  await section.getByRole('button',{name:'Create Platform user'}).click();
  await expect(root(page)).toContainText('Action failed.');
  await expect(section.getByLabel('Temporary password')).toHaveAttribute('type','password');
  await expect(section.getByLabel('Temporary password')).toHaveValue('retry-password-12');
  await expect(section.getByLabel('Role')).toHaveValue('ops');
 });
 test('PUSR-113 Dismissing a create-success message does not remove the newly created user',async({page})=>{
  const writes:string[]=[];await openPlatformUsers(page,{onCall:(m,p)=>{if(m==='POST'&&p===usersPath)writes.push(p);}});
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('created@fixture.test');await section.getByLabel('Name').fill('Created Operator');
  await section.getByLabel('Temporary password').fill('1234567890');
  await section.getByRole('button',{name:'Create Platform user'}).click();
  await expect(card(page,'Created Operator')).toBeVisible();
  await root(page).locator('.platform-users__success').getByRole('button',{name:'Dismiss'}).click();
  await expect(root(page).locator('.platform-users__success')).toHaveCount(0);
  await expect(card(page,'Created Operator')).toBeVisible();expect(writes).toHaveLength(1);
 });
 test('PUSR-114 Selecting another password-reset target removes the first unsent secret',async({page})=>{
  await openPlatformUsers(page);
  const first=card(page,'Alex Operator'),second=card(page,'Beth Disabled');
  await first.getByRole('button',{name:'Reset password',exact:true}).click();
  await first.getByLabel('New temporary password').fill('first-secret-1234');
  await second.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(first.getByLabel('New temporary password')).toHaveCount(0);
  await expect(second.getByLabel('New temporary password')).toHaveValue('');
 });
 test('PUSR-115 Reset-password form is independently available without session-revoke grants',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.sessions.revoke','platform.support_sessions.end')});
  const target=card(page,'Alex Operator');
  await expect(target.getByRole('button',{name:'Revoke access'})).toHaveCount(0);
  await target.getByRole('button',{name:'Reset password',exact:true}).click();
  await target.getByLabel('New temporary password').fill('synthetic-12char');
  await expect(target.getByRole('button',{name:'Reset password & revoke access'})).toBeEnabled();
 });
 test('PUSR-116 A user without audit-read can still have separately authorized sessions and security links',async({page})=>{
  await openPlatformUsers(page,{permissions:without('platform.audit.read')});
  const links=card(page,'Alex Operator').locator('.platform-users__source-links');
  await expect(links.getByRole('link',{name:'Audit history'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Platform sessions'})).toBeVisible();
  await expect(links.getByRole('link',{name:'Security'})).toBeVisible();
 });
 test('PUSR-117 HTML-looking API error message is displayed as inert text',async({page})=>{
  const hostile='<img src=x onerror=alert(117)>';
  await openPlatformUsers(page,{respond:(m,p)=>m==='POST'&&p===usersPath?{status:409,json:{message:hostile}}:undefined});
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('error@fixture.test');await section.getByLabel('Name').fill('Error Case');
  await section.getByLabel('Temporary password').fill('1234567890');
  await section.getByRole('button',{name:'Create Platform user'}).click();
  await expect(root(page).locator('.platform-users__warning')).toContainText(hostile);
  await expect(root(page).locator('.platform-users__warning').locator('img,script,iframe')).toHaveCount(0);
 });
 test('PUSR-118 Pending create disables other identity lifecycle buttons until response',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await openPlatformUsers(page,{respond:async(m,p)=>m==='POST'&&p===usersPath?(await gate,{status:201,json:{...activeUser,id:'a9500000-0000-4000-8000-000000000098'}}):undefined});
  const section=root(page).locator('section').filter({hasText:'Create Platform user'}).first();
  await section.getByLabel('Email').fill('pending@fixture.test');await section.getByLabel('Name').fill('Pending Person');
  await section.getByLabel('Temporary password').fill('1234567890');
  try{
   await section.getByRole('button',{name:'Create Platform user'}).click();
   await expect(card(page,'Alex Operator').getByRole('button',{name:'Edit details'})).toBeDisabled();
   await expect(card(page,'Alex Operator').getByRole('button',{name:'Deactivate'})).toBeDisabled();
  }finally{release();}
 });
 test('PUSR-119 Initial registry pending state avoids presenting fictitious users',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  try{
   await openPlatformUsers(page,{respond:async(m,p)=>m==='GET'&&p===usersPath?(await gate,{json:{users:[activeUser]}}):undefined});
   await expect(root(page).locator('.platform-users__loading')).toContainText('Loading Platform users');
   await expect(root(page).locator('article.platform-users__card')).toHaveCount(0);
  }finally{release();}
 });

});
