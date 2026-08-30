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
  // OperationalWorkspaceMetaPill, // v3.49.50: repetitive tenant hero pills intentionally hidden; original rendering retained below.
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
  escalation_assignment?: {
    target_role?: string | null;
    due_at?: string | null;
    assigned_at?: string | null;
    overdue?: boolean;
  };
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

/*
const USER_FACING_SAFETY_KEYS = new Set([
  'read_only',
  'tenant_isolated',
  'permission_gated',
  'human_action_only',
  'approval_gated_when_required',
  'no_inventory_mutation'
]);
*/

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

const detailsStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 16,
  background: '#f8fafc',
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

function formatPercent(value: unknown, locale: AppLocale): string {
  return formatLocalizedNumber(numberValue(value) / 100, locale, { style: 'percent', maximumFractionDigits: 2 });
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

function escalationTargetLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (value === 'admin') return ui('Tenant Admin');
  if (value === 'manager') return ui('Manager');
  if (value === 'decision_intelligence_reviewer') return ui('Any Intelligence reviewer');
  return ui('Not assigned');
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
  const params = new URLSearchParams({ limit: sourceActionId ? '1' : '50' });

  if (sourceActionId) {
    params.set('source_action_id', sourceActionId);
  } else {
    if (domain !== 'all') params.set('action_domain', domain);
    if (urgency !== 'all') params.set('urgency', urgency);
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
  /* v3.49.50: retained for easy reversal with the hidden tenant-facing safety-guarantee block.
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);
  */

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
      {/*
        v3.49.50 — Tenant simplification. These repetitive hero pills are intentionally hidden.
        Original rendering preserved for easy reversal:
        <OperationalWorkspaceHero meta={<>
          <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Read-only guidance")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Source workflows authoritative")}</OperationalWorkspaceMetaPill>
        </>} />
      */}
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
                      {action.escalation_assignment ? (
                        <span className="card__subtext">
                          <strong>{ui('Escalated to:')}</strong> {escalationTargetLabel(action.escalation_assignment.target_role, ui)}
                          {action.escalation_assignment.due_at ? ` · ${ui('Due:')} ${formatDateTime(action.escalation_assignment.due_at, locale, ui)}` : ''}
                          {action.escalation_assignment.overdue ? ` · ${ui('Overdue')}` : ''}
                        </span>
                      ) : null}
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
                    {canViewTenantDiagnostics ? (
                      <details style={actionMetadataStyle} className="action-center-technical-details">
                        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{ui("Technical details")}</summary>
                        <div className="card__subtext">{ui("Priority score:")} {formatLocalizedNumber(numberValue(action.priority_score), locale)}</div>
                        <div className="card__subtext">
                          {ui("Action:")} {action.action_id}{action.source_id ? ` · ${ui('Source:')} ${action.source_id}` : ''}
                        </div>
                        {action.explainability?.primary_factors?.length ? (
                          <div className="card__subtext">
                            {ui("Evidence:")} {action.explainability.primary_factors.map((factor) => canonicalLabel(factor, ui)).join(' · ')}
                          </div>
                        ) : null}
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>


      {canViewGovernanceReadiness ? (
      <details style={{ ...detailsStyle, marginTop: 16 }} className="action-center-details">
        <summary style={detailsSummaryStyle}>{ui("Governance readiness details")}</summary>
        <p className="card__subtext">
          {ui("Advanced read-only checks showing whether related actions have enough ownership, evidence, review, escalation, and closure information. These scores describe workflow readiness, not the tenant's overall operational health.")}
        </p>

        <section className="section" style={{ marginTop: 12 }}>
        <div className="section__title">{ui("Control Tower orchestration traceability")}</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">{ui("Traceability score")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(traceability.traceability_score), locale)}</div>
            <div className="card__subtext">{ui("Manual orchestration readiness across control-tower, execution, and governance actions.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Posture")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{canonicalLabel(traceability.traceability_posture, ui)}</div>
            <div className="card__subtext">{ui("Read-only; source workflows remain authoritative.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Control tower actions")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(traceability.control_tower_action_count), locale)}</div>
            <div className="card__subtext">{ui("Signals available for manual coordination trace.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Execution / governance links")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(traceability.execution_action_count) + numberValue(traceability.governance_action_count), locale)}</div>
            <div className="card__subtext">{ui("Related operational and decision-review actions in the same inbox.")}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Traceability blockers")}</div>
          {traceability.blockers?.length ? (
            <ul>
              {traceability.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No traceability blockers reported by the backend.")}</p>
          )}
        </div>
      </section>


      <section className="section">
        <div className="section__title">{ui("Control Tower remediation feedback loop")}</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">{ui("Feedback score")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(remediationFeedback.feedback_score), locale)}</div>
            <div className="card__subtext">{ui("Read-only maturity score for remediation outcome evidence.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Feedback posture")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{canonicalLabel(remediationFeedback.feedback_posture, ui)}</div>
            <div className="card__subtext">{ui("Human review remains required before closure.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Remediation actions")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(remediationFeedback.remediation_action_count), locale)}</div>
            <div className="card__subtext">{ui("Open remediation workflows available for feedback review.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Evidence coverage")}</div>
            <div className="card__value">{formatPercent(remediationFeedback.source_evidence_coverage_score, locale)}</div>
            <div className="card__subtext">{ui("Actions with source workflow traceability.")}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Feedback blockers")}</div>
          {remediationFeedback.blockers?.length ? (
            <ul>
              {remediationFeedback.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No remediation feedback blockers reported by the backend.")}</p>
          )}
          <div className="card__subtext">{ui("Recommended next step:")} {remediationFeedback.recommended_next_step || ui('Review source workflows before closing remediation feedback.')}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Required manual evidence")}</div>
          {remediationFeedback.required_manual_evidence?.length ? (
            <ul>
              {remediationFeedback.required_manual_evidence.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No manual evidence requirements reported.")}</p>
          )}
        </div>
      </section>


      <section className="section">
        <div className="section__title">{ui("Control Tower remediation effectiveness review")}</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">{ui("Effectiveness score")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(effectivenessReview.effectiveness_score), locale)}</div>
            <div className="card__subtext">{ui("Manual before/after review readiness for remediation outcomes.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Effectiveness posture")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{canonicalLabel(effectivenessReview.effectiveness_posture, ui)}</div>
            <div className="card__subtext">{ui("No remediation is executed from this page.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Review-ready actions")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(effectivenessReview.review_ready_action_count), locale)}</div>
            <div className="card__subtext">{ui("Remediation items available for human effectiveness review.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Governance coverage")}</div>
            <div className="card__value">{formatPercent(effectivenessReview.governance_coverage_score, locale)}</div>
            <div className="card__subtext">{ui("High-risk remediation actions with governance gate context.")}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Effectiveness blockers")}</div>
          {effectivenessReview.blockers?.length ? (
            <ul>
              {effectivenessReview.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No effectiveness blockers reported by the backend.")}</p>
          )}
          <div className="card__subtext">{ui("Recommended next step:")} {effectivenessReview.recommended_next_step || ui('Complete before/after evidence review before closing remediation.')}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Effectiveness review contract")}</div>
          {effectivenessReview.effectiveness_review_contract?.length ? (
            <ul>
              {effectivenessReview.effectiveness_review_contract.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No effectiveness review contract reported.")}</p>
          )}
        </div>
      </section>



      <section className="section">
        <div className="section__title">{ui("Control Tower remediation escalation governance")}</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">{ui("Escalation score")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(escalationGovernance.escalation_score), locale)}</div>
            <div className="card__subtext">{ui("Manual governance readiness for blocked or high-risk remediation items.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Escalation posture")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{canonicalLabel(escalationGovernance.escalation_posture, ui)}</div>
            <div className="card__subtext">{ui("Closure remains blocked until human escalation decisions are recorded.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Escalation candidates")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(escalationGovernance.escalation_candidate_count), locale)}</div>
            <div className="card__subtext">{ui("Blocked, escalated, or high-risk remediation actions requiring review.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Governance gate score")}</div>
            <div className="card__value">{formatPercent(escalationGovernance.governance_gate_score, locale)}</div>
            <div className="card__subtext">{ui("High-risk remediation actions covered by approval context.")}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Escalation blockers")}</div>
          {escalationGovernance.blockers?.length ? (
            <ul>
              {escalationGovernance.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No escalation governance blockers reported by the backend.")}</p>
          )}
          <div className="card__subtext">{ui("Recommended next step:")} {escalationGovernance.recommended_next_step || ui('Run manual escalation review before closing blocked remediation outcomes.')}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Escalation contract")}</div>
          {escalationGovernance.escalation_contract?.length ? (
            <ul>
              {escalationGovernance.escalation_contract.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No escalation contract reported.")}</p>
          )}
        </div>
      </section>


      <section className="section">
        <div className="section__title">{ui("Control Tower remediation closure verification gate")}</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">{ui("Closure score")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(closureGate.closure_score), locale)}</div>
            <div className="card__subtext">{ui("Read-only gate score before remediation can be treated as closed.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Closure posture")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{canonicalLabel(closureGate.closure_posture, ui)}</div>
            <div className="card__subtext">{ui("Closure decisions must still be recorded in the source workflow.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Closure candidates")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(closureGate.closure_candidate_count), locale)}</div>
            <div className="card__subtext">{ui("Remediation actions available for manual closure verification.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Escalation clearance")}</div>
            <div className="card__value">{formatPercent(closureGate.escalation_clearance_score, locale)}</div>
            <div className="card__subtext">{ui("Blocked or escalated remediation must clear before closure.")}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Closure blockers")}</div>
          {closureGate.blockers?.length ? (
            <ul>
              {closureGate.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No closure verification blockers reported by the backend.")}</p>
          )}
          <div className="card__subtext">{ui("Recommended next step:")} {closureGate.recommended_next_step || ui('Run manual closure verification before closing remediation outcomes.')}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Closure verification contract")}</div>
          {closureGate.closure_verification_contract?.length ? (
            <ul>
              {closureGate.closure_verification_contract.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No closure verification contract reported.")}</p>
          )}
        </div>
      </section>
      </details>
      ) : null}

      {canViewTenantDiagnostics ? (
        <details style={{ ...detailsStyle, marginTop: 16 }} className="action-center-details">
          <summary style={detailsSummaryStyle}>{ui("Technical contract diagnostics")}</summary>
          <p className="card__subtext">
            {ui("Advanced checks shown only to users with tenant diagnostics access, confirming that the page and backend still agree about the information this screen requires.")}
          </p>

      <section className="section" style={{ marginTop: 12 }}>
        <div className="section__title">{ui("Control Tower remediation response contract audit")}</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">{ui("Contract audit score")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(contractAudit.audit_score), locale)}</div>
            <div className="card__subtext">{ui("Backend response completeness for every remediation panel rendered here.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Audit posture")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{canonicalLabel(contractAudit.audit_posture, ui)}</div>
            <div className="card__subtext">{ui("Prevents frontend/backend contract drift.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Coverage")}</div>
            <div className="card__value">{formatPercent(contractAudit.contract_coverage_score, locale)}</div>
            <div className="card__subtext">{ui("Expected response objects currently populated.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Open blockers")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(contractAudit.total_blocker_count), locale)}</div>
            <div className="card__subtext">{ui("Combined blockers reported by remediation response objects.")}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Missing contract keys")}</div>
          {contractAudit.missing_contract_keys?.length ? (
            <ul>
              {contractAudit.missing_contract_keys.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No missing Control Tower remediation response objects reported.")}</p>
          )}
          <div className="card__subtext">{ui("Recommended next step:")} {contractAudit.recommended_next_step || ui('Keep response-contract checks in place before adding more Control Tower panels.')}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Audit contract")}</div>
          {contractAudit.audit_contract?.length ? (
            <ul>
              {contractAudit.audit_contract.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No response-contract audit requirements reported.")}</p>
          )}
        </div>
      </section>


      <section className="section">
        <div className="section__title">{ui("Control Tower route exposure audit")}</div>
        <div className="card-grid" style={cardGridStyle}>
          <div className="card">
            <div className="card__label">{ui("Route exposure score")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(routeExposureAudit.route_exposure_score), locale)}</div>
            <div className="card__subtext">{ui("Backend route contract coverage for the frontend Control Tower panels.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Route posture")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{canonicalLabel(routeExposureAudit.route_exposure_posture, ui)}</div>
            <div className="card__subtext">{ui("Detects summary endpoint / frontend panel drift.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Endpoint")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{routeExposureAudit.http_method || 'GET'} {routeExposureAudit.route_path || '/operational-action-center/summary'}</div>
            <div className="card__subtext">{ui("Frontend summary endpoint expected by this page.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Required permission")}</div>
            <div className="card__value" style={{ fontSize: 18 }}>{routeExposureAudit.required_permission || '—'}</div>
            <div className="card__subtext">{ui("Backend permission gate expected for the route.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Rendered panels")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(routeExposureAudit.frontend_rendered_panels?.length), locale)}</div>
            <div className="card__subtext">{ui("Includes this route exposure audit panel to prevent self-audit drift.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Missing panels")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(routeExposureAudit.missing_frontend_panels?.length), locale)}</div>
            <div className="card__subtext">{ui("Backend response objects missing for panels rendered by this page.")}</div>
          </div>
          <div className="card">
            <div className="card__label">{ui("Frontend drift count")}</div>
            <div className="card__value">{formatLocalizedNumber(numberValue(frontendPanelContractDriftCount), locale)}</div>
            <div className="card__subtext">{ui("Local rendered-panel contract entries not acknowledged by backend audit.")}</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Route exposure blockers")}</div>
          {routeExposureAudit.blockers?.length ? (
            <ul>
              {routeExposureAudit.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No route exposure blockers reported by the backend.")}</p>
          )}
          <div className="card__subtext">{ui("Recommended next step:")} {routeExposureAudit.recommended_next_step || ui('Keep route exposure regression checks in place before adding more Control Tower panels.')}</div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{ui("Route audit contract")}</div>
          {routeExposureAudit.audit_contract?.length ? (
            <ul>
              {routeExposureAudit.audit_contract.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)}
            </ul>
          ) : (
            <p className="card__subtext">{ui("No route exposure audit requirements reported.")}</p>
          )}
        </div>
      </section>
        </details>
      ) : null}

      {/*
        v3.49.50 — Tenant simplification. The tenant-facing read-only safety guarantee grid is
        intentionally hidden because the page explanation already states the same contract.
        Original rendering preserved below for easy reversal.
      <section className="section">
        <div className="section__title action-center-section-title"><span className="action-center-section-icon"><TenantNavIcon path="/action-center" size={17} /></span><span>{ui("Read-only safety guarantees")}</span></div>
        <div className="card-grid" style={cardGridStyle}>
          {safetyEntries.filter(([key]) => USER_FACING_SAFETY_KEYS.has(key)).map(([key]) => (
            <div className="card" key={key}>
              <div className="card__label">{ui("Guaranteed")}</div>
              <div style={{ fontWeight: 800 }}>{canonicalLabel(key, ui)}</div>
            </div>
          ))}
        </div>
        <p className="card__subtext">{ui("Generated at:")} {formatDateTime(response?.generated_at, locale, ui)}</p>
      </section>
      */}
    </div>
  );
}
