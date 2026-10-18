import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { canManageApp, publicUrl, requireAdmin, supabaseServer } from '@/lib/supabase';
import { MODE_TEXT, getConfig, modeOf, platformName, platformOf, storeName, type AppConfig, type Screen } from '@/lib/config';
import { TZ, isoToLocal } from '@/lib/form';
import { MediaSlot, ModeSwitch, PlatformSwitch, SettingsForm } from '@/components/client';
import { Group, PageHeader, Row, Switch, Tag } from '@/components/ui';
import { Phone, PhoneButton } from '@/components/phone';
import { MissingConfig } from '@/components/missing';
import { saveMaintenance, saveUpdateScreen, setMode } from '@/actions/config';
import { saveWaitlistScreen } from '@/actions/screens';
import { removeMedia, replaceMedia } from '@/actions/media';

export const metadata: Metadata = { title: 'Ekranlar' };

const TABS = [
  { id: 'bakim', screen: 'maintenance', mode: 'maintenance', label: 'Bakım' },
  { id: 'guncelleme', screen: 'force_update', mode: null, label: 'Güncelleme gerekli' },
  { id: 'urun', screen: 'shop', mode: 'shop', label: 'Ürün sayfası' },
  { id: 'bekleme', screen: 'waitlist', mode: 'waitlist', label: 'Bekleme listesi' },
] as const;

const MEDIA_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime';

export default async function ScreensPage({ searchParams }: { searchParams: Promise<{ p?: string; s?: string }> }) {
  const sp = await searchParams;
  const platform = platformOf(sp.p);
  const tab = TABS.find((t) => t.id === sp.s) ?? TABS[0];
  const admin = await requireAdmin();
  const manage = canManageApp(admin);
  const c = await getConfig(platform);
  if (!c) return <MissingConfig platform={platformName(platform)} />;

  const sb = await supabaseServer();
  const { data: screens } = await sb.from('screens').select('*').returns<Screen[]>();
  const screen = screens?.find((x) => x.id === tab.screen);
  const mode = modeOf(c);
  const q = (s: string) => `/ekranlar?s=${s}${platform === 'android' ? '&p=android' : ''}`;

  return (
    <>
      <PageHeader
        title="Ekranlar"
        description="Uygulamanın tam ekran sayfaları. Hangisinin gösterileceğini seç, görselini ya da videosunu ve metinlerini düzenle."
        actions={<Suspense><PlatformSwitch /></Suspense>}
      />

      <section className="group p-5 md:p-6 mb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <p className="font-semibold">{platformName(platform)} kullanıcılarına şu an gösterilen</p>
          <Tag tone={MODE_TEXT[mode].tone}>{MODE_TEXT[mode].screen}</Tag>
        </div>
        <ModeSwitch current={mode} platform={platform} action={setMode} disabled={!manage} />
        <p className="text-ink-3 text-[13.5px] mt-3">
          {manage ? '“Güncelleme gerekli” ekranı seçilmez; eski sürümdeki kullanıcılara otomatik gösterilir.' : 'Gösterilen ekranı sadece sahip ve yöneticiler değiştirebilir.'}
        </p>
      </section>

      <nav className="seg mb-8" aria-label="Ekran">
        {TABS.map((t) => (
          <Link key={t.id} href={q(t.id)} aria-current={t.id === tab.id ? 'page' : undefined}>
            {t.label}
            {t.mode && t.mode === mode ? <span className="size-2 rounded-full bg-live" aria-label="Şu an gösteriliyor" /> : null}
          </Link>
        ))}
      </nav>

      {tab.id === 'bakim' ? <Maintenance c={c} screen={screen} manage={manage} /> : null}
      {tab.id === 'guncelleme' ? <ForceUpdate c={c} screen={screen} manage={manage} /> : null}
      {tab.id === 'urun' ? <Shop c={c} screen={screen} sb={sb} /> : null}
      {tab.id === 'bekleme' ? <Waitlist screen={screen} sb={sb} /> : null}
    </>
  );
}

function Layout({ editor, preview }: { editor: React.ReactNode; preview: React.ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-10 items-start">
      <div className="min-w-0">{editor}</div>
      <aside className="lg:sticky lg:top-10" aria-label="Önizleme">{preview}</aside>
    </div>
  );
}

function MediaGroup({ screen, hint, readOnly }: { screen?: Screen; hint: string; readOnly?: boolean }) {
  if (!screen) return null;
  return (
    <Group title="Görsel ya da video" foot={hint} bare>
      <div className="group p-5">
        {readOnly ? (
          <p className="text-ink-3">Bu ekranın medyasını sadece sahip ve yöneticiler değiştirebilir.</p>
        ) : (
          <div className="max-w-[360px]">
            <MediaSlot
              url={publicUrl(screen.media_path)} type={screen.media_kind ?? 'image'} accept={MEDIA_ACCEPT} aspect="wide"
              fields={{ kind: 'screen', id: screen.id }} replace={replaceMedia} remove={removeMedia}
              label={screen.media_path ? (screen.media_kind === 'video' ? 'Video' : 'Görsel') : 'Medya yok'}
              hint="Görsel 10 MB, video 20 MB'a kadar"
              removeMessage="Medya ekrandan kaldırılır ve depolamadan silinir. Ekran sadece metinle görünür."
            />
          </div>
        )}
      </div>
    </Group>
  );
}

// ---------------------------------------------------------------------------
function Maintenance({ c, screen, manage }: { c: AppConfig; screen?: Screen; manage: boolean }) {
  const until = c.maintenance_until ? new Date(c.maintenance_until).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : null;
  return (
    <Layout
      editor={<>
        <MediaGroup screen={screen} readOnly={!manage} hint="Üst kısımda tam genişlikte görünür, alttan siyaha yumuşak geçişle metinlere bağlanır. Boş bırakabilirsin." />
        <SettingsForm action={saveMaintenance}>
          <input type="hidden" name="platform" value={c.platform} />
          <fieldset disabled={!manage} className="contents">
            <Group title="Metinler" foot="Uygulama İngilizce; metinleri İngilizce yaz.">
              <Row label="Başlık" htmlFor="m_title"><input id="m_title" className="input" name="maintenance_title" defaultValue={c.maintenance_title} maxLength={80} /></Row>
              <Row label="Açıklama" top htmlFor="m_msg"><textarea id="m_msg" className="input" name="maintenance_message" defaultValue={c.maintenance_message} maxLength={400} rows={3} /></Row>
              <Row label="Durum" hint="Status satırında turuncu görünür" htmlFor="m_status"><input id="m_status" className="input" name="maintenance_status" defaultValue={c.maintenance_status} maxLength={40} /></Row>
              <Row label="Tahmini dönüş" hint={`Saat dilimi: ${TZ}. Boş bırakırsan satır gizlenir.`} htmlFor="m_until">
                <input id="m_until" className="input max-w-[260px]" type="datetime-local" name="maintenance_until" defaultValue={isoToLocal(c.maintenance_until)} />
              </Row>
              <Row label="Durum sayfası" hint="View status page butonu açar" htmlFor="m_url"><input id="m_url" className="input mono" name="status_url" defaultValue={c.status_url ?? ''} placeholder="https://" inputMode="url" /></Row>
            </Group>
          </fieldset>
        </SettingsForm>
      </>}
      preview={
        <Phone mediaUrl={publicUrl(screen?.media_path)} mediaKind={screen?.media_kind}>
          <h3>{c.maintenance_title}</h3>
          <p>{c.maintenance_message}</p>
          <div className="text-[12px] mt-1">
            {until ? <div className="flex justify-between py-2 border-b border-white/10"><span className="text-white/55">Expected back</span><span>{until}</span></div> : null}
            <div className="flex justify-between py-2"><span className="text-white/55">Status</span><span className="text-[#FF9F0A]">{c.maintenance_status}</span></div>
          </div>
          <PhoneButton>Check again</PhoneButton>
          {c.status_url ? <PhoneButton ghost>View status page</PhoneButton> : null}
        </Phone>
      }
    />
  );
}

// ---------------------------------------------------------------------------
function ForceUpdate({ c, screen, manage }: { c: AppConfig; screen?: Screen; manage: boolean }) {
  return (
    <Layout
      editor={<>
        <MediaGroup screen={screen} readOnly={!manage} hint="İsteğe bağlı. Yeni sürümün öne çıkan görseli ya da kısa bir tanıtım videosu iyi gider." />
        <SettingsForm action={saveUpdateScreen}>
          <input type="hidden" name="platform" value={c.platform} />
          <fieldset disabled={!manage} className="contents">
            <Group title="Zorunlu güncelleme" foot={<>Bu ekran, sürümü minimumun altında kalan herkese otomatik gösterilir. Sürümleri ve {storeName(c.platform)} linkini <Link className="underline underline-offset-2" href={c.platform === 'android' ? '/surum?p=android' : '/surum'}>Sürüm ve mağaza linkleri</Link> sayfasından yönetirsin.</>}>
              <Row label="Başlık" htmlFor="f_t"><input id="f_t" className="input" name="force_update_title" defaultValue={c.force_update_title} maxLength={80} /></Row>
              <Row label="Açıklama" top htmlFor="f_m"><textarea id="f_m" className="input" name="force_update_message" defaultValue={c.force_update_message} maxLength={400} rows={3} /></Row>
              <Row label="Yenilikler" hint="Her satır bir madde" top htmlFor="w_n"><textarea id="w_n" className="input" name="whats_new" defaultValue={c.whats_new.join('\n')} rows={4} /></Row>
            </Group>
            <Group title="İsteğe bağlı güncelleme bandı" foot="En son sürümün altındaki kullanıcılar uygulamanın üstünde kapatılabilir bir bant görür.">
              <Row label="Başlık" htmlFor="o_t"><input id="o_t" className="input" name="optional_update_title" defaultValue={c.optional_update_title} maxLength={80} /></Row>
              <Row label="Açıklama" top htmlFor="o_m"><textarea id="o_m" className="input" name="optional_update_message" defaultValue={c.optional_update_message} maxLength={400} rows={2} /></Row>
            </Group>
          </fieldset>
        </SettingsForm>
      </>}
      preview={
        <Phone mediaUrl={publicUrl(screen?.media_path)} mediaKind={screen?.media_kind}>
          <h3>{c.force_update_title}</h3>
          <p>{c.force_update_message}</p>
          <p className="font-mono text-[11px] !text-white/45">1.0.0 → {c.latest_version}</p>
          {c.whats_new.length ? (
            <ul className="text-[12px] text-white/70 list-disc pl-4 space-y-0.5">{c.whats_new.slice(0, 4).map((w) => <li key={w}>{w}</li>)}</ul>
          ) : null}
          <PhoneButton>{c.update_button_title}</PhoneButton>
        </Phone>
      }
    />
  );
}

// ---------------------------------------------------------------------------
async function Shop({ c, sb }: { c: AppConfig; screen?: Screen; sb: Awaited<ReturnType<typeof supabaseServer>> }) {
  const { data: prods } = await sb.from('products').select('id, name, tag, price_minor, currency, delivery_note, images, is_active, is_featured').eq('is_active', true).order('sort_order');
  const p = prods?.find((x) => x.id === c.shop_only_product_id) ?? prods?.find((x) => x.is_featured) ?? prods?.[0];
  return (
    <Layout
      editor={
        <Group title="Ürün sayfası" foot="Bu ekran yıldız ürünün kendi görsellerini, fiyatını ve metinlerini kullanır. Yıldız ürünü Mağaza sayfasında değiştirirsin.">
          <Row label="Gösterilen ürün" hint="Yıldız ürün">{p ? <span className="font-medium">★ {p.name}</span> : <span className="text-ink-3">Yayında ürün yok</span>}</Row>
          <div className="row"><span /><span className="flex flex-wrap gap-2">
            {p ? <Link href={`/magaza/${p.id}`} className="btn btn-secondary">Bu ürünü düzenle</Link> : null}
            <Link href="/magaza" className="btn btn-quiet">Yıldız ürünü değiştir</Link>
          </span></div>
        </Group>
      }
      preview={
        <Phone mediaUrl={p?.images?.[0] ? publicUrl(p.images[0]) : ''} mediaKind="image">
          <p className="!text-white/50 text-[11px]">{p?.tag}</p>
          <h3>{p?.name ?? 'Ürün'}</h3>
          {p ? <p className="!text-white"><b>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: p.currency }).format(p.price_minor / 100)}</b> <span className="text-white/55">{p.delivery_note}</span></p> : null}
          <PhoneButton>Buy on website ↗</PhoneButton>
        </Phone>
      }
    />
  );
}

// ---------------------------------------------------------------------------
async function Waitlist({ screen, sb }: { screen?: Screen; sb: Awaited<ReturnType<typeof supabaseServer>> }) {
  const { count } = await sb.from('waitlist').select('id', { count: 'exact', head: true });
  if (!screen) return <p className="text-ink-3">Bekleme listesi ekranı bulunamadı. Güncelleme 3 SQL’ini çalıştır.</p>;
  return (
    <Layout
      editor={<>
        <MediaGroup screen={screen} hint="Ekranın üst yarısını kaplar. 3D bir ürün animasyonu (MP4) ya da büyük bir ürün fotoğrafı en iyi sonucu verir. Dikey ya da kare video önerilir." />
        <SettingsForm action={saveWaitlistScreen}>
          <Group title="Metinler" foot={<>Toplanan e-postalar <Link className="underline underline-offset-2" href="/bekleme-listesi">Bekleme listesi</Link> sayfasında. Uygulama İngilizce; metinleri İngilizce yaz.</>}>
            <Row label="Başlık" htmlFor="w_t"><input id="w_t" className="input" name="title" defaultValue={screen.title} maxLength={80} /></Row>
            <Row label="Açıklama" top htmlFor="w_b"><textarea id="w_b" className="input" name="body" defaultValue={screen.body} maxLength={400} rows={3} /></Row>
            <Row label="E-posta alanı" hint="Kutunun içindeki soluk yazı" htmlFor="w_p"><input id="w_p" className="input" name="placeholder" defaultValue={screen.placeholder} maxLength={40} /></Row>
            <Row label="Buton" htmlFor="w_btn"><input id="w_btn" className="input" name="button_title" defaultValue={screen.button_title} maxLength={40} /></Row>
            <Row label="Kişi sayısını göster" hint={`“Join ${(count ?? 0).toLocaleString('en-GB')} others” satırı`} htmlFor="w_c"><Switch id="w_c" name="show_count" defaultChecked={screen.show_count} /></Row>
          </Group>
          <Group title="Katıldıktan sonra">
            <Row label="Başlık" htmlFor="w_st"><input id="w_st" className="input" name="success_title" defaultValue={screen.success_title} maxLength={80} /></Row>
            <Row label="Açıklama" top htmlFor="w_sb"><textarea id="w_sb" className="input" name="success_body" defaultValue={screen.success_body} maxLength={300} rows={2} /></Row>
          </Group>
        </SettingsForm>
      </>}
      preview={
        <div className="flex flex-col gap-8">
          <Phone mediaUrl={publicUrl(screen.media_path)} mediaKind={screen.media_kind}>
            <h3>{screen.title}</h3>
            <p>{screen.body}</p>
            <div className="phone-input">{screen.placeholder}</div>
            <PhoneButton>{screen.button_title}</PhoneButton>
            {screen.show_count ? <p className="text-center text-[11.5px]">Join {(count ?? 0).toLocaleString('en-GB')} others on the list</p> : null}
          </Phone>
          <Phone label="Katıldıktan sonra" mediaUrl={publicUrl(screen.media_path)} mediaKind={screen.media_kind}>
            <span className="size-10 rounded-full bg-[#30D158]/20 text-[#30D158] grid place-items-center text-[18px]">✓</span>
            <h3>{screen.success_title}</h3>
            <p>{screen.success_body}</p>
          </Phone>
        </div>
      }
    />
  );
}

