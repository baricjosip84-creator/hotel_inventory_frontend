import type { useProductPageViewModel } from './useProductPageViewModel';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../../components/ui/OperationalWorkspace';
import { ProductCostAnalyticsSectionsPanel } from './ProductCostAnalyticsSectionsPanel';
import { ProductSummaryStatsPanel } from './ProductSummaryStatsPanel';
import { ProductManagementSectionsPanel } from './ProductManagementSectionsPanel';
import { ProductDetailSectionsPanel } from './ProductDetailSectionsPanel';
import './ProductsPage.css';

type ProductPageContentProps = ReturnType<typeof useProductPageViewModel>;

const tabs = [
  { view: 'catalog' as const, label: 'Catalog', icon: '/products', hint: 'Create, import, search, edit, package, and export products.' },
  { view: 'valuation' as const, label: 'Cost & value', icon: '/reports', hint: 'Review cost coverage and inventory valuation.' },
  { view: 'actions' as const, label: 'Cost review', icon: '/insights', hint: 'Work through cost exceptions and supporting evidence.' },
  { view: 'governance' as const, label: 'Cost controls', icon: '/audit', hint: 'Review finance-close controls and audit evidence.' }
];

export function ProductPageContent(props: ProductPageContentProps) {
  const activeTab = tabs.find((tab) => tab.view === props.workspaceView) ?? tabs[0];

  return (
    <div className="io-operational-page io-products-page io-workspace-page products-workspace-page">
      <OperationalWorkspaceHero
        iconPath="/products"
        eyebrow="Product operations"
        title="Product workspace"
        description="Keep the tenant product catalog accurate, then move into costing only when you need valuation or review evidence. Technical record identifiers and version counters stay out of the normal catalog view."
        meta={<>
          <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{props.canManageProducts ? 'Catalog write access' : 'Catalog read-only'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Cost intelligence is read-only</OperationalWorkspaceMetaPill>
        </>}
        aside={<OperationalWorkspaceStatus value={props.totalProductsCount.toLocaleString()} label="products in the current catalog scope" />}
      />

      <OperationalWorkspaceTabs ariaLabel="Product workspace views" hint={activeTab.hint}>
        {tabs.map((tab) => (
          <OperationalWorkspaceTab
            key={tab.view}
            active={props.workspaceView === tab.view}
            iconPath={tab.icon}
            label={tab.label}
            onClick={() => props.setWorkspaceView(tab.view)}
            title={tab.hint}
          />
        ))}
      </OperationalWorkspaceTabs>

      <ProductDetailSectionsPanel {...props} />

      {props.workspaceView === 'catalog' ? (
        <>
          <ProductSummaryStatsPanel summary={props.summary} />
          <ProductManagementSectionsPanel {...props} />
        </>
      ) : (
        <ProductCostAnalyticsSectionsPanel {...props} />
      )}
    </div>
  );
}
