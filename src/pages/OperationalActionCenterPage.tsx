import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { useRouteQueryState } from '../lib/useRouteQueryState';

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


const CONTROL_TOWER_RENDERED_PANEL_KEYS = [
  'control_tower_orchestration_traceability',
  'control_tower_remediation_feedback_loop',
  'control_tower_remediation_effectiveness_review',
  'control_tower_remediation_escalation_governance',
  'control_tower_remediation_closure_verification_gate',
  'control_tower_remediation_response_contract_audit',
  'control_tower_route_exposure_audit'
] as const;

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

const USER_FACING_SAFETY_KEYS = new Set([
  'read_only',
  'tenant_isolated',
  'permission_gated',
  'human_action_only',
  'approval_gated_when_required',
  'no_inventory_mutation'
]);

const cardGridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
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

const actionListStyle: CSSProperties = {
  display: 'grid',
  gap: 12
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

const detailsStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 14,
  background: 'var(--color-surface)',
  padding: '14px 16px'
};

const detailsSummaryStyle: CSSProperties = {
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 16
};

const actionMetadataStyle: CSSProperties = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: '1px solid var(--color-border)',
  overflowWrap: 'anywhere'
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

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not reported';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function executionModeLabel(value?: string | null): string {
  if (value === 'read_only_action_aggregation_human_operated') {
    return 'Read-only, human-operated';
  }
  return formatLabel(value);
}

function actionTitleLabel(action: OperationalAction): string {
  const title = formatLabel(action.title);
  if (action.action_domain === 'alerts' && title === title.toUpperCase()) {
    return title.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
  }
  return title;
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
    return { to: `/ai-review?${params.toString()}`, label: 'Open AI review' };
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
  const canViewTenantDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const canViewGovernanceReadiness = canViewControlTower || canViewDecisionIntelligence;
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
  const traceability = response?.control_tower_orchestration_traceability || {};
  const remediationFeedback = response?.control_tower_remediation_feedback_loop || {};
  const effectivenessReview = response?.control_tower_remediation_effectiveness_review || {};
  const escalationGovernance = response?.control_tower_remediation_escalation_governance || {};
  const closureGate = response?.control_tower_remediation_closure_verification_gate || {};
  const contractAudit = response?.control_tower_remediation_response_contract_audit || {};
  const routeExposureAudit = response?.control_tower_route_exposure_audit || {};
  const frontendPanelContractDriftCount = CONTROL_TOWER_RENDERED_PANEL_KEYS.filter((key) => {
    return !(routeExposureAudit.frontend_rendered_panels || []).includes(key);
  }).length;
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  useEffect(() => {
    if (!selectedSourceAction) return;
    const element = document.getElementById(`action-${selectedSourceAction.action_id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedSourceAction]);

  if (actionCenterQuery.isLoading) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800 }}>Loading Action Center</div>
        <p className="card__subtext">Collecting the actions that are visible to your role.</p>
      </div>
    );
  }

  if (actionCenterQuery.error) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800 }}>Action Center could not be loaded</div>
        <p className="form-error">
          {actionCenterQuery.error instanceof ApiError
            ? actionCenterQuery.error.message
            : 'Unable to load the action center.'}
        </p>
        <button className="button button--secondary" type="button" onClick={() => actionCenterQuery.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card-grid" style={cardGridStyle}>
        <div className="card">
          <div className="card__label">Open actions shown</div>
          <div className="card__value">{numberValue(summary.total_actions ?? actions.length)}</div>
          <div className="card__subtext">The highest-priority actions currently returned for your access.</div>
        </div>
        <div className="card">
          <div className="card__label">Highest urgency</div>
          <div className="card__value" style={{ textTransform: 'capitalize' }}>{summary.highest_urgency ? formatLabel(summary.highest_urgency) : 'None'}</div>
          <div className="card__subtext">The most urgent level among the actions shown.</div>
        </div>
        <div className="card">
          <div className="card__label">Approval gated</div>
          <div className="card__value">{numberValue(summary.approval_required_count)}</div>
          <div className="card__subtext">Items requiring human governance review.</div>
        </div>
        <div className="card">
          <div className="card__label">Execution mode</div>
          <div className="card__value" style={{ fontSize: 18 }}>{executionModeLabel(response?.definition?.execution_mode)}</div>
          <div className="card__subtext">This page guides people to source workflows but does not change records itself.</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800 }}>How this page works</div>
        <p className="card__subtext" style={{ marginBottom: 0 }}>
          The Action Center combines work from several parts of the tenant account. It is advisory and read-only: use the source-workflow button on an item to review or complete the real work.
        </p>
      </div>

      <section className="section">
        <div className="section__title">Action inbox</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select aria-label="Filter by action domain" style={selectStyle} value={domain} onChange={(event) => setDomain(event.target.value as ActionDomain)}>
              {availableDomains.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select aria-label="Filter by urgency" style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | ActionUrgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => actionCenterQuery.refetch()} disabled={actionCenterQuery.isFetching}>
              {actionCenterQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {sourceActionId && !actionCenterQuery.isLoading && !actionCenterQuery.error ? (
            <p className={selectedSourceAction ? 'card__subtext' : 'form-error'}>
              {selectedSourceAction
                ? 'The requested action is highlighted below.'
                : 'The requested action was not returned by the current filters or is no longer pending.'}
            </p>
          ) : null}

          {actions.length === 0 ? (
            <p className="card__subtext">No action-center items matched the selected filters.</p>
          ) : (
            <div style={actionListStyle}>
              {actions.map((action) => {
                const sourceLink = sourceActionLink(action);

                return (
                  <article
                    id={`action-${action.action_id}`}
                    key={action.action_id}
                    className="card"
                    style={{
                      background: 'var(--color-surface-soft)',
                      outline: sourceActionId === action.action_id ? '3px solid var(--color-primary)' : undefined,
                      outlineOffset: sourceActionId === action.action_id ? 2 : undefined
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{actionTitleLabel(action)}</div>
                        <div className="card__subtext">{action.summary || 'No summary provided.'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <span style={urgencyBadgeStyle(action.urgency)}>{formatLabel(action.urgency)}</span>
                        <span style={badgeStyle}>{formatLabel(action.action_domain)}</span>
                        <span style={badgeStyle}>{formatLabel(action.action_status)}</span>
                      </div>
                    </div>

                    <div className="card__subtext">
                      Recommended next step: {action.recommended_next_step || 'Review source workflow before acting.'}
                    </div>
                    <div className="card__subtext">
                      Updated: {formatDateTime(action.updated_at || action.created_at)}
                    </div>
                    {sourceLink ? (
                      <div style={{ marginTop: 10 }}>
                        <Link className="button button--secondary" to={sourceLink.to}>{sourceLink.label}</Link>
                      </div>
                    ) : null}
                    <details style={actionMetadataStyle}>
                      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Technical details</summary>
                      <div className="card__subtext">Priority score: {numberValue(action.priority_score)}</div>
                      <div className="card__subtext">
                        Action: {action.action_id}{action.source_id ? ` · Source: ${action.source_id}` : ''}
                      </div>
                      {action.explainability?.primary_factors?.length ? (
                        <div className="card__subtext">
                          Evidence: {action.explainability.primary_factors.map((factor) => formatLabel(factor)).join(' · ')}
                        </div>
                      ) : null}
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>


      {canViewGovernanceReadiness ? (
      <details style={{ ...detailsStyle, marginTop: 16 }}>
        <summary style={detailsSummaryStyle}>Governance readiness details</summary>
        <p className="card__subtext">
          Advanced read-only checks showing whether related actions have enough ownership, evidence, review, escalation, and closure information. These scores describe workflow readiness, not the tenant's overall operational health.
        </p>

        <section className="section" style={{ marginTop: 12 }}>
        <div className="section__title">Control Tower orchestration traceability</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">Traceability score</div>
            <div className="card__value">{numberValue(traceability.traceability_score)}</div>
            <div className="card__subtext">Manual orchestration readiness across control-tower, execution, and governance actions.</div>
          </div>
          <div className="card">
            <div className="card__label">Posture</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(traceability.traceability_posture)}</div>
            <div className="card__subtext">Read-only; source workflows remain authoritative.</div>
          </div>
          <div className="card">
            <div className="card__label">Control tower actions</div>
            <div className="card__value">{numberValue(traceability.control_tower_action_count)}</div>
            <div className="card__subtext">Signals available for manual coordination trace.</div>
          </div>
          <div className="card">
            <div className="card__label">Execution / governance links</div>
            <div className="card__value">{numberValue(traceability.execution_action_count) + numberValue(traceability.governance_action_count)}</div>
            <div className="card__subtext">Related operational and decision-review actions in the same inbox.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Traceability blockers</div>
          {traceability.blockers?.length ? (
            <ul>
              {traceability.blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No traceability blockers reported by the backend.</p>
          )}
        </div>
      </section>


      <section className="section">
        <div className="section__title">Control Tower remediation feedback loop</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">Feedback score</div>
            <div className="card__value">{numberValue(remediationFeedback.feedback_score)}</div>
            <div className="card__subtext">Read-only maturity score for remediation outcome evidence.</div>
          </div>
          <div className="card">
            <div className="card__label">Feedback posture</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(remediationFeedback.feedback_posture)}</div>
            <div className="card__subtext">Human review remains required before closure.</div>
          </div>
          <div className="card">
            <div className="card__label">Remediation actions</div>
            <div className="card__value">{numberValue(remediationFeedback.remediation_action_count)}</div>
            <div className="card__subtext">Open remediation workflows available for feedback review.</div>
          </div>
          <div className="card">
            <div className="card__label">Evidence coverage</div>
            <div className="card__value">{numberValue(remediationFeedback.source_evidence_coverage_score)}%</div>
            <div className="card__subtext">Actions with source workflow traceability.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Feedback blockers</div>
          {remediationFeedback.blockers?.length ? (
            <ul>
              {remediationFeedback.blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No remediation feedback blockers reported by the backend.</p>
          )}
          <div className="card__subtext">Recommended next step: {remediationFeedback.recommended_next_step || 'Review source workflows before closing remediation feedback.'}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Required manual evidence</div>
          {remediationFeedback.required_manual_evidence?.length ? (
            <ul>
              {remediationFeedback.required_manual_evidence.map((item) => <li key={item}>{formatLabel(item)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No manual evidence requirements reported.</p>
          )}
        </div>
      </section>


      <section className="section">
        <div className="section__title">Control Tower remediation effectiveness review</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">Effectiveness score</div>
            <div className="card__value">{numberValue(effectivenessReview.effectiveness_score)}</div>
            <div className="card__subtext">Manual before/after review readiness for remediation outcomes.</div>
          </div>
          <div className="card">
            <div className="card__label">Effectiveness posture</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(effectivenessReview.effectiveness_posture)}</div>
            <div className="card__subtext">No remediation is executed from this page.</div>
          </div>
          <div className="card">
            <div className="card__label">Review-ready actions</div>
            <div className="card__value">{numberValue(effectivenessReview.review_ready_action_count)}</div>
            <div className="card__subtext">Remediation items available for human effectiveness review.</div>
          </div>
          <div className="card">
            <div className="card__label">Governance coverage</div>
            <div className="card__value">{numberValue(effectivenessReview.governance_coverage_score)}%</div>
            <div className="card__subtext">High-risk remediation actions with governance gate context.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Effectiveness blockers</div>
          {effectivenessReview.blockers?.length ? (
            <ul>
              {effectivenessReview.blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No effectiveness blockers reported by the backend.</p>
          )}
          <div className="card__subtext">Recommended next step: {effectivenessReview.recommended_next_step || 'Complete before/after evidence review before closing remediation.'}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Effectiveness review contract</div>
          {effectivenessReview.effectiveness_review_contract?.length ? (
            <ul>
              {effectivenessReview.effectiveness_review_contract.map((item) => <li key={item}>{formatLabel(item)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No effectiveness review contract reported.</p>
          )}
        </div>
      </section>



      <section className="section">
        <div className="section__title">Control Tower remediation escalation governance</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">Escalation score</div>
            <div className="card__value">{numberValue(escalationGovernance.escalation_score)}</div>
            <div className="card__subtext">Manual governance readiness for blocked or high-risk remediation items.</div>
          </div>
          <div className="card">
            <div className="card__label">Escalation posture</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(escalationGovernance.escalation_posture)}</div>
            <div className="card__subtext">Closure remains blocked until human escalation decisions are recorded.</div>
          </div>
          <div className="card">
            <div className="card__label">Escalation candidates</div>
            <div className="card__value">{numberValue(escalationGovernance.escalation_candidate_count)}</div>
            <div className="card__subtext">Blocked, escalated, or high-risk remediation actions requiring review.</div>
          </div>
          <div className="card">
            <div className="card__label">Governance gate score</div>
            <div className="card__value">{numberValue(escalationGovernance.governance_gate_score)}%</div>
            <div className="card__subtext">High-risk remediation actions covered by approval context.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Escalation blockers</div>
          {escalationGovernance.blockers?.length ? (
            <ul>
              {escalationGovernance.blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No escalation governance blockers reported by the backend.</p>
          )}
          <div className="card__subtext">Recommended next step: {escalationGovernance.recommended_next_step || 'Run manual escalation review before closing blocked remediation outcomes.'}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Escalation contract</div>
          {escalationGovernance.escalation_contract?.length ? (
            <ul>
              {escalationGovernance.escalation_contract.map((item) => <li key={item}>{formatLabel(item)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No escalation contract reported.</p>
          )}
        </div>
      </section>


      <section className="section">
        <div className="section__title">Control Tower remediation closure verification gate</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">Closure score</div>
            <div className="card__value">{numberValue(closureGate.closure_score)}</div>
            <div className="card__subtext">Read-only gate score before remediation can be treated as closed.</div>
          </div>
          <div className="card">
            <div className="card__label">Closure posture</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(closureGate.closure_posture)}</div>
            <div className="card__subtext">Closure decisions must still be recorded in the source workflow.</div>
          </div>
          <div className="card">
            <div className="card__label">Closure candidates</div>
            <div className="card__value">{numberValue(closureGate.closure_candidate_count)}</div>
            <div className="card__subtext">Remediation actions available for manual closure verification.</div>
          </div>
          <div className="card">
            <div className="card__label">Escalation clearance</div>
            <div className="card__value">{numberValue(closureGate.escalation_clearance_score)}%</div>
            <div className="card__subtext">Blocked or escalated remediation must clear before closure.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Closure blockers</div>
          {closureGate.blockers?.length ? (
            <ul>
              {closureGate.blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No closure verification blockers reported by the backend.</p>
          )}
          <div className="card__subtext">Recommended next step: {closureGate.recommended_next_step || 'Run manual closure verification before closing remediation outcomes.'}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Closure verification contract</div>
          {closureGate.closure_verification_contract?.length ? (
            <ul>
              {closureGate.closure_verification_contract.map((item) => <li key={item}>{formatLabel(item)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No closure verification contract reported.</p>
          )}
        </div>
      </section>
      </details>
      ) : null}

      {canViewTenantDiagnostics ? (
        <details style={{ ...detailsStyle, marginTop: 16 }}>
          <summary style={detailsSummaryStyle}>Technical contract diagnostics</summary>
          <p className="card__subtext">
            Advanced checks shown only to users with tenant diagnostics access, confirming that the page and backend still agree about the information this screen requires.
          </p>

      <section className="section" style={{ marginTop: 12 }}>
        <div className="section__title">Control Tower remediation response contract audit</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">Contract audit score</div>
            <div className="card__value">{numberValue(contractAudit.audit_score)}</div>
            <div className="card__subtext">Backend response completeness for every remediation panel rendered here.</div>
          </div>
          <div className="card">
            <div className="card__label">Audit posture</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(contractAudit.audit_posture)}</div>
            <div className="card__subtext">Prevents frontend/backend contract drift.</div>
          </div>
          <div className="card">
            <div className="card__label">Coverage</div>
            <div className="card__value">{numberValue(contractAudit.contract_coverage_score)}%</div>
            <div className="card__subtext">Expected response objects currently populated.</div>
          </div>
          <div className="card">
            <div className="card__label">Open blockers</div>
            <div className="card__value">{numberValue(contractAudit.total_blocker_count)}</div>
            <div className="card__subtext">Combined blockers reported by remediation response objects.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Missing contract keys</div>
          {contractAudit.missing_contract_keys?.length ? (
            <ul>
              {contractAudit.missing_contract_keys.map((item) => <li key={item}>{formatLabel(item)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No missing Control Tower remediation response objects reported.</p>
          )}
          <div className="card__subtext">Recommended next step: {contractAudit.recommended_next_step || 'Keep response-contract checks in place before adding more Control Tower panels.'}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Audit contract</div>
          {contractAudit.audit_contract?.length ? (
            <ul>
              {contractAudit.audit_contract.map((item) => <li key={item}>{formatLabel(item)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No response-contract audit requirements reported.</p>
          )}
        </div>
      </section>


      <section className="section">
        <div className="section__title">Control Tower route exposure audit</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">Route exposure score</div>
            <div className="card__value">{numberValue(routeExposureAudit.route_exposure_score)}</div>
            <div className="card__subtext">Backend route contract coverage for the frontend Control Tower panels.</div>
          </div>
          <div className="card">
            <div className="card__label">Route posture</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(routeExposureAudit.route_exposure_posture)}</div>
            <div className="card__subtext">Detects summary endpoint / frontend panel drift.</div>
          </div>
          <div className="card">
            <div className="card__label">Endpoint</div>
            <div className="card__value" style={{ fontSize: 18 }}>{routeExposureAudit.http_method || 'GET'} {routeExposureAudit.route_path || '/operational-action-center/summary'}</div>
            <div className="card__subtext">Frontend summary endpoint expected by this page.</div>
          </div>
          <div className="card">
            <div className="card__label">Required permission</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(routeExposureAudit.required_permission)}</div>
            <div className="card__subtext">Backend permission gate expected for the route.</div>
          </div>
          <div className="card">
            <div className="card__label">Rendered panels</div>
            <div className="card__value">{numberValue(routeExposureAudit.frontend_rendered_panels?.length)}</div>
            <div className="card__subtext">Includes this route exposure audit panel to prevent self-audit drift.</div>
          </div>
          <div className="card">
            <div className="card__label">Missing panels</div>
            <div className="card__value">{numberValue(routeExposureAudit.missing_frontend_panels?.length)}</div>
            <div className="card__subtext">Backend response objects missing for panels rendered by this page.</div>
          </div>
          <div className="card">
            <div className="card__label">Frontend drift count</div>
            <div className="card__value">{numberValue(frontendPanelContractDriftCount)}</div>
            <div className="card__subtext">Local rendered-panel contract entries not acknowledged by backend audit.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Route exposure blockers</div>
          {routeExposureAudit.blockers?.length ? (
            <ul>
              {routeExposureAudit.blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No route exposure blockers reported by the backend.</p>
          )}
          <div className="card__subtext">Recommended next step: {routeExposureAudit.recommended_next_step || 'Keep route exposure regression checks in place before adding more Control Tower panels.'}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Route audit contract</div>
          {routeExposureAudit.audit_contract?.length ? (
            <ul>
              {routeExposureAudit.audit_contract.map((item) => <li key={item}>{formatLabel(item)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">No route exposure audit requirements reported.</p>
          )}
        </div>
      </section>
        </details>
      ) : null}

      <section className="section">
        <div className="section__title">Read-only safety guarantees</div>
        <div className="card-grid" style={cardGridStyle}>
          {safetyEntries.filter(([key]) => USER_FACING_SAFETY_KEYS.has(key)).map(([key]) => (
            <div className="card" key={key}>
              <div className="card__label">Guaranteed</div>
              <div style={{ fontWeight: 800 }}>{formatLabel(key)}</div>
            </div>
          ))}
        </div>
        <p className="card__subtext">Generated at: {formatDateTime(response?.generated_at)}</p>
      </section>
    </div>
  );
}
