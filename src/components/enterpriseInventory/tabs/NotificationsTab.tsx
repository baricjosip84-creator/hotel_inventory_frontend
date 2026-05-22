import type { FormEvent } from 'react';
import { DataTable, InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import type { NotificationDeliveryForm, NotificationEvent } from '../EnterpriseInventoryTypes';

type NotificationsTabProps = {
  notificationDeliveryForm: NotificationDeliveryForm;
  notifications: NotificationEvent[];
  isLoading: boolean;
  isQueueingDelivery: boolean;
  isProcessingDeliveries: boolean;
  onNotificationDeliveryFormChange: (updater: (current: NotificationDeliveryForm) => NotificationDeliveryForm) => void;
  onNotificationDeliverySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onProcessNotificationDeliveries: () => void;
};

export function NotificationsTab({
  notificationDeliveryForm,
  notifications,
  isLoading,
  isQueueingDelivery,
  isProcessingDeliveries,
  onNotificationDeliveryFormChange,
  onNotificationDeliverySubmit,
  onProcessNotificationDeliveries
}: NotificationsTabProps) {
  return (
    <section style={styles.grid}>
      <form onSubmit={onNotificationDeliverySubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Queue notification delivery</h2>
        <SelectField
          label="Notification event"
          value={notificationDeliveryForm.notification_event_id}
          onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, notification_event_id: value }))}
          options={notifications.map((event) => ({ value: event.id, label: `${event.severity}: ${event.title}` }))}
          required
        />
        <SelectField
          label="Channel"
          value={notificationDeliveryForm.channel}
          onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, channel: value }))}
          options={[
            { value: 'in_app', label: 'In-app' },
            { value: 'email', label: 'Email' },
            { value: 'webhook', label: 'Webhook' }
          ]}
          required
        />
        <InputField label="Recipient" value={notificationDeliveryForm.recipient} onChange={(value) => onNotificationDeliveryFormChange((current) => ({ ...current, recipient: value }))} />
        <button type="submit" disabled={isQueueingDelivery} style={styles.primaryButton}>Queue delivery</button>
        <button
          type="button"
          disabled={isProcessingDeliveries}
          style={styles.secondaryButton}
          onClick={onProcessNotificationDeliveries}
        >
          Process queued deliveries
        </button>
      </form>

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
