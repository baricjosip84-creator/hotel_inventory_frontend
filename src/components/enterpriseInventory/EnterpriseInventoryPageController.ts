import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { useSearchParams } from "react-router";
import { useAppTranslation } from "../../i18n/I18nContext";
import { hasPermission } from "../../lib/permissions";
import { getTenantFeatureEntitlement, type TenantSubscriptionAccess } from "../../lib/tenantSubscriptionAccess";
import { enterpriseInventoryTabFeatures, enterpriseInventoryTabs } from "./EnterpriseInventoryTabConfig";
import { useEnterpriseInventoryFormState } from "./EnterpriseInventoryFormState";
import { useEnterpriseInventoryPageActions } from "./EnterpriseInventoryPageActions";
import { useEnterpriseInventoryPageData } from "./EnterpriseInventoryPageData";
import { useEnterpriseInventoryPageFeedback } from "./EnterpriseInventoryPageFeedback";
import {
  getEnterpriseInventoryActiveTabQueryError,
  getEnterpriseInventoryActiveTabLastUpdatedAt,
} from "./EnterpriseInventoryQueryStatus";


function isEnterpriseInventoryTabAccessible(
  key: (typeof enterpriseInventoryTabs)[number][0],
  subscriptionAccess?: TenantSubscriptionAccess,
): boolean {
  const tab = enterpriseInventoryTabs.find(([tabKey]) => tabKey === key);
  if (!tab || !hasPermission(tab[2])) return false;
  const feature = enterpriseInventoryTabFeatures[key];
  return !feature || getTenantFeatureEntitlement(subscriptionAccess, feature)?.allowed !== false;
}

function findFirstAccessibleEnterpriseInventoryTab(subscriptionAccess?: TenantSubscriptionAccess) {
  return enterpriseInventoryTabs.find(([key]) =>
    isEnterpriseInventoryTabAccessible(key, subscriptionAccess)
  )?.[0] ?? "";
}

export function useEnterpriseInventoryPageController() {
  const { ui } = useAppTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab')?.trim() || '';
  const [activeTab, setActiveTabState] = useState(() =>
    enterpriseInventoryTabs.some(([key]) => key === requestedTab && isEnterpriseInventoryTabAccessible(key))
      ? requestedTab
      : findFirstAccessibleEnterpriseInventoryTab()
  );
  const {
    errorMessage,
    mutationFeedback,
    refreshSystemContext,
    setErrorMessage,
    setStatusMessage,
    statusMessage,
  } = useEnterpriseInventoryPageFeedback();
  const formState = useEnterpriseInventoryFormState();

  const {
    alertFilters,
    attachmentForm,
    auditFilters,
    executionFilters,
    notificationDeliveryOffset,
    notificationEventOffset,
    productPackageForm,
    productSearch,
    selectedSupplierPerformanceId,
    shipmentReceivingForm,
    supplierSearch,
  } = formState;

  const pageData = useEnterpriseInventoryPageData({
    activeTab,
    productSearch,
    productPackageProductId: productPackageForm.product_id,
    supplierSearch,
    selectedSupplierPerformanceId,
    executionFilters,
    notificationDeliveryOffset,
    notificationEventOffset,
    shipmentReceivingShipmentId: shipmentReceivingForm.shipment_id,
    alertFilters,
    auditFilters,
    attachmentEntityType: attachmentForm.entity_type,
    attachmentEntityId: attachmentForm.entity_id,
  });

  const { products, storageLocations, purchaseOrders, shipments } = pageData.stableData;
  const subscriptionAccess = pageData.queries.tenantSubscriptionAccessQuery.data;

  // The URL is the source of truth for the selected work area. This preserves
  // the Notifications tab (and any other permitted tab) after a browser reload,
  // while keeping deep links and browser history synchronized with the UI.
  const requestedTabAllowed = enterpriseInventoryTabs.some(([key]) =>
    key === requestedTab && isEnterpriseInventoryTabAccessible(key, subscriptionAccess)
  );
  // Apply URL navigation changes (including browser Back and copied deep links)
  // and fail closed when a remembered tab is no longer accessible.
  useEffect(() => {
    const resolvedTab = requestedTabAllowed
      ? requestedTab
      : findFirstAccessibleEnterpriseInventoryTab(subscriptionAccess);
    if (activeTab !== resolvedTab) setActiveTabState(resolvedTab);
  }, [activeTab, requestedTab, requestedTabAllowed, subscriptionAccess]);

  const setActiveTab = useCallback((nextTab: SetStateAction<string>) => {
    const selected = typeof nextTab === 'function' ? nextTab(activeTab) : nextTab;
    if (!enterpriseInventoryTabs.some(([key]) =>
      key === selected && isEnterpriseInventoryTabAccessible(key, subscriptionAccess)
    )) return;
    if (selected === requestedTab) return;

    // Keep existing unrelated query parameters; avoid an extra browser history
    // entry for each tab click. The URL will be restored on reload or sharing.
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', selected);
    setSearchParams(nextParams, { replace: true });
    setActiveTabState(selected);
  }, [activeTab, requestedTab, searchParams, setSearchParams, subscriptionAccess]);

  const queryStatusInput = pageData.queries as unknown as Parameters<typeof getEnterpriseInventoryActiveTabLastUpdatedAt>[1];
  const activeTabQueryError = getEnterpriseInventoryActiveTabQueryError(activeTab, queryStatusInput, ui);
  const lastRefreshedAt = getEnterpriseInventoryActiveTabLastUpdatedAt(activeTab, queryStatusInput);

  const actions = useEnterpriseInventoryPageActions({
    formState,
    mutationFeedback,
    products,
    storageLocations,
    purchaseOrders,
    shipments,
    setErrorMessage,
    setStatusMessage,
  });

  return {
    actions,
    activeTab,
    errorMessage: errorMessage ?? activeTabQueryError,
    formState,
    pageData,
    lastRefreshedAt,
    refreshSystemContext,
    setActiveTab,
    statusMessage,
  };
}
