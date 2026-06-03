import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type SubscriptionItem = { tenant_id: string; tenant_name: string; tenant_status: string; billing_status: string; plan_code?: string | null; readiness_state: string; risk_flags: string[]; days_until_trial_end?: number | null; days_until_period_end?: number | null; billing_event_count: number; last_billing_event_at?: string | null };
type SubscriptionPackage = { posture: string; summary: Record<string, number>; items: SubscriptionItem[] };

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('review')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}
function FlagList({ flags }: { flags: string[] }) { return <div style={styles.flags}>{flags.length ? flags.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>) : <span style={styles.help}>No flags</span>}</div>; }
function dateOnly(value?: string | null) { return value ? new Date(value).toLocaleDateString() : '—'; }

export default function PlatformSubscriptionReadinessPage() {
  const readinessQuery = useQuery({ queryKey: ['platform', 'subscription-readiness'], queryFn: () => platformApiRequest<SubscriptionPackage>('/platform/subscription-readiness') });
  const data = readinessQuery.data;
  const summary = data?.summary || {};
  const items = data?.items || [];
  const metricEntries = ['tenants_reviewed', 'ready_tenants', 'tenants_requiring_review', 'blocked_tenants', 'trials_ending_soon', 'missing_plan_codes', 'missing_customer_references', 'missing_billing_event_history'];

  return <div style={styles.page}>
    <header style={styles.header}><div><h1 style={styles.title}>Subscription readiness</h1><p style={styles.subtitle}>Read-only billing and subscription posture for commercial activation, renewal, and blocker review.</p></div>{data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}</header>
    {readinessQuery.isLoading ? <section style={styles.card}>Loading subscription readiness…</section> : null}
    {readinessQuery.error ? <section style={styles.card}>Unable to load subscription readiness.</section> : null}
    {data ? <section style={styles.summaryGrid}>{metricEntries.map((key) => <div key={key} style={styles.card}><strong>{key.replaceAll('_', ' ')}</strong><div style={styles.metric}>{summary[key] ?? 0}</div></div>)}</section> : null}
    <section style={styles.card}><h2 style={styles.cardTitle}>Tenant subscription evidence</h2><div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Tenant</th><th style={styles.th}>Billing</th><th style={styles.th}>Plan</th><th style={styles.th}>Windows</th><th style={styles.th}>Events</th><th style={styles.th}>Flags</th></tr></thead><tbody>{items.map((item) => <tr key={item.tenant_id}><td style={styles.td}><strong>{item.tenant_name}</strong><br /><span style={styles.help}>{item.tenant_status} · {item.readiness_state}</span></td><td style={styles.td}>{item.billing_status}</td><td style={styles.td}>{item.plan_code || '—'}</td><td style={styles.td}>Trial: {item.days_until_trial_end ?? '—'} days<br /><span style={styles.help}>Period: {item.days_until_period_end ?? '—'} days</span></td><td style={styles.td}>{item.billing_event_count}<br /><span style={styles.help}>{dateOnly(item.last_billing_event_at)}</span></td><td style={styles.td}><FlagList flags={item.risk_flags} /></td></tr>)}{!items.length ? <tr><td style={styles.td} colSpan={6}>No subscription readiness rows available.</td></tr> : null}</tbody></table></div></section>
  </div>;
}

const styles: Record<string, CSSProperties> = { page: { display: 'flex', flexDirection: 'column', gap: 20 }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }, title: { margin: 0, fontSize: 28 }, subtitle: { margin: '6px 0 0', color: '#6b7280' }, badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' }, summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }, card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }, metric: { fontSize: 28, fontWeight: 800, marginTop: 8 }, cardTitle: { margin: '0 0 10px', fontSize: 18 }, flags: { display: 'flex', flexWrap: 'wrap', gap: 6 }, flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 }, help: { color: '#6b7280', fontSize: 12 }, tableWrap: { overflowX: 'auto' }, table: { width: '100%', borderCollapse: 'collapse' }, th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 }, td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' } };
