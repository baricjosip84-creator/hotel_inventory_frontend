import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { formatCurrencyAmount } from '../lib/tenantCurrency';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
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
const formatNumber = (value: unknown): string => numberValue(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
const formatDateTime = (value?: string | null): string => value ? new Date(value).toLocaleString() : 'Not recorded';
const errorMessage = (error: unknown): string => error instanceof ApiError || error instanceof Error ? error.message : 'Request failed';
const readable = (value?: string | null): string => value
  ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not recorded';
const runStatusLabel = (value?: string | null): string => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'materialized') return 'Drafts created';
  if (normalized === 'reviewed') return 'Review complete';
  if (normalized === 'draft') return 'In review';
  return readable(value);
};
const decisionLabel = (value: Decision): string => ({
  pending: 'Needs decision',
  accepted: 'Accept recommendation',
  overridden: 'Use a different quantity',
  rejected: 'Reject recommendation',
  deferred: 'Defer decision',
  already_handled: 'Already handled outside this plan'
}[value]);
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

function StatusBadge({ value }: { value?: string | null }) {
  const normalized = String(value || '').toLowerCase();
  const tone = ['materialized', 'executed', 'completed', 'fulfilled'].includes(normalized)
    ? styles.badgeSuccess
    : ['cancelled', 'rejected', 'failed'].includes(normalized)
      ? styles.badgeDanger
      : ['reviewed', 'accepted', 'approved'].includes(normalized)
        ? styles.badgeInfo
        : styles.badgeNeutral;
  return <span style={{ ...styles.badge, ...tone }}>{runStatusLabel(value)}</span>;
}

export default function ReplenishmentPlanningPage() {
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
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
      setMessage('Planning run created. No stock moved and no supplier order was placed.');
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
      setMessage('Planning decisions saved. No draft transfer or Purchase Order was created.');
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
        ? `This run was already converted. Found ${transferCount} linked draft Stock Transfer(s) and ${purchaseOrderCount} linked draft Purchase Order(s).`
        : `Live evidence was checked again. Created ${transferCount} draft Stock Transfer(s) and ${purchaseOrderCount} draft Purchase Order(s). Nothing was approved or executed.`);
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
      if (draft.decision === 'overridden' && (quantity === null || quantity < 0)) issues.push(`${item.product_name}: enter a valid override quantity.`);
      if (reasonRequired(draft.decision) && draft.reason.trim().length < 3) issues.push(`${item.product_name}: enter a reason of at least 3 characters.`);
      if (['accepted', 'overridden'].includes(draft.decision) && (draft.decision !== 'overridden' || numberValue(quantity) > 0) && !item.supplier_id) {
        issues.push(`${item.product_name}: a supplier is required before accepting a purchase recommendation.`);
      }
    }
    for (const transfer of detail.transfers) {
      const draft = drafts[`transfer:${transfer.id}`];
      if (!draft || draft.decision === 'pending') continue;
      const quantity = quantityValue(draft.quantity);
      if (draft.decision === 'overridden' && (quantity === null || quantity < 0)) issues.push(`${transfer.product_name}: enter a valid transfer override quantity.`);
      if (draft.decision === 'overridden' && quantity !== null && quantity > numberValue(transfer.source_surplus_before)) issues.push(`${transfer.product_name}: override exceeds protected source surplus.`);
      if (draft.decision === 'overridden' && quantity !== null && quantity > numberValue(transfer.destination_shortage_before)) issues.push(`${transfer.product_name}: override exceeds the destination shortage.`);
      if (reasonRequired(draft.decision) && draft.reason.trim().length < 3) issues.push(`${transfer.product_name}: enter a reason of at least 3 characters.`);
    }
    return issues;
  }, [actionablePurchaseRows, detail, drafts]);

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
    if (changedDecisions.length && !window.confirm('Discard unsaved planning decisions and refresh this page?')) return;
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
    if (changedDecisions.length && !window.confirm('Discard unsaved planning decisions and open another run?')) return;
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
    if (changedDecisions.length && !window.confirm('Discard unsaved planning decisions and generate a new run?')) return;
    if (!Number.isInteger(coverageDays) || coverageDays < 1 || coverageDays > 90) {
      setError('Target coverage days must be a whole number from 1 to 90.');
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
        eyebrow="Procurement"
        title="Replenishment planning"
        description="Move available stock between locations before buying from suppliers. Planning runs are reviewed first, and nothing moves or orders automatically."
        meta={
          <>
            <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Transfer before buy</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Human review required</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <button
            type="button"
            className="app-button app-button--secondary"
            disabled={runsQuery.isFetching || detailQuery.isFetching}
            onClick={() => void refreshPage()}
          >
            {runsQuery.isFetching || detailQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {message ? <div style={styles.success}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {primaryLoadError ? <div style={styles.error}>Planning data could not be loaded: {errorMessage(primaryLoadError)}</div> : null}
      {outcomesQuery.error ? <div style={styles.warning}>The planning run loaded, but outcome tracking is unavailable: {errorMessage(outcomesQuery.error)}</div> : null}

      <OperationalWorkspaceStats ariaLabel="Replenishment planning summary">
        <OperationalWorkspaceStatCard
          label="Planning runs"
          value={runsQuery.data?.length ?? 0}
          helper="Saved review snapshots available to this tenant"
          tone="neutral"
          iconPath="/replenishment-planning"
          loading={runsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Shortage scopes"
          value={detail ? String(summary.shortage_line_count ?? 0) : '0'}
          helper="Product and location combinations below the planned target"
          tone={numberValue(summary.shortage_line_count) > 0 ? 'warn' : 'neutral'}
          iconPath="/alerts"
          loading={detailQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Internal transfers"
          value={detail ? String(summary.transfer_recommendation_count ?? detail.transfers.length) : '0'}
          helper="Recommended moves before any supplier purchase"
          tone={detail?.transfers.length ? 'blue' : 'neutral'}
          iconPath="/stock-transfers"
          loading={detailQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Supplier purchases"
          value={detail ? String(summary.purchase_recommendation_count ?? actionablePurchaseRows.length) : '0'}
          helper="Remaining purchase needs after transfer coverage"
          tone={actionablePurchaseRows.length ? 'blue' : 'neutral'}
          iconPath="/purchase-orders"
          loading={detailQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Review status"
          value={!detail ? 'No run' : allLinesReviewed ? 'Complete' : `${pendingDecisionCount} pending`}
          helper={!detail ? 'Generate or select a planning run' : allLinesReviewed ? 'Every action line has been reviewed' : 'Decisions remain before drafts can be created'}
          tone={!detail ? 'neutral' : allLinesReviewed ? 'good' : 'warn'}
          iconPath="/audit"
          loading={detailQuery.isLoading}
        />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel="Replenishment planning work areas" hint="Jump to the part of the replenishment workflow you need.">
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'overview'}
          iconPath="/dashboard"
          label="Overview"
          onClick={() => navigateWorkspaceSection('overview', 'replenishment-planning-workspace-top')}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'runs'}
          iconPath="/replenishment-planning"
          label="Planning runs"
          count={runsQuery.data?.length ?? 0}
          onClick={() => navigateWorkspaceSection('runs', 'replenishment-run-controls')}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'review'}
          iconPath="/stock-transfers"
          label="Review lines"
          count={detail ? detail.transfers.length + actionablePurchaseRows.length : 0}
          disabled={!detail}
          onClick={() => navigateWorkspaceSection('review', 'replenishment-review-lines')}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'drafts'}
          iconPath="/purchase-orders"
          label="Create drafts"
          disabled={!detail}
          onClick={() => navigateWorkspaceSection('drafts', 'replenishment-draft-gate')}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'outcomes'}
          iconPath="/reports"
          label="Outcomes"
          disabled={detail?.run.status !== 'materialized'}
          onClick={() => navigateWorkspaceSection('outcomes', 'replenishment-outcomes')}
        />
      </OperationalWorkspaceTabs>

      <section id="replenishment-run-controls" className="app-panel replenishment-planning-card replenishment-planning-scroll-anchor">
        <OperationalSectionHeader
          iconPath="/replenishment-planning"
          title="Planning run"
          description="Set the target coverage, generate a new review snapshot, or open an earlier run. Generating a run does not move stock or create an order."
        />
        <div className="replenishment-planning-run-controls">
          <label className="replenishment-planning-field">
            <span>Target coverage days</span>
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
            {createMutation.isPending ? 'Generating…' : 'Generate planning run'}
          </button>
          <label className="replenishment-planning-field replenishment-planning-run-select">
            <span>Saved planning run</span>
            <select value={effectiveRunId} disabled={runsQuery.isLoading || !(runsQuery.data?.length)} onChange={(event) => changeRun(event.target.value)}>
              <option value="">{runsQuery.data?.length ? 'Select a run' : 'No saved runs'}</option>
              {runsQuery.data?.map((run) => (
                <option key={run.id} value={run.id}>
                  {formatDateTime(run.created_at)} · {runStatusLabel(run.status)} · {formatNumber(run.target_coverage_days)} day target
                </option>
              ))}
            </select>
          </label>
        </div>
        {!canGenerate ? <div className="replenishment-planning-note">Your role can review planning runs but cannot generate a new run.</div> : null}
        {!runsQuery.isLoading && runsQuery.data?.length === 0 ? (
          <div className="replenishment-planning-empty-state">
            <strong>No planning run yet</strong>
            <span>Set a coverage target and generate a run after location par levels or stock minimums have been configured.</span>
          </div>
        ) : null}
      </section>

      {detail ? <>
        <section className="app-panel replenishment-planning-card replenishment-planning-run-summary">
          <OperationalSectionHeader
            iconPath="/replenishment-planning"
            title="Current planning run"
            description="A saved snapshot of stock needs, internal transfer opportunities, and any remaining supplier purchase requirement."
            actions={<StatusBadge value={detail.run.status} />}
          />
          <div className="replenishment-planning-summary-grid">
            <div><span>Created</span><strong>{formatDateTime(detail.run.created_at)}</strong></div>
            <div><span>Created by</span><strong>{detail.run.generated_by_user_name || 'System'}</strong></div>
            <div><span>Coverage target</span><strong>{formatNumber(detail.run.target_coverage_days)} days</strong></div>
            <div><span>Demand history</span><strong>{formatNumber(detail.run.lookback_days)} days</strong></div>
            <div><span>Drafts created</span><strong>{detail.run.materialized_at ? formatDateTime(detail.run.materialized_at) : 'Not yet'}</strong></div>
          </div>
          <details className="replenishment-planning-advanced-details">
            <summary>Advanced run details</summary>
            <div className="replenishment-planning-advanced-detail-grid">
              <div><span>Planning run ID</span><code>{detail.run.id}</code></div>
              <div><span>Formula</span><code>{detail.run.formula_version}</code></div>
              <div><span>Version</span><strong>{detail.run.version ?? '—'}</strong></div>
              <div><span>Last updated</span><strong>{formatDateTime(detail.run.updated_at)}</strong></div>
            </div>
          </details>
          {!canGovern ? <div className="replenishment-planning-note">This is a read-only view for your role. A user with replenishment governance permission must record decisions.</div> : null}
        </section>

        <div id="replenishment-review-lines" className="replenishment-planning-scroll-anchor replenishment-planning-review-stack">
          <section className="app-panel replenishment-planning-card">
            <OperationalSectionHeader
              iconPath="/procurement-recommendations"
              title="Review filters"
              description="Search transfer and purchase recommendations, or focus the list by decision status."
              actions={<span className="replenishment-planning-count">{visibleTransfers.length} transfer · {visiblePurchases.length} purchase lines</span>}
            />
            <div className="replenishment-planning-filter-grid">
              <label className="replenishment-planning-field replenishment-planning-field--wide">
                <span>Search</span>
                <input value={lineSearch} maxLength={255} placeholder="Product, supplier, or location" onChange={(event) => setLineSearch(event.target.value)} />
              </label>
              <label className="replenishment-planning-field">
                <span>Decision status</span>
                <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as 'all' | Decision)}>
                  <option value="all">All decisions</option>
                  {DECISIONS.map((decision) => <option key={decision} value={decision}>{decisionLabel(decision)}</option>)}
                </select>
              </label>
              <button type="button" className="app-button app-button--secondary" onClick={() => { setLineSearch(''); setDecisionFilter('all'); }}>Clear filters</button>
            </div>
          </section>

          <section className="app-panel replenishment-planning-card">
            <OperationalSectionHeader
              iconPath="/stock-transfers"
              title="Transfer before buy"
              description="Use protected surplus at another location before buying more. Accepted recommendations create draft stock transfers only."
              actions={
                <div className="replenishment-planning-actions">
                  <button type="button" className="app-button app-button--secondary" disabled={!canGovern || runLocked || visibleTransfers.length === 0} onClick={() => setAll('transfer', 'accepted')}>Accept visible</button>
                  <button type="button" className="app-button app-button--secondary" disabled={!canGovern || runLocked || visibleTransfers.length === 0} onClick={() => setAll('transfer', 'deferred')}>Defer visible</button>
                </div>
              }
            />
            {visibleTransfers.length === 0 ? <div className="replenishment-planning-empty-state replenishment-planning-empty-state--compact"><strong>No transfer recommendations</strong><span>No transfer recommendation matches the current filters.</span></div> : (
              <div className="replenishment-planning-table-wrap">
                <table className="replenishment-planning-table replenishment-planning-table--transfers">
                  <thead><tr><th>Product</th><th>Route</th><th>Recommended</th><th>Available / shortage</th><th>Decision</th><th>Final quantity</th><th>Reason</th><th>Draft transfer</th></tr></thead>
                  <tbody>{visibleTransfers.map((row) => {
                    const key = `transfer:${row.id}`;
                    const draft = drafts[key] ?? { decision: row.decision_status, quantity: String(row.final_quantity), reason: row.decision_reason ?? '' };
                    const disabled = !canGovern || runLocked || Boolean(row.linked_stock_transfer_id);
                    return <tr key={row.id}>
                      <td><strong>{row.product_name}</strong><small>{row.product_unit || 'Unit not recorded'}</small></td>
                      <td><strong>{row.source_storage_location_name}</strong><small>to {row.destination_storage_location_name}</small></td>
                      <td><strong>{formatNumber(row.recommended_quantity)}</strong></td>
                      <td><strong>{formatNumber(row.source_surplus_before)} available</strong><small>{formatNumber(row.destination_shortage_before)} shortage</small></td>
                      <td><select value={draft.decision} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, decision: event.target.value as Decision } }))}>{DECISIONS.map((decision) => <option key={decision} value={decision} disabled={decision === 'pending' && row.decision_status !== 'pending'}>{decisionLabel(decision)}</option>)}</select></td>
                      <td><input className="replenishment-planning-quantity-input" type="number" min={0} step="0.0001" value={draft.quantity} disabled={disabled || draft.decision !== 'overridden'} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))}/></td>
                      <td><input value={draft.reason} maxLength={2000} placeholder={reasonRequired(draft.decision) ? 'Reason required' : 'Optional note'} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, reason: event.target.value } }))}/></td>
                      <td>{row.linked_stock_transfer_id ? <a href={`/stock-transfers?transfer_id=${row.linked_stock_transfer_id}`}>Open draft · {readable(row.linked_stock_transfer_status)}</a> : <span className="replenishment-planning-muted">Not created</span>}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="app-panel replenishment-planning-card">
            <OperationalSectionHeader
              iconPath="/purchase-orders"
              title="Remaining supplier purchases"
              description="Only the gap left after internal transfer coverage is proposed for supplier purchase, with supplier minimum-order and package rules applied."
              actions={
                <div className="replenishment-planning-actions">
                  <button type="button" className="app-button app-button--secondary" disabled={!canGovern || runLocked || visiblePurchases.length === 0} onClick={() => setAll('purchase', 'accepted')}>Accept eligible</button>
                  <button type="button" className="app-button app-button--secondary" disabled={!canGovern || runLocked || visiblePurchases.length === 0} onClick={() => setAll('purchase', 'deferred')}>Defer visible</button>
                </div>
              }
            />
            {visiblePurchases.length === 0 ? <div className="replenishment-planning-empty-state replenishment-planning-empty-state--compact"><strong>No supplier purchase recommendations</strong><span>No supplier-purchase recommendation matches the current filters.</span></div> : (
              <div className="replenishment-planning-table-wrap">
                <table className="replenishment-planning-table replenishment-planning-table--purchases">
                  <thead><tr><th>Product / location</th><th>Stock position</th><th>Target</th><th>Transfer cover</th><th>Remaining gap</th><th>Recommended order</th><th>Supplier</th><th>Decision</th><th>Final quantity</th><th>Reason</th><th>Draft PO</th></tr></thead>
                  <tbody>{visiblePurchases.map((row) => {
                    const key = `purchase:${row.id}`;
                    const draft = drafts[key] ?? { decision: row.decision_status, quantity: String(row.final_purchase_quantity), reason: row.decision_reason ?? '' };
                    const disabled = !canGovern || runLocked || Boolean(row.linked_purchase_order_id);
                    const supplierMissing = !row.supplier_id;
                    const currency = row.estimated_cost_currency || row.evidence?.supplier?.currency || null;
                    return <tr key={row.id}>
                      <td><strong>{row.product_name}</strong><small>{row.storage_location_name} · {row.product_unit || 'unit not recorded'}</small></td>
                      <td><strong>{formatNumber(row.usable_inventory_position)}</strong><small>On hand {formatNumber(row.current_stock)} · reserved {formatNumber(row.reserved_quantity)} · inbound {formatNumber(row.reliable_inbound_quantity)}</small></td>
                      <td><strong>{formatNumber(row.configured_target_quantity)}</strong><small>Minimum {formatNumber(row.governed_min_quantity)}</small></td>
                      <td><strong>{formatNumber(row.transfer_covered_quantity)}</strong></td>
                      <td><strong>{formatNumber(row.remaining_purchase_requirement)}</strong></td>
                      <td><strong>{formatNumber(row.recommended_purchase_quantity)}</strong><small>Est. cost {row.estimated_purchase_cost == null ? 'not available' : formatCurrencyAmount(row.estimated_purchase_cost, currency, 4)}</small></td>
                      <td>{row.supplier_name ? <strong>{row.supplier_name}</strong> : <span className="replenishment-planning-inline-error">Supplier missing</span>}</td>
                      <td><select value={draft.decision} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, decision: event.target.value as Decision } }))}>{DECISIONS.map((decision) => <option key={decision} value={decision} disabled={(decision === 'pending' && row.decision_status !== 'pending') || (supplierMissing && ['accepted', 'overridden'].includes(decision))}>{decisionLabel(decision)}</option>)}</select></td>
                      <td><input className="replenishment-planning-quantity-input" type="number" min={0} step="0.0001" value={draft.quantity} disabled={disabled || draft.decision !== 'overridden' || supplierMissing} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))}/></td>
                      <td><input value={draft.reason} maxLength={2000} placeholder={reasonRequired(draft.decision) ? 'Reason required' : 'Optional note'} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, reason: event.target.value } }))}/></td>
                      <td>{row.linked_purchase_order_id ? <a href={`/purchase-orders?purchaseOrderId=${row.linked_purchase_order_id}`}>Open draft · {readable(row.linked_purchase_order_status)}</a> : <span className="replenishment-planning-muted">Not created</span>}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
            {actionablePurchaseRows.some((row) => !row.supplier_id) ? <div className="replenishment-planning-warning-note">A purchase line without a supplier cannot be accepted. Configure the product or supplier catalog, then generate a fresh planning run. You can still defer, reject, or mark the current line as already handled with a reason.</div> : null}
          </section>
        </div>

        <section id="replenishment-draft-gate" className="app-panel replenishment-planning-card replenishment-planning-scroll-anchor">
          <OperationalSectionHeader
            iconPath="/purchase-orders"
            title="Review and create drafts"
            description="Save all decisions first. Before draft creation, the app rechecks current stock, reservations, transfers, inbound supply, products, locations, suppliers, and package rules."
            actions={<StatusBadge value={detail.run.status} />}
          />
          <OperationalWorkspaceStats className="replenishment-planning-gate-stats" ariaLabel="Draft creation readiness">
            <OperationalWorkspaceStatCard label="Unsaved changes" value={changedDecisions.length} helper="Save these decisions first" tone={changedDecisions.length ? 'warn' : 'good'} iconPath="/audit" />
            <OperationalWorkspaceStatCard label="Pending decisions" value={pendingDecisionCount} helper="Every action line must be reviewed" tone={pendingDecisionCount ? 'warn' : 'good'} iconPath="/alerts" />
            <OperationalWorkspaceStatCard label="Draft types" value={`${acceptedTransferDraftsRequired ? 'Transfer ' : ''}${acceptedPurchaseDraftsRequired ? 'Purchase' : ''}`.trim() || 'None'} helper="Accepted positive-quantity recommendations only" tone="neutral" iconPath="/purchase-orders" />
            <OperationalWorkspaceStatCard label="Run age" value={`${formatNumber(detail.run.materialization_guard?.run_age_hours ?? 0)}h`} helper={`Maximum ${detail.run.materialization_guard?.max_age_hours ?? 24}h`} tone={runAgeExpired ? 'danger' : 'neutral'} iconPath="/replenishment-planning" />
          </OperationalWorkspaceStats>
          {decisionIssues.length ? <div style={styles.error}><strong>Correct these decision entries:</strong><ul style={styles.list}>{decisionIssues.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
          <div className="replenishment-planning-actions replenishment-planning-draft-actions">
            <button type="button" className="app-button app-button--primary" disabled={!canGovern || changedDecisions.length === 0 || decisionMutation.isPending || runLocked || decisionIssues.length > 0} onClick={() => detail && decisionMutation.mutate({ runId: detail.run.id, expectedRunVersion: numberValue(detail.run.version), decisions: changedDecisions })}>{decisionMutation.isPending ? 'Saving…' : `Save ${changedDecisions.length} decision(s)`}</button>
            <button type="button" className="app-button app-button--primary" disabled={!canMaterialize || materializeMutation.isPending} onClick={() => setConfirmation({ kind: 'materialize', title: 'Create draft transfers and purchase orders', message: 'The latest stock and supply evidence will be checked again. Draft Stock Transfers and/or draft Purchase Orders will be created for accepted lines only. Nothing will be approved, submitted, received, or executed.' })}>{materializeMutation.isPending ? 'Checking latest data…' : 'Create accepted drafts'}</button>
          </div>
          {changedDecisions.length ? <div className="replenishment-planning-warning-note">Save or discard the unsaved decisions before creating drafts.</div> : null}
          {!allLinesReviewed ? <div className="replenishment-planning-warning-note">{pendingDecisionCount} planning line(s) still need a decision. Draft creation stays blocked until every action line is reviewed.</div> : null}
          {runAgeExpired ? <div style={styles.error}>This run is older than {detail.run.materialization_guard?.max_age_hours ?? 24} hours. Generate a fresh run before creating drafts.</div> : null}
          {missingMaterializationPermission ? <div style={styles.error}>Your role cannot create one or more accepted draft types. Stock Transfer create permission is required for accepted transfers, and Purchase Order create permission is required for accepted purchases.</div> : null}
          {acceptedPurchaseWithoutSupplier ? <div style={styles.error}>{acceptedPurchaseWithoutSupplier} accepted purchase line(s) do not have a supplier. Correct supplier configuration and generate a fresh run.</div> : null}
          {!acceptedTransferDraftsRequired && !acceptedPurchaseDraftsRequired && allLinesReviewed && !runLocked ? <div className="replenishment-planning-note">The review contains no accepted positive-quantity action. There is nothing to convert into a draft.</div> : null}
        </section>

        {detail.run.status === 'materialized' ? <section id="replenishment-outcomes" className="app-panel replenishment-planning-card replenishment-planning-scroll-anchor">
          <OperationalSectionHeader
            iconPath="/reports"
            title="Outcome tracking"
            description="Follow the draft records created from this planning run and see whether the original shortage scopes were restored."
            actions={<button type="button" className="app-button app-button--secondary" disabled={outcomesQuery.isFetching} onClick={() => void outcomesQuery.refetch()}>{outcomesQuery.isFetching ? 'Refreshing…' : 'Refresh outcomes'}</button>}
          />
          {outcomesQuery.isLoading ? <div className="replenishment-planning-empty-state replenishment-planning-empty-state--compact"><span>Loading outcomes…</span></div> : outcomesQuery.data ? <>
            <OperationalWorkspaceStats className="replenishment-planning-outcome-stats" ariaLabel="Replenishment outcomes">
              <OperationalWorkspaceStatCard label="Draft POs created" value={outcomesQuery.data.summary.purchase_orders_created} helper={`Received ${formatNumber(outcomesQuery.data.summary.received_quantity)} · average fulfilment ${Math.round(numberValue(outcomesQuery.data.summary.average_fulfilment_ratio) * 100)}%`} tone="neutral" iconPath="/purchase-orders" />
              <OperationalWorkspaceStatCard label="Draft transfers created" value={outcomesQuery.data.summary.stock_transfers_created} helper={`${outcomesQuery.data.summary.transfer_executed_count} executed`} tone="neutral" iconPath="/stock-transfers" />
              <OperationalWorkspaceStatCard label="Shortage scopes restored" value={outcomesQuery.data.summary.threshold_restored_count} helper="Scopes that were short when planned" tone="good" iconPath="/replenishment-planning" />
              <OperationalWorkspaceStatCard label="Unresolved alerts" value={formatNumber(outcomesQuery.data.summary.post_run_unresolved_alert_count)} helper="Product alerts created after this run" tone={numberValue(outcomesQuery.data.summary.post_run_unresolved_alert_count) ? 'warn' : 'good'} iconPath="/alerts" />
            </OperationalWorkspaceStats>
            <div className="replenishment-planning-subsection-title"><strong>Purchase and stock outcomes</strong><span>Product and location results created from this run.</span></div>
            <div className="replenishment-planning-table-wrap"><table className="replenishment-planning-table"><thead><tr><th>Product / location</th><th>PO status</th><th>Ordered</th><th>Received</th><th>Fulfilment</th><th>Current / minimum</th><th>Product alerts*</th></tr></thead><tbody>{outcomeActionRows.map((row) => <tr key={row.id}><td><strong>{row.product_name}</strong><small>{row.storage_location_name}</small></td><td><StatusBadge value={row.purchase_order_status} /></td><td>{formatNumber(row.ordered_quantity)}</td><td>{formatNumber(row.received_quantity)}</td><td>{Math.round(numberValue(row.fulfilment_ratio) * 100)}%</td><td>{formatNumber(row.current_stock)} / {formatNumber(row.governed_min_quantity)}<small>{row.threshold_restored ? 'Threshold currently met' : 'Below threshold'}</small></td><td>{formatNumber(row.post_run_unresolved_alert_count)}<small>{formatDateTime(row.latest_post_run_alert_at)}</small></td></tr>)}</tbody></table></div>
            <div className="replenishment-planning-footnote">* Per-row alert counts are product-level because alerts do not store a location. The summary card counts distinct alerts once across the run.</div>
            {outcomesQuery.data.transfers.length ? <><div className="replenishment-planning-subsection-title"><strong>Transfer outcomes</strong><span>Current state of stock transfers created by the run.</span></div><div className="replenishment-planning-table-wrap"><table className="replenishment-planning-table"><thead><tr><th>Product</th><th>Route</th><th>Quantity</th><th>Status</th></tr></thead><tbody>{outcomesQuery.data.transfers.map((row) => <tr key={row.id}><td><strong>{row.product_name}</strong></td><td>{row.source_storage_location_name} → {row.destination_storage_location_name}</td><td>{formatNumber(row.final_quantity)}</td><td><StatusBadge value={row.stock_transfer_status} /></td></tr>)}</tbody></table></div></> : null}
          </> : <div className="replenishment-planning-empty-state replenishment-planning-empty-state--compact"><strong>Outcome data unavailable</strong><span>Refresh the page or try again later.</span></div>}
        </section> : null}
      </> : null}

      {confirmation ? <div style={styles.modalBackdrop} role="presentation" onMouseDown={() => !materializeMutation.isPending && setConfirmation(null)}><section style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="replenishment-confirm-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="replenishment-confirm-title" style={styles.modalTitle}>{confirmation.title}</h2><p style={styles.modalText}>{confirmation.message}</p><div className="replenishment-planning-actions"><button type="button" className="app-button app-button--secondary" disabled={materializeMutation.isPending} onClick={() => setConfirmation(null)}>Cancel</button><button type="button" className="app-button app-button--primary" disabled={materializeMutation.isPending || !detail} onClick={() => detail && materializeMutation.mutate({ runId: detail.run.id, expectedRunVersion: numberValue(detail.run.version) })}>{materializeMutation.isPending ? 'Working…' : 'Create drafts'}</button></div></section></div> : null}
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
