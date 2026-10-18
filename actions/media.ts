'use server';

import { act, must, EDIT, MANAGE } from '@/lib/act';
import { FormError, str } from '@/lib/form';
import { readFile, removeIfUnused, upload, type Bucket } from '@/lib/storage';

/**
 * Hedefler:
 *   content  → app_content.value (key: onboarding.video_path, brand.logo_path …)
 *   device   → device_types.image_path
 *   product  → products.images[index]  (index = 'new' → sona ekle)
 */
type Target =
  | { kind: 'content'; key: string; bucket: Bucket; media: 'image' | 'video' }
  | { kind: 'device'; id: string }
  | { kind: 'product'; id: string; index: number | 'new' }
  | { kind: 'screen'; id: string };

const CONTENT_MEDIA: Record<string, { bucket: Bucket; media: 'image' | 'video' }> = {
  'onboarding.video_path': { bucket: 'onboarding', media: 'video' },
  'brand.logo_path': { bucket: 'brand', media: 'image' },
  'brand.icon_path': { bucket: 'brand', media: 'image' },
};

function target(f: FormData): Target {
  const kind = str(f, 'kind', 20);
  if (kind === 'content') {
    const key = str(f, 'key', 80);
    const m = CONTENT_MEDIA[key];
    if (!m) throw new FormError('Bilinmeyen medya alanı.');
    return { kind, key, ...m };
  }
  if (kind === 'device') {
    const id = str(f, 'id', 40);
    if (!/^[a-z0-9_]+$/.test(id)) throw new FormError('Geçersiz cihaz.');
    return { kind, id };
  }
  if (kind === 'product') {
    const id = str(f, 'id', 60);
    const raw = str(f, 'index', 6);
    const index = raw === 'new' ? 'new' : parseInt(raw, 10);
    if (!/^[a-z0-9-]+$/.test(id) || (index !== 'new' && !(index >= 0 && index < 20))) throw new FormError('Geçersiz ürün görseli.');
    return { kind, id, index };
  }
  if (kind === 'screen') {
    const id = str(f, 'id', 20);
    if (!['maintenance', 'force_update', 'shop', 'waitlist'].includes(id)) throw new FormError('Geçersiz ekran.');
    return { kind, id };
  }
  throw new FormError('Geçersiz medya hedefi.');
}

export async function replaceMedia(f: FormData) {
  let t: Target;
  try { t = target(f); } catch (e) { return { error: (e as Error).message }; }
  return act(t.kind === 'content' && t.key.startsWith('brand.') ? MANAGE : EDIT, async ({ sb }) => {
    if (t.kind === 'content') {
      const file = (await readFile(f, 'file', t.media))!;
      const { data: row } = await sb.from('app_content').select('value').eq('key', t.key).maybeSingle();
      const path = await upload(sb, t.bucket, t.key.split('.')[0], file.file, file.ext);
      must(await sb.from('app_content').update({ value: path }).eq('key', t.key).select('key'));
      await removeIfUnused(sb, row?.value);
      return 'Dosya yüklendi. Uygulama bir sonraki açılışta yenisini gösterir.';
    }
    if (t.kind === 'screen') {
      const file = (await readFile(f, 'file', 'any'))!;
      const { data: row } = await sb.from('screens').select('media_path').eq('id', t.id).maybeSingle();
      const path = await upload(sb, 'screens', t.id, file.file, file.ext);
      must(await sb.from('screens').update({ media_path: path, media_kind: file.kind }).eq('id', t.id).select('id'));
      await removeIfUnused(sb, row?.media_path);
      return file.kind === 'video' ? 'Video yüklendi.' : 'Görsel yüklendi.';
    }
    if (t.kind === 'device') {
      const file = (await readFile(f, 'file', 'image'))!;
      const { data: row } = await sb.from('device_types').select('image_path').eq('id', t.id).maybeSingle();
      const path = await upload(sb, 'devices', `device-${t.id}`, file.file, file.ext);
      must(await sb.from('device_types').update({ image_path: path }).eq('id', t.id).select('id'));
      await removeIfUnused(sb, row?.image_path);
      return 'Cihaz görseli güncellendi.';
    }
    const file = (await readFile(f, 'file', 'image'))!;
    const { data: row } = await sb.from('products').select('images').eq('id', t.id).maybeSingle();
    if (!row) throw new FormError('Ürün bulunamadı.');
    const images: string[] = [...(row.images ?? [])];
    if (t.index === 'new' && images.length >= 8) throw new FormError('Bir üründe en fazla 8 görsel olabilir.');
    const path = await upload(sb, 'products', t.id, file.file, file.ext);
    const old = t.index === 'new' ? null : images[t.index];
    if (t.index === 'new') images.push(path); else images[t.index] = path;
    must(await sb.from('products').update({ images }).eq('id', t.id).select('id'));
    await removeIfUnused(sb, old);
    return t.index === 'new' ? 'Görsel eklendi.' : 'Görsel değiştirildi.';
  }, ['/medya', '/magaza', '/ekranlar']);
}

export async function removeMedia(f: FormData) {
  let t: Target;
  try { t = target(f); } catch (e) { return { error: (e as Error).message }; }
  return act(t.kind === 'content' && t.key.startsWith('brand.') ? MANAGE : EDIT, async ({ sb }) => {
    if (t.kind === 'content') {
      const { data: row } = await sb.from('app_content').select('value').eq('key', t.key).maybeSingle();
      must(await sb.from('app_content').update({ value: '' }).eq('key', t.key).select('key'));
      await removeIfUnused(sb, row?.value);
      return 'Dosya kaldırıldı ve depolamadan silindi.';
    }
    if (t.kind === 'screen') {
      const { data: row } = await sb.from('screens').select('media_path').eq('id', t.id).maybeSingle();
      must(await sb.from('screens').update({ media_path: null, media_kind: null }).eq('id', t.id).select('id'));
      await removeIfUnused(sb, row?.media_path);
      return 'Medya kaldırıldı ve depolamadan silindi.';
    }
    if (t.kind === 'device') {
      const { data: row } = await sb.from('device_types').select('image_path').eq('id', t.id).maybeSingle();
      must(await sb.from('device_types').update({ image_path: null }).eq('id', t.id).select('id'));
      await removeIfUnused(sb, row?.image_path);
      return 'Cihaz görseli kaldırıldı.';
    }
    if (t.index === 'new') throw new FormError('Geçersiz görsel.');
    const { data: row } = await sb.from('products').select('images').eq('id', t.id).maybeSingle();
    const images: string[] = [...(row?.images ?? [])];
    const old = images[t.index];
    if (!old) throw new FormError('Görsel bulunamadı.');
    images.splice(t.index, 1);
    must(await sb.from('products').update({ images }).eq('id', t.id).select('id'));
    await removeIfUnused(sb, old);
    return 'Görsel kaldırıldı ve depolamadan silindi.';
  }, ['/medya', '/magaza', '/ekranlar']);
}
