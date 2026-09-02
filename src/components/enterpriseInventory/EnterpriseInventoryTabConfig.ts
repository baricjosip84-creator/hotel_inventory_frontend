import { TENANT_PERMISSIONS } from '../../lib/permissions';
import type { TenantPermission } from '../../lib/permissions';

export const enterpriseInventoryTabs = [
  ['par-levels', 'Par levels', TENANT_PERMISSIONS.PAR_LEVELS_READ],
  ['cycle-counts', 'Cycle counts', TENANT_PERMISSIONS.CYCLE_COUNTS_READ],
  ['stock-transfers', 'Stock transfers', TENANT_PERMISSIONS.STOCK_TRANSFERS_READ],
  ['supplier-returns', 'Supplier returns', TENANT_PERMISSIONS.SUPPLIER_RETURNS_READ],
  ['approvals', 'Approvals', TENANT_PERMISSIONS.APPROVAL_RULES_READ],
  ['supplier-catalog', 'Supplier catalogs', TENANT_PERMISSIONS.SUPPLIER_CATALOG_READ],
  ['invoices', 'Invoices', TENANT_PERMISSIONS.INVOICES_READ],
  ['labels', 'Barcode labels', TENANT_PERMISSIONS.BARCODE_LABELS_READ],
  ['attachments', 'Attachments', TENANT_PERMISSIONS.ATTACHMENTS_READ],
  ['notifications', 'Notifications', TENANT_PERMISSIONS.NOTIFICATIONS_READ]
] as const;

export type EnterpriseInventoryTabKey = (typeof enterpriseInventoryTabs)[number][0];

export const enterpriseInventoryReadPermissions = enterpriseInventoryTabs.map(([, , permission]) => permission);

export const enterpriseInventoryTabIconPaths: Record<EnterpriseInventoryTabKey, string> = {
  'par-levels': '/replenishment-planning',
  'cycle-counts': '/stock',
  'stock-transfers': '/stock-transfers',
  'supplier-returns': '/shipments',
  'approvals': '/execution-requests',
  'supplier-catalog': '/suppliers',
  'invoices': '/purchase-orders',
  'labels': '/scanner',
  'attachments': '/reports',
  'notifications': '/alerts',
};

export const enterpriseInventoryActionPermissionGroups: Record<EnterpriseInventoryTabKey, readonly (readonly TenantPermission[])[]> = {
  'par-levels': [[TENANT_PERMISSIONS.PAR_LEVELS_WRITE]],
  'cycle-counts': [[TENANT_PERMISSIONS.CYCLE_COUNTS_WRITE]],
  'stock-transfers': [
    [TENANT_PERMISSIONS.STOCK_TRANSFERS_CREATE, TENANT_PERMISSIONS.STOCK_READ, TENANT_PERMISSIONS.PRODUCTS_READ, TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ],
    [TENANT_PERMISSIONS.STOCK_TRANSFERS_EXECUTE, TENANT_PERMISSIONS.STOCK_READ],
    [TENANT_PERMISSIONS.STOCK_TRANSFERS_CANCEL],
  ],
  'supplier-returns': [[TENANT_PERMISSIONS.SUPPLIER_RETURNS_WRITE]],
  'approvals': [[TENANT_PERMISSIONS.APPROVAL_RULES_WRITE]],
  'supplier-catalog': [[TENANT_PERMISSIONS.SUPPLIER_CATALOG_WRITE]],
  'invoices': [[TENANT_PERMISSIONS.INVOICES_WRITE]],
  'labels': [[TENANT_PERMISSIONS.BARCODE_LABELS_WRITE]],
  'attachments': [[TENANT_PERMISSIONS.ATTACHMENTS_WRITE]],
  'notifications': [[TENANT_PERMISSIONS.NOTIFICATIONS_WRITE]],
};

// None of the retained controls are subscription-gated at the tab level.
export const enterpriseInventoryTabFeatures: Partial<Record<EnterpriseInventoryTabKey, string>> = {};
