import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { useAppTranslation } from '../../i18n/I18nContext';

type UomConversion = {
  uom_code: string;
  uom_name?: string | null;
  purchase_uom?: boolean;
  issue_uom?: boolean;
};

type UomResponse = {
  base_uom: string;
  conversions: UomConversion[];
};

type ProductUomSelectProps = {
  productId: string;
  value: string;
  onChange: (value: string) => void;
  purpose?: 'purchase' | 'issue' | 'any';
  disabled?: boolean;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

export default function ProductUomSelect({
  productId,
  value,
  onChange,
  purpose = 'any',
  disabled = false,
  style,
  ariaLabel = 'Unit of measure'
}: ProductUomSelectProps) {
  const { ui } = useAppTranslation();
  const query = useQuery({
    queryKey: ['product-uom-options', productId],
    enabled: Boolean(productId),
    queryFn: () => apiRequest<UomResponse>(`/inventory-capabilities/products/${productId}/uom`),
    staleTime: 60_000
  });

  const options = query.data
    ? [
        { code: query.data.base_uom, label: `${query.data.base_uom} (${ui('base')})` },
        ...query.data.conversions
          .filter((row) => purpose === 'any' || (purpose === 'purchase' ? row.purchase_uom !== false : row.issue_uom !== false))
          .map((row) => ({ code: row.uom_code, label: `${row.uom_code}${row.uom_name ? ` — ${row.uom_name}` : ''}` }))
      ]
    : [];
  const knownCodes = new Set(options.map((row) => row.code.toUpperCase()));
  const preservedValue = value && !knownCodes.has(value.toUpperCase()) ? value : '';

  return (
    <select
      style={style}
      aria-label={ariaLabel}
      disabled={disabled || !productId || query.isLoading}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{query.data?.base_uom ? `${query.data.base_uom} (${ui('base')})` : ui('Base unit')}</option>
      {preservedValue ? <option value={preservedValue}>{preservedValue}</option> : null}
      {options.map((row) => <option key={row.code} value={row.code}>{row.label}</option>)}
    </select>
  );
}
