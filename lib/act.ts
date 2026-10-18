import 'server-only';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { requireAdmin, supabaseServer, type Admin, type Role } from './supabase';
import { FormError } from './form';

export type Result = { ok?: string; error?: string };
type SB = Awaited<ReturnType<typeof supabaseServer>>;

const DB_ERRORS: [RegExp, string][] = [
  [/user not found/i, 'Bu e-postayla Supabase’te bir kullanıcı yok. Önce Studio → Authentication → Add user ile oluştur.'],
  [/last owner/i, 'En az bir sahip kalmalı. Önce başka birini sahip yap.'],
  [/cannot remove self/i, 'Kendini yöneticilerden çıkaramazsın.'],
  [/invalid role/i, 'Geçersiz rol.'],
  [/row-level security|permission denied/i, 'Bu işlem için yetkin yok.'],
  [/duplicate key/i, 'Bu kayıt zaten var.'],
  [/violates check constraint/i, 'Girilen değerlerden biri geçerli değil.'],
  [/violates foreign key/i, 'Bağlı kayıt bulunamadı.'],
  [/fetch failed|ECONNREFUSED|ENOTFOUND/i, 'Supabase\'e ulaşılamıyor.'],
];

export function dbError(message: string) {
  for (const [re, text] of DB_ERRORS) if (re.test(message)) return text;
  return 'Kaydedilemedi. Değerleri kontrol edip tekrar dene.';
}

/**
 * Her server action bu sarmalayıcıdan geçer:
 * oturum + rol kontrolü → işlem → hata çevirisi → sayfa tazeleme.
 */
export async function act(
  roles: Role[],
  fn: (ctx: { sb: SB; admin: Admin }) => Promise<string>,
  revalidate: string[] = ['/'],
): Promise<Result> {
  try {
    const admin = await requireAdmin(roles);
    const sb = await supabaseServer();
    const ok = await fn({ sb, admin });
    revalidate.forEach((p) => revalidatePath(p, 'layout'));
    return { ok };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof FormError) return { error: e.message };
    const message = (e as Error)?.message ?? '';
    console.error('[action]', message);
    return { error: dbError(message) };
  }
}

/** update/delete sonucu 0 satırsa (RLS engelledi) hata fırlatır. */
export function must<T>(res: { data: T[] | null; error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
  if (!res.data?.length) throw new Error('permission denied');
  return res.data;
}

export const MANAGE: Role[] = ['owner', 'admin'];
export const EDIT: Role[] = ['owner', 'admin', 'editor'];
