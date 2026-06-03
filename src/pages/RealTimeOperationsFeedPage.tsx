import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type EventUrgency = 'critical' | 'high' | 'medium' | 'low';

type EventDomain =
  | 'inventory'
  | 'procurement'
  | 'reservation'
  | 'execution'
  | 'optimization'
  | 'control_tower'
  | 'financial'
  | 'integration'
  | 'audit'
  | 'multi_domain';

type TimelineItem = {
  timeline_item_id: string;
  timeline_domain?: string;
  timeline_type?: string;
  event_type?: string;
  event_status?: string;
  urgency?: EventUrgency | string;
  priority_score?: number;
  title?: string;
  summary?: string | null;
  correlation_id?: string | null;
  source_surface?: string | null;
  recommended_next_step?: string | null;
  payload_material_present?: boolean;
  payload_material_redacted?: boolean;
  observed_at?: string | null;
  updated_at?: string | null;
};

type RealTimeOperationsFeedResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    source_foundations?: string[];
    supported_event_domains?: string[];
    realtime_capabilities?: string[];
    safety_contract?: Record<string, boolean>;
  };
  filters?: {
    event_domain?: string | null;
    urgency?: string | null;
    limit?: number;
  };
  summary?: {
    total_timeline_items?: number;
    critical_events?: number;
    blocked_or_failed_events?: number;
    by_domain?: Record<string, number>;
    by_type?: Record<string, number>;
    by_urgency?: Record<string, number>;
  };
  guidance?: {
    next_timeline_item_id?: string | null;
    next_event_title?: string | null;
    next_event_domain?: string | null;
    next_event_urgency?: string | null;
    coordination_guidance?: string;
    incident_timeline_guidance?: string;
    disruption_guidance?: string;
    safety_contract?: Record<string, boolean>;
  };
  timeline?: TimelineItem[];
  source_event_bus_governance?: Record<string, unknown>;
  source_action_center_summary?: Record<string, unknown>;
  source_workspace_summary?: Record<string, unknown>;
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const EVENT_DOMAIN_FILTERS: Array<{ value: 'all' | EventDomain; label: string }> = [
  { value: 'all', label: 'All domains' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'execution', label: 'Execution' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'financial', label: 'Financial' },
  { value: 'integration', label: 'Integration' },
  { value: 'audit', label: 'Audit' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | EventUrgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
};

const timelineStyle: CSSProperties = {
  display: 'grid',
  gap: 12
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 16
};

const selectStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '10px 12px',
  background: 'white',
  minWidth: 180
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  borderRadius: 999,
  padding: '4px 9px',
  background: '#f3f4f6',
  color: '#374151',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'capitalize'
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not reported';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sourceSurfaceToAppPath(sourceSurface?: string | null): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) {
    return null;
  }

  const tenantRoutes = new Set([
    '/action-center',
    '/workspace',
    '/mobile-execution',
    '/execution-tasks',
    '/execution-requests',
    '/alerts',
    '/insights',
    '/inventory-reservations',
    '/inventory-requisitions',
    '/procurement-recommendations',
    '/shipments',
    '/stock-transfers',
    '/reports'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

async function fetchRealTimeOperationsFeed(
  eventDomain: 'all' | EventDomain,
  urgency: 'all' | EventUrgency
): Promise<RealTimeOperationsFeedResponse> {
  const params = new URLSearchParams({ limit: '75' });

  if (eventDomain !== 'all') {
    params.set('event_domain', eventDomain);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  return apiRequest<RealTimeOperationsFeedResponse>(`/operational-action-center/realtime-event-coordination-summary?${params.toString()}`);
}

export default function RealTimeOperationsFeedPage() {
  const [eventDomain, setEventDomain] = useState<'all' | EventDomain>('all');
  const [urgency, setUrgency] = useState<'all' | EventUrgency>('all');

  const feedQuery = useQuery({
    queryKey: ['real-time-operations-feed', eventDomain, urgency],
    queryFn: () => fetchRealTimeOperationsFeed(eventDomain, urgency)
  });

  const response = feedQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const timeline = response?.timeline || [];
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  return (
    <div>
      <div className="card-grid" style={gridStyle}>
        <div className="card">
          <div className="card__label">Timeline items</div>
          <div className="card__value">{numberValue(summary.total_timeline_items ?? timeline.length)}</div>
          <div className="card__subtext">Correlated event-bus messages and action-center items.</div>
        </div>
        <div className="card">
          <div className="card__label">Critical events</div>
          <div className="card__value">{numberValue(summary.critical_events)}</div>
          <div className="card__subtext">Items elevated for human coordination review.</div>
        </div>
        <div className="card">
          <div className="card__label">Blocked / failed</div>
          <div className="card__value">{numberValue(summary.blocked_or_failed_events)}</div>
          <div className="card__subtext">Disruptions from the backend coordination feed.</div>
        </div>
        <div className="card">
          <div className="card__label">Execution mode</div>
          <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(response?.definition?.execution_mode)}</div>
          <div className="card__subtext">Read-only event coordination; no replay or publishing action is exposed.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Real-time operations controls</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select style={selectStyle} value={eventDomain} onChange={(event) => setEventDomain(event.target.value as 'all' | EventDomain)}>
              {EVENT_DOMAIN_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | EventUrgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => feedQuery.refetch()} disabled={feedQuery.isFetching}>
              {feedQuery.isFetching ? 'Refreshing…' : 'Refresh feed'}
            </button>
            <Link className="button button--secondary" to="/action-center">Open action center</Link>
            <Link className="button button--secondary" to="/workspace">Open workspace</Link>
          </div>

          {feedQuery.isLoading ? (
            <p className="card__subtext">Loading real-time operations feed…</p>
          ) : feedQuery.error ? (
            <p className="form-error">
              {feedQuery.error instanceof ApiError
                ? feedQuery.error.message
                : 'Unable to load the real-time operations feed.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ ...badgeStyle, width: 'fit-content' }}>
                {response?.non_mutation_guarantee ? 'Read-only coordination snapshot' : 'Coordination safety unknown'}
              </div>
              <p className="card__subtext">{guidance.coordination_guidance || 'Coordinate follow-up through source workflows only.'}</p>
              <p className="card__subtext">{guidance.incident_timeline_guidance || 'Timeline entries avoid storing payload material in this surface.'}</p>
              <p className="card__subtext">{guidance.disruption_guidance || 'Blocked or failed events remain advisory until handled through governed workflows.'}</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Operational event timeline</div>
        {feedQuery.isLoading ? null : timeline.length === 0 ? (
          <div className="card">
            <p className="card__subtext">No event coordination items matched the selected filters.</p>
          </div>
        ) : (
          <div style={timelineStyle}>
            {timeline.map((item) => {
              const sourcePath = sourceSurfaceToAppPath(item.source_surface);
              return (
                <article className="card" key={item.timeline_item_id} style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <div className="card__label">{formatLabel(item.timeline_domain)} · {formatLabel(item.timeline_type)}</div>
                      <h3 style={{ margin: '4px 0 0' }}>{item.title || item.event_type || 'Untitled event'}</h3>
                    </div>
                    <span style={badgeStyle}>{formatLabel(item.urgency)}</span>
                  </div>

                  <p className="card__subtext">{item.summary || 'No event summary was provided.'}</p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={badgeStyle}>Status {formatLabel(item.event_status)}</span>
                    {item.correlation_id ? <span style={badgeStyle}>Correlation {item.correlation_id}</span> : null}
                    {item.payload_material_redacted ? <span style={badgeStyle}>Payload redacted</span> : null}
                    {item.payload_material_present ? <span style={badgeStyle}>Payload material present</span> : null}
                  </div>

                  <div>
                    <div className="card__label">Recommended coordination</div>
                    <p className="card__subtext">{item.recommended_next_step || 'Monitor this item and use the source workflow for any follow-up.'}</p>
                  </div>

                  <div>
                    <div className="card__label">Observed</div>
                    <p className="card__subtext">{formatDateTime(item.observed_at || item.updated_at)}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {sourcePath ? <Link className="button" to={sourcePath}>Open source workflow</Link> : null}
                    <Link className="button button--secondary" to="/action-center">Review related actions</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__title">Event coordination guardrails</div>
        <div className="card-grid" style={gridStyle}>
          {safetyEntries.length === 0 ? (
            <div className="card">
              <p className="card__subtext">Safety contract details were not returned by the backend.</p>
            </div>
          ) : safetyEntries.map(([key]) => (
            <div className="card" key={key}>
              <div className="card__label">Enabled guardrail</div>
              <div style={{ fontWeight: 800, textTransform: 'capitalize' }}>{formatLabel(key)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
