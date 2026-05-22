import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type { ApprovalRule, ApprovalRuleForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type ApprovalQueueItem = {
  entity_type: string;
  entity_id: string;
  label: string;
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

export function ApprovalsTab({
  approvalQueue,
  approvalRuleForm,
  approvalRulesQuery,
  createApprovalRuleMutation,
  executeApprovalMutation,
  setApprovalRuleForm,
  storageLocations
}: ApprovalsTabProps) {
  const handleApprovalRuleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createApprovalRuleMutation.mutate(approvalRuleForm);
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
        <InputField label="Minimum amount" type="number" value={approvalRuleForm.min_amount} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, min_amount: value }))} required />
        <InputField label="Maximum amount" type="number" value={approvalRuleForm.max_amount} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, max_amount: value }))} />
        <InputField label="Required role" value={approvalRuleForm.required_role} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, required_role: value }))} required />
        <button type="submit" disabled={createApprovalRuleMutation.isPending} style={styles.primaryButton}>Save approval rule</button>
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
                      <td style={styles.td}>{item.label}</td>
                      <td style={styles.td}>{item.status}</td>
                      <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            type="button"
                            style={styles.smallButton}
                            disabled={executeApprovalMutation.isPending}
                            onClick={() => executeApprovalMutation.mutate({ entity_type: item.entity_type, entity_id: item.entity_id, action: 'approved' })}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            style={styles.dangerButton}
                            disabled={executeApprovalMutation.isPending}
                            onClick={() => executeApprovalMutation.mutate({ entity_type: item.entity_type, entity_id: item.entity_id, action: 'rejected' })}
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
          <DataTable loading={approvalRulesQuery.isLoading} empty="No approval rules configured yet." headers={['Entity', 'Department', 'Min amount', 'Max amount', 'Required role', 'Active']} rows={(approvalRulesQuery.data ?? []).map((item) => [item.entity_type, item.department || '-', formatNumber(item.min_amount), item.max_amount ? formatNumber(item.max_amount) : '-', item.required_role, item.active ? 'Yes' : 'No'])} />
        </section>
      </div>
    </section>
  );
}
