import { TENANT_PERMISSIONS } from '../../lib/permissions';

export const enterpriseInventoryTabs = [
  ['par-levels', 'Par levels', TENANT_PERMISSIONS.PAR_LEVELS_READ],
  ['cycle-counts', 'Cycle counts', TENANT_PERMISSIONS.CYCLE_COUNTS_READ],
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

// None of the retained controls are subscription-gated at the tab level.
export const enterpriseInventoryTabFeatures: Partial<Record<EnterpriseInventoryTabKey, string>> = {};
