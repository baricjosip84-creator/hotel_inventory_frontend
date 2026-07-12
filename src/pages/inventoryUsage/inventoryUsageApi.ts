import { apiMutationRequest, apiRequest } from '../../lib/api';
import { buildUsageQuery } from './inventoryUsageFormatting';
import type { InventoryUsageAlertScanResponse, InventoryUsageAttachmentDraft, InventoryUsageAttachmentResponse, InventoryUsageBarcodeRequest, InventoryUsageBarcodePreviewResponse, InventoryUsageBarcodeResponse, InventoryUsageBulkRequest, InventoryUsageBulkReadinessResponse, InventoryUsageBulkResponse, InventoryUsageAnomalies, InventoryUsageScheduledTemplates, InventoryUsageTemplate, InventoryUsageTemplateDraft, InventoryUsageTemplateResponse, InventoryUsageTemplateArchiveResponse, InventoryUsageTemplateConsumeResponse, InventoryUsageTemplateReadiness, InventoryUsageScheduledTemplateRunDueResponse, InventoryUsageExceptions, InventoryUsageImpact, InventoryUsageLog, InventoryUsageLogDetail, InventoryUsagePeriodClosure, InventoryUsagePeriodClosureDraft, InventoryUsagePeriodClosurePreviewResponse, InventoryUsagePeriodClosureResponse, InventoryUsageReviewResponse, InventoryUsageReversalResponse, InventoryUsageSummary, InventoryUsageStorageLocationOption, UsageFilters } from './inventoryUsageTypes';

export async function fetchInventoryUsageLogs(filters: UsageFilters): Promise<InventoryUsageLog[]> {
  return apiRequest<InventoryUsageLog[]>(`/stock/usage${buildUsageQuery(filters, 100)}`);
}

export async function fetchInventoryUsageStorageLocations(): Promise<InventoryUsageStorageLocationOption[]> {
  return apiRequest<InventoryUsageStorageLocationOption[]>('/storage-locations');
}


export async function fetchInventoryUsageLogDetail(usageLogId: string): Promise<InventoryUsageLogDetail> {
  return apiRequest<InventoryUsageLogDetail>(`/stock/usage/${usageLogId}`);
}

export async function fetchInventoryUsageSummary(filters: UsageFilters): Promise<InventoryUsageSummary> {
  return apiRequest<InventoryUsageSummary>(`/stock/usage/summary${buildUsageQuery(filters)}`);
}

export async function fetchInventoryUsageExceptions(filters: UsageFilters): Promise<InventoryUsageExceptions> {
  return apiRequest<InventoryUsageExceptions>(`/stock/usage/exceptions${buildUsageQuery(filters, 25)}`);
}


export async function fetchInventoryUsageImpact(filters: UsageFilters): Promise<InventoryUsageImpact> {
  return apiRequest<InventoryUsageImpact>(`/stock/usage/impact${buildUsageQuery(filters, 25)}`);
}

export async function fetchInventoryUsageAnomalies(filters: UsageFilters): Promise<InventoryUsageAnomalies> {
  return apiRequest<InventoryUsageAnomalies>(`/stock/usage/anomalies${buildUsageQuery(filters, 25)}`);
}



export async function scanInventoryUsageAlerts(payload: { lookback_days?: number; dry_run?: boolean } = {}): Promise<InventoryUsageAlertScanResponse> {
  return apiMutationRequest<InventoryUsageAlertScanResponse>('/stock/usage/alerts/scan', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function reverseInventoryUsageLog(
  usageLogId: string,
  reversalReason: string
): Promise<InventoryUsageReversalResponse> {
  return apiMutationRequest<InventoryUsageReversalResponse>(`/stock/usage/${usageLogId}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reversal_reason: reversalReason })
  });
}


export async function reviewInventoryUsageLog(
  usageLogId: string,
  payload: { review_status: 'reviewed' | 'follow_up_required'; review_notes?: string }
): Promise<InventoryUsageReviewResponse> {
  return apiMutationRequest<InventoryUsageReviewResponse>(`/stock/usage/${usageLogId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}



export async function previewInventoryUsageByBarcode(payload: InventoryUsageBarcodeRequest): Promise<InventoryUsageBarcodePreviewResponse> {
  return apiMutationRequest<InventoryUsageBarcodePreviewResponse>('/stock/consume/barcode/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipMutationFeedback: true
  });
}

export async function recordInventoryUsageByBarcode(payload: InventoryUsageBarcodeRequest): Promise<InventoryUsageBarcodeResponse> {
  return apiMutationRequest<InventoryUsageBarcodeResponse>('/stock/consume/barcode', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipMutationFeedback: true
  });
}


export async function previewInventoryUsageBulk(payload: InventoryUsageBulkRequest): Promise<InventoryUsageBulkReadinessResponse> {
  return apiMutationRequest<InventoryUsageBulkReadinessResponse>('/stock/consume/bulk/readiness', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function recordInventoryUsageBulk(payload: InventoryUsageBulkRequest): Promise<InventoryUsageBulkResponse> {
  return apiMutationRequest<InventoryUsageBulkResponse>('/stock/consume/bulk', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}


export async function createInventoryUsageAttachment(payload: InventoryUsageAttachmentDraft): Promise<InventoryUsageAttachmentResponse> {
  return apiMutationRequest<InventoryUsageAttachmentResponse>('/enterprise-inventory/attachments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchInventoryUsageTemplates(): Promise<InventoryUsageTemplate[]> {
  return apiRequest<InventoryUsageTemplate[]>('/stock/usage/templates?limit=100');
}

export async function fetchInventoryUsageScheduledTemplates(): Promise<InventoryUsageScheduledTemplates> {
  return apiRequest<InventoryUsageScheduledTemplates>('/stock/usage/templates/scheduled?limit=100');
}


export async function runDueInventoryUsageTemplates(payload: { dry_run?: boolean; limit?: number; notes?: string; missing_evidence_acknowledged?: boolean } = {}): Promise<InventoryUsageScheduledTemplateRunDueResponse> {
  return apiMutationRequest<InventoryUsageScheduledTemplateRunDueResponse>('/stock/usage/templates/scheduled/run-due', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchInventoryUsageTemplateReadiness(templateId: string): Promise<InventoryUsageTemplateReadiness> {
  return apiRequest<InventoryUsageTemplateReadiness>(`/stock/usage/templates/${templateId}/readiness`);
}

export async function createInventoryUsageTemplate(payload: InventoryUsageTemplateDraft): Promise<InventoryUsageTemplateResponse> {
  return apiMutationRequest<InventoryUsageTemplateResponse>('/stock/usage/templates', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}


export async function archiveInventoryUsageTemplate(templateId: string, reason?: string): Promise<InventoryUsageTemplateArchiveResponse> {
  return apiMutationRequest<InventoryUsageTemplateArchiveResponse>(`/stock/usage/templates/${templateId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason })
  });
}


export async function consumeInventoryUsageTemplate(
  templateId: string,
  payload: { consumption_reason?: string; department?: string; event_name?: string; notes?: string; consumed_at?: string; missing_evidence_acknowledged?: boolean } = {}
): Promise<InventoryUsageTemplateConsumeResponse> {
  return apiMutationRequest<InventoryUsageTemplateConsumeResponse>(`/stock/usage/templates/${templateId}/consume`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchInventoryUsagePeriodClosures(): Promise<InventoryUsagePeriodClosure[]> {
  return apiRequest<InventoryUsagePeriodClosure[]>('/stock/usage/period-closures?limit=100');
}


export async function previewInventoryUsagePeriodClosure(payload: InventoryUsagePeriodClosureDraft): Promise<InventoryUsagePeriodClosurePreviewResponse> {
  return apiMutationRequest<InventoryUsagePeriodClosurePreviewResponse>('/stock/usage/period-closures/preview', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function closeInventoryUsagePeriod(payload: InventoryUsagePeriodClosureDraft): Promise<InventoryUsagePeriodClosureResponse> {
  return apiMutationRequest<InventoryUsagePeriodClosureResponse>('/stock/usage/period-closures', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
