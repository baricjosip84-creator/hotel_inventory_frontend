import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

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

type AlertFilters = {
  search: string;
  severity: string;
  resolved: string;
  acknowledged: string;
};

async function fetchAlerts(filters: AlertFilters): Promise<AlertRow[]> {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.severity.trim()) params.set('severity', filters.severity.trim());
  if (filters.resolved.trim()) params.set('resolved', filters.resolved.trim());
  if (filters.acknowledged.trim()) params.set('acknowledged', filters.acknowledged.trim());

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<AlertRow[]>(`/alerts${suffix}`);
}

async function acknowledgeAlert(id: string): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function resolveAlert(id: string): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution_note: 'Resolved from Alerts page' })
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
    body: JSON.stringify({ reason: input.reason })
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function severityStyle(severity: string): CSSProperties {
  if (severity === 'critical') {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }

  if (severity === 'warning') {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }

  return { ...styles.badge, background: '#dbeafe', color: '#1d4ed8' };
}

function nextActionLink(alert: AlertRow): { to: string; label: string } {
  if (alert.product_id) {
    return {
      to: `/stock?productId=${encodeURIComponent(alert.product_id)}`,
      label: 'Open in Stock'
    };
  }

  if (alert.type.toLowerCase().includes('shipment')) {
    return { to: '/shipments', label: 'Open Shipments' };
  }

  return {
    to: `/dashboard?alertId=${encodeURIComponent(alert.id)}`,
    label: 'Open Dashboard'
  };
}

export default function AlertsPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in your current AlertsPage from the new ZIP.

    Existing real behavior is preserved:
    - same alert list endpoint
    - same filter model
    - same acknowledge / resolve / reopen / escalate actions
    - same role-based restrictions
    - same route-to-next-action behavior

    This pass applies the new shared UI layer from App.css:
    - uses shared panel, grid, action, and state helpers
    - keeps the page visually aligned with the rest of the app
    - does not change business logic

    WHAT PROBLEM IT SOLVES
    ----------------------
    Turns Alerts into one of the first pages to actually consume the new shared
    design foundation instead of relying only on page-local styles.
  */
  const queryClient = useQueryClient();
  const { role, canManageAlerts, canOverrideAlerts } = getRoleCapabilities();

  const [filters, setFilters] = useState<AlertFilters>({
    search: '',
    severity: '',
    resolved: 'false',
    acknowledged: ''
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [overrideReasonByAlertId, setOverrideReasonByAlertId] = useState<Record<string, string>>({});

  const alertsQuery = useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => fetchAlerts(filters)
  });

  const makeMutation = (mutationFn: (id: string) => Promise<AlertRow>) =>
    useMutation({
      mutationFn,
      onSuccess: async () => {
        setActionError(null);
        setActionMessage('Alert action completed successfully.');
        await queryClient.invalidateQueries({ queryKey: ['alerts'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-unresolved-alerts'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      },
      onError: (error) => {
        setActionMessage(null);
        setActionError(error instanceof ApiError ? error.message : 'Failed to update alert.');
      }
    });

  const acknowledgeMutation = makeMutation(acknowledgeAlert);
  const resolveMutation = makeMutation(resolveAlert);
  const reopenMutation = makeMutation(reopenAlert);
  const escalateMutation = makeMutation(escalateAlert);

  const overrideMutation = useMutation({
    mutationFn: overrideBlockingAlert,
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Blocking alert overridden successfully.');
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-unresolved-alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      setActionMessage(null);
      setActionError(error instanceof ApiError ? error.message : 'Failed to override blocking alert.');
    }
  });

  const alerts = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);
  const summary = useMemo(
    () => ({
      total: alerts.length,
      unresolved: alerts.filter((a) => !a.resolved).length,
      critical: alerts.filter((a) => !a.resolved && a.severity === 'critical').length,
      unacknowledged: alerts.filter((a) => !a.acknowledged).length
    }),
    [alerts]
  );

  if (alertsQuery.isLoading) {
    return <p>Loading alerts...</p>;
  }

  if (alertsQuery.isError) {
    return <p>Failed to load alerts: {(alertsQuery.error as Error).message}</p>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerTextBlock}>
          <h1 style={styles.title}>Alerts</h1>
          <p style={styles.description}>
            Review tenant-scoped operational alerts, acknowledge ownership, resolve when
            complete, and route directly into the next operational page.
          </p>
        </div>
      </header>

      <section className="app-panel app-panel--padded" style={styles.workflowPanel}>
        <h2 style={styles.workflowTitle}>Workflow clarity</h2>
        <p style={styles.workflowText}>
          Treat alerts as an action queue: review severity, open the linked operational page,
          then acknowledge, resolve, reopen, or escalate based on the real situation.
        </p>
      </section>

      <div className="app-grid-stats" style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Visible Alerts</div>
          <div style={styles.statValue}>{summary.total}</div>
          <div style={styles.statSubtitle}>Current filter result set</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statTitle}>Unresolved</div>
          <div style={styles.statValueWarn}>{summary.unresolved}</div>
          <div style={styles.statSubtitle}>Still requiring action</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statTitle}>Critical</div>
          <div style={styles.statValueDanger}>{summary.critical}</div>
          <div style={styles.statSubtitle}>Highest operational urgency</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statTitle}>Unacknowledged</div>
          <div style={styles.statValue}>{summary.unacknowledged}</div>
          <div style={styles.statSubtitle}>Not yet owned by an operator</div>
        </div>
      </div>

      {!canManageAlerts ? (
        <div className="app-warning-state" style={styles.messageBox}>
          Current role: {role.toUpperCase()}. Alerts can still be reviewed, but
          acknowledge / resolve / reopen / escalate actions are restricted to manager and
          admin roles.
        </div>
      ) : null}

      {canOverrideAlerts ? (
        <div className="app-warning-state" style={styles.messageBox}>
          Blocking alert override is available for admin-only emergency closure. Backend requires a reason and only accepts blocking alerts.
        </div>
      ) : null}

      {actionError ? (
        <div className="app-error-state" style={styles.messageBox}>
          {actionError}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="app-success-state" style={styles.messageBox}>
          {actionMessage}
        </div>
      ) : null}

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <h2 style={styles.panelTitle}>Filters</h2>

        <div className="app-grid-toolbar" style={styles.filterGrid}>
          <input
            style={styles.input}
            value={filters.search}
            onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
            placeholder="Search message, type, or product"
          />

          <select
            style={styles.input}
            value={filters.severity}
            onChange={(e) => setFilters((c) => ({ ...c, severity: e.target.value }))}
          >
            <option value="">All severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          <select
            style={styles.input}
            value={filters.resolved}
            onChange={(e) => setFilters((c) => ({ ...c, resolved: e.target.value }))}
          >
            <option value="">All states</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </select>

          <select
            style={styles.input}
            value={filters.acknowledged}
            onChange={(e) => setFilters((c) => ({ ...c, acknowledged: e.target.value }))}
          >
            <option value="">Acknowledged + unacknowledged</option>
            <option value="false">Unacknowledged</option>
            <option value="true">Acknowledged</option>
          </select>
        </div>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <h2 style={styles.panelTitle}>Alert Queue</h2>

        {alerts.length === 0 ? (
          <div className="app-empty-state" style={styles.emptyState}>
            <strong>No alerts found.</strong>
            <span>Adjust filters or continue operating if the current tenant is clean.</span>
          </div>
        ) : (
          <div style={styles.cardList}>
            {alerts.map((alert) => {
              const next = nextActionLink(alert);

              return (
                <article style={styles.card} key={alert.id}>
                  <div style={styles.cardTop}>
                    <div style={styles.cardHeaderText}>
                      <div style={styles.cardTitle}>{alert.type}</div>
                      <div style={styles.cardMeta}>
                        {alert.product_name || 'No product linked'} ·{' '}
                        {formatDateTime(alert.created_at)}
                      </div>
                    </div>

                    <div style={styles.badgeRow}>
                      <span style={severityStyle(alert.severity)}>{alert.severity}</span>
                      <span style={styles.badge}>{alert.resolved ? 'Resolved' : 'Open'}</span>
                    </div>
                  </div>

                  <div style={styles.cardText}>{alert.message}</div>

                  <div style={styles.keyGrid}>
                    <div style={styles.keyCard}>
                      <strong style={styles.keyLabel}>Acknowledged</strong>
                      <div style={styles.keyValue}>{alert.acknowledged ? 'Yes' : 'No'}</div>
                    </div>

                    <div style={styles.keyCard}>
                      <strong style={styles.keyLabel}>Escalation</strong>
                      <div style={styles.keyValue}>{alert.escalation_level}</div>
                    </div>

                    <div style={styles.keyCard}>
                      <strong style={styles.keyLabel}>Resolved By</strong>
                      <div style={styles.keyValue}>{alert.resolved_by_name || '-'}</div>
                    </div>
                  </div>

                  <div className="app-actions" style={styles.actionRow}>
                    <Link to={next.to} style={styles.linkButton}>
                      {next.label}
                    </Link>

                    {canManageAlerts && !alert.acknowledged ? (
                      <button
                        style={styles.secondaryButton}
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        disabled={acknowledgeMutation.isPending}
                        type="button"
                      >
                        Acknowledge
                      </button>
                    ) : null}

                    {canManageAlerts && !alert.resolved ? (
                      <button
                        style={styles.primaryButton}
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        type="button"
                      >
                        Resolve
                      </button>
                    ) : null}

                    {canManageAlerts && alert.resolved ? (
                      <button
                        style={styles.secondaryButton}
                        onClick={() => reopenMutation.mutate(alert.id)}
                        disabled={reopenMutation.isPending}
                        type="button"
                      >
                        Reopen
                      </button>
                    ) : null}

                    {canManageAlerts && !alert.resolved ? (
                      <button
                        style={styles.warnButton}
                        onClick={() => escalateMutation.mutate(alert.id)}
                        disabled={escalateMutation.isPending}
                        type="button"
                      >
                        Escalate
                      </button>
                    ) : null}

                    {canOverrideAlerts && !alert.resolved && alert.type.toUpperCase().includes('BLOCKING') ? (
                      <div style={styles.overrideBox}>
                        <textarea
                          style={styles.textarea}
                          value={overrideReasonByAlertId[alert.id] ?? ''}
                          onChange={(event) =>
                            setOverrideReasonByAlertId((current) => ({
                              ...current,
                              [alert.id]: event.target.value
                            }))
                          }
                          placeholder="Mandatory override reason"
                          rows={2}
                        />
                        <button
                          style={styles.dangerButton}
                          onClick={() => {
                            const reason = (overrideReasonByAlertId[alert.id] ?? '').trim();

                            if (!reason) {
                              setActionMessage(null);
                              setActionError('Override reason is mandatory.');
                              return;
                            }

                            overrideMutation.mutate({ id: alert.id, reason });
                          }}
                          disabled={overrideMutation.isPending}
                          type="button"
                        >
                          Override blocking alert
                        </button>
                      </div>
                    ) : null}
                  </div>
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
  page: {
    display: 'grid',
    gap: 16,
    width: '100%',
    minWidth: 0
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    minWidth: 0
  },
  headerTextBlock: {
    minWidth: 0
  },
  title: {
    margin: 0,
    fontSize: '1.9rem',
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  description: {
    margin: '6px 0 0',
    color: '#475569',
    maxWidth: 760,
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  workflowPanel: {
    minWidth: 0
  },
  workflowTitle: {
    margin: 0,
    fontSize: '1.05rem',
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  workflowText: {
    margin: '6px 0 0',
    color: '#475569',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  statsGrid: {
    width: '100%',
    minWidth: 0
  },
  statCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
    minWidth: 0
  },
  statTitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: 8
  },
  statValue: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  statValueWarn: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#b45309',
    wordBreak: 'break-word'
  },
  statValueDanger: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#b91c1c',
    wordBreak: 'break-word'
  },
  statSubtitle: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 1.4,
    fontSize: '0.92rem'
  },
  messageBox: {
    margin: 0
  },
  panel: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#0f172a'
  },
  filterGrid: {
    width: '100%',
    minWidth: 0
  },
  input: {
    width: '100%',
    padding: '0.8rem 0.9rem',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box'
  },
  emptyState: {
    display: 'grid',
    gap: 6
  },
  cardList: {
    display: 'grid',
    gap: 12,
    minWidth: 0
  },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 14,
    background: '#fff',
    display: 'grid',
    gap: 12,
    minWidth: 0
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    minWidth: 0
  },
  cardHeaderText: {
    minWidth: 0,
    flex: '1 1 260px'
  },
  cardTitle: {
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  cardMeta: {
    color: '#64748b',
    fontSize: '0.9rem',
    marginTop: 4,
    lineHeight: 1.45,
    wordBreak: 'break-word'
  },
  cardText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  keyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    color: '#334155',
    minWidth: 0
  },
  keyCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 12,
    background: '#f8fafc',
    minWidth: 0
  },
  keyLabel: {
    display: 'block',
    marginBottom: 6,
    color: '#64748b',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  keyValue: {
    wordBreak: 'break-word'
  },
  actionRow: {
    minWidth: 0
  },
  linkButton: {
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    background: '#fff',
    color: '#1d4ed8',
    padding: '0.8rem 1rem',
    fontWeight: 700,
    textDecoration: 'none',
    textAlign: 'center'
  },
  primaryButton: {
    border: 'none',
    borderRadius: 12,
    background: '#2563eb',
    color: '#fff',
    padding: '0.8rem 1rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    background: '#fff',
    color: '#0f172a',
    padding: '0.8rem 1rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  warnButton: {
    border: '1px solid #fde68a',
    borderRadius: 12,
    background: '#fffbeb',
    color: '#92400e',
    padding: '0.8rem 1rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  dangerButton: {
    border: '1px solid #fecaca',
    borderRadius: 12,
    background: '#fee2e2',
    color: '#991b1b',
    padding: '0.8rem 1rem',
    fontWeight: 800,
    cursor: 'pointer'
  },
  overrideBox: {
    display: 'grid',
    gap: 8,
    minWidth: 260,
    flex: '1 1 320px'
  },
  textarea: {
    width: '100%',
    padding: '0.8rem 0.9rem',
    borderRadius: 12,
    border: '1px solid #fecaca',
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  badgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },
  badge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px',
    background: '#e5e7eb',
    color: '#374151',
    whiteSpace: 'nowrap'
  }
};