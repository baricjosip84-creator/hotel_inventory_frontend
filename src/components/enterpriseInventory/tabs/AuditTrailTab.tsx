import { useMemo } from 'react';
import { DataTable, InputField, MetricCard, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { emptyAuditFilters } from '../EnterpriseInventoryForms';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import type { AuditFilters, AuditLog } from '../EnterpriseInventoryTypes';

type AuditTrailTabProps = {
  auditFilters: AuditFilters;
  auditLogs: AuditLog[];
  isLoading: boolean;
  onAuditFiltersChange: (updater: (current: AuditFilters) => AuditFilters) => void;
};

const entitySingularLabels: Record<string, string> = {
  Alerts: 'Alert',
  'Auth Sessions': 'Auth Session',
  Products: 'Product',
  'Purchase Order': 'Purchase Order',
  'Purchase Orders': 'Purchase Order',
  'Reorder Insights': 'Reorder Insight',
  Shipments: 'Shipment',
  'Shipment Items': 'Shipment Item',
  'Stock Transfers': 'Stock Transfer',
  'Storage Locations': 'Storage Location',
  Suppliers: 'Supplier',
  'Tenant Subscription Access': 'Tenant Subscription Access',
  Tenants: 'Tenant',
  Users: 'User'
};

const actionResultLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  replace: 'Replaced',
  revoke: 'Revoked',
  revoke_all: 'Revoked All',
  subscription_access_denied: 'Access Denied'
};

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

function readMetadataText(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function singularEntityLabel(entityType: string | null | undefined): string {
  const entityLabel = formatAuditLabel(entityType);
  return entitySingularLabels[entityLabel] || entityLabel;
}

function auditOperationFromPath(path: string, method: string | null): string | null {
  const normalizedPath = path.toLowerCase();
  const normalizedMethod = method?.toUpperCase() || '';

  if (normalizedPath.includes('/alerts/')) {
    if (normalizedPath.endsWith('/acknowledge')) return 'Alert Acknowledged';
    if (normalizedPath.endsWith('/escalate')) return 'Alert Escalated';
    if (normalizedPath.endsWith('/resolve')) return 'Alert Resolved';
    if (normalizedPath.endsWith('/reopen')) return 'Alert Reopened';
  }

  const routeOperations: Array<{ match: string; label: string }> = [
    { match: '/storage-locations', label: 'Storage Location' },
    { match: '/suppliers', label: 'Supplier' },
    { match: '/products', label: 'Product' },
    { match: '/stock-transfers', label: 'Stock Transfer' },
    { match: '/shipments', label: 'Shipment' },
    { match: '/purchase-orders', label: 'Purchase Order' },
    { match: '/users', label: 'User' },
    { match: '/tenants', label: 'Tenant' },
    { match: '/alerts', label: 'Alert' }
  ];

  const route = routeOperations.find((item) => normalizedPath.includes(item.match));
  if (!route) return null;

  if (normalizedMethod === 'POST') return `${route.label} Created`;
  if (normalizedMethod === 'PATCH' || normalizedMethod === 'PUT') return `${route.label} Updated`;
  if (normalizedMethod === 'DELETE') return `${route.label} Deleted`;
  return null;
}

function formatAuditOperation(item: AuditLog): string {
  const path = readMetadataText(item.metadata, 'path');
  const method = readMetadataText(item.metadata, 'method');
  const pathOperation = path ? auditOperationFromPath(path, method) : null;
  if (pathOperation) return pathOperation;

  if (item.action?.includes('.') && !['create', 'update', 'delete', 'replace'].includes(item.action)) {
    return formatAuditLabel(item.action);
  }

  const actionResult = actionResultLabels[item.action] || formatAuditLabel(item.action);
  const entityLabel = singularEntityLabel(item.entity_type);
  if (!entityLabel || entityLabel === '-') return actionResult;
  return `${entityLabel} ${actionResult}`;
}

function formatAuditDetails(item: AuditLog, operation: string): string {
  const metadata = item.metadata;
  if (!metadata) return `${operation} recorded`;

  const details: string[] = [];
  const poNumber = readMetadataText(metadata, 'po_number');
  const nextStatus = readMetadataText(metadata, 'next_status');
  const status = readMetadataText(metadata, 'status');
  const previousStatus = readMetadataText(metadata, 'previous_status');
  const reason = readMetadataText(metadata, 'reason');
  const scope = readMetadataText(metadata, 'scope');
  const actorType = readMetadataText(metadata, 'actor_type');
  const ip = readMetadataText(metadata, 'ip');

  if (poNumber) details.push(`PO ${poNumber}`);
  if (previousStatus) details.push(`Previous status ${formatAuditLabel(previousStatus)}`);
  if (nextStatus) details.push(`New status ${formatAuditLabel(nextStatus)}`);
  if (!nextStatus && status) details.push(`Status ${formatAuditLabel(status)}`);
  if (reason) details.push(`Reason: ${reason}`);
  if (scope) details.push(`Scope ${formatAuditLabel(scope)}`);
  if (actorType === 'support_session') details.push('Support session action');

  if (!details.length) details.push(`${operation} recorded`);
  if (ip) details.push(`Source IP ${ip}`);

  return details.slice(0, 3).join(' · ');
}


function operationFilterValue(operation: string): string {
  return `operation:${operation}`;
}

function selectedOperationFilter(value: string): string | null {
  return value.startsWith('operation:') ? value.slice('operation:'.length) : null;
}

function uniqueOptions(options: Array<{ value: string; label: string }>): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (!option.value || seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

export function AuditTrailTab({ auditFilters, auditLogs, isLoading, onAuditFiltersChange }: AuditTrailTabProps) {
  const selectedOperation = selectedOperationFilter(auditFilters.action);

  const visibleAuditLogs = useMemo(() => {
    if (!selectedOperation) return auditLogs;
    return auditLogs.filter((item) => formatAuditOperation(item) === selectedOperation);
  }, [auditLogs, selectedOperation]);

  const actionOptions = useMemo(() => {
    const currentOperations = auditLogs
      .map((item) => formatAuditOperation(item))
      .filter((operation): operation is string => Boolean(operation && operation !== '-'))
      .sort((first, second) => first.localeCompare(second));

    if (selectedOperation) currentOperations.push(selectedOperation);

    return uniqueOptions(currentOperations.map((operation) => ({ value: operationFilterValue(operation), label: operation })));
  }, [auditLogs, selectedOperation]);

  const entityOptions = useMemo(() => {
    const currentEntities = auditLogs
      .map((item) => item.entity_type)
      .filter((entityType): entityType is string => Boolean(entityType))
      .sort((first, second) => formatAuditLabel(first).localeCompare(formatAuditLabel(second)));

    if (auditFilters.entity_type) currentEntities.push(auditFilters.entity_type);

    return uniqueOptions(currentEntities.map((entityType) => ({ value: entityType, label: formatAuditLabel(entityType) })));
  }, [auditLogs, auditFilters.entity_type]);

  const auditSummary = useMemo(() => {
    const entityTypes = new Set(visibleAuditLogs.map((item) => item.entity_type).filter(Boolean));
    const supportActions = visibleAuditLogs.filter((item) => item.metadata?.actor_type === 'support_session').length;
    return { total: visibleAuditLogs.length, entityTypes: entityTypes.size, supportActions };
  }, [visibleAuditLogs]);

  return (
    <section style={styles.grid}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Audit filters</h2>
        <SelectField
          label="Action"
          value={auditFilters.action}
          options={actionOptions}
          onChange={(value) => onAuditFiltersChange((current) => ({ ...current, action: value }))}
        />
        <SelectField
          label="Entity type"
          value={auditFilters.entity_type}
          options={entityOptions}
          onChange={(value) => onAuditFiltersChange((current) => ({ ...current, entity_type: value }))}
        />
        <p style={styles.helper}>Use the ID filters only when you have the full internal ID from an audit export or support case.</p>
        <InputField label="Record ID (advanced)" value={auditFilters.entity_id} onChange={(value) => onAuditFiltersChange((current) => ({ ...current, entity_id: value }))} />
        <InputField label="User ID (advanced)" value={auditFilters.user_id} onChange={(value) => onAuditFiltersChange((current) => ({ ...current, user_id: value }))} />
        <label style={styles.checkboxRow}>
          <input type="checkbox" checked={auditFilters.support_only} onChange={(event) => onAuditFiltersChange((current) => ({ ...current, support_only: event.target.checked }))} />
          Support-session actions only
        </label>
        <button type="button" style={styles.secondaryButton} onClick={() => onAuditFiltersChange(() => emptyAuditFilters)}>Reset filters</button>
        <div style={styles.statGrid}>
          <MetricCard label="Visible rows" value={auditSummary.total} />
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
          rows={visibleAuditLogs.map((item) => {
            const operation = formatAuditOperation(item);
            return [
              operation,
              formatAuditLabel(item.entity_type),
              formatEntityId(item.entity_id),
              item.user_name || item.user_email || item.user_id || 'System',
              formatDateTime(item.created_at),
              formatAuditDetails(item, operation)
            ];
          })}
        />
      </section>
    </section>
  );
}
