import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppTranslation } from '../i18n/I18nContext';
import type { AppLocale } from '../i18n/config';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
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

type UiTranslator = (englishText: string) => string;

const ALERT_TYPE_LABELS: Record<string, string> = {
  FINALIZED_SHIPMENT_INCOMPLETE_BLOCKING: 'Finalized shipment incomplete',
  NEGATIVE_STOCK_BLOCKING: 'Negative stock',
  ORPHANED_SHIPMENT_ITEM_BLOCKING: 'Orphaned shipment item',
  OVER_RECEIVED_BLOCKING: 'Over-received shipment',
  PO_OVER_RECEIVED_BLOCKING: 'Purchase order over-received',
  SHIPMENT_IMMUTABLE_BLOCKING: 'Shipment immutability violation',
  STOCK_LEDGER_DESYNC_BLOCKING: 'Stock ledger desynchronization',
  STOCK_LOT_DESYNC_BLOCKING: 'Stock lot desynchronization'
};

const ALERT_SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  warning: 'Warning'
};

function readableError(error: unknown, unknownErrorLabel: string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }
  return unknownErrorLabel;
}

function formatDateTime(value: string | null | undefined, locale: AppLocale): string {
  return formatLocalizedDateTime(value, locale);
}

function formatUpdatedAt(value: number, locale: AppLocale, ui: UiTranslator): string {
  if (!value) return ui('Not loaded yet');
  return formatDateTime(new Date(value).toISOString(), locale);
}

function shortId(value: string | null | undefined): string {
  if (!value) return '—';
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function formatAlertType(value: string, ui: UiTranslator): string {
  const label = ALERT_TYPE_LABELS[value.toUpperCase()];
  return label ? ui(label) : value;
}

function formatAlertSeverity(value: string, ui: UiTranslator): string {
  const label = ALERT_SEVERITY_LABELS[value.toLowerCase()];
  return label ? ui(label) : value;
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
  const { locale, ui } = useAppTranslation();
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
      setActionError(`Refresh incomplete: ${readableError(failedResult.error, ui('Unknown error'))}`);
      return;
    }

    setActionMessage(ui('Admin system data refreshed.'));
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
      setActionMessage(result.message || ui('Alert acknowledged.'));
      await refreshAdminAlertData();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(readableError(error, ui('Unknown error')));
    }
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAdminAlert,
    onSuccess: async (result, variables) => {
      setActionError(null);
      setActionMessage(result.message || ui('Alert resolved.'));
      setResolutionNoteByAlertId((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      await refreshAdminAlertData();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(readableError(error, ui('Unknown error')));
    }
  });

  const overrideMutation = useMutation({
    mutationFn: overrideAdminAlert,
    onSuccess: async (result, variables) => {
      setActionError(null);
      setActionMessage(result.message || ui('Blocking alert overridden.'));
      setOverrideReasonByAlertId((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      await refreshAdminAlertData();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(readableError(error, ui('Unknown error')));
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

  const writeStatus = systemStatusQuery.isLoading ? ui('Loading…') : statusUnavailable ? ui('Unavailable') : effectiveWriteLocked ? ui('Locked') : ui('Open');
  const maintenanceStatus = systemStatusQuery.isLoading ? ui('Loading…') : statusUnavailable ? ui('Unavailable') : maintenanceEnabled ? ui('Enabled') : ui('Disabled');
  const blockingStatus = systemStatusQuery.isLoading ? ui('Loading…') : statusUnavailable ? ui('Unavailable') : formatLocalizedNumber(blockingCount, locale);
  const diagnosticsLoading = canViewTenantDiagnostics && (
    blockingAlertsQuery.isLoading || stockIntegrityQuery.isLoading || brokenShipmentsQuery.isLoading
  );
  const diagnosticsUnavailable = canViewTenantDiagnostics && (
    blockingAlertsQuery.isError || stockIntegrityQuery.isError || brokenShipmentsQuery.isError
  );
  const diagnosticIssueCount = blockingCount + loadedIntegrityIssueCount;
  const diagnosticAccessStatus = !canViewTenantDiagnostics
    ? ui('Restricted')
    : diagnosticsLoading
      ? ui('Loading…')
      : diagnosticsUnavailable
        ? ui('Unavailable')
        : diagnosticIssueCount > 0
          ? ui('Attention')
          : ui('Healthy');
  const diagnosticHelper = !canViewTenantDiagnostics
    ? ui('Tenant Diagnostics · Read permission required')
    : diagnosticsLoading
      ? ui('Loading blocking, stock, and shipment integrity checks')
      : diagnosticsUnavailable
        ? ui('One or more tenant diagnostic checks could not be loaded')
        : diagnosticIssueCount > 0
          ? ui('{blockerCount} blocking alerts · {issueCount} loaded stock / shipment issues')
              .replace('{blockerCount}', formatLocalizedNumber(blockingCount, locale))
              .replace('{issueCount}', formatLocalizedNumber(loadedIntegrityIssueCount, locale))
          : ui('No blocking, stock, or shipment integrity issues detected');
  const pageHealth = systemStatusQuery.isLoading
    ? ui('Loading…')
    : statusUnavailable
      ? ui('Unavailable')
      : effectiveWriteLocked
        ? ui('Write locked')
        : maintenanceEnabled
          ? ui('Maintenance')
          : blockingCount > 0
            ? ui('Attention')
            : ui('Operational');
  const pageHealthLabel = ui('tenant administrative health · refreshed {time}')
    .replace('{time}', formatUpdatedAt(lastUpdatedAt, locale, ui));
  const blockingHeaderCount = statusUnavailable ? loadedBlockingCount : blockingCount;
  const alertActionsBlockedByWriteLock = effectiveWriteLocked;

  return (
    <div className="admin-system-page io-operational-page io-workspace-page" id="admin-system-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/admin-system"
        eyebrow={ui('Administration & integrity')}
        title={ui('Admin system')}
        description={ui('Review tenant operational posture, write-lock and maintenance signals, blocking alerts, and tenant-scoped integrity diagnostics. Platform controls remain read-only from this tenant page.')}
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Platform signals read-only')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Diagnostics permission-gated')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Alert actions permission-gated')}</OperationalWorkspaceMetaPill>
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
              {isAdminSystemRefreshing ? ui('Refreshing…') : ui('Refresh')}
            </button>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel={ui('Admin system overview')}>
        <OperationalWorkspaceStatCard
          label={ui('Effective write status')}
          value={writeStatus}
          helper={ui('Platform and tenant write locks combined')}
          tone={!systemStatusQuery.isLoading && !statusUnavailable && effectiveWriteLocked ? 'danger' : 'good'}
          iconPath="/admin-system"
          loading={systemStatusQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui('Maintenance')}
          value={maintenanceStatus}
          helper={ui('Platform maintenance signal visible to this tenant')}
          tone={!systemStatusQuery.isLoading && !statusUnavailable && maintenanceEnabled ? 'warn' : 'neutral'}
          iconPath="/reliability-command"
          loading={systemStatusQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui('Blocking alerts')}
          value={blockingStatus}
          helper={ui('Unresolved tenant blockers affecting protected operations')}
          tone={!systemStatusQuery.isLoading && !statusUnavailable && blockingCount > 0 ? 'danger' : 'good'}
          iconPath="/alerts"
          loading={systemStatusQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui('Tenant diagnostics')}
          value={diagnosticAccessStatus}
          helper={diagnosticHelper}
          tone={!canViewTenantDiagnostics || diagnosticsLoading || diagnosticsUnavailable ? 'neutral' : diagnosticIssueCount > 0 ? 'warn' : 'good'}
          iconPath="/audit"
        />
      </OperationalWorkspaceStats>

      {actionMessage ? <div className="app-success-state admin-system-message" role="status">{actionMessage}</div> : null}
      {actionError ? <div className="app-error-state admin-system-message" role="alert">{actionError}</div> : null}

      <section className="app-panel admin-system-panel">
        <OperationalSectionHeader
          iconPath="/admin-system"
          title={ui('Operational posture')}
          description={ui('Current tenant write availability and platform maintenance signals. This page reports these controls; it does not change platform or tenant lock settings.')}
          actions={
            statusUnavailable
              ? <StatusBadge tone="danger">{ui('STATUS UNAVAILABLE')}</StatusBadge>
              : effectiveWriteLocked
                ? <StatusBadge tone="danger">{ui('WRITES BLOCKED')}</StatusBadge>
                : <StatusBadge tone="good">{ui('WRITES OPEN')}</StatusBadge>
          }
        />

        {systemStatusQuery.isLoading ? <div className="app-empty-state admin-system-message">{ui('Loading system status…')}</div> : null}
        {systemStatusQuery.error ? <div className="app-error-state admin-system-message">{readableError(systemStatusQuery.error, ui('Unknown error'))}</div> : null}

        {systemStatusQuery.data ? (
          <div className="admin-system-status-grid">
            <div className="admin-system-status-item admin-system-status-item--tenant">
              <span>{ui('Tenant ID')}</span>
              <strong className="admin-system-mono">{systemStatusQuery.data.tenant_id ?? '—'}</strong>
            </div>
            <div className="admin-system-status-item">
              <span>{ui('Reported at')}</span>
              <strong>{formatDateTime(systemStatusQuery.data.generated_at ?? systemStatusQuery.data.timestamp, locale)}</strong>
            </div>
            <div className="admin-system-status-item">
              <span>{ui('Platform write lock')}</span>
              <strong>{systemWriteLocked ? ui('Enabled') : ui('Disabled')}</strong>
              <StatusBadge tone={systemWriteLocked ? 'danger' : 'good'}>{systemWriteLocked ? ui('LOCKED') : ui('CLEAR')}</StatusBadge>
            </div>
            <div className="admin-system-status-item">
              <span>{ui('Tenant write lock')}</span>
              <strong>{tenantWriteLocked ? ui('Enabled') : ui('Disabled')}</strong>
              <StatusBadge tone={tenantWriteLocked ? 'danger' : 'good'}>{tenantWriteLocked ? ui('LOCKED') : ui('CLEAR')}</StatusBadge>
            </div>
            <div className="admin-system-status-item">
              <span>{ui('Effective write status')}</span>
              <strong>{effectiveWriteLocked ? ui('Locked') : ui('Open')}</strong>
              <StatusBadge tone={effectiveWriteLocked ? 'danger' : 'good'}>{effectiveWriteLocked ? ui('BLOCKED') : ui('OPEN')}</StatusBadge>
            </div>
            <div className="admin-system-status-item">
              <span>{ui('Maintenance mode')}</span>
              <strong>{maintenanceEnabled ? ui('Enabled') : ui('Disabled')}</strong>
              <StatusBadge tone={maintenanceEnabled ? 'warn' : 'neutral'}>{maintenanceEnabled ? ui('ACTIVE') : ui('OFF')}</StatusBadge>
            </div>
            <div className="admin-system-status-item">
              <span>{ui('Unresolved blocking alerts')}</span>
              <strong>{formatLocalizedNumber(blockingCount, locale)}</strong>
              <StatusBadge tone={blockingCount > 0 ? 'danger' : 'good'}>{blockingCount > 0 ? ui('ATTENTION') : ui('CLEAR')}</StatusBadge>
            </div>
          </div>
        ) : null}

        {effectiveWriteLocked ? (
          <div className="app-warning-state admin-system-message">
            <strong>{ui('Protected write operations are currently blocked.')}</strong>{' '}
            {ui('The active source is {source}. Alert acknowledge, resolve, and override actions are disabled here until the lock is cleared.').replace('{source}', systemWriteLocked && tenantWriteLocked ? ui('both the platform and tenant write locks') : systemWriteLocked ? ui('the platform write lock') : ui('the tenant write lock'))}
          </div>
        ) : null}
      </section>

      <section className="app-panel admin-system-panel">
        <OperationalSectionHeader
          iconPath="/audit"
          title={ui('Tenant diagnostics')}
          description={ui('Restricted tenant-scoped integrity checks. Each diagnostic list loads up to 100 current rows; the Blocking alerts KPI above remains the authoritative total blocker count.')}
          actions={
            canViewTenantDiagnostics
              ? <StatusBadge tone={canManageAlerts || canOverrideAlerts ? 'blue' : 'neutral'}>{canManageAlerts || canOverrideAlerts ? ui('DIAGNOSTICS AVAILABLE') : ui('READ ONLY')}</StatusBadge>
              : <StatusBadge tone="neutral">{ui('PERMISSION REQUIRED')}</StatusBadge>
          }
        />

        {!canViewTenantDiagnostics ? (
          <div className="app-warning-state admin-system-message">{ui('Diagnostics require Tenant Diagnostics · Read permission.')}</div>
        ) : (
          <div className="admin-system-diagnostics">
            {!canManageAlerts && !canOverrideAlerts ? (
              <div className="app-empty-state admin-system-message">{ui('Diagnostics are read-only for your current permission set.')}</div>
            ) : null}
            {alertActionsBlockedByWriteLock && (canManageAlerts || canOverrideAlerts) ? (
              <div className="app-warning-state admin-system-message">{ui('Alert actions are disabled while the effective write status is locked.')}</div>
            ) : null}

            <section className="admin-system-diagnostic-group" aria-labelledby="admin-system-blocking-heading">
              <div className="admin-system-diagnostic-heading">
                <div>
                  <h4 id="admin-system-blocking-heading">{ui('Blocking alerts')}</h4>
                  <p>{ui('Unresolved blocking alerts that can stop protected tenant operations.')}</p>
                </div>
                <DiagnosticCount>{blockingAlertsQuery.isLoading ? ui('Loading…') : formatLocalizedNumber(blockingHeaderCount, locale)}</DiagnosticCount>
              </div>

              {blockingAlertsQuery.error ? <div className="app-error-state admin-system-message">{readableError(blockingAlertsQuery.error, ui('Unknown error'))}</div> : null}
              {blockingAlertsQuery.isLoading ? <div className="app-empty-state admin-system-message">{ui('Loading blocking diagnostics…')}</div> : null}
              {blockingAlertsQuery.data?.length ? blockingAlertsQuery.data.map((row) => {
                const alertTitle = formatAlertType(row.type, ui);
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
                      <StatusBadge tone={row.severity.toLowerCase() === 'critical' || row.severity.toLowerCase() === 'high' ? 'danger' : 'warn'}>{formatAlertSeverity(row.severity, ui)}</StatusBadge>
                    </div>
                    <div className="admin-system-diagnostic-meta">
                      <span>{formatDateTime(row.created_at, locale)}</span>
                      {row.product_name ? <span>{row.product_name}</span> : null}
                      <span>{row.acknowledged ? ui('Acknowledged') : ui('Not acknowledged')}</span>
                    </div>

                    {canManageAlerts ? (
                      <div className="admin-system-action-block">
                        <label className="admin-system-field">
                          <span>{ui('Resolution note')}</span>
                          <textarea
                            value={resolutionNote}
                            onChange={(event) => setResolutionNoteByAlertId((current) => ({ ...current, [row.id]: event.target.value }))}
                            placeholder={ui('Explain what was checked and why this blocker can be closed.')}
                            rows={2}
                            maxLength={2000}
                            disabled={isBusy}
                          />
                          <small>{ui('At least 3 characters are required before Resolve is enabled.')}</small>
                        </label>
                        <div className="admin-system-actions">
                          {!row.acknowledged ? (
                            <button
                              type="button"
                              className="app-button app-button--secondary"
                              onClick={() => acknowledgeMutation.mutate(row.id)}
                              disabled={isBusy}
                            >
                              {isAcknowledging ? ui('Acknowledging…') : ui('Acknowledge')}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="app-button app-button--primary"
                            onClick={() => resolveMutation.mutate({ id: row.id, resolutionNote: resolutionNote.trim() })}
                            disabled={isBusy || resolutionNote.trim().length < 3}
                          >
                            {isResolving ? ui('Resolving…') : ui('Resolve')}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {canOverrideAlerts ? (
                      <div className="admin-system-override-box">
                        <div>
                          <strong>{ui('Emergency blocking-alert override')}</strong>
                          <p>{ui('Use only after the underlying issue has been independently checked and normal resolution is not appropriate.')}</p>
                        </div>
                        <label className="admin-system-field">
                          <span>{ui('Mandatory override reason')}</span>
                          <textarea
                            value={overrideReason}
                            onChange={(event) => setOverrideReasonByAlertId((current) => ({ ...current, [row.id]: event.target.value }))}
                            placeholder={ui('Why is an emergency override justified?')}
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
                              setActionError(ui('Override reason must contain at least 3 characters.'));
                              return;
                            }
                            if (window.confirm(ui('Override and close {alert}? This is an emergency administrative action.').replace('{alert}', alertTitle))) {
                              overrideMutation.mutate({ id: row.id, reason: cleanReason });
                            }
                          }}
                          disabled={isBusy || overrideReason.trim().length < 3}
                        >
                          {isOverriding ? ui('Overriding…') : ui('Override and close blocking alert')}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              }) : !blockingAlertsQuery.isLoading && !blockingAlertsQuery.error ? (
                <div className="admin-system-empty-good">
                  <strong>{ui('No unresolved blocking diagnostics.')}</strong>
                  <span>{ui('No tenant blocker rows were returned in the current diagnostic scope.')}</span>
                </div>
              ) : null}
            </section>

            <section className="admin-system-diagnostic-group" aria-labelledby="admin-system-stock-heading">
              <div className="admin-system-diagnostic-heading">
                <div>
                  <h4 id="admin-system-stock-heading">{ui('Stock integrity')}</h4>
                  <p>{ui('Negative stock balances that require operational investigation.')}</p>
                </div>
                <DiagnosticCount>{stockIntegrityQuery.isLoading ? ui('Loading…') : (loadedStockIssueCount === 1 ? ui('{count} issue') : ui('{count} issues')).replace('{count}', formatLocalizedNumber(loadedStockIssueCount, locale))}</DiagnosticCount>
              </div>

              {stockIntegrityQuery.error ? <div className="app-error-state admin-system-message">{readableError(stockIntegrityQuery.error, ui('Unknown error'))}</div> : null}
              {stockIntegrityQuery.isLoading ? <div className="app-empty-state admin-system-message">{ui('Loading stock integrity issues…')}</div> : null}
              {stockIntegrityQuery.data?.length ? stockIntegrityQuery.data.map((row) => (
                <article key={row.id} className="admin-system-diagnostic-card">
                  <div className="admin-system-diagnostic-card__topline">
                    <div>
                      <strong>{row.product_name || ui('Product {id}').replace('{id}', shortId(row.product_id))}</strong>
                      <p>{ui('Negative stock at {location}.').replace('{location}', row.storage_location_name || ui('location {id}').replace('{id}', shortId(row.storage_location_id)))}</p>
                    </div>
                    <StatusBadge tone="danger">{ui('NEGATIVE STOCK')}</StatusBadge>
                  </div>
                  <div className="admin-system-diagnostic-meta">
                    <span>{ui('Quantity {quantity}').replace('{quantity}', `${formatLocalizedNumber(toCount(row.quantity), locale)}${row.product_unit ? ` ${row.product_unit}` : ''}`)}</span>
                    <span>{ui('Updated {time}').replace('{time}', formatDateTime(row.updated_at, locale))}</span>
                  </div>
                </article>
              )) : !stockIntegrityQuery.isLoading && !stockIntegrityQuery.error ? (
                <div className="admin-system-empty-good">
                  <strong>{ui('No negative stock integrity issues.')}</strong>
                  <span>{ui('All loaded tenant stock balances are non-negative.')}</span>
                </div>
              ) : null}
            </section>

            <section className="admin-system-diagnostic-group" aria-labelledby="admin-system-shipments-heading">
              <div className="admin-system-diagnostic-heading">
                <div>
                  <h4 id="admin-system-shipments-heading">{ui('Shipment integrity')}</h4>
                  <p>{ui('Finalized receiving records with undocumented shortages.')}</p>
                </div>
                <DiagnosticCount>{brokenShipmentsQuery.isLoading ? ui('Loading…') : (loadedBrokenShipmentCount === 1 ? ui('{count} issue') : ui('{count} issues')).replace('{count}', formatLocalizedNumber(loadedBrokenShipmentCount, locale))}</DiagnosticCount>
              </div>

              {brokenShipmentsQuery.error ? <div className="app-error-state admin-system-message">{readableError(brokenShipmentsQuery.error, ui('Unknown error'))}</div> : null}
              {brokenShipmentsQuery.isLoading ? <div className="app-empty-state admin-system-message">{ui('Loading shipment integrity issues…')}</div> : null}
              {brokenShipmentsQuery.data?.length ? brokenShipmentsQuery.data.map((row) => (
                <article key={row.id} className="admin-system-diagnostic-card">
                  <div className="admin-system-diagnostic-card__topline">
                    <div>
                      <strong>{row.po_number ? ui('PO {number}').replace('{number}', row.po_number) : ui('Shipment {id}').replace('{id}', shortId(row.id))}</strong>
                      <p>{`${row.supplier_name ? `${row.supplier_name} · ` : ''}${ui('Finalized shipment contains an undocumented receiving shortage.')}`}</p>
                    </div>
                    <StatusBadge tone="danger">{ui('UNDOCUMENTED SHORTAGE')}</StatusBadge>
                  </div>
                  <div className="admin-system-diagnostic-meta">
                    <span>{ui('Ordered {quantity}').replace('{quantity}', formatLocalizedNumber(toCount(row.total_ordered_quantity), locale))}</span>
                    <span>{ui('Received {quantity}').replace('{quantity}', formatLocalizedNumber(toCount(row.total_received_quantity), locale))}</span>
                    <span>{ui('Undocumented shortage lines {count}').replace('{count}', formatLocalizedNumber(toCount(row.undocumented_shortage_line_count), locale))}</span>
                    <span>{ui('Shipment {id}').replace('{id}', shortId(row.id))}</span>
                  </div>
                </article>
              )) : !brokenShipmentsQuery.isLoading && !brokenShipmentsQuery.error ? (
                <div className="admin-system-empty-good">
                  <strong>{ui('No invalid finalized shipments.')}</strong>
                  <span>{ui('Documented receiving shortages are allowed by the current finalization workflow.')}</span>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
