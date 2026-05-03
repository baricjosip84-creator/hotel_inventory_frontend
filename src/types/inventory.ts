export interface DashboardSummaryResponse {
  master_data: {
    total_products: number;
    total_suppliers: number;
    total_storage_locations: number;
  };
  shipments: {
    total_shipments: number;
    pending_shipments: number;
    partial_shipments: number;
    received_shipments: number;
  };
  alerts: {
    total_alerts: number;
    unresolved_alerts: number;
    critical_unresolved_alerts: number;
    unacknowledged_alerts: number;
  };
  stock: {
    total_stock_rows: number;
    low_stock_rows: number;
  };
}

export interface ProductPackageItem {
  id: string;
  tenant_id: string;
  product_id: string;
  package_name: string;
  barcode: string;
  units_per_package: number | string;
  is_default: boolean;
  created_at?: string;
  deleted_at?: string | null;
  version: number;
}

export interface ProductItem {
  id: string;
  tenant_id: string;
  name: string;
  category: string | null;
  unit: string;
  min_stock: number | string;
  supplier_id: string | null;
  supplier_name?: string | null;
  barcode?: string | null;
  package_count?: number | string;
  current_stock_quantity?: number | string;
  latest_unit_cost?: number | string | null;
  latest_total_cost?: number | string | null;
  latest_cost_source?: string | null;
  latest_cost_at?: string | null;
  estimated_inventory_value?: number | string | null;
  packages?: ProductPackageItem[];
  created_at: string;
  version: number;
}

export interface ProductCostHistoryItem {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  shipment_id?: string | null;
  shipment_po_number?: string | null;
  change: number | string;
  reason: string;
  receiving_note?: string | null;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  cost_source?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;
}

export interface ProductCostSummary {
  costed_movement_count: number | string;
  received_quantity: number | string;
  received_total_cost: number | string;
  min_unit_cost?: number | string | null;
  max_unit_cost?: number | string | null;
  weighted_average_unit_cost?: number | string | null;
  latest_cost_at?: string | null;
}

export interface ProductCostHistoryResponse {
  product: ProductItem;
  cost_summary?: ProductCostSummary;
  cost_history: ProductCostHistoryItem[];
}

export interface SupplierItem {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  contact_info: string | null;
  deleted_at: string | null;
}

export interface StockMovementItem {
  id: string;
  tenant_id?: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  shipment_id?: string | null;
  shipment_po_number?: string | null;
  change: number | string;
  reason: string;
  receiving_note?: string | null;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  cost_source?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;

  /*
    Package audit fields.

    These are populated when stock was received through package-aware shipment
    receiving. They remain null for manual stock actions and legacy receiving.
  */
  package_id?: string | null;
  package_count_received?: number | string | null;
  package_name?: string | null;
  package_barcode?: string | null;
  units_per_package?: number | string | null;
}

export interface AlertItem {
  id: string;
  tenant_id: string;
  product_id: string | null;
  product_name?: string | null;
  product_category?: string | null;
  product_unit?: string | null;
  type: string;
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolution_note?: string | null;
  severity: 'info' | 'warning' | 'critical';
  escalation_level: number;
  acknowledged: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  acknowledged_by_name?: string | null;
  last_escalated_at?: string | null;
}