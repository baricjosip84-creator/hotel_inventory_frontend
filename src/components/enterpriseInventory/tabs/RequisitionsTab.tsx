import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import type { DepartmentRequisition, ProductOption, RequisitionForm, StorageLocationOption } from '../EnterpriseInventoryTypes';
import ProductUomSelect from '../../inventory/ProductUomSelect';

type RequisitionCreateMutation = {
  isPending: boolean;
  mutate: (input: RequisitionForm) => void;
};

type RequisitionSubmitMutation = {
  isPending: boolean;
  mutate: (id: string) => void;
};

type RequisitionsQuery = {
  isLoading: boolean;
  data?: DepartmentRequisition[];
};

type RequisitionsTabProps = {
  createRequisitionMutation: RequisitionCreateMutation;
  submitRequisitionMutation: RequisitionSubmitMutation;
  products: ProductOption[];
  requisitionForm: RequisitionForm;
  requisitionsQuery: RequisitionsQuery;
  setRequisitionForm: Dispatch<SetStateAction<RequisitionForm>>;
  storageLocations: StorageLocationOption[];
};

function formatRequisitionLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRequisitionProducts(item: DepartmentRequisition): string {
  const productNames = (item.items ?? [])
    .map((line) => line.product_name?.trim())
    .filter((productName): productName is string => Boolean(productName));

  if (productNames.length) return productNames.join(', ');
  return '-';
}

function formatRequisitionQuantity(item: DepartmentRequisition): string {
  if (item.requested_quantity !== null && item.requested_quantity !== undefined && item.requested_quantity !== '') {
    return formatNumber(item.requested_quantity);
  }

  const total = (item.items ?? []).reduce((sum, line) => {
    const parsed = Number(line.requested_quantity ?? 0);
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);

  return total > 0 ? formatNumber(total) : '-';
}

export function RequisitionsTab({
  createRequisitionMutation,
  submitRequisitionMutation,
  products,
  requisitionForm,
  requisitionsQuery,
  setRequisitionForm,
  storageLocations
}: RequisitionsTabProps) {
  const canCreateRequisitions = hasPermission(TENANT_PERMISSIONS.REQUISITIONS_CREATE);

  const handleRequisitionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateRequisitions || createRequisitionMutation.isPending) return;
    createRequisitionMutation.mutate(requisitionForm);
  };

  return (
    <section style={styles.grid}>
      <form onSubmit={handleRequisitionSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Create department requisition</h2>
        <InputField label="Department" value={requisitionForm.department} onChange={(value) => setRequisitionForm((current) => ({ ...current, department: value }))} required disabled={!canCreateRequisitions} />
        <SelectField label="Storage location" value={requisitionForm.storage_location_id} onChange={(value) => setRequisitionForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} disabled={!canCreateRequisitions} />
        <SelectField label="Priority" value={requisitionForm.priority} onChange={(value) => setRequisitionForm((current) => ({ ...current, priority: value }))} options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} disabled={!canCreateRequisitions} />
        <SelectField label="Product" value={requisitionForm.product_id} onChange={(value) => setRequisitionForm((current) => ({ ...current, product_id: value, uom_code: '' }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required disabled={!canCreateRequisitions} />
        <InputField label="Requested quantity" type="number" min="0.0001" value={requisitionForm.requested_quantity} onChange={(value) => setRequisitionForm((current) => ({ ...current, requested_quantity: value }))} required disabled={!canCreateRequisitions} />
        <label style={styles.field}><span style={styles.label}>Unit of measure</span><ProductUomSelect productId={requisitionForm.product_id} value={requisitionForm.uom_code} purpose="issue" onChange={(value) => setRequisitionForm((current) => ({ ...current, uom_code: value }))} disabled={!canCreateRequisitions} style={styles.input} ariaLabel="Requisition unit of measure" /></label>
        <InputField label="Notes" value={requisitionForm.notes} onChange={(value) => setRequisitionForm((current) => ({ ...current, notes: value }))} disabled={!canCreateRequisitions} />
        <button type="submit" disabled={createRequisitionMutation.isPending || !canCreateRequisitions} style={createRequisitionMutation.isPending || !canCreateRequisitions ? styles.disabledButton : styles.primaryButton} title={!canCreateRequisitions ? `Requires ${TENANT_PERMISSIONS.REQUISITIONS_CREATE} permission.` : undefined}>Create requisition</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Department requisitions</h2>
        {requisitionsQuery.isLoading ? (
          <p style={styles.helper}>Loading…</p>
        ) : (requisitionsQuery.data ?? []).length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(requisitionsQuery.data ?? []).map((item) => {
                  const canSubmit = canCreateRequisitions && item.status === 'draft';
                  return (
                    <tr key={item.id}>
                      <td style={styles.td}>{item.department}</td>
                      <td style={styles.td}>{formatRequisitionProducts(item)}</td>
                      <td style={styles.td}>{formatRequisitionQuantity(item)}</td>
                      <td style={styles.td}>{formatRequisitionLabel(item.status)}</td>
                      <td style={styles.td}>{formatRequisitionLabel(item.priority)}</td>
                      <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                      <td style={styles.td}>
                        {item.status === 'draft' ? (
                          <button
                            type="button"
                            disabled={!canSubmit || submitRequisitionMutation.isPending}
                            style={canSubmit && !submitRequisitionMutation.isPending ? styles.smallButton : styles.disabledButton}
                            title={!canCreateRequisitions ? `Requires ${TENANT_PERMISSIONS.REQUISITIONS_CREATE} permission.` : undefined}
                            onClick={() => {
                              if (window.confirm('Submit this requisition for approval?')) submitRequisitionMutation.mutate(item.id);
                            }}
                          >
                            Submit
                          </button>
                        ) : item.status === 'pending_approval' ? (
                          <span style={styles.helper}>Waiting for approval</span>
                        ) : (
                          <span style={styles.helper}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={styles.helper}>No requisitions yet.</p>
        )}
      </div>
    </section>
  );
}
