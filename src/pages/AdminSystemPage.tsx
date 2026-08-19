import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './AdminSystemPage.css';

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
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

function formatUpdatedAt(value: number): string {
  if (!value) return 'Not loaded yet';
  return formatDateTime(new Date(value).toISOString());
}

function shortId(value: string | null | undefined): string {
  if (!value) return '—';
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

function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'blue' }) {
  return <span className={`admin-system-badge admin-system-badge--${tone}`}>{children}</span>;
}

function DiagnosticCount({ children }: { children: React.ReactNode }) {
  return <span className="admin-system-count">{children}</span>;
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
      queryClient.invalidateQueries({ queryKey: ['admin-system'] }),
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
  const systemWriteLocked = Boolean(systemStatusQuery.data?.system_write_locked);
  const tenantWriteLocked = Boolean(systemStatusQuery.data?.tenant_write_locked);
  const effectiveWriteLocked = Boolean(
    systemStatusQuery.data?.write_locked ??
      systemStatusQuery.data?.write_lock ??
      (systemWriteLocked || tenantWriteLocked)
  );
  const maintenanceEnabled = Boolean(systemStatusQuery.data?.maintenance_mode);
  const blockingCount = toCount(systemStatusQuery.data?.unresolved_blocking_alerts);
  const loadedBlockingCount = blockingAlertsQuery.data?.length ?? 0;
  const loadedStockIssueCount = stockIntegrityQuery.data?.length ?? 0;
  const loadedBrokenShipmentCount = brokenShipmentsQuery.data?.length ?? 0;
  const loadedIntegrityIssueCount = loadedStockIssueCount + loadedBrokenShipmentCount;

  const writeStatus = systemStatusQuery.isLoading ? 'Loading…' : statusUnavailable ? 'Unavailable' : effectiveWriteLocked ? 'Locked' : 'Open';
  const maintenanceStatus = systemStatusQuery.isLoading ? 'Loading…' : statusUnavailable ? 'Unavailable' : maintenanceEnabled ? 'Enabled' : 'Disabled';
  const blockingStatus = systemStatusQuery.isLoading ? 'Loading…' : statusUnavailable ? 'Unavailable' : String(blockingCount);
  const diagnosticAccessStatus = canViewTenantDiagnostics ? 'Available' : 'Restricted';
  const pageHealth = systemStatusQuery.isLoading
    ? 'Loading…'
    : statusUnavailable
      ? 'Unavailable'
      : effectiveWriteLocked
        ? 'Write locked'
        : maintenanceEnabled
          ? 'Maintenance'
          : blockingCount > 0
            ? 'Attention'
            : 'Operational';
  const pageHealthLabel = `tenant administrative health · refreshed ${formatUpdatedAt(lastUpdatedAt)}`;
  const blockingHeaderCount = statusUnavailable ? loadedBlockingCount : blockingCount;
  const alertActionsBlockedByWriteLock = effectiveWriteLocked;

  return (
    <div className="admin-system-page io-operational-page io-workspace-page" id="admin-system-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/admin-system"
        eyebrow="Administration & integrity"
        title="Admin system"
        description="Review tenant operational posture, write-lock and maintenance signals, blocking alerts, and tenant-scoped integrity diagnostics. Platform controls remain read-only from this tenant page."
        meta={
          <>
            <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Platform signals read-only</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Diagnostics permission-gated</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Alert actions permission-gated</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <div className="admin-system-hero-actions">
            <OperationalWorkspaceStatus value={pageHealth} label={pageHealthLabel} />
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={() => void handleManualRefresh()}
              disabled={isAdminSystemRefreshing}
            >
              {isAdminSystemRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="Admin system overview">
        <OperationalWorkspaceStatCard
          label="Effective write status"
          value={writeStatus}
          helper="Platform and tenant write locks combined"
          tone={!systemStatusQuery.isLoading && !statusUnavailable && effectiveWriteLocked ? 'danger' : 'good'}
          iconPath="/admin-system"
          loading={systemStatusQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Maintenance"
          value={maintenanceStatus}
          helper="Platform maintenance signal visible to this tenant"
          tone={!systemStatusQuery.isLoading && !statusUnavailable && maintenanceEnabled ? 'warn' : 'neutral'}
          iconPath="/reliability-command"
          loading={systemStatusQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Blocking alerts"
          value={blockingStatus}
          helper="Unresolved tenant blockers affecting protected operations"
          tone={!systemStatusQuery.isLoading && !statusUnavailable && blockingCount > 0 ? 'danger' : 'good'}
          iconPath="/alerts"
          loading={systemStatusQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Tenant diagnostics"
          value={diagnosticAccessStatus}
          helper={canViewTenantDiagnostics ? `${loadedIntegrityIssueCount} loaded stock / shipment issue${loadedIntegrityIssueCount === 1 ? '' : 's'} · up to 100 per category` : 'Tenant Diagnostics · Read permission required'}
          tone={canViewTenantDiagnostics ? (loadedIntegrityIssueCount > 0 ? 'warn' : 'blue') : 'neutral'}
          iconPath="/audit"
        />
      </OperationalWorkspaceStats>

      {actionMessage ? <div className="app-success-state admin-system-message" role="status">{actionMessage}</div> : null}
      {actionError ? <div className="app-error-state admin-system-message" role="alert">{actionError}</div> : null}

      <section className="app-panel admin-system-panel">
        <OperationalSectionHeader
          iconPath="/admin-system"
          title="Operational posture"
          description="Current tenant write availability and platform maintenance signals. This page reports these controls; it does not change platform or tenant lock settings."
          actions={
            statusUnavailable
              ? <StatusBadge tone="danger">STATUS UNAVAILABLE</StatusBadge>
              : effectiveWriteLocked
                ? <StatusBadge tone="danger">WRITES BLOCKED</StatusBadge>
                : <StatusBadge tone="good">WRITES OPEN</StatusBadge>
          }
        />

        {systemStatusQuery.isLoading ? <div className="app-empty-state admin-system-message">Loading system status…</div> : null}
        {systemStatusQuery.error ? <div className="app-error-state admin-system-message">{readableError(systemStatusQuery.error)}</div> : null}

        {systemStatusQuery.data ? (
          <div className="admin-system-status-grid">
            <div className="admin-system-status-item admin-system-status-item--tenant">
              <span>Tenant ID</span>
              <strong className="admin-system-mono">{systemStatusQuery.data.tenant_id ?? '—'}</strong>
            </div>
            <div className="admin-system-status-item">
              <span>Reported at</span>
              <strong>{formatDateTime(systemStatusQuery.data.generated_at ?? systemStatusQuery.data.timestamp)}</strong>
            </div>
            <div className="admin-system-status-item">
              <span>Platform write lock</span>
              <strong>{systemWriteLocked ? 'Enabled' : 'Disabled'}</strong>
              <StatusBadge tone={systemWriteLocked ? 'danger' : 'good'}>{systemWriteLocked ? 'LOCKED' : 'CLEAR'}</StatusBadge>
            </div>
            <div className="admin-system-status-item">
              <span>Tenant write lock</span>
              <strong>{tenantWriteLocked ? 'Enabled' : 'Disabled'}</strong>
              <StatusBadge tone={tenantWriteLocked ? 'danger' : 'good'}>{tenantWriteLocked ? 'LOCKED' : 'CLEAR'}</StatusBadge>
            </div>
            <div className="admin-system-status-item">
              <span>Effective write status</span>
              <strong>{effectiveWriteLocked ? 'Locked' : 'Open'}</strong>
              <StatusBadge tone={effectiveWriteLocked ? 'danger' : 'good'}>{effectiveWriteLocked ? 'BLOCKED' : 'OPEN'}</StatusBadge>
            </div>
            <div className="admin-system-status-item">
              <span>Maintenance mode</span>
              <strong>{maintenanceEnabled ? 'Enabled' : 'Disabled'}</strong>
              <StatusBadge tone={maintenanceEnabled ? 'warn' : 'neutral'}>{maintenanceEnabled ? 'ACTIVE' : 'OFF'}</StatusBadge>
            </div>
            <div className="admin-system-status-item">
              <span>Unresolved blocking alerts</span>
              <strong>{blockingCount}</strong>
              <StatusBadge tone={blockingCount > 0 ? 'danger' : 'good'}>{blockingCount > 0 ? 'ATTENTION' : 'CLEAR'}</StatusBadge>
            </div>
          </div>
        ) : null}

        {effectiveWriteLocked ? (
          <div className="app-warning-state admin-system-message">
            <strong>Protected write operations are currently blocked.</strong>{' '}
            The active source is {systemWriteLocked && tenantWriteLocked ? 'both the platform and tenant write locks' : systemWriteLocked ? 'the platform write lock' : 'the tenant write lock'}. Alert acknowledge, resolve, and override actions are disabled here until the lock is cleared.
          </div>
        ) : null}
      </section>

      <section className="app-panel admin-system-panel">
        <OperationalSectionHeader
          iconPath="/audit"
          title="Tenant diagnostics"
          description="Restricted tenant-scoped integrity checks. Each diagnostic list loads up to 100 current rows; the Blocking alerts KPI above remains the authoritative total blocker count."
          actions={
            canViewTenantDiagnostics
              ? <StatusBadge tone={canManageAlerts || canOverrideAlerts ? 'blue' : 'neutral'}>{canManageAlerts || canOverrideAlerts ? 'ACTIONS AVAILABLE' : 'READ ONLY'}</StatusBadge>
              : <StatusBadge tone="neutral">PERMISSION REQUIRED</StatusBadge>
          }
        />

        {!canViewTenantDiagnostics ? (
          <div className="app-warning-state admin-system-message">Diagnostics require Tenant Diagnostics · Read permission.</div>
        ) : (
          <div className="admin-system-diagnostics">
            {!canManageAlerts && !canOverrideAlerts ? (
              <div className="app-empty-state admin-system-message">Diagnostics are read-only for your current permission set.</div>
            ) : null}
            {alertActionsBlockedByWriteLock && (canManageAlerts || canOverrideAlerts) ? (
              <div className="app-warning-state admin-system-message">Alert actions are disabled while the effective write status is locked.</div>
            ) : null}

            <section className="admin-system-diagnostic-group" aria-labelledby="admin-system-blocking-heading">
              <div className="admin-system-diagnostic-heading">
                <div>
                  <h4 id="admin-system-blocking-heading">Blocking alerts</h4>
                  <p>Unresolved blocking alerts that can stop protected tenant operations.</p>
                </div>
                <DiagnosticCount>{blockingAlertsQuery.isLoading ? 'Loading…' : blockingHeaderCount}</DiagnosticCount>
              </div>

              {blockingAlertsQuery.error ? <div className="app-error-state admin-system-message">{readableError(blockingAlertsQuery.error)}</div> : null}
              {blockingAlertsQuery.isLoading ? <div className="app-empty-state admin-system-message">Loading blocking diagnostics…</div> : null}
              {blockingAlertsQuery.data?.length ? blockingAlertsQuery.data.map((row) => {
                const alertTitle = formatAlertType(row.type);
                const resolutionNote = resolutionNoteByAlertId[row.id] ?? '';
                const overrideReason = overrideReasonByAlertId[row.id] ?? '';
                const isAcknowledging = acknowledgeMutation.isPending && acknowledgeMutation.variables === row.id;
                const isResolving = resolveMutation.isPending && resolveMutation.variables?.id === row.id;
                const isOverriding = overrideMutation.isPending && overrideMutation.variables?.id === row.id;
                const isBusy = isAcknowledging || isResolving || isOverriding || alertActionsBlockedByWriteLock;

                return (
                  <article key={row.id} className="admin-system-diagnostic-card admin-system-diagnostic-card--blocking">
                    <div className="admin-system-diagnostic-card__topline">
                      <div>
                        <strong>{alertTitle}</strong>
                        <p>{row.message}</p>
                      </div>
                      <StatusBadge tone={row.severity.toLowerCase() === 'critical' || row.severity.toLowerCase() === 'high' ? 'danger' : 'warn'}>{row.severity.toUpperCase()}</StatusBadge>
                    </div>
                    <div className="admin-system-diagnostic-meta">
                      <span>{formatDateTime(row.created_at)}</span>
                      {row.product_name ? <span>{row.product_name}</span> : null}
                      <span>{row.acknowledged ? 'Acknowledged' : 'Not acknowledged'}</span>
                    </div>

                    {canManageAlerts ? (
                      <div className="admin-system-action-block">
                        <label className="admin-system-field">
                          <span>Resolution note</span>
                          <textarea
                            value={resolutionNote}
                            onChange={(event) => setResolutionNoteByAlertId((current) => ({ ...current, [row.id]: event.target.value }))}
                            placeholder="Explain what was checked and why this blocker can be closed."
                            rows={2}
                            maxLength={2000}
                            disabled={isBusy}
                          />
                          <small>At least 3 characters are required before Resolve is enabled.</small>
                        </label>
                        <div className="admin-system-actions">
                          {!row.acknowledged ? (
                            <button
                              type="button"
                              className="app-button app-button--secondary"
                              onClick={() => acknowledgeMutation.mutate(row.id)}
                              disabled={isBusy}
                            >
                              {isAcknowledging ? 'Acknowledging…' : 'Acknowledge'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="app-button app-button--primary"
                            onClick={() => resolveMutation.mutate({ id: row.id, resolutionNote: resolutionNote.trim() })}
                            disabled={isBusy || resolutionNote.trim().length < 3}
                          >
                            {isResolving ? 'Resolving…' : 'Resolve'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {canOverrideAlerts ? (
                      <div className="admin-system-override-box">
                        <div>
                          <strong>Emergency blocking-alert override</strong>
                          <p>Use only after the underlying issue has been independently checked and normal resolution is not appropriate.</p>
                        </div>
                        <label className="admin-system-field">
                          <span>Mandatory override reason</span>
                          <textarea
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
              }) : !blockingAlertsQuery.isLoading && !blockingAlertsQuery.error ? (
                <div className="admin-system-empty-good">
                  <strong>No unresolved blocking diagnostics.</strong>
                  <span>No tenant blocker rows were returned in the current diagnostic scope.</span>
                </div>
              ) : null}
            </section>

            <section className="admin-system-diagnostic-group" aria-labelledby="admin-system-stock-heading">
              <div className="admin-system-diagnostic-heading">
                <div>
                  <h4 id="admin-system-stock-heading">Stock integrity</h4>
                  <p>Negative stock balances that require operational investigation.</p>
                </div>
                <DiagnosticCount>{stockIntegrityQuery.isLoading ? 'Loading…' : `${loadedStockIssueCount} loaded`}</DiagnosticCount>
              </div>

              {stockIntegrityQuery.error ? <div className="app-error-state admin-system-message">{readableError(stockIntegrityQuery.error)}</div> : null}
              {stockIntegrityQuery.isLoading ? <div className="app-empty-state admin-system-message">Loading stock integrity issues…</div> : null}
              {stockIntegrityQuery.data?.length ? stockIntegrityQuery.data.map((row) => (
                <article key={row.id} className="admin-system-diagnostic-card">
                  <div className="admin-system-diagnostic-card__topline">
                    <div>
                      <strong>{row.product_name || `Product ${shortId(row.product_id)}`}</strong>
                      <p>Negative stock at {row.storage_location_name || `location ${shortId(row.storage_location_id)}`}.</p>
                    </div>
                    <StatusBadge tone="danger">NEGATIVE STOCK</StatusBadge>
                  </div>
                  <div className="admin-system-diagnostic-meta">
                    <span>Quantity {row.quantity}{row.product_unit ? ` ${row.product_unit}` : ''}</span>
                    <span>Updated {formatDateTime(row.updated_at)}</span>
                  </div>
                </article>
              )) : !stockIntegrityQuery.isLoading && !stockIntegrityQuery.error ? (
                <div className="admin-system-empty-good">
                  <strong>No negative stock integrity issues.</strong>
                  <span>All loaded tenant stock balances are non-negative.</span>
                </div>
              ) : null}
            </section>

            <section className="admin-system-diagnostic-group" aria-labelledby="admin-system-shipments-heading">
              <div className="admin-system-diagnostic-heading">
                <div>
                  <h4 id="admin-system-shipments-heading">Shipment integrity</h4>
                  <p>Finalized receiving records with undocumented shortages.</p>
                </div>
                <DiagnosticCount>{brokenShipmentsQuery.isLoading ? 'Loading…' : `${loadedBrokenShipmentCount} loaded`}</DiagnosticCount>
              </div>

              {brokenShipmentsQuery.error ? <div className="app-error-state admin-system-message">{readableError(brokenShipmentsQuery.error)}</div> : null}
              {brokenShipmentsQuery.isLoading ? <div className="app-empty-state admin-system-message">Loading shipment integrity issues…</div> : null}
              {brokenShipmentsQuery.data?.length ? brokenShipmentsQuery.data.map((row) => (
                <article key={row.id} className="admin-system-diagnostic-card">
                  <div className="admin-system-diagnostic-card__topline">
                    <div>
                      <strong>{row.po_number ? `PO ${row.po_number}` : `Shipment ${shortId(row.id)}`}</strong>
                      <p>{row.supplier_name ? `${row.supplier_name} · ` : ''}Finalized shipment contains an undocumented receiving shortage.</p>
                    </div>
                    <StatusBadge tone="danger">UNDOCUMENTED SHORTAGE</StatusBadge>
                  </div>
                  <div className="admin-system-diagnostic-meta">
                    <span>Ordered {row.total_ordered_quantity}</span>
                    <span>Received {row.total_received_quantity}</span>
                    <span>Undocumented shortage lines {toCount(row.undocumented_shortage_line_count)}</span>
                    <span>Shipment {shortId(row.id)}</span>
                  </div>
                </article>
              )) : !brokenShipmentsQuery.isLoading && !brokenShipmentsQuery.error ? (
                <div className="admin-system-empty-good">
                  <strong>No invalid finalized shipments.</strong>
                  <span>Documented receiving shortages are allowed by the current finalization workflow.</span>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
