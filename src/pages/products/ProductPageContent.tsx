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
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type ProductPageContentProps = ReturnType<typeof useProductPageViewModel>;

const tabs = [
  { view: 'catalog' as const, label: 'Catalog', icon: '/products', hint: 'Create, import, search, edit, package, and export products.' },
  { view: 'valuation' as const, label: 'Cost & value', icon: '/reports', hint: 'Review cost coverage and inventory valuation.' },
  { view: 'actions' as const, label: 'Cost review', icon: '/insights', hint: 'Work through cost exceptions and supporting evidence.' },
  { view: 'governance' as const, label: 'Cost controls', icon: '/audit', hint: 'Review finance-close controls and audit evidence.' }
];

export function ProductPageContent(props: ProductPageContentProps) {
  const { ui, locale } = useAppTranslation();
  const visibleTabs = props.canViewStock ? tabs : tabs.filter((tab) => tab.view === 'catalog');
  const activeTab = visibleTabs.find((tab) => tab.view === props.workspaceView) ?? visibleTabs[0];
  const catalogStatusValue = props.productsQuery.isLoading
    ? ui('Loading')
    : props.productsQuery.isError
      ? ui('Unavailable')
      : formatLocalizedNumber(Number(props.totalProductsCount), locale);

  return (
    <div className="io-operational-page io-products-page io-workspace-page products-workspace-page">
      <OperationalWorkspaceHero
        iconPath="/products"
        eyebrow={ui("Product operations")}
        title={ui("Product workspace")}
        description={ui("Keep the tenant product catalog accurate, then move into costing only when you need valuation or review evidence. Technical record identifiers and version counters stay out of the normal catalog view.")}
        meta={<>
          <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{props.canManageProducts ? ui('Catalog write access') : ui('Catalog read-only')}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Cost intelligence is read-only")}</OperationalWorkspaceMetaPill>
        </>}
        aside={<OperationalWorkspaceStatus value={catalogStatusValue} label={ui("products in the current catalog scope")} />}
      />

      <ProductSummaryStatsPanel summary={props.summary} productsQuery={props.productsQuery} canViewSuppliers={props.canViewSuppliers} canViewStock={props.canViewStock} />

      <OperationalWorkspaceTabs ariaLabel={ui("Product workspace views")} hint={ui(activeTab.hint)}>
        {visibleTabs.map((tab) => (
          <OperationalWorkspaceTab
            key={tab.view}
            active={props.workspaceView === tab.view}
            iconPath={tab.icon}
            label={ui(tab.label)}
            onClick={() => props.setWorkspaceView(tab.view)}
            title={ui(tab.hint)}
          />
        ))}
      </OperationalWorkspaceTabs>

      <ProductDetailSectionsPanel {...props} />

      {props.workspaceView === 'catalog' ? (
        <ProductManagementSectionsPanel {...props} />
      ) : (
        <ProductCostAnalyticsSectionsPanel {...props} />
      )}
    </div>
  );
}
