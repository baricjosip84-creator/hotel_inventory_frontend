import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { formatCurrencyAmount } from '../lib/tenantCurrency';
import {
  getCurrentAccessRoleLabel,
  getRoleCapabilities,
  hasPermission,
  TENANT_PERMISSIONS
} from '../lib/permissions';
import { InventoryCsvImportPanel } from '../components/imports/InventoryCsvImportPanel';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { OperationalWorkspaceHero, OperationalWorkspaceMetaPill, OperationalWorkspaceStatCard } from '../components/ui/OperationalWorkspace';
import './StockPage.css';

type StockItem = {
  id: string;
  product_id: string;
  product_name?: string;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_id?: string;
  storage_location_name?: string;
  temperature_zone?: string | null;
  quantity: number | string;
  reserved_quantity?: number | string | null;
  allocated_quantity?: number | string | null;
  projected_free_quantity?: number | string | null;
  available_lot_quantity?: number | string | null;
  usable_lot_quantity?: number | string | null;
  usable_free_quantity?: number | string | null;
  expiring_soon_quantity?: number | string | null;
  expired_quantity?: number | string | null;
  hold_quantity?: number | string | null;
  quarantine_quantity?: number | string | null;
  damaged_quantity?: number | string | null;
  rejected_quantity?: number | string | null;
  earliest_expiry_date?: string | null;
  min_quantity?: number | string | null;
  product_min_stock?: number | string | null;
  requires_lot_tracking?: boolean;
  requires_expiry_date?: boolean;
  updated_at?: string;
  version?: number | string;
};


type InventoryLot = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  manufactured_at?: string | null;
  condition: 'available' | 'hold' | 'quarantine' | 'damaged' | 'rejected' | 'expired' | string;
  operational_status?: string | null;
  quantity: number | string;
  days_to_expiry?: number | string | null;
  unit_cost?: number | string | null;
};

type StockReconciliation = {
  summary: {
    row_count: number;
    ledger_mismatch_count: number;
    lot_mismatch_count: number;
    expired_still_available_count: number;
  };
  rows: Array<{
    stock_id: string;
    product_name?: string | null;
    storage_location_name?: string | null;
    stock_quantity: number | string;
    ledger_expected_quantity: number | string;
    ledger_variance: number | string;
    lot_available_quantity: number | string;
    lot_variance: number | string;
  }>;
};

type StockMovement = {
  id: string;
  product_id: string;
  product_name: string;
  product_unit?: string | null;
  shipment_id?: string | null;
  shipment_po_number?: string | null;
  change: number | string;
  reason: string;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;
};

type InventoryUsageLog = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  stock_movement_id?: string | null;
  quantity: number | string;
  consumption_reason: UsageReason;
  department?: string | null;
  event_name?: string | null;
  notes?: string | null;
  quantity_before?: number | string | null;
  quantity_after?: number | string | null;
  consumed_at: string;
  created_by_user_name?: string | null;
  created_by_user_id?: string | null;
};

type InventoryUsageSummary = {
  totals?: {
    usage_count?: number | string | null;
    total_quantity?: number | string | null;
    first_consumed_at?: string | null;
    last_consumed_at?: string | null;
  };
  by_reason?: Array<{
    consumption_reason: UsageReason;
    usage_count: number | string;
    total_quantity: number | string;
  }>;
  by_product?: Array<{
    product_id: string;
    product_name?: string | null;
    product_unit?: string | null;
    usage_count: number | string;
    total_quantity: number | string;
  }>;
  by_department?: Array<{
    department?: string | null;
    usage_count: number | string;
    total_quantity: number | string;
  }>;
};

type StockActionType = 'consume' | 'count' | 'adjust';

type StockMutationResponse = {
  message: string;
  stock: {
    product_id: string;
    storage_location_id: string;
    previous_quantity: number;
    new_quantity: number;
    difference?: number;
    change?: number;
  };
};

type StockActionDraft = {
  action: StockActionType;
  quantity: string;
  change: string;
  reason: string;
  consumption_reason: UsageReason;
  department: string;
  event_name: string;
  notes: string;
  consumed_at: string;
  reservation_shortfall_acknowledged: boolean;
  lot_number: string;
  batch_number: string;
  expiry_date: string;
  manufactured_at: string;
};

type UsageReason =
  | 'guest_use'
  | 'internal_use'
  | 'damage'
  | 'waste'
  | 'event'
  | 'maintenance'
  | 'other';

const USAGE_REASON_OPTIONS: Array<{ value: UsageReason; label: string; description: string }> = [
  { value: 'guest_use', label: 'Guest use', description: 'Consumed directly for guests or customers.' },
  { value: 'internal_use', label: 'Internal use', description: 'Used by staff or internal operations.' },
  { value: 'damage', label: 'Damage', description: 'Removed because it was damaged.' },
  { value: 'waste', label: 'Waste', description: 'Expired, spoiled, discarded, or otherwise wasted.' },
  { value: 'event', label: 'Event', description: 'Allocated and consumed for a named event.' },
  { value: 'maintenance', label: 'Maintenance', description: 'Used for repair, upkeep, or facilities work.' },
  { value: 'other', label: 'Other', description: 'Operational usage that does not fit another reason.' }
];

async function fetchStock(): Promise<StockItem[]> {
  return apiRequest<StockItem[]>('/stock');
}

async function fetchInventoryLots(): Promise<InventoryLot[]> {
  return apiRequest<InventoryLot[]>('/stock/lots');
}

async function fetchStockReconciliation(): Promise<StockReconciliation> {
  return apiRequest<StockReconciliation>('/stock/reconciliation');
}

async function fetchStockMovements(productId: string): Promise<StockMovement[]> {
  const params = new URLSearchParams();

  if (productId) {
    params.set('product_id', productId);
  }

  params.set('limit', '8');

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<StockMovement[]>(`/stock/movements${suffix}`);
}

async function fetchInventoryUsageLogs(
  productId: string,
  storageLocationId: string
): Promise<InventoryUsageLog[]> {
  const params = new URLSearchParams();

  if (productId) {
    params.set('product_id', productId);
  }

  if (storageLocationId) {
    params.set('storage_location_id', storageLocationId);
  }

  params.set('limit', '8');

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<InventoryUsageLog[]>(`/stock/usage${suffix}`);
}

async function fetchInventoryUsageSummary(
  productId: string,
  storageLocationId: string
): Promise<InventoryUsageSummary> {
  const params = new URLSearchParams();

  if (productId) {
    params.set('product_id', productId);
  }

  if (storageLocationId) {
    params.set('storage_location_id', storageLocationId);
  }

  params.set('compact', 'true');

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<InventoryUsageSummary>(`/stock/usage/summary${suffix}`);
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString();
}

function formatUsageReason(reason: string | null | undefined): string {
  if (!reason) return 'Unassigned';

  return reason
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatLotReference(lot: InventoryLot): string {
  const lotNumber = (lot.lot_number || '').trim();
  const batchNumber = (lot.batch_number || '').trim();

  if (lotNumber === 'LEGACY-UNTRACKED') {
    return 'Untracked opening balance';
  }

  return [
    lotNumber ? `Lot ${lotNumber}` : '',
    batchNumber ? `Batch ${batchNumber}` : ''
  ].filter(Boolean).join(' · ') || 'No lot / batch reference';
}

function formatMovementReason(reason: string | null | undefined): string {
  if (!reason) return 'Unspecified movement';

  const normalized = reason.toLowerCase();

  if (normalized === 'shipment_receive') return 'Shipment received';
  if (normalized === 'inventory_count') return 'Physical count';
  if (normalized === 'manual_adjustment') return 'Manual adjustment';
  if (normalized.startsWith('usage:')) {
    return formatUsageReason(normalized.slice('usage:'.length));
  }

  return reason
    .split(/[_:]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getEffectiveMinimum(item: StockItem): number {
  return Math.max(toNumber(item.min_quantity), toNumber(item.product_min_stock));
}

function getProjectedFreeQuantity(item: StockItem): number {
  const quantity = toNumber(item.quantity);
  const reservedQuantity = toNumber(item.reserved_quantity);

  if (item.usable_free_quantity !== undefined && item.usable_free_quantity !== null) {
    return toNumber(item.usable_free_quantity);
  }
  return item.projected_free_quantity === undefined
    ? quantity - reservedQuantity
    : toNumber(item.projected_free_quantity);
}

function normalizeSearchText(value: string | null | undefined): string {
  return (value || '').trim().toLocaleLowerCase();
}

function getDefaultDraft(action: StockActionType): StockActionDraft {
  if (action === 'consume') {
    return {
      action,
      quantity: '1',
      change: '',
      reason: 'usage:internal_use',
      consumption_reason: 'internal_use',
      department: '',
      event_name: '',
      notes: '',
      consumed_at: '',
      reservation_shortfall_acknowledged: false,
      lot_number: '',
      batch_number: '',
      expiry_date: '',
      manufactured_at: ''
    };
  }

  if (action === 'count') {
    return {
      action,
      quantity: '',
      change: '',
      reason: '',
      consumption_reason: 'internal_use',
      department: '',
      event_name: '',
      notes: '',
      consumed_at: '',
      reservation_shortfall_acknowledged: false,
      lot_number: '',
      batch_number: '',
      expiry_date: '',
      manufactured_at: ''
    };
  }

  return {
    action,
    quantity: '',
    change: '',
    reason: '',
    consumption_reason: 'internal_use',
    department: '',
    event_name: '',
    notes: '',
    consumed_at: '',
    reservation_shortfall_acknowledged: false,
    lot_number: '',
    batch_number: '',
    expiry_date: '',
    manufactured_at: ''
  };
}

function getActionLabel(action: StockActionType): string {
  if (action === 'consume') return 'Consume Stock';
  if (action === 'count') return 'Apply Physical Count';
  return 'Manual Adjustment';
}

function getActionHelpText(action: StockActionType): string {
  if (action === 'consume') {
    return 'Reduce stock by a positive quantity for operational usage.';
  }

  if (action === 'count') {
    return 'Set stock to the physically verified quantity from a real count.';
  }

  return 'Apply a positive or negative correction delta to the selected stock position.';
}

function reasonBadgeStyle(reason: string): CSSProperties {
  const value = reason.toLowerCase();

  if (value.includes('shipment')) {
    return {
      ...styles.badgeBase,
      background: '#dbeafe',
      color: '#1d4ed8'
    };
  }

  if (value.includes('consume') || value.startsWith('usage:')) {
    return {
      ...styles.badgeBase,
      background: '#fee2e2',
      color: '#991b1b'
    };
  }

  if (value.includes('adjust') || value.includes('count')) {
    return {
      ...styles.badgeBase,
      background: '#fef3c7',
      color: '#92400e'
    };
  }

  return {
    ...styles.badgeBase,
    background: '#e2e8f0',
    color: '#334155'
  };
}

function changeBadgeStyle(value: number): CSSProperties {
  if (value > 0) {
    return {
      ...styles.badgeBase,
      background: '#dcfce7',
      color: '#166534'
    };
  }

  if (value < 0) {
    return {
      ...styles.badgeBase,
      background: '#fee2e2',
      color: '#991b1b'
    };
  }

  return {
    ...styles.badgeBase,
    background: '#e2e8f0',
    color: '#334155'
  };
}

function changeDisplay(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  return <OperationalWorkspaceStatCard label={props.title} value={props.value} helper={props.subtitle} tone={props.tone} />;
}

export default function StockPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProductId = searchParams.get('product_id')?.trim() || '';
  const {
    isAdmin,
    canConsumeStock,
    canCountStock: canCount,
    canAdjustStock: canAdjust,
    canViewInventoryUsage,
    canRecordInventoryUsage
  } = getRoleCapabilities();
  const canViewMovements = hasPermission(TENANT_PERMISSIONS.STOCK_MOVEMENTS_READ);
  const canConsume = !isAdmin && canConsumeStock && canRecordInventoryUsage;
  const accessRoleLabel = getCurrentAccessRoleLabel();
  const preferredAction: StockActionType = canConsume ? 'consume' : canCount ? 'count' : canAdjust ? 'adjust' : 'consume';
  const selectedDetailsRef = useRef<HTMLElement | null>(null);
  const [showOpeningStockImport, setShowOpeningStockImport] = useState(false);
  const [showLotIntegrity, setShowLotIntegrity] = useState(false);

  const stockQuery = useQuery({
    queryKey: ['stock'],
    queryFn: fetchStock,
    staleTime: 30_000
  });

  const lotsQuery = useQuery({
    queryKey: ['inventory-lots'],
    queryFn: fetchInventoryLots,
    enabled: showLotIntegrity && stockQuery.isSuccess,
    staleTime: 30_000
  });
  const reconciliationQuery = useQuery({
    queryKey: ['stock-reconciliation'],
    queryFn: fetchStockReconciliation,
    enabled: showLotIntegrity && stockQuery.isSuccess,
    staleTime: 30_000
  });

  const rows = useMemo(() => stockQuery.data ?? [], [stockQuery.data]);
  const inventoryLots = useMemo(() => lotsQuery.data ?? [], [lotsQuery.data]);

  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'healthy' | 'reserved-risk'>('all');
  const [expiryWindowDays, setExpiryWindowDays] = useState(30);

  const expiryWindowLots = useMemo(() => inventoryLots.filter((lot) => { const days = lot.days_to_expiry === null || lot.days_to_expiry === undefined ? null : Number(lot.days_to_expiry); return lot.quantity && days !== null && Number.isFinite(days) && days >= 0 && days <= expiryWindowDays && !['expired'].includes(lot.operational_status || lot.condition); }), [inventoryLots, expiryWindowDays]);
  const expiryWindowQuantity = useMemo(() => expiryWindowLots.reduce((sum, lot) => sum + Number(lot.quantity || 0), 0), [expiryWindowLots]);
  const expiryWindowValue = useMemo(() => expiryWindowLots.reduce((sum, lot) => sum + Number(lot.quantity || 0) * Number(lot.unit_cost || 0), 0), [expiryWindowLots]);
  const expiredAvailableLots = useMemo(
    () => inventoryLots.filter((lot) => {
      const days = lot.days_to_expiry === null || lot.days_to_expiry === undefined
        ? null
        : Number(lot.days_to_expiry);
      return lot.condition === 'available' && days !== null && Number.isFinite(days) && days < 0;
    }),
    [inventoryLots]
  );

  useEffect(() => {
    setSearchText('');
    setLocationFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
  }, [requestedProductId]);

  const locationOptions = useMemo(() => {
    const values = new Map<string, string>();

    for (const row of rows) {
      if (!row.storage_location_id) continue;
      values.set(
        row.storage_location_id,
        row.storage_location_name || row.storage_location_id
      );
    }

    return [...values.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [rows]);

  const categoryOptions = useMemo(() => {
    return [...new Set(
      rows
        .map((row) => row.product_category?.trim())
        .filter((value): value is string => Boolean(value))
    )].sort((left, right) => left.localeCompare(right));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const search = normalizeSearchText(searchText);

    return rows
      .filter((row) => {
        if (requestedProductId && row.product_id !== requestedProductId) {
          return false;
        }

        if (locationFilter !== 'all' && row.storage_location_id !== locationFilter) {
          return false;
        }

        if (categoryFilter !== 'all' && row.product_category !== categoryFilter) {
          return false;
        }

        const quantity = toNumber(row.quantity);
        const minimum = getEffectiveMinimum(row);
        const projectedFree = getProjectedFreeQuantity(row);
        const isLow = quantity < minimum;
        const hasReservationRisk = projectedFree < minimum;

        if (statusFilter === 'low' && !isLow) return false;
        if (statusFilter === 'healthy' && (isLow || hasReservationRisk)) return false;
        if (statusFilter === 'reserved-risk' && !hasReservationRisk) return false;

        if (!search) return true;

        return [
          row.product_name,
          row.product_category,
          row.product_unit,
          row.storage_location_name,
          row.product_id,
          row.storage_location_id
        ].some((value) => normalizeSearchText(value).includes(search));
      })
      .sort((left, right) => {
        if (!search) return 0;

        const leftName = normalizeSearchText(left.product_name);
        const rightName = normalizeSearchText(right.product_name);
        const leftStarts = leftName.startsWith(search);
        const rightStarts = rightName.startsWith(search);

        if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;

        return leftName.localeCompare(rightName);
      });
  }, [categoryFilter, locationFilter, requestedProductId, rows, searchText, statusFilter]);

  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.id === selectedStockId) ?? null,
    [filteredRows, selectedStockId]
  );

  const [draft, setDraft] = useState<StockActionDraft>(() => getDefaultDraft(preferredAction));
  const [operationFeedback, setOperationFeedback] = useState<string>('');
  const [operationError, setOperationError] = useState<string>('');
  const [lastResult, setLastResult] = useState<StockMutationResponse | null>(null);

  useEffect(() => {
    if (!selectedStockId) return;
    if (filteredRows.some((row) => row.id === selectedStockId)) return;

    setSelectedStockId('');
    setDraft(getDefaultDraft(preferredAction));
    setOperationFeedback('');
    setOperationError('');
    setLastResult(null);
  }, [filteredRows, preferredAction, selectedStockId]);

  const selectedProductId = selectedRow?.product_id ?? '';
  const selectedLocationId = selectedRow?.storage_location_id ?? '';

  const movementsQuery = useQuery({
    queryKey: ['stock-movements', 'selected-stock-page', selectedProductId],
    queryFn: () => fetchStockMovements(selectedProductId),
    enabled: Boolean(selectedProductId) && canViewMovements,
    staleTime: 15_000
  });

  const usageLogsQuery = useQuery({
    queryKey: [
      'inventory-usage-logs',
      'selected-stock-page',
      selectedProductId,
      selectedLocationId
    ],
    queryFn: () => fetchInventoryUsageLogs(selectedProductId, selectedLocationId),
    enabled: Boolean(selectedProductId && selectedLocationId) && canViewInventoryUsage,
    staleTime: 15_000
  });

  const usageSummaryQuery = useQuery({
    queryKey: [
      'inventory-usage-summary',
      'selected-stock-page',
      selectedProductId,
      selectedLocationId
    ],
    queryFn: () => fetchInventoryUsageSummary(selectedProductId, selectedLocationId),
    enabled: Boolean(selectedProductId && selectedLocationId) && canViewInventoryUsage,
    staleTime: 15_000
  });

  const recentMovements = useMemo(() => {
    const movementRows = movementsQuery.data ?? [];

    return movementRows
      .filter((movement) => movement.product_id === selectedProductId)
      .slice(0, 8);
  }, [movementsQuery.data, selectedProductId]);

  const summary = useMemo(() => {
    let low = 0;
    let availabilityRisk = 0;
    let quantityTotal = 0;
    let reservedTotal = 0;
    let projectedFreeTotal = 0;

    for (const item of rows) {
      const quantity = toNumber(item.quantity);
      const reservedQuantity = toNumber(item.reserved_quantity);
      const projectedFreeQuantity = getProjectedFreeQuantity(item);
      const minimum = getEffectiveMinimum(item);

      quantityTotal += quantity;
      reservedTotal += reservedQuantity;
      projectedFreeTotal += projectedFreeQuantity;

      if (quantity < minimum) {
        low += 1;
      }

      if (projectedFreeQuantity < minimum) availabilityRisk += 1;
    }

    return {
      totalRows: rows.length,
      lowRows: low,
      availabilityRiskRows: availabilityRisk,
      quantityTotal,
      reservedTotal,
      projectedFreeTotal
    };
  }, [rows]);

  const currentQuantity = selectedRow ? toNumber(selectedRow.quantity) : 0;
  const currentReservedQuantity = selectedRow ? toNumber(selectedRow.reserved_quantity) : 0;
  const currentProjectedFreeQuantity = selectedRow
    ? getProjectedFreeQuantity(selectedRow)
    : 0;
  const currentMinimum = selectedRow ? getEffectiveMinimum(selectedRow) : 0;
  const selectedLowStock = Boolean(selectedRow) && currentQuantity < currentMinimum;
  const selectedOverReserved = Boolean(selectedRow) && currentProjectedFreeQuantity < 0;
  const selectedLowAvailable =
    Boolean(selectedRow) && !selectedLowStock && currentProjectedFreeQuantity < currentMinimum;

  const processExpiredLotsMutation = useMutation({
    mutationFn: () => apiRequest<{ processed_lot_count: number; processed_quantity: number }>('/stock/lots/expire-due', { method: 'POST', body: '{}' }),
    onSuccess: async (response) => {
      setOperationError('');
      setOperationFeedback(`Expired stock processed: ${response.processed_lot_count} lot(s), ${response.processed_quantity} unit(s) written off.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      ]);
    },
    onError: (error) => setOperationError(error instanceof Error ? error.message : 'Failed to process expired stock')
  });

  const releaseQuarantineMutation = useMutation({
    mutationFn: (lotId: string) => apiRequest<InventoryLot>(`/stock/lots/${lotId}/release-quarantine`, { method: 'POST', body: '{}' }),
    onSuccess: async () => {
      setOperationError('');
      setOperationFeedback('Quarantined lot released to available stock.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      ]);
    },
    onError: (error) => setOperationError(error instanceof Error ? error.message : 'Failed to release quarantined stock')
  });

  const holdLotMutation = useMutation({
    mutationFn: ({ lotId, reason }: { lotId: string; reason: string }) => apiRequest<InventoryLot>(`/stock/lots/${lotId}/hold`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: async () => { setOperationError(''); setOperationFeedback('Stock placed on hold and removed from usable quantity.'); await Promise.all([queryClient.invalidateQueries({ queryKey: ['stock'] }),queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),queryClient.invalidateQueries({ queryKey: ['stock-movements'] })]); },
    onError: (error) => setOperationError(error instanceof Error ? error.message : 'Failed to place stock on hold')
  });

  const releaseHoldMutation = useMutation({
    mutationFn: ({ lotId, reason }: { lotId: string; reason: string }) => apiRequest<InventoryLot>(`/stock/lots/${lotId}/release-hold`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: async () => { setOperationError(''); setOperationFeedback('Held stock released back to available stock.'); await Promise.all([queryClient.invalidateQueries({ queryKey: ['stock'] }),queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),queryClient.invalidateQueries({ queryKey: ['stock-movements'] })]); },
    onError: (error) => setOperationError(error instanceof Error ? error.message : 'Failed to release held stock')
  });

  const consumeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) {
        throw new Error('Select a stock position before consuming stock.');
      }

      return apiRequest<StockMutationResponse>('/stock/consume', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedRow.product_id,
          storage_location_id: selectedRow.storage_location_id,
          quantity: Number(draft.quantity),
          reason: draft.reason.trim() || `usage:${draft.consumption_reason}`,
          consumption_reason: draft.consumption_reason,
          department: draft.department.trim() || null,
          event_name: draft.event_name.trim() || null,
          notes: draft.notes.trim() || null,
          consumed_at: draft.consumed_at ? new Date(draft.consumed_at).toISOString() : null
        })
      });
    },
    onSuccess: async (response) => {
      setOperationError('');
      setOperationFeedback(response.message);
      setLastResult(response);
      setDraft(getDefaultDraft('consume'));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-usage-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-usage-summary'] })
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to consume stock';
      setOperationFeedback('');
      setOperationError(message);
    }
  });

  const countMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) {
        throw new Error('Select a stock position before applying a stock count.');
      }

      return apiRequest<StockMutationResponse>('/stock/count', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedRow.product_id,
          storage_location_id: selectedRow.storage_location_id,
          quantity: Number(draft.quantity),
          reason: draft.reason.trim() || 'inventory_count',
          lot_number: Number(draft.quantity) > currentQuantity ? (draft.lot_number.trim() || null) : null,
          batch_number: Number(draft.quantity) > currentQuantity ? (draft.batch_number.trim() || null) : null,
          expiry_date: Number(draft.quantity) > currentQuantity ? (draft.expiry_date || null) : null,
          manufactured_at: Number(draft.quantity) > currentQuantity ? (draft.manufactured_at || null) : null,
          reservation_shortfall_acknowledged: draft.reservation_shortfall_acknowledged
        })
      });
    },
    onSuccess: async (response) => {
      setOperationError('');
      setOperationFeedback(response.message);
      setLastResult(response);
      setDraft(getDefaultDraft('count'));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to apply stock count';
      setOperationFeedback('');
      setOperationError(message);
    }
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) {
        throw new Error('Select a stock position before applying an adjustment.');
      }

      return apiRequest<StockMutationResponse>('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedRow.product_id,
          storage_location_id: selectedRow.storage_location_id,
          change: Number(draft.change),
          reason: draft.reason.trim() || 'manual_adjustment',
          lot_number: Number(draft.change) > 0 ? (draft.lot_number.trim() || null) : null,
          batch_number: Number(draft.change) > 0 ? (draft.batch_number.trim() || null) : null,
          expiry_date: Number(draft.change) > 0 ? (draft.expiry_date || null) : null,
          manufactured_at: Number(draft.change) > 0 ? (draft.manufactured_at || null) : null,
          reservation_shortfall_acknowledged: draft.reservation_shortfall_acknowledged
        })
      });
    },
    onSuccess: async (response) => {
      setOperationError('');
      setOperationFeedback(response.message);
      setLastResult(response);
      setDraft(getDefaultDraft('adjust'));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to adjust stock';
      setOperationFeedback('');
      setOperationError(message);
    }
  });

  const activeMutation =
    consumeMutation.isPending || countMutation.isPending || adjustMutation.isPending;

  const currentActionAllowed =
    draft.action === 'consume'
      ? canConsume
      : draft.action === 'count'
        ? canCount
        : canAdjust;

  const currentActionBlockedMessage =
    draft.action === 'consume'
      ? 'Stock consumption requires both stock-consumption and inventory-usage recording access.'
      : draft.action === 'count'
        ? 'Your current access does not allow physical stock counts.'
        : 'Your current access does not allow manual stock adjustments.';

  const nextQuantityPreview = useMemo(() => {
    if (!selectedRow) {
      return null;
    }

    if (draft.action === 'consume') {
      if (draft.quantity.trim() === '') return null;
      const quantity = Number(draft.quantity);
      return Number.isFinite(quantity) && quantity > 0 ? currentQuantity - quantity : null;
    }

    if (draft.action === 'count') {
      if (draft.quantity.trim() === '') return null;
      const quantity = Number(draft.quantity);
      return Number.isFinite(quantity) && quantity >= 0 ? quantity : null;
    }

    if (draft.change.trim() === '') return null;
    const change = Number(draft.change);
    return Number.isFinite(change) && change !== 0 ? currentQuantity + change : null;
  }, [currentQuantity, draft.action, draft.change, draft.quantity, selectedRow]);

  const projectedFreeAfterAction = nextQuantityPreview === null
    ? null
    : nextQuantityPreview - currentReservedQuantity;
  const createsReservationShortfall = projectedFreeAfterAction !== null
    && projectedFreeAfterAction < 0;

  const actionAddsStock = Boolean(selectedRow) && (
    (draft.action === 'count' && draft.quantity.trim() !== '' && Number(draft.quantity) > currentQuantity) ||
    (draft.action === 'adjust' && draft.change.trim() !== '' && Number(draft.change) > 0)
  );

  const trackingDetailsNeeded = Boolean(selectedRow) && actionAddsStock && (
    Boolean(selectedRow?.requires_lot_tracking) || Boolean(selectedRow?.requires_expiry_date)
  );

  const actionInputValidation = useMemo(() => {
    if (!selectedRow) {
      return { valid: false, message: 'Select a stock position first.' };
    }

    if (draft.action === 'consume') {
      if (draft.quantity.trim() === '') {
        return { valid: false, message: 'Enter the quantity to consume.' };
      }

      const quantity = Number(draft.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return { valid: false, message: 'Quantity to consume must be greater than zero.' };
      }

      if (quantity > currentQuantity) {
        return { valid: false, message: 'Quantity to consume cannot exceed the on-hand quantity.' };
      }

      const unreservedQuantity = Math.max(currentProjectedFreeQuantity, 0);
      if (quantity > unreservedQuantity) {
        return {
          valid: false,
          message: `Only ${unreservedQuantity} unit(s) are unreserved. Release or reallocate the reservation before consuming more.`
        };
      }

      return { valid: true, message: '' };
    }

    if (draft.action === 'count') {
      if (draft.quantity.trim() === '') {
        return { valid: false, message: 'Enter the physically counted quantity.' };
      }

      const quantity = Number(draft.quantity);

      if (!Number.isFinite(quantity) || quantity < 0) {
        return { valid: false, message: 'Counted quantity must be zero or greater.' };
      }

      if (quantity > currentQuantity) {
        if (selectedRow.requires_lot_tracking && !draft.lot_number.trim() && !draft.batch_number.trim()) {
          return { valid: false, message: 'This product requires a lot or batch number for added stock.' };
        }
        if (selectedRow.requires_expiry_date && !draft.expiry_date) {
          return { valid: false, message: 'This product requires an expiry date for added stock.' };
        }
      }

      if (createsReservationShortfall && !draft.reservation_shortfall_acknowledged) {
        return {
          valid: false,
          message: 'Confirm that the physical count creates a shortage against active reservations.'
        };
      }

      return { valid: true, message: '' };
    }

    if (draft.change.trim() === '') {
      return { valid: false, message: 'Enter a positive or negative adjustment.' };
    }

    const change = Number(draft.change);

    if (!Number.isFinite(change) || change === 0) {
      return { valid: false, message: 'Adjustment must be a non-zero number.' };
    }

    if (currentQuantity + change < 0) {
      return { valid: false, message: 'Adjustment cannot result in negative stock.' };
    }

    if (change > 0) {
      if (selectedRow.requires_lot_tracking && !draft.lot_number.trim() && !draft.batch_number.trim()) {
        return { valid: false, message: 'This product requires a lot or batch number for added stock.' };
      }
      if (selectedRow.requires_expiry_date && !draft.expiry_date) {
        return { valid: false, message: 'This product requires an expiry date for added stock.' };
      }
    }

    if (createsReservationShortfall && !draft.reservation_shortfall_acknowledged) {
      return {
        valid: false,
        message: 'Confirm that the adjustment creates a shortage against active reservations.'
      };
    }

    return { valid: true, message: '' };
  }, [
    createsReservationShortfall,
    currentProjectedFreeQuantity,
    currentQuantity,
    draft.action,
    draft.change,
    draft.quantity,
    draft.reservation_shortfall_acknowledged,
    draft.lot_number,
    draft.batch_number,
    draft.expiry_date,
    selectedRow
  ]);

  const operationalRiskLabel = createsReservationShortfall
    ? draft.action === 'consume'
      ? 'Blocked: this consumption would use stock reserved for active commitments.'
      : draft.reservation_shortfall_acknowledged
        ? 'Warning acknowledged: this correction leaves active reservations short.'
        : actionInputValidation.message
    : !actionInputValidation.valid
      ? actionInputValidation.message
      : nextQuantityPreview !== null && nextQuantityPreview < currentMinimum
        ? 'Warning: this action would leave stock below its minimum level.'
        : 'Within allowed range';

  const currentActionDisabled =
    activeMutation ||
    !selectedRow ||
    !currentActionAllowed ||
    !actionInputValidation.valid;

  const refreshStockWorkbench = async () => {
    setOperationFeedback('');
    setOperationError('');

    await Promise.all([
      stockQuery.refetch(),
      showLotIntegrity ? lotsQuery.refetch() : Promise.resolve(),
      showLotIntegrity ? reconciliationQuery.refetch() : Promise.resolve(),
      selectedProductId && canViewMovements ? movementsQuery.refetch() : Promise.resolve(),
      selectedProductId && selectedLocationId && canViewInventoryUsage
        ? usageLogsQuery.refetch()
        : Promise.resolve(),
      selectedProductId && selectedLocationId && canViewInventoryUsage
        ? usageSummaryQuery.refetch()
        : Promise.resolve()
    ]);
  };

  const isRefreshingStockWorkbench =
    stockQuery.isFetching ||
    (showLotIntegrity && (lotsQuery.isFetching || reconciliationQuery.isFetching)) ||
    (Boolean(selectedProductId) && canViewMovements && movementsQuery.isFetching) ||
    (Boolean(selectedProductId && selectedLocationId) && canViewInventoryUsage && usageLogsQuery.isFetching) ||
    (Boolean(selectedProductId && selectedLocationId) && canViewInventoryUsage && usageSummaryQuery.isFetching);

  const stockWorkflowSteps = [
    {
      label: '1. Select Stock Position',
      detail: selectedRow
        ? `${selectedRow.product_name || 'Selected product'} is selected for review.`
        : 'Choose the product and location you want to review or update.',
      complete: Boolean(selectedRow)
    },
    {
      label: '2. Choose Action',
      detail: !selectedRow
        ? 'Select a stock position before choosing an action.'
        : !currentActionAllowed
          ? currentActionBlockedMessage
          : draft.action === 'consume'
            ? 'Consume removes stock for day-to-day operational usage.'
            : draft.action === 'count'
              ? 'Count sets stock to the physically verified quantity.'
              : 'Adjust applies a positive or negative correction delta.',
      complete: Boolean(selectedRow) && currentActionAllowed
    },
    {
      label: '3. Verify Preview',
      detail:
        nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
          ? actionInputValidation.message
          : `Projected on hand: ${nextQuantityPreview}. Projected available: ${projectedFreeAfterAction}.`,
      complete: nextQuantityPreview !== null && Number.isFinite(nextQuantityPreview)
    },
    {
      label: '4. Confirm in Ledger',
      detail: lastResult
        ? 'The action was posted. Verify the result and the refreshed history below.'
        : 'Post the action, then verify its result and available history.',
      complete: Boolean(lastResult)
    }
  ];

  const submitAction = async () => {
    setOperationFeedback('');
    setOperationError('');

    if (!selectedRow) {
      setOperationError('Select a stock position before posting a stock action.');
      return;
    }

    if (!currentActionAllowed) {
      setOperationError(currentActionBlockedMessage);
      return;
    }

    if (!actionInputValidation.valid) {
      setOperationError(actionInputValidation.message);
      return;
    }

    try {
      if (draft.action === 'consume') {
        await consumeMutation.mutateAsync();
        return;
      }

      if (draft.action === 'count') {
        await countMutation.mutateAsync();
        return;
      }

      await adjustMutation.mutateAsync();
    } catch {
      /*
        Errors are already normalized and surfaced in individual mutation
        handlers so the page keeps one consistent operator-facing error surface.
      */
    }
  };

  const selectStockRow = (stockId: string) => {
    setSelectedStockId(stockId);
    const selectedActionAllowed =
      draft.action === 'consume' ? canConsume : draft.action === 'count' ? canCount : canAdjust;
    setDraft(getDefaultDraft(selectedActionAllowed ? draft.action : preferredAction));
    setOperationFeedback('');
    setOperationError('');
    setLastResult(null);

    window.requestAnimationFrame(() => {
      selectedDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      selectedDetailsRef.current?.focus({ preventScroll: true });
    });
  };

  const clearStockFilters = () => {
    setSearchText('');
    setLocationFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');

    if (requestedProductId) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('product_id');
      setSearchParams(nextSearchParams, { replace: true });
    }
  };

  const hasActiveStockFilters = Boolean(
    requestedProductId ||
    searchText.trim() ||
    locationFilter !== 'all' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all'
  );

  if (stockQuery.isLoading) {
    return (
      <div className="app-panel app-panel--padded">
        <div className="app-empty-state">Loading stock positions...</div>
      </div>
    );
  }

  if (stockQuery.isError) {
    return (
      <div className="app-panel app-panel--padded">
        <div className="app-error-state">
          Failed to load stock: {(stockQuery.error as Error).message || 'Unknown error'}
        </div>
        <div className="app-actions" style={styles.loadingActions}>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              void stockQuery.refetch();
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="io-operational-page io-stock-page io-workspace-page" style={styles.page}>
      <OperationalWorkspaceHero
        iconPath="/stock"
        eyebrow="Stock operations"
        title="Stock workspace"
        description="Review stock by product and location, see quantities assigned to reservations, and post controlled consumption, count, or adjustment actions."
        meta={<>
          <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{canAdjust ? 'Count and adjust access' : 'Stock review access'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{canConsume ? 'Consumption enabled' : 'Consumption restricted by role'}</OperationalWorkspaceMetaPill>
        </>}
        aside={canAdjust ? (
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={() => setShowOpeningStockImport((current) => !current)}
          >
            {showOpeningStockImport ? 'Hide opening stock setup' : 'Opening stock setup'}
          </button>
        ) : undefined}
      />

      <div className="app-grid-stats io-workspace-stats stock-page__summary-stats" style={styles.statsGrid}>
        <StatCard
          title="Stock Positions"
          value={summary.totalRows}
          subtitle="Tracked product and location combinations"
        />
        <StatCard
          title="Low Stock"
          value={summary.lowRows}
          subtitle="Below configured minimum threshold"
          tone={summary.lowRows > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title="Availability Risk"
          value={summary.availabilityRiskRows}
          subtitle="Available quantity below the minimum after reservations"
          tone={summary.availabilityRiskRows > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title="Total On Hand"
          value={summary.quantityTotal}
          subtitle="Combined visible quantity across loaded rows"
        />
        <StatCard
          title="Reserved"
          value={summary.reservedTotal}
          subtitle="Open quantity assigned to active reservations"
          tone={summary.reservedTotal > 0 ? 'warn' : 'default'}
        />
        <StatCard
          title="Available"
          value={summary.projectedFreeTotal}
          subtitle="On-hand quantity after active reservations"
          tone={summary.projectedFreeTotal < 0 ? 'warn' : 'good'}
        />
      </div>


      {canAdjust && showOpeningStockImport ? (
        <InventoryCsvImportPanel
          importType="opening_stock"
          title="Opening Stock Import"
          description="Use this only when onboarding a product/location with no prior stock history. Each row becomes an auditable opening-stock movement and lot balance; it is not a bulk adjustment tool."
          templateColumns={['product_sku', 'product_name', 'storage_location', 'quantity', 'lot_number', 'batch_number', 'expiry_date', 'manufactured_at', 'unit_cost']}
          templateExample={{ product_sku: 'BEV-COFFEE-001', product_name: '', storage_location: 'Main Warehouse', quantity: '25', lot_number: 'LOT-001', batch_number: '', expiry_date: '2027-12-31', manufactured_at: '2026-08-01', unit_cost: '18.50' }}
          canImport={canAdjust}
          disabledReason="Stock-adjust permission is required for opening-stock import."
          onCommitted={async () => {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['stock'] }),
              queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),
              queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),
              queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
              queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
              queryClient.invalidateQueries({ queryKey: ['products'] })
            ]);
          }}
        />
      ) : null}

      <section style={styles.workflowGuideGrid}>
        {stockWorkflowSteps.map((step) => (
          <article
            key={step.label}
            style={step.complete ? styles.workflowStepCardComplete : styles.workflowStepCard}
          >
            <div style={styles.workflowStepLabel}>{step.label}</div>
            <div style={styles.workflowStepText}>{step.detail}</div>
          </article>
        ))}
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.panelHeaderWithActions}>
          <div className="io-section-heading-with-icon" style={styles.panelHeaderText}>
            <span className="io-section-heading-icon"><TenantNavIcon path="/stock" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>Lot, Expiry & Stock Integrity</h3>
              <p style={styles.panelSubtitle}>
              Optional detail for lot balances, expiry risk, blocked stock, and reconciliation checks.
                Load it when you need to investigate expiry or stock-integrity questions.
              </p>
            </div>
          </div>
          <div style={styles.panelActions}>
            <button
              type="button"
              style={(lotsQuery.isFetching || reconciliationQuery.isFetching) ? styles.secondaryButtonDisabled : styles.secondaryButton}
              disabled={lotsQuery.isFetching || reconciliationQuery.isFetching}
              onClick={() => setShowLotIntegrity((current) => !current)}
            >
              {showLotIntegrity
                ? 'Hide lot & integrity details'
                : (lotsQuery.isFetching || reconciliationQuery.isFetching)
                  ? 'Loading details...'
                  : 'Load lot & integrity details'}
            </button>
            {showLotIntegrity && canAdjust ? (
              <button
                type="button"
                style={(processExpiredLotsMutation.isPending || expiredAvailableLots.length === 0) ? styles.secondaryButtonDisabled : styles.secondaryButton}
                disabled={processExpiredLotsMutation.isPending || expiredAvailableLots.length === 0}
                title={expiredAvailableLots.length === 0 ? 'No expired available lots currently need processing.' : undefined}
                onClick={() => {
                  if (!window.confirm(`Process ${expiredAvailableLots.length} expired available lot(s) now? This removes their quantities from usable stock and records expiry write-off movements.`)) return;
                  processExpiredLotsMutation.mutate();
                }}
              >
                {processExpiredLotsMutation.isPending ? 'Processing...' : `Process Expired Stock (${expiredAvailableLots.length})`}
              </button>
            ) : null}
          </div>
        </div>

        {!showLotIntegrity ? (
          <div style={styles.emptyPanel}>
            Lot and reconciliation details are kept closed by default so the everyday stock workspace can load with less database work.
          </div>
        ) : lotsQuery.isLoading || reconciliationQuery.isLoading ? (
          <div style={styles.emptyPanel}>Loading lot and stock-integrity details...</div>
        ) : lotsQuery.isError || reconciliationQuery.isError ? (
          <div className="app-error-state">
            Lot or reconciliation details could not be loaded. Try refreshing this section.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <label htmlFor="expiry-window" style={{ fontWeight: 700 }}>Expiry overview:</label>
              <select id="expiry-window" value={expiryWindowDays} onChange={(event) => setExpiryWindowDays(Number(event.target.value))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <option value={30}>Next 30 days</option>
                <option value={60}>Next 60 days</option>
                <option value={90}>Next 90 days</option>
                <option value={180}>Next 180 days</option>
              </select>
            </div>
            <div className="app-grid-stats" style={styles.statsGrid}>
              <StatCard title="Lot Balances" value={inventoryLots.length} subtitle="Available, held, quarantined, or expired lot-level balances" />
              <StatCard title={`Expiring ≤ ${expiryWindowDays} days`} value={expiryWindowLots.length} subtitle={`${expiryWindowQuantity} unit(s) in the selected window`} tone={expiryWindowLots.length ? 'warn' : 'good'} />
              <StatCard title="Expiry Value at Risk" value={formatCurrencyAmount(expiryWindowValue)} subtitle="Estimated from lot unit cost where available" tone={expiryWindowValue > 0 ? 'warn' : 'good'} />
              <StatCard title="Expired" value={inventoryLots.filter((lot) => lot.operational_status === 'expired').length} subtitle="Expired lot balances requiring or reflecting write-off status" tone={inventoryLots.some((lot) => lot.operational_status === 'expired') ? 'warn' : 'good'} />
              <StatCard title="Blocked / Held" value={inventoryLots.filter((lot) => lot.condition === 'hold').length} subtitle="Stock manually blocked from use" tone={inventoryLots.some((lot) => lot.condition === 'hold') ? 'warn' : 'good'} />
              <StatCard title="Quarantine" value={inventoryLots.filter((lot) => lot.condition === 'quarantine').length} subtitle="Stock received into quarantine" tone={inventoryLots.some((lot) => lot.condition === 'quarantine') ? 'warn' : 'good'} />
              <StatCard title="Ledger Mismatches" value={reconciliationQuery.data?.summary.ledger_mismatch_count ?? '-'} subtitle="Aggregate stock vs canonical movement ledger" tone={(reconciliationQuery.data?.summary.ledger_mismatch_count || 0) > 0 ? 'warn' : 'good'} />
              <StatCard title="Lot Mismatches" value={reconciliationQuery.data?.summary.lot_mismatch_count ?? '-'} subtitle="Aggregate stock vs available lot balances" tone={(reconciliationQuery.data?.summary.lot_mismatch_count || 0) > 0 ? 'warn' : 'good'} />
            </div>

            {inventoryLots.length === 0 ? (
              <div style={styles.emptyPanel}>No lot-level balances are currently available for this tenant.</div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>Product</th><th style={styles.th}>Location</th><th style={styles.th}>Lot / Batch</th><th style={styles.th}>Expiry</th><th style={styles.th}>Condition</th><th style={styles.th}>Quantity</th><th style={styles.th}>Action</th></tr></thead>
                  <tbody>
                    {inventoryLots.slice(0, 100).map((lot) => (
                      <tr key={lot.id}>
                        <td style={styles.td}>{lot.product_name || 'Unnamed product'}</td>
                        <td style={styles.td}>{lot.storage_location_name || 'Unknown location'}</td>
                        <td style={styles.td}>{formatLotReference(lot)}</td>
                        <td style={styles.td}>{lot.expiry_date ? formatDateTime(lot.expiry_date).split(',')[0] : '-'}</td>
                        <td style={styles.td}>{formatUsageReason(lot.operational_status || lot.condition)}</td>
                        <td style={styles.td}>{toNumber(lot.quantity)} {lot.product_unit || ''}</td>
                        <td style={styles.td}>{canAdjust ? (lot.condition === 'available' ? <button type="button" style={styles.rowActionButton} disabled={holdLotMutation.isPending} onClick={() => { const reason = window.prompt('Why should this stock be blocked from use?'); if (reason && reason.trim().length >= 3) holdLotMutation.mutate({ lotId: lot.id, reason: reason.trim() }); }}>Block</button> : lot.condition === 'hold' ? <button type="button" style={styles.rowActionButton} disabled={releaseHoldMutation.isPending} onClick={() => { const reason = window.prompt('Why is this stock safe to use again?'); if (reason && reason.trim().length >= 3) releaseHoldMutation.mutate({ lotId: lot.id, reason: reason.trim() }); }}>Unblock</button> : lot.condition === 'quarantine' ? <button type="button" style={styles.rowActionButton} disabled={releaseQuarantineMutation.isPending} onClick={() => { if (window.confirm('Release this quarantined lot into usable stock?')) releaseQuarantineMutation.mutate(lot.id); }}>Release</button> : '-') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.panelHeaderWithActions}>
          <div className="io-section-heading-with-icon" style={styles.panelHeaderText}>
            <span className="io-section-heading-icon"><TenantNavIcon path="/stock" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>Operational Workbench</h3>
              <p style={styles.panelSubtitle}>
              Find the correct product and location, review its balance, post an authorized
                stock action, and verify the result without leaving the page.
              </p>
            </div>
          </div>
          <div style={styles.panelActions}>
            <button
              type="button"
              style={
                isRefreshingStockWorkbench
                  ? styles.secondaryButtonDisabled
                  : styles.secondaryButton
              }
              disabled={isRefreshingStockWorkbench}
              onClick={() => {
                void refreshStockWorkbench();
              }}
            >
              {isRefreshingStockWorkbench ? 'Refreshing...' : 'Refresh Stock'}
            </button>
            {canViewMovements ? (
              <Link style={styles.secondaryLinkButton} to="/stock-movements">
                Open Full Stock Ledger
              </Link>
            ) : null}
          </div>
        </div>

        <div style={styles.roleGrid}>
          <div style={styles.roleCard}>
            <div style={styles.roleCardTitle}>Current Access Role</div>
            <div style={styles.roleCardValue}>{accessRoleLabel}</div>
            <div style={styles.roleCardSubtitle}>
              Actions and history panels follow the permissions assigned to this role.
            </div>
          </div>
          <div style={styles.permissionCard}>
            <div style={styles.permissionRow}>
              <span>Consume</span>
              <span style={canConsume ? styles.permissionAllowed : styles.permissionBlocked}>
                {canConsume ? 'Allowed' : 'Blocked'}
              </span>
            </div>
            <div style={styles.permissionRow}>
              <span>Count</span>
              <span style={canCount ? styles.permissionAllowed : styles.permissionBlocked}>
                {canCount ? 'Allowed' : 'Blocked'}
              </span>
            </div>
            <div style={styles.permissionRow}>
              <span>Adjust</span>
              <span style={canAdjust ? styles.permissionAllowed : styles.permissionBlocked}>
                {canAdjust ? 'Allowed' : 'Blocked'}
              </span>
            </div>
            <div style={styles.permissionRow}>
              <span>Movement history</span>
              <span style={canViewMovements ? styles.permissionAllowed : styles.permissionBlocked}>
                {canViewMovements ? 'Available' : 'Blocked'}
              </span>
            </div>
            <div style={styles.permissionRow}>
              <span>Usage history</span>
              <span style={canViewInventoryUsage ? styles.permissionAllowed : styles.permissionBlocked}>
                {canViewInventoryUsage ? 'Available' : 'Blocked'}
              </span>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={styles.emptyPanel}>
            No stock positions are available yet. Stock appears here after a product has an
            on-hand balance at a storage location.
          </div>
        ) : (
          <>
            <div style={styles.selectorPanel}>
              <div style={styles.selectorHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Stock Positions</h4>
                  <p style={styles.sectionDescription}>
                    Search and filter product-location balances, then select the position you
                    want to review or update.
                  </p>
                </div>
              </div>

              <div style={styles.filterGrid}>
                <div>
                  <label style={styles.label} htmlFor="stock-position-search">
                    Search stock
                  </label>
                  <input
                    id="stock-position-search"
                    style={styles.input}
                    type="search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Product, category, unit, or location"
                  />
                </div>
                <div>
                  <label style={styles.label} htmlFor="stock-location-filter">
                    Storage location
                  </label>
                  <select
                    id="stock-location-filter"
                    style={styles.input}
                    value={locationFilter}
                    onChange={(event) => setLocationFilter(event.target.value)}
                  >
                    <option value="all">All locations</option>
                    {locationOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label} htmlFor="stock-category-filter">
                    Category
                  </label>
                  <select
                    id="stock-category-filter"
                    style={styles.input}
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="all">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label} htmlFor="stock-status-filter">
                    Status
                  </label>
                  <select
                    id="stock-status-filter"
                    style={styles.input}
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as typeof statusFilter)
                    }
                  >
                    <option value="all">All statuses</option>
                    <option value="low">Low stock</option>
                    <option value="reserved-risk">Low available after reservations</option>
                    <option value="healthy">Healthy</option>
                  </select>
                </div>
              </div>

              <div style={styles.selectorFooter}>
                <span style={styles.resultCount}>
                  {filteredRows.length} of {rows.length} stock positions shown
                  {requestedProductId ? ' · Linked product filter active' : ''}
                </span>
                <button
                  type="button"
                  style={hasActiveStockFilters ? styles.secondaryButton : styles.secondaryButtonDisabled}
                  disabled={!hasActiveStockFilters}
                  onClick={clearStockFilters}
                >
                  Clear Stock Filters
                </button>
              </div>

              {filteredRows.length === 0 ? (
                <div style={styles.emptyPanel}>
                  No stock positions match the current search and filters.
                </div>
              ) : (
                <>
                  <div className="stock-page__mobile-list" style={styles.mobileCardGrid}>
                    {filteredRows.map((item) => {
                      const quantity = toNumber(item.quantity);
                      const minQuantity = getEffectiveMinimum(item);
                      const reservedQuantity = toNumber(item.reserved_quantity);
                      const projectedFreeQuantity = getProjectedFreeQuantity(item);
                      const lowStock = quantity < minQuantity;
                      const overReserved = projectedFreeQuantity < 0;
                      const lowAvailable = !lowStock && projectedFreeQuantity < minQuantity;
                      const selected = selectedRow?.id === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          style={selected ? styles.stockCardSelectedButton : styles.stockCardButton}
                          onClick={() => selectStockRow(item.id)}
                        >
                          <div style={styles.stockCardTopRow}>
                            <div style={styles.stockCardTitleBlock}>
                              <div style={styles.rowTitle}>{item.product_name || 'Unnamed product'}</div>
                              <div style={styles.rowSubtle}>
                                {item.storage_location_name || 'Unknown location'}
                              </div>
                            </div>
                            <span
                              style={
                                overReserved
                                  ? styles.badgeError
                                  : lowStock || lowAvailable
                                    ? styles.badgeWarning
                                    : styles.badgeOk
                              }
                            >
                              {overReserved
                                ? 'OVER-RESERVED'
                                : lowStock
                                  ? 'LOW STOCK'
                                  : lowAvailable
                                    ? 'LOW AVAILABLE'
                                    : 'HEALTHY'}
                            </span>
                          </div>
                          <div style={styles.stockCardMetrics}>
                            <div style={styles.stockMetricItem}>
                              <div style={styles.stockMetricLabel}>On Hand</div>
                              <div style={styles.stockMetricValue}>{quantity}</div>
                            </div>
                            <div style={styles.stockMetricItem}>
                              <div style={styles.stockMetricLabel}>Reserved</div>
                              <div style={styles.stockMetricValue}>{reservedQuantity}</div>
                            </div>
                            <div style={styles.stockMetricItem}>
                              <div style={styles.stockMetricLabel}>Available</div>
                              <div style={styles.stockMetricValue}>{projectedFreeQuantity}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="stock-page__desktop-table" style={styles.desktopTablePanel}>
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Select</th>
                            <th style={styles.th}>Product</th>
                            <th style={styles.th}>Storage Location</th>
                            <th style={styles.th}>On Hand</th>
                            <th style={styles.th}>Reserved</th>
                            <th style={styles.th}>Available</th>
                            <th style={styles.th}>Minimum</th>
                            <th style={styles.th}>Unit</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((item) => {
                            const quantity = toNumber(item.quantity);
                            const minQuantity = getEffectiveMinimum(item);
                            const reservedQuantity = toNumber(item.reserved_quantity);
                            const projectedFreeQuantity = getProjectedFreeQuantity(item);
                            const lowStock = quantity < minQuantity;
                            const overReserved = projectedFreeQuantity < 0;
                            const lowAvailable = !lowStock && projectedFreeQuantity < minQuantity;
                            const selected = selectedRow?.id === item.id;

                            return (
                              <tr key={item.id} style={selected ? styles.selectedRow : undefined}>
                                <td style={styles.td}>
                                  <button
                                    type="button"
                                    style={selected ? styles.rowActionButtonSelected : styles.rowActionButton}
                                    onClick={() => selectStockRow(item.id)}
                                  >
                                    {selected ? 'Selected' : 'Select'}
                                  </button>
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.rowTitle}>{item.product_name || 'Unnamed product'}</div>
                                </td>
                                <td style={styles.td}>
                                  {item.storage_location_name || 'Unknown location'}
                                </td>
                                <td style={styles.td}>{quantity}</td>
                                <td style={styles.td}>{reservedQuantity}</td>
                                <td style={styles.td}>{projectedFreeQuantity}</td>
                                <td style={styles.td}>{minQuantity}</td>
                                <td style={styles.td}>{item.product_unit || '-'}</td>
                                <td style={styles.td}>
                                  <span
                                    style={
                                      overReserved
                                        ? styles.badgeError
                                        : lowStock || lowAvailable
                                          ? styles.badgeWarning
                                          : styles.badgeOk
                                    }
                                  >
                                    {overReserved
                                      ? 'OVER-RESERVED'
                                      : lowStock
                                        ? 'LOW STOCK'
                                        : lowAvailable
                                          ? 'LOW AVAILABLE'
                                          : 'HEALTHY'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.workbenchGrid}>
              <section
                ref={selectedDetailsRef}
                tabIndex={-1}
                style={styles.workbenchColumn}
              >
                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>Selected Stock Position</h4>

                  {selectedRow ? (
                    <div style={styles.selectionSummary}>
                      <div style={styles.selectionPrimaryRow}>
                        <div style={styles.selectionPrimaryText}>
                          <div style={styles.selectedTitle}>
                            {selectedRow.product_name || 'Unnamed product'}
                          </div>
                        </div>
                        <span
                          style={
                            selectedOverReserved
                              ? styles.badgeError
                              : selectedLowStock || selectedLowAvailable
                                ? styles.badgeWarning
                                : styles.badgeOk
                          }
                        >
                          {selectedOverReserved
                            ? 'OVER-RESERVED'
                            : selectedLowStock
                              ? 'LOW STOCK'
                              : selectedLowAvailable
                                ? 'LOW AVAILABLE'
                                : 'HEALTHY'}
                        </span>
                      </div>

                      <div style={styles.selectionGrid}>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Storage Location</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.storage_location_name || 'Unknown location'}
                          </div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>On-Hand Quantity</div>
                          <div style={styles.selectionValue}>{currentQuantity}</div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Reserved / Allocated</div>
                          <div style={styles.selectionValue}>{currentReservedQuantity}</div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Available Quantity</div>
                          <div style={styles.selectionValue}>{currentProjectedFreeQuantity}</div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Minimum Quantity</div>
                          <div style={styles.selectionValue}>{currentMinimum}</div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Unit</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.product_unit || '-'}
                          </div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Category</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.product_category || '-'}
                          </div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Temperature Zone</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.temperature_zone || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.emptyPanel}>Select a stock position to begin.</div>
                  )}
                </div>

                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>Action Readiness</h4>
                  <div style={styles.readinessList}>
                    <div style={styles.readinessRow}>
                      <span>Selected position</span>
                      <strong>{selectedRow ? 'Ready' : 'Required'}</strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>Current action</span>
                      <strong>{getActionLabel(draft.action)}</strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>Projected on hand</span>
                      <strong>
                        {nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
                          ? '-'
                          : nextQuantityPreview}
                      </strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>Projected available after reservations</span>
                      <strong>{projectedFreeAfterAction ?? '-'}</strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>Ledger verification</span>
                      <strong>{lastResult ? 'Posted — verify below' : 'Pending current action'}</strong>
                    </div>
                  </div>
                </div>

                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>Post Stock Action</h4>
                  <p style={styles.sectionDescription}>
                    Post a controlled stock change against the selected product and location.
                    The system validates permissions and records the resulting operational history.
                  </p>

                  <div style={styles.actionSelectorGrid}>
                    <button
                      type="button"
                      style={
                        !canConsume
                          ? styles.actionTypeButtonDisabled
                          : draft.action === 'consume'
                            ? styles.actionTypeButtonSelected
                            : styles.actionTypeButton
                      }
                      disabled={!canConsume}
                      title={!canConsume ? currentActionBlockedMessage : undefined}
                      onClick={() => {
                        setDraft(getDefaultDraft('consume'));
                        setOperationFeedback('');
                        setOperationError('');
                        setLastResult(null);
                      }}
                    >
                      Consume
                    </button>
                    <button
                      type="button"
                      style={
                        !canCount
                          ? styles.actionTypeButtonDisabled
                          : draft.action === 'count'
                            ? styles.actionTypeButtonSelected
                            : styles.actionTypeButton
                      }
                      disabled={!canCount}
                      title={!canCount ? 'Your current access role cannot post physical stock counts.' : undefined}
                      onClick={() => {
                        setDraft(getDefaultDraft('count'));
                        setOperationFeedback('');
                        setOperationError('');
                        setLastResult(null);
                      }}
                    >
                      Count
                    </button>
                    <button
                      type="button"
                      style={
                        !canAdjust
                          ? styles.actionTypeButtonDisabled
                          : draft.action === 'adjust'
                            ? styles.actionTypeButtonSelected
                            : styles.actionTypeButton
                      }
                      disabled={!canAdjust}
                      title={!canAdjust ? 'Your current access role cannot apply manual stock adjustments.' : undefined}
                      onClick={() => {
                        setDraft(getDefaultDraft('adjust'));
                        setOperationFeedback('');
                        setOperationError('');
                        setLastResult(null);
                      }}
                    >
                      Adjust
                    </button>
                  </div>

                  <div style={styles.actionInfoBox}>
                    <div style={styles.actionInfoTitle}>{getActionLabel(draft.action)}</div>
                    <div style={styles.actionInfoText}>{getActionHelpText(draft.action)}</div>
                  </div>

                  {draft.action === 'consume' && !canConsume ? (
                    <div className="app-warning-state" style={styles.warningBox}>
                      Stock consumption requires both stock-consumption and inventory-usage
                      recording access.
                    </div>
                  ) : null}

                  {draft.action === 'count' && !canCount ? (
                    <div className="app-warning-state" style={styles.warningBox}>
                      Your current access role cannot post physical stock counts.
                    </div>
                  ) : null}

                  {draft.action === 'adjust' && !canAdjust ? (
                    <div className="app-warning-state" style={styles.warningBox}>
                      Your current access role cannot apply manual stock adjustments.
                    </div>
                  ) : null}

                  <div style={styles.formGrid}>
                    {(draft.action === 'consume' || draft.action === 'count') && (
                      <div>
                        <label
                          style={styles.label}
                          htmlFor="stock-action-quantity"
                        >
                          {draft.action === 'consume' ? 'Quantity to Consume' : 'Counted Quantity'}
                        </label>
                        <input
                          id="stock-action-quantity"
                          style={styles.input}
                          type="number"
                          inputMode="decimal"
                          min={draft.action === 'consume' ? '0.0001' : '0'}
                          step="0.01"
                          value={draft.quantity}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              quantity: event.target.value
                            }))
                          }
                        />
                      </div>
                    )}

                    {draft.action === 'adjust' && (
                      <div>
                        <label style={styles.label} htmlFor="stock-adjustment-change">
                          Adjustment Change
                        </label>
                        <input
                          id="stock-adjustment-change"
                          style={styles.input}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={draft.change}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              change: event.target.value
                            }))
                          }
                        />
                      </div>
                    )}

                    {actionAddsStock ? (
                      <>
                        <div style={{ gridColumn: '1 / -1', ...styles.actionInfoBox }}>
                          <div style={styles.actionInfoTitle}>Tracking details for added stock</div>
                          <div style={styles.actionInfoText}>
                            {trackingDetailsNeeded
                              ? 'This product requires the tracking details shown below before stock can be added.'
                              : 'Optional. Use these fields when you want the added stock tied to a specific lot/batch or expiry date.'}
                          </div>
                        </div>
                        <div>
                          <label style={styles.label} htmlFor="stock-action-lot">Lot Number{selectedRow?.requires_lot_tracking ? ' *' : ''}</label>
                          <input id="stock-action-lot" style={styles.input} type="text" maxLength={255} value={draft.lot_number} onChange={(event) => setDraft((current) => ({ ...current, lot_number: event.target.value }))} placeholder="Optional unless required" />
                        </div>
                        <div>
                          <label style={styles.label} htmlFor="stock-action-batch">Batch Number{selectedRow?.requires_lot_tracking ? ' *' : ''}</label>
                          <input id="stock-action-batch" style={styles.input} type="text" maxLength={255} value={draft.batch_number} onChange={(event) => setDraft((current) => ({ ...current, batch_number: event.target.value }))} placeholder="Lot or batch satisfies tracking" />
                        </div>
                        <div>
                          <label style={styles.label} htmlFor="stock-action-expiry">Expiry Date{selectedRow?.requires_expiry_date ? ' *' : ''}</label>
                          <input id="stock-action-expiry" style={styles.input} type="date" value={draft.expiry_date} onChange={(event) => setDraft((current) => ({ ...current, expiry_date: event.target.value }))} />
                        </div>
                        <div>
                          <label style={styles.label} htmlFor="stock-action-manufactured">Manufactured Date</label>
                          <input id="stock-action-manufactured" style={styles.input} type="date" value={draft.manufactured_at} onChange={(event) => setDraft((current) => ({ ...current, manufactured_at: event.target.value }))} />
                        </div>
                      </>
                    ) : null}

                    {draft.action !== 'consume' ? (
                      <div>
                        <label style={styles.label} htmlFor="stock-action-reason">
                          Audit Note
                        </label>
                        <input
                          id="stock-action-reason"
                          style={styles.input}
                          type="text"
                          maxLength={1000}
                          value={draft.reason}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              reason: event.target.value
                            }))
                          }
                          placeholder="Optional explanation for this count or adjustment"
                        />
                      </div>
                    ) : null}

                    {draft.action === 'consume' && (
                      <>
                        <div>
                          <label style={styles.label} htmlFor="stock-usage-reason">
                            Usage Reason
                          </label>
                          <select
                            id="stock-usage-reason"
                            style={styles.input}
                            value={draft.consumption_reason}
                            onChange={(event) => {
                              const nextReason = event.target.value as UsageReason;
                              setDraft((current) => ({
                                ...current,
                                consumption_reason: nextReason,
                                reason: `usage:${nextReason}`
                              }));
                            }}
                          >
                            {USAGE_REASON_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={styles.label} htmlFor="stock-usage-department">
                            Department / Team
                          </label>
                          <input
                            id="stock-usage-department"
                            style={styles.input}
                            type="text"
                            maxLength={255}
                            value={draft.department}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                department: event.target.value
                              }))
                            }
                            placeholder="Housekeeping, maintenance, kitchen..."
                          />
                        </div>

                        <div>
                          <label style={styles.label} htmlFor="stock-usage-event">
                            Event / Job Name
                          </label>
                          <input
                            id="stock-usage-event"
                            style={styles.input}
                            type="text"
                            maxLength={255}
                            value={draft.event_name}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                event_name: event.target.value
                              }))
                            }
                            placeholder="Optional event, work order, or service context"
                          />
                        </div>

                        <div>
                          <label style={styles.label} htmlFor="stock-consumed-at">
                            Consumed At
                          </label>
                          <input
                            id="stock-consumed-at"
                            style={styles.input}
                            type="datetime-local"
                            value={draft.consumed_at}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                consumed_at: event.target.value
                              }))
                            }
                          />
                        </div>

                        <div style={styles.fullWidthField}>
                          <label style={styles.label} htmlFor="stock-usage-notes">
                            Usage Notes
                          </label>
                          <textarea
                            id="stock-usage-notes"
                            style={styles.textarea}
                            maxLength={4000}
                            value={draft.notes}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                notes: event.target.value
                              }))
                            }
                            placeholder="Optional context for audit, waste, damage, guest issue, event prep, or maintenance usage"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {draft.action === 'consume' ? (
                    <div style={styles.usageReasonHelpBox}>
                      <strong>Usage audit context:</strong>{' '}
                      {USAGE_REASON_OPTIONS.find((option) => option.value === draft.consumption_reason)?.description}
                    </div>
                  ) : null}

                  <div style={styles.previewBox}>
                    <div style={styles.previewRow}>
                      <span>Current On Hand</span>
                      <strong>{currentQuantity}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>Projected On Hand</span>
                      <strong>
                        {nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
                          ? '-'
                          : nextQuantityPreview}
                      </strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>Reserved / Allocated</span>
                      <strong>{currentReservedQuantity}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>Projected Available</span>
                      <strong>{projectedFreeAfterAction ?? '-'}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>Minimum Quantity</span>
                      <strong>{currentMinimum}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>Operational Risk</span>
                      <strong style={createsReservationShortfall || operationalRiskLabel.startsWith('Warning') ? styles.riskWarning : undefined}>
                        {operationalRiskLabel}
                      </strong>
                    </div>
                  </div>

                  {createsReservationShortfall && draft.action !== 'consume' ? (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.85rem 1rem',
                        border: '1px solid #f59e0b',
                        borderRadius: '0.75rem',
                        background: '#fffbeb',
                        color: '#92400e',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={draft.reservation_shortfall_acknowledged}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            reservation_shortfall_acknowledged: event.target.checked
                          }))
                        }
                      />
                      <span>
                        I confirm this physical count or correction is real, even though it leaves less stock than is reserved.
                        I understand the affected reservations must be reviewed immediately.
                      </span>
                    </label>
                  ) : null}

                  {operationFeedback ? (
                    <div className="app-success-state" style={styles.successBox}>
                      {operationFeedback}
                    </div>
                  ) : null}
                  {operationError ? (
                    <div className="app-error-state" style={styles.errorBox}>
                      {operationError}
                    </div>
                  ) : null}

                  <div className="app-actions" style={styles.actionFooter}>
                    <button
                      type="button"
                      style={
                        currentActionDisabled
                          ? styles.primaryButtonDisabled
                          : styles.primaryButton
                      }
                      disabled={currentActionDisabled}
                      aria-disabled={currentActionDisabled}
                      title={
                        !currentActionAllowed
                          ? currentActionBlockedMessage
                          : !actionInputValidation.valid
                            ? actionInputValidation.message
                            : undefined
                      }
                      onClick={() => {
                        void submitAction();
                      }}
                    >
                      {activeMutation
                        ? 'Submitting...'
                        : !currentActionAllowed
                          ? `${getActionLabel(draft.action)} blocked`
                          : getActionLabel(draft.action)}
                    </button>
                  </div>
                </div>

                {lastResult ? (
                  <div style={styles.innerPanel}>
                    <h4 style={styles.sectionTitle}>Last Operation Result</h4>
                    <div style={styles.selectionGrid}>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>Action</div>
                        <div style={styles.selectionValue}>{getActionLabel(draft.action)}</div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>Storage Location</div>
                        <div style={styles.selectionValue}>
                          {selectedRow?.storage_location_name || 'Unknown location'}
                        </div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>Previous Quantity</div>
                        <div style={styles.selectionValue}>{lastResult.stock.previous_quantity}</div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>New Quantity</div>
                        <div style={styles.selectionValue}>{lastResult.stock.new_quantity}</div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>Difference</div>
                        <div style={styles.selectionValue}>
                          {lastResult.stock.difference ?? lastResult.stock.change ?? '-'}
                        </div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>Message</div>
                        <div style={styles.selectionValue}>{lastResult.message}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section style={styles.workbenchColumn}>
                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>Latest Movement Verification</h4>
                  <p style={styles.sectionDescription}>
                    Recent movement history for the selected product. The current movement
                    ledger is product-wide and may include activity from other storage locations.
                  </p>

                  {!canViewMovements ? (
                    <div style={styles.emptyPanel}>
                      Movement history is unavailable because this role does not have stock
                      movement read access.
                    </div>
                  ) : movementsQuery.isLoading ? (
                    <p style={styles.sectionDescription}>Loading stock movements...</p>
                  ) : movementsQuery.isError ? (
                    <div className="app-error-state" style={styles.errorBox}>
                      Failed to load stock movements:{' '}
                      {(movementsQuery.error as Error).message || 'Unknown error'}
                    </div>
                  ) : recentMovements.length === 0 ? (
                    <div style={styles.emptyPanel}>
                      No stock movements found for the selected product yet.
                    </div>
                  ) : (
                    <div style={styles.movementList}>
                      {recentMovements.map((movement) => {
                        const change = toNumber(movement.change);

                        return (
                          <div key={movement.id} style={styles.movementCard}>
                            <div style={styles.movementTopRow}>
                              <div style={styles.movementTitleBlock}>
                                <div style={styles.movementTitle}>{movement.product_name}</div>
                                <div style={styles.rowSubtle}>
                                  {formatDateTime(movement.created_at)}
                                </div>
                              </div>
                              <span style={changeBadgeStyle(change)}>{changeDisplay(change)}</span>
                            </div>
                            <div style={styles.movementMetaRow}>
                              <span style={reasonBadgeStyle(movement.reason)} title={movement.reason}>
                                {formatMovementReason(movement.reason)}
                              </span>
                              <span style={styles.rowSubtle}>
                                By {movement.user_name || 'System / unknown user'}
                              </span>
                            </div>
                            {movement.shipment_po_number ? (
                              <div style={styles.rowSubtle}>
                                Shipment PO: {movement.shipment_po_number}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>Usage Ledger Snapshot</h4>
                  <p style={styles.sectionDescription}>
                    Consumption history for the selected product at{' '}
                    <strong>
                      {selectedRow?.storage_location_name || 'the selected location'}
                    </strong>.
                  </p>

                  {!canViewInventoryUsage ? (
                    <div style={styles.emptyPanel}>
                      Usage history is unavailable because this role does not have inventory
                      usage read access.
                    </div>
                  ) : usageSummaryQuery.isLoading ? (
                    <p style={styles.sectionDescription}>Loading usage summary...</p>
                  ) : usageSummaryQuery.isError ? (
                    <div className="app-error-state" style={styles.errorBox}>
                      Failed to load usage summary:{' '}
                      {(usageSummaryQuery.error as Error).message || 'Unknown error'}
                    </div>
                  ) : (
                    <div style={styles.selectionGrid}>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>Usage Events</div>
                        <div style={styles.selectionValue}>
                          {toNumber(usageSummaryQuery.data?.totals?.usage_count)}
                        </div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>Total Consumed</div>
                        <div style={styles.selectionValue}>
                          {toNumber(usageSummaryQuery.data?.totals?.total_quantity)}
                        </div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>Last Consumed</div>
                        <div style={styles.selectionValue}>
                          {formatDateTime(usageSummaryQuery.data?.totals?.last_consumed_at)}
                        </div>
                      </div>
                    </div>
                  )}

                  {canViewInventoryUsage && usageSummaryQuery.data?.by_reason?.length ? (
                    <div style={styles.usageReasonGrid}>
                      {usageSummaryQuery.data.by_reason.slice(0, 4).map((row) => (
                        <div key={row.consumption_reason} style={styles.usageReasonCard}>
                          <div style={styles.selectionLabel}>
                            {formatUsageReason(row.consumption_reason)}
                          </div>
                          <div style={styles.selectionValue}>{toNumber(row.total_quantity)}</div>
                          <div style={styles.rowSubtle}>{toNumber(row.usage_count)} events</div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {!canViewInventoryUsage ? null : usageLogsQuery.isLoading ? (
                    <p style={styles.sectionDescription}>Loading usage ledger...</p>
                  ) : usageLogsQuery.isError ? (
                    <div className="app-error-state" style={styles.errorBox}>
                      Failed to load usage ledger:{' '}
                      {(usageLogsQuery.error as Error).message || 'Unknown error'}
                    </div>
                  ) : !usageLogsQuery.data?.length ? (
                    <div style={styles.emptyPanel}>
                      No first-class usage logs found for the selected product yet.
                    </div>
                  ) : (
                    <div style={styles.movementList}>
                      {usageLogsQuery.data.map((usage) => (
                        <div key={usage.id} style={styles.movementCard}>
                          <div style={styles.movementTopRow}>
                            <div style={styles.movementTitleBlock}>
                              <div style={styles.movementTitle}>
                                {formatUsageReason(usage.consumption_reason)}
                              </div>
                              <div style={styles.rowSubtle}>
                                {formatDateTime(usage.consumed_at)}
                              </div>
                            </div>
                            <span style={changeBadgeStyle(-Math.abs(toNumber(usage.quantity)))}>
                              -{toNumber(usage.quantity)}
                            </span>
                          </div>
                          <div style={styles.movementMetaRow}>
                            <span style={styles.rowSubtle}>
                              {usage.department || 'No department'}
                            </span>
                            <span style={styles.rowSubtle}>
                              By {usage.created_by_user_name || 'System / unknown user'}
                            </span>
                          </div>
                          {usage.event_name ? (
                            <div style={styles.rowSubtle}>Event/job: {usage.event_name}</div>
                          ) : null}
                          <div style={styles.rowSubtle}>
                            Location: {usage.storage_location_name || 'Unknown location'}
                          </div>
                          {usage.notes ? (
                            <div style={styles.usageNotes}>{usage.notes}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

          </>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: '100%',
    minWidth: 0
  },
  header: {
    marginBottom: '20px',
    minWidth: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap'
  },
  headerTextBlock: {
    minWidth: 0
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  description: {
    margin: '8px 0 0 0',
    color: '#64748b',
    lineHeight: 1.6,
    maxWidth: '820px',
    wordBreak: 'break-word'
  },
  loadingActions: {
    marginTop: '14px'
  },
  workflowGuideGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
    width: '100%',
    minWidth: 0
  },
  workflowStepCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
    display: 'grid',
    gap: '8px',
    minWidth: 0
  },
  workflowStepCardComplete: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '16px',
    padding: '14px',
    display: 'grid',
    gap: '8px',
    minWidth: 0
  },
  workflowStepLabel: {
    fontSize: '0.86rem',
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  workflowStepText: {
    color: '#475569',
    lineHeight: 1.5,
    fontSize: '0.92rem',
    wordBreak: 'break-word'
  },
  statsGrid: {
    marginBottom: '20px',
    width: '100%',
    minWidth: 0
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    minWidth: 0
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534',
    wordBreak: 'break-word'
  },
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e',
    wordBreak: 'break-word'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.4
  },
  panel: {
    minWidth: 0,
    overflow: 'hidden'
  },
  panelHeaderWithActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px',
    minWidth: 0
  },
  panelHeaderText: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    wordBreak: 'break-word'
  },
  panelSubtitle: {
    margin: '8px 0 0 0',
    color: '#64748b',
    lineHeight: 1.5,
    maxWidth: '880px',
    wordBreak: 'break-word'
  },
  panelActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap'
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 700,
    minHeight: '46px',
    cursor: 'pointer'
  },
  secondaryButtonDisabled: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    color: '#64748b',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 700,
    minHeight: '46px',
    cursor: 'not-allowed',
    opacity: 0.85
  },
  secondaryLinkButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 700,
    minHeight: '46px'
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
    width: '100%',
    minWidth: 0
  },
  roleCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '16px',
    minWidth: 0
  },
  roleCardTitle: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 600,
    marginBottom: '8px'
  },
  roleCardValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  roleCardSubtitle: {
    color: '#64748b',
    lineHeight: 1.5,
    fontSize: '13px'
  },
  permissionCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '16px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  permissionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    fontSize: '14px',
    flexWrap: 'wrap'
  },
  permissionAllowed: {
    color: '#166534',
    fontWeight: 700
  },
  permissionBlocked: {
    color: '#991b1b',
    fontWeight: 700
  },
  emptyPanel: {
    padding: '18px',
    border: '1px dashed #cbd5e1',
    borderRadius: '14px',
    background: '#f8fafc',
    color: '#475569',
    lineHeight: 1.6
  },
  selectorPanel: {
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    background: '#ffffff',
    padding: '16px',
    marginBottom: '16px',
    minWidth: 0
  },
  selectorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))',
    gap: '12px',
    marginBottom: '14px',
    minWidth: 0
  },
  selectorFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '14px'
  },
  resultCount: {
    color: '#64748b',
    fontSize: '13px'
  },
  mobileCardGrid: {
    display: 'grid',
    gap: '12px',
    marginBottom: '16px'
  },
  stockCardButton: {
    appearance: 'none',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    textAlign: 'left',
    cursor: 'pointer',
    minWidth: 0
  },
  stockCardSelectedButton: {
    appearance: 'none',
    border: '2px solid #2563eb',
    background: '#eff6ff',
    borderRadius: '14px',
    padding: '16px',
    textAlign: 'left',
    cursor: 'pointer',
    minWidth: 0
  },
  stockCardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '14px',
    flexWrap: 'wrap'
  },
  stockCardTitleBlock: {
    minWidth: 0,
    flex: '1 1 220px'
  },
  stockCardMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: '10px'
  },
  stockMetricItem: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px',
    minWidth: 0
  },
  stockMetricLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '4px'
  },
  stockMetricValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  workbenchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
    gap: '16px',
    marginBottom: '16px',
    width: '100%',
    minWidth: 0
  },
  workbenchColumn: {
    display: 'grid',
    gap: '16px',
    alignContent: 'start',
    minWidth: 0
  },
  innerPanel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '16px',
    minWidth: 0,
    overflow: 'hidden'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  sectionDescription: {
    margin: '8px 0 0 0',
    color: '#64748b',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  selectionSummary: {
    display: 'grid',
    gap: '16px'
  },
  selectionPrimaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap'
  },
  selectionPrimaryText: {
    minWidth: 0,
    flex: '1 1 220px'
  },
  selectedTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  selectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    width: '100%',
    minWidth: 0
  },
  selectionItem: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px',
    background: '#f8fafc',
    minWidth: 0
  },
  selectionLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '6px'
  },
  selectionValue: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  usageReasonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '10px',
    marginTop: '12px',
    minWidth: 0
  },
  usageReasonCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    background: '#f8fafc',
    padding: '12px',
    minWidth: 0
  },
  usageNotes: {
    marginTop: '8px',
    borderRadius: '10px',
    background: '#f8fafc',
    padding: '10px',
    color: '#475569',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  actionSelectorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
    marginTop: '16px',
    marginBottom: '14px',
    width: '100%',
    minWidth: 0
  },
  actionTypeButton: {
    minHeight: '46px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  actionTypeButtonSelected: {
    minHeight: '46px',
    borderRadius: '12px',
    border: '1px solid #2563eb',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 800,
    cursor: 'pointer'
  },
  actionTypeButtonDisabled: {
    minHeight: '46px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#94a3b8',
    fontWeight: 700,
    cursor: 'not-allowed'
  },
  actionInfoBox: {
    borderRadius: '12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '14px',
    marginBottom: '14px'
  },
  actionInfoTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  actionInfoText: {
    color: '#64748b',
    lineHeight: 1.5,
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  warningBox: {
    marginBottom: '14px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
    gap: '14px',
    minWidth: 0
  },
  fullWidthField: {
    gridColumn: '1 / -1',
    minWidth: 0
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    minHeight: '46px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    padding: '12px 14px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    minHeight: '92px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    padding: '12px 14px',
    fontSize: '14px',
    lineHeight: 1.5,
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  usageReasonHelpBox: {
    marginTop: '14px',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#1e3a8a',
    padding: '12px 14px',
    lineHeight: 1.5
  },
  previewBox: {
    marginTop: '14px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  previewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    color: '#334155',
    flexWrap: 'wrap'
  },
  riskWarning: {
    color: '#92400e'
  },
  successBox: {
    marginTop: '14px'
  },
  errorBox: {
    marginTop: '14px'
  },
  actionFooter: {
    marginTop: '14px',
    justifyContent: 'flex-start'
  },
  primaryButton: {
    minHeight: '48px',
    borderRadius: '10px',
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: '#ffffff',
    padding: '0 18px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  primaryButtonDisabled: {
    minHeight: '48px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#e2e8f0',
    color: '#64748b',
    padding: '0 18px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'not-allowed',
    opacity: 0.85
  },
  readinessList: {
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  readinessRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '10px',
    color: '#334155',
    flexWrap: 'wrap'
  },
  movementList: {
    display: 'grid',
    gap: '12px',
    marginTop: '14px',
    minWidth: 0
  },
  movementCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '14px',
    background: '#ffffff',
    minWidth: 0
  },
  movementTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  movementTitleBlock: {
    minWidth: 0,
    flex: '1 1 220px'
  },
  movementTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  movementMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '8px'
  },
  desktopTablePanel: {
    marginTop: '8px'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto',
    minWidth: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '860px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#64748b'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  selectedRow: {
    background: '#eff6ff'
  },
  rowTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
    wordBreak: 'break-word'
  },
  rowActionButton: {
    minHeight: '38px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  rowActionButtonSelected: {
    minHeight: '38px',
    borderRadius: '10px',
    border: '1px solid #2563eb',
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  badgeBase: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap'
  },
  badgeOk: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    background: '#dcfce7',
    color: '#166534'
  },
  badgeWarning: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    background: '#fef3c7',
    color: '#92400e'
  },
  badgeError: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    background: '#fee2e2',
    color: '#991b1b'
  }
};