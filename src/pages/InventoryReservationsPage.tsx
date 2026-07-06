import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ApiError, apiMutationRequest, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { ProductItem } from '../types/inventory';


type StorageLocationOption = {
  id: string;
  name: string;
  temperature_zone?: string | null;
};

type ProductListResponse = ProductItem[] | {
  products?: ProductItem[];
  rows?: ProductItem[];
  data?: ProductItem[] | { products?: ProductItem[]; rows?: ProductItem[] };
};

type StorageLocationListResponse = StorageLocationOption[] | {
  storage_locations?: StorageLocationOption[];
  storageLocations?: StorageLocationOption[];
  locations?: StorageLocationOption[];
  rows?: StorageLocationOption[];
  data?: StorageLocationOption[] | {
    storage_locations?: StorageLocationOption[];
    storageLocations?: StorageLocationOption[];
    locations?: StorageLocationOption[];
    rows?: StorageLocationOption[];
  };
};

type ReservationStatus =
  | 'draft'
  | 'active'
  | 'partially_allocated'
  | 'allocated'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'released'
  | 'expired'
  | 'cancelled'
  | string;

type InventoryReservation = {
  id: string;
  reservation_number: string;
  status: ReservationStatus;
  source_type?: string | null;
  source_id?: string | null;
  requesting_department?: string | null;
  target_department?: string | null;
  priority?: string | null;
  needed_by?: string | null;
  expires_at?: string | null;
  notes?: string | null;
  line_count?: number | string;
  requested_quantity_total?: number | string;
  reserved_quantity_total?: number | string;
  fulfilled_quantity_total?: number | string;
  released_quantity_total?: number | string;
  open_reserved_quantity_total?: number | string;
  items?: ReservationItem[];
};

type ReservationItem = {
  id: string;
  product_id: string;
  product_name?: string | null;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  requested_quantity?: number | string;
  reserved_quantity?: number | string;
  fulfilled_quantity?: number | string;
  released_quantity?: number | string;
  allocation_status?: string | null;
  allocation_strategy?: string | null;
  allocation_note?: string | null;
};


type ReservationAuditEvent = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

type ReservationSummary = {
  active_reservations: number;
  draft_reservations: number;
  expired_reservations: number;
  expiration_attention_count: number;
  open_reserved_quantity_total: number;
};

type ReservationSourceSummaryRow = {
  source_type: string;
  source_id?: string | null;
  requesting_department?: string | null;
  target_department?: string | null;
  reservation_count: number;
  active_reservation_count: number;
  draft_reservation_count: number;
  expiration_attention_count: number;
  requested_quantity_total: number;
  reserved_quantity_total: number;
  open_reserved_quantity_total: number;
};

type ProjectedFreeStockRow = {
  product_id: string;
  storage_location_id?: string | null;
  on_hand_quantity: number;
  reserved_quantity: number;
  projected_free_quantity: number;
};

type ReservationConflict = {
  reservation_id: string;
  reservation_number: string;
  reservation_item_id: string;
  status: string;
  priority?: string | null;
  source_type?: string | null;
  needed_by?: string | null;
  product_id: string;
  product_name?: string | null;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  requested_quantity: number;
  reserved_quantity: number;
  remaining_to_allocate: number;
  open_reserved_quantity: number;
  on_hand_quantity: number;
  total_open_reserved_quantity: number;
  projected_free_quantity: number;
  conflict_quantity: number;
  conflict_reason: string;
};

type Filters = {
  status: string;
  sourceType: string;
  sourceId: string;
  requestingDepartment: string;
  targetDepartment: string;
  priority: string;
  search: string;
};

type ReservationDraftLine = {
  product_id: string;
  storage_location_id: string;
  requested_quantity: string;
  allocation_strategy: string;
  allocation_note: string;
};

type ConflictResolutionAction = 'allocate_remaining' | 'release_open' | 'cancel_reservation';

type ExpireDueReservationsResult = {
  scanned_count: number;
  expired_count: number;
  failed_count: number;
};

type ReservationDraft = {
  source_type: string;
  source_id: string;
  requesting_department: string;
  target_department: string;
  priority: string;
  needed_by: string;
  expires_at: string;
  notes: string;
  items: ReservationDraftLine[];
};

const pageStyles: Record<string, React.CSSProperties> = {
  page: { display: 'grid', gap: '1rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' },
  card: { border: '1px solid #d9e2ec', borderRadius: '14px', padding: '1rem', background: '#fff', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' },
  sectionTitle: { margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 },
  muted: { color: '#64748b', fontSize: '0.875rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: { textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid #e2e8f0', color: '#475569' },
  td: { padding: '0.6rem', borderBottom: '1px solid #eef2f7', verticalAlign: 'top' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' },
  label: { display: 'grid', gap: '0.25rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 },
  input: { border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.55rem 0.65rem', font: 'inherit' },
  buttonRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  button: { border: '0', borderRadius: '999px', padding: '0.55rem 0.8rem', background: '#0f172a', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: '999px', padding: '0.5rem 0.75rem', background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  dangerButton: { border: '0', borderRadius: '999px', padding: '0.55rem 0.8rem', background: '#991b1b', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  pill: { display: 'inline-flex', borderRadius: '999px', padding: '0.2rem 0.55rem', background: '#e2e8f0', color: '#0f172a', fontSize: '0.75rem', fontWeight: 700 },
  error: { border: '1px solid #fecaca', borderRadius: '12px', padding: '0.75rem', color: '#991b1b', background: '#fef2f2' },
  success: { border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.75rem', color: '#166534', background: '#f0fdf4' }
};

const defaultFilters: Filters = { status: '', sourceType: '', sourceId: '', requestingDepartment: '', targetDepartment: '', priority: '', search: '' };

const emptyLine = (): ReservationDraftLine => ({
  product_id: '',
  storage_location_id: '',
  requested_quantity: '',
  allocation_strategy: 'specific_location',
  allocation_note: ''
});

const defaultDraft = (): ReservationDraft => ({
  source_type: 'manual',
  source_id: '',
  requesting_department: '',
  target_department: '',
  priority: 'normal',
  needed_by: '',
  expires_at: '',
  notes: '',
  items: [emptyLine()]
});

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number | string | null | undefined): string {
  return toNumber(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}


function formatAuditMetadata(metadata?: Record<string, unknown> | null): string {
  if (!metadata || !Object.keys(metadata).length) return '—';
  try {
    return JSON.stringify(metadata);
  } catch {
    return 'Metadata unavailable';
  }
}

function getReservationSourceIdForPayload(draft: ReservationDraft): string | undefined {
  if (draft.source_type === 'manual') return undefined;
  const value = draft.source_id.trim();
  return value || undefined;
}


function getReservationActionState(reservation: InventoryReservation) {
  const status = String(reservation.status || '').toLowerCase();
  const requestedQuantity = toNumber(reservation.requested_quantity_total);
  const reservedQuantity = toNumber(reservation.reserved_quantity_total);
  const fulfilledQuantity = toNumber(reservation.fulfilled_quantity_total);
  const releasedQuantity = toNumber(reservation.released_quantity_total);
  const openReservedQuantity = toNumber(reservation.open_reserved_quantity_total);
  const remainingRequestedQuantity = Math.max(requestedQuantity - reservedQuantity - fulfilledQuantity - releasedQuantity, 0);

  const isDraft = status === 'draft';
  const isActive = status === 'active';
  const isPartiallyAllocated = status === 'partially_allocated';
  const isAllocated = status === 'allocated';
  const isPartiallyFulfilled = status === 'partially_fulfilled';
  const isClosed = ['fulfilled', 'released', 'expired', 'cancelled'].includes(status);

  return {
    canActivate: isDraft,
    canAllocate: !isClosed && (isActive || isPartiallyAllocated) && remainingRequestedQuantity > 0,
    canFulfill: (isAllocated || isPartiallyFulfilled) && openReservedQuantity > 0,
    canRelease: !isClosed && !isDraft && openReservedQuantity > 0,
    canExpire: !isClosed && !isDraft,
    canCancel: isDraft || isActive || isPartiallyAllocated || isAllocated
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown request failure.';
}

function buildReservationQuery(filters: Filters, limit = '100'): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.sourceType) params.set('source_type', filters.sourceType);
  if (filters.sourceId.trim()) params.set('source_id', filters.sourceId.trim());
  if (filters.requestingDepartment.trim()) params.set('requesting_department', filters.requestingDepartment.trim());
  if (filters.targetDepartment.trim()) params.set('target_department', filters.targetDepartment.trim());
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  params.set('limit', limit);
  return `/inventory-reservations?${params.toString()}`;
}


function normalizeProductsResponse(response: ProductListResponse): ProductItem[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.products)) return response.products;
  if (Array.isArray(response.rows)) return response.rows;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.products)) return response.data.products;
    if (Array.isArray(response.data.rows)) return response.data.rows;
  }
  return [];
}

function normalizeStorageLocationsResponse(response: StorageLocationListResponse): StorageLocationOption[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.storage_locations)) return response.storage_locations;
  if (Array.isArray(response.storageLocations)) return response.storageLocations;
  if (Array.isArray(response.locations)) return response.locations;
  if (Array.isArray(response.rows)) return response.rows;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.storage_locations)) return response.data.storage_locations;
    if (Array.isArray(response.data.storageLocations)) return response.data.storageLocations;
    if (Array.isArray(response.data.locations)) return response.data.locations;
    if (Array.isArray(response.data.rows)) return response.data.rows;
  }
  return [];
}

async function fetchProductsForReservationOptions(): Promise<ProductItem[]> {
  const response = await apiRequest<ProductListResponse>('/products?limit=500');
  return normalizeProductsResponse(response);
}

async function fetchStorageLocationsForReservationOptions(): Promise<StorageLocationOption[]> {
  const response = await apiRequest<StorageLocationListResponse>('/storage-locations?limit=500');
  return normalizeStorageLocationsResponse(response);
}

function getSelectedProductLabel(product?: ProductItem): string {
  if (!product) return '';
  const unit = product.unit ? ` (${product.unit})` : '';
  const barcode = product.barcode ? ` · ${product.barcode}` : '';
  return `${product.name}${unit}${barcode}`;
}

function getSelectedLocationLabel(location?: StorageLocationOption): string {
  if (!location) return '';
  const zone = location.temperature_zone ? ` · ${location.temperature_zone}` : '';
  return `${location.name}${zone}`;
}

async function fetchReservations(filters: Filters): Promise<InventoryReservation[]> {
  return apiRequest<InventoryReservation[]>(buildReservationQuery(filters));
}

function buildReservationExportPath(filters: Filters): string {
  const query = buildReservationQuery(filters, '5000').replace('/inventory-reservations?', '');
  return `/inventory-reservations/export.csv?${query}`;
}

async function downloadReservationCsv(filters: Filters): Promise<void> {
  const csv = await apiRequest<string>(buildReservationExportPath(filters), {
    headers: { Accept: 'text/csv' }
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `inventory-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function fetchReservationSummary(): Promise<ReservationSummary> {
  return apiRequest<ReservationSummary>('/inventory-reservations/summary');
}

async function fetchReservationSourceSummary(filters: Filters): Promise<ReservationSourceSummaryRow[]> {
  const params = new URLSearchParams();
  if (filters.sourceType) params.set('source_type', filters.sourceType);
  if (filters.sourceId.trim()) params.set('source_id', filters.sourceId.trim());
  if (filters.requestingDepartment.trim()) params.set('requesting_department', filters.requestingDepartment.trim());
  if (filters.targetDepartment.trim()) params.set('target_department', filters.targetDepartment.trim());
  const query = params.toString();
  return apiRequest<ReservationSourceSummaryRow[]>(`/inventory-reservations/source-summary${query ? `?${query}` : ''}`);
}

async function fetchProjectedFreeStock(): Promise<ProjectedFreeStockRow[]> {
  return apiRequest<ProjectedFreeStockRow[]>('/inventory-reservations/projected-free-stock');
}

async function fetchReservationConflicts(): Promise<ReservationConflict[]> {
  return apiRequest<ReservationConflict[]>('/inventory-reservations/conflicts?limit=50');
}

async function fetchReservationDetail(id: string): Promise<InventoryReservation> {
  return apiRequest<InventoryReservation>(`/inventory-reservations/${id}`);
}

async function fetchReservationAuditTrail(id: string): Promise<ReservationAuditEvent[]> {
  return apiRequest<ReservationAuditEvent[]>(`/inventory-reservations/${id}/audit?limit=100`);
}


function toDatetimeLocalValue(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function buildDraftFromReservation(reservation: InventoryReservation): ReservationDraft {
  const items = (reservation.items || []).map((item) => ({
    product_id: item.product_id || '',
    storage_location_id: item.storage_location_id || '',
    requested_quantity: String(item.requested_quantity ?? ''),
    allocation_strategy: item.allocation_strategy || 'specific_location',
    allocation_note: item.allocation_note || ''
  }));

  return {
    source_type: reservation.source_type || 'manual',
    source_id: reservation.source_id || '',
    requesting_department: reservation.requesting_department || '',
    target_department: reservation.target_department || '',
    priority: reservation.priority || 'normal',
    needed_by: toDatetimeLocalValue(reservation.needed_by),
    expires_at: toDatetimeLocalValue(reservation.expires_at),
    notes: reservation.notes || '',
    items: items.length ? items : [emptyLine()]
  };
}

function getValidReservationLines(draft: ReservationDraft): ReservationDraftLine[] {
  return draft.items.filter((item) => item.product_id.trim() && item.requested_quantity.trim());
}

function buildCreatePayload(draft: ReservationDraft) {
  return {
    source_type: draft.source_type,
    source_id: getReservationSourceIdForPayload(draft),
    requesting_department: draft.requesting_department.trim() || undefined,
    target_department: draft.target_department.trim() || undefined,
    priority: draft.priority,
    needed_by: draft.needed_by || undefined,
    expires_at: draft.expires_at || undefined,
    notes: draft.notes.trim() || undefined,
    items: getValidReservationLines(draft)
      .map((item) => ({
        product_id: item.product_id.trim(),
        storage_location_id: item.storage_location_id.trim() || undefined,
        requested_quantity: Number(item.requested_quantity),
        allocation_strategy: item.allocation_strategy,
        allocation_note: item.allocation_note.trim() || undefined
      }))
  };
}

export default function InventoryReservationsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const permissions = getRoleCapabilities();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const [draft, setDraft] = useState<ReservationDraft>(defaultDraft);
  const [editDraft, setEditDraft] = useState<ReservationDraft | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const reservationIdFromUrl = searchParams.get('reservationId') || searchParams.get('reservation_id') || '';
    if (reservationIdFromUrl && reservationIdFromUrl !== selectedReservationId) {
      setSelectedReservationId(reservationIdFromUrl);
    }
  }, [searchParams, selectedReservationId]);

  const validDraftLineCount = getValidReservationLines(draft).length;
  const validEditDraftLineCount = editDraft ? getValidReservationLines(editDraft).length : 0;

  const handleSelectReservation = (reservationId: string) => {
    setSelectedReservationId(reservationId);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('reservationId', reservationId);
      next.delete('reservation_id');
      return next;
    });
  };

  const productsQuery = useQuery({
    queryKey: ['products', 'reservation-options'],
    queryFn: fetchProductsForReservationOptions
  });

  const locationsQuery = useQuery({
    queryKey: ['storage-locations', 'reservation-options'],
    queryFn: fetchStorageLocationsForReservationOptions
  });

  const productById = useMemo(() => {
    const map = new Map<string, ProductItem>();
    (productsQuery.data || []).forEach((product) => map.set(product.id, product));
    return map;
  }, [productsQuery.data]);

  const locationById = useMemo(() => {
    const map = new Map<string, StorageLocationOption>();
    (locationsQuery.data || []).forEach((location) => map.set(location.id, location));
    return map;
  }, [locationsQuery.data]);

  const reservationsQuery = useQuery({
    queryKey: ['inventory-reservations', filters],
    queryFn: () => fetchReservations(filters)
  });

  const summaryQuery = useQuery({
    queryKey: ['inventory-reservations-summary'],
    queryFn: fetchReservationSummary
  });

  const sourceSummaryQuery = useQuery({
    queryKey: ['inventory-reservations-source-summary', filters.sourceType, filters.sourceId, filters.requestingDepartment, filters.targetDepartment],
    queryFn: () => fetchReservationSourceSummary(filters)
  });

  const projectedFreeStockQuery = useQuery({
    queryKey: ['inventory-reservations-projected-free-stock'],
    queryFn: fetchProjectedFreeStock
  });

  const conflictsQuery = useQuery({
    queryKey: ['inventory-reservation-conflicts'],
    queryFn: fetchReservationConflicts
  });

  const detailQuery = useQuery({
    queryKey: ['inventory-reservation-detail', selectedReservationId],
    queryFn: () => fetchReservationDetail(selectedReservationId),
    enabled: Boolean(selectedReservationId)
  });

  const auditTrailQuery = useQuery({
    queryKey: ['inventory-reservation-audit', selectedReservationId],
    queryFn: () => fetchReservationAuditTrail(selectedReservationId),
    enabled: Boolean(selectedReservationId)
  });

  const refreshReservationQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['inventory-reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory-reservations-summary'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory-reservations-source-summary'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory-reservations-projected-free-stock'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory-reservation-conflicts'] });
    if (selectedReservationId) {
      void queryClient.invalidateQueries({ queryKey: ['inventory-reservation-detail', selectedReservationId] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-reservation-audit', selectedReservationId] });
    }
  };

  const updateDraftMutation = useMutation({
    mutationFn: async ({ id, draft: payloadDraft }: { id: string; draft: ReservationDraft }) => apiMutationRequest<InventoryReservation>(`/inventory-reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCreatePayload(payloadDraft))
    }),
    onSuccess: (reservation) => {
      setFeedback(`Updated draft ${reservation.reservation_number}.`);
      setEditDraft(null);
      handleSelectReservation(reservation.id);
      refreshReservationQueries();
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => apiMutationRequest<InventoryReservation>('/inventory-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCreatePayload(draft))
    }),
    onSuccess: (reservation) => {
      setFeedback(`Created ${reservation.reservation_number}.`);
      setDraft(defaultDraft());
      handleSelectReservation(reservation.id);
      refreshReservationQueries();
    }
  });

  const conflictResolutionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: ConflictResolutionAction }) => apiMutationRequest<InventoryReservation>(`/inventory-reservations/${id}/resolve-conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        allow_partial: true,
        release_unallocated: true,
        resolution_note: actionNote || 'Resolved from allocation conflict queue.'
      })
    }),
    onSuccess: (reservation) => {
      setFeedback(`Resolved conflict for ${reservation.reservation_number}; status is now ${reservation.status}.`);
      setActionNote('');
      refreshReservationQueries();
    }
  });

  const expireDueMutation = useMutation({
    mutationFn: async () => apiMutationRequest<ExpireDueReservationsResult>('/inventory-reservations/expire-due', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiration_note: actionNote || 'Expired from reservation workspace due-run.', limit: 100 })
    }),
    onSuccess: (result) => {
      setFeedback(`Expired ${result.expired_count} due reservations; scanned ${result.scanned_count}${result.failed_count ? `, failed ${result.failed_count}` : ''}.`);
      setActionNote('');
      refreshReservationQueries();
    }
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'activate' | 'allocate' | 'release' | 'cancel' | 'expire' | 'fulfill' }) => {
      const body: Record<string, unknown> = {};
      if (action === 'allocate') body.allow_partial = true;
      if (action === 'release') body.release_note = actionNote || 'Released from reservation workspace.';
      if (action === 'cancel') body.cancellation_reason = actionNote || 'Cancelled from reservation workspace.';
      if (action === 'expire') body.expiration_note = actionNote || 'Expired from reservation workspace.';
      if (action === 'fulfill') body.fulfill_all_reserved = true;

      return apiMutationRequest<InventoryReservation>(`/inventory-reservations/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    },
    onSuccess: (reservation) => {
      setFeedback(`Updated ${reservation.reservation_number} to ${reservation.status}.`);
      setActionNote('');
      refreshReservationQueries();
    }
  });

  const reservations = reservationsQuery.data || [];
  const selectedReservation = detailQuery.data;
  const summaryCards = useMemo(() => {
    const summary = summaryQuery.data;
    return [
      ['Active', summary?.active_reservations ?? 0],
      ['Draft', summary?.draft_reservations ?? 0],
      ['Expired', summary?.expired_reservations ?? 0],
      ['Expiration attention', summary?.expiration_attention_count ?? 0],
      ['Open reserved qty', summary?.open_reserved_quantity_total ?? 0]
    ];
  }, [summaryQuery.data]);

  const latestError = createMutation.error || updateDraftMutation.error || actionMutation.error || expireDueMutation.error || conflictResolutionMutation.error || productsQuery.error || locationsQuery.error || reservationsQuery.error || summaryQuery.error || sourceSummaryQuery.error || projectedFreeStockQuery.error || conflictsQuery.error || detailQuery.error || auditTrailQuery.error;

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await downloadReservationCsv(filters);
      setFeedback('Reservation CSV export generated.');
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const updateDraftLine = (index: number, patch: Partial<ReservationDraftLine>) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  };

  const updateEditDraftLine = (index: number, patch: Partial<ReservationDraftLine>) => {
    setEditDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
      };
    });
  };

  return (
    <div style={pageStyles.page}>
      <section style={pageStyles.grid} aria-label="Reservation summary">
        {summaryCards.map(([label, value]) => (
          <article key={String(label)} style={pageStyles.card}>
            <p style={pageStyles.muted}>{label}</p>
            <strong style={{ fontSize: '1.6rem' }}>{formatNumber(value)}</strong>
          </article>
        ))}
      </section>

      {feedback ? <div style={pageStyles.success}>{feedback}</div> : null}
      {latestError ? <div style={pageStyles.error}>{getErrorMessage(latestError)}</div> : null}

      {permissions.canCreateInventoryReservations ? (
        <section style={pageStyles.card}>
          <h2 style={pageStyles.sectionTitle}>Create draft reservation</h2>
          <div style={pageStyles.formGrid}>
            <label style={pageStyles.label}>Source type
              <select style={pageStyles.input} value={draft.source_type} onChange={(event) => setDraft({ ...draft, source_type: event.target.value, source_id: event.target.value === 'manual' ? '' : draft.source_id })}>
                <option value="manual">Manual</option>
                <option value="requisition">Requisition</option>
                <option value="event">Event</option>
                <option value="department">Department</option>
                <option value="procurement_inbound">Procurement inbound</option>
                <option value="forecast">Forecast</option>
              </select>
            </label>
            {draft.source_type !== 'manual' ? (
              <label style={pageStyles.label}>Source ID
                <input style={pageStyles.input} value={draft.source_id} onChange={(event) => setDraft({ ...draft, source_id: event.target.value })} placeholder="Required UUID for linked source" />
              </label>
            ) : null}
            <label style={pageStyles.label}>Requesting department
              <input style={pageStyles.input} value={draft.requesting_department} onChange={(event) => setDraft({ ...draft, requesting_department: event.target.value })} />
            </label>
            <label style={pageStyles.label}>Target department
              <input style={pageStyles.input} value={draft.target_department} onChange={(event) => setDraft({ ...draft, target_department: event.target.value })} />
            </label>
            <label style={pageStyles.label}>Priority
              <select style={pageStyles.input} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label style={pageStyles.label}>Needed by
              <input type="datetime-local" style={pageStyles.input} value={draft.needed_by} onChange={(event) => setDraft({ ...draft, needed_by: event.target.value })} />
            </label>
            <label style={pageStyles.label}>Expires at
              <input type="datetime-local" style={pageStyles.input} value={draft.expires_at} onChange={(event) => setDraft({ ...draft, expires_at: event.target.value })} />
            </label>
            <label style={pageStyles.label}>Notes
              <input style={pageStyles.input} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </label>
          </div>

          <h3 style={{ ...pageStyles.sectionTitle, marginTop: '1rem' }}>Lines</h3>
          <div style={pageStyles.tableWrap}>
            <table style={pageStyles.table}>
              <thead>
                <tr><th style={pageStyles.th}>Product</th><th style={pageStyles.th}>Storage location</th><th style={pageStyles.th}>Quantity</th><th style={pageStyles.th}>Strategy</th><th style={pageStyles.th}>Note</th><th style={pageStyles.th}></th></tr>
              </thead>
              <tbody>
                {draft.items.map((item, index) => (
                  <tr key={index}>
                    <td style={pageStyles.td}>
                      <select style={pageStyles.input} value={item.product_id} onChange={(event) => updateDraftLine(index, { product_id: event.target.value })}>
                        <option value="">{productsQuery.isLoading ? 'Loading products…' : 'Select product'}</option>
                        {(productsQuery.data || []).map((product) => (
                          <option key={product.id} value={product.id}>{getSelectedProductLabel(product)}</option>
                        ))}
                      </select>
                    </td>
                    <td style={pageStyles.td}>
                      <select style={pageStyles.input} value={item.storage_location_id} onChange={(event) => updateDraftLine(index, { storage_location_id: event.target.value })}>
                        <option value="">{locationsQuery.isLoading ? 'Loading locations…' : 'Any / choose during allocation'}</option>
                        {(locationsQuery.data || []).map((location) => (
                          <option key={location.id} value={location.id}>{getSelectedLocationLabel(location)}</option>
                        ))}
                      </select>
                    </td>
                    <td style={pageStyles.td}><input type="number" min="0" step="0.01" style={pageStyles.input} value={item.requested_quantity} onChange={(event) => updateDraftLine(index, { requested_quantity: event.target.value })} /></td>
                    <td style={pageStyles.td}>
                      <select style={pageStyles.input} value={item.allocation_strategy} onChange={(event) => updateDraftLine(index, { allocation_strategy: event.target.value })}>
                        <option value="specific_location">Specific location</option>
                        <option value="any_location">Any location</option>
                        <option value="inbound">Inbound</option>
                      </select>
                    </td>
                    <td style={pageStyles.td}><input style={pageStyles.input} value={item.allocation_note} onChange={(event) => updateDraftLine(index, { allocation_note: event.target.value })} /></td>
                    <td style={pageStyles.td}>
                      <button type="button" style={pageStyles.secondaryButton} onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) || [emptyLine()] }))}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...pageStyles.buttonRow, marginTop: '0.75rem' }}>
            <button type="button" style={pageStyles.secondaryButton} onClick={() => setDraft((current) => ({ ...current, items: [...current.items, emptyLine()] }))}>Add line</button>
            <button type="button" style={pageStyles.button} disabled={createMutation.isPending || validDraftLineCount === 0} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Creating…' : 'Create draft reservation'}
            </button>
            {validDraftLineCount === 0 ? <span style={pageStyles.muted}>Add at least one product line with a quantity before creating a draft.</span> : null}
          </div>
        </section>
      ) : null}

      <section style={pageStyles.card}>
        <h2 style={pageStyles.sectionTitle}>Reservation queue</h2>
        <div style={pageStyles.formGrid}>
          <label style={pageStyles.label}>Status
            <select style={pageStyles.input} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="partially_allocated">Partially allocated</option>
              <option value="allocated">Allocated</option>
              <option value="partially_fulfilled">Partially fulfilled</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="released">Released</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label style={pageStyles.label}>Source type
            <select style={pageStyles.input} value={filters.sourceType} onChange={(event) => setFilters({ ...filters, sourceType: event.target.value })}>
              <option value="">All</option>
              <option value="manual">Manual</option>
              <option value="requisition">Requisition</option>
              <option value="event">Event</option>
              <option value="department">Department</option>
              <option value="procurement_inbound">Procurement inbound</option>
              <option value="forecast">Forecast</option>
            </select>
          </label>
          <label style={pageStyles.label}>Source ID
            <input style={pageStyles.input} value={filters.sourceId} onChange={(event) => setFilters({ ...filters, sourceId: event.target.value })} />
          </label>
          <label style={pageStyles.label}>Requesting department
            <input style={pageStyles.input} value={filters.requestingDepartment} onChange={(event) => setFilters({ ...filters, requestingDepartment: event.target.value })} />
          </label>
          <label style={pageStyles.label}>Target department
            <input style={pageStyles.input} value={filters.targetDepartment} onChange={(event) => setFilters({ ...filters, targetDepartment: event.target.value })} />
          </label>
          <label style={pageStyles.label}>Priority
            <select style={pageStyles.input} value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label style={pageStyles.label}>Search
            <input style={pageStyles.input} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          </label>
        </div>

        <div style={{ ...pageStyles.buttonRow, marginTop: '0.75rem' }}>
          <button type="button" style={pageStyles.secondaryButton} disabled={isExporting} onClick={handleExportCsv}>
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {permissions.canExpireInventoryReservations ? (
            <button type="button" style={pageStyles.secondaryButton} disabled={expireDueMutation.isPending} onClick={() => expireDueMutation.mutate()}>
              {expireDueMutation.isPending ? 'Expiring due…' : 'Expire due reservations'}
            </button>
          ) : null}
        </div>

        <div style={{ ...pageStyles.tableWrap, marginTop: '0.75rem' }}>
          <table style={pageStyles.table}>
            <thead>
              <tr><th style={pageStyles.th}>Reservation</th><th style={pageStyles.th}>Status</th><th style={pageStyles.th}>Source</th><th style={pageStyles.th}>Priority</th><th style={pageStyles.th}>Needed</th><th style={pageStyles.th}>Reserved</th><th style={pageStyles.th}></th></tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td style={pageStyles.td}><strong>{reservation.reservation_number}</strong><br /><span style={pageStyles.muted}>{reservation.requesting_department || 'No department'}</span></td>
                  <td style={pageStyles.td}><span style={pageStyles.pill}>{reservation.status}</span></td>
                  <td style={pageStyles.td}>{reservation.source_type || '—'}{reservation.source_id ? <><br /><span style={pageStyles.muted}>{reservation.source_id}</span></> : null}</td>
                  <td style={pageStyles.td}>{reservation.priority || 'normal'}</td>
                  <td style={pageStyles.td}>{formatDate(reservation.needed_by)}</td>
                  <td style={pageStyles.td}>{formatNumber(reservation.open_reserved_quantity_total)}</td>
                  <td style={pageStyles.td}><button type="button" style={pageStyles.secondaryButton} onClick={() => handleSelectReservation(reservation.id)}>Open</button></td>
                </tr>
              ))}
              {!reservations.length ? <tr><td style={pageStyles.td} colSpan={7}>{reservationsQuery.isLoading ? 'Loading reservations…' : 'No reservations match these filters.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={pageStyles.card}>
        <h2 style={pageStyles.sectionTitle}>Reservation detail</h2>
        {!selectedReservationId ? <p style={pageStyles.muted}>Open a reservation to inspect lines and run lifecycle actions.</p> : null}
        {selectedReservation ? (
          <div style={pageStyles.page}>
            <div style={pageStyles.buttonRow}>
              <strong>{selectedReservation.reservation_number}</strong>
              <span style={pageStyles.pill}>{selectedReservation.status}</span>
              <span style={pageStyles.muted}>Open reserved: {formatNumber(selectedReservation.open_reserved_quantity_total)}</span>
              {permissions.canCreateInventoryReservations && selectedReservation.status === 'draft' && !editDraft ? (
                <button type="button" style={pageStyles.secondaryButton} onClick={() => setEditDraft(buildDraftFromReservation(selectedReservation))}>Edit draft</button>
              ) : null}
            </div>
            <label style={pageStyles.label}>Lifecycle note
              <input style={pageStyles.input} value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Reason for release, cancel, or expiration" />
            </label>
            {(() => {
              const actionState = getReservationActionState(selectedReservation);
              const hasVisibleAction =
                (permissions.canAllocateInventoryReservations && actionState.canActivate) ||
                (permissions.canAllocateInventoryReservations && actionState.canAllocate) ||
                (permissions.canFulfillInventoryReservations && actionState.canFulfill) ||
                (permissions.canReleaseInventoryReservations && actionState.canRelease) ||
                (permissions.canExpireInventoryReservations && actionState.canExpire) ||
                (permissions.canCancelInventoryReservations && actionState.canCancel);

              if (!hasVisibleAction) {
                return <p style={pageStyles.muted}>No lifecycle actions are currently available for this reservation.</p>;
              }

              return (
                <div style={pageStyles.buttonRow}>
                  {permissions.canAllocateInventoryReservations && actionState.canActivate ? <button type="button" style={pageStyles.button} disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: selectedReservation.id, action: 'activate' })}>Activate</button> : null}
                  {permissions.canAllocateInventoryReservations && actionState.canAllocate ? <button type="button" style={pageStyles.button} disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: selectedReservation.id, action: 'allocate' })}>Allocate</button> : null}
                  {permissions.canFulfillInventoryReservations && actionState.canFulfill ? <button type="button" style={pageStyles.button} disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: selectedReservation.id, action: 'fulfill' })}>Fulfill all reserved</button> : null}
                  {permissions.canReleaseInventoryReservations && actionState.canRelease ? <button type="button" style={pageStyles.secondaryButton} disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: selectedReservation.id, action: 'release' })}>Release</button> : null}
                  {permissions.canExpireInventoryReservations && actionState.canExpire ? <button type="button" style={pageStyles.secondaryButton} disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: selectedReservation.id, action: 'expire' })}>Expire</button> : null}
                  {permissions.canCancelInventoryReservations && actionState.canCancel ? <button type="button" style={pageStyles.dangerButton} disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: selectedReservation.id, action: 'cancel' })}>Cancel</button> : null}
                </div>
              );
            })()}
            {editDraft && selectedReservation.status === 'draft' ? (
              <div style={pageStyles.card}>
                <h3 style={pageStyles.sectionTitle}>Edit draft reservation</h3>
                <div style={pageStyles.formGrid}>
                  <label style={pageStyles.label}>Source type
                    <select style={pageStyles.input} value={editDraft.source_type} onChange={(event) => setEditDraft({ ...editDraft, source_type: event.target.value, source_id: event.target.value === 'manual' ? '' : editDraft.source_id })}>
                      <option value="manual">Manual</option>
                      <option value="requisition">Requisition</option>
                      <option value="event">Event</option>
                      <option value="department">Department</option>
                      <option value="procurement_inbound">Procurement inbound</option>
                      <option value="forecast">Forecast</option>
                    </select>
                  </label>
                  {editDraft.source_type !== 'manual' ? (
                    <label style={pageStyles.label}>Source ID
                      <input style={pageStyles.input} value={editDraft.source_id} onChange={(event) => setEditDraft({ ...editDraft, source_id: event.target.value })} placeholder="Required UUID for linked source" />
                    </label>
                  ) : null}
                  <label style={pageStyles.label}>Requesting department
                    <input style={pageStyles.input} value={editDraft.requesting_department} onChange={(event) => setEditDraft({ ...editDraft, requesting_department: event.target.value })} />
                  </label>
                  <label style={pageStyles.label}>Target department
                    <input style={pageStyles.input} value={editDraft.target_department} onChange={(event) => setEditDraft({ ...editDraft, target_department: event.target.value })} />
                  </label>
                  <label style={pageStyles.label}>Priority
                    <select style={pageStyles.input} value={editDraft.priority} onChange={(event) => setEditDraft({ ...editDraft, priority: event.target.value })}>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                  <label style={pageStyles.label}>Needed by
                    <input type="datetime-local" style={pageStyles.input} value={editDraft.needed_by} onChange={(event) => setEditDraft({ ...editDraft, needed_by: event.target.value })} />
                  </label>
                  <label style={pageStyles.label}>Expires at
                    <input type="datetime-local" style={pageStyles.input} value={editDraft.expires_at} onChange={(event) => setEditDraft({ ...editDraft, expires_at: event.target.value })} />
                  </label>
                  <label style={pageStyles.label}>Notes
                    <input style={pageStyles.input} value={editDraft.notes} onChange={(event) => setEditDraft({ ...editDraft, notes: event.target.value })} />
                  </label>
                </div>
                <div style={{ ...pageStyles.tableWrap, marginTop: '0.75rem' }}>
                  <table style={pageStyles.table}>
                    <thead><tr><th style={pageStyles.th}>Product</th><th style={pageStyles.th}>Storage location</th><th style={pageStyles.th}>Quantity</th><th style={pageStyles.th}>Strategy</th><th style={pageStyles.th}>Note</th><th style={pageStyles.th}></th></tr></thead>
                    <tbody>
                      {editDraft.items.map((item, index) => (
                        <tr key={index}>
                          <td style={pageStyles.td}>
                            <select style={pageStyles.input} value={item.product_id} onChange={(event) => updateEditDraftLine(index, { product_id: event.target.value })}>
                              <option value="">{productsQuery.isLoading ? 'Loading products…' : 'Select product'}</option>
                              {(productsQuery.data || []).map((product) => (
                                <option key={product.id} value={product.id}>{getSelectedProductLabel(product)}</option>
                              ))}
                            </select>
                            {item.product_id && !productById.has(item.product_id) ? <p style={pageStyles.muted}>Current product ID: {item.product_id}</p> : null}
                          </td>
                          <td style={pageStyles.td}>
                            <select style={pageStyles.input} value={item.storage_location_id} onChange={(event) => updateEditDraftLine(index, { storage_location_id: event.target.value })}>
                              <option value="">{locationsQuery.isLoading ? 'Loading locations…' : 'Any / choose during allocation'}</option>
                              {(locationsQuery.data || []).map((location) => (
                                <option key={location.id} value={location.id}>{getSelectedLocationLabel(location)}</option>
                              ))}
                            </select>
                            {item.storage_location_id && !locationById.has(item.storage_location_id) ? <p style={pageStyles.muted}>Current location ID: {item.storage_location_id}</p> : null}
                          </td>
                          <td style={pageStyles.td}><input type="number" min="0" step="0.01" style={pageStyles.input} value={item.requested_quantity} onChange={(event) => updateEditDraftLine(index, { requested_quantity: event.target.value })} /></td>
                          <td style={pageStyles.td}>
                            <select style={pageStyles.input} value={item.allocation_strategy} onChange={(event) => updateEditDraftLine(index, { allocation_strategy: event.target.value })}>
                              <option value="specific_location">Specific location</option>
                              <option value="any_location">Any location</option>
                              <option value="inbound">Inbound</option>
                            </select>
                          </td>
                          <td style={pageStyles.td}><input style={pageStyles.input} value={item.allocation_note} onChange={(event) => updateEditDraftLine(index, { allocation_note: event.target.value })} /></td>
                          <td style={pageStyles.td}><button type="button" style={pageStyles.secondaryButton} onClick={() => setEditDraft((current) => current ? { ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) } : current)}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ ...pageStyles.buttonRow, marginTop: '0.75rem' }}>
                  <button type="button" style={pageStyles.secondaryButton} onClick={() => setEditDraft((current) => current ? { ...current, items: [...current.items, emptyLine()] } : current)}>Add line</button>
                  <button type="button" style={pageStyles.button} disabled={updateDraftMutation.isPending || validEditDraftLineCount === 0} onClick={() => updateDraftMutation.mutate({ id: selectedReservation.id, draft: editDraft })}>
                    {updateDraftMutation.isPending ? 'Saving…' : 'Save draft changes'}
                  </button>
                  {validEditDraftLineCount === 0 ? <span style={pageStyles.muted}>Keep at least one product line with a quantity before saving draft changes.</span> : null}
                  <button type="button" style={pageStyles.secondaryButton} onClick={() => setEditDraft(null)}>Cancel edit</button>
                </div>
              </div>
            ) : null}

            <div style={pageStyles.tableWrap}>
              <table style={pageStyles.table}>
                <thead><tr><th style={pageStyles.th}>Product</th><th style={pageStyles.th}>Location</th><th style={pageStyles.th}>Requested</th><th style={pageStyles.th}>Reserved</th><th style={pageStyles.th}>Fulfilled</th><th style={pageStyles.th}>Released</th><th style={pageStyles.th}>Status</th></tr></thead>
                <tbody>
                  {(selectedReservation.items || []).map((item) => (
                    <tr key={item.id}>
                      <td style={pageStyles.td}>{item.product_name || item.product_id}</td>
                      <td style={pageStyles.td}>{item.storage_location_name || item.storage_location_id || '—'}</td>
                      <td style={pageStyles.td}>{formatNumber(item.requested_quantity)}</td>
                      <td style={pageStyles.td}>{formatNumber(item.reserved_quantity)}</td>
                      <td style={pageStyles.td}>{formatNumber(item.fulfilled_quantity)}</td>
                      <td style={pageStyles.td}>{formatNumber(item.released_quantity)}</td>
                      <td style={pageStyles.td}>{item.allocation_status || 'pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <h3 style={pageStyles.sectionTitle}>Reservation audit trail</h3>
              <div style={pageStyles.tableWrap}>
                <table style={pageStyles.table}>
                  <thead><tr><th style={pageStyles.th}>Time</th><th style={pageStyles.th}>Action</th><th style={pageStyles.th}>User</th><th style={pageStyles.th}>Metadata</th></tr></thead>
                  <tbody>
                    {(auditTrailQuery.data || []).map((event) => (
                      <tr key={event.id}>
                        <td style={pageStyles.td}>{formatDate(event.created_at)}</td>
                        <td style={pageStyles.td}><span style={pageStyles.pill}>{event.action}</span></td>
                        <td style={pageStyles.td}>{event.user_id || 'System/support'}</td>
                        <td style={pageStyles.td}><code style={{ whiteSpace: 'pre-wrap' }}>{formatAuditMetadata(event.metadata)}</code></td>
                      </tr>
                    ))}
                    {!auditTrailQuery.data?.length ? <tr><td style={pageStyles.td} colSpan={4}>{auditTrailQuery.isLoading ? 'Loading audit trail…' : 'No reservation audit events found.'}</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : selectedReservationId && detailQuery.isLoading ? <p>Loading reservation detail…</p> : null}
      </section>


      <section style={pageStyles.card}>
        <h2 style={pageStyles.sectionTitle}>Source / department reservation demand</h2>
        <p style={pageStyles.muted}>Groups reservation demand by source type, source ID, requesting department, and target department so event and department commitments are visible before conflicts appear.</p>
        <div style={pageStyles.tableWrap}>
          <table style={pageStyles.table}>
            <thead><tr><th style={pageStyles.th}>Source</th><th style={pageStyles.th}>Requesting → Target</th><th style={pageStyles.th}>Reservations</th><th style={pageStyles.th}>Active</th><th style={pageStyles.th}>Draft</th><th style={pageStyles.th}>Expiration attention</th><th style={pageStyles.th}>Requested</th><th style={pageStyles.th}>Open reserved</th></tr></thead>
            <tbody>
              {(sourceSummaryQuery.data || []).map((row) => (
                <tr key={`${row.source_type}-${row.source_id || 'none'}-${row.requesting_department || 'none'}-${row.target_department || 'none'}`}>
                  <td style={pageStyles.td}><strong>{row.source_type}</strong>{row.source_id ? <><br /><span style={pageStyles.muted}>{row.source_id}</span></> : null}</td>
                  <td style={pageStyles.td}>{row.requesting_department || 'Unassigned'} → {row.target_department || 'Unassigned'}</td>
                  <td style={pageStyles.td}>{formatNumber(row.reservation_count)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.active_reservation_count)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.draft_reservation_count)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.expiration_attention_count)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.requested_quantity_total)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.open_reserved_quantity_total)}</td>
                </tr>
              ))}
              {!sourceSummaryQuery.data?.length ? <tr><td style={pageStyles.td} colSpan={8}>{sourceSummaryQuery.isLoading ? 'Loading source demand…' : 'No source demand rows yet.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={pageStyles.card}>
        <h2 style={pageStyles.sectionTitle}>Allocation conflict queue</h2>
        <p style={pageStyles.muted}>Shows active reservation lines where remaining demand or open reservations exceed projected free stock.</p>
        <div style={pageStyles.tableWrap}>
          <table style={pageStyles.table}>
            <thead><tr><th style={pageStyles.th}>Reservation</th><th style={pageStyles.th}>Product</th><th style={pageStyles.th}>Location</th><th style={pageStyles.th}>Reason</th><th style={pageStyles.th}>Remaining</th><th style={pageStyles.th}>Projected free</th><th style={pageStyles.th}>Conflict qty</th><th style={pageStyles.th}></th></tr></thead>
            <tbody>
              {(conflictsQuery.data || []).map((row) => (
                <tr key={row.reservation_item_id}>
                  <td style={pageStyles.td}><strong>{row.reservation_number}</strong><br /><span style={pageStyles.muted}>{row.priority || 'normal'} · {row.status}</span></td>
                  <td style={pageStyles.td}>{row.product_name || row.product_id}</td>
                  <td style={pageStyles.td}>{row.storage_location_name || row.storage_location_id || 'Any location'}</td>
                  <td style={pageStyles.td}><span style={pageStyles.pill}>{row.conflict_reason}</span></td>
                  <td style={pageStyles.td}>{formatNumber(row.remaining_to_allocate)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.projected_free_quantity)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.conflict_quantity)}</td>
                  <td style={pageStyles.td}>
                    <div style={pageStyles.buttonRow}>
                      <button type="button" style={pageStyles.secondaryButton} onClick={() => handleSelectReservation(row.reservation_id)}>Open</button>
                      {permissions.canAllocateInventoryReservations ? <button type="button" style={pageStyles.button} disabled={conflictResolutionMutation.isPending} onClick={() => conflictResolutionMutation.mutate({ id: row.reservation_id, action: 'allocate_remaining' })}>Allocate</button> : null}
                      {permissions.canReleaseInventoryReservations ? <button type="button" style={pageStyles.secondaryButton} disabled={conflictResolutionMutation.isPending} onClick={() => conflictResolutionMutation.mutate({ id: row.reservation_id, action: 'release_open' })}>Release</button> : null}
                      {permissions.canCancelInventoryReservations ? <button type="button" style={pageStyles.dangerButton} disabled={conflictResolutionMutation.isPending} onClick={() => conflictResolutionMutation.mutate({ id: row.reservation_id, action: 'cancel_reservation' })}>Cancel</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!conflictsQuery.data?.length ? <tr><td style={pageStyles.td} colSpan={8}>{conflictsQuery.isLoading ? 'Loading conflicts…' : 'No allocation conflicts detected.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={pageStyles.card}>
        <h2 style={pageStyles.sectionTitle}>Projected free stock</h2>
        <p style={pageStyles.muted}>Projected free = current stock minus open reserved quantity.</p>
        <div style={pageStyles.tableWrap}>
          <table style={pageStyles.table}>
            <thead><tr><th style={pageStyles.th}>Product</th><th style={pageStyles.th}>Location</th><th style={pageStyles.th}>On hand</th><th style={pageStyles.th}>Reserved</th><th style={pageStyles.th}>Projected free</th></tr></thead>
            <tbody>
              {(projectedFreeStockQuery.data || []).slice(0, 50).map((row) => (
                <tr key={`${row.product_id}-${row.storage_location_id || 'none'}`}>
                  <td style={pageStyles.td}>{productById.get(row.product_id)?.name || row.product_id}</td>
                  <td style={pageStyles.td}>{row.storage_location_id ? locationById.get(row.storage_location_id)?.name || row.storage_location_id : '—'}</td>
                  <td style={pageStyles.td}>{formatNumber(row.on_hand_quantity)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.reserved_quantity)}</td>
                  <td style={pageStyles.td}>{formatNumber(row.projected_free_quantity)}</td>
                </tr>
              ))}
              {!projectedFreeStockQuery.data?.length ? <tr><td style={pageStyles.td} colSpan={5}>{projectedFreeStockQuery.isLoading ? 'Loading projected free stock…' : 'No projected free stock rows yet.'}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
