import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import type { AlertItem } from '../types/inventory';

type AlertFilters = {
  search: string;
  severity: string;
  resolved: string;
  acknowledged: string;
};

async function fetchAlerts(filters: AlertFilters): Promise<AlertItem[]> {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.severity) {
    params.set('severity', filters.severity);
  }

  if (filters.resolved) {
    params.set('resolved', filters.resolved);
  }

  if (filters.acknowledged) {
    params.set('acknowledged', filters.acknowledged);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<AlertItem[]>(`/alerts${suffix}`);
}

async function acknowledgeAlert(id: string): Promise<AlertItem> {
  return apiRequest<AlertItem>(`/alerts/${id}/acknowledge`, {
    method: 'POST'
  });
}

async function resolveAlert(input: { id: string; resolution_note: string }): Promise<AlertItem> {
  return apiRequest<AlertItem>(`/alerts/${input.id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({
      resolution_note: input.resolution_note
    })
  });
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString();
}

function severityBadgeStyle(severity: AlertItem['severity']): CSSProperties {
  if (severity === 'critical') {
    return {
      ...styles.badgeBase,
      background: '#fee2e2',
      color: '#991b1b'
    };
  }

  if (severity === 'warning') {
    return {
      ...styles.badgeBase,
      background: '#fef3c7',
      color: '#92400e'
    };
  }

  return {
    ...styles.badgeBase,
    background: '#dbeafe',
    color: '#1d4ed8'
  };
}

function stateBadgeStyle(label: 'Resolved' | 'Open' | 'Acknowledged' | 'Unacknowledged'): CSSProperties {
  if (label === 'Resolved' || label === 'Acknowledged') {
    return {
      ...styles.badgeBase,
      background: '#dcfce7',
      color: '#166534'
    };
  }

  return {
    ...styles.badgeBase,
    background: '#e5e7eb',
    color: '#374151'
  };
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'danger' | 'warn' | 'good';
}) {
  const toneStyle =
    props.tone === 'danger'
      ? styles.statValueDanger
      : props.tone === 'warn'
        ? styles.statValueWarn
        : props.tone === 'good'
          ? styles.statValueGood
          : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={toneStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function AlertsPage() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<AlertFilters>({
    search: '',
    severity: '',
    resolved: '',
    acknowledged: ''
  });

  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const alertsQuery = useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => fetchAlerts(filters)
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('Alert acknowledged.');
      await queryClient.refetchQueries({ queryKey: ['alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to acknowledge alert.');
      }
      setPageMessage(null);
    }
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('Alert resolved.');
      await queryClient.refetchQueries({ queryKey: ['alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to resolve alert.');
      }
      setPageMessage(null);
    }
  });

  const alerts = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);

  const summary = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((alert) => alert.severity === 'critical').length;
    const open = alerts.filter((alert) => !alert.resolved).length;
    const unacknowledged = alerts.filter((alert) => !alert.acknowledged).length;

    return {
      total,
      critical,
      open,
      unacknowledged
    };
  }, [alerts]);

  const handleAcknowledge = (id: string) => {
    setPageError(null);
    setPageMessage(null);
    acknowledgeMutation.mutate(id);
  };

  const handleResolve = (alert: AlertItem) => {
    const note = window.prompt(
      `Resolve alert "${alert.type}". Enter an optional resolution note:`,
      alert.resolution_note || ''
    );

    if (note === null) {
      return;
    }

    setPageError(null);
    setPageMessage(null);

    resolveMutation.mutate({
      id: alert.id,
      resolution_note: note
    });
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Alerts</h2>
          <p style={styles.description}>
            Operational alert console for triage, acknowledgement, and resolution.
          </p>
        </div>
      </div>

      {pageError ? <div style={styles.errorBox}>{pageError}</div> : null}
      {pageMessage ? <div style={styles.successBox}>{pageMessage}</div> : null}

      <div style={styles.statsGrid}>
        <StatCard
          title="Visible Alerts"
          value={summary.total}
          subtitle="Rows matching current filters"
        />
        <StatCard
          title="Open Alerts"
          value={summary.open}
          subtitle="Still requiring action"
          tone={summary.open > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title="Critical Alerts"
          value={summary.critical}
          subtitle="Highest priority items"
          tone={summary.critical > 0 ? 'danger' : 'good'}
        />
        <StatCard
          title="Unacknowledged"
          value={summary.unacknowledged}
          subtitle="Not yet claimed by an operator"
          tone={summary.unacknowledged > 0 ? 'warn' : 'good'}
        />
      </div>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Filters</h3>

        <div style={styles.filtersGrid}>
          <div>
            <label style={styles.label}>Search</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Search by type, message, product, severity..."
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value
                }))
              }
            />
          </div>

          <div>
            <label style={styles.label}>Severity</label>
            <select
              style={styles.input}
              value={filters.severity}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  severity: event.target.value
                }))
              }
            >
              <option value="">All severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Resolution State</label>
            <select
              style={styles.input}
              value={filters.resolved}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  resolved: event.target.value
                }))
              }
            >
              <option value="">Resolved + unresolved</option>
              <option value="false">Open only</option>
              <option value="true">Resolved only</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Acknowledgement State</label>
            <select
              style={styles.input}
              value={filters.acknowledged}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  acknowledged: event.target.value
                }))
              }
            >
              <option value="">Acknowledged + unacknowledged</option>
              <option value="false">Unacknowledged only</option>
              <option value="true">Acknowledged only</option>
            </select>
          </div>
        </div>
      </section>

      <section style={styles.list}>
        {alertsQuery.isLoading ? <p>Loading alerts...</p> : null}

        {alertsQuery.isError ? (
          <p>Failed to load alerts: {(alertsQuery.error as Error)?.message || 'Unknown error'}</p>
        ) : null}

        {!alertsQuery.isLoading && !alertsQuery.isError ? (
          <>
            {alerts.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyStateTitle}>No alerts match the current filters</div>
                <div style={styles.emptyStateText}>
                  Try broadening the search or clearing one of the filter conditions.
                </div>
              </div>
            ) : (
              alerts.map((alert) => {
                const isOpen = !alert.resolved;
                const isUnacknowledged = !alert.acknowledged;

                return (
                  <div key={alert.id} style={styles.card}>
                    <div style={styles.cardTop}>
                      <div style={styles.cardTopLeft}>
                        <div style={styles.cardHeadingRow}>
                          <h3 style={styles.cardTitle}>{alert.type}</h3>
                          <span style={severityBadgeStyle(alert.severity)}>
                            {alert.severity}
                          </span>
                        </div>

                        <p style={styles.cardMeta}>
                          Created: {formatDateTime(alert.created_at)}
                        </p>

                        <div style={styles.metaBadgeRow}>
                          <span style={stateBadgeStyle(isOpen ? 'Open' : 'Resolved')}>
                            {isOpen ? 'Open' : 'Resolved'}
                          </span>

                          <span
                            style={stateBadgeStyle(
                              isUnacknowledged ? 'Unacknowledged' : 'Acknowledged'
                            )}
                          >
                            {isUnacknowledged ? 'Unacknowledged' : 'Acknowledged'}
                          </span>

                          <span style={styles.metaChip}>
                            Escalation Level: {alert.escalation_level}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.messageBox}>{alert.message}</div>

                    <div style={styles.detailsGrid}>
                      <div style={styles.detailCard}>
                        <div style={styles.detailLabel}>Product</div>
                        <div style={styles.detailValue}>{alert.product_name || '-'}</div>
                      </div>

                      <div style={styles.detailCard}>
                        <div style={styles.detailLabel}>Acknowledged At</div>
                        <div style={styles.detailValue}>
                          {formatDateTime(alert.acknowledged_at)}
                        </div>
                      </div>

                      <div style={styles.detailCard}>
                        <div style={styles.detailLabel}>Resolved At</div>
                        <div style={styles.detailValue}>
                          {formatDateTime(alert.resolved_at)}
                        </div>
                      </div>

                      <div style={styles.detailCard}>
                        <div style={styles.detailLabel}>Last Escalated</div>
                        <div style={styles.detailValue}>
                          {formatDateTime(alert.last_escalated_at)}
                        </div>
                      </div>
                    </div>

                    {alert.resolution_note ? (
                      <div style={styles.noteBox}>
                        <div style={styles.noteTitle}>Resolution Note</div>
                        <div style={styles.noteText}>{alert.resolution_note}</div>
                      </div>
                    ) : null}

                    <div style={styles.cardActions}>
                      {!alert.acknowledged && !alert.resolved ? (
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                        >
                          {acknowledgeMutation.isPending ? 'Working...' : 'Acknowledge'}
                        </button>
                      ) : null}

                      {!alert.resolved ? (
                        <button
                          type="button"
                          style={styles.primaryButton}
                          onClick={() => handleResolve(alert)}
                          disabled={resolveMutation.isPending}
                        >
                          {resolveMutation.isPending ? 'Working...' : 'Resolve'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700
  },
  description: {
    marginTop: '8px',
    color: '#6b7280',
    lineHeight: 1.5
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534'
  },
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e'
  },
  statValueDanger: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#991b1b'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '20px',
    fontWeight: 700
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none'
  },
  list: {
    display: 'grid',
    gap: '16px'
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  cardTopLeft: {
    flex: 1
  },
  cardHeadingRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '8px'
  },
  cardTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700
  },
  cardMeta: {
    margin: '0 0 10px 0',
    color: '#6b7280',
    fontSize: '13px'
  },
  metaBadgeRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  badgeBase: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px',
    whiteSpace: 'nowrap'
  },
  metaChip: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px',
    background: '#f3f4f6',
    color: '#374151'
  },
  messageBox: {
    marginTop: '6px',
    marginBottom: '14px',
    padding: '14px',
    borderRadius: '12px',
    background: '#fafafa',
    border: '1px solid #e5e7eb',
    color: '#374151',
    lineHeight: 1.6
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    marginBottom: '14px'
  },
  detailCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px',
    background: '#fcfcfc'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px',
    fontWeight: 600
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: 1.4,
    wordBreak: 'break-word'
  },
  noteBox: {
    marginBottom: '14px',
    padding: '14px',
    borderRadius: '12px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb'
  },
  noteTitle: {
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '6px'
  },
  noteText: {
    color: '#374151',
    lineHeight: 1.6
  },
  cardActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 600,
    cursor: 'pointer'
  },
  emptyState: {
    background: '#ffffff',
    border: '1px dashed #d1d5db',
    borderRadius: '14px',
    padding: '28px',
    color: '#6b7280',
    textAlign: 'center'
  },
  emptyStateTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#374151'
  },
  emptyStateText: {
    lineHeight: 1.5
  },
  errorBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c'
  },
  successBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534'
  }
};