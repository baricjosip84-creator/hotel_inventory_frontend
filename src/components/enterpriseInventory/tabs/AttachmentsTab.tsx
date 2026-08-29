import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../../i18n/formatters';
import { downloadEnterpriseInventoryFile } from '../EnterpriseInventoryRequests';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
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
] as const;
const accept = '.pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx';
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function formatBytes(value: number | string | null | undefined, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${formatLocalizedNumber(bytes, locale, { maximumFractionDigits: 0 })} B`;
  if (bytes < 1024 * 1024) return `${formatLocalizedNumber(bytes / 1024, locale, { maximumFractionDigits: 1 })} KB`;
  return `${formatLocalizedNumber(bytes / (1024 * 1024), locale, { maximumFractionDigits: 1 })} MB`;
}

const requisitionStatusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

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
  const { locale, ui } = useAppTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canReadAttachments = hasPermission(TENANT_PERMISSIONS.ATTACHMENTS_READ);
  const canWriteAttachments = hasPermission(TENANT_PERMISSIONS.ATTACHMENTS_WRITE);
  const entityTypeLabel = (value: string) => {
    const known = entityTypes.find(([key]) => key === value)?.[1];
    return known ? ui(known) : value;
  };
  const requisitionStatusLabel = (value: string) => requisitionStatusLabels[value] ? ui(requisitionStatusLabels[value]) : value;

  const entityOptions = (() => {
    switch (attachmentForm.entity_type) {
      case 'product': return products.map((item) => ({ value: item.id, label: item.name }));
      case 'supplier': return suppliers.map((item) => ({ value: item.id, label: item.name }));
      case 'purchase_order': return purchaseOrders.map((item) => ({ value: item.id, label: item.po_number || item.id }));
      case 'shipment': return shipments.map((item) => ({ value: item.id, label: `${item.linked_purchase_order_number || item.po_number || ui('Shipment')} · ${String(item.delivery_date).slice(0, 10)}` }));
      case 'supplier_invoice': return invoices.map((item) => ({ value: item.id, label: `${item.invoice_number} · ${item.supplier_name || ui('Supplier')}` }));
      case 'supplier_return': return supplierReturns.map((item) => ({ value: item.id, label: `${item.return_number} · ${item.supplier_name}` }));
      case 'department_requisition': return requisitions.map((item) => ({ value: item.id, label: `${item.department} · ${requisitionStatusLabel(item.status)}` }));
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
      setFileError(ui('The selected file is empty.'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setFileError(ui('Maximum attachment size is 8 MB.'));
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFileError(null);
    if (!canWriteAttachments || !attachmentForm.entity_type || !attachmentForm.entity_id || !selectedFile) {
      setFileError(ui('Select a business record and a file before uploading.'));
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
        <h2 style={styles.cardTitle}>{ui('Upload attachment')}</h2>
        <p style={styles.helper}>{ui('Upload the actual PDF, image, spreadsheet, or document. Files are stored with the tenant record and can be downloaded later. Maximum size: 8 MB.')}</p>
        <div style={{ ...styles.formGrid, marginTop: 12 }}>
          <SelectField
            disabled={!canWriteAttachments || createAttachmentMutation.isPending}
            label={ui('Attach to')}
            value={attachmentForm.entity_type}
            onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_type: value, entity_id: '' }))}
            options={entityTypes.map(([value, label]) => ({ value, label: ui(label) }))}
            required
          />
          {entityOptions.length ? (
            <SelectField
              disabled={!canWriteAttachments || createAttachmentMutation.isPending}
              label={ui('Business record')}
              value={attachmentForm.entity_id}
              onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_id: value }))}
              options={entityOptions}
              required
            />
          ) : (
            <InputField
              disabled={!canWriteAttachments || createAttachmentMutation.isPending}
              label={ui('Business record ID')}
              value={attachmentForm.entity_id}
              onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_id: value }))}
              required
            />
          )}
        </div>
        <label style={styles.field}>
          <span style={styles.label}>{ui('File')}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            disabled={!canWriteAttachments || createAttachmentMutation.isPending}
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
        {selectedFile ? <p style={styles.helper}>{ui('Selected:')} <strong>{selectedFile.name}</strong> · {formatBytes(selectedFile.size, locale)}</p> : null}
        {fileError ? <div style={styles.error}>{fileError}</div> : null}
        {!canWriteAttachments ? <p style={styles.helper}>{ui('Uploading requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.ATTACHMENTS_WRITE)}</p> : null}
        <button
          type="submit"
          disabled={!canWriteAttachments || createAttachmentMutation.isPending || !attachmentForm.entity_id || !selectedFile}
          style={canWriteAttachments && !createAttachmentMutation.isPending && attachmentForm.entity_id && selectedFile ? styles.primaryButton : styles.disabledButton}
        >
          {createAttachmentMutation.isPending ? ui('Uploading…') : ui('Upload file')}
        </button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Entity attachments')}</h2>
        {!attachmentForm.entity_id ? <p style={styles.helper}>{ui('Select a business record above to see its attachments.')}</p> : !canReadAttachments ? <p style={styles.helper}>{ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.ATTACHMENTS_READ)}</p> : attachmentsQuery.isLoading ? <p style={styles.helper}>{ui('Loading…')}</p> : !(attachmentsQuery.data ?? []).length ? <p style={styles.helper}>{ui('No attachments found for this record.')}</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['File','Type / size','Stored','Integrity','Actions'].map((header) => <th key={header} style={styles.th}>{ui(header)}</th>)}</tr></thead>
              <tbody>
                {(attachmentsQuery.data ?? []).map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}><strong>{item.original_filename}</strong><br/><span style={styles.muted}>{entityTypeLabel(item.entity_type)}</span></td>
                    <td style={styles.td}>{item.mime_type || '—'}<br/><span style={styles.muted}>{formatBytes(item.file_size_bytes, locale)}</span></td>
                    <td style={styles.td}>{formatLocalizedDateTime(item.created_at, locale)}<br/><span style={styles.muted}>{item.storage_backend === 'database' ? ui('Stored file') : ui('Legacy metadata only')}</span></td>
                    <td style={styles.td}>{item.content_sha256 ? <span style={styles.muted} title={item.content_sha256}>SHA-256 {item.content_sha256.slice(0, 12)}…</span> : '—'}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button type="button" style={item.can_download ? styles.smallButton : styles.disabledButton} disabled={!item.can_download || downloadingId === item.id} onClick={() => void downloadAttachment(item)}>{downloadingId === item.id ? ui('Downloading…') : item.can_download ? ui('Download') : ui('Metadata only')}</button>
                        <button type="button" style={canWriteAttachments ? styles.dangerButton : styles.disabledButton} disabled={!canWriteAttachments || deleteAttachmentMutation.isPending} onClick={() => { if (window.confirm(ui('Delete attachment "{filename}"?').replace('{filename}', item.original_filename))) deleteAttachmentMutation.mutate(item.id); }}>{ui('Delete')}</button>
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
