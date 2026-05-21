import type { CSSProperties, ReactNode } from 'react';

export function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
      {helper ? <span style={styles.metricHelper}>{helper}</span> : null}
    </div>
  );
}

export function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  min
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        style={styles.input}
        type={type}
        value={value}
        required={required}
        min={type === 'number' ? min : undefined}
        step={type === 'number' ? '0.0001' : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}


export function TextareaField({
  label,
  value,
  onChange,
  required = false,
  rows = 3
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <textarea
        style={styles.textarea}
        value={value}
        required={required}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <select style={styles.input} value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        <option value="">{required ? 'Select…' : 'None'}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}


export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function DataTable({ loading, empty, headers, rows }: { loading: boolean; empty: string; headers: string[]; rows: string[][] }) {
  if (loading) return <p style={styles.helper}>Loading…</p>;
  if (!rows.length) return <p style={styles.helper}>{empty}</p>;

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>{headers.map((header) => <th key={header} style={styles.th}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} style={styles.td}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EnterpriseInventoryHero({
  onEvaluateParLevels,
  evaluating
}: {
  onEvaluateParLevels: () => void;
  evaluating: boolean;
}) {
  return (
    <section style={styles.hero}>
      <div>
        <p style={styles.eyebrow}>Enterprise inventory operations</p>
        <h1 style={styles.title}>Traceability, controls, and operational workflows</h1>
        <p style={styles.subtitle}>
          Use the backend enterprise inventory API added at /enterprise-inventory for par levels,
          cycle counts, requisitions, approvals, invoices, notifications, and labels.
        </p>
      </div>
      <button
        type="button"
        onClick={onEvaluateParLevels}
        disabled={evaluating}
        style={styles.primaryButton}
      >
        {evaluating ? 'Evaluating…' : 'Evaluate par levels'}
      </button>
    </section>
  );
}

export function StatusMessages({ statusMessage, errorMessage }: { statusMessage: string | null; errorMessage: string | null }) {
  return (
    <>
      {statusMessage ? <div style={styles.success}>{statusMessage}</div> : null}
      {errorMessage ? <div style={styles.error}>{errorMessage}</div> : null}
    </>
  );
}

export const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  hero: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: 20, border: '1px solid #e5e7eb', borderRadius: 16, background: '#ffffff' },
  eyebrow: { margin: 0, color: '#2563eb', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.08 },
  title: { margin: '6px 0', fontSize: 28, lineHeight: 1.15 },
  subtitle: { margin: 0, color: '#4b5563', maxWidth: 760 },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tab: { border: '1px solid #d1d5db', background: '#ffffff', borderRadius: 999, padding: '8px 12px', cursor: 'pointer' },
  activeTab: { border: '1px solid #2563eb', background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 20, alignItems: 'start' },
  stack: { display: 'flex', flexDirection: 'column', gap: 20 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 14 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 },
  metricCard: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, background: '#f9fafb' },
  metricLabel: { display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 700 },
  metricValue: { display: 'block', fontSize: 22, color: '#111827' },
  metricHelper: { display: 'block', fontSize: 12, color: '#6b7280', marginTop: 4, textTransform: 'capitalize' },
  card: { padding: 18, border: '1px solid #e5e7eb', borderRadius: 16, background: '#ffffff', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' },
  cardTitle: { margin: '0 0 14px', fontSize: 18 },
  sectionTitle: { margin: '0 0 14px', fontSize: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: 700, color: '#374151' },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', font: 'inherit' },
  textarea: { width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', font: 'inherit', resize: 'vertical' },
  inlineGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  inlineInput: { minWidth: 180, border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 10px', font: 'inherit' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#374151', fontWeight: 700 },
  primaryButton: { border: 0, background: '#2563eb', color: '#ffffff', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#ffffff', color: '#111827', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  smallButton: { border: 0, background: '#2563eb', color: '#ffffff', borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer' },
  secondarySmallButton: { border: '1px solid #d1d5db', background: '#ffffff', color: '#111827', borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer' },
  dangerButton: { border: 0, background: '#dc2626', color: '#ffffff', borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer' },
  disabledButton: { border: 0, background: '#9ca3af', color: '#ffffff', borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'not-allowed' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  success: { padding: '10px 12px', borderRadius: 12, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' },
  error: { padding: '10px 12px', borderRadius: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
  helper: { margin: 0, color: '#6b7280' },
  muted: { margin: '0 0 8px', color: '#6b7280', fontSize: 12, wordBreak: 'break-all' },
  pre: { margin: 0, padding: 12, borderRadius: 10, background: '#111827', color: '#f9fafb', overflowX: 'auto', fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e5e7eb', padding: '8px 10px', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '10px', verticalAlign: 'top' }
};
