import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type WorkflowDomain = 'execution' | 'reservation' | 'procurement' | 'fulfillment' | 'replenishment' | 'transfer' | 'supplier' | 'carrier' | 'external_partner' | 'multi_domain';
type BlueprintUrgency = 'critical' | 'high' | 'medium' | 'low';

type WorkflowBlueprint = {
  blueprint_id: string;
  source_action_id?: string;
  source_contract_id?: string;
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
    composer_guidance?: string;
    approval_chain_guidance?: string;
    event_trigger_guidance?: string;
    integration_routing_guidance?: string;
    safety_contract?: Record<string, boolean>;
  };
  blueprints?: WorkflowBlueprint[];
  source_workspace_summary?: Record<string, unknown>;
  source_external_workflow_governance?: Record<string, unknown>;
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const WORKFLOW_DOMAINS: Array<{ value: 'all' | WorkflowDomain; label: string }> = [
  { value: 'all', label: 'All domains' },
  { value: 'execution', label: 'Execution' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'fulfillment', label: 'Fulfillment' },
  { value: 'replenishment', label: 'Replenishment' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'carrier', label: 'Carrier' },
  { value: 'external_partner', label: 'External partner' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | BlueprintUrgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
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

const blueprintListStyle: CSSProperties = {
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

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not reported';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sourceSurfaceToAppPath(sourceSurface?: string): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) {
    return null;
  }

  const tenantRoutes = new Set([
    '/action-center',
    '/workspace',
    '/real-time-operations-feed',
    '/automation-schedules',
    '/execution-tasks',
    '/execution-requests',
    '/procurement-recommendations',
    '/shipments',
    '/inventory-reservations',
    '/inventory-requisitions',
    '/reports'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

async function fetchWorkflowComposer(
  workflowDomain: 'all' | WorkflowDomain,
  urgency: 'all' | BlueprintUrgency
): Promise<WorkflowComposerResponse> {
  const params = new URLSearchParams({ limit: '75' });

  if (workflowDomain !== 'all') {
    params.set('workflow_domain', workflowDomain);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

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
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  return (
    <div>
      <div className="card-grid" style={gridStyle}>
        <div className="card">
          <div className="card__label">Blueprints</div>
          <div className="card__value">{numberValue(summary.total_blueprints ?? blueprints.length)}</div>
          <div className="card__subtext">Read-only automation design candidates from action-center and integration contracts.</div>
        </div>
        <div className="card">
          <div className="card__label">Approval chains</div>
          <div className="card__value">{numberValue(summary.approval_chain_blueprints)}</div>
          <div className="card__subtext">Blueprints with multi-step human governance review.</div>
        </div>
        <div className="card">
          <div className="card__label">Integration routing</div>
          <div className="card__value">{numberValue(summary.integration_routing_blueprints)}</div>
          <div className="card__subtext">External workflow visibility plans without partner automation execution.</div>
        </div>
        <div className="card">
          <div className="card__label">Execution mode</div>
          <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(response?.definition?.execution_mode)}</div>
          <div className="card__subtext">Composer output is preview-only and non-mutating.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Workflow automation composer</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select style={selectStyle} value={workflowDomain} onChange={(event) => setWorkflowDomain(event.target.value as 'all' | WorkflowDomain)}>
              {WORKFLOW_DOMAINS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | BlueprintUrgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => composerQuery.refetch()} disabled={composerQuery.isFetching}>
              {composerQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {composerQuery.isLoading ? (
            <p className="card__subtext">Loading workflow automation blueprint previews…</p>
          ) : composerQuery.error ? (
            <p className="card__subtext">
              {composerQuery.error instanceof ApiError
                ? composerQuery.error.message
                : 'Unable to load the workflow composer.'}
            </p>
          ) : blueprints.length === 0 ? (
            <p className="card__subtext">No workflow blueprints match the selected filters.</p>
          ) : (
            <div style={blueprintListStyle}>
              {blueprints.map((blueprint) => {
                const sourcePath = sourceSurfaceToAppPath(blueprint.integration_routing_preview?.route_to_source_surface);

                return (
                  <article key={blueprint.blueprint_id} className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={badgeStyle}>{formatLabel(blueprint.workflow_domain)}</span>
                      <span style={badgeStyle}>{formatLabel(blueprint.blueprint_type)}</span>
                      <span style={badgeStyle}>{formatLabel(blueprint.escalation_policy_preview?.urgency || blueprint.trigger_preview?.trigger_urgency)}</span>
                      {blueprint.trigger_preview?.event_trigger_only_preview ? <span style={badgeStyle}>Trigger preview</span> : null}
                      {blueprint.explainability?.human_action_only ? <span style={badgeStyle}>Human action only</span> : null}
                    </div>

                    <h3 style={{ margin: '0 0 6px' }}>{formatLabel(blueprint.blueprint_id)}</h3>
                    <p className="card__subtext" style={{ marginBottom: 10 }}>
                      Source {formatLabel(blueprint.trigger_preview?.trigger_source)} · Updated {formatDateTime(blueprint.updated_at || blueprint.created_at)}
                    </p>

                    <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 12 }}>
                      <div>
                        <strong>Recommended steps</strong>
                        <ul style={{ marginBottom: 0 }}>
                          {(blueprint.recommended_steps_preview || []).map((step) => (
                            <li key={step}>{formatLabel(step)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Approval chain</strong>
                        <ul style={{ marginBottom: 0 }}>
                          {(blueprint.approval_chain_preview || []).map((step) => (
                            <li key={step}>{formatLabel(step)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="card__subtext">
                      Routing: {blueprint.integration_routing_preview?.external_workflow_eligible ? 'external workflow visibility eligible' : 'source workflow only'}; partner automation trigger: {blueprint.integration_routing_preview?.partner_automation_trigger ? 'yes' : 'no'}; external execution: {blueprint.integration_routing_preview?.external_delivery_execution ? 'yes' : 'no'}.
                    </p>

                    {sourcePath ? (
                      <Link className="button button--secondary" to={sourcePath}>Open source surface</Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Composer guidance</div>
        <div className="card-grid" style={gridStyle}>
          <div className="card">
            <div className="card__label">Next blueprint</div>
            <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(guidance.next_blueprint_type)}</div>
            <div className="card__subtext">{guidance.next_blueprint_id || 'No next blueprint reported.'}</div>
          </div>
          <div className="card">
            <div className="card__label">Composer rule</div>
            <p className="card__subtext">{guidance.composer_guidance || 'No composer guidance reported.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Trigger rule</div>
            <p className="card__subtext">{guidance.event_trigger_guidance || 'No event-trigger guidance reported.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Integration rule</div>
            <p className="card__subtext">{guidance.integration_routing_guidance || 'No integration-routing guidance reported.'}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__title">Safety contract</div>
        <div className="card">
          {safetyEntries.length === 0 ? (
            <p className="card__subtext">No safety contract returned by the backend.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {safetyEntries.map(([key]) => (
                <span key={key} style={badgeStyle}>{formatLabel(key)}</span>
              ))}
            </div>
          )}
          <p className="card__subtext" style={{ marginTop: 12 }}>
            Non-mutation guarantee: {response?.non_mutation_guarantee ? 'active' : 'not reported'} · Generated {formatDateTime(response?.generated_at)}
          </p>
        </div>
      </section>
    </div>
  );
}
