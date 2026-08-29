import { useEffect, useMemo, useState } from 'react';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/formatters';
import { OperationalSectionHeader } from '../../components/ui/OperationalWorkspace';

import { USAGE_REASON_OPTIONS } from './inventoryUsageConfig';
import { styles } from './inventoryUsageStyles';
import type { InventoryUsageBulkLine, InventoryUsageBulkReadinessResponse, InventoryUsageBulkResponse, InventoryUsageTemplate, InventoryUsageProductOption, InventoryUsageStorageLocationOption } from './inventoryUsageTypes';
import { showTenantActionError, showTenantActionSuccess } from '../../lib/actionFeedback';

const formatBulkReadinessReason = (reason: string, ui: (text: string) => string): string => {
  switch (reason) {
    case 'reserved_stock':
      return ui('Reserved stock is protected');
    case 'insufficient_stock':
      return ui('Insufficient on-hand stock');
    case 'missing_stock_row':
      return ui('No stock exists at this location');
    case 'critical_alert':
      return ui('A critical alert blocks usage');
    case 'closed_period':
      return ui('The usage period is closed');
    case 'product_not_found':
      return ui('Product not found');
    case 'storage_location_not_found':
      return ui('Storage location not found');
    case 'missing_evidence_acknowledgement_required':
      return ui('Missing-evidence acknowledgement required');
    default:
      return reason.replace(/_/g, ' ');
  }
};

const createBlankLine = (): InventoryUsageBulkLine => ({
  product_id: '',
  storage_location_id: '',
  quantity: '',
  consumption_reason: '',
  department: '',
  event_name: '',
  notes: '',
  reference_type: '',
  reference_id: '',
  missing_evidence_acknowledged: false
});

type InventoryUsageBulkRecorderProps = {
  selectedTemplate?: InventoryUsageTemplate | null;
  productOptions: InventoryUsageProductOption[];
  storageLocations: InventoryUsageStorageLocationOption[];
  optionsLoading?: boolean;
  previewing?: boolean;
  previewError?: Error | null;
  previewResult?: InventoryUsageBulkReadinessResponse | null;
  recording: boolean;
  error?: Error | null;
  result?: InventoryUsageBulkResponse | null;
  onPreviewBulkUsage?: (payload: {
    consumption_reason?: string;
    department?: string;
    event_name?: string;
    notes?: string;
    consumed_at?: string;
    reference_type?: string;
    reference_id?: string;
    missing_evidence_acknowledged?: boolean;
    items: InventoryUsageBulkLine[];
  }) => void;
  onRecordBulkUsage: (payload: {
    consumption_reason?: string;
    department?: string;
    event_name?: string;
    notes?: string;
    consumed_at?: string;
    reference_type?: string;
    reference_id?: string;
    missing_evidence_acknowledged?: boolean;
    items: InventoryUsageBulkLine[];
  }) => void;
};

export function InventoryUsageBulkRecorder({
  selectedTemplate,
  productOptions,
  storageLocations,
  optionsLoading = false,
  previewing = false,
  previewError,
  previewResult,
  recording,
  error,
  result,
  onPreviewBulkUsage,
  onRecordBulkUsage
}: InventoryUsageBulkRecorderProps) {
  const { locale, ui } = useAppTranslation();
  const formatNumber = (value: number | string | null | undefined, maximumFractionDigits = 4) => {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return formatLocalizedNumber(numeric, locale, { maximumFractionDigits });
  };
  const formatDateTimeLocal = (value: string | null | undefined) => formatLocalizedDateTime(value, locale);
  const [sharedReason, setSharedReason] = useState('internal_use');
  const [sharedDepartment, setSharedDepartment] = useState('');
  const [sharedEventName, setSharedEventName] = useState('');
  const [sharedNotes, setSharedNotes] = useState('');
  const [sharedReferenceType, setSharedReferenceType] = useState('');
  const [sharedReferenceId, setSharedReferenceId] = useState('');
  const [consumedAt, setConsumedAt] = useState('');
  const [sharedMissingEvidenceAcknowledged, setSharedMissingEvidenceAcknowledged] = useState(false);
  const [pasteImport, setPasteImport] = useState('');
  const [pasteImportError, setPasteImportError] = useState('');
  const [lines, setLines] = useState<InventoryUsageBulkLine[]>([createBlankLine(), createBlankLine(), createBlankLine()]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setSharedReason(selectedTemplate.consumption_reason || 'internal_use');
    setSharedDepartment(selectedTemplate.department || '');
    setSharedEventName(selectedTemplate.event_name || '');
    setSharedNotes(selectedTemplate.notes || '');
    setLines((selectedTemplate.items || []).map((item) => ({
      product_id: item.product_id || '',
      storage_location_id: item.storage_location_id || '',
      quantity: String(item.quantity || ''),
      consumption_reason: item.consumption_reason ? String(item.consumption_reason) : '',
      department: selectedTemplate.department || '',
      event_name: selectedTemplate.event_name || '',
      notes: item.notes || '',
      reference_type: 'usage_template',
      reference_id: selectedTemplate.id || '',
      missing_evidence_acknowledged: false
    })) || [createBlankLine()]);
  }, [selectedTemplate]);

  const validLineCount = useMemo(() => {
    return lines.filter((line) => line.product_id.trim() && line.storage_location_id.trim() && Number(line.quantity) > 0).length;
  }, [lines]);

  const buildBulkPayload = () => ({
    consumption_reason: sharedReason || undefined,
    department: sharedDepartment.trim() || undefined,
    event_name: sharedEventName.trim() || undefined,
    notes: sharedNotes.trim() || undefined,
    consumed_at: consumedAt || undefined,
    reference_type: sharedReferenceType.trim() || undefined,
    reference_id: sharedReferenceId.trim() || undefined,
    missing_evidence_acknowledged: sharedMissingEvidenceAcknowledged || undefined,
    items: lines.filter((line) => line.product_id.trim() && line.storage_location_id.trim() && Number(line.quantity) > 0),
  });

  const readinessTone = previewResult?.can_record === false ? styles.errorText : styles.successText;


  const parseDelimitedUsageLines = (raw: string): InventoryUsageBulkLine[] => {
    const rows = raw
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    if (!rows.length) {
      return [];
    }

    const looksLikeHeader = /product/i.test(rows[0]) && /(location|storage)/i.test(rows[0]);
    const dataRows = looksLikeHeader ? rows.slice(1) : rows;

    return dataRows.map((row) => {
      const cells = row.split(/\t|,/).map((cell) => cell.trim());
      return {
        product_id: cells[0] || '',
        storage_location_id: cells[1] || '',
        quantity: cells[2] || '',
        consumption_reason: cells[3] || '',
        department: cells[4] || '',
        event_name: cells[5] || '',
        notes: cells[6] || '',
        reference_type: cells[7] || '',
        reference_id: cells[8] || '',
        missing_evidence_acknowledged: ['true', 'yes', '1', 'acknowledged'].includes((cells[9] || '').toLowerCase())
      };
    });
  };

  const handlePasteImport = () => {
    const importedLines = parseDelimitedUsageLines(pasteImport).filter((line) => (
      line.product_id.trim() || line.storage_location_id.trim() || line.quantity.trim()
    ));

    if (!importedLines.length) {
      setPasteImportError(ui('Paste at least one line with product_id, storage_location_id, and quantity.'));
      return;
    }

    const invalidLine = importedLines.find((line) => !line.product_id.trim() || !line.storage_location_id.trim() || Number(line.quantity) <= 0);

    if (invalidLine) {
      setPasteImportError(ui('Every imported line needs product_id, storage_location_id, and a quantity greater than zero.'));
      return;
    }

    setLines(importedLines);
    setPasteImportError('');
  };

  const handleAppendPasteImport = () => {
    const importedLines = parseDelimitedUsageLines(pasteImport).filter((line) => (
      line.product_id.trim() || line.storage_location_id.trim() || line.quantity.trim()
    ));

    if (!importedLines.length) {
      setPasteImportError(ui('Paste at least one line before appending.'));
      return;
    }

    const validImportedLines = importedLines.filter((line) => line.product_id.trim() && line.storage_location_id.trim() && Number(line.quantity) > 0);

    if (!validImportedLines.length) {
      setPasteImportError(ui('No valid imported lines found. Required columns are product_id, storage_location_id, quantity.'));
      return;
    }

    setLines((current) => [...current.filter((line) => line.product_id.trim() || line.storage_location_id.trim() || line.quantity.trim()), ...validImportedLines]);
    setPasteImportError('');
  };

  const updateLine = (index: number, field: keyof InventoryUsageBulkLine, value: string | boolean) => {
    setLines((current) => current.map((line, lineIndex) => (
      lineIndex === index ? { ...line, [field]: value } : line
    )));
  };

  const addLine = () => setLines((current) => [...current, createBlankLine()]);

  const removeLine = (index: number) => {
    setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index));
  };

  const handlePreview = () => {
    const payload = buildBulkPayload();

    if (!payload.items.length) {
      showTenantActionError(ui('Add at least one valid usage line with product ID, location ID, and quantity.'));
      return;
    }

    onPreviewBulkUsage?.(payload);
    showTenantActionSuccess(ui('Bulk usage preview prepared successfully.'));
  };

  const handleSubmit = () => {
    const payload = buildBulkPayload();

    if (!payload.items.length) {
      showTenantActionError(ui('Add at least one valid usage line with product ID, location ID, and quantity.'));
      return;
    }

    onRecordBulkUsage(payload);
  };

  const handleExportBulkReadinessCsv = () => {
    if (!previewResult?.lines?.length) {
      return;
    }

    const headers = [
      'line_number',
      'can_record',
      'product_id',
      'product_name',
      'storage_location_id',
      'storage_location_name',
      'quantity',
      'current_quantity',
      'reserved_quantity',
      'resulting_quantity',
      'resulting_available_quantity',
      'minimum_quantity',
      'blocking_reasons',
      'acknowledgement_required_reasons',
      'requires_evidence_or_acknowledgement',
      'missing_evidence_acknowledged',
      'period_open',
      'period_closure_id'
    ];

    const rows = previewResult.lines.map((line) => ({
      line_number: line.line_number,
      can_record: line.can_record ? 'yes' : 'no',
      product_id: line.product_id,
      product_name: line.product_name || '',
      storage_location_id: line.storage_location_id,
      storage_location_name: line.storage_location_name || '',
      quantity: line.quantity,
      current_quantity: line.current_quantity ?? '',
      reserved_quantity: line.reserved_quantity ?? '',
      resulting_quantity: line.resulting_quantity ?? '',
      resulting_available_quantity: line.resulting_available_quantity ?? '',
      minimum_quantity: line.minimum_quantity ?? '',
      blocking_reasons: (line.blocking_reasons || []).join('; '),
      acknowledgement_required_reasons: (line.acknowledgement_required_reasons || []).join('; '),
      requires_evidence_or_acknowledgement: line.requires_evidence_or_acknowledgement ? 'yes' : 'no',
      missing_evidence_acknowledged: line.missing_evidence_acknowledged ? 'yes' : 'no',
      period_open: previewResult.period_open === false ? 'no' : 'yes',
      period_closure_id: previewResult.period_closure?.id || ''
    }));

    const escapeCell = (value: unknown) => {
      const raw = value === null || value === undefined ? '' : String(value);
      const safeRaw = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safeRaw.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escapeCell(row[header as keyof typeof row])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-usage-bulk-readiness-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportBulkResultCsv = () => {
    if (!result?.items?.length) {
      return;
    }

    const headers = [
      'line_number',
      'usage_log_id',
      'product_id',
      'storage_location_id',
      'quantity',
      'previous_quantity',
      'new_quantity',
      'consumption_reason',
      'consumed_at'
    ];

    const rows = result.items.map((item) => ({
      line_number: item.line_number,
      usage_log_id: item.usage?.id || '',
      product_id: item.product_id,
      storage_location_id: item.storage_location_id,
      quantity: item.quantity,
      previous_quantity: item.stock?.previous_quantity ?? '',
      new_quantity: item.stock?.new_quantity ?? '',
      consumption_reason: item.usage?.consumption_reason || '',
      consumed_at: item.usage?.consumed_at || ''
    }));

    const escapeCell = (value: unknown) => {
      const raw = value === null || value === undefined ? '' : String(value);
      const safeRaw = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safeRaw.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escapeCell(row[header as keyof typeof row])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-usage-bulk-result-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section style={styles.card}>
      <OperationalSectionHeader
        iconPath="/inventory-usage"
        title={ui("Bulk usage recorder")}
        description={<>
          {ui("Record several consumption lines in one controlled transaction for events, housekeeping carts, maintenance jobs, waste rounds, or department issue sheets.")}{selectedTemplate ? ` ${ui("Loaded template:")} ${selectedTemplate.name}.` : ""}
        </>}
        actions={<span style={styles.filterPill}>{formatNumber(validLineCount, 0)} {ui("valid lines")}</span>}
      />

      <div style={styles.filterGrid}>
        <label style={styles.fieldLabel}>
          {ui("Default reason")}<select style={styles.input} value={sharedReason} onChange={(event) => setSharedReason(event.target.value)}>
            {USAGE_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label style={styles.fieldLabel}>
          {ui("Department / team")}<input style={styles.input} value={sharedDepartment} onChange={(event) => setSharedDepartment(event.target.value)} placeholder={ui("Housekeeping, kitchen, maintenance...")} />
        </label>
        <label style={styles.fieldLabel}>
          {ui("Event / job")}<input style={styles.input} value={sharedEventName} onChange={(event) => setSharedEventName(event.target.value)} placeholder={ui("Banquet A, Room 204 repair...")} />
        </label>
        <label style={styles.fieldLabel}>
          {ui("Consumed at")}<input type="datetime-local" style={styles.input} value={consumedAt} onChange={(event) => setConsumedAt(event.target.value)} />
        </label>
        <label style={styles.fieldLabel}>
          {ui("Shared notes")}<input style={styles.input} value={sharedNotes} onChange={(event) => setSharedNotes(event.target.value)} placeholder={ui("Optional batch/context note")} />
        </label>
        <label style={styles.fieldLabel}>
          {ui("Reference type")}<input style={styles.input} value={sharedReferenceType} onChange={(event) => setSharedReferenceType(event.target.value)} placeholder={"event, work_order, requisition..."} />
        </label>
        <label style={styles.fieldLabel}>
          {ui("Reference ID")}<input style={styles.input} value={sharedReferenceId} onChange={(event) => setSharedReferenceId(event.target.value)} placeholder={ui("Optional linked record UUID")} />
        </label>
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={sharedMissingEvidenceAcknowledged}
            onChange={(event) => setSharedMissingEvidenceAcknowledged(event.target.checked)}
          />
          {ui("Acknowledge damage/waste lines without evidence metadata")}</label>
      </div>


      <div style={styles.importPanel}>
        <div>
          <h3 style={styles.subsectionTitle}>{ui("Advanced: paste usage lines")}</h3>
          <p style={styles.sectionDescription}>
            {ui("For system exports or spreadsheet imports, paste rows as product_id, storage_location_id, quantity, reason, department, event_name, notes, reference_type, reference_id, missing_evidence_acknowledged. A header row is optional.")}</p>
        </div>
        <textarea
          style={styles.textarea}
          value={pasteImport}
          onChange={(event) => setPasteImport(event.target.value)}
          placeholder={"product_id,storage_location_id,quantity,reason,department,event_name,notes,reference_type,reference_id,missing_evidence_acknowledged"}
          rows={4}
        />
        <div style={styles.inlineActions}>
          <button type="button" style={styles.secondaryButton} onClick={handlePasteImport}>{ui("Replace lines from paste")}</button>
          <button type="button" style={styles.secondaryButton} onClick={handleAppendPasteImport}>{ui("Append valid pasted lines")}</button>
          <button type="button" style={styles.secondaryButton} onClick={() => { setPasteImport(''); setPasteImportError(''); }}>{ui("Clear paste box")}</button>
        </div>
        {pasteImportError ? <p style={styles.errorText}>{pasteImportError}</p> : null}
      </div>

      {lines.map((line, index) => (
        <div key={index} style={styles.bulkLineGrid}>
          <label style={styles.fieldLabel}>
            {ui("Product")}<select style={styles.input} value={line.product_id} onChange={(event) => updateLine(index, 'product_id', event.target.value)} disabled={optionsLoading}>
              <option value="">{ui("Select product")}</option>
              {productOptions.map((product) => (
                <option key={product.id} value={product.id}>{product.name}{product.unit ? ` · ${product.unit}` : ""}</option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {ui("Storage location")}<select style={styles.input} value={line.storage_location_id} onChange={(event) => updateLine(index, 'storage_location_id', event.target.value)} disabled={optionsLoading}>
              <option value="">{ui("Select location")}</option>
              {storageLocations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {ui("Quantity")}<input type="number" min="0" step="0.01" style={styles.input} value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} placeholder="0" />
          </label>
          <label style={styles.fieldLabel}>
            {ui("Line reason")}<select style={styles.input} value={line.consumption_reason} onChange={(event) => updateLine(index, 'consumption_reason', event.target.value)}>
              <option value="">{ui("Use default")}</option>
              {USAGE_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {ui("Line notes")}<input style={styles.input} value={line.notes} onChange={(event) => updateLine(index, 'notes', event.target.value)} placeholder={ui("Optional line note")} />
          </label>
          <label style={styles.fieldLabel}>
            {ui("Ref type")}<input style={styles.input} value={line.reference_type} onChange={(event) => updateLine(index, 'reference_type', event.target.value)} placeholder={ui("Use shared")} />
          </label>
          <label style={styles.fieldLabel}>
            {ui("Ref ID")}<input style={styles.input} value={line.reference_id} onChange={(event) => updateLine(index, 'reference_id', event.target.value)} placeholder={ui("Use shared")} />
          </label>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={Boolean(line.missing_evidence_acknowledged)}
              onChange={(event) => updateLine(index, 'missing_evidence_acknowledged', event.target.checked)}
            />
            {ui("Missing evidence acknowledged")}</label>
          <button type="button" style={styles.secondaryButton} onClick={() => removeLine(index)} disabled={lines.length === 1}>{ui("Remove")}</button>
        </div>
      ))}

      <div style={styles.bulkFooter}>
        <button type="button" style={styles.secondaryButton} onClick={addLine}>{ui("Add line")}</button>
        <button type="button" style={styles.secondaryButton} onClick={handlePreview} disabled={!onPreviewBulkUsage || previewing || recording || validLineCount === 0}>
          {previewing ? ui('Checking readiness...') : ui('Preview readiness')}
        </button>
        <button type="button" style={styles.primaryButton} onClick={handleSubmit} disabled={recording || previewResult?.can_record === false || validLineCount === 0}>
          {recording ? ui('Recording bulk usage...') : ui('Record bulk usage')}
        </button>
      </div>

      {previewError ? <p style={styles.errorText}>{ui("Bulk readiness failed: ")}{previewError.message}</p> : null}
      {previewResult ? (
        <div style={styles.importPanel}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.subsectionTitle}>{ui("Bulk readiness preview")}</h3>
              <p style={readinessTone}>
                {previewResult.message} · {formatNumber(previewResult.recordable_count, 0)} {ui("recordable · ")}{formatNumber(previewResult.blocked_count, 0)} {ui("blocked · ")}{formatNumber(previewResult.warning_count, 0)} {ui("warning(s).")}</p>
            </div>
            <div style={styles.heroActions}>
              {previewResult.lines?.length ? (
                <button type="button" style={styles.secondaryButton} onClick={handleExportBulkReadinessCsv}>
                  {ui("Export readiness CSV")}</button>
              ) : null}
              <span style={previewResult.can_record ? styles.successPill : styles.dangerPill}>{previewResult.can_record ? ui('Ready') : ui('Blocked')}</span>
            </div>
          </div>
          {previewResult.period_open === false && previewResult.period_closure ? (
            <p style={styles.errorText}>{ui("Usage period is closed for this timestamp. Closure: ")}{previewResult.period_closure.id || ui('recorded')}.</p>
          ) : null}
          {previewResult.lines?.length ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("Line")}</th>
                    <th style={styles.th}>{ui("Product")}</th>
                    <th style={styles.th}>{ui("Location")}</th>
                    <th style={styles.th}>{ui("Qty")}</th>
                    <th style={styles.th}>{ui("On Hand → Result")}</th>
                    <th style={styles.th}>{ui("Reserved")}</th>
                    <th style={styles.th}>{ui("Available After")}</th>
                    <th style={styles.th}>{ui("Evidence")}</th>
                    <th style={styles.th}>{ui("Readiness")}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.lines.slice(0, 10).map((line) => (
                    <tr key={String(line.line_number)}>
                      <td style={styles.td}>{line.line_number}</td>
                      <td style={styles.td}>{line.product_name || line.product_id}</td>
                      <td style={styles.td}>{line.storage_location_name || line.storage_location_id}</td>
                      <td style={styles.td}>{line.quantity}</td>
                      <td style={styles.td}>{formatNumber(line.current_quantity)} → {formatNumber(line.resulting_quantity)}</td>
                      <td style={styles.td}>{formatNumber(line.reserved_quantity)}</td>
                      <td style={styles.td}>{formatNumber(line.resulting_available_quantity)}</td>
                      <td style={styles.td}>
                        {line.requires_evidence_or_acknowledgement
                          ? line.missing_evidence_acknowledged ? ui('Acknowledged') : ui('Acknowledgement required')
                          : ui('Not required')}
                      </td>
                      <td style={styles.td}>
                        {line.can_record
                          ? ui("Ready")
                          : (line.blocking_reasons || []).map((reason) => formatBulkReadinessReason(reason, ui)).join(', ') || ui('Blocked')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewResult.lines.length > 10 ? <p style={styles.sectionDescription}>{ui("Showing 10 of ")}{formatNumber(previewResult.lines.length, 0)} {ui("readiness lines.")}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p style={styles.errorText}>{ui("Bulk usage failed: ")}{error.message}</p> : null}
      {result ? (
        <div style={styles.importPanel}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.subsectionTitle}>{ui("Bulk recording result")}</h3>
              <p style={styles.successText}>{result.message} · {formatNumber(result.usage_count, 0)} {ui("usage lines recorded.")}</p>
            </div>
            <div style={styles.heroActions}>
              {result.items?.length ? (
                <button type="button" style={styles.secondaryButton} onClick={handleExportBulkResultCsv}>
                  {ui("Export result CSV")}</button>
              ) : null}
              <span style={styles.successPill}>{ui("Recorded")}</span>
            </div>
          </div>
          {result.items?.length ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("Line")}</th>
                    <th style={styles.th}>{ui("Product")}</th>
                    <th style={styles.th}>{ui("Location")}</th>
                    <th style={styles.th}>{ui("Qty")}</th>
                    <th style={styles.th}>{ui("Balance impact")}</th>
                    <th style={styles.th}>{ui("Usage log")}</th>
                    <th style={styles.th}>{ui("Reason")}</th>
                    <th style={styles.th}>{ui("Consumed at")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={`${item.line_number}-${item.usage?.id || item.product_id}`}>
                      <td style={styles.td}>{item.line_number}</td>
                      <td style={styles.td}>{productOptions.find((product) => product.id === item.product_id)?.name || item.product_id}</td>
                      <td style={styles.td}>{storageLocations.find((location) => location.id === item.storage_location_id)?.name || item.storage_location_id}</td>
                      <td style={styles.td}>{item.quantity}</td>
                      <td style={styles.td}>
                        {formatNumber(item.stock?.previous_quantity)} → {formatNumber(item.stock?.new_quantity)}
                      </td>
                      <td style={styles.td}>{item.usage?.id || '—'}</td>
                      <td style={styles.td}>{item.usage?.consumption_reason || '—'}</td>
                      <td style={styles.td}>{formatDateTimeLocal(item.usage?.consumed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
