import { useEffect, useState } from "react";
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

function findInitialEnterpriseInventoryTab() {
  return isEnterpriseInventoryTabAccessible("par-levels")
    ? "par-levels"
    : findFirstAccessibleEnterpriseInventoryTab();
}

export function useEnterpriseInventoryPageController() {
  const { ui } = useAppTranslation();
  const [activeTab, setActiveTab] = useState(findInitialEnterpriseInventoryTab);
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
    shipmentReceivingShipmentId: shipmentReceivingForm.shipment_id,
    alertFilters,
    auditFilters,
    attachmentEntityType: attachmentForm.entity_type,
    attachmentEntityId: attachmentForm.entity_id,
  });

  const { products, purchaseOrders, shipments } = pageData.stableData;
  const subscriptionAccess = pageData.queries.tenantSubscriptionAccessQuery.data;

  useEffect(() => {
    const activeTabAllowed = enterpriseInventoryTabs.some(([key]) =>
      key === activeTab && isEnterpriseInventoryTabAccessible(key, subscriptionAccess)
    );

    if (!activeTabAllowed) {
      setActiveTab(findFirstAccessibleEnterpriseInventoryTab(subscriptionAccess));
    }
  }, [activeTab, subscriptionAccess]);

  const queryStatusInput = pageData.queries as unknown as Parameters<typeof getEnterpriseInventoryActiveTabLastUpdatedAt>[1];
  const activeTabQueryError = getEnterpriseInventoryActiveTabQueryError(activeTab, queryStatusInput, ui);
  const lastRefreshedAt = getEnterpriseInventoryActiveTabLastUpdatedAt(activeTab, queryStatusInput);

  const actions = useEnterpriseInventoryPageActions({
    formState,
    mutationFeedback,
    products,
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
