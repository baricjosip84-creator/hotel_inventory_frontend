import type { CSSProperties } from 'react';

type BrandAccent = 'blue' | 'red';

type Props = { compact?: boolean; tone?: 'light' | 'dark'; accent?: BrandAccent; style?: CSSProperties };

export function InventoryMark({ size = 36, tone = 'light', accent = 'blue' }: { size?: number; tone?: 'light' | 'dark'; accent?: BrandAccent }) {
  const stroke = accent === 'red'
    ? (tone === 'dark' ? '#f2c5c5' : '#d14343')
    : (tone === 'dark' ? '#dbeafe' : '#2563eb');
  const accentColor = accent === 'red'
    ? (tone === 'dark' ? '#ef8b8b' : '#b93636')
    : (tone === 'dark' ? '#60a5fa' : '#1d4ed8');
  const inner = tone === 'dark' ? '#ffffff' : '#0f172a';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 3.5 42 13.8v20.4L24 44.5 6 34.2V13.8L24 3.5Z" fill="none" stroke={stroke} strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M6.8 14.4 24 24.1l17.2-9.7M24 24.1v19.1" fill="none" stroke={accentColor} strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="m15.2 18.9 8.8-5 8.8 5-8.8 5-8.8-5Z" fill={inner} opacity="0.96" />
    </svg>
  );
}

export function InventoryBrand({ compact = false, tone = 'light', accent = 'blue', style }: Props) {
  const textColor = tone === 'dark' ? '#fff' : '#0f172a';
  const muted = tone === 'dark' ? 'rgba(255,255,255,.58)' : '#64748b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 12, minWidth: 0, ...style }}>
      <InventoryMark size={compact ? 34 : 42} tone={tone} accent={accent} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: textColor, fontWeight: 800, fontSize: compact ? 16 : 20, lineHeight: 1.05, letterSpacing: '-.02em' }}>Inventory Operations</div>
        {!compact ? <div style={{ color: muted, fontSize: 10, marginTop: 4, fontWeight: 700, letterSpacing: '.06em' }}>INVENTORY OPERATIONS PLATFORM</div> : null}
      </div>
    </div>
  );
}
