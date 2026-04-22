import { ReactNode } from 'react';

export function Card({
  children,
  hero = false,
  className = '',
}: {
  children: ReactNode;
  hero?: boolean;
  className?: string;
}) {
  return (
    <div className={`${hero ? 'ccard-hero' : 'ccard'} ${className}`}>
      {children}
    </div>
  );
}

export function Label({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <div
      className="clabel"
      style={color ? { color } : undefined}
    >
      {children}
    </div>
  );
}

export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="pill-group" role="tablist">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={value === t}
          data-active={value === t}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
