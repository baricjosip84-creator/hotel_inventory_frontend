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


const sourceVisuals: Record<string, { icon: string; accent: string; label: string }> = {
  audit: { icon: '🧾', accent: '#6366f1', label: 'Audit' },
  support_session: { icon: '🎧', accent: '#0ea5e9', label: 'Support session' },
  incident: { icon: '⚠️', accent: '#dc2626', label: 'Incident' },
  maintenance: { icon: '🛠️', accent: '#f97316', label: 'Maintenance' },
  tenant_task: { icon: '📝', accent: '#7c3aed', label: 'Task' },
  tenant_communication: { icon: '📧', accent: '#0891b2', label: 'Communication' },
  billing_event: { icon: '💰', accent: '#16a34a', label: 'Billing' },
  data_retention: { icon: '🗄️', accent: '#475569', label: 'Retention' },
  offboarding: { icon: '🚪', accent: '#be123c', label: 'Offboarding' }
};

const eventTitleMap: Record<string, string> = {
  create: 'Tenant created',
  update: 'Tenant updated',
  'tenant.create': 'Tenant created',
  'tenant.update': 'Tenant updated',
  'tenant.lock': 'Tenant locked',
  'tenant.unlock': 'Tenant unlocked',
  'tenant.contact.create': 'Contact created',
  'tenant.contact.update': 'Contact updated',
  'tenant.contact.delete': 'Contact deleted',
  'tenant.communication.create': 'Communication logged',
  'tenant.communication.update': 'Communication updated',
  'tenant.communication.resolve_followup': 'Follow-up resolved',
  'tenant.communication.archive': 'Communication archived',
  'tenant.task.create': 'Task created',
  'tenant.task.update': 'Task updated',
  'tenant.task.delete': 'Task deleted',
  tenant_create: 'Tenant created',
  tenant_update: 'Tenant updated',
  tenant_lock: 'Tenant locked',
  tenant_unlock: 'Tenant unlocked',
  tenant_contact_create: 'Contact created',
  tenant_contact_update: 'Contact updated',
  tenant_contact_delete: 'Contact deleted',
  tenant_communication_create: 'Communication logged',
  tenant_communication_update: 'Communication updated',
  tenant_communication_resolve_followup: 'Follow-up resolved',
  tenant_communication_archive: 'Communication archived',
  tenant_task_create: 'Task created',
  tenant_task_update: 'Task updated',
  tenant_task_delete: 'Task deleted'
};

function friendlyEventTitle(event: TimelineEvent): string {
  const raw = event.title || '';
  const normalized = raw.trim().toLowerCase();
  const mapped = eventTitleMap[normalized] || eventTitleMap[normalized.replace(/\./g, '_')];
  if (mapped) return mapped;
  return raw
    .replace(/^tenant[._-]/i, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function relativeTime(value?: string | null): string {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const diffSeconds = Math.round((Date.now() - time) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1]
  ];
  const [unit, seconds] = units.find(([, size]) => absSeconds >= size) || ['second', 1];
  const valueInUnit = Math.round(diffSeconds / seconds) * -1;
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(valueInUnit, unit);
}

function eventSearchText(event: TimelineEvent): string {
  return [
    event.title,
    friendlyEventTitle(event),
    event.details,
    event.source,
    readableSource(event.source),
    event.tenant_name,
    event.status,
    event.severity,
    event.actor_email,
    ...importantMetadata(event.metadata)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const sourceOptions = [
  { value: '', label: 'All sources' },
  { value: 'audit', label: 'Audit' },
  { value: 'support_session', label: 'Support sessions' },
  { value: 'incident', label: 'Incidents' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'tenant_task', label: 'Tenant tasks' },
  { value: 'tenant_communication', label: 'Tenant communications' },
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
  const keys = ['ticket_reference', 'access_level', 'starts_at', 'ends_at', 'due_at', 'completed_at', 'retain_until', 'scheduled_for', 'impact', 'channel', 'direction', 'contact_name', 'contact_email', 'follow_up_due_at', 'amount_cents', 'currency', 'external_reference'];
  return keys
    .filter((key) => metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '')
    .map((key) => `${key.replace(/_/g, ' ')}: ${String(metadata[key])}`);
}

export default function PlatformTenantTimelinePage() {
  const [tenantId, setTenantId] = useState('');
  const [days, setDays] = useState('90');
  const [limit, setLimit] = useState('150');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');

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
  const selectedTenant = (tenants.data || []).find((tenant) => tenant.id === tenantId);
  const selectedSourceLabel = sourceOptions.find((option) => option.value === source)?.label || 'All sources';
  const backendFilterText = [
    selectedTenant ? `Tenant: ${selectedTenant.name}` : 'Tenant: All tenants',
    `Source: ${selectedSourceLabel}`,
    `Days: ${timeline.data?.days ?? (days || '90')}`,
    `Limit: ${timeline.data?.limit ?? (limit || '150')}`
  ].join(' · ');
  const sourceTotal = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  const visibleEvents = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return events;
    return events.filter((event) => eventSearchText(event).includes(searchTerm));
  }, [events, search]);

  return (
    <div style={styles.page}>
      <header>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Tenant timeline</h1>
            <p style={styles.muted}>
              A combined operational history for tenant activity across audit logs, support sessions, incidents, maintenance, tasks, billing, retention, and offboarding.
            </p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => void timeline.refetch()} disabled={timeline.isFetching}>
            {timeline.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <section style={styles.metadataPanel} aria-label="Timeline source metadata">
        <strong>Snapshot metadata</strong>
        <span>Endpoint: GET /platform/tenant-timeline</span>
        <span>{backendFilterText}</span>
        <span>Returned events: {events.length} · Visible after search: {visibleEvents.length} · Source-count total: {sourceTotal}</span>
        <span>Search is local to the returned backend result set.</span>
      </section>

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
          <input style={styles.input} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search timeline" />
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

      {tenants.error ? (
        <div style={styles.errorAction}>
          <span>{tenants.error instanceof Error ? tenants.error.message : 'Failed to load tenants'}</span>
          <button type="button" style={styles.retryButton} onClick={() => void tenants.refetch()} disabled={tenants.isFetching}>Retry tenants</button>
        </div>
      ) : null}

      {timeline.error ? (
        <div style={styles.errorAction}>
          <span>{timeline.error instanceof Error ? timeline.error.message : 'Failed to load timeline'}</span>
          <button type="button" style={styles.retryButton} onClick={() => void timeline.refetch()} disabled={timeline.isFetching}>Retry timeline</button>
        </div>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Events</h2>
        <p style={styles.muted}>{backendFilterText} · Search: {search.trim() || 'none'}</p>
        {visibleEvents.length === 0 && !timeline.isFetching ? <p style={styles.muted}>No timeline events found for the selected filters.</p> : null}
        <div style={styles.eventList}>
          {visibleEvents.map((event) => {
            const metadata = importantMetadata(event.metadata);
            const visual = sourceVisuals[event.source] || { icon: '•', accent: '#64748b', label: readableSource(event.source) };
            const displayTitle = friendlyEventTitle(event);
            const relative = relativeTime(event.happened_at);
            return (
              <article key={event.id} style={{ ...styles.eventCard, borderLeftColor: visual.accent }}>
                <div style={styles.eventHeader}>
                  <div style={styles.eventTitleWrap}>
                    <span style={styles.eventIcon} aria-hidden="true">{visual.icon}</span>
                    <div>
                      <div style={styles.eventTitle}>{displayTitle}</div>
                      <div style={styles.muted}>{event.tenant_name} · {visual.label} · {formatDate(event.happened_at)}{relative ? ` · ${relative}` : ''}</div>
                      {displayTitle !== event.title ? <div style={styles.rawEventKey}>{event.title}</div> : null}
                    </div>
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
  headerRow: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 28 },
  muted: { color: '#6b7280', margin: '4px 0' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)' },
  sectionTitle: { marginTop: 0 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'center' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff' },
  button: { padding: '10px 14px', borderRadius: 10, border: 0, background: '#111827', color: '#fff', cursor: 'pointer' },
  secondaryButton: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#111827', cursor: 'pointer' },
  retryButton: { padding: '8px 12px', borderRadius: 10, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', cursor: 'pointer' },
  metadataPanel: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, color: '#475569', fontSize: 13 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  summaryCard: { background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)', display: 'grid', gap: 4 },
  summaryLabel: { color: '#6b7280', fontSize: 13 },
  error: { padding: 14, borderRadius: 12, background: '#fef2f2', color: '#991b1b' },
  errorAction: { padding: 14, borderRadius: 12, background: '#fef2f2', color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  eventList: { display: 'grid', gap: 12 },
  eventCard: { border: '1px solid #e5e7eb', borderLeft: '5px solid #64748b', borderRadius: 14, padding: 14, background: '#fff' },
  eventHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  eventTitleWrap: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  eventIcon: { width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: '#f8fafc', fontSize: 16, flex: '0 0 auto' },
  eventTitle: { fontWeight: 800, fontSize: 16 },
  rawEventKey: { marginTop: 3, color: '#94a3b8', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  details: { margin: '10px 0', color: '#374151' },
  metaLine: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  badgeGroup: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  badge: { fontSize: 12, padding: '4px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3' },
  badgeStrong: { fontSize: 12, padding: '4px 8px', borderRadius: 999, background: '#fff7ed', color: '#9a3412' }
};
