import type { FormEvent } from 'react';
import { DataTable, InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../../i18n/formatters';
import type { NotificationDelivery, NotificationDeliveryForm, NotificationEvent } from '../EnterpriseInventoryTypes';

type NotificationsTabProps = {
  notificationDeliveryForm: NotificationDeliveryForm;
  notifications: NotificationEvent[];
  deliveries: NotificationDelivery[];
  isLoading: boolean;
  deliveriesLoading: boolean;
  isQueueingDelivery: boolean;
  onNotificationDeliveryFormChange: (updater: (current: NotificationDeliveryForm) => NotificationDeliveryForm) => void;
  onNotificationDeliverySubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type Ui = (englishText: string) => string;

const tokenLabels: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  critical: 'Critical',
  in_app: 'In-app',
  email: 'Email',
  webhook: 'Webhook',
  queued: 'Queued',
  processing: 'Processing',
  delivered: 'Delivered',
  failed: 'Failed',
  approval_action: 'Approval action',
  attachment_added: 'Attachment added',
  cycle_count_reconciled: 'Cycle count reconciled',
  cycle_count_submitted: 'Cycle count submitted',
  department_requisition_created: 'Department requisition created',
  department_requisition_submitted: 'Department requisition submitted',
  invoice_variance_detected: 'Invoice variance detected',
  low_stock_par_level: 'Low-stock par-level signal',
  supplier_return_created: 'Supplier return created',
  supplier_return_dispatched: 'Supplier return dispatched',
  purchase_order: 'Purchase order',
  supplier_invoice: 'Supplier invoice',
  department_requisition: 'Department requisition',
  cycle_count: 'Cycle count',
  supplier_return: 'Supplier return',
  attachment: 'Attachment',
  barcode_label: 'Barcode label',
};

const displayToken = (value: string | null | undefined, ui: Ui) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '—';
  return tokenLabels[normalized] ? ui(tokenLabels[normalized]) : normalized;
};

const deliveryDestinationLabel = (channel: string, ui: Ui) => {
  if (channel === 'email') return ui('Recipient email');
  if (channel === 'webhook') return ui('Webhook HTTPS URL');
  return ui('Recipient (optional)');
};

const deliveryStatusLabel = (delivery: NotificationDelivery, ui: Ui) => {
  if (delivery.status === 'queued' && delivery.attempts && Number(delivery.attempts) > 0) return ui('Retrying');
  return displayToken(delivery.status, ui);
};

const tenantFacingNotificationDescription = (item: NotificationEvent, ui: Ui) => {
  const entityLabel = item.entity_type ? displayToken(item.entity_type, ui) : '';
  const normalizedTitle = String(item.title || '').trim();
  const lowerTitle = normalizedTitle.toLowerCase();

  if (item.event_type === 'approval_action' && entityLabel) {
    if (lowerTitle.includes('approved')) return ui('{entity} was approved.').replace('{entity}', entityLabel);
    if (lowerTitle.includes('rejected')) return ui('{entity} was rejected.').replace('{entity}', entityLabel);
    return ui('{entity} approval status changed.').replace('{entity}', entityLabel);
  }

  // Backend-generated notification titles remain raw by multilingual-project policy.
  if (normalizedTitle) return normalizedTitle;
  const eventLabel = displayToken(item.event_type, ui);
  return eventLabel === '—' ? ui('Inventory notification recorded.') : eventLabel;
};

export function NotificationsTab({
  notificationDeliveryForm,
  notifications,
  deliveries,
  isLoading,
  deliveriesLoading,
  isQueueingDelivery,
  onNotificationDeliveryFormChange,
  onNotificationDeliverySubmit
}: NotificationsTabProps) {
  const { locale, ui } = useAppTranslation();
  const canWriteNotifications = hasPermission(TENANT_PERMISSIONS.NOTIFICATIONS_WRITE);
  const destinationRequired = notificationDeliveryForm.channel === 'email' || notificationDeliveryForm.channel === 'webhook';
  const queueDisabled = isQueueingDelivery || !canWriteNotifications || !notificationDeliveryForm.notification_event_id || !notificationDeliveryForm.channel || (destinationRequired && !notificationDeliveryForm.recipient.trim());

  return (
    <section style={styles.stack}>
      <div className="inventory-controls-grid" style={styles.grid}>
        <form onSubmit={onNotificationDeliverySubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('Queue notification delivery')}</h2>
          <p style={{ ...styles.helper, marginBottom: 12 }}>
            {ui('Choose an event and where it should be delivered. Email and webhook delivery use the notification settings configured for this tenant.')}
          </p>
          <SelectField
            label={ui('Notification event')}
            value={notificationDeliveryForm.notification_event_id}
            onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, notification_event_id: value }))}
            options={notifications.map((event) => ({ value: event.id, label: `${displayToken(event.severity, ui)}: ${tenantFacingNotificationDescription(event, ui)}` }))}
            required
            disabled={!canWriteNotifications}
          />
          <SelectField
            label={ui('Channel')}
            value={notificationDeliveryForm.channel}
            onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, channel: value, recipient: value === 'in_app' ? '' : current.recipient }))}
            options={[
              { value: 'in_app', label: ui('In-app') },
              { value: 'email', label: ui('Email') },
              { value: 'webhook', label: ui('Webhook') }
            ]}
            required
            disabled={!canWriteNotifications}
          />
          <InputField
            label={deliveryDestinationLabel(notificationDeliveryForm.channel, ui)}
            type={notificationDeliveryForm.channel === 'email' ? 'email' : 'text'}
            value={notificationDeliveryForm.recipient}
            onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, recipient: value }))}
            required={destinationRequired}
            disabled={!canWriteNotifications || notificationDeliveryForm.channel === 'in_app'}
          />
          <button type="submit" disabled={queueDisabled} style={queueDisabled ? styles.disabledButton : styles.primaryButton} title={!canWriteNotifications ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.NOTIFICATIONS_WRITE) : undefined}>{ui('Queue delivery')}</button>
        </form>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('Delivery history')}</h2>
          <DataTable
            loading={deliveriesLoading}
            empty={ui('No notification deliveries have been queued yet.')}
            headers={['Status', 'Channel', 'Event', 'Recipient', 'Attempts', 'Last result', 'Created'].map(ui)}
            rows={deliveries.map((item) => [
              deliveryStatusLabel(item, ui),
              displayToken(item.channel, ui),
              item.title || displayToken(item.event_type, ui) || item.notification_event_id,
              item.recipient || '—',
              `${formatLocalizedNumber(Number(item.attempts || 0), locale)}/${Number(item.max_attempts || 0) ? formatLocalizedNumber(Number(item.max_attempts), locale) : '—'}`,
              item.last_error || (item.response_status ? `HTTP ${item.response_status}` : item.delivered_at ? ui('Delivered {date}').replace('{date}', formatLocalizedDateTime(item.delivered_at, locale)) : item.next_attempt_at ? ui('Next {date}').replace('{date}', formatLocalizedDateTime(item.next_attempt_at, locale)) : '—'),
              formatLocalizedDateTime(item.created_at, locale)
            ])}
          />
        </section>
      </div>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Notification events')}</h2>
        <DataTable
          loading={isLoading}
          empty={ui('No notification events yet.')}
          headers={['Severity', 'Event', 'Description', 'Created'].map(ui)}
          rows={notifications.map((item) => [
            displayToken(item.severity, ui),
            displayToken(item.event_type, ui),
            tenantFacingNotificationDescription(item, ui),
            formatLocalizedDateTime(item.created_at, locale)
          ])}
        />
      </section>
    </section>
  );
}
