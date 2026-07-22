import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import './RealTimeOperationsFeedPage.css';

type EventUrgency = 'critical' | 'high' | 'medium' | 'low';

type EventDomain =
  | 'alerts'
  | 'inventory'
  | 'procurement'
  | 'reservation'
  | 'execution'
  | 'optimization'
  | 'control_tower'
  | 'decision_intelligence'
  | 'ai_governance'
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
  source_reference?: {
    source_type?: string | null;
    source_id?: string | null;
  };
  source_surface?: string | null;
  recommended_next_step?: string | null;
  payload_material_present?: boolean;
  payload_material_redacted?: boolean;
  delivery_attempt_count?: number | null;
  delivery_target?: string | null;
  next_retry_at?: string | null;
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
  access?: {
    can_read_event_bus?: boolean;
    can_read_alerts?: boolean;
    can_read_execution_tasks?: boolean;
    can_read_control_tower?: boolean;
    can_read_decision_intelligence?: boolean;
    can_view_diagnostics?: boolean;
    available_event_domains?: string[];
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
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const EVENT_DOMAIN_FILTERS: Array<{ value: 'all' | EventDomain; label: string }> = [
  { value: 'all', label: 'All work areas' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'inventory', label: 'Inventory events' },
  { value: 'procurement', label: 'Procurement events' },
  { value: 'reservation', label: 'Reservation events' },
  { value: 'execution', label: 'Execution tasks' },
  { value: 'optimization', label: 'Optimisation events' },
  { value: 'control_tower', label: 'Control Tower' },
  { value: 'decision_intelligence', label: 'Decision Intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'financial', label: 'Financial events' },
  { value: 'integration', label: 'Integration events' },
  { value: 'audit', label: 'Audit events' },
  { value: 'multi_domain', label: 'All cross-area items' }
];

const EVENT_STREAM_DOMAINS = new Set<EventDomain>([
  'inventory',
  'procurement',
  'reservation',
  'execution',
  'optimization',
  'control_tower',
  'financial',
  'integration',
  'audit'
]);

const URGENCY_FILTERS: Array<{ value: 'all' | EventUrgency; label: string }> = [
  { value: 'all', label: 'All urgency levels' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const USER_SAFETY_LABELS: Record<string, { title: string; description: string }> = {
  read_only: {
    title: 'Nothing is changed here',
    description: 'Reading or refreshing the feed does not update tasks, alerts, stock, or integrations.'
  },
  tenant_isolated: {
    title: 'Only your company’s items',
    description: 'The backend collects information only for the company currently signed in.'
  },
  permission_gated: {
    title: 'Role and permission controlled',
    description: 'The feed includes only source areas the current user is allowed to read.'
  },
  human_action_only: {
    title: 'A person handles follow-up',
    description: 'The user opens the source page and completes the real work there.'
  },
  approval_gated_when_required: {
    title: 'Approvals still apply',
    description: 'The feed cannot bypass an approval or governance requirement.'
  }
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  const text = String(value || 'unknown').replace(/_/g, ' ').trim().toLowerCase();
  return text.replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function itemTitle(item: TimelineItem): string {
  const value = String(item.title || item.event_type || 'Untitled item').trim();
  if (value.includes('_') || value === value.toUpperCase()) return formatLabel(value);
  return value;
}

function itemSourceLabel(item: TimelineItem): string {
  const domain = formatLabel(item.timeline_domain);
  if (item.timeline_type === 'event_delivery_disruption') return `${domain} delivery problem`;
  if (item.timeline_type === 'event_stream_message') return `${domain} integration event`;
  return `${domain} work item`;
}

function urgencyClass(value?: string | null): string {
  if (value === 'critical') return 'operations-feed-page__badge operations-feed-page__badge--critical';
  if (value === 'high') return 'operations-feed-page__badge operations-feed-page__badge--high';
  if (value === 'medium') return 'operations-feed-page__badge operations-feed-page__badge--medium';
  return 'operations-feed-page__badge operations-feed-page__badge--low';
}

function statusClass(value?: string | null): string {
  if (value === 'blocked' || value === 'failed') return 'operations-feed-page__badge operations-feed-page__badge--critical';
  if (value === 'in_progress' || value === 'acknowledged' || value === 'retrying') {
    return 'operations-feed-page__badge operations-feed-page__badge--high';
  }
  return 'operations-feed-page__badge operations-feed-page__badge--neutral';
}

function sourceSurfaceToAppPath(sourceSurface?: string | null): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) return null;

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

type FeedLink = { to: string; label: string };

function sourceItemLink(item: TimelineItem): FeedLink | null {
  if (item.timeline_type === 'action_center_item') {
    const sourceId = item.source_reference?.source_id;

    if (item.timeline_domain === 'alerts') {
      const params = new URLSearchParams({ resolved: 'false' });
      const search = String(item.summary || item.title || '').trim();
      if (search) params.set('search', search);
      return { to: `/alerts?${params.toString()}`, label: 'Open alert' };
    }

    if (item.timeline_domain === 'execution' && sourceId) {
      return { to: `/execution-tasks?${new URLSearchParams({ task_id: sourceId }).toString()}`, label: 'Open execution task' };
    }

    if (['decision_intelligence', 'ai_governance'].includes(String(item.timeline_domain)) && item.correlation_id) {
      return {
        to: `/ai-review?${new URLSearchParams({ source_action_id: item.correlation_id }).toString()}`,
        label: 'Open review'
      };
    }
  }

  const sourcePath = sourceSurfaceToAppPath(item.source_surface);
  return sourcePath ? { to: sourcePath, label: 'Open source page' } : null;
}

function relatedActionLink(item: TimelineItem): string | null {
  if (item.timeline_type !== 'action_center_item' || !item.correlation_id) return null;
  return `/action-center?${new URLSearchParams({ source_action_id: item.correlation_id }).toString()}`;
}

function localAvailableDomains(): EventDomain[] {
  const available = new Set<EventDomain>();

  if (hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_READ)) {
    EVENT_STREAM_DOMAINS.forEach((domain) => available.add(domain));
  }
  if (hasPermission(TENANT_PERMISSIONS.ALERTS_READ)) available.add('alerts');
  if (hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)) available.add('execution');
  if (hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ)) available.add('control_tower');
  if (hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)) {
    available.add('decision_intelligence');
    available.add('ai_governance');
  }
  if (available.size > 0) available.add('multi_domain');

  return EVENT_DOMAIN_FILTERS
    .map((option) => option.value)
    .filter((value): value is EventDomain => value !== 'all' && available.has(value));
}

async function fetchOperationsFeed(
  eventDomain: 'all' | EventDomain,
  urgency: 'all' | EventUrgency
): Promise<RealTimeOperationsFeedResponse> {
  const params = new URLSearchParams({ limit: '75' });
  if (eventDomain !== 'all') params.set('event_domain', eventDomain);
  if (urgency !== 'all') params.set('urgency', urgency);
  return apiRequest<RealTimeOperationsFeedResponse>(`/operational-action-center/realtime-event-coordination-summary?${params.toString()}`);
}

export default function RealTimeOperationsFeedPage() {
  const [eventDomain, setEventDomain] = useState<'all' | EventDomain>('all');
  const [urgency, setUrgency] = useState<'all' | EventUrgency>('all');
  const locallyAvailableDomains = useMemo(localAvailableDomains, []);
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);

  const feedQuery = useQuery({
    queryKey: ['real-time-operations-feed', eventDomain, urgency],
    queryFn: () => fetchOperationsFeed(eventDomain, urgency),
    refetchOnReconnect: true,
    refetchOnWindowFocus: true
  });

  const response = feedQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const timeline = response?.timeline || [];
  const backendAvailableDomains = response?.access?.available_event_domains;
  const availableDomains = useMemo(() => {
    const source = Array.isArray(backendAvailableDomains) ? backendAvailableDomains : locallyAvailableDomains;
    return new Set(source);
  }, [backendAvailableDomains, locallyAvailableDomains]);
  const availableDomainFilters = useMemo(() => {
    return EVENT_DOMAIN_FILTERS.filter((option) => option.value === 'all' || availableDomains.has(option.value));
  }, [availableDomains]);
  const safetyEntries = useMemo(() => {
    const contract = response?.definition?.safety_contract || {};
    return Object.entries(USER_SAFETY_LABELS)
      .filter(([key]) => contract[key] === true)
      .map(([key, content]) => ({ key, ...content }));
  }, [response?.definition?.safety_contract]);
  const technicalSafetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  useEffect(() => {
    if (eventDomain !== 'all' && !availableDomains.has(eventDomain)) setEventDomain('all');
  }, [availableDomains, eventDomain]);

  return (
    <div className="operations-feed-page">
      <div className="operations-feed-page__summary-grid">
        <div className="card operations-feed-page__card">
          <div className="card__label">Items shown</div>
          <div className="card__value">{numberValue(summary.total_timeline_items ?? timeline.length)}</div>
          <div className="card__subtext">Open work, permitted integration events, and current delivery problems matching the filters.</div>
        </div>
        <div className="card operations-feed-page__card">
          <div className="card__label">Critical items</div>
          <div className="card__value">{numberValue(summary.critical_events)}</div>
          <div className="card__subtext">Items that need the fastest human review.</div>
        </div>
        <div className="card operations-feed-page__card">
          <div className="card__label">Blocked or failed</div>
          <div className="card__value">{numberValue(summary.blocked_or_failed_events)}</div>
          <div className="card__subtext">Work or integration events reporting a disruption.</div>
        </div>
        <div className="card operations-feed-page__card">
          <div className="card__label">Page mode</div>
          <div className="card__value operations-feed-page__mode-value">Guidance only</div>
          <div className="card__subtext">Use the source page to perform the real follow-up.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Operations feed controls</div>
        <div className="card operations-feed-page__controls-card">
          <div className="operations-feed-page__toolbar">
            <label className="operations-feed-page__field">
              <span>Work area</span>
              <select
                className="operations-feed-page__select"
                value={eventDomain}
                onChange={(event) => setEventDomain(event.target.value as 'all' | EventDomain)}
              >
                {availableDomainFilters.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="operations-feed-page__field">
              <span>Urgency</span>
              <select
                className="operations-feed-page__select"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as 'all' | EventUrgency)}
              >
                {URGENCY_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button className="button button--secondary operations-feed-page__toolbar-action" type="button" onClick={() => feedQuery.refetch()} disabled={feedQuery.isFetching}>
              {feedQuery.isFetching ? 'Refreshing…' : 'Refresh feed'}
            </button>
            <Link className="button button--secondary operations-feed-page__toolbar-action" to="/action-center">Open Action Center</Link>
            <Link className="button button--secondary operations-feed-page__toolbar-action" to="/workspace">Open Workspace</Link>
          </div>

          {feedQuery.isLoading ? (
            <div className="operations-feed-page__state" role="status">
              <div className="operations-feed-page__state-title">Loading the latest operations feed</div>
              <p className="card__subtext">Collecting work and events permitted for the current role.</p>
            </div>
          ) : feedQuery.error ? (
            <div className="operations-feed-page__state" role="alert">
              <div className="operations-feed-page__state-title">The operations feed could not be loaded</div>
              <p className="form-error">
                {feedQuery.error instanceof ApiError ? feedQuery.error.message : 'Unable to load the operations feed.'}
              </p>
              <button className="button button--secondary" type="button" onClick={() => feedQuery.refetch()}>Try again</button>
            </div>
          ) : (
            <div className="operations-feed-page__guidance-grid">
              <div className="operations-feed-page__guidance-item">
                <div className="operations-feed-page__guidance-title">Safe to review without editing</div>
                <p className="card__subtext">This page does not replay events, publish messages, or update operational records.</p>
              </div>
              <div className="operations-feed-page__guidance-item">
                <div className="operations-feed-page__guidance-title">How to follow up</div>
                <p className="card__subtext">{guidance.coordination_guidance || 'Open the source page for the item and complete the work there.'}</p>
              </div>
              <div className="operations-feed-page__guidance-item">
                <div className="operations-feed-page__guidance-title">What the feed contains</div>
                <p className="card__subtext">{guidance.incident_timeline_guidance || 'The feed combines permitted work items and integration event summaries.'}</p>
              </div>
              <div className="operations-feed-page__guidance-item">
                <div className="operations-feed-page__guidance-title">When something is blocked or failed</div>
                <p className="card__subtext">{guidance.disruption_guidance || 'Review the source workflow and coordinate a human response.'}</p>
              </div>
            </div>
          )}

          {response?.generated_at ? (
            <p className="card__subtext operations-feed-page__updated">
              Feed updated {formatDateTime(response.generated_at)}. Press Refresh feed whenever you need the latest snapshot.
            </p>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Operational coordination feed</div>
        {feedQuery.isLoading || feedQuery.error ? null : timeline.length === 0 ? (
          <div className="card operations-feed-page__state">
            <div className="operations-feed-page__state-title">No matching items</div>
            <p className="card__subtext">No work or integration event matched the selected work area and urgency.</p>
          </div>
        ) : (
          <div className="operations-feed-page__timeline">
            {timeline.map((item) => {
              const sourceLink = sourceItemLink(item);
              const actionCenterPath = relatedActionLink(item);
              return (
                <article className="card operations-feed-page__timeline-card" key={item.timeline_item_id}>
                  <div className="operations-feed-page__item-header">
                    <div className="operations-feed-page__item-heading">
                      <div className="card__label">{itemSourceLabel(item)}</div>
                      <h3 className="operations-feed-page__item-title">{itemTitle(item)}</h3>
                    </div>
                    <span className={urgencyClass(item.urgency)}>{formatLabel(item.urgency)}</span>
                  </div>

                  <p className="card__subtext operations-feed-page__item-summary">{item.summary || 'No summary was provided.'}</p>

                  <div className="operations-feed-page__badge-row">
                    <span className={statusClass(item.event_status)}>Status: {formatLabel(item.event_status)}</span>
                    <span className="operations-feed-page__badge operations-feed-page__badge--neutral">
                      Observed {formatDateTime(item.observed_at || item.updated_at)}
                    </span>
                    {item.timeline_type === 'event_delivery_disruption' && item.delivery_attempt_count != null && Number.isFinite(Number(item.delivery_attempt_count)) ? (
                      <span className="operations-feed-page__badge operations-feed-page__badge--neutral">
                        Attempts: {numberValue(item.delivery_attempt_count)}
                      </span>
                    ) : null}
                    {item.timeline_type === 'event_delivery_disruption' && item.next_retry_at ? (
                      <span className="operations-feed-page__badge operations-feed-page__badge--neutral">
                        Next planned retry: {formatDateTime(item.next_retry_at)}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <div className="card__label">Recommended next step</div>
                    <p className="card__subtext operations-feed-page__item-summary">
                      {item.recommended_next_step || 'Open the source page and review the item there.'}
                    </p>
                  </div>

                  {canViewDiagnostics ? (
                    <details className="operations-feed-page__details">
                      <summary>Technical event details</summary>
                      <dl className="operations-feed-page__details-grid">
                        <dt>Timeline item</dt><dd>{item.timeline_item_id}</dd>
                        <dt>Correlation</dt><dd>{item.correlation_id || 'Not reported'}</dd>
                        <dt>Priority score</dt><dd>{numberValue(item.priority_score)}</dd>
                        <dt>Source type</dt><dd>{item.source_reference?.source_type || 'Not reported'}</dd>
                        <dt>Source record</dt><dd>{item.source_reference?.source_id || 'Not reported'}</dd>
                        <dt>Payload information</dt><dd>{item.payload_material_redacted ? 'Not included in this feed' : item.payload_material_present ? 'Reported as present' : 'Not reported'}</dd>
                      </dl>
                    </details>
                  ) : null}

                  {['event_stream_message', 'event_delivery_disruption'].includes(String(item.timeline_type)) && !sourceLink ? (
                    <p className="card__subtext operations-feed-page__item-summary">
                      This integration item does not currently have a tenant working page. Use it for awareness and ask an administrator or support team to investigate when it is blocked or failed.
                    </p>
                  ) : null}

                  <div className="operations-feed-page__actions">
                    {sourceLink ? <Link className="button" to={sourceLink.to}>{sourceLink.label}</Link> : null}
                    {actionCenterPath ? <Link className="button button--secondary" to={actionCenterPath}>Open in Action Center</Link> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__title">Why this feed is safe to use</div>
        <div className="operations-feed-page__safety-grid">
          {safetyEntries.length === 0 ? (
            <div className="card operations-feed-page__card">
              <p className="card__subtext">Safety information was not returned by the backend.</p>
            </div>
          ) : safetyEntries.map((entry) => (
            <div className="card operations-feed-page__safety-card" key={entry.key}>
              <div className="operations-feed-page__safety-title">{entry.title}</div>
              <p className="card__subtext">{entry.description}</p>
            </div>
          ))}
        </div>

        {canViewDiagnostics && technicalSafetyEntries.length > 0 ? (
          <details className="operations-feed-page__technical-safety">
            <summary>Technical safety details</summary>
            <div className="operations-feed-page__technical-safety-grid">
              {technicalSafetyEntries.map(([key]) => (
                <span className="operations-feed-page__badge operations-feed-page__badge--neutral" key={key}>{formatLabel(key)}</span>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
