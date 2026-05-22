import type { Dispatch, SetStateAction } from 'react';
import { DataTable, MetricCard, SelectField, styles } from '../EnterpriseInventoryShared';
import { emptyExecutionFilters } from '../EnterpriseInventoryForms';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type { ExecutionAdapter, ExecutionFilters, ExecutionHardeningSummary, ExecutionRequest, ExecutionRequestsResponse } from '../EnterpriseInventoryTypes';

type SystemStatusResponse = {
  status?: string;
  write_lock?: boolean;
  maintenance_mode?: boolean;
};

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
};

type ExecutionMutation<TInput> = {
  mutate: (input: TInput) => void;
};

type ExecutionAction = 'submit' | 'approve' | 'reject' | 'execute' | 'noop' | 'cancel';

type ExecutionTabProps = {
  systemStatusQuery: QueryState<SystemStatusResponse>;
  executionRequestsQuery: QueryState<ExecutionRequestsResponse>;
  executionAdaptersQuery: QueryState<unknown>;
  executionHardeningQuery: QueryState<ExecutionHardeningSummary>;
  executionRequests: ExecutionRequest[];
  executionAdapters: ExecutionAdapter[];
  executionFilters: ExecutionFilters;
  setExecutionFilters: Dispatch<SetStateAction<ExecutionFilters>>;
  submitExecutionRequestMutation: ExecutionMutation<{ id: string; note?: string }>;
  approveExecutionRequestMutation: ExecutionMutation<{ id: string; review_note?: string }>;
  rejectExecutionRequestMutation: ExecutionMutation<{ id: string; rejection_reason: string }>;
  executeExecutionRequestMutation: ExecutionMutation<{ id: string; note?: string }>;
  executeNoopExecutionRequestMutation: ExecutionMutation<{ id: string; note?: string }>;
  cancelExecutionRequestMutation: ExecutionMutation<{ id: string; cancel_reason: string }>;
};

export function ExecutionTab({
  systemStatusQuery,
  executionRequestsQuery,
  executionAdaptersQuery,
  executionHardeningQuery,
  executionRequests,
  executionAdapters,
  executionFilters,
  setExecutionFilters,
  submitExecutionRequestMutation,
  approveExecutionRequestMutation,
  rejectExecutionRequestMutation,
  executeExecutionRequestMutation,
  executeNoopExecutionRequestMutation,
  cancelExecutionRequestMutation
}: ExecutionTabProps) {
  const handleExecutionAction = (request: ExecutionRequest, action: ExecutionAction) => {
    if (action === 'submit') {
      const note = window.prompt('Submit note (optional)', '') || '';
      submitExecutionRequestMutation.mutate({ id: request.id, note });
      return;
    }
    if (action === 'approve') {
      const review_note = window.prompt('Review note (optional)', '') || '';
      approveExecutionRequestMutation.mutate({ id: request.id, review_note });
      return;
    }
    if (action === 'reject') {
      const rejection_reason = window.prompt('Rejection reason') || '';
      if (rejection_reason.trim().length >= 3) rejectExecutionRequestMutation.mutate({ id: request.id, rejection_reason });
      return;
    }
    if (action === 'execute') {
      const note = window.prompt('Execution note (optional)', '') || '';
      executeExecutionRequestMutation.mutate({ id: request.id, note });
      return;
    }
    if (action === 'noop') {
      const note = window.prompt('No-op execution note (optional)', '') || '';
      executeNoopExecutionRequestMutation.mutate({ id: request.id, note });
      return;
    }
    const cancel_reason = window.prompt('Cancel reason') || '';
    if (cancel_reason.trim().length >= 3) cancelExecutionRequestMutation.mutate({ id: request.id, cancel_reason });
  };

  return (
    <section style={styles.stack}>
      <div style={styles.metricsGrid}>
        <MetricCard label="System status" value={String(systemStatusQuery.data?.status || 'unknown')} helper={`Write lock: ${String(systemStatusQuery.data?.write_lock ?? false)}`} />
        <MetricCard label="Execution requests" value={formatNumber(executionRequestsQuery.data?.total)} helper="Filtered request total" />
        <MetricCard label="Adapters" value={formatNumber(executionAdapters.length)} helper="Registered execution adapters" />
        <MetricCard label="Maintenance" value={String(systemStatusQuery.data?.maintenance_mode ?? false)} helper="Tenant operational mode" />
      </div>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Execution controls</h2>
        <div style={styles.formGrid}>
          <SelectField
            label="Status"
            value={executionFilters.status}
            onChange={(value) => setExecutionFilters((current) => ({ ...current, status: value }))}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'pending_review', label: 'Pending review' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
          />
          <SelectField
            label="Request type"
            value={executionFilters.request_type}
            onChange={(value) => setExecutionFilters((current) => ({ ...current, request_type: value }))}
            options={[
              { value: '', label: 'All types' },
              { value: 'cost_review', label: 'Cost review' },
              { value: 'cost_standard_update', label: 'Cost standard update' },
              { value: 'product_min_stock_update', label: 'Product min stock update' },
              { value: 'product_pricing_update', label: 'Product pricing update' },
              { value: 'supplier_review', label: 'Supplier review' },
              { value: 'inventory_review', label: 'Inventory review' },
              { value: 'system_recommendation', label: 'System recommendation' }
            ]}
          />
          <label style={styles.field}>
            Search
            <input
              value={executionFilters.search}
              onChange={(event) => setExecutionFilters((current) => ({ ...current, search: event.target.value }))}
              style={styles.input}
              placeholder="Search payload, status, type"
            />
          </label>
          <button type="button" style={styles.secondaryButton} onClick={() => setExecutionFilters(emptyExecutionFilters)}>
            Reset filters
          </button>
        </div>
      </section>

      <DataTable
        loading={executionRequestsQuery.isLoading}
        empty="No execution requests found."
        headers={['Type', 'Status', 'Execution', 'Requested by', 'Updated', 'Payload', 'Actions']}
        rows={executionRequests.map((request) => [
          request.request_type,
          request.status,
          request.execution_status || '-',
          request.requested_by_name || '-',
          formatDateTime(request.updated_at || request.created_at),
          JSON.stringify(request.payload || {}).slice(0, 120),
          [
            request.status === 'draft' ? 'Submit' : null,
            request.status === 'pending_review' ? 'Approve / reject' : null,
            request.status === 'approved' && !request.execution_status ? 'Execute / no-op' : null,
            ['draft', 'pending_review', 'approved'].includes(request.status) ? 'Cancel' : null
          ].filter(Boolean).join(', ') || '-'
        ])}
      />

      <div style={styles.cardGrid}>
        {executionRequests.slice(0, 12).map((request) => (
          <article key={request.id} style={styles.card}>
            <h3 style={styles.cardTitle}>{request.request_type}</h3>
            <p style={styles.muted}>{request.id}</p>
            <p>Status: <strong>{request.status}</strong></p>
            <p>Execution: <strong>{request.execution_status || 'not executed'}</strong></p>
            <div style={styles.actions}>
              {request.status === 'draft' ? <button type="button" style={styles.secondaryButton} onClick={() => handleExecutionAction(request, 'submit')}>Submit</button> : null}
              {request.status === 'pending_review' ? <button type="button" style={styles.secondaryButton} onClick={() => handleExecutionAction(request, 'approve')}>Approve</button> : null}
              {request.status === 'pending_review' ? <button type="button" style={styles.dangerButton} onClick={() => handleExecutionAction(request, 'reject')}>Reject</button> : null}
              {request.status === 'approved' && !request.execution_status ? <button type="button" style={styles.primaryButton} onClick={() => handleExecutionAction(request, 'execute')}>Execute</button> : null}
              {request.status === 'approved' && !request.execution_status ? <button type="button" style={styles.secondaryButton} onClick={() => handleExecutionAction(request, 'noop')}>No-op</button> : null}
              {['draft', 'pending_review', 'approved'].includes(request.status) ? <button type="button" style={styles.dangerButton} onClick={() => handleExecutionAction(request, 'cancel')}>Cancel</button> : null}
            </div>
          </article>
        ))}
      </div>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Adapter registry</h2>
        <DataTable
          loading={executionAdaptersQuery.isLoading}
          empty="No execution adapters returned."
          headers={['Type', 'Label', 'Execution enabled', 'Risk']}
          rows={executionAdapters.map((adapter) => [
            adapter.request_type || adapter.type || '-',
            adapter.label || adapter.description || '-',
            String(adapter.execution_enabled ?? false),
            adapter.risk_level || '-'
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Hardening summary</h2>
        <pre style={styles.pre}>{JSON.stringify(executionHardeningQuery.data || {}, null, 2)}</pre>
      </section>
    </section>
  );
}
