import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDateTime } from '../EnterpriseInventoryFormat';
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

export function RequisitionsTab({
  createRequisitionMutation,
  products,
  requisitionForm,
  requisitionsQuery,
  setRequisitionForm,
  storageLocations
}: RequisitionsTabProps) {
  const handleRequisitionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createRequisitionMutation.mutate(requisitionForm);
  };

  return (
    <section style={styles.grid}>
      <form onSubmit={handleRequisitionSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Create department requisition</h2>
        <InputField label="Department" value={requisitionForm.department} onChange={(value) => setRequisitionForm((current) => ({ ...current, department: value }))} required />
        <SelectField label="Storage location" value={requisitionForm.storage_location_id} onChange={(value) => setRequisitionForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} />
        <SelectField label="Priority" value={requisitionForm.priority} onChange={(value) => setRequisitionForm((current) => ({ ...current, priority: value }))} options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
        <SelectField label="Product" value={requisitionForm.product_id} onChange={(value) => setRequisitionForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
        <InputField label="Requested quantity" type="number" value={requisitionForm.requested_quantity} onChange={(value) => setRequisitionForm((current) => ({ ...current, requested_quantity: value }))} required />
        <InputField label="Notes" value={requisitionForm.notes} onChange={(value) => setRequisitionForm((current) => ({ ...current, notes: value }))} />
        <button type="submit" disabled={createRequisitionMutation.isPending} style={styles.primaryButton}>Create requisition</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Department requisitions</h2>
        <DataTable loading={requisitionsQuery.isLoading} empty="No requisitions yet." headers={['Department', 'Status', 'Priority', 'Created']} rows={(requisitionsQuery.data ?? []).map((item) => [item.department, item.status, item.priority, formatDateTime(item.created_at)])} />
      </div>
    </section>
  );
}
