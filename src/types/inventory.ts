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
    suggested_request_type?: ExecutionRequest['request_type'] | string;
    executes_actions?: boolean;
    requires_human_review?: boolean;
    intelligence_score?: number | string;
    intelligence_rank_band?: 'urgent' | 'review' | 'monitor' | string;
    ranking_reason?: string;
    intelligence_confidence?: 'high' | 'medium' | 'low' | string;
    intelligence_rationale?: string[];
    stability_signal?: 'actionable_review_signal' | 'context_watch_signal' | string;
    signal_freshness_score?: number | string;
    repeated_signal?: boolean;
    volatility_indicator?: 'high' | 'medium' | 'low' | string;
    trend_direction?: 'improving' | 'degrading' | 'stable' | string;
    recommendation_momentum?: 'accelerating' | 'emerging' | 'steady' | string;
    signal_age_bucket?: 'fresh' | 'recent' | 'aging' | string;
    trend_explanation?: string;
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
    predictive_guardrails?: {
      mutation_allowed: boolean;
      request_creation_allowed: boolean;
      automatic_execution_allowed: boolean;
      approval_required_for_any_followup: boolean;
      tenant_scoped_only: boolean;
    };
    explainability?: {
      score_inputs: string[];
      score_model: string;
      confidence_basis: string;
      limitations: string[];
    };
  };
  automation_plan: Array<{
    phase: string;
    status: 'ready' | 'needs_review' | 'blocked' | 'manual_only' | string;
    title: string;
    description: string;
    required_before_automation: boolean;
    evidence: string[];
  }>;



  predictive_readiness_summary?: {
    status: string;
    score: number | string;
    signal_count: number | string;
    high_confidence_signal_count: number | string;
    repeated_signal_count: number | string;
    volatility_signal_count: number | string;
    allowed_use: string;
    blocked_use: string;
    requires_human_review: boolean;
    read_only: boolean;
    executes_actions: boolean;
    notes: string[];
    predictive_guardrails?: {
      mutation_allowed: boolean;
      request_creation_allowed: boolean;
      automatic_execution_allowed: boolean;
      approval_required_for_any_followup: boolean;
      tenant_scoped_only: boolean;
    };
    explainability?: {
      score_inputs: string[];
      score_model: string;
      confidence_basis: string;
      limitations: string[];
    };
  };



  historical_signal_window?: {
    status: string;
    window_label: string;
    baseline_source: string;
    historical_data_loaded: boolean;
    minimum_required_snapshots: number | string;
    available_snapshots: number | string;
    ready_for_historical_forecasting: boolean;
    read_only: boolean;
    executes_actions: boolean;
    notes: string[];
  };

  forecast_scenarios?: Array<{
    code: string;
    title: string;
    horizon: string;
    likelihood: string;
    impact: string;
    summary: string;
    recommended_operator_action: string;
    read_only: boolean;
    executes_actions: boolean;
  }>;

  recommendation_intelligence_summary?: {
    total_recommendations: number | string;
    urgent_recommendations: number | string;
    review_recommendations: number | string;
    monitor_recommendations: number | string;
    high_confidence_recommendations: number | string;
    repeated_signals: number | string;
    high_volatility_recommendations: number | string;
    average_intelligence_score: number | string;
    read_only: boolean;
    executes_actions: boolean;
  };
  recommendation_groups?: Array<{
    code: string;
    title: string;
    recommendation_codes: string[];
    read_only: boolean;
    requires_human_review: boolean;
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

export interface ExecutionRequestExecutionReview {
  available: boolean;
  status: string;
  outcome?: string | null;
  executor?: string | null;
  executed_real_action: boolean;
  executed_at?: string | null;
  executed_by?: string | null;
  executed_by_name?: string | null;
  before_after?: {
    product_id?: string | null;
    product_name?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    changed?: boolean;
  } | null;
  failure?: {
    error_code?: string | null;
    error_message?: string | null;
    failed_at?: string | null;
    rollback_applied?: boolean;
    retry_eligibility?: {
      eligible: boolean;
      reason: string;
      future_retry_supported?: boolean;
      requires_new_review_before_retry?: boolean;
      duplicate_execution_blocked?: boolean;
      retry_count?: number | string;
      max_retry_count?: number | string;
      prepared_at?: string | null;
    } | null;
  } | null;
  retry_eligibility?: {
    eligible: boolean;
    reason: string;
    future_retry_supported?: boolean;
    requires_new_review_before_retry?: boolean;
    duplicate_execution_blocked?: boolean;
    retry_count?: number | string;
    max_retry_count?: number | string;
    prepared_at?: string | null;
  } | null;
  evidence?: Record<string, unknown> | null;
  review_notes?: string[];
}

export interface ExecutionRequest {
  id: string;
  tenant_id: string;
  request_type: 'cost_review' | 'cost_standard_update' | 'product_min_stock_update' | 'product_pricing_update' | 'supplier_review' | 'inventory_review' | 'system_recommendation' | string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'cancelled';
  execution_status?: 'noop_completed' | 'completed' | 'failed' | string | null;

  created_from_system_context?: boolean;
  recommendation_codes?: string[];
  recommendation_group_codes?: string[];
  execution_result?: Record<string, unknown> | null;
  execution_review?: ExecutionRequestExecutionReview | null;
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

export interface ExecutionRequestExecutionReviewResponse {
  request_id: string;
  request_type: ExecutionRequest['request_type'];
  status: ExecutionRequest['status'];
  execution_status?: ExecutionRequest['execution_status'];
  execution_review: ExecutionRequestExecutionReview;
  notes: string[];
}



export interface ExecutionRequestSecurityAuditResponse {
  request_id: string;
  generated_at: string;
  request_type: ExecutionRequest['request_type'];
  status: ExecutionRequest['status'];
  execution_status?: ExecutionRequest['execution_status'];
  adapter?: {
    request_type: string;
    label: string;
    risk_level: string;
    execution_enabled: boolean;
    required_permissions: string[];
    required_review_permissions: string[];
    required_execution_permissions: string[];
  } | null;
  actor: {
    role?: string | null;
    user_id?: string | null;
    tenant_id?: string | null;
    typ?: string | null;
    support_session_id?: string | null;
    platform_user_id?: string | null;
    same_as_requester: boolean;
    same_as_reviewer: boolean;
  };
  permission_matrix: {
    can_view: boolean;
    can_create: boolean;
    can_submit: boolean;
    can_cancel: boolean;
    can_review: boolean;
    can_execute: boolean;
    can_update_products: boolean;
    required_for_execution: string[];
    current_actor_has_required_execution_permissions: boolean;
  };
  separation_of_duties: {
    requested_by?: string | null;
    reviewed_by?: string | null;
    executed_by?: string | null;
    requester_reviewer_same: boolean;
    reviewer_executor_same: boolean;
    requester_executor_same: boolean;
    recommended_for_real_execution: boolean;
  };
  checks: Array<{
    key: string;
    passed: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical' | string;
    message: string;
  }>;
  summary: {
    passed: boolean;
    critical_failures: number | string;
    warnings: number | string;
    security_posture: 'ready' | 'review_recommended' | 'blocked' | string;
  };
  notes: string[];
}

export interface ExecutionRequestAuditPackResponse {
  request_id: string;
  generated_at: string;
  status: ExecutionRequest['status'];
  execution_status?: ExecutionRequest['execution_status'];
  request_summary: Record<string, unknown>;
  snapshots: {
    payload?: Record<string, unknown> | null;
    gate?: Record<string, unknown> | null;
    context?: Record<string, unknown> | null;
    execution_result?: Record<string, unknown> | null;
    before_after?: Record<string, unknown> | null;
  };
  audit_trail: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    user_id?: string | null;
    user_name?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
  }>;
  completeness: {
    complete: boolean;
    audit_event_count: number | string;
    required_actions: string[];
    missing_actions: string[];
    has_payload_snapshot: boolean;
    has_gate_snapshot: boolean;
    has_context_snapshot: boolean;
    has_execution_result: boolean;
    has_before_after: boolean;
    safe_for_governance_review: boolean;
  };
  safety: {
    read_only: boolean;
    executes_actions: boolean;
    mutates_inventory: boolean;
    mutates_products: boolean;
    mutates_shipments: boolean;
    creates_jobs: boolean;
  };
  notes: string[];
}

export interface ExecutionRequestListResponse {
  limit: number | string;
  offset: number | string;
  total: number | string;
  rows: ExecutionRequest[];
  notes: string[];
}


export interface ExecutionModuleHardeningSummaryResponse {
  generated_at: string;
  module_status: 'complete' | 'ready_with_watch_items' | 'needs_fix' | string;
  closeout_recommendation: string;
  totals: {
    total_requests: number | string;
    draft_requests: number | string;
    pending_review_requests: number | string;
    approved_requests: number | string;
    rejected_requests: number | string;
    cancelled_requests: number | string;
    completed_executions: number | string;
    noop_executions: number | string;
    failed_executions: number | string;
    approved_waiting_execution: number | string;
    real_execution_ready: number | string;
    terminal_execution_records: number | string;
  };
  enabled_real_executors: Array<{
    request_type: string;
    label: string;
    risk_level: string;
    side_effects_when_executed: string[];
  }>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety_contract: {
    approval_required: boolean;
    duplicate_execution_blocked: boolean;
    retry_requires_explicit_preparation: boolean;
    mutates_inventory: boolean;
    mutates_shipments: boolean;
    creates_background_jobs: boolean;
    real_execution_scope: string[];
  };
  notes: string[];
}

export interface AutomationTypeDefinition {
  automation_type: 'cost_risk_review' | 'cost_governance_review' | 'system_context_review' | 'execution_readiness_review' | string;
  label: string;
  description: string;
  default_request_type: string;
  creates_execution_requests_later: boolean;
  executes_actions: boolean;
  risk_level: 'low' | 'medium' | 'high' | string;
}

export interface AutomationSchedule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  automation_type: 'cost_risk_review' | 'cost_governance_review' | 'system_context_review' | 'execution_readiness_review' | string;
  status: 'draft' | 'paused' | 'disabled' | string;
  schedule_kind: 'manual' | 'daily' | 'weekly' | 'monthly' | string;
  schedule_config: Record<string, unknown>;
  request_defaults: Record<string, unknown>;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  created_at: string;
  updated_at: string;
  disabled_at?: string | null;
  disabled_reason?: string | null;
  type_definition?: AutomationTypeDefinition | null;
  timeline?: Array<{
    status: string;
    label: string;
    at?: string | null;
    by?: string | null;
  }>;
  safety?: {
    runs_automatically: boolean;
    creates_execution_requests_now: boolean;
    executes_requests: boolean;
    mutates_inventory: boolean;
    mutates_products: boolean;
    mutates_shipments: boolean;
    runner_enabled: boolean;
  };
  notes?: string[];
}

export interface AutomationScheduleListResponse {
  limit: number | string;
  offset: number | string;
  total: number | string;
  rows: AutomationSchedule[];
  notes: string[];
}

export interface AutomationScheduleTypesResponse {
  automation_types: AutomationTypeDefinition[];
  schedule_kinds: string[];
  statuses: string[];
  request_default_statuses: string[];
  safety: {
    registry_only: boolean;
    runner_enabled: boolean;
    creates_jobs: boolean;
    auto_executes: boolean;
  };
  notes: string[];
}



export interface AutomationScheduleManualRunResponse {
  automation_schedule_id: string;
  manual_run: boolean;
  runner_enabled: boolean;
  created_execution_requests_now: boolean;
  created_execution_request_count: number | string;
  duplicate_guard_triggered?: boolean;
  schedule_run_dedupe_key?: string;
  executes_requests: boolean;
  mutates_inventory: boolean;
  mutates_products: boolean;
  mutates_shipments: boolean;
  schedule: AutomationSchedule;
  execution_request: ExecutionRequest;
  run_event?: Record<string, unknown>;
  safety: Record<string, unknown>;
  permission_profile?: {
    actor_type: string;
    uses_broad_role: boolean;
    explicit_permissions: string[];
    can_approve_requests: boolean;
    can_execute_requests: boolean;
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  notes: string[];
}


export interface AutomationScheduleAuditPackResponse {
  automation_schedule_id: string;
  generated_at: string;
  audit_scope: 'automation_schedule' | string;
  schedule_summary: Record<string, unknown>;
  schedule_snapshots: Record<string, unknown>;
  linked_execution_requests: ExecutionRequest[];
  run_ledger?: Array<Record<string, unknown>>;
  audit_trail: {
    automation_schedule: Array<Record<string, unknown>>;
    execution_requests: Array<Record<string, unknown>>;
  };
  evidence_summary: {
    schedule_audit_event_count: number | string;
    execution_request_count: number | string;
    execution_request_audit_event_count: number | string;
    manual_run_audit_event_count: number | string;
    auto_request_audit_event_count?: number | string;
    manual_duplicate_skipped_audit_event_count?: number | string;
    auto_duplicate_skipped_audit_event_count?: number | string;
    duplicate_skipped_audit_event_count?: number | string;
    run_event_count?: number | string;
    successful_run_event_count?: number | string;
    skipped_run_event_count?: number | string;
    missing_schedule_actions: string[];
    linked_request_statuses: Record<string, number>;
    linked_request_execution_statuses: Record<string, number>;
  };
  completeness: {
    complete: boolean;
    required_schedule_actions: string[];
    missing_schedule_actions: string[];
    has_schedule_snapshot: boolean;
    has_schedule_audit_trail: boolean;
    has_linked_request_evidence: boolean;
    has_run_ledger_evidence?: boolean;
    safe_for_scheduler_governance_review: boolean;
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface AutomationScheduleRunEventItem {
  id: string;
  automation_schedule_id: string;
  schedule_name: string;
  automation_type: string;
  schedule_kind: string;
  schedule_status: string;
  execution_request_id?: string | null;
  request_type?: string | null;
  execution_request_status?: string | null;
  execution_status?: string | null;
  run_mode: 'manual' | 'auto' | string;
  status: 'succeeded' | 'skipped' | 'failed' | string;
  request_status?: string | null;
  trigger_source: string;
  started_at: string;
  completed_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AutomationScheduleRunEventsResponse {
  limit: number | string;
  offset: number | string;
  total: number | string;
  rows: AutomationScheduleRunEventItem[];
  summary: {
    run_event_count: number | string;
    succeeded_count: number | string;
    skipped_count: number | string;
    failed_count: number | string;
    linked_execution_request_count: number | string;
  };
  safety: Record<string, unknown>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  notes: string[];
}

export interface AutomationScheduleDryRunResponse {
  automation_schedule_id: string;
  dry_run: boolean;
  runner_enabled: boolean;
  creates_execution_requests_now: boolean;
  executes_requests: boolean;
  mutates_inventory: boolean;
  mutates_products: boolean;
  mutates_shipments: boolean;
  schedule: AutomationSchedule;
  would_create_execution_request: boolean;
  would_execute_request: boolean;
  would_mutate_inventory: boolean;
  would_mutate_products: boolean;
  would_mutate_shipments: boolean;
  candidate_request: {
    request_type: string;
    status: string;
    payload: Record<string, unknown>;
    gate_snapshot: Record<string, unknown>;
    context_snapshot: Record<string, unknown>;
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  notes: string[];
}









export interface AutomationRunnerDriftReportResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_drift_report' | string;
  read_only: boolean;
  runner_mode: string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  drift_posture: 'clear' | 'review_required' | 'blocked' | string;
  summary: {
    total_schedules: number | string;
    due_schedule_count: number | string;
    overdue_1d_schedule_count: number | string;
    overdue_7d_schedule_count: number | string;
    never_run_schedule_count: number | string;
    total_run_event_count: number | string;
    failed_run_event_count: number | string;
    skipped_run_event_count: number | string;
    auto_run_event_count: number | string;
    auto_run_event_count_24h: number | string;
    schedule_created_request_count: number | string;
    awaiting_review_request_count: number | string;
    approved_schedule_request_count: number | string;
    executed_schedule_request_count: number | string;
    stale_review_request_count: number | string;
    latest_schedule_run_at?: string | null;
    latest_run_event_at?: string | null;
    latest_failed_run_event_at?: string | null;
    latest_schedule_request_at?: string | null;
  };
  drift_signals: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    value: number | string;
    detail: string;
  }>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface AutomationRunnerContainmentReportResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_containment_report' | string;
  read_only: boolean;
  containment_posture: 'contained' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  allowed_schedule_request_types: string[];
  allowed_schedule_request_statuses: string[];
  summary: {
    total_schedules: number | string;
    due_schedules: number | string;
    disabled_schedules: number | string;
    schedule_created_request_count: number | string;
    unsupported_request_type_count: number | string;
    unsupported_request_status_count: number | string;
    executable_request_type_count: number | string;
    execution_boundary_count: number | string;
    total_run_events: number | string;
    linked_request_events: number | string;
    failed_run_events: number | string;
    skipped_run_events: number | string;
    auto_run_events: number | string;
    latest_run_event_at?: string | null;
  };
  request_rows: Array<{
    request_type: string;
    request_status: string;
    execution_status: string;
    request_count: number | string;
    latest_request_at?: string | null;
    allowed_request_type: boolean;
    allowed_request_status: boolean;
    execution_boundary_preserved: boolean;
  }>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerActivationChecklistResponse {
  tenant_id: string;
  generated_at: string;
  checklist_type: 'automation_runner_activation_checklist' | string;
  read_only: boolean;
  activation_posture: 'blocked' | 'review_required' | 'ready_for_controlled_request_creation' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_required_count: number | string;
    watch_required_count: number | string;
    due_schedule_count: number | string;
    open_schedule_request_count: number | string;
    failed_run_event_count: number | string;
    executed_schedule_request_count: number | string;
    automatic_policy_rows_allowed: number | string;
  };
  checklist: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    required: boolean;
    detail: string;
  }>;
  evidence: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerPolicyMatrixResponse {
  tenant_id: string;
  generated_at: string;
  matrix_type: 'automation_runner_policy_matrix' | string;
  read_only: boolean;
  runner_mode: string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    total_schedules: number | string;
    due_schedule_count: number | string;
    schedule_created_request_count: number | string;
    schedule_created_review_queue_count: number | string;
    approved_schedule_created_request_count: number | string;
    executed_schedule_created_request_count: number | string;
    run_event_count: number | string;
    failed_run_event_count: number | string;
    skipped_run_event_count: number | string;
    auto_run_event_count: number | string;
  };
  policy_rows: Array<{
    key: string;
    capability: string;
    manual_allowed: boolean;
    automatic_allowed: boolean;
    required_permissions: string[];
    required_flags: string[];
    boundary: string;
    status: 'pass' | 'watch' | 'fail' | string;
  }>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerOperationsReviewResponse {
  tenant_id: string;
  generated_at: string;
  review_type: 'automation_runner_operations_review' | string;
  read_only: boolean;
  operations_posture: 'clear' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    runner_mode: string;
    due_schedule_count: number | string;
    open_schedule_request_count: number | string;
    failed_run_event_count: number | string;
    executed_schedule_request_count: number | string;
    actor_failure_count: number | string;
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  evidence: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerAccountabilityDigestResponse {
  tenant_id: string;
  generated_at: string;
  digest_type: 'automation_runner_accountability_digest' | string;
  read_only: boolean;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  schedule_summary: {
    total_schedules: number | string;
    draft_count: number | string;
    paused_count: number | string;
    disabled_count: number | string;
    due_count: number | string;
    schedules_with_last_run: number | string;
    latest_schedule_run_at?: string | null;
  };
  actor_breakdown: Array<{
    run_mode: string;
    trigger_source: string;
    actor_name: string;
    run_event_count: number | string;
    succeeded_count: number | string;
    skipped_count: number | string;
    failed_count: number | string;
    linked_request_count: number | string;
    latest_event_at?: string | null;
  }>;
  request_status_breakdown: Array<{
    request_status: string;
    execution_status: string;
    request_count: number | string;
    latest_request_at?: string | null;
  }>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface AutomationRunnerPreflightResponse {
  tenant_id: string;
  generated_at: string;
  preflight_type: string;
  read_only: boolean;
  runner_mode: string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  batch_limit: number | string;
  due_schedule_count: number | string;
  due_schedules: Array<{
    id: string;
    name: string;
    automation_type: string;
    type_definition?: Record<string, unknown> | null;
    status: string;
    schedule_kind: string;
    next_run_at?: string | null;
    last_run_at?: string | null;
    default_request_status: string;
    run_event_count: number | string;
    open_schedule_request_count: number | string;
    would_create_execution_request_if_runner_enabled: boolean;
    would_execute_request: boolean;
    checks: Array<{
      key: string;
      label: string;
      status: 'pass' | 'watch' | 'fail' | string;
      detail: string;
    }>;
  }>;
  summary: {
    due_schedule_count: number | string;
    would_create_request_count_if_enabled: number | string;
    schedules_with_existing_open_requests: number | string;
    schedules_without_run_ledger: number | string;
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerSafetyReportResponse {
  tenant_id: string;
  generated_at: string;
  runner_mode: string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  safety_summary: Record<string, unknown>;
  schedule_summary: {
    total_schedules: number | string;
    draft_schedules: number | string;
    paused_schedules: number | string;
    disabled_schedules: number | string;
    due_request_creation_candidates: number | string;
    future_request_creation_candidates: number | string;
    schedules_with_run_history: number | string;
  };
  run_ledger_summary: {
    total_run_events: number | string;
    succeeded_run_events: number | string;
    skipped_run_events: number | string;
    failed_run_events: number | string;
    manual_run_events: number | string;
    auto_run_events: number | string;
    linked_execution_request_events: number | string;
    latest_event_at?: string | null;
  };
  linked_request_summary: {
    schedule_created_request_count: number | string;
    awaiting_review_count: number | string;
    approved_count: number | string;
    executed_count: number | string;
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  notes: string[];
}


export interface AutomationRunnerGovernancePackResponse {
  tenant_id: string;
  generated_at: string;
  pack_type: 'automation_runner_governance_pack' | string;
  read_only: boolean;
  runner_mode: string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  evidence_summary: {
    due_schedule_sample_count: number | string;
    latest_run_event_sample_count: number | string;
    linked_request_sample_count: number | string;
    failed_run_event_sample_count: number | string;
    auto_run_event_sample_count: number | string;
    executed_linked_request_sample_count: number | string;
  };
  safety_report: AutomationRunnerSafetyReportResponse;
  due_schedules: Array<Record<string, unknown>>;
  latest_run_events: Array<Record<string, unknown>>;
  linked_schedule_requests: Array<Record<string, unknown>>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}




export interface AutomationRunnerChangeControlPackResponse {
  tenant_id: string;
  generated_at: string;
  pack_type: 'automation_runner_change_control_pack' | string;
  read_only: boolean;
  step: number | string;
  change_posture: 'blocked' | 'review_required' | 'controlled' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_required_count: number | string;
    watch_required_count: number | string;
    recent_run_event_count: number | string;
    recent_failed_run_event_count: number | string;
    recent_auto_run_event_count: number | string;
    recent_manual_run_event_count: number | string;
    recent_linked_request_event_count: number | string;
    recent_schedule_update_count: number | string;
  };
  recent_window: {
    days: number | string;
    latest_event_at?: string | null;
    latest_schedule_update_at?: string | null;
    schedule_status_breakdown: {
      draft: number | string;
      paused: number | string;
      disabled: number | string;
    };
  };
  change_controls: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    required: boolean;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerReleaseGuardResponse {
  tenant_id: string;
  generated_at: string;
  guard_type: 'automation_runner_release_guard' | string;
  read_only: boolean;
  step: number | string;
  release_posture: 'blocked' | 'review_required' | 'ready_for_request_creation_review' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  can_release_auto_request_creation: boolean;
  summary: {
    failed_required_count: number | string;
    watch_required_count: number | string;
    due_schedule_count: number | string;
    would_create_request_count_if_enabled: number | string;
    existing_open_schedule_request_count: number | string;
    automatic_policy_rows_allowed: number | string;
    executed_schedule_request_count: number | string;
  };
  guard_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    required: boolean;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface AutomationRunnerRollbackPlanResponse {
  tenant_id: string;
  generated_at: string;
  plan_type: 'automation_runner_rollback_plan' | string;
  read_only: boolean;
  step: number | string;
  rollback_posture: 'ready' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    recent_window_hours: number | string;
    recent_auto_run_event_count: number | string;
    recent_failed_auto_run_event_count: number | string;
    recent_linked_request_count: number | string;
    required_rollback_step_count: number | string;
    failed_check_count: number | string;
    watch_check_count: number | string;
  };
  rollback_steps: Array<{
    key: string;
    label: string;
    required: boolean;
    action_type: string;
    detail: string;
  }>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerExecutiveSummaryResponse {
  tenant_id: string;
  generated_at: string;
  summary_type: 'automation_runner_executive_summary' | string;
  read_only: boolean;
  step: number | string;
  overall_posture: 'clear' | 'review_required' | 'blocked' | string;
  recommendation: string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    runner_mode: string;
    due_schedule_count: number | string;
    failed_run_event_count: number | string;
    schedule_created_request_count: number | string;
    unsupported_request_type_count: number | string;
    execution_boundary_count: number | string;
    failed_required_count: number | string;
    watch_required_count: number | string;
  };
  decision_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerStatusResponse {
  runner_name: string;
  enabled: boolean;
  started: boolean;
  mode: string;
  interval_ms?: number | string;
  batch_limit?: number | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  mutates_inventory: boolean;
  mutates_products: boolean;
  mutates_shipments: boolean;
  last_checked_at?: string | null;
  last_tick_at?: string | null;
  next_tick_at?: string | null;
  skip_reason?: string | null;
  last_tick_result?: Record<string, unknown> | null;
  step: number | string;
  can_start_background_runner: boolean;
  can_create_execution_requests_automatically: boolean;
  can_execute_requests: boolean;
  request_creation_hard_cap?: number | string;
  race_protection?: {
    enabled: boolean;
    lock_scope: string;
    strategy: string;
    duplicate_lookup: string;
  };
  safety: Record<string, unknown>;
  permission_profile?: {
    actor_type: string;
    uses_broad_role: boolean;
    explicit_permissions: string[];
    can_approve_requests: boolean;
    can_execute_requests: boolean;
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  notes: string[];
}

export interface AutomationRunnerReadinessResponse {
  runner_enabled: boolean;
  runner_mode: string;
  can_run_schedules: boolean;
  can_create_execution_requests: boolean;
  can_execute_requests: boolean;
  can_mutate_inventory: boolean;
  can_mutate_products: boolean;
  can_mutate_shipments: boolean;
  totals: {
    total_schedules: number | string;
    draft_schedules: number | string;
    paused_schedules: number | string;
    disabled_schedules: number | string;
    eligible_for_future_runner_review: number | string;
    runnable_now: number | string;
    due_schedule_count?: number | string;
  };
  blockers: Array<{
    key: string;
    label: string;
    severity: string;
    detail: string;
  }>;
  permission_profile?: {
    actor_type: string;
    uses_broad_role: boolean;
    explicit_permissions: string[];
    can_approve_requests: boolean;
    can_execute_requests: boolean;
  };
  readiness_checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  schedule_preview: Array<{
    id: string;
    name: string;
    automation_type: string;
    status: string;
    schedule_kind: string;
    next_run_at?: string | null;
    runner_state: string;
    can_run_now: boolean;
  }>;
  notes: string[];
}





export interface AutomationRunnerLaunchAttestationResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_launch_attestation' | string;
  read_only: boolean;
  step: number | string;
  launch_posture: 'attested' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_attestation_count: number | string;
    watch_attestation_count: number | string;
    certification_posture: string;
    evidence_posture: string;
    release_posture: string;
    schedule_created_request_count: number | string;
    execution_metadata_count: number | string;
  };
  attestation_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}





export interface AutomationRunnerArchiveManifestResponse {
  tenant_id: string;
  generated_at: string;
  manifest_type: 'automation_runner_archive_manifest' | string;
  read_only: boolean;
  step: number | string;
  archive_posture: 'archive_ready' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_manifest_check_count: number | string;
    watch_manifest_check_count: number | string;
    closeout_failed_check_count: number | string;
    closeout_watch_check_count: number | string;
    closeout_posture: string;
  };
  manifest_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    required: boolean;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface AutomationRunnerRetentionReportResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_retention_report' | string;
  read_only: boolean;
  step: number | string;
  retention_posture: 'retention_ready' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    total_run_events: number | string;
    recent_run_events_7d: number | string;
    failed_run_events: number | string;
    linked_request_events: number | string;
    archive_failed_check_count: number | string;
    archive_watch_check_count: number | string;
    oldest_run_event_at?: string | null;
    newest_run_event_at?: string | null;
  };
  retention_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    required: boolean;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerHandoffBriefResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_handoff_brief' | string;
  read_only: boolean;
  step: number | string;
  handoff_posture: 'handoff_ready' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_handoff_check_count: number | string;
    watch_handoff_check_count: number | string;
    retention_posture: string;
    total_run_events: number | string;
    linked_request_events: number | string;
    runner_mode?: string | null;
  };
  handoff_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    required: boolean;
    detail: string;
  }>;
  operator_followups: string[];
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface AutomationRunnerStewardshipChecklistResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_stewardship_checklist' | string;
  read_only: boolean;
  step: number | string;
  stewardship_posture: 'stewardship_ready' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_stewardship_check_count: number | string;
    watch_stewardship_check_count: number | string;
    handoff_posture: string;
    total_run_events: number | string;
    linked_request_events: number | string;
    runner_mode?: string | null;
  };
  checklist_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    owner: string;
    required: boolean;
    detail: string;
  }>;
  stewardship_actions: string[];
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}








export interface AutomationRunnerFinalizationManifestResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_finalization_manifest' | string;
  read_only: boolean;
  step: number | string;
  manifest_posture: 'finalized' | 'finalized_with_operator_review' | 'blocked' | string;
  closure_seal: string;
  closure_seal_posture: string;
  module_posture: string;
  execution_enabled: boolean;
  request_creation_posture: string;
  summary: {
    failed_manifest_count: number | string;
    watch_manifest_count: number | string;
    failed_seal_count: number | string;
    watch_seal_count: number | string;
    schedule_created_request_count: number | string;
    open_review_queue: number | string;
    manual_request_creation_allowed: boolean;
    auto_request_creation_allowed: boolean;
  };
  manifest_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  sealed_payload: Record<string, unknown>;
  final_boundaries: Record<string, unknown>;
  completion_certificate?: {
    module_closed: boolean;
    closure_step: number | string;
    future_work_requires_new_phase: boolean;
    allowed_current_scope: string[];
    prohibited_without_new_phase: string[];
  };
  notes: string[];
}

export interface AutomationRunnerClosureSealResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_closure_seal' | string;
  read_only: boolean;
  step: number | string;
  seal_algorithm: string;
  closure_seal: string;
  seal_posture: 'sealed' | 'sealed_with_operator_review' | 'blocked' | string;
  module_posture: string;
  execution_enabled: boolean;
  request_creation_posture: string;
  summary: {
    failed_seal_count: number | string;
    watch_seal_count: number | string;
    failed_closure_count: number | string;
    watch_closure_count: number | string;
    schedule_created_request_count: number | string;
    open_review_queue: number | string;
    manual_request_creation_allowed: boolean;
    auto_request_creation_allowed: boolean;
  };
  seal_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  sealed_payload: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerModuleClosureResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_module_closure' | string;
  read_only: boolean;
  step: number | string;
  module_posture: 'closed' | 'closed_with_operator_review' | 'blocked' | string;
  execution_enabled: boolean;
  request_creation_posture: string;
  summary: {
    failed_closure_count: number | string;
    watch_closure_count: number | string;
    certification_posture: string;
    total_schedule_count: number | string;
    total_run_events: number | string;
    schedule_created_request_count: number | string;
    open_review_queue: number | string;
    manual_request_creation_allowed: boolean;
    auto_request_creation_allowed: boolean;
  };
  closure_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  final_boundaries: Record<string, unknown>;
  evidence_refs: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerReadinessCertificationResponse {
  tenant_id: string;
  generated_at: string;
  certification_type: 'automation_runner_readiness_certification' | string;
  read_only: boolean;
  step: number | string;
  certification_posture: 'certified' | 'certified_with_operator_review' | 'blocked' | string;
  execution_enabled: boolean;
  request_creation_posture: string;
  summary: {
    failed_check_count: number | string;
    watch_check_count: number | string;
    total_schedule_count: number | string;
    due_schedule_count: number | string;
    total_run_events: number | string;
    failed_run_events: number | string;
    schedule_created_request_count: number | string;
    open_review_queue: number | string;
    manual_request_creation_allowed: boolean;
    auto_request_creation_allowed: boolean;
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface AutomationRunnerProductionSafetyLockResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_production_safety_lock' | string;
  read_only: boolean;
  step: number | string;
  posture: string;
  manual_request_creation_allowed: boolean;
  auto_request_creation_allowed: boolean;
  execution_enabled: boolean;
  locks: {
    manual: {
      global_disable: boolean;
      tenant_request_creation_enabled: boolean;
      run_scheduled_jobs_enabled: boolean;
      automation_runner_enabled: boolean;
      auto_request_creation_enabled: boolean;
      request_creation_allowed_for_mode: boolean;
      execution_enabled: boolean;
      default_safe_posture: boolean;
      required_flags_for_manual_request_creation: string[];
      required_flags_for_auto_request_creation: string[];
    };
    auto: {
      global_disable: boolean;
      tenant_request_creation_enabled: boolean;
      run_scheduled_jobs_enabled: boolean;
      automation_runner_enabled: boolean;
      auto_request_creation_enabled: boolean;
      request_creation_allowed_for_mode: boolean;
      execution_enabled: boolean;
      default_safe_posture: boolean;
      required_flags_for_manual_request_creation: string[];
      required_flags_for_auto_request_creation: string[];
    };
  };
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface AutomationRunnerObservabilitySnapshotResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_observability_snapshot' | string;
  read_only: boolean;
  step: number | string;
  production_safety_lock?: Record<string, unknown>;
  runner_mode: string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  headline: string;
  summary: {
    total_run_events: number | string;
    succeeded_run_events: number | string;
    failed_run_events: number | string;
    skipped_run_events: number | string;
    manual_run_events: number | string;
    auto_run_events: number | string;
    request_linked_run_events: number | string;
    open_request_count: number | string;
    reviewed_request_count: number | string;
    latest_run_event_at?: string | null;
    latest_failure_at?: string | null;
  };
  operator_signals: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  recent_events: Array<{
    id: string;
    automation_schedule_id: string;
    schedule_name?: string | null;
    automation_type?: string | null;
    run_mode: string;
    run_status: string;
    trigger_source?: string | null;
    execution_request_id?: string | null;
    execution_request_status?: string | null;
    execution_status?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerAuditBundleResponse {
  tenant_id: string;
  generated_at: string;
  bundle_type: 'automation_runner_audit_bundle' | string;
  read_only: boolean;
  step: number | string;
  audit_scope: string;
  runner_mode: string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    schedule_count: number | string;
    run_event_count: number | string;
    succeeded_run_event_count: number | string;
    failed_run_event_count: number | string;
    skipped_run_event_count: number | string;
    linked_execution_request_count: number | string;
    open_execution_request_count: number | string;
    execution_metadata_count: number | string;
    timeline_sample_count: number | string;
  };
  traceability: {
    has_run_ledger: boolean;
    has_linked_request_evidence: boolean;
    run_events_without_request: number | string;
    request_links_visible: number | string;
  };
  timeline: Array<{
    run_event_id: string;
    automation_schedule_id: string;
    schedule_name?: string | null;
    automation_type?: string | null;
    execution_request_id?: string | null;
    execution_request_status?: string | null;
    execution_status?: string | null;
    run_mode: string;
    run_status: string;
    trigger_source?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  evidence_refs: Record<string, unknown>;
  checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerStewardshipLedgerResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_stewardship_ledger' | string;
  read_only: boolean;
  step: number | string;
  ledger_posture: 'ledger_ready' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_ledger_check_count: number | string;
    watch_ledger_check_count: number | string;
    stewardship_posture: string;
    total_schedules: number | string;
    draft_schedules: number | string;
    paused_schedules: number | string;
    disabled_schedules: number | string;
    due_schedules: number | string;
    total_run_events: number | string;
    manual_run_events: number | string;
    auto_run_events: number | string;
    failed_run_events: number | string;
    linked_request_events: number | string;
    latest_run_event_at?: string | null;
    runner_mode?: string | null;
  };
  ledger_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    owner: string;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerCloseoutReportResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_closeout_report' | string;
  read_only: boolean;
  step: number | string;
  closeout_posture: 'closed_ready' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_closeout_check_count: number | string;
    watch_closeout_check_count: number | string;
    incident_failed_check_count: number | string;
    incident_watch_check_count: number | string;
    certification_failed_required_count: number | string;
    certification_watch_required_count: number | string;
    governance_failed_check_count: number | string;
    governance_watch_check_count: number | string;
  };
  closeout_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    required: boolean;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerIncidentDrillResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_incident_drill' | string;
  read_only: boolean;
  step: number | string;
  drill_posture: 'ready' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    failed_drill_check_count: number | string;
    watch_drill_check_count: number | string;
    recent_failed_run_event_count: number | string;
    executed_recent_schedule_request_count: number | string;
    rollback_failed_check_count: number | string;
    rollback_watch_check_count: number | string;
    monitor_posture: string;
    rollback_posture: string;
  };
  drill_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    required: boolean;
    detail: string;
  }>;
  incident_actions: Array<{
    key: string;
    label: string;
    action_type: string;
    destructive: boolean;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerPostLaunchMonitorResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_post_launch_monitor' | string;
  read_only: boolean;
  step: number | string;
  monitor_posture: 'stable' | 'watch' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  window: {
    hours: number | string;
    recent_run_event_rows: number | string;
    recent_schedule_created_request_rows: number | string;
  };
  summary: {
    failed_monitor_check_count: number | string;
    watch_monitor_check_count: number | string;
    failed_recent_run_event_count: number | string;
    executed_recent_schedule_request_count: number | string;
    unsupported_active_schedule_count: number | string;
    launch_posture: string;
  };
  monitor_rows: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  recent_run_event_breakdown: Array<Record<string, unknown>>;
  recent_schedule_created_request_breakdown: Array<Record<string, unknown>>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerCertificationEvidenceResponse {
  tenant_id: string;
  generated_at: string;
  evidence_type: 'automation_runner_certification_evidence' | string;
  read_only: boolean;
  step: number | string;
  evidence_posture: 'complete' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  evidence_summary: {
    schedule_breakdown_rows: number | string;
    request_breakdown_rows: number | string;
    run_breakdown_rows: number | string;
    latest_evidence_rows: number | string;
    failed_certification_check_count: number | string;
    watch_certification_check_count: number | string;
  };
  certification_report: {
    certification_posture: string;
    summary: Record<string, unknown>;
    checks: Array<{
      key: string;
      label: string;
      status: 'pass' | 'watch' | 'fail' | string;
      detail: string;
    }>;
  };
  schedule_breakdown: Array<Record<string, unknown>>;
  schedule_created_request_breakdown: Array<Record<string, unknown>>;
  run_event_breakdown: Array<Record<string, unknown>>;
  latest_run_evidence: Array<Record<string, unknown>>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerCertificationReportResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_certification_report' | string;
  read_only: boolean;
  step: number | string;
  certification_posture: 'certified' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    schedule_count: number | string;
    due_schedule_count: number | string;
    schedule_created_request_count: number | string;
    unsupported_request_status_count: number | string;
    execution_metadata_count: number | string;
    failed_run_event_count: number | string;
    failed_check_count: number | string;
    watch_check_count: number | string;
  };
  certification_checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}

export interface AutomationRunnerRollbackVerificationResponse {
  tenant_id: string;
  generated_at: string;
  report_type: 'automation_runner_rollback_verification' | string;
  read_only: boolean;
  step: number | string;
  verification_posture: 'verified' | 'review_required' | 'blocked' | string;
  request_creation_enabled: boolean;
  execution_enabled: boolean;
  summary: {
    recent_window_hours: number | string;
    recent_auto_run_event_count: number | string;
    recent_failed_auto_run_event_count: number | string;
    recent_linked_request_count: number | string;
    recent_schedule_created_request_count: number | string;
    recent_schedule_request_execution_metadata_count: number | string;
    failed_check_count: number | string;
    watch_check_count: number | string;
  };
  verification_checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'watch' | 'fail' | string;
    detail: string;
  }>;
  evidence_refs: Record<string, unknown>;
  safety: Record<string, unknown>;
  notes: string[];
}


export interface SystemContextSnapshot {
  id: string;
  tenant_id: string;
  generated_at: string;
  source: string;
  snapshot_status: string;
  recommendation_summary?: Record<string, unknown> | null;
  predictive_readiness_summary?: Record<string, unknown> | null;
  forecast_scenarios?: Array<Record<string, unknown>> | null;
  historical_signal_window?: Record<string, unknown> | null;
  context_snapshot?: SystemContextResponse | Record<string, unknown> | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}



export interface SystemContextSnapshotTrendSeries {
  status: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  executes_actions: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  forecast_readiness_summary: {
    posture: string;
    minimum_required_snapshots: number;
    available_snapshots: number;
    average_directional_confidence_score: number;
    high_confidence_metric_count: number;
    high_volatility_metric_count: number;
    blocking_reasons: string[];
    watch_reasons: string[];
    ready_for_future_forecasting_foundation: boolean;
    read_only: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    notes: string[];
  };
  trend_summary: null | {
    metric_count: number;
    increased_metric_count: number;
    decreased_metric_count: number;
    unchanged_metric_count: number;
    stable_metric_count: number;
    moderate_volatility_metric_count: number;
    high_volatility_metric_count: number;
    average_directional_confidence_score: number;
    high_confidence_metric_count: number;
    medium_confidence_metric_count: number;
    low_confidence_metric_count: number;
    directional_confidence_mix: Array<{
      code: string;
      label: string;
      level: string;
      score: number;
      stable_direction_ratio: number;
    }>;
    directional_foundation_mix: Array<{
      code: string;
      label: string;
      momentum: string;
      average_delta_per_snapshot: number;
    }>;
    trend_window_mix: Array<{
      code: string;
      label: string;
      short_direction: string;
      medium_direction: string;
      long_direction: string;
      short_consistency_ratio: number;
      medium_consistency_ratio: number;
      long_consistency_ratio: number;
    }>;
    latest_direction_mix: Array<{
      code: string;
      label: string;
      latest_segment_direction: string;
      latest_segment_delta: number;
    }>;
  };
  trends: Array<{
    code: string;
    label: string;
    first: number;
    latest: number;
    delta: number;
    direction: string;
    point_count: number;
    segment_count: number;
    latest_segment_direction: string;
    latest_segment_delta: number;
    volatility_classification: string;
    directional_confidence: {
      level: string;
      score: number;
      stable_direction_ratio: number;
      changed_segment_count: number;
      required_snapshot_count: number;
      available_snapshot_count: number;
      read_only: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
      notes: string[];
    };

    trend_windows: Record<'short' | 'medium' | 'long', {
      label: string;
      snapshot_count: number;
      available_snapshot_count: number;
      status: string;
      first?: number;
      latest?: number;
      delta: number;
      direction: string;
      segment_count?: number;
      consistency_ratio: number;
      read_only: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
    }>;
    directional_foundation: {
      method: string;
      first_value: number;
      latest_value: number;
      net_delta: number;
      observation_intervals: number;
      average_delta_per_snapshot: number;
      positive_segment_count: number;
      negative_segment_count: number;
      unchanged_segment_count: number;
      latest_segment_delta: number;
      momentum: string;
      read_only: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
      notes: string[];
    };
    points: Array<{
      snapshot_id: string;
      generated_at: string;
      value: number;
    }>;
    segments: Array<{
      from_snapshot_id: string;
      to_snapshot_id: string;
      from_generated_at: string;
      to_generated_at: string;
      previous: number;
      current: number;
      delta: number;
      direction: string;
    }>;
  }>;
  notes: string[];
}

export interface SystemContextSnapshotCaptureResponse {
  snapshot_id: string | null;
  generated_at: string | null;
  read_only: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
}


export interface SystemContextSnapshotComparison {
  status: string;
  current_snapshot_id?: string | null;
  previous_snapshot_id?: string | null;
  current_generated_at?: string | null;
  previous_generated_at?: string | null;
  read_only: boolean;
  executes_actions: boolean;
  comparisons: Array<{
    code: string;
    label: string;
    current: number;
    previous: number;
    delta: number;
    direction: string;
  }>;
  notes: string[];
}


export interface SystemContextForecastSeries {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  series_builder_only: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  forecast_series_summary: null | {
    series_count: number;
    model_input_ready_series_count: number;
    total_point_count: number;
    min_point_count: number;
    max_point_count: number;
    average_point_count: number;
    high_confidence_series_count: number;
    high_volatility_series_count: number;
    read_only: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  forecast_series: Array<{
    code: string;
    label: string;
    point_count: number;
    segment_count: number;
    first_observed_at: string | null;
    latest_observed_at: string | null;
    statistics: {
      first_value: number;
      latest_value: number;
      min_value: number;
      max_value: number;
      value_range: number;
      average_value: number;
      net_delta: number;
    };
    average_delta_per_snapshot: number;
    directional_confidence_level: string;
    directional_confidence_score: number;
    volatility_classification: string;
    model_input_ready: boolean;
    normalized_points: Array<{
      index: number;
      snapshot_id: string;
      generated_at: string;
      value: number;
      normalized_value: number;
      delta_from_previous: number;
      direction_from_previous: string;
    }>;
    read_only: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    notes: string[];
  }>;
  notes: string[];
}


export interface SystemContextForecastHorizons {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  horizon_projection_only: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  horizon_summary: null | {
    horizon_count: number;
    total_metric_projection_count: number;
    total_watch_projection_count: number;
    ready_horizon_count: number;
    read_only: boolean;
    horizon_projection_only: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  forecast_horizons: Array<{
    horizon_code: string;
    horizon_label: string;
    snapshot_span: number;
    metric_projection_count: number;
    model_input_ready_count: number;
    watch_projection_count: number;
    direction_mix: Record<string, number>;
    risk_mix: Record<string, number>;
    read_only: boolean;
    horizon_projection_only: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    metric_projections: Array<{
      metric_code: string;
      label: string;
      horizon_code: string;
      horizon_label: string;
      snapshot_span: number;
      source_latest_value: number;
      average_delta_per_snapshot: number;
      projected_delta: number;
      projected_value: number;
      projected_direction: string;
      confidence_level: string;
      risk_classification: string;
      model_input_ready: boolean;
      volatility_classification: string;
      read_only: boolean;
      horizon_projection_only: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
      notes: string[];
    }>;
  }>;
  notes: string[];
}

export interface SystemContextBaselineForecast {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  baseline_forecast_only: boolean;
  deterministic_engine: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  baseline_forecast_summary: null | {
    horizon_count: number;
    total_metric_forecast_count: number;
    total_watch_forecast_count: number;
    ready_horizon_count: number;
    read_only: boolean;
    baseline_forecast_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  baseline_forecasts: Array<{
    horizon_code: string;
    horizon_label: string;
    snapshot_span: number;
    metric_forecast_count: number;
    model_input_ready_count: number;
    watch_forecast_count: number;
    direction_mix: Record<string, number>;
    risk_mix: Record<string, number>;
    read_only: boolean;
    baseline_forecast_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    metric_forecasts: Array<{
      metric_code: string;
      label: string;
      horizon_code: string;
      horizon_label: string;
      snapshot_span: number;
      source_latest_value: number;
      average_delta_per_snapshot: number;
      baseline_forecast_delta: number;
      baseline_forecast_value: number;
      baseline_forecast_direction: string;
      confidence_level: string;
      risk_classification: string;
      model_input_ready: boolean;
      historical_point_count: number;
      historical_net_delta: number;
      volatility_classification: string;
      read_only: boolean;
      baseline_forecast_only: boolean;
      deterministic_engine: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
      notes: string[];
    }>;
  }>;
  notes: string[];
}

export interface SystemContextMovingAverageForecast {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  moving_average_forecast_only: boolean;
  deterministic_engine: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  moving_average_summary: null | {
    window_count: number;
    total_metric_forecast_count: number;
    total_watch_forecast_count: number;
    ready_window_count: number;
    read_only: boolean;
    moving_average_forecast_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  moving_average_forecasts: Array<{
    window_code: string;
    window_label: string;
    requested_window_size: number;
    metric_forecast_count: number;
    model_input_ready_count: number;
    watch_forecast_count: number;
    direction_mix: Record<string, number>;
    risk_mix: Record<string, number>;
    read_only: boolean;
    moving_average_forecast_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    metric_forecasts: Array<{
      metric_code: string;
      label: string;
      window_code: string;
      window_label: string;
      requested_window_size: number;
      effective_window_size: number;
      source_latest_value: number;
      moving_average_value: number;
      moving_average_forecast_delta: number;
      moving_average_forecast_value: number;
      moving_average_forecast_direction: string;
      confidence_level: string;
      risk_classification: string;
      model_input_ready: boolean;
      historical_point_count: number;
      historical_net_delta: number;
      volatility_classification: string;
      read_only: boolean;
      moving_average_forecast_only: boolean;
      deterministic_engine: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
      notes: string[];
    }>;
  }>;
  notes: string[];
}


export interface SystemContextWeightedTrendForecast {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  weighted_trend_forecast_only: boolean;
  deterministic_engine: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  weighted_trend_summary: null | {
    window_count: number;
    total_metric_forecast_count: number;
    total_watch_forecast_count: number;
    ready_window_count: number;
    read_only: boolean;
    weighted_trend_forecast_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  weighted_trend_forecasts: Array<{
    window_code: string;
    window_label: string;
    requested_window_size: number;
    projection_span: number;
    metric_forecast_count: number;
    model_input_ready_count: number;
    watch_forecast_count: number;
    direction_mix: Record<string, number>;
    risk_mix: Record<string, number>;
    read_only: boolean;
    weighted_trend_forecast_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    metric_forecasts: Array<{
      metric_code: string;
      label: string;
      window_code: string;
      window_label: string;
      requested_window_size: number;
      effective_window_size: number;
      projection_span: number;
      source_latest_value: number;
      weighted_delta_per_snapshot: number;
      weighted_trend_forecast_delta: number;
      weighted_trend_forecast_value: number;
      weighted_trend_forecast_direction: string;
      confidence_level: string;
      risk_classification: string;
      model_input_ready: boolean;
      historical_point_count: number;
      historical_net_delta: number;
      volatility_classification: string;
      read_only: boolean;
      weighted_trend_forecast_only: boolean;
      deterministic_engine: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
      notes: string[];
    }>;
  }>;
  notes: string[];
}


export interface SystemContextVolatilityAdjustedForecast {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  volatility_adjusted_forecast_only: boolean;
  deterministic_engine: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  volatility_adjusted_summary: null | {
    window_count: number;
    total_metric_forecast_count: number;
    total_watch_forecast_count: number;
    ready_window_count: number;
    read_only: boolean;
    volatility_adjusted_forecast_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  volatility_adjusted_forecasts: Array<{
    window_code: string;
    window_label: string;
    requested_window_size: number;
    projection_span: number;
    metric_forecast_count: number;
    model_input_ready_count: number;
    watch_forecast_count: number;
    direction_mix: Record<string, number>;
    risk_mix: Record<string, number>;
    read_only: boolean;
    volatility_adjusted_forecast_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    metric_forecasts: Array<{
      metric_code: string;
      label: string;
      window_code: string;
      window_label: string;
      requested_window_size: number;
      projection_span: number;
      source_latest_value: number;
      source_weighted_delta: number;
      volatility_adjustment_factor: number;
      volatility_adjusted_delta: number;
      volatility_adjusted_forecast_value: number;
      volatility_adjusted_direction: string;
      source_confidence_level: string;
      confidence_level: string;
      risk_classification: string;
      model_input_ready: boolean;
      historical_point_count: number;
      historical_net_delta: number;
      volatility_classification: string;
      read_only: boolean;
      volatility_adjusted_forecast_only: boolean;
      deterministic_engine: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
      notes: string[];
    }>;
  }>;
  notes: string[];
}


export interface SystemContextForecastConfidence {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  confidence_engine_only: boolean;
  deterministic_engine: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  forecast_confidence_summary: null | {
    window_count: number;
    total_metric_confidence_count: number;
    total_watch_confidence_count: number;
    average_confidence_score: number;
    overall_confidence_band: string;
    read_only: boolean;
    confidence_engine_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  forecast_confidence_windows: Array<{
    window_code: string;
    window_label: string;
    requested_window_size: number;
    projection_span: number;
    metric_confidence_count: number;
    average_confidence_score: number;
    confidence_band: string;
    confidence_band_mix: Record<string, number>;
    watch_confidence_count: number;
    read_only: boolean;
    confidence_engine_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    metric_confidences: Array<{
      metric_code: string;
      label: string;
      window_code: string;
      window_label: string;
      source_confidence_level: string;
      confidence_score: number;
      confidence_band: string;
      confidence_risk_classification: string;
      confidence_drivers: {
        base_score: number;
        historical_depth_adjustment: number;
        volatility_adjustment: number;
        readiness_adjustment: number;
      };
      source_latest_value: number;
      forecast_value: number;
      forecast_delta: number;
      forecast_direction: string;
      volatility_classification: string;
      historical_point_count: number;
      model_input_ready: boolean;
      read_only: boolean;
      confidence_engine_only: boolean;
      deterministic_engine: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
      notes: string[];
    }>;
  }>;
  notes: string[];
}


export interface SystemContextForecastAccuracy {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  forecast_accuracy_only: boolean;
  historical_backtest_only: boolean;
  deterministic_engine: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  forecast_accuracy_summary: null | {
    metric_count: number;
    total_evaluation_count: number;
    average_accuracy_score: number;
    overall_accuracy_band: string;
    watch_metric_count: number;
    accuracy_band_mix: Record<string, number>;
    read_only: boolean;
    forecast_accuracy_only: boolean;
    historical_backtest_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  metric_accuracy: Array<{
    metric_code: string;
    label: string;
    historical_point_count: number;
    evaluation_count: number;
    backtest_window_size: number;
    mean_absolute_error: number;
    mean_absolute_percent_error: number;
    direction_match_count: number;
    directional_accuracy_rate: number;
    accuracy_score: number;
    accuracy_band: string;
    accuracy_risk_classification: string;
    volatility_classification: string;
    model_input_ready: boolean;
    read_only: boolean;
    forecast_accuracy_only: boolean;
    historical_backtest_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    backtest_points: Array<{
      index: number;
      snapshot_id?: string;
      generated_at?: string;
      actual_value: number;
      predicted_value: number;
      previous_actual_value: number;
      absolute_error: number;
      absolute_percent_error: number;
      predicted_direction: string;
      actual_direction: string;
      direction_matched: boolean;
      read_only: boolean;
      historical_backtest_only: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
    }>;
    notes: string[];
  }>;
  notes: string[];
}


export interface SystemContextForecastComparison {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  forecast_comparison_only: boolean;
  deterministic_engine: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  forecast_comparison_summary: null | {
    metric_count: number;
    average_comparison_score: number;
    overall_comparison_band: string;
    watch_metric_count: number;
    consensus_mix: Record<string, number>;
    best_model_mix: Record<string, number>;
    read_only: boolean;
    forecast_comparison_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  metric_comparisons: Array<{
    metric_code: string;
    label: string;
    compared_model_count: number;
    average_comparison_score: number;
    comparison_band: string;
    best_model_code: string | null;
    best_model_label: string | null;
    best_model_score: number;
    direction_consensus: string;
    historical_accuracy_score: number | null;
    historical_accuracy_band: string | null;
    accuracy_risk_classification: string | null;
    read_only: boolean;
    forecast_comparison_only: boolean;
    deterministic_engine: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    model_forecasts: Array<{
      model_code: string;
      model_label: string;
      metric_code: string;
      label: string;
      window_code: string;
      window_label: string;
      forecast_value: number;
      forecast_delta: number;
      forecast_direction: string;
      source_latest_value: number;
      confidence_level: string;
      risk_classification: string;
      volatility_classification: string;
      model_input_ready: boolean;
      comparison_score: number;
      read_only: boolean;
      forecast_comparison_only: boolean;
      deterministic_engine: boolean;
      forecast_model_enabled: boolean;
      execution_enabled: boolean;
      mutation_enabled: boolean;
      automation_enabled: boolean;
    }>;
    notes: string[];
  }>;
  notes: string[];
}


export interface SystemContextForecastRiskClassification {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  risk_classification_only: boolean;
  forecast_model_enabled?: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  risk_summary: null | {
    classified_scenario_count: number;
    average_forecast_risk_score: number;
    critical_risk_count: number;
    high_risk_count: number;
    moderate_risk_count: number;
    low_risk_count: number;
    highest_risk_code: string | null;
    highest_risk_label: string | null;
    risk_mix: Record<string, number>;
    review_priority_mix: Record<string, number>;
    read_only: boolean;
    risk_classification_only: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  classified_scenarios: Array<{
    risk_rank: number;
    rank: number;
    code: string;
    metric_code: string;
    label: string;
    preview_direction: string;
    projected_value: number;
    projected_delta: number;
    ranking_score: number;
    ranking_band: string;
    confidence_score: number;
    historical_accuracy_score: number | null;
    source_risk_classification: string;
    forecast_risk_score: number;
    forecast_risk_band: string;
    review_priority: string;
    risk_drivers: {
      ranking_band: string;
      source_risk_classification: string;
      actionability_classification: string;
      direction_consensus: string;
      model_input_ready: boolean;
    };
    read_only: boolean;
    risk_classification_only: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    notes: string[];
  }>;
  notes: string[];
}

export interface SystemContextForecastRanking {
  status: string;
  method: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  ranking_only: boolean;
  forecast_model_enabled?: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  ranking_summary: null | {
    ranked_scenario_count: number;
    average_ranking_score: number;
    top_ranked_count: number;
    watch_scenario_count: number;
    strongest_signal_code: string | null;
    strongest_signal_label: string | null;
    actionability_mix: Record<string, number>;
    read_only: boolean;
    ranking_only: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  ranked_scenarios: Array<{
    rank: number;
    code: string;
    metric_code: string;
    label: string;
    scenario_type: string;
    preview_direction: string;
    projected_value: number;
    projected_delta: number;
    confidence_score: number;
    confidence_level: string;
    risk_classification: string;
    priority: string;
    model_input_ready: boolean;
    comparison_score: number;
    best_model_code: string | null;
    best_model_label: string | null;
    best_model_score: number;
    direction_consensus: string;
    historical_accuracy_score: number | null;
    ranking_score: number;
    ranking_band: string;
    actionability_classification: string;
    read_only: boolean;
    ranking_only: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    notes: string[];
  }>;
  notes: string[];
}

export interface SystemContextForecastScenarioSet {
  status: string;
  method: string;
  minimum_required_snapshots?: number;
  available_snapshots: number;
  generated_from_snapshot_ids?: string[];
  oldest_snapshot_generated_at?: string | null;
  latest_snapshot_generated_at?: string | null;
  read_only: boolean;
  scenario_persistence_only: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  scenario_summary: null | {
    scenario_count: number;
    model_input_ready_scenario_count: number;
    watch_scenario_count: number;
    directional_scenario_count: number;
    stable_scenario_count: number;
    risk_mix: Record<string, number>;
    priority_mix: Record<string, number>;
    read_only: boolean;
    scenario_persistence_only: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  forecast_scenarios: Array<{
    code: string;
    metric_code: string;
    label: string;
    scenario_type: string;
    preview_direction: string;
    source_latest_value: number;
    projected_value: number;
    projected_delta: number;
    preview_horizon_snapshots: number;
    confidence_level: string;
    confidence_score: number;
    confidence_band: string;
    volatility_classification: string;
    risk_classification: string;
    priority: string;
    historical_point_count: number;
    historical_net_delta: number;
    historical_average_value: number;
    model_input_ready: boolean;
    read_only: boolean;
    scenario_persistence_only: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    notes: string[];
  }>;
  notes: string[];
}

export interface SystemContextForecastScenarioCaptureResponse {
  scenario_set_id: string | null;
  generated_at: string | null;
  read_only: boolean;
  scenario_persistence_only: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
}

export interface SystemContextForecastScenarioHistoryItem {
  id: string;
  tenant_id: string;
  generated_at: string;
  source: string;
  scenario_status: string;
  scenario_summary?: SystemContextForecastScenarioSet['scenario_summary'];
  generated_from_snapshot_ids?: string[];
  oldest_snapshot_generated_at?: string | null;
  latest_snapshot_generated_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemContextForecastPreview {
  status: string;
  method?: string;
  minimum_required_snapshots: number;
  available_snapshots: number;
  preview_horizon_snapshots?: number;
  generated_from_snapshot_ids?: string[];
  oldest_generated_at?: string | null;
  latest_generated_at?: string | null;
  read_only: boolean;
  preview_only: boolean;
  executes_actions: boolean;
  forecast_model_enabled: boolean;
  execution_enabled: boolean;
  mutation_enabled: boolean;
  automation_enabled: boolean;
  forecast_preview_summary: null | {
    metric_preview_count: number;
    projected_increase_count: number;
    projected_decrease_count: number;
    projected_stable_count: number;
    watch_metric_count: number;
    risk_mix: Record<string, number>;
    read_only: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
  };
  metric_previews: Array<{
    code: string;
    label: string;
    source_latest_value: number;
    average_delta_per_snapshot: number;
    preview_horizon_snapshots: number;
    preview_delta: number;
    preview_value: number;
    preview_direction: string;
    confidence_level: string;
    confidence_score: number;
    confidence_band: string;
    volatility_classification: string;
    risk_indicator: string;
    read_only: boolean;
    forecast_model_enabled: boolean;
    execution_enabled: boolean;
    mutation_enabled: boolean;
    automation_enabled: boolean;
    notes: string[];
  }>;
  notes: string[];
}

