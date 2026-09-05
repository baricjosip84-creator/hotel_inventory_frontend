import type { CSSProperties } from 'react';

export function SidebarAttentionMarker({ label }: { label: string }) {
  return (
    <span
      data-sidebar-attention-item-marker="true"
      style={styles.badge}
      title={label}
    >
      <span aria-hidden="true" style={styles.dot} />
      {label}
    </span>
  );
}


export function SidebarAttentionTabDot({ label }: { label: string }) {
  return (
    <span
      data-sidebar-attention-tab-marker="true"
      aria-label={label}
      title={label}
      style={styles.tabDot}
    />
  );
}


const styles: Record<string, CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid #fecaca',
    borderRadius: 999,
    background: '#fff1f2',
    color: '#991b1b',
    padding: '4px 8px',
    fontSize: 12,
    lineHeight: 1.2,
    fontWeight: 800,
    whiteSpace: 'nowrap'
  },
  tabDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: 999,
    background: '#dc2626',
    boxShadow: '0 0 0 2px rgba(220,38,38,0.10)',
    flex: '0 0 auto'
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: '#dc2626',
    flex: '0 0 auto'
  }
};
