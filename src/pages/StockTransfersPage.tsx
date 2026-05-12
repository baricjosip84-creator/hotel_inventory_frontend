import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError, getVersionConflictMessage, isVersionConflictError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { ProductItem } from '../types/inventory';

type StorageLocationItem = {
  id: string;
  name: string;
  temperature_zone?: string | null;
  deleted_at?: string | null;
};

type StockTransferStatus = 'draft' | 'executed' | 'cancelled' | string;

type StockTransferListItem = {
  id: string;
  from_storage_location_id: string;
  from_storage_location_name: string;
  to_storage_location_id: string;
  to_storage_location_name: string;
  status: StockTransferStatus;
  notes?: string | null;
  created_by_user_name?: string | null;
  executed_by_user_name?: string | null;
  created_at: string;
  executed_at?: string | null;
  cancelled_at?: string | null;
  item_count?: number | string;
  total_quantity?: number | string;
};

type StockTransferDetailItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
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

function emptyTransferForm(): TransferFormState {
  return {
    from_storage_location_id: '',
    to_storage_location_id: '',
    notes: '',
    items: [
      {
        product_id: '',
        quantity: ''
      }
    ]
  };
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
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

function getStatusBadgeStyle(status: StockTransferStatus): CSSProperties {
  if (status === 'executed') return styles.executedBadge;
  if (status === 'cancelled') return styles.cancelledBadge;
  return styles.draftBadge;
}

function normalizeError(error: unknown, fallback: string): string {
  if (isVersionConflictError(error)) {
    return getVersionConflictMessage(error);
  }

  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
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
    .replace(/\"/g, '&quot;')
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

async function fetchTransfers(filters: {
  status: string;
  search: string;
  fromStorageLocationId: string;
  toStorageLocationId: string;
  productId: string;
}): Promise<StockTransferListItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.fromStorageLocationId) params.set('from_storage_location_id', filters.fromStorageLocationId);
  if (filters.toStorageLocationId) params.set('to_storage_location_id', filters.toStorageLocationId);
  if (filters.productId) params.set('product_id', filters.productId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<StockTransferListItem[]>(`/stock-transfers${suffix}`);
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

async function fetchProducts(): Promise<ProductItem[]> {
  return apiRequest<ProductItem[]>('/products');
}

async function fetchStorageLocations(): Promise<StorageLocationItem[]> {
  return apiRequest<StorageLocationItem[]>('/storage-locations');
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

async function updateTransfer(id: string, input: TransferFormState): Promise<StockTransferDetail> {
  return apiRequest<StockTransferDetail>(`/stock-transfers/${id}`, {
    method: 'PATCH',
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

function StatCard(props: { title: string; value: number | string; subtitle: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={styles.statValue}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function StockTransfersPage() {
  const queryClient = useQueryClient();
  const {
    role,
    canCreateStockTransfers,
    canUpdateStockTransfers,
    canExecuteStockTransfers,
    canCancelStockTransfers
  } = getRoleCapabilities();

  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [fromLocationFilter, setFromLocationFilter] = useState('');
  const [toLocationFilter, setToLocationFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [form, setForm] = useState<TransferFormState>(emptyTransferForm());
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transferFilters = useMemo(() => ({
    status: statusFilter,
    search: searchFilter,
    fromStorageLocationId: fromLocationFilter,
    toStorageLocationId: toLocationFilter,
    productId: productFilter
  }), [statusFilter, searchFilter, fromLocationFilter, toLocationFilter, productFilter]);

  const transfersQuery = useQuery({
    queryKey: ['stock-transfers', transferFilters],
    queryFn: () => fetchTransfers(transferFilters)
  });

  const transferDetailQuery = useQuery({
    queryKey: ['stock-transfer', selectedTransferId],
    queryFn: () => fetchTransferById(selectedTransferId as string),
    enabled: Boolean(selectedTransferId)
  });

  const transferMovementsQuery = useQuery({
    queryKey: ['stock-transfer-movements', selectedTransferId],
    queryFn: () => fetchTransferMovements(selectedTransferId as string),
    enabled: Boolean(selectedTransferId)
  });

  const transferAvailabilityQuery = useQuery({
    queryKey: ['stock-transfer-availability', selectedTransferId],
    queryFn: () => fetchTransferAvailability(selectedTransferId as string),
    enabled: Boolean(selectedTransferId && transferDetailQuery.data?.status === 'draft')
  });

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  const locationsQuery = useQuery({
    queryKey: ['storage-locations'],
    queryFn: fetchStorageLocations
  });

  const transfers = useMemo(() => transfersQuery.data ?? [], [transfersQuery.data]);
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const locations = useMemo(
    () => (locationsQuery.data ?? []).filter((location) => !location.deleted_at),
    [locationsQuery.data]
  );

  const canWriteTransferForm = editingTransferId ? canUpdateStockTransfers : canCreateStockTransfers;
  const hasActiveFilters = Boolean(
    statusFilter ||
    searchFilter.trim() ||
    fromLocationFilter ||
    toLocationFilter ||
    productFilter
  );

  const summary = useMemo(() => {
    const drafts = transfers.filter((transfer) => transfer.status === 'draft').length;
    const executed = transfers.filter((transfer) => transfer.status === 'executed').length;
    const cancelled = transfers.filter((transfer) => transfer.status === 'cancelled').length;
    const totalItems = transfers.reduce((sum, transfer) => sum + Number(transfer.item_count || 0), 0);

    return {
      total: transfers.length,
      drafts,
      executed,
      cancelled,
      totalItems
    };
  }, [transfers]);

  const createMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: async (transfer) => {
      setForm(emptyTransferForm());
      setSelectedTransferId(transfer.id);
      setMessage('Stock transfer draft created successfully.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, 'Failed to create stock transfer.'));
      setMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransferFormState }) => updateTransfer(id, input),
    onSuccess: async (transfer) => {
      setEditingTransferId(null);
      setForm(emptyTransferForm());
      setSelectedTransferId(transfer.id);
      setMessage('Stock transfer draft updated successfully.');
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
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
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', result.transfer.id] }),
        queryClient.invalidateQueries({ queryKey: ['stock-transfer-movements', result.transfer.id] }),
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
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
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', result.transfer.id] })
      ]);
    },
    onError: (mutationError) => {
      setError(normalizeError(mutationError, 'Failed to cancel stock transfer.'));
      setMessage(null);
    }
  });

  const addItemRow = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { product_id: '', quantity: '' }]
    }));
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
      items: current.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, ...patch } : item
      ))
    }));
  };

  const startEditingSelectedTransfer = () => {
    if (!selectedTransfer || selectedTransfer.status !== 'draft') return;

    setEditingTransferId(selectedTransfer.id);
    setForm({
      from_storage_location_id: selectedTransfer.from_storage_location_id,
      to_storage_location_id: selectedTransfer.to_storage_location_id,
      notes: selectedTransfer.notes || '',
      items: selectedTransfer.items.map((item) => ({
        product_id: item.product_id,
        quantity: String(item.quantity)
      }))
    });
    setMessage(null);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingTransferId(null);
    setForm(emptyTransferForm());
    setMessage(null);
    setError(null);
  };

  const validateForm = (): string | null => {
    if (editingTransferId && !canUpdateStockTransfers) {
      return 'Your current role cannot update stock transfer drafts.';
    }

    if (!editingTransferId && !canCreateStockTransfers) {
      return 'Your current role cannot create stock transfers.';
    }

    if (!form.from_storage_location_id || !form.to_storage_location_id) {
      return 'Select both source and destination storage locations.';
    }

    if (form.from_storage_location_id === form.to_storage_location_id) {
      return 'Source and destination storage locations must be different.';
    }

    const usedProducts = new Set<string>();

    for (const item of form.items) {
      if (!item.product_id) {
        return 'Every transfer item must have a product.';
      }

      if (usedProducts.has(item.product_id)) {
        return 'A product can only appear once per transfer.';
      }

      usedProducts.add(item.product_id);

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return 'Every transfer item quantity must be greater than zero.';
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
      updateMutation.mutate({ id: editingTransferId, input: form });
      return;
    }

    createMutation.mutate(form);
  };

  const selectedTransfer = transferDetailQuery.data;
  const selectedTransferMovements = transferMovementsQuery.data ?? [];
  const selectedTransferAvailability = transferAvailabilityQuery.data;

  useEffect(() => {
    if (!selectedTransferId) return;
    if (transfersQuery.isLoading) return;

    const selectedStillVisible = transfers.some((transfer) => transfer.id === selectedTransferId);
    if (!selectedStillVisible) {
      setSelectedTransferId(null);
      setEditingTransferId(null);
    }
  }, [selectedTransferId, transfers, transfersQuery.isLoading]);

  const clearTransferFilters = () => {
    setStatusFilter('');
    setSearchFilter('');
    setFromLocationFilter('');
    setToLocationFilter('');
    setProductFilter('');
  };


  const exportVisibleTransfersCsv = () => {
    const rows: unknown[][] = [
      [
        'Transfer ID',
        'Status',
        'From Location',
        'To Location',
        'Item Count',
        'Total Quantity',
        'Created At',
        'Created By',
        'Executed At',
        'Executed By',
        'Cancelled At',
        'Notes'
      ],
      ...transfers.map((transfer) => [
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
        transfer.notes ?? ''
      ])
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`stock-transfers-${stamp}.csv`, rows);
  };

  const handleExecuteSelectedTransfer = () => {
    if (!selectedTransfer) return;

    if (selectedTransferAvailability && !selectedTransferAvailability.executable) {
      setError(selectedTransferAvailability.message || 'One or more transfer items do not have enough source stock.');
      setMessage(null);
      return;
    }

    const itemSummary = selectedTransfer.items
      .map((item) => `- ${item.product_name}: ${formatNumber(item.quantity)} ${item.product_unit}`)
      .join('\n');

    const confirmed = window.confirm(
      `Execute this stock transfer?\n\n${selectedTransfer.from_storage_location_name} → ${selectedTransfer.to_storage_location_name}\n\n${itemSummary}\n\nThis will move stock immediately and cannot be edited afterwards.`
    );

    if (!confirmed) return;

    executeMutation.mutate(selectedTransfer.id);
  };


  const exportSelectedTransferDetailCsv = () => {
    if (!selectedTransfer) return;

    const transferRows: unknown[][] = [
      ['Transfer ID', selectedTransfer.id],
      ['Status', selectedTransfer.status],
      ['From Location', selectedTransfer.from_storage_location_name],
      ['To Location', selectedTransfer.to_storage_location_name],
      ['Created At', selectedTransfer.created_at],
      ['Created By', selectedTransfer.created_by_user_name ?? ''],
      ['Executed At', selectedTransfer.executed_at ?? ''],
      ['Executed By', selectedTransfer.executed_by_user_name ?? ''],
      ['Cancelled At', selectedTransfer.cancelled_at ?? ''],
      ['Notes', selectedTransfer.notes ?? ''],
      [],
      ['Items'],
      ['Product', 'Quantity', 'Unit'],
      ...selectedTransfer.items.map((item) => [
        item.product_name,
        item.quantity,
        item.product_unit
      ])
    ];

    const movementRows: unknown[][] = selectedTransferMovements.length
      ? [
          [],
          ['Movement Audit'],
          ['Time', 'Product', 'Change', 'Unit', 'Reason', 'User'],
          ...selectedTransferMovements.map((movement) => [
            movement.created_at,
            movement.product_name,
            movement.change,
            movement.product_unit,
            movement.reason ?? '',
            movement.user_name ?? 'Support/System'
          ])
        ]
      : [];

    downloadCsv(`stock-transfer-${selectedTransfer.id}.csv`, [...transferRows, ...movementRows]);
  };

  const printSelectedTransferDetail = () => {
    if (!selectedTransfer) return;

    const itemRows = selectedTransfer.items.map((item) => `
      <tr>
        <td>${escapeHtml(item.product_name)}</td>
        <td>${escapeHtml(formatNumber(item.quantity))}</td>
        <td>${escapeHtml(item.product_unit)}</td>
      </tr>
    `).join('');

    const movementRows = selectedTransferMovements.length
      ? selectedTransferMovements.map((movement) => `
          <tr>
            <td>${escapeHtml(formatDateTime(movement.created_at))}</td>
            <td>${escapeHtml(movement.product_name)}</td>
            <td>${escapeHtml(formatNumber(movement.change))} ${escapeHtml(movement.product_unit)}</td>
            <td>${escapeHtml(movement.reason || '-')}</td>
            <td>${escapeHtml(movement.user_name || 'Support/System')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5">No movement audit rows loaded.</td></tr>';

    const availabilityRows = selectedTransferAvailability?.items?.length
      ? selectedTransferAvailability.items.map((item) => `
          <tr>
            <td>${escapeHtml(item.product_name)}</td>
            <td>${escapeHtml(formatNumber(item.requested_quantity))} ${escapeHtml(item.product_unit)}</td>
            <td>${escapeHtml(formatNumber(item.available_quantity))} ${escapeHtml(item.product_unit)}</td>
            <td>${escapeHtml(formatNumber(item.remaining_after_transfer))} ${escapeHtml(item.product_unit)}</td>
            <td>${item.sufficient ? 'OK' : 'Not enough stock'}</td>
          </tr>
        `).join('')
      : '';

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!printWindow) {
      setError('Browser blocked the print window. Allow pop-ups for this site and try again.');
      setMessage(null);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Stock Transfer ${escapeHtml(selectedTransfer.id)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
            h1 { margin-bottom: 4px; }
            .meta { color: #475569; margin: 4px 0; }
            .badge { display: inline-block; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 12px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; font-size: 13px; }
            th { color: #475569; }
            section { margin-top: 24px; }
            .notes { margin-top: 12px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; }
            @media print { button { display: none; } body { margin: 20px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <h1>Stock Transfer</h1>
          <div class="badge">${escapeHtml(selectedTransfer.status.toUpperCase())}</div>
          <p class="meta"><strong>Transfer ID:</strong> ${escapeHtml(selectedTransfer.id)}</p>
          <p class="meta"><strong>Route:</strong> ${escapeHtml(selectedTransfer.from_storage_location_name)} → ${escapeHtml(selectedTransfer.to_storage_location_name)}</p>
          <p class="meta"><strong>Created:</strong> ${escapeHtml(formatDateTime(selectedTransfer.created_at))} by ${escapeHtml(selectedTransfer.created_by_user_name || '-')}</p>
          ${selectedTransfer.executed_at ? `<p class="meta"><strong>Executed:</strong> ${escapeHtml(formatDateTime(selectedTransfer.executed_at))} by ${escapeHtml(selectedTransfer.executed_by_user_name || '-')}</p>` : ''}
          ${selectedTransfer.cancelled_at ? `<p class="meta"><strong>Cancelled:</strong> ${escapeHtml(formatDateTime(selectedTransfer.cancelled_at))}</p>` : ''}
          ${selectedTransfer.notes ? `<div class="notes"><strong>Notes:</strong><br />${escapeHtml(selectedTransfer.notes)}</div>` : ''}

          <section>
            <h2>Items</h2>
            <table>
              <thead><tr><th>Product</th><th>Quantity</th><th>Unit</th></tr></thead>
              <tbody>${itemRows}</tbody>
            </table>
          </section>

          ${availabilityRows ? `
            <section>
              <h2>Execution Check</h2>
              <p class="meta">${escapeHtml(selectedTransferAvailability?.message || '')}</p>
              <table>
                <thead><tr><th>Product</th><th>Requested</th><th>Available</th><th>After Transfer</th><th>Status</th></tr></thead>
                <tbody>${availabilityRows}</tbody>
              </table>
            </section>
          ` : ''}

          ${selectedTransfer.status === 'executed' ? `
            <section>
              <h2>Movement Audit</h2>
              <table>
                <thead><tr><th>Time</th><th>Product</th><th>Change</th><th>Reason</th><th>User</th></tr></thead>
                <tbody>${movementRows}</tbody>
              </table>
            </section>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };


  return (
    <div style={styles.page}>
      <div className="app-grid-stats" style={styles.statsGrid}>
        <StatCard title="Transfers" value={summary.total} subtitle="Visible transfers" />
        <StatCard title="Drafts" value={summary.drafts} subtitle="Waiting to be executed" />
        <StatCard title="Executed" value={summary.executed} subtitle="Already moved stock" />
        <StatCard title="Cancelled" value={summary.cancelled} subtitle="Cancelled drafts" />
        <StatCard title="Items" value={summary.totalItems} subtitle="Transfer line items" />
      </div>

      {message ? <div className="app-success-state" style={styles.successBox}>{message}</div> : null}
      {error ? <div className="app-error-state" style={styles.errorBox}>{error}</div> : null}

      {!canCreateStockTransfers ? (
        <div className="app-warning-state" style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Stock transfer creation is restricted by your tenant permissions.
        </div>
      ) : null}

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <h3 style={styles.panelTitle}>{editingTransferId ? 'Edit Transfer Draft' : 'Create Transfer Draft'}</h3>
        <p style={styles.panelSubtitle}>
          {editingTransferId
            ? 'Update the selected draft before it is executed. Editing does not change stock quantities.'
            : 'Move stock internally from one storage location to another. The draft does not change quantities until it is executed.'}
        </p>

        <form onSubmit={handleSubmit} style={styles.formStack}>
          <div className="app-grid-2" style={styles.formGrid}>
            <div>
              <label style={styles.label}>From location</label>
              <select
                style={styles.input}
                value={form.from_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, from_storage_location_id: event.target.value }))}
                disabled={!canWriteTransferForm || locationsQuery.isLoading}
                required
              >
                <option value="">Select source</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>To location</label>
              <select
                style={styles.input}
                value={form.to_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, to_storage_location_id: event.target.value }))}
                disabled={!canWriteTransferForm || locationsQuery.isLoading}
                required
              >
                <option value="">Select destination</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={styles.label}>Notes</label>
            <textarea
              style={{ ...styles.input, minHeight: 76, resize: 'vertical' }}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Optional transfer reason or internal note"
              disabled={!canWriteTransferForm}
            />
          </div>

          <div style={styles.itemHeaderRow}>
            <div>
              <h4 style={styles.itemTitle}>Items</h4>
              <p style={styles.panelSubtitle}>Each product can appear once per transfer.</p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={addItemRow}
              disabled={!canWriteTransferForm}
            >
              Add item
            </button>
          </div>

          <div style={styles.itemRows}>
            {form.items.map((item, index) => (
              <div key={index} className="app-grid-2" style={styles.itemRow}>
                <div>
                  <label style={styles.label}>Product</label>
                  <select
                    style={styles.input}
                    value={item.product_id}
                    onChange={(event) => updateItemRow(index, { product_id: event.target.value })}
                    disabled={!canWriteTransferForm || productsQuery.isLoading}
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.quantityRow}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Quantity</label>
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
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
            ))}
          </div>

          <div style={styles.actionsRow}>
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={!canWriteTransferForm || createMutation.isPending || updateMutation.isPending}
            >
              {editingTransferId
                ? (updateMutation.isPending ? 'Saving…' : 'Save draft changes')
                : (createMutation.isPending ? 'Creating…' : 'Create transfer draft')}
            </button>
            {editingTransferId ? (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={cancelEditing}
                disabled={updateMutation.isPending}
              >
                Cancel editing
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.listHeader}>
          <div>
            <h3 style={styles.panelTitle}>Stock Transfers</h3>
            <p style={styles.panelSubtitle}>Review draft and executed transfers.</p>
          </div>
          <div style={styles.filterActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={exportVisibleTransfersCsv}
              disabled={transfers.length === 0}
            >
              Export visible CSV
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={clearTransferFilters}
              disabled={!hasActiveFilters}
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="app-grid-2" style={styles.filterGrid}>
          <div>
            <label style={styles.label}>Search</label>
            <input
              style={styles.input}
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              placeholder="Search notes, locations, or creator"
            />
          </div>

          <div>
            <label style={styles.label}>Status</label>
            <select
              style={styles.input}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="executed">Executed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>From location</label>
            <select
              style={styles.input}
              value={fromLocationFilter}
              onChange={(event) => setFromLocationFilter(event.target.value)}
              disabled={locationsQuery.isLoading}
            >
              <option value="">Any source</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>To location</label>
            <select
              style={styles.input}
              value={toLocationFilter}
              onChange={(event) => setToLocationFilter(event.target.value)}
              disabled={locationsQuery.isLoading}
            >
              <option value="">Any destination</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Product</label>
            <select
              style={styles.input}
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
              disabled={productsQuery.isLoading}
            >
              <option value="">Any product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>
              ))}
            </select>
          </div>
        </div>

        {transfersQuery.isLoading ? <div className="app-empty-state">Loading transfers…</div> : null}
        {transfersQuery.isError ? <div className="app-error-state">Failed to load stock transfers.</div> : null}
        {!transfersQuery.isLoading && transfers.length === 0 ? (
          <div className="app-empty-state">No stock transfers found.</div>
        ) : null}

        <div style={styles.transferList}>
          {transfers.map((transfer) => (
            <button
              key={transfer.id}
              type="button"
              style={{
                ...styles.transferCard,
                ...(selectedTransferId === transfer.id ? styles.transferCardActive : {})
              }}
              onClick={() => { setSelectedTransferId(transfer.id); setCancelReason(''); }}
            >
              <div style={styles.transferCardTop}>
                <strong>{transfer.from_storage_location_name} → {transfer.to_storage_location_name}</strong>
                <span style={getStatusBadgeStyle(transfer.status)}>
                  {transfer.status.toUpperCase()}
                </span>
              </div>
              <div style={styles.transferMeta}>
                {formatNumber(transfer.item_count)} items · {formatNumber(transfer.total_quantity)} total quantity · Created {formatDateTime(transfer.created_at)}
              </div>
              {transfer.notes ? <div style={styles.transferNotes}>{transfer.notes}</div> : null}
            </button>
          ))}
        </div>
      </section>

      {selectedTransferId ? (
        <section className="app-panel app-panel--padded" style={styles.panel}>
          <h3 style={styles.panelTitle}>Transfer Detail</h3>
          {transferDetailQuery.isLoading ? <div className="app-empty-state">Loading transfer detail…</div> : null}
          {transferDetailQuery.isError ? <div className="app-error-state">Failed to load transfer detail.</div> : null}
          {selectedTransfer ? (
            <div style={styles.detailBlock}>
              <div style={styles.detailHeader}>
                <div>
                  <div style={styles.detailRoute}>{selectedTransfer.from_storage_location_name} → {selectedTransfer.to_storage_location_name}</div>
                  <div style={styles.transferMeta}>Created {formatDateTime(selectedTransfer.created_at)} by {selectedTransfer.created_by_user_name || '-'}</div>
                  {selectedTransfer.executed_at ? (
                    <div style={styles.transferMeta}>Executed {formatDateTime(selectedTransfer.executed_at)} by {selectedTransfer.executed_by_user_name || '-'}</div>
                  ) : null}
                  {selectedTransfer.cancelled_at ? (
                    <div style={styles.transferMeta}>Cancelled {formatDateTime(selectedTransfer.cancelled_at)}</div>
                  ) : null}
                </div>
                <div style={styles.detailHeaderActions}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={exportSelectedTransferDetailCsv}
                  >
                    Export detail CSV
                  </button>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={printSelectedTransferDetail}
                  >
                    Print detail
                  </button>
                  <span style={getStatusBadgeStyle(selectedTransfer.status)}>
                    {selectedTransfer.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedTransfer.notes ? <p style={styles.detailNotes}>{selectedTransfer.notes}</p> : null}

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransfer.items.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}>{item.product_name}</td>
                        <td style={styles.td}>{formatNumber(item.quantity)}</td>
                        <td style={styles.td}>{item.product_unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedTransfer.status === 'executed' ? (
                <div style={styles.movementBlock}>
                  <h4 style={styles.itemTitle}>Movement Audit</h4>
                  <p style={styles.panelSubtitle}>Stock movement rows created when this transfer was executed.</p>
                  {transferMovementsQuery.isLoading ? <div className="app-empty-state">Loading transfer movements…</div> : null}
                  {transferMovementsQuery.isError ? <div className="app-error-state">Failed to load transfer movements.</div> : null}
                  {!transferMovementsQuery.isLoading && selectedTransferMovements.length === 0 ? (
                    <div className="app-empty-state">No movement audit rows found for this transfer.</div>
                  ) : null}
                  {selectedTransferMovements.length > 0 ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Time</th>
                            <th style={styles.th}>Product</th>
                            <th style={styles.th}>Change</th>
                            <th style={styles.th}>Reason</th>
                            <th style={styles.th}>User</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTransferMovements.map((movement) => (
                            <tr key={movement.id}>
                              <td style={styles.td}>{formatDateTime(movement.created_at)}</td>
                              <td style={styles.td}>{movement.product_name}</td>
                              <td style={styles.td}>{formatNumber(movement.change)} {movement.product_unit}</td>
                              <td style={styles.td}>{movement.reason || '-'}</td>
                              <td style={styles.td}>{movement.user_name || 'Support/System'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedTransfer.status === 'draft' ? (
                <div style={styles.availabilityBlock}>
                  <h4 style={styles.itemTitle}>Execution Check</h4>
                  {transferAvailabilityQuery.isLoading ? <div className="app-empty-state">Checking source stock…</div> : null}
                  {transferAvailabilityQuery.isError ? <div className="app-warning-state" style={styles.warningBox}>Could not load source stock preview. Backend will still validate before execution.</div> : null}
                  {selectedTransferAvailability ? (
                    <div style={selectedTransferAvailability.executable ? styles.successBox : styles.warningBox}>
                      {selectedTransferAvailability.message}
                    </div>
                  ) : null}
                  {selectedTransferAvailability?.items?.length ? (
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Product</th>
                            <th style={styles.th}>Requested</th>
                            <th style={styles.th}>Available at source</th>
                            <th style={styles.th}>After transfer</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTransferAvailability.items.map((item) => (
                            <tr key={item.product_id}>
                              <td style={styles.td}>{item.product_name}</td>
                              <td style={styles.td}>{formatNumber(item.requested_quantity)} {item.product_unit}</td>
                              <td style={styles.td}>{formatNumber(item.available_quantity)} {item.product_unit}</td>
                              <td style={styles.td}>{formatNumber(item.remaining_after_transfer)} {item.product_unit}</td>
                              <td style={styles.td}>{item.sufficient ? 'OK' : 'Not enough stock'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedTransfer.status === 'draft' ? (
                <div style={styles.actionsRow}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={startEditingSelectedTransfer}
                    disabled={!canUpdateStockTransfers || executeMutation.isPending || cancelMutation.isPending || updateMutation.isPending}
                  >
                    Edit draft
                  </button>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={handleExecuteSelectedTransfer}
                    disabled={!canExecuteStockTransfers || executeMutation.isPending || cancelMutation.isPending || transferAvailabilityQuery.isLoading || selectedTransferAvailability?.executable === false}
                  >
                    {executeMutation.isPending ? 'Executing…' : 'Execute transfer'}
                  </button>
                  <textarea
                    style={styles.cancelReasonInput}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Optional cancel reason"
                    rows={2}
                    disabled={!canCancelStockTransfers || executeMutation.isPending || cancelMutation.isPending}
                  />
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={() => cancelMutation.mutate({ id: selectedTransfer.id, reason: cancelReason })}
                    disabled={!canCancelStockTransfers || executeMutation.isPending || cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? 'Cancelling…' : 'Cancel draft'}
                  </button>
                  {!canUpdateStockTransfers ? (
                    <span style={styles.permissionHint}>Your current role cannot edit stock transfer drafts.</span>
                  ) : null}
                  {!canExecuteStockTransfers ? (
                    <span style={styles.permissionHint}>Your current role cannot execute stock transfers.</span>
                  ) : null}
                  {!canCancelStockTransfers ? (
                    <span style={styles.permissionHint}>Your current role cannot cancel stock transfers.</span>
                  ) : null}
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
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  statsGrid: {
    marginBottom: 0
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '18px',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)'
  },
  statTitle: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 700,
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#0f172a'
  },
  statSubtitle: {
    marginTop: '6px',
    fontSize: '13px',
    color: '#64748b'
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  panelTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a'
  },
  panelSubtitle: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.45
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGrid: {
    gap: '14px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#334155',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '11px 12px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#ffffff'
  },
  itemHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center'
  },
  itemTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 800,
    color: '#0f172a'
  },
  itemRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  itemRow: {
    gap: '14px',
    padding: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    background: '#f8fafc'
  },
  quantityRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end'
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    border: 0,
    borderRadius: '12px',
    background: '#2563eb',
    color: '#ffffff',
    padding: '11px 16px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    background: '#ffffff',
    color: '#0f172a',
    padding: '10px 14px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  dangerButton: {
    border: '1px solid #fecaca',
    borderRadius: '12px',
    background: '#fff1f2',
    color: '#b91c1c',
    padding: '11px 12px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  filterSelect: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 12px',
    fontWeight: 700,
    color: '#0f172a',
    background: '#ffffff'
  },
  filterGrid: {
    gap: '14px',
    alignItems: 'end'
  },
  filterActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  transferList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '12px'
  },
  transferCard: {
    textAlign: 'left',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    background: '#ffffff',
    padding: '14px',
    cursor: 'pointer',
    color: '#0f172a'
  },
  transferCardActive: {
    borderColor: '#2563eb',
    boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)'
  },
  transferCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'center'
  },
  transferMeta: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.45
  },
  transferNotes: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#334155'
  },
  draftBadge: {
    display: 'inline-flex',
    borderRadius: '999px',
    padding: '5px 9px',
    background: '#fef3c7',
    color: '#92400e',
    fontSize: '11px',
    fontWeight: 900
  },
  executedBadge: {
    display: 'inline-flex',
    borderRadius: '999px',
    padding: '5px 9px',
    background: '#dcfce7',
    color: '#166534',
    fontSize: '11px',
    fontWeight: 900
  },
  cancelledBadge: {
    display: 'inline-flex',
    borderRadius: '999px',
    padding: '5px 9px',
    background: '#fee2e2',
    color: '#991b1b',
    fontSize: '11px',
    fontWeight: 900
  },
  detailBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  detailHeaderActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  detailRoute: {
    fontSize: '18px',
    fontWeight: 900,
    color: '#0f172a'
  },
  availabilityBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '14px',
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    background: '#f8fafc'
  },
  movementBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '14px'
  },
  detailNotes: {
    margin: 0,
    padding: '12px',
    borderRadius: '12px',
    background: '#f8fafc',
    color: '#334155'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    fontSize: '12px',
    color: '#64748b',
    borderBottom: '1px solid #e5e7eb',
    padding: '10px'
  },
  td: {
    borderBottom: '1px solid #f1f5f9',
    padding: '10px',
    fontSize: '14px',
    color: '#0f172a'
  },
  successBox: {
    padding: '12px 14px',
    borderRadius: '14px'
  },
  errorBox: {
    padding: '12px 14px',
    borderRadius: '14px'
  },
  warningBox: {
    padding: '12px 14px',
    borderRadius: '14px'
  },
  permissionHint: {
    fontSize: '13px',
    color: '#64748b'
  },
  cancelReasonInput: {
    minWidth: '260px',
    flex: '1 1 280px',
    padding: '10px 12px',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    background: '#ffffff',
    color: '#0f172a',
    fontFamily: 'inherit',
    resize: 'vertical'
  }
};
