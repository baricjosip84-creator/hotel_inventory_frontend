import type { useProductPageViewModel } from './useProductPageViewModel';
import { TenantNavIcon } from '../../components/ui/TenantNavIcon';
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
    <div className="io-operational-page io-products-page products-workspace-page">
      <section className="products-workspace-hero">
        <div className="products-workspace-hero__icon">
          <TenantNavIcon path="/products" size={26} />
        </div>
        <div className="products-workspace-hero__copy">
          <span className="products-workspace-eyebrow">Product operations</span>
          <h2>Product workspace</h2>
          <p>
            Keep the tenant product catalog accurate, then move into costing only when you need valuation or review evidence. Technical record identifiers and version counters stay out of the normal catalog view.
          </p>
          <div className="products-workspace-badges">
            <span>Tenant-scoped</span>
            <span>{props.canManageProducts ? 'Catalog write access' : 'Catalog read-only'}</span>
            <span>Cost intelligence is read-only</span>
          </div>
        </div>
        <div className="products-workspace-hero__status">
          <strong>{props.totalProductsCount.toLocaleString()}</strong>
          <span>products in the current catalog scope</span>
        </div>
      </section>

      <nav className="products-workspace-tabs" aria-label="Product workspace views">
        {tabs.map((tab) => (
          <button
            key={tab.view}
            type="button"
            className={props.workspaceView === tab.view ? 'is-active' : ''}
            onClick={() => props.setWorkspaceView(tab.view)}
            aria-current={props.workspaceView === tab.view ? 'page' : undefined}
            title={tab.hint}
          >
            <TenantNavIcon path={tab.icon} size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
        <span className="products-workspace-tabs__hint">{activeTab.hint}</span>
      </nav>

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
