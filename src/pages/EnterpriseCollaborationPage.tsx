import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { OperationalWorkspaceHero, /* OperationalWorkspaceMetaPill, */ OperationalWorkspaceStatCard, OperationalWorkspaceStatus, OperationalWorkspaceTab, OperationalWorkspaceTabs } from '../components/ui/OperationalWorkspace';
import './EnterpriseCollaborationPage.css';

type CollaborationView = 'recommendations' | 'limits';

type CollaborationDomain =
  | 'alerts'
  | 'execution'
  | 'control_tower'
  | 'decision_intelligence'
  | 'ai_governance'
  | 'event_coordination';

type CollaborationThreadType =
  | 'triage_thread'
  | 'approval_thread'
  | 'incident_thread'
  | 'task_coordination_thread'
  | 'governance_review_thread';

type Urgency = 'critical' | 'high' | 'medium' | 'low';
type ResultLimit = '25' | '50' | '75' | '100';
type AttentionState =
  | 'assigned_to_me'
  | 'unassigned'
  | 'escalation_recommended'
  | 'active_coordination'
  | 'blocked'
  | 'overdue';

type CollaborationThread = {
  thread_key?: string;
  thread_id?: string;
  collaboration_domain?: string;
  thread_type?: string;
  urgency?: string;
  title?: string;
  title_key?: string | null;
  summary?: string | null;
  summary_key?: string | null;
  coordination_reason?: {
    text?: string | null;
    key?: string | null;
  };
  participants_hint?: {
    suggested_roles?: string[];
    actual_assignee_name?: string | null;
    assignment_state?: string | null;
  };
  coordination_context?: {
    source_surface?: string | null;
    source_action_id?: string | null;
    source_timeline_item_id?: string | null;
    source_reference?: {
      source_type?: string | null;
      source_id?: string | null;
    } | null;
    business_area?: string | null;
    recommended_next_step?: string | null;
    recommended_next_step_key?: string | null;
    escalation_recommended?: boolean;
  };
  work_context?: {
    action_status?: string | null;
    assignment_state?: string | null;
    actual_assignee_name?: string | null;
    effective_due_at?: string | null;
    is_overdue?: boolean;
    is_due_soon?: boolean;
    blocked?: boolean;
    storage_location_name?: string | null;
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
  filters?: {
    collaboration_domain?: string | null;
    thread_type?: string | null;
    urgency?: string | null;
    attention_state?: string | null;
    limit?: number;
    offset?: number;
  };
  summary?: {
    total_threads?: number;
    total_matching_threads?: number;
    returned_threads?: number;
    total_is_capped?: boolean;
    war_room_candidates?: number;
    escalation_recommended?: number;
    by_domain?: Record<string, number>;
    by_thread_type?: Record<string, number>;
    by_urgency?: Record<string, number>;
  };
  pagination?: {
    offset?: number;
    limit?: number;
    returned?: number;
    total_matching?: number;
    total_is_capped?: boolean;
    has_previous?: boolean;
    has_more?: boolean;
  };
  guidance?: {
    collaboration_guidance?: string;
    collaboration_guidance_key?: string | null;
    escalation_thread_guidance?: string;
    escalation_thread_guidance_key?: string | null;
    incident_war_room_guidance?: string;
    incident_war_room_guidance_key?: string | null;
    supplier_coordination_guidance?: string;
    supplier_coordination_guidance_key?: string | null;
  };
  threads?: CollaborationThread[];
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const DOMAIN_FILTERS: Array<{ value: 'all' | CollaborationDomain; label: string }> = [
  { value: 'all', label: 'All coordination areas' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'execution', label: 'Execution tasks' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'event_coordination', label: 'Operational events' }
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

const ATTENTION_FILTERS: Array<{ value: 'all' | AttentionState; label: string }> = [
  { value: 'all', label: 'All responsibility states' },
  { value: 'assigned_to_me', label: 'Assigned to me (tasks)' },
  { value: 'unassigned', label: 'Unassigned tasks' },
  { value: 'escalation_recommended', label: 'Escalation suggested' },
  { value: 'active_coordination', label: 'Active coordination suggested' },
  { value: 'blocked', label: 'Blocked work' },
  { value: 'overdue', label: 'Overdue work' }
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
  attentionState: 'all' as 'all' | AttentionState,
  limit: '50' as ResultLimit
};

const ROLE_LABELS: Record<string, string> = {
  source_owner: 'Source record owner',
  governance_reviewer: 'Appropriate governance reviewer',
  operations_manager: 'Operational manager or equivalent',
  operator: 'Task assignee or operator',
  shift_lead: 'Operational supervisor or equivalent',
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
  task_coordination_thread: 'Task coordination',
  governance_review_thread: 'Governance review'
};

const DOMAIN_LABELS: Record<string, string> = {
  alerts: 'Alerts',
  execution: 'Execution',
  control_tower: 'Control tower',
  decision_intelligence: 'Decision intelligence',
  probabilistic_forecast_model: 'Probabilistic forecast',
  adaptive_policy_recommendation: 'Adaptive policy recommendation',
  ai_copilot_run: 'AI Copilot analysis',
  ai_governance: 'AI governance',
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

const BUSINESS_AREA_LABELS: Record<string, string> = {
  alerts: 'Alerts',
  manual: 'Manual task',
  reservation: 'Reservations',
  requisition: 'Requisitions',
  purchase_order: 'Purchase orders',
  shipment: 'Shipments',
  transfer: 'Stock transfers',
  cycle_count: 'Cycle counts',
  replenishment: 'Replenishment',
  execution_request: 'Execution requests',
  execution: 'Execution',
  control_tower: 'Control tower',
  decision_intelligence: 'Decision intelligence',
  probabilistic_forecast_model: 'Probabilistic forecast',
  adaptive_policy_recommendation: 'Adaptive policy recommendation',
  ai_copilot_run: 'AI Copilot analysis',
  ai_governance: 'AI governance',
  ai_review_escalation: 'Intelligence review',
  remediation_workflow: 'Remediation',
  simulation_scenario: 'Simulation',
  optimization_run: 'Cross-domain optimisation',
  event_coordination: 'Operational events',
  inventory: 'Inventory',
  procurement: 'Procurement',
  financial: 'Financial operations',
  integration: 'Integrations',
  audit: 'Audit'
};

const SOURCE_LABELS: Record<string, string> = {
  '/action-center': 'Open Action Center',
  '/alerts': 'Open Alerts',
  '/execution-tasks': 'Open Execution Tasks',
  '/real-time-operations-feed': 'Open Operations Feed',
  '/intelligence-review': 'Open Intelligence Review',
  '/ai-copilot': 'Open AI Copilot',
  '/probabilistic-forecasting': 'Open Probabilistic Forecasting',
  '/adaptive-policy-engine': 'Open Adaptive Policy Engine',
  '/cross-domain-optimization': 'Open Cross-Domain Optimization',
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

function formatDateTime(value: string | null | undefined, locale: Parameters<typeof formatLocalizedDateTime>[1], ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDateTime(date, locale);
}

function sourceSurfaceToAppPath(sourceSurface?: string | null): string | null {
  if (!sourceSurface) return null;
  if (sourceSurface === '/operational-action-center/summary' || sourceSurface === '/control-tower') {
    return '/action-center';
  }
  return Object.prototype.hasOwnProperty.call(SOURCE_LABELS, sourceSurface) ? sourceSurface : null;
}

function businessAreaLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (!value) return ui('General operations');
  return BUSINESS_AREA_LABELS[value] ? ui(BUSINESS_AREA_LABELS[value]) : formatIdentifier(value);
}

function exactSourcePath(thread: CollaborationThread): string | null {
  const sourcePath = sourceSurfaceToAppPath(thread.coordination_context?.source_surface || thread.comment_guidance?.comment_capture_surface);
  if (!sourcePath) return null;
  const sourceId = thread.coordination_context?.source_reference?.source_id;
  const sourceActionId = thread.coordination_context?.source_action_id;
  const timelineItemId = thread.coordination_context?.source_timeline_item_id;

  if (sourcePath === '/alerts' && sourceId) {
    return `/alerts?${new URLSearchParams({ alert_id: sourceId }).toString()}`;
  }
  if (sourcePath === '/execution-tasks' && sourceId) {
    return `/execution-tasks?${new URLSearchParams({ task_id: sourceId }).toString()}`;
  }
  if (sourcePath === '/intelligence-review' && sourceActionId) {
    return `/intelligence-review?${new URLSearchParams({ source_action_id: sourceActionId }).toString()}`;
  }
  if (sourcePath === '/action-center' && sourceActionId) {
    return `/action-center?${new URLSearchParams({ source_action_id: sourceActionId }).toString()}`;
  }
  if ((sourcePath === '/probabilistic-forecasting' || sourcePath === '/adaptive-policy-engine') && sourceActionId) {
    return `${sourcePath}?${new URLSearchParams({ source_action_id: sourceActionId }).toString()}`;
  }
  if (sourcePath === '/real-time-operations-feed' && timelineItemId) {
    const params = new URLSearchParams({ timeline_item_id: timelineItemId });
    if (thread.urgency) params.set('urgency', thread.urgency);
    const area = thread.coordination_context?.business_area;
    if (area && area !== 'event_coordination') params.set('event_domain', area);
    return `${sourcePath}?${params.toString()}`;
  }
  return sourcePath;
}

function exactSourceLabel(thread: CollaborationThread, sourcePath: string | null, ui: (englishText: string) => string): string | null {
  if (!sourcePath) return null;
  if (sourcePath === '/alerts') return ui('Open exact alert');
  if (sourcePath === '/execution-tasks') return ui('Open exact execution task');
  if (sourcePath === '/intelligence-review') return ui('Open exact review');
  if (sourcePath === '/real-time-operations-feed') return ui('Open exact operational event');
  return SOURCE_LABELS[sourcePath] ? ui(SOURCE_LABELS[sourcePath]) : ui('Open exact source item');
}

function urgencyLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const known = value ? URGENCY_FILTERS.find((option) => option.value === value)?.label : null;
  return known ? ui(known) : value ? formatIdentifier(value) : ui('Unspecified urgency');
}

function threadTypeLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return value ? (THREAD_TYPE_LABELS[value] ? ui(THREAD_TYPE_LABELS[value]) : formatIdentifier(value)) : ui('Coordination guidance');
}

function domainLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return value ? (DOMAIN_LABELS[value] ? ui(DOMAIN_LABELS[value]) : formatIdentifier(value)) : ui('General operations');
}

function roleLabel(value: string, ui: (englishText: string) => string): string {
  return ROLE_LABELS[value] ? ui(ROLE_LABELS[value]) : formatIdentifier(value);
}

function topicLabel(value: string, ui: (englishText: string) => string): string {
  return TOPIC_LABELS[value] ? ui(TOPIC_LABELS[value]) : formatIdentifier(value);
}

function cadenceLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (!value) return ui('Review when needed');
  return CADENCE_LABELS[value] ? ui(CADENCE_LABELS[value]) : formatIdentifier(value);
}

function localizedSystemGuidance(
  key: string | null | undefined,
  value: string | null | undefined,
  fallback: string,
  ui: (englishText: string) => string
): string {
  const text = String(value || '').trim();
  return text ? (key ? ui(text) : text) : ui(fallback);
}

async function fetchEnterpriseCollaborationSummary(filters: typeof DEFAULT_FILTERS, offset: number): Promise<CollaborationResponse> {
  const params = new URLSearchParams({ limit: filters.limit, offset: String(offset) });
  if (filters.collaborationDomain !== 'all') params.set('collaboration_domain', filters.collaborationDomain);
  if (filters.threadType !== 'all') params.set('thread_type', filters.threadType);
  if (filters.urgency !== 'all') params.set('urgency', filters.urgency);
  if (filters.attentionState !== 'all') params.set('attention_state', filters.attentionState);
  return apiRequest<CollaborationResponse>(`/operational-action-center/enterprise-collaboration-summary?${params.toString()}`);
}

function SummaryCard({ iconPath, label, value, description, tone = 'blue', translateValue = true }: {
  iconPath: string;
  label: string;
  value: string | number;
  description: string;
  tone?: 'blue' | 'amber' | 'red' | 'slate';
  translateValue?: boolean;
}) {
  const { locale, ui } = useAppTranslation();
  const presentedValue = typeof value === 'number'
    ? formatLocalizedNumber(value, locale)
    : translateValue ? ui(value) : value;
  return (
    <OperationalWorkspaceStatCard label={ui(label)} value={presentedValue} helper={ui(description)} tone={tone} iconPath={iconPath} />
  );
}

export default function EnterpriseCollaborationPage() {
  const { locale, ui } = useAppTranslation();
  const canViewIntelligenceReview = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  const [view, setView] = useState<CollaborationView>('recommendations');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [offset, setOffset] = useState(0);

  const queryKey = useMemo(() => [
    'enterprise-collaboration',
    filters.collaborationDomain,
    filters.threadType,
    filters.urgency,
    filters.attentionState,
    filters.limit,
    offset
  ], [filters, offset]);

  const collaborationQuery = useQuery({
    queryKey,
    queryFn: () => fetchEnterpriseCollaborationSummary(filters, offset),
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000
  });

  const response = collaborationQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const threads = response?.threads || [];
  const pagination = response?.pagination || {};
  const appliedLimit = response?.filters?.limit || Number(filters.limit);
  const appliedOffset = pagination.offset ?? offset;
  const totalMatching = numberValue(pagination.total_matching ?? summary.total_matching_threads ?? summary.total_threads ?? threads.length);
  const totalIsCapped = Boolean(pagination.total_is_capped ?? summary.total_is_capped);
  const shownFrom = threads.length ? appliedOffset + 1 : 0;
  const shownTo = threads.length ? appliedOffset + threads.length : 0;
  const hasActiveFilters = filters.collaborationDomain !== 'all'
    || filters.threadType !== 'all'
    || filters.urgency !== 'all'
    || filters.attentionState !== 'all'
    || filters.limit !== DEFAULT_FILTERS.limit;

  const updateFilters = (patch: Partial<typeof DEFAULT_FILTERS>) => {
    setOffset(0);
    setFilters((current) => ({ ...current, ...patch }));
  };
  const clearFilters = () => {
    setOffset(0);
    setFilters(DEFAULT_FILTERS);
  };
  const goPrevious = () => setOffset((current) => Math.max(0, current - appliedLimit));
  const goNext = () => setOffset((current) => current + appliedLimit);

  if (collaborationQuery.isLoading) {
    return (
      <div className="io-operational-page io-workspace-page collaboration-page">
        <section className="card collaboration-state collaboration-state--loading" aria-live="polite">
          <span className="collaboration-state-icon"><TenantNavIcon path="/collaboration" size={22} /></span>
          <div>
            <h2>{ui('Loading coordination recommendations')}</h2>
            <p>{ui('Preparing the current read-only collaboration snapshot.')}</p>
          </div>
        </section>
      </div>
    );
  }

  if (collaborationQuery.error) {
    return (
      <div className="io-operational-page io-workspace-page collaboration-page">
        <section className="card collaboration-state collaboration-state--error" role="alert">
          <span className="collaboration-state-icon collaboration-state-icon--danger"><TenantNavIcon path="/alerts" size={22} /></span>
          <div className="collaboration-state-copy">
            <h2>{ui('Coordination recommendations could not be loaded')}</h2>
            <p>
              {collaborationQuery.error instanceof ApiError
                ? collaborationQuery.error.message
                : ui('The collaboration summary is temporarily unavailable.')}
            </p>
            <button className="button button--secondary" type="button" onClick={() => collaborationQuery.refetch()}>{ui('Retry')}</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="io-operational-page io-workspace-page collaboration-page" data-collaboration-refined="true">
      <OperationalWorkspaceHero
        iconPath="/collaboration"
        eyebrow={ui('Read-only coordination guidance')}
        title={ui('Coordinate work in the source workflow')}
        description={ui('This page turns permitted alerts, tasks, governance reviews, and operational events into suggestions about who should coordinate, what to discuss, and where the real work belongs. It does not create a chat thread, send a message, notify anyone, or record a comment.')}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
            <>
                      <OperationalWorkspaceMetaPill>{ui('Source permissions apply')}</OperationalWorkspaceMetaPill>
                      <OperationalWorkspaceMetaPill>{ui('Source workflow stays authoritative')}</OperationalWorkspaceMetaPill>
                    </>
          */
        }
        aside={<div style={{ display: 'grid', gap: 8 }}>
          <OperationalWorkspaceStatus
            value={formatLocalizedNumber(threads.length, locale)}
            label={ui('{shown} shown of {total} matching · refreshed {time}')
              .replace('{shown}', formatLocalizedNumber(threads.length, locale))
              .replace('{total}', `${formatLocalizedNumber(totalMatching, locale)}${totalIsCapped ? '+' : ''}`)
              .replace('{time}', formatDateTime(response?.generated_at, locale, ui))}
          />
          <div className="collaboration-auto-refresh-note">{ui('Auto-refreshes every 30 seconds while this page is open.')}</div>
          <button className="app-button app-button--secondary" type="button" onClick={() => collaborationQuery.refetch()} disabled={collaborationQuery.isFetching}>
            {collaborationQuery.isFetching ? ui('Refreshing…') : ui('Refresh recommendations')}
          </button>
        </div>}
      />

      <section className="card collaboration-filters" aria-labelledby="collaboration-filter-title">
        <div className="collaboration-section-heading">
          <div className="collaboration-section-title">
            <span className="collaboration-heading-icon"><TenantNavIcon path="/collaboration" size={17} /></span>
            <div>
              <h2 id="collaboration-filter-title">{ui('Filter the recommendations')}</h2>
              <p className="card__subtext">{ui('Filters change only this read-only snapshot. They do not change any alert, task, review, or operational event.')}</p>
            </div>
          </div>
          {hasActiveFilters ? <button className="button button--secondary" type="button" onClick={clearFilters}>{ui('Clear filters')}</button> : null}
        </div>
        <div className="collaboration-filter-grid">
          <label>
            <span>{ui('Coordination area')}</span>
            <select value={filters.collaborationDomain} onChange={(event) => updateFilters({ collaborationDomain: event.target.value as typeof filters.collaborationDomain })}>
              {DOMAIN_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Recommendation type')}</span>
            <select value={filters.threadType} onChange={(event) => updateFilters({ threadType: event.target.value as typeof filters.threadType })}>
              {THREAD_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Urgency')}</span>
            <select value={filters.urgency} onChange={(event) => updateFilters({ urgency: event.target.value as typeof filters.urgency })}>
              {URGENCY_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Needs attention because')}</span>
            <select value={filters.attentionState} onChange={(event) => updateFilters({ attentionState: event.target.value as typeof filters.attentionState })}>
              {ATTENTION_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Maximum recommendations')}</span>
            <select value={filters.limit} onChange={(event) => updateFilters({ limit: event.target.value as ResultLimit })}>
              {LIMIT_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="collaboration-summary-grid io-workspace-stats" aria-label={ui('Collaboration summary')}>
        <SummaryCard
          iconPath="/collaboration"
          label="Matching recommendations"
          value={`${formatLocalizedNumber(totalMatching, locale)}${totalIsCapped ? '+' : ''}`}
          translateValue={false}
          description="All matching coordination items found in the current bounded source scan, not only the current page."
        />
        <SummaryCard
          iconPath="/real-time-operations-feed"
          label="Active coordination suggested"
          value={numberValue(summary.war_room_candidates)}
          description="Critical items that may need sustained human coordination."
          tone="amber"
        />
        <SummaryCard
          iconPath="/alerts"
          label="Escalation suggested"
          value={numberValue(summary.escalation_recommended)}
          description="Critical or high-urgency items where owner or escalation review is recommended."
          tone="red"
        />
        <SummaryCard
          iconPath="/permissions"
          label="Operating mode"
          value={ui('Read-only guidance')}
          description="All actions remain in their source workflows."
          tone="slate"
        />
      </section>

      <OperationalWorkspaceTabs ariaLabel={ui('Collaboration views')}>
        <OperationalWorkspaceTab active={view === 'recommendations'} iconPath="/collaboration" label={ui('Coordination recommendations')} onClick={() => setView('recommendations')} />
        <OperationalWorkspaceTab active={view === 'limits'} iconPath="/permissions" label={ui('Safety and limits')} onClick={() => setView('limits')} />
      </OperationalWorkspaceTabs>

      {view === 'recommendations' ? (
        <section aria-labelledby="coordination-recommendations-title">
          <div className="collaboration-section-heading collaboration-section-heading--outside">
            <div className="collaboration-section-title">
              <span className="collaboration-heading-icon"><TenantNavIcon path="/collaboration" size={17} /></span>
              <div>
                <h2 id="coordination-recommendations-title">{ui('Coordination recommendations')}</h2>
                <p className="card__subtext">
                  {localizedSystemGuidance(guidance.collaboration_guidance_key, guidance.collaboration_guidance, 'Use these suggestions to coordinate people in the appropriate source workflow.', ui)} {threads.length ? ui('Showing {from}–{to} of {total} matching recommendations.').replace('{from}', formatLocalizedNumber(shownFrom, locale)).replace('{to}', formatLocalizedNumber(shownTo, locale)).replace('{total}', `${formatLocalizedNumber(totalMatching, locale)}${totalIsCapped ? '+' : ''}`) : ui('No matching recommendations are currently shown.')}
                </p>
              </div>
            </div>
            <div className="collaboration-shortcuts">
              <Link className="button button--secondary collaboration-link-button" to="/real-time-operations-feed"><TenantNavIcon path="/real-time-operations-feed" size={16} /> {ui('Open Operations Feed')}</Link>
              {canViewIntelligenceReview ? <Link className="button button--secondary collaboration-link-button" to="/intelligence-review"><TenantNavIcon path="/intelligence-review" size={16} /> {ui('Open Intelligence Review')}</Link> : null}
            </div>
          </div>

          {threads.length === 0 ? (
            <div className="card collaboration-state collaboration-empty-state">
              <span className="collaboration-state-icon"><TenantNavIcon path="/collaboration" size={22} /></span>
              <div>
                <h3>{ui('No coordination recommendations match the current filters')}</h3>
                <p>{ui('Clear the filters or confirm that an open alert, task, review, or operational event exists for this tenant.')}</p>
              </div>
            </div>
          ) : (
            <div className="collaboration-thread-grid">
              {threads.map((thread, index) => {
                const sourcePath = sourceSurfaceToAppPath(thread.coordination_context?.source_surface || thread.comment_guidance?.comment_capture_surface);
                const preciseSourcePath = exactSourcePath(thread);
                const sourceLabel = exactSourceLabel(thread, sourcePath, ui);
                const actionCenterPath = thread.coordination_context?.source_action_id
                  ? `/action-center?${new URLSearchParams({ source_action_id: thread.coordination_context.source_action_id }).toString()}`
                  : '/action-center';
                const itemKey = thread.thread_key || thread.thread_id || `${thread.title || 'coordination'}-${thread.updated_at || index}-${index}`;
                const suggestedRoles = thread.participants_hint?.suggested_roles || [];
                const commentTopics = thread.comment_guidance?.recommended_comment_topics || [];
                const businessArea = businessAreaLabel(thread.coordination_context?.business_area, ui);
                const currentAssignee = thread.participants_hint?.actual_assignee_name || thread.work_context?.actual_assignee_name || null;
                const assignmentState = thread.participants_hint?.assignment_state || thread.work_context?.assignment_state || null;
                return (
                  <article className="card collaboration-thread-card" key={itemKey}>
                    <div className="collaboration-thread-card__heading">
                      <span className="collaboration-thread-icon"><TenantNavIcon path={sourcePath || '/collaboration'} size={18} /></span>
                      <div className="collaboration-badges">
                        <span className={`collaboration-badge collaboration-badge--${String(thread.urgency || 'unknown').toLowerCase()}`}>{urgencyLabel(thread.urgency, ui)}</span>
                        <span className="collaboration-badge">{threadTypeLabel(thread.thread_type, ui)}</span>
                        <span className="collaboration-badge">{domainLabel(thread.collaboration_domain, ui)}</span>
                        <span className="collaboration-badge collaboration-badge--business">{businessArea}</span>
                        {assignmentState === 'unassigned' ? <span className="collaboration-badge collaboration-badge--attention">{ui('Unassigned')}</span> : null}
                        {thread.work_context?.blocked ? <span className="collaboration-badge collaboration-badge--attention">{ui('Blocked')}</span> : null}
                        {thread.work_context?.is_overdue ? <span className="collaboration-badge collaboration-badge--attention">{ui('Overdue')}</span> : null}
                        {thread.war_room_guidance?.war_room_candidate ? <span className="collaboration-badge collaboration-badge--attention">{ui('Active coordination suggested')}</span> : null}
                      </div>
                    </div>

                    <div className="collaboration-thread-copy">
                      <h3>{thread.title ? localizedSystemGuidance(thread.title_key, thread.title, 'Coordination item', ui) : ui('Coordination item')}</h3>
                      <p className="card__subtext">{thread.summary ? localizedSystemGuidance(thread.summary_key, thread.summary, 'No additional summary was provided.', ui) : ui('No additional summary was provided.')}</p>
                    </div>

                    <div className="collaboration-guidance-block collaboration-guidance-block--reason">
                      <div className="card__label">{ui('Why this appeared')}</div>
                      <p>{localizedSystemGuidance(thread.coordination_reason?.key, thread.coordination_reason?.text, 'This source item needs human follow-up in its authoritative workflow.', ui)}</p>
                    </div>

                    <dl className="collaboration-facts">
                      {assignmentState ? (
                        <div>
                          <dt>{ui('Current owner or assignee')}</dt>
                          <dd>{assignmentState === 'unassigned' ? ui('Unassigned') : currentAssignee || (assignmentState === 'mine' ? ui('Assigned to me') : ui('Assigned in the source workflow'))}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>{ui('Suggested coordination responsibilities')}</dt>
                        <dd>{suggestedRoles.length ? suggestedRoles.map((role) => roleLabel(role, ui)).join(', ') : ui('Source workflow owner')}</dd>
                      </div>
                      <div>
                        <dt>{ui('Business area')}</dt>
                        <dd>{businessArea}</dd>
                      </div>
                      {thread.work_context?.storage_location_name ? (
                        <div>
                          <dt>{ui('Location')}</dt>
                          <dd>{thread.work_context.storage_location_name}</dd>
                        </div>
                      ) : null}
                      {thread.work_context?.effective_due_at ? (
                        <div>
                          <dt>{ui('Due or follow-up time')}</dt>
                          <dd>{formatDateTime(thread.work_context.effective_due_at, locale, ui)}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>{ui('Review cadence')}</dt>
                        <dd>{cadenceLabel(thread.war_room_guidance?.suggested_cadence, ui)}</dd>
                      </div>
                      <div>
                        <dt>{ui('Source last changed')}</dt>
                        <dd>{formatDateTime(thread.updated_at || thread.created_at, locale, ui)}</dd>
                      </div>
                    </dl>

                    <div className="collaboration-guidance-block">
                      <div className="card__label">{ui('Recommended next step')}</div>
                      <p>{localizedSystemGuidance(thread.coordination_context?.recommended_next_step_key, thread.coordination_context?.recommended_next_step, 'Confirm the owner, current status, blockers, and next safe action in the source workflow.', ui)}</p>
                    </div>

                    {commentTopics.length ? (
                      <div className="collaboration-guidance-block">
                        <div className="card__label">{ui('Topics to cover in the source workflow')}</div>
                        <p>{commentTopics.map((topic) => topicLabel(topic, ui)).join(' · ')}</p>
                      </div>
                    ) : null}

                    <div className="collaboration-card-actions">
                      {preciseSourcePath && sourcePath && sourceLabel ? <Link className="button button--secondary collaboration-link-button" to={preciseSourcePath}><TenantNavIcon path={sourcePath} size={16} /> {sourceLabel}</Link> : null}
                      {sourcePath !== '/action-center' && thread.coordination_context?.source_action_id ? <Link className="button button--secondary collaboration-link-button" to={actionCenterPath}><TenantNavIcon path="/action-center" size={16} /> {ui('Open exact Action Center item')}</Link> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {threads.length || pagination.has_previous || pagination.has_more ? (
            <nav className="collaboration-pagination" aria-label={ui('Recommendation pages')}>
              <div className="collaboration-pagination__status">
                {threads.length
                  ? ui('Showing {from}–{to} of {total} matching recommendations.').replace('{from}', formatLocalizedNumber(shownFrom, locale)).replace('{to}', formatLocalizedNumber(shownTo, locale)).replace('{total}', `${formatLocalizedNumber(totalMatching, locale)}${totalIsCapped ? '+' : ''}`)
                  : ui('No matching recommendations are currently shown.')}
                {totalIsCapped ? ` ${ui('The total may be higher because source scanning is deliberately bounded for safety and performance.')}` : ''}
              </div>
              <div className="collaboration-pagination__actions">
                <button className="button button--secondary" type="button" onClick={goPrevious} disabled={!pagination.has_previous || collaborationQuery.isFetching}>{ui('Previous')}</button>
                <button className="button button--secondary" type="button" onClick={goNext} disabled={!pagination.has_more || collaborationQuery.isFetching}>{ui('Next')}</button>
              </div>
            </nav>
          ) : null}
        </section>
      ) : null}

      {view === 'limits' ? (
        <section className="collaboration-limit-grid" aria-labelledby="collaboration-limits-title">
          <div className="collaboration-section-heading collaboration-section-heading--outside">
            <div className="collaboration-section-title">
              <span className="collaboration-heading-icon"><TenantNavIcon path="/permissions" size={17} /></span>
              <div>
                <h2 id="collaboration-limits-title">{ui('Safety and coordination limits')}</h2>
                <p className="card__subtext">{ui('These rules apply to every recommendation shown on this page.')}</p>
              </div>
            </div>
          </div>
          <article className="card collaboration-limit-card">
            <span className="collaboration-limit-icon"><TenantNavIcon path="/alerts" size={18} /></span>
            <div><h3>{ui('Escalation remains in the source workflow')}</h3><p className="card__subtext">{localizedSystemGuidance(guidance.escalation_thread_guidance_key, guidance.escalation_thread_guidance, 'Use the existing alert, task, Action Center, or governance process for escalation.', ui)}</p></div>
          </article>
          <article className="card collaboration-limit-card">
            <span className="collaboration-limit-icon"><TenantNavIcon path="/collaboration" size={18} /></span>
            <div><h3>{ui('No coordination room is created')}</h3><p className="card__subtext">{localizedSystemGuidance(guidance.incident_war_room_guidance_key, guidance.incident_war_room_guidance, 'Active coordination is a suggestion only. This page does not create a room, channel, meeting, or participant list.', ui)}</p></div>
          </article>
          <article className="card collaboration-limit-card">
            <span className="collaboration-limit-icon"><TenantNavIcon path="/suppliers" size={18} /></span>
            <div><h3>{ui('No external partner is contacted')}</h3><p className="card__subtext">{localizedSystemGuidance(guidance.supplier_coordination_guidance_key, guidance.supplier_coordination_guidance, 'Supplier, carrier, and partner communication remains in the authorized source process.', ui)}</p></div>
          </article>
          <article className="card collaboration-limit-card">
            <span className="collaboration-limit-icon"><TenantNavIcon path="/real-time-operations-feed" size={18} /></span>
            <div><h3>{ui('No messages or comments are recorded')}</h3><p className="card__subtext">{ui('Use the suggested topics in the source workflow. This page does not send messages, notify users, or save comments.')}</p></div>
          </article>
          <article className="card collaboration-limit-card">
            <span className="collaboration-limit-icon"><TenantNavIcon path="/stock" size={18} /></span>
            <div><h3>{ui('No operational data is changed')}</h3><p className="card__subtext">{ui('Opening or refreshing Collaboration does not change stock, alerts, tasks, approvals, suppliers, shipments, finance, or integrations.')}</p></div>
          </article>
          <article className="card collaboration-limit-card">
            <span className="collaboration-limit-icon"><TenantNavIcon path="/permissions" size={18} /></span>
            <div><h3>{ui('Source permissions still apply')}</h3><p className="card__subtext">{ui('Only recommendations supported by records the current user may read are returned. The source page remains authoritative.')}</p></div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
