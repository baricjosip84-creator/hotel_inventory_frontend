import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import './WorkflowAutomationComposerPage.css';

type WorkflowDomain =
  | 'execution'
  | 'reservation'
  | 'procurement'
  | 'fulfillment'
  | 'replenishment'
  | 'transfer'
  | 'supplier'
  | 'carrier'
  | 'external_partner'
  | 'multi_domain';

type BlueprintUrgency = 'critical' | 'high' | 'medium' | 'low';

type WorkflowBlueprint = {
  blueprint_id: string;
  source_action_id?: string;
  source_contract_id?: string;
  source_contract_key?: string;
  source_title?: string | null;
  source_summary?: string | null;
  source_action_domain?: string | null;
  source_action_type?: string | null;
  workflow_domain?: string;
  blueprint_type?: string;
  trigger_preview?: {
    trigger_source?: string;
    trigger_reference?: string;
    trigger_status?: string;
    trigger_urgency?: string;
    contract_key?: string;
    contract_status?: string;
    event_trigger_only_preview?: boolean;
  };
  recommended_steps_preview?: string[];
  approval_chain_preview?: string[];
  escalation_policy_preview?: {
    urgency?: string;
    escalate_when_blocked?: boolean;
    sla_sensitive?: boolean;
    notification_only?: boolean;
  };
  integration_routing_preview?: {
    external_workflow_eligible?: boolean;
    route_to_source_surface?: string;
    partner_automation_trigger?: boolean;
    external_delivery_execution?: boolean;
  };
  explainability?: {
    primary_factors?: string[];
    source_action_domain?: string;
    source_action_type?: string;
    human_action_only?: boolean;
  };
  safety_contract?: Record<string, boolean>;
  created_at?: string | null;
  updated_at?: string | null;
};

type WorkflowComposerResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    source_foundations?: string[];
    supported_workflow_domains?: string[];
    composer_capabilities?: string[];
    safety_contract?: Record<string, boolean>;
  };
  access?: {
    can_read_alerts?: boolean;
    can_read_execution_tasks?: boolean;
    can_read_control_tower?: boolean;
    can_read_decision_intelligence?: boolean;
    can_read_enterprise_integrations?: boolean;
    can_view_diagnostics?: boolean;
    available_workflow_domains?: string[];
  };
  filters?: {
    workflow_domain?: string | null;
    urgency?: string | null;
    limit?: number;
  };
  summary?: {
    total_blueprints?: number;
    approval_chain_blueprints?: number;
    integration_routing_blueprints?: number;
    by_domain?: Record<string, number>;
    by_type?: Record<string, number>;
  };
  guidance?: {
    next_blueprint_id?: string | null;
    next_blueprint_type?: string | null;
    next_blueprint_title?: string | null;
    composer_guidance?: string;
    approval_chain_guidance?: string;
    event_trigger_guidance?: string;
    integration_routing_guidance?: string;
    safety_contract?: Record<string, boolean>;
  };
  blueprints?: WorkflowBlueprint[];
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const WORKFLOW_DOMAINS: Array<{ value: 'all' | WorkflowDomain; label: string }> = [
  { value: 'all', label: 'All work areas' },
  { value: 'execution', label: 'General execution tasks' },
  { value: 'reservation', label: 'Reservations' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'fulfillment', label: 'Shipment fulfilment' },
  { value: 'replenishment', label: 'Replenishment and counts' },
  { value: 'transfer', label: 'Stock transfers' },
  { value: 'supplier', label: 'Supplier integrations' },
  { value: 'carrier', label: 'Carrier integrations' },
  { value: 'external_partner', label: 'External partner integrations' },
  { value: 'multi_domain', label: 'Cross-area reviews' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | BlueprintUrgency; label: string }> = [
  { value: 'all', label: 'All urgency levels' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const USER_SAFETY_ITEMS = [
  {
    title: 'Nothing is created or run here',
    description: 'The page shows suggested plans but does not publish automation, start tasks, or change records.'
  },
  {
    title: 'A person remains responsible',
    description: 'The real work must be reviewed, assigned, approved, and completed on its normal source page.'
  },
  {
    title: 'Approvals still apply',
    description: 'A suggested approval path cannot bypass the approval rules already used by the business.'
  },
  {
    title: 'External systems are not contacted',
    description: 'Integration plans are previews only and do not call suppliers, carriers, partners, ERP, or accounting systems.'
  }
];

const STEP_LABELS: Record<string, string> = {
  review_source_context: 'Review the original task, alert, or contract',
  assign_human_owner: 'Choose the person responsible for the work',
  capture_required_approval: 'Record the required human approval',
  execute_existing_governed_source_workflow: 'Complete the work through its normal controlled page',
  record_outcome_in_source_system: 'Record the result in the original workflow',
  review_contract_governance_policy: 'Review the integration rules and ownership',
  verify_permission_policy: 'Confirm who is allowed to use the integration',
  coordinate_manual_source_workflow_follow_up: 'Arrange the follow-up through the existing business process',
  source_owner_review: 'The owner of the source work reviews it',
  governance_reviewer_approval: 'A governance reviewer gives approval',
  manual_execution_authorization: 'An authorised person allows the work to continue',
  integration_owner_review: 'The integration owner reviews the plan',
  workflow_governance_review: 'The workflow governance owner reviews the plan'
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  const text = String(value || 'not reported').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function plainStep(value: string): string {
  return STEP_LABELS[value] || formatLabel(value);
}

function blueprintTypeLabel(value?: string | null): string {
  if (value === 'approval_gated_review_flow') return 'Approval-required plan';
  if (value === 'human_operated_triage_flow') return 'Human review plan';
  if (value === 'external_workflow_visibility_contract') return 'External integration plan';
  return formatLabel(value);
}

function executionModeLabel(value?: string | null): string {
  if (value === 'read_only_workflow_blueprint_composition') return 'Guidance only';
  return formatLabel(value);
}

function displayTitleText(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return 'Not reported';
  return raw.includes('_') || raw === raw.toUpperCase() ? formatLabel(raw) : raw;
}

function sourceTitle(blueprint: WorkflowBlueprint): string {
  if (blueprint.source_title) {
    return displayTitleText(blueprint.source_title);
  }
  if (blueprint.blueprint_type === 'external_workflow_visibility_contract') {
    const contractName = blueprint.source_contract_key ? formatLabel(blueprint.source_contract_key) : formatLabel(blueprint.workflow_domain);
    return `Integration plan: ${contractName}`;
  }
  return `${formatLabel(blueprint.workflow_domain)} workflow plan`;
}

function sourceDescription(blueprint: WorkflowBlueprint): string {
  if (blueprint.source_summary) return blueprint.source_summary;
  if (blueprint.blueprint_type === 'external_workflow_visibility_contract') {
    return 'A read-only plan showing how an approved external integration could be reviewed and governed.';
  }
  return 'A suggested human workflow based on an existing open work item.';
}

function urgencyClass(value?: string | null): string {
  if (value === 'critical') return 'workflow-composer-page__badge workflow-composer-page__badge--critical';
  if (value === 'high') return 'workflow-composer-page__badge workflow-composer-page__badge--high';
  if (value === 'medium') return 'workflow-composer-page__badge workflow-composer-page__badge--medium';
  return 'workflow-composer-page__badge workflow-composer-page__badge--low';
}

function sourceSurfaceToAppPath(sourceSurface?: string | null): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) return null;

  const tenantRoutes = new Set([
    '/action-center',
    '/workspace',
    '/real-time-operations-feed',
    '/alerts',
    '/automation-schedules',
    '/execution-tasks',
    '/execution-requests',
    '/procurement-recommendations',
    '/shipments',
    '/inventory-reservations',
    '/inventory-requisitions',
    '/stock-transfers',
    '/reports'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

type BlueprintLink = { to: string; label: string };

function blueprintSourceLink(blueprint: WorkflowBlueprint): BlueprintLink | null {
  const sourceDomain = blueprint.source_action_domain || blueprint.explainability?.source_action_domain;
  const sourceId = blueprint.trigger_preview?.trigger_reference;

  if (sourceDomain === 'alerts') {
    const params = new URLSearchParams({ resolved: 'false' });
    const search = String(blueprint.source_summary || blueprint.source_title || '').trim();
    if (search) params.set('search', search);
    return { to: `/alerts?${params.toString()}`, label: 'Open alert' };
  }

  if (sourceDomain === 'execution' && sourceId) {
    return {
      to: `/execution-tasks?${new URLSearchParams({ task_id: sourceId }).toString()}`,
      label: 'Open execution task'
    };
  }

  if (['decision_intelligence', 'ai_governance'].includes(String(sourceDomain)) && blueprint.source_action_id) {
    return {
      to: `/ai-review?${new URLSearchParams({ source_action_id: blueprint.source_action_id }).toString()}`,
      label: 'Open review'
    };
  }

  const sourcePath = sourceSurfaceToAppPath(blueprint.integration_routing_preview?.route_to_source_surface);
  return sourcePath ? { to: sourcePath, label: 'Open source page' } : null;
}

function localAvailableDomains(): WorkflowDomain[] {
  const available = new Set<WorkflowDomain>();

  if (hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)) {
    ['execution', 'reservation', 'procurement', 'fulfillment', 'replenishment', 'transfer']
      .forEach((domain) => available.add(domain as WorkflowDomain));
  }

  if (
    hasPermission(TENANT_PERMISSIONS.ALERTS_READ)
    || hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ)
    || hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)
  ) {
    available.add('multi_domain');
  }

  if (hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_READ)) {
    WORKFLOW_DOMAINS
      .map((option) => option.value)
      .filter((value): value is WorkflowDomain => value !== 'all' && value !== 'multi_domain')
      .forEach((domain) => available.add(domain));
  }

  return WORKFLOW_DOMAINS
    .map((option) => option.value)
    .filter((value): value is WorkflowDomain => value !== 'all' && available.has(value));
}

async function fetchWorkflowComposer(
  workflowDomain: 'all' | WorkflowDomain,
  urgency: 'all' | BlueprintUrgency
): Promise<WorkflowComposerResponse> {
  const params = new URLSearchParams({ limit: '75' });
  if (workflowDomain !== 'all') params.set('workflow_domain', workflowDomain);
  if (urgency !== 'all') params.set('urgency', urgency);
  return apiRequest<WorkflowComposerResponse>(`/operational-action-center/workflow-automation-composer-summary?${params.toString()}`);
}

export default function WorkflowAutomationComposerPage() {
  const [workflowDomain, setWorkflowDomain] = useState<'all' | WorkflowDomain>('all');
  const [urgency, setUrgency] = useState<'all' | BlueprintUrgency>('all');

  const composerQuery = useQuery({
    queryKey: ['workflow-automation-composer', workflowDomain, urgency],
    queryFn: () => fetchWorkflowComposer(workflowDomain, urgency)
  });

  const response = composerQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const blueprints = response?.blueprints || [];
  const canViewDiagnostics = response?.access?.can_view_diagnostics
    ?? hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);

  const availableDomains = useMemo(() => {
    const backendDomains = response?.access?.available_workflow_domains;
    const values = Array.isArray(backendDomains)
      ? backendDomains.filter((domain): domain is WorkflowDomain => WORKFLOW_DOMAINS.some((option) => option.value === domain))
      : localAvailableDomains();
    return new Set<WorkflowDomain>(values);
  }, [response?.access?.available_workflow_domains]);

  const visibleDomainOptions = useMemo(() => {
    return WORKFLOW_DOMAINS.filter((option) => option.value === 'all' || availableDomains.has(option.value));
  }, [availableDomains]);

  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  useEffect(() => {
    if (workflowDomain !== 'all' && !availableDomains.has(workflowDomain)) {
      setWorkflowDomain('all');
    }
  }, [availableDomains, workflowDomain]);

  const summaryValue = (value: unknown): number | string => {
    if (composerQuery.isLoading || composerQuery.error) return '—';
    return numberValue(value);
  };

  return (
    <div className="workflow-composer-page">
      <div className="workflow-composer-page__summary-grid">
        <div className="card workflow-composer-page__summary-card">
          <div className="card__label">Plans shown</div>
          <div className="card__value">{summaryValue(summary.total_blueprints ?? blueprints.length)}</div>
          <div className="card__subtext">Suggested human workflow plans matching the current filters.</div>
        </div>
        <div className="card workflow-composer-page__summary-card">
          <div className="card__label">Multi-step approval plans</div>
          <div className="card__value">{summaryValue(summary.approval_chain_blueprints)}</div>
          <div className="card__subtext">Plans that suggest more than one human review or approval step.</div>
        </div>
        <div className="card workflow-composer-page__summary-card">
          <div className="card__label">External integration plans</div>
          <div className="card__value">{summaryValue(summary.integration_routing_blueprints)}</div>
          <div className="card__subtext">Read-only plans connected to permitted external integration contracts.</div>
        </div>
        <div className="card workflow-composer-page__summary-card">
          <div className="card__label">Page mode</div>
          <div className="card__value workflow-composer-page__mode-value">
            {composerQuery.isLoading || composerQuery.error ? '—' : executionModeLabel(response?.definition?.execution_mode)}
          </div>
          <div className="card__subtext">This page suggests a process but cannot create or run automation.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Suggested workflow plans</div>
        <div className="card workflow-composer-page__controls-card">
          <div className="workflow-composer-page__toolbar">
            <label className="workflow-composer-page__field">
              Work area
              <select
                className="workflow-composer-page__select"
                value={workflowDomain}
                onChange={(event) => setWorkflowDomain(event.target.value as 'all' | WorkflowDomain)}
              >
                {visibleDomainOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="workflow-composer-page__field">
              Urgency
              <select
                className="workflow-composer-page__select"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as 'all' | BlueprintUrgency)}
              >
                {URGENCY_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button
              className="button button--secondary workflow-composer-page__toolbar-action"
              type="button"
              onClick={() => composerQuery.refetch()}
              disabled={composerQuery.isFetching}
            >
              {composerQuery.isFetching ? 'Refreshing…' : 'Refresh plans'}
            </button>
          </div>

          <div className="workflow-composer-page__intro">
            <strong>How to use this page</strong>
            <p className="card__subtext">
              Review a suggested plan, then open its source page to assign, approve, or complete the real work. Nothing is published or executed here.
            </p>
          </div>

          {composerQuery.isLoading ? (
            <div className="workflow-composer-page__state" role="status">
              <div className="workflow-composer-page__state-title">Loading workflow plans</div>
              <p className="card__subtext">Collecting permitted open work and integration plans for the current company.</p>
            </div>
          ) : composerQuery.error ? (
            <div className="workflow-composer-page__state" role="alert">
              <div className="workflow-composer-page__state-title">Workflow plans could not be loaded</div>
              <p className="form-error">
                {composerQuery.error instanceof ApiError ? composerQuery.error.message : 'Unable to load the Workflow Composer.'}
              </p>
              <button className="button button--secondary" type="button" onClick={() => composerQuery.refetch()}>Try again</button>
            </div>
          ) : blueprints.length === 0 ? (
            <div className="workflow-composer-page__state">
              <div className="workflow-composer-page__state-title">No matching plans</div>
              <p className="card__subtext">No suggested workflow plan matched the selected work area and urgency.</p>
            </div>
          ) : (
            <div className="workflow-composer-page__blueprint-list">
              {blueprints.map((blueprint) => {
                const sourceLink = blueprintSourceLink(blueprint);
                const urgencyValue = blueprint.escalation_policy_preview?.urgency || blueprint.trigger_preview?.trigger_urgency;
                const approvalSteps = blueprint.approval_chain_preview || [];
                const suggestedSteps = blueprint.recommended_steps_preview || [];
                const triggerStatus = blueprint.trigger_preview?.trigger_status || blueprint.trigger_preview?.contract_status;

                return (
                  <article key={blueprint.blueprint_id} className="card workflow-composer-page__blueprint-card">
                    <div className="workflow-composer-page__blueprint-header">
                      <div className="workflow-composer-page__blueprint-heading">
                        <div className="workflow-composer-page__badge-row">
                          <span className="workflow-composer-page__badge workflow-composer-page__badge--neutral">
                            {formatLabel(blueprint.workflow_domain)}
                          </span>
                          <span className="workflow-composer-page__badge workflow-composer-page__badge--neutral">
                            {blueprintTypeLabel(blueprint.blueprint_type)}
                          </span>
                          {triggerStatus ? (
                            <span className="workflow-composer-page__badge workflow-composer-page__badge--neutral">
                              Status: {formatLabel(triggerStatus)}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="workflow-composer-page__blueprint-title">{sourceTitle(blueprint)}</h3>
                      </div>
                      <span className={urgencyClass(urgencyValue)}>{formatLabel(urgencyValue)}</span>
                    </div>

                    <p className="card__subtext workflow-composer-page__blueprint-summary">{sourceDescription(blueprint)}</p>
                    <p className="card__subtext workflow-composer-page__updated">
                      Plan updated {formatDateTime(blueprint.updated_at || blueprint.created_at)}
                    </p>

                    <div className="workflow-composer-page__plan-grid">
                      <div className="workflow-composer-page__plan-panel">
                        <div className="workflow-composer-page__plan-title">Suggested steps</div>
                        {suggestedSteps.length > 0 ? (
                          <ol className="workflow-composer-page__step-list">
                            {suggestedSteps.map((step) => <li key={step}>{plainStep(step)}</li>)}
                          </ol>
                        ) : (
                          <p className="card__subtext">No suggested steps were returned.</p>
                        )}
                      </div>
                      <div className="workflow-composer-page__plan-panel">
                        <div className="workflow-composer-page__plan-title">Review and approval path</div>
                        {approvalSteps.length > 0 ? (
                          <ol className="workflow-composer-page__step-list">
                            {approvalSteps.map((step) => <li key={step}>{plainStep(step)}</li>)}
                          </ol>
                        ) : (
                          <p className="card__subtext">No separate approval step is suggested.</p>
                        )}
                      </div>
                    </div>

                    <div className="workflow-composer-page__routing-note">
                      <strong>Where the work happens:</strong>{' '}
                      {blueprint.integration_routing_preview?.external_workflow_eligible
                        ? 'This is an external integration visibility plan. It still requires manual governance and does not run the partner workflow.'
                        : 'The existing source page remains responsible for the real work and its audit history.'}
                    </div>

                    <div className="workflow-composer-page__actions">
                      {sourceLink ? <Link className="button button--secondary" to={sourceLink.to}>{sourceLink.label}</Link> : null}
                      {!sourceLink && blueprint.integration_routing_preview?.external_workflow_eligible ? (
                        <span className="card__subtext">No tenant working page is currently available for this integration plan.</span>
                      ) : null}
                    </div>

                    {canViewDiagnostics ? (
                      <details className="workflow-composer-page__details">
                        <summary>Technical plan details</summary>
                        <dl className="workflow-composer-page__details-grid">
                          <dt>Plan ID</dt><dd>{blueprint.blueprint_id}</dd>
                          <dt>Source record ID</dt><dd>{blueprint.trigger_preview?.trigger_reference || blueprint.source_contract_id || 'Not reported'}</dd>
                          <dt>Source action ID</dt><dd>{blueprint.source_action_id || 'Not reported'}</dd>
                          <dt>Trigger source</dt><dd>{formatLabel(blueprint.trigger_preview?.trigger_source)}</dd>
                          <dt>Trigger preview only</dt><dd>{blueprint.trigger_preview?.event_trigger_only_preview ? 'Yes' : 'Not reported'}</dd>
                          <dt>Escalates when blocked</dt><dd>{blueprint.escalation_policy_preview?.escalate_when_blocked ? 'Yes' : 'No'}</dd>
                          <dt>Partner automation trigger</dt><dd>{blueprint.integration_routing_preview?.partner_automation_trigger ? 'Yes' : 'No'}</dd>
                          <dt>External execution</dt><dd>{blueprint.integration_routing_preview?.external_delivery_execution ? 'Yes' : 'No'}</dd>
                        </dl>
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {response?.generated_at ? (
            <p className="card__subtext workflow-composer-page__generated">
              Plans updated {formatDateTime(response.generated_at)}. Press Refresh plans whenever you need the latest snapshot.
            </p>
          ) : null}
        </div>
      </section>

      {composerQuery.isLoading || composerQuery.error ? null : (
        <section className="section">
          <div className="section__title">How to understand the plans</div>
          <div className="workflow-composer-page__guidance-grid">
            <div className="card workflow-composer-page__guidance-card">
              <div className="card__label">Start with</div>
              <div className="workflow-composer-page__guidance-value">
                {guidance.next_blueprint_title ? displayTitleText(guidance.next_blueprint_title) : 'No plan is waiting'}
              </div>
              <p className="card__subtext">{guidance.composer_guidance || 'Choose a plan and open its source page.'}</p>
            </div>
            <div className="card workflow-composer-page__guidance-card">
              <div className="card__label">Approval rule</div>
              <p className="card__subtext">{guidance.approval_chain_guidance || 'Approval steps are suggestions and do not approve work.'}</p>
            </div>
            <div className="card workflow-composer-page__guidance-card">
              <div className="card__label">Trigger rule</div>
              <p className="card__subtext">{guidance.event_trigger_guidance || 'Trigger information is for review only.'}</p>
            </div>
            <div className="card workflow-composer-page__guidance-card">
              <div className="card__label">Integration rule</div>
              <p className="card__subtext">{guidance.integration_routing_guidance || 'External integrations are not run from this page.'}</p>
            </div>
          </div>
        </section>
      )}

      {composerQuery.isLoading || composerQuery.error ? null : (
        <section className="section">
          <div className="section__title">Safety and control</div>
          <div className="workflow-composer-page__safety-grid">
            {USER_SAFETY_ITEMS.map((item) => (
              <div className="card workflow-composer-page__safety-card" key={item.title}>
                <div className="workflow-composer-page__safety-title">{item.title}</div>
                <p className="card__subtext">{item.description}</p>
              </div>
            ))}
          </div>

          {canViewDiagnostics && safetyEntries.length > 0 ? (
            <details className="card workflow-composer-page__technical-safety">
              <summary>Technical safety contract</summary>
              <div className="workflow-composer-page__technical-safety-grid">
                {safetyEntries.map(([key]) => (
                  <span key={key} className="workflow-composer-page__badge workflow-composer-page__badge--neutral">
                    {formatLabel(key)}
                  </span>
                ))}
              </div>
              <p className="card__subtext">
                Non-mutation guarantee: {response?.non_mutation_guarantee ? 'Active' : 'Not reported'}
              </p>
            </details>
          ) : null}
        </section>
      )}
    </div>
  );
}
