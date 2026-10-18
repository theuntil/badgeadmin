import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { publicUrl, requireAdmin, supabaseServer } from '@/lib/supabase';
import { MediaSlot, SettingsForm } from '@/components/client';
import { Group, Icon, Row, Switch, Tag } from '@/components/ui';
import { saveProduct } from '@/actions/shop';
import { replaceMedia, removeMedia } from '@/actions/media';
import { ProductActions } from '../product-actions';

export const metadata: Metadata = { title: 'Ürünü düzenle' };

type Product = {
  id: string; name: string; tag: string; subtitle: string; description: string;
  price_minor: number; currency: string; delivery_note: string;
  stock: number; stock_total: number; low_stock_threshold: number; stock_banner_text: string;
  web_url: string; utm_source: string | null; images: string[];
  specs: { label: string; value: string }[]; comes_with: string[]; is_active: boolean; is_featured: boolean;
};

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]{1,60}$/.test(id)) notFound();
  await requireAdmin();
  const sb = await supabaseServer();
  const [{ data: p }, { data: anims }] = await Promise.all([
    sb.from('products').select('*').eq('id', id).maybeSingle<Product>(),
    sb.from('animations').select('id, name, preview_path, poster_path').order('sort_order'),
  ]);
  if (!p) notFound();

  const sold = p.stock_total > 0 ? Math.round(((p.stock_total - p.stock) / p.stock_total) * 100) : 0;
  const low = p.stock <= p.low_stock_threshold;
  const price = new Intl.NumberFormat('en-GB', { style: 'currency', currency: p.currency }).format(p.price_minor / 100);
  const specs = [...p.specs, { label: '', value: '' }, { label: '', value: '' }];

  return (
    <div>
      <Link href="/magaza" className="btn btn-quiet btn-sm -ml-3 mb-4"><Icon icon={ArrowLeft01Icon} size={17} />Tüm ürünler</Link>
      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.025em] flex items-center gap-3">
            {p.name}
            {p.is_featured ? <span className="text-amber" title="Yıldız ürün"><Icon icon={StarIcon} size={24} strokeWidth={2} /></span> : null}
          </h1>
          <p className="text-ink-2 mt-2 flex flex-wrap gap-2 items-center">
            {p.is_featured ? <Tag tone="amber">Yıldız ürün · uygulamada en önde</Tag> : null}
            {p.is_active ? <Tag tone="live">Uygulamada görünüyor</Tag> : <Tag>Gizli</Tag>}
          </p>
        </div>
        <ProductActions id={p.id} name={p.name} featured={p.is_featured} />
      </header>
      <Group title="Ürün görselleri" foot="İlk görsel ürün sayfasında büyük görünür. Kaldırdığın görsel depolamadan da silinir. En fazla 8 görsel." bare>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 group p-5">
          {p.images.map((img, i) => (
            <MediaSlot key={img} url={publicUrl(img)} type="image" accept="image/png,image/jpeg,image/webp"
              fields={{ kind: 'product', id: p.id, index: String(i) }} replace={replaceMedia} remove={removeMedia}
              label={i === 0 ? 'Ana görsel' : `Görsel ${i + 1}`} />
          ))}
          {p.images.length < 8 ? (
            <MediaSlot url="" type="image" accept="image/png,image/jpeg,image/webp"
              fields={{ kind: 'product', id: p.id, index: 'new' }} replace={replaceMedia}
              label="Yeni görsel" hint="PNG, JPG ya da WebP" />
          ) : null}
        </div>
      </Group>
      <SettingsForm action={saveProduct} saveLabel="Ürünü kaydet">
        <input type="hidden" name="id" value={p.id} />

        {/* Uygulamadaki görünüm */}
        <section className="group overflow-hidden mb-8">
          {low ? (
            <p className="bg-[#FF9F0A] text-black text-[13px] font-semibold text-center py-2">
              {p.stock_banner_text.replace('{stock}', String(p.stock))}
            </p>
          ) : null}
          <div className="p-6 flex flex-col sm:flex-row gap-6 sm:items-center">
            <div className="size-36 rounded-xl bg-surface-2 grid place-items-center shrink-0 overflow-hidden">
              {p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicUrl(p.images[0])} alt="" className="size-full object-contain" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink-3 text-[13px]">{p.tag}</p>
              <p className="text-[22px] font-semibold tracking-[-0.01em]">{p.name}</p>
              <p className="mt-1"><span className="text-[19px] font-semibold">{price}</span> <span className="text-ink-3">{p.delivery_note}</span></p>
              <div className="flex justify-between text-[13px] mt-4">
                <span className={low ? 'text-amber font-medium' : 'text-ink-2'}>{p.stock} left</span>
                <span className="text-ink-3">{sold}% sold</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 mt-2 overflow-hidden" role="progressbar" aria-valuenow={sold} aria-valuemin={0} aria-valuemax={100} aria-label="Satılan oran">
                <div className={`h-full ${low ? 'bg-amber' : 'bg-ink-2'}`} style={{ width: `${sold}%` }} />
              </div>
            </div>
          </div>
        </section>

        <Group title="Stok ve fiyat" foot={`Kalan stok ${p.low_stock_threshold} veya altındayken uygulamanın üstünde turuncu şerit görünür.`}>
          <Row label="Kalan stok" htmlFor="stock"><input id="stock" className="input mono max-w-[140px]" name="stock" defaultValue={p.stock} inputMode="numeric" /></Row>
          <Row label="Toplam stok" hint="“% sold” hesabı için" htmlFor="stock_total"><input id="stock_total" className="input mono max-w-[140px]" name="stock_total" defaultValue={p.stock_total} inputMode="numeric" /></Row>
          <Row label="Şerit eşiği" htmlFor="lst"><input id="lst" className="input mono max-w-[140px]" name="low_stock_threshold" defaultValue={p.low_stock_threshold} inputMode="numeric" /></Row>
          <Row label="Şerit metni" hint="{stock} yerine kalan adet yazılır" htmlFor="sbt"><input id="sbt" className="input" name="stock_banner_text" defaultValue={p.stock_banner_text} maxLength={120} /></Row>
          <Row label="Fiyat" htmlFor="price">
            <div className="flex gap-2">
              <input id="price" className="input mono max-w-[140px]" name="price" defaultValue={(p.price_minor / 100).toFixed(2)} inputMode="decimal" />
              <input className="input mono max-w-[80px] uppercase" name="currency" defaultValue={p.currency} maxLength={3} aria-label="Para birimi" />
            </div>
          </Row>
          <Row label="Teslimat notu" htmlFor="dn"><input id="dn" className="input" name="delivery_note" defaultValue={p.delivery_note} maxLength={80} /></Row>
        </Group>

        <Group title="Satın alma" foot="utm_source değeri linke otomatik eklenir, satışların uygulamadan geldiğini görebilirsin.">
          <Row label="Web linki" htmlFor="wu"><input id="wu" className="input mono" name="web_url" defaultValue={p.web_url} required inputMode="url" /></Row>
          <Row label="utm_source" htmlFor="utm"><input id="utm" className="input mono max-w-[220px]" name="utm_source" defaultValue={p.utm_source ?? ''} maxLength={60} /></Row>
          <Row label="Uygulamada göster" htmlFor="ia"><Switch id="ia" name="is_active" defaultChecked={p.is_active} /></Row>
        </Group>

        <Group title="Ürün bilgisi">
          <Row label="Ad" htmlFor="nm"><input id="nm" className="input" name="name" defaultValue={p.name} maxLength={80} /></Row>
          <Row label="Etiket" htmlFor="tg"><input id="tg" className="input max-w-[220px]" name="tag" defaultValue={p.tag} maxLength={40} /></Row>
          <Row label="Alt başlık" htmlFor="st"><input id="st" className="input" name="subtitle" defaultValue={p.subtitle} maxLength={120} /></Row>
          <Row label="Açıklama" top htmlFor="ds"><textarea id="ds" className="input" name="description" defaultValue={p.description} maxLength={1000} rows={3} /></Row>
        </Group>

        <Group title="Detay satırları" foot="Bir satırı silmek için başlığını boşalt.">
          {specs.map((s, i) => (
            <div key={i} className="row">
              <input className="input" name="spec_label" defaultValue={s.label} placeholder="Başlık" aria-label={`Satır ${i + 1} başlık`} maxLength={40} />
              <input className="input" name="spec_value" defaultValue={s.value} placeholder="Değer" aria-label={`Satır ${i + 1} değer`} maxLength={120} />
            </div>
          ))}
        </Group>

        <Group title="Kutudan çıkan animasyonlar" foot="Seçtiklerin ürün sayfasındaki “Comes with” satırında görünür.">
          <div className="p-5 grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-4">
            {(anims ?? []).map((a) => (
              <label key={a.id} className="flex flex-col items-center gap-2 cursor-pointer">
                <input type="checkbox" name="comes_with" value={a.id} defaultChecked={p.comes_with.includes(a.id)} className="peer sr-only" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicUrl(a.poster_path || a.preview_path)} alt="" loading="lazy"
                  className="size-14 rounded-full bg-[#050505] object-cover opacity-40 ring-1 ring-line transition peer-checked:opacity-100 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-blue" />
                <span className="text-[12px] text-ink-2 text-center leading-tight">{a.name}</span>
              </label>
            ))}
          </div>
        </Group>
      </SettingsForm>
    </div>
  );
}
