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
  return apiRequest<AlertRow>(`/alerts/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({}) });
}

async function resolveAlert(id: string): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution_note: 'Resolved from Alerts page' }) });
}

async function reopenAlert(id: string): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${id}/reopen`, { method: 'POST', body: JSON.stringify({}) });
}

async function escalateAlert(id: string): Promise<AlertRow> {
  return apiRequest<AlertRow>(`/alerts/${id}/escalate`, { method: 'POST', body: JSON.stringify({}) });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function severityStyle(severity: string): CSSProperties {
  if (severity === 'critical') return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (severity === 'warning') return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dbeafe', color: '#1d4ed8' };
}

function nextActionLink(alert: AlertRow): { to: string; label: string } {
  if (alert.product_id) {
    return { to: `/stock?productId=${encodeURIComponent(alert.product_id)}`, label: 'Open in Stock' };
  }

  if (alert.type.toLowerCase().includes('shipment')) {
    return { to: '/shipments', label: 'Open Shipments' };
  }

  return { to: `/dashboard?alertId=${encodeURIComponent(alert.id)}`, label: 'Open Dashboard' };
}

export default function AlertsPage() {
  /*
    WHAT CHANGED
    ------------
    The current frontend zip had an AlertsPage that was actually duplicated
    supplier CRUD logic. This file restores Alerts as a real operational queue
    based on the current backend alert routes.

    WHY IT CHANGED
    --------------
    Your backend already exposes a complete alert workflow with list, filter,
    acknowledge, resolve, reopen, and escalate actions. The frontend needed to
    surface that exact operational model instead of a broken duplicate page.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This gives the product a real action queue for operational alerts and links
    each alert to the next relevant page so users can move from signal to action.
  */
  const queryClient = useQueryClient();
  const { role, canManageAlerts } = getRoleCapabilities();
  const [filters, setFilters] = useState<AlertFilters>({ search: '', severity: '', resolved: 'false', acknowledged: '' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const alertsQuery = useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => fetchAlerts(filters)
  });

  const makeMutation = (mutationFn: (id: string) => Promise<AlertRow>) => useMutation({
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

  const alerts = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);
  const summary = useMemo(() => ({
    total: alerts.length,
    unresolved: alerts.filter((a) => !a.resolved).length,
    critical: alerts.filter((a) => !a.resolved && a.severity === 'critical').length,
    unacknowledged: alerts.filter((a) => !a.acknowledged).length
  }), [alerts]);

  if (alertsQuery.isLoading) return <p>Loading alerts...</p>;
  if (alertsQuery.isError) return <p>Failed to load alerts: {(alertsQuery.error as Error).message}</p>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Alerts</h1>
          <p style={styles.description}>Review tenant-scoped operational alerts, acknowledge ownership, resolve when complete, and route directly into the next operational page.</p>
        </div>
      </header>

      <section style={styles.workflowPanel}>
        <h2 style={styles.workflowTitle}>Workflow clarity</h2>
        <p style={styles.workflowText}>Treat alerts as an action queue: review severity, open the linked operational page, then acknowledge, resolve, reopen, or escalate based on the real situation.</p>
      </section>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}><div style={styles.statTitle}>Visible Alerts</div><div style={styles.statValue}>{summary.total}</div><div style={styles.statSubtitle}>Current filter result set</div></div>
        <div style={styles.statCard}><div style={styles.statTitle}>Unresolved</div><div style={styles.statValueWarn}>{summary.unresolved}</div><div style={styles.statSubtitle}>Still requiring action</div></div>
        <div style={styles.statCard}><div style={styles.statTitle}>Critical</div><div style={styles.statValueDanger}>{summary.critical}</div><div style={styles.statSubtitle}>Highest operational urgency</div></div>
        <div style={styles.statCard}><div style={styles.statTitle}>Unacknowledged</div><div style={styles.statValue}>{summary.unacknowledged}</div><div style={styles.statSubtitle}>Not yet owned by an operator</div></div>
      </div>

      {!canManageAlerts ? <div style={styles.warningBox}>Current role: {role.toUpperCase()}. Alerts can still be reviewed, but acknowledge / resolve / reopen / escalate actions are restricted to manager and admin roles.</div> : null}
      {actionError ? <div style={styles.errorBox}>{actionError}</div> : null}
      {actionMessage ? <div style={styles.successBox}>{actionMessage}</div> : null}

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Filters</h2>
        <div style={styles.filterGrid}>
          <input style={styles.input} value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} placeholder="Search message, type, or product" />
          <select style={styles.input} value={filters.severity} onChange={(e) => setFilters((c) => ({ ...c, severity: e.target.value }))}>
            <option value="">All severities</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option>
          </select>
          <select style={styles.input} value={filters.resolved} onChange={(e) => setFilters((c) => ({ ...c, resolved: e.target.value }))}>
            <option value="">All states</option><option value="false">Unresolved</option><option value="true">Resolved</option>
          </select>
          <select style={styles.input} value={filters.acknowledged} onChange={(e) => setFilters((c) => ({ ...c, acknowledged: e.target.value }))}>
            <option value="">Acknowledged + unacknowledged</option><option value="false">Unacknowledged</option><option value="true">Acknowledged</option>
          </select>
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Alert Queue</h2>
        {alerts.length === 0 ? (
          <div style={styles.emptyState}><strong>No alerts found.</strong><span>Adjust filters or continue operating if the current tenant is clean.</span></div>
        ) : (
          <div style={styles.cardList}>
            {alerts.map((alert) => {
              const next = nextActionLink(alert);
              return (
                <article key={alert.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div>
                      <div style={styles.cardTitle}>{alert.type}</div>
                      <div style={styles.cardMeta}>{alert.product_name || 'No product linked'} · {formatDateTime(alert.created_at)}</div>
                    </div>
                    <div style={styles.badgeRow}>
                      <span style={severityStyle(alert.severity)}>{alert.severity}</span>
                      <span style={styles.badge}>{alert.resolved ? 'Resolved' : 'Open'}</span>
                    </div>
                  </div>
                  <div style={styles.cardText}>{alert.message}</div>
                  <div style={styles.keyGrid}>
                    <div><strong>Acknowledged</strong><div>{alert.acknowledged ? 'Yes' : 'No'}</div></div>
                    <div><strong>Escalation</strong><div>{alert.escalation_level}</div></div>
                    <div><strong>Resolved By</strong><div>{alert.resolved_by_name || '-'}</div></div>
                  </div>
                  <div style={styles.actionRow}>
                    <Link to={next.to} style={styles.linkButton}>{next.label}</Link>
                    {canManageAlerts && !alert.acknowledged ? <button style={styles.secondaryButton} onClick={() => acknowledgeMutation.mutate(alert.id)} disabled={acknowledgeMutation.isPending}>Acknowledge</button> : null}
                    {canManageAlerts && !alert.resolved ? <button style={styles.primaryButton} onClick={() => resolveMutation.mutate(alert.id)} disabled={resolveMutation.isPending}>Resolve</button> : null}
                    {canManageAlerts && alert.resolved ? <button style={styles.secondaryButton} onClick={() => reopenMutation.mutate(alert.id)} disabled={reopenMutation.isPending}>Reopen</button> : null}
                    {canManageAlerts && !alert.resolved ? <button style={styles.warnButton} onClick={() => escalateMutation.mutate(alert.id)} disabled={escalateMutation.isPending}>Escalate</button> : null}
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
  page: { display: 'grid', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '1.9rem', color: '#0f172a' },
  description: { margin: '6px 0 0', color: '#475569', maxWidth: 760, lineHeight: 1.5 },
  workflowPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 },
  workflowTitle: { margin: 0, fontSize: '1.05rem', color: '#0f172a' },
  workflowText: { margin: '6px 0 0', color: '#475569', lineHeight: 1.5 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 },
  statTitle: { fontSize: '0.85rem', color: '#64748b', marginBottom: 8 },
  statValue: { fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' },
  statValueWarn: { fontSize: '1.6rem', fontWeight: 800, color: '#b45309' },
  statValueDanger: { fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c' },
  statSubtitle: { marginTop: 6, color: '#64748b', lineHeight: 1.4, fontSize: '0.92rem' },
  warningBox: { background: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74', borderRadius: 14, padding: 14, lineHeight: 1.5 },
  errorBox: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 12, padding: 12 },
  successBox: { background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'grid', gap: 14 },
  panelTitle: { margin: 0, fontSize: '1.1rem', color: '#0f172a' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  input: { width: '100%', padding: '0.8rem 0.9rem', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' },
  emptyState: { background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 14, padding: 18, display: 'grid', gap: 6, color: '#475569' },
  cardList: { display: 'grid', gap: 12 },
  card: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#fff', display: 'grid', gap: 12 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  cardTitle: { fontWeight: 800, color: '#0f172a' },
  cardMeta: { color: '#64748b', fontSize: '0.9rem', marginTop: 4 },
  cardText: { color: '#334155', lineHeight: 1.5 },
  keyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, color: '#334155' },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  linkButton: { border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff', color: '#1d4ed8', padding: '0.8rem 1rem', fontWeight: 700, textDecoration: 'none' },
  primaryButton: { border: 'none', borderRadius: 12, background: '#2563eb', color: '#fff', padding: '0.8rem 1rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff', color: '#0f172a', padding: '0.8rem 1rem', fontWeight: 600, cursor: 'pointer' },
  warnButton: { border: '1px solid #fde68a', borderRadius: 12, background: '#fffbeb', color: '#92400e', padding: '0.8rem 1rem', fontWeight: 700, cursor: 'pointer' },
  badgeRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  badge: { display: 'inline-block', padding: '6px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px', background: '#e5e7eb', color: '#374151' }
};
