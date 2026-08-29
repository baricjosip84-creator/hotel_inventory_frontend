import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { useRouteQueryState } from '../lib/useRouteQueryState';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './OperationalExperiencePages.css';

type ActionUrgency = 'critical' | 'high' | 'medium' | 'low';
type ActionDomain = 'all' | 'alerts' | 'execution' | 'control_tower' | 'decision_intelligence' | 'ai_governance' | 'multi_domain';

type OperationalAction = {
  action_id: string;
  action_domain: string;
  action_type: string;
  action_status: string;
  urgency: ActionUrgency | string;
  priority_score?: number | string | null;
  title: string;
  summary?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  recommended_next_step?: string | null;
  required_permission?: string | null;
  approval_required?: boolean;
  explainability?: {
    primary_factors?: string[];
    source_surface?: string;
    human_action_only?: boolean;
  };
  safety_contract?: Record<string, boolean>;
  created_at?: string | null;
  updated_at?: string | null;
};

type ControlTowerTraceability = {
  traceability_model?: string;
  traceability_score?: number | string | null;
  traceability_posture?: string | null;
  control_tower_action_count?: number;
  execution_action_count?: number;
  governance_action_count?: number;
  critical_action_count?: number;
  approval_required_count?: number;
  source_workflow_linked_count?: number;
  blockers?: string[];
  orchestration_lanes?: Array<{
    lane_id?: string;
    source_actions?: string[];
    target_actions?: string[];
    manual_coordination_required?: boolean;
  }>;
};

type ControlTowerRemediationFeedbackLoop = {
  feedback_model?: string;
  feedback_score?: number | string | null;
  feedback_posture?: string | null;
  control_tower_action_count?: number;
  remediation_action_count?: number;
  governance_action_count?: number;
  blocked_action_count?: number;
  high_risk_action_count?: number;
  approval_required_count?: number;
  source_evidence_coverage_score?: number;
  remediation_coverage_score?: number;
  remediation_outcome_buckets?: Record<string, number>;
  blockers?: string[];
  required_manual_evidence?: string[];
  recommended_next_step?: string;
};

type ControlTowerRemediationEffectivenessReview = {
  effectiveness_model?: string;
  effectiveness_score?: number | string | null;
  effectiveness_posture?: string | null;
  remediation_action_count?: number;
  control_tower_signal_count?: number;
  review_ready_action_count?: number;
  blocked_remediation_count?: number;
  high_risk_remediation_count?: number;
  source_evidence_score?: number;
  governance_coverage_score?: number;
  review_readiness_score?: number;
  blockers?: string[];
  effectiveness_review_contract?: string[];
  recommended_next_step?: string;
};

type ControlTowerRemediationEscalationGovernance = {
  escalation_model?: string;
  escalation_score?: number | string | null;
  escalation_posture?: string | null;
  remediation_action_count?: number;
  control_tower_signal_count?: number;
  blocked_remediation_count?: number;
  escalated_remediation_count?: number;
  high_risk_remediation_count?: number;
  approval_required_count?: number;
  escalation_candidate_count?: number;
  source_evidence_score?: number;
  governance_gate_score?: number;
  escalation_coverage_score?: number;
  blockers?: string[];
  escalation_lanes?: Array<{
    lane_id?: string;
    action_ids?: string[];
    manual_owner_required?: boolean;
    manual_governance_review_required?: boolean;
  }>;
  escalation_contract?: string[];
  recommended_next_step?: string;
};


type ControlTowerRemediationClosureVerificationGate = {
  closure_gate_model?: string;
  closure_score?: number | string | null;
  closure_posture?: string | null;
  remediation_action_count?: number;
  control_tower_signal_count?: number;
  closure_candidate_count?: number;
  blocked_remediation_count?: number;
  escalated_remediation_count?: number;
  high_risk_remediation_count?: number;
  source_evidence_score?: number;
  escalation_clearance_score?: number;
  governance_closure_score?: number;
  blockers?: string[];
  closure_verification_contract?: string[];
  recommended_next_step?: string;
};

type ControlTowerRemediationResponseContractAudit = {
  audit_model?: string;
  audit_score?: number | string | null;
  audit_posture?: string | null;
  expected_contract_keys?: string[];
  populated_contract_keys?: string[];
  missing_contract_keys?: string[];
  contract_coverage_score?: number | string | null;
  blocker_counts_by_contract_key?: Record<string, number>;
  total_blocker_count?: number;
  blockers?: string[];
  audit_contract?: string[];
  recommended_next_step?: string;
};

type ControlTowerRouteExposureAudit = {
  audit_model?: string;
  route_path?: string;
  http_method?: string;
  required_permission?: string;
  validation_contract?: {
    allowed_query_params?: string[];
    bounded_limit?: boolean;
    write_methods_allowed?: boolean;
  };
  frontend_rendered_panels?: string[];
  backend_returned_panels?: string[];
  missing_frontend_panels?: string[];
  route_exposure_score?: number | string | null;
  route_exposure_posture?: string | null;
  blockers?: string[];
  audit_contract?: string[];
  recommended_next_step?: string;
};

type ActionCenterSummary = {

  total_actions?: number;
  by_urgency?: Record<string, number>;
  by_domain?: Record<string, number>;
  by_status?: Record<string, number>;
  approval_required_count?: number;
  highest_urgency?: string | null;
};

type ActionCenterResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    capabilities?: string[];
    safety_contract?: Record<string, boolean>;
  };
  filters?: {
    action_domain?: string | null;
    urgency?: string | null;
    limit?: number;
  };
  summary?: ActionCenterSummary;
  control_tower_orchestration_traceability?: ControlTowerTraceability;
  control_tower_remediation_feedback_loop?: ControlTowerRemediationFeedbackLoop;
  control_tower_remediation_effectiveness_review?: ControlTowerRemediationEffectivenessReview;
  control_tower_remediation_escalation_governance?: ControlTowerRemediationEscalationGovernance;
  control_tower_remediation_closure_verification_gate?: ControlTowerRemediationClosureVerificationGate;
  control_tower_remediation_response_contract_audit?: ControlTowerRemediationResponseContractAudit;
  control_tower_route_exposure_audit?: ControlTowerRouteExposureAudit;
  actions?: OperationalAction[];
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};


const ACTION_DOMAIN_VALUES = ['all', 'alerts', 'execution', 'control_tower', 'decision_intelligence', 'ai_governance', 'multi_domain'] as const;

const ACTION_DOMAINS: Array<{ value: ActionDomain; label: string }> = [
  { value: 'all', label: 'All domains' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'execution', label: 'Execution' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const URGENCY_FILTER_VALUES = ['all', 'critical', 'high', 'medium', 'low'] as const;

const URGENCY_FILTERS: Array<{ value: 'all' | ActionUrgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];



const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 16
};

const selectStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: '10px 12px',
  background: '#ffffff',
  color: '#0f172a',
  minHeight: 44,
  minWidth: 190
};

const actionListStyle: CSSProperties = {
  display: 'grid',
  gap: 12
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  borderRadius: 999,
  padding: '4px 9px',
  background: '#f1f5f9',
  color: '#334155',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'capitalize'
};




function urgencyBadgeStyle(urgency?: string | null): CSSProperties {
  if (urgency === 'critical') return { ...badgeStyle, background: '#fee2e2', color: '#991b1b' };
  if (urgency === 'high') return { ...badgeStyle, background: '#ffedd5', color: '#9a3412' };
  if (urgency === 'medium') return { ...badgeStyle, background: '#fef3c7', color: '#92400e' };
  return { ...badgeStyle, background: '#dcfce7', color: '#166534' };
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}



function formatDateTime(value: string | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  return value ? formatLocalizedDateTime(value, locale) : ui('Not reported');
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function canonicalLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const raw = String(value || 'unknown');
  const specialLabels: Record<string, string> = {
    ai_governance: 'AI governance',
    control_tower: 'Control tower',
    decision_intelligence: 'Decision intelligence',
    multi_domain: 'Multi-domain',
    read_only: 'Read-only',
    tenant_isolated: 'Tenant isolated',
    permission_gated: 'Permission gated',
    human_action_only: 'Human action only',
    approval_gated_when_required: 'Approval gated when required',
    no_inventory_mutation: 'No inventory mutation'
  };
  const humanized = specialLabels[raw] || formatLabel(raw).replace(/^./, (character) => character.toUpperCase());
  return ui(humanized);
}

function executionModeLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (value === 'read_only_action_aggregation_human_operated') {
    return ui('Read-only, human-operated');
  }
  return canonicalLabel(value, ui);
}

function actionTitleLabel(action: OperationalAction): string {
  const title = formatLabel(action.title);
  if (action.action_domain === 'alerts' && title === title.toUpperCase()) {
    return title.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
  }
  return title;
}

function actionDomainIconPath(domain?: string | null): string {
  if (domain === 'alerts') return '/alerts';
  if (domain === 'execution') return '/execution-tasks';
  if (domain === 'control_tower') return '/reliability-command';
  if (domain === 'decision_intelligence') return '/intelligence-review';
  if (domain === 'ai_governance') return '/ai-copilot';
  return '/action-center';
}

function urgencyToneClass(urgency?: string | null): string {
  if (urgency === 'critical') return 'action-center-icon--danger';
  if (urgency === 'high' || urgency === 'medium') return 'action-center-icon--warning';
  return 'action-center-icon--blue';
}

function sourceSurfaceToAppPath(sourceSurface?: string): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) {
    return null;
  }

  const tenantRoutes = new Set([
    '/alerts',
    '/execution-tasks',
    '/execution-requests',
    '/insights',
    '/system-context',
    '/automation-schedules',
    '/inventory-reservations',
    '/inventory-requisitions',
    '/procurement-recommendations',
    '/reports'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

type SourceActionLink = { to: string; label: string };

function sourceActionLink(action: OperationalAction): SourceActionLink | null {
  if (action.action_domain === 'alerts') {
    const params = new URLSearchParams({ resolved: 'false' });
    const search = String(action.summary || action.title || '').trim();
    if (search) params.set('search', search);
    return { to: `/alerts?${params.toString()}`, label: 'Open alert workflow' };
  }

  if (action.action_domain === 'execution' && action.source_id) {
    const params = new URLSearchParams({ task_id: action.source_id });
    return { to: `/execution-tasks?${params.toString()}`, label: 'Open execution task' };
  }

  if (['decision_intelligence', 'ai_governance'].includes(action.action_domain)) {
    const params = new URLSearchParams({ source_action_id: action.action_id });
    return { to: `/intelligence-review?${params.toString()}`, label: 'Open intelligence review' };
  }

  const sourcePath = sourceSurfaceToAppPath(action.explainability?.source_surface);
  return sourcePath ? { to: sourcePath, label: 'Open source workflow' } : null;
}

async function fetchActionCenter(domain: ActionDomain, urgency: 'all' | ActionUrgency, sourceActionId?: string | null): Promise<ActionCenterResponse> {
  const params = new URLSearchParams({ limit: sourceActionId ? '100' : '50' });

  if (domain !== 'all') {
    params.set('action_domain', domain);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  return apiRequest<ActionCenterResponse>(`/operational-action-center/summary?${params.toString()}`);
}

export default function OperationalActionCenterPage() {
  const { locale, ui } = useAppTranslation();
  const [searchParams] = useSearchParams();
  const sourceActionId = searchParams.get('source_action_id');
  const [domain, setDomain] = useRouteQueryState<ActionDomain>({
    paramName: 'domain',
    defaultValue: 'all',
    allowedValues: ACTION_DOMAIN_VALUES
  });
  const [urgency, setUrgency] = useRouteQueryState<'all' | ActionUrgency>({
    paramName: 'urgency',
    defaultValue: 'all',
    allowedValues: URGENCY_FILTER_VALUES
  });

  const canViewAlerts = hasPermission(TENANT_PERMISSIONS.ALERTS_READ);
  const canViewExecutionTasks = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const canViewControlTower = hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ);
  const canViewDecisionIntelligence = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  const availableDomains = useMemo(() => {
    const allowed = new Set<ActionDomain>(['all']);
    if (canViewAlerts) allowed.add('alerts');
    if (canViewExecutionTasks) allowed.add('execution');
    if (canViewControlTower) allowed.add('control_tower');
    if (canViewDecisionIntelligence) {
      allowed.add('decision_intelligence');
      allowed.add('ai_governance');
      allowed.add('multi_domain');
    }
    return ACTION_DOMAINS.filter((option) => allowed.has(option.value));
  }, [canViewAlerts, canViewControlTower, canViewDecisionIntelligence, canViewExecutionTasks]);

  useEffect(() => {
    if (!availableDomains.some((option) => option.value === domain)) {
      setDomain('all');
    }
  }, [availableDomains, domain, setDomain]);

  const actionCenterQuery = useQuery({
    queryKey: ['operational-action-center', domain, urgency, sourceActionId],
    queryFn: () => fetchActionCenter(domain, urgency, sourceActionId)
  });

  const response = actionCenterQuery.data;
  const actions = response?.actions || [];
  const selectedSourceAction = sourceActionId ? actions.find((action) => action.action_id === sourceActionId) : null;
  const summary = response?.summary || {};

  useEffect(() => {
    if (!selectedSourceAction) return;
    const element = document.getElementById(`action-${selectedSourceAction.action_id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedSourceAction]);

  if (actionCenterQuery.isLoading) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800 }}>{ui("Loading Action Center")}</div>
        <p className="card__subtext">{ui("Collecting the actions that are visible to your role.")}</p>
      </div>
    );
  }

  if (actionCenterQuery.error) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800 }}>{ui("Action Center could not be loaded")}</div>
        <p className="form-error">
          {actionCenterQuery.error instanceof ApiError
            ? actionCenterQuery.error.message
            : ui('Unable to load the action center.')}
        </p>
        <button className="button button--secondary" type="button" onClick={() => actionCenterQuery.refetch()}>
          {ui("Try again")}
        </button>
      </div>
    );
  }

  return (
    <div className="operational-action-center-page io-operational-page io-workspace-page io-workspace-legacy-normalized">
      <OperationalWorkspaceHero
        iconPath="/action-center"
        eyebrow={ui("Command & prioritization")}
        title={ui("Action Center")}
        description={ui("Prioritized, tenant-scoped operational work gathered from authoritative source workflows. Review what needs attention here, then complete the real work on its source page.")}
        aside={<OperationalWorkspaceStatus value={ui("Read-only")} label={ui("prioritization and routing workspace")} />}
      />

      <OperationalWorkspaceStats ariaLabel={ui("Action Center overview")}>
        <OperationalWorkspaceStatCard
          label={ui("Open actions shown")}
          value={formatLocalizedNumber(numberValue(summary.total_actions ?? actions.length), locale)}
          helper={ui("Highest-priority actions currently returned for your access")}
          iconPath="/action-center"
          tone="blue"
        />
        <OperationalWorkspaceStatCard
          label={ui("Highest urgency")}
          value={summary.highest_urgency ? canonicalLabel(summary.highest_urgency, ui) : ui('None')}
          helper={ui("Most urgent level among the actions shown")}
          iconPath="/alerts"
          tone={['critical'].includes(String(summary.highest_urgency || '').toLowerCase()) ? 'danger' : ['high', 'medium'].includes(String(summary.highest_urgency || '').toLowerCase()) ? 'warn' : 'good'}
        />
        <OperationalWorkspaceStatCard
          label={ui("Approval gated")}
          value={formatLocalizedNumber(numberValue(summary.approval_required_count), locale)}
          helper={ui("Items requiring human governance review")}
          iconPath="/intelligence-review"
          tone={numberValue(summary.approval_required_count) > 0 ? 'warn' : 'neutral'}
        />
        <OperationalWorkspaceStatCard
          label={ui("Execution mode")}
          value={executionModeLabel(response?.definition?.execution_mode, ui)}
          helper={ui("Guidance only; this page does not change source records")}
          iconPath="/execution-tasks"
          tone="neutral"
        />
      </OperationalWorkspaceStats>

      <div className="card action-center-info-card">
        <span className="action-center-icon action-center-icon--blue"><TenantNavIcon path="/action-center" size={18} /></span>
        <div>
          <div className="action-center-info-title">{ui("How this page works")}</div>
          <p className="card__subtext">
            {ui("The Action Center combines work from several parts of the tenant account. It is advisory and read-only: use the source-workflow button on an item to review or complete the real work.")}
          </p>
        </div>
      </div>

      <section className="section action-center-inbox-section">
        <div className="section__title action-center-section-title">
          <span className="action-center-section-icon"><TenantNavIcon path="/action-center" size={17} /></span>
          <span>{ui("Action inbox")}</span>
        </div>
        <div className="card action-center-inbox-shell">
          <div style={toolbarStyle} className="action-center-toolbar">
            <label className="action-center-filter-field">
              <span>{ui("Domain")}</span>
              <select aria-label={ui("Filter by action domain")} style={selectStyle} value={domain} onChange={(event) => setDomain(event.target.value as ActionDomain)}>
                {availableDomains.map((option) => (
                  <option key={option.value} value={option.value}>{ui(option.label)}</option>
                ))}
              </select>
            </label>
            <label className="action-center-filter-field">
              <span>{ui("Urgency")}</span>
              <select aria-label={ui("Filter by urgency")} style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | ActionUrgency)}>
                {URGENCY_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{ui(option.label)}</option>
                ))}
              </select>
            </label>
            <button className="button button--secondary action-center-refresh" type="button" onClick={() => actionCenterQuery.refetch()} disabled={actionCenterQuery.isFetching}>
              {actionCenterQuery.isFetching ? ui('Refreshing…') : ui('Refresh')}
            </button>
          </div>

          {sourceActionId && !actionCenterQuery.isLoading && !actionCenterQuery.error ? (
            <p className={selectedSourceAction ? 'card__subtext' : 'form-error'}>
              {selectedSourceAction
                ? ui('The requested action is highlighted below.')
                : ui('The requested action was not returned by the current filters or is no longer pending.')}
            </p>
          ) : null}

          {actions.length === 0 ? (
            <p className="card__subtext">{ui("No action-center items matched the selected filters.")}</p>
          ) : (
            <div style={actionListStyle}>
              {actions.map((action) => {
                const sourceLink = sourceActionLink(action);

                return (
                  <article
                    id={`action-${action.action_id}`}
                    key={action.action_id}
                    className={`card action-center-action-card action-center-action-card--${String(action.urgency || 'low')}`}
                    style={{
                      outline: sourceActionId === action.action_id ? '3px solid var(--color-primary)' : undefined,
                      outlineOffset: sourceActionId === action.action_id ? 2 : undefined
                    }}
                  >
                    <div className="action-center-action-header">
                      <div className="action-center-action-lead">
                        <span className={`action-center-icon ${urgencyToneClass(action.urgency)}`}><TenantNavIcon path={actionDomainIconPath(action.action_domain)} size={17} /></span>
                        <div className="action-center-action-title-copy">
                          <div className="action-center-action-title">{actionTitleLabel(action)}</div>
                          <div className="card__subtext">{action.summary || ui('No summary provided.')}</div>
                        </div>
                      </div>
                      <div className="action-center-badge-row">
                        <span style={urgencyBadgeStyle(action.urgency)}>{canonicalLabel(action.urgency, ui)}</span>
                        <span style={badgeStyle}>{canonicalLabel(action.action_domain, ui)}</span>
                        <span style={badgeStyle}>{canonicalLabel(action.action_status, ui)}</span>
                      </div>
                    </div>

                    <div className="action-center-action-guidance">
                      <span className="action-center-action-guidance-label">{ui("Recommended next step")}</span>
                      <span>{action.recommended_next_step || ui('Review source workflow before acting.')}</span>
                    </div>
                    <div className="action-center-action-footer">
                      <span className="card__subtext">{ui("Updated:")} {formatDateTime(action.updated_at || action.created_at, locale, ui)}</span>
                      {sourceLink ? (
                        <Link className="button button--secondary action-center-source-button" to={sourceLink.to}>
                          <TenantNavIcon path={sourceLink.to.split('?')[0]} size={15} />
                          <span>{ui(sourceLink.label)}</span>
                        </Link>
                      ) : null}
                    </div>

                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
