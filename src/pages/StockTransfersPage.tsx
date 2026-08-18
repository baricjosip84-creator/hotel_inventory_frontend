import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError, getVersionConflictMessage, isVersionConflictError } from '../lib/api';
import { getCurrentAccessRoleLabel, getRoleCapabilities } from '../lib/permissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';

type StockTransferStatus = 'draft' | 'executed' | 'cancelled' | string;

type StockTransferListItem = {
  id: string;
  from_storage_location_id: string;
  from_storage_location_name: string;
  to_storage_location_id: string;
  to_storage_location_name: string;
  status: StockTransferStatus;
  notes?: string | null;
  cancellation_reason?: string | null;
  created_by_user_name?: string | null;
  executed_by_user_name?: string | null;
  cancelled_by_user_name?: string | null;
  created_at: string;
  executed_at?: string | null;
  cancelled_at?: string | null;
  version: number | string;
  item_count?: number | string;
  total_quantity?: number | string;
};

type StockTransferDetailItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  product_category?: string | null;
  quantity: number | string;
};

type StockTransferDetail = StockTransferListItem & {
  items: StockTransferDetailItem[];
};

type StockTransferMovement = {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  stock_transfer_id: string;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  movement_type?: string | null;
  change: number | string;
  reason?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;
};

type StockTransferAvailabilityItem = {
  product_id: string;
  product_name: string;
  product_unit: string;
  requested_quantity: number | string;
  on_hand_quantity: number | string;
  reserved_quantity: number | string;
  available_quantity: number | string;
  remaining_after_transfer: number | string;
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
};

type TransferOptionProduct = {
  id: string;
  name: string;
  unit?: string | null;
  category?: string | null;
  on_hand_quantity?: number | string | null;
  reserved_quantity?: number | string | null;
  available_quantity?: number | string | null;
  transferable?: boolean | null;
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
    items: [{ product_id: '', quantity: '' }]
  };
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 4 });
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
  return formatReadableText(movement.movement_type || movement.reason || 'Transfer movement');
}

function formatCancellationReason(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const trimmed = value.trim();
  return trimmed.includes('_') && !/\s/.test(trimmed) ? formatReadableText(trimmed) : trimmed;
}

function getDisplayNotes(transfer: Pick<StockTransferListItem, 'notes' | 'cancellation_reason'>): string | null {
  const notes = transfer.notes?.trim();
  if (!notes) return null;

  if (!transfer.cancellation_reason) return notes;
  const escapedReason = transfer.cancellation_reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffixPattern = new RegExp(`(?:\\r?\\n)?Cancelled:\\s*${escapedReason}\\s*$`, 'i');
  const cleaned = notes.replace(suffixPattern, '').trim();
  return cleaned || null;
}

function getStatusBadgeStyle(status: StockTransferStatus): CSSProperties {
  if (status === 'executed') return styles.executedBadge;
  if (status === 'cancelled') return styles.cancelledBadge;
  return styles.draftBadge;
}

function normalizeError(error: unknown, fallback: string): string {
  if (isVersionConflictError(error)) return getVersionConflictMessage(error);
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
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

async function fetchTransfers(filters: TransferFilters, limit: number, offset: number): Promise<StockTransferListItem[]> {
  const params = new URLSearchParams();
  appendTransferFilters(params, filters);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
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
        quantity: Number(item.quantity)
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
        quantity: Number(item.quantity)
      }))
    })
  });
}

async function executeTransfer(id: string): Promise<{ message: string; transfer: StockTransferDetail }> {
  return apiRequest<{ message: string; transfer: StockTransferDetail }>(`/stock-transfers/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function cancelTransfer(input: { id: string; reason?: string }): Promise<{ message: string; transfer: StockTransferDetail }> {
  return apiRequest<{ message: string; transfer: StockTransferDetail }>(`/stock-transfers/${input.id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: input.reason?.trim() || null })
  });
}

function StatCard(props: { title: string; value: number | string; subtitle: string; loading?: boolean }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={styles.statValue}>{props.loading ? '—' : formatNumber(props.value)}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function StockTransfersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailSectionRef = useRef<HTMLElement | null>(null);
  const {
    canCreateStockTransfers,
    canUpdateStockTransfers,
    canExecuteStockTransfers,
    canCancelStockTransfers
  } = getRoleCapabilities();
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

  const transferFilters = useMemo<TransferFilters>(() => ({
    status: statusFilter,
    search: debouncedSearch,
    fromStorageLocationId: fromLocationFilter,
    toStorageLocationId: toLocationFilter,
    productId: productFilter
  }), [statusFilter, debouncedSearch, fromLocationFilter, toLocationFilter, productFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, fromLocationFilter, toLocationFilter, productFilter]);

  useEffect(() => {
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

  const transferOptionsQuery = useQuery({
    queryKey: ['stock-transfer-options'],
    queryFn: () => fetchTransferOptions()
  });

  const sourceOptionsQuery = useQuery({
    queryKey: ['stock-transfer-options', form.from_storage_location_id],
    queryFn: () => fetchTransferOptions(form.from_storage_location_id),
    enabled: Boolean(form.from_storage_location_id)
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
    enabled: Boolean(selectedTransferId && transferDetailQuery.data?.status === 'draft')
  });

  const transfers = useMemo(() => transfersQuery.data ?? [], [transfersQuery.data]);
  const options = transferOptionsQuery.data;
  const locations = useMemo(() => options?.locations ?? [], [options]);
  const products = useMemo(() => options?.products ?? [], [options]);
  const sourceProducts = useMemo(
    () => sourceOptionsQuery.data?.products ?? products,
    [sourceOptionsQuery.data, products]
  );
  const sourceProductById = useMemo(
    () => new Map(sourceProducts.map((product) => [product.id, product])),
    [sourceProducts]
  );

  const summary = transferSummaryQuery.data ?? {
    transfer_count: 0,
    draft_count: 0,
    executed_count: 0,
    cancelled_count: 0,
    item_count: 0
  };
  const totalTransfers = Number(summary.transfer_count || 0);
  const totalPages = Math.max(Math.ceil(totalTransfers / pageSize), 1);
  const firstVisible = totalTransfers === 0 ? 0 : offset + 1;
  const lastVisible = Math.min(offset + transfers.length, totalTransfers);
  const selectedTransfer = transferDetailQuery.data;
  const selectedTransferMovements = transferMovementsQuery.data ?? [];
  const selectedTransferAvailability = transferAvailabilityQuery.data;
  const canWriteTransferForm = editingTransferId ? canUpdateStockTransfers : canCreateStockTransfers;
  const selectedVisible = selectedTransferId ? transfers.some((transfer) => transfer.id === selectedTransferId) : false;
  const hasActiveFilters = Boolean(
    statusFilter || searchInput.trim() || fromLocationFilter || toLocationFilter || productFilter
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const createMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: async (transfer) => {
      setForm(emptyTransferForm());
      setSelectedTransferId(transfer.id);
      setMessage('Stock transfer draft created successfully. Review the execution check before moving stock.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfers-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', transfer.id] })
      ]);
      window.setTimeout(() => detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, 'Failed to create stock transfer.'));
      setMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input, version }: { id: string; input: TransferFormState; version: number | string }) => updateTransfer(id, input, version),
    onSuccess: async (transfer) => {
      setEditingTransferId(null);
      setForm(emptyTransferForm());
      setSelectedTransferId(transfer.id);
      setMessage('Stock transfer draft updated successfully.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfers-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', transfer.id] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-availability', transfer.id] })
      ]);
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, 'Failed to update stock transfer.'));
      setMessage(null);
    }
  });

  const executeMutation = useMutation({
    mutationFn: executeTransfer,
    onSuccess: async (result) => {
      setSelectedTransferId(result.transfer.id);
      setMessage(result.message || 'Stock transfer executed successfully.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
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
      setError(normalizeError(mutationError, 'Failed to execute stock transfer.'));
      setMessage(null);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTransfer,
    onSuccess: async (result) => {
      setSelectedTransferId(result.transfer.id);
      setCancelReason('');
      setMessage(result.message || 'Stock transfer cancelled successfully.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfers-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', result.transfer.id] })
      ]);
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, 'Failed to cancel stock transfer.'));
      setMessage(null);
    }
  });

  const addItemRow = () => {
    setForm((current) => ({ ...current, items: [...current.items, { product_id: '', quantity: '' }] }));
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
        quantity: String(item.quantity)
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
    if (editingTransferId && !canUpdateStockTransfers) return 'Your current role cannot update stock transfer drafts.';
    if (!editingTransferId && !canCreateStockTransfers) return 'Your current role cannot create stock transfers.';
    if (!form.from_storage_location_id || !form.to_storage_location_id) return 'Select both source and destination storage locations.';
    if (form.from_storage_location_id === form.to_storage_location_id) return 'Source and destination storage locations must be different.';
    if (!form.items.length) return 'Add at least one product to the transfer.';

    const usedProducts = new Set<string>();
    for (const item of form.items) {
      if (!item.product_id) return 'Every transfer item must have a product.';
      if (usedProducts.has(item.product_id)) return 'A product can only appear once per transfer.';
      usedProducts.add(item.product_id);

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return 'Every transfer item quantity must be greater than zero.';

      const sourceProduct = sourceProductById.get(item.product_id);
      if (sourceProduct?.available_quantity !== null && sourceProduct?.available_quantity !== undefined) {
        const available = Number(sourceProduct.available_quantity || 0);
        if (quantity > available) {
          return `${sourceProduct.name} has ${formatNumber(available)} ${sourceProduct.unit || 'units'} of unreserved stock available at the source location.`;
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
        setError('Refresh the selected transfer before saving draft changes.');
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
        transferOptionsQuery.refetch()
      ];
      if (form.from_storage_location_id) tasks.push(sourceOptionsQuery.refetch());
      if (selectedTransferId) tasks.push(transferDetailQuery.refetch());
      if (selectedTransfer?.status === 'executed') tasks.push(transferMovementsQuery.refetch());
      if (selectedTransfer?.status === 'draft') tasks.push(transferAvailabilityQuery.refetch());
      await Promise.all(tasks);
      setMessage('Stock transfer information refreshed.');
    } catch (refreshError) {
      setError(normalizeError(refreshError, 'Failed to refresh stock transfers.'));
    }
  };

  const exportFilteredTransfersCsv = async () => {
    if (!totalTransfers || isExporting) return;
    setIsExporting(true);
    setError(null);
    setMessage(null);

    try {
      const allTransfers: StockTransferListItem[] = [];
      for (let exportOffset = 0; exportOffset < totalTransfers; exportOffset += EXPORT_BATCH_SIZE) {
        const batch = await fetchTransfers(transferFilters, EXPORT_BATCH_SIZE, exportOffset);
        allTransfers.push(...batch);
        if (batch.length < EXPORT_BATCH_SIZE) break;
      }

      const rows: unknown[][] = [
        [
          'Transfer ID', 'Status', 'From Location', 'To Location', 'Item Count',
          'Combined Item Quantity (mixed units)', 'Created At', 'Created By',
          'Executed At', 'Executed By', 'Cancelled At', 'Cancelled By',
          'Cancellation Reason', 'Notes', 'Version'
        ],
        ...allTransfers.map((transfer) => [
          transfer.id,
          transfer.status,
          transfer.from_storage_location_name,
          transfer.to_storage_location_name,
          transfer.item_count ?? '',
          transfer.total_quantity ?? '',
          transfer.created_at,
          transfer.created_by_user_name ?? '',
          transfer.executed_at ?? '',
          transfer.executed_by_user_name ?? '',
          transfer.cancelled_at ?? '',
          transfer.cancelled_by_user_name ?? '',
          transfer.cancellation_reason ?? '',
          getDisplayNotes(transfer) ?? '',
          transfer.version
        ])
      ];

      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`stock-transfers-filtered-${stamp}.csv`, rows);
      setMessage(`Exported ${allTransfers.length} filtered stock transfer${allTransfers.length === 1 ? '' : 's'}.`);
    } catch (exportError) {
      setError(normalizeError(exportError, 'Could not export the filtered stock transfers.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExecuteSelectedTransfer = () => {
    if (!selectedTransfer) return;
    if (transferAvailabilityQuery.isError || !selectedTransferAvailability) {
      setError('Execution preview is unavailable. Refresh the transfer and confirm source availability before executing.');
      setMessage(null);
      return;
    }
    if (!selectedTransferAvailability.executable) {
      setError(selectedTransferAvailability.message || 'One or more transfer items do not have enough source stock.');
      setMessage(null);
      return;
    }

    const itemSummary = selectedTransfer.items
      .map((item) => `- ${item.product_name}: ${formatNumber(item.quantity)} ${item.product_unit}`)
      .join('\n');
    const confirmed = window.confirm(
      `Execute this stock transfer?\n\n${selectedTransfer.from_storage_location_name} → ${selectedTransfer.to_storage_location_name}\n\n${itemSummary}\n\nThis moves stock immediately, protects reserved stock, and cannot be edited afterwards.`
    );
    if (confirmed) executeMutation.mutate(selectedTransfer.id);
  };

  const handleCancelSelectedTransfer = () => {
    if (!selectedTransfer) return;
    const reasonLine = cancelReason.trim() ? `\n\nReason: ${cancelReason.trim()}` : '';
    const confirmed = window.confirm(
      `Cancel this stock transfer draft?${reasonLine}\n\nCancellation does not move stock and cannot be undone.`
    );
    if (confirmed) cancelMutation.mutate({ id: selectedTransfer.id, reason: cancelReason });
  };

  const exportSelectedTransferDetailCsv = () => {
    if (!selectedTransfer) return;
    const transferRows: unknown[][] = [
      ['Transfer ID', selectedTransfer.id],
      ['Version', selectedTransfer.version],
      ['Status', selectedTransfer.status],
      ['From Location', selectedTransfer.from_storage_location_name],
      ['To Location', selectedTransfer.to_storage_location_name],
      ['Created At', selectedTransfer.created_at],
      ['Created By', selectedTransfer.created_by_user_name ?? ''],
      ['Executed At', selectedTransfer.executed_at ?? ''],
      ['Executed By', selectedTransfer.executed_by_user_name ?? ''],
      ['Cancelled At', selectedTransfer.cancelled_at ?? ''],
      ['Cancelled By', selectedTransfer.cancelled_by_user_name ?? ''],
      ['Cancellation Reason', selectedTransfer.cancellation_reason ?? ''],
      ['Notes', getDisplayNotes(selectedTransfer) ?? ''],
      [],
      ['Items'],
      ['Product', 'Category', 'Quantity', 'Unit'],
      ...selectedTransfer.items.map((item) => [
        item.product_name,
        item.product_category ?? '',
        item.quantity,
        item.product_unit
      ])
    ];

    const movementRows: unknown[][] = selectedTransferMovements.length
      ? [
          [],
          ['Movement Audit'],
          ['Time', 'Product', 'Movement Type', 'Storage Location', 'Change', 'Unit', 'Original Reason', 'User', 'Movement ID'],
          ...selectedTransferMovements.map((movement) => [
            movement.created_at,
            movement.product_name,
            getMovementTypeLabel(movement),
            movement.storage_location_name ?? '',
            movement.change,
            movement.product_unit,
            movement.reason ?? '',
            movement.user_name ?? 'Support/System',
            movement.id
          ])
        ]
      : [];

    downloadCsv(`stock-transfer-${selectedTransfer.id}.csv`, [...transferRows, ...movementRows]);
  };

  const printSelectedTransferDetail = () => {
    if (!selectedTransfer) return;

    const itemRows = selectedTransfer.items.map((item) => `
      <tr><td>${escapeHtml(item.product_name)}</td><td>${escapeHtml(item.product_category || '-')}</td><td>${escapeHtml(formatNumber(item.quantity))}</td><td>${escapeHtml(item.product_unit)}</td></tr>
    `).join('');

    const movementRows = selectedTransferMovements.length
      ? selectedTransferMovements.map((movement) => `
          <tr>
            <td>${escapeHtml(formatDateTime(movement.created_at))}</td>
            <td>${escapeHtml(movement.product_name)}</td>
            <td>${escapeHtml(getMovementTypeLabel(movement))}</td>
            <td>${escapeHtml(movement.storage_location_name || 'Location not recorded')}</td>
            <td>${escapeHtml(formatNumber(movement.change))} ${escapeHtml(movement.product_unit)}</td>
            <td>${escapeHtml(movement.user_name || 'Support/System')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="6">No movement audit rows loaded.</td></tr>';

    const availabilityRows = selectedTransferAvailability?.items?.length
      ? selectedTransferAvailability.items.map((item) => `
          <tr>
            <td>${escapeHtml(item.product_name)}</td>
            <td>${escapeHtml(formatNumber(item.requested_quantity))} ${escapeHtml(item.product_unit)}</td>
            <td>${escapeHtml(formatNumber(item.on_hand_quantity))} ${escapeHtml(item.product_unit)}</td>
            <td>${escapeHtml(formatNumber(item.reserved_quantity))} ${escapeHtml(item.product_unit)}</td>
            <td>${escapeHtml(formatNumber(item.available_quantity))} ${escapeHtml(item.product_unit)}</td>
            <td>${escapeHtml(formatNumber(item.remaining_after_transfer))} ${escapeHtml(item.product_unit)}</td>
            <td>${item.sufficient ? 'Ready' : 'Insufficient unreserved stock'}</td>
          </tr>
        `).join('')
      : '';

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=760');
    if (!printWindow) {
      setError('Browser blocked the print window. Allow pop-ups for this site and try again.');
      setMessage(null);
      return;
    }

    printWindow.document.write(`
      <!doctype html><html><head><title>Stock Transfer ${escapeHtml(selectedTransfer.id)}</title>
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
        <button onclick="window.print()">Print</button>
        <h1>Stock Transfer</h1>
        <div class="badge">${escapeHtml(selectedTransfer.status.toUpperCase())}</div>
        <p class="meta"><strong>Transfer ID:</strong> ${escapeHtml(selectedTransfer.id)} · <strong>Version:</strong> ${escapeHtml(selectedTransfer.version)}</p>
        <p class="meta"><strong>Route:</strong> ${escapeHtml(selectedTransfer.from_storage_location_name)} → ${escapeHtml(selectedTransfer.to_storage_location_name)}</p>
        <p class="meta"><strong>Created:</strong> ${escapeHtml(formatDateTime(selectedTransfer.created_at))} by ${escapeHtml(selectedTransfer.created_by_user_name || 'Not recorded')}</p>
        ${selectedTransfer.executed_at ? `<p class="meta"><strong>Executed:</strong> ${escapeHtml(formatDateTime(selectedTransfer.executed_at))} by ${escapeHtml(selectedTransfer.executed_by_user_name || 'Not recorded')}</p>` : ''}
        ${selectedTransfer.cancelled_at ? `<p class="meta"><strong>Cancelled:</strong> ${escapeHtml(formatDateTime(selectedTransfer.cancelled_at))} by ${escapeHtml(selectedTransfer.cancelled_by_user_name || 'Not recorded')}</p>` : ''}
        ${selectedTransfer.cancellation_reason ? `<p class="meta"><strong>Cancellation reason:</strong> ${escapeHtml(formatCancellationReason(selectedTransfer.cancellation_reason))}</p>` : ''}
        ${getDisplayNotes(selectedTransfer) ? `<div class="notes"><strong>Notes:</strong><br />${escapeHtml(getDisplayNotes(selectedTransfer))}</div>` : ''}
        <section><h2>Items</h2><table><thead><tr><th>Product</th><th>Category</th><th>Quantity</th><th>Unit</th></tr></thead><tbody>${itemRows}</tbody></table></section>
        ${availabilityRows ? `<section><h2>Execution Check</h2><p class="meta">${escapeHtml(selectedTransferAvailability?.message || '')}</p><table><thead><tr><th>Product</th><th>Requested</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>After Transfer</th><th>Status</th></tr></thead><tbody>${availabilityRows}</tbody></table></section>` : ''}
        ${selectedTransfer.status === 'executed' ? `<section><h2>Movement Audit</h2><table><thead><tr><th>Time</th><th>Product</th><th>Direction</th><th>Location</th><th>Change</th><th>User</th></tr></thead><tbody>${movementRows}</tbody></table></section>` : ''}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const isRefreshingTransfers = Boolean(
    transfersQuery.isFetching || transferSummaryQuery.isFetching || transferOptionsQuery.isFetching ||
    sourceOptionsQuery.isFetching || transferDetailQuery.isFetching || transferAvailabilityQuery.isFetching ||
    transferMovementsQuery.isFetching
  );
  const submitPending = createMutation.isPending || updateMutation.isPending;
  const executePreviewReady = Boolean(
    selectedTransferAvailability && !transferAvailabilityQuery.isLoading && !transferAvailabilityQuery.isError
  );

  return (
    <div className="io-operational-page io-stock-transfers-page" style={styles.page}>
      <div className="app-grid-stats" style={styles.statsGrid}>
        <StatCard title="Transfers" value={summary.transfer_count} subtitle="Matching the current filters" loading={transferSummaryQuery.isLoading} />
        <StatCard title="Drafts" value={summary.draft_count} subtitle="Waiting for execution or cancellation" loading={transferSummaryQuery.isLoading} />
        <StatCard title="Executed" value={summary.executed_count} subtitle="Stock already moved" loading={transferSummaryQuery.isLoading} />
        <StatCard title="Cancelled" value={summary.cancelled_count} subtitle="Drafts closed without moving stock" loading={transferSummaryQuery.isLoading} />
        <StatCard title="Line Items" value={summary.item_count} subtitle="Product lines across matching transfers" loading={transferSummaryQuery.isLoading} />
      </div>

      {message ? <div className="app-success-state" style={styles.feedbackBox}>{message}</div> : null}
      {error ? <div className="app-error-state" style={styles.feedbackBox}>{error}</div> : null}

      {!canCreateStockTransfers && !editingTransferId ? (
        <div className="app-warning-state" style={styles.feedbackBox}>
          Current access role: {accessRoleLabel}. The page is available for review, but this role cannot create stock transfer drafts.
        </div>
      ) : null}

      <section id="stock-transfer-form" className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div className="io-section-heading-with-icon">
            <span className="io-section-heading-icon"><TenantNavIcon path="/stock-transfers" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>{editingTransferId ? 'Edit Transfer Draft' : 'Create Transfer Draft'}</h3>
              <p style={styles.panelSubtitle}>
              {editingTransferId
                ? 'Update the selected draft before execution. Editing a draft does not change stock.'
                : 'Plan an internal move between two storage locations. Stock changes only after an authorized user executes the draft.'}
              </p>
            </div>
          </div>
          {editingTransferId ? <span style={styles.draftBadge}>EDITING DRAFT</span> : null}
        </div>

        {transferOptionsQuery.isError ? (
          <div className="app-error-state">Products and storage locations could not be loaded. Refresh before creating a transfer.</div>
        ) : null}

        <form onSubmit={handleSubmit} style={styles.formStack}>
          <div className="app-grid-2" style={styles.formGrid}>
            <div>
              <label htmlFor="transfer-from-location" style={styles.label}>From location</label>
              <select
                id="transfer-from-location"
                style={styles.input}
                value={form.from_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, from_storage_location_id: event.target.value }))}
                disabled={!canWriteTransferForm || transferOptionsQuery.isLoading}
                required
              >
                <option value="">Select source</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id} disabled={location.id === form.to_storage_location_id}>
                    {location.name}{location.temperature_zone ? ` · ${location.temperature_zone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="transfer-to-location" style={styles.label}>To location</label>
              <select
                id="transfer-to-location"
                style={styles.input}
                value={form.to_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, to_storage_location_id: event.target.value }))}
                disabled={!canWriteTransferForm || transferOptionsQuery.isLoading}
                required
              >
                <option value="">Select destination</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id} disabled={location.id === form.from_storage_location_id}>
                    {location.name}{location.temperature_zone ? ` · ${location.temperature_zone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="transfer-notes" style={styles.label}>Transfer notes</label>
            <textarea
              id="transfer-notes"
              style={{ ...styles.input, minHeight: 82, resize: 'vertical' }}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Optional business reason, request reference, or internal note"
              maxLength={4000}
              disabled={!canWriteTransferForm}
            />
            <div style={styles.fieldHint}>{form.notes.length.toLocaleString()} / 4,000 characters</div>
          </div>

          <div style={styles.itemHeaderRow}>
            <div>
              <h4 style={styles.itemTitle}>Transfer items</h4>
              <p style={styles.panelSubtitle}>Each product can appear once. Availability is based on unreserved stock at the selected source.</p>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={addItemRow} disabled={!canWriteTransferForm}>
              Add item
            </button>
          </div>

          {form.from_storage_location_id && sourceOptionsQuery.isLoading ? (
            <div className="app-empty-state">Checking unreserved source stock…</div>
          ) : null}
          {form.from_storage_location_id && sourceOptionsQuery.isError ? (
            <div className="app-warning-state">Source availability preview is unavailable. The backend will still validate the draft before saving.</div>
          ) : null}

          <div style={styles.itemRows}>
            {form.items.map((item, index) => {
              const selectedProduct = sourceProductById.get(item.product_id);
              const requested = Number(item.quantity || 0);
              const available = selectedProduct?.available_quantity === null || selectedProduct?.available_quantity === undefined
                ? null
                : Number(selectedProduct.available_quantity || 0);
              const remaining = available === null ? null : available - requested;

              return (
                <div key={`${index}-${item.product_id}`} style={styles.itemRow}>
                  <div className="app-grid-2" style={styles.formGrid}>
                    <div>
                      <label htmlFor={`transfer-product-${index}`} style={styles.label}>Product</label>
                      <select
                        id={`transfer-product-${index}`}
                        style={styles.input}
                        value={item.product_id}
                        onChange={(event) => updateItemRow(index, { product_id: event.target.value })}
                        disabled={!canWriteTransferForm || transferOptionsQuery.isLoading || sourceOptionsQuery.isLoading}
                        required
                      >
                        <option value="">Select product</option>
                        {sourceProducts.map((product) => {
                          const alreadyUsed = form.items.some((row, rowIndex) => rowIndex !== index && row.product_id === product.id);
                          const unavailable = Boolean(form.from_storage_location_id) && product.transferable === false && product.id !== item.product_id;
                          const availability = form.from_storage_location_id && product.available_quantity !== null && product.available_quantity !== undefined
                            ? ` · ${formatNumber(product.available_quantity)} ${product.unit || 'units'} available`
                            : '';
                          return (
                            <option key={product.id} value={product.id} disabled={alreadyUsed || unavailable}>
                              {product.name} ({product.unit || 'unit'}){availability}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div style={styles.quantityRow}>
                      <div style={{ flex: 1 }}>
                        <label htmlFor={`transfer-quantity-${index}`} style={styles.label}>Quantity</label>
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
                      <button
                        type="button"
                        style={styles.dangerButton}
                        onClick={() => removeItemRow(index)}
                        disabled={!canWriteTransferForm || form.items.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {selectedProduct && available !== null ? (
                    <div style={remaining !== null && remaining < 0 ? styles.availabilityWarning : styles.availabilitySummary}>
                      <span>On hand: <strong>{formatNumber(selectedProduct.on_hand_quantity)} {selectedProduct.unit}</strong></span>
                      <span>Reserved: <strong>{formatNumber(selectedProduct.reserved_quantity)} {selectedProduct.unit}</strong></span>
                      <span>Available: <strong>{formatNumber(available)} {selectedProduct.unit}</strong></span>
                      <span>After draft quantity: <strong>{formatNumber(remaining)} {selectedProduct.unit}</strong></span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div style={styles.actionsRow}>
            <button type="submit" style={styles.primaryButton} disabled={!canWriteTransferForm || submitPending || transferOptionsQuery.isError}>
              {editingTransferId
                ? (updateMutation.isPending ? 'Saving…' : 'Save draft changes')
                : (createMutation.isPending ? 'Creating…' : 'Create transfer draft')}
            </button>
            {editingTransferId ? (
              <button type="button" style={styles.secondaryButton} onClick={cancelEditing} disabled={updateMutation.isPending}>
                Cancel editing
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
              <h3 style={styles.panelTitle}>Stock Transfers</h3>
              <p style={styles.panelSubtitle}>Search drafts and completed transfers, then open one for execution, cancellation, print, export, or movement audit.</p>
            </div>
          </div>
          <div style={styles.filterActions}>
            <button type="button" style={styles.secondaryButton} onClick={refreshTransferBoard} disabled={isRefreshingTransfers}>
              {isRefreshingTransfers ? 'Refreshing…' : 'Refresh transfers'}
            </button>
            <button type="button" style={styles.secondaryButton} onClick={exportFilteredTransfersCsv} disabled={totalTransfers === 0 || isExporting || transferSummaryQuery.isError}>
              {isExporting ? 'Preparing CSV…' : 'Export filtered CSV'}
            </button>
            <button type="button" style={styles.secondaryButton} onClick={clearTransferFilters} disabled={!hasActiveFilters}>
              Clear filters
            </button>
          </div>
        </div>

        <div className="app-grid-2" style={styles.filterGrid}>
          <div>
            <label htmlFor="transfer-search" style={styles.label}>Search transfers</label>
            <input
              id="transfer-search"
              style={styles.input}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Product, location, notes, creator, executor, cancellation, or transfer ID"
              maxLength={255}
              type="search"
            />
          </div>

          <div>
            <label htmlFor="transfer-status-filter" style={styles.label}>Status</label>
            <select id="transfer-status-filter" style={styles.input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="executed">Executed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="transfer-from-filter" style={styles.label}>From location</label>
            <select id="transfer-from-filter" style={styles.input} value={fromLocationFilter} onChange={(event) => setFromLocationFilter(event.target.value)} disabled={transferOptionsQuery.isLoading}>
              <option value="">Any source</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="transfer-to-filter" style={styles.label}>To location</label>
            <select id="transfer-to-filter" style={styles.input} value={toLocationFilter} onChange={(event) => setToLocationFilter(event.target.value)} disabled={transferOptionsQuery.isLoading}>
              <option value="">Any destination</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="transfer-product-filter" style={styles.label}>Product</label>
            <select id="transfer-product-filter" style={styles.input} value={productFilter} onChange={(event) => setProductFilter(event.target.value)} disabled={transferOptionsQuery.isLoading}>
              <option value="">Any product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit || 'unit'})</option>)}
            </select>
          </div>
        </div>

        <div style={styles.resultsToolbar}>
          <span style={styles.resultCount}>
            {transferSummaryQuery.isLoading
              ? 'Calculating transfer totals…'
              : `Showing ${firstVisible.toLocaleString()}–${lastVisible.toLocaleString()} of ${totalTransfers.toLocaleString()} matching transfers`}
          </span>
          <label style={styles.rowsLabel} htmlFor="transfer-page-size">
            Rows per page
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

        {transfersQuery.isLoading ? <div className="app-empty-state">Loading transfers…</div> : null}
        {transfersQuery.isError ? <div className="app-error-state">Failed to load stock transfers.</div> : null}
        {transferSummaryQuery.isError ? <div className="app-warning-state">Full filtered totals are unavailable. Visible transfer cards can still be reviewed.</div> : null}
        {!transfersQuery.isLoading && transfers.length === 0 ? (
          <div className="app-empty-state">
            {hasActiveFilters ? 'No stock transfers match the current filters.' : 'No stock transfers exist yet.'}
          </div>
        ) : null}

        <div style={styles.transferList}>
          {transfers.map((transfer) => {
            const displayNotes = getDisplayNotes(transfer);
            return (
              <button
                key={transfer.id}
                type="button"
                style={{ ...styles.transferCard, ...(selectedTransferId === transfer.id ? styles.transferCardActive : {}) }}
                onClick={() => selectTransfer(transfer.id)}
                aria-pressed={selectedTransferId === transfer.id}
              >
                <div style={styles.transferCardTop}>
                  <strong>{transfer.from_storage_location_name} → {transfer.to_storage_location_name}</strong>
                  <span style={getStatusBadgeStyle(transfer.status)}>{transfer.status.toUpperCase()}</span>
                </div>
                <div style={styles.transferMeta}>
                  {formatNumber(transfer.item_count)} line item{Number(transfer.item_count || 0) === 1 ? '' : 's'} · Created {formatDateTime(transfer.created_at)}
                  {transfer.created_by_user_name ? ` by ${transfer.created_by_user_name}` : ''}
                </div>
                {transfer.status === 'executed' && transfer.executed_at ? (
                  <div style={styles.transferMeta}>Executed {formatDateTime(transfer.executed_at)}{transfer.executed_by_user_name ? ` by ${transfer.executed_by_user_name}` : ''}</div>
                ) : null}
                {transfer.status === 'cancelled' && transfer.cancelled_at ? (
                  <div style={styles.transferMeta}>Cancelled {formatDateTime(transfer.cancelled_at)}{transfer.cancelled_by_user_name ? ` by ${transfer.cancelled_by_user_name}` : ''}</div>
                ) : null}
                {transfer.cancellation_reason ? <div style={styles.cancelReason}>Cancellation: {formatCancellationReason(transfer.cancellation_reason)}</div> : null}
                {displayNotes ? <div style={styles.transferNotes}>{displayNotes}</div> : null}
              </button>
            );
          })}
        </div>

        {totalPages > 1 ? (
          <div style={styles.paginationRow}>
            <button type="button" style={styles.secondaryButton} onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page <= 1 || transfersQuery.isFetching}>Previous</button>
            <span style={styles.pageLabel}>Page {page.toLocaleString()} of {totalPages.toLocaleString()}</span>
            <button type="button" style={styles.secondaryButton} onClick={() => setPage((current) => Math.min(current + 1, totalPages))} disabled={page >= totalPages || transfersQuery.isFetching}>Next</button>
          </div>
        ) : null}
      </section>

      {selectedTransferId ? (
        <section ref={detailSectionRef} className="app-panel app-panel--padded" style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div className="io-section-heading-with-icon">
              <span className="io-section-heading-icon"><TenantNavIcon path="/stock-transfers" size={17} /></span>
              <div className="io-section-heading-copy">
                <h3 style={styles.panelTitle}>Transfer Detail</h3>
                <p style={styles.panelSubtitle}>Review the selected transfer’s route, lifecycle, items, source-stock check, and execution audit.</p>
              </div>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={() => setSelectedTransferId(null)}>Close detail</button>
          </div>

          {!selectedVisible && !transferDetailQuery.isLoading && selectedTransfer ? (
            <div className="app-warning-state">This selected transfer is outside the current list page or filters. Its direct-link detail remains open.</div>
          ) : null}
          {transferDetailQuery.isLoading ? <div className="app-empty-state">Loading transfer detail…</div> : null}
          {transferDetailQuery.isError ? <div className="app-error-state">Failed to load transfer detail. The transfer may no longer exist or may not belong to this tenant.</div> : null}

          {selectedTransfer ? (
            <div style={styles.detailBlock}>
              <div style={styles.detailHeader}>
                <div>
                  <div style={styles.detailRoute}>{selectedTransfer.from_storage_location_name} → {selectedTransfer.to_storage_location_name}</div>
                  <div style={styles.transferMeta}>Transfer ID: {selectedTransfer.id} · Version {selectedTransfer.version}</div>
                  <div style={styles.transferMeta}>Created {formatDateTime(selectedTransfer.created_at)} by {selectedTransfer.created_by_user_name || 'Not recorded'}</div>
                  {selectedTransfer.executed_at ? <div style={styles.transferMeta}>Executed {formatDateTime(selectedTransfer.executed_at)} by {selectedTransfer.executed_by_user_name || 'Not recorded'}</div> : null}
                  {selectedTransfer.cancelled_at ? <div style={styles.transferMeta}>Cancelled {formatDateTime(selectedTransfer.cancelled_at)} by {selectedTransfer.cancelled_by_user_name || 'Not recorded'}</div> : null}
                </div>
                <div style={styles.detailHeaderActions}>
                  <button type="button" style={styles.secondaryButton} onClick={exportSelectedTransferDetailCsv}>Export detail CSV</button>
                  <button type="button" style={styles.secondaryButton} onClick={printSelectedTransferDetail}>Print detail</button>
                  <span style={getStatusBadgeStyle(selectedTransfer.status)}>{selectedTransfer.status.toUpperCase()}</span>
                </div>
              </div>

              {selectedTransfer.cancellation_reason ? (
                <div style={styles.cancellationBox}><strong>Cancellation reason:</strong> {formatCancellationReason(selectedTransfer.cancellation_reason)}</div>
              ) : null}
              {getDisplayNotes(selectedTransfer) ? <div style={styles.detailNotes}><strong>Transfer notes</strong><br />{getDisplayNotes(selectedTransfer)}</div> : null}

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>Product</th><th style={styles.th}>Category</th><th style={styles.th}>Quantity</th><th style={styles.th}>Unit</th></tr></thead>
                  <tbody>
                    {selectedTransfer.items.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}><strong>{item.product_name}</strong></td>
                        <td style={styles.td}>{item.product_category || 'Not categorized'}</td>
                        <td style={styles.td}>{formatNumber(item.quantity)}</td>
                        <td style={styles.td}>{item.product_unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedTransfer.status === 'draft' ? (
                <div style={styles.availabilityBlock}>
                  <h4 style={styles.itemTitle}>Execution Check</h4>
                  <p style={styles.panelSubtitle}>The transfer can use only unreserved stock at the source location.</p>
                  {transferAvailabilityQuery.isLoading ? <div className="app-empty-state">Checking source stock…</div> : null}
                  {transferAvailabilityQuery.isError ? <div className="app-error-state">Source-stock preview is unavailable. Refresh before executing this transfer.</div> : null}
                  {selectedTransferAvailability ? (
                    <div className={selectedTransferAvailability.executable ? 'app-success-state' : 'app-warning-state'} style={styles.feedbackBox}>
                      {selectedTransferAvailability.message}
                    </div>
                  ) : null}
                  {selectedTransferAvailability?.items?.length ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Product</th><th style={styles.th}>Requested</th><th style={styles.th}>On Hand</th>
                            <th style={styles.th}>Reserved</th><th style={styles.th}>Available</th><th style={styles.th}>After Transfer</th><th style={styles.th}>Readiness</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTransferAvailability.items.map((item) => (
                            <tr key={item.product_id}>
                              <td style={styles.td}><strong>{item.product_name}</strong></td>
                              <td style={styles.td}>{formatNumber(item.requested_quantity)} {item.product_unit}</td>
                              <td style={styles.td}>{formatNumber(item.on_hand_quantity)} {item.product_unit}</td>
                              <td style={styles.td}>{formatNumber(item.reserved_quantity)} {item.product_unit}</td>
                              <td style={styles.td}>{formatNumber(item.available_quantity)} {item.product_unit}</td>
                              <td style={styles.td}>{formatNumber(item.remaining_after_transfer)} {item.product_unit}</td>
                              <td style={styles.td}><span style={item.sufficient ? styles.readyBadge : styles.notReadyBadge}>{item.sufficient ? 'Ready' : 'Insufficient'}</span></td>
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
                  <h4 style={styles.itemTitle}>Movement Audit</h4>
                  <p style={styles.panelSubtitle}>Each product has an outbound row at the source and an inbound row at the destination.</p>
                  {transferMovementsQuery.isLoading ? <div className="app-empty-state">Loading transfer movements…</div> : null}
                  {transferMovementsQuery.isError ? <div className="app-error-state">Failed to load the transfer movement audit.</div> : null}
                  {!transferMovementsQuery.isLoading && !transferMovementsQuery.isError && selectedTransferMovements.length === 0 ? (
                    <div className="app-warning-state">No movement audit rows were found for this executed transfer. This requires support review.</div>
                  ) : null}
                  {selectedTransferMovements.length > 0 ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead><tr><th style={styles.th}>Time</th><th style={styles.th}>Product</th><th style={styles.th}>Direction</th><th style={styles.th}>Location</th><th style={styles.th}>Change</th><th style={styles.th}>Operator</th></tr></thead>
                        <tbody>
                          {selectedTransferMovements.map((movement) => (
                            <tr key={movement.id}>
                              <td style={styles.td}>{formatDateTime(movement.created_at)}</td>
                              <td style={styles.td}><strong>{movement.product_name}</strong></td>
                              <td style={styles.td}><span style={Number(movement.change) < 0 ? styles.outBadge : styles.inBadge}>{getMovementTypeLabel(movement)}</span></td>
                              <td style={styles.td}>{movement.storage_location_name || 'Location not recorded'}</td>
                              <td style={styles.td}><strong>{Number(movement.change) > 0 ? '+' : ''}{formatNumber(movement.change)} {movement.product_unit}</strong></td>
                              <td style={styles.td}>{movement.user_name || 'Support/System'}<div style={styles.auditHint} title={movement.reason || ''}>Audit ID: {movement.id.slice(0, 8)}</div></td>
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
                    <button type="button" style={styles.secondaryButton} onClick={startEditingSelectedTransfer} disabled={!canUpdateStockTransfers || executeMutation.isPending || cancelMutation.isPending || updateMutation.isPending}>Edit draft</button>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={handleExecuteSelectedTransfer}
                      disabled={!canExecuteStockTransfers || executeMutation.isPending || cancelMutation.isPending || !executePreviewReady || selectedTransferAvailability?.executable === false}
                    >
                      {executeMutation.isPending ? 'Executing…' : 'Execute transfer'}
                    </button>
                  </div>

                  <div style={styles.cancelArea}>
                    <label htmlFor="transfer-cancel-reason" style={styles.label}>Cancellation reason (optional)</label>
                    <textarea
                      id="transfer-cancel-reason"
                      style={styles.cancelReasonInput}
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Reason for closing this draft without moving stock"
                      rows={2}
                      maxLength={1000}
                      disabled={!canCancelStockTransfers || executeMutation.isPending || cancelMutation.isPending}
                    />
                    <div style={styles.cancelFooter}>
                      <span style={styles.fieldHint}>{cancelReason.length.toLocaleString()} / 1,000 characters</span>
                      <button type="button" style={styles.dangerButton} onClick={handleCancelSelectedTransfer} disabled={!canCancelStockTransfers || executeMutation.isPending || cancelMutation.isPending}>
                        {cancelMutation.isPending ? 'Cancelling…' : 'Cancel draft'}
                      </button>
                    </div>
                  </div>

                  {!canUpdateStockTransfers ? <span style={styles.permissionHint}>Your role cannot edit transfer drafts.</span> : null}
                  {!canExecuteStockTransfers ? <span style={styles.permissionHint}>Your role cannot execute transfers.</span> : null}
                  {!canCancelStockTransfers ? <span style={styles.permissionHint}>Your role cannot cancel transfer drafts.</span> : null}
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
