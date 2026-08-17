import type { CSSProperties } from 'react';

export const productTableStyles: Record<string, CSSProperties> = {
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  tableWrapperCompact: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  compactTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '760px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '980px'
  },
  packageTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '860px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#64748b'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '14px',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#64748b'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: 1.4,
    overflowWrap: 'anywhere'
  },
  fieldHint: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#64748b',
    lineHeight: 1.4
  },
  barcodeValue: {
    fontFamily: 'monospace',
    fontSize: '13px',
    overflowWrap: 'anywhere'
  },
  badgeVersion: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '12px'
  },
  defaultBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#f0fdf4',
    color: '#166534',
    fontWeight: 700,
    fontSize: '12px'
  },
  rowTitleWarn: {
    fontWeight: 700,
    marginBottom: '6px',
    color: '#b45309'
  },
  rowBadgeGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '8px'
  },
  miniBadge: {
    display: 'inline-block',
    padding: '3px 7px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '11px'
  },
  miniBadgeWarn: {
    display: 'inline-block',
    marginTop: '6px',
    padding: '3px 7px',
    borderRadius: '999px',
    background: '#fff7ed',
    color: '#b45309',
    fontWeight: 700,
    fontSize: '11px'
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
};
