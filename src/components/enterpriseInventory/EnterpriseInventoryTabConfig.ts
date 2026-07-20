import { TENANT_PERMISSIONS } from '../../lib/permissions';

export const enterpriseInventoryTabs = [
  ['operations-dashboard', 'Dashboard', TENANT_PERMISSIONS.DASHBOARD_READ],
  ['par-levels', 'Par levels', TENANT_PERMISSIONS.PAR_LEVELS_READ],
  ['cycle-counts', 'Cycle counts', TENANT_PERMISSIONS.CYCLE_COUNTS_READ],
  ['stock-risk', 'Stock risk', TENANT_PERMISSIONS.STOCK_READ],
  ['insights', 'Insights', TENANT_PERMISSIONS.INSIGHTS_READ],
  ['forecast', 'Forecast', TENANT_PERMISSIONS.INSIGHTS_READ],
  ['reports', 'Reports', TENANT_PERMISSIONS.REPORTS_READ],
  ['automation', 'Automation', TENANT_PERMISSIONS.AUTOMATION_SCHEDULES_VIEW],
  ['execution', 'Execution', TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW],
  ['system-context', 'System context', TENANT_PERMISSIONS.SYSTEM_CONTEXT_READ],
  ['cost-control', 'Cost control', TENANT_PERMISSIONS.PRODUCTS_READ],
  ['stock-transfers', 'Transfers', TENANT_PERMISSIONS.STOCK_TRANSFERS_READ],
  ['products', 'Products', TENANT_PERMISSIONS.PRODUCTS_READ],
  ['suppliers', 'Suppliers', TENANT_PERMISSIONS.SUPPLIERS_READ],
  ['locations', 'Locations', TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ],
  ['alerts', 'Alerts', TENANT_PERMISSIONS.ALERTS_READ],
  ['audit', 'Audit trail', TENANT_PERMISSIONS.AUDIT_READ],
  ['procurement-match', 'PO matching', TENANT_PERMISSIONS.PURCHASE_ORDERS_READ],
  ['receiving', 'Receiving', TENANT_PERMISSIONS.SHIPMENTS_READ],
  ['requisitions', 'Requisitions', TENANT_PERMISSIONS.REQUISITIONS_READ],
  ['approvals', 'Approvals', TENANT_PERMISSIONS.APPROVAL_RULES_READ],
  ['invoices', 'Invoices', TENANT_PERMISSIONS.INVOICES_READ],
  ['labels', 'Barcode labels', TENANT_PERMISSIONS.BARCODE_LABELS_READ],
  ['packages', 'Product packages', TENANT_PERMISSIONS.PRODUCT_PACKAGES_READ],
  ['attachments', 'Attachments', TENANT_PERMISSIONS.ATTACHMENTS_READ],
  ['notifications', 'Notifications', TENANT_PERMISSIONS.NOTIFICATIONS_READ]
] as const;

export type EnterpriseInventoryTabKey = (typeof enterpriseInventoryTabs)[number][0];

