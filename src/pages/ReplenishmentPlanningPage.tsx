import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { formatCurrencyAmount, getActiveTenantCurrency, normalizeCurrencyCode } from '../lib/tenantCurrency';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './ReplenishmentPlanningPage.css';

const DECISIONS = ['pending', 'accepted', 'overridden', 'rejected', 'deferred', 'already_handled'] as const;
type Decision = (typeof DECISIONS)[number];

type PlanningRunListItem = {
  id: string;
  status: string;
  formula_version: string;
  lookback_days: number | string;
  target_coverage_days: number | string;
  summary?: Record<string, number | string | null>;
  generated_by_user_name?: string | null;
  materialized_by_user_name?: string | null;
  created_at: string;
  updated_at?: string | null;
  materialized_at?: string | null;
  version?: number | string;
  materialization_guard?: {
    pending_decision_count: number;
    all_lines_reviewed: boolean;
    max_age_hours: number;
    run_age_hours: number | string;
    age_expired: boolean;
    can_materialize: boolean;
  };
  item_count?: number | string;
  transfer_count?: number | string;
};

type SupplierEvidence = {
  supplier_id?: string | null;
  supplier_name?: string | null;
  lead_time_days?: number | string | null;
  min_order_quantity?: number | string | null;
  package_name?: string | null;
  units_per_package?: number | string | null;
  estimated_unit_cost?: number | string | null;
  currency?: string | null;
};

type PlanItem = {
  id: string;
  version: number | string;
  product_id: string;
  product_name: string;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  decision_status: Decision;
  decision_reason?: string | null;
  override_purchase_quantity?: number | string | null;
  final_purchase_quantity: number | string;
  current_stock: number | string;
  reserved_quantity: number | string;
  pending_transfer_in_quantity: number | string;
  pending_transfer_out_quantity: number | string;
  reliable_inbound_quantity: number | string;
  at_risk_inbound_quantity: number | string;
  usable_inventory_position: number | string;
  configured_min_quantity: number | string;
  configured_target_quantity: number | string;
  calculated_min_quantity: number | string;
  governed_min_quantity: number | string;
  selected_daily_demand: number | string;
  shortage_before_transfer: number | string;
  transfer_covered_quantity: number | string;
  remaining_purchase_requirement: number | string;
  recommended_purchase_quantity: number | string;
  estimated_purchase_cost?: number | string | null;
  estimated_cost_currency?: string | null;
  linked_purchase_order_id?: string | null;
  linked_purchase_order_number?: string | null;
  linked_purchase_order_status?: string | null;
  evidence?: { supplier?: SupplierEvidence; [key: string]: unknown };
};

type PlanTransfer = {
  id: string;
  version: number | string;
  product_name: string;
  product_unit?: string | null;
  source_storage_location_name: string;
  destination_storage_location_name: string;
  decision_status: Decision;
  decision_reason?: string | null;
  recommended_quantity: number | string;
  override_quantity?: number | string | null;
  final_quantity: number | string;
  source_surplus_before: number | string;
  source_quantity_after: number | string;
  destination_shortage_before: number | string;
  destination_shortage_after: number | string;
  linked_stock_transfer_id?: string | null;
  linked_stock_transfer_status?: string | null;
  evidence?: {
    source_policy_configured?: boolean;
    source_review_required?: boolean;
    [key: string]: unknown;
  };
};

type PlanningRunDetail = {
  run: PlanningRunListItem;
  items: PlanItem[];
  transfers: PlanTransfer[];
};

type OutcomeResponse = {
  generated_at?: string;
  summary: {
    purchase_orders_created: number;
    stock_transfers_created: number;
    threshold_restored_count: number;
    received_quantity: number | string;
    average_fulfilment_ratio: number | string;
    post_run_unresolved_alert_count: number | string;
    transfer_executed_count: number;
  };
  items: Array<{
    id: string;
    product_name: string;
    storage_location_name: string;
    purchase_order_status?: string | null;
    linked_purchase_order_id?: string | null;
    shortage_before_transfer?: number | string;
    ordered_quantity: number | string;
    received_quantity: number | string;
    current_stock: number | string;
    governed_min_quantity: number | string;
    threshold_restored: boolean;
    fulfilment_ratio: number | string;
    post_run_unresolved_alert_count: number | string;
    latest_post_run_alert_at?: string | null;
  }>;
  transfers: Array<{
    id: string;
    product_name: string;
    source_storage_location_name: string;
    destination_storage_location_name: string;
    final_quantity: number | string;
    stock_transfer_status?: string | null;
  }>;
};

type DraftDecision = { decision: Decision; quantity: string; reason: string };
type ConfirmationState = { kind: 'materialize'; title: string; message: string } | null;
type ReplenishmentWorkspaceSection = 'overview' | 'runs' | 'review' | 'drafts' | 'outcomes';

type DecisionMutationInput = {
  runId: string;
  expectedRunVersion: number;
  decisions: Array<{
    kind: 'purchase' | 'transfer';
    id: string;
    expected_version: number;
    decision: Exclude<Decision, 'pending'>;
    quantity?: number;
    reason?: string | null;
  }>;
};

type MaterializationResponse = {
  run: PlanningRunDetail;
  created_stock_transfers: unknown[];
  created_purchase_orders: unknown[];
  idempotent_replay?: boolean;
};

const numberValue = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const quantityValue = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const reasonRequired = (decision: Decision): boolean => ['overridden', 'rejected', 'already_handled'].includes(decision);
const isActionablePurchase = (row: PlanItem): boolean => numberValue(row.shortage_before_transfer) > 0 || numberValue(row.recommended_purchase_quantity) > 0;

async function listRuns(): Promise<PlanningRunListItem[]> {
  return apiRequest<PlanningRunListItem[]>('/replenishment-planning?limit=100');
}
async function getRun(id: string): Promise<PlanningRunDetail> {
  return apiRequest<PlanningRunDetail>(`/replenishment-planning/${id}`);
}
async function createRun(input: { target_coverage_days: number }): Promise<PlanningRunDetail> {
  return apiRequest<PlanningRunDetail>('/replenishment-planning', { method: 'POST', body: JSON.stringify(input) });
}
async function saveDecisions(input: DecisionMutationInput): Promise<PlanningRunDetail> {
  return apiRequest<PlanningRunDetail>(`/replenishment-planning/${input.runId}/decisions`, {
    method: 'POST',
    body: JSON.stringify({ expected_run_version: input.expectedRunVersion, decisions: input.decisions }),
    skipMutationFeedback: true
  });
}
async function materializeRun(input: { runId: string; expectedRunVersion: number }): Promise<MaterializationResponse> {
  return apiRequest<MaterializationResponse>(`/replenishment-planning/${input.runId}/materialize`, {
    method: 'POST',
    body: JSON.stringify({ expected_run_version: input.expectedRunVersion }),
    skipMutationFeedback: true
  });
}
async function getOutcomes(runId: string): Promise<OutcomeResponse> {
  return apiRequest<OutcomeResponse>(`/replenishment-planning/${runId}/outcomes`);
}

function StatusBadge({ value, label }: { value?: string | null; label: string }) {
  const normalized = String(value || '').toLowerCase();
  const tone = ['materialized', 'executed', 'completed', 'fulfilled'].includes(normalized)
    ? styles.badgeSuccess
    : ['cancelled', 'rejected', 'failed'].includes(normalized)
      ? styles.badgeDanger
      : ['reviewed', 'accepted', 'approved'].includes(normalized)
        ? styles.badgeInfo
        : styles.badgeNeutral;
  return <span style={{ ...styles.badge, ...tone }}>{label}</span>;
}

export default function ReplenishmentPlanningPage() {
  const queryClient = useQueryClient();
  const { locale, ui } = useAppTranslation();
  const capabilities = getRoleCapabilities();
  const formatUiNumber = (value: unknown, maximumFractionDigits = 4): string => formatLocalizedNumber(numberValue(value), locale, { maximumFractionDigits });
  const formatUiDateTime = (value?: string | null): string => value ? formatLocalizedDateTime(value, locale) : ui('Not recorded');
  const formatUiCurrency = (value: unknown, currency?: string | null): string => {
    try {
      return formatLocalizedCurrency(numberValue(value), normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 4 });
    } catch {
      const fallbackValue = typeof value === 'number' || typeof value === 'string' || value == null
        ? value
        : String(value);
      return formatCurrencyAmount(fallbackValue, currency, 4);
    }
  };
  const formatUiPercent = (ratio: unknown): string => ui('{percent}%').replace('{percent}', formatLocalizedNumber(numberValue(ratio) * 100, locale, { maximumFractionDigits: 0 }));
  const errorMessage = (requestError: unknown): string => requestError instanceof ApiError || requestError instanceof Error ? requestError.message : ui('Request failed');
  const canonicalDisplayLabel = (value?: string | null): string => {
    const normalized = String(value || '').toLowerCase();
    const labels: Record<string, string> = {
      materialized: 'Drafts created',
      reviewed: 'Review complete',
      partially_reviewed: 'Partially reviewed',
      draft: 'In review',
      cancelled: 'Cancelled',
      executed: 'Executed',
      completed: 'Completed',
      fulfilled: 'Fulfilled',
      rejected: 'Rejected',
      failed: 'Failed',
      accepted: 'Accepted',
      approved: 'Approved',
      submitted: 'Submitted',
      pending: 'Pending'
    };
    return labels[normalized] ? ui(labels[normalized]) : (value || ui('Not recorded'));
  };
  const decisionDisplayLabel = (value: Decision): string => ui({
    pending: 'Needs decision',
    accepted: 'Accept recommendation',
    overridden: 'Use a different quantity',
    rejected: 'Reject recommendation',
    deferred: 'Defer decision',
    already_handled: 'Already handled outside this plan'
  }[value]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [coverageDays, setCoverageDays] = useState(14);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, DraftDecision>>({});
  const [lineSearch, setLineSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'all' | Decision>('all');
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<ReplenishmentWorkspaceSection>('overview');

  const runsQuery = useQuery({ queryKey: ['location-replenishment-runs'], queryFn: listRuns });
  const effectiveRunId = selectedRunId || runsQuery.data?.[0]?.id || '';
  const detailQuery = useQuery({
    queryKey: ['location-replenishment-run', effectiveRunId],
    queryFn: () => getRun(effectiveRunId),
    enabled: Boolean(effectiveRunId)
  });
  const outcomesQuery = useQuery({
    queryKey: ['location-replenishment-outcomes', effectiveRunId],
    queryFn: () => getOutcomes(effectiveRunId),
    enabled: Boolean(effectiveRunId && detailQuery.data?.run.status === 'materialized')
  });

  const createMutation = useMutation({
    mutationFn: createRun,
    onSuccess: async (data) => {
      setMessage(ui('Planning run created. No stock moved and no supplier order was placed.'));
      setError('');
      setDrafts({});
      setSelectedRunId(data.run.id);
      await queryClient.invalidateQueries({ queryKey: ['location-replenishment-runs'] });
      queryClient.setQueryData(['location-replenishment-run', data.run.id], data);
    },
    onError: (mutationError) => {
      setMessage('');
      setError(errorMessage(mutationError));
    }
  });

  const decisionMutation = useMutation({
    mutationFn: saveDecisions,
    onSuccess: async (data) => {
      setMessage(ui('Planning decisions saved. No draft transfer or Purchase Order was created.'));
      setError('');
      setDrafts({});
      queryClient.setQueryData(['location-replenishment-run', data.run.id], data);
      await queryClient.invalidateQueries({ queryKey: ['location-replenishment-runs'] });
    },
    onError: async (mutationError) => {
      setMessage('');
      setError(errorMessage(mutationError));
      setDrafts({});
      if (effectiveRunId) await queryClient.invalidateQueries({ queryKey: ['location-replenishment-run', effectiveRunId] });
    }
  });

  const materializeMutation = useMutation({
    mutationFn: materializeRun,
    onSuccess: async (data) => {
      const transferCount = data.created_stock_transfers.length;
      const purchaseOrderCount = data.created_purchase_orders.length;
      setMessage(data.idempotent_replay
        ? ui('This run was already converted. Found {transfers} linked draft Stock Transfer(s) and {purchaseOrders} linked draft Purchase Order(s).').replace('{transfers}', formatUiNumber(transferCount, 0)).replace('{purchaseOrders}', formatUiNumber(purchaseOrderCount, 0))
        : ui('Live evidence was checked again. Created {transfers} draft Stock Transfer(s) and {purchaseOrders} draft Purchase Order(s). Nothing was approved or executed.').replace('{transfers}', formatUiNumber(transferCount, 0)).replace('{purchaseOrders}', formatUiNumber(purchaseOrderCount, 0)));
      setError('');
      setDrafts({});
      setConfirmation(null);
      queryClient.setQueryData(['location-replenishment-run', data.run.run.id], data.run);
      await queryClient.invalidateQueries({ queryKey: ['location-replenishment-runs'] });
      await queryClient.invalidateQueries({ queryKey: ['location-replenishment-outcomes', data.run.run.id] });
    },
    onError: async (mutationError) => {
      setMessage('');
      setError(errorMessage(mutationError));
      setConfirmation(null);
      if (effectiveRunId) await queryClient.invalidateQueries({ queryKey: ['location-replenishment-run', effectiveRunId] });
    }
  });

  const detail = detailQuery.data;
  const summary = detail?.run.summary ?? {};
  const canGenerate = Boolean(capabilities.canCreateInventoryOptimization);
  const canGovern = Boolean(capabilities.canGovernInventoryOptimization);
  const canCreateTransfers = Boolean(capabilities.canCreateStockTransfers);
  const canCreatePurchaseOrders = Boolean(capabilities.canCreatePurchaseOrders);
  const runLocked = detail?.run.status === 'materialized' || detail?.run.status === 'cancelled';
  const pendingDecisionCount = detail?.run.materialization_guard?.pending_decision_count
    ?? ((detail?.items.filter((row) => row.decision_status === 'pending').length ?? 0)
      + (detail?.transfers.filter((row) => row.decision_status === 'pending').length ?? 0));
  const runAgeExpired = Boolean(detail?.run.materialization_guard?.age_expired);
  const allLinesReviewed = pendingDecisionCount === 0;
  const actionablePurchaseRows = useMemo(() => detail?.items.filter(isActionablePurchase) ?? [], [detail]);

  const changedDecisions = useMemo(() => {
    if (!detail) return [];
    const result: DecisionMutationInput['decisions'] = [];
    for (const item of actionablePurchaseRows) {
      const draft = drafts[`purchase:${item.id}`];
      if (!draft || draft.decision === 'pending') continue;
      const baseQuantity = numberValue(item.override_purchase_quantity ?? item.final_purchase_quantity ?? item.recommended_purchase_quantity);
      const draftQuantity = quantityValue(draft.quantity);
      const unchanged = draft.decision === item.decision_status
        && draft.reason.trim() === (item.decision_reason ?? '').trim()
        && (draft.decision !== 'overridden' || draftQuantity === baseQuantity);
      if (unchanged) continue;
      result.push({
        kind: 'purchase',
        id: item.id,
        expected_version: numberValue(item.version),
        decision: draft.decision,
        quantity: draft.decision === 'overridden' && draftQuantity !== null ? draftQuantity : undefined,
        reason: draft.reason.trim() || null
      });
    }
    for (const transfer of detail.transfers) {
      const draft = drafts[`transfer:${transfer.id}`];
      if (!draft || draft.decision === 'pending') continue;
      const baseQuantity = numberValue(transfer.override_quantity ?? transfer.final_quantity ?? transfer.recommended_quantity);
      const draftQuantity = quantityValue(draft.quantity);
      const unchanged = draft.decision === transfer.decision_status
        && draft.reason.trim() === (transfer.decision_reason ?? '').trim()
        && (draft.decision !== 'overridden' || draftQuantity === baseQuantity);
      if (unchanged) continue;
      result.push({
        kind: 'transfer',
        id: transfer.id,
        expected_version: numberValue(transfer.version),
        decision: draft.decision,
        quantity: draft.decision === 'overridden' && draftQuantity !== null ? draftQuantity : undefined,
        reason: draft.reason.trim() || null
      });
    }
    return result;
  }, [actionablePurchaseRows, detail, drafts]);

  const decisionIssues = useMemo(() => {
    if (!detail) return [];
    const issues: string[] = [];
    for (const item of actionablePurchaseRows) {
      const draft = drafts[`purchase:${item.id}`];
      if (!draft || draft.decision === 'pending') continue;
      const quantity = quantityValue(draft.quantity);
      if (draft.decision === 'overridden' && (quantity === null || quantity < 0)) issues.push(ui('{product}: enter a valid override quantity.').replace('{product}', item.product_name));
      if (reasonRequired(draft.decision) && draft.reason.trim().length < 3) issues.push(ui('{product}: enter a reason of at least 3 characters.').replace('{product}', item.product_name));
      if (['accepted', 'overridden'].includes(draft.decision) && (draft.decision !== 'overridden' || numberValue(quantity) > 0) && !item.supplier_id) {
        issues.push(ui('{product}: a supplier is required before accepting a purchase recommendation.').replace('{product}', item.product_name));
      }
    }
    for (const transfer of detail.transfers) {
      const draft = drafts[`transfer:${transfer.id}`];
      if (!draft || draft.decision === 'pending') continue;
      const quantity = quantityValue(draft.quantity);
      if (draft.decision === 'overridden' && (quantity === null || quantity < 0)) issues.push(ui('{product}: enter a valid transfer override quantity.').replace('{product}', transfer.product_name));
      if (draft.decision === 'overridden' && quantity !== null && quantity > numberValue(transfer.source_surplus_before)) issues.push(ui('{product}: override exceeds protected source surplus.').replace('{product}', transfer.product_name));
      if (draft.decision === 'overridden' && quantity !== null && quantity > numberValue(transfer.destination_shortage_before)) issues.push(ui('{product}: override exceeds the destination shortage.').replace('{product}', transfer.product_name));
      if (reasonRequired(draft.decision) && draft.reason.trim().length < 3) issues.push(ui('{product}: enter a reason of at least 3 characters.').replace('{product}', transfer.product_name));
    }
    return issues;
  }, [actionablePurchaseRows, detail, drafts, ui]);

  const acceptedTransferDraftsRequired = Boolean(detail?.transfers.some((row) => ['accepted', 'overridden'].includes(row.decision_status) && numberValue(row.final_quantity) > 0 && !row.linked_stock_transfer_id));
  const acceptedPurchaseDraftsRequired = Boolean(actionablePurchaseRows.some((row) => ['accepted', 'overridden'].includes(row.decision_status) && numberValue(row.final_purchase_quantity) > 0 && !row.linked_purchase_order_id));
  const acceptedPurchaseWithoutSupplier = actionablePurchaseRows.filter((row) => ['accepted', 'overridden'].includes(row.decision_status) && numberValue(row.final_purchase_quantity) > 0 && !row.supplier_id).length;
  const missingMaterializationPermission = (acceptedTransferDraftsRequired && !canCreateTransfers) || (acceptedPurchaseDraftsRequired && !canCreatePurchaseOrders);
  const canMaterialize = Boolean(
    detail
    && canGovern
    && !runLocked
    && changedDecisions.length === 0
    && allLinesReviewed
    && !runAgeExpired
    && !missingMaterializationPermission
    && acceptedPurchaseWithoutSupplier === 0
    && (acceptedTransferDraftsRequired || acceptedPurchaseDraftsRequired)
  );

  const normalizedSearch = lineSearch.trim().toLowerCase();
  const visibleTransfers = useMemo(() => (detail?.transfers ?? []).filter((row) => {
    const matchesSearch = !normalizedSearch || [row.product_name, row.source_storage_location_name, row.destination_storage_location_name].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    const matchesDecision = decisionFilter === 'all' || row.decision_status === decisionFilter;
    return matchesSearch && matchesDecision;
  }), [decisionFilter, detail, normalizedSearch]);
  const visiblePurchases = useMemo(() => actionablePurchaseRows.filter((row) => {
    const matchesSearch = !normalizedSearch || [row.product_name, row.storage_location_name, row.supplier_name].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    const matchesDecision = decisionFilter === 'all' || row.decision_status === decisionFilter;
    return matchesSearch && matchesDecision;
  }), [actionablePurchaseRows, decisionFilter, normalizedSearch]);

  const outcomeActionRows = useMemo(() => (outcomesQuery.data?.items ?? []).filter((row) =>
    numberValue(row.shortage_before_transfer) > 0 || Boolean(row.linked_purchase_order_id)
  ), [outcomesQuery.data]);

  const setAll = (kind: 'purchase' | 'transfer', decision: Exclude<Decision, 'pending'>) => {
    if (!canGovern || runLocked) return;
    const rows = kind === 'purchase' ? visiblePurchases : visibleTransfers;
    setDrafts((current) => {
      const next = { ...current };
      for (const row of rows) {
        const linked = kind === 'purchase'
          ? Boolean((row as PlanItem).linked_purchase_order_id)
          : Boolean((row as PlanTransfer).linked_stock_transfer_id);
        if (linked) continue;
        if (kind === 'purchase' && decision === 'accepted' && !(row as PlanItem).supplier_id) continue;
        const quantity = kind === 'purchase' ? (row as PlanItem).recommended_purchase_quantity : (row as PlanTransfer).recommended_quantity;
        next[`${kind}:${row.id}`] = { decision, quantity: String(quantity), reason: '' };
      }
      return next;
    });
  };

  const refreshPage = async () => {
    if (changedDecisions.length && !window.confirm(ui('Discard unsaved planning decisions and refresh this page?'))) return;
    setDrafts({});
    setMessage('');
    setError('');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['location-replenishment-runs'] }),
      effectiveRunId ? queryClient.invalidateQueries({ queryKey: ['location-replenishment-run', effectiveRunId] }) : Promise.resolve(),
      effectiveRunId ? queryClient.invalidateQueries({ queryKey: ['location-replenishment-outcomes', effectiveRunId] }) : Promise.resolve()
    ]);
  };

  const changeRun = (nextRunId: string) => {
    if (changedDecisions.length && !window.confirm(ui('Discard unsaved planning decisions and open another run?'))) return;
    setSelectedRunId(nextRunId);
    setDrafts({});
    setLineSearch('');
    setDecisionFilter('all');
    setMessage('');
    setError('');
  };

  const navigateWorkspaceSection = (section: ReplenishmentWorkspaceSection, targetId: string) => {
    setActiveWorkspaceSection(section);
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const generateRun = () => {
    if (changedDecisions.length && !window.confirm(ui('Discard unsaved planning decisions and generate a new run?'))) return;
    if (!Number.isInteger(coverageDays) || coverageDays < 1 || coverageDays > 90) {
      setError(ui('Target coverage days must be a whole number from 1 to 90.'));
      return;
    }
    setMessage('');
    setError('');
    createMutation.mutate({ target_coverage_days: coverageDays });
  };

  const primaryLoadError = runsQuery.error || detailQuery.error;

  return (
    <div id="replenishment-planning-workspace-top" className="replenishment-planning-page io-operational-page io-workspace-page">
      <OperationalWorkspaceHero
        iconPath="/replenishment-planning"
        eyebrow={ui("Procurement")}
        title={ui("Replenishment planning")}
        description={ui("Move available stock between locations before buying from suppliers. Planning runs are reviewed first, and nothing moves or orders automatically.")}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
                      <>
                        <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Transfer before buy")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Human review required")}</OperationalWorkspaceMetaPill>
                      </>
                    
          */
        }
        aside={
          <button
            type="button"
            className="app-button app-button--secondary"
            disabled={runsQuery.isFetching || detailQuery.isFetching}
            onClick={() => void refreshPage()}
          >
            {runsQuery.isFetching || detailQuery.isFetching ? ui('Refreshing…') : ui('Refresh')}
          </button>
        }
      />

      {message ? <div style={styles.success}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {primaryLoadError ? <div style={styles.error}>{ui('Planning data could not be loaded: {error}').replace('{error}', errorMessage(primaryLoadError))}</div> : null}
      {outcomesQuery.error ? <div style={styles.warning}>{ui('The planning run loaded, but outcome tracking is unavailable: {error}').replace('{error}', errorMessage(outcomesQuery.error))}</div> : null}

      <OperationalWorkspaceStats ariaLabel={ui("Replenishment planning summary")}>
        <OperationalWorkspaceStatCard
          label={ui("Planning runs")}
          value={formatUiNumber(runsQuery.data?.length ?? 0, 0)}
          helper={ui("Saved review snapshots available to this tenant")}
          tone="neutral"
          iconPath="/replenishment-planning"
          loading={runsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Shortage scopes")}
          value={formatUiNumber(detail ? summary.shortage_line_count ?? 0 : 0, 0)}
          helper={ui("Product and location combinations below the planned target")}
          tone={numberValue(summary.shortage_line_count) > 0 ? 'warn' : 'neutral'}
          iconPath="/alerts"
          loading={detailQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Internal transfers")}
          value={formatUiNumber(detail ? summary.transfer_recommendation_count ?? detail.transfers.length : 0, 0)}
          helper={ui("Recommended moves before any supplier purchase")}
          tone={detail?.transfers.length ? 'blue' : 'neutral'}
          iconPath="/stock-transfers"
          loading={detailQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Supplier purchases")}
          value={formatUiNumber(detail ? summary.purchase_recommendation_count ?? actionablePurchaseRows.length : 0, 0)}
          helper={ui("Remaining purchase needs after transfer coverage")}
          tone={actionablePurchaseRows.length ? 'blue' : 'neutral'}
          iconPath="/purchase-orders"
          loading={detailQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Review status")}
          value={!detail ? ui('No run') : allLinesReviewed ? ui('Complete') : ui('{count} pending').replace('{count}', formatUiNumber(pendingDecisionCount, 0))}
          helper={!detail ? ui('Generate or select a planning run') : allLinesReviewed ? ui('Every action line has been reviewed') : ui('Decisions remain before drafts can be created')}
          tone={!detail ? 'neutral' : allLinesReviewed ? 'good' : 'warn'}
          iconPath="/audit"
          loading={detailQuery.isLoading}
        />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui("Replenishment planning work areas")} hint={ui("Jump to the part of the replenishment workflow you need.")}>
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'overview'}
          iconPath="/dashboard"
          label={ui("Overview")}
          onClick={() => navigateWorkspaceSection('overview', 'replenishment-planning-workspace-top')}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'runs'}
          iconPath="/replenishment-planning"
          label={ui("Planning runs")}
          count={formatUiNumber(runsQuery.data?.length ?? 0, 0)}
          onClick={() => navigateWorkspaceSection('runs', 'replenishment-run-controls')}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'review'}
          iconPath="/stock-transfers"
          label={ui("Review lines")}
          count={formatUiNumber(detail ? detail.transfers.length + actionablePurchaseRows.length : 0, 0)}
          disabled={!detail}
          onClick={() => navigateWorkspaceSection('review', 'replenishment-review-lines')}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'drafts'}
          iconPath="/purchase-orders"
          label={ui("Create drafts")}
          disabled={!detail}
          onClick={() => navigateWorkspaceSection('drafts', 'replenishment-draft-gate')}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'outcomes'}
          iconPath="/reports"
          label={ui("Outcomes")}
          disabled={detail?.run.status !== 'materialized'}
          onClick={() => navigateWorkspaceSection('outcomes', 'replenishment-outcomes')}
        />
      </OperationalWorkspaceTabs>

      <section id="replenishment-run-controls" className="app-panel replenishment-planning-card replenishment-planning-scroll-anchor">
        <OperationalSectionHeader
          iconPath="/replenishment-planning"
          title={ui("Planning run")}
          description={ui("Set the target coverage, generate a new review snapshot, or open an earlier run. Generating a run does not move stock or create an order.")}
        />
        <div className="replenishment-planning-run-controls">
          <label className="replenishment-planning-field">
            <span>{ui("Target coverage days")}</span>
            <input
              type="number"
              min={1}
              max={90}
              step={1}
              value={coverageDays}
              disabled={!canGenerate || createMutation.isPending}
              onChange={(event) => setCoverageDays(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="app-button app-button--primary replenishment-planning-generate-button"
            disabled={!canGenerate || createMutation.isPending || coverageDays < 1 || coverageDays > 90}
            onClick={generateRun}
          >
            {createMutation.isPending ? ui('Generating…') : ui('Generate planning run')}
          </button>
          <label className="replenishment-planning-field replenishment-planning-run-select">
            <span>{ui("Saved planning run")}</span>
            <select value={effectiveRunId} disabled={runsQuery.isLoading || !(runsQuery.data?.length)} onChange={(event) => changeRun(event.target.value)}>
              <option value="">{runsQuery.data?.length ? ui('Select a run') : ui('No saved runs')}</option>
              {runsQuery.data?.map((run) => (
                <option key={run.id} value={run.id}>
                  {formatUiDateTime(run.created_at)} · {canonicalDisplayLabel(run.status)} · {ui('{count} day target').replace('{count}', formatUiNumber(run.target_coverage_days))}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!canGenerate ? <div className="replenishment-planning-note">{ui("Your role can review planning runs but cannot generate a new run.")}</div> : null}
        {!runsQuery.isLoading && runsQuery.data?.length === 0 ? (
          <div className="replenishment-planning-empty-state">
            <strong>{ui("No planning run yet")}</strong>
            <span>{ui("Set a coverage target and generate a run after location par levels or stock minimums have been configured.")}</span>
          </div>
        ) : null}
      </section>

      {detail ? <>
        <section className="app-panel replenishment-planning-card replenishment-planning-run-summary">
          <OperationalSectionHeader
            iconPath="/replenishment-planning"
            title={ui("Current planning run")}
            description={ui("A saved snapshot of stock needs, internal transfer opportunities, and any remaining supplier purchase requirement.")}
            actions={<StatusBadge value={detail.run.status} label={canonicalDisplayLabel(detail.run.status)} />}
          />
          <div className="replenishment-planning-summary-grid">
            <div><span>{ui("Created")}</span><strong>{formatUiDateTime(detail.run.created_at)}</strong></div>
            <div><span>{ui("Created by")}</span><strong>{detail.run.generated_by_user_name || ui('System')}</strong></div>
            <div><span>{ui("Coverage target")}</span><strong>{ui('{count} days').replace('{count}', formatUiNumber(detail.run.target_coverage_days))}</strong></div>
            <div><span>{ui("Demand history")}</span><strong>{ui('{count} days').replace('{count}', formatUiNumber(detail.run.lookback_days))}</strong></div>
            <div><span>{ui("Drafts created")}</span><strong>{detail.run.materialized_at ? formatUiDateTime(detail.run.materialized_at) : ui('Not yet')}</strong></div>
          </div>
          <details className="replenishment-planning-advanced-details">
            <summary>{ui("Advanced run details")}</summary>
            <div className="replenishment-planning-advanced-detail-grid">
              <div><span>{ui("Planning run ID")}</span><code>{detail.run.id}</code></div>
              <div><span>{ui("Formula")}</span><code>{detail.run.formula_version}</code></div>
              <div><span>{ui("Version")}</span><strong>{detail.run.version ?? '—'}</strong></div>
              <div><span>{ui("Last updated")}</span><strong>{formatUiDateTime(detail.run.updated_at)}</strong></div>
            </div>
          </details>
          {!canGovern ? <div className="replenishment-planning-note">{ui("This is a read-only view for your role. A user with replenishment governance permission must record decisions.")}</div> : null}
        </section>

        <div id="replenishment-review-lines" className="replenishment-planning-scroll-anchor replenishment-planning-review-stack">
          <section className="app-panel replenishment-planning-card">
            <OperationalSectionHeader
              iconPath="/procurement-recommendations"
              title={ui("Review filters")}
              description={ui("Search transfer and purchase recommendations, or focus the list by decision status.")}
              actions={<span className="replenishment-planning-count">{ui('{transfers} transfer · {purchases} purchase lines').replace('{transfers}', formatUiNumber(visibleTransfers.length, 0)).replace('{purchases}', formatUiNumber(visiblePurchases.length, 0))}</span>}
            />
            <div className="replenishment-planning-filter-grid">
              <label className="replenishment-planning-field replenishment-planning-field--wide">
                <span>{ui("Search")}</span>
                <input value={lineSearch} maxLength={255} placeholder={ui('Product, supplier, or location')} onChange={(event) => setLineSearch(event.target.value)} />
              </label>
              <label className="replenishment-planning-field">
                <span>{ui("Decision status")}</span>
                <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as 'all' | Decision)}>
                  <option value="all">{ui('All decisions')}</option>
                  {DECISIONS.map((decision) => <option key={decision} value={decision}>{decisionDisplayLabel(decision)}</option>)}
                </select>
              </label>
              <button type="button" className="app-button app-button--secondary" onClick={() => { setLineSearch(''); setDecisionFilter('all'); }}>{ui("Clear filters")}</button>
            </div>
          </section>

          <section className="app-panel replenishment-planning-card">
            <OperationalSectionHeader
              iconPath="/stock-transfers"
              title={ui("Transfer before buy")}
              description={ui("Use protected surplus at another location before buying more. Accepted recommendations create draft stock transfers only.")}
              actions={
                <div className="replenishment-planning-actions">
                  <button type="button" className="app-button app-button--secondary" disabled={!canGovern || runLocked || visibleTransfers.length === 0} onClick={() => setAll('transfer', 'accepted')}>{ui("Accept visible")}</button>
                  <button type="button" className="app-button app-button--secondary" disabled={!canGovern || runLocked || visibleTransfers.length === 0} onClick={() => setAll('transfer', 'deferred')}>{ui("Defer visible")}</button>
                </div>
              }
            />
            {visibleTransfers.length === 0 ? <div className="replenishment-planning-empty-state replenishment-planning-empty-state--compact"><strong>{ui("No transfer recommendations")}</strong><span>{ui("No transfer recommendation matches the current filters.")}</span></div> : (
              <div className="replenishment-planning-table-wrap">
                <table className="replenishment-planning-table replenishment-planning-table--transfers">
                  <thead><tr><th>{ui("Product")}</th><th>{ui("Route")}</th><th>{ui("Recommended")}</th><th>{ui("Available / shortage")}</th><th>{ui("Decision")}</th><th>{ui("Final quantity")}</th><th>{ui("Reason")}</th><th>{ui("Draft transfer")}</th></tr></thead>
                  <tbody>{visibleTransfers.map((row) => {
                    const key = `transfer:${row.id}`;
                    const draft = drafts[key] ?? { decision: row.decision_status, quantity: String(row.final_quantity), reason: row.decision_reason ?? '' };
                    const disabled = !canGovern || runLocked || Boolean(row.linked_stock_transfer_id);
                    return <tr key={row.id}>
                      <td><strong>{row.product_name}</strong><small>{row.product_unit || ui('Unit not recorded')}</small></td>
                      <td><strong>{row.source_storage_location_name}</strong><small>{ui('to {location}').replace('{location}', row.destination_storage_location_name)}</small></td>
                      <td><strong>{formatUiNumber(row.recommended_quantity)}</strong></td>
                      <td>
                        <strong>{ui('{count} available').replace('{count}', formatUiNumber(row.source_surplus_before))}</strong>
                        {row.evidence?.source_review_required ? <small>{ui('Review required')} · {ui('Source policy not configured')}</small> : null}
                        <small>{ui('{count} shortage').replace('{count}', formatUiNumber(row.destination_shortage_before))}</small>
                      </td>
                      <td><select value={draft.decision} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, decision: event.target.value as Decision } }))}>{DECISIONS.map((decision) => <option key={decision} value={decision} disabled={decision === 'pending' && row.decision_status !== 'pending'}>{decisionDisplayLabel(decision)}</option>)}</select></td>
                      <td><input className="replenishment-planning-quantity-input" type="number" min={0} step="0.0001" value={draft.quantity} disabled={disabled || draft.decision !== 'overridden'} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))}/></td>
                      <td><input value={draft.reason} maxLength={2000} placeholder={reasonRequired(draft.decision) ? ui('Reason required') : ui('Optional note')} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, reason: event.target.value } }))}/></td>
                      <td>{row.linked_stock_transfer_id ? <a href={`/stock-transfers?transfer_id=${row.linked_stock_transfer_id}`}>{ui('Open draft')} · {canonicalDisplayLabel(row.linked_stock_transfer_status)}</a> : <span className="replenishment-planning-muted">{ui('Not created')}</span>}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="app-panel replenishment-planning-card">
            <OperationalSectionHeader
              iconPath="/purchase-orders"
              title={ui("Remaining supplier purchases")}
              description={ui("Only the gap left after internal transfer coverage is proposed for supplier purchase, with supplier minimum-order and package rules applied.")}
              actions={
                <div className="replenishment-planning-actions">
                  <button type="button" className="app-button app-button--secondary" disabled={!canGovern || runLocked || visiblePurchases.length === 0} onClick={() => setAll('purchase', 'accepted')}>{ui("Accept eligible")}</button>
                  <button type="button" className="app-button app-button--secondary" disabled={!canGovern || runLocked || visiblePurchases.length === 0} onClick={() => setAll('purchase', 'deferred')}>{ui("Defer visible")}</button>
                </div>
              }
            />
            {visiblePurchases.length === 0 ? <div className="replenishment-planning-empty-state replenishment-planning-empty-state--compact"><strong>{ui("No supplier purchase recommendations")}</strong><span>{ui("No supplier-purchase recommendation matches the current filters.")}</span></div> : (
              <div className="replenishment-planning-table-wrap">
                <table className="replenishment-planning-table replenishment-planning-table--purchases">
                  <thead><tr><th>{ui("Product / location")}</th><th>{ui("Stock position")}</th><th>{ui("Target")}</th><th>{ui("Transfer cover")}</th><th>{ui("Remaining gap")}</th><th>{ui("Recommended order")}</th><th>{ui("Supplier")}</th><th>{ui("Decision")}</th><th>{ui("Final quantity")}</th><th>{ui("Reason")}</th><th>{ui("Draft PO")}</th></tr></thead>
                  <tbody>{visiblePurchases.map((row) => {
                    const key = `purchase:${row.id}`;
                    const draft = drafts[key] ?? { decision: row.decision_status, quantity: String(row.final_purchase_quantity), reason: row.decision_reason ?? '' };
                    const disabled = !canGovern || runLocked || Boolean(row.linked_purchase_order_id);
                    const supplierMissing = !row.supplier_id;
                    const currency = row.estimated_cost_currency || row.evidence?.supplier?.currency || null;
                    return <tr key={row.id}>
                      <td><strong>{row.product_name}</strong><small>{row.storage_location_name} · {row.product_unit || ui('Unit not recorded')}</small></td>
                      <td><strong>{formatUiNumber(row.usable_inventory_position)}</strong><small>{ui('On hand {onHand} · reserved {reserved} · inbound {inbound}').replace('{onHand}', formatUiNumber(row.current_stock)).replace('{reserved}', formatUiNumber(row.reserved_quantity)).replace('{inbound}', formatUiNumber(row.reliable_inbound_quantity))}</small></td>
                      <td><strong>{formatUiNumber(row.configured_target_quantity)}</strong><small>{ui('Minimum {count}').replace('{count}', formatUiNumber(row.governed_min_quantity))}</small></td>
                      <td><strong>{formatUiNumber(row.transfer_covered_quantity)}</strong></td>
                      <td><strong>{formatUiNumber(row.remaining_purchase_requirement)}</strong></td>
                      <td><strong>{formatUiNumber(row.recommended_purchase_quantity)}</strong><small>{ui('Est. cost {cost}').replace('{cost}', row.estimated_purchase_cost == null ? ui('Not available') : formatUiCurrency(row.estimated_purchase_cost, currency))}</small></td>
                      <td>{row.supplier_name ? <strong>{row.supplier_name}</strong> : <span className="replenishment-planning-inline-error">{ui("Supplier missing")}</span>}</td>
                      <td><select value={draft.decision} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, decision: event.target.value as Decision } }))}>{DECISIONS.map((decision) => <option key={decision} value={decision} disabled={(decision === 'pending' && row.decision_status !== 'pending') || (supplierMissing && ['accepted', 'overridden'].includes(decision))}>{decisionDisplayLabel(decision)}</option>)}</select></td>
                      <td><input className="replenishment-planning-quantity-input" type="number" min={0} step="0.0001" value={draft.quantity} disabled={disabled || draft.decision !== 'overridden' || supplierMissing} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))}/></td>
                      <td><input value={draft.reason} maxLength={2000} placeholder={reasonRequired(draft.decision) ? ui('Reason required') : ui('Optional note')} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, reason: event.target.value } }))}/></td>
                      <td>{row.linked_purchase_order_id ? <a href={`/purchase-orders?purchaseOrderId=${row.linked_purchase_order_id}`}>{ui('Open draft')} · {canonicalDisplayLabel(row.linked_purchase_order_status)}</a> : <span className="replenishment-planning-muted">{ui('Not created')}</span>}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
            {actionablePurchaseRows.some((row) => !row.supplier_id) ? <div className="replenishment-planning-warning-note">{ui("A purchase line without a supplier cannot be accepted. Configure the product or supplier catalog, then generate a fresh planning run. You can still defer, reject, or mark the current line as already handled with a reason.")}</div> : null}
          </section>
        </div>

        <section id="replenishment-draft-gate" className="app-panel replenishment-planning-card replenishment-planning-scroll-anchor">
          <OperationalSectionHeader
            iconPath="/purchase-orders"
            title={ui("Review and create drafts")}
            description={ui("Save all decisions first. Before draft creation, the app rechecks current stock, reservations, transfers, inbound supply, products, locations, suppliers, and package rules.")}
            actions={<StatusBadge value={detail.run.status} label={canonicalDisplayLabel(detail.run.status)} />}
          />
          <OperationalWorkspaceStats className="replenishment-planning-gate-stats" ariaLabel={ui("Draft creation readiness")}>
            <OperationalWorkspaceStatCard label={ui('Unsaved changes')} value={changedDecisions.length} helper={ui('Save these decisions first')} tone={changedDecisions.length ? 'warn' : 'good'} iconPath="/audit" />
            <OperationalWorkspaceStatCard label={ui('Pending decisions')} value={pendingDecisionCount} helper={ui('Every action line must be reviewed')} tone={pendingDecisionCount ? 'warn' : 'good'} iconPath="/alerts" />
            <OperationalWorkspaceStatCard label={ui('Draft types')} value={[acceptedTransferDraftsRequired ? ui('Transfer') : '', acceptedPurchaseDraftsRequired ? ui('Purchase') : ''].filter(Boolean).join(' ') || ui('None')} helper={ui('Accepted positive-quantity recommendations only')} tone="neutral" iconPath="/purchase-orders" />
            <OperationalWorkspaceStatCard label={ui('Run age')} value={ui('{count}h').replace('{count}', formatUiNumber(detail.run.materialization_guard?.run_age_hours ?? 0))} helper={ui('Maximum {count}h').replace('{count}', formatUiNumber(detail.run.materialization_guard?.max_age_hours ?? 24, 0))} tone={runAgeExpired ? 'danger' : 'neutral'} iconPath="/replenishment-planning" />
          </OperationalWorkspaceStats>
          {decisionIssues.length ? <div style={styles.error}><strong>{ui("Correct these decision entries:")}</strong><ul style={styles.list}>{decisionIssues.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
          <div className="replenishment-planning-actions replenishment-planning-draft-actions">
            <button type="button" className="app-button app-button--primary" disabled={!canGovern || changedDecisions.length === 0 || decisionMutation.isPending || runLocked || decisionIssues.length > 0} onClick={() => detail && decisionMutation.mutate({ runId: detail.run.id, expectedRunVersion: numberValue(detail.run.version), decisions: changedDecisions })}>{decisionMutation.isPending ? ui('Saving…') : ui('Save {count} decision(s)').replace('{count}', formatUiNumber(changedDecisions.length, 0))}</button>
            <button type="button" className="app-button app-button--primary" disabled={!canMaterialize || materializeMutation.isPending} onClick={() => setConfirmation({ kind: 'materialize', title: ui('Create draft transfers and purchase orders'), message: ui('The latest stock and supply evidence will be checked again. Draft Stock Transfers and/or draft Purchase Orders will be created for accepted lines only. Nothing will be approved, submitted, received, or executed.') })}>{materializeMutation.isPending ? ui('Checking latest data…') : ui('Create accepted drafts')}</button>
          </div>
          {changedDecisions.length ? <div className="replenishment-planning-warning-note">{ui("Save or discard the unsaved decisions before creating drafts.")}</div> : null}
          {!allLinesReviewed ? <div className="replenishment-planning-warning-note">{ui('{count} planning line(s) still need a decision. Draft creation stays blocked until every action line is reviewed.').replace('{count}', formatUiNumber(pendingDecisionCount, 0))}</div> : null}
          {runAgeExpired ? <div style={styles.error}>{ui('This run is older than {count} hours. Generate a fresh run before creating drafts.').replace('{count}', formatUiNumber(detail.run.materialization_guard?.max_age_hours ?? 24, 0))}</div> : null}
          {missingMaterializationPermission ? <div style={styles.error}>{ui("Your role cannot create one or more accepted draft types. Stock Transfer create permission is required for accepted transfers, and Purchase Order create permission is required for accepted purchases.")}</div> : null}
          {acceptedPurchaseWithoutSupplier ? <div style={styles.error}>{ui('{count} accepted purchase line(s) do not have a supplier. Correct supplier configuration and generate a fresh run.').replace('{count}', formatUiNumber(acceptedPurchaseWithoutSupplier, 0))}</div> : null}
          {!acceptedTransferDraftsRequired && !acceptedPurchaseDraftsRequired && allLinesReviewed && !runLocked ? <div className="replenishment-planning-note">{ui("The review contains no accepted positive-quantity action. There is nothing to convert into a draft.")}</div> : null}
        </section>

        {detail.run.status === 'materialized' ? <section id="replenishment-outcomes" className="app-panel replenishment-planning-card replenishment-planning-scroll-anchor">
          <OperationalSectionHeader
            iconPath="/reports"
            title={ui("Outcome tracking")}
            description={ui("Follow the draft records created from this planning run and see whether the original shortage scopes were restored.")}
            actions={<button type="button" className="app-button app-button--secondary" disabled={outcomesQuery.isFetching} onClick={() => void outcomesQuery.refetch()}>{outcomesQuery.isFetching ? ui('Refreshing…') : ui('Refresh outcomes')}</button>}
          />
          {outcomesQuery.isLoading ? <div className="replenishment-planning-empty-state replenishment-planning-empty-state--compact"><span>{ui("Loading outcomes…")}</span></div> : outcomesQuery.data ? <>
            <OperationalWorkspaceStats className="replenishment-planning-outcome-stats" ariaLabel={ui("Replenishment outcomes")}>
              <OperationalWorkspaceStatCard label={ui('Draft POs created')} value={formatUiNumber(outcomesQuery.data.summary.purchase_orders_created, 0)} helper={ui('Received {quantity} · average fulfilment {percent}').replace('{quantity}', formatUiNumber(outcomesQuery.data.summary.received_quantity)).replace('{percent}', formatUiPercent(outcomesQuery.data.summary.average_fulfilment_ratio))} tone="neutral" iconPath="/purchase-orders" />
              <OperationalWorkspaceStatCard label={ui('Draft transfers created')} value={formatUiNumber(outcomesQuery.data.summary.stock_transfers_created, 0)} helper={ui('{count} executed').replace('{count}', formatUiNumber(outcomesQuery.data.summary.transfer_executed_count, 0))} tone="neutral" iconPath="/stock-transfers" />
              <OperationalWorkspaceStatCard label={ui('Shortage scopes restored')} value={formatUiNumber(outcomesQuery.data.summary.threshold_restored_count, 0)} helper={ui('Scopes that were short when planned')} tone="good" iconPath="/replenishment-planning" />
              <OperationalWorkspaceStatCard label={ui('Unresolved alerts')} value={formatUiNumber(outcomesQuery.data.summary.post_run_unresolved_alert_count)} helper={ui('Product alerts created after this run')} tone={numberValue(outcomesQuery.data.summary.post_run_unresolved_alert_count) ? 'warn' : 'good'} iconPath="/alerts" />
            </OperationalWorkspaceStats>
            <div className="replenishment-planning-subsection-title"><strong>{ui("Purchase and stock outcomes")}</strong><span>{ui("Product and location results created from this run.")}</span></div>
            <div className="replenishment-planning-table-wrap"><table className="replenishment-planning-table"><thead><tr><th>{ui("Product / location")}</th><th>{ui("PO status")}</th><th>{ui("Ordered")}</th><th>{ui("Received")}</th><th>{ui("Fulfilment")}</th><th>{ui("Current / minimum")}</th><th>{ui("Product alerts*")}</th></tr></thead><tbody>{outcomeActionRows.map((row) => <tr key={row.id}><td><strong>{row.product_name}</strong><small>{row.storage_location_name}</small></td><td><StatusBadge value={row.purchase_order_status} label={canonicalDisplayLabel(row.purchase_order_status)} /></td><td>{formatUiNumber(row.ordered_quantity)}</td><td>{formatUiNumber(row.received_quantity)}</td><td>{formatUiPercent(row.fulfilment_ratio)}</td><td>{formatUiNumber(row.current_stock)} / {formatUiNumber(row.governed_min_quantity)}<small>{row.threshold_restored ? ui('Threshold currently met') : ui('Below threshold')}</small></td><td>{formatUiNumber(row.post_run_unresolved_alert_count)}<small>{formatUiDateTime(row.latest_post_run_alert_at)}</small></td></tr>)}</tbody></table></div>
            <div className="replenishment-planning-footnote">{ui("* Per-row alert counts are product-level because alerts do not store a location. The summary card counts distinct alerts once across the run.")}</div>
            {outcomesQuery.data.transfers.length ? <><div className="replenishment-planning-subsection-title"><strong>{ui("Transfer outcomes")}</strong><span>{ui("Current state of stock transfers created by the run.")}</span></div><div className="replenishment-planning-table-wrap"><table className="replenishment-planning-table"><thead><tr><th>{ui("Product")}</th><th>{ui("Route")}</th><th>{ui("Quantity")}</th><th>{ui("Status")}</th></tr></thead><tbody>{outcomesQuery.data.transfers.map((row) => <tr key={row.id}><td><strong>{row.product_name}</strong></td><td>{row.source_storage_location_name} → {row.destination_storage_location_name}</td><td>{formatUiNumber(row.final_quantity)}</td><td><StatusBadge value={row.stock_transfer_status} label={canonicalDisplayLabel(row.stock_transfer_status)} /></td></tr>)}</tbody></table></div></> : null}
          </> : <div className="replenishment-planning-empty-state replenishment-planning-empty-state--compact"><strong>{ui("Outcome data unavailable")}</strong><span>{ui("Refresh the page or try again later.")}</span></div>}
        </section> : null}
      </> : null}

      {confirmation ? <div style={styles.modalBackdrop} role="presentation" onMouseDown={() => !materializeMutation.isPending && setConfirmation(null)}><section style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="replenishment-confirm-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="replenishment-confirm-title" style={styles.modalTitle}>{confirmation.title}</h2><p style={styles.modalText}>{confirmation.message}</p><div className="replenishment-planning-actions"><button type="button" className="app-button app-button--secondary" disabled={materializeMutation.isPending} onClick={() => setConfirmation(null)}>{ui("Cancel")}</button><button type="button" className="app-button app-button--primary" disabled={materializeMutation.isPending || !detail} onClick={() => detail && materializeMutation.mutate({ runId: detail.run.id, expectedRunVersion: numberValue(detail.run.version) })}>{materializeMutation.isPending ? ui('Working…') : ui('Create drafts')}</button></div></section></div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  success: { padding: 12, borderRadius: 8, background: '#e9f8ef', border: '1px solid #9bd8b1', color: '#176b3a' },
  error: { padding: 12, borderRadius: 8, background: '#fff0f0', border: '1px solid #efaaaa', color: '#9b1c1c' },
  warning: { padding: 12, borderRadius: 8, background: '#fff8e6', border: '1px solid #e6c66a', color: '#795500' },
  list: { margin: '8px 0 0', paddingLeft: 22 },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '5px 9px', fontSize: 12, fontWeight: 800 },
  badgeSuccess: { background: '#dcfce7', color: '#166534' },
  badgeDanger: { background: '#fee2e2', color: '#991b1b' },
  badgeInfo: { background: '#dbeafe', color: '#1e40af' },
  badgeNeutral: { background: '#e8edf4', color: '#334155' },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.58)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 },
  modal: { width: 'min(560px, 100%)', background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 24px 70px rgba(15, 23, 42, 0.35)' },
  modalTitle: { margin: '0 0 10px', fontSize: 23 },
  modalText: { color: '#475569', lineHeight: 1.6, marginBottom: 18 }
};
