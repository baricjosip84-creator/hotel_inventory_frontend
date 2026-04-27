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
  created_at: string;
  version: number;
}

export interface SupplierItem {
  id: string;
  tenant_id: string;
  name: string;
  contact_info: string | null;
  deleted_at: string | null;
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
