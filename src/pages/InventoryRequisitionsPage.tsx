import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiMutationRequest, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import type { ProductItem } from '../types/inventory';

type StorageLocationOption = {
  id: string;
  name: string;
  temperature_zone?: string | null;
};

type ProductOptionsResponse =
  | ProductItem[]
  | { products?: ProductItem[]; data?: ProductItem[]; items?: ProductItem[]; results?: ProductItem[] };

type StorageLocationOptionsResponse =
  | StorageLocationOption[]
  | { storageLocations?: StorageLocationOption[]; storage_locations?: StorageLocationOption[]; locations?: StorageLocationOption[]; data?: StorageLocationOption[]; items?: StorageLocationOption[]; results?: StorageLocationOption[] };

type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'cancelled'
  | string;

type RequisitionItem = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  product_category?: string | null;
  standard_unit_cost?: number | string | null;
  requested_estimated_value?: number | string | null;
  remaining_estimated_value?: number | string | null;
  requested_quantity: number | string;
  fulfilled_quantity: number | string;
  remaining_quantity?: number | string;
  notes?: string | null;
  approval_threshold_line_note_min_length?: number | string | null;
  approval_threshold_line_note_length?: number | string | null;
  approval_threshold_line_note_meets_minimum?: boolean | null;
};

type InventoryRequisition = {
  id: string;
  requisition_number: string;
  status: RequisitionStatus;
  requesting_department: string;
  target_department?: string | null;
  source_storage_location_id?: string | null;
  source_storage_location_name?: string | null;
  target_storage_location_id?: string | null;
  target_storage_location_name?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent' | string;
  needed_by?: string | null;
  notes?: string | null;
  item_count?: number | string;
  requested_quantity_total?: number | string;
  fulfilled_quantity_total?: number | string;
  requested_estimated_value_total?: number | string | null;
  remaining_estimated_value_total?: number | string | null;
  created_by_user_name?: string | null;
  submitted_by_user_name?: string | null;
  submitted_at?: string | null;
  approved_by_user_name?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  rejected_by_user_name?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  cancelled_by_user_name?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  last_fulfilled_by_user_name?: string | null;
  last_fulfilled_at?: string | null;
  sla_state?: string | null;
  approval_age_days?: number | string | null;
  fulfillment_age_days?: number | string | null;
  needed_by_overdue_days?: number | string | null;
  urgent_age_hours?: number | string | null;
  partial_fulfillment_age_days?: number | string | null;
  partial_fulfillment_state?: string | null;
  approval_threshold_level?: string | null;
  approval_threshold_reason?: string | null;
  approval_threshold_next_level?: string | null;
  approval_threshold_value_gap?: number | string | null;
  approval_threshold_notes_required?: boolean | null;
  approval_threshold_note_min_length?: number | string | null;
  approval_threshold_requisition_note_length?: number | string | null;
  approval_threshold_requisition_note_meets_minimum?: boolean | null;
  approval_threshold_line_note_total_count?: number | string | null;
  approval_threshold_line_note_below_minimum_count?: number | string | null;
  approval_threshold_note_depth_state?: string | null;
  approval_threshold_action_requirements?: string[] | null;
  high_value_threshold?: number | string | null;
  executive_value_threshold?: number | string | null;
  updated_at?: string;
  version?: number | string;
  items?: RequisitionItem[];
};

type RequisitionFormItem = {
  product_id: string;
  requested_quantity: string;
  notes: string;
};

type RequisitionFormState = {
  requesting_department: string;
  target_department: string;
  source_storage_location_id: string;
  target_storage_location_id: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  needed_by: string;
  notes: string;
  items: RequisitionFormItem[];
};

type FulfillmentFormState = Record<string, string>;

type RequisitionFulfillment = {
  id: string;
  requisition_item_id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  source_storage_location_name?: string | null;
  quantity: number | string;
  stock_movement_id: string;
  stock_movement_change?: number | string;
  notes?: string | null;
  fulfilled_by_user_name?: string | null;
  fulfilled_at?: string | null;
};


type RequisitionActivity = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown> | null;
  user_id?: string | null;
  user_name?: string | null;
  created_at?: string | null;
};

type RequisitionReadiness = {
  requisition_id?: string | null;
  requisition_number?: string | null;
  status?: string | null;
  ready: boolean;
  source_storage_location_name?: string | null;
  blockers?: Array<{ code: string; product_name?: string | null; message: string }>;
  warnings?: Array<{ code: string; product_name?: string | null; message: string }>;
  lines?: Array<{
    requisition_item_id: string;
    product_id: string;
    product_name?: string | null;
    product_unit?: string | null;
    requested_quantity?: number | string;
    fulfilled_quantity?: number | string;
    remaining_quantity: number | string;
    preview_quantity?: number | string;
    available_quantity: number | string | null;
    min_quantity?: number | string | null;
    projected_quantity: number | string | null;
    ready: boolean;
    blocker_code?: string | null;
    warning_code?: string | null;
    threshold_fulfillment_line_note_min_length?: number | string | null;
    threshold_fulfillment_line_note_length?: number | string | null;
    threshold_fulfillment_line_note_meets_minimum?: boolean | null;
  }>;
  approval_threshold_notes_required?: boolean | null;
  threshold_fulfillment_line_note_min_length?: number | string | null;
  threshold_fulfillment_line_note_below_minimum_count?: number | string | null;
  threshold_fulfillment_line_notes_meet_minimum?: boolean | null;
};

type BulkRequisitionReadiness = {
  ready: boolean;
  requisition_count: number | string;
  ready_requisition_count?: number | string;
  blocked_requisition_count?: number | string;
  blocker_count?: number | string;
  warning_count?: number | string;
  approval_threshold_governed_requisition_count?: number | string;
  threshold_fulfillment_line_note_below_minimum_count?: number | string | null;
  threshold_fulfillment_line_notes_meet_minimum?: boolean | null;
  blocked_requisition_numbers?: string[];
  blocker_code_counts?: Record<string, number>;
  warning_code_counts?: Record<string, number>;
  results?: RequisitionReadiness[];
};

type BulkFulfillmentResult = {
  message?: string;
  requisition_count: number | string;
  fulfilled_line_count: number | string;
  fulfilled_quantity_total: number | string;
  approval_threshold_governed_requisition_count?: number | string;
  threshold_fulfillment_line_note_below_minimum_count?: number | string | null;
  threshold_fulfillment_line_notes_meet_minimum?: boolean | null;
  results: Array<{
    requisition_id: string;
    requisition_number?: string | null;
    status?: string | null;
    fulfilled_line_count?: number | string;
    fulfilled_quantity_total?: number | string;
    approval_threshold_level?: string | null;
    approval_threshold_reason?: string | null;
    approval_threshold_note_depth_state?: string | null;
    approval_threshold_notes_required?: boolean | null;
    threshold_fulfillment_line_note_min_length?: number | string | null;
    threshold_fulfillment_line_note_below_minimum_count?: number | string | null;
    threshold_fulfillment_line_notes_meet_minimum?: boolean | null;
  }>;
};

type RequisitionExportRow = {
  requisition_number: string;
  status: string;
  priority: string;
  requesting_department: string;
  target_department?: string | null;
  source_storage_location_name?: string | null;
  target_storage_location_name?: string | null;
  needed_by?: string | null;
  submitted_at?: string | null;
  submitted_by_user_name?: string | null;
  approved_at?: string | null;
  approved_by_user_name?: string | null;
  approval_notes?: string | null;
  approval_threshold_approval_note_min_length?: number | string | null;
  approval_threshold_approval_note_length?: number | string | null;
  approval_threshold_approval_note_meets_minimum?: boolean | null;
  rejected_at?: string | null;
  rejected_by_user_name?: string | null;
  rejection_reason?: string | null;
  approval_threshold_rejection_reason_min_length?: number | string | null;
  approval_threshold_rejection_reason_length?: number | string | null;
  approval_threshold_rejection_reason_meets_minimum?: boolean | null;
  cancelled_at?: string | null;
  cancelled_by_user_name?: string | null;
  cancellation_reason?: string | null;
  approval_threshold_cancellation_reason_min_length?: number | string | null;
  approval_threshold_cancellation_reason_length?: number | string | null;
  approval_threshold_cancellation_reason_meets_minimum?: boolean | null;
  last_fulfilled_at?: string | null;
  last_fulfilled_by_user_name?: string | null;
  sla_state?: string | null;
  approval_age_days?: number | string | null;
  fulfillment_age_days?: number | string | null;
  needed_by_overdue_days?: number | string | null;
  urgent_age_hours?: number | string | null;
  partial_fulfillment_age_days?: number | string | null;
  partial_fulfillment_state?: string | null;
  approval_threshold_level?: string | null;
  approval_threshold_reason?: string | null;
  approval_threshold_next_level?: string | null;
  approval_threshold_value_gap?: number | string | null;
  approval_threshold_notes_required?: boolean | null;
  approval_threshold_note_min_length?: number | string | null;
  approval_threshold_requisition_note_min_length?: number | string | null;
  approval_threshold_requisition_note_length?: number | string | null;
  approval_threshold_requisition_note_meets_minimum?: boolean | null;
  approval_threshold_action_requirements?: string | null;
  created_at?: string | null;
  created_by_user_name?: string | null;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  standard_unit_cost?: number | string | null;
  requested_estimated_value?: number | string | null;
  remaining_estimated_value?: number | string | null;
  requested_quantity: number | string;
  fulfilled_quantity: number | string;
  remaining_quantity: number | string;
  line_notes?: string | null;
  approval_threshold_line_note_min_length?: number | string | null;
  approval_threshold_line_note_length?: number | string | null;
  approval_threshold_line_note_meets_minimum?: boolean | null;
  requisition_notes?: string | null;
};

type RequisitionSummary = {
  status_counts?: Record<string, {
    count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
  open_request_count: number;
  open_remaining_quantity: number;
  fulfillment_progress?: {
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
    fulfillment_rate_percent: number;
  };
  estimated_value_summary?: {
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    actionable_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  };
  top_estimated_value_departments?: Array<{
    requesting_department: string;
    request_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  top_estimated_value_target_departments?: Array<{
    target_department: string;
    request_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  top_estimated_value_source_locations?: Array<{
    source_storage_location_id?: string | null;
    source_storage_location_name: string;
    request_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  top_estimated_value_target_locations?: Array<{
    target_storage_location_id?: string | null;
    target_storage_location_name: string;
    request_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  top_estimated_value_products?: Array<{
    product_id: string;
    product_name: string;
    product_unit?: string | null;
    product_category?: string | null;
    request_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  top_estimated_value_categories?: Array<{
    product_category: string;
    request_count: number;
    product_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  top_estimated_value_requesters?: Array<{
    requester_user_id?: string | null;
    requester_user_name: string;
    request_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  estimated_value_by_priority?: Array<{
    priority: string;
    request_count: number;
    overdue_count: number;
    due_soon_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
  }>;
  estimated_value_by_status?: Array<{
    status: string;
    request_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog?: {
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
    stale_after_days: number;
  };

  fulfillment_backlog_oldest?: Array<{
    id: string;
    requisition_number: string;
    priority: string;
    requesting_department?: string | null;
    target_department?: string | null;
    needed_by?: string | null;
    partial_age_days: number;
    product_count: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_priority?: Array<{
    priority: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_age_bucket?: Array<{
    age_bucket: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_due_state?: Array<{
    due_state: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_sla_state?: Array<{
    sla_state: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_product?: Array<{
    product_id: string;
    product_name: string;
    product_unit?: string | null;
    product_category?: string | null;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_category?: Array<{
    product_category: string;
    product_count: number;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_requester?: Array<{
    requester_user_id?: string | null;
    requester_user_name: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_department?: Array<{
    requesting_department: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_target_department?: Array<{
    target_department: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_source_location?: Array<{
    source_storage_location_id?: string | null;
    source_storage_location_name: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  fulfillment_backlog_by_target_location?: Array<{
    target_storage_location_id?: string | null;
    target_storage_location_name: string;
    partially_fulfilled_count: number;
    stale_partially_fulfilled_count: number;
    oldest_partial_age_days: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  overdue_count: number;
  due_soon_count: number;
  urgent_open_count: number;
  actionable_count: number;
  due_window_days: number;
  approval_queue?: {
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total?: number;
    urgent_remaining_estimated_value_total?: number;
    overdue_remaining_estimated_value_total?: number;
  };
  approval_threshold_exposure?: {
    pending_count: number;
    urgent_count: number;
    high_priority_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
    high_value_threshold: number;
    executive_value_threshold: number;
  };
  approval_threshold_near_miss?: {
    near_high_value_count: number;
    near_executive_value_count: number;
    overdue_near_threshold_count: number;
    near_high_value_total: number;
    near_executive_value_total: number;
    largest_near_threshold_value: number;
    high_value_watch_floor: number;
    executive_value_watch_floor: number;
  };
  approval_threshold_by_reason?: Array<{
    approval_threshold_reason: string;
    pending_count: number;
    urgent_count: number;
    high_priority_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    pending_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_level?: Array<{
    approval_threshold_level: string;
    pending_count: number;
    urgent_count: number;
    high_priority_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    pending_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_priority?: Array<{
    priority: string;
    pending_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_department?: Array<{
    requesting_department: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_requester?: Array<{
    requester_user_id?: string | null;
    requester_user_name: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_target_department?: Array<{
    target_department: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_source_location?: Array<{
    source_storage_location_id?: string | null;
    source_storage_location_name: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_target_location?: Array<{
    target_storage_location_id?: string | null;
    target_storage_location_name: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_product?: Array<{
    product_id: string;
    product_name: string;
    product_unit?: string | null;
    product_category?: string | null;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    product_remaining_estimated_value_total: number;
    elevated_product_remaining_estimated_value_total: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_category?: Array<{
    product_category: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_due_state?: Array<{
    due_state: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_age_bucket?: Array<{
    approval_age_bucket: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_threshold_by_sla_state?: Array<{
    approval_sla_state: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    high_value_count: number;
    executive_value_count: number;
    elevated_approval_count: number;
    pending_remaining_estimated_value_total: number;
    elevated_remaining_estimated_value_total: number;
    largest_pending_remaining_estimated_value: number;
  }>;
  approval_queue_by_priority?: Array<{
    priority: string;
    pending_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_department?: Array<{
    requesting_department: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_target_department?: Array<{
    target_department: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_source_location?: Array<{
    source_storage_location_id?: string;
    source_storage_location_name: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_target_location?: Array<{
    target_storage_location_id?: string;
    target_storage_location_name: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_requester?: Array<{
    requester_user_id?: string;
    requester_user_name: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_product?: Array<{
    product_id: string;
    product_name: string;
    product_unit?: string;
    product_category?: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    pending_remaining_quantity_total: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_category?: Array<{
    product_category: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    pending_remaining_quantity_total: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_age_bucket?: Array<{
    age_bucket: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_sla_state?: Array<{
    approval_sla_state: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_by_due_state?: Array<{
    due_state: string;
    pending_count: number;
    urgent_count: number;
    overdue_count: number;
    due_soon_count: number;
    average_pending_age_days: number;
    oldest_pending_age_days: number;
    pending_remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
    overdue_remaining_estimated_value_total: number;
  }>;
  approval_queue_oldest?: Array<{
    id: string;
    requisition_number: string;
    priority: string;
    requesting_department?: string | null;
    target_department?: string | null;
    needed_by?: string | null;
    pending_since?: string | null;
    pending_age_days: number;
    product_count: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  approval_threshold_oldest?: Array<{
    id: string;
    requisition_number: string;
    priority: string;
    requesting_department?: string | null;
    target_department?: string | null;
    needed_by?: string | null;
    pending_since?: string | null;
    pending_age_days: number;
    product_count: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
    approval_threshold_level?: string | null;
    approval_threshold_reason?: string | null;
  }>;
  age_buckets?: {
    under_24h_count: number;
    one_to_three_day_count: number;
    three_to_seven_day_count: number;
    over_seven_day_count: number;
    average_open_age_days: number;
    oldest_open_age_days: number;
  };
  open_queue_oldest?: Array<{
    id: string;
    requisition_number: string;
    status: string;
    priority: string;
    requesting_department?: string | null;
    target_department?: string | null;
    needed_by?: string | null;
    open_since?: string | null;
    open_age_days: number;
    product_count: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  estimated_value_by_age_bucket?: Array<{
    age_bucket: string;
    request_count: number;
    requested_estimated_value_total: number;
    fulfilled_estimated_value_total: number;
    remaining_estimated_value_total: number;
    urgent_remaining_estimated_value_total: number;
  }>;
  sla_risk?: {
    approval_sla_breach_count: number;
    fulfillment_sla_breach_count: number;
    due_date_breach_count: number;
    urgent_stale_count: number;
    oldest_action_age_days: number;
    approval_sla_days: number;
    fulfillment_sla_days: number;
    urgent_stale_hours: number;
  };
  sla_risk_oldest?: Array<{
    id: string;
    requisition_number: string;
    priority: string;
    status: string;
    requesting_department?: string | null;
    target_department?: string | null;
    needed_by?: string | null;
    risk_reason: string;
    action_since?: string | null;
    action_age_days: number;
    product_count: number;
    remaining_quantity_total: number;
    remaining_estimated_value_total: number;
  }>;
  top_sla_risk_departments?: Array<{
    requesting_department: string;
    approval_sla_breach_count: number;
    fulfillment_sla_breach_count: number;
    due_date_breach_count: number;
    urgent_stale_count: number;
    at_risk_request_count: number;
    oldest_action_age_days: number;
  }>;
  top_sla_risk_products?: Array<{
    product_id: string;
    product_name: string;
    product_unit?: string | null;
    product_category?: string | null;
    approval_sla_breach_count: number;
    fulfillment_sla_breach_count: number;
    due_date_breach_count: number;
    urgent_stale_count: number;
    at_risk_request_count: number;
    at_risk_remaining_quantity: number;
    oldest_action_age_days: number;
  }>;
  top_sla_risk_requesters?: Array<{
    requester_user_id?: string | null;
    requester_user_name: string;
    approval_sla_breach_count: number;
    fulfillment_sla_breach_count: number;
    due_date_breach_count: number;
    urgent_stale_count: number;
    at_risk_request_count: number;
    oldest_action_age_days: number;
  }>;
  top_departments?: Array<{
    requesting_department: string;
    request_count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
  top_target_departments?: Array<{
    target_department: string;
    request_count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
  top_source_locations?: Array<{
    source_storage_location_id?: string | null;
    source_storage_location_name: string;
    request_count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
  top_target_locations?: Array<{
    target_storage_location_id?: string | null;
    target_storage_location_name: string;
    request_count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
  top_requesters?: Array<{
    requester_user_id?: string | null;
    requester_user_name: string;
    request_count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
  top_products?: Array<{
    product_id: string;
    product_name: string;
    product_unit?: string | null;
    product_category?: string | null;
    request_count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
  top_product_categories?: Array<{
    product_category: string;
    request_count: number;
    product_count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
  priority_breakdown?: Array<{
    priority: string;
    request_count: number;
    overdue_count: number;
    due_soon_count: number;
    requested_quantity_total: number;
    fulfilled_quantity_total: number;
    remaining_quantity_total: number;
  }>;
};

const emptyForm = (): RequisitionFormState => ({
  requesting_department: '',
  target_department: '',
  source_storage_location_id: '',
  target_storage_location_id: '',
  priority: 'normal',
  needed_by: '',
  notes: '',
  items: [{ product_id: '', requested_quantity: '', notes: '' }]
});

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 4 });
}


function extractApiList<T>(response: unknown, keys: string[]): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (!response || typeof response !== 'object') {
    return [];
  }

  const record = response as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

function normalizeProductOptions(response: ProductOptionsResponse): ProductItem[] {
  return extractApiList<ProductItem>(response, ['products', 'data', 'items', 'results']);
}

function normalizeStorageLocationOptions(response: StorageLocationOptionsResponse): StorageLocationOption[] {
  return extractApiList<StorageLocationOption>(response, [
    'storageLocations',
    'storage_locations',
    'locations',
    'data',
    'items',
    'results'
  ]);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Request failed.';
}

function slaStateLabel(state?: string | null): string {
  switch (state) {
    case 'approval_breached':
      return 'Approval SLA breached';
    case 'fulfillment_breached':
      return 'Fulfillment SLA breached';
    case 'due_breached':
      return 'Past needed-by date';
    case 'urgent_stale':
      return 'Urgent stale';
    default:
      return '';
  }
}

function slaStateDetail(item: InventoryRequisition): string {
  if (item.sla_state === 'approval_breached' && item.approval_age_days !== null && item.approval_age_days !== undefined) {
    return `${formatNumber(item.approval_age_days)}d pending approval`;
  }
  if (item.sla_state === 'fulfillment_breached' && item.fulfillment_age_days !== null && item.fulfillment_age_days !== undefined) {
    return `${formatNumber(item.fulfillment_age_days)}d awaiting fulfillment`;
  }
  if (item.sla_state === 'due_breached') {
    return `${formatNumber(item.needed_by_overdue_days || 0)}d past needed-by`;
  }
  if (item.sla_state === 'urgent_stale' && item.urgent_age_hours !== null && item.urgent_age_hours !== undefined) {
    return `${formatNumber(item.urgent_age_hours)}h since update`;
  }
  return '';
}

function approvalThresholdLabel(level?: string | null): string {
  switch (level) {
    case 'executive_value':
      return 'Executive approval threshold';
    case 'elevated':
      return 'Elevated approval threshold';
    case 'standard':
      return 'Standard approval threshold';
    default:
      return '';
  }
}

function approvalThresholdReasonLabel(reason?: string | null): string {
  switch (reason) {
    case 'executive_value':
      return 'Executive value threshold';
    case 'high_value':
      return 'High value threshold';
    case 'high_priority':
      return 'High priority threshold';
    case 'standard':
      return 'Standard approval';
    default:
      return reason ? reason.replace(/_/g, ' ') : '';
  }
}

const APPROVAL_THRESHOLD_NOTE_MIN_LENGTH = 12;
const HIGH_VALUE_APPROVAL_THRESHOLD = 1000;
const EXECUTIVE_VALUE_APPROVAL_THRESHOLD = 5000;

type DraftApprovalThresholdEstimate = {
  approval_threshold_level: 'standard' | 'elevated' | 'executive_value';
  approval_threshold_reason: 'standard' | 'high_priority' | 'high_value' | 'executive_value';
  approval_threshold_next_level: 'high_value' | 'executive_value' | null;
  approval_threshold_value_gap: number;
  estimated_value_total: number;
};

function getApprovalThresholdNoteMinLength(requisition?: InventoryRequisition | null): number {
  const rawMinLength = requisition?.approval_threshold_note_min_length;
  const parsedMinLength = typeof rawMinLength === 'number' ? rawMinLength : Number(rawMinLength);
  return Number.isFinite(parsedMinLength) && parsedMinLength > 0
    ? parsedMinLength
    : APPROVAL_THRESHOLD_NOTE_MIN_LENGTH;
}

function formatApprovalThresholdLineNoteDepth(item: RequisitionItem): string {
  const rawMinLength = item.approval_threshold_line_note_min_length;
  const parsedMinLength = typeof rawMinLength === 'number' ? rawMinLength : Number(rawMinLength);
  if (!Number.isFinite(parsedMinLength) || parsedMinLength <= 0) return '';
  const rawLength = item.approval_threshold_line_note_length;
  const parsedLength = typeof rawLength === 'number' ? rawLength : Number(rawLength);
  const noteLength = Number.isFinite(parsedLength) && parsedLength >= 0 ? parsedLength : 0;
  const status = item.approval_threshold_line_note_meets_minimum ? 'meets minimum' : 'below minimum';
  return `${noteLength}/${parsedMinLength} chars · ${status}`;
}

function formatApprovalThresholdQueueNoteDepth(requisition: InventoryRequisition): string {
  const rawMinLength = requisition.approval_threshold_note_min_length;
  const parsedMinLength = typeof rawMinLength === 'number' ? rawMinLength : Number(rawMinLength);
  if (!Number.isFinite(parsedMinLength) || parsedMinLength <= 0) return '';

  const rawRequisitionLength = requisition.approval_threshold_requisition_note_length;
  const parsedRequisitionLength = typeof rawRequisitionLength === 'number' ? rawRequisitionLength : Number(rawRequisitionLength);
  const requisitionNoteLength = Number.isFinite(parsedRequisitionLength) && parsedRequisitionLength >= 0 ? parsedRequisitionLength : 0;
  const rawLineCount = requisition.approval_threshold_line_note_total_count;
  const parsedLineCount = typeof rawLineCount === 'number' ? rawLineCount : Number(rawLineCount);
  const lineCount = Number.isFinite(parsedLineCount) && parsedLineCount >= 0 ? parsedLineCount : 0;
  const rawBelowMinimumCount = requisition.approval_threshold_line_note_below_minimum_count;
  const parsedBelowMinimumCount = typeof rawBelowMinimumCount === 'number' ? rawBelowMinimumCount : Number(rawBelowMinimumCount);
  const belowMinimumCount = Number.isFinite(parsedBelowMinimumCount) && parsedBelowMinimumCount >= 0 ? parsedBelowMinimumCount : 0;
  const requestNoteStatus = requisition.approval_threshold_requisition_note_meets_minimum ? 'request note ok' : 'request note short';
  const lineStatus = lineCount > 0 ? `${belowMinimumCount}/${lineCount} line notes short` : 'no request lines';
  const depthState = requisition.approval_threshold_note_depth_state === 'complete' ? 'ready' : 'needs notes';

  return `Notes: ${depthState} · ${requisitionNoteLength}/${parsedMinLength} chars · ${requestNoteStatus} · ${lineStatus}`;
}

function isApprovalThresholdGoverned(requisition?: InventoryRequisition | null): boolean {
  if (requisition?.approval_threshold_notes_required !== undefined && requisition.approval_threshold_notes_required !== null) {
    return Boolean(requisition.approval_threshold_notes_required);
  }
  return Boolean(requisition?.approval_threshold_level && requisition.approval_threshold_level !== 'standard');
}

function requiresApprovalThresholdNotes(requisition?: InventoryRequisition | null): boolean {
  return isApprovalThresholdGoverned(requisition);
}

function estimateDraftApprovalThreshold(form: RequisitionFormState, productById: Map<string, ProductItem>): DraftApprovalThresholdEstimate {
  const estimatedValueTotal = form.items.reduce((total, item) => {
    const product = productById.get(item.product_id);
    const quantity = Number(item.requested_quantity);
    const unitCost = Number(product?.standard_unit_cost ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost <= 0) return total;
    return total + quantity * unitCost;
  }, 0);
  const isExecutiveValue = estimatedValueTotal >= EXECUTIVE_VALUE_APPROVAL_THRESHOLD;
  const isHighValue = estimatedValueTotal >= HIGH_VALUE_APPROVAL_THRESHOLD;
  const isHighPriority = ['high', 'urgent'].includes(form.priority);

  return {
    approval_threshold_level: isExecutiveValue ? 'executive_value' : isHighValue || isHighPriority ? 'elevated' : 'standard',
    approval_threshold_reason: isExecutiveValue ? 'executive_value' : isHighValue ? 'high_value' : isHighPriority ? 'high_priority' : 'standard',
    approval_threshold_next_level: isExecutiveValue ? null : isHighValue ? 'executive_value' : 'high_value',
    approval_threshold_value_gap: isExecutiveValue
      ? 0
      : isHighValue
        ? Math.max(EXECUTIVE_VALUE_APPROVAL_THRESHOLD - estimatedValueTotal, 0)
        : Math.max(HIGH_VALUE_APPROVAL_THRESHOLD - estimatedValueTotal, 0),
    estimated_value_total: estimatedValueTotal
  };
}

function statusStyle(status: RequisitionStatus): CSSProperties {
  if (status === 'fulfilled') return styles.successBadge;
  if (status === 'approved' || status === 'partially_fulfilled') return styles.activeBadge;
  if (status === 'rejected' || status === 'cancelled') return styles.dangerBadge;
  if (status === 'submitted') return styles.warningBadge;
  return styles.neutralBadge;
}


function activityLabel(action: string): string {
  return action.replace(/^inventory_requisition\./, '').replace(/_/g, ' ');
}

function metadataText(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return '';
  const interestingKeys = [
    'previous_status',
    'next_status',
    'status',
    'approval_notes',
    'rejection_reason',
    'approval_threshold_level',
    'approval_threshold_reason',
    'approval_threshold_next_level',
    'approval_threshold_value_gap',
    'remaining_estimated_value_total',
    'high_value_threshold',
    'executive_value_threshold',
    'threshold_notes_enforced',
    'threshold_governed_approval',
    'threshold_approval_note_min_length',
    'threshold_note_min_length',
    'approval_note_length',
    'approval_note_meets_minimum',
    'threshold_governed_creation',
    'threshold_governed_update',
    'threshold_draft_note_min_length',
    'draft_note_length',
    'draft_note_meets_minimum',
    'threshold_draft_line_note_min_length',
    'draft_line_note_lengths',
    'draft_line_note_below_minimum_count',
    'draft_line_notes_meet_minimum',
    'threshold_governed_submission',
    'threshold_submission_note_min_length',
    'submission_note_length',
    'submission_note_meets_minimum',
    'threshold_submission_line_note_min_length',
    'submission_line_note_lengths',
    'submission_line_note_below_minimum_count',
    'submission_line_notes_meet_minimum',
    'threshold_governed_rejection',
    'threshold_rejection_reason_min_length',
    'rejection_reason_length',
    'rejection_reason_meets_minimum',
    'threshold_governed_cancellation',
    'threshold_cancellation_reason_min_length',
    'cancellation_reason_length',
    'cancellation_reason_meets_minimum',
    'threshold_governed_reopen',
    'threshold_reopen_reason_min_length',
    'reopen_reason_length',
    'reopen_reason_meets_minimum',
    'threshold_governed_fulfillment',
    'threshold_fulfillment_line_note_min_length',
    'fulfillment_line_note_lengths',
    'fulfillment_line_note_below_minimum_count',
    'fulfillment_line_notes_meet_minimum',
    'threshold_governed_comment',
    'threshold_comment_note_min_length',
    'comment_note_length',
    'comment_note_meets_minimum',
    'cancellation_reason',
    'reopen_reason',
    'comment',
    'fulfilled_line_count',
    'fulfilled_quantity_total',
    'item_count'
  ];
  return interestingKeys
    .filter((key) => metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '')
    .map((key) => `${key.replace(/_/g, ' ')}: ${String(metadata[key])}`)
    .join(' · ');
}

function buildCreatePayload(form: RequisitionFormState) {
  return {
    requesting_department: form.requesting_department.trim(),
    target_department: form.target_department.trim() || null,
    source_storage_location_id: form.source_storage_location_id || null,
    target_storage_location_id: form.target_storage_location_id || null,
    priority: form.priority,
    needed_by: form.needed_by || null,
    notes: form.notes.trim() || null,
    items: form.items
      .filter((item) => item.product_id && item.requested_quantity)
      .map((item) => ({
        product_id: item.product_id,
        requested_quantity: Number(item.requested_quantity),
        notes: item.notes.trim() || null
      }))
  };
}


function formFromRequisition(requisition: InventoryRequisition): RequisitionFormState {
  return {
    requesting_department: requisition.requesting_department || '',
    target_department: requisition.target_department || '',
    source_storage_location_id: requisition.source_storage_location_id || '',
    target_storage_location_id: requisition.target_storage_location_id || '',
    priority: ['low', 'normal', 'high', 'urgent'].includes(String(requisition.priority)) ? requisition.priority as RequisitionFormState['priority'] : 'normal',
    needed_by: requisition.needed_by ? String(requisition.needed_by).slice(0, 10) : '',
    notes: requisition.notes || '',
    items: requisition.items?.length
      ? requisition.items.map((item) => ({
        product_id: item.product_id,
        requested_quantity: String(item.requested_quantity || ''),
        notes: item.notes || ''
      }))
      : [{ product_id: '', requested_quantity: '', notes: '' }]
  };
}

export default function InventoryRequisitionsPage() {
  const queryClient = useQueryClient();
  const capabilities = useMemo(() => getRoleCapabilities(), []);
  const [status, setStatus] = useState('');
  const [dueState, setDueState] = useState('');
  const [fulfillmentState, setFulfillmentState] = useState('');
  const [slaState, setSlaState] = useState('');
  const [ageBucket, setAgeBucket] = useState('');
  const [approvalThresholdLevel, setApprovalThresholdLevel] = useState('');
  const [approvalThresholdReason, setApprovalThresholdReason] = useState('');
  const [approvalThresholdWatch, setApprovalThresholdWatch] = useState('');
  const [approvalThresholdNextLevel, setApprovalThresholdNextLevel] = useState('');
  const [approvalThresholdNoteDepthState, setApprovalThresholdNoteDepthState] = useState('');
  const [minApprovalThresholdGapFilter, setMinApprovalThresholdGapFilter] = useState('');
  const [maxApprovalThresholdGapFilter, setMaxApprovalThresholdGapFilter] = useState('');
  const [minRemainingValueFilter, setMinRemainingValueFilter] = useState('');
  const [maxRemainingValueFilter, setMaxRemainingValueFilter] = useState('');
  const [minRemainingQuantityFilter, setMinRemainingQuantityFilter] = useState('');
  const [maxRemainingQuantityFilter, setMaxRemainingQuantityFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [targetDepartmentFilter, setTargetDepartmentFilter] = useState('');
  const [sourceLocationFilter, setSourceLocationFilter] = useState('');
  const [targetLocationFilter, setTargetLocationFilter] = useState('');
  const [requesterFilter, setRequesterFilter] = useState('');
  const [neededByFromFilter, setNeededByFromFilter] = useState('');
  const [neededByToFilter, setNeededByToFilter] = useState('');
  const [createdFromFilter, setCreatedFromFilter] = useState('');
  const [createdToFilter, setCreatedToFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<RequisitionFormState>(() => emptyForm());
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [activityComment, setActivityComment] = useState('');
  const [fulfillmentLocationId, setFulfillmentLocationId] = useState('');
  const [fulfillAllRemaining, setFulfillAllRemaining] = useState(false);
  const [defaultFulfillmentNote, setDefaultFulfillmentNote] = useState('');
  const [fulfillmentLines, setFulfillmentLines] = useState<FulfillmentFormState>({});
  const [fulfillmentLineNotes, setFulfillmentLineNotes] = useState<FulfillmentFormState>({});
  const [bulkFulfillmentIds, setBulkFulfillmentIds] = useState<string[]>([]);
  const [bulkFulfillmentLocationId, setBulkFulfillmentLocationId] = useState('');
  const [bulkFulfillmentNote, setBulkFulfillmentNote] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['inventory-requisition-summary'],
    queryFn: () => apiRequest<RequisitionSummary>('/inventory-requisitions/summary?days=14')
  });

  const requisitionsQuery = useQuery({
    queryKey: ['inventory-requisitions', status, dueState, fulfillmentState, slaState, ageBucket, approvalThresholdLevel, approvalThresholdReason, approvalThresholdWatch, approvalThresholdNextLevel, approvalThresholdNoteDepthState, minApprovalThresholdGapFilter, maxApprovalThresholdGapFilter, minRemainingValueFilter, maxRemainingValueFilter, minRemainingQuantityFilter, maxRemainingQuantityFilter, priorityFilter, departmentFilter, targetDepartmentFilter, sourceLocationFilter, targetLocationFilter, requesterFilter, neededByFromFilter, neededByToFilter, createdFromFilter, createdToFilter, productFilter, productCategoryFilter, queueSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      const trimmedSearch = queueSearch.trim();
      const trimmedDepartment = departmentFilter.trim();
      const trimmedTargetDepartment = targetDepartmentFilter.trim();
      if (status) params.set('status', status);
      if (dueState) params.set('due_state', dueState);
      if (fulfillmentState) params.set('fulfillment_state', fulfillmentState);
      if (slaState) params.set('sla_state', slaState);
      if (ageBucket) params.set('age_bucket', ageBucket);
      if (approvalThresholdLevel) params.set('approval_threshold_level', approvalThresholdLevel);
      if (approvalThresholdReason) params.set('approval_threshold_reason', approvalThresholdReason);
      if (approvalThresholdWatch) params.set('approval_threshold_watch', approvalThresholdWatch);
      if (approvalThresholdNextLevel) params.set('approval_threshold_next_level', approvalThresholdNextLevel);
      if (approvalThresholdNoteDepthState) params.set('approval_threshold_note_depth_state', approvalThresholdNoteDepthState);
      if (minApprovalThresholdGapFilter) params.set('min_approval_threshold_value_gap', minApprovalThresholdGapFilter);
      if (maxApprovalThresholdGapFilter) params.set('max_approval_threshold_value_gap', maxApprovalThresholdGapFilter);
      if (minRemainingValueFilter) params.set('min_remaining_estimated_value', minRemainingValueFilter);
      if (maxRemainingValueFilter) params.set('max_remaining_estimated_value', maxRemainingValueFilter);
      if (minRemainingQuantityFilter) params.set('min_remaining_quantity', minRemainingQuantityFilter);
      if (maxRemainingQuantityFilter) params.set('max_remaining_quantity', maxRemainingQuantityFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (trimmedDepartment) params.set('requesting_department', trimmedDepartment);
      if (trimmedTargetDepartment) params.set('target_department', trimmedTargetDepartment);
      if (sourceLocationFilter) params.set('source_storage_location_id', sourceLocationFilter);
      if (targetLocationFilter) params.set('target_storage_location_id', targetLocationFilter);
      if (requesterFilter) params.set('requester_user_id', requesterFilter);
      if (neededByFromFilter) params.set('needed_by_from', neededByFromFilter);
      if (neededByToFilter) params.set('needed_by_to', neededByToFilter);
      if (createdFromFilter) params.set('created_from', createdFromFilter);
      if (createdToFilter) params.set('created_to', createdToFilter);
      if (productFilter) params.set('product_id', productFilter);
      if (productCategoryFilter) params.set('product_category', productCategoryFilter);
      if (trimmedSearch) params.set('search', trimmedSearch);
      return apiRequest<InventoryRequisition[]>(`/inventory-requisitions?${params.toString()}`);
    }
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'requisition-options'],
    queryFn: async () => normalizeProductOptions(await apiRequest<ProductOptionsResponse>('/products?limit=500'))
  });

  const productCategoryOptions = useMemo(() => {
    const categories = new Set<string>();
    productsQuery.data?.forEach((product) => {
      const category = String(product.category || '').trim();
      if (category) categories.add(category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [productsQuery.data]);

  const productById = useMemo(() => {
    const map = new Map<string, ProductItem>();
    productsQuery.data?.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [productsQuery.data]);

  const locationsQuery = useQuery({
    queryKey: ['storage-locations', 'requisition-options'],
    queryFn: async () => normalizeStorageLocationOptions(await apiRequest<StorageLocationOptionsResponse>('/storage-locations?limit=500'))
  });

  const detailQuery = useQuery({
    queryKey: ['inventory-requisition-detail', selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => apiRequest<InventoryRequisition>(`/inventory-requisitions/${selectedId}`)
  });

  const fulfillmentHistoryQuery = useQuery({
    queryKey: ['inventory-requisition-fulfillments', selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => apiRequest<RequisitionFulfillment[]>(`/inventory-requisitions/${selectedId}/fulfillments`)
  });

  const activityQuery = useQuery({
    queryKey: ['inventory-requisition-activity', selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => apiRequest<RequisitionActivity[]>(`/inventory-requisitions/${selectedId}/activity`)
  });

  const selected = detailQuery.data || requisitionsQuery.data?.find((item) => item.id === selectedId) || null;
  const effectiveFulfillmentLocationId = fulfillmentLocationId || selected?.source_storage_location_id || '';

  const readinessPreviewLines = useMemo(() => Object.entries(fulfillmentLines)
    .filter(([, quantity]) => quantity !== '' && Number(quantity) >= 0)
    .map(([requisition_item_id, quantity]) => ({
      requisition_item_id,
      quantity: Number(quantity),
      notes: fulfillmentLineNotes[requisition_item_id]?.trim() || null
    })), [fulfillmentLineNotes, fulfillmentLines]);

  const readinessQuery = useQuery({
    queryKey: ['inventory-requisition-readiness', selectedId, effectiveFulfillmentLocationId, readinessPreviewLines, fulfillAllRemaining, defaultFulfillmentNote],
    enabled: Boolean(selectedId) && ['approved', 'partially_fulfilled'].includes(String(selected?.status)),
    queryFn: () => apiMutationRequest<RequisitionReadiness>(`/inventory-requisitions/${selectedId}/readiness`, {
      method: 'POST',
      body: JSON.stringify({
        source_storage_location_id: effectiveFulfillmentLocationId || null,
        fulfill_all_remaining: fulfillAllRemaining,
        default_fulfillment_note: fulfillAllRemaining ? (defaultFulfillmentNote.trim() || null) : null,
        items: fulfillAllRemaining ? [] : readinessPreviewLines
      }),
      skipIdempotencyKey: true
    })
  });


  const invalidateRequisitions = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inventory-requisitions'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-requisition-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-requisition-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-requisition-fulfillments'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-requisition-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-requisition-bulk-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-requisition-activity'] }),
      queryClient.invalidateQueries({ queryKey: ['stock'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    ]);
  };

  const saveDraftMutation = useMutation({
    mutationFn: () => apiMutationRequest<InventoryRequisition>(editingDraftId ? `/inventory-requisitions/${editingDraftId}` : '/inventory-requisitions', {
      method: editingDraftId ? 'PUT' : 'POST',
      body: JSON.stringify(buildCreatePayload(form))
    }),
    onSuccess: async (saved) => {
      setForm(emptyForm());
      setEditingDraftId(null);
      setSelectedId(saved.id);
      await invalidateRequisitions();
    }
  });

  const workflowMutation = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'submit' | 'approve' | 'reject' | 'cancel' | 'reopen'; body?: unknown }) =>
      apiMutationRequest<InventoryRequisition>(`/inventory-requisitions/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(body || {})
      }),
    onSuccess: async (updated) => {
      setSelectedId(updated.id);
      setWorkflowNotes('');
      await invalidateRequisitions();
    }
  });

  const fulfillMutation = useMutation({
    mutationFn: () => {
      if (!selected?.id) throw new Error('Select a requisition first.');
      const items = Object.entries(fulfillmentLines)
        .filter(([, quantity]) => quantity && Number(quantity) > 0)
        .map(([requisition_item_id, quantity]) => ({
          requisition_item_id,
          quantity: Number(quantity),
          notes: fulfillmentLineNotes[requisition_item_id]?.trim() || null
        }));

      return apiMutationRequest<{ requisition: InventoryRequisition }>(`/inventory-requisitions/${selected.id}/fulfill`, {
        method: 'POST',
        body: JSON.stringify({
          source_storage_location_id: effectiveFulfillmentLocationId || null,
          fulfill_all_remaining: fulfillAllRemaining,
          default_fulfillment_note: fulfillAllRemaining ? (defaultFulfillmentNote.trim() || null) : null,
          items: fulfillAllRemaining ? [] : items
        })
      });
    },
    onSuccess: async (response) => {
      setSelectedId(response.requisition.id);
      setFulfillmentLines({});
      setFulfillmentLineNotes({});
      setFulfillAllRemaining(false);
      setDefaultFulfillmentNote('');
      await invalidateRequisitions();
    }
  });

  const bulkFulfillmentMutation = useMutation({
    mutationFn: () => apiMutationRequest<BulkFulfillmentResult>('/inventory-requisitions/bulk-fulfill', {
      method: 'POST',
      body: JSON.stringify({
        source_storage_location_id: bulkFulfillmentLocationId || null,
        fulfill_all_remaining: true,
        default_fulfillment_note: bulkFulfillmentNote.trim() || null,
        requisitions: bulkFulfillmentIds.map((requisition_id) => ({
          requisition_id,
          fulfill_all_remaining: true,
          default_fulfillment_note: bulkFulfillmentNote.trim() || null
        }))
      })
    }),
    onSuccess: async () => {
      setBulkFulfillmentIds([]);
      setBulkFulfillmentLocationId('');
      setBulkFulfillmentNote('');
      await invalidateRequisitions();
    }
  });

  const exportBulkFulfillmentResults = () => {
    const result = bulkFulfillmentMutation.data;
    if (!result?.results?.length) return;

    downloadCsv('inventory-requisition-bulk-fulfillment-results.csv', [
      [
        'Requisition #',
        'Requisition ID',
        'Status after fulfillment',
        'Fulfilled line count',
        'Fulfilled quantity total',
        'Approval threshold governed',
        'Approval threshold level',
        'Approval threshold reason',
        'Approval threshold note depth state',
        'Threshold fulfillment line note minimum length',
        'Threshold fulfillment line notes below minimum',
        'Threshold fulfillment line notes meet minimum'
      ],
      ...result.results.map((entry) => [
        entry.requisition_number || '',
        entry.requisition_id,
        entry.status || '',
        entry.fulfilled_line_count ?? '',
        entry.fulfilled_quantity_total ?? '',
        entry.approval_threshold_notes_required ? 'yes' : 'no',
        entry.approval_threshold_level || '',
        entry.approval_threshold_reason || '',
        entry.approval_threshold_note_depth_state || '',
        entry.threshold_fulfillment_line_note_min_length ?? '',
        entry.threshold_fulfillment_line_note_below_minimum_count ?? '',
        entry.threshold_fulfillment_line_notes_meet_minimum === null || entry.threshold_fulfillment_line_notes_meet_minimum === undefined
          ? ''
          : entry.threshold_fulfillment_line_notes_meet_minimum ? 'yes' : 'no'
      ])
    ]);
  };


  const exportBulkReadinessResults = () => {
    const readiness = bulkReadinessQuery.data;
    if (!readiness?.results?.length) return;

    const rows = readiness.results.flatMap((entry) => {
      const base = [
        entry.requisition_number || '',
        entry.requisition_id || '',
        entry.status || '',
        entry.ready ? 'yes' : 'no',
        entry.source_storage_location_name || '',
        entry.approval_threshold_notes_required ? 'yes' : 'no',
        entry.threshold_fulfillment_line_note_min_length ?? '',
        entry.threshold_fulfillment_line_note_below_minimum_count ?? '',
        entry.threshold_fulfillment_line_notes_meet_minimum === null || entry.threshold_fulfillment_line_notes_meet_minimum === undefined
          ? ''
          : entry.threshold_fulfillment_line_notes_meet_minimum ? 'yes' : 'no',
        (entry.blockers || []).map((blocker) => blocker.code).filter(Boolean).join('; '),
        (entry.warnings || []).map((warning) => warning.code).filter(Boolean).join('; ')
      ];

      if (!entry.lines?.length) {
        return [[...base, '', '', '', '', '', '', '', '', '', '']];
      }

      return entry.lines.map((line) => [
        ...base,
        line.product_name || '',
        line.product_unit || '',
        line.requested_quantity ?? '',
        line.fulfilled_quantity ?? '',
        line.remaining_quantity ?? '',
        line.preview_quantity ?? '',
        line.available_quantity ?? '',
        line.projected_quantity ?? '',
        line.ready ? 'yes' : 'no',
        line.blocker_code || '',
        line.threshold_fulfillment_line_note_length ?? '',
        line.threshold_fulfillment_line_note_meets_minimum === null || line.threshold_fulfillment_line_note_meets_minimum === undefined
          ? ''
          : line.threshold_fulfillment_line_note_meets_minimum ? 'yes' : 'no'
      ]);
    });

    downloadCsv('inventory-requisition-bulk-readiness-results.csv', [
      [
        'Requisition #',
        'Requisition ID',
        'Status',
        'Ready',
        'Source location',
        'Approval threshold governed',
        'Threshold line note minimum length',
        'Threshold line notes below minimum',
        'Threshold line notes meet minimum',
        'Requisition blockers',
        'Requisition warnings',
        'Product',
        'Unit',
        'Requested quantity',
        'Fulfilled quantity',
        'Remaining quantity',
        'Preview quantity',
        'Available quantity',
        'Projected quantity',
        'Line ready',
        'Line blocker',
        'Line note length',
        'Line note meets minimum'
      ],
      ...rows
    ]);
  };


  const exportQueueMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ limit: '5000' });
      const trimmedSearch = queueSearch.trim();
      const trimmedDepartment = departmentFilter.trim();
      const trimmedTargetDepartment = targetDepartmentFilter.trim();
      if (status) params.set('status', status);
      if (dueState) params.set('due_state', dueState);
      if (fulfillmentState) params.set('fulfillment_state', fulfillmentState);
      if (slaState) params.set('sla_state', slaState);
      if (ageBucket) params.set('age_bucket', ageBucket);
      if (approvalThresholdLevel) params.set('approval_threshold_level', approvalThresholdLevel);
      if (approvalThresholdReason) params.set('approval_threshold_reason', approvalThresholdReason);
      if (approvalThresholdWatch) params.set('approval_threshold_watch', approvalThresholdWatch);
      if (approvalThresholdNextLevel) params.set('approval_threshold_next_level', approvalThresholdNextLevel);
      if (approvalThresholdNoteDepthState) params.set('approval_threshold_note_depth_state', approvalThresholdNoteDepthState);
      if (minApprovalThresholdGapFilter) params.set('min_approval_threshold_value_gap', minApprovalThresholdGapFilter);
      if (maxApprovalThresholdGapFilter) params.set('max_approval_threshold_value_gap', maxApprovalThresholdGapFilter);
      if (minRemainingValueFilter) params.set('min_remaining_estimated_value', minRemainingValueFilter);
      if (maxRemainingValueFilter) params.set('max_remaining_estimated_value', maxRemainingValueFilter);
      if (minRemainingQuantityFilter) params.set('min_remaining_quantity', minRemainingQuantityFilter);
      if (maxRemainingQuantityFilter) params.set('max_remaining_quantity', maxRemainingQuantityFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (trimmedDepartment) params.set('requesting_department', trimmedDepartment);
      if (trimmedTargetDepartment) params.set('target_department', trimmedTargetDepartment);
      if (sourceLocationFilter) params.set('source_storage_location_id', sourceLocationFilter);
      if (targetLocationFilter) params.set('target_storage_location_id', targetLocationFilter);
      if (requesterFilter) params.set('requester_user_id', requesterFilter);
      if (neededByFromFilter) params.set('needed_by_from', neededByFromFilter);
      if (neededByToFilter) params.set('needed_by_to', neededByToFilter);
      if (createdFromFilter) params.set('created_from', createdFromFilter);
      if (createdToFilter) params.set('created_to', createdToFilter);
      if (productFilter) params.set('product_id', productFilter);
      if (productCategoryFilter) params.set('product_category', productCategoryFilter);
      if (trimmedSearch) params.set('search', trimmedSearch);
      return apiRequest<{ rows: RequisitionExportRow[] }>(`/inventory-requisitions/export?${params.toString()}`);
    },
    onSuccess: (payload) => {
      const header = [
        'Requisition #',
        'Status',
        'Priority',
        'Requesting department',
        'Target department',
        'Source location',
        'Target location',
        'Needed by',
        'Submitted at',
        'Submitted by',
        'Approved at',
        'Approved by',
        'Approval notes',
        'Approval threshold approval note minimum length',
        'Approval threshold approval note length',
        'Approval threshold approval note meets minimum',
        'Rejected at',
        'Rejected by',
        'Rejection reason',
        'Approval threshold rejection reason minimum length',
        'Approval threshold rejection reason length',
        'Approval threshold rejection reason meets minimum',
        'Cancelled at',
        'Cancelled by',
        'Cancellation reason',
        'Approval threshold cancellation reason minimum length',
        'Approval threshold cancellation reason length',
        'Approval threshold cancellation reason meets minimum',
        'Last fulfilled at',
        'Last fulfilled by',
        'SLA state',
        'Approval age days',
        'Fulfillment age days',
        'Needed-by overdue days',
        'Urgent age hours',
        'Partial fulfillment state',
        'Partial fulfillment age days',
        'Approval threshold level',
        'Approval threshold reason',
        'Approval threshold next level',
        'Approval threshold value gap',
        'Approval threshold notes required',
        'Approval threshold note minimum length',
        'Approval threshold requisition note minimum length',
        'Approval threshold requisition note length',
        'Approval threshold requisition note meets minimum',
        'Approval threshold action requirements',
        'Approval threshold line note minimum length',
        'Approval threshold line note length',
        'Approval threshold line note meets minimum',
        'Created at',
        'Created by',
        'Product',
        'Category',
        'Unit',
        'Standard unit cost',
        'Requested estimated value',
        'Remaining estimated value',
        'Requested quantity',
        'Fulfilled quantity',
        'Remaining quantity',
        'Line notes',
        'Requisition notes'
      ];
      const rows = payload.rows.map((row) => [
        row.requisition_number,
        row.status,
        row.priority,
        row.requesting_department,
        row.target_department || '',
        row.source_storage_location_name || '',
        row.target_storage_location_name || '',
        row.needed_by || '',
        row.submitted_at || '',
        row.submitted_by_user_name || '',
        row.approved_at || '',
        row.approved_by_user_name || '',
        row.approval_notes || '',
        row.approval_threshold_approval_note_min_length ?? '',
        row.approval_threshold_approval_note_length ?? '',
        row.approval_threshold_approval_note_meets_minimum === undefined || row.approval_threshold_approval_note_meets_minimum === null
          ? ''
          : row.approval_threshold_approval_note_meets_minimum
            ? 'Yes'
            : 'No',
        row.rejected_at || '',
        row.rejected_by_user_name || '',
        row.rejection_reason || '',
        row.approval_threshold_rejection_reason_min_length ?? '',
        row.approval_threshold_rejection_reason_length ?? '',
        row.approval_threshold_rejection_reason_meets_minimum === undefined || row.approval_threshold_rejection_reason_meets_minimum === null
          ? ''
          : row.approval_threshold_rejection_reason_meets_minimum
            ? 'Yes'
            : 'No',
        row.cancelled_at || '',
        row.cancelled_by_user_name || '',
        row.cancellation_reason || '',
        row.approval_threshold_cancellation_reason_min_length ?? '',
        row.approval_threshold_cancellation_reason_length ?? '',
        row.approval_threshold_cancellation_reason_meets_minimum === undefined || row.approval_threshold_cancellation_reason_meets_minimum === null
          ? ''
          : row.approval_threshold_cancellation_reason_meets_minimum
            ? 'Yes'
            : 'No',
        row.last_fulfilled_at || '',
        row.last_fulfilled_by_user_name || '',
        row.sla_state || '',
        row.approval_age_days ?? '',
        row.fulfillment_age_days ?? '',
        row.needed_by_overdue_days ?? '',
        row.urgent_age_hours ?? '',
        row.partial_fulfillment_state || '',
        row.partial_fulfillment_age_days ?? '',
        row.approval_threshold_level || '',
        row.approval_threshold_reason || '',
        row.approval_threshold_next_level || '',
        row.approval_threshold_value_gap ?? '',
        row.approval_threshold_notes_required ? 'Yes' : 'No',
        row.approval_threshold_note_min_length ?? '',
        row.approval_threshold_requisition_note_min_length ?? '',
        row.approval_threshold_requisition_note_length ?? '',
        row.approval_threshold_requisition_note_meets_minimum === undefined || row.approval_threshold_requisition_note_meets_minimum === null
          ? ''
          : row.approval_threshold_requisition_note_meets_minimum
            ? 'Yes'
            : 'No',
        row.approval_threshold_action_requirements || '',
        row.approval_threshold_line_note_min_length ?? '',
        row.approval_threshold_line_note_length ?? '',
        row.approval_threshold_line_note_meets_minimum === undefined || row.approval_threshold_line_note_meets_minimum === null
          ? ''
          : row.approval_threshold_line_note_meets_minimum
            ? 'Yes'
            : 'No',
        row.created_at || '',
        row.created_by_user_name || '',
        row.product_name,
        row.product_category || '',
        row.product_unit || '',
        row.standard_unit_cost ?? '',
        row.requested_estimated_value ?? '',
        row.remaining_estimated_value ?? '',
        row.requested_quantity,
        row.fulfilled_quantity,
        row.remaining_quantity,
        row.line_notes || '',
        row.requisition_notes || ''
      ]);

      downloadCsv('inventory-requisition-queue.csv', [header, ...rows]);
    }
  });


  const commentMutation = useMutation({
    mutationFn: () => {
      if (!selected?.id) throw new Error('Select a requisition first.');
      return apiMutationRequest<{ requisition: InventoryRequisition }>(`/inventory-requisitions/${selected.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment: activityComment.trim() })
      });
    },
    onSuccess: async (response) => {
      setSelectedId(response.requisition.id);
      setActivityComment('');
      await invalidateRequisitions();
    }
  });

  const addFormLine = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { product_id: '', requested_quantity: '', notes: '' }]
    }));
  };

  const updateFormLine = (index: number, field: keyof RequisitionFormItem, value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  };

  const removeFormLine = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const toggleBulkFulfillmentSelection = (requisitionId: string) => {
    setBulkFulfillmentIds((current) => current.includes(requisitionId)
      ? current.filter((id) => id !== requisitionId)
      : [...current, requisitionId]);
  };

  const clearBulkFulfillmentSelection = () => {
    setBulkFulfillmentIds([]);
    setBulkFulfillmentLocationId('');
    setBulkFulfillmentNote('');
  };

  const handleSaveDraft = (event: FormEvent) => {
    event.preventDefault();
    saveDraftMutation.mutate();
  };

  const loadSelectedDraftForEditing = () => {
    if (!selected || selected.status !== 'draft') return;
    setForm(formFromRequisition(selected));
    setEditingDraftId(selected.id);
    scrollToFormSection('inventory-requisition-form');
  };

  const cancelDraftEditing = () => {
    setForm(emptyForm());
    setEditingDraftId(null);
  };

  const runWorkflow = (action: 'submit' | 'approve' | 'reject' | 'cancel' | 'reopen') => {
    if (!selected?.id) return;
    const body = action === 'submit'
      ? {}
      : action === 'approve'
        ? { notes: workflowNotes.trim() || null }
        : { reason: workflowNotes.trim() };
    workflowMutation.mutate({ id: selected.id, action, body });
  };

  const visibleBulkFulfillmentIds = useMemo(() => new Set(requisitionsQuery.data?.map((item) => item.id) || []), [requisitionsQuery.data]);
  const bulkSelectedRequisitions = useMemo(() => (requisitionsQuery.data || []).filter((item) => bulkFulfillmentIds.includes(item.id)), [bulkFulfillmentIds, requisitionsQuery.data]);
  const bulkEligibleRequisitions = bulkSelectedRequisitions.filter((item) => ['approved', 'partially_fulfilled'].includes(String(item.status)));
  const bulkIneligibleCount = bulkSelectedRequisitions.length - bulkEligibleRequisitions.length;
  const bulkThresholdGoverned = bulkEligibleRequisitions.some((item) => requiresApprovalThresholdNotes(item));
  const bulkApprovalThresholdNoteMinLength = bulkEligibleRequisitions.reduce((max, item) => Math.max(max, getApprovalThresholdNoteMinLength(item)), APPROVAL_THRESHOLD_NOTE_MIN_LENGTH);
  const bulkFulfillmentNoteLength = bulkFulfillmentNote.trim().length;
  const bulkFulfillmentNoteMeetsThreshold = !bulkThresholdGoverned || bulkFulfillmentNoteLength >= bulkApprovalThresholdNoteMinLength;
  const bulkEligibleRequisitionIds = bulkEligibleRequisitions.map((item) => item.id);
  const bulkReadinessQuery = useQuery({
    queryKey: ['inventory-requisition-bulk-readiness', bulkEligibleRequisitionIds, bulkFulfillmentLocationId, bulkFulfillmentNote],
    enabled: capabilities.canFulfillInventoryRequisitions
      && bulkEligibleRequisitions.length > 0
      && bulkIneligibleCount === 0
      && bulkFulfillmentNoteMeetsThreshold,
    queryFn: () => apiMutationRequest<BulkRequisitionReadiness>('/inventory-requisitions/bulk-readiness', {
      method: 'POST',
      body: JSON.stringify({
        source_storage_location_id: bulkFulfillmentLocationId || null,
        fulfill_all_remaining: true,
        default_fulfillment_note: bulkFulfillmentNote.trim() || null,
        requisitions: bulkEligibleRequisitions.map((item) => ({
          requisition_id: item.id,
          fulfill_all_remaining: true,
          default_fulfillment_note: bulkFulfillmentNote.trim() || null
        }))
      }),
      skipIdempotencyKey: true
    })
  });
  const bulkReadinessBlocksFulfillment = bulkReadinessQuery.data?.ready === false;
  const canBulkFulfill = capabilities.canFulfillInventoryRequisitions
    && bulkEligibleRequisitions.length > 0
    && bulkIneligibleCount === 0
    && bulkFulfillmentNoteMeetsThreshold
    && !bulkReadinessBlocksFulfillment
    && !bulkReadinessQuery.isFetching;

  const approvalThresholdNotesRequired = requiresApprovalThresholdNotes(selected);
  const selectedApprovalThresholdNoteMinLength = getApprovalThresholdNoteMinLength(selected);
  const draftApprovalThresholdEstimate = useMemo(() => estimateDraftApprovalThreshold(form, productById), [form, productById]);
  const draftFormThresholdGoverned = draftApprovalThresholdEstimate.approval_threshold_level !== 'standard';
  const draftSaveThresholdGoverned = Boolean((editingDraftId && selected?.id === editingDraftId && approvalThresholdNotesRequired) || draftFormThresholdGoverned);
  const draftSaveThresholdLevel = draftFormThresholdGoverned ? draftApprovalThresholdEstimate.approval_threshold_level : selected?.approval_threshold_level;
  const draftSaveThresholdReason = draftFormThresholdGoverned ? draftApprovalThresholdEstimate.approval_threshold_reason : selected?.approval_threshold_reason;
  const draftSaveThresholdNoteMinLength = editingDraftId && selected?.id === editingDraftId ? selectedApprovalThresholdNoteMinLength : APPROVAL_THRESHOLD_NOTE_MIN_LENGTH;
  const editedDraftNotesLength = form.notes.trim().length;
  const editedDraftNotesMeetThresholdDepth = editedDraftNotesLength >= draftSaveThresholdNoteMinLength;
  const editedDraftLineNoteDepths = form.items
    .filter((item) => item.product_id && item.requested_quantity)
    .map((item) => item.notes.trim().length);
  const editedDraftLineNotesBelowMinimumCount = editedDraftLineNoteDepths.filter((noteLength) => noteLength < draftSaveThresholdNoteMinLength).length;
  const editedDraftLineNotesMeetThresholdDepth = editedDraftLineNoteDepths.length > 0 && editedDraftLineNotesBelowMinimumCount === 0;
  const draftNotesMeetThresholdDepth = (selected?.notes?.trim().length || 0) >= selectedApprovalThresholdNoteMinLength;
  const selectedDraftLineNoteDepths = (selected?.items || []).map((item) => {
    if (item.approval_threshold_line_note_meets_minimum !== undefined && item.approval_threshold_line_note_meets_minimum !== null) {
      return item.approval_threshold_line_note_meets_minimum ? selectedApprovalThresholdNoteMinLength : 0;
    }
    return (item.notes?.trim().length || 0);
  });
  const selectedDraftLineNotesBelowMinimumCount = selectedDraftLineNoteDepths.filter((noteLength) => noteLength < selectedApprovalThresholdNoteMinLength).length;
  const selectedDraftLineNotesMeetThresholdDepth = selectedDraftLineNoteDepths.length > 0 && selectedDraftLineNotesBelowMinimumCount === 0;
  const canSaveDraft = capabilities.canCreateInventoryRequisitions && (!draftSaveThresholdGoverned || (editedDraftNotesMeetThresholdDepth && editedDraftLineNotesMeetThresholdDepth));
  const canSubmit = selected?.status === 'draft' && capabilities.canSubmitInventoryRequisitions && (!approvalThresholdNotesRequired || (draftNotesMeetThresholdDepth && selectedDraftLineNotesMeetThresholdDepth));
  const workflowNotesLength = workflowNotes.trim().length;
  const workflowNotesMeetThresholdDepth = workflowNotesLength >= selectedApprovalThresholdNoteMinLength;
  const selectedFulfillmentLineEntries = Object.entries(fulfillmentLines).filter(([, quantity]) => quantity && Number(quantity) > 0);
  const selectedFulfillmentLineCount = selectedFulfillmentLineEntries.length;
  const defaultFulfillmentNoteLength = defaultFulfillmentNote.trim().length;
  const fulfillmentThresholdLinesMeetNoteDepth = fulfillAllRemaining
    ? (!approvalThresholdNotesRequired || defaultFulfillmentNoteLength >= selectedApprovalThresholdNoteMinLength)
    : selectedFulfillmentLineEntries.every(([requisitionItemId]) => !approvalThresholdNotesRequired || (fulfillmentLineNotes[requisitionItemId]?.trim().length || 0) >= selectedApprovalThresholdNoteMinLength);
  const canApprove = selected?.status === 'submitted' && capabilities.canApproveInventoryRequisitions && (!approvalThresholdNotesRequired || workflowNotesMeetThresholdDepth);
  const canReject = selected?.status === 'submitted' && capabilities.canApproveInventoryRequisitions && (!approvalThresholdNotesRequired || workflowNotesMeetThresholdDepth);
  const canCancel = ['draft', 'submitted', 'approved'].includes(String(selected?.status)) && capabilities.canCancelInventoryRequisitions && (!approvalThresholdNotesRequired || workflowNotesMeetThresholdDepth);
  const canReopen = ['rejected', 'cancelled'].includes(String(selected?.status)) && capabilities.canCreateInventoryRequisitions && (!approvalThresholdNotesRequired || workflowNotesMeetThresholdDepth);
  const canFulfill = ['approved', 'partially_fulfilled'].includes(String(selected?.status)) && capabilities.canFulfillInventoryRequisitions;
  const approvalThresholdApiRequirements = Array.isArray(selected?.approval_threshold_action_requirements)
    ? selected.approval_threshold_action_requirements.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  const approvalThresholdGovernanceRequirements = approvalThresholdNotesRequired
    ? [
        ...approvalThresholdApiRequirements,
        selected?.status === 'draft'
          ? `Draft notes must be at least ${selectedApprovalThresholdNoteMinLength} characters before submission (${selected?.notes?.trim().length || 0}/${selectedApprovalThresholdNoteMinLength}).`
          : null,
        ['submitted', 'approved', 'rejected', 'cancelled'].includes(String(selected?.status))
          ? `Workflow note/reason must be at least ${selectedApprovalThresholdNoteMinLength} characters for approve, reject, cancel, or reopen actions (${workflowNotesLength}/${selectedApprovalThresholdNoteMinLength}).`
          : null,
        fulfillAllRemaining
          ? `Default all-remaining fulfillment note must be at least ${selectedApprovalThresholdNoteMinLength} characters (${defaultFulfillmentNoteLength}/${selectedApprovalThresholdNoteMinLength}).`
          : selectedFulfillmentLineCount > 0
            ? `Each selected fulfillment line must include a note of at least ${selectedApprovalThresholdNoteMinLength} characters.`
            : null
      ].filter((item): item is string => Boolean(item))
    : [];
  const mutationError = saveDraftMutation.error || workflowMutation.error || fulfillMutation.error || bulkFulfillmentMutation.error || bulkReadinessQuery.error || commentMutation.error;

  return (
    <div style={styles.page}>
      <section style={styles.headerGrid}>
        <div style={styles.card}>
          <p style={styles.kicker}>Feature #4</p>
          <h2 style={styles.title}>Internal requisitions</h2>
          <p style={styles.muted}>
            Capture department demand, route approvals, and fulfill approved requests through the backend requisition workflow.
          </p>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Open requests</span>
          <strong style={styles.metricValue}>{formatNumber(summaryQuery.data?.open_request_count)}</strong>
          <span style={styles.muted}>{formatNumber(summaryQuery.data?.open_remaining_quantity)} units remaining</span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Action needed</span>
          <strong style={styles.metricValue}>{formatNumber(summaryQuery.data?.actionable_count)}</strong>
          <span style={styles.muted}>{formatNumber(summaryQuery.data?.overdue_count)} overdue · {formatNumber(summaryQuery.data?.urgent_open_count)} urgent</span>
        </div>
      </section>

      {mutationError && <div style={styles.errorBox}>{errorMessage(mutationError)}</div>}
      {bulkFulfillmentMutation.data && (
        <div style={styles.successBox}>
          <div>
            Bulk fulfillment recorded: {formatNumber(bulkFulfillmentMutation.data.requisition_count)} request(s), {formatNumber(bulkFulfillmentMutation.data.fulfilled_line_count)} line(s), {formatNumber(bulkFulfillmentMutation.data.fulfilled_quantity_total)} total units.
            {bulkFulfillmentMutation.data.approval_threshold_governed_requisition_count !== undefined && (
              <> Threshold-governed: {formatNumber(bulkFulfillmentMutation.data.approval_threshold_governed_requisition_count)} · below-minimum line notes: {formatNumber(bulkFulfillmentMutation.data.threshold_fulfillment_line_note_below_minimum_count)}.</>
            )}
          </div>
          {bulkFulfillmentMutation.data.results?.length ? (
            <div style={styles.bulkResultList}>
              <div style={styles.lineHeader}>
                <span style={styles.muted}>Bulk fulfillment result rows are available for governance review.</span>
                <button type="button" style={styles.secondaryButton} onClick={exportBulkFulfillmentResults}>Export result CSV</button>
              </div>
              {bulkFulfillmentMutation.data.results.slice(0, 8).map((result) => (
                <div key={result.requisition_id} style={styles.bulkResultRow}>
                  <strong>{result.requisition_number || result.requisition_id}</strong>
                  <span>{formatNumber(result.fulfilled_line_count)} line(s) · {formatNumber(result.fulfilled_quantity_total)} units · {result.status || 'updated'}</span>
                  {result.approval_threshold_notes_required && (
                    <span>Threshold {result.approval_threshold_level || 'governed'} · note depth {result.approval_threshold_note_depth_state || 'tracked'} · below-minimum fulfillment notes {formatNumber(result.threshold_fulfillment_line_note_below_minimum_count)}</span>
                  )}
                </div>
              ))}
              {bulkFulfillmentMutation.data.results.length > 8 && (
                <span style={styles.muted}>+{formatNumber(bulkFulfillmentMutation.data.results.length - 8)} more result(s)</span>
              )}
            </div>
          ) : null}
        </div>
      )}

      <section style={styles.summaryGrid}>
        <div style={styles.card}>
          <div style={styles.lineHeader}>
            <h3 style={styles.sectionTitle}>Demand summary</h3>
            <span style={styles.muted}>Next {formatNumber(summaryQuery.data?.due_window_days || 14)} days</span>
          </div>
          <div style={styles.compactMetrics}>
            <div><strong>{formatNumber(summaryQuery.data?.due_soon_count)}</strong><br /><span style={styles.muted}>Due soon</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.status_counts?.submitted?.count)}</strong><br /><span style={styles.muted}>Submitted</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.status_counts?.approved?.count)}</strong><br /><span style={styles.muted}>Approved</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.status_counts?.partially_fulfilled?.count)}</strong><br /><span style={styles.muted}>Partial</span></div>
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Top open departments</h3>
          {summaryQuery.data?.top_departments?.length ? summaryQuery.data.top_departments.slice(0, 4).map((department) => (
            <div key={department.requesting_department} style={styles.departmentRow}>
              <span>{department.requesting_department}</span>
              <strong>{formatNumber(department.remaining_quantity_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No open department demand.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Top requested products</h3>
          {summaryQuery.data?.top_products?.length ? summaryQuery.data.top_products.slice(0, 4).map((product) => (
            <div key={product.product_id} style={styles.departmentRow}>
              <span>{product.product_name}<br /><span style={styles.muted}>{product.product_unit || product.product_category || '-'}</span></span>
              <strong>{formatNumber(product.remaining_quantity_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No open product demand.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Product category demand</h3>
          {summaryQuery.data?.top_product_categories?.length ? summaryQuery.data.top_product_categories.slice(0, 4).map((category) => (
            <div key={category.product_category} style={styles.departmentRow}>
              <span>{category.product_category}<br /><span style={styles.muted}>{formatNumber(category.product_count)} products · {formatNumber(category.request_count)} open requests</span></span>
              <strong>{formatNumber(category.remaining_quantity_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No open category demand.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Top target departments</h3>
          {summaryQuery.data?.top_target_departments?.length ? summaryQuery.data.top_target_departments.slice(0, 4).map((department) => (
            <div key={department.target_department} style={styles.departmentRow}>
              <span>{department.target_department}<br /><span style={styles.muted}>{formatNumber(department.request_count)} open requests</span></span>
              <strong>{formatNumber(department.remaining_quantity_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No open target demand.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Source location demand</h3>
          {summaryQuery.data?.top_source_locations?.length ? summaryQuery.data.top_source_locations.slice(0, 4).map((location) => (
            <div key={location.source_storage_location_id || location.source_storage_location_name} style={styles.departmentRow}>
              <span>{location.source_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.request_count)} open requests</span></span>
              <strong>{formatNumber(location.remaining_quantity_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No open source-location demand.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Target location demand</h3>
          {summaryQuery.data?.top_target_locations?.length ? summaryQuery.data.top_target_locations.slice(0, 4).map((location) => (
            <div key={location.target_storage_location_id || location.target_storage_location_name} style={styles.departmentRow}>
              <span>{location.target_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.request_count)} open requests</span></span>
              <strong>{formatNumber(location.remaining_quantity_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No open target-location demand.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Top requesters</h3>
          {summaryQuery.data?.top_requesters?.length ? summaryQuery.data.top_requesters.slice(0, 4).map((requester) => (
            <div key={requester.requester_user_id || requester.requester_user_name} style={styles.departmentRow}>
              <span>{requester.requester_user_name}<br /><span style={styles.muted}>{formatNumber(requester.request_count)} open requests</span></span>
              <strong>{formatNumber(requester.remaining_quantity_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No open requester demand.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval queue</h3>
          <div style={styles.compactMetrics}>
            <div><strong>{formatNumber(summaryQuery.data?.approval_queue?.pending_count)}</strong><br /><span style={styles.muted}>Pending</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.approval_queue?.urgent_count)}</strong><br /><span style={styles.muted}>Urgent</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.approval_queue?.overdue_count)}</strong><br /><span style={styles.muted}>Overdue</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.approval_queue?.due_soon_count)}</strong><br /><span style={styles.muted}>Due soon</span></div>
          </div>
          <p style={styles.muted}>Average pending age: {formatNumber(summaryQuery.data?.approval_queue?.average_pending_age_days)} days · Oldest: {formatNumber(summaryQuery.data?.approval_queue?.oldest_pending_age_days)} days</p>
          <p style={styles.muted}>Pending value: {formatNumber(summaryQuery.data?.approval_queue?.pending_remaining_estimated_value_total)} · Urgent value: {formatNumber(summaryQuery.data?.approval_queue?.urgent_remaining_estimated_value_total)} · Overdue value: {formatNumber(summaryQuery.data?.approval_queue?.overdue_remaining_estimated_value_total)}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval threshold exposure</h3>
          <div style={styles.compactMetrics}>
            <div><strong>{formatNumber(summaryQuery.data?.approval_threshold_exposure?.elevated_approval_count)}</strong><br /><span style={styles.muted}>Elevated approvals</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.approval_threshold_exposure?.high_value_count)}</strong><br /><span style={styles.muted}>Value ≥ {formatNumber(summaryQuery.data?.approval_threshold_exposure?.high_value_threshold || 1000)}</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.approval_threshold_exposure?.executive_value_count)}</strong><br /><span style={styles.muted}>Value ≥ {formatNumber(summaryQuery.data?.approval_threshold_exposure?.executive_value_threshold || 5000)}</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.approval_threshold_exposure?.largest_pending_remaining_estimated_value)}</strong><br /><span style={styles.muted}>Largest pending value</span></div>
          </div>
          <p style={styles.muted}>Elevated value: {formatNumber(summaryQuery.data?.approval_threshold_exposure?.elevated_remaining_estimated_value_total)} · High priority: {formatNumber(summaryQuery.data?.approval_threshold_exposure?.high_priority_count)} · Urgent: {formatNumber(summaryQuery.data?.approval_threshold_exposure?.urgent_count)} · Overdue: {formatNumber(summaryQuery.data?.approval_threshold_exposure?.overdue_count)}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval threshold watchlist</h3>
          {summaryQuery.data?.approval_threshold_near_miss ? (
            <>
              <div style={styles.statsGrid}>
                <div><strong>{formatNumber(summaryQuery.data.approval_threshold_near_miss.near_high_value_count)}</strong><br /><span style={styles.muted}>Near high-value floor ≥ {formatNumber(summaryQuery.data.approval_threshold_near_miss.high_value_watch_floor)}</span></div>
                <div><strong>{formatNumber(summaryQuery.data.approval_threshold_near_miss.near_executive_value_count)}</strong><br /><span style={styles.muted}>Near executive floor ≥ {formatNumber(summaryQuery.data.approval_threshold_near_miss.executive_value_watch_floor)}</span></div>
                <div><strong>{formatNumber(summaryQuery.data.approval_threshold_near_miss.overdue_near_threshold_count)}</strong><br /><span style={styles.muted}>Overdue near-threshold</span></div>
                <div><strong>{formatNumber(summaryQuery.data.approval_threshold_near_miss.largest_near_threshold_value)}</strong><br /><span style={styles.muted}>Largest near threshold</span></div>
              </div>
              <p style={styles.muted}>Near high-value total: {formatNumber(summaryQuery.data.approval_threshold_near_miss.near_high_value_total)} · Near executive total: {formatNumber(summaryQuery.data.approval_threshold_near_miss.near_executive_value_total)}</p>
            </>
          ) : <p style={styles.muted}>No approval threshold watchlist data.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by reason</h3>
          {summaryQuery.data?.approval_threshold_by_reason?.length ? summaryQuery.data.approval_threshold_by_reason.map((reason) => (
            <div key={reason.approval_threshold_reason} style={styles.departmentRow}>
              <span>{approvalThresholdReasonLabel(reason.approval_threshold_reason)}<br /><span style={styles.muted}>{formatNumber(reason.pending_count)} pending · {formatNumber(reason.urgent_count)} urgent · {formatNumber(reason.high_value_count)} high value · {formatNumber(reason.overdue_count)} overdue</span></span>
              <strong>{formatNumber(reason.pending_remaining_estimated_value_total)} pending value</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by reason.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by level</h3>
          {summaryQuery.data?.approval_threshold_by_level?.length ? summaryQuery.data.approval_threshold_by_level.map((level) => (
            <div key={level.approval_threshold_level} style={styles.departmentRow}>
              <span>{approvalThresholdLabel(level.approval_threshold_level)}<br /><span style={styles.muted}>{formatNumber(level.pending_count)} pending · {formatNumber(level.urgent_count)} urgent · {formatNumber(level.overdue_count)} overdue</span></span>
              <strong>{formatNumber(level.pending_remaining_estimated_value_total)} pending value</strong>
            </div>
          )) : <p style={styles.muted}>No approval threshold level exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by priority</h3>
          {summaryQuery.data?.approval_threshold_by_priority?.length ? summaryQuery.data.approval_threshold_by_priority.map((priority) => (
            <div key={priority.priority} style={styles.departmentRow}>
              <span><span style={statusStyle(priority.priority)}>{priority.priority}</span><br /><span style={styles.muted}>{formatNumber(priority.elevated_approval_count)} elevated · {formatNumber(priority.high_value_count)} high value · {formatNumber(priority.executive_value_count)} executive · {formatNumber(priority.overdue_count)} overdue</span></span>
              <strong>{formatNumber(priority.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by priority.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by department</h3>
          {summaryQuery.data?.approval_threshold_by_department?.length ? summaryQuery.data.approval_threshold_by_department.map((department) => (
            <div key={department.requesting_department} style={styles.departmentRow}>
              <span>{department.requesting_department}<br /><span style={styles.muted}>{formatNumber(department.elevated_approval_count)} elevated · {formatNumber(department.urgent_count)} urgent · {formatNumber(department.high_value_count)} high value · {formatNumber(department.overdue_count)} overdue</span></span>
              <strong>{formatNumber(department.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by department.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by requester</h3>
          {summaryQuery.data?.approval_threshold_by_requester?.length ? summaryQuery.data.approval_threshold_by_requester.map((requester) => (
            <div key={requester.requester_user_id || requester.requester_user_name} style={styles.departmentRow}>
              <span>{requester.requester_user_name}<br /><span style={styles.muted}>{formatNumber(requester.elevated_approval_count)} elevated · {formatNumber(requester.urgent_count)} urgent · {formatNumber(requester.high_value_count)} high value · {formatNumber(requester.overdue_count)} overdue</span></span>
              <strong>{formatNumber(requester.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by requester.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by target department</h3>
          {summaryQuery.data?.approval_threshold_by_target_department?.length ? summaryQuery.data.approval_threshold_by_target_department.map((department) => (
            <div key={department.target_department} style={styles.departmentRow}>
              <span>{department.target_department}<br /><span style={styles.muted}>{formatNumber(department.elevated_approval_count)} elevated · {formatNumber(department.urgent_count)} urgent · {formatNumber(department.high_value_count)} high value · {formatNumber(department.overdue_count)} overdue</span></span>
              <strong>{formatNumber(department.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by target department.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by source location</h3>
          {summaryQuery.data?.approval_threshold_by_source_location?.length ? summaryQuery.data.approval_threshold_by_source_location.map((location) => (
            <div key={location.source_storage_location_id || location.source_storage_location_name} style={styles.departmentRow}>
              <span>{location.source_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.elevated_approval_count)} elevated · {formatNumber(location.urgent_count)} urgent · {formatNumber(location.high_value_count)} high value · {formatNumber(location.overdue_count)} overdue</span></span>
              <strong>{formatNumber(location.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by source location.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by target location</h3>
          {summaryQuery.data?.approval_threshold_by_target_location?.length ? summaryQuery.data.approval_threshold_by_target_location.map((location) => (
            <div key={location.target_storage_location_id || location.target_storage_location_name} style={styles.departmentRow}>
              <span>{location.target_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.elevated_approval_count)} elevated · {formatNumber(location.urgent_count)} urgent · {formatNumber(location.high_value_count)} high value · {formatNumber(location.overdue_count)} overdue</span></span>
              <strong>{formatNumber(location.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by target location.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by product</h3>
          {summaryQuery.data?.approval_threshold_by_product?.length ? summaryQuery.data.approval_threshold_by_product.map((product) => (
            <div key={product.product_id} style={styles.departmentRow}>
              <span>{product.product_name}<br /><span style={styles.muted}>{formatNumber(product.elevated_approval_count)} elevated requests · {formatNumber(product.high_value_count)} high value · {formatNumber(product.executive_value_count)} executive · {formatNumber(product.overdue_count)} overdue</span></span>
              <strong>{formatNumber(product.elevated_product_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by product.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by category</h3>
          {summaryQuery.data?.approval_threshold_by_category?.length ? summaryQuery.data.approval_threshold_by_category.map((category) => (
            <div key={category.product_category} style={styles.departmentRow}>
              <span>{category.product_category}<br /><span style={styles.muted}>{formatNumber(category.elevated_approval_count)} elevated · {formatNumber(category.urgent_count)} urgent · {formatNumber(category.high_value_count)} high value · {formatNumber(category.overdue_count)} overdue</span></span>
              <strong>{formatNumber(category.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by category.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by due state</h3>
          {summaryQuery.data?.approval_threshold_by_due_state?.length ? summaryQuery.data.approval_threshold_by_due_state.map((state) => (
            <div key={state.due_state} style={styles.departmentRow}>
              <span>{state.due_state.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(state.elevated_approval_count)} elevated · {formatNumber(state.urgent_count)} urgent · {formatNumber(state.high_value_count)} high value · {formatNumber(state.overdue_count)} overdue</span></span>
              <strong>{formatNumber(state.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by due state.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by age bucket</h3>
          {summaryQuery.data?.approval_threshold_by_age_bucket?.length ? summaryQuery.data.approval_threshold_by_age_bucket.map((bucket) => (
            <div key={bucket.approval_age_bucket} style={styles.departmentRow}>
              <span>{bucket.approval_age_bucket.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(bucket.elevated_approval_count)} elevated · {formatNumber(bucket.urgent_count)} urgent · {formatNumber(bucket.high_value_count)} high value · {formatNumber(bucket.overdue_count)} overdue</span></span>
              <strong>{formatNumber(bucket.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by age bucket.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval thresholds by SLA state</h3>
          {summaryQuery.data?.approval_threshold_by_sla_state?.length ? summaryQuery.data.approval_threshold_by_sla_state.map((state) => (
            <div key={state.approval_sla_state} style={styles.departmentRow}>
              <span>{state.approval_sla_state.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(state.elevated_approval_count)} elevated · {formatNumber(state.urgent_count)} urgent · {formatNumber(state.high_value_count)} high value · {formatNumber(state.overdue_count)} overdue</span></span>
              <strong>{formatNumber(state.elevated_remaining_estimated_value_total)} elevated</strong>
            </div>
          )) : <p style={styles.muted}>No threshold exposure by SLA state.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Oldest threshold approvals</h3>
          {summaryQuery.data?.approval_threshold_oldest?.length ? summaryQuery.data.approval_threshold_oldest.slice(0, 5).map((request) => (
            <div key={request.id} style={styles.summaryRow}>
              <span>{request.requisition_number}<br /><span style={styles.muted}>{request.requesting_department || 'No department'} → {request.target_department || 'No target'} · {approvalThresholdLabel(request.approval_threshold_level || 'standard')} · {formatNumber(request.product_count)} products</span></span>
              <strong>{formatNumber(request.pending_age_days)}d · {formatNumber(request.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No elevated threshold approvals.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by priority</h3>
          {summaryQuery.data?.approval_queue_by_priority?.length ? summaryQuery.data.approval_queue_by_priority.map((priority) => (
            <div key={priority.priority} style={styles.departmentRow}>
              <span><span style={statusStyle(priority.priority)}>{priority.priority}</span><br /><span style={styles.muted}>{formatNumber(priority.pending_count)} pending · {formatNumber(priority.overdue_count)} overdue · avg {formatNumber(priority.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(priority.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by priority.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by department</h3>
          {summaryQuery.data?.approval_queue_by_department?.length ? summaryQuery.data.approval_queue_by_department.map((department) => (
            <div key={department.requesting_department} style={styles.departmentRow}>
              <span>{department.requesting_department}<br /><span style={styles.muted}>{formatNumber(department.pending_count)} pending · {formatNumber(department.urgent_count)} urgent · {formatNumber(department.overdue_count)} overdue · avg {formatNumber(department.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(department.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by department.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by target department</h3>
          {summaryQuery.data?.approval_queue_by_target_department?.length ? summaryQuery.data.approval_queue_by_target_department.map((department) => (
            <div key={department.target_department} style={styles.departmentRow}>
              <span>{department.target_department}<br /><span style={styles.muted}>{formatNumber(department.pending_count)} pending · {formatNumber(department.urgent_count)} urgent · {formatNumber(department.overdue_count)} overdue · avg {formatNumber(department.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(department.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by target department.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by source location</h3>
          {summaryQuery.data?.approval_queue_by_source_location?.length ? summaryQuery.data.approval_queue_by_source_location.map((location) => (
            <div key={location.source_storage_location_id || location.source_storage_location_name} style={styles.departmentRow}>
              <span>{location.source_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.pending_count)} pending · {formatNumber(location.urgent_count)} urgent · {formatNumber(location.overdue_count)} overdue · avg {formatNumber(location.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(location.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by source location.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by target location</h3>
          {summaryQuery.data?.approval_queue_by_target_location?.length ? summaryQuery.data.approval_queue_by_target_location.map((location) => (
            <div key={location.target_storage_location_id || location.target_storage_location_name} style={styles.departmentRow}>
              <span>{location.target_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.pending_count)} pending · {formatNumber(location.urgent_count)} urgent · {formatNumber(location.overdue_count)} overdue · avg {formatNumber(location.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(location.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by target location.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by requester</h3>
          {summaryQuery.data?.approval_queue_by_requester?.length ? summaryQuery.data.approval_queue_by_requester.map((requester) => (
            <div key={requester.requester_user_id || requester.requester_user_name} style={styles.departmentRow}>
              <span>{requester.requester_user_name}<br /><span style={styles.muted}>{formatNumber(requester.pending_count)} pending · {formatNumber(requester.urgent_count)} urgent · {formatNumber(requester.overdue_count)} overdue · avg {formatNumber(requester.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(requester.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by requester.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by product</h3>
          {summaryQuery.data?.approval_queue_by_product?.length ? summaryQuery.data.approval_queue_by_product.map((product) => (
            <div key={product.product_id} style={styles.departmentRow}>
              <span>{product.product_name}<br /><span style={styles.muted}>{formatNumber(product.pending_count)} pending · {formatNumber(product.urgent_count)} urgent · {formatNumber(product.overdue_count)} overdue · {formatNumber(product.pending_remaining_quantity_total)} {product.product_unit || 'units'} remaining</span></span>
              <strong>{formatNumber(product.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by product.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by category</h3>
          {summaryQuery.data?.approval_queue_by_category?.length ? summaryQuery.data.approval_queue_by_category.map((category) => (
            <div key={category.product_category} style={styles.departmentRow}>
              <span>{category.product_category}<br /><span style={styles.muted}>{formatNumber(category.pending_count)} pending · {formatNumber(category.urgent_count)} urgent · {formatNumber(category.overdue_count)} overdue · {formatNumber(category.pending_remaining_quantity_total)} units remaining</span></span>
              <strong>{formatNumber(category.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by category.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by age bucket</h3>
          {summaryQuery.data?.approval_queue_by_age_bucket?.length ? summaryQuery.data.approval_queue_by_age_bucket.map((bucket) => (
            <div key={bucket.age_bucket} style={styles.departmentRow}>
              <span>{bucket.age_bucket.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(bucket.pending_count)} pending · {formatNumber(bucket.urgent_count)} urgent · {formatNumber(bucket.overdue_count)} overdue · avg {formatNumber(bucket.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(bucket.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by age bucket.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by SLA state</h3>
          {summaryQuery.data?.approval_queue_by_sla_state?.length ? summaryQuery.data.approval_queue_by_sla_state.map((state) => (
            <div key={state.approval_sla_state} style={styles.departmentRow}>
              <span>{state.approval_sla_state.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(state.pending_count)} pending · {formatNumber(state.urgent_count)} urgent · {formatNumber(state.overdue_count)} overdue · avg {formatNumber(state.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(state.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by SLA state.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Approval value by due state</h3>
          {summaryQuery.data?.approval_queue_by_due_state?.length ? summaryQuery.data.approval_queue_by_due_state.map((state) => (
            <div key={state.due_state} style={styles.departmentRow}>
              <span>{state.due_state.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(state.pending_count)} pending · {formatNumber(state.urgent_count)} urgent · {formatNumber(state.overdue_count)} overdue · {formatNumber(state.due_soon_count)} due soon · avg {formatNumber(state.average_pending_age_days)}d</span></span>
              <strong>{formatNumber(state.pending_remaining_estimated_value_total)} pending</strong>
            </div>
          )) : <p style={styles.muted}>No pending approval value by due state.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Oldest pending approvals</h3>
          {summaryQuery.data?.approval_queue_oldest?.length ? summaryQuery.data.approval_queue_oldest.slice(0, 5).map((request) => (
            <div key={request.id} style={styles.summaryRow}>
              <span>{request.requisition_number}<br /><span style={styles.muted}>{request.requesting_department || 'No department'} → {request.target_department || 'No target'} · {request.priority} · {formatNumber(request.product_count)} products</span></span>
              <strong>{formatNumber(request.pending_age_days)}d · {formatNumber(request.remaining_quantity_total)} units · {formatNumber(request.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No pending approvals.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment progress</h3>
          <div style={styles.compactMetrics}>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_progress?.requested_quantity_total)}</strong><br /><span style={styles.muted}>Requested</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_progress?.fulfilled_quantity_total)}</strong><br /><span style={styles.muted}>Fulfilled</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_progress?.remaining_quantity_total)}</strong><br /><span style={styles.muted}>Remaining</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_progress?.fulfillment_rate_percent)}%</strong><br /><span style={styles.muted}>Fulfillment rate</span></div>
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Estimated value exposure</h3>
          <div style={styles.compactMetrics}>
            <div><strong>{formatNumber(summaryQuery.data?.estimated_value_summary?.requested_estimated_value_total)}</strong><br /><span style={styles.muted}>Open requested value</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.estimated_value_summary?.fulfilled_estimated_value_total)}</strong><br /><span style={styles.muted}>Fulfilled value</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.estimated_value_summary?.remaining_estimated_value_total)}</strong><br /><span style={styles.muted}>Remaining value</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.estimated_value_summary?.urgent_remaining_estimated_value_total)}</strong><br /><span style={styles.muted}>Urgent remaining value</span></div>
          </div>
          <p style={styles.muted}>Actionable remaining value: {formatNumber(summaryQuery.data?.estimated_value_summary?.actionable_remaining_estimated_value_total)}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by priority</h3>
          {summaryQuery.data?.estimated_value_by_priority?.length ? summaryQuery.data.estimated_value_by_priority.map((priority) => (
            <div key={priority.priority} style={styles.departmentRow}>
              <span><span style={statusStyle(priority.priority)}>{priority.priority}</span><br /><span style={styles.muted}>{formatNumber(priority.request_count)} open · {formatNumber(priority.overdue_count)} overdue · {formatNumber(priority.due_soon_count)} due soon</span></span>
              <strong>{formatNumber(priority.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No priority value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by status</h3>
          {summaryQuery.data?.estimated_value_by_status?.length ? summaryQuery.data.estimated_value_by_status.map((status) => (
            <div key={status.status} style={styles.departmentRow}>
              <span><span style={statusStyle(status.status)}>{status.status}</span><br /><span style={styles.muted}>{formatNumber(status.request_count)} open · urgent value {formatNumber(status.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(status.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No status value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by department</h3>
          {summaryQuery.data?.top_estimated_value_departments?.length ? summaryQuery.data.top_estimated_value_departments.slice(0, 4).map((department) => (
            <div key={department.requesting_department} style={styles.departmentRow}>
              <span>{department.requesting_department}<br /><span style={styles.muted}>{formatNumber(department.request_count)} open · urgent value {formatNumber(department.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(department.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No department value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by target department</h3>
          {summaryQuery.data?.top_estimated_value_target_departments?.length ? summaryQuery.data.top_estimated_value_target_departments.slice(0, 4).map((department) => (
            <div key={department.target_department} style={styles.departmentRow}>
              <span>{department.target_department}<br /><span style={styles.muted}>{formatNumber(department.request_count)} open · urgent value {formatNumber(department.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(department.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No target department value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by source location</h3>
          {summaryQuery.data?.top_estimated_value_source_locations?.length ? summaryQuery.data.top_estimated_value_source_locations.slice(0, 4).map((location) => (
            <div key={location.source_storage_location_id || location.source_storage_location_name} style={styles.departmentRow}>
              <span>{location.source_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.request_count)} open · urgent value {formatNumber(location.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(location.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No source location value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by target location</h3>
          {summaryQuery.data?.top_estimated_value_target_locations?.length ? summaryQuery.data.top_estimated_value_target_locations.slice(0, 4).map((location) => (
            <div key={location.target_storage_location_id || location.target_storage_location_name} style={styles.departmentRow}>
              <span>{location.target_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.request_count)} open · urgent value {formatNumber(location.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(location.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No target location value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by product</h3>
          {summaryQuery.data?.top_estimated_value_products?.length ? summaryQuery.data.top_estimated_value_products.slice(0, 4).map((product) => (
            <div key={product.product_id} style={styles.departmentRow}>
              <span>{product.product_name}<br /><span style={styles.muted}>{product.product_unit || product.product_category || '-'} · urgent value {formatNumber(product.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(product.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No product value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by category</h3>
          {summaryQuery.data?.top_estimated_value_categories?.length ? summaryQuery.data.top_estimated_value_categories.slice(0, 4).map((category) => (
            <div key={category.product_category} style={styles.departmentRow}>
              <span>{category.product_category}<br /><span style={styles.muted}>{formatNumber(category.product_count)} products · {formatNumber(category.request_count)} open · urgent value {formatNumber(category.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(category.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No category value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by requester</h3>
          {summaryQuery.data?.top_estimated_value_requesters?.length ? summaryQuery.data.top_estimated_value_requesters.slice(0, 4).map((requester) => (
            <div key={requester.requester_user_id || requester.requester_user_name} style={styles.departmentRow}>
              <span>{requester.requester_user_name}<br /><span style={styles.muted}>{formatNumber(requester.request_count)} open · urgent value {formatNumber(requester.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(requester.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No requester value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog</h3>
          <div style={styles.compactMetrics}>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_backlog?.partially_fulfilled_count)}</strong><br /><span style={styles.muted}>Partial requests</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_backlog?.stale_partially_fulfilled_count)}</strong><br /><span style={styles.muted}>Stale &gt; {formatNumber(summaryQuery.data?.fulfillment_backlog?.stale_after_days || 3)}d</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_backlog?.oldest_partial_age_days)}</strong><br /><span style={styles.muted}>Oldest partial days</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_backlog?.remaining_quantity_total)}</strong><br /><span style={styles.muted}>Partial remaining</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.fulfillment_backlog?.remaining_estimated_value_total)}</strong><br /><span style={styles.muted}>Partial value</span></div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Oldest partial fulfillments</h3>
          {summaryQuery.data?.fulfillment_backlog_oldest?.length ? summaryQuery.data.fulfillment_backlog_oldest.slice(0, 5).map((request) => (
            <div key={request.id} style={styles.summaryRow}>
              <span>{request.requisition_number}<br /><span style={styles.muted}>{request.requesting_department || 'No department'} → {request.target_department || 'No target'} · {request.priority}</span></span>
              <strong>{formatNumber(request.partial_age_days)}d · {formatNumber(request.remaining_quantity_total)} units · {formatNumber(request.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No aged partial fulfillments.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by priority</h3>
          {summaryQuery.data?.fulfillment_backlog_by_priority?.length ? summaryQuery.data.fulfillment_backlog_by_priority.map((priority) => (
            <div key={priority.priority} style={styles.departmentRow}>
              <span>{priority.priority}<br /><span style={styles.muted}>{formatNumber(priority.partially_fulfilled_count)} partial · {formatNumber(priority.stale_partially_fulfilled_count)} stale · oldest {formatNumber(priority.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(priority.remaining_quantity_total)} units · {formatNumber(priority.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No priority-level fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by age bucket</h3>
          {summaryQuery.data?.fulfillment_backlog_by_age_bucket?.length ? summaryQuery.data.fulfillment_backlog_by_age_bucket.map((bucket) => (
            <div key={bucket.age_bucket} style={styles.departmentRow}>
              <span>{bucket.age_bucket.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(bucket.partially_fulfilled_count)} partial · {formatNumber(bucket.stale_partially_fulfilled_count)} stale · oldest {formatNumber(bucket.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(bucket.remaining_quantity_total)} units · {formatNumber(bucket.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No age-bucket fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by due state</h3>
          {summaryQuery.data?.fulfillment_backlog_by_due_state?.length ? summaryQuery.data.fulfillment_backlog_by_due_state.map((state) => (
            <div key={state.due_state} style={styles.departmentRow}>
              <span>{state.due_state.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(state.partially_fulfilled_count)} partial · {formatNumber(state.stale_partially_fulfilled_count)} stale · oldest {formatNumber(state.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(state.remaining_quantity_total)} units · {formatNumber(state.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No due-state fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by SLA state</h3>
          {summaryQuery.data?.fulfillment_backlog_by_sla_state?.length ? summaryQuery.data.fulfillment_backlog_by_sla_state.map((state) => (
            <div key={state.sla_state} style={styles.departmentRow}>
              <span>{state.sla_state.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(state.partially_fulfilled_count)} partial · {formatNumber(state.stale_partially_fulfilled_count)} stale · oldest {formatNumber(state.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(state.remaining_quantity_total)} units · {formatNumber(state.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No SLA-state fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by product</h3>
          {summaryQuery.data?.fulfillment_backlog_by_product?.length ? summaryQuery.data.fulfillment_backlog_by_product.slice(0, 4).map((product) => (
            <div key={product.product_id} style={styles.departmentRow}>
              <span>{product.product_name}<br /><span style={styles.muted}>{formatNumber(product.partially_fulfilled_count)} partial · {formatNumber(product.stale_partially_fulfilled_count)} stale · oldest {formatNumber(product.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(product.remaining_quantity_total)} {product.product_unit || 'units'} · {formatNumber(product.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No product-level fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by category</h3>
          {summaryQuery.data?.fulfillment_backlog_by_category?.length ? summaryQuery.data.fulfillment_backlog_by_category.slice(0, 4).map((category) => (
            <div key={category.product_category} style={styles.departmentRow}>
              <span>{category.product_category}<br /><span style={styles.muted}>{formatNumber(category.product_count)} products · {formatNumber(category.partially_fulfilled_count)} partial · {formatNumber(category.stale_partially_fulfilled_count)} stale · oldest {formatNumber(category.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(category.remaining_quantity_total)} units · {formatNumber(category.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No category-level fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by requester</h3>
          {summaryQuery.data?.fulfillment_backlog_by_requester?.length ? summaryQuery.data.fulfillment_backlog_by_requester.slice(0, 4).map((requester) => (
            <div key={requester.requester_user_id || requester.requester_user_name} style={styles.departmentRow}>
              <span>{requester.requester_user_name}<br /><span style={styles.muted}>{formatNumber(requester.partially_fulfilled_count)} partial · {formatNumber(requester.stale_partially_fulfilled_count)} stale · oldest {formatNumber(requester.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(requester.remaining_quantity_total)} units · {formatNumber(requester.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No requester-level fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by department</h3>
          {summaryQuery.data?.fulfillment_backlog_by_department?.length ? summaryQuery.data.fulfillment_backlog_by_department.slice(0, 4).map((department) => (
            <div key={department.requesting_department} style={styles.departmentRow}>
              <span>{department.requesting_department}<br /><span style={styles.muted}>{formatNumber(department.partially_fulfilled_count)} partial · {formatNumber(department.stale_partially_fulfilled_count)} stale · oldest {formatNumber(department.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(department.remaining_quantity_total)} units · {formatNumber(department.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No department-level fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by target department</h3>
          {summaryQuery.data?.fulfillment_backlog_by_target_department?.length ? summaryQuery.data.fulfillment_backlog_by_target_department.slice(0, 4).map((department) => (
            <div key={department.target_department} style={styles.departmentRow}>
              <span>{department.target_department}<br /><span style={styles.muted}>{formatNumber(department.partially_fulfilled_count)} partial · {formatNumber(department.stale_partially_fulfilled_count)} stale · oldest {formatNumber(department.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(department.remaining_quantity_total)} units · {formatNumber(department.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No target-department fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by source location</h3>
          {summaryQuery.data?.fulfillment_backlog_by_source_location?.length ? summaryQuery.data.fulfillment_backlog_by_source_location.slice(0, 4).map((location) => (
            <div key={location.source_storage_location_id || location.source_storage_location_name} style={styles.departmentRow}>
              <span>{location.source_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.partially_fulfilled_count)} partial · {formatNumber(location.stale_partially_fulfilled_count)} stale · oldest {formatNumber(location.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(location.remaining_quantity_total)} units · {formatNumber(location.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No source-location fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Fulfillment backlog by target location</h3>
          {summaryQuery.data?.fulfillment_backlog_by_target_location?.length ? summaryQuery.data.fulfillment_backlog_by_target_location.slice(0, 4).map((location) => (
            <div key={location.target_storage_location_id || location.target_storage_location_name} style={styles.departmentRow}>
              <span>{location.target_storage_location_name}<br /><span style={styles.muted}>{formatNumber(location.partially_fulfilled_count)} partial · {formatNumber(location.stale_partially_fulfilled_count)} stale · oldest {formatNumber(location.oldest_partial_age_days)}d</span></span>
              <strong>{formatNumber(location.remaining_quantity_total)} units · {formatNumber(location.remaining_estimated_value_total)} value</strong>
            </div>
          )) : <p style={styles.muted}>No target-location fulfillment backlog.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Queue aging</h3>
          <div style={styles.compactMetrics}>
            <div><strong>{formatNumber(summaryQuery.data?.age_buckets?.under_24h_count)}</strong><br /><span style={styles.muted}>Under 24h</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.age_buckets?.one_to_three_day_count)}</strong><br /><span style={styles.muted}>1–3 days</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.age_buckets?.three_to_seven_day_count)}</strong><br /><span style={styles.muted}>3–7 days</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.age_buckets?.over_seven_day_count)}</strong><br /><span style={styles.muted}>7+ days</span></div>
          </div>
          <p style={styles.muted}>Average open age: {formatNumber(summaryQuery.data?.age_buckets?.average_open_age_days)} days · Oldest: {formatNumber(summaryQuery.data?.age_buckets?.oldest_open_age_days)} days</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Oldest open requests</h3>
          {summaryQuery.data?.open_queue_oldest?.length ? summaryQuery.data.open_queue_oldest.slice(0, 5).map((request) => (
            <div key={request.id} style={styles.departmentRow}>
              <span>{request.requisition_number}<br /><span style={styles.muted}>{request.status.replace(/_/g, ' ')} · {request.priority} · {request.requesting_department || 'No department'} · needed {formatDate(request.needed_by)}</span></span>
              <strong>{formatNumber(request.open_age_days)}d · {formatNumber(request.remaining_estimated_value_total)}</strong>
            </div>
          )) : <p style={styles.muted}>No open request aging actions.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Value exposure by age bucket</h3>
          {summaryQuery.data?.estimated_value_by_age_bucket?.length ? summaryQuery.data.estimated_value_by_age_bucket.map((bucket) => (
            <div key={bucket.age_bucket} style={styles.departmentRow}>
              <span>{bucket.age_bucket.replace(/_/g, ' ')}<br /><span style={styles.muted}>{formatNumber(bucket.request_count)} open · urgent value {formatNumber(bucket.urgent_remaining_estimated_value_total)}</span></span>
              <strong>{formatNumber(bucket.remaining_estimated_value_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No age-bucket value exposure.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>SLA breach risk</h3>
          <div style={styles.compactMetrics}>
            <div><strong>{formatNumber(summaryQuery.data?.sla_risk?.approval_sla_breach_count)}</strong><br /><span style={styles.muted}>Approval &gt; {formatNumber(summaryQuery.data?.sla_risk?.approval_sla_days || 2)}d</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.sla_risk?.fulfillment_sla_breach_count)}</strong><br /><span style={styles.muted}>Fulfillment &gt; {formatNumber(summaryQuery.data?.sla_risk?.fulfillment_sla_days || 3)}d</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.sla_risk?.due_date_breach_count)}</strong><br /><span style={styles.muted}>Past needed by</span></div>
            <div><strong>{formatNumber(summaryQuery.data?.sla_risk?.urgent_stale_count)}</strong><br /><span style={styles.muted}>Urgent &gt; {formatNumber(summaryQuery.data?.sla_risk?.urgent_stale_hours || 24)}h</span></div>
          </div>
          <p style={styles.muted}>Oldest actionable age: {formatNumber(summaryQuery.data?.sla_risk?.oldest_action_age_days)} days</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Oldest SLA risk actions</h3>
          {summaryQuery.data?.sla_risk_oldest?.length ? summaryQuery.data.sla_risk_oldest.slice(0, 5).map((request) => (
            <div key={request.id} style={styles.departmentRow}>
              <span>{request.requisition_number}<br /><span style={styles.muted}>{request.risk_reason.replace(/_/g, ' ')} · {request.priority} · {request.requesting_department || 'No department'} · needed {formatDate(request.needed_by)}</span></span>
              <strong>{formatNumber(request.action_age_days)}d · {formatNumber(request.remaining_estimated_value_total)}</strong>
            </div>
          )) : <p style={styles.muted}>No breached SLA actions.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>SLA risk by department</h3>
          {summaryQuery.data?.top_sla_risk_departments?.length ? summaryQuery.data.top_sla_risk_departments.slice(0, 4).map((department) => (
            <div key={department.requesting_department} style={styles.departmentRow}>
              <span>{department.requesting_department}<br /><span style={styles.muted}>{formatNumber(department.approval_sla_breach_count)} approval · {formatNumber(department.fulfillment_sla_breach_count)} fulfillment · {formatNumber(department.due_date_breach_count)} due · {formatNumber(department.urgent_stale_count)} urgent</span></span>
              <strong>{formatNumber(department.at_risk_request_count)} at risk</strong>
            </div>
          )) : <p style={styles.muted}>No department-level SLA risk.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>SLA risk by product</h3>
          {summaryQuery.data?.top_sla_risk_products?.length ? summaryQuery.data.top_sla_risk_products.slice(0, 4).map((product) => (
            <div key={product.product_id} style={styles.departmentRow}>
              <span>{product.product_name}<br /><span style={styles.muted}>{formatNumber(product.approval_sla_breach_count)} approval · {formatNumber(product.fulfillment_sla_breach_count)} fulfillment · {formatNumber(product.due_date_breach_count)} due · {formatNumber(product.urgent_stale_count)} urgent</span></span>
              <strong>{formatNumber(product.at_risk_remaining_quantity)} {product.product_unit || 'units'} at risk</strong>
            </div>
          )) : <p style={styles.muted}>No product-level SLA risk.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>SLA risk by requester</h3>
          {summaryQuery.data?.top_sla_risk_requesters?.length ? summaryQuery.data.top_sla_risk_requesters.slice(0, 4).map((requester) => (
            <div key={requester.requester_user_id || requester.requester_user_name} style={styles.departmentRow}>
              <span>{requester.requester_user_name}<br /><span style={styles.muted}>{formatNumber(requester.approval_sla_breach_count)} approval · {formatNumber(requester.fulfillment_sla_breach_count)} fulfillment · {formatNumber(requester.due_date_breach_count)} due · {formatNumber(requester.urgent_stale_count)} urgent</span></span>
              <strong>{formatNumber(requester.at_risk_request_count)} at risk</strong>
            </div>
          )) : <p style={styles.muted}>No requester-level SLA risk.</p>}
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Priority demand</h3>
          {summaryQuery.data?.priority_breakdown?.length ? summaryQuery.data.priority_breakdown.map((priority) => (
            <div key={priority.priority} style={styles.departmentRow}>
              <span><span style={statusStyle(priority.priority)}>{priority.priority}</span><br /><span style={styles.muted}>{formatNumber(priority.request_count)} open · {formatNumber(priority.overdue_count)} overdue · {formatNumber(priority.due_soon_count)} due soon</span></span>
              <strong>{formatNumber(priority.remaining_quantity_total)} remaining</strong>
            </div>
          )) : <p style={styles.muted}>No open priority demand.</p>}
        </div>
      </section>

      <section style={styles.grid}>
        <form id="inventory-requisition-form" style={styles.card} onSubmit={handleSaveDraft}>
          <div style={styles.lineHeader}>
            <h3 style={styles.sectionTitle}>{editingDraftId ? 'Edit draft request' : 'Create request'}</h3>
            {editingDraftId && <button type="button" style={styles.secondaryButton} onClick={cancelDraftEditing}>Cancel edit</button>}
          </div>
          <div style={styles.twoColumns}>
            <label style={styles.field}>
              Requesting department
              <input
                style={styles.input}
                value={form.requesting_department}
                onChange={(event) => setForm((current) => ({ ...current, requesting_department: event.target.value }))}
                required
              />
            </label>
            <label style={styles.field}>
              Target department
              <input
                style={styles.input}
                value={form.target_department}
                onChange={(event) => setForm((current) => ({ ...current, target_department: event.target.value }))}
              />
            </label>
            <label style={styles.field}>
              Source location
              <select
                style={styles.input}
                value={form.source_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, source_storage_location_id: event.target.value }))}
              >
                <option value="">Use during fulfillment</option>
                {locationsQuery.data?.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              Target location
              <select
                style={styles.input}
                value={form.target_storage_location_id}
                onChange={(event) => setForm((current) => ({ ...current, target_storage_location_id: event.target.value }))}
              >
                <option value="">No target location</option>
                {locationsQuery.data?.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              Priority
              <select
                style={styles.input}
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as RequisitionFormState['priority'] }))}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label style={styles.field}>
              Needed by
              <input
                style={styles.input}
                type="date"
                value={form.needed_by}
                onChange={(event) => setForm((current) => ({ ...current, needed_by: event.target.value }))}
              />
            </label>
          </div>
          <label style={styles.field}>
            Notes
            <textarea
              style={styles.textarea}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>

          <div style={styles.lineHeader}>
            <h4 style={styles.subsectionTitle}>Items</h4>
            <button type="button" style={styles.secondaryButton} onClick={addFormLine}>Add line</button>
          </div>
          {form.items.map((item, index) => (
            <div key={index} style={styles.lineGrid}>
              <select
                style={styles.input}
                value={item.product_id}
                onChange={(event) => updateFormLine(index, 'product_id', event.target.value)}
                required
              >
                <option value="">Select product</option>
                {productsQuery.data?.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>
                ))}
              </select>
              <input
                style={styles.input}
                type="number"
                min="0"
                step="0.0001"
                placeholder="Qty"
                value={item.requested_quantity}
                onChange={(event) => updateFormLine(index, 'requested_quantity', event.target.value)}
                required
              />
              <input
                style={styles.input}
                placeholder="Line notes"
                value={item.notes}
                onChange={(event) => updateFormLine(index, 'notes', event.target.value)}
              />
              <button type="button" style={styles.dangerButton} onClick={() => removeFormLine(index)}>Remove</button>
            </div>
          ))}
          {draftSaveThresholdGoverned && !editedDraftNotesMeetThresholdDepth && (
            <p style={styles.warningBox}>Draft notes of at least {draftSaveThresholdNoteMinLength} characters are required to save this {approvalThresholdLabel(draftSaveThresholdLevel)} request ({approvalThresholdReasonLabel(draftSaveThresholdReason)} · {editedDraftNotesLength}/{draftSaveThresholdNoteMinLength}).</p>
          )}
          {draftSaveThresholdGoverned && !editedDraftLineNotesMeetThresholdDepth && (
            <p style={styles.warningBox}>Each draft request line needs notes of at least {draftSaveThresholdNoteMinLength} characters to save this {approvalThresholdLabel(draftSaveThresholdLevel)} request ({editedDraftLineNotesBelowMinimumCount} line{editedDraftLineNotesBelowMinimumCount === 1 ? '' : 's'} below minimum).</p>
          )}
          <button style={styles.primaryButton} type="submit" disabled={saveDraftMutation.isPending || !canSaveDraft}>
            {saveDraftMutation.isPending ? 'Saving…' : editingDraftId ? 'Save draft changes' : 'Create draft requisition'}
          </button>
        </form>

        <section style={styles.card}>
          <div style={styles.lineHeader}>
            <h3 style={styles.sectionTitle}>Request queue</h3>
            <div style={styles.filterGroup}>
              <input
                style={styles.smallInput}
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search number or notes"
              />
              <input
                style={styles.smallInput}
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                placeholder="Requesting department"
              />
              <input
                style={styles.smallInput}
                value={targetDepartmentFilter}
                onChange={(event) => setTargetDepartmentFilter(event.target.value)}
                placeholder="Target department"
              />
              <select style={styles.smallSelect} value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="partially_fulfilled">Partially fulfilled</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select style={styles.smallSelect} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="">All priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <select style={styles.smallSelect} value={dueState} onChange={(event) => setDueState(event.target.value)}>
                <option value="">All due states</option>
                <option value="open">Open only</option>
                <option value="overdue">Overdue</option>
                <option value="due_soon">Due soon</option>
              </select>
              <select style={styles.smallSelect} value={fulfillmentState} onChange={(event) => setFulfillmentState(event.target.value)}>
                <option value="">All fulfillment</option>
                <option value="unfulfilled">Unfulfilled</option>
                <option value="partially_fulfilled">Partially fulfilled</option>
                <option value="stale_partial">Stale partials</option>
                <option value="complete">Complete</option>
              </select>
              <select style={styles.smallSelect} value={slaState} onChange={(event) => setSlaState(event.target.value)}>
                <option value="">All SLA states</option>
                <option value="approval_breached">Approval SLA breached</option>
                <option value="fulfillment_breached">Fulfillment SLA breached</option>
                <option value="due_breached">Past needed-by date</option>
                <option value="urgent_stale">Urgent stale</option>
              </select>
              <select style={styles.smallSelect} value={ageBucket} onChange={(event) => setAgeBucket(event.target.value)}>
                <option value="">All age buckets</option>
                <option value="under_24h">Open under 24h</option>
                <option value="one_to_three_days">Open 1-3 days</option>
                <option value="three_to_seven_days">Open 3-7 days</option>
                <option value="over_seven_days">Open over 7 days</option>
              </select>
              <select style={styles.smallSelect} value={approvalThresholdLevel} onChange={(event) => setApprovalThresholdLevel(event.target.value)}>
                <option value="">All approval thresholds</option>
                <option value="standard">Standard approvals</option>
                <option value="elevated">Elevated approvals</option>
                <option value="executive_value">Executive value approvals</option>
              </select>
              <select style={styles.smallSelect} value={approvalThresholdReason} onChange={(event) => setApprovalThresholdReason(event.target.value)}>
                <option value="">All threshold reasons</option>
                <option value="standard">Standard approval</option>
                <option value="high_priority">High priority threshold</option>
                <option value="high_value">High value threshold</option>
                <option value="executive_value">Executive value threshold</option>
              </select>
              <select style={styles.smallSelect} value={approvalThresholdWatch} onChange={(event) => setApprovalThresholdWatch(event.target.value)}>
                <option value="">All threshold watchlist</option>
                <option value="near_high_value">Near high-value threshold</option>
                <option value="near_executive_value">Near executive threshold</option>
                <option value="any_near_threshold">Any near-threshold</option>
              </select>
              <select style={styles.smallSelect} value={approvalThresholdNextLevel} onChange={(event) => setApprovalThresholdNextLevel(event.target.value)}>
                <option value="">All next thresholds</option>
                <option value="high_value">Next: high value</option>
                <option value="executive_value">Next: executive value</option>
                <option value="none">No next threshold</option>
              </select>
              <select style={styles.smallSelect} value={approvalThresholdNoteDepthState} onChange={(event) => setApprovalThresholdNoteDepthState(event.target.value)}>
                <option value="">All note-depth states</option>
                <option value="complete">Threshold notes complete</option>
                <option value="incomplete">Threshold notes incomplete</option>
              </select>
              <input
                style={styles.smallInput}
                type="number"
                min="0"
                step="0.01"
                value={minApprovalThresholdGapFilter}
                onChange={(event) => setMinApprovalThresholdGapFilter(event.target.value)}
                placeholder="Min threshold gap"
              />
              <input
                style={styles.smallInput}
                type="number"
                min="0"
                step="0.01"
                value={maxApprovalThresholdGapFilter}
                onChange={(event) => setMaxApprovalThresholdGapFilter(event.target.value)}
                placeholder="Max threshold gap"
              />
              <input
                style={styles.smallInput}
                type="number"
                min="0"
                step="0.01"
                value={minRemainingValueFilter}
                onChange={(event) => setMinRemainingValueFilter(event.target.value)}
                placeholder="Min remaining value"
              />
              <input
                style={styles.smallInput}
                type="number"
                min="0"
                step="0.01"
                value={maxRemainingValueFilter}
                onChange={(event) => setMaxRemainingValueFilter(event.target.value)}
                placeholder="Max remaining value"
              />
              <input
                style={styles.smallInput}
                type="number"
                min="0"
                step="0.01"
                value={minRemainingQuantityFilter}
                onChange={(event) => setMinRemainingQuantityFilter(event.target.value)}
                placeholder="Min remaining qty"
              />
              <input
                style={styles.smallInput}
                type="number"
                min="0"
                step="0.01"
                value={maxRemainingQuantityFilter}
                onChange={(event) => setMaxRemainingQuantityFilter(event.target.value)}
                placeholder="Max remaining qty"
              />
              <select style={styles.smallSelect} value={sourceLocationFilter} onChange={(event) => setSourceLocationFilter(event.target.value)}>
                <option value="">All source locations</option>
                {locationsQuery.data?.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <select style={styles.smallSelect} value={targetLocationFilter} onChange={(event) => setTargetLocationFilter(event.target.value)}>
                <option value="">All target locations</option>
                {locationsQuery.data?.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
              <select style={styles.smallSelect} value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}>
                <option value="">All requesters</option>
                {summaryQuery.data?.top_requesters?.filter((requester) => requester.requester_user_id).map((requester) => (
                  <option key={requester.requester_user_id} value={requester.requester_user_id || ''}>{requester.requester_user_name}</option>
                ))}
              </select>
              <input
                style={styles.smallInput}
                type="date"
                value={neededByFromFilter}
                onChange={(event) => setNeededByFromFilter(event.target.value)}
                aria-label="Needed by from"
                title="Needed by from"
              />
              <input
                style={styles.smallInput}
                type="date"
                value={neededByToFilter}
                onChange={(event) => setNeededByToFilter(event.target.value)}
                aria-label="Needed by to"
                title="Needed by to"
              />
              <input
                style={styles.smallInput}
                type="date"
                value={createdFromFilter}
                onChange={(event) => setCreatedFromFilter(event.target.value)}
                aria-label="Created from"
                title="Created from"
              />
              <input
                style={styles.smallInput}
                type="date"
                value={createdToFilter}
                onChange={(event) => setCreatedToFilter(event.target.value)}
                aria-label="Created to"
                title="Created to"
              />
              <select style={styles.smallSelect} value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                <option value="">All products</option>
                {productsQuery.data?.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
              <select style={styles.smallSelect} value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}>
                <option value="">All product categories</option>
                {productCategoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => exportQueueMutation.mutate()}
                disabled={exportQueueMutation.isPending}
              >
                {exportQueueMutation.isPending ? 'Exporting…' : 'Export queue CSV'}
              </button>
              {(status || dueState || fulfillmentState || slaState || ageBucket || approvalThresholdLevel || approvalThresholdReason || approvalThresholdWatch || approvalThresholdNextLevel || approvalThresholdNoteDepthState || minApprovalThresholdGapFilter || maxApprovalThresholdGapFilter || minRemainingValueFilter || maxRemainingValueFilter || minRemainingQuantityFilter || maxRemainingQuantityFilter || priorityFilter || departmentFilter || targetDepartmentFilter || sourceLocationFilter || targetLocationFilter || requesterFilter || neededByFromFilter || neededByToFilter || createdFromFilter || createdToFilter || productFilter || productCategoryFilter || queueSearch) && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    setStatus('');
                    setDueState('');
                    setFulfillmentState('');
                    setSlaState('');
                    setAgeBucket('');
                    setApprovalThresholdLevel('');
                    setApprovalThresholdReason('');
                    setApprovalThresholdWatch('');
                    setApprovalThresholdNextLevel('');
                    setApprovalThresholdNoteDepthState('');
                    setMinApprovalThresholdGapFilter('');
                    setMaxApprovalThresholdGapFilter('');
                    setMinRemainingValueFilter('');
                    setMaxRemainingValueFilter('');
                    setMinRemainingQuantityFilter('');
                    setMaxRemainingQuantityFilter('');
                    setPriorityFilter('');
                    setDepartmentFilter('');
                    setTargetDepartmentFilter('');
                    setSourceLocationFilter('');
                    setTargetLocationFilter('');
                    setRequesterFilter('');
                    setNeededByFromFilter('');
                    setNeededByToFilter('');
                    setCreatedFromFilter('');
                    setCreatedToFilter('');
                    setProductFilter('');
                    setProductCategoryFilter('');
                    setQueueSearch('');
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
          {capabilities.canFulfillInventoryRequisitions && (
            <div style={styles.workflowPanel}>
              <div style={styles.lineHeader}>
                <h4 style={styles.sectionTitle}>Bulk fulfill selected requests</h4>
                <span style={styles.muted}>{formatNumber(bulkFulfillmentIds.filter((id) => visibleBulkFulfillmentIds.has(id)).length)} selected</span>
              </div>
              <div style={styles.filterRow}>
                <select
                  style={styles.smallSelect}
                  value={bulkFulfillmentLocationId}
                  onChange={(event) => setBulkFulfillmentLocationId(event.target.value)}
                >
                  <option value="">Use each request source location</option>
                  {locationsQuery.data?.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
                <input
                  style={styles.searchInput}
                  value={bulkFulfillmentNote}
                  onChange={(event) => setBulkFulfillmentNote(event.target.value)}
                  placeholder={bulkThresholdGoverned ? `Default note, ${bulkApprovalThresholdNoteMinLength}+ chars for threshold requests` : 'Default fulfillment note for all remaining lines'}
                />
                <button
                  type="button"
                  style={styles.primaryButton}
                  disabled={!canBulkFulfill || bulkFulfillmentMutation.isPending}
                  onClick={() => bulkFulfillmentMutation.mutate()}
                >
                  {bulkFulfillmentMutation.isPending ? 'Bulk fulfilling…' : 'Fulfill all remaining'}
                </button>
                {bulkFulfillmentIds.length > 0 && (
                  <button type="button" style={styles.secondaryButton} onClick={clearBulkFulfillmentSelection}>Clear bulk selection</button>
                )}
              </div>
              {bulkIneligibleCount > 0 && <p style={styles.warningBox}>{formatNumber(bulkIneligibleCount)} selected request(s) are not approved or partially fulfilled.</p>}
              {bulkThresholdGoverned && !bulkFulfillmentNoteMeetsThreshold && (
                <p style={styles.warningBox}>Bulk threshold fulfillment requires a default note of at least {bulkApprovalThresholdNoteMinLength} characters ({bulkFulfillmentNoteLength}/{bulkApprovalThresholdNoteMinLength}).</p>
              )}
              {bulkEligibleRequisitions.length > 0 && (
                <div style={bulkReadinessBlocksFulfillment ? styles.errorBox : styles.readinessPanel}>
                  <div style={styles.lineHeader}>
                    <strong>Bulk readiness preview</strong>
                    <span style={styles.inlineActions}>
                      {bulkReadinessQuery.isFetching && <span style={styles.muted}>Checking selected requests…</span>}
                      {bulkReadinessQuery.data?.results?.length ? (
                        <button type="button" style={styles.secondaryButtonSmall} onClick={exportBulkReadinessResults}>Export readiness CSV</button>
                      ) : null}
                    </span>
                  </div>
                  {bulkReadinessQuery.data ? (
                    <>
                      <p style={styles.muted}>
                        {formatNumber(bulkReadinessQuery.data.ready_requisition_count)} ready · {formatNumber(bulkReadinessQuery.data.blocked_requisition_count)} blocked · {formatNumber(bulkReadinessQuery.data.warning_count)} warning(s)
                      </p>
                      {bulkReadinessQuery.data.approval_threshold_governed_requisition_count !== undefined && (
                        <p style={styles.muted}>
                          {formatNumber(bulkReadinessQuery.data.approval_threshold_governed_requisition_count)} threshold-governed · {formatNumber(bulkReadinessQuery.data.threshold_fulfillment_line_note_below_minimum_count)} fulfillment line note(s) below minimum
                        </p>
                      )}
                      {bulkReadinessQuery.data.blocked_requisition_numbers?.length ? (
                        <p style={styles.warningText}>Blocked: {bulkReadinessQuery.data.blocked_requisition_numbers.join(', ')}</p>
                      ) : null}
                      {Object.entries(bulkReadinessQuery.data.blocker_code_counts || {}).length > 0 && (
                        <p style={styles.warningText}>Blockers: {Object.entries(bulkReadinessQuery.data.blocker_code_counts || {}).map(([code, count]) => `${code} (${formatNumber(count)})`).join(', ')}</p>
                      )}
                      {bulkReadinessQuery.data.results?.length ? (
                        <div style={styles.bulkReadinessResultList}>
                          {bulkReadinessQuery.data.results.slice(0, 8).map((result, index) => (
                            <div key={result.requisition_id || result.requisition_number || index} style={result.ready ? styles.bulkReadinessResultReady : styles.bulkReadinessResultBlocked}>
                              <strong>{result.requisition_number || result.requisition_id || `Selected request ${index + 1}`}</strong>
                              <span>{result.ready ? 'Ready' : 'Blocked'} · {formatNumber(result.lines?.filter((line) => line.ready).length || 0)} ready line(s) · {formatNumber(result.lines?.length || 0)} total line(s)</span>
                              {result.approval_threshold_notes_required && (
                                <span>Threshold-governed · line note minimum {formatNumber(result.threshold_fulfillment_line_note_min_length)} · below minimum {formatNumber(result.threshold_fulfillment_line_note_below_minimum_count)}</span>
                              )}
                              {result.blockers?.length ? (
                                <span style={styles.warningText}>Blockers: {result.blockers.slice(0, 3).map((blocker) => blocker.code).join(', ')}</span>
                              ) : null}
                              {result.warnings?.length ? (
                                <span style={styles.muted}>Warnings: {result.warnings.slice(0, 3).map((warning) => warning.code).join(', ')}</span>
                              ) : null}
                            </div>
                          ))}
                          {bulkReadinessQuery.data.results.length > 8 && (
                            <span style={styles.muted}>+{formatNumber(bulkReadinessQuery.data.results.length - 8)} more readiness result(s)</span>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p style={styles.muted}>Select eligible requests to preview stock and threshold blockers before bulk fulfillment.</p>
                  )}
                </div>
              )}
              {bulkEligibleRequisitions.length > 0 && (
                <p style={styles.muted}>Bulk fulfillment records all remaining quantities for {formatNumber(bulkEligibleRequisitions.length)} eligible request(s) using the audited backend bulk endpoint.</p>
              )}
            </div>
          )}
          {requisitionsQuery.isLoading && <p style={styles.muted}>Loading requisitions…</p>}
          {requisitionsQuery.data?.map((item) => {
            const bulkSelectable = ['approved', 'partially_fulfilled'].includes(String(item.status));
            const bulkSelected = bulkFulfillmentIds.includes(item.id);
            return (
              <div key={item.id} style={styles.queueItemRow}>
                {capabilities.canFulfillInventoryRequisitions && (
                  <label style={bulkSelectable ? styles.bulkSelectLabel : styles.bulkSelectLabelDisabled} title={bulkSelectable ? 'Select for bulk all-remaining fulfillment' : 'Only approved or partially fulfilled requests can be bulk fulfilled'}>
                    <input
                      type="checkbox"
                      checked={bulkSelected}
                      disabled={!bulkSelectable}
                      onChange={() => toggleBulkFulfillmentSelection(item.id)}
                    />
                  </label>
                )}
                <button
                  type="button"
                  style={item.id === selectedId ? styles.selectedListItem : styles.listItem}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span style={styles.listTitle}>{item.requisition_number}</span>
                  <span style={statusStyle(item.status)}>{item.status}</span>
                  <span style={styles.muted}>{item.requesting_department} · {item.priority}</span>
                  {item.sla_state && (
                    <span style={styles.warningText}>
                      {slaStateLabel(item.sla_state)}{slaStateDetail(item) ? ` · ${slaStateDetail(item)}` : ''}
                    </span>
                  )}
                  {item.approval_threshold_level && (
                    <span style={item.approval_threshold_level === 'standard' ? styles.muted : styles.warningText}>
                      {approvalThresholdLabel(item.approval_threshold_level)}{item.approval_threshold_reason ? ` · ${item.approval_threshold_reason}` : ''}{item.approval_threshold_next_level ? ` · ${formatNumber(item.approval_threshold_value_gap)} to ${approvalThresholdLabel(item.approval_threshold_next_level)}` : ''}
                    </span>
                  )}
                  {formatApprovalThresholdQueueNoteDepth(item) && (
                    <span style={item.approval_threshold_note_depth_state === 'complete' ? styles.muted : styles.warningText}>
                      {formatApprovalThresholdQueueNoteDepth(item)}
                    </span>
                  )}
                  <span style={styles.muted}>{formatNumber(item.fulfilled_quantity_total)} / {formatNumber(item.requested_quantity_total)} fulfilled</span>
                  {item.partial_fulfillment_state && (
                    <span style={item.partial_fulfillment_state === 'stale_partial' ? styles.warningText : styles.muted}>
                      Partial fulfillment: {item.partial_fulfillment_state === 'stale_partial' ? 'stale' : 'active'}{item.partial_fulfillment_age_days !== null && item.partial_fulfillment_age_days !== undefined ? ` · ${formatNumber(item.partial_fulfillment_age_days)}d` : ''}
                    </span>
                  )}
                  <span style={styles.muted}>Est. remaining value: {formatNumber(item.remaining_estimated_value_total)}</span>
                </button>
              </div>
            );
          })}
        </section>
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Selected request</h3>
        {!selected && <p style={styles.muted}>Select a requisition to review details and actions.</p>}
        {selected && (
          <div>
            <div style={styles.detailGrid}>
              <div><strong>{selected.requisition_number}</strong><br /><span style={statusStyle(selected.status)}>{selected.status}</span></div>
              <div><strong>Department</strong><br />{selected.requesting_department}</div>
              <div><strong>Priority</strong><br />{selected.priority}</div>
              <div><strong>Needed by</strong><br />{formatDate(selected.needed_by)}</div>
              <div><strong>Source</strong><br />{selected.source_storage_location_name || '-'}</div>
              <div><strong>Target</strong><br />{selected.target_department || selected.target_storage_location_name || '-'}</div>
              <div><strong>Submitted</strong><br />{formatDateTime(selected.submitted_at)}<br /><span style={styles.muted}>{selected.submitted_by_user_name || ''}</span></div>
              <div><strong>Approved</strong><br />{formatDateTime(selected.approved_at)}<br /><span style={styles.muted}>{selected.approved_by_user_name || ''}</span></div>
              <div><strong>Rejected</strong><br />{formatDateTime(selected.rejected_at)}<br /><span style={styles.muted}>{selected.rejected_by_user_name || ''}</span></div>
              <div><strong>Cancelled</strong><br />{formatDateTime(selected.cancelled_at)}<br /><span style={styles.muted}>{selected.cancelled_by_user_name || ''}</span></div>
              <div><strong>Last fulfilled</strong><br />{formatDateTime(selected.last_fulfilled_at)}<br /><span style={styles.muted}>{selected.last_fulfilled_by_user_name || ''}</span></div>
              <div><strong>Partial fulfillment</strong><br />{selected.partial_fulfillment_state ? <span style={selected.partial_fulfillment_state === 'stale_partial' ? styles.warningText : styles.muted}>{selected.partial_fulfillment_state === 'stale_partial' ? 'Stale partial' : 'Active partial'}</span> : '-'}<br /><span style={styles.muted}>{selected.partial_fulfillment_age_days !== null && selected.partial_fulfillment_age_days !== undefined ? `${formatNumber(selected.partial_fulfillment_age_days)} days since last fulfillment/update` : ''}</span></div>
              <div><strong>SLA state</strong><br />{selected.sla_state ? <span style={styles.warningText}>{slaStateLabel(selected.sla_state)}</span> : '-'}<br /><span style={styles.muted}>{slaStateDetail(selected)}</span></div>
              <div><strong>Approval threshold</strong><br />{selected.approval_threshold_level ? <span style={selected.approval_threshold_level === 'standard' ? styles.muted : styles.warningText}>{approvalThresholdLabel(selected.approval_threshold_level)}</span> : '-'}<br /><span style={styles.muted}>{selected.approval_threshold_reason || ''}{selected.approval_threshold_next_level ? ` · ${formatNumber(selected.approval_threshold_value_gap)} to ${approvalThresholdLabel(selected.approval_threshold_next_level)}` : ''}</span></div>
              <div><strong>Estimated value</strong><br />Requested: {formatNumber(selected.requested_estimated_value_total)}<br /><span style={styles.muted}>Remaining: {formatNumber(selected.remaining_estimated_value_total)}</span></div>
              <div><strong>Updated</strong><br />{formatDateTime(selected.updated_at)}</div>
            </div>
            {selected.status === 'draft' && capabilities.canCreateInventoryRequisitions && (
              <div style={styles.actionsRow}>
                <button type="button" style={styles.secondaryButton} onClick={loadSelectedDraftForEditing}>Edit draft details</button>
              </div>
            )}
            {selected.status === 'draft' && approvalThresholdNotesRequired && !draftNotesMeetThresholdDepth && (
              <p style={styles.warningBox}>Draft notes of at least {selectedApprovalThresholdNoteMinLength} characters are required before submitting this {approvalThresholdLabel(selected.approval_threshold_level)} request.</p>
            )}
            {selected.status === 'draft' && approvalThresholdNotesRequired && !selectedDraftLineNotesMeetThresholdDepth && (
              <p style={styles.warningBox}>Each draft request line needs notes of at least {selectedApprovalThresholdNoteMinLength} characters before submitting this {approvalThresholdLabel(selected.approval_threshold_level)} request ({selectedDraftLineNotesBelowMinimumCount} line{selectedDraftLineNotesBelowMinimumCount === 1 ? '' : 's'} below minimum).</p>
            )}
            {approvalThresholdGovernanceRequirements.length > 0 && (
              <div style={styles.warningBox}>
                <strong>Approval threshold action requirements</strong>
                <ul style={styles.compactList}>
                  {approvalThresholdGovernanceRequirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            )}
            {selected.approval_notes && <p style={styles.successBox}>Approval notes: {selected.approval_notes}</p>}
            {selected.rejection_reason && <p style={styles.errorBox}>Rejection reason: {selected.rejection_reason}</p>}
            {selected.cancellation_reason && <p style={styles.warningBox}>Cancellation reason: {selected.cancellation_reason}</p>}
            {selected.notes && <p style={styles.noteBox}>{selected.notes}</p>}

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Requested</th>
                    <th style={styles.th}>Fulfilled</th>
                    <th style={styles.th}>Remaining</th>
                    <th style={styles.th}>Est. remaining value</th>
                    <th style={styles.th}>Request note depth</th>
                    <th style={styles.th}>Fulfill now</th>
                    <th style={styles.th}>Fulfillment note</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items?.map((item) => {
                    const remaining = Math.max(0, Number(item.remaining_quantity ?? Number(item.requested_quantity) - Number(item.fulfilled_quantity)) || 0);
                    const fulfillmentQuantity = Number(fulfillmentLines[item.id] || 0);
                    const fulfillmentNoteLength = fulfillmentLineNotes[item.id]?.trim().length || 0;
                    const fulfillmentNoteDepthRequired = approvalThresholdNotesRequired && fulfillmentQuantity > 0;
                    const fulfillmentNoteMeetsThresholdDepth = !fulfillmentNoteDepthRequired || fulfillmentNoteLength >= selectedApprovalThresholdNoteMinLength;
                    return (
                      <tr key={item.id}>
                        <td style={styles.td}>{item.product_name || item.product_id}<br /><span style={styles.muted}>{item.product_unit || ''}</span></td>
                        <td style={styles.td}>{formatNumber(item.requested_quantity)}</td>
                        <td style={styles.td}>{formatNumber(item.fulfilled_quantity)}</td>
                        <td style={styles.td}>{formatNumber(remaining)}</td>
                        <td style={styles.td}>{formatNumber(item.remaining_estimated_value)}</td>
                        <td style={styles.td}>
                          {item.notes ? <span>{item.notes}</span> : <span style={styles.muted}>No request note</span>}
                          {formatApprovalThresholdLineNoteDepth(item) && (
                            <><br /><span style={item.approval_threshold_line_note_meets_minimum ? styles.muted : styles.warningText}>{formatApprovalThresholdLineNoteDepth(item)}</span></>
                          )}
                        </td>
                        <td style={styles.td}>
                          <input
                            style={styles.input}
                            type="number"
                            min="0"
                            max={remaining || undefined}
                            step="0.0001"
                            disabled={!canFulfill || fulfillAllRemaining || remaining <= 0}
                            value={fulfillmentLines[item.id] || ''}
                            onChange={(event) => setFulfillmentLines((current) => ({ ...current, [item.id]: event.target.value }))}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            style={styles.input}
                            disabled={!canFulfill || fulfillAllRemaining || remaining <= 0}
                            value={fulfillmentLineNotes[item.id] || ''}
                            onChange={(event) => setFulfillmentLineNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                            placeholder={fulfillmentNoteDepthRequired ? `At least ${selectedApprovalThresholdNoteMinLength} characters required` : 'Picker, handoff, or exception note'}
                          />
                          {fulfillmentNoteDepthRequired && (
                            <><br /><span style={fulfillmentNoteMeetsThresholdDepth ? styles.muted : styles.warningText}>Fulfillment note depth: {fulfillmentNoteLength}/{selectedApprovalThresholdNoteMinLength}</span></>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={styles.workflowPanel}>
              <label style={styles.field}>
                Workflow notes / reason
                <input
                  style={styles.input}
                  value={workflowNotes}
                  onChange={(event) => setWorkflowNotes(event.target.value)}
                  placeholder={approvalThresholdNotesRequired ? `At least ${selectedApprovalThresholdNoteMinLength} characters required for threshold approve/reject/cancel/reopen` : 'Required for reject/cancel/reopen'}
                />
              </label>
              {approvalThresholdNotesRequired && (
                <p style={styles.warningBox}>
                  Approval, rejection, cancellation, or reopen notes of at least {selectedApprovalThresholdNoteMinLength} characters are required for this {approvalThresholdLabel(selected?.approval_threshold_level)} request ({approvalThresholdReasonLabel(selected?.approval_threshold_reason)}). Current note depth: {workflowNotesLength}/{selectedApprovalThresholdNoteMinLength}.
                </p>
              )}
              <div style={styles.actionsRow}>
                <button style={styles.secondaryButton} disabled={!canSubmit || workflowMutation.isPending} onClick={() => runWorkflow('submit')}>Submit</button>
                <button style={styles.primaryButton} disabled={!canApprove || workflowMutation.isPending} onClick={() => runWorkflow('approve')}>Approve</button>
                <button style={styles.dangerButton} disabled={!canReject || !workflowNotes.trim() || workflowMutation.isPending} onClick={() => runWorkflow('reject')}>Reject</button>
                <button style={styles.dangerButton} disabled={!canCancel || !workflowNotes.trim() || workflowMutation.isPending} onClick={() => runWorkflow('cancel')}>Cancel</button>
                <button style={styles.secondaryButton} disabled={!canReopen || !workflowNotes.trim() || workflowMutation.isPending} onClick={() => runWorkflow('reopen')}>Reopen to draft</button>
              </div>
            </div>

            <div style={styles.workflowPanel}>
              <label style={styles.field}>
                Fulfillment source location
                <select
                  style={styles.input}
                  value={fulfillmentLocationId || selected.source_storage_location_id || ''}
                  disabled={!canFulfill}
                  onChange={(event) => setFulfillmentLocationId(event.target.value)}
                >
                  <option value="">Select source location</option>
                  {locationsQuery.data?.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={fulfillAllRemaining}
                  disabled={!canFulfill}
                  onChange={(event) => {
                    setFulfillAllRemaining(event.target.checked);
                    if (event.target.checked) {
                      setFulfillmentLines({});
                      setFulfillmentLineNotes({});
                    }
                  }}
                />
                Fulfill all remaining lines for this request
              </label>
              {fulfillAllRemaining && (
                <label style={styles.field}>
                  Default all-remaining fulfillment note
                  <input
                    style={styles.input}
                    value={defaultFulfillmentNote}
                    disabled={!canFulfill}
                    onChange={(event) => setDefaultFulfillmentNote(event.target.value)}
                    placeholder={approvalThresholdNotesRequired ? `At least ${selectedApprovalThresholdNoteMinLength} characters required` : 'Applied to each remaining fulfillment line'}
                  />
                </label>
              )}
              {approvalThresholdNotesRequired && !fulfillmentThresholdLinesMeetNoteDepth && (fulfillAllRemaining || selectedFulfillmentLineCount > 0) && (
                <p style={styles.warningBox}>
                  {fulfillAllRemaining
                    ? `Default fulfillment note must be at least ${selectedApprovalThresholdNoteMinLength} characters for this ${approvalThresholdLabel(selected?.approval_threshold_level)} request (${defaultFulfillmentNoteLength}/${selectedApprovalThresholdNoteMinLength}).`
                    : `Each fulfilled line needs a note of at least ${selectedApprovalThresholdNoteMinLength} characters for this ${approvalThresholdLabel(selected?.approval_threshold_level)} request.`}
                </p>
              )}
              <button
                style={styles.primaryButton}
                disabled={!canFulfill || fulfillMutation.isPending || readinessQuery.data?.ready === false || (!fulfillAllRemaining && selectedFulfillmentLineCount === 0) || !fulfillmentThresholdLinesMeetNoteDepth}
                onClick={() => fulfillMutation.mutate()}
              >
                {fulfillMutation.isPending ? 'Fulfilling…' : 'Record fulfillment'}
              </button>
            </div>

            {canFulfill && (
              <div style={styles.readinessPanel}>
                <div style={styles.lineHeader}>
                  <h4 style={styles.sectionTitle}>Fulfillment readiness</h4>
                  {readinessQuery.isFetching && <span style={styles.muted}>Checking stock…</span>}
                </div>
                {readinessQuery.data?.blockers?.map((blocker) => (
                  <p key={`${blocker.code}-${blocker.product_name || blocker.message}`} style={styles.errorBox}>{blocker.message}</p>
                ))}
                {readinessQuery.data?.warnings?.map((warning) => (
                  <p key={`${warning.code}-${warning.product_name || warning.message}`} style={styles.warningBox}>{warning.message}</p>
                ))}
                {readinessQuery.data?.approval_threshold_notes_required && readinessQuery.data.threshold_fulfillment_line_notes_meet_minimum === false && (
                  <p style={styles.warningBox}>
                    {formatNumber(readinessQuery.data.threshold_fulfillment_line_note_below_minimum_count)} selected fulfillment line note(s) are below the {formatNumber(readinessQuery.data.threshold_fulfillment_line_note_min_length)} character threshold minimum.
                  </p>
                )}
                {readinessQuery.data?.lines?.length ? (
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Product</th>
                          <th style={styles.th}>Remaining</th>
                          <th style={styles.th}>Available</th>
                          <th style={styles.th}>Projected</th>
                          <th style={styles.th}>Readiness</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readinessQuery.data.lines.map((line) => (
                          <tr key={line.requisition_item_id}>
                            <td style={styles.td}>{line.product_name || line.product_id}<br /><span style={styles.muted}>{line.product_unit || ''}</span></td>
                            <td style={styles.td}>{formatNumber(line.remaining_quantity)}</td>
                            <td style={styles.td}>{line.available_quantity === null ? '-' : formatNumber(line.available_quantity)}</td>
                            <td style={styles.td}>{line.projected_quantity === null ? '-' : formatNumber(line.projected_quantity)}</td>
                            <td style={styles.td}>
                              <span style={line.ready ? styles.successBadge : styles.dangerBadge}>{line.ready ? (line.warning_code ? 'Warning' : 'Ready') : line.blocker_code || 'Blocked'}</span>
                              {line.threshold_fulfillment_line_note_meets_minimum === false && (
                                <div style={styles.muted}>Note {formatNumber(line.threshold_fulfillment_line_note_length)}/{formatNumber(line.threshold_fulfillment_line_note_min_length)} chars</div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={styles.muted}>Select a source location to check fulfillment readiness.</p>
                )}
              </div>
            )}

            <div style={styles.activityPanel}>
              <div style={styles.lineHeader}>
                <h4 style={styles.sectionTitle}>Activity timeline</h4>
                {activityQuery.isFetching && <span style={styles.muted}>Refreshing…</span>}
              </div>
              <div style={styles.commentComposer}>
                <input
                  style={styles.input}
                  value={activityComment}
                  onChange={(event) => setActivityComment(event.target.value)}
                  placeholder="Add an internal activity note"
                />
                <button
                  type="button"
                  style={styles.secondaryButton}
                  disabled={
                    !activityComment.trim() ||
                    (isApprovalThresholdGoverned(selected) && activityComment.trim().length < selectedApprovalThresholdNoteMinLength) ||
                    commentMutation.isPending
                  }
                  onClick={() => commentMutation.mutate()}
                >
                  {commentMutation.isPending ? 'Adding…' : 'Add note'}
                </button>
              </div>
              {isApprovalThresholdGoverned(selected) && (
                <p style={styles.muted}>Approval-threshold requisitions require activity notes of at least {selectedApprovalThresholdNoteMinLength} characters.</p>
              )}
              {activityQuery.data?.length ? (
                <div style={styles.timelineList}>
                  {activityQuery.data.map((entry) => (
                    <div key={entry.id} style={styles.timelineItem}>
                      <strong style={styles.timelineTitle}>{activityLabel(entry.action)}</strong>
                      <span style={styles.muted}>{formatDateTime(entry.created_at)} · {entry.user_name || 'System'}</span>
                      {metadataText(entry.metadata) && <span style={styles.muted}>{metadataText(entry.metadata)}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.muted}>No audit activity recorded yet.</p>
              )}
            </div>

            <div style={styles.workflowPanel}>
              <div style={styles.lineHeader}>
                <h4 style={styles.sectionTitle}>Fulfillment history</h4>
                {fulfillmentHistoryQuery.isFetching && <span style={styles.muted}>Refreshing…</span>}
              </div>
              {fulfillmentHistoryQuery.data?.length ? (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>When</th>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Qty</th>
                        <th style={styles.th}>Source</th>
                        <th style={styles.th}>Notes</th>
                        <th style={styles.th}>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fulfillmentHistoryQuery.data.map((line) => (
                        <tr key={line.id}>
                          <td style={styles.td}>{formatDateTime(line.fulfilled_at)}</td>
                          <td style={styles.td}>{line.product_name || line.product_id}<br /><span style={styles.muted}>{line.product_unit || ''}</span></td>
                          <td style={styles.td}>{formatNumber(line.quantity)}</td>
                          <td style={styles.td}>{line.source_storage_location_name || '-'}</td>
                          <td style={styles.td}>{line.notes || '-'}</td>
                          <td style={styles.td}>{line.fulfilled_by_user_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={styles.muted}>No fulfillment records yet.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 24 },
  headerGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px 220px', gap: 16 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, alignItems: 'stretch' },
  compactMetrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  departmentRow: { display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #e5e7eb', padding: '10px 0', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(340px, 0.8fr)', gap: 16, alignItems: 'start' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' },
  metricCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 },
  metricLabel: { color: '#64748b', fontSize: 13 },
  metricValue: { fontSize: 24 },
  kicker: { margin: 0, color: '#2563eb', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { margin: '4px 0 8px', fontSize: 24 },
  sectionTitle: { margin: '0 0 14px', fontSize: 18 },
  subsectionTitle: { margin: 0, fontSize: 15 },
  muted: { color: '#64748b', fontSize: 13 },
  twoColumns: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155' },
  checkboxLabel: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#334155' },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', minWidth: 0 },
  textarea: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', font: 'inherit', minHeight: 76, resize: 'vertical' },
  smallSelect: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', font: 'inherit' },
  smallInput: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', font: 'inherit', minWidth: 150 },
  filterGroup: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  lineHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '16px 0 10px' },
  lineGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 110px minmax(0, 1fr) auto', gap: 8, marginBottom: 8 },
  primaryButton: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#0f172a', fontWeight: 700, cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', background: '#fff1f2', color: '#be123c', fontWeight: 700, cursor: 'pointer' },
  queueItemRow: { display: 'grid', gridTemplateColumns: '32px 1fr', gap: 8, alignItems: 'stretch', marginBottom: 8 },
  bulkResultList: { marginTop: 10, display: 'grid', gap: 8 },
  bulkResultRow: { border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, padding: 8, display: 'grid', gap: 3 },
  bulkReadinessResultList: { marginTop: 10, display: 'grid', gap: 8 },
  bulkReadinessResultReady: { border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, padding: 8, display: 'grid', gap: 3 },
  bulkReadinessResultBlocked: { border: '1px solid #fecaca', background: '#fff1f2', borderRadius: 10, padding: 8, display: 'grid', gap: 3 },
  bulkSelectLabel: { border: '1px solid #e5e7eb', background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  bulkSelectLabelDisabled: { border: '1px solid #e5e7eb', background: '#f8fafc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed', opacity: 0.6 },
  listItem: { width: '100%', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, textAlign: 'left', marginBottom: 0, cursor: 'pointer' },
  selectedListItem: { width: '100%', border: '1px solid #93c5fd', background: '#eff6ff', borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, textAlign: 'left', marginBottom: 0, cursor: 'pointer' },
  listTitle: { fontWeight: 800 },
  neutralBadge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', background: '#f1f5f9', color: '#334155', fontSize: 12, fontWeight: 700 },
  warningBadge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700 },
  activeBadge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 700 },
  successBadge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 700 },
  dangerBadge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', background: '#ffe4e6', color: '#be123c', fontSize: 12, fontWeight: 700 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
  noteBox: { borderLeft: '4px solid #bfdbfe', background: '#eff6ff', padding: 12, borderRadius: 10 },
  successBox: { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 12, padding: 12 },
  tableWrapper: { overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#475569', background: '#f8fafc' },
  td: { padding: 10, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  workflowPanel: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'end', marginTop: 16 },
  actionsRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  readinessPanel: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 },
  activityPanel: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 },
  commentComposer: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8 },
  timelineList: { display: 'flex', flexDirection: 'column', gap: 10 },
  timelineItem: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  timelineTitle: { textTransform: 'capitalize' },
  compactList: { margin: '8px 0 0', paddingLeft: 18 },
  warningBox: { border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', borderRadius: 12, padding: 12 },
  errorBox: { border: '1px solid #fecaca', background: '#fff1f2', color: '#be123c', borderRadius: 12, padding: 12 }
};
