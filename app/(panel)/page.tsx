import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { canManageApp, requireAdmin, supabaseServer } from '@/lib/supabase';
import { FLAG_LABELS, MODE_TEXT, getConfig, modeOf, platformName, platformOf, storeName, type AppConfig } from '@/lib/config';
import { fmtDate, fmtRelative } from '@/lib/form';
import { ModeSwitch, PlatformSwitch } from '@/components/client';
import { Group, Icon, Orb, Tag, type Tone } from '@/components/ui';
import { MissingConfig } from '@/components/missing';
import { setMode } from '@/actions/config';

export const metadata: Metadata = { title: 'Genel bakış' };

const GATE: Record<string, { text: string; tone: Tone }> = {
  ok: { text: 'Uygulama normal açılır', tone: 'live' },
  update_available: { text: '“Update available” bandını görür, kullanmaya devam eder', tone: 'blue' },
  force_update: { text: '“Update required” ekranında kalır', tone: 'red' },
  maintenance: { text: 'Bakım ekranında kalır', tone: 'amber' },
  shop_only: { text: 'Sadece ürün sayfasını görür', tone: 'blue' },
  waitlist: { text: 'Bekleme listesi ekranını görür', tone: 'violet' },
};

const TABLES: Record<string, string> = {
  app_config: 'Uygulama ayarları', products: 'Mağaza', animations: 'Animasyon', posts: 'Gönderi',
  app_content: 'Metin / medya', device_types: 'Cihaz görseli', screens: 'Ekran', demo_profiles: 'Profil', admin_users: 'Yönetici',
};

export default async function Overview({ searchParams }: { searchParams: Promise<{ p?: string; v?: string; b?: string }> }) {
  const sp = await searchParams;
  const platform = platformOf(sp.p);
  const admin = await requireAdmin();
  const c = await getConfig(platform);
  if (!c) return <MissingConfig platform={platformName(platform)} />;

  const sb = await supabaseServer();
  const testV = (sp.v ?? '').trim().slice(0, 20) || c.min_supported_version;
  const testB = sp.b && /^\d{1,9}$/.test(sp.b) ? parseInt(sp.b, 10) : null;
  const [{ data: gate }, { data: product }, { data: logs }, { data: all }] = await Promise.all([
    sb.rpc('app_gate', { p_platform: platform, p_version: testV, p_build: testB }),
    sb.from('products').select('id, name, stock, low_stock_threshold').eq('is_active', true).order('is_featured', { ascending: false }).order('sort_order').limit(1).maybeSingle(),
    sb.from('audit_log').select('id, table_name, action, actor_email, created_at').not('actor_id', 'is', null).order('id', { ascending: false }).limit(5),
    sb.from('app_config').select('*').order('platform', { ascending: false }).returns<AppConfig[]>(),
  ]);
  const { count: waitCount } = await sb.from('waitlist').select('id', { count: 'exact', head: true });
  const gateInfo = GATE[(gate as { status?: string } | null)?.status ?? 'ok'] ?? GATE.ok;
  const off = Object.entries(c.feature_flags).filter(([, v]) => !v).map(([k]) => FLAG_LABELS[k]?.label ?? k);
  const q = platform === 'android' ? '?p=android' : '';
  const mode = modeOf(c);
  const desc = {
    normal: `${c.min_supported_version} ve üstü sürümler uygulamayı normal kullanıyor.`,
    shop: 'Uygulamayı açan herkes yalnızca ürün sayfasını görüyor.',
    maintenance: `Uygulamayı açan herkes bakım ekranını görüyor.${c.maintenance_until ? ` Tahmini dönüş: ${fmtDate(c.maintenance_until)}.` : ''}`,
    waitlist: 'Uygulamayı açan herkes bekleme listesine katılma ekranını görüyor.',
  }[mode];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.025em]">Genel bakış</h1>
        <Suspense><PlatformSwitch /></Suspense>
      </div>

      <section className="group p-6 md:p-8 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 md:gap-8">
          <Orb size={120} tone={MODE_TEXT[mode].tone} pulse={mode !== 'normal'} />
          <div className="flex-1 min-w-0">
            <p className="text-ink-3 font-medium">{platformName(platform)} uygulaması</p>
            <p className="text-[34px] leading-tight font-semibold tracking-[-0.025em] mt-1">{MODE_TEXT[mode].title}</p>
            <p className="text-ink-2 mt-2 max-w-[52ch]">{desc}</p>
          </div>
        </div>
        <div className="mt-7">
          <p className="font-semibold mb-2.5">Uygulama modu</p>
          <ModeSwitch current={mode} platform={platform} action={setMode} disabled={!canManageApp(admin)} />
          <p className="text-ink-3 text-[13.5px] mt-2.5">
            {canManageApp(admin) ? 'Değişiklik açık olan uygulamalara birkaç saniye içinde ulaşır.' : 'Modu sadece sahip ve yöneticiler değiştirebilir.'}
            {' '}<Link href={`/ekranlar${q}`} className="underline underline-offset-2 hover:text-ink">Ekranların görsel ve metinlerini düzenle</Link>
          </p>
        </div>
      </section>

      <Group title="Platformlar">
        {(all ?? []).map((p) => {
          const m = modeOf(p);
          return (
            <Link key={p.platform} href={p.platform === 'android' ? '/surum?p=android' : '/surum'} className="row hover:bg-surface-2 first:rounded-t-[15px] last:rounded-b-[15px] group/r">
              <span className="row-label">{platformName(p.platform)}<span className="row-hint">{storeName(p.platform)}</span></span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Tag tone={MODE_TEXT[m].tone}>{MODE_TEXT[m].title}</Tag>
                <span className="text-ink-2">Min <b className="font-mono font-medium text-ink">{p.min_supported_version}</b></span>
                <span className="text-ink-2">Son <b className="font-mono font-medium text-ink">{p.latest_version}</b></span>
                <Icon icon={ArrowRight01Icon} size={18} className="ml-auto text-ink-3 group-hover/r:text-ink" />
              </span>
            </Link>
          );
        })}
      </Group>

      <Group title={`${platformName(platform)} kullanıcıları ne görüyor`}>
        <SummaryRow label="Güncelle butonu" hint={c.update_button_title} href={`/surum${q}`}>
          <span className="font-mono text-[14px] truncate block">{c.update_url}</span>
        </SummaryRow>
        <SummaryRow label="Kapalı bölümler" href={`/ozellikler${q}`}>
          {off.length ? <span>{off.join(', ')}</span> : <span className="text-ink-3">Hepsi açık</span>}
        </SummaryRow>
        <SummaryRow label="Bekleme listesi" href="/bekleme-listesi">
          <span>{(waitCount ?? 0).toLocaleString('tr-TR')} kişi</span>
        </SummaryRow>
        {product ? (
          <SummaryRow label={`${product.name} stoğu`} hint="Yıldız ürün" href={`/magaza/${product.id}`}>
            <span className="flex flex-wrap items-center gap-2">
              {product.stock} adet
              {product.stock <= product.low_stock_threshold ? <Tag tone="amber">“Az kaldı” şeridi görünüyor</Tag> : null}
            </span>
          </SummaryRow>
        ) : null}
      </Group>

      <Group title="Bir sürümü dene" foot="Sonuç kayıtlı ayarlara göre hesaplanır.">
        <form className="row" action="/">
          <label className="row-label" htmlFor="v">Sürüm<span className="row-hint">Bu sürümdeki biri uygulamayı açınca ne görür?</span></label>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {platform === 'android' ? <input type="hidden" name="p" value="android" /> : null}
              <input id="v" className="input mono max-w-[140px]" name="v" defaultValue={testV} placeholder="1.0.0" />
              <input className="input mono max-w-[110px]" name="b" defaultValue={sp.b ?? ''} placeholder="build" aria-label="Build numarası" inputMode="numeric" />
              <button className="btn btn-secondary">Dene</button>
            </div>
            <div><Tag tone={gateInfo.tone}>{gateInfo.text}</Tag></div>
          </div>
        </form>
      </Group>

      <Group title="Son değişiklikler" action={<Link href="/kayitlar" className="btn btn-quiet btn-sm">Tümünü gör</Link>}>
        {logs?.length ? logs.map((l) => (
          <div key={l.id} className="row">
            <span className="row-label">{TABLES[l.table_name] ?? l.table_name}
              <span className="row-hint">{l.action === 'INSERT' ? 'Eklendi' : l.action === 'DELETE' ? 'Silindi' : 'Güncellendi'}</span>
            </span>
            <span className="text-ink-2 flex flex-wrap justify-between gap-2">
              <span className="truncate">{l.actor_email}</span>
              <span className="text-ink-3" title={fmtDate(l.created_at)}>{fmtRelative(l.created_at)}</span>
            </span>
          </div>
        )) : <p className="px-5 py-4 text-ink-3">Panelden henüz bir değişiklik yapılmadı.</p>}
      </Group>
    </>
  );
}

function SummaryRow({ label, hint, href, children }: { label: string; hint?: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="row group/r hover:bg-surface-2 first:rounded-t-[15px] last:rounded-b-[15px] transition-colors">
      <span className="row-label">{label}{hint ? <span className="row-hint">{hint}</span> : null}</span>
      <span className="flex items-center gap-3 min-w-0">
        <span className="min-w-0 flex-1">{children}</span>
        <Icon icon={ArrowRight01Icon} size={18} className="text-ink-3 group-hover/r:text-ink shrink-0" />
      </span>
    </Link>
  );
}
