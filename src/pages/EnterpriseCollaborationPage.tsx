import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import './EnterpriseCollaborationPage.css';

type CollaborationView = 'recommendations' | 'limits' | 'diagnostics';

type CollaborationDomain =
  | 'alerts'
  | 'execution'
  | 'control_tower'
  | 'decision_intelligence'
  | 'ai_governance'
  | 'workflow'
  | 'event_coordination'
  | 'multi_domain';

type CollaborationThreadType =
  | 'triage_thread'
  | 'approval_thread'
  | 'incident_thread'
  | 'supplier_coordination_thread'
  | 'task_coordination_thread'
  | 'governance_review_thread';

type Urgency = 'critical' | 'high' | 'medium' | 'low';
type ResultLimit = '25' | '50' | '75' | '100';

type CollaborationThread = {
  thread_key?: string;
  thread_id?: string;
  collaboration_domain?: string;
  thread_type?: string;
  urgency?: string;
  title?: string;
  summary?: string | null;
  participants_hint?: {
    suggested_roles?: string[];
  };
  coordination_context?: {
    source_surface?: string | null;
    recommended_next_step?: string | null;
    escalation_recommended?: boolean;
  };
  comment_guidance?: {
    comment_capture_surface?: string | null;
    recommended_comment_topics?: string[];
  };
  war_room_guidance?: {
    war_room_candidate?: boolean;
    suggested_cadence?: string | null;
  };
  created_at?: string | null;
  updated_at?: string | null;
};

type CollaborationResponse = {
  definition?: {
    execution_mode?: string;
    [key: string]: unknown;
  };
  access?: {
    can_view_diagnostics?: boolean;
  };
  filters?: {
    collaboration_domain?: string | null;
    thread_type?: string | null;
    urgency?: string | null;
    limit?: number;
  };
  summary?: {
    total_threads?: number;
    war_room_candidates?: number;
    escalation_recommended?: number;
    by_domain?: Record<string, number>;
    by_thread_type?: Record<string, number>;
    by_urgency?: Record<string, number>;
  };
  guidance?: {
    collaboration_guidance?: string;
    escalation_thread_guidance?: string;
    incident_war_room_guidance?: string;
    supplier_coordination_guidance?: string;
    [key: string]: unknown;
  };
  threads?: CollaborationThread[];
  non_mutation_guarantee?: boolean;
  generated_at?: string;
  [key: string]: unknown;
};

const DOMAIN_FILTERS: Array<{ value: 'all' | CollaborationDomain; label: string }> = [
  { value: 'all', label: 'All coordination areas' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'execution', label: 'Execution tasks' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'event_coordination', label: 'Operational events' },
  { value: 'multi_domain', label: 'All areas together' }
];

const THREAD_FILTERS: Array<{ value: 'all' | CollaborationThreadType; label: string }> = [
  { value: 'all', label: 'All recommendation types' },
  { value: 'triage_thread', label: 'Triage guidance' },
  { value: 'approval_thread', label: 'Approval review' },
  { value: 'incident_thread', label: 'Incident coordination' },
  { value: 'task_coordination_thread', label: 'Task coordination' },
  { value: 'governance_review_thread', label: 'Governance review' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | Urgency; label: string }> = [
  { value: 'all', label: 'All urgency levels' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const LIMIT_FILTERS: Array<{ value: ResultLimit; label: string }> = [
  { value: '25', label: '25 recommendations' },
  { value: '50', label: '50 recommendations' },
  { value: '75', label: '75 recommendations' },
  { value: '100', label: '100 recommendations' }
];

const DEFAULT_FILTERS = {
  collaborationDomain: 'all' as 'all' | CollaborationDomain,
  threadType: 'all' as 'all' | CollaborationThreadType,
  urgency: 'all' as 'all' | Urgency,
  limit: '50' as ResultLimit
};

const ROLE_LABELS: Record<string, string> = {
  source_owner: 'Source record owner',
  governance_reviewer: 'Governance reviewer',
  operations_manager: 'Operations manager',
  operator: 'Operator',
  shift_lead: 'Shift lead',
  integration_owner: 'Integration owner'
};

const CADENCE_LABELS: Record<string, string> = {
  active_coordination_until_resolved: 'Active coordination until resolved',
  as_needed_status_review: 'Review when the status changes',
  monitor_and_review: 'Monitor and review'
};

const THREAD_TYPE_LABELS: Record<string, string> = {
  triage_thread: 'Triage guidance',
  approval_thread: 'Approval review',
  incident_thread: 'Incident coordination',
  supplier_coordination_thread: 'Supplier coordination',
  task_coordination_thread: 'Task coordination',
  governance_review_thread: 'Governance review'
};

const DOMAIN_LABELS: Record<string, string> = {
  alerts: 'Alerts',
  execution: 'Execution',
  control_tower: 'Control tower',
  decision_intelligence: 'Decision intelligence',
  ai_governance: 'AI governance',
  workflow: 'Workflow',
  event_coordination: 'Operational events',
  multi_domain: 'Multiple areas'
};

const TOPIC_LABELS: Record<string, string> = {
  current_status: 'Current status',
  owner_assignment: 'Owner assignment',
  blockers: 'Blockers',
  manual_resolution_plan: 'Manual resolution plan',
  event_status: 'Event status',
  impact_scope: 'Impact and affected area',
  manual_follow_up_owner: 'Follow-up owner',
  resolution_notes: 'Resolution notes'
};

const SOURCE_LABELS: Record<string, string> = {
  '/action-center': 'Open Action Center',
  '/alerts': 'Open Alerts',
  '/execution-tasks': 'Open Execution Tasks',
  '/real-time-operations-feed': 'Open Operations Feed',
  '/intelligence-review': 'Open Intelligence Review',
  '/ai-copilot': 'Open AI Copilot',
  '/inventory-reservations': 'Open Reservations',
  '/inventory-requisitions': 'Open Requisitions',
  '/procurement-recommendations': 'Open Procurement Recommendations',
  '/shipments': 'Open Shipments',
  '/reports': 'Open Reports'
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatIdentifier(value?: string | null, fallback = 'Not specified'): string {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;
  return normalized
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sourceSurfaceToAppPath(sourceSurface?: string | null): string | null {
  if (!sourceSurface) return null;
  if (sourceSurface === '/operational-action-center/summary' || sourceSurface === '/control-tower') {
    return '/action-center';
  }
  return Object.prototype.hasOwnProperty.call(SOURCE_LABELS, sourceSurface) ? sourceSurface : null;
}

function urgencyLabel(value?: string | null): string {
  return formatIdentifier(value, 'Unspecified urgency');
}

function threadTypeLabel(value?: string | null): string {
  return value ? THREAD_TYPE_LABELS[value] || formatIdentifier(value) : 'Coordination guidance';
}

function domainLabel(value?: string | null): string {
  return value ? DOMAIN_LABELS[value] || formatIdentifier(value) : 'General operations';
}

function roleLabel(value: string): string {
  return ROLE_LABELS[value] || formatIdentifier(value);
}

function topicLabel(value: string): string {
  return TOPIC_LABELS[value] || formatIdentifier(value);
}

function cadenceLabel(value?: string | null): string {
  if (!value) return 'Review when needed';
  return CADENCE_LABELS[value] || formatIdentifier(value);
}

async function fetchEnterpriseCollaborationSummary(filters: typeof DEFAULT_FILTERS): Promise<CollaborationResponse> {
  const params = new URLSearchParams({ limit: filters.limit });
  if (filters.collaborationDomain !== 'all') params.set('collaboration_domain', filters.collaborationDomain);
  if (filters.threadType !== 'all') params.set('thread_type', filters.threadType);
  if (filters.urgency !== 'all') params.set('urgency', filters.urgency);
  return apiRequest<CollaborationResponse>(`/operational-action-center/enterprise-collaboration-summary?${params.toString()}`);
}

export default function EnterpriseCollaborationPage() {
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const canViewIntelligenceReview = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  const [view, setView] = useState<CollaborationView>('recommendations');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const queryKey = useMemo(() => [
    'enterprise-collaboration',
    filters.collaborationDomain,
    filters.threadType,
    filters.urgency,
    filters.limit
  ], [filters]);

  const collaborationQuery = useQuery({
    queryKey,
    queryFn: () => fetchEnterpriseCollaborationSummary(filters)
  });

  const response = collaborationQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const threads = response?.threads || [];
  const appliedLimit = response?.filters?.limit || Number(filters.limit);
  const hasActiveFilters = filters.collaborationDomain !== 'all'
    || filters.threadType !== 'all'
    || filters.urgency !== 'all'
    || filters.limit !== DEFAULT_FILTERS.limit;

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  if (collaborationQuery.isLoading) {
    return <div className="collaboration-state collaboration-state--loading">Loading coordination recommendations…</div>;
  }

  if (collaborationQuery.error) {
    return (
      <div className="collaboration-state collaboration-state--error">
        <h2>Coordination recommendations could not be loaded</h2>
        <p>
          {collaborationQuery.error instanceof ApiError
            ? collaborationQuery.error.message
            : 'The collaboration summary is temporarily unavailable.'}
        </p>
        <button className="button button--secondary" type="button" onClick={() => collaborationQuery.refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="collaboration-page">
      <section className="card collaboration-intro">
        <div>
          <div className="collaboration-eyebrow">Read-only coordination guidance</div>
          <h2>Coordinate work in the source workflow</h2>
          <p className="card__subtext">
            This page turns permitted alerts, tasks, governance reviews, and operational events into suggestions about who should coordinate, what to discuss, and where the real work belongs. It does not create a chat thread, send a message, notify anyone, or record a comment.
          </p>
        </div>
        <div className="collaboration-refresh">
          <span>Last refreshed</span>
          <strong>{formatDateTime(response?.generated_at)}</strong>
          <button className="button button--secondary" type="button" onClick={() => collaborationQuery.refetch()} disabled={collaborationQuery.isFetching}>
            {collaborationQuery.isFetching ? 'Refreshing…' : 'Refresh recommendations'}
          </button>
        </div>
      </section>

      <section className="card collaboration-filters" aria-labelledby="collaboration-filter-title">
        <div className="collaboration-section-heading">
          <div>
            <h2 id="collaboration-filter-title">Filter the recommendations</h2>
            <p className="card__subtext">Filters change only this read-only snapshot. They do not change any alert, task, review, or operational event.</p>
          </div>
          {hasActiveFilters ? <button className="button button--secondary" type="button" onClick={clearFilters}>Clear filters</button> : null}
        </div>
        <div className="collaboration-filter-grid">
          <label>
            <span>Coordination area</span>
            <select value={filters.collaborationDomain} onChange={(event) => setFilters((current) => ({ ...current, collaborationDomain: event.target.value as typeof filters.collaborationDomain }))}>
              {DOMAIN_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Recommendation type</span>
            <select value={filters.threadType} onChange={(event) => setFilters((current) => ({ ...current, threadType: event.target.value as typeof filters.threadType }))}>
              {THREAD_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Urgency</span>
            <select value={filters.urgency} onChange={(event) => setFilters((current) => ({ ...current, urgency: event.target.value as typeof filters.urgency }))}>
              {URGENCY_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Maximum recommendations</span>
            <select value={filters.limit} onChange={(event) => setFilters((current) => ({ ...current, limit: event.target.value as ResultLimit }))}>
              {LIMIT_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="collaboration-summary-grid" aria-label="Collaboration summary">
        <article className="card">
          <div className="card__label">Coordination recommendations</div>
          <div className="card__value">{numberValue(summary.total_threads ?? threads.length)}</div>
          <div className="card__subtext">Suggested human coordination items returned by the current filters.</div>
        </article>
        <article className="card">
          <div className="card__label">Active coordination suggested</div>
          <div className="card__value">{numberValue(summary.war_room_candidates)}</div>
          <div className="card__subtext">Critical items that may need sustained human coordination.</div>
        </article>
        <article className="card">
          <div className="card__label">Escalation suggested</div>
          <div className="card__value">{numberValue(summary.escalation_recommended)}</div>
          <div className="card__subtext">Critical or high-urgency items where owner or escalation review is recommended.</div>
        </article>
        <article className="card">
          <div className="card__label">Operating mode</div>
          <div className="collaboration-mode">Read-only guidance</div>
          <div className="card__subtext">All actions remain in their source workflows.</div>
        </article>
      </section>

      <div className="collaboration-view-switch" role="tablist" aria-label="Collaboration views">
        <button type="button" role="tab" aria-selected={view === 'recommendations'} className={view === 'recommendations' ? 'is-active' : ''} onClick={() => setView('recommendations')}>Coordination recommendations</button>
        <button type="button" role="tab" aria-selected={view === 'limits'} className={view === 'limits' ? 'is-active' : ''} onClick={() => setView('limits')}>Safety and limits</button>
        {canViewDiagnostics ? (
          <button type="button" role="tab" aria-selected={view === 'diagnostics'} className={view === 'diagnostics' ? 'is-active' : ''} onClick={() => setView('diagnostics')}>Diagnostics</button>
        ) : null}
      </div>

      {view === 'recommendations' ? (
        <section aria-labelledby="coordination-recommendations-title">
          <div className="collaboration-section-heading collaboration-section-heading--outside">
            <div>
              <h2 id="coordination-recommendations-title">Coordination recommendations</h2>
              <p className="card__subtext">
                {guidance.collaboration_guidance || 'Use these suggestions to coordinate people in the appropriate source workflow.'} Showing up to {appliedLimit} items.
              </p>
            </div>
            <div className="collaboration-shortcuts">
              <Link className="button button--secondary" to="/real-time-operations-feed">Open Operations Feed</Link>
              {canViewIntelligenceReview ? <Link className="button button--secondary" to="/intelligence-review">Open Intelligence Review</Link> : null}
            </div>
          </div>

          {threads.length === 0 ? (
            <div className="collaboration-state">
              <h3>No coordination recommendations match the current filters</h3>
              <p>Clear the filters or confirm that an open alert, task, review, or operational event exists for this tenant.</p>
            </div>
          ) : (
            <div className="collaboration-thread-grid">
              {threads.map((thread, index) => {
                const sourcePath = sourceSurfaceToAppPath(thread.coordination_context?.source_surface || thread.comment_guidance?.comment_capture_surface);
                const sourceLabel = sourcePath ? SOURCE_LABELS[sourcePath] : null;
                const itemKey = thread.thread_key || thread.thread_id || `${thread.title || 'coordination'}-${thread.updated_at || index}-${index}`;
                const suggestedRoles = thread.participants_hint?.suggested_roles || [];
                const commentTopics = thread.comment_guidance?.recommended_comment_topics || [];
                return (
                  <article className="card collaboration-thread-card" key={itemKey}>
                    <div className="collaboration-badges">
                      <span className={`collaboration-badge collaboration-badge--${String(thread.urgency || 'unknown').toLowerCase()}`}>{urgencyLabel(thread.urgency)}</span>
                      <span className="collaboration-badge">{threadTypeLabel(thread.thread_type)}</span>
                      <span className="collaboration-badge">{domainLabel(thread.collaboration_domain)}</span>
                      {thread.war_room_guidance?.war_room_candidate ? <span className="collaboration-badge collaboration-badge--attention">Active coordination suggested</span> : null}
                    </div>

                    <h3>{thread.title || 'Coordination item'}</h3>
                    <p className="card__subtext">{thread.summary || 'No additional summary was provided.'}</p>

                    <dl className="collaboration-facts">
                      <div>
                        <dt>Suggested participants</dt>
                        <dd>{suggestedRoles.length ? suggestedRoles.map(roleLabel).join(', ') : 'Source workflow owner and appropriate manager'}</dd>
                      </div>
                      <div>
                        <dt>Review cadence</dt>
                        <dd>{cadenceLabel(thread.war_room_guidance?.suggested_cadence)}</dd>
                      </div>
                      <div>
                        <dt>Last updated</dt>
                        <dd>{formatDateTime(thread.updated_at || thread.created_at)}</dd>
                      </div>
                    </dl>

                    <div className="collaboration-guidance-block">
                      <div className="card__label">Recommended next step</div>
                      <p>{thread.coordination_context?.recommended_next_step || 'Confirm the owner, current status, blockers, and next safe action in the source workflow.'}</p>
                    </div>

                    {commentTopics.length ? (
                      <div className="collaboration-guidance-block">
                        <div className="card__label">Topics to cover in the source workflow</div>
                        <p>{commentTopics.map(topicLabel).join(' · ')}</p>
                      </div>
                    ) : null}

                    <div className="collaboration-card-actions">
                      {sourcePath && sourceLabel ? <Link className="button button--secondary" to={sourcePath}>{sourceLabel}</Link> : null}
                      {sourcePath !== '/action-center' ? <Link className="button button--secondary" to="/action-center">Open Action Center</Link> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {view === 'limits' ? (
        <section className="collaboration-limit-grid" aria-labelledby="collaboration-limits-title">
          <div className="collaboration-section-heading collaboration-section-heading--outside">
            <div>
              <h2 id="collaboration-limits-title">Safety and coordination limits</h2>
              <p className="card__subtext">These rules apply to every recommendation shown on this page.</p>
            </div>
          </div>
          <article className="card">
            <h3>Escalation remains in the source workflow</h3>
            <p className="card__subtext">{guidance.escalation_thread_guidance || 'Use the existing alert, task, Action Center, or governance process for escalation.'}</p>
          </article>
          <article className="card">
            <h3>No coordination room is created</h3>
            <p className="card__subtext">{guidance.incident_war_room_guidance || 'Active coordination is a suggestion only. This page does not create a room, channel, meeting, or participant list.'}</p>
          </article>
          <article className="card">
            <h3>No external partner is contacted</h3>
            <p className="card__subtext">{guidance.supplier_coordination_guidance || 'Supplier, carrier, and partner communication remains in the authorized source process.'}</p>
          </article>
          <article className="card">
            <h3>No messages or comments are recorded</h3>
            <p className="card__subtext">Use the suggested topics in the source workflow. This page does not send messages, notify users, or save comments.</p>
          </article>
          <article className="card">
            <h3>No operational data is changed</h3>
            <p className="card__subtext">Opening or refreshing Collaboration does not change stock, alerts, tasks, approvals, suppliers, shipments, finance, or integrations.</p>
          </article>
          <article className="card">
            <h3>Source permissions still apply</h3>
            <p className="card__subtext">Only recommendations supported by records the current user may read are returned. The source page remains authoritative.</p>
          </article>
        </section>
      ) : null}

      {view === 'diagnostics' && canViewDiagnostics ? (
        <section className="card collaboration-diagnostics">
          <h2>Technical response diagnostics</h2>
          <p className="card__subtext">Restricted implementation information for users with tenant diagnostics permission.</p>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </section>
      ) : null}
    </div>
  );
}
