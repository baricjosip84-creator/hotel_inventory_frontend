import { useMemo } from 'react';
import { DataTable, InputField, MetricCard, styles } from '../EnterpriseInventoryShared';
import { emptyAuditFilters } from '../EnterpriseInventoryForms';
import { formatDateTime, formatValue } from '../EnterpriseInventoryFormat';
import type { AuditFilters, AuditLog } from '../EnterpriseInventoryTypes';

type AuditTrailTabProps = {
  auditFilters: AuditFilters;
  auditLogs: AuditLog[];
  isLoading: boolean;
  onAuditFiltersChange: (updater: (current: AuditFilters) => AuditFilters) => void;
};

const metadataPriority = ['po_number', 'next_status', 'status', 'previous_status', 'method', 'path', 'ip', 'actor_type', 'scope', 'reason'];

function formatAuditLabel(value: string | null | undefined): string {
  if (!value) return '-';

  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => {
      const upper = part.toUpperCase();
      if (['ID', 'PO', 'SLA', 'API', 'IP'].includes(upper)) return upper;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function formatEntityId(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function formatMetadataKey(key: string): string {
  return formatAuditLabel(key);
}

function formatMetadataValue(key: string, value: unknown): string {
  const formatted = formatValue(value);
  if (['next_status', 'status', 'previous_status', 'actor_type', 'scope', 'reason'].includes(key)) {
    return formatAuditLabel(formatted);
  }
  return formatted;
}

function formatMetadataItem(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.length ? `${formatMetadataKey(key)}: ${value.length} items` : null;
    return `${formatMetadataKey(key)}: details recorded`;
  }
  return `${formatMetadataKey(key)}: ${formatMetadataValue(key, value)}`;
}

function formatMetadataSummary(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return '-';

  const entries = Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!entries.length) return '-';

  const sorted = [...entries].sort(([left], [right]) => {
    const leftIndex = metadataPriority.indexOf(left);
    const rightIndex = metadataPriority.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });

  const visibleItems = sorted
    .slice(0, 3)
    .map(([key, value]) => formatMetadataItem(key, value))
    .filter((item): item is string => Boolean(item));

  if (!visibleItems.length) return '-';

  const remaining = Math.max(0, sorted.length - visibleItems.length);
  return remaining ? `${visibleItems.join(' · ')} · ${remaining} more detail${remaining === 1 ? '' : 's'}` : visibleItems.join(' · ');
}

export function AuditTrailTab({ auditFilters, auditLogs, isLoading, onAuditFiltersChange }: AuditTrailTabProps) {
  const auditSummary = useMemo(() => {
    const entityTypes = new Set(auditLogs.map((item) => item.entity_type).filter(Boolean));
    const supportActions = auditLogs.filter((item) => item.metadata?.actor_type === 'support_session').length;
    return { total: auditLogs.length, entityTypes: entityTypes.size, supportActions };
  }, [auditLogs]);

  return (
    <section style={styles.grid}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Audit filters</h2>
        <InputField label="Action" value={auditFilters.action} onChange={(value) => onAuditFiltersChange((current) => ({ ...current, action: value }))} />
        <InputField label="Entity type" value={auditFilters.entity_type} onChange={(value) => onAuditFiltersChange((current) => ({ ...current, entity_type: value }))} />
        <InputField label="Entity ID" value={auditFilters.entity_id} onChange={(value) => onAuditFiltersChange((current) => ({ ...current, entity_id: value }))} />
        <InputField label="User ID" value={auditFilters.user_id} onChange={(value) => onAuditFiltersChange((current) => ({ ...current, user_id: value }))} />
        <label style={styles.checkboxRow}>
          <input type="checkbox" checked={auditFilters.support_only} onChange={(event) => onAuditFiltersChange((current) => ({ ...current, support_only: event.target.checked }))} />
          Support-session actions only
        </label>
        <button type="button" style={styles.secondaryButton} onClick={() => onAuditFiltersChange(() => emptyAuditFilters)}>Reset filters</button>
        <div style={styles.statGrid}>
          <MetricCard label="Audit rows" value={auditSummary.total} />
          <MetricCard label="Entity types" value={auditSummary.entityTypes} />
          <MetricCard label="Support actions" value={auditSummary.supportActions} />
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Tenant audit trail</h2>
        <DataTable
          loading={isLoading}
          empty="No audit rows match these filters."
          headers={['Action', 'Entity', 'Record ID', 'Actor', 'Created', 'Details']}
          rows={auditLogs.map((item) => [
            formatAuditLabel(item.action),
            formatAuditLabel(item.entity_type),
            formatEntityId(item.entity_id),
            item.user_name || item.user_email || item.user_id || 'System',
            formatDateTime(item.created_at),
            formatMetadataSummary(item.metadata)
          ])}
        />
      </section>
    </section>
  );
}
