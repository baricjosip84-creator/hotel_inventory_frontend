import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type HealthIssue = { code: string; severity: 'info' | 'warning' | 'critical'; points: number; message: string };
type Usage = { key: string; label: string; used: number; limit: number; percent_used: number };
type TenantHealth = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  billing_status: string;
  plan_code: string;
  write_locked: boolean;
  score: number;
  band: 'healthy' | 'watch' | 'risk' | 'critical';
  last_activity_at?: string | null;
  counts: Record<string, number>;
  usage: Usage[];
  issues: HealthIssue[];
};
type HealthResponse = {
  generated_at: string;
  summary: { total: number; healthy: number; watch: number; risk: number; critical: number };
  tenants: TenantHealth[];
};
type ScanResult = {
  scanned_at: string;
  threshold: number;
  tenants_checked: number;
  unhealthy_tenants: number;
  notifications_touched: number;
  created: number;
  refreshed: number;
};

function formatDate(value?: string | null): string {
  if (!value) return 'never';
  return new Date(value).toLocaleString();
}

function bandStyle(band: TenantHealth['band']): CSSProperties {
  if (band === 'critical') return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (band === 'risk') return { ...styles.badge, background: '#ffedd5', color: '#9a3412' };
  if (band === 'watch') return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function issueStyle(severity: HealthIssue['severity']): CSSProperties {
  if (severity === 'critical') return { ...styles.issueBadge, background: '#fee2e2', color: '#991b1b' };
  if (severity === 'warning') return { ...styles.issueBadge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.issueBadge, background: '#e0f2fe', color: '#075985' };
}

export default function PlatformTenantHealthPage() {
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState('');
  const [bandFilter, setBandFilter] = useState('');
  const [threshold, setThreshold] = useState('70');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'health-picker'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenant_id', tenantId);
    return params.toString();
  }, [tenantId]);

  const health = useQuery({
    queryKey: ['platform', 'tenant-health', tenantId],
    queryFn: () => platformApiRequest<HealthResponse>(`/platform/tenant-health${query ? `?${query}` : ''}`)
  });

  const selectedTenantName = tenants.data?.find((tenant) => tenant.id === tenantId)?.name || '';
  const syncScopeLabel = tenantId ? selectedTenantName || 'selected tenant' : 'all non-archived tenants';

  const scan = useMutation({
    mutationFn: () => platformApiRequest<ScanResult>('/platform/tenant-health/scan', {
      method: 'POST',
      body: JSON.stringify({
        threshold: Math.max(0, Math.min(Number(threshold), 100)),
        ...(tenantId ? { tenant_id: tenantId } : {})
      })
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-health'] });
      void queryClient.invalidateQueries({ queryKey: ['platform', 'notifications'] });
    }
  });

  const rows = (health.data?.tenants || []).filter((tenant) => !bandFilter || tenant.band === bandFilter);
  const loadedTenantCount = health.data?.tenants?.length || 0;
  const visibleTenantCount = rows.length;
  const canScan = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_WRITE);

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Tenant health</h1>
        <p style={styles.muted}>A platform scoring view for tenants based on lifecycle, billing, locks, incidents, support sessions, open notifications, overdue HLA work, activity, and configured limits.</p>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters and health notification sync</h2>
        <div style={styles.filterGrid}>
          <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            <option value="">All tenants</option>
            {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
          <select style={styles.input} value={bandFilter} onChange={(event) => setBandFilter(event.target.value)}>
            <option value="">All health bands</option>
            <option value="healthy">Healthy</option>
            <option value="watch">Watch</option>
            <option value="risk">Risk</option>
            <option value="critical">Critical</option>
          </select>
          <label style={styles.fieldLabel}>
            Notification threshold
            <input style={styles.input} type="number" min="0" max="100" value={threshold} onChange={(event) => setThreshold(event.target.value)} placeholder="Notification threshold" />
          </label>
          <button type="button" style={styles.button} onClick={() => void health.refetch()} disabled={health.isFetching}>Refresh</button>
          {canScan ? (
            <button type="button" style={styles.secondaryButton} onClick={() => scan.mutate()} disabled={scan.isPending}>
              {scan.isPending ? 'Syncing...' : 'Sync health notifications'}
            </button>
          ) : null}
        </div>
        {canScan ? (
          <p style={styles.helpText}>This action scans {syncScopeLabel}. Tenants at or below the threshold get one open tenant-health platform notification; existing open tenant-health notifications are refreshed instead of duplicated.</p>
        ) : null}
        {scan.data ? (
          <p style={styles.successText}>Health notification sync complete: checked {scan.data.tenants_checked} tenant(s); {scan.data.unhealthy_tenants} tenant(s) at or below {scan.data.threshold}; {scan.data.created} created, {scan.data.refreshed} refreshed, {scan.data.notifications_touched} total touched.</p>
        ) : null}
        {scan.error ? <p style={styles.errorText}>{scan.error instanceof Error ? scan.error.message : 'Scan failed'}</p> : null}
      </section>

      <section style={styles.metadataPanel}>
        <div><strong>Snapshot source</strong><span>GET /platform/tenant-health{query ? `?${query}` : ''}</span></div>
        <div><strong>Generated</strong><span>{health.data?.generated_at ? formatDate(health.data.generated_at) : 'not loaded yet'}</span></div>
        <div><strong>Scope</strong><span>{tenantId ? selectedTenantName || tenantId : 'All tenants'} · Band: {bandFilter || 'all'} · Showing {visibleTenantCount} of {loadedTenantCount}</span></div>
        <div><strong>Notification sync</strong><span>{canScan ? `Available · threshold ${Math.max(0, Math.min(Number(threshold) || 0, 100))}` : 'Not available for current permissions'}</span></div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Supporting platform pages</h2>
        <div style={styles.linkGrid}>
          <Link style={styles.linkButton} to="/platform/tenants">Tenants</Link>
          <Link style={styles.linkButton} to="/platform/billing">Billing</Link>
          <Link style={styles.linkButton} to="/platform/incidents">Incidents</Link>
          <Link style={styles.linkButton} to="/platform/notifications">Notifications</Link>
          <Link style={styles.linkButton} to="/platform/tenant-tasks">Tenant tasks</Link>
          <Link style={styles.linkButton} to="/platform/support-sessions">Support sessions</Link>
          <Link style={styles.linkButton} to="/platform/tenant-timeline">Tenant timeline</Link>
        </div>
      </section>

      {health.data ? (
        <section style={styles.summaryGrid}>
          <div style={styles.summaryCard}><span>Total</span><strong>{health.data.summary.total}</strong></div>
          <div style={styles.summaryCard}><span>Healthy</span><strong>{health.data.summary.healthy}</strong></div>
          <div style={styles.summaryCard}><span>Watch</span><strong>{health.data.summary.watch}</strong></div>
          <div style={styles.summaryCard}><span>Risk</span><strong>{health.data.summary.risk}</strong></div>
          <div style={styles.summaryCard}><span>Critical</span><strong>{health.data.summary.critical}</strong></div>
        </section>
      ) : null}

      {tenants.error ? (
        <section style={styles.error}>Tenant picker failed to load: {tenants.error instanceof Error ? tenants.error.message : 'Failed to load tenants'} <button type="button" style={styles.inlineButton} onClick={() => void tenants.refetch()}>Retry tenants</button></section>
      ) : null}
      {health.isLoading ? <section style={styles.panel}>Loading tenant health…</section> : null}
      {health.error ? (
        <section style={styles.error}>Tenant health failed to load: {health.error instanceof Error ? health.error.message : 'Failed to load tenant health'} <button type="button" style={styles.inlineButton} onClick={() => void health.refetch()}>Retry health</button></section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Tenants</h2>
        {rows.length === 0 && !health.isLoading ? <p style={styles.muted}>No tenants match the selected filters.</p> : null}
        <div style={styles.cardList}>
          {rows.map((tenant) => (
            <article key={tenant.tenant_id} style={styles.tenantCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>{tenant.tenant_name}</h3>
                  <p style={styles.muted}>{tenant.status} / {tenant.billing_status} / {tenant.plan_code} · Last activity: {formatDate(tenant.last_activity_at)}</p>
                </div>
                <div style={styles.scoreBox}>
                  <strong style={styles.score}>{tenant.score}</strong>
                  <span style={bandStyle(tenant.band)}>{tenant.band}</span>
                </div>
              </div>

              <div style={styles.metricsGrid}>
                <span>Users: <b>{tenant.counts.users || 0}</b></span>
                <span>Products: <b>{tenant.counts.products || 0}</b></span>
                <span>Locations: <b>{tenant.counts.storage_locations || 0}</b></span>
                <span>Incidents: <b>{tenant.counts.open_incidents || 0}</b></span>
                <span>Notifications: <b>{tenant.counts.open_notifications || 0}</b></span>
                <span>Overdue tasks: <b>{tenant.counts.overdue_tasks || 0}</b></span>
              </div>

              <div style={styles.evidenceLinks}>
                <span style={styles.evidenceLabel}>Evidence:</span>
                <Link style={styles.inlineLink} to="/platform/tenant-timeline">timeline</Link>
                <Link style={styles.inlineLink} to="/platform/incidents">incidents</Link>
                <Link style={styles.inlineLink} to="/platform/notifications">notifications</Link>
                <Link style={styles.inlineLink} to="/platform/tenant-tasks">tasks</Link>
                <Link style={styles.inlineLink} to="/platform/billing">billing</Link>
                <Link style={styles.inlineLink} to="/platform/tenants">tenant settings</Link>
              </div>

              {tenant.usage.length ? (
                <div style={styles.usageList}>
                  {tenant.usage.map((usage) => (
                    <span key={usage.key} style={styles.usagePill}>{usage.label}: {usage.used}/{usage.limit} ({usage.percent_used}%)</span>
                  ))}
                </div>
              ) : null}

              {tenant.issues.length ? (
                <div style={styles.issueList}>
                  {tenant.issues.slice(0, 8).map((issue) => (
                    <div key={issue.code} style={styles.issueRow}>
                      <span style={issueStyle(issue.severity)}>{issue.severity}</span>
                      <span>{issue.message}</span>
                      <span style={styles.points}>-{issue.points}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={styles.muted}>No health issues detected.</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  muted: { color: '#64748b', margin: '4px 0', lineHeight: 1.5 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metadataPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, color: '#334155' },
  sectionTitle: { marginTop: 0, color: '#0f172a', fontSize: 18, letterSpacing: '-.015em' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'center' },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#0f172a', width: '100%', boxSizing: 'border-box', minWidth: 0 },
  fieldLabel: { display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 },
  button: { padding: '9px 13px', borderRadius: 9, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 1px 2px rgba(15,23,42,.05)' },
  inlineButton: { marginLeft: 10, padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 },
  secondaryButton: { padding: '9px 13px', borderRadius: 9, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 },
  summaryCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', display: 'grid', gap: 4 },
  error: { padding: 14, borderRadius: 12, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
  errorText: { color: '#991b1b' },
  helpText: { color: '#64748b', margin: '10px 0 0', fontSize: 13, lineHeight: 1.5 },
  linkGrid: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  linkButton: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '8px 12px', color: '#1d4ed8', textDecoration: 'none', background: '#fff', fontWeight: 700 },
  successText: { color: '#166534', margin: '10px 0 0', fontWeight: 700 },
  cardList: { display: 'grid', gap: 14 },
  tenantCard: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, background: '#fff', display: 'grid', gap: 12, boxShadow: '0 1px 2px rgba(15,23,42,.025)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardTitle: { margin: 0, fontSize: 18, color: '#0f172a' },
  scoreBox: { display: 'grid', justifyItems: 'end', gap: 6 },
  score: { fontSize: 32, color: '#0f172a', fontWeight: 800 },
  badge: { borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', border: '1px solid transparent' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, color: '#334155' },
  evidenceLinks: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 10 },
  evidenceLabel: { color: '#475569', fontWeight: 800, fontSize: 13 },
  inlineLink: { color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' },
  usageList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  usagePill: { borderRadius: 999, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '6px 10px', fontSize: 13 },
  issueList: { display: 'grid', gap: 8 },
  issueRow: { display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 10, alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 8 },
  issueBadge: { borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', border: '1px solid transparent' },
  points: { color: '#64748b', fontWeight: 700 }
};
