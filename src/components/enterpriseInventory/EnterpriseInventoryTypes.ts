export type ParLevel = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  department?: string | null;
  min_quantity: number | string;
  par_quantity: number | string;
  reorder_quantity: number | string;
  active: boolean;
};

export type CycleCount = {
  id: string;
  status: string;
  department?: string | null;
  storage_location_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type DepartmentRequisition = {
  id: string;
  department: string;
  status: string;
  priority: string;
  notes?: string | null;
  created_at: string;
};

export type ApprovalRule = {
  id: string;
  entity_type: string;
  department?: string | null;
  min_amount: number | string;
  max_amount?: number | string | null;
  required_role: string;
  active: boolean;
};

export type ApprovalRuleForm = {
  entity_type: string;
  department: string;
  storage_location_id: string;
  min_amount: string;
  max_amount: string;
  required_role: string;
};

export type SupplierInvoice = {
  id: string;
  supplier_id: string;
  purchase_order_id?: string | null;
  shipment_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  status: string;
  total_amount: number | string;
  variance_status: string;
  created_at: string;
};

export type SupplierCatalogItem = {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_name?: string | null;
  product_name?: string | null;
  supplier_sku?: string | null;
  supplier_product_name?: string | null;
  lead_time_days?: number | string | null;
  min_order_quantity?: number | string | null;
  preferred?: boolean;
  active?: boolean;
  latest_unit_cost?: number | string | null;
  latest_currency?: string | null;
  created_at: string;
};

export type NotificationEvent = {
  id: string;
  event_type: string;
  entity_type?: string | null;
  severity: string;
  title: string;
  message?: string | null;
  created_at: string;
};

export type NotificationDelivery = {
  id: string;
  notification_event_id: string;
  channel: string;
  recipient?: string | null;
  status: string;
  created_at: string;
};

export type AlertItem = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  type: string;
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
  resolution_note?: string | null;
  severity: 'info' | 'warning' | 'critical' | string;
  escalation_level?: number | string | null;
  acknowledged?: boolean;
  acknowledged_at?: string | null;
  last_escalated_at?: string | null;
};

export type AlertForm = {
  type: string;
  message: string;
  product_id: string;
  severity: string;
  escalation_level: string;
};

export type AlertFilters = {
  resolved: string;
  acknowledged: string;
  severity: string;
  search: string;
};

export type AuditLog = {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type AuditFilters = {
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  support_only: boolean;
};

export type EntityAttachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  original_filename: string;
  stored_filename: string;
  mime_type?: string | null;
  file_size_bytes?: number | string | null;
  storage_path?: string | null;
  created_at: string;
};

export type BarcodeLabel = {
  id: string;
  product_id: string;
  product_name?: string | null;
  barcode_value: string;
  barcode_type: string;
  label_template?: string | null;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  created_at: string;
};

export type ProductOption = {
  id: string;
  name: string;
  category?: string | null;
  unit?: string | null;
  min_stock?: number | string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  barcode?: string | null;
  standard_unit_cost?: number | string | null;
  current_stock_quantity?: number | string | null;
  package_count?: number | string | null;
  effective_unit_cost?: number | string | null;
  estimated_inventory_value?: number | string | null;
  cost_variance_status?: string | null;
  version?: number | string | null;
};

export type ProductPackage = {
  id: string;
  product_id: string;
  package_name: string;
  barcode: string;
  units_per_package: number | string;
  is_default: boolean;
  created_at: string;
  version?: number | string | null;
};

export type StorageLocationOption = {
  id: string;
  name: string;
  temperature_zone?: string | null;
  created_at?: string | null;
};

export type SupplierOption = {
  id: string;
  name: string;
  email?: string | null;
  contact_info?: string | null;
};

export type SupplierPerformance = {
  supplier?: {
    id: string;
    name?: string | null;
  };
  metrics?: {
    total_shipments?: number | string;
    pending_shipments?: number | string;
    received_shipments?: number | string;
    partial_shipments?: number | string;
    last_delivery_date?: string | null;
  };
};

export type SupplierSlaBreach = {
  supplier_id: string;
  supplier_name?: string | null;
  late_shipments: number | string;
  earliest_missed_delivery?: string | null;
  latest_missed_delivery?: string | null;
};

export type StockItem = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  quantity: number | string;
  min_quantity?: number | string | null;
  product_min_stock?: number | string | null;
  updated_at?: string | null;
};

export type StockMovement = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  shipment_id?: string | null;
  shipment_po_number?: string | null;
  change: number | string;
  reason: string;
  user_name?: string | null;
  created_at: string;
};



export type DashboardSummary = {
  master_data?: {
    total_products?: number | string;
    total_suppliers?: number | string;
    total_storage_locations?: number | string;
  };
  shipments?: {
    total_shipments?: number | string;
    pending_shipments?: number | string;
    partial_shipments?: number | string;
    received_shipments?: number | string;
  };
  alerts?: {
    total_alerts?: number | string;
    unresolved_alerts?: number | string;
    critical_unresolved_alerts?: number | string;
    unacknowledged_alerts?: number | string;
  };
  stock?: {
    total_stock_rows?: number | string;
    low_stock_rows?: number | string;
  };
};

export type DashboardLowStockRow = StockItem & {
  min_stock?: number | string | null;
  shortage?: number | string | null;
};

export type DashboardOverdueShipment = {
  id: string;
  supplier_id: string;
  supplier_name?: string | null;
  delivery_date: string;
  status: string;
  po_number?: string | null;
  line_count?: number | string | null;
  total_ordered_quantity?: number | string | null;
  total_received_quantity?: number | string | null;
};

export type DashboardSupplierPerformance = {
  supplier_id: string;
  supplier_name?: string | null;
  total_shipments: number | string;
  pending_shipments: number | string;
  partial_shipments: number | string;
  received_shipments: number | string;
  overdue_shipments: number | string;
  last_delivery_date?: string | null;
};

export type InventoryValuationRow = {
  product_id: string;
  product_name?: string | null;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  quantity: number | string;
  estimated_unit_cost: number | string;
  estimated_total_value: number | string;
  updated_at?: string | null;
};

export type InventoryValuationReport = {
  totals?: {
    row_count?: number | string;
    estimated_inventory_value?: number | string;
  };
  rows: InventoryValuationRow[];
};

export type StockByLocationReportRow = {
  storage_location_id: string;
  storage_location_name?: string | null;
  temperature_zone?: string | null;
  stock_row_count: number | string;
  total_quantity: number | string;
};

export type ProductMovementReportRow = {
  product_id: string;
  product_name?: string | null;
  product_category?: string | null;
  product_unit?: string | null;
  movement_count: number | string;
  total_increase: number | string;
  total_decrease: number | string;
  last_movement_at?: string | null;
};

export type ProcurementSummaryReport = {
  shipments?: {
    total_shipments?: number | string;
    pending_shipments?: number | string;
    partial_shipments?: number | string;
    received_shipments?: number | string;
    overdue_shipments?: number | string;
  };
  lines?: {
    total_active_shipment_lines?: number | string;
    total_ordered_quantity?: number | string;
    total_received_quantity?: number | string;
    total_discrepancy?: number | string;
  };
};

export type ProductCostRiskRow = {
  id?: string;
  product_id?: string;
  name?: string | null;
  product_name?: string | null;
  category?: string | null;
  unit?: string | null;
  current_stock_quantity?: number | string | null;
  standard_unit_cost?: number | string | null;
  latest_unit_cost?: number | string | null;
  effective_unit_cost?: number | string | null;
  effective_cost_source?: string | null;
  estimated_inventory_value?: number | string | null;
  cost_variance_status?: string | null;
  cost_variance_percent?: number | string | null;
  cost_history_spread_percent?: number | string | null;
};

export type ProductCostRiskSummary = {
  thresholds?: {
    variance_threshold_percent?: number | string;
    history_spread_threshold_percent?: number | string;
    limit?: number | string;
  };
  totals?: {
    total_products?: number | string;
    stocked_products?: number | string;
    missing_cost_products?: number | string;
    high_variance_products?: number | string;
    inconsistent_cost_history_products?: number | string;
  };
  high_variance?: ProductCostRiskRow[];
  missing_cost?: ProductCostRiskRow[];
  inconsistent_cost_history?: ProductCostRiskRow[];
  recommended_actions?: string[];
};



export type ProductCostValuationRow = ProductCostRiskRow & {
  valuation_basis?: string | null;
  latest_cost_source?: string | null;
};

export type ProductCostValuationSummary = {
  limit?: number | string;
  totals?: Record<string, number | string | null | undefined>;
  basis_breakdown?: Array<Record<string, unknown>>;
  category_breakdown?: Array<Record<string, unknown>>;
  top_value_products?: ProductCostValuationRow[];
  notes?: string[];
};

export type ProductCostValuationDetails = {
  limit?: number | string;
  offset?: number | string;
  rows?: ProductCostValuationRow[];
};

export type ProductCostActionSummary = {
  generated_at?: string;
  thresholds?: Record<string, unknown>;
  totals?: Record<string, number | string | null | undefined>;
  actions?: Array<Record<string, unknown>>;
  recommended_actions?: string[];
  rows?: Array<Record<string, unknown>>;
};

export type ProductCostGenericSummary = {
  generated_at?: string;
  thresholds?: Record<string, unknown>;
  totals?: Record<string, number | string | null | undefined>;
  priority_bands?: Array<Record<string, unknown>>;
  next_actions?: Array<Record<string, unknown>>;
  categories?: Array<Record<string, unknown>>;
  impact_breakdown?: Array<Record<string, unknown>>;
  top_impact_products?: Array<Record<string, unknown>>;
  suppliers?: Array<Record<string, unknown>>;
  supplier_priority_products?: Array<Record<string, unknown>>;
  sources?: Array<Record<string, unknown>>;
  source_priority_products?: Array<Record<string, unknown>>;
  age_bands?: Array<Record<string, unknown>>;
  age_priority_products?: Array<Record<string, unknown>>;
  category_coverage?: Array<Record<string, unknown>>;
  coverage_gaps?: Array<Record<string, unknown>>;
  alert_groups?: Array<Record<string, unknown>>;
  top_alerts?: Array<Record<string, unknown>>;
  recommendation_groups?: Array<Record<string, unknown>>;
  top_recommendations?: Array<Record<string, unknown>>;
  top_review_categories?: Array<Record<string, unknown>>;
  priority_products?: Array<Record<string, unknown>>;
  executive_actions?: string[];
  checklist?: Array<Record<string, unknown>>;
  failed_checklist?: Array<Record<string, unknown>>;
  watch_checklist?: Array<Record<string, unknown>>;
  remediation_plan?: Array<Record<string, unknown>>;
  audit_rows?: Array<Record<string, unknown>>;
  blockers?: Array<Record<string, unknown>>;
  warnings?: Array<Record<string, unknown>>;
  signoff_checklist?: Array<Record<string, unknown>>;
  queue_items?: Array<Record<string, unknown>>;
  reviewer_guidance?: string[];
  review_export_rows?: Array<Record<string, unknown>>;
  closure_checklist?: Array<Record<string, unknown>>;
  archive_rows?: Array<Record<string, unknown>>;
  handoff_checklist?: Array<Record<string, unknown>>;
  owner_summary?: Array<Record<string, unknown>>;
  handoff_rows?: Array<Record<string, unknown>>;
  operating_rhythm?: Array<Record<string, unknown>>;
  escalation_rules?: Array<Record<string, unknown>>;
  runbook_rows?: Array<Record<string, unknown>>;
  control_checks?: Array<Record<string, unknown>>;
  evidence_sections?: Array<Record<string, unknown>>;
  evidence_rows?: Array<Record<string, unknown>>;
  readiness_checklist?: Array<Record<string, unknown>>;
  readiness_rows?: Array<Record<string, unknown>>;
  export_rows?: Array<Record<string, unknown>>;
  runbook_status?: string;
  control_status?: string;
  evidence_status?: string;
  readiness_status?: string;
  readiness_score?: number | string;
  evidence_summary?: Record<string, unknown>;
  readiness_breakdown?: Record<string, unknown>;
  signoff_status?: string;
  review_status?: string;
  closure_status?: string;
  handoff_status?: string;
  can_sign_off?: boolean;
  can_archive?: boolean;
  can_handoff?: boolean;
  notes?: string[];
};

export type ReorderRecommendation = {
  product_id: string;
  product_name?: string | null;
  category?: string | null;
  unit?: string | null;
  current_quantity: number | string;
  min_stock: number | string;
  stock_min_quantity?: number | string;
  product_min_stock?: number | string;
  recent_outbound: number | string;
  recent_usage_quantity?: number | string;
  average_daily_usage: number | string;
  estimated_days_of_coverage?: number | string | null;
  projected_depletion_date?: string | null;
  target_coverage_days?: number | string;
  target_stock_quantity?: number | string;
  recommended_reorder_quantity: number | string;
  urgency: string;
  recommendation_status?: string;
  source_signal?: string;
  recommended_supplier_id?: string | null;
  recommended_supplier_name?: string | null;
  supplier_source?: string | null;
  supplier_catalog_item_id?: string | null;
  supplier_sku?: string | null;
  lead_time_days?: number | string | null;
  min_order_quantity?: number | string;
  estimated_unit_cost?: number | string | null;
  estimated_total_cost?: number | string | null;
  currency?: string | null;
  procurement_ready?: boolean;
  blocker_code?: string | null;
  blocker_message?: string | null;
};

export type ReorderRecommendationsResponse = {
  generated_at: string;
  tenant_id?: string;
  lookback_days: number | string;
  target_coverage_days?: number | string;
  lead_time_buffer_days?: number | string;
  filters?: Record<string, unknown>;
  pagination?: {
    limit: number | string;
    offset: number | string;
    returned: number | string;
    total: number | string;
    has_more: boolean;
  };
  summary?: Record<string, number | string>;
  rows: ReorderRecommendation[];
};

export type DepletionRiskRow = {
  stock_id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  current_quantity: number | string;
  configured_min_quantity: number | string;
  recent_outbound_quantity: number | string;
  average_daily_outbound: number | string;
  estimated_days_of_coverage?: number | string | null;
  risk_score: number | string;
  risk_tier: string;
};

export type DepletionRiskResponse = {
  generated_at: string;
  lookback_days: number | string;
  rows: DepletionRiskRow[];
};

export type SupplierRiskFlag = {
  code?: string;
  label?: string;
  severity?: string;
};

export type SupplierTrustScore = {
  supplier_id: string;
  supplier_name?: string | null;
  total_shipments: number | string;
  overdue_shipments: number | string;
  fill_rate_pct: number | string;
  discrepancy_rate_pct: number | string;
  trust_score: number | string;
  trust_tier: string;
  open_purchase_orders?: number | string | null;
  overdue_open_purchase_orders?: number | string | null;
  po_remaining_value?: number | string | null;
  risk_flags?: SupplierRiskFlag[];
  last_delivery_date?: string | null;
};

export type SupplierTrustScoresResponse = {
  generated_at: string;
  summary?: {
    total_suppliers?: number | string;
    suppliers_with_risk?: number | string;
    high_risk_flags?: number | string;
    po_remaining_value?: number | string;
  };
  rows: SupplierTrustScore[];
};


export type OperationalHealthResponse = {
  generated_at: string;
  health_score: number | string;
  health_tier: string;
  metrics?: {
    unresolved_alerts?: number | string;
    overdue_shipments?: number | string;
    total_stock_rows?: number | string;
    low_stock_rows?: number | string;
    low_stock_rate_pct?: number | string;
    total_ordered_quantity?: number | string;
    total_discrepancy_quantity?: number | string;
    discrepancy_rate_pct?: number | string;
  };
  penalties?: {
    alert_penalty?: number | string;
    overdue_penalty?: number | string;
    low_stock_penalty?: number | string;
    discrepancy_penalty?: number | string;
  };
};

export type InventoryAnomaly = {
  product_id: string;
  product_name?: string | null;
  product_category?: string | null;
  product_unit?: string | null;
  short_window_days: number | string;
  baseline_window_days: number | string;
  recent_outbound_quantity: number | string;
  baseline_outbound_quantity: number | string;
  recent_daily_outbound: number | string;
  baseline_daily_outbound: number | string;
  spike_ratio: number | string;
  anomaly_score: number | string;
  anomaly_tier: string;
};

export type InventoryAnomaliesResponse = {
  generated_at: string;
  short_window_days: number | string;
  baseline_window_days: number | string;
  rows: InventoryAnomaly[];
};

export type DemandForecastRow = {
  product_id: string;
  product_name?: string | null;
  avg_daily_usage: number | string;
};


export type IntelligenceMetricValue = string | number | null | undefined;

export type IntelligenceSummary = Record<string, IntelligenceMetricValue>;

export type ForecastAccuracyBacktestRow = Record<string, unknown> & {
  product_id: string;
  product_name?: string | null;
  predicted_daily_usage?: number | string | null;
  actual_daily_usage?: number | string | null;
  absolute_error?: number | string | null;
  absolute_percent_error?: number | string | null;
  accuracy_status?: string | null;
};

export type ForecastCalibrationReviewRow = Record<string, unknown> & {
  product_id: string;
  product_name?: string | null;
  priority?: string | number | null;
  accuracy_status?: string | null;
  recommended_action?: string | null;
  review_note?: string | null;
};

export type ForecastDataQualityReviewRow = Record<string, unknown> & {
  product_id: string;
  product_name?: string | null;
  priority?: string | number | null;
  data_quality_status?: string | null;
  training_movement_count?: number | string | null;
  actual_movement_count?: number | string | null;
  recommended_action?: string | null;
};

export type ForecastReliabilityMatrixRow = Record<string, unknown> & {
  product_id: string;
  product_name?: string | null;
  priority?: string | number | null;
  reliability_status?: string | null;
  data_quality_status?: string | null;
  accuracy_status?: string | null;
  calibration_priority?: string | number | null;
  recommended_action?: string | null;
};

export type ForecastAccuracyBacktestResponse = {
  summary?: IntelligenceSummary;
  rows?: ForecastAccuracyBacktestRow[];
};

export type ForecastCalibrationReviewResponse = {
  summary?: IntelligenceSummary;
  rows?: ForecastCalibrationReviewRow[];
};

export type ForecastDataQualityReviewResponse = {
  summary?: IntelligenceSummary;
  rows?: ForecastDataQualityReviewRow[];
};

export type ForecastReliabilityMatrixResponse = {
  summary?: IntelligenceSummary;
  rows?: ForecastReliabilityMatrixRow[];
};

export type ProductionReviewResponse = {
  summary?: IntelligenceSummary;
  rows?: Array<Record<string, unknown>>;
  controls?: string[];
  safety_contract?: string[];
};

export type AutomationTypeDefinition = {
  automation_type: string;
  label?: string;
  description?: string;
  risk_level?: string;
  default_request_type?: string;
};

export type AutomationTypesResponse = {
  automation_types: AutomationTypeDefinition[];
  schedule_kinds: string[];
  statuses: string[];
  request_default_statuses: string[];
  notes?: string[];
};

export type AutomationSchedule = {
  id: string;
  name: string;
  description?: string | null;
  automation_type: string;
  status: string;
  schedule_kind: string;
  schedule_config?: Record<string, unknown> | null;
  request_defaults?: Record<string, unknown> | null;
  next_run_at?: string | null;
  last_run_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type AutomationSchedulesResponse = {
  total: number | string;
  rows: AutomationSchedule[];
  notes?: string[];
};

export type AutomationRunnerReadiness = {
  ready?: boolean;
  status?: string;
  total_count?: number | string;
  draft_count?: number | string;
  paused_count?: number | string;
  disabled_count?: number | string;
  due_count?: number | string;
  checks?: Array<{ key?: string; label?: string; status?: string; detail?: string }>;
  schedules?: AutomationSchedule[];
};

export type AutomationRunnerStatus = {
  runner_enabled?: boolean;
  running?: boolean;
  can_start_background_runner?: boolean;
  can_create_execution_requests_automatically?: boolean;
  can_execute_requests?: boolean;
  request_creation_hard_cap?: number | string;
  production_safety_lock?: Record<string, unknown>;
  checks?: Array<{ key?: string; label?: string; status?: string; detail?: string }>;
};

export type AutomationRunEvent = {
  id: string;
  automation_schedule_id: string;
  schedule_name?: string | null;
  automation_type?: string | null;
  run_mode?: string | null;
  status?: string | null;
  request_status?: string | null;
  execution_request_id?: string | null;
  trigger_source?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
};

export type AutomationRunEventsResponse = {
  total: number | string;
  rows: AutomationRunEvent[];
};

export type AutomationRunnerEvidenceResponse = Record<string, unknown> & {
  generated_at?: string;
  runner_mode?: string;
  request_creation_enabled?: boolean;
  execution_enabled?: boolean;
  operations_posture?: string;
  review_type?: string;
  matrix_type?: string;
  pack_type?: string;
  digest_type?: string;
  schedule_summary?: Record<string, unknown>;
  run_ledger_summary?: Record<string, unknown>;
  linked_request_summary?: Record<string, unknown>;
  evidence_summary?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  safety_summary?: Record<string, unknown>;
  safety?: Record<string, unknown>;
  checks?: Array<Record<string, unknown>>;
  policy_rows?: Array<Record<string, unknown>>;
  actor_breakdown?: Array<Record<string, unknown>>;
  request_status_breakdown?: Array<Record<string, unknown>>;
  due_schedules?: Array<Record<string, unknown>>;
  linked_schedule_requests?: Array<Record<string, unknown>>;
  latest_run_events?: Array<Record<string, unknown>>;
};

export type AutomationScheduleForm = {
  automation_type: string;
  name: string;
  description: string;
  schedule_kind: string;
  time: string;
  timezone: string;
  default_status: string;
};

export type SystemStatusResponse = {
  status?: string;
  write_lock?: boolean;
  maintenance_mode?: boolean;
  unresolved_blocking_alerts?: number | string;
  generated_at?: string;
  [key: string]: unknown;
};

export type SystemContextResponse = {
  generated_at?: string;
  tenant?: Record<string, unknown>;
  inventory?: Record<string, unknown>;
  procurement?: Record<string, unknown>;
  costing?: Record<string, unknown>;
  alerts?: Record<string, unknown>;
  audit?: Record<string, unknown>;
  access?: Record<string, unknown>;
  execution?: Record<string, unknown>;
  recommendations?: string[];
  read_only?: boolean;
  execution_enabled?: boolean;
  mutation_enabled?: boolean;
  [key: string]: unknown;
};

export type SystemExecutionGateResponse = {
  allowed?: boolean;
  status?: string;
  reasons?: string[];
  checks?: Array<{ key?: string; label?: string; status?: string; detail?: string }>;
  [key: string]: unknown;
};

export type SystemContextSnapshot = {
  id: string;
  generated_at?: string | null;
  created_at?: string | null;
  created_by_user_name?: string | null;
  created_by?: string | null;
  inventory_summary?: Record<string, unknown> | null;
  procurement_summary?: Record<string, unknown> | null;
  costing_summary?: Record<string, unknown> | null;
  alerts_summary?: Record<string, unknown> | null;
  audit_summary?: Record<string, unknown> | null;
  access_summary?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type SystemContextSnapshotList = {
  total?: number | string;
  rows?: SystemContextSnapshot[];
  snapshots?: SystemContextSnapshot[];
};

export type TenantPublicContext = {
  active?: boolean;
  enabled?: boolean;
  maintenance?: Record<string, unknown> | null;
  announcements?: unknown[];
  incidents?: unknown[];
  [key: string]: unknown;
};

export type ExecutionAdapter = {
  request_type?: string;
  type?: string;
  label?: string;
  description?: string;
  execution_enabled?: boolean;
  risk_level?: string;
};

export type ExecutionAdapterRegistry = {
  adapters?: ExecutionAdapter[];
  summary?: Record<string, unknown>;
  safety?: Record<string, unknown>;
  notes?: string[];
};

export type ExecutionHardeningSummary = {
  totals?: Record<string, number | string>;
  summary?: Record<string, number | string | boolean>;
  safety?: Record<string, unknown>;
  notes?: string[];
  [key: string]: unknown;
};

export type ExecutionRequest = {
  id: string;
  request_type: string;
  status: string;
  execution_status?: string | null;
  payload?: Record<string, unknown> | null;
  requested_by_name?: string | null;
  reviewed_by_name?: string | null;
  executed_by_name?: string | null;
  review_note?: string | null;
  rejection_reason?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  reviewed_at?: string | null;
  executed_at?: string | null;
};

export type ExecutionRequestsResponse = {
  limit: number | string;
  offset: number | string;
  total: number | string;
  rows: ExecutionRequest[];
  notes?: string[];
};

export type ExecutionFilters = {
  status: string;
  request_type: string;
  search: string;
};

export type StockTransfer = {
  id: string;
  from_storage_location_id: string;
  from_storage_location_name?: string | null;
  to_storage_location_id: string;
  to_storage_location_name?: string | null;
  status: string;
  notes?: string | null;
  created_by_user_name?: string | null;
  executed_by_user_name?: string | null;
  created_at: string;
  executed_at?: string | null;
  cancelled_at?: string | null;
  version?: number | string | null;
  item_count?: number | string | null;
  total_quantity?: number | string | null;
  items?: StockTransferItem[];
};

export type StockTransferItem = {
  id?: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  quantity: number | string;
};

export type PurchaseOrder = {
  id: string;
  supplier_id: string;
  supplier_name?: string | null;
  po_number?: string | null;
  status: string;
  expected_delivery_date?: string | null;
  created_at: string;
  version: number | string;
  item_count?: number | string | null;
  total_quantity?: number | string | null;
  estimated_total_cost?: number | string | null;
  received_estimated_cost?: number | string | null;
  linked_shipment_count?: number | string | null;
  total_received_quantity?: number | string | null;
  open_linked_shipment_count?: number | string | null;
  receiving_status?: string | null;
  delivery_status?: string | null;
  variance_status?: string | null;
  next_action_status?: string | null;
};

export type Shipment = {
  id: string;
  supplier_id: string;
  supplier_name?: string | null;
  delivery_date: string;
  status: string;
  po_number?: string | null;
  purchase_order_id?: string | null;
  linked_purchase_order_number?: string | null;
  linked_purchase_order_status?: string | null;
  created_at: string;
  version: number | string;
  line_count?: number | string | null;
  total_ordered_quantity?: number | string | null;
  total_received_quantity?: number | string | null;
};

export type ShipmentItem = {
  id: string;
  shipment_id: string;
  product_id: string;
  product_name?: string | null;
  quantity: number | string;
  received_quantity?: number | string | null;
  discrepancy?: number | string | null;
  discrepancy_reason?: string | null;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  last_received_at?: string | null;
  version?: number | string | null;
};

export type ShipmentBarcodeLookup = {
  shipment_item_id: string;
  shipment_id: string;
  product_id: string;
  quantity: number | string;
  received_quantity?: number | string | null;
  storage_location_id?: string | null;
  discrepancy?: number | string | null;
  discrepancy_reason?: string | null;
  product_name?: string | null;
  barcode: string;
  remaining_quantity?: number | string | null;
  product?: {
    id: string;
    name?: string | null;
    barcode?: string | null;
  };
  package?: {
    id: string;
    package_name: string;
    barcode: string;
    units_per_package: number | string;
    is_default: boolean;
  };
  calculated?: {
    remaining_quantity?: number | string | null;
    remaining_packages_estimate?: number | string | null;
    can_receive_one_full_package?: boolean;
  };
};

export type ShipmentBarcodeScanForm = {
  barcode: string;
  package_count: string;
};

export type PurchaseOrderShipmentForm = {
  purchase_order_id: string;
  delivery_date: string;
};

export type ShipmentReceivingForm = {
  shipment_id: string;
  product_id: string;
  storage_location_id: string;
  quantity_received: string;
  discrepancy_reason: string;
  receiving_note: string;
};

export type ParLevelForm = {
  product_id: string;
  storage_location_id: string;
  department: string;
  min_quantity: string;
  par_quantity: string;
  reorder_quantity: string;
};

export type RequisitionForm = {
  department: string;
  storage_location_id: string;
  priority: string;
  notes: string;
  product_id: string;
  requested_quantity: string;
};

export type CycleCountForm = {
  storage_location_id: string;
  department: string;
  notes: string;
  product_id: string;
  expected_quantity: string;
  counted_quantity: string;
};

export type StockAdjustmentForm = {
  product_id: string;
  storage_location_id: string;
  change: string;
  reason: string;
};

export type StockTransferForm = {
  from_storage_location_id: string;
  to_storage_location_id: string;
  product_id: string;
  quantity: string;
  notes: string;
};

export type StorageLocationForm = {
  name: string;
  temperature_zone: string;
};

export type SupplierForm = {
  name: string;
  email: string;
  contact_info: string;
};

export type ProductForm = {
  name: string;
  category: string;
  unit: string;
  min_stock: string;
  supplier_id: string;
  barcode: string;
  standard_unit_cost: string;
  package_name: string;
  units_per_package: string;
};

export type ProductPackageForm = {
  product_id: string;
  package_name: string;
  barcode: string;
  units_per_package: string;
  is_default: boolean;
};

export type BarcodeLabelForm = {
  product_id: string;
  barcode_value: string;
  barcode_type: string;
  label_template: string;
  lot_number: string;
  batch_number: string;
  expiry_date: string;
};

export type SupplierCatalogForm = {
  supplier_id: string;
  product_id: string;
  supplier_sku: string;
  supplier_product_name: string;
  lead_time_days: string;
  min_order_quantity: string;
  preferred: boolean;
  unit_cost: string;
  currency: string;
  effective_from: string;
};

export type SupplierInvoiceForm = {
  supplier_id: string;
  purchase_order_id: string;
  shipment_id: string;
  invoice_number: string;
  invoice_date: string;
  subtotal_amount: string;
  tax_amount: string;
  total_amount: string;
  product_id: string;
  quantity: string;
  unit_cost: string;
  expected_quantity: string;
  expected_unit_cost: string;
};

export type NotificationDeliveryForm = {
  notification_event_id: string;
  channel: string;
  recipient: string;
};

export type AttachmentForm = {
  entity_type: string;
  entity_id: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_size_bytes: string;
  storage_path: string;
};
