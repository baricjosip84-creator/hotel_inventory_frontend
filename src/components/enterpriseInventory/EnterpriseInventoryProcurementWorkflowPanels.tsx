import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { InvoicesTab } from "./tabs/InvoicesTab";
import { SupplierCatalogsTab } from "./tabs/SupplierCatalogsTab";
import { RequisitionsTab } from "./tabs/RequisitionsTab";
import { SupplierReturnsTab } from "./tabs/SupplierReturnsTab";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryProcurementWorkflowPanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryPanelBaseProps) {
  const {
    approvalRuleForm,
    requisitionForm,
    setApprovalRuleForm,
    setRequisitionForm,
    setSupplierCatalogForm,
    setSupplierInvoiceForm,
    supplierCatalogForm,
    supplierInvoiceForm,
  } = formState;

  const { queries, stableData, viewData } = pageData;

  const {
    approvalRulesQuery,
    invoicesQuery,
    requisitionsQuery,
    supplierCatalogQuery,
  } = queries;

  const { products, purchaseOrders, shipments, storageLocations, suppliers } =
    stableData;

  const { approvalQueue } = viewData;

  const {
    createApprovalRuleMutation,
    createRequisitionMutation,
    submitRequisitionMutation,
    createSupplierCatalogMutation,
    deactivateSupplierCatalogMutation,
    createSupplierInvoiceMutation,
    updateSupplierInvoiceMutation,
    supplierInvoiceLifecycleMutation,
    executeApprovalMutation,
  } = actions;

  return (
    <>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="supplier-returns">
        <SupplierReturnsTab />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="requisitions">
        <RequisitionsTab
          createRequisitionMutation={createRequisitionMutation}
          submitRequisitionMutation={submitRequisitionMutation}
          products={products}
          requisitionForm={requisitionForm}
          requisitionsQuery={requisitionsQuery}
          setRequisitionForm={setRequisitionForm}
          storageLocations={storageLocations}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="approvals">
        <ApprovalsTab
          approvalQueue={approvalQueue}
          approvalRuleForm={approvalRuleForm}
          approvalRulesQuery={approvalRulesQuery}
          createApprovalRuleMutation={createApprovalRuleMutation}
          executeApprovalMutation={executeApprovalMutation}
          setApprovalRuleForm={setApprovalRuleForm}
          storageLocations={storageLocations}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="supplier-catalog">
        <SupplierCatalogsTab
          createSupplierCatalogMutation={createSupplierCatalogMutation}
          deactivateSupplierCatalogMutation={deactivateSupplierCatalogMutation}
          products={products}
          setSupplierCatalogForm={setSupplierCatalogForm}
          supplierCatalogForm={supplierCatalogForm}
          supplierCatalogQuery={supplierCatalogQuery}
          suppliers={suppliers}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="invoices">
        <InvoicesTab
          createSupplierInvoiceMutation={createSupplierInvoiceMutation}
          updateSupplierInvoiceMutation={updateSupplierInvoiceMutation}
          supplierInvoiceLifecycleMutation={supplierInvoiceLifecycleMutation}
          invoicesQuery={invoicesQuery}
          products={products}
          purchaseOrders={purchaseOrders}
          setSupplierInvoiceForm={setSupplierInvoiceForm}
          shipments={shipments}
          supplierInvoiceForm={supplierInvoiceForm}
          suppliers={suppliers}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
