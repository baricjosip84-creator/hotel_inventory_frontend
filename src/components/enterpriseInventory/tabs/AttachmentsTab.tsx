import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type { AttachmentForm, EntityAttachment } from '../EnterpriseInventoryTypes';

type AttachmentsQuery = {
  isLoading: boolean;
  data?: EntityAttachment[];
};

type CreateAttachmentMutation = {
  isPending: boolean;
};

type AttachmentsTabProps = {
  attachmentForm: AttachmentForm;
  attachmentsQuery: AttachmentsQuery;
  createAttachmentMutation: CreateAttachmentMutation;
  setAttachmentForm: Dispatch<SetStateAction<AttachmentForm>>;
  onAttachmentSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AttachmentsTab({
  attachmentForm,
  attachmentsQuery,
  createAttachmentMutation,
  setAttachmentForm,
  onAttachmentSubmit
}: AttachmentsTabProps) {
  return (
    <section style={styles.grid}>
      <form onSubmit={onAttachmentSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Link attachment</h2>
        <SelectField
          label="Entity type"
          value={attachmentForm.entity_type}
          onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_type: value }))}
          options={[
            { value: 'purchase_order', label: 'Purchase order' },
            { value: 'shipment', label: 'Shipment' },
            { value: 'supplier', label: 'Supplier' },
            { value: 'product', label: 'Product' },
            { value: 'supplier_invoice', label: 'Supplier invoice' },
            { value: 'department_requisition', label: 'Department requisition' }
          ]}
          required
        />
        <InputField label="Entity ID" value={attachmentForm.entity_id} onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_id: value }))} required />
        <InputField label="Original filename" value={attachmentForm.original_filename} onChange={(value) => setAttachmentForm((current) => ({ ...current, original_filename: value }))} required />
        <InputField label="Stored filename" value={attachmentForm.stored_filename} onChange={(value) => setAttachmentForm((current) => ({ ...current, stored_filename: value }))} required />
        <InputField label="MIME type" value={attachmentForm.mime_type} onChange={(value) => setAttachmentForm((current) => ({ ...current, mime_type: value }))} />
        <InputField label="File size bytes" type="number" value={attachmentForm.file_size_bytes} onChange={(value) => setAttachmentForm((current) => ({ ...current, file_size_bytes: value }))} />
        <InputField label="Storage path" value={attachmentForm.storage_path} onChange={(value) => setAttachmentForm((current) => ({ ...current, storage_path: value }))} />
        <button type="submit" disabled={createAttachmentMutation.isPending} style={styles.primaryButton}>Link attachment</button>
      </form>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Entity attachments</h2>
        <p style={styles.helper}>Enter an entity type and entity ID to load linked files.</p>
        <DataTable
          loading={attachmentsQuery.isLoading}
          empty="No attachments found for this entity."
          headers={['File', 'Stored file', 'MIME type', 'Size', 'Path', 'Created']}
          rows={(attachmentsQuery.data ?? []).map((item) => [
            item.original_filename,
            item.stored_filename,
            item.mime_type || '-',
            formatNumber(item.file_size_bytes),
            item.storage_path || '-',
            formatDateTime(item.created_at)
          ])}
        />
      </section>
    </section>
  );
}
