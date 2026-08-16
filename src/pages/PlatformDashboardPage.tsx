import type { CSSProperties, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { platformApiRequest } from '../lib/platformApi';

type CountRow = { status: string; count: number };
type NotificationCount = { status: string; severity: string; count: number };
type TenantAttention = { id: string; name: string; status?: string; billing_status?: string; plan_code?: string; write_locked?: boolean; updated_at?: string };
type SupportSessionAttention = { id: string; tenant_id: string; tenant_name: string; reason: string; access_level: string; ticket_reference?: string | null; expires_at: string; platform_user_email: string };
type LimitAttention = { id: string; name: string; status: string; billing_status: string; plan_code: string; limits: Array<{ key: string; used: number; limit: number; percent_used: number }> };
type StaleTenant = { id: string; name: string; status: string; billing_status: string; plan_code: string; last_seen_at?: string | null };
type DashboardVisibility = {
  tenants: boolean;
  platform_sessions: boolean;
  notifications: boolean;
  audit: boolean;
  billing_attention: boolean;
  support_sessions: boolean;
};
type Dashboard = {
  generated_at: string;
  visibility: DashboardVisibility;
  tenants_by_status: CountRow[];
  support_sessions_by_status: CountRow[];
  active_platform_sessions: number | null;
  notifications: NotificationCount[];
  platform_audit_events_last_24h: number | null;
  attention: {
    billing_or_lifecycle: TenantAttention[];
    locked_tenants: TenantAttention[];
    active_support_sessions: SupportSessionAttention[];
    stale_tenants: StaleTenant[];
    limit_attention: LimitAttention[];
  };
};

function humanize(value: string | null | undefined): string {
  const normalized = String(value || '').trim().replace(/_/g, ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function shortId(value: string): string {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function Empty({ label }: { label: string }) {
  return <div style={styles.empty}>{label}</div>;
}

function SectionHeading({ title, to, linkLabel }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div style={styles.sectionHeading}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {to && linkLabel ? <Link to={to} style={styles.sectionLink}>{linkLabel}</Link> : null}
    </div>
  );
}

function MetricCard({ label, value, helper, to }: { label: string; value: ReactNode; helper: string; to?: string }) {
  return (
    <div style={styles.card}>
      <b>{label}</b>
      <span style={styles.big}>{value}</span>
      <span style={styles.cardHelper}>{helper}</span>
      {to ? <Link to={to} style={styles.cardLink}>Open details</Link> : null}
    </div>
  );
}

function TenantIdentity({ id, name }: { id: string; name: string }) {
  return (
    <div style={styles.identityLine}>
      <b>{name}</b>
      <span style={styles.idText} title={id}>ID {shortId(id)}</span>
    </div>
  );
}

function DetailLine({ children }: { children: ReactNode }) {
  return <span style={styles.detailLine}>{children}</span>;
}

export default function PlatformDashboardPage() {
  const q = useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: () => platformApiRequest<Dashboard>('/platform/dashboard'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
  const data = q.data;
  const visibility = data?.visibility;
  const attentionTotal = data?.attention
    ? (visibility?.billing_attention ? data.attention.billing_or_lifecycle.length : 0)
      + (visibility?.tenants ? data.attention.locked_tenants.length + data.attention.stale_tenants.length + data.attention.limit_attention.length : 0)
      + (visibility?.support_sessions ? data.attention.active_support_sessions.length : 0)
    : 0;
  const hasAttentionVisibility = Boolean(visibility?.billing_attention || visibility?.tenants || visibility?.support_sessions);
  const hasOverviewVisibility = Boolean(visibility?.tenants || visibility?.support_sessions || visibility?.notifications);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Platform dashboard</h1>
          <p style={styles.muted}>Operational summary across tenants, support, sessions, notifications, audit, limits, and account attention.</p>
        </div>
        <div style={styles.refreshBlock}>
          <span style={styles.refreshMeta}>Last refreshed: {formatDateTime(data?.generated_at)}</span>
          <button type="button" style={styles.secondaryButton} onClick={() => void q.refetch()} disabled={q.isFetching}>
            {q.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {q.isLoading ? <section style={styles.panel}>Loading platform dashboard…</section> : null}
      {q.error ? (
        <section style={styles.errorPanel}>
          <strong>Platform dashboard failed to load.</strong>
          <span>{q.error instanceof Error ? q.error.message : 'Failed to load dashboard'}</span>
          <button type="button" style={styles.retryButton} onClick={() => void q.refetch()}>Retry</button>
        </section>
      ) : null}

      {data ? (
        <>
          <section style={styles.grid}>
            {visibility?.platform_sessions ? (
              <MetricCard
                label="Active platform sessions"
                value={data.active_platform_sessions ?? 0}
                helper="Currently usable platform-user sessions"
                to="/platform/sessions"
              />
            ) : null}
            {visibility?.audit ? (
              <MetricCard
                label="Audit events last 24h"
                value={data.platform_audit_events_last_24h ?? 0}
                helper="Platform audit evidence created in the last 24 hours"
                to="/platform/audit"
              />
            ) : null}
            {hasAttentionVisibility ? (
              <MetricCard
                label="Attention signals"
                value={attentionTotal}
                helper="Visible billing, lock, support, inactivity, and limit signals"
              />
            ) : null}
          </section>

          {hasOverviewVisibility ? (
            <section style={styles.grid}>
              {visibility?.tenants ? (
                <div style={styles.panel}>
                  <SectionHeading title="Tenants by status" to="/platform/tenants" linkLabel="Open tenants" />
                  {data.tenants_by_status.length
                    ? data.tenants_by_status.map((x) => <div key={x.status} style={styles.row}><span>{humanize(x.status)}</span><b>{x.count}</b></div>)
                    : <Empty label="No tenant status data" />}
                </div>
              ) : null}
              {visibility?.support_sessions ? (
                <div style={styles.panel}>
                  <SectionHeading title="Support sessions" to="/platform/support-sessions" linkLabel="Open support sessions" />
                  {data.support_sessions_by_status.length
                    ? data.support_sessions_by_status.map((x) => <div key={x.status} style={styles.row}><span>{humanize(x.status)}</span><b>{x.count}</b></div>)
                    : <Empty label="No support sessions" />}
                </div>
              ) : null}
              {visibility?.notifications ? (
                <div style={styles.panel}>
                  <SectionHeading title="Notifications" to="/platform/notifications" linkLabel="Open notifications" />
                  {data.notifications.length
                    ? data.notifications.map((x) => <div key={`${x.status}-${x.severity}`} style={styles.row}><span>{humanize(x.status)} · {humanize(x.severity)}</span><b>{x.count}</b></div>)
                    : <Empty label="No notifications" />}
                </div>
              ) : null}
            </section>
          ) : null}

          {visibility?.billing_attention ? (
            <section style={styles.panel}>
              <SectionHeading title="Billing / lifecycle attention" to="/platform/billing" linkLabel="Open billing" />
              {data.attention.billing_or_lifecycle.length
                ? data.attention.billing_or_lifecycle.map((tenant) => (
                    <div key={tenant.id} style={styles.item}>
                      <TenantIdentity id={tenant.id} name={tenant.name} />
                      <DetailLine>Lifecycle: {humanize(tenant.status)} · Billing: {humanize(tenant.billing_status)} · Plan: {humanize(tenant.plan_code || 'no plan')}</DetailLine>
                    </div>
                  ))
                : <Empty label="No billing or lifecycle attention signals" />}
            </section>
          ) : null}

          {visibility?.tenants ? (
            <section style={styles.panel}>
              <SectionHeading title="Limit attention" to="/platform/tenants" linkLabel="Open tenants" />
              <p style={styles.sectionHelper}>Shows configured user, product, or storage-location limits at 80% usage or higher.</p>
              {data.attention.limit_attention.length
                ? data.attention.limit_attention.map((tenant) => (
                    <div key={tenant.id} style={styles.item}>
                      <TenantIdentity id={tenant.id} name={tenant.name} />
                      {tenant.limits.map((limit) => (
                        <DetailLine key={limit.key}>{humanize(limit.key)}: {limit.used}/{limit.limit} ({limit.percent_used}%)</DetailLine>
                      ))}
                    </div>
                  ))
                : <Empty label="No tenants near or over configured limits" />}
            </section>
          ) : null}

          {visibility?.support_sessions ? (
            <section style={styles.panel}>
              <SectionHeading title="Active support sessions" to="/platform/support-sessions" linkLabel="Open support sessions" />
              {data.attention.active_support_sessions.length
                ? data.attention.active_support_sessions.map((session) => (
                    <div key={session.id} style={styles.item}>
                      <TenantIdentity id={session.tenant_id} name={session.tenant_name} />
                      <DetailLine>{humanize(session.access_level)} · Operator: {session.platform_user_email}</DetailLine>
                      <DetailLine>Expires: {formatDateTime(session.expires_at)}</DetailLine>
                      {session.ticket_reference ? <DetailLine>Ticket: {session.ticket_reference}</DetailLine> : null}
                      <DetailLine>Reason: {session.reason}</DetailLine>
                    </div>
                  ))
                : <Empty label="No active, unexpired support sessions" />}
            </section>
          ) : null}

          {visibility?.tenants ? (
            <section style={styles.nonStretchGrid}>
              <div style={styles.panel}>
                <SectionHeading title="Locked tenants" to="/platform/tenants" linkLabel="Open tenants" />
                {data.attention.locked_tenants.length
                  ? data.attention.locked_tenants.map((tenant) => (
                      <div key={tenant.id} style={styles.item}>
                        <TenantIdentity id={tenant.id} name={tenant.name} />
                        <DetailLine>{humanize(tenant.status)} · {humanize(tenant.billing_status)} · {humanize(tenant.plan_code)}</DetailLine>
                      </div>
                    ))
                  : <Empty label="No locked tenants" />}
              </div>
              <div style={styles.panel}>
                <SectionHeading title="Stale active / trial tenants" to="/platform/tenants" linkLabel="Open tenants" />
                <p style={styles.sectionHelper}>Active or trial tenants with no recorded activity for 30 days, or no recorded activity at all.</p>
                {data.attention.stale_tenants.length
                  ? data.attention.stale_tenants.map((tenant) => (
                      <div key={tenant.id} style={styles.item}>
                        <TenantIdentity id={tenant.id} name={tenant.name} />
                        <DetailLine>{humanize(tenant.status)} · {humanize(tenant.billing_status)} · {humanize(tenant.plan_code)}</DetailLine>
                        <DetailLine>Last activity: {tenant.last_seen_at ? formatDateTime(tenant.last_seen_at) : 'Never recorded'}</DetailLine>
                      </div>
                    ))
                  : <Empty label="No stale active or trial tenants" />}
              </div>
            </section>
          ) : null}

          {!visibility?.tenants && !visibility?.platform_sessions && !visibility?.notifications && !visibility?.audit && !visibility?.support_sessions ? (
            <section style={styles.panel}>
              <Empty label="Your role can open the Platform Dashboard, but no detailed dashboard data categories are available with its current platform permissions." />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 18, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', paddingBottom: 4 },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em' },
  muted: { color: '#64748b', margin: '8px 0 0', maxWidth: 820, lineHeight: 1.55 },
  refreshBlock: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' },
  refreshMeta: { color: '#64748b', fontSize: 13 },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '9px 13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(15,23,42,.03)' },
  retryButton: { border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 },
  nonStretchGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, alignItems: 'start' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 130 },
  big: { fontSize: 32, lineHeight: 1.1 },
  cardHelper: { color: '#64748b', fontSize: 13, lineHeight: 1.45 },
  cardLink: { color: '#1d4ed8', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginTop: 'auto' },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  sectionHeading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  sectionTitle: { margin: 0, fontSize: 18, letterSpacing: '-.015em' },
  sectionLink: { color: '#1d4ed8', fontSize: 13, fontWeight: 700, textDecoration: 'none' },
  sectionHelper: { color: '#64748b', fontSize: 13, margin: '0 0 8px', lineHeight: 1.45 },
  row: { display: 'flex', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid #e2e8f0', padding: '10px 0' },
  item: { borderBottom: '1px solid #e2e8f0', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
  identityLine: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  idText: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' },
  detailLine: { color: '#475569', fontSize: 14, lineHeight: 1.45, overflowWrap: 'anywhere' },
  empty: { color: '#64748b', padding: '10px 0' },
  errorPanel: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }
};
