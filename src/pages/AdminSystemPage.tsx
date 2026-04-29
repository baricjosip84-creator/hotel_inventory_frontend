import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

type BlockingAlertRow = {
  id: string;
  tenant_id: string;
  product_id?: string | null;
  type: string;
  message: string;
  severity: string;
  created_at: string;
  acknowledged: boolean;
};

type StockIntegrityRow = {
  id: string;
  tenant_id: string;
  product_id: string;
  storage_location_id: string;
  quantity: number | string;
  updated_at: string;
};

type BrokenShipmentRow = {
  id: string;
  tenant_id: string;
  status: string;
  total_ordered_quantity: number | string;
  total_received_quantity: number | string;
};

type SystemStatusResponse = {
  system_write_locked?: boolean;
  maintenance_mode?: boolean;
  blocking_alerts?: BlockingAlertRow[];
  status?: string;
  tenant_id?: string;
  timestamp?: string;
};

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

function Section(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="app-panel app-panel--padded" style={styles.panel}>
      <h3 style={styles.panelTitle}>{props.title}</h3>
      <p style={styles.panelSubtitle}>{props.subtitle}</p>
      {props.children}
    </section>
  );
}

function StatCard(props: { title: string; value: string; subtitle: string; tone?: 'default' | 'warn' | 'bad' }) {
  const valueStyle = props.tone === 'bad' ? styles.statValueBad : props.tone === 'warn' ? styles.statValueWarn : styles.statValue;
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function AdminSystemPage() {
  const capabilities = getRoleCapabilities();

  const systemStatusQuery = useQuery({
    queryKey: ['admin-system', 'system-status'],
    queryFn: () => apiRequest<SystemStatusResponse>('/system-status')
  });

  const blockingAlertsQuery = useQuery({
    queryKey: ['admin-system', 'blocking-alerts'],
    queryFn: () => apiRequest<BlockingAlertRow[]>('/admin/diagnostics/blocking-alerts'),
    enabled: capabilities.isAdmin
  });

  const stockIntegrityQuery = useQuery({
    queryKey: ['admin-system', 'stock-integrity'],
    queryFn: () => apiRequest<StockIntegrityRow[]>('/admin/diagnostics/stock-integrity'),
    enabled: capabilities.isAdmin
  });

  const brokenShipmentsQuery = useQuery({
    queryKey: ['admin-system', 'broken-shipments'],
    queryFn: () => apiRequest<BrokenShipmentRow[]>('/admin/diagnostics/broken-shipments'),
    enabled: capabilities.isAdmin
  });

  const writeLock = systemStatusQuery.data?.system_write_locked ? 'Locked' : 'Open';
  const maintenance = systemStatusQuery.data?.maintenance_mode ? 'Enabled' : 'Disabled';
  const blockingCount = systemStatusQuery.data?.blocking_alerts?.length ?? 0;

  return (
    <div style={styles.page}>
      <section className="app-grid-stats" style={styles.statsGrid}>
        <StatCard title="Write Status" value={writeLock} subtitle="Current system write-lock posture." tone={writeLock === 'Locked' ? 'bad' : 'default'} />
        <StatCard title="Maintenance" value={maintenance} subtitle="Maintenance-mode visibility from system flags." tone={maintenance === 'Enabled' ? 'warn' : 'default'} />
        <StatCard title="Blocking Alerts" value={String(blockingCount)} subtitle="Tenant-scoped blocking alerts from /system-status." tone={blockingCount > 0 ? 'bad' : 'default'} />
      </section>

      <div style={styles.grid}>
        <Section title="System Status" subtitle="Tenant-scoped status for the current company.">
          {systemStatusQuery.isLoading ? <div className="app-empty-state">Loading system status...</div> : null}
          {systemStatusQuery.error ? <div className="app-error-state">{readableError(systemStatusQuery.error)}</div> : null}
          {systemStatusQuery.data ? (
            <div style={styles.list}>
              <div style={styles.keyValueRow}><strong>Tenant ID</strong><span>{systemStatusQuery.data.tenant_id ?? '-'}</span></div>
              <div style={styles.keyValueRow}><strong>Timestamp</strong><span>{formatDateTime(systemStatusQuery.data.timestamp)}</span></div>
              <div style={styles.keyValueRow}><strong>System Write Lock</strong><span>{systemStatusQuery.data.system_write_locked ? 'Enabled' : 'Disabled'}</span></div>
              <div style={styles.keyValueRow}><strong>Maintenance Mode</strong><span>{systemStatusQuery.data.maintenance_mode ? 'Enabled' : 'Disabled'}</span></div>
            </div>
          ) : null}
        </Section>

        <Section title="Tenant Diagnostics" subtitle="Admin-only integrity checks scoped to the current tenant.">
          {!capabilities.isAdmin ? <div className="app-warning-state">Diagnostics are limited to tenant admins.</div> : null}
          {capabilities.isAdmin ? (
            <div style={styles.list}>
              <h4 style={styles.sectionSubheading}>Blocking Diagnostics</h4>
              {blockingAlertsQuery.error ? <div className="app-error-state">{readableError(blockingAlertsQuery.error)}</div> : null}
              {blockingAlertsQuery.isLoading ? <div className="app-empty-state">Loading blocking diagnostics...</div> : null}
              {blockingAlertsQuery.data?.length ? blockingAlertsQuery.data.map((row) => (
                <article key={row.id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.type}</div>
                  <div style={styles.itemText}>{row.message}</div>
                  <div style={styles.itemMeta}>{row.severity.toUpperCase()} · {formatDateTime(row.created_at)}</div>
                </article>
              )) : !blockingAlertsQuery.isLoading ? <div className="app-empty-state">No blocking diagnostics returned.</div> : null}

              <h4 style={styles.sectionSubheading}>Stock Integrity</h4>
              {stockIntegrityQuery.error ? <div className="app-error-state">{readableError(stockIntegrityQuery.error)}</div> : null}
              {stockIntegrityQuery.isLoading ? <div className="app-empty-state">Loading stock integrity issues...</div> : null}
              {stockIntegrityQuery.data?.length ? stockIntegrityQuery.data.map((row) => (
                <article key={row.id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>Negative Stock Row</div>
                  <div style={styles.itemTextMono}>Product {row.product_id} · Location {row.storage_location_id}</div>
                  <div style={styles.itemMeta}>Quantity {row.quantity} · Updated {formatDateTime(row.updated_at)}</div>
                </article>
              )) : !stockIntegrityQuery.isLoading ? <div className="app-empty-state">No negative stock integrity issues returned.</div> : null}

              <h4 style={styles.sectionSubheading}>Broken Shipments</h4>
              {brokenShipmentsQuery.error ? <div className="app-error-state">{readableError(brokenShipmentsQuery.error)}</div> : null}
              {brokenShipmentsQuery.isLoading ? <div className="app-empty-state">Loading broken shipments...</div> : null}
              {brokenShipmentsQuery.data?.length ? brokenShipmentsQuery.data.map((row) => (
                <article key={row.id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>Shipment {row.id}</div>
                  <div style={styles.itemText}>Status {row.status}</div>
                  <div style={styles.itemMeta}>Ordered {row.total_ordered_quantity} · Received {row.total_received_quantity}</div>
                </article>
              )) : !brokenShipmentsQuery.isLoading ? <div className="app-empty-state">No broken shipments returned.</div> : null}
            </div>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px', width: '100%', minWidth: 0 },
  statsGrid: { width: '100%', minWidth: 0 },
  statCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '18px', minWidth: 0 },
  statTitle: { color: '#64748b', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  statValue: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' },
  statValueWarn: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#b45309' },
  statValueBad: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#b91c1c' },
  statSubtitle: { marginTop: '8px', color: '#475569', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '20px', width: '100%', minWidth: 0 },
  panel: { minWidth: 0, overflow: 'hidden' },
  panelTitle: { margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' },
  panelSubtitle: { margin: '8px 0 16px', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' },
  list: { display: 'grid', gap: '12px', minWidth: 0 },
  itemCard: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px', display: 'grid', gap: '8px', minWidth: 0 },
  itemTitle: { fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' },
  itemText: { color: '#334155', lineHeight: 1.5, wordBreak: 'break-word' },
  itemTextMono: { color: '#0f172a', fontFamily: 'monospace', wordBreak: 'break-all', overflowWrap: 'anywhere' },
  itemMeta: { color: '#64748b', fontSize: '0.88rem', lineHeight: 1.45, wordBreak: 'break-word' },
  sectionSubheading: { color: '#0f172a', fontWeight: 800, margin: '4px 0 0' },
  keyValueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', minWidth: 0 }
};
