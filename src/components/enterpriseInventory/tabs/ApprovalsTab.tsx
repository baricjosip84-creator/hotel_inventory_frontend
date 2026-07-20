import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type { ApprovalRule, ApprovalRuleForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type ApprovalQueueItem = {
  entity_type: string;
  entity_id: string;
  label: string;
  detail?: string;
  status: string;
  created_at: string;
};

type CreateApprovalRuleMutation = {
  isPending: boolean;
  mutate: (input: ApprovalRuleForm) => void;
};

type ExecuteApprovalMutation = {
  isPending: boolean;
  mutate: (input: { entity_type: string; entity_id: string; action: 'approved' | 'rejected' }) => void;
};

type ApprovalRulesQuery = {
  isLoading: boolean;
  data?: ApprovalRule[];
};

type ApprovalsTabProps = {
  approvalQueue: ApprovalQueueItem[];
  approvalRuleForm: ApprovalRuleForm;
  approvalRulesQuery: ApprovalRulesQuery;
  createApprovalRuleMutation: CreateApprovalRuleMutation;
  executeApprovalMutation: ExecuteApprovalMutation;
  setApprovalRuleForm: Dispatch<SetStateAction<ApprovalRuleForm>>;
  storageLocations: StorageLocationOption[];
};

const entityTypeLabels: Record<string, string> = {
  purchase_order: 'Purchase order',
  supplier_invoice: 'Supplier invoice',
  department_requisition: 'Department requisition',
  cycle_count: 'Cycle count',
  shipment: 'Shipment'
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected'
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff'
};

const displayLabel = (value: string, labels: Record<string, string>) =>
  labels[value] ?? value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export function ApprovalsTab({
  approvalQueue,
  approvalRuleForm,
  approvalRulesQuery,
  createApprovalRuleMutation,
  executeApprovalMutation,
  setApprovalRuleForm,
  storageLocations
}: ApprovalsTabProps) {
  const minimumAmount = Number(approvalRuleForm.min_amount);
  const maximumAmount = approvalRuleForm.max_amount === '' ? null : Number(approvalRuleForm.max_amount);
  const amountRangeValid = Number.isFinite(minimumAmount)
    && minimumAmount >= 0
    && (maximumAmount === null || (Number.isFinite(maximumAmount) && maximumAmount >= minimumAmount));
  const canSaveRule = Boolean(approvalRuleForm.entity_type && approvalRuleForm.required_role && approvalRuleForm.min_amount !== '' && amountRangeValid)
    && !createApprovalRuleMutation.isPending;
  const storageLocationNames = new Map(storageLocations.map((location) => [location.id, location.name]));

  const handleApprovalRuleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSaveRule) return;
    createApprovalRuleMutation.mutate(approvalRuleForm);
  };

  const handleApprovalAction = (item: ApprovalQueueItem, action: 'approved' | 'rejected') => {
    const actionLabel = action === 'approved' ? 'Approve' : 'Reject';
    if (!window.confirm(`${actionLabel} ${item.label}?`)) return;
    executeApprovalMutation.mutate({ entity_type: item.entity_type, entity_id: item.entity_id, action });
  };

  return (
    <section style={styles.grid}>
      <form onSubmit={handleApprovalRuleSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Create approval rule</h2>
        <SelectField
          label="Entity type"
          value={approvalRuleForm.entity_type}
          onChange={(value) => setApprovalRuleForm((current) => ({ ...current, entity_type: value }))}
          options={[
            { value: 'purchase_order', label: 'Purchase order' },
            { value: 'supplier_invoice', label: 'Supplier invoice' },
            { value: 'department_requisition', label: 'Department requisition' },
            { value: 'cycle_count', label: 'Cycle count' },
            { value: 'shipment', label: 'Shipment' }
          ]}
          required
        />
        <InputField label="Department" value={approvalRuleForm.department} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, department: value }))} />
        <SelectField label="Storage location" value={approvalRuleForm.storage_location_id} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} />
        <InputField label="Minimum amount" type="number" min="0" value={approvalRuleForm.min_amount} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, min_amount: value }))} required />
        <InputField label="Maximum amount" type="number" min="0" value={approvalRuleForm.max_amount} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, max_amount: value }))} />
        <SelectField
          label="Required role"
          value={approvalRuleForm.required_role}
          onChange={(value) => setApprovalRuleForm((current) => ({ ...current, required_role: value }))}
          options={[
            { value: 'manager', label: 'Manager' },
            { value: 'admin', label: 'Admin' }
          ]}
          required
        />
        {!amountRangeValid ? <p style={styles.helper}>Maximum amount must be greater than or equal to minimum amount.</p> : null}
        <button type="submit" disabled={!canSaveRule} style={canSaveRule ? styles.primaryButton : styles.disabledButton}>
          {createApprovalRuleMutation.isPending ? 'Saving…' : 'Save approval rule'}
        </button>
      </form>

      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Approval queue</h2>
          {approvalQueue.length ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Entity</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalQueue.map((item) => (
                    <tr key={`${item.entity_type}-${item.entity_id}`}>
                      <td style={styles.td}>
                        <strong>{item.label}</strong>
                        {item.detail ? <div style={styles.helper}>{item.detail}</div> : null}
                      </td>
                      <td style={styles.td}>{displayLabel(item.status, statusLabels)}</td>
                      <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            type="button"
                            data-skip-global-action-feedback="true"
                            style={styles.smallButton}
                            disabled={executeApprovalMutation.isPending}
                            onClick={() => handleApprovalAction(item, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            data-skip-global-action-feedback="true"
                            style={styles.dangerButton}
                            disabled={executeApprovalMutation.isPending}
                            onClick={() => handleApprovalAction(item, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={styles.helper}>No items currently waiting for approval.</p>}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Approval rules</h2>
          <DataTable
            loading={approvalRulesQuery.isLoading}
            empty="No approval rules configured yet."
            headers={['Entity', 'Department', 'Location', 'Min amount', 'Max amount', 'Required role', 'Active']}
            rows={(approvalRulesQuery.data ?? []).map((item) => [
              displayLabel(item.entity_type, entityTypeLabels),
              item.department || '-',
              item.storage_location_id ? storageLocationNames.get(item.storage_location_id) || 'Unknown location' : 'All locations',
              formatNumber(item.min_amount),
              item.max_amount === null || item.max_amount === undefined ? 'No maximum' : formatNumber(item.max_amount),
              displayLabel(item.required_role, roleLabels),
              item.active ? 'Yes' : 'No'
            ])}
          />
        </section>
      </div>
    </section>
  );
}
