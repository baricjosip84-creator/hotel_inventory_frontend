import { useMemo } from 'react';
import { DataTable, InputField, MetricCard, styles } from '../EnterpriseInventoryShared';
import { emptyAuditFilters } from '../EnterpriseInventoryForms';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import type { AuditFilters, AuditLog } from '../EnterpriseInventoryTypes';

type AuditTrailTabProps = {
  auditFilters: AuditFilters;
  auditLogs: AuditLog[];
  isLoading: boolean;
  onAuditFiltersChange: (updater: (current: AuditFilters) => AuditFilters) => void;
};

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
          headers={['Action', 'Entity', 'Entity ID', 'Actor', 'Created', 'Metadata']}
          rows={auditLogs.map((item) => [
            item.action,
            item.entity_type || '-',
            item.entity_id || '-',
            item.user_name || item.user_email || item.user_id || 'System',
            formatDateTime(item.created_at),
            item.metadata ? JSON.stringify(item.metadata) : '-'
          ])}
        />
      </section>
    </section>
  );
}
