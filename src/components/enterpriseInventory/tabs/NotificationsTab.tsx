import type { FormEvent } from 'react';
import { DataTable, InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import type { NotificationDelivery, NotificationDeliveryForm, NotificationEvent } from '../EnterpriseInventoryTypes';

type NotificationsTabProps = {
  notificationDeliveryForm: NotificationDeliveryForm;
  notifications: NotificationEvent[];
  deliveries: NotificationDelivery[];
  isLoading: boolean;
  deliveriesLoading: boolean;
  isQueueingDelivery: boolean;
  isProcessingDeliveries: boolean;
  onNotificationDeliveryFormChange: (updater: (current: NotificationDeliveryForm) => NotificationDeliveryForm) => void;
  onNotificationDeliverySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onProcessNotificationDeliveries: () => void;
};

const deliveryDestinationLabel = (channel: string) => {
  if (channel === 'email') return 'Recipient email';
  if (channel === 'webhook') return 'Webhook HTTPS URL';
  return 'Recipient (optional)';
};

const deliveryStatusLabel = (delivery: NotificationDelivery) => {
  if (delivery.status === 'queued' && delivery.attempts && Number(delivery.attempts) > 0) return 'Retrying';
  return delivery.status || '-';
};

export function NotificationsTab({
  notificationDeliveryForm,
  notifications,
  deliveries,
  isLoading,
  deliveriesLoading,
  isQueueingDelivery,
  isProcessingDeliveries,
  onNotificationDeliveryFormChange,
  onNotificationDeliverySubmit,
  onProcessNotificationDeliveries
}: NotificationsTabProps) {
  const canWriteNotifications = hasPermission(TENANT_PERMISSIONS.NOTIFICATIONS_WRITE);
  const destinationRequired = notificationDeliveryForm.channel === 'email' || notificationDeliveryForm.channel === 'webhook';
  const queueDisabled = isQueueingDelivery || !canWriteNotifications || !notificationDeliveryForm.notification_event_id || !notificationDeliveryForm.channel || (destinationRequired && !notificationDeliveryForm.recipient.trim());

  return (
    <section style={styles.grid}>
      <form onSubmit={onNotificationDeliverySubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Queue notification delivery</h2>
        <p style={styles.helper}>
          Email uses the configured backend email provider. Webhooks are HTTPS-only and HMAC-signed by the server. Queued deliveries are also processed by the scheduled background-job cycle when that production workflow is enabled.
        </p>
        <SelectField
          label="Notification event"
          value={notificationDeliveryForm.notification_event_id}
          onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, notification_event_id: value }))}
          options={notifications.map((event) => ({ value: event.id, label: `${event.severity}: ${event.title}` }))}
          required
          disabled={!canWriteNotifications}
        />
        <SelectField
          label="Channel"
          value={notificationDeliveryForm.channel}
          onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, channel: value, recipient: value === 'in_app' ? '' : current.recipient }))}
          options={[
            { value: 'in_app', label: 'In-app' },
            { value: 'email', label: 'Email' },
            { value: 'webhook', label: 'Webhook' }
          ]}
          required
          disabled={!canWriteNotifications}
        />
        <InputField
          label={deliveryDestinationLabel(notificationDeliveryForm.channel)}
          type={notificationDeliveryForm.channel === 'email' ? 'email' : 'text'}
          value={notificationDeliveryForm.recipient}
          onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, recipient: value }))}
          required={destinationRequired}
          disabled={!canWriteNotifications || notificationDeliveryForm.channel === 'in_app'}
        />
        <button type="submit" disabled={queueDisabled} style={queueDisabled ? styles.disabledButton : styles.primaryButton} title={!canWriteNotifications ? `Requires ${TENANT_PERMISSIONS.NOTIFICATIONS_WRITE} permission.` : undefined}>Queue delivery</button>
        <button
          type="button"
          disabled={isProcessingDeliveries || !canWriteNotifications}
          style={styles.secondaryButton}
          onClick={onProcessNotificationDeliveries}
        >
          {isProcessingDeliveries ? 'Processing…' : 'Process due deliveries now'}
        </button>
      </form>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Delivery history</h2>
        <DataTable
          loading={deliveriesLoading}
          empty="No notification deliveries have been queued yet."
          headers={['Status', 'Channel', 'Event', 'Recipient', 'Attempts', 'Last result', 'Created']}
          rows={deliveries.map((item) => [
            deliveryStatusLabel(item),
            item.channel,
            item.title || item.event_type || item.notification_event_id,
            item.recipient || '-',
            `${Number(item.attempts || 0)}/${Number(item.max_attempts || 0) || '-'}`,
            item.last_error || (item.response_status ? `HTTP ${item.response_status}` : item.delivered_at ? `Delivered ${formatDateTime(item.delivered_at)}` : item.next_attempt_at ? `Next ${formatDateTime(item.next_attempt_at)}` : '-'),
            formatDateTime(item.created_at)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Notification events</h2>
        <DataTable
          loading={isLoading}
          empty="No notification events yet."
          headers={['Severity', 'Event', 'Title', 'Message', 'Created']}
          rows={notifications.map((item) => [item.severity, item.event_type, item.title, item.message || '-', formatDateTime(item.created_at)])}
        />
      </section>
    </section>
  );
}
