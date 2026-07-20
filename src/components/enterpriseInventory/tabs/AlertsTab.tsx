import type { FormEvent } from 'react';
import { InputField, MetricCard, SelectField, TextareaField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { emptyAlertFilters } from '../EnterpriseInventoryForms';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import type { AlertFilters, AlertForm, AlertItem, ProductOption } from '../EnterpriseInventoryTypes';

const ALERT_CODE_LABELS: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
  manual: 'Manual',
  low_stock: 'Low stock'
};

const formatAlertCodeLabel = (value: string | null | undefined): string => {
  if (!value) return '-';
  const normalized = value.toLowerCase();
  if (ALERT_CODE_LABELS[normalized]) return ALERT_CODE_LABELS[normalized];

  const label = value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase())
    .join(' ');

  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : '-';
};

type AlertsSummary = {
  unresolved: number;
  critical: number;
  unacknowledged: number;
};

type AlertsTabProps = {
  alertForm: AlertForm;
  alertFilters: AlertFilters;
  alertResolutionNotes: Record<string, string>;
  alerts: AlertItem[];
  alertsSummary: AlertsSummary;
  isLoading: boolean;
  products: ProductOption[];
  isCreatingAlert: boolean;
  isAcknowledgingAlert: boolean;
  isEscalatingAlert: boolean;
  isResolvingAlert: boolean;
  isReopeningAlert: boolean;
  onAlertFormChange: (updater: (current: AlertForm) => AlertForm) => void;
  onAlertFiltersChange: (updater: (current: AlertFilters) => AlertFilters) => void;
  onAlertResolutionNotesChange: (updater: (current: Record<string, string>) => Record<string, string>) => void;
  onAlertSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAcknowledgeAlert: (id: string) => void;
  onEscalateAlert: (id: string) => void;
  onResolveAlert: (input: { id: string; resolution_note: string }) => void;
  onReopenAlert: (id: string) => void;
};

export function AlertsTab({
  alertForm,
  alertFilters,
  alertResolutionNotes,
  alerts,
  alertsSummary,
  isLoading,
  products,
  isCreatingAlert,
  isAcknowledgingAlert,
  isEscalatingAlert,
  isResolvingAlert,
  isReopeningAlert,
  onAlertFormChange,
  onAlertFiltersChange,
  onAlertResolutionNotesChange,
  onAlertSubmit,
  onAcknowledgeAlert,
  onEscalateAlert,
  onResolveAlert,
  onReopenAlert
}: AlertsTabProps) {
  return (
    <section style={styles.grid}>
      <form onSubmit={onAlertSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Create manual alert</h2>
        <InputField label="Type" value={alertForm.type} onChange={(value) => onAlertFormChange((current) => ({ ...current, type: value }))} required />
        <SelectField
          label="Product"
          value={alertForm.product_id}
          onChange={(value) => onAlertFormChange((current) => ({ ...current, product_id: value }))}
          options={products.map((product) => ({ value: product.id, label: product.name }))}
        />
        <SelectField
          label="Severity"
          value={alertForm.severity}
          onChange={(value) => onAlertFormChange((current) => ({ ...current, severity: value }))}
          options={[
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' },
            { value: 'critical', label: 'Critical' }
          ]}
          required
        />
        <InputField label="Escalation level" type="number" min="0" value={alertForm.escalation_level} onChange={(value) => onAlertFormChange((current) => ({ ...current, escalation_level: value }))} />
        <TextareaField
          label="Message"
          value={alertForm.message}
          required
          rows={5}
          onChange={(value) => onAlertFormChange((current) => ({ ...current, message: value }))}
        />
        <button type="submit" disabled={isCreatingAlert} style={styles.primaryButton}>Create alert</button>
      </form>

      <section style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Alert filters</h2>
          <div style={styles.inlineGrid}>
            <SelectField
              label="Resolved"
              value={alertFilters.resolved}
              onChange={(value) => onAlertFiltersChange((current) => ({ ...current, resolved: value }))}
              options={[
                { value: 'false', label: 'Open' },
                { value: 'true', label: 'Resolved' }
              ]}
            />
            <SelectField
              label="Acknowledged"
              value={alertFilters.acknowledged}
              onChange={(value) => onAlertFiltersChange((current) => ({ ...current, acknowledged: value }))}
              options={[
                { value: 'false', label: 'Unacknowledged' },
                { value: 'true', label: 'Acknowledged' }
              ]}
            />
            <SelectField
              label="Severity"
              value={alertFilters.severity}
              onChange={(value) => onAlertFiltersChange((current) => ({ ...current, severity: value }))}
              options={[
                { value: 'info', label: 'Info' },
                { value: 'warning', label: 'Warning' },
                { value: 'critical', label: 'Critical' }
              ]}
            />
            <InputField label="Search" value={alertFilters.search} onChange={(value) => onAlertFiltersChange((current) => ({ ...current, search: value }))} />
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => onAlertFiltersChange(() => emptyAlertFilters)}>Reset filters</button>
          <div style={styles.statGrid}>
            <MetricCard label="Open alerts" value={alertsSummary.unresolved} />
            <MetricCard label="Critical open" value={alertsSummary.critical} />
            <MetricCard label="Unacknowledged" value={alertsSummary.unacknowledged} />
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Operational alerts</h2>
          {isLoading ? <p style={styles.helper}>Loading…</p> : alerts.length === 0 ? <p style={styles.helper}>No alerts match these filters.</p> : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Severity', 'Type', 'Product', 'Message', 'State', 'Created', 'Actions'].map((header) => <th key={header} style={styles.th}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td style={styles.td}>{formatAlertCodeLabel(alert.severity)}</td>
                      <td style={styles.td}>{formatAlertCodeLabel(alert.type)}</td>
                      <td style={styles.td}>{alert.product_name || '-'}</td>
                      <td style={styles.td}>{alert.message}</td>
                      <td style={styles.td}>{alert.resolved ? 'Resolved' : alert.acknowledged ? 'Acknowledged' : 'Open'}</td>
                      <td style={styles.td}>{formatDateTime(alert.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {!alert.acknowledged && !alert.resolved ? <button type="button" style={styles.smallButton} disabled={isAcknowledgingAlert} onClick={() => onAcknowledgeAlert(alert.id)}>Acknowledge</button> : null}
                          {!alert.resolved ? <button type="button" style={styles.smallButton} disabled={isEscalatingAlert} onClick={() => onEscalateAlert(alert.id)}>Escalate</button> : null}
                          {!alert.resolved ? (
                            <>
                              <input
                                style={styles.inlineInput}
                                placeholder="Resolution note"
                                value={alertResolutionNotes[alert.id] ?? ''}
                                onChange={(event) => onAlertResolutionNotesChange((current) => ({ ...current, [alert.id]: event.target.value }))}
                              />
                              <button type="button" style={styles.smallButton} disabled={isResolvingAlert} onClick={() => onResolveAlert({ id: alert.id, resolution_note: alertResolutionNotes[alert.id] ?? '' })}>Resolve</button>
                            </>
                          ) : <button type="button" style={styles.secondarySmallButton} disabled={isReopeningAlert} onClick={() => onReopenAlert(alert.id)}>Reopen</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </section>
  );
}
