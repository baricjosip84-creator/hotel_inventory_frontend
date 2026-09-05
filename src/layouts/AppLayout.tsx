import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import type { CSSProperties, MouseEvent } from 'react';
import {
  clearSupportSessionAccessToken,
  getSupportSessionInfo
} from '../lib/auth';
import { apiRequest, logoutTenantSession } from '../lib/api';
import { TENANT_MUTATION_FEEDBACK_EVENT } from '../lib/actionFeedback';
import { refreshTenantPermissionSnapshot } from '../lib/permissionPolicies';
import { fetchCurrentSupportContext, type CurrentSupportContext } from '../lib/supportContext';
import { fetchMaintenanceContext, type MaintenanceContext } from '../lib/maintenanceContext';
import { fetchAnnouncementContext, type AnnouncementContext } from '../lib/announcementContext';
import { fetchIncidentContext, type IncidentContext } from '../lib/incidentContext';
import { fetchTenantSubscriptionAccess, getTenantFeatureEntitlement, type TenantSubscriptionAccess } from '../lib/tenantSubscriptionAccess';
import { getCurrentAccessRoleLabel, getCurrentUserRole, hasAllPermissions, hasAnyPermission, hasPermission, TENANT_PERMISSIONS, TENANT_PERMISSION_SNAPSHOT_EVENT } from '../lib/permissions';
import { getTenantAccessSnapshot } from '../lib/tenantAccess';
import { getTenantModuleForPathname, getTenantPageMeta, tenantNavigationSections } from '../app/navigationRegistry';
import type { TenantNavigationItem } from '../app/navigationRegistry';
import CopyrightNotice from '../components/CopyrightNotice';
import { InventoryBrand } from '../components/brand/InventoryBrand';
import { LanguageSelector } from '../components/i18n/LanguageSelector';
import { useAppTranslation } from '../i18n/I18nContext';
import { normalizeAppLocale } from '../i18n/config';
import { formatLocalizedDateTime } from '../i18n/formatters';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { fetchTenantCurrencyContext, setActiveTenantCurrency, DEFAULT_INVENTORY_CURRENCY } from '../lib/tenantCurrency';

type NavAlertAttentionSummary = {
  requires_attention: boolean;
  actionable_count: number | string;
  unresolved_count: number | string;
  unresolved_blocking_count: number | string;
  attention_scope: 'none' | 'all_unresolved' | 'blocking_only';
};

type NavExecutionRequestAttentionSummary = {
  requires_attention: boolean;
  actionable_count: number | string;
  pending_review_count: number | string;
  approved_waiting_execution_count: number | string;
  retry_ready_count: number | string;
};

type NavIntelligenceReviewAttentionSummary = {
  requires_attention: boolean;
  actionable_count: number | string;
  overdue_count: number | string;
};

type NavLearningFeedbackAttentionSummary = {
  requires_attention: boolean;
  actionable_count: number | string;
  forecast_review_count: number | string;
};

type NavProcurementRecommendationAttentionSummary = {
  requires_attention: boolean;
  actionable_count: number | string;
  high_risk_pending_decision_count: number | string;
  approved_ready_po_draft_count: number | string;
  approved_recheck_count: number | string;
};

type NavOperationalAttentionSummary = {
  usage_ledger: {
    requires_attention: boolean;
    pending_review_count: number | string;
    follow_up_required_count: number | string;
  };
  requisitions: {
    requires_attention: boolean;
    approval_count: number | string;
    fulfillment_count: number | string;
  };
  execution_tasks: {
    requires_attention: boolean;
    actionable_count: number | string;
  };
  reservations: {
    requires_attention: boolean;
    expiration_count: number | string;
    conflict_requires_attention: boolean;
  };
  purchase_orders: {
    requires_attention: boolean;
    approval_count: number | string;
  };
  shipments: {
    requires_attention: boolean;
    due_receive_count: number | string;
    ready_finalize_count: number | string;
  };
  outbound: {
    requires_attention: boolean;
    update_queue_count: number | string;
    dispatch_queue_count: number | string;
    return_receive_queue_count: number | string;
  };
  inventory_controls: {
    requires_attention: boolean;
    approval_count: number | string;
    approval_queue_count: number | string;
    supplier_return_approval_count: number | string;
    cycle_count_reconcile_count: number | string;
    supplier_return_dispatch_count: number | string;
    invoice_match_count: number | string;
    invoice_payment_due_count: number | string;
  };
};

function useIsMobile(breakpoint = 960): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

export default function AppLayout() {
  const { locale, setLocale, t, nav } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [, setPermissionRevision] = useState(0);
  const role = getCurrentUserRole();
  const accessRoleLabel = getCurrentAccessRoleLabel();
  const tenantAccess = getTenantAccessSnapshot();
  const supportSession = getSupportSessionInfo();
  const hasTenantUserAttentionActor = tenantAccess.hasTenantContext
    && Boolean(tenantAccess.userId)
    && !supportSession.isSupportSession;
  const canReadAlerts = hasTenantUserAttentionActor && hasPermission(TENANT_PERMISSIONS.ALERTS_READ);
  const canManageAlerts = canReadAlerts && hasPermission(TENANT_PERMISSIONS.ALERTS_WRITE);
  const canOverrideBlockingAlerts = canReadAlerts && hasPermission(TENANT_PERMISSIONS.ALERTS_OVERRIDE);
  const canActOnAlerts = canManageAlerts || canOverrideBlockingAlerts;
  const alertAttentionScope = canManageAlerts ? 'all_unresolved' : canOverrideBlockingAlerts ? 'blocking_only' : 'none';
  const alertAttentionQuery = useQuery({
    queryKey: ['alerts', 'navigation-attention', tenantAccess.tenantId, tenantAccess.userId, alertAttentionScope],
    queryFn: () => apiRequest<NavAlertAttentionSummary>('/alerts/attention-summary'),
    enabled: canActOnAlerts,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  const hasAlertAttention = canActOnAlerts && alertAttentionQuery.data?.requires_attention === true;
  const canViewExecutionRequests = hasTenantUserAttentionActor && hasPermission(TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW);
  const canReviewExecutionRequests = canViewExecutionRequests && hasPermission(TENANT_PERMISSIONS.EXECUTION_REQUESTS_REVIEW);
  const canExecuteExecutionRequests = canViewExecutionRequests && hasPermission(TENANT_PERMISSIONS.EXECUTION_REQUESTS_EXECUTE);
  const canWriteProductsForExecution = canViewExecutionRequests && hasPermission(TENANT_PERMISSIONS.PRODUCTS_WRITE);
  const canActOnExecutionRequests = canReviewExecutionRequests || canExecuteExecutionRequests;
  const executionRequestAttentionScope = [
    canReviewExecutionRequests ? 'review' : 'no-review',
    canExecuteExecutionRequests ? 'execute' : 'no-execute',
    canWriteProductsForExecution ? 'product-write' : 'no-product-write'
  ].join(':');
  const executionRequestAttentionQuery = useQuery({
    queryKey: ['execution-requests', 'navigation-attention', tenantAccess.tenantId, tenantAccess.userId, executionRequestAttentionScope],
    queryFn: () => apiRequest<NavExecutionRequestAttentionSummary>('/execution-requests/attention-summary'),
    enabled: canActOnExecutionRequests,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  const hasExecutionRequestAttention = canActOnExecutionRequests
    && executionRequestAttentionQuery.data?.requires_attention === true;
  const canViewIntelligenceReview = hasTenantUserAttentionActor
    && hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ)
    && hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  const canHandleIntelligenceReviewEscalations = canViewIntelligenceReview
    && hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN);
  const canReadProbabilisticForecastingForAttention = hasTenantUserAttentionActor
    && hasPermission(TENANT_PERMISSIONS.INSIGHTS_READ);
  const intelligenceReviewAttentionScope = [
    role || 'unknown',
    canHandleIntelligenceReviewEscalations ? 'govern' : 'no-govern',
    canReadProbabilisticForecastingForAttention ? 'forecast-read' : 'no-forecast-read'
  ].join(':');
  const intelligenceReviewAttentionQuery = useQuery({
    queryKey: ['intelligence-review', 'navigation-attention', tenantAccess.tenantId, tenantAccess.userId, intelligenceReviewAttentionScope],
    queryFn: () => apiRequest<NavIntelligenceReviewAttentionSummary>('/operational-action-center/human-in-loop-ai-reviews/escalation-attention-summary'),
    enabled: canHandleIntelligenceReviewEscalations,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  const hasIntelligenceReviewAttention = canHandleIntelligenceReviewEscalations
    && intelligenceReviewAttentionQuery.data?.requires_attention === true;

  const canHandleLearningFeedbackReviews = hasTenantUserAttentionActor
    && hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)
    && hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN);
  const learningFeedbackAttentionScope = canReadProbabilisticForecastingForAttention ? 'with-forecast-review' : 'without-forecast-review';
  const learningFeedbackAttentionQuery = useQuery({
    queryKey: ['decision-learning-feedback', 'navigation-attention', tenantAccess.tenantId, tenantAccess.userId, learningFeedbackAttentionScope],
    queryFn: () => apiRequest<NavLearningFeedbackAttentionSummary>('/decision-intelligence-feedback/attention-summary'),
    enabled: canHandleLearningFeedbackReviews,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  const hasLearningFeedbackAttention = canHandleLearningFeedbackReviews
    && learningFeedbackAttentionQuery.data?.requires_attention === true;

  const canViewProcurementRecommendationsForAttention = hasTenantUserAttentionActor
    && hasPermission(TENANT_PERMISSIONS.INSIGHTS_READ);
  const canDecideProcurementRecommendationsForAttention = canViewProcurementRecommendationsForAttention
    && hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_APPROVE);
  const canConvertProcurementRecommendationsForAttention = canViewProcurementRecommendationsForAttention
    && hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_CREATE);
  const canActOnProcurementRecommendationsForAttention = canDecideProcurementRecommendationsForAttention
    || canConvertProcurementRecommendationsForAttention;
  const procurementRecommendationAttentionScope = [
    canDecideProcurementRecommendationsForAttention ? 'decide' : 'no-decide',
    canConvertProcurementRecommendationsForAttention ? 'convert' : 'no-convert'
  ].join(':');
  const procurementRecommendationAttentionQuery = useQuery({
    queryKey: ['procurement-recommendations', 'navigation-attention', tenantAccess.tenantId, tenantAccess.userId, procurementRecommendationAttentionScope],
    queryFn: () => apiRequest<NavProcurementRecommendationAttentionSummary>('/reorder-insights/recommendations/attention-summary'),
    enabled: canActOnProcurementRecommendationsForAttention,
    // Current procurement recommendations are deterministically recalculated from
    // stock, demand and supplier evidence. Keep the global shell poll bounded and
    // rely on window-focus plus mutation invalidation for faster local refreshes.
    staleTime: 60_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  const hasProcurementRecommendationAttention = canActOnProcurementRecommendationsForAttention
    && procurementRecommendationAttentionQuery.data?.requires_attention === true;

  const hasTenantActorForOperationalAttention = hasTenantUserAttentionActor;
  const canReviewUsageForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_USAGE_READ)
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_USAGE_REVIEW);
  const canApproveRequisitionsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ)
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_APPROVE);
  const canFulfillRequisitionsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ)
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_FULFILL);
  const canUpdateExecutionTasksForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)
    && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE);
  const canCompleteExecutionTasksForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)
    && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_COMPLETE);
  const canAssignExecutionTasksForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)
    && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_ASSIGN);
  const canExpireReservationsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ)
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_EXPIRE);
  const canAllocateReservationsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ)
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_ALLOCATE);
  const canReleaseReservationsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ)
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_RELEASE);
  const canCancelOwnReservationsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ)
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_CANCEL_OWN);
  const canCancelAnyReservationsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ)
    && hasPermission(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_CANCEL_ANY);
  const canApprovePurchaseOrdersForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_READ)
    && hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_APPROVE);
  const canReceiveShipmentsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ)
    && hasPermission(TENANT_PERMISSIONS.SHIPMENTS_RECEIVE);
  const canFinalizeShipmentsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ)
    && hasPermission(TENANT_PERMISSIONS.SHIPMENTS_FINALIZE);
  const canUpdateOutboundForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_READ)
    && hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_UPDATE);
  const canDispatchOutboundForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_READ)
    && hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_DISPATCH);
  const canReceiveCustomerReturnsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_READ)
    && hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_READ)
    && hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_RECEIVE);
  const canUseInventoryApprovalQueueForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.APPROVAL_RULES_READ)
    && hasPermission(TENANT_PERMISSIONS.APPROVALS_EXECUTE);
  const canApproveDepartmentRequisitionsInQueueForAttention = canUseInventoryApprovalQueueForAttention
    && hasPermission(TENANT_PERMISSIONS.REQUISITIONS_READ);
  const canApproveCycleCountsInQueueForAttention = canUseInventoryApprovalQueueForAttention
    && hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_READ);
  const canApproveSupplierInvoicesInQueueForAttention = canUseInventoryApprovalQueueForAttention
    && hasPermission(TENANT_PERMISSIONS.INVOICES_READ);
  const canApproveSupplierReturnsInQueueForAttention = canUseInventoryApprovalQueueForAttention
    && hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_READ);
  const canExecuteInventoryApprovalQueueForAttention = canApproveDepartmentRequisitionsInQueueForAttention
    || canApproveCycleCountsInQueueForAttention
    || canApproveSupplierInvoicesInQueueForAttention
    || canApproveSupplierReturnsInQueueForAttention;
  const canApproveSupplierReturnsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_READ)
    && hasPermission(TENANT_PERMISSIONS.APPROVALS_EXECUTE);
  const canReconcileCycleCountsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_READ)
    && hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_APPROVE);
  const canDispatchSupplierReturnsForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_READ)
    && hasPermission(TENANT_PERMISSIONS.SUPPLIER_RETURNS_DISPATCH);
  const canManageSupplierInvoicesForAttention = hasTenantActorForOperationalAttention
    && hasPermission(TENANT_PERMISSIONS.INVOICES_READ)
    && hasPermission(TENANT_PERMISSIONS.INVOICES_WRITE);

  const canActOnOperationalNavigationQueues = canReviewUsageForAttention
    || canApproveRequisitionsForAttention
    || canFulfillRequisitionsForAttention
    || canUpdateExecutionTasksForAttention
    || canCompleteExecutionTasksForAttention
    || canAssignExecutionTasksForAttention
    || canExpireReservationsForAttention
    || canAllocateReservationsForAttention
    || canReleaseReservationsForAttention
    || canCancelOwnReservationsForAttention
    || canCancelAnyReservationsForAttention
    || canApprovePurchaseOrdersForAttention
    || canReceiveShipmentsForAttention
    || canFinalizeShipmentsForAttention
    || canUpdateOutboundForAttention
    || canDispatchOutboundForAttention
    || canReceiveCustomerReturnsForAttention
    || canExecuteInventoryApprovalQueueForAttention
    || canApproveSupplierReturnsForAttention
    || canReconcileCycleCountsForAttention
    || canDispatchSupplierReturnsForAttention
    || canManageSupplierInvoicesForAttention;

  const operationalNavigationAttentionScope = [
    canReviewUsageForAttention ? 'usage-review' : 'no-usage-review',
    canApproveRequisitionsForAttention ? 'req-approve' : 'no-req-approve',
    canFulfillRequisitionsForAttention ? 'req-fulfill' : 'no-req-fulfill',
    canUpdateExecutionTasksForAttention ? 'task-update' : 'no-task-update',
    canCompleteExecutionTasksForAttention ? 'task-complete' : 'no-task-complete',
    canAssignExecutionTasksForAttention ? 'task-assign' : 'no-task-assign',
    canExpireReservationsForAttention ? 'reservation-expire' : 'no-reservation-expire',
    canAllocateReservationsForAttention ? 'reservation-allocate' : 'no-reservation-allocate',
    canReleaseReservationsForAttention ? 'reservation-release' : 'no-reservation-release',
    canCancelOwnReservationsForAttention ? 'reservation-cancel-own' : 'no-reservation-cancel-own',
    canCancelAnyReservationsForAttention ? 'reservation-cancel-any' : 'no-reservation-cancel-any',
    canApprovePurchaseOrdersForAttention ? `po-approve-${role || 'unknown'}` : 'no-po-approve',
    canReceiveShipmentsForAttention ? 'shipment-receive' : 'no-shipment-receive',
    canFinalizeShipmentsForAttention ? 'shipment-finalize' : 'no-shipment-finalize',
    canUpdateOutboundForAttention ? 'outbound-update' : 'no-outbound-update',
    canDispatchOutboundForAttention ? 'outbound-dispatch' : 'no-outbound-dispatch',
    canReceiveCustomerReturnsForAttention ? 'return-receive' : 'no-return-receive',
    canExecuteInventoryApprovalQueueForAttention ? `inventory-approval-queue-${role || 'unknown'}` : 'no-inventory-approval-queue',
    canApproveDepartmentRequisitionsInQueueForAttention ? 'inventory-approval-department-requisition' : 'no-inventory-approval-department-requisition',
    canApproveCycleCountsInQueueForAttention ? 'inventory-approval-cycle-count' : 'no-inventory-approval-cycle-count',
    canApproveSupplierInvoicesInQueueForAttention ? 'inventory-approval-invoice' : 'no-inventory-approval-invoice',
    canApproveSupplierReturnsInQueueForAttention ? 'inventory-approval-supplier-return' : 'no-inventory-approval-supplier-return',
    canApproveSupplierReturnsForAttention ? `supplier-return-approve-${role || 'unknown'}` : 'no-supplier-return-approve',
    canReconcileCycleCountsForAttention ? 'cycle-reconcile' : 'no-cycle-reconcile',
    canDispatchSupplierReturnsForAttention ? 'supplier-return-dispatch' : 'no-supplier-return-dispatch',
    canManageSupplierInvoicesForAttention ? 'invoice-write' : 'no-invoice-write'
  ].join(':');

  const operationalNavigationAttentionQuery = useQuery({
    queryKey: ['tenant-sidebar', 'operational-navigation-attention', tenantAccess.tenantId, tenantAccess.userId, operationalNavigationAttentionScope],
    queryFn: () => apiRequest<NavOperationalAttentionSummary>('/navigation-attention/operational-summary'),
    enabled: canActOnOperationalNavigationQueues,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1
  });

  const operationalAttention = operationalNavigationAttentionQuery.data;
  const hasUsageLedgerAttention = canReviewUsageForAttention && operationalAttention?.usage_ledger.requires_attention === true;
  const hasRequisitionAttention = (canApproveRequisitionsForAttention || canFulfillRequisitionsForAttention)
    && operationalAttention?.requisitions.requires_attention === true;
  const hasExecutionTaskAttention = (canUpdateExecutionTasksForAttention || canCompleteExecutionTasksForAttention || canAssignExecutionTasksForAttention)
    && operationalAttention?.execution_tasks.requires_attention === true;
  const hasReservationAttention = (canExpireReservationsForAttention || canAllocateReservationsForAttention || canReleaseReservationsForAttention || canCancelOwnReservationsForAttention || canCancelAnyReservationsForAttention)
    && operationalAttention?.reservations.requires_attention === true;
  const hasPurchaseOrderAttention = canApprovePurchaseOrdersForAttention
    && operationalAttention?.purchase_orders.requires_attention === true;
  const hasShipmentAttention = (canReceiveShipmentsForAttention || canFinalizeShipmentsForAttention)
    && operationalAttention?.shipments.requires_attention === true;
  const hasOutboundAttention = (canUpdateOutboundForAttention || canDispatchOutboundForAttention || canReceiveCustomerReturnsForAttention)
    && operationalAttention?.outbound.requires_attention === true;
  const hasInventoryControlsAttention = (canExecuteInventoryApprovalQueueForAttention || canApproveSupplierReturnsForAttention || canReconcileCycleCountsForAttention || canDispatchSupplierReturnsForAttention || canManageSupplierInvoicesForAttention)
    && operationalAttention?.inventory_controls.requires_attention === true;

  /*
   * v3.49.124: the page-wide red-dot explanation banner is intentionally disabled.
   * It told the user only that a page had actionable work, but not which exact
   * record(s) caused the sidebar red dot. The authoritative queues now mark the
   * actionable rows/cards themselves instead. Keep the historical explanation
   * logic out of the active render path unless a future UX explicitly needs it.
   */

  useEffect(() => {
    const onTenantMutationFeedback = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      if (detail?.type !== 'success') return;
      void queryClient.invalidateQueries({ queryKey: ['alerts', 'navigation-attention'] });
      void queryClient.invalidateQueries({ queryKey: ['execution-requests', 'navigation-attention'] });
      void queryClient.invalidateQueries({ queryKey: ['intelligence-review', 'navigation-attention'] });
      void queryClient.invalidateQueries({ queryKey: ['decision-learning-feedback', 'navigation-attention'] });
      void queryClient.invalidateQueries({ queryKey: ['procurement-recommendations', 'navigation-attention'] });
      void queryClient.invalidateQueries({ queryKey: ['tenant-sidebar', 'operational-navigation-attention'] });
    };

    window.addEventListener(TENANT_MUTATION_FEEDBACK_EVENT, onTenantMutationFeedback);
    return () => window.removeEventListener(TENANT_MUTATION_FEEDBACK_EVENT, onTenantMutationFeedback);
  }, [queryClient]);


  const announcementContextQuery = useQuery({
    queryKey: ['announcement-context', 'current', tenantAccess.tenantId],
    queryFn: fetchAnnouncementContext,
    enabled: tenantAccess.hasTenantContext,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  const announcementContext: AnnouncementContext | null = announcementContextQuery.data ?? null;

  const [supportContext, setSupportContext] = useState<CurrentSupportContext | null>(null);
  const [maintenanceContext, setMaintenanceContext] = useState<MaintenanceContext | null>(null);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<Set<string>>(() => new Set());
  const [incidentContext, setIncidentContext] = useState<IncidentContext | null>(null);
  const [tenantSubscriptionAccess, setTenantSubscriptionAccess] = useState<TenantSubscriptionAccess | null>(null);
  const [, setTenantCurrencyRevision] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mainAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (supportSession.isSupportSession || !tenantAccess.hasTenantContext) return () => { cancelled = true; };

    void apiRequest<{ effective_locale?: string | null }>('/auth/preferences/locale')
      .then((preference) => {
        const nextLocale = normalizeAppLocale(preference.effective_locale);
        if (!cancelled && nextLocale) setLocale(nextLocale);
      })
      .catch(() => {
        // Keep the locally selected/browser locale if preference lookup is unavailable.
      });

    return () => { cancelled = true; };
  }, [setLocale, supportSession.isSupportSession, tenantAccess.hasTenantContext, tenantAccess.tenantId]);

  useEffect(() => {
    let cancelled = false;
    if (!tenantAccess.hasTenantContext) {
      setActiveTenantCurrency(DEFAULT_INVENTORY_CURRENCY);
      return () => { cancelled = true; };
    }
    fetchTenantCurrencyContext()
      .then(() => { if (!cancelled) setTenantCurrencyRevision((value) => value + 1); })
      .catch(() => {
        if (!cancelled) {
          setActiveTenantCurrency(DEFAULT_INVENTORY_CURRENCY);
          setTenantCurrencyRevision((value) => value + 1);
        }
      });
    return () => { cancelled = true; };
  }, [tenantAccess.tenantId, tenantAccess.hasTenantContext]);

  const visibleAnnouncements = useMemo(() => (announcementContext?.announcements || []).filter((announcement) => !dismissedAnnouncementIds.has(announcement.id)), [announcementContext, dismissedAnnouncementIds]);

  const currentModule = useMemo(() => getTenantModuleForPathname(location.pathname), [location.pathname]);
  const pageMeta = useMemo(() => getTenantPageMeta(location.pathname), [location.pathname]);

  const isVisibleNavigationItem = (item: TenantNavigationItem): boolean => {
    const featureByPath: Record<string, string> = {
      '/automation-schedules': 'automation',
      '/inventory-requisitions': 'requisitions',
      '/purchase-orders': 'purchase_orders',
      '/reports': 'reports'
    };
    const requiredFeature = featureByPath[item.to];

    if (requiredFeature) {
      const entitlement = getTenantFeatureEntitlement(tenantSubscriptionAccess, requiredFeature);
      if (entitlement && !entitlement.allowed) {
        return false;
      }
    }

    if (item.requiredPermissions?.length && !hasAllPermissions(item.requiredPermissions)) {
      return false;
    }

    if (item.requiredAnyPermissions?.length && !hasAnyPermission(item.requiredAnyPermissions)) {
      return false;
    }

    if (item.permission) {
      return hasPermission(item.permission);
    }

    if (!item.roles || item.roles.length === 0) {
      return true;
    }

    if (!role) {
      return false;
    }

    return item.roles.includes(role);
  };

  useEffect(() => {
    const onPermissionsChanged = () => setPermissionRevision((value) => value + 1);
    const refreshPermissions = () => {
      if (document.visibilityState === 'hidden') return;
      void refreshTenantPermissionSnapshot();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshPermissions();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'inventory_tenant_effective_permissions' || event.key === 'inventory_access_token') {
        setPermissionRevision((value) => value + 1);
        refreshPermissions();
      }
    };

    window.addEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
    window.addEventListener('focus', refreshPermissions);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
      window.removeEventListener('focus', refreshPermissions);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const visibleNavSections = tenantNavigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(isVisibleNavigationItem)
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);


  const forcePageScrollTop = () => {
    const scrollTargets = new Set<HTMLElement>();

    scrollTargets.add(document.documentElement);
    scrollTargets.add(document.body);

    if (mainAreaRef.current) {
      scrollTargets.add(mainAreaRef.current);
    }

    document.querySelectorAll<HTMLElement>('[data-route-scroll-container]').forEach((element) => {
      scrollTargets.add(element);
    });

    scrollTargets.forEach((element) => {
      const previousScrollBehavior = element.style.scrollBehavior;
      element.style.scrollBehavior = 'auto';
      element.scrollTop = 0;
      element.scrollLeft = 0;
      element.style.scrollBehavior = previousScrollBehavior;
    });

    window.scrollTo(0, 0);
  };

  const handleNavigationClick = (event: MouseEvent<HTMLAnchorElement>, targetPath: string) => {
    event.preventDefault();

    if (targetPath === location.pathname) {
      forcePageScrollTop();
      setMobileNavOpen(false);
      return;
    }

    setMobileNavOpen(false);
    navigate(targetPath);

    window.requestAnimationFrame(forcePageScrollTop);
    window.setTimeout(forcePageScrollTop, 0);
    window.setTimeout(forcePageScrollTop, 75);
  };

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    forcePageScrollTop();

    const animationFrame = window.requestAnimationFrame(forcePageScrollTop);
    const shortTimer = window.setTimeout(forcePageScrollTop, 0);
    const renderTimer = window.setTimeout(forcePageScrollTop, 50);
    const settledTimer = window.setTimeout(forcePageScrollTop, 150);
    const lateTimer = window.setTimeout(forcePageScrollTop, 350);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(shortTimer);
      window.clearTimeout(renderTimer);
      window.clearTimeout(settledTimer);
      window.clearTimeout(lateTimer);
    };
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    if (!supportSession.isSupportSession) {
      setSupportContext(null);
      return () => {
        cancelled = true;
      };
    }

    fetchCurrentSupportContext()
      .then((context) => {
        if (!cancelled) {
          setSupportContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSupportContext({ active: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supportSession.isSupportSession, supportSession.supportSessionId, location.pathname]);


  useEffect(() => {
    let cancelled = false;

    fetchMaintenanceContext()
      .then((context) => {
        if (!cancelled) {
          setMaintenanceContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMaintenanceContext(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    fetchIncidentContext()
      .then((context) => {
        if (!cancelled) {
          setIncidentContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIncidentContext(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);


  useEffect(() => {
    let cancelled = false;

    if (!tenantAccess.hasTenantContext) {
      setTenantSubscriptionAccess(null);
      return () => {
        cancelled = true;
      };
    }

    fetchTenantSubscriptionAccess()
      .then((access) => {
        if (!cancelled) {
          setTenantSubscriptionAccess(access);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTenantSubscriptionAccess(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantAccess.hasTenantContext, location.pathname]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (isMobile && mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow || '';
    }

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [isMobile, mobileNavOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    const supportSessionInfo = getSupportSessionInfo();

    if (supportSessionInfo.isSupportSession) {
      clearSupportSessionAccessToken();
      navigate('/platform/support-sessions', { replace: true });
      setIsLoggingOut(false);
      return;
    }

    try {
      await logoutTenantSession();
    } catch {
      // logoutTenantSession always clears local auth state in its finally block.
    } finally {
      navigate('/login', {
        replace: true,
        state: { skipSessionRecovery: true }
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <div style={styles.shell}>
      {isMobile && mobileNavOpen ? (
        <div
          aria-hidden="true"
          style={styles.mobileOverlay}
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        style={{
          ...styles.sidebar,
          ...(isMobile ? styles.sidebarMobile : styles.sidebarDesktop),
          ...(isMobile && mobileNavOpen ? styles.sidebarMobileOpen : {}),
          ...(isMobile && !mobileNavOpen ? styles.sidebarMobileClosed : {})
        }}
      >
        <div style={styles.brandBlock}>
          <InventoryBrand compact tone="dark" />
          <div style={styles.brandWorkspace}><div style={styles.brandWorkspaceLabel}>{t('common.workspace')}</div><div style={styles.brandSubtitle}>{tenantSubscriptionAccess?.tenant.name || t('common.companyWorkspace')}</div></div>
          {supportSession.isSupportSession ? <div style={styles.supportPill}>{t('common.supportMode')}</div> : null}
        </div>

        <div style={styles.navScrollArea}>
          <nav style={styles.nav}>
            {visibleNavSections.map((section) => (
              <div key={section.id} style={styles.navSection}>
                <div style={styles.navSectionTitle}>{nav(section.label)}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.description}
                    onClick={(event) => handleNavigationClick(event, item.to)}
                    style={({ isActive }) => ({
                      ...styles.navItem,
                      ...(isActive ? styles.navItemActive : {})
                    })}
                  >
                    <span style={styles.navItemIcon}><TenantNavIcon path={item.to} /></span>
                    <span style={styles.navItemLabelGroup}>
                      <span style={styles.navItemLabel}>{nav(item.label)}</span>
                    </span>
                    {item.to === '/alerts' && hasAlertAttention ? (
                      <span
                        style={styles.alertIndicatorDot}
                        aria-label={t('common.openAlertsAttention')}
                        title={t('common.openAlertsAttention')}
                      />
                    ) : null}
                    {item.to === '/execution-requests' && hasExecutionRequestAttention ? (
                      <span
                        style={styles.alertIndicatorDot}
                        aria-label={t('common.executionRequestsAttention')}
                        title={t('common.executionRequestsAttention')}
                      />
                    ) : null}
                    {item.to === '/intelligence-review' && hasIntelligenceReviewAttention ? (
                      <span
                        style={styles.alertIndicatorDot}
                        aria-label={t('common.intelligenceReviewAttention')}
                        title={t('common.intelligenceReviewAttention')}
                      />
                    ) : null}
                    {item.to === '/decision-learning-feedback' && hasLearningFeedbackAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.learningFeedbackAttention')} title={t('common.learningFeedbackAttention')} />
                    ) : null}
                    {item.to === '/procurement-recommendations' && hasProcurementRecommendationAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.procurementRecommendationsAttention')} title={t('common.procurementRecommendationsAttention')} />
                    ) : null}
                    {item.to === '/inventory-usage' && hasUsageLedgerAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.usageLedgerAttention')} title={t('common.usageLedgerAttention')} />
                    ) : null}
                    {item.to === '/inventory-requisitions' && hasRequisitionAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.requisitionsAttention')} title={t('common.requisitionsAttention')} />
                    ) : null}
                    {item.to === '/execution-tasks' && hasExecutionTaskAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.executionTasksAttention')} title={t('common.executionTasksAttention')} />
                    ) : null}
                    {item.to === '/inventory-reservations' && hasReservationAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.reservationsAttention')} title={t('common.reservationsAttention')} />
                    ) : null}
                    {item.to === '/purchase-orders' && hasPurchaseOrderAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.purchaseOrdersAttention')} title={t('common.purchaseOrdersAttention')} />
                    ) : null}
                    {item.to === '/shipments' && hasShipmentAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.shipmentsAttention')} title={t('common.shipmentsAttention')} />
                    ) : null}
                    {item.to === '/outbound' && hasOutboundAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.outboundAttention')} title={t('common.outboundAttention')} />
                    ) : null}
                    {item.to === '/enterprise-inventory' && hasInventoryControlsAttention ? (
                      <span style={styles.alertIndicatorDot} aria-label={t('common.inventoryControlsAttention')} title={t('common.inventoryControlsAttention')} />
                    ) : null}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.sidebarLanguageSelector}><LanguageSelector scope="tenant" compact appearance="sidebar" /></div>
          <div style={styles.sidebarIdentity}><div style={styles.sidebarAvatar}>{(accessRoleLabel || 'U').trim().charAt(0).toUpperCase()}</div><div style={styles.sidebarIdentityText}><div style={styles.sidebarIdentityName}>{tenantSubscriptionAccess?.tenant.name || t('common.tenantWorkspace')}</div><div style={styles.sidebarIdentityRole}>{accessRoleLabel || t('common.tenantUser')}</div></div></div>
          <button type="button" data-tenant-logout="true" style={styles.logoutButton} onClick={handleLogout} disabled={isLoggingOut}><TenantNavIcon path="/logout" size={17}/><span>{isLoggingOut ? t('common.loggingOut') : supportSession.isSupportSession ? t('common.exitSupportMode') : t('common.logout')}</span></button>
        </div>
      </aside>

      <div ref={mainAreaRef} style={styles.mainArea} data-route-scroll-container>
        <header
          style={{
            ...styles.header,
            ...(isMobile ? styles.headerMobile : {})
          }}
        >
          <div
            style={{
              ...styles.headerLeft,
              ...(isMobile ? styles.headerLeftMobile : {})
            }}
          >
            {isMobile ? (
              <button
                type="button"
                aria-label={t('common.openNavigation')}
                style={styles.menuButton}
                onClick={() => setMobileNavOpen((current) => !current)}
              >
                ☰
              </button>
            ) : null}

            <div style={styles.headerTextBlock}>
              <div
                style={{
                  ...styles.breadcrumb,
                  ...(isMobile ? styles.breadcrumbMobile : {})
                }}
              >
                {t('common.operations')} / {nav(currentModule?.moduleGroupLabel || 'Workspace')} / {nav(pageMeta.title)}
              </div>
              <h1
                style={{
                  ...styles.headerTitle,
                  ...(isMobile ? styles.headerTitleMobile : {})
                }}
              >
                {nav(pageMeta.title)}
              </h1>
              <p
                style={{
                  ...styles.headerText,
                  ...(isMobile ? styles.headerTextMobile : {})
                }}
              >
                {pageMeta.subtitle}
              </p>
            </div>
          </div>
          {!isMobile ? <div style={styles.headerContext}><div style={styles.headerContextAvatar}>{(accessRoleLabel || 'U').trim().charAt(0).toUpperCase()}</div><div style={styles.headerContextText}><div style={styles.headerContextRole}>{accessRoleLabel || t('common.tenantUser')}</div><div style={styles.headerContextTenant}>{tenantSubscriptionAccess?.tenant.name || t('common.tenantWorkspace')}</div></div></div> : null}
        </header>


        {!tenantAccess.hasTenantContext ? (
          <div style={styles.tenantAccessBanner}>
            <strong>{t('common.companyContextUnavailable')}</strong> {t('common.companyContextUnavailableBody')}
          </div>
        ) : null}


        {tenantSubscriptionAccess && !tenantSubscriptionAccess.write_access.allowed ? (
          <div style={styles.subscriptionBlockedBanner}>
            <strong>{t('common.subscriptionWritesBlocked')}</strong>{' '}
            {tenantSubscriptionAccess.write_access.blocker?.message || t('common.subscriptionBlockerFallback')}
            <div style={styles.subscriptionBlockedMeta}>
              {t('common.tenantStatus')}: {tenantSubscriptionAccess.tenant.status || '-'} · {t('common.billing')}: {tenantSubscriptionAccess.tenant.billing_status || '-'} · {t('common.plan')}: {tenantSubscriptionAccess.tenant.plan_code || '-'}
            </div>
          </div>
        ) : tenantSubscriptionAccess?.plan_limit_blocked_resources.length ? (
          <div style={styles.subscriptionLimitBanner}>
            <strong>{t('common.planLimitReached')}</strong> {t('common.newRecordsBlockedFor')}: {tenantSubscriptionAccess.plan_limit_blocked_resources.join(', ')}.
          </div>
        ) : tenantSubscriptionAccess?.feature_blocked_resources?.length ? (
          <div style={styles.subscriptionLimitBanner}>
            <strong>{t('common.planFeatureLocked')}</strong> {t('common.disabledModules')}: {tenantSubscriptionAccess.feature_blocked_resources.join(', ')}.
          </div>
        ) : null}

        {supportSession.isSupportSession ? (
          <div style={styles.supportBanner}>
            <div style={styles.supportBannerText}>
              <strong>{t('common.supportSessionActive')}</strong>{' '}
              {supportContext?.platform_user_name || supportContext?.platform_user_email
                ? `${supportContext.platform_user_name || supportContext.platform_user_email} ${t('common.isAccessingTenantThroughSupport')}`
                : t('common.youAccessingTenantThroughSupport')}
              <div style={styles.supportBannerMeta}>
                {t('common.tenant')}: {supportContext?.tenant_name || supportSession.tenantId || '-'} · {t('common.role')}: {supportContext?.effective_role || supportSession.role || '-'} · {t('common.reason')}: {supportContext?.reason || '-'}
                {supportContext?.expires_at ? ` · ${t('common.expires')}: ${formatLocalizedDateTime(supportContext.expires_at, locale)}` : ''}
              </div>
            </div>
            <button type="button" style={styles.supportExitButton} onClick={handleLogout} disabled={isLoggingOut}>
              {t('common.exitSupportMode')}
            </button>
          </div>
        ) : null}


        {incidentContext?.incidents?.length ? (
          <div style={{
            ...styles.incidentBanner,
            ...(incidentContext.incidents[0].severity === 'critical' ? styles.incidentCritical : {}),
            ...(incidentContext.incidents[0].severity === 'major' ? styles.incidentMajor : {})
          }}>
            <strong>{t('common.serviceIncident')}</strong> {incidentContext.incidents[0].title}
            {incidentContext.incidents[0].public_message ? ` — ${incidentContext.incidents[0].public_message}` : ''}
            <div style={styles.incidentMeta}>
              {t('common.status')}: {incidentContext.incidents[0].status} · {t('common.severity')}: {incidentContext.incidents[0].severity} · {t('common.impact')}: {incidentContext.incidents[0].impact}
            </div>
          </div>
        ) : null}

        {maintenanceContext?.active?.length ? (
          <div style={styles.maintenanceBanner}>
            <strong>{t('common.maintenanceActive')}</strong> {maintenanceContext.active[0].title}
            {maintenanceContext.active[0].message ? ` — ${maintenanceContext.active[0].message}` : ''}
            <div style={styles.maintenanceBannerMeta}>
              {t('common.ends')}: {formatLocalizedDateTime(maintenanceContext.active[0].ends_at, locale)} · {t('common.scope')}: {maintenanceContext.active[0].scope} · {t('common.writeLock')}: {maintenanceContext.active[0].lock_writes ? t('common.yes') : t('common.no')}
            </div>
          </div>
        ) : maintenanceContext?.upcoming?.length ? (
          <div style={styles.maintenanceNotice}>
            <strong>{t('common.upcomingMaintenance')}</strong> {maintenanceContext.upcoming[0].title} · {t('common.starts')} {formatLocalizedDateTime(maintenanceContext.upcoming[0].starts_at, locale)}
          </div>
        ) : null}

        {visibleAnnouncements.length ? (
          <div style={styles.announcementStack}>
            {visibleAnnouncements.map((announcement) => (
              <div key={announcement.id} style={{
                ...styles.announcementBanner,
                ...(announcement.severity === 'critical' ? styles.announcementCritical : {}),
                ...(announcement.severity === 'warning' ? styles.announcementWarning : {})
              }}>
                <div style={styles.announcementHeader}>
                  <strong>{announcement.title}</strong>
                  {announcement.dismissible ? <button type="button" style={styles.announcementDismiss} onClick={() => setDismissedAnnouncementIds((current) => new Set([...current, announcement.id]))}>{t('common.dismiss')}</button> : null}
                </div>
                <div>{announcement.message}</div>
                <div style={styles.announcementMeta}>
                  {t('common.severity')}: {announcement.severity}
                  {announcement.ends_at ? ` · ${t('common.visibleUntil')}: ${formatLocalizedDateTime(announcement.ends_at, locale)}` : ''}
                  {!announcement.dismissible ? ` · ${t('common.requiredNotice')}` : ''}
                </div>
              </div>
            ))}
            {announcementContext?.truncated ? <div style={styles.announcementTruncated}>{t('common.tenantAnnouncementsTruncated')}</div> : null}
          </div>
        ) : null}

        <main
          data-route-scroll-container
          style={{
            ...styles.content,
            ...(isMobile ? styles.contentMobile : styles.contentDesktop)
          }}
        >
          {/*
            v3.49.124: intentionally hidden. A page-wide "Why the red dot is showing"
            banner was too vague because it did not identify the actual records.
            Red-dot pages now mark the responsible rows/cards in their real queues.
          */}
          <Outlet />
        </main>
        <CopyrightNotice />
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {

  attentionExplanation: {
    marginBottom: '18px',
    padding: '15px 17px',
    borderRadius: '14px',
    border: '1px solid #fecaca',
    background: '#fff7f7',
    color: '#7f1d1d',
    boxShadow: '0 10px 24px rgba(127,29,29,0.06)'
  },
  attentionExplanationHeader: { display: 'flex', alignItems: 'flex-start', gap: '11px' },
  attentionExplanationDot: { width: '10px', height: '10px', borderRadius: '999px', background: '#dc2626', marginTop: '5px', flex: '0 0 auto', boxShadow: '0 0 0 4px rgba(220,38,38,0.10)' },
  attentionExplanationTitle: { display: 'block', fontSize: '15px', lineHeight: 1.3 },
  attentionExplanationIntro: { marginTop: '3px', color: '#991b1b', fontSize: '13px', lineHeight: 1.45 },
  attentionExplanationList: { margin: '10px 0 0 21px', padding: 0, display: 'grid', gap: '5px', color: '#7f1d1d', fontSize: '13px', lineHeight: 1.45 },

  tenantAccessBanner: {
    margin: '0 24px 8px 24px',
    padding: '12px 16px',
    borderRadius: '14px',
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    lineHeight: 1.45
  },
  tenantAccessNotice: {
    margin: '0 24px 8px 24px',
    padding: '12px 16px',
    borderRadius: '14px',
    background: '#f8fafc',
    color: '#334155',
    border: '1px solid #dbe3f0',
    lineHeight: 1.45
  },

  incidentBanner: {
    margin: '12px 24px 0',
    background: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
    borderRadius: '14px',
    padding: '12px 16px',
    lineHeight: 1.45
  },
  incidentMajor: {
    background: '#fffbeb',
    color: '#92400e',
    border: '1px solid #fde68a'
  },
  incidentCritical: {
    background: '#7f1d1d',
    color: '#fff',
    border: '1px solid #fecaca'
  },
  incidentMeta: {
    marginTop: '4px',
    fontSize: '12px',
    opacity: 0.85
  },

  announcementStack: { display: 'grid', gap: '8px' },
  announcementHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  announcementDismiss: { border: '1px solid currentColor', borderRadius: '8px', background: 'transparent', color: 'inherit', padding: '4px 8px', font: 'inherit', fontWeight: 800, cursor: 'pointer' },
  announcementTruncated: { margin: '0 24px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '8px 12px', fontSize: '12px' },
  announcementBanner: {
    margin: '12px 24px 0',
    background: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
    borderRadius: '14px',
    padding: '12px 16px',
    lineHeight: 1.45
  },
  announcementWarning: {
    background: '#fffbeb',
    color: '#92400e',
    border: '1px solid #fde68a'
  },
  announcementCritical: {
    background: '#7f1d1d',
    color: '#fff',
    border: '1px solid #fecaca'
  },
  announcementMeta: {
    marginTop: '4px',
    fontSize: '12px',
    opacity: 0.85
  },

  maintenanceBanner: {
    margin: '16px 24px 0',
    background: '#7f1d1d',
    color: '#fff',
    borderRadius: '14px',
    padding: '14px 16px',
    boxShadow: '0 12px 30px rgba(127,29,29,0.18)'
  },
  maintenanceBannerMeta: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#fee2e2'
  },
  maintenanceNotice: {
    margin: '16px 24px 0',
    background: '#fffbeb',
    color: '#92400e',
    border: '1px solid #fde68a',
    borderRadius: '14px',
    padding: '12px 16px'
  },
  shell: {
    minHeight: '100dvh', height: '100dvh', display: 'flex', background: '#f8fafc', color: '#0f172a', position: 'relative', overflow: 'hidden', width: '100%', minWidth: 0
  },
  sidebar: {
    background: 'linear-gradient(180deg,#0f2749 0%,#0b1b32 48%,#081220 100%)', color: '#fff', padding: '18px 12px 14px', display: 'flex', flexDirection: 'column', zIndex: 40, overflow: 'hidden', minWidth: 0
  },
  sidebarDesktop: {
    width: '280px', minWidth: '280px', height: '100dvh', position: 'sticky', top: 0, borderRight: '1px solid rgba(148,163,184,.12)', boxShadow: '8px 0 24px rgba(15,23,42,.05)'
  },
  sidebarMobile: {
    width: '280px',
    maxWidth: '85vw',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
    transition: 'transform 0.22s ease',
    willChange: 'transform'
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)'
  },
  sidebarMobileClosed: {
    transform: 'translateX(-100%)'
  },
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    zIndex: 30
  },
  brandBlock: {
    marginBottom: '12px', padding: '5px 8px 16px', borderBottom: '1px solid rgba(255,255,255,.10)', flexShrink: 0, minWidth: 0
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  brandSubtitle: {
    fontSize: '12.5px', color: 'rgba(255,255,255,.78)', lineHeight: 1.4, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
  },
  rolePill: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(96, 165, 250, 0.16)',
    color: '#bfdbfe',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    maxWidth: '100%',
    wordBreak: 'break-word'
  },
  brandWorkspace: { marginTop: '14px', padding: '10px 11px', borderRadius: '8px', background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' },
  brandWorkspaceLabel: { color: 'rgba(255,255,255,.38)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '3px' },
  navItemIcon: { width: '19px', height: '19px', flex: '0 0 19px', display: 'grid', placeItems: 'center' }, navItemLabelGroup: { minWidth: 0, display: 'flex', alignItems: 'center', flex: '1 1 auto' }, navItemLabel: { minWidth: 0, overflow: 'visible', textOverflow: 'clip', whiteSpace: 'normal', lineHeight: 1.25 }, alertIndicatorDot: { width: '8px', height: '8px', flex: '0 0 8px', marginLeft: 'auto', marginRight: '1px', borderRadius: '999px', background: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,.16)' },
  sidebarIdentity: { display: 'grid', gridTemplateColumns: '32px minmax(0,1fr)', alignItems: 'center', gap: '9px', marginBottom: '10px' }, sidebarAvatar: { width: '32px', height: '32px', borderRadius: '999px', display: 'grid', placeItems: 'center', background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 800 }, sidebarIdentityText: { minWidth: 0 }, sidebarIdentityName: { color: '#fff', fontSize: '12.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, sidebarIdentityRole: { color: 'rgba(255,255,255,.5)', fontSize: '11px', marginTop: '2px' },
  headerContext: { display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0, paddingTop: '2px' }, headerContextAvatar: { width: '34px', height: '34px', borderRadius: '999px', display: 'grid', placeItems: 'center', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', fontSize: '12px', fontWeight: 800 }, headerContextText: { textAlign: 'right', minWidth: 0 }, headerContextRole: { color: '#0f172a', fontSize: '12.5px', fontWeight: 800 }, headerContextTenant: { color: '#64748b', fontSize: '11px', marginTop: '1px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  supportPill: {
    display: 'inline-flex',
    marginTop: '8px',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(251, 191, 36, 0.16)',
    color: '#fde68a',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.06em'
  },
  accessSummaryCard: {
    marginTop: '12px',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '14px',
    padding: '10px 12px',
    background: 'rgba(15, 23, 42, 0.72)'
  },
  accessSummaryLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '6px'
  },
  accessSummaryValue: {
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800
  },
  accessSummaryMeta: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: '12px',
    marginTop: '4px',
    wordBreak: 'break-word'
  },
  navScrollArea: {
    flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '3px', paddingBottom: '6px'
  },
  nav: {
    display: 'flex', flexDirection: 'column', gap: '13px', minWidth: 0
  },
  navSection: {
    display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0
  },
  navSectionTitle: {
    color: 'rgba(255,255,255,.38)', fontSize: '10px', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', padding: '5px 10px 4px'
  },
  navItem: {
    color: 'rgba(255,255,255,.78)', textDecoration: 'none', padding: '8px 10px', borderRadius: '8px', fontWeight: 650, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '36px', transition: 'background-color .16s ease,color .16s ease,box-shadow .16s ease'
  },
  navItemActive: {
    background: 'linear-gradient(90deg,rgba(37,99,235,.92),rgba(29,78,216,.82))', color: '#fff', boxShadow: '0 7px 18px rgba(37,99,235,.18)'
  },
  sidebarFooter: {
    padding: '13px 7px 0', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,.10)', flexShrink: 0
  },
  sidebarLanguageSelector: {
    marginTop: '-6px',
    marginBottom: '12px'
  },
  logoutButton: {
    width: '100%', border: '1px solid rgba(255,255,255,.10)', borderRadius: '8px', padding: '9px 10px', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.78)', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  },
  mainArea: {
    flex: 1, minWidth: 0, minHeight: 0, height: '100dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#f8fafc'
  },
  header: {
    padding: '18px 24px 15px', flexShrink: 0, minWidth: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', background: '#fff', borderBottom: '1px solid #e2e8f0'
  },
  headerMobile: {
    padding: '14px 12px', alignItems: 'flex-start'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    minWidth: 0
  },
  headerLeftMobile: {
    gap: '12px'
  },
  menuButton: {
    border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', width: '40px', height: '40px', fontSize: '18px', color: '#0f172a', cursor: 'pointer', flexShrink: 0, boxShadow: '0 1px 2px rgba(15,23,42,.04)'
  },
  headerTextBlock: {
    minWidth: 0
  },
  breadcrumb: {
    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', color: '#94a3b8', marginBottom: '6px', wordBreak: 'break-word'
  },
  breadcrumbMobile: {
    marginBottom: '6px'
  },
  headerTitle: {
    margin: 0, fontSize: '26px', lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a', wordBreak: 'break-word'
  },
  headerTitleMobile: {
    fontSize: '22px'
  },
  headerText: {
    margin: '6px 0 0', color: '#64748b', maxWidth: '760px', lineHeight: 1.45, fontSize: '13px', wordBreak: 'break-word'
  },
  headerTextMobile: {
    marginTop: '8px',
    fontSize: '14px',
    maxWidth: '100%'
  },
  moduleMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  },
  moduleMetaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    border: '1px solid #dbe3f0',
    background: '#ffffff',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 10px'
  },

  subscriptionBlockedBanner: {
    margin: '18px 24px 0',
    padding: '14px 16px',
    border: '1px solid #fecaca',
    borderRadius: 14,
    background: '#fef2f2',
    color: '#7f1d1d',
    fontSize: 13,
    lineHeight: 1.5
  },
  subscriptionBlockedMeta: {
    marginTop: 6,
    color: '#991b1b',
    fontSize: 12
  },
  subscriptionLimitBanner: {
    margin: '18px 24px 0',
    padding: '14px 16px',
    border: '1px solid #fed7aa',
    borderRadius: 14,
    background: '#fff7ed',
    color: '#7c2d12',
    fontSize: 13,
    lineHeight: 1.5
  },
  supportBanner: {
    margin: '0 24px 8px 24px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: '#fffbeb',
    border: '1px solid #f59e0b',
    color: '#92400e',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  supportBannerText: {
    minWidth: 0,
    lineHeight: 1.45
  },
  supportBannerMeta: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#92400e',
    wordBreak: 'break-word'
  },
  supportExitButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '9px 12px',
    background: '#92400e',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer'
  },
  content: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    overflowX: 'hidden',
    boxSizing: 'border-box'
  },
  contentDesktop: {
    padding: '20px 22px 26px'
  },
  contentMobile: {
    padding: '14px 12px 22px'
  }
};
