import type { ReactNode } from 'react';
import { styles } from './EnterpriseInventoryStyles';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedDateTime } from '../../i18n/formatters';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
} from '../ui/OperationalWorkspace';

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
  min,
  max,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
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
        max={type === 'number' ? max : undefined}
        step={type === 'number' ? '0.0001' : undefined}
        disabled={disabled}
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
  rows = 3,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <textarea
        style={styles.textarea}
        value={value}
        required={required}
        rows={rows}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, options, required = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean; disabled?: boolean }) {
  const { ui } = useAppTranslation();
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <select style={styles.input} value={value} required={required} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{required ? ui('Select…') : ui('None')}</option>
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
  const { ui } = useAppTranslation();
  if (loading) return <p style={styles.helper}>{ui('Loading…')}</p>;
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
  evaluating,
  canEvaluate,
  lastRefreshedAt
}: {
  onEvaluateParLevels: () => void;
  evaluating: boolean;
  canEvaluate: boolean;
  lastRefreshedAt: number | null;
}) {
  const { locale, ui } = useAppTranslation();
  return (
    <OperationalWorkspaceHero
      iconPath="/enterprise-inventory"
      eyebrow={ui('Inventory operations')}
      title={ui('Specialized inventory workflows')}
      description={ui('Manage the inventory controls that do not already have a dedicated tenant page: par levels, cycle counts, supplier returns, approvals, supplier catalogs, invoices, labels, attachments, and notifications.')}
      meta={
        <>
          <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui('Permission-aware')}</OperationalWorkspaceMetaPill>
          {lastRefreshedAt ? (
            <OperationalWorkspaceMetaPill>
              {ui('Refreshed')} {formatLocalizedDateTime(lastRefreshedAt, locale)}
            </OperationalWorkspaceMetaPill>
          ) : null}
        </>
      }
      aside={canEvaluate ? (
        <button
          type="button"
          onClick={onEvaluateParLevels}
          disabled={evaluating}
          className="app-button app-button--primary"
        >
          {evaluating ? ui('Evaluating…') : ui('Evaluate par levels')}
        </button>
      ) : undefined}
    />
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
