import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { downloadEnterpriseInventoryFile } from '../EnterpriseInventoryRequests';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import type {
  AttachmentForm,
  DepartmentRequisition,
  EntityAttachment,
  ProductOption,
  PurchaseOrder,
  Shipment,
  SupplierInvoice,
  SupplierOption,
  SupplierReturn
} from '../EnterpriseInventoryTypes';

type AttachmentsQuery = { isLoading: boolean; data?: EntityAttachment[] };
type AttachmentUploadMutation = {
  isPending: boolean;
  mutate: (input: { form: AttachmentForm; file: File; afterSuccess?: () => void }) => void;
};
type DeleteAttachmentMutation = { isPending: boolean; mutate: (attachmentId: string) => void };

type AttachmentsTabProps = {
  attachmentForm: AttachmentForm;
  attachmentsQuery: AttachmentsQuery;
  createAttachmentMutation: AttachmentUploadMutation;
  deleteAttachmentMutation: DeleteAttachmentMutation;
  setAttachmentForm: Dispatch<SetStateAction<AttachmentForm>>;
  products: ProductOption[];
  suppliers: SupplierOption[];
  purchaseOrders: PurchaseOrder[];
  shipments: Shipment[];
  invoices: SupplierInvoice[];
  requisitions: DepartmentRequisition[];
  supplierReturns: SupplierReturn[];
};

const entityTypes = [
  ['supplier_invoice', 'Supplier invoice'],
  ['purchase_order', 'Purchase order'],
  ['shipment', 'Shipment'],
  ['supplier_return', 'Supplier return'],
  ['supplier', 'Supplier'],
  ['product', 'Product'],
  ['department_requisition', 'Department requisition'],
  ['inventory_usage_log', 'Inventory usage log']
];
const accept = '.pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx';
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function formatBytes(value: number | string | null | undefined): string {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsTab({
  attachmentForm,
  attachmentsQuery,
  createAttachmentMutation,
  deleteAttachmentMutation,
  setAttachmentForm,
  products,
  suppliers,
  purchaseOrders,
  shipments,
  invoices,
  requisitions,
  supplierReturns
}: AttachmentsTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canReadAttachments = hasPermission(TENANT_PERMISSIONS.ATTACHMENTS_READ);
  const canWriteAttachments = hasPermission(TENANT_PERMISSIONS.ATTACHMENTS_WRITE);

  const entityOptions = (() => {
    switch (attachmentForm.entity_type) {
      case 'product': return products.map((item) => ({ value: item.id, label: item.name }));
      case 'supplier': return suppliers.map((item) => ({ value: item.id, label: item.name }));
      case 'purchase_order': return purchaseOrders.map((item) => ({ value: item.id, label: item.po_number || item.id }));
      case 'shipment': return shipments.map((item) => ({ value: item.id, label: `${item.linked_purchase_order_number || item.po_number || 'Shipment'} · ${String(item.delivery_date).slice(0, 10)}` }));
      case 'supplier_invoice': return invoices.map((item) => ({ value: item.id, label: `${item.invoice_number} · ${item.supplier_name || 'Supplier'}` }));
      case 'supplier_return': return supplierReturns.map((item) => ({ value: item.id, label: `${item.return_number} · ${item.supplier_name}` }));
      case 'department_requisition': return requisitions.map((item) => ({ value: item.id, label: `${item.department} · ${item.status}` }));
      default: return [];
    }
  })();

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size <= 0) {
      setSelectedFile(null);
      setFileError('The selected file is empty.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setFileError('Maximum attachment size is 8 MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFileError(null);
    if (!canWriteAttachments || !attachmentForm.entity_type || !attachmentForm.entity_id || !selectedFile) {
      setFileError('Select a business record and a file before uploading.');
      return;
    }
    createAttachmentMutation.mutate({
      form: attachmentForm,
      file: selectedFile,
      afterSuccess: () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const downloadAttachment = async (attachment: EntityAttachment) => {
    if (!attachment.can_download || downloadingId) return;
    setDownloadingId(attachment.id);
    try {
      await downloadEnterpriseInventoryFile(
        `/enterprise-inventory/attachments/${encodeURIComponent(attachment.id)}/download`,
        attachment.original_filename
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section style={styles.stack}>
      <form style={styles.card} onSubmit={handleUpload} data-skip-global-action-feedback="true">
        <h2 style={styles.cardTitle}>Upload attachment</h2>
        <p style={styles.helper}>Upload the actual PDF, image, spreadsheet, or document. Files are stored with the tenant record and can be downloaded later. Maximum size: 8 MB.</p>
        <div style={{ ...styles.formGrid, marginTop: 12 }}>
          <SelectField
            disabled={!canWriteAttachments || createAttachmentMutation.isPending}
            label="Attach to"
            value={attachmentForm.entity_type}
            onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_type: value, entity_id: '' }))}
            options={entityTypes.map(([value, label]) => ({ value, label }))}
            required
          />
          {entityOptions.length ? (
            <SelectField
              disabled={!canWriteAttachments || createAttachmentMutation.isPending}
              label="Business record"
              value={attachmentForm.entity_id}
              onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_id: value }))}
              options={entityOptions}
              required
            />
          ) : (
            <InputField
              disabled={!canWriteAttachments || createAttachmentMutation.isPending}
              label="Business record ID"
              value={attachmentForm.entity_id}
              onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_id: value }))}
              required
            />
          )}
        </div>
        <label style={styles.field}>
          <span style={styles.label}>File</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            disabled={!canWriteAttachments || createAttachmentMutation.isPending}
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
        {selectedFile ? <p style={styles.helper}>Selected: <strong>{selectedFile.name}</strong> · {formatBytes(selectedFile.size)}</p> : null}
        {fileError ? <div style={styles.error}>{fileError}</div> : null}
        {!canWriteAttachments ? <p style={styles.helper}>Uploading requires {TENANT_PERMISSIONS.ATTACHMENTS_WRITE} permission.</p> : null}
        <button
          type="submit"
          disabled={!canWriteAttachments || createAttachmentMutation.isPending || !attachmentForm.entity_id || !selectedFile}
          style={canWriteAttachments && !createAttachmentMutation.isPending && attachmentForm.entity_id && selectedFile ? styles.primaryButton : styles.disabledButton}
        >
          {createAttachmentMutation.isPending ? 'Uploading…' : 'Upload file'}
        </button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Entity attachments</h2>
        {!attachmentForm.entity_id ? <p style={styles.helper}>Select a business record above to see its attachments.</p> : !canReadAttachments ? <p style={styles.helper}>Requires {TENANT_PERMISSIONS.ATTACHMENTS_READ} permission.</p> : attachmentsQuery.isLoading ? <p style={styles.helper}>Loading…</p> : !(attachmentsQuery.data ?? []).length ? <p style={styles.helper}>No attachments found for this record.</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['File','Type / size','Stored','Integrity','Actions'].map((header) => <th key={header} style={styles.th}>{header}</th>)}</tr></thead>
              <tbody>
                {(attachmentsQuery.data ?? []).map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}><strong>{item.original_filename}</strong><br/><span style={styles.muted}>{item.entity_type}</span></td>
                    <td style={styles.td}>{item.mime_type || '-'}<br/><span style={styles.muted}>{formatBytes(item.file_size_bytes)}</span></td>
                    <td style={styles.td}>{formatDateTime(item.created_at)}<br/><span style={styles.muted}>{item.storage_backend === 'database' ? 'Stored file' : 'Legacy metadata only'}</span></td>
                    <td style={styles.td}>{item.content_sha256 ? <span style={styles.muted} title={item.content_sha256}>SHA-256 {item.content_sha256.slice(0, 12)}…</span> : '-'}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button type="button" style={item.can_download ? styles.smallButton : styles.disabledButton} disabled={!item.can_download || downloadingId === item.id} onClick={() => void downloadAttachment(item)}>{downloadingId === item.id ? 'Downloading…' : item.can_download ? 'Download' : 'Metadata only'}</button>
                        <button type="button" style={canWriteAttachments ? styles.dangerButton : styles.disabledButton} disabled={!canWriteAttachments || deleteAttachmentMutation.isPending} onClick={() => { if (window.confirm(`Delete attachment "${item.original_filename}"?`)) deleteAttachmentMutation.mutate(item.id); }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
