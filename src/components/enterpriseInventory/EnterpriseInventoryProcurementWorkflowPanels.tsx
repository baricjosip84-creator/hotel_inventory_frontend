import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { InvoicesTab } from "./tabs/InvoicesTab";
import { SupplierCatalogsTab } from "./tabs/SupplierCatalogsTab";
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
    setApprovalRuleForm,
    setSupplierCatalogForm,
    setSupplierInvoiceForm,
    supplierCatalogForm,
    supplierInvoiceForm,
  } = formState;

  const { queries, stableData, viewData } = pageData;

  const {
    approvalRulesQuery,
    invoicesQuery,
    supplierCatalogQuery,
  } = queries;

  const { products, purchaseOrders, shipments, storageLocations, suppliers } =
    stableData;

  const { approvalQueue } = viewData;

  const {
    createApprovalRuleMutation,
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
