import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { TenantNavIcon } from './TenantNavIcon';
import './OperationalWorkspace.css';

type OperationalWorkspaceHeroProps = {
  iconPath: string;
  eyebrow: string;
  title: string;
  description: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export function OperationalWorkspaceHero({
  iconPath,
  eyebrow,
  title,
  description,
  meta,
  aside,
  className = ''
}: OperationalWorkspaceHeroProps) {
  return (
    <section className={`io-workspace-hero${className ? ` ${className}` : ''}`}>
      <span className="io-workspace-hero__icon" aria-hidden="true">
        <TenantNavIcon path={iconPath} size={24} />
      </span>
      <div className="io-workspace-hero__copy">
        <div className="io-workspace-hero__eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <div className="io-workspace-hero__description">{description}</div>
        {meta ? <div className="io-workspace-hero__meta">{meta}</div> : null}
      </div>
      {aside ? <div className="io-workspace-hero__aside">{aside}</div> : null}
    </section>
  );
}

type OperationalWorkspaceStatusProps = {
  value: ReactNode;
  label: ReactNode;
};

export function OperationalWorkspaceStatus({ value, label }: OperationalWorkspaceStatusProps) {
  return (
    <div className="io-workspace-hero__status">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function OperationalWorkspaceMetaPill({ children }: { children: ReactNode }) {
  return <span className="io-workspace-meta-pill">{children}</span>;
}

export function OperationalWorkspaceTabs({
  children,
  hint,
  ariaLabel
}: {
  children: ReactNode;
  hint?: ReactNode;
  ariaLabel: string;
}) {
  return (
    <nav className="io-workspace-tabs" aria-label={ariaLabel}>
      <div className="io-workspace-tabs__items" role="tablist" aria-label={ariaLabel}>
        {children}
      </div>
      {hint ? <div className="io-workspace-tabs__hint">{hint}</div> : null}
    </nav>
  );
}

type OperationalWorkspaceTabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  active: boolean;
  iconPath: string;
  label: ReactNode;
  count?: ReactNode;
};

export function OperationalWorkspaceTab({
  active,
  iconPath,
  label,
  count,
  className = '',
  ...buttonProps
}: OperationalWorkspaceTabProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      role="tab"
      aria-selected={active}
      className={`io-workspace-tab${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
    >
      <TenantNavIcon path={iconPath} size={15} />
      <span>{label}</span>
      {count !== undefined && count !== null ? <span className="io-workspace-tab__count">{count}</span> : null}
    </button>
  );
}

export function OperationalWorkspaceStats({
  children,
  className = '',
  ariaLabel
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <section className={`io-workspace-stats${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      {children}
    </section>
  );
}

type OperationalSectionHeaderProps = {
  iconPath: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function OperationalSectionHeader({
  iconPath,
  title,
  description,
  actions,
  className = ''
}: OperationalSectionHeaderProps) {
  return (
    <div className={`io-workspace-section-header${className ? ` ${className}` : ''}`}>
      <div className="io-workspace-section-header__lead">
        <span className="io-workspace-section-header__icon" aria-hidden="true">
          <TenantNavIcon path={iconPath} size={17} />
        </span>
        <div className="io-workspace-section-header__copy">
          <h3>{title}</h3>
          {description ? <div className="io-workspace-section-header__description">{description}</div> : null}
        </div>
      </div>
      {actions ? <div className="io-workspace-section-header__actions">{actions}</div> : null}
    </div>
  );
}
