import { useMemo } from 'react';
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

type IdempotencyRow = {
  id: string;
  idempotency_key: string;
  method: string;
  path: string;
  request_hash: string;
  created_at: string;
  completed_at?: string | null;
  expires_at?: string | null;
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

type TenantHealthRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  issue_count: number;
  issues: Array<{ type: string; message: string }>;
};

type SystemHealthResponse = {
  generated_at: string;
  tenants: TenantHealthRow[];
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

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  return apiRequest<SystemStatusResponse>('/system-status');
}

async function fetchBlockingAlerts(): Promise<BlockingAlertRow[]> {
  return apiRequest<BlockingAlertRow[]>('/admin/diagnostics/blocking-alerts');
}

async function fetchStuckIdempotency(): Promise<IdempotencyRow[]> {
  return apiRequest<IdempotencyRow[]>('/admin/diagnostics/stuck-idempotency');
}

async function fetchStockIntegrity(): Promise<StockIntegrityRow[]> {
  return apiRequest<StockIntegrityRow[]>('/admin/diagnostics/stock-integrity');
}

async function fetchBrokenShipments(): Promise<BrokenShipmentRow[]> {
  return apiRequest<BrokenShipmentRow[]>('/admin/diagnostics/broken-shipments');
}

async function fetchSystemHealth(): Promise<SystemHealthResponse> {
  /*
    WHAT CHANGED
    ------------
    Corrected the system health endpoint from:
    /admin/system-health/system-health
    to:
    /admin/system-health

    WHY IT CHANGED
    --------------
    The uploaded backend route mounting resolves the admin system health route
    to GET /admin/system-health.

    WHAT PROBLEM IT SOLVES
    ----------------------
    Prevents the System Health panel from calling a non-existent backend route.
  */
  return apiRequest<SystemHealthResponse>('/admin/system-health');
}

function StatCard(props: {
  title: string;
  value: string;
  subtitle: string;
  tone?: 'default' | 'warn' | 'bad';
}) {
  const valueStyle =
    props.tone === 'bad'
      ? styles.statValueBad
      : props.tone === 'warn'
        ? styles.statValueWarn
        : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

function Section(props: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
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

export default function AdminSystemPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the AdminSystemPage you sent.

    Existing real behavior is preserved:
    - same query keys
    - same manager/admin visibility rules
    - same section order
    - same diagnostics rendering
    - same shared UI foundation classes

    The only backend contract fix:
    - corrected the System Health endpoint to /admin/system-health

    WHY IT CHANGED
    --------------
    The previous endpoint had one extra /system-health segment that does not
    match the uploaded backend route registry.

    WHAT PROBLEM IT SOLVES
    ----------------------
    Lets admin users load System Health from the real backend route without
    changing UI structure or access rules.
  */
  const capabilities = getRoleCapabilities();

  const systemStatusQuery = useQuery({
    queryKey: ['admin-system', 'system-status'],
    queryFn: fetchSystemStatus
  });

  const blockingAlertsQuery = useQuery({
    queryKey: ['admin-system', 'blocking-alerts'],
    queryFn: fetchBlockingAlerts,
    enabled: capabilities.isAdmin
  });

  const idempotencyQuery = useQuery({
    queryKey: ['admin-system', 'stuck-idempotency'],
    queryFn: fetchStuckIdempotency,
    enabled: capabilities.isAdmin
  });

  const stockIntegrityQuery = useQuery({
    queryKey: ['admin-system', 'stock-integrity'],
    queryFn: fetchStockIntegrity,
    enabled: capabilities.isAdmin
  });

  const brokenShipmentsQuery = useQuery({
    queryKey: ['admin-system', 'broken-shipments'],
    queryFn: fetchBrokenShipments,
    enabled: capabilities.isAdmin
  });

  const systemHealthQuery = useQuery({
    queryKey: ['admin-system', 'system-health'],
    queryFn: fetchSystemHealth,
    enabled: capabilities.isAdmin
  });

  const overview = useMemo(() => {
    const systemStatus = systemStatusQuery.data;
    return {
      blockingAlerts: systemStatus?.blocking_alerts?.length ?? 0,
      writeLock: systemStatus?.system_write_locked ? 'Locked' : 'Open',
      maintenance: systemStatus?.maintenance_mode ? 'Enabled' : 'Disabled',
      tenantHealthRows: systemHealthQuery.data?.tenants.length ?? 0
    };
  }, [systemStatusQuery.data, systemHealthQuery.data]);

  return (
    <div style={styles.page}>
      <section className="app-grid-stats" style={styles.statsGrid}>
        <StatCard
          title="Write Status"
          value={overview.writeLock}
          subtitle="Current system write-lock posture."
          tone={overview.writeLock === 'Locked' ? 'bad' : 'default'}
        />
        <StatCard
          title="Maintenance"
          value={overview.maintenance}
          subtitle="Maintenance-mode visibility from system flags."
          tone={overview.maintenance === 'Enabled' ? 'warn' : 'default'}
        />
        <StatCard
          title="Blocking Alerts"
          value={String(overview.blockingAlerts)}
          subtitle="Tenant-scoped blocking alerts from /system-status."
          tone={overview.blockingAlerts > 0 ? 'bad' : 'default'}
        />
        <StatCard
          title="Tenant Health Rows"
          value={String(overview.tenantHealthRows)}
          subtitle="Cross-tenant health snapshots for admins."
        />
      </section>

      <div style={styles.grid}>
        <Section
          title="System Status"
          subtitle="Manager/admin visibility into system flags and tenant blocking alerts."
        >
          {systemStatusQuery.isLoading ? (
            <div className="app-empty-state" style={styles.infoState}>
              Loading system status...
            </div>
          ) : null}

          {systemStatusQuery.isError ? (
            <div className="app-error-state" style={styles.errorState}>
              {toReadableError(systemStatusQuery.error)}
            </div>
          ) : null}

          {systemStatusQuery.data ? (
            <div style={styles.list}>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Tenant ID</strong>
                <span style={styles.keyValue}>{systemStatusQuery.data.tenant_id ?? '-'}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Timestamp</strong>
                <span style={styles.keyValue}>
                  {formatDateTime(systemStatusQuery.data.timestamp)}
                </span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>System Write Lock</strong>
                <span style={styles.keyValue}>
                  {systemStatusQuery.data.system_write_locked ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Maintenance Mode</strong>
                <span style={styles.keyValue}>
                  {systemStatusQuery.data.maintenance_mode ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div style={styles.sectionSubheading}>Blocking Alerts</div>

              {systemStatusQuery.data.blocking_alerts?.length ? (
                systemStatusQuery.data.blocking_alerts.map((alert) => (
                  <article key={alert.id} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{alert.type}</div>
                    <div style={styles.itemText}>{alert.message}</div>
                    <div style={styles.itemMeta}>
                      {alert.severity.toUpperCase()} · {formatDateTime(alert.created_at)}
                    </div>
                  </article>
                ))
              ) : (
                <div className="app-empty-state" style={styles.infoState}>
                  No blocking alerts were returned for the current tenant.
                </div>
              )}
            </div>
          ) : null}
        </Section>

        <Section
          title="Admin Diagnostics"
          subtitle="Admin-only read surface for operational integrity checks already exposed by the backend."
        >
          {!capabilities.isAdmin ? (
            <div className="app-warning-state" style={styles.warningState}>
              Diagnostics and cross-tenant health are intentionally limited to admins.
              Managers still retain the system-status view above.
            </div>
          ) : null}

          {capabilities.isAdmin ? (
            <div style={styles.list}>
              <div style={styles.sectionSubheading}>Blocking Diagnostics</div>

              {blockingAlertsQuery.isError ? (
                <div className="app-error-state" style={styles.errorState}>
                  {toReadableError(blockingAlertsQuery.error)}
                </div>
              ) : null}

              {blockingAlertsQuery.isLoading ? (
                <div className="app-empty-state" style={styles.infoState}>
                  Loading blocking diagnostics...
                </div>
              ) : null}

              {blockingAlertsQuery.data?.length
                ? blockingAlertsQuery.data.map((row) => (
                    <article key={row.id} style={styles.itemCard}>
                      <div style={styles.itemTitle}>{row.type}</div>
                      <div style={styles.itemText}>{row.message}</div>
                      <div style={styles.itemMeta}>
                        {row.severity.toUpperCase()} · {formatDateTime(row.created_at)}
                      </div>
                    </article>
                  ))
                : !blockingAlertsQuery.isLoading
                  ? (
                    <div className="app-empty-state" style={styles.infoState}>
                      No blocking diagnostics returned.
                    </div>
                    )
                  : null}

              <div style={styles.sectionSubheading}>Stuck Idempotency Keys</div>

              {idempotencyQuery.isError ? (
                <div className="app-error-state" style={styles.errorState}>
                  {toReadableError(idempotencyQuery.error)}
                </div>
              ) : null}

              {idempotencyQuery.isLoading ? (
                <div className="app-empty-state" style={styles.infoState}>
                  Loading stuck idempotency rows...
                </div>
              ) : null}

              {idempotencyQuery.data?.length
                ? idempotencyQuery.data.map((row) => (
                    <article key={row.id} style={styles.itemCard}>
                      <div style={styles.itemTitle}>
                        {row.method} {row.path}
                      </div>
                      <div style={styles.itemTextMono}>{row.idempotency_key}</div>
                      <div style={styles.itemMeta}>
                        Created {formatDateTime(row.created_at)} · Expires{' '}
                        {formatDateTime(row.expires_at)}
                      </div>
                    </article>
                  ))
                : !idempotencyQuery.isLoading
                  ? (
                    <div className="app-empty-state" style={styles.infoState}>
                      No stuck idempotency rows returned.
                    </div>
                    )
                  : null}

              <div style={styles.sectionSubheading}>Stock Integrity</div>

              {stockIntegrityQuery.isError ? (
                <div className="app-error-state" style={styles.errorState}>
                  {toReadableError(stockIntegrityQuery.error)}
                </div>
              ) : null}

              {stockIntegrityQuery.isLoading ? (
                <div className="app-empty-state" style={styles.infoState}>
                  Loading stock integrity issues...
                </div>
              ) : null}

              {stockIntegrityQuery.data?.length
                ? stockIntegrityQuery.data.map((row) => (
                    <article key={row.id} style={styles.itemCard}>
                      <div style={styles.itemTitle}>Negative Stock Row</div>
                      <div style={styles.itemTextMono}>
                        Product {row.product_id} · Location {row.storage_location_id}
                      </div>
                      <div style={styles.itemMeta}>
                        Quantity {row.quantity} · Updated {formatDateTime(row.updated_at)}
                      </div>
                    </article>
                  ))
                : !stockIntegrityQuery.isLoading
                  ? (
                    <div className="app-empty-state" style={styles.infoState}>
                      No negative stock integrity issues returned.
                    </div>
                    )
                  : null}

              <div style={styles.sectionSubheading}>Broken Shipments</div>

              {brokenShipmentsQuery.isError ? (
                <div className="app-error-state" style={styles.errorState}>
                  {toReadableError(brokenShipmentsQuery.error)}
                </div>
              ) : null}

              {brokenShipmentsQuery.isLoading ? (
                <div className="app-empty-state" style={styles.infoState}>
                  Loading broken shipments...
                </div>
              ) : null}

              {brokenShipmentsQuery.data?.length
                ? brokenShipmentsQuery.data.map((row) => (
                    <article key={row.id} style={styles.itemCard}>
                      <div style={styles.itemTitle}>Shipment {row.id}</div>
                      <div style={styles.itemText}>Status {row.status}</div>
                      <div style={styles.itemMeta}>
                        Ordered {row.total_ordered_quantity} · Received{' '}
                        {row.total_received_quantity}
                      </div>
                    </article>
                  ))
                : !brokenShipmentsQuery.isLoading
                  ? (
                    <div className="app-empty-state" style={styles.infoState}>
                      No broken shipments returned.
                    </div>
                    )
                  : null}
            </div>
          ) : null}
        </Section>
      </div>

      <Section
        title="System Health"
        subtitle="Cross-tenant health snapshots exposed by the admin system-health endpoint."
      >
        {!capabilities.isAdmin ? (
          <div className="app-warning-state" style={styles.warningState}>
            System health snapshots are admin-only because they span all tenants.
          </div>
        ) : null}

        {capabilities.isAdmin && systemHealthQuery.isLoading ? (
          <div className="app-empty-state" style={styles.infoState}>
            Loading system health...
          </div>
        ) : null}

        {capabilities.isAdmin && systemHealthQuery.isError ? (
          <div className="app-error-state" style={styles.errorState}>
            {toReadableError(systemHealthQuery.error)}
          </div>
        ) : null}

        {capabilities.isAdmin && systemHealthQuery.data ? (
          systemHealthQuery.data.tenants.length ? (
            <div style={styles.list}>
              {systemHealthQuery.data.tenants.map((tenant) => (
                <article key={tenant.tenant_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{tenant.tenant_name}</div>
                  <div style={styles.itemMeta}>
                    Status {tenant.status.toUpperCase()} · Issues {tenant.issue_count}
                  </div>
                  {tenant.issues.length
                    ? tenant.issues.map((issue, index) => (
                        <div
                          key={`${tenant.tenant_id}-${index}`}
                          style={styles.itemText}
                        >
                          {issue.type}: {issue.message}
                        </div>
                      ))
                    : <div style={styles.itemText}>No issues reported.</div>}
                </article>
              ))}
            </div>
          ) : (
            <div className="app-empty-state" style={styles.infoState}>
              No tenant health rows were returned.
            </div>
          )
        ) : null}
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
  list: {
    display: 'grid',
    gap: '12px',
    minWidth: 0
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
  itemText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  itemTextMono: {
    color: '#0f172a',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    overflowWrap: 'anywhere'
  },
  itemMeta: {
    color: '#64748b',
    fontSize: '0.88rem',
    lineHeight: 1.45,
    wordBreak: 'break-word'
  },
  sectionSubheading: {
    color: '#0f172a',
    fontWeight: 800,
    marginTop: '4px'
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
  warningState: {
    margin: 0
  },
  errorState: {
    margin: 0
  }
};