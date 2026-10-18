'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  AlertCircleIcon, Cancel01Icon, CheckmarkCircle02Icon, Delete02Icon, Upload04Icon, Image01Icon,
} from '@hugeicons/core-free-icons';

// ===========================================================================
// Bildirim
// ===========================================================================
export type Result = { ok?: string; error?: string };
type Action = (f: FormData) => Promise<Result>;

export function toast(r: Result) {
  window.dispatchEvent(new CustomEvent('badge:toast', { detail: r }));
}

type Msg = { text: string; error: boolean; id: number; host: Element | null };

export function Toast() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [msg, setMsg] = useState<Msg | null>(null);

  useEffect(() => {
    const show = (e: Event) => {
      const r = (e as CustomEvent<Result>).detail;
      if (!r.ok && !r.error) return;
      // Hata açık bir pencereden geldiyse pencerenin içinde göster (pencere sayfanın geri kalanını kilitler)
      const host = r.error ? document.querySelector('dialog[open]') : null;
      setMsg({ text: (r.error || r.ok)!, error: !!r.error, id: Date.now(), host });
    };
    window.addEventListener('badge:toast', show);
    return () => window.removeEventListener('badge:toast', show);
  }, []);

  useEffect(() => {
    const ok = sp.get('ok'); const error = sp.get('error');
    if (!ok && !error) return;
    setMsg({ text: (error || ok)!, error: !!error, id: Date.now(), host: null });
    const next = new URLSearchParams(sp.toString());
    next.delete('ok'); next.delete('error');
    router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), msg.error ? 7000 : 3500);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  const host = msg.host && msg.host.isConnected ? msg.host : document.body;
  return createPortal(
    <div className="toast-layer" role={msg.error ? 'alert' : 'status'} key={msg.id}>
      <div className="toast flex items-start gap-3 max-w-[440px] rounded-xl border border-line-strong bg-surface px-4 py-3.5 shadow-[0_10px_40px_rgba(0,0,0,.16)]">
        <HugeiconsIcon icon={msg.error ? AlertCircleIcon : CheckmarkCircle02Icon} size={22} className={msg.error ? 'text-red shrink-0' : 'text-live shrink-0'} />
        <p className="flex-1 font-medium">{msg.text}</p>
        <button type="button" className="text-ink-3 hover:text-ink" onClick={() => setMsg(null)} aria-label="Bildirimi kapat">
          <HugeiconsIcon icon={Cancel01Icon} size={18} />
        </button>
      </div>
    </div>,
    host,
  );
}

// ===========================================================================
// Server action çalıştırıcı
// ===========================================================================
function useRun(action: Action) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fd: FormData, onOk?: () => void) => {
    start(async () => {
      let r: Result;
      try { r = await action(fd); } catch { r = { error: 'Bağlantı hatası. Tekrar dene.' }; }
      toast(r);
      if (r.ok) { onOk?.(); router.refresh(); }
    });
  };
  return { pending, run };
}

// ===========================================================================
// Pencere (dialog)
// ===========================================================================
const ModalCtx = createContext<{ close: () => void } | null>(null);

function Dialog({
  open, onClose, title, description, children, width = 520,
}: { open: boolean; onClose: () => void; title: string; description?: ReactNode; children: ReactNode; width?: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="modal"
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      aria-labelledby={headingId}
    >
      {open ? (
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <h2 id={headingId} className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
              {description ? <p className="text-ink-2 mt-1.5">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="btn btn-quiet btn-icon -mr-2 -mt-1" aria-label="Kapat">
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>
          </div>
          <ModalCtx.Provider value={{ close: onClose }}>{children}</ModalCtx.Provider>
        </div>
      ) : null}
    </dialog>
  );
}

type TriggerProps = { label: string; icon?: IconSvgElement; className?: string; iconOnly?: boolean };

function Trigger({ label, icon, className, iconOnly, onClick }: TriggerProps & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={className ?? (iconOnly ? 'btn btn-quiet btn-icon' : 'btn btn-primary')}
      aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined}>
      {icon ? <HugeiconsIcon icon={icon} size={iconOnly ? 20 : 18} strokeWidth={1.7} /> : null}
      {iconOnly ? null : label}
    </button>
  );
}

/** Butona basınca açılan pencere. İçindeki ActionForm başarılı olunca pencere kapanır. */
export function Modal({ trigger, title, description, children, width }: {
  trigger: TriggerProps; title: string; description?: ReactNode; children: ReactNode; width?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Trigger {...trigger} onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description} width={width}>{children}</Dialog>
    </>
  );
}

/** Onay penceresi: "Emin misin?" → evet derse action çalışır. */
export function ConfirmAction({
  action, fields, title, message, confirmLabel, danger = true, trigger, redirectTo,
}: {
  action: Action; fields: Record<string, string>; title: string; message: ReactNode;
  confirmLabel: string; danger?: boolean; trigger: TriggerProps; redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { pending, run } = useRun(action);
  const confirm = () => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
    run(fd, () => { setOpen(false); if (redirectTo) router.push(redirectTo); });
  };
  return (
    <>
      <Trigger {...trigger} onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={() => !pending && setOpen(false)} title={title} width={440}>
        <div className="text-ink-2 -mt-2">{message}</div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={pending}>Vazgeç</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={pending} autoFocus>
            {pending ? 'Bekle…' : confirmLabel}
          </button>
        </div>
      </Dialog>
    </>
  );
}

// ===========================================================================
// Formlar
// ===========================================================================
const FormCtx = createContext<{ pending: boolean; active: string | null }>({ pending: false, active: null });

export function ActionForm({ action, children, className, resetOnSuccess }: {
  action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean;
}) {
  const { pending, run } = useRun(action);
  const modal = useContext(ModalCtx);
  const [active, setActive] = useState<string | null>(null);
  return (
    <FormCtx.Provider value={{ pending, active }}>
      <form
        className={className}
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          const sub = (e.nativeEvent as SubmitEvent).submitter;
          setActive(sub?.getAttribute('data-id') ?? null);
          const form = e.currentTarget;
          run(new FormData(form, sub ?? undefined), () => { if (resetOnSuccess) form.reset(); modal?.close(); });
        }}
      >
        <fieldset disabled={pending} className="contents">{children}</fieldset>
      </form>
    </FormCtx.Provider>
  );
}

export function Submit({ children, pending, className = 'btn btn-primary', name, value }: {
  children: ReactNode; pending?: string; className?: string; name?: string; value?: string;
}) {
  const id = useId();
  const ctx = useContext(FormCtx);
  const busy = ctx.pending && ctx.active === id;
  return (
    <button type="submit" name={name} value={value} className={className} data-id={id}>
      {busy ? (pending ?? 'Kaydediliyor…') : children}
    </button>
  );
}

export function ModalClose({ label = 'Vazgeç' }: { label?: string }) {
  const modal = useContext(ModalCtx);
  return <button type="button" className="btn btn-secondary" onClick={() => modal?.close()}>{label}</button>;
}

/** Pencere içindeki form altı: Vazgeç + ana buton */
export function ModalActions({ submitLabel, pending }: { submitLabel: string; pending?: string }) {
  const modal = useContext(ModalCtx);
  return (
    <div className="flex justify-end gap-2 pt-5 mt-1">
      <button type="button" className="btn btn-secondary" onClick={() => modal?.close()}>Vazgeç</button>
      <Submit pending={pending}>{submitLabel}</Submit>
    </div>
  );
}

/** Ayar sayfaları: değişiklik olunca alttan kaydet çubuğu çıkar. */
export function SettingsForm({ action, children, saveLabel = 'Kaydet' }: { action: Action; children: ReactNode; saveLabel?: string }) {
  const [dirty, setDirty] = useState(false);
  const { pending, run } = useRun(action);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); run(new FormData(e.currentTarget), () => setDirty(false)); }}
      onInput={() => setDirty(true)}
      onChange={() => setDirty(true)}
      onReset={() => setDirty(false)}
      className="pb-24"
    >
      {children}
      <div className={`fixed inset-x-0 bottom-0 z-30 transition-transform duration-200 motion-reduce:transition-none ${dirty ? 'translate-y-0' : 'translate-y-[130%] invisible'}`} inert={!dirty}>
        <div className="md:ml-[240px] px-4 md:px-10 pb-4">
          <div className="max-w-[900px] flex items-center gap-3 rounded-xl border border-line-strong bg-surface px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,.16)]">
            <span className="size-2.5 rounded-full bg-amber shrink-0" aria-hidden />
            <span className="font-medium mr-auto">Kaydedilmemiş değişiklikler</span>
            <button type="reset" className="btn btn-quiet" disabled={pending}>Vazgeç</button>
            <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'Kaydediliyor…' : saveLabel}</button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ===========================================================================
// Medya alanı: önizleme + değiştir + kaldır
// ===========================================================================
export function MediaSlot({
  url, type, accept, fields, replace, remove, label, hint, removeMessage, aspect = 'square', compact, dark,
}: {
  url: string; type: 'image' | 'video'; accept: string; fields: Record<string, string>;
  replace: Action; remove?: Action; label: string; hint?: string; removeMessage?: string;
  aspect?: 'square' | 'portrait' | 'wide'; compact?: boolean; dark?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { pending, run } = useRun(replace);
  const ratio = aspect === 'portrait' ? 'aspect-[9/16]' : aspect === 'wide' ? 'aspect-[16/7]' : 'aspect-square';

  const onPick = (file?: File) => {
    if (!file) return;
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
    fd.set('file', file);
    run(fd);
    if (input.current) input.current.value = '';
  };

  return (
    <figure className="flex flex-col gap-3 min-w-0">
      <div
        className={`media-box ${dark ? 'dark' : ''} ${ratio} ${compact ? 'max-w-[160px]' : ''} ${pending ? 'opacity-50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag'); onPick(e.dataTransfer.files?.[0]); }}
      >
        {url ? (
          type === 'video'
            ? <video src={url} className="size-full object-cover" muted loop autoPlay playsInline preload="metadata" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={url} alt="" className={`size-full object-contain ${dark ? 'p-8' : 'p-3'}`} />
        ) : (
          <button type="button" className="size-full grid place-items-center text-ink-3 hover:text-ink" onClick={() => input.current?.click()}>
            <span className="flex flex-col items-center gap-2 text-[13px]">
              <HugeiconsIcon icon={type === 'video' ? Upload04Icon : Image01Icon} size={26} />
              Dosya seç ya da sürükle
            </span>
          </button>
        )}
        {pending ? <span className="absolute inset-0 grid place-items-center font-medium">Yükleniyor…</span> : null}
      </div>
      <figcaption className="flex flex-wrap items-center gap-2">
        <span className="flex-1 min-w-[120px]">
          <span className="font-medium block">{label}</span>
          {hint ? <span className="text-ink-3 text-[13px] block">{hint}</span> : null}
        </span>
        <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => onPick(e.target.files?.[0])} aria-label={`${label} dosyası`} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={pending}>
          {url ? 'Değiştir' : 'Yükle'}
        </button>
        {url && remove ? (
          <ConfirmAction
            action={remove} fields={fields} title={`${label} kaldırılsın mı?`}
            message={removeMessage ?? 'Dosya depolamadan kalıcı olarak silinir. Uygulama bu alanda varsayılanı gösterir.'}
            confirmLabel="Kaldır"
            trigger={{ label: 'Kaldır', icon: Delete02Icon, iconOnly: true, className: 'btn btn-quiet btn-sm btn-icon text-red' }}
          />
        ) : null}
      </figcaption>
    </figure>
  );
}

// ===========================================================================
// Uygulama modu seçici: Normal / Sadece mağaza / Bakım
// ===========================================================================
type Mode = 'normal' | 'maintenance' | 'shop' | 'waitlist';
const MODES: { id: Mode; label: string; title: string; message: string; dot: string }[] = [
  { id: 'normal', label: 'Normal', title: 'Uygulama normal moda alınsın mı?', message: 'Kullanıcılar uygulamanın tamamını kullanabilir.', dot: 'bg-live' },
  { id: 'maintenance', label: 'Bakım', title: 'Bakım ekranı gösterilsin mi?', message: 'Uygulamayı açan herkes bakım ekranını görür ve uygulamayı kullanamaz.', dot: 'bg-amber' },
  { id: 'shop', label: 'Ürün sayfası', title: 'Sadece ürün sayfası gösterilsin mi?', message: 'Uygulamayı açan herkes yalnızca ürün sayfasını görür. Diğer bölümler kapanır.', dot: 'bg-blue' },
  { id: 'waitlist', label: 'Bekleme listesi', title: 'Bekleme listesi ekranı gösterilsin mi?', message: 'Uygulamayı açan herkes yalnızca bekleme listesine katılma ekranını görür.', dot: 'bg-violet' },
];

export function ModeSwitch({ current, platform, action, disabled }: { current: Mode; platform: string; action: Action; disabled?: boolean }) {
  const [target, setTarget] = useState<Mode | null>(null);
  const { pending, run } = useRun(action);
  const t = MODES.find((m) => m.id === target);
  return (
    <>
      <div className="mode-switch" role="radiogroup" aria-label="Uygulama modu">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={current === m.id} disabled={disabled || pending}
            onClick={() => current !== m.id && setTarget(m.id)} className={current === m.id ? 'on' : ''}>
            <span className={`size-2 rounded-full ${current === m.id ? m.dot : 'bg-line-strong'}`} aria-hidden />
            {m.label}
          </button>
        ))}
      </div>
      <Dialog open={!!target} onClose={() => !pending && setTarget(null)} title={t?.title ?? ''} width={440}>
        <p className="text-ink-2 -mt-2">{t?.message}</p>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" className="btn btn-secondary" onClick={() => setTarget(null)} disabled={pending}>Vazgeç</button>
          <button type="button" className={`btn ${target === 'normal' ? 'btn-primary' : 'btn-danger'}`} disabled={pending} autoFocus
            onClick={() => { const fd = new FormData(); fd.set('platform', platform); fd.set('mode', target!); run(fd, () => setTarget(null)); }}>
            {pending ? 'Uygulanıyor…' : 'Evet, uygula'}
          </button>
        </div>
      </Dialog>
    </>
  );
}

// ===========================================================================
// Menü + platform seçici
// ===========================================================================
export type NavItem = { href: string; label: string; icon: IconSvgElement; dot?: 'amber' | 'blue' };

export function NavLinks({ items, row }: { items: NavItem[]; row?: boolean }) {
  const path = usePathname();
  const sp = useSearchParams();
  const p = sp.get('p');
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const withP = (href: string) => (p === 'android' && ['/', '/ekranlar', '/surum', '/ozellikler'].includes(href) ? `${href}?p=android` : href);

  return (
    <nav className={`flex ${row ? 'flex-row w-max' : 'flex-col'} gap-0.5`} aria-label="Ana menü">
      {items.map((it) => {
        const active = isActive(it.href);
        return (
          <Link key={it.href} href={withP(it.href)} aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 ${row ? 'h-9 text-[14px]' : 'h-10'} whitespace-nowrap transition-colors ${
              active ? 'bg-surface text-ink font-semibold shadow-[0_0_0_1px_var(--line)]' : 'text-ink-2 hover:text-ink hover:bg-surface/70'
            }`}>
            <HugeiconsIcon icon={it.icon} size={20} strokeWidth={1.7} className={`shrink-0 ${active ? 'text-ink' : 'text-ink-3'}`} />
            <span className="flex-1">{it.label}</span>
            {it.dot ? <span className={`size-2 rounded-full ${it.dot === 'amber' ? 'bg-amber' : 'bg-blue'}`} aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function PlatformSwitch() {
  const sp = useSearchParams();
  const path = usePathname();
  const current = sp.get('p') === 'android' ? 'android' : 'ios';
  return (
    <div className="seg" role="tablist" aria-label="Platform">
      {(['ios', 'android'] as const).map((p) => (
        <Link key={p} href={p === 'ios' ? path : `${path}?p=android`} role="tab" aria-selected={p === current} className={p === current ? 'on' : ''}>
          {p === 'ios' ? 'iOS · App Store' : 'Android · Google Play'}
        </Link>
      ))}
    </div>
  );
}
