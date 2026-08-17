import type { CSSProperties } from 'react';

export const productLayoutStyles: Record<string, CSSProperties> = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  costReadinessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px',
    marginBottom: '16px'
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: 'clamp(24px, 2.3vw, 32px)',
    fontWeight: 700,
    lineHeight: 1.15,
    overflowWrap: 'anywhere',
    marginBottom: '8px'
  },
  statValueGood: {
    fontSize: 'clamp(24px, 2.3vw, 32px)',
    fontWeight: 700,
    lineHeight: 1.15,
    overflowWrap: 'anywhere',
    marginBottom: '8px',
    color: '#166534'
  },
  statValueWarn: {
    fontSize: 'clamp(24px, 2.3vw, 32px)',
    fontWeight: 700,
    lineHeight: 1.15,
    overflowWrap: 'anywhere',
    marginBottom: '8px',
    color: '#92400e'
  },
  statValueBad: {
    fontSize: 'clamp(24px, 2.3vw, 32px)',
    fontWeight: 700,
    lineHeight: 1.15,
    overflowWrap: 'anywhere',
    marginBottom: '8px',
    color: '#b91c1c'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: 1.4
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '18px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '8px',
    fontSize: '20px',
    fontWeight: 700
  },
  panelSubtitle: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#64748b',
    lineHeight: 1.5
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 700
  },
  packageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: '10px'
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  packageTableBlock: {
    marginTop: '18px'
  },
};
