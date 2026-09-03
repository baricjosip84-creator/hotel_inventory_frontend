import { normalizeError } from './EnterpriseInventoryFormat';

type EnterpriseInventoryQueryLike = {
  dataUpdatedAt?: number;
  error?: unknown;
  isError?: boolean;
};

type EnterpriseInventoryQueryRecord = Record<string, EnterpriseInventoryQueryLike | undefined>;

const TAB_QUERY_MAP: Record<string, string[]> = {
  locations: ['storageLocationsQuery'],
  'par-levels': ['productsQuery', 'storageLocationsQuery', 'parLevelsQuery'],
  'cycle-counts': ['productsQuery', 'storageLocationsQuery', 'cycleCountsQuery'],
  'supplier-returns': [],
  approvals: ['approvalRulesQuery', 'storageLocationsQuery', 'cycleCountsQuery', 'invoicesQuery', 'supplierReturnsQuery', 'requisitionsQuery'],
  'supplier-catalog': ['productsQuery', 'suppliersQuery', 'supplierCatalogQuery'],
  invoices: ['tenantSubscriptionAccessQuery', 'productsQuery', 'suppliersQuery', 'purchaseOrdersQuery', 'shipmentsQuery', 'invoicesQuery'],
  labels: ['productsQuery', 'barcodeLabelsQuery'],
  attachments: ['tenantSubscriptionAccessQuery', 'productsQuery', 'suppliersQuery', 'purchaseOrdersQuery', 'shipmentsQuery', 'invoicesQuery', 'requisitionsQuery', 'supplierReturnsQuery', 'attachmentsQuery'],
  notifications: ['notificationsQuery', 'notificationDeliveriesQuery']
};

export function getEnterpriseInventoryActiveTabLastUpdatedAt(
  activeTab: string,
  queries: EnterpriseInventoryQueryRecord
): number | null {
  const queryNames = TAB_QUERY_MAP[activeTab] ?? [];
  const latest = queryNames.reduce((currentLatest, name) => {
    const updatedAt = queries[name]?.dataUpdatedAt ?? 0;
    return Number.isFinite(updatedAt) && updatedAt > currentLatest ? updatedAt : currentLatest;
  }, 0);

  return latest > 0 ? latest : null;
}

export function getEnterpriseInventoryActiveTabQueryError(
  activeTab: string,
  queries: EnterpriseInventoryQueryRecord,
  ui: (englishText: string) => string = (value) => value,
): string | null {
  const queryNames = TAB_QUERY_MAP[activeTab] ?? [];
  const failedQueryName = queryNames.find((name) => queries[name]?.isError);

  if (!failedQueryName) {
    return null;
  }

  const knownLabels: Record<string, string> = {
    tenantSubscriptionAccessQuery: 'tenant subscription access',
    productsQuery: 'products',
    suppliersQuery: 'suppliers',
    purchaseOrdersQuery: 'purchase orders',
    shipmentsQuery: 'shipments',
    requisitionsQuery: 'requisitions',
    storageLocationsQuery: 'storage locations',
    parLevelsQuery: 'par levels',
    cycleCountsQuery: 'cycle counts',
    approvalRulesQuery: 'approval rules',
    supplierCatalogQuery: 'supplier catalog',
    invoicesQuery: 'invoices',
    supplierReturnsQuery: 'supplier returns',
    barcodeLabelsQuery: 'barcode labels',
    attachmentsQuery: 'attachments',
    notificationsQuery: 'notifications',
    notificationDeliveriesQuery: 'notification deliveries',
  };
  const label = knownLabels[failedQueryName]
    ? ui(knownLabels[failedQueryName])
    : failedQueryName.replace(/Query$/, '').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return ui('Could not load {section}: {error}')
    .replace('{section}', label)
    .replace('{error}', normalizeError(queries[failedQueryName]?.error, ui('Request failed')));
}
