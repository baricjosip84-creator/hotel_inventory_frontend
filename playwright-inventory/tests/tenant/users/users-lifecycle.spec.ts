import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 35. Synthetic, intercepted account-management journeys. Backend mutation,
// permission enforcement, session invalidation and historical retention are NOT proved.
// Always use a separately provisioned disposable tenant; never run on production.
type User = {id:string; tenant_id:string; name:string; email:string; role:'admin'|'manager'|'staff';
 is_active:boolean;revision:string;created_at:string;last_login_at:null;custom_role_id?:string|null;
 custom_role_name?:string|null;access_role_label?:string};
type Call={method:string;path:string;body:Record<string,unknown>|null};
type Options={rows?:User[];createErrorCode?:string;createErrorMessage?:string;updateErrorCode?:string;updateErrorMessage?:string;singleAdmin?:boolean;self?:boolean;listStatus?:number;roleStatus?:number;createStatus?:number;
 updateStatus?:number;statusStatus?:number;deleteStatus?:number;refreshFailure?:boolean;delayCreate?:boolean};
const USER_IDS:Record<string,string>={
 'pw-admin-other':'00000000-0000-4000-8000-000000000001',
 'pw-manager':'00000000-0000-4000-8000-000000000002',
 'pw-target':'00000000-0000-4000-8000-000000000003',
 'pw-inactive':'00000000-0000-4000-8000-000000000004',
 'pw-new':'00000000-0000-4000-8000-000000000005'
};
const REVISION='b'.repeat(64);
const CUSTOM_ROLE_ID='11111111-1111-4111-8111-111111111111';
const user=(key:string,name:string,role:User['role']='staff',active=true):User=>({
 id:USER_IDS[key]??key,tenant_id:'pw-tenant',name,email:`${key}@example.invalid`,
 role,is_active:active,revision:REVISION,created_at:'2026-01-01T00:00:00Z',last_login_at:null});
const roles={built_in_roles:[{key:'staff',role:'staff',label:'Staff',kind:'built_in'},
 {key:'manager',role:'manager',label:'Manager',kind:'built_in'},
 {key:'admin',role:'admin',label:'Admin',kind:'built_in'}],
 custom_roles:[{key:`custom:${CUSTOM_ROLE_ID}`,role:'staff',custom_role_id:CUSTOM_ROLE_ID,kind:'custom',label:'Technician',permission_count:5}]};
const form=(page:Page)=>page.locator('#tenant-user-form-panel');
const card=(page:Page,name:string)=>page.locator('article.users-card').filter({hasText:name});
const writes=(calls:Call[])=>calls.filter(c=>c.method!=='GET');
const submit=(page:Page)=>form(page).locator('button[type="submit"]');
async function getSessionId(page:Page):Promise<string|null>{
 return page.evaluate(()=>{
  const token=localStorage.getItem('inventory_access_token');
  if(!token)return null;
  try{const data=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
   return typeof data.id==='string'?data.id:typeof data.user_id==='string'?data.user_id:null;
  }catch{return null;}
 });
}
async function setup(page:Page,opts:Options={},readOnly=false){
 if(readOnly)await loginAsDisposableRole(page,'PW_USERS_READ_ONLY');else await loginAsTenant(page);
 const actualId=await getSessionId(page);
 if(opts.self&&!actualId)throw new Error('Disposable login token needs id/user_id for self-protection scenario');
 let rows=opts.rows??[user('pw-admin-other','Synthetic Admin Two','admin'),user('pw-manager','Synthetic Manager','manager'),
  user('pw-target','Synthetic Target'),user('pw-inactive','Synthetic Inactive','staff',false)];
 if(opts.singleAdmin&&opts.self)rows=rows.filter(x=>x.id!=='pw-admin-other');
 if(opts.self&&actualId)rows.push({...user(actualId,'Synthetic Current Admin','admin'),email:'self@example.invalid'});
 const calls:Call[]=[];let userReads=0;let releaseCreate:(()=>void)|undefined;
 await page.route('**/users**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),p=u.pathname,m=req.method();
  const body=(req.postDataJSON?.()??null) as Record<string,unknown>|null;
  calls.push({method:m,path:p+u.search,body});
  if(m==='GET'&&p.endsWith('/users/role-options'))return fulfillJson(route,
   opts.roleStatus?{message:'Synthetic role catalog unavailable'}:roles,opts.roleStatus??200);
  if(m==='GET'&&p.endsWith('/users')){
   userReads++;
   const error=opts.listStatus||(opts.refreshFailure&&userReads>1?503:0);
   return fulfillJson(route,error?{message:'Synthetic directory unavailable'}:rows,error||200);
  }
  if(m==='POST'&&p.endsWith('/users')){
   if(opts.delayCreate)await new Promise<void>(resolve=>{releaseCreate=resolve;});
   if(opts.createStatus)return fulfillJson(route,{message:opts.createErrorMessage??'Synthetic creation forbidden',...(opts.createErrorCode?{code:opts.createErrorCode}:{})},opts.createStatus);
   const item={...user('pw-new','Synthetic Created'),name:String(body?.name),email:String(body?.email),
    role:String(body?.role) as User['role'],custom_role_id:body?.custom_role_id as string|null};
   rows=[...rows,item];return fulfillJson(route,item,201);
  }
  if(m==='PUT'&&(p.endsWith('/users/'+USER_IDS['pw-target']) || Boolean(actualId&&p.endsWith('/users/'+actualId)))){
   if(opts.updateStatus)return fulfillJson(route,{message:opts.updateErrorMessage??'Synthetic revision conflict',...(opts.updateErrorCode?{code:opts.updateErrorCode}:{})},opts.updateStatus);
   const id=p.split('/').pop();let item=rows.find(x=>x.id===id);
   if(!item)return fulfillJson(route,{message:'Synthetic user missing'},404);
   item={...item,name:String(body?.name),email:String(body?.email),role:(body?.role as User['role'])??item.role,
    custom_role_id:body?.custom_role_id===undefined?item.custom_role_id:body.custom_role_id as string|null,
    revision:'c'.repeat(64)};
   rows=rows.map(x=>x.id===id?item!:x);return fulfillJson(route,item,200);
  }
  if(m==='PATCH'&&p.endsWith('/status')){
   if(opts.statusStatus)return fulfillJson(route,{message:'Synthetic status write rejected'},opts.statusStatus);
   const id=p.split('/').at(-2);rows=rows.map(x=>x.id===id?{...x,is_active:body?.is_active===true}:x);
   return fulfillJson(route,rows.find(x=>x.id===id),200);
  }
  if(m==='DELETE'&&p.includes('/users/')){
   if(opts.deleteStatus)return fulfillJson(route,{message:'Synthetic historical reference prevents deletion'},opts.deleteStatus);
   const id=p.split('/').pop();rows=rows.filter(x=>x.id!==id);return fulfillJson(route,{message:'User deleted successfully'},200);
  }
  return fulfillJson(route,{message:`Unexpected ${m} ${p}`},405);
 });
 await page.goto('/users');
 if(!opts.listStatus)await expect(page.getByRole('heading',{name:'Tenant user management'})).toBeVisible();
 return {calls,actualId,getRows:()=>rows,release:()=>releaseCreate?.()};
}
async function edit(page:Page,name='Synthetic Target'){
 await card(page,name).getByRole('button',{name:'Edit'}).click();
 await expect(form(page)).toBeVisible();
}
async function validCreate(page:Page){
 await page.getByRole('button',{name:'Create user',exact:true}).first().click();
 await form(page).locator('#user-name').fill('  Synthetic Created  ');
 await form(page).locator('#user-email').fill('  CREATED@EXAMPLE.INVALID  ');
 await form(page).locator('#user-role').selectOption('staff');
 await form(page).locator('#user-password').fill('synthetic-password-only');
}
const accept=(page:Page)=>page.once('dialog',dialog=>dialog.accept());
const dismiss=(page:Page)=>page.once('dialog',dialog=>dialog.dismiss());

// The IDs match the permanent coverage ledger. Each test asserts observable UI
// behavior or the exact browser request boundary with synthetic responses.
test.describe('Tenant Users — account lifecycle (Batch 35)',()=>{
 test('TUSR-021 Creating custom-role user maps custom identifier to staff base role',async({page})=>{
  const s=await setup(page);await validCreate(page);await form(page).locator('#user-role').selectOption(`custom:${CUSTOM_ROLE_ID}`);
  await submit(page).click();await expect.poll(()=>writes(s.calls).length).toBe(1);
  expect(writes(s.calls)[0].body).toMatchObject({role:'staff',custom_role_id:CUSTOM_ROLE_ID});
 });
 test('TUSR-022 Failed role-options lookup retains built-in fallback and warning',async({page})=>{
  const s=await setup(page,{roleStatus:503});await validCreate(page);
  await expect(form(page)).toContainText('Built-in roles remain available');
  await expect(form(page).locator('#user-role option[value="manager"]')).toContainText('Manager');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-023 Forbidden create response leaves form visible with server error',async({page})=>{
  const s=await setup(page,{createStatus:403});await validCreate(page);await submit(page).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic creation forbidden');
  await expect(form(page)).toBeVisible();expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-024 Pending create locks submit and prevents duplicate POSTs',async({page})=>{
  const s=await setup(page,{delayCreate:true});try{
   await validCreate(page);await submit(page).click();
   await expect(submit(page)).toBeDisabled();expect(writes(s.calls)).toHaveLength(1);
  }finally{s.release();}
  await expect(page.getByRole('status')).toContainText('User created successfully.');
 });
 test('TUSR-025 Edit prepopulates profile and role but leaves new password empty',async({page})=>{
  const s=await setup(page);await edit(page);
  await expect(form(page).locator('#user-name')).toHaveValue('Synthetic Target');
  await expect(form(page).locator('#user-email')).toHaveValue('pw-target@example.invalid');
  await expect(form(page).locator('#user-role')).toHaveValue('staff');
  await expect(form(page).locator('#user-password')).toHaveValue('');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-026 Unchanged edit omits password and includes expected revision',async({page})=>{
  const s=await setup(page);await edit(page);await submit(page).click();
  await expect.poll(()=>writes(s.calls).length).toBe(1);
  expect(writes(s.calls)[0]).toMatchObject({method:'PUT',body:{name:'Synthetic Target',role:'staff',expected_revision:REVISION}});
  expect(writes(s.calls)[0].body).not.toHaveProperty('password');
 });
 test('TUSR-027 Role reassignment PUT includes custom role identifier',async({page})=>{
  const s=await setup(page);await edit(page);await form(page).locator('#user-role').selectOption(`custom:${CUSTOM_ROLE_ID}`);await submit(page).click();
  await expect.poll(()=>writes(s.calls).length).toBe(1);
  expect(writes(s.calls)[0].body).toMatchObject({role:'staff',custom_role_id:CUSTOM_ROLE_ID});
 });
 test('TUSR-028 Revision-conflict edit retains form and displays backend message',async({page})=>{
  const s=await setup(page,{updateStatus:409});await edit(page);await form(page).locator('#user-name').fill('Changed synthetic name');
  await submit(page).click();await expect(page.getByRole('alert')).toContainText('Synthetic revision conflict');
  await expect(form(page)).toBeVisible();expect(writes(s.calls)[0].body).toMatchObject({expected_revision:REVISION});
 });
 test('TUSR-029 Password edit includes new password in intercepted request only',async({page})=>{
  const s=await setup(page);await edit(page);await form(page).locator('#user-password').fill('temporary-synthetic-passphrase');
  await submit(page).click();await expect(page.getByRole('status')).toContainText('User updated successfully.');
  expect(writes(s.calls)[0].body).toMatchObject({password:'temporary-synthetic-passphrase'});
  await expect(page.locator('body')).not.toContainText('temporary-synthetic-passphrase');
 });
 test('TUSR-030 Cancel edit returns directory without a network write',async({page})=>{
  const s=await setup(page);await edit(page);await form(page).locator('#user-name').fill('Uncommitted');
  await form(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(page.locator('#tenant-user-directory-panel')).toBeVisible();
  await expect(card(page,'Synthetic Target')).toBeVisible();expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-031 Own directory card hides deactivate and delete buttons',async({page})=>{
  const s=await setup(page,{self:true});await expect(card(page,'Synthetic Current Admin')).toContainText('YOU');
  await expect(card(page,'Synthetic Current Admin').getByRole('button',{name:'Deactivate'})).toHaveCount(0);
  await expect(card(page,'Synthetic Current Admin').getByRole('button',{name:'Delete'})).toHaveCount(0);
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-032 Own role selector is locked while profile remains editable',async({page})=>{
  const s=await setup(page,{self:true});await edit(page,'Synthetic Current Admin');
  await expect(form(page).locator('#user-role')).toBeDisabled();
  await expect(form(page).locator('#user-name')).toBeEnabled();
  await expect(form(page)).toContainText('Your own role assignment cannot be changed');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-033 Sole active admin has a disabled deactivation action',async({page})=>{
  const s=await setup(page,{singleAdmin:true});
  await expect(card(page,'Synthetic Admin Two').getByRole('button',{name:'Deactivate'})).toBeDisabled();
  await expect(card(page,'Synthetic Admin Two').getByRole('button',{name:'Deactivate'}))
   .toHaveAttribute('title','Assign another active admin before deactivating this account');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-034 Sole active admin cannot reassign own remaining admin role',async({page})=>{
  const s=await setup(page,{singleAdmin:true});await edit(page,'Synthetic Admin Two');
  await expect(form(page).locator('#user-role')).toBeDisabled();
  await expect(form(page)).toContainText("only active admin");expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-035 Cancelling deactivate confirmation sends no status PATCH',async({page})=>{
  const s=await setup(page);dismiss(page);await card(page,'Synthetic Target').getByRole('button',{name:'Deactivate'}).click();
  await expect(card(page,'Synthetic Target')).toContainText('ACTIVE');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-036 Confirmed deactivate PATCH sends is_active=false',async({page})=>{
  const s=await setup(page);accept(page);await card(page,'Synthetic Target').getByRole('button',{name:'Deactivate'}).click();
  await expect.poll(()=>writes(s.calls).length).toBe(1);
  expect(writes(s.calls)[0]).toMatchObject({method:'PATCH',body:{is_active:false}});
  await expect(page.getByRole('status')).toContainText('User deactivated successfully.');
 });
 test('TUSR-037 Confirmed reactivate PATCH sends is_active=true',async({page})=>{
  const s=await setup(page);accept(page);await card(page,'Synthetic Inactive').getByRole('button',{name:'Reactivate'}).click();
  await expect.poll(()=>writes(s.calls).length).toBe(1);
  expect(writes(s.calls)[0]).toMatchObject({method:'PATCH',body:{is_active:true}});
  await expect(page.getByRole('status')).toContainText('User activated successfully.');
 });
 test('TUSR-038 Failed status request preserves account display and shows error',async({page})=>{
  const s=await setup(page,{statusStatus:403});accept(page);
  await card(page,'Synthetic Target').getByRole('button',{name:'Deactivate'}).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic status write rejected');
  await expect(card(page,'Synthetic Target')).toContainText('ACTIVE');expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-039 Cancelling inactive deletion sends no DELETE',async({page})=>{
  const s=await setup(page);dismiss(page);await card(page,'Synthetic Inactive').getByRole('button',{name:'Delete'}).click();
  await expect(card(page,'Synthetic Inactive')).toBeVisible();expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-040 Confirmed inactive deletion sends DELETE and success notice',async({page})=>{
  const s=await setup(page);accept(page);await card(page,'Synthetic Inactive').getByRole('button',{name:'Delete'}).click();
  await expect.poll(()=>writes(s.calls).length).toBe(1);
  expect(writes(s.calls)[0].method).toBe('DELETE');
  await expect(page.getByRole('status')).toContainText('User deleted successfully.');
 });
 test('TUSR-041 Historical-reference DELETE rejection keeps user and reports error',async({page})=>{
  const s=await setup(page,{deleteStatus:409});accept(page);
  await card(page,'Synthetic Inactive').getByRole('button',{name:'Delete'}).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic historical reference prevents deletion');
  await expect(card(page,'Synthetic Inactive')).toBeVisible();expect(writes(s.calls)[0].method).toBe('DELETE');
 });
 test('TUSR-042 Read-only role can review directory but cannot access write controls',async({page})=>{
  const s=await setup(page,{},true);await expect(card(page,'Synthetic Target')).toBeVisible();
  await expect(page.getByRole('button',{name:'Create user',exact:true})).toHaveCount(0);
  await expect(card(page,'Synthetic Target').getByRole('button',{name:'Edit'})).toBeDisabled();
  await expect(card(page,'Synthetic Target').getByRole('button',{name:'Deactivate'})).toBeDisabled();
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-043 Unauthorized GET shows load error instead of writable directory',async({page})=>{
  const s=await setup(page,{listStatus:403});
  await expect(page.locator('.app-error-state')).toContainText('Failed to load users:');
  await expect(page.getByRole('button',{name:'Create user',exact:true})).toHaveCount(0);
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-044 Role-options forbidden retains built-in choices',async({page})=>{
  const s=await setup(page,{roleStatus:403});await validCreate(page);
  await expect(form(page)).toContainText('Built-in roles remain available');
  await expect(form(page).locator('#user-role option[value="admin"]')).toHaveText('Admin');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-045 Search filter remains after editing and returning to directory',async({page})=>{
  const s=await setup(page);await page.getByRole('textbox',{name:'Search tenant users'}).fill('target');
  await edit(page);await form(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(page.getByRole('textbox',{name:'Search tenant users'})).toHaveValue('target');
  await expect(page.locator('article.users-card')).toHaveCount(1);expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-046 Initial users GET error leaves account actions unavailable',async({page})=>{
  const s=await setup(page,{listStatus:503});await expect(page.locator('.app-error-state')).toContainText('Synthetic directory unavailable');
  await expect(page.locator('article.users-card')).toHaveCount(0);expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-047 Directory refresh failure reports server error not success',async({page})=>{
  const s=await setup(page,{refreshFailure:true});await page.getByRole('button',{name:'Refresh'}).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic directory unavailable');
  await expect(page.getByRole('status')).not.toContainText('Users refreshed.');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-048 New create form resets prior edit role, password and field errors',async({page})=>{
  const s=await setup(page);await edit(page);await form(page).locator('#user-password').fill('short');
  await page.getByRole('button',{name:'Create user',exact:true}).first().click();
  await expect(form(page).locator('#user-role')).toHaveValue('');
  await expect(form(page).locator('#user-password')).toHaveValue('');
  await expect(form(page).locator('#user-password')).toHaveAttribute('aria-invalid','false');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-049 Cancelled visible edit password resets before new create',async({page})=>{
  const s=await setup(page);await edit(page);await form(page).locator('#user-password').fill('synthetic-secret');
  await form(page).getByRole('button',{name:'Show password'}).click();
  await expect(form(page).locator('#user-password')).toHaveAttribute('type','text');
  await form(page).getByRole('button',{name:'Cancel edit'}).click();
  await page.getByRole('button',{name:'Create user',exact:true}).first().click();
  await expect(form(page).locator('#user-password')).toHaveAttribute('type','password');
  await expect(form(page).locator('#user-password')).toHaveValue('');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-050 Read-only role never issues write despite full directory GET data',async({page})=>{
  const s=await setup(page,{},true);await expect(card(page,'Synthetic Target')).toBeVisible();
  await expect(card(page,'Synthetic Target').getByRole('button',{name:'Edit'})).toBeDisabled();
  await expect(card(page,'Synthetic Inactive').getByRole('button',{name:'Delete'})).toBeDisabled();
  expect(writes(s.calls)).toHaveLength(0);
 });

 // Batch 167 — source-backed Tenant Users browser expectations. All responses are synthetic.
 test('TUSR-051 Search trims whitespace and intersects with inactive-only status',async({page})=>{
  const s=await setup(page);
  await page.getByRole('textbox',{name:'Search tenant users'}).fill('  INACTIVE@EXAMPLE.INVALID  ');
  await page.getByRole('combobox',{name:'Filter users by status'}).selectOption('inactive');
  await expect(page.locator('article.users-card')).toHaveCount(1);
  await expect(card(page,'Synthetic Inactive')).toBeVisible();expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-052 Search includes built-in role when no custom access label exists',async({page})=>{
  const s=await setup(page);
  await page.getByRole('textbox',{name:'Search tenant users'}).fill('STAFF');
  await expect(page.locator('article.users-card')).toHaveCount(2);
  await expect(card(page,'Synthetic Target')).toBeVisible();
  await expect(card(page,'Synthetic Inactive')).toBeVisible();expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-053 Directory counters reflect complete roster even when filters return no cards',async({page})=>{
  const s=await setup(page);
  await page.getByRole('textbox',{name:'Search tenant users'}).fill('no-synthetic-matches');
  await expect(page.locator('article.users-card')).toHaveCount(0);
  await expect(page.getByLabel('Tenant user overview')).toContainText('4 total');
  await page.getByRole('textbox',{name:'Search tenant users'}).clear();
  await expect(page.locator('article.users-card')).toHaveCount(4);expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-054 Effective access label takes precedence over legacy custom role name',async({page})=>{
  const assigned={...user('pw-target','Synthetic Pat'),custom_role_id:CUSTOM_ROLE_ID,
   custom_role_name:'Technician',access_role_label:'Safety Auditor'};
  const s=await setup(page,{rows:[assigned]});
  await expect(card(page,'Synthetic Pat').locator('.users-badge--role')).toContainText('SAFETY AUDITOR');
  await page.getByRole('textbox',{name:'Search tenant users'}).fill('safety auditor');
  await expect(card(page,'Synthetic Pat')).toBeVisible();
  await page.getByRole('textbox',{name:'Search tenant users'}).fill('technician');
  await expect(page.locator('article.users-card')).toHaveCount(0);expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-055 Legacy row with absent active flag renders active instead of inactive',async({page})=>{
  const legacy=user('pw-target','Synthetic Legacy');delete (legacy as Partial<User>).is_active;
  const s=await setup(page,{rows:[legacy]});
  await expect(card(page,'Synthetic Legacy')).toContainText('ACTIVE');
  await expect(card(page,'Synthetic Legacy').getByRole('button',{name:'Deactivate'})).toBeVisible();
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-056 Invalid supplied creation timestamp is shown verbatim, not fabricated',async({page})=>{
  const s=await setup(page,{rows:[{...user('pw-target','Synthetic Date Legacy'),created_at:'legacy-unparsed-date'}]});
  await expect(card(page,'Synthetic Date Legacy')).toContainText('legacy-unparsed-date');
  await expect(card(page,'Synthetic Date Legacy')).toContainText('Never');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-057 Switching directory and form tabs preserves unsaved create draft without a POST',async({page})=>{
  const s=await setup(page);await validCreate(page);
  await form(page).locator('#user-name').fill('Draft Person Not Submitted');
  await page.getByRole('tab',{name:/User directory/}).click();
  await expect(page.locator('#tenant-user-directory-panel')).toBeVisible();
  await page.getByRole('tab',{name:/Create user/}).click();
  await expect(form(page).locator('#user-name')).toHaveValue('Draft Person Not Submitted');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-058 Read-only account cannot activate create tab and does not load assignable role options',async({page})=>{
  const s=await setup(page,{},true);
  await expect(page.getByRole('tab',{name:/Create user/})).toBeDisabled();
  await expect(page.locator('#tenant-user-form-panel')).toHaveCount(0);
  expect(s.calls.filter(x=>x.path.endsWith('/users/role-options'))).toHaveLength(0);
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-059 Editing current identity preserves server-side role fields',async({page})=>{
  const s=await setup(page,{self:true});await edit(page,'Synthetic Current Admin');
  await form(page).locator('#user-name').fill('Synthetic Current Admin Edited');await submit(page).click();
  await expect.poll(()=>writes(s.calls).length).toBe(1);
  const body=writes(s.calls)[0].body;
  expect(writes(s.calls)[0].method).toBe('PUT');expect(body).toMatchObject({name:'Synthetic Current Admin Edited',expected_revision:REVISION});
  expect(body).not.toHaveProperty('role');expect(body).not.toHaveProperty('custom_role_id');
 });
 test('TUSR-060 Own password change explains that other active sessions are revoked',async({page})=>{
  const s=await setup(page,{self:true});await edit(page,'Synthetic Current Admin');
  await expect(form(page)).toContainText('Changing it revokes your other active sessions.');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-061 Editing another account explains all that user sessions are signed out',async({page})=>{
  const s=await setup(page);await edit(page);
  await expect(form(page)).toContainText('Changing it signs this user out of all active sessions.');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-062 Admin role selection unlocks when another active administrator exists',async({page})=>{
  const s=await setup(page,{self:true});await edit(page,'Synthetic Admin Two');
  await expect(form(page).locator('#user-role')).toBeEnabled();
  await expect(form(page)).not.toContainText("only active admin");expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-063 Backend invalid-role error highlights role selector after edit request',async({page})=>{
  const s=await setup(page,{updateStatus:400,updateErrorCode:'INVALID_USER_ROLE',updateErrorMessage:'Invalid user role'});
  await edit(page);await submit(page).click();
  await expect(page.getByRole('alert')).toContainText('Invalid user role');
  await expect(form(page).locator('#user-role')).toHaveAttribute('aria-invalid','true');
  await expect(form(page)).toContainText('Invalid user role');expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-064 Update email uniqueness rejection highlights email and keeps draft open',async({page})=>{
  const s=await setup(page,{updateStatus:409,updateErrorCode:'UNIQUE_CONSTRAINT_VIOLATION',updateErrorMessage:'Duplicate user email'});
  await edit(page);await form(page).locator('#user-email').fill('collision@example.invalid');await submit(page).click();
  await expect(page.getByRole('alert')).toContainText('This email is already used by another tenant user.');
  await expect(form(page).locator('#user-email')).toHaveAttribute('aria-invalid','true');
  await expect(form(page).locator('#user-email')).toHaveValue('collision@example.invalid');
  expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-065 Create API role validation error is bound to role input',async({page})=>{
  const s=await setup(page,{createStatus:400,createErrorCode:'INVALID_USER_ROLE',createErrorMessage:'Invalid user role'});
  await validCreate(page);await submit(page).click();
  await expect(form(page).locator('#user-role')).toHaveAttribute('aria-invalid','true');
  await expect(page.getByRole('alert')).toContainText('Invalid user role');expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-066 Server password validation error marks password field without losing draft',async({page})=>{
  const s=await setup(page,{createStatus:400,createErrorMessage:'Password violates tenant policy'});
  await validCreate(page);await submit(page).click();
  await expect(form(page).locator('#user-password')).toHaveAttribute('aria-invalid','true');
  await expect(form(page)).toContainText('Password violates tenant policy');
  await expect(form(page).locator('#user-name')).toHaveValue('  Synthetic Created  ');expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-067 Correcting server-rejected role clears the role field error before retry',async({page})=>{
  const s=await setup(page,{createStatus:400,createErrorCode:'INVALID_USER_ROLE',createErrorMessage:'Invalid user role'});
  await validCreate(page);await submit(page).click();
  await expect(form(page).locator('#user-role')).toHaveAttribute('aria-invalid','true');
  await form(page).locator('#user-role').selectOption('manager');
  await expect(form(page).locator('#user-role')).toHaveAttribute('aria-invalid','false');
  expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-068 Cancelling failed edit clears stale server error without a second write',async({page})=>{
  const s=await setup(page,{updateStatus:409});await edit(page);await submit(page).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic revision conflict');
  await form(page).getByRole('button',{name:'Cancel edit'}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('#tenant-user-directory-panel')).toBeVisible();expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-069 Successful user creation returns to directory and lists the new user',async({page})=>{
  const s=await setup(page);await validCreate(page);await submit(page).click();
  await expect(page.getByRole('status')).toContainText('User created successfully.');
  await expect(page.locator('#tenant-user-form-panel')).toHaveCount(0);
  await expect(card(page,'Synthetic Created')).toBeVisible();expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-070 Successful edit displays updated name on the directory card',async({page})=>{
  const s=await setup(page);await edit(page);await form(page).locator('#user-name').fill('Synthetic Updated Target');
  await submit(page).click();await expect(page.getByRole('status')).toContainText('User updated successfully.');
  await expect(page.locator('#tenant-user-directory-panel')).toBeVisible();
  await expect(card(page,'Synthetic Updated Target')).toBeVisible();expect(writes(s.calls)).toHaveLength(1);
 });
 test('TUSR-071 Deactivation confirmation explicitly warns about current session revocation',async({page})=>{
  const s=await setup(page);const confirmation=page.waitForEvent('dialog');
  const action=card(page,'Synthetic Target').getByRole('button',{name:'Deactivate'}).click();
  const dialog=await confirmation;expect(dialog.message()).toContain('Their active sessions will be revoked');
  await dialog.dismiss();await action;
  await expect(card(page,'Synthetic Target')).toContainText('ACTIVE');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-072 Reactivation confirmation retains existing credentials and can be dismissed',async({page})=>{
  const s=await setup(page);const confirmation=page.waitForEvent('dialog');
  const action=card(page,'Synthetic Inactive').getByRole('button',{name:'Reactivate'}).click();
  const dialog=await confirmation;expect(dialog.message()).toContain('existing credentials');
  await dialog.dismiss();await action;
  await expect(card(page,'Synthetic Inactive')).toContainText('INACTIVE');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-073 Inactive deletion warns about irreversible history before submitting',async({page})=>{
  const s=await setup(page);const confirmation=page.waitForEvent('dialog');
  const action=card(page,'Synthetic Inactive').getByRole('button',{name:'Delete'}).click();
  const dialog=await confirmation;expect(dialog.message()).toContain('This cannot be undone');
  expect(dialog.message()).toContain('business history references');
  await dialog.dismiss();await action;
  await expect(card(page,'Synthetic Inactive')).toBeVisible();expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-074 Nine-character optional edit password disables save and never sends PUT',async({page})=>{
  const s=await setup(page);await edit(page);await form(page).locator('#user-password').fill('ninechars');
  await expect(submit(page)).toBeDisabled();
  await expect(form(page)).toContainText('Password must contain at least 10 characters.');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TUSR-075 Ten-character edit password is accepted and sent as an update',async({page})=>{
  const s=await setup(page);await edit(page);await form(page).locator('#user-password').fill('tenletters');
  await expect(submit(page)).toBeEnabled();await submit(page).click();
  await expect.poll(()=>writes(s.calls).length).toBe(1);
  expect(writes(s.calls)[0]).toMatchObject({method:'PUT',body:{password:'tenletters',expected_revision:REVISION}});
 });
 test('TUSR-076 Reassigning a custom-role user to built-in role clears custom_role_id',async({page})=>{
  const assigned={...user('pw-target','Synthetic Custom Person'),custom_role_id:CUSTOM_ROLE_ID,custom_role_name:'Technician'};
  const s=await setup(page,{rows:[assigned]});await edit(page,'Synthetic Custom Person');
  await form(page).locator('#user-role').selectOption('manager');await submit(page).click();
  await expect.poll(()=>writes(s.calls).length).toBe(1);
  expect(writes(s.calls)[0]).toMatchObject({method:'PUT',body:{role:'manager',custom_role_id:null,expected_revision:REVISION}});
 });

});
