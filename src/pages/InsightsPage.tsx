import { useState } from 'react';
import type { CSSProperties } from 'react';
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
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
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
    Added a dedicated management insights page that surfaces the advanced
    backend analytics endpoints already present in your API.

    WHY IT CHANGED
    --------------
    The backend snapshot already contains depletion risk, reorder, operational
    health, anomaly, and supplier trust analytics. The frontend needed one
    coherent place to expose them beyond the dashboard.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This turns hidden backend analytics into a sellable decision-support module
    for managers and admins.
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

  return (
    <div style={styles.page}>
      <section style={styles.statsGrid}>
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

      <Section title="Insight Controls" subtitle="Tune the lookback window for depletion and reorder recommendations.">
        <div style={styles.controlRow}>
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
          {healthQuery.isLoading ? <div style={styles.infoState}>Loading health score...</div> : null}
          {healthQuery.isError ? <div style={styles.errorState}>{toReadableError(healthQuery.error)}</div> : null}
          {healthQuery.data ? (
            <div style={styles.list}>
              <div style={styles.keyValueRow}><strong>Health Score</strong><span>{formatNumber(healthQuery.data.health_score, 0)}</span></div>
              <div style={styles.keyValueRow}><strong>Tier</strong><span>{healthQuery.data.health_tier}</span></div>
              <div style={styles.keyValueRow}><strong>Unresolved Alerts</strong><span>{healthQuery.data.metrics.unresolved_alerts}</span></div>
              <div style={styles.keyValueRow}><strong>Overdue Shipments</strong><span>{healthQuery.data.metrics.overdue_shipments}</span></div>
              <div style={styles.keyValueRow}><strong>Low Stock Rate</strong><span>{formatNumber(healthQuery.data.metrics.low_stock_rate_pct)}%</span></div>
              <div style={styles.keyValueRow}><strong>Discrepancy Rate</strong><span>{formatNumber(healthQuery.data.metrics.discrepancy_rate_pct)}%</span></div>
            </div>
          ) : null}
        </Section>

        <Section title="Supplier Trust" subtitle="Supplier trust scores derived from completion, overdue, fill, and discrepancy behavior.">
          {supplierTrustQuery.isLoading ? <div style={styles.infoState}>Loading supplier trust...</div> : null}
          {supplierTrustQuery.isError ? <div style={styles.errorState}>{toReadableError(supplierTrustQuery.error)}</div> : null}
          {supplierTrustQuery.data?.rows.length ? (
            <div style={styles.list}>
              {supplierTrustQuery.data.rows.slice(0, 8).map((row) => (
                <article key={row.supplier_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.supplier_name}</div>
                  <div style={styles.itemMeta}>Trust {formatNumber(row.trust_score, 0)} · Tier {row.trust_tier}</div>
                  <div style={styles.itemText}>Completion {formatNumber(row.completion_rate_pct)}% · Overdue {formatNumber(row.overdue_rate_pct)}% · Fill {formatNumber(row.fill_rate_pct)}%</div>
                </article>
              ))}
            </div>
          ) : !supplierTrustQuery.isLoading ? <div style={styles.infoState}>No supplier trust rows returned.</div> : null}
        </Section>
      </div>

      <div style={styles.grid}>
        <Section title="Depletion Risk" subtitle="Products and locations under the greatest consumption pressure relative to stock on hand.">
          {depletionRiskQuery.isLoading ? <div style={styles.infoState}>Loading depletion risk...</div> : null}
          {depletionRiskQuery.isError ? <div style={styles.errorState}>{toReadableError(depletionRiskQuery.error)}</div> : null}
          {depletionRiskQuery.data?.rows.length ? (
            <div style={styles.list}>
              {depletionRiskQuery.data.rows.slice(0, 10).map((row) => (
                <article key={row.stock_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>{row.storage_location_name} · Risk {formatNumber(row.risk_score, 0)} · Tier {row.risk_tier}</div>
                  <div style={styles.itemText}>Qty {formatNumber(row.current_quantity)} · Min {formatNumber(row.configured_min_quantity)} · Coverage {row.estimated_days_of_coverage == null ? '-' : formatNumber(row.estimated_days_of_coverage)} days</div>
                </article>
              ))}
            </div>
          ) : !depletionRiskQuery.isLoading ? <div style={styles.infoState}>No depletion risk rows returned.</div> : null}
        </Section>

        <Section title="Reorder Recommendations" subtitle="Explainable reorder quantities based on current stock and recent outbound usage.">
          {reorderQuery.isLoading ? <div style={styles.infoState}>Loading reorder recommendations...</div> : null}
          {reorderQuery.isError ? <div style={styles.errorState}>{toReadableError(reorderQuery.error)}</div> : null}
          {reorderQuery.data?.rows.length ? (
            <div style={styles.list}>
              {reorderQuery.data.rows.slice(0, 10).map((row) => (
                <article key={row.product_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>Urgency {row.urgency} · Reorder {formatNumber(row.recommended_reorder_quantity)}</div>
                  <div style={styles.itemText}>Current {formatNumber(row.current_quantity)} · Min {formatNumber(row.min_stock)} · Avg Daily Usage {formatNumber(row.average_daily_usage)}</div>
                </article>
              ))}
            </div>
          ) : !reorderQuery.isLoading ? <div style={styles.infoState}>No reorder recommendation rows returned.</div> : null}
        </Section>
      </div>

      <Section title="Inventory Anomalies" subtitle="Products whose recent outbound activity looks unusual compared to their own baseline.">
        {anomaliesQuery.isLoading ? <div style={styles.infoState}>Loading anomaly signals...</div> : null}
        {anomaliesQuery.isError ? <div style={styles.errorState}>{toReadableError(anomaliesQuery.error)}</div> : null}
        {anomaliesQuery.data?.rows.length ? (
          <div style={styles.list}>
            {anomaliesQuery.data.rows.slice(0, 10).map((row) => (
              <article key={row.product_id} style={styles.itemCard}>
                <div style={styles.itemTitle}>{row.product_name}</div>
                <div style={styles.itemMeta}>Anomaly {formatNumber(row.anomaly_score, 0)} · Tier {row.anomaly_tier}</div>
                <div style={styles.itemText}>Recent Daily {formatNumber(row.recent_daily_outbound)} · Baseline Daily {formatNumber(row.baseline_daily_outbound)} · Spike Ratio {formatNumber(row.spike_ratio)}</div>
              </article>
            ))}
          </div>
        ) : !anomaliesQuery.isLoading ? <div style={styles.infoState}>No anomaly rows returned.</div> : null}
      </Section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' },
  statCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '18px' },
  statTitle: { color: '#64748b', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  statValue: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' },
  statValueGood: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#166534' },
  statValueWarn: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#b45309' },
  statValueBad: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#b91c1c' },
  statSubtitle: { marginTop: '8px', color: '#475569', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '20px', display: 'grid', gap: '16px' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  panelTitle: { margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' },
  panelSubtitle: { margin: '8px 0 0 0', color: '#475569', lineHeight: 1.5 },
  controlRow: { display: 'flex', flexWrap: 'wrap', gap: '12px' },
  label: { display: 'grid', gap: '8px', fontWeight: 600, color: '#334155' },
  select: { border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px', fontSize: '0.95rem', minWidth: '180px' },
  list: { display: 'grid', gap: '12px' },
  itemCard: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px', display: 'grid', gap: '8px' },
  itemTitle: { fontWeight: 800, color: '#0f172a' },
  itemMeta: { color: '#64748b', fontSize: '0.88rem' },
  itemText: { color: '#334155', lineHeight: 1.5 },
  keyValueRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' },
  infoState: { background: '#f8fafc', color: '#475569', borderRadius: '12px', padding: '12px 14px' },
  errorState: { background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px 14px', lineHeight: 1.5 }
};
