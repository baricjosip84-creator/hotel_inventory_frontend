import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError, getVersionConflictMessage, isVersionConflictError } from '../lib/api';
import { getCurrentAccessRoleLabel, getRoleCapabilities, hasAllPermissions, hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import ProductUomSelect from '../components/inventory/ProductUomSelect';
import { OperationalWorkspaceHero, /* OperationalWorkspaceMetaPill, */ OperationalWorkspaceStatCard, OperationalWorkspaceStatus } from '../components/ui/OperationalWorkspace';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';

type StockTransferStatus = 'draft' | 'executed' | 'cancelled' | string;

type StockTransferListItem = {
  id: string;
  from_storage_location_id: string;
  from_storage_location_name?: string | null;
  to_storage_location_id: string;
  to_storage_location_name?: string | null;
  status: StockTransferStatus;
  notes?: string | null;
  notes_is_system?: boolean | null;
  cancellation_reason?: string | null;
  cancellation_reason_is_system?: boolean;
  created_by_user_name?: string | null;
  executed_by_user_name?: string | null;
  cancelled_by_user_name?: string | null;
  created_at: string;
  executed_at?: string | null;
  cancelled_at?: string | null;
  version: number | string;
  item_count?: number | string;
};

type StockTransferDetailItem = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  product_category?: string | null;
  quantity: number | string;
  entered_quantity?: number | string;
  uom_code?: string | null;
  product_unit_snapshot?: string | null;
  serial_numbers?: string[];
  serial_tracking_enabled?: boolean | null;
  serial_tracking_enabled_snapshot?: boolean | null;
};

type StockTransferDetail = StockTransferListItem & {
  items: StockTransferDetailItem[];
};

type StockTransferMovement = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  stock_transfer_id: string;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  movement_type?: string | null;
  change: number | string;
  user_name?: string | null;
  created_at: string;
};

type StockTransferAvailabilityItem = {
  product_id: string;
  product_name: string;
  product_unit: string;
  current_product_unit?: string | null;
  product_active?: boolean;
  unit_evidence_complete?: boolean;
  unit_changed_since_draft?: boolean;
  locations_active?: boolean;
  source_location_eligible?: boolean;
  requested_quantity: number | string;
  on_hand_quantity: number | string;
  reserved_quantity: number | string;
  available_lot_quantity?: number | string;
  usable_lot_quantity?: number | string;
  stock_lot_reconciled?: boolean;
  serial_tracking_enabled?: boolean;
  selected_serial_count?: number | string;
  required_serial_count?: number | string;
  serial_evidence_complete?: boolean;
  serial_tracking_evidence_complete?: boolean;
  serial_tracking_changed_since_draft?: boolean;
  serials_available?: boolean;
  available_quantity: number | string | null;
  remaining_after_transfer: number | string | null;
  sufficient: boolean;
};

type StockTransferAvailability = {
  transfer_id: string;
  status: StockTransferStatus;
  executable: boolean;
  message: string;
  items: StockTransferAvailabilityItem[];
};

type TransferOptionLocation = {
  id: string;
  name: string;
  temperature_zone?: string | null;
  is_pickable?: boolean | null;
  source_eligible?: boolean | null;
};

type TransferOptionProduct = {
  id: string;
  name: string;
  unit?: string | null;
  category?: string | null;
  on_hand_quantity?: number | string | null;
  reserved_quantity?: number | string | null;
  available_quantity?: number | string | null;
  stock_lot_reconciled?: boolean | null;
  transferable?: boolean | null;
  serial_tracking_enabled?: boolean;
};

type TransferOptions = {
  source_storage_location_id?: string | null;
  locations: TransferOptionLocation[];
  products: TransferOptionProduct[];
};

type TransferSummary = {
  transfer_count: number | string;
  draft_count: number | string;
  executed_count: number | string;
  cancelled_count: number | string;
  item_count: number | string;
};

type TransferFormItem = {
  product_id: string;
  quantity: string;
  uom_code: string;
  serial_numbers_text: string;
};

type TransferFormState = {
  from_storage_location_id: string;
  to_storage_location_id: string;
  notes: string;
  items: TransferFormItem[];
};

type TransferFilters = {
  status: string;
  search: string;
  fromStorageLocationId: string;
  toStorageLocationId: string;
  productId: string;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const EXPORT_BATCH_SIZE = 500;

function emptyTransferForm(): TransferFormState {
  return {
    from_storage_location_id: '',
    to_storage_location_id: '',
    notes: '',
    items: [{ product_id: '', quantity: '', uom_code: '', serial_numbers_text: '' }]
  };
}

function formatDateTime(value: string | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  if (!value) return ui('Not recorded');
  return formatLocalizedDateTime(value, locale);
}

function formatNumber(value: number | string | null | undefined, locale: AppLocale): string {
  if (value === null || value === undefined || value === '') return '0';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 });
}

function formatAvailabilityEvidence(value: number | string | null | undefined, locale: AppLocale, ui: (text: string) => string): string {
  if (value === null || value === undefined || value === '') return ui('Unavailable');
  return formatNumber(value, locale);
}

function formatReadableText(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  return value
    .replace(/^stock_transfer_out(?::.*)?$/i, 'Transfer sent')
    .replace(/^stock_transfer_in(?::.*)?$/i, 'Transfer received')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getMovementTypeLabel(movement: StockTransferMovement): string {
  if (movement.movement_type === 'stock_transfer_out' || Number(movement.change) < 0) {
    return 'Transfer sent';
  }
  if (movement.movement_type === 'stock_transfer_in' || Number(movement.change) > 0) {
    return 'Transfer received';
  }
  return formatReadableText(movement.movement_type || 'Transfer movement');
}

function formatCancellationReason(value: string | null | undefined, isSystemOwned = false): string {
  if (!value) return 'Not recorded';
  const trimmed = value.trim();
  if (isSystemOwned && /^cancelled_from_enterprise_inventory_ui$/i.test(trimmed)) return 'Cancelled from Enterprise Inventory';
  return trimmed;
}

function displayCancellationReason(value: string | null | undefined, isSystemOwned: boolean | undefined, ui: (text: string) => string): string {
  const reason = formatCancellationReason(value, isSystemOwned === true);
  return reason === 'Cancelled from Enterprise Inventory' ? ui(reason) : reason;
}

function splitSerialNumbers(value: string): string[] {
  return Array.from(new Set(value.split(/[\r\n,]+/).map((entry) => entry.trim()).filter(Boolean)));
}

function historicalName(value: string | null | undefined, ui: (text: string) => string, kind: 'location' | 'product' | 'unit' | 'actor'): string {
  if (value && value.trim()) return value;
  if (kind === 'location') return ui('Historical location unavailable');
  if (kind === 'product') return ui('Historical product unavailable');
  if (kind === 'unit') return ui('Historical unit unavailable');
  return ui('Historical actor unavailable');
}

function displayProductCategory(item: StockTransferDetailItem, status: StockTransferStatus, ui: (text: string) => string): string {
  const category = item.product_category?.trim();
  if (category) return category;
  if (status === 'draft' || item.product_name?.trim()) return ui('Not categorized');
  return ui('Historical category unavailable');
}

function displayTransferActor(value: string | null | undefined, status: StockTransferStatus, ui: (text: string) => string): string {
  const normalized = value?.trim();
  if (normalized === 'System' || normalized === 'Support/System') return ui(normalized);
  if (normalized) return normalized;
  return status === 'draft' ? ui('Not recorded') : ui('Historical actor unavailable');
}

function displayMovementActor(value: string | null | undefined, transferActor: string | null | undefined, ui: (text: string) => string): string {
  const normalized = value?.trim();
  if (normalized === 'System' || normalized === 'Support/System') return ui(normalized);
  if (normalized) return normalized;
  const transferActorNormalized = transferActor?.trim();
  if (transferActorNormalized === 'System' || transferActorNormalized === 'Support/System') return ui(transferActorNormalized);
  return ui('Historical actor unavailable');
}

function getAvailabilityItemStatusLabel(item: StockTransferAvailabilityItem, ui: (text: string) => string): string {
  if (item.sufficient) return ui('Ready');
  if (item.locations_active === false) return ui('Location unavailable');
  if (item.source_location_eligible === false) return ui('Source location not eligible');
  if (item.product_active === false) return ui('Product unavailable');
  if (item.unit_evidence_complete === false || item.unit_changed_since_draft) return ui('Review unit');
  if (item.serial_tracking_evidence_complete === false || item.serial_tracking_changed_since_draft) return ui('Review serial tracking');
  if (item.stock_lot_reconciled === false) return ui('Stock/lot mismatch');
  if (item.serial_tracking_enabled && (item.serial_evidence_complete === false || item.serials_available === false)) return ui('Serial evidence incomplete');
  return ui('Insufficient unreserved stock');
}

function hasDistinctEnteredQuantity(item: StockTransferDetailItem): boolean {
  if (item.entered_quantity === null || item.entered_quantity === undefined || !item.uom_code) return false;
  const entered = Number(item.entered_quantity);
  const base = Number(item.quantity);
  const enteredUnit = item.uom_code.trim().toUpperCase();
  const baseUnit = String(item.product_unit || item.product_unit_snapshot || '').trim().toUpperCase();
  return enteredUnit !== baseUnit || (Number.isFinite(entered) && Number.isFinite(base) && Math.abs(entered - base) > 0.0000001);
}

const REPLENISHMENT_TRANSFER_NOTE = 'Draft generated from validated location replenishment planning. Human approval and normal transfer execution are still required.';

function sanitizeKnownSystemTransferNote(value: string): string {
  const replenishmentRunNote = /^Draft generated from validated location replenishment planning run [0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\. Human approval and normal transfer execution are still required\.$/i;
  return replenishmentRunNote.test(value) ? REPLENISHMENT_TRANSFER_NOTE : value;
}

function displayHistoricalSerialEvidence(item: StockTransferDetailItem, ui: (text: string) => string): string {
  const serials = item.serial_numbers || [];
  if (item.serial_tracking_enabled === true) return serials.join(', ') || ui('Serial evidence missing');
  if (item.serial_tracking_enabled === false) return ui('Not serial-tracked');
  return serials.length ? serials.join(', ') : ui('Historical serial-tracking evidence unavailable');
}

function getDisplayNotes(transfer: Pick<StockTransferListItem, 'notes' | 'notes_is_system' | 'cancellation_reason'>): string | null {
  const notes = String(transfer.notes || '').trim();
  if (!notes) return null;
  const cancellationReason = String(transfer.cancellation_reason || '').trim();
  const escapedReason = cancellationReason
    ? cancellationReason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : null;
  const withoutCancellation = escapedReason
    ? notes.replace(new RegExp(String.raw`(?:\r?\n)?Cancelled:\s*${escapedReason}\s*$`, 'i'), '').trim()
    : notes;
  const cleaned = transfer.notes_is_system ? sanitizeKnownSystemTransferNote(withoutCancellation) : withoutCancellation;
  return cleaned || null;
}

function displayTransferNotes(transfer: Pick<StockTransferListItem, 'notes' | 'notes_is_system' | 'cancellation_reason'>, ui: (text: string) => string): string | null {
  const notes = getDisplayNotes(transfer);
  return transfer.notes_is_system && notes === REPLENISHMENT_TRANSFER_NOTE ? ui(notes) : notes;
}


function getStatusBadgeStyle(status: StockTransferStatus): CSSProperties {
  if (status === 'executed') return styles.executedBadge;
  if (status === 'cancelled') return styles.cancelledBadge;
  return styles.draftBadge;
}

function normalizeError(error: unknown, fallback: string, ui: (englishText: string) => string): string {
  if (isVersionConflictError(error)) return getVersionConflictMessage(error, ui);
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let raw = String(value);
  const canonicalNumber = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw.trim());
  if (!canonicalNumber && /^[\t\r ]*[=+\-@]/.test(raw)) raw = `'${raw}`;
  const escaped = raw.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function escapeHtml(value: unknown): string {
  return (value === null || value === undefined ? '' : String(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadCsv(filename: string, rows: unknown[][]): void {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function appendTransferFilters(params: URLSearchParams, filters: TransferFilters): void {
  if (filters.status) params.set('status', filters.status);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.fromStorageLocationId) params.set('from_storage_location_id', filters.fromStorageLocationId);
  if (filters.toStorageLocationId) params.set('to_storage_location_id', filters.toStorageLocationId);
  if (filters.productId) params.set('product_id', filters.productId);
}

async function fetchTransfers(filters: TransferFilters, limit: number, offset: number, cursor?: { before_created_at: string; before_id: string } | null): Promise<StockTransferListItem[]> {
  const params = new URLSearchParams();
  appendTransferFilters(params, filters);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (cursor) {
    params.set('before_created_at', cursor.before_created_at);
    params.set('before_id', cursor.before_id);
  }
  return apiRequest<StockTransferListItem[]>(`/stock-transfers?${params.toString()}`);
}

async function fetchTransferSummary(filters: TransferFilters): Promise<TransferSummary> {
  const params = new URLSearchParams();
  appendTransferFilters(params, filters);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<TransferSummary>(`/stock-transfers/summary${suffix}`);
}

async function fetchTransferOptions(sourceStorageLocationId = ''): Promise<TransferOptions> {
  const params = new URLSearchParams();
  if (sourceStorageLocationId) params.set('source_storage_location_id', sourceStorageLocationId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<TransferOptions>(`/stock-transfers/options${suffix}`);
}

async function fetchTransferFilterOptions(): Promise<TransferOptions> {
  return apiRequest<TransferOptions>('/stock-transfers/filter-options');
}

async function fetchTransferById(id: string): Promise<StockTransferDetail> {
  return apiRequest<StockTransferDetail>(`/stock-transfers/${id}`);
}

async function fetchTransferAvailability(id: string): Promise<StockTransferAvailability> {
  return apiRequest<StockTransferAvailability>(`/stock-transfers/${id}/availability`);
}

async function fetchTransferMovements(id: string): Promise<StockTransferMovement[]> {
  return apiRequest<StockTransferMovement[]>(`/stock-transfers/${id}/movements`);
}

async function createTransfer(input: TransferFormState): Promise<StockTransferDetail> {
  return apiRequest<StockTransferDetail>('/stock-transfers', {
    method: 'POST',
    body: JSON.stringify({
      from_storage_location_id: input.from_storage_location_id,
      to_storage_location_id: input.to_storage_location_id,
      notes: input.notes.trim() || null,
      items: input.items.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        uom_code: item.uom_code.trim() || null,
        serial_numbers: splitSerialNumbers(item.serial_numbers_text)
      }))
    })
  });
}

async function updateTransfer(id: string, input: TransferFormState, version: number | string): Promise<StockTransferDetail> {
  return apiRequest<StockTransferDetail>(`/stock-transfers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      from_storage_location_id: input.from_storage_location_id,
      to_storage_location_id: input.to_storage_location_id,
      notes: input.notes.trim() || null,
      version: Number(version),
      items: input.items.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        uom_code: item.uom_code.trim() || null,
        serial_numbers: splitSerialNumbers(item.serial_numbers_text)
      }))
    })
  });
}

async function executeTransfer(input: { id: string; version: number | string }): Promise<{ message: string; transfer: StockTransferDetail }> {
  return apiRequest<{ message: string; transfer: StockTransferDetail }>(`/stock-transfers/${input.id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ version: Number(input.version) })
  });
}

async function cancelTransfer(input: { id: string; version: number | string; reason?: string }): Promise<{ message: string; transfer: StockTransferDetail }> {
  return apiRequest<{ message: string; transfer: StockTransferDetail }>(`/stock-transfers/${input.id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ version: Number(input.version), reason: input.reason?.trim() || null })
  });
}

function StatCard(props: { title: string; value: number | string; subtitle: string; locale: AppLocale; loading?: boolean }) {
  return (
    <OperationalWorkspaceStatCard label={props.title} value={formatNumber(props.value, props.locale)} helper={props.subtitle} loading={props.loading} />
  );
}

export default function StockTransfersPage() {
  const { locale, ui } = useAppTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailSectionRef = useRef<HTMLElement | null>(null);
  const syncingFromUrlRef = useRef(false);
  const {
    canCreateStockTransfers,
    canUpdateStockTransfers,
    canExecuteStockTransfers,
    canCancelStockTransfers
  } = getRoleCapabilities();
  const hasTransferOperationalReads = hasAllPermissions([
    TENANT_PERMISSIONS.STOCK_READ,
    TENANT_PERMISSIONS.PRODUCTS_READ,
    TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ
  ]);
  const canLoadTransferOperationalOptions = hasTransferOperationalReads && (canCreateStockTransfers || canUpdateStockTransfers);
  const canCreateStockTransfersOperationally = canCreateStockTransfers && hasTransferOperationalReads;
  const canUpdateStockTransfersOperationally = canUpdateStockTransfers && hasTransferOperationalReads;
  const canReadCurrentStock = hasPermission(TENANT_PERMISSIONS.STOCK_READ);
  const canExecuteStockTransfersOperationally = canExecuteStockTransfers && canReadCurrentStock;
  const accessRoleLabel = getCurrentAccessRoleLabel();

  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '');
  const [fromLocationFilter, setFromLocationFilter] = useState(() => searchParams.get('from_storage_location_id') || '');
  const [toLocationFilter, setToLocationFilter] = useState(() => searchParams.get('to_storage_location_id') || '');
  const [productFilter, setProductFilter] = useState(() => searchParams.get('product_id') || '');
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(() => searchParams.get('transfer_id'));
  const [page, setPage] = useState(() => Math.max(Number(searchParams.get('page') || 1), 1));
  const [pageSize, setPageSize] = useState(() => {
    const requested = Number(searchParams.get('limit') || 25);
    return PAGE_SIZE_OPTIONS.includes(requested as (typeof PAGE_SIZE_OPTIONS)[number]) ? requested : 25;
  });
  const [form, setForm] = useState<TransferFormState>(emptyTransferForm());
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const nextStatus = searchParams.get('status') || '';
    const nextSearch = searchParams.get('search') || '';
    const nextFrom = searchParams.get('from_storage_location_id') || '';
    const nextTo = searchParams.get('to_storage_location_id') || '';
    const nextProduct = searchParams.get('product_id') || '';
    const nextTransferId = searchParams.get('transfer_id');
    const nextPage = Math.max(Number(searchParams.get('page') || 1), 1);
    const requestedPageSize = Number(searchParams.get('limit') || 25);
    const nextPageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number]) ? requestedPageSize : 25;

    const differs = nextStatus !== statusFilter
      || nextSearch !== searchInput
      || nextSearch !== debouncedSearch
      || nextFrom !== fromLocationFilter
      || nextTo !== toLocationFilter
      || nextProduct !== productFilter
      || nextTransferId !== selectedTransferId
      || nextPage !== page
      || nextPageSize !== pageSize;

    if (!differs) return;
    syncingFromUrlRef.current = true;
    setStatusFilter(nextStatus);
    setSearchInput(nextSearch);
    setDebouncedSearch(nextSearch.trim());
    setFromLocationFilter(nextFrom);
    setToLocationFilter(nextTo);
    setProductFilter(nextProduct);
    setSelectedTransferId(nextTransferId);
    setPage(nextPage);
    setPageSize(nextPageSize);
  }, [searchParams]);

  const transferFilters = useMemo<TransferFilters>(() => ({
    status: statusFilter,
    search: debouncedSearch,
    fromStorageLocationId: fromLocationFilter,
    toStorageLocationId: toLocationFilter,
    productId: productFilter
  }), [statusFilter, debouncedSearch, fromLocationFilter, toLocationFilter, productFilter]);

  useEffect(() => {
    if (syncingFromUrlRef.current) return;
    setPage(1);
  }, [statusFilter, debouncedSearch, fromLocationFilter, toLocationFilter, productFilter]);

  useEffect(() => {
    if (syncingFromUrlRef.current) {
      syncingFromUrlRef.current = false;
      return;
    }
    const next = new URLSearchParams();
    appendTransferFilters(next, transferFilters);
    if (selectedTransferId) next.set('transfer_id', selectedTransferId);
    if (page > 1) next.set('page', String(page));
    if (pageSize !== 25) next.set('limit', String(pageSize));
    setSearchParams(next, { replace: true });
  }, [transferFilters, selectedTransferId, page, pageSize, setSearchParams]);

  const offset = (page - 1) * pageSize;

  const transfersQuery = useQuery({
    queryKey: ['stock-transfers', transferFilters, pageSize, offset],
    queryFn: () => fetchTransfers(transferFilters, pageSize, offset)
  });

  const transferSummaryQuery = useQuery({
    queryKey: ['stock-transfers-summary', transferFilters],
    queryFn: () => fetchTransferSummary(transferFilters)
  });

  const transferFilterOptionsQuery = useQuery({
    queryKey: ['stock-transfer-filter-options'],
    queryFn: fetchTransferFilterOptions
  });

  const transferOptionsQuery = useQuery({
    queryKey: ['stock-transfer-options'],
    queryFn: () => fetchTransferOptions(),
    enabled: canLoadTransferOperationalOptions
  });

  const sourceOptionsQuery = useQuery({
    queryKey: ['stock-transfer-options', form.from_storage_location_id],
    queryFn: () => fetchTransferOptions(form.from_storage_location_id),
    enabled: Boolean(canLoadTransferOperationalOptions && form.from_storage_location_id)
  });

  const transferDetailQuery = useQuery({
    queryKey: ['stock-transfer', selectedTransferId],
    queryFn: () => fetchTransferById(selectedTransferId as string),
    enabled: Boolean(selectedTransferId)
  });

  const transferMovementsQuery = useQuery({
    queryKey: ['stock-transfer-movements', selectedTransferId],
    queryFn: () => fetchTransferMovements(selectedTransferId as string),
    enabled: Boolean(selectedTransferId && transferDetailQuery.data?.status === 'executed')
  });

  const transferAvailabilityQuery = useQuery({
    queryKey: ['stock-transfer-availability', selectedTransferId],
    queryFn: () => fetchTransferAvailability(selectedTransferId as string),
    enabled: Boolean(selectedTransferId && transferDetailQuery.data?.status === 'draft' && canReadCurrentStock)
  });

  const transfers = useMemo(() => transfersQuery.data ?? [], [transfersQuery.data]);
  const options = transferOptionsQuery.data;
  const locations = useMemo(() => options?.locations ?? [], [options]);
  const products = useMemo(() => options?.products ?? [], [options]);
  const filterLocations = useMemo(() => transferFilterOptionsQuery.data?.locations ?? [], [transferFilterOptionsQuery.data]);
  const filterProducts = useMemo(() => transferFilterOptionsQuery.data?.products ?? [], [transferFilterOptionsQuery.data]);
  const sourceProducts = useMemo(
    () => form.from_storage_location_id ? (sourceOptionsQuery.data?.products ?? []) : products,
    [form.from_storage_location_id, sourceOptionsQuery.data, products]
  );
  const sourceProductById = useMemo(
    () => new Map(sourceProducts.map((product) => [product.id, product])),
    [sourceProducts]
  );

  const summary = transferSummaryQuery.data;
  const summaryAvailable = Boolean(summary && !transferSummaryQuery.isError);
  const totalTransfers = summaryAvailable ? Number(summary?.transfer_count || 0) : null;
  const totalPages = totalTransfers === null ? null : Math.max(Math.ceil(totalTransfers / pageSize), 1);
  const firstVisible = transfers.length === 0 ? 0 : offset + 1;
  const lastVisible = totalTransfers === null ? offset + transfers.length : Math.min(offset + transfers.length, totalTransfers);
  const selectedTransfer = transferDetailQuery.data;
  const selectedTransferMovements = transferMovementsQuery.data ?? [];
  const selectedTransferAvailability = transferAvailabilityQuery.data;
  const selectedTransferAuditExportReady = Boolean(
    selectedTransfer && (selectedTransfer.status !== 'executed' || transferMovementsQuery.isSuccess)
  );
  const canWriteTransferForm = editingTransferId ? canUpdateStockTransfersOperationally : canCreateStockTransfersOperationally;
  const selectedVisible = selectedTransferId ? transfers.some((transfer) => transfer.id === selectedTransferId) : false;
  const hasActiveFilters = Boolean(
    statusFilter || searchInput.trim() || fromLocationFilter || toLocationFilter || productFilter
  );

  useEffect(() => {
    if (totalPages !== null && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const createMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: async (transfer) => {
      setForm(emptyTransferForm());
      setSelectedTransferId(transfer.id);
      setMessage(ui('Stock transfer draft created successfully. Review the execution check before moving stock.'));
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-filter-options'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfers-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', transfer.id] })
      ]);
      window.setTimeout(() => detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, ui('Failed to create stock transfer.'), ui));
      setMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input, version }: { id: string; input: TransferFormState; version: number | string }) => updateTransfer(id, input, version),
    onSuccess: async (transfer) => {
      setEditingTransferId(null);
      setForm(emptyTransferForm());
      setSelectedTransferId(transfer.id);
      setMessage(ui('Stock transfer draft updated successfully.'));
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-filter-options'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfers-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', transfer.id] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-availability', transfer.id] })
      ]);
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, ui('Failed to update stock transfer.'), ui));
      setMessage(null);
    }
  });

  const executeMutation = useMutation({
    mutationFn: executeTransfer,
    onSuccess: async (result) => {
      setSelectedTransferId(result.transfer.id);
      setMessage(ui(result.message || 'Stock transfer executed successfully.'));
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-filter-options'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfers-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', result.transfer.id] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-movements', result.transfer.id] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-options'] }),
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movement-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, ui('Failed to execute stock transfer.'), ui));
      setMessage(null);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTransfer,
    onSuccess: async (result) => {
      setSelectedTransferId(result.transfer.id);
      setCancelReason('');
      setMessage(ui(result.message || 'Stock transfer cancelled successfully.'));
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-filter-options'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfers-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', result.transfer.id] })
      ]);
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, ui('Failed to cancel stock transfer.'), ui));
      setMessage(null);
    }
  });

  const addItemRow = () => {
    setForm((current) => ({ ...current, items: [...current.items, { product_id: '', quantity: '', uom_code: '', serial_numbers_text: '' }] }));
  };

  const removeItemRow = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const updateItemRow = (index: number, patch: Partial<TransferFormItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  };

  const selectTransfer = (id: string) => {
    setSelectedTransferId(id);
    setCancelReason('');
    setMessage(null);
    setError(null);
    window.setTimeout(() => detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const startEditingSelectedTransfer = () => {
    if (!selectedTransfer || selectedTransfer.status !== 'draft') return;
    setEditingTransferId(selectedTransfer.id);
    setForm({
      from_storage_location_id: selectedTransfer.from_storage_location_id,
      to_storage_location_id: selectedTransfer.to_storage_location_id,
      notes: getDisplayNotes(selectedTransfer) || '',
      items: selectedTransfer.items.map((item) => ({
        product_id: item.product_id,
        quantity: String(item.entered_quantity ?? item.quantity),
        uom_code: item.uom_code || '',
        serial_numbers_text: (item.serial_numbers || []).join('\n')
      }))
    });
    setMessage(null);
    setError(null);
    scrollToFormSection('stock-transfer-form');
  };

  const cancelEditing = () => {
    setEditingTransferId(null);
    setForm(emptyTransferForm());
    setMessage(null);
    setError(null);
  };

  const validateForm = (): string | null => {
    if (editingTransferId && !canUpdateStockTransfers) return ui('Your current role cannot update stock transfer drafts.');
    if (!editingTransferId && !canCreateStockTransfers) return ui('Your current role cannot create stock transfers.');
    if (!hasTransferOperationalReads) return ui('Your current role cannot access the product, location, and stock information required to create or edit stock transfers.');
    if (transferOptionsQuery.isLoading) return ui('Checking stock transfer locations and products…');
    if (transferOptionsQuery.isError) return ui('Stock transfer operational information is unavailable. Try again before creating or editing a transfer.');
    if (!form.from_storage_location_id || !form.to_storage_location_id) return ui('Select both source and destination storage locations.');
    if (form.from_storage_location_id === form.to_storage_location_id) return ui('Source and destination storage locations must be different.');
    if (sourceOptionsQuery.isLoading) return ui('Checking products and stock at the selected source location…');
    if (sourceOptionsQuery.isError) return ui('Product and stock information is unavailable for the selected source location. Try again before creating or editing a transfer.');
    if (!form.items.length) return ui('Add at least one product to the transfer.');

    const usedProducts = new Set<string>();
    for (const item of form.items) {
      if (!item.product_id) return ui('Every transfer item must have a product.');
      if (usedProducts.has(item.product_id)) return ui('A product can only appear once per transfer.');
      usedProducts.add(item.product_id);

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return ui('Every transfer item quantity must be greater than zero.');

      const sourceProduct = sourceProductById.get(item.product_id);
      if (sourceProduct?.stock_lot_reconciled === false) return ui('Source stock and lot balances do not reconcile for one or more transfer items');
      const selectedUom = item.uom_code.trim().toUpperCase();
      const baseUom = String(sourceProduct?.unit || '').trim().toUpperCase();
      const quantityIsInBaseUnit = !selectedUom || !baseUom || selectedUom === baseUom;
      if (sourceProduct?.serial_tracking_enabled && quantityIsInBaseUnit) {
        const serialNumbers = splitSerialNumbers(item.serial_numbers_text);
        if (!Number.isInteger(quantity)) return ui('Serial-tracked transfer quantities must be whole numbers.');
        if (serialNumbers.length !== quantity) return `${sourceProduct.name} ${ui('requires one serial number for each transferred unit.')}`;
      }
      if (quantityIsInBaseUnit && sourceProduct?.available_quantity !== null && sourceProduct?.available_quantity !== undefined) {
        const available = Number(sourceProduct.available_quantity || 0);
        if (quantity > available) {
          return `${sourceProduct.name} ${ui('has')} ${formatNumber(available, locale)} ${sourceProduct.unit || ui('units')} ${ui('of unreserved stock available at the source location.')}`;
        }
      }
    }

    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (editingTransferId) {
      const draftVersion = selectedTransfer?.id === editingTransferId ? selectedTransfer.version : null;
      if (!draftVersion) {
        setError(ui('Refresh the selected transfer before saving draft changes.'));
        return;
      }
      updateMutation.mutate({ id: editingTransferId, input: form, version: draftVersion });
      return;
    }

    createMutation.mutate(form);
  };

  const clearTransferFilters = () => {
    setStatusFilter('');
    setSearchInput('');
    setDebouncedSearch('');
    setFromLocationFilter('');
    setToLocationFilter('');
    setProductFilter('');
  };

  const refreshTransferBoard = async () => {
    setError(null);
    setMessage(null);
    try {
      const tasks: Array<Promise<unknown>> = [
        transfersQuery.refetch(),
        transferSummaryQuery.refetch(),
        transferFilterOptionsQuery.refetch()
      ];
      if (canLoadTransferOperationalOptions) tasks.push(transferOptionsQuery.refetch());
      if (canLoadTransferOperationalOptions && form.from_storage_location_id) tasks.push(sourceOptionsQuery.refetch());
      if (selectedTransferId) tasks.push(transferDetailQuery.refetch());
      if (selectedTransfer?.status === 'executed') tasks.push(transferMovementsQuery.refetch());
      if (selectedTransfer?.status === 'draft' && canReadCurrentStock) tasks.push(transferAvailabilityQuery.refetch());
      await Promise.all(tasks);
      setMessage(ui('Stock transfer information refreshed.'));
    } catch (refreshError) {
      setError(normalizeError(refreshError, ui('Failed to refresh stock transfers.'), ui));
    }
  };

  const exportFilteredTransfersCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setError(null);
    setMessage(null);
    try {
      const allTransfers: StockTransferListItem[] = [];
      let cursor: { before_created_at: string; before_id: string } | null = null;
      for (;;) {
        const batch = await fetchTransfers(transferFilters, EXPORT_BATCH_SIZE, 0, cursor);
        allTransfers.push(...batch);
        if (batch.length < EXPORT_BATCH_SIZE) break;
        const last = batch[batch.length - 1];
        if (!last?.created_at || !last?.id) break;
        cursor = { before_created_at: last.created_at, before_id: last.id };
      }
      const rows: unknown[][] = [[
        ui('Status'), ui('From Location'), ui('To Location'), ui('Item Count'), ui('Created At'), ui('Created By'),
        ui('Executed At'), ui('Executed By'), ui('Cancelled At'), ui('Cancelled By'), ui('Cancellation Reason'), ui('Notes')
      ], ...allTransfers.map((transfer) => [
        ui(formatReadableText(transfer.status)),
        historicalName(transfer.from_storage_location_name, ui, 'location'),
        historicalName(transfer.to_storage_location_name, ui, 'location'),
        Number(transfer.item_count ?? 0), transfer.created_at, displayTransferActor(transfer.created_by_user_name, transfer.status, ui),
        transfer.executed_at ?? '', transfer.executed_at ? displayTransferActor(transfer.executed_by_user_name, transfer.status, ui) : '', transfer.cancelled_at ?? '', transfer.cancelled_at ? displayTransferActor(transfer.cancelled_by_user_name, transfer.status, ui) : '',
        transfer.cancellation_reason ? displayCancellationReason(transfer.cancellation_reason, transfer.cancellation_reason_is_system, ui) : '', displayTransferNotes(transfer, ui) ?? ''
      ])];
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`stock-transfers-filtered-${stamp}.csv`, rows);
      setMessage(`${ui('Exported')} ${formatLocalizedNumber(allTransfers.length, locale)} ${ui(allTransfers.length === 1 ? 'filtered stock transfer.' : 'filtered stock transfers.')}`);
    } catch (exportError) {
      setError(normalizeError(exportError, ui('Could not export the filtered stock transfers.'), ui));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExecuteSelectedTransfer = () => {
    if (!selectedTransfer) return;
    if (transferAvailabilityQuery.isError || !selectedTransferAvailability) {
      setError(ui('Execution preview is unavailable. Refresh the transfer and confirm source availability before executing.'));
      setMessage(null);
      return;
    }
    if (!selectedTransferAvailability.executable) {
      setError(ui(selectedTransferAvailability.message || 'One or more transfer items do not have enough source stock.'));
      setMessage(null);
      return;
    }

    const itemSummary = selectedTransfer.items
      .map((item) => `- ${item.product_name}: ${formatNumber(item.quantity, locale)} ${item.product_unit}`)
      .join('\n');
    const confirmed = window.confirm(
      `${ui('Execute this stock transfer?')}\n\n${selectedTransfer.from_storage_location_name} → ${selectedTransfer.to_storage_location_name}\n\n${itemSummary}\n\n${ui('This moves stock immediately, protects reserved stock, and cannot be edited afterwards.')}`
    );
    if (confirmed) executeMutation.mutate({ id: selectedTransfer.id, version: selectedTransfer.version });
  };

  const handleCancelSelectedTransfer = () => {
    if (!selectedTransfer) return;
    const reasonLine = cancelReason.trim() ? `\n\n${ui('Reason:')} ${cancelReason.trim()}` : '';
    const confirmed = window.confirm(
      `${ui('Cancel this stock transfer draft?')}${reasonLine}\n\n${ui('Cancellation does not move stock and cannot be undone.')}`
    );
    if (confirmed) cancelMutation.mutate({ id: selectedTransfer.id, version: selectedTransfer.version, reason: cancelReason });
  };

  const exportSelectedTransferDetailCsv = () => {
    if (!selectedTransfer) return;
    if (selectedTransfer.status === 'executed' && !transferMovementsQuery.isSuccess) {
      setError(transferMovementsQuery.isError ? ui('Failed to load the transfer movement audit.') : ui('Loading transfer movements…'));
      setMessage(null);
      return;
    }
    const transferRows: unknown[][] = [
      [ui('Status'), ui(formatReadableText(selectedTransfer.status))],
      [ui('From Location'), historicalName(selectedTransfer.from_storage_location_name, ui, 'location')],
      [ui('To Location'), historicalName(selectedTransfer.to_storage_location_name, ui, 'location')],
      [ui('Created At'), selectedTransfer.created_at], [ui('Created By'), displayTransferActor(selectedTransfer.created_by_user_name, selectedTransfer.status, ui)],
      [ui('Executed At'), selectedTransfer.executed_at ?? ''], [ui('Executed By'), selectedTransfer.executed_at ? displayTransferActor(selectedTransfer.executed_by_user_name, selectedTransfer.status, ui) : ''],
      [ui('Cancelled At'), selectedTransfer.cancelled_at ?? ''], [ui('Cancelled By'), selectedTransfer.cancelled_at ? displayTransferActor(selectedTransfer.cancelled_by_user_name, selectedTransfer.status, ui) : ''],
      [ui('Cancellation Reason'), selectedTransfer.cancellation_reason ? displayCancellationReason(selectedTransfer.cancellation_reason, selectedTransfer.cancellation_reason_is_system, ui) : ''],
      [ui('Notes'), displayTransferNotes(selectedTransfer, ui) ?? ''], [], [ui('Items')],
      [ui('Product'), ui('Category'), ui('Base quantity'), ui('Base unit'), ui('Entered quantity'), ui('Entered unit'), ui('Serial numbers')],
      ...selectedTransfer.items.map((item) => [historicalName(item.product_name, ui, 'product'), displayProductCategory(item, selectedTransfer.status, ui), Number(item.quantity), historicalName(item.product_unit, ui, 'unit'), item.entered_quantity ?? item.quantity, item.uom_code || item.product_unit || '', (item.serial_numbers || []).join(', ')])
    ];
    const movementRows: unknown[][] = selectedTransfer.status === 'executed'
      ? [[], [ui('Movement Audit')], ...(selectedTransferMovements.length
          ? [[ui('Time'), ui('Product'), ui('Movement Type'), ui('Storage Location'), ui('Change'), ui('Unit'), ui('User')],
            ...selectedTransferMovements.map((movement) => [movement.created_at, historicalName(movement.product_name, ui, 'product'), ui(getMovementTypeLabel(movement)), historicalName(movement.storage_location_name, ui, 'location'), Number(movement.change), historicalName(movement.product_unit, ui, 'unit'), displayMovementActor(movement.user_name, selectedTransfer.executed_by_user_name, ui)])]
          : [[ui('No movement audit rows were found for this executed transfer. This requires support review.')]])]
      : [];
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`stock-transfer-detail-${stamp}.csv`, [...transferRows, ...movementRows]);
  };

  const printSelectedTransferDetail = () => {
    if (!selectedTransfer) return;
    if (selectedTransfer.status === 'executed' && !transferMovementsQuery.isSuccess) {
      setError(transferMovementsQuery.isError ? ui('Failed to load the transfer movement audit.') : ui('Loading transfer movements…'));
      setMessage(null);
      return;
    }

    const itemRows = selectedTransfer.items.map((item) => `
      <tr><td>${escapeHtml(historicalName(item.product_name, ui, 'product'))}</td><td>${escapeHtml(displayProductCategory(item, selectedTransfer.status, ui))}</td><td>${escapeHtml(formatNumber(item.quantity, locale))} ${escapeHtml(historicalName(item.product_unit, ui, 'unit'))}</td><td>${escapeHtml(formatNumber(item.entered_quantity ?? item.quantity, locale))} ${escapeHtml(item.uom_code || item.product_unit || '')}</td><td>${escapeHtml(displayHistoricalSerialEvidence(item, ui))}</td></tr>
    `).join('');

    const movementRows = selectedTransferMovements.length
      ? selectedTransferMovements.map((movement) => `
          <tr>
            <td>${escapeHtml(formatDateTime(movement.created_at, locale, ui))}</td>
            <td>${escapeHtml(historicalName(movement.product_name, ui, 'product'))}</td>
            <td>${escapeHtml(ui(getMovementTypeLabel(movement)))}</td>
            <td>${escapeHtml(historicalName(movement.storage_location_name, ui, 'location'))}</td>
            <td>${escapeHtml(formatNumber(movement.change, locale))} ${escapeHtml(historicalName(movement.product_unit, ui, 'unit'))}</td>
            <td>${escapeHtml(displayMovementActor(movement.user_name, selectedTransfer.executed_by_user_name, ui))}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="6">${escapeHtml(ui('No movement audit rows were found for this executed transfer. This requires support review.'))}</td></tr>`;

    const availabilityRows = selectedTransferAvailability?.items?.length
      ? selectedTransferAvailability.items.map((item) => `
          <tr>
            <td>${escapeHtml(historicalName(item.product_name, ui, 'product'))}</td>
            <td>${escapeHtml(formatNumber(item.requested_quantity, locale))} ${escapeHtml(historicalName(item.product_unit, ui, 'unit'))}</td>
            <td>${escapeHtml(formatNumber(item.on_hand_quantity, locale))} ${escapeHtml(historicalName(item.product_unit, ui, 'unit'))}</td>
            <td>${escapeHtml(formatNumber(item.reserved_quantity, locale))} ${escapeHtml(historicalName(item.product_unit, ui, 'unit'))}</td>
            <td>${escapeHtml(formatAvailabilityEvidence(item.available_quantity, locale, ui))} ${escapeHtml(historicalName(item.product_unit, ui, 'unit'))}</td>
            <td>${escapeHtml(formatAvailabilityEvidence(item.remaining_after_transfer, locale, ui))} ${escapeHtml(historicalName(item.product_unit, ui, 'unit'))}</td>
            <td>${escapeHtml(getAvailabilityItemStatusLabel(item, ui))}</td>
          </tr>
        `).join('')
      : '';

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=760');
    if (!printWindow) {
      setError(ui('Browser blocked the print window. Allow pop-ups for this site and try again.'));
      setMessage(null);
      return;
    }

    printWindow.document.write(`
      <!doctype html><html><head><title>${escapeHtml(ui('Stock Transfer'))}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
        h1 { margin-bottom: 4px; } .meta { color: #475569; margin: 4px 0; }
        .badge { display: inline-block; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 12px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; font-size: 12px; vertical-align: top; }
        th { color: #475569; } section { margin-top: 24px; }
        .notes { margin-top: 12px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap; }
        @media print { button { display: none; } body { margin: 20px; } }
      </style></head><body>
        <button onclick="window.print()">${escapeHtml(ui('Print'))}</button>
        <h1>${escapeHtml(ui('Stock Transfer'))}</h1>
        <div class="badge">${escapeHtml(ui(formatReadableText(selectedTransfer.status)))}</div>
        <p class="meta"><strong>${escapeHtml(ui('Route:'))}</strong> ${escapeHtml(historicalName(selectedTransfer.from_storage_location_name, ui, 'location'))} → ${escapeHtml(historicalName(selectedTransfer.to_storage_location_name, ui, 'location'))}</p>
        <p class="meta"><strong>${escapeHtml(ui('Created:'))}</strong> ${escapeHtml(formatDateTime(selectedTransfer.created_at, locale, ui))} ${escapeHtml(ui('by'))} ${escapeHtml(displayTransferActor(selectedTransfer.created_by_user_name, selectedTransfer.status, ui))}</p>
        ${selectedTransfer.executed_at ? `<p class="meta"><strong>${escapeHtml(ui('Executed:'))}</strong> ${escapeHtml(formatDateTime(selectedTransfer.executed_at, locale, ui))} ${escapeHtml(ui('by'))} ${escapeHtml(displayTransferActor(selectedTransfer.executed_by_user_name, selectedTransfer.status, ui))}</p>` : ''}
        ${selectedTransfer.cancelled_at ? `<p class="meta"><strong>${escapeHtml(ui('Cancelled:'))}</strong> ${escapeHtml(formatDateTime(selectedTransfer.cancelled_at, locale, ui))} ${escapeHtml(ui('by'))} ${escapeHtml(displayTransferActor(selectedTransfer.cancelled_by_user_name, selectedTransfer.status, ui))}</p>` : ''}
        ${selectedTransfer.cancellation_reason ? `<p class="meta"><strong>${escapeHtml(ui('Cancellation reason:'))}</strong> ${escapeHtml(displayCancellationReason(selectedTransfer.cancellation_reason, selectedTransfer.cancellation_reason_is_system, ui))}</p>` : ''}
        ${displayTransferNotes(selectedTransfer, ui) ? `<div class="notes"><strong>${escapeHtml(ui('Notes:'))}</strong><br />${escapeHtml(displayTransferNotes(selectedTransfer, ui))}</div>` : ''}
        <section><h2>${escapeHtml(ui('Items'))}</h2><table><thead><tr><th>${escapeHtml(ui('Product'))}</th><th>${escapeHtml(ui('Category'))}</th><th>${escapeHtml(ui('Base quantity'))}</th><th>${escapeHtml(ui('Entered as'))}</th><th>${escapeHtml(ui('Serial numbers'))}</th></tr></thead><tbody>${itemRows}</tbody></table></section>
        ${availabilityRows ? `<section><h2>${escapeHtml(ui('Execution Check'))}</h2><p class="meta">${escapeHtml(ui(selectedTransferAvailability?.message || ''))}</p><table><thead><tr><th>${escapeHtml(ui('Product'))}</th><th>${escapeHtml(ui('Requested'))}</th><th>${escapeHtml(ui('On Hand'))}</th><th>${escapeHtml(ui('Reserved'))}</th><th>${escapeHtml(ui('Available'))}</th><th>${escapeHtml(ui('After Transfer'))}</th><th>${escapeHtml(ui('Status'))}</th></tr></thead><tbody>${availabilityRows}</tbody></table></section>` : ''}
        ${selectedTransfer.status === 'executed' ? `<section><h2>${escapeHtml(ui('Movement Audit'))}</h2><table><thead><tr><th>${escapeHtml(ui('Time'))}</th><th>${escapeHtml(ui('Product'))}</th><th>${escapeHtml(ui('Direction'))}</th><th>${escapeHtml(ui('Location'))}</th><th>${escapeHtml(ui('Change'))}</th><th>${escapeHtml(ui('User'))}</th></tr></thead><tbody>${movementRows}</tbody></table></section>` : ''}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const isRefreshingTransfers = Boolean(
    transfersQuery.isFetching || transferSummaryQuery.isFetching || transferFilterOptionsQuery.isFetching || transferOptionsQuery.isFetching ||
    sourceOptionsQuery.isFetching || transferDetailQuery.isFetching || transferAvailabilityQuery.isFetching ||
    transferMovementsQuery.isFetching
  );
  const submitPending = createMutation.isPending || updateMutation.isPending;
  const executePreviewReady = Boolean(
    selectedTransferAvailability && !transferAvailabilityQuery.isLoading && !transferAvailabilityQuery.isError
  );

  return (
    <div className="io-operational-page io-stock-transfers-page io-workspace-page" style={styles.page}>
      <OperationalWorkspaceHero
        iconPath="/stock-transfers"
        eyebrow={ui("Internal logistics")}
        title={ui("Stock transfer workspace")}
        description={ui("Plan controlled moves between storage locations, keep drafts separate from execution, and preserve a complete movement audit trail.")}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
            <>
                      <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
                      <OperationalWorkspaceMetaPill>{ui("Draft before execution")}</OperationalWorkspaceMetaPill>
                      <OperationalWorkspaceMetaPill>{canExecuteStockTransfersOperationally ? ui("Execution access") : `${ui(accessRoleLabel)} ${ui('review access')}`}</OperationalWorkspaceMetaPill>
                    </>
          */
        }
        aside={<OperationalWorkspaceStatus value={transferSummaryQuery.isLoading || !summaryAvailable ? '—' : summary?.transfer_count ?? '—'} label={ui("transfers matching the current filters")} />}
      />

      <div className="app-grid-stats io-workspace-stats" style={styles.statsGrid}>
        <StatCard locale={locale} title={ui("Transfers")} value={summaryAvailable ? summary?.transfer_count ?? '—' : '—'} subtitle={ui("Matching the current filters")} loading={transferSummaryQuery.isLoading} />
        <StatCard locale={locale} title={ui("Drafts")} value={summaryAvailable ? summary?.draft_count ?? '—' : '—'} subtitle={ui("Waiting for execution or cancellation")} loading={transferSummaryQuery.isLoading} />
        <StatCard locale={locale} title={ui("Executed")} value={summaryAvailable ? summary?.executed_count ?? '—' : '—'} subtitle={ui("Stock already moved")} loading={transferSummaryQuery.isLoading} />
        <StatCard locale={locale} title={ui("Cancelled")} value={summaryAvailable ? summary?.cancelled_count ?? '—' : '—'} subtitle={ui("Drafts closed without moving stock")} loading={transferSummaryQuery.isLoading} />
        <StatCard locale={locale} title={ui("Line Items")} value={summaryAvailable ? summary?.item_count ?? '—' : '—'} subtitle={ui("Product lines across matching transfers")} loading={transferSummaryQuery.isLoading} />
      </div>

      {message ? <div className="app-success-state" style={styles.feedbackBox}>{message}</div> : null}
      {error ? <div className="app-error-state" style={styles.feedbackBox}>{error}</div> : null}

      {!canCreateStockTransfers && !editingTransferId ? (
        <div className="app-warning-state" style={styles.feedbackBox}>
          {ui("Current access role:")} {ui(accessRoleLabel)}{ui(". The page is available for review, but this role cannot create stock transfer drafts.")}
        </div>
      ) : null}
      {(canCreateStockTransfers || canUpdateStockTransfers) && !hasTransferOperationalReads ? (
        <div className="app-warning-state" style={styles.feedbackBox}>
          {ui('Your current role cannot access the product, location, and stock information required to create or edit stock transfers.')}
        </div>
      ) : null}

      <section id="stock-transfer-form" className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div className="io-section-heading-with-icon">
            <span className="io-section-heading-icon"><TenantNavIcon path="/stock-transfers" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>{editingTransferId ? ui("Edit Transfer Draft") : ui("Create Transfer Draft")}</h3>
              <p style={styles.panelSubtitle}>
              {editingTransferId
                ? ui("Update the selected draft before execution. Editing a draft does not change stock.")
                : ui("Plan an internal move between two storage locations. Stock changes only after an authorized user executes the draft.")}
              </p>
            </div>
          </div>
          {editingTransferId ? <span style={styles.draftBadge}>{ui("EDITING DRAFT")}</span> : null}
        </div>

        {canLoadTransferOperationalOptions && transferOptionsQuery.isError ? (
          <div className="app-error-state">{ui("Stock transfer operational information is unavailable. Try again before creating or editing a transfer.")}</div>
        ) : null}

        <form onSubmit={handleSubmit} style={styles.formStack}>
          <div className="app-grid-2" style={styles.formGrid}>
            <div>
              <label htmlFor="transfer-from-location" style={styles.label}>{ui("From location")}</label>
              <select
                id="transfer-from-location"
                style={styles.input}
                value={form.from_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, from_storage_location_id: event.target.value }))}
                disabled={!canWriteTransferForm || transferOptionsQuery.isLoading || transferOptionsQuery.isError}
                required
              >
                <option value="">{ui("Select source")}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id} disabled={location.id === form.to_storage_location_id || location.source_eligible === false}>
                    {location.name}{location.temperature_zone ? ` · ${ui(formatReadableText(location.temperature_zone))}` : ''}{location.source_eligible === false ? ` · ${ui('Not valid as a transfer source')}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="transfer-to-location" style={styles.label}>{ui("To location")}</label>
              <select
                id="transfer-to-location"
                style={styles.input}
                value={form.to_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, to_storage_location_id: event.target.value }))}
                disabled={!canWriteTransferForm || transferOptionsQuery.isLoading || transferOptionsQuery.isError}
                required
              >
                <option value="">{ui("Select destination")}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id} disabled={location.id === form.from_storage_location_id}>
                    {location.name}{location.temperature_zone ? ` · ${ui(formatReadableText(location.temperature_zone))}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="transfer-notes" style={styles.label}>{ui("Transfer notes")}</label>
            <textarea
              id="transfer-notes"
              style={{ ...styles.input, minHeight: 82, resize: "vertical" }}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder={ui("Optional business reason, request reference, or internal note")}
              maxLength={4000}
              disabled={!canWriteTransferForm}
            />
            <div style={styles.fieldHint}>{formatLocalizedNumber(form.notes.length, locale)} {ui("/ 4,000 characters")}</div>
          </div>

          <div style={styles.itemHeaderRow}>
            <div>
              <h4 style={styles.itemTitle}>{ui("Transfer items")}</h4>
              <p style={styles.panelSubtitle}>{ui("Each product can appear once. Availability is based on unreserved stock at the selected source.")}</p>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={addItemRow} disabled={!canWriteTransferForm}>
              {ui("Add item")}
            </button>
          </div>

          {transferOptionsQuery.isLoading ? (
            <div className="app-empty-state">{ui("Checking stock transfer locations and products…")}</div>
          ) : null}
          {transferOptionsQuery.isError ? (
            <div className="app-warning-state">{ui("Stock transfer operational information is unavailable. Try again before creating or editing a transfer.")}</div>
          ) : null}
          {form.from_storage_location_id && sourceOptionsQuery.isLoading ? (
            <div className="app-empty-state">{ui("Checking products and stock at the selected source location…")}</div>
          ) : null}
          {form.from_storage_location_id && sourceOptionsQuery.isError ? (
            <div className="app-warning-state">{ui("Product and stock information is unavailable for the selected source location. Try again before creating or editing a transfer.")}</div>
          ) : null}

          <div style={styles.itemRows}>
            {form.items.map((item, index) => {
              const selectedProduct = sourceProductById.get(item.product_id);
              const requested = Number(item.quantity || 0);
              const selectedUomCode = item.uom_code.trim().toUpperCase();
              const baseUomCode = String(selectedProduct?.unit || '').trim().toUpperCase();
              const quantityIsInBaseUnit = !selectedUomCode || !baseUomCode || selectedUomCode === baseUomCode;
              const available = selectedProduct?.available_quantity === null || selectedProduct?.available_quantity === undefined
                ? null
                : Number(selectedProduct.available_quantity || 0);
              const remaining = available === null || !quantityIsInBaseUnit ? null : available - requested;

              return (
                <div key={`${index}-${item.product_id}`} style={styles.itemRow}>
                  <div className="app-grid-2" style={styles.formGrid}>
                    <div>
                      <label htmlFor={`transfer-product-${index}`} style={styles.label}>{ui("Product")}</label>
                      <select
                        id={`transfer-product-${index}`}
                        style={styles.input}
                        value={item.product_id}
                        onChange={(event) => updateItemRow(index, { product_id: event.target.value })}
                        disabled={!canWriteTransferForm || transferOptionsQuery.isLoading || transferOptionsQuery.isError || sourceOptionsQuery.isLoading || sourceOptionsQuery.isError}
                        required
                      >
                        <option value="">{ui("Select product")}</option>
                        {sourceProducts.map((product) => {
                          const alreadyUsed = form.items.some((row, rowIndex) => rowIndex !== index && row.product_id === product.id);
                          const unavailable = Boolean(form.from_storage_location_id) && product.transferable === false && product.id !== item.product_id;
                          const availability = form.from_storage_location_id && product.available_quantity !== null && product.available_quantity !== undefined
                            ? ` · ${formatNumber(product.available_quantity, locale)} ${product.unit || ui("units")} ${ui('available')}`
                            : '';
                          return (
                            <option key={product.id} value={product.id} disabled={alreadyUsed || unavailable}>
                              {product.name} ({product.unit || ui("unit")}){availability}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div style={styles.quantityRow}>
                      <div style={{ flex: 1 }}>
                        <label htmlFor={`transfer-quantity-${index}`} style={styles.label}>{ui("Quantity")}</label>
                        <input
                          id={`transfer-quantity-${index}`}
                          style={styles.input}
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={item.quantity}
                          onChange={(event) => updateItemRow(index, { quantity: event.target.value })}
                          disabled={!canWriteTransferForm}
                          required
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>{ui("Unit of measure")}</label>
                        <ProductUomSelect
                          productId={item.product_id}
                          value={item.uom_code}
                          purpose="issue"
                          onChange={(value) => updateItemRow(index, { uom_code: value, serial_numbers_text: '' })}
                          disabled={!canWriteTransferForm}
                          style={styles.input}
                          ariaLabel={`${ui("Transfer unit of measure")} ${formatNumber(index + 1, locale)}`}
                        />
                      </div>
                      <button
                        type="button"
                        style={styles.dangerButton}
                        onClick={() => removeItemRow(index)}
                        disabled={!canWriteTransferForm || form.items.length === 1}
                      >
                        {ui("Remove")}
                      </button>
                    </div>
                  </div>

                  {selectedProduct?.serial_tracking_enabled ? (
                    <div style={{ marginTop: 10 }}>
                      <label htmlFor={`transfer-serials-${index}`} style={styles.label}>{ui("Serial numbers")}</label>
                      <textarea
                        id={`transfer-serials-${index}`}
                        style={{ ...styles.input, minHeight: 82, resize: 'vertical' }}
                        value={item.serial_numbers_text}
                        onChange={(event) => updateItemRow(index, { serial_numbers_text: event.target.value })}
                        placeholder={ui("Enter one serial number per line or separate them with commas")}
                        disabled={!canWriteTransferForm}
                      />
                      <div style={styles.fieldHint}>{ui("Serial-tracked products require one available serial number for each transferred unit.")}</div>
                    </div>
                  ) : null}

                  {selectedProduct && available !== null ? (
                    <div style={remaining !== null && remaining < 0 ? styles.availabilityWarning : styles.availabilitySummary}>
                      <span>{ui("On hand:")} <strong>{formatNumber(selectedProduct.on_hand_quantity, locale)} {selectedProduct.unit}</strong></span>
                      <span>{ui("Reserved:")} <strong>{formatNumber(selectedProduct.reserved_quantity, locale)} {selectedProduct.unit}</strong></span>
                      <span>{ui("Available:")} <strong>{formatNumber(available, locale)} {selectedProduct.unit}</strong></span>
                      {remaining !== null ? <span>{ui("After draft quantity:")} <strong>{formatNumber(remaining, locale)} {selectedProduct.unit}</strong></span> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div style={styles.actionsRow}>
            <button type="submit" style={styles.primaryButton} disabled={!canWriteTransferForm || submitPending || transferOptionsQuery.isLoading || transferOptionsQuery.isError || sourceOptionsQuery.isLoading || sourceOptionsQuery.isError}>
              {editingTransferId
                ? (updateMutation.isPending ? ui("Saving…") : ui("Save draft changes"))
                : (createMutation.isPending ? ui("Creating…") : ui("Create transfer draft"))}
            </button>
            {editingTransferId ? (
              <button type="button" style={styles.secondaryButton} onClick={cancelEditing} disabled={updateMutation.isPending}>
                {ui("Cancel editing")}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.listHeader}>
          <div className="io-section-heading-with-icon">
            <span className="io-section-heading-icon"><TenantNavIcon path="/stock-transfers" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>{ui("Stock Transfers")}</h3>
              <p style={styles.panelSubtitle}>{ui("Search drafts and completed transfers, then open one for execution, cancellation, print, export, or movement audit.")}</p>
            </div>
          </div>
          <div style={styles.filterActions}>
            <button type="button" style={styles.secondaryButton} onClick={refreshTransferBoard} disabled={isRefreshingTransfers}>
              {isRefreshingTransfers ? ui("Refreshing…") : ui("Refresh transfers")}
            </button>
            <button type="button" style={styles.secondaryButton} onClick={exportFilteredTransfersCsv} disabled={isExporting || transfersQuery.isLoading || transfersQuery.isError}>
              {isExporting ? ui("Preparing CSV…") : ui("Export filtered CSV")}
            </button>
            <button type="button" style={styles.secondaryButton} onClick={clearTransferFilters} disabled={!hasActiveFilters}>
              {ui("Clear filters")}
            </button>
          </div>
        </div>

        {transferFilterOptionsQuery.isError ? (
          <div className="app-warning-state">{ui('Stock transfer filter choices are unavailable. Transfer history can still be reviewed, but location and product filter choices could not be loaded.')}</div>
        ) : null}

        <div className="app-grid-2" style={styles.filterGrid}>
          <div>
            <label htmlFor="transfer-search" style={styles.label}>{ui("Search transfers")}</label>
            <input
              id="transfer-search"
              style={styles.input}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={ui("Product, location, notes, creator, executor, or cancellation reason")}
              maxLength={255}
              type="search"
            />
          </div>

          <div>
            <label htmlFor="transfer-status-filter" style={styles.label}>{ui("Status")}</label>
            <select id="transfer-status-filter" style={styles.input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">{ui("All statuses")}</option>
              <option value="draft">{ui("Draft")}</option>
              <option value="executed">{ui("Executed")}</option>
              <option value="cancelled">{ui("Cancelled")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="transfer-from-filter" style={styles.label}>{ui("From location")}</label>
            <select id="transfer-from-filter" style={styles.input} value={fromLocationFilter} onChange={(event) => setFromLocationFilter(event.target.value)} disabled={transferFilterOptionsQuery.isLoading || transferFilterOptionsQuery.isError}>
              <option value="">{ui("Any source")}</option>
              {filterLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="transfer-to-filter" style={styles.label}>{ui("To location")}</label>
            <select id="transfer-to-filter" style={styles.input} value={toLocationFilter} onChange={(event) => setToLocationFilter(event.target.value)} disabled={transferFilterOptionsQuery.isLoading || transferFilterOptionsQuery.isError}>
              <option value="">{ui("Any destination")}</option>
              {filterLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="transfer-product-filter" style={styles.label}>{ui("Product")}</label>
            <select id="transfer-product-filter" style={styles.input} value={productFilter} onChange={(event) => setProductFilter(event.target.value)} disabled={transferFilterOptionsQuery.isLoading || transferFilterOptionsQuery.isError}>
              <option value="">{ui("Any product")}</option>
              {filterProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.resultsToolbar}>
          <span style={styles.resultCount}>
            {transferSummaryQuery.isLoading
              ? ui("Calculating transfer totals…")
              : totalTransfers === null
                ? `${ui('Showing')} ${formatLocalizedNumber(firstVisible, locale)}–${formatLocalizedNumber(lastVisible, locale)} ${ui('matching transfers on this page')}`
                : `${ui('Showing')} ${formatLocalizedNumber(firstVisible, locale)}–${formatLocalizedNumber(lastVisible, locale)} ${ui('of')} ${formatLocalizedNumber(totalTransfers, locale)} ${ui('matching transfers')}`}
          </span>
          <label style={styles.rowsLabel} htmlFor="transfer-page-size">
            {ui("Rows per page")}
            <select
              id="transfer-page-size"
              style={styles.compactSelect}
              value={pageSize}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>

        {transfersQuery.isLoading ? <div className="app-empty-state">{ui("Loading transfers…")}</div> : null}
        {transfersQuery.isError ? <div className="app-error-state">{ui("Failed to load stock transfers.")}</div> : null}
        {transferSummaryQuery.isError ? <div className="app-warning-state">{ui("Full filtered totals are unavailable. Visible transfer cards can still be reviewed.")}</div> : null}
        {!transfersQuery.isLoading && !transfersQuery.isError && transfers.length === 0 ? (
          <div className="app-empty-state">
            {hasActiveFilters ? ui("No stock transfers match the current filters.") : ui("No stock transfers exist yet.")}
          </div>
        ) : null}

        <div style={styles.transferList}>
          {transfers.map((transfer) => {
            const displayNotes = displayTransferNotes(transfer, ui);
            return (
              <button
                key={transfer.id}
                type="button"
                style={{ ...styles.transferCard, ...(selectedTransferId === transfer.id ? styles.transferCardActive : {}) }}
                onClick={() => selectTransfer(transfer.id)}
                aria-pressed={selectedTransferId === transfer.id}
              >
                <div style={styles.transferCardTop}>
                  <strong>{historicalName(transfer.from_storage_location_name, ui, 'location')} → {historicalName(transfer.to_storage_location_name, ui, 'location')}</strong>
                  <span style={getStatusBadgeStyle(transfer.status)}>{ui(formatReadableText(transfer.status))}</span>
                </div>
                <div style={styles.transferMeta}>
                  {formatNumber(transfer.item_count, locale)} {ui(Number(transfer.item_count || 0) === 1 ? "line item" : "line items")} {ui("· Created")} {formatDateTime(transfer.created_at, locale, ui)}
                  {` ${ui('by')} ${displayTransferActor(transfer.created_by_user_name, transfer.status, ui)}`}
                </div>
                {transfer.status === 'executed' && transfer.executed_at ? (
                  <div style={styles.transferMeta}>{ui("Executed")} {formatDateTime(transfer.executed_at, locale, ui)}{` ${ui('by')} ${displayTransferActor(transfer.executed_by_user_name, transfer.status, ui)}`}</div>
                ) : null}
                {transfer.status === 'cancelled' && transfer.cancelled_at ? (
                  <div style={styles.transferMeta}>{ui("Cancelled")} {formatDateTime(transfer.cancelled_at, locale, ui)}{` ${ui('by')} ${displayTransferActor(transfer.cancelled_by_user_name, transfer.status, ui)}`}</div>
                ) : null}
                {transfer.cancellation_reason ? <div style={styles.cancelReason}>{ui("Cancellation:")} {displayCancellationReason(transfer.cancellation_reason, transfer.cancellation_reason_is_system, ui)}</div> : null}
                {displayNotes ? <div style={styles.transferNotes}>{displayNotes}</div> : null}
              </button>
            );
          })}
        </div>

        {(page > 1 || (totalPages !== null ? totalPages > 1 : transfers.length === pageSize)) ? (
          <div style={styles.paginationRow}>
            <button type="button" style={styles.secondaryButton} onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page <= 1 || transfersQuery.isFetching}>{ui("Previous")}</button>
            <span style={styles.pageLabel}>{totalPages === null ? `${ui('Page')} ${formatLocalizedNumber(page, locale)}` : `${ui('Page')} ${formatLocalizedNumber(page, locale)} ${ui('of')} ${formatLocalizedNumber(totalPages, locale)}`}</span>
            <button type="button" style={styles.secondaryButton} onClick={() => setPage((current) => current + 1)} disabled={transfersQuery.isFetching || (totalPages !== null ? page >= totalPages : transfers.length < pageSize)}>{ui("Next")}</button>
          </div>
        ) : null}
      </section>

      {selectedTransferId ? (
        <section ref={detailSectionRef} className="app-panel app-panel--padded" style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div className="io-section-heading-with-icon">
              <span className="io-section-heading-icon"><TenantNavIcon path="/stock-transfers" size={17} /></span>
              <div className="io-section-heading-copy">
                <h3 style={styles.panelTitle}>{ui("Transfer Detail")}</h3>
                <p style={styles.panelSubtitle}>{ui("Review the selected transfer’s route, lifecycle, items, source-stock check, and execution audit.")}</p>
              </div>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={() => setSelectedTransferId(null)}>{ui("Close detail")}</button>
          </div>

          {!selectedVisible && !transferDetailQuery.isLoading && selectedTransfer ? (
            <div className="app-warning-state">{ui("This selected transfer is outside the current list page or filters. Its direct-link detail remains open.")}</div>
          ) : null}
          {transferDetailQuery.isLoading ? <div className="app-empty-state">{ui("Loading transfer detail…")}</div> : null}
          {transferDetailQuery.isError ? <div className="app-error-state">{ui("Failed to load transfer detail. The transfer may no longer exist or may not belong to this tenant.")}</div> : null}

          {selectedTransfer ? (
            <div style={styles.detailBlock}>
              <div style={styles.detailHeader}>
                <div>
                  <div style={styles.detailRoute}>{historicalName(selectedTransfer.from_storage_location_name, ui, 'location')} → {historicalName(selectedTransfer.to_storage_location_name, ui, 'location')}</div>
                  <div style={styles.transferMeta}>{ui("Created")} {formatDateTime(selectedTransfer.created_at, locale, ui)} {ui("by")} {displayTransferActor(selectedTransfer.created_by_user_name, selectedTransfer.status, ui)}</div>
                  {selectedTransfer.executed_at ? <div style={styles.transferMeta}>{ui("Executed")} {formatDateTime(selectedTransfer.executed_at, locale, ui)} {ui("by")} {displayTransferActor(selectedTransfer.executed_by_user_name, selectedTransfer.status, ui)}</div> : null}
                  {selectedTransfer.cancelled_at ? <div style={styles.transferMeta}>{ui("Cancelled")} {formatDateTime(selectedTransfer.cancelled_at, locale, ui)} {ui("by")} {displayTransferActor(selectedTransfer.cancelled_by_user_name, selectedTransfer.status, ui)}</div> : null}
                </div>
                <div style={styles.detailHeaderActions}>
                  <button type="button" style={styles.secondaryButton} onClick={exportSelectedTransferDetailCsv} disabled={!selectedTransferAuditExportReady}>{ui("Export detail CSV")}</button>
                  <button type="button" style={styles.secondaryButton} onClick={printSelectedTransferDetail} disabled={!selectedTransferAuditExportReady}>{ui("Print detail")}</button>
                  <span style={getStatusBadgeStyle(selectedTransfer.status)}>{ui(formatReadableText(selectedTransfer.status))}</span>
                </div>
              </div>

              {selectedTransfer.cancellation_reason ? (
                <div style={styles.cancellationBox}><strong>{ui("Cancellation reason:")}</strong> {displayCancellationReason(selectedTransfer.cancellation_reason, selectedTransfer.cancellation_reason_is_system, ui)}</div>
              ) : null}
              {displayTransferNotes(selectedTransfer, ui) ? <div style={styles.detailNotes}><strong>{ui("Transfer notes")}</strong><br />{displayTransferNotes(selectedTransfer, ui)}</div> : null}

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>{ui("Product")}</th><th style={styles.th}>{ui("Category")}</th><th style={styles.th}>{ui("Quantity")}</th><th style={styles.th}>{ui("Unit")}</th><th style={styles.th}>{ui("Serial numbers")}</th></tr></thead>
                  <tbody>
                    {selectedTransfer.items.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}><strong>{historicalName(item.product_name, ui, 'product')}</strong></td>
                        <td style={styles.td}>{displayProductCategory(item, selectedTransfer.status, ui)}</td>
                        <td style={styles.td}>
                          {formatNumber(item.quantity, locale)}
                          {hasDistinctEnteredQuantity(item) ? <div style={styles.fieldHint}>{ui('Entered as:')} {formatNumber(item.entered_quantity, locale)} {item.uom_code}</div> : null}
                        </td>
                        <td style={styles.td}>{historicalName(item.product_unit, ui, 'unit')}</td>
                        <td style={styles.td}>{displayHistoricalSerialEvidence(item, ui)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedTransfer.status === 'draft' ? (
                <div style={styles.availabilityBlock}>
                  <h4 style={styles.itemTitle}>{ui("Execution Check")}</h4>
                  <p style={styles.panelSubtitle}>{ui("Execution requires reconciled, usable, non-expired, unreserved source stock and complete serial evidence where serial tracking is enabled.")}</p>
                  {!canReadCurrentStock ? <div className="app-warning-state">{ui('Your current role cannot access the current stock information required to check or execute this transfer.')}</div> : null}
                  {transferAvailabilityQuery.isLoading ? <div className="app-empty-state">{ui("Checking source stock…")}</div> : null}
                  {transferAvailabilityQuery.isError ? <div className="app-error-state">{ui("Source-stock preview is unavailable. Refresh before executing this transfer.")}</div> : null}
                  {selectedTransferAvailability ? (
                    <div className={selectedTransferAvailability.executable ? "app-success-state" : "app-warning-state"} style={styles.feedbackBox}>
                      {ui(selectedTransferAvailability.message)}
                    </div>
                  ) : null}
                  {selectedTransferAvailability?.items?.length ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>{ui("Product")}</th><th style={styles.th}>{ui("Requested")}</th><th style={styles.th}>{ui("On Hand")}</th>
                            <th style={styles.th}>{ui("Reserved")}</th><th style={styles.th}>{ui("Available")}</th><th style={styles.th}>{ui("After Transfer")}</th><th style={styles.th}>{ui("Readiness")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTransferAvailability.items.map((item) => (
                            <tr key={item.product_id}>
                              <td style={styles.td}><strong>{item.product_name}</strong></td>
                              <td style={styles.td}>{formatNumber(item.requested_quantity, locale)} {item.product_unit}</td>
                              <td style={styles.td}>{formatNumber(item.on_hand_quantity, locale)} {item.product_unit}</td>
                              <td style={styles.td}>{formatNumber(item.reserved_quantity, locale)} {item.product_unit}</td>
                              <td style={styles.td}>{formatAvailabilityEvidence(item.available_quantity, locale, ui)} {item.product_unit}</td>
                              <td style={styles.td}>{formatAvailabilityEvidence(item.remaining_after_transfer, locale, ui)} {item.product_unit}</td>
                              <td style={styles.td}>
                                <span style={item.sufficient ? styles.readyBadge : styles.notReadyBadge}>
                                  {getAvailabilityItemStatusLabel(item, ui)}
                                </span>
                                {item.unit_evidence_complete === false ? <div style={styles.fieldHint}>{ui("Historical unit unavailable")}. {ui("Review and save the draft again before execution.")}</div> : null}
                                {item.unit_changed_since_draft ? <div style={styles.fieldHint}>{ui("Current base unit:")} {item.current_product_unit || ui("Unavailable")}</div> : null}
                                {item.serial_tracking_evidence_complete === false ? <div style={styles.fieldHint}>{ui('Historical serial-tracking evidence unavailable')}. {ui('Review and save the draft again before execution.')}</div> : null}
                                {item.serial_tracking_changed_since_draft ? <div style={styles.fieldHint}>{ui('Product serial tracking changed after this draft was saved. Review and save the draft again before execution.')}</div> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedTransfer.status === 'executed' ? (
                <div style={styles.movementBlock}>
                  <h4 style={styles.itemTitle}>{ui("Movement Audit")}</h4>
                  <p style={styles.panelSubtitle}>{ui("Each product has an outbound row at the source and an inbound row at the destination.")}</p>
                  {transferMovementsQuery.isLoading ? <div className="app-empty-state">{ui("Loading transfer movements…")}</div> : null}
                  {transferMovementsQuery.isError ? <div className="app-error-state">{ui("Failed to load the transfer movement audit.")}</div> : null}
                  {!transferMovementsQuery.isLoading && !transferMovementsQuery.isError && selectedTransferMovements.length === 0 ? (
                    <div className="app-warning-state">{ui("No movement audit rows were found for this executed transfer. This requires support review.")}</div>
                  ) : null}
                  {selectedTransferMovements.length > 0 ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead><tr><th style={styles.th}>{ui("Time")}</th><th style={styles.th}>{ui("Product")}</th><th style={styles.th}>{ui("Direction")}</th><th style={styles.th}>{ui("Location")}</th><th style={styles.th}>{ui("Change")}</th><th style={styles.th}>{ui("Operator")}</th></tr></thead>
                        <tbody>
                          {selectedTransferMovements.map((movement) => (
                            <tr key={movement.id}>
                              <td style={styles.td}>{formatDateTime(movement.created_at, locale, ui)}</td>
                              <td style={styles.td}><strong>{historicalName(movement.product_name, ui, 'product')}</strong></td>
                              <td style={styles.td}><span style={Number(movement.change) < 0 ? styles.outBadge : styles.inBadge}>{ui(getMovementTypeLabel(movement))}</span></td>
                              <td style={styles.td}>{historicalName(movement.storage_location_name, ui, 'location')}</td>
                              <td style={styles.td}><strong>{Number(movement.change) > 0 ? '+' : ''}{formatNumber(movement.change, locale)} {historicalName(movement.product_unit, ui, 'unit')}</strong></td>
                              <td style={styles.td}>{displayMovementActor(movement.user_name, selectedTransfer.executed_by_user_name, ui)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedTransfer.status === 'draft' ? (
                <div style={styles.draftActionsBlock}>
                  <div style={styles.actionsRow}>
                    <button type="button" style={styles.secondaryButton} onClick={startEditingSelectedTransfer} disabled={!canUpdateStockTransfersOperationally || executeMutation.isPending || cancelMutation.isPending || updateMutation.isPending}>{ui("Edit draft")}</button>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={handleExecuteSelectedTransfer}
                      disabled={!canExecuteStockTransfersOperationally || executeMutation.isPending || cancelMutation.isPending || !executePreviewReady || selectedTransferAvailability?.executable === false}
                    >
                      {executeMutation.isPending ? ui("Executing…") : ui("Execute transfer")}
                    </button>
                  </div>

                  <div style={styles.cancelArea}>
                    <label htmlFor="transfer-cancel-reason" style={styles.label}>{ui("Cancellation reason (optional)")}</label>
                    <textarea
                      id="transfer-cancel-reason"
                      style={styles.cancelReasonInput}
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder={ui("Reason for closing this draft without moving stock")}
                      rows={2}
                      maxLength={1000}
                      disabled={!canCancelStockTransfers || executeMutation.isPending || cancelMutation.isPending}
                    />
                    <div style={styles.cancelFooter}>
                      <span style={styles.fieldHint}>{formatLocalizedNumber(cancelReason.length, locale)} {ui("/ 1,000 characters")}</span>
                      <button type="button" style={styles.dangerButton} onClick={handleCancelSelectedTransfer} disabled={!canCancelStockTransfers || executeMutation.isPending || cancelMutation.isPending}>
                        {cancelMutation.isPending ? ui("Cancelling…") : ui("Cancel draft")}
                      </button>
                    </div>
                  </div>

                  {!canUpdateStockTransfers ? <span style={styles.permissionHint}>{ui("Your role cannot edit transfer drafts.")}</span> : canUpdateStockTransfers && !hasTransferOperationalReads ? <span style={styles.permissionHint}>{ui('Your current role cannot access the product, location, and stock information required to create or edit stock transfers.')}</span> : null}
                  {!canExecuteStockTransfers ? <span style={styles.permissionHint}>{ui("Your role cannot execute transfers.")}</span> : canExecuteStockTransfers && !canReadCurrentStock ? <span style={styles.permissionHint}>{ui('Your current role cannot access the current stock information required to execute transfers.')}</span> : null}
                  {!canCancelStockTransfers ? <span style={styles.permissionHint}>{ui("Your role cannot cancel transfer drafts.")}</span> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', minWidth: 0 },
  statsGrid: { marginBottom: 0 },
  statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)' },
  statTitle: { fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 800, color: '#0f172a' },
  statSubtitle: { marginTop: 6, fontSize: 13, color: '#64748b', lineHeight: 1.35 },
  panel: { display: 'flex', flexDirection: 'column', gap: 14, scrollMarginTop: 24, borderRadius: 12 },
  panelTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' },
  panelSubtitle: { margin: '4px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.45 },
  sectionHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  feedbackBox: { padding: '12px 14px', borderRadius: 14 },
  formStack: { display: 'flex', flexDirection: 'column', gap: 16 },
  formGrid: { gap: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 10, padding: '11px 12px', fontSize: 14, color: '#0f172a', background: '#fff', fontFamily: 'inherit' },
  fieldHint: { marginTop: 5, color: '#64748b', fontSize: 12 },
  itemHeaderRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  itemTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' },
  itemRows: { display: 'flex', flexDirection: 'column', gap: 12 },
  itemRow: { padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' },
  quantityRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  availabilitySummary: { marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: '10px 12px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: 13 },
  availabilityWarning: { marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: '10px 12px', borderRadius: 12, background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', fontSize: 13 },
  actionsRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  primaryButton: { border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', padding: '11px 16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(37, 99, 235, 0.18)' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 8, background: '#fff', color: '#dc2626', padding: '11px 12px', fontWeight: 700, cursor: 'pointer' },
  listHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  filterGrid: { gap: 14, alignItems: 'end' },
  filterActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  resultsToolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 2 },
  resultCount: { color: '#64748b', fontSize: 13 },
  rowsLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 13, fontWeight: 700 },
  compactSelect: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 9px', background: '#fff', color: '#0f172a' },
  transferList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  transferCard: { textAlign: 'left', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 14, cursor: 'pointer', color: '#0f172a', minWidth: 0, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)' },
  transferCardActive: { borderColor: '#2563eb', boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.12)' },
  transferCardTop: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  transferMeta: { marginTop: 8, fontSize: 13, color: '#64748b', lineHeight: 1.45, overflowWrap: 'anywhere' },
  transferNotes: { marginTop: 8, fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  cancelReason: { marginTop: 8, padding: '7px 9px', borderRadius: 10, background: '#fff1f2', color: '#9f1239', fontSize: 13, overflowWrap: 'anywhere' },
  draftBadge: { display: 'inline-flex', borderRadius: 999, padding: '5px 9px', background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 900 },
  executedBadge: { display: 'inline-flex', borderRadius: 999, padding: '5px 9px', background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 900 },
  cancelledBadge: { display: 'inline-flex', borderRadius: 999, padding: '5px 9px', background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 900 },
  paginationRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 4 },
  pageLabel: { color: '#475569', fontSize: 13, fontWeight: 700 },
  detailBlock: { display: 'flex', flexDirection: 'column', gap: 14 },
  detailHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  detailHeaderActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  detailRoute: { fontSize: 20, fontWeight: 900, color: '#0f172a' },
  detailNotes: { margin: 0, padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'pre-wrap' },
  cancellationBox: { padding: 12, borderRadius: 12, background: '#fff1f2', border: '1px solid #fecaca', color: '#9f1239' },
  tableWrapper: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 680 },
  th: { textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', padding: 10, background: '#f8fafc', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #f1f5f9', padding: 10, fontSize: 13, color: '#0f172a', verticalAlign: 'top' },
  availabilityBlock: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' },
  movementBlock: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  readyBadge: { display: 'inline-flex', borderRadius: 999, padding: '4px 8px', background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 800 },
  notReadyBadge: { display: 'inline-flex', borderRadius: 999, padding: '4px 8px', background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 800 },
  inBadge: { display: 'inline-flex', borderRadius: 999, padding: '4px 8px', background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 800 },
  outBadge: { display: 'inline-flex', borderRadius: 999, padding: '4px 8px', background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 800 },
  auditHint: { marginTop: 4, color: '#94a3b8', fontSize: 11 },
  draftActionsBlock: { display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 2 },
  cancelArea: { padding: 14, border: '1px solid #fecaca', borderRadius: 12, background: '#fff7f7' },
  cancelReasonInput: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #fecaca', borderRadius: 10, background: '#fff', color: '#0f172a', fontFamily: 'inherit', resize: 'vertical' },
  cancelFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8 },
  permissionHint: { fontSize: 13, color: '#64748b' }
};
