import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useAppTranslation } from '../../i18n/I18nContext';

type Props = {
  id?: string;
  label: string;
  value: string;
  options: Array<readonly [string, string]>;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

/**
 * A controlled, app-styled report picker. Keeps the true API filter value separate
 * from its display label; supports filtering, keyboard selection and outside click.
 * In particular, choosing an alternate location always calls onChange with that
 * actual location name rather than depending on a browser-native popup.
 */
export default function ReportPicker({ id, label, value, options, onChange, disabled = false, compact = true }: Props) {
  const { ui } = useAppTranslation();
  const generatedId = useId();
  const prefix = id || `report-picker-${generatedId}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState(0);
  const allOptions = useMemo(() => {
    const seen = new Set<string>();
    const unique = options.filter(([optionValue]) => {
      if (seen.has(optionValue)) return false;
      seen.add(optionValue);
      return true;
    });
    if (value && !seen.has(value)) unique.push([value, value]);
    return unique;
  }, [options, value]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return needle
      ? allOptions.filter(([optionValue, optionLabel]) =>
          optionLabel.toLocaleLowerCase().includes(needle) || optionValue.toLocaleLowerCase().includes(needle))
      : allOptions;
  }, [allOptions, search]);
  const labelText = allOptions.find(([optionValue]) => optionValue === value)?.[1] ?? value;
  const active = Math.max(0, Math.min(cursor, filtered.length - 1));

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (open && allOptions.length > 7) searchRef.current?.focus();
  }, [open, allOptions.length]);

  useEffect(() => {
    if (!open) return;
    const element = hostRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    element?.scrollIntoView({ block: 'nearest' });
  }, [active, open, search]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setSearch('');
    setCursor(0);
    triggerRef.current?.focus();
  };
  const expand = () => {
    if (disabled) return;
    setSearch('');
    setCursor(Math.max(0, allOptions.findIndex(([candidate]) => candidate === value)));
    setOpen(true);
  };
  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) expand();
      else setCursor((index) => Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === 'Home' && open) {
      event.preventDefault(); setCursor(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault(); setCursor(Math.max(0, filtered.length - 1));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active][0]);
    }
  };

  return (
    <div className={`reports-picker${compact ? '' : ' reports-picker--wide'}`} ref={hostRef}>
      <span className="reports-picker-label" id={`${prefix}-label`}>{label}</span>
      <button type="button" id={prefix} className="reports-picker-trigger" ref={triggerRef}
        role="combobox" aria-haspopup="listbox" aria-expanded={open}
        aria-labelledby={`${prefix}-label ${prefix}`} aria-controls={`${prefix}-options`}
        aria-activedescendant={open && filtered.length ? `${prefix}-option-${active}` : undefined}
        disabled={disabled} onKeyDown={handleKeys}
        onClick={() => open ? setOpen(false) : expand()}>
        <span className="reports-picker-trigger-text">{labelText}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="reports-picker-menu">
          {allOptions.length > 7 ? (
            <input ref={searchRef} type="search" className="reports-picker-search"
              aria-label={`${ui('Search')} ${label}`} placeholder={ui('Search')}
              value={search} onChange={(event) => { setSearch(event.target.value); setCursor(0); }}
              onKeyDown={handleKeys} />
          ) : null}
          <div role="listbox" className="reports-picker-options" id={`${prefix}-options`}
            aria-labelledby={`${prefix}-label`}>
            {filtered.map(([optionValue, optionLabel], index) => (
              <button type="button" role="option" className="reports-picker-option"
                id={`${prefix}-option-${index}`} data-active={index === active}
                aria-selected={optionValue === value} key={optionValue}
                onMouseEnter={() => setCursor(index)} onClick={() => choose(optionValue)}>
                {optionLabel}
              </button>
            ))}
            {!filtered.length ? <div className="reports-picker-empty" role="status">{ui('No matching items')}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
