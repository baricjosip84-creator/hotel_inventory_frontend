import { useMemo, useState } from 'react';
import { useTenantDepartmentOptions } from '../../lib/useTenantDepartmentOptions';
import { useAppTranslation } from '../../i18n/I18nContext';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  allowAll?: boolean;
};

/** New-name entry is a deliberate, visible action; typing into a picker cannot silently invent a name. */
export default function TenantDepartmentField({ label, value, onChange, required = false, disabled = false, allowAll = false }: Props) {
  const { ui } = useAppTranslation();
  const { data, isLoading, isError } = useTenantDepartmentOptions(!disabled);
  const departments = useMemo(() => data || [], [data]);
  const [search, setSearch] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const matchingExisting = departments.find((department) => department.toLocaleLowerCase() === value.trim().toLocaleLowerCase());
  const newMode = addingNew || Boolean(value.trim() && !matchingExisting);
  const displayed = departments.filter((department) => department.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) || department === matchingExisting);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
        {label}
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
          disabled={disabled || newMode || isLoading || isError}
          aria-label={`${ui('Search departments')} — ${label}`}
          placeholder={ui('Search departments')}
          style={{ display: newMode ? 'none' : 'block', width: '100%', marginTop: 5, minHeight: 36, border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 10px', background: '#ffffff' }} />
        <select
          value={newMode ? '__new_department__' : matchingExisting || ''}
          onChange={(event) => {
            if (event.target.value === '__new_department__') {
              setAddingNew(true);
              onChange('');
            } else {
              setAddingNew(false);
              onChange(event.target.value);
            }
          }}
          required={required && !newMode}
          disabled={disabled || isLoading || isError}
          aria-label={label}
          style={{ display: 'block', width: '100%', marginTop: 5, minHeight: 40, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', background: disabled ? '#f1f5f9' : '#ffffff', color: '#0f172a' }}
        >
          <option value="">{allowAll ? ui('All departments') : ui('Select department')}</option>
          {displayed.map((department) => <option key={department} value={department}>{department}</option>)}
          <option value="__new_department__">{ui('Use a new department name…')}</option>
        </select>
      </label>
      {newMode ? (
        <label style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          {ui('New department name')}
          <input type="text" value={value} disabled={disabled} required={required} maxLength={120}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => {
              const known = departments.find((department) => department.toLocaleLowerCase() === value.trim().toLocaleLowerCase());
              if (known) { onChange(known); setAddingNew(false); }
              else if (value !== value.trim()) onChange(value.trim());
            }}
            style={{ display: 'block', width: '100%', marginTop: 5, minHeight: 40, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
          />
          <span style={{ display: 'block', color: '#64748b', fontWeight: 400, fontSize: 11.5, marginTop: 4 }}>
            {ui('The new name will be used when this record is saved.')}
          </span>
        </label>
      ) : null}
      {isLoading ? <span style={{ fontSize: 12, color: '#64748b' }}>{ui('Loading departments…')}</span> : null}
      {isError ? <span role="alert" style={{ fontSize: 12, color: '#b91c1c' }}>{ui('Department choices unavailable. Try again.')}</span> : null}
    </div>
  );
}
