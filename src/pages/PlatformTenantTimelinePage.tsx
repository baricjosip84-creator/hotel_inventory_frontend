import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type Tenant = { id: string; name: string; location?: string | null };
type TimelineEvent = {
  id: string;
  source: string;
  source_id: string;
  tenant_id: string;
  tenant_name: string;
  title: string;
  details?: string | null;
  status?: string | null;
  severity?: string | null;
  actor_email?: string | null;
  happened_at: string;
  metadata?: Record<string, unknown>;
};
type TimelineResponse = {
  tenant_id: string | null;
  days: number;
  limit: number;
  source: string | null;
  counts: Record<string, number>;
  events: TimelineEvent[];
};

const sourceOptions = [
  { value: '', label: 'All sources' },
  { value: 'audit', label: 'Audit' },
  { value: 'support_session', label: 'Support sessions' },
  { value: 'incident', label: 'Incidents' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'tenant_task', label: 'Tenant tasks' },
  { value: 'billing_event', label: 'Billing events' },
  { value: 'data_retention', label: 'Data retention' },
  { value: 'offboarding', label: 'Offboarding' }
];

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function readableSource(value: string): string {
  return value.replace(/_/g, ' ');
}

function importantMetadata(metadata?: Record<string, unknown>): string[] {
  if (!metadata) return [];
  const keys = ['ticket_reference', 'access_level', 'starts_at', 'ends_at', 'due_at', 'completed_at', 'retain_until', 'scheduled_for', 'impact', 'amount_cents', 'currency', 'external_reference'];
  return keys
    .filter((key) => metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '')
    .map((key) => `${key.replace(/_/g, ' ')}: ${String(metadata[key])}`);
}

export default function PlatformTenantTimelinePage() {
  const [tenantId, setTenantId] = useState('');
  const [days, setDays] = useState('90');
  const [limit, setLimit] = useState('150');
  const [source, setSource] = useState('');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'timeline'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenant_id', tenantId);
    if (days) params.set('days', days);
    if (limit) params.set('limit', limit);
    if (source) params.set('source', source);
    return params.toString();
  }, [tenantId, days, limit, source]);

  const timeline = useQuery({
    queryKey: ['platform', 'tenant-timeline', tenantId, days, limit, source],
    queryFn: () => platformApiRequest<TimelineResponse>(`/platform/tenant-timeline?${query}`)
  });

  const counts = timeline.data?.counts || {};
  const events = timeline.data?.events || [];

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Tenant timeline</h1>
        <p style={styles.muted}>
          A combined operational history for tenant activity across audit logs, support sessions, incidents, maintenance, tasks, billing, retention, and offboarding.
        </p>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.filterGrid}>
          <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            <option value="">All tenants</option>
            {(tenants.data || []).map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
          <select style={styles.input} value={source} onChange={(event) => setSource(event.target.value)}>
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input style={styles.input} type="number" min="1" max="3650" value={days} onChange={(event) => setDays(event.target.value)} placeholder="Days" />
          <input style={styles.input} type="number" min="1" max="500" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="Limit" />
          <button type="button" style={styles.button} onClick={() => void timeline.refetch()} disabled={timeline.isFetching}>
            {timeline.isFetching ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.summaryGrid}>
        {sourceOptions.filter((option) => option.value).map((option) => (
          <div key={option.value} style={styles.summaryCard}>
            <span style={styles.summaryLabel}>{option.label}</span>
            <strong>{counts[option.value] || 0}</strong>
          </div>
        ))}
      </section>

      {timeline.error ? (
        <div style={styles.error}>{timeline.error instanceof Error ? timeline.error.message : 'Failed to load timeline'}</div>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Events</h2>
        {events.length === 0 && !timeline.isFetching ? <p style={styles.muted}>No timeline events found for the selected filters.</p> : null}
        <div style={styles.eventList}>
          {events.map((event) => {
            const metadata = importantMetadata(event.metadata);
            return (
              <article key={event.id} style={styles.eventCard}>
                <div style={styles.eventHeader}>
                  <div>
                    <div style={styles.eventTitle}>{event.title}</div>
                    <div style={styles.muted}>{event.tenant_name} · {readableSource(event.source)} · {formatDate(event.happened_at)}</div>
                  </div>
                  <div style={styles.badgeGroup}>
                    {event.status ? <span style={styles.badge}>{event.status}</span> : null}
                    {event.severity ? <span style={styles.badgeStrong}>{event.severity}</span> : null}
                  </div>
                </div>
                {event.details ? <p style={styles.details}>{event.details}</p> : null}
                <div style={styles.metaLine}>Actor: {event.actor_email || 'system / unknown'}</div>
                {metadata.length ? <div style={styles.metaLine}>{metadata.join(' · ')}</div> : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 20 },
  title: { margin: 0, fontSize: 28 },
  muted: { color: '#6b7280', margin: '4px 0' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)' },
  sectionTitle: { marginTop: 0 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'center' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff' },
  button: { padding: '10px 14px', borderRadius: 10, border: 0, background: '#111827', color: '#fff', cursor: 'pointer' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  summaryCard: { background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)', display: 'grid', gap: 4 },
  summaryLabel: { color: '#6b7280', fontSize: 13 },
  error: { padding: 14, borderRadius: 12, background: '#fef2f2', color: '#991b1b' },
  eventList: { display: 'grid', gap: 12 },
  eventCard: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: '#fff' },
  eventHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  eventTitle: { fontWeight: 800, fontSize: 16 },
  details: { margin: '10px 0', color: '#374151' },
  metaLine: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  badgeGroup: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  badge: { fontSize: 12, padding: '4px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3' },
  badgeStrong: { fontSize: 12, padding: '4px 8px', borderRadius: 999, background: '#fff7ed', color: '#9a3412' }
};
