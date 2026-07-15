import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { showTenantActionError } from '../lib/actionFeedback';
import type { ProductItem } from '../types/inventory';

type CopilotIntent =
  | 'operational_priority_summary'
  | 'product_risk_explanation'
  | 'supplier_performance_summary'
  | 'prepare_min_stock_proposal'
  | 'prepare_standard_cost_proposal';

type CopilotIntentCapability = {
  intent: CopilotIntent;
  label: string;
  description: string;
  required_inputs: string[];
  required_permissions: string[];
  proposal_supported: boolean;
  available: boolean;
  missing_permissions: string[];
};

type CopilotCapabilities = {
  feature: string;
  mode: string;
  can_run: boolean;
  can_create_execution_request_after_review: boolean;
  intents: CopilotIntentCapability[];
  provider: {
    configured_provider: string;
    effective_mode: string;
    model?: string | null;
    external_provider_ready: boolean;
    fallback_to_local: boolean;
    response_storage_at_provider_disabled: boolean;
    external_processing_confirmation_required: boolean;
  };
  run_limits?: {
    window_minutes: number;
    user_limit: number;
    tenant_limit: number;
    user_runs_used: number;
    tenant_runs_used: number;
  };
  safety_contract: Record<string, boolean>;
};

type CopilotEvidence = {
  kind: string;
  id?: string | null;
  label: string;
};

type CopilotProposal = {
  proposal_type?: string;
  request_type?: string;
  title?: string;
  rationale?: string | null;
  payload?: {
    product_id?: string;
    product_name?: string;
    min_stock?: number;
    previous_min_stock?: number;
    standard_unit_cost?: number;
    previous_standard_unit_cost?: number | null;
    reason?: string | null;
    source?: string;
  };
  evidence?: Record<string, unknown>;
  human_review_required?: boolean;
  autonomous_execution_allowed?: boolean;
  direct_mutation_performed?: boolean;
};

type CopilotRun = {
  id: string;
  intent: CopilotIntent;
  user_prompt: string;
  run_status: 'pending' | 'completed' | 'failed';
  provider: string;
  model?: string | null;
  provider_response_id?: string | null;
  external_processing_confirmed: boolean;
  data_shared_externally: boolean;
  context_snapshot?: Record<string, unknown>;
  response_snapshot?: {
    answer?: string;
    highlights?: string[];
    evidence?: CopilotEvidence[];
    confidence_score?: number;
    fallback_reason?: string | null;
    notes?: string[];
  };
  proposal_snapshot?: CopilotProposal | null;
  confidence_score?: number | null;
  safety_classification: string;
  usage?: {
    input_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
  };
  latency_ms?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  execution_request_id?: string | null;
  requested_by_role?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  source_action_id?: string | null;
  safety_contract?: Record<string, boolean>;
};

type CopilotRunList = {
  total: number;
  limit: number;
  offset: number;
  rows: CopilotRun[];
};

type CreateRunInput = {
  intent: CopilotIntent;
  prompt: string;
  product_id?: string;
  proposed_min_stock?: number;
  proposed_standard_unit_cost?: number;
  external_processing_confirmed?: boolean;
};

const intentFallbacks: Record<CopilotIntent, { label: string; description: string }> = {
  operational_priority_summary: {
    label: 'Operational priority summary',
    description: 'Summarize the highest-priority tenant evidence that your current permissions allow the server to read.'
  },
  product_risk_explanation: {
    label: 'Product risk explanation',
    description: 'Explain one product’s stock, recent outbound movement, unresolved alerts, and visible inbound supply.'
  },
  supplier_performance_summary: {
    label: 'Supplier performance summary',
    description: 'Compare supplier shipment timeliness and receiving discrepancies without exposing contact details.'
  },
  prepare_min_stock_proposal: {
    label: 'Prepare minimum-stock proposal',
    description: 'Prepare a server-controlled minimum-stock proposal for AI Review. No product is changed.'
  },
  prepare_standard_cost_proposal: {
    label: 'Prepare standard-cost proposal',
    description: 'Prepare a server-controlled standard unit cost proposal for AI Review. No product is changed.'
  }
};

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown request failure.';
}

function formatLabel(value?: string | null): string {
  return String(value || 'not reported').replace(/_/g, ' ');
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not reported';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatConfidence(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Not scored';
  return `${Math.round(value * 100)}%`;
}

function displayUnknown(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not reported';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function fetchCapabilities(): Promise<CopilotCapabilities> {
  return apiRequest<CopilotCapabilities>('/ai-operations-copilot/capabilities');
}

async function fetchRuns(): Promise<CopilotRunList> {
  return apiRequest<CopilotRunList>('/ai-operations-copilot/runs?limit=50');
}

async function fetchRun(runId: string): Promise<CopilotRun> {
  return apiRequest<CopilotRun>(`/ai-operations-copilot/runs/${runId}`);
}

async function createRun(input: CreateRunInput): Promise<CopilotRun> {
  return apiRequest<CopilotRun>('/ai-operations-copilot/runs', {
    method: 'POST',
    body: JSON.stringify(input),
    skipMutationFeedback: true
  });
}

async function fetchProducts(): Promise<ProductItem[]> {
  return apiRequest<ProductItem[]>('/products?limit=100');
}

function Panel(props: { title: string; subtitle?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={props.id} className="app-panel app-panel--padded" style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>{props.title}</h2>
          {props.subtitle ? <p style={styles.panelSubtitle}>{props.subtitle}</p> : null}
        </div>
      </div>
      {props.children}
    </section>
  );
}

function Badge(props: { children: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const tone = props.tone || 'default';
  return <span style={{ ...styles.badge, ...styles[`badge_${tone}`] }}>{props.children}</span>;
}

export default function AIOperationsCopilotPage() {
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get('run_id');
  const [intent, setIntent] = useState<CopilotIntent>('operational_priority_summary');
  const [prompt, setPrompt] = useState('Summarize the most important operational evidence I should review now.');
  const [productId, setProductId] = useState('');
  const [proposedMinStock, setProposedMinStock] = useState('');
  const [proposedStandardUnitCost, setProposedStandardUnitCost] = useState('');
  const [externalProcessingConfirmed, setExternalProcessingConfirmed] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(requestedRunId);
  const [actionMessage, setActionMessage] = useState<string | null>(null);


  const capabilitiesQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'capabilities'],
    queryFn: fetchCapabilities
  });

  const runsQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'runs'],
    queryFn: fetchRuns
  });

  const selectedRunKey = requestedRunId || selectedRunId;
  const selectedRunQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'run', selectedRunKey],
    queryFn: () => fetchRun(selectedRunKey || ''),
    enabled: Boolean(selectedRunKey)
  });

  const selectedIntentCapability = useMemo(
    () => capabilitiesQuery.data?.intents.find((item) => item.intent === intent),
    [capabilitiesQuery.data?.intents, intent]
  );
  const needsProduct = ['product_risk_explanation', 'prepare_min_stock_proposal', 'prepare_standard_cost_proposal'].includes(intent);

  const productsQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'products'],
    queryFn: fetchProducts,
    enabled: needsProduct && Boolean(selectedIntentCapability?.available)
  });

  const createMutation = useMutation({
    mutationFn: createRun,
    onSuccess: async (run) => {
      setActionMessage(run.proposal_snapshot
        ? 'Copilot proposal created. It must be reviewed in AI Review before an Execution Request draft can be created.'
        : 'Copilot analysis completed. No operational data was changed.');
      setSelectedRunId(run.id);
      setSearchParams({ run_id: run.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-operations-copilot', 'runs'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-operations-copilot', 'capabilities'] }),
        queryClient.invalidateQueries({ queryKey: ['human-in-loop-ai-review'] })
      ]);
    },
    onError: (error) => {
      const message = readableError(error);
      setActionMessage(message);
      showTenantActionError(message);
    }
  });

  const runRows = runsQuery.data?.rows || [];
  const selectedRun = selectedRunQuery.data
    || runRows.find((run) => run.id === selectedRunId)
    || runRows[0]
    || null;


  const provider = capabilitiesQuery.data?.provider;
  const minStockValue = Number(proposedMinStock);
  const standardCostValue = Number(proposedStandardUnitCost);
  const canSubmit = Boolean(
    capabilities.canGovernDecisionIntelligence
    && capabilitiesQuery.data?.can_run
    && selectedIntentCapability?.available
    && prompt.trim().length >= 3
    && (!needsProduct || productId)
    && (intent !== 'prepare_min_stock_proposal' || (proposedMinStock !== '' && Number.isFinite(minStockValue) && minStockValue >= 0))
    && (intent !== 'prepare_standard_cost_proposal' || (proposedStandardUnitCost !== '' && Number.isFinite(standardCostValue) && standardCostValue >= 0))
    && (!provider?.external_processing_confirmation_required || externalProcessingConfirmed)
    && !createMutation.isPending
  );

  const handleIntentChange = (nextIntent: CopilotIntent) => {
    setIntent(nextIntent);
    setActionMessage(null);
    if (nextIntent === 'operational_priority_summary') {
      setPrompt('Summarize the most important operational evidence I should review now.');
    } else if (nextIntent === 'product_risk_explanation') {
      setPrompt('Explain the operational risk for this product using only the tenant evidence available to me.');
    } else if (nextIntent === 'supplier_performance_summary') {
      setPrompt('Summarize which suppliers require operational review and explain the evidence.');
    } else if (nextIntent === 'prepare_min_stock_proposal') {
      setPrompt('Prepare a governed minimum-stock proposal and explain the evidence. Do not change the product.');
    } else {
      setPrompt('Prepare a governed standard-cost proposal and explain the received-cost evidence. Do not change the product.');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const input: CreateRunInput = { intent, prompt: prompt.trim() };
    if (needsProduct) input.product_id = productId;
    if (intent === 'prepare_min_stock_proposal') input.proposed_min_stock = minStockValue;
    if (intent === 'prepare_standard_cost_proposal') input.proposed_standard_unit_cost = standardCostValue;
    input.external_processing_confirmed = provider?.external_processing_confirmation_required
      ? externalProcessingConfirmed
      : false;
    createMutation.mutate(input);
  };

  const selectRun = (runId: string) => {
    setSelectedRunId(runId);
    setSearchParams({ run_id: runId });
  };

  const proposal = selectedRun?.proposal_snapshot || null;
  const isMinStockProposal = proposal?.request_type === 'product_min_stock_update';
  const isStandardCostProposal = proposal?.request_type === 'cost_standard_update';
  const proposalCurrentValue = isMinStockProposal
    ? proposal?.payload?.previous_min_stock
    : isStandardCostProposal
      ? proposal?.payload?.previous_standard_unit_cost
      : undefined;
  const proposalTargetValue = isMinStockProposal
    ? proposal?.payload?.min_stock
    : isStandardCostProposal
      ? proposal?.payload?.standard_unit_cost
      : undefined;
  const proposalValueLabel = isMinStockProposal ? 'minimum stock' : isStandardCostProposal ? 'standard unit cost' : 'value';
  const response = selectedRun?.response_snapshot || {};
  const reviewLink = selectedRun?.source_action_id
    ? `/ai-review?source_action_id=${encodeURIComponent(selectedRun.source_action_id)}`
    : '/ai-review';
  const executionRequestLink = selectedRun?.execution_request_id
    ? `/execution-requests?request_id=${encodeURIComponent(selectedRun.execution_request_id)}`
    : '/execution-requests';

  return (
    <div style={styles.page}>
      <header style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Governed tenant intelligence</div>
          <h1 style={styles.title}>AI Operations Copilot</h1>
          <p style={styles.subtitle}>
            Ask narrowly scoped inventory questions or prepare controlled product proposals. The server controls every tenant read, validates structured output, and performs no operational write.
          </p>
        </div>
        <div style={styles.heroBadges}>
          <Badge tone="good">Tenant scoped</Badge>
          <Badge tone="good">No autonomous execution</Badge>
          <Badge tone="good">Human review required</Badge>
        </div>
      </header>

      {capabilitiesQuery.isError ? <div style={styles.error}>{readableError(capabilitiesQuery.error)}</div> : null}
      {actionMessage ? <div style={styles.info}>{actionMessage}</div> : null}

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Effective provider mode</div>
          <div style={styles.summaryValue}>{formatLabel(provider?.effective_mode)}</div>
          <div style={styles.summaryHelp}>{provider?.model ? `Model: ${provider.model}` : 'No external model required in local-rules mode.'}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>External data sharing</div>
          <div style={styles.summaryValue}>{provider?.external_provider_ready ? 'Configured' : 'Not active'}</div>
          <div style={styles.summaryHelp}>Each completed run records whether tenant evidence was shared externally.</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Operational authority</div>
          <div style={styles.summaryValue}>None</div>
          <div style={styles.summaryHelp}>The Copilot cannot submit, approve, or execute an Execution Request.</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Hourly usage guardrail</div>
          <div style={styles.summaryValue}>{capabilitiesQuery.data?.run_limits ? `${capabilitiesQuery.data.run_limits.user_runs_used}/${capabilitiesQuery.data.run_limits.user_limit}` : 'Loading'}</div>
          <div style={styles.summaryHelp}>User runs used. Tenant usage: {capabilitiesQuery.data?.run_limits ? `${capabilitiesQuery.data.run_limits.tenant_runs_used}/${capabilitiesQuery.data.run_limits.tenant_limit}` : 'not reported'}.</div>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <Panel title="Create a governed Copilot run" subtitle="Only intents supported by your effective tenant permissions are available.">
          <form onSubmit={handleSubmit} style={styles.form} data-skip-global-action-feedback="true">
            <label style={styles.field}>
              <span style={styles.label}>Intent</span>
              <select value={intent} onChange={(event) => handleIntentChange(event.target.value as CopilotIntent)} style={styles.input}>
                {(capabilitiesQuery.data?.intents || Object.entries(intentFallbacks).map(([key, item]) => ({
                  intent: key as CopilotIntent,
                  ...item,
                  available: true,
                  missing_permissions: []
                }))).map((item) => (
                  <option key={item.intent} value={item.intent} disabled={!item.available}>
                    {item.label}{item.available ? '' : ' — unavailable for this role'}
                  </option>
                ))}
              </select>
              <span style={styles.help}>{selectedIntentCapability?.description || intentFallbacks[intent].description}</span>
              {selectedIntentCapability && !selectedIntentCapability.available ? (
                <span style={styles.fieldError}>Missing permissions: {selectedIntentCapability.missing_permissions.join(', ')}</span>
              ) : null}
            </label>

            {needsProduct ? (
              <label style={styles.field}>
                <span style={styles.label}>Product</span>
                <select value={productId} onChange={(event) => setProductId(event.target.value)} style={styles.input}>
                  <option value="">Select a product</option>
                  {(productsQuery.data || []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — min {displayUnknown(product.min_stock)} {product.unit} · standard cost {displayUnknown(product.standard_unit_cost)}
                    </option>
                  ))}
                </select>
                {productsQuery.isLoading ? <span style={styles.help}>Loading products…</span> : null}
                {productsQuery.isError ? <span style={styles.fieldError}>{readableError(productsQuery.error)}</span> : null}
              </label>
            ) : null}

            {intent === 'prepare_min_stock_proposal' ? (
              <label style={styles.field}>
                <span style={styles.label}>Proposed minimum stock</span>
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  value={proposedMinStock}
                  onChange={(event) => setProposedMinStock(event.target.value)}
                  style={styles.input}
                />
                <span style={styles.help}>This value becomes a server-controlled proposal. It does not update the product.</span>
              </label>
            ) : null}

            {intent === 'prepare_standard_cost_proposal' ? (
              <label style={styles.field}>
                <span style={styles.label}>Proposed standard unit cost</span>
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.0001"
                  value={proposedStandardUnitCost}
                  onChange={(event) => setProposedStandardUnitCost(event.target.value)}
                  style={styles.input}
                />
                <span style={styles.help}>The server records the current standard cost and recent cost-bearing movement evidence. This does not update the product.</span>
              </label>
            ) : null}

            <label style={styles.field}>
              <span style={styles.label}>Question or rationale</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} maxLength={2000} style={styles.textarea} />
              <span style={styles.help}>{prompt.length}/2000 characters</span>
            </label>

            {provider?.external_processing_confirmation_required ? (
              <label style={styles.confirmation}>
                <input
                  type="checkbox"
                  checked={externalProcessingConfirmed}
                  onChange={(event) => setExternalProcessingConfirmed(event.target.checked)}
                />
                <span>
                  I confirm that the tenant evidence assembled for this run may be sent to the configured external AI provider. The run will record whether external sharing occurred.
                </span>
              </label>
            ) : null}

            <button type="submit" className="primary-button" style={styles.primaryButton} disabled={!canSubmit}>
              {createMutation.isPending ? 'Running governed analysis…' : selectedIntentCapability?.proposal_supported ? 'Prepare proposal for AI Review' : 'Run read-only analysis'}
            </button>
            {!capabilities.canGovernDecisionIntelligence ? (
              <div style={styles.notice}>Your role can view Copilot history but cannot create Copilot runs.</div>
            ) : null}
          </form>
        </Panel>

        <Panel title="Selected result" subtitle={selectedRun ? `Run ${selectedRun.id}` : 'Run an analysis or select a historical result.'}>
          {!selectedRun ? <div style={styles.empty}>No Copilot runs are available.</div> : (
            <div style={styles.resultStack}>
              <div style={styles.badgeRow}>
                <Badge tone={selectedRun.run_status === 'completed' ? 'good' : selectedRun.run_status === 'failed' ? 'bad' : 'warn'}>{formatLabel(selectedRun.run_status)}</Badge>
                <Badge>{formatLabel(selectedRun.intent)}</Badge>
                <Badge>{formatLabel(selectedRun.provider)}</Badge>
                <Badge tone={selectedRun.data_shared_externally ? 'warn' : 'good'}>
                  {selectedRun.data_shared_externally ? 'Evidence shared externally' : 'No external data sharing'}
                </Badge>
                <Badge>Confidence {formatConfidence(selectedRun.confidence_score)}</Badge>
              </div>

              {selectedRun.run_status === 'failed' ? (
                <div style={styles.error}>{selectedRun.error_message || selectedRun.error_code || 'Copilot run failed.'}</div>
              ) : (
                <>
                  <div style={styles.answer}>{response.answer || 'No answer was recorded.'}</div>
                  {(response.highlights || []).length ? (
                    <div>
                      <h3 style={styles.sectionTitle}>Highlights</h3>
                      <ul style={styles.list}>{(response.highlights || []).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
                    </div>
                  ) : null}
                  {(response.evidence || []).length ? (
                    <div>
                      <h3 style={styles.sectionTitle}>Evidence references</h3>
                      <div style={styles.evidenceGrid}>
                        {(response.evidence || []).map((item, index) => (
                          <div key={`${item.kind}-${item.id || index}`} style={styles.evidenceCard}>
                            <strong>{item.label}</strong>
                            <span style={styles.help}>{formatLabel(item.kind)}{item.id ? ` · ${item.id}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {proposal ? (
                <div style={styles.proposalBox}>
                  <div style={styles.proposalHeader}>
                    <div>
                      <div style={styles.eyebrow}>Structured proposal</div>
                      <h3 style={styles.proposalTitle}>{proposal.title || 'Governed proposal'}</h3>
                    </div>
                    <Badge tone="warn">Human review required</Badge>
                  </div>
                  <div style={styles.keyValueGrid}>
                    <div><span style={styles.keyLabel}>Request type</span><strong>{formatLabel(proposal.request_type)}</strong></div>
                    <div><span style={styles.keyLabel}>Product</span><strong>{proposal.payload?.product_name || proposal.payload?.product_id || 'Not reported'}</strong></div>
                    <div><span style={styles.keyLabel}>Current {proposalValueLabel}</span><strong>{displayUnknown(proposalCurrentValue)}</strong></div>
                    <div><span style={styles.keyLabel}>Proposed {proposalValueLabel}</span><strong>{displayUnknown(proposalTargetValue)}</strong></div>
                  </div>
                  <p style={styles.help}>No product field has changed. A permitted reviewer must approve this proposal in AI Review before a draft Execution Request can be created.</p>
                  <div style={styles.actionRow}>
                    <Link to={reviewLink} style={styles.linkButton} data-skip-global-action-feedback="true">Open in AI Review</Link>
                    {selectedRun.execution_request_id ? <Link to={executionRequestLink} style={styles.secondaryLink} data-skip-global-action-feedback="true">Open linked Execution Request</Link> : null}
                  </div>
                </div>
              ) : null}

              <div style={styles.metadataGrid}>
                <div><span style={styles.keyLabel}>Created</span><strong>{formatDateTime(selectedRun.created_at)}</strong></div>
                <div><span style={styles.keyLabel}>Completed</span><strong>{formatDateTime(selectedRun.completed_at)}</strong></div>
                <div><span style={styles.keyLabel}>Latency</span><strong>{selectedRun.latency_ms == null ? 'Not reported' : `${selectedRun.latency_ms} ms`}</strong></div>
                <div><span style={styles.keyLabel}>Provider response stored</span><strong>{selectedRun.provider_response_id ? 'Reference only' : 'No'}</strong></div>
                <div><span style={styles.keyLabel}>External processing confirmed</span><strong>{selectedRun.external_processing_confirmed ? 'Yes' : 'No'}</strong></div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Run history" subtitle={`${runsQuery.data?.total || 0} tenant-scoped run(s). Select a row to inspect its persisted evidence and proposal.`}>
        {runsQuery.isError ? <div style={styles.error}>{readableError(runsQuery.error)}</div> : null}
        {runsQuery.isLoading ? <div style={styles.empty}>Loading Copilot history…</div> : null}
        <div style={styles.historyList}>
          {runRows.map((run) => (
            <button key={run.id} type="button" onClick={() => selectRun(run.id)} style={{ ...styles.historyButton, ...(selectedRun?.id === run.id ? styles.historyButtonSelected : {}) }}>
              <div style={styles.historyMain}>
                <strong>{intentFallbacks[run.intent]?.label || formatLabel(run.intent)}</strong>
                <span style={styles.historyPrompt}>{run.user_prompt}</span>
              </div>
              <div style={styles.historyMeta}>
                <Badge tone={run.run_status === 'completed' ? 'good' : run.run_status === 'failed' ? 'bad' : 'warn'}>{formatLabel(run.run_status)}</Badge>
                {run.proposal_snapshot ? <Badge tone="warn">Proposal</Badge> : <Badge>Read only</Badge>}
                <span>{formatDateTime(run.created_at)}</span>
              </div>
            </button>
          ))}
          {!runRows.length && !runsQuery.isLoading ? <div style={styles.empty}>No runs have been created.</div> : null}
        </div>
      </Panel>

      <Panel title="Enforced safety boundary" subtitle="These controls are server-side and do not depend on model instructions.">
        <div style={styles.safetyGrid}>
          {Object.entries(capabilitiesQuery.data?.safety_contract || {
            tenant_scoped_reads_only: true,
            model_selects_database_queries: false,
            model_calls_tools: false,
            direct_operational_mutation: false,
            autonomous_execution: false,
            proposals_require_ai_review: true
          }).map(([key, value]) => (
            <div key={key} style={styles.safetyItem}>
              <Badge tone={value || key.includes('false') ? 'good' : 'default'}>{value ? 'Enforced' : 'Blocked'}</Badge>
              <span>{formatLabel(key)}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18 },
  hero: { display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12, fontWeight: 800, color: 'var(--muted-text, #64748b)' },
  title: { margin: '4px 0 8px', fontSize: 32, lineHeight: 1.15 },
  subtitle: { margin: 0, maxWidth: 850, color: 'var(--muted-text, #64748b)', lineHeight: 1.55 },
  heroBadges: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  summaryCard: { border: '1px solid var(--border-color, #dbe3ee)', borderRadius: 12, padding: 16, background: 'var(--panel-background, #fff)' },
  summaryLabel: { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted-text, #64748b)' },
  summaryValue: { fontSize: 20, fontWeight: 800, marginTop: 5, textTransform: 'capitalize' },
  summaryHelp: { marginTop: 6, fontSize: 13, color: 'var(--muted-text, #64748b)', lineHeight: 1.4 },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(300px, 0.8fr) minmax(360px, 1.2fr)', gap: 16, alignItems: 'start' },
  panel: { border: '1px solid var(--border-color, #dbe3ee)', borderRadius: 14, background: 'var(--panel-background, #fff)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 },
  panelTitle: { margin: 0, fontSize: 19 },
  panelSubtitle: { margin: '5px 0 0', color: 'var(--muted-text, #64748b)', lineHeight: 1.45 },
  form: { display: 'grid', gap: 15 },
  field: { display: 'grid', gap: 7 },
  label: { fontSize: 13, fontWeight: 800 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 8, padding: '10px 11px', background: 'var(--input-background, #fff)', color: 'inherit' },
  textarea: { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 8, padding: '10px 11px', background: 'var(--input-background, #fff)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' },
  help: { fontSize: 12, color: 'var(--muted-text, #64748b)', lineHeight: 1.45 },
  fieldError: { fontSize: 12, color: '#b42318', lineHeight: 1.4 },
  primaryButton: { width: '100%', padding: '11px 14px', borderRadius: 8, cursor: 'pointer' },
  notice: { padding: 10, borderRadius: 8, background: 'rgba(245, 158, 11, 0.12)', fontSize: 13 },
  confirmation: { display: 'flex', gap: 9, alignItems: 'flex-start', padding: 11, borderRadius: 9, border: '1px solid rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.08)', fontSize: 13, lineHeight: 1.45 },
  info: { padding: 12, borderRadius: 10, background: 'rgba(37, 99, 235, 0.10)', border: '1px solid rgba(37, 99, 235, 0.25)' },
  error: { padding: 12, borderRadius: 10, background: 'rgba(180, 35, 24, 0.10)', border: '1px solid rgba(180, 35, 24, 0.25)', color: '#b42318' },
  empty: { padding: 20, textAlign: 'center', color: 'var(--muted-text, #64748b)' },
  resultStack: { display: 'grid', gap: 16 },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 800, textTransform: 'capitalize', border: '1px solid transparent' },
  badge_default: { background: 'rgba(100, 116, 139, 0.12)', color: 'inherit' },
  badge_good: { background: 'rgba(16, 185, 129, 0.13)', color: '#047857', borderColor: 'rgba(16, 185, 129, 0.24)' },
  badge_warn: { background: 'rgba(245, 158, 11, 0.14)', color: '#9a6700', borderColor: 'rgba(245, 158, 11, 0.28)' },
  badge_bad: { background: 'rgba(220, 38, 38, 0.12)', color: '#b42318', borderColor: 'rgba(220, 38, 38, 0.24)' },
  answer: { padding: 15, borderRadius: 10, background: 'rgba(100, 116, 139, 0.08)', lineHeight: 1.6 },
  sectionTitle: { fontSize: 15, margin: '0 0 8px' },
  list: { margin: 0, paddingLeft: 20, display: 'grid', gap: 6, lineHeight: 1.45 },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 },
  evidenceCard: { display: 'grid', gap: 4, padding: 10, borderRadius: 8, border: '1px solid var(--border-color, #dbe3ee)' },
  proposalBox: { display: 'grid', gap: 13, padding: 15, borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.08)' },
  proposalHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  proposalTitle: { margin: '3px 0 0', fontSize: 17 },
  keyValueGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 },
  keyLabel: { display: 'block', fontSize: 11, textTransform: 'uppercase', color: 'var(--muted-text, #64748b)', marginBottom: 3 },
  actionRow: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  linkButton: { display: 'inline-flex', padding: '9px 12px', borderRadius: 8, background: 'var(--primary-color, #2563eb)', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 13 },
  secondaryLink: { fontWeight: 800, fontSize: 13 },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border-color, #dbe3ee)' },
  historyList: { display: 'grid', gap: 8 },
  historyButton: { width: '100%', border: '1px solid var(--border-color, #dbe3ee)', borderRadius: 10, padding: 12, background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  historyButtonSelected: { borderColor: 'var(--primary-color, #2563eb)', boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.10)' },
  historyMain: { display: 'grid', gap: 4, minWidth: 0 },
  historyPrompt: { color: 'var(--muted-text, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 700 },
  historyMeta: { display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', justifyContent: 'flex-end', fontSize: 12, color: 'var(--muted-text, #64748b)' },
  safetyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 9 },
  safetyItem: { display: 'flex', gap: 9, alignItems: 'center', padding: 9, borderRadius: 8, background: 'rgba(100, 116, 139, 0.07)', fontSize: 13 }
};
