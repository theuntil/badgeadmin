import Link from 'next/link';
import type { Metadata } from 'next';
import { Add01Icon, ArrowDown01Icon, ArrowUp01Icon, Image01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { publicUrl, requireAdmin, supabaseServer } from '@/lib/supabase';
import { ActionForm, Modal, ModalActions, Submit } from '@/components/client';
import { Empty, Group, Icon, PageHeader, Tag } from '@/components/ui';
import { createProduct, moveProduct, setFeatured } from '@/actions/shop';

export const metadata: Metadata = { title: 'Mağaza' };

type Row = { id: string; name: string; subtitle: string; price_minor: number; currency: string; stock: number; low_stock_threshold: number; images: string[]; is_active: boolean; is_featured: boolean; sort_order: number };

export default async function ShopPage() {
  await requireAdmin();
  const sb = await supabaseServer();
  const { data } = await sb.from('products')
    .select('id, name, subtitle, price_minor, currency, stock, low_stock_threshold, images, is_active, is_featured, sort_order')
    .order('sort_order').order('created_at').returns<Row[]>();
  const products = data ?? [];
  const featured = products.find((p) => p.is_featured);
  const money = (p: Row) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: p.currency }).format(p.price_minor / 100);

  const addButton = (
    <Modal trigger={{ label: 'Yeni ürün', icon: Add01Icon, className: 'btn btn-primary btn-sm' }} title="Yeni ürün"
      description="Ürün gizli olarak oluşturulur. Görsellerini ve detaylarını ekledikten sonra “Uygulamada göster”i açarsın." width={560}>
      <ActionForm action={createProduct} resetOnSuccess>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2"><span>Ad</span><input className="input" name="name" required maxLength={80} autoFocus placeholder="Badge Bag" /></label>
          <label className="field sm:col-span-2"><span>Alt başlık</span><input className="input" name="subtitle" maxLength={120} placeholder="Wearable light for your bag" /></label>
          <label className="field"><span>Fiyat</span><input className="input mono" name="price" required inputMode="decimal" placeholder="59.00" /></label>
          <label className="field"><span>Para birimi</span><input className="input mono uppercase" name="currency" defaultValue="GBP" maxLength={3} /></label>
          <label className="field"><span>Kalan stok</span><input className="input mono" name="stock" defaultValue={100} inputMode="numeric" /></label>
          <label className="field"><span>Toplam stok</span><input className="input mono" name="stock_total" defaultValue={100} inputMode="numeric" /></label>
          <label className="field sm:col-span-2"><span>Satın alma linki</span><input className="input mono" name="web_url" required inputMode="url" placeholder="https://" /></label>
        </div>
        <ModalActions submitLabel="Oluştur" pending="Oluşturuluyor…" />
      </ActionForm>
    </Modal>
  );

  return (
    <>
      <PageHeader title="Mağaza" description="Uygulamadaki ürünler. Satın alma web sitende yapılır; her ürünün linki oraya gider." />

      <section className="group p-5 md:p-6 mb-10 flex flex-wrap items-center gap-4">
        <span className="size-11 rounded-full bg-amber/15 text-amber grid place-items-center shrink-0"><Icon icon={StarIcon} size={22} strokeWidth={2} /></span>
        <div className="flex-1 min-w-[220px]">
          <p className="font-semibold">Yıldız ürün: {featured ? featured.name : <span className="text-ink-3 font-normal">seçilmedi</span>}</p>
          <p className="text-ink-3 text-[14px] mt-0.5">Uygulamada ürünlerin en önünde görünür. Uygulama “Ürün sayfası” ekranındayken de bu ürün gösterilir.</p>
        </div>
        {featured ? <Link href={`/magaza/${featured.id}`} className="btn btn-secondary btn-sm">Düzenle</Link> : null}
      </section>

      <Group title={`Ürünler · ${products.length}`} action={addButton}
        foot="Uygulamadaki sıra: önce yıldız ürün, sonra buradaki sıra. Okları kullanarak sırayı değiştir.">
        {products.length ? (
          <ul>
            {products.map((p, i) => (
              <li key={p.id} className="flex items-center gap-4 px-4 sm:px-5 py-3.5 [&+&]:border-t [&+&]:border-line">
                <div className="flex flex-col -my-1">
                  <ActionForm action={moveProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <Submit name="dir" value="up" className="btn btn-quiet btn-icon !h-7 !w-7" pending="·"><span className="sr-only">{p.name} yukarı</span><Icon icon={ArrowUp01Icon} size={16} /></Submit>
                    <Submit name="dir" value="down" className="btn btn-quiet btn-icon !h-7 !w-7" pending="·"><span className="sr-only">{p.name} aşağı</span><Icon icon={ArrowDown01Icon} size={16} /></Submit>
                  </ActionForm>
                </div>
                <Link href={`/magaza/${p.id}`} className="flex items-center gap-4 flex-1 min-w-0 group/p">
                  <span className="size-16 rounded-xl bg-surface-2 ring-1 ring-line grid place-items-center overflow-hidden shrink-0">
                    {p.images[0]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={publicUrl(p.images[0])} alt="" className="size-full object-contain p-1.5" />
                      : <Icon icon={Image01Icon} size={22} className="text-ink-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold flex items-center gap-2 group-hover/p:underline underline-offset-2">
                      {p.name}
                      {p.is_featured ? <span className="text-amber" title="Yıldız ürün"><Icon icon={StarIcon} size={17} strokeWidth={2} /></span> : null}
                    </span>
                    <span className="text-ink-3 text-[14px] block truncate">{p.subtitle || '—'}</span>
                  </span>
                  <span className="hidden sm:flex flex-col items-end text-right shrink-0">
                    <span className="font-semibold tabular-nums">{money(p)}</span>
                    <span className={`text-[13px] tabular-nums ${p.stock <= p.low_stock_threshold ? 'text-amber font-medium' : 'text-ink-3'}`}>{p.stock} stok</span>
                  </span>
                </Link>
                <span className="hidden md:block w-[92px] text-right">{p.is_active ? <Tag tone="live">Yayında</Tag> : <Tag>Gizli</Tag>}</span>
                {p.is_featured ? (
                  <span className="btn btn-sm btn-icon text-amber" title="Yıldız ürün"><Icon icon={StarIcon} size={19} strokeWidth={2} /></span>
                ) : (
                  <ActionForm action={setFeatured}>
                    <input type="hidden" name="id" value={p.id} />
                    <Submit className="btn btn-quiet btn-sm btn-icon" pending="…"><span className="sr-only">{p.name} yıldız ürün yap</span><Icon icon={StarIcon} size={19} /></Submit>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        ) : <Empty title="Henüz ürün yok">Sağ üstteki “Yeni ürün” ile ilk ürününü ekle.</Empty>}
      </Group>
    </>
  );
}
