import {test, expect, type Page, type Route} from '@playwright/test';
import {loginAsTenant, fulfillJson} from '../../../support/tenantSession';

// Batch 34 — Tenant Users, browser-observable GET and intercepted creation requests.
// All names, ids, emails and responses are synthetic. NEVER run against production.
type User={id:string;tenant_id:string;name:string;role:'admin'|'manager'|'staff';email:string;
 created_at:string;last_login_at:string|null;is_active:boolean;revision:string;
 custom_role_id?:string|null;custom_role_name?:string|null;access_role_label?:string};
const sampleUsers:User[]=[
 {id:'pw-admin-1',tenant_id:'pw-tenant',name:'Synthetic Admin One',email:'admin.one@example.invalid',role:'admin',is_active:true,revision:'rev-1',created_at:'2026-01-01T10:00:00Z',last_login_at:'2026-11-01T10:00:00Z'},
 {id:'pw-admin-2',tenant_id:'pw-tenant',name:'Synthetic Admin Two',email:'admin.two@example.invalid',role:'admin',is_active:true,revision:'rev-1',created_at:'2026-01-01T10:00:00Z',last_login_at:null},
 {id:'pw-manager',tenant_id:'pw-tenant',name:'Synthetic Supervisor',email:'manager@example.invalid',role:'manager',is_active:true,revision:'rev-2',created_at:'2026-01-02T10:00:00Z',last_login_at:null},
 {id:'pw-inactive',tenant_id:'pw-tenant',name:'Synthetic Inactive',email:'inactive@example.invalid',role:'staff',is_active:false,revision:'rev-3',created_at:'2026-01-03T10:00:00Z',last_login_at:null},
 {id:'pw-custom',tenant_id:'pw-tenant',name:'Synthetic Technician',email:'tech@example.invalid',role:'staff',custom_role_id:'pw-role-1',custom_role_name:'Technician',access_role_label:'Technician',is_active:true,revision:'rev-4',created_at:'2026-01-03T10:00:00Z',last_login_at:null}
];
const roleOptions={built_in_roles:[
 {key:'staff',role:'staff',kind:'built_in',label:'Staff'},
 {key:'manager',role:'manager',kind:'built_in',label:'Manager'},
 {key:'admin',role:'admin',kind:'built_in',label:'Admin'}],
 custom_roles:[{key:'custom:pw-role-1',role:'staff',custom_role_id:'pw-role-1',kind:'custom',label:'Technician',permission_count:5}]};
type Call={method:string;url:string;body:Record<string,unknown>|null};
type Setup={rows?:User[];loadStatus?:number;roleStatus?:number;createStatus?:number};
async function openUsers(page:Page,setup:Setup={}){
 await loginAsTenant(page);
 const calls:Call[]=[];const users=[...(setup.rows??sampleUsers)];
 await page.route('**/users**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),p=u.pathname,method=req.method(),body=req.postDataJSON?.()??null;
  calls.push({method,url:p+u.search,body});
  if(p.endsWith('/users/role-options'))return fulfillJson(route,
   setup.roleStatus?{message:'Synthetic role options unavailable'}:roleOptions,setup.roleStatus??200);
  if(p.endsWith('/users')&&method==='GET')return fulfillJson(route,
   setup.loadStatus?{message:'Synthetic user directory unavailable'}:users,setup.loadStatus??200);
  if(p.endsWith('/users')&&method==='POST'){
   if(setup.createStatus)return fulfillJson(route,{message:'Synthetic duplicate email',code:'UNIQUE_CONSTRAINT_VIOLATION'},setup.createStatus);
   const submitted=body as Record<string,unknown>;
   const item:User={id:'pw-created',tenant_id:'pw-tenant',name:String(submitted.name),email:String(submitted.email),
    role:submitted.role as User['role'],is_active:true,created_at:'2026-11-03T11:00:00Z',last_login_at:null,revision:'rev-created',
    custom_role_id:submitted.custom_role_id as string|null};
   users.push(item);return fulfillJson(route,item,201);
  }
  // Never pass through unexpected account mutations in a disposable test.
  return fulfillJson(route,{message:`Unexpected synthetic user ${method} ${p}`},405);
 });
 await page.goto('/users');
 if(!setup.loadStatus)await expect(page.getByRole('heading',{name:'Tenant user management'})).toBeVisible();
 return {calls,users};
}
const cards=(page:Page)=>page.locator('article.users-card');
const card=(page:Page,name:string)=>cards(page).filter({hasText:name});
const search=(page:Page)=>page.getByRole('textbox',{name:'Search tenant users'});
const statusFilter=(page:Page)=>page.getByRole('combobox',{name:'Filter users by status'});
const createForm=(page:Page)=>page.locator('#tenant-user-form-panel');
const submit=(page:Page)=>createForm(page).locator('form.users-form button[type="submit"]');
async function startCreate(page:Page){await page.getByRole('button',{name:'Create user',exact:true}).first().click();await expect(createForm(page)).toBeVisible();}
async function fillValid(page:Page,role='staff'){
 await createForm(page).locator('#user-name').fill('  Synthetic New Member  ');
 await createForm(page).locator('#user-email').fill('  NEW.MEMBER@EXAMPLE.INVALID  ');
 await createForm(page).locator('#user-role').selectOption(role);
 await createForm(page).locator('#user-password').fill('synthetic-test-only-passphrase');
}
const writes=(calls:Call[])=>calls.filter(c=>c.method!=='GET');

test.describe('Tenant Users — directory and create-account boundaries (Batch 34)',()=>{
 test('TUSR-001 Directory and role choices use tenant user GET endpoints',async({page})=>{
  const {calls}=await openUsers(page);
  await expect(page.getByRole('heading',{name:'Tenant user directory'})).toBeVisible();
  expect(calls.some(c=>c.method==='GET'&&c.url.endsWith('/users'))).toBe(true);
  expect(calls.some(c=>c.method==='GET'&&c.url.endsWith('/users/role-options'))).toBe(true);
  expect(writes(calls)).toHaveLength(0);
 });
 test('TUSR-002 Summary cards distinguish active, inactive, admins and custom-role users',async({page})=>{
  await openUsers(page);const summary=page.getByLabel('Tenant user overview');
  for(const label of ['Active users','Inactive users','Admins','Managers','Staff','Custom-role users'])
   await expect(summary).toContainText(label);
  await expect(summary).toContainText('4');await expect(summary).toContainText('1');
 });
 test('TUSR-003 Search filters directory by account name case-insensitively',async({page})=>{
  await openUsers(page);await search(page).fill('sUpErViSoR');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,'Synthetic Supervisor')).toBeVisible();
 });
 test('TUSR-004 Search filters directory by email substring',async({page})=>{
  await openUsers(page);await search(page).fill('TECH@EXAMPLE.INVALID');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,'Synthetic Technician')).toBeVisible();
 });
 test('TUSR-005 Search matches displayed custom access role label',async({page})=>{
  await openUsers(page);await search(page).fill('technician');
  await expect(card(page,'Synthetic Technician')).toBeVisible();await expect(cards(page)).toHaveCount(1);
 });
 test('TUSR-006 Active status filter hides inactive directory accounts',async({page})=>{
  await openUsers(page);await statusFilter(page).selectOption('active');
  await expect(cards(page)).toHaveCount(4);await expect(card(page,'Synthetic Inactive')).toHaveCount(0);
 });
 test('TUSR-007 Inactive status filter isolates deactivated accounts',async({page})=>{
  await openUsers(page);await statusFilter(page).selectOption('inactive');
  await expect(cards(page)).toHaveCount(1);await expect(card(page,'Synthetic Inactive')).toBeVisible();
 });
 test('TUSR-008 No-match search shows filter empty state without write requests',async({page})=>{
  const {calls}=await openUsers(page);await search(page).fill('nonexistent-synthetic-account');
  await expect(cards(page)).toHaveCount(0);await expect(page.locator('.users-empty-state')).toContainText('No users matched');
  expect(writes(calls)).toHaveLength(0);
 });
 test('TUSR-009 Empty tenant directory offers the create-user next step',async({page})=>{
  await openUsers(page,{rows:[]});await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('.users-empty-state')).toContainText('No tenant users exist yet');
 });
 test('TUSR-010 Refresh refetches users and displays success feedback',async({page})=>{
  const {calls}=await openUsers(page);const before=calls.filter(c=>c.method==='GET'&&c.url.endsWith('/users')).length;
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(c=>c.method==='GET'&&c.url.endsWith('/users')).length).toBeGreaterThan(before);
  await expect(page.getByRole('status')).toContainText('Users refreshed.');
 });
 test('TUSR-011 Missing last login displays Never rather than a fabricated timestamp',async({page})=>{
  await openUsers(page);await expect(card(page,'Synthetic Supervisor')).toContainText('Never');
 });
 test('TUSR-012 Card displays custom role model and account status',async({page})=>{
  await openUsers(page);const person=card(page,'Synthetic Technician');
  await expect(person).toContainText('TECHNICIAN');await expect(person).toContainText('ACTIVE');
  await expect(person).toContainText('Tenant custom role');
 });
 test('TUSR-013 Create user opens a dedicated account form work area',async({page})=>{
  await openUsers(page);await startCreate(page);
  await expect(page.locator('#tenant-user-directory-panel')).toHaveCount(0);
  await expect(createForm(page).getByRole('heading',{name:'Create tenant user'})).toBeVisible();
  await expect(createForm(page).locator('#user-password')).toHaveAttribute('type','password');
 });
 test('TUSR-014 Empty required fields prevent submission or POST',async({page})=>{
  const {calls}=await openUsers(page);await startCreate(page);
  await expect(submit(page)).toBeDisabled();expect(writes(calls)).toHaveLength(0);
 });
 test('TUSR-015 Invalid email keeps the form disabled with invalid input marker',async({page})=>{
  const {calls}=await openUsers(page);await startCreate(page);await fillValid(page);
  await createForm(page).locator('#user-email').fill('not-an-address');
  await expect(createForm(page).locator('#user-email')).toHaveAttribute('aria-invalid','true');
  await expect(submit(page)).toBeDisabled();expect(writes(calls)).toHaveLength(0);
 });
 test('TUSR-016 Password shorter than ten characters blocks create and reports length',async({page})=>{
  const {calls}=await openUsers(page);await startCreate(page);await fillValid(page);
  await createForm(page).locator('#user-password').fill('short');
  await expect(createForm(page)).toContainText('Password must contain at least 10 characters.');
  await expect(submit(page)).toBeDisabled();expect(writes(calls)).toHaveLength(0);
 });
 test('TUSR-017 Show and Hide password toggles the input type only',async({page})=>{
  const {calls}=await openUsers(page);await startCreate(page);await fillValid(page);
  await createForm(page).getByRole('button',{name:'Show password'}).click();
  await expect(createForm(page).locator('#user-password')).toHaveAttribute('type','text');
  await createForm(page).getByRole('button',{name:'Hide password'}).click();
  await expect(createForm(page).locator('#user-password')).toHaveAttribute('type','password');
  expect(writes(calls)).toHaveLength(0);
 });
 test('TUSR-018 Built-in and custom assignable roles appear from options endpoint',async({page})=>{
  await openUsers(page);await startCreate(page);
  await expect(createForm(page).locator('#user-role option[value="manager"]')).toHaveText('Manager');
  await expect(createForm(page).locator('#user-role option[value="custom:pw-role-1"]')).toContainText('Technician');
 });
 test('TUSR-019 Valid create trims name, lowercases email, sends role and shows success',async({page})=>{
  const {calls}=await openUsers(page);await startCreate(page);await fillValid(page);
  await expect(submit(page)).toBeEnabled();await submit(page).click();
  await expect.poll(()=>writes(calls).length).toBe(1);
  const call=writes(calls)[0];expect(call.method).toBe('POST');expect(call.url).toMatch(/\/users$/);
  expect(call.body).toMatchObject({name:'Synthetic New Member',email:'new.member@example.invalid',role:'staff',custom_role_id:null});
  await expect(page.getByRole('status')).toContainText('User created successfully.');
 });
 test('TUSR-020 Duplicate email response keeps form and displays field-level conflict',async({page})=>{
  const {calls}=await openUsers(page,{createStatus:409});await startCreate(page);await fillValid(page);
  await submit(page).click();await expect.poll(()=>writes(calls).length).toBe(1);
  await expect(page.getByRole('alert')).toContainText('This email is already used by another tenant user.');
  await expect(createForm(page).locator('#user-email')).toHaveAttribute('aria-invalid','true');
  await expect(createForm(page)).toBeVisible();
 });
});
