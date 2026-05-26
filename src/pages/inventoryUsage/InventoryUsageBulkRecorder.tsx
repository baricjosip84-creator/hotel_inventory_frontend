import { useEffect, useMemo, useState } from 'react';

import { USAGE_REASON_OPTIONS } from './inventoryUsageConfig';
import { styles } from './inventoryUsageStyles';
import type { InventoryUsageBulkLine, InventoryUsageBulkResponse, InventoryUsageTemplate } from './inventoryUsageTypes';

const createBlankLine = (): InventoryUsageBulkLine => ({
  product_id: '',
  storage_location_id: '',
  quantity: '',
  consumption_reason: '',
  department: '',
  event_name: '',
  notes: '',
  reference_type: '',
  reference_id: ''
});

type InventoryUsageBulkRecorderProps = {
  selectedTemplate?: InventoryUsageTemplate | null;
  recording: boolean;
  error?: Error | null;
  result?: InventoryUsageBulkResponse | null;
  onRecordBulkUsage: (payload: {
    consumption_reason?: string;
    department?: string;
    event_name?: string;
    notes?: string;
    consumed_at?: string;
    reference_type?: string;
    reference_id?: string;
    items: InventoryUsageBulkLine[];
  }) => void;
};

export function InventoryUsageBulkRecorder({
  selectedTemplate,
  recording,
  error,
  result,
  onRecordBulkUsage
}: InventoryUsageBulkRecorderProps) {
  const [sharedReason, setSharedReason] = useState('internal_use');
  const [sharedDepartment, setSharedDepartment] = useState('');
  const [sharedEventName, setSharedEventName] = useState('');
  const [sharedNotes, setSharedNotes] = useState('');
  const [sharedReferenceType, setSharedReferenceType] = useState('');
  const [sharedReferenceId, setSharedReferenceId] = useState('');
  const [consumedAt, setConsumedAt] = useState('');
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
      reference_id: selectedTemplate.id || ''
    })) || [createBlankLine()]);
  }, [selectedTemplate]);

  const validLineCount = useMemo(() => {
    return lines.filter((line) => line.product_id.trim() && line.storage_location_id.trim() && Number(line.quantity) > 0).length;
  }, [lines]);


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
        reference_id: cells[8] || ''
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

  const updateLine = (index: number, field: keyof InventoryUsageBulkLine, value: string) => {
    setLines((current) => current.map((line, lineIndex) => (
      lineIndex === index ? { ...line, [field]: value } : line
    )));
  };

  const addLine = () => setLines((current) => [...current, createBlankLine()]);

  const removeLine = (index: number) => {
    setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index));
  };

  const handleSubmit = () => {
    const items = lines.filter((line) => line.product_id.trim() && line.storage_location_id.trim() && Number(line.quantity) > 0);

    if (!items.length) {
      window.alert('Add at least one valid usage line with product ID, location ID, and quantity.');
      return;
    }

    onRecordBulkUsage({
      consumption_reason: sharedReason || undefined,
      department: sharedDepartment.trim() || undefined,
      event_name: sharedEventName.trim() || undefined,
      notes: sharedNotes.trim() || undefined,
      consumed_at: consumedAt || undefined,
      reference_type: sharedReferenceType.trim() || undefined,
      reference_id: sharedReferenceId.trim() || undefined,
      items
    });
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
      </div>


      <div style={styles.importPanel}>
        <div>
          <h3 style={styles.subsectionTitle}>Paste usage lines</h3>
          <p style={styles.sectionDescription}>
            Paste CSV or spreadsheet rows as product_id, storage_location_id, quantity, reason, department,
            event_name, notes, reference_type, reference_id. A header row is optional.
          </p>
        </div>
        <textarea
          style={styles.textarea}
          value={pasteImport}
          onChange={(event) => setPasteImport(event.target.value)}
          placeholder="product_id,storage_location_id,quantity,reason,department,event_name,notes,reference_type,reference_id"
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
          <button type="button" style={styles.secondaryButton} onClick={() => removeLine(index)} disabled={lines.length === 1}>Remove</button>
        </div>
      ))}

      <div style={styles.bulkFooter}>
        <button type="button" style={styles.secondaryButton} onClick={addLine}>Add line</button>
        <button type="button" style={styles.primaryButton} onClick={handleSubmit} disabled={recording || validLineCount === 0}>
          {recording ? 'Recording bulk usage...' : 'Record bulk usage'}
        </button>
      </div>

      {error ? <p style={styles.errorText}>Bulk usage failed: {error.message}</p> : null}
      {result ? <p style={styles.successText}>{result.message} · {result.usage_count} usage lines recorded.</p> : null}
    </section>
  );
}
