import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type DepletionRiskResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number;
  rows: Array<{
    stock_id: string;
    product_id: string;
    product_name: string;
    product_category?: string | null;
    product_unit?: string | null;
    storage_location_name: string;
    current_quantity: number | string;
    configured_min_quantity: number | string;
    recent_outbound_quantity: number | string;
    average_daily_outbound: number | string;
    estimated_days_of_coverage: number | null;
    risk_score: number | string;
    risk_tier: string;
  }>;
};

type ReorderRecommendationsResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number;
  rows: Array<{
    product_id: string;
    product_name: string;
    unit: string;
    current_quantity: number | string;
    min_stock: number | string;
    average_daily_usage: number | string;
    estimated_days_of_coverage: number | null;
    recommended_reorder_quantity: number | string;
    urgency: string;
  }>;
};

type OperationalHealthResponse = {
  generated_at: string;
  tenant_id: string;
  health_score: number | string;
  health_tier: string;
  metrics: {
    unresolved_alerts: number;
    overdue_shipments: number;
    total_stock_rows: number;
    low_stock_rows: number;
    low_stock_rate_pct: number | string;
    discrepancy_rate_pct: number | string;
  };
};

type AnomaliesResponse = {
  generated_at: string;
  tenant_id: string;
  short_window_days: number;
  baseline_window_days: number;
  rows: Array<{
    product_id: string;
    product_name: string;
    product_category?: string | null;
    product_unit?: string | null;
    recent_daily_outbound: number | string;
    baseline_daily_outbound: number | string;
    spike_ratio: number | string;
    anomaly_score: number | string;
    anomaly_tier: string;
  }>;
};

type SupplierTrustResponse = {
  generated_at: string;
  tenant_id: string;
  rows: Array<{
    supplier_id: string;
    supplier_name: string;
    completion_rate_pct: number | string;
    overdue_rate_pct: number | string;
    fill_rate_pct: number | string;
    discrepancy_rate_pct: number | string;
    trust_score: number | string;
    trust_tier: string;
    total_shipments: number | string;
  }>;
};

function toReadableError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatNumber(value: number | string | null | undefined, digits = 2): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(toNumber(value));
}

async function fetchDepletionRisk(lookbackDays: number): Promise<DepletionRiskResponse> {
  return apiRequest<DepletionRiskResponse>(`/inventory-insights/depletion-risk?lookback_days=${lookbackDays}`);
}

async function fetchReorderRecommendations(lookbackDays: number): Promise<ReorderRecommendationsResponse> {
  return apiRequest<ReorderRecommendationsResponse>(`/reorder-insights/recommendations?lookback_days=${lookbackDays}`);
}

async function fetchOperationalHealth(): Promise<OperationalHealthResponse> {
  return apiRequest<OperationalHealthResponse>('/operational-insights/health-score');
}

async function fetchAnomalies(): Promise<AnomaliesResponse> {
  return apiRequest<AnomaliesResponse>('/operational-insights/anomalies');
}

async function fetchSupplierTrust(): Promise<SupplierTrustResponse> {
  return apiRequest<SupplierTrustResponse>('/supplier-insights/trust-scores');
}

function Section(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="app-panel app-panel--padded" style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={styles.panelHeaderText}>
          <h3 style={styles.panelTitle}>{props.title}</h3>
          <p style={styles.panelSubtitle}>{props.subtitle}</p>
        </div>
      </div>
      {props.children}
    </section>
  );
}

function StatCard(props: { title: string; value: string; subtitle: string; tone?: 'default' | 'warn' | 'bad' | 'good' }) {
  const valueStyle =
    props.tone === 'bad'
      ? styles.statValueBad
      : props.tone === 'warn'
        ? styles.statValueWarn
        : props.tone === 'good'
          ? styles.statValueGood
          : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function InsightsPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the InsightsPage you sent.

    Existing real behavior is preserved:
    - same insight endpoints
    - same query keys
    - same action-agenda logic
    - same operational health / supplier trust / depletion / reorder / anomaly rendering
    - same route targets and analytics text

    This pass applies the shared UI foundation carefully:
    - major sections now use app-panel/app-panel--padded
    - stats now use app-grid-stats
    - info/error states align with the shared state layer
    - no analytics logic was changed

    WHAT PROBLEM IT SOLVES
    ----------------------
    Makes Insights consume the same shared visual system as the other polished
    pages without changing backend contracts, flows, or decision logic.
  */
  const [lookbackDays, setLookbackDays] = useState(30);

  const depletionRiskQuery = useQuery({
    queryKey: ['insights', 'depletion-risk', lookbackDays],
    queryFn: () => fetchDepletionRisk(lookbackDays)
  });

  const reorderQuery = useQuery({
    queryKey: ['insights', 'reorder-recommendations', lookbackDays],
    queryFn: () => fetchReorderRecommendations(lookbackDays)
  });

  const healthQuery = useQuery({
    queryKey: ['insights', 'health-score'],
    queryFn: fetchOperationalHealth
  });

  const anomaliesQuery = useQuery({
    queryKey: ['insights', 'anomalies'],
    queryFn: fetchAnomalies
  });

  const supplierTrustQuery = useQuery({
    queryKey: ['insights', 'supplier-trust'],
    queryFn: fetchSupplierTrust
  });

  const actionAgenda = useMemo(() => {
    const nextActions: Array<{
      title: string;
      detail: string;
      route: string;
      linkLabel: string;
      tone: 'good' | 'warn' | 'bad';
    }> = [];

    const healthTier = healthQuery.data?.health_tier;
    if (healthTier === 'critical' || healthTier === 'watch') {
      nextActions.push({
        title: 'Operational health needs review',
        detail: `Current tenant health is ${healthTier}. Review low stock, overdue shipments, and unresolved alerts first.`,
        route: '/dashboard?panel=operational-health',
        linkLabel: 'Open Dashboard',
        tone: healthTier === 'critical' ? 'bad' : 'warn'
      });
    }

    const reorderTop = reorderQuery.data?.rows?.[0];
    if (reorderTop) {
      nextActions.push({
        title: 'Reorder highest urgency product',
        detail: `${reorderTop.product_name} currently recommends a reorder quantity of ${formatNumber(reorderTop.recommended_reorder_quantity)}.`,
        route: reorderTop ? `/products?search=${encodeURIComponent(reorderTop.product_name)}` : '/products',
        linkLabel: 'Open Reports',
        tone: reorderTop.urgency === 'critical' ? 'bad' : 'warn'
      });
    }

    const depletionTop = depletionRiskQuery.data?.rows?.[0];
    if (depletionTop) {
      nextActions.push({
        title: 'Protect depletion-risk stock',
        detail: `${depletionTop.product_name} at ${depletionTop.storage_location_name} is currently one of the highest depletion-risk rows.`,
        route: depletionTop ? `/stock?productId=${encodeURIComponent(depletionTop.product_id)}` : '/stock',
        linkLabel: 'Open Stock',
        tone: depletionTop.risk_tier === 'critical' ? 'bad' : 'warn'
      });
    }

    const anomalyTop = anomaliesQuery.data?.rows?.[0];
    if (anomalyTop) {
      nextActions.push({
        title: 'Review unusual outbound activity',
        detail: `${anomalyTop.product_name} is showing an anomaly spike ratio of ${formatNumber(anomalyTop.spike_ratio)} against baseline demand.`,
        route: anomalyTop ? `/stock-movements?productId=${encodeURIComponent(anomalyTop.product_id)}` : '/stock-movements',
        linkLabel: 'Open Stock Movements',
        tone: anomalyTop.anomaly_tier === 'critical' ? 'bad' : 'warn'
      });
    }

    const supplierBottom = [...(supplierTrustQuery.data?.rows ?? [])]
      .sort((a, b) => toNumber(a.trust_score) - toNumber(b.trust_score))[0];

    if (supplierBottom) {
      nextActions.push({
        title: 'Follow up lowest-trust supplier',
        detail: `${supplierBottom.supplier_name} currently scores ${formatNumber(supplierBottom.trust_score, 0)} on supplier trust.`,
        route: supplierBottom ? `/suppliers?search=${encodeURIComponent(supplierBottom.supplier_name)}` : '/suppliers',
        linkLabel: 'Open Suppliers',
        tone: toNumber(supplierBottom.trust_score) < 50 ? 'bad' : 'warn'
      });
    }

    return nextActions.slice(0, 4);
  }, [
    anomaliesQuery.data?.rows,
    depletionRiskQuery.data?.rows,
    healthQuery.data?.health_tier,
    reorderQuery.data?.rows,
    supplierTrustQuery.data?.rows
  ]);

  return (
    <div style={styles.page}>
      <section className="app-grid-stats" style={styles.statsGrid}>
        <StatCard
          title="Operational Health"
          value={healthQuery.data ? formatNumber(healthQuery.data.health_score, 0) : '-'}
          subtitle={healthQuery.data ? `Current tier: ${healthQuery.data.health_tier}` : 'Tenant-level health score.'}
          tone={healthQuery.data?.health_tier === 'critical' ? 'bad' : healthQuery.data?.health_tier === 'watch' ? 'warn' : 'good'}
        />
        <StatCard
          title="Depletion Rows"
          value={depletionRiskQuery.data ? String(depletionRiskQuery.data.rows.length) : '-'}
          subtitle="Products/locations currently ranked for depletion pressure."
        />
        <StatCard
          title="Reorder Candidates"
          value={reorderQuery.data ? String(reorderQuery.data.rows.length) : '-'}
          subtitle="Products with a recommended reorder quantity."
        />
        <StatCard
          title="Supplier Trust Rows"
          value={supplierTrustQuery.data ? String(supplierTrustQuery.data.rows.length) : '-'}
          subtitle="Suppliers scored from real shipment behavior."
        />
      </section>

      <Section title="What needs action next" subtitle="Use these recommendations to move from analytics into operational decisions.">
        {actionAgenda.length ? (
          <div style={styles.actionAgendaGrid}>
            {actionAgenda.map((item) => (
              <article
                key={item.title}
                style={item.tone === 'bad' ? styles.actionCardBad : item.tone === 'warn' ? styles.actionCardWarn : styles.actionCardGood}
              >
                <div style={styles.actionCardTitle}>{item.title}</div>
                <div style={styles.actionCardText}>{item.detail}</div>
                <Link to={item.route} style={styles.actionCardLink}>
                  {item.linkLabel}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="app-empty-state" style={styles.infoState}>
            No urgent action agenda is available yet. As data accumulates, this section will point managers to the next best operational decisions.
          </div>
        )}
      </Section>

      <Section title="Insight Controls" subtitle="Tune the lookback window for depletion and reorder recommendations.">
        <div className="app-actions" style={styles.controlRow}>
          <label style={styles.label}>
            Lookback Days
            <select style={styles.select} value={lookbackDays} onChange={(event) => setLookbackDays(Number(event.target.value))}>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
        </div>
      </Section>

      <div style={styles.grid}>
        <Section title="Operational Health Score" subtitle="Tenant-level health based on alerts, overdue shipments, low-stock pressure, and discrepancy pressure.">
          {healthQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading health score...</div> : null}
          {healthQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(healthQuery.error)}</div> : null}
          {healthQuery.data ? (
            <div style={styles.list}>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Health Score</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.health_score, 0)}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Tier</strong>
                <span style={styles.keyValue}>{healthQuery.data.health_tier}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Unresolved Alerts</strong>
                <span style={styles.keyValue}>{healthQuery.data.metrics.unresolved_alerts}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Overdue Shipments</strong>
                <span style={styles.keyValue}>{healthQuery.data.metrics.overdue_shipments}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Low Stock Rate</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.metrics.low_stock_rate_pct)}%</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Discrepancy Rate</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.metrics.discrepancy_rate_pct)}%</span>
              </div>
            </div>
          ) : null}
        </Section>

        <Section title="Supplier Trust" subtitle="Supplier trust scores derived from completion, overdue, fill, and discrepancy behavior.">
          {supplierTrustQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading supplier trust...</div> : null}
          {supplierTrustQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(supplierTrustQuery.error)}</div> : null}
          {supplierTrustQuery.data?.rows.length ? (
            <div style={styles.list}>
              {supplierTrustQuery.data.rows.slice(0, 8).map((row) => (
                <article key={row.supplier_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.supplier_name}</div>
                  <div style={styles.itemMeta}>Trust {formatNumber(row.trust_score, 0)} · Tier {row.trust_tier}</div>
                  <div style={styles.itemText}>
                    Completion {formatNumber(row.completion_rate_pct)}% · Overdue {formatNumber(row.overdue_rate_pct)}% · Fill {formatNumber(row.fill_rate_pct)}%
                  </div>
                  <Link to={`/suppliers?search=${encodeURIComponent(row.supplier_name)}`} style={styles.inlineActionLink}>
                    Open Supplier
                  </Link>
                </article>
              ))}
            </div>
          ) : !supplierTrustQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>No supplier trust rows returned.</div> : null}
        </Section>
      </div>

      <div style={styles.grid}>
        <Section title="Depletion Risk" subtitle="Products and locations under the greatest consumption pressure relative to stock on hand.">
          {depletionRiskQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading depletion risk...</div> : null}
          {depletionRiskQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(depletionRiskQuery.error)}</div> : null}
          {depletionRiskQuery.data?.rows.length ? (
            <div style={styles.list}>
              {depletionRiskQuery.data.rows.slice(0, 10).map((row) => (
                <article key={row.stock_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>
                    {row.storage_location_name} · Risk {formatNumber(row.risk_score, 0)} · Tier {row.risk_tier}
                  </div>
                  <div style={styles.itemText}>
                    Qty {formatNumber(row.current_quantity)} · Min {formatNumber(row.configured_min_quantity)} · Coverage{' '}
                    {row.estimated_days_of_coverage == null ? '-' : formatNumber(row.estimated_days_of_coverage)} days
                  </div>
                  <Link to={`/stock?productId=${encodeURIComponent(row.product_id)}`} style={styles.inlineActionLink}>
                    Open in Stock
                  </Link>
                </article>
              ))}
            </div>
          ) : !depletionRiskQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>No depletion risk rows returned.</div> : null}
        </Section>

        <Section title="Reorder Recommendations" subtitle="Explainable reorder quantities based on current stock and recent outbound usage.">
          {reorderQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading reorder recommendations...</div> : null}
          {reorderQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(reorderQuery.error)}</div> : null}
          {reorderQuery.data?.rows.length ? (
            <div style={styles.list}>
              {reorderQuery.data.rows.slice(0, 10).map((row) => (
                <article key={row.product_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>Urgency {row.urgency} · Reorder {formatNumber(row.recommended_reorder_quantity)}</div>
                  <div style={styles.itemText}>
                    Current {formatNumber(row.current_quantity)} · Min {formatNumber(row.min_stock)} · Avg Daily Usage {formatNumber(row.average_daily_usage)}
                  </div>
                  <Link to={`/products?search=${encodeURIComponent(row.product_name)}`} style={styles.inlineActionLink}>
                    Open Product
                  </Link>
                </article>
              ))}
            </div>
          ) : !reorderQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>No reorder recommendation rows returned.</div> : null}
        </Section>
      </div>

      <Section title="Inventory Anomalies" subtitle="Products whose recent outbound activity looks unusual compared to their own baseline.">
        {anomaliesQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading anomaly signals...</div> : null}
        {anomaliesQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(anomaliesQuery.error)}</div> : null}
        {anomaliesQuery.data?.rows.length ? (
          <div style={styles.list}>
            {anomaliesQuery.data.rows.slice(0, 10).map((row) => (
              <article key={row.product_id} style={styles.itemCard}>
                <div style={styles.itemTitle}>{row.product_name}</div>
                <div style={styles.itemMeta}>Anomaly {formatNumber(row.anomaly_score, 0)} · Tier {row.anomaly_tier}</div>
                <div style={styles.itemText}>
                  Recent Daily {formatNumber(row.recent_daily_outbound)} · Baseline Daily {formatNumber(row.baseline_daily_outbound)} · Spike Ratio {formatNumber(row.spike_ratio)}
                </div>
                <Link to={`/stock-movements?productId=${encodeURIComponent(row.product_id)}`} style={styles.inlineActionLink}>
                  Open Movements
                </Link>
              </article>
            ))}
          </div>
        ) : !anomaliesQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>No anomaly rows returned.</div> : null}
      </Section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'grid',
    gap: '20px',
    width: '100%',
    minWidth: 0
  },
  statsGrid: {
    width: '100%',
    minWidth: 0
  },
  statCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '18px',
    minWidth: 0
  },
  statTitle: {
    color: '#64748b',
    fontSize: '0.82rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  },
  statValue: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  statValueGood: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#166534'
  },
  statValueWarn: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#b45309'
  },
  statValueBad: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#b91c1c'
  },
  statSubtitle: {
    marginTop: '8px',
    color: '#475569',
    lineHeight: 1.5
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
    gap: '20px',
    width: '100%',
    minWidth: 0
  },
  panel: {
    minWidth: 0,
    overflow: 'hidden'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    minWidth: 0
  },
  panelHeaderText: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  panelSubtitle: {
    margin: '8px 0 0 0',
    color: '#475569',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  controlRow: {
    minWidth: 0
  },
  label: {
    display: 'grid',
    gap: '8px',
    fontWeight: 600,
    color: '#334155',
    minWidth: 0
  },
  select: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '0.95rem',
    minWidth: '180px',
    maxWidth: '100%'
  },
  list: {
    display: 'grid',
    gap: '12px',
    minWidth: 0
  },
  actionAgendaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    minWidth: 0
  },
  actionCardBad: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardWarn: {
    border: '1px solid #fde68a',
    background: '#fffbeb',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardGood: {
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardTitle: {
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  actionCardText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  actionCardLink: {
    color: '#1d4ed8',
    fontWeight: 700,
    textDecoration: 'none'
  },
  itemCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '8px',
    minWidth: 0
  },
  itemTitle: {
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  itemMeta: {
    color: '#64748b',
    fontSize: '0.88rem',
    lineHeight: 1.45,
    wordBreak: 'break-word'
  },
  itemText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  keyValueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '10px',
    minWidth: 0
  },
  keyLabel: {
    flexShrink: 0
  },
  keyValue: {
    minWidth: 0,
    flex: '1 1 220px',
    textAlign: 'right',
    wordBreak: 'break-word'
  },
  infoState: {
    margin: 0
  },
  errorState: {
    margin: 0
  },
  inlineActionLink: {
    color: '#1d4ed8',
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: '0.92rem'
  }
};