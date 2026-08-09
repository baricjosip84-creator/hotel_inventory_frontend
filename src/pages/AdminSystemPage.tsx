import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

type BlockingAlertRow = {
  id: string;
  tenant_id: string;
  product_id?: string | null;
  product_name?: string | null;
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
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  quantity: number | string;
  updated_at: string;
};

type BrokenShipmentRow = {
  id: string;
  tenant_id: string;
  status: string;
  po_number?: string | null;
  supplier_name?: string | null;
  total_ordered_quantity: number | string;
  total_received_quantity: number | string;
  shortage_line_count: number | string;
  undocumented_shortage_line_count: number | string;
};

type SystemStatusResponse = {
  status?: string;
  tenant_id?: string;
  timestamp?: string;
  generated_at?: string;
  system_write_locked?: boolean;
  tenant_write_locked?: boolean;
  write_locked?: boolean;
  write_lock?: boolean;
  maintenance_mode?: boolean;
  unresolved_blocking_alerts?: number | string;
};

type RefreshResult = {
  isError: boolean;
  error: unknown;
};

const QUERY_OPTIONS = {
  staleTime: 15_000,
  refetchOnWindowFocus: false,
  retry: 1
} as const;

async function acknowledgeAdminAlert(id: string): Promise<{ message: string; alert: BlockingAlertRow }> {
  return apiRequest<{ message: string; alert: BlockingAlertRow }>(`/admin/alerts/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function resolveAdminAlert(input: { id: string; resolutionNote: string }): Promise<{ message: string; alert: BlockingAlertRow }> {
  return apiRequest<{ message: string; alert: BlockingAlertRow }>(`/admin/alerts/${input.id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution_note: input.resolutionNote })
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

function formatUpdatedAt(value: number): string {
  if (!value) return 'Not loaded yet';
  return formatDateTime(new Date(value).toISOString());
}

function formatCount(count: number | undefined, isLoading: boolean): string {
  if (isLoading) return 'loading';
  return String(count ?? 0);
}

function shortId(value: string | null | undefined): string {
  if (!value) return '-';
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function formatAlertType(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const [resolutionNoteByAlertId, setResolutionNoteByAlertId] = useState<Record<string, string>>({});
  const [overrideReasonByAlertId, setOverrideReasonByAlertId] = useState<Record<string, string>>({});

  const systemStatusQuery = useQuery({
    queryKey: ['admin-system', 'system-status'],
    queryFn: () => apiRequest<SystemStatusResponse>('/system-status'),
    ...QUERY_OPTIONS
  });

  const blockingAlertsQuery = useQuery({
    queryKey: ['admin-system', 'blocking-alerts'],
    queryFn: () => apiRequest<BlockingAlertRow[]>('/admin/diagnostics/blocking-alerts?limit=100'),
    enabled: canViewTenantDiagnostics,
    ...QUERY_OPTIONS
  });

  const stockIntegrityQuery = useQuery({
    queryKey: ['admin-system', 'stock-integrity'],
    queryFn: () => apiRequest<StockIntegrityRow[]>('/admin/diagnostics/stock-integrity?limit=100'),
    enabled: canViewTenantDiagnostics,
    ...QUERY_OPTIONS
  });

  const brokenShipmentsQuery = useQuery({
    queryKey: ['admin-system', 'broken-shipments'],
    queryFn: () => apiRequest<BrokenShipmentRow[]>('/admin/diagnostics/broken-shipments?limit=100'),
    enabled: canViewTenantDiagnostics,
    ...QUERY_OPTIONS
  });

  const isAdminSystemRefreshing =
    systemStatusQuery.isFetching ||
    blockingAlertsQuery.isFetching ||
    stockIntegrityQuery.isFetching ||
    brokenShipmentsQuery.isFetching;

  const lastUpdatedAt = Math.max(
    systemStatusQuery.dataUpdatedAt,
    canViewTenantDiagnostics ? blockingAlertsQuery.dataUpdatedAt : 0,
    canViewTenantDiagnostics ? stockIntegrityQuery.dataUpdatedAt : 0,
    canViewTenantDiagnostics ? brokenShipmentsQuery.dataUpdatedAt : 0
  );

  const handleManualRefresh = async () => {
    setActionMessage(null);
    setActionError(null);

    const results = await Promise.all([
      systemStatusQuery.refetch(),
      ...(canViewTenantDiagnostics
        ? [
            blockingAlertsQuery.refetch(),
            stockIntegrityQuery.refetch(),
            brokenShipmentsQuery.refetch()
          ]
        : [])
    ]);

    const failedResult = (results as RefreshResult[]).find((result) => result.isError);
    if (failedResult) {
      setActionError(`Refresh incomplete: ${readableError(failedResult.error)}`);
      return;
    }

    setActionMessage('Admin system data refreshed.');
  };

  const refreshAdminAlertData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-system', 'system-status'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-system', 'blocking-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-unresolved-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-system-status'] })
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
    onSuccess: async (result, variables) => {
      setActionError(null);
      setActionMessage(result.message || 'Alert resolved.');
      setResolutionNoteByAlertId((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      await refreshAdminAlertData();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(readableError(error));
    }
  });

  const overrideMutation = useMutation({
    mutationFn: overrideAdminAlert,
    onSuccess: async (result, variables) => {
      setActionError(null);
      setActionMessage(result.message || 'Blocking alert overridden.');
      setOverrideReasonByAlertId((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      await refreshAdminAlertData();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(readableError(error));
    }
  });

  const statusUnavailable = systemStatusQuery.isError && !systemStatusQuery.data;
  const effectiveWriteLocked = Boolean(
    systemStatusQuery.data?.write_locked ??
    systemStatusQuery.data?.write_lock ??
    systemStatusQuery.data?.system_write_locked ??
    systemStatusQuery.data?.tenant_write_locked
  );
  const systemWriteLocked = Boolean(systemStatusQuery.data?.system_write_locked);
  const tenantWriteLocked = Boolean(systemStatusQuery.data?.tenant_write_locked);
  const maintenanceEnabled = Boolean(systemStatusQuery.data?.maintenance_mode);
  const blockingCount = toCount(systemStatusQuery.data?.unresolved_blocking_alerts);

  const writeStatus = systemStatusQuery.isLoading ? 'Loading…' : statusUnavailable ? 'Unavailable' : effectiveWriteLocked ? 'Locked' : 'Open';
  const maintenanceStatus = systemStatusQuery.isLoading ? 'Loading…' : statusUnavailable ? 'Unavailable' : maintenanceEnabled ? 'Enabled' : 'Disabled';
  const blockingStatus = systemStatusQuery.isLoading ? 'Loading…' : statusUnavailable ? 'Unavailable' : String(blockingCount);

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarText}>Last refreshed: {formatUpdatedAt(lastUpdatedAt)}</div>
        <button
          type="button"
          className="app-button app-button--secondary"
          style={styles.secondaryButton}
          onClick={() => void handleManualRefresh()}
          disabled={isAdminSystemRefreshing}
        >
          {isAdminSystemRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <section className="app-grid-stats" style={styles.statsGrid}>
        <StatCard
          title="Effective Write Status"
          value={writeStatus}
          subtitle="Writes are blocked if either the platform or this tenant is write-locked."
          tone={!systemStatusQuery.isLoading && !statusUnavailable && effectiveWriteLocked ? 'bad' : 'default'}
        />
        <StatCard
          title="Maintenance"
          value={maintenanceStatus}
          subtitle="Platform maintenance-mode signal visible to this tenant."
          tone={!systemStatusQuery.isLoading && !statusUnavailable && maintenanceEnabled ? 'warn' : 'default'}
        />
        <StatCard
          title="Blocking Alerts"
          value={blockingStatus}
          subtitle="Unresolved tenant blockers that can stop protected operations."
          tone={!systemStatusQuery.isLoading && !statusUnavailable && blockingCount > 0 ? 'bad' : 'default'}
        />
      </section>

      {actionMessage ? <div className="app-success-state">{actionMessage}</div> : null}
      {actionError ? <div className="app-error-state">{actionError}</div> : null}

      <div style={styles.grid}>
        <Section title="System Status" subtitle="Operational lock and maintenance signals for the current tenant context.">
          {systemStatusQuery.isLoading ? <div className="app-empty-state">Loading system status…</div> : null}
          {systemStatusQuery.error ? <div className="app-error-state">{readableError(systemStatusQuery.error)}</div> : null}
          {systemStatusQuery.data ? (
            <div style={styles.list}>
              <div style={styles.keyValueRow}><strong>Tenant ID</strong><span style={styles.monoValue}>{systemStatusQuery.data.tenant_id ?? '-'}</span></div>
              <div style={styles.keyValueRow}><strong>Reported at</strong><span>{formatDateTime(systemStatusQuery.data.generated_at ?? systemStatusQuery.data.timestamp)}</span></div>
              <div style={styles.keyValueRow}><strong>Platform Write Lock</strong><span>{systemWriteLocked ? 'Enabled' : 'Disabled'}</span></div>
              <div style={styles.keyValueRow}><strong>Tenant Write Lock</strong><span>{tenantWriteLocked ? 'Enabled' : 'Disabled'}</span></div>
              <div style={styles.keyValueRow}><strong>Effective Write Status</strong><span>{effectiveWriteLocked ? 'Locked' : 'Open'}</span></div>
              <div style={styles.keyValueRow}><strong>Maintenance Mode</strong><span>{maintenanceEnabled ? 'Enabled' : 'Disabled'}</span></div>
              <div style={styles.keyValueRow}><strong>Unresolved Blocking Alerts</strong><span>{blockingCount}</span></div>
              {effectiveWriteLocked ? (
                <div className="app-warning-state">Protected write operations are currently blocked by {systemWriteLocked && tenantWriteLocked ? 'both the platform and tenant write locks' : systemWriteLocked ? 'the platform write lock' : 'the tenant write lock'}.</div>
              ) : null}
            </div>
          ) : null}
        </Section>

        <Section title="Tenant Diagnostics" subtitle="Restricted integrity checks scoped to the current tenant.">
          {!canViewTenantDiagnostics ? <div className="app-warning-state">Diagnostics require Tenant Diagnostics · Read permission.</div> : null}
          {canViewTenantDiagnostics ? (
            <div style={styles.list}>
              {!canManageAlerts && !canOverrideAlerts ? (
                <div className="app-empty-state">Diagnostics are read-only for your current permission set.</div>
              ) : null}

              <h4 style={styles.sectionSubheading}>Blocking Diagnostics <span style={styles.countLabel}>{formatCount(blockingAlertsQuery.data?.length, blockingAlertsQuery.isLoading)}</span></h4>
              {blockingAlertsQuery.error ? <div className="app-error-state">{readableError(blockingAlertsQuery.error)}</div> : null}
              {blockingAlertsQuery.isLoading ? <div className="app-empty-state">Loading blocking diagnostics…</div> : null}
              {blockingAlertsQuery.data?.length ? blockingAlertsQuery.data.map((row) => {
                const alertTitle = formatAlertType(row.type);
                const resolutionNote = resolutionNoteByAlertId[row.id] ?? '';
                const overrideReason = overrideReasonByAlertId[row.id] ?? '';
                const isAcknowledging = acknowledgeMutation.isPending && acknowledgeMutation.variables === row.id;
                const isResolving = resolveMutation.isPending && resolveMutation.variables?.id === row.id;
                const isOverriding = overrideMutation.isPending && overrideMutation.variables?.id === row.id;
                const isBusy = isAcknowledging || isResolving || isOverriding;

                return (
                  <article key={row.id} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{alertTitle}</div>
                    <div style={styles.itemText}>{row.message}</div>
                    <div style={styles.itemMeta}>
                      {row.severity.toUpperCase()} · {formatDateTime(row.created_at)}
                      {row.product_name ? ` · ${row.product_name}` : ''}
                      {row.acknowledged ? ' · Acknowledged' : ' · Not acknowledged'}
                    </div>

                    {canManageAlerts ? (
                      <>
                        <label style={styles.fieldLabel}>
                          <span>Resolution note</span>
                          <textarea
                            style={styles.textareaNeutral}
                            value={resolutionNote}
                            onChange={(event) => setResolutionNoteByAlertId((current) => ({ ...current, [row.id]: event.target.value }))}
                            placeholder="Explain what was checked and why this blocker can be closed."
                            rows={2}
                            maxLength={2000}
                            disabled={isBusy}
                          />
                          <small style={styles.fieldHelp}>At least 3 characters are required before Resolve is enabled.</small>
                        </label>
                        <div style={styles.actions}>
                          {!row.acknowledged ? (
                            <button
                              type="button"
                              className="app-button app-button--secondary"
                              style={styles.secondaryButton}
                              onClick={() => acknowledgeMutation.mutate(row.id)}
                              disabled={isBusy}
                            >
                              {isAcknowledging ? 'Acknowledging…' : 'Acknowledge'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="app-button app-button--primary"
                            style={styles.primaryButton}
                            onClick={() => resolveMutation.mutate({ id: row.id, resolutionNote: resolutionNote.trim() })}
                            disabled={isBusy || resolutionNote.trim().length < 3}
                          >
                            {isResolving ? 'Resolving…' : 'Resolve'}
                          </button>
                        </div>
                      </>
                    ) : null}

                    {canOverrideAlerts ? (
                      <div className="app-warning-state" style={styles.overrideBox}>
                        <strong>Emergency blocking-alert override</strong>
                        <span>Use only after the underlying issue has been independently checked and normal resolution is not appropriate.</span>
                        <label style={styles.fieldLabel}>
                          <span>Mandatory override reason</span>
                          <textarea
                            style={styles.textareaNeutral}
                            value={overrideReason}
                            onChange={(event) => setOverrideReasonByAlertId((current) => ({ ...current, [row.id]: event.target.value }))}
                            placeholder="Why is an emergency override justified?"
                            rows={2}
                            maxLength={1000}
                            disabled={isBusy}
                          />
                        </label>
                        <button
                          type="button"
                          className="app-button app-button--danger"
                          style={styles.dangerButton}
                          onClick={() => {
                            const cleanReason = overrideReason.trim();
                            if (cleanReason.length < 3) {
                              setActionMessage(null);
                              setActionError('Override reason must contain at least 3 characters.');
                              return;
                            }
                            if (window.confirm(`Override and close ${alertTitle}? This is an emergency administrative action.`)) {
                              overrideMutation.mutate({ id: row.id, reason: cleanReason });
                            }
                          }}
                          disabled={isBusy || overrideReason.trim().length < 3}
                        >
                          {isOverriding ? 'Overriding…' : 'Override and close blocking alert'}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              }) : !blockingAlertsQuery.isLoading && !blockingAlertsQuery.error ? <div className="app-empty-state">No unresolved blocking diagnostics returned.</div> : null}

              <h4 style={styles.sectionSubheading}>Stock Integrity <span style={styles.countLabel}>{formatCount(stockIntegrityQuery.data?.length, stockIntegrityQuery.isLoading)}</span></h4>
              {stockIntegrityQuery.error ? <div className="app-error-state">{readableError(stockIntegrityQuery.error)}</div> : null}
              {stockIntegrityQuery.isLoading ? <div className="app-empty-state">Loading stock integrity issues…</div> : null}
              {stockIntegrityQuery.data?.length ? stockIntegrityQuery.data.map((row) => (
                <article key={row.id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name || `Product ${shortId(row.product_id)}`}</div>
                  <div style={styles.itemText}>Negative stock at {row.storage_location_name || `location ${shortId(row.storage_location_id)}`}.</div>
                  <div style={styles.itemMeta}>Quantity {row.quantity}{row.product_unit ? ` ${row.product_unit}` : ''} · Updated {formatDateTime(row.updated_at)}</div>
                </article>
              )) : !stockIntegrityQuery.isLoading && !stockIntegrityQuery.error ? <div className="app-empty-state">No negative stock integrity issues returned.</div> : null}

              <h4 style={styles.sectionSubheading}>Broken Shipments <span style={styles.countLabel}>{formatCount(brokenShipmentsQuery.data?.length, brokenShipmentsQuery.isLoading)}</span></h4>
              {brokenShipmentsQuery.error ? <div className="app-error-state">{readableError(brokenShipmentsQuery.error)}</div> : null}
              {brokenShipmentsQuery.isLoading ? <div className="app-empty-state">Loading broken shipments…</div> : null}
              {brokenShipmentsQuery.data?.length ? brokenShipmentsQuery.data.map((row) => (
                <article key={row.id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.po_number ? `PO ${row.po_number}` : `Shipment ${shortId(row.id)}`}</div>
                  <div style={styles.itemText}>{row.supplier_name ? `${row.supplier_name} · ` : ''}Finalized shipment contains an undocumented receiving shortage.</div>
                  <div style={styles.itemMeta}>
                    Ordered {row.total_ordered_quantity} · Received {row.total_received_quantity} · Undocumented shortage lines {toCount(row.undocumented_shortage_line_count)} · Shipment {shortId(row.id)}
                  </div>
                </article>
              )) : !brokenShipmentsQuery.isLoading && !brokenShipmentsQuery.error ? <div className="app-empty-state">No invalid finalized shipments returned. Documented receiving shortages are allowed by the current finalization workflow.</div> : null}
            </div>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px', width: '100%', minWidth: 0 },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%', minWidth: 0 },
  toolbarText: { color: '#475569', fontSize: '0.9rem', fontWeight: 700 },
  statsGrid: { width: '100%', minWidth: 0 },
  statCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '18px', minWidth: 0 },
  statTitle: { color: '#64748b', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  statValue: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' },
  statValueWarn: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#b45309' },
  statValueBad: { marginTop: '10px', fontSize: '1.8rem', fontWeight: 800, color: '#b91c1c' },
  statSubtitle: { marginTop: '8px', color: '#475569', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: '20px', width: '100%', minWidth: 0 },
  panel: { minWidth: 0, overflow: 'hidden' },
  panelTitle: { margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' },
  panelSubtitle: { margin: '8px 0 16px', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' },
  list: { display: 'grid', gap: '12px', minWidth: 0 },
  itemCard: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px', display: 'grid', gap: '10px', minWidth: 0 },
  itemTitle: { fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' },
  itemText: { color: '#334155', lineHeight: 1.5, wordBreak: 'break-word' },
  itemMeta: { color: '#64748b', fontSize: '0.88rem', lineHeight: 1.45, wordBreak: 'break-word' },
  sectionSubheading: { color: '#0f172a', fontWeight: 800, margin: '4px 0 0' },
  countLabel: { display: 'inline-flex', marginLeft: '6px', padding: '0.1rem 0.45rem', borderRadius: '999px', background: '#f1f5f9', color: '#475569', fontSize: '0.78rem', fontWeight: 800, verticalAlign: 'middle' },
  keyValueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', minWidth: 0 },
  monoValue: { fontFamily: 'monospace', overflowWrap: 'anywhere', textAlign: 'right' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  primaryButton: { border: '1px solid #2563eb', borderRadius: '12px', background: '#2563eb', color: '#fff', padding: '0.7rem 0.9rem', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', color: '#0f172a', padding: '0.7rem 0.9rem', fontWeight: 800, cursor: 'pointer' },
  dangerButton: { border: '1px solid #dc2626', borderRadius: '12px', background: '#dc2626', color: '#fff', padding: '0.7rem 0.9rem', fontWeight: 800, cursor: 'pointer' },
  overrideBox: { display: 'grid', gap: '10px', marginTop: '4px' },
  fieldLabel: { display: 'grid', gap: '6px', color: '#0f172a', fontWeight: 700 },
  fieldHelp: { color: '#64748b', fontWeight: 500, lineHeight: 1.4 },
  textareaNeutral: { width: '100%', padding: '0.75rem 0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontWeight: 500 }
};
