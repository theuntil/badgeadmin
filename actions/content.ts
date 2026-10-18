'use server';

import { act, must, EDIT } from '@/lib/act';
import { FormError, bool, int, str, strOrNull, uuid } from '@/lib/form';
import { readFile, removeIfUnused, slug, upload } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Animasyonlar
// ---------------------------------------------------------------------------
function animFields(f: FormData) {
  const name = str(f, 'name', 60);
  if (!name) throw new FormError('Animasyon adı gerekli.');
  const category = str(f, 'category', 20) === 'pack' ? 'pack' : 'individual';
  return {
    name, category,
    pack_name: category === 'pack' ? strOrNull(f, 'pack_name', 40) : null,
    sort_order: int(f, 'sort_order', { min: 0, max: 9999, fallback: 99 }),
    is_featured: bool(f, 'is_featured'),
    is_active: f.has('is_active') ? bool(f, 'is_active') : true,
  };
}

export async function createAnimation(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const fields = animFields(f);
    const s = slug(fields.name);
    if (!s) throw new FormError('Ad en az bir harf ya da rakam içermeli.');
    const anim = (await readFile(f, 'file', 'image'))!;
    const poster = await readFile(f, 'poster', 'image', false);

    const { data: exists } = await sb.from('animations').select('id').eq('slug', s).maybeSingle();
    if (exists) throw new FormError('Bu isimde bir animasyon zaten var.');

    const preview = await upload(sb, 'animations', `anim-${s}`, anim.file, anim.ext);
    const posterPath = poster ? await upload(sb, 'animations', `poster-${s}`, poster.file, poster.ext) : null;

    const { error } = await sb.from('animations').insert({ ...fields, slug: s, preview_path: preview, poster_path: posterPath, is_active: true });
    if (error) {
      await removeIfUnused(sb, preview);
      await removeIfUnused(sb, posterPath);
      throw new Error(error.message);
    }
    return `${fields.name} eklendi.`;
  }, ['/icerik', '/magaza']);
}

export async function updateAnimation(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const id = uuid(f, 'id');
    const fields = animFields(f);
    const { data: cur } = await sb.from('animations').select('slug, preview_path, poster_path').eq('id', id).maybeSingle();
    if (!cur) throw new FormError('Animasyon bulunamadı.');

    const anim = await readFile(f, 'file', 'image', false);
    const poster = await readFile(f, 'poster', 'image', false);
    const patch: Record<string, unknown> = { ...fields };
    if (anim) patch.preview_path = await upload(sb, 'animations', `anim-${cur.slug}`, anim.file, anim.ext);
    if (poster) patch.poster_path = await upload(sb, 'animations', `poster-${cur.slug}`, poster.file, poster.ext);

    must(await sb.from('animations').update(patch).eq('id', id).select('id'));
    if (anim) await removeIfUnused(sb, cur.preview_path);
    if (poster) await removeIfUnused(sb, cur.poster_path);
    return `${fields.name} kaydedildi.`;
  }, ['/icerik', '/magaza']);
}

export async function deleteAnimation(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const id = uuid(f, 'id');
    const { data: cur } = await sb.from('animations').select('name, preview_path, poster_path').eq('id', id).maybeSingle();
    if (!cur) throw new FormError('Animasyon zaten silinmiş.');

    // Ürünlerin "Comes with" listesinden çıkar
    const { data: prods } = await sb.from('products').select('id, comes_with').contains('comes_with', [id]);
    for (const p of prods ?? []) {
      must(await sb.from('products').update({ comes_with: (p.comes_with as string[]).filter((x) => x !== id) }).eq('id', p.id).select('id'));
    }

    // Satırı sil (bu animasyonu kullanan gönderi ve story'ler de silinir)
    must(await sb.from('animations').delete().eq('id', id).select('id'));

    // Dosyaları depolamadan sil
    await removeIfUnused(sb, cur.preview_path);
    await removeIfUnused(sb, cur.poster_path);
    return `${cur.name} ve dosyaları silindi.`;
  }, ['/icerik', '/magaza', '/']);
}

// ---------------------------------------------------------------------------
// Akış
// ---------------------------------------------------------------------------
function postFields(f: FormData) {
  const caption = str(f, 'caption', 300);
  if (!caption) throw new FormError('Gönderi metni boş olamaz.');
  const device = str(f, 'device_type', 20);
  return {
    author_id: uuid(f, 'author_id'),
    animation_id: uuid(f, 'animation_id'),
    device_type: device && /^[a-z0-9_]+$/.test(device) ? device : null,
    caption,
    like_count: int(f, 'like_count', { min: 0, max: 10_000_000 }),
    comment_count: int(f, 'comment_count', { min: 0, max: 10_000_000 }),
    age_minutes: int(f, 'age_minutes', { min: 0, max: 525_600 }),
    sort_order: int(f, 'sort_order', { min: -9999, max: 9999 }),
    show_in_feed: f.has('show_in_feed') ? bool(f, 'show_in_feed') : true,
    is_published: f.has('is_published') ? bool(f, 'is_published') : true,
  };
}

export async function createPost(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const { error } = await sb.from('posts').insert(postFields(f));
    if (error) throw new Error(error.message);
    return 'Gönderi akışa eklendi.';
  }, ['/icerik']);
}

export async function savePost(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    must(await sb.from('posts').update(postFields(f)).eq('id', uuid(f, 'id')).select('id'));
    return 'Gönderi kaydedildi.';
  }, ['/icerik']);
}

export async function deletePost(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    must(await sb.from('posts').delete().eq('id', uuid(f, 'id')).select('id'));
    return 'Gönderi silindi.';
  }, ['/icerik']);
}

// ---------------------------------------------------------------------------
// Metinler
// ---------------------------------------------------------------------------
export async function saveTexts(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    const keys = f.getAll('key').map(String);
    const values = f.getAll('value').map((v) => String(v).trim().slice(0, 1000));
    const origs = f.getAll('orig').map(String);
    let n = 0;
    for (let i = 0; i < keys.length; i++) {
      if (!/^[a-z0-9_.]{1,80}$/.test(keys[i]) || values[i] === origs[i]) continue;
      must(await sb.from('app_content').update({ value: values[i] }).eq('key', keys[i]).eq('kind', 'text').select('key'));
      n++;
    }
    return n ? `${n} metin kaydedildi.` : 'Değişiklik yok.';
  }, ['/icerik']);
}
