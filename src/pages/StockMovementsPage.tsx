import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';

/**
 * ============================================================================
 * StockMovementsPage
 * ============================================================================
 *
 * PURPOSE
 * ----------------------------------------------------------------------------
 * This page gives operators traceability:
 * - what stock changed
 * - by how much
 * - why
 * - who did it
 * - whether it came from a shipment
 *
 * BACKEND CONTRACT
 * ----------------------------------------------------------------------------
 * GET /stock/movements
 *
 * Optional query parameters:
 * - product_id
 * - shipment_id
 * - reason
 * - search
 */

type ProductOption = {
  id: string;
  name: string;
};

type ShipmentOption = {
  id: string;
  po_number?: string | null;
  supplier_name?: string;
  status?: string;
};

type StockMovement = {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  shipment_id?: string | null;
  shipment_po_number?: string | null;
  change: number | string;
  reason: string;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;
};

type FiltersState = {
  product_id: string;
  shipment_id: string;
  reason: string;
  search: string;
};

async function fetchProducts(): Promise<ProductOption[]> {
  return apiRequest<ProductOption[]>('/products');
}

async function fetchShipments(): Promise<ShipmentOption[]> {
  return apiRequest<ShipmentOption[]>('/shipments');
}

async function fetchStockMovements(filters: FiltersState): Promise<StockMovement[]> {
  const params = new URLSearchParams();

  if (filters.product_id) {
    params.set('product_id', filters.product_id);
  }

  if (filters.shipment_id) {
    params.set('shipment_id', filters.shipment_id);
  }

  if (filters.reason) {
    params.set('reason', filters.reason);
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
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
  if (value > 0) return `+${value}`;
  return String(value);
}

export default function StockMovementsPage() {
  const [filters, setFilters] = useState<FiltersState>({
    product_id: '',
    shipment_id: '',
    reason: '',
    search: ''
  });

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  const shipmentsQuery = useQuery({
    queryKey: ['shipments'],
    queryFn: fetchShipments
  });

  const movementsQuery = useQuery({
    queryKey: ['stock-movements', filters],
    queryFn: () => fetchStockMovements(filters)
  });

  const movements = useMemo(() => movementsQuery.data ?? [], [movementsQuery.data]);

  const summary = useMemo(() => {
    let positive = 0;
    let negative = 0;
    let total = 0;

    for (const movement of movements) {
      const amount = toNumber(movement.change);
      total += amount;

      if (amount > 0) {
        positive += amount;
      } else if (amount < 0) {
        negative += Math.abs(amount);
      }
    }

    return {
      rowCount: movements.length,
      positive,
      negative,
      net: total
    };
  }, [movements]);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Stock Movements</h2>
          <p style={styles.description}>
            Trace stock changes by product, shipment, reason, and operator. This is your
            operational stock ledger.
          </p>
        </div>
      </div>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Filters</h3>

        <div style={styles.filtersGrid}>
          <div>
            <label style={styles.label}>Product</label>
            <select
              style={styles.input}
              value={filters.product_id}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  product_id: event.target.value
                }))
              }
            >
              <option value="">All products</option>
              {(productsQuery.data ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Shipment</label>
            <select
              style={styles.input}
              value={filters.shipment_id}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  shipment_id: event.target.value
                }))
              }
            >
              <option value="">All shipments</option>
              {(shipmentsQuery.data ?? []).map((shipment) => (
                <option key={shipment.id} value={shipment.id}>
                  {shipment.po_number || shipment.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Reason</label>
            <select
              style={styles.input}
              value={filters.reason}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  reason: event.target.value
                }))
              }
            >
              <option value="">All reasons</option>
              <option value="shipment_receive">shipment_receive</option>
              <option value="consumption">consumption</option>
              <option value="adjustment">adjustment</option>
              <option value="count">count</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Search</label>
            <input
              style={styles.input}
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value
                }))
              }
              placeholder="Search by product, user, or reason"
            />
          </div>
        </div>
      </section>

      <section style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Rows</div>
          <div style={styles.summaryValue}>{summary.rowCount}</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Inbound</div>
          <div style={styles.summaryValue}>{summary.positive}</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Outbound</div>
          <div style={styles.summaryValue}>{summary.negative}</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Net Change</div>
          <div style={styles.summaryValue}>{summary.net}</div>
        </div>
      </section>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Movement Ledger</h3>

        {movementsQuery.isLoading ? <p>Loading stock movements...</p> : null}

        {movementsQuery.isError ? (
          <p>
            Failed to load stock movements:{' '}
            {(movementsQuery.error as Error).message || 'Unknown error'}
          </p>
        ) : null}

        {!movementsQuery.isLoading && !movementsQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Change</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Shipment</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Movement ID</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={7}>
                      No stock movements found for the current filters.
                    </td>
                  </tr>
                ) : (
                  movements.map((movement) => {
                    const amount = toNumber(movement.change);

                    return (
                      <tr key={movement.id}>
                        <td style={styles.td}>{formatDateTime(movement.created_at)}</td>
                        <td style={styles.td}>
                          <div style={styles.rowTitle}>{movement.product_name}</div>
                          <div style={styles.rowSubtle}>
                            Product ID: {movement.product_id}
                          </div>
                          <div style={styles.rowSubtle}>
                            Unit: {movement.product_unit}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={changeBadgeStyle(amount)}>
                            {changeDisplay(amount)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={reasonBadgeStyle(movement.reason)}>
                            {movement.reason}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {movement.shipment_id ? (
                            <>
                              <div style={styles.rowTitle}>
                                {movement.shipment_po_number || movement.shipment_id}
                              </div>
                              <div style={styles.rowSubtle}>
                                Shipment ID: {movement.shipment_id}
                              </div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={styles.td}>{movement.user_name || movement.user_id || '-'}</td>
                        <td style={styles.td}>
                          <div style={styles.rowSubtle}>{movement.id}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}
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
    fontWeight: 700
  },
  description: {
    marginTop: '8px',
    color: '#6b7280',
    lineHeight: 1.5
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    marginBottom: '20px'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '20px',
    fontWeight: 700
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    marginBottom: '20px'
  },
  summaryCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px'
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 600,
    marginBottom: '10px'
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 700
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none'
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
    minWidth: '1150px'
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
    fontSize: '14px',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  badgeBase: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
    wordBreak: 'break-all'
  }
};