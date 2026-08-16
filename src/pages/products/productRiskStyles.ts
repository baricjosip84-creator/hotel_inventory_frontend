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
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '14px'
  },
  riskListCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '14px'
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
    borderTop: '1px solid #e2e8f0'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '12px',
    marginBottom: '14px'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '12px',
    alignItems: 'end',
    marginBottom: '14px'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: '5px 9px',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: 'nowrap'
  },
  statusBadgeGood: {
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    color: '#166534'
  },
  statusBadgeWarn: {
    border: '1px solid #fed7aa',
    background: '#fff7ed',
    color: '#9a3412'
  },
  statusBadgeBad: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#b91c1c'
  },
  statusBadgeNeutral: {
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    color: '#1d4ed8'
  },
  rowMeta: {
    marginTop: '4px',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: 1.35,
    overflowWrap: 'anywhere'
  },
  noteList: {
    margin: '14px 0 0',
    paddingLeft: '20px',
    color: '#334155',
    lineHeight: 1.55
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: 600,
    lineHeight: 1.45
  }
};
