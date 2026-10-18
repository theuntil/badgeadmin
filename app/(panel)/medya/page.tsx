import type { Metadata } from 'next';
import { canManageApp, publicUrl, requireAdmin, supabaseServer } from '@/lib/supabase';
import { MediaSlot } from '@/components/client';
import { Group, PageHeader } from '@/components/ui';
import { removeMedia, replaceMedia } from '@/actions/media';

export const metadata: Metadata = { title: 'Medya' };

export default async function MediaPage() {
  const admin = await requireAdmin();
  const sb = await supabaseServer();
  const [{ data: content }, { data: devices }] = await Promise.all([
    sb.from('app_content').select('key, value, description').in('kind', ['image', 'video']),
    sb.from('device_types').select('id, name, image_path').order('sort_order'),
  ]);
  const val = (k: string) => content?.find((c) => c.key === k)?.value ?? '';
  const brandEditable = canManageApp(admin);

  return (
    <>
      <PageHeader title="Medya" description="Uygulamadaki video ve görseller. Değiştirdiğin ya da kaldırdığın eski dosya depolamadan da silinir. Dosyayı kutunun üstüne sürükleyip bırakabilirsin." />

      <Group title="Onboarding" bare foot="İlk açılıştaki tam ekran arka plan videosu. Dikey (9:16), sessiz, en fazla 20 MB MP4 önerilir. Kaldırırsan uygulama düz siyah arka plan gösterir.">
        <div className="group p-5 grid sm:grid-cols-[220px_1fr] gap-6 items-start">
          <MediaSlot url={publicUrl(val('onboarding.video_path'))} type="video" accept="video/mp4,video/quicktime" aspect="portrait"
            fields={{ kind: 'content', key: 'onboarding.video_path' }} replace={replaceMedia} remove={removeMedia}
            label="Arka plan videosu" hint="MP4 · 9:16" />
          <div className="text-ink-2 space-y-2 pt-1">
            <p className="font-semibold text-ink">“Wear your light” ekranı</p>
            <p>Video sessiz ve döngüde oynar, üstüne alttan siyaha bir geçiş eklenir. Yüz ya da yazı içeren videolarda önemli kısmı ortada tut; ekran kenarlardan kırpılabilir.</p>
          </div>
        </div>
      </Group>

      <Group title="Marka" bare foot={brandEditable ? 'Şeffaf arka planlı, beyaz PNG kullan. Uygulama koyu temada beyaz, açık temada siyah gösterir.' : 'Marka görsellerini sadece sahip ve yöneticiler değiştirebilir.'}>
        <div className="group p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <BrandSlot editable={brandEditable} url={publicUrl(val('brand.logo_path'))} k="brand.logo_path" label="Yatay logo" hint="Home başlığı ve onboarding" aspect="wide" />
          <BrandSlot editable={brandEditable} url={publicUrl(val('brand.icon_path'))} k="brand.icon_path" label="Sembol" hint="Giriş, ayarlar, Badges sekmesi" aspect="wide" />
        </div>
      </Group>

      <Group title="Cihaz görselleri" bare foot="Eşleştirme ekranında ve profildeki “Wearing” satırında görünür. Şeffaf arka planlı PNG önerilir.">
        <div className="group p-5 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {(devices ?? []).map((d) => (
            <MediaSlot key={d.id} url={publicUrl(d.image_path)} type="image" accept="image/png,image/webp,image/jpeg"
              fields={{ kind: 'device', id: d.id }} replace={replaceMedia} remove={removeMedia} label={d.name} />
          ))}
        </div>
      </Group>
    </>
  );
}

function BrandSlot({ editable, url, k, label, hint, aspect }: { editable: boolean; url: string; k: string; label: string; hint: string; aspect: 'wide' }) {
  if (!editable) {
    return (
      <figure className="flex flex-col gap-3">
        <div className="media-box dark aspect-[16/7] grid place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" className="max-h-[60%] max-w-[80%] object-contain" /> : null}
        </div>
        <figcaption><span className="font-medium block">{label}</span><span className="text-ink-3 text-[13px]">{hint}</span></figcaption>
      </figure>
    );
  }
  return (
    <div>
      <MediaSlot dark url={url} type="image" accept="image/png,image/webp" aspect={aspect}
        fields={{ kind: 'content', key: k }} replace={replaceMedia} remove={removeMedia} label={label} hint={hint} />
    </div>
  );
}
