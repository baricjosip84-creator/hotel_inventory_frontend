import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

type ReportTab = 'inventory-valuation' | 'stock-by-location' | 'product-movements' | 'procurement-summary' | 'forecast';

type InventoryValuationRow = {
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name: string;
  quantity: number | string;
  estimated_unit_cost: number | string;
  estimated_total_value: number | string;
  updated_at?: string | null;
};

type InventoryValuationReport = {
  totals: {
    row_count: number;
    estimated_inventory_value: number | string;
  };
  rows: InventoryValuationRow[];
};

type StockByLocationRow = {
  storage_location_id: string;
  storage_location_name: string;
  temperature_zone?: string | null;
  stock_row_count: number | string;
  total_quantity: number | string;
};

type ProductMovementRow = {
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  movement_count: number | string;
  total_increase: number | string;
  total_decrease: number | string;
  last_movement_at?: string | null;
};

type ProcurementSummaryReport = {
  shipments: {
    total_shipments: number | string;
    pending_shipments: number | string;
    partial_shipments: number | string;
    received_shipments: number | string;
    overdue_shipments: number | string;
  };
  lines: {
    total_active_shipment_lines: number | string;
    total_ordered_quantity: number | string;
    total_received_quantity: number | string;
    total_discrepancy: number | string;
  };
};

type ForecastRow = {
  product_id: string;
  product_name: string;
  avg_daily_usage: number | string;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatNumber(value: number | string | null | undefined, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits
  }).format(toNumber(value));
}

function formatCurrency(value: number | string | null | undefined): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(toNumber(value));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
}

function buildQueryString(params: Record<string, string | number | null | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

async function fetchInventoryValuation(): Promise<InventoryValuationReport> {
  return apiRequest<InventoryValuationReport>('/reports/inventory-valuation');
}

async function fetchStockByLocation(category: string): Promise<StockByLocationRow[]> {
  return apiRequest<StockByLocationRow[]>(`/reports/stock-by-location${buildQueryString({ category })}`);
}

async function fetchProductMovements(limit: number): Promise<ProductMovementRow[]> {
  return apiRequest<ProductMovementRow[]>(`/reports/product-movements${buildQueryString({ limit })}`);
}

async function fetchProcurementSummary(): Promise<ProcurementSummaryReport> {
  return apiRequest<ProcurementSummaryReport>('/reports/procurement-summary');
}

async function fetchForecast(): Promise<ForecastRow[]> {
  return apiRequest<ForecastRow[]>('/forecast');
}

function StatCard(props: {
  title: string;
  value: string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const valueStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

function ReportPanel(props: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={styles.panelHeaderText}>
          <h3 style={styles.panelTitle}>{props.title}</h3>
          <p style={styles.panelSubtitle}>{props.subtitle}</p>
        </div>
        {props.actions ? <div style={styles.panelActions}>{props.actions}</div> : null}
      </div>
      {props.children}
    </section>
  );
}

function EmptyState(props: { message: string }) {
  return <div style={styles.emptyState}>{props.message}</div>;
}

function ErrorState(props: { message: string }) {
  return <div style={styles.errorState}>{props.message}</div>;
}

function getReadableError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function getErrorStatus(error: unknown): number | null {
  if (error instanceof ApiError) {
    return error.status;
  }

  return null;
}

export default function ReportsPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in your actual current ReportsPage.

    Changes made:
    - hardened layout containers with width guards
    - improved wrapping in headers, insight cards, tables, and summary rows
    - kept the tab system, controls, endpoints, and report logic unchanged

    WHY IT CHANGED
    --------------
    The real file already uses the correct reporting endpoints and tab flows,
    but dense management/reporting surfaces tend to contain longer labels,
    locations, and product names that can pressure layout width.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This improves readability and responsiveness without changing:
    - backend contracts
    - query keys
    - report tabs
    - filtering logic
    - data flow
    - management access behavior
  */
  const [activeTab, setActiveTab] = useState<ReportTab>('inventory-valuation');
  const [locationCategoryFilter, setLocationCategoryFilter] = useState('');
  const [movementLimit, setMovementLimit] = useState(50);

  const { role: currentUserRole } = getRoleCapabilities();

  const inventoryValuationQuery = useQuery({
    queryKey: ['reports', 'inventory-valuation'],
    queryFn: fetchInventoryValuation
  });

  const stockByLocationQuery = useQuery({
    queryKey: ['reports', 'stock-by-location', locationCategoryFilter],
    queryFn: () => fetchStockByLocation(locationCategoryFilter)
  });

  const productMovementsQuery = useQuery({
    queryKey: ['reports', 'product-movements', movementLimit],
    queryFn: () => fetchProductMovements(movementLimit)
  });

  const procurementSummaryQuery = useQuery({
    queryKey: ['reports', 'procurement-summary'],
    queryFn: fetchProcurementSummary
  });

  const forecastQuery = useQuery({
    queryKey: ['reports', 'forecast'],
    queryFn: fetchForecast
  });

  const inventoryValuationRows = inventoryValuationQuery.data?.rows ?? [];
  const stockByLocationRows = stockByLocationQuery.data ?? [];
  const productMovementRows = productMovementsQuery.data ?? [];
  const forecastRows = forecastQuery.data ?? [];

  const topLocation = useMemo(() => {
    if (stockByLocationRows.length === 0) {
      return null;
    }

    return [...stockByLocationRows].sort(
      (left, right) => toNumber(right.total_quantity) - toNumber(left.total_quantity)
    )[0];
  }, [stockByLocationRows]);

  const mostActiveProduct = useMemo(() => {
    if (productMovementRows.length === 0) {
      return null;
    }

    return [...productMovementRows].sort(
      (left, right) => toNumber(right.movement_count) - toNumber(left.movement_count)
    )[0];
  }, [productMovementRows]);

  const highestForecastProduct = useMemo(() => {
    if (forecastRows.length === 0) {
      return null;
    }

    return [...forecastRows].sort(
      (left, right) => toNumber(right.avg_daily_usage) - toNumber(left.avg_daily_usage)
    )[0];
  }, [forecastRows]);

  const anyForbidden = [
    inventoryValuationQuery.error,
    stockByLocationQuery.error,
    productMovementsQuery.error,
    procurementSummaryQuery.error,
    forecastQuery.error
  ].some((error) => getErrorStatus(error) === 403);

  if (anyForbidden) {
    return (
      <div style={styles.pageStack}>
        <section style={styles.permissionPanel}>
          <h2 style={styles.permissionTitle}>Management access required</h2>
          <p style={styles.permissionText}>
            The reports and forecast module is backed by your existing management-only backend routes.
            The current session role is <strong>{currentUserRole || 'unknown'}</strong>, and the backend is
            correctly denying access.
          </p>
          <p style={styles.permissionText}>
            This protects valuation, procurement summary, movement analysis, and forecast data from being exposed
            to unauthorized roles.
          </p>
        </section>
      </div>
    );
  }

  const procurementSummary = procurementSummaryQuery.data;

  return (
    <div style={styles.pageStack}>
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelHeaderText}>
            <h3 style={styles.panelTitle}>Management Reporting</h3>
            <p style={styles.panelSubtitle}>
              Frontend reporting surface built directly on the backend routes already present in your existing
              codebase: valuation, stock distribution, movement analysis, procurement summary, and forecast.
            </p>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard
            title="Estimated Inventory Value"
            value={formatCurrency(inventoryValuationQuery.data?.totals.estimated_inventory_value)}
            subtitle="Based on the latest known shipment item unit cost per product"
          />
          <StatCard
            title="Tracked Valuation Rows"
            value={formatNumber(inventoryValuationQuery.data?.totals.row_count, 0)}
            subtitle="Stock rows currently contributing to inventory valuation"
          />
          <StatCard
            title="Overdue Shipments"
            value={formatNumber(procurementSummary?.shipments.overdue_shipments, 0)}
            subtitle="Inbound shipments past delivery date and not fully received"
            tone={toNumber(procurementSummary?.shipments.overdue_shipments) > 0 ? 'warn' : 'good'}
          />
          <StatCard
            title="Top Forecast Product"
            value={highestForecastProduct?.product_name || 'None'}
            subtitle={
              highestForecastProduct
                ? `${formatNumber(highestForecastProduct.avg_daily_usage)} avg daily usage`
                : 'No recent consumption data available'
            }
          />
        </div>

        <div style={styles.insightGrid}>
          <div style={styles.insightCard}>
            <div style={styles.insightLabel}>Top quantity location</div>
            <div style={styles.insightValue}>{topLocation?.storage_location_name || 'None'}</div>
            <div style={styles.insightText}>
              {topLocation
                ? `${formatNumber(topLocation.total_quantity)} total units across ${formatNumber(
                    topLocation.stock_row_count,
                    0
                  )} stock rows`
                : 'No location stock rows returned from report.'}
            </div>
          </div>
          <div style={styles.insightCard}>
            <div style={styles.insightLabel}>Most active product</div>
            <div style={styles.insightValue}>{mostActiveProduct?.product_name || 'None'}</div>
            <div style={styles.insightText}>
              {mostActiveProduct
                ? `${formatNumber(mostActiveProduct.movement_count, 0)} movements, ${formatNumber(
                    mostActiveProduct.total_increase
                  )} in, ${formatNumber(mostActiveProduct.total_decrease)} out`
                : 'No product movement rows returned from report.'}
            </div>
          </div>
          <div style={styles.insightCard}>
            <div style={styles.insightLabel}>Procurement coverage</div>
            <div style={styles.insightValue}>{formatNumber(procurementSummary?.shipments.total_shipments, 0)}</div>
            <div style={styles.insightText}>
              {`${formatNumber(procurementSummary?.shipments.pending_shipments, 0)} pending, ${formatNumber(
                procurementSummary?.shipments.partial_shipments,
                0
              )} partial, ${formatNumber(procurementSummary?.shipments.received_shipments, 0)} received`}
            </div>
          </div>
        </div>
      </section>

      <section style={styles.tabSection}>
        <div style={styles.tabBar}>
          {[
            { key: 'inventory-valuation', label: 'Inventory Valuation' },
            { key: 'stock-by-location', label: 'Stock by Location' },
            { key: 'product-movements', label: 'Product Movements' },
            { key: 'procurement-summary', label: 'Procurement Summary' },
            { key: 'forecast', label: 'Forecast' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ReportTab)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'inventory-valuation' ? (
        <ReportPanel
          title="Inventory Valuation"
          subtitle="Estimated stock value by product and storage location using the latest available shipment item cost."
        >
          {inventoryValuationQuery.isLoading ? <div>Loading inventory valuation...</div> : null}
          {inventoryValuationQuery.isError ? (
            <ErrorState message={`Failed to load inventory valuation: ${getReadableError(inventoryValuationQuery.error)}`} />
          ) : null}
          {!inventoryValuationQuery.isLoading && !inventoryValuationQuery.isError ? (
            inventoryValuationRows.length === 0 ? (
              <EmptyState message="No valuation rows returned for this tenant." />
            ) : (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Location</th>
                        <th style={styles.th}>Quantity</th>
                        <th style={styles.th}>Unit Cost</th>
                        <th style={styles.th}>Estimated Value</th>
                        <th style={styles.th}>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryValuationRows.map((row) => (
                        <tr key={`${row.product_id}-${row.storage_location_id}`}>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{row.product_name || row.product_id}</div>
                            <div style={styles.rowSubtle}>Product ID: {row.product_id}</div>
                          </td>
                          <td style={styles.td}>{row.product_category || '-'}</td>
                          <td style={styles.td}>{row.storage_location_name || row.storage_location_id}</td>
                          <td style={styles.td}>{formatNumber(row.quantity)}</td>
                          <td style={styles.td}>{formatCurrency(row.estimated_unit_cost)}</td>
                          <td style={styles.td}>{formatCurrency(row.estimated_total_value)}</td>
                          <td style={styles.td}>{formatDateTime(row.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.mobileCards}>
                  {inventoryValuationRows.map((row) => (
                    <div key={`mobile-${row.product_id}-${row.storage_location_id}`} style={styles.mobileCard}>
                      <div style={styles.mobileCardTitle}>{row.product_name || row.product_id}</div>
                      <div style={styles.mobileCardText}>Category: {row.product_category || '-'}</div>
                      <div style={styles.mobileCardText}>Location: {row.storage_location_name || row.storage_location_id}</div>
                      <div style={styles.mobileCardText}>Quantity: {formatNumber(row.quantity)}</div>
                      <div style={styles.mobileCardText}>Unit Cost: {formatCurrency(row.estimated_unit_cost)}</div>
                      <div style={styles.mobileCardText}>Estimated Value: {formatCurrency(row.estimated_total_value)}</div>
                      <div style={styles.mobileCardText}>Updated: {formatDateTime(row.updated_at)}</div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'stock-by-location' ? (
        <ReportPanel
          title="Stock by Location"
          subtitle="Grouped stock totals per storage location using the existing backend stock-by-location report."
          actions={
            <div style={styles.filterRow}>
              <label style={styles.fieldLabel}>
                Category Filter
                <input
                  type="text"
                  value={locationCategoryFilter}
                  onChange={(event) => setLocationCategoryFilter(event.target.value)}
                  placeholder="All categories"
                  style={styles.textInput}
                />
              </label>
            </div>
          }
        >
          {stockByLocationQuery.isLoading ? <div>Loading stock by location...</div> : null}
          {stockByLocationQuery.isError ? (
            <ErrorState message={`Failed to load stock by location: ${getReadableError(stockByLocationQuery.error)}`} />
          ) : null}
          {!stockByLocationQuery.isLoading && !stockByLocationQuery.isError ? (
            stockByLocationRows.length === 0 ? (
              <EmptyState message="No grouped stock rows matched the current filter." />
            ) : (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Location</th>
                        <th style={styles.th}>Temperature Zone</th>
                        <th style={styles.th}>Stock Rows</th>
                        <th style={styles.th}>Total Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockByLocationRows.map((row) => (
                        <tr key={row.storage_location_id}>
                          <td style={styles.td}>{row.storage_location_name || row.storage_location_id}</td>
                          <td style={styles.td}>{row.temperature_zone || '-'}</td>
                          <td style={styles.td}>{formatNumber(row.stock_row_count, 0)}</td>
                          <td style={styles.td}>{formatNumber(row.total_quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.mobileCards}>
                  {stockByLocationRows.map((row) => (
                    <div key={`location-mobile-${row.storage_location_id}`} style={styles.mobileCard}>
                      <div style={styles.mobileCardTitle}>{row.storage_location_name || row.storage_location_id}</div>
                      <div style={styles.mobileCardText}>Temperature Zone: {row.temperature_zone || '-'}</div>
                      <div style={styles.mobileCardText}>Stock Rows: {formatNumber(row.stock_row_count, 0)}</div>
                      <div style={styles.mobileCardText}>Total Quantity: {formatNumber(row.total_quantity)}</div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'product-movements' ? (
        <ReportPanel
          title="Product Movements"
          subtitle="Product-level movement summary using your existing product movement report endpoint."
          actions={
            <div style={styles.filterRow}>
              <label style={styles.fieldLabel}>
                Result Limit
                <select
                  value={movementLimit}
                  onChange={(event) => setMovementLimit(Number(event.target.value))}
                  style={styles.selectInput}
                >
                  {[25, 50, 100, 200].map((limitOption) => (
                    <option key={limitOption} value={limitOption}>
                      {limitOption}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        >
          {productMovementsQuery.isLoading ? <div>Loading product movements...</div> : null}
          {productMovementsQuery.isError ? (
            <ErrorState message={`Failed to load product movements: ${getReadableError(productMovementsQuery.error)}`} />
          ) : null}
          {!productMovementsQuery.isLoading && !productMovementsQuery.isError ? (
            productMovementRows.length === 0 ? (
              <EmptyState message="No product movement rows returned for the selected limit." />
            ) : (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Movements</th>
                        <th style={styles.th}>Total Increase</th>
                        <th style={styles.th}>Total Decrease</th>
                        <th style={styles.th}>Last Movement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productMovementRows.map((row) => (
                        <tr key={row.product_id}>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{row.product_name || row.product_id}</div>
                            <div style={styles.rowSubtle}>Product ID: {row.product_id}</div>
                          </td>
                          <td style={styles.td}>{row.product_category || '-'}</td>
                          <td style={styles.td}>{formatNumber(row.movement_count, 0)}</td>
                          <td style={styles.td}>{formatNumber(row.total_increase)}</td>
                          <td style={styles.td}>{formatNumber(row.total_decrease)}</td>
                          <td style={styles.td}>{formatDateTime(row.last_movement_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.mobileCards}>
                  {productMovementRows.map((row) => (
                    <div key={`movement-mobile-${row.product_id}`} style={styles.mobileCard}>
                      <div style={styles.mobileCardTitle}>{row.product_name || row.product_id}</div>
                      <div style={styles.mobileCardText}>Category: {row.product_category || '-'}</div>
                      <div style={styles.mobileCardText}>Movements: {formatNumber(row.movement_count, 0)}</div>
                      <div style={styles.mobileCardText}>Increase: {formatNumber(row.total_increase)}</div>
                      <div style={styles.mobileCardText}>Decrease: {formatNumber(row.total_decrease)}</div>
                      <div style={styles.mobileCardText}>Last Movement: {formatDateTime(row.last_movement_at)}</div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'procurement-summary' ? (
        <ReportPanel
          title="Procurement Summary"
          subtitle="Shipment and line-level procurement summary from your existing backend procurement report."
        >
          {procurementSummaryQuery.isLoading ? <div>Loading procurement summary...</div> : null}
          {procurementSummaryQuery.isError ? (
            <ErrorState message={`Failed to load procurement summary: ${getReadableError(procurementSummaryQuery.error)}`} />
          ) : null}
          {!procurementSummaryQuery.isLoading && !procurementSummaryQuery.isError && procurementSummary ? (
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <h4 style={styles.summaryCardTitle}>Shipments</h4>
                <div style={styles.summaryRow}><span>Total</span><strong>{formatNumber(procurementSummary.shipments.total_shipments, 0)}</strong></div>
                <div style={styles.summaryRow}><span>Pending</span><strong>{formatNumber(procurementSummary.shipments.pending_shipments, 0)}</strong></div>
                <div style={styles.summaryRow}><span>Partial</span><strong>{formatNumber(procurementSummary.shipments.partial_shipments, 0)}</strong></div>
                <div style={styles.summaryRow}><span>Received</span><strong>{formatNumber(procurementSummary.shipments.received_shipments, 0)}</strong></div>
                <div style={styles.summaryRow}><span>Overdue</span><strong>{formatNumber(procurementSummary.shipments.overdue_shipments, 0)}</strong></div>
              </div>
              <div style={styles.summaryCard}>
                <h4 style={styles.summaryCardTitle}>Shipment Lines</h4>
                <div style={styles.summaryRow}><span>Active Lines</span><strong>{formatNumber(procurementSummary.lines.total_active_shipment_lines, 0)}</strong></div>
                <div style={styles.summaryRow}><span>Ordered Quantity</span><strong>{formatNumber(procurementSummary.lines.total_ordered_quantity)}</strong></div>
                <div style={styles.summaryRow}><span>Received Quantity</span><strong>{formatNumber(procurementSummary.lines.total_received_quantity)}</strong></div>
                <div style={styles.summaryRow}><span>Discrepancy</span><strong>{formatNumber(procurementSummary.lines.total_discrepancy)}</strong></div>
              </div>
            </div>
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'forecast' ? (
        <ReportPanel
          title="Demand Forecast"
          subtitle="Usage-based demand forecast from recent negative stock movements over the last 30 days."
        >
          {forecastQuery.isLoading ? <div>Loading forecast...</div> : null}
          {forecastQuery.isError ? (
            <ErrorState message={`Failed to load forecast: ${getReadableError(forecastQuery.error)}`} />
          ) : null}
          {!forecastQuery.isLoading && !forecastQuery.isError ? (
            forecastRows.length === 0 ? (
              <EmptyState message="No recent consumption data was available to produce a forecast." />
            ) : (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Average Daily Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastRows.map((row) => (
                        <tr key={row.product_id}>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{row.product_name || row.product_id}</div>
                            <div style={styles.rowSubtle}>Product ID: {row.product_id}</div>
                          </td>
                          <td style={styles.td}>{formatNumber(row.avg_daily_usage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.mobileCards}>
                  {forecastRows.map((row) => (
                    <div key={`forecast-mobile-${row.product_id}`} style={styles.mobileCard}>
                      <div style={styles.mobileCardTitle}>{row.product_name || row.product_id}</div>
                      <div style={styles.mobileCardText}>Average Daily Usage: {formatNumber(row.avg_daily_usage)}</div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}
        </ReportPanel>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  pageStack: {
    /*
      What changed:
      - Added width guards to the root page stack.

      Why:
      - This page renders multiple dense report surfaces, tables, and tab panels.

      What problem this solves:
      - Reduces overflow pressure and keeps the report layout stable inside the shared app shell.
    */
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    minWidth: 0
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    minWidth: 0,
    overflow: 'hidden'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  panelHeaderText: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700
  },
  panelSubtitle: {
    margin: '8px 0 0 0',
    color: '#6b7280',
    lineHeight: 1.5,
    maxWidth: '820px',
    wordBreak: 'break-word'
  },
  panelActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
    width: '100%',
    minWidth: 0
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    minWidth: 0
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '8px',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statValueGood: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '8px',
    lineHeight: 1.2,
    color: '#166534',
    wordBreak: 'break-word'
  },
  statValueWarn: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '8px',
    lineHeight: 1.2,
    color: '#92400e',
    wordBreak: 'break-word'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  insightGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    width: '100%',
    minWidth: 0
  },
  insightCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    minWidth: 0
  },
  insightLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
    marginBottom: '8px'
  },
  insightValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  insightText: {
    color: '#475569',
    lineHeight: 1.45,
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  tabSection: {
    overflowX: 'auto',
    minWidth: 0
  },
  tabBar: {
    display: 'flex',
    gap: '10px',
    minWidth: 'max-content'
  },
  tabButton: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: '999px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tabButtonActive: {
    background: '#0f172a',
    borderColor: '#0f172a',
    color: '#ffffff'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto',
    minWidth: 0
  },
  table: {
    /*
      What changed:
      - Slightly reduced the forced minimum width while preserving all report columns.

      Why:
      - This report page needs wide tables, but the prior threshold was more aggressive than necessary.

      What problem this solves:
      - Eases medium-screen horizontal scrolling pressure without changing table structure or data density.
    */
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '780px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  rowTitle: {
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
    wordBreak: 'break-word'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#64748b',
    wordBreak: 'break-all'
  },
  mobileCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
    marginTop: '14px',
    minWidth: 0
  },
  mobileCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
    background: '#ffffff',
    minWidth: 0
  },
  mobileCardTitle: {
    fontWeight: 700,
    fontSize: '16px',
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  mobileCardText: {
    color: '#475569',
    lineHeight: 1.5,
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    minWidth: 0,
    flex: '1 1 220px'
  },
  textInput: {
    minWidth: '220px',
    maxWidth: '100%',
    width: '100%',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    padding: '10px 12px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  selectInput: {
    minWidth: '120px',
    maxWidth: '100%',
    width: '100%',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    padding: '10px 12px',
    fontSize: '14px',
    background: '#ffffff',
    boxSizing: 'border-box'
  },
  emptyState: {
    border: '1px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '20px',
    color: '#64748b',
    background: '#f8fafc'
  },
  errorState: {
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '16px',
    color: '#991b1b',
    background: '#fef2f2'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    width: '100%',
    minWidth: 0
  },
  summaryCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    background: '#ffffff',
    minWidth: 0
  },
  summaryCardTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px'
  },
  summaryRow: {
    /*
      What changed:
      - Allowed summary rows to wrap instead of forcing both ends onto one line.

      Why:
      - Shipment labels and values can become crowded on narrower widths.

      What problem this solves:
      - Keeps procurement summary cards readable without changing the metrics shown.
    */
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  permissionPanel: {
    background: '#fff7ed',
    border: '1px solid #fdba74',
    borderRadius: '14px',
    padding: '20px'
  },
  permissionTitle: {
    margin: '0 0 12px 0',
    fontSize: '22px',
    color: '#9a3412'
  },
  permissionText: {
    margin: '0 0 10px 0',
    color: '#7c2d12',
    lineHeight: 1.6
  }
};