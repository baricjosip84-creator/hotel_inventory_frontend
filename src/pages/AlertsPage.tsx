import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
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
  return apiRequest<ProductOption[]>('/products');
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

function formatDateTime(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return '—';
  return formatLocalizedDateTime(value, locale);
}

const CANONICAL_ALERT_TYPE_LABELS: Readonly<Record<string, string>> = {
  LOW_STOCK: 'Low stock',
  NEGATIVE_STOCK: 'Negative stock',
  NEGATIVE_STOCK_BLOCKING: 'Negative stock',
  EXPIRED_STOCK: 'Expired stock',
  EXPIRING_STOCK: 'Expiring stock',
  FINALIZED_SHIPMENT_INCOMPLETE: 'Finalized shipment incomplete',
  FINALIZED_SHIPMENT_INCOMPLETE_BLOCKING: 'Finalized shipment incomplete',
  INVENTORY_USAGE_ANOMALY: 'Inventory usage anomaly',
  INVENTORY_USAGE_DAMAGE_WASTE: 'Inventory usage damage waste',
  INVENTORY_USAGE_EXCEPTIONS: 'Inventory usage exceptions',
  ORPHANED_SHIPMENT_ITEM_BLOCKING: 'Orphaned shipment item',
  OVER_RECEIVED_BLOCKING: 'Over received',
  PO_OVER_RECEIVED_BLOCKING: 'Purchase order over received',
  SHIPMENT_IMMUTABLE_BLOCKING: 'Shipment immutable',
  STOCK_LEDGER_DESYNC_BLOCKING: 'Stock ledger desync',
  STOCK_LOT_DESYNC_BLOCKING: 'Stock lot desync',
  SYSTEM_HEALTH_DEGRADED_BLOCKING: 'System health degraded'
};

function formatAlertType(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (!value) return ui('Alert');

  const normalized = value.trim();
  if (!normalized) return ui('Alert');

  const canonicalLabel = CANONICAL_ALERT_TYPE_LABELS[normalized.toUpperCase()];
  if (canonicalLabel) return ui(canonicalLabel);

  // Unknown/manual alert types are tenant business data. Preserve them exactly
  // instead of humanizing or translating user-defined labels.
  return normalized;
}

function severityLabel(severity: AlertSeverity, ui: (englishText: string) => string): string {
  if (severity === 'critical') return ui('Critical');
  if (severity === 'warning') return ui('Warning');
  return ui('Info');
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

  // Route known alert families to their authoritative workflow before using
  // the generic product/stock fallback. Many system alerts are product-linked,
  // but that product link does not make Stock the source workflow.
  if (type.includes('SHIPMENT') && hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ)) {
    return { to: '/shipments', label: 'Open Shipments' };
  }

  if (type.includes('OVER_RECEIVED') && !type.startsWith('PO_') && hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ)) {
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

  if ((type.startsWith('PO_') || type.includes('PURCHASE_ORDER') || type.includes('PROCUREMENT')) && hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_READ)) {
    return { to: '/purchase-orders', label: 'Open Purchase Orders' };
  }

  if (type.includes('SUPPLIER') && hasPermission(TENANT_PERMISSIONS.SUPPLIERS_READ)) {
    return { to: '/suppliers', label: 'Open Suppliers' };
  }

  if (type.includes('EXECUTION') && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)) {
    return { to: '/execution-tasks', label: 'Open Execution Tasks' };
  }

  if (type === 'SYSTEM_HEALTH_DEGRADED_BLOCKING' && hasPermission(TENANT_PERMISSIONS.SYSTEM_STATUS_READ)) {
    return { to: '/admin-system', label: 'Open Admin System' };
  }

  if (alert.product_id && hasPermission(TENANT_PERMISSIONS.STOCK_READ)) {
    return { to: '/stock', label: 'Open Stock' };
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
  const { locale, ui } = useAppTranslation();
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
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    const nextFilters = filtersFromSearchParams(new URLSearchParams(searchParamsKey));
    setFilters(nextFilters);
    setFilterForm(nextFilters);
  }, [searchParamsKey]);

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
      setActionMessage(ui('Manual alert created successfully.'));
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, ui('Failed to create the manual alert.')));
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (input: AlertActionInput) => acknowledgeAlert(input.id),
    onSuccess: async (_result, input) => {
      setActionError(null);
      setActionMessage(`${input.title} ${ui('acknowledged successfully.')}`);
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, ui('Failed to acknowledge the alert.')));
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (input: ResolveAlertInput) => resolveAlert({ id: input.id, resolutionNote: input.resolutionNote }),
    onSuccess: async (_result, input) => {
      setResolutionNoteByAlertId((current) => ({ ...current, [input.id]: '' }));
      setActionError(null);
      setActionMessage(`${input.title} ${ui('resolved successfully.')}`);
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, ui('Failed to resolve the alert.')));
    }
  });

  const reopenMutation = useMutation({
    mutationFn: (input: AlertActionInput) => reopenAlert(input.id),
    onSuccess: async (_result, input) => {
      setActionError(null);
      setActionMessage(`${input.title} ${ui('reopened successfully.')}`);
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, ui('Failed to reopen the alert.')));
    }
  });

  const escalateMutation = useMutation({
    mutationFn: (input: AlertActionInput) => escalateAlert(input.id),
    onSuccess: async (_result, input) => {
      setActionError(null);
      setActionMessage(`${input.title} ${ui('escalation level increased successfully.')}`);
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, ui('Failed to escalate the alert.')));
    }
  });

  const overrideMutation = useMutation({
    mutationFn: overrideBlockingAlert,
    onSuccess: async (_result, input) => {
      setOverrideReasonByAlertId((current) => ({ ...current, [input.id]: '' }));
      setActionError(null);
      setActionMessage(ui('Blocking alert overridden and closed successfully.'));
      await invalidateAlertSurfaces();
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(mutationErrorMessage(error, ui('Failed to override the blocking alert.')));
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
      setActionError(ui('Alert type is required.'));
      return;
    }

    if (!message) {
      setActionMessage(null);
      setActionError(ui('Alert message is required.'));
      return;
    }

    if (
      manualAlertForm.severity === 'critical'
      && !window.confirm(ui('Create a Critical alert? Unresolved Critical alerts can block protected stock or shipment operations according to alert scope until they are resolved.'))
    ) {
      return;
    }

    createAlertMutation.mutate({ ...manualAlertForm, type, message });
  };

  if (alertsQuery.isLoading) {
    return (
      <div className="app-panel app-panel--padded" style={styles.loadingState}>
        <strong>{ui('Loading alerts…')}</strong>
        <span>{ui('Retrieving the current tenant alert queue.')}</span>
      </div>
    );
  }

  if (alertsQuery.isError) {
    return (
      <div className="app-error-state" style={styles.loadErrorState}>
        <strong>{ui('Alerts could not be loaded.')}</strong>
        <span>{mutationErrorMessage(alertsQuery.error, ui('The alert request failed.'))}</span>
        <button type="button" style={styles.secondaryButton} onClick={() => alertsQuery.refetch()}>
          {ui('Retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="io-operational-page alerts-page io-workspace-page" style={styles.page} data-alerts-refined="true">
      <OperationalWorkspaceHero
        iconPath="/alerts"
        eyebrow={ui('Operational alert control')}
        title={ui('Alert workspace')}
        description={
          <p>
            {ui("Open the linked source page first, confirm the real condition, acknowledge the alert when somebody takes ownership, then resolve it with a meaningful note. Using Increase escalation level raises the alert's escalation level and queues an in-app notification event; it does not send an email or webhook notification.")}
          </p>
        }
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Open → acknowledge → resolve')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Source workflow stays authoritative')}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <>
            <OperationalWorkspaceStatus value={summary.unresolved} label={summary.unresolved === 1 ? ui('open alert in the current view') : ui('open alerts in the current view')} />
            <button type="button" className="app-button app-button--secondary" onClick={() => alertsQuery.refetch()} disabled={alertsQuery.isFetching}>
              {alertsQuery.isFetching ? ui('Refreshing…') : ui('Refresh alerts')}
            </button>
          </>
        }
      />

      <div className="app-grid-stats io-workspace-stats" style={styles.statsGrid}>
        <OperationalWorkspaceStatCard label={ui('Visible results')} value={summary.total} helper={<>{ui('Up to')} {filters.limit} {ui('alerts matching the applied filters')}</>} tone="blue" iconPath="/alerts" />
        <OperationalWorkspaceStatCard label={ui('Open')} value={summary.unresolved} helper={ui('Still requiring review or action')} tone="amber" iconPath="/action-center" />
        <OperationalWorkspaceStatCard label={ui('Critical open')} value={summary.critical} helper={ui('Can block protected stock or shipment operations according to alert scope until resolved')} tone="red" iconPath="/reliability-command" />
        <OperationalWorkspaceStatCard label={ui('Unacknowledged open')} value={summary.unacknowledged} helper={ui('No operator has taken ownership yet')} tone="slate" iconPath="/collaboration" />
      </div>

      {!canManageAlerts ? (
        <div className="app-warning-state" style={styles.messageBox}>
          {ui('Current access role:')} {ui(accessRoleLabel)}. {ui('You can review alerts and open permitted source pages. Creating, acknowledging, resolving, reopening, and escalating alerts requires Alerts write permission. Emergency blocking-alert override is controlled separately by Alerts override permission.')}
        </div>
      ) : null}

      {actionError ? <div className="app-error-state" style={styles.messageBox} role="alert">{actionError}</div> : null}
      {actionMessage ? <div className="app-success-state" style={styles.messageBox} role="status">{actionMessage}</div> : null}

      {canManageAlerts ? (
        <section className="app-panel app-panel--padded alerts-section alerts-section--manual" style={styles.panel}>
          <div className="alerts-section-heading"><span className="alerts-heading-icon"><TenantNavIcon path="/alerts" size={18} /></span><h2 style={styles.panelTitle}>{ui('Create a manual alert')}</h2></div>
          <p style={styles.formHint}>
            {ui('Use this only for a real operational issue that is not already represented by an existing alert. New manual alerts start at escalation level 0.')}
          </p>

          <form onSubmit={submitManualAlert} style={styles.formStack}>
            <div className="app-grid-toolbar" style={styles.createGrid}>
              <label style={styles.fieldLabel}>
                <span>{ui('Alert type')}</span>
                <input
                  style={styles.input}
                  value={manualAlertForm.type}
                  onChange={(event) => updateManualAlertField('type', event.target.value)}
                  placeholder={ui('Example: Supplier delivery delay')}
                  maxLength={100}
                  disabled={createAlertMutation.isPending}
                  required
                />
              </label>

              <label style={styles.fieldLabel}>
                <span>{ui('Severity')}</span>
                <select
                  style={styles.input}
                  value={manualAlertForm.severity}
                  onChange={(event) => updateManualAlertField('severity', event.target.value as AlertSeverity)}
                  disabled={createAlertMutation.isPending}
                >
                  <option value="info">{ui('Info')}</option>
                  <option value="warning">{ui('Warning')}</option>
                  <option value="critical">{ui('Critical')}</option>
                </select>
                {manualAlertForm.severity === 'critical' ? (
                  <small style={styles.criticalHelp}>{ui('Critical alerts can block protected stock or shipment operations according to alert scope until resolved.')}</small>
                ) : null}
              </label>

              {canReadProducts ? (
                <label style={styles.fieldLabel}>
                  <span>{ui('Related product (optional)')}</span>
                  <select
                    style={styles.input}
                    value={manualAlertForm.product_id}
                    onChange={(event) => updateManualAlertField('product_id', event.target.value)}
                    disabled={createAlertMutation.isPending || productsQuery.isLoading}
                  >
                    <option value="">{ui('No product link')}</option>
                    {(productsQuery.data ?? []).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}{product.category ? ` — ${product.category}` : ''}
                      </option>
                    ))}
                  </select>
                  {productsQuery.isError ? <small style={styles.fieldHelp}>{ui('Products could not be loaded. The alert can still be created without a product link.')}</small> : null}
                </label>
              ) : null}
            </div>

            <label style={styles.fieldLabel}>
              <span>{ui('Alert message')}</span>
              <textarea
                style={styles.textareaNeutral}
                value={manualAlertForm.message}
                onChange={(event) => updateManualAlertField('message', event.target.value)}
                placeholder={ui('Describe the issue, its impact, and what needs attention.')}
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
                {createAlertMutation.isPending ? ui('Creating…') : ui('Create alert')}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="app-panel app-panel--padded alerts-section" style={styles.panel}>
        <div className="alerts-section-heading"><span className="alerts-heading-icon alerts-heading-icon--slate"><TenantNavIcon path="/reports" size={18} /></span><h2 style={styles.panelTitle}>{ui('Filter the alert queue')}</h2></div>
        <form onSubmit={applyFilters} style={styles.formStack}>
          <div className="app-grid-toolbar" style={styles.filterGrid}>
            <label style={styles.fieldLabel}>
              <span>{ui('Search')}</span>
              <input
                style={styles.input}
                value={filterForm.search}
                onChange={(event) => setFilterForm((current) => ({ ...current, search: event.target.value }))}
                placeholder={ui('Message, type, or product')}
                maxLength={200}
              />
            </label>

            <label style={styles.fieldLabel}>
              <span>{ui('Severity')}</span>
              <select style={styles.input} value={filterForm.severity} onChange={(event) => setFilterForm((current) => ({ ...current, severity: event.target.value }))}>
                <option value="">{ui('All severities')}</option>
                <option value="info">{ui('Info')}</option>
                <option value="warning">{ui('Warning')}</option>
                <option value="critical">{ui('Critical')}</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>{ui('Resolution state')}</span>
              <select style={styles.input} value={filterForm.resolved} onChange={(event) => setFilterForm((current) => ({ ...current, resolved: event.target.value }))}>
                <option value="">{ui('Open and resolved')}</option>
                <option value="false">{ui('Open only')}</option>
                <option value="true">{ui('Resolved only')}</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>{ui('Ownership state')}</span>
              <select style={styles.input} value={filterForm.acknowledged} onChange={(event) => setFilterForm((current) => ({ ...current, acknowledged: event.target.value }))}>
                <option value="">{ui('Acknowledged and unacknowledged')}</option>
                <option value="false">{ui('Unacknowledged only')}</option>
                <option value="true">{ui('Acknowledged only')}</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>{ui('Maximum results')}</span>
              <select style={styles.input} value={filterForm.limit} onChange={(event) => setFilterForm((current) => ({ ...current, limit: event.target.value }))}>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
              </select>
            </label>
          </div>
          <div className="app-actions">
            <button type="submit" style={styles.primaryButton}>{ui('Apply filters')}</button>
            <button type="button" style={styles.secondaryButton} onClick={clearFilters}>{ui('Clear filters')}</button>
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded alerts-section alerts-queue-section" style={styles.panel}>
        <div style={styles.queueHeader}>
          <div>
            <div className="alerts-section-heading"><span className="alerts-heading-icon"><TenantNavIcon path="/alerts" size={18} /></span><h2 style={styles.panelTitle}>{ui('Alert queue')}</h2></div>
            <p style={styles.formHint}>{ui('Open alerts appear before resolved alerts, with Critical items first.')}</p>
          </div>
          {alertsQuery.isFetching ? <span style={styles.refreshingText}>{ui('Refreshing…')}</span> : null}
        </div>

        {alerts.length === 0 ? (
          <div className="app-empty-state" style={styles.emptyState}>
            <strong>{ui('No alerts match the applied filters.')}</strong>
            <span>{ui('Clear the filters or confirm that the tenant currently has no matching alert records.')}</span>
          </div>
        ) : (
          <div style={styles.cardList}>
            {alerts.map((alert) => {
              const next = nextActionLink(alert);
              const alertTitle = formatAlertType(alert.type, ui);
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
                        {alert.product_name || (alert.product_id ? ui('Linked product unavailable') : ui('No product linked'))} · {ui('Created')} {formatDateTime(alert.created_at, locale)}
                      </div>
                    </div>
                    <div style={styles.badgeRow} className="alerts-badge-row">
                      <span style={severityStyle(alert.severity)}>{severityLabel(alert.severity, ui)}</span>
                      <span style={alert.resolved ? styles.resolvedBadge : alert.acknowledged ? styles.acknowledgedBadge : styles.openBadge}>
                        {alert.resolved ? ui('Resolved') : alert.acknowledged ? ui('Acknowledged') : ui('Open')}
                      </span>
                      {blocksProtectedOperations(alert) ? (
                        <span style={styles.blockingBadge}>
                          {isBlockingAlertType(alert.type) ? ui('System blocker') : ui('Operational blocker')}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={styles.cardText}>{alert.message}</div>

                  <div style={styles.keyGrid}>
                    <div style={styles.keyCard} className="alerts-key-card">
                      <strong style={styles.keyLabel}>{ui('Ownership')}</strong>
                      <div style={styles.keyValue}>{alert.acknowledged ? alert.acknowledged_by_name || ui('Acknowledged') : ui('Not acknowledged')}</div>
                      <small style={styles.keyHelp}>{alert.acknowledged ? formatDateTime(alert.acknowledged_at, locale) : ui('No operator has taken ownership.')}</small>
                    </div>
                    <div style={styles.keyCard} className="alerts-key-card">
                      <strong style={styles.keyLabel}>{ui('Escalation level')}</strong>
                      <div style={styles.keyValue}>{alert.escalation_level}</div>
                      <small style={styles.keyHelp}>{alert.last_escalated_at ? `${ui('Last escalated')} ${formatDateTime(alert.last_escalated_at, locale)}` : ui('Not escalated.')}</small>
                    </div>
                    <div style={styles.keyCard} className="alerts-key-card">
                      <strong style={styles.keyLabel}>{ui('Resolution')}</strong>
                      <div style={styles.keyValue}>{alert.resolved ? alert.resolved_by_name || ui('Resolved') : ui('Open')}</div>
                      <small style={styles.keyHelp}>{alert.resolved ? formatDateTime(alert.resolved_at, locale) : ui('No resolution recorded.')}</small>
                    </div>
                  </div>

                  {alert.resolved && alert.resolution_note ? (
                    <div style={styles.resolutionNoteBox}>
                      <strong>{ui('Resolution note')}</strong>
                      <span>{alert.resolution_note}</span>
                    </div>
                  ) : null}

                  {!alert.resolved && canManageAlerts ? (
                    <label style={styles.fieldLabel}>
                      <span>{ui('Resolution note')}</span>
                      <textarea
                        style={styles.textareaNeutral}
                        value={resolutionNote}
                        onChange={(event) => setResolutionNoteByAlertId((current) => ({ ...current, [alert.id]: event.target.value }))}
                        placeholder={ui('Explain what was checked and why the alert can be closed.')}
                        maxLength={2000}
                        rows={2}
                        disabled={isResolving}
                      />
                      <small style={styles.fieldHelp}>{ui('At least 3 characters are required on this page before Resolve is enabled.')}</small>
                    </label>
                  ) : null}

                  <div className="app-actions" style={styles.actionRow}>
                    {next ? <Link to={next.to} style={styles.linkButton}><TenantNavIcon path={next.to} size={16} /><span>{ui(next.label)}</span></Link> : null}

                    {canManageAlerts && !alert.acknowledged && !alert.resolved ? (
                      <button
                        style={styles.secondaryButton}
                        onClick={() => acknowledgeMutation.mutate({ id: alert.id, title: alertTitle })}
                        disabled={isAcknowledging}
                        type="button"
                      >
                        {isAcknowledging ? ui('Acknowledging…') : ui('Acknowledge')}
                      </button>
                    ) : null}

                    {canManageAlerts && !alert.resolved ? (
                      <button
                        style={styles.primaryButton}
                        onClick={() => resolveMutation.mutate({ id: alert.id, title: alertTitle, resolutionNote })}
                        disabled={isResolving || resolutionNote.trim().length < 3}
                        type="button"
                      >
                        {isResolving ? ui('Resolving…') : ui('Resolve')}
                      </button>
                    ) : null}

                    {canManageAlerts && alert.resolved ? (
                      <button
                        style={styles.secondaryButton}
                        onClick={() => {
                          if (window.confirm(`${ui('Reopen')} ${alertTitle}? ${ui('This clears its previous acknowledgement and resolution details.')}`)) {
                            reopenMutation.mutate({ id: alert.id, title: alertTitle });
                          }
                        }}
                        disabled={isReopening}
                        type="button"
                      >
                        {isReopening ? ui('Reopening…') : ui('Reopen')}
                      </button>
                    ) : null}

                    {canManageAlerts && !alert.resolved ? (
                      <button
                        style={styles.warnButton}
                        onClick={() => {
                          if (window.confirm(`${ui('Increase the escalation level for')} ${alertTitle}? ${ui('This queues an in-app notification event but does not send an email or webhook notification.')}`)) {
                            escalateMutation.mutate({ id: alert.id, title: alertTitle });
                          }
                        }}
                        disabled={isEscalating}
                        type="button"
                      >
                        {isEscalating ? ui('Escalating…') : ui('Increase escalation level')}
                      </button>
                    ) : null}
                  </div>

                  {canOverrideAlerts && !alert.resolved && isBlockingAlertType(alert.type) ? (
                    <div className="app-warning-state" style={styles.overrideBox}>
                      <strong>{ui('Emergency blocking-alert override')}</strong>
                      <span>{ui('Use only when the underlying operational issue has been independently checked and normal closure is not possible.')}</span>
                      <label style={styles.fieldLabel}>
                        <span>{ui('Mandatory override reason')}</span>
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
                            setActionError(ui('Override reason must contain at least 3 characters.'));
                            return;
                          }
                          if (window.confirm(`${ui('Override and close the blocking alert')} ${alertTitle}? ${ui('This is an emergency administrative action.')}`)) {
                            overrideMutation.mutate({ id: alert.id, reason });
                          }
                        }}
                        disabled={isOverriding || overrideReason.trim().length < 3}
                        type="button"
                      >
                        {isOverriding ? ui('Overriding…') : ui('Override and close blocking alert')}
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
