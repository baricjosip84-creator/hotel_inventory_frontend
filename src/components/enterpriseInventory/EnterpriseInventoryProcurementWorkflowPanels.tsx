import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { InvoicesTab } from "./tabs/InvoicesTab";
import { RequisitionsTab } from "./tabs/RequisitionsTab";
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
    createSupplierCatalogMutation,
    createSupplierInvoiceMutation,
    executeApprovalMutation,
  } = actions;

  return (
    <>
      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="requisitions">
        <RequisitionsTab
          createRequisitionMutation={createRequisitionMutation}
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

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="invoices">
        <InvoicesTab
          createSupplierCatalogMutation={createSupplierCatalogMutation}
          createSupplierInvoiceMutation={createSupplierInvoiceMutation}
          invoicesQuery={invoicesQuery}
          products={products}
          purchaseOrders={purchaseOrders}
          setSupplierCatalogForm={setSupplierCatalogForm}
          setSupplierInvoiceForm={setSupplierInvoiceForm}
          shipments={shipments}
          supplierCatalogForm={supplierCatalogForm}
          supplierCatalogQuery={supplierCatalogQuery}
          supplierInvoiceForm={supplierInvoiceForm}
          suppliers={suppliers}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
