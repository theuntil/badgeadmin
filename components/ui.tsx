import type { ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

export function Icon({ icon, size = 18, className = '', strokeWidth = 1.6 }: { icon: IconSvgElement; size?: number; className?: string; strokeWidth?: number }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.025em]">{title}</h1>
        {description ? <p className="text-ink-2 mt-2 max-w-[62ch]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Group({ title, action, foot, children, className = '', bare }: {
  title?: string; action?: ReactNode; foot?: ReactNode; children: ReactNode; className?: string; bare?: boolean;
}) {
  return (
    <section className={`mb-10 ${className}`}>
      {title || action ? (
        <div className="section-title">
          {title ? <h2 className="flex-1">{title}</h2> : <span className="flex-1" />}
          {action}
        </div>
      ) : null}
      {bare ? children : <div className="group">{children}</div>}
      {foot ? <p className="section-foot">{foot}</p> : null}
    </section>
  );
}

export function Row({ label, hint, children, top, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; top?: boolean; htmlFor?: string }) {
  return (
    <div className={`row ${top ? 'top' : ''}`}>
      <label className="row-label" htmlFor={htmlFor}>
        {label}
        {hint ? <span className="row-hint">{hint}</span> : null}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Switch({ name, defaultChecked, label, id }: { name: string; defaultChecked?: boolean; label?: ReactNode; id?: string }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" name={name} id={id} defaultChecked={defaultChecked} />
      <span className="track" />
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export type Tone = 'live' | 'amber' | 'red' | 'blue' | 'violet' | 'neutral';
export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    live: 'text-live bg-live/12',
    amber: 'text-amber bg-amber/14',
    red: 'text-red bg-red/12',
    blue: 'text-blue bg-blue/12',
    violet: 'text-violet bg-violet/12',
    neutral: 'text-ink-2 bg-surface-2 ring-1 ring-line',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function Orb({ tone = 'live', size = 120, pulse = false }: { tone?: 'live' | 'amber' | 'red' | 'blue' | 'violet'; size?: number; pulse?: boolean }) {
  const pitch = Math.max(3, Math.round(size / 13));
  return (
    <span
      className={`orb ${tone === 'live' ? '' : tone} ${pulse ? 'pulse' : ''}`}
      style={{ width: size, height: size, ['--pitch' as string]: `${pitch}px` }}
      aria-hidden
    />
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="group px-6 py-14 text-center">
      <p className="font-semibold text-[16px]">{title}</p>
      {children ? <div className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">{children}</div> : null}
    </div>
  );
}
