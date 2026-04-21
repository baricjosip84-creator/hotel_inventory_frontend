import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

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
  min_quantity?: number | string | null;
  product_min_stock?: number | string | null;
  updated_at?: string;
  version?: number | string;

  workflowGuideGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  workflowStepCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
    display: 'grid',
    gap: '8px'
  },
  workflowStepCardComplete: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '16px',
    padding: '14px',
    display: 'grid',
    gap: '8px'
  },
  workflowStepLabel: {
    fontSize: '0.86rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  workflowStepText: {
    color: '#475569',
    lineHeight: 1.5,
    fontSize: '0.92rem'
  },
  readinessList: {
    display: 'grid',
    gap: '10px'
  },
  readinessRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '10px',
    color: '#334155'
  },
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
};

async function fetchStock(): Promise<StockItem[]> {
  return apiRequest<StockItem[]>('/stock');
}

async function fetchStockMovements(productId: string): Promise<StockMovement[]> {
  const params = new URLSearchParams();

  if (productId) {
    params.set('product_id', productId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<StockMovement[]>(`/stock/movements${suffix}`);
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

function getDefaultDraft(action: StockActionType): StockActionDraft {
  if (action === 'consume') {
    return {
      action,
      quantity: '1',
      change: '',
      reason: 'consumption'
    };
  }

  if (action === 'count') {
    return {
      action,
      quantity: '0',
      change: '',
      reason: 'inventory_count'
    };
  }

  return {
    action,
    quantity: '',
    change: '-1',
    reason: 'manual_adjustment'
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

  return 'Apply a positive or negative correction delta to the selected stock row.';
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

  if (value.includes('consume')) {
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
    background: '#e5e7eb',
    color: '#374151'
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
    background: '#e5e7eb',
    color: '#374151'
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
  const toneStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={toneStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function StockPage() {
  const queryClient = useQueryClient();
  const { role, canConsumeStock: canConsume, canCountStock: canCount, canAdjustStock: canAdjust } = useMemo(() => getRoleCapabilities(), []);

  /*
    WHAT CHANGED
    ------------
    The stock page is no longer read-only. It now builds directly on your
    existing backend stock routes:
    - POST /stock/consume
    - POST /stock/count
    - POST /stock/adjust
    - GET  /stock/movements

    WHY IT CHANGED
    --------------
    Your backend already supports production-grade stock operations with role
    control, transaction safety, and movement logging, but the frontend was only
    exposing a stock table.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This turns the stock page into an operational workbench so users can consume,
    count, and adjust inventory from the existing stock rows without leaving the
    main stock screen.
  */
  const stockQuery = useQuery({
    queryKey: ['stock'],
    queryFn: fetchStock
  });

  const rows = useMemo(() => stockQuery.data ?? [], [stockQuery.data]);

  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedStockId) ?? rows[0] ?? null,
    [rows, selectedStockId]
  );

  const [draft, setDraft] = useState<StockActionDraft>(getDefaultDraft('consume'));
  const [operationFeedback, setOperationFeedback] = useState<string>('');
  const [operationError, setOperationError] = useState<string>('');
  const [lastResult, setLastResult] = useState<StockMutationResponse | null>(null);

  const selectedProductId = selectedRow?.product_id ?? '';

  const movementsQuery = useQuery({
    queryKey: ['stock-movements', 'selected-stock-page', selectedProductId],
    queryFn: () => fetchStockMovements(selectedProductId),
    enabled: Boolean(selectedProductId)
  });

  const recentMovements = useMemo(() => {
    const movementRows = movementsQuery.data ?? [];

    return movementRows
      .filter((movement) => movement.product_id === selectedProductId)
      .slice(0, 8);
  }, [movementsQuery.data, selectedProductId]);

  const summary = useMemo(() => {
    let low = 0;
    let ok = 0;
    let quantityTotal = 0;

    for (const item of rows) {
      const quantity = toNumber(item.quantity);
      const minimum = Math.max(
        toNumber(item.min_quantity),
        toNumber(item.product_min_stock)
      );

      quantityTotal += quantity;

      if (quantity < minimum) {
        low += 1;
      } else {
        ok += 1;
      }
    }

    return {
      totalRows: rows.length,
      lowRows: low,
      okRows: ok,
      quantityTotal
    };
  }, [rows]);




  const currentQuantity = selectedRow ? toNumber(selectedRow.quantity) : 0;
  const currentMinimum = selectedRow
    ? Math.max(toNumber(selectedRow.min_quantity), toNumber(selectedRow.product_min_stock))
    : 0;

  const consumeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) {
        throw new Error('Select a stock row before consuming stock.');
      }

      return apiRequest<StockMutationResponse>('/stock/consume', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedRow.product_id,
          storage_location_id: selectedRow.storage_location_id,
          quantity: Number(draft.quantity),
          reason: draft.reason.trim() || 'consumption'
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
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
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
        throw new Error('Select a stock row before applying a stock count.');
      }

      return apiRequest<StockMutationResponse>('/stock/count', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedRow.product_id,
          storage_location_id: selectedRow.storage_location_id,
          quantity: Number(draft.quantity),
          reason: draft.reason.trim() || 'inventory_count'
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
        throw new Error('Select a stock row before applying an adjustment.');
      }

      return apiRequest<StockMutationResponse>('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedRow.product_id,
          storage_location_id: selectedRow.storage_location_id,
          change: Number(draft.change),
          reason: draft.reason.trim() || 'manual_adjustment'
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

  const nextQuantityPreview = useMemo(() => {
    if (!selectedRow) {
      return null;
    }

    if (draft.action === 'consume') {
      const quantity = Number(draft.quantity);

      if (!Number.isFinite(quantity)) {
        return null;
      }

      return currentQuantity - quantity;
    }

    if (draft.action === 'count') {
      const quantity = Number(draft.quantity);

      if (!Number.isFinite(quantity)) {
        return null;
      }

      return quantity;
    }

    const change = Number(draft.change);

    if (!Number.isFinite(change)) {
      return null;
    }

    return currentQuantity + change;
  }, [currentQuantity, draft.action, draft.change, draft.quantity, selectedRow]);

  const stockWorkflowSteps = [
    {
      label: '1. Select Stock Row',
      detail: selectedRow
        ? `${selectedRow.product_name || selectedRow.product_id} is selected for review.`
        : 'Choose the product/location row you want to operate on.',
      complete: Boolean(selectedRow)
    },
    {
      label: '2. Choose Action',
      detail:
        draft.action === 'consume'
          ? 'Consume removes stock for day-to-day operational usage.'
          : draft.action === 'count'
            ? 'Count sets stock to the physically verified quantity.'
            : 'Adjust applies a positive or negative correction delta.',
      complete: Boolean(selectedRow)
    },
    {
      label: '3. Verify Preview',
      detail:
        nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
          ? 'Enter quantities to preview the resulting stock balance.'
          : `Projected quantity after submit: ${nextQuantityPreview}.`,
      complete: nextQuantityPreview !== null && Number.isFinite(nextQuantityPreview)
    },
    {
      label: '4. Confirm in Ledger',
      detail: recentMovements.length > 0
        ? 'Use recent stock movements below to verify the latest posted change.'
        : 'Recent movement history will appear here after stock changes are posted.',
      complete: Boolean(lastResult)
    }
  ];

  const submitAction = async () => {
    setOperationFeedback('');
    setOperationError('');

    if (!selectedRow) {
      setOperationError('Select a stock row before posting a stock action.');
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

  if (stockQuery.isLoading) {
    return <p>Loading stock...</p>;
  }

  if (stockQuery.isError) {
    return (
      <p>
        Failed to load stock: {(stockQuery.error as Error).message || 'Unknown error'}
      </p>
    );
  }

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Stock Operations</h2>
          <p style={styles.description}>
            Live stock balances, low-stock visibility, and controlled operational actions
            built directly on your existing stock routes.
          </p>
        </div>
      </div>

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

      <div style={styles.statsGrid}>
        <StatCard
          title="Stock Rows"
          value={summary.totalRows}
          subtitle="Tracked product and location balances"
        />
        <StatCard
          title="Low Stock Rows"
          value={summary.lowRows}
          subtitle="Below configured minimum threshold"
          tone={summary.lowRows > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title="Healthy Rows"
          value={summary.okRows}
          subtitle="At or above minimum threshold"
          tone="good"
        />
        <StatCard
          title="Total Quantity"
          value={summary.quantityTotal}
          subtitle="Combined visible quantity across loaded rows"
        />
      </div>

      <section style={styles.panel}>
        <div style={styles.panelHeaderWithActions}>
          <div>
            <h3 style={styles.panelTitle}>Operational Workbench</h3>
            <p style={styles.panelSubtitle}>
              Select a stock row, post a stock operation, and verify the latest movement
              history without leaving the page.
            </p>
          </div>
          <Link style={styles.secondaryLinkButton} to="/stock-movements">
            Open Full Stock Ledger
          </Link>
        </div>

        <div style={styles.roleGrid}>
          <div style={styles.roleCard}>
            <div style={styles.roleCardTitle}>Current Role</div>
            <div style={styles.roleCardValue}>{role.toUpperCase()}</div>
            <div style={styles.roleCardSubtitle}>
              Backend-aligned action permissions from the existing JWT role.
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
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={styles.emptyPanel}>
            No stock rows found. Stock operations require an existing stock row from your
            current backend contract.
          </div>
        ) : (
          <>
            <div style={styles.mobileCardGrid}>
              {rows.map((item) => {
                const quantity = toNumber(item.quantity);
                const minQuantity = Math.max(
                  toNumber(item.min_quantity),
                  toNumber(item.product_min_stock)
                );
                const lowStock = quantity < minQuantity;
                const selected = selectedRow?.id === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    style={selected ? styles.stockCardSelectedButton : styles.stockCardButton}
                    onClick={() => {
                      setSelectedStockId(item.id);
                      setOperationFeedback('');
                      setOperationError('');
                      setLastResult(null);
                    }}
                  >
                    <div style={styles.stockCardTopRow}>
                      <div>
                        <div style={styles.rowTitle}>{item.product_name || item.product_id}</div>
                        <div style={styles.rowSubtle}>
                          {item.storage_location_name || item.storage_location_id || '-'}
                        </div>
                      </div>
                      <span style={lowStock ? styles.badgeWarning : styles.badgeOk}>
                        {lowStock ? 'LOW' : 'OK'}
                      </span>
                    </div>
                    <div style={styles.stockCardMetrics}>
                      <div style={styles.stockMetricItem}>
                        <div style={styles.stockMetricLabel}>Quantity</div>
                        <div style={styles.stockMetricValue}>{quantity}</div>
                      </div>
                      <div style={styles.stockMetricItem}>
                        <div style={styles.stockMetricLabel}>Minimum</div>
                        <div style={styles.stockMetricValue}>{minQuantity}</div>
                      </div>
                      <div style={styles.stockMetricItem}>
                        <div style={styles.stockMetricLabel}>Unit</div>
                        <div style={styles.stockMetricValue}>{item.product_unit || '-'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={styles.workbenchGrid}>
              <section style={styles.workbenchColumn}>
                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>Selected Stock Row</h4>

                  {selectedRow ? (
                    <div style={styles.selectionSummary}>
                      <div style={styles.selectionPrimaryRow}>
                        <div>
                          <div style={styles.selectedTitle}>
                            {selectedRow.product_name || selectedRow.product_id}
                          </div>
                          <div style={styles.rowSubtle}>Product ID: {selectedRow.product_id}</div>
                        </div>
                        <span
                          style={
                            currentQuantity < currentMinimum
                              ? styles.badgeWarning
                              : styles.badgeOk
                          }
                        >
                          {currentQuantity < currentMinimum ? 'LOW STOCK' : 'HEALTHY'}
                        </span>
                      </div>

                      <div style={styles.selectionGrid}>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Storage Location</div>
                          <div style={styles.selectionValue}>
                            {selectedRow.storage_location_name ||
                              selectedRow.storage_location_id ||
                              '-'}
                          </div>
                        </div>
                        <div style={styles.selectionItem}>
                          <div style={styles.selectionLabel}>Current Quantity</div>
                          <div style={styles.selectionValue}>{currentQuantity}</div>
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
                    <div style={styles.emptyPanel}>Select a stock row to begin.</div>
                  )}
                </div>

                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>Action Readiness</h4>
                  <div style={styles.readinessList}>
                    <div style={styles.readinessRow}>
                      <span>Selected row</span>
                      <strong>{selectedRow ? 'Ready' : 'Required'}</strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>Current action</span>
                      <strong>{getActionLabel(draft.action)}</strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>Projected quantity</span>
                      <strong>
                        {nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
                          ? '-'
                          : nextQuantityPreview}
                      </strong>
                    </div>
                    <div style={styles.readinessRow}>
                      <span>Ledger verification</span>
                      <strong>{recentMovements.length > 0 ? 'Available' : 'Pending new action'}</strong>
                    </div>
                  </div>
                </div>

                <div style={styles.innerPanel}>
                  <h4 style={styles.sectionTitle}>Post Stock Action</h4>
                  <p style={styles.sectionDescription}>
                    Execute live stock operations against the selected row using your
                    existing backend validation, permissions, and stock movement audit.
                  </p>

                  <div style={styles.actionSelectorGrid}>
                    <button
                      type="button"
                      style={
                        draft.action === 'consume'
                          ? styles.actionTypeButtonSelected
                          : styles.actionTypeButton
                      }
                      onClick={() => {
                        setDraft(getDefaultDraft('consume'));
                        setOperationFeedback('');
                        setOperationError('');
                      }}
                    >
                      Consume
                    </button>
                    <button
                      type="button"
                      style={
                        draft.action === 'count'
                          ? styles.actionTypeButtonSelected
                          : styles.actionTypeButton
                      }
                      onClick={() => {
                        setDraft(getDefaultDraft('count'));
                        setOperationFeedback('');
                        setOperationError('');
                      }}
                    >
                      Count
                    </button>
                    <button
                      type="button"
                      style={
                        draft.action === 'adjust'
                          ? styles.actionTypeButtonSelected
                          : styles.actionTypeButton
                      }
                      onClick={() => {
                        setDraft(getDefaultDraft('adjust'));
                        setOperationFeedback('');
                        setOperationError('');
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
                    <div style={styles.warningBox}>
                      Your current role cannot consume stock from the existing backend access
                      model.
                    </div>
                  ) : null}

                  {draft.action === 'count' && !canCount ? (
                    <div style={styles.warningBox}>
                      Your current role cannot post physical counts from the existing backend
                      access model.
                    </div>
                  ) : null}

                  {draft.action === 'adjust' && !canAdjust ? (
                    <div style={styles.warningBox}>
                      Your current role cannot apply manual adjustments from the existing
                      backend access model.
                    </div>
                  ) : null}

                  <div style={styles.formGrid}>
                    {(draft.action === 'consume' || draft.action === 'count') && (
                      <div>
                        <label style={styles.label}>
                          {draft.action === 'consume' ? 'Quantity to Consume' : 'Counted Quantity'}
                        </label>
                        <input
                          style={styles.input}
                          type="number"
                          inputMode="decimal"
                          min="0"
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
                        <label style={styles.label}>Adjustment Change</label>
                        <input
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

                    <div>
                      <label style={styles.label}>Reason</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={draft.reason}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            reason: event.target.value
                          }))
                        }
                        placeholder="Required operational reason"
                      />
                    </div>
                  </div>

                  <div style={styles.previewBox}>
                    <div style={styles.previewRow}>
                      <span>Current Quantity</span>
                      <strong>{currentQuantity}</strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>Projected Quantity</span>
                      <strong>
                        {nextQuantityPreview === null || !Number.isFinite(nextQuantityPreview)
                          ? '-'
                          : nextQuantityPreview}
                      </strong>
                    </div>
                    <div style={styles.previewRow}>
                      <span>Operational Risk</span>
                      <strong>
                        {nextQuantityPreview !== null && nextQuantityPreview < 0
                          ? 'Blocked by backend'
                          : 'Within allowed range'}
                      </strong>
                    </div>
                  </div>

                  {operationFeedback ? <div style={styles.successBox}>{operationFeedback}</div> : null}
                  {operationError ? <div style={styles.errorBox}>{operationError}</div> : null}

                  <div style={styles.actionFooter}>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      disabled={
                        activeMutation ||
                        !selectedRow ||
                        (draft.action === 'consume' && !canConsume) ||
                        (draft.action === 'count' && !canCount) ||
                        (draft.action === 'adjust' && !canAdjust)
                      }
                      onClick={() => {
                        void submitAction();
                      }}
                    >
                      {activeMutation ? 'Submitting...' : getActionLabel(draft.action)}
                    </button>
                  </div>
                </div>

                {lastResult ? (
                  <div style={styles.innerPanel}>
                    <h4 style={styles.sectionTitle}>Last Operation Result</h4>
                    <div style={styles.selectionGrid}>
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
                    Immediate audit visibility for the currently selected product using the
                    existing stock movement ledger route.
                  </p>

                  {movementsQuery.isLoading ? (
                    <p style={styles.sectionDescription}>Loading stock movements...</p>
                  ) : movementsQuery.isError ? (
                    <div style={styles.errorBox}>
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
                              <div>
                                <div style={styles.movementTitle}>{movement.product_name}</div>
                                <div style={styles.rowSubtle}>
                                  {formatDateTime(movement.created_at)}
                                </div>
                              </div>
                              <span style={changeBadgeStyle(change)}>{changeDisplay(change)}</span>
                            </div>
                            <div style={styles.movementMetaRow}>
                              <span style={reasonBadgeStyle(movement.reason)}>{movement.reason}</span>
                              <span style={styles.rowSubtle}>
                                By {movement.user_name || movement.user_id || 'system'}
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
              </section>
            </div>

            <div style={styles.desktopTablePanel}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Select</th>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Storage Location</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Minimum Quantity</th>
                      <th style={styles.th}>Unit</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => {
                      const quantity = toNumber(item.quantity);
                      const minQuantity = Math.max(
                        toNumber(item.min_quantity),
                        toNumber(item.product_min_stock)
                      );
                      const lowStock = quantity < minQuantity;
                      const selected = selectedRow?.id === item.id;

                      return (
                        <tr key={item.id} style={selected ? styles.selectedRow : undefined}>
                          <td style={styles.td}>
                            <button
                              type="button"
                              style={selected ? styles.rowActionButtonSelected : styles.rowActionButton}
                              onClick={() => {
                                setSelectedStockId(item.id);
                                setOperationFeedback('');
                                setOperationError('');
                                setLastResult(null);
                              }}
                            >
                              {selected ? 'Selected' : 'Select'}
                            </button>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{item.product_name || item.product_id}</div>
                            <div style={styles.rowSubtle}>Product ID: {item.product_id}</div>
                          </td>
                          <td style={styles.td}>
                            {item.storage_location_name || item.storage_location_id || '-'}
                          </td>
                          <td style={styles.td}>{quantity}</td>
                          <td style={styles.td}>{minQuantity}</td>
                          <td style={styles.td}>{item.product_unit || '-'}</td>
                          <td style={styles.td}>
                            <span style={lowStock ? styles.badgeWarning : styles.badgeOk}>
                              {lowStock ? 'LOW' : 'OK'}
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
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
    color: '#111827'
  },
  description: {
    margin: '8px 0 0 0',
    color: '#6b7280',
    lineHeight: 1.6,
    maxWidth: '820px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534'
  },
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  panelHeaderWithActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  panelTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700
  },
  panelSubtitle: {
    margin: '8px 0 0 0',
    color: '#6b7280',
    lineHeight: 1.5,
    maxWidth: '880px'
  },
  secondaryLinkButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    background: '#ffffff',
    color: '#111827',
    border: '1px solid #d1d5db',
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
    marginBottom: '16px'
  },
  roleCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '16px'
  },
  roleCardTitle: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 600,
    marginBottom: '8px'
  },
  roleCardValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#111827',
    marginBottom: '6px'
  },
  roleCardSubtitle: {
    color: '#6b7280',
    lineHeight: 1.5,
    fontSize: '13px'
  },
  permissionCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '16px',
    display: 'grid',
    gap: '10px'
  },
  permissionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    fontSize: '14px'
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
    border: '1px dashed #d1d5db',
    borderRadius: '14px',
    background: '#f9fafb',
    color: '#4b5563',
    lineHeight: 1.6
  },
  mobileCardGrid: {
    display: 'grid',
    gap: '12px',
    marginBottom: '16px'
  },
  stockCardButton: {
    appearance: 'none',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    textAlign: 'left',
    cursor: 'pointer'
  },
  stockCardSelectedButton: {
    appearance: 'none',
    border: '2px solid #2563eb',
    background: '#eff6ff',
    borderRadius: '14px',
    padding: '16px',
    textAlign: 'left',
    cursor: 'pointer'
  },
  stockCardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '14px'
  },
  stockCardMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: '10px'
  },
  stockMetricItem: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '10px'
  },
  stockMetricLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  stockMetricValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#111827'
  },
  workbenchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  workbenchColumn: {
    display: 'grid',
    gap: '16px',
    alignContent: 'start'
  },
  innerPanel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '16px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827'
  },
  sectionDescription: {
    margin: '8px 0 0 0',
    color: '#6b7280',
    lineHeight: 1.5
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
  selectedTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#111827'
  },
  selectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px'
  },
  selectionItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px',
    background: '#f9fafb'
  },
  selectionLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px'
  },
  selectionValue: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#111827',
    wordBreak: 'break-word'
  },
  actionSelectorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
    marginTop: '16px',
    marginBottom: '14px'
  },
  actionTypeButton: {
    minHeight: '46px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
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
  actionInfoBox: {
    borderRadius: '12px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    padding: '14px',
    marginBottom: '14px'
  },
  actionInfoTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '6px'
  },
  actionInfoText: {
    color: '#6b7280',
    lineHeight: 1.5,
    fontSize: '14px'
  },
  warningBox: {
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '14px',
    lineHeight: 1.5
  },
  formGrid: {
    display: 'grid',
    gap: '14px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    minHeight: '46px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    padding: '12px 14px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  previewBox: {
    marginTop: '14px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    padding: '14px',
    display: 'grid',
    gap: '10px'
  },
  previewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    color: '#374151'
  },
  successBox: {
    background: '#ecfdf5',
    border: '1px solid #86efac',
    color: '#166534',
    borderRadius: '12px',
    padding: '12px',
    marginTop: '14px',
    lineHeight: 1.5
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '12px',
    padding: '12px',
    marginTop: '14px',
    lineHeight: 1.5
  },
  actionFooter: {
    marginTop: '14px',
    display: 'flex',
    justifyContent: 'flex-start'
  },
  primaryButton: {
    minHeight: '48px',
    borderRadius: '12px',
    border: 'none',
    background: '#111827',
    color: '#ffffff',
    padding: '0 18px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  movementList: {
    display: 'grid',
    gap: '12px',
    marginTop: '14px'
  },
  movementCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '14px',
    background: '#ffffff'
  },
  movementTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  movementTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#111827'
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
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '920px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top',
    color: '#111827'
  },
  selectedRow: {
    background: '#eff6ff'
  },
  rowTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#111827'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px'
  },
  rowActionButton: {
    minHeight: '38px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
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
  }
};
