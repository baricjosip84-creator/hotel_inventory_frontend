
export type InventoryUsageStorageLocationOption = {
  id: string;
  name: string;
  temperature_zone?: string | null;
  deleted_at?: string | null;
};

export type UsageReason =
  | 'guest_use'
  | 'internal_use'
  | 'damage'
  | 'waste'
  | 'event'
  | 'maintenance'
  | 'other';

export type InventoryUsageLog = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  stock_movement_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  quantity: number | string;
  estimated_unit_cost?: number | string | null;
  estimated_usage_value?: number | string | null;
  estimated_cost_source?: string | null;
  consumption_reason: UsageReason;
  department?: string | null;
  event_name?: string | null;
  notes?: string | null;
  quantity_before?: number | string | null;
  quantity_after?: number | string | null;
  consumed_at: string;
  created_by_user_name?: string | null;
  created_by_user_id?: string | null;
  reversed_at?: string | null;
  reversed_by_user_id?: string | null;
  reversed_by_user_name?: string | null;
  reversal_stock_movement_id?: string | null;
  reversal_reason?: string | null;
  review_status?: 'pending' | 'reviewed' | 'follow_up_required' | string | null;
  reviewed_at?: string | null;
  reviewed_by_user_id?: string | null;
  reviewed_by_user_name?: string | null;
  review_notes?: string | null;
};



export type InventoryUsageAttachment = {
  id: string;
  original_filename?: string | null;
  stored_filename?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | string | null;
  storage_path?: string | null;
  uploaded_by_user_id?: string | null;
  uploaded_by_user_name?: string | null;
  created_at?: string | null;
};

export type InventoryUsageMovementSummary = {
  id: string;
  change?: number | string | null;
  reason?: string | null;
  created_at?: string | null;
};

export type InventoryUsageLogDetail = InventoryUsageLog & {
  storage_location_temperature_zone?: string | null;
  stock_movement?: InventoryUsageMovementSummary | null;
  reversal_stock_movement?: InventoryUsageMovementSummary | null;
  attachments?: InventoryUsageAttachment[];
};

export type InventoryUsageSummary = {
  totals?: {
    usage_count?: number | string | null;
    total_quantity?: number | string | null;
    estimated_usage_value?: number | string | null;
    missing_cost_count?: number | string | null;
    first_consumed_at?: string | null;
    last_consumed_at?: string | null;
  };
  by_reason?: Array<{
    consumption_reason: UsageReason;
    usage_count: number | string;
    total_quantity: number | string;
    estimated_usage_value?: number | string | null;
    missing_cost_count?: number | string | null;
  }>;
  by_product?: Array<{
    product_id: string;
    product_name?: string | null;
    product_unit?: string | null;
    estimated_unit_cost?: number | string | null;
    usage_count: number | string;
    total_quantity: number | string;
    estimated_usage_value?: number | string | null;
    missing_cost_count?: number | string | null;
  }>;
  by_department?: Array<{
    department?: string | null;
    usage_count: number | string;
    total_quantity: number | string;
    estimated_usage_value?: number | string | null;
    missing_cost_count?: number | string | null;
  }>;
  by_location?: Array<{
    storage_location_id: string;
    storage_location_name?: string | null;
    usage_count: number | string;
    total_quantity: number | string;
    estimated_usage_value?: number | string | null;
    missing_cost_count?: number | string | null;
    last_consumed_at?: string | null;
  }>;
  by_user?: Array<{
    created_by_user_id?: string | null;
    created_by_user_name?: string | null;
    usage_count: number | string;
    total_quantity: number | string;
    estimated_usage_value?: number | string | null;
    missing_cost_count?: number | string | null;
    last_consumed_at?: string | null;
  }>;
  by_day?: Array<{
    usage_date: string;
    usage_count: number | string;
    total_quantity: number | string;
    estimated_usage_value?: number | string | null;
    missing_cost_count?: number | string | null;
    product_count: number | string;
    location_count: number | string;
  }>;
};

export type InventoryUsageException = InventoryUsageLog & {
  exception_types?: string[] | null;
};

export type InventoryUsageExceptions = {
  summary?: {
    exception_count?: number | string | null;
    missing_department_count?: number | string | null;
    missing_notes_count?: number | string | null;
    backdated_count?: number | string | null;
    damage_waste_count?: number | string | null;
    damage_waste_quantity?: number | string | null;
    pending_review_count?: number | string | null;
    follow_up_required_count?: number | string | null;
    reviewed_count?: number | string | null;
  };
  rows?: InventoryUsageException[];
};


export type InventoryUsageAnomaly = {
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  usage_date: string;
  daily_quantity: number | string;
  usage_count: number | string;
  average_daily_quantity: number | string;
  observed_days: number | string;
  spike_multiplier: number | string;
};

export type InventoryUsageAnomalies = {
  summary?: {
    spike_count?: number | string | null;
    impacted_product_count?: number | string | null;
    highest_spike_multiplier?: number | string | null;
  };
  rows?: InventoryUsageAnomaly[];
};


export type InventoryUsageAlertScanResponse = {
  message: string;
  dry_run?: boolean;
  lookback_days?: number | string;
  planned_alert_count?: number | string;
  alert_count?: number | string;
  planned_alerts?: Array<{
    product_id?: string | null;
    type: string;
    severity?: string | null;
    message: string;
  }>;
};

export type UsageFilters = {
  product_id: string;
  storage_location_id: string;
  consumption_reason: string;
  department: string;
  date_from: string;
  date_to: string;
  include_reversed: string;
};

export type InventoryUsageReversalResponse = {
  message: string;
  stock?: {
    product_id: string;
    storage_location_id: string;
    previous_quantity: number | string;
    new_quantity: number | string;
    restored_quantity: number | string;
  };
  usage?: {
    id: string;
    consumption_reason?: UsageReason | string;
    reversed_at?: string | null;
    reversal_stock_movement_id?: string | null;
    reversal_reason?: string | null;
  };
};


export type InventoryUsageReviewResponse = {
  message: string;
  usage?: {
    id: string;
    review_status?: 'reviewed' | 'follow_up_required' | string | null;
    reviewed_at?: string | null;
    reviewed_by_user_id?: string | null;
    review_notes?: string | null;
  };
};

export type InventoryUsageBulkLine = {
  product_id: string;
  storage_location_id: string;
  quantity: string;
  consumption_reason: string;
  department: string;
  event_name: string;
  notes: string;
  reference_type: string;
  reference_id: string;
  missing_evidence_acknowledged?: boolean;
};


export type InventoryUsageImpactRow = {
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  usage_count: number | string;
  total_quantity: number | string;
  estimated_usage_value?: number | string | null;
  missing_cost_count?: number | string | null;
  observed_usage_days?: number | string | null;
  average_daily_usage?: number | string | null;
  last_consumed_at?: string | null;
  current_quantity?: number | string | null;
  effective_min_quantity?: number | string | null;
  estimated_days_of_coverage?: number | string | null;
  recommended_reorder_quantity?: number | string | null;
  impact_status: 'depleted' | 'below_minimum' | 'usage_exceeds_current_stock' | 'healthy' | string;
};

export type InventoryUsageImpact = {
  summary?: {
    impacted_count?: number | string | null;
    depleted_count?: number | string | null;
    below_minimum_count?: number | string | null;
    usage_exceeds_current_stock_count?: number | string | null;
    estimated_usage_value?: number | string | null;
    recommended_reorder_quantity?: number | string | null;
  };
  rows?: InventoryUsageImpactRow[];
};


export type InventoryUsageBarcodeRequest = {
  barcode: string;
  storage_location_id: string;
  package_count?: number | string;
  quantity?: number | string;
  consumption_reason?: string;
  department?: string;
  event_name?: string;
  notes?: string;
  consumed_at?: string;
  client_scan_id?: string;
  stock_risk_acknowledged?: boolean;
  missing_evidence_acknowledged?: boolean;
  evidence_original_filename?: string;
  evidence_stored_filename?: string;
  evidence_mime_type?: string;
  evidence_file_size_bytes?: number | string;
  evidence_storage_path?: string;
};

export type InventoryUsageBarcodeResponse = {
  message: string;
  idempotent_replay?: boolean;
  stock?: {
    product_id: string;
    storage_location_id: string;
    previous_quantity: number | string;
    new_quantity: number | string;
  };
  usage?: {
    id: string;
    stock_movement_id?: string | null;
    consumption_reason?: UsageReason | string;
    department?: string | null;
    event_name?: string | null;
    consumed_at?: string | null;
  };
  barcode_match?: {
    barcode: string;
    product_id: string;
    product_name?: string | null;
    product_unit?: string | null;
    package_id?: string | null;
    package_name?: string | null;
    units_per_package?: number | string | null;
    package_count?: number | string | null;
    matched_package_barcode?: boolean;
  };
};


export type InventoryUsageBarcodePreviewResponse = {
  message: string;
  barcode_match?: InventoryUsageBarcodeResponse['barcode_match'];
  preview?: {
    storage_location_id: string;
    storage_location_name?: string | null;
    usage_timestamp?: string | null;
    consumption_reason?: string | null;
    has_evidence_metadata?: boolean;
    package_count?: number | string | null;
    quantity_to_consume?: number | string | null;
    current_quantity?: number | string | null;
    resulting_quantity?: number | string | null;
    minimum_quantity?: number | string | null;
    has_stock_row?: boolean;
    blocked_by_missing_stock_row?: boolean;
    blocked_by_insufficient_stock?: boolean;
    will_deplete?: boolean;
    will_go_below_minimum?: boolean;
    has_sufficient_stock?: boolean;
    blocked_by_critical_alert?: boolean;
    critical_alert_count?: number | string | null;
    critical_alerts?: Array<{
      id?: string;
      product_id?: string | null;
      type?: string | null;
      message?: string | null;
      severity?: string | null;
      escalation_level?: number | string | null;
      created_at?: string | null;
    }>;
    blocked_by_closed_period?: boolean;
    blocking_reasons?: string[];
    requires_stock_risk_acknowledgement?: boolean;
    requires_evidence_or_acknowledgement?: boolean;
    acknowledgement_required_reasons?: string[];
    recordable_after_acknowledgement?: boolean;
    can_record_without_acknowledgement?: boolean;
    period_open?: boolean;
    period_closure?: {
      id?: string;
      period_start?: string | null;
      period_end?: string | null;
      closed_at?: string | null;
    } | null;
  };
};


export type InventoryUsageAttachmentDraft = {
  entity_type: 'inventory_usage_log';
  entity_id: string;
  original_filename: string;
  stored_filename: string;
  mime_type?: string;
  file_size_bytes?: number | string;
  storage_path?: string;
};

export type InventoryUsageAttachmentResponse = InventoryUsageAttachmentDraft & {
  id: string;
  tenant_id?: string;
  uploaded_by_user_id?: string | null;
  created_at?: string | null;
};

export type InventoryUsageBulkRequest = {
  consumption_reason?: string;
  department?: string;
  event_name?: string;
  notes?: string;
  consumed_at?: string;
  reference_type?: string;
  reference_id?: string;
  missing_evidence_acknowledged?: boolean;
  items: Array<{
    product_id: string;
    storage_location_id: string;
    quantity: number;
    consumption_reason?: string;
    department?: string;
    event_name?: string;
    notes?: string;
    reference_type?: string;
    reference_id?: string;
    missing_evidence_acknowledged?: boolean;
  }>;
};



export type InventoryUsageBulkReadinessLine = {
  line_number: number | string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  quantity: number | string;
  consumption_reason?: UsageReason | string | null;
  department?: string | null;
  event_name?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  prior_bulk_quantity?: number | string | null;
  current_quantity?: number | string | null;
  resulting_quantity?: number | string | null;
  minimum_quantity?: number | string | null;
  has_product?: boolean;
  has_storage_location?: boolean;
  has_stock_row?: boolean;
  blocked_by_missing_stock_row?: boolean;
  blocked_by_insufficient_stock?: boolean;
  blocked_by_critical_alert?: boolean;
  blocked_by_closed_period?: boolean;
  will_deplete?: boolean;
  will_go_below_minimum?: boolean;
  has_sufficient_stock?: boolean;
  critical_alert_count?: number | string | null;
  critical_alerts?: Array<{
    id?: string;
    product_id?: string | null;
    type?: string | null;
    message?: string | null;
    severity?: string | null;
    escalation_level?: number | string | null;
    created_at?: string | null;
  }>;
  blocking_reasons?: string[];
  acknowledgement_required_reasons?: string[];
  requires_evidence_or_acknowledgement?: boolean;
  missing_evidence_acknowledged?: boolean;
  can_record?: boolean;
};

export type InventoryUsageBulkReadinessResponse = {
  message: string;
  usage_timestamp?: string | null;
  can_record: boolean;
  line_count: number | string;
  recordable_count: number | string;
  blocked_count: number | string;
  warning_count: number | string;
  blocked_line_numbers?: Array<number | string>;
  warning_line_numbers?: Array<number | string>;
  period_open?: boolean;
  period_closure?: {
    id?: string;
    period_start?: string | null;
    period_end?: string | null;
    closed_at?: string | null;
  } | null;
  lines?: InventoryUsageBulkReadinessLine[];
};

export type InventoryUsageBulkResponse = {
  message: string;
  usage_count: number | string;
  items?: Array<{
    line_number: number | string;
    product_id: string;
    storage_location_id: string;
    quantity: number | string;
    stock?: {
      previous_quantity?: number | string;
      new_quantity?: number | string;
    };
    usage?: {
      id?: string;
      consumption_reason?: UsageReason | string;
      consumed_at?: string;
    };
  }>;
};

export type InventoryUsageTemplateLine = {
  product_id: string;
  storage_location_id: string;
  quantity: string;
  consumption_reason: string;
  notes: string;
};

export type InventoryUsageTemplateItem = {
  id?: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  quantity: number | string;
  consumption_reason?: UsageReason | string | null;
  notes?: string | null;
  sort_order?: number | string | null;
};

export type InventoryUsageTemplate = {
  id: string;
  name: string;
  description?: string | null;
  department?: string | null;
  event_name?: string | null;
  consumption_reason: UsageReason;
  notes?: string | null;
  is_active?: boolean | null;
  created_by_user_id?: string | null;
  created_by_user_name?: string | null;
  schedule_frequency?: 'daily' | 'weekly' | 'monthly' | string | null;
  schedule_interval?: number | string | null;
  next_run_at?: string | null;
  last_scheduled_run_at?: string | null;
  schedule_is_active?: boolean | null;
  last_used_at?: string | null;
  last_used_by_user_id?: string | null;
  last_used_by_user_name?: string | null;
  use_count?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: number | string | null;
  items?: InventoryUsageTemplateItem[];
};


export type InventoryUsageTemplateReadinessRow = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name?: string | null;
  required_quantity: number | string;
  current_quantity: number | string;
  effective_min_quantity: number | string;
  projected_quantity_after_use: number | string;
  has_stock_row?: boolean | null;
  consumption_reason?: UsageReason | string | null;
  requires_evidence_or_acknowledgement?: boolean | null;
  acknowledgement_required_reasons?: string[];
  readiness_status: 'ready' | 'missing_stock_row' | 'insufficient_stock' | 'below_minimum_after_use' | string;
};

export type InventoryUsageTemplateReadiness = {
  template?: InventoryUsageTemplate;
  summary?: {
    line_count?: number | string | null;
    total_required_quantity?: number | string | null;
    ready_count?: number | string | null;
    missing_stock_row_count?: number | string | null;
    insufficient_stock_count?: number | string | null;
    below_minimum_after_use_count?: number | string | null;
    evidence_acknowledgement_required_count?: number | string | null;
    can_record?: boolean | null;
  };
  rows?: InventoryUsageTemplateReadinessRow[];
};


export type InventoryUsageTemplateDraft = {
  name: string;
  description?: string;
  department?: string;
  event_name?: string;
  consumption_reason?: string;
  notes?: string;
  schedule_frequency?: string;
  schedule_interval?: number;
  next_run_at?: string;
  schedule_is_active?: boolean;
  items: Array<{
    product_id: string;
    storage_location_id: string;
    quantity: number;
    consumption_reason?: string;
    notes?: string;
  }>;
};


export type InventoryUsageScheduledTemplateRow = {
  id: string;
  name: string;
  department?: string | null;
  event_name?: string | null;
  consumption_reason?: UsageReason | string | null;
  is_active?: boolean | null;
  schedule_frequency?: 'daily' | 'weekly' | 'monthly' | string | null;
  schedule_interval?: number | string | null;
  schedule_is_active?: boolean | null;
  next_run_at?: string | null;
  last_scheduled_run_at?: string | null;
  last_used_at?: string | null;
  use_count?: number | string | null;
  line_count?: number | string | null;
  missing_stock_row_count?: number | string | null;
  insufficient_stock_count?: number | string | null;
  below_minimum_after_use_count?: number | string | null;
  evidence_acknowledgement_required_count?: number | string | null;
  schedule_status?: 'due' | 'scheduled' | 'ready_with_warnings' | 'missing_stock' | 'insufficient_stock' | 'missing_evidence_acknowledgement_required' | 'empty' | 'inactive' | string;
};

export type InventoryUsageScheduledTemplates = {
  summary?: {
    template_count?: number | string | null;
    due_count?: number | string | null;
    blocked_count?: number | string | null;
    warning_count?: number | string | null;
    evidence_acknowledgement_required_count?: number | string | null;
  };
  rows?: InventoryUsageScheduledTemplateRow[];
};


export type InventoryUsageScheduledTemplateRunDueResponse = {
  message: string;
  dry_run?: boolean;
  processed_count?: number | string | null;
  due_count?: number | string | null;
  rows?: Array<{
    template_id: string;
    template_name?: string | null;
    previous_next_run_at?: string | null;
    next_run_at?: string | null;
    last_scheduled_run_at?: string | null;
    usage_count?: number | string | null;
    status?: string | null;
  }>;
};

export type InventoryUsageTemplateResponse = {
  message: string;
  template: InventoryUsageTemplate;
};

export type InventoryUsageTemplateArchiveResponse = {
  message: string;
  template: InventoryUsageTemplate;
};


export type InventoryUsageTemplateConsumeResponse = InventoryUsageBulkResponse & {
  template?: {
    id: string;
    name: string;
    last_used_at?: string | null;
    last_used_by_user_id?: string | null;
    use_count?: number | string | null;
    last_scheduled_run_at?: string | null;
    next_run_at?: string | null;
    version?: number | string | null;
  };
};

export type InventoryUsagePeriodClosure = {
  id: string;
  tenant_id?: string;
  period_start: string;
  period_end: string;
  usage_count?: number | string | null;
  total_quantity?: number | string | null;
  estimated_usage_value?: number | string | null;
  exception_count?: number | string | null;
  reversed_count?: number | string | null;
  follow_up_count?: number | string | null;
  notes?: string | null;
  closed_by_user_id?: string | null;
  closed_by_user_name?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
};

export type InventoryUsagePeriodClosureDraft = {
  period_start: string;
  period_end: string;
  notes?: string;
};

export type InventoryUsagePeriodClosurePreview = {
  period_start: string;
  period_end: string;
  blocked?: boolean;
  blocker_code?: string | null;
  blocker_message?: string | null;
  existing_closure?: InventoryUsagePeriodClosure | null;
  usage_count?: number | string | null;
  total_quantity?: number | string | null;
  estimated_usage_value?: number | string | null;
  exception_count?: number | string | null;
  reversed_count?: number | string | null;
  follow_up_count?: number | string | null;
};

export type InventoryUsagePeriodClosurePreviewResponse = {
  message: string;
  preview: InventoryUsagePeriodClosurePreview;
};

export type InventoryUsagePeriodClosureResponse = {
  message: string;
  closure: InventoryUsagePeriodClosure;
};
