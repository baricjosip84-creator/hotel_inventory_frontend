import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type CountRow = { status: string; count: number };
type NotificationCount = { status: string; severity: string; count: number };
type TenantAttention = { id: string; name: string; status?: string; billing_status?: string; plan_code?: string; write_locked?: boolean; updated_at?: string };
type SupportSessionAttention = { id: string; tenant_id: string; tenant_name: string; reason: string; access_level: string; ticket_reference?: string | null; expires_at: string; platform_user_email: string };
type LimitAttention = { id: string; name: string; status: string; billing_status: string; plan_code: string; limits: Array<{ key: string; used: number; limit: number; percent_used: number }> };
type StaleTenant = { id: string; name: string; status: string; billing_status: string; plan_code: string; last_seen_at?: string | null };
type Dashboard = {
  generated_at: string;
  tenants_by_status: CountRow[];
  support_sessions_by_status: CountRow[];
  active_platform_sessions: number;
  notifications: NotificationCount[];
  platform_audit_events_last_24h: number;
  attention?: {
    billing_or_lifecycle: TenantAttention[];
    locked_tenants: TenantAttention[];
    active_support_sessions: SupportSessionAttention[];
    stale_tenants: StaleTenant[];
    limit_attention: LimitAttention[];
  };
};

function Empty({ label }: { label: string }) {
  return <div style={styles.empty}>{label}</div>;
}

export default function PlatformDashboardPage() {
  const q = useQuery({ queryKey: ['platform', 'dashboard'], queryFn: () => platformApiRequest<Dashboard>('/platform/dashboard') });
  const data = q.data;
  const attentionTotal = data?.attention
    ? data.attention.billing_or_lifecycle.length + data.attention.locked_tenants.length + data.attention.active_support_sessions.length + data.attention.stale_tenants.length + data.attention.limit_attention.length
    : 0;

  return <div style={styles.page}>
    <header>
      <h1 style={styles.title}>Platform dashboard</h1>
      <p style={styles.muted}>Operational summary across tenants, support, sessions, notifications, audit, limits, and account attention.</p>
    </header>

    {q.isLoading ? <section style={styles.panel}>Loading…</section> : null}
    {q.error ? <section style={styles.error}>{q.error instanceof Error ? q.error.message : 'Failed to load dashboard'}</section> : null}

    {data ? <>
      <section style={styles.grid}>
        <div style={styles.card}><b>Active platform sessions</b><span style={styles.big}>{data.active_platform_sessions}</span></div>
        <div style={styles.card}><b>Audit events last 24h</b><span style={styles.big}>{data.platform_audit_events_last_24h}</span></div>
        <div style={styles.card}><b>Attention items</b><span style={styles.big}>{attentionTotal}</span></div>
      </section>

      <section style={styles.grid}>
        <div style={styles.panel}><h2>Tenants by status</h2>{data.tenants_by_status.length ? data.tenants_by_status.map((x) => <div key={x.status} style={styles.row}><span>{x.status}</span><b>{x.count}</b></div>) : <Empty label="No tenant status data" />}</div>
        <div style={styles.panel}><h2>Support sessions</h2>{data.support_sessions_by_status.length ? data.support_sessions_by_status.map((x) => <div key={x.status} style={styles.row}><span>{x.status}</span><b>{x.count}</b></div>) : <Empty label="No support sessions" />}</div>
        <div style={styles.panel}><h2>Notifications</h2>{data.notifications.length ? data.notifications.map((x) => <div key={`${x.status}-${x.severity}`} style={styles.row}><span>{x.status} / {x.severity}</span><b>{x.count}</b></div>) : <Empty label="No notifications" />}</div>
      </section>

      <section style={styles.panel}>
        <h2>Billing / lifecycle attention</h2>
        {data.attention?.billing_or_lifecycle.length ? data.attention.billing_or_lifecycle.map((tenant) => <div key={tenant.id} style={styles.item}><b>{tenant.name}</b><span>{tenant.status} / {tenant.billing_status} / {tenant.plan_code || 'no plan'}</span></div>) : <Empty label="No billing or lifecycle attention items" />}
      </section>

      <section style={styles.panel}>
        <h2>Limit attention</h2>
        {data.attention?.limit_attention.length ? data.attention.limit_attention.map((tenant) => <div key={tenant.id} style={styles.item}><b>{tenant.name}</b>{tenant.limits.map((limit) => <span key={limit.key}>{limit.key}: {limit.used}/{limit.limit} ({limit.percent_used}%)</span>)}</div>) : <Empty label="No tenants near or over configured limits" />}
      </section>

      <section style={styles.panel}>
        <h2>Active support sessions</h2>
        {data.attention?.active_support_sessions.length ? data.attention.active_support_sessions.map((session) => <div key={session.id} style={styles.item}><b>{session.tenant_name}</b><span>{session.access_level} by {session.platform_user_email}</span><span>Expires: {new Date(session.expires_at).toLocaleString()}</span><span>Reason: {session.reason}</span></div>) : <Empty label="No active support sessions" />}
      </section>

      <section style={styles.grid}>
        <div style={styles.panel}><h2>Locked tenants</h2>{data.attention?.locked_tenants.length ? data.attention.locked_tenants.map((tenant) => <div key={tenant.id} style={styles.item}><b>{tenant.name}</b><span>{tenant.status} / {tenant.billing_status}</span></div>) : <Empty label="No locked tenants" />}</div>
        <div style={styles.panel}><h2>Inactive tenants</h2>{data.attention?.stale_tenants.length ? data.attention.stale_tenants.map((tenant) => <div key={tenant.id} style={styles.item}><b>{tenant.name}</b><span>Last seen: {tenant.last_seen_at ? new Date(tenant.last_seen_at).toLocaleString() : 'Never active'}</span></div>) : <Empty label="No inactive active/trial tenants" />}</div>
      </section>
    </> : null}
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { margin: 0 },
  muted: { color: '#6b7280' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)', display: 'flex', flexDirection: 'column', gap: 10 },
  big: { fontSize: 32 },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)' },
  row: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '10px 0' },
  item: { borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 4 },
  empty: { color: '#6b7280', padding: '10px 0' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 }
};
