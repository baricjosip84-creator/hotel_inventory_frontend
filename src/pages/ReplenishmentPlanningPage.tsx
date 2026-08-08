import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { formatCurrencyAmount } from '../lib/tenantCurrency';

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

function Stat({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return <div style={styles.stat}><span style={styles.statLabel}>{label}</span><strong style={styles.statValue}>{value}</strong><span style={styles.muted}>{hint}</span></div>;
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
  return <span style={{ ...styles.badge, ...tone }}>{readable(value)}</span>;
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
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>PROCUREMENT / TRANSFER BEFORE BUY</div>
          <h1 style={styles.title}>Location Replenishment Planning</h1>
          <p style={styles.subtitle}>Creates a stable review snapshot of location shortages. Protected internal surplus is considered before supplier purchasing. The plan itself never moves stock, approves a transfer, or submits a Purchase Order.</p>
        </div>
        <button type="button" style={styles.secondaryButton} disabled={runsQuery.isFetching || detailQuery.isFetching} onClick={() => void refreshPage()}>{runsQuery.isFetching || detailQuery.isFetching ? 'Refreshing…' : 'Refresh page'}</button>
      </section>

      {message ? <div style={styles.success}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}
      {primaryLoadError ? <div style={styles.error}>Planning data could not be loaded: {errorMessage(primaryLoadError)}</div> : null}
      {outcomesQuery.error ? <div style={styles.warning}>The planning run loaded, but outcome tracking is unavailable: {errorMessage(outcomesQuery.error)}</div> : null}

      <section style={styles.panel}>
        <div style={styles.toolbar}>
          <label style={styles.field}>Target coverage days
            <input style={styles.input} type="number" min={1} max={90} step={1} value={coverageDays} disabled={!canGenerate || createMutation.isPending} onChange={(event) => setCoverageDays(Number(event.target.value))} />
          </label>
          <button type="button" style={styles.primaryButton} disabled={!canGenerate || createMutation.isPending || coverageDays < 1 || coverageDays > 90} onClick={generateRun}>{createMutation.isPending ? 'Generating…' : 'Generate planning run'}</button>
          <label style={{ ...styles.field, minWidth: 320 }}>Planning run
            <select style={styles.input} value={effectiveRunId} disabled={runsQuery.isLoading || !(runsQuery.data?.length)} onChange={(event) => changeRun(event.target.value)}>
              <option value="">Select a run</option>
              {runsQuery.data?.map((run) => <option key={run.id} value={run.id}>{formatDateTime(run.created_at)} · {readable(run.status)} · {String(run.id).slice(0, 8)}</option>)}
            </select>
          </label>
        </div>
        {!canGenerate ? <p style={styles.infoText}>Your role can review planning runs but cannot generate a new run.</p> : null}
        {!runsQuery.isLoading && runsQuery.data?.length === 0 ? <p style={styles.empty}>No planning run exists yet. Generate one after location par levels or stock minimums have been configured.</p> : null}
      </section>

      {detail ? <>
        <div style={styles.stats}>
          <Stat label="Run status" value={readable(detail.run.status)} hint={`Formula ${detail.run.formula_version}`} />
          <Stat label="Location scopes" value={String(summary.location_line_count ?? detail.items.length)} hint={`${summary.product_count ?? 0} products · ${summary.location_count ?? 0} locations`} />
          <Stat label="Internal transfers" value={String(summary.transfer_recommendation_count ?? detail.transfers.length)} hint={`${formatNumber(summary.transfer_recommended_quantity)} units recommended`} />
          <Stat label="Supplier purchases" value={String(summary.purchase_recommendation_count ?? actionablePurchaseRows.length)} hint={`${formatNumber(summary.purchase_recommended_quantity)} units recommended`} />
          <Stat label="Review readiness" value={allLinesReviewed ? 'Complete' : `${pendingDecisionCount} pending`} hint={`Run age ${formatNumber(detail.run.materialization_guard?.run_age_hours ?? 0)}h · version ${detail.run.version ?? '-'}`} />
        </div>

        <section style={styles.panel}>
          <div style={styles.detailGrid}>
            <div><span style={styles.detailLabel}>Created</span><strong>{formatDateTime(detail.run.created_at)}</strong></div>
            <div><span style={styles.detailLabel}>Generated by</span><strong>{detail.run.generated_by_user_name || 'System or support context'}</strong></div>
            <div><span style={styles.detailLabel}>Coverage target</span><strong>{formatNumber(detail.run.target_coverage_days)} days</strong></div>
            <div><span style={styles.detailLabel}>Demand lookback</span><strong>{formatNumber(detail.run.lookback_days)} days</strong></div>
            <div><span style={styles.detailLabel}>Materialized</span><strong>{formatDateTime(detail.run.materialized_at)}</strong></div>
            <div><span style={styles.detailLabel}>Run ID</span><code>{detail.run.id}</code></div>
          </div>
          {!canGovern ? <p style={styles.infoText}>This is a read-only view for your role. A user with Inventory Optimization governance permission must record decisions.</p> : null}
        </section>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div><h2 style={styles.sectionTitle}>Review controls</h2><p style={styles.muted}>Search both transfer and purchase lines. Bulk actions affect only currently visible, unlocked lines.</p></div>
            <div style={styles.actions}><span style={styles.countText}>{visibleTransfers.length} transfer · {visiblePurchases.length} purchase lines shown</span></div>
          </div>
          <div style={styles.toolbar}>
            <label style={{ ...styles.field, flex: '1 1 280px' }}>Search product, supplier, or location
              <input style={{ ...styles.input, width: '100%' }} value={lineSearch} maxLength={255} placeholder="Search planning lines" onChange={(event) => setLineSearch(event.target.value)} />
            </label>
            <label style={styles.field}>Decision status
              <select style={styles.input} value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as 'all' | Decision)}>
                <option value="all">All decisions</option>
                {DECISIONS.map((decision) => <option key={decision} value={decision}>{decisionLabel(decision)}</option>)}
              </select>
            </label>
            <button type="button" style={styles.secondaryButton} onClick={() => { setLineSearch(''); setDecisionFilter('all'); }}>Clear filters</button>
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div><h2 style={styles.sectionTitle}>Transfer before buy</h2><p style={styles.muted}>A source location is protected at its target level. Accepted lines create draft Stock Transfers only; they do not execute movement.</p></div>
            <div style={styles.actions}>
              <button type="button" style={styles.secondaryButton} disabled={!canGovern || runLocked || visibleTransfers.length === 0} onClick={() => setAll('transfer', 'accepted')}>Accept visible transfers</button>
              <button type="button" style={styles.secondaryButton} disabled={!canGovern || runLocked || visibleTransfers.length === 0} onClick={() => setAll('transfer', 'deferred')}>Defer visible transfers</button>
            </div>
          </div>
          {visibleTransfers.length === 0 ? <p style={styles.empty}>No transfer recommendation matches the current filters.</p> : <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Product</th><th>Route</th><th>Recommended</th><th>Protected evidence</th><th>Decision</th><th>Final quantity</th><th>Reason</th><th>Draft transfer</th></tr></thead><tbody>{visibleTransfers.map((row) => {
            const key = `transfer:${row.id}`;
            const draft = drafts[key] ?? { decision: row.decision_status, quantity: String(row.final_quantity), reason: row.decision_reason ?? '' };
            const disabled = !canGovern || runLocked || Boolean(row.linked_stock_transfer_id);
            return <tr key={row.id}>
              <td><strong>{row.product_name}</strong><br/><span style={styles.muted}>{row.product_unit || 'Unit not recorded'}</span></td>
              <td>{row.source_storage_location_name}<br/>→ {row.destination_storage_location_name}</td>
              <td><strong>{formatNumber(row.recommended_quantity)}</strong></td>
              <td>Source surplus {formatNumber(row.source_surplus_before)}<br/><span style={styles.muted}>Destination shortage {formatNumber(row.destination_shortage_before)}</span></td>
              <td><select style={styles.compactInput} value={draft.decision} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, decision: event.target.value as Decision } }))}>{DECISIONS.map((decision) => <option key={decision} value={decision} disabled={decision === 'pending' && row.decision_status !== 'pending'}>{decisionLabel(decision)}</option>)}</select></td>
              <td><input style={styles.qtyInput} type="number" min={0} step="0.0001" value={draft.quantity} disabled={disabled || draft.decision !== 'overridden'} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))}/></td>
              <td><input style={styles.compactInput} value={draft.reason} maxLength={2000} placeholder={reasonRequired(draft.decision) ? 'Reason required' : 'Optional note'} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, reason: event.target.value } }))}/></td>
              <td>{row.linked_stock_transfer_id ? <a href={`/stock-transfers?transfer_id=${row.linked_stock_transfer_id}`}>{String(row.linked_stock_transfer_id).slice(0, 8)} · {readable(row.linked_stock_transfer_status)}</a> : 'Not created'}</td>
            </tr>;
          })}</tbody></table></div>}
        </section>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div><h2 style={styles.sectionTitle}>Remaining supplier purchases</h2><p style={styles.muted}>The remaining gap is calculated after internal transfer coverage and rounded to supplier minimum-order and package rules.</p></div>
            <div style={styles.actions}>
              <button type="button" style={styles.secondaryButton} disabled={!canGovern || runLocked || visiblePurchases.length === 0} onClick={() => setAll('purchase', 'accepted')}>Accept eligible visible purchases</button>
              <button type="button" style={styles.secondaryButton} disabled={!canGovern || runLocked || visiblePurchases.length === 0} onClick={() => setAll('purchase', 'deferred')}>Defer visible purchases</button>
            </div>
          </div>
          {visiblePurchases.length === 0 ? <p style={styles.empty}>No supplier-purchase recommendation matches the current filters.</p> : <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Product / location</th><th>Usable position</th><th>Target</th><th>Transfer cover</th><th>Remaining gap</th><th>Recommended order</th><th>Supplier</th><th>Decision</th><th>Final quantity</th><th>Reason</th><th>Draft PO</th></tr></thead><tbody>{visiblePurchases.map((row) => {
            const key = `purchase:${row.id}`;
            const draft = drafts[key] ?? { decision: row.decision_status, quantity: String(row.final_purchase_quantity), reason: row.decision_reason ?? '' };
            const disabled = !canGovern || runLocked || Boolean(row.linked_purchase_order_id);
            const supplierMissing = !row.supplier_id;
            const currency = row.estimated_cost_currency || row.evidence?.supplier?.currency || null;
            return <tr key={row.id}>
              <td><strong>{row.product_name}</strong><br/><span style={styles.muted}>{row.storage_location_name} · {row.product_unit || 'unit not recorded'}</span></td>
              <td>{formatNumber(row.usable_inventory_position)}<br/><span style={styles.muted}>On hand {formatNumber(row.current_stock)} · reserved {formatNumber(row.reserved_quantity)} · reliable inbound {formatNumber(row.reliable_inbound_quantity)}</span></td>
              <td>{formatNumber(row.configured_target_quantity)}<br/><span style={styles.muted}>Governed minimum {formatNumber(row.governed_min_quantity)}</span></td>
              <td>{formatNumber(row.transfer_covered_quantity)}</td>
              <td>{formatNumber(row.remaining_purchase_requirement)}</td>
              <td><strong>{formatNumber(row.recommended_purchase_quantity)}</strong><br/><span style={styles.muted}>Estimated cost {row.estimated_purchase_cost == null ? 'not available' : formatCurrencyAmount(row.estimated_purchase_cost, currency, 4)}</span></td>
              <td>{row.supplier_name || <span style={styles.inlineError}>Supplier missing</span>}</td>
              <td><select style={styles.compactInput} value={draft.decision} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, decision: event.target.value as Decision } }))}>{DECISIONS.map((decision) => <option key={decision} value={decision} disabled={(decision === 'pending' && row.decision_status !== 'pending') || (supplierMissing && ['accepted', 'overridden'].includes(decision))}>{decisionLabel(decision)}</option>)}</select></td>
              <td><input style={styles.qtyInput} type="number" min={0} step="0.0001" value={draft.quantity} disabled={disabled || draft.decision !== 'overridden' || supplierMissing} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))}/></td>
              <td><input style={styles.compactInput} value={draft.reason} maxLength={2000} placeholder={reasonRequired(draft.decision) ? 'Reason required' : 'Optional note'} disabled={disabled} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, reason: event.target.value } }))}/></td>
              <td>{row.linked_purchase_order_id ? <a href={`/purchase-orders?purchase_order_id=${row.linked_purchase_order_id}`}>{row.linked_purchase_order_number || String(row.linked_purchase_order_id).slice(0, 8)} · {readable(row.linked_purchase_order_status)}</a> : 'Not created'}</td>
            </tr>;
          })}</tbody></table></div>}
          {actionablePurchaseRows.some((row) => !row.supplier_id) ? <p style={styles.warning}>A purchase line without a supplier cannot be accepted. Configure the product or supplier catalog, then generate a fresh planning run. Defer, reject, or mark the current line as already handled with a reason.</p> : null}
        </section>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}><div><h2 style={styles.sectionTitle}>Review and draft-creation gate</h2><p style={styles.muted}>Save decisions first. Draft creation then rechecks current stock, reservations, transfers, inbound supply, products, locations, suppliers, and package rules.</p></div><StatusBadge value={detail.run.status} /></div>
          <div style={styles.stats}>
            <Stat label="Unsaved changes" value={changedDecisions.length} hint="Must be saved before draft creation" />
            <Stat label="Pending decisions" value={pendingDecisionCount} hint="Every action line must be reviewed" />
            <Stat label="Accepted draft types" value={`${acceptedTransferDraftsRequired ? 'Transfer ' : ''}${acceptedPurchaseDraftsRequired ? 'Purchase' : ''}`.trim() || 'None'} hint="Only accepted or overridden positive quantities" />
            <Stat label="Run age" value={`${formatNumber(detail.run.materialization_guard?.run_age_hours ?? 0)}h`} hint={`Maximum ${detail.run.materialization_guard?.max_age_hours ?? 24}h`} />
          </div>
          {decisionIssues.length ? <div style={styles.error}><strong>Correct these decision entries:</strong><ul style={styles.list}>{decisionIssues.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
          <div style={styles.actions}>
            <button type="button" style={styles.primaryButton} disabled={!canGovern || changedDecisions.length === 0 || decisionMutation.isPending || runLocked || decisionIssues.length > 0} onClick={() => detail && decisionMutation.mutate({ runId: detail.run.id, expectedRunVersion: numberValue(detail.run.version), decisions: changedDecisions })}>{decisionMutation.isPending ? 'Saving…' : `Save ${changedDecisions.length} decision(s)`}</button>
            <button type="button" style={styles.dangerButton} disabled={!canMaterialize || materializeMutation.isPending} onClick={() => setConfirmation({ kind: 'materialize', title: 'Create governed draft records', message: 'Recheck live evidence and create draft Stock Transfers and/or draft Purchase Orders for accepted lines? This does not approve, submit, receive, or execute anything.' })}>{materializeMutation.isPending ? 'Revalidating…' : 'Revalidate and create accepted drafts'}</button>
          </div>
          {changedDecisions.length ? <p style={styles.warning}>Save or discard the unsaved decisions before creating drafts.</p> : null}
          {!allLinesReviewed ? <p style={styles.warning}>{pendingDecisionCount} planning line(s) still need a decision. Partial draft creation is intentionally blocked.</p> : null}
          {runAgeExpired ? <p style={styles.error}>This run is older than {detail.run.materialization_guard?.max_age_hours ?? 24} hours. Generate a fresh run before creating drafts.</p> : null}
          {missingMaterializationPermission ? <p style={styles.error}>Your role cannot create one or more accepted draft types. Stock Transfer create permission is required for accepted transfers, and Purchase Order create permission is required for accepted purchases.</p> : null}
          {acceptedPurchaseWithoutSupplier ? <p style={styles.error}>{acceptedPurchaseWithoutSupplier} accepted purchase line(s) do not have a supplier. Correct supplier configuration and generate a fresh run.</p> : null}
          {!acceptedTransferDraftsRequired && !acceptedPurchaseDraftsRequired && allLinesReviewed && !runLocked ? <p style={styles.infoText}>The review contains no accepted positive-quantity action. Nothing is available to convert into a draft.</p> : null}
        </section>

        {detail.run.status === 'materialized' ? <section style={styles.panel}>
          <div style={styles.sectionHeader}><div><h2 style={styles.sectionTitle}>Outcome tracking</h2><p style={styles.muted}>Read-only follow-up for records created from this run. Alert totals are counted distinctly across the run.</p></div><button type="button" style={styles.secondaryButton} disabled={outcomesQuery.isFetching} onClick={() => void outcomesQuery.refetch()}>{outcomesQuery.isFetching ? 'Refreshing…' : 'Refresh outcomes'}</button></div>
          {outcomesQuery.isLoading ? <p style={styles.empty}>Loading outcomes…</p> : outcomesQuery.data ? <>
            <div style={styles.stats}>
              <Stat label="Draft POs created" value={outcomesQuery.data.summary.purchase_orders_created} hint={`Received ${formatNumber(outcomesQuery.data.summary.received_quantity)} · average fulfilment ${Math.round(numberValue(outcomesQuery.data.summary.average_fulfilment_ratio) * 100)}%`} />
              <Stat label="Draft transfers created" value={outcomesQuery.data.summary.stock_transfers_created} hint={`${outcomesQuery.data.summary.transfer_executed_count} executed`} />
              <Stat label="Shortage scopes restored" value={outcomesQuery.data.summary.threshold_restored_count} hint="Only scopes that had a shortage when planned" />
              <Stat label="Distinct unresolved alerts" value={formatNumber(outcomesQuery.data.summary.post_run_unresolved_alert_count)} hint="Product alerts created after this run" />
            </div>
            <h3>Purchase and stock outcomes</h3>
            <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Product / location</th><th>PO status</th><th>Ordered</th><th>Received</th><th>Fulfilment</th><th>Current / minimum</th><th>Product alerts*</th></tr></thead><tbody>{outcomeActionRows.map((row) => <tr key={row.id}><td><strong>{row.product_name}</strong><br/><span style={styles.muted}>{row.storage_location_name}</span></td><td><StatusBadge value={row.purchase_order_status} /></td><td>{formatNumber(row.ordered_quantity)}</td><td>{formatNumber(row.received_quantity)}</td><td>{Math.round(numberValue(row.fulfilment_ratio) * 100)}%</td><td>{formatNumber(row.current_stock)} / {formatNumber(row.governed_min_quantity)}<br/><span style={styles.muted}>{row.threshold_restored ? 'Threshold currently met' : 'Below threshold'}</span></td><td>{formatNumber(row.post_run_unresolved_alert_count)}<br/><span style={styles.muted}>{formatDateTime(row.latest_post_run_alert_at)}</span></td></tr>)}</tbody></table></div>
            <p style={styles.muted}>* Per-row alert counts are product-level because alerts do not store a location. The summary card counts distinct alerts once across the run.</p>
            {outcomesQuery.data.transfers.length ? <><h3>Transfer outcomes</h3><div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Product</th><th>Route</th><th>Quantity</th><th>Status</th></tr></thead><tbody>{outcomesQuery.data.transfers.map((row) => <tr key={row.id}><td>{row.product_name}</td><td>{row.source_storage_location_name} → {row.destination_storage_location_name}</td><td>{formatNumber(row.final_quantity)}</td><td><StatusBadge value={row.stock_transfer_status} /></td></tr>)}</tbody></table></div></> : null}
          </> : <p style={styles.empty}>Outcome data is unavailable.</p>}
        </section> : null}
      </> : <section style={styles.panel}><p style={styles.empty}>{detailQuery.isLoading ? 'Loading planning run…' : runsQuery.isLoading ? 'Loading planning runs…' : 'Generate or select a planning run.'}</p></section>}

      {confirmation ? <div style={styles.modalBackdrop} role="presentation" onMouseDown={() => !materializeMutation.isPending && setConfirmation(null)}><section style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="replenishment-confirm-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="replenishment-confirm-title" style={styles.modalTitle}>{confirmation.title}</h2><p style={styles.modalText}>{confirmation.message}</p><div style={styles.actions}><button type="button" style={styles.secondaryButton} disabled={materializeMutation.isPending} onClick={() => setConfirmation(null)}>Cancel</button><button type="button" style={styles.dangerButton} disabled={materializeMutation.isPending || !detail} onClick={() => detail && materializeMutation.mutate({ runId: detail.run.id, expectedRunVersion: numberValue(detail.run.version) })}>{materializeMutation.isPending ? 'Working…' : 'Confirm draft creation'}</button></div></section></div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { padding: '24px', display: 'grid', gap: 16 },
  hero: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' },
  eyebrow: { fontSize: 12, fontWeight: 800, letterSpacing: 1.1, color: '#58708f' },
  title: { margin: '4px 0 6px', fontSize: 32 },
  subtitle: { margin: 0, maxWidth: 980, color: '#5f7189', lineHeight: 1.55 },
  panel: { background: '#fff', border: '1px solid #dbe3ef', borderRadius: 16, padding: 16, minWidth: 0 },
  toolbar: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' },
  field: { display: 'grid', gap: 6, fontWeight: 700, fontSize: 13 },
  input: { minWidth: 150, padding: '10px 12px', border: '1px solid #b8c4d5', borderRadius: 8, background: '#fff' },
  compactInput: { width: '100%', minWidth: 145, padding: '8px', border: '1px solid #b8c4d5', borderRadius: 7, background: '#fff' },
  qtyInput: { width: 105, padding: '8px', border: '1px solid #b8c4d5', borderRadius: 7 },
  primaryButton: { padding: '11px 16px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { padding: '10px 13px', border: '1px solid #b8c4d5', borderRadius: 8, background: '#fff', fontWeight: 700, cursor: 'pointer' },
  dangerButton: { padding: '11px 16px', border: 0, borderRadius: 8, background: '#8b3a17', color: '#fff', fontWeight: 800, cursor: 'pointer' },
  success: { padding: 12, borderRadius: 8, background: '#e9f8ef', border: '1px solid #9bd8b1', color: '#176b3a' },
  error: { padding: 12, borderRadius: 8, background: '#fff0f0', border: '1px solid #efaaaa', color: '#9b1c1c' },
  warning: { padding: 12, borderRadius: 8, background: '#fff8e6', border: '1px solid #e6c66a', color: '#795500' },
  infoText: { margin: '12px 0 0', padding: 12, borderRadius: 8, background: '#eef5ff', border: '1px solid #a8c7f0', color: '#244a77' },
  inlineError: { color: '#a51d1d', fontWeight: 700 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  stat: { padding: 14, border: '1px solid #dbe3ef', borderRadius: 12, background: '#fff', display: 'grid', gap: 5, minWidth: 0 },
  statLabel: { color: '#66788f', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 22, overflowWrap: 'anywhere' },
  muted: { color: '#66788f', fontSize: 12, lineHeight: 1.45 },
  countText: { color: '#58708f', fontSize: 13, fontWeight: 700 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 },
  detailLabel: { display: 'block', color: '#66788f', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', marginBottom: 12, flexWrap: 'wrap' },
  sectionTitle: { margin: 0, fontSize: 21 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  tableWrap: { overflowX: 'auto', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 },
  empty: { textAlign: 'center', color: '#66788f', padding: 24 },
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
