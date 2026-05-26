import type { CSSProperties } from 'react';

export const productRiskStyles: Record<string, CSSProperties> = {
  riskGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '14px',
    marginTop: '14px'
  },
  riskCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '14px'
  },
  riskList: {
    display: 'grid',
    gap: '10px'
  },
  riskListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '10px 0',
    borderTop: '1px solid #f3f4f6'
  },
};
