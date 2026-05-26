import { useMemo, useState } from 'react';

import { USAGE_REASON_OPTIONS } from './inventoryUsageConfig';
import { formatDateTime, formatUsageReason, toNumber } from './inventoryUsageFormatting';
import { styles } from './inventoryUsageStyles';
import type { InventoryUsageTemplate, InventoryUsageTemplateConsumeResponse, InventoryUsageTemplateDraft, InventoryUsageTemplateLine, InventoryUsageTemplateReadiness } from './inventoryUsageTypes';

const createBlankLine = (): InventoryUsageTemplateLine => ({
  product_id: '',
  storage_location_id: '',
  quantity: '',
  consumption_reason: '',
  notes: ''
});

type InventoryUsageTemplatesPanelProps = {
  templates: InventoryUsageTemplate[];
  loading: boolean;
  error?: Error | null;
  creating: boolean;
  createError?: Error | null;
  archivingTemplateId?: string | null;
  archiveError?: Error | null;
  recordingTemplateId?: string | null;
  recordError?: Error | null;
  recordResult?: InventoryUsageTemplateConsumeResponse | null;
  templateReadinessById?: Record<string, InventoryUsageTemplateReadiness>;
  canManageTemplates?: boolean;
  canRecordTemplates?: boolean;
  onCreateTemplate: (draft: InventoryUsageTemplateDraft) => void;
  onUseTemplate: (template: InventoryUsageTemplate) => void;
  onArchiveTemplate: (template: InventoryUsageTemplate) => void;
  onRecordTemplate: (template: InventoryUsageTemplate) => void;
};

export function InventoryUsageTemplatesPanel({
  templates,
  loading,
  error,
  creating,
  createError,
  archivingTemplateId,
  archiveError,
  recordingTemplateId,
  recordError,
  recordResult,
  templateReadinessById = {},
  onCreateTemplate,
  onUseTemplate,
  onArchiveTemplate,
  onRecordTemplate,
  canManageTemplates = true,
  canRecordTemplates = true
}: InventoryUsageTemplatesPanelProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [eventName, setEventName] = useState('');
  const [reason, setReason] = useState('internal_use');
  const [notes, setNotes] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('');
  const [scheduleInterval, setScheduleInterval] = useState('1');
  const [nextRunAt, setNextRunAt] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [lines, setLines] = useState<InventoryUsageTemplateLine[]>([createBlankLine()]);

  const validLineCount = useMemo(() => {
    return lines.filter((line) => line.product_id.trim() && line.storage_location_id.trim() && Number(line.quantity) > 0).length;
  }, [lines]);

  const updateLine = (index: number, field: keyof InventoryUsageTemplateLine, value: string) => {
    setLines((current) => current.map((line, lineIndex) => (
      lineIndex === index ? { ...line, [field]: value } : line
    )));
  };

  const addLine = () => setLines((current) => [...current, createBlankLine()]);

  const removeLine = (index: number) => {
    setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index));
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setDepartment('');
    setEventName('');
    setReason('internal_use');
    setNotes('');
    setScheduleFrequency('');
    setScheduleInterval('1');
    setNextRunAt('');
    setScheduleEnabled(false);
    setLines([createBlankLine()]);
  };

  const handleCreate = () => {
    const items = lines.filter((line) => line.product_id.trim() && line.storage_location_id.trim() && Number(line.quantity) > 0);

    if (!name.trim()) {
      window.alert('Template name is required.');
      return;
    }

    if (!items.length) {
      window.alert('Add at least one valid template line.');
      return;
    }

    onCreateTemplate({
      name: name.trim(),
      description: description.trim() || undefined,
      department: department.trim() || undefined,
      event_name: eventName.trim() || undefined,
      consumption_reason: reason || undefined,
      notes: notes.trim() || undefined,
      schedule_frequency: scheduleFrequency || undefined,
      schedule_interval: scheduleFrequency ? Number(scheduleInterval || 1) : undefined,
      next_run_at: nextRunAt || undefined,
      schedule_is_active: Boolean(scheduleFrequency && scheduleEnabled),
      items: items.map((line) => ({
        product_id: line.product_id.trim(),
        storage_location_id: line.storage_location_id.trim(),
        quantity: Number(line.quantity),
        consumption_reason: line.consumption_reason || undefined,
        notes: line.notes.trim() || undefined
      }))
    });

    resetForm();
  };

  return (
    <section style={styles.card}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Usage templates</h2>
          <p style={styles.sectionDescription}>
            Save repeatable consumption packs for recurring jobs, events, housekeeping carts, waste rounds,
            or maintenance kits, then load them into the bulk recorder.
          </p>
        </div>
        <span style={styles.filterPill}>{templates.length} templates</span>
      </div>

      <div style={styles.templateGrid}>
        <div style={styles.templateBuilderCard}>
          <h3 style={styles.subsectionTitle}>Create reusable template</h3>
          <div style={styles.filterGrid}>
            <label style={styles.fieldLabel}>
              Template name
              <input style={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Banquet setup, room turnover, maintenance kit..." />
            </label>
            <label style={styles.fieldLabel}>
              Default reason
              <select style={styles.input} value={reason} onChange={(event) => setReason(event.target.value)}>
                {USAGE_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Department / team
              <input style={styles.input} value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Optional owner" />
            </label>
            <label style={styles.fieldLabel}>
              Event / job
              <input style={styles.input} value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Optional repeatable context" />
            </label>
            <label style={styles.fieldLabel}>
              Description
              <input style={styles.input} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="When staff should use this template" />
            </label>
            <label style={styles.fieldLabel}>
              Notes
              <input style={styles.input} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Default notes copied into usage" />
            </label>
            <label style={styles.fieldLabel}>
              Schedule frequency
              <select style={styles.input} value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value)}>
                <option value="">No schedule</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Schedule interval
              <input type="number" min="1" max="365" style={styles.input} value={scheduleInterval} onChange={(event) => setScheduleInterval(event.target.value)} disabled={!scheduleFrequency} />
            </label>
            <label style={styles.fieldLabel}>
              Next run
              <input type="datetime-local" style={styles.input} value={nextRunAt} onChange={(event) => setNextRunAt(event.target.value)} disabled={!scheduleFrequency} />
            </label>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={scheduleEnabled} onChange={(event) => setScheduleEnabled(event.target.checked)} disabled={!scheduleFrequency} />
              Activate schedule
            </label>
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
              <button type="button" style={styles.secondaryButton} onClick={() => removeLine(index)} disabled={lines.length === 1}>Remove</button>
            </div>
          ))}

          <div style={styles.bulkFooter}>
            <button type="button" style={styles.secondaryButton} onClick={addLine}>Add template line</button>
            <button type="button" style={styles.primaryButton} onClick={handleCreate} disabled={creating || !name.trim() || validLineCount === 0}>
              {creating ? 'Saving template...' : 'Save usage template'}
            </button>
          </div>
          {createError ? <p style={styles.errorText}>Template save failed: {createError.message}</p> : null}
          {archiveError ? <p style={styles.errorText}>Template archive failed: {archiveError.message}</p> : null}
          {recordError ? <p style={styles.errorText}>Template recording failed: {recordError.message}</p> : null}
          {recordResult ? <p style={styles.successText}>{recordResult.message} · {recordResult.usage_count} lines recorded.</p> : null}
        </div>

        <div style={styles.templateListCard}>
          <h3 style={styles.subsectionTitle}>Saved templates</h3>
          {loading ? (
            <p style={styles.sectionDescription}>Loading usage templates...</p>
          ) : error ? (
            <p style={styles.errorText}>Failed to load usage templates: {error.message}</p>
          ) : !templates.length ? (
            <p style={styles.emptyState}>No templates saved yet.</p>
          ) : (
            <div style={styles.templateList}>
              {templates.map((template) => {
                const readiness = templateReadinessById[template.id];
                const canRecord = readiness?.summary?.can_record !== false;
                const blockedCount = toNumber(readiness?.summary?.missing_stock_row_count) + toNumber(readiness?.summary?.insufficient_stock_count);
                const warningCount = toNumber(readiness?.summary?.below_minimum_after_use_count);

                return (
                <div key={template.id} style={styles.templateCard}>
                  <div>
                    <strong>{template.name}</strong>
                    <p style={styles.templateMeta}>
                      {formatUsageReason(template.consumption_reason)} · {template.department || 'No department'} · {template.items?.length || 0} lines
                    </p>
                    {template.description ? <p style={styles.sectionDescription}>{template.description}</p> : null}
                    <small style={styles.mutedText}>
                      {template.items?.reduce((sum, item) => sum + toNumber(item.quantity), 0)} total planned quantity
                    </small>
                    <div style={styles.templateMetrics}>
                      <span style={canRecord ? styles.successPill : styles.dangerPill}>
                        {canRecord ? 'Stock-ready' : 'Blocked by stock'}
                      </span>
                      {blockedCount > 0 ? <span style={styles.dangerPill}>{blockedCount} blocked lines</span> : null}
                      {warningCount > 0 ? <span style={styles.warningPill}>{warningCount} below min after use</span> : null}
                    </div>
                    <div style={styles.templateMetrics}>
                      <span style={styles.filterPill}>{toNumber(template.use_count)} runs</span>
                      <span style={styles.filterPill}>
                        Last used: {template.last_used_at ? formatDateTime(template.last_used_at) : 'Never'}
                      </span>
                      {template.last_used_by_user_name ? (
                        <span style={styles.filterPill}>By {template.last_used_by_user_name}</span>
                      ) : null}
                    </div>
                  </div>
                  <div style={styles.templateActions}>
                    <button type="button" style={styles.secondaryButton} onClick={() => onUseTemplate(template)}>
                      Load into recorder
                    </button>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={() => onRecordTemplate(template)}
                      disabled={!canRecordTemplates || recordingTemplateId === template.id || !(template.items?.length) || !canRecord}
                    >
                      {recordingTemplateId === template.id ? 'Recording...' : 'Record now'}
                    </button>
                    <button
                      type="button"
                      style={styles.dangerButton}
                      onClick={() => onArchiveTemplate(template)}
                      disabled={!canManageTemplates || archivingTemplateId === template.id}
                    >
                      {archivingTemplateId === template.id ? 'Archiving...' : 'Archive'}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
