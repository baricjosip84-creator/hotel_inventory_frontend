import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { formatLocalizedCurrency, formatLocalizedDateTime } from '../../../i18n/formatters';
import type { ApprovalRule, ApprovalRuleForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type ApprovalQueueItem = {
  entity_type: string;
  entity_id: string;
  label: string;
  detail?: string;
  status: string;
  created_at: string;
};

type CreateApprovalRuleMutation = { isPending: boolean; mutate: (input: ApprovalRuleForm) => void };
type ExecuteApprovalMutation = { isPending: boolean; mutate: (input: { entity_type: string; entity_id: string; action: 'approved' | 'rejected' }) => void };
type ApprovalRulesQuery = { isLoading: boolean; data?: ApprovalRule[] };

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
  purchase_order: 'Purchase order', supplier_invoice: 'Supplier invoice', department_requisition: 'Department requisition', cycle_count: 'Cycle count', supplier_return: 'Supplier return'
};
const statusLabels: Record<string, string> = { draft: 'Draft', submitted: 'Submitted', pending_approval: 'Pending approval', approved: 'Approved', rejected: 'Rejected' };
const roleLabels: Record<string, string> = { admin: 'Admin', manager: 'Manager', staff: 'Staff' };
const usesAmountThresholds = (entityType: string) => ['purchase_order', 'supplier_invoice', 'supplier_return'].includes(entityType);

export function ApprovalsTab({ approvalQueue, approvalRuleForm, approvalRulesQuery, createApprovalRuleMutation, executeApprovalMutation, setApprovalRuleForm, storageLocations }: ApprovalsTabProps) {
  const { locale, ui } = useAppTranslation();
  const canWriteApprovalRules = hasPermission(TENANT_PERMISSIONS.APPROVAL_RULES_WRITE);
  const canExecuteApprovals = hasPermission(TENANT_PERMISSIONS.APPROVALS_EXECUTE);
  const entitySupportsScope = ['department_requisition', 'cycle_count'].includes(approvalRuleForm.entity_type);
  const entityUsesAmount = usesAmountThresholds(approvalRuleForm.entity_type);
  const minimumAmount = Number(approvalRuleForm.min_amount);
  const maximumAmount = approvalRuleForm.max_amount === '' ? null : Number(approvalRuleForm.max_amount);
  const amountRangeValid = !entityUsesAmount || (Number.isFinite(minimumAmount) && minimumAmount >= 0 && (maximumAmount === null || (Number.isFinite(maximumAmount) && maximumAmount >= minimumAmount)));
  const currencyValid = !entityUsesAmount || /^[A-Z]{3}$/.test(approvalRuleForm.currency.trim().toUpperCase());
  const canSaveRule = canWriteApprovalRules && Boolean(approvalRuleForm.entity_type && approvalRuleForm.required_role) && (entityUsesAmount ? approvalRuleForm.min_amount !== '' && amountRangeValid && currencyValid : true) && !createApprovalRuleMutation.isPending;
  const storageLocationNames = new Map(storageLocations.map((location) => [location.id, location.name]));
  const displayLabel = (value: string, labels: Record<string, string>) => labels[value] ? ui(labels[value]) : value;
  const money = (value: number | string | null | undefined, currency: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? formatLocalizedCurrency(parsed, currency, locale, { maximumFractionDigits: 4 }) : '—';
  };

  const handleApprovalRuleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSaveRule) return;
    createApprovalRuleMutation.mutate(approvalRuleForm);
  };

  const handleApprovalAction = (item: ApprovalQueueItem, action: 'approved' | 'rejected') => {
    if (!canExecuteApprovals) return;
    const prompt = action === 'approved'
      ? ui('Approve {item}?').replace('{item}', item.label)
      : ui('Reject {item}?').replace('{item}', item.label);
    if (!window.confirm(prompt)) return;
    executeApprovalMutation.mutate({ entity_type: item.entity_type, entity_id: item.entity_id, action });
  };

  return (
    <section className="inventory-controls-grid" style={styles.grid}>
      <form onSubmit={handleApprovalRuleSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Create approval rule')}</h2>
        <SelectField
          disabled={!canWriteApprovalRules || createApprovalRuleMutation.isPending}
          label={ui('Entity type')}
          value={approvalRuleForm.entity_type}
          onChange={(value) => setApprovalRuleForm((current) => ({
            ...current,
            entity_type: value,
            ...(!['department_requisition', 'cycle_count'].includes(value) ? { department: '', storage_location_id: '' } : {}),
            ...(['department_requisition', 'cycle_count'].includes(value) ? { min_amount: '0', max_amount: '' } : {})
          }))}
          options={[
            { value: 'purchase_order', label: ui('Purchase order') },
            { value: 'supplier_invoice', label: ui('Supplier invoice') },
            { value: 'department_requisition', label: ui('Department requisition') },
            { value: 'cycle_count', label: ui('Cycle count') },
            { value: 'supplier_return', label: ui('Supplier return') }
          ]}
          required
        />
        {entitySupportsScope ? <>
          <InputField disabled={!canWriteApprovalRules || createApprovalRuleMutation.isPending} label={ui('Department')} value={approvalRuleForm.department} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, department: value }))} />
          <SelectField disabled={!canWriteApprovalRules || createApprovalRuleMutation.isPending} label={ui('Storage location')} value={approvalRuleForm.storage_location_id} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} />
        </> : null}
        {entityUsesAmount ? <>
          <InputField disabled={!canWriteApprovalRules || createApprovalRuleMutation.isPending} label={ui('Minimum amount')} type="number" min="0" value={approvalRuleForm.min_amount} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, min_amount: value }))} required />
          <InputField disabled={!canWriteApprovalRules || createApprovalRuleMutation.isPending} label={ui('Maximum amount')} type="number" min="0" value={approvalRuleForm.max_amount} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, max_amount: value }))} />
          <InputField disabled={!canWriteApprovalRules || createApprovalRuleMutation.isPending} label={ui('Currency')} value={approvalRuleForm.currency} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, currency: value.toUpperCase().slice(0, 3) }))} required />
        </> : null}
        <SelectField disabled={!canWriteApprovalRules || createApprovalRuleMutation.isPending} label={ui('Required role')} value={approvalRuleForm.required_role} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, required_role: value }))} options={[{ value: 'manager', label: ui('Manager') }, { value: 'admin', label: ui('Admin') }]} required />
        {!canWriteApprovalRules ? <p style={styles.helper}>{ui('Creating approval rules requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.APPROVAL_RULES_WRITE)}</p> : null}
        {entityUsesAmount ? <p style={styles.helper}>{ui('This rule applies tenant-wide and uses invoice/order value plus the required role.')}</p> : null}
        {entitySupportsScope ? <p style={styles.helper}>{ui('This rule uses department/location scope and role. Amount thresholds do not apply.')}</p> : null}
        {entityUsesAmount && !amountRangeValid ? <p style={styles.helper}>{ui('Maximum amount must be greater than or equal to minimum amount.')}</p> : null}
        {entityUsesAmount && !currencyValid ? <p style={styles.helper}>{ui('Currency must be a three-letter ISO code.')}</p> : null}
        <button type="submit" disabled={!canSaveRule} style={{ ...(canSaveRule ? styles.primaryButton : styles.disabledButton), marginTop: 12 }}>{createApprovalRuleMutation.isPending ? ui('Saving…') : ui('Save approval rule')}</button>
      </form>

      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('Approval queue')}</h2>
          {approvalQueue.length ? <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Entity', 'Status', 'Created', 'Actions'].map((header) => <th key={header} style={styles.th}>{ui(header)}</th>)}</tr></thead>
              <tbody>{approvalQueue.map((item) => (
                <tr key={`${item.entity_type}-${item.entity_id}`}>
                  <td style={styles.td}><strong>{item.label}</strong>{item.detail ? <div style={styles.helper}>{item.detail}</div> : null}</td>
                  <td style={styles.td}>{displayLabel(item.status, statusLabels)}</td>
                  <td style={styles.td}>{formatLocalizedDateTime(item.created_at, locale)}</td>
                  <td style={styles.td}><div style={styles.actions}>
                    <button type="button" data-skip-global-action-feedback="true" disabled={!canExecuteApprovals || executeApprovalMutation.isPending} title={!canExecuteApprovals ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.APPROVALS_EXECUTE) : undefined} style={!canExecuteApprovals || executeApprovalMutation.isPending ? styles.disabledButton : styles.smallButton} onClick={() => handleApprovalAction(item, 'approved')}>{ui('Approve')}</button>
                    <button type="button" data-skip-global-action-feedback="true" disabled={!canExecuteApprovals || executeApprovalMutation.isPending} title={!canExecuteApprovals ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.APPROVALS_EXECUTE) : undefined} style={!canExecuteApprovals || executeApprovalMutation.isPending ? styles.disabledButton : styles.dangerButton} onClick={() => handleApprovalAction(item, 'rejected')}>{ui('Reject')}</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div> : <p style={styles.helper}>{ui('No items currently waiting for approval.')}</p>}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('Approval rules')}</h2>
          <DataTable
            loading={approvalRulesQuery.isLoading}
            empty={ui('No approval rules configured yet.')}
            headers={['Entity', 'Department', 'Location', 'Min amount', 'Max amount', 'Currency', 'Required role', 'Active'].map(ui)}
            rows={(approvalRulesQuery.data ?? []).map((item) => {
              const amountBased = usesAmountThresholds(item.entity_type);
              return [
                displayLabel(item.entity_type, entityTypeLabels),
                item.department || '—',
                item.storage_location_id ? storageLocationNames.get(item.storage_location_id) || ui('Unknown location') : ui('All locations'),
                amountBased ? money(item.min_amount, item.currency) : '—',
                amountBased ? (item.max_amount === null || item.max_amount === undefined ? ui('No maximum') : money(item.max_amount, item.currency)) : '—',
                amountBased ? item.currency || '—' : '—',
                displayLabel(item.required_role, roleLabels),
                item.active ? ui('Yes') : ui('No')
              ];
            })}
          />
        </section>
      </div>
    </section>
  );
}
