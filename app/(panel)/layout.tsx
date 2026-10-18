import { Suspense } from 'react';
import {
  DashboardSquare01Icon, SmartPhone01Icon, ToggleOnIcon, ShoppingBag01Icon,
  Image01Icon, Clock01Icon, Logout01Icon, PlayCircleIcon, UserIcon, Mail01Icon, SmartPhone02Icon,
} from '@hugeicons/core-free-icons';
import { requireAdmin, supabaseServer } from '@/lib/supabase';
import { MODE_TEXT, modeOf } from '@/lib/config';
import { NavLinks, type NavItem } from '@/components/client';
import { Icon, Orb } from '@/components/ui';
import { signOut } from '@/actions/auth';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const sb = await supabaseServer();
  const { data: configs } = await sb.from('app_config').select('platform, app_mode, maintenance_enabled, shop_only_enabled').order('platform', { ascending: false });
  const modes = (configs ?? []).map((c) => ({ platform: c.platform as string, mode: modeOf(c) }));
  const order = ['maintenance', 'waitlist', 'shop', 'normal'] as const;
  const headline = order.find((o) => modes.some((m) => m.mode === o)) ?? 'normal';
  const special = modes.some((m) => m.mode !== 'normal');

  const items: NavItem[] = [
    { href: '/', label: 'Genel bakış', icon: DashboardSquare01Icon },
    { href: '/ekranlar', label: 'Ekranlar', icon: SmartPhone02Icon, dot: special ? 'amber' : undefined },
    { href: '/surum', label: 'Sürüm ve mağaza linkleri', icon: SmartPhone01Icon },
    { href: '/ozellikler', label: 'Özellikler', icon: ToggleOnIcon },
    { href: '/magaza', label: 'Mağaza', icon: ShoppingBag01Icon },
    { href: '/bekleme-listesi', label: 'Bekleme listesi', icon: Mail01Icon },
    { href: '/icerik', label: 'İçerik', icon: Image01Icon },
    { href: '/medya', label: 'Medya', icon: PlayCircleIcon },
    { href: '/kayitlar', label: 'Değişiklik kaydı', icon: Clock01Icon },
    { href: '/yoneticiler', label: 'Yöneticiler', icon: UserIcon },
  ];

  const status = (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface ring-1 ring-line">
      <Orb size={26} tone={MODE_TEXT[headline].tone} />
      <div className="leading-tight min-w-0">
        {modes.map((m) => (
          <p key={m.platform} className="text-[13.5px] truncate">
            <span className="text-ink-3">{m.platform === 'ios' ? 'iOS' : 'Android'} </span>
            <span className="font-semibold">{MODE_TEXT[m.mode].title}</span>
          </p>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden md:flex sticky top-0 h-dvh flex-col gap-6 px-3 py-6 border-r border-line">
        <div className="px-3 pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="badge" className="brand-img h-[22px] w-auto" />
        </div>
        {status}
        <Suspense><NavLinks items={items} /></Suspense>
        <form action={signOut} className="mt-auto px-1">
          <button className="btn btn-quiet w-full justify-start"><Icon icon={Logout01Icon} size={19} />Çıkış yap</button>
        </form>
      </aside>

      <header className="md:hidden sticky top-0 z-20 bg-canvas/90 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <Orb size={20} tone={MODE_TEXT[headline].tone} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="badge" className="brand-img h-[18px] w-auto" />
          <form action={signOut} className="ml-auto">
            <button className="btn btn-quiet btn-icon" aria-label="Çıkış yap"><Icon icon={Logout01Icon} size={20} /></button>
          </form>
        </div>
        <div className="overflow-x-auto px-2 pb-2 [scrollbar-width:none]">
          <Suspense><NavLinks items={items} row /></Suspense>
        </div>
      </header>

      <main className="px-4 py-8 md:px-12 md:py-12 min-w-0">
        <div className="max-w-[900px]">{children}</div>
      </main>
    </div>
  );
}
