import 'server-only';
import { FormError } from './form';
import type { supabaseServer } from './supabase';

type SB = Awaited<ReturnType<typeof supabaseServer>>;

export const BUCKETS = ['animations', 'devices', 'products', 'onboarding', 'brand', 'screens'] as const;
export type Bucket = (typeof BUCKETS)[number];

const IMAGE: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const VIDEO: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov' };

export const LIMITS = {
  image: { types: IMAGE, max: 10 * 1024 * 1024, label: '10 MB', names: 'PNG, JPG, WebP veya GIF' },
  video: { types: VIDEO, max: 20 * 1024 * 1024, label: '20 MB', names: 'MP4 veya MOV' },
};

/** Dosyanın gerçek türünü ilk baytlarından bulur (uzantıya/tarayıcının söylediğine güvenmez). */
function sniff(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp') return ascii(8, 10) === 'qt' ? 'video/quicktime' : 'video/mp4';
  return null;
}

export async function readFile(f: FormData, key: string, kind: 'image' | 'video' | 'any', required = true) {
  const v = f.get(key);
  if (!(v instanceof File) || v.size === 0) {
    if (required) throw new FormError('Dosya seçilmedi.');
    return null;
  }
  const type = sniff(new Uint8Array(await v.slice(0, 16).arrayBuffer()));
  const actual: 'image' | 'video' | null = type ? (type.startsWith('video/') ? 'video' : 'image') : null;
  const want = kind === 'any' ? actual ?? 'image' : kind;
  const rule = LIMITS[want];
  const ext = type && actual === want ? rule.types[type] : undefined;
  if (!type || !ext) {
    throw new FormError(kind === 'any'
      ? 'Bu dosya geçerli bir görsel ya da video değil. PNG, JPG, WebP, GIF, MP4 veya MOV yükle.'
      : `Bu dosya geçerli bir ${kind === 'video' ? 'video' : 'görsel'} değil. ${rule.names} yükle.`);
  }
  if (v.size > rule.max) throw new FormError(`${want === 'video' ? 'Video' : 'Görsel'} en fazla ${rule.label} olabilir.`);
  return { file: new File([v], `upload.${ext}`, { type }), ext, kind: want };
}

export function splitPath(path: string | null | undefined): { bucket: Bucket; name: string } | null {
  if (!path) return null;
  const i = path.indexOf('/');
  if (i < 1) return null;
  const bucket = path.slice(0, i) as Bucket;
  if (!BUCKETS.includes(bucket)) return null;
  return { bucket, name: path.slice(i + 1) };
}

export function slug(s: string) {
  return s.toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

/** Benzersiz isimle yükler (önbellek sorunu olmasın), "bucket/dosya" döndürür. */
export async function upload(sb: SB, bucket: Bucket, base: string, file: File, ext: string) {
  const name = `${slug(base) || 'file'}-${Date.now().toString(36)}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(name, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(`storage: ${error.message}`);
  return `${bucket}/${name}`;
}

/** Dosyayı başka bir kayıt kullanmıyorsa depolamadan siler. */
export async function removeIfUnused(sb: SB, path: string | null | undefined) {
  const p = splitPath(path);
  if (!p || !path) return false;
  const checks = await Promise.all([
    sb.from('app_content').select('key', { count: 'exact', head: true }).eq('value', path),
    sb.from('device_types').select('id', { count: 'exact', head: true }).eq('image_path', path),
    sb.from('products').select('id', { count: 'exact', head: true }).contains('images', [path]),
    sb.from('animations').select('id', { count: 'exact', head: true }).or(`preview_path.eq."${path}",poster_path.eq."${path}"`),
    sb.from('screens').select('id', { count: 'exact', head: true }).eq('media_path', path),
  ]);
  if (checks.some((c) => (c.count ?? 0) > 0)) return false;
  const { error } = await sb.storage.from(p.bucket).remove([p.name]);
  if (error) console.error('[storage.remove]', path, error.message);
  return !error;
}
