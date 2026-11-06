import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 35: tenant role-permission matrix UI with intercepted GETs.
// Authorization, tenant isolation, SQL persistence and role-policy writes remain unverified.
type Call={method:string;path:string;body:unknown};
const catalog=[
 {permission:'dashboard.read',label:'Dashboard access',group:'Core'},
 {permission:'products.read',label:'Product viewing',group:'Inventory'},
 {permission:'products.write',label:'Product editing',group:'Inventory'},
 {permission:'stock.read',label:'Stock viewing',group:'Inventory'},
 {permission:'reports.read',label:'Report viewing',group:'Reports'},
 {permission:'users.read',label:'User directory',group:'Administration'},
 {permission:'users.write',label:'User administration',group:'Administration'},
 {permission:'tenant.delete',label:'Tenant deletion',group:'Administration'}
];
const makeRole=(role:string,extras:Record<string,unknown>={})=>({role,role_kind:'built_in',display_name:role[0].toUpperCase()+role.slice(1),
 editable:true,default_permissions:['dashboard.read','products.read'],effective_permissions:['dashboard.read','products.read'],
 locked_permissions:['dashboard.read'],forbidden_permissions:['tenant.delete','users.write'],override_count:0,
 is_default:true,is_active:true,user_count:2,revision:'a'.repeat(64),...extras});
const matrix={scope:'tenant',tenant_id:'pw-tenant',editable_roles:['manager','staff'],
 permission_catalog:catalog,permission_dependencies:{'products.write':['products.read']},
 custom_role_templates:[{key:'receiving',name:'Receiving Clerk Template',description:'Receive inventory',category:'Operations',permission_count:2,permissions:['dashboard.read','stock.read']}],
 roles:[
  makeRole('admin',{editable:false,default_permissions:catalog.map(x=>x.permission),effective_permissions:catalog.map(x=>x.permission),locked_permissions:catalog.map(x=>x.permission),forbidden_permissions:[],user_count:1}),
  makeRole('manager',{default_permissions:['dashboard.read','products.read','reports.read'],effective_permissions:['dashboard.read','products.read','reports.read']}),
  makeRole('staff',{default_permissions:['dashboard.read','products.read'],effective_permissions:['dashboard.read','products.read']}),
  makeRole('custom:11111111-1111-4111-8111-111111111111',{role_id:'11111111-1111-4111-8111-111111111111',role_kind:'custom',display_name:'Receiving Clerk',description:'Warehouse receiving',default_permissions:['dashboard.read','stock.read'],effective_permissions:['dashboard.read','stock.read'],locked_permissions:['dashboard.read'],forbidden_permissions:['tenant.delete','users.write'],source_template_key:'receiving',source_template_name:'Receiving Clerk Template',version:2,user_count:0,active_user_count:0,inactive_user_count:0,can_activate:true,can_deactivate:true,can_delete:true})
 ],governance:{role_model:'built-in and custom tenant roles',support_roles_editable:false,admin_lockout_protection:true,reserved_permissions_enforced:true,custom_roles_tenant_isolated:true,per_user_permission_overrides:false,custom_roles_use_staff_safety_base:true}};
async function openPermissions(page:Page,opts:{status?:number;customRoles?:boolean}={}){
 await loginAsTenant(page);
 const calls:Call[]=[];
 await page.route('**/permissions**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const p=new URL(req.url()).pathname,m=req.method();const body=req.postDataJSON?.()??null;
  calls.push({method:m,path:p,body});
  if(m==='GET'&&p.endsWith('/permissions'))return fulfillJson(route,
   opts.status?{message:'Synthetic policy matrix denied'}:{...matrix,roles:opts.customRoles===false?matrix.roles.slice(0,3):matrix.roles},opts.status??200);
  if(m==='GET'&&p.endsWith('/permissions/me'))return fulfillJson(route,{scope:'tenant',tenant_id:'pw-tenant',user_id:'pw-admin',role:'admin',permissions:catalog.map(x=>x.permission)});
  return fulfillJson(route,{message:`Unexpected synthetic permission request ${m} ${p}`},405);
 });
 await page.goto('/permissions');
 if(!opts.status)await expect(page.getByRole('heading',{name:'Tenant permission management'})).toBeVisible();
 return {calls};
}
const writes=(calls:Call[])=>calls.filter(c=>c.method!=='GET');
const role=(page:Page,name:string)=>page.locator('.role-permission-editor__role-card').filter({has:page.locator('strong',{hasText:name})}).first();
const search=(page:Page)=>page.getByRole('textbox',{name:'Search permissions'});
const perm=(page:Page,label:string)=>page.locator('.role-permission-editor__permission-row').filter({hasText:label});
const group=(page:Page,name:string)=>page.locator('.role-permission-editor__group-card').filter({hasText:name});
async function manager(page:Page){await role(page,'Manager').click();await expect(role(page,'Manager')).toHaveClass(/is-active/);}
async function showInventory(page:Page){await group(page,'Inventory').locator('button.role-permission-editor__group-toggle').click();}

// Twenty focused, read-only / local-draft assertions. Save, reset, custom-role
// mutations and permission reauthorization belong to the next batch/Phase 2.
test.describe('Tenant Permissions — matrix, selection and local edits (Batch 35)',()=>{
 test('TPER-001 Policy editor loads tenant GET matrix with no write',async({page})=>{
  const s=await openPermissions(page);await expect(page.getByRole('heading',{name:'Tenant permission management'})).toBeVisible();
  expect(s.calls.some(c=>c.method==='GET'&&c.path.endsWith('/permissions'))).toBe(true);expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-002 Overview gives source-backed permission, built-in and custom counts',async({page})=>{
  await openPermissions(page);const overview=page.getByLabel('Tenant permission overview');
  for(const label of ['Permissions','Built-in roles','Custom roles','Selected enabled','Locked'])await expect(overview).toContainText(label);
  await expect(overview).toContainText('8');await expect(overview).toContainText('3');
 });
 test('TPER-003 Admin baseline is protected and save stays disabled',async({page})=>{
  const s=await openPermissions(page);await expect(page.locator('.role-permission-editor__toolbar-copy')).toContainText('protected');
  await expect(page.getByRole('button',{name:'Save role permissions'}).first()).toBeDisabled();expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-004 Selecting Manager changes role panel without a policy write',async({page})=>{
  const s=await openPermissions(page);await manager(page);
  await expect(page.locator('.role-permission-editor__toolbar-copy h2')).toHaveText('Manager');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-005 Selecting Staff shows its own defaults and assigned users',async({page})=>{
  const s=await openPermissions(page);await role(page,'Staff').click();
  await expect(page.locator('.role-permission-editor__toolbar-copy h2')).toHaveText('Staff');
  await expect(role(page,'Staff')).toContainText('2 assigned users');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-006 Custom role card identifies starting template',async({page})=>{
  const s=await openPermissions(page);await role(page,'Receiving Clerk').click();
  await expect(role(page,'Receiving Clerk')).toContainText('Receiving Clerk Template');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-007 Search by human-readable permission label narrows result',async({page})=>{
  await openPermissions(page);await search(page).fill('Product editing');
  await expect(page.locator('.role-permission-editor__permission-row')).toHaveCount(1);
  await expect(perm(page,'Product editing')).toBeVisible();
 });
 test('TPER-008 Search by technical permission key matches hidden key',async({page})=>{
  await openPermissions(page);await search(page).fill('products.write');
  await expect(page.locator('.role-permission-editor__permission-row')).toHaveCount(1);
  await expect(perm(page,'Product editing')).toBeVisible();
 });
 test('TPER-009 Search by permission group matches all group members',async({page})=>{
  await openPermissions(page);await search(page).fill('Inventory');
  await expect(page.locator('.role-permission-editor__permission-row')).toHaveCount(3);
  await expect(perm(page,'Stock viewing')).toBeVisible();
 });
 test('TPER-010 No-match search provides Clear search recovery',async({page})=>{
  await openPermissions(page);await search(page).fill('no-such-synthetic-permission');
  await expect(page.locator('.role-permission-editor__empty-search')).toContainText('No permissions match');
  await page.getByRole('button',{name:'Clear search'}).click();await expect(search(page)).toHaveValue('');
 });
 test('TPER-011 Show technical keys reveals permission identifiers',async({page})=>{
  await openPermissions(page);await search(page).fill('Product editing');
  await expect(perm(page,'Product editing').locator('code')).toHaveCount(0);
  await page.getByRole('button',{name:'Show technical keys'}).click();
  await expect(perm(page,'Product editing').locator('code')).toHaveText('products.write');
 });
 test('TPER-012 Hide technical keys removes identifiers from accessible rows',async({page})=>{
  await openPermissions(page);await search(page).fill('Product editing');
  await page.getByRole('button',{name:'Show technical keys'}).click();
  await page.getByRole('button',{name:'Hide technical keys'}).click();
  await expect(perm(page,'Product editing').locator('code')).toHaveCount(0);
 });
 test('TPER-013 Expand all reveals grouped permissions without mutation',async({page})=>{
  const s=await openPermissions(page);await page.getByRole('button',{name:'Expand all'}).click();
  await expect(perm(page,'Product editing')).toBeVisible();expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-014 Collapse all hides permission rows until expanded',async({page})=>{
  const s=await openPermissions(page);await page.getByRole('button',{name:'Expand all'}).click();
  await page.getByRole('button',{name:'Collapse all'}).click();
  await expect(group(page,'Inventory').locator('button.role-permission-editor__group-toggle')).toHaveAttribute('aria-expanded','false');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-015 Clicking Inventory group toggles its expansion state',async({page})=>{
  await openPermissions(page);const toggle=group(page,'Inventory').locator('button.role-permission-editor__group-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded','false');await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(perm(page,'Product viewing')).toBeVisible();
 });
 test('TPER-016 Manager can locally enable permitted Product editing with dependency',async({page})=>{
  const s=await openPermissions(page);await manager(page);await showInventory(page);
  await perm(page,'Product editing').locator('input[type="checkbox"]').check();
  await expect(perm(page,'Product editing').locator('input')).toBeChecked();
  await expect(perm(page,'Product viewing').locator('input')).toBeChecked();expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-017 Locked dashboard access cannot be disabled for Manager',async({page})=>{
  const s=await openPermissions(page);await manager(page);await group(page,'Core').locator('button.role-permission-editor__group-toggle').click();
  await expect(perm(page,'Dashboard access').locator('input')).toBeDisabled();
  await expect(perm(page,'Dashboard access')).toContainText('Locked');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-018 Reserved tenant-delete permission cannot be granted',async({page})=>{
  const s=await openPermissions(page);await manager(page);await group(page,'Administration').locator('button.role-permission-editor__group-toggle').click();
  await expect(perm(page,'Tenant deletion').locator('input')).toBeDisabled();
  await expect(perm(page,'Tenant deletion')).toContainText('Tenant Admin only');expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-019 Unsaved draft makes Save active but sends no request before confirmation',async({page})=>{
  const s=await openPermissions(page);await manager(page);await showInventory(page);
  await perm(page,'Product editing').locator('input').check();
  await expect(page.getByRole('button',{name:'Save role permissions'}).first()).toBeEnabled();
  await expect(page.locator('.role-permission-editor__action-bar')).toContainText('Unsaved permission changes');
  expect(writes(s.calls)).toHaveLength(0);
 });
 test('TPER-020 Cancelled Save confirmation performs no policy PUT',async({page})=>{
  const s=await openPermissions(page);await manager(page);await showInventory(page);
  await perm(page,'Product editing').locator('input').check();
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Save role permissions'}).first().click();
  await expect(perm(page,'Product editing').locator('input')).toBeChecked();expect(writes(s.calls)).toHaveLength(0);
 });
});
