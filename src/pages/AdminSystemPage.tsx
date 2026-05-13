import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  resolved?: boolean;
  override_reason?: string | null;
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


async function acknowledgeAdminAlert(id: string): Promise<{ message: string; alert: BlockingAlertRow }> {
  return apiRequest<{ message: string; alert: BlockingAlertRow }>(`/admin/alerts/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function resolveAdminAlert(id: string): Promise<{ message: string; alert: BlockingAlertRow }> {
  return apiRequest<{ message: string; alert: BlockingAlertRow }>(`/admin/alerts/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function overrideAdminAlert(input: { id: string; reason: string }): Promise<{ message: string; alert: BlockingAlertRow }> {
  return apiRequest<{ message: string; alert: BlockingAlertRow }>(`/admin/alerts/${input.id}/override`, {
    method: 'POST',
    body: JSON.stringify({ reason: input.reason })
  });
}

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
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const canViewTenantDiagnostics = capabilities.canViewTenantDiagnostics;
  const canManageAlerts = capabilities.canManageAlerts;
  const canOverrideAlerts = capabilities.canOverrideAlerts;
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [overrideReasonByAlertId, setOverrideReasonByAlertId] = useState<Record<string, string>>({});

  const systemStatusQuery = useQuery({
    queryKey: ['admin-system', 'system-status'],
    queryFn: () => apiRequest<SystemStatusResponse>('/system-status')
  });

  const blockingAlertsQuery = useQuery({
    queryKey: ['admin-system', 'blocking-alerts'],
    queryFn: () => apiRequest<BlockingAlertRow[]>('/admin/diagnostics/blocking-alerts'),
    enabled: canViewTenantDiagnostics
  });

  const stockIntegrityQuery = useQuery({
    queryKey: ['admin-system', 'stock-integrity'],
    queryFn: () => apiRequest<StockIntegrityRow[]>('/admin/diagnostics/stock-integrity'),
    enabled: canViewTenantDiagnostics
  });

  const brokenShipmentsQuery = useQuery({
    queryKey: ['admin-system', 'broken-shipments'],
    queryFn: () => apiRequest<BrokenShipmentRow[]>('/admin/diagnostics/broken-shipments'),
    enabled: canViewTenantDiagnostics
  });


  const refreshAdminAlertData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-system', 'system-status'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-system', 'blocking-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-unresolved-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    ]);
  };

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAdminAlert,
    onSuccess: async (result) => {
      setActionError(null);
      setActionMessage(result.message || 'Alert acknowledged.');
      await refreshAdminAlertData();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(readableError(error));
    }
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAdminAlert,
    onSuccess: async (result) => {
      setActionError(null);
      setActionMessage(result.message || 'Alert resolved.');
      await refreshAdminAlertData();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(readableError(error));
    }
  });

  const overrideMutation = useMutation({
    mutationFn: overrideAdminAlert,
    onSuccess: async (result) => {
      setActionError(null);
      setActionMessage(result.message || 'Blocking alert overridden.');
      setOverrideReasonByAlertId({});
      await refreshAdminAlertData();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(readableError(error));
    }
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

      {actionMessage ? <div className="app-success-state">{actionMessage}</div> : null}
      {actionError ? <div className="app-error-state">{actionError}</div> : null}

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
          {!canViewTenantDiagnostics ? <div className="app-warning-state">Diagnostics require tenant diagnostics permission.</div> : null}
          {canViewTenantDiagnostics ? (
            <div style={styles.list}>
              <h4 style={styles.sectionSubheading}>Blocking Diagnostics</h4>
              {blockingAlertsQuery.error ? <div className="app-error-state">{readableError(blockingAlertsQuery.error)}</div> : null}
              {blockingAlertsQuery.isLoading ? <div className="app-empty-state">Loading blocking diagnostics...</div> : null}
              {blockingAlertsQuery.data?.length ? blockingAlertsQuery.data.map((row) => {
                const isBlocking = row.type.toUpperCase().includes('BLOCKING');
                const isBusy = acknowledgeMutation.isPending || resolveMutation.isPending || overrideMutation.isPending;
                const reason = overrideReasonByAlertId[row.id] ?? '';

                return (
                  <article key={row.id} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{row.type}</div>
                    <div style={styles.itemText}>{row.message}</div>
                    <div style={styles.itemMeta}>
                      {row.severity.toUpperCase()} · {formatDateTime(row.created_at)}
                      {row.acknowledged ? ' · Acknowledged' : ''}
                      {row.resolved ? ' · Resolved' : ''}
                    </div>

                    <div style={styles.actions}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => acknowledgeMutation.mutate(row.id)}
                        disabled={isBusy || row.acknowledged || !canManageAlerts}
                      >
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        style={styles.primaryButton}
                        onClick={() => resolveMutation.mutate(row.id)}
                        disabled={isBusy || row.resolved || !canManageAlerts}
                      >
                        Resolve
                      </button>
                    </div>

                    {isBlocking && !row.resolved ? (
                      <div style={styles.overrideBox}>
                        <textarea
                          style={styles.textarea}
                          value={reason}
                          onChange={(event) =>
                            setOverrideReasonByAlertId((current) => ({
                              ...current,
                              [row.id]: event.target.value
                            }))
                          }
                          placeholder="Mandatory override reason"
                          rows={2}
                          disabled={isBusy}
                        />
                        <button
                          type="button"
                          style={styles.dangerButton}
                          onClick={() => {
                            const cleanReason = reason.trim();

                            if (!cleanReason) {
                              setActionMessage(null);
                              setActionError('Override reason is mandatory.');
                              return;
                            }

                            overrideMutation.mutate({ id: row.id, reason: cleanReason });
                          }}
                          disabled={isBusy || reason.trim().length < 3 || !canOverrideAlerts}
                        >
                          Override blocking alert
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              }) : !blockingAlertsQuery.isLoading ? <div className="app-empty-state">No blocking diagnostics returned.</div> : null}

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
  keyValueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', minWidth: 0 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  primaryButton: { border: '1px solid #bbf7d0', borderRadius: '12px', background: '#dcfce7', color: '#166534', padding: '0.7rem 0.9rem', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', color: '#0f172a', padding: '0.7rem 0.9rem', fontWeight: 800, cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', padding: '0.7rem 0.9rem', fontWeight: 800, cursor: 'pointer' },
  overrideBox: { display: 'grid', gap: '10px', marginTop: '4px' },
  textarea: { width: '100%', padding: '0.75rem 0.85rem', borderRadius: '12px', border: '1px solid #fecaca', background: '#fff', color: '#0f172a', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }
};
