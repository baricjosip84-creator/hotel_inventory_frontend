import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { showTenantActionError } from '../lib/actionFeedback';
import type { ProductItem } from '../types/inventory';
import './AIOperationsCopilotPage.css';

type CopilotIntent =
  | 'operational_priority_summary'
  | 'product_risk_explanation'
  | 'product_replenishment_plan'
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
  run_unavailable_reason?: string | null;
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
    unavailable_reason?: string | null;
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
    system_recommended_min_stock?: number;
    recommendation_formula_version?: string;
    user_override_applied?: boolean;
    override_reason?: string | null;
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
  min_stock_override_reason?: string;
  proposed_standard_unit_cost?: number;
  external_processing_confirmed?: boolean;
};

type ReplenishmentPlan = {
  formula_version: string;
  formula: string;
  target_coverage_days: number;
  current_stock: number;
  governed_min_stock: number;
  target_stock_quantity: number;
  inventory_position: number;
  gross_open_inbound_quantity: number;
  reliable_open_inbound_quantity: number;
  at_risk_open_inbound_quantity: number;
  inbound_data_available?: boolean;
  pre_moq_reorder_quantity: number;
  min_order_quantity: number;
  moq_adjusted_reorder_quantity: number;
  units_per_order_package: number;
  recommended_order_package_count: number;
  recommended_reorder_quantity: number;
  package_rounding_applied: boolean;
  package_rounding_added_quantity: number;
  recommendation_status: string;
  warnings: string[];
  assumptions: string[];
};

type MinimumStockRecommendation = {
  product_id: string;
  product_name: string;
  unit?: string | null;
  method: string;
  formula_version: string;
  formula: string;
  recommendation_status: 'calculated' | 'limited_history' | 'no_outbound_history';
  current_min_stock: number;
  recommended_min_stock: number;
  raw_recommended_min_stock: number;
  direction: 'increase' | 'decrease' | 'keep_current';
  would_change: boolean;
  confidence_score: number;
  confidence_meaning: string;
  inputs: {
    lookback_days: number;
    recent_window_days: number;
    total_outbound_90d: number;
    total_outbound_30d: number;
    observed_days_90d: number;
    observed_days_30d: number;
    average_daily_usage_90d: number;
    average_daily_usage_30d: number;
    selected_daily_demand: number;
    daily_demand_stddev_90d: number;
    outbound_events_90d: number;
    active_usage_days_90d: number;
    outbound_history_days: number;
    first_outbound_at?: string | null;
    last_outbound_at?: string | null;
    configured_lead_time_days?: number | null;
    lead_time_configured: boolean;
    lead_time_buffer_days: number;
    supplier_delay_sample_count: number;
    average_supplier_delay_days: number;
    supplier_delay_buffer_days: number;
    effective_coverage_days: number;
    service_factor: number;
    default_package_name?: string | null;
    units_per_package: number;
    package_rounding_applied: boolean;
    package_size_excluded_from_threshold?: boolean;
    base_unit_increment?: number;
  };
  calculation: {
    expected_lead_time_demand: number;
    safety_stock: number;
    before_package_rounding: number;
    after_package_rounding: number;
    before_base_unit_rounding?: number;
    after_base_unit_rounding?: number;
  };
  operational_context: {
    current_stock: number;
    visible_open_inbound_quantity: number;
    unresolved_alert_count: number;
  };
  assumptions: string[];
  warnings: string[];
  replenishment_plan?: ReplenishmentPlan;
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
  product_replenishment_plan: {
    label: 'Product replenishment plan',
    description: 'Show the minimum-stock threshold separately from the quantity to order, including reliable inbound, MOQ, and package rounding.'
  },
  supplier_performance_summary: {
    label: 'Supplier performance summary',
    description: 'Compare supplier shipment timeliness and receiving discrepancies without exposing contact details.'
  },
  prepare_min_stock_proposal: {
    label: 'Prepare minimum-stock proposal',
    description: 'Calculate a transparent minimum-stock recommendation from demand and replenishment evidence, then prepare the recommended or explicitly overridden value for Intelligence Review. No product is changed.'
  },
  prepare_standard_cost_proposal: {
    label: 'Prepare standard-cost proposal',
    description: 'Prepare a server-controlled standard unit cost proposal for Intelligence Review. No product is changed.'
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

const providerModeCopy: Record<string, { label: string; explanation: string }> = {
  openai_responses: {
    label: 'External AI model',
    explanation: 'The explanation is generated by the configured external AI model. The server still chooses the data, validates the result, and controls every proposal value.'
  },
  local_rules: {
    label: 'Built-in rules — no AI model',
    explanation: 'The current mode does not use an AI model. The selected analysis type runs fixed calculations and rules against permitted tenant data.'
  },
  local_rules_fallback: {
    label: 'Built-in rules — external AI unavailable',
    explanation: 'The external AI model is unavailable, so the server is using its fixed calculations and rules instead.'
  },
  disabled: {
    label: 'Unavailable',
    explanation: 'Copilot analysis is disabled for this deployment.'
  },
  unavailable: {
    label: 'Unavailable',
    explanation: 'The configured analysis provider is not ready.'
  }
};

const safetyLabels: Record<string, string> = {
  tenant_scoped_reads_only: 'Can read only the current tenant’s permitted data',
  model_selects_database_queries: 'Cannot choose database queries',
  model_calls_tools: 'Cannot call tools',
  arbitrary_endpoint_access: 'Cannot open arbitrary application endpoints',
  direct_operational_mutation: 'Cannot directly change operational data',
  autonomous_execution: 'Cannot act without a person',
  structured_output_validated: 'Result structure is checked by the server',
  proposals_require_ai_review: 'Proposals require Intelligence Review',
  execution_requests_remain_human_approved: 'Execution Requests remain human approved'
};

function providerModeDetails(mode?: string | null) {
  return providerModeCopy[String(mode || 'unavailable')] || {
    label: formatLabel(mode),
    explanation: 'The server reports how this result was produced.'
  };
}

function resultProviderLabel(provider?: string | null): string {
  if (provider === 'openai_responses') return 'External AI explanation';
  if (provider === 'local_rules_fallback') return 'Built-in rules fallback';
  if (provider === 'local_rules') return 'Built-in rules';
  return formatLabel(provider);
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

async function fetchMinimumStockRecommendation(productId: string): Promise<MinimumStockRecommendation> {
  return apiRequest<MinimumStockRecommendation>(`/ai-operations-copilot/minimum-stock-recommendation/${productId}`);
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
    <section id={props.id} className="app-panel app-panel--padded ai-copilot-panel" style={styles.panel}>
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
  const [minStockOverrideReason, setMinStockOverrideReason] = useState('');
  const [minStockValueTouched, setMinStockValueTouched] = useState(false);
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
  const needsProduct = ['product_risk_explanation', 'product_replenishment_plan', 'prepare_min_stock_proposal', 'prepare_standard_cost_proposal'].includes(intent);

  const productsQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'products'],
    queryFn: fetchProducts,
    enabled: needsProduct && Boolean(selectedIntentCapability?.available)
  });

  const minimumStockRecommendationQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'minimum-stock-recommendation', productId],
    queryFn: () => fetchMinimumStockRecommendation(productId),
    enabled: ['prepare_min_stock_proposal', 'product_replenishment_plan'].includes(intent) && Boolean(productId) && Boolean(selectedIntentCapability?.available)
  });

  const minimumStockRecommendation = minimumStockRecommendationQuery.data;
  const effectiveProposedMinStock = intent === 'prepare_min_stock_proposal'
    && minimumStockRecommendation
    && !minStockValueTouched
    ? String(minimumStockRecommendation.recommended_min_stock)
    : proposedMinStock;

  const createMutation = useMutation({
    mutationFn: createRun,
    onSuccess: async (run) => {
      setActionMessage(run.proposal_snapshot
        ? 'Copilot proposal created. It must be reviewed in Intelligence Review before an Execution Request draft can be created.'
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
  const selectedRun = selectedRunKey
    ? selectedRunQuery.data || null
    : runRows[0] || null;

  const provider = capabilitiesQuery.data?.provider;
  const modeDetails = providerModeDetails(provider?.effective_mode);
  const selectedProduct = (productsQuery.data || []).find((product) => product.id === productId) || null;
  const minStockValue = Number(effectiveProposedMinStock);
  const standardCostValue = Number(proposedStandardUnitCost);
  const minStockOverrideApplied = Boolean(
    minimumStockRecommendation
    && effectiveProposedMinStock !== ''
    && Number.isFinite(minStockValue)
    && Math.abs(minStockValue - minimumStockRecommendation.recommended_min_stock) > 0.0001
  );
  const minStockNoChange = Boolean(
    minimumStockRecommendation
    && effectiveProposedMinStock !== ''
    && Number.isFinite(minStockValue)
    && Math.abs(minStockValue - minimumStockRecommendation.current_min_stock) <= 0.0001
  );
  const currentStandardCost = selectedProduct?.standard_unit_cost == null
    ? null
    : Number(selectedProduct.standard_unit_cost);
  const standardCostNoChange = Boolean(
    intent === 'prepare_standard_cost_proposal'
    && currentStandardCost !== null
    && proposedStandardUnitCost !== ''
    && Number.isFinite(standardCostValue)
    && Math.abs(currentStandardCost - standardCostValue) <= 0.0001
  );
  const canSubmit = Boolean(
    capabilities.canGovernDecisionIntelligence
    && capabilitiesQuery.data?.can_run
    && selectedIntentCapability?.available
    && prompt.trim().length >= 3
    && (!needsProduct || productId)
    && (intent !== 'prepare_min_stock_proposal' || (
      Boolean(minimumStockRecommendation)
      && !minimumStockRecommendationQuery.isFetching
      && effectiveProposedMinStock !== ''
      && Number.isFinite(minStockValue)
      && minStockValue >= 0
      && !minStockNoChange
      && (!minStockOverrideApplied || minStockOverrideReason.trim().length >= 3)
    ))
    && (intent !== 'prepare_standard_cost_proposal' || (proposedStandardUnitCost !== '' && Number.isFinite(standardCostValue) && standardCostValue >= 0 && !standardCostNoChange))
    && (!provider?.external_processing_confirmation_required || externalProcessingConfirmed)
    && !createMutation.isPending
  );

  const handleIntentChange = (nextIntent: CopilotIntent) => {
    setIntent(nextIntent);
    setActionMessage(null);
    setMinStockOverrideReason('');
    setMinStockValueTouched(false);
    if (nextIntent !== 'prepare_min_stock_proposal') setProposedMinStock('');
    if (nextIntent !== 'prepare_standard_cost_proposal') setProposedStandardUnitCost('');
    if (nextIntent === 'operational_priority_summary') {
      setPrompt('Summarize the most important operational evidence I should review now.');
    } else if (nextIntent === 'product_risk_explanation') {
      setPrompt('Explain the operational risk for this product using only the tenant evidence available to me.');
    } else if (nextIntent === 'product_replenishment_plan') {
      setPrompt('Explain the minimum-stock threshold and the separate reorder quantity using reliable inbound, MOQ, and package evidence. Do not create a purchase order.');
    } else if (nextIntent === 'supplier_performance_summary') {
      setPrompt('Summarize which suppliers require operational review and explain the evidence.');
    } else if (nextIntent === 'prepare_min_stock_proposal') {
      setPrompt('Calculate a transparent minimum-stock recommendation, prepare the recommended value for governed review, and explain every input. Do not change the product.');
    } else {
      setPrompt('Prepare a governed standard-cost proposal and explain the received-cost evidence. Do not change the product.');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const input: CreateRunInput = { intent, prompt: prompt.trim() };
    if (needsProduct) input.product_id = productId;
    if (intent === 'prepare_min_stock_proposal') {
      input.proposed_min_stock = minStockValue;
      if (minStockOverrideApplied) input.min_stock_override_reason = minStockOverrideReason.trim();
    }
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

  const clearRunSelection = () => {
    setSelectedRunId(null);
    setSearchParams({});
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
    ? `/intelligence-review?source_action_id=${encodeURIComponent(selectedRun.source_action_id)}`
    : '/intelligence-review';
  const executionRequestLink = selectedRun?.execution_request_id
    ? `/execution-requests?request_id=${encodeURIComponent(selectedRun.execution_request_id)}`
    : '/execution-requests';

  return (
    <div className="ai-copilot-page" style={styles.page}>
      <header style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Governed tenant intelligence</div>
          <h1 style={styles.title}>Inventory analysis and proposal assistant</h1>
          <p style={styles.subtitle}>
            Choose a defined inventory analysis or prepare a product proposal for human review. It explains information but cannot change inventory or approve work.
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
          <div style={styles.summaryLabel}>How results are produced</div>
          <div style={styles.summaryValue}>{modeDetails.label}</div>
          <div style={styles.summaryHelp}>{provider?.model && provider?.effective_mode === 'openai_responses' ? `Model: ${provider.model}` : modeDetails.explanation}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>External data sharing</div>
          <div style={styles.summaryValue}>{provider?.external_provider_ready ? 'Configured' : 'Not active'}</div>
          <div style={styles.summaryHelp}>Each completed run records whether tenant evidence was shared externally.</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>What it can change</div>
          <div style={styles.summaryValue}>None</div>
          <div style={styles.summaryHelp}>The Copilot cannot submit, approve, or execute an Execution Request.</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Runs this hour</div>
          <div style={styles.summaryValue}>{capabilitiesQuery.data?.run_limits ? `${capabilitiesQuery.data.run_limits.user_runs_used}/${capabilitiesQuery.data.run_limits.user_limit}` : 'Loading'}</div>
          <div style={styles.summaryHelp}>User runs used. Tenant usage: {capabilitiesQuery.data?.run_limits ? `${capabilitiesQuery.data.run_limits.tenant_runs_used}/${capabilitiesQuery.data.run_limits.tenant_limit}` : 'not reported'}.</div>
        </div>
      </div>

      <div style={provider?.effective_mode === 'openai_responses' ? styles.externalModeNotice : styles.modeNotice}>
        <strong>{modeDetails.label}.</strong> {modeDetails.explanation}
      </div>
      {capabilitiesQuery.data?.run_unavailable_reason ? (
        <div style={styles.error}>{capabilitiesQuery.data.run_unavailable_reason}</div>
      ) : null}

      <div className="ai-copilot-main-grid" style={styles.mainGrid}>
        <Panel title="Start a new analysis" subtitle="Choose the result you need. Options are limited by your current permissions.">
          <form onSubmit={handleSubmit} style={styles.form} data-skip-global-action-feedback="true">
            <label style={styles.field}>
              <span style={styles.label}>Analysis type</span>
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
                <select value={productId} onChange={(event) => {
                  setProductId(event.target.value);
                  setProposedMinStock('');
                  setMinStockOverrideReason('');
                  setMinStockValueTouched(false);
                  setProposedStandardUnitCost('');
                }} style={styles.input}>
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

            {['prepare_min_stock_proposal', 'product_replenishment_plan'].includes(intent) ? (
              <div style={styles.recommendationStack}>
                {minimumStockRecommendationQuery.isLoading || minimumStockRecommendationQuery.isFetching ? (
                  <div style={styles.notice}>Calculating the minimum-stock threshold and replenishment plan from tenant evidence…</div>
                ) : minimumStockRecommendationQuery.isError ? (
                  <div style={styles.error}>{readableError(minimumStockRecommendationQuery.error)}</div>
                ) : minimumStockRecommendation ? (
                  <>
                    <div style={styles.recommendationBox}>
                      <div style={styles.proposalHeader}>
                        <div>
                          <div style={styles.eyebrow}>Deterministic threshold recommendation</div>
                          <h3 style={styles.proposalTitle}>Recommended minimum stock: {minimumStockRecommendation.recommended_min_stock} {minimumStockRecommendation.unit || ''}</h3>
                        </div>
                        <Badge tone={minimumStockRecommendation.recommendation_status === 'calculated' ? 'good' : 'warn'}>
                          {formatLabel(minimumStockRecommendation.recommendation_status)}
                        </Badge>
                      </div>
                      <div style={styles.keyValueGrid}>
                        <div><span style={styles.keyLabel}>Current minimum</span><strong>{minimumStockRecommendation.current_min_stock}</strong></div>
                        <div><span style={styles.keyLabel}>Recommended minimum</span><strong>{minimumStockRecommendation.recommended_min_stock}</strong></div>
                        <div><span style={styles.keyLabel}>Raw requirement</span><strong>{minimumStockRecommendation.raw_recommended_min_stock}</strong></div>
                        <div><span style={styles.keyLabel}>Evidence quality</span><strong>{formatConfidence(minimumStockRecommendation.confidence_score)}</strong></div>
                        <div><span style={styles.keyLabel}>Direction</span><strong>{formatLabel(minimumStockRecommendation.direction)}</strong></div>
                        <div><span style={styles.keyLabel}>Base-unit increment</span><strong>{minimumStockRecommendation.inputs.base_unit_increment ?? 1}</strong></div>
                      </div>
                      <p style={styles.help}>{minimumStockRecommendation.formula}</p>
                      <div style={styles.calculationGrid}>
                        <div><span style={styles.keyLabel}>Demand used/day</span><strong>{minimumStockRecommendation.inputs.selected_daily_demand}</strong></div>
                        <div><span style={styles.keyLabel}>Configured lead time</span><strong>{minimumStockRecommendation.inputs.lead_time_configured ? `${minimumStockRecommendation.inputs.configured_lead_time_days} days` : 'Not configured'}</strong></div>
                        <div><span style={styles.keyLabel}>Effective coverage</span><strong>{minimumStockRecommendation.inputs.effective_coverage_days} days</strong></div>
                        <div><span style={styles.keyLabel}>Lead-time demand</span><strong>{minimumStockRecommendation.calculation.expected_lead_time_demand}</strong></div>
                        <div><span style={styles.keyLabel}>Safety stock</span><strong>{minimumStockRecommendation.calculation.safety_stock}</strong></div>
                        <div><span style={styles.keyLabel}>Before base rounding</span><strong>{minimumStockRecommendation.calculation.before_base_unit_rounding ?? minimumStockRecommendation.calculation.before_package_rounding}</strong></div>
                        <div><span style={styles.keyLabel}>After base rounding</span><strong>{minimumStockRecommendation.calculation.after_base_unit_rounding ?? minimumStockRecommendation.calculation.after_package_rounding}</strong></div>
                        <div><span style={styles.keyLabel}>Supplier delay buffer</span><strong>{minimumStockRecommendation.inputs.supplier_delay_buffer_days} days</strong></div>
                        <div><span style={styles.keyLabel}>30d / 90d usage</span><strong>{minimumStockRecommendation.inputs.total_outbound_30d} / {minimumStockRecommendation.inputs.total_outbound_90d}</strong></div>
                        <div><span style={styles.keyLabel}>Last outbound evidence</span><strong>{formatDateTime(minimumStockRecommendation.inputs.last_outbound_at)}</strong></div>
                      </div>
                      <div style={styles.notice}>Package size and minimum-order rules are intentionally excluded from the minimum-stock threshold. They are applied only to the separate reorder quantity below.</div>
                      <details>
                        <summary style={styles.detailsSummary}>Show threshold assumptions and warnings</summary>
                        <ul style={styles.list}>
                          {minimumStockRecommendation.assumptions.map((item) => <li key={item}>{item}</li>)}
                          {minimumStockRecommendation.warnings.map((item) => <li key={item}><strong>Warning:</strong> {item}</li>)}
                        </ul>
                      </details>
                      <div style={styles.help}>{minimumStockRecommendation.confidence_meaning}</div>
                    </div>

                    {minimumStockRecommendation.replenishment_plan ? (
                      <div style={styles.proposalBox}>
                        <div style={styles.proposalHeader}>
                          <div>
                            <div style={styles.eyebrow}>Separate replenishment plan</div>
                            <h3 style={styles.proposalTitle}>Recommended order quantity: {minimumStockRecommendation.replenishment_plan.recommended_reorder_quantity} {minimumStockRecommendation.unit || ''}</h3>
                          </div>
                          <Badge tone={minimumStockRecommendation.replenishment_plan.recommended_reorder_quantity > 0 ? 'warn' : 'good'}>
                            {minimumStockRecommendation.replenishment_plan.recommended_reorder_quantity > 0 ? 'Order suggested' : 'No order suggested'}
                          </Badge>
                        </div>
                        <div style={styles.keyValueGrid}>
                          <div><span style={styles.keyLabel}>Current stock</span><strong>{minimumStockRecommendation.replenishment_plan.current_stock}</strong></div>
                          <div><span style={styles.keyLabel}>Reliable inbound</span><strong>{minimumStockRecommendation.replenishment_plan.reliable_open_inbound_quantity}</strong></div>
                          <div><span style={styles.keyLabel}>At-risk inbound</span><strong>{minimumStockRecommendation.replenishment_plan.at_risk_open_inbound_quantity}</strong></div>
                          <div><span style={styles.keyLabel}>Inbound evidence</span><strong>{minimumStockRecommendation.replenishment_plan.inbound_data_available === false ? 'Unavailable for this role' : 'Available'}</strong></div>
                          <div><span style={styles.keyLabel}>Inventory position</span><strong>{minimumStockRecommendation.replenishment_plan.inventory_position}</strong></div>
                          <div><span style={styles.keyLabel}>Target stock</span><strong>{minimumStockRecommendation.replenishment_plan.target_stock_quantity}</strong></div>
                          <div><span style={styles.keyLabel}>Before MOQ</span><strong>{minimumStockRecommendation.replenishment_plan.pre_moq_reorder_quantity}</strong></div>
                          <div><span style={styles.keyLabel}>Minimum order quantity</span><strong>{minimumStockRecommendation.replenishment_plan.min_order_quantity}</strong></div>
                          <div><span style={styles.keyLabel}>Package size</span><strong>{minimumStockRecommendation.replenishment_plan.units_per_order_package}</strong></div>
                          <div><span style={styles.keyLabel}>Packages to order</span><strong>{minimumStockRecommendation.replenishment_plan.recommended_order_package_count}</strong></div>
                          <div><span style={styles.keyLabel}>Final order quantity</span><strong>{minimumStockRecommendation.replenishment_plan.recommended_reorder_quantity}</strong></div>
                        </div>
                        <p style={styles.help}>{minimumStockRecommendation.replenishment_plan.formula}</p>
                        <details>
                          <summary style={styles.detailsSummary}>Show replenishment assumptions and warnings</summary>
                          <ul style={styles.list}>
                            {minimumStockRecommendation.replenishment_plan.assumptions.map((item) => <li key={item}>{item}</li>)}
                            {minimumStockRecommendation.replenishment_plan.warnings.map((item) => <li key={item}><strong>Warning:</strong> {item}</li>)}
                          </ul>
                        </details>
                        <div style={styles.actionRow}>
                          <Link to="/procurement-recommendations" style={styles.linkButton} data-skip-global-action-feedback="true">
                            Open all-products replenishment workbench
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : productId ? null : (
                  <div style={styles.notice}>Select a product to calculate its threshold and replenishment plan.</div>
                )}

                {intent === 'prepare_min_stock_proposal' ? (
                  <>
                    <label style={styles.field}>
                      <span style={styles.label}>Final proposed minimum stock</span>
                      <input
                        type="number"
                        min="0"
                        max="1000000000"
                        step="0.01"
                        value={effectiveProposedMinStock}
                        onChange={(event) => {
                          setProposedMinStock(event.target.value);
                          setMinStockValueTouched(true);
                        }}
                        style={styles.input}
                      />
                      <span style={styles.help}>The threshold recommendation is filled automatically. You may change it, but an explanation is required. The separate reorder quantity is advisory and does not change the product or create a purchase order.</span>
                      {minStockNoChange ? <span style={styles.fieldError}>The final value matches the current product minimum, so there is no change to propose.</span> : null}
                    </label>

                    {minStockOverrideApplied ? (
                      <label style={styles.field}>
                        <span style={styles.label}>Why are you overriding the threshold recommendation?</span>
                        <textarea
                          value={minStockOverrideReason}
                          onChange={(event) => setMinStockOverrideReason(event.target.value)}
                          rows={3}
                          maxLength={1000}
                          style={styles.textarea}
                          placeholder="Explain the business evidence or policy reason for using a different threshold."
                        />
                        <span style={styles.help}>{minStockOverrideReason.length}/1000 characters</span>
                        {minStockOverrideReason.trim().length < 3 ? <span style={styles.fieldError}>An override explanation is required.</span> : null}
                      </label>
                    ) : null}
                  </>
                ) : null}
              </div>
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
                {standardCostNoChange ? <span style={styles.fieldError}>The proposed cost matches the current product cost, so there is no change to propose.</span> : null}
              </label>
            ) : null}

            <label style={styles.field}>
              <span style={styles.label}>{provider?.effective_mode === 'openai_responses' ? 'Question or instructions' : 'Reason for this analysis'}</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} maxLength={2000} style={styles.textarea} />
              <span style={styles.help}>{provider?.effective_mode === 'openai_responses' ? 'The external AI model can use this text when writing its explanation.' : 'Built-in rules do not interpret an open-ended question. The selected analysis type controls the result; this text is saved as the reason for the request.'} {prompt.length}/2000 characters</span>
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
              {createMutation.isPending ? 'Running governed analysis…' : selectedIntentCapability?.proposal_supported ? 'Prepare proposal for Intelligence Review' : 'Run read-only analysis'}
            </button>
            {!capabilities.canGovernDecisionIntelligence ? (
              <div style={styles.notice}>Your role can view permitted history but cannot start analyses.</div>
            ) : null}
            {capabilities.canGovernDecisionIntelligence && !capabilitiesQuery.data?.can_run ? (
              <div style={styles.notice}>{capabilitiesQuery.data?.run_unavailable_reason || provider?.unavailable_reason || 'Analysis is currently unavailable.'}</div>
            ) : null}
            {selectedIntentCapability?.proposal_supported && !capabilitiesQuery.data?.can_create_execution_request_after_review ? (
              <div style={styles.notice}>You may prepare the proposal, but another authorised user must create the Execution Request after approval.</div>
            ) : null}
          </form>
        </Panel>

        <Panel
          title="Selected result"
          subtitle={selectedRun
            ? `${intentFallbacks[selectedRun.intent]?.label || formatLabel(selectedRun.intent)} · ${formatDateTime(selectedRun.created_at)}`
            : 'Run an analysis or select a historical result.'}
        >
          {selectedRunKey && selectedRunQuery.isLoading ? <div style={styles.empty}>Loading the selected result…</div> : null}
          {selectedRunKey && selectedRunQuery.isError ? (
            <div style={styles.error}>
              <div>{readableError(selectedRunQuery.error)}</div>
              <button type="button" onClick={clearRunSelection} style={styles.inlineButton}>Clear selection</button>
            </div>
          ) : null}
          {!selectedRun && !(selectedRunKey && (selectedRunQuery.isLoading || selectedRunQuery.isError)) ? <div style={styles.empty}>No permitted Copilot runs are available.</div> : null}
          {selectedRun ? (
            <div className="ai-copilot-result" style={styles.resultStack}>
              <div style={styles.badgeRow}>
                <Badge tone={selectedRun.run_status === 'completed' ? 'good' : selectedRun.run_status === 'failed' ? 'bad' : 'warn'}>{formatLabel(selectedRun.run_status)}</Badge>
                <Badge>{formatLabel(selectedRun.intent)}</Badge>
                <Badge>{resultProviderLabel(selectedRun.provider)}</Badge>
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
                            <span style={styles.help}>{formatLabel(item.kind)}{capabilities.canViewTenantDiagnostics && item.id ? ` · ${item.id}` : ''}</span>
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
                    <div><span style={styles.keyLabel}>Product</span><strong>{proposal.payload?.product_name || (capabilities.canViewTenantDiagnostics ? proposal.payload?.product_id : null) || 'Not reported'}</strong></div>
                    <div><span style={styles.keyLabel}>Current {proposalValueLabel}</span><strong>{displayUnknown(proposalCurrentValue)}</strong></div>
                    {isMinStockProposal ? <div><span style={styles.keyLabel}>System recommendation</span><strong>{displayUnknown(proposal.payload?.system_recommended_min_stock)}</strong></div> : null}
                    <div><span style={styles.keyLabel}>Final proposed {proposalValueLabel}</span><strong>{displayUnknown(proposalTargetValue)}</strong></div>
                    {isMinStockProposal ? <div><span style={styles.keyLabel}>Human override</span><strong>{proposal.payload?.user_override_applied ? 'Yes' : 'No'}</strong></div> : null}
                  </div>
                  {isMinStockProposal && proposal.payload?.override_reason ? <p style={styles.help}>Override reason: {proposal.payload.override_reason}</p> : null}
                  <p style={styles.help}>No product field has changed. A permitted reviewer must approve this proposal in Intelligence Review before a draft Execution Request can be created.</p>
                  <div style={styles.actionRow}>
                    <Link to={reviewLink} style={styles.linkButton} data-skip-global-action-feedback="true">Open in Intelligence Review</Link>
                    {selectedRun.execution_request_id ? <Link to={executionRequestLink} style={styles.secondaryLink} data-skip-global-action-feedback="true">Open linked Execution Request</Link> : null}
                  </div>
                </div>
              ) : null}

              <div style={styles.metadataGrid}>
                <div><span style={styles.keyLabel}>Created</span><strong>{formatDateTime(selectedRun.created_at)}</strong></div>
                <div><span style={styles.keyLabel}>Completed</span><strong>{formatDateTime(selectedRun.completed_at)}</strong></div>
                <div><span style={styles.keyLabel}>External data sharing</span><strong>{selectedRun.data_shared_externally ? 'Yes' : 'No'}</strong></div>
                {capabilities.canViewTenantDiagnostics ? (
                  <>
                    <div><span style={styles.keyLabel}>Run identifier</span><strong>{selectedRun.id}</strong></div>
                    <div><span style={styles.keyLabel}>Latency</span><strong>{selectedRun.latency_ms == null ? 'Not reported' : `${selectedRun.latency_ms} ms`}</strong></div>
                    <div><span style={styles.keyLabel}>Provider response reference</span><strong>{selectedRun.provider_response_id ? 'Stored as a reference' : 'None'}</strong></div>
                    <div><span style={styles.keyLabel}>External processing confirmed</span><strong>{selectedRun.external_processing_confirmed ? 'Yes' : 'No'}</strong></div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel title="Run history" subtitle={runsQuery.data && runsQuery.data.total > runRows.length ? `Showing the newest ${runRows.length} of ${runsQuery.data.total} permitted runs.` : `${runsQuery.data?.total || 0} permitted run(s). Select one to view the saved result.`}>
        {runsQuery.isError ? <div style={styles.error}>{readableError(runsQuery.error)}</div> : null}
        {runsQuery.isLoading ? <div style={styles.empty}>Loading Copilot history…</div> : null}
        <div className="ai-copilot-history-list" style={styles.historyList}>
          {runRows.map((run) => (
            <button key={run.id} type="button" onClick={() => selectRun(run.id)} className="ai-copilot-history-button" style={{ ...styles.historyButton, ...(selectedRun?.id === run.id ? styles.historyButtonSelected : {}) }}>
              <div style={styles.historyMain}>
                <strong>{intentFallbacks[run.intent]?.label || formatLabel(run.intent)}</strong>
                <span className="ai-copilot-history-prompt" style={styles.historyPrompt}>{run.user_prompt}</span>
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

      <Panel title="What the Copilot is not allowed to do" subtitle="These restrictions are enforced by the server, not by instructions given to an AI model.">
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
              <Badge tone="good">{value ? 'Protected' : 'Not allowed'}</Badge>
              <span>{safetyLabels[key] || formatLabel(key)}</span>
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
  recommendationStack: { display: 'grid', gap: 12 },
  recommendationBox: { display: 'grid', gap: 12, padding: 14, borderRadius: 12, border: '1px solid rgba(37, 99, 235, 0.28)', background: 'rgba(37, 99, 235, 0.06)' },
  calculationGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 9, padding: 10, borderRadius: 8, background: 'rgba(100, 116, 139, 0.07)' },
  detailsSummary: { cursor: 'pointer', fontWeight: 800, fontSize: 13 },
  field: { display: 'grid', gap: 7 },
  label: { fontSize: 13, fontWeight: 800 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 8, padding: '10px 11px', background: 'var(--input-background, #fff)', color: 'inherit' },
  textarea: { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 8, padding: '10px 11px', background: 'var(--input-background, #fff)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' },
  help: { fontSize: 12, color: 'var(--muted-text, #64748b)', lineHeight: 1.45 },
  fieldError: { fontSize: 12, color: '#b42318', lineHeight: 1.4 },
  primaryButton: { width: '100%', padding: '11px 14px', borderRadius: 8, cursor: 'pointer' },
  notice: { padding: 10, borderRadius: 8, background: 'rgba(245, 158, 11, 0.12)', fontSize: 13 },
  modeNotice: { padding: 12, borderRadius: 10, background: 'rgba(245, 158, 11, 0.10)', border: '1px solid rgba(245, 158, 11, 0.28)', lineHeight: 1.5 },
  externalModeNotice: { padding: 12, borderRadius: 10, background: 'rgba(37, 99, 235, 0.09)', border: '1px solid rgba(37, 99, 235, 0.24)', lineHeight: 1.5 },
  inlineButton: { marginTop: 10, padding: '7px 10px', borderRadius: 7, cursor: 'pointer' },
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
