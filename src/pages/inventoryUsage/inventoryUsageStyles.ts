import type { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  heroCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
    padding: '1.25rem',
    border: '1px solid #dbe4ef',
    borderRadius: '1rem',
    background: '#f8fafc'
  },
  eyebrow: {
    margin: 0,
    fontSize: '0.78rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#2563eb'
  },
  title: {
    margin: '0.25rem 0',
    fontSize: '1.75rem',
    color: '#0f172a'
  },
  subtitle: {
    margin: 0,
    maxWidth: '58rem',
    color: '#475569',
    lineHeight: 1.6
  },
  heroActions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  primaryButton: {
    border: 0,
    borderRadius: '0.75rem',
    background: '#2563eb',
    color: 'white',
    padding: '0.75rem 1rem',
    fontWeight: 800,
    cursor: 'pointer'
  },
  dangerButton: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '0.75rem',
    color: '#991b1b',
    cursor: 'pointer',
    fontWeight: 700,
    padding: '0.55rem 0.8rem'
  },

  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '0.75rem',
    background: 'white',
    color: '#0f172a',
    padding: '0.75rem 1rem',
    fontWeight: 800,
    cursor: 'pointer'
  },
  filterCard: {
    padding: '1rem',
    border: '1px solid #dbe4ef',
    borderRadius: '1rem',
    background: 'white'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  sectionTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: '1.05rem'
  },
  sectionDescription: {
    margin: '0.25rem 0 0',
    color: '#64748b',
    lineHeight: 1.5
  },
  successPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '0.25rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    background: '#dcfce7',
    color: '#166534'
  },
  warningPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '0.25rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    background: '#fef3c7',
    color: '#92400e'
  },
  dangerPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '0.25rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    background: '#fee2e2',
    color: '#991b1b'
  },
  filterPill: {
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    padding: '0.35rem 0.7rem',
    fontSize: '0.8rem',
    fontWeight: 800
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.85rem',
    marginTop: '1rem'
  },
  checkboxLabel: {
    alignItems: 'center',
    color: '#374151',
    display: 'flex',
    fontSize: '0.9rem',
    fontWeight: 600,
    gap: '0.5rem'
  },

  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    color: '#334155',
    fontWeight: 700,
    fontSize: '0.85rem'
  },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: '0.75rem',
    padding: '0.7rem 0.8rem',
    font: 'inherit',
    color: '#0f172a',
    background: 'white'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.85rem'
  },
  statCard: {
    padding: '1rem',
    border: '1px solid #dbe4ef',
    borderRadius: '1rem',
    background: 'white'
  },
  statLabel: {
    display: 'block',
    color: '#64748b',
    fontSize: '0.82rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  statValue: {
    display: 'block',
    marginTop: '0.35rem',
    fontSize: '2rem',
    color: '#0f172a'
  },
  statValueSmall: {
    display: 'block',
    marginTop: '0.55rem',
    fontSize: '0.95rem',
    color: '#0f172a'
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem'
  },
  card: {
    padding: '1rem',
    border: '1px solid #dbe4ef',
    borderRadius: '1rem',
    background: 'white'
  },
  cardWide: {
    gridColumn: '1 / -1',
    padding: '1rem',
    border: '1px solid #dbe4ef',
    borderRadius: '1rem',
    background: 'white'
  },
  breakdownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    marginTop: '0.85rem'
  },
  breakdownRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    gap: '0.85rem',
    alignItems: 'center',
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.75rem',
    color: '#0f172a'
  },
  breakdownRowStacked: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '0.35rem 0.85rem',
    alignItems: 'center',
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.75rem',
    color: '#0f172a'
  },
  trendList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.75rem',
    marginTop: '0.85rem'
  },
  trendRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    padding: '0.85rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.85rem',
    background: '#f8fafc',
    color: '#0f172a'
  },
  tableWrap: {
    width: '100%',
    overflowX: 'auto',
    marginTop: '0.85rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '760px'
  },
  th: {
    textAlign: 'left',
    padding: '0.7rem',
    borderBottom: '1px solid #cbd5e1',
    color: '#475569',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  td: {
    padding: '0.75rem 0.7rem',
    borderBottom: '1px solid #e2e8f0',
    color: '#0f172a',
    verticalAlign: 'top'
  },
  reviewRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e2e8f0'
  },
  inlineActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },

  contextCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem'
  },
  emptyState: {
    margin: '0.85rem 0 0',
    color: '#64748b',
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '0.75rem',
    padding: '0.85rem'
  },

  governanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '0.75rem',
    marginTop: '0.85rem'
  },
  governanceCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    padding: '0.85rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.85rem',
    background: '#f8fafc',
    color: '#334155'
  },
  governanceCardWide: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    gridColumn: '1 / -1',
    padding: '0.85rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.85rem',
    background: '#f8fafc',
    color: '#334155'
  },
  errorText: {
    color: '#b91c1c',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.75rem',
    padding: '0.85rem'
  },

  importPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '1rem',
    padding: '0.85rem',
    border: '1px dashed #cbd5e1',
    borderRadius: '0.85rem',
    background: '#f8fafc'
  },
  textarea: {
    border: '1px solid #cbd5e1',
    borderRadius: '0.75rem',
    padding: '0.7rem 0.8rem',
    font: 'inherit',
    color: '#0f172a',
    background: 'white',
    resize: 'vertical'
  },
  inlineActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem'
  },

  bulkLineGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(220px, 1.2fr) minmax(120px, 0.6fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr) auto',
    gap: '0.75rem',
    alignItems: 'end',
    marginTop: '0.75rem'
  },
  bulkFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '1rem'
  },

  subsectionTitle: {
    margin: '0 0 0.75rem',
    color: '#0f172a',
    fontSize: '0.95rem'
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 0.8fr)',
    gap: '1rem',
    marginTop: '1rem'
  },
  templateBuilderCard: {
    padding: '1rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.85rem',
    background: '#f8fafc'
  },
  templateListCard: {
    padding: '1rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.85rem',
    background: 'white'
  },
  templateList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  templateCard: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    alignItems: 'flex-start',
    padding: '0.85rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.85rem',
    background: '#f8fafc'
  },

  templateMetrics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginTop: '0.65rem'
  },
  templateActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    alignItems: 'flex-end'
  },
  templateMeta: {
    margin: '0.25rem 0',
    color: '#475569',
    fontSize: '0.85rem',
    fontWeight: 700
  },
  mutedText: {
    color: '#64748b'
  },
  successText: {
    color: '#166534',
    fontWeight: 700,
    margin: '0.75rem 0 0'
  },
  warningText: {
    color: '#92400e',
    fontWeight: 700,
    margin: '0.75rem 0 0'
  },
};
