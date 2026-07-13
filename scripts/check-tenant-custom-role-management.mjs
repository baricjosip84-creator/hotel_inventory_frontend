import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = path.resolve(process.argv[2] || process.env.BACKEND_ROOT || path.join(frontendRoot, '..', 'hotel-inventory-backend'));

function fail(message) {
  throw new Error(`Tenant custom role contract failed: ${message}`);
}

function read(relativePath, root = frontendRoot) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) fail(`missing ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function assertIncludes(source, values, label) {
  for (const value of values) {
    if (!source.includes(value)) fail(`${label} is missing ${value}`);
  }
}

function assertNotIncludes(source, values, label) {
  for (const value of values) {
    if (source.includes(value)) fail(`${label} still contains legacy copy ${value}`);
  }
}

const requireFromBackend = createRequire(path.join(backendRoot, 'package.json'));
const templates = requireFromBackend(path.join(backendRoot, 'src/permissions/tenantCustomRoleTemplates.js'));
const tenantPermissions = requireFromBackend(path.join(backendRoot, 'src/permissions/tenantPermissions.js'));

if (templates.CUSTOM_ROLE_TEMPLATES.length !== 12) fail('expected 2 built-in baselines and 10 recommended templates');
if (templates.CUSTOM_ROLE_TEMPLATES.filter((template) => template.category === 'baseline').length !== 2) fail('expected Manager and Staff baseline templates');
if (templates.CUSTOM_ROLE_TEMPLATES.filter((template) => template.category !== 'baseline').length !== 10) fail('expected 10 recommended operational templates');
for (const template of templates.CUSTOM_ROLE_TEMPLATES) {
  if (!template.permissions.includes(tenantPermissions.TENANT_PERMISSIONS.DASHBOARD_READ)) {
    fail(`${template.key} does not retain dashboard.read`);
  }
  for (const permission of templates.CUSTOM_ROLE_FORBIDDEN_PERMISSIONS) {
    if (template.permissions.includes(permission)) fail(`${template.key} contains reserved permission ${permission}`);
  }
}
const receivingClerk = templates.CUSTOM_ROLE_TEMPLATES.find((template) => template.key === 'receiving_clerk');
if (!receivingClerk) fail('Receiving Clerk template is missing');
if (!receivingClerk.permissions.includes(tenantPermissions.TENANT_PERMISSIONS.SHIPMENTS_RECEIVE)) {
  fail('Receiving Clerk template must retain shipments.receive');
}
if (receivingClerk.permissions.includes(tenantPermissions.TENANT_PERMISSIONS.SHIPMENT_ITEMS_WRITE)) {
  fail('Receiving Clerk template must not include shipment_items.write');
}

const migration = read('db/migrations/487_tenant_custom_roles.sql', backendRoot);
const receivingClerkLeastPrivilegeMigration = read('db/migrations/488_receiving_clerk_least_privilege.sql', backendRoot);
const reservedNameMigration = read('db/migrations/489_tenant_custom_role_reserved_names.sql', backendRoot);
const customRoleService = read('src/services/tenantCustomRoleService.js', backendRoot);
const policyService = read('src/services/permissionPolicyService.js', backendRoot);
const permissionRoutes = read('src/routes/permissions.js', backendRoot);
const usersController = read('src/controllers/usersController.js', backendRoot);
const usersRoutes = read('src/routes/users.js', backendRoot);
const usersValidation = read('src/validations/users.validation.js', backendRoot);
const auth = read('src/middleware/auth.js', backendRoot);
const authService = read('src/services/authService.js', backendRoot);
const tokenService = read('src/utils/tokenService.js', backendRoot);
const actionCenterController = read('src/controllers/operationalActionCenterController.js', backendRoot);
const actionCenterService = read('src/services/operations/operationalActionCenterService.js', backendRoot);
const reliabilityController = read('src/controllers/platformReliabilityController.js', backendRoot);
const reliabilityService = read('src/services/operations/platformReliabilityService.js', backendRoot);

assertIncludes(migration, [
  'tenant_custom_roles',
  'tenant_custom_role_permissions',
  'ADD COLUMN IF NOT EXISTS custom_role_id',
  'users_tenant_custom_role_fkey',
  'users_custom_role_staff_base_check',
  'ON DELETE RESTRICT'
], 'migration 487');
assertIncludes(receivingClerkLeastPrivilegeMigration, [
  "source_template_key = 'receiving_clerk'",
  "permission_row.permission = 'shipment_items.write'",
  "template_permissions - 'shipment_items.write'",
  'custom_role.permissions.security_correction'
], 'migration 488');
assertIncludes(reservedNameMigration, [
  "LOWER(TRIM(role_row.name)) IN ('admin', 'manager', 'staff')",
  'tenant_custom_roles_reserved_name_check',
  'custom_role.name.security_correction',
  'retired_unassigned_role',
  'renamed_assigned_role'
], 'migration 489');
assertIncludes(customRoleService, [
  'normalizePermissions',
  'createCustomRole',
  'replaceCustomRolePermissions',
  'resetCustomRolePermissions',
  'duplicateCustomRole',
  'deleteCustomRole',
  'TENANT_CUSTOM_ROLE_ASSIGNED_USERS',
  'TENANT_CUSTOM_ROLE_VERSION_CONFLICT',
  'custom_role.permissions.update',
  'TENANT_CUSTOM_ROLE_NAME_RESERVED',
  'isReservedCustomRoleName',
  'RESERVED_CUSTOM_ROLE_NAMES'
], 'custom role service');
assertIncludes(policyService, [
  'customRoleId',
  'TenantCustomRoleService.loadEffectivePermissions',
  'custom_role_templates',
  'protected_built_in_roles_with_tenant_custom_roles',
  'per_user_permission_overrides: false'
], 'permission policy integration');
assertIncludes(permissionRoutes, [
  "router.post(\n  '/custom-roles'",
  "'/custom-roles/:id/permissions'",
  "'/custom-roles/:id/duplicate'",
  'deleteCustomRole',
  'customRoleId: req.user.custom_role_id || null'
], 'custom role routes');
assertIncludes(usersController, [
  'custom_role_id',
  'assertAssignableCustomRole',
  "role: 'staff'",
  'getRoleOptions',
  'USER_ROLE_SELF_CHANGE_FORBIDDEN',
  'tenant_user.update'
], 'tenant user assignment');
assertIncludes(usersRoutes, ["'/role-options'", 'getRoleOptions'], 'tenant user routes');
assertIncludes(usersValidation, ['custom_role_id: customRoleId.optional()'], 'tenant user validation');
assertIncludes(auth, [
  'LEFT JOIN tenant_custom_roles',
  'custom_role_is_active',
  'customRoleId: currentUser.custom_role_id || null',
  'access_role_label'
], 'tenant authentication middleware');
assertIncludes(authService, ['custom_role_id', 'custom_role_name', 'TENANT_CUSTOM_ROLE_INACTIVE'], 'tenant auth service');
assertIncludes(tokenService, ['custom_role_id', 'custom_role_name'], 'tenant access token');
assertIncludes(actionCenterController, ['customRoleId: req.user?.custom_role_id || null'], 'action-center custom role context');
assertIncludes(actionCenterService, ['customRoleId = null', 'role: userRole,\n    customRoleId'], 'action-center effective custom permissions');
assertIncludes(reliabilityController, ['customRoleId: req.user?.custom_role_id || null'], 'reliability custom role context');
assertIncludes(reliabilityService, ['tenantId, userRole, customRoleId, filters'], 'reliability custom role propagation');

const policyClient = read('src/lib/permissionPolicies.ts');
const tenantPage = read('src/pages/TenantPermissionsPage.tsx');
const usersPage = read('src/pages/UsersPage.tsx');
const permissionSnapshot = read('src/lib/permissions.ts');
const editor = read('src/components/permissions/RolePermissionEditor.tsx');
const appLayout = read('src/layouts/AppLayout.tsx');
const roleAwareWorkspace = read('src/pages/RoleAwareWorkspacePage.tsx');
const customRolePermissionSurfaces = [
  ['Shipments', read('src/pages/ShipmentsPage.tsx'), 'shipments.receive'],
  ['Alerts', read('src/pages/AlertsPage.tsx'), 'alerts.write'],
  ['Stock transfers', read('src/pages/StockTransfersPage.tsx'), 'stock_transfers.create'],
  ['Storage locations', read('src/pages/StorageLocationsPage.tsx'), 'storage_locations.write'],
  ['Suppliers', read('src/pages/SuppliersPage.tsx'), 'suppliers.write'],
  ['Products', read('src/pages/products/ProductManagementSectionsPanel.tsx'), 'products.write']
];

assertIncludes(policyClient, [
  'createTenantCustomRole',
  'updateTenantCustomRole',
  'saveTenantCustomRolePermissions',
  'resetTenantCustomRolePermissions',
  'duplicateTenantCustomRole',
  'deleteTenantCustomRole',
  'RESERVED_TENANT_CUSTOM_ROLE_NAMES',
  'isReservedTenantCustomRoleName'
], 'frontend custom role API');
assertIncludes(tenantPage, [
  'Create custom role',
  'Starting template',
  'Manage selected custom role',
  "setErrorMessage('Reassign all users before deactivating this custom role.')",
  "setErrorMessage('Reassign all users before deleting this custom role.')",
  'Reassign all users before deleting this role',
  'Required Read permissions are added automatically',
  'Custom roles cannot be named Admin, Manager, or Staff',
  'RESERVED_TENANT_CUSTOM_ROLE_NAME_MESSAGE'
], 'tenant permissions custom role UI');
assertNotIncludes(tenantPage, [
  'disabled={managing || (activeRole.is_active !== false && !activeRole.can_deactivate)}',
  'disabled={managing || !activeRole.can_delete}'
], 'tenant custom-role lifecycle feedback');
assertIncludes(usersPage, [
  "'/users/role-options'",
  'roleSelection',
  'custom_role_id',
  '<optgroup label="Custom roles">',
  'Tenant custom role'
], 'tenant users custom assignment UI');
assertIncludes(permissionSnapshot, [
  'custom_role_id?: string | null',
  'access_role_label?: string | null',
  'if (identity.customRoleId) return []',
  'export function getCurrentAccessRoleLabel()'
], 'frontend effective permission snapshot');
assertIncludes(editor, ['Custom roles', 'Reset to starting template', 'role.display_name'], 'shared role editor');
assertIncludes(appLayout, ['getCurrentAccessRoleLabel', 'accessRoleLabel.toUpperCase()'], 'custom role shell label');
assertIncludes(roleAwareWorkspace, ['getCurrentAccessRoleLabel', 'getTenantPermissionSnapshot', 'custom_role_name', 'Access role detected from the active tenant session'], 'custom role workspace label');
for (const [label, source, permission] of customRolePermissionSurfaces) {
  assertIncludes(source, ['Current access role:', permission], `${label} custom role feedback`);
  assertNotIncludes(source, [
    'Current role: {role.toUpperCase()}',
    'Manager or admin role required',
    'backend only allows manager and admin',
    'restricted to manager and admin roles'
  ], `${label} custom role feedback`);
}

const shipmentsPage = customRolePermissionSurfaces.find(([label]) => label === 'Shipments')?.[1] || '';
assertIncludes(shipmentsPage, [
  'Ordered shipment-line changes require shipment_items.write.',
  'Receiving remains available through shipments.receive.',
  'canManageShipmentItems ? ('
], 'Shipments least-privilege action gating');

console.log(`Tenant custom role contract passed (${templates.CUSTOM_ROLE_TEMPLATES.length} templates, tenant isolation, reserved-right protection, backend enforcement, user assignment, and frontend integration verified).`);
