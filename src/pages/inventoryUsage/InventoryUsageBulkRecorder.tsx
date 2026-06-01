import { useEffect, useMemo, useState } from 'react';

import { USAGE_REASON_OPTIONS } from './inventoryUsageConfig';
import { styles } from './inventoryUsageStyles';
import type { InventoryUsageBulkLine, InventoryUsageBulkReadinessResponse, InventoryUsageBulkResponse, InventoryUsageTemplate } from './inventoryUsageTypes';

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
  previewing = false,
  previewError,
  previewResult,
  recording,
  error,
  result,
  onPreviewBulkUsage,
  onRecordBulkUsage
}: InventoryUsageBulkRecorderProps) {
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
      setPasteImportError('Paste at least one line with product_id, storage_location_id, and quantity.');
      return;
    }

    const invalidLine = importedLines.find((line) => !line.product_id.trim() || !line.storage_location_id.trim() || Number(line.quantity) <= 0);

    if (invalidLine) {
      setPasteImportError('Every imported line needs product_id, storage_location_id, and a quantity greater than zero.');
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
      setPasteImportError('Paste at least one line before appending.');
      return;
    }

    const validImportedLines = importedLines.filter((line) => line.product_id.trim() && line.storage_location_id.trim() && Number(line.quantity) > 0);

    if (!validImportedLines.length) {
      setPasteImportError('No valid imported lines found. Required columns are product_id, storage_location_id, quantity.');
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
      window.alert('Add at least one valid usage line with product ID, location ID, and quantity.');
      return;
    }

    onPreviewBulkUsage?.(payload);
  };

  const handleSubmit = () => {
    const payload = buildBulkPayload();

    if (!payload.items.length) {
      window.alert('Add at least one valid usage line with product ID, location ID, and quantity.');
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
      'resulting_quantity',
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
      resulting_quantity: line.resulting_quantity ?? '',
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
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Bulk usage recorder</h2>
          <p style={styles.sectionDescription}>
            Record several consumption lines in one controlled transaction for events, housekeeping carts,
            maintenance jobs, waste rounds, or department issue sheets.
            {selectedTemplate ? ` Loaded template: ${selectedTemplate.name}.` : ''}
          </p>
        </div>
        <span style={styles.filterPill}>{validLineCount} valid lines</span>
      </div>

      <div style={styles.filterGrid}>
        <label style={styles.fieldLabel}>
          Default reason
          <select style={styles.input} value={sharedReason} onChange={(event) => setSharedReason(event.target.value)}>
            {USAGE_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label style={styles.fieldLabel}>
          Department / team
          <input style={styles.input} value={sharedDepartment} onChange={(event) => setSharedDepartment(event.target.value)} placeholder="Housekeeping, kitchen, maintenance..." />
        </label>
        <label style={styles.fieldLabel}>
          Event / job
          <input style={styles.input} value={sharedEventName} onChange={(event) => setSharedEventName(event.target.value)} placeholder="Banquet A, Room 204 repair..." />
        </label>
        <label style={styles.fieldLabel}>
          Consumed at
          <input type="datetime-local" style={styles.input} value={consumedAt} onChange={(event) => setConsumedAt(event.target.value)} />
        </label>
        <label style={styles.fieldLabel}>
          Shared notes
          <input style={styles.input} value={sharedNotes} onChange={(event) => setSharedNotes(event.target.value)} placeholder="Optional batch/context note" />
        </label>
        <label style={styles.fieldLabel}>
          Reference type
          <input style={styles.input} value={sharedReferenceType} onChange={(event) => setSharedReferenceType(event.target.value)} placeholder="event, work_order, requisition..." />
        </label>
        <label style={styles.fieldLabel}>
          Reference ID
          <input style={styles.input} value={sharedReferenceId} onChange={(event) => setSharedReferenceId(event.target.value)} placeholder="Optional linked record UUID" />
        </label>
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={sharedMissingEvidenceAcknowledged}
            onChange={(event) => setSharedMissingEvidenceAcknowledged(event.target.checked)}
          />
          Acknowledge damage/waste lines without evidence metadata
        </label>
      </div>


      <div style={styles.importPanel}>
        <div>
          <h3 style={styles.subsectionTitle}>Paste usage lines</h3>
          <p style={styles.sectionDescription}>
            Paste CSV or spreadsheet rows as product_id, storage_location_id, quantity, reason, department,
            event_name, notes, reference_type, reference_id, missing_evidence_acknowledged. A header row is optional.
          </p>
        </div>
        <textarea
          style={styles.textarea}
          value={pasteImport}
          onChange={(event) => setPasteImport(event.target.value)}
          placeholder="product_id,storage_location_id,quantity,reason,department,event_name,notes,reference_type,reference_id,missing_evidence_acknowledged"
          rows={4}
        />
        <div style={styles.inlineActions}>
          <button type="button" style={styles.secondaryButton} onClick={handlePasteImport}>Replace lines from paste</button>
          <button type="button" style={styles.secondaryButton} onClick={handleAppendPasteImport}>Append valid pasted lines</button>
          <button type="button" style={styles.secondaryButton} onClick={() => { setPasteImport(''); setPasteImportError(''); }}>Clear paste box</button>
        </div>
        {pasteImportError ? <p style={styles.errorText}>{pasteImportError}</p> : null}
      </div>

      {lines.map((line, index) => (
        <div key={index} style={styles.bulkLineGrid}>
          <label style={styles.fieldLabel}>
            Product ID
            <input style={styles.input} value={line.product_id} onChange={(event) => updateLine(index, 'product_id', event.target.value)} placeholder="Product UUID" />
          </label>
          <label style={styles.fieldLabel}>
            Location ID
            <input style={styles.input} value={line.storage_location_id} onChange={(event) => updateLine(index, 'storage_location_id', event.target.value)} placeholder="Location UUID" />
          </label>
          <label style={styles.fieldLabel}>
            Quantity
            <input type="number" min="0" step="0.01" style={styles.input} value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} placeholder="0" />
          </label>
          <label style={styles.fieldLabel}>
            Line reason
            <select style={styles.input} value={line.consumption_reason} onChange={(event) => updateLine(index, 'consumption_reason', event.target.value)}>
              <option value="">Use default</option>
              {USAGE_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            Line notes
            <input style={styles.input} value={line.notes} onChange={(event) => updateLine(index, 'notes', event.target.value)} placeholder="Optional line note" />
          </label>
          <label style={styles.fieldLabel}>
            Ref type
            <input style={styles.input} value={line.reference_type} onChange={(event) => updateLine(index, 'reference_type', event.target.value)} placeholder="Use shared" />
          </label>
          <label style={styles.fieldLabel}>
            Ref ID
            <input style={styles.input} value={line.reference_id} onChange={(event) => updateLine(index, 'reference_id', event.target.value)} placeholder="Use shared" />
          </label>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={Boolean(line.missing_evidence_acknowledged)}
              onChange={(event) => updateLine(index, 'missing_evidence_acknowledged', event.target.checked)}
            />
            Missing evidence acknowledged
          </label>
          <button type="button" style={styles.secondaryButton} onClick={() => removeLine(index)} disabled={lines.length === 1}>Remove</button>
        </div>
      ))}

      <div style={styles.bulkFooter}>
        <button type="button" style={styles.secondaryButton} onClick={addLine}>Add line</button>
        <button type="button" style={styles.secondaryButton} onClick={handlePreview} disabled={!onPreviewBulkUsage || previewing || recording || validLineCount === 0}>
          {previewing ? 'Checking readiness...' : 'Preview readiness'}
        </button>
        <button type="button" style={styles.primaryButton} onClick={handleSubmit} disabled={recording || previewResult?.can_record === false || validLineCount === 0}>
          {recording ? 'Recording bulk usage...' : 'Record bulk usage'}
        </button>
      </div>

      {previewError ? <p style={styles.errorText}>Bulk readiness failed: {previewError.message}</p> : null}
      {previewResult ? (
        <div style={styles.importPanel}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.subsectionTitle}>Bulk readiness preview</h3>
              <p style={readinessTone}>
                {previewResult.message} · {previewResult.recordable_count} recordable · {previewResult.blocked_count} blocked · {previewResult.warning_count} warning(s).
              </p>
            </div>
            <div style={styles.heroActions}>
              {previewResult.lines?.length ? (
                <button type="button" style={styles.secondaryButton} onClick={handleExportBulkReadinessCsv}>
                  Export readiness CSV
                </button>
              ) : null}
              <span style={previewResult.can_record ? styles.successPill : styles.dangerPill}>{previewResult.can_record ? 'Ready' : 'Blocked'}</span>
            </div>
          </div>
          {previewResult.period_open === false && previewResult.period_closure ? (
            <p style={styles.errorText}>Usage period is closed for this timestamp. Closure: {previewResult.period_closure.id || 'recorded'}.</p>
          ) : null}
          {previewResult.lines?.length ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Line</th>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Current → Result</th>
                    <th style={styles.th}>Evidence</th>
                    <th style={styles.th}>Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.lines.slice(0, 10).map((line) => (
                    <tr key={String(line.line_number)}>
                      <td style={styles.td}>{line.line_number}</td>
                      <td style={styles.td}>{line.product_name || line.product_id}</td>
                      <td style={styles.td}>{line.storage_location_name || line.storage_location_id}</td>
                      <td style={styles.td}>{line.quantity}</td>
                      <td style={styles.td}>{line.current_quantity ?? '—'} → {line.resulting_quantity ?? '—'}</td>
                      <td style={styles.td}>
                        {line.requires_evidence_or_acknowledgement
                          ? line.missing_evidence_acknowledged ? 'Acknowledged' : 'Acknowledgement required'
                          : 'Not required'}
                      </td>
                      <td style={styles.td}>{line.can_record ? 'Ready' : (line.blocking_reasons || []).join(', ') || 'Blocked'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewResult.lines.length > 10 ? <p style={styles.sectionDescription}>Showing 10 of {previewResult.lines.length} readiness lines.</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p style={styles.errorText}>Bulk usage failed: {error.message}</p> : null}
      {result ? (
        <div style={styles.importPanel}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.subsectionTitle}>Bulk recording result</h3>
              <p style={styles.successText}>{result.message} · {result.usage_count} usage lines recorded.</p>
            </div>
            <div style={styles.heroActions}>
              {result.items?.length ? (
                <button type="button" style={styles.secondaryButton} onClick={handleExportBulkResultCsv}>
                  Export result CSV
                </button>
              ) : null}
              <span style={styles.successPill}>Recorded</span>
            </div>
          </div>
          {result.items?.length ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Line</th>
                    <th style={styles.th}>Product ID</th>
                    <th style={styles.th}>Location ID</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Balance impact</th>
                    <th style={styles.th}>Usage log</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Consumed at</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={`${item.line_number}-${item.usage?.id || item.product_id}`}>
                      <td style={styles.td}>{item.line_number}</td>
                      <td style={styles.td}>{item.product_id}</td>
                      <td style={styles.td}>{item.storage_location_id}</td>
                      <td style={styles.td}>{item.quantity}</td>
                      <td style={styles.td}>
                        {item.stock?.previous_quantity ?? '—'} → {item.stock?.new_quantity ?? '—'}
                      </td>
                      <td style={styles.td}>{item.usage?.id || '—'}</td>
                      <td style={styles.td}>{item.usage?.consumption_reason || '—'}</td>
                      <td style={styles.td}>{item.usage?.consumed_at ? new Date(item.usage.consumed_at).toLocaleString() : '—'}</td>
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
