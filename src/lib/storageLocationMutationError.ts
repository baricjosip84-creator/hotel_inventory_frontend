import { ApiError } from './api';

type UiTranslator = (englishText: string) => string;

type StorageLocationBlocker = {
  key?: string;
  label?: string;
};

const STORAGE_LOCATION_BLOCKER_LABELS: Record<string, string> = {
  active_child_locations: 'active child locations in the warehouse hierarchy',
  stock: 'non-zero stock balances',
  inventory_lots: 'remaining lot or batch balances',
  inventory_serials: 'active serialized inventory',
  shipment_items: 'open shipment receiving items',
  stock_transfers_from: 'draft outbound stock transfers',
  stock_transfers_to: 'draft inbound stock transfers',
  inventory_par_levels: 'active par levels',
  cycle_counts: 'open cycle counts',
  cycle_count_items: 'open cycle-count items',
  inventory_usage_templates: 'active usage templates',
  inventory_requisitions_source: 'open source requisitions',
  inventory_requisitions_target: 'open target requisitions',
  department_requisitions: 'active department requisitions',
  outbound_order_items: 'active outbound orders',
  customer_return_items: 'draft customer returns',
  supplier_return_items: 'active supplier returns',
  replenishment_planning: 'active replenishment planning work',
  inventory_reservation_items: 'open reservations',
  execution_tasks: 'active execution tasks',
  execution_task_batches: 'active execution task groups',
  inventory_optimization_plans: 'active optimization plans'
};

export function getStorageLocationMutationErrorMessage(
  error: unknown,
  fallback: string,
  ui: UiTranslator
): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  if (error.code === 'VERSION_CONFLICT' || error.code === 'VERSION_REQUIRED') {
    return ui('This storage location changed after you opened it. Refresh the locations and try again.');
  }

  if (error.code === 'STORAGE_LOCATION_ALREADY_EXISTS') {
    return ui('A storage location with this name already exists.');
  }

  if (error.code === 'STORAGE_NOT_FOUND' || error.code === 'ENTITY_NOT_FOUND') {
    return ui('This storage location is no longer active. Refresh the locations and try again.');
  }

  const hierarchyMessages: Record<string, string> = {
    LOCATION_HIERARCHY_CYCLE: 'This hierarchy change would create a cycle. Choose a different parent location.',
    WAREHOUSE_PARENT_NOT_ALLOWED: 'A warehouse must stay at the top level of the location hierarchy.',
    LOCATION_PARENT_MUST_BE_CONTAINER: 'The selected parent location cannot contain child locations.',
    LOCATION_HIERARCHY_ORDER_INVALID: 'The hierarchy must move from broader to more specific location levels.',
    LOCATION_LEAF_HAS_CHILDREN: 'A bin or storage-level location cannot contain child locations.'
  };
  if (error.code && hierarchyMessages[error.code]) {
    return ui(hierarchyMessages[error.code]);
  }

  if (error.code === 'STORAGE_LOCATION_IN_USE') {
    const details = error.details as { blockers?: StorageLocationBlocker[] } | undefined;
    const labels = Array.isArray(details?.blockers)
      ? details.blockers
          .map((blocker) => blocker.key ? STORAGE_LOCATION_BLOCKER_LABELS[blocker.key] : undefined)
          .filter((label): label is string => Boolean(label))
          .map((label) => ui(label))
      : [];

    if (labels.length) {
      return `${ui('This location cannot be retired until these active dependencies are resolved:')} ${labels.join(', ')}.`;
    }
    return ui('This location cannot be retired while it still has active operational dependencies.');
  }

  return fallback;
}
