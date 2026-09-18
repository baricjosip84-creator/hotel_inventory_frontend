import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../../lib/api';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedDateTime } from '../../i18n/formatters';
import type { ProductItem } from '../../types/inventory';
import { fetchArchivedProducts, restoreProduct } from './productCoreApi';
import { styles } from './productStyles';

export function ArchivedProductsPanel({ canManageProducts }: { canManageProducts: boolean }) {
  const { locale, ui } = useAppTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const archivedQuery = useQuery({
    queryKey: ['products', 'archived'],
    queryFn: fetchArchivedProducts
  });

  const restoreMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: async (product) => {
      setError(null);
      setMessage(ui('Product restored successfully.'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-products'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-supplier-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
      await queryClient.invalidateQueries({ queryKey: ['products', 'archived'] });
      queryClient.setQueryData<ProductItem[]>(['products', 'archived'], (current = []) => current.filter((item) => item.id !== product.id));
    },
    onError: (restoreError) => {
      setMessage(null);
      setError(restoreError instanceof ApiError ? restoreError.message : ui('Failed to restore product.'));
    }
  });

  const archivedProducts = archivedQuery.data || [];

  const handleRestore = (product: ProductItem) => {
    if (!canManageProducts || restoreMutation.isPending) return;
    if (!window.confirm(ui('Restore {name} to the active Product catalog?').replace('{name}', product.name))) return;
    setMessage(null);
    setError(null);
    restoreMutation.mutate(product);
  };

  return (
    <section style={styles.panel}>
      <h3 style={styles.panelTitle}>{ui('Archived products')}</h3>
      <p style={styles.panelSubtitle}>{ui('Archived products stay out of normal inventory work until you restore them.')}</p>

      {message ? <div style={styles.successBox}>{message}</div> : null}
      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.tableWrapper}>
        <table style={styles.compactTable}>
          <thead>
            <tr>
              <th style={styles.th}>{ui('Product')}</th>
              <th style={styles.th}>{ui('SKU')}</th>
              <th style={styles.th}>{ui('Barcode')}</th>
              <th style={styles.th}>{ui('Archived')}</th>
              <th style={styles.th}>{ui('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {archivedQuery.isLoading ? (
              <tr><td style={styles.emptyCell} colSpan={5}>{ui('Loading…')}</td></tr>
            ) : archivedQuery.isError ? (
              <tr><td style={styles.emptyCell} colSpan={5}>{ui('Failed to load archived products.')}</td></tr>
            ) : archivedProducts.length === 0 ? (
              <tr><td style={styles.emptyCell} colSpan={5}>{ui('No archived products.')}</td></tr>
            ) : archivedProducts.map((product) => (
              <tr key={product.id}>
                <td style={styles.td}><div style={styles.rowTitle}>{product.name}</div></td>
                <td style={styles.td}>{product.sku || '—'}</td>
                <td style={styles.td}><span style={styles.barcodeValue}>{product.barcode || '—'}</span></td>
                <td style={styles.td}>{formatLocalizedDateTime(product.deleted_at, locale)}</td>
                <td style={styles.td}>
                  <button
                    type="button"
                    style={!canManageProducts ? styles.disabledButton : styles.secondaryButton}
                    disabled={!canManageProducts || restoreMutation.isPending}
                    onClick={() => handleRestore(product)}
                    title={!canManageProducts ? ui('Products write permission required') : undefined}
                  >
                    {ui('Restore')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
