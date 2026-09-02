import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import {
  getCurrentAccessRoleLabel,
  getRoleCapabilities,
  hasPermission,
  TENANT_PERMISSIONS
} from '../lib/permissions';
import { InventoryCsvImportPanel } from '../components/imports/InventoryCsvImportPanel';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { OperationalWorkspaceHero, OperationalWorkspaceMetaPill, OperationalWorkspaceStatCard } from '../components/ui/OperationalWorkspace';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
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
  serial_tracking_enabled?: boolean;
  serial_required_on_receipt?: boolean;
  serial_required_on_issue?: boolean;
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
  unit_cost_currency?: string | null;
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
  movement_type?: string | null;
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
    version?: number;
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
  serial_numbers: string;
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


function formatUsageReason(reason: string | null | undefined): string {
  if (!reason) return 'Unassigned';

  return reason
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatLotReference(lot: InventoryLot, ui: (text: string) => string): string {
  const lotNumber = (lot.lot_number || '').trim();
  const batchNumber = (lot.batch_number || '').trim();

  if (lotNumber === 'LEGACY-UNTRACKED') {
    return ui('Untracked opening balance');
  }

  return [
    lotNumber ? `${ui('Lot')} ${lotNumber}` : '',
    batchNumber ? `${ui('Batch')} ${batchNumber}` : ''
  ].filter(Boolean).join(' · ') || ui('No lot / batch reference');
}

function getMovementReasonPresentation(movement: StockMovement): { text: string; systemOwned: boolean; detail?: string } {
  const reason = (movement.reason || '').trim();
  const normalizedReason = reason.toLowerCase();
  const movementType = (movement.movement_type || '').trim().toLowerCase();

  if (movementType === 'usage') {
    if (normalizedReason.startsWith('usage:')) return { text: formatUsageReason(normalizedReason.slice('usage:'.length)), systemOwned: true };
    return { text: reason || 'Stock consumed', systemOwned: !reason };
  }
  if (movementType === 'stock_count') {
    if (normalizedReason === 'inventory_count' || !reason) return { text: 'Physical count', systemOwned: true };
    return { text: reason, systemOwned: false };
  }
  if (movementType === 'manual_adjustment') {
    if (normalizedReason === 'manual_adjustment' || !reason) return { text: 'Manual adjustment', systemOwned: true };
    return { text: reason, systemOwned: false };
  }
  if (movementType === 'stock_hold' || movementType === 'stock_hold_release') {
    const detailMatch = reason.match(/^(?:stock_hold|stock_hold_release):[^:]+:(.*)$/i);
    const detail = detailMatch?.[1]?.trim();
    return {
      text: movementType === 'stock_hold' ? 'Stock placed on hold' : 'Stock hold released',
      systemOwned: true,
      ...(detail ? { detail } : {})
    };
  }

  const systemLabels: Record<string, string> = {
    shipment_receive: 'Shipment received',
    opening_stock: 'Opening stock',
    usage_reversal: 'Usage reversed',
    stock_transfer_in: 'Transfer received',
    stock_transfer_out: 'Transfer sent',
    reservation_fulfillment: 'Reservation fulfilled',
    requisition_fulfillment: 'Requisition fulfilled',
    cycle_count_reconciliation: 'Cycle count reconciled',
    expiry_writeoff: 'Expired stock write-off',
    quarantine_release: 'Quarantine released',
    stock_hold: 'Stock placed on hold',
    stock_hold_release: 'Stock hold released',
    supplier_return_dispatch: 'Supplier return sent',
    outbound_dispatch: 'Outbound dispatched',
    customer_return: 'Customer return'
  };

  if (movementType && systemLabels[movementType]) return { text: systemLabels[movementType], systemOwned: true };
  if (normalizedReason === 'shipment_receive') return { text: 'Shipment received', systemOwned: true };
  if (normalizedReason === 'inventory_count') return { text: 'Physical count', systemOwned: true };
  if (normalizedReason === 'manual_adjustment') return { text: 'Manual adjustment', systemOwned: true };
  if (normalizedReason.startsWith('usage:')) return { text: formatUsageReason(normalizedReason.slice('usage:'.length)), systemOwned: true };

  // Unknown/user-entered reason text is business evidence. Preserve it exactly
  // and keep it outside the repository-owned localization catalog.
  return { text: reason || 'Unspecified movement', systemOwned: !reason };
}

function getEffectiveMinimum(item: StockItem): number {
  const locationMinimum = toNumber(item.min_quantity);
  return locationMinimum > 0 ? locationMinimum : toNumber(item.product_min_stock);
}

function getAvailableLotQuantity(item: StockItem): number {
  return item.available_lot_quantity === undefined || item.available_lot_quantity === null
    ? toNumber(item.quantity)
    : toNumber(item.available_lot_quantity);
}

function getUsableLotQuantity(item: StockItem): number {
  return item.usable_lot_quantity === undefined || item.usable_lot_quantity === null
    ? toNumber(item.quantity)
    : toNumber(item.usable_lot_quantity);
}

function hasStockLotDesync(item: StockItem): boolean {
  return Math.abs(toNumber(item.quantity) - getAvailableLotQuantity(item)) > 0.0000001;
}

function parseSerialNumbers(value: string): string[] {
  return value.split(/[\n,]+/).map((serial) => serial.trim()).filter(Boolean);
}

function getLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
      manufactured_at: '',
      serial_numbers: ''
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
      manufactured_at: '',
      serial_numbers: ''
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
    manufactured_at: '',
    serial_numbers: ''
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

function changeDisplay(value: number, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  const formatted = formatLocalizedNumber(Math.abs(value), locale);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
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
  const { locale, ui } = useAppTranslation();
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'healthy' | 'reserved-risk' | 'integrity-risk'>('all');
  const [expiryWindowDays, setExpiryWindowDays] = useState(30);
  const [lotPage, setLotPage] = useState(0);
  const [countBaseVersion, setCountBaseVersion] = useState<number | null>(null);
  const lotPageSize = 100;
  const lotPageCount = Math.max(1, Math.ceil(inventoryLots.length / lotPageSize));
  const visibleInventoryLots = useMemo(
    () => inventoryLots.slice(lotPage * lotPageSize, (lotPage + 1) * lotPageSize),
    [inventoryLots, lotPage]
  );

  useEffect(() => {
    setLotPage((current) => Math.min(current, Math.max(lotPageCount - 1, 0)));
  }, [lotPageCount]);

  const expiryWindowLots = useMemo(() => inventoryLots.filter((lot) => { const days = lot.days_to_expiry === null || lot.days_to_expiry === undefined ? null : Number(lot.days_to_expiry); return lot.quantity && days !== null && Number.isFinite(days) && days >= 0 && days <= expiryWindowDays && !['expired'].includes(lot.operational_status || lot.condition); }), [inventoryLots, expiryWindowDays]);
  const expiryWindowPositionCount = useMemo(
    () => new Set(expiryWindowLots.map((lot) => `${lot.product_id}:${lot.storage_location_id}`)).size,
    [expiryWindowLots]
  );
  const expiryWindowCostEvidence = useMemo(() => {
    const totals = new Map<string, number>();
    let unknownCurrencyValueRows = 0;
    let unpricedRows = 0;
    for (const lot of expiryWindowLots) {
      if (lot.unit_cost === null || lot.unit_cost === undefined || String(lot.unit_cost).trim() === '') {
        unpricedRows += 1;
        continue;
      }
      const currency = (lot.unit_cost_currency || '').trim().toUpperCase();
      if (!currency) {
        unknownCurrencyValueRows += 1;
        continue;
      }
      const value = Number(lot.quantity || 0) * Number(lot.unit_cost);
      if (!Number.isFinite(value)) continue;
      totals.set(currency, (totals.get(currency) || 0) + value);
    }
    return { totals, unknownCurrencyValueRows, unpricedRows };
  }, [expiryWindowLots]);
  const expiryWindowCostRows = useMemo(
    () => [...expiryWindowCostEvidence.totals.entries()].sort(([left], [right]) => left.localeCompare(right)),
    [expiryWindowCostEvidence]
  );
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
        row.storage_location_name || ui("Unknown location")
      );
    }

    return [...values.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [rows, ui]);

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
        const usableQuantity = Math.min(quantity, getUsableLotQuantity(row));
        const minimum = getEffectiveMinimum(row);
        const projectedFree = getProjectedFreeQuantity(row);
        const isLow = usableQuantity < minimum;
        const hasReservationRisk = !isLow && projectedFree < minimum;
        const hasIntegrityRisk = hasStockLotDesync(row);

        if (statusFilter === 'low' && !isLow) return false;
        if (statusFilter === 'healthy' && (isLow || hasReservationRisk || hasIntegrityRisk)) return false;
        if (statusFilter === 'reserved-risk' && !hasReservationRisk) return false;
        if (statusFilter === 'integrity-risk' && !hasIntegrityRisk) return false;

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

  const updateDraft = (updater: (current: StockActionDraft) => StockActionDraft) => {
    setDraft(updater);
    setLastResult(null);
    setOperationFeedback('');
    setOperationError('');
  };

  useEffect(() => {
    if (!selectedStockId) return;
    if (filteredRows.some((row) => row.id === selectedStockId)) return;

    setSelectedStockId('');
    setCountBaseVersion(null);
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
    let integrityRisk = 0;
    let onHandPositions = 0;
    let reservedPositions = 0;
    let availablePositions = 0;

    for (const item of filteredRows) {
      const quantity = toNumber(item.quantity);
      const reservedQuantity = toNumber(item.reserved_quantity);
      const projectedFreeQuantity = getProjectedFreeQuantity(item);
      const usableQuantity = Math.min(quantity, getUsableLotQuantity(item));
      const minimum = getEffectiveMinimum(item);
      const hasIntegrityRisk = hasStockLotDesync(item);

      if (quantity > 0) onHandPositions += 1;
      if (reservedQuantity > 0) reservedPositions += 1;
      if (projectedFreeQuantity > 0 && !hasIntegrityRisk) availablePositions += 1;

      if (usableQuantity < minimum) {
        low += 1;
      }

      if (projectedFreeQuantity < minimum) availabilityRisk += 1;
      if (hasIntegrityRisk) integrityRisk += 1;
    }

    return {
      totalRows: filteredRows.length,
      lowRows: low,
      availabilityRiskRows: availabilityRisk,
      integrityRiskRows: integrityRisk,
      onHandPositions,
      reservedPositions,
      availablePositions
    };
  }, [filteredRows]);

  const currentQuantity = selectedRow ? toNumber(selectedRow.quantity) : 0;
  const currentReservedQuantity = selectedRow ? toNumber(selectedRow.reserved_quantity) : 0;
  const currentUsableLotQuantity = selectedRow ? getUsableLotQuantity(selectedRow) : 0;
  const currentProjectedFreeQuantity = selectedRow
    ? getProjectedFreeQuantity(selectedRow)
    : 0;
  const currentMinimum = selectedRow ? getEffectiveMinimum(selectedRow) : 0;
  const selectedStockLotDesync = Boolean(selectedRow) && hasStockLotDesync(selectedRow);
  const selectedLowStock = Boolean(selectedRow) && Math.min(currentQuantity, currentUsableLotQuantity) < currentMinimum;
  const selectedOverReserved = Boolean(selectedRow) && currentProjectedFreeQuantity < 0;
  const selectedLowAvailable =
    Boolean(selectedRow) && !selectedLowStock && currentProjectedFreeQuantity < currentMinimum;

  const invalidateStockOperationalQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['stock'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    ]);
  };

  const processExpiredLotsMutation = useMutation({
    mutationFn: () => apiRequest<{ processed_lot_count: number; processed_quantity: number }>('/stock/lots/expire-due', { method: 'POST', body: '{}' }),
    onSuccess: async (response) => {
      setOperationError('');
      setOperationFeedback(`${ui('Expired stock processed:')} ${formatLocalizedNumber(response.processed_lot_count, locale)} ${ui('lots written off.')}`);
      await invalidateStockOperationalQueries();
    },
    onError: async (error) => {
      setOperationError(error instanceof Error ? error.message : ui("Failed to process expired stock"));
      await invalidateStockOperationalQueries();
    }
  });

  const releaseQuarantineMutation = useMutation({
    mutationFn: (lotId: string) => apiRequest<InventoryLot>(`/stock/lots/${lotId}/release-quarantine`, { method: 'POST', body: '{}' }),
    onSuccess: async () => {
      setOperationError('');
      setOperationFeedback(ui("Quarantined lot released to available stock."));
      await invalidateStockOperationalQueries();
    },
    onError: async (error) => {
      setOperationError(error instanceof Error ? error.message : ui("Failed to release quarantined stock"));
      await invalidateStockOperationalQueries();
    }
  });

  const holdLotMutation = useMutation({
    mutationFn: ({ lotId, reason }: { lotId: string; reason: string }) => apiRequest<InventoryLot>(`/stock/lots/${lotId}/hold`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: async () => { setOperationError(''); setOperationFeedback(ui('Stock placed on hold and removed from usable quantity.')); await invalidateStockOperationalQueries(); },
    onError: async (error) => { setOperationError(error instanceof Error ? error.message : ui("Failed to place stock on hold")); await invalidateStockOperationalQueries(); }
  });

  const releaseHoldMutation = useMutation({
    mutationFn: ({ lotId, reason }: { lotId: string; reason: string }) => apiRequest<InventoryLot>(`/stock/lots/${lotId}/release-hold`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: async () => { setOperationError(''); setOperationFeedback(ui("Held stock released back to available stock.")); await invalidateStockOperationalQueries(); },
    onError: async (error) => { setOperationError(error instanceof Error ? error.message : ui("Failed to release held stock")); await invalidateStockOperationalQueries(); }
  });

  const consumeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) {
        throw new Error(ui("Select a stock position before consuming stock."));
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
          consumed_at: draft.consumed_at ? new Date(draft.consumed_at).toISOString() : null,
          serial_numbers: parseSerialNumbers(draft.serial_numbers)
        })
      });
    },
    onSuccess: async (response) => {
      setOperationError('');
      setOperationFeedback(ui('Stock consumed successfully.'));
      setLastResult(response);
      setDraft(getDefaultDraft('consume'));

      await Promise.all([
        invalidateStockOperationalQueries(),
        queryClient.invalidateQueries({ queryKey: ['inventory-usage-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-usage-summary'] })
      ]);
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : ui("Failed to consume stock");
      setOperationFeedback('');
      setOperationError(message);
      await invalidateStockOperationalQueries();
    }
  });

  const countMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) {
        throw new Error(ui("Select a stock position before applying a stock count."));
      }

      return apiRequest<StockMutationResponse>('/stock/count', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedRow.product_id,
          storage_location_id: selectedRow.storage_location_id,
          expected_version: countBaseVersion,
          quantity: Number(draft.quantity),
          reason: draft.reason.trim() || 'inventory_count',
          lot_number: Number(draft.quantity) > currentQuantity ? (draft.lot_number.trim() || null) : null,
          batch_number: Number(draft.quantity) > currentQuantity ? (draft.batch_number.trim() || null) : null,
          expiry_date: Number(draft.quantity) > currentQuantity ? (draft.expiry_date || null) : null,
          manufactured_at: Number(draft.quantity) > currentQuantity ? (draft.manufactured_at || null) : null,
          serial_numbers: parseSerialNumbers(draft.serial_numbers),
          reservation_shortfall_acknowledged: draft.reservation_shortfall_acknowledged
        })
      });
    },
    onSuccess: async (response) => {
      setOperationError('');
      setOperationFeedback(ui('Stock count applied successfully.'));
      setLastResult(response);
      setDraft(getDefaultDraft('count'));
      setCountBaseVersion(response.stock.version ?? null);

      await invalidateStockOperationalQueries();
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : ui("Failed to apply stock count");
      setOperationFeedback('');
      setOperationError(message);
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        setDraft(getDefaultDraft('count'));
        setCountBaseVersion(null);
      }
      await invalidateStockOperationalQueries();
    }
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) {
        throw new Error(ui("Select a stock position before applying an adjustment."));
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
          serial_numbers: parseSerialNumbers(draft.serial_numbers),
          reservation_shortfall_acknowledged: draft.reservation_shortfall_acknowledged
        })
      });
    },
    onSuccess: async (response) => {
      setOperationError('');
      setOperationFeedback(ui('Stock adjustment applied successfully.'));
      setLastResult(response);
      setDraft(getDefaultDraft('adjust'));

      await invalidateStockOperationalQueries();
    },
    onError: async (error) => {
      const message = error instanceof Error ? error.message : ui("Failed to adjust stock");
      setOperationFeedback('');
      setOperationError(message);
      await invalidateStockOperationalQueries();
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
      ? ui("Stock consumption requires both stock-consumption and inventory-usage recording access.")
      : draft.action === 'count'
        ? ui("Your current access does not allow physical stock counts.")
        : ui("Your current access does not allow manual stock adjustments.");

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
    : currentProjectedFreeQuantity + (nextQuantityPreview - currentQuantity);
  const createsReservationShortfall = projectedFreeAfterAction !== null
    && projectedFreeAfterAction < 0;

  const actionAddsStock = Boolean(selectedRow) && (
    (draft.action === 'count' && draft.quantity.trim() !== '' && Number(draft.quantity) > currentQuantity) ||
    (draft.action === 'adjust' && draft.change.trim() !== '' && Number(draft.change) > 0)
  );

  const trackingDetailsNeeded = Boolean(selectedRow) && actionAddsStock && (
    Boolean(selectedRow?.requires_lot_tracking) || Boolean(selectedRow?.requires_expiry_date)
  );
  const selectedSerialNumbers = useMemo(() => parseSerialNumbers(draft.serial_numbers), [draft.serial_numbers]);
  const hasDuplicateSelectedSerials = useMemo(
    () => new Set(selectedSerialNumbers).size !== selectedSerialNumbers.length,
    [selectedSerialNumbers]
  );

  const actionInputValidation = useMemo(() => {
    if (!selectedRow) {
      return { valid: false, message: ui("Select a stock position first.") };
    }

    if (selectedStockLotDesync) {
      return { valid: false, message: ui('Stock and available lot balances do not reconcile. Resolve the Stock integrity mismatch before posting an action.') };
    }

    if (actionAddsStock && draft.expiry_date && draft.expiry_date < getLocalIsoDate()) {
      return { valid: false, message: ui('Expired stock cannot be added as available inventory. Use the appropriate expired-stock workflow instead.') };
    }
    if (actionAddsStock && draft.manufactured_at && draft.expiry_date && draft.manufactured_at > draft.expiry_date) {
      return { valid: false, message: ui('Manufactured date cannot be after the expiry date.') };
    }

    if (draft.action === 'consume') {
      if (hasDuplicateSelectedSerials) {
        return { valid: false, message: ui('Serial numbers entered for one stock action must be unique.') };
      }
      if (draft.quantity.trim() === '') {
        return { valid: false, message: ui("Enter the quantity to consume.") };
      }

      const quantity = Number(draft.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return { valid: false, message: ui("Quantity to consume must be greater than zero.") };
      }

      if (quantity > currentQuantity) {
        return { valid: false, message: ui("Quantity to consume cannot exceed the on-hand quantity.") };
      }

      const unreservedQuantity = Math.max(currentProjectedFreeQuantity, 0);
      if (quantity > unreservedQuantity) {
        return {
          valid: false,
          message: `${ui('Only')} ${formatLocalizedNumber(unreservedQuantity, locale)} ${selectedRow.product_unit || ''} ${ui('is unreserved. Release or reallocate the reservation before consuming more.')}`.replace(/\s+/g, ' ').trim()
        };
      }

      if (selectedRow.serial_tracking_enabled && (selectedRow.serial_required_on_issue || selectedSerialNumbers.length > 0)) {
        if (!Number.isInteger(quantity)) return { valid: false, message: ui('Serial-tracked issue quantity must be a whole number.') };
        if (selectedSerialNumbers.length !== quantity) return { valid: false, message: ui('Enter exactly one serial number for each unit being consumed.') };
      }

      return { valid: true, message: '' };
    }

    if (draft.action === 'count') {
      if (hasDuplicateSelectedSerials) {
        return { valid: false, message: ui('Serial numbers entered for one stock action must be unique.') };
      }
      if (draft.quantity.trim() === '') {
        return { valid: false, message: ui("Enter the physically counted quantity.") };
      }

      const quantity = Number(draft.quantity);

      if (!Number.isFinite(quantity) || quantity < 0) {
        return { valid: false, message: ui("Counted quantity must be zero or greater.") };
      }

      const removalQuantity = Math.max(currentQuantity - quantity, 0);
      if (removalQuantity > currentUsableLotQuantity + 0.0000001) {
        return { valid: false, message: ui('This count would remove more stock than the non-expired available lots can provide. Process expired stock first, then refresh and recount.') };
      }

      if (selectedRow.serial_tracking_enabled) {
        if (!Number.isInteger(quantity)) return { valid: false, message: ui('Serial-tracked physical counts must use whole units.') };
        if (selectedSerialNumbers.length !== quantity) return { valid: false, message: ui('Enter exactly one serial number for every physically counted unit.') };
      }

      if (!Number.isInteger(countBaseVersion) || Number(countBaseVersion) < 1) {
        return { valid: false, message: ui("Re-enter the physical count after refreshing this stock position.") };
      }

      if (quantity > currentQuantity) {
        if (selectedRow.requires_lot_tracking && !draft.lot_number.trim() && !draft.batch_number.trim()) {
          return { valid: false, message: ui("This product requires a lot or batch number for added stock.") };
        }
        if (selectedRow.requires_expiry_date && !draft.expiry_date) {
          return { valid: false, message: ui("This product requires an expiry date for added stock.") };
        }
      }

      if (createsReservationShortfall && !draft.reservation_shortfall_acknowledged) {
        return {
          valid: false,
          message: ui("Confirm that the physical count creates a shortage against active reservations.")
        };
      }

      return { valid: true, message: '' };
    }

    if (draft.change.trim() === '') {
      return { valid: false, message: ui("Enter a positive or negative adjustment.") };
    }

    const change = Number(draft.change);

    if (hasDuplicateSelectedSerials) {
      return { valid: false, message: ui('Serial numbers entered for one stock action must be unique.') };
    }

    if (!Number.isFinite(change) || change === 0) {
      return { valid: false, message: ui("Adjustment must be a non-zero number.") };
    }

    if (selectedRow.serial_tracking_enabled) {
      if (!Number.isInteger(Math.abs(change))) return { valid: false, message: ui('Serial-tracked adjustments must use whole units.') };
      if (selectedSerialNumbers.length !== Math.abs(change)) return { valid: false, message: ui('Enter exactly one serial number for every unit in this adjustment.') };
    }

    if (currentQuantity + change < 0) {
      return { valid: false, message: ui("Adjustment cannot result in negative stock.") };
    }

    if (change < 0 && Math.abs(change) > currentUsableLotQuantity + 0.0000001) {
      return { valid: false, message: ui('This adjustment would remove more stock than the non-expired available lots can provide. Process expired stock first, then refresh and try again.') };
    }

    if (change > 0) {
      if (selectedRow.requires_lot_tracking && !draft.lot_number.trim() && !draft.batch_number.trim()) {
        return { valid: false, message: ui("This product requires a lot or batch number for added stock.") };
      }
      if (selectedRow.requires_expiry_date && !draft.expiry_date) {
        return { valid: false, message: ui("This product requires an expiry date for added stock.") };
      }
    }

    if (createsReservationShortfall && !draft.reservation_shortfall_acknowledged) {
      return {
        valid: false,
        message: ui("Confirm that the adjustment creates a shortage against active reservations.")
      };
    }

    return { valid: true, message: '' };
  }, [
    actionAddsStock,
    countBaseVersion,
    createsReservationShortfall,
    currentProjectedFreeQuantity,
    currentQuantity,
    currentUsableLotQuantity,
    draft.action,
    draft.change,
    draft.quantity,
    draft.reservation_shortfall_acknowledged,
    draft.lot_number,
    draft.batch_number,
    draft.expiry_date,
    draft.manufactured_at,
    hasDuplicateSelectedSerials,
    locale,
    selectedRow,
    selectedSerialNumbers,
    selectedStockLotDesync,
    ui
  ]);

  const operationalRiskLabel = createsReservationShortfall
    ? draft.action === 'consume'
      ? ui("Blocked: this consumption would use stock reserved for active commitments.")
      : draft.reservation_shortfall_acknowledged
        ? ui("Warning acknowledged: this correction leaves active reservations short.")
        : actionInputValidation.message
    : !actionInputValidation.valid
      ? actionInputValidation.message
      : projectedFreeAfterAction !== null && projectedFreeAfterAction < currentMinimum
        ? ui("Warning: this action would leave stock below its minimum level.")
        : ui("Within allowed range");

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
      label: ui("1. Select Stock Position"),
      detail: selectedRow
        ? `${selectedRow.product_name || ui("Selected product")} ${ui('is selected for review.')}`
        : ui("Choose the product and location you want to review or update."),
      complete: Boolean(selectedRow)
    },
    {
      label: ui("2. Choose Action"),
      detail: !selectedRow
        ? ui("Select a stock position before choosing an action.")
        : !currentActionAllowed
          ? currentActionBlockedMessage
          : draft.action === 'consume'
            ? ui('Consume removes stock for day-to-day operational usage.')
            : draft.action === 'count'
              ? ui("Count sets stock to the physically verified quantity.")
              : ui("Adjust applies a positive or negative correction delta."),
      complete: Boolean(selectedRow) && currentActionAllowed
    },
    {
      label: ui("3. Verify Preview"),
      detail:
        !actionInputValidation.valid || nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
          ? actionInputValidation.message
          : `${ui('Projected on hand:')} ${formatLocalizedNumber(nextQuantityPreview, locale)}. ${ui('Projected available:')} ${formatLocalizedNumber(projectedFreeAfterAction, locale)}.`,
      complete: actionInputValidation.valid && nextQuantityPreview !== null && Number.isFinite(nextQuantityPreview)
    },
    {
      label: ui("4. Confirm in Ledger"),
      detail: lastResult
        ? ui("The action was posted. Verify the result and the refreshed history below.")
        : ui("Post the action, then verify its result and available history."),
      complete: Boolean(lastResult)
    }
  ];

  const submitAction = async () => {
    setOperationFeedback('');
    setOperationError('');
    setLastResult(null);

    if (!selectedRow) {
      setOperationError(ui("Select a stock position before posting a stock action."));
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
    setCountBaseVersion(null);
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
        <div className="app-empty-state">{ui("Loading stock positions...")}</div>
      </div>
    );
  }

  if (stockQuery.isError) {
    return (
      <div className="app-panel app-panel--padded">
        <div className="app-error-state">
          {ui("Failed to load stock:")} {(stockQuery.error as Error).message || ui("Unknown error")}
        </div>
        <div className="app-actions" style={styles.loadingActions}>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              void stockQuery.refetch();
            }}
          >
            {ui("Try Again")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="io-operational-page io-stock-page io-workspace-page" style={styles.page}>
      <OperationalWorkspaceHero
        iconPath="/stock"
        eyebrow={ui("Stock operations")}
        title={ui("Stock workspace")}
        description={ui("Review stock by product and location, see quantities assigned to reservations, and post controlled consumption, count, or adjustment actions.")}
        meta={<>
          <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{canCount && canAdjust ? ui("Count and adjust access") : canCount ? ui('Count access') : canAdjust ? ui('Adjust access') : ui("Stock review access")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{canConsume ? ui("Consumption enabled") : ui("Consumption restricted by role")}</OperationalWorkspaceMetaPill>
        </>}
        aside={canAdjust ? (
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={() => setShowOpeningStockImport((current) => !current)}
          >
            {showOpeningStockImport ? ui("Hide opening stock setup") : ui("Opening stock setup")}
          </button>
        ) : undefined}
      />

      <div className="app-grid-stats io-workspace-stats stock-page__summary-stats" style={styles.statsGrid}>
        <StatCard
          title={ui("Stock Positions")}
          value={formatLocalizedNumber(summary.totalRows, locale)}
          subtitle={ui("Tracked product and location combinations in the current view")}
        />
        <StatCard
          title={ui("Low Stock")}
          value={formatLocalizedNumber(summary.lowRows, locale)}
          subtitle={ui("Below configured minimum threshold")}
          tone={summary.totalRows === 0 ? 'default' : summary.lowRows > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title={ui("Availability Risk")}
          value={formatLocalizedNumber(summary.availabilityRiskRows, locale)}
          subtitle={ui("Available quantity below the minimum after reservations")}
          tone={summary.totalRows === 0 ? 'default' : summary.availabilityRiskRows > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title={ui('Integrity Risk')}
          value={formatLocalizedNumber(summary.integrityRiskRows, locale)}
          subtitle={ui('Positions where aggregate Stock and available lot balances do not reconcile')}
          tone={summary.totalRows === 0 ? 'default' : summary.integrityRiskRows > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title={ui("On-Hand Positions")}
          value={formatLocalizedNumber(summary.onHandPositions, locale)}
          subtitle={ui("Positions with physical stock on hand")}
        />
        <StatCard
          title={ui("Reserved Positions")}
          value={formatLocalizedNumber(summary.reservedPositions, locale)}
          subtitle={ui("Positions with open reservations")}
          tone={summary.reservedPositions > 0 ? 'warn' : 'default'}
        />
        <StatCard
          title={ui("Available Positions")}
          value={formatLocalizedNumber(summary.availablePositions, locale)}
          subtitle={ui("Positions with usable non-expired stock after reservations")}
          tone={summary.totalRows === 0 ? 'default' : summary.availabilityRiskRows > 0 ? 'warn' : 'good'}
        />
      </div>


      {canAdjust && showOpeningStockImport ? (
        <InventoryCsvImportPanel
          importType="opening_stock"
          title={ui("Opening Stock Import")}
          description={ui("Use this only when onboarding a product/location with no prior stock history. Each row becomes an auditable opening-stock movement and lot balance; it is not a bulk adjustment tool.")}
          templateColumns={['product_sku', 'product_name', 'storage_location', 'quantity', 'lot_number', 'batch_number', 'expiry_date', 'manufactured_at', 'unit_cost']}
          templateExample={{ product_sku: 'BEV-COFFEE-001', product_name: '', storage_location: 'Main Warehouse', quantity: '25', lot_number: 'LOT-001', batch_number: '', expiry_date: '2027-12-31', manufactured_at: '2026-08-01', unit_cost: '18.50' }}
          canImport={canAdjust}
          disabledReason={ui("Stock-adjust permission is required for opening-stock import.")}
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
              <h3 style={styles.panelTitle}>{ui("Lot, Expiry & Stock Integrity")}</h3>
              <p style={styles.panelSubtitle}>
              {ui("Optional detail for lot balances, expiry risk, blocked stock, and reconciliation checks. Load it when you need to investigate expiry or stock-integrity questions.")}
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
                ? ui("Hide lot & integrity details")
                : (lotsQuery.isFetching || reconciliationQuery.isFetching)
                  ? ui("Loading details...")
                  : ui("Load lot & integrity details")}
            </button>
            {showLotIntegrity && canAdjust ? (
              <button
                type="button"
                style={(processExpiredLotsMutation.isPending || expiredAvailableLots.length === 0) ? styles.secondaryButtonDisabled : styles.secondaryButton}
                disabled={processExpiredLotsMutation.isPending || expiredAvailableLots.length === 0}
                title={expiredAvailableLots.length === 0 ? ui("No expired available lots currently need processing.") : undefined}
                onClick={() => {
                  if (!window.confirm(`${ui('Process')} ${formatLocalizedNumber(expiredAvailableLots.length, locale)} ${ui('expired available lots now? This removes their quantities from usable stock and records expiry write-off movements.')}`)) return;
                  processExpiredLotsMutation.mutate();
                }}
              >
                {processExpiredLotsMutation.isPending ? ui("Processing...") : `${ui('Process Expired Stock')} (${formatLocalizedNumber(expiredAvailableLots.length, locale)})`}
              </button>
            ) : null}
          </div>
        </div>

        {!showLotIntegrity ? (
          <div style={styles.emptyPanel}>
            {ui("Lot and reconciliation details are kept closed by default so the everyday stock workspace can load with less database work.")}
          </div>
        ) : lotsQuery.isLoading || reconciliationQuery.isLoading ? (
          <div style={styles.emptyPanel}>{ui("Loading lot and stock-integrity details...")}</div>
        ) : lotsQuery.isError || reconciliationQuery.isError ? (
          <div className="app-error-state">
            {ui("Lot or reconciliation details could not be loaded. Try refreshing this section.")}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <label htmlFor="expiry-window" style={{ fontWeight: 700 }}>{ui("Expiry overview:")}</label>
              <select id="expiry-window" value={expiryWindowDays} onChange={(event) => setExpiryWindowDays(Number(event.target.value))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <option value={30}>{ui("Next 30 days")}</option>
                <option value={60}>{ui("Next 60 days")}</option>
                <option value={90}>{ui("Next 90 days")}</option>
                <option value={180}>{ui("Next 180 days")}</option>
              </select>
            </div>
            <div className="app-grid-stats" style={styles.statsGrid}>
              <StatCard title={ui("Lot Balances")} value={formatLocalizedNumber(inventoryLots.length, locale)} subtitle={ui("Available, held, quarantined, or expired lot-level balances")} />
              <StatCard title={`${ui('Expiring within')} ${formatLocalizedNumber(expiryWindowDays, locale)} ${ui('days')}`} value={formatLocalizedNumber(expiryWindowLots.length, locale)} subtitle={`${formatLocalizedNumber(expiryWindowPositionCount, locale)} ${ui('product/location positions in the selected window')}`} tone={inventoryLots.length === 0 ? 'default' : expiryWindowLots.length ? 'warn' : 'good'} />
              <StatCard
                title={ui("Expiry Value at Risk")}
                value={expiryWindowCostEvidence.unknownCurrencyValueRows > 0
                  ? ui("Partial cost evidence")
                  : expiryWindowCostRows.length === 0
                    ? '-'
                    : expiryWindowCostRows.length === 1
                      ? formatLocalizedCurrency(expiryWindowCostRows[0][1], expiryWindowCostRows[0][0], locale, { maximumFractionDigits: 2 })
                      : ui("Multiple currencies")}
                subtitle={expiryWindowCostRows.length
                  ? `${expiryWindowCostRows.map(([currency, value]) => formatLocalizedCurrency(value, currency, locale, { maximumFractionDigits: 2 })).join(' · ')}${expiryWindowCostEvidence.unknownCurrencyValueRows ? ` · ${ui('Some priced lots have unknown currency')}` : ''}`
                  : expiryWindowCostEvidence.unpricedRows > 0
                    ? ui("No comparable priced-lot evidence in the selected window")
                    : ui("Estimated from lot unit cost where available")}
                tone={(expiryWindowCostRows.some(([, value]) => value > 0) || expiryWindowCostEvidence.unknownCurrencyValueRows > 0) ? 'warn' : 'default'}
              />
              <StatCard title={ui("Expired")} value={formatLocalizedNumber(inventoryLots.filter((lot) => lot.operational_status === 'expired').length, locale)} subtitle={ui("Expired lot balances requiring or reflecting write-off status")} tone={inventoryLots.length === 0 ? 'default' : inventoryLots.some((lot) => lot.operational_status === 'expired') ? 'warn' : 'good'} />
              <StatCard title={ui("Blocked / Held")} value={formatLocalizedNumber(inventoryLots.filter((lot) => lot.condition === 'hold').length, locale)} subtitle={ui("Stock manually blocked from use")} tone={inventoryLots.length === 0 ? 'default' : inventoryLots.some((lot) => lot.condition === 'hold') ? 'warn' : 'good'} />
              <StatCard title={ui("Quarantine")} value={formatLocalizedNumber(inventoryLots.filter((lot) => lot.condition === 'quarantine').length, locale)} subtitle={ui("Stock received into quarantine")} tone={inventoryLots.length === 0 ? 'default' : inventoryLots.some((lot) => lot.condition === 'quarantine') ? 'warn' : 'good'} />
              <StatCard title={ui("Ledger Mismatches")} value={reconciliationQuery.data?.summary.ledger_mismatch_count == null ? '-' : formatLocalizedNumber(reconciliationQuery.data.summary.ledger_mismatch_count, locale)} subtitle={ui("Aggregate stock vs canonical movement ledger")} tone={(reconciliationQuery.data?.summary.row_count || 0) === 0 ? 'default' : (reconciliationQuery.data?.summary.ledger_mismatch_count || 0) > 0 ? 'warn' : 'good'} />
              <StatCard title={ui("Lot Mismatches")} value={reconciliationQuery.data?.summary.lot_mismatch_count == null ? '-' : formatLocalizedNumber(reconciliationQuery.data.summary.lot_mismatch_count, locale)} subtitle={ui("Aggregate stock vs available lot balances")} tone={(reconciliationQuery.data?.summary.row_count || 0) === 0 ? 'default' : (reconciliationQuery.data?.summary.lot_mismatch_count || 0) > 0 ? 'warn' : 'good'} />
            </div>

            {inventoryLots.length === 0 ? (
              <div style={styles.emptyPanel}>{ui("No lot-level balances are currently available for this tenant.")}</div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>{ui("Product")}</th><th style={styles.th}>{ui("Location")}</th><th style={styles.th}>{ui("Lot / Batch")}</th><th style={styles.th}>{ui("Expiry")}</th><th style={styles.th}>{ui("Condition")}</th><th style={styles.th}>{ui("Quantity")}</th><th style={styles.th}>{ui("Action")}</th></tr></thead>
                  <tbody>
                    {visibleInventoryLots.map((lot) => (
                      <tr key={lot.id}>
                        <td style={styles.td}>{lot.product_name || ui("Unnamed product")}</td>
                        <td style={styles.td}>{lot.storage_location_name || ui("Unknown location")}</td>
                        <td style={styles.td}>{formatLotReference(lot, ui)}</td>
                        <td style={styles.td}>{lot.expiry_date ? formatLocalizedDate(lot.expiry_date, locale) : '-'}</td>
                        <td style={styles.td}>{ui(formatUsageReason(lot.operational_status || lot.condition))}</td>
                        <td style={styles.td}>{formatLocalizedNumber(toNumber(lot.quantity), locale)} {lot.product_unit || ''}</td>
                        <td style={styles.td}>{canAdjust ? (lot.condition === 'available' && lot.operational_status !== 'expired' ? <button type="button" style={styles.rowActionButton} disabled={holdLotMutation.isPending} onClick={() => { const reason = window.prompt(ui("Why should this stock be blocked from use?")); if (reason === null) return; const trimmed = reason.trim(); if (trimmed.length < 3) { setOperationFeedback(''); setOperationError(ui("Please enter at least 3 characters for the reason.")); return; } holdLotMutation.mutate({ lotId: lot.id, reason: trimmed }); }}>{ui("Block")}</button> : lot.condition === 'hold' && lot.operational_status !== 'expired' ? <button type="button" style={styles.rowActionButton} disabled={releaseHoldMutation.isPending} onClick={() => { const reason = window.prompt(ui("Why is this stock safe to use again?")); if (reason === null) return; const trimmed = reason.trim(); if (trimmed.length < 3) { setOperationFeedback(''); setOperationError(ui("Please enter at least 3 characters for the reason.")); return; } releaseHoldMutation.mutate({ lotId: lot.id, reason: trimmed }); }}>{ui("Unblock")}</button> : lot.condition === 'quarantine' && lot.operational_status !== 'expired' ? <button type="button" style={styles.rowActionButton} disabled={releaseQuarantineMutation.isPending} onClick={() => { if (window.confirm(ui("Release this quarantined lot into usable stock?"))) releaseQuarantineMutation.mutate(lot.id); }}>{ui("Release")}</button> : lot.operational_status === 'expired' ? <span style={styles.rowSubtle}>{ui('Expired — cannot release')}</span> : '-') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {inventoryLots.length > lotPageSize ? (
                  <div className="app-actions" style={styles.loadingActions}>
                    <span style={styles.rowSubtle}>
                      {ui('Showing lot balances')} {formatLocalizedNumber(lotPage * lotPageSize + 1, locale)}–{formatLocalizedNumber(Math.min((lotPage + 1) * lotPageSize, inventoryLots.length), locale)} {ui('of')} {formatLocalizedNumber(inventoryLots.length, locale)}
                    </span>
                    <button type="button" style={styles.secondaryButton} disabled={lotPage === 0} onClick={() => setLotPage((current) => Math.max(current - 1, 0))}>{ui('Previous')}</button>
                    <button type="button" style={styles.secondaryButton} disabled={lotPage >= lotPageCount - 1} onClick={() => setLotPage((current) => Math.min(current + 1, lotPageCount - 1))}>{ui('Next')}</button>
                  </div>
                ) : null}
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
              <h3 style={styles.panelTitle}>{ui("Operational Workbench")}</h3>
              <p style={styles.panelSubtitle}>
              {ui("Find the correct product and location, review its balance, post an authorized stock action, and verify the result without leaving the page.")}
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
              {isRefreshingStockWorkbench ? ui("Refreshing...") : ui("Refresh Stock")}
            </button>
            {canViewMovements ? (
              <Link style={styles.secondaryLinkButton} to="/stock-movements">
                {ui("Open Full Stock Ledger")}
              </Link>
            ) : null}
          </div>
        </div>

        <div style={styles.roleGrid}>
          <div style={styles.roleCard}>
            <div style={styles.roleCardTitle}>{ui("Current Access Role")}</div>
            <div style={styles.roleCardValue}>{ui(accessRoleLabel)}</div>
            <div style={styles.roleCardSubtitle}>
              {ui("Actions and history panels follow the permissions assigned to this role.")}
            </div>
          </div>
          <div style={styles.permissionCard}>
            <div style={styles.permissionRow}>
              <span>{ui("Consume")}</span>
              <span style={canConsume ? styles.permissionAllowed : styles.permissionBlocked}>
                {canConsume ? ui("Allowed") : ui("Blocked")}
              </span>
            </div>
            <div style={styles.permissionRow}>
              <span>{ui("Count")}</span>
              <span style={canCount ? styles.permissionAllowed : styles.permissionBlocked}>
                {canCount ? ui("Allowed") : ui("Blocked")}
              </span>
            </div>
            <div style={styles.permissionRow}>
              <span>{ui("Adjust")}</span>
              <span style={canAdjust ? styles.permissionAllowed : styles.permissionBlocked}>
                {canAdjust ? ui("Allowed") : ui("Blocked")}
              </span>
            </div>
            <div style={styles.permissionRow}>
              <span>{ui("Movement history")}</span>
              <span style={canViewMovements ? styles.permissionAllowed : styles.permissionBlocked}>
                {canViewMovements ? ui("Available") : ui("Blocked")}
              </span>
            </div>
            <div style={styles.permissionRow}>
              <span>{ui("Usage history")}</span>
              <span style={canViewInventoryUsage ? styles.permissionAllowed : styles.permissionBlocked}>
                {canViewInventoryUsage ? ui("Available") : ui("Blocked")}
              </span>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={styles.emptyPanel}>
            {ui("No stock positions are available yet. Stock appears here after a product has an on-hand balance at a storage location.")}
          </div>
        ) : (
          <>
            <div style={styles.selectorPanel}>
              <div style={styles.selectorHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>{ui("Stock Positions")}</h4>
                  <p style={styles.sectionDescription}>
                    {ui("Search and filter product-location balances, then select the position you want to review or update.")}
                  </p>
                </div>
              </div>

              <div style={styles.filterGrid}>
                <div>
                  <label style={styles.label} htmlFor="stock-position-search">
                    {ui("Search stock")}
                  </label>
                  <input
                    id="stock-position-search"
                    style={styles.input}
                    type="search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={ui("Product, category, unit, or location")}
                  />
                </div>
                <div>
                  <label style={styles.label} htmlFor="stock-location-filter">
                    {ui("Storage location")}
                  </label>
                  <select
                    id="stock-location-filter"
                    style={styles.input}
                    value={locationFilter}
                    onChange={(event) => setLocationFilter(event.target.value)}
                  >
                    <option value="all">{ui("All locations")}</option>
                    {locationOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label} htmlFor="stock-category-filter">
                    {ui("Category")}
                  </label>
                  <select
                    id="stock-category-filter"
                    style={styles.input}
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="all">{ui("All categories")}</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label} htmlFor="stock-status-filter">
                    {ui("Status")}
                  </label>
                  <select
                    id="stock-status-filter"
                    style={styles.input}
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as typeof statusFilter)
                    }
                  >
                    <option value="all">{ui("All statuses")}</option>
                    <option value="low">{ui("Low stock")}</option>
                    <option value="reserved-risk">{ui("Low available after reservations")}</option>
                    <option value="integrity-risk">{ui("Stock / lot mismatch")}</option>
                    <option value="healthy">{ui("Healthy")}</option>
                  </select>
                </div>
              </div>

              <div style={styles.selectorFooter}>
                <span style={styles.resultCount}>
                  {formatLocalizedNumber(filteredRows.length, locale)} {ui("of")} {formatLocalizedNumber(rows.length, locale)} {ui("stock positions shown")}
                  {requestedProductId ? ui(" · Linked product filter active") : ''}
                </span>
                <button
                  type="button"
                  style={hasActiveStockFilters ? styles.secondaryButton : styles.secondaryButtonDisabled}
                  disabled={!hasActiveStockFilters}
                  onClick={clearStockFilters}
                >
                  {ui("Clear Stock Filters")}
                </button>
              </div>

              {filteredRows.length === 0 ? (
                <div style={styles.emptyPanel}>
                  {ui("No stock positions match the current search and filters.")}
                </div>
              ) : (
                <>
                  <div className="stock-page__mobile-list" style={styles.mobileCardGrid}>
                    {filteredRows.map((item) => {
                      const quantity = toNumber(item.quantity);
                      const minQuantity = getEffectiveMinimum(item);
                      const reservedQuantity = toNumber(item.reserved_quantity);
                      const projectedFreeQuantity = getProjectedFreeQuantity(item);
                      const lowStock = Math.min(quantity, getUsableLotQuantity(item)) < minQuantity;
                      const overReserved = projectedFreeQuantity < 0;
                      const lowAvailable = !lowStock && projectedFreeQuantity < minQuantity;
                      const integrityRisk = hasStockLotDesync(item);
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
                              <div style={styles.rowTitle}>{item.product_name || ui("Unnamed product")}</div>
                              <div style={styles.rowSubtle}>
                                {item.storage_location_name || ui("Unknown location")}
                              </div>
                            </div>
                            <span
                              style={
                                integrityRisk || overReserved
                                  ? styles.badgeError
                                  : lowStock || lowAvailable
                                    ? styles.badgeWarning
                                    : styles.badgeOk
                              }
                            >
                              {integrityRisk
                                ? ui('STOCK / LOT MISMATCH')
                                : overReserved
                                  ? ui("OVER-RESERVED")
                                  : lowStock
                                  ? ui("LOW STOCK")
                                  : lowAvailable
                                    ? ui("LOW AVAILABLE")
                                    : ui("HEALTHY")}
                            </span>
                          </div>
                          <div style={styles.stockCardMetrics}>
                            <div style={styles.stockMetricItem}>
                              <div style={styles.stockMetricLabel}>{ui("On Hand")}</div>
                              <div style={styles.stockMetricValue}>{formatLocalizedNumber(quantity, locale)}</div>
                            </div>
                            <div style={styles.stockMetricItem}>
                              <div style={styles.stockMetricLabel}>{ui("Reserved")}</div>
                              <div style={styles.stockMetricValue}>{formatLocalizedNumber(reservedQuantity, locale)}</div>
                            </div>
                            <div style={styles.stockMetricItem}>
                              <div style={styles.stockMetricLabel}>{ui("Available")}</div>
                              <div style={styles.stockMetricValue}>{formatLocalizedNumber(projectedFreeQuantity, locale)}</div>
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
                            <th style={styles.th}>{ui("Select")}</th>
                            <th style={styles.th}>{ui("Product")}</th>
                            <th style={styles.th}>{ui("Storage Location")}</th>
                            <th style={styles.th}>{ui("On Hand")}</th>
                            <th style={styles.th}>{ui("Reserved")}</th>
                            <th style={styles.th}>{ui("Available")}</th>
                            <th style={styles.th}>{ui("Minimum")}</th>
                            <th style={styles.th}>{ui("Unit")}</th>
                            <th style={styles.th}>{ui("Status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((item) => {
                            const quantity = toNumber(item.quantity);
                            const minQuantity = getEffectiveMinimum(item);
                            const reservedQuantity = toNumber(item.reserved_quantity);
                            const projectedFreeQuantity = getProjectedFreeQuantity(item);
                            const lowStock = Math.min(quantity, getUsableLotQuantity(item)) < minQuantity;
                            const overReserved = projectedFreeQuantity < 0;
                            const lowAvailable = !lowStock && projectedFreeQuantity < minQuantity;
                            const integrityRisk = hasStockLotDesync(item);
                            const selected = selectedRow?.id === item.id;

                            return (
                              <tr key={item.id} style={selected ? styles.selectedRow : undefined}>
                                <td style={styles.td}>
                                  <button
                                    type="button"
                                    style={selected ? styles.rowActionButtonSelected : styles.rowActionButton}
                                    onClick={() => selectStockRow(item.id)}
                                  >
                                    {selected ? ui("Selected") : ui("Select")}
                                  </button>
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.rowTitle}>{item.product_name || ui("Unnamed product")}</div>
                                </td>
                                <td style={styles.td}>
                                  {item.storage_location_name || ui("Unknown location")}
                                </td>
                                <td style={styles.td}>{formatLocalizedNumber(quantity, locale)}</td>
                                <td style={styles.td}>{formatLocalizedNumber(reservedQuantity, locale)}</td>
                                <td style={styles.td}>{formatLocalizedNumber(projectedFreeQuantity, locale)}</td>
                                <td style={styles.td}>{formatLocalizedNumber(minQuantity, locale)}</td>
                                <td style={styles.td}>{item.product_unit || '-'}</td>
                                <td style={styles.td}>
                                  <span
                                    style={
                                      integrityRisk || overReserved
                                        ? styles.badgeError
                                        : lowStock || lowAvailable
                                          ? styles.badgeWarning
                                          : styles.badgeOk
                                    }
                                  >
                                    {integrityRisk
                                      ? ui('STOCK / LOT MISMATCH')
                                      : overReserved
                                        ? ui("OVER-RESERVED")
                                        : lowStock
                                        ? ui("LOW STOCK")
                                        : lowAvailable
                                          ? ui("LOW AVAILABLE")
                                          : ui("HEALTHY")}
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
                  <h4 style={styles.sectionTitle}>{ui("Selected Stock Position")}</h4>

                  {selectedRow ? (
                    <div style={styles.selectionSummary}>
                      <div style={styles.selectionPrimaryRow}>
                        <div style={styles.selectionPrimaryText}>
                          <div style={styles.selectedTitle}>
                            {selectedRow.product_name || ui("Unnamed product")}
                          </div>
                        </div>
                        <span
                          style={
                            selectedStockLotDesync || selectedOverReserved
                              ? styles.badgeError
                              : selectedLowStock || selectedLowAvailable
                                ? styles.badgeWarning
                                : styles.badgeOk
                          }
                        >
                          {selectedStockLotDesync
                            ? ui('STOCK / LOT MISMATCH')
                            : selectedOverReserved
                              ? ui("OVER-RESERVED")
                              : selectedLowStock
                              ? ui("LOW STOCK")
                              : selectedLowAvailable
                                ? ui("LOW AVAILABLE")
                                : ui("HEALTHY")}
                        </span>
                      </div>

                      <div style={styles.selectionGrid}>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>{ui("Storage Location")}</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.storage_location_name || ui("Unknown location")}
                          </div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>{ui("On-Hand Quantity")}</div>
                          <div style={styles.selectionValue}>{formatLocalizedNumber(currentQuantity, locale)}</div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>{ui("Reserved / Allocated")}</div>
                          <div style={styles.selectionValue}>{formatLocalizedNumber(currentReservedQuantity, locale)}</div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>{ui("Available Quantity")}</div>
                          <div style={styles.selectionValue}>{formatLocalizedNumber(currentProjectedFreeQuantity, locale)}</div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>{ui("Minimum Quantity")}</div>
                          <div style={styles.selectionValue}>{formatLocalizedNumber(currentMinimum, locale)}</div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>{ui("Unit")}</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.product_unit || '-'}
                          </div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>{ui("Category")}</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.product_category || '-'}
                          </div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>{ui("Temperature Zone")}</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.temperature_zone || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.emptyPanel}>{ui("Select a stock position to begin.")}</div>
                  )}
                </div>

                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>{ui("Action Readiness")}</h4>
                  <div style={styles.readinessList}>
                    <div style={styles.readinessRow}>
                      <span>{ui("Selected position")}</span>
                      <strong>{selectedRow ? ui("Ready") : ui("Required")}</strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>{ui("Current action")}</span>
                      <strong>{ui(getActionLabel(draft.action))}</strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>{ui("Projected on hand")}</span>
                      <strong>
                        {nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
                          ? '-'
                          : formatLocalizedNumber(nextQuantityPreview, locale)}
                      </strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>{ui("Projected available after reservations")}</span>
                      <strong>{projectedFreeAfterAction === null ? '-' : formatLocalizedNumber(projectedFreeAfterAction, locale)}</strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>{ui("Ledger verification")}</span>
                      <strong>{lastResult ? ui("Posted — verify below") : ui("Pending current action")}</strong>
                    </div>
                  </div>
                </div>

                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>{ui("Post Stock Action")}</h4>
                  <p style={styles.sectionDescription}>
                    {ui("Post a controlled stock change against the selected product and location. The system validates permissions and records the resulting operational history.")}
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
                        setCountBaseVersion(null);
                        setOperationFeedback('');
                        setOperationError('');
                        setLastResult(null);
                      }}
                    >
                      {ui("Consume")}
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
                      title={!canCount ? ui("Your current access role cannot post physical stock counts.") : undefined}
                      onClick={() => {
                        setDraft(getDefaultDraft('count'));
                        setCountBaseVersion(null);
                        setOperationFeedback('');
                        setOperationError('');
                        setLastResult(null);
                      }}
                    >
                      {ui("Count")}
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
                      title={!canAdjust ? ui("Your current access role cannot apply manual stock adjustments.") : undefined}
                      onClick={() => {
                        setDraft(getDefaultDraft('adjust'));
                        setCountBaseVersion(null);
                        setOperationFeedback('');
                        setOperationError('');
                        setLastResult(null);
                      }}
                    >
                      {ui("Adjust")}
                    </button>
                  </div>

                  <div style={styles.actionInfoBox}>
                    <div style={styles.actionInfoTitle}>{ui(getActionLabel(draft.action))}</div>
                    <div style={styles.actionInfoText}>{ui(getActionHelpText(draft.action))}</div>
                  </div>

                  {draft.action === 'consume' && !canConsume ? (
                    <div className="app-warning-state" style={styles.warningBox}>
                      {ui("Stock consumption requires both stock-consumption and inventory-usage recording access.")}
                    </div>
                  ) : null}

                  {draft.action === 'count' && !canCount ? (
                    <div className="app-warning-state" style={styles.warningBox}>
                      {ui("Your current access role cannot post physical stock counts.")}
                    </div>
                  ) : null}

                  {draft.action === 'adjust' && !canAdjust ? (
                    <div className="app-warning-state" style={styles.warningBox}>
                      {ui("Your current access role cannot apply manual stock adjustments.")}
                    </div>
                  ) : null}

                  <div style={styles.formGrid}>
                    {(draft.action === 'consume' || draft.action === 'count') && (
                      <div>
                        <label
                          style={styles.label}
                          htmlFor="stock-action-quantity"
                        >
                          {draft.action === 'consume' ? ui("Quantity to Consume") : ui("Counted Quantity")}
                        </label>
                        <input
                          id="stock-action-quantity"
                          style={styles.input}
                          type="number"
                          inputMode="decimal"
                          min={draft.action === 'consume' ? '0.0001' : '0'}
                          step={selectedRow?.serial_tracking_enabled ? '1' : '0.01'}
                          value={draft.quantity}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            if (draft.action === 'count') {
                              if (!nextValue) setCountBaseVersion(null);
                              else if (!draft.quantity && selectedRow) setCountBaseVersion(Number(selectedRow.version));
                            }
                            updateDraft((current) => ({
                              ...current,
                              quantity: nextValue
                            }));
                          }}
                        />
                      </div>
                    )}

                    {draft.action === 'adjust' && (
                      <div>
                        <label style={styles.label} htmlFor="stock-adjustment-change">
                          {ui("Adjustment Change")}
                        </label>
                        <input
                          id="stock-adjustment-change"
                          style={styles.input}
                          type="number"
                          inputMode="decimal"
                          step={selectedRow?.serial_tracking_enabled ? '1' : '0.01'}
                          value={draft.change}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              change: event.target.value
                            }))
                          }
                        />
                      </div>
                    )}

                    {selectedRow?.serial_tracking_enabled ? (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={styles.label} htmlFor="stock-action-serials">{ui('Serial Numbers')}</label>
                        <textarea
                          id="stock-action-serials"
                          style={{ ...styles.input, minHeight: 96, resize: 'vertical' }}
                          value={draft.serial_numbers}
                          onChange={(event) => updateDraft((current) => ({ ...current, serial_numbers: event.target.value }))}
                          placeholder={ui('Enter or scan one serial number per line (commas also accepted)')}
                        />
                        <div style={styles.rowSubtle}>
                          {draft.action === 'count'
                            ? ui('A serial-tracked physical count requires the exact serial numbers physically present.')
                            : draft.action === 'adjust'
                              ? ui('Serial-tracked adjustments require one serial number for every unit added or removed.')
                              : selectedRow.serial_required_on_issue
                                ? ui('This product requires one serial number for every unit issued.')
                                : ui('Serial issue evidence is optional for this product; provide serials when tracking the exact units issued.')}
                        </div>
                      </div>
                    ) : null}

                    {actionAddsStock ? (
                      <>
                        <div style={{ gridColumn: '1 / -1', ...styles.actionInfoBox }}>
                          <div style={styles.actionInfoTitle}>{ui("Tracking details for added stock")}</div>
                          <div style={styles.actionInfoText}>
                            {trackingDetailsNeeded
                              ? ui("This product requires the tracking details shown below before stock can be added.")
                              : ui("Optional. Use these fields when you want the added stock tied to a specific lot/batch or expiry date.")}
                          </div>
                        </div>
                        <div>
                          <label style={styles.label} htmlFor="stock-action-lot">{ui("Lot Number")}{selectedRow?.requires_lot_tracking ? ' *' : ''}</label>
                          <input id="stock-action-lot" style={styles.input} type="text" maxLength={255} value={draft.lot_number} onChange={(event) => updateDraft((current) => ({ ...current, lot_number: event.target.value }))} placeholder={ui("Optional unless required")} />
                        </div>
                        <div>
                          <label style={styles.label} htmlFor="stock-action-batch">{ui("Batch Number")}{selectedRow?.requires_lot_tracking ? ' *' : ''}</label>
                          <input id="stock-action-batch" style={styles.input} type="text" maxLength={255} value={draft.batch_number} onChange={(event) => updateDraft((current) => ({ ...current, batch_number: event.target.value }))} placeholder={ui("Lot or batch satisfies tracking")} />
                        </div>
                        <div>
                          <label style={styles.label} htmlFor="stock-action-expiry">{ui("Expiry Date")}{selectedRow?.requires_expiry_date ? ' *' : ''}</label>
                          <input id="stock-action-expiry" style={styles.input} type="date" min={getLocalIsoDate()} value={draft.expiry_date} onChange={(event) => updateDraft((current) => ({ ...current, expiry_date: event.target.value }))} />
                        </div>
                        <div>
                          <label style={styles.label} htmlFor="stock-action-manufactured">{ui("Manufactured Date")}</label>
                          <input id="stock-action-manufactured" style={styles.input} type="date" value={draft.manufactured_at} onChange={(event) => updateDraft((current) => ({ ...current, manufactured_at: event.target.value }))} />
                        </div>
                      </>
                    ) : null}

                    {draft.action !== 'consume' ? (
                      <div>
                        <label style={styles.label} htmlFor="stock-action-reason">
                          {ui("Audit Note")}
                        </label>
                        <input
                          id="stock-action-reason"
                          style={styles.input}
                          type="text"
                          maxLength={1000}
                          value={draft.reason}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              reason: event.target.value
                            }))
                          }
                          placeholder={ui("Optional explanation for this count or adjustment")}
                        />
                      </div>
                    ) : null}

                    {draft.action === 'consume' && (
                      <>
                        <div>
                          <label style={styles.label} htmlFor="stock-usage-reason">
                            {ui("Usage Reason")}
                          </label>
                          <select
                            id="stock-usage-reason"
                            style={styles.input}
                            value={draft.consumption_reason}
                            onChange={(event) => {
                              const nextReason = event.target.value as UsageReason;
                              updateDraft((current) => ({
                                ...current,
                                consumption_reason: nextReason,
                                reason: `usage:${nextReason}`
                              }));
                            }}
                          >
                            {USAGE_REASON_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {ui(option.label)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={styles.label} htmlFor="stock-usage-department">
                            {ui("Department / Team")}
                          </label>
                          <input
                            id="stock-usage-department"
                            style={styles.input}
                            type="text"
                            maxLength={255}
                            value={draft.department}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                department: event.target.value
                              }))
                            }
                            placeholder={ui("Housekeeping, maintenance, kitchen...")}
                          />
                        </div>

                        <div>
                          <label style={styles.label} htmlFor="stock-usage-event">
                            {ui("Event / Job Name")}
                          </label>
                          <input
                            id="stock-usage-event"
                            style={styles.input}
                            type="text"
                            maxLength={255}
                            value={draft.event_name}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                event_name: event.target.value
                              }))
                            }
                            placeholder={ui("Optional event, work order, or service context")}
                          />
                        </div>

                        <div>
                          <label style={styles.label} htmlFor="stock-consumed-at">
                            {ui("Consumed At")}
                          </label>
                          <input
                            id="stock-consumed-at"
                            style={styles.input}
                            type="datetime-local"
                            value={draft.consumed_at}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                consumed_at: event.target.value
                              }))
                            }
                          />
                        </div>

                        <div style={styles.fullWidthField}>
                          <label style={styles.label} htmlFor="stock-usage-notes">
                            {ui("Usage Notes")}
                          </label>
                          <textarea
                            id="stock-usage-notes"
                            style={styles.textarea}
                            maxLength={4000}
                            value={draft.notes}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                notes: event.target.value
                              }))
                            }
                            placeholder={ui("Optional context for audit, waste, damage, guest issue, event prep, or maintenance usage")}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {draft.action === 'consume' ? (
                    <div style={styles.usageReasonHelpBox}>
                      <strong>{ui("Usage audit context:")}</strong>{' '}
                      {ui(USAGE_REASON_OPTIONS.find((option) => option.value === draft.consumption_reason)?.description || '')}
                    </div>
                  ) : null}

                  <div style={styles.previewBox}>
                    <div style={styles.previewRow}>
                      <span>{ui("Current On Hand")}</span>
                      <strong>{formatLocalizedNumber(currentQuantity, locale)}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>{ui("Projected On Hand")}</span>
                      <strong>
                        {nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
                          ? '-'
                          : formatLocalizedNumber(nextQuantityPreview, locale)}
                      </strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>{ui("Reserved / Allocated")}</span>
                      <strong>{formatLocalizedNumber(currentReservedQuantity, locale)}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>{ui("Projected Available")}</span>
                      <strong>{projectedFreeAfterAction === null ? '-' : formatLocalizedNumber(projectedFreeAfterAction, locale)}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>{ui("Minimum Quantity")}</span>
                      <strong>{formatLocalizedNumber(currentMinimum, locale)}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>{ui("Operational Risk")}</span>
                      <strong style={createsReservationShortfall || !actionInputValidation.valid || operationalRiskLabel.startsWith(ui("Warning")) ? styles.riskWarning : undefined}>
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
                          updateDraft((current) => ({
                            ...current,
                            reservation_shortfall_acknowledged: event.target.checked
                          }))
                        }
                      />
                      <span>
                        {ui("I confirm this physical count or correction is real, even though it leaves less stock than is reserved. I understand the affected reservations must be reviewed immediately.")}
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
                        ? ui("Submitting...")
                        : !currentActionAllowed
                          ? `${ui(getActionLabel(draft.action))} ${ui('blocked')}`
                          : ui(getActionLabel(draft.action))}
                    </button>
                  </div>
                </div>

                {lastResult ? (
                  <div style={styles.innerPanel}>
                    <h4 style={styles.sectionTitle}>{ui("Last Operation Result")}</h4>
                    <div style={styles.selectionGrid}>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("Action")}</div>
                        <div style={styles.selectionValue}>{ui(getActionLabel(draft.action))}</div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("Storage Location")}</div>
                        <div style={styles.selectionValue}>
                          {selectedRow?.storage_location_name || ui("Unknown location")}
                        </div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("Previous Quantity")}</div>
                        <div style={styles.selectionValue}>{formatLocalizedNumber(lastResult.stock.previous_quantity, locale)}</div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("New Quantity")}</div>
                        <div style={styles.selectionValue}>{formatLocalizedNumber(lastResult.stock.new_quantity, locale)}</div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("Difference")}</div>
                        <div style={styles.selectionValue}>
                          {lastResult.stock.difference == null && lastResult.stock.change == null ? '-' : formatLocalizedNumber(lastResult.stock.difference ?? lastResult.stock.change ?? 0, locale)}
                        </div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("Message")}</div>
                        <div style={styles.selectionValue}>{operationFeedback || lastResult.message}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section style={styles.workbenchColumn}>
                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>{ui("Latest Movement Verification")}</h4>
                  <p style={styles.sectionDescription}>
                    {ui("Recent movement history for the selected product. The current movement ledger is product-wide and may include activity from other storage locations.")}
                  </p>

                  {!canViewMovements ? (
                    <div style={styles.emptyPanel}>
                      {ui("Movement history is unavailable because this role does not have stock movement read access.")}
                    </div>
                  ) : movementsQuery.isLoading ? (
                    <p style={styles.sectionDescription}>{ui("Loading stock movements...")}</p>
                  ) : movementsQuery.isError ? (
                    <div className="app-error-state" style={styles.errorBox}>
                      {ui("Failed to load stock movements:")}{' '}
                      {(movementsQuery.error as Error).message || ui("Unknown error")}
                    </div>
                  ) : recentMovements.length === 0 ? (
                    <div style={styles.emptyPanel}>
                      {ui("No stock movements found for the selected product yet.")}
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
                                  {formatLocalizedDateTime(movement.created_at, locale)}
                                </div>
                              </div>
                              <span style={changeBadgeStyle(change)}>{changeDisplay(change, locale)}</span>
                            </div>
                            {(() => {
                              const presentation = getMovementReasonPresentation(movement);
                              return (
                                <>
                                  <div style={styles.movementMetaRow}>
                                    <span style={reasonBadgeStyle(movement.movement_type || movement.reason)}>
                                      {presentation.systemOwned ? ui(presentation.text) : presentation.text}
                                    </span>
                                    <span style={styles.rowSubtle}>
                                      {ui("By")} {movement.user_name || ui("System / unknown user")}
                                    </span>
                                  </div>
                                  {presentation.detail ? (
                                    <div style={styles.rowSubtle}>{presentation.detail}</div>
                                  ) : null}
                                </>
                              );
                            })()}
                            {movement.shipment_po_number ? (
                              <div style={styles.rowSubtle}>
                                {ui("Shipment PO:")} {movement.shipment_po_number}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>{ui("Usage Ledger Snapshot")}</h4>
                  <p style={styles.sectionDescription}>
                    {ui("Consumption history for the selected product at")}{' '}
                    <strong>
                      {selectedRow?.storage_location_name || ui("the selected location")}
                    </strong>.
                  </p>

                  {!canViewInventoryUsage ? (
                    <div style={styles.emptyPanel}>
                      {ui("Usage history is unavailable because this role does not have inventory usage read access.")}
                    </div>
                  ) : usageSummaryQuery.isLoading ? (
                    <p style={styles.sectionDescription}>{ui("Loading usage summary...")}</p>
                  ) : usageSummaryQuery.isError ? (
                    <div className="app-error-state" style={styles.errorBox}>
                      {ui("Failed to load usage summary:")}{' '}
                      {(usageSummaryQuery.error as Error).message || ui("Unknown error")}
                    </div>
                  ) : (
                    <div style={styles.selectionGrid}>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("Usage Events")}</div>
                        <div style={styles.selectionValue}>
                          {formatLocalizedNumber(toNumber(usageSummaryQuery.data?.totals?.usage_count), locale)}
                        </div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("Total Consumed")}</div>
                        <div style={styles.selectionValue}>
                          {formatLocalizedNumber(toNumber(usageSummaryQuery.data?.totals?.total_quantity), locale)}
                        </div>
                      </div>
                      <div style={styles.selectionItem}>
                        <div style={styles.selectionLabel}>{ui("Last Consumed")}</div>
                        <div style={styles.selectionValue}>
                          {formatLocalizedDateTime(usageSummaryQuery.data?.totals?.last_consumed_at, locale)}
                        </div>
                      </div>
                    </div>
                  )}

                  {canViewInventoryUsage && usageSummaryQuery.data?.by_reason?.length ? (
                    <div style={styles.usageReasonGrid}>
                      {usageSummaryQuery.data.by_reason.slice(0, 4).map((row) => (
                        <div key={row.consumption_reason} style={styles.usageReasonCard}>
                          <div style={styles.selectionLabel}>
                            {ui(formatUsageReason(row.consumption_reason))}
                          </div>
                          <div style={styles.selectionValue}>{formatLocalizedNumber(toNumber(row.total_quantity), locale)}</div>
                          <div style={styles.rowSubtle}>{formatLocalizedNumber(toNumber(row.usage_count), locale)} {ui("events")}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {!canViewInventoryUsage ? null : usageLogsQuery.isLoading ? (
                    <p style={styles.sectionDescription}>{ui("Loading usage ledger...")}</p>
                  ) : usageLogsQuery.isError ? (
                    <div className="app-error-state" style={styles.errorBox}>
                      {ui("Failed to load usage ledger:")}{' '}
                      {(usageLogsQuery.error as Error).message || ui("Unknown error")}
                    </div>
                  ) : !usageLogsQuery.data?.length ? (
                    <div style={styles.emptyPanel}>
                      {ui("No first-class usage logs found for the selected product yet.")}
                    </div>
                  ) : (
                    <div style={styles.movementList}>
                      {usageLogsQuery.data.map((usage) => (
                        <div key={usage.id} style={styles.movementCard}>
                          <div style={styles.movementTopRow}>
                            <div style={styles.movementTitleBlock}>
                              <div style={styles.movementTitle}>
                                {ui(formatUsageReason(usage.consumption_reason))}
                              </div>
                              <div style={styles.rowSubtle}>
                                {formatLocalizedDateTime(usage.consumed_at, locale)}
                              </div>
                            </div>
                            <span style={changeBadgeStyle(-Math.abs(toNumber(usage.quantity)))}>
                              -{formatLocalizedNumber(toNumber(usage.quantity), locale)}
                            </span>
                          </div>
                          <div style={styles.movementMetaRow}>
                            <span style={styles.rowSubtle}>
                              {usage.department || ui("No department")}
                            </span>
                            <span style={styles.rowSubtle}>
                              {ui("By")} {usage.created_by_user_name || ui("System / unknown user")}
                            </span>
                          </div>
                          {usage.event_name ? (
                            <div style={styles.rowSubtle}>{ui("Event/job:")} {usage.event_name}</div>
                          ) : null}
                          <div style={styles.rowSubtle}>
                            {ui("Location:")} {usage.storage_location_name || ui("Unknown location")}
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