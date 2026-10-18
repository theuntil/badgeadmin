'use server';

import { act, must, EDIT } from '@/lib/act';
import { FormError, bool, int, str, url } from '@/lib/form';
import { removeIfUnused, slug } from '@/lib/storage';

function productId(f: FormData) {
  const id = str(f, 'id', 60);
  if (!/^[a-z0-9-]{1,60}$/.test(id)) throw new FormError('Geçersiz ürün.');
  return id;
}

function price(f: FormData) {
  const v = Math.round(parseFloat(str(f, 'price', 12).replace(',', '.')) * 100);
  if (!Number.isFinite(v) || v < 0 || v > 10_000_000) throw new FormError('Fiyat geçerli değil.');
  return v;
}

export async function createProduct(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const name = str(f, 'name', 80);
    const base = slug(name);
    if (!base) throw new FormError('Ürün adı gerekli.');
    const currency = (str(f, 'currency', 3) || 'GBP').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new FormError('Para birimi 3 harf olmalı (GBP, EUR, TRY).');
    const stock = int(f, 'stock', { min: 0, max: 1_000_000 });

    // Benzersiz id: badge-jacket, badge-jacket-2 …
    const { data: taken } = await sb.from('products').select('id').like('id', `${base}%`);
    const ids = new Set((taken ?? []).map((r) => r.id));
    let id = base; for (let i = 2; ids.has(id); i++) id = `${base}-${i}`;

    const { data: last } = await sb.from('products').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { error } = await sb.from('products').insert({
      id, name, tag: '@badge', subtitle: str(f, 'subtitle', 120), description: '',
      price_minor: price(f), currency, delivery_note: 'Free UK delivery',
      stock, stock_total: Math.max(stock, int(f, 'stock_total', { min: 0, max: 1_000_000 })),
      web_url: url(f, 'web_url', { required: true, label: 'Satın alma linki' }),
      images: [], specs: [], comes_with: [],
      sort_order: (last?.sort_order ?? 0) + 1,
      is_active: false,
    });
    if (error) throw new Error(error.message);
    return `${name} oluşturuldu. Görsellerini ekleyip “Uygulamada göster”i açınca yayına girer.`;
  }, ['/magaza']);
}

export async function deleteProduct(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const id = productId(f);
    const { data: p } = await sb.from('products').select('name, images, is_featured').eq('id', id).maybeSingle();
    if (!p) throw new FormError('Ürün zaten silinmiş.');
    if (p.is_featured) throw new FormError('Yıldız ürün silinemez. Önce başka bir ürünü yıldızla.');
    must(await sb.from('products').delete().eq('id', id).select('id'));
    for (const img of (p.images as string[]) ?? []) await removeIfUnused(sb, img);
    return `${p.name} ve görselleri silindi.`;
  }, ['/magaza', '/', '/ekranlar']);
}

export async function setFeatured(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const id = productId(f);
    const { data: p } = await sb.from('products').select('is_active').eq('id', id).maybeSingle();
    if (!p) throw new FormError('Ürün bulunamadı.');
    if (!p.is_active) throw new FormError('Gizli bir ürün yıldızlanamaz. Önce ürünü “Uygulamada göster” ile aç.');
    const { error } = await sb.rpc('set_featured_product', { p_id: id });
    if (error) throw new Error(error.message);
    return 'Yıldız ürün değişti. Uygulamada en önde ve “Ürün sayfası” ekranında artık bu ürün görünüyor.';
  }, ['/magaza', '/', '/ekranlar']);
}

export async function moveProduct(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const id = productId(f);
    const dir = str(f, 'dir', 4) === 'up' ? -1 : 1;
    const { data: list } = await sb.from('products').select('id, sort_order').order('sort_order').order('created_at');
    const rows = list ?? [];
    const i = rows.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return 'Sıra değişmedi.';
    [rows[i], rows[j]] = [rows[j], rows[i]];
    for (let k = 0; k < rows.length; k++) {
      if (rows[k].sort_order !== k + 1) must(await sb.from('products').update({ sort_order: k + 1 }).eq('id', rows[k].id).select('id'));
    }
    return 'Sıra güncellendi.';
  }, ['/magaza']);
}

export async function saveProduct(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const id = productId(f);
    const priceMinor = price(f);
    const currency = str(f, 'currency', 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new FormError('Para birimi 3 harf olmalı (GBP, EUR, TRY).');

    const active = bool(f, 'is_active');
    if (!active) {
      const { data: cur } = await sb.from('products').select('is_featured').eq('id', id).maybeSingle();
      if (cur?.is_featured) throw new FormError('Yıldız ürün gizlenemez. Önce başka bir ürünü yıldızla.');
    }
    const stock = int(f, 'stock', { min: 0, max: 1_000_000 });
    const total = int(f, 'stock_total', { min: 0, max: 1_000_000 });
    if (total < stock) throw new FormError('Toplam stok, kalan stoktan küçük olamaz.');

    const labels = f.getAll('spec_label').map((v) => String(v).trim().slice(0, 40));
    const values = f.getAll('spec_value').map((v) => String(v).trim().slice(0, 120));
    const specs = labels.map((label, i) => ({ label, value: values[i] ?? '' })).filter((s) => s.label).slice(0, 12);
    const comesWith = f.getAll('comes_with').map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v)).slice(0, 20);

    must(await sb.from('products').update({
      name: str(f, 'name', 80),
      tag: str(f, 'tag', 40),
      subtitle: str(f, 'subtitle', 120),
      description: str(f, 'description', 1000),
      price_minor: priceMinor,
      currency,
      delivery_note: str(f, 'delivery_note', 80),
      stock,
      stock_total: total,
      low_stock_threshold: int(f, 'low_stock_threshold', { min: 0, max: 100_000 }),
      stock_banner_text: str(f, 'stock_banner_text', 120),
      web_url: url(f, 'web_url', { required: true, label: 'Satın alma linki' }),
      utm_source: str(f, 'utm_source', 60) || null,
      specs,
      comes_with: comesWith,
      is_active: active,
    }).eq('id', id).select('id'));
    return 'Ürün kaydedildi.';
  }, ['/magaza', '/', '/ekranlar']);
}
