import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

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

type CollaborationThread = {
  thread_id: string;
  source_action_id?: string;
  source_timeline_item_id?: string;
  collaboration_domain?: string;
  thread_type?: string;
  urgency?: string;
  title?: string;
  summary?: string | null;
  participants_hint?: {
    suggested_roles?: string[];
    external_participants_allowed_from_endpoint?: boolean;
    endpoint_sends_messages?: boolean;
  };
  coordination_context?: {
    source_surface?: string | null;
    recommended_next_step?: string | null;
    escalation_recommended?: boolean;
    correlation_id?: string | null;
    source_reference?: Record<string, unknown>;
  };
  comment_guidance?: {
    comment_capture_surface?: string | null;
    endpoint_records_comment?: boolean;
    recommended_comment_topics?: string[];
  };
  war_room_guidance?: {
    war_room_candidate?: boolean;
    suggested_cadence?: string;
    endpoint_creates_room?: boolean;
  };
  safety_contract?: Record<string, boolean>;
  created_at?: string | null;
  updated_at?: string | null;
};

type CollaborationResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    source_foundations?: string[];
    supported_collaboration_domains?: string[];
    supported_thread_types?: string[];
    collaboration_capabilities?: string[];
    safety_contract?: Record<string, boolean>;
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
    next_thread_id?: string | null;
    next_thread_type?: string | null;
    next_thread_urgency?: string | null;
    collaboration_guidance?: string;
    escalation_thread_guidance?: string;
    incident_war_room_guidance?: string;
    supplier_coordination_guidance?: string;
    safety_contract?: Record<string, boolean>;
  };
  threads?: CollaborationThread[];
  source_workspace_summary?: Record<string, unknown>;
  source_event_coordination_summary?: Record<string, unknown>;
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const DOMAIN_FILTERS: Array<{ value: 'all' | CollaborationDomain; label: string }> = [
  { value: 'all', label: 'All collaboration domains' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'execution', label: 'Execution' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'event_coordination', label: 'Event coordination' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const THREAD_FILTERS: Array<{ value: 'all' | CollaborationThreadType; label: string }> = [
  { value: 'all', label: 'All thread types' },
  { value: 'triage_thread', label: 'Triage thread' },
  { value: 'approval_thread', label: 'Approval thread' },
  { value: 'incident_thread', label: 'Incident thread' },
  { value: 'supplier_coordination_thread', label: 'Supplier coordination thread' },
  { value: 'task_coordination_thread', label: 'Task coordination thread' },
  { value: 'governance_review_thread', label: 'Governance review thread' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | Urgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
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
  minWidth: 190
};

const threadListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
  gap: 14
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

const metadataStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 14
};

const metadataItemStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '8px 10px',
  background: '#f9fafb',
  color: '#374151',
  fontSize: 12,
  fontWeight: 700
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatAppliedFilter(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') {
    return 'All';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return formatLabel(value);
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
    '/real-time-operations-feed',
    '/workflow-composer',
    '/ai-review',
    '/execution-tasks',
    '/execution-requests',
    '/alerts',
    '/insights',
    '/inventory-reservations',
    '/inventory-requisitions',
    '/procurement-recommendations',
    '/shipments',
    '/reports'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

async function fetchEnterpriseCollaborationSummary(
  collaborationDomain: 'all' | CollaborationDomain,
  threadType: 'all' | CollaborationThreadType,
  urgency: 'all' | Urgency
): Promise<CollaborationResponse> {
  const params = new URLSearchParams({ limit: '75' });

  if (collaborationDomain !== 'all') {
    params.set('collaboration_domain', collaborationDomain);
  }

  if (threadType !== 'all') {
    params.set('thread_type', threadType);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  return apiRequest<CollaborationResponse>(`/operational-action-center/enterprise-collaboration-summary?${params.toString()}`);
}

export default function EnterpriseCollaborationPage() {
  const [collaborationDomain, setCollaborationDomain] = useState<'all' | CollaborationDomain>('all');
  const [threadType, setThreadType] = useState<'all' | CollaborationThreadType>('all');
  const [urgency, setUrgency] = useState<'all' | Urgency>('all');

  const collaborationQuery = useQuery({
    queryKey: ['enterprise-collaboration', collaborationDomain, threadType, urgency],
    queryFn: () => fetchEnterpriseCollaborationSummary(collaborationDomain, threadType, urgency)
  });

  const response = collaborationQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const appliedFilters = response?.filters || {};
  const threads = response?.threads || [];
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  return (
    <div>
      <div className="card-grid" style={gridStyle}>
        <div className="card">
          <div className="card__label">Collaboration threads</div>
          <div className="card__value">{numberValue(summary.total_threads ?? threads.length)}</div>
          <div className="card__subtext">Read-only coordination contexts sourced from workspace actions and event coordination signals.</div>
        </div>
        <div className="card">
          <div className="card__label">War-room candidates</div>
          <div className="card__value">{numberValue(summary.war_room_candidates)}</div>
          <div className="card__subtext">Critical items that may need active human coordination outside this endpoint.</div>
        </div>
        <div className="card">
          <div className="card__label">Escalation recommended</div>
          <div className="card__value">{numberValue(summary.escalation_recommended)}</div>
          <div className="card__subtext">Threads where the backend recommends escalation review or owner assignment.</div>
        </div>
        <div className="card">
          <div className="card__label">Execution mode</div>
          <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(response?.definition?.execution_mode)}</div>
          <div className="card__subtext">No messages, rooms, notifications, comments, or source workflow mutations are created here.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Collaboration controls</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select style={selectStyle} value={collaborationDomain} onChange={(event) => setCollaborationDomain(event.target.value as 'all' | CollaborationDomain)}>
              {DOMAIN_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={threadType} onChange={(event) => setThreadType(event.target.value as 'all' | CollaborationThreadType)}>
              {THREAD_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | Urgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => collaborationQuery.refetch()} disabled={collaborationQuery.isFetching}>
              {collaborationQuery.isFetching ? 'Refreshing…' : 'Refresh threads'}
            </button>
            <Link className="button button--secondary" to="/real-time-operations-feed">Open operations feed</Link>
            <Link className="button button--secondary" to="/ai-review">Open AI review</Link>
          </div>

          {collaborationQuery.isLoading ? (
            <p className="card__subtext">Loading enterprise collaboration context…</p>
          ) : collaborationQuery.error ? (
            <p className="form-error">
              {collaborationQuery.error instanceof ApiError
                ? collaborationQuery.error.message
                : 'Unable to load enterprise collaboration context.'}
            </p>
          ) : (
            <>
              <p className="card__subtext">
                {guidance.collaboration_guidance || 'Use collaboration context to coordinate humans in governed source workflows without sending messages from this page.'}
              </p>
              <div style={metadataStyle} aria-label="Collaboration snapshot metadata">
                <span style={metadataItemStyle}>Generated: {formatDateTime(response?.generated_at)}</span>
                <span style={metadataItemStyle}>Domain: {formatAppliedFilter(appliedFilters.collaboration_domain)}</span>
                <span style={metadataItemStyle}>Thread type: {formatAppliedFilter(appliedFilters.thread_type)}</span>
                <span style={metadataItemStyle}>Urgency: {formatAppliedFilter(appliedFilters.urgency)}</span>
                <span style={metadataItemStyle}>Limit: {formatAppliedFilter(appliedFilters.limit)}</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Thread recommendations</div>
        {threads.length === 0 && !collaborationQuery.isLoading ? (
          <div className="empty-state">No collaboration thread recommendations match the selected filters.</div>
        ) : (
          <div style={threadListStyle}>
            {threads.map((thread) => {
              const sourcePath = sourceSurfaceToAppPath(thread.coordination_context?.source_surface || thread.comment_guidance?.comment_capture_surface);
              return (
                <article className="card" key={thread.thread_id}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={badgeStyle}>{formatLabel(thread.urgency)}</span>
                    <span style={badgeStyle}>{formatLabel(thread.thread_type)}</span>
                    <span style={badgeStyle}>{formatLabel(thread.collaboration_domain)}</span>
                    {thread.war_room_guidance?.war_room_candidate ? <span style={badgeStyle}>War-room candidate</span> : null}
                  </div>
                  <h3 style={{ marginTop: 0 }}>{thread.title || thread.thread_id}</h3>
                  <p className="card__subtext">{thread.summary || 'No collaboration summary was provided.'}</p>

                  <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 12 }}>
                    <div>
                      <div className="card__label">Suggested roles</div>
                      <strong>{thread.participants_hint?.suggested_roles?.length ? thread.participants_hint.suggested_roles.map(formatLabel).join(', ') : 'Not specified'}</strong>
                    </div>
                    <div>
                      <div className="card__label">Cadence</div>
                      <strong>{formatLabel(thread.war_room_guidance?.suggested_cadence)}</strong>
                    </div>
                    <div>
                      <div className="card__label">Updated</div>
                      <strong>{formatDateTime(thread.updated_at || thread.created_at)}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Recommended next step</div>
                    <p className="card__subtext">{thread.coordination_context?.recommended_next_step || 'Coordinate owners and status in the source workflow.'}</p>
                  </div>

                  {thread.comment_guidance?.recommended_comment_topics?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">Comment topics for source workflow</div>
                      <p className="card__subtext">{thread.comment_guidance.recommended_comment_topics.map(formatLabel).join(' · ')}</p>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                    {sourcePath ? <Link className="button button--secondary" to={sourcePath}>Open source surface</Link> : null}
                    <Link className="button button--secondary" to="/action-center">Open action center</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__title">Safety and coordination guardrails</div>
        <div className="card-grid" style={gridStyle}>
          <div className="card">
            <div className="card__label">Escalation guidance</div>
            <p className="card__subtext">{guidance.escalation_thread_guidance || 'Escalation remains in existing governed workflows.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Incident guidance</div>
            <p className="card__subtext">{guidance.incident_war_room_guidance || 'War-room candidates are suggestions only; rooms are not created here.'}</p>
          </div>
          <div className="card">
            <div className="card__label">External coordination</div>
            <p className="card__subtext">{guidance.supplier_coordination_guidance || 'External supplier, carrier, or partner actions are never dispatched from this surface.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Safety contract</div>
            <p className="card__subtext">
              {safetyEntries.length
                ? safetyEntries.map(([key]) => formatLabel(key)).join(' · ')
                : 'This page is read-only and does not send messages, create rooms, or record comments.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
