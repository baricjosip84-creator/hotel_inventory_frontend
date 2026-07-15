import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

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
  created_at: string;
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

type PlanItem = {
  id: string;
  version: number | string;
  product_id: string;
  product_name: string;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name: string;
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
  linked_purchase_order_id?: string | null;
  linked_purchase_order_number?: string | null;
  linked_purchase_order_status?: string | null;
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

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const fmt = (value: unknown): string => num(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
const dateTime = (value?: string | null): string => value ? new Date(value).toLocaleString() : '-';
const errorMessage = (error: unknown): string => error instanceof ApiError || error instanceof Error ? error.message : 'Request failed';

async function listRuns(): Promise<PlanningRunListItem[]> {
  return apiRequest<PlanningRunListItem[]>('/replenishment-planning?limit=50');
}
async function getRun(id: string): Promise<PlanningRunDetail> {
  return apiRequest<PlanningRunDetail>(`/replenishment-planning/${id}`);
}
async function createRun(input: { target_coverage_days: number }): Promise<PlanningRunDetail> {
  return apiRequest<PlanningRunDetail>('/replenishment-planning', { method: 'POST', body: JSON.stringify(input) });
}
type DecisionMutationInput = {
  runId: string;
  expectedRunVersion: number;
  decisions: Array<{
    kind: 'purchase' | 'transfer';
    id: string;
    expected_version: number;
    decision: Decision;
    quantity?: number;
    reason?: string | null;
  }>;
};

type MaterializationResponse = {
  run: PlanningRunDetail;
  created_stock_transfers: unknown[];
  created_purchase_orders: unknown[];
  idempotent_replay?: boolean;
  validation?: {
    validated_at: string;
    run_age_hours: number | string;
    checked_scope_count: number;
    checked_transfer_count: number;
    checked_purchase_count: number;
  };
};

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
  return <div style={styles.stat}><span style={styles.muted}>{label}</span><strong style={styles.statValue}>{value}</strong><span style={styles.muted}>{hint}</span></div>;
}

export default function ReplenishmentPlanningPage() {
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const [selectedRunId, setSelectedRunId] = useState('');
  const [coverageDays, setCoverageDays] = useState(14);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, DraftDecision>>({});

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
      setMessage('Location-aware replenishment planning run created. No stock or supplier order was changed.');
      setError('');
      setSelectedRunId(data.run.id);
      await queryClient.invalidateQueries({ queryKey: ['location-replenishment-runs'] });
      queryClient.setQueryData(['location-replenishment-run', data.run.id], data);
    },
    onError: (e) => setError(errorMessage(e))
  });
  const decisionMutation = useMutation({
    mutationFn: saveDecisions,
    onSuccess: async (data) => {
      setMessage('Planning decisions saved. No transfer or purchase order was created.');
      setError('');
      setDrafts({});
      queryClient.setQueryData(['location-replenishment-run', data.run.id], data);
      await queryClient.invalidateQueries({ queryKey: ['location-replenishment-runs'] });
    },
    onError: async (e) => {
      setError(errorMessage(e));
      if (effectiveRunId) await queryClient.invalidateQueries({ queryKey: ['location-replenishment-run', effectiveRunId] });
    }
  });
  const materializeMutation = useMutation({
    mutationFn: materializeRun,
    onSuccess: async (data) => {
      const transferCount = data.created_stock_transfers.length;
      const poCount = data.created_purchase_orders.length;
      setMessage(data.idempotent_replay
        ? `This run was already materialized. Found ${transferCount} linked draft Stock Transfer(s) and ${poCount} linked draft Purchase Order(s).`
        : `Live evidence was revalidated. Created ${transferCount} draft Stock Transfer(s) and ${poCount} draft Purchase Order(s). Nothing was executed or approved.`);
      setError('');
      setDrafts({});
      queryClient.setQueryData(['location-replenishment-run', data.run.run.id], data.run);
      await queryClient.invalidateQueries({ queryKey: ['location-replenishment-runs'] });
      await queryClient.invalidateQueries({ queryKey: ['location-replenishment-outcomes', data.run.run.id] });
    },
    onError: async (e) => {
      setError(errorMessage(e));
      if (effectiveRunId) await queryClient.invalidateQueries({ queryKey: ['location-replenishment-run', effectiveRunId] });
    }
  });

  const detail = detailQuery.data;
  const summary = detail?.run.summary ?? {};
  const canGenerate = capabilities.canCreateInventoryOptimization ?? capabilities.canGovernInventoryOptimization;
  const canGovern = capabilities.canGovernInventoryOptimization;
  const canCreateTransfers = capabilities.canCreateStockTransfers;
  const canCreatePurchaseOrders = capabilities.canCreatePurchaseOrders;
  const acceptedTransferDraftsRequired = Boolean(detail?.transfers.some((row) => ['accepted', 'overridden'].includes(row.decision_status) && num(row.final_quantity) > 0 && !row.linked_stock_transfer_id));
  const acceptedPurchaseDraftsRequired = Boolean(detail?.items.some((row) => ['accepted', 'overridden'].includes(row.decision_status) && num(row.final_purchase_quantity) > 0 && !row.linked_purchase_order_id));
  const missingMaterializationPermission = (acceptedTransferDraftsRequired && !canCreateTransfers) || (acceptedPurchaseDraftsRequired && !canCreatePurchaseOrders);

  const runLocked = detail?.run.status === 'materialized' || detail?.run.status === 'cancelled';
  const pendingDecisionCount = detail?.run.materialization_guard?.pending_decision_count
    ?? ((detail?.items.filter((row) => row.decision_status === 'pending').length ?? 0)
      + (detail?.transfers.filter((row) => row.decision_status === 'pending').length ?? 0));
  const runAgeExpired = Boolean(detail?.run.materialization_guard?.age_expired);
  const allLinesReviewed = pendingDecisionCount === 0;

  const setAll = (kind: 'purchase' | 'transfer', decision: Decision) => {
    const rows = kind === 'purchase' ? detail?.items ?? [] : detail?.transfers ?? [];
    setDrafts((current) => {
      const next = { ...current };
      for (const row of rows) {
        const linked = kind === 'purchase'
          ? Boolean((row as PlanItem).linked_purchase_order_id)
          : Boolean((row as PlanTransfer).linked_stock_transfer_id);
        if (linked || runLocked) continue;
        const quantity = kind === 'purchase' ? (row as PlanItem).recommended_purchase_quantity : (row as PlanTransfer).recommended_quantity;
        next[`${kind}:${row.id}`] = { decision, quantity: String(quantity), reason: '' };
      }
      return next;
    });
  };

  const changedDecisions = useMemo(() => {
    if (!detail) return [];
    const result: DecisionMutationInput['decisions'] = [];
    for (const item of detail.items) {
      const draft = drafts[`purchase:${item.id}`];
      if (!draft || draft.decision === 'pending') continue;
      const baseQuantity = String(item.override_purchase_quantity ?? item.final_purchase_quantity ?? item.recommended_purchase_quantity);
      const unchanged = draft.decision === item.decision_status
        && draft.reason.trim() === (item.decision_reason ?? '').trim()
        && (draft.decision !== 'overridden' || num(draft.quantity) === num(baseQuantity));
      if (unchanged) continue;
      result.push({ kind: 'purchase', id: item.id, expected_version: num(item.version), decision: draft.decision, quantity: draft.decision === 'overridden' ? num(draft.quantity) : undefined, reason: draft.reason.trim() || null });
    }
    for (const transfer of detail.transfers) {
      const draft = drafts[`transfer:${transfer.id}`];
      if (!draft || draft.decision === 'pending') continue;
      const baseQuantity = String(transfer.override_quantity ?? transfer.final_quantity ?? transfer.recommended_quantity);
      const unchanged = draft.decision === transfer.decision_status
        && draft.reason.trim() === (transfer.decision_reason ?? '').trim()
        && (draft.decision !== 'overridden' || num(draft.quantity) === num(baseQuantity));
      if (unchanged) continue;
      result.push({ kind: 'transfer', id: transfer.id, expected_version: num(transfer.version), decision: draft.decision, quantity: draft.decision === 'overridden' ? num(draft.quantity) : undefined, reason: draft.reason.trim() || null });
    }
    return result;
  }, [detail, drafts]);

  return (
    <div style={styles.page}>
      <div>
        <div style={styles.eyebrow}>PROCUREMENT / TRANSFER BEFORE BUY</div>
        <h1 style={styles.title}>Location Replenishment Planning</h1>
        <p style={styles.subtitle}>Calculates location shortages, uses protected internal surplus first, and recommends supplier purchases only for the remaining gap. The plan never moves stock or places orders automatically.</p>
      </div>

      {message ? <div style={styles.success}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.panel}>
        <div style={styles.toolbar}>
          <label style={styles.field}>Target coverage days<input style={styles.input} type="number" min={1} max={90} value={coverageDays} onChange={(e) => setCoverageDays(Number(e.target.value))} /></label>
          <button style={styles.primaryButton} disabled={!canGenerate || createMutation.isPending} onClick={() => createMutation.mutate({ target_coverage_days: coverageDays })}>{createMutation.isPending ? 'Generating…' : 'Generate stable planning run'}</button>
          <label style={{ ...styles.field, minWidth: 280 }}>Planning run<select style={styles.input} value={effectiveRunId} onChange={(e) => { setSelectedRunId(e.target.value); setDrafts({}); }}><option value="">Select a run</option>{runsQuery.data?.map((run) => <option key={run.id} value={run.id}>{dateTime(run.created_at)} · {run.status} · {String(run.id).slice(0, 8)}</option>)}</select></label>
        </div>
      </section>

      {detail ? <>
        <div style={styles.stats}>
          <Stat label="Run status" value={detail.run.status} hint={`Formula ${detail.run.formula_version}`} />
          <Stat label="Location lines" value={String(summary.location_line_count ?? detail.items.length)} hint={`${summary.product_count ?? 0} products`} />
          <Stat label="Internal transfers" value={String(summary.transfer_recommendation_count ?? detail.transfers.length)} hint={`${fmt(summary.transfer_recommended_quantity)} units`} />
          <Stat label="Supplier purchases" value={String(summary.purchase_recommendation_count ?? 0)} hint={`${fmt(summary.purchase_recommended_quantity)} units`} />
          <Stat label="Review readiness" value={allLinesReviewed ? 'Complete' : `${pendingDecisionCount} pending`} hint={`Run age ${fmt(detail.run.materialization_guard?.run_age_hours ?? 0)}h · version ${detail.run.version ?? '-'}`} />
        </div>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}><div><h2 style={styles.sectionTitle}>Transfer before buy</h2><p style={styles.muted}>A source location is never planned below its protected target. Accepted lines create draft Stock Transfers only.</p></div><div style={styles.actions}><button style={styles.secondaryButton} disabled={runLocked} onClick={() => setAll('transfer', 'accepted')}>Accept all transfers</button><button style={styles.secondaryButton} disabled={runLocked} onClick={() => setAll('transfer', 'deferred')}>Defer all</button></div></div>
          {detail.transfers.length === 0 ? <p style={styles.empty}>No protected internal surplus can cover another location’s shortage.</p> : <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Product</th><th>From → To</th><th>Recommended</th><th>Protected evidence</th><th>Decision</th><th>Final qty</th><th>Reason</th><th>Draft transfer</th></tr></thead><tbody>{detail.transfers.map((row) => {
            const key = `transfer:${row.id}`; const draft = drafts[key] ?? { decision: row.decision_status, quantity: String(row.final_quantity), reason: row.decision_reason ?? '' };
            return <tr key={row.id}><td><strong>{row.product_name}</strong><br/><span style={styles.muted}>{row.product_unit}</span></td><td>{row.source_storage_location_name}<br/>→ {row.destination_storage_location_name}</td><td>{fmt(row.recommended_quantity)}</td><td>Surplus {fmt(row.source_surplus_before)}<br/>Shortage {fmt(row.destination_shortage_before)}</td><td><select style={styles.compactInput} value={draft.decision} disabled={!canGovern || runLocked || Boolean(row.linked_stock_transfer_id)} onChange={(e) => setDrafts((d) => ({ ...d, [key]: { ...draft, decision: e.target.value as Decision } }))}>{DECISIONS.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></td><td><input style={styles.qtyInput} type="number" min={0} value={draft.quantity} disabled={draft.decision !== 'overridden' || !canGovern || runLocked || Boolean(row.linked_stock_transfer_id)} onChange={(e) => setDrafts((d) => ({ ...d, [key]: { ...draft, quantity: e.target.value } }))}/></td><td><input style={styles.compactInput} value={draft.reason} disabled={!canGovern || runLocked || Boolean(row.linked_stock_transfer_id)} onChange={(e) => setDrafts((d) => ({ ...d, [key]: { ...draft, reason: e.target.value } }))}/></td><td>{row.linked_stock_transfer_id ? <a href={`/stock-transfers?transfer_id=${row.linked_stock_transfer_id}`}>{String(row.linked_stock_transfer_id).slice(0,8)} · {row.linked_stock_transfer_status}</a> : '-'}</td></tr>;
          })}</tbody></table></div>}
        </section>

        <section style={styles.panel}>
          <div style={styles.sectionHeader}><div><h2 style={styles.sectionTitle}>Remaining supplier purchases</h2><p style={styles.muted}>Purchase quantity is calculated after accepted internal transfer coverage, then rounded to supplier MOQ and package rules.</p></div><div style={styles.actions}><button style={styles.secondaryButton} disabled={runLocked} onClick={() => setAll('purchase', 'accepted')}>Accept all purchases</button><button style={styles.secondaryButton} disabled={runLocked} onClick={() => setAll('purchase', 'deferred')}>Defer all</button></div></div>
          <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Product / location</th><th>Position</th><th>Target</th><th>Transfer cover</th><th>Remaining gap</th><th>Recommended order</th><th>Supplier</th><th>Decision</th><th>Final qty</th><th>Reason</th><th>Draft PO</th></tr></thead><tbody>{detail.items.filter((row) => num(row.shortage_before_transfer) > 0 || num(row.recommended_purchase_quantity) > 0).map((row) => {
            const key = `purchase:${row.id}`; const draft = drafts[key] ?? { decision: row.decision_status, quantity: String(row.final_purchase_quantity), reason: row.decision_reason ?? '' };
            return <tr key={row.id}><td><strong>{row.product_name}</strong><br/><span style={styles.muted}>{row.storage_location_name}</span></td><td>{fmt(row.usable_inventory_position)}<br/><span style={styles.muted}>stock {fmt(row.current_stock)} · reserved {fmt(row.reserved_quantity)}</span></td><td>{fmt(row.configured_target_quantity)}<br/><span style={styles.muted}>governed min {fmt(row.governed_min_quantity)}</span></td><td>{fmt(row.transfer_covered_quantity)}</td><td>{fmt(row.remaining_purchase_requirement)}</td><td><strong>{fmt(row.recommended_purchase_quantity)}</strong><br/><span style={styles.muted}>cost {row.estimated_purchase_cost == null ? '-' : fmt(row.estimated_purchase_cost)}</span></td><td>{row.supplier_name ?? 'Missing supplier'}</td><td><select style={styles.compactInput} value={draft.decision} disabled={!canGovern || runLocked || Boolean(row.linked_purchase_order_id)} onChange={(e) => setDrafts((d) => ({ ...d, [key]: { ...draft, decision: e.target.value as Decision } }))}>{DECISIONS.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></td><td><input style={styles.qtyInput} type="number" min={0} value={draft.quantity} disabled={draft.decision !== 'overridden' || !canGovern || runLocked || Boolean(row.linked_purchase_order_id)} onChange={(e) => setDrafts((d) => ({ ...d, [key]: { ...draft, quantity: e.target.value } }))}/></td><td><input style={styles.compactInput} value={draft.reason} disabled={!canGovern || runLocked || Boolean(row.linked_purchase_order_id)} onChange={(e) => setDrafts((d) => ({ ...d, [key]: { ...draft, reason: e.target.value } }))}/></td><td>{row.linked_purchase_order_id ? <a href={`/purchase-orders?purchase_order_id=${row.linked_purchase_order_id}`}>{row.linked_purchase_order_number ?? String(row.linked_purchase_order_id).slice(0,8)} · {row.linked_purchase_order_status}</a> : '-'}</td></tr>;
          })}</tbody></table></div>
        </section>

        <section style={styles.panel}>
          <div style={styles.actions}>
            <button
              style={styles.primaryButton}
              disabled={!canGovern || changedDecisions.length === 0 || decisionMutation.isPending || runLocked}
              onClick={() => decisionMutation.mutate({ runId: detail.run.id, expectedRunVersion: num(detail.run.version), decisions: changedDecisions })}
            >
              {decisionMutation.isPending ? 'Saving…' : `Save ${changedDecisions.length} decision(s)`}
            </button>
            <button
              style={styles.dangerButton}
              disabled={!canGovern || missingMaterializationPermission || materializeMutation.isPending || runLocked || !allLinesReviewed || runAgeExpired}
              onClick={() => materializeMutation.mutate({ runId: detail.run.id, expectedRunVersion: num(detail.run.version) })}
            >
              {materializeMutation.isPending ? 'Revalidating and creating drafts…' : 'Revalidate live evidence and create accepted drafts'}
            </button>
          </div>
          <p style={styles.muted}>Every visible action line must be reviewed first. Immediately before draft creation, the backend reloads stock, reservations, transfers, inbound supply, supplier rules, product versions, and location settings. Any change blocks materialization and requires a new planning run.</p>
          {!allLinesReviewed ? <p style={styles.warning}>{pendingDecisionCount} planning line(s) still need a decision. Partial materialization is intentionally blocked.</p> : null}
          {runAgeExpired ? <p style={styles.error}>This run is older than {detail.run.materialization_guard?.max_age_hours ?? 24} hours. Generate a fresh run before creating drafts.</p> : null}
          {missingMaterializationPermission ? <p style={styles.error}>Your role lacks permission to create one or more accepted draft records. Stock Transfer creation is required for accepted transfers, and Purchase Order creation is required for accepted purchases.</p> : null}
        </section>

        {outcomesQuery.data ? <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Outcome tracking</h2>
          <div style={styles.stats}><Stat label="Draft POs created" value={outcomesQuery.data.summary.purchase_orders_created} hint={`Received ${fmt(outcomesQuery.data.summary.received_quantity)} · avg fulfilment ${Math.round(num(outcomesQuery.data.summary.average_fulfilment_ratio) * 100)}%`} /><Stat label="Draft transfers created" value={outcomesQuery.data.summary.stock_transfers_created} hint={`${outcomesQuery.data.summary.transfer_executed_count} executed`} /><Stat label="Threshold restored" value={outcomesQuery.data.summary.threshold_restored_count} hint="Current stock at or above governed minimum" /><Stat label="New unresolved alerts" value={fmt(outcomesQuery.data.summary.post_run_unresolved_alert_count)} hint="Product alerts created after this planning run" /></div>
          <h3>Purchase and stock outcomes</h3>
          <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Product / location</th><th>PO status</th><th>Ordered</th><th>Received</th><th>Fulfilment</th><th>Current / minimum</th><th>New alerts</th></tr></thead><tbody>{outcomesQuery.data.items.map((row) => <tr key={row.id}><td><strong>{row.product_name}</strong><br/><span style={styles.muted}>{row.storage_location_name}</span></td><td>{row.purchase_order_status ?? '-'}</td><td>{fmt(row.ordered_quantity)}</td><td>{fmt(row.received_quantity)}</td><td>{Math.round(num(row.fulfilment_ratio) * 100)}%</td><td>{fmt(row.current_stock)} / {fmt(row.governed_min_quantity)}<br/><span style={styles.muted}>{row.threshold_restored ? 'threshold restored' : 'below threshold'}</span></td><td>{fmt(row.post_run_unresolved_alert_count)}<br/><span style={styles.muted}>{dateTime(row.latest_post_run_alert_at)}</span></td></tr>)}</tbody></table></div>
          {outcomesQuery.data.transfers.length ? <><h3>Transfer outcomes</h3><div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Product</th><th>Route</th><th>Quantity</th><th>Status</th></tr></thead><tbody>{outcomesQuery.data.transfers.map((row) => <tr key={row.id}><td>{row.product_name}</td><td>{row.source_storage_location_name} → {row.destination_storage_location_name}</td><td>{fmt(row.final_quantity)}</td><td>{row.stock_transfer_status ?? '-'}</td></tr>)}</tbody></table></div></> : null}
        </section> : null}
      </> : <section style={styles.panel}><p style={styles.empty}>{detailQuery.isLoading ? 'Loading planning run…' : 'Generate or select a planning run.'}</p></section>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { padding: '24px', display: 'grid', gap: 16 }, eyebrow: { fontSize: 12, fontWeight: 800, letterSpacing: 1.1, color: '#58708f' }, title: { margin: '4px 0 6px', fontSize: 32 }, subtitle: { margin: 0, maxWidth: 950, color: '#5f7189', lineHeight: 1.55 },
  panel: { background: '#fff', border: '1px solid #dbe3ef', borderRadius: 16, padding: 16 }, toolbar: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }, field: { display: 'grid', gap: 6, fontWeight: 700, fontSize: 13 }, input: { minWidth: 150, padding: '10px 12px', border: '1px solid #b8c4d5', borderRadius: 8, background: '#fff' }, compactInput: { width: '100%', minWidth: 125, padding: '7px 8px', border: '1px solid #b8c4d5', borderRadius: 6 }, qtyInput: { width: 82, padding: '7px 8px', border: '1px solid #b8c4d5', borderRadius: 6 },
  primaryButton: { padding: '11px 16px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 800, cursor: 'pointer' }, secondaryButton: { padding: '9px 12px', border: '1px solid #b8c4d5', borderRadius: 8, background: '#f7f9fc', fontWeight: 700, cursor: 'pointer' }, dangerButton: { padding: '11px 16px', border: 0, borderRadius: 8, background: '#8b3a17', color: '#fff', fontWeight: 800, cursor: 'pointer' },
  success: { padding: 12, borderRadius: 8, background: '#e9f8ef', border: '1px solid #9bd8b1', color: '#176b3a' }, error: { padding: 12, borderRadius: 8, background: '#fff0f0', border: '1px solid #efaaaa', color: '#9b1c1c' }, warning: { padding: 12, borderRadius: 8, background: '#fff8e6', border: '1px solid #e6c66a', color: '#795500' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }, stat: { padding: 14, border: '1px solid #dbe3ef', borderRadius: 12, background: '#fff', display: 'grid', gap: 5 }, statValue: { fontSize: 22 }, muted: { color: '#66788f', fontSize: 12 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', marginBottom: 12 }, sectionTitle: { margin: 0, fontSize: 21 }, actions: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, tableWrap: { overflowX: 'auto' }, table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, empty: { textAlign: 'center', color: '#66788f', padding: 24 }
};
