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
  // OperationalWorkspaceMetaPill, // v3.49.46: tenant-facing hero meta pills intentionally hidden; keep code available for reversal.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './WorkflowAutomationComposerPage.css';

type WorkflowDomain =
  | 'execution'
  | 'reservation'
  | 'procurement'
  | 'fulfillment'
  | 'replenishment'
  | 'transfer'
  | 'alerts'
  | 'control_tower'
  | 'decision_intelligence'
  | 'ai_governance'
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
    composer_guidance_key?: string | null;
    approval_chain_guidance?: string;
    approval_chain_guidance_key?: string | null;
    event_trigger_guidance?: string;
    event_trigger_guidance_key?: string | null;
    integration_routing_guidance?: string;
    integration_routing_guidance_key?: string | null;
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
  { value: 'alerts', label: 'Alerts' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
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
    description: 'The page shows suggested plans but does not publish automation, start tasks, or change records.',
    iconPath: '/workflow-composer'
  },
  {
    title: 'A person remains responsible',
    description: 'The real work must be reviewed, assigned, approved, and completed on its normal source page.',
    iconPath: '/users'
  },
  {
    title: 'Approvals still apply',
    description: 'A suggested approval path cannot bypass the approval rules already used by the business.',
    iconPath: '/permissions'
  },
  {
    title: 'External systems are not contacted',
    description: 'Integration plans are previews only and do not call suppliers, carriers, partners, ERP, or accounting systems.',
    iconPath: '/system-context'
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

const CANONICAL_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  open: 'Open',
  pending: 'Pending',
  ready: 'Ready',
  assigned: 'Assigned',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
  approved: 'Approved',
  rejected: 'Rejected',
  resolved: 'Resolved',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  action_center_item: 'Action Center item',
  execution_task: 'Execution task',
  alert: 'Alert',
  integration_contract: 'Integration contract',
  operational_action_center: 'Operational Action Center',
  enterprise_integration: 'Enterprise integration',
  decision_intelligence: 'Decision intelligence',
  ai_governance: 'AI governance',
  control_tower: 'Control tower'
};

/*
 * v3.49.46 — Tenant simplification
 * Technical safety-contract labels are intentionally retained but commented out because
 * the Technical safety contract is no longer rendered for tenant users.
 *
const SAFETY_LABELS: Record<string, string> = {
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
*/

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  const text = String(value || 'not reported').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.replace(/\b\w/g, (character) => character.toUpperCase());
}

function canonicalLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const raw = String(value || 'unknown');
  return ui(CANONICAL_LABELS[raw] || formatLabel(raw));
}

function workflowDomainLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const option = WORKFLOW_DOMAINS.find((item) => item.value === value);
  return option ? ui(option.label) : canonicalLabel(value, ui);
}

/* v3.49.46: retained for easy reversal with the commented Technical safety contract UI.
function safetyLabel(value: string, ui: (englishText: string) => string): string {
  return ui(SAFETY_LABELS[value] || formatLabel(value));
}
*/

function formatDateTime(value: string | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDateTime(date, locale);
}

function plainStep(value: string, ui: (englishText: string) => string): string {
  return ui(STEP_LABELS[value] || formatLabel(value));
}

function blueprintTypeLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (value === 'approval_gated_review_flow') return ui('Approval-required plan');
  if (value === 'human_operated_triage_flow') return ui('Human review plan');
  if (value === 'external_workflow_visibility_contract') return ui('External integration plan');
  return canonicalLabel(value, ui);
}

/* v3.49.50: retained for easy reversal after replacing the static Page mode KPI.
function executionModeLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (value === 'read_only_workflow_blueprint_composition') return ui('Guidance only');
  return canonicalLabel(value, ui);
}
*/

function displayTitleText(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return 'Not reported';
  return raw.includes('_') || raw === raw.toUpperCase() ? formatLabel(raw) : raw;
}

function sourceTitle(blueprint: WorkflowBlueprint, ui: (englishText: string) => string): string {
  if (blueprint.source_title) {
    return blueprint.source_action_domain === 'alerts' ? displayTitleText(blueprint.source_title) : blueprint.source_title;
  }
  if (blueprint.blueprint_type === 'external_workflow_visibility_contract') {
    return `${ui('Integration plan:')} ${workflowDomainLabel(blueprint.workflow_domain, ui)}`;
  }
  return `${ui('Workflow plan:')} ${workflowDomainLabel(blueprint.workflow_domain, ui)}`;
}

function sourceDescription(blueprint: WorkflowBlueprint, ui: (englishText: string) => string): string {
  if (blueprint.source_summary) return blueprint.source_summary;
  if (blueprint.blueprint_type === 'external_workflow_visibility_contract') {
    return ui('A read-only plan showing how an approved external integration could be reviewed and governed.');
  }
  return ui('A suggested human workflow based on an existing open work item.');
}

function localizedGuidance(key: string | null | undefined, value: string | null | undefined, fallback: string, ui: (englishText: string) => string): string {
  const text = String(value || '').trim();
  return text ? (key ? ui(text) : text) : ui(fallback);
}

function nextBlueprintTitle(guidance: WorkflowComposerResponse['guidance'], blueprints: WorkflowBlueprint[], ui: (englishText: string) => string): string {
  const nextId = String(guidance?.next_blueprint_id || '').trim();
  const next = nextId ? blueprints.find((blueprint) => blueprint.blueprint_id === nextId) : blueprints[0];
  if (next) return sourceTitle(next, ui);
  const fallback = String(guidance?.next_blueprint_title || '').trim();
  return fallback || ui('No plan is waiting');
}

function urgencyClass(value?: string | null): string {
  if (value === 'critical') return 'workflow-composer-page__badge workflow-composer-page__badge--critical';
  if (value === 'high') return 'workflow-composer-page__badge workflow-composer-page__badge--high';
  if (value === 'medium') return 'workflow-composer-page__badge workflow-composer-page__badge--medium';
  return 'workflow-composer-page__badge workflow-composer-page__badge--low';
}

function urgencyToneClass(value?: string | null): string {
  if (value === 'critical') return 'workflow-composer-page__blueprint-card--critical';
  if (value === 'high') return 'workflow-composer-page__blueprint-card--high';
  if (value === 'medium') return 'workflow-composer-page__blueprint-card--medium';
  return 'workflow-composer-page__blueprint-card--low';
}

function workflowDomainIconPath(value?: string | null): string {
  switch (value) {
    case 'execution': return '/execution-tasks';
    case 'reservation': return '/inventory-reservations';
    case 'procurement': return '/procurement-recommendations';
    case 'fulfillment': return '/shipments';
    case 'replenishment': return '/replenishment-planning';
    case 'transfer': return '/stock-transfers';
    case 'supplier': return '/suppliers';
    case 'carrier': return '/shipments';
    case 'external_partner': return '/system-context';
    case 'multi_domain': return '/action-center';
    default: return '/workflow-composer';
  }
}

function linkIconPath(to: string): string {
  return to.split('?')[0] || '/workflow-composer';
}

function sourceSurfaceToAppPath(sourceSurface?: string | null): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) return null;
  if (sourceSurface === '/control-tower') return '/reliability-command';

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
    '/reports',
    '/reliability-command'
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
      to: `/intelligence-review?${new URLSearchParams({ source_action_id: blueprint.source_action_id }).toString()}`,
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

  if (hasPermission(TENANT_PERMISSIONS.ALERTS_READ)) available.add('alerts');
  if (hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ)) available.add('control_tower');
  if (hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)) {
    available.add('decision_intelligence');
    available.add('ai_governance');
    available.add('multi_domain');
  }

  if (hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_READ)) {
    ['execution', 'reservation', 'procurement', 'fulfillment', 'replenishment', 'transfer', 'supplier', 'carrier', 'external_partner']
      .forEach((domain) => available.add(domain as WorkflowDomain));
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
  const { locale, ui } = useAppTranslation();
  const [workflowDomain, setWorkflowDomain] = useState<'all' | WorkflowDomain>('all');
  const [urgency, setUrgency] = useState<'all' | BlueprintUrgency>('all');

  const composerQuery = useQuery({
    queryKey: ['workflow-automation-composer', workflowDomain, urgency],
    queryFn: () => fetchWorkflowComposer(workflowDomain, urgency)
  });

  const response = composerQuery.data;
  const hasSnapshot = Boolean(response);
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const blueprints = response?.blueprints || [];
  const highUrgencyPlans = blueprints.filter((blueprint) => ['critical', 'high'].includes(String(blueprint.escalation_policy_preview?.urgency || ''))).length;
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

  /* v3.49.46: retained for easy reversal with the commented Technical safety contract UI.
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);
  */

  useEffect(() => {
    if (workflowDomain !== 'all' && !availableDomains.has(workflowDomain)) {
      setWorkflowDomain('all');
    }
  }, [availableDomains, workflowDomain]);

  const summaryValue = (value: unknown): number | string => {
    if (hasSnapshot) return formatLocalizedNumber(numberValue(value), locale);
    return composerQuery.isLoading ? ui('Loading…') : ui('Unavailable');
  };

  return (
    <div className="workflow-composer-page workflow-composer-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
      {/*
        v3.49.46/v3.49.50 — Tenant simplification. The original hero pills remain
        commented out, and the empty meta container is no longer rendered.
        <OperationalWorkspaceHero meta={<>
          <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Human-reviewed")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("No autonomous execution")}</OperationalWorkspaceMetaPill>
        </>} />
      */}
      <OperationalWorkspaceHero
        iconPath="/workflow-composer"
        eyebrow={ui("Human workflow planning")}
        title={ui("Workflow Composer")}
        description={ui("Read-only suggested workflow plans that explain steps, approvals, and source-page routing. Nothing is published, automated, or executed from this page.")}
        aside={<OperationalWorkspaceStatus value={ui("Guidance only")} label={ui("source workflows remain authoritative")} />}
      />

      <OperationalWorkspaceStats ariaLabel={ui("Workflow Composer overview")}>
        <OperationalWorkspaceStatCard
          label={ui("Plans shown")}
          value={summaryValue(summary.total_blueprints ?? blueprints.length)}
          helper={ui("Suggested human workflow plans matching current filters")}
          iconPath="/workflow-composer"
          tone="blue"
        />
        <OperationalWorkspaceStatCard
          label={ui("Multi-step approval plans")}
          value={summaryValue(summary.approval_chain_blueprints)}
          helper={ui("Plans suggesting more than one human review or approval step")}
          iconPath="/permissions"
          tone="blue"
        />
        <OperationalWorkspaceStatCard
          label={ui("External integration plans")}
          value={summaryValue(summary.integration_routing_blueprints)}
          helper={ui("Read-only plans connected to permitted integration contracts")}
          iconPath="/system-context"
          tone="warn"
        />
        <OperationalWorkspaceStatCard
          label={ui("High-urgency plans")}
          value={summaryValue(highUrgencyPlans)}
          helper={ui("Critical and high-urgency plans needing attention")}
          iconPath="/alerts"
          tone={highUrgencyPlans > 0 ? 'warn' : 'good'}
        />
      </OperationalWorkspaceStats>

      <section className="section workflow-composer-page__section">
        <div className="section__title workflow-composer-page__section-title"><span className="workflow-composer-page__section-icon"><TenantNavIcon path="/workflow-composer" size={16} /></span><span>{ui("Suggested workflow plans")}</span></div>
        <div className="card workflow-composer-page__controls-card">
          <div className="workflow-composer-page__toolbar">
            <label className="workflow-composer-page__field">
              {ui("Work area")}
              <select
                className="workflow-composer-page__select"
                value={workflowDomain}
                onChange={(event) => setWorkflowDomain(event.target.value as 'all' | WorkflowDomain)}
              >
                {visibleDomainOptions.map((option) => (
                  <option key={option.value} value={option.value}>{ui(option.label)}</option>
                ))}
              </select>
            </label>
            <label className="workflow-composer-page__field">
              {ui("Urgency")}
              <select
                className="workflow-composer-page__select"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as 'all' | BlueprintUrgency)}
              >
                {URGENCY_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{ui(option.label)}</option>
                ))}
              </select>
            </label>
            <button
              className="button button--secondary workflow-composer-page__toolbar-action"
              type="button"
              onClick={() => composerQuery.refetch()}
              disabled={composerQuery.isFetching}
            >
              <TenantNavIcon path="/workflow-composer" size={14} />{composerQuery.isFetching ? ui('Refreshing…') : ui('Refresh plans')}
            </button>
          </div>

          <div className="workflow-composer-page__intro">
            <span className="workflow-composer-page__intro-icon"><TenantNavIcon path="/workspace" size={17} /></span>
            <div>
              <strong>{ui("How to use this page")}</strong>
              <p className="card__subtext">
                {ui("Review a suggested plan, then open its source page and use only the actions available to your role. Nothing is published or executed here.")}
              </p>
            </div>
          </div>

          {composerQuery.isLoading && !hasSnapshot ? (
            <div className="workflow-composer-page__state" role="status">
              <span className="workflow-composer-page__intro-icon"><TenantNavIcon path="/workflow-composer" size={17} /></span>
              <div><div className="workflow-composer-page__state-title">{ui("Loading workflow plans")}</div>
              <p className="card__subtext">{ui("Collecting permitted open work and integration plans for the current company.")}</p></div>
            </div>
          ) : composerQuery.error && !hasSnapshot ? (
            <div className="workflow-composer-page__state" role="alert">
              <span className="workflow-composer-page__intro-icon workflow-composer-page__intro-icon--danger"><TenantNavIcon path="/alerts" size={17} /></span>
              <div className="workflow-composer-page__state-copy"><div className="workflow-composer-page__state-title">{ui("Workflow plans could not be loaded")}</div>
              <p className="form-error">
                {composerQuery.error instanceof ApiError ? composerQuery.error.message : ui('Unable to load the Workflow Composer.')}
              </p>
              <button className="button button--secondary workflow-composer-page__inline-button" type="button" onClick={() => composerQuery.refetch()}><TenantNavIcon path="/workflow-composer" size={14} />{ui("Try again")}</button>
              </div>
            </div>
          ) : blueprints.length === 0 ? (
            <div className="workflow-composer-page__state">
              <span className="workflow-composer-page__intro-icon"><TenantNavIcon path="/workflow-composer" size={17} /></span>
              <div><div className="workflow-composer-page__state-title">{ui("No matching plans")}</div>
              <p className="card__subtext">{ui("No suggested workflow plan matched the selected work area and urgency.")}</p></div>
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
                  <article key={blueprint.blueprint_id} className={`card workflow-composer-page__blueprint-card ${urgencyToneClass(urgencyValue)}`}>
                    <div className="workflow-composer-page__blueprint-header">
                      <div className="workflow-composer-page__blueprint-heading">
                        <div className="workflow-composer-page__blueprint-title-row">
                          <span className="workflow-composer-page__blueprint-icon"><TenantNavIcon path={workflowDomainIconPath(blueprint.workflow_domain)} size={17} /></span>
                          <div className="workflow-composer-page__blueprint-title-copy">
                        <div className="workflow-composer-page__badge-row">
                          <span className="workflow-composer-page__badge workflow-composer-page__badge--neutral">
                            {workflowDomainLabel(blueprint.workflow_domain, ui)}
                          </span>
                          <span className="workflow-composer-page__badge workflow-composer-page__badge--neutral">
                            {blueprintTypeLabel(blueprint.blueprint_type, ui)}
                          </span>
                          {triggerStatus ? (
                            <span className="workflow-composer-page__badge workflow-composer-page__badge--neutral">
                              {ui("Status:")} {canonicalLabel(triggerStatus, ui)}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="workflow-composer-page__blueprint-title">{sourceTitle(blueprint, ui)}</h3>
                          </div>
                        </div>
                      </div>
                      <span className={urgencyClass(urgencyValue)}>{canonicalLabel(urgencyValue, ui)}</span>
                    </div>

                    <p className="card__subtext workflow-composer-page__blueprint-summary">{sourceDescription(blueprint, ui)}</p>
                    <p className="card__subtext workflow-composer-page__updated">
                      {ui("Plan updated")} {formatDateTime(blueprint.updated_at || blueprint.created_at, locale, ui)}
                    </p>

                    <div className="workflow-composer-page__plan-grid">
                      <div className="workflow-composer-page__plan-panel">
                        <div className="workflow-composer-page__plan-title"><span className="workflow-composer-page__plan-icon"><TenantNavIcon path="/workflow-composer" size={14} /></span>{ui("Suggested steps")}</div>
                        {suggestedSteps.length > 0 ? (
                          <ol className="workflow-composer-page__step-list">
                            {suggestedSteps.map((step) => <li key={step}>{plainStep(step, ui)}</li>)}
                          </ol>
                        ) : (
                          <p className="card__subtext">{ui("No suggested steps were returned.")}</p>
                        )}
                      </div>
                      <div className="workflow-composer-page__plan-panel">
                        <div className="workflow-composer-page__plan-title"><span className="workflow-composer-page__plan-icon workflow-composer-page__plan-icon--violet"><TenantNavIcon path="/permissions" size={14} /></span>{ui("Review and approval path")}</div>
                        {approvalSteps.length > 0 ? (
                          <ol className="workflow-composer-page__step-list">
                            {approvalSteps.map((step) => <li key={step}>{plainStep(step, ui)}</li>)}
                          </ol>
                        ) : (
                          <p className="card__subtext">{ui("No separate approval step is suggested.")}</p>
                        )}
                      </div>
                    </div>

                    <div className="workflow-composer-page__routing-note">
                      <span className="workflow-composer-page__routing-icon"><TenantNavIcon path={blueprint.integration_routing_preview?.external_workflow_eligible ? '/system-context' : '/workspace'} size={15} /></span>
                      <div><strong>{ui("Where the work happens:")}</strong>{' '}
                      {blueprint.integration_routing_preview?.external_workflow_eligible
                        ? ui('This is an external integration visibility plan. It still requires manual governance and does not run the partner workflow.')
                        : ui('The existing source page remains responsible for the real work and its audit history.')}
                      </div>
                    </div>

                    <div className="workflow-composer-page__actions">
                      {sourceLink ? <Link className="button button--secondary workflow-composer-page__source-button" to={sourceLink.to}><TenantNavIcon path={linkIconPath(sourceLink.to)} size={14} />{ui(sourceLink.label)}</Link> : null}
                      {!sourceLink && blueprint.integration_routing_preview?.external_workflow_eligible ? (
                        <span className="card__subtext">{ui("No tenant working page is currently available for this integration plan.")}</span>
                      ) : null}
                    </div>

                    {canViewDiagnostics ? (
                      <details className="workflow-composer-page__details">
                        <summary><TenantNavIcon path="/system-context" size={14} />{ui("Technical plan details")}</summary>
                        <dl className="workflow-composer-page__details-grid">
                          <dt>{ui("Plan ID")}</dt><dd>{blueprint.blueprint_id}</dd>
                          <dt>{ui("Source record ID")}</dt><dd>{blueprint.trigger_preview?.trigger_reference || blueprint.source_contract_id || ui('Not reported')}</dd>
                          <dt>{ui("Source action ID")}</dt><dd>{blueprint.source_action_id || ui('Not reported')}</dd>
                          <dt>{ui("Trigger source")}</dt><dd>{canonicalLabel(blueprint.trigger_preview?.trigger_source, ui)}</dd>
                          <dt>{ui("Trigger preview only")}</dt><dd>{ui(blueprint.trigger_preview?.event_trigger_only_preview ? 'Yes' : 'Not reported')}</dd>
                          <dt>{ui("Suggested escalation when blocked")}</dt><dd>{ui(blueprint.escalation_policy_preview?.escalate_when_blocked ? 'Yes' : 'No')}</dd>
                          <dt>{ui("Partner automation trigger")}</dt><dd>{ui(blueprint.integration_routing_preview?.partner_automation_trigger ? 'Yes' : 'No')}</dd>
                          <dt>{ui("External execution")}</dt><dd>{ui(blueprint.integration_routing_preview?.external_delivery_execution ? 'Yes' : 'No')}</dd>
                        </dl>
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {composerQuery.error && hasSnapshot ? (
            <div className="workflow-composer-page__state" role="status">
              <span className="workflow-composer-page__intro-icon workflow-composer-page__intro-icon--danger"><TenantNavIcon path="/alerts" size={17} /></span>
              <div><div className="workflow-composer-page__state-title">{ui('Refresh failed')}</div>
              <p className="card__subtext">{ui('Showing the last available Workflow Composer snapshot. Refresh again before relying on time-sensitive plan ordering.')}</p></div>
            </div>
          ) : null}

          {response?.generated_at ? (
            <p className="card__subtext workflow-composer-page__generated">
              {ui("Plans updated")} {formatDateTime(response.generated_at, locale, ui)}. {ui("Press Refresh plans whenever you need the latest snapshot.")}
            </p>
          ) : null}
        </div>
      </section>

      {!hasSnapshot ? null : (
        <section className="section workflow-composer-page__section">
          <div className="section__title workflow-composer-page__section-title"><span className="workflow-composer-page__section-icon"><TenantNavIcon path="/intelligence-review" size={16} /></span><span>{ui("How to understand the plans")}</span></div>
          <div className="workflow-composer-page__guidance-grid">
            <div className="card workflow-composer-page__guidance-card">
              <span className="workflow-composer-page__icon workflow-composer-page__icon--blue"><TenantNavIcon path={workflowDomainIconPath(blueprints[0]?.workflow_domain)} size={17} /></span>
              <div className="workflow-composer-page__guidance-copy"><div className="card__label">{ui("Start with")}</div>
              <div className="workflow-composer-page__guidance-value">
                {nextBlueprintTitle(guidance, blueprints, ui)}
              </div>
              <p className="card__subtext">{localizedGuidance(guidance.composer_guidance_key, guidance.composer_guidance, 'Choose a plan and open its source page.', ui)}</p></div>
            </div>
            <div className="card workflow-composer-page__guidance-card">
              <span className="workflow-composer-page__icon workflow-composer-page__icon--violet"><TenantNavIcon path="/permissions" size={17} /></span>
              <div className="workflow-composer-page__guidance-copy"><div className="card__label">{ui("Approval rule")}</div>
              <p className="card__subtext">{localizedGuidance(guidance.approval_chain_guidance_key, guidance.approval_chain_guidance, 'Approval steps are suggestions and do not approve work.', ui)}</p></div>
            </div>
            <div className="card workflow-composer-page__guidance-card">
              <span className="workflow-composer-page__icon workflow-composer-page__icon--amber"><TenantNavIcon path="/automation-schedules" size={17} /></span>
              <div className="workflow-composer-page__guidance-copy"><div className="card__label">{ui("Trigger rule")}</div>
              <p className="card__subtext">{localizedGuidance(guidance.event_trigger_guidance_key, guidance.event_trigger_guidance, 'Trigger information is for review only.', ui)}</p></div>
            </div>
            <div className="card workflow-composer-page__guidance-card">
              <span className="workflow-composer-page__icon workflow-composer-page__icon--green"><TenantNavIcon path="/system-context" size={17} /></span>
              <div className="workflow-composer-page__guidance-copy"><div className="card__label">{ui("Integration rule")}</div>
              <p className="card__subtext">{localizedGuidance(guidance.integration_routing_guidance_key, guidance.integration_routing_guidance, 'External integrations are not run from this page.', ui)}</p></div>
            </div>
          </div>
        </section>
      )}

      {!hasSnapshot ? null : (
        <section className="section workflow-composer-page__section">
          <div className="section__title workflow-composer-page__section-title"><span className="workflow-composer-page__section-icon"><TenantNavIcon path="/reliability-command" size={16} /></span><span>{ui("Safety and control")}</span></div>
          <div className="workflow-composer-page__safety-grid">
            {USER_SAFETY_ITEMS.map((item) => (
              <div className="card workflow-composer-page__safety-card" key={item.title}>
                <span className="workflow-composer-page__icon workflow-composer-page__icon--green"><TenantNavIcon path={item.iconPath} size={17} /></span>
                <div className="workflow-composer-page__safety-copy"><div className="workflow-composer-page__safety-title">{ui(item.title)}</div>
                <p className="card__subtext">{ui(item.description)}</p></div>
              </div>
            ))}
          </div>

          {/*
            v3.49.46 — Tenant simplification.
            Technical safety-contract diagnostics are intentionally hidden from tenant UI.
            The plain-language Safety and control cards above remain visible and authoritative
            for tenant-facing guidance. The original block is preserved here for reversal.

          {canViewDiagnostics && safetyEntries.length > 0 ? (
            <details className="card workflow-composer-page__technical-safety">
              <summary><TenantNavIcon path="/reliability-command" size={14} />{ui("Technical safety contract")}</summary>
              <div className="workflow-composer-page__technical-safety-grid">
                {safetyEntries.map(([key]) => (
                  <span key={key} className="workflow-composer-page__badge workflow-composer-page__badge--neutral">
                    {safetyLabel(key, ui)}
                  </span>
                ))}
              </div>
              <p className="card__subtext">
                {ui("Non-mutation guarantee:")} {ui(response?.non_mutation_guarantee ? 'Active' : 'Not reported')}
              </p>
            </details>
          ) : null}
          */}
        </section>
      )}
    </div>
  );
}
