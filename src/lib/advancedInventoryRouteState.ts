/** Advanced Inventory location state belongs to the URL, never only component memory. */
export const ADVANCED_INVENTORY_TABS = [
  'integrations', 'serials', 'uom', 'custom-fields', 'landed-cost',
  'variants', 'hierarchy', 'bom', 'mobile'
] as const;

export type AdvancedInventoryTab = typeof ADVANCED_INVENTORY_TABS[number];

export type AdvancedInventoryRouteState = {
  tab: AdvancedInventoryTab;
  uomProductId: string;
};

export function readAdvancedInventoryRouteState(params: URLSearchParams): AdvancedInventoryRouteState {
  const raw = params.get('capability_tab') || 'serials';
  const tab: AdvancedInventoryTab = ADVANCED_INVENTORY_TABS.includes(raw as AdvancedInventoryTab)
    ? raw as AdvancedInventoryTab : 'serials';
  return {
    tab,
    uomProductId: tab === 'uom' ? (params.get('uom_product_id') || '').trim() : ''
  };
}

export type AdvancedInventoryRouteUpdate =
  | { type: 'tab'; tab: AdvancedInventoryTab }
  | { type: 'uom-product'; productId: string };

export function updateAdvancedInventoryRouteParams(
  params: URLSearchParams,
  update: AdvancedInventoryRouteUpdate
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (update.type === 'tab') {
    if (update.tab === 'serials') next.delete('capability_tab');
    else next.set('capability_tab', update.tab);
    if (update.tab !== 'uom') next.delete('uom_product_id');
  } else {
    next.set('capability_tab', 'uom');
    if (update.productId.trim()) next.set('uom_product_id', update.productId.trim());
    else next.delete('uom_product_id');
  }
  return next;
}
