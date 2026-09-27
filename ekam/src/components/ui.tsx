import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Kind, Plan } from '../domain/types';
import { useStore } from '../state/store';
import { Icon } from './Icon';

export function TopBar({
  title,
  back,
  right,
}: {
  title?: ReactNode;
  back?: boolean | string;
  right?: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <header className="topbar">
      {back && (
        <button
          className="icon-btn bare"
          aria-label="Back"
          onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
        >
          <Icon name="back" />
        </button>
      )}
      <div className="title">{title}</div>
      {right}
    </header>
  );
}

export function KindMark({ kind, size = 16 }: { kind: Kind; size?: number }) {
  return (
    <Icon
      name={kind === 'romantic' ? 'heart' : 'friend'}
      size={size}
      style={{ color: kind === 'romantic' ? 'var(--romance)' : 'var(--friend)' }}
      fill={kind === 'romantic' ? 'currentColor' : undefined}
    />
  );
}

export function KindLabel({ kind, children }: { kind: Kind; children?: ReactNode }) {
  return (
    <span className={`kind-label ${kind}`}>
      <KindMark kind={kind} size={13} />
      {children ?? (kind === 'romantic' ? 'Romantic' : 'Friendship')}
    </span>
  );
}

export function PlanTag({ plan }: { plan: Plan }) {
  return <span className={`plan-tag${plan === 'free' ? ' free' : ''}`}>{plan === 'free' ? 'Free' : plan === 'premium' ? 'Premium' : 'Concierge'}</span>;
}

export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        <div className="grabber" />
        {children}
      </div>
    </>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function ToggleRow({
  title,
  detail,
  checked,
  onChange,
  disabled,
  locked,
}: {
  title: string;
  detail?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="toggle-row">
      <div className="grow">
        <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
          <span style={{ fontWeight: 550 }}>{title}</span>
          {locked && <Icon name="lock" size={14} className="faint" />}
        </div>
        {detail && <div className="small muted" style={{ marginTop: 2 }}>{detail}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} disabled={disabled || locked} />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty fade-in">
      {icon}
      <h2 className="display sm">{title}</h2>
      {children && <p className="muted" style={{ maxWidth: '34ch', margin: '0 auto' }}>{children}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', r }: { h?: number; w?: number | string; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Tick({ on = true }: { on?: boolean }) {
  return (
    <span className="tick">
      <Icon name={on ? 'check' : 'x'} size={11} weight={2.4} />
    </span>
  );
}

export function relDays(fromIso: string, nowIso: string): string {
  const d = Math.floor((new Date(nowIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
  if (d <= 0) return 'today';
  if (d === 1) return '1 day';
  return `${d} days`;
}

export function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
