import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
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
  { value: 'control_tower', label: 'Control tower' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
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

const CANONICAL_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  open: 'Open',
  pending: 'Pending',
  ready: 'Ready',
  assigned: 'Assigned',
  in_progress: 'In progress',
  acknowledged: 'Acknowledged',
  retrying: 'Retrying',
  delayed: 'Delayed',
  blocked: 'Blocked',
  failed: 'Failed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  alerts: 'Alerts',
  inventory: 'Inventory',
  procurement: 'Procurement',
  reservation: 'Reservation',
  execution: 'Execution',
  optimization: 'Optimisation',
  control_tower: 'Control tower',
  decision_intelligence: 'Decision intelligence',
  ai_governance: 'AI governance',
  financial: 'Financial',
  integration: 'Integration',
  audit: 'Audit',
  multi_domain: 'Cross-area'
};

const TECHNICAL_SAFETY_LABELS: Record<string, string> = {
  read_only: 'Read only',
  advisory_only: 'Advisory only',
  tenant_isolated: 'Tenant isolated',
  permission_gated: 'Permission gated',
  audit_traceable_source: 'Audit-traceable source',
  human_action_only: 'Human action only',
  approval_gated_when_required: 'Approval gated when required',
  no_inventory_mutation: 'No direct inventory mutation',
  no_procurement_mutation: 'No direct procurement mutation',
  no_execution_mutation: 'No direct execution mutation',
  no_financial_mutation: 'No direct financial mutation',
  no_erp_writeback: 'No ERP writeback',
  no_accounting_writeback: 'No accounting writeback',
  no_supplier_execution: 'No supplier execution',
  no_carrier_execution: 'No carrier execution',
  no_external_workflow_execution: 'No external workflow execution',
  no_external_ai_callout: 'No external AI callout'
};

function formatLabel(value?: string | null): string {
  const text = String(value || 'unknown').replace(/_/g, ' ').trim().toLowerCase();
  return text.replace(/\b\w/g, (character) => character.toUpperCase());
}

function canonicalLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const raw = String(value || 'unknown');
  return ui(CANONICAL_LABELS[raw] || formatLabel(raw));
}

function technicalSafetyLabel(value: string, ui: (englishText: string) => string): string {
  return ui(TECHNICAL_SAFETY_LABELS[value] || formatLabel(value));
}

function formatDateTime(value: string | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDateTime(date, locale);
}

function itemTitle(item: TimelineItem, ui: (englishText: string) => string): string {
  const title = String(item.title || '').trim();
  if (title) return title;
  if (item.event_type) return canonicalLabel(item.event_type, ui);
  return ui('Untitled item');
}

function itemSourceLabel(item: TimelineItem, ui: (englishText: string) => string): string {
  const domain = canonicalLabel(item.timeline_domain, ui);
  if (item.timeline_type === 'event_delivery_disruption') return `${domain} ${ui('delivery problem')}`;
  if (item.timeline_type === 'event_stream_message') return `${domain} ${ui('integration event')}`;
  return `${domain} ${ui('work item')}`;
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

function sourceItemLink(item: TimelineItem, ui: (englishText: string) => string): FeedLink | null {
  if (item.timeline_type === 'action_center_item') {
    const sourceId = item.source_reference?.source_id;

    if (item.timeline_domain === 'alerts') {
      const params = new URLSearchParams({ resolved: 'false' });
      const search = String(item.summary || item.title || '').trim();
      if (search) params.set('search', search);
      return { to: `/alerts?${params.toString()}`, label: ui('Open alert') };
    }

    if (item.timeline_domain === 'execution' && sourceId) {
      return { to: `/execution-tasks?${new URLSearchParams({ task_id: sourceId }).toString()}`, label: ui('Open execution task') };
    }

    if (['decision_intelligence', 'ai_governance'].includes(String(item.timeline_domain)) && item.correlation_id) {
      return {
        to: `/intelligence-review?${new URLSearchParams({ source_action_id: item.correlation_id }).toString()}`,
        label: ui('Open review')
      };
    }
  }

  const sourcePath = sourceSurfaceToAppPath(item.source_surface);
  return sourcePath ? { to: sourcePath, label: ui('Open source page') } : null;
}

function relatedActionLink(item: TimelineItem): string | null {
  if (item.timeline_type !== 'action_center_item' || !item.correlation_id) return null;
  return `/action-center?${new URLSearchParams({ source_action_id: item.correlation_id }).toString()}`;
}

function domainIconPath(domain?: string | null): string {
  if (domain === 'alerts') return '/alerts';
  if (domain === 'inventory') return '/stock';
  if (domain === 'procurement') return '/procurement-recommendations';
  if (domain === 'reservation') return '/inventory-reservations';
  if (domain === 'execution') return '/execution-tasks';
  if (domain === 'optimization') return '/cross-domain-optimization';
  if (domain === 'control_tower') return '/reliability-command';
  if (domain === 'decision_intelligence' || domain === 'ai_governance') return '/intelligence-review';
  if (domain === 'financial') return '/reports';
  if (domain === 'integration') return '/system-context';
  if (domain === 'audit') return '/audit';
  return '/real-time-operations-feed';
}

function safetyIconPath(key: string): string {
  if (key === 'tenant_isolated') return '/system-context';
  if (key === 'permission_gated') return '/permissions';
  if (key === 'approval_gated_when_required') return '/intelligence-review';
  if (key === 'human_action_only') return '/workspace';
  return '/real-time-operations-feed';
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
  const { locale, ui } = useAppTranslation();
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
    <div className="operations-feed-page operations-feed-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
      <OperationalWorkspaceHero
        iconPath="/real-time-operations-feed"
        eyebrow={ui("Operational coordination")}
        title={ui("Operations Feed")}
        description={ui("A tenant-scoped coordination feed for current open work, permitted integration events, and disruption follow-up. Review context here and use the authoritative source page for action.")}
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Read-only coordination")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Source workflows linked")}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={<OperationalWorkspaceStatus value={ui("Snapshot")} label={ui("refresh to load the latest permitted operational events")} />}
      />

      <OperationalWorkspaceStats ariaLabel={ui("Operations feed overview")}>
        <OperationalWorkspaceStatCard
          label={ui("Items shown")}
          value={formatLocalizedNumber(numberValue(summary.total_timeline_items ?? timeline.length), locale)}
          helper={ui("Open work, integration events, and delivery problems matching filters")}
          iconPath="/real-time-operations-feed"
          tone="blue"
        />
        <OperationalWorkspaceStatCard
          label={ui("Critical items")}
          value={formatLocalizedNumber(numberValue(summary.critical_events), locale)}
          helper={ui("Items that need the fastest human review")}
          iconPath="/alerts"
          tone={numberValue(summary.critical_events) > 0 ? 'danger' : 'good'}
        />
        <OperationalWorkspaceStatCard
          label={ui("Blocked or failed")}
          value={formatLocalizedNumber(numberValue(summary.blocked_or_failed_events), locale)}
          helper={ui("Work or integration events reporting a disruption")}
          iconPath="/reliability-command"
          tone={numberValue(summary.blocked_or_failed_events) > 0 ? 'warn' : 'good'}
        />
        <OperationalWorkspaceStatCard
          label={ui("Page mode")}
          value={ui("Guidance only")}
          helper={ui("Use the source page to perform the real follow-up")}
          iconPath="/workspace"
          tone="neutral"
        />
      </OperationalWorkspaceStats>

      <section className="section operations-feed-page__section">
        <div className="section__title operations-feed-page__section-title">
          <span className="operations-feed-page__section-icon"><TenantNavIcon path="/real-time-operations-feed" size={16} /></span>
          <span>{ui("Operations feed controls")}</span>
        </div>
        <div className="card operations-feed-page__controls-card">
          <div className="operations-feed-page__toolbar">
            <label className="operations-feed-page__field">
              <span>{ui("Work area")}</span>
              <select className="operations-feed-page__select" value={eventDomain} onChange={(event) => setEventDomain(event.target.value as 'all' | EventDomain)}>
                {availableDomainFilters.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
              </select>
            </label>
            <label className="operations-feed-page__field">
              <span>{ui("Urgency")}</span>
              <select className="operations-feed-page__select" value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | EventUrgency)}>
                {URGENCY_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
              </select>
            </label>
            <button className="button button--secondary operations-feed-page__toolbar-action" type="button" onClick={() => feedQuery.refetch()} disabled={feedQuery.isFetching}>
              <TenantNavIcon path="/real-time-operations-feed" size={14} />{feedQuery.isFetching ? ui('Refreshing…') : ui('Refresh feed')}
            </button>
            <Link className="button button--secondary operations-feed-page__toolbar-action" to="/action-center"><TenantNavIcon path="/action-center" size={14} />{ui("Open Action Center")}</Link>
            <Link className="button button--secondary operations-feed-page__toolbar-action" to="/workspace"><TenantNavIcon path="/workspace" size={14} />{ui("Open Workspace")}</Link>
          </div>

          {feedQuery.isLoading ? (
            <div className="operations-feed-page__state" role="status">
              <span className="operations-feed-page__icon operations-feed-page__icon--blue"><TenantNavIcon path="/real-time-operations-feed" size={17} /></span>
              <div><div className="operations-feed-page__state-title">{ui("Loading the latest operations feed")}</div><p className="card__subtext">{ui("Collecting work and events permitted for the current role.")}</p></div>
            </div>
          ) : feedQuery.error ? (
            <div className="operations-feed-page__state" role="alert">
              <span className="operations-feed-page__icon operations-feed-page__icon--danger"><TenantNavIcon path="/alerts" size={17} /></span>
              <div><div className="operations-feed-page__state-title">{ui("The operations feed could not be loaded")}</div><p className="form-error">{feedQuery.error instanceof ApiError ? feedQuery.error.message : ui('Unable to load the operations feed.')}</p><button className="button button--secondary" type="button" onClick={() => feedQuery.refetch()}>{ui("Try again")}</button></div>
            </div>
          ) : (
            <div className="operations-feed-page__guidance-grid">
              <div className="operations-feed-page__guidance-item"><span className="operations-feed-page__guidance-icon"><TenantNavIcon path="/permissions" size={15} /></span><div><div className="operations-feed-page__guidance-title">{ui("Safe to review without editing")}</div><p className="card__subtext">{ui("This page does not replay events, publish messages, or update operational records.")}</p></div></div>
              <div className="operations-feed-page__guidance-item"><span className="operations-feed-page__guidance-icon"><TenantNavIcon path="/workspace" size={15} /></span><div><div className="operations-feed-page__guidance-title">{ui("How to follow up")}</div><p className="card__subtext">{guidance.coordination_guidance || ui('Open the source page for the item and complete the work there.')}</p></div></div>
              <div className="operations-feed-page__guidance-item"><span className="operations-feed-page__guidance-icon"><TenantNavIcon path="/real-time-operations-feed" size={15} /></span><div><div className="operations-feed-page__guidance-title">{ui("What the feed contains")}</div><p className="card__subtext">{guidance.incident_timeline_guidance || ui('The feed combines permitted work items and integration event summaries.')}</p></div></div>
              <div className="operations-feed-page__guidance-item"><span className="operations-feed-page__guidance-icon"><TenantNavIcon path="/reliability-command" size={15} /></span><div><div className="operations-feed-page__guidance-title">{ui("When something is blocked or failed")}</div><p className="card__subtext">{guidance.disruption_guidance || ui('Review the source workflow and coordinate a human response.')}</p></div></div>
            </div>
          )}

          {response?.generated_at ? <p className="card__subtext operations-feed-page__updated">{ui("Feed updated")} {formatDateTime(response.generated_at, locale, ui)}. {ui("Press Refresh feed whenever you need the latest snapshot.")}</p> : null}
        </div>
      </section>

      <section className="section operations-feed-page__section">
        <div className="section__title operations-feed-page__section-title">
          <span className="operations-feed-page__section-icon"><TenantNavIcon path="/real-time-operations-feed" size={16} /></span>
          <span>{ui("Operational coordination feed")}</span>
          {!feedQuery.isLoading && !feedQuery.error ? <span className="operations-feed-page__section-count">{formatLocalizedNumber(timeline.length, locale)}</span> : null}
        </div>
        {feedQuery.isLoading || feedQuery.error ? null : timeline.length === 0 ? (
          <div className="card operations-feed-page__state"><span className="operations-feed-page__icon operations-feed-page__icon--blue"><TenantNavIcon path="/real-time-operations-feed" size={17} /></span><div><div className="operations-feed-page__state-title">{ui("No matching items")}</div><p className="card__subtext">{ui("No work or integration event matched the selected work area and urgency.")}</p></div></div>
        ) : (
          <div className="operations-feed-page__timeline">
            {timeline.map((item) => {
              const sourceLink = sourceItemLink(item, ui);
              const actionCenterPath = relatedActionLink(item);
              const itemDomainIcon = domainIconPath(item.timeline_domain);
              const urgencyTone = String(item.urgency || 'low').toLowerCase();
              return (
                <article className={`card operations-feed-page__timeline-card operations-feed-page__timeline-card--${urgencyTone}`} key={item.timeline_item_id}>
                  <div className="operations-feed-page__item-header">
                    <div className="operations-feed-page__item-heading">
                      <span className={`operations-feed-page__icon operations-feed-page__icon--${urgencyTone === 'critical' ? 'danger' : urgencyTone === 'high' ? 'warning' : urgencyTone === 'medium' ? 'amber' : 'green'}`}><TenantNavIcon path={itemDomainIcon} size={17} /></span>
                      <div><div className="card__label">{itemSourceLabel(item, ui)}</div><h3 className="operations-feed-page__item-title">{itemTitle(item, ui)}</h3></div>
                    </div>
                    <span className={urgencyClass(item.urgency)}>{canonicalLabel(item.urgency, ui)}</span>
                  </div>

                  <p className="card__subtext operations-feed-page__item-summary">{item.summary || ui('No summary was provided.')}</p>

                  <div className="operations-feed-page__badge-row">
                    <span className={statusClass(item.event_status)}>{ui('Status:')} {canonicalLabel(item.event_status, ui)}</span>
                    <span className="operations-feed-page__badge operations-feed-page__badge--neutral">{ui("Observed")} {formatDateTime(item.observed_at || item.updated_at, locale, ui)}</span>
                    {item.timeline_type === 'event_delivery_disruption' && item.delivery_attempt_count != null && Number.isFinite(Number(item.delivery_attempt_count)) ? <span className="operations-feed-page__badge operations-feed-page__badge--neutral">{ui("Attempts:")} {formatLocalizedNumber(numberValue(item.delivery_attempt_count), locale)}</span> : null}
                    {item.timeline_type === 'event_delivery_disruption' && item.next_retry_at ? <span className="operations-feed-page__badge operations-feed-page__badge--neutral">{ui("Next planned retry:")} {formatDateTime(item.next_retry_at, locale, ui)}</span> : null}
                  </div>

                  <div className="operations-feed-page__next-step"><div className="card__label">{ui("Recommended next step")}</div><p className="card__subtext operations-feed-page__item-summary">{item.recommended_next_step || ui('Open the source page and review the item there.')}</p></div>

                  {canViewDiagnostics ? (
                    <details className="operations-feed-page__details"><summary><TenantNavIcon path="/system-context" size={14} />{ui("Technical event details")}</summary><dl className="operations-feed-page__details-grid"><dt>{ui("Timeline item")}</dt><dd>{item.timeline_item_id}</dd><dt>{ui("Correlation")}</dt><dd>{item.correlation_id || ui('Not reported')}</dd><dt>{ui("Priority score")}</dt><dd>{formatLocalizedNumber(numberValue(item.priority_score), locale)}</dd><dt>{ui("Source type")}</dt><dd>{item.source_reference?.source_type || ui('Not reported')}</dd><dt>{ui("Source record")}</dt><dd>{item.source_reference?.source_id || ui('Not reported')}</dd><dt>{ui("Payload information")}</dt><dd>{item.payload_material_redacted ? ui('Not included in this feed') : item.payload_material_present ? ui('Reported as present') : ui('Not reported')}</dd></dl></details>
                  ) : null}

                  {['event_stream_message', 'event_delivery_disruption'].includes(String(item.timeline_type)) && !sourceLink ? <p className="card__subtext operations-feed-page__item-summary">{ui("This integration item does not currently have a tenant working page. Use it for awareness and ask an administrator or support team to investigate when it is blocked or failed.")}</p> : null}

                  <div className="operations-feed-page__actions">
                    {sourceLink ? <Link className="button" to={sourceLink.to}><TenantNavIcon path={sourceLink.to.split('?')[0]} size={14} />{sourceLink.label}</Link> : null}
                    {actionCenterPath ? <Link className="button button--secondary" to={actionCenterPath}><TenantNavIcon path="/action-center" size={14} />{ui("Open in Action Center")}</Link> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section operations-feed-page__section">
        <div className="section__title operations-feed-page__section-title"><span className="operations-feed-page__section-icon"><TenantNavIcon path="/permissions" size={16} /></span><span>{ui("Why this feed is safe to use")}</span></div>
        <div className="operations-feed-page__safety-grid">
          {safetyEntries.length === 0 ? <div className="card operations-feed-page__card"><p className="card__subtext">{ui("Safety information was not returned by the backend.")}</p></div> : safetyEntries.map((entry) => (
            <div className="card operations-feed-page__safety-card" key={entry.key}><span className="operations-feed-page__icon operations-feed-page__icon--green"><TenantNavIcon path={safetyIconPath(entry.key)} size={16} /></span><div><div className="card__label">{ui("Guaranteed")}</div><div className="operations-feed-page__safety-title">{ui(entry.title)}</div><p className="card__subtext">{ui(entry.description)}</p></div></div>
          ))}
        </div>

        {canViewDiagnostics && technicalSafetyEntries.length > 0 ? (
          <details className="operations-feed-page__technical-safety"><summary><TenantNavIcon path="/system-context" size={14} />{ui("Technical safety details")}</summary><div className="operations-feed-page__technical-safety-grid">{technicalSafetyEntries.map(([key]) => <span className="operations-feed-page__badge operations-feed-page__badge--neutral" key={key}>{technicalSafetyLabel(key, ui)}</span>)}</div></details>
        ) : null}
      </section>
    </div>
  );
}
