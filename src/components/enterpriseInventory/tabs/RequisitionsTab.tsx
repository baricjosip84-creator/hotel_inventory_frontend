import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import type { DepartmentRequisition, ProductOption, RequisitionForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type RequisitionCreateMutation = {
  isPending: boolean;
  mutate: (input: RequisitionForm) => void;
};

type RequisitionsQuery = {
  isLoading: boolean;
  data?: DepartmentRequisition[];
};

type RequisitionsTabProps = {
  createRequisitionMutation: RequisitionCreateMutation;
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
        <SelectField label="Product" value={requisitionForm.product_id} onChange={(value) => setRequisitionForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required disabled={!canCreateRequisitions} />
        <InputField label="Requested quantity" type="number" value={requisitionForm.requested_quantity} onChange={(value) => setRequisitionForm((current) => ({ ...current, requested_quantity: value }))} required disabled={!canCreateRequisitions} />
        <InputField label="Notes" value={requisitionForm.notes} onChange={(value) => setRequisitionForm((current) => ({ ...current, notes: value }))} disabled={!canCreateRequisitions} />
        <button type="submit" disabled={createRequisitionMutation.isPending || !canCreateRequisitions} style={createRequisitionMutation.isPending || !canCreateRequisitions ? styles.disabledButton : styles.primaryButton} title={!canCreateRequisitions ? `Requires ${TENANT_PERMISSIONS.REQUISITIONS_CREATE} permission.` : undefined}>Create requisition</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Department requisitions</h2>
        <DataTable
          loading={requisitionsQuery.isLoading}
          empty="No requisitions yet."
          headers={['Department', 'Product', 'Quantity', 'Status', 'Priority', 'Created']}
          rows={(requisitionsQuery.data ?? []).map((item) => [
            item.department,
            formatRequisitionProducts(item),
            formatRequisitionQuantity(item),
            formatRequisitionLabel(item.status),
            formatRequisitionLabel(item.priority),
            formatDateTime(item.created_at)
          ])}
        />
      </div>
    </section>
  );
}
