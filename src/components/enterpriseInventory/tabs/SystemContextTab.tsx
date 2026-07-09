import { DataTable, MetricCard, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatRecordValue, formatValue } from '../EnterpriseInventoryFormat';
import type { SystemContextResponse, SystemContextSnapshot, SystemExecutionGateResponse, TenantPublicContext } from '../EnterpriseInventoryTypes';

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
};

type SnapshotMutation = {
  mutate: () => void;
  isPending: boolean;
};


const getSystemContextSection = (
  data: SystemContextResponse | undefined,
  section: 'inventory' | 'procurement' | 'costing' | 'alerts' | 'audit' | 'access'
): Record<string, unknown> | undefined => {
  return data?.context?.[section] ?? data?.[section];
};

const hasValues = (value: unknown): boolean => {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
};

const getMaintenanceStatus = (data: TenantPublicContext | undefined): string => {
  if (!data) return 'Inactive';
  if (data.active === true || hasValues(data.active)) return 'Active';
  if (hasValues(data.upcoming)) return 'Upcoming';
  if (data.enabled === true) return 'Enabled';
  return 'Inactive';
};

type SystemContextTabProps = {
  systemExecutionGateQuery: QueryState<SystemExecutionGateResponse>;
  systemContextQuery: QueryState<SystemContextResponse>;
  systemContextSnapshotsQuery: QueryState<unknown>;
  systemContextSnapshotComparisonQuery: QueryState<unknown>;
  systemContextForecastRiskQuery: QueryState<unknown>;
  supportContextQuery: QueryState<TenantPublicContext>;
  maintenanceContextQuery: QueryState<TenantPublicContext>;
  announcementContextQuery: QueryState<TenantPublicContext>;
  incidentContextQuery: QueryState<TenantPublicContext>;
  systemContextSnapshots: SystemContextSnapshot[];
  captureSystemContextSnapshotMutation: SnapshotMutation;
  refreshSystemContextQueries: () => void;
};

export function SystemContextTab({
  systemExecutionGateQuery,
  systemContextQuery,
  systemContextSnapshotsQuery,
  systemContextSnapshotComparisonQuery,
  systemContextForecastRiskQuery,
  supportContextQuery,
  maintenanceContextQuery,
  announcementContextQuery,
  incidentContextQuery,
  systemContextSnapshots,
  captureSystemContextSnapshotMutation,
  refreshSystemContextQueries
}: SystemContextTabProps) {
  const inventoryContext = getSystemContextSection(systemContextQuery.data, 'inventory');
  const procurementContext = getSystemContextSection(systemContextQuery.data, 'procurement');
  const costingContext = getSystemContextSection(systemContextQuery.data, 'costing');
  const alertsContext = getSystemContextSection(systemContextQuery.data, 'alerts');
  const auditContext = getSystemContextSection(systemContextQuery.data, 'audit');
  const accessContext = getSystemContextSection(systemContextQuery.data, 'access');

  return (
    <section style={styles.stack}>
      <div style={styles.actions}>
        <button type="button" style={styles.primaryButton} onClick={() => captureSystemContextSnapshotMutation.mutate()} disabled={captureSystemContextSnapshotMutation.isPending}>
          Capture snapshot
        </button>
        <button type="button" style={styles.secondaryButton} onClick={() => refreshSystemContextQueries()}>
          Refresh context
        </button>
      </div>

      <div style={styles.metricsGrid}>
        <MetricCard label="Execution gate" value={systemExecutionGateQuery.data?.status || (systemExecutionGateQuery.data?.allowed ? 'allowed' : 'blocked')} helper={(systemExecutionGateQuery.data?.reasons ?? []).join(', ') || 'Read-only execution readiness'} />
        <MetricCard label="Products" value={formatRecordValue(inventoryContext, 'total_products')} helper="System context inventory count" />
        <MetricCard label="Low stock" value={formatRecordValue(inventoryContext, 'low_stock_products')} helper="Products at or below minimum" />
        <MetricCard label="Open POs" value={formatRecordValue(procurementContext, 'open_purchase_orders')} helper="Draft/submitted/approved" />
        <MetricCard label="Unresolved alerts" value={formatRecordValue(alertsContext, 'unresolved_alerts')} helper={`${formatRecordValue(alertsContext, 'critical_unresolved_alerts')} critical`} />
        <MetricCard label="Support sessions" value={formatRecordValue(accessContext, 'active_support_sessions')} helper="Active platform access" />
      </div>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Tenant platform context</h2>
        <DataTable
          loading={supportContextQuery.isLoading || maintenanceContextQuery.isLoading || announcementContextQuery.isLoading || incidentContextQuery.isLoading}
          empty="No tenant context returned."
          headers={['Context', 'Status', 'Details']}
          rows={[
            ['Support session', hasValues(supportContextQuery.data?.active) ? 'Active' : 'Inactive', formatValue(supportContextQuery.data)],
            ['Maintenance', getMaintenanceStatus(maintenanceContextQuery.data), formatValue(maintenanceContextQuery.data)],
            ['Announcements', Array.isArray(announcementContextQuery.data?.announcements) && announcementContextQuery.data.announcements.length ? 'Active' : 'None', formatValue(announcementContextQuery.data)],
            ['Incidents', Array.isArray(incidentContextQuery.data?.incidents) && incidentContextQuery.data.incidents.length ? 'Open' : 'None', formatValue(incidentContextQuery.data)]
          ]}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>System context summaries</h2>
        <DataTable
          loading={systemContextQuery.isLoading}
          empty="System context unavailable."
          headers={['Section', 'Summary']}
          rows={[
            ['Tenant', formatValue(systemContextQuery.data?.tenant)],
            ['Inventory', formatValue(inventoryContext)],
            ['Procurement', formatValue(procurementContext)],
            ['Costing', formatValue(costingContext)],
            ['Alerts', formatValue(alertsContext)],
            ['Audit', formatValue(auditContext)],
            ['Access', formatValue(accessContext)]
          ]}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Snapshots</h2>
        <DataTable
          loading={systemContextSnapshotsQuery.isLoading}
          empty="No system context snapshots captured yet."
          headers={['Generated', 'Created by', 'Inventory', 'Procurement', 'Alerts']}
          rows={systemContextSnapshots.map((snapshot) => [
            formatDateTime(snapshot.generated_at || snapshot.created_at),
            snapshot.created_by_user_name || snapshot.created_by || '-',
            formatValue(snapshot.inventory_summary),
            formatValue(snapshot.procurement_summary),
            formatValue(snapshot.alerts_summary)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Snapshot comparison and forecast risk</h2>
        <DataTable
          loading={systemContextSnapshotComparisonQuery.isLoading || systemContextForecastRiskQuery.isLoading}
          empty="No comparison data yet."
          headers={['Signal', 'Details']}
          rows={[
            ['Latest comparison', formatValue(systemContextSnapshotComparisonQuery.data)],
            ['Forecast risk classification', formatValue(systemContextForecastRiskQuery.data)]
          ]}
        />
      </section>
    </section>
  );
}
