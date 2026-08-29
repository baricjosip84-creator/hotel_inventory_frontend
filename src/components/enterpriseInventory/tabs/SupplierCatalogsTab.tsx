import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { getActiveTenantCurrency } from '../../../lib/tenantCurrency';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedNumber } from '../../../i18n/formatters';
import { SupplierCatalogImportPanel } from '../../imports/SupplierCatalogImportPanel';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import type { ProductOption, SupplierCatalogForm, SupplierCatalogItem, SupplierOption } from '../EnterpriseInventoryTypes';

type SupplierCatalogQuery = { isLoading: boolean; data?: SupplierCatalogItem[] };
type CreateSupplierCatalogMutation = { isPending: boolean; mutate: (input: SupplierCatalogForm) => void };
type DeactivateSupplierCatalogMutation = { isPending: boolean; mutate: (item: SupplierCatalogItem) => void };

type Props = {
  createSupplierCatalogMutation: CreateSupplierCatalogMutation;
  deactivateSupplierCatalogMutation: DeactivateSupplierCatalogMutation;
  products: ProductOption[];
  setSupplierCatalogForm: Dispatch<SetStateAction<SupplierCatalogForm>>;
  supplierCatalogForm: SupplierCatalogForm;
  supplierCatalogQuery: SupplierCatalogQuery;
  suppliers: SupplierOption[];
};

function nonNegative(value: string): boolean {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function tenantFacingProductSku(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim();
  if (!normalized || /^LEGACY[-_]/i.test(normalized)) return null;
  return normalized;
}

export function SupplierCatalogsTab({ createSupplierCatalogMutation, deactivateSupplierCatalogMutation, products, setSupplierCatalogForm, supplierCatalogForm, supplierCatalogQuery, suppliers }: Props) {
  const { locale, ui } = useAppTranslation();
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const canRead = hasPermission(TENANT_PERMISSIONS.SUPPLIER_CATALOG_READ);
  const canWrite = hasPermission(TENANT_PERMISSIONS.SUPPLIER_CATALOG_WRITE);
  const canCreateProducts = hasPermission(TENANT_PERMISSIONS.PRODUCTS_WRITE);
  const leadTimeDays = Number(supplierCatalogForm.lead_time_days || 0);
  const canSave = canWrite
    && Boolean(supplierCatalogForm.supplier_id && supplierCatalogForm.product_id)
    && Number.isInteger(leadTimeDays)
    && leadTimeDays >= 0
    && nonNegative(supplierCatalogForm.min_order_quantity)
    && nonNegative(supplierCatalogForm.unit_cost)
    && /^[A-Za-z]{3}$/.test(supplierCatalogForm.currency.trim())
    && !createSupplierCatalogMutation.isPending;

  const formatNumber = (value: number | string | null | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 }) : '—';
  };
  const money = (value: number | string | null | undefined, currency?: string | null) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? formatLocalizedCurrency(parsed, currency || getActiveTenantCurrency(), locale, { maximumFractionDigits: 4 }) : '—';
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (supplierCatalogQuery.data ?? []).filter((item) => {
      if (supplierFilter && item.supplier_id !== supplierFilter) return false;
      if (!term) return true;
      return [item.supplier_name, item.supplier_sku, item.supplier_product_name, item.product_name, item.product_sku, item.product_barcode]
        .some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [search, supplierCatalogQuery.data, supplierFilter]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSave) createSupplierCatalogMutation.mutate(supplierCatalogForm);
  };

  const edit = (item: SupplierCatalogItem) => {
    setSupplierCatalogForm({
      supplier_id: item.supplier_id,
      product_id: item.product_id,
      supplier_sku: item.supplier_sku || '',
      supplier_product_name: item.supplier_product_name || '',
      lead_time_days: String(item.lead_time_days ?? 0),
      min_order_quantity: String(item.min_order_quantity ?? 0),
      preferred: Boolean(item.preferred),
      unit_cost: item.latest_unit_cost == null ? '' : String(item.latest_unit_cost),
      currency: item.latest_currency || getActiveTenantCurrency(),
      effective_from: item.latest_price_effective_from ? String(item.latest_price_effective_from).slice(0, 10) : new Date().toISOString().slice(0, 10)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deactivate = (item: SupplierCatalogItem) => {
    if (!canWrite || deactivateSupplierCatalogMutation.isPending) return;
    const itemLabel = item.supplier_sku || item.supplier_product_name || item.id;
    if (!window.confirm(ui('Deactivate supplier catalog item {item}? It will no longer be used for replenishment/procurement selection.').replace('{item}', itemLabel))) return;
    deactivateSupplierCatalogMutation.mutate(item);
  };

  return (
    <section style={styles.stack}>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Supplier catalog onboarding')}</h2>
        <p style={styles.helper}>{ui('A supplier catalog describes what a supplier can sell. It does not create stock. Import the catalog, review exact matches, explicitly create only the Products you actually want to manage, then receive physical stock through Opening Stock or PO → Shipment → Receiving.')}</p>
        <SupplierCatalogImportPanel suppliers={suppliers} canImport={canWrite} canCreateProducts={canCreateProducts} />
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Catalog filters')}</h2>
        <div style={styles.formGrid}>
          <InputField label={ui('Search catalog')} value={search} onChange={setSearch} />
          <SelectField label={ui('Supplier')} value={supplierFilter} onChange={setSupplierFilter} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} />
        </div>
        <p style={styles.helper}>{ui('Search supplier name, supplier SKU/item name, product name, product SKU, or barcode.')}</p>
      </div>

      <form onSubmit={submit} style={styles.card} data-skip-global-action-feedback="true">
        <h2 style={styles.cardTitle}>{ui('Manual supplier-product link')}</h2>
        <p style={{ ...styles.helper, marginBottom: 12 }}>{ui('Use this for one-off maintenance. Bulk supplier files should use the reviewed catalog import above.')}</p>
        <div style={styles.formGrid}>
          <SelectField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Supplier')} value={supplierCatalogForm.supplier_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_id: value }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} required />
          <SelectField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Product')} value={supplierCatalogForm.product_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => { const productSku = tenantFacingProductSku(product.sku); return { value: product.id, label: `${productSku ? `${productSku} · ` : ''}${product.name}` }; })} required />
          <InputField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Supplier SKU')} value={supplierCatalogForm.supplier_sku} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_sku: value }))} />
          <InputField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Supplier product name')} value={supplierCatalogForm.supplier_product_name} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_product_name: value }))} />
          <InputField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Lead time days')} type="number" min="0" value={supplierCatalogForm.lead_time_days} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, lead_time_days: value }))} />
          <InputField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Minimum order quantity')} type="number" min="0" value={supplierCatalogForm.min_order_quantity} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, min_order_quantity: value }))} />
          <InputField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Unit cost')} type="number" min="0" value={supplierCatalogForm.unit_cost} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, unit_cost: value }))} />
          <InputField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Currency')} value={supplierCatalogForm.currency} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, currency: value.toUpperCase().slice(0, 3) }))} />
          <InputField disabled={!canWrite || createSupplierCatalogMutation.isPending} label={ui('Effective from')} type="date" value={supplierCatalogForm.effective_from} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, effective_from: value }))} />
        </div>
        <label style={styles.checkboxRow}><input type="checkbox" disabled={!canWrite || createSupplierCatalogMutation.isPending} checked={supplierCatalogForm.preferred} onChange={(event) => setSupplierCatalogForm((current) => ({ ...current, preferred: event.target.checked }))} />{ui('Preferred supplier for this product')}</label>
        <p style={{ ...styles.helper, marginBottom: 12 }}>{ui('Only one active supplier catalog item can be preferred for a product. Saving a new preferred supplier automatically demotes the previous preferred item.')}</p>
        {!canWrite ? <p style={styles.helper}>{ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.SUPPLIER_CATALOG_WRITE)}</p> : null}
        <button type="submit" disabled={!canSave} style={canSave ? styles.primaryButton : styles.disabledButton}>{createSupplierCatalogMutation.isPending ? ui('Saving…') : ui('Save supplier catalog item')}</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Active supplier catalog')}</h2>
        {!canRead ? <p style={styles.helper}>{ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.SUPPLIER_CATALOG_READ)}</p> : supplierCatalogQuery.isLoading ? <p style={styles.helper}>{ui('Loading…')}</p> : !rows.length ? <p style={styles.helper}>{ui('No matching supplier catalog items.')}</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Supplier', 'Product', 'Supplier item', 'Terms', 'Price', 'Preferred', 'Actions'].map((header) => <th key={header} style={styles.th}>{ui(header)}</th>)}</tr></thead>
              <tbody>{rows.map((item) => {
                const productSku = tenantFacingProductSku(item.product_sku);
                return <tr key={item.id}>
                  <td style={styles.td}>{item.supplier_name || ui('Supplier')}</td>
                  <td style={styles.td}><strong>{item.product_name || ui('Unnamed product')}</strong>{productSku ? <div style={styles.muted}>{ui('SKU {sku}').replace('{sku}', productSku)}</div> : null}{item.product_barcode ? <div style={styles.muted}>{ui('Barcode {barcode}').replace('{barcode}', item.product_barcode)}</div> : null}</td>
                  <td style={styles.td}><strong>{item.supplier_sku || '—'}</strong><br />{item.supplier_product_name || '—'}</td>
                  <td style={styles.td}>{ui('{days} days').replace('{days}', formatNumber(item.lead_time_days))}<br />{ui('MOQ {quantity}').replace('{quantity}', formatNumber(item.min_order_quantity))}</td>
                  <td style={styles.td}>{money(item.latest_unit_cost, item.latest_currency)}<br /><span style={styles.muted}>{item.latest_price_effective_from ? ui('from {date}').replace('{date}', formatLocalizedDate(item.latest_price_effective_from, locale)) : ''}</span></td>
                  <td style={styles.td}>{item.preferred ? ui('Yes') : ui('No')}</td>
                  <td style={styles.td}><div style={styles.actions}><button type="button" style={styles.secondarySmallButton} disabled={!canWrite} onClick={() => edit(item)}>{ui('Edit')}</button><button type="button" style={styles.dangerButton} disabled={!canWrite || deactivateSupplierCatalogMutation.isPending} onClick={() => deactivate(item)}>{ui('Deactivate')}</button></div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
