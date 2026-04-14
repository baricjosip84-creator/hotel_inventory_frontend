import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';

type StockItem = {
  id: string;
  product_id: string;
  product_name?: string;
  storage_location_id?: string;
  storage_location_name?: string;
  quantity: number | string;
  min_quantity?: number | string | null;
};

async function fetchStock(): Promise<StockItem[]> {
  return apiRequest<StockItem[]>('/stock');
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
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
  const query = useQuery({
    queryKey: ['stock'],
    queryFn: fetchStock
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  const summary = useMemo(() => {
    let low = 0;
    let ok = 0;
    let quantityTotal = 0;

    for (const item of rows) {
      const quantity = toNumber(item.quantity);
      const minQuantity = toNumber(item.min_quantity);

      quantityTotal += quantity;

      if (quantity < minQuantity) {
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

  if (query.isLoading) {
    return <p>Loading stock...</p>;
  }

  if (query.isError) {
    return <p>Failed to load stock: {(query.error as Error).message || 'Unknown error'}</p>;
  }

  return (
    <div>
      <div style={styles.statsGrid}>
        <StatCard
          title="Stock Rows"
          value={summary.totalRows}
          subtitle="Tracked stock positions"
        />
        <StatCard
          title="Low Stock Rows"
          value={summary.lowRows}
          subtitle="Below configured minimum"
          tone={summary.lowRows > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title="Healthy Rows"
          value={summary.okRows}
          subtitle="At or above minimum"
          tone="good"
        />
        <StatCard
          title="Total Quantity"
          value={summary.quantityTotal}
          subtitle="Combined visible quantity"
        />
      </div>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h3 style={styles.panelTitle}>Stock Overview</h3>
            <p style={styles.panelSubtitle}>
              Current stock per product and storage location, with low-stock highlighting.
            </p>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Storage Location</th>
                <th style={styles.th}>Quantity</th>
                <th style={styles.th}>Minimum Quantity</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={5}>
                    No stock rows found.
                  </td>
                </tr>
              ) : (
                rows.map((item) => {
                  const quantity = toNumber(item.quantity);
                  const minQuantity = toNumber(item.min_quantity);
                  const lowStock = quantity < minQuantity;

                  return (
                    <tr key={item.id}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{item.product_name || item.product_id}</div>
                        <div style={styles.rowSubtle}>Product ID: {item.product_id}</div>
                      </td>
                      <td style={styles.td}>
                        {item.storage_location_name || item.storage_location_id || '-'}
                      </td>
                      <td style={styles.td}>{quantity}</td>
                      <td style={styles.td}>{minQuantity}</td>
                      <td style={styles.td}>
                        <span style={lowStock ? styles.badgeWarning : styles.badgeOk}>
                          {lowStock ? 'LOW' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
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
  panelHeader: {
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
    lineHeight: 1.5
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
    minWidth: '800px'
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
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  badgeOk: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#f0fdf4',
    color: '#166534',
    fontWeight: 700,
    fontSize: '12px'
  },
  badgeWarning: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#fef3c7',
    color: '#92400e',
    fontWeight: 700,
    fontSize: '12px'
  }
};