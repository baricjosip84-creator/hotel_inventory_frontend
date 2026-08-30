import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { getRoleCapabilities } from '../lib/permissions';
import { showTenantActionError } from '../lib/actionFeedback';
import { getActiveTenantCurrency } from '../lib/tenantCurrency';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
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

type CopilotProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  min_stock?: number | string | null;
  standard_unit_cost?: number | string | null;
};

const HISTORY_PAGE_SIZE = 50;
const PRODUCT_SEARCH_LIMIT = 25;
const SHOW_TECHNICAL_HERO_META = false;
const SHOW_TECHNICAL_SAFETY_CONTRACT = false;

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
  supplier_catalog_data_available?: boolean;
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
    supplier_catalog_data_available?: boolean;
    supplier_delay_data_available?: boolean;
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

function readableError(error: unknown, ui: UiTranslator): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return ui('Unknown request failure.');
}

function formatLabel(value?: string | null): string {
  return String(value || 'Not reported').replace(/_/g, ' ');
}

type UiTranslator = (englishText: string) => string;

function formatDateTime(value: string | null | undefined, locale: AppLocale, ui: UiTranslator): string {
  if (!value) return ui('Not reported');
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : formatLocalizedDateTime(parsed, locale);
}

function formatConfidence(value: number | null | undefined, locale: AppLocale, ui: UiTranslator): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return ui('Not scored');
  return formatLocalizedNumber(value, locale, { style: 'percent', maximumFractionDigits: 0 });
}

function displayCost(value: unknown, locale: AppLocale, ui: UiTranslator): string {
  if (value === null || value === undefined || value === '') return ui('Not reported');
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return formatLocalizedCurrency(amount, getActiveTenantCurrency(), locale, { maximumFractionDigits: 4 });
}

function displayUnknown(value: unknown, ui: UiTranslator): string {
  if (value === null || value === undefined || value === '') return ui('Not reported');
  if (typeof value === 'boolean') return value ? ui('Yes') : ui('No');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const providerModeCopy: Record<string, { label: string; explanation: string }> = {
  loading: {
    label: 'Loading…',
    explanation: 'Checking how Copilot analysis is currently produced.'
  },
  load_error: {
    label: 'Status unavailable',
    explanation: 'The Copilot capability status could not be loaded.'
  },
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

function providerModeDetails(mode: string | null | undefined, ui: UiTranslator) {
  const copy = providerModeCopy[String(mode || 'unavailable')];
  return copy ? { label: ui(copy.label), explanation: ui(copy.explanation) } : {
    label: ui(formatLabel(mode)),
    explanation: ui('The server reports how this result was produced.')
  };
}

function resultProviderLabel(provider: string | null | undefined, ui: UiTranslator): string {
  if (provider === 'openai_responses') return ui('External AI explanation');
  if (provider === 'local_rules_fallback') return ui('Built-in rules fallback');
  if (provider === 'local_rules') return ui('Built-in rules');
  return ui(formatLabel(provider));
}

async function fetchCapabilities(): Promise<CopilotCapabilities> {
  return apiRequest<CopilotCapabilities>('/ai-operations-copilot/capabilities');
}

async function fetchRuns(offset: number): Promise<CopilotRunList> {
  return apiRequest<CopilotRunList>(`/ai-operations-copilot/runs?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`);
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

async function fetchProducts(search: string): Promise<CopilotProductOption[]> {
  const params = new URLSearchParams({ limit: String(PRODUCT_SEARCH_LIMIT) });
  if (search.trim()) params.set('search', search.trim());
  return apiRequest<CopilotProductOption[]>(`/ai-operations-copilot/products?${params.toString()}`);
}

function Panel(props: { title: string; subtitle?: string; children: React.ReactNode; id?: string; iconPath?: string }) {
  return (
    <section id={props.id} className="app-panel app-panel--padded ai-copilot-panel" style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={styles.panelHeading}>
          {props.iconPath ? <span style={styles.panelIcon}><TenantNavIcon path={props.iconPath} size={18} /></span> : null}
          <div>
            <h2 style={styles.panelTitle}>{props.title}</h2>
            {props.subtitle ? <p style={styles.panelSubtitle}>{props.subtitle}</p> : null}
          </div>
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
  const { locale, ui } = useAppTranslation();
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get('run_id');
  const [intent, setIntent] = useState<CopilotIntent>('operational_priority_summary');
  const [prompt, setPrompt] = useState(() => ui('Summarize the most important operational evidence I should review now.'));
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [selectedProductCache, setSelectedProductCache] = useState<CopilotProductOption | null>(null);
  const [proposedMinStock, setProposedMinStock] = useState('');
  const [minStockOverrideReason, setMinStockOverrideReason] = useState('');
  const [minStockValueTouched, setMinStockValueTouched] = useState(false);
  const [proposedStandardUnitCost, setProposedStandardUnitCost] = useState('');
  const [externalProcessingConfirmed, setExternalProcessingConfirmed] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(requestedRunId);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);


  const capabilitiesQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'capabilities'],
    queryFn: fetchCapabilities
  });

  const runsQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'runs', historyOffset],
    queryFn: () => fetchRuns(historyOffset)
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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  const productsQuery = useQuery({
    queryKey: ['ai-operations-copilot', 'products', debouncedProductSearch],
    queryFn: () => fetchProducts(debouncedProductSearch),
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

  useEffect(() => {
    setExternalProcessingConfirmed(false);
  }, [
    intent,
    prompt,
    productId,
    proposedMinStock,
    minStockOverrideReason,
    proposedStandardUnitCost,
    minimumStockRecommendation?.recommended_min_stock
  ]);

  const createMutation = useMutation({
    mutationFn: createRun,
    onSuccess: async (run) => {
      setActionMessage(run.proposal_snapshot
        ? ui('Copilot proposal created. It must be reviewed in Intelligence Review before an Execution Request draft can be created.')
        : ui('Copilot analysis completed. No operational data was changed.'));
      setSelectedRunId(run.id);
      setHistoryOffset(0);
      setSearchParams({ run_id: run.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-operations-copilot', 'runs'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-operations-copilot', 'capabilities'] }),
        queryClient.invalidateQueries({ queryKey: ['human-in-loop-ai-review'] })
      ]);
    },
    onError: (error) => {
      const message = readableError(error, ui);
      setActionMessage(message);
      showTenantActionError(message);
    },
    onSettled: () => {
      // External processing consent applies to one attempted run only.
      setExternalProcessingConfirmed(false);
    }
  });

  const runRows = runsQuery.data?.rows || [];
  const runTotal = runsQuery.data?.total || 0;
  const historyStart = runRows.length ? historyOffset + 1 : 0;
  const historyEnd = historyOffset + runRows.length;
  const hasNewerHistory = historyOffset > 0;
  const hasOlderHistory = historyEnd < runTotal;
  const selectedRun = selectedRunKey
    ? selectedRunQuery.data || null
    : runRows[0] || null;

  const provider = capabilitiesQuery.data?.provider;
  const modeDetails = capabilitiesQuery.isLoading
    ? providerModeDetails('loading', ui)
    : capabilitiesQuery.isError
      ? providerModeDetails('load_error', ui)
      : providerModeDetails(provider?.effective_mode, ui);
  const productRows = productsQuery.data || [];
  const selectedProductFromRows = productRows.find((product) => product.id === productId) || null;
  const selectedProduct = selectedProductFromRows || (selectedProductCache?.id === productId ? selectedProductCache : null);
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
    setProductSearch('');
    if (nextIntent !== 'prepare_min_stock_proposal') setProposedMinStock('');
    if (nextIntent !== 'prepare_standard_cost_proposal') setProposedStandardUnitCost('');
    if (nextIntent === 'operational_priority_summary') {
      setPrompt(ui('Summarize the most important operational evidence I should review now.'));
    } else if (nextIntent === 'product_risk_explanation') {
      setPrompt(ui('Explain the operational risk for this product using only the tenant evidence available to me.'));
    } else if (nextIntent === 'product_replenishment_plan') {
      setPrompt(ui('Explain the minimum-stock threshold and the separate reorder quantity using reliable inbound, MOQ, and package evidence. Do not create a purchase order.'));
    } else if (nextIntent === 'supplier_performance_summary') {
      setPrompt(ui('Summarize which suppliers require operational review and explain the evidence.'));
    } else if (nextIntent === 'prepare_min_stock_proposal') {
      setPrompt(ui('Calculate a transparent minimum-stock recommendation, prepare the recommended value for governed review, and explain every input. Do not change the product.'));
    } else {
      setPrompt(ui('Prepare a governed standard-cost proposal and explain the received-cost evidence. Do not change the product.'));
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
  const proposalValueLabel = isMinStockProposal ? ui('minimum stock') : isStandardCostProposal ? ui('standard unit cost') : ui('value');
  const response = selectedRun?.response_snapshot || {};
  const reviewLink = selectedRun?.source_action_id
    ? `/intelligence-review?source_action_id=${encodeURIComponent(selectedRun.source_action_id)}`
    : '/intelligence-review';
  const executionRequestLink = selectedRun?.execution_request_id
    ? `/execution-requests?request_id=${encodeURIComponent(selectedRun.execution_request_id)}`
    : '/execution-requests';

  return (
    <div className="ai-copilot-page io-operational-page io-workspace-page io-workspace-legacy-normalized" style={styles.page}>
      <OperationalWorkspaceHero
        iconPath="/ai-copilot"
        eyebrow={ui("Governed tenant intelligence")}
        title={ui("AI Copilot")}
        description={ui("Choose a defined inventory analysis or prepare a product proposal for human review. The Copilot explains information but cannot change inventory, submit approvals, or execute work.")}
        meta={SHOW_TECHNICAL_HERO_META ? (
          <>
            <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("No autonomous execution")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Human review required")}</OperationalWorkspaceMetaPill>
          </>
        ) : undefined}
        aside={<OperationalWorkspaceStatus value={modeDetails.label} label={ui("current analysis mode")} />}
      />

      {capabilitiesQuery.isError ? <div style={styles.error}>{readableError(capabilitiesQuery.error, ui)}</div> : null}
      {actionMessage ? <div style={styles.info}>{actionMessage}</div> : null}

      <OperationalWorkspaceStats ariaLabel={ui("AI Copilot overview")}>
        <OperationalWorkspaceStatCard
          label={ui("How results are produced")}
          value={modeDetails.label}
          helper={provider?.model && provider?.effective_mode === 'openai_responses' ? `${ui('Model:')} ${provider.model}` : modeDetails.explanation}
          iconPath="/ai-copilot"
          tone="blue"
        />
        <OperationalWorkspaceStatCard
          label={ui("External data sharing")}
          value={capabilitiesQuery.isLoading ? ui('Loading…') : capabilitiesQuery.isError ? ui('Status unavailable') : provider?.external_provider_ready ? ui('Configured') : ui('Not active')}
          helper={ui("Each completed run records whether tenant evidence was shared externally")}
          iconPath="/system-context"
          tone={provider?.external_provider_ready ? 'warn' : 'good'}
        />
        <OperationalWorkspaceStatCard
          label={ui("What it can change")}
          value={ui("None")}
          helper={ui("The Copilot cannot submit, approve, or execute an Execution Request")}
          iconPath="/reliability-command"
          tone="good"
        />
        <OperationalWorkspaceStatCard
          label={ui("Runs this hour")}
          value={capabilitiesQuery.data?.run_limits ? `${formatLocalizedNumber(capabilitiesQuery.data.run_limits.user_runs_used, locale)}/${formatLocalizedNumber(capabilitiesQuery.data.run_limits.user_limit, locale)}` : ui('Loading')}
          helper={`${ui('Tenant usage:')} ${capabilitiesQuery.data?.run_limits ? `${formatLocalizedNumber(capabilitiesQuery.data.run_limits.tenant_runs_used, locale)}/${formatLocalizedNumber(capabilitiesQuery.data.run_limits.tenant_limit, locale)}` : ui('Not reported')}`}
          iconPath="/automation-schedules"
          tone="neutral"
        />
      </OperationalWorkspaceStats>

      <div style={provider?.effective_mode === 'openai_responses' ? styles.externalModeNotice : styles.modeNotice}>
        <strong>{modeDetails.label}.</strong> {modeDetails.explanation}
      </div>
      {capabilitiesQuery.data?.run_unavailable_reason ? (
        <div style={styles.error}>{capabilitiesQuery.data.run_unavailable_reason}</div>
      ) : null}

      <div className="ai-copilot-main-grid" style={styles.mainGrid}>
        <Panel title={ui("Start a new analysis")} subtitle={ui("Choose the result you need. Options are limited by your current permissions.")} iconPath="/ai-copilot">
          <form onSubmit={handleSubmit} style={styles.form} data-skip-global-action-feedback="true">
            <label style={styles.field}>
              <span style={styles.label}>{ui("Analysis type")}</span>
              <select value={intent} onChange={(event) => handleIntentChange(event.target.value as CopilotIntent)} style={styles.input}>
                {(capabilitiesQuery.data?.intents || Object.entries(intentFallbacks).map(([key, item]) => ({
                  intent: key as CopilotIntent,
                  ...item,
                  available: true,
                  missing_permissions: []
                }))).map((item) => (
                  <option key={item.intent} value={item.intent} disabled={!item.available}>
                    {ui(intentFallbacks[item.intent]?.label || item.label)}{item.available ? '' : ` — ${ui('unavailable for this role')}`}
                  </option>
                ))}
              </select>
              <span style={styles.help}>{ui(intentFallbacks[intent]?.description || selectedIntentCapability?.description || '')}</span>
              {selectedIntentCapability && !selectedIntentCapability.available ? (
                <span style={styles.fieldError}>{ui("This analysis isn't available with your current access.")}</span>
              ) : null}
              {selectedIntentCapability && !selectedIntentCapability.available && capabilities.canViewTenantDiagnostics && selectedIntentCapability.missing_permissions.length ? (
                <span style={styles.help}>{ui("Diagnostic details:")} {ui("Missing permissions:")} {selectedIntentCapability.missing_permissions.join(', ')}</span>
              ) : null}
            </label>

            {needsProduct ? (
              <div style={styles.field}>
                <span style={styles.label}>{ui("Product")}</span>
                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder={ui("Search by product name, SKU, or barcode")}
                  style={styles.input}
                  aria-label={ui("Search products")}
                />
                <select value={productId} onChange={(event) => {
                  const nextProductId = event.target.value;
                  setProductId(nextProductId);
                  setSelectedProductCache(productRows.find((product) => product.id === nextProductId) || null);
                  setProposedMinStock('');
                  setMinStockOverrideReason('');
                  setMinStockValueTouched(false);
                  setProposedStandardUnitCost('');
                }} style={styles.input}>
                  <option value="">{ui("Select a product")}</option>
                  {selectedProduct && !productRows.some((product) => product.id === selectedProduct.id) ? (
                    <option value={selectedProduct.id}>
                      {selectedProduct.name} — {ui('min')} {displayUnknown(selectedProduct.min_stock, ui)} {selectedProduct.unit} · {ui('standard cost')} {displayCost(selectedProduct.standard_unit_cost, locale, ui)}
                    </option>
                  ) : null}
                  {productRows.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — {ui('min')} {displayUnknown(product.min_stock, ui)} {product.unit} · {ui('standard cost')} {displayCost(product.standard_unit_cost, locale, ui)}
                    </option>
                  ))}
                </select>
                {productsQuery.isLoading ? <span style={styles.help}>{ui("Loading products…")}</span> : null}
                {!productsQuery.isLoading && productRows.length === PRODUCT_SEARCH_LIMIT ? <span style={styles.help}>{ui("Showing up to 25 matching products. Search to narrow the list.")}</span> : null}
                {!productsQuery.isLoading && !productsQuery.isError && !productRows.length ? <span style={styles.help}>{ui("No matching products found.")}</span> : null}
                {productsQuery.isError ? <span style={styles.fieldError}>{readableError(productsQuery.error, ui)}</span> : null}
              </div>
            ) : null}

            {['prepare_min_stock_proposal', 'product_replenishment_plan'].includes(intent) ? (
              <div style={styles.recommendationStack}>
                {minimumStockRecommendationQuery.isLoading || minimumStockRecommendationQuery.isFetching ? (
                  <div style={styles.notice}>{ui("Calculating the minimum-stock threshold and replenishment plan from tenant evidence…")}</div>
                ) : minimumStockRecommendationQuery.isError ? (
                  <div style={styles.error}>{readableError(minimumStockRecommendationQuery.error, ui)}</div>
                ) : minimumStockRecommendation ? (
                  <>
                    <div style={styles.recommendationBox}>
                      <div style={styles.proposalHeader}>
                        <div>
                          <div style={styles.eyebrow}>{ui("Deterministic threshold recommendation")}</div>
                          <h3 style={styles.proposalTitle}>{ui("Recommended minimum stock:")} {formatLocalizedNumber(minimumStockRecommendation.recommended_min_stock, locale)} {minimumStockRecommendation.unit || ''}</h3>
                        </div>
                        <Badge tone={minimumStockRecommendation.recommendation_status === 'calculated' ? 'good' : 'warn'}>
                          {ui(formatLabel(minimumStockRecommendation.recommendation_status))}
                        </Badge>
                      </div>
                      <div style={styles.keyValueGrid}>
                        <div><span style={styles.keyLabel}>{ui("Current minimum")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.current_min_stock, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Recommended minimum")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.recommended_min_stock, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Raw requirement")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.raw_recommended_min_stock, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Evidence quality")}</span><strong>{formatConfidence(minimumStockRecommendation.confidence_score, locale, ui)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Direction")}</span><strong>{ui(formatLabel(minimumStockRecommendation.direction))}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Base-unit increment")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.inputs.base_unit_increment ?? 1, locale)}</strong></div>
                      </div>
                      <p style={styles.help}>{minimumStockRecommendation.formula}</p>
                      <div style={styles.calculationGrid}>
                        <div><span style={styles.keyLabel}>{ui("Demand used/day")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.inputs.selected_daily_demand, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Configured lead time")}</span><strong>{minimumStockRecommendation.inputs.lead_time_configured ? `${formatLocalizedNumber(minimumStockRecommendation.inputs.configured_lead_time_days || 0, locale)} ${ui('days')}` : ui('Not configured')}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Effective coverage")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.inputs.effective_coverage_days, locale)} {ui('days')}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Lead-time demand")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.calculation.expected_lead_time_demand, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Safety stock")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.calculation.safety_stock, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Before base rounding")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.calculation.before_base_unit_rounding ?? minimumStockRecommendation.calculation.before_package_rounding, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("After base rounding")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.calculation.after_base_unit_rounding ?? minimumStockRecommendation.calculation.after_package_rounding, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Supplier delay buffer")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.inputs.supplier_delay_buffer_days, locale)} {ui('days')}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("30d / 90d usage")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.inputs.total_outbound_30d, locale)} / {formatLocalizedNumber(minimumStockRecommendation.inputs.total_outbound_90d, locale)}</strong></div>
                        <div><span style={styles.keyLabel}>{ui("Last outbound evidence")}</span><strong>{formatDateTime(minimumStockRecommendation.inputs.last_outbound_at, locale, ui)}</strong></div>
                      </div>
                      <div style={styles.notice}>{ui("Package size and minimum-order rules are intentionally excluded from the minimum-stock threshold. They are applied only to the separate reorder quantity below.")}</div>
                      <details>
                        <summary style={styles.detailsSummary}>{ui("Show threshold assumptions and warnings")}</summary>
                        <ul style={styles.list}>
                          {minimumStockRecommendation.assumptions.map((item) => <li key={item}>{item}</li>)}
                          {minimumStockRecommendation.warnings.map((item) => <li key={item}><strong>{ui("Warning:")}</strong> {item}</li>)}
                        </ul>
                      </details>
                      <div style={styles.help}>{minimumStockRecommendation.confidence_meaning}</div>
                    </div>

                    {minimumStockRecommendation.replenishment_plan ? (
                      <div style={styles.proposalBox}>
                        <div style={styles.proposalHeader}>
                          <div>
                            <div style={styles.eyebrow}>{ui("Separate replenishment plan")}</div>
                            <h3 style={styles.proposalTitle}>{ui("Recommended order quantity:")} {formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.recommended_reorder_quantity, locale)} {minimumStockRecommendation.unit || ''}</h3>
                          </div>
                          <Badge tone={minimumStockRecommendation.replenishment_plan.recommended_reorder_quantity > 0 ? 'warn' : 'good'}>
                            {minimumStockRecommendation.replenishment_plan.recommended_reorder_quantity > 0 ? ui('Order suggested') : ui('No order suggested')}
                          </Badge>
                        </div>
                        <div style={styles.keyValueGrid}>
                          <div><span style={styles.keyLabel}>{ui("Current stock")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.current_stock, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Reliable inbound")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.reliable_open_inbound_quantity, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("At-risk inbound")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.at_risk_open_inbound_quantity, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Inbound evidence")}</span><strong>{minimumStockRecommendation.replenishment_plan.inbound_data_available === false ? ui('Unavailable for this role') : ui('Available')}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Inventory position")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.inventory_position, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Target stock")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.target_stock_quantity, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Before MOQ")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.pre_moq_reorder_quantity, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Minimum order quantity")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.min_order_quantity, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Package size")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.units_per_order_package, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Packages to order")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.recommended_order_package_count, locale)}</strong></div>
                          <div><span style={styles.keyLabel}>{ui("Final order quantity")}</span><strong>{formatLocalizedNumber(minimumStockRecommendation.replenishment_plan.recommended_reorder_quantity, locale)}</strong></div>
                        </div>
                        <p style={styles.help}>{minimumStockRecommendation.replenishment_plan.formula}</p>
                        <details>
                          <summary style={styles.detailsSummary}>{ui("Show replenishment assumptions and warnings")}</summary>
                          <ul style={styles.list}>
                            {minimumStockRecommendation.replenishment_plan.assumptions.map((item) => <li key={item}>{item}</li>)}
                            {minimumStockRecommendation.replenishment_plan.warnings.map((item) => <li key={item}><strong>{ui("Warning:")}</strong> {item}</li>)}
                          </ul>
                        </details>
                        <div style={styles.actionRow}>
                          <Link to="/procurement-recommendations" style={styles.linkButton} data-skip-global-action-feedback="true">
                            {ui("Open all-products replenishment workbench")}
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : productId ? null : (
                  <div style={styles.notice}>{ui("Select a product to calculate its threshold and replenishment plan.")}</div>
                )}

                {intent === 'prepare_min_stock_proposal' ? (
                  <>
                    <label style={styles.field}>
                      <span style={styles.label}>{ui("Final proposed minimum stock")}</span>
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
                      <span style={styles.help}>{ui("The threshold recommendation is filled automatically. You may change it, but an explanation is required. The separate reorder quantity is advisory and does not change the product or create a purchase order.")}</span>
                      {minStockNoChange ? <span style={styles.fieldError}>{ui("The final value matches the current product minimum, so there is no change to propose.")}</span> : null}
                    </label>

                    {minStockOverrideApplied ? (
                      <label style={styles.field}>
                        <span style={styles.label}>{ui("Why are you overriding the threshold recommendation?")}</span>
                        <textarea
                          value={minStockOverrideReason}
                          onChange={(event) => setMinStockOverrideReason(event.target.value)}
                          rows={3}
                          maxLength={1000}
                          style={styles.textarea}
                          placeholder={ui("Explain the business evidence or policy reason for using a different threshold.")}
                        />
                        <span style={styles.help}>{formatLocalizedNumber(minStockOverrideReason.length, locale)}/1,000 {ui("characters")}</span>
                        {minStockOverrideReason.trim().length < 3 ? <span style={styles.fieldError}>{ui("An override explanation is required.")}</span> : null}
                      </label>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {intent === 'prepare_standard_cost_proposal' ? (
              <label style={styles.field}>
                <span style={styles.label}>{ui("Proposed standard unit cost")}</span>
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.0001"
                  value={proposedStandardUnitCost}
                  onChange={(event) => setProposedStandardUnitCost(event.target.value)}
                  style={styles.input}
                />
                <span style={styles.help}>{ui("The server records the current standard cost and recent cost-bearing movement evidence. This does not update the product.")}</span>
                {standardCostNoChange ? <span style={styles.fieldError}>{ui("The proposed cost matches the current product cost, so there is no change to propose.")}</span> : null}
              </label>
            ) : null}

            <label style={styles.field}>
              <span style={styles.label}>{provider?.effective_mode === 'openai_responses' ? ui('Question or instructions') : ui('Reason for this analysis')}</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} maxLength={2000} style={styles.textarea} />
              <span style={styles.help}>{provider?.effective_mode === 'openai_responses' ? ui('The external AI model can use this text when writing its explanation.') : ui('Built-in rules do not interpret an open-ended question. The selected analysis type controls the result; this text is saved as the reason for the request.')} {formatLocalizedNumber(prompt.length, locale)}/2,000 {ui("characters")}</span>
            </label>

            {provider?.external_processing_confirmation_required ? (
              <label style={styles.confirmation}>
                <input
                  type="checkbox"
                  checked={externalProcessingConfirmed}
                  onChange={(event) => setExternalProcessingConfirmed(event.target.checked)}
                />
                <span>
                  {ui("I confirm that the tenant evidence assembled for this run may be sent to the configured external AI provider. The run will record whether external sharing occurred.")}
                </span>
              </label>
            ) : null}

            <button type="submit" className="primary-button" style={styles.primaryButton} disabled={!canSubmit}>
              {createMutation.isPending ? ui('Running governed analysis…') : selectedIntentCapability?.proposal_supported ? ui('Prepare proposal for Intelligence Review') : ui('Run read-only analysis')}
            </button>
            {!capabilities.canGovernDecisionIntelligence ? (
              <div style={styles.notice}>{ui("Your role can view permitted history but cannot start analyses.")}</div>
            ) : null}
            {capabilities.canGovernDecisionIntelligence && !capabilitiesQuery.data?.can_run ? (
              <div style={styles.notice}>{capabilitiesQuery.data?.run_unavailable_reason || provider?.unavailable_reason || ui('Analysis is currently unavailable.')}</div>
            ) : null}
            {selectedIntentCapability?.proposal_supported && !capabilitiesQuery.data?.can_create_execution_request_after_review ? (
              <div style={styles.notice}>{ui("You may prepare the proposal, but another authorised user must create the Execution Request after approval.")}</div>
            ) : null}
          </form>
        </Panel>

        <Panel
          iconPath="/intelligence-review"
          title={ui("Selected result")}
          subtitle={selectedRun
            ? `${ui(intentFallbacks[selectedRun.intent]?.label || formatLabel(selectedRun.intent))} · ${formatDateTime(selectedRun.created_at, locale, ui)}`
            : ui('Run an analysis or select a historical result.')}
        >
          {selectedRunKey && selectedRunQuery.isLoading ? <div style={styles.empty}>{ui("Loading the selected result…")}</div> : null}
          {selectedRunKey && selectedRunQuery.isError ? (
            <div style={styles.error}>
              <div>{readableError(selectedRunQuery.error, ui)}</div>
              <button type="button" onClick={clearRunSelection} style={styles.inlineButton}>{ui("Clear selection")}</button>
            </div>
          ) : null}
          {!selectedRun && !(selectedRunKey && (selectedRunQuery.isLoading || selectedRunQuery.isError)) ? <div style={styles.empty}>{ui("No permitted Copilot runs are available.")}</div> : null}
          {selectedRun ? (
            <div className="ai-copilot-result" style={styles.resultStack}>
              <div style={styles.badgeRow}>
                <Badge tone={selectedRun.run_status === 'completed' ? 'good' : selectedRun.run_status === 'failed' ? 'bad' : 'warn'}>{ui(formatLabel(selectedRun.run_status))}</Badge>
                <Badge>{ui(formatLabel(selectedRun.intent))}</Badge>
                <Badge>{resultProviderLabel(selectedRun.provider, ui)}</Badge>
                <Badge tone={selectedRun.data_shared_externally ? 'warn' : 'good'}>
                  {selectedRun.data_shared_externally ? ui('Evidence shared externally') : ui('No external data sharing')}
                </Badge>
                <Badge>{ui('Confidence')} {formatConfidence(selectedRun.confidence_score, locale, ui)}</Badge>
              </div>

              {selectedRun.run_status === 'failed' ? (
                <div style={styles.error}>{selectedRun.error_message || selectedRun.error_code || ui('Copilot run failed.')}</div>
              ) : (
                <>
                  <div style={styles.answer}>{response.answer || ui('No answer was recorded.')}</div>
                  {(response.highlights || []).length ? (
                    <div>
                      <h3 style={styles.sectionTitle}>{ui("Highlights")}</h3>
                      <ul style={styles.list}>{(response.highlights || []).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
                    </div>
                  ) : null}
                  {(response.evidence || []).length ? (
                    <div>
                      <h3 style={styles.sectionTitle}>{ui("Evidence references")}</h3>
                      <div style={styles.evidenceGrid}>
                        {(response.evidence || []).map((item, index) => (
                          <div key={`${item.kind}-${item.id || index}`} style={styles.evidenceCard}>
                            <strong>{item.label}</strong>
                            <span style={styles.help}>{ui(formatLabel(item.kind))}{capabilities.canViewTenantDiagnostics && item.id ? ` · ${item.id}` : ''}</span>
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
                      <div style={styles.eyebrow}>{ui("Structured proposal")}</div>
                      <h3 style={styles.proposalTitle}>{proposal.title || ui('Governed proposal')}</h3>
                    </div>
                    <Badge tone="warn">{ui("Human review required")}</Badge>
                  </div>
                  <div style={styles.keyValueGrid}>
                    <div><span style={styles.keyLabel}>{ui("Request type")}</span><strong>{ui(formatLabel(proposal.request_type))}</strong></div>
                    <div><span style={styles.keyLabel}>{ui("Product")}</span><strong>{proposal.payload?.product_name || (capabilities.canViewTenantDiagnostics ? proposal.payload?.product_id : null) || ui('Not reported')}</strong></div>
                    <div><span style={styles.keyLabel}>{ui("Current")} {proposalValueLabel}</span><strong>{isStandardCostProposal ? displayCost(proposalCurrentValue, locale, ui) : displayUnknown(proposalCurrentValue, ui)}</strong></div>
                    {isMinStockProposal ? <div><span style={styles.keyLabel}>{ui("System recommendation")}</span><strong>{displayUnknown(proposal.payload?.system_recommended_min_stock, ui)}</strong></div> : null}
                    <div><span style={styles.keyLabel}>{ui("Final proposed")} {proposalValueLabel}</span><strong>{isStandardCostProposal ? displayCost(proposalTargetValue, locale, ui) : displayUnknown(proposalTargetValue, ui)}</strong></div>
                    {isMinStockProposal ? <div><span style={styles.keyLabel}>{ui("Human override")}</span><strong>{proposal.payload?.user_override_applied ? ui('Yes') : ui('No')}</strong></div> : null}
                  </div>
                  {isMinStockProposal && proposal.payload?.override_reason ? <p style={styles.help}>{ui("Override reason:")} {proposal.payload.override_reason}</p> : null}
                  <p style={styles.help}>{ui("No product field has changed. A permitted reviewer must approve this proposal in Intelligence Review before a draft Execution Request can be created.")}</p>
                  <div style={styles.actionRow}>
                    <Link to={reviewLink} style={styles.linkButton} data-skip-global-action-feedback="true"><TenantNavIcon path="/intelligence-review" size={16} />{ui("Open in Intelligence Review")}</Link>
                    {selectedRun.execution_request_id ? <Link to={executionRequestLink} style={styles.secondaryLink} data-skip-global-action-feedback="true"><TenantNavIcon path="/execution-requests" size={16} />{ui("Open linked Execution Request")}</Link> : null}
                  </div>
                </div>
              ) : null}

              <div style={styles.metadataGrid}>
                <div><span style={styles.keyLabel}>{ui("Created")}</span><strong>{formatDateTime(selectedRun.created_at, locale, ui)}</strong></div>
                <div><span style={styles.keyLabel}>{ui("Completed")}</span><strong>{formatDateTime(selectedRun.completed_at, locale, ui)}</strong></div>
                <div><span style={styles.keyLabel}>{ui("External data sharing")}</span><strong>{selectedRun.data_shared_externally ? ui('Yes') : ui('No')}</strong></div>
                {capabilities.canViewTenantDiagnostics ? (
                  <>
                    <div><span style={styles.keyLabel}>{ui("Run identifier")}</span><strong>{selectedRun.id}</strong></div>
                    <div><span style={styles.keyLabel}>{ui("Latency")}</span><strong>{selectedRun.latency_ms == null ? ui('Not reported') : `${formatLocalizedNumber(selectedRun.latency_ms, locale)} ms`}</strong></div>
                    <div><span style={styles.keyLabel}>{ui("Provider response reference")}</span><strong>{selectedRun.provider_response_id ? ui('Stored as a reference') : ui('None')}</strong></div>
                    <div><span style={styles.keyLabel}>{ui("External processing confirmed")}</span><strong>{selectedRun.external_processing_confirmed ? ui('Yes') : ui('No')}</strong></div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel title={ui("Run history")} iconPath="/audit" subtitle={runTotal ? `${ui('Showing')} ${formatLocalizedNumber(historyStart, locale)}–${formatLocalizedNumber(historyEnd, locale)} ${ui('of')} ${formatLocalizedNumber(runTotal, locale)} ${ui('permitted runs.')}` : `${formatLocalizedNumber(0, locale)} ${ui('permitted run(s). Select one to view the saved result above.')}`}>
        {runsQuery.isError ? <div style={styles.error}>{readableError(runsQuery.error, ui)}</div> : null}
        {runsQuery.isLoading ? <div style={styles.empty}>{ui("Loading Copilot history…")}</div> : null}
        <div className="ai-copilot-history-list" style={styles.historyList}>
          {runRows.map((run) => (
            <button key={run.id} type="button" onClick={() => selectRun(run.id)} className="ai-copilot-history-button" style={{ ...styles.historyButton, ...(selectedRun?.id === run.id ? styles.historyButtonSelected : {}) }}>
              <div style={styles.historyMain}>
                <strong>{ui(intentFallbacks[run.intent]?.label || formatLabel(run.intent))}</strong>
                <span className="ai-copilot-history-prompt" style={styles.historyPrompt}>{run.user_prompt}</span>
              </div>
              <div style={styles.historyMeta}>
                <Badge tone={run.run_status === 'completed' ? 'good' : run.run_status === 'failed' ? 'bad' : 'warn'}>{ui(formatLabel(run.run_status))}</Badge>
                {run.proposal_snapshot ? <Badge tone="warn">{ui("Proposal")}</Badge> : <Badge>{ui("Read only")}</Badge>}
                <span>{formatDateTime(run.created_at, locale, ui)}</span>
                <span style={styles.historyView}><TenantNavIcon path="/intelligence-review" size={14} />{ui("View saved result")}</span>
              </div>
            </button>
          ))}
          {!runRows.length && !runsQuery.isLoading ? <div style={styles.empty}>{ui("No runs have been created.")}</div> : null}
        </div>
        {runTotal > HISTORY_PAGE_SIZE ? (
          <div style={styles.historyPagination} aria-label={ui("Run history pagination")}>
            <button
              type="button"
              style={styles.paginationButton}
              disabled={!hasNewerHistory || runsQuery.isFetching}
              onClick={() => setHistoryOffset((current) => Math.max(current - HISTORY_PAGE_SIZE, 0))}
            >
              {ui("Newer")}
            </button>
            <span style={styles.help}>{formatLocalizedNumber(historyStart, locale)}–{formatLocalizedNumber(historyEnd, locale)} / {formatLocalizedNumber(runTotal, locale)}</span>
            <button
              type="button"
              style={styles.paginationButton}
              disabled={!hasOlderHistory || runsQuery.isFetching}
              onClick={() => setHistoryOffset((current) => current + HISTORY_PAGE_SIZE)}
            >
              {ui("Older")}
            </button>
          </div>
        ) : null}
      </Panel>

      {SHOW_TECHNICAL_SAFETY_CONTRACT ? (
        <Panel title={ui("What the Copilot is not allowed to do")} iconPath="/reliability-command" subtitle={ui("These restrictions are enforced by the server, not by instructions given to an AI model.")}>
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
                <Badge tone="good">{value ? ui('Protected') : ui('Not allowed')}</Badge>
                <span>{ui(safetyLabels[key] || formatLabel(key))}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 20 },
  hero: { display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', padding: 22, border: '1px solid #dbe5f1', borderRadius: 18, background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 12px 30px rgba(15, 23, 42, 0.05)' },
  heroTitleRow: { display: 'flex', gap: 14, alignItems: 'flex-start', minWidth: 0, flex: '1 1 620px' },
  heroIcon: { width: 46, height: 46, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', color: '#2563eb', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9)' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12, fontWeight: 800, color: '#2563eb' },
  title: { margin: '4px 0 8px', fontSize: 32, lineHeight: 1.15 },
  subtitle: { margin: 0, maxWidth: 850, color: 'var(--muted-text, #64748b)', lineHeight: 1.55 },
  heroBadges: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  summaryCard: { border: '1px solid #dbe5f1', borderRadius: 16, padding: 16, background: '#ffffff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px rgba(15, 23, 42, 0.04)', display: 'flex', gap: 12, alignItems: 'flex-start' },
  summaryContent: { minWidth: 0, flex: 1 },
  summaryIcon: { width: 40, height: 40, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', border: '1px solid transparent' },
  summaryIconBlue: { color: '#2563eb', background: '#eff6ff', borderColor: '#dbeafe' },
  summaryIconPurple: { color: '#7c3aed', background: '#f5f3ff', borderColor: '#ede9fe' },
  summaryIconGreen: { color: '#059669', background: '#ecfdf5', borderColor: '#d1fae5' },
  summaryIconAmber: { color: '#d97706', background: '#fff7ed', borderColor: '#ffedd5' },
  summaryLabel: { fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted-text, #64748b)' },
  summaryValue: { fontSize: 20, fontWeight: 800, marginTop: 5, textTransform: 'capitalize' },
  summaryHelp: { marginTop: 6, fontSize: 13, color: 'var(--muted-text, #64748b)', lineHeight: 1.4 },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(300px, 0.8fr) minmax(360px, 1.2fr)', gap: 16, alignItems: 'start' },
  panel: { border: '1px solid #e2e8f0', borderRadius: 16, background: '#ffffff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px rgba(15, 23, 42, 0.04)' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 },
  panelHeading: { display: 'flex', gap: 11, alignItems: 'flex-start', minWidth: 0 },
  panelIcon: { width: 36, height: 36, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', flex: '0 0 auto' },
  panelTitle: { margin: 0, fontSize: 19 },
  panelSubtitle: { margin: '5px 0 0', color: 'var(--muted-text, #64748b)', lineHeight: 1.45 },
  form: { display: 'grid', gap: 15 },
  recommendationStack: { display: 'grid', gap: 12 },
  recommendationBox: { display: 'grid', gap: 12, padding: 14, borderRadius: 12, border: '1px solid rgba(37, 99, 235, 0.28)', background: 'rgba(37, 99, 235, 0.06)' },
  calculationGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 9, padding: 10, borderRadius: 8, background: 'rgba(100, 116, 139, 0.07)' },
  detailsSummary: { cursor: 'pointer', fontWeight: 800, fontSize: 13 },
  field: { display: 'grid', gap: 7 },
  label: { fontSize: 13, fontWeight: 800 },
  input: { width: '100%', minHeight: 44, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', background: '#ffffff', color: '#0f172a' },
  textarea: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', background: '#ffffff', color: '#0f172a', resize: 'vertical', fontFamily: 'inherit' },
  help: { fontSize: 12, color: 'var(--muted-text, #64748b)', lineHeight: 1.45 },
  fieldError: { fontSize: 12, color: '#b42318', lineHeight: 1.4 },
  primaryButton: { width: '100%', padding: '11px 14px', borderRadius: 10, cursor: 'pointer' },
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
  linkButton: { display: 'inline-flex', gap: 7, alignItems: 'center', padding: '9px 12px', borderRadius: 9, background: 'var(--primary-color, #2563eb)', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 13 },
  secondaryLink: { display: 'inline-flex', gap: 7, alignItems: 'center', padding: '9px 12px', borderRadius: 9, border: '1px solid #cbd5e1', background: '#ffffff', color: '#1d4ed8', textDecoration: 'none', fontWeight: 800, fontSize: 13 },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border-color, #dbe3ee)' },
  historyList: { display: 'grid', gap: 8 },
  historyButton: { width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#ffffff', color: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  historyButtonSelected: { borderColor: 'var(--primary-color, #2563eb)', boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.10)' },
  historyMain: { display: 'grid', gap: 4, minWidth: 0 },
  historyPrompt: { color: 'var(--muted-text, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 700 },
  historyMeta: { display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', justifyContent: 'flex-end', fontSize: 12, color: 'var(--muted-text, #64748b)' },
  historyView: { display: 'inline-flex', alignItems: 'center', gap: 5, color: '#2563eb', fontWeight: 800 },
  historyPagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color, #dbe3ee)' },
  paginationButton: { minWidth: 90, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#1d4ed8', fontWeight: 800, cursor: 'pointer' },
  safetyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 9 },
  safetyItem: { display: 'flex', gap: 9, alignItems: 'center', padding: 9, borderRadius: 8, background: 'rgba(100, 116, 139, 0.07)', fontSize: 13 }
};
