import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
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
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

async function fetchTransfers(status: string): Promise<StockTransferListItem[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<StockTransferListItem[]>(`/stock-transfers${suffix}`);
}

async function fetchTransferById(id: string): Promise<StockTransferDetail> {
  return apiRequest<StockTransferDetail>(`/stock-transfers/${id}`);
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

async function executeTransfer(id: string): Promise<{ message: string; transfer: StockTransferDetail }> {
  return apiRequest<{ message: string; transfer: StockTransferDetail }>(`/stock-transfers/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function cancelTransfer(id: string): Promise<{ message: string; transfer: StockTransferDetail }> {
  return apiRequest<{ message: string; transfer: StockTransferDetail }>(`/stock-transfers/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({})
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
    canExecuteStockTransfers,
    canCancelStockTransfers
  } = getRoleCapabilities();

  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [form, setForm] = useState<TransferFormState>(emptyTransferForm());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transfersQuery = useQuery({
    queryKey: ['stock-transfers', statusFilter],
    queryFn: () => fetchTransfers(statusFilter)
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

  const validateForm = (): string | null => {
    if (!canCreateStockTransfers) {
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

    createMutation.mutate(form);
  };

  const selectedTransfer = transferDetailQuery.data;
  const selectedTransferMovements = transferMovementsQuery.data ?? [];

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
        <h3 style={styles.panelTitle}>Create Transfer Draft</h3>
        <p style={styles.panelSubtitle}>
          Move stock internally from one storage location to another. The draft does not change quantities until it is executed.
        </p>

        <form onSubmit={handleSubmit} style={styles.formStack}>
          <div className="app-grid-2" style={styles.formGrid}>
            <div>
              <label style={styles.label}>From location</label>
              <select
                style={styles.input}
                value={form.from_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, from_storage_location_id: event.target.value }))}
                disabled={!canCreateStockTransfers || locationsQuery.isLoading}
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
                disabled={!canCreateStockTransfers || locationsQuery.isLoading}
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
              disabled={!canCreateStockTransfers}
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
              disabled={!canCreateStockTransfers}
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
                    disabled={!canCreateStockTransfers || productsQuery.isLoading}
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
                      disabled={!canCreateStockTransfers}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={() => removeItemRow(index)}
                    disabled={!canCreateStockTransfers || form.items.length === 1}
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
              disabled={!canCreateStockTransfers || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create transfer draft'}
            </button>
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.listHeader}>
          <div>
            <h3 style={styles.panelTitle}>Stock Transfers</h3>
            <p style={styles.panelSubtitle}>Review draft and executed transfers.</p>
          </div>
          <select
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="executed">Executed</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
              onClick={() => setSelectedTransferId(transfer.id)}
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
                <span style={getStatusBadgeStyle(selectedTransfer.status)}>
                  {selectedTransfer.status.toUpperCase()}
                </span>
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
                <div style={styles.actionsRow}>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={() => executeMutation.mutate(selectedTransfer.id)}
                    disabled={!canExecuteStockTransfers || executeMutation.isPending || cancelMutation.isPending}
                  >
                    {executeMutation.isPending ? 'Executing…' : 'Execute transfer'}
                  </button>
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={() => cancelMutation.mutate(selectedTransfer.id)}
                    disabled={!canCancelStockTransfers || executeMutation.isPending || cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? 'Cancelling…' : 'Cancel draft'}
                  </button>
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
  detailRoute: {
    fontSize: '18px',
    fontWeight: 900,
    color: '#0f172a'
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
  }
};
