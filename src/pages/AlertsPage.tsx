import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import './OperationalExperiencePages.css';
import './AlertsPage.css';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import {
  TENANT_PERMISSIONS,
  getCurrentAccessRoleLabel,
  getRoleCapabilities,
  hasPermission
} from '../lib/permissions';

type AlertSeverity = 'info' | 'warning' | 'critical';

type AlertRow = {
  id: string;
  tenant_id: string;
  product_id?: string | null;
  product_name?: string | null;
  product_category?: string | null;
  product_unit?: string | null;
  type: string;
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolution_note?: string | null;
  severity: AlertSeverity;
  escalation_level: number;
  acknowledged: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  acknowledged_by_name?: string | null;
  last_escalated_at?: string | null;
};

type ProductOption = {
  id: string;
  name: string;
  category?: string | null;
};

type AlertFilters = {
  search: string;
  severity: string;
  resolved: string;
  acknowledged: string;
  limit: string;
};

type ManualAlertFormState = {
  type: string;
  message: string;
  severity: AlertSeverity;
  product_id: string;
};

type AlertActionInput = {
  id: string;
  title: string;
};

type ResolveAlertInput = AlertActionInput & {
  resolutionNote: string;
};

const DEFAULT_LIMIT = '100';

const emptyManualAlertForm: ManualAlertFormState = {
  type: '',
  message: '',
  severity: 'warning',
  product_id: ''
};

function filtersFromSearchParams(searchParams: URLSearchParams): AlertFilters {
  const rawSeverity = searchParams.get('severity')?.trim() || '';
  const rawResolved = searchParams.get('resolved')?.trim() || 'false';
  const rawAcknowledged = searchParams.get('acknowledged')?.trim() || '';
  const rawLimit = searchParams.get('limit') || '';

  return {
    search: (searchParams.get('search')?.trim() || '').slice(0, 200),
    severity: ['', 'info', 'warning', 'critical'].includes(rawSeverity) ? rawSeverity : '',
    resolved: ['', 'true', 'false'].includes(rawResolved) ? rawResolved : 'false',
    acknowledged: ['', 'true', 'false'].includes(rawAcknowledged) ? rawAcknowledged : '',
    limit: ['25', '50', '100', '250'].includes(rawLimit) ? rawLimit : DEFAULT_LIMIT
  };
}

async function fetchAlerts(filters: AlertFilters): Promise<AlertRow[]> {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.severity.trim()) params.set('severity', filters.severity.trim());
  if (filters.resolved.trim()) params.set('resolved', filters.resolved.trim());
  if (filters.acknowledged.trim()) params.set('acknowledged', filters.acknowledged.trim());
  params.set('limit', filters.limit || DEFAULT_LIMIT);

  return apiRequest<AlertRow[]>(`/alerts?${params.toString()}`);
}

async function fetchProductOptions(): Promise<ProductOption[]> {
  return apiRequest<ProductOption[]>('/products?limit=500');
}

async function createManualAlert(input: ManualAlertFormState): Promise<AlertRow> {
  return apiRequest<AlertRow>('/alerts', {
    method: 'POST',
    body: JSON.stringify({
      type: input.type.trim(),
      message: input.message.trim(),
      severity: input.severity,
      product_id: input.product_id || null,
      escalation_level: 0
    })
  });
}

async function acknowledgeAlert(id: string): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function resolveAlert(input: { id: string; resolutionNote: string }): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${input.id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution_note: input.resolutionNote.trim() })
  });
}

async function reopenAlert(id: string): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${id}/reopen`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function escalateAlert(id: string): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${id}/escalate`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function overrideBlockingAlert(input: { id: string; reason: string }): Promise<{ message: string; alert: AlertRow }> {
  return apiRequest<{ message: string; alert: AlertRow }>(`/admin/alerts/${input.id}/override`, {
    method: 'POST',
    body: JSON.stringify({ reason: input.reason.trim() })
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatAlertType(value: string | null | undefined): string {
  if (!value) return 'Alert';

  const words = value
    .trim()
    .split(/[_-]+|\s+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());

  if (!words.length) return 'Alert';
  const text = words.join(' ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function severityLabel(severity: AlertSeverity): string {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Warning';
  return 'Info';
}

function severityStyle(severity: AlertSeverity): CSSProperties {
  if (severity === 'critical') {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }

  if (severity === 'warning') {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }

  return { ...styles.badge, background: '#dbeafe', color: '#1d4ed8' };
}

function isBlockingAlertType(type: string): boolean {
  return type.trim().toUpperCase().endsWith('_BLOCKING');
}

function blocksProtectedOperations(alert: AlertRow): boolean {
  return !alert.resolved && alert.severity === 'critical';
}

function nextActionLink(alert: AlertRow): { to: string; label: string } | null {
  const type = alert.type.toUpperCase();

  if (alert.product_id && hasPermission(TENANT_PERMISSIONS.STOCK_READ)) {
    return { to: '/stock', label: 'Open Stock' };
  }

  if (type.includes('SHIPMENT') && hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ)) {
    return { to: '/shipments', label: 'Open Shipments' };
  }

  if (type.includes('TRANSFER') && hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_READ)) {
    return { to: '/stock-transfers', label: 'Open Stock Transfers' };
  }

  if (type.includes('RESERVATION') && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ)) {
    return { to: '/inventory-reservations', label: 'Open Reservations' };
  }

  if (type.includes('REQUISITION') && hasPermission(TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ)) {
    return { to: '/inventory-requisitions', label: 'Open Requisitions' };
  }

  if ((type.includes('USAGE') || type.includes('CONSUMPTION') || type.includes('DAMAGE')) && hasPermission(TENANT_PERMISSIONS.INVENTORY_USAGE_READ)) {
    return { to: '/inventory-usage', label: 'Open Inventory Usage' };
  }

  if ((type.includes('PURCHASE_ORDER') || type.includes('PROCUREMENT')) && hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_READ)) {
    return { to: '/purchase-orders', label: 'Open Purchase Orders' };
  }

  if (type.includes('SUPPLIER') && hasPermission(TENANT_PERMISSIONS.SUPPLIERS_READ)) {
    return { to: '/suppliers', label: 'Open Suppliers' };
  }

  if (type.includes('EXECUTION') && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)) {
    return { to: '/execution-tasks', label: 'Open Execution Tasks' };
  }

  if (hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ)) {
    return { to: '/action-center', label: 'Open Action Center' };
  }

  return null;
}

function buildSearchParams(filters: AlertFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.resolved) params.set('resolved', filters.resolved);
  if (filters.acknowledged) params.set('acknowledged', filters.acknowledged);
  params.set('limit', filters.limit || DEFAULT_LIMIT);
  return params;
}

function mutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canManageAlerts, canOverrideAlerts } = getRoleCapabilities();
  const canReadProducts = hasPermission(TENANT_PERMISSIONS.PRODUCTS_READ);
  const accessRoleLabel = getCurrentAccessRoleLabel();
  const [filters, setFilters] = useState<AlertFilters>(() => filtersFromSearchParams(searchParams));
  const [filterForm, setFilterForm] = useState<AlertFilters>(() => filtersFromSearchParams(searchParams));
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [resolutionNoteByAlertId, setResolutionNoteByAlertId] = useState<Record<string, string>>({});
  const [overrideReasonByAlertId, setOverrideReasonByAlertId] = useState<Record<string, string>>({});
  const [manualAlertForm, setManualAlertForm] = useState<ManualAlertFormState>(emptyManualAlertForm);

  const alertsQuery = useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => fetchAlerts(filters)
  });

  const productsQuery = useQuery({
    queryKey: ['alerts-product-options'],
    queryFn: fetchProductOptions,
    enabled: canManageAlerts && canReadProducts,
    staleTime: 60_000
  });

  const invalidateAlertSurfaces = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-unresolved-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['operational-action-center'] })
    ]);
  };

  const createAlertMutation = useMutation({
    mutationFn: createManualAlert,
    onSuccess: async () => {
      setManualAlertForm(emptyManualAlertForm);
      setActionError(null);
      setActionMessage('Manual alert created successfully.');
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, 'Failed to create the manual alert.'));
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (input: AlertActionInput) => acknowledgeAlert(input.id),
    onSuccess: async (_result, input) => {
      setActionError(null);
      setActionMessage(`${input.title} acknowledged successfully.`);
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, 'Failed to acknowledge the alert.'));
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (input: ResolveAlertInput) => resolveAlert({ id: input.id, resolutionNote: input.resolutionNote }),
    onSuccess: async (_result, input) => {
      setResolutionNoteByAlertId((current) => ({ ...current, [input.id]: '' }));
      setActionError(null);
      setActionMessage(`${input.title} resolved successfully.`);
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, 'Failed to resolve the alert.'));
    }
  });

  const reopenMutation = useMutation({
    mutationFn: (input: AlertActionInput) => reopenAlert(input.id),
    onSuccess: async (_result, input) => {
      setActionError(null);
      setActionMessage(`${input.title} reopened successfully.`);
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, 'Failed to reopen the alert.'));
    }
  });

  const escalateMutation = useMutation({
    mutationFn: (input: AlertActionInput) => escalateAlert(input.id),
    onSuccess: async (_result, input) => {
      setActionError(null);
      setActionMessage(`${input.title} escalation level increased successfully.`);
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, 'Failed to escalate the alert.'));
    }
  });

  const overrideMutation = useMutation({
    mutationFn: overrideBlockingAlert,
    onSuccess: async (_result, input) => {
      setOverrideReasonByAlertId((current) => ({ ...current, [input.id]: '' }));
      setActionError(null);
      setActionMessage('Blocking alert overridden and closed successfully.');
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, 'Failed to override the blocking alert.'));
    }
  });

  const alerts = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);
  const summary = useMemo(
    () => ({
      total: alerts.length,
      unresolved: alerts.filter((alert) => !alert.resolved).length,
      critical: alerts.filter((alert) => !alert.resolved && alert.severity === 'critical').length,
      unacknowledged: alerts.filter((alert) => !alert.resolved && !alert.acknowledged).length
    }),
    [alerts]
  );

  const updateManualAlertField = (field: keyof ManualAlertFormState, value: string) => {
    setManualAlertForm((current) => ({ ...current, [field]: value }));
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters = { ...filterForm, search: filterForm.search.trim() };
    setFilters(nextFilters);
    setSearchParams(buildSearchParams(nextFilters), { replace: true });
  };

  const clearFilters = () => {
    const cleared: AlertFilters = {
      search: '',
      severity: '',
      resolved: 'false',
      acknowledged: '',
      limit: DEFAULT_LIMIT
    };
    setFilterForm(cleared);
    setFilters(cleared);
    setSearchParams(buildSearchParams(cleared), { replace: true });
  };

  const submitManualAlert = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const type = manualAlertForm.type.trim();
    const message = manualAlertForm.message.trim();

    if (!type) {
      setActionMessage(null);
      setActionError('Alert type is required.');
      return;
    }

    if (!message) {
      setActionMessage(null);
      setActionError('Alert message is required.');
      return;
    }

    if (
      manualAlertForm.severity === 'critical'
      && !window.confirm('Create a Critical alert? Unresolved Critical alerts block protected stock and shipment operations until they are resolved.')
    ) {
      return;
    }

    createAlertMutation.mutate({ ...manualAlertForm, type, message });
  };

  if (alertsQuery.isLoading) {
    return (
      <div className="app-panel app-panel--padded" style={styles.loadingState}>
        <strong>Loading alerts…</strong>
        <span>Retrieving the current tenant alert queue.</span>
      </div>
    );
  }

  if (alertsQuery.isError) {
    return (
      <div className="app-error-state" style={styles.loadErrorState}>
        <strong>Alerts could not be loaded.</strong>
        <span>{mutationErrorMessage(alertsQuery.error, 'The alert request failed.')}</span>
        <button type="button" style={styles.secondaryButton} onClick={() => alertsQuery.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="io-operational-page alerts-page io-workspace-page" style={styles.page} data-alerts-refined="true">
      <OperationalWorkspaceHero
        iconPath="/alerts"
        eyebrow="Operational alert control"
        title="Alert workspace"
        description={
          <p>
            Open the linked source page first, confirm the real condition, acknowledge the alert when somebody takes ownership, then resolve it with a meaningful note. Escalation increases the alert's escalation level but does not notify anyone automatically.
          </p>
        }
        meta={
          <>
            <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Open → acknowledge → resolve</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Source workflow stays authoritative</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <>
            <OperationalWorkspaceStatus value={summary.unresolved} label={`open alert${summary.unresolved === 1 ? '' : 's'} in the current view`} />
            <button type="button" className="app-button app-button--secondary" onClick={() => alertsQuery.refetch()} disabled={alertsQuery.isFetching}>
              {alertsQuery.isFetching ? 'Refreshing…' : 'Refresh alerts'}
            </button>
          </>
        }
      />

      <div className="app-grid-stats io-workspace-stats" style={styles.statsGrid}>
        <OperationalWorkspaceStatCard label="Visible results" value={summary.total} helper={<>Up to {filters.limit} alerts matching the applied filters</>} tone="blue" iconPath="/alerts" />
        <OperationalWorkspaceStatCard label="Open" value={summary.unresolved} helper="Still requiring review or action" tone="amber" iconPath="/action-center" />
        <OperationalWorkspaceStatCard label="Critical open" value={summary.critical} helper="Blocks protected stock and shipment operations until resolved" tone="red" iconPath="/reliability-command" />
        <OperationalWorkspaceStatCard label="Unacknowledged open" value={summary.unacknowledged} helper="No operator has taken ownership yet" tone="slate" iconPath="/collaboration" />
      </div>

      {!canManageAlerts ? (
        <div className="app-warning-state" style={styles.messageBox}>
          Current access role: {accessRoleLabel}. You can review alerts and open permitted source pages, but alert changes require Alerts write permission.
        </div>
      ) : null}

      {actionError ? <div className="app-error-state" style={styles.messageBox} role="alert">{actionError}</div> : null}
      {actionMessage ? <div className="app-success-state" style={styles.messageBox} role="status">{actionMessage}</div> : null}

      {canManageAlerts ? (
        <section className="app-panel app-panel--padded alerts-section alerts-section--manual" style={styles.panel}>
          <div className="alerts-section-heading"><span className="alerts-heading-icon"><TenantNavIcon path="/alerts" size={18} /></span><h2 style={styles.panelTitle}>Create a manual alert</h2></div>
          <p style={styles.formHint}>
            Use this only for a real operational issue that is not already represented by an existing alert. New manual alerts start at escalation level 0.
          </p>

          <form onSubmit={submitManualAlert} style={styles.formStack}>
            <div className="app-grid-toolbar" style={styles.createGrid}>
              <label style={styles.fieldLabel}>
                <span>Alert type</span>
                <input
                  style={styles.input}
                  value={manualAlertForm.type}
                  onChange={(event) => updateManualAlertField('type', event.target.value)}
                  placeholder="Example: Supplier delivery delay"
                  maxLength={100}
                  disabled={createAlertMutation.isPending}
                  required
                />
              </label>

              <label style={styles.fieldLabel}>
                <span>Severity</span>
                <select
                  style={styles.input}
                  value={manualAlertForm.severity}
                  onChange={(event) => updateManualAlertField('severity', event.target.value as AlertSeverity)}
                  disabled={createAlertMutation.isPending}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
                {manualAlertForm.severity === 'critical' ? (
                  <small style={styles.criticalHelp}>Critical alerts block protected stock and shipment operations until resolved.</small>
                ) : null}
              </label>

              {canReadProducts ? (
                <label style={styles.fieldLabel}>
                  <span>Related product (optional)</span>
                  <select
                    style={styles.input}
                    value={manualAlertForm.product_id}
                    onChange={(event) => updateManualAlertField('product_id', event.target.value)}
                    disabled={createAlertMutation.isPending || productsQuery.isLoading}
                  >
                    <option value="">No product link</option>
                    {(productsQuery.data ?? []).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}{product.category ? ` — ${product.category}` : ''}
                      </option>
                    ))}
                  </select>
                  {productsQuery.isError ? <small style={styles.fieldHelp}>Products could not be loaded. The alert can still be created without a product link.</small> : null}
                </label>
              ) : null}
            </div>

            <label style={styles.fieldLabel}>
              <span>Alert message</span>
              <textarea
                style={styles.textareaNeutral}
                value={manualAlertForm.message}
                onChange={(event) => updateManualAlertField('message', event.target.value)}
                placeholder="Describe the issue, its impact, and what needs attention."
                maxLength={2000}
                rows={4}
                disabled={createAlertMutation.isPending}
                required
              />
            </label>

            <div className="app-actions">
              <button
                style={styles.primaryButton}
                disabled={createAlertMutation.isPending || !manualAlertForm.type.trim() || !manualAlertForm.message.trim()}
                type="submit"
              >
                {createAlertMutation.isPending ? 'Creating…' : 'Create alert'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="app-panel app-panel--padded alerts-section" style={styles.panel}>
        <div className="alerts-section-heading"><span className="alerts-heading-icon alerts-heading-icon--slate"><TenantNavIcon path="/reports" size={18} /></span><h2 style={styles.panelTitle}>Filter the alert queue</h2></div>
        <form onSubmit={applyFilters} style={styles.formStack}>
          <div className="app-grid-toolbar" style={styles.filterGrid}>
            <label style={styles.fieldLabel}>
              <span>Search</span>
              <input
                style={styles.input}
                value={filterForm.search}
                onChange={(event) => setFilterForm((current) => ({ ...current, search: event.target.value }))}
                placeholder="Message, type, or product"
                maxLength={200}
              />
            </label>

            <label style={styles.fieldLabel}>
              <span>Severity</span>
              <select style={styles.input} value={filterForm.severity} onChange={(event) => setFilterForm((current) => ({ ...current, severity: event.target.value }))}>
                <option value="">All severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Resolution state</span>
              <select style={styles.input} value={filterForm.resolved} onChange={(event) => setFilterForm((current) => ({ ...current, resolved: event.target.value }))}>
                <option value="">Open and resolved</option>
                <option value="false">Open only</option>
                <option value="true">Resolved only</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Ownership state</span>
              <select style={styles.input} value={filterForm.acknowledged} onChange={(event) => setFilterForm((current) => ({ ...current, acknowledged: event.target.value }))}>
                <option value="">Acknowledged and unacknowledged</option>
                <option value="false">Unacknowledged only</option>
                <option value="true">Acknowledged only</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Maximum results</span>
              <select style={styles.input} value={filterForm.limit} onChange={(event) => setFilterForm((current) => ({ ...current, limit: event.target.value }))}>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
              </select>
            </label>
          </div>
          <div className="app-actions">
            <button type="submit" style={styles.primaryButton}>Apply filters</button>
            <button type="button" style={styles.secondaryButton} onClick={clearFilters}>Clear filters</button>
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded alerts-section alerts-queue-section" style={styles.panel}>
        <div style={styles.queueHeader}>
          <div>
            <div className="alerts-section-heading"><span className="alerts-heading-icon"><TenantNavIcon path="/alerts" size={18} /></span><h2 style={styles.panelTitle}>Alert queue</h2></div>
            <p style={styles.formHint}>Open alerts appear before resolved alerts, with Critical items first.</p>
          </div>
          {alertsQuery.isFetching ? <span style={styles.refreshingText}>Refreshing…</span> : null}
        </div>

        {alerts.length === 0 ? (
          <div className="app-empty-state" style={styles.emptyState}>
            <strong>No alerts match the applied filters.</strong>
            <span>Clear the filters or confirm that the tenant currently has no matching alert records.</span>
          </div>
        ) : (
          <div style={styles.cardList}>
            {alerts.map((alert) => {
              const next = nextActionLink(alert);
              const alertTitle = formatAlertType(alert.type);
              const resolutionNote = resolutionNoteByAlertId[alert.id] ?? '';
              const overrideReason = overrideReasonByAlertId[alert.id] ?? '';
              const isAcknowledging = acknowledgeMutation.isPending && acknowledgeMutation.variables?.id === alert.id;
              const isResolving = resolveMutation.isPending && resolveMutation.variables?.id === alert.id;
              const isReopening = reopenMutation.isPending && reopenMutation.variables?.id === alert.id;
              const isEscalating = escalateMutation.isPending && escalateMutation.variables?.id === alert.id;
              const isOverriding = overrideMutation.isPending && overrideMutation.variables?.id === alert.id;

              return (
                <article style={styles.card} className="alerts-alert-card" data-severity={alert.severity} data-resolved={alert.resolved ? "true" : "false"} key={alert.id}>
                  <div style={styles.cardTop}>
                    <div style={styles.cardHeaderText}>
                      <div style={styles.cardTitle}>{alertTitle}</div>
                      <div style={styles.cardMeta}>
                        {alert.product_name || 'No product linked'} · Created {formatDateTime(alert.created_at)}
                      </div>
                    </div>
                    <div style={styles.badgeRow} className="alerts-badge-row">
                      <span style={severityStyle(alert.severity)}>{severityLabel(alert.severity)}</span>
                      <span style={alert.resolved ? styles.resolvedBadge : alert.acknowledged ? styles.acknowledgedBadge : styles.openBadge}>
                        {alert.resolved ? 'Resolved' : alert.acknowledged ? 'Acknowledged' : 'Open'}
                      </span>
                      {blocksProtectedOperations(alert) ? (
                        <span style={styles.blockingBadge}>
                          {isBlockingAlertType(alert.type) ? 'System blocker' : 'Operational blocker'}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={styles.cardText}>{alert.message}</div>

                  <div style={styles.keyGrid}>
                    <div style={styles.keyCard} className="alerts-key-card">
                      <strong style={styles.keyLabel}>Ownership</strong>
                      <div style={styles.keyValue}>{alert.acknowledged ? alert.acknowledged_by_name || 'Acknowledged' : 'Not acknowledged'}</div>
                      <small style={styles.keyHelp}>{alert.acknowledged ? formatDateTime(alert.acknowledged_at) : 'No operator has taken ownership.'}</small>
                    </div>
                    <div style={styles.keyCard} className="alerts-key-card">
                      <strong style={styles.keyLabel}>Escalation level</strong>
                      <div style={styles.keyValue}>{alert.escalation_level}</div>
                      <small style={styles.keyHelp}>{alert.last_escalated_at ? `Last escalated ${formatDateTime(alert.last_escalated_at)}` : 'Not escalated.'}</small>
                    </div>
                    <div style={styles.keyCard} className="alerts-key-card">
                      <strong style={styles.keyLabel}>Resolution</strong>
                      <div style={styles.keyValue}>{alert.resolved ? alert.resolved_by_name || 'Resolved' : 'Open'}</div>
                      <small style={styles.keyHelp}>{alert.resolved ? formatDateTime(alert.resolved_at) : 'No resolution recorded.'}</small>
                    </div>
                  </div>

                  {alert.resolved && alert.resolution_note ? (
                    <div style={styles.resolutionNoteBox}>
                      <strong>Resolution note</strong>
                      <span>{alert.resolution_note}</span>
                    </div>
                  ) : null}

                  {!alert.resolved && canManageAlerts ? (
                    <label style={styles.fieldLabel}>
                      <span>Resolution note</span>
                      <textarea
                        style={styles.textareaNeutral}
                        value={resolutionNote}
                        onChange={(event) => setResolutionNoteByAlertId((current) => ({ ...current, [alert.id]: event.target.value }))}
                        placeholder="Explain what was checked and why the alert can be closed."
                        maxLength={2000}
                        rows={2}
                        disabled={isResolving}
                      />
                      <small style={styles.fieldHelp}>At least 3 characters are required on this page before Resolve is enabled.</small>
                    </label>
                  ) : null}

                  <div className="app-actions" style={styles.actionRow}>
                    {next ? <Link to={next.to} style={styles.linkButton}><TenantNavIcon path={next.to} size={16} /><span>{next.label}</span></Link> : null}

                    {canManageAlerts && !alert.acknowledged && !alert.resolved ? (
                      <button
                        style={styles.secondaryButton}
                        onClick={() => acknowledgeMutation.mutate({ id: alert.id, title: alertTitle })}
                        disabled={isAcknowledging}
                        type="button"
                      >
                        {isAcknowledging ? 'Acknowledging…' : 'Acknowledge'}
                      </button>
                    ) : null}

                    {canManageAlerts && !alert.resolved ? (
                      <button
                        style={styles.primaryButton}
                        onClick={() => resolveMutation.mutate({ id: alert.id, title: alertTitle, resolutionNote })}
                        disabled={isResolving || resolutionNote.trim().length < 3}
                        type="button"
                      >
                        {isResolving ? 'Resolving…' : 'Resolve'}
                      </button>
                    ) : null}

                    {canManageAlerts && alert.resolved ? (
                      <button
                        style={styles.secondaryButton}
                        onClick={() => {
                          if (window.confirm(`Reopen ${alertTitle}? This clears its previous acknowledgement and resolution details.`)) {
                            reopenMutation.mutate({ id: alert.id, title: alertTitle });
                          }
                        }}
                        disabled={isReopening}
                        type="button"
                      >
                        {isReopening ? 'Reopening…' : 'Reopen'}
                      </button>
                    ) : null}

                    {canManageAlerts && !alert.resolved ? (
                      <button
                        style={styles.warnButton}
                        onClick={() => {
                          if (window.confirm(`Increase the escalation level for ${alertTitle}? This does not notify anyone automatically.`)) {
                            escalateMutation.mutate({ id: alert.id, title: alertTitle });
                          }
                        }}
                        disabled={isEscalating}
                        type="button"
                      >
                        {isEscalating ? 'Escalating…' : 'Increase escalation level'}
                      </button>
                    ) : null}
                  </div>

                  {canOverrideAlerts && !alert.resolved && isBlockingAlertType(alert.type) ? (
                    <div className="app-warning-state" style={styles.overrideBox}>
                      <strong>Emergency blocking-alert override</strong>
                      <span>Use only when the underlying operational issue has been independently checked and normal closure is not possible.</span>
                      <label style={styles.fieldLabel}>
                        <span>Mandatory override reason</span>
                        <textarea
                          style={styles.textareaNeutral}
                          value={overrideReason}
                          onChange={(event) => setOverrideReasonByAlertId((current) => ({ ...current, [alert.id]: event.target.value }))}
                          maxLength={1000}
                          rows={2}
                          disabled={isOverriding}
                        />
                      </label>
                      <button
                        style={styles.dangerButton}
                        onClick={() => {
                          const reason = overrideReason.trim();
                          if (reason.length < 3) {
                            setActionMessage(null);
                            setActionError('Override reason must contain at least 3 characters.');
                            return;
                          }
                          if (window.confirm(`Override and close the blocking alert ${alertTitle}? This is an emergency administrative action.`)) {
                            overrideMutation.mutate({ id: alert.id, reason });
                          }
                        }}
                        disabled={isOverriding || overrideReason.trim().length < 3}
                        type="button"
                      >
                        {isOverriding ? 'Overriding…' : 'Override and close blocking alert'}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, width: '100%', minWidth: 0 },
  headerTextBlock: { minWidth: 0, flex: '1 1 520px' },
  refreshCard: { display: 'grid', gap: 8, minWidth: 220, padding: 14, border: '1px solid #e2e8f0', borderRadius: 14, background: '#f8fafc' },
  refreshLabel: { color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  refreshMeta: { color: '#64748b', fontSize: '0.86rem' },
  workflowPanel: { minWidth: 0 },
  workflowHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', minWidth: 0 },
  workflowTitle: { margin: 0, fontSize: '1.05rem', color: '#0f172a', wordBreak: 'break-word' },
  workflowText: { margin: '6px 0 0', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' },
  statsGrid: { width: '100%', minWidth: 0 },
  statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, minWidth: 0 },
  statTitle: { fontSize: '0.85rem', color: '#64748b', marginBottom: 8 },
  statValue: { fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' },
  statValueWarn: { fontSize: '1.6rem', fontWeight: 800, color: '#b45309', wordBreak: 'break-word' },
  statValueDanger: { fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', wordBreak: 'break-word' },
  statSubtitle: { marginTop: 6, color: '#64748b', lineHeight: 1.4, fontSize: '0.92rem' },
  messageBox: { margin: 0 },
  panel: { minWidth: 0 },
  panelTitle: { margin: 0, fontSize: '1.1rem', color: '#0f172a' },
  formHint: { margin: '6px 0 0', color: '#64748b', lineHeight: 1.45 },
  formStack: { display: 'grid', gap: 14, marginTop: 14 },
  filterGrid: { width: '100%', minWidth: 0 },
  createGrid: { width: '100%', minWidth: 0 },
  fieldLabel: { display: 'grid', gap: 6, minWidth: 0, color: '#334155', fontWeight: 700, fontSize: '0.9rem' },
  fieldHelp: { color: '#64748b', fontWeight: 400, lineHeight: 1.4 },
  criticalHelp: { color: '#991b1b', fontWeight: 700, lineHeight: 1.4 },
  input: { width: '100%', minHeight: 46, padding: '0.75rem 0.85rem', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box', fontFamily: 'inherit' },
  textareaNeutral: { width: '100%', padding: '0.8rem 0.9rem', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.45 },
  loadingState: { display: 'grid', gap: 6, color: '#475569' },
  loadErrorState: { display: 'grid', gap: 10 },
  queueHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 },
  refreshingText: { color: '#64748b', fontWeight: 700 },
  emptyState: { display: 'grid', gap: 6 },
  cardList: { display: 'grid', gap: 14, minWidth: 0 },
  card: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, background: '#fff', display: 'grid', gap: 14, minWidth: 0 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', minWidth: 0 },
  cardHeaderText: { minWidth: 0, flex: '1 1 260px' },
  cardTitle: { fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', wordBreak: 'break-word' },
  cardMeta: { color: '#64748b', fontSize: '0.9rem', marginTop: 4, lineHeight: 1.45, wordBreak: 'break-word' },
  cardText: { color: '#334155', lineHeight: 1.5, wordBreak: 'break-word' },
  keyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, color: '#334155', minWidth: 0 },
  keyCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', minWidth: 0 },
  keyLabel: { display: 'block', marginBottom: 6, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  keyValue: { wordBreak: 'break-word', fontWeight: 700 },
  keyHelp: { display: 'block', marginTop: 5, color: '#64748b', lineHeight: 1.35 },
  resolutionNoteBox: { display: 'grid', gap: 5, padding: 12, border: '1px solid #bbf7d0', borderRadius: 12, background: '#f0fdf4', color: '#166534' },
  actionRow: { minWidth: 0 },
  linkButton: { border: '1px solid #bfdbfe', borderRadius: 12, background: '#eff6ff', color: '#1d4ed8', padding: '0.8rem 1rem', fontWeight: 700, textDecoration: 'none', textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 7 },
  primaryButton: { border: 'none', borderRadius: 12, background: '#2563eb', color: '#fff', padding: '0.8rem 1rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff', color: '#0f172a', padding: '0.8rem 1rem', fontWeight: 600, cursor: 'pointer' },
  warnButton: { border: '1px solid #fde68a', borderRadius: 12, background: '#fffbeb', color: '#92400e', padding: '0.8rem 1rem', fontWeight: 700, cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 12, background: '#fee2e2', color: '#991b1b', padding: '0.8rem 1rem', fontWeight: 800, cursor: 'pointer', justifySelf: 'start' },
  overrideBox: { display: 'grid', gap: 10, minWidth: 0 },
  badgeRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  badge: { display: 'inline-block', padding: '6px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' },
  openBadge: { display: 'inline-block', padding: '6px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px', background: '#e5e7eb', color: '#374151', whiteSpace: 'nowrap' },
  acknowledgedBadge: { display: 'inline-block', padding: '6px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px', background: '#dbeafe', color: '#1d4ed8', whiteSpace: 'nowrap' },
  resolvedBadge: { display: 'inline-block', padding: '6px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px', background: '#dcfce7', color: '#166534', whiteSpace: 'nowrap' },
  blockingBadge: { display: 'inline-block', padding: '6px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px', background: '#fee2e2', color: '#991b1b', whiteSpace: 'nowrap' }
};
