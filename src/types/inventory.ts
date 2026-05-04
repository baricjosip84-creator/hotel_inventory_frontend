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
  standard_unit_cost?: number | string | null;
  standard_cost_updated_at?: string | null;
  standard_cost_updated_by_user_id?: string | null;
  standard_cost_updated_by_user_name?: string | null;
  effective_unit_cost?: number | string | null;
  effective_cost_source?: string | null;
  effective_cost_at?: string | null;
  estimated_inventory_value?: number | string | null;
  cost_variance_status?: string | null;
  cost_variance_amount?: number | string | null;
  cost_variance_percent?: number | string | null;
  packages?: ProductPackageItem[];
  created_at: string;
  version: number;
}



export interface ProductCostValuationItem {
  id: string;
  name: string;
  category?: string | null;
  unit: string;
  current_stock_quantity?: number | string;
  latest_unit_cost?: number | string | null;
  latest_cost_source?: string | null;
  standard_unit_cost?: number | string | null;
  effective_unit_cost?: number | string | null;
  effective_cost_source?: string | null;
  valuation_basis: 'received' | 'standard' | 'none' | string;
  estimated_inventory_value?: number | string | null;
}

export interface ProductCostValuationSummaryResponse {
  limit: number | string;
  totals: {
    total_products: number | string;
    stocked_products: number | string;
    total_stock_quantity: number | string;
    total_estimated_inventory_value: number | string;
    received_cost_value: number | string;
    standard_fallback_value: number | string;
    unvalued_stock_quantity: number | string;
    unvalued_stocked_products: number | string;
  };
  basis_breakdown: Array<{
    valuation_basis: 'received' | 'standard' | 'none' | string;
    stocked_products: number | string;
    stock_quantity: number | string;
    estimated_value: number | string;
  }>;
  category_breakdown: Array<{
    category: string;
    stocked_products: number | string;
    stock_quantity: number | string;
    estimated_value: number | string;
    unvalued_stocked_products: number | string;
  }>;
  top_value_products: ProductCostValuationItem[];
  notes: string[];
}


export interface ProductCostValuationDetailsResponse {
  limit: number | string;
  offset: number | string;
  sort: string;
  direction: string;
  total: number | string;
  filtered_estimated_inventory_value: number | string;
  filtered_stock_quantity: number | string;
  rows: ProductCostValuationItem[];
  notes: string[];
}

export interface ProductCostRiskItem {
  id: string;
  name: string;
  category?: string | null;
  unit: string;
  standard_unit_cost?: number | string | null;
  current_stock_quantity?: number | string;
  latest_unit_cost?: number | string | null;
  latest_cost_source?: string | null;
  latest_cost_at?: string | null;
  effective_unit_cost?: number | string | null;
  effective_cost_source?: string | null;
  estimated_inventory_value?: number | string | null;
  cost_variance_status?: string | null;
  cost_variance_amount?: number | string | null;
  cost_variance_percent?: number | string | null;
  absolute_cost_variance_percent?: number | string | null;
  costed_movement_count?: number | string | null;
  min_unit_cost?: number | string | null;
  max_unit_cost?: number | string | null;
  weighted_average_unit_cost?: number | string | null;
  cost_history_spread_percent?: number | string | null;
  risk_type?: 'high_variance' | 'missing_cost' | 'inconsistent_history' | string | null;
  risk_priority_score?: number | string | null;
}

export interface ProductCostRiskDetailsResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
  };
  limit: number | string;
  offset: number | string;
  sort: string;
  direction: string;
  total: number | string;
  filtered_estimated_inventory_value: number | string;
  filtered_stock_quantity: number | string;
  rows: ProductCostRiskItem[];
  notes: string[];
}

export interface ProductCostRiskSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    total_products: number | string;
    stocked_products: number | string;
    missing_cost_products: number | string;
    high_variance_products: number | string;
    inconsistent_cost_history_products: number | string;
  };
  high_variance: ProductCostRiskItem[];
  missing_cost: ProductCostRiskItem[];
  inconsistent_cost_history: ProductCostRiskItem[];
  recommended_actions: string[];
}


export interface ProductCostActionSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    total_actionable_products: number | string;
    actionable_stock_quantity: number | string;
    actionable_estimated_inventory_value: number | string;
  };
  action_breakdown: Array<{
    action_type: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string;
    recommended_action: string;
    product_count: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_priority_score: number | string;
  }>;
  category_hotspots: Array<{
    category: string;
    product_count: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_priority_score: number | string;
  }>;
  priority_products: Array<ProductCostRiskItem & {
    action_type?: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string | null;
    recommended_action?: string | null;
    action_priority_score?: number | string | null;
  }>;
  notes: string[];
}


export interface ProductCostActionPlanSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    critical_priority_score: number | string;
    high_priority_score: number | string;
    limit: number | string;
  };
  totals: {
    total_actionable_products: number | string;
    critical_products: number | string;
    high_products: number | string;
    watch_products: number | string;
    urgent_estimated_inventory_value: number | string;
  };
  priority_bands: Array<{
    priority_band: 'critical' | 'high' | 'watch' | string;
    product_count: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_priority_score: number | string;
  }>;
  next_actions: Array<ProductCostRiskItem & {
    action_type?: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string | null;
    recommended_action?: string | null;
    action_priority_score?: number | string | null;
    priority_band?: 'critical' | 'high' | 'watch' | string | null;
  }>;
  notes: string[];
}


export interface ProductCostActionCategorySummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    critical_priority_score: number | string;
    high_priority_score: number | string;
    limit: number | string;
  };
  totals: {
    actionable_categories: number | string;
    total_actionable_products: number | string;
    total_actionable_estimated_value: number | string;
  };
  categories: Array<{
    category: string;
    product_count: number | string;
    critical_products: number | string;
    high_products: number | string;
    watch_products: number | string;
    missing_cost_products: number | string;
    standard_review_products: number | string;
    history_review_products: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_priority_score: number | string;
    recommended_focus: string;
  }>;
  notes: string[];
}

export interface ProductCostActionImpactSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    total_actionable_products: number | string;
    valued_inventory_review_products: number | string;
    unvalued_stock_review_products: number | string;
    master_data_review_products: number | string;
    total_actionable_estimated_value: number | string;
    unvalued_action_stock_quantity: number | string;
  };
  impact_breakdown: Array<{
    impact_type: 'valued_inventory_review' | 'unvalued_stock_review' | 'master_data_review' | string;
    product_count: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    average_priority_score: number | string;
    max_priority_score: number | string;
  }>;
  top_impact_products: Array<ProductCostRiskItem & {
    action_type?: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string | null;
    recommended_action?: string | null;
    action_priority_score?: number | string | null;
    impact_type?: 'valued_inventory_review' | 'unvalued_stock_review' | 'master_data_review' | string | null;
  }>;
  notes: string[];
}


export interface ProductCostActionSupplierSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    actionable_suppliers: number | string;
    total_actionable_products: number | string;
    total_actionable_estimated_value: number | string;
    total_actionable_stock_quantity: number | string;
  };
  suppliers: Array<{
    supplier_id?: string | null;
    supplier_name: string;
    product_count: number | string;
    missing_cost_products: number | string;
    standard_review_products: number | string;
    history_review_products: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_priority_score: number | string;
    recommended_supplier_action: string;
  }>;
  supplier_priority_products: Array<ProductCostRiskItem & {
    supplier_id?: string | null;
    supplier_name?: string | null;
    action_type?: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string | null;
    recommended_action?: string | null;
    action_priority_score?: number | string | null;
  }>;
  notes: string[];
}


export interface ProductCostActionSourceSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    total_actionable_products: number | string;
    missing_source_products: number | string;
    standard_source_products: number | string;
    received_source_products: number | string;
    total_actionable_estimated_value: number | string;
  };
  sources: Array<{
    cost_source: 'no_cost' | 'product_standard' | string;
    product_count: number | string;
    missing_cost_products: number | string;
    standard_review_products: number | string;
    history_review_products: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_priority_score: number | string;
    recommended_source_action: string;
  }>;
  source_priority_products: Array<ProductCostRiskItem & {
    action_type?: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string | null;
    recommended_action?: string | null;
    action_priority_score?: number | string | null;
  }>;
  notes: string[];
}

export interface ProductCostActionAgeSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    stale_cost_days: number | string;
    limit: number | string;
  };
  totals: {
    total_actionable_products: number | string;
    no_cost_date_products: number | string;
    standard_fallback_only_products: number | string;
    stale_received_cost_products: number | string;
    recent_received_cost_products: number | string;
    total_actionable_estimated_value: number | string;
  };
  age_bands: Array<{
    cost_age_band: 'no_cost_date' | 'standard_fallback_only' | 'stale_received_cost' | 'recent_received_cost' | string;
    product_count: number | string;
    missing_cost_products: number | string;
    standard_review_products: number | string;
    history_review_products: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_latest_cost_age_days?: number | string | null;
    max_priority_score: number | string;
    recommended_age_action: string;
  }>;
  age_priority_products: Array<ProductCostRiskItem & {
    latest_cost_age_days?: number | string | null;
    action_type?: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string | null;
    recommended_action?: string | null;
    action_priority_score?: number | string | null;
    cost_age_band?: 'no_cost_date' | 'standard_fallback_only' | 'stale_received_cost' | 'recent_received_cost' | string | null;
    recommended_age_action?: string | null;
  }>;
  notes: string[];
}


export interface ProductCostActionCoverageSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    total_products: number | string;
    stocked_products: number | string;
    products_with_cost_basis: number | string;
    stocked_products_with_cost_basis: number | string;
    uncosted_stocked_products: number | string;
    actionable_products: number | string;
    uncosted_stock_quantity: number | string;
    actionable_estimated_value: number | string;
    stocked_cost_coverage_percent: number | string;
    action_rate_percent: number | string;
  };
  category_coverage: Array<{
    category: string;
    total_products: number | string;
    stocked_products: number | string;
    stocked_products_with_cost_basis: number | string;
    uncosted_stocked_products: number | string;
    actionable_products: number | string;
    uncosted_stock_quantity: number | string;
    actionable_estimated_value: number | string;
    stocked_cost_coverage_percent: number | string;
    max_priority_score: number | string;
  }>;
  coverage_gaps: Array<ProductCostRiskItem & {
    action_type?: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string | null;
    action_priority_score?: number | string | null;
  }>;
  notes: string[];
}


export interface ProductCostAlertSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    stale_cost_days: number | string;
    spike_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    total_alerts: number | string;
    critical_alerts: number | string;
    warning_alerts: number | string;
    watch_alerts: number | string;
    alerted_estimated_value: number | string;
  };
  alert_groups: Array<{
    alert_type: 'missing_cost' | 'high_variance' | 'cost_spike' | 'inconsistent_history' | 'stale_cost' | string;
    alert_severity: 'critical' | 'warning' | 'watch' | string;
    alert_count: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_priority_score: number | string;
    recommended_alert_action: string;
  }>;
  top_alerts: Array<ProductCostRiskItem & {
    latest_cost_age_days?: number | string | null;
    previous_unit_cost?: number | string | null;
    latest_cost_change_percent?: number | string | null;
    alert_type?: 'missing_cost' | 'high_variance' | 'cost_spike' | 'inconsistent_history' | 'stale_cost' | string | null;
    alert_severity?: 'critical' | 'warning' | 'watch' | string | null;
    recommended_alert_action?: string | null;
    alert_priority_score?: number | string | null;
  }>;
  notes: string[];
}


export interface ProductCostRecommendationSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    stale_cost_days: number | string;
    spike_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    total_recommendations: number | string;
    critical_recommendations: number | string;
    high_recommendations: number | string;
    medium_recommendations: number | string;
    low_recommendations: number | string;
    recommended_stock_quantity: number | string;
    recommended_estimated_value: number | string;
  };
  recommendation_groups: Array<{
    recommendation_type: 'capture_missing_cost' | 'investigate_cost_spike' | 'investigate_cost_history' | 'review_standard_cost' | 'refresh_cost_evidence' | string;
    recommendation_priority: 'critical' | 'high' | 'medium' | 'low' | string;
    recommendation: string;
    product_count: number | string;
    stock_quantity: number | string;
    estimated_inventory_value: number | string;
    max_recommendation_score: number | string;
  }>;
  top_recommendations: Array<ProductCostRiskItem & {
    latest_cost_age_days?: number | string | null;
    previous_unit_cost?: number | string | null;
    latest_cost_change_percent?: number | string | null;
    recommendation_type?: 'capture_missing_cost' | 'investigate_cost_spike' | 'investigate_cost_history' | 'review_standard_cost' | 'refresh_cost_evidence' | string | null;
    recommendation_priority?: 'critical' | 'high' | 'medium' | 'low' | string | null;
    recommendation?: string | null;
    recommendation_score?: number | string | null;
  }>;
  notes: string[];
}


export interface ProductCostDashboardSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    stale_cost_days: number | string;
    spike_threshold_percent: number | string;
    limit: number | string;
  };
  totals: {
    total_products: number | string;
    stocked_products: number | string;
    total_stock_quantity: number | string;
    total_estimated_inventory_value: number | string;
    received_cost_value: number | string;
    standard_fallback_value: number | string;
    unvalued_stocked_products: number | string;
    unvalued_stock_quantity: number | string;
    total_recommendations: number | string;
    critical_recommendations: number | string;
    high_recommendations: number | string;
    medium_recommendations: number | string;
    low_recommendations: number | string;
    review_estimated_value: number | string;
    missing_cost_products: number | string;
    standard_review_products: number | string;
    spike_review_products: number | string;
    history_review_products: number | string;
    stale_cost_products: number | string;
    stocked_cost_coverage_percent: number | string;
    recommendation_rate_percent: number | string;
  };
  top_review_categories: Array<{
    category: string;
    recommendation_count: number | string;
    review_estimated_value: number | string;
    max_priority_score: number | string;
  }>;
  priority_products: Array<ProductCostRiskItem & {
    latest_cost_age_days?: number | string | null;
    latest_cost_change_percent?: number | string | null;
    valuation_basis?: 'received' | 'standard' | 'none' | string | null;
    recommendation_type?: 'capture_missing_cost' | 'investigate_cost_spike' | 'investigate_cost_history' | 'review_standard_cost' | 'refresh_cost_evidence' | string | null;
    recommendation_priority?: 'critical' | 'high' | 'medium' | 'low' | string | null;
    dashboard_priority_score?: number | string | null;
  }>;
  executive_actions: string[];
  notes: string[];
}


export interface ProductCostReportSummaryResponse {
  generated_at: string;
  report_scope: string;
  thresholds: ProductCostDashboardSummaryResponse['thresholds'];
  dashboard_totals: ProductCostDashboardSummaryResponse['totals'];
  valuation_totals: ProductCostValuationSummaryResponse['totals'];
  risk_totals: ProductCostRiskSummaryResponse['totals'];
  alert_totals: ProductCostAlertSummaryResponse['totals'];
  recommendation_totals: ProductCostRecommendationSummaryResponse['totals'];
  executive_actions: string[];
  report_sections: {
    top_review_categories: ProductCostDashboardSummaryResponse['top_review_categories'];
    priority_products: ProductCostDashboardSummaryResponse['priority_products'];
    alert_groups: ProductCostAlertSummaryResponse['alert_groups'];
    recommendation_groups: ProductCostRecommendationSummaryResponse['recommendation_groups'];
    top_risk_products?: ProductCostRiskItem[];
  };
  export_rows: Array<{
    section: string;
    metric: string;
    value: number | string;
  }>;
  notes: string[];
}



export interface ProductCostGovernanceSummaryResponse {
  generated_at: string;
  governance_status: 'ready' | 'watch' | 'needs_review' | string;
  readiness_score: number | string;
  thresholds: ProductCostDashboardSummaryResponse['thresholds'];
  totals: {
    total_products: number | string;
    stocked_products: number | string;
    total_estimated_inventory_value: number | string;
    review_estimated_value: number | string;
    stocked_cost_coverage_percent: number | string;
    total_alerts: number | string;
    total_recommendations: number | string;
    hardening_issue_count: number | string;
  };
  checklist: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  next_actions: string[];
  report_sections: ProductCostReportSummaryResponse['report_sections'];
  notes: string[];
}

export interface ProductCostGovernanceDetailsResponse {
  generated_at: string;
  governance_status: ProductCostGovernanceSummaryResponse['governance_status'];
  readiness_score: number | string;
  thresholds: ProductCostGovernanceSummaryResponse['thresholds'];
  totals: ProductCostGovernanceSummaryResponse['totals'];
  failed_checklist: ProductCostGovernanceSummaryResponse['checklist'];
  watch_checklist: ProductCostGovernanceSummaryResponse['checklist'];
  readiness_breakdown: {
    coverage_percent: number | string;
    open_alerts: number | string;
    open_recommendations: number | string;
    hardening_issue_count: number | string;
    review_estimated_value: number | string;
  };
  priority_products: Array<ProductCostDashboardSummaryResponse['priority_products'][number] | ProductCostHardeningSummaryResponse['priority_products'][number] | ProductCostRiskItem>;
  remediation_plan: Array<{
    key: string;
    priority: 'high' | 'medium' | 'low' | string;
    action: string;
    source: string;
  }>;
  audit_notes: string[];
}



export interface ProductCostGovernanceAuditPackResponse {
  generated_at: string;
  audit_scope: 'cost_governance' | string;
  governance_status: ProductCostGovernanceSummaryResponse['governance_status'];
  readiness_score: number | string;
  thresholds: ProductCostGovernanceSummaryResponse['thresholds'];
  totals: ProductCostGovernanceSummaryResponse['totals'];
  evidence_summary: {
    checklist_items: number | string;
    failed_checklist_items: number | string;
    watch_checklist_items: number | string;
    remediation_items: number | string;
    priority_products: number | string;
    hardening_issue_count: number | string;
  };
  audit_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  approval_notes: string[];
}


export interface ProductCostGovernanceSignoffSummaryResponse {
  generated_at: string;
  signoff_status: 'ready_for_signoff' | 'conditional_review' | 'not_ready' | string;
  can_sign_off: boolean;
  governance_status: ProductCostGovernanceSummaryResponse['governance_status'];
  readiness_score: number | string;
  totals: ProductCostGovernanceSummaryResponse['totals'];
  evidence_summary: ProductCostGovernanceAuditPackResponse['evidence_summary'];
  blockers: Array<{
    key: string;
    label: string;
    severity: 'blocker' | string;
    detail: string;
  }>;
  warnings: Array<{
    key: string;
    label: string;
    severity: 'warning' | string;
    detail: string;
  }>;
  signoff_checklist: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  approval_recommendation: string;
  notes: string[];
}


export interface ProductCostGovernanceReviewQueueResponse {
  generated_at: string;
  review_status: 'clear' | 'ready_for_signoff' | 'conditional_review' | 'not_ready' | string;
  totals: {
    queue_items: number | string;
    blockers: number | string;
    warnings: number | string;
    remediation_items: number | string;
    priority_products: number | string;
    audit_rows: number | string;
  };
  queue_items: Array<{
    queue_type: 'blocker' | 'warning' | 'remediation' | string;
    priority: 'critical' | 'high' | 'medium' | 'low' | string;
    key: string;
    label: string;
    detail: string;
    owner_hint: string;
    evidence: string;
  }>;
  priority_products: Array<{
    product_id?: string;
    name: string;
    category: string;
    estimated_inventory_value: number | string;
    valuation_basis?: string | null;
    recommendation: string;
  }>;
  reviewer_guidance: string[];
  notes: string[];
}

export interface ProductCostGovernanceReviewPackResponse {
  generated_at: string;
  closure_status: 'ready_to_close' | 'clear' | 'ready_for_signoff' | 'conditional_review' | 'not_ready' | string;
  can_close_review: boolean;
  signoff_status: ProductCostGovernanceSignoffSummaryResponse['signoff_status'];
  governance_status: ProductCostGovernanceSummaryResponse['governance_status'];
  readiness_score: number | string;
  totals: ProductCostGovernanceReviewQueueResponse['totals'] & {
    review_export_rows: number | string;
  };
  closure_cards: Array<{
    key: string;
    label: string;
    status: string;
    detail: string;
  }>;
  review_export_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  product_review_rows: ProductCostGovernanceReviewQueueResponse['priority_products'];
  closure_guidance: string[];
  notes: string[];
}


export interface ProductCostGovernanceClosureSummaryResponse {
  generated_at: string;
  closure_status: 'ready_to_archive' | 'blocked' | 'conditional_followup' | 'evidence_review' | string;
  can_archive: boolean;
  signoff_status: ProductCostGovernanceSignoffSummaryResponse['signoff_status'];
  governance_status: ProductCostGovernanceSummaryResponse['governance_status'];
  readiness_score: number | string;
  totals: {
    blockers: number | string;
    warnings: number | string;
    remediation_items: number | string;
    priority_products: number | string;
    audit_rows: number | string;
    review_export_rows: number | string;
    archive_rows: number | string;
  };
  closure_checklist: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  archive_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  closure_guidance: string[];
  notes: string[];
}


export interface ProductCostGovernanceHandoffSummaryResponse {
  generated_at: string;
  handoff_status: 'ready_for_handoff' | 'blocked' | 'conditional_handoff_review' | 'evidence_review' | string;
  can_handoff: boolean;
  closure_status: ProductCostGovernanceClosureSummaryResponse['closure_status'];
  governance_status: ProductCostGovernanceSummaryResponse['governance_status'];
  readiness_score: number | string;
  totals: {
    blockers: number | string;
    warnings: number | string;
    remediation_items: number | string;
    evidence_rows: number | string;
    archive_rows: number | string;
    review_export_rows: number | string;
    audit_rows: number | string;
  };
  handoff_checklist: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  owner_summary: Array<{
    owner: string;
    responsibility: string;
    status: string;
  }>;
  handoff_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  handoff_guidance: string[];
  notes: string[];
}


export interface ProductCostOperationsRunbookSummaryResponse {
  generated_at: string;
  runbook_status: 'steady_state' | 'monitoring' | 'active_review' | 'evidence_review' | string;
  handoff_status: ProductCostGovernanceHandoffSummaryResponse['handoff_status'];
  can_handoff: boolean;
  totals: {
    blockers: number | string;
    warnings: number | string;
    remediation_items: number | string;
    hardening_issues: number | string;
    flagged_products: number | string;
    evidence_rows: number | string;
    report_rows: number | string;
    operating_rhythm_items: number | string;
    escalation_rules: number | string;
    runbook_rows: number | string;
  };
  operating_rhythm: Array<{
    cadence: string;
    owner: string;
    action: string;
    source: string;
    status: string;
  }>;
  escalation_rules: Array<{
    key: string;
    condition: string;
    current_value: number | string;
    escalation: string;
  }>;
  runbook_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  runbook_guidance: string[];
  notes: string[];
}


export interface ProductCostOperationsControlSummaryResponse {
  generated_at: string;
  control_status: 'controlled' | 'control_watch' | 'control_review' | string;
  runbook_status: ProductCostOperationsRunbookSummaryResponse['runbook_status'];
  governance_status: ProductCostGovernanceSummaryResponse['governance_status'];
  totals: {
    checks: number | string;
    passed_checks: number | string;
    watch_checks: number | string;
    review_checks: number | string;
    coverage_percent: number | string;
    hardening_issues: number | string;
    blockers: number | string;
    warnings: number | string;
    flagged_products: number | string;
    open_alerts: number | string;
    open_recommendations: number | string;
  };
  control_checks: Array<{
    key: string;
    label: string;
    status: string;
    value: number | string;
    detail: string;
    owner: string;
  }>;
  operating_guidance: string[];
  notes: string[];
}

export interface ProductCostOperationsEvidenceSummaryResponse {
  generated_at: string;
  evidence_status: 'evidence_ready' | 'evidence_watch' | 'evidence_review' | string;
  control_status: ProductCostOperationsControlSummaryResponse['control_status'];
  runbook_status: ProductCostOperationsRunbookSummaryResponse['runbook_status'];
  totals: {
    evidence_sections: number | string;
    ready_sections: number | string;
    watch_sections: number | string;
    review_sections: number | string;
    audit_rows: number | string;
    report_rows: number | string;
    runbook_rows: number | string;
    control_checks: number | string;
    review_checks: number | string;
    watch_checks: number | string;
    flagged_products: number | string;
    evidence_rows: number | string;
  };
  evidence_sections: Array<{
    key: string;
    label: string;
    source: string;
    rows: number | string;
    status: string;
    purpose: string;
  }>;
  evidence_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  evidence_guidance: string[];
  notes: string[];
}

export interface ProductCostOperationsReadinessSummaryResponse {
  generated_at: string;
  readiness_status: 'operationally_ready' | 'readiness_watch' | 'readiness_review' | string;
  readiness_score: number | string;
  evidence_status: ProductCostOperationsEvidenceSummaryResponse['evidence_status'];
  control_status: ProductCostOperationsControlSummaryResponse['control_status'];
  runbook_status: ProductCostOperationsRunbookSummaryResponse['runbook_status'];
  handoff_status: ProductCostGovernanceHandoffSummaryResponse['handoff_status'];
  can_handoff: boolean;
  totals: {
    checks: number | string;
    passed_checks: number | string;
    watch_checks: number | string;
    review_checks: number | string;
    blockers: number | string;
    warnings: number | string;
    flagged_products: number | string;
    evidence_rows: number | string;
    runbook_rows: number | string;
    control_checks: number | string;
    readiness_rows: number | string;
  };
  readiness_checklist: Array<{
    key: string;
    label: string;
    status: string;
    value: number | string | null;
    detail: string;
  }>;
  readiness_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  readiness_guidance: string[];
  notes: string[];
}




export interface ProductCostGovernanceFinalSummaryResponse {
  generated_at: string;
  final_status: 'finalized' | 'final_watch' | 'final_review_required' | string;
  final_score: number | string;
  can_finalize: boolean;
  readiness_status: ProductCostOperationsReadinessSummaryResponse['readiness_status'];
  governance_status: ProductCostGovernanceSummaryResponse['governance_status'];
  signoff_status: ProductCostGovernanceSignoffSummaryResponse['signoff_status'];
  closure_status: ProductCostGovernanceClosureSummaryResponse['closure_status'];
  handoff_status: ProductCostGovernanceHandoffSummaryResponse['handoff_status'];
  evidence_status: ProductCostOperationsEvidenceSummaryResponse['evidence_status'];
  control_status: ProductCostOperationsControlSummaryResponse['control_status'];
  totals: {
    checks: number | string;
    passed_checks: number | string;
    watch_checks: number | string;
    review_checks: number | string;
    operational_review_checks: number | string;
    operational_watch_checks: number | string;
    blockers: number | string;
    warnings: number | string;
    evidence_rows: number | string;
    final_rows: number | string;
  };
  final_checklist: Array<{
    key: string;
    label: string;
    status: string;
    value: number | string | null;
    detail: string;
  }>;
  final_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  final_guidance: string[];
  notes: string[];
}

export interface ProductCostPerformanceSummaryResponse {
  generated_at: string;
  performance_status: 'performance_ready' | 'performance_watch' | 'performance_review' | string;
  performance_score: number | string;
  query_optimization_status: 'indexes_ready' | 'indexes_pending' | string;
  final_status: ProductCostGovernanceFinalSummaryResponse['final_status'];
  can_finalize: boolean;
  totals: {
    checks: number | string;
    passed_checks: number | string;
    watch_checks: number | string;
    review_checks: number | string;
    expected_indexes: number | string;
    present_indexes: number | string;
    missing_indexes: number | string;
    report_rows: number | string;
    valuation_products: number | string;
    final_rows: number | string;
    operational_review_checks: number | string;
  };
  index_checks: Array<{
    key: string;
    label: string;
    status: string;
    value: number | string | null;
    detail: string;
  }>;
  payload_checks: Array<{
    key: string;
    label: string;
    status: string;
    value: number | string | null;
    detail: string;
  }>;
  performance_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  performance_guidance: string[];
  notes: string[];
}


export interface ProductCostSecurityAuditSummaryResponse {
  generated_at: string;
  security_status: 'security_ready' | 'security_watch' | 'security_review' | string;
  security_score: number | string;
  tenant_scope_status: 'tenant_scoped' | 'tenant_scope_review' | string;
  access_context: {
    actor_type: string;
    role: string | null;
    support_session_present: boolean;
    platform_context_present: boolean;
  };
  performance_status: ProductCostPerformanceSummaryResponse['performance_status'];
  final_status: ProductCostGovernanceFinalSummaryResponse['final_status'];
  can_finalize: boolean;
  totals: {
    checks: number | string;
    passed_checks: number | string;
    watch_checks: number | string;
    review_checks: number | string;
    permission_checks: number | string;
    boundary_checks: number | string;
    performance_review_checks: number | string;
    final_review_checks: number | string;
  };
  permission_checks: Array<{
    key: string;
    label: string;
    status: string;
    value: number | string | null;
    detail: string;
  }>;
  boundary_checks: Array<{
    key: string;
    label: string;
    status: string;
    value: number | string | null;
    detail: string;
  }>;
  security_rows: Array<{
    section: string;
    key: string;
    label: string;
    status: string;
    value: number | string | null;
  }>;
  security_guidance: string[];
  notes: string[];
}

export interface ProductCostHardeningSummaryResponse {
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
    stale_cost_days: number | string;
    limit: number | string;
  };
  totals: {
    total_products: number | string;
    stocked_products: number | string;
    missing_stock_cost_products: number | string;
    standard_fallback_stocked_products: number | string;
    high_variance_products: number | string;
    inconsistent_history_products: number | string;
    stale_received_cost_products: number | string;
    mixed_cost_source_products: number | string;
    movement_cost_integrity_products: number | string;
    hardening_review_value: number | string;
    issue_count: number | string;
  };
  priority_products: Array<ProductCostRiskItem & {
    latest_cost_age_days?: number | string | null;
    valuation_basis?: 'received' | 'standard' | 'none' | string | null;
    costed_movement_count?: number | string | null;
    cost_source_count?: number | string | null;
    negative_cost_rows?: number | string | null;
    unit_without_total_rows?: number | string | null;
    has_missing_stock_cost?: boolean;
    uses_standard_fallback_for_stock?: boolean;
    has_high_variance?: boolean;
    has_inconsistent_history?: boolean;
    has_stale_received_cost?: boolean;
    has_mixed_cost_sources?: boolean;
    has_movement_cost_integrity_gap?: boolean;
    hardening_score?: number | string | null;
  }>;
  hardening_actions: string[];
  notes: string[];
}

export interface ProductCostActionDetailsResponse {
  limit: number | string;
  offset: number | string;
  sort: string;
  direction: string;
  thresholds: {
    variance_threshold_percent: number | string;
    history_spread_threshold_percent: number | string;
  };
  total: number | string;
  filtered_stock_quantity: number | string;
  filtered_estimated_inventory_value: number | string;
  rows: Array<ProductCostRiskItem & {
    action_type?: 'capture_missing_cost' | 'review_standard_cost' | 'investigate_cost_history' | string | null;
    recommended_action?: string | null;
    action_priority_score?: number | string | null;
  }>;
  notes: string[];
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


export interface ProductStandardCostHistoryItem {
  id: string;
  product_id: string;
  product_name: string;
  previous_standard_unit_cost?: number | string | null;
  new_standard_unit_cost?: number | string | null;
  changed_by_user_id?: string | null;
  changed_by_user_name?: string | null;
  changed_at: string;
  change_source: string;
}

export interface ProductStandardCostHistoryResponse {
  product: ProductItem;
  limit: number | string;
  standard_cost_history: ProductStandardCostHistoryItem[];
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

export interface SystemContextExecutionGateResponse {
  allowed: boolean;
  reason: string;
  blockers: string[];
  required_permissions: string[];
  risk_level: 'low' | 'medium' | 'high' | string;
  recommendation: string;
  evaluated_at: string;
  evidence: {
    readiness_status: string;
    readiness_failed_checks: number | string;
    readiness_warning_checks: number | string;
    critical_risk_signals: string[];
    high_priority_recommendations: string[];
    execution_gate_status: string;
    blocked_execution_gates: number | string;
    review_execution_gates: number | string;
    dry_run_closure_status: string;
    dry_run_blocked_checks: number | string;
    dry_run_review_checks: number | string;
    mutation_allowed_by_dry_run_policy: boolean;
    context_quality_status: string;
    context_quality_score: number | string;
  };
  notes: string[];
}

export interface SystemContextResponse {
  status: 'ready' | 'watch' | 'attention_required' | string;
  tenant: {
    id: string;
    name: string;
    created_at?: string;
  };
  generated_at: string;
  sections: string[];
  context: {
    inventory?: {
      total_products: number | string;
      stocked_products: number | string;
      total_stock_quantity: number | string;
      low_stock_products: number | string;
      storage_locations: number | string;
      suppliers: number | string;
    };
    procurement?: {
      open_shipments: number | string;
      partial_shipments: number | string;
      received_shipments: number | string;
      open_purchase_orders: number | string;
      approved_purchase_orders: number | string;
    };
    costing?: {
      total_products: number | string;
      costed_products: number | string;
      uncosted_stocked_products: number | string;
      estimated_inventory_value: number | string;
      missing_standard_cost_products: number | string;
      high_variance_products: number | string;
    };
    alerts?: {
      unresolved_alerts: number | string;
      critical_unresolved_alerts: number | string;
      unacknowledged_alerts: number | string;
      latest_alert_at?: string | null;
    };
    audit?: {
      audit_events_7d: number | string;
      support_events_7d: number | string;
      latest_audit_at?: string | null;
    };
    access?: {
      actor_type: string;
      support_session_id?: string | null;
      active_support_sessions: number | string;
      latest_support_session_at?: string | null;
    };
  };
  risk_signals: Array<{
    code: string;
    severity: 'critical' | 'warning' | 'info' | string;
    message: string;
    count?: number | string;
  }>;
  recommendations: Array<{
    code: string;
    priority: 'high' | 'medium' | 'low' | string;
    title: string;
    action: string;
    source_section: string;
  }>;
  context_sources: Array<{
    section: string;
    status: 'included' | 'unknown' | string;
    source_tables: string[];
    description: string;
    last_observed_at?: string | null;
  }>;
  context_quality: {
    status: 'strong' | 'usable_with_review' | 'limited' | string;
    score: number | string;
    summary: string;
    factors: Array<{
      code: string;
      label: string;
      status: 'positive' | 'neutral' | 'negative' | string;
      message: string;
    }>;
    source_quality: Array<{
      section: string;
      status: 'available' | 'unknown' | string;
      score: number | string;
      message: string;
    }>;
  };
  context_freshness: {
    status: 'current' | 'review_recommended' | 'stale_sources_present' | string;
    current_sources: number | string;
    aging_sources: number | string;
    stale_sources: number | string;
    unknown_sources: number | string;
    items: Array<{
      section: string;
      status: 'fresh' | 'aging' | 'stale' | 'unknown' | 'not_timestamped' | string;
      last_observed_at?: string | null;
      age_hours?: number | string | null;
      message: string;
    }>;
    notes: string[];
  };
  automation_plan: Array<{
    phase: string;
    status: 'ready' | 'needs_review' | 'blocked' | 'manual_only' | string;
    title: string;
    description: string;
    required_before_automation: boolean;
    evidence: string[];
  }>;
  automation_readiness: {
    status: 'ready' | 'needs_review' | 'blocked' | string;
    score: number | string;
    passed_checks: number | string;
    warning_checks: number | string;
    failed_checks: number | string;
    checks: Array<{
      code: string;
      label: string;
      status: 'pass' | 'warn' | 'fail' | 'not_evaluated' | string;
      message: string;
    }>;
    blockers: string[];
    warnings: string[];
  };
  decision_boundaries: {
    status: 'restricted' | 'review_required' | 'clear_for_read_only_use' | string;
    allowed_use_cases: string[];
    prohibited_use_cases: string[];
    restricted_use_cases: string[];
    boundaries: Array<{
      code: string;
      status: 'allowed' | 'allowed_with_review' | 'blocked' | 'prohibited' | 'restricted' | 'not_applicable' | string;
      title: string;
      description: string;
      required_human_review: boolean;
      source_sections: string[];
    }>;
    escalation_conditions: Array<{
      code: string;
      severity: 'critical' | 'warning' | 'info' | string;
      message: string;
      evidence: string[];
    }>;
  };
  execution_gates: {
    status: 'blocked' | 'needs_review' | 'open_for_read_only_use' | string;
    open_gates: number | string;
    review_gates: number | string;
    blocked_gates: number | string;
    required_gates: number | string;
    gates: Array<{
      code: string;
      label: string;
      status: 'open' | 'needs_review' | 'blocked' | string;
      required_before_execution: boolean;
      owner: string;
      description: string;
      evidence: string[];
    }>;
    notes: string[];
  };
  context_observability: {
    status: 'clean_observed' | 'review_observed' | 'blocked_observed' | string;
    observed_signals: number | string;
    evidence_events_7d: number | string;
    observable_sources: number | string;
    requested_sources: number | string;
    latest_observed_at?: string | null;
    items: Array<{
      code: string;
      status: 'clear' | 'observed' | 'quiet' | 'tracked' | 'incomplete' | 'stale' | string;
      label: string;
      message: string;
      evidence: string[];
    }>;
    notes: string[];
  };
  automation_review_checklist: {
    status: 'clear' | 'watch' | 'needs_review' | 'blocked' | string;
    total_items: number | string;
    critical_items: number | string;
    high_items: number | string;
    medium_items: number | string;
    low_items: number | string;
    items: Array<{
      code: string;
      category: 'readiness' | 'recommendation' | 'freshness' | string;
      priority: 'critical' | 'high' | 'medium' | 'low' | string;
      owner: string;
      title: string;
      action: string;
      evidence: string[];
    }>;
    notes: string[];
  };
  automation_action_hooks: {
    status: 'ready_for_read_only_hooks' | 'approval_required' | 'blocked_hooks_present' | string;
    total_hooks: number | string;
    safe_read_only_hooks: number | string;
    approval_required_hooks: number | string;
    blocked_hooks: number | string;
    hooks: Array<{
      code: string;
      hook_type: 'human_review' | 'recommendation_followup' | 'read_only_summary' | 'read_only_export' | string;
      status: 'available' | 'blocked' | string;
      title: string;
      description: string;
      owner: string;
      source: string;
      priority: 'critical' | 'high' | 'medium' | 'low' | string;
      safe_to_trigger: boolean;
      requires_human_approval: boolean;
      evidence: string[];
    }>;
    notes: string[];
  };
  automation_hook_policy: {
    status: 'read_only_ready' | 'approval_required' | 'blocked_hooks_present' | string;
    read_only_allowed: number | string;
    approval_required: number | string;
    blocked: number | string;
    prohibited_mutations: number | string;
    rules: Array<{
      code: string;
      status: 'allowed' | 'not_available' | 'approval_required' | 'blocked' | 'clear' | 'prohibited' | string;
      title: string;
      description: string;
      applies_to: string[];
    }>;
    notes: string[];
  };
  automation_execution_log: {
    status: 'read_only_events_recorded' | 'review_events_present' | 'blocked_events_present' | string;
    total_events: number | string;
    read_only_events: number | string;
    hook_events: number | string;
    gate_events: number | string;
    blocked_events: number | string;
    events: Array<{
      code: string;
      event_type: 'read_only_context' | 'hook_descriptor' | 'execution_gate' | string;
      status: 'recorded' | 'available' | 'approval_required' | 'needs_review' | 'blocked' | string;
      actor_type: string;
      title: string;
      message: string;
      source: string;
      evidence: string[];
      occurred_at?: string | null;
    }>;
    notes: string[];
  };
  automation_execution_replay: {
    status: 'read_only_replay_available' | 'needs_review' | 'blocked' | string;
    total_steps: number | string;
    available_steps: number | string;
    review_steps: number | string;
    blocked_steps: number | string;
    replayable_events: number | string;
    mutation_replay_allowed: boolean;
    steps: Array<{
      code: string;
      sequence: number | string;
      replay_type: 'read_only_input' | 'trace_review' | 'policy_check' | 'safety_check' | string;
      status: 'available' | 'not_available' | 'needs_review' | 'blocked' | 'blocked_for_mutation' | string;
      title: string;
      description: string;
      evidence: string[];
    }>;
    notes: string[];
  };

  automation_execution_replay_verification: {
    status: 'verified' | 'needs_review' | 'failed' | string;
    total_checks: number | string;
    passed_checks: number | string;
    review_checks: number | string;
    failed_checks: number | string;
    verification_scope: string;
    checks: Array<{
      code: string;
      status: 'passed' | 'needs_review' | 'failed' | string;
      title: string;
      description: string;
      evidence: string[];
    }>;
    notes: string[];
  };
  automation_dry_run_summary: {
    status: 'ready_for_read_only_dry_run' | 'approval_required' | 'blocked' | string;
    total_scenarios: number | string;
    ready_scenarios: number | string;
    approval_required_scenarios: number | string;
    blocked_scenarios: number | string;
    mutation_scenarios_allowed: number | string;
    scenarios: Array<{
      code: string;
      dry_run_type: 'read_only_summary' | 'read_only_export' | 'approval_routing' | 'mutation_safety_boundary' | string;
      status: 'ready' | 'approval_required' | 'blocked' | string;
      title: string;
      description: string;
      required_inputs: string[];
      expected_output: string;
      mutation_allowed: boolean;
      human_approval_required: boolean;
      evidence: string[];
    }>;
    notes: string[];
  };
  automation_dry_run_evidence: {
    status: 'complete' | 'needs_review' | 'blocked' | string;
    total_items: number | string;
    complete_items: number | string;
    review_items: number | string;
    blocked_items: number | string;
    evidence_scope: string;
    items: Array<{
      code: string;
      evidence_type: 'input_coverage' | 'replay_verification' | 'safety_boundary' | 'approval_path' | string;
      status: 'complete' | 'needs_review' | 'blocked' | string;
      title: string;
      description: string;
      scenario_codes: string[];
      evidence: string[];
    }>;
    notes: string[];
  };
  automation_dry_run_policy: {
    status: 'enforced' | 'review_required' | 'blocked' | string;
    total_rules: number | string;
    enforced_rules: number | string;
    review_rules: number | string;
    blocked_rules: number | string;
    mutation_allowed: boolean;
    rules: Array<{
      code: string;
      rule_type: 'scope' | 'mutation_boundary' | 'approval' | 'evidence' | string;
      status: 'enforced' | 'clear' | 'review_required' | 'blocked' | string;
      title: string;
      description: string;
      applies_to: string[];
      required: boolean;
      enforcement: string;
    }>;
    notes: string[];
  };
  automation_dry_run_outcomes: {
    status: 'ready_for_read_only_review' | 'approval_required' | 'blocked' | string;
    total_outcomes: number | string;
    ready_outcomes: number | string;
    approval_required_outcomes: number | string;
    blocked_outcomes: number | string;
    downstream_execution_allowed: boolean;
    outcomes: Array<{
      code: string;
      scenario_code: string;
      status: 'ready' | 'approval_required' | 'blocked' | string;
      title: string;
      summary: string;
      safe_to_present: boolean;
      downstream_execution_allowed: boolean;
      blocking_reasons: string[];
      evidence: string[];
    }>;
    notes: string[];
  };
  automation_dry_run_closure: {
    status: 'closed' | 'closed_with_review' | 'blocked' | string;
    total_checks: number | string;
    closed_checks: number | string;
    review_required_checks: number | string;
    blocked_checks: number | string;
    closure_scope: string;
    ready_for_future_execution_engine: boolean;
    checks: Array<{
      code: string;
      status: 'closed' | 'review_required' | 'blocked' | string;
      title: string;
      description: string;
      evidence: string[];
    }>;
    notes: string[];
  };
  automation_contract: {
    read_only: boolean;
    tenant_scoped: boolean;
    safe_for_ai_summary: boolean;
    mutation_allowed: boolean;
    notes: string[];
  };
}



export interface ExecutionAdapterDefinition {
  request_type: ExecutionRequest['request_type'];
  label: string;
  description: string;
  category: string;
  risk_level: 'low' | 'medium' | 'high' | string;
  execution_enabled: boolean;
  executable_later: boolean;
  required_permissions: string[];
  required_review_permissions: string[];
  required_execution_permissions?: string[];
  allowed_statuses_before_execution: string[];
  side_effects_when_executed: string[];
  notes: string[];
}

export interface ExecutionAdapterRegistryResponse {
  adapters: ExecutionAdapterDefinition[];
  summary: {
    total_adapters: number | string;
    execution_enabled_count: number | string;
    execution_disabled_count: number | string;
    registry_mode: string;
    safe_to_execute: boolean;
  };
  safety: {
    executes_actions: boolean;
    mutates_inventory: boolean;
    mutates_products?: boolean;
    mutates_shipments: boolean;
    creates_jobs: boolean;
    requires_human_review_before_future_execution: boolean;
  };
  notes: string[];
}

export interface ExecutionRequest {
  id: string;
  tenant_id: string;
  request_type: 'cost_review' | 'cost_standard_update' | 'supplier_review' | 'inventory_review' | 'system_recommendation' | string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'cancelled';
  execution_status?: 'noop_completed' | 'completed' | 'failed' | string | null;
  execution_result?: Record<string, unknown> | null;
  payload: Record<string, unknown>;
  adapter?: ExecutionAdapterDefinition | null;
  gate_snapshot?: Record<string, unknown> | null;
  context_snapshot?: Record<string, unknown> | null;
  requested_by?: string | null;
  requested_by_name?: string | null;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  executed_by?: string | null;
  executed_by_name?: string | null;
  review_note?: string | null;
  rejection_reason?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  cancelled_at?: string | null;
  executed_at?: string | null;
  timeline?: Array<{
    status: string;
    label: string;
    at?: string | null;
    by?: string | null;
  }>;
  safety?: {
    executes_actions: boolean;
    mutates_inventory: boolean;
    mutates_products?: boolean;
    mutates_shipments: boolean;
    creates_jobs: boolean;
  };
}

export interface ExecutionRequestListResponse {
  limit: number | string;
  offset: number | string;
  total: number | string;
  rows: ExecutionRequest[];
  notes: string[];
}
